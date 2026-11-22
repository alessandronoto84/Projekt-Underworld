import { Actor } from './actor';
import { currentEntry, type NpcDef, type ScheduleEntry } from '../data/npcs';
import type { GameState } from '../systems/state';
import type { GameMap } from '../world/gamemap';
import { findPath } from '../world/path';
import { TILE } from '../core/types';

const SPEED = 38;

/** NPC mit Tagesablauf. Läuft per Pfadsuche zu seinen Zielen. */
export class Npc extends Actor {
  map: string | null = null;
  private path: [number, number][] = [];
  private entryKey = '';
  private finalTarget: { x: number; y: number; dir?: ScheduleEntry['dir'] } | null = null;
  idleTimer = Math.random() * 4;
  /** Kurzzeitig zum Spieler gedreht (nach dem Ansprechen). */
  faceTimer = 0;

  constructor(readonly def: NpcDef) { super(def.id, def.look); }

  /** Prüft den Tagesablauf und plant ggf. einen Ortswechsel. */
  sync(s: GameState, maps: Record<string, GameMap>, playerMap: string, force = false): void {
    const e = currentEntry(this.def, s);
    const key = `${e.at}:${e.map}:${e.x}:${e.y}`;
    if (key === this.entryKey && !force) return;
    this.entryKey = key;
    if (e.map === null) { this.map = null; this.path = []; this.finalTarget = null; return; }
    const target = { x: e.x * TILE, y: e.y * TILE, dir: e.dir };
    const sameMap = this.map === e.map;
    if (!sameMap || force || e.map !== playerMap) {
      // Ortswechsel außerhalb der Sicht: direkt dort erscheinen.
      // Wechsel auf die Karte des Spielers: an einer Tür/Warp erscheinen und hinlaufen.
      const fromMap = this.map;
      this.map = e.map;
      const m = maps[e.map];
      const entry = !force && e.map === playerMap && m ? entrancePoint(m, fromMap) : null;
      if (entry) { this.x = entry.x; this.y = entry.y; this.planTo(m, target); }
      else { this.x = target.x; this.y = target.y; this.dir = e.dir ?? 'down'; this.path = []; this.finalTarget = null; }
      return;
    }
    this.planTo(maps[e.map], target);
  }

  private planTo(m: GameMap | undefined, target: { x: number; y: number; dir?: ScheduleEntry['dir'] }): void {
    this.finalTarget = target;
    if (!m) { this.x = target.x; this.y = target.y; return; }
    const p = findPath(m, Math.floor(this.x / TILE), Math.floor((this.y - 2) / TILE), Math.floor(target.x / TILE), Math.floor((target.y - 2) / TILE));
    this.path = p ?? [];
    if (!p) { this.x = target.x; this.y = target.y; }
  }

  update(dt: number): void {
    if (this.faceTimer > 0) { this.faceTimer -= dt; this.moving = false; return; }
    let goal: { x: number; y: number } | null = null;
    if (this.path.length) {
      const [tx, ty] = this.path[0];
      goal = { x: tx * TILE + 8, y: ty * TILE + 12 };
      if (this.path.length === 1 && this.finalTarget) goal = this.finalTarget;
    } else if (this.finalTarget && (Math.abs(this.finalTarget.x - this.x) > 0.5 || Math.abs(this.finalTarget.y - this.y) > 0.5)) {
      goal = this.finalTarget;
    }
    if (!goal) {
      this.moving = false;
      if (this.finalTarget?.dir) this.dir = this.finalTarget.dir;
      return;
    }
    const dx = goal.x - this.x, dy = goal.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = SPEED * dt;
    if (dist <= step) {
      this.x = goal.x; this.y = goal.y;
      if (this.path.length) this.path.shift();
    } else {
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
    }
    this.moving = true;
    this.animTime += dt;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
}

function entrancePoint(m: GameMap, fromMap: string | null): { x: number; y: number } | null {
  const w = m.warps.find((x) => x.to === fromMap) ?? m.warps[0];
  if (!w) return null;
  // Tür mitten auf der Karte: direkt davor erscheinen.
  if (w.x > 0 && w.x < m.w - 1 && w.y > 0 && w.y < m.h - 1) return { x: (w.x + 0.5) * TILE, y: (w.y + 1.6) * TILE };
  // Etwas innerhalb der Karte, damit der NPC nicht im Warp steht.
  let x = (w.x + w.w / 2) * TILE, y = (w.y + w.h / 2) * TILE;
  if (w.x === 0) x += TILE; else if (w.x >= m.w - 1) x -= TILE;
  if (w.y >= m.h - 1) y -= TILE;
  return { x, y };
}
