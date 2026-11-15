// audio.js — synthesized WebAudio sound effects for LUMEN DRIFT.
// No audio files: every sound is an oscillator + gain envelope, built here.
// The context is created on the first user gesture only, so the title
// screen stays silent until the player starts.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  /** Create (or return) the context. Call only from a user gesture. */
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return ctx;
  }

  /** One blip: an oscillator swept from f0 to f1 over `dur` seconds. */
  function blip({ type = 'sine', f0 = 440, f1 = null, dur = 0.12, vol = 0.5, when = 0 }) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A short filtered-noise burst (dash whoosh, hits). */
  function noise({ dur = 0.2, vol = 0.4, freq = 1200, when = 0 }) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    /** Call from the start button / Enter key so audio is gesture-gated. */
    unlock() {
      ensure();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.35;
    },
    /** Flip mute and return the new state (for the HUD button). */
    toggleMuted() {
      this.setMuted(!muted);
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** Pickup blip, pitch rising with the combo. */
    pickup(combo) {
      const step = Math.min(combo, 24);
      blip({ type: 'sine', f0: 520 + step * 22, f1: 880 + step * 22, dur: 0.09, vol: 0.35 });
    },
    shoot() {
      blip({ type: 'square', f0: 920, f1: 620, dur: 0.05, vol: 0.1 });
    },
    hit() {
      noise({ dur: 0.16, vol: 0.5, freq: 900 });
      blip({ type: 'sawtooth', f0: 160, f1: 60, dur: 0.18, vol: 0.4 });
    },
    dash() {
      noise({ dur: 0.18, vol: 0.3, freq: 2600 });
    },
    heal() {
      blip({ type: 'sine', f0: 660, f1: 990, dur: 0.16, vol: 0.35 });
      blip({ type: 'sine', f0: 990, f1: 1320, dur: 0.16, vol: 0.3, when: 0.09 });
    },
    /** Little two-note fanfare when a wave clears. */
    fanfare() {
      blip({ type: 'triangle', f0: 523, dur: 0.14, vol: 0.4 });
      blip({ type: 'triangle', f0: 784, dur: 0.2, vol: 0.4, when: 0.12 });
      blip({ type: 'triangle', f0: 1046, dur: 0.28, vol: 0.4, when: 0.24 });
    },
    /** Low warning swell when the boss arrives. */
    bossWarn() {
      blip({ type: 'sawtooth', f0: 110, f1: 55, dur: 0.7, vol: 0.4 });
      blip({ type: 'sawtooth', f0: 165, f1: 82, dur: 0.7, vol: 0.25, when: 0.05 });
    },
    /** Descending sting for game over. */
    gameOver() {
      blip({ type: 'triangle', f0: 392, dur: 0.25, vol: 0.4 });
      blip({ type: 'triangle', f0: 311, dur: 0.25, vol: 0.4, when: 0.22 });
      blip({ type: 'triangle', f0: 233, dur: 0.5, vol: 0.4, when: 0.44 });
    },
    click() {
      blip({ type: 'sine', f0: 700, f1: 900, dur: 0.06, vol: 0.25 });
    },
  };
}
