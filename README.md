# ELLIS MCP 호텔 요금 자연어 검색 — B2B System

Ohmy Partners B2B 호텔 예약 플랫폼(ohmyhotel.biz)에 내부 시스템 **ELLIS** 기반 MCP 서버를 연동하여, LLM으로 자연어 호텔·요금 검색 기능을 추가하는 프로젝트입니다.

> **라이브 데모(프로토타입)**: https://bstars00-rgb.github.io/B2B-System/
> (main 브랜치 push 시 GitHub Actions가 자동 배포 — Mock Data 모드로 동작, MCP 연결 불필요)

## 구성

```
B2B Frontend (Chat UI)
  → LLM Orchestrator → LLM (Claude)
  → MCP Server (ellis-mcp, 조회 전용 도구 10종)
  → Search Gateway (REST, OpenAPI 3.1)
  → ELLIS (Search / Content / Rate / Pricing / Policy)
```

**핵심 원칙**: LLM은 ELLIS에 직접 접근하지 않음 · 조회 전용(예약/결제 도구 미구현으로 구조적 차단) · 금액은 도구 결과 JSON에서만 렌더링(환각 차단) · `agent_id` 서버 주입(테넌트 격리) · AGENT_USER에게 Net/Markup 마스킹.

## 문서 (docs/)

**기획서 (2트랙)**

| 기획서 | 내용 |
|--------|------|
| [plan/spec-a-ellis-ai-search.md](docs/plan/spec-a-ellis-ai-search.md) | 기획서 ① — ELLIS MCP를 통한 AI 요금 검색 (설계 12종 총괄 + 하반기 실행 계획) |
| [plan/spec-b-dotbiz-enhancement.md](docs/plan/spec-b-dotbiz-enhancement.md) | 기획서 ② — 닷비즈 내부기능 고도화 (불편 개선 백로그 · 언어팩 5종 · 예약 편의 · 오피포인트 · 물량 전환) |
| [plan/proposal-dotbiz-enhancement-v1.md](docs/plan/proposal-dotbiz-enhancement-v1.md) | **닷비즈 기능 고도화 1차 기획안 (기획팀 전달용)** — 완료 25건 요약 · 데모 가이드 · 의사결정 요청 |

**설계 상세**

| 문서 | 내용 |
|------|------|
| [architecture/ellis-mcp-llm-search.md](docs/architecture/ellis-mcp-llm-search.md) | 전체 아키텍처 · 데이터 흐름 · 책임 범위 · MVP/확장 구분 |
| [requirements/user-requirements-scenarios.md](docs/requirements/user-requirements-scenarios.md) | 사용자 요구사항 · 검색 시나리오 16종 |
| [mcp/tool-design.md](docs/mcp/tool-design.md) | MCP Tool 10종 입출력 스키마 · 검증 · 에러 코드 |
| [llm/nlu-design.md](docs/llm/nlu-design.md) | 자연어 → 구조화 검색 조건 변환 로직 (JSON 예시 15개) |
| [llm/system-prompt.md](docs/llm/system-prompt.md) | 운영용 LLM 시스템 프롬프트 · 상황별 응답 예시 10종 |
| [gateway/search-gateway-design.md](docs/gateway/search-gateway-design.md) | Search Gateway 설계 20항목 · REST/GraphQL 비교 |
| [gateway/openapi.yaml](docs/gateway/openapi.yaml) | OpenAPI 3.1 명세 (엔드포인트 9 · 스키마 30) |
| [ui/ui-ux-design.md](docs/ui/ui-ux-design.md) | 화면 10종 와이어프레임 · 컴포넌트 · 상태 설계 |
| [security/security-model.md](docs/security/security-model.md) | 위협 모델 14종 · RBAC · Prompt Injection 방어 |
| [test/test-plan.md](docs/test/test-plan.md) | 테스트 케이스 56개 (P0 40) · 릴리스 판정 기준 |
| [plan/mvp-plan.md](docs/plan/mvp-plan.md) | 4주 MVP 개발 계획 · WBS · KPI · Go/No-Go |

## 코드

### [mcp-server/](mcp-server/) — ELLIS 검색용 MCP Server

Node.js + TypeScript(strict) + MCP SDK + Zod. 조회 전용 도구 9종, 구조화 로깅, 재시도/타임아웃, RBAC 마스킹, Rate limit.

```bash
cd mcp-server
npm install && npm run build
MOCK_MODE=true node dist/server.js   # Gateway 없이 mock으로 실행
npm test                             # vitest 40 tests
```

### [prototype/](prototype/) — B2B AI 검색 UI 프로토타입

React + TypeScript + Vite + Tailwind. Mock 시나리오 10종(정상/무료취소/부분실패/타임아웃/권한없음/STALE 등) 전환 가능.

```bash
cd prototype
npm install && npm run dev   # http://localhost:5173
```

## 개발 착수 전 확인 필요 (Blockers)

1. ELLIS Search/Content/Rate API 실제 스펙 문서
2. 국적별 판매가능 필터의 ELLIS 지원 여부
3. 포털 세션 토큰의 서버측 검증 방법
4. LLM 비용 정책 (셀러 무상/과금)
5. 파일럿 대상 선정 및 성공 KPI 합의

상세 일정은 [docs/plan/mvp-plan.md](docs/plan/mvp-plan.md) 참고.
