// entities.js — the moving things of LUMEN DRIFT: player, enemies,
// bullets, sparks, hearts, particles and floating score text.
// Each class owns its own update + draw; the game owns the lists.

import { CONFIG } from './config.js';
import { TAU, angleDiff, clamp, dist, dist2 } from './utils.js';

/** The lumen: a small orb of light with a dash, a gun and 3 hearts. */
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = CONFIG.player.radius;
    this.angle = -Math.PI / 2; // aim angle, toward the mouse
    this.hp = CONFIG.player.maxHp;
    this.maxHp = CONFIG.player.maxHp;
    this.speed = CONFIG.player.speed;
    this.fireRate = CONFIG.player.fireRate;
    this.bulletDamage = CONFIG.player.bulletDamage;
    this.magnetRadius = CONFIG.player.magnetRadius;
    this.sparkValue = CONFIG.player.sparkValue;
    this.dashCooldownMax = CONFIG.player.dashCooldown;
    this.fireTimer = 0;
    this.dashTimer = 0; // >0 while dashing
    this.dashCooldown = 0;
    this.invuln = 0; // seconds of mercy invulnerability left
    this.shield = false; // aegis: blocks one hit per wave
    this.alive = true;
    this.trail = []; // fading afterimages while dashing
  }

  get speedMult() {
    return this.speed / CONFIG.player.speed;
  }

  update(dt, input, arena) {
    const move = input.moveVector();
    const accel = CONFIG.player.accel;
    this.vx += move.x * accel * dt;
    this.vy += move.y * accel * dt;
    // Friction so the lumen stops crisply when the keys lift.
    const damp = Math.exp(-CONFIG.player.friction * dt);
    this.vx *= damp;
    this.vy *= damp;
    // Cap plain movement speed; the dash may exceed it briefly.
    const sp = Math.hypot(this.vx, this.vy);
    const cap = this.dashTimer > 0 ? CONFIG.player.dashSpeed : this.speed;
    if (sp > cap) {
      this.vx = (this.vx / sp) * cap;
      this.vy = (this.vy / sp) * cap;
    }
    this.x = clamp(this.x + this.vx * dt, arena.x + this.radius, arena.x + arena.w - this.radius);
    this.y = clamp(this.y + this.vy * dt, arena.y + this.radius, arena.y + arena.h - this.radius);
    this.angle = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
    this.fireTimer -= dt;
    this.dashCooldown -= dt;
    this.invuln -= dt;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.trail.push({ x: this.x, y: this.y, life: 0.25 });
    }
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter((t) => t.life > 0);
  }

  /** Start a dash toward the current move direction (or the aim if idle). */
  tryDash(input) {
    if (this.dashCooldown > 0 || this.dashTimer > 0) return false;
    let dx = input.moveVector().x;
    let dy = input.moveVector().y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.angle);
      dy = Math.sin(this.angle);
    }
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * CONFIG.player.dashSpeed;
    this.vy = (dy / len) * CONFIG.player.dashSpeed;
    this.dashTimer = CONFIG.player.dashTime;
    this.dashCooldown = this.dashCooldownMax;
    this.invuln = Math.max(this.invuln, CONFIG.player.dashIframes);
    return true;
  }

  draw(ctx, time) {
    // Dash afterimages.
    for (const t of this.trail) {
      ctx.globalAlpha = (t.life / 0.25) * 0.35;
      ctx.fillStyle = CONFIG.colors.player;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Blink while invulnerable.
    if (this.invuln > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.save();
    ctx.shadowColor = CONFIG.colors.player;
    ctx.shadowBlur = 22;
    ctx.fillStyle = CONFIG.colors.player;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Bright core.
    ctx.fillStyle = '#eafdff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, TAU);
    ctx.fill();
    // Aim tick.
    ctx.strokeStyle = 'rgba(174, 252, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x + Math.cos(this.angle) * (this.radius + 2), this.y + Math.sin(this.angle) * (this.radius + 2));
    ctx.lineTo(this.x + Math.cos(this.angle) * (this.radius + 12), this.y + Math.sin(this.angle) * (this.radius + 12));
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
    // Aegis ring.
    if (this.shield) {
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, TAU);
      ctx.stroke();
    }
  }
}

