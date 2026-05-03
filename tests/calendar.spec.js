/**
 * Calendar-specific tests.
 * Covers month nav, Today button, and set-date popover.
 * Tests run with empty IDB — calendar shows empty state if no calendar data configured.
 */
import { test, expect } from '@playwright/test';
import { gotoApp, openModal } from './helpers.js';

test.describe('Calendar modal', () => {
  test('shows empty state when no calendar is configured', async ({ page }) => {
    await gotoApp(page);
    const modal = await openModal(page, 'calendarBtn', 'calendarModal');
    // With no donjonCalendar in settings, the empty state should be visible
    await expect(modal.locator('.empty-state-centered')).toBeVisible();
  });

  test.describe('with calendar data', () => {
    // Seed a minimal calendar into settings via IDB before each test
    test.beforeEach(async ({ page }) => {
      await gotoApp(page);
      await page.evaluate(() => {
        const cal = {
          name: 'Test Calendar',
          months: ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'],
          month_len: { January:31, February:28, March:31, April:30, May:31, June:30,
                       July:31, August:31, September:30, October:31, November:30, December:31 },
          weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          n_months: 12,
          week_len: 7,
          year_len: 365,
          first_day: 0,
          moons: [],
          lunar_cyc: {},
          lunar_shf: {},
        };
        // Write directly to the settings object and trigger a save
        window.state.settings.donjonCalendar = cal;
        window.state.settings.currentDate = { year: 100, month: 'January', day: 1 };
        window.markEntityDirty('meta');
        window.debouncedSave();
      });
    });

    test('month nav is rendered in header', async ({ page }) => {
      const modal = await openModal(page, 'calendarBtn', 'calendarModal');
      await expect(modal.locator('#calendarMonthNav')).toBeVisible();
      await expect(modal.locator('.cal-nav-month-select')).toBeVisible();
    });

    test('calendar grid renders week rows', async ({ page }) => {
      const modal = await openModal(page, 'calendarBtn', 'calendarModal');
      await expect(modal.locator('.calendar-week-row').first()).toBeVisible();
    });

    test('Today button opens set-date popover', async ({ page }) => {
      await openModal(page, 'calendarBtn', 'calendarModal');
      await page.click('#calendarJumpToday');
      await expect(page.locator('.cal-date-popover')).toBeVisible();
      // All three fields present
      await expect(page.locator('.cal-popover-label').filter({ hasText: 'Day' })).toBeVisible();
      await expect(page.locator('.cal-popover-label').filter({ hasText: 'Month' })).toBeVisible();
      await expect(page.locator('.cal-popover-label').filter({ hasText: 'Year' })).toBeVisible();
    });

    test('set-date popover dismisses on outside click', async ({ page }) => {
      await openModal(page, 'calendarBtn', 'calendarModal');
      await page.click('#calendarJumpToday');
      await expect(page.locator('.cal-date-popover')).toBeVisible();
      // Click outside the popover
      await page.mouse.click(10, 10);
      await expect(page.locator('.cal-date-popover')).toBeHidden();
    });

    test('prev/next month buttons navigate', async ({ page }) => {
      const modal = await openModal(page, 'calendarBtn', 'calendarModal');
      const monthSelect = modal.locator('.cal-nav-month-select');
      const before = await monthSelect.inputValue();
      await modal.locator('button[title="Next month"]').click();
      const after = await monthSelect.inputValue();
      expect(after).not.toBe(before);
    });
  });
});
