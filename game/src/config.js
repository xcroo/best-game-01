// config.js — every tunable number and palette for PINECREST.
// Nothing here reads the DOM or the network; game logic imports these
// constants so tuning never hides inside movement or drawing code.

export const TILE = 32;
export const VIEW_H = 540; // world units visible vertically; width follows aspect
export const GRAVITY = 0.55;
export const MAX_FALL = 13;
export const MAX_RUN = 3.4;
export const RUN_ACCEL = 0.6;
export const AIR_ACCEL = 0.42;
export const GROUND_FRICTION = 0.78;
export const AIR_DRAG = 0.94;
export const JUMP_VEL = -11.6;
export const DOUBLE_JUMP_VEL = -10.2;
export const JUMP_CUT = 0.45; // releasing jump early multiplies upward speed
export const COYOTE_FRAMES = 7;
export const JUMP_BUFFER_FRAMES = 7;
export const WALL_SLIDE_FALL = 2.1;
export const WALL_JUMP_VX = 4.4;
export const WALL_JUMP_VY = -10.6;
export const DASH_SPEED = 9.6;
export const DASH_FRAMES = 9;
export const DASH_COOLDOWN = 48;
export const SPRING_VEL = -16.5; // upward speed a spring gives Pip
export const STOMP_BOUNCE = -8.2;
export const STOMP_BOUNCE_HELD = -11.0;
export const HURT_IFRAMES = 90;
export const HURT_KNOCKBACK_X = 5.0;
export const HURT_KNOCKBACK_Y = -6.0;
export const MAX_HEARTS = 3;

export const SCORE_COIN = 50;
export const SCORE_SHARD = 250;
export const SCORE_STOMP = 100;
export const TIME_BONUS_RATE = 10; // points per second under par

// Tile legend for the level maps in levels.js.
export const T_EMPTY = '.';
export const T_ROCK = '#';
export const T_GRASS = '=';
export const T_SPIKE = '^';
export const T_COIN = 'c';
export const T_SHARD = 'o';
export const T_SPRING = '*';
export const T_CHECKPOINT = 'C';
export const T_FLAG = 'F';
export const T_START = 'P';
export const T_WALKER = 'W';
export const T_BAT = 'B';
export const T_CRUMBLE = '~';

// One palette per level: sky gradient, celestial body, ridge colours,
// pine colour, rock and grass colours, fog tint.
export const PALETTES = [
  {
    name: 'Meadow Rise',
    skyTop: '#7ec8f7',
    skyMid: '#bfe6fb',
    skyBottom: '#ffe9a8',
    sun: '#ffd94d',
    sunGlow: 'rgba(255, 217, 77, 0.35)',
    farRidge: '#8fb8d8',
    nearRidge: '#5d8fb0',
    pine: '#2f6b4f',
    pineDark: '#24543d',
    rock: '#8a7f74',
    rockDark: '#6e645a',
    grass: '#58a34a',
    grassLight: '#7cc46a',
    cloud: 'rgba(255, 255, 255, 0.85)',
    stars: false,
  },
  {
    name: 'Pinewood Climb',
    skyTop: '#4a3f7d',
    skyMid: '#9a6a9e',
    skyBottom: '#f2a56b',
    sun: '#ff9d5c',
    sunGlow: 'rgba(255, 157, 92, 0.35)',
    farRidge: '#6a5a94',
    nearRidge: '#4a3f6e',
    pine: '#1f4d3a',
    pineDark: '#173a2c',
    rock: '#6f6a80',
    rockDark: '#575264',
    grass: '#3f8a54',
    grassLight: '#5cab6d',
    cloud: 'rgba(255, 214, 180, 0.7)',
    stars: true,
  },
  {
    name: 'Summit Ridge',
    skyTop: '#0b1030',
    skyMid: '#27356b',
    skyBottom: '#7a5a9e',
    sun: '#e8ecff',
    sunGlow: 'rgba(200, 210, 255, 0.30)',
    farRidge: '#3a4470',
    nearRidge: '#252c52',
    pine: '#16303a',
    pineDark: '#10242c',
    rock: '#5d6478',
    rockDark: '#484e60',
    grass: '#cfe8f5',
    grassLight: '#ffffff',
    cloud: 'rgba(210, 220, 255, 0.55)',
    stars: true,
  },
];

// Par times in seconds; beating par pays a time bonus on level clear.
export const LEVEL_PARS = [75, 105, 135];
