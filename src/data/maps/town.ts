import { P } from '../../art/palette';
import type { LightDef, MapDef, MapObjectDef } from '../../world/mapdef';

const lamps: MapObjectDef[] = [];
const lights: LightDef[] = [];
for (const x of [3, 10, 17, 30, 37, 44]) {
  for (const y of [13, 19]) {
    lamps.push({ kind: 'lamp', x, y });
    lights.push({ x: x * 16 + 8, y: y * 16 - 14, r: 46, color: 'rgba(255,214,130,0.5)', night: true });
  }
}
for (const y of [4, 9, 24, 29]) {
  lamps.push({ kind: 'lamp', x: 20, y });
  lights.push({ x: 20 * 16 + 8, y: y * 16 - 14, r: 46, color: 'rgba(255,214,130,0.5)', night: true });
}

const parkTrees: MapObjectDef[] = [
  { kind: 'tree', x: 2, y: 22, variant: 'oak' }, { kind: 'tree', x: 15, y: 22, variant: 'birch' },
  { kind: 'tree', x: 3, y: 29, variant: 'oak' }, { kind: 'tree', x: 16, y: 30, variant: 'oak' },
  { kind: 'tree', x: 9, y: 32, variant: 'pine' }, { kind: 'tree', x: 1, y: 26, variant: 'birch' },
  { kind: 'tree', x: 46, y: 2, variant: 'pine' }, { kind: 'tree', x: 1, y: 2, variant: 'oak' },
  { kind: 'tree', x: 46, y: 26, variant: 'oak' }, { kind: 'tree', x: 38, y: 24, variant: 'birch' },
];

