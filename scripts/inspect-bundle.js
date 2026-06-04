#!/usr/bin/env node
// inspect-bundle.js — summarize a .trv/.wbundle without unpacking image blobs.
// Usage: node scripts/inspect-bundle.js "D:\path\to\World.trv"
//
// Reports article/map/folder counts, article silo + geometry breakdown, block counts,
// and image-blob count + total bytes — the real-world scale numbers that tell us what the
// perf workstreams must actually handle.

const JSZip = require('jszip');
const fs    = require('fs');

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/inspect-bundle.js <path-to-.trv>'); process.exit(1); }

(async () => {
  const stat = fs.statSync(file);
  console.log(`\nBundle: ${file}`);
  console.log(`On-disk size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);

  const zip = await JSZip.loadAsync(fs.readFileSync(file));

  // Tally entries without decompressing blobs.
  let imgCount = 0, imgBytes = 0, otherCount = 0;
  let worldEntry = null;
  zip.forEach((relPath, entry) => {
    if (entry.dir) return;
    if (relPath === 'world.json') { worldEntry = entry; return; }
    // _data.uncompressedSize is available from the central directory (no decompression).
    const size = entry._data && entry._data.uncompressedSize || 0;
    if (/^(img-|ci-|banner-|bg-img-|thumb-)/.test(relPath)) { imgCount++; imgBytes += size; }
    else otherCount++;
  });

  if (!worldEntry) { console.error('No world.json in bundle.'); process.exit(1); }
  const world = JSON.parse(await worldEntry.async('string'));
  const s = world.state || {};
  const articles = s.articles || [];

  const bySilo = {}, byGeom = {};
  let blockTotal = 0, linkTotal = 0, withImg = 0;
  for (const a of articles) {
    bySilo[a._silo || '?'] = (bySilo[a._silo || '?'] || 0) + 1;
    byGeom[a.geometry || 'none'] = (byGeom[a.geometry || 'none'] || 0) + 1;
    blockTotal += (a.blocks || []).length;
    linkTotal  += (a.links || []).length;
    if (a.heroImage || a.imageKey || a.bannerKey) withImg++;
  }

  console.log(`\n── world.json ──`);
  console.log(`appVersion:   ${s.appVersion || world.settings?.appVersion || '?'}`);
  console.log(`Articles:     ${articles.length}`);
  console.log(`  by silo:    ${JSON.stringify(bySilo)}`);
  console.log(`  by geometry:${JSON.stringify(byGeom)}`);
  console.log(`Maps:         ${(s.maps || []).length}`);
  console.log(`Folders:      ${(s.folders || []).length}`);
  console.log(`Blocks total: ${blockTotal}  (avg ${(blockTotal / (articles.length || 1)).toFixed(1)}/article)`);
  console.log(`Links total:  ${linkTotal}`);
  console.log(`Articles w/ image ref: ${withImg}`);

  console.log(`\n── blobs ──`);
  console.log(`Image blobs:  ${imgCount}  (${(imgBytes / 1024 / 1024).toFixed(1)} MB uncompressed)`);
  console.log(`Other files:  ${otherCount}`);
  console.log(`Avg image:    ${imgCount ? (imgBytes / imgCount / 1024).toFixed(0) : 0} KB\n`);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
