import { useEffect, useState } from 'react';
import { loadPortalLang } from '../utils/portalLang';

/**
 * 마켓플레이스 가입 자동 안내 메일 — 기획: docs/plan/feature-agency-signup-onboarding.md (2026-11-19).
 * 가입 → 메일 ① 사업자등록증 요청 → 서류 업로드 → GSM 승인(Active) → 메일 ② 오픈 안내 + 매뉴얼 첨부.
 * 반려 → 메일 ③ · 리마인드 D+3/D+7 · D+14 GSM 알림 · D+30 만료.
 * 프로토타입: 이 브라우저의 localStorage에만 저장하고, 메일은 실제로 보내지 않고 발송 이력에만 남긴다.
 * 시간 경과는 ELLIS 화면의 "+N일" 버튼으로 시뮬레이션한다. **프로토타입 · 폐기 가능.**
 */

export type SignupStatus = 'pending_docs' | 'docs_received' | 'active' | 'rejected' | 'expired';
export type MailKind = 'request' | 'reminder' | 'welcome' | 'resubmit';
export type MailLang = 'en' | 'ko';
export type PaymentTerm = 'prepaid' | 'postpaid';
export type RejectReason = 'blurry' | 'other_company' | 'mismatch' | 'other';

export interface SentMail {
  id: string;
  kind: MailKind;
  lang: MailLang;
  /** 가입 후 경과일 (시연 기준) */
  day: number;
  at: string;
  from: string;
  replyTo: string;
  to: string[];
  cc: string[];
  subject: string;
  /** '- '로 시작 = 목록, '[[BUTTON]]라벨' = 업로드 버튼 */
  body: string[];
  attachments: string[];
  link?: string;
}

export interface SignupDoc {
  name: string;
  size: number;
  type: string;
  day: number;
  via: 'upload' | 'gsm';
}

export interface SignupEvent {
  day: number;
  at: string;
  actor: 'system' | 'agency' | 'gsm';
  text: string;
}

export interface CompanyInfo {
  name: string;
  type: string;
  country: string;
  zip: string;
  address: string;
  phone: string;
  repName: string;
  repEmail: string;
  repPhone: string;
  repFax: string;
  regNo: string;
}

export interface AdminInfo {
  name: string;
  userId: string;
  dept: string;
  position: string;
  email: string;
  mobile: string;
}

export interface SignupApplication {
  id: string;
  token: string;
  createdAt: string;
  /** 시연용 경과일 */
  ageDays: number;
  /** 링크(메일 ①·리마인드·③)를 마지막으로 보낸 날 — 14일 유효 */
  linkIssuedDay: number;
  lang: MailLang;
  company: CompanyInfo;
  admin: AdminInfo;
  status: SignupStatus;
  gsm: string;
  paymentTerm?: PaymentTerm;
  docsLaterReason?: string;
  rejectReason?: string;
  docs: SignupDoc[];
  mails: SentMail[];
  events: SignupEvent[];
  alerts: { day: number; at: string; text: string }[];
  flags: { r3?: boolean; r7?: boolean; a14?: boolean };
  sample?: boolean;
}

export const SENDER = 'OHMYHOTEL Marketplace <sales@ohmyhotel.com>';
export const LINK_VALID_DAYS = 14;
export const EXPIRE_DAYS = 30;

export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'KR', name: 'Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'SG', name: 'Singapore' },
  { code: 'CN', name: 'China' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'OTHER', name: 'Other' },
];
export const CORP_TYPES = ['Travel Agency', 'OTA', 'Tour Operator / DMC', 'Corporate', 'Other'];

/** 국가 → 담당 GSM (배정표 확정 전 예시 — 팀 이름만) */
export function gsmFor(country: string): string {
  return ({ KR: 'Korea Sales', JP: 'Japan Sales', VN: 'Vietnam Sales' } as Record<string, string>)[country] ?? 'Global Sales';
}

export const REJECT_REASONS: Record<RejectReason, { ko: string; en: string }> = {
  blurry: { ko: '서류가 흐려 읽기 어렵습니다', en: 'The document is blurry and hard to read' },
  other_company: { ko: '다른 회사의 서류입니다', en: 'The document belongs to a different company' },
  mismatch: { ko: '사업자등록번호가 가입 정보와 다릅니다', en: 'The registration number does not match your application' },
  other: { ko: '기타', en: 'Other' },
};

