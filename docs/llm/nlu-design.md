# 자연어 → 구조화 검색 조건 변환(NLU) 설계서

> **문서 상태**: DRAFT v0.1
> **작성일**: 2026-07-10 (본 문서의 모든 날짜 해석 예시는 오늘 = **2026-07-10** 기준)
> **상위 문서**: [`docs/architecture/ellis-mcp-llm-search.md`](../architecture/ellis-mcp-llm-search.md)
> **범위**: Chat UI → LLM Orchestrator 구간에서 자연어 발화를 MCP Tool 호출 파라미터(구조화 JSON)로 변환하는 로직. 조회 전용 MVP.

---

## 0. 설계 원칙 요약

| # | 원칙 |
|---|------|
| P1 | LLM은 **조건 추출·질문 생성·서술**만 담당한다. 데이터(호텔·요금·ID)는 전부 MCP Tool 결과에서만 온다 |
| P2 | 필수 슬롯이 비면 **도구를 호출하지 않고 되묻는다** (Tool 호출 전 차단) |
| P3 | 애매한 해석(연도 추정, 기본 통화 적용 등)은 수행하되 **반드시 사용자에게 해석 결과를 명시**한다 |
| P4 | 후속 발화는 이전 조건 슬롯을 재사용하고 **변경분만 덮어쓴다** |
| P5 | `agent_id`, 마켓, 권한은 서버(Orchestrator/MCP)가 주입한다. LLM 입출력에 절대 포함하지 않는다 |

---

## 1. 검색 의도(Intent) 분류

### 1.1 Intent 목록

| Intent | 설명 | 주 사용 MCP Tool |
|--------|------|------------------|
| `destination_search` | 목적지 탐색·모호한 지명/랜드마크 해소 | `search_destinations` |
| `hotel_rate_search` | 목적지+날짜+인원 기반 요금 검색 (핵심 플로우) | `search_hotel_rates` |
| `hotel_name_search` | 특정 호텔명을 지목한 검색 | `search_hotels` → `search_hotel_rates` |
| `hotel_detail_lookup` | 호텔 시설·주소·정책 등 상세 조회 | `get_hotel_details` |
| `price_filter_search` | 예산·가격 조건이 중심인 검색/재검색 | `search_hotel_rates` |
| `comparison` | 검색 결과 간 비교 요청 | `compare_hotel_rates` |
| `rate_detail_lookup` | 특정 요금([R-n])의 상세 확인 | `get_rate_details` |
| `cancellation_inquiry` | 취소 정책·마감일·위약금 문의 | `get_cancellation_policy` |
| `follow_up_refine` | 직전 검색 조건의 일부 수정·추가 필터 | (변경 슬롯 병합 후) `search_hotel_rates` 등 |
| `history_lookup` | 최근 검색 이력 조회 | `get_recent_searches` |
| `status_check` | 진행 중 검색 상태 확인 | `get_search_status` |
| `clarification_answer` | 시스템 질문에 대한 답변 (슬롯 채움) | 슬롯 병합 후 원래 intent 재개 |
| `out_of_scope` | 예약 생성/취소/변경/결제/정산 등 조회 밖 요청, 비호텔 잡담 | 없음 — 거절 및 안내 |

### 1.2 분류 기준

| Intent | 트리거 신호(예) | 우선순위 규칙 |
|--------|----------------|---------------|
| `destination_search` | "어디가 좋아?", 지명만 단독 언급, 모호 지명("강남 근처", "Marina Bay 근처") | 목적지 미확정 상태에서 지명이 나오면 **항상 요금 검색보다 먼저** 수행 (규칙 ⑥) |
| `hotel_rate_search` | 날짜+지역+인원 조합, "찾아줘/검색해줘/얼마야" | 필수 슬롯 충족 시에만 도구 호출 |
| `hotel_name_search` | 고유 호텔명(음차 포함): "메리어트", "マリーナベイサンズ", "香格里拉" | 호텔명 감지 시 `search_hotels`로 후보 확정이 선행 (규칙 ⑦) |
| `hotel_detail_lookup` | "수영장 있어?", "주소 알려줘", "체크인 몇 시야?" | 대상 호텔이 문맥에 있으면 그 `hotel_id` 사용 |
| `price_filter_search` | "10만원 이하", "under $200", "予算は2万円" | 기존 검색 문맥이 있으면 `follow_up_refine`으로 겸분류 |
| `comparison` | "비교해줘", "어느 게 더 싸/취소 조건 좋아?" | 직전 `result_set` 필요. 없으면 검색 먼저 유도 |
| `rate_detail_lookup` | "[R-3] 자세히", "두 번째 요금 상세" | result_id 참조 해소 후 호출 |
| `cancellation_inquiry` | "무료취소 언제까지?", "위약금은?" | 특정 rate 문맥 필요 |
| `follow_up_refine` | "날짜만 9월로", "조식 추가", "한 명 더", 지시대명사("거기", "그 호텔") | **직전 검색 슬롯 존재 + 변경 표현** 둘 다 있을 때 |
| `history_lookup` | "아까 검색한 거", "어제 찾아본 호텔" | Conversation Store 밖 이력은 `get_recent_searches` |
| `status_check` | "아직이야?", "검색 다 됐어?" | 진행 중 `search_id` 있을 때만 |
| `out_of_scope` | "예약해줘", "취소해줘", "결제", "인보이스", 호텔 무관 주제 | **최우선 분류.** 다른 intent와 겹치면 out_of_scope 우선 (예: "제일 싼 걸로 예약까지 해줘" → 검색은 수행, 예약은 거절) |

> [가정] intent 분류는 별도 분류기 없이 LLM tool-choice로 수행하되, 위 기준을 시스템 프롬프트에 규칙으로 명시한다. 신뢰도가 낮은 발화(다중 해석)는 도구 호출 대신 되묻기를 선택한다.

---

## 2. Entity Extraction 및 정규화 규칙

### 2.1 항목별 정규화 표

