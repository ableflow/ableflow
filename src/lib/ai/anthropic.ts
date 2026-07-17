import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AiError, type AiCompletionParams, type AiProvider } from "./provider";

export function createAnthropicProvider(apiKey: string, model: string): AiProvider {
  if (!apiKey) throw new AiError("Claude API 키가 설정되지 않았습니다. 설정 화면에서 입력하세요.");
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    model,
    async complete({ system, user, maxTokens = 2048, temperature = 0.2 }: AiCompletionParams) {
      try {
        const res = await client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system,
          messages: [{ role: "user", content: user }],
        });
        const parts = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text);
        return parts.join("\n").trim();
      } catch (err) {
        throw new AiError(
          `Claude API 호출 실패: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };
}
