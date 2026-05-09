# STATUS.md — Feature Status & Version History

> Last verified: 2026-05-08. All statuses confirmed by direct code inspection.
> TaleTrove follows [VERSIONING.md](../VERSIONING.md) rules.

## Current Version: `0.6.0-alpha` (Session Layer — Phases A–J + I + L complete; M deferred)

---

## 🚀 Version History

### Alpha 6.2 — Markercluster + Bug Fixes (2026-05-08)

- ✅ **Leaflet.markerCluster**: Dense map pins cluster when zoomed out. Custom `_PinShapeGroup` proxy routes point markers to `L.markerClusterGroup` and shapes to `L.featureGroup` — all existing `allLayers` call sites unchanged. Cluster icon shows count; spiderfy on max zoom. (`map.js`, `index.html`, `worldbuilder.css`)
- ✅ **Text object rotation**: Text geometry features support a rotation angle (slider + number input + reset). Angle stored on the feature and applied as a CSS `rotate()` transform. (`worldbuilder.js`, `inspector.js`, `worldbuilder.css`)
- ✅ **Bug fix — area label centering**: `runLabelCollisionDetection` was resetting area/line label transforms to `''`, stripping the `translate(-50%, -50%)` centering and offsetting them from their COA markers. Reset now restores correct centering; yOffset step uses `translate(-50%, calc(-50% + Npx))`. (`map.js`)
- ✅ **Bug fix — panel toggle active state**: Global `button:active { transform: translateY(1px) }` clobbered the `.aside-toggle-btn`'s `translateY(-50%)` centering on mousedown, causing it to slide. Added `:active` overrides that lock the full transform for both panel-open and panel-hidden states. (`worldbuilder.css`)
- ✅ **Bug fix — pin labels after navigation**: `animationend` fired at intermediate zoom levels during `flyToBounds`, removing labels for still-clustered pins. A `moveend` handler now restores labels for any pin that is unclustered at the final destination but labelless. (`map.js`)
- ✅ **Bug fix — area tooltip removed**: Polygon areas no longer show a mouseover tooltip (was never the intended behaviour; area name is shown via the static label when `showLabel` is enabled). (`map.js`)

### Alpha 6.1 — Polish & UX (2026-05-03)

- ✅ **Fullscreen toolbar auto-hide**: `#mapFullscreenControls` fades to near-invisible after 3s of mouse inactivity; any mousemove restores it. Minimize button (↑) collapses the toolbar off-screen; a small handle tab at the top-right edge expands it back. (`worldbuilder.js`, `worldbuilder.css`, `index.html`)
- ✅ **Tutorial X button bug fix**: `#tutorialCloseBtn` was using `js-modal-close` which bypassed `endTutorial()` — `hasCompletedTutorial` was never saved and the dummy info panel was not cleaned up. Removed the class; added dedicated `click` + `Escape` listeners that call `endTutorial()` directly. (`tutorial.js`, `index.html`)

### Alpha 6 — Session Layer (v0.6.0-alpha)
*Release Date: 2026-03-24*

- ✅ **Phase I — GM Sessions panel**: Dedicated SESSIONS section in the left panel (GM-only). `createNewSession()`, `refreshSessionsView()`, session inspector fields. (`panels.js`, `inspector.js`, `worldbuilder.js`, `index.html`)
- ✅ **YouTube embed support**: Embed block now detects YouTube URLs and renders an inline `<iframe>` player. (`block-editor.js`)
- ✅ **Sample world improvements**: Pin styles (iconColor, pinIconColor, pinShape, fillOpacity, iconClass), coat-of-arms on Verdant Expanse, territory links from Keep and Temple to Verdant Expanse. (`scripts/build-sample-world.js`)
- ✅ **Tutorial updated**: World Panel and Relational Graph step descriptions updated to reflect current UI. (`forge/tutorial.js`)
- ✅ **GM guide screenshots**: All 7 guide screenshots replaced with current UI (new left panel, SESSIONS section, Aethermoor sample world). (`guides/img/`)

### Alpha 5 — Competitive Refactor + Phase J (v0.5.0-alpha)
*Release Date: 2026-03-23*

- ✅ **Phase J — Sample World (Aethermoor)**: `forge/Examples/SampleWorld.trv` built via `scripts/build-sample-world.js`. 14 articles (6 atlas pins/polygons, 8 lore), Ashvane family with family-tree links, 2 timeline events, 1 session note, Donjon-format Angelic Calendar, map from `Example.jpg` (1792×2368). (`scripts/build-sample-world.js`, `forge/Examples/`)
- ✅ **Phase J — First-run onboarding modal**: `#sampleWorldModal` shown to new users before tutorial — "Load Sample World" fetches and imports `SampleWorld.trv`; "Start Fresh" goes straight to tutorial. (`worldbuilder.js`, `index.html`)
- ✅ **Phase J — Community Resources credits**: Azgaar's Fantasy Map Generator and Donjon acknowledged in Project Hub credits section. (`index.html`)
- ✅ **Fix — label color fallback**: `safeCssColor(undefined)` returns `'transparent'` (truthy), defeating the `|| '#ffffff'` fallback. Fixed by checking `f.labelColor` before calling `safeCssColor`. (`map.js`)
- ✅ **Fix — default label style**: New atlas articles have `labelStyle` undefined → map.js fell back to `'none'` (transparent background) → white text invisible on light maps. Build script now sets `labelStyle: 'outline'` and `labelColor: '#ffffff'` on all sample world atlas articles. (`scripts/build-sample-world.js`)
- ✅ **Fix — streaming export produced 0-byte files**: `generateInternalStream` + async data-event callbacks had a race where `end` fired before buffered writes flushed. Replaced with `zip.generateAsync({type:'blob'})` written directly to the File System Access API writable — simpler, correct, no race. (`worldbuilder.js`)
- ✅ **Fix — bug reporter PAT removed**: Embedded GitHub PAT was auto-revoked by secret scanning on the public repo. Replaced direct API POST with `window.open(githubNewIssueUrl)` — pre-fills GitHub's new-issue form, no auth required. (`modals.js`)
- ✅ **Fix — relational graph close button**: Was using `text: '×'` character; now uses `getIconHTMLSync('x', 'currentColor')` matching all other icon buttons. (`relational-graph.js`)
- ✅ **Fix — tutorial toolbar step position**: Toolbar step was hardcoded `position: 'bottom'`; added `'toolbar-auto'` sentinel resolved at runtime to `'top'` when toolbar is docked at bottom. (`tutorial.js`)
- ✅ **Fix — streaming export correct geometry**: `scripts/build-sample-world.js` updated with user-edited precise pin coordinates and detailed polygon vertices (48–60 points each) for Verdant Expanse and Grey Reaches. (`scripts/build-sample-world.js`)

