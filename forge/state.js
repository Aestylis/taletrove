
const APP_VERSION = '0.6.10-alpha';
let TAXONOMY = {};
let NEWS_DATA = [];
let ICON_MANIFEST = [];
let UI_ICON_MANIFEST = [];
let ICON_SYNONYMS = {};
let LATEST_NEWS_VERSION = null;
let CUSTOM_ICON_MANIFEST = [];
let CUSTOM_SHAPE_MANIFEST = [];
let SVG_MAP = {};
let GENERATOR_DATA = {};

let role = loadLS('role', 'gm');
let settings = loadLS('worldSettings', {
  projectName: 'Untitled World',
  globalMarkerSize: 40,
  freeMoveEnabled: false,
  labelsVisible: true,
  overlayVisible: false,
  featureClickAction: 'content',
  currentDate: { year: 1, month: null, day: 1 },
  diceColor: '#ff7a1a',
  diceTheme: 'default'
});
// Ensure new properties exist for existing users
if (settings.labelsVisible === undefined) settings.labelsVisible = true;
if (settings.overlayVisible === undefined) settings.overlayVisible = false;
if (settings.featureClickAction === undefined || settings.featureClickAction === 'panel' || settings.featureClickAction === 'navigate') settings.featureClickAction = 'content';

let state = {
  articles: [],      // Phase A — unified backing store for all entities
  features: [],      // derived view: articles where _silo === 'atlas' (kept in sync by syncArticleViews)
  encyclopedia: [],  // derived view: articles where _silo === 'lore'  (kept in sync by syncArticleViews)
  templates: [],
  layoutTemplates: [],
  customColors: [],
  folders: [],
  encyclopediaFolders: [],
  maps: [{
    id: 'map-default', 
    name: 'World Map', 
    parentId: null, 
    imageKey: null, 
    width: 2000, 
    height: 1200, 
    overlayKey: null, 
    overlayOpacity: 0.4, 
    scale: { pixels: 100, distance: 5, unit: 'miles' }, 
    grid: { enabled: false, type: 'square', size: 50, color: '#FFFFFF', opacity: 0.5, width: 1 },
    fog: { enabled: false, opacity: 1.0, mask: null } // Added Fog state
  }],
  activeMapId: 'map-default'
};

let selectedId = null;
let selectedBlockId = null;
let pendingTemplateId = null;
let featureFilter = 'all';
let activeDraw = null;
let targetMapIdForUpload = null;
let isRearrangeMode = false;
let shouldScrollToSelectedBlock = false;
let selectedEncyclopediaEntryId = null;
let isContentEditMode = false;
let inspectorViewMode = loadLS('inspectorViewMode', 'basic');
let showEncyclopediaEvents = loadLS('showEncyclopediaEvents', true);

let lastUsedTemplateIds = {
  point: 'generic-pin',
  polygon: 'generic-area',
  polyline: 'generic-line'
};

// Exposed on window so map.js / ui.js can read without importing
// Never restore transient draw/paint modes across sessions — always start in pointer
const _restoredMode = loadLS('uiMode', 'pointer');
window.uiMode = ['pointer', 'move'].includes(_restoredMode) ? _restoredMode : 'pointer';

let collapsedNodes = new Set(loadLS('collapsedNodes', []));
window.collapsedFolderNodes = new Set(loadLS('collapsedFolderNodes', []));
let collapsedEncyclopediaFolderNodes = new Set(loadLS('collapsedEncyclopediaFolderNodes', []));
let collapsedMapLoreNodes = new Set(loadLS('collapsedMapLoreNodes', []));

function saveCollapsedState() {
  saveLS('collapsedNodes', [...collapsedNodes]);
  saveLS('collapsedFolderNodes', [...collapsedFolderNodes]);
  saveLS('collapsedEncyclopediaFolderNodes', [...collapsedEncyclopediaFolderNodes]);
  saveLS('collapsedMapLoreNodes', [...collapsedMapLoreNodes]);
}
window.saveCollapsedState = saveCollapsedState;

/**
 * Rebuilds the derived silo views from state.articles.
 * Must be called after every mutation to state.articles.
 */
function syncArticleViews() {
  state.features    = state.articles.filter(a => a._silo === 'atlas');
  state.encyclopedia = state.articles.filter(a => a._silo === 'lore');
}
window.syncArticleViews = syncArticleViews;

