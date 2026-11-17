// physics.js — tile collision and movement integration for PINECREST.
// Bodies are {x, y, w, h, vx, vy}. The grid is rows of Uint8Array codes
// (0 empty, 1 solid, 2 crumble). Movement is resolved axis by axis so a
// body can slide along a wall instead of sticking to it. Moving platforms
// are handled by game.js, which carries the player before this step.

import { TILE } from './config.js';

export function isSolid(level, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= level.rows || tx >= level.cols) return false;
  const code = level.grid[ty][tx];
  return code === 1 || code === 2;
}

// Treat tiles outside the level's sides and top as empty (the player can
// leave the top of a shaft), but the bottom row is the floor of the world.
export function tileAt(level, tx, ty) {
  if (tx < 0 || tx >= level.cols || ty < 0) return 0;
  if (ty >= level.rows) return 1;
  return level.grid[ty][tx];
}

// Pixel-space version of isSolid, for enemies that think in pixels.
export function isSolidAtPixel(level, px, py) {
  return isSolid(level, Math.floor(px / TILE), Math.floor(py / TILE));
}

export function moveAndCollide(level, body, onLand) {
  // Horizontal axis.
  body.x += body.vx;
  let hitWall = 0;
  const top = Math.floor(body.y / TILE);
  const bottom = Math.floor((body.y + body.h - 0.01) / TILE);
  if (body.vx > 0) {
    const tx = Math.floor((body.x + body.w) / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (isSolid(level, tx, ty)) {
        body.x = tx * TILE - body.w - 0.01;
        body.vx = 0;
        hitWall = 1;
        break;
      }
    }
  } else if (body.vx < 0) {
    const tx = Math.floor(body.x / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (isSolid(level, tx, ty)) {
        body.x = (tx + 1) * TILE + 0.01;
        body.vx = 0;
        hitWall = -1;
        break;
      }
    }
  }
  // Vertical axis.
  body.y += body.vy;
  let grounded = false;
  const left = Math.floor(body.x / TILE);
  const right = Math.floor((body.x + body.w - 0.01) / TILE);
  if (body.vy >= 0) {
    const ty = Math.floor((body.y + body.h) / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (isSolid(level, tx, ty)) {
        body.y = ty * TILE - body.h;
        if (body.vy > 6 && onLand) onLand(body.vy);
        body.vy = 0;
        grounded = true;
        break;
      }
    }
  } else {
    const ty = Math.floor(body.y / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (isSolid(level, tx, ty)) {
        body.y = (ty + 1) * TILE + 0.01;
        body.vy = 0;
        break;
      }
    }
  }
  return { grounded, hitWall };
}

// The tile coordinates overlapped by a body, for hazard and pickup checks.
export function overlappedTiles(level, body) {
  const out = [];
  const x0 = Math.floor(body.x / TILE);
  const x1 = Math.floor((body.x + body.w - 0.01) / TILE);
  const y0 = Math.floor(body.y / TILE);
  const y1 = Math.floor((body.y + body.h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx >= 0 && ty >= 0 && tx < level.cols && ty < level.rows) {
        out.push({ tx, ty, code: level.grid[ty][tx] });
      }
    }
  }
  return out;
}
