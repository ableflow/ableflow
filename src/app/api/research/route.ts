import { NextResponse } from "next/server";
import { createResearch, listResearches, saveResults, setStatus } from "@/lib/research-repo";
import { runResearchPipeline } from "@/lib/search/pipeline";
import { anonymize } from "@/lib/privacy/anonymize";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  try {
    const rows = await listResearches();
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

interface CreateBody {
  title: string;
  facts: string;
  question: string;
  field?: string;
  sources?: string[];
  anonymize?: boolean;
  deepSearch?: boolean;
}

export async function POST(req: Request) {
  let researchId: number | null = null;
  try {
    const body = (await req.json()) as CreateBody;
    if (!body.title?.trim() || !body.facts?.trim() || !body.question?.trim()) {
      return NextResponse.json(
        { error: "제목, 사실관계, 질문은 필수입니다." },
        { status: 400 },
      );
    }

    const useAnon = body.anonymize ?? false;
    const anonResult = useAnon ? anonymize(body.facts) : null;
    const factsForSearch = anonResult ? anonResult.text : body.facts;

    researchId = await createResearch({
      title: body.title.trim(),
      facts: body.facts,
      factsAnonymized: anonResult?.text ?? null,
      question: body.question.trim(),
      field: body.field,
      sources: body.sources ?? ["law", "prec"],
      anonymize: useAnon,
      deepSearch: body.deepSearch ?? false,
    });

    await setStatus(researchId, "searching");

    const result = await runResearchPipeline({
      title: body.title,
      facts: factsForSearch,
      question: body.question,
      field: body.field,
      requestedSources: body.sources ?? ["law", "prec"],
      deepSearch: body.deepSearch ?? false,
    });

    await saveResults(researchId, result);

    return NextResponse.json({ id: researchId, status: "done" });
  } catch (e) {
    if (researchId) await setStatus(researchId, "error").catch(() => {});
    return NextResponse.json(
      {
        id: researchId,
        error: e instanceof Error ? e.message : "조사 실행 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
