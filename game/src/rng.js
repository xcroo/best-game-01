// rng.js — a tiny seeded random generator (mulberry32).
// All cosmetic randomness (cloud placement, ridge shapes, sparkle drift)
// comes from here with a fixed seed, so a playthrough and a screenshot
// are deterministic: the same seed always draws the same mountain.

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

// Range helper: rand(0, 1), rand(10) in [0, 10), rand(4, 9) in [4, 9).
export function range(rand, a, b) {
  if (b === undefined) return rand() * a;
  return a + rand() * (b - a);
}

export function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

// Random integer in [lo, hi] inclusive.
export function randInt(rand, lo, hi) {
  return lo + Math.floor(rand() * (hi - lo + 1));
}
