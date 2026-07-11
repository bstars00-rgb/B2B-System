import type { Availability, CancellationType } from '../types';

type BadgeVariant =
  | Availability
  | CancellationType
  | 'bookable'
  | 'reference'
  | 'stale'
  | 'partial';

interface Props {
  variant: BadgeVariant;
  className?: string;
}

const CONFIG: Record<BadgeVariant, { label: string; cls: string }> = {
  available: { label: '예약 가능', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  on_request: { label: '온리퀘스트', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  unavailable: { label: '재고 없음', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  free_cancellation: { label: '무료취소', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  non_refundable: { label: '환불불가', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  partial_penalty: { label: '부분위약금', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  bookable: { label: '예약 가능 요금', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
  reference: { label: '참고용 요금', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  stale: { label: 'STALE', cls: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  partial: { label: '부분 결과', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
};

/** 가용성/취소유형/요금상태 공통 배지 */
export default function SearchStatusBadge({ variant, className }: Props) {
  const c = CONFIG[variant];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none ${c.cls} ${className ?? ''}`}
    >
      {c.label}
    </span>
  );
}
