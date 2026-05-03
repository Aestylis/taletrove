# VERSIONING.md — Application Versioning & Release Rules

This document defines the versioning scheme, release process, and compatibility guarantees for TaleTrove.

---

## 1. Versioning Scheme (SemVer 2.0.0)

TaleTrove follows [Semantic Versioning 2.0.0](https://semver.org/): **MAJOR.MINOR.PATCH**

1.  **MAJOR** version: Incremented for incompatible UI overhauls or **Breaking Data Schema Changes** (e.g., changing the structure of `state.features` in a way that requires a complex migration).
2.  **MINOR** version: Incremented for new features, new blocks, or significant UI improvements that are backwards compatible.
3.  **PATCH** version: Incremented for backwards-compatible bug fixes, security patches, or performance optimizations.

Current Stage: **Alpha** (Versions denoted as `0.MINOR.PATCH-alpha`)

---

## 2. Data Compatibility & Migrations

Since TaleTrove is local-first (IndexedDB), versioning MUST protect user data.

- **Schema Versioning:** The `appVersion` is stored in the `worldState-meta` record in IndexedDB.
- **Migration Logic:** Any change to the state structure must be handled in `data.js` within `migrateState()`.
- **Pre-Migration Backup:** Before any Major or Minor upgrade that triggers a migration, the app should prompt the user to export a `.wbundle` backup.

---

## 3. Release Process

1.  **Update `data/news.json`**: Record the user-facing changelog.
2.  **Update `APP_VERSION` constant**: Update the version string in `worldbuilder.js`.
3.  **Update `manifest.json`**: Ensure the PWA manifest reflects the new version.
4.  **Git Tagging**: Tag the commit with `vMAJOR.MINOR.PATCH`.
5.  **Update `STATUS.md`**: Verify all "Completed Features" for the version are code-verified.

---

## 4. Changelog Standards (Keep a Changelog)

All releases must be documented in `CHANGELOG.md` (or integrated into `STATUS.md`) using these categories:

- **Added**: For new features.
- **Changed**: For changes in existing functionality.
- **Deprecated**: For soon-to-be-removed features.
- **Removed**: For now-removed features.
- **Fixed**: For any bug fixes.
- **Security**: In case of vulnerabilities.

---

## 5. Branching Strategy

- `main`: Stable production-ready code.
- `develop`: Ongoing feature integration.
- `feature/*`: Short-lived branches for specific tasks.
- `release/*`: Preparation branches for final testing before merging to `main`.

---

## 6. Breaking Change Policy

A "Breaking Change" is defined as:
- Any change that renders existing `.wbundle` files unimportable without a migration script.
- Removal of core UI elements that disrupt the "Map-First" workflow.
- Significant changes to the Markdown-extension syntax (wiki-links/dice).
