# DOTBIZ Dashboard (Statistics) — Development Specification v2

> **For**: PD Team (Tracy) · **From**: CEO Office · **Date**: 2026-07-17
> **Companion docs**: [Proposal v2 (EN)](proposal-en.md) · [Proposal v2 (KO)](proposal-ko.md) · [Working spec §4.6 (KO)](../../plan/spec-b-dotbiz-enhancement.md) · [v1 package](../v1/)
> **Source spec**: PD team's `Dashboard_Specification_2026-07-17_KR.md` — ported, with 6 documented deviations (§5)
> **Reference implementation**: working in the prototype — https://bstars00-rgb.github.io/B2B-System/ → sidebar **Dashboard** (source: `prototype/` in this repo).

---

## 0. Scope & Reading Guide

- **§1–§3** = what the screen is and does (per tab).
- **§4** = the derivation contract — **the most important section for engineering.** Every figure on screen is computed from the booking list by an explicit formula; none are stored constants.
- **§5** = where we deviated from the PD dashboard spec and why.
- **§6** = a real limitation you should decide on before production.
- **§7** = what the backend must provide.
- The prototype computes client-side over `localStorage` bookings. Production must move these aggregations **server-side** (§7) — a seller with 3 years of bookings cannot ship the whole list to the browser.

## 1. Placement & Navigation

| Item | Value |
|------|-------|
| Nature | **New screen — the original DOTBIZ has no dashboard.** Production menu is Seller (Bookings / Create Booking / FAQ Board / Notice) + Member list (Staff list) |
| Menu position | Sidebar → Seller section, **first item**, labelled `Dashboard`, carries the purple `UP` badge (enhancement marker) |
| Route | Prototype uses view state, not a router. Production: `/dashboard` under the Seller area |
| Access | Seller portal user (the logged-in account). Scope of visible data = **open question ①** (§10) |
| Read-only | No drill-down routing, no write actions — a snapshot screen by design (§3.0) |

## 2. Global Filters (page level)

Both selects are **functional**, not decorative.

```
DATE_BASES = ["Booking Date", "Check-in Date", "Check-out Date"]
PERIODS    = ["This Month", "Last Month", "Last 30 Days",
              "This Quarter", "Last Quarter", "This Year", "Custom"]
```

**Date basis** decides which field each booking is bucketed by:

| Basis | Field |
|-------|-------|
| Booking Date | `booking_date` (date part) |
| Check-in Date | `check_in` |
| Check-out Date | `check_out` |

This materially changes results — on our 200-booking set, *This Year* returns **181 bookings on Booking Date** but **63 on Check-in Date** (most check-ins are still in the future). Do not treat the basis as cosmetic.

**Period → comparison window.** In-progress periods (This Month / This Quarter / This Year) compare **equal elapsed spans**, not whole periods:

| Period | Range | Compared against |
|--------|-------|------------------|
| This Month | 1st → today | Same day-count of last month (e.g. Jul 1–17 vs **Jun 1–17**) |
| Last Month | full previous month | full month before it |
| Last 30 Days | today−29 → today | today−59 → today−30 |
| This Quarter | quarter start → today | same elapsed span of previous quarter |
| Last Quarter | full previous quarter | full quarter before it |
| This Year | Jan 1 → today | same elapsed span of last year |
| Custom | user range | immediately preceding window of equal length |

> **Why this rule matters**: comparing a partial *This Month* against a whole *Last Month* makes every KPI negative for most of the month — the dashboard would look like the business is collapsing on the 17th of every month. Reference: `periodRange()` in `utils/dashboardStats.ts`.

## 3. Tab Specifications

### 3.0 Design principle (carried from the PD spec §11 — keep enforcing it)

> **Booking metrics only.** AR Aging, Dispute, Ticket SLA, and Loyalty Tier stay on their own screens and are **not** added here. When someone proposes a new KPI, this rule is the reason to say no — it is what keeps the screen readable. Drill-down routing is deferred for the same reason.

### D-1 Overview

**KPI cards (4)** — Confirmed bookings only; cancelled bookings are excluded from revenue.

| Card | Formula |
|------|---------|
| Total Bookings | `count(Confirmed ∧ dateOf(b, basis) ∈ [from, to])` |
| Total Revenue | `Σ sum_amt` over that set |
| Room Nights | `Σ (nights × room_count)` over that set |
| Avg Booking Value | `Revenue / Total Bookings` (0 when no bookings) |

Each card shows a delta chip vs the comparison window and the comparison label. **Delta is omitted entirely when the comparison value is 0** — a percentage change from zero is not a number, and printing `Infinity%` or `+100%` would be a lie.

