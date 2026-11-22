import { ITEMS } from '../data/items';
import type { Ctx, GameState, ItemStack } from './state';

export function countItem(s: GameState, id: string): number {
  return s.inventory.reduce((n, st) => n + (st && st.id === id ? st.qty : 0), 0);
}

/** Wie viele Stück von `id` passen noch ins Inventar? */
export function spaceFor(s: GameState, id: string): number {
  const max = ITEMS[id]?.stack ?? 1;
  let n = 0;
  for (const st of s.inventory) {
    if (!st) n += max;
    else if (st.id === id) n += max - st.qty;
  }
  return n;
}

/** Fügt Items hinzu (füllt erst vorhandene Stapel). Gibt nicht untergebrachte Menge zurück. */
export function addItem(ctx: Ctx, id: string, qty: number): number {
  const s = ctx.s;
  const def = ITEMS[id];
  if (!def) throw new Error(`Unbekanntes Item ${id}`);
  let left = qty;
  for (const st of s.inventory) {
    if (left <= 0) break;
    if (st && st.id === id && st.qty < def.stack) {
      const take = Math.min(def.stack - st.qty, left);
      st.qty += take; left -= take;
    }
  }
  for (let i = 0; i < s.inventory.length && left > 0; i++) {
    if (!s.inventory[i]) {
      const take = Math.min(def.stack, left);
      s.inventory[i] = { id, qty: take };
      left -= take;
    }
  }
  const added = qty - left;
  if (added > 0) ctx.bus.emit('itemAdded', { item: id, qty: added });
  return left;
}

/** Entfernt bis zu `qty` Stück. Gibt tatsächlich entfernte Menge zurück. */
export function removeItem(s: GameState, id: string, qty: number): number {
  let left = qty;
  // Von hinten entfernen, damit die Schnellleiste möglichst stabil bleibt.
  for (let i = s.inventory.length - 1; i >= 0 && left > 0; i--) {
    const st = s.inventory[i];
    if (st && st.id === id) {
      const take = Math.min(st.qty, left);
      st.qty -= take; left -= take;
      if (st.qty <= 0) s.inventory[i] = null;
    }
  }
  return qty - left;
}

export function selectedStack(s: GameState): ItemStack | null {
  return s.inventory[s.selected] ?? null;
}

export function swapSlots(s: GameState, a: number, b: number): void {
  if (a === b) return;
  const A = s.inventory[a], B = s.inventory[b];
  if (A && B && A.id === B.id) {
    const max = ITEMS[A.id]?.stack ?? 1;
    const move = Math.min(max - B.qty, A.qty);
    if (move > 0) {
      B.qty += move; A.qty -= move;
      if (A.qty <= 0) s.inventory[a] = null;
      return;
    }
  }
  s.inventory[a] = B; s.inventory[b] = A;
}
