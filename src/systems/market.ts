import { CHANNELS, SHOPS } from '../data/trade';
import { ITEMS } from '../data/items';
import { hash2, mulberry32 } from '../core/rng';
import { addItem, countItem, removeItem, spaceFor } from './inventory';
import { addMoney, type Ctx, type GameState, type Order } from './state';

const MIN_DEMAND = 0.4;

export function demand(s: GameState, channel: string, item: string): number {
  return s.market[channel]?.[item] ?? 1;
}

/** Tagesschwankung ±10 % – deterministisch pro Tag/Item. */
export function dailyFactor(s: GameState, item: string): number {
  let h = 0;
  for (let i = 0; i < item.length; i++) h = (h * 31 + item.charCodeAt(i)) | 0;
  return 0.9 + hash2(s.time.day, h, s.seed) * 0.2;
}

export function basePrice(channel: string, item: string): number | undefined {
  return CHANNELS[channel]?.buys.find((b) => b.item === item)?.price;
}

export function unitPrice(s: GameState, channel: string, item: string, demandOverride?: number): number {
  const base = basePrice(channel, item);
  if (base === undefined) return 0;
  const d = demandOverride ?? demand(s, channel, item);
  return Math.max(1, Math.round(base * d * dailyFactor(s, item)));
}

/** Preis für `qty` Stück – die Nachfrage sinkt mit jedem verkauften Stück. */
export function quote(s: GameState, channel: string, item: string, qty: number): number {
  const ch = CHANNELS[channel];
  let d = demand(s, channel, item), total = 0;
  for (let i = 0; i < qty; i++) {
    total += unitPrice(s, channel, item, d);
    d = Math.max(MIN_DEMAND, d - ch.saturation);
  }
  return total;
}

export function sell(ctx: Ctx, channel: string, item: string, qty: number): { ok: boolean; total: number; msg: string } {
  const ch = CHANNELS[channel];
  if (!ch || basePrice(channel, item) === undefined) return { ok: false, total: 0, msg: 'Daran ist hier niemand interessiert.' };
  const have = countItem(ctx.s, item);
  const n = Math.min(have, qty);
  if (n <= 0) return { ok: false, total: 0, msg: 'Nichts zu verkaufen.' };
  const total = quote(ctx.s, channel, item, n);
  removeItem(ctx.s, item, n);
  const m = (ctx.s.market[channel] ??= {});
  m[item] = Math.max(MIN_DEMAND, demand(ctx.s, channel, item) - ch.saturation * n);
  addMoney(ctx, total);
  ctx.s.stats.sold += n;
  ctx.bus.emit('sold', { item, qty: n, total, channel });
  return { ok: true, total, msg: `${n}× ${ITEMS[item].name} für ${total} $ verkauft` };
}

export function buy(ctx: Ctx, shopId: string, item: string, qty: number): { ok: boolean; msg: string } {
  const entry = SHOPS[shopId]?.stock.find((e) => e.item === item);
  if (!entry) return { ok: false, msg: 'Nicht im Angebot.' };
  const total = entry.price * qty;
  if (ctx.s.money < total) return { ok: false, msg: 'Nicht genug Geld.' };
  if (spaceFor(ctx.s, item) < qty) return { ok: false, msg: 'Inventar voll!' };
  addMoney(ctx, -total);
  addItem(ctx, item, qty);
  ctx.bus.emit('bought', { item, qty, total });
  return { ok: true, msg: `${qty}× ${ITEMS[item].name} gekauft` };
}

export function marketNewDay(s: GameState): void {
  for (const [chId, items] of Object.entries(s.market)) {
    const rec = CHANNELS[chId]?.recovery ?? 0.4;
    for (const k of Object.keys(items)) {
      items[k] = items[k] + (1 - items[k]) * rec;
      if (Math.abs(1 - items[k]) < 0.01) delete items[k];
    }
  }
}

/* ----------------------------------------------------------------- Aufträge */

export function deliverOrder(ctx: Ctx, orderId: string): { ok: boolean; msg: string } {
  const o = ctx.s.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, msg: 'Auftrag nicht gefunden.' };
  if (countItem(ctx.s, o.item) < o.qty) {
    return { ok: false, msg: `Dir fehlen noch ${o.qty - countItem(ctx.s, o.item)}× ${ITEMS[o.item].name}.` };
  }
  removeItem(ctx.s, o.item, o.qty);
  ctx.s.orders = ctx.s.orders.filter((x) => x !== o);
  addMoney(ctx, o.reward);
  ctx.s.stats.sold += o.qty;
  if (!o.tutorial) ctx.s.stats.ordersDone += 1;
  ctx.bus.emit('orderCompleted', { orderId: o.id, reward: o.reward });
  return { ok: true, msg: `Auftrag erledigt: +${o.reward} $` };
}

/** Erzeugt neue Aufträge für freigeschaltete Kanäle und entfernt abgelaufene. */
export function ordersNewDay(s: GameState): Order[] {
  const expired = s.orders.filter((o) => !o.tutorial && o.deadlineDay < s.time.day);
  s.orders = s.orders.filter((o) => !expired.includes(o));
  if (!s.flags.tutorialDone) return expired;
  const r = mulberry32(s.seed * 7 + s.time.day * 977);
  const ricoOrders = s.orders.filter((o) => o.channel === 'rico').length;
  if (ricoOrders < 2 && r() < 0.7) {
    const pool = ['cannabis', 'cannabis'];
    if (s.flags.stage2) pool.push('ecstasy', 'ecstasy');
    if (s.flags.stage3) pool.push('kokain');
    const itemId = pool[(r() * pool.length) | 0];
    const base = itemId === 'cannabis' ? 6 : itemId === 'ecstasy' ? 10 : 4;
    const qty = base + ((r() * base) | 0);
    const unit = basePrice('rico', itemId) ?? ITEMS[itemId].value;
    s.orders.push({
      id: `o${s.time.day}_${(r() * 1e6) | 0}`,
      channel: 'rico', item: itemId, qty,
      reward: Math.round(unit * qty * (1.3 + r() * 0.2)),
      deadlineDay: s.time.day + 2 + ((r() * 2) | 0),
    });
  }
  return expired;
}
