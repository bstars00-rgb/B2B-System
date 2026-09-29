/**
 * Gift Mall 카탈로그 — 오피포인트 교환 상품. **프로토타입 · 예시 데이터.**
 *
 * 2026-09-29 기프트카드 업체 **Giftronaut**(회의록 표기 'Giftlunut') 미팅 확정 구조:
 *   OMH가 Gift Mall UI·정책을 소유하고, Giftronaut은 뒤에서 Gift API만 제공
 *   (주문 시 기프트카드를 OP 이메일로 발송, OMH의 USD Balance(선충전)에서 차감).
 * API 문서: https://api.giftronaut.com/docs/reference — 필드명은 Catalog API(`GET /catalog/branded-cards`)를 따른다.
 *
 * - 기프트카드는 **국가별 상품** — 한국 상품을 중국에서 쓰는 구조가 아니다(countryCode = ISO-3166 alpha-3).
 * - 대상 국가: KR · CN · VN · SG · IN (사업 우선순위 CN · IN).
 * - 브랜드명은 Giftronaut **공개 브랜드 카탈로그**(2026-09-29 조회)에 있는 상품으로 골랐다.
 *   ⚠ 권종(prices)은 **예시**. 실제 가용 상품·권종은 API로 조회(공개 카탈로그는 실시간 아님) — 국가별 Top 5 수령 후 교체.
 *
 * ※ 폐기: 이 파일 + OpPointsPage.tsx의 Gift Mall 영역.
 */

export type GiftCountry = 'KR' | 'CN' | 'VN' | 'SG' | 'IN';

export interface GiftCountryInfo {
  code: GiftCountry;
  /** Giftronaut `countryCode` (ISO-3166-1 alpha-3) */
  iso3: string;
  name: string;
  flag: string;
  currency: string;
  /** 권종 표기 기호 */
  symbol: string;
}

export const GIFT_COUNTRIES: GiftCountryInfo[] = [
  { code: 'KR', iso3: 'KOR', name: '대한민국', flag: '🇰🇷', currency: 'KRW', symbol: '₩' },
  { code: 'CN', iso3: 'CHN', name: '중국', flag: '🇨🇳', currency: 'CNY', symbol: '¥' },
  { code: 'VN', iso3: 'VNM', name: '베트남', flag: '🇻🇳', currency: 'VND', symbol: '₫' },
  { code: 'SG', iso3: 'SGP', name: '싱가포르', flag: '🇸🇬', currency: 'SGD', symbol: 'S$' },
  { code: 'IN', iso3: 'IND', name: '인도', flag: '🇮🇳', currency: 'INR', symbol: '₹' },
];

export const countryInfo = (c: GiftCountry): GiftCountryInfo => GIFT_COUNTRIES.find((x) => x.code === c) ?? GIFT_COUNTRIES[0];

export interface GiftProduct {
  /** Giftronaut `productId` — 주문 시 그대로 전달 */
  id: string;
  country: GiftCountry;
  brand: string;
  name: string;
  category: '카페' | '편의점·마트' | '쇼핑' | '배달·외식' | '교통' | '여행' | '엔터';
  icon: string;
  /** Giftronaut `priceType` — FIXED: prices 중 선택 / RANGE: [min, max] 사이 priceStep 단위(프로토타입은 FIXED만) */
  priceType: 'FIXED';
  /** Giftronaut `prices` — 권종(액면가, 현지 통화 · 정수) */
  prices: number[];
  /** Giftronaut `description` */
  desc: string;
}

