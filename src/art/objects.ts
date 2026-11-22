import { Painter } from './painter';
import { P } from './palette';
import { mulberry32 } from '../core/rng';
import { darken, lighten } from './characters';

/* ------------------------------------------------------------------ Natur */

export function drawTree(kind: 'oak' | 'pine' | 'birch', seed: number): HTMLCanvasElement {
  const p = new Painter(32, 48);
  const r = mulberry32(seed);
  if (kind === 'pine') {
    p.rect(14, 36, 4, 10, P.b2).vline(17, 36, 10, P.b1);
    const layers = [[16, 34, 13, 6], [16, 27, 11, 6], [16, 20, 9, 5], [16, 13, 6, 5], [16, 7, 3, 4]];
    layers.forEach(([cx, cy, rx, ry], i) => {
      p.ellipse(cx, cy, rx, ry, P.g1);
      p.ellipse(cx - 1, cy - 1, rx - 2, ry - 2, i % 2 ? P.g2 : P.g1);
      p.ellipse(cx - 3, cy - 2, Math.max(1, rx - 7), Math.max(1, ry - 3), P.g2);
    });
    for (let i = 0; i < 14; i++) p.px(6 + ((r() * 20) | 0), 6 + ((r() * 30) | 0), P.g3);
  } else {
    const bark = kind === 'birch' ? P.cream : P.b2, barkShade = kind === 'birch' ? P.s3 : P.b1;
    p.rect(13, 30, 6, 16, bark).vline(18, 30, 16, barkShade).rect(11, 44, 10, 2, bark).px(12, 43, bark).px(19, 43, bark);
    if (kind === 'birch') for (let i = 0; i < 5; i++) p.hline(13 + ((r() * 3) | 0), 32 + i * 3, 2, P.ink);
    else p.px(15, 36, P.b1).px(16, 40, P.b1);
    const lo = kind === 'birch' ? P.g2 : P.g1, mid = kind === 'birch' ? P.g3 : P.g2, hi = kind === 'birch' ? P.g4 : P.g3, top = kind === 'birch' ? P.g5 : P.g4;
    p.ellipse(16, 22, 15, 13, lo);
    p.ellipse(9, 24, 7, 6, lo).ellipse(23, 25, 7, 6, lo);
    p.ellipse(15, 19, 12, 10, mid);
    p.ellipse(13, 15, 8, 6, hi);
    p.ellipse(11, 12, 4, 3, top);
    for (let i = 0; i < 26; i++) {
      const x = 4 + ((r() * 24) | 0), y = 8 + ((r() * 24) | 0);
      p.px(x, y, r() < 0.5 ? mid : hi);
    }
    for (let i = 0; i < 10; i++) p.px(6 + ((r() * 20) | 0), 26 + ((r() * 8) | 0), P.g0);
  }
  p.outline();
  return p.canvas;
}

export function drawBush(seed: number, berries = false): HTMLCanvasElement {
  const p = new Painter(20, 16);
  const r = mulberry32(seed);
  p.ellipse(10, 9, 9, 6, P.g1).ellipse(9, 8, 7, 5, P.g2).ellipse(7, 6, 4, 3, P.g3);
  for (let i = 0; i < 8; i++) p.px(3 + ((r() * 14) | 0), 4 + ((r() * 8) | 0), P.g4);
  if (berries) for (let i = 0; i < 5; i++) p.px(4 + ((r() * 12) | 0), 6 + ((r() * 6) | 0), P.r2);
  p.outline();
  return p.canvas;
}

export function drawRock(seed: number): HTMLCanvasElement {
  const p = new Painter(16, 12);
  const r = mulberry32(seed);
  p.ellipse(8, 7, 6, 4, P.s2).ellipse(7, 6, 4, 3, P.s3).hline(5, 4, 3, P.s4);
  for (let i = 0; i < 4; i++) p.px(4 + ((r() * 8) | 0), 6 + ((r() * 3) | 0), P.s1);
  p.outline();
  return p.canvas;
}

export function drawFlowers(seed: number): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const r = mulberry32(seed);
  const cols = [P.r3, P.y2, P.v3, P.white, P.pink];
  for (let i = 0; i < 5; i++) {
    const x = 2 + ((r() * 11) | 0), y = 4 + ((r() * 9) | 0);
    p.vline(x, y + 1, 3, P.g2);
    const c = cols[(r() * cols.length) | 0];
    p.px(x, y, c).px(x - 1, y + 1, c).px(x + 1, y + 1, c).px(x, y + 1, P.y1);
  }
  return p.canvas;
}

export function drawTallGrass(seed: number): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const r = mulberry32(seed);
  for (let i = 0; i < 7; i++) {
    const x = 1 + ((r() * 14) | 0), h = 4 + ((r() * 6) | 0);
    p.vline(x, 15 - h, h, r() < 0.5 ? P.g2 : P.g3).px(x, 15 - h, P.g4);
  }
  return p.canvas;
}

/* --------------------------------------------------------------- Stadtmöbel */

export function drawFence(variant: 'h' | 'post'): HTMLCanvasElement {
  const p = new Painter(16, 20);
  if (variant === 'h') {
    p.rect(0, 8, 16, 2, P.b4).rect(0, 13, 16, 2, P.b3);
    p.rect(1, 5, 3, 13, P.b4).vline(3, 5, 13, P.b2).rect(12, 5, 3, 13, P.b4).vline(14, 5, 13, P.b2);
  } else {
    p.rect(6, 5, 4, 13, P.b4).vline(9, 5, 13, P.b2);
  }
  p.outline();
  return p.canvas;
}

export function drawLampPost(): HTMLCanvasElement {
  const p = new Painter(12, 36);
  p.rect(5, 8, 2, 26, P.s1).rect(3, 33, 6, 2, P.s1);
  p.rect(2, 2, 8, 7, P.s1).rect(3, 3, 6, 5, P.y2).rect(4, 4, 2, 2, P.y3).hline(1, 1, 10, P.s1);
  p.outline();
  return p.canvas;
}

