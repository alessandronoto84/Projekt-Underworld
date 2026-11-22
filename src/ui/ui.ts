import { h, img, money } from './dom';
import { canvasURL, iconURL, portrait } from '../art/atlas';
import { drawIcon } from '../art/objects';
import { ITEMS } from '../data/items';
import { CHANNELS, SHOPS } from '../data/trade';
import { NPCS } from '../data/npcs';
import { CAN_CAPACITY, HOTBAR_SIZE, INVENTORY_SIZE } from '../systems/state';
import { countItem, swapSlots } from '../systems/inventory';
import { basePrice, demand, quote, unitPrice } from '../systems/market';
import { formatClock, formatDuration, WEEKDAYS, WEEKDAYS_LONG } from '../systems/time';
import { machineStatus } from '../systems/production';
import type { DaySummary } from '../systems/day';
import type { Game } from '../game/game';
import { PRODUCT_LINES, STAGES, empireLevel, nextStageProgress } from '../data/empire';

export interface MenuOption { label: string; hint?: string; disabled?: boolean; primary?: boolean; action: () => void }

/**
 * Gesamte HTML-Oberfläche. Wenige feste Einstiegspunkte (Inventar, Handel, Karte, Menü),
 * alles andere erscheint kontextbezogen.
 */
export class UI {
  private root: HTMLElement;
  private hud: HTMLElement;
  private clockDay!: HTMLElement; private clockTime!: HTMLElement; private clockMoney!: HTMLElement;
  private energyBar!: HTMLElement;
  private hotbar!: HTMLElement;
  private quest!: HTMLElement;
  private hintEl!: HTMLElement;
  private toasts!: HTMLElement;
  private menuBtns!: HTMLElement;
  private layer: HTMLElement;
  private modal: HTMLElement | null = null;
  private modalKind = '';
  private dialogEl: HTMLElement | null = null;
  private ctxEl: HTMLElement | null = null;
  private fadeEl: HTMLElement;
  private lastHud = '';
  private lastHotbar = '';
  private lastQuest = '';
  private questCollapsed = false;
  private invPick: number | null = null;
  private refreshModal: (() => void) | null = null;

  constructor(private game: Game) {
    this.root = document.getElementById('ui')!;
    this.hud = h('div', { class: 'hud', style: 'display:none' });
    this.layer = h('div');
    this.fadeEl = h('div', { class: 'fade' });
    this.root.append(this.hud, this.layer, this.fadeEl);
    this.buildHud();
    game.ctx.bus.on('toast', (t) => this.toast(t.text, t.icon));
    game.ctx.bus.on('moneyChanged', () => {
      this.clockMoney.classList.remove('flash'); void this.clockMoney.offsetWidth; this.clockMoney.classList.add('flash');
    });
    game.ctx.bus.on('questChanged', () => { this.quest.classList.remove('pop'); void this.quest.offsetWidth; this.quest.classList.add('pop'); this.lastQuest = ''; });
    game.ctx.bus.on('unlocked', () => { this.lastHud = ''; this.renderMenuButtons(); });
  }

  /** Blockiert ein Fenster gerade Spielwelt und Zeit? */
  get blocking(): boolean { return !!(this.modal || this.dialogEl || this.ctxEl); }
  get modalOpen(): string { return this.modal ? this.modalKind : ''; }

  showHud(on: boolean): void { this.hud.style.display = on ? '' : 'none'; if (on) { this.lastHud = ''; this.renderMenuButtons(); } }

  /* ================================================================= HUD */

