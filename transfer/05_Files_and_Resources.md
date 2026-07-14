# 05. 파일 및 리소스 (Files & Resources)

## 1. 관련 파일 목록 및 용도

### 루트
| 파일/폴더 | 용도 |
|-----------|------|
| README.md | 프로젝트 개요·문서 목차·실행법 |
| .github/workflows/deploy-pages.yml | GitHub Pages 자동 배포 워크플로 |
| .claude/planning-plugin.json | 작업 언어 ko, supportedLanguages, notionParentPageUrl(공란) |
| .claude/launch.json | prototype-dev 개발서버 정의(autoPort) |
| .claude/settings.local.json | 로컬 권한 설정(.gitignore로 제외) |
| `File by OMH/B2B Partner Manual_EN.pptx` | **시스템 매뉴얼 원본(22슬라이드)** — Playbook 콘텐츠 출처. **git 미추적(재업로드 필요)** |
| transfer/ | 본 이전 패키지(01~07) |

### docs/ (설계·계획 문서 14종)
| 파일 | 용도 |
|------|------|
| architecture/ellis-mcp-llm-search.md | 축 A 전체 아키텍처 |
| requirements/user-requirements-scenarios.md | 요구사항·시나리오 16종 |
| mcp/tool-design.md | MCP 도구 10종 스키마 |
| llm/nlu-design.md, llm/system-prompt.md | LLM NLU·시스템 프롬프트 |
| gateway/search-gateway-design.md, gateway/openapi.yaml | Gateway 설계·OpenAPI 3.1 |
| ui/ui-ux-design.md | 화면 10종 와이어프레임 |
| security/security-model.md | 보안 모델 |
| test/test-plan.md | 테스트 56케이스 |
| plan/mvp-plan.md | 4주 MVP 계획 |
| plan/ellis-api-checklist.md | ELLIS 팀 확인 질의서 22문항 |
| plan/dotbiz-clone-plan.md | **닷비즈 클론 계획·인벤토리 34항목·로드맵(현재 주력 기준)** |
| clone/as-is-ui-notes.md | 실사이트 실측 노트(일부 미완 — 확인 필요) |

### prototype/src/ (클론 앱)
- `App.tsx`(로그인 게이팅), `components/`(29개 — AiSearchPage가 셸, 이하 화면/모달), `mocks/`(16개 데이터), `utils/`, `types/`.
- 핵심: AiSearchPage, LoginPage, BookingsPage, BookingDetailModal, CreateBookingPage, HotelRoomListPage, CreateBookingModal, InvoiceModal, PaymentGatewayModal, BoardPage, StaffPage, PlaybookPage, DatePicker, PortalSidebar, SystemFlowPanel.

### mcp-server/src/ (축 A 서버)
- server.ts, runtime.ts, tools/(9개), clients/(gateway-client·mock-gateway), schemas/, security/(permissions·masking·rate-limit), stores/, logging/, errors/, config/env.ts, types/. tests/(schemas·tools·gateway).

## 2. 외부 링크 및 참고 자료

| 링크 | 설명 |
|------|------|
| https://github.com/bstars00-rgb/B2B-System | 저장소(Personal) — **OPS 계정으로 이전 대상** |
| https://bstars00-rgb.github.io/B2B-System/ | 라이브 데모(현재 URL — 이전 후 계정에 따라 변경 가능) |
| https://ohmyhotel.biz/login | 실제 Ohmy Partners 포털(클론 원본) |
| https://ellis-playbook.ohmyhotel.com/ | 참고 Playbook(인증서 오류 미접근 — 확인 필요) |

## 3. 로컬 메모리 파일 (Claude 세션 지속용)

경로: `C:\Users\LENOVO\.claude\projects\C--Users-LENOVO-Desktop-B2B-System\memory\`
| 파일 | 내용 |
|------|------|
| MEMORY.md | 인덱스 |
| ellis-mcp-llm-search-project.md | 프로젝트 진행·공통 계약·미해결·전략전환 |
| ohmy-partners-portal-facts.md | 포털 사실(탭단위 세션, 브라우저 3개 중 Browser 1, ATTIC TOURS 계정, 메뉴 구조) |

> OPS 계정 이전 시 이 메모리는 새 계정/새 머신 기준으로 다시 생성 필요(내용은 본 패키지로 대체 가능).

## 4. 새 계정에 다시 업로드/이전해야 할 파일

1. **`File by OMH/B2B Partner Manual_EN.pptx`** — git 미추적. Playbook 원본. **반드시 별도 이전.**
2. **바탕화면 `B2B 데모 열기.url`** — 편의 바로가기(선택).
3. **`.claude/settings.local.json`** — 로컬 권한(민감치 않으나 계정별 재설정).
4. **소스 전체** — GitHub 저장소를 OPS 계정으로 이전(fork/transfer 또는 새 remote push)하면 코드·docs·transfer 모두 포함됨.
5. **API Key/Secret** — 현재 없음. 축 A 실연동 시 신규 발급·환경변수 등록 필요.

> 나머지(docs, prototype, mcp-server, transfer)는 저장소에 포함되어 있어 저장소 이전만으로 함께 이동됨.