export function drawSign(color: string = P.b4): HTMLCanvasElement {
  const p = new Painter(16, 20);
  p.rect(7, 10, 2, 9, P.b2);
  p.rect(1, 2, 14, 9, color).hline(1, 10, 14, darken(color)).hline(3, 5, 10, darken(color)).hline(3, 7, 7, darken(color));
  p.outline();
  return p.canvas;
}

export function drawMailbox(): HTMLCanvasElement {
  const p = new Painter(12, 20);
  p.rect(5, 9, 2, 10, P.b2);
  p.rect(1, 3, 10, 7, P.r2).hline(1, 3, 10, P.r3).hline(1, 9, 10, P.r1).rect(10, 1, 1, 4, P.r3);
  p.outline();
  return p.canvas;
}

export function drawBarrel(): HTMLCanvasElement {
  const p = new Painter(14, 18);
  p.rect(2, 2, 10, 14, P.b3).rect(1, 4, 12, 10, P.b3).vline(11, 3, 12, P.b2).vline(4, 3, 12, P.b4);
  p.hline(1, 5, 12, P.s2).hline(1, 12, 12, P.s2).ellipse(7, 2, 5, 1, P.b2);
  p.outline();
  return p.canvas;
}

export function drawCrate(): HTMLCanvasElement {
  const p = new Painter(16, 16);
  p.rect(1, 2, 14, 13, P.b4).rect(2, 3, 12, 11, P.b3);
  p.hline(1, 2, 14, P.b5).hline(1, 8, 14, P.b4);
  for (let i = 0; i < 4; i++) p.px(3 + i * 3, 4 + i * 1, P.b4);
  p.outline();
  return p.canvas;
}

export function drawBench(): HTMLCanvasElement {
  const p = new Painter(32, 18);
  p.rect(2, 3, 28, 3, P.b4).rect(2, 8, 28, 3, P.b4).hline(2, 5, 28, P.b2).hline(2, 10, 28, P.b2);
  p.rect(4, 11, 2, 6, P.s1).rect(26, 11, 2, 6, P.s1).rect(4, 6, 2, 2, P.s1).rect(26, 6, 2, 2, P.s1);
  p.outline();
  return p.canvas;
}

export function drawTrashBin(): HTMLCanvasElement {
  const p = new Painter(14, 18);
  p.rect(2, 4, 10, 13, P.g1).vline(11, 4, 13, P.g0).vline(4, 5, 11, P.g2).vline(7, 5, 11, P.g2);
  p.rect(1, 2, 12, 3, P.g2).hline(5, 1, 4, P.g1);
  p.outline();
  return p.canvas;
}

export function drawBusStop(): HTMLCanvasElement {
  const p = new Painter(16, 36);
  p.rect(7, 10, 2, 25, P.s2);
  p.ellipse(8, 7, 6, 6, P.y1).ellipse(8, 7, 4, 4, P.y2).rect(6, 5, 4, 1, P.ink).rect(6, 8, 4, 1, P.ink).rect(6, 5, 1, 4, P.ink).rect(9, 5, 1, 4, P.ink);
  p.outline();
  return p.canvas;
}

export function drawCar(color: string): HTMLCanvasElement {
  const p = new Painter(40, 24);
  const sh = darken(color);
  p.rect(2, 9, 36, 9, color).rect(9, 3, 20, 8, color).hline(2, 17, 36, sh).vline(37, 9, 9, sh);
  p.rect(11, 4, 7, 5, P.w3).rect(20, 4, 7, 5, P.w3).px(12, 5, P.w4).px(21, 5, P.w4);
  p.rect(1, 11, 2, 3, P.y2).rect(37, 11, 2, 3, P.r2);
  p.ellipse(10, 18, 4, 4, P.ink).ellipse(30, 18, 4, 4, P.ink).px(10, 18, P.s3).px(30, 18, P.s3);
  p.outline();
  return p.canvas;
}

/* ---------------------------------------------------------------- Gebäude */

export interface BuildingSpec {
  widthTiles: number;
  wallH: number;   // Wandhöhe in px
  roofH: number;   // Dachhöhe in px
  wall: string; wallShade: string; wallStyle: 'planks' | 'brick' | 'stucco' | 'metal';
  roof: string; roofShade: string; roofStyle?: 'shingle' | 'flat';
  door: number;    // Tür-Spalte in Tiles
  doorColor?: string;
  windows?: number[]; // Fenster-Spalten in Tiles
  awning?: string;
  neon?: string;   // Leuchtschild-Farbe
  chimney?: boolean;
  signColor?: string;
}

