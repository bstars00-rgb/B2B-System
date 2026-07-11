interface Props {
  onSuggestion?: (query: string) => void;
}

const SUGGESTIONS = [
  '날짜를 앞뒤로 하루씩 옮겨서 다시 검색',
  '성급 조건을 한 단계 낮춰서 검색 (예: 5성 → 4성)',
  '조식/무료취소 필터를 해제하고 검색',
];

/** NO_RESULTS — 빈 결과를 그대로 안내하고 대안 조건 제안 */
export default function EmptyResult({ onSuggestion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
        🔍
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        조건에 맞는 호텔/요금이 없습니다
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        빈 결과는 그대로 표시합니다 — 임의로 대체 상품을 채우지 않습니다.
      </p>
      <ul className="mt-4 space-y-1 text-left text-xs text-slate-600">
        {SUGGESTIONS.map((s) => (
          <li key={s} className="flex items-start gap-1.5">
            <span className="mt-0.5 text-brand-500">•</span>
            {s}
          </li>
        ))}
      </ul>
      {onSuggestion && (
        <button
          type="button"
          onClick={() => onSuggestion('8월 20일부터 23일까지 도쿄 4성급 성인 2명 호텔 찾아줘')}
          className="mt-5 rounded border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
        >
          예시 조건으로 다시 검색
        </button>
      )}
    </div>
  );
}
