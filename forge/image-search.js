// Provider abstraction: window.IMAGE_SEARCH_PROVIDERS is a map of provider id
// → { id, label, description, enabled, search(query, opts) }.
// Each provider returns a normalized result shape so the modal renderer
// stays source-agnostic.
//
// Public entry point: window.openImageSearchModal({ onPick, providerId, title }).
// `onPick(blob, meta)` is called when the user inserts a result. Different
// callers (Assets panel, image-block, hero-image picker) supply different
// onPick implementations — the modal itself doesn't know what happens after.
//
// Attribution: each result carries license/author/sourceUrl; consumers store
// this in state.assetMeta keyed by IDB asset key, so Commons-sourced assets
// retain their CC-BY attribution wherever they're surfaced.

// {
//   id: string,                    // unique within provider (URL or page id)
//   title: string,                 // human-readable title
//   thumbUrl: string,              // ~300px wide preview
//   fullUrl: string,               // full-resolution source
//   mime: string,                  // 'image/jpeg' etc.
//   width: number,                 // full-res dimensions (best-effort)
//   height: number,
//   author: string,                // may contain inline HTML — sanitized at render
//   license: string,               // machine id, e.g. 'cc-by-sa-4.0'
//   licenseLabel: string,          // human label, e.g. 'CC BY-SA 4.0'
//   licenseUrl: string,            // link to the license deed (best-effort)
//   sourceUrl: string,             // canonical page on the provider site
//   description: string,           // may contain inline HTML — sanitized at render
//   provider: string,              // provider id ('wikimedia')
//   providerLabel: string          // 'Wikimedia Commons'
// }

const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

// MediaWiki extmetadata License values map to a known short label + deed URL.
// Falls through to the LicenseShortName the API returns when not in this list.
const LICENSE_LABELS = {
  'cc0':            { label: 'CC0',            url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'pd':             { label: 'Public Domain',  url: 'https://en.wikipedia.org/wiki/Public_domain' },
  'cc-by-1.0':      { label: 'CC BY 1.0',      url: 'https://creativecommons.org/licenses/by/1.0/' },
  'cc-by-2.0':      { label: 'CC BY 2.0',      url: 'https://creativecommons.org/licenses/by/2.0/' },
  'cc-by-2.5':      { label: 'CC BY 2.5',      url: 'https://creativecommons.org/licenses/by/2.5/' },
  'cc-by-3.0':      { label: 'CC BY 3.0',      url: 'https://creativecommons.org/licenses/by/3.0/' },
  'cc-by-4.0':      { label: 'CC BY 4.0',      url: 'https://creativecommons.org/licenses/by/4.0/' },
  'cc-by-sa-1.0':   { label: 'CC BY-SA 1.0',   url: 'https://creativecommons.org/licenses/by-sa/1.0/' },
  'cc-by-sa-2.0':   { label: 'CC BY-SA 2.0',   url: 'https://creativecommons.org/licenses/by-sa/2.0/' },
  'cc-by-sa-2.5':   { label: 'CC BY-SA 2.5',   url: 'https://creativecommons.org/licenses/by-sa/2.5/' },
  'cc-by-sa-3.0':   { label: 'CC BY-SA 3.0',   url: 'https://creativecommons.org/licenses/by-sa/3.0/' },
  'cc-by-sa-4.0':   { label: 'CC BY-SA 4.0',   url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
};

function normalizeLicense(rawId, rawLabel) {
  const id = (rawId || '').toLowerCase().trim();
  if (LICENSE_LABELS[id]) {
    return { license: id, licenseLabel: LICENSE_LABELS[id].label, licenseUrl: LICENSE_LABELS[id].url };
  }
  return { license: id || 'unknown', licenseLabel: rawLabel || 'Unknown license', licenseUrl: '' };
}

function stripHtml(s) {
  if (!s) return '';
  // Use a detached element so untrusted HTML never enters the live DOM.
  const tmp = document.createElement('div');
  tmp.innerHTML = s;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function commonsTitleToFilename(title) {
  // "File:Castle Bran 2007.jpg" → "Castle Bran 2007"
  return (title || '').replace(/^File:/, '').replace(/\.[^.]+$/, '');
}

async function searchWikimedia(query, { limit = 24, offset = 0 } = {}) {
  if (!query || !query.trim()) return { results: [], hasMore: false };

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',                       // CORS for anonymous browsers
    generator: 'search',
    gsrsearch: query.trim(),
    gsrnamespace: '6',                 // File:
    gsrlimit: String(limit),
    gsroffset: String(offset),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|user|mime|size',
    iiurlwidth: '320',
  });

  const url = `${WIKIMEDIA_API}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikimedia search HTTP ${res.status}`);
  const data = await res.json();

  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  // Sort by the index field MediaWiki provides — the API returns pages in arbitrary key order.
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));

  const results = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    if (!info.mime || !info.mime.startsWith('image/')) continue;

    const meta = info.extmetadata || {};
    const rawLicenseId = meta.LicenseShortName?.value || meta.License?.value || '';
    const licenseId = (meta.License?.value || rawLicenseId).toLowerCase();
    const lic = normalizeLicense(licenseId, meta.LicenseShortName?.value);

    results.push({
      id: page.pageid ? `wm-${page.pageid}` : info.url,
      title: stripHtml(meta.ObjectName?.value) || commonsTitleToFilename(page.title),
      thumbUrl: info.thumburl || info.url,
      fullUrl: info.url,
      mime: info.mime,
      width: info.width || 0,
      height: info.height || 0,
      author: stripHtml(meta.Artist?.value) || info.user || 'Unknown',
      license: lic.license,
      licenseLabel: lic.licenseLabel,
      licenseUrl: lic.licenseUrl,
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      description: stripHtml(meta.ImageDescription?.value),
      provider: 'wikimedia',
      providerLabel: 'Wikimedia Commons',
    });
  }

  const hasMore = !!data?.continue?.gsroffset;
  return { results, hasMore, nextOffset: data?.continue?.gsroffset };
}

