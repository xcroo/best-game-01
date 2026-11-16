# LUMEN DRIFT — build notes (round 2)

## What this is

A complete fresh rebuild of LUMEN DRIFT for best-game-01 round 2, written
in a single session from DESIGN.md, the kit's RULES.txt and competition.yaml,
and the vendor library's buildDossier API. No file was copied or re-typed
from the round-1 build, the kit starter's game, or any other entry.

## The game

2D neon arena survival on a 1280×800 canvas. The player is a light orb
with 3 HP; WASD/arrows move, the mouse aims, holding click shoots, Space or
Shift dashes with i-frames. Enemies: chaser, orbiter, splitter (splits into
2 minis), spitter (ranged), and a boss every 5th wave with radial bullet
bursts and an HP bar. Sparks drop from kills and feed a combo multiplier
(+10% per pickup, decays after 2.5 s). Clearing a wave opens a 1-of-3
upgrade draft (speed, dash charges, magnet, max HP, spark value, fire rate,
damage, shield). Synthesized WebAudio SFX, pause (P), mute (M), best score
in localStorage, restart (R).

## Round 1 → round 2: the fix

Round 1 was rejected on exactly one check, `run_completes`: the game ran
fine locally but crashed in the grader's sandbox. The cause was in main.ts,
which called `rmSync(outDir, { recursive: true })` to start from a fresh
output directory. The grader runs the entry as unprivileged user 65534 with
a read-only parent directory, so deleting `/output` itself fails with EPERM
and the run exits 1. I reproduced this locally as uid 65534: the original
main.ts failed at that line, and the same file without the line exited 0.

The fix in this round's main.ts: the output directory is NEVER deleted,
removed or renamed. It only does `mkdirSync(outDir, { recursive: true })`
and copies files INTO it — exactly the pattern the kit starter uses. Nothing
is written outside MAKEFUN_OUTPUT_DIR (default /output), and no network is
used anywhere.

## Files

- `game/index.html` — canvas + HUD + overlays, no network loads
- `game/src/utils.js` — mulberry32 seeded RNG, clamp/lerp/dist helpers
- `game/src/config.js` — all tuning numbers and the upgrade pool
- `game/src/input.js` — keyboard + mouse state, edge-triggered presses
- `game/src/audio.js` — WebAudio synth SFX (pickup, shoot, hit, dash, fanfare, boss, game over)
- `game/src/entities.js` — player, enemies, bullets, sparks, hearts, particles, collisions
- `game/src/world.js` — wave spawning, boss waves, draft rolls, upgrade effects
- `game/src/render.js` — canvas drawing: starfield, arena, entities, particles, banners
- `game/src/ui.js` — HUD bar, title / draft / game-over overlays (DOM)
- `game/src/main.js` — loop, state machine, ?shot= scenes, ?soak= bot test
- `main.ts` — entry program (see the fix above)
- `serve.ts` — static server on localhost:8080 for play-testing
- `shots.json` — the four screenshot scenes
- `screenshots/` — 01-title, 02-play, 03-upgrade, 04-gameover (real headless-Chrome renders)
- `vendor/makefun-game.ts` — the kit's copy, byte-identical, unchanged

## Known limitations

- The boss has a single radial bullet pattern; later waves scale its HP and
  the number of bullets only.
- The soak bot plays a simple orbit-and-shoot policy, so the soak test
  exercises the loop, waves and scoring, not skilled play.
- Sound starts only after the first user gesture (browser autoplay policy);
  headless screenshots are therefore silent, as intended.

- `MAKEFUN_OUTPUT_DIR=out node main.ts` → out/ holds game/, screenshots/,
  dossier.json; dossier byte-identical to a fresh buildDossier run.
- Same command run as uid 65534 against a read-only repo copy → exit 0
  (this is the exact failure round 1 hit; the fix was verified this way).
- Headless playtest of each `?shot=` state: zero console/page errors,
  `window.__shotReady` becomes true.
- 60 s soak with scripted input (`?soak=1`): no errors, wave advances,
  score increases.
- Kit check without bundle: `node cli/makefun.mjs check --kit . --repo <clone>`
  from the kit directory.
