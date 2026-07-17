# DOTBIZ Dashboard (Statistics) — Proposal v2 (for PD Team)

> **Delivered**: 2026-07-17 · **From**: CEO Office · **Version**: v2 (based on validated prototype)
> **Development Specification (EN)**: [dev-spec-en.md](dev-spec-en.md) — tab specs, derivation contract, backend requirements, QA, code map
> **Detailed spec (KO)**: [spec-b-dotbiz-enhancement.md §4.6](../../plan/spec-b-dotbiz-enhancement.md) · **Previous package**: [v1](../v1/)
> **Live demo**: https://bstars00-rgb.github.io/B2B-System/ → sidebar **Dashboard**

---

## 1. One-Page Summary

| Item | Description |
|------|-------------|
| What | A **Dashboard (Statistics) screen** for the seller portal — 5 tabs covering bookings, revenue, destinations, cancellations, and year-on-year comparison |
| Why | A DOTBIZ seller currently has **no way to see their own performance**. How many bookings did I make this month, for how much, to which destinations, what is my cancellation rate — none of it is answerable in the portal today. They have to ask our sales team. |
| Nature | **New screen.** The original DOTBIZ menu is Seller (Bookings / Create Booking / FAQ / Notice) + Member list only — marked with the purple `UP` badge in the demo |
| Basis | Your team's `Dashboard_Specification_2026-07-17_KR.md`, ported to our clone with **7 documented deviations** (§4) |
| Key property | **Every number is computed from the seller's actual bookings** — nothing on the screen is a stored constant (§3) |
| Status | Built and validated on the prototype. **7 decisions requested** (§6) |

## 2. How to Review the Demo

1. Open the demo → sign in → sidebar **Dashboard** (first item under Seller, carries the `UP` badge).
2. **Overview** — 4 KPI cards, daily chart, 12-month TTV, destination pie + table, bestselling ranking.
3. **Try the filters — they are real, not decorative.** Switch Period to `This Year` (KPIs recompute), then switch Date Basis from `Booking Date` to `Check-in Date`: bookings drop from **181 to 63**, because most check-ins are still in the future. This is the kind of question sellers actually ask ("how much do I have *staying* this month?") and the two axes answer differently.
4. **Cross-check it against reality**: open **Bookings** in the sidebar and compare. The dashboard aggregates that exact list — the numbers will tie.
5. Other tabs: Booking Statistics (6-month confirmed/cancelled/deferred), Cancellation (rate trend + reasons), Daily, Year-End.
6. **Year-End will look empty for 2024–2025.** That is deliberate and explained in §5 — please read it before judging the tab.

## 3. What We Built

### 3.1 The screen (5 tabs)

| Tab | Contents |
|-----|----------|
| **Overview** | 4 KPIs (Total Bookings · Total Revenue · Room Nights · Avg Booking Value) · Daily Booking Statistics · 12-Month TTV Trend · Destination Booking Percentage (country/city) · Bestselling Hotel Rankings |
| **Booking Statistics** | 6-month Confirmed / Cancelled / Deferred Credit trend |
| **Cancellation** | Cancel-rate trend + reason distribution |
| **Daily** | Day-by-day series (count / amount / nights) |
| **Year-End** | 3-year comparison + YoY growth table |

We kept your **minimal principle** and recommend you keep enforcing it: *booking metrics only — AR Aging, Dispute, SLA, and Loyalty Tier stay on their own screens.* When someone asks for "just one more KPI", that rule is the reason to say no. It is what keeps this screen readable.

### 3.2 The part we consider most important: everything is derived

The dashboard has **no stored numbers**. Every KPI, chart, and table cell is computed from the booking list by an explicit formula.

This matters for a practical reason: a seller will open the Dashboard and the Bookings list side by side. Any figure written by hand becomes a defect the moment the underlying data changes. We verified the tie-out directly — the screen's *This Month* KPIs (43 bookings / ¥2,662,009 / 189 room-nights) equal the stored booking list aggregated for July, and *This Year* returns 181 / ¥9,393,521 / 685.