**Daily Booking Statistics** — AreaChart + Total / Daily Avg / Peak.
- Metric select: `Booking Count | Booking Amount | Number of Nights`.
- Own from/to date inputs (default: last 31 days).
- **Days with no bookings are emitted as 0**, not skipped — otherwise the x-axis silently compresses and a gap reads as activity.

**12-Month TTV Trend** — BarChart, current month highlighted (others at 40% opacity).
- Labels use `Mon-YY` (`Jul-26`) — a 12-month window crosses a year boundary and repeats month names.
- Y-axis compacted (`¥1.2M`, `¥340k`) — full yen digits collide.

**Destination Booking Percentage** — PieChart + table (Destination / Bookings / % / Amount / Nights).
- View toggle: `Country/Region | City`.
- **Grouping key = `cityOfHotel(hotel_id)`, not the booking's `region` string.** `region` is written differently depending on the creation path (Korean from the search flow, English from seed data), so it cannot be trusted as an aggregation key. The hotel ID resolves to a city record that carries `nameEn` and `country`.
- Top 8 + **Others** (a pie sliced 15 ways is unreadable).

**Bestselling Hotels** — table (Rank / Hotel Name / Star / City / Country-Region), country filter, top-3 rank chips.
- **This is the one table not derived from the seller's bookings** — it is a *platform-wide* ranking, which by definition cannot come from one seller's 200 bookings. Separate data source. See open question ②.
- **No Supplier column** (removed 2026-07-17 — see §5-④).

### D-2 Booking Statistics (`dc-booking`)

- 3 KPI cards: Confirmed / Cancelled / **Deferred Credit** (current month).
- 6-month grouped BarChart (Confirmed / Cancelled / Deferred), bucketed by **booking month** — a cancelled booking must stay in the month it was *booked*, otherwise the cancel-rate denominator in D-3 stops matching.
- Account Level filter (`All | Master | Sub-accounts`) — **display only in the prototype** (no sub-account structure exists). See open question ①.

> **`Deferred Credit` is our interpretation, not a confirmed definition**: `count(status = Confirmed ∧ payment_status = Unpaid)` — booked on credit, not yet settled. **Finance must confirm** (open question ⑤).

### D-3 Cancellation (`dc-cancel`)

- 3 KPI cards: This Month / Previous Month / Average across months that have data.
- LineChart: cancel-rate trend. **`rate = cancelled / (confirmed + cancelled)`** per booking month.
- PieChart + legend: cancel-reason distribution (6-month cumulative), from `Booking.cancel_reason`.
- Reason set: `Change of plans · Guest cancelled · Found better option · Date change needed · Duplicate booking`.
- **Invariant**: reason counts sum exactly to the cancelled counts in D-2. Verified.

> Requires a **new field**: `Booking.cancel_reason`. The current booking flow does not capture it — production needs a reason picker at cancellation, or this tab has no source (§7).

### D-4 Daily (`dc-daily`)

Same series and metric select as the Overview daily chart, full width, with Total / Daily Avg / Peak cards over the selected range.

### D-5 Year-End (`dc-yearend`)

- 3 year cards (year−2 / year−1 / current YTD): bookings, revenue, room nights.
- Monthly 3-year comparison BarChart + YoY growth table.
- **Years with no bookings render `—` / "no booking data"**, and a banner explains why. YoY cells are `—` when the base year is 0. See §6.

## 4. Derivation Contract

**Rule: the dashboard has no stored numbers.** Every figure is computed from `Booking[]`. This is not a stylistic choice — a seller reads the Bookings list and the Dashboard side by side, and any hard-coded total is a defect waiting to be found.

Reference: `prototype/src/utils/dashboardStats.ts` (single module, no UI imports — portable to a server).

**Booking fields consumed** (`prototype/src/types/index.ts`):

```ts
booking_date   // 'YYYY-MM-DDTHH:mm:ss'  — bucketing (Booking Date basis)
check_in       // 'YYYY-MM-DD'           — bucketing (Check-in basis)
check_out      // 'YYYY-MM-DD'           — bucketing (Check-out basis)
status         // 'Confirmed' | 'Cancelled'
payment_status // 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'Refunded' | 'Partially Refunded'
sum_amt        // number — billed total incl. tax, in the seller's billing currency
currency       // 'JPY' for the ATTIC TOURS seller (see §4.1)
nights, room_count
hotel_id       // → cityOfHotel() → { nameEn, country }
cancel_reason  // NEW — required by D-3
```

**Exported functions** (each pure, `Booking[]` in → plain data out):

