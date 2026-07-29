# DOTBIZ Enhancement Round 3 — Development Specification v3

> **For**: PD Team (Tracy) · **From**: CEO Office · **Date**: 2026-07-29
> **Companion docs**: [v3 package README](README.md) · [Working spec §4.3 (KO)](../../plan/spec-b-dotbiz-enhancement.md) · [v2 package](../v2/) · [v1 package](../v1/)
> **Reference implementation**: live prototype — https://bstars00-rgb.github.io/B2B-System/ → sidebar **OP Points** (source: `prototype/` in this repo).

---

## 0. Scope & Reading Guide

Round 3 (V3) has **one substantial new feature — OP Points (오피포인트)** — plus smaller parity/UI items. This spec is **almost entirely about OP Points** (§1–§9); the rest of V3 is summarized in §10.

- **§1** — what OP Points is (business definition).
- **§2** — the accrual model. **The most important section for engineering** — every point on screen is derived from the booking list by an explicit formula; nothing is stored.
- **§3** — customer screen + the ELLIS internal panel.
- **§4** — **account-level separation** (points belong to the individual OP login, not the company).
- **§5** — point mall + voucher issuance/download.
- **§6** — **reward sourcing model** (which items need external integration, which do not) — a decision for you before catalog finalization.
- **§7** — derivation contract & code map.
- **§8** — open decisions (legal / finance / product).
- **§9** — QA acceptance scenarios.
- **§10** — the rest of V3 (dark mode, support center, AI-search removal, tab tweak).

> **Status**: OP Points is a **working prototype pending a go/modify/discard decision** (§8). It is built as a **disposable module** — it only *reads* bookings and never mutates the `Booking` type or seed data, so it can be removed by deleting 5 files + one sidebar line (§7). Do not treat the numeric policy values (base rate, FX, point value) as settled — they are placeholders awaiting legal/finance sign-off.

---

## 1. What OP Points Is

| Item | Value |
|------|-------|
| **OP** | The **customer** who uses DOTBIZ — a seller/agency's booking staff. **Not** an internal OHMYHOTEL employee, and **not** a company-level balance. |
| Nature | A **customer loyalty reward**: the OP books on DOTBIZ, **completes an actual stay**, and earns *OhMy Points* which they redeem for goods/benefits in the point mall. |
| Purpose | Differentiate DOTBIZ from other B2B hotel platforms; drive re-use and booking loyalty at the individual-operator level (not pure price competition). |
| Who earns | **The individual OP** (personal). If a client company wants corporate control of its OPs' points, that is **the client's internal matter** — we do not enforce it. (The earlier personal/corporate toggle was removed.) |
| Menu | Sidebar → Seller section, labelled `OP Points`, purple `UP` badge (enhancement marker). Prototype uses view state; production route `/op-points`. |

---

## 2. Accrual Model (the engineering contract)

Reference: `prototype/src/utils/opPoints.ts` (single pure module, no UI imports — portable to a server).

### 2.1 Eligibility — stay **and** payment must both complete

A booking accrues points only when **all** hold:

```
status == 'Confirmed'
AND check_out < today          // the stay is finished (checkout has passed)
AND payment_status == 'Fully Paid'   // payment is settled
```

- **Cancellations, no-shows, refunds are excluded** (status ≠ Confirmed, or refunded payment).
- **Payment gating (business rule, 2026-07-29)**: checkout alone is not enough — **payment must be complete**. Prepaid suppliers are already paid at checkout; **postpaid suppliers accrue only once payment completes after checkout**.
- A booking that is stayed-but-not-yet-paid is shown separately as **"적립 예정 (지불 대기)" / Pending (awaiting payment)** — `computePending()`. It is not yet accrued; it moves to accrued when paid.

> **Production note — payment date field.** `Booking` currently has no payment-completion date. The prototype **derives** a `paidAt` deterministically (prepaid → shortly after booking date; postpaid → shortly after checkout; `Fully Paid` only, clamped to ≤ today) purely so the "결재 완료일 / Paid date" column and its date filter have something to show. **Production must supply a real payment-completion timestamp** and replace the derivation.

### 2.2 Formula — a percentage of booking value, nothing else

```
points = round1( toKRW(sum_amt, currency) × (baseRatePct / 100) × multiplier / pointUnitKRW )

baseRatePct  = 1        // internal base rate (%) — HIDDEN from the customer
pointUnitKRW = 1000     // 1 OhMy Point = 1,000 KRW of value
multiplier   = 1        // 1 by default; >1 only for a matching hotel promo (§2.3)
```

