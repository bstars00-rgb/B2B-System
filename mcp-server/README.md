# ellis-mcp — 오마이호텔 B2B ELLIS 호텔 검색 MCP Server

오마이호텔 B2B 포털의 자연어 요금 검색을 위한 **조회 전용(Read-Only) MCP 서버**입니다.
LLM(Claude 등)이 MCP 도구를 통해서만 ELLIS 데이터(Search Gateway 경유)에 접근하도록 하는 안전 경계 역할을 합니다.

- 예약 생성/취소/수정/결제 도구는 **존재하지 않습니다** (구조적 차단)
- 모든 금액(net/markup/selling/tax)은 **Gateway 응답을 그대로 전달** — 이 서버는 금액을 계산하지 않습니다
- `AGENT_USER` 권한에서는 `net_price` / `markup` / `supplier_id` 필드가 응답에서 **자동 제거(마스킹)** 됩니다
- 참고 설계 문서: `docs/architecture/ellis-mcp-llm-search.md`

## 제공 도구 (전부 조회 전용)

| 도구 | 설명 |
|------|------|
| `search_destinations` | 자연어 검색어 → 목적지(destination_id) 후보 |
| `search_hotels` | 목적지/호텔명 기준 호텔 목록 (콘텐츠만, 요금 없음) |
| `get_hotel_details` | 호텔 상세 (주소·성급·시설·체크인아웃) |
| `search_hotel_rates` | 날짜·인원·필터 기반 요금 검색 → `search_id` 발급 |
| `compare_hotel_rates` | 직전 검색 결과(`search_id`) 캐시 기반 호텔별 비교 (재검색 없음) |
| `get_rate_details` | 특정 요금제 상세 (박별 요금·포함사항) |
| `get_cancellation_policy` | 특정 요금제 취소 정책 전문 (단계별 위약금) |
| `get_recent_searches` | 세션 내 최근 검색 이력 요약 |
| `health_check` | 서버·Gateway 상태 점검 |

## 응답 구조

모든 응답은 아래 4가지 상태로 구분된 구조화 JSON 입니다.

```jsonc
// 성공
{ "tool": "...", "trace_id": "uuid", "status": "success", "warnings": [], "data": { ... } }

// 공급사 일부 실패 (데이터는 반환)
{ "status": "partial_success", "warning_code": "SUPPLIER_PARTIAL_FAILURE", "warnings": ["..."], "data": { ... } }

// 결과 없음 — API 오류와 구분되는 별도 상태
{ "status": "no_results", "code": "NO_RESULTS", "message": "...", "suggestions": ["..."] }

// 오류
{ "status": "error", "error": { "code": "ELLIS_TIMEOUT", "message": "...", "retryable": true } }
```

에러 코드: `INVALID_QUERY` `UNAUTHORIZED` `FORBIDDEN` `NO_RESULTS` `RATE_LIMITED`
`ELLIS_TIMEOUT` `ELLIS_ERROR` `SUPPLIER_PARTIAL_FAILURE` `STALE_RESULT` `INTERNAL_ERROR`

## 설치

```bash
cd mcp-server
npm install
npm run build     # TypeScript 컴파일 → dist/
npm test          # vitest (스키마 유닛 + mock 기반 도구 통합 테스트)
```

요구사항: Node.js 18.17 이상 (개발/검증은 Node 24 기준).

## 환경변수

`.env.example` 참조. 주요 항목:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ELLIS_GATEWAY_URL` | `http://localhost:8080` | Search Gateway base URL |
| `GATEWAY_API_KEY` | — | Gateway API Key (**MOCK_MODE=false 필수**) |
| `AGENT_TOKEN` | — | Agent 컨텍스트 토큰 (**MOCK_MODE=false 필수**) |
| `AGENT_ID` | `AGENT-LOCAL` | 서버가 신뢰하는 agent_id — 도구 입력값은 항상 무시하고 이 값으로 덮어씀 |
| `ROLE` | `AGENT_USER` | `AGENT_ADMIN` \| `AGENT_USER` (USER 는 net/markup/supplier 마스킹) |
| `REQUEST_TIMEOUT_MS` | `20000` | Gateway 요청 timeout |
| `MAX_RETRIES` | `2` | **네트워크 오류만** 지수 백오프 재시도 (4xx/5xx 재시도 안함) |
| `RATE_LIMIT_PER_MINUTE` | `30` | 도구 호출 분당 한도 (토큰버킷) |
| `MOCK_MODE` | `false` | `true` 면 Gateway 없이 mock 데이터로 동작 |
| `LOG_LEVEL` | `info` | 구조화 JSON 로그 (stderr 전용 — stdout 은 MCP 통신) |

## MOCK_MODE (Gateway 없이 로컬 실행)