| 항목 | 대상 필드 | 입력 예 (한/영/중/일) | 정규화 규칙 |
|------|-----------|----------------------|-------------|
| 날짜/기간 | `check_in`, `check_out` | "8월 20일부터 23일까지", "내일부터 2박", "Aug 20–23", "8月20日から3泊", "8月20号到23号" | ISO `YYYY-MM-DD`. 상대 표현은 오늘(2026-07-10) 기준 절대 날짜로. "N박"은 `check_out = check_in + N일`. 상세는 §5 |
| 인원(성인) | `rooms[].adults` | "성인 2명", "2 adults", "大人2名", "两个大人", "부부" | 객실별 정수. "부부/커플"=성인 2, "혼자/솔로"=성인 1. 객실 수 미지정 시 1실 [가정] |
| 아동/나이 | `rooms[].children`, `rooms[].children_ages[]` | "아이 1명(7살)", "kids 5 and 9", "子供2人(4歳と8歳)", "一个6岁小孩" | 나이는 만 나이 정수 배열. `children` 수와 `children_ages[]` 길이 일치 필수. **나이 미제공 시 도구 호출 금지, 질문** (규칙 ④) |
| 객실 수 | `rooms[]` 배열 길이 | "방 2개", "2 rooms", "2部屋", "两间房" | 객실별 인원 배분이 불명확하면 배분을 질문. "성인 4명 방 2개" → 배분 확인 |
| 성급 | `star_rating[]` | "4성급", "4~5성", "5성 이상", "四星", "4つ星以上" | 정수 배열. "4성급"=`[4]`, "4성 이상"=`[4,5]`, "이상/以上/at least" 표현은 5까지 확장 |
| 식사 | `meal_plan` | "조식 포함", "breakfast included", "朝食付き", "含早餐", "룸온리" | enum 정규화 [가정]: `room_only` / `breakfast` / `half_board` / `full_board` / `all_inclusive`. "조식만 있으면 돼"=`breakfast` |
| 취소 | `refundable_only` | "무료취소 되는 걸로", "free cancellation", "キャンセル無料", "可免费取消" | `true/false`. **"무료취소"의 실제 판정은 결과의 `cancellation_type`+`deadline`으로만 서술** — 필터는 `refundable_only=true`, 무료취소 마감일은 요금별 데이터로 안내 (규칙 ⑧) |
| 예산(1박) | `max_nightly_price` | "1박에 15만원 이하", "$200 a night", "1泊2万円まで", "每晚1000元以内" | "1박/per night/泊/每晚" 단서가 있을 때만. 숫자+통화 분리 저장 |
| 예산(총액) | `max_total_price` | "총 50만원", "전체 예산 100만원", "total under $600", "合計10万円" | "총/전체/total/合計/一共" 단서가 있을 때만. **단서가 없는 예산은 1박인지 총액인지 반드시 질문** (규칙 ⑨) |
| 통화 | `currency` | "원화로", "in USD", "円で", "美元" | ISO 4217 (KRW/USD/JPY/CNY/SGD…). "만원"→KRW, "$"→USD [가정: 미국 달러], "円/¥엔 문맥"→JPY, "元/人民币"→CNY. **미지정 시 Agent 기본 통화 적용 + 사용자에게 명시** (규칙 ⑤) |
| 국적 | `nationality` | "베트남 고객", "guest is Japanese", "客人是中国人" | ISO 3166-1 alpha-2 (VN/JP/CN…). **누락 금지** — 미지정 시 Agent 프로필 기본값 [가정] 적용 후 명시, 기본값도 없으면 질문 (규칙 ⑪) |
| 거주국 | `residence_country` | "일본 거주 한국인" | ISO 3166-1 alpha-2. 미지정 시 `nationality`와 동일 적용 후 명시 [가정] (규칙 ⑪) |
| 목적지 | `destination_id` | "싱가포르", "도쿄 신주쿠", "마리나베이 근처" | **LLM이 ID를 만들지 않는다.** 항상 `search_destinations` 결과의 `destination_id`만 사용 (규칙 ⑥⑭⑮). 랜드마크는 §8 |
| 호텔 | `hotel_ids[]` | "샹그릴라", "Marina Bay Sands", "希尔顿" | `search_hotels` 결과의 `hotel_id`만 사용. 유사 후보 다수면 선택 요청 (규칙 ⑦⑭⑮) |
| 정렬 | `sort_by` | "싼 순으로", "cheapest first", "안심한 순", "평점 좋은 순" | enum [가정]: `price_asc` / `price_desc` / `star_rating_desc` / `review_score_desc` / `distance_asc`. 기본 `price_asc` |
| 세금 | `include_tax` | "세금 포함 가격으로", "tax included" | `true/false`. 미지정 시 기본 `true`(세금 포함가) [가정] + 응답에 포함 여부 항상 표기 (규칙 ⑩) |
| 결과 수 | `result_limit` | "5개만", "top 3" | 정수. 기본 10 |
| 마크업 | `include_markup` | (사용자 발화로 제어 불가) | 항상 서버 기본값. LLM이 변경 제안·계산 금지 [가정: 셀러 판매가 = markup 포함] |

### 2.2 추출 시 공통 규칙

- 하나의 발화에 같은 항목이 두 번 나오면 **나중 값 우선** ("2명… 아니 3명" → 3명).
- 숫자 표기 정규화: 한자 숫자(二/三), 전각 숫자(２), 천 단위 구분(1,000 / 1.000) 모두 아라비아 정수로.
- 부정 표현 처리: "조식은 없어도 돼" → `meal_plan` 미설정(필터 제거), "무료취소 아니어도 됨" → `refundable_only=false`.

---

## 3. 필수값 검증 규칙

`search_hotel_rates` 호출 전 아래 검증을 **모두 통과해야** 도구를 호출한다.

