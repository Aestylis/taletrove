# TaleTrove UI/UX Overhaul Plan

> **Status:** In progress — Phase 0 started
> **Branch:** `feat/ui-overhaul`
> **Design target:** Linear / Raycast / Stripe aesthetic within TaleTrove's editorial identity

---

## Tooling

- **`/frontend-design:frontend-design`** — invoke for Phases 5, 6, 8 when generating new component visuals (empty states, article hero, hub modal, world card). Output must be vetted against TaleTrove constraints: vanilla JS only (no React/JSX/Tailwind), no inline event handlers, colors via CSS tokens, icons via CSS mask-image pattern.

---

## Design Intent

This plan upgrades the app toward a premium dark-tool feel while preserving what makes TaleTrove
distinctive: Cormorant Garamond editorial identity, three-pane spatial model, glassmorphism depth,
and 18-theme flexibility. Every change must survive all 18 themes — no hardcoded colors.

Phases are ordered by risk and dependency. Each phase is independently deployable.
Phases 0–4 are pure CSS. Phases 5–6 touch CSS + minor HTML/JS. Phase 7 requires JS.

---

## Phase 0 — Token Debt Audit

**Goal:** Eliminate hardcoded values before adding new ones. Zero visual change.

### Hardcoded border-radius to replace

| Selector | Current | Replace with |
|---|---|---|
| `select, button, input, textarea` (line ~1018) | `border-radius: 10px` | `var(--radius-xl)` |
| `.role-select` | `border-radius: 10px` | `var(--radius-lg)` |
| `.preview-wrap` | `border-radius: 10px` | `var(--radius-xl)` |
| `.markdown` | `border-radius: 10px` | `var(--radius-lg)` |
| `.edit-mode-indicator` | `border-radius: 20px` | `var(--radius-full)` |
| `#fogBrushSizeInput` | `border-radius: 4px` | `var(--radius-sm)` |
| `.overlay-menu-action` | `border-radius: 6px` | `var(--radius-md)` |
| `.ges-type-pill` | `border-radius: 999px` | `var(--radius-full)` |

### New tokens to add to `:root`

```css
--radius-2xl: 20px;           /* move here from below :root */
--line-height-body: 1.5;      /* currently hardcoded as 1.4 in body rule */
--line-height-article: 1.7;   /* for wiki/article content */
```

### Fix `transition: all` performance antipattern

