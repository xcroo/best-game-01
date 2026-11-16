// world.js — waves, spawning, the boss, and the upgrade draft.
// Owns the wave lifecycle: build a wave's spawn queue, trickle enemies
// in, detect a cleared wave, roll three draft cards and apply the pick.

import { CFG } from './config.js';
import { makeEnemy, makeSpark } from './entities.js';
import { clamp, randRange, shuffled } from './utils.js';

/** Enemy types unlocked by wave number. */
export function unlockedTypes(wave) {
  const types = ['chaser'];
  if (wave >= 2) types.push('orbiter');
  if (wave >= 3) types.push('splitter');
  if (wave >= 4) types.push('spitter');
  return types;
}

/** Build the spawn queue for wave `n` and start it. */
export function startWave(G, n) {
  G.wave = n;
  G.waveActive = true;
  G.spawnQueue = [];
  G.spawnTimer = 0.4;
  G.waveBanner = CFG.WAVE_BANNER_TIME; // seconds the "WAVE N" banner shows
  G.player.shield = G.owned.aegis > 0; // aegis refreshes every wave
  const isBoss = n % CFG.BOSS_EVERY === 0;
  const count = CFG.WAVE_BASE_COUNT + CFG.WAVE_GROWTH * (n - 1);
  const types = unlockedTypes(n);
  if (isBoss) {
    G.spawnQueue.push({ type: 'boss', delay: 0.5 });
    for (let i = 0; i < 4; i++) {
      G.spawnQueue.push({ type: 'chaser', delay: 1.2 + i * 0.9 });
    }
    G.sfx.bossWarn();
  } else {
    for (let i = 0; i < count; i++) {
      const t = types[Math.floor(G.rng() * types.length)];
      G.spawnQueue.push({ type: t, delay: 0.3 + i * CFG.WAVE_SPAWN_INTERVAL * (0.8 + G.rng() * 0.5) });
    }
  }
  // Shuffle the non-boss queue so the wave mixes types.
  if (!isBoss) G.spawnQueue = shuffled(G.rng, G.spawnQueue);
}

/** A spawn point on the arena edge, far from the player. */
export function spawnPoint(G) {
  const p = G.player;
  const m = CFG.ARENA_MARGIN + 24;
  for (let tries = 0; tries < 12; tries++) {
    const side = Math.floor(G.rng() * 4);
    let x;
    let y;
    if (side === 0) { x = randRange(G.rng, m, CFG.W - m); y = m; }
    else if (side === 1) { x = randRange(G.rng, m, CFG.W - m); y = CFG.H - m; }
    else if (side === 2) { x = m; y = randRange(G.rng, m, CFG.H - m); }
    else { x = CFG.W - m; y = randRange(G.rng, m, CFG.H - m); }
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy > 320 * 320) return { x, y };
  }
  return { x: m, y: m };
}

/** Trickle the queue in; return true when the wave is fully cleared. */
export function updateWaves(G, dt) {
  if (G.waveBanner > 0) G.waveBanner -= dt;
  if (G.spawnQueue.length > 0) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      const next = G.spawnQueue.shift();
      const pt = next.type === 'boss'
        ? { x: CFG.W / 2, y: CFG.ARENA_MARGIN + 90 }
        : spawnPoint(G);
      const e = makeEnemy(G, next.type, pt.x, pt.y);
      G.enemies.push(e);
      if (next.type === 'boss') G.boss = e;
      G.spawnTimer = next.delay;
    }
  }
  if (G.boss && G.boss.hp <= 0) G.boss = null;
  if (G.boss && !G.enemies.includes(G.boss)) G.boss = null;
  if (G.spawnQueue.length === 0 && G.enemies.length === 0 && G.waveActive) {
    G.waveActive = false;
    return true; // wave cleared
  }
  return false;
}

/** Roll three distinct draft cards the player can still take. */
export function rollDraft(G) {
  const owned = G.owned;
  const avail = CFG.UPGRADES.filter((u) => (owned[u.id] || 0) < u.max);
  const pool = shuffled(G.rng, avail);
  const picks = pool.slice(0, 3);
  // If everything is maxed, offer a score bonus card instead.
  while (picks.length < 3) {
    picks.push({ id: 'bonus', name: 'Lumen Hoard', desc: '+500 score right now', max: 99 });
  }
  return picks;
}

/** Apply a draft pick to the player. */
export function applyUpgrade(G, up) {
  const p = G.player;
  G.owned[up.id] = (G.owned[up.id] || 0) + 1;
  switch (up.id) {
    case 'swift':
      p.speed *= 1.18;
      break;
    case 'dash':
      p.maxDash += 1;
      p.dashCharges += 1;
      break;
    case 'magnet':
      p.magnetR += 70;
      break;
    case 'vitality':
      p.maxHp += 1;
      p.hp = Math.min(p.maxHp, p.hp + 1);
      break;
    case 'rich':
      p.sparkMult *= 2;
      break;
    case 'rapid':
      p.fireRate *= 1.25;
      break;
    case 'heavy':
      p.dmg += 1;
      break;
    case 'aegis':
      p.shield = true;
      break;
    case 'bonus':
      G.score += 500;
      break;
    default:
      break;
  }
}

/** Scatter a few sparks across the arena (wave-clear celebration). */
export function celebrateWave(G) {
  for (let i = 0; i < 6; i++) {
    const x = randRange(G.rng, CFG.ARENA_MARGIN + 60, CFG.W - CFG.ARENA_MARGIN - 60);
    const y = randRange(G.rng, CFG.ARENA_MARGIN + 60, CFG.H - CFG.ARENA_MARGIN - 60);
    G.sparks.push(makeSpark(G, x, y, 1));
  }
}

/** Keep the arena's decorative background actors drifting (title screen). */
export function updateBackdrop(G, dt) {
  for (const e of G.enemies) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < 30 || e.x > CFG.W - 30) e.vx *= -1;
    if (e.y < 30 || e.y > CFG.H - 30) e.vy *= -1;
    e.x = clamp(e.x, 24, CFG.W - 24);
    e.y = clamp(e.y, 24, CFG.H - 24);
  }
}