export function drawBuilding(s: BuildingSpec): HTMLCanvasElement {
  const W = s.widthTiles * 16;
  const H = s.roofH + s.wallH;
  const p = new Painter(W + 8, H + 6);
  const ox = 4, oy = 4;
  const wy = oy + s.roofH; // Wandoberkante
  const r = mulberry32(W * 7 + H);

  // Wand
  p.rect(ox, wy, W, s.wallH, s.wall);
  if (s.wallStyle === 'planks') {
    for (let y = wy + 3; y < wy + s.wallH; y += 4) p.hline(ox, y, W, s.wallShade);
    for (let i = 0; i < W / 6; i++) p.px(ox + ((r() * W) | 0), wy + ((r() * s.wallH) | 0), lighten(s.wall));
  } else if (s.wallStyle === 'brick') {
    for (let y = wy; y < wy + s.wallH; y += 4) {
      p.hline(ox, y + 3, W, s.wallShade);
      for (let x = ((y / 4) % 2 ? 0 : 4); x < W; x += 8) p.vline(ox + x, y, 3, s.wallShade);
    }
  } else if (s.wallStyle === 'metal') {
    for (let x = 0; x < W; x += 4) p.vline(ox + x, wy, s.wallH, s.wallShade);
  } else {
    for (let i = 0; i < W / 3; i++) p.px(ox + ((r() * W) | 0), wy + ((r() * s.wallH) | 0), s.wallShade);
  }
  p.hline(ox, wy + s.wallH - 2, W, darken(s.wallShade)).hline(ox, wy + s.wallH - 1, W, darken(s.wallShade));

  // Fenster
  for (const wx of s.windows ?? []) {
    const x = ox + wx * 16 + 3, y = wy + Math.max(4, s.wallH - 22);
    p.rect(x - 1, y - 1, 12, 11, P.b1).rect(x, y, 10, 9, P.w1).rect(x, y, 10, 4, P.w2);
    p.vline(x + 5, y, 9, P.b1).hline(x, y + 4, 10, P.b1).px(x + 1, y + 1, P.w4).px(x + 2, y + 1, P.w3);
    p.hline(x - 2, y + 10, 14, s.wallShade);
    if (s.awning === undefined) { p.rect(x - 1, y + 11, 3, 2, P.g3).rect(x + 7, y + 11, 3, 2, P.r3); }
  }

  // Tür
  const dx = ox + s.door * 16 + 2, dh = Math.min(22, s.wallH - 3), dy = wy + s.wallH - dh - 1;
  const dc = s.doorColor ?? P.b2;
  p.rect(dx - 1, dy - 1, 14, dh + 1, darken(dc)).rect(dx, dy, 12, dh, dc);
  p.rect(dx + 2, dy + 2, 8, 6, lighten(dc)).rect(dx + 2, dy + 10, 8, dh - 13, lighten(dc));
  p.px(dx + 9, dy + dh / 2 + 1, P.y2);
  p.rect(dx - 2, wy + s.wallH - 1, 16, 1, P.s3);

  // Markise
  if (s.awning) {
    const ay = wy + 2;
    for (let x = 0; x < W; x += 8) p.rect(ox + x, ay, 4, 6, s.awning).rect(ox + x + 4, ay, 4, 6, P.white);
    p.hline(ox, ay + 6, W, darken(s.awning));
    for (let x = 0; x < W; x += 4) p.px(ox + x + 1, ay + 7, x % 8 === 0 ? s.awning : P.white);
  }

  // Dach
  if (s.roofStyle === 'flat') {
    p.rect(ox - 2, oy + s.roofH - 8, W + 4, 8, s.roof).hline(ox - 2, oy + s.roofH - 1, W + 4, s.roofShade).hline(ox - 2, oy + s.roofH - 8, W + 4, lighten(s.roof));
    if (s.roofH > 8) p.rect(ox + 6, oy + s.roofH - 14, 10, 6, P.s2).rect(ox + W - 22, oy + s.roofH - 12, 8, 4, P.s2);
  } else {
    for (let y = 0; y < s.roofH; y++) {
      const inset = Math.max(0, Math.round((s.roofH - y) * 0.45) - 2);
      const x0 = ox - 3 + inset, w = W + 6 - inset * 2;
      const row = Math.floor(y / 4);
      p.hline(x0, oy + y, w, y % 4 === 3 ? s.roofShade : s.roof);
      if (y % 4 !== 3) for (let x = (row % 2) * 4; x < w; x += 8) p.px(x0 + x, oy + y, s.roofShade);
    }
    p.hline(ox - 3, oy + s.roofH - 1, W + 6, darken(s.roofShade));
    const ridgeInset = Math.max(0, Math.round(s.roofH * 0.45) - 2);
    p.hline(ox - 3 + ridgeInset, oy, W + 6 - ridgeInset * 2, lighten(s.roof));
  }
  if (s.chimney) {
    const cx = ox + W - 20;
    p.rect(cx, oy - 2, 7, 12, P.r1).hline(cx - 1, oy - 3, 9, P.s2).hline(cx, oy + 3, 7, P.r0);
  }

  // Leuchtschild
  if (s.neon) {
    const nx = ox + W / 2 - 14, ny = wy - 6;
    p.rect(nx, ny, 28, 9, P.ink).rect(nx + 2, ny + 2, 24, 5, darken(s.neon));
    p.hline(nx + 3, ny + 3, 22, s.neon).hline(nx + 3, ny + 5, 14, s.neon).px(nx + 22, ny + 5, P.white);
  } else if (s.signColor) {
    const nx = ox + s.door * 16 - 4, ny = wy - 3;
    p.rect(nx, ny, 24, 7, s.signColor).hline(nx, ny + 6, 24, darken(s.signColor)).hline(nx + 3, ny + 3, 18, P.cream);
  }

  p.outline();
  return p.canvas;
}

/* ------------------------------------------------------------ Innenräume */

export function drawBed(): HTMLCanvasElement {
  const p = new Painter(18, 30);
  p.rect(1, 1, 16, 27, P.b2).rect(1, 1, 16, 5, P.b3).hline(1, 1, 16, P.b4);
  p.rect(2, 6, 14, 21, P.white).rect(3, 7, 12, 5, P.cream);
  p.rect(2, 13, 14, 14, P.v2).hline(2, 13, 14, P.v3).hline(2, 26, 14, P.v1);
  for (let i = 0; i < 6; i++) p.px(4 + i * 2, 17 + (i % 2) * 4, P.v1);
  p.outline();
  return p.canvas;
}

export function drawTable(): HTMLCanvasElement {
  const p = new Painter(28, 22);
  p.rect(1, 3, 26, 10, P.b3).hline(1, 3, 26, P.b4).hline(1, 12, 26, P.b1);
  p.rect(2, 13, 3, 8, P.b2).rect(23, 13, 3, 8, P.b2);
  p.rect(10, 1, 6, 4, P.white).rect(11, 2, 4, 2, P.y0);
  p.outline();
  return p.canvas;
}

export function drawChair(): HTMLCanvasElement {
  const p = new Painter(12, 18);
  p.rect(2, 1, 8, 8, P.b3).hline(2, 1, 8, P.b4).rect(2, 9, 8, 3, P.b4).rect(2, 12, 2, 5, P.b2).rect(8, 12, 2, 5, P.b2);
  p.outline();
  return p.canvas;
}

export function drawShelf(goods: string[]): HTMLCanvasElement {
  const p = new Painter(32, 30);
  p.rect(1, 1, 30, 28, P.b2).rect(2, 2, 28, 26, P.b1);
  for (let row = 0; row < 3; row++) {
    const y = 3 + row * 9;
    p.hline(2, y + 7, 28, P.b3);
    for (let i = 0; i < 6; i++) {
      const c = goods[(row * 6 + i) % goods.length];
      p.rect(3 + i * 4 + (row % 2), y + 2, 3, 5, c).px(3 + i * 4 + (row % 2), y + 2, lighten(c));
    }
  }
  p.outline();
  return p.canvas;
}

