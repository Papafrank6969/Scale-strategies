#!/usr/bin/env node
// Copies shared/tokens.css into agency/agency.css (between the tokens:start/end markers)
// and the font into agency/fonts/, so agency/ stays a self-contained folder Netlify can serve as-is.
//   node tools/sync-tokens.mjs           write
//   node tools/sync-tokens.mjs --check   exit 1 if agency/ is out of date (use in CI)

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = readFileSync(join(root, 'shared/tokens.css'), 'utf8').trim();
const cssPath = join(root, 'agency/agency.css');
const css = readFileSync(cssPath, 'utf8');
const re = /\/\* tokens:start \*\/[\s\S]*?\/\* tokens:end \*\//;
if (!re.test(css)) { console.error('agency/agency.css is missing the tokens:start/end markers'); process.exit(1); }
const next = css.replace(re, `/* tokens:start */\n${tokens}\n/* tokens:end */`);

const fonts = ['archivo-latin-wght.woff2', 'OFL.txt'];
const fontsStale = fonts.some((f) => !existsSync(join(root, 'agency/fonts', f))
  || !readFileSync(join(root, 'agency/fonts', f)).equals(readFileSync(join(root, 'shared/fonts', f))));

if (process.argv.includes('--check')) {
  const stale = next !== css || fontsStale;
  console.log(stale ? 'agency/ is out of date. Run: node tools/sync-tokens.mjs' : 'agency/ tokens and fonts are in sync');
  process.exit(stale ? 1 : 0);
}

writeFileSync(cssPath, next);
mkdirSync(join(root, 'agency/fonts'), { recursive: true });
fonts.forEach((f) => copyFileSync(join(root, 'shared/fonts', f), join(root, 'agency/fonts', f)));
console.log('Synced shared/tokens.css -> agency/agency.css and shared/fonts -> agency/fonts');
