import { NextResponse } from "next/server";
import { uploadImageFiles } from "@/lib/google";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
