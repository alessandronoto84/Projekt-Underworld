export type Dir = 'down' | 'up' | 'left' | 'right';

export interface Vec { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export const TILE = 16;

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function dirVec(d: Dir): Vec {
  switch (d) {
    case 'down': return { x: 0, y: 1 };
    case 'up': return { x: 0, y: -1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}

export const tileKey = (tx: number, ty: number): string => `${tx},${ty}`;
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
