import { P } from '../../art/palette';
import type { MapDef } from '../../world/mapdef';

const interiorBase = (id: string, name: string, w: number, h: number, floor: MapDef['base']): Pick<MapDef, 'id' | 'name' | 'width' | 'height' | 'base' | 'outdoor'> & { fills: MapDef['fills'] } => ({
  id, name, width: w, height: h, base: 'void', outdoor: false,
  fills: [
    { t: 'wall', x: 1, y: 0, w: w - 2, h: 2 },
    { t: floor, x: 1, y: 2, w: w - 2, h: h - 3 },
  ],
});

const homeBase = interiorBase('home', 'Dein Zuhause', 12, 10, 'wood');
export const HOME: MapDef = {
  ...homeBase,
  fills: [...homeBase.fills, { t: 'wood', x: 5, y: 9, w: 2, h: 1 }],
  walls: { paper: P.b3, stripe: P.b2, trim: P.b1 },
  nightDim: 0.45,
  objects: [
    { kind: 'furniture', x: 1, y: 2, art: 'bed', solid: { w: 1, h: 2 }, action: 'bed', area: { w: 2, h: 2 } },
    { kind: 'furniture', x: 4, y: 1, art: 'tv', solid: { w: 1, h: 1 } },
    { kind: 'furniture', x: 3, y: 0, art: 'window' },
    { kind: 'furniture', x: 7, y: 0, art: 'window' },
    { kind: 'furniture', x: 4, y: 5, art: 'rug' },
    { kind: 'furniture', x: 6, y: 4, art: 'table', solid: { w: 2, h: 1 } },
    { kind: 'furniture', x: 7, y: 4, art: 'laptop', action: 'laptop' },
    { kind: 'furniture', x: 5, y: 4, art: 'chair' },
    { kind: 'furniture', x: 9, y: 1, art: 'fridge', solid: { w: 1, h: 2 } },
    { kind: 'furniture', x: 10, y: 1, art: 'stove', solid: { w: 1, h: 2 } },
    { kind: 'furniture', x: 10, y: 7, art: 'plant', solid: { w: 1, h: 1 } },
    { kind: 'furniture', x: 1, y: 7, art: 'chest', solid: { w: 1, h: 1 }, action: 'chest' },
    { kind: 'furniture', x: 5, y: 8, art: 'doormat' },
    { kind: 'furniture', x: 2, y: 0, art: 'posterTeal' },
  ],
  warps: [{ x: 5, y: 9, w: 2, h: 1, to: 'farm', tx: 6.5, ty: 9.6, dir: 'down' }],
  lights: [
    { x: 3 * 16, y: 3 * 16, r: 70, color: 'rgba(255,200,120,0.35)' },
    { x: 8 * 16, y: 5 * 16, r: 70, color: 'rgba(255,200,120,0.35)' },
    { x: 7 * 16 + 8, y: 3 * 16 + 6, r: 18, color: 'rgba(63,216,200,0.5)' },
  ],
};

const shopBase = interiorBase('shop', 'Kramers Laden', 12, 10, 'tiles');
export const SHOP: MapDef = {
  ...shopBase,
  fills: [...shopBase.fills, { t: 'tiles', x: 5, y: 9, w: 2, h: 1 }],
  walls: { paper: P.g2, stripe: P.g1, trim: P.b2 },
  nightDim: 0.2,
  objects: [
    { kind: 'furniture', x: 1, y: 1, art: 'shelfFood', solid: { w: 2, h: 2 } },
    { kind: 'furniture', x: 9, y: 1, art: 'shelfTools', solid: { w: 2, h: 2 } },
    { kind: 'furniture', x: 3, y: 4, art: 'counter', widthTiles: 5, solid: { w: 5, h: 1 }, action: 'shop:kramer', area: { w: 5, h: 2 } },
    { kind: 'furniture', x: 1, y: 6, art: 'crate', solid: { w: 1, h: 1 } },
    { kind: 'furniture', x: 1, y: 7, art: 'barrel', solid: { w: 1, h: 1 } },
    { kind: 'furniture', x: 10, y: 6, art: 'plant', solid: { w: 1, h: 1 } },
    { kind: 'furniture', x: 10, y: 7, art: 'crate', solid: { w: 1, h: 1 } },
    { kind: 'furniture', x: 5, y: 0, art: 'window' },
    { kind: 'furniture', x: 5, y: 8, art: 'doormat' },
  ],
  warps: [{ x: 5, y: 9, w: 2, h: 1, to: 'town', tx: 5.5, ty: 13.6, dir: 'down' }],
  lights: [{ x: 6 * 16, y: 4 * 16, r: 90, color: 'rgba(255,230,170,0.35)' }],
};

const barBase = interiorBase('bar', 'Zum Rostigen Anker', 14, 10, 'plank');
export const BAR: MapDef = {
  ...barBase,
  fills: [...barBase.fills, { t: 'plank', x: 6, y: 9, w: 2, h: 1 }],
  walls: { paper: P.v1, stripe: P.v0, trim: P.b1 },
  nightDim: 0.35,
  objects: [
    { kind: 'furniture', x: 1, y: 3, art: 'barCounter', widthTiles: 6, solid: { w: 6, h: 1 }, action: 'shop:lou', area: { w: 6, h: 2 } },
    { kind: 'furniture', x: 1, y: 1, art: 'shelfFood', solid: { w: 2, h: 1 } },
    { kind: 'furniture', x: 2, y: 4, art: 'stool' }, { kind: 'furniture', x: 4, y: 4, art: 'stool' }, { kind: 'furniture', x: 6, y: 4, art: 'stool' },
    { kind: 'furniture', x: 11, y: 1, art: 'jukebox', solid: { w: 1, h: 1 }, action: 'jukebox' },
    { kind: 'furniture', x: 9, y: 5, art: 'table', solid: { w: 2, h: 1 } },
    { kind: 'furniture', x: 9, y: 7, art: 'table', solid: { w: 2, h: 1 } },
    { kind: 'furniture', x: 12, y: 5, art: 'chair' }, { kind: 'furniture', x: 12, y: 7, art: 'chair' },
    { kind: 'furniture', x: 8, y: 0, art: 'posterPink' }, { kind: 'furniture', x: 4, y: 0, art: 'window' },
    { kind: 'furniture', x: 1, y: 7, art: 'plant', solid: { w: 1, h: 1 } },
    { kind: 'furniture', x: 6, y: 8, art: 'doormat' },
  ],
  warps: [{ x: 6, y: 9, w: 2, h: 1, to: 'town', tx: 32.5, ty: 13.6, dir: 'down' }],
  lights: [
    { x: 4 * 16, y: 3 * 16, r: 60, color: 'rgba(255,95,168,0.3)' },
    { x: 11 * 16 + 8, y: 2 * 16, r: 40, color: 'rgba(63,216,200,0.35)' },
    { x: 10 * 16, y: 6 * 16, r: 60, color: 'rgba(255,200,120,0.35)' },
  ],
};
