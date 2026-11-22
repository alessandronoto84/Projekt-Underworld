import { EventBus } from '../core/events';
import { Input } from '../core/input';
import { TILE, dirVec, rectsOverlap, type Dir } from '../core/types';
import { P } from '../art/palette';
import type { Look } from '../art/characters';
import { Actor } from '../entities/actor';
import { Npc } from '../entities/npc';
import { Animal } from '../entities/animal';
import { Walker } from '../entities/walker';
import { ANIMALS, WALKERS } from '../data/life';
import { FORAGE } from '../data/forage';
import { forageAt, pickForage, searchTrash, spawnForage } from '../systems/forage';
import { addMoney } from '../systems/state';
import { Ambient } from './ambient';
import { GameMap } from '../world/gamemap';
import { FARM } from '../data/maps/farm';
import { TOWN } from '../data/maps/town';
import { BAR, HOME, SHOP } from '../data/maps/interiors';
import { WOODS } from '../data/maps/woods';
import type { MapDef, Warp } from '../world/mapdef';
import { ITEMS } from '../data/items';
import { CROPS } from '../data/crops';
import { MACHINES } from '../data/machines';
import { NPCS, type NpcDef } from '../data/npcs';
import { CHANNELS, SHOPS } from '../data/trade';
import { CAN_CAPACITY, DAY_END, HOTBAR_SIZE, createNewGame, type Ctx, type GameState, type ItemStack } from '../systems/state';
import { addItem, countItem, removeItem, selectedStack } from '../systems/inventory';
import { harvest, plant, soilAt, till, water } from '../systems/farming';
import { collect, findRecipe, machineAt, machineStatus, placeMachine, possibleBatches, startJob } from '../systems/production';
import { buy, deliverOrder, sell } from '../systems/market';
import { endDay } from '../systems/day';
import { Quests } from '../systems/quests';
import { browserStorage, hasSave, loadGame, saveGame } from '../systems/save';
import { REAL_SECONDS_PER_MINUTE, darkness, formatDuration, weekday } from '../systems/time';
import { quote, unitPrice } from '../systems/market';
import { UI, type MenuOption } from '../ui/ui';
import { Renderer } from './renderer';
import { Sound } from './sfx';

const MAP_DEFS: MapDef[] = [FARM, TOWN, WOODS, HOME, SHOP, BAR];
const OUTDOOR = new Set(MAP_DEFS.filter((m) => m.outdoor).map((m) => m.id));

const PLAYER_LOOK: Look = {
  skin: P.skin0, skinShade: P.skin1, hair: P.b2, hairShade: P.b1, hairStyle: 'short',
  shirt: P.tealDark, shirtShade: '#17605f', pants: P.w1, pantsShade: P.w0, shoes: P.white,
};

const WALK = 72;
const RUN = 112;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; grav: number }
interface PlayerAction { item: string; t: number; dur: number }

class Player extends Actor {
  action: PlayerAction | null = null;
  constructor() { super('player', PLAYER_LOOK); }
}

export class Game {
  readonly input: Input;
  readonly renderer: Renderer;
  readonly sfx = new Sound();
  readonly ctx: Ctx;
  quests!: Quests;
  ui!: UI;
  readonly maps: Record<string, GameMap> = {};
  map!: GameMap;
  readonly player = new Player();
  npcs: Npc[] = [];
  animals: Animal[] = [];
  walkers: Walker[] = [];
  readonly ambient = new Ambient();
  particles: Particle[] = [];
  targetTile: { x: number; y: number } | null = null;
  showTarget = false;

