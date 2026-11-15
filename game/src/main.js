// main.js — LUMEN DRIFT: the game loop and state machine.
// States: title → playing → draft (after each cleared wave) → playing …
// → gameover → (restart) → playing. Pause overlays playing.

import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createUI } from './ui.js';
import { drawWorld } from './render.js';
import { applyUpgrade, makeArena, rollDraft, startWave, updateSpawning } from './world.js';
import { Bullet, Enemy, FloatText, HeartDrop, Particle, Player, Spark } from './entities.js';
import { clamp, dist2, formatScore, makeRng } from './utils.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot'); // title | play | draft | gameover (screenshot scenes)
const SOAK = params.get('soak') === '1'; // headless 60 s soak test
const SEED = Number(params.get('seed') || (SHOT === 'play' ? 7 : SHOT === 'draft' ? 11 : SHOT === 'gameover' ? 13 : 3));

// Error surface for the headless playtests: any page error lands here.
window.__errors = [];
window.__shotReady = false;
window.__soakDone = false;
window.addEventListener('error', (e) => window.__errors.push(`error: ${e.message}`));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(`rejection: ${String(e.reason)}`));

const game = {
  canvas,
  state: 'title', // title | playing | draft | gameover
  paused: false,
  time: 0,
  arena: makeArena(),
  rng: makeRng(SEED),
  player: new Player(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2),
  enemies: [],
  bullets: [],
  enemyBullets: [],
  sparks: [],
  hearts: [],
  particles: [],
  floatTexts: [],
  score: 0,
  best: 0,
  combo: 0,
  comboTimer: 0,
  comboMult: 1,
  wave: 0,
  waveActive: false,
  spawnQueue: 0,
  spawnTimer: 0,
  boss: null,
  bossQueued: false,
  bossWarnTimer: 0,
  upgradesTaken: [],
  banner: '',
  bannerTimer: 0,
  shake: 0,
  hurtFlash: 0,
  kills: 0,
  shotsFired: 0,
  muted: false,
  audio: createAudio(),
  input: null,
  ui: null,
};

try {
  game.best = Number(localStorage.getItem(CONFIG.storage.bestKey) || 0) || 0;
} catch {
  game.best = 0;
}

game.input = createInput(canvas);
game.ui = createUI(game);

// No user gesture is possible in a screenshot or soak run: stay muted so
// no AudioContext is ever created there.
if (SHOT || SOAK) game.audio.setMuted(true);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function burst(x, y, color, n, speed, life, size) {
  for (let i = 0; i < n; i++) {
    game.particles.push(new Particle(x, y, color, speed * (0.4 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.6)));
  }
}

function addFloatText(x, y, text, color) {
  game.floatTexts.push(new FloatText(x, y, text, color));
}

function dropSparks(x, y, n, rng) {
  for (let i = 0; i < n; i++) game.sparks.push(new Spark(x, y, game.player.sparkValue, rng));
}

/** The combo multiplier: +10% per pickup, capped at 5x. */
function comboMult() {
  return Math.min(CONFIG.combo.maxMult, 1 + game.combo * CONFIG.combo.step);
}

function collectSpark(spark) {
  game.combo += 1;
  game.comboTimer = CONFIG.combo.window;
  game.comboMult = comboMult();
  const value = Math.round(spark.value * game.comboMult);
  game.score += value;
  addFloatText(spark.x, spark.y - 10, `+${value}`, '#ffc53d');
  burst(spark.x, spark.y, '#ffc53d', 5, 120, 0.35, 2.5);
  game.audio.pickup(game.combo);
}

function collectHeart(heart) {
  const p = game.player;
  if (p.hp < p.maxHp) {
    p.hp += 1;
    addFloatText(heart.x, heart.y - 12, '+1 HP', '#ff5d73');
    game.audio.heal();
  } else {
    game.score += 50;
    addFloatText(heart.x, heart.y - 12, '+50', '#ff5d73');
  }
  burst(heart.x, heart.y, '#ff5d73', 8, 140, 0.4, 3);
}

