/**
 * 도메인 타입 정의.
 * 금액 필드는 Gateway 응답을 그대로 전달한다 — MCP 서버에서 금액을 계산/보정하지 않는다.
 */

export type CancellationType = 'free_cancellation' | 'non_refundable' | 'partial_penalty';
export type Availability = 'available' | 'on_request' | 'unavailable';

/** 검색 필터용 (any 포함) */
export type MealPlanFilter = 'any' | 'room_only' | 'breakfast_included' | 'half_board' | 'full_board';
/** 실제 요금제에 붙는 식사 조건 */
export type RateMealPlan = Exclude<MealPlanFilter, 'any'>;

export type SortBy = 'price_asc' | 'price_desc' | 'star_desc' | 'cancellation_then_price';

export interface RoomRequest {
  adults: number;
  children: number;
  children_ages: number[];
}

export interface RateResult {
  search_id: string;
  hotel_id: string;
  hotel_name: string;
  destination: string;
  star_rating: number;
  latitude: number;
  longitude: number;
  room_type_id: string;
  room_type_name: string;
  rate_plan_id: string;
  rate_plan_name: string;
  /** AGENT_USER 롤에서는 응답 전 마스킹(제거)된다 */
  supplier_id?: string;
  meal_plan: RateMealPlan;
  cancellation_type: CancellationType;
  cancellation_deadline: string | null;
  cancellation_policy_text: string;
  /** AGENT_USER 롤에서는 응답 전 마스킹(제거)된다 */
  net_price?: number;
  /** AGENT_USER 롤에서는 응답 전 마스킹(제거)된다 */
  markup?: number;
  selling_price: number;
  tax: number;
  currency: string;
  total_nights: number;
  total_rooms: number;
  availability: Availability;
  last_updated_at: string;
  booking_token: string | null;
  warnings: string[];
}

export interface DestinationHit {
  destination_id: string;
  name: string;
  country_code: string;
  type: 'city' | 'region' | 'landmark';
  hotel_count?: number;
}

export interface HotelSummary {
  hotel_id: string;
  hotel_name: string;
  destination_id: string;
  destination: string;
  star_rating: number;
  latitude: number;
  longitude: number;
  address: string;
  review_score?: number;
}

export interface HotelDetails extends HotelSummary {
  description: string;
  amenities: string[];
  check_in_time: string;
  check_out_time: string;
  room_count?: number;
  notices?: string[];
}

export interface RateSearchRequest {
  /** 서버 세션 컨텍스트에서 주입 — 클라이언트 입력값은 무시된다 */
  agent_id: string;
  destination_id?: string;
  hotel_ids?: string[];
  check_in: string;
  check_out: string;
  rooms: RoomRequest[];
  nationality?: string;
  residence_country?: string;
  currency: string;
  meal_plan: MealPlanFilter;
  refundable_only: boolean;
  max_total_price?: number;
  max_nightly_price?: number;
  star_rating?: number[];
  sort_by: SortBy;
  result_limit: number;
  include_tax: boolean;
  include_markup: boolean;
}

export interface RateSearchResult {
  search_id: string;
  status: 'success' | 'partial_success' | 'no_results';
  rates: RateResult[];
  warnings: string[];
  /** 응답 실패 공급사 목록 — AGENT_USER 롤에서는 마스킹된다 */
  failed_suppliers?: string[];
}

export interface RateDetailsResult {
  rate: RateResult;
  price_per_night: number[];
  includes: string[];
  remarks: string[];
}

export interface CancellationPenalty {
  from: string;
  to: string | null;
  penalty_type: 'percentage' | 'fixed' | 'nights';
  penalty_value: number;
  currency: string;
}

export interface CancellationPolicyResult {
  search_id: string;
  hotel_id: string;
  rate_plan_id: string;
  cancellation_type: CancellationType;
  cancellation_deadline: string | null;
  policy_text: string;
  penalties: CancellationPenalty[];
}

export interface RecentSearchEntry {
  searched_at: string;
  tool: string;
  summary: Record<string, unknown>;
  result_count: number;
  search_id?: string;
  trace_id: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  latency_ms: number;
  mock_mode: boolean;
  checked_at: string;
  message?: string;
}

export interface DestinationSearchParams {
  query: string;
  language?: string;
  limit: number;
}

export interface HotelSearchParams {
  destination_id?: string;
  query?: string;
  star_rating?: number[];
  limit: number;
}

export interface RateLookupParams {
  search_id: string;
  rate_plan_id: string;
  hotel_id?: string;
}

/**
 * Search Gateway 클라이언트 인터페이스.
 * 실제 구현(gateway-client)과 mock 구현(mock-gateway)이 동일 계약을 따른다.
 * 모든 호출에 trace_id 를 전파한다.
 */
export interface GatewayClient {
  searchDestinations(params: DestinationSearchParams, traceId: string): Promise<DestinationHit[]>;
  searchHotels(params: HotelSearchParams, traceId: string): Promise<HotelSummary[]>;
  getHotelDetails(hotelId: string, traceId: string): Promise<HotelDetails>;
  searchHotelRates(request: RateSearchRequest, traceId: string): Promise<RateSearchResult>;
  getRateDetails(params: RateLookupParams, traceId: string): Promise<RateDetailsResult>;
  getCancellationPolicy(params: RateLookupParams, traceId: string): Promise<CancellationPolicyResult>;
  healthCheck(traceId: string): Promise<HealthStatus>;
}
