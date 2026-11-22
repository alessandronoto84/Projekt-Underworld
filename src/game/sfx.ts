/** Winzige synthetisierte Soundeffekte (WebAudio, keine Dateien nötig). Musik folgt in Phase 6. */
type Sfx = 'till' | 'water' | 'plant' | 'harvest' | 'coin' | 'click' | 'door' | 'error' | 'collect' | 'quest' | 'step' | 'eat';

export class Sound {
  private ctx: AudioContext | null = null;
  enabled = true;

  constructor() {
    try { this.enabled = localStorage.getItem('underworld.sound') !== 'off'; } catch { /* egal */ }
  }

  toggle(): void {
    this.enabled = !this.enabled;
    try { localStorage.setItem('underworld.sound', this.enabled ? 'on' : 'off'); } catch { /* egal */ }
  }

  private ac(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
    const ac = this.ac(); if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, hp = 800): void {
    const ac = this.ac(); if (!ac) return;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ac.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(ac.destination);
    src.start();
  }

  play(s: Sfx): void {
    switch (s) {
      case 'till': this.noise(0.12, 0.25, 300); this.tone(110, 0.1, 'square', 0.05, -40); break;
      case 'water': this.noise(0.25, 0.12, 2500); break;
      case 'plant': this.tone(420, 0.08, 'triangle', 0.08, 120); break;
      case 'harvest': this.tone(520, 0.08, 'square', 0.06); this.tone(780, 0.12, 'square', 0.05, 0, 0.07); break;
      case 'coin': this.tone(988, 0.07, 'square', 0.05); this.tone(1319, 0.18, 'square', 0.05, 0, 0.06); break;
      case 'click': this.tone(660, 0.04, 'triangle', 0.05); break;
      case 'door': this.tone(180, 0.12, 'triangle', 0.08, -60); break;
      case 'error': this.tone(160, 0.15, 'square', 0.05, -40); break;
      case 'collect': this.tone(600, 0.07, 'triangle', 0.07); this.tone(900, 0.1, 'triangle', 0.07, 0, 0.06); break;
      case 'quest': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.04, 0, i * 0.08)); break;
      case 'step': this.noise(0.03, 0.03, 1200); break;
      case 'eat': this.tone(300, 0.06, 'square', 0.05, 80); this.tone(340, 0.06, 'square', 0.05, 80, 0.1); break;
    }
  }
}
