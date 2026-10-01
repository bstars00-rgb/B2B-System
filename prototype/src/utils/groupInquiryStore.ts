import { SEED_INQUIRIES, DEFAULT_COUNTRY_RATES, rateFor, roomsSummary, type GroupInquiry, type CountryRate, type HotelQuote } from '../mocks/groupInquiry';
import { cityEnOf } from '../mocks/hotelDb';
import type { Booking } from '../types';
import { dealOf, paymentDueMs, type BusInquiry, type GroupBus } from './groupBus';

/**
 * 단체 문의 · 국가별 요금 설정 localStorage 영속 스토어 (bookingStore 패턴).
 * 데이터 접근을 이 계층으로 일원화 — 추후 ELLIS API 연동 시 여기만 교체.
 */

const INQ_KEY = 'omh_group_inquiries';
const RATES_KEY = 'omh_group_country_rates';
const SEQ_KEY = 'omh_group_seq';
const SEED_VERSION_KEY = 'omh_group_seed_version';
const SEED_VERSION = '5'; // v5: 취소 마감(호텔 지정)·결제 마감·콘솔 연동(버스)·상태 정렬 (2026-10-01)

export function loadInquiries(): GroupInquiry[] {
  try {
    if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      saveInquiries(SEED_INQUIRIES);
      return SEED_INQUIRIES;
    }
    const raw = localStorage.getItem(INQ_KEY);
    if (!raw) return SEED_INQUIRIES;
    const parsed = JSON.parse(raw) as GroupInquiry[];
    return Array.isArray(parsed) ? parsed : SEED_INQUIRIES;
  } catch {
    return SEED_INQUIRIES;
  }
}

export function saveInquiries(list: GroupInquiry[]): void {
  try {
    localStorage.setItem(INQ_KEY, JSON.stringify(list));
  } catch {
    // 저장 실패 시 세션 메모리로만 동작
  }
}

export function loadRates(): Record<string, CountryRate> {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return { ...DEFAULT_COUNTRY_RATES };
    const parsed = JSON.parse(raw) as Record<string, CountryRate>;
    return parsed && typeof parsed === 'object' ? { ...DEFAULT_COUNTRY_RATES, ...parsed } : { ...DEFAULT_COUNTRY_RATES };
  } catch {
    return { ...DEFAULT_COUNTRY_RATES };
  }
}

export function saveRates(rates: Record<string, CountryRate>): void {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  } catch {
    // 무시
  }
}

/** 문의 접수번호 발번 — GRP-YYYYMMDD-NNN */
export function nextInquiryRef(): string {
  let seq = 2;
  try {
    seq = Number(localStorage.getItem(SEQ_KEY) ?? '2');
    if (!Number.isFinite(seq) || seq < 2) seq = 2;
  } catch {
    // 기본값
  }
  const next = seq + 1;
  try {
    localStorage.setItem(SEQ_KEY, String(next));
  } catch {
    // 무시
  }
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return `GRP-${ymd}-${String(next).padStart(3, '0')}`;
}

/** 데모 셀러(로그인 고객사) — 콘솔 RFP의 고객사 칸에 표시 */
export const SELLER_NAME = 'ATTIC TOURS (KR)';

/** 문의 → 버스 배포용 요약 (마크업률은 보내지 않음 · 커미션 국가만 커미션율 전달) */
export function toBusInquiry(inq: GroupInquiry, rates: Record<string, CountryRate>, ancillaryLabels: string[]): BusInquiry {
  const rate = rateFor(inq.country, rates);
  return {
    ref: inq.ref,
    sellerName: inq.sellerName ?? SELLER_NAME,
    country: inq.country,
    region: inq.region,
    regionEn: cityEnOf(inq.region),
    hotelName: inq.hotelName,
    anchorName: inq.anchorName,
    anchorRadiusMin: inq.anchorRadiusMin,
    checkIn: inq.checkIn,
    checkOut: inq.checkOut,
    nights: inq.nights,
    rooms: inq.rooms,
    mealPlan: inq.mealPlan,
    guests: inq.guests,
    nationality: inq.nationality,
    groupType: inq.groupType,
    scope: inq.scope,
    ancillary: ancillaryLabels.length ? ancillaryLabels : undefined,
    ancillaryNote: inq.ancillaryNote,
    holdRequired: inq.holdRequired,
    goldenKey: inq.goldenKey,
    notes: inq.notes,
    budgetPerRoomNight: inq.budgetPerRoomNight,
    budgetTotal: inq.budgetTotal,
    currency: inq.currency,
    contractType: rate.mode === 'commission' ? 'Commission' : 'Net',
    commissionPct: rate.mode === 'commission' ? rate.value : undefined,
    quoteDeadline: inq.quoteDeadline ?? new Date(Date.now() + 72 * 3600000).toISOString(),
    publishedAt: new Date().toISOString(),
  };
}