- **Check**: ₩140,000 × 1% ÷ 1,000 = **1.4 P** (matches the business-provided example).
- **Multi-currency** → converted to a **common KRW base** before computing. FX table `FX_TO_KRW` in `opPoints.ts` (`USD 1480`, `JPY 9.3`, `THB 41`, `SGD 1090`, `VND 0.058`, `TWD 46`, `HKD 189` — 2026 approximations; **finance to confirm**).
- **No accrual cap.**

### 2.3 Designated-hotel multiplier promotions (ELLIS-managed)

- Specific hotels can accrue at a **multiple** of the base (e.g. base 1% → a hotel at 1.5% = **multiplier 1.5 = "150%"**).
- **Managed only inside ELLIS (internal).** Scope of a promo = **designated hotel · date window (by booking date) · designated room types**. Data shape (`mocks/opPointsPromos.ts`):
  ```ts
  PointPromo { id, hotelId, hotelName, roomTypes: string[] | 'all', start, end, multiplier, active }
  ```
- Matching (`promoFor`): a booking's `booking_date` falls in `[start, end]`, `hotel_id` matches, room type matches (or `'all'`); on overlap the **highest** multiplier wins.

### 2.4 The rate is hidden from the customer (hard requirement)

- **The customer never sees the rate or the formula.** A promo hotel shows only a **multiplier badge** ("150% 적립") in listings/search/accrual history.
- **No currency amounts on the customer screen** (strengthened 2026-07-29). Points only — `1.4 P`, never `₩1,400` or `USD`. This prevents the customer from reverse-engineering the accrual rate. USD survives only as an *internal* redemption anchor (§5).

---

## 3. Screen Specification

Two-column customer layout (max-width 1680px) + a collapsible internal panel.

### 3.1 Customer view — left column

- **Summary cards (4)**: Balance / Total earned / Redeemed / **Pending (awaiting payment)**. All scoped to the logged-in OP account (§4).
- **Accrual guide**: plain-language rules — **no rate, no formula**. States the payment rule (prepaid at checkout / postpaid at payment completion) and that pending items appear below.
- **Date filter** (shared by both lists below): basis select **Stay-completed date | Paid date** + from/to range. **Default = the most recent month present in the data** — so the lists don't grow unbounded. "This month" / "All" quick buttons.
- **Accrual history**: per-booking rows — **booking code (ELLIS)** (clickable → opens that booking in the Bookings tab), stay-completed date, paid date, hotel (+ promo badge), points. No amounts/rates.
- **Pending (awaiting payment)**: same shape, for stayed-but-unpaid bookings (postpaid). Filtered by stay-completed date (no paid date yet).

### 3.2 Customer view — right column

- **Point mall** — one country's catalog (§5). Product cards show icon, name, one-line desc, **point cost only**. Whole card is clickable → **product detail popup** (§5.2).
- **My Vouchers** — issued vouchers with download (§5.3).

### 3.3 ELLIS internal panel (customer-hidden, demo)

Collapsible "🔧 ELLIS 내부" panel: lists promos with editable **multiplier** and **active** toggle, showing hotel · room type · date window. Editing recomputes accruals live. In production this is the ELLIS-side CRUD (hotel/date/room-type designation); the prototype demonstrates multiplier/active only.

---

## 4. Account-Level Separation

**Business rule (2026-07-29)**: a new OP is created in **User Info** with an **ID and password** and logs in individually. Therefore **OP Points are separated per login account**. **Even within the same company, two OPs have separate points, balances, and vouchers.**

| Aspect | Prototype | Production |
|--------|-----------|------------|
| Who owns points | The logged-in OP account | Same |
| Booking → account link | Deterministic hash `opAccountIdFor(ellis_code)` over demo accounts (`mocks/opAccounts.ts`, all under one company) | **The OP account that created the booking** (stored on the booking) |
| Separation verified | TYO SALES 24.2 P vs OSAKA DESK 14.5 P; vouchers TYO 1 / OSAKA 0 | — |
| Account switch UI | **None** — fixed to the logged-in account (a demo switcher was added, then removed at business request: real login already separates accounts) | Real session identity |

