# DOTBIZ Enhancement — Development Specification v1

> **For**: PD Team (Tracy) · **From**: CEO Office · **Date**: 2026-07-17
> **Companion docs**: [Proposal v1 (EN)](proposal-en.md) · [Proposal v1 (KO)](proposal-ko.md) · [Working spec (KO)](../../plan/spec-b-dotbiz-enhancement.md) · [Measured UI tokens](../../clone/as-is-ui-notes.md)
> **Reference implementation**: every feature below is working in the prototype — https://bstars00-rgb.github.io/B2B-System/ (source: `prototype/` in this repo). File pointers are given per feature so engineers can read running code instead of guessing.

---

## 0. Scope & Reading Guide

- **§2 F-series** = enhancements already validated on the prototype → ready for production build.
- **§3 P-series** = planned features (drafts; details finalized in August per the proposal).
- **§4** = data contracts the backend/ELLIS integration must satisfy.
- **§5** = QA acceptance scenarios (all pass on the prototype).
- The prototype persists state in `localStorage`; production should map these to server-side session/user preferences (§4.4).

## 1. UI Foundations (measured from production)

| Token | Value | Note |
|-------|-------|------|
| Font | `Pretendard` webfont (weights 100–900), stack: Pretendard → system-ui → Roboto → Segoe UI → Apple SD Gothic Neo → Noto Sans KR → Malgun Gothic | Production actually loads the webfont |
| Base text | 12px / `#333333` | body defaults |
| Brand orange | `#EF7F29` | buttons, active nav; full 50–900 palette derived in `prototype/tailwind.config.js` |
| Controls | radius 5px · height 30px · input border `#E0E0E0` | login-screen measurements |
| Dark bars | `#333333` | logo bar, modal headers |

## 2. Feature Specifications — validated enhancements (F-series)

### F-1 Gateway (Login) Renewal

**Reference**: `prototype/src/components/LoginPage.tsx`, `mocks/loginCampaigns.ts`, `components/LegalModal.tsx`, `mocks/legalContent.ts`

**Layout**: split screen — left billboard (hidden < 1024px), right sign-in panel (fixed 480px).

**F-1.1 Billboard (marketing surface)**
- Campaign data model:
  ```ts
  interface LoginCampaign {
    id: string;
    headline: string;   // supports \n line breaks; rendered 56–68px, orange gradient
    subEn: string;      // English copy
    subKo: string;      // Korean copy
    chips: string[];    // feature chips, one-line preferred (no container max-width)
  }
  ```
- Rotation: auto-advance every **8,000 ms**, wrap-around; indicator dots (click = jump to slide; auto-rotation continues).
- Ops requirement: campaigns must be editable **without a deploy** in production (CMS table or config service; prototype uses a code file).
- Background: neural-network SVG (pulsing nodes, staggered delays), 30px dot grid, orange/indigo glow blurs, eyebrow "AI-Powered B2B Travel Platform", footer-right live status "● AI Rate Engine — Online".

**F-1.2 Sign-in panel**
- Fields: Email (envelope icon), Password (lock icon + show/hide eye toggle).
- Options: `Remember me` (persistent session), `Forgot password?` (existing flow), `Create Account` (outline CTA).
- **Agreement gate**: checkbox "I have read and agree to the DOTBIZ Platform Service Agreement, Privacy Policy." Sign-in blocked until checked; error text on attempt: KO "서비스 이용약관과 개인정보처리방침에 동의해 주세요."
- Dark mode toggle (🌙/☀): affects the panel; persisted per user.
- Language selector (🌐, codes EN/KO/JA/VI/ZH/TW): reads/writes the **global language setting** (§F-2.2) so the choice carries into the portal.

**F-1.3 Legal documents (pre-login access)**
- Both documents open as modals from the gateway links **and** from the portal footer ("Privacy Policy | Terms & Condition").
- Content: Terms & Condition — 26 articles, effective 2026-03-14; Privacy Policy — sections [01]–[09] incl. company info and the Korean entrustment block (PI Manager: **Choi Younggeun**). Source of truth: `mocks/legalContent.ts` (schema: sections with `no/title/body/bullets/table`).