| # | 검증 | 실패 시 동작 |
|---|------|-------------|
| V1 | `check_in` 존재, ISO 형식, **오늘(2026-07-10) 이후** | 과거 날짜면 질문: "체크인 날짜가 이미 지났습니다. 어떤 날짜로 검색할까요?" |
| V2 | `check_out` 존재, `check_out > check_in` (규칙 ③) | "체크아웃이 체크인보다 빠르거나 같습니다. 날짜를 다시 확인해 주세요. 혹시 M월 D일~D'일 의미셨나요?" |
| V3 | 숙박일수 상한 [가정: 30박] | "30박을 초과하는 검색은 지원하지 않습니다. 기간을 나눠서 검색할까요?" |
| V4 | `destination_id` 또는 `hotel_ids[]` 중 하나 존재 — **둘 다 MCP 결과 출처** | 목적지 미해소 시 `search_destinations` 먼저 수행(규칙 ⑥), 그래도 없으면 질문 |
| V5 | `rooms[]` 1개 이상, 객실별 `adults ≥ 1` | "객실당 투숙 인원(성인/아동)을 알려주세요." |
| V6 | 객실별 `adults + children ≤ 상한` [가정: 성인 8, 객실당 총 9명] | "객실당 최대 인원을 초과합니다. 객실을 나눠 검색할까요?" |
| V7 | `children > 0`이면 `children_ages[]` 길이 일치, 각 나이 0~17 (규칙 ④) | "아동 요금은 나이에 따라 다릅니다. 아이의 나이를 알려주세요." |
| V8 | `currency` 존재 — 미지정 시 Agent 기본 통화 주입(규칙 ⑤) | 주입 후 응답에 "통화가 지정되지 않아 기본 통화(KRW)로 조회합니다"를 명시 |
| V9 | `nationality`, `residence_country` 존재 (규칙 ⑪) | Agent 프로필 기본값 주입+명시 [가정], 기본값 없으면 질문: "투숙객 국적을 알려주세요. 국적에 따라 판매 가능 요금이 다릅니다." |
| V10 | 예산 필드가 있으면 1박/총액 구분 확정 (규칙 ⑨) | "말씀하신 예산 50만원은 1박 기준인가요, 총 숙박 요금 기준인가요?" |
| V11 | `agent_id`는 **검증 대상 아님** — 서버 주입, LLM이 설정·요구 금지 | LLM이 값을 생성하면 Orchestrator가 무시하고 세션 값으로 대체 |

### 3.1 후속 질문(Clarification) 규칙

| 누락/문제 항목 | 질문 문구(한국어 기준, 응답 언어에 맞춰 번역) | 한 번에 묻기 |
|----------------|--------------------------------------------|--------------|
| 날짜 전체 | "체크인·체크아웃 날짜를 알려주세요. (예: 8월 20일부터 2박)" | 날짜+인원 등 누락이 여러 개면 **한 메시지에 묶어서** 질문 (최대 3항목) |
| 체크아웃/박수 | "며칠 묵으실 예정인가요? 체크아웃 날짜나 박수를 알려주세요." | |
| 인원 | "객실 수와 객실별 성인·아동 인원을 알려주세요." | |
| 아동 나이 | "아이가 N명이라고 하셨는데, 각각 나이가 어떻게 되나요? (요금·정원 계산에 필요합니다)" | 검색 진행 절대 불가 항목 |
| 목적지 | "어느 도시(지역)의 호텔을 찾으세요?" | |
| 목적지 모호 | "'마리나베이'로 다음 지역이 검색되었습니다: 1) … 2) … 어느 곳인가요?" | 후보는 `search_destinations` 결과만 나열 |
| 호텔명 모호 | "'샹그릴라'와 비슷한 호텔이 N곳 있습니다: 1) [H-1] … 2) [H-2] … 어느 호텔인가요?" | 후보는 `search_hotels` 결과만 나열 |
| 예산 기준 | "예산 OO은 1박 기준인가요, 총액 기준인가요?" | |
| 국적 | "투숙객의 국적(과 거주 국가)을 알려주세요." | 기본값 주입 가능하면 질문 대신 명시 |

질문 생성 원칙: (1) 이미 아는 조건을 요약해 함께 보여준다 — "8/20~8/23 싱가포르, 성인 2명까지 확인했습니다. 아동 나이만 알려주세요." (2) 같은 항목을 두 번 연속 되묻지 않는다(두 번째는 예시를 바꿔 제시). (3) 질문 중에도 사용자가 다른 조건을 주면 슬롯에 반영한다.

---

## 4. 대화 문맥 유지 — 조건 슬롯 상태 머신

### 4.1 슬롯 컨텍스트 구조

Conversation Store에 세션별로 아래 상태를 유지한다.

```json
{
  "session_id": "sess_20260710_001",
  "state": "SEARCHED",
  "active_slots": {
    "destination_id": "d-sg-mbay-001",
    "destination_label": "Marina Bay, Singapore",
    "check_in": "2026-08-20",
    "check_out": "2026-08-23",
    "rooms": [{"adults": 2, "children": 0, "children_ages": []}],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "KRW",
    "star_rating": [4],
    "meal_plan": null,
    "refundable_only": null,
    "max_nightly_price": null,
    "max_total_price": null,
    "sort_by": "price_asc",
    "include_tax": true,
    "result_limit": 10
  },
  "pending_question": null,
  "last_result_set_id": "rs-8f2c",
  "last_search_at": "2026-07-10T09:12:03+09:00",
  "slot_provenance": {
    "currency": "agent_default",
    "nationality": "agent_default",
    "check_in": "user",
    "destination_id": "mcp_result"
  }
}
```

- `slot_provenance`(값 출처: `user` / `agent_default` / `mcp_result` / `inferred`)를 기록해, 기본값 주입분은 응답에서 항상 명시하고(P3), `destination_id`·`hotel_ids`는 출처가 `mcp_result`가 아니면 **호출을 차단**한다 (규칙 ⑭⑮).

### 4.2 상태 전이

| 상태 | 의미 | 전이 조건 |
|------|------|-----------|
| `EMPTY` | 슬롯 없음 (새 대화) | 첫 검색성 발화 → `COLLECTING` |
| `COLLECTING` | 필수 슬롯 수집 중 (되묻기 반복) | 필수값 전부 충족(V1~V10) → `READY` |
| `READY` | 검증 통과, 도구 호출 직전 | `search_hotel_rates` 호출 → `SEARCHED` |
| `SEARCHED` | 결과 보유 (`result_set_id` 존재) | 수정 발화 → `REFINING` / 비교·상세 발화 → 그대로 `SEARCHED` |
| `REFINING` | 기존 슬롯 + 변경분 병합 중 | 검증 통과 → `READY` (재검색) |
| `EXPIRED` | 결과 캐시 TTL(30분) 초과 | 결과 참조 시도 시 재검색 유도 + `STALE_RESULT` 안내 |
| 초기화 | "처음부터 다시", "새 검색", 목적지+날짜가 **동시에 전부** 교체된 발화 | 전 슬롯 폐기 → `COLLECTING` |

