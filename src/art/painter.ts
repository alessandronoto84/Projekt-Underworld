import { P } from './palette';

/** Kleiner Pixel-Pinsel auf einem Offscreen-Canvas. */
export class Painter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(readonly w: number, readonly h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D nicht verfügbar');
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, c: string): this {
    this.ctx.fillStyle = c; this.ctx.fillRect(x | 0, y | 0, 1, 1); return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    this.ctx.fillStyle = c; this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0); return this;
  }

  hline(x: number, y: number, w: number, c: string): this { return this.rect(x, y, w, 1, c); }
  vline(x: number, y: number, h: number, c: string): this { return this.rect(x, y, 1, h, c); }

  /** Gefüllte Ellipse in Pixeln (ohne Anti-Aliasing). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    this.ctx.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.35) * (ry + 0.35)))));
      this.ctx.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2 + 1, 1);
    }
    return this;
  }

  /** Zeichnet ein Muster aus Zeichen; jedes Zeichen wird über die Map auf eine Farbe abgebildet. */
  pattern(x: number, y: number, rows: string[], map: Record<string, string>): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = map[row[i]];
        if (c) this.px(x + i, y + j, c);
      }
    });
    return this;
  }

  /** Spiegelt das gesamte Bild horizontal. */
  flipX(): this {
    const tmp = document.createElement('canvas');
    tmp.width = this.w; tmp.height = this.h;
    tmp.getContext('2d')!.drawImage(this.canvas, 0, 0);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.save(); this.ctx.scale(-1, 1); this.ctx.drawImage(tmp, -this.w, 0); this.ctx.restore();
    return this;
  }

  /**
   * Automatische Kontur: Jeder transparente Pixel neben einem deckenden Pixel wird zur Konturfarbe.
   * Sorgt für den einheitlichen "handgezeichneten" Look aller Objekte.
   */
  outline(color: string = P.outline): this {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const d = img.data;
    const solid = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < this.w && y < this.h && d[(y * this.w + x) * 4 + 3] > 0;
    const marks: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (solid(x, y)) continue;
        if (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) marks.push(x, y);
      }
    }
    this.ctx.fillStyle = color;
    for (let i = 0; i < marks.length; i += 2) this.ctx.fillRect(marks[i], marks[i + 1], 1, 1);
    return this;
  }

  /** Dunkelt die untere/rechte Kante deckender Pixel ab (einfaches Volumen). */
  shadeEdges(shade: string): this {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const d = img.data;
    const solid = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < this.w && y < this.h && d[(y * this.w + x) * 4 + 3] > 0;
    this.ctx.fillStyle = shade;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (solid(x, y) && (!solid(x, y + 1) || !solid(x + 1, y))) this.ctx.fillRect(x, y, 1, 1);
    }
    return this;
  }
}

export function toDataURL(c: HTMLCanvasElement): string { return c.toDataURL('image/png'); }
