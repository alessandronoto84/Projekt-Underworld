import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { createNewGame, type Ctx } from '../src/systems/state';
import { addItem, countItem, removeItem, spaceFor, swapSlots } from '../src/systems/inventory';
import { cropStage, harvest, plant, soilAt, till, water } from '../src/systems/farming';
import { collect, machineStatus, startJob } from '../src/systems/production';
import { buy, deliverOrder, quote, sell, unitPrice } from '../src/systems/market';
import { endDay } from '../src/systems/day';
import { deserialize, serialize } from '../src/systems/save';
import { advanceMinutes, formatClock } from '../src/systems/time';

const OUT = new Set(['farm', 'town']);
function ctx(): Ctx { return { s: createNewGame(42), bus: new EventBus() }; }

describe('Inventar', () => {
  it('stapelt und entfernt Items', () => {
    const c = ctx();
    expect(addItem(c, 'tomate', 120)).toBe(0);
    expect(countItem(c.s, 'tomate')).toBe(120);
    expect(removeItem(c.s, 'tomate', 50)).toBe(50);
    expect(countItem(c.s, 'tomate')).toBe(70);
  });
  it('meldet Restmenge bei vollem Inventar', () => {
    const c = ctx();
    const free = spaceFor(c.s, 'tomate');
    expect(addItem(c, 'tomate', free + 5)).toBe(5);
  });
  it('tauscht und vereint Slots', () => {
    const c = ctx();
    c.s.inventory[5] = { id: 'tomate', qty: 10 };
    c.s.inventory[6] = { id: 'tomate', qty: 5 };
    swapSlots(c.s, 5, 6);
    expect(c.s.inventory[6]?.qty).toBe(15);
    expect(c.s.inventory[5]).toBeNull();
  });
});

describe('Anbau', () => {
  it('Umgraben → Pflanzen → Gießen → Wachsen → Ernten', () => {
    const c = ctx();
    addItem(c, 'seed_cannabis', 1);
    expect(till(c, 'farm', 15, 12, false).ok).toBe(false);
    expect(till(c, 'farm', 15, 12, true).ok).toBe(true);
    expect(plant(c, 'farm', 15, 12, 'seed_cannabis').ok).toBe(true);
    expect(countItem(c.s, 'seed_cannabis')).toBe(0);
    const t = soilAt(c.s, 'farm', 15, 12)!;
    expect(cropStage(t)).toBe(0);
    // Ohne Gießen kein Wachstum
    endDay(c, false, OUT);
    expect(t.crop!.growth).toBe(0);
    for (let d = 0; d < 3; d++) { expect(water(c, 'farm', 15, 12).ok).toBe(true); endDay(c, false, OUT); }
    expect(t.crop!.ready).toBe(true);
    const h = harvest(c, 'farm', 15, 12);
    expect(h.ok).toBe(true);
    expect(countItem(c.s, 'cannabis_frisch')).toBeGreaterThanOrEqual(1);
    expect(soilAt(c.s, 'farm', 15, 12)!.crop).toBeUndefined();
  });
  it('Tomate wächst nach der Ernte nach', () => {
    const c = ctx();
    addItem(c, 'seed_tomate', 1);
    till(c, 'farm', 1, 1, true); plant(c, 'farm', 1, 1, 'seed_tomate');
    for (let d = 0; d < 3; d++) { water(c, 'farm', 1, 1); endDay(c, false, OUT); }
    expect(harvest(c, 'farm', 1, 1).ok).toBe(true);
    const t = soilAt(c.s, 'farm', 1, 1)!;
    expect(t.crop?.id).toBe('tomate');
    for (let d = 0; d < 2; d++) { water(c, 'farm', 1, 1); endDay(c, false, OUT); }
    expect(t.crop!.ready).toBe(true);
  });
  it('leere Beete verwildern nach 3 Tagen', () => {
    const c = ctx();
    till(c, 'farm', 2, 2, true);
    for (let d = 0; d < 3; d++) endDay(c, false, OUT);
    expect(soilAt(c.s, 'farm', 2, 2)).toBeUndefined();
  });
});

