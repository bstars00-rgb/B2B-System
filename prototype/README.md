# ELLIS MCP — AI 호텔 요금 자연어 검색 UI 프로토타입

오마이호텔 B2B 플랫폼(Ohmy Partners)용 **자연어 호텔 요금 검색** 화면 프로토타입입니다.
MCP(ellis-mcp) 미연결 상태에서 **Mock Data만으로 완전 동작**하며, 조회 전용(Read-Only)이므로
예약 버튼은 없고 "기존 검색 화면에서 확인" 더미 링크만 제공합니다.

> 설계 근거 문서: `docs/architecture/ellis-mcp-llm-search.md`
> (요금·취소조건 숫자는 LLM 텍스트가 아닌 구조화 데이터에서만 렌더링 / 실패 시 기존 검색 화면 탈출구 상시 노출)

## 실행 방법

```bash
cd prototype
npm install
npm run dev     # http://localhost:5173
```

프로덕션 빌드 검증:

```bash
npm run build   # tsc --noEmit + vite build
npm run preview
```

## 기술 스택

- React 18 + TypeScript (strict)
- Vite 5
- Tailwind CSS 3

## 파일 구조

```
prototype/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js        # 주황(#F28C28) 브랜드 팔레트
├── postcss.config.js
└── src/
    ├── main.tsx / App.tsx / index.css
    ├── types/
    │   └── index.ts          # RateResult, SearchConditions, SearchResponse 등
    ├── utils/
    │   ├── parser.ts         # 규칙 기반 한국어 mock 파서 (날짜/인원/성급/조식/무료취소/예산)
    │   ├── format.ts         # 통화(KRW/JPY/SGD)·날짜 포맷
    │   └── group.ts          # RateResult → 호텔 단위 그룹핑
    ├── mocks/
    │   ├── factory.ts        # RateResult 생성 팩토리
    │   ├── scenarioNormal.ts             # ① 정상 결과 10개
    │   ├── scenarioFreeCancelOnly.ts     # ② 무료 취소만
    │   ├── scenarioNonRefundable.ts      # ③ 환불 불가
    │   ├── scenarioMixedBreakfast.ts     # ④ 조식 포함/불포함 혼합
    │   ├── scenarioMultiCurrency.ts      # ⑤ 여러 통화 (KRW/JPY/SGD)
    │   ├── scenarioPartialFailure.ts     # ⑥ 공급사 일부 실패 (경고 배너 + 부분 결과)
    │   ├── scenarioNoResults.ts          # ⑦ 결과 없음
    │   ├── scenarioTimeout.ts            # ⑧ Timeout 에러 (ELLIS_TIMEOUT)
    │   ├── scenarioUnauthorized.ts       # ⑨ 권한 없음 (UNAUTHORIZED)
    │   ├── scenarioStale.ts              # ⑩ 오래된 검색 결과 (STALE)
    │   └── index.ts          # 시나리오 레지스트리 + runMockSearch
    └── components/
        ├── AiSearchPage.tsx          # 메인 레이아웃 + 상태 관리
        ├── ChatPanel.tsx / ChatMessage.tsx / SearchInput.tsx
        ├── SearchConditionPanel.tsx  # 추출 조건 칩
        ├── HotelResultList.tsx / HotelResultCard.tsx / HotelResultTable.tsx
        ├── RateDetailDrawer.tsx      # 요금 상세 (취소정책 전문, net/markup/selling, 세금, booking_token)
        ├── HotelComparisonPanel.tsx  # 최대 3개 호텔 비교
        ├── SearchHistoryPanel.tsx    # 최근 검색 기록 (클릭 시 재검색)
        ├── SearchStatusBadge.tsx / ErrorAlert.tsx / EmptyResult.tsx / LoadingSkeleton.tsx
```

## 사용 방법

1. 좌측 채팅에 자연어 입력 — 예:
   `8월 20일~23일 도쿄 4성급 성인 2명 조식 포함 무료취소 30만원 이하 찾아줘`
2. 규칙 기반 mock 파서가 조건을 추출해 우측 **검색 조건 칩**으로 표시
3. 검색 단계(질문 분석 → 조건 확정 → ELLIS 조회 → 검증) 로딩 후 결과 렌더링
4. **카드 ↔ 표** 뷰 전환, 카드의 "비교" 체크로 **최대 3개 호텔 비교**(하단 패널)
5. "요금 상세" 클릭 → **Drawer**에서 취소정책 전문·세금·booking_token 상태·last_updated 확인
6. 상단 **"내부 뷰 (net/markup)" 토글**로 내부 권한 화면(net/markup 노출) 시뮬레이션

## 시나리오 전환 방법 (개발용)

상단 헤더 우측의 **`DEV 시나리오` 셀렉트박스**에서 선택한 뒤, 채팅에 아무 질문이나 입력하면
해당 시나리오의 Mock 응답이 내려옵니다.

| 시나리오 | 확인 포인트 |
|---|---|
| ① 정상 결과 10개 | 호텔 9곳/요금제 10건, 가용성·취소유형 혼합 |
| ② 무료 취소만 | 전 요금제 `free_cancellation` + 취소 마감일 |
| ③ 환불 불가 | `non_refundable` + 경고 문구 |
| ④ 조식 혼합 | 동일 호텔에 Room Only / 조식 포함 요금제 병존 |
| ⑤ 여러 통화 | KRW·JPY·SGD 혼재 + 통화 주의 배너 |
| ⑥ 공급사 일부 실패 | 경고 배너 + 부분 결과 + 실패 공급사 목록 |
| ⑦ 결과 없음 | EmptyResult + 대안 조건 제안 |
| ⑧ Timeout 에러 | `ELLIS_TIMEOUT` ErrorAlert + 재시도 버튼 |
| ⑨ 권한 없음 | `UNAUTHORIZED` ErrorAlert (재시도 없음) |
| ⑩ 오래된 결과 | STALE 배지 + 47분 전 `last_updated_at` + 참고용 요금(booking_token 없음) |

## 프로토타입 한계 (실서비스와의 차이)

- LLM/MCP 실호출 없음 — 파서는 정규식, 응답은 `setTimeout` 지연 시뮬레이션
- 시나리오는 입력 내용과 무관하게 셀렉트박스 선택값으로 결정됨
- "기존 검색 화면에서 확인" 버튼은 더미 링크(`#legacy-search`)
- 환율 환산·페이징·정렬 옵션 미구현
