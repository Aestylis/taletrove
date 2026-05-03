// capture-dice-gif.js — Captures dice roll animation and builds an animated GIF
const { chromium } = require('@playwright/test');
const GIFEncoder = require('gif-encoder-2');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '../guides/img/dnd-dice-roll.gif');
const FRAME_DELAY = 80;      // ms between frames in GIF
const CAPTURE_INTERVAL = 100; // ms between screenshots
const CAPTURE_DURATION = 3500;
// Output at half resolution to keep file size manageable
const SCALE = 0.5;

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Patch dice-roller.js to disable offscreen rendering so Playwright can capture the canvas
  await page.route('**/dice-roller.js**', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('offscreen: true', 'offscreen: false');
    await route.fulfill({ response, body });
  });

  await page.goto('http://localhost:8000/forge/');
  await page.waitForTimeout(3000); // extra time for DiceBox + Babylon.js to init

  // Dismiss any overlays
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay, .tutorial-overlay, [class*="tutorial"], [id*="tutorial"]')
      .forEach(m => m.remove());
    localStorage.setItem('tt-tutorial-seen', 'true');
  });
  await page.waitForTimeout(300);

  // Inject Aldric entry directly into state (fresh context has empty IndexedDB)
  const aldricEntry = JSON.parse(fs.readFileSync(path.join(__dirname, 'aldric-entry.json'), 'utf8'));
  await page.evaluate((entry) => {
    // Replace or add the entry
    const idx = state.encyclopedia.findIndex(e => e.id === entry.id);
    if (idx >= 0) state.encyclopedia[idx] = entry;
    else state.encyclopedia.push(entry);

    // Hide left panel
    document.querySelector('[aria-label="Hide Atlas Panel"]')?.click();

    // Select entry — triggers panel to open and render blocks
    selectEncyclopediaEntry(entry.id);
  }, aldricEntry);

  await page.waitForTimeout(600);

  // Force the panel into view by overriding its CSS
  await page.evaluate(() => {
    const panel = document.getElementById('infoPanel');
    if (!panel) return;
    panel.classList.add('is-visible');
    // Override via style attribute directly
    panel.style.setProperty('right', '0px', 'important');
    panel.style.setProperty('transition', 'none', 'important');
  });

  await page.waitForTimeout(400);

  // Scroll to show the dice block
  await page.evaluate(() => {
    const blocks = document.querySelectorAll('.canvas-block');
    blocks[blocks.length - 1]?.scrollIntoView({ behavior: 'instant', block: 'center' });
  });

  await page.waitForTimeout(300);

  // Verify panel position
  const panelX = await page.evaluate(() => {
    return document.getElementById('infoPanel')?.getBoundingClientRect().x;
  });
  console.log('Panel x:', panelX);

  // Capture frames — full viewport (captures panel + dice canvas overlay)
  const W = Math.round(1440 * SCALE), H = Math.round(900 * SCALE);
  const frames = [];

  const captureFrame = async () => {
    const buf = await page.screenshot({ type: 'png' });
    frames.push(buf);
  };

  // A few "before" frames
  for (let i = 0; i < 3; i++) {
    await captureFrame();
    await page.waitForTimeout(80);
  }

  // Click the dice notation
  await page.evaluate(() => {
    const span = document.querySelector('.dice-notation');
    if (span) {
      span.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }
  });
  console.log('Clicked dice, waiting for animation to start...');
  // Give Babylon.js a moment to start rendering before we begin capturing
  await page.waitForTimeout(300);

  // Capture during animation
  const start = Date.now();
  while (Date.now() - start < CAPTURE_DURATION) {
    await captureFrame();
    await page.waitForTimeout(CAPTURE_INTERVAL);
  }

  // Hold last frame
  const lastFrame = frames[frames.length - 1];
  for (let i = 0; i < 6; i++) frames.push(lastFrame);

  console.log(`Captured ${frames.length} frames. Building GIF (${W}x${H})...`);
  await browser.close();

  // Build GIF using gif-encoder-2 (write-based API, not stream-based)
  const encoder = new GIFEncoder(W, H, 'neuquant', true, frames.length);
  encoder.setDelay(FRAME_DELAY);
  encoder.setRepeat(0);
  encoder.setQuality(10);
  encoder.start();

  const cvs = createCanvas(W, H);
  const ctx = cvs.getContext('2d');

  for (let i = 0; i < frames.length; i++) {
    const img = await loadImage(frames[i]);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, 1440, 900, 0, 0, W, H);
    encoder.addFrame(ctx);
    if (i % 5 === 0) process.stdout.write(`\rEncoding ${i+1}/${frames.length}`);
  }

  encoder.finish();
  const buffer = encoder.out.getData();
  fs.writeFileSync(OUT_PATH, buffer);

  console.log(`\nSaved: ${OUT_PATH} (${Math.round(buffer.length / 1024)}KB)`);
})();
