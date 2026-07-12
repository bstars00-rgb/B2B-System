import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import { formatDateTime } from '../utils/format';

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
export default function BookingsPage({ bookings, onOpenDetail }: Props) {
  const [fEllis, setFEllis] = useState('');
  const [fHotel, setFHotel] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [applied, setApplied] = useState({ ellis: '', hotel: '', status: '' });

  const rows = useMemo(
    () =>
      bookings.filter((b) => {
        if (applied.ellis && !b.ellis_code.toLowerCase().includes(applied.ellis.toLowerCase()))
          return false;
        if (applied.hotel && !b.hotel_name.toLowerCase().includes(applied.hotel.toLowerCase()))
          return false;
        if (applied.status && b.status !== applied.status) return false;
        return true;
      }),
    [bookings, applied],
  );

  const input =
    'rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        {/* ── 필터 바 (실제 포털 구성) ── */}
        <div className="rounded border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select className={input} disabled title="프로토타입 — 날짜 필터 (더미)">
                <option>Booking Date</option>
              </select>
              <input className={`${input} w-28`} defaultValue="2026-07-01" />
              <span className="text-slate-400">~</span>
              <input className={`${input} w-28`} defaultValue="2026-07-12" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">ELLIS BKG Co...</span>
              <input
                className={`${input} w-36`}
                value={fEllis}
                onChange={(e) => setFEllis(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">BKG Status</span>
              <select
                className={`${input} w-28`}
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600">Hotel Name</span>
              <input
                className={`${input} w-40`}
                value={fHotel}
                onChange={(e) => setFHotel(e.target.value)}
              />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setApplied({ ellis: fEllis, hotel: fHotel, status: fStatus })}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setFEllis('');
                  setFHotel('');
                  setFStatus('');
                  setApplied({ ellis: '', hotel: '', status: '' });
                }}
                className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
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

        {/* ── 예약 목록 그리드 ── */}
        <div className="mt-2 overflow-x-auto rounded border border-slate-200">
          <table className="w-full min-w-[1500px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-3 py-14 text-center text-slate-400">
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
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5" />
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
