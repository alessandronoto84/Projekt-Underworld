import { Actor } from './actor';
import type { Look } from '../art/characters';
import { P } from '../art/palette';
import { TILE, type Rect } from '../core/types';
import type { GameMap } from '../world/gamemap';
import { findPath } from '../world/path';
import { SMALLTALK } from '../data/life';

const SKINS: [string, string][] = [[P.skin0, P.skin1], [P.skin1, P.skin2], [P.skin2, P.skin3], [P.skin3, P.outline]];
const HAIR: [string, string][] = [[P.ink, P.outline], [P.b2, P.b1], [P.y0, P.b2], [P.s4, P.s3], [P.r1, P.r0], [P.y1, P.y0], [P.v2, P.v1]];
const CLOTH: [string, string][] = [[P.r2, P.r1], [P.w1, P.w0], [P.g2, P.g1], [P.y1, P.y0], [P.v2, P.v1], [P.s2, P.s1], [P.cream, P.sand0], [P.pink, P.pinkDark], [P.tealDark, P.w0]];
const STYLES: Look['hairStyle'][] = ['short', 'long', 'bun', 'buzz', 'cap', 'mohawk', 'bald', 'short', 'long'];

let counter = 0;

export function randomLook(r: () => number = Math.random): Look {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const [skin, skinShade] = pick(SKINS), [hair, hairShade] = pick(HAIR), [shirt, shirtShade] = pick(CLOTH), [pants, pantsShade] = pick(CLOTH);
  const look: Look = { skin, skinShade, hair, hairShade, hairStyle: pick(STYLES), shirt, shirtShade, pants, pantsShade, shoes: pick([P.ink, P.white, P.b1, P.r1]) };
  if (r() < 0.35) { const [j, js] = pick(CLOTH); look.jacket = j; look.jacketShade = js; }
  if (look.hairStyle === 'cap') look.cap = pick([P.r2, P.w0, P.y1, P.ink, P.g2]);
  if (r() < 0.15) look.glasses = true;
  if (r() < 0.12 && look.hairStyle !== 'long') look.beard = true;
  return look;
}

/** Passant: läuft zwischen zufälligen Punkten umher. Nachts teils Kundschaft. */
export class Walker extends Actor {
  readonly name: string;
  customer = false;
  served = false;
  line: string;
  private path: [number, number][] = [];
  private wait = Math.random() * 3;
  faceTimer = 0;
  leaving = false;
  speed = 26 + Math.random() * 16;

  constructor(readonly map: GameMap, readonly zones: Rect[], night: boolean) {
    super(`walker${counter++}`, randomLook());
    this.name = SMALLTALK.names[Math.floor(Math.random() * SMALLTALK.names.length)];
    const pool = night ? SMALLTALK.night : SMALLTALK.day;
    this.line = pool[Math.floor(Math.random() * pool.length)];
    const p = this.randomTile();
    this.x = p[0] * TILE + 8; this.y = p[1] * TILE + 12;
  }

  makeCustomer(): void {
    this.customer = true;
    this.line = SMALLTALK.customer[Math.floor(Math.random() * SMALLTALK.customer.length)];
  }

  private randomTile(): [number, number] {
    for (let i = 0; i < 40; i++) {
      const z = this.zones[Math.floor(Math.random() * this.zones.length)];
      const x = z.x + Math.floor(Math.random() * z.w), y = z.y + Math.floor(Math.random() * z.h);
      if (!this.map.isSolid(x, y)) return [x, y];
    }
    return [this.zones[0].x, this.zones[0].y];
  }

  update(dt: number): void {
    if (this.faceTimer > 0) { this.faceTimer -= dt; this.moving = false; return; }
    if (!this.path.length) {
      this.moving = false;
      this.wait -= dt;
      if (this.wait <= 0) {
        const [tx, ty] = this.randomTile();
        this.path = findPath(this.map, Math.floor(this.x / TILE), Math.floor((this.y - 2) / TILE), tx, ty, undefined, 2500) ?? [];
        this.wait = 1 + Math.random() * 6;
      }
      return;
    }
    const [tx, ty] = this.path[0];
    const gx = tx * TILE + 8, gy = ty * TILE + 12;
    const dx = gx - this.x, dy = gy - this.y, d = Math.hypot(dx, dy), step = this.speed * dt;
    if (d <= step) { this.x = gx; this.y = gy; this.path.shift(); }
    else { this.x += (dx / d) * step; this.y += (dy / d) * step; }
    this.moving = true;
    this.animTime += dt;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
}
