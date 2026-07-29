import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { formatMoney } from '../utils/format';
import { todayIso } from '../utils/dashboardStats';
import { OP_POINT_RULES, computeAccruals, monthlyRollup, pointsFor, summarize } from '../utils/opPoints';
import { MALL_ITEMS, type MallItem } from '../mocks/opPointsMall';

/**
 * OP 포인트 — 3차 고도화(오피포인트). **프로토타입 · 폐기 가능.**
 *
 * OP 포인트 = **고객(OP)이 닷비즈로 예약하고 실제 투숙을 완료하면** 적립되는 고객 리워드.
 * 취소·노쇼·환불은 제외. 일정 이상 쌓이면 포인트몰에서 상품/혜택으로 교환.
 * 목적: 타 B2B 플랫폼과의 차별화 · 닷비즈 재이용·예약 충성도 강화 · 가격경쟁이 아닌 추가 혜택.
 *
 * ⚠ 초기 결정 필요(표현상 주의): 포인트를 **예약 담당자 개인**에게 줄지(개인형) **고객사 회사
 *   계정**에 줄지(법인형). 개인형은 고객사 내부 규정·컴플라이언스 이슈가 될 수 있다. 아래 토글로 시연.
 *
 * ※ 폐기 용이성: 예약 데이터를 읽기만 함(Booking 타입·seed 불변). 폐기 = 이 파일 + opPoints.ts +
 *   opPointsMall.ts + 사이드바 메뉴 한 줄 삭제.
 */

