import { allHotels, cityEnOf } from './hotelDb';

/**
 * 단체 문의 · 역경매(RFP) 소싱 — **프로토타입 · 폐기 가능 구조.**
 *
 * 현업 기획(2026-09-21) + SCM 피드백(2026-09-22) 반영:
 * 고객사 단체 문의 접수(메일) → 우리가 **기존 계약 호텔**에 역경매로 뿌려 견적 회수 →
 * **국가별 요금 구조로 고객가 산출**(한국=net+마크업 / 일본=단가+커미션) → 리스트업 → 리퀘스트 예약.
 *
 * 상세 기획: docs/plan/feature-group-inquiry-rfp.md
 * ※ 폐기 = 이 파일 + utils/groupInquiryStore.ts + components/GroupInquiryPage.tsx + 사이드바 한 줄 삭제.
 */

/**
 * 문의 상태 (2026-10-01 정렬):
 * Submitted 접수 → Sourcing 견적 수집중(RFP 배포) → Quoted 견적 도착 → Requested 선택·리퀘스트 예약(호텔 응답 대기)
 * → Accepted 호텔 수락·결제 대기(계약 동의 + N시간 내 결제) → Confirmed 결제 완료·확정.
 * Cancelled(사유: 호텔 거절 / 미결제 자동취소 / 고객사 취소) · Expired(회신 기한 경과·견적 없음 — 표시용 파생).
 * ※ 기획서의 Selected는 선택 즉시 리퀘스트 예약이 생성되므로 Requested에 통합, Declined(호텔 거절)는 '문의 취소' 규칙에 따라 Cancelled(사유)로 표기.
 */
export type InquiryStatus = 'Submitted' | 'Sourcing' | 'Quoted' | 'Requested' | 'Accepted' | 'Confirmed' | 'Cancelled' | 'Expired';

/** 그룹 예약 기준 — 동일 호텔 5실 이상 (현업 확정 2026-10-01). 즉시 예약은 4실까지. */
export const MIN_GROUP_ROOMS = 5;

export interface RoomReq {
  roomType: string;
  count: number;
}

/** 부대 서비스 요청 (SCM 피드백 — 단체 성격에 따라 변수) */
export interface Ancillary {
  seminar: boolean; // 세미나실
  banquet: boolean; // 연회장
  partialBreakfast: boolean; // 투숙 중 일부만 조식
  transport: boolean; // 행사장 차량
}
export const EMPTY_ANCILLARY: Ancillary = { seminar: false, banquet: false, partialBreakfast: false, transport: false };
export const ANCILLARY_LABEL: Record<keyof Ancillary, string> = {
  seminar: '세미나실',
  banquet: '연회장',
  partialBreakfast: '부분 조식',
  transport: '행사장 차량',
};

/** 날짜별 예산 1일치 (1실·1박 기준) */
export interface DateBudget {
  date: string;
  perRoomNight: number;
}

/** 호텔 회수 견적 1건. amount는 **국가 요금 구조 기준**(net국가=net원가 / 커미션국가=단가). */
export interface HotelQuote {
  id: string;
  hotelId: string;
  hotelName: string;
  star?: number;
  location: string;
  /** 요청 지역 ↔ 호텔 거리(km) — 지역 타깃팅 B(도시 일치 + 거리 표시) */
  distanceKm?: number;
  /** 앵커(경기장 등)까지 차량 분 — 앵커가 있을 때만 */
  distanceMin?: number;
  /** 호텔 회수 금액 — net국가=net(원가) / 커미션국가=단가(gross). 내부. */
  amount: number;
  currency: string;
  condition: string;
  /** 가용 확보 메모 (호텔 입력) */
  availability?: string;
  /**
   * 취소 마감(YYYY-MM-DD, 그날 23:59까지) — **호텔이 오퍼 때 지정**(현업 확정 2026-10-01).
   * 마감 전 = 예약 전체 무료취소(전액 환불) · 마감 후 = **취소 불가 · 환불 불가**. 없으면 처음부터 취소·환불 불가.
   */
  cancelDeadline?: string;
  /** 호텔 컨펌 후 결제 마감(시간, 호텔 설정 · 기본 3h) — 미결제 시 자동취소 */
  paymentDeadlineHours: number;
  validUntil: string;
  /** console = 호텔이 벤더 콘솔에서 직접 제출 / channel = 이메일·SCM 중개 회수(시뮬레이트) */
  source: 'console' | 'channel';
  note?: string;
  status: 'listed' | 'selected' | 'not_selected';
}