/** 국가별 인기 상품 5종 (공개 카탈로그 브랜드 · 권종 예시) */
export const GIFT_CATALOG: GiftProduct[] = [
  // ── KR ──
  { id: 'kr-oliveyoung', country: 'KR', brand: 'OLIVE YOUNG', name: 'Olive Young Mobile Voucher', category: '쇼핑', icon: '🛍️', priceType: 'FIXED', prices: [20000, 30000, 50000], desc: '올리브영 매장·온라인몰 사용.' },
  { id: 'kr-baemin', country: 'KR', brand: '배달의민족', name: 'Baemin Mobile Voucher', category: '배달·외식', icon: '🛵', priceType: 'FIXED', prices: [20000, 30000, 50000], desc: '배달의민족 앱 결제 시 사용.' },
  { id: 'kr-cu', country: 'KR', brand: 'CU', name: 'CU Mobile Voucher', category: '편의점·마트', icon: '🏪', priceType: 'FIXED', prices: [20000, 30000], desc: '전국 CU 편의점 사용.' },
  { id: 'kr-gs25', country: 'KR', brand: 'GS25', name: 'GS25 모바일상품권', category: '편의점·마트', icon: '🏪', priceType: 'FIXED', prices: [20000, 30000], desc: '전국 GS25 편의점 사용.' },
  { id: 'kr-shinsegae', country: 'KR', brand: 'SHINSEGAE', name: 'Shinsegae Voucher', category: '쇼핑', icon: '🎁', priceType: 'FIXED', prices: [30000, 50000, 100000], desc: '신세계백화점·이마트 등 사용.' },
  // ── CN ──
  { id: 'cn-starbucks', country: 'CN', brand: 'Starbucks', name: 'Starbucks Nationwide CNY', category: '카페', icon: '☕', priceType: 'FIXED', prices: [100, 200], desc: '중국 전역 스타벅스 매장 사용.' },
  { id: 'cn-tmall', country: 'CN', brand: 'Tmall', name: 'Tmall Mart CNY', category: '편의점·마트', icon: '🧺', priceType: 'FIXED', prices: [100, 200, 500], desc: '天猫超市 온라인 결제 사용.' },
  { id: 'cn-hema', country: 'CN', brand: 'Freshippo', name: 'Freshippo (Hema) CNY', category: '편의점·마트', icon: '🛒', priceType: 'FIXED', prices: [100, 200, 500], desc: '盒马鲜生 매장·앱 사용.' },
  { id: 'cn-kfc', country: 'CN', brand: 'KFC', name: 'KFC Gift Card CNY', category: '배달·외식', icon: '🍗', priceType: 'FIXED', prices: [100, 200], desc: '중국 KFC 매장·배달 사용.' },
  { id: 'cn-amap', country: 'CN', brand: 'AMap', name: 'AMap Taxi Vouchers CNY', category: '교통', icon: '🚕', priceType: 'FIXED', prices: [100, 200], desc: '高德地图 택시 호출 결제 사용.' },
  // ── VN ── (공개 카탈로그상 VND 상품이 적음 — Choice Card 보완 검토)
  { id: 'vn-starbucks', country: 'VN', brand: 'Starbucks', name: 'Starbucks VND', category: '카페', icon: '☕', priceType: 'FIXED', prices: [300000, 500000], desc: '베트남 스타벅스 매장 사용.' },
  { id: 'vn-grab', country: 'VN', brand: 'Grab', name: 'GrabGifts VND', category: '교통', icon: '🚗', priceType: 'FIXED', prices: [300000, 500000], desc: 'Grab 차량·배달 결제 사용.' },
  { id: 'vn-grabfood', country: 'VN', brand: 'Grab', name: 'GrabGifts (Food) VND', category: '배달·외식', icon: '🍜', priceType: 'FIXED', prices: [300000, 500000], desc: 'GrabFood 배달 결제 사용.' },
  { id: 'vn-parisbaguette', country: 'VN', brand: 'Paris Baguette', name: 'Paris Baguette VND', category: '카페', icon: '🥐', priceType: 'FIXED', prices: [300000, 500000], desc: '베트남 파리바게뜨 매장 사용.' },
  { id: 'vn-baoz', country: 'VN', brand: 'Baoz Dimsum', name: 'Baoz Dimsum VND', category: '배달·외식', icon: '🥟', priceType: 'FIXED', prices: [300000, 500000], desc: 'Baoz Dimsum 매장 사용.' },
  // ── SG ──
  { id: 'sg-grab', country: 'SG', brand: 'Grab', name: 'GrabGifts (Transport) SGD', category: '교통', icon: '🚗', priceType: 'FIXED', prices: [20, 50], desc: 'Grab 차량 호출 결제 사용.' },
  { id: 'sg-grabmart', country: 'SG', brand: 'Grab', name: 'GrabGifts (Mart) SGD', category: '편의점·마트', icon: '🧺', priceType: 'FIXED', prices: [20, 50], desc: 'GrabMart 장보기 결제 사용.' },
  { id: 'sg-zalora', country: 'SG', brand: 'ZALORA', name: 'Zalora SGD', category: '쇼핑', icon: '👗', priceType: 'FIXED', prices: [50, 100], desc: 'Zalora 싱가포르 온라인몰 사용.' },
  { id: 'sg-amazonfresh', country: 'SG', brand: 'Amazon', name: 'Amazon Fresh SGD', category: '편의점·마트', icon: '📦', priceType: 'FIXED', prices: [20, 50], desc: 'Amazon Fresh 싱가포르 사용.' },
  { id: 'sg-robinsons', country: 'SG', brand: 'Robinsons', name: 'Robinsons Online SGD', category: '쇼핑', icon: '🎁', priceType: 'FIXED', prices: [50, 100], desc: 'Robinsons 온라인몰 사용.' },
  // ── IN ──
  { id: 'in-amazonpay', country: 'IN', brand: 'Amazon Pay', name: 'Amazon Pay eGift Card', category: '쇼핑', icon: '📦', priceType: 'FIXED', prices: [1000, 2000, 5000], desc: 'Amazon.in 결제 사용.' },
  { id: 'in-flipkart', country: 'IN', brand: 'Flipkart', name: 'Super GC by Flipkart', category: '쇼핑', icon: '🛒', priceType: 'FIXED', prices: [1000, 2000, 5000], desc: 'Flipkart 결제 사용.' },
  { id: 'in-myntra', country: 'IN', brand: 'Myntra', name: 'Myntra Gift Card', category: '쇼핑', icon: '👗', priceType: 'FIXED', prices: [1000, 2000], desc: 'Myntra 패션몰 사용.' },
  { id: 'in-mmt', country: 'IN', brand: 'MakeMyTrip', name: 'MakeMyTrip - Flights & Hotels', category: '여행', icon: '✈️', priceType: 'FIXED', prices: [2000, 5000], desc: 'MakeMyTrip 항공·호텔 결제 사용.' },
  { id: 'in-nykaa', country: 'IN', brand: 'Nykaa', name: 'Nykaa Fashion E-Gift Card', category: '쇼핑', icon: '💄', priceType: 'FIXED', prices: [1000, 2000], desc: 'Nykaa Fashion 사용.' },
];

