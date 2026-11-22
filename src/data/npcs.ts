import type { Look } from '../art/characters';
import { P } from '../art/palette';
import type { Dir } from '../core/types';
import type { GameState } from '../systems/state';
import { weekday } from '../systems/time';

/** Ein Eintrag im Tagesablauf: ab Minute `at` befindet sich der NPC an (map,x,y). map=null → unterwegs/zuhause (unsichtbar). */
export interface ScheduleEntry { at: number; map: string | null; x: number; y: number; dir?: Dir }

export interface DialogueLine { when?: (s: GameState) => boolean; lines: string[] }

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  look: Look;
  schedule: (s: GameState) => ScheduleEntry[];
  dialogue: DialogueLine[];
  /** Dienste im Gespräch: 'shop:<id>', 'sell:<channel>', 'orders:<channel>' */
  services?: string[];
  /** Dienste nur auf dieser Karte (z. B. hinter der Ladentheke). Ohne Angabe: überall. */
  workMap?: string;
  /** Dienste erst nach diesem Flag. */
  servicesFlag?: string;
}

const h = (hh: number, mm = 0) => hh * 60 + mm;
const sunday = (s: GameState) => weekday(s.time.day) === 6;

export const NPCS: Record<string, NpcDef> = {
  rico: {
    id: 'rico', name: 'Rico', title: 'Theos alter Partner',
    look: {
      skin: P.skin1, skinShade: P.skin2, hair: P.ink, hairShade: P.outline, hairStyle: 'short',
      shirt: P.w1, shirtShade: P.w0, pants: P.s1, pantsShade: P.s0, shoes: P.ink,
      jacket: P.r1, jacketShade: P.r0, beard: true,
    },
    schedule: (s) => {
      if (!s.flags.metRico) return [{ at: 0, map: 'farm', x: 33, y: 13.6, dir: 'left' }];
      return [
        { at: 0, map: null, x: 0, y: 0 },
        { at: h(10), map: 'town', x: 37.5, y: 11.6, dir: 'down' },
        { at: h(17, 30), map: 'bar', x: 11.5, y: 6.6, dir: 'left' },
        { at: h(25, 30), map: null, x: 0, y: 0 },
      ];
    },
    dialogue: [
      { when: (s) => !s.flags.metRico, lines: [
        'Du bist also Theos Neffe. Ich bin Rico. Dein Onkel hat für mich Gras angebaut – der beste Grower in ganz Greenfield.',
        'Er hat dir das Grundstück vermacht. Und ehrlich gesagt: auch seine Kundschaft. Die will versorgt werden.',
        'Hier, sechs Stecklinge. Grab hinter dem Zaun um, setz sie ein, gieß sie jeden Tag. In drei Tagen sind sie reif.',
        'Dann ab ins Trockengestell neben dem Haus. Bring mir fünf Einheiten – tagsüber in der Gasse neben der Bar, abends im „Rostigen Anker“.',
      ] },
      { when: (s) => s.quest.step === 11, lines: ['Hast du die fünf Einheiten? Dann reden wir übers Geschäft.'] },
      { when: (s) => s.quest.step === 12, lines: ['Ich zahl fair, aber die Straße zahlt mehr. Dex hängt abends im Park rum. Sag ihm, ich schick dich.'] },
      { when: (s) => !!s.flags.stage3, lines: ['Kokain ist ein anderes Kaliber. Mehr Geld, mehr Augen auf dir. Pass auf, wem du was verkaufst.', 'Die Harbor Kings fragen nach dir. Das ist gut – oder sehr schlecht.'] },
      { when: (s) => !!s.flags.stage2, lines: ['Pillen laufen in den Clubs wie verrückt. Mit einer Presse verdienst du richtig.', 'Das Neon Syndicate kontrolliert die Clubszene. Irgendwann musst du mit denen reden.'] },
      { when: (s) => s.time.minute >= h(22), lines: ['Nachts läuft das Geschäft am besten. Weniger Augen.', 'Officer Brandt dreht hier gern seine Runden. Bleib unauffällig.'] },
      { lines: ['Ich hab Kontakte in jedem Viertel. Southside, Hafen, die Clubs – alles zu seiner Zeit.', 'Bring mir saubere Ware, und wir werden beide reich.', 'Die Iron Wolves suchen Lieferanten. Aber mit denen spielt man nicht.'] },
    ],
    services: ['orders:rico', 'sell:rico', 'shop:rico'],
    servicesFlag: 'metRico',
  },
  dex: {
    id: 'dex', name: 'Dex', title: 'Stammkunde',
    look: {
      skin: P.skin2, skinShade: P.skin3, hair: P.g1, hairShade: P.g0, hairStyle: 'buzz',
      shirt: P.v2, shirtShade: P.v1, pants: P.s1, pantsShade: P.s0, shoes: P.white,
      jacket: P.s2, jacketShade: P.s1,
    },
    schedule: (s) => s.flags.metRico
      ? [{ at: 0, map: null, x: 0, y: 0 }, { at: h(18), map: 'town', x: 18.5, y: 22.6, dir: 'left' }, { at: h(25, 30), map: null, x: 0, y: 0 }]
      : [{ at: 0, map: null, x: 0, y: 0 }],
    dialogue: [
      { when: (s) => !s.flags.tutorialDone, lines: ['Rico schickt dich? Cool. Theo hatte immer das beste Zeug. Was hast du dabei?'] },
      { lines: ['Yo. Hast du was?', 'Freitags und samstags ist hier mehr los. Dann wollen alle was.', 'Meine Leute fragen nach Pillen. Kannst du sowas besorgen?', 'Pass auf Brandt auf. Der fährt abends Streife.'] },
    ],
    services: ['sell:strasse'],
  },
  kramer: {
    id: 'kramer', name: 'Herr Kramer', title: 'Ladenbesitzer',
    look: {
      skin: P.skin0, skinShade: P.skin1, hair: P.s4, hairShade: P.s3, hairStyle: 'bald',
      shirt: P.white, shirtShade: P.cream, pants: P.b2, pantsShade: P.b1, shoes: P.b1,
      jacket: P.g2, jacketShade: P.g1, glasses: true,
    },
    schedule: (s) => sunday(s)
      ? [{ at: 0, map: null, x: 0, y: 0 }, { at: h(10), map: 'town', x: 13.5, y: 26.4, dir: 'down' }, { at: h(18), map: null, x: 0, y: 0 }]
      : [
        { at: 0, map: null, x: 0, y: 0 },
        { at: h(8), map: 'town', x: 5.5, y: 14.4, dir: 'up' },
        { at: h(8, 30), map: 'shop', x: 5.5, y: 3.6, dir: 'down' },
        { at: h(18), map: 'town', x: 6.5, y: 26.4, dir: 'right' },
        { at: h(20), map: null, x: 0, y: 0 },
      ],
    dialogue: [
      { when: sunday, lines: ['Sonntags ist der Laden zu. Selbst ich brauche mal Ruhe.'] },
      { lines: ['Willkommen bei Kramer! Samen, Kaffee, ehrliche Ware.', 'Tomaten verkaufen sich immer. Die Leute hier mögen es einfach.', 'Theo hat jede Woche Dünger gekauft. Viel Dünger. Für ein paar Tomaten …'] },
    ],
    services: ['shop:kramer', 'sell:kramer'],
    workMap: 'shop',
  },
  lou: {
    id: 'lou', name: 'Lou', title: 'Barkeeperin',
    look: {
      skin: P.skin2, skinShade: P.skin3, hair: P.pink, hairShade: P.pinkDark, hairStyle: 'bun',
      shirt: P.ink, shirtShade: P.outline, pants: P.s1, pantsShade: P.s0, shoes: P.ink,
    },
    schedule: () => [{ at: 0, map: null, x: 0, y: 0 }, { at: h(16, 30), map: 'bar', x: 3.5, y: 2.6, dir: 'down' }, { at: h(25, 50), map: null, x: 0, y: 0 }],
    dialogue: [
      { lines: ['Was darf’s sein? Die Küche hat Sandwiches.', 'Hier hört man so einiges. Ich erzähl’s nur nicht weiter.', 'Rico sitzt da hinten, wie jeden Abend. Er macht seine Geschäfte – ich mach meine.'] },
    ],
    services: ['shop:lou'],
    workMap: 'bar',
  },
  mara: {
    id: 'mara', name: 'Mara', title: 'Nachbarin',
    look: {
      skin: P.skin0, skinShade: P.skin1, hair: P.y0, hairShade: P.b2, hairStyle: 'long',
      shirt: P.y1, shirtShade: P.y0, pants: P.w1, pantsShade: P.w0, shoes: P.r1,
    },
    schedule: () => [
      { at: 0, map: null, x: 0, y: 0 },
      { at: h(8), map: 'town', x: 15.5, y: 14.4, dir: 'down' },
      { at: h(11), map: 'town', x: 6.5, y: 25.4, dir: 'down' },
      { at: h(14), map: 'town', x: 42.5, y: 19.4, dir: 'left' },
      { at: h(17, 30), map: 'bar', x: 5.5, y: 5.4, dir: 'up' },
      { at: h(21, 30), map: null, x: 0, y: 0 },
    ],
    dialogue: [
      { lines: ['Du bist neu hier, oder? Theos Grundstück stand ewig leer.', 'Abends riecht es bei dir draußen manchmal … interessant.', 'Ich arbeite im Nightlife District. Wenn die Bus-Linie wieder fährt, zeig ich dir die Clubs.'] },
    ],
  },
  brandt: {
    id: 'brandt', name: 'Officer Brandt', title: 'Polizei Greenfield',
    look: {
      skin: P.skin1, skinShade: P.skin2, hair: P.b1, hairShade: P.b0, hairStyle: 'cap', cap: P.w0,
      shirt: P.w1, shirtShade: P.w0, pants: P.w0, pantsShade: P.ink, shoes: P.ink,
    },
    schedule: () => [
      { at: 0, map: null, x: 0, y: 0 },
      { at: h(9), map: 'town', x: 32.5, y: 21.4, dir: 'down' },
      { at: h(12), map: 'town', x: 16.5, y: 18.6, dir: 'right' },
      { at: h(15), map: 'town', x: 38.5, y: 14.4, dir: 'left' },
      { at: h(19), map: 'town', x: 24.5, y: 19.4, dir: 'down' },
      { at: h(22), map: null, x: 0, y: 0 },
    ],
    dialogue: [
      { when: (s) => s.stats.sold > 30, lines: ['Komisch. In letzter Zeit ist im Park ziemlich viel los. Sie wissen nicht zufällig etwas darüber?'] },
      { lines: ['Guten Tag. Alles in Ordnung bei Ihnen?', 'Greenfield ist eine ruhige Stadt. Und das soll auch so bleiben.', 'Sie wohnen auf Theos altem Grundstück? Interessant. Sehr interessant.'] },
    ],
  },
  jules: {
    id: 'jules', name: 'Jules', title: 'Southside Crew',
    look: {
      skin: P.skin3, skinShade: P.outline, hair: P.ink, hairShade: P.outline, hairStyle: 'cap', cap: P.y1,
      shirt: P.r2, shirtShade: P.r1, pants: P.s2, pantsShade: P.s1, shoes: P.white,
    },
    schedule: () => [{ at: 0, map: null, x: 0, y: 0 }, { at: h(15), map: 'town', x: 44.5, y: 14.2, dir: 'down' }, { at: h(23), map: null, x: 0, y: 0 }],
    dialogue: [
      { when: (s) => !!s.flags.tutorialDone, lines: ['Du verkaufst im Park, oder? Hab’s gehört. Southside ist unser Revier – merk dir das, wenn der Bus wieder fährt.', 'Die Crew sucht Leute mit Ware. Wenn du groß genug bist, reden wir.'] },
      { lines: ['Yo. Der Bus nach Southside fährt grad nicht. Baustelle oder so.', 'Rico? Kenn ich. Alter Hase. Pass auf, dass er dich nicht über den Tisch zieht.'] },
    ],
  },
};

/** Ermittelt den aktuell gültigen Schedule-Eintrag. */
export function currentEntry(npc: NpcDef, s: GameState): ScheduleEntry {
  const entries = npc.schedule(s);
  let cur = entries[0];
  for (const e of entries) if (s.time.minute >= e.at) cur = e;
  return cur;
}
