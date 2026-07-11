import { randomUUID } from 'node:crypto';
import { ErrorCodes, ToolError } from '../errors/index.js';
import type {
  Availability,
  CancellationPenalty,
  CancellationPolicyResult,
  CancellationType,
  DestinationHit,
  DestinationSearchParams,
  GatewayClient,
  HealthStatus,
  HotelDetails,
  HotelSearchParams,
  HotelSummary,
  RateDetailsResult,
  RateLookupParams,
  RateMealPlan,
  RateResult,
  RateSearchRequest,
  RateSearchResult,
} from '../types/index.js';

/**
 * MOCK_MODE=true 에서 사용하는 Gateway 대체 구현.
 * 실제 Gateway 가 없는 로컬 환경에서 현실적인 결정론적(deterministic) 데이터를 반환한다.
 *
 * 특수 목적지 ID (에러/엣지 케이스 재현용):
 * - DST-EMPTY   → 결과 없음 (NO_RESULTS)
 * - DST-PARTIAL → 일부 공급사 실패 (partial_success + warnings)
 * - DST-TIMEOUT → ELLIS_TIMEOUT 발생
 * - DST-FAIL    → ELLIS_ERROR 발생
 */

interface MockDestination extends DestinationHit {
  aliases: string[];
}

const DESTINATIONS: MockDestination[] = [
  { destination_id: 'DST-TYO', name: 'Tokyo', country_code: 'JP', type: 'city', hotel_count: 4, aliases: ['tokyo', '도쿄', '동경', 'とうきょう'] },
  { destination_id: 'DST-OSA', name: 'Osaka', country_code: 'JP', type: 'city', hotel_count: 2, aliases: ['osaka', '오사카'] },
  { destination_id: 'DST-SEL', name: 'Seoul', country_code: 'KR', type: 'city', hotel_count: 3, aliases: ['seoul', '서울'] },
  { destination_id: 'DST-SIN', name: 'Singapore', country_code: 'SG', type: 'city', hotel_count: 3, aliases: ['singapore', '싱가포르', '싱가폴', 'marina bay', '마리나베이'] },
  { destination_id: 'DST-BKK', name: 'Bangkok', country_code: 'TH', type: 'city', hotel_count: 3, aliases: ['bangkok', '방콕'] },
  { destination_id: 'DST-DAD', name: 'Da Nang', country_code: 'VN', type: 'city', hotel_count: 2, aliases: ['da nang', 'danang', '다낭'] },
  { destination_id: 'DST-PARTIAL', name: 'Partial City (mock)', country_code: 'XX', type: 'city', hotel_count: 2, aliases: ['partial'] },
  { destination_id: 'DST-EMPTY', name: 'Empty Island (mock)', country_code: 'XX', type: 'region', hotel_count: 0, aliases: ['empty'] },
  { destination_id: 'DST-TIMEOUT', name: 'Timeout Bay (mock)', country_code: 'XX', type: 'region', hotel_count: 0, aliases: ['timeout'] },
  { destination_id: 'DST-FAIL', name: 'Failure Cove (mock)', country_code: 'XX', type: 'region', hotel_count: 0, aliases: ['fail'] },
];

