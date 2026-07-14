# 04. 기술 컨텍스트 (Technical Context)

## 1. 시스템 구조

### 축 A — ELLIS MCP LLM 검색 (설계상 목표 아키텍처)
```
B2B Frontend (Chat UI)
  → LLM Orchestrator ⇄ LLM (Claude)
  → MCP Server (ellis-mcp, 조회 전용 도구 10종)
  → Search Gateway (REST, OpenAPI 3.1 · 인증·감사·rate limit·마스킹)
  → ELLIS (Search / Content / Rate / Pricing / Policy)
```
- 2중 경계(MCP + Gateway)로 LLM의 ELLIS 직접 접근 차단.
- MCP 도구 10종: search_destinations, search_hotels, get_hotel_details, search_hotel_rates, compare_hotel_rates, get_rate_details, get_cancellation_policy, get_search_status, get_recent_searches, health_check.
- rooms[] 배열 구조, availability/booking_token 의미(토큰 없으면 quote-only), 에러 12종, RBAC 5역할.

### 축 B — 닷비즈 클론 (현재 실제 코드)
- 단일 React SPA. 실제 백엔드/ELLIS 없이 **Mock 데이터 계층**으로 전 화면 동작.
- 화면 전환은 `AiSearchPage.tsx`의 view 상태(`ai | bookings | create-booking | faq | notice | staff`) + 탭 스트립.
- 로그인은 `App.tsx`의 loggedIn 상태로 게이팅.

## 2. 개발 환경

### prototype/ (메인 클론 앱)
- **React 18 + TypeScript(strict) + Vite 5 + Tailwind CSS**
- 빌드: `tsc --noEmit && vite build` (noUnusedLocals/Parameters 등 strict)
- 개발서버: `.claude/launch.json`의 `prototype-dev` (npm --prefix prototype run dev), autoPort=true
- vite.config.ts: `base` 미설정(로컬), 배포 시 CI가 `--base=/B2B-System/` 주입. `process.env` 타입은 파일 상단에 `declare const process` 로 선언(@types/node 미설치).

### mcp-server/ (축 A MCP 서버)
- **Node.js + TypeScript(strict) + @modelcontextprotocol/sdk + Zod**
- 실행: `npm install && npm run build` → `MOCK_MODE=true node dist/server.js` (Gateway 없이 mock 동작)
- 테스트: vitest (40개 통과). Dockerfile·.env.example·README 포함.
- 환경변수: `ELLIS_GATEWAY_URL`, `GATEWAY_API_KEY`, `AGENT_TOKEN`, `MOCK_MODE`, `TIMEOUT`(기본 20s) 등.

## 3. 데이터 구조 (prototype/src)

- `types/index.ts`: RateResult, SearchConditions, Booking(+TravelerDetail·special_request·invoice_no·dispute), HotelGroup, SearchResponse 등.
- `mocks/hotelDb.ts`: 15개 도시(도쿄/오사카/교토/후쿠오카/삿포로/서울/부산/제주/방콕/싱가포르/다낭/하노이/호치민/타이베이/홍콩) 호텔 시드. 도시별 통화(JPY/KRW/THB/SGD/VND/TWD/HKD). 호텔에 nameEn·code(실제 코드 예 810310). displayName/hotelMatches로 영문·한글 이중 검색. 자동완성·호텔상세콘텐츠·역인접 필터.
- `mocks/seedBookings.ts`: 초기 예약 7건(Johanna/Karte/Louella/Michael/Corazon/Katherine/Jason). 취소·환불·인보이스·Travelers 상세 예시 포함.
- `mocks/boardData.ts`: FAQ 12건, Notice 6건(실제 게시글).
- `mocks/playbookData.ts`: B2B Partner Manual 6챕터.
- `mocks/scenario*.ts` + `index.ts` + `factory.ts`: AI 검색 시나리오 10종(정상/무료취소/환불불가/조식혼합/다중통화/부분실패/결과없음/타임아웃/권한없음/STALE).
- `utils/parser.ts`: 한국어 자연어 파서 + mergeConditions(대화 문맥) + describeSignals.

## 4. 연동 정보

| 항목 | 값 |
|------|----|
| GitHub 저장소 | https://github.com/bstars00-rgb/B2B-System (Personal `bstars00-rgb`) |
| 라이브 데모 | https://bstars00-rgb.github.io/B2B-System/ |
| 배포 워크플로 | `.github/workflows/deploy-pages.yml` (main push·prototype/** 변경 시 build → Pages) |
| 실제 포털(참고) | https://ohmyhotel.biz/login (테스트 계정 ATTIC TOURS, tyosales@attic-tours.com) |
| 참고 Playbook URL | https://ellis-playbook.ohmyhotel.com/ (인증서 오류로 미접근 — 확인 필요) |
| ELLIS API | **미연동 — 스펙 문서 확보 필요(확인 필요)** |
| API Key / Secret | **현재 없음**. 축 A 실연동 시 GATEWAY_API_KEY·AGENT_TOKEN·LLM API Key 필요(Vault/KMS 권장) |

## 5. 실행 방법

### 클론 프로토타입 (주력)
```bash
cd "C:\Users\LENOVO\Desktop\B2B System\prototype"
npm install
npm run dev      # http://localhost:5173 (포트 사용 중이면 자동 대체)
npm run build    # 배포 전 타입체크+빌드
```
로그인 화면 → (아무 값) Log in → 포털. 사이드바 메뉴 전체 동작.

### MCP 서버 (축 A)
```bash
cd "C:\Users\LENOVO\Desktop\B2B System\mcp-server"
npm install && npm run build
MOCK_MODE=true node dist/server.js
npm test         # vitest 40개
```

### 배포
main 브랜치에 push하면 GitHub Actions가 자동으로 Pages에 배포(수 분). 수동: Actions에서 workflow_dispatch.
