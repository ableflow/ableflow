import { NextResponse } from "next/server";
import { getPublicSettings, saveSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const s = await getPublicSettings();
    return NextResponse.json(s);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "설정을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const patch: Record<string, string> = {};
    const allow = [
      "lawApiOc",
      "aiProvider",
      "anthropicApiKey",
      "openaiApiKey",
      "aiModel",
      "defaultDisplay",
      "defaultSources",
      "autoAnonymize",
    ];
    for (const k of allow) {
      if (body[k] === undefined) continue;
      // 빈 문자열 API 키는 덮어쓰지 않음(기존 값 유지)
      if ((k === "anthropicApiKey" || k === "openaiApiKey") && body[k] === "") continue;
      patch[k] =
        k === "defaultSources"
          ? JSON.stringify(body[k])
          : String(body[k]);
    }
    await saveSettings(patch as never);
    const s = await getPublicSettings();
    return NextResponse.json(s);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "설정 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
