// main.ts — LUMEN DRIFT's entry program (Node 22, standard library only).
// It copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-game.ts. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output; the grader sets /output itself.
//
// NOTE (round-1 lesson): this program NEVER deletes the output directory
// itself. The grader runs as an unprivileged user with a read-only parent
// directory, so removing /output fails and the whole run fails. It only
// creates the directory and copies files INTO it.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(import.meta.dirname);
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(gameDir)) throw new Error(`main.ts: no game/ in ${repoRoot}`);
if (!existsSync(shotsDir)) throw new Error(`main.ts: no screenshots/ in ${repoRoot}`);
const shotFiles = readdirSync(shotsDir).filter((f) => !f.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`main.ts: screenshots/ holds ${shotFiles.length} images, need 3 or 4`);
}

// Create the output directory (and its subdirectories) if needed, then
// copy INTO it. The directory itself is never removed or renamed.
mkdirSync(join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`main.ts: wrote ${outDir} (dossier ${dossier.length} bytes)`);
