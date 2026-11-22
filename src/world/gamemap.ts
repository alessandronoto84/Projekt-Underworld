import { Painter } from '../art/painter';
import { P } from '../art/palette';
import { drawEdgeFringe, drawGround, GROUND_PRIORITY, SOLID_GROUND, type GroundType } from '../art/tiles';
import * as O from '../art/objects';
import { furnitureSprite, sprite } from '../art/atlas';
import { hashString } from '../core/rng';
import { TILE, type Rect } from '../core/types';
import type { FurnitureArt, LightDef, MapDef, Warp } from './mapdef';

export interface WorldObject {
  sprite: HTMLCanvasElement;
  dx: number; dy: number;
  sortY: number;
  shadow?: { x: number; y: number; rx: number; ry: number };
  /** Flach am Boden (Teppiche) – wird vor allen Figuren gezeichnet. */
  flat?: boolean;
}

export interface Interactable {
  rect: Rect; // in Tiles
  action: string;
  text?: string;
  label: string;
}

const FURN_OFFSET: Partial<Record<FurnitureArt, { oy?: number; sort?: number; flat?: boolean; wall?: boolean }>> = {
  laptop: { oy: -16, sort: 2 },
  rug: { flat: true }, rugRed: { flat: true }, doormat: { flat: true },
  window: { wall: true }, posterPink: { wall: true }, posterTeal: { wall: true },
};

/** Laufzeitrepräsentation einer Karte: Boden, Kollision, Objekte, Türen. */
export class GameMap {
  readonly w: number;
  readonly h: number;
  readonly ground: GroundType[];
  readonly solid: Uint8Array;
  readonly farmable: Uint8Array;
  readonly objects: WorldObject[] = [];
  readonly interactables: Interactable[] = [];
  readonly warps: Warp[] = [];
  readonly lights: LightDef[];
  readonly waterTiles: [number, number][] = [];
  groundCanvas!: HTMLCanvasElement;

