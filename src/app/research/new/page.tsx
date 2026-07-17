"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, Spinner } from "@/components/ui";
import { Disclaimer } from "@/components/Disclaimer";

const FIELDS = ["사업", "생활", "가족", "재산", "노동", "세금", "투자", "개인정보", "기타"];
const SOURCES = [
  { type: "law", label: "현행법령", enabled: true },
  { type: "prec", label: "판례", enabled: true },
  { type: "detc", label: "헌재결정례", enabled: false },
  { type: "expc", label: "법령해석례", enabled: false },
  { type: "decc", label: "행정심판례", enabled: false },
];

export default function NewResearchPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [facts, setFacts] = useState("");
  const [question, setQuestion] = useState("");
  const [field, setField] = useState("사업");
  const [sources, setSources] = useState<string[]>(["law", "prec"]);
  const [anonymize, setAnonymize] = useState(true);
  const [deepSearch, setDeepSearch] = useState(false);

  const [anonText, setAnonText] = useState("");
  const [anonMatches, setAnonMatches] = useState<{ type: string; original: string; replacement: string }[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 설정에서 기본값 로드
  useEffect(() => {
    (async () => {
      try {
        const s = await (await fetch("/api/settings")).json();
        if (Array.isArray(s.defaultSources) && s.defaultSources.length) setSources(s.defaultSources);
        if (typeof s.autoAnonymize === "boolean") setAnonymize(s.autoAnonymize);
      } catch {
        /* 기본값 유지 */
      }
    })();
  }, []);

  function toggleSource(t: string) {
    setSources((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function preview() {
    if (!facts.trim()) return;
    setPreviewing(true);
    try {
      const res = await fetch("/api/anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: facts }),
      });
      const data = await res.json();
      setAnonText(data.text);
      setAnonMatches(data.matches ?? []);
    } finally {
      setPreviewing(false);
    }
  }

  async function submit() {
    setError("");
    if (!title.trim() || !facts.trim() || !question.trim()) {
      setError("제목, 사실관계, 질문은 필수입니다.");
      return;
    }
    if (sources.length === 0) {
      setError("검색할 자료를 하나 이상 선택하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, facts, question, field, sources, anonymize, deepSearch }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "조사 실행에 실패했습니다.");
        if (data.id) router.push(`/research/${data.id}`);
        return;
      }
      router.push(`/research/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">새 조사</h1>
      <Disclaimer />
      {error && <ErrorState message={error} />}

      <div className="card space-y-4 p-5">
        <div>
          <label className="label">조사 제목 *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 배달 악성고객 신고 서비스의 개인정보 문제" />
        </div>
        <div>
          <label className="label">사실관계 *</label>
          <textarea className="input min-h-[140px]" value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="관련 상황을 구체적으로 서술하세요." />
        </div>
        <div>
          <label className="label">알고 싶은 질문 *</label>
          <textarea className="input min-h-[70px]" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="예: 고객 정보를 다른 업주에게 공유해도 되는지 알고 싶습니다." />
        </div>
        <div>
          <label className="label">분야</label>
          <div className="flex flex-wrap gap-2">
            {FIELDS.map((f) => (
              <button key={f} type="button" onClick={() => setField(f)} className={`chip border ${field === f ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-500"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">검색할 자료</label>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button key={s.type} type="button" disabled={!s.enabled} onClick={() => toggleSource(s.type)} className={`chip border ${sources.includes(s.type) && s.enabled ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-500"} ${!s.enabled ? "cursor-not-allowed opacity-50" : ""}`}>
                {s.label}
                {!s.enabled && " (준비중)"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} />
            개인정보 익명화 후 검색
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={deepSearch} onChange={(e) => setDeepSearch(e.target.checked)} />
            심층검색 (더 많은 검색어·자료)
          </label>
        </div>
      </div>

      {anonymize && (
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">개인정보 익명화 미리보기</h2>
            <button onClick={preview} disabled={previewing || !facts.trim()} className="btn-ghost">
              {previewing ? "처리 중..." : "미리보기 갱신"}
            </button>
          </div>
          {anonText ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">원문</p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-700">{facts}</pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">익명화 결과 (검색에 사용)</p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded bg-emerald-50 p-2 text-xs text-slate-700">{anonText}</pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              &quot;미리보기 갱신&quot;을 눌러 어떤 정보가 치환되는지 확인한 뒤 검색하세요.
            </p>
          )}
          {anonMatches.length > 0 && (
            <p className="text-xs text-slate-500">치환됨: {anonMatches.map((m) => m.replacement).join(", ")}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary">
          {submitting ? "조사 실행 중... (수십 초 소요)" : "조사 실행"}
        </button>
        {submitting && <Spinner label="AI 분석 및 자료 검색 중" />}
      </div>
    </div>
  );
}
