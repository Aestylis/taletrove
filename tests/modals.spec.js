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

// Modals that use the standard js-modal-overlay system (Escape works)
const STANDARD_MODALS = [
  { btn: 'calendarBtn',  modal: 'calendarModal',  label: 'Calendar' },
  { btn: 'timelineBtn',  modal: 'timelineModal',   label: 'Global Timeline' },
  { btn: 'helpBtn',      modal: 'helpModal',        label: 'Help' },
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
