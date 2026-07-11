import type { HotelGroup, RateResult } from '../types';

/** RateResult 목록을 호텔 단위로 그룹핑하고 최저가 요금을 대표로 지정 */
export function groupByHotel(results: RateResult[]): HotelGroup[] {
  const map = new Map<string, RateResult[]>();
  for (const r of results) {
    const list = map.get(r.hotel_id);
    if (list) list.push(r);
    else map.set(r.hotel_id, [r]);
  }
  const groups: HotelGroup[] = [];
  for (const rates of map.values()) {
    const sorted = [...rates].sort((a, b) => a.selling_price - b.selling_price);
    const first = sorted[0];
    if (!first) continue;
    groups.push({
      hotel_id: first.hotel_id,
      hotel_name: first.hotel_name,
      destination: first.destination,
      star_rating: first.star_rating,
      latitude: first.latitude,
      longitude: first.longitude,
      min_rate: first,
      rates: sorted,
    });
  }
  return groups.sort((a, b) => a.min_rate.selling_price - b.min_rate.selling_price);
}
