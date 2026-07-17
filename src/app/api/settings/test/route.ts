import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getAdapter } from "@/lib/law-api/registry";
import { getProvider } from "@/lib/ai";

export const runtime = "nodejs";

/** API 연결 테스트: 국가법령정보(OC) + AI 제공사 키 */
export async function POST() {
  const result: {
    lawApi: { ok: boolean; message: string };
    ai: { ok: boolean; message: string };
  } = {
    lawApi: { ok: false, message: "" },
    ai: { ok: false, message: "" },
  };

  const s = await getSettings();

  // 1) 국가법령정보 API 테스트 (판례 목록 1건)
  try {
    if (!s.lawApiOc) throw new Error("OC 인증값이 비어 있습니다.");
    const adapter = getAdapter("prec");
    const list = await adapter!.search({ query: "손해배상", display: 1 }, s.lawApiOc);
    result.lawApi = { ok: true, message: `정상 (샘플 ${list.length}건 응답)` };
  } catch (e) {
    result.lawApi = {
      ok: false,
      message: e instanceof Error ? e.message : "법령 API 연결 실패",
    };
  }

  // 2) AI 제공사 테스트 (짧은 프롬프트)
  try {
    const provider = await getProvider();
    const out = await provider.complete({
      system: "You reply with a single word.",
      user: 'Reply exactly with the word: OK',
      maxTokens: 10,
    });
    result.ai = { ok: Boolean(out), message: `정상 (${provider.name}/${provider.model})` };
  } catch (e) {
    result.ai = { ok: false, message: e instanceof Error ? e.message : "AI 연결 실패" };
  }

  return NextResponse.json(result);
}
