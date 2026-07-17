"use client";

import { useEffect, useState } from "react";
import { ErrorState, Spinner } from "@/components/ui";

const ALL_SOURCES = [
  { type: "law", label: "현행법령", enabled: true },
  { type: "prec", label: "판례", enabled: true },
  { type: "detc", label: "헌재결정례", enabled: false },
  { type: "expc", label: "법령해석례", enabled: false },
  { type: "decc", label: "행정심판례", enabled: false },
];

interface Public {
  lawApiOc: string;
  aiProvider: "anthropic" | "openai";
  aiModel: string;
  defaultDisplay: number;
  defaultSources: string[];
  autoAnonymize: boolean;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    lawApi: { ok: boolean; message: string };
    ai: { ok: boolean; message: string };
  }>(null);

  const [oc, setOc] = useState("");
  const [provider, setProvider] = useState<"anthropic" | "openai">("anthropic");
  const [model, setModel] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [display, setDisplay] = useState(20);
  const [sources, setSources] = useState<string[]>(["law", "prec"]);
  const [autoAnon, setAutoAnon] = useState(true);
  const [hasAnthropic, setHasAnthropic] = useState(false);
  const [hasOpenai, setHasOpenai] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings");
        const s: Public = await res.json();
        setOc(s.lawApiOc);
        setProvider(s.aiProvider);
        setModel(s.aiModel);
        setDisplay(s.defaultDisplay);
        setSources(s.defaultSources);
        setAutoAnon(s.autoAnonymize);
        setHasAnthropic(s.hasAnthropicKey);
        setHasOpenai(s.hasOpenaiKey);
      } catch {
        setError("설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleSource(t: string) {
    setSources((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function save() {
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawApiOc: oc,
          aiProvider: provider,
          aiModel: model,
          anthropicApiKey: anthropicKey,
          openaiApiKey: openaiKey,
          defaultDisplay: display,
          defaultSources: sources,
          autoAnonymize: autoAnon,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const s: Public = await res.json();
      setHasAnthropic(s.hasAnthropicKey);
      setHasOpenai(s.hasOpenaiKey);
      setAnthropicKey("");
      setOpenaiKey("");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류");
    }
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      await save();
      const res = await fetch("/api/settings/test", { method: "POST" });
      setTestResult(await res.json());
    } catch {
      setError("연결 테스트 실패");
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <Spinner label="설정 불러오는 중..." />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">설정</h1>
      {error && <ErrorState message={error} />}

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-slate-800">국가법령정보 API</h2>
        <div>
          <label className="label">API 인증값 (OC)</label>
          <input className="input" value={oc} onChange={(e) => setOc(e.target.value)} placeholder="open.law.go.kr 발급 아이디" />
          <p className="mt-1 text-xs text-slate-500">
            open.law.go.kr 회원가입 후 발급받은 이메일 아이디 앞부분입니다.
          </p>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-slate-800">AI 제공사</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">제공사</label>
            <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as "anthropic" | "openai")}>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label className="label">모델명</label>
            <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="claude-3-5-sonnet-latest" />
          </div>
        </div>
        <div>
          <label className="label">
            Claude API 키 {hasAnthropic && <span className="text-emerald-600">(저장됨)</span>}
          </label>
          <input className="input" type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder={hasAnthropic ? "●●●● 변경하려면 새로 입력" : "sk-ant-..."} />
        </div>
        <div>
          <label className="label">
            OpenAI API 키 {hasOpenai && <span className="text-emerald-600">(저장됨)</span>}
          </label>
          <input className="input" type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder={hasOpenai ? "●●●● 변경하려면 새로 입력" : "sk-..."} />
        </div>
        <p className="text-xs text-slate-500">API 키는 로컬 DB에만 저장되며 화면·로그에 노출되지 않습니다.</p>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-slate-800">검색 옵션</h2>
        <div>
          <label className="label">기본 검색 건수 (자료당)</label>
          <input className="input max-w-[120px]" type="number" min={1} max={100} value={display} onChange={(e) => setDisplay(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">기본 검색 자료</label>
          <div className="flex flex-wrap gap-2">
            {ALL_SOURCES.map((s) => (
              <button
                key={s.type}
                type="button"
                disabled={!s.enabled}
                onClick={() => toggleSource(s.type)}
                className={`chip border ${
                  sources.includes(s.type) && s.enabled
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-300 bg-white text-slate-500"
                } ${!s.enabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                {s.label}
                {!s.enabled && " (준비중)"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={autoAnon} onChange={(e) => setAutoAnon(e.target.checked)} />
          새 조사에서 개인정보 자동 익명화 기본 활성화
        </label>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-slate-800">API 연결 테스트</h2>
        {testResult && (
          <div className="space-y-1 text-sm">
            <p className={testResult.lawApi.ok ? "text-emerald-700" : "text-red-600"}>
              {testResult.lawApi.ok ? "✅" : "❌"} 국가법령정보: {testResult.lawApi.message}
            </p>
            <p className={testResult.ai.ok ? "text-emerald-700" : "text-red-600"}>
              {testResult.ai.ok ? "✅" : "❌"} AI: {testResult.ai.message}
            </p>
          </div>
        )}
        <button onClick={test} disabled={testing} className="btn-ghost">
          {testing ? "테스트 중..." : "저장 후 연결 테스트"}
        </button>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary">
          설정 저장
        </button>
        {saved && <span className="text-sm text-emerald-600">저장되었습니다.</span>}
      </div>
    </div>
  );
}
