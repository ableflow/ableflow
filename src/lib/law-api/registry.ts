import "server-only";
import { lawAdapter } from "./adapters/law";
import { precAdapter } from "./adapters/prec";
import type { LawSourceAdapter, SourceType } from "./types";

/**
 * 자료 유형 레지스트리.
 * 공식 API 문서로 검증된 자료만 enabled:true.
 * 나머지(헌재결정례/법령해석례/행정심판례 등)는 동일한 어댑터 인터페이스를
 * 구현해 추가하면 자동으로 노출된다. (docs/api-targets.md §3 참고)
 */
const adapters: LawSourceAdapter[] = [lawAdapter, precAdapter];

// 확장 예정 자료 — 공식 파라미터 검증 전이므로 비활성 placeholder 로만 노출
const placeholders: { type: SourceType; label: string }[] = [
  { type: "detc", label: "헌재결정례" },
  { type: "expc", label: "법령해석례" },
  { type: "decc", label: "행정심판례" },
];

export function getAdapter(type: string): LawSourceAdapter | undefined {
  return adapters.find((a) => a.type === type && a.enabled);
}

export function getEnabledAdapters(): LawSourceAdapter[] {
  return adapters.filter((a) => a.enabled);
}

/** 설정/입력 화면에 노출할 전체 자료 목록 (활성 + 미구현) */
export function listAllSources(): { type: string; label: string; enabled: boolean }[] {
  const enabled = adapters.map((a) => ({ type: a.type, label: a.label, enabled: a.enabled }));
  const disabled = placeholders
    .filter((p) => !adapters.some((a) => a.type === p.type))
    .map((p) => ({ type: p.type, label: p.label, enabled: false }));
  return [...enabled, ...disabled];
}
