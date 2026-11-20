import { useMemo, useState } from 'react';
import { MailModal } from './SignupMail';
import { formatDateTime } from '../utils/format';
import {
  COUNTRIES,
  MAIL_LABEL,
  REJECT_REASONS,
  STATUS_LABEL,
  advanceDays,
  approve,
  loadUiLang,
  reject,
  resetSignups,
  saveUiLang,
  textIn,
  uploadDocs,
  uploadLinkOf,
  useSignups,
  type PaymentTerm,
  type RejectReason,
  type SentMail,
  type SignupStatus,
  type UiLang,
} from '../mocks/signupStore';

/**
 * ELLIS · 신규 가입 관리 (GSM 화면, 시연) — 가입 목록 · 서류 확인 · 승인/반려 · 메일 발송 이력 · 알림. KO/EN 전환.
 * 승인(Active) = 메일 ② 계정 오픈 안내(매뉴얼 첨부) 자동 발송 + Dotbiz Market 트레이더(300427) 규칙 적용.
 * "+N일" 버튼은 시간 경과 시뮬레이션(리마인드 D+3·D+7 · D+14 알림 · D+30 만료).
 * 기획: docs/plan/feature-agency-signup-onboarding.md. **프로토타입 · 폐기 가능.**
 */

const UI = {
  ko: {
    title: '신규 가입 관리',
    demo: 'GSM 화면 시연 · 메일은 실제로 보내지 않음',
    reset: '시연 초기화',
    resetDone: '시연 데이터를 처음 상태로 돌렸습니다',
    all: '전체',
    cols: ['회사명', '국가', '상태', '서류', '담당', '경과'],
    none: '해당 상태의 가입이 없습니다.',
    docCount: (n: number) => `${n}건`,
    alerts: 'GSM 알림',
    alertsNote: '(실서비스: 담당 GSM에게 메일)',
    noAlerts: '알림이 없습니다.',
    fields: {
      reg: '사업자등록번호', ct: '국가 · 유형', rep: '대표자', addr: '주소', admin: '관리자',
      langGsm: '메일 언어 · 담당', signed: '가입', pay: '결제 조건',
    },
    since: (d: number) => `경과 D+${d} (시연)`,
    prepaid: '선불', postpaid: '후불',
    cert: '사업자등록증',
    noDoc: '아직 받지 못했습니다.',
    viaUpload: '여행사 업로드', viaGsm: 'GSM 첨부(메일 회신분)',
    attach: '메일 회신으로 온 서류 첨부',
    attached: '서류를 첨부했습니다 · 서류 접수',
    openUpload: '여행사 업로드 화면 열기 (시연)',
    check: (n: string) => `확인할 것: 회사명과 사업자등록번호가 가입 정보(${n})와 같은지.`,
    approveTitle: '승인 → Active',
    payTerm: '결제 조건',
    prepaidOpt: '선불 (신규 기본)', postpaidOpt: '후불 (계약 업체)',
    later: '서류 나중에 받기 (예외 · 사유 필수)',
    reason: '사유',
    approveBtn: '승인하고 오픈 안내 메일 보내기',
    approved: '승인 · 메일 ② 계정 오픈 안내 발송 · 300427 규칙 적용',
    needDoc: '서류가 들어와야 승인할 수 있습니다.',
    rejectTitle: '반려 → 재제출 요청',
    note: '덧붙일 말 (선택)',
    rejectBtn: '반려하고 재제출 요청 메일 보내기',
    rejected: '반려 · 메일 ③ 재제출 요청 발송',
    mails: '자동 메일 발송 이력',
    sim: '시간 경과(시연)',
    passed: (n: number) => `${n}일 지남 (시연)`,
    days: (n: number) => `+${n}일`,
    events: '처리 기록',
    actor: { system: '자동', gsm: 'GSM', agency: '여행사' },
  },
  en: {
    title: 'New Sign-ups',
    demo: 'GSM screen demo · emails are not actually sent',
    reset: 'Reset demo',
    resetDone: 'Demo data reset to the sample applications',
    all: 'All',
    cols: ['Company', 'Country', 'Status', 'Documents', 'GSM', 'Age'],
    none: 'No sign-ups in this status.',
    docCount: (n: number) => `${n} file${n > 1 ? 's' : ''}`,
    alerts: 'GSM notices',
    alertsNote: '(production: email to the assigned GSM)',
    noAlerts: 'No notices.',
    fields: {
      reg: 'Registration No.', ct: 'Country · Type', rep: 'Representative', addr: 'Address', admin: 'Administrator',
      langGsm: 'Email language · GSM', signed: 'Signed up', pay: 'Payment terms',
    },
    since: (d: number) => `D+${d} (demo)`,
    prepaid: 'Prepaid', postpaid: 'Postpaid',
    cert: 'Business registration certificate',
    noDoc: 'Not received yet.',
    viaUpload: 'Uploaded by agency', viaGsm: 'Attached by GSM (email reply)',
    attach: 'Attach a document received by email',
    attached: 'Document attached · Document received',
    openUpload: 'Open the agency upload page (demo)',
    check: (n: string) => `Check: the company name and registration number match the sign-up data (${n}).`,
    approveTitle: 'Approve → Active',
    payTerm: 'Payment terms',
    prepaidOpt: 'Prepaid (default for new agencies)', postpaidOpt: 'Postpaid (contracted agencies)',
    later: 'Receive document later (exception · reason required)',
    reason: 'Reason',
    approveBtn: 'Approve and send the welcome email',
    approved: 'Approved · email ② sent · 300427 rules applied',
    needDoc: 'You can approve once a document has been received.',
    rejectTitle: 'Reject → Request resubmission',
    note: 'Note (optional)',
    rejectBtn: 'Reject and send the resubmission email',
    rejected: 'Rejected · email ③ sent',
    mails: 'Automatic email log',
    sim: 'Time travel (demo)',
    passed: (n: number) => `${n} day${n > 1 ? 's' : ''} passed (demo)`,
    days: (n: number) => `+${n}d`,
    events: 'Event history',
    actor: { system: 'System', gsm: 'GSM', agency: 'Agency' },
  },
};

