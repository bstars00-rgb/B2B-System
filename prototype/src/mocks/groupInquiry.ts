import { allHotels, cityEnOf } from './hotelDb';

/**
 * 단체 문의 · 역경매(RFP) 소싱 — **프로토타입 · 폐기 가능 구조.**
 *
 * 현업 기획(2026-09-21): 고객사가 마켓플레이스에서 단체 문의를 넣으면 메일로 접수 → 우리가
 * 호텔들에게 역경매로 뿌려 견적 회수 → **우리 마크업을 자동으로 얹어**(net→sell) 고객사에 리스트업
 * → 고객사 선택 시 리퀘스트 예약. 마크업은 **일률(글로벌 %) 설정.** net·마크업률은 고객 비노출.
 *
 * 상세 기획: docs/plan/feature-group-inquiry-rfp.md
 * ※ 폐기 = 이 파일 + utils/groupInquiryStore.ts + components/GroupInquiryPage.tsx + 사이드바 한 줄 삭제.
 */

export type InquiryStatus =
  | 'Submitted' // 접수(메일 발송)
  | 'Sourcing' // 호텔에 RFP 배포·견적 수집 중
  | 'Quoted' // 견적 회수 + 마크업 적용 + 리스트업 완료
  | 'Requested' // 고객 선택 → 리퀘스트 예약(호텔 응답 대기)
  | 'Confirmed' // 호텔 수락
  | 'Cancelled';

export interface RoomReq {
  roomType: string;
  count: number;
}

/** 호텔 회수 견적 1건. net(원가)만 저장 — sell(고객가)는 마크업 설정으로 화면에서 산출. */
export interface HotelQuote {
  id: string;
  hotelId: string;
  hotelName: string;
  star?: number;
  location: string;
  /** 앵커(기준점)로부터 차량 분 — 앵커 있을 때만 */
  distanceMin?: number;
  /** 호텔 회수가(원가) — 내부. 고객 비노출 */
  netAmount: number;
  currency: string;
  condition: string;
  cancellation: string;
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
  /** 기준점(앵커) — 경기장 등 + 거리 제약 */
  anchorName?: string;
  anchorRadiusMin?: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: RoomReq[];
  mealPlan: string;
  guests: number;
  nationality?: string;
  currency: string;
  /** 예산 — 고객 입력은 **1실·1박 기준**. budgetTotal은 × 실수 × 박수로 환산한 총액(견적 비교 기준). */
  budgetPerRoomNight?: number;
  budgetTotal?: number;
  notes?: string;
  createdAt: string;
  submittedAt?: string;
  quoteDeadline?: string;
  quotes: HotelQuote[];
  selectedQuoteId?: string;
}

/** 마크업 설정 — 일률(글로벌). 정률(%) 기본. */
export interface MarkupConfig {
  type: 'pct' | 'fixed';
  value: number;
}
export const DEFAULT_MARKUP: MarkupConfig = { type: 'pct', value: 12 };

const roundTo = (n: number, unit: number) => Math.round(n / unit) * unit;

/** net(원가) → sell(고객가). 고객에겐 sell만 보인다. */
export function applyMarkup(net: number, cfg: MarkupConfig): number {
  if (cfg.type === 'fixed') return net + cfg.value;
  return roundTo(net * (1 + cfg.value / 100), 100);
}

export const fmtMoney = (n: number, currency: string) => `${currency} ${Math.round(n).toLocaleString()}`;

export const nights = (ci: string, co: string) =>
  Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000));

export const roomsSummary = (rooms: RoomReq[]) => rooms.map((r) => `${r.roomType} ×${r.count}`).join(', ');
export const roomsTotal = (rooms: RoomReq[]) => rooms.reduce((s, r) => s + (Number(r.count) || 0), 0);

const addDays = (iso: string, d: number) =>
  new Date(new Date(iso).getTime() + d * 86400000).toISOString();

/**
 * 역경매 시뮬레이트 — 문의를 호텔들에 뿌려 견적을 회수한 결과(프로토타입 결정론적 생성).
 * 대상: 호텔 특정 시 그 호텔+동일 도시 형제, 지역만이면 해당 지역/국가 호텔군.
 * net은 예산 대비 스프레드(일부 예산 이하·일부 초과)로 생성 — 리스트업 비교가 드러나게.
 */
