import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import EnhBadge from './EnhBadge';
import { todayIso } from '../utils/dashboardStats';
import { OP_POINT_POLICY, computeAccruals, computePending, summarize, usdToPoints, type Accrual } from '../utils/opPoints';
import { MALL_COUNTRIES, globalItemsSorted, localItemsSorted, type MallItem, type MallCountry } from '../mocks/opPointsMall';
import { SEED_PROMOS, type PointPromo } from '../mocks/opPointsPromos';
import { OP_ACCOUNTS, opAccountIdFor } from '../mocks/opAccounts';

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

const pt = (n: number) => `${n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} P`;

/** 교환 완료 바우처 — 상품 교환 시 발급, ‘내 바우처’에서 다운로드. */
interface Voucher {
  id: string;
  item: MallItem;
  code: string;
  at: string;
  expires: string;
}

function addMonths(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** 바우처 코드 — OMH-<상품>-<랜덤6>. (프로토타입: 세션 내 발급, 새로고침 시 초기화) */
function makeVoucherCode(item: MallItem): string {
  const seg = item.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'GIFT';
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OMH-${seg}-${rand}`;
}

/** 다운로드용 바우처 HTML(자체 완결 · 인쇄 가능). 실물 없이 코드 제시형. */
function voucherHtml(v: Voucher): string {
  const bars = Array.from({ length: 46 }, (_, i) => {
    const w = ((v.code.charCodeAt(i % v.code.length) + i * 7) % 3) + 1;
    return `<span style="width:${w}px"></span>`;
  }).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OHMYHOTEL 바우처 — ${v.item.name}</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#0f172a;font-family:-apple-system,'Segoe UI',Roboto,'Malgun Gothic',sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.v{width:384px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.45)}
.top{background:linear-gradient(135deg,#fb923c,#ea580c);color:#fff;padding:20px 24px}
.brand{font-size:11px;letter-spacing:.14em;font-weight:700;opacity:.9}
.ttl{font-size:20px;font-weight:800;margin-top:4px}
.body{padding:22px 24px 26px;text-align:center}
.icon{font-size:44px;line-height:1}
.name{font-size:17px;font-weight:800;color:#0f172a;margin-top:10px}
.val{font-size:12px;color:#ea580c;font-weight:700;margin-top:4px}
.codebox{margin:18px 0 12px;padding:14px;border:1.5px dashed #cbd5e1;border-radius:12px;background:#f8fafc}
.clabel{font-size:10px;letter-spacing:.1em;color:#64748b;font-weight:700}
.code{font-family:'SFMono-Regular',Consolas,monospace;font-size:22px;font-weight:800;color:#0f172a;margin-top:6px;letter-spacing:.06em}
.barcode{display:flex;gap:1px;height:52px;justify-content:center;align-items:stretch;margin:10px 0 6px}
.barcode span{display:block;height:100%;background:#0f172a}
.meta{font-size:11px;color:#475569;margin-top:12px}
.how{font-size:11px;color:#64748b;margin-top:10px;line-height:1.5}
.proto{font-size:10px;color:#94a3b8;margin-top:14px;border-top:1px solid #e2e8f0;padding-top:10px}
</style></head><body>
<div class="v">
<div class="top"><div class="brand">OHMYHOTEL · OP POINTS</div><div class="ttl">상품 교환 바우처</div></div>
<div class="body">
<div class="icon">${v.item.icon}</div>
<div class="name">${v.item.name}</div>
<div class="val">USD ${v.item.costUSD} 상당</div>
<div class="codebox"><div class="clabel">VOUCHER CODE</div><div class="code">${v.code}</div></div>
<div class="barcode">${bars}</div>
<div class="meta">발급일 ${v.at} · 유효기간 ${v.expires}</div>
<div class="how">매장 또는 파트너 채널에서 위 <b>바우처 코드</b>를 제시·입력해 사용하세요.</div>
<div class="proto">※ 프로토타입 데모용 바우처 — 실제 결제·사용 불가</div>
</div></div></body></html>`;
}

function downloadVoucher(v: Voucher): void {
  const blob = new Blob([voucherHtml(v)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Voucher-${v.code}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

/** 포인트몰 상품 카드 (우측 사이드바 · 좁은 폭 → 가로 배치) */
function MallCard({ item, balance, onRedeem }: { item: MallItem; balance: number; onRedeem: (i: MallItem) => void }) {
  const cost = usdToPoints(item.costUSD);
  const affordable = balance >= cost;
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2.5">
      <span className="text-2xl leading-none" aria-hidden>{item.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-slate-800">{item.name}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">{item.desc}</p>
        <p className="mt-1 text-[11px]">
          <b className="text-slate-700">USD {item.costUSD}</b> <span className="text-brand-600">≈ {pt(cost)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRedeem(item)}
        disabled={!affordable}
        className={`shrink-0 rounded px-2.5 py-1 text-[11px] font-semibold ${
          affordable ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-slate-100 text-slate-400'
        }`}
      >
        {affordable ? '교환' : '부족'}
      </button>
    </div>
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
  // 교환 확인 팝업 — 교환은 취소 불가라 확인 후 진행
  const [confirmItem, setConfirmItem] = useState<MallItem | null>(null);

  // 로그인 OP 계정 — 포인트는 계정별로 분리. 실제 로그인 계정(프로토타입: 세션의 OP로 고정).
  const accountId = OP_ACCOUNTS[0].id;
  const account = OP_ACCOUNTS.find((a) => a.id === accountId) ?? OP_ACCOUNTS[0];
  // 이 OP 계정이 생성한 예약만 — 같은 회사라도 OP가 다르면 분리
  const myBookings = useMemo(() => bookings.filter((b) => opAccountIdFor(b.ellis_code) === accountId), [bookings, accountId]);

  // 바우처(교환 내역)도 계정별로 분리
  const [redeemedMap, setRedeemedMap] = useState<Record<string, Voucher[]>>({});
  const redeemed = redeemedMap[accountId] ?? [];

  const accruals = useMemo(() => computeAccruals(myBookings, today, promos), [myBookings, today, promos]);
  const pending = useMemo(() => computePending(myBookings, today, promos), [myBookings, today, promos]);
  const pendingPoints = Math.round(pending.reduce((s, a) => s + a.points, 0) * 10) / 10;

  // 날짜 필터 — 적립 내역·예정이 무한정 길어지지 않도록 기간으로 제한. 기본값 = 가장 최근 월.
  const defaultRange = useMemo(() => {
    const stays = myBookings.filter((b) => b.status === 'Confirmed' && b.check_out < today).map((b) => b.check_out.slice(0, 10));
    const maxStay = stays.length ? stays.reduce((m, d) => (d > m ? d : m)) : today;
    return { from: `${maxStay.slice(0, 7)}-01`, to: maxStay };
  }, [myBookings, today]);
  const [basis, setBasis] = useState<DateBasis>('stay');
  const [range, setRange] = useState(defaultRange);

  const inRange = (d: string | null) => !!d && (!range.from || d >= range.from) && (!range.to || d <= range.to);
  // 적립 내역: 기준일(투숙 완료일/결재 완료일) 선택 적용. 예정: 결재 완료일이 없어 투숙 완료일 기준.
  const fAccruals = useMemo(() => accruals.filter((a) => inRange(basis === 'stay' ? a.stayCompleted.slice(0, 10) : a.paidAt)), [accruals, basis, range]);
  const fPending = useMemo(() => pending.filter((a) => inRange(a.stayCompleted.slice(0, 10))), [pending, range]);
  const summary = useMemo(() => summarize(accruals, today), [accruals, today]);
  const redeemedPts = redeemed.reduce((s, r) => s + usdToPoints(r.item.costUSD), 0);
  const balance = Math.round((summary.earned - redeemedPts) * 10) / 10;

  // 포인트몰 — 거래처(고객) 국가별 하나만 노출. 실제로는 계정 국가로 자동 결정.
  // 현재는 **대한민국 고정**(우선 한국만 노출). 다른 국가는 해당 거래처 접속 시 그 나라 몰만 표시.
  const country: MallCountry = 'KR';
  const curr = MALL_COUNTRIES.find((c) => c.code === country) ?? MALL_COUNTRIES[0];
  const globalItems = globalItemsSorted();
  const localItems = localItemsSorted(country);

  const redeem = (item: MallItem) => {
    const cost = usdToPoints(item.costUSD);
    if (balance < cost) {
      setToast(`포인트가 부족합니다 (필요 ${pt(cost)}, 보유 ${pt(balance)})`);
      return;
    }
    const code = makeVoucherCode(item);
    const voucher: Voucher = { id: `${item.id}-${code}`, item, code, at: today, expires: addMonths(today, 12) };
    setRedeemedMap((prev) => ({ ...prev, [accountId]: [voucher, ...(prev[accountId] ?? [])] }));
    setToast(`✓ ${item.name} 교환 완료 — 바우처 발급(${pt(cost)} 차감). ‘내 바우처’에서 다운로드하세요.`);
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => setToast(`바우처 코드 복사됨 — ${code}`),
      () => setToast(`코드: ${code}`),
    );
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
            <EnhBadge note="오피포인트 — 닷비즈 예약·투숙 완료 리워드(3차 테스트용 프로토타입)" />
          </h2>
          <span className="text-[11px] text-slate-400">로그인 OP · <b className="text-slate-600">{account.name}</b></span>
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
            <p className="mt-1 text-[10px] text-slate-400">적립 {summary.eligibleCount}건 · 프로모 {summary.promoCount}건</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">사용(리딤)</p>
            <p className="mt-1 text-xl font-bold text-slate-800">{pt(redeemedPts)}</p>
            <p className="mt-1 text-[10px] text-slate-400">{redeemed.length}건 교환</p>
          </Card>
          <Card>
            <p className="text-[11px] text-slate-500">적립 예정</p>
            <p className="mt-1 text-xl font-bold text-amber-600">{pt(pendingPoints)}</p>
            <p className="mt-1 text-[10px] text-slate-400">지불 대기 {pending.length}건</p>
          </Card>
        </div>

        {/* 본문 2단 — 좌: 적립 안내·필터·내역·예정 / 우: 포인트몰 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-3">
        {/* 적립 안내 (고객 뷰 — 요율·계산식 비노출) */}
        <Card>
          <p className="text-[13px] font-bold text-slate-800">적립 안내</p>
          <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-600">
            <li>• 닷비즈에서 예약하고 <b>투숙을 완료</b>하면 오마이포인트가 적립됩니다. (취소·노쇼·환불 제외)</li>
            <li>• <b>지불이 완료된 예약</b>만 적립됩니다 — 선불 업체는 <b>체크아웃 시점</b>에, 후불 업체는 <b>체크아웃 후 지불 완료 시점</b>에 적립. 지불 대기 건은 아래 <b>‘적립 예정’</b>에 표시됩니다.</li>
            <li>• <b className="text-brand-600">프로모션 호텔</b>은 추가 적립 — 목록·검색에 <span className="rounded-sm bg-brand-500 px-1 py-px text-[9px] font-bold text-white">150% 적립</span> 배지로 표시됩니다.</li>
            <li>• 포인트몰에서 <b>USD 10</b>부터 교환할 수 있습니다. · 포인트 유효기간 <b>1년</b>.</li>
            <li>• 포인트는 <b>예약 담당자(OP) 개인</b>에게 적립됩니다. (고객사 법인 통제를 원하면 고객사 내부적으로 관리)</li>
          </ul>
        </Card>

        {/* 기간 필터 — 적립 내역·예정 공통 (무한정 나열 방지) */}
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
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setRange(defaultRange)}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              최근 월
            </button>
            <button
              type="button"
              onClick={() => setRange({ from: '', to: '' })}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              전체
            </button>
            <span className="ml-auto text-[10px] text-slate-400">
              적립 <b className="text-slate-600">{fAccruals.length}</b>건 · 예정 <b className="text-slate-600">{fPending.length}</b>건 표시
            </span>
          </div>
          {basis === 'paid' && (
            <p className="mt-1.5 text-[10px] text-slate-400">※ ‘적립 예정’은 결재 완료일이 없어(지불 대기) 투숙 완료일 기준으로 필터됩니다.</p>
          )}
        </Card>

        {/* 적립 내역 (고객 뷰 — 금액·요율 비노출, 포인트·배수 배지만) */}
        <Card>
          <p className="mb-2 text-[13px] font-bold text-slate-800">
            적립 내역{' '}
            <span className="text-[11px] font-normal text-slate-400">
              (투숙 완료 + 지불 완료 · {basis === 'stay' ? '투숙 완료일' : '결재 완료일'}순 · 표시 {fAccruals.length}건 / 전체 {accruals.length}건)
            </span>
          </p>
          <AccrualTable rows={fAccruals} onOpenBooking={onOpenBooking} pointHeader="적립 포인트" pointClass="text-brand-600" />
        </Card>

        {/* 적립 예정 (지불 대기 — 후불 등) */}
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

        {/* 우: 포인트몰 (국가별 · USD 기준) + 내 바우처 */}
        <div className="min-w-0 space-y-3">
          <Card>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-slate-800">포인트몰</p>
              <span
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
                title="거래처(고객) 국가 — 계정 국가로 자동 결정. 현재 대한민국."
              >
                {curr.flag} {curr.label}
              </span>
            </div>
            <p className="mb-3 text-[10px] leading-relaxed text-slate-400">
              USD 기준 · 최소 USD 10 (예: USD 10 = {pt(usdToPoints(10))}). 화폐 금액 대신 포인트로 안내.
              포인트몰은 <b className="text-slate-500">거래처 국가별로 하나만</b> 노출됩니다 — 계정 국가로 자동 결정(현재 대한민국).
            </p>

            {/* 국제 공통 */}
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-600">
              🌐 국제 공통 <span className="font-normal text-slate-400">— 어디서나 통용</span>
            </p>
            <div className="space-y-2">
              {globalItems.map((it) => (
                <MallCard key={it.id} item={it} balance={balance} onRedeem={setConfirmItem} />
              ))}
            </div>

            {/* 국가별 로컬 */}
            <p className="mb-1.5 mt-3 flex items-center gap-1 text-[11px] font-bold text-slate-600">
              {curr.flag} {curr.label} 전용 <span className="font-normal text-slate-400">— 해당 국가 내 사용·수령</span>
            </p>
            <div className="space-y-2">
              {localItems.map((it) => (
                <MallCard key={it.id} item={it} balance={balance} onRedeem={setConfirmItem} />
              ))}
            </div>
          </Card>

          {/* 내 바우처 — 교환 완료 상품의 바우처 다운로드 */}
          <Card>
            <p className="mb-2 text-[13px] font-bold text-slate-800">
              내 바우처 <span className="text-[11px] font-normal text-slate-400">(교환 완료 {redeemed.length}건)</span>
            </p>
            {redeemed.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] leading-relaxed text-slate-400">
                포인트몰에서 상품을 <b>교환</b>하면<br />여기에서 <b className="text-slate-500">바우처를 다운로드</b>할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {redeemed.map((v) => (
                  <div key={v.id} className="rounded-lg border border-slate-200 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none" aria-hidden>{v.item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-slate-800">{v.item.name}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">{v.code}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">발급 {v.at} · 유효 {v.expires}</p>
                      </div>
                      <span className="shrink-0 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">사용 가능</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadVoucher(v)}
                        className="flex-1 rounded bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-600"
                      >
                        ⬇ 바우처 다운로드
                      </button>
                      <button
                        type="button"
                        onClick={() => copyCode(v.code)}
                        className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        코드 복사
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] leading-relaxed text-slate-400">※ 바우처는 세션 내에서만 발급·보관됩니다(새로고침 시 초기화). 실제 시스템에선 계정에 영구 저장·이메일 발송.</p>
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
          프로토타입(3차 테스트) — 포인트는 <b>OP 계정별로 분리</b>. {account.name} 계정 예약 {myBookings.length}건 중 <b>투숙 완료 + 지불 완료</b> {summary.eligibleCount}건에서 파생(취소·미래 투숙·지불 대기 제외). 적립·부킹스는 같은 예약 데이터 → 예약 코드로 상호 확인.
          리딤은 세션 내에서만 반영(새로고침 시 초기화). 다통화는 KRW 기준 환율 후 포인트로 환산(화폐값 비노출).
          정책 확정 대상: 적립 정책·환율·포인트 가치·세무 처리.
        </p>
      </div>

      {/* 교환 확인 팝업 — 교환은 취소 불가 */}
      {confirmItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setConfirmItem(null)}
        >
          <div
            className="w-[340px] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-bold text-slate-800">
              포인트 교환 확인
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <span className="text-3xl leading-none" aria-hidden>{confirmItem.icon}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-800">{confirmItem.name}</p>
                  <p className="mt-0.5 text-[11px]">
                    <b className="text-slate-700">USD {confirmItem.costUSD}</b>{' '}
                    <span className="text-brand-600">≈ {pt(usdToPoints(confirmItem.costUSD))} 차감</span>
                  </p>
                </div>
              </div>
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium leading-relaxed text-rose-600">
                ⚠ 포인트 교환은 <b>한 번 하면 취소할 수 없습니다.</b><br />교환하시겠습니까?
              </p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  redeem(confirmItem);
                  setConfirmItem(null);
                }}
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
