# DOTBIZ Feature Enhancement — Proposal v1 (for PD Team)

> **Delivered**: 2026-07-17 · **From**: CEO Office · **Version**: v1 (based on validated prototype)
> **Development Specification (EN)**: [dev-spec-en.md](dev-spec-en.md) — feature specs, data contracts, QA scenarios, code map
> **Detailed spec (KO)**: [spec-b-dotbiz-enhancement.md](../../plan/spec-b-dotbiz-enhancement.md) (25 improvements logged per commit) · AI search track: [spec-a](../../plan/spec-a-ellis-ai-search.md)
> **Live demo**: https://bstars00-rgb.github.io/B2B-System/

---

## 1. One-Page Summary

| Item | Description |
|------|-------------|
| Goals | ① Remove the daily friction that operating partners (OPs) face and turn DOTBIZ into a **customer-friendly platform** ② Today most of our booking volume comes from API-integrated clients — **use the DOTBIZ upgrade to win additional DOTBIZ clients and grow DOTBIZ volume substantially** (this is **not** about migrating API clients onto DOTBIZ; it is about **growing the DOTBIZ channel itself**) |
| Approach | We cloned the production site (ohmyhotel.biz) 1:1 as a prototype, validate every UX change there first, and then propose the validated changes for production |
| Scope of v1 | **25 completed improvements** (original-feature restoration = parity + new enhancements) + **4 new initiatives proposed** (§4) |
| Working principle | One pain point = one improvement = shipped same day · Measurement-based fidelity (font Pretendard, brand color #EF7F29 — identical to production) |

## 2. How to Review the Demo (Guide for PD)

1. Open the demo URL → on the gateway, **check the agreement box and Sign In** (credentials are pre-filled — no real authentication).
2. **Purple `UP` badge = a spot that differs from (improves on) the original DOTBIZ.** Hover to see what changed. The **✨ button** in the header hides all badges, leaving a pure clone view. (Features restored to match the original carry no badge.)
3. Language: the **🌐 selector** in the header is a global setting — Playbook and FAQ follow it. Japanese/Vietnamese/Chinese fall back to English with a "translation in progress" notice.
4. Suggested walkthrough: Gateway (rotating billboard · legal modals) → Create Booking, search "osaka" (loading → 26 properties · filters · photos) → Select (room list opens in a new tab) → change Rooms to 2 and re-search (rates recalculate) → Select a rate → booking modal (child birthday validation) → Create → the booking appears in the original tab's Bookings list.

## 3. What Was Built & Validated

The 25 completed items fall into two categories — **① Enhancements (new; not in the original DOTBIZ)** and **② Clone-parity restoration (original DOTBIZ features rebuilt as instructed)**. The purple `UP` badges in the demo mark only ①.

### 3.1 Enhancements — new, not in the original DOTBIZ (what this proposal actually proposes)

- **Gateway (Login) renewal — first new initiative**
  - Billboard: the left half is a campaign area answering "who we are / what we do" — 3 campaigns auto-rotate (8s); adding an entry to the campaign file refreshes the creative (**a periodically refreshed marketing surface**). Large typography (68px) with an AI-era background (neural-network lines, pulsing nodes, glow, "AI Rate Engine — Online" status).
  - Modern sign-in panel: DOTBIZ branding, password show/hide, Remember me, dark-mode toggle, Create Account.
  - Legal documents accessible before login: full **Terms & Condition (26 articles, effective 2026-03-14)** and full Privacy Policy as gateway modals, with an agreement gate.
- **Ellis Playbook built in**: a 6-chapter documentation-style manual (the original keeps it on a separate site), following the portal language setting.
- **Sidebar menu search works** (KO/EN keyword matching with highlight — inactive in the original).
- **Child birthday vs. searched-age mismatch warning** (age at check-in — the original accepts the input without validation).
- **`UP` badge system**: enhancement spots are identifiable on screen (✨ toggle).
- (Reference — AI Rate Search, Track A): never assumes past dates, asks back when the destination is missing, understands **"one double + one twin" split-room requests**. Details in Spec ①.

### 3.2 Clone-Parity Restoration — original DOTBIZ features, rebuilt as instructed

> The items below are **features the original DOTBIZ already had**. They were re-created 1:1 on the prototype per instruction and validated — they are not new proposals.

- **Hotel search & booking flow**: destination search with a real hotel list (26 Osaka properties, real codes), filters (star/type/chain), pagination, query latency with a "Searching…" loader, hotel photos, Select opening the room list **in a new tab** (search results kept), editable conditions after search with multi-room rate recalculation, empty dates on first visit, past dates disabled, the Unpaid-booking voucher restriction, and bookings flowing into the Bookings list.
- **Bookings (reservation management)**: working row checkboxes (select-all/per-row) and Excel-style column drag-resize — same grid feel as production.
- **Language packs**: the original ships 5 languages (EN·KO·ZH·VI·JA); the structure is restored with EN/KO content complete, language changed in exactly one global place, JA/VI/ZH translations in progress with the content team.
- **Legal documents**: full original Terms & Privacy texts, plus the portal footer links.
- **Measured UI parity**: font (Pretendard webfont), brand orange (#EF7F29), base 12px/#333 — matched to production measurements.

> The full per-item commit history for all 25 items: [detailed spec §3.1](../../plan/spec-b-dotbiz-enhancement.md) (Korean).

## 4. New Initiatives Proposed (H2)

| # | Initiative | Essence | Planning status |
|---|-----------|---------|-----------------|
| 1 | 5-language content build-out | EN·KO·JA·VI·ZH — the structure is ready; **waiting on content-team translations** | In progress (finalize in Aug) |
| 2 | OP convenience features for booking creation (3) | ⑴ Room-type sorting/filtering (twin/double) ⑵ **Split-room booking** (double + twin in one flow) ⑶ **Rate/room-type copy** (quote text to clipboard) | Draft done — detailed spec finalized in Aug |
| 3 | Oppy Point (OP rewards mall) | Points accrue to individual OPs on completed stays → redeemable in a rewards mall → locks in the people who actually book. MVP = ledger + balance display | Policy finalized in Aug (incl. legal/finance review) |
| 4 | DOTBIZ channel growth | Use the upgraded portal as a sales asset to win **new client accounts** (multilingual · self-serve onboarding) and to increase usage among existing clients → grow DOTBIZ channel volume; track monthly growth metrics | Plan & measurement finalized in Aug |

## 5. Decisions Requested from PD

1. **Gateway campaigns** — who owns creative production (marketing/content) and the rotation cadence (proposal: bi-weekly)?
2. **Split-room booking unit** — does ELLIS issue one booking code with two room lines, or one code per room? Needs confirmation against production/ELLIS.
3. **Oppy Point policy** — accrual rate, redemption catalogue, and tax treatment (rebate implications); legal/finance review.
4. **Child-age validation strictness** — currently a strict age-at-check-in warning. Given Korean colloquial age conventions, alternatives are a ±1-year tolerance or a one-click "re-search with corrected age" action.
5. **DOTBIZ channel growth measurement** — an internal data source that reports DOTBIZ channel bookings, GMV, and new client accounts monthly.

## 6. Planning Schedule — complete by end of August

| Period | Milestone |
|--------|-----------|
| Jul (done) | Clone-parity restoration + first wave of enhancements built & validated on the prototype · **this Proposal v1 delivered** |
| Aug | Incorporate the §5 decisions → finalize detailed plans for the 4 initiatives (OP convenience ×3 · Oppy Point policy · language content · DOTBIZ channel growth design) → **planning wrap-up** |
| After | Implementation and production-rollout scheduling to be set separately with the PD team and the DOTBIZ platform engineering team, based on the finalized plans |

— This proposal reflects what has been validated on the prototype. Production rollout requires separate alignment with the DOTBIZ platform engineering team.
