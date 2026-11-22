import type { GameEvents } from '../core/events';
import { GOALS, TUTORIAL, goalVisible, type QuestStep, type QuestTarget } from '../data/tutorial';
import { STAGES, empireLevel, stageMet } from '../data/empire';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { addMoney, type Ctx } from './state';

/**
 * Fortschrittssystem: Tutorial-Schritte (Kette) und danach freie Ziele.
 * Hört ausschließlich auf Spielereignisse, kennt weder UI noch Rendering.
 */
export class Quests {
  private unsub: (() => void)[] = [];

  constructor(private ctx: Ctx) {
    const events = new Set(TUTORIAL.map((t) => t.event));
    for (const ev of events) {
      this.unsub.push(ctx.bus.on(ev, (p) => this.onEvent(ev, p)));
    }
    this.unsub.push(ctx.bus.on('machineCollected', (p) => {
      if (p.item === 'ecstasy') ctx.s.flags.madeEcstasy = true;
      if (p.item === 'kokain') ctx.s.flags.madeKokain = true;
    }));
  }

  dispose(): void { this.unsub.forEach((u) => u()); }

  get current(): QuestStep | undefined { return TUTORIAL[this.ctx.s.quest.step]; }
  get inTutorial(): boolean { return this.ctx.s.quest.step < TUTORIAL.length; }

  target(): QuestTarget | undefined {
    const st = this.current;
    if (!st?.target) return undefined;
    return typeof st.target === 'function' ? st.target(this.ctx.s) : st.target;
  }

  progressText(): string | undefined {
    const st = this.current;
    if (!st?.count || st.count <= 1) return undefined;
    return `${Math.min(this.ctx.s.quest.progress, st.count)}/${st.count}`;
  }

  /** Offene Ziele nach dem Tutorial (max. 2 sichtbar, damit es übersichtlich bleibt). */
  openGoals(): { id: string; text: string }[] {
    if (this.inTutorial) return [];
    return GOALS.filter((g) => goalVisible(g, this.ctx.s) && !this.ctx.s.flags[`goal_${g.id}`]).slice(0, 2);
  }

  /** Prüft Ziele (wird regelmäßig aufgerufen). */
  checkGoals(): void {
    this.checkStages();
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

  /** Imperium-Aufstieg prüfen (eine Stufe pro Aufruf). */
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

  private onEvent<K extends keyof GameEvents>(ev: K, payload: GameEvents[K]): void {
    const st = this.current;
    if (!st || st.event !== ev) return;
    if (st.filter && !st.filter(payload as never, this.ctx.s)) return;
    const amount = ev === 'harvested' ? (payload as GameEvents['harvested']).qty : 1;
    this.ctx.s.quest.progress += amount;
    if (this.ctx.s.quest.progress >= (st.count ?? 1)) this.complete(st);
    else this.ctx.bus.emit('questChanged', {});
  }

  private complete(st: QuestStep): void {
    const s = this.ctx.s;
    const oc = st.onComplete;
    if (oc?.flags) for (const f of oc.flags) s.flags[f] = true;
    if (oc?.give) for (const [id, n] of oc.give) {
      addItem(this.ctx, id, n);
      this.ctx.bus.emit('toast', { text: `+${n} ${ITEMS[id].name}`, icon: id });
    }
    if (oc?.unlock) { s.flags[`unlock_${oc.unlock}`] = true; this.ctx.bus.emit('unlocked', { feature: oc.unlock }); }
    if (oc?.toast) this.ctx.bus.emit('toast', { text: oc.toast });
    s.quest.step += 1;
    s.quest.progress = 0;
    this.startCurrent();
    this.ctx.bus.emit('questChanged', {});
  }

  /** Führt onStart des aktuellen Schritts aus (idempotent). */
  startCurrent(): void {
    const next = this.current;
    const o = next?.onStart?.order;
    if (o && !this.ctx.s.orders.some((x) => x.id === o.id)) this.ctx.s.orders.push({ ...o });
  }
}
