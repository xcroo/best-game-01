# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/xcroo/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/xcroo/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**LUMEN DRIFT** — a 2D neon arena survival game. You are a lumen, a small orb of
light alone in a dark arena. Collect sparks, shoot the shadows that hunt you,
survive escalating waves, draft an upgrade after each wave, and face a boss —
the Hollow Star — every 5th wave. One more run.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files. Node 22+ for
`serve.ts` and `main.ts`; any desktop Chrome to play.

## How to play

- **WASD / arrows** — drift · **Mouse** — aim · **Hold click** — shoot
- **Space / Shift** — dash (short burst + brief invulnerability)
- **P / Esc** — pause · **M** — mute · **R** — restart after game over
- Collect sparks to build a combo multiplier; rare hearts heal 1 HP.
- Clear a wave to draft 1 of 3 upgrades (speed, fire rate, damage, magnet,
  spark value, dash, max HP, shield). Survive the boss every 5th wave.

## Screenshots

Four real renders of the game's own code, taken in headless Chrome at
1280×800 from the `?shot=` scenes the game itself provides:

1. `01-title.png` — title screen, controls, best score
2. `02-play.png` — mid-wave play: HUD, enemies, sparks, combo
3. `03-upgrade.png` — upgrade draft between waves (pick 1 of 3)
4. `04-gameover.png` — game over: final score, best, wave reached, restart

## Files

- `game/index.html` — canvas + HUD DOM + script tags, no network loads
- `game/src/main.js` — game loop, state machine (title / playing / draft / gameover)
- `game/src/config.js` — tuning constants (speeds, HP, wave table, upgrade pool)
- `game/src/input.js` — keyboard + mouse state
- `game/src/audio.js` — synthesized WebAudio SFX, no audio files
- `game/src/entities.js` — player, enemies, bullets, sparks, hearts, particles
- `game/src/world.js` — wave spawning, boss logic, upgrade draft
- `game/src/render.js` — canvas drawing, particles, floating text, screens
- `game/src/ui.js` — HUD + menus (DOM)
- `game/src/utils.js` — seeded RNG, math helpers
- `main.ts` — copies `game/` + `screenshots/` to `/output`, writes `dossier.json`
- `serve.ts` — serves `game/` on http://localhost:8080
- `shots.json` — the four screenshots (title, play, draft, game over)

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
