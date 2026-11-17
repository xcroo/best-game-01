// main.ts — the entrypoint for the PINECREST entry.
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json with buildDossier from vendor/makefun-game.ts.
// It only creates directories: it never deletes the output directory,
// because the grader runs as uid 65534 with a read-only parent and
// deleting /output would fail with EPERM.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(rootDir, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(rootDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('PINECREST entry written to ' + outDir);
