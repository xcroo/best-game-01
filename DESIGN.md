# PINECREST — best-game-01 round 3 design

## The game
PINECREST is a 2D precision platformer. You are Pip, a small climber with a
red scarf, ascending Pinecrest Mountain at dawn to light the summit beacon.
Three hand-built levels, one long climb: meadow, pinewood, summit ridge.
Run, jump, double-jump, wall-jump and air-dash up the mountain; stomp
thorn-walkers, dodge spore-bats and spikes; collect sun-shards; rest at
checkpoints; reach the beacon before your three hearts run out.

## Why this concept
Round 2 (an arena survival game) scored 710,935 and ranked 2572 of 7,829 —
a solid game, but the judge sees hundreds of arena survivors. A platformer
shows a different, instantly readable loop in screenshots: a character
mid-jump over a gap, coins in an arc, an enemy below, a flag ahead. The
climb gives the screenshots a natural story (title vista → mid-climb action
→ summit beacon), and the mechanics (double jump, wall jump, dash, moving
platforms, crumbling ledges) give the judge depth to weigh.

## Levels
- Level 1 "Meadow Rise" — gentle: wide platforms, few spikes, one walker,
  teaches jump, double jump, stomp. Palette: dawn green and gold.
- Level 2 "Pinewood Climb" — vertical: wall-jump shafts, moving platforms,
  bats, crumbling ledges, two walkers. Palette: dusk violet and pine green.
- Level 3 "Summit Ridge" — hard: narrow ledges, spike fields, dash gaps,
  bat swarms, long moving-platform rides. Palette: night blue, stars, snow.

Each level has 3 sun-shards (one hidden off the main path), coins, a
checkpoint midway, and a beacon flag at the end.

## Mechanics
- Move: arrows or A/D. Jump: Space / W / Up — hold for a higher jump,
  release early to cut it short. Double jump in the air (a puff of feathers).
- Wall slide and wall jump on rock faces (Pip slides slowly, then kicks off).
- Air dash: Shift or X — a quick burst in the facing direction, once per
  airtime, with a short cooldown shown on the HUD.
- Stomp: land on a walker or bat to squash it (+100). Touching one from the
  side costs a heart, with knockback and brief invulnerability.
- Springs launch Pip high. Moving platforms carry Pip. Crumbling ledges
  fall away a moment after Pip steps on them.
- Spikes and pits cost a heart and return Pip to the last checkpoint.
- Score: coin +50, shard +250, stomp +100, level-clear time bonus.
  A level is cleared by touching its beacon; clearing all three lights the
  summit and shows the victory screen with total time and score.

## Feel and polish
- Coyote time and jump buffering so jumps never feel eaten.
- Squash and stretch on jumps and landings, landing dust, shard sparkles,
  stomp puffs, floating score text, screen shake on damage.
- Parallax sky: gradient, sun/moon, drifting clouds, two mountain ridges,
  a pine treeline — all drawn in code, no image assets.
- Synthesized sound: jump, coin, shard, stomp, hurt, dash, spring,
  checkpoint chime, win fanfare, plus a quiet chiptune loop. M mutes.
- HUD: hearts, shards, coins, score, timer, level name, dash meter.
- Menus: title (with controls), pause, level complete (stars + stats),
  game over (retry), victory (total score + time). Mouse clicks work on
  every menu button; R restarts, P pauses.

## Tech
- Plain canvas 2D, no libraries, no network, no assets: every sprite is
  drawn in code. Fixed 60 Hz timestep, deterministic: a seeded RNG drives
  all cosmetic randomness, so the same inputs give the same game.
- Source is split by job: config, rng, utils, levels, audio, input,
  physics, player, enemies, particles, render, game, main.
- Screenshot states: ?shot=title | play | complete | gameover. Each sets a
  fixed scene and raises window.__shotReady once it has rendered.

## Testing
- `node --check` on every source file.
- `node validate-levels.mjs` checks the maps (row lengths, one start, one
  flag, three shards, a checkpoint per level).
- `main.ts` runs twice into fresh output directories; the two
  `dossier.json` files must be byte-identical.
- The uid-65534 grader reproduction runs `main.ts` as uid 65534 with a
  read-only repo copy and a fresh output directory; it must exit 0.
- A headless playtest loads every `?shot=` state and requires zero
  console or page errors.
- A 60-second soak test drives Pip right with jumps and checks that the
  game keeps running, the score advances, and no errors appear.
- main.ts copies game/ and screenshots/ to the output directory and writes
  dossier.json with buildDossier. It only creates directories; it never
  deletes the output directory (the grader runs as uid 65534 with a
  read-only parent, so deleting /output fails).
