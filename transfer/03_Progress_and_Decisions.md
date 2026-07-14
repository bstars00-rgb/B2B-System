# 03. 진행 내용 및 결정사항 (Progress & Decisions)

## 1. 완료된 업무

### 축 A — ELLIS MCP LLM 요금 검색 (설계 + 코드, 완료)
| 산출물 | 위치 | 상태 |
|--------|------|------|
| 전체 아키텍처 설계 | docs/architecture/ellis-mcp-llm-search.md | ✅ |
| 요구사항 + 검색 시나리오 16종 | docs/requirements/user-requirements-scenarios.md | ✅ |
| MCP Tool 10종 상세 설계 | docs/mcp/tool-design.md | ✅ |
| LLM NLU 설계 (JSON 예시 15) | docs/llm/nlu-design.md | ✅ |
| 운영용 시스템 프롬프트 + 응답예시 10종 | docs/llm/system-prompt.md | ✅ |
| Search Gateway 설계 20항목 (REST 채택) | docs/gateway/search-gateway-design.md | ✅ |
| OpenAPI 3.1 명세 (엔드포인트 9·스키마 30) | docs/gateway/openapi.yaml | ✅ |
| UI/UX 설계 (화면 10종 와이어프레임) | docs/ui/ui-ux-design.md | ✅ |
| 보안 모델 (위협 14·침투 20) | docs/security/security-model.md | ✅ |
| 테스트 계획 56케이스(P0 40) | docs/test/test-plan.md | ✅ |
| 4주 MVP 개발계획 | docs/plan/mvp-plan.md | ✅ |
| ELLIS 팀 확인 질의서 22문항 | docs/plan/ellis-api-checklist.md | ✅ |
| **MCP 서버** (Node+TS+Zod, 도구 9종, 테스트 40 통과) | mcp-server/ | ✅ (MOCK_MODE 실행 가능) |

### 축 B — 닷비즈 클론 (React 프로토타입, 진행 주력)
| 기능 | 상태 |
|------|------|
| 닷비즈 클론 고도화 계획(인벤토리 34항목·4주 로드맵) | ✅ docs/plan/dotbiz-clone-plan.md |
| 포털 셸(사이드바·헤더·탭·푸터) + 시스템 프로세스 패널 | ✅ |
| AI 요금 검색(자연어·목적지 인식 15개 도시·룸타입 선택·비교·대화 문맥 유지) | ✅ |
| 목적지 인식 mock(15개 도시, 현지통화) + 호텔 지목 검색 + 추천 호텔 | ✅ |
| 로그인 페이지 + 로그인→포털→로그아웃(Confirm) 흐름 | ✅ |
| Bookings: 목록·3행 필터(날짜유형6·결제상태6·Booker/Traveler/Mobile·국가·Seller)·초기 시드 7건·Excel(더미)·16컬럼(Dispute Remark 포함) | ✅ |
| 예약 상세: OMH번호·Booker·Reservation details·Travelers·Special Request·Billing&Payment·Cancellation Policy 단계 스케줄·Cancel/Voucher/Invoice | ✅ |
| Create Booking: 목적지/호텔 자동완성(영문·한글, 실제코드)·달력·Nights·룸별 인원/아동나이·정렬/필터/Rate슬라이더·호텔 룸리스트·호텔상세(지도·Neighborhood·Description·Photo)·예약생성 모달(Promotion·닫기 Confirm) | ✅ |
| 예약 생성→조회→취소 전체 흐름(ELLIS/Seller 코드 발번) | ✅ |
| FAQ Board / Notice(실제 게시글, 목록·검색·상세 모달) | ✅ |
| Member list > Staff list(검색·New/User Info 등록 모달) | ✅ |
| 스타일 달력(DatePicker: 월 네비·주말 색상·선택일 주황원) — Bookings·Create Booking 공통 | ✅ |
| 고정 높이 그리드 + 헤더 고정(가로 스크롤 그리드 내부화) | ✅ |
| Credit card → Eximbay 결제 게이트웨이 팝업(UI) | ✅ |
| Invoice/Voucher → 인보이스 모달(발행정보·예약정보·총액+도장·계좌·유의사항·Send Email 알림·Print) | ✅ |
| Ellis Playbook(B2B Partner Manual PPT 22슬라이드 → 문서형 6챕터, 헤더 버튼) | ✅ |

