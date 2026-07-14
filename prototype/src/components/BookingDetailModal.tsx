import { useState, type ReactNode } from 'react';
import type { Booking, TravelerDetail } from '../types';
import InvoiceModal from './InvoiceModal';
import PaymentGatewayModal from './PaymentGatewayModal';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  /** Cancel 확정 시 호출 — 예약 상태를 Cancelled로 변경 */
  onCancelBooking: (ellisCode: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function dateWithWeekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${iso}(${WEEKDAYS[d.getDay()]})`;
}

/** "MM.DD(weekday) HH:mm" (Cancellation Policy 제목용) */
function shortDl(isoDt: string): string {
  const [date, time] = isoDt.split('T');
  const d = new Date(`${date}T00:00:00`);
  const [, mm, dd] = date.split('-');
  return `${mm}.${dd}(${WEEKDAYS[d.getDay()]}) ${(time ?? '00:00').slice(0, 5)}`;
}

const fmtDt = (isoDt: string) => `${isoDt.slice(0, 10)} ${isoDt.slice(11, 19) || '00:00:00'}`;

function addMinute(isoDt: string): string {
  const d = new Date(isoDt);
  d.setMinutes(d.getMinutes() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/** 투숙객 상세 — 명시값이 없으면 1st traveler + 인원수로 생성 */
function travelersOf(b: Booking): TravelerDetail[] {
  if (b.travelers_detail && b.travelers_detail.length) return b.travelers_detail;
  const list: TravelerDetail[] = [];
  const perRoom = Math.ceil(b.travelers / Math.max(1, b.room_count));
  for (let i = 0; i < b.travelers; i += 1) {
    const room = Math.floor(i / perRoom) + 1;
    if (i === 0) {
      list.push({ room, gender: 'M', local: b.traveler_name, lastEn: b.traveler_name.toUpperCase(), firstEn: 'GUEST' });
    } else {
      list.push({ room, gender: 'M', local: 'TBA', lastEn: 'TBA', firstEn: `TB${String.fromCharCode(65 + i)}` });
    }
  }
  return list;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex border-b border-slate-100 text-[13px] last:border-b-0">
      <div className="w-[210px] shrink-0 bg-slate-50 px-4 py-2.5 font-medium text-slate-600">
        {label}
      </div>
      <div className="flex-1 px-4 py-2.5 text-slate-800">{value}</div>
    </div>
  );
}

const nf = new Intl.NumberFormat('en-US');

/**
 * 실제 포털 예약 상세 모달 재현 — OMH Reservation number + Booker + Reservation details.
 * Cancel 버튼으로 예약 취소(상태 변경)까지 동작한다.
 */
export default function BookingDetailModal({ booking, onClose, onCancelBooking }: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  if (!booking) return null;

  const cancelled = booking.status === 'Cancelled';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50"
      />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* 다크 헤더 */}
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">{booking.ellis_code}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white"
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          {/* OMH Reservation number */}
          <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-800">
            OMH Reservation number : {booking.ellis_code}
          </div>

          {/* Booker */}
          <section className="mt-4 rounded border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
              <h4 className="text-[13px] font-bold text-slate-800">Booker</h4>
              <button
                type="button"
                className="cursor-not-allowed rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-500"
                title="프로토타입 — Booker 저장 (더미)"
              >
                Save
              </button>
            </div>
            <Row
              label="Name"
              value={
                <input
                  disabled
                  value="ATTIC TOURS"
                  className="w-full rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[13px] text-slate-500"
                />
              }
            />
            <Row
              label="Email"
              value={
                <input
                  defaultValue="tyosales@attic-tours.com"
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px]"
                />
              }
            />
            <Row
              label="Tel"
              value={
                <div className="flex gap-2">
                  <input defaultValue="+81" className="w-20 rounded border border-slate-300 px-2.5 py-1.5 text-[13px]" />
                  <input defaultValue="9080863551" className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-[13px]" />
                </div>
              }
            />
            <Row
              label="Seller Booking Code"
              value={
                <input
                  disabled
                  value={booking.seller_code}
                  className="w-full rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[13px] text-slate-500"
                />
              }
            />
          </section>

          {/* Reservation details */}
          <section className="mt-4 rounded border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
              <h4 className="text-[13px] font-bold text-slate-800">Resveration details</h4>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={cancelled}
                  onClick={() => setConfirmingCancel(true)}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-600"
                  title="바우처 (프로토타입 — 인보이스와 동일 뷰)"
                >
                  Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-600"
                >
                  Invoice
                </button>
              </div>
            </div>

            {confirmingCancel && !cancelled && (
              <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] text-rose-700">
                <span>
                  이 예약을 취소하시겠습니까? 취소 마감({booking.client_cancel_dl ? '무료취소 가능' : '환불불가 요금'})
                  정책에 따라 위약금이 발생할 수 있습니다.
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onCancelBooking(booking.ellis_code);
                      setConfirmingCancel(false);
                    }}
                    className="rounded bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700"
                  >
                    취소 확정
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-600"
                  >
                    닫기
                  </button>
                </span>
              </div>
            )}

            <Row
              label="Booking Status / Payment Status"
              value={
                <b className={cancelled ? 'text-rose-600' : 'text-slate-800'}>
                  {booking.status} / {booking.payment_status}
                </b>
              }
            />
            <Row
              label="Check in / Out Date"
              value={`${dateWithWeekday(booking.check_in)} ~ ${dateWithWeekday(booking.check_out)} [ ${booking.nights}NTS ]`}
            />
            <Row label="Region name" value={booking.region} />
            <Row label="Hotel Name" value={booking.hotel_name} />
            <Row label="Rooms / Travelers" value={`${booking.room_count} Rooms / ${booking.travelers} Travelers`} />
            <Row label="Room Type" value={booking.room_type} />
            <Row label="1st Traveler Name" value={booking.traveler_name} />
            <Row
              label="Client Cancellation D/L"
              value={
                booking.client_cancel_dl ? (
                  <span className="text-rose-600">{booking.client_cancel_dl.slice(0, 16).replace('T', ' ')} Free cancellation available</span>
                ) : (
                  <span className="font-semibold text-rose-600">Non-refundable</span>
                )
              }
            />
            <Row
              label="Billing Sum"
              value={
                <b>
                  {booking.currency} {nf.format(booking.sum_amt)}
                </b>
              }
            />
            {booking.cancel_date && (
              <Row
                label="BKG Cancel Date"
                value={<span className="text-rose-600">{booking.cancel_date.slice(0, 16).replace('T', ' ')}</span>}
              />
            )}
          </section>

          {/* Travelers */}
          <section className="mt-4 rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Travelers
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 font-medium">Rooms</th>
                    <th className="px-3 py-2 font-medium">Gender</th>
                    <th className="px-3 py-2 font-medium">Name(Local Language)</th>
                    <th className="px-3 py-2 font-medium">Last Name / First Name (EN)</th>
                    <th className="px-3 py-2 font-medium">Child Birthday</th>
                    <th className="px-3 py-2 font-medium">Child Age</th>
                  </tr>
                </thead>
                <tbody>
                  {travelersOf(booking).map((t, i, arr) => {
                    const firstOfRoom = arr.findIndex((x) => x.room === t.room) === i;
                    const roomSpan = arr.filter((x) => x.room === t.room).length;
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-b-0">
                        {firstOfRoom ? (
                          <td rowSpan={roomSpan} className="border-r border-slate-100 px-3 py-2 text-center align-middle text-amber-700">
                            Rooms {t.room}
                          </td>
                        ) : null}
                        <td className="px-3 py-2 text-center text-sky-600">{t.gender}</td>
                        <td className="px-3 py-2 text-sky-700">{t.local}</td>
                        <td className="px-3 py-2 text-amber-700">
                          {t.lastEn} / {t.firstEn}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-400">{t.childBirthday ?? ''}</td>
                        <td className="px-3 py-2 text-center text-slate-400">{t.childAge ?? ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Special Request */}
          <section className="mt-4 rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Special Request
            </h4>
            <div className="px-4 py-3">
              <div className="flex flex-wrap gap-4 text-[13px] text-slate-700">
                {(
                  [
                    ['non-smoking room', booking.special_request?.nonSmoking],
                    ['smoking room', booking.special_request?.smoking],
                    ['High Floor', booking.special_request?.highFloor],
                    ['Baby Cot', booking.special_request?.babyCot],
                    ['Late Check In', booking.special_request?.lateCheckIn],
                  ] as [string, boolean | undefined][]
                )
                  .filter(([, v]) => v)
                  .map(([label]) => (
                    <label key={label} className="inline-flex items-center gap-1.5">
                      <input type="checkbox" checked readOnly className="accent-brand-500" /> {label}
                    </label>
                  ))}
                {!booking.special_request ||
                Object.values(booking.special_request).every((v) => !v) ? (
                  <span className="text-[12px] text-slate-400">요청 사항 없음</span>
                ) : null}
              </div>
              <textarea
                readOnly
                value={booking.special_request?.text ?? ''}
                placeholder="Client special requests (in English)"
                rows={3}
                className="mt-3 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600 placeholder:italic placeholder:text-slate-400"
              />
            </div>
          </section>

          {/* Billing & Payment */}
          <section className="mt-4 rounded border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
              <h4 className="text-[13px] font-bold text-slate-800">Billing &amp; Payment</h4>
              <button
                type="button"
                onClick={() => setShowPayment(true)}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-600"
              >
                Credit card
              </button>
            </div>
            <Row label="Billing total" value={<b>{booking.currency} {nf.format(booking.sum_amt)}</b>} />
            <Row
              label="Balance"
              value={
                <b className={booking.payment_status === 'Fully Paid' ? 'text-emerald-600' : ''}>
                  {booking.currency}{' '}
                  {nf.format(booking.payment_status === 'Fully Paid' ? 0 : booking.sum_amt)}
                </b>
              }
            />
          </section>

          {/* Cancellation Policy */}
          <section className="mt-4 rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Cancellation Policy
            </h4>
            <div className="px-4 py-3 text-[13px] leading-relaxed">
              {booking.client_cancel_dl ? (
                <>
                  <p className="font-bold text-slate-800">
                    Cancellation D/L : Untill {shortDl(booking.client_cancel_dl)}
                  </p>
                  <p className="mt-2 text-slate-700">
                    - {fmtDt(booking.booking_date)} ~ {fmtDt(booking.client_cancel_dl)} Charge 0
                  </p>
                  <p className="text-slate-700">
                    - {fmtDt(addMinute(booking.client_cancel_dl))} ~ {booking.check_in} 23:59:00 Charge{' '}
                    {nf.format(booking.sum_amt)}
                  </p>
                  <p className="text-slate-700">- After check-in date, full charge will be applied</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-rose-600">Non-refundable</p>
                  <p className="mt-1 text-slate-700">
                    - 본 요금제는 예약 확정 즉시 환불이 불가합니다. 노쇼 시 총액의 100%가 부과됩니다.
                  </p>
                </>
              )}
            </div>
          </section>

          <p className="mt-3 text-[10px] text-slate-400">
            Mock 예약 — 이 세션에만 저장되며 실제 예약이 아닙니다. 운영 환경에서는 ELLIS 예약
            시스템과 연동됩니다.
          </p>
        </div>
      </div>

      {/* Invoice 모달 (Invoice / Voucher 버튼) */}
      {showInvoice && <InvoiceModal booking={booking} onClose={() => setShowInvoice(false)} />}

      {/* 결제 게이트웨이 (Credit card 버튼) */}
      {showPayment && (
        <PaymentGatewayModal
          amountLabel={`${booking.currency} ${nf.format(booking.sum_amt)}`}
          productName={booking.hotel_name}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
