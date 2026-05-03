# TaleTrove

**A local-first world-building atlas for tabletop RPG campaigns.**

Build living, interactive maps of your world. Every pin, region, and lore entry is a wiki article — link them together, track events on a custom calendar, roll 3D dice, and share a read-only player view without exposing GM secrets.

![TaleTrove](TaleTrove.png)

---

## Features

- **Interactive Atlas** — Place pins, draw regions, trace routes, and drop freehand text directly on any map image. Click anything to open its wiki.
- **Lore Encyclopedia** — Nested folders of characters, factions, places, and events. Full-text search across all content.
- **Rich Wiki Blocks** — Markdown, images, tables, timelines, Gantt charts, meter trackers, YouTube embeds, and wiki-links (`[[Article Name]]`).
- **Custom Calendar** — Define your world's months, weekdays, and eras. Events appear on a calendar and a Gantt view.
- **Universal Links** — Every entity can link to any other. Family trees, faction rosters, territory maps, and a force-directed relational graph all derive from these links.
- **Session Notes** — First-class session layer for GMs: recap notes tied to the world timeline.
- **3D Dice Roller** — Physics-based `{{3d6+2}}`-style inline notation, powered by DiceBox.
- **Coat of Arms Generator** — Heraldic shield generator (Azgaar's Armoria) with per-territory assignment and asset management.
- **Image Search** — Browse and insert CC-licensed images from Wikimedia Commons without leaving the app.
- **Google Drive Sync** — Save and open worlds from your own Google Drive (no TaleTrove server involved — your data stays yours).
- **GM / Player Roles** — Export a sanitized player bundle: GM-only content is stripped automatically.
- **Fullscreen Map Mode** — Distraction-free map for display on a TV or second screen, with Roll Higher, Darling (RHD) initiative integration.
- **PWA** — Installable and fully offline-capable after first load.

---

## Getting Started

TaleTrove requires a local HTTP server (it uses ES modules and IndexedDB, which don't work over `file://`).

```bash
# Clone the repo
git clone https://github.com/your-username/taletrove.git
cd taletrove

# Start any static server — pick whichever you have
python -m http.server
# or: npx serve
# or: VS Code Live Server extension
```

Open **`http://localhost:8000/forge/`** in Chrome or a Chromium-based browser.

On first launch, choose "Load Sample World" to explore the included Aethermoor demo, or "Start Fresh" to begin your own campaign.

---

## Google Drive Setup

Google Drive sync is disabled by default. To enable it for your own deployment:

1. Go to [Google Cloud Console → APIs & Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Web Application** credential
3. Add your app's origin (e.g. `http://localhost:8000`) to **Authorized JavaScript Origins**
4. Copy the Client ID and paste it into `forge/google-drive.js`:

```js
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
```

TaleTrove only requests the `drive.file` scope — it can only see files it creates.

---

## Dice Roller (Offline Use)

The 3D dice engine loads from jsDelivr CDN and caches automatically after first use. For a fully offline setup:

1. Download `@3d-dice/dice-box@1.1.4` (e.g. `npm pack @3d-dice/dice-box@1.1.4`)
2. Extract the `dist/` folder to `forge/dice-box/`
3. In `forge/dice-roller.js`, change the import back to:

```js
import DiceBox from "./dice-box/dice-box.es.min.js";
// and set: assetPath: `${basePath}dice-box/assets/`
```

---

## Tech Stack

- **No build step** — Vanilla JS (ES modules), loaded in order via `index.html`
- **Leaflet** — Map rendering, with `leaflet-curve` for Bézier routes
- **IndexedDB** — Per-entity local storage via a custom dirty-tracking layer
- **DiceBox** — 3D physics dice (CDN, `@3d-dice/dice-box@1.1.4`)
- **Armoria** — Heraldic coat-of-arms generator (Azgaar, bundled, MIT)
- **SortableJS** — Drag-and-drop for panels, blocks, and multi-select
- **DOMPurify + Marked** — Safe Markdown rendering
- **Service Worker** — Offline-first PWA with stale-while-revalidate caching

---

## Project Layout

```
/               — Landing page + marketing assets
/forge/         — The app (all source files)
/forge/data/    — Static JSON (taxonomy, generators, icon manifests)
/forge/icons/   — Map pin SVG icons
/forge/ui-icons/— UI SVG icons
/forge/armoria/ — Coat-of-arms library + heraldic charges (Azgaar, MIT)
/forge/Examples/— Sample world (.trv) for first-run onboarding
/scripts/       — Build scripts (icon manifest generation, sample world)
/tests/         — Playwright E2E tests
```

---

## License

TaleTrove is source-available. See [LICENSE](LICENSE) if present, or contact the author.

Third-party libraries:
- [Armoria](forge/armoria/LICENSE) by Azgaar — MIT
- [DiceBox](https://github.com/3d-dice/dice-box) by 3Ddice — MIT
- [Leaflet](https://leafletjs.com/) — BSD-2-Clause
- [SortableJS](https://sortablejs.github.io/Sortable/) — MIT
- [DOMPurify](https://github.com/cure53/DOMPurify) — Apache-2.0 / MPL-2.0
- [Marked](https://marked.js.org/) — MIT
