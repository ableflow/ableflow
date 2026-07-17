import { NextResponse } from "next/server";
import { anonymize } from "@/lib/privacy/anonymize";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
    const result = anonymize(text ?? "");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "익명화 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