const HOTELS: HotelDetails[] = [
  // Tokyo
  hotel('HTL-TYO-001', 'DST-TYO', 'Tokyo', 'Ohmy Tokyo Station Hotel', 4, 35.6812, 139.7671, '1-9-1 Marunouchi, Chiyoda-ku, Tokyo', 8.6),
  hotel('HTL-TYO-002', 'DST-TYO', 'Tokyo', 'Shinjuku Garden Inn', 3, 35.6938, 139.7034, '3-38-1 Shinjuku, Shinjuku-ku, Tokyo', 8.1),
  hotel('HTL-TYO-003', 'DST-TYO', 'Tokyo', 'Ginza Imperial Palace View', 5, 35.6717, 139.765, '4-1-2 Ginza, Chuo-ku, Tokyo', 9.2),
  hotel('HTL-TYO-004', 'DST-TYO', 'Tokyo', 'Asakusa Riverside Ryokan', 3, 35.7118, 139.7967, '2-13-5 Kaminarimon, Taito-ku, Tokyo', 8.4),
  // Osaka
  hotel('HTL-OSA-001', 'DST-OSA', 'Osaka', 'Namba Central Hotel', 4, 34.6661, 135.5011, '2-3-9 Namba, Chuo-ku, Osaka', 8.3),
  hotel('HTL-OSA-002', 'DST-OSA', 'Osaka', 'Umeda Sky Suites', 5, 34.7055, 135.4903, '1-1-88 Oyodonaka, Kita-ku, Osaka', 9.0),
  // Seoul
  hotel('HTL-SEL-001', 'DST-SEL', 'Seoul', 'Myeongdong Grand Palace', 5, 37.5636, 126.9838, '123 Toegye-ro, Jung-gu, Seoul', 9.1),
  hotel('HTL-SEL-002', 'DST-SEL', 'Seoul', 'Hongdae Stay Inn', 3, 37.5563, 126.9236, '45 Wausan-ro, Mapo-gu, Seoul', 8.0),
  hotel('HTL-SEL-003', 'DST-SEL', 'Seoul', 'Gangnam Business Hotel', 4, 37.4979, 127.0276, '520 Teheran-ro, Gangnam-gu, Seoul', 8.5),
  // Singapore
  hotel('HTL-SIN-001', 'DST-SIN', 'Singapore', 'Marina Bay Grand', 5, 1.2834, 103.8607, '10 Bayfront Avenue, Singapore', 9.3),
  hotel('HTL-SIN-002', 'DST-SIN', 'Singapore', 'Clarke Quay Riverside', 4, 1.2906, 103.8465, '3 River Valley Road, Singapore', 8.7),
  hotel('HTL-SIN-003', 'DST-SIN', 'Singapore', 'Chinatown Boutique Stay', 3, 1.2831, 103.8443, '36 Pagoda Street, Singapore', 8.2),
  // Bangkok
  hotel('HTL-BKK-001', 'DST-BKK', 'Bangkok', 'Sukhumvit Sky Tower', 5, 13.7384, 100.5609, '250 Sukhumvit Road, Bangkok', 8.9),
  hotel('HTL-BKK-002', 'DST-BKK', 'Bangkok', 'Riverside Chao Phraya Resort', 4, 13.7222, 100.5136, '2 Charoen Krung Road, Bangkok', 8.6),
  hotel('HTL-BKK-003', 'DST-BKK', 'Bangkok', 'Khaosan Traveler Lodge', 3, 13.759, 100.4977, '99 Khaosan Road, Bangkok', 7.8),
  // Da Nang
  hotel('HTL-DAD-001', 'DST-DAD', 'Da Nang', 'My Khe Beachfront Resort', 5, 16.0605, 108.2459, 'Vo Nguyen Giap, Son Tra, Da Nang', 9.0),
  hotel('HTL-DAD-002', 'DST-DAD', 'Da Nang', 'Han River City Hotel', 4, 16.0678, 108.2208, '216 Bach Dang, Hai Chau, Da Nang', 8.4),
  // Partial City (공급사 부분 실패 재현용)
  hotel('HTL-PC-001', 'DST-PARTIAL', 'Partial City', 'Partial Plaza Hotel', 4, 10.0, 10.0, '1 Mock Street, Partial City', 8.0),
  hotel('HTL-PC-002', 'DST-PARTIAL', 'Partial City', 'Partial Bay Resort', 5, 10.01, 10.01, '2 Mock Avenue, Partial City', 8.8),
];

function hotel(
  hotel_id: string,
  destination_id: string,
  destination: string,
  hotel_name: string,
  star_rating: number,
  latitude: number,
  longitude: number,
  address: string,
  review_score: number,
): HotelDetails {
  return {
    hotel_id,
    destination_id,
    destination,
    hotel_name,
    star_rating,
    latitude,
    longitude,
    address,
    review_score,
    description: `${hotel_name} — ${destination} 중심부에 위치한 ${star_rating}성급 호텔입니다.`,
    amenities: star_rating >= 4
      ? ['wifi', 'restaurant', 'fitness', 'pool', 'concierge']
      : ['wifi', 'restaurant', '24h front desk'],
    check_in_time: '15:00',
    check_out_time: '11:00',
    room_count: 80 + star_rating * 40,
    notices: ['비흡연 객실 기준', '조기 체크인은 호텔 사정에 따라 불가할 수 있음'],
  };
}

interface PlanTemplate {
  idx: number;
  room_type_id: string;
  room_type_name: string;
  rate_plan_name: string;
  meal_plan: RateMealPlan;
  cancellation_type: CancellationType;
  price_factor: number;
  supplier_id: string;
  min_star?: number;
}

