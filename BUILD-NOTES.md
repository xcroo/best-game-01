# BUILD-NOTES.md — LUMEN DRIFT (best-game-01)

Built fresh in one session starting after the competition opened
(2026-11-15T18:00:00Z). Every file under `game/` and the entrypoint
`main.ts` / `serve.ts` were written from the design brief in this session;
nothing was copied from the kit's starter or any other game.

## What it is

A 2D neon arena survival game on a single HTML5 canvas, plain ES modules,
no libraries, no network requests, no external assets. The player is a lumen
— a small orb of light — drifting in a dark indigo arena, collecting sparks,
shooting five enemy kinds, drafting 1 of 3 upgrades after each cleared wave,
and fighting a boss (the Hollow Star) every 5th wave.

## Design choices

- **DOM HUD + canvas arena.** Hearts, score, wave, combo/dash meters and the
  boss bar are DOM (crisp, readable when the screenshot is shrunk); the
  arena, entities, particles and floating text are canvas. Title, draft and
  game-over screens are DOM overlays over the live arena.
- **Synthesized sound.** All SFX are WebAudio oscillator/noise envelopes
  (`audio.js`); the context is created only on the first user gesture, and
  screenshot/soak runs stay muted so no context is created headlessly.
- **Deterministic shot scenes.** `?shot=title|play|draft|gameover` builds a
  fixed demo state from a seeded RNG and sets `window.__shotReady` once
  rendered, so the four screenshots are real renders of the game's own code.
- **Combo scoring.** Each spark raises the combo; the multiplier grows +10%
  per pickup (cap ×5) and resets after 2.5 s without one, so chaining
  pickups matters more than hoarding them.
- **Fair tuning.** The player has 3 HP, 1 s of mercy invulnerability after a
  hit, and a dash with i-frames on a 1.5 s cooldown; enemy contact knocks the
  enemy back so one touch is one hit. Waves ramp count, speed and HP, and new
  enemy kinds unlock one per wave.

## Tests run in this session

- `MAKEFUN_OUTPUT_DIR=out node main.ts` → `out/` holds `game/`,
  `screenshots/`, `dossier.json`; dossier byte-identical to a fresh
  `buildDossier` run on the same output, and two runs are byte-identical
  (dossier 396,885 bytes; text 71,655 bytes, under the 160 KiB cap).
- Headless playtest of each `?shot=` state (Playwright headless shell,
  1280×800): zero console/page errors, `window.__shotReady` becomes true
  (title / play / draft / gameover). Screenshots are real renders of the
  game's own code; PNGs over the 256 KiB cap were saved as JPEG q88
  (54–69 KB each), which the rules allow.
- 60 s headless soak with scripted input (`?soak=1`, autopilot + auto-pick
  of draft cards): no errors, wave 1 → 2, score 645, 9 kills, 238 shots.
- Kit check (`node cli/makefun.mjs check --kit . --repo <clone>`) run by the
  parent agent after the bundle exists.

Note: the VM's Hatch Chromium build refuses `localhost` navigation
(ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS) and its one-shot
`--screenshot`/`--dump-dom` modes produce no output, so playtests and
screenshots used the Playwright `chromium_headless_shell` from
`~/.cache/ms-playwright/`, driven directly and over CDP on port 9333.

## Known limits

- Desktop keyboard + mouse only; no touch controls.
- Best score is kept in `localStorage` per browser.
- The soak autopilot plays conservatively; a human player will do better.
