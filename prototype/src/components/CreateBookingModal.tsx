import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { RateResult, SearchConditions } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import { cfgFromConditions } from '../utils/roomConfig';
import EnhBadge from './EnhBadge';

interface Props {
  /** 룸별 요금 — 단일 객실이면 1개, 분리 예약이면 룸 수만큼 (룸마다 다른 상품 가능) */
  rates: RateResult[] | null;
  conditions: SearchConditions | null;
  onClose: () => void;
  /** Create 클릭 — 예약 생성 (1번 투숙객 이름 전달, 미입력 시 'GUEST') */
  onCreate: (travelerName: string) => void;
}

/** 실제 포털 모달과 동일한 행 레이아웃 (좌 라벨 회색 / 우 값) */
function Row({ label, value, valueClass }: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex border-b border-slate-100 text-[13px] last:border-b-0">
      <div className="w-[190px] shrink-0 bg-slate-50 px-4 py-2.5 font-medium text-slate-600">
        {label}
      </div>
      <div className={`min-w-0 flex-1 px-4 py-2.5 text-slate-800 ${valueClass ?? ''}`}>{value}</div>
    </div>
  );
}

/**
 * 기존 Ohmy Partners "Create Hotel Booking" 모달 재현 (프로토타입).
 * AI 검색에서 선택한 요금·검색 조건이 그대로 전달되어 채워진 상태를 보여준다.
 * 분리 예약이면 룸별 상품·투숙객·소계를 룸 단위로 렌더한다 (예약 단위 A안 = 1코드 + N룸).
 */