/** One enemy. Behaviour branches on kind; stats scale with the wave. */
export class Enemy {
  constructor(kind, x, y, wave) {
    const base = CONFIG.enemies[kind];
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.radius = base.radius;
    this.color = base.color;
    this.hp = Math.round(base.hp * (1 + CONFIG.wave.hpPerWave * (wave - 1)));
    this.maxHp = this.hp;
    this.speed = base.speed + CONFIG.wave.speedPerWave * (wave - 1);
    if (kind === 'boss') this.hp = this.maxHp = base.hp + CONFIG.boss.hpPerWave * (Math.floor(wave / 5) - 1) + wave * 2;
    this.score = base.score;
    this.sparkDrop = base.sparkDrop;
    this.angle = 0;
    this.orbitAngle = Math.random() * TAU;
    this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    this.fireTimer = 1.2 + Math.random();
    this.burstTimer = 2.0;
    this.wobble = Math.random() * TAU;
    this.flash = 0; // white hit-flash timer
    this.dead = false;
  }

  update(dt, player, game) {
    this.flash -= dt;
    this.wobble += dt;
    const d = dist(this.x, this.y, player.x, player.y) || 1;
    const nx = (player.x - this.x) / d;
    const ny = (player.y - this.y) / d;
    switch (this.kind) {
      case 'chaser':
      case 'mini': {
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;
        this.angle = Math.atan2(ny, nx);
        break;
      }
      case 'orbiter': {
        this.orbitAngle += this.orbitDir * 1.9 * dt;
        const want = 190;
        const tx = player.x + Math.cos(this.orbitAngle) * want;
        const ty = player.y + Math.sin(this.orbitAngle) * want;
        this.x += (tx - this.x) * Math.min(1, 2.4 * dt);
        this.y += (ty - this.y) * Math.min(1, 2.4 * dt);
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        break;
      }
      case 'splitter': {
        // Drifts in with a slow weave.
        const weave = Math.sin(this.wobble * 2.2) * 0.6;
        const px = -ny * weave;
        const py = nx * weave;
        this.x += (nx + px) * this.speed * dt;
        this.y += (ny + py) * this.speed * dt;
        this.angle += dt * 0.8;
        break;
      }
      case 'spitter': {
        // Keeps its distance, then shoots.
        const keep = CONFIG.spitter.keepRange;
        const toward = d > keep + 30 ? 1 : d < keep - 30 ? -1 : 0;
        this.x += nx * this.speed * toward * dt;
        this.y += ny * this.speed * toward * dt;
        this.angle = Math.atan2(ny, nx);
        this.fireTimer -= dt;
        if (this.fireTimer <= 0 && d < 640) {
          this.fireTimer = CONFIG.spitter.fireInterval;
          game.spawnEnemyBullet(this.x, this.y, this.angle, CONFIG.spitter.bulletSpeed);
        }
        break;
      }
      case 'boss': {
        // Slow chase + radial bursts.
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;
        this.angle += dt * 0.5;
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
          this.burstTimer = CONFIG.boss.burstInterval;
          game.spawnBossBurst(this.x, this.y);
        }
        break;
      }
      default:
        break;
    }
    // Stay inside the arena.
    const a = game.arena;
    this.x = clamp(this.x, a.x + this.radius, a.x + a.w - this.radius);
    this.y = clamp(this.y, a.y + this.radius, a.y + a.h - this.radius);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    switch (this.kind) {
      case 'chaser':
      case 'mini': {
        // Spiked diamond.
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(0, this.radius * 0.7);
        ctx.lineTo(-this.radius, 0);
        ctx.lineTo(0, -this.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'orbiter': {
        // Ring with a bright core.
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#efe6ff';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, TAU);
        ctx.fill();
        break;
      }
      case 'splitter': {
        // Hexagon that slowly spins.
        ctx.rotate(this.angle);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          if (i === 0) ctx.moveTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
          else ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff3e0';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, TAU);
        ctx.fill();
        break;
      }
      case 'spitter': {
        // Triangle with a mouth dot.
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.75);
        ctx.lineTo(-this.radius * 0.8, -this.radius * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#eafff0';
        ctx.beginPath();
        ctx.arc(this.radius * 0.35, 0, 4, 0, TAU);
        ctx.fill();
        break;
      }
      case 'boss': {
        // Big jagged star.
        ctx.rotate(this.angle);
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          const r = i % 2 === 0 ? this.radius : this.radius * 0.62;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffe1e1';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.28, 0, TAU);
        ctx.fill();
        break;
      }
      default:
        break;
    }
    ctx.restore();
    // Small HP bar for hurt tough enemies.
    if (this.maxHp > 3 && this.hp < this.maxHp) {
      const w = this.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.x - w / 2, this.y - this.radius - 10, w, 4);
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - w / 2, this.y - this.radius - 10, w * (this.hp / this.maxHp), 4);
    }
  }
}

