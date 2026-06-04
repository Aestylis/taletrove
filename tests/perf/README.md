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
