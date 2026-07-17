# 닷비즈(ohmyhotel.biz) 클론 고도화 계획

> **후속 기획서**: 클론 구축 이후의 고도화는 [기획서 ② 닷비즈 내부기능 고도화](spec-b-dotbiz-enhancement.md)로 이어짐 (AI 검색은 [기획서 ①](spec-a-ellis-ai-search.md))
> **작성일**: 2026-07-12 · **착수 예정**: 2026-07-13 주간
> **전략 전환**: 전면 리뉴얼(재설계) → **기존 시스템 클론 후 점진 개선**
> **전제**: 외부 API 연동 없이 동작하는 독립 시스템 (고객이 로그인 → 호텔 검색 → 예약 생성/관리를 자체 데이터로 수행)

---

## 1. 접근 전략

| 항목 | 내용 |
|------|------|
| 방식 | 실제 닷비즈 화면·동작을 **1:1로 클론**한 뒤, 그 위에 신규 기능(AI 검색 등)을 하나씩 추가 |
| 왜 클론 우선인가 | ① 셀러(여행사)가 이미 익숙한 UI — 학습 비용 없음 ② 화면 명세가 실물로 존재 — 기획 논쟁 최소화 ③ 기능 단위로 추가·검증 가능 — 빅뱅 리뉴얼 리스크 제거 |
| 베이스 코드 | **기존 프로토타입([prototype/](../../prototype/))을 클론 베이스로 승격** — 포털 셸(사이드바·탭·헤더·푸터), Create Booking 흐름, Bookings 목록/상세, 예약 생성·취소가 이미 동작. 새 리포 불필요 |
| 데이터 | mock 데이터 계층(hotelDb 등)을 유지하되 **localStorage 영속화**로 승격 → 새로고침해도 예약·설정 유지. 추후 자체 백엔드/ELLIS 연동 시 교체 가능하도록 데이터 접근을 한 곳에 모음 |
| 기준 화면 | 2026-07-11~12 캡처한 실제 닷비즈 스크린샷 26장 (본 문서 §2의 인벤토리가 해당 스크린샷 기준) |

## 2. 클론 대상 화면 인벤토리 & 갭 분석

범례 — ✅ 프로토타입에 이미 있음 · 🔶 부분 구현(고도화 필요) · ❌ 미구현

### 2.1 로그인·계정

| # | 화면/기능 | 실제 시스템 상세 | 상태 |
|---|-----------|------------------|------|
| A-1 | 로그인 | 이메일/비밀번호, Stay signed in, Forgot password, Create one, 로그인 후 리다이렉트(`?rdul=`) | ❌ (데모는 로그인 생략) |
| A-2 | 계정 드롭다운 | 헤더 ATTIC TOURS 클릭 → **User Info / Corporation Profile** 메뉴 | ❌ |
| A-3 | User Info 모달 | Name·ID(중복확인)·부서·직위·Office/Mobile Phone·Email·**Language(영/한/일/베/중/대만)**·Super User(Y/N)·Save | ❌ |
| A-4 | Corporation Profile 모달 | 법인등록번호·법인명·대표자·주소·국가·언어·대표전화·이메일·팩스 (읽기 전용) | ❌ |
| A-5 | Change Password 모달 | 현재/신규/신규확인 (8~20자 규칙 안내) | ❌ |
| A-6 | Log out | Confirm 다이얼로그("Are you sure you want to log out?") 후 로그인 화면 | ❌ |

### 2.2 Bookings (예약 관리)

| # | 화면/기능 | 실제 시스템 상세 | 상태 |
|---|-----------|------------------|------|
| B-1 | 날짜 필터 타입 | 드롭다운: **Booking Date / Cancel Date / Check In Date / Check Out Date / Cancel Deadline / Stay Date** | ❌ (고정 라벨만) |
| B-2 | 달력 피커 | 기간 시작·종료 각각 월 캘린더(일요일 빨강·토요일 파랑) | ❌ (텍스트 입력만) |
| B-3 | Payment Status 필터 | All / Unpaid / **Partially Paid / Fully Paid / Refunded / Partially Refunded** | ❌ |
| B-4 | BKG Status 필터 | 체크박스 멀티: All / Confirmed / Cancelled | 🔶 (단일 선택만) |
| B-5 | Booker 검색 타입 | 드롭다운: Booker / **Traveler / Mobile No.** + 텍스트 | ❌ |
| B-6 | Country·Hotel Name·ELLIS/Seller 코드 검색 | — | 🔶 (일부만) |
| B-7 | 목록 컬럼 | ~~Invoice No. / Dispute / **Dispute Remark**~~ 까지 전체 (가로 스크롤) | 🔶 (Dispute Remark 누락) |
| B-8 | Excel 다운로드 | 실제 파일 다운로드 | ❌ (더미) — CSV 생성으로 구현 가능 |

