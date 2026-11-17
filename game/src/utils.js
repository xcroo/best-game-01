// utils.js — small math helpers shared by physics, enemies and render.
// No game state lives here; every function is pure.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function approach(v, target, step) {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
}

export function sign(v) {
  return v < 0 ? -1 : 1;
}

// Axis-aligned box overlap test. Boxes are {x, y, w, h}.
export function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Ease-out-back for pop-in animations (menus, shard pickups).
export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Straight-line distance between two points.
export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Frames (at 60 Hz) to a "m:ss" clock string.
export function formatTime(frames) {
  const total = Math.max(0, Math.floor(frames / 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}