A second consequence: **the Date Basis and Period selects now actually work.** In the first cut they were display-only. Because the data is derived, they became real filters at no extra cost.

One deliberate exception: **Bestselling Hotel Rankings is not derived.** It is a *platform-wide* ranking, which cannot come from one seller's bookings — it needs its own data source (§6-②).

### 3.3 Ranking → Booking in one click

A seller who sees a bestselling hotel wants to book it. Clicking the hotel name now opens **Create Booking with the destination and hotel already filled and the calendar open** — the only thing left to do is pick dates.

Making that real surfaced a problem worth flagging. The ranking mock listed **320 hotels across 102 cities** (Dubai, Paris, New York) of which **exactly one existed in our bookable inventory**. A "bestselling on OhMyHotel" list whose hotels cannot be booked on OhMyHotel is self-contradictory, and clicking one would have led nowhere. We rebuilt the ranking from the hotel master so every row resolves to a real, bookable property.

**For production this becomes a requirement on the ranking API**: every ranked hotel must be bookable, and each row must carry the hotel code so the client can deep-link into search.

We also filled the empty table with information a seller can act on (§3.4).

### 3.4 What we put in the empty space

The table was five columns on a full-width screen, mostly whitespace. We added:

| Column | Why it earns its place |
|--------|------------------------|
| **MoM** (`▲3` / `▼2` / `NEW`) | The single most informative thing in any ranking — what is rising and what is fading. Requires last month's rank from the API. |
| **Hotel Code** | The 6-digit code sellers paste straight into search — the most directly actionable field on the row |
| **Nightly from** | An indicative 1-night rate, so a seller can scan the ranking for something in their client's budget. **Labelled as indicative** — real rates depend on dates, occupancy, and rate plan |
| **Chain Brand** | Corporate clients have chain preferences; it is also already a filter dimension in Create Booking |

We considered and **rejected a Property Type column**: 112 of our 114 hotels are plain `Hotel`, so it would have added width without information. Worth reconsidering if production data is richer.

### 3.5 Demo data

To make the dashboard meaningful we generated **200 bookings** on the prototype: booking dates 2026-05-01 → today (never future-dated), check-in always after the booking date, 9.5% cancellation rate. Hotels are drawn from our hotel database (15 cities / 114 real properties); the 200 bookings land on 63 of them across 14 cities, weighted toward Japan and toward business hotels — matching how the demo seller (ATTIC TOURS, a Japanese agency) actually books.

Amounts are **not invented** — each booking's total is derived from the actual hotel's nightly rate in our hotel database (× nights × rooms), converted to yen. So dashboard revenue and the hotel search quote the same underlying rates.

## 4. Deviations from Your Dashboard Spec (7)

