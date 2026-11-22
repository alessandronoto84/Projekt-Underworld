import type { GameEvents } from '../core/events';
import { GOALS, TUTORIAL, goalVisible, type QuestStep, type QuestTarget } from '../data/tutorial';
import { STORY, type QuestLine, type StoryStep } from '../data/story';
import { STAGES, empireLevel, stageMet } from '../data/empire';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { addMoney, type Ctx, type LineState } from './state';

/**
 * Fortschrittssystem:
 *  - Tutorial (feste Kette, `s.quest`)
 *  - Questreihen: Hauptgeschichte + Nebenquests (`s.lines`)
 *  - Ziele & Imperium-Stufen
 * Hört ausschließlich auf Spielereignisse, kennt weder UI noch Rendering.
 */
export class Quests {
  private unsub: (() => void)[] = [];

  constructor(private ctx: Ctx) {
    const events = new Set<keyof GameEvents>([...TUTORIAL.map((t) => t.event), ...STORY.flatMap((l) => l.steps.map((st) => st.event))]);
    for (const ev of events) this.unsub.push(ctx.bus.on(ev, (p) => this.onEvent(ev, p)));
    this.unsub.push(ctx.bus.on('machineCollected', (p) => {
      if (p.item === 'ecstasy') ctx.s.flags.madeEcstasy = true;
      if (p.item === 'kokain') ctx.s.flags.madeKokain = true;
    }));
  }

  dispose(): void { this.unsub.forEach((u) => u()); }

  /* ---------------------------------------------------------- Tutorial */

  get current(): QuestStep | undefined { return TUTORIAL[this.ctx.s.quest.step]; }
  get inTutorial(): boolean { return this.ctx.s.quest.step < TUTORIAL.length; }

  progressText(): string | undefined {
    const st = this.current;
    if (!st?.count || st.count <= 1) return undefined;
    return `${Math.min(this.ctx.s.quest.progress, st.count)}/${st.count}`;
  }

  /* ---------------------------------------------------------- Questreihen */

  lineState(id: string): LineState | undefined { return this.ctx.s.lines[id]; }

  activeLines(): { line: QuestLine; st: LineState; step: StoryStep }[] {
    const out: { line: QuestLine; st: LineState; step: StoryStep }[] = [];
    for (const line of STORY) {
      const st = this.ctx.s.lines[line.id];
      if (!st || st.done) continue;
      const step = line.steps[st.step];
      if (step) out.push({ line, st, step });
    }
    return out;
  }

  /** Aktueller Hauptgeschichts-Schritt (für die Zielanzeige). */
  main(): { line: QuestLine; st: LineState; step: StoryStep } | undefined {
    return this.activeLines().find((a) => a.line.kind === 'main');
  }

  stepText(step: StoryStep): string { return step.textFn ? step.textFn(this.ctx.s) : step.text; }

  lineProgress(line: QuestLine, st: LineState): string | undefined {
    const step = line.steps[st.step];
    if (!step?.count || step.count <= 1) return undefined;
    return `${Math.min(st.progress, step.count)}/${step.count}`;
  }

  /** Nebenquest, die diese Person gerade vergeben würde. */
  offerFor(npc: string): QuestLine | undefined {
    if (this.inTutorial) return undefined;
    return STORY.find((l) => l.giver === npc && !this.ctx.s.lines[l.id] && l.available(this.ctx.s));
  }

  /** Zusätzliche Gesprächsoptionen durch laufende Quests. */
  npcOptions(npc: string): { label: string; action: string; line: string }[] {
    return this.activeLines().filter((a) => a.step.npcOption?.npc === npc).map((a) => ({ label: a.step.npcOption!.label, action: a.step.npcOption!.action, line: a.line.id }));
  }

