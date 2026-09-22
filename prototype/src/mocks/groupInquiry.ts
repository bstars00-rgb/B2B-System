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

export type InquiryStatus = 'Submitted' | 'Sourcing' | 'Quoted' | 'Requested' | 'Confirmed' | 'Cancelled';

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
  distanceMin?: number;
  /** 호텔 회수 금액 — net국가=net(원가) / 커미션국가=단가(gross). 내부. */
  amount: number;
  currency: string;
  condition: string;
  cancellation: string;
  /** 무료취소 마감(있으면) — 이후 취소 시 수수료 발생 구간 */
  freeCancelUntil?: string;
  validUntil: string;
  status: 'listed' | 'selected' | 'declined';
}

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
  quoteDeadline?: string;
  quotes: HotelQuote[];
  selectedQuoteId?: string;
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

export interface PricedQuote {
  sell: number; // 고객가
  margin: number; // 우리 마진 (마크업 또는 커미션)
  basisLabel: string; // 'net' | '단가'
  marginLabel: string; // '마크업 12%' | '커미션 10%'
}

/** 호텔 회수 금액 + 국가 요금 구조 → 고객가·마진 산출. */
export function priceQuote(amount: number, rate: CountryRate): PricedQuote {
  if (rate.mode === 'commission') {
    return {
      sell: roundTo(amount, 100),
      margin: roundTo((amount * rate.value) / 100, 100),
      basisLabel: '단가',
      marginLabel: `커미션 ${rate.value}%`,
    };
  }
  const sell = roundTo(amount * (1 + rate.value / 100), 100);
  return { sell, margin: sell - amount, basisLabel: 'net', marginLabel: `마크업 ${rate.value}%` };
}

export const fmtMoney = (n: number, currency: string) => `${currency} ${Math.round(n).toLocaleString()}`;

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
    const self = all.find((h) => h.id === inq.hotelId);
    if (self) cands = [self, ...all.filter((h) => h.city.destination === self.city.destination && h.id !== self.id)];
  }
  if (cands.length === 0) cands = all.filter((h) => h.city.destination === inq.region || h.city.nameEn === inq.region);
  if (cands.length === 0) cands = all.filter((h) => h.city.country === inq.country);
  if (cands.length === 0) cands = all.slice(0, 5);

  const picked = cands.slice(0, 5);
  const factors = [0.88, 0.96, 1.03, 1.1, 0.92];
  const dists = [9, 15, 22, 27, 12];
  const cxl = [
    { txt: '무료취소 · 체크인 14일 전까지', days: 14 },
    { txt: '체크인 7일 전부터 1박 부과', days: 7 },
    { txt: '비환불(그룹 특가)', days: -1 },
    { txt: '무료취소 · 체크인 10일 전까지', days: 10 },
    { txt: '체크인 3일 전부터 전액', days: 3 },
  ];
  const budget = budgetTotalOf(inq) ?? 600000;
  const rate = rateFor(inq.country, rates);
  const base = inq.submittedAt ?? inq.createdAt;
  return picked.map((h, i) => {
    const targetSell = budget * factors[i % factors.length];
    const amount = rate.mode === 'commission' ? roundTo(targetSell, 100) : roundTo(targetSell / (1 + rate.value / 100), 100);
    const c = cxl[i % cxl.length];
    return {
      id: `Q-${inq.id}-${i + 1}`,
      hotelId: h.id,
      hotelName: h.name,
      star: h.star,
      location: cityEnOf(h.city.destination),
      distanceMin: inq.anchorName ? dists[i % dists.length] : undefined,
      amount,
      currency: inq.currency,
      condition: `${roomsSummary(inq.rooms)} · ${inq.mealPlan} · ${inq.nights}박`,
      cancellation: c.txt,
      freeCancelUntil: c.days > 0 ? new Date(new Date(inq.checkIn).getTime() - c.days * 86400000).toISOString().slice(0, 10) : undefined,
      validUntil: addDays(base, 5),
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
    quoteDeadline: '2026-09-26T02:10:00.000Z',
    quotes: [
      { id: 'Q-ibaraki-1', hotelId: 'HTL-IBR-01', hotelName: 'Route Inn Koga Ekimae', star: 3, location: 'Koga, Ibaraki', distanceMin: 12, amount: 590000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '무료취소 · 체크인 14일 전까지', freeCancelUntil: '2026-11-09', validUntil: '2026-09-26', status: 'listed' },
      { id: 'Q-ibaraki-2', hotelId: 'HTL-IBR-02', hotelName: 'Hotel Sunroute Sakai', star: 3, location: 'Sakai, Ibaraki', distanceMin: 9, amount: 618000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '체크인 7일 전부터 1박 부과', freeCancelUntil: '2026-11-16', validUntil: '2026-09-26', status: 'listed' },
      { id: 'Q-ibaraki-3', hotelId: 'HTL-IBR-03', hotelName: 'Toyoko Inn Koga-eki Kita-guchi', star: 3, location: 'Koga, Ibaraki', distanceMin: 18, amount: 648000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '비환불(그룹 특가)', validUntil: '2026-09-26', status: 'listed' },
      { id: 'Q-ibaraki-4', hotelId: 'HTL-IBR-04', hotelName: 'Business Hotel Sashima', star: 3, location: 'Sashima, Ibaraki', distanceMin: 25, amount: 560000, currency: 'JPY', condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '무료취소 · 체크인 10일 전까지', freeCancelUntil: '2026-11-13', validUntil: '2026-09-26', status: 'listed' },
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
    quotes: [],
  },
];
