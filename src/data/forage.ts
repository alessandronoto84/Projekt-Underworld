import type { ForageArt } from '../art/objects';
import type { Rect } from '../core/types';

/** Fundstücke, die täglich neu in der Welt liegen. */
export interface ForageDef {
  id: string;
  name: string;
  art: ForageArt;
  /** Beute: Item + Menge [min,max] + Chance (Standard 1). */
  gives: { item: string; qty: [number, number]; chance?: number }[];
}

export const FORAGE: Record<string, ForageDef> = {
  hemp: { id: 'hemp', name: 'Wilder Hanf', art: 'hemp', gives: [{ item: 'cannabis_frisch', qty: [1, 2] }, { item: 'seed_cannabis', qty: [1, 1], chance: 0.35 }] },
  mushroom: { id: 'mushroom', name: 'Pilze', art: 'mushroom', gives: [{ item: 'pilze_frisch', qty: [2, 4] }] },
  bottle: { id: 'bottle', name: 'Pfandflasche', art: 'bottle', gives: [{ item: 'pfandflasche', qty: [1, 2] }] },
  watch: { id: 'watch', name: 'Etwas Glänzendes', art: 'watch', gives: [{ item: 'alte_uhr', qty: [1, 1] }] },
  mara_keys: { id: 'mara_keys', name: 'Schlüsselbund', art: 'keys', gives: [{ item: 'mara_schluessel', qty: [1, 1] }] },
};

/** Wo und wie viel täglich erscheint. Zonen in Tiles; nur auf freien, begehbaren Feldern. */
export interface SpawnRule { map: string; zones: Rect[]; perDay: [number, number]; table: [string, number][] }

export const SPAWNS: SpawnRule[] = [
  { map: 'woods', zones: [{ x: 1, y: 2, w: 38, h: 26 }], perDay: [6, 9], table: [['mushroom', 5], ['hemp', 3], ['bottle', 1]] },
  { map: 'farm', zones: [{ x: 2, y: 24, w: 36, h: 3 }, { x: 2, y: 4, w: 3, h: 12 }], perDay: [1, 3], table: [['mushroom', 2], ['hemp', 1]] },
  { map: 'town', zones: [{ x: 1, y: 20, w: 18, h: 13 }], perDay: [2, 3], table: [['bottle', 4], ['watch', 1]] },
  { map: 'town', zones: [{ x: 0, y: 13, w: 48, h: 2 }, { x: 0, y: 18, w: 48, h: 2 }], perDay: [1, 3], table: [['bottle', 1]] },
];

/** Beute aus Mülltonnen (einmal pro Tag und Tonne). */
export const TRASH_LOOT: { item?: string; money?: [number, number]; qty?: [number, number]; weight: number; text: string }[] = [
  { item: 'pfandflasche', qty: [1, 3], weight: 45, text: 'Pfandflaschen!' },
  { money: [3, 18], weight: 15, text: 'Ein paar Münzen.' },
  { item: 'alte_uhr', qty: [1, 1], weight: 6, text: 'Eine alte Uhr – die bringt was.' },
  { item: 'sandwich', qty: [1, 1], weight: 6, text: 'Ein eingepacktes Sandwich. Noch gut … vermutlich.' },
  { weight: 28, text: 'Nur Müll.' },
];
