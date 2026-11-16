// entities.js — the things that live in the arena: player, enemies,
// bullets, sparks, hearts, particles and floating score text.
// Factories build them; update functions move them and resolve their
// collisions against the shared game state G (created in main.js).

import { CFG } from './config.js';
import { clamp, dist, dist2, angleTo, randRange } from './utils.js';

/** Fresh player in the middle of the arena. */
export function makePlayer(G) {
  return {
    x: CFG.W / 2,
    y: CFG.H / 2,
    vx: 0,
    vy: 0,
    r: CFG.PLAYER_RADIUS,
    hp: CFG.PLAYER_HP,
    maxHp: CFG.PLAYER_HP,
    speed: CFG.PLAYER_SPEED,
    fireRate: CFG.PLAYER_FIRE_RATE,
    dmg: CFG.PLAYER_BULLET_DAMAGE,
    sparkMult: 1,
    magnetR: CFG.PLAYER_MAGNET_RADIUS,
    dashCharges: CFG.DASH_MAX_CHARGES,
    maxDash: CFG.DASH_MAX_CHARGES,
    dashRecharge: 0,
    dashCd: 0,
    dashTime: 0,
    dashDx: 0,
    dashDy: -1,
    invuln: 0,
    shield: false,
    fireTimer: 0,
    aimAngle: -Math.PI / 2,
    trail: 0,
  };
}

/** Enemy stat block for a type at a given wave. */
export function enemyStats(type, wave) {
  const base = CFG.ENEMIES[type];
  const hpMul = 1 + CFG.ENEMY_HP_GROWTH * (wave - 1);
  const spMul = 1 + CFG.ENEMY_SPEED_GROWTH * (wave - 1);
  return {
    hp: Math.max(1, Math.round(base.hp * hpMul)),
    speed: base.speed * spMul,
    radius: base.radius,
    sparks: base.sparks,
    color: base.color,
    score: base.score,
  };
}

/** Fresh enemy of `type` at (x, y) for wave `wave`. */
export function makeEnemy(G, type, x, y) {
  const s = enemyStats(type, G.wave);
  return {
    type,
    x, y,
    vx: 0, vy: 0,
    r: s.radius,
    hp: s.hp,
    maxHp: s.hp,
    speed: s.speed,
    color: s.color,
    sparks: s.sparks,
    score: s.score,
    // Per-type behaviour state.
    orbitAngle: G.rng() * Math.PI * 2,
    orbitDir: G.rng() < 0.5 ? 1 : -1,
    shotTimer: randRange(G.rng, 1.2, 2.4),
    burstTimer: CFG.BOSS_BURST_INTERVAL,
    flash: 0, // white hit-flash timer
    wobble: G.rng() * Math.PI * 2,
  };
}

/** Fresh player bullet from the player toward (tx, ty). */
export function makeBullet(G, tx, ty) {
  const p = G.player;
  const a = angleTo(p.x, p.y, tx, ty);
  return {
    x: p.x + Math.cos(a) * (p.r + 6),
    y: p.y + Math.sin(a) * (p.r + 6),
    vx: Math.cos(a) * CFG.PLAYER_BULLET_SPEED,
    vy: Math.sin(a) * CFG.PLAYER_BULLET_SPEED,
    r: CFG.PLAYER_BULLET_RADIUS,
    dmg: p.dmg,
    life: CFG.PLAYER_BULLET_LIFE,
  };
}

/** Fresh enemy projectile from (x, y) toward (tx, ty). */
export function makeEnemyBullet(x, y, tx, ty, speed) {
  const a = angleTo(x, y, tx, ty);
  return {
    x, y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    r: CFG.SPITTER_BULLET_RADIUS,
    life: 6,
  };
}

/** A spark pickup (score) at (x, y). */
export function makeSpark(G, x, y, value) {
  return {
    x, y,
    vx: randRange(G.rng, -30, 30),
    vy: randRange(G.rng, -30, 30),
    r: CFG.SPARK_RADIUS,
    value: value || 1,
    life: 14,
    phase: G.rng() * Math.PI * 2,
  };
}

/** A heart pickup (heals 1) at (x, y). */
export function makeHeart(G, x, y) {
  return { x, y, vx: 0, vy: -14, r: CFG.HEART_RADIUS, life: 12, phase: G.rng() * Math.PI * 2 };
}

