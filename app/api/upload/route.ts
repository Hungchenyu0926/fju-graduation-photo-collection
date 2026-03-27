import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { message: "照片上傳已改為 Google OAuth 直傳模式，請從前端直接操作。" },
    { status: 410 },
  );
}