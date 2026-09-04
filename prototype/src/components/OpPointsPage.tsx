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
 * 포털(Dashboard) 카드 스타일과 통일한 풀폭 레이아웃. 리딤은 포인트몰 외주(Tango aggregator) 연동이라 우리 화면은 최소.
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
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
  const [redeemValue, setRedeemValue] = useState<number | null>(null);

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

  const doRedeem = (points: number) => {
    if (balance < points) { setToast(`포인트가 부족합니다 (필요 ${pt(points)}, 사용 가능 ${pt(balance)})`); return; }
    const rec: TangoRedemption = { id: `${Date.now()}-${points}`, points, at: today };
    setRedeemedMap((prev) => ({ ...prev, [accountId]: [rec, ...(prev[accountId] ?? [])] }));
    setRedeemValue(null);
    setToast(`✓ ${pt(points)} 교환 — 고유 Tango 교환 링크가 이메일(${account.id})로 발송되었습니다. (데모)`);
  };

  const setPromo = (id: string, patch: Partial<PointPromo>) =>
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const Stat = ({ label, value, cls = 'text-slate-800' }: { label: string; value: string; cls?: string }) => (
    <div className="px-4">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-xl font-extrabold ${cls}`}>{value}</p>
    </div>
  );

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto bg-slate-50 p-4">
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            OP Points — 리워드
            <EnhBadge note="오피포인트 — 자동 적립 + 등급제 + Tango(외주 포인트몰) 교환. 프로토타입" />
          </h2>
          <span className="text-[11px] text-slate-400">{account.name} · <span className="font-mono">{account.id}</span></span>
        </div>

        {/* 등급 + 포인트 스트립 (풀폭) */}
        <Card className="!p-0">
          <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center">
            {/* 등급 */}
            <div className="flex shrink-0 items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-black text-white shadow-sm" style={{ background: tierStatus.tier.color }}>
                {tierStatus.tier.name[0]}
              </span>
              <div>
                <p className="text-[11px] text-slate-500">현재 등급</p>
                <p className="text-lg font-extrabold leading-tight" style={{ color: tierStatus.tier.color }}>
                  {tierStatus.tier.name} <span className="text-[12px] font-bold text-brand-600">{boostPct > 0 ? `+${boostPct}% 적립` : '기본'}</span>
                </p>
              </div>
            </div>

            {/* 진행 막대 (가운데, 늘어남) */}
            <div className="min-w-0 flex-1 xl:px-4">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {tierStatus.next ? <>다음 등급 <b style={{ color: tierStatus.next.color }}>{tierStatus.next.name}</b>까지 <b className="text-brand-600">{pt(tierStatus.toNext)}</b></> : <b className="text-slate-700">최고 등급 달성 🎉</b>}
                </span>
                <span className="text-slate-400">12개월 총적립 {pt(summary.earned)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(tierStatus.progress * 100)}%`, background: tierStatus.tier.color }} />
              </div>
              <div className="mt-1 flex justify-between">
                {TIERS.map((t, i) => (
                  <span key={t.name} className={`text-[10px] font-semibold ${i === tierStatus.index ? '' : 'text-slate-300'}`} style={i === tierStatus.index ? { color: t.color } : undefined}>{t.name}</span>
                ))}
              </div>
            </div>

            {/* 포인트 통계 (우측) */}
            <div className="flex shrink-0 items-center divide-x divide-slate-200 rounded-lg bg-slate-50 py-2">
              <Stat label="사용 가능" value={pt(balance)} cls="text-brand-600" />
              <Stat label="총적립" value={pt(summary.earned)} />
              <Stat label="사용(교환)" value={pt(redeemedPts)} />
              <Stat label="만료 예정" value={pt(expiringPoints)} cls="text-rose-500" />
            </div>
          </div>
        </Card>

        {/* 본문 2단 (풀폭) — 좌: 적립 내역(넓게) / 우: Tango 교환 */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* 적립 내역 */}
          <Card className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-slate-800">적립 내역 <span className="text-[11px] font-normal text-slate-400">({accruals.length}건 · 투숙 완료 + 지불 완료 자동 적립)</span></p>
              <span className="text-[10px] text-slate-400">예약 코드 클릭 시 예약으로 이동</span>
            </div>
            <div className="max-h-[560px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
                    <th className="px-4 py-2.5 text-left font-semibold">날짜</th>
                    <th className="px-4 py-2.5 text-left font-semibold">예약 코드</th>
                    <th className="px-4 py-2.5 text-left font-semibold">호텔</th>
                    <th className="px-4 py-2.5 text-right font-semibold">적립 포인트</th>
                  </tr>
                </thead>
                <tbody>
                  {accruals.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[11px] text-slate-400">아직 적립 내역이 없습니다.</td></tr>}
                  {accruals.map((a: Accrual) => (
                    <tr key={a.ellisCode} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 text-slate-600">{a.stayCompleted}</td>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => onOpenBooking(a.ellisCode)} className="font-mono text-[11px] text-brand-600 underline underline-offset-2 hover:text-brand-700" title="이 예약을 Bookings에서 보기">{a.ellisCode}</button>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{a.hotelName}{a.promoLabel && <PromoBadge label={a.promoLabel} />}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-brand-600">+{pt(a.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Tango 교환 */}
          <div className="min-w-0 space-y-3">
            <Card>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-800">기프트카드 교환</p>
                <span className="rounded bg-[#4b2fbf] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white">TANGO</span>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-slate-400">
                포인트를 <b className="text-slate-500">Tango 기프트카드</b>로 교환 — 값 선택 → <b>이메일 링크</b> → Tango에서 1,000+ 브랜드 중 선택. 상품몰은 외주(Tango)가 운영, 최소 {pt(MIN_REDEEM)}부터.
              </p>
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-center">
                <p className="text-[10px] text-brand-600/80">사용 가능</p>
                <p className="text-2xl font-extrabold text-brand-600">{pt(balance)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {REDEEM_VALUES.map((v) => {
                  const ok = balance >= v;
                  return (
                    <button key={v} type="button" onClick={() => setRedeemValue(v)} disabled={!ok}
                      className={`rounded-lg border p-3 text-center transition ${ok ? 'border-slate-200 hover:border-brand-300 hover:bg-slate-50' : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'}`}>
                      <p className="text-[15px] font-extrabold text-slate-800">{pt(v)}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{ok ? 'Tango 교환' : '포인트 부족'}</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            {redeemed.length > 0 && (
              <Card>
                <p className="mb-1.5 text-[12px] font-bold text-slate-800">교환 내역 <span className="text-[11px] font-normal text-slate-400">(Tango {redeemed.length}건)</span></p>
                <div className="space-y-1">
                  {redeemed.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-1.5 text-[11px]">
                      <span className="text-slate-600">{v.at} · Tango 기프트카드</span>
                      <span className="rounded-sm bg-emerald-50 px-1.5 py-px text-[9px] font-bold text-emerald-600">이메일 발송 · −{pt(v.points)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-slate-400">
          예약이 <b>투숙 완료 + 지불 완료</b>되면 <b>자동 적립</b>(취소·노쇼·환불 제외). 등급이 오를수록 더 많이 적립되고, 프로모션 호텔은 추가 적립(배수 배지). 포인트는 <b>OP 계정별 분리</b>({account.name} 예약 {myBookings.length}건 중 {summary.eligibleCount}건 적립)·유효기간 1년. 상품 교환은 <b>Tango(외주 포인트몰)</b> 처리. 교환은 세션 내 표시(새로고침 시 초기화). 정책 확정: 기본 요율·등급 임계값/부스트·환율·연간 교환 한도·세무·Tango 정산.
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
                포인트 배수는 <b className="text-slate-700">ELLIS 내부</b>에서만 변경 — <b>지정 호텔 · 기간(예약일) · 룸타입</b>. 고객 화면엔 요율(내부 기본 {OP_POINT_POLICY.baseRatePct}%)이 아니라 <b>배수 배지</b>로만 노출. 값 변경 시 위 적립 내역 즉시 재계산.
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

      {/* Tango 교환 확인 팝업 */}
      {redeemValue !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setRedeemValue(null)}>
          <div className="w-[360px] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <span className="text-sm font-bold text-slate-800">Tango 교환 확인</span>
              <button type="button" onClick={() => setRedeemValue(null)} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700"><span className="rounded bg-[#4b2fbf] px-1.5 py-0.5 text-[9px] font-extrabold text-white">TANGO</span> 기프트카드</span>
                <span className="text-[15px] font-extrabold text-brand-600">{pt(redeemValue)} 차감</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">교환 후 사용 가능 {pt(r1(balance - redeemValue))}</p>
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-600">
                ⚠ 교환은 <b>취소할 수 없습니다.</b> 확정 시 <b>{account.id}</b>로 <b>고유 Tango 교환 링크</b>가 발송됩니다.
              </p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={() => setRedeemValue(null)} className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">닫기</button>
              <button type="button" onClick={() => doRedeem(redeemValue)} className="flex-1 rounded bg-brand-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-600">교환하기</button>
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