  private buildHud(): void {
    this.clockDay = h('div', { class: 'day' });
    this.clockTime = h('div', { class: 'time' });
    this.clockMoney = h('div', { class: 'money' });
    this.energyBar = h('div', { class: 'bar' });
    this.hotbar = h('div', { class: 'hotbar panel' });
    this.quest = h('div', { class: 'quest panel', onclick: () => { this.questCollapsed = !this.questCollapsed; this.lastQuest = ''; } });
    this.hintEl = h('div', { class: 'hint' });
    this.toasts = h('div', { class: 'toasts' });
    this.menuBtns = h('div', { class: 'menu-btns' });
    this.hud.append(
      h('div', { class: 'hud-clock panel' }, this.clockDay, this.clockTime, this.clockMoney),
      h('div', { class: 'energy panel', title: 'Energie' }, h('span', { class: 'lbl' }, 'Energie'), this.energyBar),
      this.hotbar, this.quest, this.hintEl, this.toasts, this.menuBtns,
    );
  }

  renderMenuButtons(): void {
    const s = this.game.ctx.s;
    const items: [string, string, string, boolean][] = [
      ['Inventar', 'I', 'inventory', true],
      ['Handel', 'H', 'trade', !!s.flags.unlock_trade],
      ['Karte', 'M', 'map', !!s.flags.visitedTown],
      ['Menü', 'Esc', 'menu', true],
    ];
    this.menuBtns.replaceChildren(...items.filter((i) => i[3]).map(([label, key, kind]) =>
      h('button', { class: `btn ${kind === 'trade' && !s.flags.seenTrade ? 'new' : ''}`, onclick: () => this.toggle(kind) }, label, h('span', { class: 'key' }, key))));
  }

  update(): void {
    const s = this.game.ctx.s;
    const wd = WEEKDAYS[(s.time.day - 1) % 7];
    const weather = s.weather === 'rain' ? 'Regen' : 'Sonnig';
    const hudKey = `${s.time.day}|${formatClock(s.time.minute)}|${s.money}|${s.weather}|${s.player.energy}`;
    if (hudKey !== this.lastHud) {
      this.lastHud = hudKey;
      this.clockDay.replaceChildren(h('span', {}, weather), h('span', {}, `${wd}, Tag ${s.time.day}`));
      this.clockTime.textContent = formatClock(s.time.minute);
      this.clockMoney.textContent = money(s.money);
      const pct = Math.max(0, s.player.energy / s.player.maxEnergy);
      this.energyBar.style.height = `${pct * 100}%`;
      this.energyBar.classList.toggle('low', pct < 0.2);
    }
    const hotKey = s.inventory.slice(0, HOTBAR_SIZE).map((st) => st ? `${st.id}:${st.qty}:${st.water ?? ''}` : '-').join('|') + `#${s.selected}`;
    if (hotKey !== this.lastHotbar) { this.lastHotbar = hotKey; this.renderHotbar(); }
    const q = this.game.quests;
    const questKey = `${s.quest.step}|${s.quest.progress}|${this.questCollapsed}|${q.openGoals().map((g) => g.id).join(',')}|${s.stats.earned}|${s.stats.ordersDone}|${empireLevel(s)}`;
    if (questKey !== this.lastQuest) { this.lastQuest = questKey; this.renderQuest(); }
  }

