/**
 * Gift Mall 카탈로그 — 오피포인트 교환 상품. **프로토타입 · 예시 데이터.**
 *
 * 2026-09-29 기프트몰 업체(Giftlunut) 미팅 확정 구조:
 *   OMH가 Gift Mall UI·정책을 소유하고, Giftlunut은 뒤에서 Gift API만 제공
 *   (주문 시 기프트카드를 OP 이메일로 발송, OMH의 USD Deposit에서 차감).
 *
 * - 기프트카드는 **국가별 상품** — 한국 상품을 중국에서 쓰는 구조가 아니다.
 * - 대상 국가: KR · CN · VN · SG · IN (사업 우선순위 CN · IN).
 * - ⚠ 아래 상품·권종은 **예시**. Giftlunut Open API·국가별 카탈로그(Top 5 + 권종) 수령 후 교체.
 *
 * ※ 폐기: 이 파일 + OpPointsPage.tsx의 Gift Mall 영역.
 */

export type GiftCountry = 'KR' | 'CN' | 'VN' | 'SG' | 'IN';

export interface GiftCountryInfo {
  code: GiftCountry;
  name: string;
  flag: string;
  currency: string;
  /** 권종 표기 기호 */
  symbol: string;
}

export const GIFT_COUNTRIES: GiftCountryInfo[] = [
  { code: 'KR', name: '대한민국', flag: '🇰🇷', currency: 'KRW', symbol: '₩' },
  { code: 'CN', name: '중국', flag: '🇨🇳', currency: 'CNY', symbol: '¥' },
  { code: 'VN', name: '베트남', flag: '🇻🇳', currency: 'VND', symbol: '₫' },
  { code: 'SG', name: '싱가포르', flag: '🇸🇬', currency: 'SGD', symbol: 'S$' },
  { code: 'IN', name: '인도', flag: '🇮🇳', currency: 'INR', symbol: '₹' },
];

export const countryInfo = (c: GiftCountry): GiftCountryInfo => GIFT_COUNTRIES.find((x) => x.code === c) ?? GIFT_COUNTRIES[0];

export interface GiftProduct {
  id: string;
  country: GiftCountry;
  brand: string;
  name: string;
  category: '카페' | '편의점·마트' | '쇼핑' | '배달·외식' | '교통' | '여행' | '엔터';
  icon: string;
  /** 권종(액면가, 현지 통화) */
  denominations: number[];
  desc: string;
}

