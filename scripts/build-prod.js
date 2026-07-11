/**
 * WS8 — production build: copies the deployable site into dist/ and minifies JS/CSS.
 *
 * Design decisions (see tests/perf/README.md WS8 entry):
 *  - Minify-only, NO bundling: classic scripts share global scope and execute in
 *    document order; the SW STATIC_ASSETS list and ?v= cache-busting assume a 1:1
 *    file mapping. esbuild in script (non-module) transform mode preserves top-level
 *    identifiers — the cross-file globals — and renames only function-locals.
 *  - NO hashed filenames: the existing ?v=YYYY.MM.DD.XX strings + SW CACHE_NAME are
 *    the cache-busting mechanism; hashing would require rewriting index.html + sw.js
 *    per build for no additional benefit.
 *  - forge/ stays the editable no-build dev source; dist/ is the deploy artifact.
 *
 * Usage:  node scripts/build-prod.js       # writes ./dist
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Deployable entries at the repo root (site root on the server).
const ROOT_ENTRIES = [
  'index.html', 'privacy.html', 'terms.html', 'robots.txt', 'sitemap.xml',
  'LICENSE', '_headers', 'TaleTrove.png', 'TaleTrove_light.png',
  'art', 'forge',
];
// Runtime-linked doc (obsidian-importer.js links ../docs/obsidian-import.md).
const EXTRA_FILES = ['docs/obsidian-import.md'];

// Excluded anywhere in the tree.
const EXCLUDE = new Set(['dice-box', 'STATUS.md', 'SCAN_PLAN.md', '.DS_Store']);

function copyFiltered(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    if (EXCLUDE.has(path.basename(src))) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (EXCLUDE.has(entry)) continue;
      copyFiltered(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (fs.statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

(async () => {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  for (const entry of ROOT_ENTRIES) {
    const src = path.join(ROOT, entry);
    if (fs.existsSync(src)) copyFiltered(src, path.join(DIST, entry));
  }
  for (const f of EXTRA_FILES) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(path.join(DIST, f)), { recursive: true });
      fs.copyFileSync(src, path.join(DIST, f));
    }
  }

  let jsBefore = 0, jsAfter = 0, cssBefore = 0, cssAfter = 0, files = 0, skipped = [];
  for (const file of walk(DIST)) {
    const ext = path.extname(file);
    if (ext !== '.js' && ext !== '.css') continue;
    const src = fs.readFileSync(file, 'utf8');
    try {
      const result = await esbuild.transform(src, {
        loader: ext === '.js' ? 'js' : 'css',
        minify: true,
        target: 'es2020',
      });
      const before = Buffer.byteLength(src), after = Buffer.byteLength(result.code);
      if (ext === '.js') { jsBefore += before; jsAfter += after; }
      else { cssBefore += before; cssAfter += after; }
      fs.writeFileSync(file, result.code);
      files++;
    } catch (err) {
      skipped.push(`${path.relative(DIST, file)}: ${err.message.split('\n')[0]}`);
    }
  }

  const mb = b => (b / 1024 / 1024).toFixed(2) + 'MB';
  const pct = (a, b) => b ? ((1 - a / b) * 100).toFixed(0) + '%' : '-';
  console.log(`dist/ built. Minified ${files} files.`);
  console.log(`  JS : ${mb(jsBefore)} -> ${mb(jsAfter)}  (-${pct(jsAfter, jsBefore)})`);
  console.log(`  CSS: ${mb(cssBefore)} -> ${mb(cssAfter)}  (-${pct(cssAfter, cssBefore)})`);
  if (skipped.length) {
    console.log('SKIPPED (copied unminified):');
    skipped.forEach(s => console.log('  ' + s));
  }
})();
