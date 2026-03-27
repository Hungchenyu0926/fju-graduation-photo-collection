"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./celebration-board.module.css";

type CommentRecord = {
  name: string;
  message: string;
};

type Props = {
  initialComments: CommentRecord[];
  setupPending: boolean;
};

type ApiPayload = {
  message?: string;
  comment?: CommentRecord;
  uploadedFiles?: Array<{ id: string; name: string; webViewLink?: string | null }>;
};

const title = "輔大跨專業長期照護碩士學位學程13屆畢業典禮照片募集";
const uploadRequestLimitBytes = 4 * 1024 * 1024;
const maxImageDimension = 2400;

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
    if (text.includes("Request Entity Too Large")) {
      return { message: "照片檔案過大，請改用較小的照片，或讓系統先壓縮後再上傳。" };
    }

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

export default function CelebrationBoard({ initialComments, setupPending }: Props) {
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

  const fileSummary = useMemo(() => {
    if (!selectedFiles.length) {
      return "尚未選擇照片";
    }

    return `${selectedFiles.length} 張照片待上傳`;
  }, [selectedFiles]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadStatus("");

    try {
      let uploadedCount = 0;

      for (const originalFile of selectedFiles) {
        const preparedFile = await compressImageIfNeeded(originalFile);
        const formData = new FormData();
        formData.set("uploaderName", uploaderName);
        formData.append("files", preparedFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await parseApiPayload(response);
        if (!response.ok) {
          throw new Error(data.message || `照片 ${originalFile.name} 上傳失敗`);
        }

        uploadedCount += data.uploadedFiles?.length ?? 0;
      }

      setUploadStatus(`成功上傳 ${uploadedCount} 張照片到雲端資料夾。`);
      setSelectedFiles([]);
      setUploaderName("");
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "上傳失敗");
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

      setComments((current) => [data.comment!, ...current].slice(0, 50));
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

      {setupPending ? (
        <section className={styles.notice}>
          <strong>雲端串接設定尚未完成</strong>
          <p>
            網站已可部署上線，但目前還需要在伺服器環境變數中填入 Google Service Account 資訊，之後照片上傳與留言寫入功能就會正式開放。
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
            支援一次上傳多張照片，系統會逐張送出；若照片太大，會先嘗試壓縮到適合網頁上傳的大小。
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
              <span>若單張太大，系統會先壓縮；仍超過 4MB 時請手動縮小後再上傳</span>
            </div>

            <button type="submit" className={styles.button} disabled={setupPending || uploading || !selectedFiles.length}>
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
                disabled={anonymous || setupPending}
              />
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
                disabled={setupPending}
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
                disabled={setupPending}
              />
            </label>

            <button type="submit" className={styles.button} disabled={setupPending || submitting || !message.trim()}>
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