**Acceptance criteria**
- [ ] Campaigns rotate every 8s and can be switched via dots; adding a campaign record requires no code change (production).
- [ ] Sign-in impossible without agreement; error shown; both legal modals open pre-login with full text.
- [ ] Dark mode and language persist across sessions; language carries into the portal after login.
- [ ] < 1024px: billboard hidden, panel full-width.

### F-2 Language System

**Reference**: `utils/portalLang.ts`, `components/PlaybookPage.tsx`, `components/BoardPage.tsx`

- **Principle (confirmed 2026-07-16)**: the display language is changed in **exactly one place** — the global setting (login screen + portal header 🌐). Content screens (Playbook, FAQ, Notice) follow it and never expose their own toggles.
- Supported codes: `en, ko, ja, vi, zh, tw` (the original DOTBIZ ships these languages — this is parity, not an enhancement; what is new is the Playbook following the setting).
- Fallback: languages without content render **English** with a notice chip ("번역 준비 중 — English로 표시됩니다").
- Content structure: `Record<Lang, Content>` dictionaries (see `PLAYBOOKS`); board posts carry per-language fields (`title/titleEn`, `body/bodyEn` — extend per language as translations arrive). Search must match across **all** language variants of a title regardless of display language.

**Acceptance criteria**
- [ ] Changing the header language re-renders Playbook/FAQ immediately (no reload).
- [ ] JA/VI/ZH/TW fall back to EN with the notice; once translations land, the notice disappears automatically.
- [ ] FAQ search finds a post by its Korean title while displaying English, and vice versa.

### F-3 Ellis Playbook (built-in manual)

**Reference**: `components/PlaybookPage.tsx`, `mocks/playbookData.ts`

- Full-screen overlay: dark header (logo + "Ellis Playbook", ✕ Close), left TOC (6 chapters → sections), body blocks (`heading/text/steps/defs/note`), prev/next footer navigation.
- Section IDs are **identical across languages** → switching language keeps the reader's position.
- Content source: `PLAYBOOKS: Record<'ko'|'en', PlaybookChapter[]>`; original manual = `File by OMH/B2B Partner Manual_EN.pptx` (22 slides).

### F-4 Sidebar Menu Search (parity — original DOTBIZ feature, rebuilt)

**Reference**: `components/PortalSidebar.tsx`

- Input "Enter Menu name" filters the menu tree live. This exists in the original DOTBIZ; specified here because the prototype re-implements it (no `UP` badge).
- Matching: case-insensitive substring on the menu **label** OR per-item **keyword aliases** (KO/EN, e.g. `bookings ← 예약`, `staff ← 직원`). Matched label substring is highlighted (brand tint).
- Sections with zero matches are hidden entirely; zero matches overall shows "'{q}' 와 일치하는 메뉴가 없습니다"; ✕ button clears.

### F-5 Child Age Validation (booking modal)

**Reference**: `components/CreateBookingModal.tsx` (`childWarning`), `types` `SearchConditions.child_ages`

- Travelers table renders **adult rows first (display-capped at 4), then one row per child**; only child rows show a `Child Birthday` input (`yyyy-mm-dd` placeholder).
- The child ages entered at search time travel with the search context: form → room list → new-tab URL (`ages=3,7` CSV) → booking modal (`SearchConditions.child_ages: number[]`).
- **Validation algorithm** (age at check-in):
  ```
  input format must match ^\d{4}-\d{2}-\d{2}$   → else "형식: yyyy-mm-dd"
  birthday must parse and not exceed check-in    → else "생년월일이 올바르지 않습니다"
  age = checkIn.year − birth.year
        − 1 if (checkIn month/day) precedes (birth month/day)
  if child_ages[i] defined and age ≠ child_ages[i]:
        warn "⚠ 검색한 아동 나이 {expected}세와 불일치 — 이 생년월일은 체크인 기준 만 {age}세입니다"
        + red input highlight
  ```
- Warning is **non-blocking** (Create still allowed). **Open decision** (proposal §5-4): strictness — keep strict, allow ±1 year, or offer a one-click "re-search with corrected age".

### F-6 UP Badge System (planning/demo tool)

**Reference**: `components/EnhBadge.tsx`, `index.css` (`.enh-off .enh-badge`)

- Purple `UP` chip beside enhanced UI; `title` tooltip explains the enhancement. Header ✨ toggles global visibility (persisted). Parity features carry no badge.
- **Production note**: this is a review/demo aid. Recommend keeping it behind an internal flag or excluding it from production builds.

