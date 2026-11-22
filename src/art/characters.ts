import { Painter } from './painter';
import { P } from './palette';
import type { Dir } from '../core/types';

export const CHAR_W = 16;
export const CHAR_H = 24;

export interface Look {
  skin: string; skinShade: string;
  hair: string; hairShade: string;
  hairStyle: 'short' | 'long' | 'cap' | 'bald' | 'buzz' | 'mohawk' | 'bun';
  shirt: string; shirtShade: string;
  pants: string; pantsShade: string;
  shoes: string;
  jacket?: string; jacketShade?: string;
  cap?: string;
  beard?: boolean;
  glasses?: boolean;
}

/** Zeichnet einen Charakter-Frame (16x24). frame 0..3: 0/2 stehend, 1/3 Schritt. */
export function drawCharacter(look: Look, dir: Dir, frame: number): HTMLCanvasElement {
  const p = new Painter(CHAR_W, CHAR_H);
  const step = frame % 2 === 1;
  const altStep = frame === 3;
  if (dir === 'left') {
    paintSide(p, look, step, altStep);
    p.flipX();
  } else if (dir === 'right') {
    paintSide(p, look, step, altStep);
  } else {
    paintFront(p, look, dir === 'up', step, altStep);
  }
  p.outline(P.outline);
  return p.canvas;
}

function paintFront(p: Painter, L: Look, back: boolean, step: boolean, alt: boolean): void {
  const bob = step ? -1 : 0;
  // Beine
  const leftLift = step && !alt, rightLift = step && alt;
  p.rect(5, 17, 6, 2, L.pants); // Hüfte
  p.rect(5, 18, 2, leftLift ? 3 : 4, L.pants).rect(9, 18, 2, rightLift ? 3 : 4, L.pants);
  p.px(6, 19, L.pantsShade).px(9, 19, L.pantsShade);
  p.rect(5, leftLift ? 21 : 22, 2, 1, L.shoes).rect(9, rightLift ? 21 : 22, 2, 1, L.shoes);
  if (!back) { p.px(4, leftLift ? 21 : 22, L.shoes); p.px(11, rightLift ? 21 : 22, L.shoes); }

  // Körper
  const by = 12 + bob;
  const top = L.jacket ?? L.shirt, topShade = L.jacketShade ?? L.shirtShade;
  p.rect(4, by, 8, 6, top);
  if (L.jacket && !back) p.rect(6, by, 4, 6, L.shirt).vline(9, by, 6, L.shirtShade);
  p.vline(11, by, 6, topShade).hline(4, by + 5, 8, topShade);
  if (!back && !L.jacket) p.px(7, by, L.skin).px(8, by, L.skin);
  // Arme (schwingen beim Gehen)
  const la = step ? (alt ? 1 : -1) : 0;
  p.rect(3, by + 1, 1, 4 + la, top).px(3, by + 5 + la, L.skin);
  p.rect(12, by + 1, 1, 4 - la, topShade).px(12, by + 5 - la, L.skin);

  // Kopf
  const hy = 2 + bob;
  p.rect(4, hy + 1, 8, 9, L.skin).rect(3, hy + 2, 10, 7, L.skin);
  p.vline(12, hy + 2, 7, L.skinShade).hline(4, hy + 9, 8, L.skinShade);
  if (back) {
    paintHairBack(p, L, hy);
  } else {
    p.rect(5, hy + 5, 1, 2, P.ink).rect(10, hy + 5, 1, 2, P.ink);
    p.px(5, hy + 5, P.s1).px(10, hy + 5, P.s1);
    p.px(4, hy + 7, P.r4).px(11, hy + 7, P.r4);
    p.px(7, hy + 8, L.skinShade).px(8, hy + 8, L.skinShade);
    if (L.beard) p.rect(4, hy + 7, 8, 3, L.hair).rect(6, hy + 8, 4, 1, L.skinShade).px(7, hy + 8, L.skin);
    if (L.glasses) p.hline(4, hy + 5, 8, P.ink).rect(4, hy + 5, 3, 2, P.s1).rect(9, hy + 5, 3, 2, P.s1).px(5, hy + 5, P.w4).px(10, hy + 5, P.w4);
    paintHairFront(p, L, hy);
  }
}

function paintHairFront(p: Painter, L: Look, hy: number): void {
  const h = L.hair, hs = L.hairShade;
  switch (L.hairStyle) {
    case 'short':
      p.rect(5, hy - 1, 6, 1, h).rect(4, hy, 8, 1, h).rect(3, hy + 1, 10, 2, h);
      p.px(3, hy + 3, h).px(12, hy + 3, hs).px(4, hy + 3, h).px(11, hy + 3, hs);
      p.hline(5, hy, 3, lighten(h));
      break;
    case 'long':
      p.rect(5, hy - 1, 6, 1, h).rect(4, hy, 8, 1, h).rect(3, hy + 1, 10, 2, h);
      p.rect(3, hy + 3, 1, 8, h).rect(12, hy + 3, 1, 8, hs).px(4, hy + 3, h).px(11, hy + 3, hs);
      p.rect(2, hy + 5, 1, 6, hs).rect(13, hy + 5, 1, 6, hs);
      p.hline(5, hy, 3, lighten(h));
      break;
    case 'bun':
      p.rect(6, hy - 3, 4, 3, h).rect(4, hy, 8, 1, h).rect(3, hy + 1, 10, 2, h).px(3, hy + 3, h).px(12, hy + 3, hs);
      p.px(7, hy - 3, lighten(h));
      break;
    case 'buzz':
      p.rect(4, hy, 8, 1, hs).rect(3, hy + 1, 10, 1, hs);
      break;
    case 'mohawk':
      p.rect(6, hy - 3, 4, 4, h).rect(7, hy + 1, 2, 1, h).px(6, hy - 3, lighten(h));
      p.rect(3, hy + 1, 2, 2, hs).rect(11, hy + 1, 2, 2, hs);
      break;
    case 'bald':
      p.px(3, hy + 3, hs).px(12, hy + 3, hs).px(5, hy + 1, P.skin0);
      break;
    case 'cap': {
      const c = L.cap ?? P.r2;
      p.rect(4, hy - 1, 8, 1, c).rect(3, hy, 10, 3, c).hline(2, hy + 3, 12, darken(c));
      p.px(5, hy, lighten(c)).px(6, hy, lighten(c));
      p.px(3, hy + 4, h).px(12, hy + 4, hs);
      break;
    }
  }
}

