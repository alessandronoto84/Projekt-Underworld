import { P } from '../../art/palette';
import { hash2 } from '../../core/rng';
import type { Rect } from '../../core/types';
import type { MapDef, MapObjectDef } from '../../world/mapdef';

const W = 40, H = 30;

/** Freizuhaltende Flächen (Wege, Lichtungen, Wasser) – dort wachsen keine Bäume. */
const CLEAR: Rect[] = [
  { x: 19, y: 0, w: 4, h: 13 },   // Eingangsweg
  { x: 6, y: 10, w: 15, h: 3 },   // Weg West
  { x: 21, y: 13, w: 7, h: 3 },   // Weg Ost
  { x: 4, y: 8, w: 9, h: 9 },     // Lichtung West
  { x: 26, y: 13, w: 10, h: 10 }, // Lichtung mit Hochsitz
  { x: 12, y: 16, w: 5, h: 14 },  // Bach
  { x: 2, y: 19, w: 10, h: 9 },   // Teich
];
const inClear = (x: number, y: number) => CLEAR.some((r) => x >= r.x - 1 && x < r.x + r.w + 1 && y >= r.y - 1 && y < r.y + r.h + 1);

const trees: MapObjectDef[] = [];
for (let y = 1; y < H; y += 2) for (let x = (y % 4 === 1 ? 0 : 1); x < W; x += 2) {
  if (inClear(x, y)) continue;
  const h = hash2(x, y, 77);
  if (h < 0.78) trees.push({ kind: 'tree', x, y, variant: h < 0.4 ? 'pine' : h < 0.65 ? 'oak' : 'birch' });
}

export const WOODS: MapDef = {
  id: 'woods',
  name: 'Greenfield Forst',
  width: W,
  height: H,
  base: 'grassDark',
  outdoor: true,
  fills: [
    { t: 'dirt', x: 20, y: 0, w: 2, h: 12 },
    { t: 'dirt', x: 7, y: 11, w: 14, h: 1 },
    { t: 'dirt', x: 21, y: 14, w: 7, h: 1 },
    { t: 'grass', x: 4, y: 8, w: 9, h: 9 },
    { t: 'grass', x: 26, y: 13, w: 10, h: 10 },
    { t: 'sand', x: 2, y: 19, w: 10, h: 9 },
    { t: 'water', x: 3, y: 20, w: 7, h: 6 },
    { t: 'water', x: 13, y: 17, w: 2, h: 13 },
    { t: 'dirt', x: 13, y: 16, w: 2, h: 1 },
  ],
  objects: [
    ...trees,
    { kind: 'sign', x: 22, y: 2, text: 'Greenfield Forst – Jagdgebiet. Betreten auf eigene Gefahr.', color: P.g1 },
    { kind: 'hochsitz', x: 31, y: 16 },
    { kind: 'kushMother', x: 29, y: 17 },
    { kind: 'log', x: 8, y: 14 }, { kind: 'log', x: 23, y: 20 },
    { kind: 'stump', x: 5, y: 9 }, { kind: 'stump', x: 11, y: 15 }, { kind: 'stump', x: 34, y: 21 },
    { kind: 'rock', x: 16, y: 6 }, { kind: 'rock', x: 27, y: 22 }, { kind: 'rock', x: 10, y: 18 },
    { kind: 'bush', x: 24, y: 9 }, { kind: 'bush', x: 12, y: 9 }, { kind: 'berrybush', x: 35, y: 14 },
    { kind: 'flowers', x: 6, y: 13 }, { kind: 'flowers', x: 9, y: 9 }, { kind: 'flowers', x: 28, y: 20 },
    { kind: 'flowers', x: 33, y: 13 }, { kind: 'tallgrass', x: 7, y: 15 }, { kind: 'tallgrass', x: 30, y: 21 },
    { kind: 'tallgrass', x: 26, y: 15 }, { kind: 'tallgrass', x: 4, y: 12 },
  ],
  warps: [{ x: 20, y: 0, w: 2, h: 1, to: 'farm', tx: 20.5, ty: 28.3, dir: 'up' }],
};
