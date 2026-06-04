/**
 * Modal open/close smoke tests.
 * Verifies each modal opens on button click and closes correctly.
 *
 * Notes:
 * - Calendar and Timeline are static HTML modals — respond to Escape via js-modal-overlay system
 * - Relational Graph and Family Tree are dynamically created — closed via their own × button
 * - Settings hub is opened via the brand logo (#brandLogo)
 */
import { test, expect } from '@playwright/test';
import { gotoApp, openModal, closeWithEscape, closeWithButton } from './helpers.js';

// Modals that use the standard js-modal-overlay system (Escape works, .hidden toggles visibility).
// NOTE: Help is an is-side-sheet modal — it stays display:flex always and toggles `.is-open`
// instead of `.hidden`, so it has its own describe block below (visibility assertions don't apply).
const STANDARD_MODALS = [
  { btn: 'calendarBtn',  modal: 'calendarModal',  label: 'Calendar' },
  { btn: 'timelineBtn',  modal: 'timelineModal',   label: 'Global Timeline' },
];

// Modals created dynamically by their own JS modules (close via × button only)
const DYNAMIC_MODALS = [
  { btn: 'relationalGraphBtn', modal: 'relationalGraphModal', label: 'Relational Graph' },
  { btn: 'familyTreeBtn',      modal: 'familyTreeModal',      label: 'Family Tree' },
];

for (const { btn, modal, label } of STANDARD_MODALS) {
  test.describe(`${label} modal`, () => {
    test('opens on button click', async ({ page }) => {
      await gotoApp(page);
      const modalEl = await openModal(page, btn, modal);
      await expect(modalEl).toBeVisible();
    });

    test('closes with Escape', async ({ page }) => {
      await gotoApp(page);
      const modalEl = await openModal(page, btn, modal);
      await closeWithEscape(page, modalEl);
      await expect(modalEl).toBeHidden();
    });

    test('closes with × button', async ({ page }) => {
      await gotoApp(page);
      const modalEl = await openModal(page, btn, modal);
      await closeWithButton(page, modalEl);
      await expect(modalEl).toBeHidden();
    });
  });
}

for (const { btn, modal, label } of DYNAMIC_MODALS) {
  test.describe(`${label} modal`, () => {
    test('opens on button click', async ({ page }) => {
      await gotoApp(page);
      const modalEl = await openModal(page, btn, modal);
      await expect(modalEl).toBeVisible();
    });

    test('closes with × button', async ({ page }) => {
      await gotoApp(page);
      const modalEl = await openModal(page, btn, modal);
      await closeWithButton(page, modalEl);
      await expect(modalEl).toBeHidden();
    });
  });
}

// Help is an is-side-sheet modal: it's always display:flex and toggles `.is-open` (not `.hidden`),
// so open/closed state is the presence of that class, not visibility.
test.describe('Help side-sheet', () => {
  async function openHelp(page) {
    const btn = page.locator('#helpBtn');
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.dispatchEvent('click');
    await expect(page.locator('#helpModal')).toHaveClass(/is-open/);
  }

  test('opens on button click', async ({ page }) => {
    await gotoApp(page);
    await openHelp(page);
  });

  test('closes with Escape', async ({ page }) => {
    await gotoApp(page);
    await openHelp(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#helpModal')).not.toHaveClass(/is-open/);
  });

  test('closes with × button', async ({ page }) => {
    await gotoApp(page);
    await openHelp(page);
    await page.locator('#helpModal .js-modal-close').click();
    await expect(page.locator('#helpModal')).not.toHaveClass(/is-open/);
  });
});

test.describe('Settings hub', () => {
  test('opens on brand logo click', async ({ page }) => {
    await gotoApp(page);
    await page.click('#brandLogo');
    await expect(page.locator('#projectActionsModal')).toBeVisible();
  });

  test('closes with Escape', async ({ page }) => {
    await gotoApp(page);
    await page.click('#brandLogo');
    const modal = page.locator('#projectActionsModal');
    await modal.waitFor({ state: 'visible' });
    await closeWithEscape(page, modal);
    await expect(modal).toBeHidden();
  });
});
