// game.js — PINECREST's state machine, fixed-timestep loop, scoring,
// hazards, pickups, moving platforms, crumbling ledges and the screenshot
// presets (?shot=title|play|complete|gameover). Rendering lives in
// render.js; this file decides what happens each frame.

import { TILE, VIEW_H, SCORE_COIN, SCORE_SHARD, SCORE_STOMP, SPRING_VEL, MAX_HEARTS, PALETTES, LEVEL_PARS } from './config.js';
import { LEVELS, loadLevel } from './levels.js';
import { makePlayer, resetPlayer, updatePlayer } from './player.js';
import { updateWalkers, updateBats, stompOverlap } from './enemies.js';
import { makeParticles, burst, addText, addShake, updateParticles } from './particles.js';
import { makeCamera, resizeCamera, updateCamera, makeScenery, render, drawMenu } from './render.js';
import { initInput, isHeld, wasPressed, clearPressed, consumeClick, mousePos, pressAction, releaseAction, releaseAll } from './input.js';
import { unlockAudio, toggleMute, isMuted, sfx } from './audio.js';
import { clamp, formatTime, aabbOverlap } from './utils.js';
import { mulberry32 } from './rng.js';

export function makeGame(canvas) {
  const game = {
    canvas,
    ctx: canvas.getContext('2d'),
    state: 'title', // title | play | pause | complete | gameover | victory
    levelIndex: 0,
    level: null,
    scenery: null,
    camera: makeCamera(),
    player: makePlayer(0, 0),
    fx: makeParticles(),
    hearts: MAX_HEARTS,
    score: 0,
    totalScore: 0,
    coins: 0,
    shardsGot: 0,
    shardsTotal: 0,
    timeFrames: 0,
    totalTimeFrames: 0,
    frame: 0,
    respawn: { x: 0, y: 0 },
    menuRects: [],
    shot: null,
    shotFrames: 0,
    shotReady: false,
    completeStats: null,
    rand: mulberry32(20261117),
  };
  game.fx.rand = game.rand;
  initInput(canvas);
  return game;
}

function loadLevelInto(game, index) {
  game.levelIndex = index;
  game.level = loadLevel(LEVELS[index]);
  game.scenery = makeScenery(index, game.level);
  game.levelName = LEVELS[index].name;
  game.shardsTotal = game.level.shards.length;
  game.shardsGot = 0;
  game.coins = 0;
  game.timeFrames = 0;
  game.hearts = MAX_HEARTS;
  game.respawn = { x: game.level.start.x, y: game.level.start.y };
  resetPlayer(game.player, game.level.start.x, game.level.start.y);
  updateCamera(game.camera, game.level, game.player, true);
}

export function startLevel(game, index) {
  loadLevelInto(game, index);
  game.state = 'play';
  game.completeStats = null;
}

function startRun(game) {
  game.totalScore = 0;
  game.totalTimeFrames = 0;
  game.score = 0;
  startLevel(game, 0);
}

function respawnPlayer(game) {
  const p = game.player;
  resetPlayer(p, game.respawn.x, game.respawn.y);
  p.iframes = 90;
  updateCamera(game.camera, game.level, p, true);
}

function hurtPlayer(game, fromX) {
  const p = game.player;
  if (p.iframes > 0 || p.dead) return;
  game.hearts--;
  p.iframes = 90;
  p.vx = fromX < p.x + p.w / 2 ? 5 : -5;
  p.vy = -6;
  p.squash = 0.3;
  addShake(game.fx, 7);
  burst(game.fx, 14, {
    x: p.x + p.w / 2,
    y: p.y + p.h / 2,
    colors: ['#e74c3c', '#ffffff', '#ffb347'],
    speed: 3,
    size: 4,
    life: 30,
    up: 2,
  });
  sfx.hurt();
  if (game.hearts <= 0) {
    p.dead = true;
    game.state = 'gameover';
    sfx.gameOver();
  }
}

function pitFall(game) {
  game.hearts--;
  addShake(game.fx, 5);
  sfx.hurt();
  if (game.hearts <= 0) {
    game.player.dead = true;
    game.state = 'gameover';
    sfx.gameOver();
  } else {
    respawnPlayer(game);
  }
}

function clearLevel(game) {
  const seconds = Math.floor(game.timeFrames / 60);
  const par = LEVEL_PARS[game.levelIndex];
  const bonus = Math.max(0, par - seconds) * 10;
  game.score += bonus;
  game.totalScore += game.score;
  game.totalTimeFrames += game.timeFrames;
  const stars = game.shardsGot;
  game.completeStats = { seconds, bonus, stars, score: game.score };
  sfx.win();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'victory';
  } else {
    game.state = 'complete';
  }
}

