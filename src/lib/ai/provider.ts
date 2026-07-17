/** AI 제공사 추상화 인터페이스 */
export interface AiCompletionParams {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  name: "anthropic" | "openai" | "gemini";
  model: string;
  /** 텍스트 응답을 반환 (JSON 강제는 호출측에서 파싱/검증) */
  complete(params: AiCompletionParams): Promise<string>;
}

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

/** 응답 문자열에서 JSON 블록만 안전하게 추출 */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  // ```json ... ``` 코드펜스 제거
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // 첫 { 부터 마지막 } 까지
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}
