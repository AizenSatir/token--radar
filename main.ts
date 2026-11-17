// Token radar, round one: a driver that turns the sealed snapshot into a ranked board.
//
// It reads /input/snapshot.json (or whatever --input points at), runs every pre-token
// protocol through the scoring model in lib/model.ts, and lays out /output: the ranked
// board, a data script the dashboard reads, the static dashboard itself, three
// screenshots, and finally the dossier the judge reads, assembled with the vendored
// make.fun helper. The dashboard is plain HTML/CSS/JS with no framework and no
// network calls; it reads the data script this driver writes.
//
// The radar is a starting point: it covers the whole watchlist, names the model, and
// hands every protocol a farm plan. Improve the model, the page, or the plan — but
// keep the shape the gate expects.
//
// Outside the grading container, MAKEFUN_OUTPUT_DIR plays the role of /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { copyFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  boardIssue as checkBoard,
  buildRadar as scoreSnapshot,
  dataScript as renderData,
  parseSnapshot as readSnapshot,
} from './lib/model.ts';
import { buildDossier as makeDossier } from './vendor/makefun-board.ts';

/** Folder this file lives in, resolved from its own URL. */
const ROOT = fileURLToPath(new URL('.', import.meta.url));

/** The caps the gate enforces (reference/gate.json): only the text cap shapes bytes. */
const MAX_TEXT_BYTES = 65_536;
const SHOT_LIMITS = { max: 4, max_bytes: 524_288 };
const DASHBOARD_LIMITS = { max_files: 400, max_bytes: 4_194_304 };
/** Screenshot names: letters, digits and . _ -, 1 to 128 characters. */
const SHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** Read `--flag value` or `--flag=value` from the arguments, else the fallback. */
function readFlag(flag: string, fallback: string): string {
  const marker = `--${flag}`;
  const spot = process.argv.indexOf(marker);
  if (spot !== -1 && spot + 1 < process.argv.length) {
    return process.argv[spot + 1]!;
  }
  const paired = process.argv.find((entry) => entry.startsWith(`${marker}=`));
  if (paired === undefined) return fallback;
  return paired.slice(marker.length + 1);
}

/** A raw --input value becomes the snapshot path: a .json file as-is, else its folder. */
function snapshotPathFor(raw: string): string {
  return raw.endsWith('.json') ? raw : join(raw, 'snapshot.json');
}

/** Print a message to stderr and stop with the given code. */
function fail(message: string, code: number): never {
  process.stderr.write(message);
  process.exit(code);
}

/** Mirror one directory's regular files into `dst`, skipping dotfiles; returns the names. */
function mirrorDir(src: string, dst: string): string[] {
  const mirrored: string[] = [];
  if (!existsSync(src)) return mirrored;
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (entry.startsWith('.')) continue;
    const srcPath = join(src, entry);
    if (!statSync(srcPath).isFile()) continue;
    copyFileSync(srcPath, join(dst, entry));
    mirrored.push(entry);
  }
  return mirrored;
}

const rawInput = readFlag('input', '/input');
const snapPath = snapshotPathFor(rawInput);
if (!existsSync(snapPath)) {
  fail(`token radar: no snapshot at ${snapPath}: pass --input <snapshot.json|directory> or mount the sealed /input\n`, 2);
}
const outDir = readFlag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const sealed = readSnapshot(readFileSync(snapPath, 'utf8'));
const { board: ranked, radar: radarData } = scoreSnapshot(sealed);
const refusal = checkBoard(ranked, sealed);
if (refusal !== null) {
  fail(`token radar: the model wrote a board the gate refuses: ${refusal}\n`, 1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: ranked })}\n`);
writeFileSync(join(outDir, 'data.js'), renderData(radarData));

mirrorDir(join(ROOT, 'dashboard'), join(outDir, 'dashboard'));
const images = mirrorDir(join(ROOT, 'screenshots'), join(outDir, 'screenshots'));
if (images.length < 3) {
  fail(`token radar: screenshots/ holds ${images.length} image${images.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`, 1);
}
for (const shot of images) {
  if (!SHOT_NAME.test(shot)) {
    fail(`token radar: screenshots/${shot}: a name is letters, digits and . _ -, 1 to 128 characters\n`, 1);
  }
}

// The dossier goes last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  makeDossier(outDir, { text_max_bytes: MAX_TEXT_BYTES, screenshots: SHOT_LIMITS, dashboard: DASHBOARD_LIMITS }),
);

process.stdout.write(
  `token radar: ${sealed.protocols.length} protocols, ${sealed.watchlist.length} on the watchlist, ${ranked.length} rows scored (${radarData.early_size} early, ${radarData.live_size} live set aside)\n` +
    `token radar: wrote ${join(outDir, 'board.json')}, ${join(outDir, 'data.js')}, ${join(outDir, 'dashboard')} (3 files), ${join(outDir, 'screenshots')} (${images.length} images) and ${join(outDir, 'dossier.json')}\n`,
);
