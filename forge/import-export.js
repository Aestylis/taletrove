// import-export.js — project import/export orchestration (WS7 #2: extracted verbatim from worldbuilder.js).
//
// Classic script sharing global scope. Runtime dependencies (resolved at call time, not load
// time): JSZip (CDN), encryptData/decryptData/idb* (utils.js), setLoadingState (ui.js),
// showAlertModal/showToast (modals/ui), and worldbuilder.js globals (showPasswordModal,
// showConfirmationModal, el, CUSTOM_ICON_MANIFEST, syncArticleViews, markEntityDirty,
// state/settings from state.js). worldbuilder.js wires the #importFile input and hub drop
// zone inside initEventListeners() (run at DOMContentLoaded — after every deferred script
// has evaluated), and reaches the import pipeline via the handleImportFile global /
// window._handleImportFile. processZip reassigns the shared state/settings bindings
// declared in state.js — classic-script top-level bindings are global, so this works
// across files exactly as it did in worldbuilder.js.

// --- Save / load / export entry points ---

async function handleSaveProject() {
  showPasswordModal('Export Project', 'Enter password...', async (password) => {
    const filename = (settings.projectName.replace(/[^a-z0-9_-]/gi, '_') || 'world') + '.trv';
    const clone = { settings, state };
    // Include all img-* keys from IDB so asset-library images that haven't been placed
    // in any block yet are preserved across export/import cycles.
    const allIdbKeys = await idbGetAllKeys('files');
    const assetLibraryKeys = allIdbKeys.filter(k => k.startsWith('img-'));
    await exportBundleFrom(clone, filename, assetLibraryKeys, password);
  }, '(Optional) Enter a password to protect your project file');
}

function handleLoadProject() {
  $('#importFile').click();
}

async function handleExportPlayer() {
  showPasswordModal('Export Player Project', 'Enter password...', async (password) => {
    const filename = (settings.projectName.replace(/[^a-z0-9_-]/gi, '_') || 'player_export') + '_player.trv';
    const playerState = sanitizeForPlayer({ settings, state });
    await exportBundleFrom(playerState, filename, [], password);
  }, '(Optional) Enter a password to protect this player project');
}

