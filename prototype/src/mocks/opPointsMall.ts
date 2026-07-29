/**
 * 포인트몰 목데이터 — OP 포인트로 교환하는 상품/혜택 (오마이호텔 운영).
 * 3차 고도화(오피포인트) 프로토타입. 폐기 시 이 파일도 함께 삭제.
 *
 * 리딤 기준 = **USD**(현업 2026-07-29). 최소 USD 10부터. 화면에서 USD → 포인트로 환산해
 * "USD 10 = 14.8 P" 형태로 안내(화폐값 포인트 노출 지양). USD 오름차순 진열.
 *
 * **국가별 상품 구성(현업 2026-07-29):** 고객(OP)의 국가에 따라 사용·수령 가능한
 * 로컬 상품이 다르다(예: 중국 고객 = 중국 내에서 쓰는 상품). 여기에 더해 어디서나
 * 통용되는 **국제 공통** 상품(여행·프리미엄 실물)을 함께 진열한다.
 * ※ 닷비즈 수수료 할인 쿠폰류는 리워드 상품에서 제외(현업).
 */

export type MallRegion = 'global' | 'KR' | 'CN' | 'JP';
export type MallCountry = Exclude<MallRegion, 'global'>;

export interface MallItem {
  id: string;
  name: string;
  category: '기프트카드' | '여행 혜택' | '프리미엄';
  /** 사용/수령 가능 지역. 'global' = 국제 공통(어디서나). */
  region: MallRegion;
  /** 상품 가치 (USD) — 화면에서 포인트로 환산 표시 */
  costUSD: number;
  icon: string;
  desc: string;
}

/** 고객 국가 옵션(로컬 상품 노출용). 실제로는 고객 계정 국가로 자동 결정. */
export const MALL_COUNTRIES: { code: MallCountry; label: string; flag: string }[] = [
  { code: 'KR', label: '대한민국', flag: '🇰🇷' },
  { code: 'CN', label: '중국', flag: '🇨🇳' },
  { code: 'JP', label: '일본', flag: '🇯🇵' },
];

/** 국제 공통 — 어디서나 통용(여행·프리미엄 실물). 정렬은 화면에서. */
export const GLOBAL_ITEMS: MallItem[] = [
  { id: 'g-upg', name: '호텔 객실 업그레이드 바우처', category: '여행 혜택', region: 'global', costUSD: 30, icon: '🛏️', desc: '제휴 호텔 예약 시 1회 업그레이드' },
  { id: 'g-lounge', name: '공항 라운지 이용권 1매', category: '여행 혜택', region: 'global', costUSD: 50, icon: '🛫', desc: '전 세계 주요 국제공항 라운지' },
  { id: 'g-airpods', name: 'Apple AirPods Pro', category: '프리미엄', region: 'global', costUSD: 250, icon: '🎧', desc: '전 세계 배송 · 대형 리워드' },
  { id: 'g-dyson', name: 'Dyson Supersonic 드라이어', category: '프리미엄', region: 'global', costUSD: 350, icon: '💨', desc: '전 세계 배송 · 연간 우수 OP' },
];

/** 국가별 로컬 — 해당 국가 내에서 사용·수령. */
export const LOCAL_ITEMS: Record<MallCountry, MallItem[]> = {
  KR: [
    { id: 'kr-sbux', name: '스타벅스 코리아 e-기프트', category: '기프트카드', region: 'KR', costUSD: 10, icon: '☕', desc: '모바일 바코드 즉시 발송' },
    { id: 'kr-gs25', name: 'GS25 모바일 상품권', category: '기프트카드', region: 'KR', costUSD: 15, icon: '🏪', desc: '전국 GS25 편의점' },
    { id: 'kr-baemin', name: '배달의민족 e-쿠폰', category: '기프트카드', region: 'KR', costUSD: 20, icon: '🍗', desc: '배달앱 즉시 사용' },
    { id: 'kr-ssg', name: '신세계 상품권', category: '기프트카드', region: 'KR', costUSD: 40, icon: '🛍️', desc: '전국 신세계·이마트' },
  ],
  CN: [
    { id: 'cn-sbux', name: '스타벅스 차이나 e-기프트', category: '기프트카드', region: 'CN', costUSD: 10, icon: '☕', desc: '중국 내 스타벅스 모바일' },
    { id: 'cn-meituan', name: '메이퇀(美团) 바우처', category: '기프트카드', region: 'CN', costUSD: 15, icon: '🍜', desc: '중국 로컬 배달·생활 서비스' },
    { id: 'cn-jd', name: 'JD.com(京东) 기프트카드', category: '기프트카드', region: 'CN', costUSD: 25, icon: '🛒', desc: '중국 온라인 쇼핑' },
    { id: 'cn-ctrip', name: 'Trip.com 차이나 여행 쿠폰', category: '여행 혜택', region: 'CN', costUSD: 40, icon: '✈️', desc: '중국 내 항공·호텔 예약' },
  ],
  JP: [
    { id: 'jp-sbux', name: '스타벅스 재팬 e-기프트', category: '기프트카드', region: 'JP', costUSD: 10, icon: '☕', desc: '일본 내 스타벅스 모바일' },
    { id: 'jp-seven', name: '세븐일레븐 재팬 상품권', category: '기프트카드', region: 'JP', costUSD: 15, icon: '🏪', desc: '일본 전국 세븐일레븐' },
    { id: 'jp-amazon', name: 'Amazon.co.jp 기프트', category: '기프트카드', region: 'JP', costUSD: 20, icon: '🛒', desc: '일본 아마존 이메일 코드' },
    { id: 'jp-rakuten', name: '라쿠텐(楽天) 포인트', category: '기프트카드', region: 'JP', costUSD: 25, icon: '🎁', desc: '일본 라쿠텐 생태계' },
  ],
};

const byCostAsc = (a: MallItem, b: MallItem) => a.costUSD - b.costUSD;

/** 국제 공통(USD 오름차순). */
export function globalItemsSorted(): MallItem[] {
  return [...GLOBAL_ITEMS].sort(byCostAsc);
}

/** 선택 국가의 로컬 상품(USD 오름차순). */
export function localItemsSorted(country: MallCountry): MallItem[] {
  return [...LOCAL_ITEMS[country]].sort(byCostAsc);
}
