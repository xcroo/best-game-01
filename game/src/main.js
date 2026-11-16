// main.js — LUMEN DRIFT's game loop and state machine.
// Owns the shared state G, the title / playing / draft / game-over flow,
// the ?shot= screenshot scenes and the ?soak= scripted endurance test.
// The canvas is drawn by render.js; the DOM by ui.js.

import { CFG } from './config.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import {
  makePlayer, makeEnemy, makeSpark, makeHeart,
  updatePlayer, updateEnemy, updateProjectiles,
} from './entities.js';
import { startWave, updateWaves, rollDraft, applyUpgrade, celebrateWave, updateBackdrop } from './world.js';
import { draw, makeStars } from './render.js';
import { buildUI } from './ui.js';
import { mulberry32, dist2 } from './utils.js';

window.__shotReady = false;
window.__errors = [];
window.addEventListener('error', (e) => {
  window.__errors.push(String(e.message || e.error || 'error'));
  const log = document.getElementById('err-log');
  if (log) log.textContent = window.__errors.join(' | ');
});
window.addEventListener('unhandledrejection', (e) => {
  window.__errors.push('promise: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason));
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const BEST_KEY = 'lumen-drift-best';

function loadBest() {
  try {
    return parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest(v) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch (err) {
    /* storage unavailable; best score just won't persist */
  }
}

/** The whole game state, in one object. */
const G = {
  mode: 'title', // title | playing | draft | gameover
  paused: false,
  time: 0,
  score: 0,
  combo: 0,
  comboTimer: 0,
  best: loadBest(),
  wave: 0,
  waveActive: false,
  waveBanner: 0,
  spawnQueue: [],
  spawnTimer: 0,
  player: null,
  enemies: [],
  bullets: [],
  ebullets: [],
  sparks: [],
  hearts: [],
  parts: [],
  floats: [],
  shake: 0,
  flash: 0,
  boss: null,
  owned: {},
  draft: [],
  pendingGameOver: false,
  nextWaveIn: 0,
  stats: { kills: 0, shots: 0, pickups: 0 },
  rng: mulberry32(20261116),
  stars: [],
  input: new Input(canvas),
  sfx: new Sfx(),
  muted: false,
  soak: false,
  soakTime: 0,
  soakRestarts: 0,
};
G.stars = makeStars(G);
G.player = makePlayer(G);

const ui = buildUI(G, {
  start: () => startGame(),
  restart: () => startGame(),
  pick: (i) => pickDraft(i),
});

function resetArena() {
  G.enemies = [];
  G.bullets = [];
  G.ebullets = [];
  G.sparks = [];
  G.hearts = [];
  G.parts = [];
  G.floats = [];
  G.shake = 0;
  G.flash = 0;
  G.boss = null;
  G.combo = 0;
  G.comboTimer = 0;
  G.pendingGameOver = false;
  G.nextWaveIn = 0;
  G.paused = false;
}

/** Start a fresh run from wave 1. */
function startGame() {
  G.sfx.ensure();
  resetArena();
  G.score = 0;
  G.owned = {};
  G.stats = { kills: 0, shots: 0, pickups: 0 };
  G.player = makePlayer(G);
  G.mode = 'playing';
  ui.hideOverlays();
  startWave(G, 1);
}

/** End the run: record the best score and show the game-over screen. */
function gameOver() {
  G.mode = 'gameover';
  G.pendingGameOver = false;
  if (G.score > G.best) {
    G.best = G.score;
    saveBest(G.best);
  }
  G.sfx.gameOver();
  ui.showGameOver(G.score, G.wave, G.best);
}

/** Choose draft card i, then queue the next wave. */
function pickDraft(i) {
  if (G.mode !== 'draft' || !G.draft[i]) return;
  applyUpgrade(G, G.draft[i]);
  G.sfx.choose();
  G.draft = [];
  ui.hideOverlays();
  G.mode = 'playing';
  G.nextWaveIn = 0.7;
}

/** One fixed update step while playing. dt in seconds. */
function update(dt) {
  G.time += dt;
  if (G.mode === 'title') {
    updateBackdrop(G, dt);
    return;
  }
  if (G.mode !== 'playing' || G.paused) return;

  if (G.nextWaveIn > 0) {
    G.nextWaveIn -= dt;
    if (G.nextWaveIn <= 0) startWave(G, G.wave + 1);
  }

  updatePlayer(G, dt);
  for (const e of G.enemies) updateEnemy(G, e, dt);
  updateProjectiles(G, dt);

  if (G.pendingGameOver) {
    gameOver();
    return;
  }

  if (G.waveActive && updateWaves(G, dt)) {
    const bonus = CFG.WAVE_CLEAR_BONUS * G.wave + (G.wave % CFG.BOSS_EVERY === 0 ? CFG.BOSS_BONUS : 0);
    G.score += bonus;
    G.sfx.fanfare();
    celebrateWave(G);
    G.draft = rollDraft(G);
    G.mode = 'draft';
    ui.showDraft(G.draft);
  }
}

/** The frame loop. */
let last = 0;
let rafId = 0;
function frame(t) {
  const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000 || 0.016));
  last = t;

  // Global keys.
  if (G.input.pressed('m', 'M')) {
    G.muted = !G.muted;
    G.sfx.setMuted(G.muted);
  }
  if (G.mode === 'title' && (G.input.pressed('Enter') || G.input.pressed('enter'))) {
    startGame();
  } else if (G.mode === 'gameover' && G.input.pressed('r', 'R')) {
    startGame();
  } else if (G.mode === 'playing' && G.input.pressed('p', 'P', 'Escape')) {
    G.paused = !G.paused;
  } else if (G.mode === 'draft') {
    if (G.input.pressed('1')) pickDraft(0);
    else if (G.input.pressed('2')) pickDraft(1);
    else if (G.input.pressed('3')) pickDraft(2);
  }

  update(dt);
  draw(G, ctx);
  if (G.mode !== 'title') ui.updateHUD();
  G.input.endFrame();

  if (G.soak) soakTick(dt);
  if (!G.shotMode) rafId = requestAnimationFrame(frame);
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

// ---------------------------------------------------------------------------
// Screenshot scenes (?shot=title|play|draft|gameover). Deterministic, no
// input needed: the scene is built, rendered once, and __shotReady is set.
// ---------------------------------------------------------------------------

function scatterSparks(n, seed) {
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    G.sparks.push(makeSpark(
      G,
      120 + rng() * (CFG.W - 240),
      120 + rng() * (CFG.H - 240),
      1,
    ));
  }
}

function placeEnemies(specs) {
  for (const [type, x, y] of specs) {
    const e = makeEnemy(G, type, x, y);
    e.vx = 0;
    e.vy = 0;
    G.enemies.push(e);
  }
}

function setupShot(scene) {
  G.shotMode = true;
  G.rng = mulberry32(1337);
  G.time = 1.6; // fixed time so twinkles and wobbles are stable
  resetArena();
  if (scene === 'title') {
    G.mode = 'title';
    placeEnemies([
      ['chaser', 240, 300], ['orbiter', 1020, 240], ['splitter', 880, 560],
      ['chaser', 420, 620], ['spitter', 1060, 620],
    ]);
    for (const e of G.enemies) {
      e.vx = (G.rng() - 0.5) * 40;
      e.vy = (G.rng() - 0.5) * 40;
    }
    scatterSparks(7, 77);
    ui.showTitle(G.best);
  } else if (scene === 'play') {
    G.mode = 'playing';
    G.wave = 3;
    G.score = 3250;
    G.combo = 12;
    G.comboTimer = CFG.COMBO_WINDOW;
    G.player.x = CFG.W / 2;
    G.player.y = CFG.H / 2 + 40;
    G.player.aimAngle = -0.6;
    placeEnemies([
      ['chaser', 430, 300], ['chaser', 830, 290], ['orbiter', 700, 180],
      ['orbiter', 560, 540], ['splitter', 950, 480], ['spitter', 1080, 330],
      ['chaser', 300, 480],
    ]);
    scatterSparks(9, 78);
    // Two bullets already in flight toward the nearest shadow.
    G.bullets.push({
      x: G.player.x + 60, y: G.player.y - 40,
      vx: 480, vy: -380, r: 4, dmg: 1, life: 0.8,
    });
    G.bullets.push({
      x: G.player.x + 110, y: G.player.y - 74,
      vx: 480, vy: -380, r: 4, dmg: 1, life: 0.8,
    });
    G.waveBanner = 0;
    ui.hideOverlays();
    ui.updateHUD();
  } else if (scene === 'draft') {
    G.mode = 'draft';
    G.wave = 4;
    G.score = 7810;
    G.combo = 0;
    G.player.x = CFG.W / 2;
    G.player.y = CFG.H / 2;
    scatterSparks(8, 79);
    G.draft = rollDraft(G);
    ui.showDraft(G.draft);
    ui.updateHUD();
  } else if (scene === 'gameover') {
    G.mode = 'gameover';
    G.wave = 7;
    G.score = 12480;
    G.best = Math.max(G.best, 15200);
    G.player.hp = 0;
    scatterSparks(5, 80);
    ui.showGameOver(G.score, G.wave, G.best);
  }
  draw(G, ctx);
  if (G.mode !== 'title') ui.updateHUD();
  window.__shotReady = true;
}

// ---------------------------------------------------------------------------
// Soak test (?soak=1): a bot plays for 60 game-seconds, then reports.
// ---------------------------------------------------------------------------

function soakBot(dt) {
  const p = G.player;
  const input = G.input;
  // Aim at the nearest enemy and hold fire.
  let best = null;
  let bestD = Infinity;
  for (const e of G.enemies) {
    const d = dist2(p.x, p.y, e.x, e.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  if (best) input.setMouse(best.x, best.y, true);
  else input.setMouse(CFG.W / 2, CFG.H / 2 - 200, false);
  // Orbit the arena centre; flee when something gets close.
  const cx = CFG.W / 2;
  const cy = CFG.H / 2;
  let mx = 0;
  let my = 0;
  if (best && bestD < 130 * 130) {
    mx = p.x < best.x ? -1 : 1;
    my = p.y < best.y ? -1 : 1;
  } else {
    const a = Math.atan2(p.y - cy, p.x - cx) + Math.PI / 2.2;
    mx = Math.cos(a);
    my = Math.sin(a);
  }
  input.setKey('a', mx < -0.3);
  input.setKey('d', mx > 0.3);
  input.setKey('w', my < -0.3);
  input.setKey('s', my > 0.3);
  // Dash when a shadow closes in.
  if (best && bestD < 150 * 150 && p.dashCharges > 0 && p.dashCd <= 0) {
    input.setKey(' ', true);
    setTimeout(() => input.setKey(' ', false), 50);
  }
}

function soakTick(dt) {
  if (G.mode === 'gameover') {
    G.soakRestarts += 1;
    startGame();
    return;
  }
  // The bot must pick a draft card itself: soakBot only runs while playing.
  if (G.mode === 'draft') {
    pickDraft(0);
    return;
  }
  if (G.mode === 'playing') {
    soakBot(dt);
    G.soakTime += dt;
    if (G.soakTime >= 60) {
      const out = document.getElementById('soak-out');
      const result = {
        seconds: Math.round(G.soakTime),
        score: G.score,
        wave: G.wave,
        kills: G.stats.kills,
        shots: G.stats.shots,
        pickups: G.stats.pickups,
        restarts: G.soakRestarts,
        errors: window.__errors.length,
      };
      if (out) out.textContent = JSON.stringify(result);
      window.__soakDone = true;
      window.__soakResult = result;
      stopLoop();
    }
  }
}

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot === 'title' || shot === 'play' || shot === 'draft' || shot === 'gameover') {
  setupShot(shot);
} else {
  if (params.get('soak') === '1') {
    G.soak = true;
    startGame();
  } else {
    // Title backdrop: a few shadows drifting behind the menu.
    G.mode = 'title';
    placeEnemies([
      ['chaser', 240, 300], ['orbiter', 1020, 240], ['splitter', 880, 560],
      ['chaser', 420, 620], ['spitter', 1060, 620],
    ]);
    for (const e of G.enemies) {
      e.vx = (G.rng() - 0.5) * 36;
      e.vy = (G.rng() - 0.5) * 36;
    }
    scatterSparks(6, 81);
    ui.showTitle(G.best);
  }
  window.__shotReady = true;
  rafId = requestAnimationFrame(frame);
}

/** Debug / test handle. */
window.__lumen = {
  G,
  start: startGame,
  pick: pickDraft,
  version: 'lumen-drift-r2',
};