### 4.3 슬롯 병합(덮어쓰기) 규칙 — 규칙 ⑫⑬

| 규칙 | 내용 |
|------|------|
| M1 | 후속 발화에서 **언급된 슬롯만 덮어쓴다.** 언급 없는 슬롯은 이전 값 유지 (규칙 ⑫⑬) |
| M2 | 날짜만 바꾸면 박수 유지 시도: "날짜만 9월로 바꿔줘" + 기존 8/20~8/23(3박) → 9/20~9/23으로 해석하지 않고, **일자가 특정되지 않았으므로** "9월 며칠부터 3박으로 할까요?"라고 질문. "9월 20일로 바꿔줘"면 3박 유지해 9/20~9/23 |
| M3 | 목적지 변경 시 `destination_id`는 폐기하고 `search_destinations` 재수행 (이전 지역 ID 재사용 금지) |
| M4 | 인원 변경 시 아동 나이 재검증 — "아이 한 명 추가"면 나이 질문 |
| M5 | 필터 제거 표현("조식 조건 빼줘", "예산 상관없어") → 해당 슬롯을 `null`로 되돌림 |
| M6 | 슬롯이 바뀌어 재검색하면 `result_set_id` 무효화 — 이전 결과와 새 결과를 섞어 서술 금지 |
| M7 | 대명사 해소: "거기", "그 호텔", "两个都要", "さっきのホテル" → 직전 결과의 result_id로 해소. 해소 불가하면 질문 |

---

## 5. 날짜 해석 규칙

기준일: **2026-07-10 (금요일)**. 모든 해석 결과는 응답에서 절대 날짜로 사용자에게 확인시킨다.

### 5.1 상대 날짜 → 절대 날짜 (규칙 ①)

| 입력 | 해석 | 비고 |
|------|------|------|
| "오늘/today/今日/今天" | 2026-07-10 | 당일 체크인은 허용하되 "당일 예약은 요금 변동이 빠릅니다" 안내 [가정] |
| "내일/tomorrow/明日/明天" | 2026-07-11 | |
| "모레/day after tomorrow/明後日/后天" | 2026-07-12 | |
| "이번 주말" | 2026-07-11(토)~07-12(일) 체크인 후보 | 토요일 1박으로 가정하지 않고 박수 질문 |
| "다음 주 금요일 / next Friday / 来週の金曜日 / 下周五" | 2026-07-17 | "다음 주" = 차주 월~일 기준 [가정]. 언어권별 해석차가 있어 절대 날짜 확인 필수 |
| "다음 달 초" | 2026-08-01~08-05 범위 | 특정일 질문 |
| "8월 20일부터 2박" | check_in 2026-08-20, check_out 2026-08-22 | N박 = check_in + N일 |
| "2泊3日で8月20日から" | 2026-08-20~2026-08-22 | 일본어 "N泊M日"은 N박 기준 |
| "8月20号住到23号" | 2026-08-20~2026-08-23 | 중국어 "住到X号" = 체크아웃일 |
| "Aug 20 to 23" | 2026-08-20~2026-08-23 | |
| "20–23 Aug", "20/8" | 2026-08-20~ | DD/MM·MM/DD 혼동 위험 → §7 언어별 규칙 |

### 5.2 연도 불명확 처리 (규칙 ②)

| 입력(오늘 2026-07-10) | 해석 | 사용자 안내 |
|------|------|------|
| "8월 20일" | **2026**-08-20 (미래 최근접) | "2026년 8월 20일로 검색합니다" |
| "1월 5일" | **2027**-01-05 (올해 1/5는 과거 → 다음 해) | "내년(2027년) 1월 5일로 해석했습니다. 맞나요?" — 연도가 넘어가는 경우는 확인 강도를 높임 |
| "7월 10일" (오늘) | 2026-07-10 | 당일 여부 확인 |
| "작년 12월" | 해석 불가(과거) | 과거 날짜 검색 불가 안내 후 재질문 (V1) |
| "12/1" (영어 발화) | 2026-12-01 [가정: MM/DD] | "12월 1일(Dec 1)로 해석했습니다" — 표기 모호 시 반드시 월 이름으로 재확인 |

원칙: **미래 최근접 연도를 선택**하고, 선택 결과를 응답 첫머리에 명시한다. 선택이 6개월 이상 미래로 점프하는 경우(연도 이월)는 명시를 넘어 **확인 질문**으로 격상한다. [가정]

### 5.3 날짜 검증 (규칙 ③)

- `check_in ≥ 오늘` (V1) — 과거면 도구 호출 전 차단.
- `check_out > check_in` (V2) — 같거나 빠르면 차단. "8월 23일부터 20일까지"처럼 역순이면 오타 가능성을 제시하며 확인("8월 20일~23일 의미신가요?"). **임의로 뒤집어 검색하지 않는다.**
- 검색 가능 미래 상한 [가정: 오늘 + 365일] 초과 시 안내.

---

## 6. 검색 조건 수정 처리 (follow_up_refine)

예: 직전 검색 = 싱가포르 마리나베이, 2026-08-20~08-23, 성인 2, KRW.

