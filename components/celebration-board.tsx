"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import styles from "./celebration-board.module.css";

type CommentRecord = {
  name: string;
  message: string;
};

type Props = {
  initialComments: CommentRecord[];
  commentsReady: boolean;
  driveOauthReady: boolean;
  driveFolderId: string;
  maxUploadFiles: number;
  maxUploadFileSizeMb: number;
};

type ApiPayload = {
  message?: string;
  comment?: CommentRecord;
};

type UploadResult = {
  id: string;
  name: string;
  webViewLink?: string | null;
};

type GoogleTokenResponse = {
  access_token: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  callback?: (response: GoogleTokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

const title = "輔大跨專業長期照護碩士學位學程13屆畢業典禮照片募集";
const uploadRequestLimitBytes = 4 * 1024 * 1024;
const maxImageDimension = 2400;
const googleDriveScope = "https://www.googleapis.com/auth/drive.file";

function replaceExtension(fileName: string, nextExtension: string) {
  return fileName.replace(/\.[^.]+$/, "") + nextExtension;
}

async function parseApiPayload(response: Response): Promise<ApiPayload> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as ApiPayload;
  } catch {
    return { message: text };
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error(`無法讀取圖片 ${file.name}`));
    };

    image.src = imageUrl;
  });
}

async function compressImageIfNeeded(file: File) {
  if (file.size <= uploadRequestLimitBytes) {
    return file;
  }

  if (!file.type.startsWith("image/")) {
    return file;
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("瀏覽器無法建立圖片壓縮畫布");
  }

  const scale = Math.min(1, maxImageDimension / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const qualities = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32];

  for (const quality of qualities) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", quality);
    });

    if (blob && blob.size <= uploadRequestLimitBytes) {
      return new File([blob], replaceExtension(file.name, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }
  }

  throw new Error(`照片 ${file.name} 壓縮後仍超過 4MB，請先手動縮小後再上傳。`);
}

