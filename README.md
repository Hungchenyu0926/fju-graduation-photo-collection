# 輔大跨專業長期照護碩士學位學程13屆畢業典禮照片募集

這是一個部署在 Vercel 的 Next.js 網頁，提供兩個功能：

- 上傳畢業典禮照片到指定 Google Drive 資料夾
- 在公開留言區新增與顯示留言，留言同步寫入指定 Google Sheet

## 已綁定的目標

- Google Drive Folder ID: `1w5uUrn28aLLICEJ6HfMgwDczd0bN-ADx`
- Google Sheets Spreadsheet ID: `1eBrbHp4QIjpgS-IBEc3BdtHPTHSHOm-7LJ93gj_F_Xg`
- Google Sheets Sheet Name: `工作表1`

## 使用的欄位

Google Sheet 會寫入以下三欄：

- `姓名`
- `留言`
- `時間戳`

其中時間戳由後端在寫入當下自動生成，不會顯示在前端頁面。

## 本機啟動

1. 安裝依賴

```bash
npm install
```

2. 複製環境變數

```bash
copy .env.example .env.local
```

3. 填入 Google Service Account 資訊

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

4. 把你的 Service Account 加入以下權限

- Google Drive 資料夾：設為 `Editor`
- Google Sheet：設為 `Editor`

5. 啟動開發伺服器

```bash
npm run dev
```

## Vercel 部署

在 Vercel 專案環境變數中加入 `.env.example` 的所有欄位，然後重新部署。

## GitHub 版本控制

```bash
git init
git add .
git commit -m "Create graduation photo collection site"
```

如果你已經有 GitHub repository，再把遠端加上去後 push：

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```
