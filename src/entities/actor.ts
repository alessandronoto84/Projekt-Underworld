import type { Look } from '../art/characters';
import { characterFrame } from '../art/atlas';
import type { Dir, Rect } from '../core/types';

/** Gemeinsame Basis für Spieler und NPCs. Position = Fußpunkt (Mitte unten). */
export class Actor {
  x = 0;
  y = 0;
  dir: Dir = 'down';
  moving = false;
  animTime = 0;

  constructor(readonly spriteId: string, public look: Look) {}

  hitbox(x = this.x, y = this.y): Rect { return { x: x - 5, y: y - 4, w: 10, h: 5 }; }

  frame(): number {
    if (!this.moving) return 0;
    return Math.floor(this.animTime * 8) % 4;
  }

  sprite(): HTMLCanvasElement { return characterFrame(this.spriteId, this.look, this.dir, this.frame()); }

  get tileX(): number { return Math.floor(this.x / 16); }
  get tileY(): number { return Math.floor((this.y - 2) / 16); }
}
