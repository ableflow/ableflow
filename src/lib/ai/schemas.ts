import { z } from "zod";

/** AI 사전 분석(쟁점 추출) 결과 */
export const IssueAnalysisSchema = z.object({
  confirmedFacts: z.array(z.string()).default([]), // 확인된 사실
  unclearFacts: z.array(z.string()).default([]), // 불명확한 사실
  keyIssues: z.array(z.string()).default([]), // 핵심 법률 쟁점
  agencies: z.array(z.string()).default([]), // 관련 기관
  keywords: z.array(z.string()).default([]), // 검색 키워드
  keywordCombos: z.array(z.string()).default([]), // 검색어 조합
  recommendedSources: z.array(z.string()).default([]), // 추천 검색 자료 (law/prec/...)
  followupQuestions: z.array(z.string()).default([]), // 추가 확인 질문
});
export type IssueAnalysis = z.infer<typeof IssueAnalysisSchema>;

/** 개별 자료와 내 질문의 비교 결과 */
export const ComparisonSchema = z.object({
  similarities: z.array(z.string()).default([]), // 내 질문과 같은 점
  differences: z.array(z.string()).default([]), // 내 질문과 다른 점
});
export type Comparison = z.infer<typeof ComparisonSchema>;

/** 종합 검토 보고서 */
export const ReportSchema = z.object({
  questionSummary: z.string().default(""),
  favorablePoints: z.array(z.string()).default([]), // 유리하게 볼 수 있는 근거
  unfavorablePoints: z.array(z.string()).default([]), // 불리하게 볼 수 있는 근거
  additionalChecks: z.array(z.string()).default([]), // 추가 확인이 필요한 내용
  expertQuestions: z.array(z.string()).default([]), // 전문가에게 확인할 질문
  overallReview: z.string().default(""), // 종합 검토(자료 비교 정리)
});
export type Report = z.infer<typeof ReportSchema>;
