import { text } from "./client";
import type { NormalizedLegalSource, SourceType } from "./types";

/** 국가법령정보 상세 링크는 상대경로(/DRF/...)로 오므로 절대경로로 보정 */
export function absoluteLawUrl(link: string | undefined): string {
  const l = text(link);
  if (!l) return "";
  if (l.startsWith("http")) return l;
  if (l.startsWith("/")) return `https://www.law.go.kr${l}`;
  return `https://www.law.go.kr/${l}`;
}

/** 참조조문/참조판례 문자열을 배열로 분리 */
export function splitRelated(v: unknown): string[] {
  const s = text(v);
  if (!s) return [];
  return s
    .split(/[\n,\/·]|\s{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** HTML 태그 및 과도한 공백 제거 (판례 본문 등 정리용) */
export function stripHtml(v: unknown): string {
  const s = text(v);
  if (!s) return "";
  return s
    .replace(/<br\s*\/?>(?=)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function makeSource(
  type: SourceType,
  partial: Partial<NormalizedLegalSource>,
): NormalizedLegalSource {
  return {
    sourceType: type,
    agency: partial.agency ?? "",
    sourceId: partial.sourceId ?? "",
    title: partial.title ?? "",
    caseNumber: partial.caseNumber,
    decisionDate: partial.decisionDate,
    summary: partial.summary,
    originalText: partial.originalText,
    relatedLaws: partial.relatedLaws ?? [],
    sourceUrl: partial.sourceUrl ?? "",
  };
}
