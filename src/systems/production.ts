import { MACHINES, type Recipe } from '../data/machines';
import { addItem, countItem, removeItem, spaceFor } from './inventory';
import { absMinute, type Ctx, type GameState, type PlacedMachine } from './state';

export type MachineStatus = { state: 'idle' } | { state: 'working'; remaining: number; progress: number } | { state: 'done' };

export function machineStatus(s: GameState, m: PlacedMachine): MachineStatus {
  if (!m.job) return { state: 'idle' };
  const now = absMinute(s);
  if (now >= m.job.doneAt) return { state: 'done' };
  const recipe = findRecipe(m, m.job.recipe);
  const total = recipe?.minutes ?? 1;
  const remaining = m.job.doneAt - now;
  return { state: 'working', remaining, progress: 1 - remaining / total };
}

export function findRecipe(m: PlacedMachine, id: string): Recipe | undefined {
  return MACHINES[m.machine]?.recipes.find((r) => r.id === id);
}

/** Wie viele Chargen könnte der Spieler jetzt starten? */
export function possibleBatches(s: GameState, m: PlacedMachine, recipe: Recipe): number {
  const cap = MACHINES[m.machine].capacity;
  let n = cap;
  for (const inp of recipe.inputs) n = Math.min(n, Math.floor(countItem(s, inp.item) / inp.qty));
  return n;
}

export function startJob(ctx: Ctx, m: PlacedMachine, recipeId: string): { ok: boolean; msg: string; batches?: number } {
  if (m.job) return { ok: false, msg: 'Die Maschine arbeitet bereits.' };
  const recipe = findRecipe(m, recipeId);
  if (!recipe) return { ok: false, msg: 'Unbekanntes Rezept.' };
  const batches = possibleBatches(ctx.s, m, recipe);
  if (batches < 1) return { ok: false, msg: 'Nicht genug Zutaten.' };
  for (const inp of recipe.inputs) removeItem(ctx.s, inp.item, inp.qty * batches);
  m.job = { recipe: recipe.id, batches, doneAt: absMinute(ctx.s) + recipe.minutes };
  ctx.bus.emit('machineStarted', { machine: m.machine, recipe: recipe.id });
  return { ok: true, msg: `${recipe.name}: ${batches}× gestartet`, batches };
}

export function collect(ctx: Ctx, m: PlacedMachine): { ok: boolean; msg: string } {
  const st = machineStatus(ctx.s, m);
  if (st.state !== 'done' || !m.job) return { ok: false, msg: 'Noch nicht fertig.' };
  const recipe = findRecipe(m, m.job.recipe);
  if (!recipe) { m.job = undefined; return { ok: false, msg: 'Rezept fehlt – Ladung verworfen.' }; }
  const qty = recipe.output.qty * m.job.batches;
  if (spaceFor(ctx.s, recipe.output.item) < qty) return { ok: false, msg: 'Inventar voll!' };
  addItem(ctx, recipe.output.item, qty);
  m.job = undefined;
  ctx.bus.emit('machineCollected', { machine: m.machine, item: recipe.output.item, qty });
  return { ok: true, msg: `+${qty}` };
}

export function machineAt(s: GameState, map: string, x: number, y: number): PlacedMachine | undefined {
  return s.machines[map]?.find((m) => m.x === x && m.y === y);
}

export function placeMachine(ctx: Ctx, map: string, x: number, y: number, machineId: string, itemId: string): boolean {
  if (removeItem(ctx.s, itemId, 1) < 1) return false;
  const list = (ctx.s.machines[map] ??= []);
  list.push({ uid: `m${ctx.s.nextUid++}`, machine: machineId, x, y });
  ctx.bus.emit('placed', { item: itemId, map });
  return true;
}
