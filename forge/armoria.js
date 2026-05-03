// app/armoria.js — Heraldry generation using Azgaar's Armoria library (bundled locally)
// ES module. Requires: app/armoria/armoria.bundle.js + app/armoria/charges/*.svg

import armoriaLib from './armoria/armoria.bundle.js';

const { draw, setChargesBasePath, generate } = armoriaLib;

// Configure charges path dynamically — mirrors the dice-box pattern so sub-path
// hosting works without hardcoding a URL.
const _base = (() => {
  let p = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
  if (!p.endsWith('/')) p += '/';
  return p;
})();
setChargesBasePath(_base + 'armoria/charges/');

// Standard heraldic tinctures → hex colours
const TINCTURES = {
  argent:   '#f0ede0',
  or:       '#d4af37',
  gules:    '#b22222',
  azure:    '#1a4a8a',
  sable:    '#1a1a1a',
  vert:     '#2e7d32',
  purpure:  '#6a0dad',
  murrey:   '#800000',
  sanguine: '#8b0000',
  tenné:    '#cd6600',
};

/**
 * Generate a deterministic coat of arms SVG and return it as a Data URL.
 * Using a Data URL provides total CSS/ID isolation, preventing collisions
 * between multiple SVGs on the same page.
 *
 * @param {string|number} seed   Deterministic seed — pass a feature ID or any string.
 * @param {object}  [opts]
 * @param {number}  [opts.size=256]     Internal SVG resolution (higher = crisper)
 * @param {string}  [opts.shield]       Shield shape override (default: 'heater')
 * @param {object}  [opts.colors]       Custom tincture → hex overrides
 * @returns {Promise<string>}  SVG Data URL (data:image/svg+xml;base64,...)
 */
export async function generateCoatOfArms(seed, { size = 256, shield = 'heater', colors } = {}) {
  const numericSeed = typeof seed === 'number' ? seed : _hashSeed(seed);
  const _savedRandom = Math.random;
  const coa = generate(numericSeed);
  Math.random = _savedRandom;
  coa.shield = shield; 
  const tinctures = { ...TINCTURES, ...(colors || {}) };
  
  // Draw the SVG markup
  const svgMarkup = await draw("coa-isolated", coa, size, tinctures);
  
  // Convert to Base64 Data URL for document-level isolation
  const base64 = btoa(unescape(encodeURIComponent(svgMarkup)));
  return `data:image/svg+xml;base64,${base64}`;
}

/** djb2 hash: stable string → positive 32-bit integer */
function _hashSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33 ^ str.charCodeAt(i)) >>> 0;
  return h;
}

// Expose on window so non-module scripts (block-editor, inspector) can call it
window.generateCoatOfArms = generateCoatOfArms;
