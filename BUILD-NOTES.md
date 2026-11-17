# PINECREST — build notes (round 3)

## What it is
A fresh 2D precision platformer written for best-game-01 round 3. It is a
new concept, not a rework of the round-2 entry: different genre mechanics
(platforming instead of arena survival), different art direction (dawn
mountain instead of neon arena), different code throughout.

## Layout
- `main.ts` — entrypoint: copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with `buildDossier`. It only creates
  directories; it never deletes the output directory (the grader runs as
  uid 65534 with a read-only parent, so deleting /output fails with EPERM
  — that exact failure rejected the round-1 entry).
- `game/index.html` — the page; loads `src/main.js` as a module.
- `game/src/config.js` — tuning numbers, palettes, tile legend.
- `game/src/rng.js` — seeded random generator for deterministic scenery.
- `game/src/utils.js` — pure math helpers.
- `game/src/levels.js` — three hand-built tile maps plus the loader.
- `game/src/audio.js` — synthesized sound effects and chiptune loop.
- `game/src/input.js` — keyboard and mouse state, plus synthetic input
  for headless tests.
- `game/src/physics.js` — tile collision and movement integration.
- `game/src/player.js` — Pip: running, jumping, wall jumps, dash.
- `game/src/enemies.js` — thorn-walkers and spore-bats.
- `game/src/particles.js` — dust, sparkles, floating text, screen shake.
- `game/src/render.js` — parallax mountain, tiles, creatures, HUD, menus.
- `game/src/game.js` — state machine, fixed-timestep loop, scoring,
  hazards, pickups, movers, crumbling ledges, screenshot presets.
- `game/src/main.js` — boot: sizes the canvas and starts the game.
- `screenshots/` — four renders of the game itself (see `shots.json`).
- `DESIGN.md` — the design this build follows.

## How to run it locally
```sh
cd game && python3 -m http.server 8080
```
Open http://localhost:8080. Screenshot states:
`?shot=title`, `?shot=play`, `?shot=complete`, `?shot=gameover`.
Each sets a fixed scene and raises `window.__shotReady` once rendered.

## How to check the entry
```sh
node --check game/src/*.js
node validate-levels.mjs
MAKEFUN_OUTPUT_DIR=out node main.ts
```
Run `main.ts` twice into two fresh directories and compare the two
`dossier.json` files byte for byte — they must match. The uid-65534
grader reproduction, run from the repository root with a fresh copy and
a fresh output directory:
```sh
rm -rf /tmp/pinecrest-copy /tmp/pinecrest-out && cp -r . /tmp/pinecrest-copy
chmod -R a+rX /tmp/pinecrest-copy && mkdir -p /tmp/pinecrest-out && chmod 777 /tmp/pinecrest-out
setpriv --reuid=65534 --regid=65534 --clear-groups env MAKEFUN_OUTPUT_DIR=/tmp/pinecrest-out MAKEFUN_BOT_DIR=/tmp/pinecrest-copy TZ=UTC PYTHONHASHSEED=0 LANG=C.UTF-8 timeout 120 node /tmp/pinecrest-copy/main.ts
```
Expect exit 0 and a `dossier.json` in the output directory.
Screenshots are taken with the Playwright helper in `shot.mjs`
(chromium_headless_shell, 1280x800) and the 60-second soak test is
`soak-test.mjs`; both live in `~/workspace/makefun/bestgame/`.

## Known limitations
- Thorn-walkers patrol over spike tiles without taking damage; spikes
  only hurt the player. This is by design (they are made of thorns).
- The chiptune loop starts only after the first user gesture, because
  browsers block audio before interaction; headless runs stay silent.
- The game is tuned for a desktop keyboard and mouse; touch controls
  are not implemented.
