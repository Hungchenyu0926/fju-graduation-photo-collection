import { google } from "googleapis";

type CommentEnvKey =
  | "GOOGLE_SHEETS_SPREADSHEET_ID"
  | "GOOGLE_SHEETS_SHEET_NAME"
  | "GOOGLE_SERVICE_ACCOUNT_EMAIL"
  | "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY";

const requiredCommentEnvKeys: CommentEnvKey[] = [
  "GOOGLE_SHEETS_SPREADSHEET_ID",
  "GOOGLE_SHEETS_SHEET_NAME",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
];

function readCommentEnv(key: CommentEnvKey) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function hasCommentsIntegrationConfig() {
  return requiredCommentEnvKeys.every((key) => Boolean(process.env[key]));
}

export function hasGoogleDriveOauthConfig() {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID);
}

export const appConfig = {
  title:
    process.env.NEXT_PUBLIC_SITE_TITLE ??
    "輔大跨專業長期照護碩士學位學程13屆畢業典禮照片募集",
  get driveFolderId() {
    const value = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!value) {
      throw new Error("Missing required environment variable: GOOGLE_DRIVE_FOLDER_ID");
    }
    return value;
  },
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  get spreadsheetId() {
    return readCommentEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  },
  get sheetName() {
    return readCommentEnv("GOOGLE_SHEETS_SHEET_NAME");
  },
  get serviceAccountEmail() {
    return readCommentEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  },
  get serviceAccountPrivateKey() {
    return readCommentEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  },
  maxUploadFiles: Number(process.env.MAX_UPLOAD_FILES ?? 10),
  maxUploadFileSizeMb: Number(process.env.MAX_UPLOAD_FILE_SIZE_MB ?? 20),
};

function createSheetsAuth() {
  return new google.auth.JWT({
    email: appConfig.serviceAccountEmail,
    key: appConfig.serviceAccountPrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: createSheetsAuth() });
}