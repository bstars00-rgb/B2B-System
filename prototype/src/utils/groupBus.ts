/**
 * 단체 역경매 — Marketplace ↔ Vendor Console **실연동 버스** (프로토타입).
 *
 * 두 앱은 라이브에서 같은 출처(bstars00-rgb.github.io)라 localStorage를 공유한다.
 * 이 키 하나를 양쪽이 읽고 써서 문의 → 호텔 견적 → 낙찰 → 호텔 컨펌/거절 → 계약 동의·결제 → 취소를 주고받는다.
 * (로컬 개발은 포트가 달라 출처가 다르므로 연동되지 않는다 — 라이브에서 확인.)
 *
 * ⚠ Console 저장소의 `src/data/groupBus.ts`와 **같은 스키마**를 유지할 것. 실서비스에선 ELLIS API로 대체.
 */

export const BUS_KEY = 'omh_grp_bus_v1';
const BUS_EVENT = 'omh-grp-bus';

export interface BusRoom {
  roomType: string;
  count: number;
}

/** 셀러가 제출한 단체 문의 (Marketplace → Console) */
export interface BusInquiry {
  ref: string;
  sellerName: string;
  country: string;
  region: string;
  /** 영문 도시명 — Console 호텔 도시와 일치 여부 판정(지역 타깃팅 B: 도시 일치 필수) */
  regionEn: string;
  hotelName?: string;
  anchorName?: string;
  anchorRadiusMin?: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: BusRoom[];
  mealPlan: string;
  guests: number;
  nationality?: string;
  groupType?: string;
  scope: 'rooms' | 'rooms_plus';
  ancillary?: string[];
  ancillaryNote?: string;
  holdRequired?: boolean;
  goldenKey?: string;
  notes?: string;
  budgetPerRoomNight?: number;
  budgetTotal?: number;
  currency: string;
  /** 국가 요금 구조 — Net(net+마크업) / Commission(단가+커미션) */
  contractType: 'Net' | 'Commission';
  /** 커미션 국가의 커미션율(%) — 호텔 정산용. 마크업률은 호텔에 보내지 않는다 */
  commissionPct?: number;
  quoteDeadline: string;
  publishedAt: string;
}

/** 호텔 견적 (Console → Marketplace) */
export interface BusQuote {
  ref: string;
  quoteId: string;
  hotelCode: string;
  hotelName: string;
  city: string;
  star?: number;
  /** 국가 요금 구조 기준 금액 — Net국가=net / Commission국가=단가 (총액) */
  amount: number;
  currency: string;
  availability: string;
  /** 취소 마감(YYYY-MM-DD, 그날 23:59까지) — 이후 취소 불가·환불 불가. 없으면 처음부터 취소·환불 불가 */
  cancelDeadline?: string;
  /** 호텔 컨펌 후 결제 마감(시간) — 미결제 시 자동취소 */
  paymentDeadlineHours: number;
  validUntil: string;
  note?: string;
  submittedAt: string;
}

export interface BusDecline {
  ref: string;
  hotelCode: string;
  at: string;
}

export type CancelReason = 'hotel_rejected' | 'unpaid_timeout' | 'seller_cancelled';

/** 낙찰 이후 거래 진행 (양방향) */
export interface BusDeal {
  ref: string;
  quoteId: string;
  awardedAt: string;
  /** 낙찰 견적의 결제 마감(시간) — 호텔 컨펌 시각 기준 */
  paymentDeadlineHours: number;
  hotelDecision?: 'confirmed' | 'rejected';
  decidedAt?: string;
  /** 단체 예약 확인서(계약 조건) 동의 시각 — 결제 전 필수 */
  contractAcceptedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  cancelReason?: CancelReason;
}

export interface GroupBus {
  v: 1;
  inquiries: BusInquiry[];
  quotes: BusQuote[];
  declines: BusDecline[];
  deals: BusDeal[];
}