```css
/* Remove from aside, .toolbar, .modal-content, .info-panel */
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

/* Replace with explicit properties */
transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            opacity  0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

**Risk:** Zero. **Files:** `worldbuilder.css` only.

---

## Phase 1 — Color Semantics

**Goal:** Make the two-accent system intentional and documented.

### Semantic contract

- `--accent-orange` = **interactive** — buttons, focus rings, active borders, links, switch active
- `--accent-magenta` = **state indicator** — active toolbar tool, visited links, "new" badges, overlay dots

### Changes

1. Add `--accent-magenta-rgb: 255, 62, 165` to `:root` + all 18 theme blocks
2. Add semantic alias tokens (no visual change):
   ```css
   --color-interactive:     var(--accent-orange);
   --color-interactive-rgb: var(--accent-orange-rgb);
   --color-state:           var(--accent-magenta);
   --color-state-rgb:       var(--accent-magenta-rgb);
   ```
3. Add orange opacity tiers (replace ad-hoc inline rgba throughout):
   ```css
   --accent-orange-06: rgba(var(--accent-orange-rgb), 0.06);
   --accent-orange-10: rgba(var(--accent-orange-rgb), 0.10);
   --accent-orange-16: rgba(var(--accent-orange-rgb), 0.16);
   ```

**Risk:** None — additive only. **Files:** `worldbuilder.css`.

---

## Phase 2 — Typography Scale

**Goal:** Fix form labels, body line-height, and make Cormorant Garamond dominant in article view.

### Form labels (currently 12px uppercase 0.12em tracked — too small, too loud)

```css
.form .form-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.02em;
  /* remove text-transform: uppercase */
}
```

Apply same fix to: `.section h3`, `.app-group-label`, `.fog-control-label`,
`.graph-filter-hdr`, `.ges-desc-label`.

**Keep uppercase on:** `.edit-mode-indicator` — intentional ALL-CAPS mode warning.

### Body line-height

```css
html, body { font: 14px/var(--line-height-body, 1.5) var(--font-body); }
```

### Article headings (Cormorant always in info panel)

```css
.info-panel .markdown h1,
.info-panel .markdown h2,
.info-panel .markdown h3 {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.info-panel .markdown h1 { font-size: 2rem;   line-height: 1.15; }
.info-panel .markdown h2 { font-size: 1.45rem; line-height: 1.2;  }
.info-panel .markdown h3 { font-size: 1.15rem; line-height: 1.3;  }
```

### Article title (peek / article mode hero)

```css
.article-title, .peek-title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
```

### Article body reading line-height

```css
.info-panel .markdown,
.article-body {
  line-height: var(--line-height-article, 1.7);
  font-size: 0.93rem;
}
```

**Risk:** Low-medium. Line-height shifts scroll positions — test panel tree rows for overlap.
**Files:** `worldbuilder.css`.

---

## Phase 3 — Interactive States

**Goal:** Fix toolbar hover conflict, shrink scrollbars, tighten focus rings.

### Toolbar button hover — resolve scale/M3 conflict

```css
/* Remove scale(1.25) — too aggressive */
.toolbar button:hover { color: var(--text); }
/* Keep M3 ::after opacity pattern — sole hover mechanism */
```

### Scrollbars — 10px → 6px

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { border: 1px solid var(--scrollbar-track); }
```

### Focus ring border-radius — match element radius

```css
input:focus-visible,
select:focus-visible,
textarea:focus-visible { border-radius: var(--radius-xl); }
```

### Settings toggle rows — add hover state

```css
.app-toggle-row {
  border-radius: var(--radius-md);
  margin: 0 -0.5rem;
  padding: 0.75rem 0.5rem;
  transition: background var(--ease-fast);
}
.app-toggle-row:hover {
  background: color-mix(in srgb, var(--text) 4%, transparent);
}
```

**Risk:** Low. **Files:** `worldbuilder.css`.

---

## Phase 4 — Spacing & Density

**Goal:** Add breathing room to forms, hub modal, and properties sheet.

### Form grid gap

```css
.form { gap: 0.6rem 0.75rem; }   /* was .4rem .6rem */
```

### Hub pane content padding

```css
.hub-pane { padding: 1.5rem 2rem; }   /* was ~1rem */
@media (max-width: 900px) {
  .hub-pane { padding: 1rem 1.25rem; }
}
```

### Properties sheet padding

```css
/* Inside .inspector or #propertiesSheet content area */
padding: 1.25rem;   /* was ~0.75rem */
```

### `.app-section-title` margin

```css
.app-section-title { margin: 0 0 0.35rem; }   /* was 0 0 0.2rem */
```

**Risk:** Low. Test hub modal theme grid for layout shifts after padding change.
**Files:** `worldbuilder.css`.

---

## Phase 5 — Component Polish

**Goal:** Chips/tags, empty states, and world card.

### Tags & chips — taller pill feel

```css
.tag {
  padding: 0.2rem 0.55rem;
  line-height: 1.4;
  background: color-mix(in srgb, var(--text) 6%, transparent);
  border-color: color-mix(in srgb, var(--text) 12%, transparent);
}
.chip { padding: 0.15rem 0.5rem; font-size: 10.5px; }
```

### Empty state icon — decorative, not informational

```css
.panel-empty-icon { opacity: 0.35; }
```

### Empty state heading — editorial serif

```css
.panel-empty-heading {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
}
```

### World card in hub

- Cormorant world name at `1.5rem`
- Creation date at `0.78rem var(--muted)`
- Hero image: `height: 160px; object-fit: cover; border-radius: var(--radius-xl)`
- Left accent border: `border-left: 3px solid var(--accent-orange)` (matches graph modal header motif)

**Risk:** Low-medium. Verify `color-mix` browser support. Check empty state font loads in all code paths.
**Files:** `worldbuilder.css`, possibly `panels.js`.

---

## Phase 6 — Info Panel Article View

**Goal:** Transform the info panel from "notes app" to "world atlas entry."

### Article hero layout

```
[Category chip]  [GM/Player badge]    ← top metadata bar
ARTICLE TITLE                         ← 2.2rem Cormorant, tight leading
─────────────────────────────────     ← 1px border
[pin] Location · [tag] · [tag]        ← 0.78rem muted metadata row
```

### Banner image — full-width hero

```css
.article-banner {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 0;   /* flush to panel edges */
  display: block;
}
/* gradient overlay on bottom third */
.article-banner-wrap::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 60%;
  background: linear-gradient(transparent, rgba(0,0,0,0.5));
  pointer-events: none;
}
```

### Article body prose

```css
.info-panel .markdown p          { margin: 0 0 1em; }
.info-panel .markdown ul,
.info-panel .markdown ol         { margin: 0 0 1em; padding-left: 1.4em; }
.info-panel .markdown li         { margin-bottom: 0.3em; }
.info-panel .markdown blockquote {
  border-left: 3px solid var(--accent-orange);
  padding-left: 1rem;
  color: var(--muted);
  font-style: italic;
}
```

### Peek mode content area padding

```css
body.peek-mode .info-panel-content {
  padding: 1.5rem 1.75rem;   /* was ~0.75rem */
}
```

**Risk:** Medium. Banner image may need HTML restructure in `panels.js`.
**Files:** `worldbuilder.css`, `panels.js`.

---

## Phase 7 — Responsive: Adaptive Collapse

**Goal:** Fix the `~1100px` viewport problem where both panels crush the map.

### CSS tokens

```css
--bp-compact: 1100px;
--bp-narrow:   768px;
```

### Panel width — `clamp()` instead of `min()`

```css
--atlas-panel-width: clamp(280px, 30vw, 360px);
--info-panel-width:  clamp(380px, 40vw, 540px);
```

### Adaptive collapse at < 1100px

```css
@media (max-width: 1100px) {
  body.both-panels-open #infoPanel {
    transform: translateX(100%);
  }
}
```

JS: in `ui.js`, toggle `body.both-panels-open` when both panels are open.

### Mobile (< 768px) — deferred roadmap item

At this breakpoint panels should overlay the map (slide over). Larger lift; document for future phase.

**Risk:** Medium-high. Requires JS change in `ui.js`.
**Files:** `worldbuilder.css`, `ui.js`.

---

## Phase 8 — Hub Modal Polish

**Goal:** Settings overlay feels as premium as the app itself.

### Nav rail width

```css
--nav-rail-width: 52px;   /* was 44px */
```

### Active nav rail item — VS Code-style left indicator

```css
.settings-nav-rail button.active {
  background: color-mix(in srgb, var(--accent-orange) 12%, transparent);
  color: var(--accent-orange);
  position: relative;
}
.settings-nav-rail button.active::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 20px;
  background: var(--accent-orange);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
```

### Nav rail separator

```css
.settings-nav-rail { border-right: 1px solid var(--border); }
```

### Theme grid card size

```css
.app-theme-grid { grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); }
```

### Pane section headings — editorial serif

```css
.hub-pane-section-heading {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 1.0rem;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.4rem;
  margin-bottom: 1rem;
}
```

**Risk:** Low. **Files:** `worldbuilder.css`.

---

## Execution Checklist

| Phase | Description | Risk | Status |
|---|---|---|---|
| 0 | Token debt — hardcoded values, `transition: all` | None | ✅ |
| 1 | Color semantics — accent tiers, rgb companion | None | ✅ |
| 2 | Typography scale — labels, line-height, Cormorant article | Low | ✅ |
| 3 | Interactive states — toolbar hover, scrollbars, focus | Low | ⬜ |
| 4 | Spacing & density — form gaps, hub padding | Low | ⬜ |
| 5 | Component polish — chips, empty states, world card | Low-Med | ⬜ |
| 6 | Info panel article view — hero, prose, banner, peek | Medium | ⬜ |
| 7 | Responsive — `clamp()` widths, adaptive collapse | Med-High | ⬜ |
| 8 | Hub modal polish — nav rail, active state, grid | Low | ⬜ |