/** One particle for hits, deaths and pickups. */
export function spawnParticles(G, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    if (G.parts.length >= CFG.PARTICLE_CAP) return;
    const a = G.rng() * Math.PI * 2;
    const sp = randRange(G.rng, speed * 0.3, speed);
    G.parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: randRange(G.rng, 0.3, 0.7),
      maxLife: 0.7,
      color,
      size: randRange(G.rng, 2, 4.5),
    });
  }
}

/** Floating "+N" score text. */
export function spawnFloat(G, x, y, text, color) {
  if (G.floats.length >= CFG.FLOAT_CAP) G.floats.shift();
  G.floats.push({ x, y, text, color: color || '#ffe9a8', life: 0.9, maxLife: 0.9 });
}

/** Drop sparks (and sometimes a heart) where an enemy died. */
export function dropLoot(G, e) {
  for (let i = 0; i < e.sparks; i++) {
    const a = G.rng() * Math.PI * 2;
    const d = randRange(G.rng, 6, 30);
    G.sparks.push(makeSpark(G, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 1));
  }
  if (e.type === 'boss' || G.rng() < CFG.HEART_DROP_CHANCE) {
    G.hearts.push(makeHeart(G, e.x, e.y));
  }
}

/** Kill an enemy: loot, particles, score, splitter children, sound. */
export function killEnemy(G, e, awardScore) {
  spawnParticles(G, e.x, e.y, e.color, e.type === 'boss' ? 46 : 16, e.type === 'boss' ? 320 : 220);
  spawnParticles(G, e.x, e.y, '#ffffff', 6, 140);
  dropLoot(G, e);
  if (awardScore) {
    G.score += e.score;
    G.stats.kills += 1;
    spawnFloat(G, e.x, e.y - e.r - 6, '+' + e.score, '#ffffff');
  }
  if (e.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const m = makeEnemy(G, 'mini', e.x + (i === 0 ? -12 : 12), e.y);
      m.vx = (i === 0 ? -1 : 1) * 120;
      G.enemies.push(m);
    }
  }
  G.sfx.pop();
}

/** Hurt the player. Returns true when the player died. */
export function damagePlayer(G, fromX, fromY) {
  const p = G.player;
  if (p.invuln > 0 || p.dashTime > 0 || G.mode !== 'playing') return false;
  if (p.shield) {
    p.shield = false;
    p.invuln = 0.7;
    spawnParticles(G, p.x, p.y, '#8fd8ff', 18, 240);
    spawnFloat(G, p.x, p.y - 24, 'SHIELD!', '#8fd8ff');
    G.sfx.hit();
    return false;
  }
  p.hp -= 1;
  p.invuln = CFG.HIT_INVULN;
  G.shake = CFG.SHAKE_ON_HIT;
  G.flash = 0.55;
  // Knock the player away from the hit.
  const a = angleTo(fromX, fromY, p.x, p.y);
  p.vx += Math.cos(a) * 320;
  p.vy += Math.sin(a) * 320;
  spawnParticles(G, p.x, p.y, '#ff4d6d', 22, 280);
  G.sfx.hit();
  if (p.hp <= 0) return true;
  return false;
}