| Function | Returns |
|----------|---------|
| `periodRange(period, today, customFrom, customTo)` | `{ from, to, prevFrom, prevTo, label }` |
| `computeKpi(bookings, basis, range)` | 4 KPIs + delta strings |
| `ttvTrend(bookings, basis, today)` | 12 × `{ month, amount }` |
| `dailySeries(bookings, basis, from, to)` | per-day `{ date, bookingCount, bookingAmount, nights }` (zero-filled) |
| `destinationStats(bookings, view, basis, range)` | `{ name, bookings, amount, nights, color }[]` (top 8 + Others) |
| `monthlyBookingStats(bookings, today, months)` | `{ month, confirmed, cancelled, deferredCredit }[]` |
| `monthlyCancelRate(monthlyRows)` | `{ month, rate, count }[]` |
| `cancelReasonStats(bookings, today, months)` | `{ reason, count, color }[]` |
| `yearEndStats(bookings, today)` | `{ years, monthly, totals }` with an `empty` flag per year |
| `dataStartMonth(bookings)` | earliest booking month — drives the "data starts YYYY-MM" notices |

### 4.1 Currency

All amounts render in **JPY**, the billing currency of the demo seller (ATTIC TOURS, a Japanese agency) — every booking in the clone is billed in JPY regardless of the hotel's local currency.