  constructor(readonly def: MapDef) {
    this.w = def.width; this.h = def.height;
    this.ground = new Array(this.w * this.h).fill(def.base);
    for (const f of def.fills) {
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
        if (this.inBounds(x, y)) this.ground[y * this.w + x] = f.t;
      }
    }
    this.solid = new Uint8Array(this.w * this.h);
    this.farmable = new Uint8Array(this.w * this.h);
    for (let i = 0; i < this.ground.length; i++) {
      if (SOLID_GROUND.has(this.ground[i])) this.solid[i] = 1;
      if (this.ground[i] === 'water') this.waterTiles.push([i % this.w, (i / this.w) | 0]);
    }
    for (const r of def.farmable ?? []) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (this.inBounds(x, y)) this.farmable[y * this.w + x] = 1;
    }
    this.warps.push(...def.warps);
    this.lights = [...(def.lights ?? [])];
    this.buildObjects();
    this.renderGround();
  }

  inBounds(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  groundAt(x: number, y: number): GroundType { return this.inBounds(x, y) ? this.ground[y * this.w + x] : 'void'; }
  isSolid(x: number, y: number): boolean { return !this.inBounds(x, y) || this.solid[y * this.w + x] === 1; }
  isFarmable(x: number, y: number): boolean { return this.inBounds(x, y) && this.farmable[y * this.w + x] === 1; }
  private setSolid(x: number, y: number, v = 1): void { if (this.inBounds(x, y)) this.solid[y * this.w + x] = v; }

  interactableAt(x: number, y: number): Interactable | undefined {
    return this.interactables.find((it) => x >= it.rect.x && x < it.rect.x + it.rect.w && y >= it.rect.y && y < it.rect.y + it.rect.h);
  }

  warpAtPx(px: number, py: number): Warp | undefined {
    const tx = px / TILE, ty = py / TILE;
    return this.warps.find((w) => tx >= w.x && tx < w.x + w.w && ty >= w.y && ty < w.y + w.h);
  }

  /* ------------------------------------------------------------ Objekte */

  private add(o: WorldObject): void { this.objects.push(o); }

  private buildObjects(): void {
    const id = this.def.id;
    for (const [i, o] of this.def.objects.entries()) {
      const seed = hashString(`${id}:${i}`);
      const X = o.x * TILE, Y = o.y * TILE;
      switch (o.kind) {
        case 'tree': {
          const s = sprite(`tree:${o.variant}:${seed % 7}`, () => O.drawTree(o.variant, seed % 7 + 1));
          this.add({ sprite: s, dx: X - 8, dy: Y + 16 - 48, sortY: Y + 14, shadow: { x: X + 8, y: Y + 14, rx: 11, ry: 4 } });
          this.setSolid(o.x, o.y);
          break;
        }
        case 'bush': case 'berrybush': {
          const s = sprite(`bush:${o.kind}:${seed % 5}`, () => O.drawBush(seed % 5 + 3, o.kind === 'berrybush'));
          this.add({ sprite: s, dx: X - 2, dy: Y, sortY: Y + 14, shadow: { x: X + 8, y: Y + 14, rx: 9, ry: 3 } });
          this.setSolid(o.x, o.y);
          break;
        }
        case 'rock': {
          this.add({ sprite: sprite(`rock:${seed % 4}`, () => O.drawRock(seed % 4 + 1)), dx: X, dy: Y + 4, sortY: Y + 14 });
          this.setSolid(o.x, o.y);
          break;
        }
        case 'flowers': this.add({ sprite: sprite(`flowers:${seed % 6}`, () => O.drawFlowers(seed % 6 + 1)), dx: X, dy: Y, sortY: Y, flat: true }); break;
        case 'tallgrass': this.add({ sprite: sprite(`tallgrass:${seed % 4}`, () => O.drawTallGrass(seed % 4 + 1)), dx: X, dy: Y, sortY: Y + 15 }); break;
        case 'barrel': this.solidSprite(o.x, o.y, sprite('barrel', O.drawBarrel), 1, -2, o.action, o.action === 'well' ? 'Regentonne' : 'Fass'); break;
        case 'crate': this.solidSprite(o.x, o.y, sprite('crate', O.drawCrate), 0, 0); break;
        case 'trash': this.solidSprite(o.x, o.y, sprite('trash', O.drawTrashBin), 1, -2); break;
        case 'lamp': this.solidSprite(o.x, o.y, sprite('lamp', O.drawLampPost), 2, 16 - 36); break;
        case 'mailbox': this.solidSprite(o.x, o.y, sprite('mailbox', O.drawMailbox), 2, -4, o.action, 'Briefkasten'); break;
        case 'busstop': this.solidSprite(o.x, o.y, sprite('busstop', O.drawBusStop), 0, -20, o.action, 'Bushaltestelle'); break;
        case 'dumpster': {
          this.add({ sprite: sprite('dumpster', O.drawDumpster), dx: X, dy: Y - 6, sortY: Y + 14 });
          this.setSolid(o.x, o.y); this.setSolid(o.x + 1, o.y);
          break;
        }
        case 'bench': {
          this.add({ sprite: sprite('bench', O.drawBench), dx: X, dy: Y - 2, sortY: Y + 14 });
          this.setSolid(o.x, o.y); this.setSolid(o.x + 1, o.y);
          break;
        }
        case 'sign': {
          const s = sprite(`sign:${o.color ?? 'd'}`, () => O.drawSign(o.color));
          this.add({ sprite: s, dx: X, dy: Y - 4, sortY: Y + 14 });
          this.setSolid(o.x, o.y);
          this.interactables.push({ rect: { x: o.x, y: o.y, w: 1, h: 1 }, action: 'text', text: o.text, label: 'Lesen' });
          break;
        }
        case 'fence': {
          for (let k = 0; k < o.len; k++) {
            const fx = o.vertical ? o.x : o.x + k, fy = o.vertical ? o.y + k : o.y;
            this.add({ sprite: sprite(`fence:${o.vertical ? 'post' : 'h'}`, () => O.drawFence(o.vertical ? 'post' : 'h')), dx: fx * TILE, dy: fy * TILE - 4, sortY: fy * TILE + 14 });
            this.setSolid(fx, fy);
          }
          break;
        }
        case 'car': {
          this.add({ sprite: sprite(`car:${o.color}`, () => O.drawCar(o.color)), dx: X - 4, dy: Y - 8, sortY: Y + 14, shadow: { x: X + 16, y: Y + 14, rx: 18, ry: 3 } });
          for (let k = 0; k < 3; k++) this.setSolid(o.x + k - 0, o.y);
          break;
        }
        case 'building': this.buildBuilding(o, seed); break;
        case 'furniture': this.buildFurniture(o); break;
      }
    }
  }

  private solidSprite(tx: number, ty: number, s: HTMLCanvasElement, ox: number, oy: number, action?: string, label = ''): void {
    this.add({ sprite: s, dx: tx * TILE + ox, dy: ty * TILE + oy, sortY: ty * TILE + 14 });
    this.setSolid(tx, ty);
    if (action) this.interactables.push({ rect: { x: tx, y: ty, w: 1, h: 1 }, action, label });
  }

  private buildBuilding(o: Extract<MapDef['objects'][number], { kind: 'building' }>, seed: number): void {
    const s = sprite(`bld:${this.def.id}:${o.x}:${o.y}:${seed}`, () => O.drawBuilding(o.spec));
    const bottom = (o.y + 1) * TILE;
    this.add({ sprite: s, dx: o.x * TILE - 4, dy: bottom - (4 + o.spec.roofH + o.spec.wallH), sortY: bottom - 2 });
    const footRows = Math.max(2, Math.ceil(o.spec.wallH / TILE));
    for (let y = o.y - footRows + 1; y <= o.y; y++) for (let x = o.x; x < o.x + o.spec.widthTiles; x++) this.setSolid(x, y);
    const doorX = o.x + o.spec.door;
    if (o.door) {
      this.setSolid(doorX, o.y, 0);
      this.warps.push({ x: doorX, y: o.y, w: 1, h: 1, to: o.door.to, tx: o.door.tx, ty: o.door.ty, dir: o.door.dir, requires: o.door.requires });
      this.lights.push({ x: doorX * TILE + 8, y: o.y * TILE + 4, r: 26, color: 'rgba(255,210,130,0.45)', night: true });
    } else {
      this.interactables.push({ rect: { x: doorX, y: o.y, w: 1, h: 1 }, action: 'text', text: o.lockedText ?? 'Verschlossen.', label: o.name });
    }
    for (const wx of o.spec.windows ?? []) {
      this.lights.push({ x: (o.x + wx) * TILE + 8, y: bottom - Math.max(4, o.spec.wallH - 22) - 2, r: 22, color: 'rgba(255,200,110,0.5)', night: true });
    }
  }

  private buildFurniture(o: Extract<MapDef['objects'][number], { kind: 'furniture' }>): void {
    const s = furnitureSprite(o.art, o.widthTiles ?? 1);
    const off = FURN_OFFSET[o.art] ?? {};
    const sw = o.solid?.w ?? o.widthTiles ?? 1, sh = o.solid?.h ?? 1;
    if (off.flat) {
      this.add({ sprite: s, dx: o.x * TILE + (o.art === 'doormat' ? 0 : 0), dy: o.y * TILE + (o.art === 'doormat' ? 4 : 0), sortY: 0, flat: true });
    } else if (off.wall) {
      this.add({ sprite: s, dx: o.x * TILE + (TILE - s.width) / 2, dy: o.y * TILE + 8, sortY: 0, flat: true });
    } else {
      const bottom = (o.y + sh) * TILE + (off.oy ?? 0);
      this.add({ sprite: s, dx: Math.round(o.x * TILE + (sw * TILE - s.width) / 2), dy: bottom - s.height, sortY: (o.y + sh) * TILE + (off.sort ?? -1) });
    }
    if (o.solid) for (let y = 0; y < o.solid.h; y++) for (let x = 0; x < o.solid.w; x++) this.setSolid(o.x + x, o.y + y);
    if (o.action) {
      const a = o.area ?? o.solid ?? { w: 1, h: 1 };
      this.interactables.push({ rect: { x: o.x, y: o.y, w: a.w, h: a.h }, action: o.action, label: furnitureLabel(o.action) });
    }
  }

  /* ------------------------------------------------------------- Boden */

  private renderGround(): void {
    const p = new Painter(this.w * TILE, this.h * TILE);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const t = this.groundAt(x, y);
      if (t === 'wall') this.drawWall(p, x, y);
      else drawGround(p, x * TILE, y * TILE, t, x, y);
    }
    // Ränder / Übergänge
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const t = this.groundAt(x, y);
      const myPrio = GROUND_PRIORITY[t] ?? 0;
      const ox = x * TILE, oy = y * TILE;
      const sides: ['n' | 's' | 'e' | 'w', number, number][] = [['n', x, y - 1], ['s', x, y + 1], ['w', x - 1, y], ['e', x + 1, y]];
      for (const [side, nx, ny] of sides) {
        const nt = this.groundAt(nx, ny);
        const np = GROUND_PRIORITY[nt] ?? 0;
        if ((nt === 'grass' || nt === 'grassDark') && np > myPrio && myPrio > 0) {
          drawEdgeFringe(p, ox, oy, side, nt === 'grass' ? P.g3 : P.g2, nt === 'grass' ? P.g2 : P.g1, x, y);
        }
        if (t === 'water' && nt !== 'water') {
          const lip = nt === 'sand' ? P.sand0 : nt === 'cobble' ? P.s3 : P.g1;
          if (side === 'n') p.hline(ox, oy, TILE, lip).hline(ox, oy + 1, TILE, P.w1).hline(ox, oy + 2, TILE, P.w1);
          if (side === 's') p.hline(ox, oy + 15, TILE, P.w4);
          if (side === 'w') p.vline(ox, oy, TILE, lip).vline(ox + 1, oy, TILE, P.w1);
          if (side === 'e') p.vline(ox + 15, oy, TILE, lip).vline(ox + 14, oy, TILE, P.w1);
        }
        if (t === 'asphalt' && nt === 'pavement') {
          if (side === 'n') p.hline(ox, oy, TILE, P.s2).hline(ox, oy + 1, TILE, P.ink);
          if (side === 's') p.hline(ox, oy + 15, TILE, P.s2);
          if (side === 'w') p.vline(ox, oy, TILE, P.s2).vline(ox + 1, oy, TILE, P.ink);
          if (side === 'e') p.vline(ox + 15, oy, TILE, P.s2);
        }
        if (t === 'pavement' && (nt === 'grass' || nt === 'grassDark')) {
          if (side === 'n') p.hline(ox, oy, TILE, P.s2);
          if (side === 's') p.hline(ox, oy + 15, TILE, P.s1);
        }
        if (t !== 'void' && t !== 'wall' && nt === 'void' && !this.def.outdoor) {
          if (side === 'w') p.rect(ox, oy, 2, TILE, P.v0);
          if (side === 'e') p.rect(ox + 14, oy, 2, TILE, P.v0);
          if (side === 's') p.rect(ox, oy + 14, TILE, 2, P.v0);
        }
      }
    }
    for (const l of this.def.roadLines ?? []) {
      for (let k = 0; k < l.len; k++) {
        const x = (l.vertical ? l.x : l.x + k) * TILE, y = (l.vertical ? l.y + k : l.y) * TILE;
        if (l.vertical) p.rect(x + 7, y + 2, 2, 8, P.s4); else p.rect(x + 2, y + 7, 8, 2, P.s4);
      }
    }
    // Flache Deko direkt in den Boden einbrennen
    for (const o of this.objects) if (o.flat) p.ctx.drawImage(o.sprite, o.dx, o.dy);
    this.groundCanvas = p.canvas;
  }

  private drawWall(p: Painter, x: number, y: number): void {
    const W = this.def.walls ?? { paper: P.v1, stripe: P.v0, trim: P.b1 };
    const ox = x * TILE, oy = y * TILE;
    p.rect(ox, oy, TILE, TILE, W.paper);
    for (let i = 2; i < TILE; i += 5) p.vline(ox + i, oy, TILE, W.stripe);
    const above = this.groundAt(x, y - 1), below = this.groundAt(x, y + 1);
    if (above !== 'wall') p.rect(ox, oy, TILE, 3, P.ink).hline(ox, oy + 3, TILE, W.stripe);
    if (below !== 'wall') p.rect(ox, oy + 12, TILE, 4, W.trim).hline(ox, oy + 12, TILE, P.cream);
  }
}

function furnitureLabel(action: string): string {
  if (action === 'bed') return 'Schlafen';
  if (action.startsWith('shop:')) return 'Theke';
  if (action === 'laptop') return 'Laptop';
  if (action === 'chest') return 'Kiste';
  if (action === 'jukebox') return 'Jukebox';
  return 'Ansehen';
}