/** Returns the unified articles array (same as state.articles). */
function getAllArticles() {
  return state.articles;
}
window.getAllArticles = getAllArticles;

let navigationTask = 0;
window.navigationTask = navigationTask;

let multiSelectedIds = new Set();

const historyLimit = 50;
let undoStack = [];
let redoStack = [];
let isRestoringState = false;

const UI_SVG_CACHE = {};


const _dirtyKeys = new Set();
let _backlinkIndex = null; // backlink cache — null means needs rebuild

/**
 * Marks an entity as "dirty" so it will be written to IndexedDB on the next save.
 * @param {'article'|'feature'|'encyclopedia'|'map'|'meta'} type
 *   'feature' and 'encyclopedia' are accepted as aliases for 'article' to keep
 *   existing call sites working during the Phase A → B transition. All three
 *   write to the unified 'article-{id}' IDB key.
 * @param {string} [id] - Required for all non-meta types.
 */
function markEntityDirty(type, id) {
  if (type === 'meta') {
    _dirtyKeys.add('worldState-meta');
  } else if (id) {
    if (type === 'feature' || type === 'encyclopedia' || type === 'article') {
      _dirtyKeys.add(`article-${id}`);
    } else {
      _dirtyKeys.add(`${type}-${id}`); // 'map' → 'map-{id}'
    }
  }
  _backlinkIndex = null; // invalidate backlink cache on any mutation
}
window.markEntityDirty = markEntityDirty;

function hasDirtyChanges() {
  return _dirtyKeys.size > 0;
}
window.hasDirtyChanges = hasDirtyChanges;

let _isSaving = false;
let _needsSaveAgain = false;

async function save() {
  if (_isSaving) {
    _needsSaveAgain = true;
    return;
  }

  _isSaving = true;
  
  try {
    do {
      _needsSaveAgain = false;
      await _performSave();
    } while (_needsSaveAgain);
  } finally {
    _isSaving = false;
  }
}

async function _performSave() {
  if (_dirtyKeys.size === 0) return;

  if (window.showSaving) window.showSaving();
  saveLS('worldSettings', settings);
  
  const toWrite = new Set(_dirtyKeys);
  _dirtyKeys.clear();

  try {
    const savePromises = [];

    // 1. Meta record
    if (toWrite.has('worldState-meta')) {
      savePromises.push(idbSetObject('worldState-meta', {
        appVersion:            APP_VERSION,
        activeMapId:           state.activeMapId,
        folders:               state.folders               || [],
        encyclopediaFolders:   state.encyclopediaFolders   || [],
        templates:             state.templates             || [],
        layoutTemplates:       state.layoutTemplates       || [],
        customColors:          state.customColors          || [],
        assetNames:            state.assetNames            || {},
        assetMeta:             state.assetMeta             || {},
        appearance:            state.appearance            || {}
      }));
    }

    // 2. Per-entity records (only if dirty) — unified article-{id} key format
    getAllArticles().forEach(a => {
      if (toWrite.has(`article-${a.id}`)) {
        savePromises.push(idbSetObject(`article-${a.id}`, a));
      }
    });

    (state.maps || []).forEach(m => {
      if (toWrite.has(`map-${m.id}`)) {
        savePromises.push(idbSetObject(`map-${m.id}`, m));
      }
    });

    await Promise.all(savePromises);
    if (window.showSaved) window.showSaved();
  } catch (e) {
    console.error('Failed to save state to IndexedDB:', e);
    // Re-add keys to dirty set on failure
    toWrite.forEach(k => _dirtyKeys.add(k));
    throw e; 
  }
}

/**
 * Periodically cleans up records in IDB that are no longer in the state.
 */