  startLine(id: string): void {
    const line = STORY.find((l) => l.id === id);
    if (!line || this.ctx.s.lines[id]) return;
    this.ctx.s.lines[id] = { step: 0, progress: 0 };
    this.startStep(line, 0);
    this.ctx.bus.emit('toast', { text: `${line.kind === 'main' ? 'Hauptquest' : 'Neue Quest'}: ${line.title}` });
    this.ctx.bus.emit('questChanged', {});
  }

  private startStep(line: QuestLine, idx: number): void {
    const step = line.steps[idx];
    if (!step) return;
    const s = this.ctx.s;
    if (step.spawn) {
      const list = (s.forage[step.spawn.map] ??= []);
      if (!list.some((f) => f.id === step.spawn!.id)) list.push({ x: step.spawn.x, y: step.spawn.y, id: step.spawn.id, quest: true });
    }
    const o = step.onStart?.order;
    if (o && !s.orders.some((x) => x.id === o.id)) s.orders.push({ ...o });
  }

  private completeLineStep(line: QuestLine, st: LineState): void {
    const step = line.steps[st.step];
    this.applyComplete(step);
    if (step.setVars) for (const [k, v] of Object.entries(step.setVars)) {
      this.ctx.s.vars[k] = typeof v === 'string' ? this.ctx.s.time.day + Number(v.slice(1)) : v;
    }
    st.step += 1; st.progress = 0;
    if (st.step >= line.steps.length) {
      st.done = true;
      const r = line.reward;
      if (r.money) addMoney(this.ctx, r.money);
      for (const [id, n] of r.items ?? []) addItem(this.ctx, id, n);
      for (const f of r.flags ?? []) this.ctx.s.flags[f] = true;
      this.ctx.bus.emit('toast', { text: `Quest abgeschlossen: ${line.title}${r.money ? ` · +${r.money} $` : ''}`, icon: 'coin' });
      this.ctx.bus.emit('questDone', { line: line.id, text: r.text });
    } else {
      this.startStep(line, st.step);
    }
    this.ctx.bus.emit('questChanged', {});
  }

  /** Regelmäßig: automatische Starts, Bedingungen, Fristen. */
  checkLines(): void {
    const s = this.ctx.s;
    if (this.inTutorial) return;
    for (const line of STORY) if (line.kind === 'main' && !s.lines[line.id] && line.available(s)) this.startLine(line.id);
    for (const a of this.activeLines()) if (a.step.check?.(s)) this.completeLineStep(a.line, a.st);
    this.debtTick();
  }

  /** Akt 1: Wer die Frist verpasst, bekommt Besuch. */
  private debtTick(): void {
    const s = this.ctx.s;
    if (!s.flags.debtKnown || s.flags.debtPaid || !s.vars.debtDue) return;
    if (s.time.day <= s.vars.debtDue) return;
    const taken = Math.floor(s.money * 0.5);
    if (taken > 0) addMoney(this.ctx, -taken);
    s.vars.debt = (s.vars.debt ?? 2000) + 500;
    s.vars.debtDue = s.time.day + 3;
    this.ctx.bus.emit('toast', { text: `Viktors Leute waren da. ${taken} $ sind weg – und die Schuld steigt auf ${s.vars.debt} $.` });
    this.ctx.bus.emit('questChanged', {});
  }

  /* ------------------------------------------------------- Ziele & Stufen */

  openGoals(): { id: string; text: string }[] {
    if (this.inTutorial) return [];
    return GOALS.filter((g) => goalVisible(g, this.ctx.s) && !this.ctx.s.flags[`goal_${g.id}`]).slice(0, 2);
  }

  checkGoals(): void {
    this.checkStages();
    this.checkLines();
    if (this.inTutorial) return;
    for (const g of GOALS) {
      if (!goalVisible(g, this.ctx.s)) continue;
      const key = `goal_${g.id}`;
      if (!this.ctx.s.flags[key] && g.done(this.ctx.s)) {
        this.ctx.s.flags[key] = true;
        if (g.reward) addMoney(this.ctx, g.reward);
        this.ctx.bus.emit('toast', { text: `Ziel erreicht! ${g.reward ? `+${g.reward} $` : ''}`, icon: 'coin' });
        this.ctx.bus.emit('questChanged', {});
      }
    }
  }

