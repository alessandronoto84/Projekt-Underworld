import type { AnimalKind } from '../art/objects';
import type { Rect } from '../core/types';

/** Tiere pro Karte. zone = Bewegungsbereich in Tiles. */
export interface AnimalSpawn { map: string; kind: AnimalKind; count: number; zone: Rect; name?: string; night?: boolean }

export const ANIMALS: AnimalSpawn[] = [
  { map: 'farm', kind: 'cat', count: 1, zone: { x: 3, y: 9, w: 10, h: 6 }, name: 'Kater Mo', night: true },
  { map: 'farm', kind: 'crow', count: 3, zone: { x: 13, y: 12, w: 14, h: 4 } },
  { map: 'town', kind: 'pigeon', count: 6, zone: { x: 27, y: 18, w: 14, h: 4 } },
  { map: 'town', kind: 'pigeon', count: 4, zone: { x: 2, y: 13, w: 14, h: 2 } },
  { map: 'town', kind: 'cat', count: 1, zone: { x: 1, y: 20, w: 18, h: 12 }, night: true },
  { map: 'town', kind: 'dog', count: 1, zone: { x: 2, y: 21, w: 16, h: 10 } },
  { map: 'woods', kind: 'duck', count: 3, zone: { x: 3, y: 20, w: 7, h: 6 }, night: true },
  { map: 'woods', kind: 'crow', count: 2, zone: { x: 26, y: 14, w: 9, h: 8 } },
];

/** Passanten: wo sie laufen und wie viele (nach Tageszeit). */
export interface WalkerArea { map: string; zones: Rect[]; day: number; evening: number; night: number }

export const WALKERS: WalkerArea[] = [
  { map: 'town', zones: [{ x: 0, y: 13, w: 48, h: 2 }, { x: 0, y: 18, w: 48, h: 2 }, { x: 20, y: 0, w: 2, h: 34 }, { x: 25, y: 0, w: 2, h: 34 }, { x: 2, y: 21, w: 16, h: 11 }, { x: 27, y: 20, w: 20, h: 2 }],
    day: 9, evening: 7, night: 4 },
  { map: 'woods', zones: [{ x: 20, y: 1, w: 2, h: 11 }, { x: 7, y: 11, w: 14, h: 1 }, { x: 21, y: 14, w: 7, h: 1 }, { x: 5, y: 9, w: 7, h: 7 }],
    day: 2, evening: 1, night: 0 },
];

/** Smalltalk der Passanten. */
export const SMALLTALK = {
  day: [
    'Schönes Wetter heute, was?', 'Ich muss los, mein Bus … ach nee, der fährt ja nicht.', 'Hast du gesehen, was die Mieten in Downtown kosten? Wahnsinn.',
    'Kramer hat wieder die Preise erhöht.', 'Ich geh nur kurz mit dem Hund raus.', 'Kennst du den neuen Typen auf Theos Grundstück?',
    'Die Polizei war gestern wieder im Park.', 'Im Wald soll es Pilze geben. Die „besonderen“.', 'Lou macht die besten Sandwiches. Ehrlich.',
  ],
  night: [
    'Na? Auch noch unterwegs?', 'Pssst … du siehst aus, als hättest du was dabei.', 'Ich such eigentlich nur ’nen Kumpel …',
    'Im Nightlife District geht heute angeblich was ab.', 'Hey, kennst du Dex? Der weiß immer, wo es was gibt.',
  ],
  customer: [
    'Hey … hast du was? Ich zahl gut.', 'Dex hat gesagt, du hast gutes Zeug.', 'Ich brauch was fürs Wochenende. Was hast du?',
    'Pssst. Nur ein bisschen. Für mich und meine Freundin.',
  ],
  names: ['Passant', 'Passantin', 'Spaziergänger', 'Nachtschwärmer', 'Student', 'Anwohnerin', 'Jogger', 'Typ mit Kapuze'],
};
