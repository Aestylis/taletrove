/**
 * Export round-trip — the other half of the data-trust story (data-safety.spec.js is the first):
 * exporting a world and importing it back must reproduce the world exactly. Users back up via
 * export; a silently lossy export is data loss discovered months later.
 *
 * Uses buildWorldBlob() (the Drive-save builder — same {settings, state} world.json + image-blob
 * serialization as the file export, minus the file picker). The import path ends in
 * location.reload(), so the test rides out a real navigation and the "after" world is read back
 * from IndexedDB — covering serialize → zip → validate → idbClear → write → reload → boot.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import { seedWorld, clearWorld } from './perf/perf-helpers.js';

const MAP_ID = 'map-rt';
const HERO_KEY = 'img-rt-hero';

function makeWorld() {
  return {
    meta: {
      appVersion: '0.6.25-alpha', activeMapId: MAP_ID,
      folders: [], encyclopediaFolders: [], templates: [], layoutTemplates: [],
      customColors: [], assetNames: {}, assetMeta: {}, appearance: {},
    },
    maps: [{
      id: MAP_ID, name: 'Roundtrip World', parentId: null, folderId: null,
      imageKey: null, width: 2000, height: 2000,
      overlayKey: null, overlayOpacity: 0.4,
      scale: { pixels: 100, distance: 10, unit: 'miles' },
      grid: { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
      fog: { enabled: false, opacity: 1.0, mask: null },
    }],
    articles: [
      { // atlas pin with wiki content
        id: 'art-rt-0', _silo: 'atlas', name: 'Hero Keep', title: 'Hero Keep', type: 'Location',
        featureType: 'generic-pin', icon: 'castle', color: '#c9aa6e', geometry: 'point',
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [400, 600] } },
        mapId: MAP_ID, folderId: null, labelStyle: 'outline', labelColor: '#ffffff',
        visibleToPlayers: true, tags: ['fortress'], links: [], heroImageKey: HERO_KEY,
        blocks: [{ blockId: 'blk-rt-0', type: 'TextField', visibleToPlayers: true,
          data: { content: '## Hero Keep\n\nLinked to [[Mara the Cartographer]]. Specials: ä é — "quotes" & <angles>.' } }],
      },
      { // lore article, GM-only
        id: 'art-rt-1', _silo: 'lore', name: 'Mara the Cartographer', type: 'Person',
        icon: 'person', color: '#9a6ec9', geometry: null, geojson: null, mapId: null, folderId: null,
        visibleToPlayers: false, tags: ['npc', 'guild'], links: [],
        blocks: [{ blockId: 'blk-rt-1', type: 'TextField', visibleToPlayers: false,
          data: { content: '**GM:** secretly a dragon.' } }],
      },
      { // minimal article — empty blocks
        id: 'art-rt-2', _silo: 'lore', name: 'The Sundering', type: 'Event',
        icon: 'calendar', color: '#6ec9aa', geometry: null, geojson: null, mapId: null, folderId: null,
        visibleToPlayers: true, tags: [], links: [], blocks: [],
      },
    ],
  };
}

/** Serialize the world facts that must survive a round trip. Defined identically before/after. */
const FINGERPRINT_FN = `(() => JSON.stringify({
  articles: state.articles.map(a => ({
    id: a.id, silo: a._silo, name: a.name || a.title || null, type: a.type ?? null,
    vis: a.visibleToPlayers, folderId: a.folderId ?? null, mapId: a.mapId ?? null,
    geometry: a.geometry ?? null, geojson: a.geojson ?? null, tags: a.tags ?? [],
    hero: a.heroImageKey ?? null, blocks: a.blocks ?? [],
  })).sort((x, y) => (x.id < y.id ? -1 : 1)),
  maps: state.maps.map(m => ({ id: m.id, name: m.name, w: m.width, h: m.height, imageKey: m.imageKey ?? null }))
    .sort((x, y) => (x.id < y.id ? -1 : 1)),
  project: (typeof settings !== 'undefined' && settings.projectName) || null,
}))()`;

test.describe('Export round-trip', () => {
  test.describe.configure({ timeout: 120_000 });

  test('export → reimport reproduces the world exactly (incl. image blob)', async ({ page }) => {
    // Boot, flush the first-run save, seed the world + a hero image + a decoy thumbnail
    await gotoApp(page);
    await page.evaluate(async () => { try { if (window.flushSave) await window.flushSave(); } catch (_) {} });
    await clearWorld(page);
    await seedWorld(page, makeWorld());
    await page.evaluate(async (HERO) => {
      const db = await new Promise((res, rej) => {
        const q = indexedDB.open('worldbuilder', 2);
        q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
      });
      const put = (k, b) => new Promise((res, rej) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(b, k);
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      // realistic hero image
      const c = document.createElement('canvas'); c.width = c.height = 800;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 800, 800);
      g.addColorStop(0, '#7a3b1d'); g.addColorStop(1, '#1d3b7a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 800);
      await put(HERO, await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)));
      // decoy thumbnail — must NOT be exported (regenerable, would bloat bundles)
      await put(`thumb256-${HERO}`, new Blob(['fake-thumb'], { type: 'image/webp' }));
      db.close();
    }, HERO_KEY);

    await page.reload();
    await page.waitForSelector('.header-controls', { state: 'visible' });
    await page.waitForFunction(() =>
      typeof state !== 'undefined' && state.articles && state.articles.length >= 3 &&
      typeof window._handleImportFile === 'function', null, { timeout: 30_000 });

    // Register the load-listener BEFORE kicking off the import (import ends in location.reload)
    const reloaded = page.waitForEvent('load', { timeout: 60_000 });

    const before = await page.evaluate(async ({ HERO, FP }) => {
      const fingerprint = eval(FP);
      const heroSize = (await idbGet(HERO))?.size || 0;

      const blob = await buildWorldBlob();
      const zip = await JSZip.loadAsync(blob);
      const entries = Object.keys(zip.files).sort();

      // Kick off the import after this evaluate returns, so the reload doesn't kill the context
      setTimeout(() => {
        window._handleImportFile(new File([blob], 'roundtrip.trv', { type: 'application/zip' }));
      }, 50);

      return { fingerprint, heroSize, entries, exportBytes: blob.size };
    }, { HERO: HERO_KEY, FP: FINGERPRINT_FN });

    // The bundle itself: world.json + the referenced image, and no regenerable thumbnails
    expect(before.entries).toContain('world.json');
    expect(before.entries).toContain(HERO_KEY);
    expect(before.entries.filter(e => e.startsWith('thumb256-'))).toHaveLength(0);
    expect(before.heroSize).toBeGreaterThan(0);

    // Ride out the import's reload, then wait for the app to boot from the imported IDB
    await reloaded;
    await page.waitForFunction(() =>
      typeof state !== 'undefined' && state.articles && state.articles.length >= 3, null, { timeout: 30_000 });

    const after = await page.evaluate(async ({ HERO, FP }) => ({
      fingerprint: eval(FP),
      heroSize: (await idbGet(HERO))?.size || 0,
    }), { HERO: HERO_KEY, FP: FINGERPRINT_FN });

    console.log(`  Export round-trip: ${before.entries.length} zip entries, ${Math.round(before.exportBytes / 1024)}KB bundle, hero ${Math.round(before.heroSize / 1024)}KB`);

    // The core guarantee: identical world, byte-identical image
    expect(after.fingerprint).toBe(before.fingerprint);
    expect(after.heroSize).toBe(before.heroSize);
  });
});
