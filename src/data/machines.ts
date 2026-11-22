/**
 * Produktionsanlagen. Rezepte sind rein abstrakte Spielmechanik:
 * Eingabe-Gegenstände + Zeit → Ware. Keine realen Verfahren.
 */
export interface Recipe {
  id: string;
  name: string;
  inputs: { item: string; qty: number }[];
  output: { item: string; qty: number };
  /** Spielminuten pro Ladung (alle Chargen laufen parallel). */
  minutes: number;
}

export interface MachineDef {
  id: string;
  name: string;
  sprite: 'dryingRack' | 'pillPress' | 'packTable';
  /** Wie viele Chargen gleichzeitig verarbeitet werden können. */
  capacity: number;
  recipes: Recipe[];
}

export const MACHINES: Record<string, MachineDef> = {
  drying_rack: {
    id: 'drying_rack', name: 'Trockengestell', sprite: 'dryingRack', capacity: 6,
    recipes: [
      { id: 'dry_cannabis', name: 'Cannabis trocknen', inputs: [{ item: 'cannabis_frisch', qty: 1 }], output: { item: 'cannabis', qty: 1 }, minutes: 180 },
      { id: 'dry_kush', name: 'Kush trocknen', inputs: [{ item: 'kush_frisch', qty: 1 }], output: { item: 'kush', qty: 1 }, minutes: 240 },
      { id: 'dry_pilze', name: 'Pilze trocknen', inputs: [{ item: 'pilze_frisch', qty: 2 }], output: { item: 'pilze', qty: 1 }, minutes: 120 },
    ],
  },
  pill_press: {
    id: 'pill_press', name: 'Pillenpresse', sprite: 'pillPress', capacity: 2,
    recipes: [
      { id: 'press_ecstasy', name: 'Ecstasy pressen', inputs: [{ item: 'kit_mdma', qty: 1 }], output: { item: 'ecstasy', qty: 8 }, minutes: 240 },
    ],
  },
  pack_table: {
    id: 'pack_table', name: 'Packtisch', sprite: 'packTable', capacity: 2,
    recipes: [
      { id: 'pack_kokain', name: 'Kokain abpacken', inputs: [{ item: 'kokain_gross', qty: 1 }], output: { item: 'kokain', qty: 12 }, minutes: 120 },
    ],
  },
};