### 2.3 예약 상세 모달

| # | 화면/기능 | 실제 시스템 상세 | 상태 |
|---|-----------|------------------|------|
| C-1 | Booker 섹션 | Name·Email·Tel·Seller Booking Code + **Save(수정 동작)** | 🔶 (Save 더미) |
| C-2 | Reservation details 추가 행 | **Meal Type · Free Breakfast · Cancellation D/L(요일 표기)** | 🔶 |
| C-3 | Travelers 테이블 | 성별(M/F)·로컬명·영문 성/이름·**Child Birthday·Child Age** — 예약 생성 시 입력값 표시·수정 | ❌ |
| C-4 | Special Request 표시 | 생성 시 선택한 체크박스(Late Check In + 시간)·자유 텍스트가 상세에 그대로 표시 | ❌ |
| C-5 | Billing & Payment | **Billing total · Balance · [Credit card] 결제 버튼** | ❌ |
| C-6 | Cancellation Policy 스케줄 | 마감일 + **기간별 위약금 단계표** (예: `2026-07-11~10-05 Charge 0` → `10-05~10-08 Charge 65,697` → 체크인 후 전액) | ❌ (텍스트 전문만) |
| C-7 | Voucher / Invoice | 출력(PDF/인쇄 뷰) | ❌ (더미) — 인쇄용 화면으로 구현 가능 |
| C-8 | Cancel | Confirm 후 상태 변경 | ✅ |

### 2.4 Create Booking (호텔 검색·예약)

| # | 화면/기능 | 실제 시스템 상세 | 상태 |
|---|-----------|------------------|------|
| D-1 | Destination 자동완성 | 지역 + **호텔명 직접 검색**(예: "sotetsu" → 호텔 코드 목록) | 🔶 (프로토타입은 채팅 기반, 폼 검색 없음) |
| D-2 | 달력 피커 + Nights 연동 | 체크인 선택 → Nights(1~N) 선택 시 체크아웃 자동 계산, 역방향도 동일 | ❌ |
| D-3 | Rooms 1~5 + 룸별 구성 | 룸별 ADT(1~) / CHD(0~) / **아동 나이(1~17세) 드롭다운** — 룸 수만큼 반복 | ❌ (단일 구성) |
| D-4 | 검색 결과 정렬·필터 | Recommendation / Star Rating ▲▼ / Rate ▲▼ 버튼, Property Name 검색, **Rate 범위 슬라이더**, Star/Property Type/Chain 필터, 페이지네이션 | 🔶 |
| D-5 | 호텔 룸 리스트 (별도 화면) | 호텔 헤더 + 조건 변경 바(재검색) + 요금제 테이블(**플랜명·Plan Code·Origin Plan Code**, Billing Curr/Gross/Discount/Sum, 취소정책, Select) + **Show more** | 🔶 (Drawer로 대체 중 — 실제처럼 전용 화면화) |
| D-6 | 호텔 상세 콘텐츠 | **지도 + Check-in/out + 주소 + 전화 + Neighborhood(주변 명소) + Description(Introduction/시설/Room·Hotel Facility/Caution) + Photo 갤러리** | ❌ |
| D-7 | Create Hotel Booking 모달 | Booking Detail에 **Plan Name(코드 포함)·Promotion Name** 행, Travelers 행 수 = 총 인원, **닫기 시 Confirm**("Are you sure you want to close?") | 🔶 |
| D-8 | 예약 생성 후 | Bookings 목록 이동 + ELLIS 코드(J...H01)·Seller 코드(ATTIC...) 발번 | ✅ |

### 2.5 게시판·기타