const EMPTY: GroupBus = { v: 1, inquiries: [], quotes: [], declines: [], deals: [] };

let cacheRaw: string | null = null;
let cacheBus: GroupBus = EMPTY;

/** 현재 버스 상태 (같은 원문이면 같은 참조 — 렌더 안정) */
export function readBus(): GroupBus {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(BUS_KEY);
  } catch {
    return cacheBus;
  }
  if (raw === cacheRaw) return cacheBus;
  cacheRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as GroupBus) : EMPTY;
    cacheBus = parsed && parsed.v === 1 ? { ...EMPTY, ...parsed } : EMPTY;
  } catch {
    cacheBus = EMPTY;
  }
  return cacheBus;
}

export function writeBus(mutate: (b: GroupBus) => GroupBus): GroupBus {
  const next = mutate(readBus());
  try {
    localStorage.setItem(BUS_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패 시 연동 없이 동작
  }
  window.dispatchEvent(new Event(BUS_EVENT));
  return readBus();
}

/** 다른 탭(storage) · 같은 탭(custom event) 변경 구독 */
export function subscribeBus(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === BUS_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(BUS_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(BUS_EVENT, onChange);
  };
}

export const dealOf = (b: GroupBus, ref: string) => b.deals.find((d) => d.ref === ref);

export function upsertDeal(ref: string, patch: Partial<BusDeal> & { quoteId?: string }) {
  return writeBus((b) => {
    const cur = b.deals.find((d) => d.ref === ref);
    const deals = cur
      ? b.deals.map((d) => (d.ref === ref ? { ...d, ...patch } : d))
      : [...b.deals, { ref, quoteId: patch.quoteId ?? '', awardedAt: new Date().toISOString(), paymentDeadlineHours: 3, ...patch }];
    return { ...b, deals };
  });
}

export function publishInquiry(inq: BusInquiry) {
  return writeBus((b) => ({ ...b, inquiries: [...b.inquiries.filter((x) => x.ref !== inq.ref), inq] }));
}

/** 결제 마감 시각(ms) — 호텔 컨펌 시각 + 결제 마감 시간. 컨펌 전이면 null */
export function paymentDueMs(d: BusDeal): number | null {
  if (d.hotelDecision !== 'confirmed' || !d.decidedAt) return null;
  return new Date(d.decidedAt).getTime() + d.paymentDeadlineHours * 3600000;
}

/** 컨펌 후 결제 마감이 지났는데 미결제 → 자동취소 대상 */
export const isUnpaidOverdue = (d: BusDeal, now: number) => {
  const due = paymentDueMs(d);
  return due !== null && !d.paidAt && !d.cancelledAt && now > due;
};

/** 결제 마감 경과 건 자동취소 기록 (어느 앱에서든 먼저 본 쪽이 기록) */
export function sweepUnpaid(now = Date.now()) {
  const b = readBus();
  if (!b.deals.some((d) => isUnpaidOverdue(d, now))) return;
  writeBus((x) => ({
    ...x,
    deals: x.deals.map((d) =>
      isUnpaidOverdue(d, now) ? { ...d, cancelledAt: new Date(paymentDueMs(d) ?? now).toISOString(), cancelReason: 'unpaid_timeout' } : d,
    ),
  }));
}

/** 취소 마감 지났나 — 마감일 23:59(로컬)까지 취소 가능. 마감 없음 = 취소 불가 */
export function cancelClosed(cancelDeadline: string | undefined | null, now = Date.now()): boolean {
  if (!cancelDeadline) return true;
  return now > new Date(`${cancelDeadline.slice(0, 10)}T23:59:59`).getTime();
}

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  hotel_rejected: '호텔 거절 — 문의 취소',
  unpaid_timeout: '결제 마감 경과 — 자동취소',
  seller_cancelled: '고객사 취소(취소 마감 전 · 전액 환불)',
};