const PLAN_TEMPLATES: PlanTemplate[] = [
  { idx: 1, room_type_id: 'RT-STD', room_type_name: 'Standard Room', rate_plan_name: 'Room Only - Non Refundable', meal_plan: 'room_only', cancellation_type: 'non_refundable', price_factor: 1.0, supplier_id: 'SUP-EPS' },
  { idx: 2, room_type_id: 'RT-STD', room_type_name: 'Standard Room', rate_plan_name: 'Breakfast Included - Free Cancellation', meal_plan: 'breakfast_included', cancellation_type: 'free_cancellation', price_factor: 1.18, supplier_id: 'SUP-HBD' },
  { idx: 3, room_type_id: 'RT-DLX', room_type_name: 'Deluxe Room', rate_plan_name: 'Room Only - Free Cancellation', meal_plan: 'room_only', cancellation_type: 'free_cancellation', price_factor: 1.3, supplier_id: 'SUP-EPS' },
  { idx: 4, room_type_id: 'RT-DLX', room_type_name: 'Deluxe Room', rate_plan_name: 'Half Board - Partial Penalty', meal_plan: 'half_board', cancellation_type: 'partial_penalty', price_factor: 1.45, supplier_id: 'SUP-DIRECT' },
  { idx: 5, room_type_id: 'RT-SUI', room_type_name: 'Junior Suite', rate_plan_name: 'Full Board - Free Cancellation', meal_plan: 'full_board', cancellation_type: 'free_cancellation', price_factor: 1.9, supplier_id: 'SUP-DIRECT', min_star: 4 },
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000,
  );
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const FAILING_SUPPLIER = 'SUP-HBD';

export class MockGatewayClient implements GatewayClient {
  /** search_id → 발급된 요금 (get_rate_details / get_cancellation_policy 조회용) */
  private readonly issuedSearches = new Map<string, RateResult[]>();

  async searchDestinations(
    params: DestinationSearchParams,
    _traceId: string,
  ): Promise<DestinationHit[]> {
    const q = params.query.trim().toLowerCase();
    return DESTINATIONS.filter(
      (d) => d.name.toLowerCase().includes(q) || d.aliases.some((a) => a.includes(q) || q.includes(a)),
    )
      .slice(0, params.limit)
      .map(({ aliases: _aliases, ...rest }) => rest);
  }

  async searchHotels(params: HotelSearchParams, _traceId: string): Promise<HotelSummary[]> {
    let hotels = HOTELS.slice();
    if (params.destination_id) {
      hotels = hotels.filter((h) => h.destination_id === params.destination_id);
    }
    if (params.query) {
      const q = params.query.trim().toLowerCase();
      hotels = hotels.filter((h) => h.hotel_name.toLowerCase().includes(q));
    }
    if (params.star_rating && params.star_rating.length > 0) {
      const stars = new Set(params.star_rating);
      hotels = hotels.filter((h) => stars.has(h.star_rating));
    }
    return hotels.slice(0, params.limit).map((h) => ({
      hotel_id: h.hotel_id,
      hotel_name: h.hotel_name,
      destination_id: h.destination_id,
      destination: h.destination,
      star_rating: h.star_rating,
      latitude: h.latitude,
      longitude: h.longitude,
      address: h.address,
      review_score: h.review_score,
    }));
  }

  async getHotelDetails(hotelId: string, _traceId: string): Promise<HotelDetails> {
    const found = HOTELS.find((h) => h.hotel_id === hotelId);
    if (!found) {
      throw new ToolError(ErrorCodes.NO_RESULTS, `호텔을 찾을 수 없습니다: ${hotelId}`);
    }
    return found;
  }

