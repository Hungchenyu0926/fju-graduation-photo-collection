import { appConfig, getSheetsClient } from "@/lib/google-client";

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