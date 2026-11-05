#!/usr/bin/env node
// Build a client site from its JSON. Zero dependencies.
//
//   node tools/build-client.mjs clients/example-auto.json            -> dist/example-auto/
//   node tools/build-client.mjs clients/example-auto.json --strict   -> fails on placeholders (use before launch)
//   node tools/build-client.mjs --all                                -> every clients/*.json
//
// Images: put them in clients/<slug>/ and reference them as "/img/<file>" in the JSON.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, cpSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templates = { auto: 'auto-shop' };

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const files = args.includes('--all')
  ? readdirSync(join(root, 'clients')).filter((f) => f.endsWith('.json')).map((f) => join(root, 'clients', f))
  : args.filter((a) => !a.startsWith('--')).map((a) => resolve(a));

if (!files.length) {
  console.error('Usage: node tools/build-client.mjs clients/<slug>.json [--strict] | --all');
  process.exit(1);
}

const get = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
const filled = (v) => Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '';

const REQUIRED = [
  'slug', 'business.name', 'business.phone',
  'business.address.street', 'business.address.city', 'business.address.state', 'business.address.zip',
  'site.title', 'site.description', 'hero.headline', 'services', 'hours',
];

function findPlaceholders(node, path = '', out = []) {
  // Placeholder markers are UPPERCASE on purpose so normal copy ("we replace parts") doesn't trip them.
  if (typeof node === 'string' && (/\b(REPLACE|TODO)\b/.test(node) || /lorem ipsum/i.test(node))) out.push(path);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) findPlaceholders(v, path ? `${path}.${k}` : k, out);
  return out;
}

let failed = false;

for (const file of files) {
  const shop = JSON.parse(readFileSync(file, 'utf8'));
  const name = basename(file);
  const errors = REQUIRED.filter((p) => !filled(get(shop, p))).map((p) => `missing ${p}`);
  if (shop.slug && !/^[a-z0-9-]+$/.test(shop.slug)) errors.push('slug must be lowercase letters, numbers and dashes');
  if (filled(shop.business?.phone) && String(shop.business.phone).replace(/\D/g, '').length < 10) errors.push('business.phone needs 10 digits');

  const warnings = [];
  for (const p of findPlaceholders(shop)) warnings.push(`placeholder text still in ${p}`);
  if (shop.demo) warnings.push('demo is true (shows the "template preview" banner)');
  if (!filled(shop.site?.url)) warnings.push('site.url is empty (no canonical URL)');
  if (!filled(shop.tracking?.metaPixelId)) warnings.push('tracking.metaPixelId is empty (no ad conversion tracking)');
  if (!(shop.reviews?.items || []).some((i) => filled(i.quote))) warnings.push('no review quotes (reviews section shows only if a Google link is set)');

  const template = templates[shop.vertical || 'auto'];
  if (!template) errors.push(`unknown vertical "${shop.vertical}"`);

  if (errors.length || (strict && warnings.length)) {
    failed = true;
    console.error(`\n✗ ${name}`);
    [...errors, ...(strict ? warnings : [])].forEach((m) => console.error(`  - ${m}`));
    continue;
  }

  const { renderIndex, renderThanks } = await import(join(root, 'templates', template, 'render.mjs'));
  const out = join(root, 'dist', shop.slug);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), renderIndex(shop));
  mkdirSync(join(out, 'thanks'), { recursive: true });
  writeFileSync(join(out, 'thanks', 'index.html'), renderThanks(shop));
  cpSync(join(root, 'templates', template, 'style.css'), join(out, 'style.css'));
  const assets = join(dirname(file), shop.slug);
  if (existsSync(assets)) cpSync(assets, join(out, 'img'), { recursive: true });
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\n${shop.demo ? 'Disallow: /' : 'Allow: /'}\n`);

  console.log(`✓ ${name} -> dist/${shop.slug}/`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
}

process.exit(failed ? 1 : 0);
