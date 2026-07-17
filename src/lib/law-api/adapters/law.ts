import "server-only";
import { searchList, fetchService, asArray, text } from "../client";
import { absoluteLawUrl, makeSource, stripHtml } from "../normalize";
import type { LawSourceAdapter, NormalizedLegalSource, SearchListItem, SearchParams } from "../types";

/**
 * 현행법령 어댑터 — target=law
 * 공식 확인: docs/api-targets.md §1
 */
export const lawAdapter: LawSourceAdapter = {
  type: "law",
  label: "현행법령",
  enabled: true,

  async search(params: SearchParams, oc: string): Promise<SearchListItem[]> {
    const json = (await searchList({
      target: "law",
      oc,
      params: {
        query: params.query,
        display: params.display ?? 20,
        page: params.page ?? 1,
        search: 1,
        sort: params.sort,
      },
    })) as Record<string, unknown>;

    const root = (json.LawSearch ?? json.lawSearch ?? {}) as Record<string, unknown>;
    const items = asArray<Record<string, unknown>>(root.law);
    return items.map((it) =>
      makeSource("law", {
        sourceId: text(it["법령ID"]) || text(it["법령일련번호"]),
        title: text(it["법령명한글"]),
        agency: text(it["소관부처명"]),
        decisionDate: text(it["시행일자"]) || text(it["공포일자"]),
        summary: [text(it["법령구분명"]), text(it["제개정구분명"])].filter(Boolean).join(" · "),
        sourceUrl: absoluteLawUrl(text(it["법령상세링크"])),
      }),
    );
  },

  async fetchDetail(sourceId: string, oc: string): Promise<NormalizedLegalSource | null> {
    const json = (await fetchService({
      target: "law",
      oc,
      params: { ID: sourceId },
    })) as Record<string, unknown>;

    const root = (json.법령 ?? json.Law ?? json.law ?? {}) as Record<string, unknown>;
    const basic = (root.기본정보 ?? {}) as Record<string, unknown>;

    // 조문 본문 조립
    const jomunRoot = (root.조문 ?? {}) as Record<string, unknown>;
    const jomuns = asArray<Record<string, unknown>>(jomunRoot.조문단위 ?? jomunRoot.조문);
    const bodyParts = jomuns
      .map((j) => stripHtml(j["조문내용"]))
      .filter(Boolean);

    const title = text(basic["법령명_한글"]) || text(basic["법령명한글"]) || text(root["법령명_한글"]);
    if (!title && bodyParts.length === 0) return null;

    return makeSource("law", {
      sourceId,
      title: title || "(제목 미상)",
      agency: text((basic["소관부처"] as Record<string, unknown>)?.["#text"] ?? basic["소관부처"] ?? basic["소관부처명"]),
      decisionDate: text(basic["시행일자"]) || text(basic["공포일자"]),
      summary: text(basic["법령구분명"]),
      originalText: bodyParts.join("\n\n"),
      relatedLaws: [],
      sourceUrl: absoluteLawUrl(text(basic["법령상세링크"])),
    });
  },
};
