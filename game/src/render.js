// render.js — everything drawn on the canvas for LUMEN DRIFT:
// the starfield arena, the entities, particles, floating text,
// screen shake and the damage flash. Menus and the HUD are DOM (ui.js).

import { CONFIG } from './config.js';
import { TAU, makeRng } from './utils.js';

// A fixed starfield, seeded once so every load looks the same.
const starRng = makeRng(20261116);
const STARS = [];
for (let i = 0; i < 130; i++) {
  STARS.push({
    x: starRng.range(0, CONFIG.canvas.width),
    y: starRng.range(0, CONFIG.canvas.height),
    r: starRng.range(0.6, 2.1),
    phase: starRng.range(0, TAU),
    speed: starRng.range(0.4, 1.6),
  });
}

/** The dark arena: gradient, starfield, faint grid, glowing border. */
export function drawBackground(ctx, time) {
  const { width, height } = CONFIG.canvas;
  const grad = ctx.createRadialGradient(
    width / 2, height / 2, 80,
    width / 2, height / 2, 900,
  );
  grad.addColorStop(0, '#0d1233');
  grad.addColorStop(1, CONFIG.colors.background);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Twinkling stars.
  for (const s of STARS) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cdd8ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Faint grid.
  ctx.strokeStyle = CONFIG.colors.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 64) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += 64) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  // Soft cyan glow at the arena's heart, so the middle reads as the stage.
  const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 420);
  glow.addColorStop(0, 'rgba(34, 230, 255, 0.05)');
  glow.addColorStop(1, 'rgba(34, 230, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Arena border.
  const m = CONFIG.arena.margin;
  ctx.strokeStyle = 'rgba(90, 120, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(m, m, width - m * 2, height - m * 2);
}

/** Draw one frame of the live game (player, enemies, bullets, pickups). */
export function drawWorld(ctx, game, time) {
  const shake = game.shake;
  ctx.save();
  if (shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }
  drawBackground(ctx, time);

  for (const s of game.sparks) s.draw(ctx, time);
  for (const h of game.hearts) h.draw(ctx, time);
  for (const e of game.enemies) e.draw(ctx);
  for (const b of game.bullets) b.draw(ctx);
  for (const b of game.enemyBullets) b.draw(ctx);
  if (game.player.alive) game.player.draw(ctx, time);
  for (const p of game.particles) p.draw(ctx);
  for (const t of game.floatTexts) t.draw(ctx);

  // Wave banner across the arena.
  if (game.bannerTimer > 0) {
    ctx.globalAlpha = Math.min(1, game.bannerTimer);
    ctx.fillStyle = '#eaf2ff';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#5a78ff';
    ctx.shadowBlur = 18;
    ctx.fillText(game.banner, CONFIG.canvas.width / 2, 170);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Combo callout while the combo is hot.
  if (game.combo > 1 && game.state === 'playing') {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`COMBO ×${game.comboMult.toFixed(1)}`, game.player.x, game.player.y - 30);
  }
  ctx.restore();

  // Damage vignette flash.
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 40, 70, ${game.hurtFlash * 0.22})`;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
  }
}