async function exportBundleFrom(clone, filename, additionalKeys = [], password = null) {
  if (typeof JSZip === 'undefined') {
    showAlertModal('Dependency Missing', 'JSZip library not loaded. Export functionality will be limited.');
    return;
  }
  
  setLoadingState(true, "Preparing Project...");
  const zip = new JSZip();
  console.log("Starting project export...");

  // 1. Create a Set to collect all unique image/blob keys from the entire project.
  //    Seed with any extra keys passed by the caller (e.g. orphaned asset-library images).
  const allKeysToExport = new Set(additionalKeys);

  // From maps (base, overlay, and banner images)
  (clone.state.maps || []).forEach(map => {
    if (map.imageKey) allKeysToExport.add(map.imageKey);
    if (map.overlayKey) allKeysToExport.add(map.overlayKey);
    if (map.id) allKeysToExport.add(`banner-${map.id}`);
  });

  // From features/atlas entries (hero images, imageKey, and image blocks)
  (clone.state.features || []).forEach(feature => {
    if (feature.heroImageKey) allKeysToExport.add(feature.heroImageKey);
    if (feature.coatOfArmsKey) allKeysToExport.add(feature.coatOfArmsKey);
    if (feature.imageKey) allKeysToExport.add(feature.imageKey);
    (feature.blocks || []).forEach(block => {
      if (block.type === 'Image' && block.data.src && block.data.src.startsWith('img-')) {
        allKeysToExport.add(block.data.src);
      }
    });
  });

  // From encyclopedia entries (hero images, CoA, and image blocks)
  (clone.state.encyclopedia || []).forEach(entry => {
    if (entry.heroImageKey) allKeysToExport.add(entry.heroImageKey);
    if (entry.coatOfArmsKey) allKeysToExport.add(entry.coatOfArmsKey);
    if (entry.imageKey) allKeysToExport.add(entry.imageKey);
    (entry.blocks || []).forEach(block => {
      if (block.type === 'Image' && block.data.src && block.data.src.startsWith('img-')) {
        allKeysToExport.add(block.data.src);
      }
    });
  });

  // From custom theme background
  if (clone.settings.customTheme?.backgroundImageKey) {
    allKeysToExport.add(clone.settings.customTheme.backgroundImageKey);
  }
  // From appearance map background (stored in state.meta)
  if (clone.state.appearance?.mapBgKey) {
    allKeysToExport.add(clone.state.appearance.mapBgKey);
  }

  // From custom icons – use the already-cached manifest instead of scanning all IDB keys.
  CUSTOM_ICON_MANIFEST.forEach(key => allKeysToExport.add(key));

  console.log(`Found ${allKeysToExport.size} unique image/blob keys to export:`, Array.from(allKeysToExport));

  // 2. Asynchronously get each file from IndexedDB and add it to the zip.
  const filePromises = Array.from(allKeysToExport).map(async (key) => {
    if (key) { // Safety check for null/undefined keys
      const blob = await idbGet(key);
      if (blob) {
        zip.file(key, blob);
      } else {
        console.warn(`Could not find blob for key "${key}" in IndexedDB.`);
      }
    }
  });

  // Wait for all files to be added to the zip object.
  await Promise.all(filePromises);
  console.log("Finished adding files to zip.");

  // 3. Add the main world.json file.
  zip.file('world.json', JSON.stringify(clone, null, 2));

  // 4. Attempt Streaming Export (File System Access API)
  const canStream = typeof window.showSaveFilePicker === 'function';

  if (canStream) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'TaleTrove Project', accept: { 'application/octet-stream': ['.trv', '.wbundle'] } }]
      });
      
      setLoadingState(true, "Generating Project...");
      let blob = await zip.generateAsync({ type: 'blob' });

      if (password) {
        const buf = await blob.arrayBuffer();
        const encrypted = await encryptData(new Uint8Array(buf), password);
        blob = new Blob([encrypted], { type: 'application/octet-stream' });
      }

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      showToast("Project exported successfully!");
      setLoadingState(false);
      console.log("Streaming project export complete.");
      return;
    } catch (err) {
      setLoadingState(false);
      if (err.name === 'AbortError') {
        console.log("Export cancelled by user.");
        return;
      }
      console.error("Streaming export failed, falling back to in-memory:", err);
      // Fall through to in-memory approach
    }
  }

  // 5. Fallback: Generate the final .wbundle file in memory and trigger the download.
  setLoadingState(true, password ? "Encrypting Project..." : "Generating Project...");
  const out = await zip.generateAsync({ type: 'blob', streamFiles: true });
  let finalContent = out;

  if (password) {
    console.log("Encrypting project (in-memory fallback)...");
    const buffer = await out.arrayBuffer();
    // encryptData now natively outputs the TEN2 format.
    const encrypted = await encryptData(new Uint8Array(buffer), password);
    finalContent = new Blob([encrypted], { type: 'application/octet-stream' });
  }

  const url = URL.createObjectURL(finalContent);
  const a = el('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setLoadingState(false);
  console.log("Project download initiated.");
}

function sanitizeForPlayer(full) {
  const clone = structuredClone(full);

  // 1. Filter out GM-only maps
  const playerMapIds = new Set(clone.state.maps.filter(m => m.visibleToPlayers).map(m => m.id));
  clone.state.maps = clone.state.maps.filter(m => m.visibleToPlayers);

  // 2. If the active map is GM-only, fall back to the first player-visible map so the
  //    bundle doesn't load into a permanent loading spinner.
  if (!playerMapIds.has(clone.state.activeMapId)) {
    clone.state.activeMapId = clone.state.maps[0]?.id || null;
  }

  // 3. Filter articles by visibility; atlas articles must also be on a visible map
  clone.state.articles = (clone.state.articles || [])
    .filter(a => {
      if (!a.visibleToPlayers) return false;
      if (a._silo === 'atlas' && !playerMapIds.has(a.mapId)) return false;
      return true;
    })
    .map(a => ({ ...a, blocks: (a.blocks || []).filter(b => b.visibleToPlayers) }));

  // Rebuild derived silo views on the clone
  clone.state.features    = clone.state.articles.filter(a => a._silo === 'atlas');
  clone.state.encyclopedia = clone.state.articles.filter(a => a._silo === 'lore');

  return clone;
}

