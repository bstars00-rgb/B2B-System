import { useMemo, useState } from 'react';
import { FAQ_POSTS, NOTICE_POSTS, postBody, postTitle, type BoardLang, type BoardPost } from '../mocks/boardData';
import type { PortalLang } from '../utils/portalLang';

interface Props {
  kind: 'faq' | 'notice';
  /** 포털 전역 언어 설정 — 게시판 콘텐츠는 이 설정을 따라감 (닷비즈 원본 동작) */
  portalLang: PortalLang;
}

/**
 * 실제 포털 FAQ Board / Notice Board 클론.
 * 검색 바 → 카운트/페이지 크기 → 목록 그리드(Post SEQ 링크) → 페이저,
 * Post SEQ 클릭 시 상세 모달(제목·Register Date·Views·본문·Close).
 * 언어는 포털 전역 설정을 따라감(닷비즈 원본에 언어팩 영·한·중·베·일 존재) — 미번역 언어는 영어 폴백.
 */
export default function BoardPage({ kind, portalLang }: Props) {
  const posts = kind === 'faq' ? FAQ_POSTS : NOTICE_POSTS;
  const badgeCol = kind === 'faq' ? 'FAQ Type' : 'Pin to top';
  const timeCol = kind === 'faq' ? 'Last Update Time' : 'First Insert Time';

  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [detail, setDetail] = useState<BoardPost | null>(null);
  /** 표시 언어 — 전역 설정 기준 (한국어 외 미번역 언어는 영어 폴백, 번역 콘텐츠팀 진행 중) */
  const lang: BoardLang = portalLang === 'ko' ? 'ko' : 'en';
  const fallback = portalLang !== 'ko' && portalLang !== 'en';
  /** 세션 내 조회수 증가분 */
  const [viewBump, setViewBump] = useState<Record<number, number>>({});

  const rows = useMemo(() => {
    const q = applied.trim().toLowerCase();
    if (!q) return posts;
    // 표시 언어와 무관하게 한/영 제목 모두 검색 매칭
    return posts.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.titleEn?.toLowerCase().includes(q) ?? false),
    );
  }, [posts, applied]);

  const openDetail = (p: BoardPost) => {
    setViewBump((prev) => ({ ...prev, [p.seq]: (prev[p.seq] ?? 0) + 1 }));
    setDetail(p);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        {/* 검색 바 */}
        <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50/50 px-4 py-3">
          <label className="text-xs font-medium text-slate-700">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setApplied(query)}
            className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setApplied(query)}
            className="rounded bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setApplied('');
            }}
            className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>

        {/* 카운트 + 페이지 크기 — 언어는 포털 전역 설정을 따라감 */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-brand-500">{rows.length}</span>
          <div className="flex items-center gap-3">
            {kind === 'faq' && fallback && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                번역 준비 중 — English로 표시됩니다
              </span>
            )}
            <select disabled className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600">
              <option>20</option>
            </select>
          </div>
        </div>

        {/* 목록 그리드 */}
        <div className="mt-2 overflow-x-auto rounded border border-slate-200">
          <table className="w-full min-w-[860px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">Post SEQ</th>
                <th className="px-3 py-2.5 font-semibold">{badgeCol}</th>
                <th className="px-3 py-2.5 text-left font-semibold">Post Title</th>
                <th className="px-3 py-2.5 font-semibold">{timeCol}</th>
                <th className="px-3 py-2.5 font-semibold">View Counts</th>
                <th className="px-3 py-2.5 font-semibold">Attached File</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-14 text-center text-slate-400">
                    No records available.
                  </td>
                </tr>
              ) : (
                rows.map((p, i) => (
                  <tr key={p.seq} className={`border-b border-slate-100 last:border-b-0 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => openDetail(p)}
                        className="font-medium text-slate-700 underline underline-offset-2 hover:text-brand-600"
                      >
                        {p.seq}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600">{p.badge}</td>
                    <td className="px-3 py-3 text-left text-slate-700">
                      <button type="button" onClick={() => openDetail(p)} className="hover:text-brand-600">
                        {postTitle(p, lang)}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600">{p.time}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{p.views + (viewBump[p.seq] ?? 0)}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{p.attached ? 'Yes' : 'No'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이저 */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {['|<', '<', '1', '>', '>|'].map((p) => (
              <span
                key={p}
                className={`flex h-6 min-w-6 items-center justify-center rounded px-1 ${
                  p === '1' ? 'bg-brand-100 font-bold text-brand-600' : 'text-slate-400'
                }`}
              >
                {p}
              </span>
            ))}
          </div>
          <span>{rows.length === 0 ? '0 - 0 of 0 items' : `1 - ${rows.length} of ${rows.length} items`}</span>
        </div>
      </div>

      {/* 상세 모달 (실제 포털 Notice 상세 구성) */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setDetail(null)}
            className="fixed inset-0 h-full w-full cursor-default bg-slate-900/50"
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#333333] px-5 py-3">
              <h3 className="text-sm font-bold text-white">{kind === 'faq' ? 'FAQ' : 'Notice'}</h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-slate-300 hover:text-white"
                aria-label="모달 닫기"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-6">
              <div className="rounded border border-slate-200">
                <h4 className="px-6 py-5 text-center text-base font-bold text-slate-900">{postTitle(detail, lang)}</h4>
                <div className="flex justify-end gap-4 border-y border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500">
                  <span>Register Date : {detail.time}</span>
                  <span>|</span>
                  <span>Views : {detail.views + (viewBump[detail.seq] ?? 0)}</span>
                </div>
                <div className="whitespace-pre-wrap px-6 py-5 text-[13px] leading-relaxed text-slate-700">
                  {postBody(detail, lang)}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