Full detail and reasoning in [dev-spec §5](dev-spec-en.md#5-deviations-from-the-pd-dashboard-spec-7). Summary:

| # | Deviation | Reason |
|---|-----------|--------|
| ① | Currency **JPY**, not USD | The clone seller and all hotel rates are in yen — USD figures would tie to nothing on screen |
| ② | Periods computed **from today** | Your mock data was pinned to 2026-03, so "This Month" pointed at the past |
| ③ | **Deterministic** data (no `Math.random`) | Charts re-randomized on every reload — QA and demos were not reproducible |
| ④ | **Supplier column removed** from Bestselling | Internal supply-channel info that should not be exposed to sellers. **Worth noting: your spec listed it as a column in the Bestselling section (§3-6 then, §3-5 now), but your prototype code never renders it** — removing it actually matches your own implementation. |
| ⑤ | **OP Points card removed** | Oppy Point is not built yet (it is a planned H2 initiative). A dashboard must not show a balance for a feature that does not exist. |
| ⑥ | **Static mock → derived from bookings** | Per business instruction the dashboard must match actual bookings (§3.2) |
| ⑦ | **Bestselling ranking rebuilt; 5 → 9 columns; hotel name clickable** | The click-through only works if the ranking contains bookable hotels — the original mock had 1 of 320 in our inventory (§3.3). Columns added so a full-width table carries information a seller can act on (§3.4) |

**All seven are reflected in your spec document** — we edited `Dashboard_Specification_2026-07-17_KR.md` directly: §3-2 · §3-5 · §8.1 (new) · §10 · §11 · §12.1 (change log) · **§13 (new — open decisions; your document had no place to record what needs an answer)**. Please confirm you are comfortable with those edits.

## 5. The One Honest Limitation

Our prototype's bookings start **2026-05-01**, so anything needing longer history is thin:

| Surface | State |
|---------|-------|
| Overview · Cancellation · Daily | Fully populated |
| 12-Month TTV | 3 of 12 months |
| Booking Statistics (6 months) | 3 of 6 months |
| **Year-End (3-year)** | **2024 and 2025 entirely empty** |

**We chose not to fabricate history to fill this in.** Inventing 2024–2025 bookings would break the exact property this round was built for — that the dashboard matches real bookings. The empty ranges are labelled on screen instead, with an explanatory banner on Year-End.

For **production this is likely a non-issue**: real sellers have real history. It is a prototype-data artifact. But it does raise a genuine question for new seller accounts — see §6-⑥.

## 6. Decisions Requested from PD

| # | Question | Our position |
|---|----------|--------------|
| ① | **Data scope** — does a seller's dashboard show only their own bookings, or aggregate sub-accounts? What does `Account Level` actually mean? | Blocks the API contract; the filter is display-only until answered |
| ② | **Bestselling ranking basis** — platform-wide, or the seller's own top hotels? | Built as platform-wide; needs its own data source either way |
| ③ | **Aggregation cadence** — realtime or nightly batch? | Decides whether a booking made 5 minutes ago appears |
| ④ | **Shared data source** with the DOTBIZ channel-growth metrics (v1 §5-5)? | Strongly recommend yes — two definitions of "bookings" will diverge |
| ⑤ | **Deferred Credit definition** — we implemented `Confirmed ∧ Unpaid` (booked on credit, unsettled) | Needs finance confirmation |
| ⑥ | **Year-End tab** — keep, drop, or defer? | Recommend **keep**; it fills in naturally with production history |
| ⑦ | **Account Level values in your spec** — §4 documents `Direct / DIDA / Hotelbeds`, but **both your code and ours use `All / Master / Sub-accounts`** | Spec contradicts both implementations, and those values are supplier names (same concern as ④). We left that line untouched — it is yours to resolve, and it depends on ① |

## 7. Production Readiness

The prototype aggregates client-side over `localStorage`. Two things must change for production, both detailed in [dev-spec §7](dev-spec-en.md#7-backend-requirements-production):

1. **Move aggregation server-side.** A seller with three years of bookings cannot ship the whole list to the browser. The derivation layer (`utils/dashboardStats.ts`) is deliberately a single pure module with no UI dependencies, so it ports directly.
2. **Capture `cancel_reason` at cancellation.** The Cancellation tab has **no data source without it** — the current booking flow does not record a reason. This needs a picker at cancel time and a decision on historical cancellations.

Also: charts use Recharts (~350 kB). Fine for a prototype; the production dashboard route should be code-split.

## 8. Schedule

| Period | Milestone |
|--------|-----------|
| Jul (done) | Dashboard built & validated on the prototype · **this Proposal v2 delivered** |
| Aug | §6 decisions incorporated → dashboard spec finalized alongside the v1 initiatives → **planning wrap-up** |
| After | Implementation and rollout scheduled with the PD team and DOTBIZ platform engineering |

— This proposal reflects what has been validated on the prototype. Production rollout requires separate alignment with the DOTBIZ platform engineering team.