const FILTERS: (SignupStatus | 'all')[] = ['all', 'pending_docs', 'docs_received', 'active', 'rejected', 'expired'];
const countryName = (c: string) => COUNTRIES.find((x) => x.code === c)?.name ?? c;

function Badge({ s, l }: { s: SignupStatus; l: UiLang }) {
  return <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_LABEL[s].cls}`}>{STATUS_LABEL[s][l]}</span>;
}

export default function EllisSignupAdmin() {
  const list = useSignups();
  const [l, setL] = useState<UiLang>(loadUiLang);
  const t = UI[l];
  const [filter, setFilter] = useState<SignupStatus | 'all'>('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [mail, setMail] = useState<SentMail | null>(null);
  const [term, setTerm] = useState<PaymentTerm>('prepaid');
  const [later, setLater] = useState(false);
  const [laterReason, setLaterReason] = useState('');
  const [rr, setRr] = useState<RejectReason>('blurry');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const switchLang = (v: UiLang) => {
    setL(v);
    saveUiLang(v);
  };
  const rows = useMemo(() => list.filter((a) => filter === 'all' || a.status === filter), [list, filter]);
  const sel = list.find((a) => a.id === selId) ?? rows[0] ?? null;
  const alerts = useMemo(
    () => list.flatMap((a) => a.alerts.map((x) => ({ ...x, company: a.company.name, id: a.id, gsm: a.gsm }))).sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 8),
    [list],
  );
  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const canDecide = sel && (sel.status === 'docs_received' || (later && sel.status !== 'active' && sel.status !== 'expired'));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-[#333333] px-6 py-3 text-white">
        <span className="text-[14px] font-bold">ELLIS · Users &gt; Customer &gt; {t.title}</span>
        <span className="flex items-center gap-3 text-[11px] text-slate-300">
          <span>{t.demo}</span>
          <span className="flex overflow-hidden rounded border border-white/20" role="group" aria-label="Language">
            {(['ko', 'en'] as UiLang[]).map((v) => (
              <button key={v} type="button" onClick={() => switchLang(v)} aria-pressed={l === v} className={`px-2 py-1 font-semibold ${l === v ? 'bg-white text-slate-900' : 'hover:bg-white/10'}`}>
                {v.toUpperCase()}
              </button>
            ))}
          </span>
          <button type="button" onClick={() => { resetSignups(); setSelId(null); flash(t.resetDone); }} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">{t.reset}</button>
        </span>
      </header>

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* 목록 + 알림 */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-[12px] ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {f === 'all' ? `${t.all} ${list.length}` : `${STATUS_LABEL[f][l].split(' · ')[0]} ${list.filter((a) => a.status === f).length}`}
                </button>
              ))}
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  {t.cols.map((c, i) => (
                    <th key={c} className={`py-2 font-semibold ${i === 5 ? 'text-right' : ''}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">{t.none}</td></tr>
                )}
                {rows.map((a) => (
                  <tr key={a.id} onClick={() => setSelId(a.id)} className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${sel?.id === a.id ? 'bg-brand-50/60' : ''}`}>
                    <td className="py-2 font-semibold text-slate-800">{a.company.name}</td>
                    <td className="py-2">{countryName(a.company.country)}</td>
                    <td className="py-2"><Badge s={a.status} l={l} /></td>
                    <td className="py-2">{a.docs.length ? t.docCount(a.docs.length) : '—'}</td>
                    <td className="py-2">{a.gsm}</td>
                    <td className="py-2 text-right">D+{a.ageDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-2 text-[13px] font-bold">{t.alerts} <span className="font-normal text-slate-400">{t.alertsNote}</span></p>
            <ul className="space-y-1 text-[12px]">
              {alerts.length === 0 && <li className="text-slate-400">{t.noAlerts}</li>}
              {alerts.map((x, i) => (
                <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
                  <button type="button" onClick={() => setSelId(x.id)} className="text-left hover:text-brand-600">
                    <b>{textIn(x, l)}</b> · {x.company}
                  </button>
                  <span className="text-slate-400">{x.gsm} · D+{x.day}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 상세 */}
        {sel && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[16px] font-bold">{sel.company.name}</p>
                <Badge s={sel.status} l={l} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
                {[
                  [t.fields.reg, sel.company.regNo],
                  [t.fields.ct, `${countryName(sel.company.country)} · ${sel.company.type}`],
                  [t.fields.rep, `${sel.company.repName} · ${sel.company.repEmail}`],
                  [t.fields.addr, sel.company.address],
                  [t.fields.admin, `${sel.admin.name} · ${sel.admin.userId}`],
                  [t.fields.langGsm, `${sel.lang.toUpperCase()} · ${sel.gsm}`],
                  [t.fields.signed, `${formatDateTime(sel.createdAt)} · ${t.since(sel.ageDays)}`],
                  [t.fields.pay, sel.paymentTerm ? (sel.paymentTerm === 'prepaid' ? t.prepaid : t.postpaid) : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-32 shrink-0 text-slate-400">{k}</dt>
                    <dd className="min-w-0 break-all text-slate-700">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[13px] font-bold">{t.cert}</p>
              {sel.docs.length === 0 ? (
                <p className="text-[12px] text-slate-400">{t.noDoc}</p>
              ) : (
                <ul className="space-y-1 text-[12px]">
                  {sel.docs.map((d, i) => (
                    <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5">
                      <span><span className="mr-1.5 rounded bg-slate-700 px-1 text-[9px] font-bold text-white">{d.type.includes('pdf') ? 'PDF' : 'IMG'}</span>{d.name} · {(d.size / 1024).toFixed(0)} KB</span>
                      <span className="text-slate-400">{d.via === 'upload' ? t.viaUpload : t.viaGsm} · D+{d.day}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {sel.status !== 'active' && sel.status !== 'expired' && (
                  <label className="cursor-pointer rounded border border-slate-300 px-2.5 py-1 text-slate-600 hover:border-brand-400">
                    {t.attach}
                    <input type="file" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { uploadDocs(sel.id, [{ name: f.name, size: f.size, type: f.type || 'application/octet-stream' }], 'gsm'); flash(t.attached); }
                    }} />
                  </label>
                )}
                <a href={uploadLinkOf(sel.token)} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-2.5 py-1 text-slate-600 hover:border-brand-400">{t.openUpload}</a>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{t.check(sel.company.regNo)}</p>
            </div>

            {sel.status !== 'active' && sel.status !== 'expired' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-white p-4">
                  <p className="mb-2 text-[13px] font-bold text-emerald-700">{t.approveTitle}</p>
                  <label className="block text-[12px] text-slate-600">{t.payTerm}
                    <select value={term} onChange={(e) => setTerm(e.target.value as PaymentTerm)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-[12px]">
                      <option value="prepaid">{t.prepaidOpt}</option>
                      <option value="postpaid">{t.postpaidOpt}</option>
                    </select>
                  </label>
                  <label className="mt-2 flex items-start gap-1.5 text-[12px] text-slate-600">
                    <input type="checkbox" checked={later} onChange={(e) => setLater(e.target.checked)} className="mt-0.5 accent-brand-500" />
                    {t.later}
                  </label>
                  {later && <input value={laterReason} onChange={(e) => setLaterReason(e.target.value)} placeholder={t.reason} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-[12px]" />}
                  <button
                    type="button"
                    disabled={!canDecide || (later && !laterReason.trim())}
                    onClick={() => { approve(sel.id, term, later ? laterReason : undefined); setLater(false); setLaterReason(''); flash(t.approved); }}
                    className="mt-3 w-full rounded bg-emerald-600 py-2 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {t.approveBtn}
                  </button>
                  {!canDecide && <p className="mt-1 text-[11px] text-slate-400">{t.needDoc}</p>}
                </div>
                <div className="rounded-lg border border-rose-200 bg-white p-4">
                  <p className="mb-2 text-[13px] font-bold text-rose-700">{t.rejectTitle}</p>
                  <select value={rr} onChange={(e) => setRr(e.target.value as RejectReason)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-[12px]">
                    {(Object.keys(REJECT_REASONS) as RejectReason[]).map((k) => <option key={k} value={k}>{REJECT_REASONS[k][l]}</option>)}
                  </select>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.note} className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-[12px]" />
                  <button
                    type="button"
                    disabled={sel.status !== 'docs_received'}
                    onClick={() => { reject(sel.id, rr, note); setNote(''); flash(t.rejected); }}
                    className="mt-3 w-full rounded bg-rose-600 py-2 text-[13px] font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {t.rejectBtn}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-bold">{t.mails}</p>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  {t.sim}
                  {[1, 3, 7, 30].map((n) => (
                    <button key={n} type="button" onClick={() => { advanceDays(sel.id, n); flash(t.passed(n)); }} className="rounded border border-slate-300 px-2 py-0.5 hover:border-brand-400">{t.days(n)}</button>
                  ))}
                </span>
              </div>
              <ul className="space-y-1 text-[12px]">
                {sel.mails.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setMail(m)} className="flex w-full items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-left hover:bg-brand-50">
                      <span><b>{MAIL_LABEL[m.kind][l]}</b> · {m.subject}</span>
                      <span className="shrink-0 pl-2 text-slate-400">{m.lang.toUpperCase()} · D+{m.day}{m.attachments.length ? ' · 📎' : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[13px] font-bold">{t.events}</p>
              <ul className="space-y-0.5 text-[12px] text-slate-600">
                {[...sel.events].reverse().map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-12 shrink-0 text-slate-400">D+{e.day}</span>
                    <span className="w-14 shrink-0 text-slate-400">{t.actor[e.actor]}</span>
                    <span>{textIn(e, l)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-[12px] text-white shadow-lg">{toast}</div>}
      {mail && <MailModal m={mail} ui={l} onClose={() => setMail(null)} />}
    </div>
  );
}
