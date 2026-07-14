# 06. 다음 실행 (Next Actions)

## 1. 다음 우선순위 (권장 순서)

### P0 — 계정 이전 완료 (본 패키지의 목적)
1. OPS 계정에서 GitHub 저장소 접근 확보(이전/fork/협업자 추가) → 로컬 클론.
2. `File by OMH/B2B Partner Manual_EN.pptx` 재업로드.
3. `npm install && npm run build` 로 빌드 재현 확인.
4. 라이브 데모(또는 OPS 계정 기준 새 Pages) 정상 확인.

### P1 — 닷비즈 클론 잔여 기능 (약 15% 남음)
5. **계정 모달 3종**: 헤더의 User Info / Corporation Profile / Change password (실사이트 스크린샷 명세 있음 — docs/plan/dotbiz-clone-plan.md A-2~A-5).
6. **데이터 localStorage 영속화**: 예약·직원·설정을 새로고침 후에도 유지. 데이터 접근을 한 곳으로 모아 추후 ELLIS 연동 시 교체 용이하게.
7. **다국어 UI(영/한 우선)**: 헤더 언어 셀렉트 실작동.
8. Excel 다운로드(CSV 생성), Voucher/Invoice 인쇄 뷰 정식화.

### P2 — 실 ELLIS 연동 (블로커 해소 후)
9. ELLIS 팀에 `docs/plan/ellis-api-checklist.md`(22문항) 전달·회신 수령.
10. Search Gateway의 ELLIS 클라이언트 실구현(현재 mock) → MCP 서버 실연동 → AI 검색 실데이터 전환.

## 2. 담당자

| 작업 | 담당 |
|------|------|
| 계정 이전·저장소 관리 | OPS 계정 소유자(확인 필요) |
| 클론 기능 개발 | Claude(신규 OPS 계정 세션) + 지시자 |
| ELLIS API 스펙 회신 | ELLIS 팀(확인 필요) |
| 파일럿 셀러 선정·KPI | Product/Sales Ops(확인 필요) |
| 결제·정산 정책 | 확인 필요 |

## 3. 예상 결과

- P0 완료 시: OPS 계정에서 동일 코드·문서·데모로 즉시 작업 재개 가능.
- P1 완료 시: 실사이트 Seller/Member 전 메뉴 100% 클론 + AI 검색 통합 → 내부 파일럿 준비.
- P2 완료 시: Mock → 실 ELLIS 데이터 전환, 운영 파일럿 개시.

## 4. 미해결 이슈 및 리스크

| # | 이슈 | 영향 | 상태 |
|---|------|------|------|
| R1 | ELLIS Search/Content/Rate API 실제 스펙 문서 미확보 | 실연동 착수 불가 | 블로커 — 질의서 발송 필요 |
| R2 | 국적별 판매가능 필터 ELLIS 지원 여부 미확인 | "베트남 고객 판매가능 서울호텔" 기능 Phase 결정 좌우 | 확인 필요 |
| R3 | 포털 세션 토큰 서버측 검증 방법 미확인 | Orchestrator 인증 설계 확정 불가 | 확인 필요 |
| R4 | LLM 비용 정책(셀러 무상/과금) 미정 | 운영 모델 | 확인 필요 |
| R5 | 파일럿 셀러 미선정·성공 KPI 미합의 | 파일럿 일정 | 확인 필요 |
| R6 | 결제(Eximbay)·정산 실연동 범위 미정 | 현재 UI만 재현 | 확인 필요 |
| R7 | 데이터 세션 휘발(localStorage 미적용) | 새로고침 시 초기화 | P1에서 해소 |
| R8 | 저장소가 Personal 계정 소유 | 인수인계 리스크 | **본 이전으로 해소 진행** |
| R9 | 참고 Playbook URL 인증서 오류 | 원본 레이아웃 미확인 | 확인 필요 |
| R10 | 프롬프트 인젝션·Net/Markup 노출·요금 스크래핑 | 실운영 보안 잔여위험 | docs/security 참고, 실연동 시 재점검 |
