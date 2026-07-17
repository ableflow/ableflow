import "server-only";
import { XMLParser } from "fast-xml-parser";

const BASE_SEARCH = "https://www.law.go.kr/DRF/lawSearch.do";
const BASE_SERVICE = "https://www.law.go.kr/DRF/lawService.do";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
});

export class LawApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "LawApiError";
  }
}

interface RequestOptions {
  target: string;
  oc: string;
  params?: Record<string, string | number | undefined>;
  timeoutMs?: number;
  retries?: number;
}

async function request(base: string, opts: RequestOptions): Promise<unknown> {
  const { target, oc, params = {}, timeoutMs = 15000, retries = 2 } = opts;
  if (!oc) throw new LawApiError("국가법령정보 API 인증값(OC)이 설정되지 않았습니다. 설정 화면에서 입력하세요.");

  const url = new URL(base);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", target);
  url.searchParams.set("type", "XML");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/xml, text/xml, */*" },
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new LawApiError(`국가법령정보 API 오류 (HTTP ${res.status})`, res.status);
      }
      const text = await res.text();
      // 인증 실패 등은 HTML 로 반환되는 경우가 있음
      if (text.trimStart().startsWith("<!DOCTYPE") || text.includes("<html")) {
        throw new LawApiError(
          "국가법령정보 API 가 예상치 못한 응답(HTML)을 반환했습니다. OC 인증값 또는 파라미터를 확인하세요.",
        );
      }
      return parser.parse(text);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (err instanceof LawApiError && err.status && err.status < 500) break;
      // 네트워크/타임아웃은 재시도
      if (attempt < retries) await sleep(400 * (attempt + 1));
    }
  }
  if (lastErr instanceof LawApiError) throw lastErr;
  throw new LawApiError(
    `국가법령정보 API 호출에 실패했습니다: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

export function searchList(opts: RequestOptions) {
  return request(BASE_SEARCH, opts);
}

export function fetchService(opts: RequestOptions) {
  return request(BASE_SERVICE, opts);
}

/** XML 파싱 결과에서 배열을 안전하게 추출 (단건이면 배열로 감싼다) */
export function asArray<T = unknown>(v: unknown): T[] {
  if (v === undefined || v === null) return [];
  return (Array.isArray(v) ? v : [v]) as T[];
}

/** 값이 객체이며 #text 를 가진 경우 텍스트만 뽑는다 */
export function text(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
