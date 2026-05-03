# Contributing to TaleTrove

I'm actively looking for people who want to help build TaleTrove into something great. If you're a GM, worldbuilder, or developer who's frustrated with the current tooling landscape and wants something better — I'd love to work with you.

## What I'm looking for

- **Frontend developers** — vanilla JS, CSS, UX. No framework required; the whole app runs without a bundler.
- **TTRPG players and GMs** — playtesting, feature ideas, bug reports. You don't need to write code to contribute meaningfully.
- **Designers** — the UI is functional but there's always room for polish. Icons, layouts, accessibility improvements.
- **Writers** — documentation, onboarding copy, tutorials.

## Getting started

```bash
git clone https://github.com/Aestylis/taletrove.git
cd taletrove
python -m http.server   # or: npx serve
```

Open `http://localhost:8000/forge/`. That's it — no install step, no build step.

All source files are under `forge/`. The entry point is `forge/index.html`. Read `forge/STATUS.md` for the current backlog and known issues.

## How to contribute

1. Open an issue first for anything non-trivial — I'd rather align on direction before you spend time on it.
2. Fork the repo, make your changes on a feature branch.
3. Test in Chrome (the app uses IndexedDB and File System Access API — Chrome gives the fullest support).
4. Open a PR with a clear description of what changed and why.

There are no strict PR templates or checklists right now. Just write clearly and I'll work with you.

## Ground rules

- Keep the zero-dependency, no-bundler philosophy. The app should always run with a static file server.
- All data stays local by default. Features that require a backend need a very strong reason.
- Follow the existing CSS token system — no hardcoded colors.
- No native `alert()` / `confirm()` — use the modal helpers.

## Get in touch

Open a GitHub issue or Discussion. I check regularly and I'll actually respond.