/** Move the player: input, dash, firing, magnet. dt in seconds. */
export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.trail = Math.max(0, p.trail - dt);

  // Recharge dash charges.
  if (p.dashCharges < p.maxDash) {
    p.dashRecharge += dt;
    if (p.dashRecharge >= CFG.DASH_RECHARGE) {
      p.dashRecharge = 0;
      p.dashCharges += 1;
    }
  }

  // Aim follows the mouse.
  p.aimAngle = angleTo(p.x, p.y, input.mouseX, input.mouseY);

  // Dash trigger: Space or Shift, with a charge ready.
  if (input.pressed(' ', 'Shift') && p.dashCharges > 0 && p.dashCd <= 0 && p.dashTime <= 0) {
    const mv = input.moveVector();
    let dx = mv.x;
    let dy = mv.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.aimAngle);
      dy = Math.sin(p.aimAngle);
    }
    p.dashDx = dx;
    p.dashDy = dy;
    p.dashTime = CFG.DASH_TIME;
    p.dashCd = CFG.DASH_COOLDOWN;
    p.dashCharges -= 1;
    p.invuln = Math.max(p.invuln, CFG.DASH_IFRAMES);
    p.trail = 0.3;
    spawnParticles(G, p.x, p.y, '#59f7ff', 10, 160);
    G.sfx.dash();
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.vx = p.dashDx * CFG.DASH_SPEED;
    p.vy = p.dashDy * CFG.DASH_SPEED;
    if (G.rng() < 0.7 && G.parts.length < CFG.PARTICLE_CAP) {
      G.parts.push({
        x: p.x, y: p.y, vx: -p.dashDx * 40, vy: -p.dashDy * 40,
        life: 0.3, maxLife: 0.3, color: '#59f7ff', size: 5,
      });
    }
  } else {
    const mv = input.moveVector();
    const tx = mv.x * p.speed;
    const ty = mv.y * p.speed;
    const k = 1 - Math.pow(0.0001, dt); // smooth approach to target velocity
    p.vx = p.vx + (tx - p.vx) * k;
    p.vy = p.vy + (ty - p.vy) * k;
  }

  p.x = clamp(p.x + p.vx * dt, CFG.ARENA_MARGIN + p.r, CFG.W - CFG.ARENA_MARGIN - p.r);
  p.y = clamp(p.y + p.vy * dt, CFG.ARENA_MARGIN + p.r, CFG.H - CFG.ARENA_MARGIN - p.r);

  // Hold mouse to fire.
  p.fireTimer -= dt;
  if (input.mouseDown && p.fireTimer <= 0) {
    p.fireTimer = 1 / p.fireRate;
    G.bullets.push(makeBullet(G, input.mouseX, input.mouseY));
    G.stats.shots += 1;
    G.sfx.shoot();
  }

  // Combo decay.
  if (G.combo > 0) {
    G.comboTimer -= dt;
    if (G.comboTimer <= 0) {
      G.combo = 0;
      G.comboTimer = 0;
    }
  }
}

/** Move one enemy according to its type. dt in seconds. */
export function updateEnemy(G, e, dt) {
  const p = G.player;
  e.flash = Math.max(0, e.flash - dt);
  e.wobble += dt;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / d;
  const ny = dy / d;

  if (e.type === 'chaser' || e.type === 'mini') {
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
  } else if (e.type === 'orbiter') {
    e.orbitAngle += dt * e.orbitDir * 1.7;
    const want = 150;
    const tx = p.x + Math.cos(e.orbitAngle) * want;
    const ty = p.y + Math.sin(e.orbitAngle) * want;
    e.vx = (tx - e.x) * 2.2;
    e.vy = (ty - e.y) * 2.2;
  } else if (e.type === 'splitter') {
    const wob = Math.sin(e.wobble * 2.4) * 0.6;
    e.vx = (nx + -ny * wob) * e.speed;
    e.vy = (ny + nx * wob) * e.speed;
  } else if (e.type === 'spitter') {
    // Keep about 280 px away, strafe sideways, shoot.
    const want = 280;
    const radial = (d - want) / want;
    e.vx = nx * radial * e.speed * 2 + -ny * 46;
    e.vy = ny * radial * e.speed * 2 + nx * 46;
    e.shotTimer -= dt;
    if (e.shotTimer <= 0 && d < 520) {
      e.shotTimer = CFG.SPITTER_SHOT_INTERVAL * (0.9 + G.rng() * 0.3);
      G.ebullets.push(makeEnemyBullet(e.x, e.y, p.x, p.y, CFG.SPITTER_BULLET_SPEED));
    }
  } else if (e.type === 'boss') {
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      e.burstTimer = CFG.BOSS_BURST_INTERVAL;
      const n = CFG.BOSS_BURST_COUNT;
      const off = G.rng() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        G.ebullets.push({
          x: e.x + Math.cos(a) * (e.r + 4),
          y: e.y + Math.sin(a) * (e.r + 4),
          vx: Math.cos(a) * CFG.BOSS_BULLET_SPEED,
          vy: Math.sin(a) * CFG.BOSS_BULLET_SPEED,
          r: CFG.SPITTER_BULLET_RADIUS,
          life: 7,
        });
      }
      G.sfx.pop();
    }
  }

  e.x = clamp(e.x + e.vx * dt, CFG.ARENA_MARGIN + e.r, CFG.W - CFG.ARENA_MARGIN - e.r);
  e.y = clamp(e.y + e.vy * dt, CFG.ARENA_MARGIN + e.r, CFG.H - CFG.ARENA_MARGIN - e.r);
}