## 2. 진행 중 / 미완 업무 (진행률)

| 항목 | 진행률 | 비고 |
|------|--------|------|
| 닷비즈 클론 전체 | 약 **85%** | 핵심 업무 흐름 완료, 아래 잔여만 남음 |
| 계정 모달 3종(User Info·Corporation Profile·Change password) | 0% | 헤더 메뉴는 현재 더미 |
| 데이터 localStorage 영속화 | 0% | 현재 세션 내 메모리(새로고침 시 초기화) |
| 다국어 UI(영/한/일 등) | 0% | 언어 셀렉트는 표시만 |
| 실제 ELLIS API 연동 | 0% | 블로커(아래 05 참조) 해소 후 착수 |
| Excel/Voucher/Invoice 실제 파일 출력 | 부분 | Print는 인쇄창, Excel은 더미 |

## 3. 주요 결정사항

1. **전략 전환(2026-07-12)**: 전면 리뉴얼 → 기존 시스템 클론 후 점진 개선. (커밋 `84bd5f6`)
2. **Notion 미사용, GitHub 사용**: 문서·코드 모두 GitHub 저장소로 관리. planning-plugin.json의 notionParentPageUrl 공란.
3. **Gateway는 REST 채택**(GraphQL 대비): 소비자가 MCP 단일이라 유연질의 이점 없고, 필드 마스킹·rate limit·감사가 REST에서 단순. (docs/gateway)
4. **클론 베이스 = 기존 프로토타입 승격**: 새 리포 없이 prototype/ 위에 기능 추가.
5. **호텔명 영문/한글 이중 검색**: hotelDb에 nameEn·code 필드 추가, 표시/식별은 영문 우선(displayName).
6. **배포 방식**: GitHub Actions → Pages, vite base=`/B2B-System/`, launch.json autoPort=true(포트 충돌 회피).
7. **작업 언어 ko** (`.claude/planning-plugin.json`).

## 4. 변경 이력 (커밋 요약, 최신순)

```
da483f2 2026-07-14 예약상세 Credit card/Invoice 모달 연결 + 검색 목데이터 확장(소테츠 8곳)
ecf3e80 2026-07-14 예약 상세에 빠진 섹션 추가(Travelers·Special Request·Billing&Payment·Cancellation Policy)
b87f220 2026-07-14 상단에 Ellis Playbook 추가(PPT 22슬라이드 기반)
f49bb0a 2026-07-14 Bookings/Staff 그리드 고정 높이+헤더 고정(가로 스크롤 그리드 내부화)
75a8e20 2026-07-14 Bookings/Create Booking UI 실사이트 동일화(스타일 달력·뒷 컬럼 데이터)
597046e 2026-07-13 Member list(Staff list) + Bookings 목데이터/검색 고도화
2006325 2026-07-13 로그인 페이지 클론
b314eb1 2026-07-13 FAQ/Notice 게시판 작동
7711986 2026-07-13 CI 빌드 실패 수정(vite.config process.env 타입)
6102722 2026-07-13 Create Booking 완전 클론(W1)
6a0a2b5 2026-07-12 AI 검색 대화 문맥 유지(조건 병합·정제 필터·날짜 파싱 버그)
84bd5f6 2026-07-12 닷비즈 클론 고도화 계획(전략 전환)
8bcfee8 2026-07-12 예약 생성-조회-취소 흐름
58371c2 2026-07-11 룸타입 선택 후 예약 진행
9be4e21 2026-07-11 요금 상세 → Create Booking 연결
6459d52 2026-07-11 특정 호텔 지목 검색 + 추천 호텔
90aa8e6 2026-07-11 목데이터 목적지 인식형 확장(15개 도시)
9a05c20 2026-07-11 ELLIS 팀 확인 질의서
b4ba375 2026-07-11 포털 셸 구조 재구성
2f17af7 2026-07-11 시스템 프로세스 패널
ced48e0 2026-07-11 [초기] 설계 문서 9종 + MCP 서버 + React 프로토타입
```
(전체 21개 커밋. `git log`로 확인 가능.)
