import type { GroundType } from '../art/tiles';
import type { BuildingSpec } from '../art/objects';
import type { Dir, Rect } from '../core/types';

/** Bedingung, unter der eine Tür/Warp benutzbar ist (siehe game/conditions.ts). */
export type WarpCondition = 'shopOpen' | 'barOpen';

export interface Warp {
  x: number; y: number; w: number; h: number; // in Tiles
  to: string; tx: number; ty: number; dir: Dir;  // Ziel in Tiles
  requires?: WarpCondition;
}

export type FurnitureArt =
  | 'bed' | 'table' | 'chair' | 'shelfFood' | 'shelfTools' | 'counter' | 'barCounter' | 'stool' | 'plant'
  | 'fridge' | 'stove' | 'tv' | 'rug' | 'rugRed' | 'window' | 'posterPink' | 'posterTeal' | 'jukebox'
  | 'doormat' | 'chest' | 'laptop' | 'crate' | 'barrel' | 'workbench';

export type MapObjectDef =
  | { kind: 'tree'; x: number; y: number; variant: 'oak' | 'pine' | 'birch' }
  | { kind: 'bush' | 'rock' | 'flowers' | 'tallgrass' | 'barrel' | 'crate' | 'trash' | 'lamp' | 'mailbox' | 'bench' | 'busstop' | 'berrybush' | 'dumpster'; x: number; y: number; action?: string }
  | { kind: 'sign'; x: number; y: number; text: string; color?: string }
  | { kind: 'fence'; x: number; y: number; len: number; vertical?: boolean }
  | { kind: 'car'; x: number; y: number; color: string }
  | {
      kind: 'building'; x: number; y: number; name: string; spec: BuildingSpec;
      /** Zielkarte der Tür; ohne Ziel ist die Tür verschlossen (lockedText). */
      door?: { to: string; tx: number; ty: number; dir: Dir; requires?: WarpCondition };
      lockedText?: string;
    }
  | {
      kind: 'furniture'; x: number; y: number; art: FurnitureArt;
      /** Kollisionsfläche in Tiles relativ zu (x,y). Ohne Angabe: begehbar. */
      solid?: { w: number; h: number };
      action?: string;
      /** Interaktionsfläche in Tiles relativ zu (x,y) (Standard = solid bzw. 1×1). */
      area?: { w: number; h: number };
      widthTiles?: number;
    };

export interface LightDef { x: number; y: number; r: number; color: string; night?: boolean }

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  base: GroundType;
  fills: { t: GroundType; x: number; y: number; w: number; h: number }[];
  farmable?: Rect[];
  /** Maschinen dürfen auf dieser Karte platziert werden. */
  allowPlacing?: boolean;
  outdoor: boolean;
  objects: MapObjectDef[];
  warps: Warp[];
  lights?: LightDef[];
  /** Innenräume: Wandfarben */
  walls?: { paper: string; stripe: string; trim: string };
  /** Grundhelligkeit nachts in Innenräumen (0 = hell, 1 = dunkel wie draußen) */
  nightDim?: number;
  music?: string;
  /** Straßenmarkierungen */
  roadLines?: { x: number; y: number; len: number; vertical?: boolean }[];
}
