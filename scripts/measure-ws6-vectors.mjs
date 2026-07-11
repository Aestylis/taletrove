/**
 * WS6 measurement — is the SVG vector renderer / main-thread IDB save actually a bottleneck?
 *
 * Verdict (2026-07-10): measured & skipped, both halves — see tests/perf/README.md.
 * Pan is vsync-locked at every size; zoom re-projection is ≤1 frame at 2000 shapes;
 * save() is ~0.1 ms per dirty entity. Kept so the numbers can be re-checked if a
 * dense-map perf complaint ever lands.
 *
 * Usage:
 *   python -m http.server 8000        # serve the repo root
 *   node scripts/measure-ws6-vectors.mjs
 *
 * Seeds N polygons + N/2 polylines (10% smooth curves) in-memory, then measures:
 *  1. render({full:true}) median (vector layer rebuild)
 *  2. zoom cost: synchronous setZoom(animate:false) main-thread time (SVG re-projects every path)
 *  3. pan frame times over a continuous 120-frame pan (rAF deltas, p50/p95/max)
 *  4. save: markEntityDirty on all shapes + save() wall time (IDB serialization on main thread)
 */
import { chromium } from 'playwright';

const COUNTS = [250, 1000, 2000];

const browser = await chromium.launch();
for (const N of COUNTS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.error('[pageerror]', e.message.split('\n')[0]));
  await page.goto('http://localhost:8000/forge/');
  await page.waitForSelector('.header-controls', { state: 'visible' });
  for (const sel of ['#startFreshBtn', '#welcomeSkipBtn', '#tutorialCloseBtn']) {
    try { await page.locator(sel).click({ timeout: 2000 }); } catch { /* absent */ }
  }
  await page.waitForTimeout(500);

  const r = await page.evaluate(async (N) => {
    await window.flushSave?.();
    const mapId = state.activeMapId;
    const rnd = (a, b) => a + Math.random() * (b - a);
    // polygons: 16-vertex blobs; polylines: 8-point paths; every 10th line smooth (L.curve)
    for (let i = 0; i < N; i++) {
      const isLine = i % 3 === 2;
      const cx = rnd(100, 1900), cy = rnd(100, 1900), R = rnd(20, 80);
      let coords;
      if (isLine) {
        coords = Array.from({ length: 8 }, (_, k) => [cx + k * 15 + rnd(-5, 5), cy + rnd(-30, 30)]);
      } else {
        coords = [Array.from({ length: 16 }, (_, k) => {
          const a = (k / 16) * Math.PI * 2;
          return [cx + Math.cos(a) * R * rnd(0.7, 1.3), cy + Math.sin(a) * R * rnd(0.7, 1.3)];
        })];
      }
      state.articles.push({
        id: `ws6-${i}`, _silo: 'atlas', name: `Shape ${i}`, title: `Shape ${i}`,
        type: isLine ? 'River' : 'Region', category: isLine ? 'Waterway' : 'Territory',
        mapId, geometry: isLine ? 'polyline' : 'polygon',
        smooth: isLine && i % 30 === 2,
        geojson: { type: 'Feature', geometry: { type: isLine ? 'LineString' : 'Polygon', coordinates: coords } },
        color: '#8844cc', weight: 2, fillOpacity: 0.25,
        tags: [], links: [], blocks: [], visibleToPlayers: true,
      });
    }
    syncArticleViews();

    // 1. full render (median of 3)
    const renderTimes = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      await render({ full: true });
      renderTimes.push(performance.now() - t0);
    }
    renderTimes.sort((a, b) => a - b);

    const svgPaths = document.querySelectorAll('.leaflet-overlay-pane path').length;

    // 2. zoom: synchronous main-thread cost of setZoom (SVG re-projects all paths)
    map.setView([1000, 1000], 0, { animate: false });
    const zoomTimes = [];
    for (let i = 0; i < 6; i++) {
      const z = i % 2 === 0 ? -1 : 0.5;
      const t0 = performance.now();
      map.setZoom(z, { animate: false });
      zoomTimes.push(performance.now() - t0);
    }
    zoomTimes.sort((a, b) => a - b);

    // 3. pan: 120 frames of continuous panBy, collect rAF deltas
    const frames = [];
    await new Promise(res => {
      let last = performance.now(), n = 0;
      const step = () => {
        map.panBy([12, 6], { animate: false });
        const now = performance.now();
        frames.push(now - last); last = now;
        if (++n < 120) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    frames.sort((a, b) => a - b);
    const pct = p => frames[Math.floor(frames.length * p)];

    // 4. save cost on main thread: dirty all shapes, time save()
    for (let i = 0; i < N; i++) markEntityDirty('article', `ws6-${i}`);
    markEntityDirty('meta');
    const s0 = performance.now();
    await save();
    const saveMs = performance.now() - s0;

    return {
      renderMedian: renderTimes[1].toFixed(1),
      svgPaths,
      zoomMedian: zoomTimes[3].toFixed(1), zoomMax: zoomTimes[5].toFixed(1),
      panP50: pct(0.5).toFixed(1), panP95: pct(0.95).toFixed(1), panMax: frames[frames.length - 1].toFixed(1),
      saveMs: saveMs.toFixed(1),
    };
  }, N);

  console.log(`N=${N} shapes | render(full) ${r.renderMedian}ms | svg paths ${r.svgPaths} | ` +
    `zoom p50/max ${r.zoomMedian}/${r.zoomMax}ms | pan frame p50/p95/max ${r.panP50}/${r.panP95}/${r.panMax}ms | ` +
    `save(all dirty) ${r.saveMs}ms`);
  await page.close();
}
await browser.close();