  private playing = false;
  private timeAcc = 0;
  private warpLock = 0;
  private transitioning = false;
  private lastMouseMove = 0;
  private lastMouse = { x: -1, y: -1 };
  private notified = new Set<string>();
  private toastCooldown = new Map<string, number>();
  private goalTimer = 0;
  private stepTimer = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.ctx = { s: createNewGame(), bus: new EventBus() };
    for (const d of MAP_DEFS) this.maps[d.id] = new GameMap(d);
    this.ui = new UI(this);
    this.wireEvents();
    canvas.addEventListener('mousemove', () => { this.lastMouseMove = performance.now(); });
  }

  /* ========================================================== Lebenszyklus */

  start(): void {
    this.showTitle();
    requestAnimationFrame((t) => this.frame(t));
  }

  private showTitle(): void {
    this.playing = false;
    this.ui.showHud(false);
    // Hintergrund für den Titel: der Hof am Abend
    this.loadState(createNewGame(1));
    this.ctx.s.time.minute = 19 * 60 + 30;
    this.switchMap('farm', 20 * TILE, 13 * TILE, 'down', false);
    this.ui.title(hasSave(browserStorage), () => this.newGame(), () => this.continueGame());
  }

  newGame(): void {
    this.loadState(createNewGame());
    this.beginPlay();
    this.toast('Willkommen in Greenfield.', 'letter_uncle');
  }

  continueGame(): void {
    const s = loadGame(browserStorage);
    if (!s) { this.toast('Spielstand konnte nicht geladen werden – neues Spiel.'); this.newGame(); return; }
    this.loadState(s);
    this.beginPlay();
    this.toast(`Willkommen zurück! Tag ${s.time.day}.`);
  }

  private loadState(s: GameState): void {
    this.quests?.dispose();
    this.ctx.s = s;
    this.quests = new Quests(this.ctx);
    this.quests.startCurrent();
    this.npcs = Object.values(NPCS).map((d) => new Npc(d));
    this.notified.clear();
    for (const m of Object.values(s.machines).flat()) if (machineStatus(s, m).state === 'done') this.notified.add(m.uid);
    if (s.vars.forageDay !== s.time.day) this.spawnDaily();
  }

  /** Tägliche Fundstücke auslegen. */
  private spawnDaily(): void {
    const s = this.ctx.s;
    spawnForage(s, (mapId, x, y) => {
      const m = this.maps[mapId];
      if (!m || m.isSolid(x, y) || m.isFarmable(x, y) || soilAt(s, mapId, x, y) || machineAt(s, mapId, x, y) || m.interactableAt(x, y)) return false;
      if (m.warps.some((w) => x >= Math.floor(w.x) && x < w.x + w.w && y >= Math.floor(w.y) && y < w.y + w.h)) return false;
      return ['grass', 'grassDark', 'dirt', 'sand', 'pavement'].includes(m.groundAt(x, y));
    });
    s.vars.forageDay = s.time.day;
  }

  private beginPlay(): void {
    const p = this.ctx.s.player;
    this.switchMap(p.map, p.x, p.y, p.dir, false);
    this.playing = true;
    this.ui.showHud(true);
  }

  quitToTitle(): void { this.saveNow(true); this.showTitle(); }

  saveNow(silent = false): void {
    this.syncPlayerToState();
    const ok = saveGame(browserStorage, this.ctx.s);
    if (!silent) this.toast(ok ? 'Spiel gespeichert.' : 'Speichern fehlgeschlagen!');
  }

  private syncPlayerToState(): void {
    const p = this.ctx.s.player;
    p.map = this.map.def.id; p.x = this.player.x; p.y = this.player.y; p.dir = this.player.dir;
  }

  private wireEvents(): void {
    const bus = this.ctx.bus;
    bus.on('questChanged', () => { this.sfx.play('quest'); if (this.map) this.syncNpcs(false); });
    bus.on('enteredMap', (e) => { if (e.map === 'town' && !this.ctx.s.flags.visitedTown) { this.ctx.s.flags.visitedTown = true; this.ui.renderMenuButtons(); } });
    bus.on('unlocked', (e) => { if (e.feature === 'trade') this.sfx.play('coin'); });
    bus.on('questDone', (e) => { this.sfx.play('quest'); setTimeout(() => this.ui.narrate(e.text), 400); });
  }

  /* ============================================================== Loop */

  private frame(t: number): void {
    const now = t / 1000;
    const dt = Math.min(0.05, this.lastTime ? now - this.lastTime : 0.016);
    this.lastTime = now;
    try {
      this.update(dt);
      this.renderer.render(this, now, dt);
      this.ui.update();
    } catch (err) {
      console.error('[game] Fehler im Spielablauf', err);
    }
    this.input.endFrame();
    requestAnimationFrame((tt) => this.frame(tt));
  }

  /** Für automatisierte Spieltests: simuliert Frames unabhängig von requestAnimationFrame. */
  simulate(seconds: number, fps = 60): void {
    const dt = 1 / fps;
    for (let i = 0; i < seconds * fps; i++) { this.update(dt); this.input.endFrame(); }
  }

  private update(dt: number): void {
    this.updateParticles(dt);
    if (!this.playing) { this.updateNpcs(dt, false); this.ambient.update(dt, this); return; }
    const inp = this.input;

    if (this.ui.blocking) {
      if (inp.wasPressed('menu')) this.ui.closeAll();
      else if (inp.wasPressed('interact') || inp.wasPressed('use')) this.ui.advanceDialogue();
      else if (inp.wasPressed('inventory') && this.ui.modalOpen === 'inventory') this.ui.closeModal();
      else if (inp.wasPressed('trade') && this.ui.modalOpen === 'trade') this.ui.closeModal();
      else if (inp.wasPressed('map') && this.ui.modalOpen === 'map') this.ui.closeModal();
      else if (inp.wasPressed('journal') && this.ui.modalOpen === 'journal') this.ui.closeModal();
      this.ui.setHint('');
      return;
    }
    if (this.transitioning) return;

    if (inp.wasPressed('inventory')) { this.ui.toggle('inventory'); return; }
    if (inp.wasPressed('trade')) { if (this.ctx.s.flags.unlock_trade) this.ui.toggle('trade'); else this.toastOnce('trade', 'Den Handel schaltest du im Spielverlauf frei.'); return; }
    if (inp.wasPressed('map')) { if (this.ctx.s.flags.visitedTown) this.ui.toggle('map'); return; }
    if (inp.wasPressed('menu')) { this.ui.toggle('menu'); return; }
    if (inp.wasPressed('journal')) { if (!this.quests.inTutorial) this.ui.toggle('journal'); return; }
    const n = inp.takeNumber();
    if (n !== null && n < HOTBAR_SIZE) this.setSelected(n);
    const wheel = inp.takeWheel();
    if (wheel) this.setSelected((this.ctx.s.selected + wheel + HOTBAR_SIZE) % HOTBAR_SIZE);

    this.updateClock(dt);
    this.updatePlayer(dt);
    this.updateNpcs(dt, true);
    this.ambient.update(dt, this);
    this.updateTarget();
    this.handleActions();
    this.checkMachines();
    this.goalTimer += dt;
    if (this.goalTimer > 1) { this.goalTimer = 0; this.quests.checkGoals(); }
    this.updateHint();
  }

  /* ============================================================== Zeit */

  private updateClock(dt: number): void {
    const s = this.ctx.s;
    this.timeAcc += dt;
    while (this.timeAcc >= REAL_SECONDS_PER_MINUTE) {
      this.timeAcc -= REAL_SECONDS_PER_MINUTE;
      s.time.minute += 1;
      if (s.time.minute % 10 === 0) { this.syncNpcs(false); this.populateWalkers(); }
      if (s.time.minute >= DAY_END) { s.time.minute = DAY_END; this.passOut(); return; }
      if (s.time.minute === 24 * 60) this.toast('Mitternacht. Du solltest bald schlafen gehen.');
    }
  }

  /* =========================================================== Spieler */

  private updatePlayer(dt: number): void {
    const p = this.player, inp = this.input;
    if (p.action) { p.action.t -= dt; if (p.action.t <= 0) p.action = null; }
    let dx = 0, dy = 0;
    if (inp.isDown('left')) dx -= 1;
    if (inp.isDown('right')) dx += 1;
    if (inp.isDown('up')) dy -= 1;
    if (inp.isDown('down')) dy += 1;
    p.moving = dx !== 0 || dy !== 0;
    if (!p.moving) return;
    if (Math.abs(dx) > Math.abs(dy) || (dx !== 0 && dy === 0)) p.dir = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) p.dir = dy > 0 ? 'down' : 'up';
    const speed = (inp.isDown('run') ? RUN : WALK) * (dx && dy ? Math.SQRT1_2 : 1);
    const nx = p.x + dx * speed * dt, ny = p.y + dy * speed * dt;
    if (!this.collides(nx, p.y)) p.x = nx;
    else if (dy === 0) this.slide(p, 'y', nx);
    if (!this.collides(p.x, ny)) p.y = ny;
    else if (dx === 0) this.slide(p, 'x', ny);
    p.animTime += dt * (inp.isDown('run') ? 1.4 : 1);
    this.stepTimer += dt;
    if (this.stepTimer > 0.32) { this.stepTimer = 0; if (this.map.def.outdoor) this.sfx.play('step'); }
    if (this.warpLock > 0) this.warpLock -= dt; else this.checkWarp();
  }

  /** Um Ecken gleiten, wenn man knapp an einem Hindernis hängt. */
  private slide(p: Actor, axis: 'x' | 'y', target: number): void {
    for (const off of [3, -3, 6, -6]) {
      if (axis === 'y' && !this.collides(target, p.y + off)) { p.y += Math.sign(off) * 0.8; return; }
      if (axis === 'x' && !this.collides(p.x + off, target)) { p.x += Math.sign(off) * 0.8; return; }
    }
  }

  collides(x: number, y: number): boolean {
    const hb = this.player.hitbox(x, y);
    const tx0 = Math.floor(hb.x / TILE), tx1 = Math.floor((hb.x + hb.w - 0.01) / TILE);
    const ty0 = Math.floor(hb.y / TILE), ty1 = Math.floor((hb.y + hb.h - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (this.map.isSolid(tx, ty)) return true;
      if (machineAt(this.ctx.s, this.map.def.id, tx, ty)) {
        if (rectsOverlap(hb, { x: tx * TILE + 2, y: ty * TILE + 8, w: 12, h: 8 })) return true;
      }
    }
    return false;
  }

  setSelected(i: number): void {
    if (this.ctx.s.selected !== i) this.sfx.play('click');
    this.ctx.s.selected = i;
  }

  /* ============================================================ Warps */

  private checkWarp(): void {
    const w = this.map.warpAtPx(this.player.x, this.player.y - 2);
    if (!w) return;
    if (w.requires && !this.warpOpen(w)) {
      this.toastOnce(`closed:${w.to}`, w.requires === 'shopOpen' ? 'Geschlossen. Kramers Laden: Mo–Sa, 8:30–18:00 Uhr.' : 'Geschlossen. Der „Rostige Anker“ öffnet um 17:00 Uhr.');
      this.player.y += 4;
      this.warpLock = 0.4;
      return;
    }
    void this.warpTo(w);
  }

  private warpOpen(w: Warp): boolean {
    const s = this.ctx.s, m = s.time.minute;
    if (w.requires === 'shopOpen') return weekday(s.time.day) !== 6 && m >= 8 * 60 + 30 && m < 18 * 60;
    if (w.requires === 'barOpen') return m >= 17 * 60;
    return true;
  }

  private async warpTo(w: Warp): Promise<void> {
    this.transitioning = true;
    this.sfx.play('door');
    this.input.releaseAll();
    await this.ui.fade(() => this.switchMap(w.to, w.tx * TILE, w.ty * TILE, w.dir, true));
    this.transitioning = false;
  }

  switchMap(id: string, x: number, y: number, dir: Dir, emit: boolean): void {
    this.map = this.maps[id];
    this.player.x = x; this.player.y = y; this.player.dir = dir; this.player.moving = false;
    this.warpLock = 0.5;
    this.particles = [];
    this.syncPlayerToState();
    this.syncNpcs(true);
    this.spawnLife();
    this.ambient.reset();
    if (emit) this.ctx.bus.emit('enteredMap', { map: id });
  }

  /* ============================================================== NPCs */

  private syncNpcs(force: boolean): void {
    for (const n of this.npcs) n.sync(this.ctx.s, this.maps, this.map.def.id, force);
  }

  private updateNpcs(dt: number, _active: boolean): void {
    for (const n of this.npcs) if (n.map === this.map.def.id) n.update(dt);
    for (const a of this.animals) a.update(dt, this.player.x, this.player.y);
    for (const w of this.walkers) w.update(dt);
  }

  /** Tiere und Passanten für die aktuelle Karte erzeugen. */
  private spawnLife(): void {
    const night = darkness(this.ctx.s.time.minute) > 0.6;
    this.animals = [];
    for (const a of ANIMALS) {
      if (a.map !== this.map.def.id || (night && !a.night)) continue;
      for (let i = 0; i < a.count; i++) this.animals.push(new Animal(a.kind, a.zone, this.map, i, a.name));
    }
    this.walkers = [];
    this.populateWalkers();
  }

  /** Passantenzahl an die Tageszeit anpassen (nachts teils Kundschaft). */
  private populateWalkers(): void {
    const area = WALKERS.find((w) => w.map === this.map.def.id);
    if (!area) { this.walkers = []; return; }
    const h = this.ctx.s.time.minute / 60;
    const night = h >= 21 || h < 6;
    const target = night ? area.night : h >= 18 ? area.evening : area.day;
    while (this.walkers.length > target) this.walkers.pop();
    const s = this.ctx.s;
    while (this.walkers.length < target) {
      const w = new Walker(this.map, area.zones, night);
      const customerChance = (h >= 18 || h < 3) && s.flags.tutorialDone ? (s.flags.dexParty ? 0.55 : 0.35) : 0;
      if (Math.random() < customerChance) w.makeCustomer();
      this.walkers.push(w);
    }
  }

  private walkerNear(px: number, py: number, radius: number): Walker | undefined {
    let best: Walker | undefined, bd = radius;
    for (const w of this.walkers) { const d = Math.hypot(w.x - px, w.y - 6 - py); if (d < bd) { bd = d; best = w; } }
    return best;
  }

  private animalNear(px: number, py: number, radius: number): Animal | undefined {
    return this.animals.find((a) => a.visible && a.z === 0 && Math.hypot(a.x - px, a.y - 4 - py) < radius && (a.kind === 'cat' || a.kind === 'dog'));
  }

  private npcNear(px: number, py: number, radius: number): Npc | undefined {
    let best: Npc | undefined, bd = radius;
    for (const n of this.npcs) {
      if (n.map !== this.map.def.id) continue;
      const d = Math.hypot(n.x - px, n.y - 6 - py);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  /* ========================================================= Zielauswahl */

  private updateTarget(): void {
    const p = this.player;
    const ptx = Math.floor(p.x / TILE), pty = Math.floor((p.y - 2) / TILE);
    const m = this.input.mouse;
    if (m.x !== this.lastMouse.x || m.y !== this.lastMouse.y) { this.lastMouse = { x: m.x, y: m.y }; }
    const mouseActive = m.inside && performance.now() - this.lastMouseMove < 2500;
    if (mouseActive) {
      const w = this.renderer.screenToWorld(m.x, m.y);
      const mx = Math.floor(w.x / TILE), my = Math.floor(w.y / TILE);
      if (Math.max(Math.abs(mx - ptx), Math.abs(my - pty)) <= 1 && !(mx === ptx && my === pty)) {
        this.targetTile = { x: mx, y: my };
        this.showTarget = true;
        return;
      }
    }
    const d = dirVec(p.dir);
    this.targetTile = { x: ptx + d.x, y: pty + d.y };
    this.showTarget = this.isMeaningfulTarget(this.targetTile.x, this.targetTile.y);
  }

  private isMeaningfulTarget(x: number, y: number): boolean {
    const st = selectedStack(this.ctx.s);
    const mapId = this.map.def.id;
    if (machineAt(this.ctx.s, mapId, x, y) || soilAt(this.ctx.s, mapId, x, y)) return true;
    if (st && ITEMS[st.id].tool === 'hoe' && this.map.isFarmable(x, y)) return true;
    if (st && ITEMS[st.id].placeable && this.map.def.allowPlacing) return true;
    return !!this.map.interactableAt(x, y);
  }

  placementPreview(): { machine: string; ok: boolean } | null {
    const st = selectedStack(this.ctx.s);
    if (!st || !this.targetTile) return null;
    const mid = ITEMS[st.id].placeable;
    if (!mid || !this.map.def.allowPlacing) return null;
    return { machine: mid, ok: this.canPlaceAt(this.targetTile.x, this.targetTile.y) };
  }

  private canPlaceAt(x: number, y: number): boolean {
    const id = this.map.def.id;
    if (this.map.isSolid(x, y) || machineAt(this.ctx.s, id, x, y) || soilAt(this.ctx.s, id, x, y)) return false;
    if (this.map.warps.some((w) => x >= Math.floor(w.x) && x < w.x + w.w && y >= Math.floor(w.y) && y < w.y + w.h)) return false;
    const g = this.map.groundAt(x, y);
    return g !== 'water';
  }

  /* ========================================================== Aktionen */

  private handleActions(): void {
    const inp = this.input;
    let use = inp.wasPressed('use') || inp.mouseLeftPressed;
    let interact = inp.wasPressed('interact') || inp.mouseRightPressed;
    if (!use && !interact) return;
    if (this.player.action) return;
    const t = this.targetTile;
    if (!t) return;
    // Mausklick auf eine Person in der Nähe → ansprechen
    if (inp.mouseLeftPressed || inp.mouseRightPressed) {
      const w = this.renderer.screenToWorld(inp.mouse.x, inp.mouse.y);
      const npc = this.npcNear(w.x, w.y, 14);
      if (npc && Math.hypot(npc.x - this.player.x, npc.y - this.player.y) < 44) { this.talkTo(npc); return; }
      const ptx = Math.floor(this.player.x / TILE), pty = Math.floor((this.player.y - 2) / TILE);
      const mx = Math.floor(w.x / TILE), my = Math.floor(w.y / TILE);
      if (Math.max(Math.abs(mx - ptx), Math.abs(my - pty)) > 1) return; // zu weit weg
      this.faceTile(t.x, t.y);
    }
    if (interact) { this.interact(t.x, t.y); return; }
    if (use) {
      if (this.tryPriorityInteract(t.x, t.y)) return;
      if (this.useItem(t.x, t.y)) return;
      this.interact(t.x, t.y);
      use = false; interact = false;
    }
  }

  private faceTile(x: number, y: number): void {
    const p = this.player;
    const dx = x * TILE + 8 - p.x, dy = y * TILE + 8 - (p.y - 6);
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left'; else p.dir = dy > 0 ? 'down' : 'up';
  }

  /** Dinge, die immer Vorrang haben (Ernten, Maschinen, Personen). */
  private tryPriorityInteract(x: number, y: number): boolean {
    const front = this.frontPoint();
    const npc = this.npcNear(front.x, front.y, 16);
    if (npc) { this.talkTo(npc); return true; }
    const walker = this.walkerNear(front.x, front.y, 15);
    if (walker) { this.talkToWalker(walker); return true; }
    const animal = this.animalNear(front.x, front.y, 14);
    if (animal) { this.pet(animal); return true; }
    const spot = forageAt(this.ctx.s, this.map.def.id, x, y);
    if (spot) { this.pickUp(spot); return true; }
    const mc = machineAt(this.ctx.s, this.map.def.id, x, y);
    if (mc) { this.machineMenu(mc); return true; }
    const soil = soilAt(this.ctx.s, this.map.def.id, x, y);
    if (soil?.crop?.ready) { this.doHarvest(x, y); return true; }
    return false;
  }

  private frontPoint(): { x: number; y: number } {
    const d = dirVec(this.player.dir);
    return { x: this.player.x + d.x * 14, y: this.player.y - 6 + d.y * 14 };
  }

  private interact(x: number, y: number): void {
    if (this.tryPriorityInteract(x, y)) return;
    const it = this.map.interactableAt(x, y);
    if (it) this.runAction(it.action, it.text);
  }

  private useItem(x: number, y: number): boolean {
    const s = this.ctx.s;
    const st = selectedStack(s);
    if (!st) return false;
    const def = ITEMS[st.id];
    const mapId = this.map.def.id;
    if (def.tool === 'hoe') {
      if (!this.map.isFarmable(x, y)) { if (!this.map.interactableAt(x, y)) this.toastOnce('nofarm', 'Hier kann man nichts anbauen. Der Acker liegt nördlich deines Hauses.'); return !this.map.interactableAt(x, y); }
      if (soilAt(s, mapId, x, y) || machineAt(s, mapId, x, y)) return false;
      if (!this.spendEnergy(2)) return true;
      const r = till(this.ctx, mapId, x, y, true);
      if (r.ok) { this.swing(st.id, 0.28); this.sfx.play('till'); this.burst(x, y, [P.b3, P.b2, P.soil1], 8); }
      return true;
    }
    if (def.tool === 'can') {
      const it = this.map.interactableAt(x, y);
      if (this.map.groundAt(x, y) === 'water' || it?.action === 'well') { this.refill(st); return true; }
      const soil = soilAt(s, mapId, x, y);
      if (!soil) { this.toastOnce('nowater', 'Gießen kannst du nur umgegrabene Erde.'); return !it; }
      if (soil.watered) return true;
      if ((st.water ?? 0) <= 0) { this.toastOnce('empty', 'Die Gießkanne ist leer. Füll sie am Teich oder an der Regentonne auf.'); this.sfx.play('error'); return true; }
      if (!this.spendEnergy(1)) return true;
      if (water(this.ctx, mapId, x, y).ok) {
        st.water = (st.water ?? 0) - 1;
        this.swing(st.id, 0.32); this.sfx.play('water'); this.burst(x, y, [P.w3, P.w4, P.w2], 10, true);
      }
      return true;
    }
    if (def.category === 'seed') {
      const soil = soilAt(s, mapId, x, y);
      if (!soil) { this.toastOnce('noplant', 'Erst mit der Hacke umgraben.'); return !this.map.interactableAt(x, y); }
      const r = plant(this.ctx, mapId, x, y, st.id);
      if (r.ok) { this.sfx.play('plant'); this.burst(x, y, [P.g3, P.g4], 5); }
      else this.toastOnce('plant', r.msg);
      return true;
    }
    if (def.placeable) {
      if (!this.map.def.allowPlacing) { this.toastOnce('noplace', 'Maschinen kannst du nur auf deinem Hof aufstellen.'); return true; }
      if (!this.canPlaceAt(x, y)) { this.sfx.play('error'); return true; }
      if (placeMachine(this.ctx, mapId, x, y, def.placeable, st.id)) { this.sfx.play('till'); this.toast(`${def.name} aufgestellt.`, st.id); }
      return true;
    }
    if (def.category === 'food' && def.energy) {
      const p = s.player;
      if (p.energy >= p.maxEnergy) { this.toastOnce('full', 'Du bist gerade nicht hungrig.'); return true; }
      removeItem(s, st.id, 1);
      p.energy = Math.min(p.maxEnergy, p.energy + def.energy);
      this.sfx.play('eat');
      this.toast(`${def.name} gegessen. +${def.energy} Energie`, st.id);
      return true;
    }
    if (st.id === 'letter_uncle') { this.readLetter(); return true; }
    if (def.read) {
      this.ui.narrate(...def.read);
      if (def.readFlag) this.setFlag(def.readFlag);
      return true;
    }
    return false;
  }

  private refill(st: ItemStack): void {
    st.water = CAN_CAPACITY;
    this.sfx.play('water');
    this.toastOnce('refill', 'Gießkanne aufgefüllt.');
  }

  private spendEnergy(n: number): boolean {
    const p = this.ctx.s.player;
    if (p.energy < n) { this.toastOnce('tired', 'Du bist zu erschöpft. Iss etwas oder geh schlafen.'); this.sfx.play('error'); return false; }
    p.energy -= n;
    if (p.energy <= 15 && p.energy + n > 15) this.toast('Du wirst müde …');
    return true;
  }

  private swing(item: string, dur: number): void { this.player.action = { item, t: dur, dur }; }

  private doHarvest(x: number, y: number): void {
    const r = harvest(this.ctx, this.map.def.id, x, y);
    if (!r.ok) { this.toastOnce('harvest', r.msg); this.sfx.play('error'); return; }
    this.sfx.play('harvest');
    this.burst(x, y, [P.g4, P.g3, P.teal], 10);
    this.toast(`+${r.qty} ${ITEMS[r.item!].name}`, r.item);
  }

  /* ========================================================= Maschinen */

  private machineMenu(mc: NonNullable<ReturnType<typeof machineAt>>): void {
    const s = this.ctx.s;
    const def = MACHINES[mc.machine];
    const st = machineStatus(s, mc);
    const scr = this.renderer.worldToScreen(mc.x * TILE + 20, mc.y * TILE - 20);
    if (st.state === 'done') {
      const r = collect(this.ctx, mc);
      if (r.ok) {
        this.sfx.play('collect');
        this.burst(mc.x, mc.y, [P.y2, P.y1, P.white], 12);
        this.notified.delete(mc.uid);
      } else { this.toast(r.msg); this.sfx.play('error'); }
      return;
    }
    if (st.state === 'working') {
      const recipe = findRecipe(mc, mc.job!.recipe)!;
      this.ui.contextMenu(scr.x, scr.y, def.name, `${recipe.name} (${mc.job!.batches}×) – noch ${formatDuration(st.remaining)}`, []);
      return;
    }
    const opts: MenuOption[] = def.recipes.map((r) => {
      const n = possibleBatches(s, mc, r);
      const inp = r.inputs.map((i) => `${i.qty} ${ITEMS[i.item].name}`).join(' + ');
      return {
        label: n > 0 ? `${r.name} ×${n}` : r.name,
        hint: n > 0 ? `${formatDuration(r.minutes)} → ${n * r.output.qty} ${ITEMS[r.output.item].name}` : `braucht ${inp}`,
        disabled: n < 1, primary: n > 0,
        action: () => {
          const res = startJob(this.ctx, mc, r.id);
          if (res.ok) { this.sfx.play('plant'); this.toast(res.msg, r.output.item); } else this.toast(res.msg);
        },
      };
    });
    opts.push({ label: 'Abbauen', hint: 'zurück ins Inventar', action: () => this.pickUpMachine(mc) });
    this.ui.contextMenu(scr.x, scr.y, def.name, `Bis zu ${def.capacity} Chargen gleichzeitig.`, opts);
  }

  private pickUpMachine(mc: NonNullable<ReturnType<typeof machineAt>>): void {
    const itemId = Object.values(ITEMS).find((i) => i.placeable === mc.machine)?.id;
    if (!itemId) return;
    if (addItem(this.ctx, itemId, 1) > 0) { this.toast('Inventar voll!'); return; }
    const list = this.ctx.s.machines[this.map.def.id];
    list.splice(list.indexOf(mc), 1);
    this.toast(`${ITEMS[itemId].name} abgebaut.`, itemId);
  }

  private checkMachines(): void {
    const s = this.ctx.s;
    for (const [mapId, list] of Object.entries(s.machines)) for (const mc of list) {
      if (machineStatus(s, mc).state === 'done' && !this.notified.has(mc.uid)) {
        this.notified.add(mc.uid);
        const r = findRecipe(mc, mc.job!.recipe);
        if (r) this.toast(`${MACHINES[mc.machine].name}${mapId === this.map.def.id ? '' : ' (Hof)'}: ${ITEMS[r.output.item].name} fertig!`, r.output.item);
      }
    }
  }

  /* ============================================================ Gespräche */

  talkTo(npc: Npc): void {
    const s = this.ctx.s;
    const def = npc.def;
    // Zum Spieler drehen
    const dx = this.player.x - npc.x, dy = this.player.y - npc.y;
    npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    npc.faceTimer = 4;
    const rel = (s.npcs[def.id] ??= { friendship: 0, talkedDay: 0 });
    if (rel.talkedDay !== s.time.day) { rel.talkedDay = s.time.day; rel.friendship += 10; }
    const offer = this.quests.offerFor(def.id);
    if (offer) {
      this.sfx.play('click');
      this.ui.dialogue(def.id, offer.intro ?? [offer.summary], [
        { label: 'Mach ich', primary: true, action: () => this.quests.startLine(offer.id) },
        { label: 'Vielleicht später', action: () => undefined },
      ], () => this.ctx.bus.emit('talked', { npc: def.id }));
      return;
    }
    const group = def.dialogue.find((d) => !d.when || d.when(s))!;
    const lines = group.when ? group.lines : [group.lines[(s.time.day + rel.friendship / 10) % group.lines.length | 0]];
    const opts = [...this.questOptions(def.id), ...this.servicesFor(def, npc)];
    this.sfx.play('click');
    this.ui.dialogue(def.id, lines, opts, () => this.ctx.bus.emit('talked', { npc: def.id }));
  }

  private servicesFor(def: NpcDef, npc: Npc): MenuOption[] {
    const s = this.ctx.s;
    if (def.servicesFlag && !s.flags[def.servicesFlag]) return [];
    if (!def.services || (def.workMap && npc.map !== def.workMap)) return [];
    const opts: MenuOption[] = [];
    let shopId: string | undefined, channelId: string | undefined;
    for (const sv of def.services) {
      const [kind, id] = sv.split(':');
      if (kind === 'orders') {
        for (const o of s.orders.filter((x) => x.channel === id)) {
          const have = countItem(s, o.item);
          opts.push({
            label: `Auftrag abgeben: ${o.qty}× ${ITEMS[o.item].name}`, hint: have >= o.qty ? `+${o.reward} $` : `du hast ${have}/${o.qty}`,
            disabled: have < o.qty, primary: have >= o.qty,
            action: () => this.deliver(o.id),
          });
        }
      }
      if (kind === 'shop') shopId = id;
      if (kind === 'sell') channelId = id;
    }
    if (shopId || channelId) {
      opts.push({ label: channelId && shopId ? 'Handeln' : channelId ? 'Verkaufen' : 'Einkaufen', action: () => this.ui.openShop(shopId ? SHOPS[shopId].name : CHANNELS[channelId!].name, shopId, channelId) });
    }
    opts.push({ label: 'Tschüss', action: () => undefined });
    return opts;
  }

  private questOptions(npcId: string): MenuOption[] {
    return this.quests.npcOptions(npcId).map((o) => {
      const check = this.checkQuestAction(o.action);
      return { label: o.label, hint: check.hint, disabled: !check.ok, primary: check.ok, action: () => this.runQuestAction(o.action) };
    });
  }

  private parseQuestAction(action: string): { kind: string; item?: string; qty: number; flag: string } {
    const [kind, a, b, c] = action.split(':');
    if (kind === 'pay') return { kind, qty: a === 'debt' ? (this.ctx.s.vars.debt ?? 2000) : Number(a), flag: b };
    return { kind, item: a, qty: Number(b), flag: c };
  }

  private checkQuestAction(action: string): { ok: boolean; hint: string } {
    const q = this.parseQuestAction(action);
    if (q.kind === 'pay') return { ok: this.ctx.s.money >= q.qty, hint: `${q.qty.toLocaleString('de-DE')} $` };
    const have = countItem(this.ctx.s, q.item!);
    return { ok: have >= q.qty, hint: `du hast ${have}/${q.qty}` };
  }

  private runQuestAction(action: string): void {
    const q = this.parseQuestAction(action);
    if (!this.checkQuestAction(action).ok) { this.sfx.play('error'); this.toast(q.kind === 'pay' ? 'Nicht genug Geld.' : 'Dir fehlt noch etwas.'); return; }
    if (q.kind === 'pay') addMoney(this.ctx, -q.qty);
    else removeItem(this.ctx.s, q.item!, q.qty);
    this.sfx.play('coin');
    this.setFlag(q.flag);
  }

  setFlag(flag: string): void {
    if (this.ctx.s.flags[flag]) return;
    this.ctx.s.flags[flag] = true;
    this.ctx.bus.emit('flagSet', { flag });
  }

  private talkToWalker(w: Walker): void {
    const dx = this.player.x - w.x, dy = this.player.y - w.y;
    w.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    w.faceTimer = 4;
    const s = this.ctx.s;
    const opts: MenuOption[] = [];
    if (w.customer && !w.served) {
      for (const b of CHANNELS.strasse.buys) {
        const have = countItem(s, b.item);
        if (have <= 0) continue;
        const n = Math.min(have, 1 + Math.floor(Math.random() * 2));
        const total = quote(s, 'strasse', b.item, n);
        opts.push({ label: `${n}× ${ITEMS[b.item].name}`, hint: `${total} $`, primary: true, action: () => { this.sell('strasse', b.item, n); w.served = true; w.line = 'Danke. Man sieht sich.'; } });
      }
      opts.push({ label: opts.length ? 'Nichts für dich' : 'Hab nichts dabei', action: () => undefined });
    }
    this.sfx.play('click');
    this.ui.dialogue('', [w.customer && !w.served && opts.length > 1 ? `${w.line} (Straßenpreis heute: ~${unitPrice(s, 'strasse', 'cannabis')} $ für Cannabis)` : w.line], opts, undefined, { name: w.name, title: w.customer ? 'Kundschaft' : 'Passant', look: w.look, id: w.spriteId });
  }

  private pet(a: Animal): void {
    a.hearts = 1.5;
    a.state = 'idle'; a.timer = 2;
    this.sfx.play('eat');
    this.ctx.bus.emit('petted', { animal: a.kind });
    const name = a.name ?? (a.kind === 'cat' ? 'Die Katze' : 'Der Hund');
    this.toastOnce(`pet:${a.kind}`, a.kind === 'cat' ? `${name} schnurrt zufrieden.` : `${name} wedelt mit dem Schwanz.`);
  }

  private pickUp(spot: NonNullable<ReturnType<typeof forageAt>>): void {
    const r = pickForage(this.ctx, this.map.def.id, spot);
    if (!r.ok) { this.toast(r.msg); this.sfx.play('error'); return; }
    this.sfx.play('harvest');
    this.burst(spot.x, spot.y, [P.g4, P.y2, P.white], 8);
    for (const [item, q] of r.got) this.toast(`+${q} ${ITEMS[item].name}`, item);
  }

  sell(channel: string, item: string, qty: number): void {
    const r = sell(this.ctx, channel, item, qty);
    if (r.ok) { this.sfx.play('coin'); this.toast(r.msg, item); } else { this.sfx.play('error'); this.toast(r.msg); }
  }

  buy(shop: string, item: string, qty: number): void {
    const r = buy(this.ctx, shop, item, qty);
    if (r.ok) { this.sfx.play('coin'); this.toast(r.msg, item); } else { this.sfx.play('error'); this.toast(r.msg); }
  }

  deliver(orderId: string): void {
    const r = deliverOrder(this.ctx, orderId);
    if (r.ok) { this.sfx.play('coin'); this.toast(r.msg, 'coin'); } else { this.sfx.play('error'); this.toast(r.msg); }
  }

  /* ========================================================== Objekte */

  private runAction(action: string, text?: string): void {
    const [kind, arg] = action.split(':');
    switch (kind) {
      case 'text': this.ui.narrate(text ?? ''); break;
      case 'bed': this.ui.confirm('Schlafen gehen und den Tag beenden?', 'Schlafen', () => void this.sleep(false)); break;
      case 'mailbox': this.ui.narrate('Der Briefkasten ist leer. Rechnungen kommen erst, wenn du Immobilien besitzt.'); break;
      case 'well': {
        const can = this.ctx.s.inventory.find((st) => st?.id === 'watering_can');
        if (can) this.refill(can); else this.ui.narrate('Eine Regentonne voller Wasser.');
        break;
      }
      case 'laptop': this.ui.narrate('Theos alter Laptop. Ein Lesezeichen führt zu einem Darknet-Marktplatz – aber ohne Zugangsdaten kommst du nicht rein. (Darknet folgt im nächsten Update.) Auf einem Zettel steht: „GHOST?“'); break;
      case 'chest': {
        const s = this.ctx.s;
        if (s.flags.chestUnlocked && !s.flags.chestLooted) {
          addItem(this.ctx, 'theo_notizbuch', 1);
          addMoney(this.ctx, 400);
          this.sfx.play('collect');
          this.ui.narrate('Du tastest den Boden der Kiste ab … ein doppelter Boden! Darunter: ein Bündel Geldscheine (400 $) und ein abgegriffenes Notizbuch.');
          this.toast('+1 Theos Notizbuch', 'theo_notizbuch');
          this.setFlag('chestLooted');
        } else if (s.flags.chestLooted) this.ui.narrate('Der doppelte Boden ist leer. Theo hat nichts mehr übrig gelassen.');
        else this.ui.narrate('Theos alte Kiste. Ein paar Pullover, ein kaputter Wecker. Irgendwas stimmt mit dem Boden nicht – er klingt hohl.');
        break;
      }
      case 'kushMother': {
        const s = this.ctx.s;
        if (!s.flags.kushFound && s.flags.readNotebook) {
          addItem(this.ctx, 'seed_kush', 4);
          this.sfx.play('quest');
          this.ui.narrate('Da ist sie: Theos Kush-Mutterpflanze, violett schimmernd im Licht der Lichtung. Du schneidest vier Stecklinge.', 'Ab jetzt kannst du hier jeden Tag einen Steckling schneiden.');
          this.toast('+4 Greenfield-Kush-Steckling', 'seed_kush');
          this.setFlag('kushFound');
        } else if (s.flags.kushFound) {
          const key = 'kushMother';
          if (s.searched[key] === s.time.day) { this.ui.narrate('Die Pflanze braucht Ruhe. Morgen kannst du wieder einen Steckling schneiden.'); break; }
          s.searched[key] = s.time.day;
          addItem(this.ctx, 'seed_kush', 1);
          this.sfx.play('plant');
          this.toast('+1 Greenfield-Kush-Steckling', 'seed_kush');
        } else this.ui.narrate('Eine kräftige Pflanze mit violetten Blüten. Jemand hat sich lange um sie gekümmert … aber wer?');
        break;
      }
      case 'trash': {
        const r = searchTrash(this.ctx, action);
        if (!r.ok) { this.toastOnce('trash', r.msg); break; }
        this.sfx.play(r.item || r.money ? 'collect' : 'click');
        this.toast(r.item ? `${r.msg} +${r.qty} ${ITEMS[r.item].name}` : r.msg, r.item ?? (r.money ? 'coin' : undefined));
        break;
      }
      case 'jukebox': this.sfx.play('quest'); this.ui.narrate('Die Jukebox spielt einen kratzigen Song über verlorene Nächte.'); break;
      case 'bus': this.ui.narrate('Bus nach Downtown, Southside & Industrial District – „Fahrbetrieb vorübergehend eingestellt“. (Neue Stadtviertel folgen in Phase 3.)'); break;
      case 'shop': {
        const npc = this.npcs.find((n) => n.def.id === arg && n.map === this.map.def.id);
        if (npc) this.talkTo(npc); else this.ui.narrate('Niemand hinter der Theke.');
        break;
      }
    }
  }

  private readLetter(): void {
    this.ui.narrate(
      'Mein Junge, wenn du das liest, gehört das Grundstück dir. Ich war kein Heiliger – das weißt du.',
      'Hinter dem Zaun ist die beste Erde der Stadt. Rico weiß, was zu tun ist. Vertrau ihm, aber nicht blind.',
      'Fang klein an. Bleib unauffällig. Und wenn du groß wirst: Vergiss nicht, wer dir geholfen hat. – Onkel Theo',
    );
  }

  /* ============================================================ Schlafen */

  private async sleep(passedOut: boolean): Promise<void> {
    if (this.transitioning) return;
    this.transitioning = true;
    let summary!: ReturnType<typeof endDay>;
    await this.ui.fade(() => {
      summary = endDay(this.ctx, passedOut, OUTDOOR);
      this.spawnDaily();
      this.switchMap('home', 2.6 * TILE, 4.4 * TILE, 'down', false);
      this.timeAcc = 0;
      this.notified.clear();
      for (const m of Object.values(this.ctx.s.machines).flat()) if (machineStatus(this.ctx.s, m).state === 'done') this.notified.add(m.uid);
    });
    const saved = saveGame(browserStorage, this.ctx.s);
    this.transitioning = false;
    this.ui.daySummary(summary, saved, () => {
      if (this.ctx.s.weather === 'rain') this.toast('Es regnet – deine Pflanzen sind heute schon gegossen.');
      const newOrders = this.ctx.s.orders.filter((o) => !o.tutorial && o.id.startsWith(`o${this.ctx.s.time.day}_`));
      if (newOrders.length) this.toast('Rico hat einen neuen Auftrag für dich (H).', newOrders[0].item);
    });
  }

  private passOut(): void {
    this.toast('Es ist 2 Uhr nachts … dir wird schwarz vor Augen.');
    void this.sleep(true);
  }

  /* ========================================================= Questmarker */

  /** Weltposition, auf die der Questpfeil zeigt (auf der aktuellen Karte). */
  questPoint(): { x: number; y: number } | null {
    const tg = this.quests.target();
    if (!tg) return null;
    let mapId: string, x: number, y: number;
    if ('npc' in tg) {
      const n = this.npcs.find((nn) => nn.def.id === tg.npc);
      if (!n || !n.map) return null;
      mapId = n.map; x = n.x; y = n.y - 20;
    } else { mapId = tg.map; x = tg.x * TILE + 8; y = tg.y * TILE + 8; }
    if (mapId === this.map.def.id) return { x, y };
    const w = this.nextWarpToward(mapId);
    return w ? { x: (w.x + w.w / 2) * TILE, y: (w.y + w.h / 2) * TILE } : null;
  }

  private nextWarpToward(target: string): Warp | null {
    const start = this.map.def.id;
    const prev = new Map<string, { from: string; warp: Warp }>();
    const q = [start];
    const seen = new Set([start]);
    while (q.length) {
      const cur = q.shift()!;
      if (cur === target) break;
      for (const w of this.maps[cur].warps) {
        if (seen.has(w.to)) continue;
        seen.add(w.to); prev.set(w.to, { from: cur, warp: w }); q.push(w.to);
      }
    }
    if (!prev.has(target)) return null;
    let node = target;
    let step = prev.get(node)!;
    while (step.from !== start) { node = step.from; step = prev.get(node)!; }
    return step.warp;
  }

  /* ============================================================ Hinweise */

  private updateHint(): void {
    const t = this.targetTile;
    if (!t) { this.ui.setHint(''); return; }
    const s = this.ctx.s, mapId = this.map.def.id;
    const K = (k: string) => `<span class="key">${k}</span>`;
    const front = this.frontPoint();
    const npc = this.npcNear(front.x, front.y, 16);
    if (npc) { this.ui.setHint(`${K('E')} Mit ${npc.def.name} sprechen`); return; }
    const walker = this.walkerNear(front.x, front.y, 15);
    if (walker) { this.ui.setHint(`${K('E')} ${walker.customer && !walker.served ? 'Kundschaft ansprechen' : `Mit ${walker.name} reden`}`); return; }
    const animal = this.animalNear(front.x, front.y, 14);
    if (animal) { this.ui.setHint(`${K('E')} ${animal.name ?? (animal.kind === 'cat' ? 'Katze' : 'Hund')} streicheln`); return; }
    const spot = forageAt(this.ctx.s, this.map.def.id, t.x, t.y);
    if (spot) { this.ui.setHint(`${K('E')} ${FORAGE[spot.id].name} aufheben`); return; }
    const mc = machineAt(s, mapId, t.x, t.y);
    if (mc) {
      const st = machineStatus(s, mc);
      this.ui.setHint(st.state === 'done' ? `${K('E')} Ware entnehmen` : st.state === 'working' ? `${MACHINES[mc.machine].name} arbeitet … noch ${formatDuration(st.remaining)}` : `${K('E')} ${MACHINES[mc.machine].name} benutzen`);
      return;
    }
    const soil = soilAt(s, mapId, t.x, t.y);
    const st = selectedStack(s);
    const def = st ? ITEMS[st.id] : undefined;
    if (soil?.crop?.ready) { this.ui.setHint(`${K('E')} ${CROPS[soil.crop.id].name} ernten`); return; }
    if (def?.tool === 'hoe' && this.map.isFarmable(t.x, t.y) && !soil) { this.ui.setHint(`${K('Leertaste')} Umgraben`); return; }
    if (def?.tool === 'can' && soil && !soil.watered) { this.ui.setHint(`${K('Leertaste')} Gießen (${st!.water ?? 0}/${CAN_CAPACITY})`); return; }
    if (def?.tool === 'can' && (this.map.groundAt(t.x, t.y) === 'water' || this.map.interactableAt(t.x, t.y)?.action === 'well')) { this.ui.setHint(`${K('Leertaste')} Gießkanne füllen`); return; }
    if (def?.category === 'seed' && soil && !soil.crop) { this.ui.setHint(`${K('Leertaste')} ${def.name} pflanzen`); return; }
    if (soil?.crop) {
      const cd = CROPS[soil.crop.id];
      this.ui.setHint(`${cd.name} · ${soil.watered ? 'gegossen' : 'durstig'} · reif in ${Math.max(1, cd.growDays - soil.crop.growth)} Tag(en)`);
      return;
    }
    if (def?.placeable && this.map.def.allowPlacing) { this.ui.setHint(`${K('Leertaste')} ${def.name} aufstellen`); return; }
    if (def?.category === 'food') { this.ui.setHint(`${K('Leertaste')} ${def.name} essen`); return; }
    const it = this.map.interactableAt(t.x, t.y);
    if (it) { this.ui.setHint(`${K('E')} ${it.label}`); return; }
    this.ui.setHint('');
  }

  /* ============================================================= Effekte */

  toast(text: string, icon?: string): void { this.ui.toast(text, icon); }

  private toastOnce(key: string, text: string): void {
    const now = performance.now();
    if ((this.toastCooldown.get(key) ?? 0) > now) return;
    this.toastCooldown.set(key, now + 2500);
    this.toast(text);
  }

  private burst(tx: number, ty: number, colors: string[], n: number, drip = false): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: tx * TILE + 4 + Math.random() * 8, y: ty * TILE + 6 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 50, vy: drip ? 10 + Math.random() * 20 : -30 - Math.random() * 40,
        life: 0.35 + Math.random() * 0.3, color: colors[i % colors.length], size: 1 + (Math.random() < 0.3 ? 1 : 0), grav: drip ? 60 : 160,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
}
