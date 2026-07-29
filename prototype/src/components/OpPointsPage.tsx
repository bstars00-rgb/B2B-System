import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { todayIso } from '../utils/dashboardStats';
import { OP_POINT_POLICY, computeAccruals, summarize, usdToPoints } from '../utils/opPoints';
import { MALL_ITEMS, type MallItem } from '../mocks/opPointsMall';
import { SEED_PROMOS, type PointPromo } from '../mocks/opPointsPromos';

/**
 * OP 포인트 — 3차 고도화(오피포인트). **프로토타입 · 폐기 가능.**
 *
 * OP = 닷비즈 이용 고객(OP 개인). 닷비즈 예약·투숙 완료 시 오마이포인트 적립 → USD 기준 포인트몰 리딤.
 * 적립 = 예약금액의 %(다통화 환율 적용) × 지정 호텔 배수(ELLIS 내부 설정). **고객은 요율·계산식을 모르고
 * 배수 배지("150%")만 본다.** 화폐값 포인트 노출 지양(1.4 오마이포인트 형식). 한도 없음, 유효기간 1년.
 * 개인형 확정(법인 통제는 고객사 자율).
 *
 * ※ 폐기: opPoints.ts + 이 파일 + opPointsMall.ts + opPointsPromos.ts + 사이드바 메뉴 한 줄 삭제.
 */

const OWNER = 'TYO SALES (예약 담당자 · OP 개인)';
const pt = (n: number) => `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} P`;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

/** 배수 배지 — 고객에겐 요율이 아닌 "배수(%)"만 노출 */
function PromoBadge({ label }: { label: string }) {
  return (
    <span className="ml-1 rounded-sm bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{label} 적립</span>
  );
}

export default function OpPointsPage({ bookings }: { bookings: Booking[] }) {
  const today = todayIso();
  const [promos, setPromos] = useState<PointPromo[]>(SEED_PROMOS);
  const [redeemed, setRedeemed] = useState<{ item: MallItem; at: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [showEllis, setShowEllis] = useState(false);

  const accruals = useMemo(() => computeAccruals(bookings, today, promos), [bookings, today, promos]);
  const summary = useMemo(() => summarize(accruals, today), [accruals, today]);
  const redeemedPts = redeemed.reduce((s, r) => s + usdToPoints(r.item.costUSD), 0);
  const balance = Math.round((summary.earned - redeemedPts) * 10) / 10;
  const mall = [...MALL_ITEMS].sort((a, b) => a.costUSD - b.costUSD);

  const redeem = (item: MallItem) => {
    const cost = usdToPoints(item.costUSD);
    if (balance < cost) {
      setToast(`포인트가 부족합니다 (필요 ${pt(cost)}, 보유 ${pt(balance)})`);
      return;
    }
    setRedeemed((prev) => [{ item, at: today }, ...prev]);
    setToast(`✓ ${item.name} (USD ${item.costUSD}) 교환 완료 — ${pt(cost)} 차감`);
  };

  const setPromo = (id: string, patch: Partial<PointPromo>) =>
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
      <div className="mx-auto max-w-[1080px] space-y-3">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            OP Points — 고객 리워드
            <EnhBadge note="오피포인트 — 닷비즈 예약·투숙 완료 리워드(3차 테스트용 프로토타입)" />
          </h2>
          <span className="text-[11px] text-slate-400">적립 대상: <b className="text-slate-600">{OWNER}</b></span>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <p className="text-[11px] text-slate-500">보유 포인트</p>
            <p className="mt-1 text-xl font-bold text-brand-600">{pt(balance)}</p>
            <p className="mt-1 text-[10px] text-slate-400">오마이포인트</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">총 적립</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(summary.earned)}</p>
            <p className="mt-1 text-[10px] text-slate-400">완료 투숙 {summary.eligibleCount}건 · 프로모 {summary.promoCount}건</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">사용(리딤)</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(redeemedPts)}</p>
            <p className="mt-1 text-[10px] text-slate-400">{redeemed.length}건 교환</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">최근 30일 적립</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(summary.recentEarned)}</p>
            <p className="mt-1 text-[10px] text-slate-400">투숙 완료 기준</p>
          </Card>
        </div>

        {/* 적립 안내 (고객 뷰 — 요율·계산식 비노출) */}
        <Card>
          <p className="text-[13px] font-bold text-slate-800">적립 안내</p>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-600">
            <li>• 닷비즈에서 예약하고 <b>투숙을 완료</b>하면 오마이포인트가 적립됩니다. (취소·노쇼·환불 제외)</li>
            <li>• <b className="text-brand-600">프로모션 호텔</b>은 추가 적립 — 목록·검색에 <span className="rounded-sm bg-brand-500 px-1 py-px text-[9px] font-bold text-white">150% 적립</span> 배지로 표시됩니다.</li>
            <li>• 포인트몰에서 <b>USD 10</b>부터 교환할 수 있습니다. · 포인트 유효기간 <b>1년</b>.</li>
            <li>• 포인트는 <b>예약 담당자(OP) 개인</b>에게 적립됩니다. (고객사 법인 통제를 원하면 고객사 내부적으로 관리)</li>
          </ul>
        </Card>

        {/* 적립 내역 (고객 뷰 — 금액·요율 비노출, 포인트·배수 배지만) */}
        <Card>
          <p className="mb-2 text-[13px] font-bold text-slate-800">적립 내역 <span className="text-[11px] font-normal text-slate-400">(투숙 완료 · 최신순)</span></p>
          <div className="max-h-[380px] overflow-auto rounded border border-slate-200">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold">투숙 완료일</th>
                  <th className="px-3 py-2 text-left font-semibold">호텔</th>
                  <th className="px-3 py-2 text-right font-semibold">적립 포인트</th>
                </tr>
              </thead>
              <tbody>
                {accruals.map((a) => (
                  <tr key={a.ellisCode} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-600">{a.stayCompleted}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {a.hotelName}
                      {a.promoLabel && <PromoBadge label={a.promoLabel} />}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-brand-600">{pt(a.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 포인트몰 (USD 기준 · 오름차순) */}
        <Card>
          <p className="mb-1 text-[13px] font-bold text-slate-800">포인트몰 <span className="text-[11px] font-normal text-slate-400">(오마이호텔 운영 · USD 기준, 최소 USD 10)</span></p>
          <p className="mb-2 text-[10px] text-slate-400">리딤은 USD 기준입니다 — 예: USD 10 = {pt(usdToPoints(10))} (환율 반영, 화폐 금액 대신 포인트로 안내).</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {mall.map((item) => {
              const cost = usdToPoints(item.costUSD);
              const affordable = balance >= cost;
              return (
                <div key={item.id} className="flex flex-col rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl leading-none" aria-hidden>{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px]">
                      <b className="text-slate-700">USD {item.costUSD}</b>{' '}
                      <span className="text-brand-600">≈ {pt(cost)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => redeem(item)}
                      disabled={!affordable}
                      className={`rounded px-3 py-1 text-[11px] font-semibold ${
                        affordable ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {affordable ? '교환' : '포인트 부족'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

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
          프로토타입(3차 테스트) — 적립은 예약 {bookings.length}건 중 투숙 완료 {summary.eligibleCount}건에서 파생(취소·미래 투숙 제외).
          리딤은 세션 내에서만 반영(새로고침 시 초기화). 다통화는 KRW 기준 환율 후 포인트로 환산(화폐값 비노출).
          정책 확정 대상: 적립 정책·환율·포인트 가치·세무 처리.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white shadow-lg">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-3 text-slate-400 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
}
