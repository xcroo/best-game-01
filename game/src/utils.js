// utils.js — small math and random helpers for LUMEN DRIFT.
// Nothing here knows about the game; every module imports what it needs.

export const TAU = Math.PI * 2;

/** Clamp a number into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Clamp a number into [0, 1]. */
export function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Linear interpolation between a and b. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Squared distance between two points (avoids a sqrt in hot loops). */
export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Distance between two points. */
export function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

/** Angle from (ax, ay) toward (bx, by). */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest signed angle difference from a to b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/**
 * mulberry32 — a tiny seeded PRNG. The game uses it for deterministic
 * screenshot scenes (?shot=...&seed=...) so a render is reproducible.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Make a small RNG bundle around a seed: next(), range(min,max), int(min,max), pick(list). */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
  };
}

/** Format an integer with thousands separators (score display). */
export function formatScore(n) {
  return Math.floor(n).toLocaleString('en-US');
}
