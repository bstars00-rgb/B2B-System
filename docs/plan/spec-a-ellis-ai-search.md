# 기획서 ① — 엘리스(ELLIS) MCP를 통한 AI 요금 검색

> **작성일**: 2026-07-16 · **트랙**: A (AI 신기능) · **상태**: 설계·프로토타입 완료, ELLIS 실연동 대기
> **자매 문서**: [기획서 ② 닷비즈 내부기능 고도화](spec-b-dotbiz-enhancement.md) — 별도 트랙, 독립 배포 가능

---

## 1. 한 줄 정의

내부 호텔 요금·콘텐츠 시스템 **ELLIS**를 MCP 서버 + Search Gateway 2중 경계로 감싸,
B2B 셀러(여행사 OP)가 **자연어 한 문장으로 호텔·요금을 검색**하는 기능을 닷비즈(Ohmy Partners)에 추가한다.

## 2. 목적

| 항목 | 내용 |
|------|------|
| 사용자 가치 | 목적지 코드·필터 조작 없이 "방콕 8/15~17 성인 2명 무료취소"로 즉시 조회 — 예약 생성 소요시간 단축 |
| 회사 가치 | 검색 경험 차별화로 셀러 락인 · 신규 셀러 온보딩 장벽 완화 |
| 원칙 | **조회 전용**(예약/결제 도구 미구현으로 구조적 차단) · LLM은 ELLIS 직접 접근 불가 · 금액/취소조건은 도구 결과 JSON만 렌더(환각 차단) · agent_id 서버 주입 · AGENT_USER에 net/markup 마스킹 |

## 3. 산출물 현황 (완료)

설계 문서 12종 + 코드 2종. 상세는 각 문서 참조 — 본 기획서는 총괄 인덱스 역할.

| 영역 | 문서 | 핵심 내용 |
|------|------|-----------|
| 아키텍처 | [architecture/ellis-mcp-llm-search.md](../architecture/ellis-mcp-llm-search.md) | Chat UI → Orchestrator → LLM → MCP → Gateway → ELLIS 흐름, 책임 범위 |
| 요구사항 | [requirements/user-requirements-scenarios.md](../requirements/user-requirements-scenarios.md) | 검색 시나리오 16종 |
| MCP | [mcp/tool-design.md](../mcp/tool-design.md) | 도구 10종 스키마 · 에러 코드 12종 |
| NLU | [llm/nlu-design.md](../llm/nlu-design.md) | 자연어→조건 변환 규칙 (과거날짜 금지·연도 가정 명시·룸타입 분리 인식 포함) |
| 프롬프트 | [llm/system-prompt.md](../llm/system-prompt.md) | 운영용 시스템 프롬프트 · 응답 예시 10종 |
| Gateway | [gateway/search-gateway-design.md](../gateway/search-gateway-design.md) · [openapi.yaml](../gateway/openapi.yaml) | REST 채택 · 엔드포인트 9종 |
| UI/UX | [ui/ui-ux-design.md](../ui/ui-ux-design.md) | 화면 10종 와이어프레임 |
| 보안 | [security/security-model.md](../security/security-model.md) | 위협 14종 · RBAC 5역할 · 인젝션 방어 |
| 테스트 | [test/test-plan.md](../test/test-plan.md) | 56케이스 (P0 40) |
| 일정 | [plan/mvp-plan.md](mvp-plan.md) | 4주 MVP · Go/No-Go |
| 질의서 | [plan/ellis-api-checklist.md](ellis-api-checklist.md) | ELLIS 팀 확인 22문항 (**블로커 R1**) |
| 코드 | [mcp-server/](../../mcp-server/) · [prototype/](../../prototype/) | MCP 서버(테스트 40 통과·MOCK_MODE) · AI 검색 UI(클론에 통합) |

## 4. 하반기 실행 계획 (요약)

| 시기 | 마일스톤 |
|------|----------|
| 8월 | ELLIS 질의서 회신 확보 → API 스펙 확정 |
| 9월 | Search Gateway 실구현 · MCP 서버 실연동 착수 |
| 10월 | AI 검색 Mock → 실데이터 전환 · 환각 차단 검증(P0 40케이스) |
| 11월 | 파일럿 셀러 3개사 운영 (ATTIC TOURS 포함) |
| 12월 | 운영 전환 Go/No-Go |

## 5. 미해결 (확인 필요)

R1 ELLIS API 스펙 회신 · R2 국적별 판매필터 지원 여부 · R3 포털 세션토큰 서버 검증 · R4 LLM 비용 정책 · R5 파일럿 셀러/KPI · R6 결제·정산 실연동 범위
