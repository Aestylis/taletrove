# Performance Baseline Harness (WS0)

Measures TaleTrove's cold-boot and panel-render cost at increasing world sizes, so every later
performance workstream (WS1 lazy-load, WS2 thumbnails, WS3 incremental render, WS4 virtual
scrolling) has a before/after number instead of a vibe.

## Running

```bash
npm run perf:fixtures   # generate tests/perf/fixtures/world-{50,1000,5000}.json (once / when changed)
npm run test:perf       # run the baseline; numbers print via the `list` reporter
```

The fixtures are git-ignored (synthetic + large). Regenerate them any time with `perf:fixtures`.

## What it measures

For each world size (empty / 50 / 1,000 / 5,000 articles) it seeds IndexedDB directly with the
same keys the app loads from (`worldState-meta`, `map-{id}`, `article-{id}`), reloads, and records:

| Metric | Source | Targeted by |
|---|---|---|
| `DCL` / `load` | Navigation Timing | WS1 (defer + lazy-load) |
| `scripts N/ms` | Resource Timing (forge/*.js) | WS1 / WS8 |
| `heap MB` | `performance.memory` (Chromium) | WS2 (thumbnails) |
| `panel ms` | median of `refreshWorldPanel()` calls | WS3 / WS4 |

## Baseline snapshot

> "Before" reference, captured 2026-06-04 (Chromium, single worker). Re-run after each workstream and
> add a dated block to prove the win.

### Cold boot (startup.spec.js)

```
DATE        SIZE     DCL/load   heap      panel    articles
----------  -------  ---------  --------  -------  --------
2026-06-04  empty    93ms       16.3MB    n/a      0
2026-06-04  50       212ms      17.4MB    ~0ms*    50
2026-06-04  1000     204ms      22.0MB    ~0ms*    1000
2026-06-04  5000     206ms      42.6MB    ~0ms*    5000
```

### Image bytes + decode (images.spec.js)

```
DATE        SET            full→thumb         bytes total      decode
----------  -------------  -----------------  ---------------  ---------------
2026-06-04  25 @1500px     254KB→7KB (35×)    6.2MB→0.2MB      200ms→16ms (12.5×)
2026-06-04  50 @1500px     255KB→7KB (35×)    12.4MB→0.4MB     424ms→26ms (16.3×)
```

## Results since baseline (2026-06-11)

- **WS1 shipped (0.6.22)** — all CDN libs + classic app scripts now `defer`: parse/first-paint no
  longer block on script download. Win is on *uncached* first loads; the warm-reload numbers above
  barely move (see script-eval caveat below). Guarded by `tests/map.spec.js` (Leaflet init order).
- **WS2 shipped (0.6.21 + 0.6.24)** — asset grid, map popups, family-tree avatars, and timeline
  cards render from lazy `thumb256-*` WebP thumbnails (~30× smaller, ~13× faster decode; see image
  table above). Guarded by `tests/thumbnails.spec.js` + `tests/ws2-consumers.spec.js`.
- **WS3 shipped (0.6.23)** — visibility toggles patch one tree row in place instead of a full
  panel rebuild. Guarded by `tests/ws3-incremental.spec.js` (DOM-node identity).
- **WS5 measured & skipped** — `search.spec.js`: `performGlobalSearch` is ~2–4 ms/query on the 5k
  fixture (median of 7), well under a frame even undebounced per keystroke. A search index is not
  justified; the spec stays as a regression guard.
- **B3 (marker-icon rebuild) measured & skipped (2026-07-10)** — `scripts/measure-marker-sync.js`:
  steady-state `syncAllLayers()` rebuilds every visible marker icon, but costs only **8.7 ms**
  median @ 300 pins (world-1000) and **56.2 ms** @ 1500 pins (world-5000), with **zero DOM node
  replacements** — Leaflet's `DivIcon.createIcon(oldIcon)` reuses the element and rewrites
  innerHTML. Layer sync is ~7–9% of a `render({full:true})` (126.7 ms / 650 ms); the other ~90% is
  `refreshAtlasTree` (C4/WS7 territory). An icon-signature dirty-diff would risk stale-pin bugs
  (signature must cover icon/color/pinShape/sizes/labels/CoA-links/role) for a single-digit-% win.
- **WS6 (canvas renderer + IDB-in-worker) measured & skipped (2026-07-10)** —
  `scripts/measure-ws6-vectors.mjs` @ 250/1000/2000 polygons+polylines (16-vertex blobs, 10% smooth
  curves): **pan is vsync-locked at every size** (16.7 ms p50 — SVG pans by pane transform, shape
  count irrelevant); zoom re-projection is **8.8 ms** median @ 1000 and **17.0/23.0 ms** p50/max
  @ 2000 (at worst one borderline frame, at 2× any realistic map density); `render({full:true})`
  28.7 ms @ 1000. A canvas swap would also *regress*: CSS-class selection highlight
  (`path.leaflet-interactive.leaflet-feature-selected`), SVG-only `L.curve` smooth lines, and
  keyboard-focusable paths. IDB-in-worker: `save()` with **all** 2000 entities dirty is 196 ms —
  an import-only pathological case; a normal edit dirties 1–10 entities (~0.1 ms each), so the
  main-thread save cost is ~1–2 ms in practice. Neither half is justified.

## Findings (2026-06-04)

1. **Startup is data-independent up to 5,000 articles.** DCL holds flat at ~200 ms from 50→5,000
   articles; only JS heap scales (16→43 MB, ~5 KB/article). Boot cost is dominated by the fixed
   script-load phase, not by world size. Combined with the real world `Dead_Reckoning.trv` having only
   **289 articles**, this *deprioritizes* virtual scrolling (WS4) — it's a "large-campaign someday"
   item, not an urgent one.
2. **Images are the real bottleneck (WS2).** Thumbnails are **35× smaller to store/hold** and decode
   **~13–16× faster**. On a 280-image world this is the difference between hundreds of MB / multi-second
   decode and a few MB / sub-100 ms. WS2 is the clear top win.

## Known metric caveats (refine before trusting these two columns)

- **`panel ~0ms*`**: `refreshWorldPanel()` lazy-renders only the active/expanded view, so the median
  reads ~0 ms even at 5,000 articles. To make this a real WS3/WS4 signal, force-expand a folder/map and
  measure the actual subtree build. Until then, treat panel-render as not-yet-measured.
- **`scripts 1/~2ms`**: on reload most `forge/*.js` are served from cache, so Resource Timing
  under-counts script eval. Use **DCL** as the startup proxy, or measure with cache disabled for a true
  cold-cache script-eval number (relevant to WS1/WS8).

## Notes / caveats

- `panel ms` is synchronous render time only (excludes async icon/image resolution) — that is
  precisely the cost WS3/WS4 attack, so it is the right number to track.
- The fixture map references a deliberately-absent image blob; the app tolerates this and the panel
  still renders. Console may log an image-resolution miss — that is expected and not asserted.
- `performance.memory` is Chromium-only; `heap` shows `n/a` on other engines.
- Thresholds are intentionally soft. The only hard assertion is that the seeded world loaded.

## Phase M — atlas tree virtual scrolling (0.6.45-alpha, 2026-07-10)

Windowed flat-row rendering for the atlas tree (`tests/atlas-virtual.spec.js` carries the hard
assertion; it seeds 5000 articles fully expanded and times `await refreshAtlasTree()`):

| | before (legacy nested) | after (windowed) |
|---|---|---|
| tree rebuild, 1500 pins expanded | ~650ms (B3 measurement, `render({full:true})`) | — |
| tree rebuild, 5000 articles expanded | (unmeasured; ≫1s extrapolated) | **~6ms median** (runs 4.8–9.8ms) |
| materialized DOM rows @5000 | ~5000 | **~35** (viewport + 2×10 overscan) |

Kill switch: `saveLS('atlasVirtualTree', false)` restores the legacy nested renderer.
