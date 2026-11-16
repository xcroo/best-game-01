# LUMEN DRIFT

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/xcroo/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/xcroo/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A 2D neon arena survival game for [make.fun's best-game-01](https://make.fun/bounty/best-game-01) bounty. You are a lumen — a small orb of light — alone in a dark arena. Collect sparks, shoot the shadows that hunt you, survive escalating waves, draft an upgrade after each wave, and face a boss every 5th wave. One more run.

## How to play

Serve the game and open it in a desktop browser:

```
node serve.ts
# open http://localhost:8080/
```

- **WASD / arrows** — move
- **Mouse** — aim, **hold left click** — shoot
- **Space / Shift** — dash (brief invulnerability, ~2 s to recharge a charge)
- **P / Esc** — pause, **M** — mute, **R** — restart after game over

Sparks raise your score through a combo multiplier that grows with every pickup and decays after 2.5 s without one. Clearing a wave opens an upgrade draft — pick 1 of 3. Every 5th wave a boss arrives with radial bullet patterns and an HP bar. Hearts are a rare drop and heal 1 HP.

## Files

- `game/index.html` — canvas + HUD + menu overlays, no network loads
- `game/src/` — one job per file: `main.js` (loop + state machine), `config.js` (tuning), `input.js` (keyboard + mouse), `audio.js` (synthesized WebAudio SFX), `entities.js` (player, enemies, bullets, pickups), `world.js` (waves, boss, draft), `render.js` (canvas drawing), `ui.js` (HUD + menus), `utils.js` (seeded RNG + math)
- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output` and writes `/output/dossier.json` with the kit's `buildDossier`
- `serve.ts` — tiny static server for local play-testing
- `screenshots/` — 4 real renders of the game's own code (`?shot=title|play|draft|gameover`)

No external assets, no webfonts, no network requests: everything is drawn and synthesized in code.

## Round 2

This is a full fresh rebuild for round 2. Round 1 was rejected on one check
only (`run_completes`): its `main.ts` deleted the output directory with
`rmSync`, which the grader's unprivileged sandbox user cannot do. This
round's `main.ts` never deletes the output directory — it only creates it
and copies files into it. See `BUILD-NOTES.md` for the details.

## License

GPL-3.0-only — see `LICENSE`.