const KEY = 'omh_signups_v1';
const EVENT = 'omh-signups';

const nowIso = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function uploadLinkOf(token: string): string {
  return `${window.location.origin}${window.location.pathname}?signup-upload=${token}`;
}
export function ellisLink(): string {
  return `${window.location.origin}${window.location.pathname}?ellis=signups`;
}

// ───────────── 메일 문안 (KO/EN, 다른 언어는 영어) ─────────────
const paymentText = (t: PaymentTerm, l: MailLang) =>
  t === 'prepaid'
    ? l === 'ko'
      ? '선불입니다. 취소 마감일 전에 카드 결제나 입금으로 진행해 주세요.'
      : 'Prepaid. Please pay by card or bank transfer before the cancellation deadline.'
    : l === 'ko'
      ? '후불입니다. 정산 조건은 담당자가 따로 안내합니다.'
      : 'Postpaid. Your account manager will confirm the billing terms.';

function docName(a: SignupApplication, l: MailLang) {
  const domestic = a.company.country === 'KR';
  if (l === 'ko') return domestic ? '사업자등록증' : '사업자등록증 또는 해당 국가의 사업자 등록 서류';
  return domestic ? 'business registration certificate' : 'business registration certificate (or the equivalent document of your country)';
}

export function buildMail(kind: MailKind, a: SignupApplication, extra: { reason?: string } = {}): SentMail {
  const l = a.lang;
  const ko = l === 'ko';
  const doc = docName(a, l);
  const until = addDays(a.createdAt, a.ageDays + LINK_VALID_DAYS);
  const hello = ko ? `안녕하세요, ${a.admin.name}님.` : `Hello ${a.admin.name},`;
  const sign = ko ? '오마이호텔 드림' : 'OHMYHOTEL';
  const contact = ko ? `문의: ${a.gsm}` : `Contact: ${a.gsm}`;
  const button = ko ? `[[BUTTON]]사업자등록증 올리기 (${until}까지)` : `[[BUTTON]]Upload your document (link valid until ${until})`;
  let subject = '';
  let body: string[] = [];
  let attachments: string[] = [];
  let link: string | undefined = uploadLinkOf(a.token);
  if (kind === 'request') {
    subject = ko
      ? '[오마이호텔 마켓플레이스] 가입 신청이 접수되었습니다. 사업자등록증을 보내 주세요'
      : '[OHMYHOTEL Marketplace] We received your application. Please send your business registration certificate';
    body = ko
      ? [hello, '오마이호텔 마켓플레이스에 가입 신청해 주셔서 감사합니다.', `${a.company.name}의 가입 신청이 접수되었습니다. 계정을 열려면 ${doc} 사본이 필요합니다. 아래 버튼으로 올려 주세요. 이 메일에 첨부해 회신하셔도 됩니다.`, button, '서류를 확인하면 계정을 열고 이용 안내 메일을 다시 보내 드립니다.', '신청 정보', `- 회사명: ${a.company.name}`, `- 사업자등록번호: ${a.company.regNo}`, `- 관리자 아이디: ${a.admin.userId}`, contact, sign]
      : [hello, 'Thank you for applying to the OHMYHOTEL Marketplace.', `We have received the application for ${a.company.name}. To open the account, we need a copy of your ${doc}. Please upload it with the button below, or reply to this email with the file attached.`, button, 'Once we have checked it, we will open the account and send you a welcome email.', 'Application details', `- Company: ${a.company.name}`, `- Business registration No.: ${a.company.regNo}`, `- Admin ID: ${a.admin.userId}`, contact, sign];
  } else if (kind === 'reminder') {
    subject = ko ? '[오마이호텔 마켓플레이스] 사업자등록증을 아직 받지 못했습니다' : '[OHMYHOTEL Marketplace] We have not received your document yet';
    body = ko
      ? [hello, `${a.company.name} 계정을 열려면 ${doc} 사본이 필요합니다. 아래 버튼으로 올려 주시거나 이 메일에 첨부해 회신해 주세요.`, button, contact, sign]
      : [hello, `To open the account for ${a.company.name}, we still need a copy of your ${doc}. Please upload it below or reply to this email with the file attached.`, button, contact, sign];
  } else if (kind === 'resubmit') {
    subject = ko ? '[오마이호텔 마켓플레이스] 사업자등록증을 다시 보내 주세요' : '[OHMYHOTEL Marketplace] Please send your document again';
    body = ko
      ? [hello, `${a.company.name}에서 보내 주신 서류로는 확인이 어렵습니다.`, `- 사유: ${extra.reason ?? ''}`, '아래 버튼으로 다시 올려 주세요.', button, contact, sign]
      : [hello, `We could not verify the document sent for ${a.company.name}.`, `- Reason: ${extra.reason ?? ''}`, 'Please upload it again with the button below.', button, contact, sign];
  } else {
    subject = ko ? '[오마이호텔 마켓플레이스] 계정이 열렸습니다' : '[OHMYHOTEL Marketplace] Your account is open';
    link = undefined;
    const pay = paymentText(a.paymentTerm ?? 'prepaid', l);
    const later = a.docsLaterReason
      ? [ko ? `${doc} 사본을 이 메일에 회신으로 보내 주세요.` : `Please reply to this email with a copy of your ${doc}.`]
      : [];
    body = ko
      ? [hello, `${a.docsLaterReason ? '' : '보내 주신 서류를 확인하고 '}${a.company.name} 계정을 열었습니다. 지금 바로 로그인해 이용하실 수 있습니다.`, '- 로그인: https://ohmyhotel.biz/login', `- 아이디: ${a.admin.userId}`, `- 결제: ${pay}`, '- 직원 계정: 로그인 후 Member list > Staff list에서 추가할 수 있습니다.', ...later, '이용 매뉴얼을 첨부했습니다.', `담당: ${a.gsm}`, '감사합니다.', sign]
      : [hello, `${a.docsLaterReason ? '' : 'We have checked your document and '}${a.docsLaterReason ? 'The' : 'the'} account for ${a.company.name} is now open. You can sign in right away.`, '- Sign in: https://ohmyhotel.biz/login', `- ID: ${a.admin.userId}`, `- Payment: ${pay}`, '- Staff accounts: after signing in, add them in Member list > Staff list.', ...later, 'The user manual is attached.', `Account manager: ${a.gsm}`, 'Thank you,', sign];
    attachments = [ko ? 'B2B 파트너스 매뉴얼.pdf' : 'B2B Partner Manual_EN.pdf'];
  }
  const to = [a.admin.email, ...(a.company.repEmail && a.company.repEmail !== a.admin.email ? [a.company.repEmail] : [])];
  return { id: rid(), kind, lang: l, day: a.ageDays, at: nowIso(), from: SENDER, replyTo: a.gsm, to, cc: [a.gsm], subject, body: body.filter(Boolean), attachments, link };
}

