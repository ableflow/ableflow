/** 자료 유형 코드 (국가법령정보 target 코드 기반) */
export type SourceType = "law" | "prec" | "detc" | "expc" | "decc";

/** 모든 자료 유형을 하나로 정규화한 공통 모델 */
export interface NormalizedLegalSource {
  sourceType: SourceType | string;
  agency: string; // 소관부처 / 법원명
  sourceId: string; // 법령ID / 판례일련번호 (본문 조회용)
  title: string; // 법령명 / 사건명
  caseNumber?: string; // 사건번호
  decisionDate?: string; // 선고일자 / 공포일자
  summary?: string; // 판결요지 / 요지 (원문 요약)
  originalText?: string; // 본문 전체
  relatedLaws?: string[]; // 참조조문 / 관련 법령
  sourceUrl: string; // 원문 상세 링크
}

export interface SearchParams {
  query: string;
  display?: number;
  page?: number;
  sort?: string;
}

/** 검색 목록의 개별 항목 (본문 조회 전) */
export interface SearchListItem extends NormalizedLegalSource {
  /** 목록 단계에서는 originalText 가 비어 있을 수 있음 */
}

/**
 * 자료 유형별 어댑터 인터페이스.
 * 국가법령정보 API 의 자료별 차이를 이 어댑터로 캡슐화한다.
 */
export interface LawSourceAdapter {
  type: SourceType;
  label: string; // 한글 명칭 (판례, 현행법령 ...)
  /** 공식 문서로 검증되어 실제 호출 가능한지 여부 */
  enabled: boolean;
  /** 목록 검색 */
  search(params: SearchParams, oc: string): Promise<SearchListItem[]>;
  /** 본문 조회 (검색 항목의 sourceId 사용) */
  fetchDetail(sourceId: string, oc: string): Promise<NormalizedLegalSource | null>;
}
