#!/usr/bin/env node
/**
 * CSS custom-property definition check.
 *
 * Fails if any var(--token) referenced in forge/worldbuilder.css, forge/*.js
 * (template literals), or forge/index.html has no definition anywhere:
 * a `--token:` declaration in CSS, an inline-style declaration in JS/HTML,
 * or a JS `style.setProperty('--token', …)` call.
 *
 * Catches the P0.1 bug class: a var() name with no definition is invalid at
 * computed-value time and the property silently falls back to initial/inherit.
 *
 * Usage: node scripts/check-css-tokens.js   (exit 1 + list on failure)
 */
const fs = require('fs');
const path = require('path');

function findMissingTokens() {
  const root = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(root, 'forge', 'worldbuilder.css'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'forge', 'index.html'), 'utf8');
  const jsSrc = fs.readdirSync(path.join(root, 'forge'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(root, 'forge', f), 'utf8'))
    .join('\n');

  // Drop block comments and whole-line // comments before scanning for
  // usages, so documentation examples (e.g. ui.js header) don't count.
  const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const used = new Set();
  for (const m of stripComments(css + jsSrc + html).matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
    used.add(m[1]);
  }

  const defined = new Set();
  // CSS declarations (also matches inline-style declarations in JS strings / HTML style attrs)
  for (const m of (css + jsSrc + html).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
    defined.add(m[1]);
  }
  // JS dynamic definitions: el.style.setProperty('--token', value)
  for (const m of jsSrc.matchAll(/setProperty\(\s*['"`](--[a-zA-Z0-9-]+)/g)) {
    defined.add(m[1]);
  }

  return [...used].filter((t) => !defined.has(t)).sort();
}

if (require.main === module) {
  const missing = findMissingTokens();
  if (missing.length) {
    console.error(`Undefined CSS custom properties (${missing.length}):`);
    for (const t of missing) console.error(`  ${t}`);
    process.exit(1);
  }
  console.log('check-css-tokens: all var(--…) references have definitions.');
}

module.exports = { findMissingTokens };
