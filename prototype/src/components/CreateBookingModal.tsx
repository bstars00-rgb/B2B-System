import { useState, type ReactNode } from 'react';
import type { RateResult, SearchConditions } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

interface Props {
  rate: RateResult | null;
  conditions: SearchConditions | null;
  onClose: () => void;
}

/** 실제 포털 모달과 동일한 행 레이아웃 (좌 라벨 회색 / 우 값) */
function Row({ label, value, valueClass }: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex border-b border-slate-100 text-[13px] last:border-b-0">
      <div className="w-[190px] shrink-0 bg-slate-50 px-4 py-2.5 font-medium text-slate-600">
        {label}
      </div>
      <div className={`flex-1 px-4 py-2.5 text-slate-800 ${valueClass ?? ''}`}>{value}</div>
    </div>
  );
}

/**
 * 기존 Ohmy Partners "Create Hotel Booking" 모달 재현 (프로토타입).
 * AI 검색에서 선택한 요금·검색 조건이 그대로 전달되어 채워진 상태를 보여준다.
 * 실제 예약 생성은 실행되지 않는다 (MVP: 조회 전용).
 */
export default function CreateBookingModal({ rate, conditions, onClose }: Props) {
  const [createNotice, setCreateNotice] = useState(false);
  if (!rate) return null;

  const nights = rate.total_nights;
  const rooms = conditions?.rooms ?? rate.total_rooms;
  const travelers = (conditions?.adults ?? 2) + (conditions?.children ?? 0);
  const travelerRows = Math.min(travelers, 4);
  const checkIn = conditions?.check_in ?? '2026-08-20';
  const checkOut = conditions?.check_out ?? '2026-08-22';
  const total = rate.selling_price + rate.tax;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50"
      />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* 다크 헤더 (실제 포털과 동일) */}
        <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
          <h3 className="text-sm font-bold text-white">Create Hotel Booking</h3>
          <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            AI 검색에서 조건 전달됨
          </span>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5">
          {/* Booker */}
          <section className="rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Booker
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <Row
                label={<span>Name <b className="text-rose-500">*</b></span>}
                value={<input disabled value="ATTIC TOURS" className="w-full rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[13px] text-slate-500" />}
              />
              <Row
                label={<span>Email address <b className="text-rose-500">*</b></span>}
                value={<input disabled value="tyosales@attic-tours.com" className="w-full rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[13px] text-slate-500" />}
              />
              <Row
                label="Mobile No"
                value={
                  <div className="flex gap-2">
                    <input defaultValue="81" className="w-16 rounded border border-slate-300 px-2.5 py-1.5 text-[13px]" />
                    <input defaultValue="9080863551" className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-[13px]" />
                  </div>
                }
              />
              <Row
                label="Seller Booking Code"
                value={<input placeholder="Seller Booking Code" className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-[13px] placeholder:italic placeholder:text-slate-400" />}
              />
            </div>
          </section>

          {/* Booking Detail — AI 검색 조건·선택 요금 자동 입력 */}
          <section className="mt-4 rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Booking Detail
            </h4>
            <Row label="Check in / Out Date" value={`${checkIn} ~ ${checkOut} [${nights}NTS]`} />
            <Row label="Region name" value={rate.destination} />
            <Row label="Hotel Name" value={`[${rate.hotel_id}] ${rate.hotel_name}`} />
            <Row label="Rooms/Travelers" value={`${rooms} Rooms / ${travelers} Travelers`} />
            <Row label="Room Type" value={rate.room_type_name} />
            <Row label="Meal Type" value={rate.meal_plan} />
            <Row
              label="Client Cancellation D/L"
              value={
                rate.cancellation_deadline
                  ? `${formatDateTime(rate.cancellation_deadline)} Free cancellation available`
                  : 'Non-refundable'
              }
              valueClass={rate.cancellation_deadline ? 'text-rose-600' : 'font-semibold text-rose-600'}
            />
            <Row label="Plan Name" value={`[${rate.rate_plan_id}] ${rate.rate_plan_name}`} />
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
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: travelerRows }, (_, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-center text-slate-600">Room 1</td>
                      <td className="px-3 py-2">
                        <label className="mr-2 inline-flex items-center gap-1">
                          <input type="radio" name={`gender-${i}`} defaultChecked className="accent-brand-500" /> M
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input type="radio" name={`gender-${i}`} className="accent-brand-500" /> F
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <input placeholder="Name(Local Language)" className="w-full rounded border border-slate-300 px-2 py-1.5 placeholder:italic placeholder:text-slate-400" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input placeholder="Please enter only uppercase..." className="w-1/2 rounded border border-slate-300 px-2 py-1.5 placeholder:italic placeholder:text-slate-400" />
                          <span className="text-slate-400">/</span>
                          <input placeholder="Please enter only uppercase letters." className="w-1/2 rounded border border-slate-300 px-2 py-1.5 placeholder:italic placeholder:text-slate-400" />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-slate-300">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Special Request */}
          <section className="mt-4 rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Special Request
            </h4>
            <div className="grid grid-cols-1 gap-2 px-4 py-3 text-[13px] text-slate-700 md:grid-cols-2">
              {['non-smoking room', 'smoking room', 'High floor room', 'Baby Cot(The property may charge a fee for this request)', 'Late Check In'].map((label) => (
                <label key={label} className="inline-flex items-center gap-2">
                  <input type="checkbox" className="accent-brand-500" /> {label}
                </label>
              ))}
              <select className="w-52 rounded border border-slate-300 px-2 py-1.5 text-[13px] text-slate-500">
                <option>Expected Check In Time</option>
                <option>15:00 ~ 18:00</option>
                <option>18:00 ~ 21:00</option>
                <option>21:00 이후</option>
              </select>
            </div>
            <div className="px-4 pb-4">
              <textarea
                placeholder="Client special request (in English)"
                rows={3}
                className="w-full rounded border border-slate-300 px-3 py-2 text-[13px] placeholder:italic placeholder:text-slate-400"
              />
            </div>
          </section>

          {/* Billing Rate */}
          <section className="mt-4 rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Billing Rate
            </h4>
            <div className="px-4 py-3 text-right">
              <span className="text-sm font-bold text-rose-600 underline decoration-rose-300 underline-offset-4">
                {rate.currency} {formatMoney(total, rate.currency).replace(/^[^\d]*/, '')}
              </span>
            </div>
          </section>

          {/* Notice */}
          <section className="mt-4 rounded border border-slate-200">
            <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-800">
              Notice
            </h4>
            <div className="px-4 py-3 text-[12px] leading-relaxed text-slate-600">
              <p className="font-bold text-slate-800">Things to know</p>
              <p>Early check-in / late check-out is available for a fee (subject to availability).</p>
              <p>The above list may not be comprehensive. Fees and deposits may not include tax and are subject to change.</p>
              <p className="mt-2 font-bold text-slate-800">Policies</p>
              <p className="whitespace-pre-wrap">{rate.cancellation_policy_text.split('\n').slice(1, 3).join(' ')}</p>
            </div>
          </section>

          {/* 프로토타입 안내 */}
          {createNotice && (
            <div className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
              ⚠ 프로토타입입니다 — 실제 예약은 생성되지 않습니다. 운영 환경에서는 이 버튼이 기존
              포털의 예약 생성 로직(ELLIS)으로 연결됩니다. AI 검색(MVP)은 조회 전용이며, 예약
              생성은 이 기존 Create Booking 플로우가 담당합니다.
            </div>
          )}

          {/* 버튼 */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateNotice(true)}
              className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
