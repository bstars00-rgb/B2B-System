import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { todayIso } from '../utils/dashboardStats';
import { OP_POINT_POLICY, computeAccruals, summarize, tierFor, TIERS, type Accrual } from '../utils/opPoints';
import { SEED_PROMOS, type PointPromo } from '../mocks/opPointsPromos';
import { OP_ACCOUNTS, opAccountIdFor } from '../mocks/opAccounts';

/**
 * OP 포인트 — 오피포인트. **프로토타입 · 폐기 가능.**
 *
 * 심플 지향(리딤은 포인트몰 외주=Tango aggregator 연동이라 우리 화면은 최소로). CI는 OHMYHOTEL 브랜드(오렌지).
 * OP = 마켓플레이스 이용 고객. 예약·투숙 완료+지불 완료 시 자동 적립 → 등급제(Bronze~Diamond) → Tango 교환.
 * 적립 요율·계산식 비노출(배수 배지·상대 부스트만). 계정별 분리. 유효기간 1년.
 *
 * ※ 폐기: opPoints.ts + 이 파일 + opPointsPromos.ts + opAccounts.ts + 사이드바 메뉴 한 줄 삭제.
 */

const pt = (n: number) => `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} P`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const REDEEM_VALUES = [10, 20, 50, 100];
const MIN_REDEEM = REDEEM_VALUES[0];

interface TangoRedemption { id: string; points: number; at: string; }

function PromoBadge({ label }: { label: string }) {
  return <span className="ml-1 rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{label} 적립</span>;
}