window.IMAGE_SEARCH_PROVIDERS = {
  wikimedia: {
    id: 'wikimedia',
    label: 'Wikimedia Commons',
    description: 'CC-licensed images, no API key required',
    enabled: true,
    search: searchWikimedia,
  },
  // Follow-ups (see STATUS.md backlog):
  //   pexels:   { ..., search: searchPexels   }, // free API
  //   pixabay:  { ..., search: searchPixabay  }, // free API
  //   unsplash: { ..., search: searchUnsplash }, // requires API key
};

let _activeImageSearch = null; // tracks the in-flight search to cancel stale renders

function renderProviderTabs(container, currentId, onSelect) {
  container.innerHTML = '';
  const providers = Object.values(window.IMAGE_SEARCH_PROVIDERS);
  for (const p of providers) {
    const tab = el('button', {
      class: 'image-search-provider-tab' + (p.id === currentId ? ' active' : '') + (!p.enabled ? ' disabled' : ''),
      type: 'button',
      title: p.description || p.label,
      ...(p.enabled ? {} : { disabled: true }),
    }, [p.label]);
    if (p.enabled) tab.addEventListener('click', () => onSelect(p.id));
    container.appendChild(tab);
  }
}

function renderResultCard(result, onClick, isSelected) {
  const card = el('button', {
    class: 'image-search-result' + (isSelected ? ' is-selected' : ''),
    type: 'button',
    title: result.title,
  });
  const thumb = el('div', { class: 'image-search-result-thumb' });
  const img = new Image();
  img.loading = 'lazy';
  img.alt = result.title;
  img.src = result.thumbUrl;
  img.onerror = () => { thumb.classList.add('is-broken'); };
  thumb.appendChild(img);
  card.appendChild(thumb);

  card.appendChild(el('div', { class: 'image-search-result-license', text: result.licenseLabel }));
  card.appendChild(el('div', { class: 'image-search-result-title', text: result.title }));

  card.addEventListener('click', () => onClick(result));
  return card;
}

function renderSelectedDetail(panel, result, { onPick, isSaving }) {
  panel.innerHTML = '';
  if (!result) {
    panel.appendChild(el('div', { class: 'image-search-detail-empty', text: 'Select an image to see details and save it to your library.' }));
    return;
  }

  const previewWrap = el('div', { class: 'image-search-detail-preview' });
  const preview = new Image();
  preview.alt = result.title;
  preview.src = result.thumbUrl;     // thumbnail-only preview is fast; full URL fetched only on save
  previewWrap.appendChild(preview);
  panel.appendChild(previewWrap);

  const meta = el('div', { class: 'image-search-detail-meta' });
  meta.appendChild(el('div', { class: 'image-search-detail-title', text: result.title }));
  meta.appendChild(el('div', { class: 'image-search-detail-author', text: 'by ' + result.author }));

  const licRow = el('div', { class: 'image-search-detail-license' });
  if (result.licenseUrl) {
    licRow.appendChild(el('a', {
      href: result.licenseUrl, target: '_blank', rel: 'noopener noreferrer',
      class: 'image-search-license-chip',
      text: result.licenseLabel,
    }));
  } else {
    licRow.appendChild(el('span', { class: 'image-search-license-chip', text: result.licenseLabel }));
  }
  licRow.appendChild(el('a', {
    href: result.sourceUrl, target: '_blank', rel: 'noopener noreferrer',
    class: 'image-search-source-link',
    text: 'View on ' + result.providerLabel + ' ↗',
  }));
  meta.appendChild(licRow);

  if (result.description) {
    meta.appendChild(el('div', { class: 'image-search-detail-description', text: result.description }));
  }

  if (result.width && result.height) {
    meta.appendChild(el('div', { class: 'image-search-detail-dim', text: `${result.width} × ${result.height}` }));
  }

  panel.appendChild(meta);

  if (typeof onPick === 'function') {
    const insertBtn = el('button', {
      class: 'image-search-insert-btn primary',
      type: 'button',
      ...(isSaving ? { disabled: true } : {}),
    }, [isSaving ? 'Saving…' : 'Save to Library']);
    insertBtn.addEventListener('click', () => onPick(result, insertBtn));
    panel.appendChild(insertBtn);
  }
}