export const catalogOf = (c: GiftCountry): GiftProduct[] => GIFT_CATALOG.filter((p) => p.country === c);

/** 권종 표기 (예: ₩30,000 / ¥100 / S$20) */
export const fmtFace = (amount: number, c: GiftCountry): string => `${countryInfo(c).symbol}${amount.toLocaleString()}`;

/**
 * 교환 상태 — Giftronaut 주문 상태·웹훅에 대응.
 * - processing: 포인트 보류 · 주문 PENDING / IN_PROGRESS
 * - sent: COMPLETE · `order.delivery_complete`
 * - bounced: `order.bounced`(이메일 반송) — 카드는 발급·Balance 차감됨 → **포인트 복원 X**, 이메일 확인 후 재발송(`POST /orders/{id}/resend`)
 * - failed: 주문 생성 거절(402 INSUFFICIENT_BALANCE · 400 VALIDATION_ERROR 등) — 주문이 안 만들어짐 → **포인트 복원**
 */
export type RedeemStatus = 'processing' | 'sent' | 'bounced' | 'failed';

export interface GiftRedemption {
  id: string;
  /** Giftronaut `orderId` (예: OT20260929000123) — 생성 실패 시 없음 */
  orderNo?: string;
  /** 우리가 만든 `idempotencyKey` — 재시도·결과 확인(`GET /orders?clientOrderId=`)용으로 교환 기록에 저장 */
  idempotencyKey: string;
  accountId: string;
  /** 발송 이메일(`recipients[].email`) — 재발송 시 수정 가능(`updatedEmail`) */
  email: string;
  productId: string;
  country: GiftCountry;
  face: number;
  points: number;
  /** Balance 차감액(USD) — 실제는 Giftronaut가 상품 환율로 환산. 시연은 우리 환율표 */
  usd: number;
  at: string;
  status: RedeemStatus;
  /** 내부 사유(API 코드 등) — **ELLIS 전용**, 고객 화면엔 일반 문구만 */
  failReason?: string;
  resent?: number;
  /** 감사(Audit) 이력 — 추가만(append-only). 요청·주문 생성·발송·반송·재발송(이메일 변경 전→후)·실패 */
  events: { at: string; text: string }[];
}

