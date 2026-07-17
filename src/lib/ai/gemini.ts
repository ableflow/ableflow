import "server-only";
import { AiError, type AiCompletionParams, type AiProvider } from "./provider";

/**
 * Google Gemini 제공사 — 네이티브 REST(generateContent) 기반 최소 구현.
 * 대량 호출(쟁점 추출·자료 비교)에 사용. 속도·비용 이점.
 * responseMimeType=application/json 으로 JSON 출력 신뢰도를 높인다.
 */
export function createGeminiProvider(apiKey: string, model: string): AiProvider {
  if (!apiKey)
    throw new AiError("Gemini API 키가 설정되지 않았습니다. 설정 화면 또는 환경변수에서 입력하세요.");

  return {
    name: "gemini",
    model,
    async complete({ system, user, maxTokens = 2048, temperature = 0.2 }: AiCompletionParams) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model,
        )}:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: "application/json",
            },
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}${detail ? ` ${detail.slice(0, 200)}` : ""}`);
        }
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        return parts
          .map((p) => p.text ?? "")
          .join("\n")
          .trim();
      } catch (err) {
        throw new AiError(
          `Gemini API 호출 실패: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };
}
