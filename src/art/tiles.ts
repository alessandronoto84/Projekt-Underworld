import { Painter } from './painter';
import { P } from './palette';
import { hash2, mulberry32 } from '../core/rng';
import { TILE } from '../core/types';

/** Bodentypen. Reihenfolge von `priority` steuert, wer an Kanten "überlappt". */
export type GroundType =
  | 'grass' | 'grassDark' | 'dirt' | 'farm' | 'cobble' | 'pavement' | 'sand' | 'water'
  | 'wood' | 'tiles' | 'carpet' | 'wall' | 'void' | 'plank' | 'asphalt';

export const GROUND_PRIORITY: Partial<Record<GroundType, number>> = {
  grass: 3, grassDark: 3, dirt: 1, farm: 1, sand: 2,
};

export const SOLID_GROUND = new Set<GroundType>(['water', 'wall', 'void']);

/** Zeichnet ein 16x16-Bodentile. (tx,ty) steuern deterministische Variation. */
export function drawGround(p: Painter, ox: number, oy: number, type: GroundType, tx: number, ty: number): void {
  const r = mulberry32(((tx * 92821) ^ (ty * 68917) ^ type.length * 1013) >>> 0);
  const sp = (n: number, colors: string[]) => {
    for (let i = 0; i < n; i++) p.px(ox + ((r() * TILE) | 0), oy + ((r() * TILE) | 0), colors[(r() * colors.length) | 0]);
  };
  switch (type) {
    case 'grass':
    case 'grassDark': {
      const dark = type === 'grassDark';
      p.rect(ox, oy, TILE, TILE, dark ? P.g2 : P.g3);
      sp(10, dark ? [P.g1, P.g3] : [P.g2, P.g4]);
      // Grashalme
      const tufts = 1 + ((r() * 3) | 0);
      for (let i = 0; i < tufts; i++) {
        const x = ox + 1 + ((r() * 13) | 0), y = oy + 2 + ((r() * 12) | 0);
        const c = dark ? P.g1 : P.g2, hi = dark ? P.g3 : P.g4;
        p.px(x, y, c).px(x + 2, y, c).px(x + 1, y - 1, c).px(x + 1, y - 2, hi);
      }
      if (!dark && r() < 0.12) { // Blümchen
        const x = ox + 3 + ((r() * 10) | 0), y = oy + 3 + ((r() * 10) | 0);
        const fc = [P.white, P.y2, P.r3, P.v3][(r() * 4) | 0];
        p.px(x, y - 1, fc).px(x - 1, y, fc).px(x + 1, y, fc).px(x, y + 1, fc).px(x, y, P.y1);
      }
      break;
    }
    case 'dirt':
      p.rect(ox, oy, TILE, TILE, P.b3);
      sp(14, [P.b2, P.b4]);
      if (r() < 0.35) { const x = ox + ((r() * 13) | 0), y = oy + ((r() * 13) | 0); p.rect(x, y, 2, 1, P.s3).px(x, y + 1, P.s2); }
      break;
    case 'farm': {
      // Unbearbeiteter Acker: hellere, krümelige Erde mit Grasbüscheln und Steinchen
      p.rect(ox, oy, TILE, TILE, P.b3);
      sp(18, [P.b2, P.b4, P.b4]);
      if (r() < 0.55) { const x = ox + 2 + ((r() * 11) | 0), y = oy + 3 + ((r() * 10) | 0); p.px(x, y, P.g2).px(x + 1, y - 1, P.g3).px(x + 2, y, P.g2); }
      if (r() < 0.4) { const x = ox + 1 + ((r() * 13) | 0), y = oy + 1 + ((r() * 13) | 0); p.px(x, y, P.s3).px(x + 1, y, P.s2); }
      if (r() < 0.25) { const x = ox + 3 + ((r() * 9) | 0), y = oy + 4 + ((r() * 8) | 0); p.px(x, y, P.b1).px(x + 1, y + 1, P.b1); }
      break;
    }
    case 'cobble': {
      p.rect(ox, oy, TILE, TILE, P.s1);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
        const sx = ox + i * 8 + (j % 2 ? 4 : 0), sy = oy + j * 4;
        const c = hash2(tx * 2 + i, ty * 4 + j) < 0.5 ? P.s2 : P.s3;
        p.rect(sx + 1, sy + 1, 6, 2, c).hline(sx + 1, sy + 1, 6, hash2(tx, ty + j) < 0.5 ? P.s3 : P.s4);
        if (sx + 7 > ox + TILE) p.rect(ox, sy + 1, (sx + 7) - (ox + TILE), 2, c);
      }
      break;
    }
    case 'pavement':
      p.rect(ox, oy, TILE, TILE, P.s3);
      p.hline(ox, oy + 15, TILE, P.s2).vline(ox + 15, oy, TILE, P.s2);
      p.hline(ox, oy, TILE, P.s4);
      sp(5, [P.s2, P.s4]);
      break;
    case 'asphalt':
      p.rect(ox, oy, TILE, TILE, P.s0);
      sp(14, [P.s1, P.ink]);
      break;
    case 'sand':
      p.rect(ox, oy, TILE, TILE, P.sand1);
      sp(12, [P.sand0, P.cream]);
      break;
    case 'water':
      drawWater(p, ox, oy, tx, ty, 0);
      break;
    case 'wood':
    case 'plank': {
      const base = type === 'wood' ? P.b3 : P.b2, line = type === 'wood' ? P.b2 : P.b1, hi = type === 'wood' ? P.b4 : P.b3;
      p.rect(ox, oy, TILE, TILE, base);
      for (let j = 0; j < 4; j++) {
        p.hline(ox, oy + j * 4 + 3, TILE, line).hline(ox, oy + j * 4, TILE, hi);
        const seam = (hash2(tx, ty * 4 + j) * 14) | 0;
        p.vline(ox + seam, oy + j * 4, 3, line);
      }
      break;
    }
    case 'tiles':
      p.rect(ox, oy, TILE, TILE, P.cream);
      p.rect(ox + ((tx + ty) % 2 ? 0 : 8), oy, 8, 8, P.sand1).rect(ox + ((tx + ty) % 2 ? 8 : 0), oy + 8, 8, 8, P.sand1);
      p.hline(ox, oy + 15, TILE, P.sand0).vline(ox + 15, oy, TILE, P.sand0);
      break;
    case 'carpet':
      p.rect(ox, oy, TILE, TILE, P.r1);
      for (let i = 0; i < TILE; i += 4) for (let j = 0; j < TILE; j += 4) if ((i + j) % 8 === 0) p.px(ox + i + 1, oy + j + 1, P.r2);
      break;
    case 'wall':
      p.rect(ox, oy, TILE, TILE, P.v0);
      break;
    case 'void':
      p.rect(ox, oy, TILE, TILE, P.ink);
      break;
  }
}

