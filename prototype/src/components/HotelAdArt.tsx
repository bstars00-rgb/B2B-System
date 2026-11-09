import { useId, type ReactNode } from 'react';
import type { AdPalette, SceneKind } from '../mocks/hotelAdCampaigns';

/**
 * 호텔 광고 장면 일러스트 (SVG) — 실사진이 없을 때 쓰는 프로토타입 소재. **폐기 가능.**
 * 레이어가 스크롤에 맞춰 한 겹씩 쌓인다(참고 영상의 "재료가 쌓이는" 효과): q(j) = 레이어 j의 진행도 0~1.
 * 객실 가구는 위에서 내려앉고, 외관은 층이 아래에서부터 올라간다.
 */

export const LAYER_COUNT: Record<SceneKind, number> = { double: 8, twin: 7, view: 7, exterior: 12 };

type Q = (j: number) => number;

function Layer({ q, from = -36, children }: { q: number; from?: number; children: ReactNode }) {
  if (q <= 0) return null;
  return (
    <g opacity={q} transform={`translate(0 ${((1 - q) * from).toFixed(1)})`}>
      {children}
    </g>
  );
}

function Base({ p }: { p: AdPalette }) {
  return (
    <>
      <rect x={0} y={0} width={800} height={440} fill={p.wall} />
      <rect x={0} y={440} width={800} height={160} fill={p.floor} />
      <rect x={0} y={434} width={800} height={8} fill={p.wood} opacity={0.35} />
    </>
  );
}

const SKYLINE: [number, number, number][] = [
  [0.02, 0.15, 0.42], [0.19, 0.11, 0.64], [0.32, 0.17, 0.36], [0.51, 0.09, 0.72], [0.62, 0.19, 0.5], [0.84, 0.13, 0.4],
];

function Window({ x, y, w, h, p }: { x: number; y: number; w: number; h: number; p: AdPalette }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={p.sky} />
      {SKYLINE.map(([rx, bw, bh], i) => (
        <g key={i}>
          <rect x={x + rx * w} y={y + h - bh * h} width={bw * w} height={bh * h} fill={p.skyline} />
          {[0.2, 0.45, 0.7].map((ly) => (
            <rect key={ly} x={x + rx * w + bw * w * 0.3} y={y + h - bh * h * (1 - ly)} width={bw * w * 0.4} height={4} fill="#FFF3C4" opacity={0.8} />
          ))}
        </g>
      ))}
      <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke="#FFFFFF" strokeWidth={10} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#FFFFFF" strokeWidth={6} />
    </g>
  );
}

function Curtain({ x, p }: { x: number; p: AdPalette }) {
  return (
    <g>
      <rect x={x} y={66} width={34} height={262} rx={4} fill={p.accent} opacity={0.88} />
      <line x1={x + 11} y1={70} x2={x + 11} y2={324} stroke="#000" strokeOpacity={0.12} strokeWidth={3} />
      <line x1={x + 23} y1={70} x2={x + 23} y2={324} stroke="#000" strokeOpacity={0.12} strokeWidth={3} />
    </g>
  );
}

function Pillow({ x, w }: { x: number; w: number }) {
  return <rect x={x} y={292} width={w} height={44} rx={20} fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={2} />;
}

function Lamp({ cx, p }: { cx: number; p: AdPalette }) {
  return (
    <g>
      <circle cx={cx} cy={300} r={58} fill="#FFE9A8" opacity={0.35} />
      <rect x={cx - 35} y={360} width={70} height={80} rx={6} fill={p.wood} />
      <rect x={cx - 8} y={330} width={16} height={30} fill="#3F3F46" />
      <path d={`M${cx - 30} 300 L${cx + 30} 300 L${cx + 20} 270 L${cx - 20} 270 Z`} fill="#FDE7B0" />
    </g>
  );
}

function Plant({ cx }: { cx: number }) {
  return (
    <g>
      <ellipse cx={cx - 14} cy={350} rx={16} ry={34} fill="#3F8F5A" transform={`rotate(-18 ${cx - 14} 350)`} />
      <ellipse cx={cx + 14} cy={348} rx={16} ry={36} fill="#4FA36A" transform={`rotate(16 ${cx + 14} 348)`} />
      <ellipse cx={cx} cy={338} rx={14} ry={40} fill="#3A8455" />
      <rect x={cx - 25} y={384} width={50} height={56} rx={6} fill="#B9825A" />
    </g>
  );
}

function BedSet({ x, w, p, headY = 240 }: { x: number; w: number; p: AdPalette; headY?: number }) {
  return (
    <g>
      <rect x={x + 18} y={headY} width={w - 36} height={130} rx={16} fill={p.wood} />
    </g>
  );
}

