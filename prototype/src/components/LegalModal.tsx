import { LEGAL_DOCS } from '../mocks/legalContent';

interface Props {
  doc: 'agreement' | 'privacy';
  onClose: () => void;
}

/**
 * 약관·개인정보처리방침 모달 — 로그인 전(대문)에서도 열람 가능.
 * 시안 스타일: 상단 오렌지 아이콘 + 번호 배지 섹션 / 라벨:값 카드.
 */
export default function LegalModal({ doc, onClose }: Props) {
  const d = LEGAL_DOCS[doc];
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative my-6 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-b from-orange-50/70 to-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-brand-600" aria-hidden>
              🛡
            </span>
            <div>
              <h3 className="font-serif text-[15px] font-bold text-slate-900">{d.title}</h3>
              <p className="text-[11px] text-slate-500">{d.company}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="모달 닫기" className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="max-h-[62vh] space-y-5 overflow-y-auto px-5 py-5">
          {d.sections.map((s, i) => (
            <section key={i}>
              {s.no ? (
                <h4 className="flex items-center gap-2 text-[14px] font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                    {s.no}
                  </span>
                  {s.title}
                </h4>
              ) : (
                <h4 className="text-[13px] font-bold text-slate-900">{s.title}</h4>
              )}
              {s.body && (
                <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-slate-600">{s.body}</p>
              )}
              {s.bullets && (
                <ul className="mt-2 space-y-2">
                  {s.bullets.map(([term, desc], k) => (
                    <li key={k} className="text-[12.5px] leading-relaxed text-slate-600">
                      <span className="mr-1 text-slate-400">•</span>
                      <b className="text-slate-800">{term}</b> {desc}
                    </li>
                  ))}
                </ul>
              )}
              {s.table && (
                <dl className="mt-2 space-y-1.5 rounded-lg bg-slate-50 px-4 py-3">
                  {s.table.map(([label, value], k) => (
                    <div key={k} className="flex gap-3 text-[12.5px]">
                      <dt className="w-28 shrink-0 text-slate-400">{label}</dt>
                      <dd className="text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
          <p className="text-[11px] italic text-slate-400">{d.footnote}</p>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-500 px-5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