/** 국가별 인기 상품 Top 5 (예시) */
export const GIFT_CATALOG: GiftProduct[] = [
  // ── KR ──
  { id: 'kr-starbucks', country: 'KR', brand: 'Starbucks', name: '스타벅스 e-기프트카드', category: '카페', icon: '☕', denominations: [20000, 30000, 50000], desc: '전국 스타벅스 매장·앱에서 사용하는 모바일 기프트카드.' },
  { id: 'kr-oliveyoung', country: 'KR', brand: 'OLIVE YOUNG', name: '올리브영 기프트카드', category: '쇼핑', icon: '🛍️', denominations: [20000, 30000, 50000], desc: '올리브영 매장·온라인몰 사용.' },
  { id: 'kr-baemin', country: 'KR', brand: '배달의민족', name: '배민 상품권', category: '배달·외식', icon: '🛵', denominations: [20000, 30000, 50000], desc: '배달의민족 앱 결제 시 사용.' },
  { id: 'kr-cu', country: 'KR', brand: 'CU', name: 'CU 모바일상품권', category: '편의점·마트', icon: '🏪', denominations: [20000, 30000], desc: '전국 CU 편의점 사용.' },
  { id: 'kr-shinsegae', country: 'KR', brand: 'SHINSEGAE', name: '신세계 모바일상품권', category: '쇼핑', icon: '🎁', denominations: [30000, 50000, 100000], desc: '신세계백화점·이마트 등 사용.' },
  // ── CN ──
  { id: 'cn-jd', country: 'CN', brand: 'JD.com', name: '京东 E卡', category: '쇼핑', icon: '🛒', denominations: [100, 200, 500], desc: '京东商城 온라인 결제 사용.' },
  { id: 'cn-meituan', country: 'CN', brand: 'Meituan', name: '美团 代金券', category: '배달·외식', icon: '🍜', denominations: [100, 200], desc: '美团 배달·외식 결제 사용.' },
  { id: 'cn-didi', country: 'CN', brand: 'DiDi', name: '滴滴出行 代金券', category: '교통', icon: '🚕', denominations: [100, 200], desc: '滴滴 차량 호출 결제 사용.' },
  { id: 'cn-starbucks', country: 'CN', brand: 'Starbucks', name: '星巴克 电子礼品卡', category: '카페', icon: '☕', denominations: [100, 200], desc: '중국 스타벅스 매장 사용.' },
  { id: 'cn-tmall', country: 'CN', brand: 'Tmall', name: '天猫超市 卡', category: '편의점·마트', icon: '🧺', denominations: [100, 200, 500], desc: '天猫超市 온라인 결제 사용.' },
  // ── VN ──
  { id: 'vn-grab', country: 'VN', brand: 'Grab', name: 'Grab Gift Card', category: '교통', icon: '🚗', denominations: [300000, 500000], desc: 'Grab 차량·배달 결제 사용.' },
  { id: 'vn-shopee', country: 'VN', brand: 'Shopee', name: 'Shopee Voucher', category: '쇼핑', icon: '🛍️', denominations: [300000, 500000], desc: 'Shopee 베트남 결제 사용.' },
  { id: 'vn-highlands', country: 'VN', brand: 'Highlands Coffee', name: 'Highlands e-Voucher', category: '카페', icon: '☕', denominations: [300000, 500000], desc: 'Highlands Coffee 매장 사용.' },
  { id: 'vn-cgv', country: 'VN', brand: 'CGV', name: 'CGV e-Voucher', category: '엔터', icon: '🎬', denominations: [300000, 500000], desc: 'CGV 베트남 영화 관람 사용.' },
  { id: 'vn-gotit', country: 'VN', brand: 'Got It', name: 'Got It 멀티 e-Voucher', category: '쇼핑', icon: '🎁', denominations: [300000, 500000, 1000000], desc: '제휴 브랜드 다수 사용.' },
  // ── SG ──
  { id: 'sg-grab', country: 'SG', brand: 'Grab', name: 'Grab Gift Card', category: '교통', icon: '🚗', denominations: [20, 50], desc: 'Grab 차량·배달 결제 사용.' },
  { id: 'sg-fairprice', country: 'SG', brand: 'FairPrice', name: 'NTUC FairPrice e-Voucher', category: '편의점·마트', icon: '🧺', denominations: [20, 50], desc: 'FairPrice 매장 사용.' },
  { id: 'sg-starbucks', country: 'SG', brand: 'Starbucks', name: 'Starbucks SG e-Gift', category: '카페', icon: '☕', denominations: [20, 50], desc: '싱가포르 스타벅스 매장 사용.' },
  { id: 'sg-shopee', country: 'SG', brand: 'Shopee', name: 'Shopee SG Voucher', category: '쇼핑', icon: '🛍️', denominations: [20, 50], desc: 'Shopee 싱가포르 결제 사용.' },
  { id: 'sg-takashimaya', country: 'SG', brand: 'Takashimaya', name: 'Takashimaya Gift Voucher', category: '쇼핑', icon: '🎁', denominations: [50, 100], desc: 'Takashimaya 백화점 사용.' },
  // ── IN ──
  { id: 'in-amazon', country: 'IN', brand: 'Amazon Pay', name: 'Amazon Pay Gift Card', category: '쇼핑', icon: '📦', denominations: [1000, 2000, 5000], desc: 'Amazon.in 결제 사용.' },
  { id: 'in-flipkart', country: 'IN', brand: 'Flipkart', name: 'Flipkart Gift Card', category: '쇼핑', icon: '🛒', denominations: [1000, 2000, 5000], desc: 'Flipkart 결제 사용.' },
  { id: 'in-swiggy', country: 'IN', brand: 'Swiggy', name: 'Swiggy Money Voucher', category: '배달·외식', icon: '🍛', denominations: [1000, 2000], desc: 'Swiggy 배달 결제 사용.' },
  { id: 'in-myntra', country: 'IN', brand: 'Myntra', name: 'Myntra Gift Card', category: '쇼핑', icon: '👗', denominations: [1000, 2000], desc: 'Myntra 패션몰 사용.' },
  { id: 'in-mmt', country: 'IN', brand: 'MakeMyTrip', name: 'MakeMyTrip Gift Card', category: '여행', icon: '✈️', denominations: [2000, 5000], desc: 'MakeMyTrip 항공·호텔 결제 사용.' },
];

export const catalogOf = (c: GiftCountry): GiftProduct[] => GIFT_CATALOG.filter((p) => p.country === c);

/** 권종 표기 (예: ₩30,000 / ¥100 / S$20) */
export const fmtFace = (amount: number, c: GiftCountry): string => `${countryInfo(c).symbol}${amount.toLocaleString()}`;

/** 교환 상태 — 교환 시 포인트 보류(processing) → API 성공 시 발송(sent) / 실패 시 포인트 복원(failed) */
export type RedeemStatus = 'processing' | 'sent' | 'failed';

export interface GiftRedemption {
  id: string;
  /** Giftlunut 주문번호(Sandbox 시연) */
  orderNo: string;
  accountId: string;
  productId: string;
  country: GiftCountry;
  face: number;
  points: number;
  /** Deposit 차감액(USD, 시연용 환산) */
  usd: number;
  at: string;
  status: RedeemStatus;
  failReason?: string;
}

/** Giftlunut Deposit(USD 선충전) 시연 초기 잔액 */
export const SEED_DEPOSIT_USD = 2000;