| # | 화면/기능 | 실제 시스템 상세 | 상태 |
|---|-----------|------------------|------|
| E-1 | FAQ Board | 검색 + 목록(Post SEQ·FAQ Type·제목·수정일·조회수·첨부) + 상세 | ❌ (메뉴 더미) |
| E-2 | Notice Board | 목록(Pin to top) + **상세 모달**(본문·Register Date·Views) | ❌ |
| E-3 | Staff list | ID/Staff/Super User(Yes/No) 필터 + **New(직원 등록 폼)** + 목록 | ❌ |
| E-4 | 메뉴 검색 | 사이드바 "Enter Menu name" — 메뉴 필터링 | ❌ (더미) |
| E-5 | 다국어 UI | 헤더 English 스위처 (영/한/일 등) | ❌ |

### 2.6 신규 기능 (클론 완성 후 추가할 것)

| # | 기능 | 비고 |
|---|------|------|
| N-1 | **AI 요금 검색** (자연어 검색·비교·시스템 프로세스 패널) | ✅ 이미 구현 — 클론에 신규 메뉴로 유지 |
| N-2 | 결제 연동(Credit card) 시뮬레이션 → 실제 PG | Billing & Payment의 Balance 흐름 |
| N-3 | Voucher/Invoice PDF 발행 | C-7 연계 |
| N-4 | 대시보드(예약 통계), 알림(취소 마감 임박) 등 | 백로그 — 파일럿 피드백으로 우선순위 결정 |

## 3. 주차별 로드맵 (제안)

| 주차 | 목표 | 주요 작업 |
|------|------|-----------|
| **W1** (7/13~) | **Create Booking 완전 클론** | D-1~D-8: 폼 검색(자동완성·달력·Nights·룸별 구성·아동나이), 결과 정렬/필터/슬라이더, 호텔 룸리스트 전용 화면, 호텔 상세 콘텐츠(지도·Neighborhood·Description·Photo), 모달 고도화(Plan/Promotion·닫기 Confirm) |
| **W2** | **Bookings·예약상세 완전 클론** | B-1~B-8(필터 6종·달력·결제상태 5종·Excel=CSV), C-1~C-7(Travelers 상세·Special Request 표시·Billing&Payment·취소 위약금 스케줄·Voucher/Invoice 인쇄뷰) |
| **W3** | **계정·게시판·데이터 영속화** | A-1~A-6(로그인·User Info·법인 프로필·비번 변경·로그아웃), E-1~E-4(FAQ·Notice·Staff·메뉴검색), localStorage 영속화, 다국어 골격(영/한) |
| **W4** | **신규 기능 통합·파일럿** | AI 요금 검색을 클론 메뉴에 정식 통합, 결제 시뮬레이션, 내부 사용자 테스트, 피드백 반영 |

**완료 기준(클론 파트)**: 실제 닷비즈와 화면을 나란히 놓고 비교했을 때 메뉴·필터·컬럼·모달 구성이 동일하고, 로그인 → 검색 → 예약 생성 → 조회 → 취소 전 과정이 자체 데이터로 끊김 없이 동작.

## 4. 운영 방식

- **화면 명세 = 스크린샷**: 새 화면 작업 시작 전, 해당 화면의 실제 스크린샷을 캡처해서 전달 → 그대로 클론. (이번에 주신 26장으로 §2 인벤토리의 대부분 커버됨. 미확보: Voucher/Invoice 출력물, Staff 등록(New) 폼, 로그인 실패 화면, Forgot password)
- **단위 배포**: 기능 하나 완성될 때마다 GitHub Pages 데모에 반영 → 즉시 확인·피드백
- **문서 동기화**: 기능 추가 시 이 문서의 상태 컬럼(✅/🔶/❌) 갱신 — 진행 현황판 역할

## 5. Open Questions

1. 아동 요금 정책 — 실제 시스템처럼 나이별(1~17) 요금 차등을 mock에 반영할 범위
2. 결제(Credit card) — W4에서 시뮬레이션까지만 vs PG 샌드박스 연동까지
3. 다국어 — 파일럿 대상 셀러의 언어(일본 셀러면 일어 우선?)
4. 로그인 계정 데이터 — mock 계정 몇 개로 운영할지 (셀러 2~3개사 시나리오?)