// ───────────── 저장소 ─────────────
function seed(): SignupApplication[] {
  type Over = Omit<Partial<SignupApplication>, 'company' | 'admin'> & { company: Partial<CompanyInfo>; admin: Partial<AdminInfo> };
  const base = ({ company: c, admin: m, ...rest }: Over): SignupApplication => {
    const company: CompanyInfo = { name: '', type: 'Travel Agency', country: 'KR', zip: '', address: '', phone: '', repName: '', repEmail: '', repPhone: '', repFax: '', regNo: '', ...c };
    const admin: AdminInfo = { name: '', userId: '', dept: '', position: '', email: '', mobile: '', ...m };
    return {
      id: rid(), token: rid() + rid(), createdAt: nowIso(), ageDays: 0, linkIssuedDay: 0, lang: 'ko', status: 'pending_docs',
      gsm: gsmFor(company.country), docs: [], mails: [], events: [], alerts: [], flags: {}, sample: true, ...rest, company, admin,
    };
  };
  const a1 = base({ company: { name: 'Blue Harbor Travel (샘플)', country: 'KR', address: 'Seoul', phone: '0200000000', repName: 'Sample Kim', repEmail: 'owner@blueharbor.example', regNo: '123-45-67890' }, admin: { name: 'Sample Kim', userId: 'ops@blueharbor.example', email: 'ops@blueharbor.example', mobile: '01000000000' } });
  a1.mails.push(buildMail('request', a1));
  a1.events.push({ day: 0, at: nowIso(), actor: 'agency', text: '가입 완료 (ohmyhotel.biz/join)' }, { day: 0, at: nowIso(), actor: 'system', text: '메일 ① 가입 접수·서류 요청 발송' });
  a1.alerts.push({ day: 0, at: nowIso(), text: '신규 가입' });
  a1.ageDays = 4;
  a1.flags.r3 = true;
  a1.mails.push({ ...buildMail('reminder', a1), day: 3 });
  a1.events.push({ day: 3, at: nowIso(), actor: 'system', text: '리마인드 D+3 발송' });
  a1.linkIssuedDay = 3;

  const a2 = base({ lang: 'en', company: { name: 'Lotus Lane Tours (sample)', country: 'VN', address: 'Ho Chi Minh City', phone: '0280000000', repName: 'Sample Tran', repEmail: 'info@lotuslane.example', regNo: '0312345678' }, admin: { name: 'Sample Tran', userId: 'booking@lotuslane.example', email: 'booking@lotuslane.example', mobile: '0900000000' } });
  a2.mails.push(buildMail('request', a2));
  a2.events.push({ day: 0, at: nowIso(), actor: 'agency', text: '가입 완료 (ohmyhotel.biz/join)' }, { day: 0, at: nowIso(), actor: 'system', text: '메일 ① 가입 접수·서류 요청 발송' });
  a2.ageDays = 1;
  a2.docs.push({ name: 'business-license.pdf', size: 482113, type: 'application/pdf', day: 1, via: 'upload' });
  a2.status = 'docs_received';
  a2.events.push({ day: 1, at: nowIso(), actor: 'agency', text: '서류 업로드 (business-license.pdf)' });
  a2.alerts.push({ day: 0, at: nowIso(), text: '신규 가입' }, { day: 1, at: nowIso(), text: '서류 접수' });
  return [a2, a1];
}

