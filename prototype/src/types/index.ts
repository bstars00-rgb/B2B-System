/** ELLIS MCP 호텔 요금 자연어 검색 — 공통 타입 정의 */

export type CancellationType =
  | 'free_cancellation'
  | 'non_refundable'
  | 'partial_penalty';

export type Availability = 'available' | 'on_request' | 'unavailable';

/** MCP 도구(get_hotel_rates 등)가 반환하는 정규화된 요금 결과 1건 */
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
  supplier_id: string;
  meal_plan: string;
  cancellation_type: CancellationType;
  cancellation_deadline: string | null;
  cancellation_policy_text: string;
  net_price: number;
  markup: number;
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

/** 자연어에서 추출된 검색 조건 (mock 규칙 기반 파서 출력) */
export interface SearchConditions {
  raw_query: string;
  destination: string | null;
  /** 특정 호텔 지목 검색 시 매칭된 호텔명 (예: "마리나 베이 샌즈") */
  hotel_name: string | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  adults: number | null;
  children: number | null;
  rooms: number | null;
  star_rating: number | null;
  breakfast_included: boolean | null;
  free_cancellation_only: boolean | null;
  budget_max: number | null;
  budget_currency: string;
}

export type ScenarioId =
  | 'normal'
  | 'free_cancel_only'
  | 'non_refundable'
  | 'mixed_breakfast'
  | 'multi_currency'
  | 'partial_failure'
  | 'no_results'
  | 'timeout'
  | 'unauthorized'
  | 'stale';

export type SearchErrorCode =
  | 'ELLIS_TIMEOUT'
  | 'UNAUTHORIZED'
  | 'NO_RESULTS';

/** Mock 검색 응답 (Orchestrator → Chat UI 응답을 모사) */
export interface SearchResponse {
  search_id: string;
  status: 'ok' | 'partial' | 'empty' | 'error';
  error_code?: SearchErrorCode;
  error_message?: string;
  /** 공급사 일부 실패 등 경고 배너용 메시지 */
  warning_banner?: string;
  failed_suppliers?: string[];
  /** 결과가 오래됨(STALE) — 재검색 권장 */
  is_stale?: boolean;
  searched_at: string;
  results: RateResult[];
  /** 특정 호텔 검색 시 함께 제안하는 추천 호텔 요금 (동일 도시·유사 성급) */
  recommended_results?: RateResult[];
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  conditions: SearchConditions;
  scenario: ScenarioId;
  result_count: number;
  status: SearchResponse['status'];
  searched_at: string;
}

/** 호텔 단위로 묶은 결과 (카드/비교 뷰 용) */
export interface HotelGroup {
  hotel_id: string;
  hotel_name: string;
  destination: string;
  star_rating: number;
  latitude: number;
  longitude: number;
  min_rate: RateResult;
  rates: RateResult[];
}