function killEnemy(enemy, index) {
  game.enemies.splice(index, 1);
  game.kills += 1;
  game.score += enemy.score;
  addFloatText(enemy.x, enemy.y - enemy.radius - 6, `+${enemy.score}`, '#dbe7ff');
  burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 60 : 14, 260, 0.6, 3);
  dropSparks(enemy.x, enemy.y, enemy.sparkDrop, game.rng);
  if (enemy.kind === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const mini = new Enemy('mini', enemy.x + (i === 0 ? -14 : 14), enemy.y, game.wave);
      game.enemies.push(mini);
    }
  }
  if (enemy.kind === 'boss') {
    game.boss = null;
    game.ui.setBoss(null);
    dropSparks(enemy.x, enemy.y, 12, game.rng);
    game.hearts.push(new HeartDrop(enemy.x, enemy.y));
    game.shake = Math.max(game.shake, 18);
    game.score += 500;
    addFloatText(enemy.x, enemy.y - 60, 'BOSS DOWN +500', '#ff5d73');
  } else if (game.rng.chance(CONFIG.drops.heartChance)) {
    game.hearts.push(new HeartDrop(enemy.x, enemy.y));
  }
}

function damagePlayer(fromX, fromY) {
  const p = game.player;
  if (!p.alive || p.invuln > 0 || game.state !== 'playing') return;
  if (p.shield) {
    p.shield = false;
    p.invuln = 0.8;
    addFloatText(p.x, p.y - 26, 'SHIELD!', '#a78bfa');
    game.audio.hit();
    return;
  }
  p.hp -= 1;
  p.invuln = CONFIG.player.invulnAfterHit;
  game.hurtFlash = 1;
  game.shake = 16;
  game.combo = 0;
  game.comboMult = 1;
  game.comboTimer = 0;
  burst(p.x, p.y, '#ff2e4d', 18, 300, 0.5, 3);
  game.audio.hit();
  if (p.hp <= 0) {
    p.alive = false;
    game.state = 'gameover';
    game.waveActive = false;
    burst(p.x, p.y, '#22e6ff', 50, 380, 0.9, 3.5);
    game.audio.gameOver();
    if (game.score > game.best) {
      game.best = game.score;
      try {
        localStorage.setItem(CONFIG.storage.bestKey, String(game.best));
      } catch {
        /* storage unavailable: best score just lives for the session */
      }
    }
    game.ui.showGameOver(game.score, game.best, game.wave);
  }
}

/** Called when a wave clears: bonus, fanfare, then the upgrade draft. */
game.onWaveCleared = function onWaveCleared() {
  const bonus = CONFIG.wave.clearBonus * game.wave;
  game.score += bonus;
  addFloatText(game.player.x, game.player.y - 40, `WAVE CLEAR +${bonus}`, '#7CFC9A');
  game.audio.fanfare();
  game.state = 'draft';
  const cards = rollDraft(game);
  game.ui.showDraft(cards, (i) => {
    applyUpgrade(game, cards[i].id);
    game.state = 'playing';
    game.ui.showPlaying();
    startWave(game, game.wave + 1);
  });
};

/** Enemy bullets the spitter fires (kept on the game for Enemy.update). */
game.spawnEnemyBullet = function spawnEnemyBullet(x, y, angle, speed) {
  game.enemyBullets.push(new Bullet(x, y, angle, speed, 1, false));
};

/** The boss's radial burst. */
game.spawnBossBurst = function spawnBossBurst(x, y) {
  const n = CONFIG.boss.burstCount;
  const off = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2;
    game.enemyBullets.push(new Bullet(x, y, a, CONFIG.boss.bulletSpeed, 1, false));
  }
  game.audio.bossWarn();
};

/* ------------------------------------------------------------------ */
/* flow: start / restart / pause / mute                                */
/* ------------------------------------------------------------------ */

