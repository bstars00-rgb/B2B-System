/**
 * 포인트몰 목데이터 — OP 포인트로 교환하는 상품/혜택 (오마이호텔 운영).
 * 3차 고도화(오피포인트) 프로토타입. 폐기 시 이 파일도 함께 삭제.
 *
 * 리딤 성격: 닷비즈를 재이용하게 만드는 리워드 → 닷비즈 연계 혜택(수수료 할인·객실 업그레이드)과
 * 범용 기프트를 섞어 둔다.
 */

export interface MallItem {
  id: string;
  name: string;
  category: '닷비즈 혜택' | '기프트카드' | '여행 혜택' | '프리미엄';
  cost: number;
  icon: string;
  desc: string;
}

export const MALL_ITEMS: MallItem[] = [
  { id: 'fee-5', name: '닷비즈 예약 수수료 5% 할인 쿠폰', category: '닷비즈 혜택', cost: 1_500, icon: '🎟️', desc: '다음 예약 1건 수수료 5% 할인' },
  { id: 'sbux', name: '스타벅스 e-기프트 ¥500', category: '기프트카드', cost: 1_000, icon: '☕', desc: '모바일 바코드 즉시 발송' },
  { id: 'amz', name: 'Amazon 기프트카드 ¥1,000', category: '기프트카드', cost: 2_000, icon: '🛒', desc: '이메일로 코드 전송' },
  { id: 'upg', name: '호텔 객실 업그레이드 바우처', category: '여행 혜택', cost: 3_000, icon: '🛏️', desc: '제휴 호텔 예약 시 1회 업그레이드' },
  { id: 'lounge', name: '공항 라운지 이용권 1매', category: '여행 혜택', cost: 5_000, icon: '🛫', desc: '주요 국제공항 라운지' },
  { id: 'fee-100', name: '닷비즈 수수료 무료 쿠폰 (¥10,000 한도)', category: '닷비즈 혜택', cost: 4_000, icon: '💳', desc: '예약 1건 수수료 전액 무료(한도 내)' },
  { id: 'dyson', name: 'Dyson Supersonic 드라이어', category: '프리미엄', cost: 45_000, icon: '💨', desc: '대형 리워드 — 연간 우수 OP' },
  { id: 'airpods', name: 'Apple AirPods Pro', category: '프리미엄', cost: 32_000, icon: '🎧', desc: '대형 리워드' },
];