export function drawCounter(widthTiles: number, top: string = P.b4, front: string = P.b2): HTMLCanvasElement {
  const W = widthTiles * 16;
  const p = new Painter(W, 24);
  p.rect(0, 2, W, 6, top).hline(0, 2, W, lighten(top)).rect(0, 8, W, 15, front).hline(0, 8, W, darken(front));
  for (let x = 6; x < W; x += 16) p.rect(x, 11, 4, 9, darken(front));
  p.outline();
  return p.canvas;
}

export function drawStool(): HTMLCanvasElement {
  const p = new Painter(10, 14);
  p.ellipse(5, 3, 4, 2, P.r2).hline(2, 2, 6, P.r3).rect(4, 5, 2, 7, P.s2).hline(2, 12, 6, P.s2);
  p.outline();
  return p.canvas;
}

export function drawPlantPot(): HTMLCanvasElement {
  const p = new Painter(14, 22);
  p.rect(3, 14, 8, 7, P.r1).hline(2, 14, 10, P.r2);
  p.ellipse(7, 8, 6, 6, P.g2).ellipse(6, 6, 3, 3, P.g3).px(4, 4, P.g4);
  p.outline();
  return p.canvas;
}

export function drawFridge(): HTMLCanvasElement {
  const p = new Painter(16, 30);
  p.rect(1, 1, 14, 28, P.s4).vline(14, 1, 28, P.s3).hline(1, 11, 14, P.s3).rect(11, 4, 1, 5, P.s2).rect(11, 14, 1, 7, P.s2);
  p.outline();
  return p.canvas;
}

export function drawStove(): HTMLCanvasElement {
  const p = new Painter(16, 22);
  p.rect(1, 2, 14, 19, P.s3).rect(1, 2, 14, 5, P.s2).ellipse(5, 4, 2, 1, P.ink).ellipse(11, 4, 2, 1, P.ink);
  p.rect(3, 10, 10, 8, P.s1).rect(4, 11, 8, 2, P.s2);
  p.outline();
  return p.canvas;
}

export function drawTV(): HTMLCanvasElement {
  const p = new Painter(20, 20);
  p.rect(1, 1, 18, 13, P.ink).rect(2, 2, 16, 11, P.v0).px(4, 4, P.v2).px(5, 4, P.v2);
  p.rect(4, 14, 12, 5, P.b2).hline(4, 14, 12, P.b3);
  p.outline();
  return p.canvas;
}

export function drawRug(w: number, h: number, c: string, c2: string): HTMLCanvasElement {
  const p = new Painter(w, h);
  p.rect(0, 0, w, h, c).rect(2, 2, w - 4, h - 4, c2).rect(4, 4, w - 8, h - 8, c);
  for (let x = 6; x < w - 6; x += 4) p.px(x, h / 2, c2);
  return p.canvas;
}

export function drawWindowWall(night: boolean): HTMLCanvasElement {
  const p = new Painter(16, 16);
  p.rect(2, 2, 12, 11, P.b1).rect(3, 3, 10, 9, night ? P.v0 : P.w3).rect(3, 3, 10, 4, night ? P.v1 : P.w4);
  p.vline(8, 3, 9, P.b1).hline(3, 7, 10, P.b1).hline(1, 13, 14, P.b3);
  return p.canvas;
}

export function drawPoster(c: string): HTMLCanvasElement {
  const p = new Painter(12, 14);
  p.rect(1, 1, 10, 12, c).rect(3, 3, 6, 5, darken(c)).hline(3, 10, 6, P.cream);
  p.outline();
  return p.canvas;
}

export function drawJukebox(): HTMLCanvasElement {
  const p = new Painter(18, 28);
  p.rect(2, 4, 14, 22, P.r1).ellipse(9, 6, 7, 5, P.r2).rect(4, 8, 10, 8, P.y2).rect(5, 9, 8, 6, P.y1);
  for (let i = 0; i < 4; i++) p.hline(5, 18 + i * 2, 8, i % 2 ? P.teal : P.pink);
  p.outline();
  return p.canvas;
}

export function drawDoormat(): HTMLCanvasElement {
  const p = new Painter(16, 8);
  p.rect(1, 1, 14, 6, P.r1).rect(2, 2, 12, 4, P.r2).hline(3, 4, 10, P.r1);
  return p.canvas;
}

export function drawChest(): HTMLCanvasElement {
  const p = new Painter(16, 16);
  p.rect(1, 3, 14, 12, P.b3).rect(1, 3, 14, 5, P.b4).hline(1, 8, 14, P.b1).hline(1, 3, 14, P.b5);
  p.rect(7, 7, 2, 3, P.y2).vline(3, 3, 12, P.b2).vline(12, 3, 12, P.b2);
  p.outline();
  return p.canvas;
}

export function drawLaptop(): HTMLCanvasElement {
  const p = new Painter(14, 10);
  p.rect(2, 0, 10, 6, P.s1).rect(3, 1, 8, 4, P.teal).hline(4, 2, 4, P.white).rect(1, 6, 12, 2, P.s2);
  return p.canvas;
}

/* ------------------------------------------------------------- Maschinen */

export function drawDryingRack(state: 'idle' | 'working' | 'done', herb: string = P.g4): HTMLCanvasElement {
  const p = new Painter(22, 32);
  // Kleines Schrägdach
  for (let i = 0; i < 5; i++) p.hline(1 + i, 2 + i, 20 - i * 2, i % 2 ? P.r1 : P.r2);
  p.hline(0, 7, 22, P.r0);
  // Pfosten
  p.rect(3, 7, 2, 23, P.b3).rect(17, 7, 2, 23, P.b3).vline(4, 7, 23, P.b2).vline(18, 7, 23, P.b2);
  // Stangen
  for (let i = 0; i < 2; i++) p.hline(5, 11 + i * 8, 12, P.b4).hline(5, 12 + i * 8, 12, P.b2);
  // Wanne unten
  p.rect(2, 26, 18, 3, P.b2).hline(2, 26, 18, P.b4);
  if (state !== 'idle') {
    const c = state === 'done' ? P.y1 : P.g3, dark = state === 'done' ? P.y0 : P.g2, tip = state === 'done' ? P.y2 : herb;
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
      const x = 6 + i * 3 + (row % 2), y = 13 + row * 8;
      p.vline(x, y, 5, c).px(x + 1, y + 1, dark).px(x - 1, y + 2, dark).px(x, y + 5, tip);
    }
  }
  p.outline();
  return p.canvas;
}

