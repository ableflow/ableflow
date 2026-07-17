import "server-only";
import { z } from "zod";
import { getSettings, type AppSettings } from "@/lib/settings";
import { createAnthropicProvider } from "./anthropic";
import { createOpenAiProvider } from "./openai";
import { createGeminiProvider } from "./gemini";
import { AiError, extractJson, type AiProvider } from "./provider";
import {
  IssueAnalysisSchema,
  ComparisonSchema,
  ReportSchema,
  type IssueAnalysis,
  type Comparison,
  type Report,
} from "./schemas";
import { issueAnalysisPrompt, comparisonPrompt, reportPrompt } from "./prompts";
import type { NormalizedLegalSource } from "@/lib/law-api/types";

/** 설정 기준 기본 제공사 (openai | anthropic) */
function defaultProvider(s: AppSettings): AiProvider {
  if (s.aiProvider === "openai") {
    return createOpenAiProvider(s.openaiApiKey, s.aiModel || "gpt-4o-mini");
  }
  return createAnthropicProvider(s.anthropicApiKey, s.aiModel || "claude-3-5-sonnet-latest");
}

/**
 * 대량 호출용 제공사 (쟁점 추출·자료 비교).
 * 절충안: Gemini 키가 있으면 Gemini Flash(빠르고 저렴), 없으면 기본 제공사로 폴백.
 */
function bulkProvider(s: AppSettings): AiProvider {
  if (s.geminiApiKey) {
    return createGeminiProvider(s.geminiApiKey, s.geminiModel || "gemini-2.5-flash");
  }
  return defaultProvider(s);
}

/**
 * 최종 종합검토용 제공사.
 * 절충안: Claude 키가 있으면 Claude(법리 뉘앙스·안정성), 없으면 대량용 제공사로 폴백.
 */
function finalProvider(s: AppSettings): AiProvider {
  if (s.anthropicApiKey) {
    return createAnthropicProvider(s.anthropicApiKey, s.aiModel || "claude-3-5-sonnet-latest");
  }
  return bulkProvider(s);
}

/** 하위호환: 기존 호출부용 기본 제공사 */
export async function getProvider(): Promise<AiProvider> {
  return defaultProvider(await getSettings());
}

/**
 * JSON 응답을 받아 Zod 로 검증. 파싱/검증 실패 시 1회 재시도, 그래도 실패하면 AiError.
 */
async function runJson<S extends z.ZodTypeAny>(
  provider: AiProvider,
  prompt: { system: string; user: string },
  schema: S,
  maxTokens = 2048,
): Promise<z.infer<S>> {
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await provider.complete({
      system: prompt.system,
      user:
        attempt === 0
          ? prompt.user
          : `${prompt.user}\n\n(이전 응답이 유효한 JSON이 아니었습니다. 오직 JSON 객체만 출력하세요.)`,
      maxTokens,
    });
    try {
      const json = JSON.parse(extractJson(raw));
      return schema.parse(json);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new AiError(`AI 응답을 JSON으로 해석하지 못했습니다: ${lastErr}`);
}

export async function analyzeIssues(input: {
  title: string;
  facts: string;
  question: string;
  field?: string;
}): Promise<IssueAnalysis> {
  const provider = bulkProvider(await getSettings());
  return runJson(provider, issueAnalysisPrompt(input), IssueAnalysisSchema, 2048);
}

export async function compareSource(input: {
  question: string;
  facts: string;
  source: NormalizedLegalSource;
}): Promise<Comparison> {
  const provider = bulkProvider(await getSettings());
  return runJson(provider, comparisonPrompt(input), ComparisonSchema, 1500);
}

export async function buildReport(input: {
  question: string;
  facts: string;
  issues: string[];
  sources: { title: string; sourceType: string; summary?: string }[];
}): Promise<Report> {
  const provider = finalProvider(await getSettings());
  return runJson(provider, reportPrompt(input), ReportSchema, 2500);
}

export { AiError };
