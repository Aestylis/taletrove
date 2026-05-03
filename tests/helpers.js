/**
 * Shared helpers for TaleTrove Playwright tests.
 */

/** Navigate to the app and wait for it to fully boot, dismissing first-run overlays. */
export async function gotoApp(page) {
  await page.goto('/forge/');
  await page.waitForSelector('.header-controls', { state: 'visible' });

  // Dismiss welcome modal if present (first run with empty IDB)
  const welcomeSkip = page.locator('#welcomeSkipBtn');
  if (await welcomeSkip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await welcomeSkip.click();
  }

  // Dismiss tutorial overlay if present
  const tutorialClose = page.locator('#tutorialCloseBtn');
  if (await tutorialClose.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tutorialClose.click();
    await page.locator('#tutorialOverlay').waitFor({ state: 'hidden' });
  }
}

/**
 * Open a modal by clicking its trigger button.
 * Handles both static modals (in HTML) and dynamically created ones (relational graph, family tree).
 * Returns a locator for the modal element.
 */
export async function openModal(page, btnId, modalId) {
  await page.click(`#${btnId}`);
  // waitForSelector works for both pre-existing and dynamically created elements
  await page.waitForSelector(`#${modalId}`, { state: 'visible' });
  return page.locator(`#${modalId}`);
}

/** Close the focused modal with Escape and assert it's gone. */
export async function closeWithEscape(page, modalLocator) {
  await page.keyboard.press('Escape');
  await modalLocator.waitFor({ state: 'hidden' });
}

/** Close a modal via its × / close button. */
export async function closeWithButton(page, modalLocator) {
  // Try graph-close-btn first (fullscreen modals), then generic js-modal-close
  const closeBtn = modalLocator.locator('.graph-close-btn, .js-modal-close, .tutorial-close-btn').first();
  await closeBtn.click();
  await modalLocator.waitFor({ state: 'hidden' });
}
