"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./celebration-board.module.css";

type CommentRecord = {
  name: string;
  message: string;
};

type Props = {
  initialComments: CommentRecord[];
};

const title = "輔大跨專業長期照護碩士學位學程13屆畢業典禮照片募集";

export default function CelebrationBoard({ initialComments }: Props) {
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
      const formData = new FormData();
      formData.set("uploaderName", uploaderName);
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "上傳失敗");
      }

      setUploadStatus(`成功上傳 ${data.uploadedFiles.length} 張照片到雲端資料夾。`);
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "送出留言失敗");
      }

      setComments((current) => [data.comment, ...current].slice(0, 50));
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

      <section className={styles.grid}>
        <article id="upload" className={styles.card}>
          <div className={styles.sectionHeading}>
            <span>01</span>
            <h2>照片上傳區</h2>
          </div>
          <p className={styles.sectionText}>
            支援一次上傳多張照片。若你想讓檔名更容易辨識，可以填寫上傳者姓名；不填也可以。
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
              <span>建議使用 JPG、PNG、HEIC 轉檔後再上傳</span>
            </div>

            <button type="submit" className={styles.button} disabled={uploading || !selectedFiles.length}>
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
                disabled={anonymous}
              />
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
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
              />
            </label>

            <button type="submit" className={styles.button} disabled={submitting || !message.trim()}>
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
