/*
 * Sign-up Onboarding Emails — Functional Specification v1.0 (2026-11-19) for Tracy (PD team).
 * Korean plan: docs/plan/feature-agency-signup-onboarding.md. Helpers copied from make_landing_hotel_ads_spec.js.
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

const DEMO = 'https://bstars00-rgb.github.io/B2B-System/';

// ───────────── Title block ─────────────
push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'OHMYHOTEL · B2B Marketplace · Functional Specification', font: FONT, bold: true, size: 20, color: BRAND })] }));
push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Sign-up Onboarding Emails', font: FONT, bold: true, size: 44 })] }));
push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Automatic document request at sign-up and welcome email at activation', font: FONT, size: 24, color: GREY })] }));
push(rule());
push(new Paragraph({
  spacing: { after: 120 },
  children: [
    new TextRun({ text: 'Author: Aiden   ·   Version v1.0   ·   Prepared for: Tracy (PD team)', font: FONT, size: 19, color: GREY }),
    new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: 'margin', leader: PositionalTabLeader.NONE }), '2026-11-19'], font: FONT, size: 19, color: GREY }),
  ],
}));
push(kv([
  ['Document', 'Sign-up Onboarding Emails — Functional Specification'],
  ['Version / date', 'v1.0 · 2026-11-19'],
  ['Prepared for', 'Tracy — PD (Product Development) team'],
  ['Status', 'New enhancement. A working prototype is live (see Live demo). Items marked **Proposed** are not yet decided (§12).'],
  ['Background', 'On 2026-11-19 an agency signed up on ohmyhotel.biz by itself. Global Sales opened the account, wrote the welcome email, attached the user manual and asked for the business registration certificate, all by hand.'],
  ['Live demo', `${DEMO} → Create Account (sign-up) · ${DEMO}?ellis=signups (GSM screen in ELLIS). Walkthrough in Appendix A.`],
]));
push(spacer());
push(h2('Revision history'));
push(table([{ h: 'Version', w: 1000, boldCol: true }, { h: 'Date', w: 1300 }, { h: 'Author', w: 1000 }, { h: 'Changes', w: TW - 3300 }], [
  ['v1.0', '2026-11-19', 'Aiden', 'Initial version.'],
]));

push(h2('Summary'));
push(body('When an agency finishes sign-up on ohmyhotel.biz, ELLIS sends **email ①** at once: application received, please send your business registration certificate, with a personal upload link. When the document arrives, the assigned GSM checks it and changes the account to **Active**. That change sends **email ②**: the account is open, with the login, payment terms and the **user manual attached**. GSM work is reduced to checking the document and clicking Approve or Reject.'));
push(callout('**Order change (Proposed).** Today the account is opened first and the certificate is requested afterwards. With this feature the certificate comes first and the account is opened after the GSM has checked it. An exception ("receive document later") stays available with a reason.'));

// ───────────── 1. Current process ─────────────
push(h1('1. Current process'));
push(table([{ h: 'Step', w: 1900, boldCol: true }, { h: 'Today', w: 4800 }, { h: 'Who', w: TW - 6700 }], [
  ['Sign-up', 'ohmyhotel.biz/join, 4 steps: Agree to terms → Corporation Info → Administrator registration → Completed', 'Agency'],
  ['New sign-up notice', 'None. GSM finds new accounts in ELLIS', 'GSM'],
  ['Open the account', 'Change the trade status in ELLIS', 'GSM'],
  ['Welcome email', 'Written by hand: account open, prepaid payment, manual PDF attached, please send the certificate', 'GSM'],
  ['Certificate', 'Received as an email reply', 'Agency → GSM'],
]));
push(muted('Sign-up step 2 collects company name, type, country, zip code, address, phone, representative name, email, phone and fax, and the Corporation Registration No. (with a duplicate check). Step 3 collects the administrator\'s name, ID, password, department, position, email and mobile. There is no file upload in the sign-up flow.'));

// ───────────── 2. New flow ─────────────
push(h1('2. New flow'));
push(table([{ h: '#', w: 500 }, { h: 'Trigger', w: 3000, boldCol: true }, { h: 'System action', w: TW - 3500 }], [
  ['1', 'Agency completes sign-up', 'Status "Application received". Send **email ①** (document request + upload link). Notify the assigned GSM: new sign-up.'],
  ['2', 'Agency uploads the document (or replies by email and the GSM attaches it)', 'Status "Document received". Notify the GSM.'],
  ['3', 'GSM approves', 'Trade Status → **Active**. Save payment terms. Apply the Dotbiz Market trader (300427) rules. Send **email ②** with the manual attached.'],
  ['3\'', 'GSM rejects', 'Status "Rejected". Send **email ③** (please resubmit, with the reason). New upload link.'],
  ['4', 'No document', 'Reminder email on D+3 and D+7, GSM notice on D+14, status "Expired" on D+30 (all Proposed values).'],
]));
push(bullet('Until the account is Active, sign-in is refused with: "We are reviewing your application. Please upload your business registration certificate with the link we emailed you."'));

// ───────────── 3. Statuses ─────────────
push(h1('3. Statuses'));
push(table([{ h: 'Status', w: 2200, boldCol: true }, { h: 'Meaning', w: 2700 }, { h: 'Entered when', w: 2200 }, { h: 'Email', w: TW - 7100 }], [
  ['Application received', 'Signed up, waiting for the document', 'Sign-up completed', '①'],
  ['Document received', 'Document in, waiting for GSM check', 'Upload, or GSM attaches an emailed file', 'none (GSM notice)'],
  ['Active', 'Can sign in and book', 'GSM approves', '②'],
  ['Rejected', 'Document not acceptable', 'GSM rejects', '③'],
  ['Expired', 'No document within 30 days', 'Automatic', 'none (GSM notice)'],
]));
push(muted('To check with ELLIS: how these map to the existing Trade Status values (for example Pending / Active). If new Trade Status values are hard to add, keep Pending / Active and store "document received / rejected / expired" in a separate field.'));

// ───────────── 4. Emails ─────────────
push(h1('4. Automatic emails'));
push(h2('4.1 Common rules'));
push(table([{ h: 'Item', w: 2300, boldCol: true }, { h: 'Rule', w: TW - 2300 }], [
  ['From', 'One Marketplace sender address (**Proposed**: sales@ohmyhotel.com). Not a no-reply address, because agencies reply with their documents.'],
  ['Reply-To / Cc', 'The assigned GSM, chosen automatically from a country → GSM table.'],
  ['To', 'The administrator email from sign-up, plus the representative email if different.'],
  ['Language', 'The portal language used at sign-up (EN, KO, JA, ZH, VI). Falls back to English when a template is missing.'],
  ['Templates', 'Editable per language in ELLIS without a deploy. Variables: {company}, {contact name}, {admin ID}, {registration no.}, {upload link}, {link expiry}, {GSM}, {payment terms}.'],
  ['Log', 'Each email is logged on the company record: type, language, recipients, time, sent / bounced.'],
  ['Bounce', 'Notify the GSM; the GSM can correct the address and resend.'],
  ['Never in emails', 'Passwords. The administrator sets the password at sign-up.'],
]));
push(h2('4.2 Email ① Application received, document request (at sign-up)'));
push(table([{ h: 'Part', w: 1800, boldCol: true }, { h: 'English template (Korean version in the prototype)', w: TW - 1800 }], [
  ['Subject', '[OHMYHOTEL Marketplace] We received your application. Please send your business registration certificate'],
  ['Body', [
    'Hello {contact name},',
    'Thank you for applying to the OHMYHOTEL Marketplace.',
    'We have received the application for {company}. To open the account, we need a copy of your business registration certificate. Please upload it with the button below, or reply to this email with the file attached.',
    '[Upload your document] (link valid until {link expiry})',
    'Once we have checked it, we will open the account and send you a welcome email.',
    'Application details: Company {company} · Business registration No. {registration no.} · Admin ID {admin ID}',
    'Contact: {GSM}',
  ]],
  ['Overseas', 'For agencies outside Korea: "business registration certificate (or the equivalent document of your country)".'],
]));
push(h2('4.3 Email ② Account open (when the account becomes Active)'));
push(table([{ h: 'Part', w: 1800, boldCol: true }, { h: 'English template', w: TW - 1800 }], [
  ['Subject', '[OHMYHOTEL Marketplace] Your account is open'],
  ['Body', [
    'Hello {contact name},',
    'We have checked your document and the account for {company} is now open. You can sign in right away.',
    'Sign in: https://ohmyhotel.biz/login · ID: {admin ID}',
    'Payment: {payment terms}',
    'Staff accounts: after signing in, add them in Member list > Staff list.',
    'The user manual is attached.',
    'Account manager: {GSM}',
  ]],
  ['Payment terms', 'Prepaid (default for new agencies): "Prepaid. Please pay by card or bank transfer before the cancellation deadline." Postpaid (contracted agencies, chosen by the GSM at approval): "Postpaid. Your account manager will confirm the billing terms."'],
  ['Attachment', 'User manual PDF in the email language: Korean "B2B 파트너스 매뉴얼.pdf", English "B2B Partner Manual_EN.pdf". Stored in ELLIS with a version; other languages use English until translated.'],
  ['Exception', 'If the GSM opened the account with "receive document later", add: "Please reply to this email with a copy of your business registration certificate."'],
]));
push(h2('4.4 Email ③ Please resubmit (when the GSM rejects)'));
push(table([{ h: 'Part', w: 1800, boldCol: true }, { h: 'English template', w: TW - 1800 }], [
  ['Subject', '[OHMYHOTEL Marketplace] Please send your document again'],
  ['Body', 'We could not verify the document sent for {company}. Reason: {reason}. Please upload it again with the button below. [Upload your document]'],
  ['Reasons', 'Picked from a list, plus an optional note: blurry or hard to read · belongs to a different company · registration number does not match · other.'],
]));
push(h2('4.5 Reminders and expiry (Proposed values)'));
push(table([{ h: 'When', w: 1800, boldCol: true }, { h: 'Action', w: TW - 1800 }], [
  ['D+3, D+7', 'Reminder email with a new upload link: "We have not received your document yet."'],
  ['D+14', 'GSM notice only, to decide whether to contact the agency directly.'],
  ['D+30', 'Status Expired, GSM notice. If the agency uploads later through a valid link, the status returns to Document received.'],
]));
push(muted('Reminders and expiry apply only while the status is Application received or Rejected.'));

// ───────────── 5. Upload link ─────────────
push(h1('5. Document upload'));
push(table([{ h: 'Item', w: 2300, boldCol: true }, { h: 'Rule', w: TW - 2300 }], [
  ['Link', 'Personal link for one company, opens without sign-in, valid for 14 days from the latest email that carried it.'],
  ['Files', 'PDF, JPG or PNG · up to 10 MB each · up to 3 files.'],
  ['Storage', 'Attached to the company record (Company Master) in ELLIS. Visible to GSM and finance only.'],
  ['Emailed documents', 'If the agency replies by email, the GSM attaches the file in ELLIS and the status changes to Document received. Reading attachments from the mailbox automatically is a later phase.'],
  ['Check', 'The GSM confirms that the company name and registration number match the sign-up data. A mismatch is a rejection reason.'],
  ['Personal data', 'Certificates of sole proprietors contain personal data of the owner. Restrict access and keep files only for the legal retention period after the business relationship ends.'],
  ['After expiry / Active', 'The link shows "This link has expired" or "Your account is already open".'],
]));
push(muted('Alternative (Proposed for a later phase): add a file upload to sign-up step 2. Agencies that upload during sign-up go straight to Document received, and email ① is sent only to those who skip it.'));

// ───────────── 6. ELLIS ─────────────
push(h1('6. ELLIS — GSM screen'));
push(table([{ h: 'Function', w: 2300, boldCol: true }, { h: 'Content', w: TW - 2300 }], [
  ['New sign-up list', 'Company, country, sign-up date, status, documents, assigned GSM, days since sign-up. Filter by status.'],
  ['Company detail', 'Company and administrator data, document list with preview, email log, event history.'],
  ['Approve', 'Choose payment terms (prepaid default / postpaid). Option "receive document later" with a required reason. Approve is enabled only when a document has been received, or with that option.'],
  ['Reject', 'Reason from the list plus an optional note. Sends email ③.'],
  ['Attach emailed document', 'Upload a file received by email; sets Document received.'],
  ['Notices', 'To the assigned GSM by email: new sign-up · document received · D+14 without document · expired · email bounced. Teams in a later phase.'],
  ['GSM table', 'Country → GSM. Countries not in the table go to a shared Global Sales owner.'],
  ['Screen language', 'Korean and English (switch in the header). Status names, notices and the event history follow the switch; email subjects and bodies stay in the language they were sent in.'],
]));

// ───────────── 7. Activation ─────────────
push(h1('7. What happens at activation'));
push(bullet('**Apply the Dotbiz Market trader (300427) rules at once.** Today a new agency receives the trader\'s Include / Exclude rules only at the next save of the trader (known issue in the Market Only Rates guide). Without this, Market Only rates are not visible to newly activated agencies. Please combine this with the planned fix.'));
push(bullet('Save the payment terms.'));
push(bullet('Send email ②.'));
push(bullet('Allow sign-in.'));

// ───────────── 8. Edge cases ─────────────
push(h1('8. Edge cases'));
push(table([{ h: 'Case', w: 3300, boldCol: true }, { h: 'Handling', w: TW - 3300 }], [
  ['Same registration number again', 'Blocked by the duplicate check at sign-up (as today). No email.'],
  ['Wrong file', 'Reject → email ③.'],
  ['Wrong or bouncing admin email', 'GSM notice; correct the address and resend.'],
  ['GSM must open before the document', '"Receive document later" with a reason; email ② asks for the document.'],
  ['Portal accounts of API-connected companies', 'Not in scope (created by the GSM).'],
  ['Agency signs in before Active', 'Refused with the review message (§2).'],
]));

// ───────────── 9. Data ─────────────
push(h1('9. Data (proposed)'));
push(table([{ h: 'Field', w: 2500, boldCol: true }, { h: 'Type', w: 2200 }, { h: 'Meaning', w: TW - 4700 }], [
  ['onboardingStatus', 'received | doc_received | active | rejected | expired', 'See §3 (or map to Trade Status)'],
  ['assignedGsm', 'user', 'From the country → GSM table'],
  ['emailLanguage', 'EN | KO | JA | ZH | VI', 'Portal language at sign-up'],
  ['uploadToken / tokenIssuedAt', 'string / date-time', 'Personal link, 14-day validity'],
  ['documents', 'file[] (name, size, type, uploadedAt, via upload | GSM)', 'Business registration certificate'],
  ['paymentTerms', 'prepaid | postpaid', 'Set at approval'],
  ['docsLaterReason', 'text (optional)', 'Exception at approval'],
  ['rejectReason', 'code + note', 'Email ③'],
  ['emailLog', '[type, language, to, cc, sentAt, result]', '§4.1'],
  ['events', '[time, actor, text]', 'Audit history'],
]));

// ───────────── 10. Acceptance ─────────────
push(h1('10. Acceptance criteria'));
[
  'Completing sign-up sends email ① in the sign-up language within 1 minute, and notifies the assigned GSM.',
  'The upload link opens without sign-in, accepts PDF / JPG / PNG up to 10 MB (max 3 files) and sets Document received.',
  'A pending, rejected or expired account cannot sign in and sees the review message.',
  'Approve is possible only after a document is received, unless "receive document later" with a reason is chosen.',
  'Approval sets Active, saves payment terms, applies the 300427 rules and sends email ② with the manual in the right language attached.',
  'Rejection sends email ③ with the chosen reason and a new link.',
  'Reminders on D+3 and D+7, GSM notice on D+14, expiry on D+30 (or the decided values).',
  'Every email and status change is logged on the company record.',
  'Email templates and the manual file can be changed in ELLIS without a deploy.',
].forEach((t) => push(check(t)));

// ───────────── 11. Measures ─────────────
push(h1('11. Measures'));
push(table([{ h: 'Measure', w: 2600, boldCol: true }, { h: 'Definition', w: TW - 2600 }], [
  ['Sign-up to Active', 'Time from sign-up to activation'],
  ['Document return rate', 'Share of sign-ups that send a document within 30 days'],
  ['Manual GSM emails', 'Emails written by hand per sign-up (target 0)'],
  ['First booking', 'Days from Active to the first booking'],
]));

// ───────────── 12. Open items ─────────────
push(h1('12. Open items (to be decided by Aiden)'));
push(table([{ h: '#', w: 500 }, { h: 'Item', w: 3300, boldCol: true }, { h: 'Proposal', w: TW - 3800 }], [
  ['1', 'Order: document first, then open', 'Yes, with the "receive document later" exception'],
  ['2', 'How to receive documents', 'Upload link in email ① first; upload field in sign-up step 2 later'],
  ['3', 'Sender address', 'sales@ohmyhotel.com, Reply-To the assigned GSM'],
  ['4', 'Country → GSM table', 'List of owners per country needed'],
  ['5', 'Reminder and expiry days', 'D+3, D+7, D+14 notice, D+30 expiry'],
  ['6', 'Manual languages', 'Korean PDF and English exist; Japanese, Chinese, Vietnamese fall back to English or are translated'],
  ['7', 'Automatic approval', 'No. Marketplace rates are visible only to registered agencies, so a person checks once'],
  ['8', 'Phase', 'To be assigned'],
]));
push(h2('Questions for ELLIS'));
[
  'Current Trade Status values for new sign-ups and whether new values can be added (§3).',
  'Whether ELLIS can send templated emails with attachments today, and from which address.',
  'Where company documents are stored (Company Master attachments) and who can see them.',
  'Schedule of the fix that applies the 300427 trader rules to new agencies (§7).',
].forEach((t) => push(bullet(t)));

// ───────────── Appendix ─────────────
push(h1('Appendix A — Prototype walkthrough'));
push(muted('The prototype stores data only in your browser and does not send real emails. Use test values, not real company data.'));
push(table([{ h: 'Step', w: 600 }, { h: 'Where', w: 3200 }, { h: 'What to check', w: TW - 3800 }], [
  ['1', `${DEMO} → Create Account`, 'The 4 sign-up steps, including the registration number duplicate check.'],
  ['2', 'Completed screen → "view the email"', 'Email ① with the upload button, in the portal language (EN or KO).'],
  ['3', 'Log in with the new admin ID', 'Sign-in is refused with the review message.'],
  ['4', 'Completed screen → open the upload link', 'Upload a PDF, JPG or PNG; status becomes Document received.'],
  ['5', `${DEMO}?ellis=signups`, 'New sign-up list, GSM notices, document list, email log and event history. KO / EN switch at the top right.'],
  ['6', 'Approve', 'Email ② with the manual attached; event "300427 rules applied"; sign-in now works.'],
  ['7', 'Sample "Lotus Lane Tours" → Reject', 'Email ③ in English with the reason.'],
  ['8', 'Sample "Blue Harbor Travel" → +3 / +7 / +30 days', 'Reminders, D+14 notice and expiry.'],
  ['9', '"Reset demo" (top right)', 'Back to the two sample applications.'],
]));
push(h1('Appendix B — Code references'));
push(table([{ h: 'File (prototype/src/…)', w: 3300 }, { h: 'Content', w: TW - 3300 }], [
  ['components/SignupWizard.tsx', 'Sign-up, 4 steps (same fields as ohmyhotel.biz/join)'],
  ['components/SignupDocUpload.tsx', 'Upload page opened from the email link'],
  ['components/EllisSignupAdmin.tsx', 'GSM screen: list, approve / reject, email log, events, notices, time simulation'],
  ['components/SignupMail.tsx', 'Email preview'],
  ['mocks/signupStore.ts', 'Statuses, email templates (EN / KO), reminders and expiry, country → GSM'],
  ['components/LoginPage.tsx', 'Create Account entry and the sign-in block before Active'],
]));
push(new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: '— Aiden', font: FONT, bold: true, color: GREY })] }));

// ───────────── Document ─────────────
const footer = new Footer({ children: [new Paragraph({ children: [
  new TextRun({ text: 'Sign-up Onboarding Emails — Functional Specification v1.0 · 2026-11-19', font: FONT, size: 16, color: GREY }),
  new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: 'margin', leader: PositionalTabLeader.NONE }), 'Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY }),
] })] });

const doc = new Document({
  creator: 'Aiden',
  title: 'Sign-up Onboarding Emails — Functional Specification',
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

const out = process.argv[2] || 'C:/Users/LENOVO/Downloads/Signup_Onboarding_Emails_Spec_EN_v1.0_20261119.docx';
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
