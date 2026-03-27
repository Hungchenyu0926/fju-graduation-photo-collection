import { NextResponse } from "next/server";
import { hasGoogleIntegrationConfig } from "@/lib/google-client";
import { uploadImageFiles } from "@/lib/google";

export const runtime = "nodejs";

const setupMessage = "網站管理者尚未完成 Google 雲端設定，請稍後再試。";

export async function POST(request: Request) {
  if (!hasGoogleIntegrationConfig()) {
    return NextResponse.json({ message: setupMessage }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const uploaderName = String(formData.get("uploaderName") ?? "");
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    const uploadedFiles = await uploadImageFiles({ uploaderName, files });

    return NextResponse.json({ uploadedFiles }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "上傳失敗" },
      { status: 400 },
    );
  }
}