// world.js — waves, spawning, the boss, and the upgrade draft.
// The game object owns the entity lists; these functions drive them.

import { CONFIG } from './config.js';
import { Enemy } from './entities.js';

/** The arena rectangle the player and enemies stay inside. */
export function makeArena() {
  const m = CONFIG.arena.margin;
  return {
    x: m,
    y: m,
    w: CONFIG.canvas.width - m * 2,
    h: CONFIG.canvas.height - m * 2,
  };
}

/** Pick a spawn point on the arena edge, away from the player. */
export function edgeSpawn(arena, player, rng) {
  for (let tries = 0; tries < 12; tries++) {
    const side = rng.int(0, 3);
    let x;
    let y;
    if (side === 0) {
      x = rng.range(arena.x, arena.x + arena.w);
      y = arena.y + 8;
    } else if (side === 1) {
      x = rng.range(arena.x, arena.x + arena.w);
      y = arena.y + arena.h - 8;
    } else if (side === 2) {
      x = arena.x + 8;
      y = rng.range(arena.y, arena.y + arena.h);
    } else {
      x = arena.x + arena.w - 8;
      y = rng.range(arena.y, arena.y + arena.h);
    }
    const dx = x - player.x;
    const dy = y - player.y;
    if (dx * dx + dy * dy > 320 * 320) return { x, y };
  }
  return { x: arena.x + 8, y: arena.y + 8 };
}

/** How many enemies wave n holds (boss waves add the boss on top). */
export function waveCount(n) {
  return CONFIG.wave.baseCount + CONFIG.wave.countPerWave * (n - 1);
}

/** The kinds wave n may spawn, in unlock order. */
export function waveKinds(n) {
  return Object.entries(CONFIG.wave.unlocks)
    .filter(([, firstWave]) => n >= firstWave)
    .map(([kind]) => kind);
}

/** Weighted pick of a kind for this wave (chasers stay common). */
export function pickKind(n, rng) {
  const kinds = waveKinds(n);
  const weights = { chaser: 4, orbiter: 3, splitter: 2, spitter: 2 };
  let total = 0;
  for (const k of kinds) total += weights[k] || 1;
  let roll = rng.next() * total;
  for (const k of kinds) {
    roll -= weights[k] || 1;
    if (roll <= 0) return k;
  }
  return kinds[0];
}

/**
 * Start wave n on the game: reset the spawn queue, arm the aegis shield,
 * and (every 5th wave) queue the boss with a warning.
 */
export function startWave(game, n) {
  game.wave = n;
  game.waveActive = true;
  game.spawnQueue = waveCount(n);
  game.spawnTimer = 0.4;
  game.boss = null;
  game.player.shield = game.upgradesTaken.includes('aegis');
  if (n % CONFIG.wave.bossEvery === 0) {
    game.bossQueued = true;
    game.bossWarnTimer = 1.2;
    game.audio.bossWarn();
    game.banner = `WAVE ${n} — ${CONFIG.boss.warnText}`;
    game.bannerTimer = 2.2;
  } else {
    game.bossQueued = false;
    game.banner = `WAVE ${n}`;
    game.bannerTimer = 1.6;
  }
  game.ui.setWave(n);
}

/** Feed the spawn queue while the wave runs; queue the boss mid-wave. */
export function updateSpawning(game, dt) {
  if (!game.waveActive) return;
  if (game.bossQueued) {
    game.bossWarnTimer -= dt;
    if (game.bossWarnTimer <= 0) {
      game.bossQueued = false;
      const arena = game.arena;
      const boss = new Enemy('boss', arena.x + arena.w / 2, arena.y + 70, game.wave);
      game.enemies.push(boss);
      game.boss = boss;
      game.ui.setBoss(boss);
    }
  }
  if (game.spawnQueue > 0) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      game.spawnTimer = CONFIG.wave.spawnInterval;
      game.spawnQueue -= 1;
      const kind = pickKind(game.wave, game.rng);
      const pos = edgeSpawn(game.arena, game.player, game.rng);
      game.enemies.push(new Enemy(kind, pos.x, pos.y, game.wave));
    }
  }
  // Wave clears when nothing is left to spawn and nothing is alive.
  if (game.spawnQueue <= 0 && game.enemies.length === 0 && !game.bossQueued) {
    game.waveActive = false;
    game.onWaveCleared();
  }
}

/** Roll 3 distinct upgrade cards for the draft (seeded RNG in shot mode). */
export function rollDraft(game) {
  const pool = [...CONFIG.upgrades];
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(game.rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

/** Apply an upgrade's effect to the player / game. */
export function applyUpgrade(game, id) {
  const p = game.player;
  switch (id) {
    case 'swift':
      p.speed *= 1.15;
      break;
    case 'rapid':
      p.fireRate *= 1.2;
      break;
    case 'heavy':
      p.bulletDamage += 1;
      break;
    case 'magnet':
      p.magnetRadius += 70;
      break;
    case 'greed':
      p.sparkValue *= 2;
      break;
    case 'dash':
      p.dashCooldownMax *= 0.75;
      break;
    case 'vitality':
      p.maxHp += 1;
      p.hp = Math.min(p.maxHp, p.hp + 1);
      break;
    case 'aegis':
      p.shield = true;
      game.upgradesTaken.push('aegis');
      break;
    default:
      break;
  }
  game.audio.click();
}
