import "server-only";
import { getDb, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import type { Research, SourceResult, ResearchIssue, ResearchReport } from "@/lib/db/schema";
import type { PipelineResult } from "@/lib/search/pipeline";

export interface ResearchAggregate {
  research: Research;
  issue: ResearchIssue | null;
  sources: SourceResult[];
  report: ResearchReport | null;
}

const j = (v: unknown) => JSON.stringify(v ?? []);
const p = (v: string | null | undefined): string[] => {
  if (!v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
};
export const parseArr = p;

export interface CreateResearchInput {
  title: string;
  facts: string;
  factsAnonymized?: string | null;
  question: string;
  field?: string;
  sources: string[];
  anonymize: boolean;
  deepSearch: boolean;
}

export async function createResearch(input: CreateResearchInput): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .insert(schema.researches)
    .values({
      title: input.title,
      facts: input.facts,
      factsAnonymized: input.factsAnonymized ?? null,
      question: input.question,
      field: input.field ?? null,
      sources: j(input.sources),
      anonymize: input.anonymize,
      deepSearch: input.deepSearch,
      status: "draft",
      favorite: false,
      tags: "[]",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.researches.id });
  return rows[0].id;
}

export async function setStatus(id: number, status: string): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.researches)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.researches.id, id));
}

/** 파이프라인 결과 저장 (기존 결과는 교체) */
export async function saveResults(researchId: number, result: PipelineResult): Promise<void> {
  const db = await getDb();
  const now = new Date();

  await db.delete(schema.researchIssues).where(eq(schema.researchIssues.researchId, researchId));
  await db.delete(schema.sourceResults).where(eq(schema.sourceResults.researchId, researchId));
  await db.delete(schema.researchReports).where(eq(schema.researchReports.researchId, researchId));

  await db.insert(schema.researchIssues).values({
    researchId,
    confirmedFacts: j(result.issues.confirmedFacts),
    unclearFacts: j(result.issues.unclearFacts),
    keyIssues: j(result.issues.keyIssues),
    agencies: j(result.issues.agencies),
    keywords: j(result.issues.keywords),
    keywordCombos: j(result.issues.keywordCombos),
    recommendedSources: j(result.issues.recommendedSources),
    followupQuestions: j(result.issues.followupQuestions),
    createdAt: now,
  });

  for (const s of result.sources) {
    await db.insert(schema.sourceResults).values({
      researchId,
      sourceType: String(s.sourceType),
      agency: s.agency ?? null,
      sourceId: s.sourceId ?? null,
      title: s.title,
      caseNumber: s.caseNumber ?? null,
      decisionDate: s.decisionDate ?? null,
      summary: s.summary ?? null,
      originalText: s.originalText ?? null,
      relatedLaws: j(s.relatedLaws ?? []),
      sourceUrl: s.sourceUrl ?? null,
      relevanceScore: s.relevanceScore,
      aiSimilarities: j(s.comparison?.similarities ?? []),
      aiDifferences: j(s.comparison?.differences ?? []),
      createdAt: now,
    });
  }

  await db.insert(schema.researchReports).values({
    researchId,
    questionSummary: result.report.questionSummary,
    favorablePoints: j(result.report.favorablePoints),
    unfavorablePoints: j(result.report.unfavorablePoints),
    additionalChecks: j(result.report.additionalChecks),
    expertQuestions: j(result.report.expertQuestions),
    overallReview: result.report.overallReview,
    createdAt: now,
  });

  await setStatus(researchId, "done");
}

export async function getResearch(id: number): Promise<ResearchAggregate | null> {
  const db = await getDb();
  const r = await db.select().from(schema.researches).where(eq(schema.researches.id, id));
  if (r.length === 0) return null;
  const issue = await db
    .select()
    .from(schema.researchIssues)
    .where(eq(schema.researchIssues.researchId, id));
  const sources = await db
    .select()
    .from(schema.sourceResults)
    .where(eq(schema.sourceResults.researchId, id))
    .orderBy(desc(schema.sourceResults.relevanceScore));
  const report = await db
    .select()
    .from(schema.researchReports)
    .where(eq(schema.researchReports.researchId, id));
  return {
    research: r[0],
    issue: issue[0] ?? null,
    sources,
    report: report[0] ?? null,
  };
}

export async function listResearches(): Promise<Research[]> {
  const db = await getDb();
  return db.select().from(schema.researches).orderBy(desc(schema.researches.updatedAt));
}

export async function updateResearch(
  id: number,
  patch: Partial<Pick<Research, "title" | "question" | "field" | "favorite" | "tags" | "status">>,
): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.researches)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.researches.id, id));
}

export async function deleteResearch(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(schema.researches).where(eq(schema.researches.id, id));
}