export function drawWorkbench(): HTMLCanvasElement {
  const p = new Painter(32, 26);
  p.rect(1, 6, 30, 5, P.b4).hline(1, 6, 30, P.b5).rect(2, 11, 3, 14, P.b2).rect(27, 11, 3, 14, P.b2).hline(2, 19, 28, P.b2);
  p.rect(5, 2, 6, 4, P.s2).rect(20, 3, 8, 3, P.r2).rect(14, 4, 3, 2, P.y1);
  p.outline();
  return p.canvas;
}

/* ---------------------------------------------------------------- Pflanzen */

export type CropArt = 'cannabis' | 'kush' | 'tomate';

/** stage 0 = frisch gepflanzt … maxStage = erntereif */
export function drawCrop(kind: CropArt, stage: number, maxStage: number): HTMLCanvasElement {
  const p = new Painter(16, 26);
  const ripe = stage >= maxStage;
  const t = stage / maxStage;
  if (stage === 0) {
    // Frischer Steckling
    p.ellipse(8, 22, 3, 1, P.soil3);
    p.vline(8, 18, 4, P.g3);
    fanLeaf(p, 8, 18, 2, P.g3, P.g4);
    p.outline();
    return p.canvas;
  }
  if (kind === 'cannabis' || kind === 'kush') {
    const kush = kind === 'kush';
    const lvl = Math.max(1, Math.min(3, stage));
    const leaves: [number, number, number, string, string][] =
      lvl === 1 ? [[8, 23, 4, P.g4, P.g5]]
      : lvl === 2 ? [[4, 24, 4, P.g3, P.g4], [12, 24, 4, P.g3, P.g4], [8, 17, 4, P.g4, P.g5]]
      : [[4, 25, 4, P.g3, P.g4], [12, 25, 4, P.g3, P.g4], [3, 18, 2, P.g3, P.g4], [13, 18, 2, P.g3, P.g4], [8, 15, 4, P.g4, P.g5]];
    const top = lvl === 1 ? 17 : lvl === 2 ? 11 : 8;
    p.vline(8, top, 25 - top, P.g1);
    // Keine Kontur: die Lücken zwischen den Blattfingern bleiben sichtbar
    for (const [x, y, L, c, hi] of leaves) fanLeaf(p, x, y, L, c, hi);
    if (ripe) {
      // Blütenstand (Cola) mit Härchen und „Frost“
      const bud = kush ? P.v3 : P.g4, budD = kush ? P.v2 : P.g2, frost = kush ? P.white : P.g5;
      p.rect(7, 2, 3, 7, bud).rect(6, 4, 5, 4, bud).hline(6, 8, 5, budD).vline(10, 4, 4, budD);
      p.px(8, 1, frost).px(7, 3, frost).px(9, 5, frost).px(6, 5, P.y1).px(10, 4, P.y1).px(8, 7, P.y0).px(7, 6, P.y1);
      for (const [bx, by] of [[3, 13], [13, 13]]) p.rect(bx - 1, by - 1, 3, 2, bud).px(bx - 1, by - 1, frost).px(bx + 1, by, P.y1);
    }
    return p.canvas;
  } else {
    const h = 4 + Math.round(t * 9);
    p.vline(8, 22 - h, h, P.g2).vline(5, 22 - h + 3, h - 3, P.b3).vline(11, 22 - h + 3, h - 3, P.b3);
    p.ellipse(8, 23 - h + 3, 5, Math.max(1, Math.round(h / 3)), P.g2).ellipse(7, 22 - h + 2, 3, 2, P.g3);
    if (t > 0.4) for (const [x, y] of [[4, 3], [12, 2], [8, 6]]) p.px(x, 22 - h + y, ripe ? P.r2 : P.g4);
    if (ripe) for (const [x, y] of [[4, 4], [11, 3], [7, 7], [10, 8]]) p.ellipse(x, 22 - h + y, 1, 1, P.r2).px(x - 1, 22 - h + y - 1, P.r3);
  }
  p.outline();
  return p.canvas;
}

/** Handgesetztes Cannabis-Blatt (9×8, sieben Finger). Ursprung = Blattansatz unten Mitte. */
const LEAF_BIG = [
  '....h....',
  '.h..l..h.',
  '..l.l.l..',
  'h..lll..h',
  '.ll.l.ll.',
  '..lllll..',
  '.l..s..l.',
  '....s....',
];
const LEAF_SMALL = [
  '..h..',
  'h.l.h',
  '.lll.',
  'l.l.l',
  '..s..',
];

/** Gefingertes Blatt. L ≥ 4 → großes Blatt, sonst kleines. (cx,cy) = Blattansatz. */
function fanLeaf(p: Painter, cx: number, cy: number, L: number, c: string, hi: string): void {
  const pat = L >= 4 ? LEAF_BIG : LEAF_SMALL;
  const w = pat[0].length, h = pat.length;
  p.pattern(cx - (w >> 1), cy - h + 1, pat, { l: c, h: hi, s: P.g1 });
}

/* ------------------------------------------------------------------ Items */

export type IconKind =
  | 'hoe' | 'can' | 'seedBag' | 'clone' | 'budFresh' | 'budBag' | 'tomato' | 'kit' | 'pills' | 'brick' | 'baggie'
  | 'rackItem' | 'pressItem' | 'packItem' | 'sandwich' | 'coffee' | 'letter' | 'coin'
  | 'mushroom' | 'mushroomBag' | 'bottle' | 'watch' | 'notebook' | 'keys';