function updateMovers(game) {
  for (const m of game.level.movers) {
    const prevX = m.x;
    const prevY = m.y;
    m.t += m.speed;
    // Ping-pong along the axis. The range may be negative (upward), so
    // the cycle math uses its absolute value and the sign is applied last.
    const rangePx = Math.abs(m.range);
    const cycle = rangePx * 2;
    const phase = (((m.t % cycle) + cycle) % cycle);
    const offset = phase <= rangePx ? phase : cycle - phase;
    const signed = m.range < 0 ? -offset : offset;
    if (m.axis === 'x') {
      m.x = m.homeX + signed;
      m.y = m.homeY;
    } else {
      m.x = m.homeX;
      m.y = m.homeY + signed;
    }
    m.dx = m.x - prevX;
    m.dy = m.y - prevY;
    // Carry a player standing on this platform.
    const p = game.player;
    if (p.standingOn === m) {
      p.x += m.dx;
      p.y += m.dy;
    }
  }
}

function landOnMovers(game, prevBottom) {
  const p = game.player;
  p.standingOn = null;
  if (p.vy < 0) return;
  for (const m of game.level.movers) {
    const feet = p.y + p.h;
    if (
      prevBottom <= m.y + 2 &&
      feet >= m.y &&
      feet <= m.y + 14 &&
      p.x + p.w > m.x + 2 &&
      p.x < m.x + m.w - 2
    ) {
      p.y = m.y - p.h;
      p.vy = 0;
      p.grounded = true;
      p.coyote = 7;
      p.jumps = 0;
      p.canDash = true;
      p.standingOn = m;
      return;
    }
  }
}

function updateCrumbles(game) {
  const p = game.player;
  if (!p.grounded) return;
  const footY = Math.floor((p.y + p.h + 1) / TILE);
  const x0 = Math.floor((p.x + 2) / TILE);
  const x1 = Math.floor((p.x + p.w - 2) / TILE);
  for (let tx = x0; tx <= x1; tx++) {
    if (footY < 0 || footY >= game.level.rows || tx < 0 || tx >= game.level.cols) continue;
    if (game.level.grid[footY][tx] === 2) {
      const c = game.level.crumbles.find((cc) => cc.tx === tx && cc.ty === footY);
      if (c && c.timer < 0) {
        c.timer = 26;
        sfx.crumble();
      }
    }
  }
  for (const c of game.level.crumbles) {
    if (c.timer > 0) {
      c.timer--;
      if (c.timer === 0) {
        c.gone = true;
        game.level.grid[c.ty][c.tx] = 0;
        burst(game.fx, 10, {
          x: c.x + TILE / 2,
          y: c.y + TILE / 2,
          colors: ['#a9805a', '#8a6a44', '#d8b48f'],
          speed: 2,
          size: 4,
          life: 26,
          up: 1,
        });
      }
    }
  }
}

