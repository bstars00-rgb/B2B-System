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
  /** 요청 룸타입 (예: ['더블','트윈'] — "더블+트윈 각각 1개씩" 분리 예약 요청) */
  room_types?: string[] | null;
  /** 역/지하철 인접 호텔만 (후속 정제 질문: "역에서 가까운 곳만") */
  near_station: boolean | null;
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

/** 생성된 예약 1건 — 실제 포털 Bookings 목록/상세와 동일 필드 구성 */
export interface Booking {
  /** ELLIS 예약 코드 (예: J26071110004H01) */
  ellis_code: string;
  /** 셀러 예약 코드 (예: ATTIC202607110001) */
  seller_code: string;
  booking_date: string;
  status: 'Confirmed' | 'Cancelled';
  payment_status: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'Refunded' | 'Partially Refunded';
  hotel_id: string;
  hotel_name: string;
  region: string;
  check_in: string;
  check_out: string;
  nights: number;
  room_type: string;
  room_count: number;
  traveler_name: string;
  travelers: number;
  currency: string;
  /** B.Sum Amt — 세금 포함 청구 총액 */
  sum_amt: number;
  client_cancel_dl: string | null;
  cancel_date: string | null;
  /** 발행된 인보이스 번호 (미발행 시 null) */
  invoice_no?: string | null;
  /** 분쟁 상태 표시 (없으면 undefined) */
  dispute?: string | null;
  dispute_remark?: string | null;
  /** 투숙객 상세 (없으면 1st traveler 기준으로 자동 생성) */
  travelers_detail?: TravelerDetail[];
  /** 특별 요청 */
  special_request?: {
    nonSmoking?: boolean;
    smoking?: boolean;
    highFloor?: boolean;
    babyCot?: boolean;
    lateCheckIn?: boolean;
    text?: string;
  };
}

export interface TravelerDetail {
  room: number;
  gender: 'M' | 'F';
  local: string;
  lastEn: string;
  firstEn: string;
  childBirthday?: string;
  childAge?: string;
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
