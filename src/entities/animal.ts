import { drawAnimal, type AnimalKind } from '../art/objects';
import { sprite } from '../art/atlas';
import { Painter } from '../art/painter';
import { TILE, type Rect } from '../core/types';
import type { GameMap } from '../world/gamemap';

const SPEED: Record<AnimalKind, number> = { pigeon: 14, crow: 14, cat: 22, dog: 34, duck: 10 };

/** Kleine Tiere mit einfachem Verhalten: picken, wandern, fliehen, wegfliegen. */
export class Animal {
  x: number; y: number;
  z = 0;                 // Flughöhe
  dir = 1;
  state: 'idle' | 'walk' | 'fly' | 'gone' = 'idle';
  timer = Math.random() * 3;
  frameT = Math.random();
  hearts = 0;
  private tx = 0; private ty = 0;
  private vx = 0; private vy = 0;

  constructor(readonly kind: AnimalKind, readonly zone: Rect, readonly map: GameMap, readonly variant: number, readonly name?: string) {
    const p = this.randomPoint();
    this.x = p.x; this.y = p.y;
  }

  private randomPoint(): { x: number; y: number } {
    for (let i = 0; i < 30; i++) {
      const tx = this.zone.x + Math.floor(Math.random() * this.zone.w), ty = this.zone.y + Math.floor(Math.random() * this.zone.h);
      const water = this.map.groundAt(tx, ty) === 'water';
      if (this.kind === 'duck' ? water : !this.map.isSolid(tx, ty)) return { x: tx * TILE + 4 + Math.random() * 8, y: ty * TILE + 8 + Math.random() * 6 };
    }
    return { x: (this.zone.x + this.zone.w / 2) * TILE, y: (this.zone.y + this.zone.h / 2) * TILE };
  }

  get flies(): boolean { return this.kind === 'pigeon' || this.kind === 'crow'; }

  update(dt: number, px: number, py: number): void {
    this.frameT += dt;
    if (this.hearts > 0) this.hearts -= dt;
    const dist = Math.hypot(px - this.x, py - this.y);
    if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0 && dist > 140) { const p = this.randomPoint(); this.x = p.x; this.y = p.y; this.z = 0; this.state = 'idle'; }
      return;
    }
    if (this.state === 'fly') {
      this.x += this.vx * dt; this.y += this.vy * dt; this.z += 40 * dt;
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'gone'; this.timer = 15 + Math.random() * 20; }
      return;
    }
    // Vögel fliegen auf, wenn man ihnen zu nahe kommt
    if (this.flies && dist < 30) {
      this.state = 'fly';
      const a = Math.atan2(this.y - py, this.x - px) + (Math.random() - 0.5) * 0.8;
      this.vx = Math.cos(a) * 90; this.vy = Math.sin(a) * 50 - 30;
      this.dir = this.vx > 0 ? 1 : -1;
      this.timer = 2.5;
      return;
    }
    if (this.state === 'idle') {
      this.timer -= dt;
      if (this.timer <= 0) {
        // Hund läuft manchmal zum Spieler
        const t = this.kind === 'dog' && dist < 90 && Math.random() < 0.4 ? { x: px + (Math.random() - 0.5) * 20, y: py + 6 } : this.randomPoint();
        this.tx = t.x; this.ty = t.y;
        if (this.flies) { this.tx = this.x + (Math.random() - 0.5) * 30; this.ty = this.y + (Math.random() - 0.5) * 12; }
        this.state = 'walk';
      }
      return;
    }
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    const step = SPEED[this.kind] * dt;
    if (d < step || d < 1) { this.state = 'idle'; this.timer = 1.5 + Math.random() * (this.kind === 'cat' ? 8 : 4); return; }
    const nx = this.x + (dx / d) * step, ny = this.y + (dy / d) * step;
    const ntx = Math.floor(nx / TILE), nty = Math.floor((ny - 2) / TILE);
    const ok = this.kind === 'duck' ? this.map.groundAt(ntx, nty) === 'water' : !this.map.isSolid(ntx, nty);
    if (!ok) { this.state = 'idle'; this.timer = 1; return; }
    this.x = nx; this.y = ny;
    if (Math.abs(dx) > 0.5) this.dir = dx > 0 ? 1 : -1;
  }

  get visible(): boolean { return this.state !== 'gone'; }

  sprite(): HTMLCanvasElement {
    const moving = this.state === 'walk' || this.state === 'fly';
    const pecking = this.state === 'idle' && this.flies && Math.floor(this.frameT * 2) % 3 === 0;
    const frame = moving ? Math.floor(this.frameT * (this.state === 'fly' ? 12 : 6)) % 2 : pecking ? 1 : 0;
    const key = `animal:${this.kind}:${this.variant}:${frame}:${this.dir}`;
    return sprite(key, () => {
      const base = drawAnimal(this.kind, frame, this.variant);
      if (this.dir === 1) return base;
      const p = new Painter(16, 16); p.ctx.drawImage(base, 0, 0); p.flipX(); return p.canvas;
    });
  }
}
