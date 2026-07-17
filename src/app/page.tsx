import Link from "next/link";
import { listResearches } from "@/lib/research-repo";
import { getPublicSettings } from "@/lib/settings";
import { SourceBadge, StatusChip } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [researches, settings] = await Promise.all([listResearches(), getPublicSettings()]);
  const recent = researches.slice(0, 5);
  const ocReady = Boolean(settings.lawApiOc);
  const aiReady = settings.aiProvider === "anthropic" ? settings.hasAnthropicKey : settings.hasOpenaiKey;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="mt-1 text-sm text-slate-500">
            상황을 입력하면 관련 현행법령·판례를 검색하고 내 질문과 비교합니다.
          </p>
        </div>
        <Link href="/research/new" className="btn-primary">
          + 새 조사 시작
        </Link>
      </section>

      {(!ocReady || !aiReady) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          설정이 완료되지 않았습니다.{" "}
          {!ocReady && "국가법령정보 API 인증값(OC) "}
          {!ocReady && !aiReady && "및 "}
          {!aiReady && "AI API 키 "}
          를 입력해야 조사를 실행할 수 있습니다.{" "}
          <Link href="/settings" className="font-semibold underline">
            설정으로 이동
          </Link>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="총 조사" value={String(researches.length)} />
        <StatCard label="완료" value={String(researches.filter((r) => r.status === "done").length)} />
        <StatCard label="즐겨찾기" value={String(researches.filter((r) => r.favorite).length)} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">최근 조사</h2>
          <Link href="/history" className="text-sm text-brand-600 hover:underline">
            전체 보기
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card px-6 py-10 text-center text-sm text-slate-500">
            아직 조사가 없습니다. 새 조사를 시작해 보세요.
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id} className="card px-4 py-3">
                <Link href={`/research/${r.id}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{r.title}</p>
                    <p className="truncate text-xs text-slate-500">{r.question}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {JSON.parse(r.sources || "[]").map((s: string) => (
                      <SourceBadge key={s} type={s} />
                    ))}
                    <StatusChip status={r.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