export function drawIcon(kind: IconKind, tint: string = P.g3): HTMLCanvasElement {
  const p = new Painter(16, 16);
  switch (kind) {
    case 'hoe':
      for (let i = 0; i < 10; i++) p.px(4 + i, 13 - i, P.b3).px(5 + i, 13 - i, P.b2);
      p.rect(10, 2, 5, 2, P.s3).rect(13, 2, 2, 4, P.s3).px(14, 5, P.s4);
      break;
    case 'can':
      p.rect(3, 6, 8, 7, P.w2).hline(3, 6, 8, P.w3).vline(10, 6, 7, P.w1);
      for (let i = 0; i < 4; i++) p.px(11 + i, 7 - i, P.w2);
      p.px(14, 3, P.w4).rect(4, 3, 6, 1, P.s2).vline(4, 3, 3, P.s2).vline(9, 3, 3, P.s2);
      break;
    case 'seedBag':
      p.rect(4, 5, 8, 9, P.cream).hline(4, 13, 8, P.sand0).rect(5, 3, 6, 2, P.sand0).px(4, 4, P.sand0).px(11, 4, P.sand0);
      p.ellipse(8, 9, 2, 2, tint).px(7, 8, lighten(tint));
      break;
    case 'clone':
      p.rect(5, 10, 6, 4, P.r1).hline(4, 10, 8, P.r2).hline(5, 13, 6, P.r0);
      p.vline(8, 6, 4, P.g2);
      fanLeaf(p, 8, 7, 2, P.g3, tint === P.g3 ? P.g4 : tint);
      break;
    case 'budFresh':
      fanLeaf(p, 8, 12, 3, P.g2, P.g3);
      p.ellipse(8, 8, 3, 4, tint === P.g3 ? P.g3 : P.v2).ellipse(7, 7, 2, 2, tint === P.g3 ? P.g4 : tint).px(6, 9, P.y1).px(10, 7, P.y1).px(8, 5, tint === P.g3 ? P.g5 : P.white).px(9, 10, P.y0);
      p.vline(8, 12, 3, P.g1);
      break;
    case 'budBag':
      p.rect(3, 4, 10, 10, P.white).rect(4, 5, 8, 8, P.w4).hline(3, 4, 10, P.r2).hline(3, 5, 10, P.s4);
      p.ellipse(7, 10, 2, 2, tint === P.g3 ? P.g3 : P.v2).ellipse(10, 9, 2, 2, tint === P.g3 ? P.g4 : tint).px(6, 9, P.g5).px(9, 11, P.y1).px(11, 8, P.g5);
      break;
    case 'tomato':
      p.ellipse(8, 9, 5, 4, P.r2).ellipse(6, 8, 2, 2, P.r3).px(5, 7, P.r4);
      p.hline(6, 4, 5, P.g3).px(8, 3, P.g2).px(5, 5, P.g3).px(11, 5, P.g3);
      break;
    case 'kit':
      p.rect(2, 5, 12, 9, P.b4).hline(2, 5, 12, P.b5).vline(13, 5, 9, P.b3).rect(7, 5, 2, 9, P.sand1);
      p.rect(3, 9, 4, 3, tint).hline(9, 10, 3, P.b3).hline(9, 12, 3, P.b3);
      break;
    case 'pills':
      for (const [x, y, c] of [[5, 6, tint], [10, 7, P.teal], [7, 11, P.y2]] as const) {
        p.ellipse(x, y, 2, 2, c).px(x - 1, y - 1, lighten(c)).px(x, y, darken(c));
      }
      break;
    case 'brick':
      p.rect(2, 5, 12, 8, P.cream).hline(2, 5, 12, P.white).vline(13, 5, 8, P.sand0).hline(2, 12, 12, P.sand0);
      p.rect(2, 8, 12, 2, P.y1).rect(7, 5, 2, 8, P.y1).px(4, 6, P.sand0).px(11, 11, P.sand0);
      break;
    case 'baggie':
      p.rect(4, 4, 8, 9, P.w4).hline(4, 4, 8, P.r2).hline(4, 5, 8, P.s4);
      p.rect(5, 9, 6, 3, tint).hline(6, 8, 4, tint).px(6, 9, P.white);
      break;
    case 'rackItem':
      p.hline(2, 1, 12, P.r2).hline(3, 2, 10, P.r1);
      p.rect(3, 3, 2, 11, P.b3).rect(11, 3, 2, 11, P.b3);
      p.hline(4, 6, 8, P.b4).hline(4, 10, 8, P.b4).vline(6, 7, 3, P.g3).vline(9, 7, 3, P.g3).px(6, 10, P.g4).px(9, 10, P.g4);
      break;
    case 'pressItem':
      p.rect(3, 11, 10, 3, P.s1).rect(6, 3, 4, 8, P.s2).vline(9, 3, 8, P.s1).rect(4, 2, 8, 2, P.s3).px(12, 1, P.r2).hline(10, 2, 3, P.s3);
      p.px(5, 12, P.pink).px(7, 12, P.teal);
      break;
    case 'packItem':
      p.rect(1, 6, 14, 3, P.b4).hline(1, 6, 14, P.b5).rect(2, 9, 2, 5, P.b2).rect(12, 9, 2, 5, P.b2);
      p.rect(3, 3, 4, 3, P.s3).px(4, 2, P.s4).rect(9, 3, 3, 3, P.w4);
      break;
    case 'sandwich':
      p.rect(2, 7, 12, 3, P.b5).rect(2, 10, 12, 1, P.g3).rect(2, 11, 12, 1, P.r3).rect(2, 12, 12, 2, P.b5).hline(2, 7, 12, P.cream);
      break;
    case 'coffee':
      p.rect(4, 5, 7, 9, P.white).hline(4, 5, 7, P.s4).rect(5, 6, 5, 2, P.b1).rect(11, 7, 2, 4, P.white).px(12, 8, P.ink);
      p.px(6, 2, P.s4).px(7, 3, P.s4).px(8, 1, P.s4);
      break;
    case 'letter':
      p.rect(2, 4, 12, 9, P.cream).hline(2, 12, 12, P.sand0);
      for (let i = 0; i < 6; i++) p.px(2 + i, 4 + i, P.sand0).px(13 - i, 4 + i, P.sand0);
      p.px(8, 9, P.r2);
      break;
    case 'coin':
      p.ellipse(8, 8, 5, 5, P.y1).ellipse(7, 7, 3, 3, P.y2).vline(8, 5, 6, P.y0);
      break;
    case 'mushroom':
      for (const [x, y, r] of [[5, 7, 3], [11, 9, 2], [8, 11, 2]] as const) {
        p.vline(x, y + 1, 4, P.cream).ellipse(x, y, r, Math.max(1, r - 1), P.b4).px(x - 1, y - 1, P.b5).px(x + 1, y, P.cream);
      }
      break;
    case 'mushroomBag':
      p.rect(3, 4, 10, 10, P.white).rect(4, 5, 8, 8, P.w4).hline(3, 4, 10, P.r2).hline(3, 5, 10, P.s4);
      p.ellipse(7, 10, 2, 1, P.b4).vline(7, 11, 2, P.cream).ellipse(10, 8, 2, 1, P.b3).vline(10, 9, 2, P.cream);
      break;
    case 'bottle':
      p.rect(6, 6, 4, 8, P.g2).vline(9, 6, 8, P.g1).rect(7, 2, 2, 4, P.g2).px(7, 1, P.s3).px(8, 1, P.s3).vline(7, 7, 4, P.g4).rect(6, 9, 4, 2, P.cream);
      break;
    case 'watch':
      p.rect(7, 1, 2, 4, P.b2).rect(7, 11, 2, 4, P.b2).ellipse(8, 8, 4, 4, P.y1).ellipse(8, 8, 3, 3, P.white).vline(8, 6, 3, P.ink).hline(8, 8, 2, P.ink);
      break;
    case 'notebook':
      p.rect(3, 2, 10, 12, P.r1).vline(3, 2, 12, P.r0).hline(5, 5, 6, P.cream).hline(5, 7, 4, P.cream).rect(11, 2, 1, 12, P.cream).px(9, 11, P.y2);
      break;
    case 'keys':
      p.ellipse(5, 6, 3, 3, P.s3).ellipse(5, 6, 1, 1, P.ink).hline(7, 7, 6, P.s3).px(11, 8, P.s3).px(13, 8, P.s3).px(4, 11, P.w3).px(3, 12, P.w3).px(5, 12, P.w3).px(4, 13, P.w2);
      break;
  }
  p.outline();
  return p.canvas;
}

