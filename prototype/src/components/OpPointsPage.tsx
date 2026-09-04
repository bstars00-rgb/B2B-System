import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { todayIso } from '../utils/dashboardStats';
import { OP_POINT_POLICY, computeAccruals, computePending, summarize, tierFor, TIERS, type Accrual } from '../utils/opPoints';
import { SEED_PROMOS, type PointPromo } from '../mocks/opPointsPromos';
import { OP_ACCOUNTS, opAccountIdFor } from '../mocks/opAccounts';

/**
 * OP 포인트 — 오피포인트. **프로토타입 · 폐기 가능.**
 *
 * OP = 닷비즈 이용 고객(OP 개인). 예약·투숙 완료+지불 완료 시 자동 적립 → **Tango(aggregator)로 교환**.
 * (현업 2026-08, HBX/Bedsonline 벤치마크): **등급제 도입**(Bronze~Diamond, 등급↑=적립↑) + **자동 적립**(가입/탈퇴 없음).
 * 리딤은 우리가 상품몰을 만들지 않고 **Tango 기프트카드 aggregator에 연동** — 값 선택 → 이메일 고유 링크 → 1,000+ 브랜드에서 교환.
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
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

/** 배수 배지 — 고객에겐 요율이 아닌 "배수(%)"만 노출 */
function PromoBadge({ label }: { label: string }) {
  return (
    <span className="ml-1 rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{label} 적립</span>
  );
}

const PAY_LABEL: Record<string, { text: string; cls: string }> = {
  Unpaid: { text: 'Unpaid', cls: 'text-rose-500' },
  'Partially Paid': { text: 'Partially Paid', cls: 'text-amber-600' },
  'Fully Paid': { text: 'Fully Paid', cls: 'text-emerald-600' },
};

