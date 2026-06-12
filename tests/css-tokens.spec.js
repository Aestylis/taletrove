/**
 * CSS token definition guard — every var(--token) referenced in
 * forge/worldbuilder.css, forge/*.js, or forge/index.html must have a
 * definition (CSS declaration, inline-style declaration, or JS setProperty).
 * An undefined name is invalid at computed-value time and the declaration
 * silently dies (the P0.1 phantom-token bug class).
 *
 * Static check — no browser needed.
 */
const { test, expect } = require('@playwright/test');
const { findMissingTokens } = require('../scripts/check-css-tokens.js');

test('every var(--token) reference has a definition', () => {
  expect(findMissingTokens()).toEqual([]);
});
