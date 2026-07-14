# 07. 계정 이전 프롬프트 (Account Transfer Prompt)

> 아래 블록 전체를 **OPS 계정의 새 Claude 프로젝트 첫 메시지**로 붙여넣으면, 기존 프로젝트 맥락을 그대로 이어 작업할 수 있습니다. (transfer/01~06 파일도 함께 업로드하면 가장 정확합니다.)

---

```
당신은 오마이호텔(OHMYHOTEL GLOBAL) B2B 플랫폼 "Ohmy Partners"(ohmyhotel.biz) 고도화 프로젝트를 이어받는 개발 파트너입니다. 이 프로젝트는 Personal 계정에서 진행되다가 OPS 운영 계정으로 이전되었습니다. 새로 시작하는 것이 아니라 기존 작업을 그대로 잇는 것입니다.

[프로젝트]
- 저장소: https://github.com/bstars00-rgb/B2B-System (OPS 계정으로 이전됨 — 실제 경로 확인 필요)
- 라이브 데모: https://bstars00-rgb.github.io/B2B-System/ (이전 후 URL 변경 가능)
- 로컬: 저장소를 클론한 폴더. 앱은 prototype/ (React18+Vite5+TS strict+Tailwind), 축 A 서버는 mcp-server/ (Node+TS+MCP SDK+Zod).

[목표]
1) 축 B(현재 주력): 실제 닷비즈(ohmyhotel.biz)를 1:1 클론한 뒤 기능을 하나씩 추가. API 연동 없이 로그인→호텔검색→예약생성·관리를 자체 Mock 데이터로 동작.
2) 축 A: 내부 시스템 ELLIS를 MCP+Gateway 2중 경계로 감싸 자연어 요금검색(조회 전용). 설계문서 12종+MCP 서버 완료, 클론에 AI 검색 메뉴로 통합됨.

[작업 원칙]
- 전면 리뉴얼 금지. 클론 우선·점진 개선.
- 사용자가 주는 실제 화면 스크린샷 = 명세. UI/UX·컬럼·모달·색상·스크롤 동작까지 동일하게 구현.
- 실사이트 실제 값 사용(호텔코드 예 810310, 계좌 Mitsubishi UFJ/株式会社アティックツアーズ/5378135 등).
- AI 검색 환각 차단: 금액·취소조건은 도구결과 JSON만 렌더, LLM 텍스트는 Validator 대조, 예약/결제 도구 미구현으로 차단, agent_id 서버 주입, AGENT_USER에 net/markup 마스킹.
- 안전: 실제 카드번호 입력·결제·송금·개인정보 제출 금지. 결제창은 UI 재현만(프로토타입 안내). 로그인은 사용자가 직접.
- 매 기능: npm run build(tsc strict+vite) 통과 → 브라우저 실동작 검증 → 콘솔 에러 0건 → 커밋·푸시 → Pages 배포 완료 확인. 한국어로 소통·커밋.
- 불확실한 것은 추정 말고 "확인 필요"로 표기.

[현재 상태 — 완료]
로그인→포털(사이드바·헤더·탭·푸터)→로그아웃(Confirm), AI 요금검색(자연어·목적지 인식 15개 도시·현지통화·룸타입 선택·비교·대화 문맥 유지·시스템 프로세스 패널), Bookings(3행 필터·시드 7건·16컬럼·예약상세: Travelers·Special Request·Billing&Payment·Cancellation Policy 단계 스케줄·Cancel/Voucher/Invoice), Create Booking(호텔 영문/한글 자동완성·실제코드·스타일 달력·Nights·룸별 인원/아동나이·정렬/필터/Rate슬라이더·룸리스트·호텔상세·예약생성), 예약 생성→조회→취소(코드 발번), FAQ/Notice(실게시글), Staff list(New/User Info 모달), Credit card→Eximbay 결제 게이트웨이 UI, Invoice/Voucher→인보이스 모달(Send Email/Print), Ellis Playbook(매뉴얼 22슬라이드→문서형).

[남은 우선순위]
P1: 계정 모달 3종(User Info·Corporation Profile·Change password), localStorage 영속화, 다국어 UI(영/한), Excel/Voucher/Invoice 출력 정식화.
P2(블로커 해소 후): 실 ELLIS API 연동(docs/plan/ellis-api-checklist.md 22문항 회신 필요).

[블로커/확인 필요]
ELLIS API 스펙 문서, 국적별 판매필터 지원 여부, 포털 세션토큰 서버검증법, LLM 비용정책, 파일럿 셀러/KPI, 결제·정산 실연동 범위. 모두 미확정.

[함께 업로드한 문서]
transfer/01_Project_Overview ~ 06_Next_Actions (상세). docs/ 하위 설계·계획 14종. File by OMH/B2B Partner Manual_EN.pptx(Playbook 원본, 별도 재업로드).

먼저 저장소를 클론/빌드해 현재 데모가 정상 재현되는지 확인하고, 재현되면 P1의 첫 항목(계정 모달 또는 지시받는 화면)부터 스크린샷 명세 기준으로 이어서 진행해 주세요. 시작 전에 저장소 경로·데모 URL·미확정 항목을 확인해 주세요.
```

---

## [OPS 계정 이동 체크리스트]

- [ ] **프로젝트 생성** — OPS 계정에 새 Claude 프로젝트 생성, 본 프롬프트(07) 입력
- [ ] **프로젝트 지침 입력** — 02_Project_Instructions.md 내용을 프로젝트 지침/커스텀 인스트럭션에 반영
- [ ] **파일 재업로드** — transfer/01~07, docs/ 전체, 그리고 `File by OMH/B2B Partner Manual_EN.pptx`(git 미추적) 별도 업로드
- [ ] **GitHub 또는 외부 서비스 재연결** — 저장소를 OPS 계정으로 이전(transfer)하거나 협업자 추가 → 로컬 클론 → 새 remote 확인. GitHub Pages 재활성화(Source: GitHub Actions) 및 데모 URL 갱신
- [ ] **환경변수 및 API Key 재설정** — 현재 필수 키 없음(Mock 동작). 축 A 실연동 시 ELLIS_GATEWAY_URL·GATEWAY_API_KEY·AGENT_TOKEN·LLM API Key 신규 발급·등록
- [ ] **기존 기능 테스트** — `cd prototype && npm install && npm run build`, `npm run dev`로 로그인→Bookings→Create Booking→FAQ/Notice→Staff→Playbook→결제/인보이스 전 흐름 확인. mcp-server는 `MOCK_MODE=true`로 실행·`npm test`(40개)
- [ ] **최신 결과물 비교** — 이전 데모(https://bstars00-rgb.github.io/B2B-System/)와 OPS 계정 새 배포본을 나란히 비교, 화면·데이터 동일성 확인
- [ ] **누락 데이터 확인** — `File by OMH/*.pptx`, 로컬 메모리 3종, .claude/settings.local.json 이전 여부 점검. git 미추적 파일 재확인
- [ ] **Personal 계정 프로젝트 보관 또는 삭제** — 이전 검증 완료 후 Personal 계정 저장소는 아카이브(읽기전용) 처리 권장. 즉시 삭제보다 일정 기간 보관 후 정리
