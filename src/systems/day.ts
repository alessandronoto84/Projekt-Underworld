import { mulberry32 } from '../core/rng';
import { farmNewDay } from './farming';
import { marketNewDay, ordersNewDay } from './market';
import { addMoney, DAY_START, todayLedger, type Ctx, type DayLedger, type Order } from './state';

export interface DaySummary {
  endedDay: number;
  ledger: DayLedger;
  passedOut: boolean;
  penalty: number;
  expiredOrders: Order[];
}

/** Beendet den Tag (Schlafen oder Zusammenbruch) und bereitet den nächsten vor. */
export function endDay(ctx: Ctx, passedOut: boolean, outdoorMaps: ReadonlySet<string>): DaySummary {
  const s = ctx.s;
  const endedDay = s.time.day;
  let penalty = 0;
  if (passedOut) {
    penalty = Math.min(100, Math.floor(s.money * 0.1));
    if (penalty > 0) addMoney(ctx, -penalty);
  }
  const ledger = { ...todayLedger(s) };

  s.time.day += 1;
  s.time.minute = DAY_START;
  s.weather = s.tomorrowWeather;
  const r = mulberry32(s.seed + s.time.day * 7919);
  // Die ersten Tage bleibt es trocken, damit das Gießen erlernt wird.
  s.tomorrowWeather = s.time.day >= 3 && r() < 0.22 ? 'rain' : 'sun';

  farmNewDay(s, s.weather === 'rain', outdoorMaps);
  marketNewDay(s);
  const expiredOrders = ordersNewDay(s);

  s.player.energy = passedOut ? Math.round(s.player.maxEnergy * 0.6) : s.player.maxEnergy;
  todayLedger(s);
  ctx.bus.emit('slept', { day: endedDay });
  ctx.bus.emit('newDay', { day: s.time.day });
  return { endedDay, ledger, passedOut, penalty, expiredOrders };
}
