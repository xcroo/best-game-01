// audio.js — every sound in PINECREST is synthesized with WebAudio.
// No audio files ship in the game. The context is created lazily on the
// first user gesture (browsers block autoplay); in headless runs with no
// AudioContext everything degrades silently to no-ops.

let ctx = null;
let muted = false;
let musicTimer = null;
let musicStep = 0;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  startMusic();
}

export function toggleMute() {
  muted = !muted;
  if (ctx) ctx.suspend().catch(() => {});
  if (!muted && ctx) ctx.resume().catch(() => {});
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, slideTo, delay) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + (delay || 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol || 0.12, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol, freq, delay) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + (delay || 0);
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq || 1200;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol || 0.15, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(t0);
}

export const sfx = {
  jump() {
    tone(280, 0.14, 'square', 0.1, 560);
  },
  land() {
    noise(0.07, 0.08, 700);
    tone(120, 0.08, 'sine', 0.1, 70);
  },
  doubleJump() {
    tone(420, 0.12, 'square', 0.1, 840);
  },
  dash() {
    noise(0.16, 0.14, 2400);
  },
  coin() {
    tone(988, 0.07, 'sine', 0.14);
    tone(1319, 0.14, 'sine', 0.14, null, 0.07);
  },
  shard() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, null, i * 0.06));
  },
  stomp() {
    noise(0.12, 0.2, 900);
    tone(160, 0.16, 'sine', 0.2, 60);
  },
  hurt() {
    tone(220, 0.25, 'sawtooth', 0.14, 70);
  },
  spring() {
    tone(180, 0.22, 'sine', 0.16, 900);
  },
  checkpoint() {
    tone(659, 0.12, 'triangle', 0.14);
    tone(880, 0.2, 'triangle', 0.14, null, 0.1);
  },
  crumble() {
    noise(0.25, 0.1, 500);
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, null, i * 0.09));
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.13, null, i * 0.14));
  },
  click() {
    tone(700, 0.05, 'square', 0.08);
  },
};

// A quiet chiptune loop: a bass line and a wandering melody, scheduled
// a bar ahead so it never stutters. It only starts after unlockAudio().
const BASS = [130.8, 98.0, 110.0, 146.8, 130.8, 98.0, 164.8, 146.8];
const MELODY = [523, 0, 659, 784, 0, 659, 523, 0, 587, 0, 698, 880, 784, 698, 659, 0];

export function startMusic() {
  if (musicTimer || muted) return;
  const c = ensureCtx();
  if (!c) return;
  const stepDur = 60 / 132 / 2; // 132 BPM eighth notes
  musicTimer = setInterval(() => {
    if (muted || !ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const when = now + i * stepDur;
      const b = BASS[musicStep % BASS.length];
      const m = MELODY[musicStep % MELODY.length];
      blip(b, when, stepDur * 0.95, 'triangle', 0.05);
      if (m) blip(m, when, stepDur * 0.9, 'square', 0.03);
      musicStep++;
    }
  }, stepDur * 2 * 1000);
}

function blip(freq, when, dur, type, vol) {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}
