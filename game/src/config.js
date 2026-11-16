// config.js — every tuning number for LUMEN DRIFT in one place.
// No imports. The rest of the game reads CFG and never hard-codes a value.

export const CFG = {
  // Arena and canvas.
  W: 1280,
  H: 800,
  ARENA_MARGIN: 46,

  // Player.
  PLAYER_RADIUS: 14,
  PLAYER_HP: 3,
  PLAYER_SPEED: 265,
  PLAYER_FIRE_RATE: 5.2, // shots per second
  PLAYER_BULLET_SPEED: 640,
  PLAYER_BULLET_DAMAGE: 1,
  PLAYER_BULLET_RADIUS: 4,
  PLAYER_BULLET_LIFE: 1.1,
  PLAYER_MAGNET_RADIUS: 90,
  PLAYER_SPARK_VALUE: 10,

  // Dash: a short burst plus brief invulnerability.
  DASH_SPEED: 920,
  DASH_TIME: 0.16,
  DASH_IFRAMES: 0.38,
  DASH_COOLDOWN: 0.35, // shortest gap between two dashes
  DASH_RECHARGE: 2.0, // seconds to regain one dash charge
  DASH_MAX_CHARGES: 1,

  // Damage / combo.
  HIT_INVULN: 1.0, // seconds of invulnerability after taking a hit
  COMBO_WINDOW: 2.5, // seconds a combo survives without a pickup
  COMBO_STEP: 0.1, // +10% score per combo step, capped below
  COMBO_MAX_MULT: 5,

  // Sparks and hearts.
  SPARK_RADIUS: 9,
  SPARK_MAGNET_SPEED: 520,
  SPARK_DRIFT: 24,
  HEART_DROP_CHANCE: 0.05,
  HEART_RADIUS: 11,

  // Waves.
  WAVE_BASE_COUNT: 6, // enemies in wave 1 before the per-wave growth
  WAVE_GROWTH: 3, // extra enemies per wave
  WAVE_SPAWN_INTERVAL: 0.55, // seconds between spawns
  WAVE_BANNER_TIME: 2.2, // seconds the "WAVE N" banner stays up
  WAVE_CLEAR_BONUS: 100, // points per wave number on clear
  BOSS_BONUS: 500,
  BOSS_EVERY: 5, // a boss appears on every 5th wave

  // Enemy base stats. HP and speed grow a little with the wave number.
  ENEMIES: {
    chaser: { hp: 3, speed: 78, radius: 13, sparks: 3, color: '#ff2e88', score: 25 },
    orbiter: { hp: 2, speed: 132, radius: 11, sparks: 2, color: '#a55cff', score: 30 },
    splitter: { hp: 5, speed: 58, radius: 16, sparks: 3, color: '#ff8a2a', score: 40 },
    mini: { hp: 1, speed: 150, radius: 8, sparks: 1, color: '#ff5c5c', score: 10 },
    spitter: { hp: 4, speed: 66, radius: 13, sparks: 3, color: '#37e08b', score: 45 },
    boss: { hp: 130, speed: 42, radius: 46, sparks: 14, color: '#ff2244', score: 500 },
  },
  ENEMY_HP_GROWTH: 0.14, // +14% HP per wave above 1
  ENEMY_SPEED_GROWTH: 0.03, // +3% speed per wave above 1
  SPITTER_SHOT_INTERVAL: 2.4,
  SPITTER_BULLET_SPEED: 175,
  SPITTER_BULLET_RADIUS: 6,
  BOSS_BURST_INTERVAL: 2.1,
  BOSS_BURST_COUNT: 10,
  BOSS_BULLET_SPEED: 150,

  // Draft upgrades. `max` is how many times the upgrade can be taken.
  UPGRADES: [
    { id: 'swift', name: 'Swift Current', desc: '+18% move speed', max: 3 },
    { id: 'dash', name: 'Second Wind', desc: '+1 dash charge', max: 2 },
    { id: 'magnet', name: 'Lumen Magnet', desc: '+70 spark pull radius', max: 3 },
    { id: 'vitality', name: 'Bright Heart', desc: '+1 max HP and heal 1', max: 2 },
    { id: 'rich', name: 'Golden Sparks', desc: 'sparks are worth double', max: 1 },
    { id: 'rapid', name: 'Rapid Pulse', desc: '+25% fire rate', max: 3 },
    { id: 'heavy', name: 'Heavy Light', desc: '+1 bullet damage', max: 2 },
    { id: 'aegis', name: 'Aegis Halo', desc: 'block one hit each wave', max: 1 },
  ],

  // Feel.
  SHAKE_ON_HIT: 9,
  SHAKE_DECAY: 26,
  PARTICLE_CAP: 420,
  FLOAT_CAP: 40,
};
