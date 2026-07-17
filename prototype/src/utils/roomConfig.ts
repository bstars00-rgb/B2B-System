import type { SearchConditions } from '../types';

/** 룸별 인원 구성 (실사이트: Rooms N + Room 1/2… 각각 ADT·CHD·아동나이) */
export interface RoomCfg {
  adt: number;
  chd: number;
  ages: number[];
}

/**
 * 검색 조건(총 인원·객실 수) → 룸별 구성 재구성.
 * 성인은 균등 배분(나머지는 Room 1), 아동은 Room 1에 배치.
 *
 * ※ 운영 반영 시 과제: 검색 컨텍스트가 룸별 구성을 그대로 실어 나르면(현재는 합계만 보존)
 *   이 재구성 로직이 필요 없다 — 기획서 feature-split-room-booking.md §4.2 참조.
 */
export function cfgFromConditions(c: SearchConditions): RoomCfg[] {
  const n = Math.max(1, c.rooms ?? 1);
  const adults = Math.max(1, c.adults ?? 2);
  const children = Math.max(0, c.children ?? 0);
  const knownAges = c.child_ages && c.child_ages.length === children ? c.child_ages : null;
  const perRoom = Math.max(1, Math.floor(adults / n));
  return Array.from({ length: n }, (_, i) => {
    const adt = i === 0 ? Math.max(1, adults - perRoom * (n - 1)) : perRoom;
    const chd = i === 0 ? children : 0;
    return {
      adt,
      chd,
      ages: knownAges && i === 0 ? [...knownAges] : Array.from({ length: chd }, () => 1),
    };
  });
}

/** 룸 구성 요약 라벨 (슬롯 바 표기용) — "ADT 2 · CHD 1" */
export function cfgLabel(cfg: RoomCfg): string {
  return cfg.chd > 0 ? `ADT ${cfg.adt} · CHD ${cfg.chd}` : `ADT ${cfg.adt}`;
}

/** 모든 룸의 인원 구성이 동일한지 (같으면 [전체 슬롯에 담기] 제공) */
export function allSameOccupancy(cfgs: RoomCfg[]): boolean {
  if (cfgs.length <= 1) return true;
  const [first, ...rest] = cfgs;
  return rest.every(
    (c) => c.adt === first.adt && c.chd === first.chd && c.ages.join() === first.ages.join(),
  );
}