---

### Alpha 4.1 — Bug Fix Patch (v0.4.1-alpha)
*Release Date: 2026-03-09*

- ✅ **Seg chip active state**: `#propertiesContainer .seg button.active` CSS selector fixed (was `.inspector .seg` — class doesn't exist in DOM). Active color now uses `var(--accent-orange)`. (`worldbuilder.css`)
- ✅ **Text label live-refresh**: `syncSingleLayer` in `map.js` now has a `geometry === 'text'` branch that rebuilds the DivIcon on property change. (`map.js`)
- ✅ **Feature click action persists**: Settings-only saves now call `saveLS('worldSettings', settings)` directly, bypassing the `_dirtyKeys.size === 0` early return in `_performSave`. (`modals.js`, `state.js`)
- ✅ **Single-click undo**: Removed redundant `focus` → `recordState()` listener from inspector; `change` → `updateStateFromInspector()` already records state. (`inspector.js`)
- ✅ **Drag entries into encyclopedia folders**: Added `fallbackOnBody: true` to Sortable instances; drop handlers on folder row headers accept `application/x-taleprove-entry`. (`panels.js`, `worldbuilder.js`)
- ✅ **Nested encyclopedia folders**: Full recursive folder support with `parentFolderId`, `renderEncFolderNode` recursive renderer, circular nesting guard, and child-folder promotion on deletion. (`panels.js`, `worldbuilder.js`, `data.js`)

### Alpha 4 — The Woven World (v0.4.0-alpha)
*Release Date: 2026-03-08*

- ✅ **Universal Links System — Phase 1 + 2**: `entity.links[]` on all features and encyclopedia entries; inspector "Links" section with navigable chips, add/remove UI, link types, stale-link cleanup. Spatial containment detection (ray-cast). Bidirectional "Linked by" view. (`inspector.js`, `data.js`, `state.js`, `worldbuilder.js`, `styles.js`, `worldbuilder.css`)
- ✅ **Link Chip Data Bugs**: `name`/`title` sync; `isReciprocal` migration; `kind` taxonomy guard; display name resolution flipped to `title || name`. (`data.js`, `inspector.js`)
- ✅ **Project Hub**: Full-screen dashboard with recent-projects card grid, drag-and-drop import, quick-action buttons. (`worldbuilder.js`, `modals.js`)
- ✅ **Unified Settings**: General, Calendar, Dice, Theme, About consolidated into one side-nav modal. (`modals.js`)
- ✅ **Google Drive Sync**: Save/load worlds to user's own Google Drive (`drive.file` scope). Open from Drive hub view. Connect-on-demand. (`google-drive.js`, `worldbuilder.js`, `modals.js`)
- ✅ **Coat of Arms — Polygon ownership + entry display**: Polygons own `coatOfArms`/`coatOfArmsKey`; linked encyclopedia entries show read-only "Territory CoA" with nav link. (`inspector.js`, `map.js`, `data.js`)
- ✅ **Multi-Select & Bulk Actions**: Ctrl+click multi-select in Atlas and Encyclopedia; bulk edit Visibility, Color, Tags, Folder, Delete. SortableJS multiDrag. (`panels.js`, `inspector.js`, `worldbuilder.js`)
- ✅ **Block Affordances**: Always-visible drag handles; scroll-following sticky Add Block button. (`block-editor.js`, `inspector.js`, `worldbuilder.css`)
- ✅ **Hero Image Drop Zone**: Styled empty state with icon, descriptive copy, hover/drag-over accent. (`inspector.js`, `worldbuilder.css`)
- ✅ **M3 Side-Sheet System**: Non-blocking side-sheets for icon picker, color picker, news, help. (`modals.js`, `worldbuilder.css`)
- ✅ **Toast System**: Queue (up to 3 concurrent), error variant with icon, undo coverage. (`worldbuilder.js`)
- ✅ **Inspector Crossfade**: Properties inner content fades + slides on expand/collapse; content area fades in on new entity selection. (`inspector.js`, `worldbuilder.css`)
- ✅ **Sticky Inspector Header**: Entity title/avatar pinned at top while body scrolls. (`inspector.js`, `worldbuilder.css`)
- ✅ **Panel Inline Filters**: Per-panel search inputs for Atlas tree and Encyclopedia list. (`panels.js`)
- ✅ **User Identity Chip**: Name + color-coded avatar initial in header right rail. (`ui.js`, `modals.js`)
- ✅ **SVG Logo**: Inline SVG with spring wiggle animation on hover, light/dark theme switching. (`index.html`, `worldbuilder.css`)
- ✅ **Radial Menu — Pin-Petal Redesign**: 6 flat actions as map-pin teardrops. (`map.js`, `worldbuilder.css`)
- ✅ **Radial Menu — Petal Gradient Palette**: Each petal carries a warm-to-cool hue tint (amber → lime → teal → blue → violet) via `color-mix`; hover border/glow/icon color inherits per-petal `--petal-accent`. (`worldbuilder.css`)
- ✅ **Haptic Hover Transitions**: Unified CSS hover animations across cards, buttons, list rows. (`worldbuilder.css`)
- ✅ **Drag Ghost Styling**: `ghostClass: 'sortable-ghost'` on all Sortable instances; styled with accent border + reduced opacity. (`panels.js`)
- ✅ **Timeline Wheel Zoom**: `wheel` event zooms Gantt + vertical timeline at 1.08× per tick. (`modals.js`)
- ✅ **Timeline Modal Layout Fix**: `.timeline-modal-header` flex row; `.timeline-viewer` flex:1. (`worldbuilder.css`)
- ✅ **Calendar Layout Fixes**: Sidebar border; `overflow-y:auto` on `.calendar-main`. (`worldbuilder.css`)
- ✅ **Performance — O(1) Icon Lookup**: `getIconHTMLSync` uses lazy `Set`. (`ui.js`)
- ✅ **SW Cache Versioning**: Cache keys tied to `APP_VERSION`. (`sw.js`)
- ✅ **CSP Fix**: Cloudflare challenge platform scripts allowed. (`index.html`)

---

- ✅ **Bug Fixes**: Numerous minor bugs squashed — player role guard leaks, state mutation convention gaps (data loss/broken undo), fog controls popover height, lore chip backlink names, hero meta strip chip layout, inspector panel close-on-deselect, and more.

---

## ✨ Alpha 5 — Feature Work (2026-03-11, Gemini + Claude)

### Gemini: Unified Event System
- ✅ **`parseSortableDate` + `parseLegacyTimelineDate`**: Unified date-sort helpers in `utils.js`. All timeline/calendar/gantt code migrated from `parseDateToSortable` to `parseSortableDate`. Legacy string dates auto-migrate via `parseLegacyTimelineDate`. (`utils.js`)
- ✅ **`buildDatePicker` component**: Reusable, calendar-aware date picker (Year/Era/Month/Day) extracted to `styles.js`. Used by timeline block editor and encyclopedia event inspector. (`styles.js`)
- ✅ **Timeline block — linked events**: Block events now have `source: 'local' | 'linked'` + `linkedId`. A linked event pulls its title and date live from an Encyclopedia Event entry. Local events work as before. (`block-editor.js`, `data/blocks.js`)
- ✅ **Timeline block — works on encyclopedia entries**: `addTimelineEvent` / `removeTimelineEvent` / `updateTimelineEvent` in `worldbuilder.js` now search both `state.features` and `state.encyclopedia` for the block owner, not just `state.features`. (`worldbuilder.js`)
- ✅ **Encyclopedia event inspector — `buildDatePicker`**: Start and end date sections rebuilt using the shared `buildDatePicker` component. (`inspector.js`)
- ✅ **Participants section on Event inspector**: `buildParticipantsSection()` added to `inspector.js`. Chips list with navigate-on-click; add via searchable select; stale-link auto-clean; GM-only remove. (`inspector.js`)
- ✅ **`participant` link type**: Added to `LINK_TYPES` in `inspector.js` and `RG_LINK_COLORS` in `relational-graph.js` (purple `#9b59b6`). Incoming participant links surface in the "Linked by" section. (`inspector.js`)
- ✅ **Relational graph — participant edges**: Events with `participantIds` emit `participant`-typed edges to the graph. Node radius now accounts for `participantCount` + `incomingParticipantCount` in addition to standard link count. (`relational-graph.js`)
- ✅ **Global Timeline / Gantt — linked event support**: `showGlobalTimeline` resolves linked block events through the encyclopedia map before pushing to `allEvents`. Encyclopedia events included with correct `endDateData`. (`modals.js`)
- ✅ **Timeline wheel zoom — rAF throttle**: Wheel handler now batches DOM writes in a `requestAnimationFrame` to prevent jank on fast scrollwheels. (`modals.js`)

### Claude: Bug Fixes (same session)
- ✅ **`inspector.js` ReferenceError on Event inspector**: Gemini deleted `dateLabel`, `dateGroup`, `endDateLabel`, `endDateGroup` but left them in the `form.append()` call — crashed on opening any Event entry. Removed dead references; pickers were already appended earlier. (`inspector.js`)
- ✅ **Stale grid CSS overriding new flex layout**: Old `.timeline-editor-event` block at line 7737 (`grid-template-areas`/`grid-template-columns`) survived Gemini's flexbox rewrite and always won via cascade. Deleted. (`worldbuilder.css`)
- ✅ **Duplicate `.remove-event-btn:hover` rule**: Two conflicting rules — `transform: scale(1.1)` was dead. Merged into a single rule. (`worldbuilder.css`)
- ✅ **Missing CSS classes**: `.timeline-editor-event-body`, `.timeline-editor-event-date-col`, `.date-picker-component`, `.timeline-source-toggle`, `.entity-participants-section`, `.linked-date-display` — all used in JS but undefined in CSS. Added with M3/HIG-aligned layout. (`worldbuilder.css`)
- ✅ **`endDateData` dropped from encyclopedia events in Gantt**: Gemini's refactor of `showGlobalTimeline` omitted the `endDateData` object for encyclopedia events with end dates, breaking duration bars. Restored. (`modals.js`)
- ✅ **`onfocus: recordState()` removed from color pickers**: Undo/redo no longer captured state before color changes in the timeline block editor. Restored on both BG and Text inputs. (`block-editor.js`)
- ✅ **CSS cascade conflict — `.event-date-group`**: Two rules with the same selector; the older inspector rule (`grid-template-columns: 80px 1fr 1fr 80px`) at line 7765 always overrode the block editor's rule, cramming 4 columns into the 220px date column (ERA/MON/DAY labels colliding). Fixed by scoping block editor overrides under `.date-picker-component .event-date-group`. (`worldbuilder.css`)
- ✅ **Inline style on linked date display**: Replaced `style='padding:...'` with `.linked-date-display` CSS class. (`block-editor.js`, `worldbuilder.css`)

---

## 🐛 Bug Fixes — Alpha 5 session (2026-03-09)

- ✅ **Generator always returns same name**: `armoria.bundle.js` permanently replaced `Math.random` with seeded PRNG; fixed by saving/restoring `Math.random` around `generate()` call in `armoria.js`.
- ✅ **Seg chip active state invisible**: `.inspector .seg button.active` CSS selector never matched — no `.inspector` class exists in the DOM. Replaced with `#propertiesContainer .seg button.active`; active state now uses `var(--accent-orange)`.
- ✅ **Text object properties don't refresh map**: `syncSingleLayer` had no `geometry === 'text'` branch; changes required F5. Added DivIcon rebuild on update matching `featureToLayer` logic.
- ✅ **featureClickAction setting not persisted**: `_performSave()` bailed early when `_dirtyKeys` was empty, skipping `saveLS`. Settings now written directly via `saveLS('worldSettings', settings)`.
- ✅ **Double undo per change**: `focus` listener on inspector inputs called `recordState()` redundantly — `updateStateFromInspector` already calls it before mutating. Removed the focus listener.
- ✅ **Map click mode not role-aware**: Player role now always uses popup (browse mode); GM respects the `featureClickAction` setting. Standardised value to `'content'`/`'popup'` (migrates stale `'panel'`/`'navigate'`).
- ✅ **Encyclopedia drag-to-folder broken**: SortableJS drop zone was the children container, not the visible folder row header. Added native dragover/drop on folder rows.
- ✅ **Encyclopedia folders dragged out by SortableJS**: Folders were treated as sortable items. Fixed by handling folder drags explicitly in `handleEncyclopediaDrop`.
- ✅ **Encyclopedia nested folders**: Full `parentFolderId` nesting support added — recursive `renderEncFolderNode`, circular nesting guard, child promotion on folder delete, search ancestor bubbling.

---

### Alpha 3 — "The Chronicles of Time and Space" (v0.3.0-alpha)
*Release Date: 2026-03-03*

- ✅ **LegendKeeper-Style Gantt View**: Category swimlanes, duration bars, lane packing, dynamic base zoom. (`modals.js`)
- ✅ **Time System Editor**: Custom calendar configuration (Months, Weekdays, Eras). (`modals.js: openCalendarSettingsModal`)
- ✅ **Advanced Event Recurrence**: Engine support for Annual Date, Annual Relative, and Lunar cycles. (`inspector.js`, `modals.js`)
- ✅ **Unified Radial Menu**: Universal context menu for Pins, Areas, Lines, and Lore-Pins. (`map.js:1062`)
- ✅ **Map Zoom Slider**: Google Maps-style vertical slider with buttons and show/hide toggle. (`map.js`)
- ✅ **Area Labels**: Centered text on polygons/lines with custom size/color/style. (`map.js:1100-1150`)
- ✅ **Geometry Styles Centralization**: Unified `styles.js` for dash patterns and geometry defaults. (`styles.js`)
- ✅ **Enhanced Map Zoom Control**: Smooth fractional zoom steps, preventing jitter/jolting, and improved zoom-to-cursor logic. (`map.js`)
- ✅ **Bezier / Curved Polylines**: Smooth line smoothing using Catmull-Rom interpolation and `Leaflet.Curve`. (`map.js`, `styles.js`, `inspector.js`)
- ✅ **Password-protected `.wbundle`**: AES-GCM encryption for project exports using Web Crypto API. (`worldbuilder.js`, `utils.js`)
- ✅ **Streaming `.wbundle` Export**: File System Access API save-picker (no download prompt). Originally used `generateInternalStream`; replaced in v0.5.0 with `generateAsync + writable.write(blob)` after async race produced 0-byte files. (`worldbuilder.js`)
- ✅ **Componentized Title Block**: Shared `buildEntityHeader` helper for panel and map popups. (`styles.js`)

### Alpha 2 — "The Map is the Lore" (v0.2.0-alpha)
*Release Date: 2026-02-28*

- ✅ **Maps are Lore**: Maps now support lore blocks and hero images in the inspector. (`inspector.js:1352`)
- ✅ **Unified Block Architecture**: add/delete/update unified for all entity types. (`block-editor.js:489`)
- ✅ **Unified Inspector Panel**: Properties and Content merged into a single scrollable flow. (`inspector.js`)
- ✅ **Hero Quick-Access Chips**: Bottom-anchored chips for linked Maps, Related Lore, and Events. (`inspector.js`)
- ✅ **UI Polish**: 2.8rem Titles with drop shadows, Lore-Pin label alignment (dynamic offsets). (`worldbuilder.css:1610`)
- ✅ **Sidebar Auto-Expand & Auto-Scroll**: Left-click pin → expands folders, scrolls to row. (`panels.js:751`)
- ✅ **Persistent Sidebar Visibility**: Respects `rightPanelHidden` preference on startup. (`worldbuilder.js:366`)
- ✅ **Content Layout Templates**: Save/Load full block sets across entities. (`inspector.js:1514`)
- ✅ **Skeleton Loaders**: Shimmering UI states for hero image and blocks during async load. (`worldbuilder.css:1270`)

### Alpha 1 — "Foundations of the Atlas" (v0.1.0-alpha)
*Release Date: 2026-02-23*

- ✅ **Spatial Encyclopedia**: Person, Place, and Thing pins anchored to map geometry. (`map.js`)
- ✅ **Relationship Mapping**: Typed relationships manifested as dynamic virtual tags. (`block-editor.js:310`)
- ✅ **3D Dice Engine**: `{{3d6+2}}` inline notation with physics-based rendering. (`dice-roller.js`)
- ✅ **Full-Text Search**: Global search indexing all markdown content in blocks. (`data.js:70`)
- ✅ **Refactored Settings**: Streamlined Photoshop-style settings modals (General, Calendar, Dice, Theme). (`modals.js`)
- ✅ **Security Hardening**: XSS protection (no inline handlers), SRI hashes, CSP, SVG sanitization. (`shared.md`)
- ✅ **SortableJS Integration**: Drag-and-drop for blocks, Atlas tree, and Encyclopedia lists. (`panels.js`)
- ✅ **Per-Entity IDB Storage**: Atomic record saving with dirty tracking and orphan cleanup. (`state.js`)

---

## 🛠 Infrastructure & Persistence

| Feature | Status | Evidence |
|---|---|---|
| Per-entity IDB storage | ✅ | `state.js:104-223`, `worldbuilder.js:183-206` |
| Dirty tracking (`_dirtyKeys` + `markEntityDirty`) | ✅ | `state.js:104`, `state.js:111-117` |
| `beforeunload` → synchronous `save()` flush | ✅ | `worldbuilder.js` `initEventListeners` |
| Backlink index cache (O(1) lookup) | ✅ | `state.js` `_backlinkIndex` |
| Blob URL eviction for custom icon cache | ✅ | `ui.js` `evictCustomIconUrl()` |
| Progressive Web App (PWA) | ✅ | `manifest.json`, `sw.js` |
| Design token system (CSS Variables) | ✅ | `worldbuilder.css` `:root` |
| Undo/redo (`recordState` + undo stack) | ✅ | `state.js` |
| App Versioning (SemVer) | ✅ | `state.js: APP_VERSION`, `VERSIONING.md` |

---

## 🔲 Open TODOs

### UX Backlog (`UX_REVIEW.md` — source of detail)

> **V** = Validated against live app + design frameworks · **S** = Speculative (written from code inspection only, not yet verified live)

| Task | Priority | Confidence | Notes |
|---|---|---|---|
| Tab crossfade (Properties ↔ Content) | P2 | V | ~~Opacity + subtle translateY between inspector tabs~~ ✅ 2026-03-06 |
| Block affordances | P2 | V | ~~Always-visible drag handles; scroll-following add-block trigger~~ ✅ 2026-03-07 |
| Draw tool theming | P2 | V | ~~Leaflet draw tooltip is visually jarring vs app tokens~~ ✅ 2026-03-06 |
| Fog brush UX | P2 | V | ~~No cursor feedback when painting fog~~ ✅ 2026-03-06 |
| Drag ghost styling | P2 | V | ~~SortableJS default ghost is visually unstyled — confirmed live~~ ✅ 2026-03-06 |
| Illustrated empty states | P2 | V | ~~New-world blank panels confirmed jarring~~ ✅ 2026-03-06 |
| Timeline wheel zoom | P2 | V | ~~Standard expected trackpad/wheel interaction~~ ✅ 2026-03-06 |
| Breadcrumb truncation | P3 | S | ~~Needs deep world structure to reproduce~~ ✅ 2026-03-06 |
| ~~Compact tree mode~~ | ~~P3~~ | S | ~~Density preference; may not be needed~~ ✅ 2026-03-09 — compact/comfortable toggle in panel tab bar |
| ~~Encyclopedia alpha jump bar~~ | ~~P3~~ | S | ~~Only relevant at high entry counts~~ ✅ Done 2026-03-12. A–Z chips below filter bar; scroll-to-first-match with sticky-bar offset compensation; hidden when filter active. (`panels.js`, `worldbuilder.css`) |
| ~~Label collision detection~~ | ~~P3~~ | S | ~~Needs dense map to confirm it's actually a problem~~ ✅ Done 2026-03-12. Post-render greedy vertical-shift pass on `.name-label-inner`; resets on pan/zoom; double-rAF scheduling. (`map.js`, `worldbuilder.css`) |
| ~~Timeline dynamic lane height~~ | ~~P3~~ | S | ~~Needs scale to reproduce~~ ✅ Done 2026-03-12. Adaptive `laneHeight` (52→40→32→26px) based on lane count; `topOffset` updated to match. (`modals.js`) |
| Timeline → Calendar date sync | P3 | S | ~~Edge-case workflow~~ ✅ 2026-03-06 |

### Intentional Design Decisions (reviewed, retained by choice)

> These items appeared in `UX_REVIEW.md` audits. After validating against the live app and design frameworks they were explicitly kept as-is. Do not re-add to the backlog.

| Decision | Rationale |
|---|---|
| **Popup toggle retained** | Popup and inspector serve different density tiers — glance vs. full edit. Aligns with NN/g progressive disclosure, HIG Popovers, and M3 card-summary patterns. The audit critique assumed duplication; the live app shows they're complementary. |

### Feature Backlog

| Task | Difficulty | Notes |
|---|---|---|
| ~~**Open from Google Drive**~~ | ~~Low~~ | ✅ Done. "Open from Drive" card added to Actions grid (`#hubDriveOpenCard`); hidden when Drive not configured, connect-on-demand otherwise. `openDriveFilePicker` rewritten to slide into `#hubViewDriveOpen` hub view with the same animation as Settings. Back button (`#hubBackBtn`) returns to overview via `showHubOverview`. |
| ~~**Radial context menu — sub-actions**~~ | ~~Medium~~ | ✅ Done. Redesigned as pin-petal flower: each button is a map-pin teardrop with tip pointing inward. 6 flat actions for points (Properties, Change Icon, Icon Color, Pin Color, Pin Shape, Delete), no sub-rings. (`map.js`, `worldbuilder.css`) |
| ~~**Radial menu — petal gradient palette**~~ | ~~Low~~ | ✅ Done. Each pin-petal gets a unique `color-mix` hue tint (amber → lime → teal → blue → violet) via `nth-child`; hover border/glow/icon inherit per-petal `--petal-accent`. (`worldbuilder.css`) |
| Bulk editing | ✅ | `worldbuilder.js: handleBulkUpdate`, `inspector.js: buildBulkEditInspector` |
| **Universal Links System** | **High** | ✅ Phase 1 + 2 complete — `entity.links[]`, inspector UI, spatial containment detection, bidirectional "Linked by" view. Phase 3 (bidirectional write-through, relational graph view) deferred. |
| ~~CoA — Assets panel + lore-pin display~~ | ~~Medium~~ | ✅ Done. Lore-pins on the map now show a small territory CoA badge (18px, bottom-right) when the entry has a `territory` link to a polygon with a CoA — resolves from blob or Armoria generator, silently skipped on error. Custom CoA uploads now labeled `CoA · [entity name]` in the Assets panel via `getAssetDisplayName`. |
| ~~**Templates — Encyclopedia support**~~ | ~~Medium~~ | ✅ Done. Encyclopedia context menu now calls `saveLayoutTemplate(id, 'encyclopedia')` instead of the fake duplicate+tag hack. `saveLayoutTemplate` stores `entityType` on layout templates; inspector picker filters by entity type (legacy templates with no `entityType` remain visible everywhere). Settings → Templates pane now has two sections: Feature Templates (map-placing, editable) and Layout Templates (block presets, with entity type chip + delete). `deleteLayoutTemplate` added. |
| Automated E2E testing (Playwright) | High | No test suite yet; `.playwright-mcp/` config exists — **Alpha 5** |
| Virtual scrolling (Encyclopedia) | High | Defer — needed at 1000+ entries; profiling hasn't confirmed urgency — **Alpha 5** |
| **Assets — Unsplash integration** | Medium | Browse/search Unsplash free photos directly in the Assets tab; insert as hero image or image block. Requires Unsplash API key (free tier: 50 req/hr). Use `utm_source` attribution param to comply with guidelines. |
| **Assets — Pinterest integration** | High | Browse user's Pinterest boards and pins as image sources. Requires Pinterest OAuth + Developer App approval. Pin images are not freely embeddable — may need to link-out rather than import. Investigate viability before starting. |
| **Assets — Additional free image sources** | Medium | Candidates: **Wikimedia Commons** (REST API, no key, CC-licensed art/maps — ideal for fantasy worlds), **Pexels** (free API, similar to Unsplash), **Pixabay** (free API, broad content). A unified "Image Search" panel in Assets that queries multiple sources would be ideal. |
| **Assets — Wikimedia Commons (first source)** | Medium | 🚧 In progress — `feat/wikimedia-asset-search`. Search modal in Assets panel via provider-abstracted `image-search.js` (`window.IMAGE_SEARCH_PROVIDERS`). CC-licensed, no API key, CORS via `origin=*`. Attribution stored in `state.assetMeta` sidecar (source/author/license/sourceUrl) — surfaces on Assets tile + Inspector. |
| **Assets — Inline image search (image-block + hero-image)** | Low | Wire the existing `image-search.js` modal into the image-block upload menu and hero-image picker, so users can pull from Commons inline without first saving to library. Foundation already pluggable — pass an `onPick(blob, meta)` callback. — follow-up to `feat/wikimedia-asset-search` |
| **Assets — Pexels / Pixabay / Unsplash providers** | Medium | Add provider plugins to `image-search.js` (Pexels free API, Pixabay free API, Unsplash with API key). Each plugs into the same modal shell as Wikimedia. Per-source license display. — follow-up to `feat/wikimedia-asset-search` |
| **Map embed block** | Medium | Embed a live mini-map view inside a wiki article or sidebar block — similar to LegendKeeper 0.18. A read-only snapshot of a chosen map, click-to-navigate. Builds on existing block-editor architecture. |
| **Leaflet.markercluster** | Medium | Cluster dense pins when zoomed out. Investigated 2026-04-25: not a quick win — `allLayers` is currently a single `L.featureGroup` consumed in 6+ sites (`panels.js`, `worldbuilder.js`, `map.js`). Adding a sibling `pinClusterGroup` requires routing layer add/remove by geometry type and updating all consumers (visibility toggle, eachLayer iterators). SRI hashes already computed for v1.5.3: `leaflet.markercluster.js` `sha384-eXVCORTRlv4FUUgS/xmOyr66XBVraen8ATNLMESp92FKXLAMiKkerixTiBvXriZr`, `MarkerCluster.css` `sha384-pmjIAcz2bAn0xukfxADbZIb3t8oRT9Sv0rvO+BR5Csr6Dhqq+nZs59P0pPKQJkEV`, `MarkerCluster.Default.css` `sha384-wgw+aLYNQ7dlhK47ZPK7FRACiq7ROZwgFNg0m04avm4CaXS+Z9Y7nMu8yNjBKYC+`. |
| **Diacritic-insensitive search** (LK-inspired) | Low | "Espana" should match "España" everywhere. `normalizeForSearch()` helper in `utils.js` (NFD + strip `\p{Diacritic}` + lowercase), applied in: full-text search (`data.js`), atlas/encyclopedia/asset panel filters (`panels.js`), wiki-link autocomplete. Few hours. — `feat/lk-inspired-polish` |
| **Icon search synonyms** (LK-inspired) | Low | Curated `forge/ui-icons-synonyms.json` map (sword → blade/sabre/scimitar; tower → keep/spire/turret) merged into icon-picker query matching. ~1 day, hand-curated for our ~200-icon set. — `feat/lk-inspired-polish` |

---

## 🔗 Universal Links System — Design Spec

> **Status:** In progress on `feature/performance`. Replaces `feature.linkedEntryId` (scalar) with a structured `entity.links[]` array on every Atlas feature and Encyclopedia entry.

### Data Model

```js
// On every feature and encyclopedia entry:
entity.links = [
  { id: 'lnk-xxx', targetId: 'ent-yyy', targetType: 'encyclopedia', linkType: 'territory' },
  { id: 'lnk-aaa', targetId: 'ent-bbb', targetType: 'encyclopedia', linkType: 'family', label: 'Father' },
  { id: 'lnk-zzz', targetId: 'feat-ccc', targetType: 'feature',     linkType: 'contains' },
]
```

### Built-in Link Types

| Type | Description |
|---|---|
| `territory` | This object belongs to / is spatially within this region |
| `family` | Family relation — `label` holds "Father", "Spouse", "Child", etc. |
| `member` | Member of a faction, guild, order, or organization |
| `ally` / `enemy` / `rival` | Faction/political relationships |
| `contains` | This region/entity spatially or logically contains the target |
| `related` | Generic association (catch-all) |
| `custom` | User-defined — `label` is required |

### Migration

`feature.linkedEntryId → feature.links[0] = { targetId, targetType: 'encyclopedia', linkType: 'territory' }`
All consumers (CoA, map rendering, backlinks) updated to read `links.find(l => l.linkType === 'territory')`.

### Inspector UI — "Links" Section (replaces "Link to Encyclopedia" dropdown)

- One chip per link: `[icon] Entity Name · link-type ×`
- Clicking chip navigates to that entity
- `+ Add Link` → `[[`-style inline search across features + encyclopedia + maps → pick link type
- Spatial suggestion (Option A): if a polygon contains this pin's coordinates → ghost chip "Detected within Valoria Territory — confirm?"
- Bidirectional: adding a link on entity A adds a backlink record on entity B (queryable without scanning)

### Future Graph Queries This Enables

| Use Case | Query |
|---|---|
| Family tree | `links.filter(l => l.linkType === 'family')` |
| Faction roster | All entities with `member` link → faction entry |
| Region inhabitants | All entities with `territory` link → polygon |
| Relational map (nodes + edges) | All `entity.links[]` across the world |
| Timeline participants | ✅ Links + event `participantIds` — live in Alpha 5 |

### Future / Research

| Task | Difficulty | Notes |
|---|---|---|
| Logo SVG animation | Low | ~~Convert `TaleTrove.png` to inline SVG~~ ✅ SVG + wiggle done; future: per-part SMIL requires grouping SVG paths by layer |
| **Google Drive save/sync** | Medium | ✅ Done (Alpha 4). |
| Relational map view | High | Visual node-edge graph renderer; data foundation is Universal Links — **Alpha 5** |
| Family tree view | High | Filtered subgraph of `family` links; tree layout — **Alpha 5** |
| Region/territory roster | Medium | Sidebar list of all entities linked to a given polygon — **Alpha 5** |
| Timeline participants | Medium | `participantIds` on events + links — **Alpha 5** |
| **WebRTC Multiplayer** | High | Full spec in `PLAN-WEBRTC.md`. Manual signaling (copy-paste codes), GM-hub star topology, delta sync via `markEntityDirty`, cursor presence. Deferred to **Alpha 7+** — too large for current scope. |
| Text object — no border/background | Low | Option to strip the shadow/background from freestanding text objects for clean map labelling |
| Text object — rotation | Medium | Angle property on text objects; DivIcon CSS `transform: rotate()` |
| Text object — curved text | High | SVG `textPath` along a user-drawn path; significant rework of text geometry |

---

## 🚀 Alpha 5 — The Competitive Refactor (v0.5.0-alpha)

*Current version. Branch: `refactor/unified-article-model`*

### Feature Targets

| Feature | Difficulty | Notes |
|---|---|---|
| ~~**Relational graph view**~~ | ~~High~~ | ✅ Done 2026-03-11. Force-directed node-link graph; participant edges; node radius weighted by total connections; frosted-glass tooltip; `participant` link type. (`relational-graph.js`) |
| ~~**Family tree view**~~ | ~~High~~ | ✅ Done 2026-03-12. SVG generational layout; BFS subgraph from root; parent/child L-connectors, spouse dashed line, sibling arc; avatar circles (hero image or icon fallback); pan/zoom/center; tooltip; legend; empty state; click-to-navigate; entry point in inspector for entries with family links. (`family-tree.js`, `worldbuilder.css`) |
| ~~**Region/territory roster**~~ | ~~Medium~~ | ✅ Done 2026-03-10. Inspector panel listing all entities with a `territory` link to a given polygon. |
| ~~**Timeline participants**~~ | ~~Medium~~ | ✅ Done 2026-03-11. `participantIds` on events; integrated into Inspector & Relational Graph. |
| ~~**Meter Block**~~ | ~~Low~~ | ✅ Done 2026-03-10. Numeric tracker block with label, current/max inputs (edit mode) and progress bar (view mode). |
| **Automated E2E testing (Playwright)** | High | Deferred — write after Phase E of REFACTOR.md lands |
| **Virtual scrolling (Encyclopedia/Atlas)** | High | Deferred — may be unnecessary after world panel unification |

### UX Targets (P3 backlog)

| Feature | Notes |
|---|---|
| ~~Encyclopedia alpha jump bar~~ | ✅ Done 2026-03-12. |
| ~~Label collision detection~~ | ✅ Done 2026-03-12. |
| ~~Timeline dynamic lane height~~ | ✅ Done 2026-03-12. |
| ~~Blank-map right-click context menu~~ | ~~Right-click empty map → "Create here" radial (Add Pin, Area, Line, Text, Lore Entry)~~ ✅ Done 2026-03-10 |
| ~~Panel tab crossfade (Atlas ↔ Encyclopedia)~~ | ~~Left-sidebar tab switch opacity/visibility transition~~ ✅ Done 2026-03-10 |
| ~~Interactive empty states~~ | ~~Add "Create First…" CTA to Atlas + Encyclopedia empty states~~ ✅ Done 2026-03-10 |

---

## 🔄 Active Direction — Competitive Refactor (updated 2026-03-23)

> **Critical path complete.** All structural refactor phases A–H are done.
> See `REFACTOR.md` for the full vision. Next: Phase I (Session Layer) or Phase J (Onboarding).

### Phase Summary

| Phase | Goal | Status |
|---|---|---|
| **D** | Properties inline (no properties/content split) | ✅ Done 2026-03-17 |
| **E** | Full-page article view | ✅ Done 2026-03-17 |
| **F** | Slash commands for block insertion | ✅ Done 2026-03-17 |
| **Nav** | Peek mode, properties side-sheet, row actions | ✅ Done 2026-03-17 |
| **A** | Entity model unification (`state.articles[]`) | ✅ Done 2026-03-18 |
| **B** | Left panel unification (one world list) | ✅ Done 2026-03-18 |
| **C** | Inspector unification (one renderer) | ✅ Done 2026-03-18 |
| **H** | Command palette (Cmd+K) | ✅ Done 2026-03-18 |
| **I** | Session layer (first-class entity) | ✅ Done 2026-03-24 |
| **J** | Onboarding / sample world | ✅ Done 2026-03-23 |
| **K** | Publish / static HTML export | Not started |

> Phase G (GM secret blocks) removed — per-block player visibility toggle already covers this.

### Build Order
A → B → C ✅ complete.
H, I, J follow in any order.

### Session 2026-03-18 — What Was Done

#### Navigation & Old Panel Removal
- ✅ **All old-panel navigation wired to new system**: `navigateAndPeek` used throughout — links/backlinks chips, participants, breadcrumb map links, territory button, `buildLinkedBy`, cross-map navigation inside `navigateAndPeek` itself
- ✅ **Removed `#propertiesContainer` inline panel entirely**: Deleted `refreshInspector()`, `buildBulkEditInspector()`, `buildArticlePropertiesInspector()` dispatcher, `addCloseButtonToControls()`, `selectObjectAndExpandProperties()`, `updateStateFromInspector()`, `updateStateFromBlockInspector()`, all `article-edit-mode` body class logic (−531 lines from inspector.js, worldbuilder.js, panels.js, modals.js)
- ✅ **`relational-graph.js` + `family-tree.js`**: Rewired from `selectObjectAndExpandProperties` to `navigateAndPeek`
- ✅ **Radial menu selection bug**: Right-clicking a second pin no longer leaves `leaflet-feature-selected` on the first pin — `dismissRadialMenu` now removes the class unless the feature is in `multiSelectedIds`

#### Phase A — Entity Model Unification
- ✅ **`state.articles[]` backing store**: Already in place on branch; `syncArticleViews()` keeps `state.features` and `state.encyclopedia` as computed views
- ✅ **`markEntityDirty` normalized**: All 49 remaining `markEntityDirty('feature'|'encyclopedia', ...)` call sites across worldbuilder.js, map.js, panels.js, inspector.js changed to `'article'`
- ✅ **`obsidian-importer.js` mutation bug fixed**: Was pushing directly to `state.encyclopedia` (derived view) instead of `state.articles`

#### Phase B — Left Panel Unification
- ✅ **`encyclopediaFolders` merged into `state.folders[]`**: Migration in `migrateState()` moves all `encyclopediaFolders` into `state.folders` with `mapId: null`; `efld-` IDs preserved so no `folderId` remapping needed; all CRUD (create/rename/delete/drag) updated
- ✅ **`expandToEncyclopediaItem` bug fixed**: Was reading `folder.parentId` instead of `folder.parentFolderId` — collapsed parent folders never auto-expanded on navigation
- ✅ **`'on-map'` filter fixed**: Lore entries with `mapId` now visible when filter is active (previously hid entire lore section)
- ✅ **`window.refreshWorldPanel` alias added**: Single entry-point for full panel refresh
- ✅ **Dead `encyclopediaTabBtn` handler removed**

#### Phase C — Inspector Unification
- ✅ **`buildArticlePropertiesInspector(article, container, silo)`**: Single unified renderer replacing `buildFeaturePropertiesInspector` (~341 lines) and `buildEncyclopediaInspector` (~530 lines)
- ✅ **Shared helpers extracted**: `buildLinkedMapsSection(article, form)` and `buildPinStyleSection(article, taxonomyItem, form)` de-duplicate the linked-maps and pin-style blocks that were copy-pasted between the two old functions
- ✅ **Sections gated by `silo`, `article.geometry`, `article.type`**: All existing fields fully preserved — point/polygon/polyline/text geometry sections, event/character encyclopedia sections, CoA, territory CoA read-only, convert-to-atlas/encyclopedia buttons
- ✅ **Old functions kept as thin delegation wrappers** for any external callers
- ✅ **Net reduction**: inspector.js 3402 → 2528 lines (−874 lines, −26%)

### Session 2026-03-23 — UX Polish & Bug Reporter

- ✅ **Bug reporter rail button**: `#bugReportBtn` added to left nav rail; `bug.svg` added to ui-icons; manifest regenerated (90 icons). (`index.html`, `ui-icon-manifest.json`)
- ✅ **GitHub Issues integration**: Side-sheet with Report tab (type/title/desc/steps/severity/version) and Known Issues tab (live GET from `Aestylis/taletrove-feedback`). Rate-limited to 3 submissions/hour via localStorage. (`modals.js`, `worldbuilder.css`)
- ✅ **CSP + SW fix**: `api.github.com` added to `connect-src`; SW now passes through non-local, non-CDN requests instead of trying to cache them. (`index.html`, `sw.js`)
- ✅ **Tutorial TLC**: All 14 tour steps rewritten to reflect nav rail, unified world panel, and peek/article model. Fixed broken `#projectNameBreadcrumb` selector → `#breadcrumbContainer`. (`tutorial.js`)
- ✅ **Tutorial close button**: Icon mask lacked `width`/`height`/`background-color`/`mask-size` — button was invisible. Fixed. (`worldbuilder.css`)
- ✅ **General settings live preview**: Two-column layout with mock map preview; pin size animates with slider (`--gsp-size` CSS var); popup/peek strip toggles with the click-action toggle. (`index.html`, `modals.js`, `worldbuilder.css`)
- ✅ **Dice + Calendar settings max-width**: Dropdowns and color picker no longer stretch full modal width; capped at `360px`/`480px`. (`index.html`)
- ✅ **Hero icon-picker removed**: Clicking the hero icon no longer opens the icon picker (redundant with properties sheet). (`styles.js`)
- ✅ **Lightbox peek protection**: `#ttLightbox` added to `protectedArea` so clicking in the lightbox doesn't close the peek panel. (`worldbuilder.js`)
- ✅ **Toolbar Zone C overlay popover**: Load Overlay, opacity slider, and toggle consolidated into `#overlayMenuPopover`; badge dot on button when overlay is loaded. (`worldbuilder.js`, `worldbuilder.css`)

### Nav/UX Foundations (complete) — Key Behaviors
- Panel row click → `navigateAndPeek` (map-centric: switch map, center, open peek)
- Map pin single-click → peek mode (480px reading side-sheet, wiki only, no properties)
- Map pin double-click → article mode (full-screen, max-width 860px)
- Row `···` → properties side-sheet (360px, glass, squishes article view)
- `Escape` layered dismiss: properties sheet → article mode → deselect
- `invalidateSize({ pan: false })` on all panel toggles — no map jump
- See `REFACTOR.md §Nav/UX Foundations` for full spec


---

## 🔲 Planned

### Phase L — Spatial Lore Tree ✅ DONE 2026-04-03
- ✅ Lore pins appear under their map in the Atlas tree (collapsible "Lore" subsection per map)
- ✅ "Unplaced Lore" section replaces "LORE" section — shows only truly unplaced entries
- ✅ New lore entry defaults to `mapId: state.activeMapId` (`createNewEncyclopediaEntry()`)
- ✅ Reverse drag: drop lore entry onto "Unplaced Lore" header removes `mapId` + `geometry`
- ✅ "On map" chip retired from `buildEncyclopediaEntryItem()`
- ✅ Hide Unplaced Lore section in local filter mode
- ✅ `collapsedMapLoreNodes` Set added to `state.js` + `saveCollapsedState()`
- ✅ Lore pins included in Atlas tree search (`itemsToShow` / `ancestorsToShow`)
- 🔲 Extract shared `renderFolderHierarchy()` helper — deferred to Phase M (differences too substantial; Phase M's tree-flatten architecture is the right moment)
- **Files:** `panels.js`, `worldbuilder.js`, `state.js`, `worldbuilder.css`

### Phase M — Virtual Scrolling (deferred, post Phase L)
- 🔲 Single virtualised tree renderer for the unified panel
- 🔲 Prerequisite: Phase L's `renderFolderHierarchy()` extraction
- 🔲 Target: smooth at 1000+ articles
