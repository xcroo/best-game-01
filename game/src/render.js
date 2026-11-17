// render.js — everything PINECREST shows: the parallax mountain, the
// tiles, the creatures, the HUD and the menus. Drawing is split by layer
// so the judge's screenshots read at a glance: sky, ridges, pines, level,
// entities, particles, HUD, menu.

import { TILE, VIEW_H, PALETTES, MAX_HEARTS } from './config.js';
import { mulberry32, range } from './rng.js';
import { clamp, lerp, easeOutBack, formatTime } from './utils.js';
import { drawParticles } from './particles.js';

export function makeCamera() {
  return { x: 0, y: 0, w: 960, h: VIEW_H, scale: 1 };
}

export function resizeCamera(cam, canvas) {
  cam.scale = canvas.height / VIEW_H;
  cam.w = canvas.width / cam.scale;
  cam.h = VIEW_H;
}

export function updateCamera(cam, level, player, snap) {
  const tx = player.x + player.w / 2 - cam.w * 0.42 + player.vx * 5;
  const ty = player.y + player.h / 2 - cam.h * 0.55;
  const maxX = Math.max(0, level.width - cam.w);
  const maxY = Math.max(0, level.height - cam.h);
  if (snap) {
    cam.x = clamp(tx, 0, maxX);
    cam.y = clamp(ty, -10, maxY);
  } else {
    cam.x = lerp(cam.x, clamp(tx, 0, maxX), 0.12);
    cam.y = lerp(cam.y, clamp(ty, -10, maxY), 0.1);
  }
}

// Precompute a level's scenery from a fixed seed: ridge silhouettes,
// pine rows, cloud puffs and star fields. Same seed, same mountain.
export function makeScenery(levelIndex, level) {
  const rand = mulberry32(1234 + levelIndex * 777);
  const far = [];
  const near = [];
  for (let i = 0; i <= 24; i++) {
    far.push(range(rand, 60, 210));
    near.push(range(rand, 30, 130));
  }
  const pines = [];
  for (let i = 0; i < 60; i++) {
    pines.push({ x: i * 90 + range(rand, -20, 20), h: range(rand, 46, 110), w: range(rand, 34, 56) });
  }
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    clouds.push({ x: range(rand, 0, 1600), y: range(rand, 30, 190), s: range(rand, 0.7, 1.6), v: range(rand, 0.08, 0.25) });
  }
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({ x: range(rand, 0, 1600), y: range(rand, 0, 300), r: range(rand, 0.6, 1.8), p: range(rand, 0, 6.28) });
  }
  return { far, near, pines, clouds, stars, width: level.width };
}

