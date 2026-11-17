// enemies.js — the two hazards that move: thorn-walkers patrol a ledge
// and spore-bats drift on a sine wave. Both are stompable from above and
// hurt Pip from the side. Movement is pure; game.js resolves contact.

import { TILE } from './config.js';
import { isSolid } from './physics.js';
import { aabbOverlap } from './utils.js';

export function updateWalkers(level, walkers) {
  for (const w of walkers) {
    if (w.dead) continue;
    w.x += w.dir * w.speed;
    if (w.cool > 0) {
      w.cool--;
    } else {
      let turned = false;
      // Turn at walls.
      const aheadX = w.dir > 0 ? w.x + w.w + 1 : w.x - 1;
      const ty = Math.floor((w.y + w.h / 2) / TILE);
      const tx = Math.floor(aheadX / TILE);
      if (isSolid(level, tx, ty)) {
        w.dir *= -1;
        turned = true;
      }
      // Turn at ledges: no ground under the leading foot.
      if (!turned) {
        const footX = w.dir > 0 ? w.x + w.w - 2 : w.x + 2;
        const footTx = Math.floor(footX / TILE);
        const footTy = Math.floor((w.y + w.h + 4) / TILE);
        if (!isSolid(level, footTx, footTy)) {
          w.dir *= -1;
          turned = true;
        }
      }
      // A short cooldown stops the walker flip-flopping on a corner.
      if (turned) w.cool = 10;
    }
    w.walkPhase = (w.walkPhase || 0) + 0.12;
  }
}

export function updateBats(bats) {
  for (const b of bats) {
    if (b.dead) continue;
    b.t += 0.045;
    b.x = b.ax + Math.sin(b.t) * 56;
    b.y = b.ay + Math.sin(b.t * 1.7) * 34;
    b.flap = (b.flap || 0) + 0.3;
  }
}

// Stomp check: the player is falling onto the enemy's top half.
export function stompOverlap(player, enemy) {
  if (!aabbOverlap(player, enemy)) return false;
  const playerBottom = player.y + player.h;
  const enemyTop = enemy.y + enemy.h * 0.45;
  return player.vy > 0 && playerBottom - player.vy <= enemyTop + 6;
}
