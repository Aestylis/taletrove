// mobile-tutorial.js - Interactive do-along tutorial for the compact shell (<600px).
// Routed from startTutorial() in tutorial.js; desktop tours never enter this file.
// Try-it steps advance by observing the DOM (MutationObserver + capture-phase
// listeners), so no other app file carries tutorial hooks.

let _mtSteps = [];
let _mtIndex = -1;
let _mtAbort = null; // tears down the active step's listeners/observers
let _mtRelayout = null; // viewport-change handler — spotlight/ripple track the target

const MT_FIRST_RUN_STEPS = [
  {
    title: 'Welcome to TaleTrove',
    text: 'TaleTrove is a local-first world building tool. This short tour is hands-on: you will make your first pin as you go. Tap the close button any time to skip.',
    target: null, advanceOn: null,
  },
  {
    title: 'Your map',
    text: 'Every world starts with a map. You can load an image from this card or from the map tools whenever you are ready. First, let us put something on it.',
    target: '#mapEmptyState', advanceOn: null,
  },
  {
    title: 'Try it: long-press the map',
    text: 'Press and hold anywhere on the map for half a second. A creation menu blooms under your finger.',
    target: '#map',
    advanceOn: { domAppears: '#featureRadialMenu' },
  },
  {
    title: 'Pick a pin type',
    // No spotlight target: #featureRadialMenu is a 0x0 anchor and the radial
    // brings its own backdrop; a scrim here would dim the buttons being tapped.
    text: 'Tap <b>Add Pin</b>, then choose <b>Person</b>, <b>Place</b>, or <b>Thing</b>. Your first pin drops right where you pressed.',
    target: null,
    advanceOn: { domAppears: '.custom-marker-wrapper' },
  },
  {
    title: 'Try it: open your pin',
    text: 'Tap the pin you just made. A popup shows its name and a button that opens the full article view.',
    target: '.custom-marker-wrapper',
    advanceOn: { domAppears: '.leaflet-popup' },
    onEnter: () => { window.exitPeekMode?.(); },
  },
  {
    title: 'Try it: the World tab',
    text: 'Tap <b>World</b> in the bottom bar. Everything you create lives there: maps, pins, lore, and session notes in one tree.',
    target: '[data-mnav="world"]',
    advanceOn: { clickOn: '[data-mnav="world"]' },
    onEnter: () => { map?.closePopup?.(); },
  },
  {
    title: 'Map tools and search',
    text: 'The pencil button reveals the drawing toolbar: areas, lines, labels, and fog of war. The search bar up top finds anything in your world.',
    target: '#mobileToolsToggle', advanceOn: null,
    onEnter: () => { document.querySelector('[data-mnav="map"]')?.click(); },
  },
  {
    title: 'You are all set',
    text: 'You made your first pin. Keep going: long-press to create, tap to read, and use the World tab to stay organized. Replay this tour any time from Help in the More sheet.',
    target: null, advanceOn: null,
  },
];
const MT_DEMO_STEPS = [
  {
    title: 'Welcome to Aethermoor',
    text: 'This is a sample world built with TaleTrove. The tour is hands-on and nothing you do here is permanent. Tap the close button any time to skip.',
    target: null, advanceOn: null,
  },
  {
    title: 'Try it: tap a pin',
    text: 'Tap any pin on the map. A popup shows a quick summary of that place or person.',
    target: '.leaflet-marker-icon',
    advanceOn: { domAppears: '.leaflet-popup' },
  },
  {
    title: 'Try it: open the article',
    text: 'Tap <b>Open Article</b> in the popup. The full wiki view takes over the screen; the back arrow returns you to the map.',
    target: '.map-popup-actions button',
    advanceOn: { bodyClass: 'article-mode' },
  },
  {
    title: 'Try it: long-press to create',
    text: 'Press and hold anywhere on the map. This creation menu is how Aethermoor was built: pins, areas, lines, labels, and lore.',
    target: '#map',
    advanceOn: { domAppears: '#featureRadialMenu' },
    onEnter: () => { window.exitArticleMode?.(); },
  },
  {
    title: 'Try it: the World tab',
    text: 'Tap <b>World</b> in the bottom bar to browse everything in Aethermoor: maps, characters, factions, and history in one tree.',
    target: '[data-mnav="world"]',
    advanceOn: { clickOn: '[data-mnav="world"]' },
  },
  {
    title: 'Global search',
    text: 'Search finds anything instantly, including text inside articles. Try <b>Ashvane</b> later to meet the ruling family.',
    target: '#globalSearchInput', advanceOn: null,
    onEnter: () => { document.querySelector('[data-mnav="map"]')?.click(); },
  },
  {
    title: 'More views',
    text: 'The More sheet opens the Timeline, Relational Graph, Calendar, and Family Tree, all pre-populated with Aethermoor lore.',
    target: '[data-mnav="more"]', advanceOn: null,
  },
  {
    title: 'Your turn',
    text: 'You have seen the sample world. Build your own: load a map image, long-press to drop pins, and start writing. Your data stays on your device. Replay this tour any time from Help.',
    target: null, advanceOn: null,
  },
];