## 3. Planned Feature Specs — drafts to finalize in August (P-series)

### P-1 Room-Type Sorting / Filtering (room list)

- Chip filter row above the rate table; chips derived from the result set (Double / Twin / Suite / …), multi-select, independent of "Show more".
- Matching dictionary (shared with the AI parser): `더블|double`, `트윈|twin`, `싱글|single`, `스위트|suite` (case-insensitive, KO/EN).
- AC: selecting Twin shows only twin-family plans; empty result shows a notice; filter survives a condition re-search.

### P-2 Split-Room Booking (double + twin in one flow)

> **Detailed plan (KO, 2026-07-17)**: [feature-split-room-booking.md](../../plan/feature-split-room-booking.md) — 11 customer scenarios, room-slot UX, data contracts, booking-unit options.

- Flow draft: search Rooms=2 → each rate row gets "assign to Room 1 / Room 2" → summary bar shows the combined total → one Create produces a booking whose Travelers map to room+room-type.
- **Prerequisites surfaced by the detailed plan**: rates must be exposed **per single room** (today they are all-rooms totals, so mixed baskets cannot be summed), search must return **rate lists per occupancy group**, and **availability counts** are needed to cap how many of a rate can be added.
- **Blocking question for ELLIS/production (proposal §5-2)**: does a split booking issue *one* booking code with two room lines, or one code per room? The data model (one booking with `rooms[]` vs. linked bookings) hinges on this.
- Ties into the AI parser, which already recognizes "더블+트윈 각각 1개씩" (`room_types`, `rooms` inference).

### P-3 Rate / Room-Type Copy (quote sharing)

- [Copy] button per rate row and in booking detail → formatted quote text to clipboard, e.g.:
  `[Hotel AMANEK Osaka Namba] 2026-07-22~23 (1 night) · Standard Double (Non Smoking) · JPY 8,884 · Free cancellation until 2026-07-19 17:00`
