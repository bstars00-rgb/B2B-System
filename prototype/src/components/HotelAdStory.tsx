import { useEffect, useMemo, useRef, useState } from 'react';
import SceneArt, { LAYER_COUNT } from './HotelAdArt';
import MarketOnlyTag from './MarketOnlyTag';
import { hasMarketOnlyRate, trackAd, type AdScene, type HotelAdCampaign } from '../mocks/hotelAdCampaigns';
import type { PortalLang } from '../utils/portalLang';

/**
 * 랜딩(로그인) 페이지 호텔 광고 — 스크롤 기반 인터랙티브 애니메이션. 기획: docs/plan/feature-landing-hotel-ads.md
 * 데스크톱: 광고 영역을 sticky로 고정하고 페이지 스크롤 진행도로 장면·레이어를 움직인다(스크롤 가로채기 없음).
 *   장면당 100vh · 크로스페이드 · 천천히 줌 · 문구 슬라이드업 · 배경 톤 전환 · 위로 스크롤하면 역재생 · 점 클릭 이동.
 * 모바일: 장면을 세로로 나열하고 화면에 들어올 때 페이드인.
 * **프로토타입 · 폐기 가능.**
 */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const SCENE_VH = 100;
const TAIL_VH = 40;

const UI = {
  en: { featured: 'Featured hotel', cta: 'View rooms & rates', scroll: 'Scroll to explore', note: 'Rates are shown after sign-in', sample: 'Sample ad · illustrations', photos: 'Prototype ad · hotel photos', next: 'Next ad (prototype)' },
  ko: { featured: '추천 호텔', cta: '객실·요금 보기', scroll: '스크롤해서 둘러보기', note: '요금은 로그인 후 확인할 수 있습니다', sample: '샘플 광고 · 일러스트', photos: '프로토타입 광고 · 호텔 사진', next: '다음 광고 (프로토타입)' },
};
const uiOf = (lang: PortalLang) => (lang === 'ko' ? UI.ko : UI.en);
const textOf = (s: AdScene, lang: PortalLang) => (lang === 'ko' ? s.ko : s.en);
const stars = (n: number) => '★'.repeat(n);

/** 사진 장면: 가로 띠 6장이 아래에서부터 한 겹씩 맞춰진다(객실은 위에서 내려앉고, 외관은 아래에서 올라옴) + 보조 사진 */
const STRIPS = 6;
export const photoLayerCount = (s: AdScene) => 1 + STRIPS + (s.inset ? 1 : 0);

function PhotoScene({ s, q, lang }: { s: AdScene; q: (j: number) => number; lang: PortalLang }) {
  const rise = s.kind === 'exterior';
  const qs = Array.from({ length: STRIPS }, (_, k) => q(1 + (STRIPS - 1 - k))); // k=0 맨 위 띠 · 맨 아래 띠가 먼저
  const done = qs.every((v) => v >= 1);
  const img = (alt: string) => (
    <img src={s.image} alt={alt} draggable={false} className="h-full w-full object-cover" style={{ objectPosition: s.focus ?? 'center' }} />
  );
  const iq = s.inset ? q(STRIPS + 1) : 0;
  return (
    <div className="relative h-full w-full overflow-hidden bg-black/5">
      {done
        ? img(textOf(s, lang).h)
        : qs.map((v, k) =>
            v <= 0 ? null : (
              <div
                key={k}
                className="absolute inset-0"
                style={{
                  clipPath: `inset(${((k / STRIPS) * 100).toFixed(3)}% 0 ${(100 - ((k + 1) / STRIPS) * 100).toFixed(3)}% 0)`,
                  opacity: v,
                  transform: `translateY(${((1 - v) * (rise ? 46 : -46)).toFixed(1)}px)`,
                }}
              >
                {img(k === 0 ? textOf(s, lang).h : '')}
              </div>
            ),
          )}
      {s.inset && iq > 0 && (
        <figure
          className="absolute bottom-4 left-4 w-[27%] overflow-hidden rounded-xl border-4 border-white shadow-2xl"
          style={{ opacity: iq, transform: `translateY(${((1 - iq) * 30).toFixed(1)}px) rotate(-2deg)` }}
        >
          <img src={s.inset.image} alt={lang === 'ko' ? s.inset.ko : s.inset.en} className="aspect-[3/4] w-full object-cover" draggable={false} />
          <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
            {lang === 'ko' ? s.inset.ko : s.inset.en}
          </figcaption>
        </figure>
      )}
    </div>
  );
}

