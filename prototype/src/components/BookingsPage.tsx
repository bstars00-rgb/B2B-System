import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import { formatDateTime } from '../utils/format';
import DatePicker from './DatePicker';

interface Props {
  bookings: Booking[];
  onOpenDetail: (booking: Booking) => void;
}

const nf = new Intl.NumberFormat('en-US');

function dlLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 실제 포털 Bookings 화면 재현 — 필터 바 + 예약 목록 그리드.
 * AI 검색 → Create Booking으로 생성한 예약이 이 목록에 쌓인다.
 */
const DATE_FIELDS: Record<string, keyof Booking> = {
  'Booking Date': 'booking_date',
  'Cancel Date': 'cancel_date',
  'Check In Date': 'check_in',
  'Check Out Date': 'check_out',
  'Cancel Deadline': 'client_cancel_dl',
  'Stay Date': 'check_in',
};

const EMPTY = {
  dateType: 'Booking Date', from: '2026-07-01', to: '2026-07-13',
  ellis: '', status: '', payment: 'All',
  bookerType: 'Booker', bookerText: '', country: '', hotel: '', seller: '',
};

export default function BookingsPage({ bookings, onOpenDetail }: Props) {
  const [f, setF] = useState({ ...EMPTY });
  const [applied, setApplied] = useState({ ...EMPTY });
  const set = (patch: Partial<typeof EMPTY>) => setF((p) => ({ ...p, ...patch }));

  const rows = useMemo(
    () =>
      bookings.filter((b) => {
        // 날짜 기간 필터 (선택한 날짜 유형 기준)
        const field = DATE_FIELDS[applied.dateType];
        const dv = (b[field] as string | null) ?? '';
        if (dv) {
          const day = dv.slice(0, 10);
          if (applied.from && day < applied.from) return false;
          if (applied.to && day > applied.to) return false;
        }
        if (applied.ellis && !b.ellis_code.toLowerCase().includes(applied.ellis.toLowerCase())) return false;
        if (applied.status && b.status !== applied.status) return false;
        if (applied.payment !== 'All' && b.payment_status !== applied.payment) return false;
        if (applied.hotel && !b.hotel_name.toLowerCase().includes(applied.hotel.toLowerCase())) return false;
        if (applied.seller && !b.seller_code.toLowerCase().includes(applied.seller.toLowerCase())) return false;
        if (applied.country && !b.region.toLowerCase().includes(applied.country.toLowerCase())) return false;
        if (applied.bookerText && !b.traveler_name.toLowerCase().includes(applied.bookerText.toLowerCase()))
          return false;
        return true;
      }),
    [bookings, applied],
  );

  const input =
    'rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        {/* ── 필터 바 (실제 포털 구성 — 3행) ── */}
        <div className="rounded border border-slate-200 bg-slate-50/50 p-3">
          {/* 1행 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select value={f.dateType} onChange={(e) => set({ dateType: e.target.value })} className={input}>
                {Object.keys(DATE_FIELDS).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <DatePicker value={f.from} onChange={(v) => set({ from: v })} className="w-32" />
              <span className="text-slate-400">~</span>
              <DatePicker value={f.to} onChange={(v) => set({ to: v })} className="w-32" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">ELLIS BKG Co...</span>
              <input value={f.ellis} onChange={(e) => set({ ellis: e.target.value })} className={`${input} w-36`} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">BKG Status</span>
              <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={`${input} w-32`}>
                <option value="">Select</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setApplied({ ...f })}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => { setF({ ...EMPTY }); setApplied({ ...EMPTY }); }}
                className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
          {/* 2행 */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">Payment Status</span>
              <select value={f.payment} onChange={(e) => set({ payment: e.target.value })} className={`${input} w-40`}>
                {['All', 'Unpaid', 'Partially Paid', 'Fully Paid', 'Refunded', 'Partially Refunded'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <select value={f.bookerType} onChange={(e) => set({ bookerType: e.target.value })} className={input}>
                {['Booker', 'Traveler', 'Mobile No.'].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <input value={f.bookerText} onChange={(e) => set({ bookerText: e.target.value })} className={`${input} w-52`} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">Country</span>
              <input value={f.country} onChange={(e) => set({ country: e.target.value })} placeholder="Name" className={`${input} w-40 placeholder:italic placeholder:text-slate-400`} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">Hotel Name</span>
              <input value={f.hotel} onChange={(e) => set({ hotel: e.target.value })} className={`${input} w-44`} />
            </div>
          </div>
          {/* 3행 */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">Seller BKG Co...</span>
              <input value={f.seller} onChange={(e) => set({ seller: e.target.value })} className={`${input} w-44`} />
            </div>
          </div>
        </div>

        {/* ── 카운트 + 우측 버튼 ── */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-brand-500">{rows.length}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="cursor-not-allowed rounded border border-slate-300 px-3 py-1 text-xs text-slate-500"
              title="프로토타입 — Excel 다운로드 (더미)"
            >
              Excel
            </button>
            <select className={input} disabled>
              <option>20</option>
            </select>
          </div>
        </div>

        {/* ── 예약 목록 그리드 (고정 높이 · 헤더 고정 — 실사이트 Kendo 그리드 동일) ── */}
        <div className="mt-2 max-h-[440px] overflow-auto rounded border border-slate-200">
          <table className="w-full min-w-[1500px] text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
                <th className="w-8 px-2 py-2.5">
                  <input type="checkbox" disabled />
                </th>
                <th className="px-3 py-2.5 font-semibold">Booking Date</th>
                <th className="px-3 py-2.5 font-semibold">ELLIS Booking Code</th>
                <th className="px-3 py-2.5 font-semibold">Seller Booking Code</th>
                <th className="px-3 py-2.5 font-semibold">Booking Status</th>
                <th className="px-3 py-2.5 font-semibold">Payment Status</th>
                <th className="px-3 py-2.5 font-semibold">Hotel Name</th>
                <th className="px-3 py-2.5 font-semibold">Client Cancel DL</th>
                <th className="px-3 py-2.5 font-semibold">Check-in Date / Nts</th>
                <th className="px-3 py-2.5 font-semibold">Room Type / Count</th>
                <th className="px-3 py-2.5 font-semibold">1st Traveler Name</th>
                <th className="px-3 py-2.5 font-semibold">B.Currency</th>
                <th className="px-3 py-2.5 font-semibold">B.Sum Amt</th>
                <th className="px-3 py-2.5 font-semibold">BKG Cancel Date</th>
                <th className="px-3 py-2.5 font-semibold">Invoice No.</th>
                <th className="px-3 py-2.5 font-semibold">Dispute</th>
                <th className="px-3 py-2.5 font-semibold">Dispute Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-3 py-14 text-center text-slate-400">
                    No records available.
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.ellis_code} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="px-2 py-2.5 text-center">
                      <input type="checkbox" disabled />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {formatDateTime(b.booking_date)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(b)}
                        className="font-medium text-slate-700 underline underline-offset-2 hover:text-brand-600"
                        title="예약 상세 열기"
                      >
                        {b.ellis_code}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{b.seller_code}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={b.status === 'Cancelled' ? 'text-rose-600' : 'text-slate-700'}>
                        {b.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {b.payment_status}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{b.hotel_name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {dlLabel(b.client_cancel_dl)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {b.check_in}[{b.nights}]
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {b.room_type}[{b.room_count}]
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {b.traveler_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-slate-600">
                      {b.currency}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-700">
                      {nf.format(b.sum_amt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {b.cancel_date ? formatDateTime(b.cancel_date) : ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-slate-600">
                      {b.invoice_no ?? ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-slate-600">
                      {b.dispute ?? ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {b.dispute_remark ?? ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── 페이저 ── */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {['|<', '<', '1', '>', '>|'].map((p) => (
              <span
                key={p}
                className={`flex h-6 min-w-6 items-center justify-center rounded px-1 ${
                  p === '1' ? 'bg-brand-100 font-bold text-brand-600' : 'text-slate-400'
                }`}
              >
                {p}
              </span>
            ))}
          </div>
          <span>
            {rows.length === 0 ? '0 - 0 of 0 items' : `1 - ${rows.length} of ${rows.length} items`}
          </span>
        </div>

        {bookings.length === 0 && (
          <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
            아직 생성된 예약이 없습니다 — AI 요금 검색 탭에서 호텔 검색 → 요금 상세 → 룸타입 선택 →
            Create Booking으로 예약을 만들면 이 목록에 표시됩니다. (Mock — 세션 내에만 저장)
          </p>
        )}
      </div>
    </div>
  );
}
