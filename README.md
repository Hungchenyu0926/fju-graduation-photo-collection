# 輔大跨專業長期照護碩士學位學程13屆畢業典禮照片募集

這是一個部署在 Vercel 的 Next.js 網站，提供兩個功能：

- 使用 Google OAuth 把畢業典禮照片上傳到指定 Google Drive 資料夾
- 在公開留言區新增與顯示留言，留言同步寫入指定 Google Sheet

## 已綁定的目標

- Google Drive Folder ID: `1w5uUrn28aLLICEJ6HfMgwDczd0bN-ADx`
- Google Sheets Spreadsheet ID: `1eBrbHp4QIjpgS-IBEc3BdtHPTHSHOm-7LJ93gj_F_Xg`
- Google Sheets Sheet Name: `工作表1`

## Google OAuth 上傳

照片上傳已改為使用者授權的 Google OAuth 模式，而不是 Service Account。

你需要在 Google Cloud Console 建立 Web application OAuth Client，並把以下網址加入 Authorized JavaScript origins：

- `https://fju-graduation-photo-collection.vercel.app`
- 本機開發網址，例如 `http://localhost:3000`

然後把 Client ID 填入：

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## 留言欄位

Google Sheet 會寫入以下三欄：

- `姓名`
- `留言`
- `時間戳`

其中時間戳由後端在寫入當下自動生成，不會顯示在前端頁面。

## 上傳限制

網站部署在 Vercel，上傳請求會受到平台大小限制。為了提高成功率，前端會：

- 逐張照片分開上傳
- 若單張照片太大，先嘗試壓縮到約 4MB 以下

若壓縮後仍然過大，請先自行縮小照片後再上傳。

## 本機啟動

1. 安裝依賴

```bash
npm install
```

2. 複製環境變數

```bash
copy .env.example .env.local
```

3. 填入 Google OAuth 與 Google Sheets 設定

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

4. 啟動開發伺服器

```bash
npm run dev
```