- Localized via the global language setting (copy in the client's language). Multi-select → multi-line comparison quote. Amounts must come from rate data verbatim (no manual re-entry — that is the error class this kills).
- AC: one click = copied + toast; figures byte-identical to the displayed rate.

### P-4 Oppy Point (OP rewards) — MVP

- MVP scope: **points ledger + balance display + manual admin grants** only. Mall/redemption is phase 2 after legal/finance sign-off.
- Ledger draft: `{ id, op_user_id, type: earn|revoke|adjust, amount, booking_code?, reason, created_at }`; accrual event = stay completed; full revoke on cancellation.
- Open policy items (proposal §5-3): accrual rate, expiry, tax treatment (rebate), eligibility.

### P-5 DOTBIZ Channel Growth (business, not code)

- Goal: **win new DOTBIZ client accounts and grow DOTBIZ booking volume** — not migrating API clients. The product work above (usability, multilingual, Playbook, Oppy Point) is the lever.
- Needs from engineering: a **monthly DOTBIZ-channel report** — bookings, GMV, new client accounts, bookings per seller, active OPs. This is the initiative's success measure; the source system is an open question (proposal §5-5).

## 4. Data Contracts & Rules (backend requirements)

### 4.1 Search context

`SearchConditions` fields the UI depends on (see `prototype/src/types/index.ts`):
`destination, hotel_name, check_in, check_out, nights, adults, children, rooms, star_rating, breakfast_included, free_cancellation_only, budget_max, near_station` **plus new fields**: `room_types?: string[]` (split-room requests) and `child_ages?: number[]` (validation §F-5).

New-tab room-list deep link carries: `hotel, ci, co, nights, rooms, adt, chd, ages` (query params).

### 4.2 Pricing semantics

- Displayed totals = **whole-stay, all-rooms** amounts ("Billing Sum"): per-night rate × nights × rooms. Verified against production behavior (1 room ¥8,884 → 2 rooms ¥17,768).
- Rate rows show: room type, plan name/codes, currency, gross/discount/sum, cancellation policy (deadline or Non-refundable).

### 4.3 Business rules (validated)

| Rule | Behavior |
|------|----------|
| Unpaid booking | Voucher issuance **disabled** (button blocked + reason tooltip); Invoice stays available |
| Past dates | Calendar dates before *today* disabled; check-out enabled only after check-in+1 |
| Empty initial dates | Create Booking starts with blank Check In/Out; searching without dates is blocked with a message |
| Booking codes | ELLIS `J{yymmdd}1{seq4}H01` + Seller `ATTIC20{yymmdd}{seq4}` (prototype format — production issues real codes) |
| Group-size note | ≥4 rooms same hotel/date may be treated as a group per Terms Article 4-③ |

### 4.4 Prototype localStorage → production mapping

| Prototype key | Purpose | Production equivalent |
|---------------|---------|----------------------|
| `omh_auth` | Remember-me session | server session / refresh token |
| `omh_bookings`, `omh_booking_seq` | bookings shared across tabs | real booking API |
| `omh_lang` | global display language | user preference (account-level) |
| `omh_login_dark` | gateway dark mode | user preference |
| `omh_enh` | UP-badge visibility | internal flag only |

## 5. QA Acceptance Scenarios (all pass on the prototype)

| # | Scenario | Expected |
|---|----------|----------|
| Q1 | Gateway: Sign In without agreement | Blocked with agreement error; after checking, login succeeds |
| Q2 | Gateway: open both legal modals before login | Full Terms (26 articles) & Privacy render; Close returns to gateway |
| Q3 | Billboard: wait 8s / click dot 2 | Campaign advances / jumps; indicator reflects state |
| Q4 | Language: set 한국어 at login → portal → Playbook | Header shows 한국어; Playbook opens in Korean, no internal toggle |
| Q5 | Language: switch header to 日本語 → open FAQ | English fallback + "번역 준비 중" chip; switch to 한국어 → list re-renders in Korean instantly |
| Q6 | Menu search: type "book" / "직원" / "zzz" | Bookings+Create Booking with highlight / Staff list / "no match" notice; ✕ restores all |
| Q7 | Search "osaka" without dates | Validation message; pick date (past dates disabled) → 26 Properties after "Searching…" loader |
| Q8 | Select a hotel | Room list opens in a **new tab**; original results intact |
| Q9 | Room list: Rooms 1→2, Select | Per-room ADT/CHD editors appear; rates double (e.g. 9,624→19,249); booking modal shows "2 Rooms / N Travelers" |
| Q10 | Child search (CHD 1, age 3): birthday `2019-11-11` → `2022-11-15` | Mismatch warning "만 6세" + red input → warning clears |
| Q11 | Unpaid booking detail | Voucher disabled with tooltip; Invoice active; Fully Paid booking → Voucher active |
| Q12 | Create booking in the new tab | Success panel with codes; original tab's Bookings badge increments without reload; survives refresh |
| Q13 | Bookings grid | Select-all/per-row checkboxes; column edge drag resizes (min 60px) |
| Q14 | UP badges | Visible with tooltips; ✨ hides all; setting persists |

## 6. Prototype Code Map (read the working implementation)

| Area | Files (`prototype/src/`) |
|------|--------------------------|
| Gateway | `components/LoginPage.tsx` · `mocks/loginCampaigns.ts` · `components/LegalModal.tsx` · `mocks/legalContent.ts` |
| Portal shell / header / footer | `components/AiSearchPage.tsx` · `components/PortalSidebar.tsx` (menu search) · `components/AccountMenu.tsx` |
| Search & booking | `components/CreateBookingPage.tsx` · `components/HotelRoomListPage.tsx` · `components/HotelRoomTab.tsx` (new-tab page) · `components/CreateBookingModal.tsx` · `components/DatePicker.tsx` · `components/HotelPhoto.tsx` |
| Bookings | `components/BookingsPage.tsx` · `components/BookingDetailModal.tsx` · `utils/bookingStore.ts` (cross-tab sync) |
| Language | `utils/portalLang.ts` · `components/PlaybookPage.tsx` · `mocks/playbookData.ts` · `components/BoardPage.tsx` · `mocks/boardData.ts` |
| Mock data engine | `mocks/hotelDb.ts` (hotels, codes, filters, pricing) · `utils/parser.ts` (AI NLU — Track A) |
| Badges | `components/EnhBadge.tsx` |

— Questions on any section: CEO Office. The five open decisions are listed in [Proposal v1 §5](proposal-en.md).
