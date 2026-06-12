// Audit WCAG contrast ratios per app-theme preset in worldbuilder.css.
// Checks: primary-btn-text on accent (hard fail < 4.5), muted on panel, accent-as-text on panel.
// Muted/accent "low" notes are informational — canonical editor palettes keep their own muted colors.
// Usage: node scripts/check-preset-contrast.js
const fs = require('fs');
const css = fs.readFileSync('forge/worldbuilder.css', 'utf8');

function lum(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const c = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function cr(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round((l1 + 0.05) / (l2 + 0.05) * 100) / 100;
}

const blocks = [...css.matchAll(/\.theme-(light|dark)\[data-app-theme="([a-z]+)"\]\s*\{([^}]*)\}/g)];
const get = (body, t) => {
  const m = body.match(new RegExp(t + ':\\s*(#[0-9a-fA-F]{3,8})'));
  return m ? m[1] : null;
};

for (const b of blocks) {
  const [, mode, name, body] = b;
  const accent = get(body, '--accent-orange');
  const btnText = get(body, '--primary-btn-text');
  const panel = get(body, '--panel');
  const muted = get(body, '--muted');
  const danger = get(body, '--danger'); // usually null (inherited)
  const rows = [];
  if (accent && btnText) {
    const r = cr(accent, btnText);
    rows.push(`btn ${r}${r < 4.5 ? ' *** FAIL' : ''}`);
  } else rows.push(`btn ?(accent=${accent} text=${btnText})`);
  if (muted && panel) {
    const r = cr(muted, panel);
    rows.push(`muted/panel ${r}${r < 4.5 ? ' (low)' : ''}`);
  }
  if (accent && panel) {
    const r = cr(accent, panel);
    rows.push(`accent-as-text/panel ${r}${r < 4.5 ? ' (low)' : ''}`);
  }
  console.log(`${mode.padEnd(5)} ${name.padEnd(13)} ${rows.join(' | ')}`);
}