export function loadSignups(): SignupApplication[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as SignupApplication[];
      if (Array.isArray(v)) return v;
    }
  } catch {
    // 시드로 시작
  }
  const s = seed();
  saveSignups(s, false);
  return s;
}

function saveSignups(list: SignupApplication[], notify = true) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 무시
  }
  if (notify) window.dispatchEvent(new Event(EVENT));
}

export function resetSignups() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
  loadSignups();
  window.dispatchEvent(new Event(EVENT));
}

export function useSignups(): SignupApplication[] {
  const [list, setList] = useState<SignupApplication[]>(loadSignups);
  useEffect(() => {
    const on = () => setList(loadSignups());
    const onStorage = (e: StorageEvent) => e.key === KEY && on();
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return list;
}

function mutate(id: string, fn: (a: SignupApplication) => void): SignupApplication | null {
  const list = loadSignups();
  const a = list.find((x) => x.id === id || x.token === id);
  if (!a) return null;
  fn(a);
  saveSignups(list);
  return a;
}

const ev = (a: SignupApplication, actor: SignupEvent['actor'], text: string) => a.events.push({ day: a.ageDays, at: nowIso(), actor, text });
const alert = (a: SignupApplication, text: string) => a.alerts.push({ day: a.ageDays, at: nowIso(), text });

// ───────────── 동작 ─────────────
export function isRegNoTaken(regNo: string): boolean {
  const n = regNo.replace(/\D/g, '');
  return !!n && loadSignups().some((a) => a.company.regNo.replace(/\D/g, '') === n);
}

export function findByLogin(id: string): SignupApplication | undefined {
  const v = id.trim().toLowerCase();
  return loadSignups().find((a) => a.admin.userId.toLowerCase() === v || a.admin.email.toLowerCase() === v);
}

export function findByToken(token: string): SignupApplication | undefined {
  return loadSignups().find((a) => a.token === token);
}

export function linkValid(a: SignupApplication): boolean {
  return a.status !== 'expired' && a.status !== 'active' && a.ageDays <= a.linkIssuedDay + LINK_VALID_DAYS;
}

export function createApplication(company: CompanyInfo, admin: AdminInfo): SignupApplication {
  const portal = loadPortalLang();
  const a: SignupApplication = {
    id: rid(), token: rid() + rid() + rid(), createdAt: nowIso(), ageDays: 0, linkIssuedDay: 0,
    lang: portal === 'ko' ? 'ko' : 'en', company, admin, status: 'pending_docs', gsm: gsmFor(company.country),
    docs: [], mails: [], events: [], alerts: [], flags: {},
  };
  ev(a, 'agency', '가입 완료 (ohmyhotel.biz/join)');
  a.mails.push(buildMail('request', a));
  ev(a, 'system', `메일 ① 가입 접수·서류 요청 발송 (${a.lang.toUpperCase()})`);
  alert(a, '신규 가입');
  const list = loadSignups();
  list.unshift(a);
  saveSignups(list);
  return a;
}

export function uploadDocs(token: string, files: { name: string; size: number; type: string }[], via: 'upload' | 'gsm' = 'upload') {
  return mutate(token, (a) => {
    files.forEach((f) => a.docs.push({ ...f, day: a.ageDays, via }));
    if (a.status !== 'active') a.status = 'docs_received';
    ev(a, via === 'upload' ? 'agency' : 'gsm', `${via === 'upload' ? '서류 업로드' : 'GSM이 메일 회신 서류 첨부'} (${files.map((f) => f.name).join(', ')})`);
    if (via === 'upload') alert(a, '서류 접수');
  });
}

export function approve(id: string, paymentTerm: PaymentTerm, docsLaterReason?: string) {
  return mutate(id, (a) => {
    a.status = 'active';
    a.paymentTerm = paymentTerm;
    a.docsLaterReason = docsLaterReason?.trim() || undefined;
    ev(a, 'gsm', `승인 · Trade Status Pending → Active · 결제 조건 ${paymentTerm === 'prepaid' ? '선불' : '후불'}${a.docsLaterReason ? ` · 서류 나중에 받기(${a.docsLaterReason})` : ''}`);
    ev(a, 'system', 'Dotbiz Market 트레이더(300427) Include/Exclude 규칙 적용');
    a.mails.push(buildMail('welcome', a));
    ev(a, 'system', '메일 ② 계정 오픈 안내 발송 (매뉴얼 첨부)');
  });
}

export function reject(id: string, reason: RejectReason, note: string) {
  return mutate(id, (a) => {
    const r = REJECT_REASONS[reason][a.lang] + (note.trim() ? ` · ${note.trim()}` : '');
    a.status = 'rejected';
    a.rejectReason = r;
    a.linkIssuedDay = a.ageDays;
    ev(a, 'gsm', `반려 · ${r}`);
    a.mails.push(buildMail('resubmit', a, { reason: r }));
    ev(a, 'system', '메일 ③ 서류 재제출 요청 발송');
  });
}

/** 시간 경과 시뮬레이션 — 리마인드 D+3·D+7, D+14 GSM 알림, D+30 만료 (서류 대기·반려 상태만) */
export function advanceDays(id: string, n: number) {
  return mutate(id, (a) => {
    for (let i = 0; i < n; i++) {
      a.ageDays += 1;
      if (a.status !== 'pending_docs' && a.status !== 'rejected') continue;
      if (a.ageDays >= 3 && !a.flags.r3) {
        a.flags.r3 = true;
        a.linkIssuedDay = a.ageDays;
        a.mails.push(buildMail('reminder', a));
        ev(a, 'system', '리마인드 D+3 발송');
      }
      if (a.ageDays >= 7 && !a.flags.r7) {
        a.flags.r7 = true;
        a.linkIssuedDay = a.ageDays;
        a.mails.push(buildMail('reminder', a));
        ev(a, 'system', '리마인드 D+7 발송');
      }
      if (a.ageDays >= 14 && !a.flags.a14) {
        a.flags.a14 = true;
        alert(a, 'D+14 서류 미제출 — 직접 연락 검토');
      }
      if (a.ageDays >= EXPIRE_DAYS) {
        a.status = 'expired';
        ev(a, 'system', `D+${EXPIRE_DAYS} 만료`);
        alert(a, '만료');
        break;
      }
    }
  });
}

export const STATUS_LABEL: Record<SignupStatus, { ko: string; cls: string }> = {
  pending_docs: { ko: '가입 접수 · 서류 대기', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  docs_received: { ko: '서류 접수 · 확인 대기', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  active: { ko: '활성 (Active)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { ko: '반려 · 재제출 대기', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  expired: { ko: '만료', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const MAIL_LABEL: Record<MailKind, string> = {
  request: '① 가입 접수 · 서류 요청',
  reminder: '리마인드',
  welcome: '② 계정 오픈 안내',
  resubmit: '③ 서류 재제출 요청',
};
