import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { todayIso } from '../utils/dashboardStats';
import { OP_POINT_POLICY, computeAccruals, summarize, tierFor, TIERS, type Accrual } from '../utils/opPoints';
import { SEED_PROMOS, type PointPromo } from '../mocks/opPointsPromos';
import { OP_ACCOUNTS, opAccountIdFor } from '../mocks/opAccounts';

/**
 * OP 포인트 — 오피포인트. **프로토타입 · 폐기 가능.** (심플 버전 — Bedsonline Rewards 벤치마크)
 *
 * OP = 마켓플레이스 이용 고객(OP 개인). 예약·투숙 완료+지불 완료 시 **자동 적립** → **Tango(aggregator)로 교환**.
 * 등급제(Bronze~Diamond, 등급↑=적립↑) + 자동적립(가입/탈퇴 없음). 리딤은 상품몰 없이 Tango 연동(값 선택 → 이메일 링크).
 * 적립 요율·계산식은 고객 비노출(배수 배지·상대 부스트만). 계정별 분리. 유효기간 1년.
 *
 * ※ 폐기: opPoints.ts(등급 포함) + 이 파일 + opPointsPromos.ts + opAccounts.ts + 사이드바 메뉴 한 줄 삭제.
 */

const pt = (n: number) => `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} P`;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Tango 리딤 값(포인트). 화면은 포인트만 — 실제 기프트카드 액면가·브랜드는 Tango에서 선택. */
const REDEEM_VALUES = [10, 20, 50, 100];
const MIN_REDEEM = REDEEM_VALUES[0];

