import type { GameState } from '../systems/state';

/**
 * Imperium-Stufen: das zentrale Fortschrittssystem.
 * Jede Stufe setzt ein Flag `stageN`, über das Händler, Aufträge und Inhalte freigeschaltet werden.
 */
export interface EmpireStage {
  level: number;
  name: string;
  desc: string;
  /** Bedingungen für den Aufstieg in diese Stufe. */
  req?: { earned?: number; ordersDone?: number; flags?: string[] };
  /** Was der Aufstieg bringt (Anzeige). */
  unlocks: string[];
}

export const STAGES: EmpireStage[] = [
  { level: 1, name: 'Der Einstieg', desc: 'Ein Grundstück am Stadtrand, ein paar Stecklinge, ein Kontakt.',
    unlocks: ['Cannabis anbauen und trocknen', 'Rico als Abnehmer'] },
  { level: 2, name: 'Der lokale Anbieter', desc: 'Die Leute in Old Town kennen deinen Namen.',
    req: { earned: 2500, flags: ['tutorialDone'] },
    unlocks: ['Pillenpresse & MDMA-Rohstoffkits bei Rico', 'Ecstasy als neue Produktkategorie', 'Größere Aufträge'] },
  { level: 3, name: 'Etabliertes Untergrundgeschäft', desc: 'Du spielst jetzt in einer anderen Liga.',
    req: { earned: 12000, ordersDone: 5 },
    unlocks: ['Kokain-Großmengen & Packtisch bei Rico', 'Aufträge mit hohem Wert'] },
  { level: 4, name: 'Das Imperium', desc: 'Fraktionen werden auf dich aufmerksam.',
    req: { earned: 60000, ordersDone: 15 },
    unlocks: ['Fraktionen, Amphetamin & Heroin (folgen mit dem Fraktions-Update)'] },
  { level: 5, name: 'Das Netzwerk', desc: 'Greenfield ist zu klein für dich.',
    req: { earned: 300000, ordersDone: 40 },
    unlocks: ['Weitere Städte (folgen mit dem Expansions-Update)'] },
];

export function empireLevel(s: GameState): number {
  let lvl = 1;
  for (const st of STAGES) if (st.level > 1 && s.flags[`stage${st.level}`]) lvl = st.level;
  return lvl;
}

export function stageMet(s: GameState, st: EmpireStage): boolean {
  const r = st.req;
  if (!r) return true;
  if (r.earned !== undefined && s.stats.earned < r.earned) return false;
  if (r.ordersDone !== undefined && s.stats.ordersDone < r.ordersDone) return false;
  if (r.flags && !r.flags.every((f) => s.flags[f])) return false;
  return true;
}

/** Fortschrittstext zur nächsten Stufe, z. B. „640 / 2.500 $ verdient“. */
export function nextStageProgress(s: GameState): { stage: EmpireStage; parts: string[] } | null {
  const next = STAGES.find((st) => st.level === empireLevel(s) + 1);
  if (!next?.req) return null;
  const parts: string[] = [];
  if (next.req.earned !== undefined) parts.push(`${Math.min(s.stats.earned, next.req.earned).toLocaleString('de-DE')} / ${next.req.earned.toLocaleString('de-DE')} $ verdient`);
  if (next.req.ordersDone !== undefined) parts.push(`${Math.min(s.stats.ordersDone, next.req.ordersDone)} / ${next.req.ordersDone} Aufträge`);
  if (next.req.flags?.includes('tutorialDone') && !s.flags.tutorialDone) parts.push('Einstieg abschließen');
  return { stage: next, parts };
}

/** Produktlinien für die Übersicht im Handels-Panel. */
export const PRODUCT_LINES: { name: string; item?: string; stage: number; note?: string }[] = [
  { name: 'Cannabis', item: 'cannabis', stage: 1 },
  { name: 'Ecstasy (MDMA)', item: 'ecstasy', stage: 2 },
  { name: 'Kokain', item: 'kokain', stage: 3 },
  { name: 'Amphetamin', stage: 4, note: 'Fraktions-Update' },
  { name: 'Heroin', stage: 4, note: 'Fraktions-Update' },
];