function resetRun() {
  game.player = new Player(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.sparks = [];
  game.hearts = [];
  game.particles = [];
  game.floatTexts = [];
  game.score = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.comboMult = 1;
  game.kills = 0;
  game.shotsFired = 0;
  game.upgradesTaken = [];
  game.boss = null;
  game.bossQueued = false;
  game.banner = '';
  game.bannerTimer = 0;
  game.shake = 0;
  game.hurtFlash = 0;
  game.paused = false;
}

function startGame() {
  game.audio.unlock();
  game.audio.click();
  resetRun();
  game.state = 'playing';
  game.ui.showPlaying();
  startWave(game, 1);
}

function togglePause() {
  if (game.state !== 'playing') return;
  game.paused = !game.paused;
  game.ui.showPause(game.paused);
}

function toggleMute() {
  game.muted = game.audio.toggleMuted();
  game.ui.setMuteIcon(game.muted);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('mute-btn').addEventListener('click', toggleMute);

/* ------------------------------------------------------------------ */
/* autopilot — drives the lumen in shot / soak mode (no human input)   */
/* ------------------------------------------------------------------ */

function nearestEnemy() {
  let bestE = null;
  let bestD = Infinity;
  for (const e of game.enemies) {
    const d = dist2(e.x, e.y, game.player.x, game.player.y);
    if (d < bestD) {
      bestD = d;
      bestE = e;
    }
  }
  return bestE;
}

function autopilot() {
  const p = game.player;
  const input = game.input;
  const foe = nearestEnemy();
  // Aim at the nearest enemy; hold fire while one exists.
  if (foe) {
    input.mouse.x = foe.x;
    input.mouse.y = foe.y;
    input.mouse.down = true;
  } else {
    input.mouse.down = false;
  }
  // Move: drift toward the arena centre, kite away when a foe gets close.
  let mx = (CONFIG.canvas.width / 2 - p.x) / 400;
  let my = (CONFIG.canvas.height / 2 - p.y) / 400;
  if (foe) {
    const d = Math.sqrt(dist2(foe.x, foe.y, p.x, p.y)) || 1;
    if (d < 190) {
      mx += (p.x - foe.x) / d;
      my += (p.y - foe.y) / d;
    } else if (d > 320) {
      mx += (foe.x - p.x) / d * 0.7;
      my += (foe.y - p.y) / d * 0.7;
    }
  }
  const len = Math.hypot(mx, my) || 1;
  input.keys.clear();
  if (mx / len > 0.3) input.keys.add('KeyD');
  if (mx / len < -0.3) input.keys.add('KeyA');
  if (my / len > 0.3) input.keys.add('KeyS');
  if (my / len < -0.3) input.keys.add('KeyW');
  // Dash when something is close and the dash is ready.
  if (foe && p.dashCooldown <= 0) {
    const d = Math.sqrt(dist2(foe.x, foe.y, p.x, p.y)) || 1;
    if (d < 150) p.tryDash(input);
  }
}

/* ------------------------------------------------------------------ */
/* per-frame update                                                    */
/* ------------------------------------------------------------------ */

function update(dt) {
  game.time += dt;
  if (game.bannerTimer > 0) game.bannerTimer -= dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 34);
  if (game.hurtFlash > 0) game.hurtFlash = Math.max(0, game.hurtFlash - dt * 2.2);

  // Particles and floating text animate in every state.
  for (const pt of game.particles) pt.update(dt);
  game.particles = game.particles.filter((pt) => !pt.dead);
  for (const ft of game.floatTexts) ft.update(dt);
  game.floatTexts = game.floatTexts.filter((ft) => !ft.dead);

  if (game.state === 'title') {
    // Gentle idle: the lumen bobs at the centre, sparks drift by.
    game.player.x = CONFIG.canvas.width / 2 + Math.sin(game.time * 0.7) * 24;
    game.player.y = CONFIG.canvas.height / 2 + 40 + Math.cos(game.time * 0.9) * 12;
    return;
  }
  if (game.state !== 'playing' || game.paused) return;

  const input = game.input;
  const p = game.player;

  if (SHOT === 'play' || SOAK) autopilot();

  // Dash on Space / Shift.
  if (input.wasPressed('Space') || input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) {
    if (p.tryDash(input)) game.audio.dash();
  }

  p.update(dt, input, game.arena);

  // Shooting: hold the mouse to fire toward it.
  if (input.mouse.down && p.fireTimer <= 0 && p.alive) {
    p.fireTimer = 1 / p.fireRate;
    const a = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
    const bx = p.x + Math.cos(a) * (p.radius + 6);
    const by = p.y + Math.sin(a) * (p.radius + 6);
    game.bullets.push(new Bullet(bx, by, a, CONFIG.player.bulletSpeed, p.bulletDamage, true));
    game.shotsFired += 1;
    game.audio.shoot();
  }

  updateSpawning(game, dt);

  for (const e of game.enemies) e.update(dt, p, game);
  for (const b of game.bullets) b.update(dt);
  for (const b of game.enemyBullets) b.update(dt);
  for (const s of game.sparks) s.update(dt, p);
  for (const h of game.hearts) h.update(dt, p);

  // Combo decay.
  if (game.combo > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) {
      game.combo = 0;
      game.comboMult = 1;
    }
  }

  // Sparks: collect the ones that reached the player.
  for (const s of game.sparks) {
    if (s.dead && s.collected) collectSpark(s);
  }
  game.sparks = game.sparks.filter((s) => !s.dead);
  for (const h of game.hearts) {
    if (h.dead && h.collected) collectHeart(h);
  }
  game.hearts = game.hearts.filter((h) => !h.dead);

  // Bullets vs enemies.
  for (let bi = game.bullets.length - 1; bi >= 0; bi--) {
    const b = game.bullets[bi];
    if (b.dead) continue;
    for (let ei = game.enemies.length - 1; ei >= 0; ei--) {
      const e = game.enemies[ei];
      const rr = b.radius + e.radius;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        b.dead = true;
        e.hp -= b.damage;
        e.flash = 0.09;
        burst(b.x, b.y, '#ffffff', 4, 160, 0.25, 2);
        if (e.hp <= 0) killEnemy(e, ei);
        break;
      }
    }
  }
  game.bullets = game.bullets.filter((b) => !b.dead && b.x > -20 && b.x < CONFIG.canvas.width + 20 && b.y > -20 && b.y < CONFIG.canvas.height + 20);

  // Enemies touching the player.
  for (const e of game.enemies) {
    const rr = e.radius + p.radius - 2;
    if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
      damagePlayer(e.x, e.y);
      // Knock the enemy back a little so one touch is one hit.
      const d = Math.sqrt(dist2(e.x, e.y, p.x, p.y)) || 1;
      e.x += ((e.x - p.x) / d) * 26;
      e.y += ((e.y - p.y) / d) * 26;
    }
  }

  // Enemy bullets vs the player.
  for (const b of game.enemyBullets) {
    if (b.dead) continue;
    const rr = b.radius + p.radius - 2;
    if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
      b.dead = true;
      damagePlayer(b.x, b.y);
    }
  }
  game.enemyBullets = game.enemyBullets.filter((b) => !b.dead && b.x > -30 && b.x < CONFIG.canvas.width + 30 && b.y > -30 && b.y < CONFIG.canvas.height + 30);

  game.ui.update(game);
}