export const TOWN: MapDef = {
  id: 'town',
  name: 'Greenfield – Old Town',
  width: 48,
  height: 34,
  base: 'grass',
  outdoor: true,
  fills: [
    { t: 'pavement', x: 0, y: 13, w: 48, h: 2 },
    { t: 'pavement', x: 0, y: 18, w: 48, h: 2 },
    { t: 'asphalt', x: 0, y: 15, w: 48, h: 3 },
    { t: 'pavement', x: 20, y: 0, w: 2, h: 34 },
    { t: 'pavement', x: 25, y: 0, w: 2, h: 34 },
    { t: 'asphalt', x: 22, y: 0, w: 3, h: 34 },
    { t: 'grassDark', x: 0, y: 20, w: 20, h: 14 },
    { t: 'dirt', x: 4, y: 24, w: 12, h: 1 },
    { t: 'dirt', x: 9, y: 20, w: 1, h: 10 },
    { t: 'cobble', x: 7, y: 21, w: 5, h: 5 },
    { t: 'water', x: 8, y: 22, w: 3, h: 3 },
    { t: 'cobble', x: 27, y: 20, w: 21, h: 2 },
    { t: 'cobble', x: 36, y: 0, w: 3, h: 13 },
    { t: 'cobble', x: 27, y: 32, w: 21, h: 2 },
  ],
  objects: [
    ...lamps,
    ...parkTrees,
    {
      kind: 'building', x: 3, y: 12, name: 'Kramers Laden',
      spec: { widthTiles: 6, wallH: 38, roofH: 28, wall: P.r2, wallShade: P.r1, wallStyle: 'brick', roof: P.g1, roofShade: P.g0, door: 2, doorColor: P.g2, windows: [0, 4, 5], awning: P.g2, signColor: P.g1 },
      door: { to: 'shop', tx: 5.5, ty: 8, dir: 'up', requires: 'shopOpen' },
    },
    {
      kind: 'building', x: 10, y: 12, name: 'Wohnhaus', lockedText: 'Hier wohnt jemand. Die Tür ist abgeschlossen.',
      spec: { widthTiles: 5, wallH: 32, roofH: 30, wall: P.cream, wallShade: P.sand0, wallStyle: 'stucco', roof: P.w1, roofShade: P.w0, door: 1, doorColor: P.r1, windows: [3] },
    },
    {
      kind: 'building', x: 29, y: 12, name: 'Zum Rostigen Anker',
      spec: { widthTiles: 7, wallH: 38, roofH: 26, wall: P.b2, wallShade: P.b1, wallStyle: 'planks', roof: P.s1, roofShade: P.s0, roofStyle: 'flat', door: 3, doorColor: P.b1, windows: [1, 5], neon: P.pink },
      door: { to: 'bar', tx: 6.5, ty: 8, dir: 'up', requires: 'barOpen' },
    },
    {
      kind: 'building', x: 40, y: 12, name: 'Wohnhaus', lockedText: 'Ein Schild: „Kein Zutritt. Ich hab einen Hund.“ Es ist kein Hund zu sehen.',
      spec: { widthTiles: 5, wallH: 32, roofH: 28, wall: P.v1, wallShade: P.v0, wallStyle: 'planks', roof: P.r1, roofShade: P.r0, door: 2, doorColor: P.b2, windows: [0, 4] },
    },
    {
      kind: 'building', x: 29, y: 31, name: 'Polizeirevier',
      spec: { widthTiles: 7, wallH: 36, roofH: 18, wall: P.s3, wallShade: P.s2, wallStyle: 'stucco', roof: P.w1, roofShade: P.w0, roofStyle: 'flat', door: 3, doorColor: P.w1, windows: [0, 1, 5, 6], signColor: P.w1 },
      lockedText: 'Polizeirevier Greenfield. Du hast hier nichts verloren … noch nicht.',
    },
    {
      kind: 'building', x: 40, y: 31, name: 'Wohnhaus', lockedText: 'Abgeschlossen. Drinnen läuft ein Fernseher.',
      spec: { widthTiles: 5, wallH: 32, roofH: 30, wall: P.sand1, wallShade: P.sand0, wallStyle: 'brick', roof: P.g2, roofShade: P.g1, door: 3, doorColor: P.v1, windows: [0, 1] },
    },
    {
      kind: 'building', x: 15, y: 6, name: 'Lagerschuppen', lockedText: 'Ein verrammelter Schuppen. Vielleicht kann man ihn später kaufen.',
      spec: { widthTiles: 4, wallH: 26, roofH: 18, wall: P.s2, wallShade: P.s1, wallStyle: 'metal', roof: P.s1, roofShade: P.s0, roofStyle: 'flat', door: 1, doorColor: P.s1 },
    },
    { kind: 'sign', x: 18, y: 12, text: 'Greenfield – Gegründet 1952. Einwohner: 3.104', color: P.g2 },
    { kind: 'sign', x: 27, y: 2, text: 'Downtown ↑  (Stadtviertel folgt in Phase 3)', color: P.w1 },
    { kind: 'sign', x: 27, y: 31, text: 'Southside ↓  (Stadtviertel folgt in Phase 3)', color: P.r1 },
    { kind: 'busstop', x: 46, y: 13, action: 'bus' },
    { kind: 'dumpster', x: 17, y: 24 },
    { kind: 'bench', x: 5, y: 26 }, { kind: 'bench', x: 12, y: 27 }, { kind: 'bench', x: 41, y: 19 },
    { kind: 'trash', x: 19, y: 13 }, { kind: 'trash', x: 28, y: 19 }, { kind: 'trash', x: 38, y: 12 },
    { kind: 'barrel', x: 38, y: 9 }, { kind: 'crate', x: 36, y: 8 }, { kind: 'crate', x: 36, y: 9 },
    { kind: 'car', x: 33, y: 21, color: P.w1 }, { kind: 'car', x: 12, y: 17, color: P.r2 }, { kind: 'car', x: 41, y: 15, color: P.y1 },
    { kind: 'flowers', x: 6, y: 21 }, { kind: 'flowers', x: 13, y: 21 }, { kind: 'flowers', x: 6, y: 28 },
    { kind: 'flowers', x: 14, y: 26 }, { kind: 'bush', x: 2, y: 20 }, { kind: 'bush', x: 17, y: 20 },
    { kind: 'bush', x: 28, y: 23 }, { kind: 'bush', x: 46, y: 23 }, { kind: 'bush', x: 15, y: 11 },
    { kind: 'tallgrass', x: 4, y: 31 }, { kind: 'tallgrass', x: 13, y: 31 },
  ],
  warps: [{ x: 0, y: 14, w: 1, h: 5, to: 'farm', tx: 38, ty: 13.5, dir: 'left' }],
  roadLines: [{ x: 0, y: 16, len: 22 }, { x: 25, y: 16, len: 23 }, { x: 23, y: 0, len: 15, vertical: true }, { x: 23, y: 18, len: 16, vertical: true }],
  lights: [
    ...lights,
    { x: 32 * 16 + 8, y: 9 * 16, r: 60, color: 'rgba(255,95,168,0.45)', night: true },
    { x: 6 * 16, y: 10 * 16, r: 40, color: 'rgba(255,214,130,0.4)', night: true },
    { x: 18 * 16, y: 22 * 16, r: 36, color: 'rgba(192,122,224,0.35)', night: true },
    { x: 32 * 16, y: 29 * 16, r: 50, color: 'rgba(95,163,214,0.4)', night: true },
  ],
};