export function generateQuotes(inq: GroupInquiry): HotelQuote[] {
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
    '무료취소 · 체크인 14일 전까지',
    '체크인 7일 전부터 1박 부과',
    '비환불(그룹 특가)',
    '무료취소 · 체크인 10일 전까지',
    '체크인 3일 전부터 전액',
  ];
  const budget = inq.budgetTotal ?? 600000;
  const base = inq.submittedAt ?? inq.createdAt;
  return picked.map((h, i) => ({
    id: `Q-${inq.id}-${i + 1}`,
    hotelId: h.id,
    hotelName: h.name,
    star: h.star,
    location: cityEnOf(h.city.destination),
    distanceMin: inq.anchorName ? dists[i % dists.length] : undefined,
    netAmount: roundTo(budget * factors[i % factors.length], 100),
    currency: inq.currency,
    condition: `${roomsSummary(inq.rooms)} · ${inq.mealPlan} · ${inq.nights}박`,
    cancellation: cxl[i % cxl.length],
    validUntil: addDays(base, 5),
    status: 'listed' as const,
  }));
}

/** 시드 문의 2건 — 이바라키(견적 회수 완료·선택 대기) + 오사카(접수·견적 대기). */
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
    nationality: '중국 대표팀 선수',
    currency: 'JPY',
    budgetPerRoomNight: 9100, // 10실 × 7박 × 9,100 = 637,000
    budgetTotal: 637000,
    notes: '경기장 차량 30분 이내. 선수단 단체 이동 — 동일 호텔 우선.',
    createdAt: '2026-09-21T02:10:00.000Z',
    submittedAt: '2026-09-21T02:10:00.000Z',
    quoteDeadline: '2026-09-26T02:10:00.000Z',
    selectedQuoteId: undefined,
    quotes: [
      {
        id: 'Q-ibaraki-1', hotelId: 'HTL-IBR-01', hotelName: 'Route Inn Koga Ekimae', star: 3,
        location: 'Koga, Ibaraki', distanceMin: 12, netAmount: 590000, currency: 'JPY',
        condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '무료취소 · 체크인 14일 전까지',
        validUntil: '2026-09-26T02:10:00.000Z', status: 'listed',
      },
      {
        id: 'Q-ibaraki-2', hotelId: 'HTL-IBR-02', hotelName: 'Hotel Sunroute Sakai', star: 3,
        location: 'Sakai, Ibaraki', distanceMin: 9, netAmount: 618000, currency: 'JPY',
        condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '체크인 7일 전부터 1박 부과',
        validUntil: '2026-09-26T02:10:00.000Z', status: 'listed',
      },
      {
        id: 'Q-ibaraki-3', hotelId: 'HTL-IBR-03', hotelName: 'Toyoko Inn Koga-eki Kita-guchi', star: 3,
        location: 'Koga, Ibaraki', distanceMin: 18, netAmount: 648000, currency: 'JPY',
        condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '비환불(그룹 특가)',
        validUntil: '2026-09-26T02:10:00.000Z', status: 'listed',
      },
      {
        id: 'Q-ibaraki-4', hotelId: 'HTL-IBR-04', hotelName: 'Business Hotel Sashima', star: 3,
        location: 'Sashima, Ibaraki', distanceMin: 25, netAmount: 560000, currency: 'JPY',
        condition: 'Twin ×5, Single ×5 · Room Only · 7박', cancellation: '체크인 10일 전까지 무료취소',
        validUntil: '2026-09-26T02:10:00.000Z', status: 'listed',
      },
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
    nationality: '기업 연수단',
    currency: 'JPY',
    budgetPerRoomNight: 30000, // 8실 × 3박 × 30,000 = 720,000
    budgetTotal: 720000,
    notes: '난바/신사이바시 도보권 선호.',
    createdAt: '2026-09-21T05:30:00.000Z',
    submittedAt: '2026-09-21T05:30:00.000Z',
    quotes: [],
  },
];
