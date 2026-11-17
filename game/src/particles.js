// particles.js — dust, sparkles, floating score text and screen shake.
// Pure visual feedback: nothing here changes game state.

import { range } from './rng.js';

export function makeParticles() {
  return { list: [], texts: [], shake: 0, shakeX: 0, shakeY: 0 };
}

export function burst(fx, count, opts) {
  const { x, y, colors, speed, size, life, gravity, up } = opts;
  for (let i = 0; i < count; i++) {
    const a = range(fx.rand, 0, Math.PI * 2);
    const sp = range(fx.rand, speed * 0.3, speed);
    fx.list.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (up || 0),
      size: range(fx.rand, size * 0.5, size),
      color: colors[Math.floor(fx.rand() * colors.length)],
      life: range(fx.rand, life * 0.6, life),
      maxLife: life,
      gravity: gravity === undefined ? 0.12 : gravity,
    });
  }
}

export function addText(fx, x, y, text, color) {
  fx.texts.push({ x, y, text, color: color || '#ffffff', life: 50, maxLife: 50 });
}

export function addShake(fx, amount) {
  fx.shake = Math.max(fx.shake, amount);
}

// A quick ring of sparkles for shard pickups and beacon lighting.
export function sparkleRing(fx, x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    fx.list.push({
      x,
      y,
      vx: Math.cos(a) * 2.2,
      vy: Math.sin(a) * 2.2 - 0.6,
      size: 3,
      color,
      life: 26,
      maxLife: 26,
      gravity: 0.02,
    });
  }
}

export function updateParticles(fx) {
  for (let i = fx.list.length - 1; i >= 0; i--) {
    const p = fx.list[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.98;
    p.life--;
    if (p.life <= 0) fx.list.splice(i, 1);
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.y -= 0.7;
    t.life--;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  if (fx.shake > 0) {
    fx.shake *= 0.88;
    if (fx.shake < 0.4) fx.shake = 0;
    fx.shakeX = (Math.random() - 0.5) * fx.shake;
    fx.shakeY = (Math.random() - 0.5) * fx.shake;
  } else {
    fx.shakeX = 0;
    fx.shakeY = 0;
  }
}

export function drawParticles(ctx, fx, cam) {
  for (const p of fx.list) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - cam.x, p.y - cam.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const t of fx.texts) {
    const a = Math.max(0, t.life / t.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x - cam.x, t.y - cam.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
