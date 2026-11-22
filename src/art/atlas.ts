import { drawCharacter, drawPortrait, type Look } from './characters';
import * as O from './objects';
import { P } from './palette';
import { Painter } from './painter';
import { drawTilledSoil, drawWater } from './tiles';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import type { Dir } from '../core/types';
import type { FurnitureArt } from '../world/mapdef';

/** Zentraler Sprite-Cache: Jede Grafik wird einmal prozedural erzeugt und wiederverwendet. */
const cache = new Map<string, HTMLCanvasElement>();
const urlCache = new Map<string, string>();

export function sprite(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) { c = build(); cache.set(key, c); }
  return c;
}

export function characterFrame(id: string, look: Look, dir: Dir, frame: number): HTMLCanvasElement {
  return sprite(`char:${id}:${dir}:${frame}`, () => drawCharacter(look, dir, frame));
}

export function portrait(id: string, look: Look): HTMLCanvasElement {
  return sprite(`portrait:${id}`, () => drawPortrait(look));
}

export function itemIcon(id: string): HTMLCanvasElement {
  const def = ITEMS[id];
  return sprite(`icon:${id}`, () => O.drawIcon(def?.icon ?? 'coin', def?.tint));
}

export function iconURL(id: string): string {
  let u = urlCache.get(id);
  if (!u) { u = itemIcon(id).toDataURL(); urlCache.set(id, u); }
  return u;
}

export function canvasURL(key: string, c: () => HTMLCanvasElement): string {
  let u = urlCache.get(key);
  if (!u) { u = sprite(key, c).toDataURL(); urlCache.set(key, u); }
  return u;
}

export function cropSprite(cropId: string, stage: number): HTMLCanvasElement {
  const def = CROPS[cropId];
  return sprite(`crop:${cropId}:${stage}`, () => O.drawCrop(def.art, stage, def.stages));
}

export function soilSprite(watered: boolean, variant: number): HTMLCanvasElement {
  return sprite(`soil:${watered}:${variant}`, () => {
    const p = new Painter(16, 16);
    drawTilledSoil(p, 0, 0, watered, variant, variant * 3);
    return p.canvas;
  });
}

export function waterTile(frame: number, variant: number): HTMLCanvasElement {
  return sprite(`water:${frame}:${variant}`, () => {
    const p = new Painter(16, 16);
    drawWater(p, 0, 0, variant % 4, (variant / 4) | 0, frame);
    return p.canvas;
  });
}

export function machineSprite(machine: string, state: 'idle' | 'working' | 'done'): HTMLCanvasElement {
  return sprite(`machine:${machine}:${state}`, () => {
    if (machine === 'pill_press') return O.drawPillPress(state);
    if (machine === 'pack_table') return O.drawPackTable(state);
    return O.drawDryingRack(state);
  });
}

export function furnitureSprite(art: FurnitureArt, widthTiles = 1): HTMLCanvasElement {
  return sprite(`furn:${art}:${widthTiles}`, () => {
    switch (art) {
      case 'bed': return O.drawBed();
      case 'table': return O.drawTable();
      case 'chair': return O.drawChair();
      case 'shelfFood': return O.drawShelf([P.r2, P.y1, P.g3, P.cream, P.v2, P.w2]);
      case 'shelfTools': return O.drawShelf([P.s3, P.b4, P.g2, P.s2, P.r1]);
      case 'counter': return O.drawCounter(widthTiles);
      case 'barCounter': return O.drawCounter(widthTiles, P.b3, P.b1);
      case 'stool': return O.drawStool();
      case 'plant': return O.drawPlantPot();
      case 'fridge': return O.drawFridge();
      case 'stove': return O.drawStove();
      case 'tv': return O.drawTV();
      case 'rug': return O.drawRug(48, 32, P.r1, P.y1);
      case 'rugRed': return O.drawRug(32, 32, P.v1, P.pink);
      case 'window': return O.drawWindowWall(false);
      case 'posterPink': return O.drawPoster(P.pink);
      case 'posterTeal': return O.drawPoster(P.tealDark);
      case 'jukebox': return O.drawJukebox();
      case 'doormat': return O.drawDoormat();
      case 'chest': return O.drawChest();
      case 'laptop': return O.drawLaptop();
      case 'crate': return O.drawCrate();
      case 'barrel': return O.drawBarrel();
      case 'workbench': return O.drawWorkbench();
    }
  });
}