  checkStages(): void {
    const s = this.ctx.s;
    const next = STAGES.find((st) => st.level === empireLevel(s) + 1);
    if (!next || !stageMet(s, next)) return;
    s.flags[`stage${next.level}`] = true;
    this.ctx.bus.emit('unlocked', { feature: `stage${next.level}` });
    this.ctx.bus.emit('toast', { text: `AUFSTIEG! Stufe ${next.level}: ${next.name}`, icon: 'coin' });
    for (const u of next.unlocks) this.ctx.bus.emit('toast', { text: `Neu: ${u}` });
    this.ctx.bus.emit('questChanged', {});
  }

  /* ------------------------------------------------------------ Ziel-Pfeil */

  target(): QuestTarget | undefined {
    const resolve = (t: QuestStep['target']) => (typeof t === 'function' ? t(this.ctx.s) : t);
    if (this.inTutorial) return resolve(this.current?.target);
    const m = this.main();
    if (m?.step.target) return resolve(m.step.target);
    const side = this.activeLines().find((a) => a.step.target);
    return side ? resolve(side.step.target) : undefined;
  }

  /* ------------------------------------------------------------- Ereignisse */

  private onEvent<K extends keyof GameEvents>(ev: K, payload: GameEvents[K]): void {
    const amount = ev === 'harvested' ? (payload as GameEvents['harvested']).qty : 1;
    // Tutorial
    const st = this.current;
    if (st && st.event === ev && (!st.filter || st.filter(payload as never, this.ctx.s))) {
      this.ctx.s.quest.progress += amount;
      if (this.ctx.s.quest.progress >= (st.count ?? 1)) this.completeTutorialStep(st);
      else this.ctx.bus.emit('questChanged', {});
    }
    // Questreihen
    for (const a of this.activeLines()) {
      if (a.step.event !== ev || (a.step.filter && !a.step.filter(payload as never, this.ctx.s))) continue;
      a.st.progress += amount;
      if (a.st.progress >= (a.step.count ?? 1)) this.completeLineStep(a.line, a.st);
      else this.ctx.bus.emit('questChanged', {});
    }
  }

  private applyComplete(st: QuestStep): void {
    const s = this.ctx.s;
    const oc = st.onComplete;
    if (oc?.flags) for (const f of oc.flags) s.flags[f] = true;
    if (oc?.give) for (const [id, n] of oc.give) {
      addItem(this.ctx, id, n);
      this.ctx.bus.emit('toast', { text: `+${n} ${ITEMS[id].name}`, icon: id });
    }
    if (oc?.unlock) { s.flags[`unlock_${oc.unlock}`] = true; this.ctx.bus.emit('unlocked', { feature: oc.unlock }); }
    if (oc?.toast) this.ctx.bus.emit('toast', { text: oc.toast });
  }

  private completeTutorialStep(st: QuestStep): void {
    this.applyComplete(st);
    this.ctx.s.quest.step += 1;
    this.ctx.s.quest.progress = 0;
    this.startCurrent();
    this.ctx.bus.emit('questChanged', {});
  }

  /** Führt onStart des aktuellen Tutorial-Schritts aus (idempotent). */
  startCurrent(): void {
    const o = this.current?.onStart?.order;
    if (o && !this.ctx.s.orders.some((x) => x.id === o.id)) this.ctx.s.orders.push({ ...o });
  }
}

/** Schritt-Index einer Questreihe (−1 = nicht gestartet, Länge = fertig). */
export function lineStep(s: { lines: Record<string, LineState> }, id: string): number {
  const st = s.lines[id];
  if (!st) return -1;
  return st.done ? 999 : st.step;
}