| 사용자 발화 | 병합 결과 | 동작 |
|-------------|-----------|------|
| "날짜만 9월 20일로 바꿔줘" | check_in=2026-09-20, check_out=2026-09-23 (기존 3박 유지), 나머지 유지 | 재검색. "박수(3박)는 그대로 유지했습니다" 명시 |
| "날짜만 9월로 바꿔줘" | 일자 미정 | 질문: "9월 며칠 체크인으로 할까요? 박수는 기존과 같이 3박으로 유지할까요?" |
| "조식 포함으로" | meal_plan=breakfast 추가, 나머지 유지 | 재검색 |
| "성인 한 명 추가" | rooms[0].adults=3 | 재검색 |
| "아이도 한 명 데려가" | children=1, 나이 미정 | **나이 질문 후** 재검색 (규칙 ④) |
| "예산은 1박 30만원 이하" | max_nightly_price=300000 (KRW) | 재검색 |
| "도쿄로 바꿔줘" | destination_id 폐기 → `search_destinations("도쿄")` 재수행 | 목적지 재해소 후 재검색 (M3) |
| "무료취소 조건 빼줘" | refundable_only=null | 재검색 (M5) |
| "5성급도 같이 보여줘" | star_rating=[4,5] | 재검색 |
| "처음부터 다시 할게" | 전 슬롯 초기화 | `COLLECTING`으로 |

---

## 7. 다국어 처리

### 7.1 언어 감지