function updatePlay(game) {
  const p = game.player;
  const level = game.level;
  game.timeFrames++;
  game.frame++;

  updateMovers(game);
  const prevBottom = p.y + p.h;
  const wasAirborne = !p.grounded;
  updatePlayer(p, level);
  landOnMovers(game, prevBottom);
  // Landing dust and a soft thud when Pip comes down from the air.
  if (wasAirborne && p.grounded) {
    burst(game.fx, 6, {
      x: p.x + p.w / 2,
      y: p.y + p.h,
      colors: ['#d8c8a8', '#ffffff'],
      speed: 1.4,
      size: 3,
      life: 20,
      up: 0.5,
    });
    sfx.land();
  }
  updateCrumbles(game);
  updateWalkers(level, level.walkers);
  updateBats(level.bats);
  for (const s of level.springs) if (s.anim > 0) s.anim--;

  // Springs launch Pip.
  for (const s of level.springs) {
    if (
      p.vy >= 0 &&
      p.x + p.w > s.x + 2 &&
      p.x < s.x + s.w - 2 &&
      p.y + p.h >= s.y + 8 &&
      p.y + p.h <= s.y + TILE
    ) {
      p.vy = SPRING_VEL;
      p.grounded = false;
      p.jumps = 0;
      s.anim = 10;
      sfx.spring();
    }
  }

  // Pickups.
  for (const c of level.coins) {
    if (c.taken) continue;
    if (Math.abs(p.x + p.w / 2 - c.x) < 20 && Math.abs(p.y + p.h / 2 - c.y) < 22) {
      c.taken = true;
      game.coins++;
      game.score += 50;
      addText(game.fx, c.x, c.y - 10, '+50', '#ffd94d');
      burst(game.fx, 6, { x: c.x, y: c.y, colors: ['#ffd94d', '#f7b731'], speed: 1.6, size: 3, life: 22, up: 1 });
      sfx.coin();
    }
  }
  for (const s of level.shards) {
    if (s.taken) continue;
    if (Math.abs(p.x + p.w / 2 - s.x) < 24 && Math.abs(p.y + p.h / 2 - s.y) < 26) {
      s.taken = true;
      game.shardsGot++;
      game.score += 250;
      addText(game.fx, s.x, s.y - 12, '+250', '#ffd94d');
      burst(game.fx, 14, { x: s.x, y: s.y, colors: ['#ffd94d', '#fff6c9', '#ffffff'], speed: 2.4, size: 4, life: 34, up: 2 });
      sfx.shard();
    }
  }

  // Checkpoints.
  for (const c of level.checkpoints) {
    if (!c.lit && Math.abs(p.x + p.w / 2 - c.x) < 24 && p.y + p.h > c.y - 48 && p.y < c.y + 8) {
      c.lit = true;
      game.respawn = { x: c.x - 11, y: c.y - 28 };
      game.score += 100;
      addText(game.fx, c.x, c.y - 56, 'CHECKPOINT +100', '#7fd4ff');
      sfx.checkpoint();
    }
  }

  // Enemies: stomp or hurt.
  for (const list of [level.walkers, level.bats]) {
    for (const e of list) {
      if (e.dead) continue;
      if (stompOverlap(p, e)) {
        e.dead = true;
        p.vy = isHeld('jump') ? -11 : -8.2;
        p.grounded = false;
        game.score += 100;
        addText(game.fx, e.x + e.w / 2, e.y - 8, '+100', '#ffffff');
        burst(game.fx, 12, { x: e.x + e.w / 2, y: e.y + e.h / 2, colors: ['#ffffff', '#d8c8f0', '#6b4a8a'], speed: 2.6, size: 4, life: 26, up: 2 });
        addShake(game.fx, 3);
        sfx.stomp();
      } else if (aabbOverlap(p, e)) {
        hurtPlayer(game, e.x + e.w / 2);
      }
    }
  }
  // A fatal hit ends the update here: a dead Pip clears nothing.
  if (game.state !== 'play') return;

  // Spikes.
  for (const s of level.spikes) {
    if (aabbOverlap(p, s)) {
      hurtPlayer(game, s.x + s.w / 2);
      if (game.state !== 'play') return;
      respawnPlayer(game);
      return;
    }
  }

  // Pit fall.
  if (p.y > level.height + 60) {
    pitFall(game);
    return;
  }

  // Beacon: level clear.
  const f = level.flag;
  if (Math.abs(p.x + p.w / 2 - f.x) < 26 && p.y + p.h > f.y - 58 && p.y < f.y + 8) {
    burst(game.fx, 26, { x: f.x, y: f.y - 40, colors: ['#ffd94d', '#ffb347', '#ffffff'], speed: 3, size: 5, life: 44, up: 3 });
    clearLevel(game);
    return;
  }

  updateParticles(game.fx);
  updateCamera(game.camera, level, p, false);

  if (wasPressed('pause')) game.state = 'pause';
  if (wasPressed('restart')) startLevel(game, game.levelIndex);
  if (wasPressed('mute')) toggleMute();
}

function menuButtons(game) {
  switch (game.state) {
    case 'title':
      return [
        { label: '▶  Start Climb', action: 'start' },
        { label: isMuted() ? 'Sound: Off' : 'Sound: On', action: 'mute' },
      ];
    case 'pause':
      return [
        { label: 'Resume', action: 'resume' },
        { label: 'Restart Level', action: 'restart' },
        { label: 'Quit to Title', action: 'title' },
      ];
    case 'complete':
      return [
        { label: 'Next Level  ▶', action: 'next' },
        { label: 'Replay Level', action: 'restart' },
      ];
    case 'gameover':
      return [
        { label: 'Try Again', action: 'restart' },
        { label: 'Back to Title', action: 'title' },
      ];
    case 'victory':
      return [
        { label: 'Climb Again', action: 'again' },
        { label: 'Back to Title', action: 'title' },
      ];
    default:
      return [];
  }
}

function menuTitle(game) {
  switch (game.state) {
    case 'title':
      return ['PINECREST', '← → move · Space jump ×2 · Shift dash · P pause'];
    case 'pause':
      return ['Paused', 'Level ' + (game.levelIndex + 1) + ' — ' + game.levelName];
    case 'complete': {
      const s = game.completeStats || { seconds: 0, bonus: 0, stars: 0, score: 0 };
      const stars = '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
      return ['Level Clear!', stars + '   Time ' + s.seconds + 's   Bonus +' + s.bonus + '   Score ' + s.score];
    }
    case 'gameover':
      return ['Game Over', 'The mountain wins this time.'];
    case 'victory':
      return [
        'Summit Lit!',
        'Total score ' + game.totalScore + '   ·   Total time ' + formatTime(game.totalTimeFrames),
      ];
    default:
      return ['', ''];
  }
}

