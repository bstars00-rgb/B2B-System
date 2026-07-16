import { useState } from 'react';

interface Props {
  hotelId: string;
  alt: string;
  className?: string;
  /** 같은 호텔의 갤러리 n번째 사진 (기본 0 = 대표 사진) */
  variant?: number;
  width?: number;
  height?: number;
}

/** hotelId → 결정론적 시드 (같은 호텔은 항상 같은 사진) */
function seedOf(hotelId: string, variant: number): number {
  let h = 0;
  for (let i = 0; i < hotelId.length; i += 1) h = (h * 31 + hotelId.charCodeAt(i)) % 100000;
  return h + variant * 7;
}

/**
 * 호텔 사진 (mock) — 실제 예약 화면 느낌을 위한 실사진.
 * Picsum(안정 CDN, 시드 고정) → 실패 시 회색 자리표시자.
 */
export default function HotelPhoto({ hotelId, alt, className, variant = 0, width = 240, height = 176 }: Props) {
  const seed = seedOf(hotelId, variant);
  const sources = [`https://picsum.photos/seed/omh-${seed}/${width}/${height}`];
  const [idx, setIdx] = useState(0);

  if (idx >= sources.length) {
    return (
      <div className={`flex items-center justify-center bg-slate-200 text-[10px] text-slate-400 ${className ?? ''}`}>
        HOTEL PHOTO
      </div>
    );
  }
  return (
    <img
      src={sources[idx]}
      alt={alt}
      onError={() => setIdx((v) => v + 1)}
      className={`bg-slate-200 object-cover ${className ?? ''}`}
    />
  );
}
