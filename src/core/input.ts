/** Eingabe-Abstraktion: Tastatur + Maus. Spätere Touch-Steuerung setzt dieselben Aktionen. */
export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'use' | 'interact' | 'inventory' | 'trade' | 'map' | 'menu' | 'run' | 'journal';

const KEYMAP: Record<string, Action> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'use', KeyE: 'interact', KeyF: 'interact', Enter: 'interact',
  KeyI: 'inventory', Tab: 'inventory', KeyH: 'trade', KeyM: 'map', KeyJ: 'journal', KeyQ: 'journal', Escape: 'menu',
  ShiftLeft: 'run', ShiftRight: 'run',
};

export class Input {
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private numberPressed: number | null = null;
  private wheel = 0;
  mouse = { x: 0, y: 0, inside: false };
  mouseLeftPressed = false;
  mouseRightPressed = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e.target)) return;
      const a = KEYMAP[e.code];
      if (a) {
        if (!this.down.has(a)) this.pressed.add(a);
        this.down.add(a);
        e.preventDefault();
      }
      if (/^Digit[1-9]$/.test(e.code)) this.numberPressed = Number(e.code.slice(5)) - 1;
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.down.delete(a);
    });
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; this.mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseLeftPressed = true;
      if (e.button === 2) this.mouseRightPressed = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  isDown(a: Action): boolean { return this.down.has(a); }
  wasPressed(a: Action): boolean { return this.pressed.has(a); }
  takeNumber(): number | null { const n = this.numberPressed; this.numberPressed = null; return n; }
  takeWheel(): number { const w = this.wheel; this.wheel = 0; return w; }

  /** Am Frame-Ende aufrufen. */
  endFrame(): void {
    this.pressed.clear();
    this.mouseLeftPressed = false;
    this.mouseRightPressed = false;
  }

  releaseAll(): void { this.down.clear(); this.pressed.clear(); }
}

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
}