export default function CreateBookingModal({ rates, conditions, onClose, onCreate }: Props) {
  const [localName, setLocalName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  /** 아동별 생년월일 입력값 (yyyy-mm-dd) */
  const [childBirthdays, setChildBirthdays] = useState<string[]>([]);
  const openedAtRef = useRef(0);
  // 모달이 새로 열릴 때 이전 닫기확인 상태·아동 생년월일 초기화
  useEffect(() => {
    if (rates && rates.length > 0) {
      openedAtRef.current = Date.now();
      setConfirmClose(false);
      setChildBirthdays([]);
    }
  }, [rates]);
  if (!rates || rates.length === 0) return null;

  const rate = rates[0];
  /** 분리 예약 — 룸마다 다른 상품 */
  const split = rates.length > 1;

  const travelerName =
    [lastName, firstName].filter(Boolean).join(' ').trim() || localName.trim() || 'GUEST';

  const nights = rate.total_nights;
  const rooms = split ? rates.length : (conditions?.rooms ?? rate.total_rooms);
  const adultCount = conditions?.adults ?? 2;
  const childCount = conditions?.children ?? 0;
  const travelers = adultCount + childCount;
  const checkIn = conditions?.check_in ?? '2026-08-20';
  const checkOut = conditions?.check_out ?? '2026-08-22';
  const total = rates.reduce((s, r) => s + r.selling_price + r.tax, 0);

  /**
   * 룸 블록 — 분리 예약이면 룸별(상품+인원) 그룹으로 투숙객을 배정한다.
   * 단일 객실은 기존 방식(성인 최대 4행 + 아동) 유지.
   */
  const roomCfgs = conditions ? cfgFromConditions(conditions) : [];
  let childCursor = 0;
  const roomBlocks = split
    ? rates.map((r, i) => {
        const cfg = roomCfgs[i] ?? { adt: 2, chd: 0, ages: [] };
        const block = { rate: r, cfg, childOffset: childCursor };
        childCursor += cfg.chd;
        return block;
      })
    : [];

  /**
   * 투숙객 행 — 단일 객실은 성인 먼저(최대 4행) + 아동, 분리 예약은 **룸별 그룹**으로 배정.
   * (실사이트: 아동 행에만 Child Birthday 입력)
   */
  const travelerRowDefs: Array<{
    roomLabel: string;
    roomType?: string;
    isChild: boolean;
    childIndex: number;
  }> = split
    ? roomBlocks.flatMap((b, ri) => [
        ...Array.from({ length: b.cfg.adt }, () => ({
          roomLabel: `Room ${ri + 1}`,
          roomType: b.rate.room_type_name,
          isChild: false,
          childIndex: -1,
        })),
        ...Array.from({ length: b.cfg.chd }, (_, k) => ({
          roomLabel: `Room ${ri + 1}`,
          roomType: b.rate.room_type_name,
          isChild: true,
          childIndex: b.childOffset + k,
        })),
      ])
    : [
        ...Array.from({ length: Math.min(adultCount, 4) }, () => ({
          roomLabel: 'Room 1',
          isChild: false,
          childIndex: -1,
        })),
        ...Array.from({ length: childCount }, (_, k) => ({
          roomLabel: 'Room 1',
          isChild: true,
          childIndex: k,
        })),
      ];

  /** 생년월일 검증 — 검색 시 지정한 아동 나이와 체크인 기준 만 나이 비교 */
  const childWarning = (childIndex: number): string | null => {
    const v = (childBirthdays[childIndex] ?? '').trim();
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '형식: yyyy-mm-dd';
    const ref = new Date(`${checkIn}T00:00:00`);
    const b = new Date(`${v}T00:00:00`);
    if (Number.isNaN(b.getTime()) || b > ref) return '생년월일이 올바르지 않습니다';
    let age = ref.getFullYear() - b.getFullYear();
    if (ref.getMonth() < b.getMonth() || (ref.getMonth() === b.getMonth() && ref.getDate() < b.getDate())) age -= 1;
    const expected = conditions?.child_ages?.[childIndex];
    if (expected != null && age !== expected)
      return `⚠ 검색한 아동 나이 ${expected}세와 불일치 — 이 생년월일은 체크인 기준 만 ${age}세입니다`;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="닫기"
        onClick={() => {
          // 요금 Select 더블클릭이 배경을 때리는 오작동 방지 — 오픈 직후 클릭 무시
          if (Date.now() - openedAtRef.current < 400) return;
          setConfirmClose(true);
        }}
        className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50"
      />

      {/* 닫기 확인 다이얼로그 (실제 포털과 동일) */}
      {confirmClose && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="w-[380px] overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-bold text-slate-800">
              Confirm
            </div>
            <p className="px-5 py-6 text-center text-[13px] text-slate-700">
              Are you sure you want to close?
            </p>
            <div className="flex justify-center gap-2 pb-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
                    <input defaultValue="81" className="w-14 shrink-0 rounded border border-slate-300 px-2.5 py-1.5 text-[13px]" />
                    <input defaultValue="9080863551" className="min-w-0 flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-[13px]" />
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
            {split ? (
              /* 분리 예약 — 룸마다 상품이 다르므로 룸별로 표기 */
              <Row
                label={
                  <span className="inline-flex items-center gap-1">
                    Room Type
                    <EnhBadge note="분리 예약 — 룸마다 다른 룸타입·요금제·취소정책이 한 예약에 공존" />
                  </span>
                }
                value={
                  <ul className="space-y-1.5">
                    {roomBlocks.map((b, i) => (
                      <li key={i} className="text-[12.5px]">
                        <b className="text-slate-500">Room {i + 1}</b> · {b.rate.room_type_name}
                        <span className="text-slate-500">
                          {' '}— {b.rate.rate_plan_name} · {b.rate.meal_plan} ·{' '}
                          {b.rate.cancellation_deadline ? (
                            <>무료취소 {formatDateTime(b.rate.cancellation_deadline)}까지</>
                          ) : (
                            <span className="font-semibold text-rose-600">환불불가</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                }
              />
            ) : (
              <>
                <Row label="Room Type" value={rate.room_type_name} />
                <Row label="Meal Type" value={rate.meal_plan} />
              </>
            )}
            <Row
              label="Client Cancellation D/L"
              value={
                split ? (
                  rates.some((r) => !r.cancellation_deadline) ? (
                    <>
                      Non-refundable{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        — 환불불가 룸이 포함되어 예약 전체가 환불불가입니다 (취소는 예약 단위)
                      </span>
                    </>
                  ) : (
                    <>
                      {formatDateTime(
                        rates
                          .map((r) => r.cancellation_deadline)
                          .filter((d): d is string => Boolean(d))
                          .sort()[0],
                      )}{' '}
                      Free cancellation available{' '}
                      <span className="text-[11px] font-normal text-slate-500">— 가장 이른 마감 기준</span>
                    </>
                  )
                ) : rate.cancellation_deadline ? (
                  `${formatDateTime(rate.cancellation_deadline)} Free cancellation available`
                ) : (
                  'Non-refundable'
                )
              }
              valueClass={
                split && rates.some((r) => !r.cancellation_deadline)
                  ? 'font-semibold text-rose-600'
                  : rate.cancellation_deadline
                    ? 'text-rose-600'
                    : 'font-semibold text-rose-600'
              }
            />
            {!split && <Row label="Plan Name" value={`[${rate.rate_plan_id}] ${rate.rate_plan_name}`} />}
            <Row
              label="Promotion Name"
              value={
                rate.cancellation_type === 'non_refundable'
                  ? `[${rate.rate_plan_id.replace('RP', '648')}] Event Promotion(Non Refundable)`
                  : ''
              }
            />
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
                    <th className="px-3 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        Child Birthday
                        <EnhBadge note="검색한 아동 나이와 생년월일(체크인 기준 만 나이) 불일치 경고" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {travelerRowDefs.map((rowDef, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-center text-slate-600">
                        {rowDef.roomLabel}
                        {rowDef.roomType && (
                          <span className="block text-[10px] leading-tight text-slate-400">{rowDef.roomType}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <label className="mr-2 inline-flex items-center gap-1">
                          <input type="radio" name={`gender-${i}`} defaultChecked className="accent-brand-500" /> M
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input type="radio" name={`gender-${i}`} className="accent-brand-500" /> F
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          placeholder="Name(Local Language)"
                          value={i === 0 ? localName : undefined}
                          onChange={i === 0 ? (e) => setLocalName(e.target.value) : undefined}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 placeholder:italic placeholder:text-slate-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            placeholder="Please enter only uppercase..."
                            value={i === 0 ? lastName : undefined}
                            onChange={i === 0 ? (e) => setLastName(e.target.value.toUpperCase()) : undefined}
                            className="w-1/2 rounded border border-slate-300 px-2 py-1.5 placeholder:italic placeholder:text-slate-400"
                          />
                          <span className="text-slate-400">/</span>
                          <input
                            placeholder="Please enter only uppercase letters."
                            value={i === 0 ? firstName : undefined}
                            onChange={i === 0 ? (e) => setFirstName(e.target.value.toUpperCase()) : undefined}
                            className="w-1/2 rounded border border-slate-300 px-2 py-1.5 placeholder:italic placeholder:text-slate-400"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {rowDef.isChild ? (
                          <div className="mx-auto w-36 text-left">
                            <input
                              placeholder="yyyy-mm-dd"
                              value={childBirthdays[rowDef.childIndex] ?? ''}
                              onChange={(e) =>
                                setChildBirthdays((prev) => {
                                  const next = [...prev];
                                  next[rowDef.childIndex] = e.target.value;
                                  return next;
                                })
                              }
                              className={`w-full rounded border px-2 py-1.5 placeholder:italic placeholder:text-slate-400 ${
                                childWarning(rowDef.childIndex)
                                  ? 'border-rose-400 bg-rose-50/40'
                                  : 'border-slate-300'
                              }`}
                            />
                            {childWarning(rowDef.childIndex) && (
                              <p className="mt-1 text-[10px] font-medium leading-snug text-rose-600">
                                {childWarning(rowDef.childIndex)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
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
              {/* 분리 예약 — 룸별 소계 후 합계 */}
              {split && (
                <ul className="mb-2 space-y-1">
                  {roomBlocks.map((b, i) => (
                    <li key={i} className="text-[12px] text-slate-600">
                      <span className="text-slate-400">Room {i + 1} · {b.rate.room_type_name}</span>{' '}
                      <b className="ml-2 text-slate-700">
                        {formatMoney(b.rate.selling_price + b.rate.tax, b.rate.currency)}
                      </b>
                    </li>
                  ))}
                </ul>
              )}
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

          {/* 버튼 */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <span className="mr-auto text-[10px] text-slate-400">
              Create 시 예약이 생성되어 Bookings 목록에 표시됩니다. (Mock — 세션 내 저장, 실제
              예약 아님)
            </span>
            <button
              type="button"
              onClick={() => onCreate(travelerName)}
              className="rounded bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setConfirmClose(true)}
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