/* -------------------------------------------------- Weitere Produktionsmaschinen */

export function drawPillPress(state: 'idle' | 'working' | 'done'): HTMLCanvasElement {
  const p = new Painter(20, 30);
  p.rect(2, 22, 16, 6, P.s1).hline(2, 22, 16, P.s2);                 // Sockel
  p.rect(7, 6, 6, 16, P.s2).vline(12, 6, 16, P.s1).vline(8, 6, 16, P.s3); // Säule
  p.rect(4, 3, 12, 4, P.s3).hline(4, 3, 12, P.s4);                   // Kopf
  p.rect(5, 0, 5, 3, P.s2).hline(5, 0, 5, P.s3);                     // Trichter
  p.hline(15, 4, 4, P.s3).rect(18, 2, 2, 2, P.r2);                    // Hebel
  p.rect(4, 18, 12, 3, P.b3);                                         // Schale
  const lamp = state === 'working' ? P.y2 : state === 'done' ? P.g4 : P.s0;
  p.px(14, 8, lamp).px(14, 9, lamp);
  if (state === 'done') for (const [x, c] of [[5, P.pink], [7, P.teal], [9, P.y2], [11, P.pink], [13, P.teal]] as const) p.px(x, 18, c).px(x + 1, 19, c);
  if (state === 'working') p.px(9, 17, P.pink).px(11, 16, P.teal);
  p.outline();
  return p.canvas;
}

export function drawPackTable(state: 'idle' | 'working' | 'done'): HTMLCanvasElement {
  const p = new Painter(30, 24);
  p.rect(1, 8, 28, 5, P.b4).hline(1, 8, 28, P.b5).rect(2, 13, 3, 10, P.b2).rect(25, 13, 3, 10, P.b2).hline(2, 19, 26, P.b2);
  p.rect(3, 4, 7, 4, P.s3).rect(5, 2, 3, 2, P.s4).px(6, 5, P.g4);       // Waage
  p.rect(20, 3, 6, 5, P.b3).hline(20, 3, 6, P.b4);                      // Karton
  if (state !== 'idle') p.rect(12, 4, 6, 4, P.cream).rect(14, 4, 2, 4, P.y1); // Großpaket
  if (state === 'done') for (let i = 0; i < 5; i++) p.rect(11 + i * 2, 5 - (i % 2), 2, 3, P.w4).px(11 + i * 2, 7 - (i % 2), P.white);
  p.outline();
  return p.canvas;
}

export function drawDumpster(): HTMLCanvasElement {
  const p = new Painter(32, 22);
  p.rect(1, 6, 30, 14, P.g1).hline(1, 6, 30, P.g2).vline(30, 6, 14, P.g0).rect(0, 3, 32, 4, P.g2).hline(0, 3, 32, P.g3);
  for (let x = 4; x < 30; x += 6) p.vline(x, 8, 10, P.g0);
  // Graffiti-Tag
  p.hline(6, 11, 5, P.pink).px(6, 12, P.pink).hline(6, 13, 4, P.pink).px(10, 14, P.pink).hline(6, 15, 4, P.pink);
  p.hline(13, 11, 4, P.teal).vline(13, 11, 5, P.teal).vline(17, 11, 5, P.teal).hline(13, 13, 4, P.teal);
  p.px(20, 12, P.y2).px(21, 11, P.y2).px(22, 12, P.y2).px(23, 13, P.y2).px(24, 14, P.y2);
  p.rect(3, 20, 3, 2, P.s1).rect(26, 20, 3, 2, P.s1);
  p.outline();
  return p.canvas;
}

/* --------------------------------------------------------------- Wald & Funde */

export function drawLog(): HTMLCanvasElement {
  const p = new Painter(32, 14);
  p.rect(2, 3, 26, 8, P.b2).hline(2, 3, 26, P.b3).hline(2, 10, 26, P.b1);
  p.ellipse(28, 7, 3, 4, P.b4).ellipse(28, 7, 1, 2, P.b3).px(10, 5, P.b1).px(18, 7, P.b1);
  p.px(8, 2, P.g3).px(9, 2, P.g4).px(20, 2, P.g3);
  p.outline();
  return p.canvas;
}

