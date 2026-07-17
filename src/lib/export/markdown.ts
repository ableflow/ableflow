import type { ResearchAggregate } from "@/lib/research-repo";
import { parseArr } from "@/lib/research-repo";

const SOURCE_LABEL: Record<string, string> = {
  law: "현행법령",
  prec: "판례",
  detc: "헌재결정례",
  expc: "법령해석례",
  decc: "행정심판례",
};

export const DISCLAIMER =
  "이 도구는 관련 법령·판례·행정사례를 검색하고 비교하기 위한 조사 보조 도구입니다. 법률 자문이나 합법·불법에 대한 확정적 판단을 제공하지 않으며, 실제 판단은 구체적인 사실관계와 최신 법령에 따라 달라질 수 있습니다.";

function list(title: string, items: string[]): string {
  if (!items.length) return "";
  return `\n### ${title}\n${items.map((i) => `- ${i}`).join("\n")}\n`;
}

export function toMarkdown(agg: ResearchAggregate): string {
  const { research: r, issue, sources, report } = agg;
  const parts: string[] = [];

  parts.push(`# ${r.title}\n`);
  parts.push(`> 분야: ${r.field || "미지정"} · 생성일: ${new Date(r.createdAt).toLocaleString("ko-KR")}\n`);

  parts.push(`## 질문 요약\n${report?.questionSummary || r.question}\n`);
  parts.push(`## 사실관계\n${r.factsAnonymized || r.facts}\n`);

  if (issue) {
    parts.push(`## 쟁점 분석`);
    parts.push(list("확인된 사실", parseArr(issue.confirmedFacts)));
    parts.push(list("불명확한 사실", parseArr(issue.unclearFacts)));
    parts.push(list("주요 법률 쟁점", parseArr(issue.keyIssues)));
    parts.push(list("관련 기관", parseArr(issue.agencies)));
  }

  parts.push(`\n## 검색된 자료 (${sources.length}건)`);
  sources.forEach((s, i) => {
    parts.push(`\n### ${i + 1}. [${SOURCE_LABEL[s.sourceType] ?? s.sourceType}] ${s.title}`);
    const meta = [
      s.caseNumber && `사건번호: ${s.caseNumber}`,
      s.agency && `기관/법원: ${s.agency}`,
      s.decisionDate && `일자: ${s.decisionDate}`,
      `검색 관련도: ${s.relevanceScore}`,
    ]
      .filter(Boolean)
      .join(" · ");
    parts.push(meta);
    if (s.summary) parts.push(`\n**[원문 요지]**\n${s.summary}`);
    parts.push(list("내 질문과 같은 점", parseArr(s.aiSimilarities)));
    parts.push(list("내 질문과 다른 점", parseArr(s.aiDifferences)));
    if (s.sourceUrl) parts.push(`\n원문 출처: ${s.sourceUrl}`);
  });

  if (report) {
    parts.push(`\n## 종합 검토 (AI 요약)`);
    if (report.overallReview) parts.push(`\n${report.overallReview}`);
    parts.push(list("유리하게 볼 수 있는 근거", parseArr(report.favorablePoints)));
    parts.push(list("불리하게 볼 수 있는 근거", parseArr(report.unfavorablePoints)));
    parts.push(list("추가 확인이 필요한 내용", parseArr(report.additionalChecks)));
    parts.push(list("전문가에게 확인할 질문", parseArr(report.expertQuestions)));
  }

  parts.push(`\n---\n> ⚠️ ${DISCLAIMER}\n`);
  return parts.filter((p) => p !== "").join("\n");
}
