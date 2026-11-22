import { createNewGame, INVENTORY_SIZE, SAVE_VERSION, type GameState } from './state';

/**
 * Speichersystem mit Versionierung.
 * - Jeder Spielstand trägt `version`.
 * - Ältere Stände werden über MIGRATIONS schrittweise angehoben.
 * - Fehlende Felder werden mit Standardwerten eines neuen Spiels aufgefüllt,
 *   damit neue Features alte Spielstände nicht zerstören.
 */
export interface SaveStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const SAVE_KEY = 'underworld.save.slot1';

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] hebt einen Stand von Version n auf n+1. */
const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
};

/**
 * v1 → v2: Neuausrichtung auf das Drogenimperium.
 * Fantasy-Waren werden auf Cannabis/Tomaten abgebildet; entfernte Waren werden zum Richtwert erstattet.
 */
const V1_ITEMS: Record<string, string | null> = {
  seed_glimmer: 'seed_cannabis', glimmerkraut: 'cannabis_frisch', glimmer_buendel: 'cannabis',
  seed_ruebe: 'seed_tomate', ruebe: 'tomate',
  seed_mondbeere: null, mondbeere: null, mondrosinen: null,
};
const V1_REFUND: Record<string, number> = { seed_mondbeere: 40, mondbeere: 24, mondrosinen: 95 };
const V1_CROPS: Record<string, string | null> = { glimmer: 'cannabis', ruebe: 'tomate', mondbeere: null };

type Raw = Record<string, unknown>;
function migrateV1toV2(raw: Raw): Raw {
  let refund = 0;
  const mapItem = (id: string): string | null => (id in V1_ITEMS ? V1_ITEMS[id] : id);
  const inv = (raw.inventory as ({ id: string; qty: number } | null)[] | undefined) ?? [];
  raw.inventory = inv.map((st) => {
    if (!st) return null;
    const to = mapItem(st.id);
    if (to === null) { refund += (V1_REFUND[st.id] ?? 0) * st.qty; return null; }
    return { ...st, id: to };
  });
  const farms = (raw.farms as Record<string, Record<string, { crop?: { id: string; growth: number; ready: boolean } }>>) ?? {};
  for (const tiles of Object.values(farms)) for (const t of Object.values(tiles)) {
    if (!t.crop) continue;
    const to = t.crop.id in V1_CROPS ? V1_CROPS[t.crop.id] : t.crop.id;
    if (!to) { t.crop = undefined; continue; }
    t.crop.id = to;
    t.crop.growth = Math.min(t.crop.growth, 3);
  }
  const machines = (raw.machines as Record<string, { job?: { recipe: string; batches: number } }[]>) ?? {};
  for (const list of Object.values(machines)) for (const m of list) {
    if (m.job?.recipe === 'dry_glimmer') { m.job.recipe = 'dry_cannabis'; m.job.batches *= 2; }
    else if (m.job?.recipe === 'dry_mond') { refund += 95 * m.job.batches; m.job = undefined; }
  }
  const orders = (raw.orders as { item: string; channel: string; qty: number; tutorial?: boolean; id: string }[]) ?? [];
  raw.orders = orders.flatMap((o) => {
    const to = mapItem(o.item);
    if (!to) return [];
    if (o.id === 'tut_rico') return [{ ...o, item: 'cannabis', qty: 5 }];
    return [{ ...o, item: to }];
  });
  const market = (raw.market as Record<string, Record<string, number>>) ?? {};
  for (const ch of Object.values(market)) for (const k of Object.keys(ch)) {
    const to = mapItem(k);
    if (to && to !== k) ch[to] = ch[k];
    if (to !== k) delete ch[k];
  }
  const flags = (raw.flags as Record<string, boolean>) ?? {};
  delete flags.madeMondrosinen; delete flags.knowsMondrosinen; delete flags.goal_mond;
  const quest = (raw.quest as { step: number; progress: number }) ?? { step: 0, progress: 0 };
  if (flags.tutorialDone) { quest.step = 13; quest.progress = 0; flags.unlock_street = true; }
  raw.flags = flags; raw.quest = quest;
  raw.money = ((raw.money as number) ?? 0) + refund;
  raw.version = 2;
  return raw;
}

export function serialize(s: GameState): string {
  return JSON.stringify({ ...s, savedAt: new Date().toISOString() });
}

export function deserialize(json: string): GameState {
  let raw = JSON.parse(json) as Record<string, unknown>;
  if (typeof raw !== 'object' || raw === null) throw new Error('Ungültiger Spielstand');
  let v = typeof raw.version === 'number' ? raw.version : 0;
  if (v > SAVE_VERSION) throw new Error(`Spielstand stammt aus einer neueren Version (${v}).`);
  while (v < SAVE_VERSION) {
    const mig = MIGRATIONS[v];
    if (!mig) throw new Error(`Keine Migration von Version ${v} vorhanden.`);
    raw = mig(raw);
    v = raw.version as number;
  }
  return fillDefaults(raw as unknown as GameState);
}

/** Ergänzt fehlende Felder rekursiv aus einem frischen Spielstand (nur Objekt-Ebene). */
function fillDefaults(s: GameState): GameState {
  const def = createNewGame(s.seed ?? 1) as unknown as Record<string, unknown>;
  const out = s as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(def)) {
    if (out[k] === undefined) out[k] = v;
    else if (isPlainObject(v) && isPlainObject(out[k])) {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        const o = out[k] as Record<string, unknown>;
        if (o[k2] === undefined && !['farms', 'machines', 'flags', 'npcs', 'market'].includes(k)) o[k2] = v2;
      }
    }
  }
  while (s.inventory.length < INVENTORY_SIZE) s.inventory.push(null);
  return s;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function saveGame(store: SaveStorage, s: GameState): boolean {
  try {
    store.set(SAVE_KEY, serialize(s));
    return true;
  } catch (err) {
    console.error('[save] Speichern fehlgeschlagen', err);
    return false;
  }
}

export function loadGame(store: SaveStorage): GameState | null {
  const json = store.get(SAVE_KEY);
  if (!json) return null;
  try {
    return deserialize(json);
  } catch (err) {
    console.error('[save] Laden fehlgeschlagen', err);
    return null;
  }
}

export function hasSave(store: SaveStorage): boolean {
  try { return !!store.get(SAVE_KEY); } catch { return false; }
}

export const browserStorage: SaveStorage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, v),
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* ignorieren */ } },
};
