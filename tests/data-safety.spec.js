/**
 * Data-safety — the single most important guarantee in a local-first app:
 * importing a malformed project must NEVER destroy the world already loaded.
 *
 * The import path validates (validateBundle) BEFORE it touches IndexedDB (idbClear), so a bad
 * bundle should bail out with the existing world intact. These tests lock that ordering in: if a
 * future refactor ever moved the clear ahead of validation, they fail.
 */
import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import { seedWorld, clearWorld } from './perf/perf-helpers.js';

const MAP_ID = 'map-safety';

function makeWorld() {
  return {
    meta: {
      appVersion: '0.6.24-alpha', activeMapId: MAP_ID,
      folders: [], encyclopediaFolders: [], templates: [], layoutTemplates: [],
      customColors: [], assetNames: {}, assetMeta: {}, appearance: {},
    },
    maps: [{
      id: MAP_ID, name: 'Safety World', parentId: null, folderId: null,
      imageKey: 'img-safety-missing', width: 2000, height: 2000,
      overlayKey: null, overlayOpacity: 0.4,
      scale: { pixels: 100, distance: 10, unit: 'miles' },
      grid: { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
      fog: { enabled: false, opacity: 1.0, mask: null },
    }],
    articles: [0, 1, 2].map(i => ({
      id: `art-safety-${i}`, _silo: 'lore',
      name: `Precious ${i}`, type: 'Person', icon: 'person', color: '#9a6ec9',
      geometry: null, geojson: null, mapId: null, folderId: null,
      visibleToPlayers: true, tags: [], links: [], blocks: [],
    })),
  };
}

/** Seed a known world and reload into it. */
async function bootWithWorld(page) {
  await gotoApp(page);
  // "Start Fresh" (first-run, empty IDB) schedules a debounced save of the blank world. If it
  // fires after we seed but before reload, it clobbers the seed. Flush it first so nothing pending
  // can overwrite our seed.
  await page.evaluate(async () => { try { if (window.flushSave) await window.flushSave(); } catch (_) {} });
  await clearWorld(page);
  await seedWorld(page, makeWorld());
  await page.reload();
  await page.waitForSelector('.header-controls', { state: 'visible' });
  await page.waitForFunction(() =>
    typeof state !== 'undefined' && state.articles && state.articles.length >= 3 &&
    typeof window._handleImportFile === 'function',  // import API assigned late in worldbuilder init
    null, { timeout: 30_000 });
}

test.describe('Data safety — import never wipes the world', () => {
  test.describe.configure({ timeout: 90_000 });

  test('a valid ZIP that fails validation leaves the world intact', async ({ page }) => {
    await bootWithWorld(page);

    const r = await page.evaluate(async () => {
      const beforeIds = state.articles.map(a => a.id).sort().join(',');

      // A well-formed ZIP whose world.json parses but fails validateBundle (empty maps array).
      const zip = new JSZip();
      zip.file('world.json', JSON.stringify({ state: { maps: [] }, settings: { projectName: 'Evil' } }));
      const blob = await zip.generateAsync({ type: 'blob' });
      await window._handleImportFile(new File([blob], 'evil.trv', { type: 'application/zip' }));

      // processZip runs detached from the _handleImportFile promise — wait for it to settle.
      await new Promise(r => setTimeout(r, 600));

      return {
        beforeIds,
        afterIds: state.articles.map(a => a.id).sort().join(','),
        count: state.articles.length,
        alertShown: !document.querySelector('#alertModal')?.classList.contains('hidden'),
      };
    });

    expect(r.count).toBe(3);
    expect(r.afterIds).toBe(r.beforeIds);   // exact same articles survive
    expect(r.alertShown).toBe(true);        // user was told it was invalid
  });

  test('a non-archive file leaves the world intact', async ({ page }) => {
    await bootWithWorld(page);

    const r = await page.evaluate(async () => {
      const before = state.articles.length;
      const file = new File(['this is definitely not a zip archive'], 'garbage.trv', { type: 'application/zip' });
      // Fire-and-forget: the non-archive path runs processZip detached, so don't await the call.
      // Poll instead and assert the world never shrinks at any point during the failed import.
      window._handleImportFile(file);
      let min = before;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 50));
        min = Math.min(min, state.articles.length);
      }
      return { before, min, after: state.articles.length };
    });

    expect(r.min).toBe(3);    // never dropped mid-import
    expect(r.after).toBe(3);
  });
});