> **Open item ⑥ (§8)**: production must attribute each booking to its **creator OP account** and scope accrual to `bookings where creatorAccount == loggedInAccount`. Corporate roll-up (if a company wants it) is out of scope — the client manages it internally.

---

## 5. Point Mall & Vouchers

### 5.1 Country-specific catalog

- The mall shown depends on the **customer's country** — one catalog at a time (e.g. a Chinese customer sees items usable/receivable in China).
- Composition = **Global (international)** items (travel/premium physical goods, usable anywhere) + **country-local** items (local gift cards).
- **Currently fixed to South Korea** (no country switcher; production auto-selects by account country). Other countries (CN/JP) are defined in data but not shown.
- **DOTBIZ commission-discount coupons are excluded** from rewards (business decision).
- Redemption anchor is **USD internally** (ordering, minimums), **never shown**. Minimum redeem = 14.8 P (internal USD 10). Data: `mocks/opPointsMall.ts` (`region`, `costUSD`, `desc`, `detail`, `highlights`).

### 5.2 Product detail popup + irreversible-exchange confirmation

Clicking a product opens a **detail popup**: category & region badges, full description (`detail`), highlights (receipt method / validity / where usable), required points vs balance, and a **warning that exchange cannot be undone** ("포인트 교환은 한 번 하면 취소할 수 없습니다"). **[교환하기 / Exchange]** performs the redemption (disabled if insufficient balance). The irreversibility confirmation is merged into this popup (no second modal).

### 5.3 Voucher issuance & download

- On exchange, a **voucher is issued**: code `OMH-<product>-<random6>`, 1-year validity, listed under **My Vouchers**.
- Each voucher: code, issue/expiry dates, "usable" state, **[Download voucher]** (a self-contained printable **HTML voucher**: brand header, barcode, code, validity, prototype disclaimer) + **[Copy code]**.
- **Prototype: vouchers are session-only** (reset on reload). **Production must persist to the account and deliver by email**, and — for real gift-card items — fetch the actual code from the fulfillment provider (§6).

## 6. Reward Sourcing Model (decision before catalog finalization)

Each item differs in **how it is actually fulfilled**. This determines what integration work the catalog needs.

| Type | Examples | External integration | Cost |
|------|----------|----------------------|------|
| **Hotel inventory** (our core / differentiator) | Free night, room upgrade, breakfast, late checkout, next-booking discount | **None** — issued by us via existing hotel relationships | Hotel settlement |
| **Status / service perks** | OP tier upgrade, dedicated CS, early access, priority allocation | **None** — pure system | ~0 |
| **Own-brand goods (MD)** | Branded travel goods | **None** — procure once, self-ship | Production/shipping |
| **Brand gift cards** | Starbucks, GS25, Baemin, JD, Rakuten, etc. | **Required** — **not** per-brand deals but **one gift-card aggregator** (e.g. Giftishow Biz / Smartcon / Tango / Tillo / Runa) | Wholesale (resale margin) |
| **Airport lounge** | Lounge pass | Lounge provider (Priority Pass / DragonPass class) | Access cost |

> **Recommended launch strategy**: start with **no-integration** items (hotel inventory + status perks) — differentiating and immediately shippable — and add gift cards **when the aggregator is integrated**. At redemption, ELLIS calls the aggregator API to obtain a real code and delivers it to the OP. **The integration target is one aggregator, not each brand.** The current prototype catalog (gift-card heavy) is **illustrative**; the actual product line is decided after the sourcing model is confirmed (business, 2026-07-29: "product lineup to be decided later").

## 7. Derivation Contract & Code Map

**Rule: no stored point numbers.** Every figure derives from `Booking[]` — a seller reads Bookings and OP Points side by side, so the two must always agree (they share `SEED_BOOKINGS`).

**Booking fields consumed**: `ellis_code`, `hotel_id`/`hotel_name`, `room_type`, `booking_date`, `check_out`, `status`, `payment_status`, `sum_amt`, `currency`.

**Exported functions** (`opPoints.ts`, pure):

| Function | Returns |
|----------|---------|
| `pointsFor(amount, currency, multiplier)` | points for one booking |
| `promoFor(booking, promos)` | `{ multiplier, label }` |
| `computeAccruals(bookings, today, promos)` | eligible accruals (stayed + Fully Paid), newest first |
| `computePending(bookings, today, promos)` | stayed-but-unpaid rows |
| `usdToPoints(usd)` | redemption display helper (internal anchor) |
| `summarize(accruals, today)` | totals for the summary cards |

