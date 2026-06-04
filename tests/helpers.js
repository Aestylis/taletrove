/**
 * Shared helpers for TaleTrove Playwright tests.
 */

/**
 * Click a dismiss button if it appears within `timeout`, then wait for its overlay to hide.
 * Uses click() (which auto-waits for the element to appear and become actionable) so it handles
 * first-run modals that render asynchronously after boot. Silently no-ops if absent.
 */
async function dismissIfPresent(page, btnSelector, overlaySelector, timeout = 2500) {
  try {
    await page.locator(btnSelector).click({ timeout });
    if (overlaySelector) {
      await page.locator(overlaySelector).waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
  } catch {
    /* button never appeared — nothing to dismiss */
  }
}

/** Navigate to the app and wait for it to fully boot, dismissing first-run overlays. */
export async function gotoApp(page) {
  await page.goto('/forge/');
  await page.waitForSelector('.header-controls', { state: 'visible' });

  // First-run on empty IDB shows the sample-world modal — dismiss via "Start Fresh".
  await dismissIfPresent(page, '#startFreshBtn', '#sampleWorldModal');
  // Welcome modal (if shown) — "Skip for now".
  await dismissIfPresent(page, '#welcomeSkipBtn', '#welcomeModal');
  // Tutorial overlay (if shown).
  await dismissIfPresent(page, '#tutorialCloseBtn', '#tutorialOverlay');
}

/**
 * Open a modal by clicking its trigger button.
 * Handles both static modals (in HTML) and dynamically created ones (relational graph, family tree).
 * Returns a locator for the modal element.
 */
export async function openModal(page, btnId, modalId) {
  const btn = page.locator(`#${btnId}`);
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  // The vertical nav rail clips lower buttons below the viewport and does not scroll them into
  // view, so a real click() reports "outside of the viewport". Dispatch the click directly to the
  // button — these are wiring smoke tests, and the handlers are bound via addEventListener('click').
  await btn.dispatchEvent('click');
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