The mock generator converts hotel rates (`hotelDb.base`, in the **city's local currency** — KRW in Seoul, THB in Bangkok, VND in Da Nang) to JPY via a fixed table (`toJpy()` in `mocks/hotelDb.ts`) so that dashboard revenue and the hotel list quote the same underlying rate.

> **Production**: bookings carry their own `currency`. If a seller ever books in mixed currencies, **the dashboard must not sum them blindly** — it needs either a booking-time FX rate stored on the booking, or per-currency breakdowns. Confirm with finance which one DOTBIZ guarantees.

## 5. Deviations from the PD Dashboard Spec (6)

| # | Deviation | Reason |
|---|-----------|--------|
| ① | **Currency JPY**, not USD | The clone seller and every rate in the hotel DB are in yen; USD figures would not tie to anything on screen |
| ② | **Periods computed from today** | The spec's data was pinned to 2026-03, so "This Month" pointed at the past |
| ③ | **Deterministic seeded data** (no `Math.random`) | The spec's mock re-randomized on every reload — charts changed under QA and demos were not reproducible |
| ④ | **Supplier column removed** from Bestselling Hotels | Supplier (Direct / DIDA / Hotelbeds) is **internal supply-channel information and must not be exposed to sellers**. Note: the PD spec §3-6 listed it as a column, but **the PD prototype code never rendered it** — removing it actually brings us back in line with your own implementation. Removed from screen, mock data, and the spec document. |
| ⑤ | **OP Points card removed** | Oppy Point is not built yet (it is a planned H2 initiative — v1 proposal §4-3). A dashboard must not display a balance for a feature that does not exist. Removed from screen, mock data, and the spec document (§3-2 and the data model). |
| ⑥ | **Static mock → derived from bookings** | The spec assumed static mock arrays. Per business instruction the dashboard must **match the actual bookings**, so all aggregation moved to §4. |

### 5.1 One spec inconsistency to resolve on your side

PD spec §4 (Data Center — Booking) documents the Account Level filter as `전체 / Direct / DIDA / Hotelbeds`. **Both your prototype and ours implement `All / Master / Sub-accounts`.** Two problems: the documented values are supplier names (same exposure concern as ④), and the doc contradicts both implementations. This is tied to open question ① (what Account Level actually means). We left the code as `All / Master / Sub-accounts` and did not edit that line.

## 6. Known Limitation — history depth

Bookings in the prototype start **2026-05-01** (per business instruction). Consequences:

| Surface | State |
|---------|-------|
| Overview · Cancellation · Daily | Fully populated |
| 12-Month TTV | 3 of 12 months have data |
| Booking Statistics (6 months) | 3 of 6 months have data |
| **Year-End (3-year comparison)** | **2024 and 2025 are entirely empty** |

We **did not fabricate history to fill these**. Inventing 2024–2025 bookings would break the very property this round was asked for — that the dashboard matches real bookings. Instead the empty ranges are labelled on screen (Year-End carries an explanatory banner).

**This is a decision for you, not a bug**: the Year-End tab only becomes meaningful with ≥1 year of booking history. Options — (a) ship it and let it fill in naturally once production data flows (our recommendation: production already has real history, so this is a prototype-data artifact only), (b) drop the tab, (c) extend the prototype's booking history for demo purposes.

## 7. Backend Requirements (production)

1. **Server-side aggregation.** The prototype aggregates in the browser over the full booking list. Production must expose an endpoint that takes `{ basis, from, to, prevFrom, prevTo }` and returns the shapes in §4 — do not ship a seller's whole booking history to the client.
2. **`cancel_reason` capture.** D-3 has no data source unless cancellation records a reason. Needs a reason picker (enum above + free text) at cancel time, plus a decision on what to do with historical cancellations that have none (suggest bucketing as `Unspecified`).
3. **Deferred Credit definition** — confirm ours (Confirmed ∧ Unpaid) or supply the real one (open question ⑤).
4. **Data scope** — whether a seller's dashboard shows only their own bookings or aggregates sub-accounts decides both the API contract and whether the Account Level filter is real (open question ①).
5. **Bestselling ranking source** — platform-wide ranking is a separate service/table, not the seller's bookings (open question ②).
6. **Aggregation cadence** — realtime query vs nightly batch (open question ③). Affects whether a booking made 5 minutes ago appears.
7. **Currency handling** — see §4.1.

## 8. QA Acceptance Scenarios (all pass on the prototype)

| # | Scenario | Expected |
|---|----------|----------|
| Q1 | Open Dashboard → Overview | 4 KPI cards; figures equal the Bookings list aggregated for this month |
| Q2 | Period → `This Year` | KPIs recompute (our data: 181 bookings / ¥9,393,521 / 685 nights) |
| Q3 | Date basis → `Check-in Date`, Period `This Year` | KPIs **change** (our data: 63 bookings) — proves the basis is applied |
| Q4 | Overview → Destination, toggle `Country/Region` ↔ `City` | Pie + table re-group; **table Bookings column sums to the Confirmed count** |
| Q5 | Daily metric → `Booking Amount` | Chart, axis, Total/Avg/Peak switch to yen; days with no bookings show 0 |
| Q6 | Booking Statistics tab | Confirmed/Cancelled/Deferred bars per month; months before data start are empty **with a notice**, not blank |
| Q7 | Cancellation tab | **Reason counts sum to the monthly cancelled totals**; no `NaN` |
| Q8 | Year-End tab | 2024/2025 cards read `—` "no booking data"; banner explains; YoY cells `—` (no `Infinity%`) |
| Q9 | Bestselling → country filter `Thailand` | Top-20 Thai hotels, 5 columns, **no Supplier column** |
| Q10 | Any tab | No `OP Points` card anywhere |
| Q11 | Create a new booking → return to Dashboard | Booking count increments (dashboard reads the same store) |
| Q12 | Reload | Identical figures (seeded data — no re-randomization) |

## 9. Prototype Code Map

| Area | Files (`prototype/src/`) |
|------|--------------------------|
| Dashboard screen (5 tabs, filters, charts) | `components/DashboardPage.tsx` |
| **Derivation layer (all formulas)** | `utils/dashboardStats.ts` |
| Booking data + generator (200 bookings) | `mocks/seedBookings.ts` · `utils/bookingStore.ts` (persistence, seed versioning) |
| Hotel/city/country lookup, FX | `mocks/hotelDb.ts` (`cityOfHotel`, `allHotels`, `toJpy`) |
| Bestselling ranking (separate mock) | `mocks/dashboard.ts` |
| Booking type (incl. `cancel_reason`) | `types/index.ts` |
| Nav entry + `UP` badge | `components/PortalSidebar.tsx` · `components/EnhBadge.tsx` |

**Charts**: Recharts 2.15 (React 18-compatible line). Adds ~350 kB to the bundle — acceptable for a prototype; **production should code-split the dashboard route.**

## 10. Open Decisions for PD

| # | Question | Why it blocks |
|---|----------|---------------|
| ① | **Data scope** — own bookings only, or sub-accounts aggregated? What does `Account Level` actually mean? | Decides the API contract and whether that filter is real or gets removed |
| ② | **Bestselling ranking basis** — platform-wide or the seller's own? (built as platform-wide) | Different data source entirely |
| ③ | **Aggregation cadence** — realtime or daily batch? | Determines whether a just-made booking appears |
| ④ | **Same data source** as the DOTBIZ channel-growth metrics (v1 proposal §5-5)? | Avoids two conflicting definitions of "bookings" |
| ⑤ | **Deferred Credit definition** — confirm Confirmed ∧ Unpaid | Currently our interpretation |
| ⑥ | **Year-End tab** — keep, drop, or defer? (§6) | Meaningless below 1 year of history |
| ⑦ | **Account Level values in your spec** (§5.1) — `Direct/DIDA/Hotelbeds` contradicts both implementations | Spec/code mismatch, plus supplier-exposure concern |

— Questions on any section: CEO Office.
