/*
 * Landing Page Hotel Ads — Functional Specification v1.0 (2026-11-09) for Tracy (PD team).
 * Replaces F-1.1 Billboard of Handoff v1 (2026-07-17). Decision: Aiden 2026-11-09.
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, Footer, PageNumber,
  PositionalTab, PositionalTabAlignment, PositionalTabLeader,
} = require('docx');

const FONT = 'Arial';
const BRAND = 'C2410C';
const GREY = '666666';
const TW = 9026; // A4 text width (DXA)

// **bold** inline parsing
const runs = (text, base = {}) => {
  const out = [];
  String(text).split(/(\*\*[^*]+\*\*)/).forEach((seg) => {
    if (!seg) return;
    const bold = seg.startsWith('**') && seg.endsWith('**');
    out.push(new TextRun({ text: bold ? seg.slice(2, -2) : seg, bold: bold || base.bold, font: FONT, size: base.size || 21, color: base.color }));
  });
  return out;
};
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] });
const body = (t) => new Paragraph({ spacing: { after: 120, line: 288 }, children: runs(t) });
const muted = (t) => new Paragraph({ spacing: { after: 120 }, children: runs(t, { size: 18, color: GREY }) });
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60, line: 276 }, children: runs(t) });
const check = (t) => new Paragraph({ spacing: { after: 60 }, indent: { left: 360, hanging: 300 }, children: [new TextRun({ text: '\u2610  ', font: FONT, size: 21 }), ...runs(t)] });
const spacer = () => new Paragraph({ spacing: { after: 60 }, children: [] });
const rule = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND, space: 4 } }, spacing: { after: 160 }, children: [] });
const tableGap = () => new Paragraph({ spacing: { after: 80 }, children: [] });

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'D0D0D0' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cell = (content, w, opts = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  borders,
  shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
  margins: { top: 80, bottom: 80, left: 110, right: 110 },
  children: (Array.isArray(content) ? content : [content]).map((c) => new Paragraph({
    spacing: { after: 40, line: 264 },
    children: runs(c, { size: opts.size || 19, bold: opts.bold, color: opts.color }),
  })),
});
const table = (cols, rows) => new Table({
  width: { size: TW, type: WidthType.DXA },
  columnWidths: cols.map((c) => c.w),
  rows: [
    new TableRow({ tableHeader: true, children: cols.map((c) => cell(c.h, c.w, { fill: '2B2B2B', bold: true, color: 'FFFFFF' })) }),
    ...rows.map((r, i) => new TableRow({ children: r.map((v, j) => cell(v, cols[j].w, { fill: i % 2 ? 'F6F6F6' : undefined, bold: cols[j].boldCol })) })),
  ],
});
const kv = (pairs) => new Table({
  width: { size: TW, type: WidthType.DXA },
  columnWidths: [2300, TW - 2300],
  rows: pairs.map(([k, v]) => new TableRow({ children: [cell(k, 2300, { fill: 'F1EDE8', bold: true }), cell(v, TW - 2300)] })),
});
const callout = (t) => new Table({
  width: { size: TW, type: WidthType.DXA },
  columnWidths: [TW],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: TW, type: WidthType.DXA },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'F3D6C4' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'F3D6C4' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'F3D6C4' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'F3D6C4' } },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFF4EC' },
    margins: { top: 140, bottom: 140, left: 180, right: 180 },
    children: [new Paragraph({ spacing: { line: 288 }, children: runs(t) })],
  })] })],
});

const C = [];
const push = (...xs) => xs.forEach((x) => { C.push(x); if (x instanceof Table) C.push(tableGap()); });

// ───────────── Title block ─────────────
push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'OHMYHOTEL · B2B Marketplace · Functional Specification', font: FONT, bold: true, size: 20, color: BRAND })] }));
push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Landing Page Hotel Ads', font: FONT, bold: true, size: 44 })] }));
push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Scroll-based interactive animation: rooms first, hotel exterior last', font: FONT, size: 24, color: GREY })] }));
push(rule());
push(new Paragraph({
  spacing: { after: 120 },
  children: [
    new TextRun({ text: 'Author: Aiden   ·   Version v1.0   ·   Prepared for: Tracy (PD team)', font: FONT, size: 19, color: GREY }),
    new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: 'margin', leader: PositionalTabLeader.NONE }), '2026-11-09'], font: FONT, size: 19, color: GREY }),
  ],
}));
push(kv([
  ['Document', 'Landing Page Hotel Ads — Functional Specification'],
  ['Version / date', 'v1.0 · 2026-11-09'],
  ['Replaces', '**F-1.1 Billboard** in Handoff v1 (Gateway / Login renewal, sent 2026-07-17). F-1.2 Sign-in panel and F-1.3 Legal documents are unchanged.'],
  ['Prepared for', 'Tracy — PD (Product Development) team'],
  ['Status', 'New enhancement. A working prototype is live: one hotel ad with real hotel photos (each photo assembles in horizontal strips as you scroll) and two illustrated samples; see Live demo.'],
  ['Live demo', 'https://bstars00-rgb.github.io/B2B-System/?ad=grand-fresa-namba (real photos: Sotetsu Grand Fresa Osaka-Namba — double, twin, deluxe twin (triple), breakfast, lobby, exterior) · ?ad=ginza and ?ad=uehonmachi (illustrated samples; Uehonmachi shows the Market Only tag) · ?ad=brand (brand campaign). Open it signed out (or log out first) and scroll the page. The "Next ad (prototype)" button switches samples; it is a review tool, not part of the product.'],
  ['Decision', 'Aiden, 2026-11-09: the landing page will mostly carry hotel ads, and each hotel ad is a scroll-based interactive animation that shows the rooms and ends on the hotel exterior.'],
  ['Reference', 'A design reel by NoirPixel Agency (concept website "LOOP"): scrolling builds the product layer by layer. Aiden shares the reel link together with this document.'],
]));
push(spacer());
push(h2('Revision history'));
push(table([{ h: 'Version', w: 1000, boldCol: true }, { h: 'Date', w: 1300 }, { h: 'Author', w: 1000 }, { h: 'Changes', w: TW - 3300 }], [
  ['v1.0', '2026-11-09', 'Aiden', 'Initial version. Replaces F-1.1 Billboard of Handoff v1.'],
]));

push(h2('Summary'));
push(body('The Marketplace landing page (the ohmyhotel.biz sign-in page) becomes an advertising space for hotels. **Most ad slots go to hotels**; a few stay for OMH brand campaigns. A hotel ad is a **scroll-based interactive animation**: while the visitor scrolls, the ad moves through the hotel\'s rooms one scene at a time and **finishes on the hotel exterior** with a call to action. The sign-in panel stays where it is, so agents can sign in at any point.'));
push(callout('**Three rules.** (1) The scroll drives the story; the page never takes over the scroll. (2) Rooms first, exterior last: every hotel ad ends on the exterior. (3) No prices or price claims in the ad: rates are shown only after sign-in.'));

push(h2('What changes from Handoff v1 (F-1.1)'));
push(table([{ h: 'Item', w: 1900, boldCol: true }, { h: 'Handoff v1 (2026-07-17)', w: 3200 }, { h: 'This specification', w: TW - 5100 }], [
  ['Content', 'Three OMH brand campaigns (text only)', 'Mostly hotel ads; brand campaigns stay as a minority'],
  ['Motion', 'Auto-rotation every 8 s with dots', 'Scroll-linked scenes inside one ad; no timed rotation'],
  ['Choice of ad', 'Fixed list in rotation', 'One live campaign per visit, chosen by weight, not the same one twice in a row'],
  ['Below 1024 px', 'Billboard hidden', 'Simplified ad below the sign-in panel'],
  ['Management', 'Editable without a deploy', 'Same, plus scenes, schedule, approval and reporting in ELLIS'],
  ['Measurement', 'None', 'Impressions, scroll depth, CTA, sign-in and booking attribution'],
]));

// ───────────── 1. Goals ─────────────
push(h1('1. Goals and measures'));
push(bullet('Give partner hotels a visible place in front of every agency that signs in.'));
push(bullet('Turn the landing page into a sales surface that supports hotel sales, for example for hotels that provide Market Only rates.'));
push(bullet('Lead agents from the ad to the hotel\'s rooms and rates right after sign-in.'));
push(spacer());
push(table([{ h: 'Measure', w: 2300, boldCol: true }, { h: 'Definition', w: TW - 2300 }], [
  ['Impressions', 'Ad stage at least 50% visible for 1 second'],
  ['Scroll depth', 'Share of impressions that reach each scene. **Completion** = the exterior scene is reached'],
  ['CTA click rate', 'CTA clicks ÷ completions'],
  ['Sign-in after CTA', 'Sign-ins within 30 minutes after a CTA click'],
  ['Hotel opens', 'The advertised hotel is opened in Create Booking or the room list after sign-in'],
  ['Bookings', 'Bookings of the advertised hotel by the same user within 7 days of a CTA click (window configurable)'],
]));

// ───────────── 2. Concept ─────────────
push(h1('2. Concept'));
push(h2('2.1 Reference'));
push(body('In the reference video the page is one screen that stays in place while the visitor scrolls. Each scroll step adds one layer to the product, and with it the headline, the background colour and the progress dots change. A small "Read more" button stays visible the whole time. Scrolling back takes the layers off again.'));
push(h2('2.2 Our version: the layers are the rooms'));
push(body('Each scroll step shows the next room of the hotel. The last step pulls back to the **hotel exterior**, where the call to action appears.'));
push(table([{ h: 'Scene', w: 1500, boldCol: true }, { h: 'Content', w: 2300 }, { h: 'Text on screen', w: 2700 }, { h: 'Motion', w: TW - 6500 }], [
  ['1 · First room', 'First room photo (e.g., standard room)', 'Eyebrow "Featured hotel" · hotel name · city · star rating', 'Photo fades in with a slow push-in; text slides up'],
  ['2 · Room', 'Second room photo', 'Room name + one fact (size, beds, view)', 'Crossfade; background tone moves to the scene colour; text changes'],
  ['3 · Room', 'Third room photo (e.g., suite or family room)', 'Room name + one fact', 'Same as scene 2'],
  ['(optional) Facility', 'Lobby, breakfast or pool', 'Facility name + one fact', 'Same as scene 2'],
  ['Last · Exterior', 'Exterior photo (day or blue hour)', 'Hotel name or a location fact · CTA "View rooms & rates"', 'Image settles from 110% to 100% like a camera pulling back; CTA appears and the scene holds'],
]));
push(muted('Progress dots show one dot per scene; the current dot is filled. A compact CTA stays visible in every scene, like "Read more" in the reference; the full CTA appears on the exterior scene.'));

// ───────────── 3. Desktop ─────────────
push(h1('3. Desktop layout and behaviour (1024 px and wider)'));
push(h2('3.1 Layout'));
push(bullet('Left: the **ad stage** (full height, the width left of the panel). Right: the **sign-in panel**, 480 px, unchanged from F-1.2, always in view.'));
push(bullet('The ad stage is pinned (sticky) for the length of the story; the page scrolls underneath it.'));
push(h2('3.2 Scroll model'));
push(table([{ h: 'Item', w: 2300, boldCol: true }, { h: 'Rule', w: TW - 2300 }], [
  ['Scroll length', '100 vh per scene (configurable 80–120 vh). A 5-scene ad = 500 vh.'],
  ['Progress', 'p = scroll position inside the story ÷ story length (0–1). Current scene = floor(p × number of scenes). The progress inside the scene drives the transition.'],
  ['Transition', 'Image crossfade during the first 35% of the scene · image scale 1.08 → 1.00 across the scene · headline and sub-copy slide up 24 px and fade in · background tone moves to the scene colour.'],
  ['Reverse', 'Scrolling up plays every transition backwards.'],
  ['No scroll takeover', 'Native page scroll only. No wheel capture and no forced snapping. Mouse wheel, trackpad, keyboard (Page Down, Space, arrows) and the scrollbar all work as usual.'],
  ['Dots', 'Click a dot to smooth-scroll to that scene.'],
  ['After the story', 'A short "More featured hotels" strip with up to 3 other live hotel ads (photo, name, city). Clicking one loads that ad into the stage and scrolls to its first scene. Priority P2.'],
]));
push(h2('3.3 Call to action'));
push(table([{ h: 'Visitor', w: 2300, boldCol: true }, { h: 'CTA "View rooms & rates" does', w: TW - 2300 }], [
  ['Not signed in', 'Moves focus to the sign-in panel, highlights it and shows "Sign in to see rates for {hotel name}". After sign-in, the agent lands on **Create Booking with the hotel pre-filled** (dates empty).'],
  ['Already signed in', 'Opens Create Booking with the hotel pre-filled.'],
]));
push(h2('3.4 Which ad is shown'));
push(bullet('One live campaign per visit, chosen by **weight**. The chosen campaign stays for the whole visit (no timed rotation).'));
push(bullet('The campaign shown last on this browser is skipped, so returning agents see a different hotel.'));
push(bullet('Brand campaigns are in the same pool with their own weight. If no hotel campaign is live, a brand campaign is shown in the v1 design.'));

// ───────────── 4. Mobile ─────────────
push(h1('4. Mobile and tablet (below 1024 px)'));
push(bullet('The sign-in panel comes first, as today.'));
push(bullet('Below it, the same ad as a vertical list of scenes (image, headline, sub-copy). Each scene fades in when it enters the screen. No pinning and no scrubbing.'));
push(bullet('The CTA follows the exterior scene. Images use the mobile crop (4:5).'));

// ───────────── 5. Content rules ─────────────
push(h1('5. Content rules'));
push(table([{ h: 'Item', w: 2300, boldCol: true }, { h: 'Rule', w: TW - 2300 }], [
  ['Scenes', '3 to 6. At least **2 room scenes**. Facility scenes are optional. The **last scene must be the exterior**.'],
  ['Order', 'Rooms first, exterior last (fixed). The order of the rooms is the hotel\'s choice, for example from standard to suite.'],
  ['Text length', 'Headline up to 28 characters in English (14 in Korean, Japanese, Chinese). Sub-copy up to 80 characters. English is required; other portal languages are optional and fall back to English.'],
  ['Allowed', 'Facts from the hotel content: room size, bed type, view, capacity, location and access (for example minutes from a station).'],
  ['Not allowed', 'Prices, discounts, "lowest price", "best rate", rate comparisons and urgency claims (for example "only 2 rooms left"). Rates are visible only after sign-in.'],
  ['Market Only', 'If the hotel has an active Market Only rate (flag from ELLIS), the ad may show the "Market Only" tag. No other wording about price.'],
  ['Images', 'Desktop 2400 × 1500 px or larger (16:10); mobile crop 1080 × 1350 (4:5) set by a focal point. WebP or AVIF, up to 400 KB per desktop image, whole ad up to 3 MB. No text inside the image. Exterior in daylight or at blue hour.'],
  ['Rights', 'The hotel confirms that OMH may use the photos for advertising. Recorded on the campaign (who, when).'],
]));

// ───────────── 6. Formats ─────────────
push(h1('6. Formats'));
push(table([{ h: 'Format', w: 2000, boldCol: true }, { h: 'How it works', w: 4800 }, { h: 'Use', w: TW - 6800 }], [
  ['Photo story (default, first release)', 'Scenes are still photos. The motion comes from crossfade, slow zoom and text movement. Any hotel with 4–6 good photos can go live without a designer.', 'All hotel ads'],
  ['Video scrub (premium, later)', 'A short pre-rendered clip (5–8 s) plays frame by frame with the scroll: an image sequence of 90–150 WebP frames, or a video whose time follows the scroll. This gives the "building" effect of the reference, for example a camera moving through the rooms and out to the exterior. Clips can be made by the OMH content team or generated from hotel photos with an image-to-video tool.', 'Featured or paid campaigns'],
]));

// ───────────── 7. Data model ─────────────
push(h1('7. Data model (proposed)'));
push(h2('7.1 Campaign'));
push(table([{ h: 'Field', w: 2300, boldCol: true }, { h: 'Type', w: 2000 }, { h: 'Meaning', w: TW - 4300 }], [
  ['id', 'string', 'Campaign ID'],
  ['type', '"hotel" | "brand"', 'Hotel ad or OMH brand campaign'],
  ['status', 'draft | in_review | approved | live | paused | ended', 'Only approved campaigns can go live'],
  ['start / end', 'date-time + time zone', 'Run period'],
  ['weight', 'number 1–100', 'Share in the per-visit selection'],
  ['hotelCode', 'string', 'ELLIS hotel code. Hotel name, city and star rating are read from the hotel master'],
  ['format', '"photo" | "video"', 'See §6'],
  ['scenes', 'Scene[] (3–6)', 'See 7.2'],
  ['cta', 'label per language', 'Target = Create Booking with the hotel code'],
  ['languages', 'string[]', 'Languages with complete text'],
  ['targeting', 'optional', 'Visitor language or country'],
  ['sponsor', 'optional', 'Paid / partner / internal, contract reference'],
  ['imageRights', 'confirmed, date, by', 'See §5 Rights'],
  ['createdBy / approvedBy / approvedAt', 'user, date-time', 'Audit'],
]));
push(h2('7.2 Scene'));
push(table([{ h: 'Field', w: 2300, boldCol: true }, { h: 'Type', w: 2000 }, { h: 'Meaning', w: TW - 4300 }], [
  ['order', 'number', 'Position in the story'],
  ['kind', '"room" | "facility" | "exterior"', 'The last scene must be "exterior"'],
  ['roomTypeCode', 'string (optional)', 'ELLIS room type, for room scenes'],
  ['image', 'desktop URL, mobile URL, focalX, focalY (0–1), alt per language', 'See §5 Images'],
  ['headline / sub', 'text per language', 'See §5 Text length'],
  ['tone', 'hex colour', 'Background tone; sampled from the image, editable'],
  ['video', 'optional', 'For format "video": frame URL pattern and frame count, or clip URL'],
]));
push(muted('Validation: 3–6 scenes · at least 2 room scenes · last scene is the exterior · English headline and alt text on every scene · images within the size limits · status "live" only after approval. Brand campaigns keep the v1 LoginCampaign model (headline, subEn, subKo, chips) plus status, period and weight.'));

// ───────────── 8. ELLIS admin ─────────────
push(h1('8. ELLIS admin'));
push(table([{ h: 'Function', w: 2300, boldCol: true }, { h: 'Content', w: TW - 2300 }], [
  ['Campaign list', 'Filter by status, hotel and period. Columns: hotel, format, period, weight, status, impressions, completion rate, CTA clicks.'],
  ['Create / edit', 'Choose the hotel → pick photos from the hotel content (or upload) → order the scenes → write the text per language → set focal points → preview desktop and mobile (same renderer as live) → submit for approval.'],
  ['Approval', 'One approver (commercial or marketing). Edits after approval need approval again.'],
  ['Schedule', 'Start / end and weight. Pause and resume take effect at once.'],
  ['Report', 'The measures of §1 per campaign and per day; CSV export.'],
  ['Deploy', 'None of the above needs a deploy (same requirement as v1).'],
]));

// ───────────── 9. Tracking ─────────────
push(h1('9. Tracking events'));
push(table([{ h: 'Event', w: 2100, boldCol: true }, { h: 'When', w: 3700 }, { h: 'Key fields', w: TW - 5800 }], [
  ['ad_impression', 'Ad stage at least 50% visible for 1 s', 'campaignId, visitorId, language, device'],
  ['ad_scene_view', 'A scene becomes current (once per scene per visit)', 'campaignId, sceneIndex'],
  ['ad_complete', 'The exterior scene is reached', 'campaignId'],
  ['ad_cta_click', 'CTA clicked (compact or full)', 'campaignId, sceneIndex, signedIn'],
  ['ad_signin', 'Sign-in within 30 min after ad_cta_click', 'campaignId, userId, companyCode'],
  ['ad_hotel_open', 'The advertised hotel is opened in Create Booking or the room list', 'campaignId, userId'],
  ['Booking attribution', 'Booking of the advertised hotel by the user within 7 days of ad_cta_click', 'campaignId, bookingCode'],
]));
push(muted('Before sign-in, events use an anonymous visitor ID; after sign-in it is linked to the user.'));

// ───────────── 10. Performance & accessibility ─────────────
push(h1('10. Performance and accessibility'));
push(bullet('The sign-in panel loads first and can be used before any ad image has loaded.'));
push(bullet('Preload the first scene image, load the next two scenes ahead and the rest on demand.'));
push(bullet('Animate only transform and opacity; target 60 fps. Use CSS scroll-driven animations (animation-timeline) where supported, with a JavaScript fallback (scroll handler throttled with requestAnimationFrame, or a library such as GSAP ScrollTrigger).'));
push(bullet('Landing page LCP within 2.5 s on a 4G connection.'));
push(bullet('prefers-reduced-motion: no zoom or parallax; scenes change with a simple fade.'));
push(bullet('The ad stage is a labelled region; every image has alt text; the CTA is a real link or button reachable by keyboard; focus is never trapped.'));
push(bullet('Text over photos sits on a gradient scrim so contrast is at least 4.5:1. Dark mode does not change the ad.'));

// ───────────── 11. Acceptance ─────────────
push(h1('11. Acceptance criteria'));
[
  'Scrolling down moves through all scenes in order and ends on the exterior; scrolling up reverses.',
  'Mouse wheel, trackpad, keyboard and scrollbar all scroll the page normally; nothing captures the scroll.',
  'The sign-in panel stays visible and usable for the whole story.',
  'Signed out, the CTA focuses the sign-in panel with the hotel message; after sign-in, Create Booking opens with the hotel pre-filled.',
  'One campaign per visit, chosen by weight; the same campaign is not shown twice in a row on one browser.',
  'Below 1024 px the ad appears as a vertical list under the sign-in panel.',
  'A campaign with fewer than 3 scenes, fewer than 2 room scenes or without the exterior as the last scene cannot be approved.',
  'Prices and price claims cannot be saved in ad text (blocked-word check plus the approval step).',
  'prefers-reduced-motion is respected.',
  'All events in §9 are recorded and appear in the campaign report.',
].forEach((t) => push(check(t)));

// ───────────── 12. Open items ─────────────
push(h1('12. Open items'));
push(table([{ h: '#', w: 500 }, { h: 'Item', w: 3300, boldCol: true }, { h: 'Notes', w: TW - 3800 }], [
  ['1', 'Ad slots as a product', 'Paid placement, part of hotel partnerships (for example with Market Only rates), or both; pricing.'],
  ['2', 'Number of live hotel campaigns and default weights', 'Including the share kept for brand campaigns.'],
  ['3', 'Who prepares the assets', 'OMH content team, hotels through the Vendor Console content upload, or both.'],
  ['4', 'Video scrub format', 'In the first release or later.'],
  ['5', 'Targeting', 'By visitor language or country.'],
  ['6', 'Ads inside the portal', 'Reusing the same campaigns after sign-in (for example Dashboard or Create Booking); later.'],
  ['7', 'Phase', 'To be assigned by Aiden.'],
]));

// ───────────── Appendix ─────────────
push(h1('Appendix A — Example storyboard'));
push(muted('Fictional hotel, for illustration only.'));
push(table([{ h: 'Scene', w: 800 }, { h: 'Kind', w: 2300, boldCol: true }, { h: 'Headline (EN)', w: 2700 }, { h: 'Sub-copy (EN)', w: TW - 5800 }], [
  ['1', 'Room · Standard Double', 'Example Hotel Tokyo', 'Featured hotel · 3-star · Ginza, Tokyo'],
  ['2', 'Room · Twin', 'Room for two', '22 m² · two single beds · city view'],
  ['3', 'Room · Family', 'Room for the family', '32 m² · sleeps four'],
  ['4', 'Exterior', 'Two minutes from the station', 'Ginza Station, exit A3 · View rooms & rates'],
]));
push(h1('Appendix B — Code references'));
push(table([{ h: 'File (prototype/src/…)', w: 3300 }, { h: 'Content', w: TW - 3300 }], [
  ['components/LoginPage.tsx', 'Landing page: campaign selection per visit, hotel ad or brand billboard, sign-in panel (F-1.2), CTA notice'],
  ['components/HotelAdStory.tsx', 'Hotel ad: sticky stage, scroll progress, scene transitions, dots, CTA (desktop) and the vertical list (mobile)'],
  ['components/HotelAdArt.tsx', 'Sample scene illustrations (SVG) whose layers build with the scroll; replaced by photos in production'],
  ['mocks/hotelAdCampaigns.ts', 'Campaign and scene data (sample), weighted selection, CTA target, tracking events'],
  ['mocks/loginCampaigns.ts', 'Brand campaigns (v1 data model); still used when a brand campaign is selected'],
  ['components/CreateBookingPage.tsx', 'Hotel pre-fill used as the CTA target after sign-in'],
]));
push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: '— Aiden', font: FONT, bold: true, color: GREY })] }));

// ───────────── Document ─────────────
const footer = new Footer({ children: [new Paragraph({ children: [
  new TextRun({ text: 'Landing Page Hotel Ads — Functional Specification v1.0 · 2026-11-09', font: FONT, size: 16, color: GREY }),
  new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: 'margin', leader: PositionalTabLeader.NONE }), 'Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY }),
] })] });

const doc = new Document({
  creator: 'Aiden',
  title: 'Landing Page Hotel Ads — Functional Specification',
  description: 'Functional specification v1.0 for Tracy (PD team)',
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: BRAND }, paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true, color: '222222' }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1300, left: 1440, right: 1440 } } },
    footers: { default: footer },
    children: C,
  }],
});

const out = process.argv[2] || 'C:/Users/LENOVO/Downloads/Landing_Page_Hotel_Ads_Spec_EN_v1.0_20261109.docx';
// ZIP 폴더 항목 제거(클라우드 공동편집 호환) 후 저장
const JSZip = require('jszip');
Packer.toBuffer(doc).then(async (buf) => {
  const z = await JSZip.loadAsync(buf);
  const nz = new JSZip();
  for (const k of Object.keys(z.files)) {
    if (!z.files[k].dir) nz.file(k, await z.files[k].async('nodebuffer'), { createFolders: false });
  }
  const clean = await nz.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(out, clean); console.log('WROTE', out, clean.length, 'bytes');
});
