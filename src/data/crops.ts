import type { CropArt } from '../art/objects';

export interface CropDef {
  id: string;
  name: string;
  seed: string;
  harvest: string;
  /** Tage (mit Gießen) bis zur Reife. */
  growDays: number;
  /** Optional: nach der Ernte erneut reif nach X Tagen (Pflanze bleibt stehen). */
  regrowDays?: number;
  yield: [number, number];
  art: CropArt;
  /** Anzahl sichtbarer Wachstumsstufen (ohne Steckling-Stufe). */
  stages: number;
  /** Fällt nachts auf (Lichtschimmer der Blüten – rein optisch). */
  glows?: boolean;
}

export const CROPS: Record<string, CropDef> = {
  cannabis: { id: 'cannabis', name: 'Cannabis', seed: 'seed_cannabis', harvest: 'cannabis_frisch', growDays: 3, yield: [1, 2], art: 'cannabis', stages: 3 },
  kush: { id: 'kush', name: 'Greenfield Kush', seed: 'seed_kush', harvest: 'kush_frisch', growDays: 4, yield: [1, 2], art: 'kush', stages: 3 },
  tomate: { id: 'tomate', name: 'Tomate', seed: 'seed_tomate', harvest: 'tomate', growDays: 3, regrowDays: 2, yield: [1, 2], art: 'tomate', stages: 3 },
};