export function drawWater(p: Painter, ox: number, oy: number, tx: number, ty: number, frame: number): void {
  p.rect(ox, oy, TILE, TILE, P.w2);
  const r = mulberry32((tx * 31 + ty * 17 + frame * 7) >>> 0);
  for (let i = 0; i < 3; i++) {
    const x = ox + ((r() * 12) | 0), y = oy + ((r() * 14) | 0);
    p.hline(x, y, 3, P.w3).px(x + 1, y - 1, P.w4);
  }
  for (let i = 0; i < 6; i++) p.px(ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), P.w1);
}

/** Weiche Übergänge: Gras franst über Erde/Wege aus. */
export function drawEdgeFringe(p: Painter, ox: number, oy: number, side: 'n' | 's' | 'e' | 'w', color: string, dark: string, tx: number, ty: number): void {
  for (let i = 0; i < TILE; i++) {
    const depth = 1 + ((hash2(tx * 16 + i, ty * 16 + side.charCodeAt(0)) * 3) | 0);
    for (let d = 0; d < depth; d++) {
      const c = d === depth - 1 ? dark : color;
      if (side === 'n') p.px(ox + i, oy + d, c);
      if (side === 's') p.px(ox + i, oy + TILE - 1 - d, c);
      if (side === 'w') p.px(ox + d, oy + i, c);
      if (side === 'e') p.px(ox + TILE - 1 - d, oy + i, c);
    }
  }
}

/** Bearbeiteter Ackerboden (wird über den Boden gelegt). */
export function drawTilledSoil(p: Painter, ox: number, oy: number, watered: boolean, tx: number, ty: number): void {
  const base = watered ? P.soil0 : P.soil2, line = watered ? P.ink : P.soil1, hi = watered ? P.soil1 : P.soil3;
  p.rect(ox + 1, oy + 1, 14, 14, base);
  p.hline(ox + 2, oy + 1, 12, hi);
  for (let j = 0; j < 3; j++) p.hline(ox + 2, oy + 4 + j * 4, 12, line).hline(ox + 2, oy + 5 + j * 4, 12, hi);
  p.px(ox + 1, oy + 1, P.outline).px(ox + 14, oy + 1, P.outline).px(ox + 1, oy + 14, P.outline).px(ox + 14, oy + 14, P.outline);
  if (watered) for (let i = 0; i < 3; i++) p.px(ox + 3 + ((hash2(tx, ty, i) * 10) | 0), oy + 3 + ((hash2(ty, tx, i) * 10) | 0), P.w1);
}