/* ------------------------------------------------------------------ */
/* keyboard shortcuts (title / pause / mute / restart / draft keys)    */
/* ------------------------------------------------------------------ */

function onKeyShortcuts() {
  const input = game.input;
  if (input.wasPressed('KeyM')) toggleMute();
  if (game.state === 'title' && (input.wasPressed('Enter') || input.wasPressed('Space'))) {
    startGame();
    return;
  }
  if (game.state === 'gameover' && (input.wasPressed('KeyR') || input.wasPressed('Enter'))) {
    startGame();
    return;
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) togglePause();
  if (game.state === 'draft') {
    const n = input.wasPressed('Digit1') ? 0 : input.wasPressed('Digit2') ? 1 : input.wasPressed('Digit3') ? 2 : -1;
    if (n >= 0) {
      const btn = document.querySelectorAll('#draft-cards .card')[n];
      if (btn) btn.click();
    }
  }
}

/* ------------------------------------------------------------------ */
/* screenshot scenes (?shot=) — deterministic demo states              */
/* ------------------------------------------------------------------ */

function buildShotScene() {
  const rng = makeRng(SEED);
  const arena = game.arena;
  const cx = CONFIG.canvas.width / 2;
  const cy = CONFIG.canvas.height / 2;
  if (SHOT === 'title') {
    game.state = 'title';
    game.ui.showTitle(3420);
    for (let i = 0; i < 8; i++) {
      game.sparks.push(new Spark(cx + rng.range(-320, 320), cy + rng.range(-200, 220), 10, rng));
    }
    return;
  }
  if (SHOT === 'play') {
    resetRun();
    game.state = 'playing';
    game.score = 1250;
    game.best = 1250;
    game.combo = 7;
    game.comboTimer = CONFIG.combo.window;
    game.comboMult = comboMult();
    game.wave = 3;
    game.waveActive = true;
    game.ui.showPlaying();
    game.ui.setWave(3);
    game.player.x = cx;
    game.player.y = cy + 40;
    const spots = [
      ['chaser', cx - 260, cy - 120],
      ['chaser', cx + 300, cy + 60],
      ['orbiter', cx + 180, cy - 190],
      ['splitter', cx - 180, cy + 170],
      ['spitter', cx + 330, cy - 60],
    ];
    for (const [kind, x, y] of spots) game.enemies.push(new Enemy(kind, x, y, 3));
    for (let i = 0; i < 10; i++) {
      game.sparks.push(new Spark(cx + rng.range(-300, 300), cy + rng.range(-220, 220), 10, rng));
    }
    burst(cx - 260, cy - 120, '#ff2e88', 8, 200, 0.5, 3);
    game.ui.update(game); // HUD shows the scene's score, combo and hearts
    return;
  }
  if (SHOT === 'draft') {
    resetRun();
    game.state = 'draft';
    game.score = 2180;
    game.best = 2180;
    game.wave = 2;
    game.ui.setWave(2);
    game.player.x = cx;
    game.player.y = cy + 60;
    for (let i = 0; i < 6; i++) {
      game.sparks.push(new Spark(cx + rng.range(-260, 260), cy + rng.range(-180, 180), 10, rng));
    }
    const cards = rollDraft(game);
    game.ui.showDraft(cards, () => {});
    game.ui.update(game); // HUD shows the scene's score and wave
    return;
  }
  if (SHOT === 'gameover') {
    resetRun();
    game.state = 'gameover';
    game.score = 3420;
    game.best = 3420;
    game.wave = 7;
    game.player.alive = false;
    game.player.hp = 0; // the lumen died: empty hearts in the HUD
    game.ui.setWave(7);
    game.ui.showGameOver(3420, 3420, 7);
    burst(cx, cy, '#22e6ff', 30, 300, 0.8, 3);
    game.ui.update(game);
    return;
  }
}