function paintHairBack(p: Painter, L: Look, hy: number): void {
  const h = L.hair, hs = L.hairShade;
  if (L.hairStyle === 'bald') { p.px(6, hy + 2, P.skin0); return; }
  if (L.hairStyle === 'cap') {
    const c = L.cap ?? P.r2;
    p.rect(4, hy - 1, 8, 1, c).rect(3, hy, 10, 4, c).rect(3, hy + 4, 10, 3, h).hline(3, hy + 6, 10, hs);
    return;
  }
  if (L.hairStyle === 'buzz') { p.rect(3, hy, 10, 7, hs); return; }
  p.rect(5, hy - 1, 6, 1, h).rect(4, hy, 8, 1, h).rect(3, hy + 1, 10, 7, h);
  p.vline(12, hy + 1, 7, hs).hline(4, hy + 7, 8, hs);
  if (L.hairStyle === 'long') p.rect(3, hy + 8, 10, 3, h).hline(3, hy + 10, 10, hs);
  if (L.hairStyle === 'bun') p.rect(6, hy - 3, 4, 3, h);
  if (L.hairStyle === 'mohawk') p.rect(6, hy - 3, 4, 4, h);
}

function paintSide(p: Painter, L: Look, step: boolean, alt: boolean): void {
  const bob = step ? -1 : 0;
  // Beine
  p.rect(6, 17, 4, 2, L.pants);
  if (step) {
    const back = alt ? 9 : 5, front = alt ? 5 : 9;
    p.rect(back, 18, 2, 3, L.pantsShade).rect(front, 18, 2, 3, L.pants);
    p.rect(back - 1, 21, 3, 1, L.shoes).rect(front, 21, 3, 1, L.shoes);
  } else {
    p.rect(6, 18, 4, 4, L.pants).vline(8, 19, 3, L.pantsShade);
    p.rect(6, 22, 5, 1, L.shoes);
  }
  // Körper
  const by = 12 + bob;
  const top = L.jacket ?? L.shirt, topShade = L.jacketShade ?? L.shirtShade;
  p.rect(5, by, 6, 6, top).vline(5, by, 6, topShade).hline(5, by + 5, 6, topShade);
  // Arm vorne
  const swing = step ? (alt ? -1 : 1) : 0;
  p.rect(7 + swing, by + 1, 2, 4, topShade).rect(7 + swing, by + 5, 2, 1, L.skin);
  // Kopf
  const hy = 2 + bob;
  p.rect(4, hy + 1, 8, 9, L.skin).rect(5, hy, 6, 1, L.skin).px(12, hy + 6, L.skin);
  p.hline(4, hy + 9, 8, L.skinShade);
  p.rect(10, hy + 5, 1, 2, P.ink).px(10, hy + 5, P.s1).px(10, hy + 7, P.r4);
  if (L.beard) p.rect(7, hy + 7, 5, 3, L.hair);
  if (L.glasses) p.hline(8, hy + 5, 4, P.ink).px(10, hy + 5, P.w4);
  // Haare (Hinterkopf links)
  const h = L.hair, hs = L.hairShade;
  switch (L.hairStyle) {
    case 'short': p.rect(5, hy - 1, 6, 1, h).rect(4, hy, 8, 2, h).rect(4, hy + 2, 4, 3, h).px(4, hy + 5, hs).px(11, hy + 2, h); break;
    case 'long': p.rect(5, hy - 1, 6, 1, h).rect(4, hy, 8, 2, h).rect(3, hy + 2, 5, 9, h).vline(3, hy + 4, 7, hs).px(11, hy + 2, h); break;
    case 'bun': p.rect(3, hy - 2, 3, 3, h).rect(4, hy, 8, 2, h).rect(4, hy + 2, 3, 3, h); break;
    case 'buzz': p.rect(4, hy, 8, 1, hs).rect(4, hy + 1, 3, 3, hs); break;
    case 'mohawk': p.rect(5, hy - 3, 6, 3, h).rect(4, hy + 1, 3, 3, hs); break;
    case 'bald': p.px(4, hy + 4, hs); break;
    case 'cap': {
      const c = L.cap ?? P.r2;
      p.rect(4, hy - 1, 8, 4, c).hline(10, hy + 3, 4, darken(c)).rect(4, hy + 3, 3, 3, h); break;
    }
  }
}

/** Porträt (Kopf) für Dialoge, 16x14. */
export function drawPortrait(look: Look): HTMLCanvasElement {
  const full = drawCharacter(look, 'down', 0);
  const p = new Painter(16, 15);
  p.ctx.drawImage(full, 0, 0);
  return p.canvas;
}

function shift(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
export const lighten = (h: string) => shift(h, 34);
export const darken = (h: string) => shift(h, -40);
