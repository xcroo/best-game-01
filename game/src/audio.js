// audio.js — synthesized WebAudio sound effects for LUMEN DRIFT.
// No sound files, no network: every effect is an oscillator (or two)
// through a short gain envelope. The context is created lazily on the
// first user gesture, so autoplay rules never block the game. No imports.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  /** Create the context. Call from a user gesture (start button / key). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.42;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.42;
  }

  /** One short tone. type: oscillator type, f0->f1 glide, dur seconds. */
  _tone({ type = 'sine', f0 = 440, f1 = null, dur = 0.12, vol = 0.5, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, f0), t0);
    if (f1 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A burst of filtered noise, for impacts and whooshes. */
  _noise({ dur = 0.15, vol = 0.4, freq = 1200, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  /** Spark pickup blip; pitch climbs with the combo. */
  pickup(combo) {
    const step = Math.min(combo, 24);
    this._tone({ type: 'sine', f0: 620 + step * 22, f1: 940 + step * 26, dur: 0.09, vol: 0.32 });
  }

  /** Player shot tick. */
  shoot() {
    this._tone({ type: 'square', f0: 880, f1: 320, dur: 0.05, vol: 0.1 });
  }

  /** Player takes a hit. */
  hit() {
    this._tone({ type: 'sawtooth', f0: 220, f1: 55, dur: 0.22, vol: 0.5 });
    this._noise({ dur: 0.18, vol: 0.3, freq: 500 });
  }

  /** Enemy destroyed. */
  pop() {
    this._tone({ type: 'triangle', f0: 420, f1: 90, dur: 0.14, vol: 0.32 });
    this._noise({ dur: 0.1, vol: 0.18, freq: 2400 });
  }

  /** Dash whoosh. */
  dash() {
    this._noise({ dur: 0.16, vol: 0.32, freq: 2600 });
    this._tone({ type: 'sine', f0: 300, f1: 720, dur: 0.12, vol: 0.14 });
  }

  /** Wave cleared fanfare: three rising notes. */
  fanfare() {
    const notes = [523, 659, 784];
    notes.forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.3, when: i * 0.09 }));
  }

  /** Boss warning: two low brass-ish blasts. */
  bossWarn() {
    this._tone({ type: 'sawtooth', f0: 98, f1: 92, dur: 0.4, vol: 0.4 });
    this._tone({ type: 'sawtooth', f0: 147, f1: 138, dur: 0.4, vol: 0.3, when: 0.32 });
  }

  /** Game over sting: falling notes. */
  gameOver() {
    const notes = [392, 311, 233, 175];
    notes.forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.24, vol: 0.32, when: i * 0.14 }));
  }

  /** Draft card chosen. */
  choose() {
    this._tone({ type: 'sine', f0: 660, f1: 990, dur: 0.12, vol: 0.3 });
    this._tone({ type: 'sine', f0: 990, f1: 1320, dur: 0.14, vol: 0.22, when: 0.08 });
  }

  /** Soft UI click for buttons and menu moves. */
  uiClick() {
    this._tone({ type: 'sine', f0: 700, f1: 840, dur: 0.06, vol: 0.18 });
  }
}
