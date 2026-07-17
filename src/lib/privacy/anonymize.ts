/**
 * 개인정보 익명화 (로컬, 규칙 기반)
 * 이름/전화/이메일/주민등록번호/계좌번호/상세주소/차량번호/사업자등록번호/주문번호/고객번호 등을 탐지·치환한다.
 * 결정적(deterministic) 치환으로 같은 값은 같은 토큰으로 매핑한다.
 */

export interface AnonymizeMatch {
  type: string;
  original: string;
  replacement: string;
}

export interface AnonymizeResult {
  text: string;
  matches: AnonymizeMatch[];
}

interface Rule {
  type: string;
  label: string; // 치환 토큰 접두 (예: 전화)
  regex: RegExp;
}

// 순서 중요: 더 구체적인 패턴을 먼저 적용
const RULES: Rule[] = [
  {
    type: "email",
    label: "이메일",
    regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  {
    type: "rrn",
    label: "주민등록번호",
    regex: /\b\d{6}\s?[-–]\s?[1-4]\d{6}\b/g,
  },
  {
    type: "bizno",
    label: "사업자등록번호",
    regex: /\b\d{3}\s?[-–]\s?\d{2}\s?[-–]\s?\d{5}\b/g,
  },
  {
    type: "phone",
    label: "전화번호",
    regex: /\b(01[016789]|0\d{1,2})\s?[-–]?\s?\d{3,4}\s?[-–]?\s?\d{4}\b/g,
  },
  {
    type: "carno",
    label: "차량번호",
    regex: /\b\d{2,3}\s?[가-힣]\s?\d{4}\b/g,
  },
  {
    type: "account",
    label: "계좌번호",
    regex: /\b\d{2,6}[-–]\d{2,6}[-–]\d{2,7}(?:[-–]\d{1,6})?\b/g,
  },
  {
    type: "orderno",
    label: "주문번호",
    regex: /\b(?:주문(?:번호)?|order)\s*[:#]?\s*([A-Za-z0-9-]{6,})/gi,
  },
  {
    type: "customerno",
    label: "고객번호",
    regex: /\b(?:고객(?:번호)?|customer)\s*[:#]?\s*([A-Za-z0-9-]{4,})/gi,
  },
  {
    type: "address",
    label: "상세주소",
    // "...로/길 12-3" 또는 "...동 101동 1002호" 등 상세 지번/건물
    regex: /([가-힣]+(?:로|길)\s?\d+(?:[-–]\d+)?(?:\s?\d+동)?(?:\s?\d+호)?)/g,
  },
  {
    type: "name",
    label: "이름",
    // "홍길동 님/씨/고객/대표" 또는 성+OO 형태의 한글 2~4자 이름 (문맥 힌트 필요)
    regex: /([가-힣]{2,4})\s?(님|씨|고객님|대표|사장님|과장|부장|팀장)/g,
  },
];

export function anonymize(input: string): AnonymizeResult {
  if (!input) return { text: "", matches: [] };
  let out = input;
  const matches: AnonymizeMatch[] = [];
  const counters: Record<string, number> = {};
  const seen: Record<string, string> = {}; // original -> replacement (동일 값 재사용)

  for (const rule of RULES) {
    out = out.replace(rule.regex, (full, g1?: string) => {
      const original = full;
      if (seen[original]) {
        matches.push({ type: rule.type, original, replacement: seen[original] });
        return seen[original];
      }
      counters[rule.type] = (counters[rule.type] ?? 0) + 1;
      const token = `[${rule.label}${counters[rule.type]}]`;
      // 이름/주문/고객번호 규칙은 캡처그룹만 치환하고 접미(님/씨 등)는 유지
      let replacement = token;
      if (rule.type === "name" && g1) {
        replacement = token; // 접미사는 아래에서 다시 붙임
        seen[original] = `${token}${full.slice(g1.length)}`;
        matches.push({ type: rule.type, original: g1, replacement: token });
        return seen[original];
      }
      seen[original] = replacement;
      matches.push({ type: rule.type, original, replacement });
      return replacement;
    });
  }

  return { text: out, matches };
}
