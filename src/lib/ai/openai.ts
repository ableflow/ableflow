import "server-only";
import { AiError, type AiCompletionParams, type AiProvider } from "./provider";

/**
 * OpenAI 제공사 (추후 확장용 스텁).
 * @openai/openai SDK 의존성을 아직 추가하지 않았으므로, fetch 기반 최소 구현만 제공한다.
 * 정식 지원 전까지 설정에서 anthropic 을 사용하도록 안내한다.
 */
export function createOpenAiProvider(apiKey: string, model: string): AiProvider {
  if (!apiKey) throw new AiError("OpenAI API 키가 설정되지 않았습니다. 설정 화면에서 입력하세요.");

  return {
    name: "openai",
    model,
    async complete({ system, user, maxTokens = 2048, temperature = 0.2 }: AiCompletionParams) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature,
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        return (data.choices?.[0]?.message?.content ?? "").trim();
      } catch (err) {
        throw new AiError(
          `OpenAI API 호출 실패: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };
}
