import { NextResponse } from "next/server";
import { getResearch, parseArr } from "@/lib/research-repo";
import { toMarkdown } from "@/lib/export/markdown";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") ?? "md";
  const agg = await getResearch(Number(id));
  if (!agg) return NextResponse.json({ error: "조사를 찾을 수 없습니다." }, { status: 404 });

  const base = `ablelaw-research-${id}`;

  if (format === "json") {
    const payload = {
      research: agg.research,
      issue: agg.issue
        ? {
            confirmedFacts: parseArr(agg.issue.confirmedFacts),
            unclearFacts: parseArr(agg.issue.unclearFacts),
            keyIssues: parseArr(agg.issue.keyIssues),
            agencies: parseArr(agg.issue.agencies),
            keywords: parseArr(agg.issue.keywords),
            keywordCombos: parseArr(agg.issue.keywordCombos),
            recommendedSources: parseArr(agg.issue.recommendedSources),
            followupQuestions: parseArr(agg.issue.followupQuestions),
          }
        : null,
      sources: agg.sources.map((s) => ({
        ...s,
        relatedLaws: parseArr(s.relatedLaws),
        aiSimilarities: parseArr(s.aiSimilarities),
        aiDifferences: parseArr(s.aiDifferences),
      })),
      report: agg.report
        ? {
            ...agg.report,
            favorablePoints: parseArr(agg.report.favorablePoints),
            unfavorablePoints: parseArr(agg.report.unfavorablePoints),
            additionalChecks: parseArr(agg.report.additionalChecks),
            expertQuestions: parseArr(agg.report.expertQuestions),
          }
        : null,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.json"`,
      },
    });
  }

  const md = toMarkdown(agg);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.md"`,
    },
  });
}