/** 반원 게이지 — 등급 진행률(원형). */
function Gauge({ progress, center, sub }: { progress: number; center: string; sub: string }) {
  const R = 90;
  const len = Math.PI * R; // 반원 길이
  return (
    <div className="relative w-[200px]">
      <svg viewBox="0 0 220 128" className="w-full">
        <path d="M20 115 A90 90 0 0 1 200 115" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="13" strokeLinecap="round" />
        <path d="M20 115 A90 90 0 0 1 200 115" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${Math.max(0, progress) * len} ${len}`} />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
        <p className="text-2xl font-extrabold leading-none text-white">{center}</p>
        <p className="mt-1 text-[10px] font-medium text-white/85">{sub}</p>
      </div>
    </div>
  );
}

export default function OpPointsPage({
  bookings,
  onOpenBooking,
}: {
  bookings: Booking[];
  onOpenBooking: (ellisCode: string) => void;
}) {
  const today = todayIso();
  const [promos, setPromos] = useState<PointPromo[]>(SEED_PROMOS);
  const [toast, setToast] = useState<string | null>(null);
  const [showEllis, setShowEllis] = useState(false);
  const [modal, setModal] = useState<'summary' | 'redeem' | 'tiers' | null>(null);
  const [selValue, setSelValue] = useState<number | null>(null); // 교환 모달 내 선택값

  // 로그인 OP 계정 — 포인트는 계정별 분리 (프로토타입: 세션의 OP로 고정)
  const accountId = OP_ACCOUNTS[0].id;
  const account = OP_ACCOUNTS.find((a) => a.id === accountId) ?? OP_ACCOUNTS[0];
  const myBookings = useMemo(() => bookings.filter((b) => opAccountIdFor(b.ellis_code) === accountId), [bookings, accountId]);

  const [redeemedMap, setRedeemedMap] = useState<Record<string, TangoRedemption[]>>({});
  const redeemed = redeemedMap[accountId] ?? [];

  const accruals = useMemo(() => computeAccruals(myBookings, today, promos), [myBookings, today, promos]);
  const summary = useMemo(() => summarize(accruals, today), [accruals, today]);
  const redeemedPts = r1(redeemed.reduce((s, x) => s + x.points, 0));
  const balance = r1(summary.earned - redeemedPts);

  const tierStatus = useMemo(() => tierFor(summary.earned), [summary.earned]);
  const boostPct = Math.round((tierStatus.tier.boost - 1) * 100);

  const expiryCut = useMemo(() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 11);
    return d.toISOString().slice(0, 10);
  }, [today]);
  const expiringPoints = r1(accruals.filter((a) => a.stayCompleted < expiryCut).reduce((s, a) => s + a.points, 0));

  const openRedeem = () => { setSelValue(null); setModal('redeem'); };
  const doRedeem = (points: number) => {
    if (balance < points) { setToast(`포인트가 부족합니다 (필요 ${pt(points)}, 사용 가능 ${pt(balance)})`); return; }
    const rec: TangoRedemption = { id: `${Date.now()}-${points}`, points, at: today };
    setRedeemedMap((prev) => ({ ...prev, [accountId]: [rec, ...(prev[accountId] ?? [])] }));
    setModal(null); setSelValue(null);
    setToast(`✓ ${pt(points)} 교환 — 고유 Tango 교환 링크가 이메일(${account.id})로 발송되었습니다. (데모)`);
  };

  const setPromo = (id: string, patch: Partial<PointPromo>) =>
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const closeModal = () => { setModal(null); setSelValue(null); };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-[1080px] space-y-4 p-4">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            OP Points — 리워드
            <EnhBadge note="오피포인트 — 자동 적립 + 등급제 + Tango(외주 포인트몰) 교환. 프로토타입" />
          </h2>
          <span className="text-[11px] text-slate-400">{account.name}</span>
        </div>

        {/* 히어로 배너 (OHMYHOTEL CI · 오렌지) */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:justify-between sm:gap-4">
            {/* 멤버십 카드 */}
            <div
              className="w-full max-w-[300px] rounded-xl p-5 text-white shadow-lg ring-1 ring-white/20"
              style={{ background: `linear-gradient(135deg, ${tierStatus.tier.color}, ${tierStatus.tier.color}bb)` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-90">OHMYHOTEL · OP POINTS</span>
                <span aria-hidden>◇</span>
              </div>
              <p className="mt-6 text-lg font-extrabold">{account.name}</p>
              <p className="text-[11px] opacity-80">{account.id}</p>
              <p className="mt-3 inline-block rounded-md bg-white/20 px-2.5 py-1 text-[12px] font-bold">{tierStatus.tier.name} MEMBER</p>
            </div>

            {/* 등급 진행 게이지 */}
            <div className="flex flex-col items-center text-center text-white">
              <p className="text-lg font-extrabold">
                {tierStatus.next ? <>다음 등급 · {tierStatus.next.name}</> : '최고 등급 달성 🎉'}
              </p>
              {tierStatus.next && <p className="text-[12px] font-semibold text-white/90">다음 등급까지 {pt(tierStatus.toNext)}</p>}
              <div className="mt-1">
                <Gauge progress={tierStatus.progress} center={pt(summary.earned)} sub="12개월 총적립" />
              </div>
              <button
                type="button"
                onClick={() => setModal('tiers')}
                className="rounded-md bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-white/30"
              >
                등급 안내 {boostPct > 0 ? `· ${tierStatus.tier.name} +${boostPct}%` : ''}
              </button>
            </div>

            {/* 여백/장식 */}
            <div className="hidden w-[120px] shrink-0 lg:block" aria-hidden />
          </div>
        </div>

        {/* Points & Rewards */}
        <div>
          <p className="mb-2 text-[15px] font-bold text-slate-800">Points &amp; Rewards</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* 사용 가능 + 포인트 내역 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-center">
                <span className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white">🏆</span>
                <p className="text-2xl font-extrabold text-brand-600">{pt(balance)}</p>
                <p className="text-[11px] font-semibold text-brand-600/80">사용 가능 포인트</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>만료 예정 <b className="text-slate-700">{pt(expiringPoints)}</b></span>
                <span>총적립 <b className="text-slate-700">{pt(summary.earned)}</b></span>
              </div>
              <button
                type="button"
                onClick={() => setModal('summary')}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                포인트 내역
              </button>
            </div>

            {/* Tango 교환 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-[110px] w-full max-w-[260px] items-center justify-center rounded-xl bg-[#4b2fbf] text-white shadow-inner">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold tracking-wide">TANGO</p>
                    <p className="text-[11px] opacity-90">Gift card</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-slate-800">기프트카드로 교환</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                    적립 포인트를 <b>Tango 기프트카드</b>로 교환하고, 이메일로 받은 링크에서 <b>1,000+ 브랜드</b> 중 선택하세요.
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">최소 <b className="text-slate-700">{pt(MIN_REDEEM)}</b>부터</span>
                    <button
                      type="button"
                      onClick={openRedeem}
                      disabled={balance < MIN_REDEEM}
                      className={`rounded-lg px-4 py-2 text-[12px] font-bold ${balance < MIN_REDEEM ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                    >
                      교환하기 →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 이용 안내 (간단) */}
        <p className="text-[11px] leading-relaxed text-slate-400">
          예약이 <b>투숙 완료 + 지불 완료</b>되면 <b>자동 적립</b>(취소·노쇼·환불 제외). <b>등급이 오를수록 더 많이 적립</b>됩니다.
          프로모션 호텔은 추가 적립(배수 배지). 포인트는 <b>OP 계정별로 분리</b>되고 유효기간 <b>1년</b>. 상품 교환은 <b>Tango(외주 포인트몰)</b>가 처리합니다.
        </p>

        {/* ELLIS 내부 프로모 관리 (고객 비노출) */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/60 p-3">
          <button type="button" onClick={() => setShowEllis((v) => !v)} className="flex w-full items-center justify-between text-left">
            <span className="text-[12px] font-bold text-slate-700">🔧 ELLIS 내부 — 포인트 프로모 관리 <span className="font-normal text-slate-400">(고객 비노출 · 시연)</span></span>
            <span className="text-[10px] text-slate-400">{showEllis ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>
          {showEllis && (
            <div className="mt-3">
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                포인트 배수는 <b className="text-slate-700">ELLIS 내부</b>에서만 변경 — <b>지정 호텔 · 기간(예약일) · 룸타입</b>. 고객 화면엔 요율(내부 기본 {OP_POINT_POLICY.baseRatePct}%)이 아니라 <b>배수 배지</b>로만 노출. 값 변경 시 적립 즉시 재계산.
              </p>
              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="w-full min-w-[720px] text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <th className="px-3 py-2 text-left font-semibold">호텔 (지정)</th>
                      <th className="px-3 py-2 text-left font-semibold">룸타입</th>
                      <th className="px-3 py-2 text-left font-semibold">기간(예약일)</th>
                      <th className="px-3 py-2 text-center font-semibold">배수</th>
                      <th className="px-3 py-2 text-center font-semibold">고객 표시</th>
                      <th className="px-3 py-2 text-center font-semibold">활성</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-700">{p.hotelName} <span className="font-mono text-[10px] text-slate-400">{p.hotelId}</span></td>
                        <td className="px-3 py-2 text-slate-600">{p.roomTypes === 'all' ? '전체' : p.roomTypes.join(', ')}</td>
                        <td className="px-3 py-2 text-slate-600">{p.start} ~ {p.end}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="number" step="0.1" min="1" value={p.multiplier}
                            onChange={(e) => setPromo(p.id, { multiplier: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right text-[11px] focus:border-brand-400 focus:outline-none" />
                          ×
                        </td>
                        <td className="px-3 py-2 text-center"><span className="rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{Math.round(p.multiplier * 100)}% 적립</span></td>
                        <td className="px-3 py-2 text-center"><input type="checkbox" checked={p.active} onChange={(e) => setPromo(p.id, { active: e.target.checked })} className="accent-brand-500" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 모달 ===== */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={closeModal}>
          <div className="flex max-h-[85vh] w-full max-w-[540px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <span className="text-sm font-bold text-slate-800">
                {modal === 'summary' ? '포인트 내역' : modal === 'redeem' ? 'Tango 기프트카드 교환' : '등급 안내'}
              </span>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
            </div>

            {/* 포인트 내역 */}
            {modal === 'summary' && (
              <div className="overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-3 gap-2">
                  {[['사용 가능', balance, 'text-brand-600'], ['총적립', summary.earned, 'text-slate-800'], ['만료 예정', expiringPoints, 'text-rose-500']].map(([lbl, val, cls]) => (
                    <div key={lbl as string} className="rounded-lg border border-slate-200 p-2.5 text-center">
                      <p className={`text-lg font-extrabold ${cls}`}>{pt(val as number)}</p>
                      <p className="text-[10px] text-slate-400">{lbl as string}</p>
                    </div>
                  ))}
                </div>
                <p className="mb-1 mt-3 text-[11px] font-semibold text-slate-500">적립 내역 ({accruals.length}건) · 예약 코드 클릭 시 예약으로 이동</p>
                <div className="max-h-[300px] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
                        <th className="px-3 py-2 text-left font-semibold">날짜</th>
                        <th className="px-3 py-2 text-left font-semibold">예약 · 호텔</th>
                        <th className="px-3 py-2 text-right font-semibold">포인트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accruals.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-[11px] text-slate-400">아직 적립 내역이 없습니다.</td></tr>}
                      {accruals.map((a: Accrual) => (
                        <tr key={a.ellisCode} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-600">{a.stayCompleted}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => { closeModal(); onOpenBooking(a.ellisCode); }} className="font-mono text-[11px] text-brand-600 underline underline-offset-2 hover:text-brand-700">{a.ellisCode}</button>
                            <span className="ml-1.5 text-slate-600">{a.hotelName}</span>
                            {a.promoLabel && <PromoBadge label={a.promoLabel} />}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-brand-600">+{pt(a.points)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {redeemed.length > 0 && (
                  <>
                    <p className="mb-1 mt-3 text-[11px] font-semibold text-slate-500">교환 내역 (Tango {redeemed.length}건)</p>
                    <div className="space-y-1">
                      {redeemed.map((v) => (
                        <div key={v.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-1.5 text-[11px]">
                          <span className="text-slate-600">{v.at} · Tango 기프트카드</span>
                          <span className="font-bold text-slate-500">−{pt(v.points)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tango 교환 */}
            {modal === 'redeem' && (
              <div className="overflow-y-auto px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-[#4b2fbf] text-white">
                    <div className="text-center"><p className="text-sm font-extrabold">TANGO</p><p className="text-[9px] opacity-90">Gift card</p></div>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">사용 가능 {pt(balance)}</p>
                    <p className="text-[11px] text-slate-400">교환 값을 선택하세요</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {REDEEM_VALUES.map((v) => {
                    const ok = balance >= v;
                    const sel = selValue === v;
                    return (
                      <button key={v} type="button" disabled={!ok} onClick={() => setSelValue(v)}
                        className={`rounded-lg border p-3 text-center transition ${sel ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300' : ok ? 'border-slate-200 hover:border-brand-300' : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'}`}>
                        <p className="text-[15px] font-extrabold text-slate-800">{pt(v)}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{ok ? 'Tango' : '부족'}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                  ※ 실제 기프트카드 액면가·브랜드는 <b>Tango</b>에서 선택합니다(우리 화면은 포인트만). 확정 시 <b>{account.id}</b>로 고유 교환 링크가 발송됩니다. <b className="text-rose-500">교환은 취소할 수 없습니다.</b>
                </p>
                {selValue && <p className="mt-1 text-[11px] text-slate-500">교환 후 사용 가능 <b>{pt(r1(balance - selValue))}</b></p>}
              </div>
            )}

            {/* 등급 안내 */}
            {modal === 'tiers' && (
              <div className="overflow-y-auto px-5 py-4">
                <p className="text-[12px] leading-relaxed text-slate-600">최근 <b>12개월 적립 포인트</b>로 등급이 결정됩니다(자동, 별도 가입 없음). <b>등급이 오를수록 더 많이 적립</b>됩니다.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TIERS.map((t, i) => (
                    <div key={t.name} className={`rounded-lg border p-3 text-center ${i === tierStatus.index ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                      <p className="text-[13px] font-extrabold" style={{ color: t.color }}>{t.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{t.min === 0 ? '기본 등급' : `${pt(t.min)}~`}</p>
                      <p className="mt-1 text-[12px] font-bold text-slate-700">{t.boost > 1 ? `+${Math.round((t.boost - 1) * 100)}% 적립` : '기본 적립'}</p>
                      {i === tierStatus.index && <p className="mt-1 text-[9px] font-bold text-brand-600">현재 등급</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 푸터 액션 */}
            <div className="flex gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={closeModal} className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">닫기</button>
              {modal === 'redeem' && (
                <button type="button" disabled={!selValue} onClick={() => selValue && doRedeem(selValue)}
                  className={`flex-1 rounded px-3 py-2 text-[12px] font-bold ${selValue ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}>
                  {selValue ? `${pt(selValue)} 교환하기` : '값을 선택하세요'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white shadow-lg">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-3 text-slate-400 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
}
