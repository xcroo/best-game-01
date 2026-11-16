// render.js — everything drawn on the canvas: starfield arena, player,
// enemies, bullets, sparks, particles, floating text, banners and the
// damage flash. DOM screens (title / draft / game over / HUD) live in
// ui.js. No imports beyond config and utils.

import { CFG } from './config.js';

/** Precompute starfield points once per game (seeded, stable). */
export function makeStars(G) {
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: G.rng() * CFG.W,
      y: G.rng() * CFG.H,
      r: 0.6 + G.rng() * 1.5,
      tw: G.rng() * Math.PI * 2,
      sp: 0.4 + G.rng() * 1.2,
    });
  }
  return stars;
}

function drawBackground(G, ctx) {
  const grad = ctx.createRadialGradient(
    CFG.W / 2, CFG.H / 2, 80,
    CFG.W / 2, CFG.H / 2, 900,
  );
  grad.addColorStop(0, '#171a3d');
  grad.addColorStop(0.55, '#0e1030');
  grad.addColorStop(1, '#070818');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CFG.W, CFG.H);

  // Stars, gently twinkling.
  for (const s of G.stars) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(G.time * s.sp + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cdd6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Faint grid.
  ctx.strokeStyle = 'rgba(120, 140, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 80; x < CFG.W; x += 80) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CFG.H);
  }
  for (let y = 80; y < CFG.H; y += 80) {
    ctx.moveTo(0, y);
    ctx.lineTo(CFG.W, y);
  }
  ctx.stroke();

  // Arena border.
  ctx.strokeStyle = 'rgba(89, 247, 255, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    CFG.ARENA_MARGIN, CFG.ARENA_MARGIN,
    CFG.W - CFG.ARENA_MARGIN * 2, CFG.H - CFG.ARENA_MARGIN * 2,
  );
}

