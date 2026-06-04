/**
 * Perf harness helpers — seed a synthetic world into IndexedDB and measure boot + render.
 *
 * Strategy: seed the `worldbuilder` IDB (objects store) directly with the same keys the app
 * loads from (`worldState-meta`, `map-{id}`, `article-{id}` — see forge/worldbuilder.js:534),
 * then reload so the measured navigation is a realistic cold boot from persisted data.
 */
import fs from 'node:fs';
import path from 'node:path';

// Playwright runs from the repo root; resolve fixtures relative to cwd.
// (Avoid import.meta.url — it forces ES-module scope and clashes with Playwright's CJS transform.)
const FIXTURE_DIR = path.join(process.cwd(), 'tests', 'perf', 'fixtures');

/** Load a generated fixture payload { meta, maps, articles }. Throws a helpful error if missing. */
export function loadFixture(size) {
  const file = path.join(FIXTURE_DIR, `world-${size}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing fixture ${file}. Run: npm run perf:fixtures`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Seed the worldbuilder IDB with a payload, clearing the objects store first. */
export async function seedWorld(page, payload) {
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
      const tx = db.transaction('objects', 'readwrite');
      const os = tx.objectStore('objects');
      os.clear();
      os.put(p.meta, 'worldState-meta');
      (p.maps || []).forEach(m => os.put(m, `map-${m.id}`));
      (p.articles || []).forEach(a => os.put(a, `article-${a.id}`));
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
    db.close();
  }, payload);
}

/**
 * Reset to a known-empty world by CLEARING the object stores in place.
 *
 * Do NOT use indexedDB.deleteDatabase here: the app holds an open connection, so the delete is
 * blocked-but-pending and any subsequent open() (e.g. in seedWorld) queues behind it forever.
 * Clearing within a transaction on the shared connection avoids that deadlock.
 */
export async function clearWorld(page) {
  await page.evaluate(async () => {
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
      tx.objectStore('objects').clear();
      tx.objectStore('files').clear();
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
    db.close();
  });
}

/**
 * Capture cold-boot metrics from the currently loaded page.
 * Assumes the app has finished booting (caller waited on a readiness selector).
 */
export async function captureBootMetrics(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const scripts = performance.getEntriesByType('resource')
      .filter(r => r.name.includes('/forge/') && r.name.endsWith('.js'));
    const scriptDurationMs = scripts.reduce((sum, r) => sum + r.duration, 0);
    const mem = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : null;
    return {
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEventMs:        Math.round(nav.loadEventEnd || 0),
      scriptCount:        scripts.length,
      scriptDurationMs:   Math.round(scriptDurationMs),
      jsHeapMB:           mem != null ? +mem.toFixed(1) : null,
      // `state` is a top-level `let` (global lexical binding) — NOT a window property.
      articlesLoaded:     (typeof state !== 'undefined' && state && Array.isArray(state.articles)) ? state.articles.length : 0,
    };
  });
}

/**
 * Time a synchronous full panel re-render (the WS3/WS4 target). Runs the render a few times
 * and returns the median to smooth out noise. Falls back gracefully if the alias is absent.
 */
export async function measurePanelRender(page, runs = 5) {
  return page.evaluate((n) => {
    const fn = window.refreshWorldPanel || window.renderWorldPanel;
    if (typeof fn !== 'function') return null;
    const samples = [];
    try {
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        fn();
        samples.push(performance.now() - t0);
      }
    } catch (_) {
      return null; // render threw (e.g. empty first-run app) — not a measurable sample
    }
    if (!samples.length) return null;
    samples.sort((a, b) => a - b);
    return +samples[Math.floor(samples.length / 2)].toFixed(2);
  }, runs);
}

/** Pretty-print one result row to the console (visible in `--reporter=list`). */
export function logRow(label, m, panelMs) {
  const cols = [
    label.padEnd(12),
    `DCL ${String(m.domContentLoadedMs).padStart(5)}ms`,
    `load ${String(m.loadEventMs).padStart(5)}ms`,
    `scripts ${String(m.scriptCount).padStart(2)}/${String(m.scriptDurationMs).padStart(5)}ms`,
    `heap ${m.jsHeapMB == null ? '  n/a' : String(m.jsHeapMB).padStart(6)}MB`,
    `panel ${panelMs == null ? ' n/a' : String(panelMs).padStart(7)}ms`,
    `articles ${String(m.articlesLoaded).padStart(4)}`,
  ];
  console.log('  ' + cols.join(' | '));
}