/** A bullet. `friendly` ones hurt enemies; enemy ones hurt the player. */
export class Bullet {
  constructor(x, y, angle, speed, damage, friendly) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = friendly ? CONFIG.player.bulletRadius : CONFIG.boss.bulletRadius;
    this.damage = damage;
    this.friendly = friendly;
    this.dead = false;
    this.life = 2.2;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.friendly ? CONFIG.colors.bullet : CONFIG.colors.enemyBullet;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.friendly ? CONFIG.colors.bullet : CONFIG.colors.enemyBullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/** A spark: the score pickup enemies drop. Magnetised toward the player. */
export class Spark {
  constructor(x, y, value, rng) {
    this.x = x + (rng ? rng.range(-CONFIG.drops.sparkScatter, CONFIG.drops.sparkScatter) : 0);
    this.y = y + (rng ? rng.range(-CONFIG.drops.sparkScatter, CONFIG.drops.sparkScatter) : 0);
    this.vx = 0;
    this.vy = 0;
    this.value = value;
    this.radius = 6;
    this.life = CONFIG.drops.sparkLife;
    this.phase = Math.random() * TAU;
    this.dead = false;
    this.collected = false; // set when the player picks it up (vs expiring)
  }

  update(dt, player) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    const d2 = dist2(this.x, this.y, player.x, player.y);
    const magnet = player.magnetRadius;
    if (d2 < magnet * magnet) {
      const d = Math.sqrt(d2) || 1;
      const pull = 1400 * (1 - d / (magnet * 1.6));
      this.vx += ((player.x - this.x) / d) * pull * dt;
      this.vy += ((player.y - this.y) / d) * pull * dt;
    } else {
      this.vx *= Math.exp(-3 * dt);
      this.vy *= Math.exp(-3 * dt);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (dist2(this.x, this.y, player.x, player.y) < (player.radius + 10) ** 2) {
      this.dead = true;
      this.collected = true;
    }
  }

  draw(ctx, time) {
    const blink = this.life < 3 ? (Math.floor(time * 6) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.shadowColor = CONFIG.colors.spark;
    ctx.shadowBlur = 12;
    ctx.fillStyle = CONFIG.colors.spark;
    const r = this.radius * (0.85 + 0.15 * Math.sin(time * 5 + this.phase));
    // Four-point star.
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - r);
    ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
    ctx.quadraticCurveTo(this.x, this.y, this.x, this.y + r);
    ctx.quadraticCurveTo(this.x, this.y, this.x - r, this.y);
    ctx.quadraticCurveTo(this.x, this.y, this.x, this.y - r);
    ctx.fill();
    ctx.restore();
  }
}

/** A rare heart pickup: heals 1 HP. */
export class HeartDrop {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 11;
    this.life = 12;
    this.phase = Math.random() * TAU;
    this.dead = false;
    this.collected = false; // set when the player picks it up (vs expiring)
  }

  update(dt, player) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    if (dist2(this.x, this.y, player.x, player.y) < (player.radius + 12) ** 2) {
      this.dead = true;
      this.collected = true;
    }
  }

  draw(ctx, time) {
    const bob = Math.sin(time * 3 + this.phase) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.shadowColor = CONFIG.colors.heart;
    ctx.shadowBlur = 14;
    ctx.fillStyle = CONFIG.colors.heart;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♥', 0, 0);
    ctx.restore();
  }
}

/** A short-lived particle: collect sparkles, hit bursts, death explosions. */
export class Particle {
  constructor(x, y, color, speed, life, size) {
    const a = Math.random() * TAU;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.exp(-2.5 * dt);
    this.vy *= Math.exp(-2.5 * dt);
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Floating score text ("+20") that rises and fades. */
export class FloatText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color || '#ffffff';
    this.life = 0.9;
    this.maxLife = 0.9;
    this.dead = false;
  }

  update(dt) {
    this.y -= 42 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}
