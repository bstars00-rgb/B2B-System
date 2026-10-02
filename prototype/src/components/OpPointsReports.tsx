import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import type { GiftRedemption } from '../mocks/giftCatalog';
import type { PointPromo } from '../mocks/opPointsPromos';
import type { Tier } from '../utils/opPoints';
import {
  accountLedger,
  companyLedgers,
  expiryForecast,
  issuanceByMonth,
  monthlyStatement,
  promoReport,
} from '../utils/opPointsStore';

/**
 * 오피포인트 리포트 — Phase 2 Q&A No.7.
 *  셀러(Marketplace): ① 포인트 명세(적립·교환·소멸·잔액) ② 회사 OP별 현황(Super User 전용·읽기 전용) ③ 소멸 예정
 *  관리자(ELLIS): ① 프로모 비용 ② 미사용 포인트 부채 ③ 교환·정산 ④ 기간별 발행 ⑤ 호텔·캠페인별 성과
 * **프로토타입 · 폐기 가능.** 집계는 utils/opPointsStore.ts.
 */

const pt = (n: number) => `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} P`;
const krw = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;
const usd = (n: number) => `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const th = 'px-3 py-1.5 font-semibold';
const td = 'px-3 py-1.5';

interface Common {
  companyBookings: Booking[];
  redemptions: GiftRedemption[];
  today: string;
  promos: PointPromo[];
  unitKRW: number;
  tiers: Tier[];
}

// ─────────────────────────── 셀러 리포트 ───────────────────────────
export function SellerReports({ accountId, companyName, isSuperUser, ...c }: Common & { accountId: string; companyName: string; isSuperUser: boolean }) {
  const [tab, setTab] = useState<'statement' | 'roster' | 'expiry'>('statement');
  const ledger = useMemo(() => accountLedger(accountId, c.companyBookings, c.redemptions, c.today, c.promos, c.unitKRW, c.tiers), [accountId, c.companyBookings, c.redemptions, c.today, c.promos, c.unitKRW, c.tiers]);
  const statement = useMemo(() => monthlyStatement(ledger.accruals, c.redemptions, accountId, c.today), [ledger, c.redemptions, accountId, c.today]);
  const forecast = useMemo(() => expiryForecast(ledger.accruals, c.today), [ledger, c.today]);
  const roster = useMemo(() => (isSuperUser ? companyLedgers(c.companyBookings, c.redemptions, c.today, c.promos, c.unitKRW, c.tiers) : []), [isSuperUser, c.companyBookings, c.redemptions, c.today, c.promos, c.unitKRW, c.tiers]);
  const tabs: { key: typeof tab; label: string; show: boolean }[] = [
    { key: 'statement', label: '포인트 명세', show: true },
    { key: 'roster', label: '회사 OP별 현황', show: isSuperUser },
    { key: 'expiry', label: '소멸 예정', show: true },
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-bold text-slate-800">포인트 리포트</p>
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tab === t.key ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'statement' && (
        <>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[560px] text-[11px]">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500"><th className={`${th} text-left`}>월</th><th className={`${th} text-right`}>적립</th><th className={`${th} text-right`}>교환</th><th className={`${th} text-right`}>소멸</th><th className={`${th} text-right`}>월말 잔액</th></tr></thead>
              <tbody>
                {statement.map((r) => (
                  <tr key={r.month} className="border-b border-slate-100 last:border-0">
                    <td className={`${td} text-slate-600`}>{r.month}</td>
                    <td className={`${td} text-right text-brand-600`}>{r.earned ? `+${pt(r.earned)}` : '—'}</td>
                    <td className={`${td} text-right text-slate-600`}>{r.redeemed ? `−${pt(r.redeemed)}` : '—'}</td>
                    <td className={`${td} text-right text-rose-500`}>{r.expired ? `−${pt(r.expired)}` : '—'}</td>
                    <td className={`${td} text-right font-semibold text-slate-800`}>{pt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">최근 12개월 · 적립일 = 지불 완료일 · 지불 대기 {ledger.pending.length}건은 지불 완료 시 적립</p>
        </>
      )}
      {tab === 'roster' && isSuperUser && (
        <>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[620px] text-[11px]">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500"><th className={`${th} text-left`}>OP 계정</th><th className={`${th} text-right`}>총적립</th><th className={`${th} text-right`}>사용(교환)</th><th className={`${th} text-right`}>소멸</th><th className={`${th} text-right`}>사용 가능</th><th className={`${th} text-right`}>1개월 내 소멸</th></tr></thead>
              <tbody>
                {roster.map(({ account, ledger: l }) => (
                  <tr key={account.id} className="border-b border-slate-100 last:border-0">
                    <td className={`${td} text-slate-700`}>{account.name} <span className="font-mono text-[10px] text-slate-400">{account.id}</span></td>
                    <td className={`${td} text-right`}>{pt(l.earned)}</td>
                    <td className={`${td} text-right`}>{pt(l.redeemed)}</td>
                    <td className={`${td} text-right text-rose-500`}>{pt(l.expired)}</td>
                    <td className={`${td} text-right font-bold text-brand-600`}>{pt(l.balance)}</td>
                    <td className={`${td} text-right text-amber-600`}>{pt(l.expiringSoon)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">{companyName} 대표(Super User) 전용 · <b>읽기 전용</b> — 포인트는 각 OP 소유, 대신 교환·이전 불가(Q&amp;A No.6). Staff list에도 같은 값 표시.</p>
        </>
      )}
      {tab === 'expiry' && (
        <>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
            {forecast.map((r) => (
              <div key={r.month} className={`rounded border px-2 py-1.5 text-center text-[10px] ${r.points > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-slate-500">{r.month}</p>
                <p className={`font-bold ${r.points > 0 ? 'text-amber-700' : 'text-slate-300'}`}>{r.points > 0 ? pt(r.points) : '—'}</p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">앞으로 12개월 월별 소멸 예정(적립 후 1년) — 소멸 전에 교환하세요. 회계년도 마감 연동 여부는 확정 예정.</p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────── ELLIS 운영 리포트 ───────────────────────────
export function EllisReports({ deposit, ...c }: Common & { deposit: number }) {
  const ledgers = useMemo(() => companyLedgers(c.companyBookings, c.redemptions, c.today, c.promos, c.unitKRW, c.tiers), [c.companyBookings, c.redemptions, c.today, c.promos, c.unitKRW, c.tiers]);
  const all = useMemo(() => ledgers.flatMap((x) => x.ledger.accruals), [ledgers]);
  const promo = useMemo(() => promoReport(all, c.promos, c.unitKRW, c.tiers), [all, c.promos, c.unitKRW, c.tiers]);
  const issuance = useMemo(() => issuanceByMonth(all, c.today, c.unitKRW), [all, c.today, c.unitKRW]);
  const liabilityPts = ledgers.reduce((s, x) => s + x.ledger.balance, 0);
  const soonPts = ledgers.reduce((s, x) => s + x.ledger.expiringSoon, 0);
  const byStatus = (st: GiftRedemption['status']) => c.redemptions.filter((r) => r.status === st);
  const charged = c.redemptions.filter((r) => r.orderNo).reduce((s, r) => s + r.usd, 0);
  const box = 'rounded border border-slate-200 bg-white p-3';
  const h = 'mb-1.5 text-[11px] font-bold text-slate-700';
  return (
    <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-[12px] font-bold text-slate-800">운영 리포트 <span className="font-normal text-slate-400">(ELLIS · 회사 전체 OP 합산 · Phase 2 Q&amp;A No.7)</span></p>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {/* ① 프로모 비용 */}
        <div className={box}>
          <p className={h}>① 프로모 비용 — 추가 지급 포인트 × 1P 가치</p>
          <table className="w-full text-[11px]">
            <thead><tr className="text-slate-500"><th className="py-1 text-left font-semibold">캠페인</th><th className="py-1 text-right font-semibold">예약</th><th className="py-1 text-right font-semibold">추가 포인트</th><th className="py-1 text-right font-semibold">비용</th></tr></thead>
            <tbody>
              {promo.byPromo.map((r) => (
                <tr key={r.promo.id} className="border-t border-slate-100">
                  <td className="py-1 text-slate-700">{r.promo.hotelName} <span className="text-slate-400">{r.promo.multiplier}X{r.promo.active ? '' : ' · 비활성'}</span></td>
                  <td className="py-1 text-right">{r.bookings}</td>
                  <td className="py-1 text-right">{pt(r.bonusPts)}</td>
                  <td className="py-1 text-right font-semibold">{krw(r.bonusKRW)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200"><td className="py-1 text-slate-700">등급 추가분 (Silver~Diamond)</td><td className="py-1 text-right">—</td><td className="py-1 text-right">{pt(promo.tierBonusPts)}</td><td className="py-1 text-right font-semibold">{krw(promo.tierBonusKRW)}</td></tr>
            </tbody>
          </table>
        </div>
        {/* ② 미사용 포인트 부채 */}
        <div className={box}>
          <p className={h}>② 미사용 포인트 부채 — 사용 가능 포인트 × 1P 가치</p>
          <table className="w-full text-[11px]">
            <tbody>
              {ledgers.map(({ account, ledger: l }) => (
                <tr key={account.id} className="border-t border-slate-100 first:border-0"><td className="py-1 text-slate-700">{account.name}</td><td className="py-1 text-right">{pt(l.balance)}</td><td className="py-1 text-right font-semibold">{krw(l.balance * c.unitKRW)}</td></tr>
              ))}
              <tr className="border-t border-slate-200"><td className="py-1 font-bold text-slate-800">합계</td><td className="py-1 text-right font-bold">{pt(liabilityPts)}</td><td className="py-1 text-right font-bold text-brand-600">{krw(liabilityPts * c.unitKRW)}</td></tr>
            </tbody>
          </table>
          <p className="mt-1 text-[10px] text-slate-400">1개월 내 소멸 예정 {pt(soonPts)} · 실사용(교환)률에 따라 실제 비용은 더 낮음</p>
        </div>
        {/* ③ 교환·정산 */}
        <div className={box}>
          <p className={h}>③ 교환·정산 — Giftronaut 주문·Balance</p>
          <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
            {([['발송', 'sent'], ['반송', 'bounced'], ['처리 중', 'processing'], ['실패', 'failed']] as const).map(([lab, st]) => (
              <div key={st} className="rounded bg-slate-50 py-1.5"><p className="text-slate-500">{lab}</p><p className="font-bold text-slate-800">{byStatus(st).length}건</p><p className="text-[10px] text-slate-400">{pt(byStatus(st).reduce((s, r) => s + r.points, 0))}</p></div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600">Balance 차감 누계 <b>{usd(charged)}</b> · 남은 Balance <b>{usd(deposit)}</b> · 원장 대사: <code>GET /balance/ledger</code> referenceNumber = orderId</p>
        </div>
        {/* ④ 기간별 발행 */}
        <div className={box}>
          <p className={h}>④ 기간별 발행 — 월별 적립 포인트·원화 가치</p>
          <div className="grid grid-cols-6 gap-1.5 text-center text-[10px]">
            {issuance.map((r) => (
              <div key={r.month} className="rounded bg-slate-50 py-1.5"><p className="text-slate-500">{r.month.slice(2)}</p><p className="font-bold text-slate-800">{pt(r.points)}</p><p className="text-slate-400">{krw(r.krw)}</p></div>
            ))}
          </div>
        </div>
        {/* ⑤ 호텔·캠페인별 성과 */}
        <div className={`${box} xl:col-span-2`}>
          <p className={h}>⑤ 호텔·캠페인별 성과 — 배수 프로모 호텔</p>
          <table className="w-full text-[11px]">
            <thead><tr className="text-slate-500"><th className="py-1 text-left font-semibold">호텔 · 캠페인</th><th className="py-1 text-left font-semibold">기간(예약일)</th><th className="py-1 text-right font-semibold">적립 예약</th><th className="py-1 text-right font-semibold">예약액(₩)</th><th className="py-1 text-right font-semibold">발행 포인트</th><th className="py-1 text-right font-semibold">프로모 비용</th><th className="py-1 text-right font-semibold">비용/예약액</th></tr></thead>
            <tbody>
              {promo.byPromo.map((r) => (
                <tr key={r.promo.id} className="border-t border-slate-100">
                  <td className="py-1 text-slate-700">{r.promo.hotelName} <span className="text-slate-400">{r.promo.multiplier}X</span></td>
                  <td className="py-1 text-slate-500">{r.promo.start} ~ {r.promo.end}</td>
                  <td className="py-1 text-right">{r.bookings}</td>
                  <td className="py-1 text-right">{krw(r.ttvKRW)}</td>
                  <td className="py-1 text-right">{pt(r.points)}</td>
                  <td className="py-1 text-right">{krw(r.bonusKRW)}</td>
                  <td className="py-1 text-right">{r.ttvKRW ? `${((r.bonusKRW / r.ttvKRW) * 100).toFixed(2)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