/** 취소 조건 표시 — 마감일까지 무료취소, 이후 취소·환불 불가 */
export const cancelLabel = (deadline?: string) =>
  deadline ? `${deadline.slice(0, 10)} 23:59까지 무료취소 · 이후 취소·환불 불가` : '취소·환불 불가 (마감 없음)';

export interface GroupInquiry {
  id: string;
  ref: string;
  status: InquiryStatus;
  /** 목적지 — 국가 → 지역 → (선택) 호텔 */
  country: string;
  region: string;
  hotelId?: string;
  hotelName?: string;
  /** 희망 호텔·성급 (SCM/Aiden — 리스트 외 자유 희망) */
  preferredHotel?: string;
  preferredStar?: number;
  /** 기준점(앵커) */
  anchorName?: string;
  anchorRadiusMin?: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: RoomReq[];
  mealPlan: string;
  guests: number;
  nationality?: string;
  /** 단체 성격 (SCM — 국적/기업·인센티브 등) */
  groupType?: string;
  /** 담당 범위 — 객실만 / 객실+부대서비스 */
  scope: 'rooms' | 'rooms_plus';
  ancillary?: Ancillary;
  ancillaryNote?: string;
  /** 견적 시 객실 홀드 필요 여부 (SCM3 — 호텔은 기본 홀드 안 함) */
  holdRequired?: boolean;
  /** Golden Key — 확정에 가장 중요한 1가지 (SCM5) */
  goldenKey?: string;
  /** 비교견적용 아님 동의 (SCM4) */
  comparisonAck?: boolean;
  currency: string;
  /** 예산 — 1실·1박 기준. 날짜별 입력 가능. budgetTotal은 총액 환산(견적 비교 기준). */
  budgetMode: 'flat' | 'byDate';
  budgetPerRoomNight?: number;
  budgetByDate?: DateBudget[];
  budgetTotal?: number;
  notes?: string;
  createdAt: string;
  submittedAt?: string;
  /** 회신 기한(ISO) — 고객사가 문의 시 지정. 호텔은 이 시각까지 견적 회신. 경과 시 회신 마감 */
  quoteDeadline?: string;
  quotes: HotelQuote[];
  selectedQuoteId?: string;
  /** 고객사(셀러) 표시명 — 콘솔 RFP의 고객사 칸 */
  sellerName?: string;
  /** 호텔 수락 시각 · 결제 마감(ISO) · 계약(단체 예약 확인서) 동의 · 결제 · 취소 */
  acceptedAt?: string;
  paymentDueAt?: string;
  contractAcceptedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  cancelReason?: 'hotel_rejected' | 'unpaid_timeout' | 'seller_cancelled';
}

/**
 * 국가별 요금 구조 (SCM 피드백 2026-09-22).
 * - net: 호텔이 net(원가) 제공 → 우리 **마크업(%)** 을 얹어 고객가. (예: 한국 대부분)
 * - commission: 호텔이 **단가**(판매가)를 제시하고 **커미션(%)** 지급 → 고객가=단가, 우리 마진=커미션. (예: 일본)
 * 고객에겐 어느 쪽이든 **고객가(sell)만** 노출. net·단가·마크업률·커미션율은 내부만.
 */
export interface CountryRate {
  mode: 'net' | 'commission';
  /** net: 마크업 % / commission: 커미션 % */
  value: number;
}
export const DEFAULT_COUNTRY_RATES: Record<string, CountryRate> = {
  Japan: { mode: 'commission', value: 10 },
  'South Korea': { mode: 'net', value: 12 },
  Thailand: { mode: 'net', value: 12 },
  Singapore: { mode: 'net', value: 12 },
  Vietnam: { mode: 'net', value: 12 },
  Taiwan: { mode: 'net', value: 12 },
  'Hong Kong': { mode: 'net', value: 12 },
};
export const FALLBACK_RATE: CountryRate = { mode: 'net', value: 12 };
export const RATE_COUNTRIES = Object.keys(DEFAULT_COUNTRY_RATES);

