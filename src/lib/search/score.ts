import type { NormalizedLegalSource } from "@/lib/law-api/types";

/**
 * "검색 관련도" 점수 (0~100). 법적 결론이 아니라 검색 정렬용 지표임을 명확히 한다.
 * 구성요소: 검색어 일치 / 쟁점 일치 / 관련 법령 일치 / 사실관계 유사성 / 기관·법원 중요도 / 최신성
 */
export interface ScoreContext {
  keywords: string[];
  issues: string[];
  relatedLaws: string[];
  facts: string;
}

const COURT_WEIGHT: Record<string, number> = {
  대법원: 1,
  헌법재판소: 1,
  고등법원: 0.7,
  지방법원: 0.5,
};

function countHits(haystack: string, needles: string[]): number {
  if (!haystack) return 0;
  const h = haystack.toLowerCase();
  let n = 0;
  for (const raw of needles) {
    const t = raw.trim().toLowerCase();
    if (t.length < 2) continue;
    if (h.includes(t)) n++;
  }
  return n;
}

function recencyScore(dateStr?: string): number {
  if (!dateStr) return 0;
  const digits = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length < 4) return 0;
  const year = Number(digits.slice(0, 4));
  if (!year || year < 1950) return 0;
  const now = new Date().getFullYear();
  const age = now - year;
  if (age <= 3) return 1;
  if (age <= 7) return 0.7;
  if (age <= 15) return 0.4;
  return 0.15;
}

function courtScore(agency: string): number {
  if (!agency) return 0.3;
  for (const [k, w] of Object.entries(COURT_WEIGHT)) {
    if (agency.includes(k)) return w;
  }
  return 0.4;
}

export function scoreSource(src: NormalizedLegalSource, ctx: ScoreContext): number {
  const text = [src.title, src.summary, src.originalText, (src.relatedLaws ?? []).join(" ")]
    .filter(Boolean)
    .join(" ");

  const kwHits = countHits(text, ctx.keywords);
  const issueHits = countHits(text, ctx.issues);
  const lawHits = countHits((src.relatedLaws ?? []).join(" "), ctx.relatedLaws);
  const factHits = countHits(
    text,
    ctx.facts.split(/[\s,.]+/).filter((w) => w.length >= 2),
  );

  const kwScore = Math.min(kwHits / Math.max(ctx.keywords.length, 1), 1); // 0~1
  const issueScore = Math.min(issueHits / Math.max(ctx.issues.length, 1), 1);
  const lawScore = ctx.relatedLaws.length ? Math.min(lawHits / ctx.relatedLaws.length, 1) : 0;
  const factScore = Math.min(factHits / 20, 1);
  const court = courtScore(src.agency);
  const recency = recencyScore(src.decisionDate);

  // 가중합 (합계 = 1.0)
  const total =
    kwScore * 0.3 +
    issueScore * 0.25 +
    lawScore * 0.15 +
    factScore * 0.1 +
    court * 0.1 +
    recency * 0.1;

  return Math.round(total * 100);
}