- 메시지 단위로 감지(문자 집합 + LLM 판별). 응답 언어 = 사용자의 최근 발화 언어 [가정: MVP 응답 언어는 한/영, 일/중 입력은 이해하되 응답 언어는 셀러 설정 우선 — 상위 문서 §10.1 #6].
- 혼용 발화("도쿄 Hilton 있어?")는 주 언어(한국어)로 응답하고 고유명사는 원문 유지.

### 7.2 언어별 특이점

| 언어 | 날짜 표기 | 인원·수량 | 호텔명 | 기타 주의 |
|------|-----------|-----------|--------|-----------|
| 한국어 | "8월 20일", "내일모레", "글피"(=3일 후) | 조사로 의미 구분: "2명**이서**"(인원) vs "2개**의** 방"(객실). "N박 M일" | 음차(샹그릴라, 콘래드) → 영문 검색 병행 | "만원" 단위 = ×10,000 KRW. "성급" 없이 "4성"도 인정 |
| 영어 | "Aug 20", "8/20"(MM/DD [가정]), "20th of Aug" | "double room"(침대 타입≠인원 2명 — 인원 별도 확인), "for two" | 정식 표기 그대로 | 날짜 숫자 표기는 월 이름으로 재확인. "$"는 통화 확인(USD/SGD/HKD 등 문맥) |
| 중국어 | "8月20号/日", "下周五", "国庆节期间"(공휴일 표현 → 특정일 질문) | "两大一小"(성인2+아동1), 한자 숫자 | 간체/번체 상표명: 香格里拉(샹그릴라), 文华东方(만다린 오리엔탈) → 영문 브랜드명으로 `search_hotels` 질의 | "元"은 CNY 확인(台币/港币 구분). 번체·간체 모두 수용 |
| 일본어 | "8月20日から3泊", "来週金曜" | "大人2名様", "子供"(나이 필수 확인) | 카타카나 음차: マリーナベイサンズ → "Marina Bay Sands"로 질의. 한자 표기 호텔(帝国ホテル=Imperial Hotel) | "泊" 단위 우선. 敬語 여부는 의미에 영향 없음 |

### 7.3 다국어 호텔명 처리 절차 (규칙 ⑦⑭⑮)

1. 발화에서 호텔명 후보 추출(음차·영문·현지어·한자 모두).
2. LLM이 알고 있는 정식 영문 명칭이 있으면 **질의어 후보에 추가**하되(예: "샹그릴라" → "Shangri-La"), 이는 검색 질의어일 뿐 결과가 아니다.
3. `search_hotels(query, destination_id?)` 호출 — 목적지 문맥이 있으면 함께 전달해 후보를 좁힌다.
4. 결과 처리:
   - 후보 1건 + 유사도 높음 → 해당 `hotel_id` 채택, 응답에 호텔 공식명 표기.
   - 후보 다수 → `[H-n]` 목록으로 제시하고 선택 요청.
   - 후보 0건 → "해당 이름의 호텔을 찾지 못했습니다" + 지역 검색 대안 제안. **비슷한 호텔을 지어내지 않는다.**
5. **금지**: LLM이 `hotel_id`/`destination_id`/`rate_id`를 기억·추측·생성하는 것. ID는 항상 현재 세션의 MCP 결과에서만 인용한다. 과거 세션에서 본 ID도 재사용 금지(재검색으로 재획득).

---

## 8. 랜드마크·모호 목적지 처리 (규칙 ⑥)

| 입력 유형 | 처리 |
|-----------|------|
| 도시명("싱가포르") | `search_destinations("Singapore")` → 후보 1건이면 즉시 채택 |
| 지역/랜드마크("마리나베이 근처", "에펠탑 주변", "新宿駅近く") | `search_destinations`에 랜드마크 질의 → 지역(district) 후보 반환 시 채택. [가정] ELLIS가 랜드마크→지역 매핑 미지원 시, 랜드마크가 속한 지역명으로 재질의하고 "OO 지역 기준으로 검색했습니다" 명시. 거리 정렬은 `sort_by=distance_asc` [가정: 지원 시] |
| 동명이지("스프링필드", "府中") | 후보 전부 나열 + 국가/주 표기 + 선택 요청 |
| 광역+세부 동시("도쿄 신주쿠") | 세부 지역 우선 질의, 실패 시 광역으로 폴백하고 명시 |
| 국가 단위("일본 아무데나") | 너무 넓음 → 도시 질문: "일본 어느 도시로 찾아드릴까요? (도쿄/오사카/후쿠오카…)" |

---

## 9. 잘못된 검색 조건 방지 로직 종합

| # | 위험 | 방지 장치 | 관련 규칙 |
|---|------|-----------|-----------|
| G1 | 과거 날짜 검색 | V1 사전 차단 + `INVALID_QUERY` 미발생 유도 | ①③ |
| G2 | 체크아웃 ≤ 체크인 | V2 차단, 임의 교정 금지·확인 질문 | ③ |
| G3 | 인원 초과 | V6 상한 검증, 객실 분할 제안 | — |
| G4 | 아동 나이 누락 | V7 — 나이 없으면 호출 자체 불가 | ④ |
| G5 | 통화 미지정 | Agent 기본 통화 주입 + provenance 기록 + 응답 명시 | ⑤ |
| G6 | 목적지 모호한 채 요금 검색 | `search_destinations` 선행 강제, `destination_id` 출처 검증 | ⑥ |
| G7 | 잘못된 호텔 매칭 | 후보 제시·선택, 유사도 낮으면 자동 채택 금지 | ⑦ |
| G8 | "무료취소" 오판정 | 필터는 `refundable_only`, 서술은 결과의 `cancellation_type`+`deadline`만 근거. "무료취소"라는 단정은 마감일과 함께만 | ⑧ |
| G9 | 1박 예산 vs 총예산 혼동 | 단서 없으면 질문(V10), 필드 분리(`max_nightly_price`/`max_total_price`) | ⑨ |
| G10 | 세금 포함 여부 혼동 | `include_tax` 명시 + 모든 가격 서술에 "세금 포함/불포함" 표기 | ⑩ |
| G11 | 판매국가·국적·거주국 누락 | V9 — 기본값 주입+명시 또는 질문. 누락 상태로 호출 금지 | ⑪ |
| G12 | 문맥 유실/오염 | 슬롯 상태 머신 + 변경분만 덮어쓰기 + provenance | ⑫⑬ |
| G13 | 존재하지 않는 ID | ID 필드는 `mcp_result` 출처만 허용(Orchestrator 레벨 검증), LLM 생성 ID는 `VALIDATION_BLOCKED` 처리 | ⑭⑮ |
| G14 | 오래된 결과 인용 | result_set TTL 30분, 초과 시 `STALE_RESULT` → 재검색 유도 | — |
| G15 | availability 오표현 | `available`만 "예약 가능", `on_request`는 "확정 대기 필요", `unavailable`은 "예약 불가". `booking_token` 없으면 견적 전용(quote-only) 명시 | — |

### 15개 규칙 ↔ 설계 매핑 요약

| 규칙 | 반영 위치 |
|------|-----------|
| ① 상대날짜→절대날짜 | §5.1 |
| ② 연도 불명확 시 합리적 판단+명시 | §5.2 |
| ③ check_out>check_in | §5.3, V2 |
| ④ 아동 나이 질문 | V7, §3.1 |
| ⑤ 통화 기본값 | V8, §2.1 통화 |
| ⑥ 목적지 모호 시 search_destinations 선행 | §8, V4 |
| ⑦ 호텔명 후보 선택 | §7.3 |
| ⑧ 무료취소 = cancellation_type+deadline | §2.1 취소, G8 |
| ⑨ 1박/총 예산 구분 | §2.1 예산, V10 |
| ⑩ 세금 포함 구분 | §2.1 세금, G10 |
| ⑪ 국적·거주국 누락 금지 | V9 |
| ⑫ 이전 조건 재사용 | §4.3 M1 |
| ⑬ 변경 항목만 덮어쓰기 | §4.3 M1~M7 |
| ⑭⑮ ID는 MCP 결과에서만 | §4.1 provenance, §7.3, G13 |

---

## 10. NLU 출력 구조화 JSON 스키마

LLM(Orchestrator 내부)의 변환 결과 표준 형식. `action`이 `call_tool`일 때만 도구가 실행된다.

```json
{
  "detected_language": "ko | en | zh | ja",
  "intent": "hotel_rate_search",
  "action": "call_tool | ask_user | reject",
  "tool": "search_hotel_rates",
  "arguments": { "...": "MCP Tool 입력 스키마와 동일. agent_id 없음(서버 주입)" },
  "slot_ops": { "reused": ["..."], "overwritten": ["..."], "cleared": ["..."] },
  "user_notice": ["기본값 주입·연도 해석 등 사용자에게 명시할 내용"],
  "clarification": { "missing": ["..."], "question": "되물을 문구" }
}
```

---

## 11. 변환 예시 15선 (사용자 발화 → 구조화 JSON)

> 공통: 오늘 = 2026-07-10. Agent 기본 통화 = KRW, 기본 국적/거주국 = KR [가정]. `agent_id`는 항상 서버 주입이므로 JSON에 나타나지 않는다. 예시의 `destination_id`/`hotel_id` 값은 모두 "선행 MCP 호출 결과에서 획득했다"는 전제의 표기용 샘플이다.

### 예시 1 — 기본 검색 (사용자 제공 예시) [가정: 원문 일부 재구성]

**사용자**: "8월 20일부터 23일까지 싱가포르 마리나베이 근처 4성급 호텔, 성인 2명 기준으로 찾아줘"

1단계 — 목적지 해소:

```json
{
  "detected_language": "ko",
  "intent": "destination_search",
  "action": "call_tool",
  "tool": "search_destinations",
  "arguments": { "query": "마리나베이 싱가포르" },
  "user_notice": ["연도가 없어 2026년 8월 20일~23일(3박)로 해석"]
}
```

2단계 — 후보 확정(`d-sg-mbay-001`, Marina Bay / Singapore) 후 요금 검색:

```json
{
  "detected_language": "ko",
  "intent": "hotel_rate_search",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "destination_id": "d-sg-mbay-001",
    "check_in": "2026-08-20",
    "check_out": "2026-08-23",
    "rooms": [{ "adults": 2, "children": 0, "children_ages": [] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "KRW",
    "star_rating": [4],
    "sort_by": "price_asc",
    "result_limit": 10,
    "include_tax": true
  },
  "slot_ops": { "reused": [], "overwritten": ["destination_id","check_in","check_out","rooms","star_rating"], "cleared": [] },
  "user_notice": [
    "통화 미지정 → 기본 통화 KRW 적용",
    "국적/거주국 미지정 → 기본값 KR 적용",
    "표시 가격은 세금 포함 기준"
  ]
}
```

### 예시 2 — 아동 포함, 나이 명시 (한국어)

**사용자**: "10월 3일부터 3박, 다낭에 성인 2명 아이 2명(5살, 9살), 방 하나로 조식 포함 찾아줘"

```json
{
  "detected_language": "ko",
  "intent": "hotel_rate_search",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "destination_id": "d-vn-danang-001",
    "check_in": "2026-10-03",
    "check_out": "2026-10-06",
    "rooms": [{ "adults": 2, "children": 2, "children_ages": [5, 9] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "KRW",
    "meal_plan": "breakfast",
    "sort_by": "price_asc",
    "result_limit": 10,
    "include_tax": true
  },
  "user_notice": ["연도 미지정 → 2026-10-03 (미래 최근접)", "통화·국적 기본값 적용(KRW/KR)"]
}
```

### 예시 3 — 아동 나이 누락 → 질문 생성 (규칙 ④)

**사용자**: "내일부터 1박, 방콕에 어른 둘 애 하나 갈 건데 호텔 좀"

```json
{
  "detected_language": "ko",
  "intent": "hotel_rate_search",
  "action": "ask_user",
  "tool": null,
  "arguments": null,
  "slot_ops": { "overwritten": ["check_in","check_out","rooms.adults","rooms.children"] },
  "clarification": {
    "missing": ["rooms[0].children_ages"],
    "question": "방콕 2026-07-11(토)~07-12(일) 1박, 성인 2명·아동 1명까지 확인했습니다. 아동 요금과 객실 정원 확인을 위해 아이의 나이를 알려주세요."
  }
}
```

### 예시 4 — 영어, 1박 예산 + 무료취소

**사용자**: "Find hotels in Tokyo Shinjuku, Sep 5–8, 2 adults, under $250 per night, free cancellation only, in USD"

```json
{
  "detected_language": "en",
  "intent": "hotel_rate_search",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "destination_id": "d-jp-shinjuku-001",
    "check_in": "2026-09-05",
    "check_out": "2026-09-08",
    "rooms": [{ "adults": 2, "children": 0, "children_ages": [] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "USD",
    "refundable_only": true,
    "max_nightly_price": 250,
    "sort_by": "price_asc",
    "result_limit": 10,
    "include_tax": true
  },
  "user_notice": [
    "\"per night\" 단서 → max_nightly_price=250 USD (총액 아님)",
    "무료취소 여부는 각 요금의 cancellation_type과 마감일 기준으로 안내",
    "Year not specified → interpreted as 2026"
  ]
}
```

### 예시 5 — 예산 기준 모호 → 질문 생성 (규칙 ⑨)

**사용자**: "제주도 8월 14일부터 2박, 성인 2명, 예산 60만원"

```json
{
  "detected_language": "ko",
  "intent": "price_filter_search",
  "action": "ask_user",
  "tool": null,
  "arguments": null,
  "slot_ops": { "overwritten": ["destination(질의 예정)","check_in","check_out","rooms"] },
  "clarification": {
    "missing": ["budget_basis"],
    "question": "제주 2026-08-14~08-16(2박), 성인 2명까지 확인했습니다. 예산 60만원은 1박 기준인가요, 2박 총액 기준인가요?"
  }
}
```

### 예시 6 — 중국어, 아동 포함 + 총예산

**사용자**: "9月1号到4号,新加坡,两个大人一个6岁小孩,总预算800新币,要含早餐"

```json
{
  "detected_language": "zh",
  "intent": "hotel_rate_search",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "destination_id": "d-sg-city-001",
    "check_in": "2026-09-01",
    "check_out": "2026-09-04",
    "rooms": [{ "adults": 2, "children": 1, "children_ages": [6] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "SGD",
    "meal_plan": "breakfast",
    "max_total_price": 800,
    "sort_by": "price_asc",
    "result_limit": 10,
    "include_tax": true
  },
  "user_notice": ["\"总预算\" → max_total_price=800 SGD", "未指定年份 → 2026年", "국적 미지정 → 기본값 KR [주: 실투숙객 국적이 다르면 알려달라고 안내]"]
}
```

### 예시 7 — 일본어, 특정 호텔명(카타카나 음차) (규칙 ⑦)

**사용자**: "8月20日から3泊、マリーナベイサンズの料金を教えて。大人2名"

1단계 — 호텔 후보 확정:

```json
{
  "detected_language": "ja",
  "intent": "hotel_name_search",
  "action": "call_tool",
  "tool": "search_hotels",
  "arguments": { "query": "Marina Bay Sands", "destination_hint": "Singapore" },
  "user_notice": ["カタカナ表記を英文名称に変換して検索"]
}
```

2단계 — 단일 후보(`h-sg-00123`) 확정 후:

```json
{
  "detected_language": "ja",
  "intent": "hotel_rate_search",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "hotel_ids": ["h-sg-00123"],
    "check_in": "2026-08-20",
    "check_out": "2026-08-23",
    "rooms": [{ "adults": 2, "children": 0, "children_ages": [] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "KRW",
    "sort_by": "price_asc",
    "result_limit": 10,
    "include_tax": true
  },
  "user_notice": ["「3泊」→ 2026-08-20〜08-23", "hotel_id는 search_hotels 결과에서 획득"]
}
```

### 예시 8 — 호텔명 모호 → 후보 선택 질문 (규칙 ⑦)

**사용자**: "발리 샹그릴라 다음 주 금요일부터 2박 얼마야? 어른 2명"

(`search_hotels("Shangri-La", "Bali")` 결과 3건 반환 가정)

```json
{
  "detected_language": "ko",
  "intent": "hotel_name_search",
  "action": "ask_user",
  "tool": null,
  "arguments": null,
  "slot_ops": { "overwritten": ["check_in(2026-07-17)","check_out(2026-07-19)","rooms"] },
  "clarification": {
    "missing": ["hotel_ids"],
    "question": "'샹그릴라'로 발리 인근 3개 호텔이 검색되었습니다. 어느 곳인가요?\n1) [H-1] Shangri-La Bali Resort (울루와뚜)\n2) [H-2] Shangri-La Rasa Sayang (인근 지역·페낭) \n3) [H-3] Hotel Shangri-La Kuta\n체크인은 2026-07-17(다음 주 금요일), 2박으로 확인했습니다."
  }
}
```

### 예시 9 — 랜드마크 기준 검색 (영어)

**사용자**: "3 nights from Nov 20 near the Eiffel Tower, 1 room, 2 adults, 4-star or above, sorted by distance"

```json
{
  "detected_language": "en",
  "intent": "hotel_rate_search",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "destination_id": "d-fr-paris-7arr-001",
    "check_in": "2026-11-20",
    "check_out": "2026-11-23",
    "rooms": [{ "adults": 2, "children": 0, "children_ages": [] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "KRW",
    "star_rating": [4, 5],
    "sort_by": "distance_asc",
    "result_limit": 10,
    "include_tax": true
  },
  "user_notice": [
    "랜드마크 'Eiffel Tower' → search_destinations로 파리 7구 지역 코드 확보 후 검색",
    "'4-star or above' → star_rating=[4,5]",
    "Currency not specified → agent default KRW"
  ]
}
```

### 예시 10 — 목적지 모호 → search_destinations 선행 (규칙 ⑥)

**사용자**: "다음 달 첫 주말에 후추 온천 쪽 호텔 있어?" *(발화 지명이 불명확)*

```json
{
  "detected_language": "ko",
  "intent": "destination_search",
  "action": "call_tool",
  "tool": "search_destinations",
  "arguments": { "query": "후추 온천" },
  "user_notice": ["지명이 명확하지 않아 목적지 검색을 먼저 수행. 후보를 확인한 뒤 날짜(2026-08-01~02 예상)와 인원을 확정 예정"]
}
```

(결과 후보: 벳푸(別府)/후쿠오카 인근 등 → 후보 제시 및 선택 질문으로 이어짐. 후보 0건이면 지명 재질문 — **임의 추측으로 검색하지 않음**)

### 예시 11 — 무료취소+조식, 정렬 지정 (한국어)

**사용자**: "오사카 9월 12일부터 2박, 성인 2명. 무료취소 되고 조식 주는 데만, 평점 좋은 순으로 5개만"

```json
{
  "detected_language": "ko",
  "intent": "hotel_rate_search",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "destination_id": "d-jp-osaka-001",
    "check_in": "2026-09-12",
    "check_out": "2026-09-14",
    "rooms": [{ "adults": 2, "children": 0, "children_ages": [] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "KRW",
    "meal_plan": "breakfast",
    "refundable_only": true,
    "sort_by": "review_score_desc",
    "result_limit": 5,
    "include_tax": true
  },
  "user_notice": ["무료취소 가능 여부는 요금별 취소 마감일(deadline)과 함께 표시"]
}
```

### 예시 12 — 후속 수정: "날짜만 9월 20일로" (규칙 ⑫⑬)

**직전 상태**: 예시 1의 검색 완료(마리나베이, 08-20~08-23 3박, 성인 2, 4성, KRW).
**사용자**: "조건 그대로 날짜만 9월 20일로 바꿔줘"

```json
{
  "detected_language": "ko",
  "intent": "follow_up_refine",
  "action": "call_tool",
  "tool": "search_hotel_rates",
  "arguments": {
    "destination_id": "d-sg-mbay-001",
    "check_in": "2026-09-20",
    "check_out": "2026-09-23",
    "rooms": [{ "adults": 2, "children": 0, "children_ages": [] }],
    "nationality": "KR",
    "residence_country": "KR",
    "currency": "KRW",
    "star_rating": [4],
    "sort_by": "price_asc",
    "result_limit": 10,
    "include_tax": true
  },
  "slot_ops": {
    "reused": ["destination_id","rooms","star_rating","currency","nationality","residence_country"],
    "overwritten": ["check_in","check_out"],
    "cleared": []
  },
  "user_notice": ["기존 3박을 유지해 2026-09-20~09-23으로 변경", "이전 결과(rs-8f2c)는 무효화, 새로 검색"]
}
```

### 예시 13 — 비교 요청 (comparison)

**직전 상태**: 예시 12 검색 완료(`result_set_id: rs-9a41`).
**사용자**: "그중에 제일 싼 데랑 취소조건 제일 좋은 데 비교해줘"

```json
{
  "detected_language": "ko",
  "intent": "comparison",
  "action": "call_tool",
  "tool": "compare_hotel_rates",
  "arguments": {
    "result_set_id": "rs-9a41",
    "criteria": ["total_price", "cancellation_policy"]
  },
  "user_notice": ["ELLIS 재호출 없이 직전 결과(조회 시각 표시)를 기준으로 비교", "결과가 30분 경과 시 재검색 후 비교"]
}
```

### 예시 14 — 검색 이력 조회 (history_lookup)

**사용자**: "지난주에 내가 검색했던 방콕 조건 다시 보여줘"

```json
{
  "detected_language": "ko",
  "intent": "history_lookup",
  "action": "call_tool",
  "tool": "get_recent_searches",
  "arguments": { "keyword": "방콕", "from_date": "2026-06-29", "to_date": "2026-07-05" },
  "user_notice": ["이력의 요금은 조회 당시 가격 — 재검색해야 현재 요금 확인 가능"]
}
```

### 예시 15 — 범위 밖 요청 거절 (out_of_scope)

**사용자**: "좋아, [R-3] 그걸로 예약하고 결제까지 진행해줘"

```json
{
  "detected_language": "ko",
  "intent": "out_of_scope",
  "action": "reject",
  "tool": null,
  "arguments": null,
  "user_notice": [
    "예약·결제는 이 채팅에서 지원하지 않음(조회 전용)",
    "[R-3]에 booking_token이 있으므로 기존 예약 화면으로 검색 조건을 이어받는 딥링크 제공",
    "booking_token이 없는 요금이라면 견적 전용(quote-only)임을 안내"
  ]
}
```

---

## 12. 열린 항목 (Open Questions)

1. `meal_plan`/`sort_by` enum의 최종 값 목록 — ellis-mcp 스키마 확정 필요 [가정 다수]
2. Agent 프로필의 기본 국적·거주국 필드 존재 여부 (V9의 기본값 주입 가능성)
3. 랜드마크→지역 매핑의 ELLIS 지원 범위 (§8)
4. 인원 상한(객실당 성인/아동 수)의 ELLIS 실제 제약값
5. 응답 언어 정책: 사용자 발화 언어 추종 vs 셀러 설정 언어 고정 (§7.1)