export function rateFor(country: string, rates: Record<string, CountryRate>): CountryRate {
  return rates[country] ?? FALLBACK_RATE;
}

const roundTo = (n: number, unit: number) => Math.round(n / unit) * unit;

/**
 * 고객가 반올림 단위(통화별) — 초기값. KRW 100 · JPY 10 · VND 1,000 · TWD/THB 10 · 그 외 1.
 * (이전엔 모든 통화 100 단위 → SGD 등에서 과대 반올림. 정책 확정 시 ELLIS 설정으로 이관)
 */
export const ROUND_UNIT: Record<string, number> = { KRW: 100, JPY: 10, VND: 1000, TWD: 10, THB: 10 };
export const roundUnitOf = (currency?: string) => (currency && ROUND_UNIT[currency]) || 1;

export interface PricedQuote {
  sell: number; // 고객가
  margin: number; // 우리 마진 (마크업 또는 커미션)
  basisLabel: string; // 'net' | '단가'
  marginLabel: string; // '마크업 12%' | '커미션 10%'
}

/**
 * 호텔 회수 금액 + 국가 요금 구조 → 고객가·마진 산출.
 * - 커미션 국가: 고객가 = 단가 **그대로**(반올림 없음), 마진 = 단가 × 커미션%
 * - net 국가: 고객가 = net × (1 + 마크업%) 를 **통화별 단위**로 반올림, 마진 = 고객가 − net
 */
export function priceQuote(amount: number, rate: CountryRate, currency?: string): PricedQuote {
  if (rate.mode === 'commission') {
    return {
      sell: amount,
      margin: Math.round((amount * rate.value) / 100),
      basisLabel: '단가',
      marginLabel: `커미션 ${rate.value}%`,
    };
  }
  const sell = roundTo(amount * (1 + rate.value / 100), roundUnitOf(currency));
  return { sell, margin: sell - amount, basisLabel: 'net', marginLabel: `마크업 ${rate.value}%` };
}

export const fmtMoney = (n: number, currency: string) => `${currency} ${Math.round(n).toLocaleString()}`;

export type RemainTone = 'danger' | 'warning' | 'neutral' | 'expired';

/** 회신 기한까지 남은 시간 — 24h 미만 danger · 48h 미만 warning · 경과 시 expired('회신 마감'). */
export function remainingInfo(deadlineIso: string | undefined, now: number): { expired: boolean; label: string; tone: RemainTone } | null {
  if (!deadlineIso) return null;
  const ms = new Date(deadlineIso).getTime() - now;
  if (ms <= 0) return { expired: true, label: '회신 마감', tone: 'expired' };
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const label = d >= 1 ? `D-${d} · ${h}시간 남음` : h >= 1 ? `${h}시간 ${m}분 남음` : `${m}분 남음`;
  const hours = ms / 3600000;
  return { expired: false, label, tone: hours < 24 ? 'danger' : hours < 48 ? 'warning' : 'neutral' };
}

/** ISO → 'YYYY-MM-DD HH:mm' (로컬) */
export function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 시드 회신 기한은 최초 로드 시각 기준 상대값 — 데모를 언제 열어도 남은 시간이 보이도록. */
const SEED_NOW = Date.now();
const inHours = (h: number) => new Date(SEED_NOW + h * 3600000).toISOString();

export const nights = (ci: string, co: string) =>
  Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));

export const roomsSummary = (rooms: RoomReq[]) => rooms.map((r) => `${r.roomType} ×${r.count}`).join(', ');
export const roomsTotal = (rooms: RoomReq[]) => rooms.reduce((s, r) => s + (Number(r.count) || 0), 0);

/** 예산 총액 환산 (견적 비교 기준). 날짜별이면 야간 합 × 실수, 아니면 1박값 × 실수 × 박수. */
export function budgetTotalOf(inq: Pick<GroupInquiry, 'budgetMode' | 'budgetPerRoomNight' | 'budgetByDate' | 'rooms' | 'nights'>): number | undefined {
  const rt = roomsTotal(inq.rooms);
  if (inq.budgetMode === 'byDate' && inq.budgetByDate?.length) {
    const sum = inq.budgetByDate.reduce((s, d) => s + (Number(d.perRoomNight) || 0), 0);
    return sum > 0 ? sum * rt : undefined;
  }
  if (inq.budgetPerRoomNight) return inq.budgetPerRoomNight * rt * inq.nights;
  return undefined;
}