/** 적립/예정 공용 테이블 — 예약코드 클릭 시 Bookings로 이동해 해당 예약 표시 */
function AccrualTable({
  rows,
  onOpenBooking,
  pointHeader,
  pointClass,
  showPayment = false,
}: {
  rows: Accrual[];
  onOpenBooking: (ellisCode: string) => void;
  pointHeader: string;
  pointClass: string;
  showPayment?: boolean;
}) {
  return (
    <div className="max-h-[360px] overflow-auto rounded border border-slate-200">
      <table className="w-full min-w-[720px] text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
            <th className="px-3 py-2 text-left font-semibold">예약 코드</th>
            <th className="px-3 py-2 text-left font-semibold">투숙 완료일</th>
            <th className="px-3 py-2 text-left font-semibold">결재 완료일</th>
            <th className="px-3 py-2 text-left font-semibold">호텔</th>
            {showPayment && <th className="px-3 py-2 text-left font-semibold">결제</th>}
            <th className="px-3 py-2 text-right font-semibold">{pointHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={showPayment ? 6 : 5} className="px-3 py-6 text-center text-[11px] text-slate-400">
                선택한 기간에 해당하는 내역이 없습니다.
              </td>
            </tr>
          )}
          {rows.map((a) => {
            const pay = PAY_LABEL[a.paymentStatus] ?? { text: a.paymentStatus, cls: 'text-slate-500' };
            return (
              <tr key={a.ellisCode} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
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
                <td className="px-3 py-2 text-slate-600">{a.stayCompleted}</td>
                <td className="px-3 py-2 text-slate-600">{a.paidAt ?? <span className="text-slate-400">— 미결제</span>}</td>
                <td className="px-3 py-2 text-slate-700">
                  {a.hotelName}
                  {a.promoLabel && <PromoBadge label={a.promoLabel} />}
                </td>
                {showPayment && <td className={`px-3 py-2 text-[11px] font-medium ${pay.cls}`}>{pay.text}</td>}
                <td className={`px-3 py-2 text-right font-bold ${pointClass}`}>{pt(a.points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type DateBasis = 'stay' | 'paid';

export default function OpPointsPage({
  bookings,
  onOpenBooking,
}: {
  bookings: Booking[];
  /** 적립 내역의 예약 코드 클릭 → Bookings로 이동해 해당 예약 표시 */
  onOpenBooking: (ellisCode: string) => void;
}) {
  const today = todayIso();
  const [promos, setPromos] = useState<PointPromo[]>(SEED_PROMOS);
  const [toast, setToast] = useState<string | null>(null);
  const [showEllis, setShowEllis] = useState(false);
  const [redeemValue, setRedeemValue] = useState<number | null>(null); // Tango 교환 확인 모달

  // 로그인 OP 계정 — 포인트는 계정별로 분리. 실제 로그인 계정(프로토타입: 세션의 OP로 고정).
  const accountId = OP_ACCOUNTS[0].id;
  const account = OP_ACCOUNTS.find((a) => a.id === accountId) ?? OP_ACCOUNTS[0];
  const myBookings = useMemo(() => bookings.filter((b) => opAccountIdFor(b.ellis_code) === accountId), [bookings, accountId]);

  // Tango 교환 내역도 계정별로 분리
  const [redeemedMap, setRedeemedMap] = useState<Record<string, TangoRedemption[]>>({});
  const redeemed = redeemedMap[accountId] ?? [];

  const accruals = useMemo(() => computeAccruals(myBookings, today, promos), [myBookings, today, promos]);
  const pending = useMemo(() => computePending(myBookings, today, promos), [myBookings, today, promos]);
  const pendingPoints = r1(pending.reduce((s, a) => s + a.points, 0));

  // 날짜 필터 — 적립 내역·예정이 무한정 길어지지 않도록 기간으로 제한. 기본값 = 가장 최근 월.
  const defaultRange = useMemo(() => {
    const stays = myBookings.filter((b) => b.status === 'Confirmed' && b.check_out < today).map((b) => b.check_out.slice(0, 10));
    const maxStay = stays.length ? stays.reduce((m, d) => (d > m ? d : m)) : today;
    return { from: `${maxStay.slice(0, 7)}-01`, to: maxStay };
  }, [myBookings, today]);
  const [basis, setBasis] = useState<DateBasis>('stay');
  const [range, setRange] = useState(defaultRange);

  const inRange = (d: string | null) => !!d && (!range.from || d >= range.from) && (!range.to || d <= range.to);
  const fAccruals = useMemo(() => accruals.filter((a) => inRange(basis === 'stay' ? a.stayCompleted.slice(0, 10) : a.paidAt)), [accruals, basis, range]);
  const fPending = useMemo(() => pending.filter((a) => inRange(a.stayCompleted.slice(0, 10))), [pending, range]);

  const summary = useMemo(() => summarize(accruals, today), [accruals, today]);
  const redeemedPts = r1(redeemed.reduce((s, x) => s + x.points, 0));
  const balance = r1(summary.earned - redeemedPts);

  // 등급 — 12개월 적립(=총적립)으로 결정 (자동 적립, 별도 가입 없음)
  const tierStatus = useMemo(() => tierFor(summary.earned), [summary.earned]);
  const boostPct = Math.round((tierStatus.tier.boost - 1) * 100);

  // 만료 예정 — 적립 후 11개월 경과분(1년 유효 임박). 데모 데이터는 최근이라 보통 0.
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
      <div className="mx-auto max-w-[1680px] space-y-3">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            OP Points — 고객 리워드
            <EnhBadge note="오피포인트 — 예약·투숙·지불 완료 자동 적립 + 등급제 + Tango 교환(프로토타입)" />
          </h2>
          <span className="text-[11px] text-slate-400">로그인 OP · <b className="text-slate-600">{account.name}</b></span>
        </div>

        {/* 등급 히어로 카드 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* 멤버십 카드 */}
          <div
            className="relative overflow-hidden rounded-xl p-5 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${tierStatus.tier.color}, ${tierStatus.tier.color}cc)` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-90">OHMYHOTEL · OP POINTS</span>
              <span className="text-lg" aria-hidden>◇</span>
            </div>
            <p className="mt-6 text-lg font-extrabold">{account.name}</p>
            <p className="text-[11px] opacity-90">{account.id}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-md bg-white/20 px-2.5 py-1 text-[12px] font-bold">{tierStatus.tier.name} MEMBER</span>
              <span className="text-[11px] opacity-90">자동 가입</span>
            </div>
          </div>

          {/* 등급 진행 + 혜택 */}
          <Card className="flex flex-col justify-center">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] text-slate-500">현재 등급</p>
                <p className="text-xl font-extrabold" style={{ color: tierStatus.tier.color }}>{tierStatus.tier.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500">12개월 총적립</p>
                <p className="text-lg font-bold text-slate-800">{pt(summary.earned)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500">등급 혜택</p>
                <p className="text-lg font-bold text-brand-600">{boostPct > 0 ? `+${boostPct}% 적립` : '기본 적립'}</p>
              </div>
            </div>

            {/* 진행 막대 */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {tierStatus.next ? <>다음 등급 <b className="text-slate-700">{tierStatus.next.name}</b>까지 <b className="text-brand-600">{pt(tierStatus.toNext)}</b></> : <b className="text-slate-700">최고 등급 달성</b>}
                </span>
                <span className="text-slate-400">{TIERS.map((t) => t.name).join(' · ')}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${Math.round(tierStatus.progress * 100)}%`, background: tierStatus.tier.color }} />
              </div>
            </div>

            {/* 등급표 */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {TIERS.map((t, i) => (
                <div
                  key={t.name}
                  className={`rounded-lg border p-2 text-center ${i === tierStatus.index ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className="text-[11px] font-bold" style={{ color: t.color }}>{t.name}</p>
                  <p className="mt-0.5 text-[9px] text-slate-400">{t.min === 0 ? '기본' : `${pt(t.min)}~`}</p>
                  <p className="text-[10px] font-semibold text-slate-600">{t.boost > 1 ? `+${Math.round((t.boost - 1) * 100)}%` : '—'}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 포인트 상태 카드 (HBX식: 사용가능 / 적립예정 / 사용 / 만료예정) */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <p className="text-[11px] text-slate-500">사용 가능</p>
            <p className="mt-1 text-xl font-bold text-brand-600">{pt(balance)}</p>
            <p className="mt-1 text-[10px] text-slate-400">지금 교환 가능한 포인트</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">적립 예정</p>
            <p className="mt-1 text-xl font-bold text-amber-600">{pt(pendingPoints)}</p>
            <p className="mt-1 text-[10px] text-slate-400">지불 대기 {pending.length}건 (체크아웃 후 지불 시 적립)</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">사용(교환)</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(redeemedPts)}</p>
            <p className="mt-1 text-[10px] text-slate-400">Tango 교환 {redeemed.length}건</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">만료 예정</p>
            <p className="mt-1 text-xl font-bold text-rose-500">{pt(expiringPoints)}</p>
            <p className="mt-1 text-[10px] text-slate-400">적립 후 1년 경과 임박분</p>
          </Card>
        </div>

        {/* 본문 2단 — 좌: 안내·필터·내역·예정 / 우: Tango 교환 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-3">
        {/* 적립 안내 */}
        <Card>
          <p className="text-[13px] font-bold text-slate-800">적립 안내</p>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-600">
            <li>• 닷비즈 예약이 <b>투숙 완료 + 지불 완료</b>되면 오마이포인트가 <b>자동 적립</b>됩니다. (별도 가입 불필요 · 취소·노쇼·환불 제외)</li>
            <li>• 선불 업체는 <b>체크아웃 시점</b>, 후불 업체는 <b>체크아웃 후 지불 완료 시점</b>에 적립. 지불 대기 건은 아래 <b>‘적립 예정’</b>에 표시됩니다.</li>
            <li>• <b className="text-brand-600">등급이 오를수록 더 많이 적립</b>됩니다 (Bronze→Diamond). <b className="text-brand-600">프로모션 호텔</b>은 추가 적립 <span className="rounded-sm bg-brand-500 px-1 py-px text-[9px] font-bold text-white">150% 적립</span> 배지.</li>
            <li>• 적립 포인트는 <b>Tango 기프트카드</b>로 교환 — 값 선택 후 <b>이메일로 고유 링크</b>가 발송되고, Tango에서 <b>1,000+ 브랜드</b> 중 선택합니다. (최소 {pt(MIN_REDEEM)}부터 · 유효기간 1년)</li>
            <li>• 포인트는 <b>예약 담당자(OP) 개인 계정</b>에 적립됩니다. (계정별 분리)</li>
          </ul>
        </Card>

        {/* 기간 필터 */}
        <Card className="!p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-slate-700">기간 필터</span>
            <select
              value={basis}
              onChange={(e) => setBasis(e.target.value as DateBasis)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none"
              title="정렬·필터 기준일"
            >
              <option value="stay">투숙 완료일</option>
              <option value="paid">결재 완료일</option>
            </select>
            <input
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(e) => setRange((rr) => ({ ...rr, from: e.target.value }))}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => setRange((rr) => ({ ...rr, to: e.target.value }))}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <button type="button" onClick={() => setRange(defaultRange)} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">최근 월</button>
            <button type="button" onClick={() => setRange({ from: '', to: '' })} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">전체</button>
            <span className="ml-auto text-[10px] text-slate-400">적립 <b className="text-slate-600">{fAccruals.length}</b>건 · 예정 <b className="text-slate-600">{fPending.length}</b>건 표시</span>
          </div>
          {basis === 'paid' && (
            <p className="mt-1.5 text-[10px] text-slate-400">※ ‘적립 예정’은 결재 완료일이 없어(지불 대기) 투숙 완료일 기준으로 필터됩니다.</p>
          )}
        </Card>

        {/* 적립 내역 */}
        <Card>
          <p className="mb-2 text-[13px] font-bold text-slate-800">
            적립 내역{' '}
            <span className="text-[11px] font-normal text-slate-400">
              (투숙 완료 + 지불 완료 · {basis === 'stay' ? '투숙 완료일' : '결재 완료일'}순 · 표시 {fAccruals.length}건 / 전체 {accruals.length}건)
            </span>
          </p>
          <AccrualTable rows={fAccruals} onOpenBooking={onOpenBooking} pointHeader="적립 포인트" pointClass="text-brand-600" />
        </Card>

        {/* 적립 예정 */}
        {pending.length > 0 && (
          <Card>
            <p className="mb-1 flex flex-wrap items-center gap-2 text-[13px] font-bold text-slate-800">
              적립 예정 <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">지불 대기 {pending.length}건</span>
              <span className="text-[11px] font-normal text-slate-400">투숙은 완료됐으나 지불 미완결 — 지불 완료 시 적립 · 표시 {fPending.length}건</span>
            </p>
            <p className="mb-2 text-[10px] text-slate-400">예정 포인트 합계 {pt(pendingPoints)} — 후불 업체는 체크아웃 후 지불이 완료되면 적립됩니다. (투숙 완료일 기준 필터)</p>
            <AccrualTable rows={fPending} onOpenBooking={onOpenBooking} pointHeader="예정 포인트" pointClass="text-amber-600" showPayment />
          </Card>
        )}
        </div>{/* /좌 컬럼 */}

        {/* 우: Tango 교환 */}
        <div className="min-w-0 space-y-3">
          <Card>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-slate-800">리워드 교환</p>
              <span className="rounded bg-[#4b2fbf] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white">TANGO</span>
            </div>
            <p className="mb-3 text-[10px] leading-relaxed text-slate-400">
              적립 포인트를 <b className="text-slate-500">Tango 기프트카드</b>로 교환합니다. 값을 선택하면 <b>등록 이메일로 고유 링크</b>가 발송되고,
              Tango(1,000+ 브랜드·기프트/선불카드·기부)에서 원하는 상품을 고릅니다. 최소 {pt(MIN_REDEEM)}부터.
            </p>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <p className="text-[10px] text-slate-500">사용 가능</p>
              <p className="text-2xl font-extrabold text-brand-600">{pt(balance)}</p>
            </div>

            <p className="mb-1.5 mt-3 text-[11px] font-bold text-slate-600">교환 값 선택</p>
            <div className="grid grid-cols-2 gap-2">
              {REDEEM_VALUES.map((v) => {
                const ok = balance >= v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRedeemValue(v)}
                    disabled={!ok}
                    className={`rounded-lg border p-3 text-center transition ${
                      ok ? 'border-slate-200 hover:border-brand-300 hover:bg-slate-50' : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                    }`}
                  >
                    <p className="text-[15px] font-extrabold text-slate-800">{pt(v)}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{ok ? 'Tango 기프트카드' : '포인트 부족'}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              ※ 실제 기프트카드 액면가·브랜드는 Tango에서 선택합니다(우리 화면은 포인트만). 연간 교환 한도는 정책 확정 예정.
            </p>
          </Card>

          {/* 교환 내역 */}
          <Card>
            <p className="mb-2 text-[13px] font-bold text-slate-800">
              교환 내역 <span className="text-[11px] font-normal text-slate-400">(Tango {redeemed.length}건)</span>
            </p>
            {redeemed.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] leading-relaxed text-slate-400">
                포인트를 <b>Tango로 교환</b>하면<br />여기에 내역이 표시됩니다.
              </p>
            ) : (
              <div className="space-y-2">
                {redeemed.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
                    <div>
                      <p className="text-[12px] font-bold text-slate-800">Tango 기프트카드 · {pt(v.points)}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">교환일 {v.at}</p>
                    </div>
                    <span className="shrink-0 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">이메일 발송</span>
                  </div>
                ))}
                <p className="text-[10px] leading-relaxed text-slate-400">※ 세션 내에서만 표시됩니다(새로고침 시 초기화). 실제 시스템은 Tango API로 고유 링크를 이메일 발송·정산.</p>
              </div>
            )}
          </Card>
        </div>
        </div>{/* /본문 2단 */}

        {/* ELLIS 내부 프로모 관리 (고객 비노출) */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setShowEllis((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-[12px] font-bold text-slate-700">🔧 ELLIS 내부 — 포인트 프로모 관리 <span className="font-normal text-slate-400">(고객 비노출 · 시연)</span></span>
            <span className="text-[10px] text-slate-400">{showEllis ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>

          {showEllis && (
            <div className="mt-3">
              <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                포인트 배수는 <b className="text-slate-700">ELLIS 내부 시스템</b>에서만 변경합니다. <b>지정 호텔 · 기간(예약일) · 룸타입</b>에만 적용되며,
                고객 화면엔 요율(내부 기본 {OP_POINT_POLICY.baseRatePct}%)이 아니라 <b>배수 배지</b>로만 노출됩니다. 아래는 배수·활성 변경 시연.
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
                        <td className="px-3 py-2 text-slate-700">
                          {p.hotelName} <span className="font-mono text-[10px] text-slate-400">{p.hotelId}</span>
                        </td>
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
                        <td className="px-3 py-2 text-center">
                          <span className="rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{Math.round(p.multiplier * 100)}% 적립</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={p.active}
                            onChange={(e) => setPromo(p.id, { active: e.target.checked })}
                            className="accent-brand-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">
                ※ 실제로는 ELLIS 내부에서 관리(호텔·기간·룸타입 지정 CRUD). 여기선 배수·활성만 시연 — 값 변경 시 위 적립 내역·요약이 즉시 재계산됩니다.
              </p>
            </div>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-slate-400">
          프로토타입(HBX/Bedsonline 벤치마크 반영) — <b>자동 적립 + 등급제(Bronze~Diamond)</b>, 리딤은 <b>Tango(aggregator) 연동</b>(상품몰·바우처 자체 제작 없음).
          포인트는 <b>OP 계정별 분리</b>. {account.name} 계정 예약 {myBookings.length}건 중 <b>투숙 완료 + 지불 완료</b> {summary.eligibleCount}건에서 파생. 적립·부킹스는 같은 데이터 → 예약 코드로 상호 확인.
          교환은 세션 내에서만 표시(새로고침 시 초기화). 정책 확정 대상: 기본 요율·등급 임계값/부스트·환율·포인트 가치·연간 교환 한도·세무·Tango 정산.
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
              <button
                type="button"
                onClick={() => { doRedeem(redeemValue); setRedeemValue(null); }}
                className="flex-1 rounded bg-brand-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-600"
              >
                교환하기
              </button>
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
