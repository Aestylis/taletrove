#!/usr/bin/env node
// build-perf-fixtures.js — generates synthetic large-world fixtures for the perf harness.
// Run: node scripts/build-perf-fixtures.js   (or: npm run perf:fixtures)
//
// Output: tests/perf/fixtures/world-{50,1000,5000}.json
// Each file is a seed payload { meta, maps, articles } matching the IDB load contract
// in forge/worldbuilder.js (worldState-meta + article-{id} + map-{id} keys).
//
// These fixtures are git-ignored (synthetic + large). Regenerate any time with the command above.

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const OUT_DIR  = path.join(ROOT, 'tests', 'perf', 'fixtures');
const SIZES    = [50, 1000, 5000];

const MAP_ID = 'map-perf';

// Lore folders (mapId: null) + one atlas folder (scoped to the map). All expanded so the
// panel renders every row on load — that is exactly the cost WS3/WS4 target.
const F_LORE_A = 'folder-perf-lore-a';
const F_LORE_B = 'folder-perf-lore-b';
const F_LORE_C = 'folder-perf-lore-c';
const F_ATLAS  = 'folder-perf-atlas';

const folders = [
  { id: F_ATLAS,  name: 'Locations', collapsed: false, parentFolderId: null, mapId: MAP_ID },
  { id: F_LORE_A, name: 'People',    collapsed: false, parentFolderId: null, mapId: null },
  { id: F_LORE_B, name: 'Factions',  collapsed: false, parentFolderId: null, mapId: null },
  { id: F_LORE_C, name: 'History',   collapsed: false, parentFolderId: null, mapId: null },
];
const LORE_FOLDERS = [F_LORE_A, F_LORE_B, F_LORE_C];

const meta = {
  appVersion:          '0.6.20-alpha',
  activeMapId:         MAP_ID,
  folders,
  encyclopediaFolders: [],
  templates:           [],
  layoutTemplates:     [],
  customColors:        [],
  assetNames:          {},
  assetMeta:           {},
  appearance:          {},
};

const maps = [{
  id: MAP_ID, name: 'Perf World', parentId: null, folderId: null,
  imageKey: 'img-perf-missing',           // intentionally absent blob — app tolerates it
  width: 2000, height: 2000,
  overlayKey: null, overlayOpacity: 0.4,
  scale: { pixels: 100, distance: 10, unit: 'miles' },
  grid:  { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
  fog:   { enabled: false, opacity: 1.0, mask: null },
}];

const NAMES = ['Ald','Bren','Cael','Dorn','Eira','Fenn','Garr','Hale','Iric','Joss',
               'Kael','Lyra','Mira','Nyx','Orin','Pell','Quin','Riven','Syl','Tor'];
const PLACES = ['Keep','Port','Hollow','Reach','Spire','Vale','Crossing','Fen','Hold','Watch'];

function name(i)  { return `${NAMES[i % NAMES.length]}${PLACES[(i >> 2) % PLACES.length]} ${i}`; }

// A couple of small text blocks per article — realistic heap + backlink-index work
// (one block carries a [[wiki-link]] to the previous article).
function blocks(i, prevName) {
  const link = prevName ? ` Allied with [[${prevName}]].` : '';
  return [
    { blockId: `blk-perf-${i}-1`, type: 'TextField', visibleToPlayers: true,
      data: { content: `## ${name(i)}\n\nA generated entity for performance testing. Lorem ipsum dolor sit amet, consectetur adipiscing elit.${link}` } },
    { blockId: `blk-perf-${i}-2`, type: 'TextField', visibleToPlayers: false,
      data: { content: `**GM:** secret note ${i}. Sed do eiusmod tempor incididunt ut labore.` } },
  ];
}

function buildArticles(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const prevName = i > 0 ? name(i - 1) : null;
    const isAtlas = i % 10 < 3; // ~30% atlas pins on the map, ~70% lore
    if (isAtlas) {
      const x = 50 + (i * 37) % 1900;
      const y = 50 + (i * 53) % 1900;
      out.push({
        id: `art-perf-${i}`, _silo: 'atlas',
        name: name(i), title: name(i), type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e',
        geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [x, y] } },
        mapId: MAP_ID, folderId: F_ATLAS,
        labelStyle: 'outline', labelColor: '#ffffff', visibleToPlayers: true,
        tags: [], links: [], blocks: blocks(i, prevName),
      });
    } else {
      out.push({
        id: `art-perf-${i}`, _silo: 'lore',
        name: name(i), type: 'Person', icon: 'person', color: '#9a6ec9',
        geometry: null, geojson: null, mapId: null,
        folderId: LORE_FOLDERS[i % LORE_FOLDERS.length],
        visibleToPlayers: true,
        tags: ['generated'], links: [], blocks: blocks(i, prevName),
      });
    }
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const payload = { meta, maps, articles: buildArticles(size) };
  const file = path.join(OUT_DIR, `world-${size}.json`);
  fs.writeFileSync(file, JSON.stringify(payload));
  const mb = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`[build-perf-fixtures] ${file}  (${size} articles, ${mb} MB)`);
}
console.log('[build-perf-fixtures] Done.');