async function cleanupOrphans() {
  try {
    const allObjKeys = await idbGetAllKeys('objects');
    const currentArticleKeys = new Set(getAllArticles().map(a => `article-${a.id}`));
    const currentMapKeys = new Set((state.maps || []).map(m => `map-${m.id}`));

    // Safety: if state loaded 0 articles, something went wrong — do not delete anything.
    if (currentArticleKeys.size === 0) {
      console.warn('[cleanupOrphans] Skipped — no articles in state (possible load failure).');
      return;
    }

    // Only delete legacy feature-*/encyclopedia-* keys if the migration succeeded,
    // i.e. there are article-* keys in IDB that correspond to loaded state.
    const articleKeysInIdb = allObjKeys.filter(k => k.startsWith('article-'));
    const migrationComplete = articleKeysInIdb.length > 0 && articleKeysInIdb.length >= currentArticleKeys.size;

    const orphans = allObjKeys.filter(key => {
      if (key === 'worldState-meta') return false;
      if (key === 'worldState') return false;
      if (key.startsWith('article-') && !currentArticleKeys.has(key)) return true;
      // Only clean up legacy keys once migration is confirmed complete
      if (migrationComplete && (key.startsWith('feature-') || key.startsWith('encyclopedia-'))) return true;
      if (key.startsWith('map-') && !currentMapKeys.has(key)) return true;
      return false;
    });

    await Promise.all(orphans.map(key => idbDeleteObject(key)));
    if (orphans.length > 0) console.log(`Cleaned up ${orphans.length} orphan records.`);
  } catch (e) {
    console.error('Orphan cleanup failed:', e);
  }
}
window.cleanupOrphans = cleanupOrphans;

const debouncedSave = debounce(() => save(), 500);

/**
 * Cancels any pending debounced save, waits for any in-progress save to finish,
 * then immediately flushes all dirty keys to IDB.
 * Call this BEFORE idbClear() to prevent race conditions, and AFTER marking
 * entities dirty during import to guarantee writes complete before reload.
 */
async function flushSave() {
  debouncedSave.cancel();
  while (_isSaving) {
    await new Promise(r => setTimeout(r, 20));
  }
  await _performSave();
}
window.flushSave = flushSave;

function recordState() {
  if (isRestoringState) return;

  const snapshot = {
    mapState: structuredClone(state),
    uiState: { inspectorViewMode }
  };
  undoStack.push(snapshot);
  redoStack = [];
  if (undoStack.length > historyLimit) undoStack.shift();
}

function _rebuildBacklinkIndex() {
  _backlinkIndex = new Map();
  const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

  const addToIndex = (targetName, sourceRecord) => {
    if (!targetName) return;
    const key = targetName.toLowerCase();
    if (!_backlinkIndex.has(key)) _backlinkIndex.set(key, []);
    if (!_backlinkIndex.get(key).some(r => r.id === sourceRecord.id)) {
      _backlinkIndex.get(key).push(sourceRecord);
    }
  };

  const register = (item, type) => {
    const displayName = item.name || item.title || 'Untitled';
    const sourceRecord = { id: item.id, name: displayName, type };

    // Index explicit links[] by target entity name
    (item.links || []).forEach(link => {
      let target = null;
      if (link.targetType === 'encyclopedia') target = state.encyclopedia.find(e => e.id === link.targetId);
      else if (link.targetType === 'feature')  target = state.features.find(f => f.id === link.targetId);
      else if (link.targetType === 'map')      target = (state.maps || []).find(m => m.id === link.targetId);
      if (target) addToIndex(target.name || target.title, sourceRecord);
    });

    // Index [[wiki-links]] from block content
    (item.blocks || []).forEach(block => {
      if (!block.data) return;
      Object.values(block.data).forEach(val => {
        if (typeof val !== 'string') return;
        let m;
        WIKI_LINK_RE.lastIndex = 0;
        while ((m = WIKI_LINK_RE.exec(val)) !== null) {
          addToIndex(m[1].trim(), sourceRecord);
        }
      });
    });
  };

  getAllArticles().forEach(a => register(a, a._silo === 'atlas' ? 'feature' : 'encyclopedia'));
  state.maps.forEach(m => register(m, 'map'));
}

/**
 * Returns all entities that contain a [[WikiLink]] to the given name.
 * Uses a lazily-built inverted index (O(1) lookup after first build).
 * @param {string} targetName
 * @param {string} currentId - Excluded from results to avoid self-links.
 * @returns {Array<{id: string, name: string, type: 'feature'|'encyclopedia'|'map'}>}
 */
function getBacklinks(targetName, currentId) {
  if (!targetName) return [];
  if (_backlinkIndex === null) _rebuildBacklinkIndex();
  const all = _backlinkIndex.get(targetName.toLowerCase()) || [];
  return all.filter(r => r.id !== currentId);
}
window.getBacklinks = getBacklinks;