function drawSpark(G, ctx, s) {
  const pulse = 0.75 + 0.25 * Math.sin(G.time * 5 + s.phase);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(Math.PI / 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd34d';
  ctx.shadowColor = '#ffb400';
  ctx.shadowBlur = 12;
  const r = s.r * (0.8 + 0.2 * pulse);
  ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, h, t) {
  const bob = Math.sin(t * 3 + h.phase) * 3;
  const y = h.y + bob;
  ctx.save();
  ctx.translate(h.x, y);
  ctx.fillStyle = '#ff7fa5';
  ctx.shadowColor = '#ff4d7e';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-11, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 11, -3, 0, 7);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(G, ctx) {
  const p = G.player;
  const blink = p.invuln > 0 && Math.floor(G.time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.35;
  // Dash trail glow.
  if (p.dashTime > 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#59f7ff';
    ctx.beginPath();
    ctx.arc(-p.dashDx * 26, -p.dashDy * 26, p.r + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = blink ? 0.35 : 1;
  }
  // Shield ring.
  if (p.shield) {
    ctx.strokeStyle = 'rgba(143, 216, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Body: bright core with cyan glow.
  ctx.shadowColor = '#35e0ff';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#59f7ff';
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eafcff';
  ctx.beginPath();
  ctx.arc(0, 0, p.r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  // Aim tick.
  ctx.strokeStyle = '#eafcff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(Math.cos(p.aimAngle) * (p.r + 2), Math.sin(p.aimAngle) * (p.r + 2));
  ctx.lineTo(Math.cos(p.aimAngle) * (p.r + 10), Math.sin(p.aimAngle) * (p.r + 10));
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(G, ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
  ctx.strokeStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = e.type === 'boss' ? 26 : 12;
  const r = e.r;
  if (e.type === 'chaser' || e.type === 'mini') {
    // Spiked orb: circle with three spikes.
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + G.time * 1.5;
      ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
      ctx.lineTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7));
    }
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'orbiter') {
    // Hollow diamond.
    ctx.rotate(G.time * 2 + e.orbitAngle);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r - 3);
    ctx.lineTo(r + 3, 0);
    ctx.lineTo(0, r + 3);
    ctx.lineTo(-r - 3, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'splitter') {
    // Hexagon.
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + G.time * 0.8;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.type === 'spitter') {
    // Square with a maw.
    ctx.rotate(Math.PI / 4 + Math.sin(G.time * 1.4 + e.wobble) * 0.25);
    ctx.lineWidth = 3;
    ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'boss') {
    // Big ringed orb with rotating teeth.
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#2b0008';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = e.color;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + G.time * 0.7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
      ctx.lineTo(Math.cos(a) * (r + 10), Math.sin(a) * (r + 10));
      ctx.stroke();
    }
    // HP arc above the boss.
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.strokeStyle = '#ff5c74';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 18, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw one frame of the arena and everything in it. */
export function draw(G, ctx) {
  ctx.save();
  // Screen shake.
  if (G.shake > 0.2) {
    const sx = (G.rng() - 0.5) * G.shake;
    const sy = (G.rng() - 0.5) * G.shake;
    ctx.translate(sx, sy);
  }
  drawBackground(G, ctx);

  for (const s of G.sparks) drawSpark(G, ctx, s);
  for (const h of G.hearts) drawHeart(ctx, h, G.time);

  // Player bullets: bright streaks.
  ctx.strokeStyle = '#8ef6ff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Enemy bullets: hot orbs.
  for (const b of G.ebullets) {
    ctx.fillStyle = '#ff5c74';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  for (const e of G.enemies) drawEnemy(G, ctx, e);
  if (G.mode === 'playing' || G.mode === 'draft' || G.mode === 'gameover') {
    drawPlayer(G, ctx);
  }

  // Particles.
  for (const pt of G.parts) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating score text.
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px system-ui, sans-serif';
  for (const f of G.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // Wave banner.
  if (G.waveBanner > 0 && (G.mode === 'playing' || G.mode === 'draft')) {
    const a = Math.min(1, G.waveBanner);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = G.wave % CFG.BOSS_EVERY === 0 ? 'BOSS WAVE ' + G.wave : 'WAVE ' + G.wave;
    ctx.fillText(label, CFG.W / 2, 190);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#9fb4ff';
    ctx.fillText(
      G.wave % CFG.BOSS_EVERY === 0 ? 'something huge approaches' : 'clear the shadows',
      CFG.W / 2, 226,
    );
    ctx.globalAlpha = 1;
  }

  // Paused stamp.
  if (G.paused && G.mode === 'playing') {
    ctx.fillStyle = 'rgba(5, 6, 20, 0.55)';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CFG.W / 2, CFG.H / 2 - 8);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillStyle = '#9fb4ff';
    ctx.fillText('press P or Esc to resume', CFG.W / 2, CFG.H / 2 + 30);
  }

  ctx.restore();

  // Damage vignette flash (drawn last, unshaken).
  if (G.flash > 0) {
    const grad = ctx.createRadialGradient(
      CFG.W / 2, CFG.H / 2, CFG.H * 0.32,
      CFG.W / 2, CFG.H / 2, CFG.H * 0.75,
    );
    grad.addColorStop(0, 'rgba(255, 40, 70, 0)');
    grad.addColorStop(1, 'rgba(255, 40, 70, ' + (G.flash * 0.55).toFixed(3) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  }

  // Low-HP heartbeat: a slow red pulse at the edges when one heart is left.
  if (G.mode === 'playing' && G.player && G.player.hp === 1) {
    const pulse = 0.10 + 0.08 * (0.5 + 0.5 * Math.sin(G.time * 4));
    const grad = ctx.createRadialGradient(
      CFG.W / 2, CFG.H / 2, CFG.H * 0.36,
      CFG.W / 2, CFG.H / 2, CFG.H * 0.72,
    );
    grad.addColorStop(0, 'rgba(255, 40, 70, 0)');
    grad.addColorStop(1, 'rgba(255, 40, 70, ' + pulse.toFixed(3) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  }
}