function Visual({ c, s, q, lang }: { c: HotelAdCampaign; s: AdScene; q: (j: number) => number; lang: PortalLang }) {
  if (s.image) return <PhotoScene s={s} q={q} lang={lang} />;
  return <SceneArt kind={s.kind} p={c.palette} q={q} sign={c.sign} />;
}

export function HotelAdStory({
  c,
  lang,
  onCta,
  onNext,
}: {
  c: HotelAdCampaign;
  lang: PortalLang;
  onCta: (c: HotelAdCampaign) => void;
  onNext: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const reduce = useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);
  const N = c.scenes.length;
  const t = uiOf(lang);

  // 스크롤 진행도 — 네이티브 스크롤만 읽는다 (rAF로 묶음)
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      setP(total > 0 ? clamp(-el.getBoundingClientRect().top / total) : 0);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [c.id]);

  const f = Math.min(p * N, N - 0.0001);
  const idx = Math.floor(f);
  const local = f - idx;
  const scene = c.scenes[idx];
  const last = idx === N - 1;

  // 추적 이벤트 (명세 §9)
  const seen = useRef(new Set<number>());
  useEffect(() => {
    seen.current = new Set();
    trackAd('ad_impression', { campaignId: c.id });
  }, [c.id]);
  useEffect(() => {
    if (seen.current.has(idx)) return;
    seen.current.add(idx);
    trackAd('ad_scene_view', { campaignId: c.id, sceneIndex: idx });
    if (idx === N - 1) trackAd('ad_complete', { campaignId: c.id });
  }, [idx, c.id, N]);

  const sceneLocal = (i: number) => (i < idx ? 1 : i > idx ? 0 : i === 0 ? 0.3 + 0.7 * local : local);
  const layerQ = (i: number) => (j: number) => {
    if (i > idx) return 0;
    if (reduce || j === 0) return 1;
    const sc = c.scenes[i];
    const n = sc.image ? photoLayerCount(sc) : LAYER_COUNT[sc.kind];
    const start = 0.04 + 0.62 * (j / n);
    return clamp((sceneLocal(i) - start) / 0.16);
  };
  const sceneOpacity = (i: number) => {
    if (i === idx) return idx === 0 ? 1 : clamp(local / 0.18);
    if (i === idx - 1) return 1 - clamp(local / 0.18);
    return 0;
  };
  const tq = idx === 0 ? 1 : clamp((local - 0.04) / 0.22);
  const dark = !!scene.dark;
  const ink = dark ? 'text-white' : 'text-slate-900';
  const sub = dark ? 'text-slate-300' : 'text-slate-600';

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = window.scrollY + el.getBoundingClientRect().top;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.62) / N) * total, behavior: reduce ? 'auto' : 'smooth' });
  };
  const cta = () => {
    trackAd('ad_cta_click', { campaignId: c.id, sceneIndex: idx, signedIn: false });
    onCta(c);
  };

  return (
    <div ref={ref} className="relative" style={{ height: `${N * SCENE_VH + TAIL_VH}vh` }}>
      <section
        aria-label={`${t.featured}: ${c.hotelName}`}
        className="sticky top-0 flex h-screen flex-col overflow-hidden px-14 py-9 transition-colors duration-500"
        style={{ background: scene.tone }}
      >
        {/* 상단 바 */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-brand-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            </span>
            <span>
              <span className={`block text-xl font-extrabold tracking-wide ${ink}`}>Marketplace</span>
              <span className={`block text-[10px] tracking-[0.2em] ${sub}`}>BY OHMYHOTEL&amp;CO</span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] ${dark ? 'border-white/30 text-slate-300' : 'border-slate-300 text-slate-500'}`}>{c.source === 'photos' ? t.photos : t.sample}</span>
            <button
              type="button"
              onClick={onNext}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'}`}
            >
              ↻ {t.next}
            </button>
          </span>
        </div>

        {/* 본문: 왼쪽 문구 · 오른쪽 장면 */}
        <div className="relative grid flex-1 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-6">
          <div className="relative z-10">
            <p className={`flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] ${dark ? 'text-brand-300' : 'text-brand-600'}`}>
              {t.featured} · {lang === 'ko' ? c.cityKo : c.cityEn} · <span className="tracking-normal">{stars(c.stars)}</span>
              {hasMarketOnlyRate(c) && <MarketOnlyTag />}
            </p>
            <p className={`mt-3 text-[15px] font-semibold ${sub}`}>{c.hotelName}</p>
            <div style={{ opacity: tq, transform: `translateY(${((1 - tq) * 24).toFixed(1)}px)` }}>
              <h2 className={`mt-4 font-serif text-[52px] font-bold uppercase leading-[1.02] tracking-tight xl:text-[64px] ${ink}`}>
                {textOf(scene, lang).h}
              </h2>
              <p className={`mt-5 text-lg ${sub}`}>{textOf(scene, lang).s}</p>
            </div>
            {last && (
              // 외관이 다 지어진 뒤(장면 진행 55% 이후) 큰 CTA가 나타난다
              <div className="mt-8" style={{ opacity: reduce ? 1 : clamp((local - 0.55) / 0.2), pointerEvents: local < 0.55 && !reduce ? 'none' : 'auto' }}>
                <button
                  type="button"
                  onClick={cta}
                  className="rounded-full bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-orange-500/30 transition-transform hover:scale-[1.02]"
                >
                  {t.cta} →
                </button>
                <p className={`mt-3 text-[12px] ${sub}`}>{t.note}</p>
              </div>
            )}
          </div>

          <div className="relative aspect-[4/3] w-full">
            {c.scenes.map((s, i) => {
              const o = sceneOpacity(i);
              if (o <= 0) return null;
              const scale = reduce ? 1 : 1.04 - 0.04 * sceneLocal(i);
              return (
                <div key={i} className="absolute inset-0" style={{ opacity: o, transform: `scale(${scale.toFixed(4)})` }}>
                  <div className={`h-full w-full overflow-hidden rounded-[28px] ${s.dark ? '' : 'shadow-2xl shadow-slate-900/10'}`}>
                    <Visual c={c} s={s} q={layerQ(i)} lang={lang} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단: 스크롤 안내 · 간단 CTA (참고 영상의 Read more) */}
        <div className="relative z-10 flex items-center justify-between">
          <span className={`flex items-center gap-2 text-[12px] transition-opacity ${sub}`} style={{ opacity: idx === 0 && local < 0.12 ? 1 : 0 }}>
            <span className="inline-block animate-bounce">↓</span> {t.scroll}
          </span>
          <button
            type="button"
            onClick={cta}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold ${dark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
          >
            ◯ {t.cta} →
          </button>
        </div>

        {/* 진행 점 — 장면 수만큼, 클릭하면 그 장면으로 */}
        <div className="absolute right-5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2.5">
          {c.scenes.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} · ${textOf(s, lang).h}`}
              title={textOf(s, lang).h}
              onClick={() => goTo(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === idx ? (dark ? 'scale-125 bg-white' : 'scale-125 bg-slate-900') : dark ? 'bg-white/35' : 'bg-slate-900/25'
              }`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/** 모바일(1024px 미만) — 로그인 패널 아래 세로 목록, 화면에 들어오면 페이드인 */
function FadeIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="transition-all duration-700" style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(24px)' }}>
      {children}
    </div>
  );
}

export function HotelAdMobile({ c, lang, onCta }: { c: HotelAdCampaign; lang: PortalLang; onCta: (c: HotelAdCampaign) => void }) {
  const t = uiOf(lang);
  return (
    <section aria-label={`${t.featured}: ${c.hotelName}`} className="space-y-6 bg-slate-50 px-6 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
        {t.featured} · {lang === 'ko' ? c.cityKo : c.cityEn}
      </p>
      <p className="-mt-4 text-[15px] font-bold text-slate-800">{c.hotelName}</p>
      {c.scenes.map((s, i) => (
        <FadeIn key={i}>
          <div className="overflow-hidden rounded-2xl" style={{ background: s.tone }}>
            <div className="aspect-[4/3]">
              <Visual c={c} s={s} q={() => 1} lang={lang} />
            </div>
            <div className="px-4 py-3">
              <p className={`font-serif text-xl font-bold uppercase ${s.dark ? 'text-white' : 'text-slate-900'}`}>{textOf(s, lang).h}</p>
              <p className={`text-[13px] ${s.dark ? 'text-slate-300' : 'text-slate-600'}`}>{textOf(s, lang).s}</p>
            </div>
          </div>
        </FadeIn>
      ))}
      <button type="button" onClick={() => onCta(c)} className="w-full rounded-full bg-brand-500 py-3 text-sm font-bold text-white">
        {t.cta} →
      </button>
      <p className="text-center text-[11px] text-slate-500">{t.note}</p>
    </section>
  );
}
