import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearch, parseArr } from "@/lib/research-repo";
import { Collapsible, OriginLabel, SourceBadge, StatusChip } from "@/components/ui";
import { ResultActions } from "@/components/ResultActions";
import { Disclaimer } from "@/components/Disclaimer";
import type { SourceResult } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function Bullets({ title, items, tone }: { title: string; items: string[]; tone?: "good" | "bad" }) {
  if (!items.length) return null;
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-slate-800";
  return (
    <div>
      <h3 className={`mb-1 text-sm font-semibold ${color}`}>{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function ResearchResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agg = await getResearch(Number(id));
  if (!agg) notFound();

  const { research: r, issue, sources, report } = agg;
  const laws = sources.filter((s) => s.sourceType === "law");
  const cases = sources.filter((s) => s.sourceType !== "law");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <StatusChip status={r.status} />
            {r.field && <span className="chip bg-slate-100 text-slate-600">{r.field}</span>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{r.title}</h1>
        </div>
        <Link href="/history" className="no-print text-sm text-brand-600 hover:underline">
          ← 목록
        </Link>
      </div>

      <ResultActions id={r.id} initialFavorite={r.favorite} initialTags={parseArr(r.tags)} />

      {r.status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          이 조사는 실행 중 오류가 발생했습니다. 설정(OC/AI 키)을 확인한 뒤 새 조사로 다시 시도하세요.
        </div>
      )}

      {/* 질문 요약 */}
      <section className="card space-y-2 p-5">
        <h2 className="font-semibold text-slate-800">질문 요약</h2>
        <p className="text-sm text-slate-700">{report?.questionSummary || r.question}</p>
      </section>

      {/* 사실관계 */}
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-slate-800">사실관계</h2>
        {r.anonymize && r.factsAnonymized && (
          <span className="chip bg-emerald-100 text-emerald-700">개인정보 익명화 적용됨</span>
        )}
        <p className="whitespace-pre-wrap text-sm text-slate-700">{r.factsAnonymized || r.facts}</p>
      </section>

      {/* 쟁점 */}
      {issue && (
        <section className="card grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <Bullets title="확인된 사실" items={parseArr(issue.confirmedFacts)} />
          <Bullets title="불명확한 사실" items={parseArr(issue.unclearFacts)} />
          <Bullets title="주요 법률 쟁점" items={parseArr(issue.keyIssues)} />
          <Bullets title="관련 기관" items={parseArr(issue.agencies)} />
        </section>
      )}

      {/* 관련 법령 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">관련 법령 ({laws.length})</h2>
        {laws.length === 0 ? (
          <p className="text-sm text-slate-500">검색된 법령이 없습니다.</p>
        ) : (
          laws.map((s) => <SourceCard key={s.id} s={s} />)
        )}
      </section>

      {/* 유사 판례 및 결정례 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">유사 판례 및 결정례 ({cases.length})</h2>
        {cases.length === 0 ? (
          <p className="text-sm text-slate-500">검색된 판례·결정례가 없습니다.</p>
        ) : (
          cases.map((s) => <SourceCard key={s.id} s={s} />)
        )}
      </section>

      {/* 종합 검토 */}
      {report && (
        <section className="card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-800">종합 검토</h2>
            <OriginLabel kind="ai" />
          </div>
          {report.overallReview && (
            <p className="whitespace-pre-wrap text-sm text-slate-700">{report.overallReview}</p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Bullets title="유리하게 볼 수 있는 근거" items={parseArr(report.favorablePoints)} tone="good" />
            <Bullets title="불리하게 볼 수 있는 근거" items={parseArr(report.unfavorablePoints)} tone="bad" />
            <Bullets title="추가 확인이 필요한 내용" items={parseArr(report.additionalChecks)} />
            <Bullets title="전문가에게 확인할 질문" items={parseArr(report.expertQuestions)} />
          </div>
        </section>
      )}

      <Disclaimer />
    </div>
  );
}

function SourceCard({ s }: { s: SourceResult }) {
  const similarities = parseArr(s.aiSimilarities);
  const differences = parseArr(s.aiDifferences);
  const related = parseArr(s.relatedLaws);
  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SourceBadge type={s.sourceType} />
          <h3 className="font-medium text-slate-900">{s.title}</h3>
        </div>
        <span className="chip bg-slate-100 text-slate-600" title="검색 정렬용 지표(법적 결론 아님)">
          검색 관련도 {s.relevanceScore}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {s.caseNumber && <span>사건번호: {s.caseNumber}</span>}
        {s.agency && <span>기관/법원: {s.agency}</span>}
        {s.decisionDate && <span>일자: {s.decisionDate}</span>}
      </div>

      {s.summary && (
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <OriginLabel kind="original" />
            <span className="text-xs font-medium text-slate-500">핵심 요지</span>
          </div>
          <Collapsible text={s.summary} />
        </div>
      )}

      {s.originalText && (
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <OriginLabel kind="original" />
            <span className="text-xs font-medium text-slate-500">본문</span>
          </div>
          <Collapsible text={s.originalText} previewChars={200} />
        </div>
      )}

      {(similarities.length > 0 || differences.length > 0) && (
        <div className="rounded-md bg-violet-50/60 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <OriginLabel kind="ai" />
            <span className="text-xs font-medium text-slate-500">내 질문과 비교</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Bullets title="같은 점" items={similarities} tone="good" />
            <Bullets title="다른 점" items={differences} tone="bad" />
          </div>
        </div>
      )}

      {related.length > 0 && (
        <p className="text-xs text-slate-500">참조/관련: {related.slice(0, 8).join(", ")}</p>
      )}

      {s.sourceUrl && (
        <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline">
          원문 출처 열기 ↗
        </a>
      )}
    </div>
  );
}
