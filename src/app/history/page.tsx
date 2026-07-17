"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SourceBadge, StatusChip, EmptyState, ErrorState, Spinner } from "@/components/ui";

interface Row {
  id: number;
  title: string;
  question: string;
  field: string | null;
  sources: string;
  status: string;
  favorite: boolean;
  tags: string;
  updatedAt: number;
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/research");
      if (!res.ok) throw new Error("목록을 불러오지 못했습니다.");
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (favOnly && !r.favorite) return false;
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return (
        r.title.toLowerCase().includes(t) ||
        r.question.toLowerCase().includes(t) ||
        (r.tags || "").toLowerCase().includes(t)
      );
    });
  }, [rows, q, favOnly]);

  async function toggleFav(r: Row) {
    await fetch(`/api/research/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !r.favorite }),
    });
    load();
  }

  async function remove(r: Row) {
    if (!confirm(`"${r.title}" 조사를 삭제할까요?`)) return;
    await fetch(`/api/research/${r.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">조사 기록</h1>
        <Link href="/research/new" className="btn-primary">
          + 새 조사
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="제목·질문·태그 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} />
          즐겨찾기만
        </label>
      </div>

      {loading ? (
        <Spinner label="불러오는 중..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="조사가 없습니다." hint="새 조사를 시작해 보세요." />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/research/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{r.title}</p>
                  <p className="truncate text-xs text-slate-500">{r.question}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {JSON.parse(r.sources || "[]").map((s: string) => (
                      <SourceBadge key={s} type={s} />
                    ))}
                    <StatusChip status={r.status} />
                    {JSON.parse(r.tags || "[]").map((t: string) => (
                      <span key={t} className="chip bg-slate-100 text-slate-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleFav(r)}
                    title="즐겨찾기"
                    className="rounded p-1.5 text-lg hover:bg-slate-100"
                  >
                    {r.favorite ? "★" : "☆"}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    title="삭제"
                    className="rounded p-1.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