/* ------------------------------------------------------------------ */
/* main loop                                                           */
/* ------------------------------------------------------------------ */

let last = performance.now();
let frames = 0;
let soakTime = 0;

function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 1 / 30);
  last = now;
  onKeyShortcuts();
  update(dt);
  drawWorld(ctx, game, game.time);
  // Consume one-frame presses here (not inside update) so a key pressed
  // on the title, draft or game-over screen cannot stick and re-fire.
  game.input.endFrame();
  frames += 1;
  if (SHOT && frames === 3) {
    // A few frames in, the scene is fully rendered: flag it for the shot.
    window.__shotReady = true;
    const status = document.getElementById('test-status');
    if (status) status.textContent = `READY shot=${SHOT} errors=${window.__errors.length}`;
  }
  if (SOAK) {
    soakTime += dt;
    // Keep playing through drafts: pick the first card each time one opens.
    if (game.state === 'draft') {
      const first = document.querySelector('#draft-cards .card');
      if (first) first.click();
    }
    if (soakTime >= 60 && !window.__soakDone) {
      window.__soakDone = true;
      window.__shotReady = true;
      const msg = `SOAK DONE wave=${game.wave} score=${game.score} kills=${game.kills} shots=${game.shotsFired} state=${game.state} errors=${window.__errors.length}`;
      document.title = msg;
      const status = document.getElementById('test-status');
      if (status) status.textContent = msg;
    }
  }
  requestAnimationFrame(frame);
}

// Boot.
if (SHOT) {
  buildShotScene();
} else if (SOAK) {
  startGame();
  // Soak runs muted with no gesture: re-mute (startGame unlocked audio).
  game.audio.setMuted(true);
} else {
  game.ui.showTitle(game.best);
}
requestAnimationFrame(frame);

// Debug handle for the headless playtests (and for curious players).
window.__lumen = {
  game,
  version: '1.0.0',
  start: startGame,
  state: () => game.state,
  errors: () => window.__errors,
};
