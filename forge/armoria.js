import armoriaLib from './armoria/armoria.bundle.js';

const { draw, setChargesBasePath, generate } = armoriaLib;

// Sub-path hosting requires runtime base detection — no hardcoded URL.
const _base = (() => {
  let p = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
  if (!p.endsWith('/')) p += '/';
  return p;
})();
setChargesBasePath(_base + 'armoria/charges/');

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

// Returns a Data URL (not raw SVG) — base64 encoding prevents CSS/ID collisions
// when multiple coats of arms appear on the same page.
export async function generateCoatOfArms(seed, { size = 256, shield = 'heater', colors } = {}) {
  const numericSeed = typeof seed === 'number' ? seed : _hashSeed(seed);
  const _savedRandom = Math.random;
  const coa = generate(numericSeed);
  Math.random = _savedRandom;
  coa.shield = shield; 
  const tinctures = { ...TINCTURES, ...(colors || {}) };
  
  const svgMarkup = await draw("coa-isolated", coa, size, tinctures);
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
