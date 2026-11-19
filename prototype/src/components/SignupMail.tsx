import { formatDateTime } from '../utils/format';
import { MAIL_LABEL, type SentMail } from '../mocks/signupStore';

/** 자동 메일 미리보기 (메일 클라이언트 모양) — 기획: docs/plan/feature-agency-signup-onboarding.md. **프로토타입 · 폐기 가능.** */
export function MailView({ m, openLink = true }: { m: SentMail; openLink?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800">
      <div className="space-y-0.5 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
        <p className="text-[14px] font-bold text-slate-900">{m.subject}</p>
        <p><span className="inline-block w-16 text-slate-400">From</span>{m.from}</p>
        <p><span className="inline-block w-16 text-slate-400">To</span>{m.to.join(', ')}</p>
        <p><span className="inline-block w-16 text-slate-400">Cc</span>{m.cc.join(', ')} <span className="text-slate-400">(담당 GSM)</span></p>
        <p><span className="inline-block w-16 text-slate-400">Reply-To</span>{m.replyTo}</p>
        <p className="text-slate-400">
          {MAIL_LABEL[m.kind]} · {m.lang.toUpperCase()} · 가입 후 {m.day}일 · {formatDateTime(m.at)}
        </p>
      </div>
      <div className="space-y-2.5 px-5 py-4 leading-relaxed">
        {m.body.map((line, i) => {
          if (line.startsWith('[[BUTTON]]')) {
            const label = line.replace('[[BUTTON]]', '');
            return (
              <p key={i}>
                {openLink && m.link ? (
                  <a href={m.link} target="_blank" rel="noreferrer" className="inline-block rounded-md bg-brand-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-600">
                    {label}
                  </a>
                ) : (
                  <span className="inline-block rounded-md bg-brand-500 px-4 py-2 text-[13px] font-bold text-white">{label}</span>
                )}
              </p>
            );
          }
          if (line.startsWith('- ')) return <p key={i} className="pl-3 text-slate-700">• {line.slice(2)}</p>;
          return <p key={i}>{line}</p>;
        })}
      </div>
      {m.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
          {m.attachments.map((f) => (
            <span key={f} title="시연 — 실서비스는 ELLIS에 등록된 언어별 매뉴얼 PDF를 첨부" className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-700">
              <span className="rounded bg-rose-500 px-1 text-[9px] font-bold text-white">PDF</span>
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MailModal({ m, onClose }: { m: SentMail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50" />
      <div className="relative w-full max-w-2xl">
        <div className="mb-2 flex items-center justify-between text-white">
          <span className="text-[12px]">발송된 메일 (시연 — 실제로 보내지 않음)</span>
          <button type="button" onClick={onClose} className="text-[13px] hover:opacity-80">✕ 닫기</button>
        </div>
        <MailView m={m} />
      </div>
    </div>
  );
}
