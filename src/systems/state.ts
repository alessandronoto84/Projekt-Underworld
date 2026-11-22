import type { Dir } from '../core/types';
import { EventBus } from '../core/events';

/** Aktuelle Spielstand-Version. Bei Strukturänderungen erhöhen + Migration in save.ts ergänzen. */
export const SAVE_VERSION = 2;

export const INVENTORY_SIZE = 24;
export const HOTBAR_SIZE = 8;
export const DAY_START = 6 * 60;      // 06:00
export const DAY_END = 26 * 60;       // 02:00 des Folgetags
export const CAN_CAPACITY = 20;

export interface ItemStack { id: string; qty: number; water?: number }

export interface CropState { id: string; growth: number; ready: boolean }
export interface SoilTile { watered: boolean; crop?: CropState; idleDays: number }

export interface MachineJob { recipe: string; batches: number; doneAt: number }
export interface PlacedMachine { uid: string; machine: string; x: number; y: number; job?: MachineJob }

export interface Order {
  id: string; channel: string; item: string; qty: number;
  reward: number; deadlineDay: number; tutorial?: boolean;
}

export type Weather = 'sun' | 'rain';

export interface DayLedger { day: number; income: number; expenses: number }

export interface GameState {
  version: number;
  seed: number;
  money: number;
  time: { day: number; minute: number };
  weather: Weather;
  tomorrowWeather: Weather;
  player: { map: string; x: number; y: number; dir: Dir; energy: number; maxEnergy: number };
  inventory: (ItemStack | null)[];
  selected: number;
  farms: Record<string, Record<string, SoilTile>>;
  machines: Record<string, PlacedMachine[]>;
  orders: Order[];
  quest: { step: number; progress: number };
  flags: Record<string, boolean>;
  npcs: Record<string, { friendship: number; talkedDay: number }>;
  market: Record<string, Record<string, number>>;
  stats: { earned: number; spent: number; harvested: number; sold: number; ordersDone: number };
  ledger: DayLedger[];
  nextUid: number;
}

export interface Ctx { s: GameState; bus: EventBus }

export function createNewGame(seed = Date.now() % 1_000_000): GameState {
  const inv: (ItemStack | null)[] = Array(INVENTORY_SIZE).fill(null);
  inv[0] = { id: 'hoe', qty: 1 };
  inv[1] = { id: 'watering_can', qty: 1, water: CAN_CAPACITY };
  inv[2] = { id: 'letter_uncle', qty: 1 };
  return {
    version: SAVE_VERSION,
    seed,
    money: 150,
    time: { day: 1, minute: DAY_START + 30 },
    weather: 'sun',
    tomorrowWeather: 'sun',
    player: { map: 'home', x: 3 * 16 + 8, y: 5 * 16 + 12, dir: 'down', energy: 120, maxEnergy: 120 },
    inventory: inv,
    selected: 0,
    farms: {},
    machines: { farm: [{ uid: 'm1', machine: 'drying_rack', x: 11, y: 8 }] },
    orders: [],
    quest: { step: 0, progress: 0 },
    flags: {},
    npcs: {},
    market: {},
    stats: { earned: 0, spent: 0, harvested: 0, sold: 0, ordersDone: 0 },
    ledger: [{ day: 1, income: 0, expenses: 0 }],
    nextUid: 2,
  };
}

export function absMinute(s: GameState): number {
  return (s.time.day - 1) * 1440 + s.time.minute;
}

export function todayLedger(s: GameState): DayLedger {
  let l = s.ledger[s.ledger.length - 1];
  if (!l || l.day !== s.time.day) {
    l = { day: s.time.day, income: 0, expenses: 0 };
    s.ledger.push(l);
    if (s.ledger.length > 14) s.ledger.shift();
  }
  return l;
}

export function addMoney(ctx: Ctx, delta: number): void {
  ctx.s.money += delta;
  const l = todayLedger(ctx.s);
  if (delta >= 0) { l.income += delta; ctx.s.stats.earned += delta; }
  else { l.expenses -= delta; ctx.s.stats.spent -= delta; }
  ctx.bus.emit('moneyChanged', { money: ctx.s.money, delta });
}