interface TangoRedemption {
  id: string;
  points: number;
  at: string;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

/** 배수 배지 — 고객에겐 요율이 아닌 "배수(%)"만 노출 */
function PromoBadge({ label }: { label: string }) {
  return (
    <span className="ml-1 rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{label} 적립</span>
  );
}

/** 적립 내역 — 심플 테이블(날짜 · 예약코드 · 호텔 · 포인트). 예약코드 클릭 시 Bookings로 이동. */
function AccrualTable({ rows, onOpenBooking }: { rows: Accrual[]; onOpenBooking: (ellisCode: string) => void }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[520px] text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
            <th className="px-3 py-2 text-left font-semibold">날짜</th>
            <th className="px-3 py-2 text-left font-semibold">예약 코드</th>
            <th className="px-3 py-2 text-left font-semibold">호텔</th>
            <th className="px-3 py-2 text-right font-semibold">적립 포인트</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-[11px] text-slate-400">아직 적립 내역이 없습니다.</td>
            </tr>
          )}
          {rows.map((a) => (
            <tr key={a.ellisCode} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
              <td className="px-3 py-2 text-slate-600">{a.stayCompleted}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpenBooking(a.ellisCode)}
                  className="font-mono text-[11px] text-brand-600 underline underline-offset-2 hover:text-brand-700"
                  title="이 예약을 Bookings에서 보기"
                >
                  {a.ellisCode}
                </button>
              </td>
              <td className="px-3 py-2 text-slate-700">
                {a.hotelName}
                {a.promoLabel && <PromoBadge label={a.promoLabel} />}
              </td>
              <td className="px-3 py-2 text-right font-bold text-brand-600">+{pt(a.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [redeemValue, setRedeemValue] = useState<number | null>(null);

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

  // 등급 (12개월 적립 = 총적립으로 결정, 자동적립)
  const tierStatus = useMemo(() => tierFor(summary.earned), [summary.earned]);
  const boostPct = Math.round((tierStatus.tier.boost - 1) * 100);

  // 만료 예정 — 적립 후 11개월 경과분(1년 유효 임박). 데모는 최근이라 보통 0.
  const expiryCut = useMemo(() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 11);
    return d.toISOString().slice(0, 10);
  }, [today]);
  const expiringPoints = r1(accruals.filter((a) => a.stayCompleted < expiryCut).reduce((s, a) => s + a.points, 0));

  const doRedeem = (points: number) => {
    if (balance < points) {
      setToast(`포인트가 부족합니다 (필요 ${pt(points)}, 사용 가능 ${pt(balance)})`);
      return;
    }
    const rec: TangoRedemption = { id: `${Date.now()}-${points}`, points, at: today };
    setRedeemedMap((prev) => ({ ...prev, [accountId]: [rec, ...(prev[accountId] ?? [])] }));
    setToast(`✓ ${pt(points)} 교환 — 고유 Tango 교환 링크가 이메일(${account.id})로 발송되었습니다. (데모)`);
  };

  const setPromo = (id: string, patch: Partial<PointPromo>) =>
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
      <div className="mx-auto max-w-[1080px] space-y-3">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            OP Points — 리워드
            <EnhBadge note="오피포인트 — 자동 적립 + 등급제 + Tango 교환(프로토타입)" />
          </h2>
          <span className="text-[11px] text-slate-400">{account.name}</span>
        </div>

        {/* 히어로 — 멤버십 카드 + 등급 진행/포인트 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,380px)_1fr]">
          {/* 멤버십 카드 */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${tierStatus.tier.color}, ${tierStatus.tier.color}bb)` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-90">OHMYHOTEL · OP POINTS</span>
              <span className="text-lg" aria-hidden>◇</span>
            </div>
            <p className="mt-7 text-lg font-extrabold">{account.name}</p>
            <p className="text-[11px] opacity-80">{account.id}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-md bg-white/20 px-2.5 py-1 text-[12px] font-bold">{tierStatus.tier.name} MEMBER</span>
              <span className="text-[11px] opacity-90">{boostPct > 0 ? `+${boostPct}% 적립` : '기본 적립'}</span>
            </div>
          </div>

          {/* 등급 진행 + 포인트 */}
          <Card className="flex flex-col justify-center">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] text-slate-500">사용 가능</p>
                <p className="text-3xl font-extrabold text-brand-600">{pt(balance)}</p>
              </div>
              <div className="flex gap-5 text-right">
                <div>
                  <p className="text-[11px] text-slate-500">12개월 총적립</p>
                  <p className="text-base font-bold text-slate-800">{pt(summary.earned)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">만료 예정</p>
                  <p className="text-base font-bold text-slate-500">{pt(expiringPoints)}</p>
                </div>
              </div>
            </div>

            {/* 진행 막대 */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {tierStatus.next ? <>다음 등급 <b style={{ color: tierStatus.next.color }}>{tierStatus.next.name}</b>까지 <b className="text-brand-600">{pt(tierStatus.toNext)}</b></> : <b className="text-slate-700">최고 등급 달성 🎉</b>}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(tierStatus.progress * 100)}%`, background: tierStatus.tier.color }} />
              </div>
              <div className="mt-1.5 flex justify-between">
                {TIERS.map((t, i) => (
                  <span key={t.name} className={`text-[10px] font-semibold ${i === tierStatus.index ? '' : 'text-slate-300'}`} style={i === tierStatus.index ? { color: t.color } : undefined}>
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Points & Rewards — 좌: Tango 교환 / 우: 적립 내역 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Tango 교환 */}
          <Card>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-slate-800">리워드 교환</p>
              <span className="rounded bg-[#4b2fbf] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white">TANGO</span>
            </div>
            <p className="mb-3 text-[10px] leading-relaxed text-slate-400">
              적립 포인트를 <b className="text-slate-500">Tango 기프트카드</b>로 교환. 값 선택 → <b>이메일로 고유 링크</b> → Tango에서 1,000+ 브랜드 중 선택. 최소 {pt(MIN_REDEEM)}부터.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <p className="text-[10px] text-slate-500">사용 가능</p>
              <p className="text-2xl font-extrabold text-brand-600">{pt(balance)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {REDEEM_VALUES.map((v) => {
                const ok = balance >= v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRedeemValue(v)}
                    disabled={!ok}
                    className={`rounded-lg border p-3 text-center transition ${ok ? 'border-slate-200 hover:border-brand-300 hover:bg-slate-50' : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'}`}
                  >
                    <p className="text-[15px] font-extrabold text-slate-800">{pt(v)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{ok ? 'Tango 교환' : '포인트 부족'}</p>
                  </button>
                );
              })}
            </div>
            {redeemed.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <p className="mb-1 text-[10px] font-semibold text-slate-500">교환 내역 (Tango {redeemed.length}건)</p>
                {redeemed.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-0.5 text-[10px] text-slate-500">
                    <span>{v.at} · Tango {pt(v.points)}</span>
                    <span className="rounded-sm bg-emerald-50 px-1 py-px font-bold text-emerald-600">이메일 발송</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 적립 내역 */}
          <Card>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-slate-800">적립 내역 <span className="text-[11px] font-normal text-slate-400">({accruals.length}건)</span></p>
              <span className="text-[10px] text-slate-400">예약 → 투숙 완료 + 지불 완료 시 자동 적립 · 예약 코드 클릭 시 예약으로 이동</span>
            </div>
            <AccrualTable rows={accruals} onOpenBooking={onOpenBooking} />
          </Card>
        </div>

        {/* ELLIS 내부 프로모 관리 (고객 비노출) */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
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
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            value={p.multiplier}
                            onChange={(e) => setPromo(p.id, { multiplier: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right text-[11px] focus:border-brand-400 focus:outline-none"
                          />
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

        <p className="text-[10px] leading-relaxed text-slate-400">
          프로토타입(Bedsonline 벤치마크) — <b>자동 적립 + 등급제 + Tango 교환</b>. 포인트는 <b>OP 계정별 분리</b>({account.name} 예약 {myBookings.length}건 중 투숙+지불 완료 {summary.eligibleCount}건 적립). 교환은 세션 내 표시(새로고침 시 초기화). 정책 확정 대상: 기본 요율·등급 임계값/부스트·환율·연간 교환 한도·세무·Tango 정산.
        </p>
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
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                  <span className="rounded bg-[#4b2fbf] px-1.5 py-0.5 text-[9px] font-extrabold text-white">TANGO</span> 기프트카드
                </span>
                <span className="text-[15px] font-extrabold text-brand-600">{pt(redeemValue)} 차감</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">교환 후 사용 가능 {pt(r1(balance - redeemValue))}</p>
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-600">
                ⚠ 교환은 <b>취소할 수 없습니다.</b> 확정 시 <b>{account.id}</b>로 <b>고유 Tango 교환 링크</b>가 발송됩니다.
              </p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={() => setRedeemValue(null)} className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">닫기</button>
              <button type="button" onClick={() => { doRedeem(redeemValue); setRedeemValue(null); }} className="flex-1 rounded bg-brand-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-600">교환하기</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white shadow-lg">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-3 text-slate-400 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
}
