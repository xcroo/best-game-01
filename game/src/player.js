// player.js — Pip, the climber. Owns movement, jumping, dashing and the
// squash-and-stretch feel. Collision is done by physics.js; game.js
// applies hazards, pickups and enemy contact on top of this update.

import {
  GRAVITY,
  MAX_FALL,
  MAX_RUN,
  RUN_ACCEL,
  AIR_ACCEL,
  GROUND_FRICTION,
  AIR_DRAG,
  JUMP_VEL,
  DOUBLE_JUMP_VEL,
  JUMP_CUT,
  COYOTE_FRAMES,
  JUMP_BUFFER_FRAMES,
  WALL_SLIDE_FALL,
  WALL_JUMP_VX,
  WALL_JUMP_VY,
  DASH_SPEED,
  DASH_FRAMES,
  DASH_COOLDOWN,
} from './config.js';
import { moveAndCollide } from './physics.js';
import { clamp } from './utils.js';
import { isHeld, wasPressed } from './input.js';
import { sfx } from './audio.js';

export function makePlayer(x, y) {
  return {
    x,
    y,
    w: 22,
    h: 28,
    vx: 0,
    vy: 0,
    face: 1, // 1 right, -1 left
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    jumps: 0, // air jumps used (0 ground, 1 after double jump)
    canDash: true,
    dashTime: 0,
    dashCooldown: 0,
    dashDir: 1,
    wallDir: 0, // -1 sliding on a left wall, 1 on a right wall
    iframes: 0,
    squash: 0, // >0 stretch, <0 squash; decays to 0
    runTime: 0,
    dead: false,
    standingOn: null, // moving platform the player rides, if any
  };
}

export function resetPlayer(p, x, y) {
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.face = 1;
  p.grounded = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.jumps = 0;
  p.canDash = true;
  p.dashTime = 0;
  p.dashCooldown = 0;
  p.wallDir = 0;
  p.iframes = 0;
  p.squash = 0;
  p.dead = false;
  p.standingOn = null;
}

export function updatePlayer(p, level) {
  if (p.dead) return;
  const left = isHeld('left');
  const right = isHeld('right');
  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  if (dir !== 0) p.face = dir;

  if (p.iframes > 0) p.iframes--;
  if (p.dashCooldown > 0) p.dashCooldown--;
  p.squash *= 0.86;
  if (Math.abs(p.squash) < 0.05) p.squash = 0;

  // Jump buffering: a press a few frames before landing still jumps.
  if (wasPressed('jump')) p.jumpBuffer = JUMP_BUFFER_FRAMES;
  else if (p.jumpBuffer > 0) p.jumpBuffer--;

  // Dashing.
  if (wasPressed('dash') && p.canDash && p.dashCooldown <= 0 && p.dashTime <= 0) {
    p.dashTime = DASH_FRAMES;
    p.dashDir = dir !== 0 ? dir : p.face;
    p.canDash = false;
    p.dashCooldown = DASH_COOLDOWN;
    p.vy = 0;
    sfx.dash();
  }

  if (p.dashTime > 0) {
    p.dashTime--;
    p.vx = p.dashDir * DASH_SPEED;
    p.vy = 0;
  } else {
    // Horizontal movement.
    if (dir !== 0) {
      const accel = p.grounded ? RUN_ACCEL : AIR_ACCEL;
      p.vx = clamp(p.vx + dir * accel, -MAX_RUN, MAX_RUN);
      p.runTime++;
    } else if (p.grounded) {
      p.vx *= GROUND_FRICTION;
      if (Math.abs(p.vx) < 0.08) p.vx = 0;
    } else {
      p.vx *= AIR_DRAG;
    }

    // Gravity, with a slower fall while wall sliding.
    const sliding = !p.grounded && p.wallDir !== 0 && p.vy > 0 && dir === p.wallDir;
    p.vy = Math.min(p.vy + GRAVITY, sliding ? WALL_SLIDE_FALL : MAX_FALL);

    // Jumping: ground / coyote / wall / double.
    if (p.jumpBuffer > 0) {
      if (p.grounded || p.coyote > 0) {
        p.vy = JUMP_VEL;
        p.grounded = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        p.jumps = 0;
        p.squash = 0.35;
        sfx.jump();
      } else if (p.wallDir !== 0) {
        p.vy = WALL_JUMP_VY;
        p.vx = -p.wallDir * WALL_JUMP_VX;
        p.face = -p.wallDir;
        p.jumpBuffer = 0;
        p.jumps = 0;
        p.squash = 0.3;
        sfx.jump();
      } else if (p.jumps < 1) {
        p.vy = DOUBLE_JUMP_VEL;
        p.jumps = 1;
        p.jumpBuffer = 0;
        p.squash = 0.3;
        sfx.doubleJump();
      }
    }
    // Releasing jump early cuts the jump short (variable jump height).
    if (!isHeld('jump') && p.vy < 0 && p.vy > JUMP_VEL * 0.4) {
      p.vy *= JUMP_CUT;
    }
  }

  const beforeY = p.y;
  const result = moveAndCollide(level, p, (impact) => {
    p.squash = -clamp(impact / 40, 0.1, 0.45);
    if (impact > 7) sfx.land();
  });
  const wasGrounded = p.grounded;
  p.grounded = result.grounded;
  if (p.grounded) {
    p.coyote = COYOTE_FRAMES;
    p.jumps = 0;
    p.canDash = true;
  } else if (wasGrounded) {
    p.coyote = COYOTE_FRAMES;
  } else if (p.coyote > 0) {
    p.coyote--;
  }
  // Wall contact: the collision result tells us which side we pressed.
  p.wallDir = result.hitWall !== 0 && !p.grounded ? result.hitWall : 0;
  if (p.grounded && beforeY === p.y && p.vy === 0) {
    // Standing still on the ground keeps the dash available.
    p.canDash = true;
  }
}
