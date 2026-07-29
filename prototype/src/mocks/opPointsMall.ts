/**
 * 포인트몰 목데이터 — OP 포인트로 교환하는 상품/혜택 (오마이호텔 운영).
 * 3차 고도화(오피포인트) 프로토타입. 폐기 시 이 파일도 함께 삭제.
 *
 * 리딤 기준 = **USD**(현업 2026-07-29). 최소 USD 10부터. 화면에서 USD → 포인트로 환산해
 * "USD 10 = 14.8 P" 형태로 안내(화폐값 포인트 노출 지양). USD 오름차순 진열.
 */

export interface MallItem {
  id: string;
  name: string;
  category: '닷비즈 혜택' | '기프트카드' | '여행 혜택' | '프리미엄';
  /** 상품 가치 (USD) — 화면에서 포인트로 환산 표시 */
  costUSD: number;
  icon: string;
  desc: string;
}

/** USD 오름차순 (최소 USD 10) */
export const MALL_ITEMS: MallItem[] = [
  { id: 'sbux', name: '스타벅스 e-기프트', category: '기프트카드', costUSD: 10, icon: '☕', desc: '모바일 바코드 즉시 발송' },
  { id: 'fee-5', name: '닷비즈 예약 수수료 5% 할인 쿠폰', category: '닷비즈 혜택', costUSD: 10, icon: '🎟️', desc: '다음 예약 1건 수수료 5% 할인' },
  { id: 'amz', name: 'Amazon 기프트카드', category: '기프트카드', costUSD: 20, icon: '🛒', desc: '이메일로 코드 전송' },
  { id: 'upg', name: '호텔 객실 업그레이드 바우처', category: '여행 혜택', costUSD: 30, icon: '🛏️', desc: '제휴 호텔 예약 시 1회 업그레이드' },
  { id: 'fee-100', name: '닷비즈 수수료 무료 쿠폰 (한도 내)', category: '닷비즈 혜택', costUSD: 40, icon: '💳', desc: '예약 1건 수수료 전액 무료(한도 내)' },
  { id: 'lounge', name: '공항 라운지 이용권 1매', category: '여행 혜택', costUSD: 50, icon: '🛫', desc: '주요 국제공항 라운지' },
  { id: 'airpods', name: 'Apple AirPods Pro', category: '프리미엄', costUSD: 250, icon: '🎧', desc: '대형 리워드' },
  { id: 'dyson', name: 'Dyson Supersonic 드라이어', category: '프리미엄', costUSD: 350, icon: '💨', desc: '대형 리워드 — 연간 우수 OP' },
];