/** Move bullets, sparks, hearts, particles and floats; resolve pickups. */
export function updateProjectiles(G, dt) {
  const p = G.player;

  // Player bullets.
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 8 || b.x > CFG.W - 8 || b.y < 8 || b.y > CFG.H - 8;
    if (!dead) {
      for (let j = G.enemies.length - 1; j >= 0; j--) {
        const e = G.enemies[j];
        if (dist2(b.x, b.y, e.x, e.y) < (b.r + e.r) * (b.r + e.r)) {
          e.hp -= b.dmg;
          e.flash = 0.09;
          spawnParticles(G, b.x, b.y, e.color, 4, 120);
          dead = true;
          if (e.hp <= 0) {
            killEnemy(G, e, true);
            G.enemies.splice(j, 1);
          }
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }

  // Enemy bullets.
  for (let i = G.ebullets.length - 1; i >= 0; i--) {
    const b = G.ebullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 4 || b.x > CFG.W - 4 || b.y < 4 || b.y > CFG.H - 4;
    if (!dead && dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
      dead = true;
      if (damagePlayer(G, b.x - b.vx, b.y - b.vy)) G.pendingGameOver = true;
    }
    if (dead) G.ebullets.splice(i, 1);
  }

  // Enemy body contact with the player.
  for (const e of G.enemies) {
    if (dist2(e.x, e.y, p.x, p.y) < (e.r + p.r - 2) * (e.r + p.r - 2)) {
      if (damagePlayer(G, e.x, e.y)) G.pendingGameOver = true;
      break;
    }
  }

  // Sparks: drift, magnet toward the player, collect.
  const mult = 1 + Math.min(G.combo, 40) * CFG.COMBO_STEP;
  for (let i = G.sparks.length - 1; i >= 0; i--) {
    const s = G.sparks[i];
    s.life -= dt;
    const d2 = dist2(s.x, s.y, p.x, p.y);
    const magnetR = p.magnetR;
    if (d2 < magnetR * magnetR) {
      const d = Math.max(1, Math.sqrt(d2));
      const pull = CFG.SPARK_MAGNET_SPEED * (1 - d / (magnetR + 60));
      s.vx += ((p.x - s.x) / d) * pull * dt * 6;
      s.vy += ((p.y - s.y) / d) * pull * dt * 6;
    } else {
      s.vx *= 1 - 2.4 * dt;
      s.vy *= 1 - 2.4 * dt;
      s.vx += Math.sin(G.time * 1.7 + s.phase) * CFG.SPARK_DRIFT * dt;
      s.vy += Math.cos(G.time * 1.3 + s.phase) * CFG.SPARK_DRIFT * dt;
    }
    s.x = clamp(s.x + s.vx * dt, 14, CFG.W - 14);
    s.y = clamp(s.y + s.vy * dt, 14, CFG.H - 14);
    if (s.life <= 0) {
      G.sparks.splice(i, 1);
      continue;
    }
    if (d2 < (p.r + s.r + 2) * (p.r + s.r + 2)) {
      const gain = Math.round(CFG.PLAYER_SPARK_VALUE * p.sparkMult * mult);
      G.score += gain;
      G.combo += 1;
      G.comboTimer = CFG.COMBO_WINDOW;
      G.stats.pickups += 1;
      spawnFloat(G, s.x, s.y - 10, '+' + gain, '#ffd34d');
      spawnParticles(G, s.x, s.y, '#ffd34d', 5, 130);
      G.sfx.pickup(G.combo);
      G.sparks.splice(i, 1);
    }
  }

  // Hearts: bob down slowly, heal on collect.
  for (let i = G.hearts.length - 1; i >= 0; i--) {
    const h = G.hearts[i];
    h.life -= dt;
    h.y += h.vy * dt;
    if (h.life <= 0) {
      G.hearts.splice(i, 1);
      continue;
    }
    if (dist2(h.x, h.y, p.x, p.y) < (p.r + h.r + 2) * (p.r + h.r + 2)) {
      if (p.hp < p.maxHp) {
        p.hp += 1;
        spawnFloat(G, p.x, p.y - 26, '+1 HP', '#ff7fa5');
      } else {
        G.score += 50;
        spawnFloat(G, p.x, p.y - 26, '+50', '#ff7fa5');
      }
      spawnParticles(G, h.x, h.y, '#ff7fa5', 10, 150);
      G.hearts.splice(i, 1);
    }
  }

  // Particles.
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const pt = G.parts[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 1 - 2.2 * dt;
    pt.vy *= 1 - 2.2 * dt;
    if (pt.life <= 0) G.parts.splice(i, 1);
  }

  // Floating texts.
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) G.floats.splice(i, 1);
  }

  G.shake = Math.max(0, G.shake - CFG.SHAKE_DECAY * dt);
  G.flash = Math.max(0, G.flash - dt * 1.6);
}
