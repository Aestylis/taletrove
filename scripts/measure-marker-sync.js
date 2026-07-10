/**
 * B3 measurement — cost of syncAllLayers() rebuilding every marker icon on every render.
 *
 * Verdict (2026-07-10): measured & skipped — see tests/perf/README.md "Results since baseline".
 * Kept so the numbers can be re-checked if a big-map perf complaint ever lands.
 *
 * Usage:
 *   npm run perf:fixtures                                  # once, to build the fixture worlds
 *   python -m http.server 8123                             # serve the repo root
 *   node scripts/measure-marker-sync.js [fixture.json]     # defaults to world-1000
 *
 * Seeds the fixture (IDB-direct, same keys as tests/perf/perf-helpers.js), reloads, then:
 *  1. times repeated steady-state syncAllLayers() calls (nothing changed between calls),
 *  2. counts L.Marker.setIcon calls + actual marker DOM node replacements per call,
 *  3. times render({ full: true }) for context (atlas tree rebuild + layer sync).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:8123/forge/';
const FIXTURE = process.argv[2] ||
  path.join(__dirname, '..', 'tests', 'perf', 'fixtures', 'world-1000.json');

(async () => {
  const payload = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message));

  await page.goto(BASE);
  await page.waitForSelector('.header-controls', { state: 'visible' });
  for (const [btn, overlay] of [
    ['#startFreshBtn', '#sampleWorldModal'],
    ['#welcomeSkipBtn', '#welcomeModal'],
    ['#tutorialCloseBtn', '#tutorialOverlay'],
  ]) {
    try {
      await page.locator(btn).click({ timeout: 2500 });
      if (overlay) await page.locator(overlay).waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    } catch { /* not shown */ }
  }
  await page.evaluate(async () => { try { if (window.flushSave) await window.flushSave(); } catch (_) {} });

  // Seed IDB directly (mirrors tests/perf/perf-helpers.js clearWorld + seedWorld).
  await page.evaluate(async (p) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('worldbuilder', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('files'))   d.createObjectStore('files');
        if (!d.objectStoreNames.contains('objects')) d.createObjectStore('objects');
      };
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction(['objects', 'files'], 'readwrite');
      const os = tx.objectStore('objects');
      os.clear();
      tx.objectStore('files').clear();
      os.put(p.meta, 'worldState-meta');
      (p.maps || []).forEach(m => os.put(m, `map-${m.id}`));
      (p.articles || []).forEach(a => os.put(a, `article-${a.id}`));
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
    db.close();
  }, payload);

  await page.reload();
  await page.waitForSelector('.header-controls', { state: 'visible' });
  await page.waitForFunction(() => typeof state !== 'undefined' && state.articles && state.articles.length >= 100);
  await page.waitForTimeout(1500); // let boot render + navigateToMap finally-timer settle

  const result = await page.evaluate(async () => {
    // Instrument Leaflet: count setIcon calls and actual DOM element replacements.
    const counters = { setIcon: 0, domReplaced: 0 };
    const origSetIcon = L.Marker.prototype.setIcon;
    L.Marker.prototype.setIcon = function (icon) {
      counters.setIcon++;
      const before = this._icon;
      const r = origSetIcon.call(this, icon);
      if (this._icon !== before) counters.domReplaced++;
      return r;
    };

    const markersOnMap = document.querySelectorAll('.custom-marker-wrapper').length;

    // 1) Steady-state syncAllLayers: nothing changes between calls — pure waste.
    const syncTimes = [];
    for (let i = 0; i < 12; i++) {
      counters.setIcon = 0; counters.domReplaced = 0;
      const t0 = performance.now();
      await syncAllLayers();
      syncTimes.push(performance.now() - t0);
    }
    const lastSync = { setIcon: counters.setIcon, domReplaced: counters.domReplaced };

    // 2) Full render for context (atlas tree + layers).
    const renderTimes = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      await render({ full: true });
      renderTimes.push(performance.now() - t0);
    }

    L.Marker.prototype.setIcon = origSetIcon;

    const stats = a => {
      const s = [...a].sort((x, y) => x - y);
      return { min: +s[0].toFixed(1), median: +s[Math.floor(s.length / 2)].toFixed(1), max: +s[s.length - 1].toFixed(1) };
    };
    return {
      articles: state.articles.length,
      pointsOnActiveMap: state.features.filter(f => f.mapId === state.activeMapId && f.geometry === 'point').length,
      markersInDom: markersOnMap,
      perSyncCall: lastSync,
      syncAllLayersMs: stats(syncTimes),
      renderFullMs: stats(renderTimes),
    };
  });

  console.log(path.basename(FIXTURE), '→', JSON.stringify(result, null, 1));
  await browser.close();
})().catch(e => { console.error('MEASURE FAILED:', e); process.exit(1); });
