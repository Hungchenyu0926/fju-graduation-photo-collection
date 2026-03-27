import { google } from "googleapis";

type EnvKey =
  | "GOOGLE_DRIVE_FOLDER_ID"
  | "GOOGLE_SHEETS_SPREADSHEET_ID"
  | "GOOGLE_SHEETS_SHEET_NAME"
  | "GOOGLE_SERVICE_ACCOUNT_EMAIL"
  | "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY";

const requiredEnvKeys: EnvKey[] = [
  "GOOGLE_DRIVE_FOLDER_ID",
  "GOOGLE_SHEETS_SPREADSHEET_ID",
  "GOOGLE_SHEETS_SHEET_NAME",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
];

function readEnv(key: EnvKey) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function hasGoogleIntegrationConfig() {
  return requiredEnvKeys.every((key) => Boolean(process.env[key]));
}

export const appConfig = {
  title:
    process.env.NEXT_PUBLIC_SITE_TITLE ??
    "輔大跨專業長期照護碩士學位學程13屆畢業典禮照片募集",
  get driveFolderId() {
    return readEnv("GOOGLE_DRIVE_FOLDER_ID");
  },
  get spreadsheetId() {
    return readEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  },
  get sheetName() {
    return readEnv("GOOGLE_SHEETS_SHEET_NAME");
  },
  get serviceAccountEmail() {
    return readEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  },
  get serviceAccountPrivateKey() {
    return readEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  },
  maxUploadFiles: Number(process.env.MAX_UPLOAD_FILES ?? 10),
  maxUploadFileSizeMb: Number(process.env.MAX_UPLOAD_FILE_SIZE_MB ?? 20),
};

function createAuth() {
  return new google.auth.JWT({
    email: appConfig.serviceAccountEmail,
    key: appConfig.serviceAccountPrivateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: createAuth() });
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: createAuth() });
}