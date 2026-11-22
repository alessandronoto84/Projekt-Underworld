import type { GameEvents } from '../core/events';
import type { GameState } from '../systems/state';
import type { QuestStep } from './tutorial';

/**
 * Questreihen nach dem Tutorial: Hauptgeschichte (roter Faden) und Nebenquests.
 *
 * Aktionen in `npcOption.action` (ausgeführt vom Spiel):
 *   pay:<betrag>:<flag>              – Geld zahlen, Flag setzen
 *   give:<item>:<menge>:<flag>       – Gegenstände abgeben, Flag setzen
 */
export interface StoryStep extends QuestStep {
  /** Abgeschlossen, sobald die Bedingung erfüllt ist (wird regelmäßig geprüft). */
  check?: (s: GameState) => boolean;
  /** Zusätzliche Gesprächsoption bei einer Person während dieses Schritts. */
  npcOption?: { npc: string; label: string; action: string };
  /** Dynamischer Text (z. B. mit Frist). */
  textFn?: (s: GameState) => string;
  /** Beim Start: Fundstück fest platzieren. */
  spawn?: { map: string; x: number; y: number; id: string };
  /** Beim Abschluss: Zahlenwerte setzen ("+N" = aktueller Tag + N). */
  setVars?: Record<string, number | `+${number}`>;
}

export interface QuestLine {
  id: string;
  title: string;
  kind: 'main' | 'side';
  /** Kurzbeschreibung fürs Questbuch. */
  summary: string;
  /** Wer die Quest vergibt (Nebenquests starten im Gespräch). Hauptquests starten automatisch. */
  giver?: string;
  /** Einleitende Sätze des Auftraggebers. */
  intro?: string[];
  available: (s: GameState) => boolean;
  steps: StoryStep[];
  reward: { money?: number; items?: [string, number][]; flags?: string[]; text: string };
}

const flagIs = (f: string) => (p: GameEvents['flagSet']) => p.flag === f;

