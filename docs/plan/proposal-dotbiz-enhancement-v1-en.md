# DOTBIZ Feature Enhancement — Proposal v1 (for PD Team)

> **Delivered**: 2026-07-17 · **From**: CEO Office · **Version**: v1 (based on validated prototype)
> **Detailed spec (KO)**: [spec-b-dotbiz-enhancement.md](spec-b-dotbiz-enhancement.md) (25 improvements logged per commit) · AI search track: [spec-a](spec-a-ellis-ai-search.md)
> **Live demo**: https://bstars00-rgb.github.io/B2B-System/

---

## 1. One-Page Summary

| Item | Description |
|------|-------------|
| Goals | ① Remove the daily friction that operating partners (OPs) face and turn DOTBIZ into a **customer-friendly platform** ② **Migrate booking volume that currently relies on external API integrations to direct DOTBIZ bookings** — winning client accounts and volume at the same time |
| Approach | We cloned the production site (ohmyhotel.biz) 1:1 as a prototype, validate every UX change there first, and then propose the validated changes for production |
| Scope of v1 | **25 completed improvements** (original-feature restoration = parity + new enhancements) + **4 new initiatives proposed** (§4) |
| Working principle | One pain point = one improvement = shipped same day · Measurement-based fidelity (font Pretendard, brand color #EF7F29 — identical to production) |

## 2. How to Review the Demo (Guide for PD)

1. Open the demo URL → on the gateway, **check the agreement box and Sign In** (credentials are pre-filled — no real authentication).
2. **Purple `UP` badge = a spot that differs from (improves on) the original DOTBIZ.** Hover to see what changed. The **✨ button** in the header hides all badges, leaving a pure clone view. (Features restored to match the original carry no badge.)
3. Language: the **🌐 selector** in the header is a global setting — Playbook and FAQ follow it. Japanese/Vietnamese/Chinese fall back to English with a "translation in progress" notice.
4. Suggested walkthrough: Gateway (rotating billboard · legal modals) → Create Booking, search "osaka" (loading → 26 properties · filters · photos) → Select (room list opens in a new tab) → change Rooms to 2 and re-search (rates recalculate) → Select a rate → booking modal (child birthday validation) → Create → the booking appears in the original tab's Bookings list.

## 3. What Was Built & Validated (by screen)

### 3.1 Gateway (Login) — first new initiative, implemented

- **Billboard**: the left half is a campaign area answering "who we are / what we do" — 3 campaigns auto-rotate (8s); adding an entry to the campaign file is all it takes to refresh the creative (**a periodically refreshed marketing surface**). Large typography (68px) with an AI-era background (neural-network lines, pulsing nodes, glow, "AI Rate Engine — Online" status).
- **Modern sign-in panel**: DOTBIZ branding, password show/hide, Remember me, dark-mode toggle, Create Account.
- **Legal documents accessible before login**: full **Terms & Condition (26 articles, effective 2026-03-14)** and full Privacy Policy open as modals from the gateway; sign-in is gated on agreement. The same links exist in the portal footer.

### 3.2 Hotel Search & Booking Flow (Create Booking → Room List → Booking)

- Destination search returns a real hotel list (26 Osaka properties with real hotel codes), result-driven filters (star rating · property type · chain brand), pagination.
- Production-like **query latency with a "Searching…" loader**, and **real photos** (list cards + an 11-image detail gallery).
- Select opens the room list **in a new tab**, keeping the search results intact for further comparison.
- **Conditions are editable after searching** on the room list: check-in/out, nights, rooms (per-room adults/children with child ages) → re-search; with 2 rooms, rates recalculate as the whole-stay total.
- Input safeguards: dates start empty on first visit (as in production), **past dates disabled in the calendar**, check-out selectable only after check-in, and a **warning when a child's birthday contradicts the searched child age** (age at check-in).
- Business rule: **vouchers cannot be issued for Unpaid bookings** (production rule).
- A booking created in the new tab **appears in the original tab's Bookings list in real time** and survives refreshes.

### 3.3 Bookings (Reservation Management)

- Row **checkboxes actually work** (select-all + per-row), and **column widths drag-resize like Excel** — same grid feel as production.

### 3.4 Manual, Boards & Language

- **Ellis Playbook built in** (an enhancement — not in the original): a 6-chapter documentation-style manual that follows the portal language setting.
- FAQ and Playbook **language packs (EN/KO)** — language changes in exactly one place (global setting, by principle); JA/VI/ZH translations are in progress with the content team.
- Sidebar **menu search works** (KO/EN keyword matching with highlight).

### 3.5 Reference — AI Rate Search (Track A) improvements

- Never assumes past dates (rolls to the next occurrence and states the assumption), asks back when the destination is missing, and understands **"one double + one twin" split-room requests**. Details in Proposal/Spec ①.

> The full per-item commit history for all 25 improvements: [detailed spec §3.1](spec-b-dotbiz-enhancement.md) (Korean).

## 4. New Initiatives Proposed (H2)

| # | Initiative | Essence | Status |
|---|-----------|---------|--------|
| 1 | 5-language content build-out | EN·KO·JA·VI·ZH — the structure is ready; **waiting on content-team translations** | In progress |
| 2 | OP convenience features for booking creation (3) | ⑴ Room-type sorting/filtering (twin/double) ⑵ **Split-room booking** (double + twin in one flow) ⑶ **Rate/room-type copy** (quote text to clipboard) | Planned; build Sep–Oct |
| 3 | Oppy Point (OP rewards mall) | Points accrue to individual OPs on completed stays → redeemable in a rewards mall → locks in the people who actually book. MVP = ledger + balance display | Nov (legal/finance review first) |
| 4 | Volume migration program | Onboard top API-volume clients onto DOTBIZ (training + point incentives) → track monthly direct-booking share | Target list needed |

## 5. Decisions Requested from PD

1. **Gateway campaigns** — who owns creative production (marketing/content) and the rotation cadence (proposal: bi-weekly)?
2. **Split-room booking unit** — does ELLIS issue one booking code with two room lines, or one code per room? Needs confirmation against production/ELLIS.
3. **Oppy Point policy** — accrual rate, redemption catalogue, and tax treatment (rebate implications); legal/finance review.
4. **Child-age validation strictness** — currently a strict age-at-check-in warning. Given Korean colloquial age conventions, alternatives are a ±1-year tolerance or a one-click "re-search with corrected age" action.
5. **Volume migration measurement** — an internal data source that separates API-routed vs. direct DOTBIZ bookings.

## 6. H2 Roadmap

| Month | Milestone |
|-------|-----------|
| Jul (done) | Gateway renewal · 25 improvements shipped · EN/KO language packs · measured UI parity |
| Aug | Japanese content · remaining backlog (dual-handle rate slider, real Excel export, etc.) |
| Sep | Room-type sorting · rate/room-type copy |
| Oct | Split-room booking · all 5 languages complete |
| Nov | Oppy Point build |
| Dec | Rewards mall launch · volume-migration review |

— This proposal reflects what has been validated on the prototype. Production rollout requires separate alignment with the DOTBIZ platform engineering team.
