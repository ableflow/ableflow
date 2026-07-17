import "server-only";
import { searchList, fetchService, asArray, text } from "../client";
import { absoluteLawUrl, makeSource, splitRelated, stripHtml } from "../normalize";
import type { LawSourceAdapter, NormalizedLegalSource, SearchListItem, SearchParams } from "../types";

/**
 * 판례 어댑터 — target=prec
 * 공식 확인: docs/api-targets.md §2
 */
export const precAdapter: LawSourceAdapter = {
  type: "prec",
  label: "판례",
  enabled: true,

  async search(params: SearchParams, oc: string): Promise<SearchListItem[]> {
    const json = (await searchList({
      target: "prec",
      oc,
      params: {
        query: params.query,
        display: params.display ?? 20,
        page: params.page ?? 1,
        search: 1,
        sort: params.sort,
      },
    })) as Record<string, unknown>;

    const root = (json.PrecSearch ?? json.precSearch ?? {}) as Record<string, unknown>;
    const items = asArray<Record<string, unknown>>(root.prec);
    return items.map((it) =>
      makeSource("prec", {
        sourceId: text(it["판례일련번호"]),
        title: text(it["사건명"]),
        caseNumber: text(it["사건번호"]),
        agency: text(it["법원명"]),
        decisionDate: text(it["선고일자"]),
        summary: [text(it["사건종류명"]), text(it["판결유형"]), text(it["선고"])]
          .filter(Boolean)
          .join(" · "),
        sourceUrl: absoluteLawUrl(text(it["판례상세링크"])),
      }),
    );
  },

  async fetchDetail(sourceId: string, oc: string): Promise<NormalizedLegalSource | null> {
    const json = (await fetchService({
      target: "prec",
      oc,
      params: { ID: sourceId },
    })) as Record<string, unknown>;

    const root = (json.PrecService ??
      json.precService ??
      json.판례 ??
      {}) as Record<string, unknown>;

    const title = text(root["사건명"]);
    const body = stripHtml(root["판례내용"]);
    if (!title && !body) return null;

    const summary = [stripHtml(root["판시사항"]), stripHtml(root["판결요지"])]
      .filter(Boolean)
      .join("\n\n");

    return makeSource("prec", {
      sourceId: text(root["판례정보일련번호"]) || sourceId,
      title: title || "(사건명 미상)",
      caseNumber: text(root["사건번호"]),
      agency: text(root["법원명"]),
      decisionDate: text(root["선고일자"]),
      summary: summary || undefined,
      originalText: body,
      relatedLaws: [
        ...splitRelated(root["참조조문"]),
        ...splitRelated(root["참조판례"]),
      ],
      sourceUrl: absoluteLawUrl(text(root["판례상세링크"])),
    });
  },
};
