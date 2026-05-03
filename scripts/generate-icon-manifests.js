import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'forge');

function scanDir(dir) {
  return readdirSync(join(root, dir))
    .filter(f => f.endsWith('.svg'))
    .map(f => f.replace(/\.svg$/, ''))
    .sort();
}

const gameIcons = scanDir('icons');
const uiIcons = scanDir('ui-icons');

writeFileSync(join(root, 'data', 'icon-manifest.json'), JSON.stringify(gameIcons, null, 4));
writeFileSync(join(root, 'data', 'ui-icon-manifest.json'), JSON.stringify(uiIcons, null, 4));

console.log(`icon-manifest.json    → ${gameIcons.length} icons`);
console.log(`ui-icon-manifest.json → ${uiIcons.length} icons`);
