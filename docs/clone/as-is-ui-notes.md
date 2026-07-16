# 닷비즈 as-is UI/로직 실측 노트

> 실제 ohmyhotel.biz 로그인 세션에서 직접 추출한 디자인 토큰·동작 기록.
> 클론 구현 시 이 문서의 값을 기준으로 한다. (docs/plan/dotbiz-clone-plan.md 인벤토리와 연동)

## 1. 디자인 토큰 (실측)

| 토큰 | 값 | 비고 |
|------|----|------|
| 폰트 패밀리 | `Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", (emoji), sans-serif` | 2026-07-15 실측. **Pretendard 웹폰트 실로딩**(웨이트 100~900 @font-face, 400/500 활성) — 클론은 jsdelivr dynamic-subset CSS 사용 |
| 기본 폰트 크기 | 12px (body) | 버튼 12px/500, 인풋 12px/400 |
| 기본 텍스트 색 | `#333333` | body color 실측 |
| 브랜드 오렌지 | (측정 예정) | Search 버튼·활성 메뉴 |
| 사이드바 폭 | (측정 예정) | |
| 로고 바 배경 | (측정 예정) | 다크 블록 |
| 그리드 헤더 | (측정 예정) | Kendo UI 여부 확인 — Roboto·Material Icons·FontAwesome·WebComponentsIcons 폰트 등록 확인(Kendo 계열 정황) |

## 2. 화면별 동작 로직 (실측)

### Bookings
- (기록 예정)

### Create Booking
- (기록 예정)

### 예약 상세
- (기록 예정)

## 3. 프런트 프레임워크/컴포넌트

- (기록 예정 — Kendo Grid 클래스 유무, SPA 프레임워크)
