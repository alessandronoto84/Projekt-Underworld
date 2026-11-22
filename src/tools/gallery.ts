/** Entwickler-Werkzeug: zeigt alle prozeduralen Sprites vergrößert (tools/sprites.html). */
import { cropSprite, itemIcon, machineSprite, characterFrame } from '../art/atlas';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { MACHINES } from '../data/machines';
import { NPCS } from '../data/npcs';
import { drawDumpster } from '../art/objects';

const root = document.getElementById('root')!;
const SCALE = Number(new URLSearchParams(location.search).get('scale') ?? 4);

function section(title: string): HTMLElement {
  const h = document.createElement('h2'); h.textContent = title;
  const row = document.createElement('div'); row.className = 'row';
  root.append(h, row);
  return row;
}

function show(row: HTMLElement, src: HTMLCanvasElement, label: string, dark = false, bg?: string): void {
  const fig = document.createElement('figure');
  if (dark) fig.className = 'dark';
  if (bg) fig.style.background = bg;
  const c = document.createElement('canvas');
  c.width = src.width * SCALE; c.height = src.height * SCALE;
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const cap = document.createElement('figcaption'); cap.textContent = label;
  fig.append(c, cap); row.append(fig);
}

const crops = section('Pflanzen (Stufe 0 … reif)');
for (const c of Object.values(CROPS)) for (let st = 0; st <= c.stages; st++) show(crops, cropSprite(c.id, st), `${c.name} ${st}`, false, '#5e3a2a');

const items = section('Gegenstände');
for (const it of Object.values(ITEMS)) show(items, itemIcon(it.id), it.name, true);

const machines = section('Anlagen (leer / läuft / fertig)');
for (const m of Object.values(MACHINES)) for (const st of ['idle', 'working', 'done'] as const) show(machines, machineSprite(m.id, st), `${m.name} ${st}`);
show(machines, drawDumpster(), 'Container');

const people = section('Figuren');
for (const n of Object.values(NPCS)) show(people, characterFrame(n.id, n.look, 'down', 0), n.name, true);