function startMobileTutorial(isDemoMode = false) {
  _mtSteps = isDemoMode ? MT_DEMO_STEPS : MT_FIRST_RUN_STEPS;
  _mtBuildShell();
  _mtGoTo(0);
}
window.startMobileTutorial = startMobileTutorial;

function _mtBuildShell() {
  const existing = document.getElementById('mobileTutorialSheet');
  if (existing) {
    if (existing.classList.contains('is-open')) return;
    // A just-closed sheet is still fading out (removed after 300ms) — clear it
    // immediately so a fresh start does not race the delayed removal.
    ['mobileTutorialSheet', 'mobileTutorialScrim', 'mobileTutorialRipple'].forEach((id) =>
      document.getElementById(id)?.remove());
  }

  const scrim = el('div', { id: 'mobileTutorialScrim' }, [
    el('div', { id: 'mobileTutorialSpotlight' }),
  ]);
  const ripple = el('div', { id: 'mobileTutorialRipple' });

  const closeBtn = el('button', { class: 'mt-close', 'aria-label': 'End tutorial' });
  getIconHTML('x', 'currentColor').then((html) => { closeBtn.innerHTML = html; });

  const sheet = el('div', { id: 'mobileTutorialSheet', role: 'dialog', 'aria-label': 'Tutorial' }, [
    el('div', { class: 'mt-dots' }),
    closeBtn,
    el('div', { class: 'mt-title' }),
    el('div', { class: 'mt-text' }),
    el('div', { class: 'mt-actions' }, [
      el('button', { class: 'mt-skip-step hidden', text: 'Skip this step' }),
      el('button', { class: 'mt-next primary', text: 'Next' }),
    ]),
  ]);

  document.body.append(scrim, ripple, sheet);

  // Spotlight and ripple are measured from a one-shot getBoundingClientRect — rotation,
  // collapsing browser chrome, or the on-screen keyboard would otherwise leave the
  // "tap here" cutout pointing at empty space until the next step. Re-measure on any
  // viewport change while a step is active (removed in _mtEnd).
  _mtRelayout = () => {
    if (_mtIndex >= 0 && _mtSteps[_mtIndex]) {
      requestAnimationFrame(() => _mtSpotlight(_mtSteps[_mtIndex]));
    }
  };
  window.addEventListener('resize', _mtRelayout);
  window.addEventListener('orientationchange', _mtRelayout);
  window.visualViewport?.addEventListener('resize', _mtRelayout);

  closeBtn.addEventListener('click', () => _mtEnd());
  sheet.querySelector('.mt-next').addEventListener('click', () => _mtGoTo(_mtIndex + 1));
  sheet.querySelector('.mt-skip-step').addEventListener('click', () => _mtGoTo(_mtIndex + 1));
  requestAnimationFrame(() => sheet.classList.add('is-open'));
}