const ACCOUNT = { company: 'ATTIC TOURS', manager: 'TYO SALES' };
const pt = (n: number) => `${n.toLocaleString('ko-KR')} P`;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export default function OpPointsPage({ bookings }: { bookings: Booking[] }) {
  const today = todayIso();
  const [mode, setMode] = useState<'corp' | 'individual'>('corp');
  const [redeemed, setRedeemed] = useState<{ item: MallItem; at: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const accruals = useMemo(() => computeAccruals(bookings, today), [bookings, today]);
  const rollup = useMemo(() => monthlyRollup(accruals), [accruals]);
  const summary = useMemo(() => summarize(accruals, today), [accruals, today]);
  const redeemedTotal = redeemed.reduce((s, r) => s + r.item.cost, 0);
  const balance = summary.earned - redeemedTotal;

  const redeem = (item: MallItem) => {
    if (balance < item.cost) {
      setToast(`포인트가 부족합니다 (필요 ${pt(item.cost)}, 보유 ${pt(balance)})`);
      return;
    }
    setRedeemed((prev) => [{ item, at: today }, ...prev]);
    setToast(`✓ ${item.name} 교환 완료 — ${pt(item.cost)} 차감`);
  };

  const owner = mode === 'corp' ? `${ACCOUNT.company} (회사 계정)` : `${ACCOUNT.manager} (예약 담당자 개인)`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
      <div className="mx-auto max-w-[1080px] space-y-3">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
            OP Points — 고객 리워드
            <EnhBadge note="오피포인트 — 닷비즈 예약·투숙 완료 리워드(3차 테스트용 프로토타입)" />
          </h2>
          <span className="text-[11px] text-slate-400">적립 대상: <b className="text-slate-600">{owner}</b></span>
        </div>

        {/* 개인형/법인형 결정 배너 (표현상 주의점) — 다크 대응(dark: 변형) */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300">⚠ 초기 결정 — 포인트 적립 대상</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-200/90">
            포인트를 <b>예약 담당자 개인</b>에게 줄지, <b>고객사 회사 계정</b>에 줄지 먼저 정해야 합니다.
            개인형은 고객사 내부 규정·컴플라이언스 이슈가 될 수 있어, 초기엔 <b>법인형(회사 계정)</b>이 안전합니다.
          </p>
          <div className="mt-2 inline-flex overflow-hidden rounded border border-amber-300 text-xs dark:border-amber-500/50">
            {([
              { id: 'corp', label: '법인형 (회사 계정)' },
              { id: 'individual', label: '개인형 (담당자 개인)' },
            ] as const).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`px-3 py-1 font-medium ${
                  mode === m.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-amber-700 hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'individual' && (
            <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-400">
              ※ 개인형: 예약 담당자 개인 계정에 적립됩니다 — 고객사 내부 규정 확인 필요(리베이트/컴플라이언스).
            </p>
          )}
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <p className="text-[11px] text-slate-500">보유 포인트</p>
            <p className="mt-1 text-xl font-bold text-brand-600">{pt(balance)}</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">총 적립</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(summary.earned)}</p>
            <p className="mt-1 text-[10px] text-slate-400">완료 투숙 {summary.eligibleCount}건</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">사용(리딤)</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(redeemedTotal)}</p>
            <p className="mt-1 text-[10px] text-slate-400">{redeemed.length}건 교환</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">이번 달 적립</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(summary.thisMonthEarned)}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${summary.thisMonthCapUsage * 100}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">월 한도 {pt(OP_POINT_RULES.monthlyCap)} 기준</p>
          </Card>
        </div>

        {/* 적립 규칙 정의 */}
        <Card>
          <p className="text-[13px] font-bold text-slate-800">적립 규칙 정의</p>

          {/* 1) 적립 대상 조건 */}
          <p className="mt-2 text-[12px] font-bold text-slate-700">① 적립 대상 조건</p>
          <ul className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-slate-600">
            <li>• 닷비즈에서 생성한 예약이 <b>실제 투숙 완료</b>(check-out 경과)된 건.</li>
            <li>• <b>취소·노쇼·환불 예약 제외</b> — 완료 투숙만 인정.</li>
            <li>• 적립 시점: 투숙 완료(체크아웃) 이후 확정.</li>
          </ul>

          {/* 2) 적립 공식 */}
          <p className="mt-3 text-[12px] font-bold text-slate-700">② 적립 공식 <span className="font-normal text-slate-400">(건별 = 기본 + 금액 + 보너스)</span></p>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[11px]">
              <tbody className="[&_td]:border-b [&_td]:border-slate-100 [&_td]:px-2 [&_td]:py-1.5">
                <tr>
                  <td className="w-28 font-semibold text-slate-700">기본 (빈도)</td>
                  <td><b className="text-brand-600">{OP_POINT_RULES.base} P</b> / 완료 건</td>
                  <td className="text-slate-400">금액과 무관 — 닷비즈 이용 빈도 보상, 고가 예약 집중 완화</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-700">금액 (실적)</td>
                  <td>{formatMoney(OP_POINT_RULES.amountUnitYen, 'JPY')}당 <b className="text-brand-600">+{OP_POINT_RULES.amountPerYen} P</b>, 건당 최대 {OP_POINT_RULES.amountCapPerBooking} P</td>
                  <td className="text-slate-400">상한으로 고가 예약 1건 독식 방지({formatMoney(OP_POINT_RULES.amountUnitYen * (OP_POINT_RULES.amountCapPerBooking / OP_POINT_RULES.amountPerYen), 'JPY')}에서 상한 도달)</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-700">보너스</td>
                  <td>추천/프로모션 호텔 <b className="text-brand-600">+{OP_POINT_RULES.promoBonus} P</b></td>
                  <td className="text-slate-400">전략 상품으로 예약 유도 (확장: 장기 투숙 등)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 예시 계산 */}
          <div className="mt-2 rounded bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
            <b className="text-slate-700">예시</b> — {formatMoney(120000, 'JPY')} · 추천 호텔 예약 완료 시:{' '}
            {(() => { const p = pointsFor(120000, true); return (
              <span>기본 {p.base} + 금액 {p.amountPts} + 보너스 {p.bonus} = <b className="text-brand-600">{p.total} P</b> ≈ {formatMoney(Math.round(p.total * OP_POINT_RULES.pointValueYen), 'JPY')} 상당</span>
            ); })()}
          </div>

          {/* 3) 한도·정책 */}
          <p className="mt-3 text-[12px] font-bold text-slate-700">③ 한도 · 정책</p>
          <ul className="mt-1 grid gap-0.5 text-[11px] leading-relaxed text-slate-600 sm:grid-cols-2">
            <li>• <b>월 적립 한도</b>: {pt(OP_POINT_RULES.monthlyCap)} (투숙 완료 월 기준, 초과분 미지급) — 비용·부채 통제</li>
            <li>• <b>리딤 최소</b>: {pt(OP_POINT_RULES.redeemMinimum)} 이상부터 교환</li>
            <li>• <b>포인트 가치(지표)</b>: 1 P ≈ {formatMoney(OP_POINT_RULES.pointValueYen, 'JPY')} (포인트몰 기준 역산)</li>
            <li>• <b>유효기간(제안)</b>: 적립일로부터 {OP_POINT_RULES.expiryMonths}개월</li>
          </ul>

          <p className="mt-2 text-[10px] text-amber-600">
            ※ 수치는 <b>프로토타입 제안값</b> — 적립률·월 한도·유효기간·포인트 가치·세무 처리는 법무/재무 검토 후 확정.
          </p>
        </Card>

        {/* 월별 적립 요약 (월 한도 적용) */}
        <Card>
          <p className="mb-2 text-[13px] font-bold text-slate-800">월별 적립 <span className="text-[11px] font-normal text-slate-400">(투숙 완료 월 기준 · 월 한도 {pt(OP_POINT_RULES.monthlyCap)})</span></p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-1.5 text-left font-medium">월</th>
                  <th className="px-3 py-1.5 text-right font-medium">완료 투숙</th>
                  <th className="px-3 py-1.5 text-right font-medium">소계</th>
                  <th className="px-3 py-1.5 text-right font-medium">월 한도 적용</th>
                  <th className="px-3 py-1.5 text-right font-medium">실적립</th>
                </tr>
              </thead>
              <tbody>
                {rollup.map((r) => (
                  <tr key={r.month} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-1.5 font-medium text-slate-700">{r.month}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{r.count}건</td>
                    <td className="px-3 py-1.5 text-right text-slate-500">{pt(r.subtotal)}</td>
                    <td className="px-3 py-1.5 text-right">
                      {r.capped > 0 ? <span className="text-amber-600">−{pt(r.capped)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-brand-600">{pt(r.awarded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 적립 내역 */}
        <Card>
          <p className="mb-2 text-[13px] font-bold text-slate-800">적립 내역 <span className="text-[11px] font-normal text-slate-400">(투숙 완료 건별 · 최신순 · 월 한도 전)</span></p>
          <div className="max-h-[360px] overflow-auto rounded border border-slate-200">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 [&>th]:sticky [&>th]:top-0 [&>th]:bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold">투숙 완료일</th>
                  <th className="px-3 py-2 text-left font-semibold">호텔</th>
                  <th className="px-3 py-2 text-right font-semibold">예약금액</th>
                  <th className="px-3 py-2 text-right font-semibold">기본</th>
                  <th className="px-3 py-2 text-right font-semibold">금액</th>
                  <th className="px-3 py-2 text-right font-semibold">보너스</th>
                  <th className="px-3 py-2 text-right font-semibold">적립</th>
                </tr>
              </thead>
              <tbody>
                {accruals.map((a) => (
                  <tr key={a.ellisCode} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-600">{a.stayCompleted}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {a.hotelName}
                      {a.promo && <span className="ml-1 rounded-sm bg-brand-50 px-1 py-px text-[9px] font-semibold text-brand-600">PROMO</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatMoney(a.amount, 'JPY')}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{a.base}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{a.amountPts}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{a.bonus || '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-brand-600">{a.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.cappedTotal > 0 && (
            <p className="mt-1.5 text-[10px] text-amber-600">
              ※ 예약별 합계는 월 한도 전 소계입니다 — 월 한도로 {pt(summary.cappedTotal)}가 미지급되어 실보유는 위 요약의 실적립 합({pt(summary.earned)})입니다.
            </p>
          )}
        </Card>

        {/* 포인트몰 */}
        <Card>
          <p className="mb-2 text-[13px] font-bold text-slate-800">포인트몰 <span className="text-[11px] font-normal text-slate-400">(오마이호텔 운영)</span></p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {MALL_ITEMS.map((item) => {
              const affordable = balance >= item.cost;
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
                    <span className="text-[13px] font-bold text-brand-600">{pt(item.cost)}</span>
                    <button
                      type="button"
                      onClick={() => redeem(item)}
                      disabled={!affordable}
                      className={`rounded px-3 py-1 text-[11px] font-semibold ${
                        affordable
                          ? 'bg-brand-500 text-white hover:bg-brand-600'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
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

        <p className="text-[10px] leading-relaxed text-slate-400">
          프로토타입(3차 테스트) — 실제 적용·정책은 이 화면을 보고 판단합니다. 적립은 예약 {bookings.length}건 중 투숙
          완료 {summary.eligibleCount}건에서 파생(취소·미래 투숙 제외). 리딤은 세션 내에서만 반영(새로고침 시 초기화).
          법무/재무 검토 대상: 개인형/법인형 결정 · 포인트 세무 처리 · 적립률·한도.
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