function Mattress({ x, w, p }: { x: number; w: number; p: AdPalette }) {
  return (
    <g>
      <rect x={x} y={350} width={w} height={95} rx={12} fill={p.wood} opacity={0.9} />
      <rect x={x + 6} y={318} width={w - 12} height={60} rx={18} fill={p.linen} />
      <rect x={x + 6} y={352} width={w - 12} height={62} rx={10} fill={p.linen} stroke="#E2E8F0" strokeWidth={2} />
      <rect x={x + 6} y={372} width={w - 12} height={18} fill={p.accent} />
    </g>
  );
}

function Art({ x, y, w, h, p }: { x: number; y: number; w: number; h: number; p: AdPalette }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke={p.wood} strokeWidth={6} />
      <circle cx={x + w * 0.3} cy={y + h * 0.55} r={Math.min(w, h) * 0.24} fill={p.accent} opacity={0.7} />
      <rect x={x + w * 0.52} y={y + h * 0.3} width={w * 0.32} height={h * 0.45} fill={p.sky} />
    </g>
  );
}

function DoubleRoom({ p, q }: { p: AdPalette; q: Q }) {
  return (
    <>
      <Layer q={q(0)} from={0}><Base p={p} /></Layer>
      <Layer q={q(1)}><Window x={540} y={80} w={200} h={210} p={p} /></Layer>
      <Layer q={q(2)}><Curtain x={510} p={p} /><Curtain x={736} p={p} /></Layer>
      <Layer q={q(3)}><BedSet x={110} w={350} p={p} /></Layer>
      <Layer q={q(4)}><Mattress x={110} w={350} p={p} /></Layer>
      <Layer q={q(5)}><Pillow x={150} w={110} /><Pillow x={300} w={110} /></Layer>
      <Layer q={q(6)}><Lamp cx={63} p={p} /></Layer>
      <Layer q={q(7)}><Art x={190} y={105} w={200} h={100} p={p} /><Plant cx={715} /></Layer>
    </>
  );
}

function TwinRoom({ p, q }: { p: AdPalette; q: Q }) {
  return (
    <>
      <Layer q={q(0)} from={0}><Base p={p} /></Layer>
      <Layer q={q(1)}><Window x={580} y={80} w={160} h={210} p={p} /><Curtain x={550} p={p} /><Curtain x={736} p={p} /></Layer>
      <Layer q={q(2)}><BedSet x={60} w={230} p={p} headY={250} /></Layer>
      <Layer q={q(3)}><Mattress x={60} w={230} p={p} /></Layer>
      <Layer q={q(4)}><BedSet x={320} w={230} p={p} headY={250} /><Mattress x={320} w={230} p={p} /></Layer>
      <Layer q={q(5)}><Pillow x={110} w={130} /><Pillow x={370} w={130} /></Layer>
      <Layer q={q(6)}>
        <circle cx={305} cy={258} r={40} fill="#FFE9A8" opacity={0.45} />
        <rect x={297} y={244} width={16} height={26} rx={4} fill="#FDE7B0" />
        <Art x={95} y={115} w={160} h={90} p={p} />
        <Art x={355} y={115} w={160} h={90} p={p} />
      </Layer>
    </>
  );
}

function ViewRoom({ p, q }: { p: AdPalette; q: Q }) {
  return (
    <>
      <Layer q={q(0)} from={0}><Base p={p} /></Layer>
      <Layer q={q(1)}><Window x={110} y={60} w={580} h={270} p={p} /></Layer>
      <Layer q={q(2)}><Curtain x={78} p={p} /><Curtain x={688} p={p} /></Layer>
      <Layer q={q(3)}>
        <rect x={60} y={392} width={330} height={66} rx={10} fill={p.wood} />
        <rect x={66} y={360} width={318} height={46} rx={16} fill={p.linen} />
        <rect x={66} y={380} width={318} height={14} fill={p.accent} />
        <rect x={84} y={334} width={92} height={34} rx={14} fill="#FFFFFF" stroke="#E2E8F0" strokeWidth={2} />
      </Layer>
      <Layer q={q(4)}>
        <rect x={470} y={330} width={250} height={52} rx={18} fill={p.accent} />
        <rect x={470} y={372} width={250} height={66} rx={14} fill={p.accent} opacity={0.85} />
        <rect x={458} y={350} width={30} height={88} rx={12} fill={p.accent} />
        <rect x={702} y={350} width={30} height={88} rx={12} fill={p.accent} />
      </Layer>
      <Layer q={q(5)}>
        <ellipse cx={500} cy={528} rx={210} ry={40} fill={p.accent} opacity={0.22} />
        <rect x={520} y={462} width={130} height={14} rx={4} fill={p.wood} />
        <rect x={532} y={476} width={8} height={36} fill={p.wood} />
        <rect x={630} y={476} width={8} height={36} fill={p.wood} />
      </Layer>
      <Layer q={q(6)}><Plant cx={40} /><circle cx={760} cy={300} r={46} fill="#FFE9A8" opacity={0.35} /><rect x={756} y={300} width={6} height={140} fill="#3F3F46" /><path d="M736 300 L784 300 L776 272 L744 272 Z" fill="#FDE7B0" /></Layer>
    </>
  );
}