function _mtGoTo(index) {
  if (_mtAbort) { _mtAbort.abort(); _mtAbort = null; }
  if (index >= _mtSteps.length) { _mtEnd(); return; }

  const step = _mtSteps[index];
  // Never strand the tour on a missing spotlight target (e.g. the empty-state
  // card is gone when the tour is replayed on a populated world).
  if (step.target && !document.querySelector(step.target)) {
    console.warn(`[mobile-tutorial] target missing, skipping step: ${step.target}`);
    _mtGoTo(index + 1);
    return;
  }
  _mtIndex = index;
  if (step.onEnter) {
    try { step.onEnter(); } catch (e) { console.warn('[mobile-tutorial] onEnter failed:', e); }
  }

  const sheet = document.getElementById('mobileTutorialSheet');
  sheet.querySelector('.mt-title').textContent = step.title || '';
  sheet.querySelector('.mt-text').innerHTML = step.text; // authored constants only
  sheet.querySelector('.mt-dots').innerHTML = _mtSteps
    .map((_, i) => `<span class="mt-dot${i === index ? ' is-active' : ''}"></span>`)
    .join('');

  const isTryIt = !!step.advanceOn;
  const nextBtn = sheet.querySelector('.mt-next');
  nextBtn.classList.toggle('hidden', isTryIt);
  nextBtn.textContent = index === _mtSteps.length - 1 ? 'Finish' : 'Next';
  sheet.querySelector('.mt-skip-step').classList.toggle('hidden', !isTryIt);

  _mtSpotlight(step);
  if (isTryIt) _mtBindAdvance(step);
}

function _mtSpotlight(step) {
  const scrim = document.getElementById('mobileTutorialScrim');
  const spot = document.getElementById('mobileTutorialSpotlight');
  const ripple = document.getElementById('mobileTutorialRipple');
  const target = step.target ? document.querySelector(step.target) : null;

  if (!target) {
    scrim.classList.remove('is-visible');
    ripple.classList.remove('is-visible');
    return;
  }
  const r = target.getBoundingClientRect();
  const pad = 8;
  spot.style.left = `${r.left - pad}px`;
  spot.style.top = `${r.top - pad}px`;
  spot.style.width = `${r.width + pad * 2}px`;
  spot.style.height = `${r.height + pad * 2}px`;
  scrim.classList.add('is-visible');

  if (step.advanceOn) {
    ripple.style.left = `${r.left + r.width / 2}px`;
    ripple.style.top = `${r.top + r.height / 2}px`;
    ripple.classList.add('is-visible');
  } else {
    ripple.classList.remove('is-visible');
  }
}

function _mtBindAdvance(step) {
  _mtAbort = new AbortController();
  const sig = _mtAbort.signal;
  // 350ms grace lets the surface the user just triggered settle before the
  // sheet re-renders under their finger.
  const adv = () => { if (!sig.aborted) setTimeout(() => { if (!sig.aborted) _mtGoTo(_mtIndex + 1); }, 350); };
  const a = step.advanceOn;

  if (a.clickOn) {
    document.addEventListener('click', (e) => {
      if (e.target.closest(a.clickOn)) adv();
    }, { capture: true, signal: sig });
  } else if (a.domAppears) {
    // Advance when a NEW match appears (count increase), so a replayed tour on
    // a world that already has pins/popups does not auto-advance instantly.
    const initial = document.querySelectorAll(a.domAppears).length;
    const mo = new MutationObserver(() => {
      if (document.querySelectorAll(a.domAppears).length > initial) { mo.disconnect(); adv(); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    sig.addEventListener('abort', () => mo.disconnect());
  } else if (a.bodyClass) {
    if (document.body.classList.contains(a.bodyClass)) { adv(); return; }
    const mo = new MutationObserver(() => {
      if (document.body.classList.contains(a.bodyClass)) { mo.disconnect(); adv(); }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    sig.addEventListener('abort', () => mo.disconnect());
  }
}

function _mtEnd() {
  if (_mtAbort) { _mtAbort.abort(); _mtAbort = null; }
  if (_mtRelayout) {
    window.removeEventListener('resize', _mtRelayout);
    window.removeEventListener('orientationchange', _mtRelayout);
    window.visualViewport?.removeEventListener('resize', _mtRelayout);
    _mtRelayout = null;
  }
  _mtIndex = -1;
  saveLS('hasCompletedTutorial', true);
  const sheet = document.getElementById('mobileTutorialSheet');
  if (sheet) sheet.classList.remove('is-open');
  document.getElementById('mobileTutorialScrim')?.classList.remove('is-visible');
  document.getElementById('mobileTutorialRipple')?.classList.remove('is-visible');
  setTimeout(() => {
    ['mobileTutorialSheet', 'mobileTutorialScrim', 'mobileTutorialRipple'].forEach((id) =>
      document.getElementById(id)?.remove());
  }, 300);
}
