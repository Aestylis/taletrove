// utils.js - Shared helper functions

const $ = sel => document.querySelector(sel);
const uid = () => (crypto?.randomUUID?.() || ('id-' + Math.random().toString(36).slice(2)));

/**
 * Returns a unique name by appending an incrementing number if the name exists in the list.
 * @param {string} baseName - The name to check.
 * @param {Array<string>} existingNames - List of names already in use.
 * @returns {string}
 */
function getUniqueName(baseName, existingNames) {
  let name = baseName;
  let counter = 2;
  const nameSet = new Set(existingNames.map(n => n.toLowerCase()));
  
  while (nameSet.has(name.toLowerCase())) {
    name = `${baseName} ${counter}`;
    counter++;
  }
  return name;
}

const saveLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    console.error("Could not save to localStorage", e);
  }
};

const loadLS = (k, def) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? def : JSON.parse(v);
  } catch {
    return def;
  }
};

const debounce = (fn, ms = 300) => {
  let t;
  const debounced = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  debounced.cancel = () => { clearTimeout(t); t = null; };
  return debounced;
};

const escapeHtml = (str) => {
  return str?.replace(/[&<>'"]/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[s]));
};

// Normalize a string for diacritic-insensitive, case-insensitive search.
// "España" and "espana" collapse to the same key — apply to BOTH query and haystack.
const normalizeForSearch = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
window.normalizeForSearch = normalizeForSearch;

// ─── Calendar arithmetic (Rata Die) ────────────────────────────────────────
// Convert any structured date {era, year, month, day} to an "absolute day
// number" — a single integer day count from Year 1 Day 1 (= 1). All temporal
// arithmetic — day-of-week, moon phase, durations — collapses to integer math
// on this number, instead of nested loops over month_len[].
//
// Anchor: Year 1, months[0], Day 1  →  abs = 1
// (parseSortableDate uses a different anchor offset by +year_len; both are
// monotonic, so both work as sort keys, but the anchor here is the one that
// makes dayOfWeek/moonPhase line up with cal.first_day and cal.lunar_shf.)

function getDaysBeforeMonth(monthIdx, cal) {
  if (!cal?.months || !cal.month_len) return 0;
  let n = 0;
  for (let i = 0; i < monthIdx; i++) {
    n += cal.month_len[cal.months[i]] || 30;
  }
  return n;
}

function toAbsoluteDay(d, cal) {
  if (!d || !cal) return 1;
  if (typeof d === 'string') d = parseLegacyTimelineDate(d);
  const year = parseInt(d.year) || 1;
  const day = parseInt(d.day) || 1;
  const monthName = d.month || cal.months?.[0] || '';
  const eraObj = cal.eras?.find(e => e.name === d.era);
  const eraBase = eraObj ? (parseInt(eraObj.startYear) || 0) : 0;
  const absYear = eraBase + year;
  const monthIdx = Math.max(0, cal.months?.indexOf(monthName) ?? 0);
  const yearLen = cal.year_len || 360;
  return (absYear - 1) * yearLen + getDaysBeforeMonth(monthIdx, cal) + day;
}

function fromAbsoluteDay(abs, cal) {
  if (!cal?.months) return null;
  const yearLen = cal.year_len || 360;
  const absYear = Math.floor((abs - 1) / yearLen) + 1;
  let dayOfYear = ((abs - 1) % yearLen + yearLen) % yearLen + 1;
  let monthIdx = 0;
  for (; monthIdx < cal.months.length - 1; monthIdx++) {
    const ml = cal.month_len[cal.months[monthIdx]] || 30;
    if (dayOfYear <= ml) break;
    dayOfYear -= ml;
  }
  return { year: absYear, month: cal.months[monthIdx], day: dayOfYear };
}

function dayOfWeek(abs, cal) {
  if (!cal) return 0;
  const first = cal.first_day || 0;
  const wlen = cal.week_len || 7;
  return ((first + abs - 1) % wlen + wlen) % wlen;
}

function moonPhase(abs, moonName, cal) {
  const cycle = cal?.lunar_cyc?.[moonName];
  if (!cycle) return 0;
  const shift = cal.lunar_shf?.[moonName] || 0;
  const t = ((abs - 1 + shift) % cycle + cycle) % cycle;
  return t / cycle;
}

/**
 * Returns a sortable numeric value for a date (either a structured dateData object or a legacy string).
 * Uses high-precision math to ensure correct ordering across eras and years.
 *
 * Note: this returns toAbsoluteDay(d) + year_len. The +year_len offset is kept
 * for backward compatibility with persisted sortableDate values used in
 * timeline rendering. New code that needs day-of-week or moon-phase math
 * should use toAbsoluteDay / dayOfWeek / moonPhase directly.
 */
function parseSortableDate(d) {
  if (!d) return 0;
  if (typeof d === 'string') d = parseLegacyTimelineDate(d);

  const cal = window.settings?.donjonCalendar;
  if (cal) {
    return toAbsoluteDay(d, cal) + (cal.year_len || 360);
  }

  // Fallback for simple/missing calendars
  const year = parseInt(d.year) || 1;
  const month = d.month || '';
  const day = parseInt(d.day) || 1;
  const { monthsInYear = 12, daysInMonth = 30 } = window.settings?.calendar || {};
  const yearBase = year * monthsInYear * daysInMonth;
  const monthBase = (window.settings?.calendar?.months?.indexOf(month) || 0) * daysInMonth;
  return yearBase + monthBase + day;
}

window.parseSortableDate = parseSortableDate;
window.toAbsoluteDay     = toAbsoluteDay;
window.fromAbsoluteDay   = fromAbsoluteDay;
window.dayOfWeek         = dayOfWeek;
window.moonPhase         = moonPhase;
window.getDaysBeforeMonth = getDaysBeforeMonth;

/**
 * Parses a legacy string date into a structured dateData object.
 * e.g. "Year 12, Month 3, Day 1" or "12-3-1"
 */
function parseLegacyTimelineDate(str) {
  if (!str || typeof str !== 'string') return { year: 1, month: '', day: 1, era: '' };
  
  const d = { year: 1, month: '', day: 1, era: '' };

  // Try to find month name first (most reliable part of the string)
  if (window.settings?.donjonCalendar?.months) {
    for (const m of window.settings.donjonCalendar.months) {
      if (str.toLowerCase().includes(m.toLowerCase())) {
        d.month = m;
        break;
      }
    }
  }

  const matches = str.match(/(\d+)/g);
  if (matches) {
    if (matches[0]) d.year = parseInt(matches[0], 10);
    // If we have a second number and haven't found a month name, it might be the month or day
    if (matches[1]) {
        if (!d.month) d.day = parseInt(matches[1], 10); // Assume Year-Day if no month found
        else d.day = parseInt(matches[1], 10);
    }
  }
  
  return d;
}

window.parseLegacyTimelineDate = parseLegacyTimelineDate;

const el = (tag, attrs = {}, children = []) => {
  const isSvg = ['svg', 'path', 'g', 'circle', 'rect'].includes(tag);
  const n = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  Object.entries(attrs).forEach(([k, v]) => {
    if (v === null || v === undefined) return;

    if (k === "class") n.className = v;
    else if (k === "for") n.htmlFor = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (k === "text") n.textContent = v;
    else if (k === "innerHTML") n.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(v) : v;
    // Handle boolean properties like 'disabled' and 'checked' correctly.
    else if (n[k] !== undefined && typeof n[k] === 'boolean') {
      n[k] = !!v;
    }
    else n.setAttribute(k, v);
  });

  children.forEach(c => {
    if (typeof c === "string") n.appendChild(document.createTextNode(c));
    else if (c) n.appendChild(c);
  });
  return n;
};

/**
 * Compresses an image to a target file size if it exceeds a threshold.
 * @param {Blob|File} file - The source image file.
 * @param {Object} options - Compression options.
 * @returns {Promise<Blob>} - The compressed image as a Blob.
 */
async function compressImage(file, { maxWidth = 2048, maxHeight = 2048, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

/**
 * Handles common image processing logic: warning for large files and compressing.
 */
async function processImageUpload(file, { maxSizeMB = 5, targetSizeMB = 2 } = {}) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    const confirmCompress = await new Promise(resolve => {
      showConfirmationModal(
        'Large Image Detected',
        `This image is quite large (${(file.size / 1024 / 1024).toFixed(1)}MB). Large images can slow down the app and may hit browser storage limits. Would you like to compress it automatically?`,
        'Compress',
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (confirmCompress) {
      return await compressImage(file);
    }
  }
  return file;
}

window.compressImage = compressImage;
window.processImageUpload = processImageUpload;

function sortableToYear(sortableDate, monthsInYear = 12, daysInMonth = 30) {
  if (sortableDate <= 0) return 1;

  // Check for Donjon calendar first
  if (settings.donjonCalendar && settings.donjonCalendar.year_len > 0) {
    const daysInYear = settings.donjonCalendar.year_len;
    return Math.floor((sortableDate - 1) / daysInYear) + 1;
  }

  // Fallback to simple calendar
  const daysInYear = monthsInYear * daysInMonth;
  const year = Math.floor((sortableDate - 1) / daysInYear) + 1;
  return year;
}

// --- IndexedDB ---
// Cached connection promise – avoids opening a new connection on every operation.
let _idbPromise = null;
function idbOpen() {
  if (!_idbPromise) {
    _idbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('worldbuilder', 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
        if (!db.objectStoreNames.contains('objects')) db.createObjectStore('objects');
      };
      req.onsuccess = () => {
        req.result.onclose = () => { _idbPromise = null; }; // reset on unexpected close
        resolve(req.result);
      };
      req.onerror = () => { _idbPromise = null; reject(req.error); };
    });
  }
  return _idbPromise;
}
async function idbSet(key, blob) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbSetObject(key, obj) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('objects', 'readwrite');
    tx.objectStore('objects').put(obj, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGetObject(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('objects', 'readonly');
    const req = tx.objectStore('objects').get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbClear() {
  const db = await idbOpen();
  // Phase 1: Collect snapshot blobs to preserve (read-only cursor — reliable & atomic)
  const snapshots = await new Promise((resolve, reject) => {
    const result = new Map();
    const tx = db.transaction('files', 'readonly');
    const cursorReq = tx.objectStore('files').openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.key.startsWith('recent-snapshot-')) result.set(cursor.key, cursor.value);
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
  // Phase 2: Clear both stores, then restore snapshots in one atomic transaction
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['files', 'objects'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('idbClear transaction aborted'));
    tx.objectStore('objects').clear();
    const filesStore = tx.objectStore('files');
    filesStore.clear();
    snapshots.forEach((blob, key) => filesStore.put(blob, key));
  });
}
// Cache of IDB key → blob URL to prevent a new object URL being created on every
// call (which would leak memory because old URLs are never revoked).
const _blobUrlCache = new Map();
const MAX_BLOB_CACHE_SIZE = 200; // Cap to prevent memory bloat

async function resolveImageUrl(src) {
  if (!src) return undefined;
  if (src.startsWith('http')) return src;
  // data: URIs are rejected — images are stored as blobs in IDB, never as inline data URIs.

  if (src.startsWith('img-') || src.startsWith('bg-img-') || src.startsWith('banner-') || src.startsWith('ci-')) {
    if (_blobUrlCache.has(src)) return _blobUrlCache.get(src);
    
    let blob = await idbGet(src);
    if (!blob) return undefined;

    // Custom icons are often stored without a proper mime type; force SVG if generic.
    if (src.startsWith('ci-') && blob && blob.size > 0 && (!blob.type || blob.type === '' || blob.type === 'application/octet-stream')) {
      blob = new Blob([blob], { type: 'image/svg+xml' });
    }
    
    // Evict oldest entry if at capacity
    if (_blobUrlCache.size >= MAX_BLOB_CACHE_SIZE) {
      const oldestKey = _blobUrlCache.keys().next().value;
      const oldestUrl = _blobUrlCache.get(oldestKey);
      URL.revokeObjectURL(oldestUrl);
      _blobUrlCache.delete(oldestKey);
    }

    const url = URL.createObjectURL(blob);
    _blobUrlCache.set(src, url);
    return url;
  }

  return undefined;
}

// Call this when an image is deleted from IDB to free the associated blob URL.
function revokeBlobUrl(src) {
  const url = _blobUrlCache.get(src);
  if (url) {
    URL.revokeObjectURL(url);
    _blobUrlCache.delete(src);
  }
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(',');
  const head = parts[0] || '';
  const data = parts[1] || '';
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png';
  const bstr = atob(data);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], {
    type: mime
  });
}
async function idbHas(key) {
  try { return !!(await idbGet(key)); } catch { return false; }
}

/**
 * Estimates the total size of the project including JSON state and all IDB files.
 * @returns {Promise<number>} - Size in bytes.
 */
async function calculateProjectSize() {
  let size = 0;
  
  // 1. JSON State (Settings + State)
  try {
    const jsonString = JSON.stringify({ settings: window.settings, state: window.state });
    size += new TextEncoder().encode(jsonString).length;
  } catch (e) {
    console.warn("Could not estimate JSON size", e);
  }

  // 2. IndexedDB Files (Blobs)
  try {
    const db = await idbOpen();
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const req = store.openCursor();
    
    await new Promise((resolve) => {
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          // Skip recent-snapshot-* — these are app-level cache, not current project data
          if (!cursor.key.startsWith('recent-snapshot-')) {
            const blob = cursor.value;
            if (blob instanceof Blob) size += blob.size;
            else if (blob instanceof ArrayBuffer) size += blob.byteLength;
            else if (typeof blob === 'string') size += blob.length;
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve(); // Graceful failure
    });
  } catch (e) {
    console.warn("Could not estimate IDB size", e);
  }

  return size;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

window.calculateProjectSize = calculateProjectSize;
window.formatBytes = formatBytes;

const getRandom = arr => {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
};

async function idbDelete(key, storeName = 'files') {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDeleteObject(key) {
  return idbDelete(key, 'objects');
}
window.idbDeleteObject = idbDeleteObject;

async function idbGetAllKeys(storeName) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function createMultiSelect(options, selectedValues, onchange, placeholder = 'Select...') {
  const container = el('div', { class: 'multiselect-container' });
  const selectedItemsContainer = el('div', { class: 'multiselect-selected-items' });
  const dropdownInput = el('input', { type: 'text', class: 'multiselect-input', placeholder });

  const updateSelectedItems = () => {
    selectedItemsContainer.innerHTML = '';
    selectedValues.forEach(value => {
      const option = options.find(opt => opt.value === value);
      if (option) {
        const tag = el('div', { class: 'chip multiselect-tag' }, [
          el('span', { text: option.text }),
          el('button', {
            class: 'multiselect-remove-btn', title: 'Remove',
            onclick: (e) => {
              e.stopPropagation(); // Prevents the container's click event
              const newValues = selectedValues.filter(v => v !== value);
              onchange(newValues);
            }
          }, [
            el('div', { class: 'icon-container', style: '-webkit-mask-image: url("ui-icons/x-circle.svg"); mask-image: url("ui-icons/x-circle.svg");' })
          ])
        ]);
        selectedItemsContainer.appendChild(tag);
      }
    });
    selectedItemsContainer.appendChild(dropdownInput);
  };

  const dropdownContent = el('div', { class: 'dropdown-content' });
  const optionsList = el('ul', { class: 'options-list' });
  dropdownContent.appendChild(optionsList);

  const closeDropdown = () => {
    if (dropdownContent.parentNode) dropdownContent.remove();
    document.removeEventListener('click', closeDropdown);
  };

  const openDropdown = () => {
    document.querySelectorAll('.dropdown-content').forEach(d => d.remove());
    optionsList.innerHTML = '';

    const unselectedOptions = options.filter(opt => !selectedValues.includes(opt.value));

    unselectedOptions.forEach(opt => {
      const li = el('li', { 'data-value': opt.value, text: opt.text });
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const newValues = [...selectedValues, opt.value];
        onchange(newValues);
        closeDropdown();
      });
      optionsList.appendChild(li);
    });

    const rect = container.getBoundingClientRect();
    document.body.appendChild(dropdownContent);
    dropdownContent.style.left = `${rect.left}px`;
    dropdownContent.style.width = `${rect.width}px`;

    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 250) { // 250px is the dropdown's max-height
      dropdownContent.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
      dropdownContent.style.top = `${rect.bottom + 4}px`;
    }

    setTimeout(() => {
      document.addEventListener('click', closeDropdown, { once: true });
    }, 0);
  };

  container.appendChild(selectedItemsContainer);

  // Clicking the container opens the dropdown; clicks on remove buttons are ignored.
  container.addEventListener('click', (e) => {
    if (e.target.closest('.multiselect-remove-btn')) return;
    openDropdown();
    dropdownInput.focus();
  });

  updateSelectedItems();

  return container;
}

// --- Crypto Helpers for Password-Protected Projects ---
const PBKDF2_ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data
  );
  
  // Output in TEN2 format (chunked). Here, we write the entire payload as a single chunk.
  const result = new Uint8Array(4 + 16 + 16 + encrypted.byteLength);
  result.set(new TextEncoder().encode("TEN2"), 0);
  result.set(salt, 4);
  result.set(iv, 20);
  new DataView(result.buffer).setUint32(32, encrypted.byteLength, true);
  result.set(new Uint8Array(encrypted), 36);
  
  return result;
}

