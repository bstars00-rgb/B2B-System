import { SEED_PROMOS } from '../mocks/opPointsPromos';
import { promoForStay } from '../utils/opPoints';
import { todayIso } from '../utils/dashboardStats';

/**
 * 오피포인트 배수 적립 배지 — Phase 2 Q&A No.4: 프로모션 호텔은 **룸 리스트·Create Booking 화면**에서도
 * "적립 200% · 2X"처럼 보여 예약할 때 알아보게 한다. **상대 배지만** — 실제 적립률은 노출하지 않는다.
 * 프로모 기간은 예약일(오늘) 기준. 데이터: ELLIS 배수 프로모(프로토타입은 SEED_PROMOS).
 */
export function EarnBadge({ multiplier, partial = false }: { multiplier: number; partial?: boolean }) {
  if (multiplier <= 1) return null;
  const x = `${Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(1)}X`;
  return (
    <span
      className="whitespace-nowrap rounded-sm bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
      title="오피포인트 배수 적립 프로모션 — 이 호텔(객실)을 예약하면 포인트가 배수로 적립됩니다"
    >
      {partial ? '일부 객실 ' : ''}포인트 {Math.round(multiplier * 100)}% 적립 · {x}
    </span>
  );
}

/** 호텔 카드용 — 전 객실 배수면 그대로, 특정 룸타입·레이트플랜만이면 '일부 객실' */
export function HotelEarnBadge({ hotelId }: { hotelId: string }) {
  const today = todayIso();
  const all = promoForStay(hotelId, '', today, SEED_PROMOS); // 룸 조건 없는('all') 프로모만 매칭
  if (all.multiplier > 1) return <EarnBadge multiplier={all.multiplier} />;
  const any = promoForStay(hotelId, '*', today, SEED_PROMOS);
  return <EarnBadge multiplier={any.multiplier} partial />;
}

/** 룸 리스트 행용 — 룸타입·레이트플랜까지 매칭 */
export function RoomEarnBadge({ hotelId, roomText }: { hotelId: string; roomText: string }) {
  const m = promoForStay(hotelId, roomText, todayIso(), SEED_PROMOS).multiplier;
  return <EarnBadge multiplier={m} />;
}