// --- Drive-save world blob builder (also used by the export round-trip test) ---

async function buildWorldBlob() {
  if (typeof JSZip === 'undefined') throw new Error('JSZip not loaded');
  const zip  = new JSZip();
  const clone = { settings, state };

  const allKeysToExport = new Set();
  const allIdbKeys = await idbGetAllKeys('files');
  allIdbKeys.filter(k => k.startsWith('img-')).forEach(k => allKeysToExport.add(k));
  (clone.state.maps || []).forEach(m => {
    if (m.imageKey)    allKeysToExport.add(m.imageKey);
    if (m.overlayKey)  allKeysToExport.add(m.overlayKey);
    if (m.id)          allKeysToExport.add(`banner-${m.id}`);
  });
  [...(clone.state.features || []), ...(clone.state.encyclopedia || [])].forEach(e => {
    if (e.heroImageKey)   allKeysToExport.add(e.heroImageKey);
    if (e.coatOfArmsKey)  allKeysToExport.add(e.coatOfArmsKey);
    if (e.imageKey)       allKeysToExport.add(e.imageKey);
    (e.blocks || []).forEach(b => {
      if (b.type === 'Image' && b.data?.src?.startsWith('img-')) allKeysToExport.add(b.data.src);
    });
  });
  if (clone.settings.customTheme?.backgroundImageKey)
    allKeysToExport.add(clone.settings.customTheme.backgroundImageKey);
  CUSTOM_ICON_MANIFEST.forEach(k => allKeysToExport.add(k));

  await Promise.all(Array.from(allKeysToExport).map(async key => {
    if (!key) return;
    const blob = await idbGet(key);
    if (blob) zip.file(key, blob);
  }));

  zip.file('world.json', JSON.stringify(clone, null, 2));
  return zip.generateAsync({ type: 'blob', streamFiles: true });
}

// --- Recent-projects snapshots (feed the import pipeline on restore) ---