export const STORY: QuestLine[] = [
  {
    id: 'akt1', title: 'Akt 1: Theos Schulden', kind: 'main',
    summary: 'Theo hat dir mehr hinterlassen als ein Grundstück: Schulden bei einem Mann namens Viktor – und ein Geheimnis im Wald.',
    available: (s) => !!s.flags.tutorialDone,
    steps: [
      { id: 'viktor', title: 'Ein ungebetener Gast', text: 'Ein Mann im teuren Mantel wartet vor deinem Haus. Sprich mit ihm.',
        target: { npc: 'viktor' }, event: 'talked', filter: (p: GameEvents['talked']) => p.npc === 'viktor',
        onComplete: { flags: ['debtKnown'] }, setVars: { debtDue: '+7', debt: 2000 } },
      { id: 'rico', title: 'Wer ist Viktor?', text: 'Frag Rico, was es mit Viktor auf sich hat.',
        target: { npc: 'rico' }, event: 'talked', filter: (p: GameEvents['talked']) => p.npc === 'rico',
        onComplete: { flags: ['chestUnlocked'] } },
      { id: 'chest', title: 'Theos Versteck', text: 'Rico meint, Theo hatte ein Versteck. Durchsuche die alte Kiste in deinem Haus.',
        target: { map: 'home', x: 1.5, y: 7.5 }, event: 'flagSet', filter: flagIs('chestLooted') },
      { id: 'notebook', title: 'Das Notizbuch', text: 'Lies Theos Notizbuch: auswählen und Leertaste drücken.',
        event: 'flagSet', filter: flagIs('readNotebook') },
      { id: 'woods', title: 'Die Kush-Mutter', text: 'Finde Theos Spezialsorte im Wald südlich deines Grundstücks – auf der Lichtung beim Hochsitz.',
        target: (s) => s.player.map === 'woods' ? { map: 'woods', x: 29.5, y: 17.5 } : s.player.map === 'farm' ? { map: 'farm', x: 20.5, y: 29 } : { map: 'woods', x: 29.5, y: 17.5 },
        event: 'flagSet', filter: flagIs('kushFound') },
      { id: 'grow', title: 'Greenfield Kush', text: 'Pflanze die Kush-Stecklinge, gieß sie 4 Tage lang und ernte 4× Kush.',
        target: { map: 'farm', x: 18, y: 7 }, event: 'harvested', count: 4, filter: (p: GameEvents['harvested']) => p.item === 'kush_frisch' },
      { id: 'pay', title: 'Zahltag', text: '', target: { npc: 'viktor' },
        textFn: (s) => `Zahle Viktor ${(s.vars.debt ?? 2000).toLocaleString('de-DE')} $ bis Tag ${s.vars.debtDue}. Mittags steht er am Platz vor dem Revier, abends sitzt er im „Anker“.`,
        npcOption: { npc: 'viktor', label: 'Schulden bezahlen', action: 'pay:debt:debtPaid' },
        event: 'flagSet', filter: flagIs('debtPaid') },
    ],
    reward: { money: 0, flags: ['act1Done'], text: 'Viktor ist zufrieden. „Der Alte will dich kennenlernen“, sagt er. Akt 2 folgt mit dem nächsten Update.' },
  },
  {
    id: 'mara', title: 'Maras Schlüssel', kind: 'side', giver: 'mara',
    summary: 'Mara hat im Park ihren Schlüsselbund verloren.',
    intro: ['Ach, du schon wieder. Hör mal … ich hab gestern im Park meinen Schlüsselbund verloren. Der mit dem Delfin.', 'Wenn du ihn findest – ich wär dir echt was schuldig.'],
    available: (s) => !!s.flags.tutorialDone,
    steps: [
      { id: 'find', title: 'Der Delfin-Schlüssel', text: 'Such Maras Schlüsselbund im Park von Old Town.', target: { map: 'town', x: 11.5, y: 30.5 },
        event: 'looted', filter: (p: GameEvents['looted']) => p.item === 'mara_schluessel', spawn: { map: 'town', x: 11, y: 30, id: 'mara_keys' } },
      { id: 'return', title: 'Zurück zu Mara', text: 'Bring Mara ihren Schlüsselbund zurück.', target: { npc: 'mara' },
        npcOption: { npc: 'mara', label: 'Schlüssel zurückgeben', action: 'give:mara_schluessel:1:maraKeys' },
        event: 'flagSet', filter: flagIs('maraKeys') },
    ],
    reward: { money: 80, flags: ['maraFriend'], text: 'Mara: „Du bist echt in Ordnung. Wenn du mal was über das Nachtleben wissen willst – frag mich.“' },
  },
  {
    id: 'kramer', title: 'Frische Ware für Kramer', kind: 'side', giver: 'kramer',
    summary: 'Kramers Lieferant ist ausgefallen. Er braucht Tomaten.',
    intro: ['Mein Gemüselieferant hat mich hängen lassen. Du baust doch was an?', 'Bring mir 10 Tomaten, und ich zahl dir mehr als den üblichen Preis. Samen hab ich hier.'],
    available: (s) => !!s.flags.tutorialDone,
    steps: [
      { id: 'deliver', title: '10 Tomaten', text: 'Bau Tomaten an (Samen bei Kramer) und bring ihm 10 Stück.', target: { npc: 'kramer' },
        npcOption: { npc: 'kramer', label: 'Tomaten liefern (10)', action: 'give:tomate:10:kramerTomatoes' },
        event: 'flagSet', filter: flagIs('kramerTomatoes') },
    ],
    reward: { money: 260, items: [['seed_tomate', 10]], text: 'Kramer: „Gute Ware. Theo hätte sich gefreut – auch wenn der nie viele Tomaten hatte.“' },
  },
  {
    id: 'dex', title: 'Dex’ Party', kind: 'side', giver: 'dex',
    summary: 'Dex organisiert eine Party und braucht Pilze.',
    intro: ['Am Wochenende steigt bei mir ’ne Party. Die Leute wollen was Besonderes.', 'Bring mir 5× getrocknete Pilze. Im Wald findest du welche. Ich zahl ordentlich – und erzähl allen von dir.'],
    available: (s) => !!s.flags.tutorialDone && s.stats.sold >= 8,
    steps: [
      { id: 'pilze', title: 'Pilze für Dex', text: 'Sammle Pilze im Wald, trockne sie und bring Dex 5× Psilo-Pilze.', target: { npc: 'dex' },
        npcOption: { npc: 'dex', label: 'Pilze übergeben (5)', action: 'give:pilze:5:dexMushrooms' },
        event: 'flagSet', filter: flagIs('dexMushrooms') },
    ],
    reward: { money: 300, flags: ['dexParty'], text: 'Dex: „Die Party war legendär. Ab jetzt fragen nachts mehr Leute nach dir.“' },
  },
];

export function lineById(id: string): QuestLine | undefined { return STORY.find((l) => l.id === id); }