async function uploadFileToDrive(file: File, folderId: string, accessToken: string) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const boundary = `boundary-${crypto.randomUUID()}`;
  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const fileHeaderPart = `--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;
  const closingPart = `\r\n--${boundary}--`;

  const requestBody = new Blob([
    metadataPart,
    fileHeaderPart,
    file,
    closingPart,
  ]);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: requestBody,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `照片 ${file.name} 上傳失敗`);
  }

  return JSON.parse(text) as UploadResult;
}

export default function CelebrationBoard({
  initialComments,
  commentsReady,
  driveOauthReady,
  driveFolderId,
  maxUploadFiles,
  maxUploadFileSizeMb,
}: Props) {
  const [comments, setComments] = useState(initialComments);
  const [commentName, setCommentName] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [uploaderName, setUploaderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [commentStatus, setCommentStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);
  const accessTokenRef = useRef<string>("");

  const fileSummary = useMemo(() => {
    if (!selectedFiles.length) {
      return "尚未選擇照片";
    }

    return `${selectedFiles.length} 張照片待上傳`;
  }, [selectedFiles]);

  async function requestGoogleAccessToken() {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      throw new Error("網站尚未設定 Google OAuth Client ID");
    }

    if (!window.google?.accounts.oauth2) {
      throw new Error("Google OAuth 元件尚未載入，請稍候再試");
    }

    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: googleDriveScope,
        callback: () => undefined,
      });
    }

    return await new Promise<string>((resolve, reject) => {
      if (!tokenClientRef.current) {
        reject(new Error("Google OAuth 初始化失敗"));
        return;
      }

      tokenClientRef.current.callback = (response: GoogleTokenResponse) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Google 授權失敗"));
          return;
        }

        accessTokenRef.current = response.access_token;
        resolve(response.access_token);
      };

      tokenClientRef.current.requestAccessToken({
        prompt: accessTokenRef.current ? "" : "consent",
      });
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadStatus("");

    try {
      if (selectedFiles.length > maxUploadFiles) {
        throw new Error(`一次最多可上傳 ${maxUploadFiles} 張照片`);
      }

      const accessToken = await requestGoogleAccessToken();
      let uploadedCount = 0;

      for (const originalFile of selectedFiles) {
        if (!originalFile.type.startsWith("image/")) {
          throw new Error(`檔案 ${originalFile.name} 不是圖片格式`);
        }

        if (originalFile.size > maxUploadFileSizeMb * 1024 * 1024) {
          throw new Error(`照片 ${originalFile.name} 超過 ${maxUploadFileSizeMb}MB 限制，請先手動縮小後再上傳。`);
        }

        const preparedFile = await compressImageIfNeeded(originalFile);
        await uploadFileToDrive(preparedFile, driveFolderId, accessToken);
        uploadedCount += 1;
      }

      setUploadStatus(`成功上傳 ${uploadedCount} 張照片到 Google Drive。`);
      setSelectedFiles([]);
      setUploaderName("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上傳失敗";
      setUploadStatus(message.replaceAll("\n", " "));
    } finally {
      setUploading(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setCommentStatus("");

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: commentName,
          message,
          anonymous,
        }),
      });

      const data = await parseApiPayload(response);
      if (!response.ok || !data.comment) {
        throw new Error(data.message || "送出留言失敗");
      }

      const createdComment = data.comment;
      setComments((current) => [createdComment, ...current].slice(0, 50));
      setCommentName("");
      setMessage("");
      setAnonymous(false);
      setCommentStatus("留言已送出，謝謝你的祝福。");
    } catch (error) {
      setCommentStatus(error instanceof Error ? error.message : "送出留言失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>Graduate Memories Collection</div>
        <h1>{title}</h1>
        <p>
          誠摯邀請師長、同學、親友一起上傳畢業典禮照片，也歡迎在公開留言區留下祝福。
          所有照片會集中存放於指定的 Google Drive 資料夾，留言則會同步保存到 Google Sheet。
        </p>
        <div className={styles.heroLinks}>
          <a href="#upload">上傳照片</a>
          <a href="#messages">留下祝福</a>
        </div>
      </section>

      {!driveOauthReady ? (
        <section className={styles.notice}>
          <strong>照片上傳尚未完成 Google OAuth 設定</strong>
          <p>
            請在 Vercel 補上 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`，並確認這個網站網域已加入 Google OAuth 的 Authorized JavaScript origins。
          </p>
        </section>
      ) : null}

      {!commentsReady ? (
        <section className={styles.notice}>
          <strong>留言功能尚未完成 Google Sheets 設定</strong>
          <p>
            目前網站可開啟，但公開留言區尚未連到 Google Sheets。補上 Service Account 設定後即可啟用。
          </p>
        </section>
      ) : null}

      <section className={styles.grid}>
        <article id="upload" className={styles.card}>
          <div className={styles.sectionHeading}>
            <span>01</span>
            <h2>照片上傳區</h2>
          </div>
          <p className={styles.sectionText}>
            這裡改為 Google OAuth 上傳。上傳時會跳出 Google 授權視窗，使用上傳者自己的 Google 帳號把照片存進指定資料夾。
          </p>

          <form className={styles.form} onSubmit={handleUpload}>
            <label className={styles.label}>
              上傳者姓名（選填）
              <input
                value={uploaderName}
                onChange={(event) => setUploaderName(event.target.value)}
                placeholder="例如：王小明"
                className={styles.input}
              />
            </label>

            <label className={styles.label}>
              選擇照片
              <input
                type="file"
                accept="image/*"
                multiple
                className={styles.input}
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              />
            </label>

            <div className={styles.helperRow}>
              <span>{fileSummary}</span>
              <span>單張超過 4MB 會先嘗試壓縮；上傳時需用 Google 帳號授權</span>
            </div>

            <button type="submit" className={styles.button} disabled={!driveOauthReady || uploading || !selectedFiles.length}>
              {uploading ? "上傳中..." : "送出照片"}
            </button>

            {uploadStatus ? <p className={styles.status}>{uploadStatus}</p> : null}
          </form>
        </article>

        <article id="messages" className={styles.card}>
          <div className={styles.sectionHeading}>
            <span>02</span>
            <h2>公開留言區</h2>
          </div>
          <p className={styles.sectionText}>
            留言會公開顯示在這個頁面上，時間戳會自動寫入 Google Sheet，但不顯示在網頁上。
          </p>

          <form className={styles.form} onSubmit={handleCommentSubmit}>
            <label className={styles.label}>
              姓名
              <input
                value={commentName}
                onChange={(event) => setCommentName(event.target.value)}
                placeholder="可留空，或勾選匿名"
                className={styles.input}
                disabled={anonymous || !commentsReady}
              />
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
                disabled={!commentsReady}
              />
              <span>以匿名方式發佈</span>
            </label>

            <label className={styles.label}>
              留言內容
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="寫下你想對 13 屆畢業生說的話"
                className={styles.textarea}
                rows={5}
                disabled={!commentsReady}
              />
            </label>

            <button type="submit" className={styles.button} disabled={!commentsReady || submitting || !message.trim()}>
              {submitting ? "送出中..." : "送出留言"}
            </button>

            {commentStatus ? <p className={styles.status}>{commentStatus}</p> : null}
          </form>
        </article>
      </section>

      <section className={styles.wall}>
        <div className={styles.wallHeading}>
          <p>祝福牆</p>
          <h2>最新留言</h2>
        </div>

        <div className={styles.commentGrid}>
          {comments.length ? (
            comments.map((comment, index) => (
              <article key={`${comment.name}-${index}-${comment.message}`} className={styles.commentCard}>
                <div className={styles.commentName}>{comment.name}</div>
                <p>{comment.message}</p>
              </article>
            ))
          ) : (
            <article className={styles.emptyState}>第一則祝福，等你來留下。</article>
          )}
        </div>
      </section>
    </main>
  );
}
