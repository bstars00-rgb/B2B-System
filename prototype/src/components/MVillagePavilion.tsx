import { useMemo, useState } from 'react';
import {
  MV_BRAND,
  MV_PROPERTIES,
  MV_TIERS,
  mvBookTarget,
  tierDef,
  type MvProperty,
  type MvTier,
} from '../mocks/mvillage';

/**
 * M Village (Modern Village Lifestyle) 브랜드관 + 배너 + 로그인 프로모 — **엠빌리지TF.**
 * 브랜드관에서 물건 클릭 → 바로 Create Booking 프리필. 고도화와 별개 트랙.
 */

const ACCENT = MV_BRAND.accent;

/** 티어별 그라디언트 플레이스홀더 (사진 없을 때) */
function PropertyThumb({ p }: { p: MvProperty }) {
  const c = tierDef(p.tier).color;
  if (p.image) return <img src={p.image} alt={p.name} className="h-36 w-full object-cover" />;
  return (
    <div className="flex h-36 w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${c} 0%, ${c}bb 55%, ${c}77 100%)` }}>
      <span className="text-3xl font-black tracking-tight text-white/90">M</span>
    </div>
  );
}

export default function MVillagePavilion({ onBookHotel }: { onBookHotel?: (t: { code: string; destination: string; hotelName: string }) => void }) {
  const [tier, setTier] = useState<MvTier | 'all'>('all');
  const shown = useMemo(() => (tier === 'all' ? MV_PROPERTIES : MV_PROPERTIES.filter((p) => p.tier === tier)), [tier]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-100">
      {/* 브랜드 히어로 */}
      <div className="relative overflow-hidden px-8 py-9 text-white" style={{ background: `linear-gradient(120deg, #0a3d34 0%, ${ACCENT} 60%, #0e7490 100%)` }}>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative mx-auto max-w-[1400px]">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.25em] text-white/70">
            <span className="rounded bg-white/15 px-2 py-0.5">M Village</span> 브랜드관 · Marketplace 단독
          </div>
          <h1 className="mt-3 text-[34px] font-extrabold leading-tight">{MV_BRAND.name}</h1>
          <p className="mt-1 text-[15px] text-white/85">{MV_BRAND.taglineEn} — {MV_BRAND.taglineKo}</p>
          <p className="mt-3 inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[12px]">{MV_BRAND.gsa}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-8 py-6">
        {/* 티어 필터 */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTier('all')}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${tier === 'all' ? 'border-transparent text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
            style={tier === 'all' ? { background: ACCENT } : undefined}
          >
            전체 {MV_PROPERTIES.length}
          </button>
          {MV_TIERS.map((t) => {
            const on = tier === t.tier;
            const cnt = MV_PROPERTIES.filter((p) => p.tier === t.tier).length;
            return (
              <button
                key={t.tier}
                type="button"
                onClick={() => setTier(t.tier)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${on ? 'border-transparent text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                style={on ? { background: t.color } : undefined}
                title={t.desc}
              >
                {t.label} {cnt}
              </button>
            );
          })}
        </div>

        {/* 물건 카드 그리드 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const td = tierDef(p.tier);
            return (
              <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="relative">
                  <PropertyThumb p={p} />
                  <span className="absolute left-2 top-2 rounded px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: td.color }}>{td.label}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-slate-800">{p.name}</h3>
                  </div>
                  <div className="mt-0.5 text-[12px] text-slate-500">📍 {p.cityEn} · {p.cityKr}</div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{p.blurb}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] text-slate-500">{tag}</span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onBookHotel?.(mvBookTarget(p))}
                    className="mt-3 w-full rounded py-2 text-[13px] font-semibold text-white transition-transform hover:scale-[1.01]"
                    style={{ background: ACCENT }}
                  >
                    예약하기 →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
          Modern Village Lifestyle · 한국 GSA: OhMyHotel Global. 물건을 클릭하면 예약 생성으로 이동합니다.
          <br />⚠ 프로토타입 — 물건 목록은 실제 GSA 물건 확정 전 예시입니다(M Village Kim Ma 외 명칭 가안).
        </p>
      </div>
    </div>
  );
}

/** Bookings 화면 상단 배너 — 클릭 시 브랜드관 이동 */
export function MVillageBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg px-5 py-3 text-left text-white"
      style={{ background: `linear-gradient(100deg, #0a3d34 0%, ${ACCENT} 55%, #0e7490 100%)` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded bg-white/15 text-lg font-black">M</span>
        <div>
          <div className="text-[13px] font-bold">
            {MV_BRAND.name} <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">Korea GSA</span>
          </div>
          <div className="text-[11.5px] text-white/80">{MV_BRAND.taglineKo}</div>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold group-hover:bg-white/25">브랜드관 바로가기 →</span>
    </button>
  );
}

/** 로그인 화면 프로모 (홍보 — 클릭 이동 없음) */
export function MVillageLoginPromo() {
  return (
    <div className="mt-8 max-w-2xl rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm" style={{ boxShadow: `inset 0 0 0 1px ${ACCENT}33` }}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg text-xl font-black text-white" style={{ background: ACCENT }}>M</span>
        <div>
          <div className="flex items-center gap-2 text-[13px] font-bold text-white">
            {MV_BRAND.name}
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: ACCENT }}>NEW · Korea GSA</span>
          </div>
          <div className="text-[12px] text-slate-300">{MV_BRAND.taglineEn} — 마켓플레이스 단독 브랜드관 오픈</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MV_TIERS.map((t) => (
          <span key={t.tier} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-slate-200">{t.label}</span>
        ))}
      </div>
    </div>
  );
}
