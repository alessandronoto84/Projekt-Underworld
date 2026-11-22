import type { GameEvents } from '../core/events';
import type { GameState, Order } from '../systems/state';
import { empireLevel } from './empire';

export type QuestTarget = { map: string; x: number; y: number } | { npc: string };

export interface QuestStep {
  id: string;
  title: string;
  text: string;
  target?: QuestTarget | ((s: GameState) => QuestTarget | undefined);
  event: keyof GameEvents;
  count?: number;
  filter?: (payload: never, s: GameState) => boolean;
  onStart?: { order?: Order };
  onComplete?: { flags?: string[]; give?: [string, number][]; unlock?: string; toast?: string };
}

const FIELD = { map: 'farm', x: 17, y: 7 };

/**
 * Der Einstieg: Vom geerbten Grundstück zum ersten Deal – direkt in der Spielwelt.
 * Jeder Schritt hört auf ein Spielereignis, keine Textwände.
 */
export const TUTORIAL: QuestStep[] = [
  { id: 'wake', title: 'Das Erbe', text: 'Geh nach draußen und sieh dir Theos Grundstück an.', target: { map: 'home', x: 6, y: 9 },
    event: 'enteredMap', filter: (p: GameEvents['enteredMap']) => p.map === 'farm' },
  { id: 'rico', title: 'Theos alter Partner', text: 'Jemand wartet auf dem Weg. Sprich mit ihm (E).', target: { npc: 'rico' },
    event: 'talked', filter: (p: GameEvents['talked']) => p.npc === 'rico',
    onComplete: { flags: ['metRico'], give: [['seed_cannabis', 6]], toast: 'Neuer Kontakt: Rico' } },
  { id: 'inv', title: 'Was hast du dabei?', text: 'Öffne dein Inventar mit I (oder Tab).', event: 'inventoryOpened' },
  { id: 'till', title: 'Die Anbaufläche', text: 'Wähle die Hacke (Taste 1) und grabe hinter dem Zaun 6 Felder um (Leertaste / Linksklick).', target: FIELD,
    event: 'tilled', count: 6 },
  { id: 'plant', title: 'Stecklinge setzen', text: 'Wähle die Cannabis-Stecklinge und setze sie in die Erde.', target: FIELD,
    event: 'planted', count: 6 },
  { id: 'water', title: 'Gießen', text: 'Wähle die Gießkanne (Taste 2) und gieße die Stecklinge.', target: FIELD,
    event: 'watered', count: 6 },
  { id: 'town', title: 'Ein Blick auf die Stadt', text: 'Während alles wächst: Geh nach Greenfield (Osten) und schau bei Kramers Laden vorbei.', target: (s) =>
      s.player.map === 'town' ? { map: 'town', x: 5.5, y: 12.5 } : { map: 'farm', x: 39, y: 13.5 },
    event: 'enteredMap', filter: (p: GameEvents['enteredMap']) => p.map === 'shop' },
  { id: 'sleep', title: 'Feierabend', text: 'Geh nach Hause und schlaf. Pflanzen wachsen über Nacht – wenn sie gegossen sind.', target: { map: 'home', x: 1.5, y: 3 },
    event: 'slept' },
  { id: 'harvest', title: 'Die erste Ernte', text: 'Gieße jeden Tag. Wenn die Blüten reif sind, ernte sie (E / Linksklick).', target: FIELD,
    event: 'harvested', count: 6, filter: (p: GameEvents['harvested']) => p.item === 'cannabis_frisch' },
  { id: 'dry', title: 'Trocknen', text: 'Hänge das frische Cannabis ins Trockengestell neben deinem Haus.', target: { map: 'farm', x: 11, y: 8 },
    event: 'machineStarted' },
  { id: 'collect', title: 'Verkaufsfertig', text: 'Warte, bis das Gestell fertig ist (Sprechblase), und nimm die Ware heraus.', target: { map: 'farm', x: 11, y: 8 },
    event: 'machineCollected' },
  { id: 'deliver', title: 'Der erste Deal', text: 'Rico will 5× Cannabis. Tagsüber steht er in der Gasse neben der Bar, abends sitzt er im „Rostigen Anker“.', target: { npc: 'rico' },
    event: 'orderCompleted', filter: (p: GameEvents['orderCompleted']) => p.orderId === 'tut_rico',
    onStart: { order: { id: 'tut_rico', channel: 'rico', item: 'cannabis', qty: 5, reward: 220, deadlineDay: 999, tutorial: true } },
    onComplete: { flags: ['unlock_street'], unlock: 'trade', toast: 'Handel freigeschaltet (H)' } },
  { id: 'street', title: 'Die Straße', text: 'Rico zahlt solide – die Straße zahlt mehr. Ab 18 Uhr wartet Dex im Park. Verkauf ihm etwas.', target: { npc: 'dex' },
    event: 'sold', filter: (p: GameEvents['sold']) => p.channel === 'strasse',
    onComplete: { flags: ['tutorialDone'], toast: 'Der Einstieg ist geschafft. Jetzt baust du dein Geschäft auf.' } },
];

/** Ziele nach dem Tutorial – je nach Imperium-Stufe. Max. zwei werden gleichzeitig angezeigt. */
export interface Goal { id: string; text: string; done: (s: GameState) => boolean; reward?: number; minStage?: number }

export const GOALS: Goal[] = [
  { id: 'plants20', text: 'Lass 20 Cannabispflanzen gleichzeitig wachsen.', done: (s) => Object.values(s.farms.farm ?? {}).filter((t) => t.crop?.id === 'cannabis').length >= 20, reward: 60 },
  { id: 'rack2', text: 'Kauf bei Rico ein zweites Trockengestell und stell es auf.', done: (s) => (s.machines.farm ?? []).filter((m) => m.machine === 'drying_rack').length >= 2, reward: 80 },
  { id: 'orders3', text: 'Erledige 3 Aufträge für Rico.', done: (s) => s.stats.ordersDone >= 3, reward: 150 },
  { id: 'press', text: 'Stell eine Pillenpresse auf und produziere Ecstasy.', done: (s) => !!s.flags.madeEcstasy, reward: 250, minStage: 2 },
  { id: 'cash5k', text: 'Halte 5.000 $ Bargeld.', done: (s) => s.money >= 5000, reward: 0, minStage: 2 },
  { id: 'koks', text: 'Pack deine erste Kokain-Großmenge ab.', done: (s) => !!s.flags.madeKokain, reward: 500, minStage: 3 },
];

export function goalVisible(g: Goal, s: GameState): boolean { return (g.minStage ?? 1) <= empireLevel(s); }