describe('Produktion', () => {
  it('verarbeitet mehrere Chargen parallel', () => {
    const c = ctx();
    const rack = c.s.machines.farm[0];
    addItem(c, 'cannabis_frisch', 7);
    const r = startJob(c, rack, 'dry_cannabis');
    expect(r.ok).toBe(true);
    expect(r.batches).toBe(6);
    expect(countItem(c.s, 'cannabis_frisch')).toBe(1);
    expect(machineStatus(c.s, rack).state).toBe('working');
    expect(collect(c, rack).ok).toBe(false);
    advanceMinutes(c.s, 180);
    expect(machineStatus(c.s, rack).state).toBe('done');
    expect(collect(c, rack).ok).toBe(true);
    expect(countItem(c.s, 'cannabis')).toBe(6);
  });
  it('läuft über Nacht weiter', () => {
    const c = ctx();
    const rack = c.s.machines.farm[0];
    addItem(c, 'cannabis_frisch', 3);
    c.s.time.minute = 23 * 60;
    startJob(c, rack, 'dry_cannabis');
    endDay(c, false, OUT);
    expect(machineStatus(c.s, rack).state).toBe('done');
  });
});

describe('Handel', () => {
  it('Preis sinkt mit verkaufter Menge und erholt sich', () => {
    const c = ctx();
    const p1 = unitPrice(c.s, 'rico', 'cannabis');
    addItem(c, 'cannabis', 10);
    const q = quote(c.s, 'rico', 'cannabis', 10);
    expect(q).toBeLessThan(p1 * 10);
    const res = sell(c, 'rico', 'cannabis', 10);
    expect(res.total).toBe(q);
    expect(c.s.money).toBe(150 + q);
    expect(unitPrice(c.s, 'rico', 'cannabis')).toBeLessThan(p1);
    for (let d = 0; d < 6; d++) endDay(c, false, OUT);
    expect(c.s.market.rico?.cannabis ?? 1).toBeGreaterThan(0.9);
  });
  it('kauft nur mit genug Geld', () => {
    const c = ctx();
    expect(buy(c, 'rico', 'drying_rack', 1).ok).toBe(false);
    expect(buy(c, 'kramer', 'seed_tomate', 5).ok).toBe(true);
    expect(c.s.money).toBe(150 - 40);
  });
  it('liefert Aufträge aus', () => {
    const c = ctx();
    c.s.orders.push({ id: 't', channel: 'rico', item: 'cannabis', qty: 3, reward: 200, deadlineDay: 9 });
    expect(deliverOrder(c, 't').ok).toBe(false);
    addItem(c, 'cannabis', 3);
    expect(deliverOrder(c, 't').ok).toBe(true);
    expect(c.s.money).toBe(350);
    expect(c.s.orders).toHaveLength(0);
  });
});

describe('Zeit & Tage', () => {
  it('formatiert Uhrzeit in 10-Minuten-Schritten', () => {
    expect(formatClock(6 * 60 + 37)).toBe('06:30');
    expect(formatClock(25 * 60)).toBe('01:00');
  });
  it('Zusammenbruch kostet Geld und Energie', () => {
    const c = ctx();
    c.s.money = 500;
    const sum = endDay(c, true, OUT);
    expect(sum.penalty).toBe(50);
    expect(c.s.player.energy).toBeLessThan(c.s.player.maxEnergy);
    expect(c.s.time.day).toBe(2);
  });
});

