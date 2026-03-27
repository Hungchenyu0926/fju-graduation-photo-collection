import { NextResponse } from "next/server";
import { appendComment, listComments } from "@/lib/google";

export async function GET() {
  try {
    const comments = await listComments();
    return NextResponse.json({ comments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "讀取留言失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
