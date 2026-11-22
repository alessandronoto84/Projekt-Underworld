import { P } from '../art/palette';
import { darkness } from '../systems/time';
import type { Game } from './game';

interface Mote { x: number; y: number; vx: number; vy: number; t: number; life: number; kind: 'butterfly' | 'firefly' | 'smoke' | 'leaf' | 'splash'; color: string; phase: number }

/** Atmosphäre: Schmetterlinge, Glühwürmchen, Schornsteinrauch, Blätter, Regentropfen. Rein optisch. */
export class Ambient {
  private motes: Mote[] = [];
  private smokeT = 0;

  reset(): void { this.motes = []; }

  update(dt: number, g: Game): void {
    const s = g.ctx.s, m = g.map, r = g.renderer;
    const outdoor = m.def.outdoor;
    const dark = darkness(s.time.minute);
    const rain = s.weather === 'rain';
    const view = { x: r.camX, y: r.camY, w: r.viewW, h: r.viewH };
    const count = (k: Mote['kind']) => this.motes.reduce((n, mo) => n + (mo.kind === k ? 1 : 0), 0);
    const spawnIn = () => ({ x: view.x + Math.random() * view.w, y: view.y + Math.random() * view.h });

    if (outdoor && !rain && dark < 0.3 && count('butterfly') < 5 && Math.random() < dt * 0.8) {
      const p = spawnIn();
      this.motes.push({ ...p, vx: (Math.random() - 0.5) * 20, vy: 0, t: 0, life: 12, kind: 'butterfly', color: [P.white, P.y2, P.v3, P.r3][Math.floor(Math.random() * 4)], phase: Math.random() * 6 });
    }
    if (outdoor && !rain && dark > 0.6 && count('firefly') < (m.def.id === 'woods' ? 22 : 12) && Math.random() < dt * 4) {
      const p = spawnIn();
      this.motes.push({ ...p, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, t: 0, life: 6 + Math.random() * 6, kind: 'firefly', color: P.y3, phase: Math.random() * 6 });
    }
    if (m.def.id === 'woods' && count('leaf') < 6 && Math.random() < dt * 0.6) {
      const p = spawnIn();
      this.motes.push({ x: p.x, y: view.y - 4, vx: 6 + Math.random() * 8, vy: 14 + Math.random() * 8, t: 0, life: 10, kind: 'leaf', color: [P.y1, P.g4, P.y0][Math.floor(Math.random() * 3)], phase: Math.random() * 6 });
    }
    if (outdoor && rain && Math.random() < dt * 30) {
      const p = spawnIn();
      this.motes.push({ ...p, vx: 0, vy: 0, t: 0, life: 0.3, kind: 'splash', color: 'rgba(166,216,240,0.7)', phase: 0 });
    }
    // Schornsteinrauch
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.35;
      for (const c of m.chimneys) {
        this.motes.push({ x: c.x + Math.random() * 3, y: c.y, vx: 3 + Math.random() * 3, vy: -10 - Math.random() * 4, t: 0, life: 3.2, kind: 'smoke', color: P.s4, phase: 0 });
      }
    }
    for (const mo of this.motes) {
      mo.t += dt;
      if (mo.kind === 'butterfly') { mo.x += mo.vx * dt + Math.sin(mo.t * 3 + mo.phase) * 0.4; mo.y += Math.sin(mo.t * 5 + mo.phase) * 0.6; if (Math.random() < dt) mo.vx = (Math.random() - 0.5) * 24; }
      else if (mo.kind === 'firefly') { mo.x += mo.vx * dt + Math.sin(mo.t + mo.phase) * 0.2; mo.y += mo.vy * dt + Math.cos(mo.t * 1.3 + mo.phase) * 0.2; }
      else if (mo.kind === 'leaf') { mo.x += mo.vx * dt + Math.sin(mo.t * 2 + mo.phase) * 0.5; mo.y += mo.vy * dt; }
      else { mo.x += mo.vx * dt; mo.y += mo.vy * dt; }
    }
    this.motes = this.motes.filter((mo) => mo.t < mo.life && mo.x > view.x - 40 && mo.x < view.x + view.w + 40 && mo.y < view.y + view.h + 40);
  }

  /** Vor dem Licht zeichnen (Teil der Welt). */
  drawWorld(c: CanvasRenderingContext2D): void {
    for (const mo of this.motes) {
      const x = Math.round(mo.x), y = Math.round(mo.y);
      if (mo.kind === 'butterfly') {
        const flap = Math.floor(mo.t * 10) % 2;
        c.fillStyle = mo.color;
        c.fillRect(x - 1 - flap, y, 1 + flap, 2); c.fillRect(x + 1, y, 1 + flap, 2);
        c.fillStyle = P.ink; c.fillRect(x, y, 1, 2);
      } else if (mo.kind === 'smoke') {
        const a = Math.max(0, 0.45 * (1 - mo.t / mo.life));
        const sz = 2 + Math.floor(mo.t * 1.5);
        c.fillStyle = `rgba(192,196,209,${a.toFixed(2)})`;
        c.fillRect(x, y, sz, sz);
      } else if (mo.kind === 'leaf') {
        c.fillStyle = mo.color; c.fillRect(x, y, 2, 1); c.fillRect(x + (Math.floor(mo.t * 4) % 2), y + 1, 1, 1);
      } else if (mo.kind === 'splash') {
        c.fillStyle = mo.color; c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y - 1, 1, 1);
      }
    }
  }

  /** Nach dem Licht zeichnen (leuchtet). */
  drawGlow(c: CanvasRenderingContext2D): void {
    for (const mo of this.motes) {
      if (mo.kind !== 'firefly') continue;
      const blink = (Math.sin(mo.t * 3 + mo.phase) + 1) / 2;
      if (blink < 0.25) continue;
      const x = Math.round(mo.x), y = Math.round(mo.y);
      c.fillStyle = `rgba(255,242,176,${(blink * 0.35).toFixed(2)})`;
      c.fillRect(x - 1, y - 1, 3, 3);
      c.fillStyle = `rgba(255,250,210,${blink.toFixed(2)})`;
      c.fillRect(x, y, 1, 1);
    }
  }
}

