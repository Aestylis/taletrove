#!/usr/bin/env node
// scripts/bundle-armoria.js
// Downloads Azgaar's armoria-api source, adapts it for the browser,
// downloads all charge SVGs, and bundles everything with esbuild.
//
// Output:
//   app/armoria/armoria.bundle.js  — ES module bundle
//   app/armoria/charges/           — 700+ heraldic SVG charge files
//
// Usage: node scripts/bundle-armoria.js

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const ROOT       = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP        = join(ROOT, '.armoria-build');
const OUT_DIR    = join(ROOT, 'app', 'armoria');
const CHARGES_DIR = join(OUT_DIR, 'charges');

const GITHUB_RAW = 'https://raw.githubusercontent.com/Azgaar/armoria-api/main';
const GITHUB_API = 'https://api.github.com';

// ─── HTTP helpers ──────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = (u) => {
      https.get(u, { headers: { 'User-Agent': 'bundle-armoria/1.0' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) { req(res.headers.location); return; }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      }).on('error', reject);
    };
    req(url);
  });
}

async function getText(url) {
  const { status, body } = await httpGet(url);
  if (status !== 200) throw new Error(`HTTP ${status}: ${url}`);
  return body.toString('utf8');
}

async function getJson(url) {
  return JSON.parse(await getText(url));
}

async function downloadBinary(url, destPath) {
  const { status, body } = await httpGet(url);
  if (status !== 200) throw new Error(`HTTP ${status}: ${url}`);
  writeFileSync(destPath, body);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏰  Building Armoria heraldry bundle...\n');

  // 1. Setup directories
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(CHARGES_DIR, { recursive: true });

  // 2. Download source files from armoria-api/app/
  console.log('Downloading source files...');
  const srcFiles = ['alea.js', 'dataModel.js', 'generator.js', 'templates.js', 'renderer.js'];
  for (const file of srcFiles) {
    const text = await getText(`${GITHUB_RAW}/app/${file}`);
    writeFileSync(join(TMP, file), text);
    console.log(`  ✓ ${file}`);
  }

  // 3. Adapt renderer.js: replace Node.js APIs with browser equivalents
  console.log('\nAdapting renderer.js for browser...');
  let renderer = readFileSync(join(TMP, 'renderer.js'), 'utf8');

  // Remove Node.js-only requires
  renderer = renderer.replace(/^const HTMLParser = require\("node-html-parser"\);\n/m, '');
  renderer = renderer.replace(/^const fs = require\("fs"\);\n/m, '');

  // Inject configurable charges path before draw()
  renderer = renderer.replace(
    'async function draw(',
    'let _chargesBasePath = \'./armoria/charges/\';\n\n' +
    'function setChargesBasePath(p) { _chargesBasePath = p.endsWith(\'/\') ? p : p + \'/\'; }\n\n' +
    'async function draw('
  );

  // Replace fetchCharge: fs.readFileSync + node-html-parser → fetch + DOMParser
  renderer = renderer.replace(
    /async function fetchCharge\(charge, id\) \{[\s\S]*?\n\}/,
    [
      'async function fetchCharge(charge, id) {',
      '  try {',
      '    const resp = await fetch(_chargesBasePath + encodeURIComponent(charge) + \'.svg\');',
      '    if (!resp.ok) return null;',
      '    const text = await resp.text();',
      '    const doc = new DOMParser().parseFromString(text, \'image/svg+xml\');',
      '    const g = doc.querySelector(\'g\');',
      '    if (!g) return null;',
      '    g.setAttribute(\'id\', charge + \'_\' + id);',
      '    return g.outerHTML;',
      '  } catch (e) {',
      '    console.warn(\'[armoria] charge load failed:\', charge, e);',
      '    return null;',
      '  }',
      '}'
    ].join('\n')
  );

  // Export setChargesBasePath alongside draw
  renderer = renderer.replace(
    'module.exports = draw;',
    'module.exports = { draw, setChargesBasePath };'
  );

  // Silence per-COA console.log in production (logCOAdetails)
  renderer = renderer.replace(
    /\n\s*logCOAdetails\(coa, shield, division, ordinaries, charges\);\n/,
    '\n'
  );

  writeFileSync(join(TMP, 'renderer.js'), renderer);
  console.log('  ✓ renderer.js adapted (fetch + DOMParser)');

  // 4. Write CJS entry point (esbuild resolves all requires at bundle time)
  writeFileSync(join(TMP, 'index.js'), [
    'const { draw, setChargesBasePath } = require(\'./renderer.js\');',
    'const generate = require(\'./generator.js\');',
    'module.exports = { draw, setChargesBasePath, generate };',
  ].join('\n'));

  // 5. List all charge SVGs via GitHub tree API
  console.log('\nFetching charge list from GitHub...');
  const tree = await getJson(`${GITHUB_API}/repos/Azgaar/armoria-api/git/trees/main?recursive=1`);
  if (tree.message) throw new Error(`GitHub API error: ${tree.message}`);
  const chargeFiles = tree.tree
    .filter(f => f.type === 'blob' && f.path.startsWith('public/charges/') && f.path.endsWith('.svg'))
    .map(f => f.path.replace('public/charges/', ''));
  console.log(`  Found ${chargeFiles.length} charge SVGs`);

  // 6. Download all charge SVGs (batched to be polite to GitHub)
  console.log(`\nDownloading ${chargeFiles.length} charge SVGs...`);
  const BATCH = 20;
  let done = 0;
  const errors = [];
  for (let i = 0; i < chargeFiles.length; i += BATCH) {
    const batch = chargeFiles.slice(i, i + BATCH);
    await Promise.all(batch.map(async f => {
      try {
        await downloadBinary(`${GITHUB_RAW}/public/charges/${f}`, join(CHARGES_DIR, f));
        done++;
      } catch (e) {
        errors.push(f);
        console.warn(`\n  ⚠ Failed: ${f} (${e.message})`);
      }
    }));
    process.stdout.write(`  ${done}/${chargeFiles.length} charges\r`);
  }
  console.log(`  ✓ ${done} charges downloaded${errors.length ? ` (${errors.length} failed)` : ''}   `);

  // 7. Bundle with esbuild → browser-compatible ES module
  console.log('\nBundling with esbuild...');
  const outFile = join(OUT_DIR, 'armoria.bundle.js');
  execSync(
    `npx esbuild "${join(TMP, 'index.js')}" ` +
    `--bundle --format=esm --platform=browser ` +
    `--outfile="${outFile}" --log-level=warning`,
    { stdio: 'inherit', cwd: ROOT }
  );
  console.log(`  ✓ armoria.bundle.js`);

  // 8. Clean up temp dir
  rmSync(TMP, { recursive: true });

  console.log('\n✅  Armoria bundle complete!');
  console.log(`   Bundle:  app/armoria/armoria.bundle.js`);
  console.log(`   Charges: app/armoria/charges/ (${done} SVG files)`);
  if (errors.length) {
    console.log(`\n⚠  ${errors.length} charges failed to download:`);
    errors.forEach(f => console.log(`   - ${f}`));
  }
  console.log('');
}

main().catch(err => {
  console.error('\n❌  Bundle failed:', err.message);
  process.exit(1);
});