**Code map** (`prototype/src/`) — the disposable set:

| Area | File |
|------|------|
| Engine (eligibility, formula, promo, FX, policy) | `utils/opPoints.ts` |
| Screen (customer + ELLIS panel + popup + vouchers) | `components/OpPointsPage.tsx` |
| Mall catalog (global + KR/CN/JP, detail/highlights) | `mocks/opPointsMall.ts` |
| Promo config (ELLIS multipliers) | `mocks/opPointsPromos.ts` |
| OP accounts (per-account separation) | `mocks/opAccounts.ts` |
| Nav entry + `UP` badge | `components/PortalSidebar.tsx` (one line) |

Single policy point: `OP_POINT_POLICY` (base rate, point unit, min redeem, expiry) + `FX_TO_KRW` (FX) + `opPointsPromos.ts` (multipliers).

## 8. Open Decisions (legal / finance / product)

| # | Item | Owner |
|---|------|-------|
| ① | **Base accrual rate** (internal %) | Finance |
| ② | **FX table** (`FX_TO_KRW`) — booking-time vs periodic | Finance |
| ③ | **Point value** (1 P = 1,000 KRW ≈ USD 0.68) — accounting/liability | Finance/Tax |
| ④ | **Tax treatment** of rewards | Tax |
| ⑤ | **Mall sourcing model** (§6) — self-issue vs aggregator; settlement party | Product/BD |
| ⑥ | **Booking → creator OP account** link for real accrual scoping (§4) | Dev |
| ⑦ | **Voucher persistence & delivery** (account storage + email; real-code fetch for gift cards) | Dev |
| ⑧ | **1-year expiry** liability management | Finance |

> Risk containment (working spec §6): keep the MVP limited to **ledger + display**; enable **actual goods exchange only after legal/finance review passes**.

## 9. QA Acceptance Scenarios (all pass on the prototype)

| # | Scenario | Expected |
|---|----------|----------|
| Q1 | Open OP Points | 4 summary cards; accrual history derives from the same bookings shown in Bookings |
| Q2 | Accrual eligibility | Only `Confirmed ∧ checkout passed ∧ Fully Paid` accrue; stayed-but-unpaid appear under **Pending** |
| Q3 | Click a booking code in accrual history | Navigates to Bookings and opens that booking's detail |
| Q4 | Promo hotel | Shows **"150%/200%" badge only** — no rate, no formula, no amount |
| Q5 | ELLIS panel → change a multiplier | Accruals/summary recompute live |
| Q6 | Date filter → basis & range | History/Pending filter accordingly; default = most recent month |
| Q7 | Switch logged-in OP (accounts) | Points, balance, and vouchers **differ per account** (separation) |
| Q8 | Click a product | Detail popup: description, highlights, required points, **irreversibility warning** |
| Q9 | Exchange | Balance decremented, **voucher issued**; download yields an HTML voucher; insufficient balance disables the button |
| Q10 | Any customer surface | **No currency amount anywhere** — points only |

## 10. Rest of V3 (summary)

| Item | Nature | Status |
|------|--------|--------|
| **Global dark mode** | Enhancement | ✅ Shipped. Portal-wide (shares `omh_dark` with the login screen). Retrofit via an `index.css` `.dark` overlay (re-maps shared utilities across ~35 components instead of per-component `dark:`). **Recommend promoting to semantic tokens (surface/body/border) for production** — noted in code. |
| **Customer Service "?" popover** | Parity clone | ✅ Shipped. Header CS popover restored — Hotel (Korean/Global markets, Office Hours) + **Vietnam Operation Team**. |
| **AI Rate Search (ELLIS MCP) removed** | Scope change | ✅ Removed from the portal — **ELLIS MCP is not embedded in DOTBIZ; it becomes a plugin each client attaches to their own Claude.** See [README](README.md) top for the formal deletion request. |
| **Member-list expansion** | Trial | ❌ Discarded after prototype review. (Its account-attribution / voucher-isolation idea is partly realized by OP Points account separation, §4.) |
| Bookings tab count badge | UX tweak | ✅ Removed (business request). |

> **Excluded from V3 deliverables (bug fix, per business correction 2026-07-27)**: the Create Booking calendar dark-mode readability + initial-month fix — a restoration of expected behavior, not a new enhancement.

— Questions on any section: CEO Office.
