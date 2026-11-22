import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { tileKey } from '../core/types';
import { mulberry32 } from '../core/rng';
import { addItem, removeItem, spaceFor } from './inventory';
import type { Ctx, GameState, SoilTile } from './state';

export type FarmResult = { ok: true; msg?: string } | { ok: false; msg: string };

export function soilAt(s: GameState, map: string, x: number, y: number): SoilTile | undefined {
  return s.farms[map]?.[tileKey(x, y)];
}

export function till(ctx: Ctx, map: string, x: number, y: number, farmable: boolean): FarmResult {
  if (!farmable) return { ok: false, msg: 'Hier kann man nichts anbauen.' };
  const farm = (ctx.s.farms[map] ??= {});
  const k = tileKey(x, y);
  if (farm[k]) return { ok: false, msg: 'Schon umgegraben.' };
  farm[k] = { watered: false, idleDays: 0 };
  ctx.bus.emit('tilled', { map, x, y });
  return { ok: true };
}

export function water(ctx: Ctx, map: string, x: number, y: number): FarmResult {
  const t = soilAt(ctx.s, map, x, y);
  if (!t) return { ok: false, msg: 'Nur umgegrabene Erde lässt sich gießen.' };
  if (t.watered) return { ok: false, msg: 'Schon gegossen.' };
  t.watered = true;
  ctx.bus.emit('watered', { map, x, y });
  return { ok: true };
}

export function plant(ctx: Ctx, map: string, x: number, y: number, seedId: string): FarmResult {
  const t = soilAt(ctx.s, map, x, y);
  const cropId = ITEMS[seedId]?.seedOf;
  if (!cropId) return { ok: false, msg: 'Das ist kein Saatgut.' };
  if (!t) return { ok: false, msg: 'Erst mit der Hacke umgraben.' };
  if (t.crop) return { ok: false, msg: 'Hier wächst schon etwas.' };
  if (removeItem(ctx.s, seedId, 1) < 1) return { ok: false, msg: 'Kein Saatgut mehr.' };
  t.crop = { id: cropId, growth: 0, ready: false };
  t.idleDays = 0;
  ctx.bus.emit('planted', { map, crop: cropId });
  return { ok: true };
}

export function harvest(ctx: Ctx, map: string, x: number, y: number): FarmResult & { item?: string; qty?: number } {
  const t = soilAt(ctx.s, map, x, y);
  if (!t?.crop?.ready) return { ok: false, msg: 'Noch nicht reif.' };
  const def = CROPS[t.crop.id];
  const r = mulberry32(ctx.s.seed + ctx.s.time.day * 131 + x * 17 + y * 7);
  const qty = def.yield[0] + Math.floor(r() * (def.yield[1] - def.yield[0] + 1));
  if (spaceFor(ctx.s, def.harvest) < qty) return { ok: false, msg: 'Inventar voll!' };
  addItem(ctx, def.harvest, qty);
  ctx.s.stats.harvested += qty;
  if (def.regrowDays) {
    t.crop = { id: def.id, growth: def.growDays - def.regrowDays, ready: false };
  } else {
    t.crop = undefined;
  }
  ctx.bus.emit('harvested', { item: def.harvest, qty });
  return { ok: true, item: def.harvest, qty };
}

/** Sichtbare Wachstumsstufe: 0 = Saat … stages = reif. */
export function cropStage(t: SoilTile): number {
  if (!t.crop) return -1;
  const def = CROPS[t.crop.id];
  if (t.crop.ready) return def.stages;
  if (t.crop.growth <= 0) return 0;
  return Math.max(1, Math.min(def.stages - 1, Math.floor((t.crop.growth / def.growDays) * def.stages)));
}

/** Tageswechsel: gegossene Pflanzen wachsen; Regen gießt alles für den neuen Tag. */
export function farmNewDay(s: GameState, rainToday: boolean, outdoorMaps: ReadonlySet<string>): void {
  for (const [map, tiles] of Object.entries(s.farms)) {
    for (const [k, t] of Object.entries(tiles)) {
      if (t.crop && !t.crop.ready && t.watered) {
        t.crop.growth += 1;
        if (t.crop.growth >= CROPS[t.crop.id].growDays) t.crop.ready = true;
      }
      if (!t.crop) {
        t.idleDays += 1;
        if (t.idleDays >= 3) { delete tiles[k]; continue; }
      }
      t.watered = rainToday && outdoorMaps.has(map);
    }
  }
}
