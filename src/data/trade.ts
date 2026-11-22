/**
 * Handelskanäle (wer kauft was) und Bezugsquellen (wer verkauft was).
 * Preise = Basispreis × Nachfrage × Tagesschwankung (siehe systems/market.ts).
 */
export interface Channel {
  id: string;
  name: string;
  /** Kurzbeschreibung für das Handels-Panel. */
  blurb: string;
  buys: { item: string; price: number }[];
  /** Nachfrageverlust pro verkauftem Stück (0.04 = −4 %). */
  saturation: number;
  /** Erholung der Nachfrage pro Tag (Anteil Richtung 1.0). */
  recovery: number;
  /** Feature-Flag, ab dem der Kanal im Handels-Panel sichtbar ist. */
  unlockFlag?: string;
}

export interface Shop {
  id: string;
  name: string;
  stock: { item: string; price: number; unlockFlag?: string }[];
}

export const CHANNELS: Record<string, Channel> = {
  kramer: {
    id: 'kramer', name: 'Kramers Laden', blurb: 'Legal und unauffällig. Kauft Gemüse.',
    buys: [{ item: 'tomate', price: 22 }, { item: 'pfandflasche', price: 2 }, { item: 'alte_uhr', price: 40 }],
    saturation: 0.02, recovery: 0.5,
  },
  rico: {
    id: 'rico', name: 'Rico (Abnehmer)', blurb: 'Nimmt große Mengen. Zahlt weniger als die Straße, fragt nicht viel.',
    buys: [{ item: 'cannabis', price: 32 }, { item: 'kush', price: 55 }, { item: 'pilze', price: 24 }, { item: 'ecstasy', price: 22 }, { item: 'kokain', price: 90 }],
    saturation: 0.015, recovery: 0.4, unlockFlag: 'metRico',
  },
  strasse: {
    id: 'strasse', name: 'Straßenkunden (Old Town)', blurb: 'Abends im Park. Beste Preise – aber die Kundschaft ist schnell versorgt.',
    buys: [{ item: 'cannabis', price: 48 }, { item: 'kush', price: 80 }, { item: 'pilze', price: 36 }, { item: 'ecstasy', price: 34 }, { item: 'kokain', price: 135 }],
    saturation: 0.07, recovery: 0.45, unlockFlag: 'unlock_street',
  },
};

export const SHOPS: Record<string, Shop> = {
  kramer: {
    id: 'kramer', name: 'Kramers Laden',
    stock: [
      { item: 'seed_tomate', price: 8 },
      { item: 'coffee', price: 15 },
    ],
  },
  rico: {
    id: 'rico', name: 'Ricos Kofferraum',
    stock: [
      { item: 'seed_cannabis', price: 20 },
      { item: 'drying_rack', price: 300, unlockFlag: 'tutorialDone' },
      { item: 'kit_mdma', price: 120, unlockFlag: 'stage2' },
      { item: 'pill_press', price: 900, unlockFlag: 'stage2' },
      { item: 'kokain_gross', price: 900, unlockFlag: 'stage3' },
      { item: 'pack_table', price: 1500, unlockFlag: 'stage3' },
    ],
  },
  lou: {
    id: 'lou', name: 'Bar „Zum Rostigen Anker“',
    stock: [{ item: 'sandwich', price: 25 }, { item: 'coffee', price: 15 }],
  },
};