/** 체크인~체크아웃 사이 각 박(night)의 날짜 목록 */
export function nightDates(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  if (!checkIn || !checkOut) return out;
  const n = nights(checkIn, checkOut);
  for (let i = 0; i < n; i += 1) out.push(new Date(new Date(checkIn).getTime() + i * 86400000).toISOString().slice(0, 10));
  return out;
}

const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400000).toISOString();

/**
 * 역경매 시뮬레이트 — 문의를 **기존 계약 호텔**(allHotels)에 뿌려 견적을 회수한 결과(결정론적 생성).
 * 대상: 호텔 특정 시 그 호텔+동일 도시 형제, 지역만이면 해당 지역/국가 호텔군. 신규 소싱 필수 아님.
 * 금액은 목표 고객가(예산 대비 스프레드)에서 국가 요금 구조로 역산 — net국가=sell/(1+마크업), 커미션국가=단가=sell.
 */
export function generateQuotes(inq: GroupInquiry, rates: Record<string, CountryRate>): HotelQuote[] {
  const all = allHotels();
  let cands = [] as ReturnType<typeof allHotels>;
  if (inq.hotelId) {
    // 호텔을 특정한 문의는 그 호텔에만 배포
    const self = all.find((h) => h.id === inq.hotelId);
    if (self) cands = [self];
  }
  if (cands.length === 0) cands = all.filter((h) => h.city.destination === inq.region || h.city.nameEn === inq.region);
  if (cands.length === 0) cands = all.filter((h) => h.city.country === inq.country);
  if (cands.length === 0) cands = all.slice(0, 5);

  const picked = cands.slice(0, 5);
  const factors = [0.88, 0.96, 1.03, 1.1, 0.92];
  const dists = [9, 15, 22, 27, 12];
  const kms = [3, 6, 11, 14, 5];
  /** 호텔이 지정한 취소 마감 — 체크인 N일 전(−1 = 마감 없음 · 처음부터 취소·환불 불가) */
  const cxlDays = [14, 7, -1, 10, 3];
  const payHours = [3, 6, 3, 12, 3];
  const budget = budgetTotalOf(inq) ?? 600000;
  const rate = rateFor(inq.country, rates);
  // 견적 유효기한은 회수 시점 기준(+5일) — 오래된 문의라도 방금 받은 견적은 유효
  const base = new Date().toISOString();
  return picked.map((h, i) => {
    const targetSell = budget * factors[i % factors.length];
    const amount = rate.mode === 'commission' ? roundTo(targetSell, 100) : roundTo(targetSell / (1 + rate.value / 100), 100);
    const days = cxlDays[i % cxlDays.length];
    return {
      id: `Q-${inq.id}-${i + 1}`,
      hotelId: h.id,
      hotelName: h.name,
      star: h.star,
      location: cityEnOf(h.city.destination),
      distanceKm: kms[i % kms.length],
      distanceMin: inq.anchorName ? dists[i % dists.length] : undefined,
      amount,
      currency: inq.currency,
      condition: `${roomsSummary(inq.rooms)} · ${inq.mealPlan} · ${inq.nights}박`,
      cancelDeadline: days > 0 ? new Date(new Date(inq.checkIn).getTime() - days * 86400000).toISOString().slice(0, 10) : undefined,
      paymentDeadlineHours: payHours[i % payHours.length],
      validUntil: addDays(base, 5).slice(0, 10),
      source: 'channel' as const,
      status: 'listed' as const,
    };
  });
}