  async searchHotelRates(
    request: RateSearchRequest,
    _traceId: string,
  ): Promise<RateSearchResult> {
    if (request.destination_id === 'DST-TIMEOUT') {
      throw new ToolError(ErrorCodes.ELLIS_TIMEOUT, 'ELLIS 요금 시스템 응답이 지연되고 있습니다 (mock)', {
        retryable: true,
      });
    }
    if (request.destination_id === 'DST-FAIL') {
      throw new ToolError(ErrorCodes.ELLIS_ERROR, 'ELLIS 요금 시스템 오류가 발생했습니다 (mock)');
    }

    let hotels: HotelDetails[];
    if (request.hotel_ids && request.hotel_ids.length > 0) {
      const wanted = new Set(request.hotel_ids);
      hotels = HOTELS.filter((h) => wanted.has(h.hotel_id));
    } else {
      hotels = HOTELS.filter((h) => h.destination_id === request.destination_id);
    }

    const searchId = `SRCH-${randomUUID()}`;
    const isPartial = request.destination_id === 'DST-PARTIAL';
    const nights = nightsBetween(request.check_in, request.check_out);
    const roomsCount = request.rooms.length;
    const now = new Date().toISOString();

    let rates: RateResult[] = [];
    for (const h of hotels) {
      for (const plan of PLAN_TEMPLATES) {
        if (plan.min_star !== undefined && h.star_rating < plan.min_star) continue;
        if (isPartial && plan.supplier_id === FAILING_SUPPLIER) continue; // 실패 공급사 결과 누락

        const seed = hashCode(`${h.hotel_id}:${plan.idx}:${request.check_in}`);
        const basePerNight = h.star_rating * 40 + (seed % 55);
        const perNight = Math.round(basePerNight * plan.price_factor);
        const net = perNight * nights * roomsCount;
        const markup = request.include_markup ? Math.round(net * 0.12) : 0;
        const selling = net + markup;
        const tax = request.include_tax ? Math.round(selling * 0.08) : 0;
        const availability: Availability = seed % 7 === 0 ? 'on_request' : 'available';

        const deadline =
          plan.cancellation_type === 'free_cancellation'
            ? `${shiftDate(request.check_in, -3)}T23:59:59Z`
            : plan.cancellation_type === 'partial_penalty'
              ? `${shiftDate(request.check_in, -7)}T23:59:59Z`
              : null;

        rates.push({
          search_id: searchId,
          hotel_id: h.hotel_id,
          hotel_name: h.hotel_name,
          destination: h.destination,
          star_rating: h.star_rating,
          latitude: h.latitude,
          longitude: h.longitude,
          room_type_id: plan.room_type_id,
          room_type_name: plan.room_type_name,
          rate_plan_id: `RP-${h.hotel_id}-${plan.idx}`,
          rate_plan_name: plan.rate_plan_name,
          supplier_id: plan.supplier_id,
          meal_plan: plan.meal_plan,
          cancellation_type: plan.cancellation_type,
          cancellation_deadline: deadline,
          cancellation_policy_text: policyText(plan.cancellation_type, deadline),
          net_price: net,
          markup,
          selling_price: selling,
          tax,
          currency: request.currency,
          total_nights: nights,
          total_rooms: roomsCount,
          availability,
          last_updated_at: now,
          booking_token:
            availability === 'available'
              ? Buffer.from(`${searchId}:${h.hotel_id}:RP-${h.hotel_id}-${plan.idx}`).toString('base64')
              : null,
          warnings: availability === 'on_request' ? ['온리퀘스트 객실 — 확정까지 시간이 걸릴 수 있습니다'] : [],
        });
      }
    }

    // 필터 적용 (Gateway/ELLIS 룰 엔진 역할의 시뮬레이션)
    if (request.star_rating && request.star_rating.length > 0) {
      const stars = new Set(request.star_rating);
      rates = rates.filter((r) => stars.has(r.star_rating));
    }
    if (request.meal_plan !== 'any') {
      rates = rates.filter((r) => r.meal_plan === request.meal_plan);
    }
    if (request.refundable_only) {
      rates = rates.filter((r) => r.cancellation_type === 'free_cancellation');
    }
    if (request.max_total_price !== undefined) {
      rates = rates.filter((r) => r.selling_price <= request.max_total_price!);
    }
    if (request.max_nightly_price !== undefined) {
      rates = rates.filter((r) => r.selling_price / r.total_nights <= request.max_nightly_price!);
    }

    // 정렬
    const cancelRank: Record<CancellationType, number> = {
      free_cancellation: 0,
      partial_penalty: 1,
      non_refundable: 2,
    };
    switch (request.sort_by) {
      case 'price_asc':
        rates.sort((a, b) => a.selling_price - b.selling_price);
        break;
      case 'price_desc':
        rates.sort((a, b) => b.selling_price - a.selling_price);
        break;
      case 'star_desc':
        rates.sort((a, b) => b.star_rating - a.star_rating || a.selling_price - b.selling_price);
        break;
      case 'cancellation_then_price':
        rates.sort(
          (a, b) =>
            cancelRank[a.cancellation_type] - cancelRank[b.cancellation_type] ||
            a.selling_price - b.selling_price,
        );
        break;
    }

    rates = rates.slice(0, request.result_limit);

    if (rates.length === 0 && !isPartial) {
      return { search_id: searchId, status: 'no_results', rates: [], warnings: [], failed_suppliers: [] };
    }

    this.issuedSearches.set(searchId, rates);

    if (isPartial) {
      return {
        search_id: searchId,
        status: 'partial_success',
        rates,
        warnings: ['일부 공급사가 시간 내에 응답하지 않아 결과가 불완전할 수 있습니다 (1/3 공급사 실패)'],
        failed_suppliers: [FAILING_SUPPLIER],
      };
    }
    return { search_id: searchId, status: 'success', rates, warnings: [], failed_suppliers: [] };
  }

