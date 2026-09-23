# 엠빌리지TF — M Village(Modern Village Lifestyle) 브랜드관

> **작성일**: 2026-09-23 · **트랙**: **엠빌리지TF (Modern Village GSA)** — *고도화(3차 등)와 별개로 움직이는 작업* · **상태**: 🟢 프로토타입 반영·배포
> ⚠ 이 작업은 **고도화 로드맵/실적에 포함하지 않는다.** 별도 TF 트랙.

## 0. 배경
- OhMyHotel Global(SCM)이 베트남 라이프스타일 호텔 **Modern Village Lifestyle**의 **한국 GSA(총판).**
- 마켓플레이스에 **브랜드관**을 두어 셀러에게 노출·홍보하고, **브랜드관 → 물건 클릭 → 바로 호텔 예약**으로 연결한다.
- 근거 자료: `Modern Village Group 전략 제안서 3rd Draft.pdf`, `OMH_MVillage_Korea_GSA_GTM_Client_Deck_v0.3.pdf`.
- 티어(제안서 기준): **Grand Signature**(플래그십) · **Signature**(FIT) · **M Village Hotel** · **Premier** · **Express**(밸류·2030 Savvy). 실물명 예: **M Village Kim Ma**(하노이).

## 1. 요구사항 (현업 2026-09-23)
1. **로그인 페이지에 M Village 광고·홍보** 노출.
2. **예약(Bookings) 화면에 배너 공간** — 클릭 시 **M Village 브랜드관**으로 이동.
3. **브랜드관에서 물건 클릭 → 바로 호텔 예약 진행**(Create Booking).

## 2. 구현 (프로토타입)
| 지점 | 내용 |
|------|------|
| **로그인 홍보** | 히어로 하단에 M Village 프로모(브랜드·NEW·Korea GSA·티어 칩). 클릭 이동 없음(홍보). `MVillageLoginPromo` |
| **Bookings 배너** | Bookings 상단 그린 배너 → "브랜드관 바로가기" → 브랜드관 이동. `MVillageBanner` |
| **브랜드관** | 브랜드 히어로 + **티어 필터**(전체/GS/Signature/Premier/MVH/Express) + **물건 카드**(티어 배지·도시·소개·태그) → **예약하기 →** → Create Booking 프리필. `MVillagePavilion` |
| **예약 연결** | 물건 클릭 = `onBookHotel({code, destination(도시), hotelName})` → Create Booking 검색창 프리필 + 체크인 달력 오픈(기존 `bookHotelFromRanking` 재사용) |
| **사이드바** | Seller 메뉴에 **M Village** 항목 — **그린 "M Village" 배지**(고도화 UP 배지와 구분) |

## 3. 파일 (자체완결 · 폐기 가능)
- `mocks/mvillage.ts` — 브랜드·티어·물건 데이터 + `mvBookTarget`
- `components/MVillagePavilion.tsx` — 브랜드관(default) + `MVillageBanner` + `MVillageLoginPromo`
- 삽입부: `LoginPage.tsx`(프로모) · `AiSearchPage.tsx`(뷰·Bookings 배너) · `PortalSidebar.tsx`(메뉴·배지)
- **폐기 = 위 파일 + 삽입부 4곳 제거.** 고도화 코드와 분리.

## 4. 구분 표기
- 고도화 항목은 오렌지 **UP** 배지, 본 TF는 **그린 "M Village" 배지**로 시각 구분.
- 문서·실적에서 **"고도화 3차"로 지정하지 않는다.** 엠빌리지TF로 관리.

## 5. 미확정 / 다음 단계
- ⚠ **물건 목록은 프로토타입 예시**(M Village Kim Ma 외 명칭 가안) — **실제 GSA 물건·요금·사진 확정 후 교체.**
- 브랜드 CI(로고·컬러) 실제 가이드 반영(현재 액센트 그린 `#0f766e` 임시).
- 물건→예약 시 **M Village 실물 호텔을 검색 인벤토리에 연결**할지(현재 프리필+도시 결과) 결정.
- 로그인 홍보를 **캠페인 슬라이드**에 편입할지, 상시 노출 유지할지.
