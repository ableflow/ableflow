"use client";

import { useState } from "react";

export const SOURCE_LABEL: Record<string, string> = {
  law: "현행법령",
  prec: "판례",
  detc: "헌재결정례",
  expc: "법령해석례",
  decc: "행정심판례",
};

export function SourceBadge({ type }: { type: string }) {
  const color =
    type === "law"
      ? "bg-emerald-100 text-emerald-700"
      : type === "prec"
        ? "bg-indigo-100 text-indigo-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`chip ${color}`}>{SOURCE_LABEL[type] ?? type}</span>;
}

/** 원문/AI 요약 라벨 */
export function OriginLabel({ kind }: { kind: "original" | "ai" }) {
  return kind === "original" ? (
    <span className="chip bg-slate-200 text-slate-700">원문</span>
  ) : (
    <span className="chip bg-violet-100 text-violet-700">AI 요약</span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="text-3xl">🗂️</div>
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    done: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
    searching: "bg-blue-100 text-blue-700",
    analyzing: "bg-blue-100 text-blue-700",
    draft: "bg-slate-100 text-slate-600",
  };
  const label: Record<string, string> = {
    done: "완료",
    error: "오류",
    searching: "검색중",
    analyzing: "분석중",
    draft: "임시",
  };
  return <span className={`chip ${map[status] ?? map.draft}`}>{label[status] ?? status}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label ?? "처리 중..."}
    </div>
  );
}

export function Collapsible({
  text,
  previewChars = 260,
}: {
  text: string;
  previewChars?: number;
}) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const needFold = text.length > previewChars;
  const shown = open || !needFold ? text : text.slice(0, previewChars) + "…";
  return (
    <div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{shown}</p>
      {needFold && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-xs font-medium text-brand-600 hover:underline"
        >
          {open ? "접기" : "원문 더보기"}
        </button>
      )}
    </div>
  );
}
