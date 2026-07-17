import type { NormalizedLegalSource } from "@/lib/law-api/types";

const GUARDRAIL = `당신은 법률 조사 보조 도구입니다. 절대 다음을 하지 마십시오:
- 합법/불법의 확정적 판단
- 승소 가능성 예측
- 구체적 법률 자문이나 결론
당신의 역할은 관련 자료를 검색·정리하고, 사실관계의 공통점·차이점을 중립적으로 비교하는 것입니다.
반드시 지정된 JSON 형식만 출력하고, JSON 외의 설명 문장을 덧붙이지 마십시오.`;

export function issueAnalysisPrompt(input: {
  title: string;
  facts: string;
  question: string;
  field?: string;
}): { system: string; user: string } {
  const system = `${GUARDRAIL}

다음 JSON 스키마로만 응답하십시오:
{
  "confirmedFacts": string[],   // 입력에서 확인된 사실
  "unclearFacts": string[],     // 불명확하거나 추가 확인이 필요한 사실
  "keyIssues": string[],        // 핵심 법률 쟁점(질문 형태 가능)
  "agencies": string[],         // 관련 기관/부처/법원
  "keywords": string[],         // 검색 키워드 (개별 단어/구)
  "keywordCombos": string[],    // 실제 검색에 쓸 검색어 조합 5~10개
  "recommendedSources": string[], // 추천 자료 코드 (law=현행법령, prec=판례)
  "followupQuestions": string[]   // 사용자에게 되물을 추가 확인 질문
}`;

  const user = `[조사 제목]\n${input.title}\n\n[분야]\n${input.field ?? "미지정"}\n\n[사실관계]\n${input.facts}\n\n[알고 싶은 질문]\n${input.question}\n\n위 내용을 분석해 JSON으로만 응답하십시오. keywordCombos 는 국가법령정보 검색에 바로 쓸 수 있는 한국어 검색어 5~10개로 작성하십시오.`;

  return { system, user };
}

export function comparisonPrompt(input: {
  question: string;
  facts: string;
  source: NormalizedLegalSource;
}): { system: string; user: string } {
  const system = `${GUARDRAIL}

다음 JSON 스키마로만 응답하십시오:
{
  "similarities": string[], // 사용자 사안과 이 자료의 공통점
  "differences": string[]   // 사용자 사안과 이 자료의 차이점
}`;

  const src = input.source;
  const body = (src.summary || src.originalText || "").slice(0, 6000);
  const user = `[내 질문]\n${input.question}\n\n[내 사실관계]\n${input.facts}\n\n[비교 대상 자료]\n종류: ${src.sourceType}\n제목: ${src.title}\n사건번호: ${src.caseNumber ?? "-"}\n요지/본문: ${body}\n\n내 사안과 이 자료의 공통점·차이점을 중립적으로 정리해 JSON으로만 응답하십시오.`;

  return { system, user };
}

export function reportPrompt(input: {
  question: string;
  facts: string;
  issues: string[];
  sources: { title: string; sourceType: string; summary?: string }[];
}): { system: string; user: string } {
  const system = `${GUARDRAIL}

다음 JSON 스키마로만 응답하십시오:
{
  "questionSummary": string,       // 질문 요약(1~2문장)
  "favorablePoints": string[],     // 사용자에게 유리하게 볼 수 있는 근거(자료 기반, 단정 금지)
  "unfavorablePoints": string[],   // 불리하게 볼 수 있는 근거(자료 기반, 단정 금지)
  "additionalChecks": string[],    // 추가 확인이 필요한 내용
  "expertQuestions": string[],     // 변호사/전문가에게 확인할 질문
  "overallReview": string          // 자료 비교 결과 종합 정리(중립적, 결론 단정 금지)
}`;

  const srcList = input.sources
    .map((s, i) => `${i + 1}. [${s.sourceType}] ${s.title} — ${(s.summary ?? "").slice(0, 300)}`)
    .join("\n");
  const user = `[내 질문]\n${input.question}\n\n[내 사실관계]\n${input.facts}\n\n[핵심 쟁점]\n${input.issues.join("\n")}\n\n[검색된 자료]\n${srcList}\n\n위 자료를 근거로 종합 검토를 JSON으로만 작성하십시오. 확정적 결론이나 합법/불법 판단은 하지 마십시오.`;

  return { system, user };
}
