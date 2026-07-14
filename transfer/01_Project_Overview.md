# 01. 프로젝트 개요 (Project Overview)

> **문서 목적**: 본 프로젝트를 Personal 계정 → OPS(운영) 계정으로 이전하기 위한 인수인계 패키지.
> **작성 기준일**: 2026-07-14 (최신 커밋 `da483f2` 기준)
> **원칙**: 기존 정보·설정을 임의 요약/변경하지 않음. 확인되지 않은 항목은 "확인 필요"로 표기.

---

## 1. 프로젝트명

- **정식/저장소명**: `B2B System` (GitHub 저장소명: `B2B-System`)
- **내부 통칭**: Ohmy Partners 닷비즈(ohmyhotel.biz) 클론 + ELLIS MCP AI 요금 검색
- **로컬 경로**: `C:\Users\LENOVO\Desktop\B2B System`

## 2. 프로젝트의 목적과 최종 목표

오마이호텔(OHMYHOTEL GLOBAL)의 B2B 호텔 예약 플랫폼 **Ohmy Partners(ohmyhotel.biz)** 를 고도화하는 프로젝트. **두 개의 축**으로 진행됨:

**축 A — ELLIS MCP LLM 요금 검색 (초기 목표)**
- 내부 호텔 DB/콘텐츠·요금·재고 시스템 **ELLIS** 를 MCP(Model Context Protocol) 서버로 감싸, B2B 셀러가 **자연어로 호텔·요금을 검색**하는 기능 추가.
- 원칙: LLM은 ELLIS에 직접 SQL/API 접근 불가(MCP+Gateway 2중 경계), 조회 전용(예약/결제 제외), 금액·취소조건은 도구 결과 JSON만 렌더(환각 차단), 셀러별 마켓·통화·마크업 적용, 기존 B2B 판매조건과 동일.

**축 B — 닷비즈 클론 고도화 (2026-07-12 전략 전환 → 현재 주력)**
- 전면 리뉴얼 대신 **기존 닷비즈를 그대로 클론한 뒤 기능을 하나씩 추가**하는 방식으로 전환.
- API 연동 없이 고객이 로그인→호텔 검색→예약 생성·관리까지 자체 데이터(Mock/localStorage 예정)로 동작하는 독립 클론을 만들고, 그 위에 AI 요금 검색(축 A)을 신규 메뉴로 통합.
- 실제 화면 스크린샷을 명세로 삼아 로그인·Bookings·Create Booking·예약상세·FAQ·Notice·Staff·결제·인보이스·Playbook 등을 1:1 클론.

**최종 목표**: 실제 Ohmy Partners와 화면·동작이 동일한 클론 위에서 AI 자연어 검색까지 동작하는, 내부 파일럿 가능한 통합 프로토타입 완성 → 실 ELLIS API 연동으로 운영 전환.

## 3. 현재 상태

- **라이브 데모**: https://bstars00-rgb.github.io/B2B-System/ (GitHub Pages, main push 시 자동 배포)
- **저장소**: https://github.com/bstars00-rgb/B2B-System (Personal 계정 `bstars00-rgb`)
- **최신 커밋**: `da483f2` (2026-07-14) — Credit card/Invoice 모달 + 검색 목데이터 확장
- **빌드/배포 상태**: 정상 (마지막 Pages 배포 success)
- **클론 진행**: 로그인 → Bookings(검색·목록·상세·취소·결제·인보이스) → Create Booking(자동완성·달력·룸리스트·호텔상세·예약생성) → FAQ/Notice → Staff → Playbook 까지 동작. 축 A(설계문서 12종 + MCP 서버 + AI 검색 UI)는 완료 상태로 클론에 통합됨.
- **미착수**: 실제 ELLIS API 연동, localStorage 영속화, 다국어 UI, User Info/Corporation Profile/Change password 계정 모달.

## 4. 주요 담당자

| 역할 | 담당 | 비고 |
|------|------|------|
| 프로젝트 오너 / 지시 | 오마이호텔 CEO 오피스 | 사용자 이메일: CEO.office@ohmyhotel.com |
| 실무/저장소 소유 | GitHub `bstars00-rgb` (Personal 계정) | **이전 대상 — OPS 계정으로 이동 예정** |
| 개발/문서 작성 | Claude (Claude Code) | 대화형으로 코드·문서 생성 |
| 운영사 | OHMYHOTEL GLOBAL PTE. LTD. | 대표 Lee Mi Soon, 서울 종로 GT동대문빌딩, 사업자 105-87-71311 |
| 테스트 셀러 계정 | ATTIC TOURS | tyosales@attic-tours.com (일본계 여행사, 실사이트 로그인용) |
| ELLIS 팀 | 확인 필요 | API 스펙·연동 담당자 미확정 |
| 파일럿 셀러 | 확인 필요 | 미선정 |

> **이전 목적**: 위 "실무/저장소 소유"가 현재 Personal 계정(bstars00-rgb)에 있으므로, 이를 **OPS 운영 계정**으로 옮겨 다른 Claude 계정에서도 동일하게 업무를 잇는 것.
