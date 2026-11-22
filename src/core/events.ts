/** Leichter, typisierter Event-Bus. Systeme melden Spielereignisse, Quests/UI hören zu. */
export interface GameEvents {
  tilled: { map: string; x: number; y: number };
  watered: { map: string; x: number; y: number };
  planted: { map: string; crop: string };
  harvested: { item: string; qty: number };
  machineStarted: { machine: string; recipe: string };
  machineCollected: { machine: string; item: string; qty: number };
  sold: { item: string; qty: number; total: number; channel: string };
  bought: { item: string; qty: number; total: number };
  orderCompleted: { orderId: string; reward: number };
  enteredMap: { map: string };
  talked: { npc: string };
  slept: { day: number };
  newDay: { day: number };
  placed: { item: string; map: string };
  inventoryOpened: Record<string, never>;
  itemAdded: { item: string; qty: number };
  moneyChanged: { money: number; delta: number };
  toast: { text: string; icon?: string };
  questChanged: Record<string, never>;
  unlocked: { feature: string };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<unknown>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) { set = new Set(); this.handlers.set(type, set); }
    set.add(fn as Handler<unknown>);
    return () => set!.delete(fn as Handler<unknown>);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { console.error(`[events] Fehler in Handler für ${String(type)}`, err); }
    }
  }
}