실제 Search Gateway 가 아직 없거나 로컬 테스트가 필요하면 `MOCK_MODE=true` 로 실행하세요.
도쿄/서울/싱가포르/방콕/다낭 등 현실적인 mock 호텔·요금 데이터가 결정론적으로 반환됩니다.

엣지 케이스 재현용 특수 목적지 ID:

| destination_id | 동작 |
|---------------|------|
| `DST-EMPTY` | 결과 없음 (`no_results`) |
| `DST-PARTIAL` | 공급사 일부 실패 (`partial_success` + warnings) |
| `DST-TIMEOUT` | `ELLIS_TIMEOUT` 오류 |
| `DST-FAIL` | `ELLIS_ERROR` 오류 |

```bash
# Windows PowerShell
$env:MOCK_MODE = "true"; node dist/server.js

# bash
MOCK_MODE=true node dist/server.js
```

## Claude Desktop 연동

`claude_desktop_config.json` (Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ellis-hotel-search": {
      "command": "node",
      "args": ["C:\\Users\\LENOVO\\Desktop\\B2B System\\mcp-server\\dist\\server.js"],
      "env": {
        "MOCK_MODE": "true",
        "ROLE": "AGENT_USER",
        "AGENT_ID": "AGENT-PILOT-001",
        "RATE_LIMIT_PER_MINUTE": "30",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

실제 Gateway 연동 시:

```json
{
  "mcpServers": {
    "ellis-hotel-search": {
      "command": "node",
      "args": ["C:\\Users\\LENOVO\\Desktop\\B2B System\\mcp-server\\dist\\server.js"],
      "env": {
        "ELLIS_GATEWAY_URL": "https://gateway.ohmyhotel.biz",
        "GATEWAY_API_KEY": "<gateway api key>",
        "AGENT_TOKEN": "<agent token>",
        "AGENT_ID": "AGENT-PILOT-001",
        "ROLE": "AGENT_USER"
      }
    }
  }
}
```

## Claude Code 연동

```bash
claude mcp add ellis-hotel-search \
  -e MOCK_MODE=true -e ROLE=AGENT_USER \
  -- node "C:\Users\LENOVO\Desktop\B2B System\mcp-server\dist\server.js"
```

## Docker

```bash
docker build -t ellis-mcp .
# stdio 서버이므로 반드시 -i 로 실행
docker run -i --rm -e MOCK_MODE=true -e ROLE=AGENT_USER ellis-mcp
```

## 보안 / 운영 설계 메모

- **stdout 오염 금지**: stdout 은 MCP stdio 프로토콜 전용. 모든 로그는 stderr 로 JSON 출력
- **trace_id**: 도구 호출마다 UUID 발급, Gateway 로 `X-Trace-Id` 헤더 전파, 응답/로그에 포함
- **agent_id 불신**: 클라이언트(LLM)가 넘긴 `agent_id` 는 무시하고 항상 env 세션 컨텍스트 값 사용 (프롬프트 인젝션 대비)
- **재시도 정책**: HTTP 응답을 받지 못한 네트워크 계층 오류(연결 실패·timeout)만 최대 2회 지수 백오프. 4xx/5xx 는 재시도 금지
- **로그 마스킹**: token/api key/authorization/email/phone 등 민감 키는 로그에서 자동 `[REDACTED]`
- **STALE_RESULT**: `compare_hotel_rates` 등은 30분 TTL 결과 캐시 기반 — 만료 시 재검색 유도
- **rate limit**: 프로세스 단위 토큰버킷 (분당 `RATE_LIMIT_PER_MINUTE` 회)

## 파일 구조

```
mcp-server/
├── src/
│   ├── server.ts               # 초기화·Tool 등록·stdio transport
│   ├── runtime.ts              # 실행 파이프라인 (검증→권한→rate limit→마스킹)
│   ├── tools/                  # 도구별 1파일 (9개) + registry
│   ├── clients/
│   │   ├── gateway-client.ts   # fetch 기반, timeout/retry/에러 매핑
│   │   └── mock-gateway.ts     # MOCK_MODE 용 결정론적 mock
│   ├── schemas/                # Zod 스키마 (common / tools / search-hotel-rates)
│   ├── security/               # 권한 훅, 필드 마스킹, 토큰버킷
│   ├── stores/                 # 결과 캐시(TTL), 검색 이력
│   ├── types/                  # 도메인 타입 + GatewayClient 인터페이스
│   ├── logging/logger.ts       # 구조화 JSON 로거 (stderr)
│   ├── errors/                 # 표준 에러 코드 + ToolError
│   └── config/env.ts           # 환경변수 로드/검증
├── tests/                      # vitest — 스키마 유닛 + mock 통합 + retry 테스트
├── Dockerfile
├── .env.example
└── README.md
```