describe('Speichern', () => {
  it('Roundtrip erhält den Spielstand', () => {
    const c = ctx();
    addItem(c, 'tomate', 4);
    till(c, 'farm', 3, 3, true);
    const back = deserialize(serialize(c.s));
    expect(countItem(back, 'tomate')).toBe(4);
    expect(back.farms.farm['3,3']).toBeDefined();
    expect(back.machines.farm).toHaveLength(1);
  });
  it('ergänzt fehlende Felder aus älteren Ständen', () => {
    const c = ctx();
    const raw = JSON.parse(serialize(c.s));
    delete raw.ledger; delete raw.stats;
    const back = deserialize(JSON.stringify(raw));
    expect(back.ledger).toBeDefined();
    expect(back.stats.earned).toBe(0);
  });
  it('lehnt Stände aus der Zukunft ab', () => {
    const c = ctx();
    const raw = JSON.parse(serialize(c.s));
    raw.version = 999;
    expect(() => deserialize(JSON.stringify(raw))).toThrow();
  });
});

describe('Imperium & Migration', () => {
  it('steigt bei genug Umsatz in Stufe 2 auf und schaltet Ware frei', async () => {
    const { Quests } = await import('../src/systems/quests');
    const { empireLevel } = await import('../src/data/empire');
    const c = ctx();
    const q = new Quests(c);
    c.s.flags.tutorialDone = true; c.s.quest.step = 99;
    c.s.stats.earned = 2600;
    q.checkGoals();
    expect(empireLevel(c.s)).toBe(2);
    expect(c.s.flags.stage2).toBe(true);
    c.s.money = 5000;
    expect(buy(c, 'rico', 'kit_mdma', 1).ok).toBe(true);
  });
  it('Pillenpresse und Packtisch verarbeiten Ware', () => {
    const c = ctx();
    c.s.machines.farm.push({ uid: 'p', machine: 'pill_press', x: 2, y: 2 }, { uid: 'k', machine: 'pack_table', x: 3, y: 2 });
    addItem(c, 'kit_mdma', 1); addItem(c, 'kokain_gross', 1);
    expect(startJob(c, c.s.machines.farm[1], 'press_ecstasy').ok).toBe(true);
    expect(startJob(c, c.s.machines.farm[2], 'pack_kokain').ok).toBe(true);
    advanceMinutes(c.s, 240);
    collect(c, c.s.machines.farm[1]); collect(c, c.s.machines.farm[2]);
    expect(countItem(c.s, 'ecstasy')).toBe(8);
    expect(countItem(c.s, 'kokain')).toBe(12);
  });
  it('migriert v1-Spielstände (Fantasy-Waren) nach v2', () => {
    const c = ctx();
    const raw = JSON.parse(serialize(c.s));
    raw.version = 1;
    raw.money = 100;
    raw.inventory[3] = { id: 'glimmer_buendel', qty: 4 };
    raw.inventory[4] = { id: 'mondrosinen', qty: 2 };
    raw.farms = { farm: { '15,6': { watered: true, idleDays: 0, crop: { id: 'glimmer', growth: 1, ready: false } },
                          '16,6': { watered: true, idleDays: 0, crop: { id: 'mondbeere', growth: 4, ready: false } } } };
    raw.machines.farm[0].job = { recipe: 'dry_glimmer', batches: 2, doneAt: 900 };
    raw.orders = [{ id: 'tut_rico', channel: 'rico', item: 'glimmer_buendel', qty: 3, reward: 220, deadlineDay: 999, tutorial: true }];
    raw.flags = { tutorialDone: true, knowsMondrosinen: true };
    raw.quest = { step: 12, progress: 0 };
    const s = deserialize(JSON.stringify(raw));
    expect(s.version).toBe(2);
    expect(countItem(s, 'cannabis')).toBe(4);
    expect(countItem(s, 'mondrosinen')).toBe(0);
    expect(s.money).toBe(100 + 2 * 95);
    expect(s.farms.farm['15,6'].crop?.id).toBe('cannabis');
    expect(s.farms.farm['16,6'].crop).toBeUndefined();
    expect(s.machines.farm[0].job?.recipe).toBe('dry_cannabis');
    expect(s.orders[0].item).toBe('cannabis');
    expect(s.quest.step).toBe(13);
    expect(s.flags.unlock_street).toBe(true);
    expect(s.flags.knowsMondrosinen).toBeUndefined();
  });
});
