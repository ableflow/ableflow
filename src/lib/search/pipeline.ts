import "server-only";
import { getSettings } from "@/lib/settings";
import { getAdapter, getEnabledAdapters } from "@/lib/law-api/registry";
import { LawApiError } from "@/lib/law-api/client";
import type { NormalizedLegalSource } from "@/lib/law-api/types";
import { analyzeIssues, compareSource, buildReport } from "@/lib/ai";
import type { IssueAnalysis, Comparison, Report } from "@/lib/ai/schemas";
import { scoreSource } from "./score";

export interface ScoredSource extends NormalizedLegalSource {
  relevanceScore: number;
  comparison?: Comparison;
}

export interface PipelineResult {
  issues: IssueAnalysis;
  sources: ScoredSource[];
  report: Report;
}

export interface PipelineInput {
  title: string;
  facts: string; // 검색·분석에 사용할 사실관계(익명화 반영된 값)
  question: string;
  field?: string;
  requestedSources: string[]; // 사용자가 선택한 자료 코드
  deepSearch: boolean;
  display?: number;
}

function dedupe(items: NormalizedLegalSource[]): NormalizedLegalSource[] {
  const seen = new Set<string>();
  const out: NormalizedLegalSource[] = [];
  for (const it of items) {
    const key = `${it.sourceType}:${it.sourceId || it.caseNumber || it.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export async function runResearchPipeline(input: PipelineInput): Promise<PipelineResult> {
  const settings = await getSettings();
  const oc = settings.lawApiOc;

  // 3. AI 쟁점 추출 (+ Zod 검증/재시도는 analyzeIssues 내부)
  const issues = await analyzeIssues({
    title: input.title,
    facts: input.facts,
    question: input.question,
    field: input.field,
  });

  // 4. 자료 선택: 사용자 요청 ∩ 활성 어댑터 (없으면 활성 전부)
  const enabled = getEnabledAdapters().map((a) => a.type);
  let targets = input.requestedSources.filter((s) => enabled.includes(s as never));
  if (targets.length === 0) targets = enabled;

  // 5. 검색어 5~10개 (AI 조합 우선, 부족하면 키워드/제목 보강)
  let queries = [...new Set([...issues.keywordCombos, ...issues.keywords])]
    .map((q) => q.trim())
    .filter(Boolean);
  if (queries.length === 0) queries = [input.title, input.question].filter(Boolean);
  queries = queries.slice(0, input.deepSearch ? 10 : 6);

  // 6. 목록 검색
  const perQueryDisplay = Math.min(input.display ?? settings.defaultDisplay ?? 20, 100);
  const collected: NormalizedLegalSource[] = [];
  const errors: string[] = [];

  for (const type of targets) {
    const adapter = getAdapter(type);
    if (!adapter) continue;
    for (const q of queries) {
      try {
        const list = await adapter.search({ query: q, display: perQueryDisplay }, oc);
        collected.push(...list);
      } catch (e) {
        errors.push(
          `[${adapter.label}] "${q}" 검색 실패: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  if (collected.length === 0) {
    // 관련 자료를 찾지 못하면 내용을 생성하지 않는다.
    const message = errors.length
      ? errors.join(" / ")
      : "관련 자료를 찾지 못했습니다.";
    if (errors.some((e) => e.includes("인증값") || e.includes("OC"))) {
      throw new LawApiError(message);
    }
    return {
      issues,
      sources: [],
      report: {
        questionSummary: input.question,
        favorablePoints: [],
        unfavorablePoints: [],
        additionalChecks: ["검색된 자료가 없어 비교 분석을 수행하지 못했습니다. 검색어나 자료 범위를 조정해 다시 시도하세요."],
        expertQuestions: [],
        overallReview: "관련 자료를 찾지 못했습니다.",
      },
    };
  }

  // 7. 중복 제거
  const unique = dedupe(collected);

  // 8. 점수화 (검색 관련도)
  const scoreCtx = {
    keywords: [...issues.keywords, ...issues.keywordCombos],
    issues: issues.keyIssues,
    relatedLaws: [],
    facts: input.facts,
  };
  const scored: ScoredSource[] = unique
    .map((s) => ({ ...s, relevanceScore: scoreSource(s, scoreCtx) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 9. 상위 결과 본문 조회 (심층=15, 기본=8)
  const topN = input.deepSearch ? 15 : 8;
  const top = scored.slice(0, topN);
  for (const s of top) {
    const adapter = getAdapter(s.sourceType as string);
    if (!adapter || !s.sourceId) continue;
    try {
      const detail = await adapter.fetchDetail(s.sourceId, oc);
      if (detail) {
        s.originalText = detail.originalText ?? s.originalText;
        s.summary = detail.summary ?? s.summary;
        s.relatedLaws = detail.relatedLaws?.length ? detail.relatedLaws : s.relatedLaws;
      }
    } catch {
      // 본문 조회 실패는 목록 정보로 대체 (전체 파이프라인 중단하지 않음)
    }
  }

  // 10. AI 비교 (상위 5~N 건만)
  const compareN = Math.min(top.length, input.deepSearch ? 10 : 5);
  for (let i = 0; i < compareN; i++) {
    try {
      top[i].comparison = await compareSource({
        question: input.question,
        facts: input.facts,
        source: top[i],
      });
    } catch {
      top[i].comparison = { similarities: [], differences: [] };
    }
  }

  // 12. 종합 검토
  let report: Report;
  try {
    report = await buildReport({
      question: input.question,
      facts: input.facts,
      issues: issues.keyIssues,
      sources: top.map((s) => ({
        title: s.title,
        sourceType: String(s.sourceType),
        summary: s.summary,
      })),
    });
  } catch {
    report = {
      questionSummary: input.question,
      favorablePoints: [],
      unfavorablePoints: [],
      additionalChecks: ["종합 검토 생성 중 오류가 발생했습니다. 개별 자료 비교 결과를 참고하세요."],
      expertQuestions: [],
      overallReview: "",
    };
  }

  return { issues, sources: top, report };
}
