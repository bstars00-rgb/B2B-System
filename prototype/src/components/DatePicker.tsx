import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  /** YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** 이 날짜 이전은 선택 불가 (기본: 오늘 — 실사이트처럼 과거 날짜로 예약 방지) */
  minDate?: string;
  /**
   * 과거 날짜 허용 — **조회 필터용**(Bookings의 예약일·취소일 기간 등)에 사용.
   * 예약 흐름(체크인/아웃)은 기본값(오늘 이후만) 유지.
   */
  allowPast?: boolean;
  /**
   * 값이 증가하면 달력을 자동으로 연다.
   * 외부(베스트셀러 랭킹 → 예약)에서 "이제 날짜만 고르면 된다"로 유도할 때 쓴다.
   */
  openSignal?: number;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parse(v: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}
function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * 실제 포털과 동일한 스타일 날짜 선택기.
 * 트리거(입력 모양 + 달력 아이콘) 클릭 시 월 캘린더 팝업:
 * ‹ MON YYYY › 헤더, 일(빨강)·토(파랑) 요일 색상, 선택일 주황 원.
 */
export default function DatePicker({
  value,
  onChange,
  className,
  placeholder,
  minDate,
  allowPast,
  openSignal,
}: Props) {
  const [open, setOpen] = useState(false);
  const parsed = parse(value);
  const now = new Date();
  const min = allowPast ? '' : (minDate ?? iso(now.getFullYear(), now.getMonth(), now.getDate()));
  const [viewY, setViewY] = useState(parsed?.y ?? 2026);
  const [viewM, setViewM] = useState(parsed?.m ?? 6);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && parsed) {
      setViewY(parsed.y);
      setViewM(parsed.m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** 외부 신호로 열기 — 초기값 0은 무시(마운트 시 저절로 열리면 안 된다) */
  useEffect(() => {
    if (openSignal) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const grid = useMemo(() => {
    const first = new Date(viewY, viewM, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewY, viewM]);

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY((y) => y - 1); }
    else setViewM((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY((y) => y + 1); }
    else setViewM((m) => m + 1);
  };

  return (
    <div ref={ref} className="relative inline-block">
      {/* 트리거 (입력 모양 + 달력 아이콘) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between rounded border border-slate-300 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 focus:border-brand-400 focus:outline-none ${className ?? 'w-32'}`}
      >
        <span className={value ? '' : 'italic text-slate-400'}>{value || placeholder || 'Select date'}</span>
        <span className="ml-2 text-slate-400" aria-hidden>📅</span>
      </button>

      {/* 팝업 */}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[300px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              aria-label="이전 달"
            >
              ‹
            </button>
            <span className="text-[13px] font-bold text-slate-800">
              {MONTHS[viewM]} {viewY}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          {/* 요일 */}
          <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-semibold">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-slate-600'}>
                {w}
              </span>
            ))}
          </div>

          {/* 날짜 */}
          <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-[12px]">
            {grid.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />;
              const dow = i % 7;
              const dateIso = iso(viewY, viewM, d);
              // 실사이트 동일 — 오늘(또는 minDate) 이전 날짜는 흐리게 표시·선택 불가
              const disabled = dateIso < min;
              const selected =
                parsed && parsed.y === viewY && parsed.m === viewM && parsed.d === d;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(dateIso);
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                    disabled
                      ? dow === 0
                        ? 'cursor-default text-rose-200'
                        : dow === 6
                          ? 'cursor-default text-sky-200'
                          : 'cursor-default text-slate-300'
                      : selected
                        ? 'bg-brand-500 font-bold text-white'
                        : dow === 0
                          ? 'text-rose-500 hover:bg-slate-100'
                          : dow === 6
                            ? 'text-sky-500 hover:bg-slate-100'
                            : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