/** Balance(USD 선충전) 시연 초기 잔액 — Production 가정. (Sandbox는 가상 $10,000, $1,000 미만 시 자동 보충) */
export const SEED_DEPOSIT_USD = 2000;

const shift = (iso: string, days: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);

/** 유효기간 만료일 — 발송일 + N일 (확정 2026-09-29: 180일, 미사용 소멸) */
export const expiryOf = (sentOn: string, days: number): string => shift(sentOn, days);

/**
 * 감사(Audit) 시연용 과거 교환 — 같은 회사 다른 OP 계정(고객 화면엔 안 보임, ELLIS 로그에만).
 * 만료(소멸) · 만료 임박 · 재발송(이메일 변경) · 정상 사례. 포인트·USD는 당시 값으로 **저장된 값**(정책이 바뀌어도 불변).
 */
export function seedRedemptions(today: string): GiftRedemption[] {
  const rec = (
    n: number, accountId: string, productId: string, face: number, daysAgo: number, points: number, usd: number,
    extra: Partial<GiftRedemption> = {}, events?: { at: string; text: string }[],
  ): GiftRedemption => {
    const at = shift(today, -daysAgo);
    const orderNo = `OT${at.replace(/-/g, '')}${String(100000 + n * 7919).slice(-6)}`;
    return {
      id: `seed-${n}`, orderNo, idempotencyKey: `omh-rdm-seed-${n}`, accountId, email: accountId, productId, country: 'KR',
      face, points, usd, at, status: 'sent',
      events: events ?? [
        { at: `${at} 10:0${n}`, text: `교환 요청 · ${points} P 보류` },
        { at: `${at} 10:0${n}`, text: `주문 생성 ${orderNo} · Balance −USD ${usd.toFixed(2)}` },
        { at: `${at} 10:1${n}`, text: '발송 완료 (order.delivery_complete)' },
      ],
      ...extra,
    };
  };
  const b = shift(today, -45);
  return [
    rec(1, 'osaka.desk@attic-tours.com', 'kr-cu', 20000, 200, 20, 13.51),
    rec(2, 'fit.team@attic-tours.com', 'kr-oliveyoung', 30000, 172, 30, 20.27),
    rec(3, 'osaka.desk@attic-tours.com', 'kr-baemin', 20000, 45, 20, 13.51, { email: 'osaka.kansai@attic-tours.com', resent: 1 }, [
      { at: `${b} 14:02`, text: '교환 요청 · 20 P 보류' },
      { at: `${b} 14:02`, text: '주문 생성 · Balance −USD 13.51' },
      { at: `${b} 14:09`, text: '이메일 반송 (order.bounced)' },
      { at: `${b} 16:30`, text: '재발송 osaka.desk@attic-tours.com → osaka.kansai@attic-tours.com' },
      { at: `${b} 16:31`, text: '발송 완료 (order.delivery_complete)' },
    ]),
    rec(4, 'fit.team@attic-tours.com', 'kr-gs25', 20000, 12, 20, 13.51),
  ];
}
