import { NextResponse } from "next/server";
import { hasCommentsIntegrationConfig } from "@/lib/google-client";
import { appendComment, listComments } from "@/lib/google";

const setupMessage = "網站管理者尚未完成 Google Sheets 留言設定，請稍後再試。";

export async function GET() {
  if (!hasCommentsIntegrationConfig()) {
    return NextResponse.json({ comments: [], message: setupMessage }, { status: 200 });
  }

  try {
    const comments = await listComments();
    return NextResponse.json({ comments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "讀取留言失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!hasCommentsIntegrationConfig()) {
    return NextResponse.json({ message: setupMessage }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      message?: string;
      anonymous?: boolean;
    };

    const comment = await appendComment({
      name: body.name,
      message: body.message ?? "",
      anonymous: body.anonymous,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "送出留言失敗" },
      { status: 400 },
    );
  }
}