window.openImageSearchModal = ({ onPick, providerId = 'wikimedia', title = 'Search Images' } = {}) => {
  const modal = $('#imageSearchModal');
  if (!modal) {
    console.error('[image-search] #imageSearchModal markup missing from index.html');
    return;
  }

  const titleEl  = modal.querySelector('.side-sheet-header h3');
  const tabsEl   = modal.querySelector('#imageSearchProviderTabs');
  const inputEl  = modal.querySelector('#imageSearchInput');
  const gridEl   = modal.querySelector('#imageSearchGrid');
  const detailEl = modal.querySelector('#imageSearchDetail');
  const statusEl = modal.querySelector('#imageSearchStatus');

  if (titleEl) titleEl.textContent = title;

  let currentProviderId = providerId;
  let currentResults = [];
  let selectedResult = null;
  let isSaving = false;

  const setStatus = (text, kind = '') => {
    statusEl.textContent = text || '';
    statusEl.className = 'image-search-status' + (kind ? ' is-' + kind : '');
  };

  const refreshDetail = () => renderSelectedDetail(detailEl, selectedResult, {
    onPick: typeof onPick === 'function' ? handlePick : null,
    isSaving,
  });

  const renderResults = () => {
    gridEl.innerHTML = '';
    if (currentResults.length === 0) return;
    for (const r of currentResults) {
      gridEl.appendChild(renderResultCard(r, (clicked) => {
        selectedResult = clicked;
        // Highlight the clicked card without a full re-render.
        gridEl.querySelectorAll('.image-search-result').forEach(c => c.classList.remove('is-selected'));
        const cards = [...gridEl.querySelectorAll('.image-search-result')];
        const idx = currentResults.findIndex(x => x.id === clicked.id);
        if (idx >= 0 && cards[idx]) cards[idx].classList.add('is-selected');
        refreshDetail();
      }, selectedResult?.id === r.id));
    }
  };

  async function handlePick(result, btn) {
    if (typeof onPick !== 'function' || isSaving) return;
    isSaving = true;
    refreshDetail();
    try {
      // Fetch full-resolution blob lazily — only when the user actually saves.
      const res = await fetch(result.fullUrl);
      if (!res.ok) throw new Error(`Image fetch HTTP ${res.status}`);
      const blob = await res.blob();
      const meta = {
        source: result.provider,
        sourceLabel: result.providerLabel,
        title: result.title,
        author: result.author,
        license: result.license,
        licenseLabel: result.licenseLabel,
        licenseUrl: result.licenseUrl,
        sourceUrl: result.sourceUrl,
        description: result.description,
        importedAt: new Date().toISOString(),
      };
      await onPick(blob, meta);
      // Soft visual confirmation; consumer will typically also showToast.
      setStatus(`Saved “${result.title}” to your library.`, 'success');
    } catch (err) {
      console.error('[image-search] insert failed', err);
      setStatus(`Could not save image: ${err.message}`, 'error');
    } finally {
      isSaving = false;
      refreshDetail();
    }
  }

  const runSearch = async (query) => {
    const provider = window.IMAGE_SEARCH_PROVIDERS[currentProviderId];
    if (!provider || !provider.enabled) {
      setStatus(`Provider “${currentProviderId}” is not available.`, 'error');
      return;
    }
    if (!query || !query.trim()) {
      currentResults = [];
      selectedResult = null;
      renderResults();
      refreshDetail();
      setStatus('');
      return;
    }
    setStatus('Searching ' + provider.label + '…');
    const ticket = {};
    _activeImageSearch = ticket;
    try {
      const { results } = await provider.search(query.trim(), { limit: 24 });
      if (_activeImageSearch !== ticket) return;     // a newer search has superseded this one
      currentResults = results;
      selectedResult = null;
      renderResults();
      refreshDetail();
      setStatus(results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results.');
    } catch (err) {
      if (_activeImageSearch !== ticket) return;
      console.error('[image-search] search failed', err);
      setStatus(`Search failed: ${err.message}`, 'error');
    }
  };

  const debouncedRun = debounce((q) => runSearch(q), 300);

  // Wire up provider tabs (re-renders fresh each open in case a provider was added/disabled).
  renderProviderTabs(tabsEl, currentProviderId, (id) => {
    currentProviderId = id;
    renderProviderTabs(tabsEl, currentProviderId, () => {});
    runSearch(inputEl.value);
  });

  // Reset state on each open.
  inputEl.value = '';
  currentResults = [];
  selectedResult = null;
  isSaving = false;
  gridEl.innerHTML = '';
  refreshDetail();
  setStatus('Type a search term above to find images.');

  // (Re-)bind input — replace the node to drop any stale handlers from a prior open.
  const freshInput = inputEl.cloneNode(true);
  inputEl.replaceWith(freshInput);
  freshInput.addEventListener('input', (e) => debouncedRun(e.target.value));

  openSideSheet(modal);
  setTimeout(() => freshInput.focus(), 0);
};
