import type { SearchConditions } from '../types';
import { formatMoney } from '../utils/format';

interface Props {
  conditions: SearchConditions | null;
}

interface Chip {
  key: string;
  label: string;
  value: string;
  tone?: 'brand' | 'default';
}

function buildChips(c: SearchConditions): Chip[] {
  const chips: Chip[] = [];
  if (c.destination) chips.push({ key: 'dest', label: '목적지', value: c.destination, tone: 'brand' });
  if (c.check_in && c.check_out) {
    chips.push({
      key: 'dates',
      label: '일정',
      value: `${c.check_in} ~ ${c.check_out}${c.nights ? ` (${c.nights}박)` : ''}`,
    });
  } else if (c.nights) {
    chips.push({ key: 'nights', label: '숙박', value: `${c.nights}박` });
  }
  if (c.adults !== null || c.children !== null) {
    const parts: string[] = [];
    if (c.adults !== null) parts.push(`성인 ${c.adults}`);
    if (c.children !== null) parts.push(`아동 ${c.children}`);
    chips.push({ key: 'pax', label: '인원', value: parts.join(' · ') });
  }
  if (c.rooms !== null) chips.push({ key: 'rooms', label: '객실', value: `${c.rooms}실` });
  if (c.star_rating !== null) chips.push({ key: 'star', label: '성급', value: `${c.star_rating}성급` });
  if (c.breakfast_included !== null)
    chips.push({ key: 'meal', label: '조식', value: c.breakfast_included ? '포함' : '불포함' });
  if (c.free_cancellation_only !== null)
    chips.push({
      key: 'cancel',
      label: '취소',
      value: c.free_cancellation_only ? '무료취소만' : '환불불가 허용',
    });
  if (c.budget_max !== null)
    chips.push({
      key: 'budget',
      label: '예산',
      value: `${formatMoney(c.budget_max, c.budget_currency)} 이하`,
    });
  return chips;
}

/** 자연어에서 자동 추출된 검색 조건을 칩으로 표시 */
export default function SearchConditionPanel({ conditions }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          추출된 검색 조건
        </h3>
        {conditions && (
          <span className="max-w-[45%] truncate text-[11px] text-slate-400" title={conditions.raw_query}>
            “{conditions.raw_query}”
          </span>
        )}
      </div>

      {!conditions ? (
        <p className="mt-2 text-xs text-slate-400">
          아직 검색 전입니다. 좌측 채팅에 자연어로 질문하면 조건이 자동 추출됩니다.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {buildChips(conditions).map((chip) => (
            <span
              key={chip.key}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                chip.tone === 'brand'
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase text-slate-400">{chip.label}</span>
              <span className="font-medium">{chip.value}</span>
            </span>
          ))}
          {buildChips(conditions).length === 0 && (
            <span className="text-xs text-slate-400">
              인식된 조건 없음 — 날짜/목적지/인원을 포함해 다시 질문해 보세요.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