export function drawStump(): HTMLCanvasElement {
  const p = new Painter(16, 14);
  p.rect(3, 5, 10, 7, P.b2).vline(12, 5, 7, P.b1).ellipse(8, 5, 5, 2, P.b4).ellipse(8, 5, 2, 1, P.b3).px(2, 11, P.b2).px(13, 11, P.b2);
  p.outline();
  return p.canvas;
}

export function drawHuntingStand(): HTMLCanvasElement {
  const p = new Painter(24, 44);
  for (const x of [3, 19]) p.rect(x, 14, 2, 29, P.b2);
  for (let y = 18; y < 42; y += 5) p.hline(5, y, 14, P.b3);
  p.rect(1, 6, 22, 9, P.b3).hline(1, 6, 22, P.b4).rect(4, 8, 16, 4, P.b1);
  for (let i = 0; i < 5; i++) p.hline(i, 5 - i, 24 - i * 2, i % 2 ? P.g1 : P.g2);
  p.outline();
  return p.canvas;
}

export type ForageArt = 'hemp' | 'mushroom' | 'bottle' | 'watch' | 'keys' | 'kushMother';

/** Fundstücke am Boden. */
export function drawForage(kind: ForageArt): HTMLCanvasElement {
  if (kind === 'hemp' || kind === 'kushMother') {
    const p = new Painter(16, 22);
    const c = kind === 'kushMother' ? P.v3 : P.g4;
    p.vline(8, 6, 16, P.g1).ellipse(8, 21, 3, 1, P.soil2);
    fanLeaf(p, 4, 21, 4, P.g3, P.g4);
    fanLeaf(p, 12, 21, 4, P.g3, P.g4);
    fanLeaf(p, 8, 15, 4, P.g3, P.g4);
    p.rect(7, 3, 3, 6, c).rect(6, 5, 5, 3, c).px(8, 2, P.white).px(7, 5, P.y1).px(9, 7, P.y1);
    p.outline(P.g0);
    return p.canvas;
  }
  const p = new Painter(16, 16);
  if (kind === 'mushroom') {
    for (const [x, y, r] of [[5, 9, 3], [11, 11, 2], [8, 13, 2]] as const) {
      p.vline(x, y + 1, 3, P.cream).ellipse(x, y, r, Math.max(1, r - 1), P.b4).px(x - 1, y - 1, P.b5).px(x + 1, y, P.cream);
    }
  } else if (kind === 'bottle') {
    p.rect(3, 10, 9, 3, P.g2).hline(3, 10, 9, P.g4).rect(12, 11, 2, 1, P.g2).rect(5, 10, 3, 3, P.cream);
  } else if (kind === 'watch') {
    p.ellipse(8, 11, 3, 2, P.y1).ellipse(8, 11, 2, 1, P.white).hline(2, 11, 3, P.b2).hline(11, 11, 3, P.b2);
  } else {
    p.ellipse(6, 11, 2, 2, P.s3).px(6, 11, P.ink).hline(8, 11, 4, P.s3).px(11, 12, P.s3).px(4, 13, P.w3);
  }
  p.outline();
  return p.canvas;
}

/* ------------------------------------------------------------------ Tiere */

export type AnimalKind = 'pigeon' | 'cat' | 'dog' | 'duck' | 'crow';

/** Tier-Frame (16×16), Blick nach rechts. frame 0/1 = Laufen/Picken. */
export function drawAnimal(kind: AnimalKind, frame: number, variant = 0): HTMLCanvasElement {
  const p = new Painter(16, 16);
  const f = frame % 2;
  switch (kind) {
    case 'pigeon':
    case 'crow': {
      const body = kind === 'crow' ? P.ink : [P.s3, P.s2, P.cream][variant % 3];
      const wing = kind === 'crow' ? P.s0 : P.s1;
      p.ellipse(8, 11, 4, 3, body).rect(5, 10, 5, 2, wing);
      const hy = f ? 10 : 7, hx = f ? 12 : 11;
      p.rect(hx, hy, 3, 3, kind === 'crow' ? P.ink : P.s2).px(hx + 2, hy + 1, P.y1).px(hx + 1, hy, P.ink);
      if (kind === 'pigeon') p.px(hx, hy + 2, P.tealDark);
      p.hline(3, 11, 2, wing).px(7, 14, P.r3).px(9, 14, P.r3);
      break;
    }
    case 'cat': {
      const fur = [P.y0, P.s2, P.ink, P.cream][variant % 4], dark = [P.b2, P.s1, P.outline, P.sand0][variant % 4];
      p.rect(3, 8, 9, 4, fur).hline(3, 11, 9, dark);
      p.rect(11, 5, 4, 4, fur).px(11, 4, fur).px(14, 4, fur).px(12, 6, P.g4).px(14, 6, P.g4).px(13, 7, P.r4);
      const legs = f ? [4, 6, 9, 11] : [3, 5, 10, 12];
      for (const x of legs) p.vline(x, 12, 2, dark);
      p.vline(2, 5, 4, fur).px(1, 4, fur).px(3, 8, fur);
      break;
    }
    case 'dog': {
      const fur = [P.b4, P.b2, P.cream][variant % 3], dark = [P.b3, P.b1, P.sand0][variant % 3];
      p.rect(2, 7, 10, 5, fur).hline(2, 11, 10, dark);
      p.rect(10, 3, 5, 5, fur).rect(14, 5, 2, 2, fur).px(15, 5, P.ink).px(12, 4, P.ink).rect(10, 3, 2, 3, dark);
      const legs = f ? [3, 5, 9, 11] : [2, 4, 10, 12];
      for (const x of legs) p.vline(x, 12, 3, dark);
      p.px(1, 6 + f, fur).px(0, 5 + f, fur);
      break;
    }
    case 'duck': {
      p.ellipse(7, 11, 5, 3, P.white).hline(3, 13, 9, P.s4).rect(10, 5, 4, 4, P.g2).px(14, 7, P.y1).px(15, 7, P.y1).px(12, 6, P.ink).hline(10, 9, 3, P.white);
      p.rect(4, 10, 4, 2, P.s4);
      if (f) p.px(2, 9, P.white);
      break;
    }
  }
  p.outline();
  return p.canvas;
}
