#!/usr/bin/env node
// Build a client shop site from its content JSON. Zero dependencies, Node 18+.
//
//   node tools/build-client.mjs clients/<slug>.json            -> dist/<slug>/
//   node tools/build-client.mjs clients/<slug>.json --strict   -> pre-launch check: fails on placeholders
//   node tools/build-client.mjs templates/shop/content.json    -> the demo shop
//   node tools/build-client.mjs --all                          -> every clients/*.json
//
// Images: put them in clients/<slug>/ and reference them as "/img/<file>" in the JSON.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, cpSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES = { auto: 'shop', shop: 'shop' };
const BG = '#0E1113'; // must match --bg in shared/tokens.css

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const files = args.includes('--all')
  ? readdirSync(join(root, 'clients')).filter((f) => f.endsWith('.json')).map((f) => join(root, 'clients', f))
  : args.filter((a) => !a.startsWith('--')).map((a) => resolve(a));

if (!files.length) {
  console.error('Usage: node tools/build-client.mjs clients/<slug>.json [--strict] | --all');
  process.exit(1);
}

// WCAG 2.2 contrast
const hex = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim()); return m ? m[1] : null; };
const lum = (h) => {
  const n = parseInt(hex(h), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mixWhite = (h, t) => '#' + [0, 2, 4].map((i) => {
  const c = parseInt(hex(h).slice(i, i + 2), 16);
  return Math.round(c + (255 - c) * t).toString(16).padStart(2, '0');
}).join('');

function resolveTheme(t = {}) {
  const errors = [];
  const accent = t.accent || '#FFB000';
  if (!hex(accent)) return { errors: [`theme.accent "${accent}" must be a 6-digit hex like #E11D2E`] };
  const ink = t.accentInk || (contrast(accent, '#111111') >= contrast(accent, '#FFFFFF') ? '#111111' : '#FFFFFF');
  if (!hex(ink)) errors.push(`theme.accentInk "${ink}" must be a 6-digit hex`);
  // Default hover: the first lighter/darker shade that keeps both contrast rules.
  const mixBlack = (h, s) => '#' + [0, 2, 4].map((k) => Math.round(parseInt(hex(h).slice(k, k + 2), 16) * (1 - s)).toString(16).padStart(2, '0')).join('');
  const hover = t.accentHover || [mixWhite(accent, 0.15), mixWhite(accent, 0.08), mixBlack(accent, 0.08), mixBlack(accent, 0.15)]
    .find((c) => hex(ink) && contrast(ink, c) >= 4.5 && contrast(c, BG) >= 3) || accent;
  const a = contrast(accent, BG), i = hex(ink) ? contrast(ink, accent) : 0, ih = hex(ink) ? contrast(ink, hover) : 0;
  if (a < 3) errors.push(`theme.accent ${accent} is ${a.toFixed(2)}:1 against the page background. Needs 3:1. Pick a brighter shade.`);
  if (i < 4.5) errors.push(`theme.accentInk ${ink} is ${i.toFixed(2)}:1 on ${accent}. Needs 4.5:1. Try ${contrast(accent, '#111111') > contrast(accent, '#FFFFFF') ? '#111111' : '#FFFFFF'}.`);
  else if (ih < 4.5) errors.push(`button text is ${ih.toFixed(2)}:1 on the hover color ${hover}. Set theme.accentHover to a shade that keeps 4.5:1.`);
  return { theme: { accent, accentInk: ink, accentHover: hover }, errors, ratios: { accent: a, ink: i } };
}

const get = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
const REQUIRED = [
  'slug', 'business.name', 'business.phone',
  'business.address.street', 'business.address.city', 'business.address.state', 'business.address.zip',
  'site.title', 'site.description', 'hero.headline', 'services', 'hours',
];
// Placeholder markers are UPPERCASE on purpose so normal copy ("we replace parts") doesn't trip them.
function findPlaceholders(node, path = '', out = []) {
  if (typeof node === 'string' && (/\b(REPLACE|TODO)\b/.test(node) || /lorem ipsum/i.test(node))) out.push(path);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) findPlaceholders(v, path ? `${path}.${k}` : k, out);
  return out;
}

const tokens = readFileSync(join(root, 'shared/tokens.css'), 'utf8');
let failed = false;

for (const file of files) {
  const shop = JSON.parse(readFileSync(file, 'utf8'));
  const name = basename(file);
  const errors = REQUIRED.filter((p) => !filled(get(shop, p))).map((p) => `missing ${p}`);
  if (shop.slug && !/^[a-z0-9-]+$/.test(shop.slug)) errors.push('slug must be lowercase letters, numbers and dashes');
  if (filled(shop.business?.phone) && String(shop.business.phone).replace(/\D/g, '').length < 10) errors.push('business.phone needs 10 digits');
  const { theme, errors: themeErrors, ratios } = resolveTheme(shop.theme);
  errors.push(...themeErrors);
  const template = TEMPLATES[shop.vertical || 'shop'];
  if (!template) errors.push(`unknown vertical "${shop.vertical}"`);

  const warnings = findPlaceholders(shop).map((p) => `placeholder text still in ${p}`);
  if (shop.demo) warnings.push('demo is true (shows the "template preview" banner, blocks search engines)');
  if (!filled(shop.site?.url)) warnings.push('site.url is empty (no canonical URL)');
  if (!filled(shop.tracking?.metaPixelId)) warnings.push('tracking.metaPixelId is empty (no ad conversion tracking)');
  if (!(shop.reviews?.items || []).some((i) => filled(i.quote))) warnings.push('no real reviews yet, so the reviews section is hidden');

  if (errors.length || (strict && warnings.length)) {
    failed = true;
    console.error(`\n✗ ${name}`);
    [...errors, ...(strict ? warnings : [])].forEach((m) => console.error(`  - ${m}`));
    continue;
  }

  const { renderIndex, renderThanks } = await import(join(root, 'templates', template, 'render.mjs'));
  const out = join(root, 'dist', shop.slug);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'thanks'), { recursive: true });
  writeFileSync(join(out, 'index.html'), renderIndex(shop, theme));
  writeFileSync(join(out, 'thanks', 'index.html'), renderThanks(shop, theme));
  writeFileSync(join(out, 'shop.css'), `${tokens}\n${readFileSync(join(root, 'templates', template, 'shop.css'), 'utf8')}`);
  cpSync(join(root, 'shared/fonts'), join(out, 'fonts'), { recursive: true });
  const assets = join(dirname(file), shop.slug);
  if (existsSync(assets)) cpSync(assets, join(out, 'img'), { recursive: true });
  const initial = (shop.business.shortName || shop.business.name).trim()[0].toUpperCase().replace(/[<&>"']/g, '');
  writeFileSync(join(out, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${theme.accent}"/><text x="16" y="22.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="18" fill="${theme.accentInk}">${initial}</text></svg>`);
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\n${shop.demo ? 'Disallow: /' : 'Allow: /'}\n`);
  writeFileSync(join(out, '_headers'), '/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n');

  console.log(`✓ ${name} -> dist/${shop.slug}/  (accent ${ratios.accent.toFixed(1)}:1 on bg, button text ${ratios.ink.toFixed(1)}:1)`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
}

process.exit(failed ? 1 : 0);