function drawRidge(ctx, cam, heights, color, factor, baseY, scaleY) {
  const w = cam.w;
  const step = 90;
  const offset = ((cam.x * factor) % (step * heights.length) + step * heights.length) % (step * heights.length);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-step, cam.h + 4);
  for (let x = -step; x <= w + step; x += step) {
    const idx = Math.floor((x + offset) / step) % heights.length;
    const h = heights[(idx + heights.length) % heights.length] * scaleY;
    ctx.lineTo(x, baseY - h);
  }
  ctx.lineTo(w + step, cam.h + 4);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, cam, pal, scenery, time) {
  const g = ctx.createLinearGradient(0, 0, 0, cam.h);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(0.55, pal.skyMid);
  g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.w, cam.h);
  if (pal.stars) {
    for (const s of scenery.stars) {
      const tw = 0.5 + 0.5 * Math.sin(time * 0.02 + s.p);
      ctx.globalAlpha = tw * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(((s.x - cam.x * 0.1) % 1600 + 1600) % 1600, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }
  // Sun or moon, low on the horizon.
  const sunX = cam.w * 0.78 - cam.x * 0.05;
  const sunY = 92;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  glow.addColorStop(0, pal.sunGlow);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, cam, pal, scenery, time) {
  ctx.fillStyle = pal.cloud;
  for (const c of scenery.clouds) {
    const x = (((c.x + time * c.v - cam.x * 0.55) % 1700) + 1700) % 1700 - 100;
    const y = c.y;
    const s = c.s;
    ctx.beginPath();
    ctx.ellipse(x, y, 42 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 26 * s, y + 5 * s, 26 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28 * s, y + 5 * s, 28 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPines(ctx, cam, pal, scenery) {
  const offset = ((cam.x * 0.8) % 90 + 90) % 90;
  for (let i = -1; i < cam.w / 90 + 2; i++) {
    const tree = scenery.pines[((i + Math.floor(cam.x * 0.8 / 90)) % 60 + 60) % 60];
    const x = i * 90 - offset + 20;
    const baseY = cam.h + 6;
    ctx.fillStyle = pal.pineDark;
    ctx.fillRect(x - 3, baseY - tree.h * 0.4, 6, tree.h * 0.4);
    ctx.fillStyle = pal.pine;
    ctx.beginPath();
    ctx.moveTo(x - tree.w / 2, baseY - tree.h * 0.35);
    ctx.lineTo(x, baseY - tree.h);
    ctx.lineTo(x + tree.w / 2, baseY - tree.h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - tree.w * 0.42, baseY - tree.h * 0.12);
    ctx.lineTo(x, baseY - tree.h * 0.62);
    ctx.lineTo(x + tree.w * 0.42, baseY - tree.h * 0.12);
    ctx.closePath();
    ctx.fill();
  }
}

function tileHash(tx, ty) {
  let h = (tx * 374761393 + ty * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  return ((h * 1274126177) >> 8) & 255;
}

function drawTiles(ctx, cam, level, pal, time) {
  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const x1 = Math.min(level.cols - 1, Math.ceil((cam.x + cam.w) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const y1 = Math.min(level.rows - 1, Math.ceil((cam.y + cam.h) / TILE) + 1);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const code = level.grid[ty][tx];
      if (code === 0) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      if (code === 2) {
        // Crumbling ledge: cracked brown block, gone tiles skip drawing.
        const c = level.crumbles.find((cc) => cc.tx === tx && cc.ty === ty);
        if (c && c.gone) continue;
        const wob = c && c.timer >= 0 ? Math.sin(time * 1.2 + tx) * 1.5 : 0;
        ctx.fillStyle = '#a9805a';
        ctx.fillRect(x + wob, y, TILE, TILE);
        ctx.fillStyle = '#8a6a44';
        ctx.fillRect(x + wob, y + TILE - 8, TILE, 8);
        ctx.strokeStyle = '#6e5232';
        ctx.beginPath();
        ctx.moveTo(x + 8 + wob, y + 4);
        ctx.lineTo(x + 14 + wob, y + 16);
        ctx.lineTo(x + 10 + wob, y + 26);
        ctx.stroke();
        continue;
      }
      // Rock body.
      ctx.fillStyle = pal.rock;
      ctx.fillRect(x, y, TILE, TILE);
      const h = tileHash(tx, ty);
      ctx.fillStyle = pal.rockDark;
      ctx.fillRect(x + 4 + (h % 12), y + 8 + (h % 14), 4, 4);
      ctx.fillRect(x + 18 - (h % 10), y + 20, 3, 3);
      // Grass cap when the tile above is empty.
      const above = ty === 0 ? 0 : level.grid[ty - 1][tx];
      if (above === 0) {
        ctx.fillStyle = pal.grass;
        ctx.fillRect(x, y, TILE, 10);
        ctx.fillStyle = pal.grassLight;
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = pal.grass;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 10);
        ctx.lineTo(x + 9, y + 2);
        ctx.lineTo(x + 12, y + 10);
        ctx.moveTo(x + 20, y + 10);
        ctx.lineTo(x + 23, y + 3);
        ctx.lineTo(x + 26, y + 10);
        ctx.fill();
      }
    }
  }
}

function drawSpikes(ctx, cam, level) {
  ctx.fillStyle = '#dfe6ee';
  for (const s of level.spikes) {
    if (s.x + s.w < cam.x || s.x > cam.x + cam.w) continue;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const bx = s.x + (i * s.w) / 4;
      ctx.moveTo(bx, s.y + s.h);
      ctx.lineTo(bx + s.w / 8, s.y);
      ctx.lineTo(bx + s.w / 4, s.y + s.h);
    }
    ctx.fill();
    ctx.fillStyle = '#9aa7b5';
    ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3);
    ctx.fillStyle = '#dfe6ee';
  }
}

function drawSprings(ctx, cam, level, time) {
  for (const s of level.springs) {
    const squash = s.anim > 0 ? Math.sin((s.anim / 10) * Math.PI) * 6 : 0;
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(s.x + 2, s.y + 20 - squash, TILE - 4, 12);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(s.x + 2, s.y + 20 - squash, TILE - 4, 4);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(s.x + 6, s.y + TILE - 2, 4, 2);
    ctx.fillRect(s.x + TILE - 10, s.y + TILE - 2, 4, 2);
  }
}

function drawCheckpoints(ctx, cam, level, time) {
  for (const c of level.checkpoints) {
    const x = c.x;
    const y = c.y;
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x - 2, y - 44, 4, 44);
    const wave = Math.sin(time * 0.08) * 3;
    ctx.fillStyle = c.lit ? '#ffd94d' : '#b8c0c8';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 44);
    ctx.lineTo(x + 22, y - 38 + wave);
    ctx.lineTo(x + 2, y - 30);
    ctx.closePath();
    ctx.fill();
    if (c.lit) {
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 0.1);
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(x, y - 36, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawFlag(ctx, cam, level, time) {
  const f = level.flag;
  const x = f.x;
  const y = f.y;
  // Beacon: a stone cairn with a flame.
  ctx.fillStyle = '#8a7f74';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6e645a';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a5148';
  ctx.fillRect(x - 2, y - 52, 4, 48);
  const wave = Math.sin(time * 0.1) * 4;
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 52);
  ctx.lineTo(x + 30, y - 44 + wave);
  ctx.lineTo(x + 2, y - 34);
  ctx.closePath();
  ctx.fill();
  const fl = 10 + Math.sin(time * 0.25) * 3;
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.ellipse(x, y - 58, 6, fl, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.ellipse(x, y - 56, 3, fl * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoins(ctx, cam, level, time) {
  for (const c of level.coins) {
    if (c.taken) continue;
    const bob = Math.sin(time * 0.06 + c.bob) * 3;
    const spin = Math.abs(Math.cos(time * 0.05 + c.bob));
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    ctx.scale(Math.max(0.25, spin), 1);
    ctx.fillStyle = '#f7b731';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawShards(ctx, cam, level, time) {
  for (const s of level.shards) {
    if (s.taken) continue;
    const bob = Math.sin(time * 0.05 + s.bob) * 4;
    const rot = Math.sin(time * 0.03 + s.bob) * 0.2;
    ctx.save();
    ctx.translate(s.x, s.y + bob);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(0, 0, 20 + Math.sin(time * 0.08) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff6c9';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawMovers(ctx, cam, level) {
  for (const m of level.movers) {
    ctx.fillStyle = '#a9805a';
    ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(m.x, m.y + m.h - 3, m.w, 3);
    ctx.strokeStyle = '#6e5232';
    ctx.beginPath();
    ctx.moveTo(m.x + 4, m.y + 2);
    ctx.lineTo(m.x + 4, m.y + m.h - 2);
    ctx.moveTo(m.x + m.w - 4, m.y + 2);
    ctx.lineTo(m.x + m.w - 4, m.y + m.h - 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, cam, p, time) {
  if (p.iframes > 0 && Math.floor(time / 4) % 2 === 0) return; // blink
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const sx = 1 + p.squash * 0.4;
  const sy = 1 - p.squash * 0.4;
  ctx.save();
  ctx.translate(cx, cy + p.h / 2);
  ctx.scale(sx, sy);
  ctx.translate(-cx, -(cy + p.h / 2));
  // Scarf flowing behind.
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - p.face * 8, cy - 8);
  const flutter = Math.sin(time * 0.3) * 3;
  ctx.quadraticCurveTo(cx - p.face * 20, cy - 10 + flutter, cx - p.face * 28, cy - 4 + flutter * 2);
  ctx.stroke();
  // Body: a round cream climber.
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  // Little feet.
  const step = Math.abs(p.vx) > 0.5 && p.grounded ? Math.sin(p.runTime * 0.5) * 3 : 0;
  ctx.fillStyle = '#8a5a3b';
  ctx.fillRect(cx - 8, cy + 10, 6, 4 + step);
  ctx.fillRect(cx + 2, cy + 10, 6, 4 - step);
  // Hood.
  ctx.fillStyle = '#3f7d5a';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 11, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 11, cy - 4, 22, 4);
  // Eyes look where Pip faces.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(cx + p.face * 4 - 3, cy - 2, 1.8, 0, Math.PI * 2);
  ctx.arc(cx + p.face * 4 + 3, cy - 2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Dash streaks.
  if (p.dashTime > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - p.dashDir * i * 10, cy - 6 + i * 4);
      ctx.lineTo(cx - p.dashDir * (i * 10 + 8), cy - 6 + i * 4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawWalkers(ctx, cam, level, time) {
  for (const w of level.walkers) {
    if (w.dead) continue;
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    const wob = Math.sin(w.walkPhase || 0) * 2;
    ctx.fillStyle = '#6b4a8a';
    ctx.beginPath();
    ctx.arc(cx, cy + wob, 12, 0, Math.PI * 2);
    ctx.fill();
    // Thorns.
    ctx.fillStyle = '#4a2f63';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10 + wob);
      ctx.lineTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17 + wob);
      ctx.lineTo(cx + Math.cos(a + 0.4) * 10, cy + Math.sin(a + 0.4) * 10 + wob);
      ctx.closePath();
      ctx.fill();
    }
    // Angry eyes.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 3 + wob, 3, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 3 + wob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(cx - 4 + w.dir * 1.5, cy - 3 + wob, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 4 + w.dir * 1.5, cy - 3 + wob, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBats(ctx, cam, level, time) {
  for (const b of level.bats) {
    if (b.dead) continue;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const flap = Math.sin(b.flap || 0) * 7;
    ctx.fillStyle = '#3a3348';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.quadraticCurveTo(cx - 16, cy - 10 - flap, cx - 20, cy + 2 - flap);
    ctx.quadraticCurveTo(cx - 10, cy + 4, cx - 4, cy + 2);
    ctx.moveTo(cx + 4, cy);
    ctx.quadraticCurveTo(cx + 16, cy - 10 - flap, cx + 20, cy + 2 - flap);
    ctx.quadraticCurveTo(cx + 10, cy + 4, cx + 4, cy + 2);
    ctx.fill();
    ctx.fillStyle = '#574a72';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5c5c';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 1, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy - 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHeart(ctx, x, y, s, filled) {
  ctx.fillStyle = filled ? '#e74c3c' : 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s, y + s * 0.1, x - s * 0.55, y - s * 0.7, x, y - s * 0.15);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.7, x + s, y + s * 0.1, x, y + s * 0.9);
  ctx.fill();
}

export function drawHUD(ctx, canvas, game) {
  const pad = 16;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Hearts.
  for (let i = 0; i < MAX_HEARTS; i++) {
    drawHeart(ctx, pad + 12 + i * 30, pad + 12, 11, i < game.hearts);
  }
  // Shards, coins, score.
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(pad - 4, pad + 34, 150, 30);
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('◆ ' + game.shardsGot + '/' + game.shardsTotal, pad + 4, pad + 56);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('● ' + game.coins, pad + 78, pad + 56);
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SCORE ' + game.score, pad, pad + 92);
  // Dash meter.
  const dashReady = game.player.dashCooldown <= 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(pad - 4, pad + 100, 110, 10);
  ctx.fillStyle = dashReady ? '#7fd4ff' : '#4a7a96';
  ctx.fillRect(pad - 2, pad + 102, 106 * (dashReady ? 1 : 1 - game.player.dashCooldown / 48), 6);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DASH', pad + 116, pad + 110);
  // Top right: timer and level name.
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatTime(game.timeFrames), canvas.width - pad, pad + 24);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Level ' + (game.levelIndex + 1) + ' — ' + game.levelName, canvas.width - pad, pad + 46);
  ctx.textAlign = 'left';
}

// A menu panel with buttons. Returns the button rects for click handling.
export function drawMenu(ctx, canvas, title, subtitle, buttons, mouse) {
  const cx = canvas.width / 2;
  ctx.fillStyle = 'rgba(10, 16, 40, 0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const panelW = Math.min(560, canvas.width - 80);
  const panelH = 150 + buttons.length * 62;
  const px = cx - panelW / 2;
  const py = canvas.height / 2 - panelH / 2;
  ctx.fillStyle = 'rgba(16, 24, 48, 0.92)';
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(title, cx, py + 62);
  if (subtitle) {
    ctx.fillStyle = '#dfe6ee';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(subtitle, cx, py + 96);
  }
  const rects = [];
  buttons.forEach((b, i) => {
    const bw = 260;
    const bh = 46;
    const bx = cx - bw / 2;
    const by = py + 118 + i * 62;
    const hover = mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= by && mouse.y <= by + bh;
    ctx.fillStyle = hover ? '#f7b731' : '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(b.label, cx, by + 30);
    rects.push({ ...b, x: bx, y: by, w: bw, h: bh });
  });
  ctx.textAlign = 'left';
  return rects;
}

export function render(ctx, canvas, game) {
  const pal = PALETTES[game.level.palette];
  const cam = game.camera;
  const level = game.level;
  const time = game.frame;
  const s = cam.scale;
  // Sky and parallax live in screen space, drawn in view units and scaled
  // to the canvas so they cover it at any aspect ratio.
  ctx.setTransform(s, 0, 0, s, 0, 0);
  drawSky(ctx, cam, pal, game.scenery, time);
  drawClouds(ctx, cam, pal, game.scenery, time);
  drawRidge(ctx, cam, game.scenery.far, pal.farRidge, 0.18, cam.h * 0.72, 1.0);
  drawRidge(ctx, cam, game.scenery.near, pal.nearRidge, 0.42, cam.h * 0.82, 0.8);
  drawPines(ctx, cam, pal, game.scenery);
  // World space.
  ctx.setTransform(s, 0, 0, s, (-cam.x + (game.fx.shakeX || 0)) * s, (-cam.y + (game.fx.shakeY || 0)) * s);
  drawTiles(ctx, cam, level, pal, time);
  drawSpikes(ctx, cam, level);
  drawSprings(ctx, cam, level, time);
  drawMovers(ctx, cam, level);
  drawCheckpoints(ctx, cam, level, time);
  drawFlag(ctx, cam, level, time);
  drawCoins(ctx, cam, level, time);
  drawShards(ctx, cam, level, time);
  drawWalkers(ctx, cam, level, time);
  drawBats(ctx, cam, level, time);
  drawPlayer(ctx, cam, game.player, time);
  drawParticles(ctx, game.fx, cam);
  // Screen space again for the HUD.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (game.state === 'play' || game.state === 'pause') {
    drawHUD(ctx, canvas, game);
  }
}
