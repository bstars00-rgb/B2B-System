import { useMemo, useState } from 'react';
import { PLAYBOOKS, type PlaybookBlock, type PlaybookLang } from '../mocks/playbookData';

interface Props {
  onClose: () => void;
}

/** 단일 블록 렌더 */
function Block({ b }: { b: PlaybookBlock }) {
  return (
    <div className="mt-4 first:mt-0">
      {b.heading && <h3 className="mb-2 text-sm font-bold text-slate-800">{b.heading}</h3>}
      {b.text && <p className="text-[13.5px] leading-relaxed text-slate-700">{b.text}</p>}
      {b.steps && (
        <ol className="mt-2 space-y-2">
          {b.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
      {b.defs && (
        <dl className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
          {b.defs.map((d, i) => (
            <div key={i} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4">
              <dt className="w-56 shrink-0 text-[13px] font-semibold text-slate-800">{d.term}</dt>
              <dd className="text-[13px] leading-relaxed text-slate-600">{d.desc}</dd>
            </div>
          ))}
        </dl>
      )}
      {b.note && (
        <p className="mt-2 rounded-md border-l-2 border-brand-400 bg-brand-50/60 px-3 py-2 text-[12.5px] leading-relaxed text-slate-700">
          💡 {b.note}
        </p>
      )}
    </div>
  );
}

/**
 * Ellis Playbook — B2B Partner Manual 을 문서 사이트(플레이북) 형태로.
 * 좌측 목차(챕터/섹션) + 본문. 전체화면 오버레이로 표시.
 */
export default function PlaybookPage({ onClose }: Props) {
  /** 언어팩 — 섹션 id가 언어 간 동일해 전환해도 현재 위치 유지 */
  const [lang, setLang] = useState<PlaybookLang>('ko');
  const playbook = PLAYBOOKS[lang];
  const flatSections = useMemo(
    () => playbook.flatMap((c) => c.sections.map((s) => ({ chapterId: c.id, ...s }))),
    [playbook],
  );
  const [activeId, setActiveId] = useState(flatSections[0].id);
  const active = flatSections.find((s) => s.id === activeId) ?? flatSections[0];
  const activeIndex = flatSections.findIndex((s) => s.id === activeId);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white">
      {/* 상단 바 */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200 bg-[#333333] px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand-500 text-[10px] font-black text-brand-500">
            O
          </span>
          <span className="text-sm font-bold text-white">
            Ellis <span className="text-brand-500">Playbook</span>
          </span>
          <span className="ml-2 text-[11px] text-slate-400">OHMYHOTEL.Biz Partner Manual</span>
        </div>
        <div className="flex items-center gap-3">
          {/* 언어팩 전환 (영/한) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400" aria-hidden>🌐</span>
            <div className="flex overflow-hidden rounded border border-slate-500 text-[11px]">
              {(['en', 'ko'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={
                    lang === l
                      ? 'bg-brand-500 px-2.5 py-1 font-bold text-white'
                      : 'px-2.5 py-1 text-slate-300 hover:bg-slate-700'
                  }
                >
                  {l === 'en' ? 'English' : '한국어'}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-500 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            {lang === 'ko' ? '✕ 닫기' : '✕ Close'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 좌측 목차 */}
        <nav className="w-[260px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 py-4">
          {playbook.map((chapter) => (
            <div key={chapter.id} className="mb-3 px-3">
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {chapter.title}
              </p>
              <ul className="mt-0.5">
                {chapter.sections.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className={`block w-full rounded px-3 py-1.5 text-left text-[13px] ${
                        activeId === s.id
                          ? 'bg-brand-500 font-semibold text-white'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* 본문 */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <article className="mx-auto max-w-3xl px-8 py-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              {playbook.find((c) => c.id === active.chapterId)?.title}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{active.title}</h1>
            <div className="mt-5">
              {active.blocks.map((b, i) => (
                <Block key={i} b={b} />
              ))}
            </div>

            {/* 이전/다음 */}
            <div className="mt-10 flex justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={() => setActiveId(flatSections[activeIndex - 1].id)}
                className="rounded border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:invisible"
              >
                ← {activeIndex > 0 ? flatSections[activeIndex - 1].title : ''}
              </button>
              <button
                type="button"
                disabled={activeIndex === flatSections.length - 1}
                onClick={() => setActiveId(flatSections[activeIndex + 1].id)}
                className="rounded border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:invisible"
              >
                {activeIndex < flatSections.length - 1 ? flatSections[activeIndex + 1].title : ''} →
              </button>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
