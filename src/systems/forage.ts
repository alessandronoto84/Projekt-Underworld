import { FORAGE, SPAWNS, TRASH_LOOT } from '../data/forage';
import { mulberry32, hashString } from '../core/rng';
import { addItem, spaceFor } from './inventory';
import { addMoney, type Ctx, type GameState } from './state';

export interface ForageSpot { x: number; y: number; id: string; quest?: boolean }

/** Prüft, ob auf einem Tile etwas liegen darf (von der Karte geliefert). */
export type SpotCheck = (map: string, x: number, y: number) => boolean;

/** Legt die Fundstücke für den aktuellen Tag neu aus. Quest-Funde bleiben liegen. */
export function spawnForage(s: GameState, canSpawn: SpotCheck): void {
  const keep: Record<string, ForageSpot[]> = {};
  for (const [m, list] of Object.entries(s.forage)) keep[m] = list.filter((f) => f.quest);
  s.forage = keep;
  for (const rule of SPAWNS) {
    const r = mulberry32(s.seed + s.time.day * 7349 + hashString(rule.map + rule.zones[0].x + rule.zones[0].y));
    const n = rule.perDay[0] + Math.floor(r() * (rule.perDay[1] - rule.perDay[0] + 1));
    const total = rule.table.reduce((a, [, w]) => a + w, 0);
    const list = (s.forage[rule.map] ??= []);
    for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
      const z = rule.zones[Math.floor(r() * rule.zones.length)];
      const x = z.x + Math.floor(r() * z.w), y = z.y + Math.floor(r() * z.h);
      if (!canSpawn(rule.map, x, y) || list.some((f) => f.x === x && f.y === y)) continue;
      let pick = r() * total, id = rule.table[0][0];
      for (const [fid, w] of rule.table) { pick -= w; if (pick <= 0) { id = fid; break; } }
      list.push({ x, y, id });
      i++;
    }
  }
}

export function forageAt(s: GameState, map: string, x: number, y: number): ForageSpot | undefined {
  return s.forage[map]?.find((f) => f.x === x && f.y === y);
}

/** Aufheben. Gibt die erhaltenen Gegenstände zurück. */
export function pickForage(ctx: Ctx, map: string, spot: ForageSpot): { ok: boolean; msg: string; got: [string, number][] } {
  const def = FORAGE[spot.id];
  if (!def) return { ok: false, msg: '…', got: [] };
  const r = mulberry32(ctx.s.seed + ctx.s.time.day * 31 + spot.x * 977 + spot.y * 131);
  const got: [string, number][] = [];
  for (const g of def.gives) {
    if (g.chance !== undefined && r() > g.chance) continue;
    const q = g.qty[0] + Math.floor(r() * (g.qty[1] - g.qty[0] + 1));
    if (spaceFor(ctx.s, g.item) < q) return { ok: false, msg: 'Inventar voll!', got: [] };
    got.push([g.item, q]);
  }
  for (const [item, q] of got) { addItem(ctx, item, q); ctx.bus.emit('looted', { item, qty: q, map }); }
  ctx.s.forage[map] = (ctx.s.forage[map] ?? []).filter((f) => f !== spot);
  return { ok: true, msg: def.name, got };
}

/** Mülltonne durchsuchen – einmal pro Tag und Tonne. */
export function searchTrash(ctx: Ctx, key: string): { ok: boolean; msg: string; item?: string; qty?: number; money?: number } {
  const s = ctx.s;
  if (s.searched[key] === s.time.day) return { ok: false, msg: 'Hier hast du heute schon gewühlt.' };
  s.searched[key] = s.time.day;
  const r = mulberry32(s.seed + s.time.day * 613 + hashString(key));
  let pick = r() * TRASH_LOOT.reduce((a, l) => a + l.weight, 0);
  const loot = TRASH_LOOT.find((l) => (pick -= l.weight) <= 0) ?? TRASH_LOOT[TRASH_LOOT.length - 1];
  if (loot.money) {
    const m = loot.money[0] + Math.floor(r() * (loot.money[1] - loot.money[0] + 1));
    addMoney(ctx, m);
    return { ok: true, msg: `${loot.text} +${m} $`, money: m };
  }
  if (loot.item && loot.qty) {
    const q = loot.qty[0] + Math.floor(r() * (loot.qty[1] - loot.qty[0] + 1));
    if (spaceFor(s, loot.item) < q) return { ok: false, msg: 'Inventar voll!' };
    addItem(ctx, loot.item, q);
    ctx.bus.emit('looted', { item: loot.item, qty: q, map: 'trash' });
    return { ok: true, msg: loot.text, item: loot.item, qty: q };
  }
  return { ok: true, msg: loot.text };
}

export { FORAGE };