function doMenuAction(game, action) {
  sfx.click();
  releaseAll(); // held keys never leak from a menu into gameplay
  switch (action) {
    case 'start':
      unlockAudio();
      startRun(game);
      break;
    case 'mute':
      toggleMute();
      break;
    case 'resume':
      game.state = 'play';
      break;
    case 'restart':
      startLevel(game, game.levelIndex);
      break;
    case 'next':
      startLevel(game, game.levelIndex + 1);
      break;
    case 'again':
      startRun(game);
      break;
    case 'title':
      loadLevelInto(game, 0);
      game.state = 'title';
      break;
    default:
      break;
  }
}

function updateMenu(game) {
  game.frame++;
  updateParticles(game.fx);
  if (wasPressed('confirm') || wasPressed('jump')) {
    const buttons = menuButtons(game);
    if (buttons.length > 0) doMenuAction(game, buttons[0].action);
    return;
  }
  if (game.state === 'pause' && wasPressed('pause')) {
    game.state = 'play';
    return;
  }
  if (consumeClick()) {
    const m = mousePos();
    for (const b of game.menuRects) {
      if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) {
        doMenuAction(game, b.action);
        return;
      }
    }
  }
}

function step(game) {
  if (game.state === 'play') updatePlay(game);
  else updateMenu(game);
  clearPressed();
}

// Screenshot presets. Each builds a fixed, lively scene and then freezes
// it so the screenshot is deterministic.
function applyShot(game, shot) {
  game.shot = shot;
  game.shotFrames = 0;
  if (shot === 'title') {
    loadLevelInto(game, 0);
    game.state = 'title';
    updateCamera(game.camera, game.level, game.player, true);
  } else if (shot === 'play') {
    loadLevelInto(game, 0);
    game.state = 'play';
    // Stand Pip on the high platform, coins above, walker below. Start
    // a little in from the platform's left edge so the first coin's
    // floating score text never clips the screen edge.
    game.player.x = 22 * TILE;
    game.player.y = 12 * TILE - game.player.h;
    game.player.face = 1;
    updateCamera(game.camera, game.level, game.player, true);
    // Walk right for a short scripted burst so the pose is mid-stride.
    game.shotScript = { frames: 26, right: true };
    pressAction('right');
  } else if (shot === 'complete') {
    loadLevelInto(game, 0);
    game.state = 'complete';
    game.hearts = 3;
    game.shardsGot = 3;
    game.score = 2450;
    game.timeFrames = 63 * 60;
    game.completeStats = { seconds: 63, bonus: 120, stars: 3, score: 2450 };
    game.player.x = game.level.flag.x - 40;
    game.player.y = game.level.flag.y - game.player.h;
    updateCamera(game.camera, game.level, game.player, true);
  } else if (shot === 'gameover') {
    loadLevelInto(game, 0);
    game.state = 'gameover';
    game.hearts = 0;
    game.player.x = 63 * TILE;
    game.player.y = 15 * TILE - game.player.h;
    game.player.dead = true;
    updateCamera(game.camera, game.level, game.player, true);
  }
}

export function start(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  resizeCamera(game.camera, game.canvas);
  window.addEventListener('resize', () => resizeCamera(game.camera, game.canvas));
  loadLevelInto(game, 0);
  game.state = 'title';
  if (shot) applyShot(game, shot);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'play') game.state = 'pause';
  });

  let last = performance.now();
  let acc = 0;
  const STEP = 1000 / 60;
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      if (game.shot === 'play' && game.shotScript) {
        // A scripted burst drives the 'play' screenshot, then the world
        // freezes so the shot is deterministic.
        if (game.shotScript.frames > 0) {
          game.shotScript.frames--;
          step(game);
          if (game.shotScript.frames === 0) releaseAction('right');
        }
      } else {
        step(game);
      }
      acc -= STEP;
      n++;
    }
    if (acc > STEP * 5) acc = 0;
    draw(game);
    if (game.shot) {
      game.shotFrames++;
      // Never signal readiness before the scripted burst has finished.
      const scriptDone = game.shot !== 'play' || !game.shotScript || game.shotScript.frames <= 0;
      if (game.shotFrames >= 3 && scriptDone && !game.shotReady) {
        game.shotReady = true;
        window.__shotReady = true;
      }
    } else if (!game.shotReady) {
      game.shotReady = true;
      window.__shotReady = true;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function draw(game) {
  const { ctx, canvas } = game;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  render(ctx, canvas, game);
  if (game.state !== 'play') {
    const [title, subtitle] = menuTitle(game);
    game.menuRects = drawMenu(ctx, canvas, title, subtitle, menuButtons(game), mousePos());
  } else {
    game.menuRects = [];
  }
}
