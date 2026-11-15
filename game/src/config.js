// config.js — every tuning number for LUMEN DRIFT lives here.
// Change a feel here, not in the systems that read it.

export const CONFIG = {
  canvas: { width: 1280, height: 800 },
  arena: { margin: 46 },

  player: {
    radius: 14,
    speed: 265,
    maxHp: 3,
    fireRate: 4.2, // shots per second while the mouse is held
    bulletSpeed: 560,
    bulletDamage: 1,
    bulletRadius: 4,
    magnetRadius: 95,
    sparkValue: 10,
    dashSpeed: 940,
    dashTime: 0.18, // seconds of dash burst
    dashCooldown: 1.5, // seconds between dashes
    dashIframes: 0.26, // seconds of invulnerability a dash grants
    invulnAfterHit: 1.0, // seconds of mercy invulnerability
    accel: 2400, // px/s^2 toward the held direction
    friction: 6.5, // velocity damping per second
  },

  combo: {
    window: 2.5, // seconds without a pickup before the combo resets
    step: 0.1, // +10% score per pickup, capped below
    maxMult: 5,
  },

  // Enemy kinds: shape, colour, behaviour, base stats. Wave scaling adds on top.
  enemies: {
    chaser: { radius: 16, hp: 2, speed: 78, score: 50, color: '#ff2e88', sparkDrop: 2 },
    mini: { radius: 10, hp: 1, speed: 150, score: 25, color: '#ff7ab8', sparkDrop: 1 },
    orbiter: { radius: 14, hp: 2, speed: 118, score: 75, color: '#a06bff', sparkDrop: 2 },
    splitter: { radius: 20, hp: 3, speed: 62, score: 100, color: '#ff8c1a', sparkDrop: 3 },
    spitter: { radius: 15, hp: 2, speed: 58, score: 100, color: '#39d353', sparkDrop: 2 },
    boss: { radius: 46, hp: 42, speed: 46, score: 1000, color: '#ff2e2e', sparkDrop: 24 },
  },

  // Per-wave growth, applied to every enemy of the wave.
  wave: {
    hpPerWave: 0.35, // +35% HP per wave above the first
    speedPerWave: 4, // +4 px/s per wave above the first
    baseCount: 4, // enemies in wave 1
    countPerWave: 2, // extra enemies per wave above the first
    spawnInterval: 0.55, // seconds between spawns
    clearBonus: 100, // points per wave number on clear
    bossEvery: 5, // a boss wave every 5th wave
    // Which kinds may appear, by first wave.
    unlocks: { chaser: 1, orbiter: 2, splitter: 3, spitter: 4 },
  },

  spitter: {
    fireInterval: 2.3, // seconds between shots
    bulletSpeed: 150,
    bulletRadius: 6,
    keepRange: 320, // tries to stay near this distance from the player
  },

  boss: {
    burstInterval: 2.6, // seconds between radial bursts
    burstCount: 12, // bullets per burst
    bulletSpeed: 165,
    bulletRadius: 7,
    hpPerWave: 9, // extra boss HP per boss wave above the first
    warnText: 'THE HOLLOW STAR AWAKENS',
  },

  drops: {
    heartChance: 0.03, // chance a normal enemy drops a healing heart
    sparkScatter: 26, // px radius sparks scatter around a kill
    sparkLife: 14, // seconds before a spark fades
  },

  // The upgrade draft: 3 cards offered after each cleared wave, pick 1.
  upgrades: [
    { id: 'swift', name: 'Swift Boots', desc: '+15% move speed', icon: '»', color: '#22d3ee' },
    { id: 'rapid', name: 'Rapid Trigger', desc: '+20% fire rate', icon: '×', color: '#facc15' },
    { id: 'heavy', name: 'Heavy Rounds', desc: '+1 bullet damage', icon: '◆', color: '#fb923c' },
    { id: 'magnet', name: 'Spark Magnet', desc: '+70 magnet radius', icon: '◎', color: '#f472b6' },
    { id: 'greed', name: 'Greed Core', desc: 'Sparks worth ×2', icon: '✦', color: '#fbbf24' },
    { id: 'dash', name: 'Phase Dash', desc: '−25% dash cooldown', icon: '↯', color: '#67e8f9' },
    { id: 'vitality', name: 'Vitality', desc: '+1 max HP and heal 1', icon: '♥', color: '#4ade80' },
    { id: 'aegis', name: 'Aegis Shield', desc: 'Block one hit each wave', icon: '⛨', color: '#a78bfa' },
  ],

  colors: {
    background: '#070a1a',
    grid: 'rgba(120, 140, 255, 0.05)',
    player: '#22e6ff',
    spark: '#ffc53d',
    heart: '#ff5d73',
    bullet: '#aefcff',
    enemyBullet: '#ff5d8f',
    text: '#dbe7ff',
    dim: '#8b98c9',
  },

  storage: { bestKey: 'lumen-drift-best' },
};