async function captureProjectThumbnail() {
  const activeMap = state.maps.find(m => m.id === state.activeMapId);
  if (!activeMap?.imageKey) return null;
  const url = await resolveImageUrl(activeMap.imageKey);
  if (!url) return null;
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_W = 400, MAX_H = 225;
      const scale = Math.min(MAX_W / img.width, MAX_H / img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function saveRecentProject() {
  const thumbnail = await captureProjectThumbnail();
  const entry = {
    worldId: settings.worldId,
    name: settings.projectName || 'Untitled World',
    lastModified: new Date().toISOString(),
    thumbnailDataUrl: thumbnail
  };
  const recent = loadLS('recentProjects', []);
  // Deduplicate by both worldId and name — same bundle re-imported generates a new worldId each time
  const filtered = recent.filter(r => r.worldId !== entry.worldId && r.name !== entry.name);
  saveLS('recentProjects', [entry, ...filtered].slice(0, 6));
}

async function saveFullSnapshot(worldId) {
  if (typeof JSZip === 'undefined' || !worldId) return;
  try {
    const zip = new JSZip();
    zip.file('world.json', JSON.stringify({ settings, state }));
    const fileKeys = await idbGetAllKeys('files');
    await Promise.all(
      fileKeys
        .filter(k => !k.startsWith('recent-snapshot-'))
        .map(async k => {
          const blob = await idbGet(k);
          if (blob) zip.file(k, blob);
        })
    );
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
    await idbSet(`recent-snapshot-${worldId}`, blob);
  } catch (e) {
    console.warn('[Snapshot] Failed to save world snapshot:', e);
  }
}

async function restoreWorldSnapshot(worldId) {
  const blob = await idbGet(`recent-snapshot-${worldId}`);
  if (!blob) {
    showAlertModal('Snapshot Unavailable', 'The full snapshot for this world was not found. Re-import the original .trv file to continue working on it.');
    return;
  }
  setLoadingState(true, 'Restoring World...');
  // Save the current outgoing world before restoring
  await saveFullSnapshot(settings.worldId);
  await saveRecentProject();
  // Feed the snapshot blob directly into the existing import pipeline
  window._handleImportFile(new File([blob], 'snapshot.trv', { type: 'application/zip' }));
}

// --- Import pipeline: validate → snapshot → clear → commit ---

function validateBundle(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj))
    throw new Error('Invalid project: root must be an object');
  if (!obj.state || typeof obj.state !== 'object' || Array.isArray(obj.state))
    throw new Error('Invalid project: missing or invalid state');
  if (!obj.settings || typeof obj.settings !== 'object' || Array.isArray(obj.settings))
    throw new Error('Invalid project: missing or invalid settings');

  const s = obj.state;
  const requiredArrays = ['features', 'maps', 'encyclopedia', 'folders', 'encyclopediaFolders', 'templates'];
  for (const key of requiredArrays) {
    if (s[key] !== undefined && !Array.isArray(s[key]))
      throw new Error(`Invalid project: state.${key} must be an array`);
  }
  if (!Array.isArray(s.maps) || s.maps.length === 0)
    throw new Error('Invalid project: state.maps must be a non-empty array');
  if (s.activeMapId !== undefined && typeof s.activeMapId !== 'string')
    throw new Error('Invalid project: state.activeMapId must be a string');
  if (obj.settings.projectName !== undefined && typeof obj.settings.projectName !== 'string')
    throw new Error('Invalid project: settings.projectName must be a string');

  // Validate individual entity shape — catch prototype pollution and bad IDB keys
  const CSS_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]{0,80}\)|[a-zA-Z]{1,30})$/;
  const validateEntity = (entity, label) => {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity))
      throw new Error(`Invalid project: ${label} entry must be an object`);
    if (typeof entity.id !== 'string' || !entity.id)
      throw new Error(`Invalid project: ${label} entry missing id`);
    if (entity.color !== undefined && typeof entity.color === 'string' && !CSS_COLOR_RE.test(entity.color.trim()))
      throw new Error(`Invalid project: ${label} ${entity.id} has malformed color`);
    if (entity.blocks !== undefined && !Array.isArray(entity.blocks))
      throw new Error(`Invalid project: ${label} ${entity.id} blocks must be an array`);
    if (Array.isArray(entity.blocks)) {
      entity.blocks.forEach((b, i) => {
        if (!b || typeof b !== 'object') throw new Error(`Invalid project: ${label} ${entity.id} block[${i}] must be an object`);
        if (typeof b.type !== 'string') throw new Error(`Invalid project: ${label} ${entity.id} block[${i}] missing type`);
      });
    }
  };
  (s.features || []).forEach(f => validateEntity(f, 'feature'));
  (s.encyclopedia || []).forEach(e => validateEntity(e, 'encyclopedia'));
  (s.articles || []).forEach(a => validateEntity(a, 'article'));
  (s.maps || []).forEach(m => {
    if (!m || typeof m.id !== 'string') throw new Error('Invalid project: map entry missing id');
  });
}

