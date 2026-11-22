import { P } from '../../art/palette';
import type { MapDef, MapObjectDef } from '../../world/mapdef';

const trees: MapObjectDef[] = [];
// Waldrand oben
for (let x = 0; x < 40; x += 3) trees.push({ kind: 'tree', x: x + (x % 2), y: 1 + ((x * 7) % 2), variant: x % 9 === 0 ? 'pine' : 'oak' });
// Waldrand links
for (let y = 4; y < 28; y += 3) trees.push({ kind: 'tree', x: 0 + (y % 2), y, variant: y % 2 ? 'pine' : 'oak' });
// Waldrand unten
for (let x = 2; x < 40; x += 3) trees.push({ kind: 'tree', x, y: 28 + (x % 2), variant: x % 4 === 0 ? 'birch' : 'oak' });
// Rechts (Lücke für den Weg)
for (const y of [4, 7, 10, 18, 21, 24]) trees.push({ kind: 'tree', x: 38 + (y % 2), y, variant: 'pine' });

export const FARM: MapDef = {
  id: 'farm',
  name: 'Theos Grundstück',
  width: 40,
  height: 30,
  base: 'grass',
  outdoor: true,
  allowPlacing: true,
  fills: [
    { t: 'grassDark', x: 0, y: 0, w: 40, h: 3 },
    { t: 'grassDark', x: 0, y: 27, w: 40, h: 3 },
    { t: 'farm', x: 14, y: 5, w: 10, h: 6 },
    { t: 'dirt', x: 6, y: 9, w: 2, h: 4 },
    { t: 'dirt', x: 6, y: 13, w: 34, h: 2 },
    { t: 'dirt', x: 12, y: 11, w: 2, h: 2 },
    { t: 'sand', x: 2, y: 18, w: 8, h: 7 },
    { t: 'water', x: 3, y: 19, w: 6, h: 5 },
  ],
  farmable: [{ x: 14, y: 5, w: 10, h: 6 }],
  objects: [
    ...trees,
    {
      kind: 'building', x: 4, y: 8, name: 'Dein Haus',
      spec: { widthTiles: 5, wallH: 34, roofH: 30, wall: P.b4, wallShade: P.b3, wallStyle: 'planks', roof: P.r2, roofShade: P.r1, door: 2, windows: [0, 4], chimney: true },
      door: { to: 'home', tx: 5.5, ty: 8, dir: 'up' },
    },
    {
      kind: 'building', x: 29, y: 9, name: 'Alte Scheune',
      spec: { widthTiles: 6, wallH: 40, roofH: 32, wall: P.r1, wallShade: P.r0, wallStyle: 'planks', roof: P.s2, roofShade: P.s1, door: 2, doorColor: P.b3, windows: [5] },
      lockedText: 'Die alte Scheune. Mit genug Geld wird daraus ein Growroom – Immobilien-Ausbau folgt im nächsten Update.',
    },
    { kind: 'mailbox', x: 9, y: 10, action: 'mailbox' },
    { kind: 'barrel', x: 12, y: 10, action: 'well' },
    { kind: 'sign', x: 36, y: 12, text: '→ Greenfield (Stadt)' },
    { kind: 'sign', x: 13, y: 4, text: 'PRIVATGRUNDSTÜCK – Betreten verboten. Hunde? Vielleicht.', color: P.b3 },
    { kind: 'fence', x: 14, y: 4, len: 10 },
    { kind: 'crate', x: 27, y: 11 }, { kind: 'crate', x: 28, y: 11 }, { kind: 'barrel', x: 35, y: 9 },
    { kind: 'bush', x: 3, y: 10 }, { kind: 'bush', x: 11, y: 5 }, { kind: 'berrybush', x: 26, y: 16 },
    { kind: 'bush', x: 20, y: 17 }, { kind: 'bush', x: 33, y: 19 }, { kind: 'berrybush', x: 12, y: 22 },
    { kind: 'rock', x: 16, y: 20 }, { kind: 'rock', x: 30, y: 23 }, { kind: 'rock', x: 24, y: 25 },
    { kind: 'tree', x: 18, y: 21, variant: 'oak' }, { kind: 'tree', x: 28, y: 20, variant: 'birch' },
    { kind: 'tree', x: 34, y: 24, variant: 'oak' }, { kind: 'tree', x: 13, y: 25, variant: 'pine' },
    { kind: 'flowers', x: 10, y: 11 }, { kind: 'flowers', x: 4, y: 12 }, { kind: 'flowers', x: 22, y: 19 },
    { kind: 'flowers', x: 31, y: 17 }, { kind: 'flowers', x: 9, y: 17 }, { kind: 'flowers', x: 26, y: 22 },
    { kind: 'tallgrass', x: 15, y: 16 }, { kind: 'tallgrass', x: 16, y: 16 }, { kind: 'tallgrass', x: 23, y: 23 },
    { kind: 'tallgrass', x: 36, y: 17 }, { kind: 'tallgrass', x: 6, y: 16 }, { kind: 'tallgrass', x: 32, y: 6 },
  ],
  warps: [{ x: 39, y: 12, w: 1, h: 4, to: 'town', tx: 1.5, ty: 16, dir: 'right' }],
  lights: [
    { x: 4 * 16 + 11, y: 7 * 16 + 4, r: 28, color: 'rgba(255,210,120,0.55)', night: true },
    { x: 8 * 16 + 11, y: 7 * 16 + 4, r: 28, color: 'rgba(255,210,120,0.55)', night: true },
  ],
};
