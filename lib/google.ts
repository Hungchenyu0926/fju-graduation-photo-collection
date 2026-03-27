import { Readable } from "node:stream";
import { appConfig, getDriveClient, getSheetsClient } from "@/lib/google-client";

export type CommentRecord = {
  name: string;
  message: string;
};

function toDisplayName(rawName: string | undefined) {
  const name = rawName?.trim();
  return name ? name : "匿名";
}

function getTaipeiTimestamp() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
}

export async function listComments(limit = 50): Promise<CommentRecord[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: appConfig.spreadsheetId,
    range: `'${appConfig.sheetName}'!A:C`,
  });

  const rows = response.data.values ?? [];
  const commentRows = rows.slice(1).filter((row) => row[1]);

  return commentRows
    .slice(-limit)
    .reverse()
    .map((row) => ({
      name: row[0] || "匿名",
      message: row[1] || "",
    }));
}

export async function appendComment(input: { name?: string; message: string; anonymous?: boolean }) {
  const sheets = getSheetsClient();
  const trimmedMessage = input.message.trim();

  if (!trimmedMessage) {
    throw new Error("留言內容不可空白");
  }

  const name = input.anonymous ? "匿名" : toDisplayName(input.name);

  await sheets.spreadsheets.values.append({
    spreadsheetId: appConfig.spreadsheetId,
    range: `'${appConfig.sheetName}'!A:C`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[name, trimmedMessage, getTaipeiTimestamp()]],
    },
  });

  return { name, message: trimmedMessage } satisfies CommentRecord;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function uploadImageFiles(input: { uploaderName?: string; files: File[] }) {
  if (!input.files.length) {
    throw new Error("請至少選擇一張照片");
  }

  if (input.files.length > appConfig.maxUploadFiles) {
    throw new Error(`一次最多可上傳 ${appConfig.maxUploadFiles} 張照片`);
  }

  const drive = getDriveClient();
  const uploader = toDisplayName(input.uploaderName);
  const uploaded = [] as Array<{ id: string; name: string; webViewLink?: string | null }>;

  for (const file of input.files) {
    const maxBytes = appConfig.maxUploadFileSizeMb * 1024 * 1024;

    if (!file.type.startsWith("image/")) {
      throw new Error(`檔案 ${file.name} 不是圖片格式`);
    }

    if (file.size > maxBytes) {
      throw new Error(`檔案 ${file.name} 超過 ${appConfig.maxUploadFileSizeMb}MB 限制`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timePrefix = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = sanitizeFileName(file.name) || "photo";
    const targetName = `${timePrefix}_${sanitizeFileName(uploader)}_${safeName}`;

    const created = await drive.files.create({
      requestBody: {
        name: targetName,
        parents: [appConfig.driveFolderId],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: "id,name,webViewLink",
      supportsAllDrives: true,
    });

    const createdId = created.data.id;
    if (createdId) {
      await drive.permissions.create({
        fileId: createdId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    }

    uploaded.push({
      id: created.data.id ?? "",
      name: created.data.name ?? targetName,
      webViewLink: created.data.webViewLink,
    });
  }

  return uploaded;
}
