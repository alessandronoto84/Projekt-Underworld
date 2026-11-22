import { cropSprite, itemIcon, machineSprite, soilSprite, sprite, waterTile } from '../art/atlas';
import { P } from '../art/palette';
import { Painter } from '../art/painter';
import { CROPS } from '../data/crops';
import { TILE } from '../core/types';
import { cropStage } from '../systems/farming';
import { machineStatus } from '../systems/production';
import { darkness } from '../systems/time';
import { drawForage } from '../art/objects';
import { FORAGE } from '../data/forage';
import type { Game } from './game';

interface Drawable { sortY: number; draw: (c: CanvasRenderingContext2D) => void }

/** Zeichnet Welt, Figuren, Licht und Wetter auf das Canvas (pixelgenau, ganzzahlig skaliert). */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  zoom = 3;
  dpr = 1;
  viewW = 0; viewH = 0;  // in Welt-Pixeln
  camX = 0; camY = 0;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private drops: { x: number; y: number; s: number }[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const w = Math.floor(window.innerWidth * this.dpr), h = Math.floor(window.innerHeight * this.dpr);
    this.canvas.width = w; this.canvas.height = h;
    // Ganzzahliger Zoom, sodass ca. 26 Tiles in der Breite sichtbar sind.
    this.zoom = Math.max(2, Math.round(Math.min(w / (26 * TILE), h / (15 * TILE))));
    this.viewW = Math.ceil(w / this.zoom); this.viewH = Math.ceil(h / this.zoom);
    this.light.width = this.viewW; this.light.height = this.viewH;
    this.ctx.imageSmoothingEnabled = false;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx * this.dpr) / this.zoom + this.camX, y: (sy * this.dpr) / this.zoom + this.camY };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: ((wx - this.camX) * this.zoom) / this.dpr, y: ((wy - this.camY) * this.zoom) / this.dpr };
  }

  private updateCamera(g: Game): void {
    const mw = g.map.w * TILE, mh = g.map.h * TILE;
    let cx = g.player.x - this.viewW / 2, cy = g.player.y - 8 - this.viewH / 2;
    cx = mw <= this.viewW ? (mw - this.viewW) / 2 : Math.max(0, Math.min(mw - this.viewW, cx));
    cy = mh <= this.viewH ? (mh - this.viewH) / 2 : Math.max(0, Math.min(mh - this.viewH, cy));
    this.camX = Math.round(cx); this.camY = Math.round(cy);
  }

  render(g: Game, t: number, dt: number): void {
    const c = this.ctx;
    if (this.canvas.width !== Math.floor(window.innerWidth * (window.devicePixelRatio || 1)) || this.light.width === 0) this.resize();
    if (this.light.width === 0 || this.light.height === 0) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = P.ink; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.updateCamera(g);
    c.imageSmoothingEnabled = false;
    c.setTransform(this.zoom, 0, 0, this.zoom, -this.camX * this.zoom, -this.camY * this.zoom);

    const m = g.map, s = g.ctx.s;
    c.drawImage(m.groundCanvas, 0, 0);

    const x0 = Math.floor(this.camX / TILE) - 1, y0 = Math.floor(this.camY / TILE) - 1;
    const x1 = x0 + Math.ceil(this.viewW / TILE) + 3, y1 = y0 + Math.ceil(this.viewH / TILE) + 4;
    const visible = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

    // Wasser animieren
    const wf = Math.floor(t * 1.6) % 3;
    for (const [x, y] of m.waterTiles) if (visible(x, y)) {
      c.drawImage(waterTile(wf, (x % 4) + (y % 4) * 4), x * TILE, y * TILE);
    }
    this.redrawWaterEdges(g);

    // Ackerboden
    const farm = s.farms[m.def.id] ?? {};
    const crops: Drawable[] = [];
    const glow: { x: number; y: number }[] = [];
    for (const [k, tile] of Object.entries(farm)) {
      const [x, y] = k.split(',').map(Number);
      if (!visible(x, y)) continue;
      c.drawImage(soilSprite(tile.watered, (x * 7 + y * 3) % 4), x * TILE, y * TILE);
      if (tile.crop) {
        const stage = cropStage(tile);
        const spr = cropSprite(tile.crop.id, stage);
        const sway = tile.crop.ready ? Math.round(Math.sin(t * 2 + x) * 0.6) : 0;
        crops.push({ sortY: y * TILE + 12, draw: (cc) => cc.drawImage(spr, x * TILE + sway, y * TILE + 16 - spr.height - 1) });
        if (tile.crop.ready && CROPS[tile.crop.id].glows) glow.push({ x: x * TILE + 8, y: y * TILE + 4 });
      }
    }

    // Schatten + sortierte Objekte
    const list: Drawable[] = [...crops];
    c.fillStyle = 'rgba(26,18,32,0.28)';
    for (const o of m.objects) {
      if (o.flat) continue;
      if (o.dx > this.camX + this.viewW + 64 || o.dx + o.sprite.width < this.camX - 64 || o.dy > this.camY + this.viewH + 64 || o.dy + o.sprite.height < this.camY - 64) continue;
      if (o.shadow) ellipse(c, o.shadow.x, o.shadow.y, o.shadow.rx, o.shadow.ry);
      list.push({ sortY: o.sortY, draw: (cc) => cc.drawImage(o.sprite, o.dx, o.dy) });
    }
    for (const mc of s.machines[m.def.id] ?? []) {
      const st = machineStatus(s, mc);
      const spr = machineSprite(mc.machine, st.state);
      const dx = mc.x * TILE + 8 - spr.width / 2, dy = (mc.y + 1) * TILE - spr.height;
      ellipse(c, mc.x * TILE + 8, mc.y * TILE + 14, 8, 3);
      list.push({ sortY: mc.y * TILE + 14, draw: (cc) => cc.drawImage(spr, dx, dy) });
    }
    for (const n of g.npcs) {
      if (n.map !== m.def.id) continue;
      ellipse(c, n.x, n.y, 6, 2);
      list.push({ sortY: n.y, draw: (cc) => cc.drawImage(n.sprite(), Math.round(n.x - 8), Math.round(n.y - 24)) });
    }
    for (const w of g.walkers) {
      ellipse(c, w.x, w.y, 6, 2);
      list.push({ sortY: w.y, draw: (cc) => cc.drawImage(w.sprite(), Math.round(w.x - 8), Math.round(w.y - 24)) });
    }
    for (const a of g.animals) {
      if (!a.visible) continue;
      if (a.z < 40) ellipse(c, a.x, a.y, a.kind === 'dog' ? 6 : 4, 1);
      list.push({ sortY: a.y + (a.z > 0 ? 1000 : 0), draw: (cc) => cc.drawImage(a.sprite(), Math.round(a.x - 8), Math.round(a.y - 14 - a.z)) });
    }
    for (const f of s.forage[m.def.id] ?? []) {
      if (!visible(f.x, f.y)) continue;
      const def = FORAGE[f.id];
      const spr = sprite(`forage:${def.art}`, () => drawForage(def.art));
      list.push({ sortY: f.y * TILE + 12, draw: (cc) => cc.drawImage(spr, f.x * TILE, f.y * TILE + 16 - spr.height) });
    }
    const p = g.player;
    ellipse(c, p.x, p.y, 6, 2);
    list.push({ sortY: p.y, draw: (cc) => { cc.drawImage(p.sprite(), Math.round(p.x - 8), Math.round(p.y - 24)); this.drawToolSwing(g, cc); } });
    list.sort((a, b) => a.sortY - b.sortY);
    for (const d of list) d.draw(c);

    // Partikel
    for (const pt of g.particles) {
      c.fillStyle = pt.color;
      c.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    }

    g.ambient.drawWorld(c);
    this.drawLighting(g, t, glow);
    g.ambient.drawGlow(c);
    if (s.weather === 'rain' && m.def.outdoor) this.drawRain(dt);

    // Welt-UI (über dem Licht, damit gut lesbar)
    this.drawTarget(g, t);
    this.drawMachineBubbles(g, t);
    this.drawLifeMarkers(g, t);
    this.drawQuestMarker(g, t);
  }

  private redrawWaterEdges(g: Game): void {
    // Kanten sind im Bodencanvas, Wasser wird darübergezeichnet → Kanten erneut drüberlegen.
    const c = this.ctx, m = g.map;
    for (const [x, y] of m.waterTiles) {
      const n = m.groundAt(x, y - 1);
      if (n !== 'water') { c.fillStyle = n === 'sand' ? P.sand0 : n === 'cobble' ? P.s3 : P.g1; c.fillRect(x * TILE, y * TILE, TILE, 1); c.fillStyle = P.w1; c.fillRect(x * TILE, y * TILE + 1, TILE, 2); }
      if (m.groundAt(x - 1, y) !== 'water') { c.fillStyle = P.w1; c.fillRect(x * TILE, y * TILE, 1, TILE); }
      if (m.groundAt(x + 1, y) !== 'water') { c.fillStyle = P.w1; c.fillRect(x * TILE + 15, y * TILE, 1, TILE); }
      if (m.groundAt(x, y + 1) !== 'water') { c.fillStyle = P.w4; c.fillRect(x * TILE, y * TILE + 15, TILE, 1); }
    }
  }

  private drawToolSwing(g: Game, c: CanvasRenderingContext2D): void {
    const a = g.player.action;
    if (!a) return;
    const icon = itemIcon(a.item);
    const prog = 1 - a.t / a.dur;
    const p = g.player;
    const off = { down: [4, -8], up: [-4, -20], left: [-12, -14], right: [6, -14] }[p.dir];
    c.save();
    c.translate(Math.round(p.x + off[0]), Math.round(p.y + off[1]));
    const ang = (p.dir === 'left' ? -1 : 1) * (prog * 1.4 - 0.7);
    c.rotate(ang);
    c.drawImage(icon, -8, -12);
    c.restore();
  }

  private drawLighting(g: Game, t: number, glow: { x: number; y: number }[]): void {
    const s = g.ctx.s, m = g.map;
    let d = darkness(s.time.minute);
    if (m.def.outdoor) d = d * 0.7 + (s.weather === 'rain' ? 0.14 : 0);
    else d = d * (m.def.nightDim ?? 0.4);
    // Abendrot
    const hour = s.time.minute / 60;
    const dusk = m.def.outdoor && hour > 16.5 && hour < 20.5 ? Math.sin(((hour - 16.5) / 4) * Math.PI) * 0.16 : 0;
    if (d <= 0.01 && dusk <= 0) return;

    const L = this.lctx;
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, this.viewW, this.viewH);
    L.fillStyle = `rgba(18,10,44,${d.toFixed(3)})`;
    L.fillRect(0, 0, this.viewW, this.viewH);
    const night = d > 0.15;
    const lights = m.lights.filter((l) => !l.night || night);
    L.globalCompositeOperation = 'destination-out';
    const flick = 1 + Math.sin(t * 9) * 0.03;
    const cut = (x: number, y: number, r: number, strength: number) => {
      const gx = x - this.camX, gy = y - this.camY;
      if (gx < -r || gy < -r || gx > this.viewW + r || gy > this.viewH + r) return;
      const gr = L.createRadialGradient(gx, gy, 0, gx, gy, r);
      gr.addColorStop(0, `rgba(0,0,0,${strength})`);
      gr.addColorStop(0.6, `rgba(0,0,0,${strength * 0.5})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = gr;
      L.fillRect(gx - r, gy - r, r * 2, r * 2);
    };
    for (const l of lights) cut(l.x, l.y, l.r * flick, 0.95);
    for (const gl of glow) cut(gl.x, gl.y, 18, 0.8);
    cut(g.player.x, g.player.y - 10, 46, 0.35);
    const c = this.ctx;
    c.drawImage(this.light, this.camX, this.camY);

    // Farbiges Leuchten
    c.save();
    c.globalCompositeOperation = 'lighter';
    const add = (x: number, y: number, r: number, color: string) => {
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
    };
    c.globalAlpha = Math.min(1, d * 1.2);
    for (const l of lights) add(l.x, l.y, l.r * 0.8, l.color);
    for (const gl of glow) add(gl.x, gl.y, 14, 'rgba(63,216,200,0.55)');
    c.restore();
    if (dusk > 0) {
      c.fillStyle = `rgba(255,120,60,${dusk.toFixed(3)})`;
      c.fillRect(this.camX, this.camY, this.viewW, this.viewH);
    }
  }

  private drawRain(dt: number): void {
    const c = this.ctx;
    while (this.drops.length < 140) this.drops.push({ x: Math.random() * this.viewW, y: Math.random() * this.viewH, s: 0.7 + Math.random() * 0.6 });
    c.fillStyle = 'rgba(166,216,240,0.55)';
    for (const d of this.drops) {
      d.y += 260 * d.s * dt; d.x -= 50 * d.s * dt;
      if (d.y > this.viewH) { d.y = -6; d.x = Math.random() * (this.viewW + 40); }
      if (d.x < -4) d.x += this.viewW + 8;
      const x = Math.round(this.camX + d.x), y = Math.round(this.camY + d.y);
      c.fillRect(x, y, 1, 3); c.fillRect(x - 1, y + 3, 1, 2);
    }
  }

  private drawTarget(g: Game, t: number): void {
    const tg = g.targetTile;
    if (!tg || g.ui.blocking) return;
    const c = this.ctx;
    const place = g.placementPreview();
    const x = tg.x * TILE, y = tg.y * TILE;
    if (place) {
      c.globalAlpha = 0.6;
      const spr = machineSprite(place.machine, 'idle');
      c.drawImage(spr, x + 8 - spr.width / 2, y + 16 - spr.height);
      c.globalAlpha = 1;
      c.fillStyle = place.ok ? 'rgba(134,194,90,0.35)' : 'rgba(224,106,90,0.4)';
      c.fillRect(x, y, TILE, TILE);
    }
    if (!g.showTarget) return;
    const pulse = Math.floor(t * 3) % 2;
    c.fillStyle = 'rgba(246,241,231,0.9)';
    const L = 4 + pulse;
    // Ecken
    c.fillRect(x, y, L, 1); c.fillRect(x, y, 1, L);
    c.fillRect(x + 16 - L, y, L, 1); c.fillRect(x + 15, y, 1, L);
    c.fillRect(x, y + 15, L, 1); c.fillRect(x, y + 16 - L, 1, L);
    c.fillRect(x + 16 - L, y + 15, L, 1); c.fillRect(x + 15, y + 16 - L, 1, L);
  }

  private drawMachineBubbles(g: Game, t: number): void {
    const c = this.ctx, s = g.ctx.s;
    for (const mc of s.machines[g.map.def.id] ?? []) {
      const st = machineStatus(s, mc);
      const cx = mc.x * TILE + 8, top = (mc.y + 1) * TILE - 34;
      if (st.state === 'working') {
        c.fillStyle = P.ink; c.fillRect(cx - 9, top - 4, 18, 4);
        c.fillStyle = P.teal; c.fillRect(cx - 8, top - 3, Math.max(1, Math.round(16 * st.progress)), 2);
      } else if (st.state === 'done') {
        const bob = Math.round(Math.sin(t * 5) * 1.5);
        c.drawImage(bubbleSprite(), cx - 6, top - 12 + bob);
      }
    }
  }

  /** Glitzern auf Fundstücken, Herzen bei Tieren, Markierung für Kundschaft. */
  private drawLifeMarkers(g: Game, t: number): void {
    const c = this.ctx, s = g.ctx.s;
    for (const f of s.forage[g.map.def.id] ?? []) {
      const ph = (t * 1.3 + f.x * 0.7 + f.y * 0.3) % 2.2;
      if (ph > 0.5) continue;
      const k = ph < 0.25 ? 1 : 2;
      const x = f.x * TILE + 11, y = f.y * TILE + 4;
      c.fillStyle = P.white;
      c.fillRect(x, y - k, 1, k * 2 + 1); c.fillRect(x - k, y, k * 2 + 1, 1);
    }
    for (const a of g.animals) {
      if (a.hearts <= 0) continue;
      const y = Math.round(a.y - 20 - (1.5 - a.hearts) * 8);
      c.fillStyle = P.r3;
      c.fillRect(Math.round(a.x) - 2, y, 2, 1); c.fillRect(Math.round(a.x) + 1, y, 2, 1); c.fillRect(Math.round(a.x) - 2, y + 1, 5, 1); c.fillRect(Math.round(a.x) - 1, y + 2, 3, 1); c.fillRect(Math.round(a.x), y + 3, 1, 1);
    }
    const bob = Math.round(Math.sin(t * 3) * 1);
    for (const w of g.walkers) {
      if (!w.customer || w.served) continue;
      const x = Math.round(w.x) - 3, y = Math.round(w.y) - 33 + bob;
      c.fillStyle = P.ink; c.fillRect(x - 1, y - 1, 9, 8);
      c.fillStyle = P.white; c.fillRect(x, y, 7, 6); c.fillRect(x + 2, y + 6, 2, 1);
      c.fillStyle = P.g3; c.fillRect(x + 3, y + 1, 1, 4); c.fillRect(x + 1, y + 2, 1, 1); c.fillRect(x + 5, y + 2, 1, 1); c.fillRect(x + 2, y + 3, 3, 1);
    }
  }

  private drawQuestMarker(g: Game, t: number): void {
    const pt = g.questPoint();
    if (!pt || g.ui.blocking) return;
    const c = this.ctx;
    const bob = Math.round(Math.sin(t * 4) * 2);
    const margin = 10;
    const inView = pt.x > this.camX + margin && pt.x < this.camX + this.viewW - margin && pt.y > this.camY + 24 && pt.y < this.camY + this.viewH - margin;
    const arrow = arrowSprite();
    if (inView) {
      c.drawImage(arrow, Math.round(pt.x - 5), Math.round(pt.y - 30 + bob));
    } else {
      const cx = this.camX + this.viewW / 2, cy = this.camY + this.viewH / 2;
      const ang = Math.atan2(pt.y - cy, pt.x - cx);
      const ex = Math.max(this.camX + 14, Math.min(this.camX + this.viewW - 14, pt.x));
      const ey = Math.max(this.camY + 70, Math.min(this.camY + this.viewH - 60, pt.y));
      c.save();
      c.translate(Math.round(ex), Math.round(ey));
      c.rotate(ang - Math.PI / 2);
      c.drawImage(arrow, -5, -6 + bob * 0.5);
      c.restore();
    }
  }
}

function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  c.fillStyle = 'rgba(26,18,32,0.28)';
  for (let j = -ry; j <= ry; j++) {
    const w = Math.round(rx * Math.sqrt(1 - (j * j) / ((ry + 0.5) * (ry + 0.5))));
    c.fillRect(Math.round(x - w), Math.round(y + j), w * 2, 1);
  }
}

function arrowSprite(): HTMLCanvasElement {
  return sprite('ui:arrow', () => {
    const p = new Painter(11, 12);
    p.rect(3, 0, 5, 6, P.y2).rect(1, 6, 9, 1, P.y2).rect(2, 7, 7, 1, P.y2).rect(3, 8, 5, 1, P.y2).rect(4, 9, 3, 1, P.y2).px(5, 10, P.y2);
    p.vline(4, 1, 5, P.y3);
    p.outline(P.ink);
    return p.canvas;
  });
}

function bubbleSprite(): HTMLCanvasElement {
  return sprite('ui:bubble', () => {
    const p = new Painter(12, 13);
    p.rect(1, 1, 10, 9, P.white).px(5, 10, P.white).px(6, 10, P.white).px(6, 11, P.white);
    p.rect(5, 2, 2, 5, P.y1).rect(5, 8, 2, 1, P.y1);
    p.outline(P.ink);
    return p.canvas;
  });
}