/**
 * 버스 → 문의 반영: 콘솔에서 호텔이 낸 견적을 리스트에 합치고, 낙찰 이후 호텔 결정·결제·취소를 상태로 반영.
 * 바뀐 문의가 없으면 같은 배열을 그대로 돌려준다(렌더 루프 방지).
 */
export function applyBus(list: GroupInquiry[], bus: GroupBus): GroupInquiry[] {
  let changed = false;
  const next = list.map((inq) => {
    let quotes = inq.quotes;
    const fromConsole = bus.quotes.filter((q) => q.ref === inq.ref);
    for (const q of fromConsole) {
      const id = `CQ-${q.quoteId}`;
      if (quotes.some((x) => x.id === id)) continue;
      const hq: HotelQuote = {
        id,
        hotelId: q.hotelCode,
        hotelName: q.hotelName,
        star: q.star,
        location: q.city,
        amount: q.amount,
        currency: q.currency,
        condition: `${roomsSummary(inq.rooms)} · ${inq.mealPlan} · ${inq.nights}박`,
        availability: q.availability,
        cancelDeadline: q.cancelDeadline,
        paymentDeadlineHours: q.paymentDeadlineHours,
        validUntil: q.validUntil,
        source: 'console',
        note: q.note,
        status: 'listed',
      };
      quotes = [...quotes, hq];
    }
    let patch: Partial<GroupInquiry> = {};
    if (quotes !== inq.quotes) {
      patch.quotes = quotes;
      if (inq.status === 'Submitted' || inq.status === 'Sourcing') patch.status = 'Quoted';
    }
    const deal = dealOf(bus, inq.ref);
    if (deal) {
      const due = paymentDueMs(deal);
      const sel = { selectedQuoteId: deal.quoteId, quotes: quotes.map((x) => ({ ...x, status: x.id === deal.quoteId ? ('selected' as const) : ('not_selected' as const) })) };
      if (deal.cancelledAt || deal.hotelDecision === 'rejected') {
        patch = { ...patch, ...sel, status: 'Cancelled', cancelledAt: deal.cancelledAt ?? deal.decidedAt, cancelReason: deal.cancelReason ?? 'hotel_rejected', paymentDueAt: due ? new Date(due).toISOString() : undefined, acceptedAt: deal.hotelDecision === 'confirmed' ? deal.decidedAt : undefined, paidAt: deal.paidAt };
      } else if (deal.paidAt) {
        patch = { ...patch, ...sel, status: 'Confirmed', acceptedAt: deal.decidedAt, paymentDueAt: due ? new Date(due).toISOString() : undefined, contractAcceptedAt: deal.contractAcceptedAt, paidAt: deal.paidAt };
      } else if (deal.hotelDecision === 'confirmed') {
        patch = { ...patch, ...sel, status: 'Accepted', acceptedAt: deal.decidedAt, paymentDueAt: due ? new Date(due).toISOString() : undefined, contractAcceptedAt: deal.contractAcceptedAt };
      } else {
        patch = { ...patch, ...sel, status: 'Requested' };
      }
    }
    const merged = { ...inq, ...patch };
    if (JSON.stringify(merged) === JSON.stringify(inq)) return inq;
    changed = true;
    return merged;
  });
  return changed ? next : list;
}

/**
 * 버스 → Bookings 반영 (group_ref 기준): 결제 완료 = Confirmed·Fully Paid / 취소 = Cancelled(결제 후 고객사 취소면 Refunded) /
 * 호텔 수락·결제 대기 = Requested + 결제 마감 표시. 바뀐 게 없으면 같은 배열.
 */
export function applyBusToBookings(bookings: Booking[], bus: GroupBus): Booking[] {
  let changed = false;
  const next = bookings.map((b) => {
    if (!b.group_ref) return b;
    const deal = dealOf(bus, b.group_ref);
    if (!deal) return b;
    const due = paymentDueMs(deal);
    let patch: Partial<Booking>;
    if (deal.cancelledAt || deal.hotelDecision === 'rejected') {
      patch = {
        status: 'Cancelled',
        cancel_date: deal.cancelledAt ?? deal.decidedAt ?? new Date().toISOString(),
        payment_status: deal.paidAt ? 'Refunded' : b.payment_status === 'Fully Paid' ? 'Refunded' : 'Unpaid',
        group_payment_due: null,
      };
    } else if (deal.paidAt) {
      patch = { status: 'Confirmed', payment_status: 'Fully Paid', group_payment_due: null };
    } else {
      patch = { status: 'Requested', group_payment_due: due ? new Date(due).toISOString() : null };
    }
    const merged = { ...b, ...patch };
    if (JSON.stringify(merged) === JSON.stringify(b)) return b;
    changed = true;
    return merged;
  });
  return changed ? next : bookings;
}