  async getRateDetails(params: RateLookupParams, _traceId: string): Promise<RateDetailsResult> {
    const rate = this.findIssuedRate(params);
    const perNight = Math.round(rate.selling_price / rate.total_nights);
    return {
      rate,
      price_per_night: Array.from({ length: rate.total_nights }, () => perNight),
      includes: [
        rate.meal_plan === 'room_only' ? '객실만 (식사 불포함)' : `식사 포함: ${rate.meal_plan}`,
        'VAT/봉사료 조건은 tax 필드 참조',
      ],
      remarks: ['요금은 조회 시점 기준이며 예약 시 변동될 수 있습니다'],
    };
  }

  async getCancellationPolicy(
    params: RateLookupParams,
    _traceId: string,
  ): Promise<CancellationPolicyResult> {
    const rate = this.findIssuedRate(params);
    const penalties: CancellationPenalty[] = [];
    if (rate.cancellation_type === 'non_refundable') {
      penalties.push({
        from: rate.last_updated_at,
        to: null,
        penalty_type: 'percentage',
        penalty_value: 100,
        currency: rate.currency,
      });
    } else if (rate.cancellation_deadline) {
      penalties.push({
        from: rate.cancellation_deadline,
        to: null,
        penalty_type: rate.cancellation_type === 'partial_penalty' ? 'nights' : 'percentage',
        penalty_value: rate.cancellation_type === 'partial_penalty' ? 1 : 100,
        currency: rate.currency,
      });
    }
    return {
      search_id: params.search_id,
      hotel_id: rate.hotel_id,
      rate_plan_id: rate.rate_plan_id,
      cancellation_type: rate.cancellation_type,
      cancellation_deadline: rate.cancellation_deadline,
      policy_text: rate.cancellation_policy_text,
      penalties,
    };
  }

  async healthCheck(_traceId: string): Promise<HealthStatus> {
    return {
      status: 'ok',
      latency_ms: 1,
      mock_mode: true,
      checked_at: new Date().toISOString(),
      message: 'mock gateway 정상 (실제 ELLIS 연동 아님)',
    };
  }

  private findIssuedRate(params: RateLookupParams): RateResult {
    const rates = this.issuedSearches.get(params.search_id);
    if (!rates) {
      throw new ToolError(
        ErrorCodes.STALE_RESULT,
        `search_id(${params.search_id}) 결과가 만료되었거나 존재하지 않습니다. search_hotel_rates 를 다시 실행해 주세요.`,
      );
    }
    const rate = rates.find(
      (r) =>
        r.rate_plan_id === params.rate_plan_id &&
        (params.hotel_id === undefined || r.hotel_id === params.hotel_id),
    );
    if (!rate) {
      throw new ToolError(
        ErrorCodes.NO_RESULTS,
        `해당 검색 결과에서 요금제(${params.rate_plan_id})를 찾을 수 없습니다`,
      );
    }
    return rate;
  }
}

function policyText(type: CancellationType, deadline: string | null): string {
  switch (type) {
    case 'free_cancellation':
      return `${deadline ?? ''} 이전 취소 시 무료, 이후 취소/노쇼 시 전액 위약금이 부과됩니다.`;
    case 'partial_penalty':
      return `${deadline ?? ''} 이전 취소 시 1박 요금 위약금, 이후 취소/노쇼 시 전액 위약금이 부과됩니다.`;
    case 'non_refundable':
      return '환불 불가 요금입니다. 예약 후 취소/변경 시 전액 위약금이 부과됩니다.';
  }
}
