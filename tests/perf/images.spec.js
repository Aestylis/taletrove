/**
 * WS2 baseline — image bytes + decode cost (the real-world bottleneck).
 *
 * Analysis of a real 355 MB world (Dead_Reckoning.trv) showed only 289 articles but 280 images
 * averaging ~1.3 MB each — heavy worlds are IMAGE-bound, not article-bound. This benchmark
 * quantifies the prize for WS2 (thumbnails). For a realistic grid-sized set it compares the
 * CURRENT path (decode the full-res blob for every grid/marker image) against the WS2 path
 * (generate a 256px thumb blob once at ingest, decode that at render):
 *
 *   - stored bytes:  full-res blob total vs thumb blob total      (deterministic)
 *   - decode time:   createImageBitmap(full) vs createImageBitmap(thumb)  (reliable)
 *   - JS heap delta: best-effort secondary readout (bitmap memory is partly native, so noisy)
 *
 * Run:  npm run test:perf   (runs alongside startup.spec.js)
 */
import { test, expect } from '@playwright/test';

// [simultaneous image count, source dimension]. 50 ≈ a generous asset-grid page.
const CASES = [
  { count: 25, dim: 1500 },
  { count: 50, dim: 1500 },
];
const THUMB = 256;

test.describe('Perf baseline — image bytes + decode (WS2)', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const { count, dim } of CASES) {
    test(`images — ${count} @ ${dim}px → ${THUMB}px thumb`, async ({ page }) => {
      await page.goto('/forge/');
      await page.waitForSelector('.header-controls', { state: 'visible' });

      const r = await page.evaluate(async ({ count, dim, THUMB }) => {
        const hasMem = !!performance.memory;
        const heapMB = () => (hasMem ? +(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) : null);
        const KB = (b) => Math.round(b / 1024);
        const MB = (b) => +(b / 1024 / 1024).toFixed(1);

        const makeFull = (i) => {
          const c = document.createElement('canvas');
          c.width = c.height = dim;
          const ctx = c.getContext('2d');
          const g = ctx.createLinearGradient(0, 0, dim, dim);
          g.addColorStop(0, `hsl(${(i * 37) % 360},60%,45%)`);
          g.addColorStop(1, `hsl(${(i * 71) % 360},55%,25%)`);
          ctx.fillStyle = g; ctx.fillRect(0, 0, dim, dim);
          // noise band so JPEG can't trivially compress → realistic ~MB blobs
          const band = ctx.getImageData(0, 0, dim, Math.min(dim, 400));
          for (let p = 0; p < band.data.length; p += 4) {
            const n = (Math.random() * 80) | 0;
            band.data[p] ^= n; band.data[p + 1] ^= n; band.data[p + 2] ^= n;
          }
          ctx.putImageData(band, 0, 0);
          return c;
        };
        const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

        // ── ingest: make full-res blob + a 256px thumb blob (what WS2 would store) ──
        const fulls = [], thumbs = [];
        let fullBytes = 0, thumbBytes = 0;
        for (let i = 0; i < count; i++) {
          const c = makeFull(i);
          const fullBlob = await toBlob(c, 'image/jpeg', 0.8);
          const tc = document.createElement('canvas');
          tc.width = tc.height = THUMB;
          tc.getContext('2d').drawImage(c, 0, 0, THUMB, THUMB);
          const thumbBlob = await toBlob(tc, 'image/jpeg', 0.8);
          fulls.push(fullBlob); thumbs.push(thumbBlob);
          fullBytes += fullBlob.size; thumbBytes += thumbBlob.size;
        }

        // ── A) CURRENT path: decode every full-res blob ──
        const h0 = heapMB();
        let t0 = performance.now();
        let held = [];
        for (const b of fulls) held.push(await createImageBitmap(b));
        const fullDecodeMs = +(performance.now() - t0).toFixed(0);
        const fullHeapMB = hasMem ? +(heapMB() - h0).toFixed(1) : null;
        held.forEach(b => b.close()); held = [];

        // ── B) WS2 path: decode the small thumb blobs ──
        t0 = performance.now();
        for (const b of thumbs) held.push(await createImageBitmap(b));
        const thumbDecodeMs = +(performance.now() - t0).toFixed(0);
        held.forEach(b => b.close());

        return {
          hasMem,
          avgFullKB: KB(fullBytes / count),
          avgThumbKB: KB(thumbBytes / count),
          fullTotalMB: MB(fullBytes),
          thumbTotalMB: MB(thumbBytes),
          byteRatio: +(fullBytes / thumbBytes).toFixed(0),
          fullDecodeMs,
          thumbDecodeMs,
          decodeRatio: thumbDecodeMs > 0 ? +(fullDecodeMs / thumbDecodeMs).toFixed(1) : null,
          fullHeapMB,
        };
      }, { count, dim, THUMB });

      console.log(
        `  ${String(count).padStart(3)} imgs @${dim}px` +
        ` | full ${String(r.avgFullKB).padStart(4)}KB→thumb ${String(r.avgThumbKB).padStart(3)}KB (${r.byteRatio}× smaller)` +
        ` | bytes ${String(r.fullTotalMB).padStart(5)}MB→${r.thumbTotalMB}MB` +
        ` | decode ${String(r.fullDecodeMs).padStart(4)}ms→${r.thumbDecodeMs}ms (${r.decodeRatio}×)` +
        (r.hasMem ? ` | full-res heapΔ ~${r.fullHeapMB}MB` : '')
      );

      // Hard assertions — deterministic & reliable:
      expect(r.avgFullKB).toBeGreaterThan(50);          // images are realistically heavy
      expect(r.byteRatio).toBeGreaterThan(5);           // thumbs are dramatically smaller to store/hold
      expect(r.thumbDecodeMs).toBeLessThan(r.fullDecodeMs); // thumbs decode faster
    });
  }
});