async function handleImportFile(file) {
  if (!file) return;
  if (typeof JSZip === 'undefined') {
    showAlertModal('Dependency Missing', 'Cannot import project: JSZip library not loaded');
    return;
  }
  try {
    setLoadingState(true, "Reading Project...");
    let buffer = await file.arrayBuffer();
    const view = new Uint8Array(buffer);
    const magic = new TextDecoder().decode(view.slice(0, 4));

    if (magic === "TENC" || magic === "TEN2") {
      // Handle encrypted project
      setLoadingState(false);
      const attemptDecrypt = (password) => {
        setLoadingState(true, "Decrypting Project...");
        decryptData(view, password).then(decryptedBuffer => {
          processZip(decryptedBuffer);
        }).catch(err => {
          setLoadingState(false);
          showPasswordModal('Invalid Password', 'Enter password...', attemptDecrypt, 'Decryption failed. Please try again:');
        });
      };
      showPasswordModal('Encrypted Project', 'Enter password...', attemptDecrypt, 'This project is password protected. Please enter the password to unlock it:');
    } else {
      // Plain ZIP project
      processZip(buffer);
    }
  } catch (err) {
    setLoadingState(false);
    showAlertModal('Import Failed', 'Failed to read project: ' + err.message);
  }

  async function processZip(data) {
    // Stage 1: open ZIP archive
    setLoadingState(true, 'Opening project…');
    let zip;
    try {
      zip = await JSZip.loadAsync(data);
    } catch (err) {
      setLoadingState(false);
      showAlertModal('Invalid File', 'Could not open the project archive. The file may be corrupted or is not a valid .trv file.');
      console.error('[import] ZIP load failed:', err);
      return;
    }

    // Stage 2: read and parse world.json
    setLoadingState(true, 'Reading world data…');
    let obj;
    try {
      const worldEntry = zip.file('world.json');
      if (!worldEntry) {
        setLoadingState(false);
        showAlertModal('Invalid Project', 'This doesn\'t appear to be a valid TaleTrove project — world.json is missing. Make sure you\'re opening a .trv file.');
        return;
      }
      const jsonText = await worldEntry.async('string');
      obj = JSON.parse(jsonText);
    } catch (err) {
      setLoadingState(false);
      if (err instanceof SyntaxError) {
        showAlertModal('Corrupted Project', 'The project data could not be read — the world.json file contains invalid data. The file may be corrupted.');
      } else {
        showAlertModal('Import Failed', 'Failed to read project data: ' + err.message);
      }
      console.error('[import] world.json read failed:', err);
      return;
    }

    // Stage 3: validate before touching anything — existing data stays safe on failure
    setLoadingState(true, 'Validating…');
    try {
      validateBundle(obj);
    } catch (err) {
      setLoadingState(false);
      showAlertModal('Invalid Project', 'Project validation failed: ' + err.message + '\n\nYour existing world was not modified.');
      console.error('[import] validateBundle failed:', err);
      return;
    }

    // Stage 4: commit — snapshot outgoing world, flush, clear, import assets
    setLoadingState(true, 'Importing…');
    try {
      // Snapshot fires in background — idbClear() is serialized by IDB and waits for it
      saveFullSnapshot(settings.worldId).catch(e => console.warn('[processZip] Snapshot failed:', e));
      await saveRecentProject();

      // Flush and cancel any pending debounced saves before clearing IDB.
      // Without this, a debouncedSave firing mid-import sets _isSaving=true,
      // causing the post-import save() to return immediately → empty world on reload.
      await window.flushSave();

      // idbClear preserves recent-snapshot-* keys
      await idbClear();

      const imageSavePromises = [];
      for (const filename of Object.keys(zip.files)) {
        if (filename.startsWith('img-') || filename.startsWith('ci-') || filename.startsWith('banner-') || filename.startsWith('bg-img-')) {
          const fileData = await zip.file(filename).async('blob');
          imageSavePromises.push(idbSet(filename, fileData));
        }
      }
      await Promise.all(imageSavePromises);

      settings = obj.settings || { projectName: 'Imported World' };
      state = obj.state || {};
      // Backfill arrays that may be absent in older .wbundle files
      if (!Array.isArray(state.maps)) state.maps = [{ id: 'map-default', name: 'World Map', parentId: null, imageKey: null, width: 2000, height: 1200, overlayKey: null, overlayOpacity: 0.4 }];
      if (!state.activeMapId) state.activeMapId = state.maps[0]?.id || 'map-default';

      // Build unified articles array from whatever the bundle contains
      if (!Array.isArray(state.articles) || state.articles.length === 0) {
        const legacyFeatures     = (state.features    || []).map(f => ({ ...f, _silo: f._silo || 'atlas' }));
        const legacyEncyclopedia = (state.encyclopedia|| []).map(e => ({ ...e, _silo: e._silo || 'lore'  }));
        state.articles = [...legacyFeatures, ...legacyEncyclopedia];
      } else {
        // Bundle already has articles (Phase-A export) — just ensure _silo is set
        state.articles.forEach(a => { if (!a._silo) a._silo = (a.geojson?.geometry) ? 'atlas' : 'lore'; });
      }
      syncArticleViews();

      // Mark everything dirty for the post-import save
      markEntityDirty('meta');
      state.articles.forEach(a => markEntityDirty('article', a.id));
      state.maps.forEach(m => markEntityDirty('map', m.id));

      // flushSave guarantees all import data is committed before reload
      await window.flushSave();
      setLoadingState(false);
      window.location.reload();

    } catch (err) {
      setLoadingState(false);
      showAlertModal('Import Failed', 'An error occurred while saving the imported project: ' + err.message + '\n\nIf this keeps happening, try refreshing the page and importing again.');
      console.error('[import] commit stage failed:', err);
    }
  }

}

window._handleImportFile = handleImportFile;