function Exterior({ p, q, sign }: { p: AdPalette; q: Q; sign: string }) {
  const gid = useId().replace(/:/g, '');
  const floors = Array.from({ length: 8 }, (_, k) => k);
  return (
    <>
      <defs>
        <linearGradient id={`sky${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2547" />
          <stop offset="62%" stopColor="#4A4F7A" />
          <stop offset="100%" stopColor="#C98F7A" />
        </linearGradient>
      </defs>
      <Layer q={q(0)} from={0}>
        <rect x={0} y={0} width={800} height={600} fill={`url(#sky${gid})`} />
        {[[90, 70], [170, 130], [610, 60], [720, 150], [380, 50], [500, 95]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2} fill="#FFFFFF" opacity={0.7} />
        ))}
        <circle cx={660} cy={110} r={28} fill="#FDF3C7" />
        <rect x={40} y={300} width={140} height={220} fill="#2B3556" />
        <rect x={120} y={360} width={110} height={160} fill="#323D62" />
        <rect x={590} y={330} width={120} height={190} fill="#2B3556" />
        <rect x={680} y={270} width={100} height={250} fill="#323D62" />
        <rect x={0} y={520} width={800} height={80} fill="#151B30" />
        <rect x={0} y={556} width={800} height={4} fill="#F8D27A" opacity={0.5} />
      </Layer>
      {floors.map((k) => (
        <Layer key={k} q={q(1 + k)} from={28}>
          <rect x={270} y={476 - 44 * k} width={260} height={44} fill={k % 2 ? '#E9E2D6' : '#E2D9CA'} stroke="#CFC5B4" strokeWidth={1} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={286 + 48 * i} y={486 - 44 * k} width={34} height={24} rx={2} fill={(k * 7 + i * 3) % 5 ? '#FFD27A' : '#3A4466'} />
          ))}
        </Layer>
      ))}
      <Layer q={q(9)} from={16}>
        <rect x={364} y={482} width={72} height={38} fill="#3A2E25" />
        <path d="M344 482 L456 482 L446 466 L354 466 Z" fill={p.accent} />
        <rect x={398} y={486} width={4} height={34} fill="#FFD27A" opacity={0.6} />
      </Layer>
      <Layer q={q(10)} from={-30}>
        <rect x={262} y={150} width={276} height={18} fill="#C8BFB0" />
        <rect x={322} y={108} width={156} height={38} rx={4} fill={p.accent} />
        <text x={400} y={134} textAnchor="middle" fontSize={18} fontWeight={700} fill="#FFFFFF" fontFamily="Arial, sans-serif" letterSpacing={2}>
          {sign}
        </text>
      </Layer>
      <Layer q={q(11)} from={14}>
        {[200, 600].map((x) => (
          <g key={x}>
            <rect x={x - 4} y={470} width={8} height={50} fill="#4B3A2A" />
            <circle cx={x} cy={460} r={30} fill="#2F6B4F" />
          </g>
        ))}
        {[120, 690].map((x) => (
          <g key={x}>
            <circle cx={x} cy={452} r={22} fill="#FFE9A8" opacity={0.35} />
            <rect x={x - 2} y={452} width={4} height={68} fill="#9CA3AF" />
            <circle cx={x} cy={452} r={6} fill="#FFE9A8" />
          </g>
        ))}
      </Layer>
    </>
  );
}

export default function SceneArt({ kind, p, q, sign }: { kind: SceneKind; p: AdPalette; q: Q; sign: string }) {
  return (
    <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden>
      {kind === 'double' && <DoubleRoom p={p} q={q} />}
      {kind === 'twin' && <TwinRoom p={p} q={q} />}
      {kind === 'view' && <ViewRoom p={p} q={q} />}
      {kind === 'exterior' && <Exterior p={p} q={q} sign={sign} />}
    </svg>
  );
}