/** 시드 문의 2건 — 이바라키(견적 도착·선택 대기, 일본=커미션) + 오사카(접수, 부대서비스 포함). */
export const SEED_INQUIRIES: GroupInquiry[] = [
  {
    id: 'gi-ibaraki-cn',
    ref: 'GRP-20260921-001',
    status: 'Quoted',
    country: 'Japan',
    region: 'Ibaraki',
    anchorName: 'Sakaimachi Urban Sports Park (境町アーバンスポーツパーク)',
    anchorRadiusMin: 30,
    checkIn: '2026-11-23',
    checkOut: '2026-11-30',
    nights: 7,
    rooms: [
      { roomType: 'Twin', count: 5 },
      { roomType: 'Single', count: 5 },
    ],
    mealPlan: 'Room Only',
    guests: 15,
    nationality: '중국',
    groupType: '스포츠 대표팀',
    scope: 'rooms',
    holdRequired: true,
    goldenKey: '경기장 차량 30분 이내 + 동일 호텔에 10실 동시 확보',
    comparisonAck: true,
    currency: 'JPY',
    budgetMode: 'flat',
    budgetPerRoomNight: 9100, // 10실 × 7박 × 9,100 = 637,000
    budgetTotal: 637000,
    notes: '선수단 단체 이동 — 동일 호텔 우선.',
    createdAt: '2026-09-21T02:10:00.000Z',
    submittedAt: '2026-09-21T02:10:00.000Z',
    quoteDeadline: inHours(29), // 회신 기한 — 견적 4건 도착, 마감까지 약 1일 5시간
    sellerName: 'ATTIC TOURS (KR)',
    quotes: [
      { id: 'Q-ibaraki-1', hotelId: 'HTL-IBR-01', hotelName: 'Route Inn Koga Ekimae', star: 3, location: 'Koga, Ibaraki', distanceKm: 9, distanceMin: 12, amount: 590000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancelDeadline: '2026-11-09', paymentDeadlineHours: 3, validUntil: '2026-10-26', source: 'channel', status: 'listed' },
      { id: 'Q-ibaraki-2', hotelId: 'HTL-IBR-02', hotelName: 'Hotel Sunroute Sakai', star: 3, location: 'Sakai, Ibaraki', distanceKm: 4, distanceMin: 9, amount: 618000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancelDeadline: '2026-11-16', paymentDeadlineHours: 6, validUntil: '2026-10-26', source: 'channel', status: 'listed' },
      { id: 'Q-ibaraki-3', hotelId: 'HTL-IBR-03', hotelName: 'Toyoko Inn Koga-eki Kita-guchi', star: 3, location: 'Koga, Ibaraki', distanceKm: 13, distanceMin: 18, amount: 648000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', paymentDeadlineHours: 3, validUntil: '2026-10-26', source: 'channel', note: '그룹 특가 — 취소 마감 없음', status: 'listed' },
      { id: 'Q-ibaraki-4', hotelId: 'HTL-IBR-04', hotelName: 'Business Hotel Sashima', star: 3, location: 'Sashima, Ibaraki', distanceKm: 19, distanceMin: 25, amount: 560000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancelDeadline: '2026-11-13', paymentDeadlineHours: 12, validUntil: '2026-10-26', source: 'channel', status: 'listed' },
    ],
  },
  {
    id: 'gi-osaka-corp',
    ref: 'GRP-20260921-002',
    status: 'Submitted',
    country: 'Japan',
    region: '오사카',
    checkIn: '2026-10-18',
    checkOut: '2026-10-21',
    nights: 3,
    rooms: [
      { roomType: 'Double', count: 4 },
      { roomType: 'Twin', count: 4 },
    ],
    mealPlan: 'Breakfast',
    guests: 12,
    nationality: '한국',
    groupType: '기업 연수단(인센티브)',
    scope: 'rooms_plus',
    ancillary: { seminar: true, banquet: false, partialBreakfast: true, transport: false },
    ancillaryNote: '연수 세미나실 1일 · 조식은 2·3일차만.',
    holdRequired: false,
    goldenKey: '세미나실 확보 + 난바/신사이바시 도보권',
    comparisonAck: true,
    currency: 'JPY',
    budgetMode: 'flat',
    budgetPerRoomNight: 30000, // 8실 × 3박 × 30,000 = 720,000
    budgetTotal: 720000,
    notes: '난바/신사이바시 도보권 선호.',
    createdAt: '2026-09-21T05:30:00.000Z',
    submittedAt: '2026-09-21T05:30:00.000Z',
    quoteDeadline: inHours(68), // 회신 기한 — 약 2일 20시간 남음
    sellerName: 'ATTIC TOURS (KR)',
    quotes: [],
  },
];
