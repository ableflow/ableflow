import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * 조사(Research) — 사용자가 입력한 하나의 조사 건
 * JSON 컬럼은 문자열로 저장하고 애플리케이션 계층에서 parse 한다.
 */
export const researches = sqliteTable("researches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  facts: text("facts").notNull(), // 사실관계 원문
  factsAnonymized: text("facts_anonymized"), // 익명화 결과
  question: text("question").notNull(), // 알고 싶은 질문
  field: text("field"), // 분야
  sources: text("sources").notNull().default("[]"), // 검색할 자료(json string[])
  anonymize: integer("anonymize", { mode: "boolean" }).notNull().default(false),
  deepSearch: integer("deep_search", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("draft"), // draft | analyzing | searching | done | error
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  tags: text("tags").notNull().default("[]"), // json string[]
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/**
 * AI 사전 분석(쟁점 추출) 결과
 */
export const researchIssues = sqliteTable("research_issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  researchId: integer("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  confirmedFacts: text("confirmed_facts").notNull().default("[]"),
  unclearFacts: text("unclear_facts").notNull().default("[]"),
  keyIssues: text("key_issues").notNull().default("[]"),
  agencies: text("agencies").notNull().default("[]"),
  keywords: text("keywords").notNull().default("[]"),
  keywordCombos: text("keyword_combos").notNull().default("[]"),
  recommendedSources: text("recommended_sources").notNull().default("[]"),
  followupQuestions: text("followup_questions").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/**
 * 검색된 개별 법령/판례 결과 (NormalizedLegalSource 를 저장)
 */
export const sourceResults = sqliteTable("source_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  researchId: integer("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  agency: text("agency"),
  sourceId: text("source_id"),
  title: text("title").notNull(),
  caseNumber: text("case_number"),
  decisionDate: text("decision_date"),
  summary: text("summary"),
  originalText: text("original_text"),
  relatedLaws: text("related_laws").notNull().default("[]"),
  sourceUrl: text("source_url"),
  relevanceScore: integer("relevance_score").notNull().default(0),
  aiSimilarities: text("ai_similarities").notNull().default("[]"),
  aiDifferences: text("ai_differences").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/**
 * 종합 검토 보고서
 */
export const researchReports = sqliteTable("research_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  researchId: integer("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  questionSummary: text("question_summary"),
  favorablePoints: text("favorable_points").notNull().default("[]"),
  unfavorablePoints: text("unfavorable_points").notNull().default("[]"),
  additionalChecks: text("additional_checks").notNull().default("[]"),
  expertQuestions: text("expert_questions").notNull().default("[]"),
  overallReview: text("overall_review"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/**
 * 설정(key/value) — 로컬 단일 사용자 전용
 */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Research = typeof researches.$inferSelect;
export type NewResearch = typeof researches.$inferInsert;
export type ResearchIssue = typeof researchIssues.$inferSelect;
export type SourceResult = typeof sourceResults.$inferSelect;
export type ResearchReport = typeof researchReports.$inferSelect;