async function decryptData(data, password) {
  const magic = new TextDecoder().decode(new Uint8Array(data.slice(0, 4)));
  
  if (magic === "TENC") {
    // Legacy single-blob format (Alpha 3 early)
    const salt = new Uint8Array(data.slice(4, 20));
    const iv = new Uint8Array(data.slice(20, 32));
    const ciphertext = new Uint8Array(data.slice(32));
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );
    return new Uint8Array(decrypted);
  } else if (magic === "TEN2") {
    // Chunked streaming format
    const salt = new Uint8Array(data.slice(4, 20));
    const key = await deriveKey(password, salt);
    
    let offset = 20;
    const decryptedChunks = [];
    let totalLength = 0;
    
    while (offset + 16 <= data.byteLength) {
      const iv = new Uint8Array(data.slice(offset, offset + 12));
      const cipherLen = new DataView(data.buffer, data.byteOffset + offset + 12, 4).getUint32(0, true);
      offset += 16;
      
      if (offset + cipherLen > data.byteLength) {
        throw new Error("Encrypted project is truncated or corrupted");
      }
      
      const ciphertext = new Uint8Array(data.slice(offset, offset + cipherLen));
      offset += cipherLen;
      
      const decryptedChunk = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
      const decryptedArr = new Uint8Array(decryptedChunk);
      decryptedChunks.push(decryptedArr);
      totalLength += decryptedArr.byteLength;
    }
    
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of decryptedChunks) {
      result.set(chunk, pos);
      pos += chunk.byteLength;
    }
    return result;
  } else {
    throw new Error("Not a valid TaleTrove encrypted file");
  }
}

window.encryptData = encryptData;
window.decryptData = decryptData;
window.deriveKey = deriveKey;