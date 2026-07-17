export const DISCLAIMER_TEXT =
  "이 도구는 관련 법령·판례·행정사례를 검색하고 비교하기 위한 조사 보조 도구입니다. 법률 자문이나 합법·불법에 대한 확정적 판단을 제공하지 않으며, 실제 판단은 구체적인 사실관계와 최신 법령에 따라 달라질 수 있습니다.";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 ${className}`}
    >
      ⚠️ {DISCLAIMER_TEXT}
    </div>
  );
}