  private renderHotbar(): void {
    const s = this.game.ctx.s;
    const slots = [];
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      slots.push(this.slotEl(i, i === s.selected, () => { this.game.setSelected(i); }, true));
    }
    this.hotbar.replaceChildren(...slots);
  }

  private slotEl(i: number, selected: boolean, onClick: () => void, showNum: boolean): HTMLElement {
    const st = this.game.ctx.s.inventory[i];
    const el = h('div', { class: `slot ${selected ? 'sel' : ''}`, onclick: onClick, title: st ? ITEMS[st.id].name : '' },
      showNum ? h('span', { class: 'num' }, i + 1) : null,
      st ? img(iconURL(st.id)) : null,
      st && st.qty > 1 ? h('span', { class: 'qty' }, st.qty) : null,
      st?.water !== undefined ? h('div', { class: 'water' }, h('i', { style: `width:${(st.water / CAN_CAPACITY) * 100}%` })) : null,
    );
    return el;
  }

  private renderQuest(): void {
    const q = this.game.quests;
    const st = q.current;
    this.quest.classList.toggle('collapsed', this.questCollapsed);
    const s = this.game.ctx.s;
    const lvl = empireLevel(s);
    const stage = STAGES[lvl - 1];
    if (st) {
      const prog = q.progressText();
      this.quest.replaceChildren(
        h('div', { class: 'head' }, `Stufe ${lvl} · ${stage.name}`),
        h('div', { class: 'title' }, st.title, prog ? h('span', { class: 'prog' }, `  ${prog}`) : null),
        h('div', { class: 'text' }, st.text),
      );
    } else {
      const goals = q.openGoals();
      const next = nextStageProgress(s);
      this.quest.replaceChildren(...([
        h('div', { class: 'head' }, `Stufe ${lvl} · ${stage.name}`),
        h('div', { class: 'title' }, 'Bau dein Imperium aus'),
        goals.length ? h('ul', { class: 'goals' }, goals.map((g) => h('li', {}, g.text))) : null,
        next ? h('div', { class: 'next' }, `Nächste Stufe „${next.stage.name}“: `, h('b', {}, next.parts.join(' · '))) : null,
      ].filter((x) => !!x) as HTMLElement[]));
    }
  }

  setHint(text: string): void { if (this.hintEl.innerHTML !== text) this.hintEl.innerHTML = text; }

  toast(text: string, icon?: string): void {
    const el = h('div', { class: 'toast panel' }, icon && ITEMS[icon] ? img(iconURL(icon)) : icon === 'coin' ? img(canvasURL('icon-coin', () => drawIcon('coin'))) : null, text);
    this.toasts.prepend(el);
    while (this.toasts.children.length > 5) this.toasts.lastElementChild?.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2600);
  }

  async fade(mid: () => void): Promise<void> {
    this.fadeEl.classList.add('on');
    await wait(330);
    mid();
    await wait(60);
    this.fadeEl.classList.remove('on');
  }

  /* ============================================================ Modale */

  toggle(kind: string): void {
    if (this.modal && this.modalKind === kind) { this.closeModal(); return; }
    if (kind === 'inventory') this.openInventory();
    else if (kind === 'trade') { if (this.game.ctx.s.flags.unlock_trade) this.openTrade(); }
    else if (kind === 'map') this.openMap();
    else if (kind === 'menu') this.openMenu();
  }

  closeAll(): boolean {
    if (this.ctxEl) { this.closeContext(); return true; }
    if (this.dialogEl) return false;
    if (this.modal) { this.closeModal(); return true; }
    return false;
  }

  private openModal(kind: string, build: () => HTMLElement, dismissable = true): void {
    this.closeModal();
    this.closeContext();
    this.modalKind = kind;
    const backdrop = h('div', { class: 'backdrop' });
    const render = () => { backdrop.replaceChildren(build()); };
    render();
    if (dismissable) backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) this.closeModal(); });
    this.modal = backdrop;
    this.refreshModal = render;
    this.layer.append(backdrop);
    this.game.input.releaseAll();
  }

  closeModal(): void {
    this.modal?.remove();
    this.modal = null; this.modalKind = ''; this.refreshModal = null; this.invPick = null;
    this.lastHotbar = '';
  }

  private header(title: string): HTMLElement {
    return h('h2', {}, title, h('button', { class: 'btn small close', onclick: () => this.closeModal() }, 'Schließen ', h('span', { class: 'key' }, 'Esc')));
  }

  openInventory(): void {
    this.game.ctx.bus.emit('inventoryOpened', {});
    this.invPick = null;
    let info: HTMLElement;
    this.openModal('inventory', () => {
      const s = this.game.ctx.s;
      info = h('div', { class: 'inv-info' }, h('span', { class: 'muted' }, 'Klicke einen Gegenstand an, dann einen anderen Platz, um ihn zu verschieben. Die obere Reihe ist deine Schnellleiste (1–8).'));
      const slots: HTMLElement[] = [];
      for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (i === HOTBAR_SIZE) slots.push(h('div', { class: 'hot-sep' }));
        const el = this.slotEl(i, i === this.invPick || (this.invPick === null && i === s.selected), () => {
          if (this.invPick === null) {
            if (!s.inventory[i]) return;
            this.invPick = i;
          } else {
            swapSlots(s, this.invPick, i);
            this.invPick = null;
          }
          this.refreshModal?.();
        }, i < HOTBAR_SIZE);
        el.addEventListener('mouseenter', () => this.showInfo(info, i));
        if (i === this.invPick) el.classList.add('drag');
        slots.push(el);
      }
      return h('div', { class: 'modal panel' }, this.header('Inventar'), h('div', { class: 'inv-grid' }, slots), info);
    });
  }

  private showInfo(el: HTMLElement, i: number): void {
    const st = this.game.ctx.s.inventory[i];
    if (!st) return;
    const d = ITEMS[st.id];
    el.replaceChildren(img(iconURL(st.id)), h('div', {}, h('b', {}, d.name), st.qty > 1 ? ` ×${st.qty}` : '', h('br'), d.desc,
      d.value > 0 ? h('div', { class: 'val' }, `Richtwert: ${d.value} $`) : null));
  }

  /** Handels-Panel (H): Aufträge, Tagespreise, Finanzen. */
  openTrade(): void {
    this.game.ctx.s.flags.seenTrade = true;
    this.renderMenuButtons();
    this.openModal('trade', () => {
      const s = this.game.ctx.s;
      const orders = s.orders.map((o) => {
        const have = countItem(s, o.item);
        return h('div', { class: `order ${have >= o.qty ? 'ready' : ''}` }, img(iconURL(o.item)),
          h('div', { class: 'nm' }, h('b', {}, `${o.qty}× ${ITEMS[o.item].name}`), h('div', { class: 'dl' },
            `für ${CHANNELS[o.channel].name} · ${o.tutorial ? 'keine Frist' : `bis Tag ${o.deadlineDay}`} · du hast ${have}`)),
          h('div', { class: 'rw' }, money(o.reward)));
      });
      const channels = Object.values(CHANNELS).filter((c) => !c.unlockFlag || s.flags[c.unlockFlag]);
      const prices = channels.map((c) => h('div', {}, h('h3', {}, c.name), h('div', { class: 'muted', style: 'font-size:13px;margin:-2px 0 6px' }, c.blurb),
        c.buys.map((b) => {
          const p = unitPrice(s, c.id, b.item);
          const d = demand(s, c.id, b.item);
          const cls = p < b.price * 0.95 ? 'down' : p > b.price * 1.04 ? 'up' : '';
          return h('div', { class: 'row' }, img(iconURL(b.item)), h('div', { class: 'nm' }, ITEMS[b.item].name, h('small', {}, `Nachfrage ${Math.round(d * 100)} % · du hast ${countItem(s, b.item)}`)), h('div', { class: `pr ${cls}` }, `${p} $`));
        })));
      const last7 = s.ledger.slice(-7);
      const inc = last7.reduce((a, l) => a + l.income, 0), exp = last7.reduce((a, l) => a + l.expenses, 0);
      const working = Object.values(s.machines).flat().filter((m) => machineStatus(s, m).state === 'working').length;
      return h('div', { class: 'modal panel trade' }, this.header('Handel & Finanzen'),
        h('div', { class: 'fin' },
          h('div', {}, h('span', {}, 'Bargeld'), h('b', {}, money(s.money))),
          h('div', {}, h('span', {}, 'Einnahmen (7 Tage)'), h('b', { class: 'pos' }, money(inc))),
          h('div', {}, h('span', {}, 'Ausgaben (7 Tage)'), h('b', { class: 'neg' }, money(exp))),
          h('div', {}, h('span', {}, 'Offene Aufträge'), h('b', {}, s.orders.length)),
          h('div', {}, h('span', {}, 'Maschinen in Betrieb'), h('b', {}, `${working}/${Object.values(s.machines).flat().length}`)),
          h('div', {}, h('span', {}, 'Verdient insgesamt'), h('b', {}, money(s.stats.earned))),
        ),
        h('h3', {}, `Imperium · Stufe ${empireLevel(s)}: ${STAGES[empireLevel(s) - 1].name}`),
        (() => { const n = nextStageProgress(s); return n ? h('div', { class: 'muted', style: 'font-size:14px' }, `Nächste Stufe „${n.stage.name}“: ${n.parts.join(' · ')} → ${n.stage.unlocks.join(', ')}`) : null; })(),
        h('div', { class: 'products' }, PRODUCT_LINES.map((pl) => {
          const open = empireLevel(s) >= pl.stage;
          return h('div', { class: `prod ${open ? 'open' : ''}` }, pl.item && open ? img(iconURL(pl.item)) : h('span', { class: 'lock' }, '🔒'),
            h('span', {}, pl.name), h('small', {}, open ? (pl.item ? `du hast ${countItem(s, pl.item)}` : '') : `Stufe ${pl.stage}${pl.note ? ` · ${pl.note}` : ''}`));
        })),
        h('h3', {}, 'Aufträge'),
        orders.length ? orders : h('div', { class: 'empty' }, 'Keine offenen Aufträge. Rico meldet sich regelmäßig mit neuen Anfragen.'),
        h('div', { class: 'muted', style: 'font-size:13px' }, 'Aufträge lieferst du persönlich beim Auftraggeber ab.'),
        h('div', { class: 'cols2' }, prices),
      );
    });
  }

  openMap(): void {
    this.openModal('map', () => {
      const s = this.game.ctx.s;
      const where = s.player.map === 'farm' || s.player.map === 'home' ? 'farm' : 'oldtown';
      const D = (id: string, name: string, x: number, y: number, w: number, hh: number, open: boolean, sub: string) =>
        h('div', { class: `district ${open ? 'open' : ''} ${where === id ? 'here' : ''}`, style: `left:${x}%;top:${y}%;width:${w}%;height:${hh}%` },
          h('div', {}, name, h('small', {}, sub)));
      return h('div', { class: 'modal panel' }, this.header('Greenfield'),
        h('div', { class: 'citymap' },
          D('farm', 'Theos Hof', 2, 36, 18, 28, true, 'Dein Zuhause'),
          D('oldtown', 'Old Town', 24, 34, 24, 32, true, 'Kramer · Anker'),
          D('downtown', 'Downtown', 24, 4, 24, 26, false, 'Phase 3'),
          D('nightlife', 'Nightlife District', 52, 4, 22, 26, false, 'Phase 3'),
          D('southside', 'Southside', 24, 70, 24, 26, false, 'Phase 3'),
          D('industrial', 'Industrial District', 52, 34, 22, 32, false, 'Phase 3'),
          D('suburbs', 'Suburbs', 2, 4, 18, 28, false, 'Phase 3'),
          D('harbor', 'Harbor', 78, 4, 20, 92, false, 'Phase 3'),
          D('old', '', 2, 70, 18, 26, false, ''),
        ),
        h('div', { class: 'muted', style: 'margin-top:8px;font-size:14px' }, 'Gelb umrandet: dein Standort. Weitere Stadtviertel und Städte werden im Spielverlauf freigeschaltet.'),
      );
    });
  }

  openMenu(): void {
    this.openModal('menu', () => h('div', { class: 'modal panel', style: 'min-width:320px' }, this.header('Pause'),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px' },
        h('button', { class: 'btn primary', onclick: () => this.closeModal() }, 'Weiterspielen'),
        h('button', { class: 'btn', onclick: () => { this.game.saveNow(); } }, 'Spiel speichern'),
        h('button', { class: 'btn', onclick: () => this.openHelp() }, 'Steuerung'),
        h('button', { class: 'btn', onclick: () => { this.game.sfx.toggle(); this.refreshModal?.(); } }, `Ton: ${this.game.sfx.enabled ? 'an' : 'aus'}`),
        h('button', { class: 'btn', onclick: () => { this.closeModal(); this.game.quitToTitle(); } }, 'Zum Titelbildschirm'),
      ),
      h('div', { class: 'muted', style: 'font-size:13px;margin-top:10px' }, 'Das Spiel speichert automatisch, wenn du schlafen gehst.'),
    ));
  }

  openHelp(): void {
    this.openModal('help', () => h('div', { class: 'modal panel' }, this.header('Steuerung'),
      h('div', { class: 'help-list' },
        h('div', {}, h('span', { class: 'key' }, 'W A S D'), ' / Pfeiltasten – Laufen (', h('span', { class: 'key' }, 'Shift'), ' rennen)'),
        h('div', {}, h('span', { class: 'key' }, 'Leertaste'), ' / Linksklick – Werkzeug oder Gegenstand benutzen'),
        h('div', {}, h('span', { class: 'key' }, 'E'), ' / Rechtsklick – Sprechen, Ernten, Maschinen bedienen'),
        h('div', {}, h('span', { class: 'key' }, '1'), '–', h('span', { class: 'key' }, '8'), ' / Mausrad – Gegenstand wählen'),
        h('div', {}, h('span', { class: 'key' }, 'I'), ' Inventar · ', h('span', { class: 'key' }, 'H'), ' Handel · ', h('span', { class: 'key' }, 'M'), ' Karte · ', h('span', { class: 'key' }, 'Esc'), ' Menü'),
        h('div', { class: 'muted' }, 'Mit der Maus kannst du auch direkt auf ein Feld neben dir klicken.'),
      )));
  }

  /** Laden/Verkauf bei einem NPC. */
  openShop(title: string, shopId?: string, channelId?: string): void {
    this.openModal('shop', () => {
      const s = this.game.ctx.s;
      const shop = shopId ? SHOPS[shopId] : undefined;
      const ch = channelId ? CHANNELS[channelId] : undefined;
      const buyCol = shop ? h('div', {}, h('h3', {}, 'Kaufen'),
        shop.stock.filter((e) => !e.unlockFlag || s.flags[e.unlockFlag]).map((e) => h('div', { class: 'row' }, img(iconURL(e.item)),
          h('div', { class: 'nm' }, ITEMS[e.item].name, h('small', {}, ITEMS[e.item].desc)),
          h('div', { class: 'pr' }, `${e.price} $`),
          h('button', { class: 'btn small', disabled: s.money < e.price, onclick: () => { this.game.buy(shop.id, e.item, 1); this.refreshModal?.(); } }, '1'),
          h('button', { class: 'btn small', disabled: s.money < e.price * 5, onclick: () => { this.game.buy(shop.id, e.item, 5); this.refreshModal?.(); } }, '5'),
        ))) : null;
      let sellCol: HTMLElement | null = null;
      if (ch) {
        const sellable = ch.buys.filter((b) => countItem(s, b.item) > 0);
        sellCol = h('div', {}, h('h3', {}, 'Verkaufen'),
          sellable.length ? sellable.map((b) => {
            const n = countItem(s, b.item);
            const p = unitPrice(s, ch.id, b.item);
            const all = quote(s, ch.id, b.item, n);
            return h('div', { class: 'row' }, img(iconURL(b.item)),
              h('div', { class: 'nm' }, ITEMS[b.item].name, h('small', {}, `du hast ${n}`)),
              h('div', { class: `pr ${p < (basePrice(ch.id, b.item) ?? p) * 0.95 ? 'down' : ''}` }, `${p} $`),
              h('button', { class: 'btn small', onclick: () => { this.game.sell(ch.id, b.item, 1); this.refreshModal?.(); } }, '1'),
              h('button', { class: 'btn small primary', onclick: () => { this.game.sell(ch.id, b.item, n); this.refreshModal?.(); } }, `Alle · ${all} $`),
            );
          }) : h('div', { class: 'empty' }, `Du hast nichts, was ${ch.name} kauft. Gefragt: ${ch.buys.map((b) => ITEMS[b.item].name).join(', ')}.`));
      }
      return h('div', { class: 'modal panel shop' }, this.header(title),
        h('div', { class: 'muted', style: 'margin:-4px 0 6px' }, `Bargeld: ${money(s.money)}`),
        h('div', { class: 'cols' }, buyCol, sellCol));
    });
  }

  confirm(text: string, yes: string, onYes: () => void, no = 'Abbrechen'): void {
    this.openModal('confirm', () => h('div', { class: 'modal panel', style: 'text-align:center;min-width:300px' },
      h('div', { style: 'font-size:20px;margin:6px 0 14px' }, text),
      h('div', { style: 'display:flex;gap:10px;justify-content:center' },
        h('button', { class: 'btn primary', onclick: () => { this.closeModal(); onYes(); } }, yes),
        h('button', { class: 'btn', onclick: () => this.closeModal() }, no))));
  }

  daySummary(sum: DaySummary, saved: boolean, onClose: () => void): void {
    const s = this.game.ctx.s;
    this.openModal('summary', () => h('div', { class: 'modal panel summary' },
      h('div', { class: 'muted' }, sum.passedOut ? 'Du bist vor Erschöpfung umgekippt …' : 'Gute Nacht.'),
      h('div', { class: 'big' }, `Tag ${sum.endedDay} beendet`),
      h('table', {},
        h('tr', {}, h('td', {}, 'Einnahmen'), h('td', { style: 'color:var(--green)' }, money(sum.ledger.income))),
        h('tr', {}, h('td', {}, 'Ausgaben'), h('td', { style: 'color:var(--red)' }, money(sum.ledger.expenses))),
        sum.penalty ? h('tr', {}, h('td', {}, 'Arztrechnung'), h('td', { style: 'color:var(--red)' }, `−${money(sum.penalty)}`)) : null,
        h('tr', {}, h('td', {}, 'Bargeld'), h('td', { style: 'color:var(--gold)' }, money(s.money))),
      ),
      sum.expiredOrders.length ? h('div', { style: 'color:var(--red);margin-bottom:8px' }, `${sum.expiredOrders.length} Auftrag/Aufträge abgelaufen.`) : null,
      h('div', { class: 'muted', style: 'margin-bottom:12px' }, `${WEEKDAYS_LONG[(s.time.day - 1) % 7]}, Tag ${s.time.day} · ${s.weather === 'rain' ? 'Regen – die Pflanzen werden gegossen' : 'Sonnig'}${saved ? ' · Gespeichert' : ''}`),
      h('button', { class: 'btn primary', onclick: () => { this.closeModal(); onClose(); } }, 'Neuer Tag'),
    ), false);
  }

  title(hasSave: boolean, onNew: () => void, onContinue: () => void): void {
    this.openModal('title', () => h('div', { class: 'title-screen' },
      h('div', { class: 'logo' }, 'UNDERWORLD'),
      h('div', { class: 'tagline' }, 'Vom kleinen Dealer zum Imperium'),
      h('div', { class: 'btns' },
        hasSave ? h('button', { class: 'btn primary', onclick: () => { this.closeModal(); onContinue(); } }, 'Weiterspielen') : null,
        h('button', { class: `btn ${hasSave ? '' : 'primary'}`, onclick: () => {
          if (hasSave) this.confirm('Neues Spiel starten? Dein alter Spielstand wird überschrieben.', 'Neues Spiel', onNew, 'Zurück');
          else { this.closeModal(); onNew(); }
        } }, 'Neues Spiel'),
      ),
      h('div', { class: 'foot' }, 'Fiktion · Alle Personen, Orte und Organisationen sind erfunden · Herstellung und Handel sind abstrakte Spielmechaniken.'),
    ), false);
  }

  /* ====================================================== Dialog & Menü */

  dialogue(npcId: string, lines: string[], options: MenuOption[] = [], onEnd?: () => void): void {
    this.closeContext();
    this.dialogEl?.remove();
    const npc = NPCS[npcId] as (typeof NPCS)[string] | undefined;
    let pc: HTMLCanvasElement | null = null;
    if (npc) {
      pc = document.createElement('canvas');
      pc.width = 16; pc.height = 15; pc.getContext('2d')!.drawImage(portrait(npcId, npc.look), 0, 0);
    }
    const lineEl = h('div', { class: 'line' });
    const optsEl = h('div', { class: 'opts' });
    const moreEl = h('div', { class: 'more' }, '▼');
    const el = h('div', { class: 'dialog panel' },
      pc ? h('div', { class: 'portrait' }, pc) : null,
      h('div', { class: 'body' }, npc ? h('div', { class: 'name' }, npc.name, h('small', {}, npc.title)) : null, lineEl, optsEl, moreEl));
    let idx = 0;
    let typing: number | undefined;
    let full = false;
    const close = () => { clearInterval(typing); el.remove(); if (this.dialogEl === el) this.dialogEl = null; this.game.input.releaseAll(); onEnd?.(); };
    const show = () => {
      const text = lines[idx];
      let n = 0; full = false;
      lineEl.textContent = '';
      optsEl.replaceChildren();
      moreEl.style.visibility = 'hidden';
      clearInterval(typing);
      typing = window.setInterval(() => {
        n += 2;
        lineEl.textContent = text.slice(0, n);
        if (n >= text.length) finish();
      }, 18);
    };
    const finish = () => {
      clearInterval(typing); full = true;
      lineEl.textContent = lines[idx];
      const last = idx === lines.length - 1;
      if (last && options.length) {
        optsEl.replaceChildren(...options.map((o) => h('button', {
          class: `btn small ${o.primary ? 'primary' : ''}`, disabled: o.disabled, title: o.hint ?? '',
          onclick: (e: Event) => { e.stopPropagation(); close(); o.action(); },
        }, o.label, o.hint ? h('small', { class: 'muted' }, ` ${o.hint}`) : null)));
      }
      moreEl.style.visibility = last && options.length ? 'hidden' : 'visible';
    };
    const advance = () => {
      if (!full) { finish(); return; }
      if (idx < lines.length - 1) { idx++; show(); return; }
      if (!options.length) close();
    };
    el.addEventListener('click', advance);
    (el as HTMLElement & { advance?: () => void }).advance = advance;
    this.dialogEl = el;
    this.layer.append(el);
    this.game.input.releaseAll();
    show();
  }

  /** Erzähltext ohne Sprecher (Schilder, Briefe, Objekte). */
  narrate(...lines: string[]): void { this.dialogue('', lines); }

  /** Taste E/Leertaste im Dialog. */
  advanceDialogue(): boolean {
    const el = this.dialogEl as (HTMLElement & { advance?: () => void }) | null;
    if (!el) return false;
    el.advance?.();
    return true;
  }

  contextMenu(screenX: number, screenY: number, title: string, status: string | null, options: MenuOption[]): void {
    this.closeContext();
    const el = h('div', { class: 'ctx panel' },
      h('div', { class: 'ttl' }, title),
      status ? h('div', { class: 'status' }, status) : null,
      options.map((o) => h('button', { class: `btn ${o.primary ? 'primary' : ''}`, disabled: o.disabled, onclick: () => { this.closeContext(); o.action(); } },
        h('span', {}, o.label), o.hint ? h('small', {}, o.hint) : null)),
      h('button', { class: 'btn small', onclick: () => this.closeContext() }, 'Schließen'),
    );
    el.style.left = `${Math.min(window.innerWidth - 240, Math.max(8, screenX))}px`;
    el.style.top = `${Math.min(window.innerHeight - 60 - options.length * 44, Math.max(8, screenY))}px`;
    this.ctxEl = el;
    this.layer.append(el);
    this.game.input.releaseAll();
  }

  closeContext(): void { this.ctxEl?.remove(); this.ctxEl = null; }
}

function wait(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

export { formatDuration };
