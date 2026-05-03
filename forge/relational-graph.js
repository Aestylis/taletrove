// relational-graph.js — Canvas-based force-directed relational graph
// Depends on: state.js, utils.js, ui.js

// ─── Constants ────────────────────────────────────────────────────────────────

const RG_LINK_COLORS = {
  family:      '#e07b9a',
  territory:   '#4caf87',
  member:      '#5b8de8',
  ally:        '#7ed957',
  enemy:       '#e05757',
  rival:       '#e0a857',
  contains:    '#9b7fe0',
  participant: '#9b59b6',
  related:     '#888888',
  custom:      '#aaaaaa',
};

// Canvas setLineDash patterns per link type — [] = solid
const RG_LINK_DASHES = {
  family:      [],               // solid
  related:     [3, 4],           // dotted
  ally:        [8, 4],           // dashed
  enemy:       [14, 4],          // long-dash
  rival:       [8, 4, 3, 4],     // dash-dot
  member:      [5, 3],           // short-dash
  territory:   [10, 5],          // medium-dash
  contains:    [3, 7],           // sparse-dot
  participant: [8, 3, 3, 3, 3, 3], // dash-dot-dot
  custom:      [6, 8],           // sparse-dash
};

const RG_NODE_COLORS = {
  feature:     '#4e9af1',
  encyclopedia:'#e8b45b',
};

const RG_REPULSION  = 4500;
const RG_SPRING     = 0.035;
const RG_CENTER     = 0.008;
const RG_DAMPING    = 0.82;
const RG_IDEAL_LEN  = 120;
const RG_BASE_R     = 9;
const RG_MAX_R      = 26;

// ─── Module State ─────────────────────────────────────────────────────────────

let _canvas = null, _ctx = null, _modal = null;
let _cssW = 0, _cssH = 0;
let _nodes = [], _edges = [];
let _transform = { x: 0, y: 0, scale: 1 };
let _dragNode   = null;
let _isPanning  = false, _panStart = null, _txStart = null;
let _wasDragging = false, _dragDist = 0;
let _hoveredNode = null;
let _selectedEdge = null;
let _animFrame  = null;
let _alpha      = 1.0;

let _showAtlas       = true;
let _showEncyclopedia = true;
let _showOrphans     = true;
let _hiddenLinkTypes = new Set();
let _allLinkTypes    = []; // all link types in the data, regardless of visibility
let _localEntityId   = null;

// ─── Coordinate Helpers ───────────────────────────────────────────────────────

function rgW2S(wx, wy) {
  return {
    x: _cssW / 2 + _transform.x + wx * _transform.scale,
    y: _cssH / 2 + _transform.y + wy * _transform.scale,
  };
}

function rgS2W(sx, sy) {
  return {
    x: (sx - _cssW / 2 - _transform.x) / _transform.scale,
    y: (sy - _cssH / 2 - _transform.y) / _transform.scale,
  };
}

function rgNodeAt(sx, sy) {
  const w = rgS2W(sx, sy);
  // Iterate in reverse so top-rendered nodes are hit first
  for (let i = _nodes.length - 1; i >= 0; i--) {
    const n = _nodes[i];
    const dx = n.x - w.x, dy = n.y - w.y;
    if (dx * dx + dy * dy <= n.radius * n.radius) return n;
  }
  return null;
}

function rgEdgeAt(sx, sy) {
  // Sample 20 points along each edge's quadratic bezier; hit if within 8px screen-space
  const HIT_PX = 8;
  const w = rgS2W(sx, sy);
  for (const edge of _edges) {
    const s = edge.source, t = edge.target;
    const sx1 = s.x, sy1 = s.y, tx1 = t.x, ty1 = t.y;
    const dx = tx1 - sx1, dy = ty1 - sy1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perp = 12;
    const cpx = (sx1 + tx1) / 2 - (dy / len) * perp;
    const cpy = (sy1 + ty1) / 2 + (dx / len) * perp;
    const hitDist = HIT_PX / _transform.scale;
    for (let i = 0; i <= 20; i++) {
      const t2 = i / 20;
      const bx = (1 - t2) * (1 - t2) * sx1 + 2 * (1 - t2) * t2 * cpx + t2 * t2 * tx1;
      const by = (1 - t2) * (1 - t2) * sy1 + 2 * (1 - t2) * t2 * cpy + t2 * t2 * ty1;
      if ((bx - w.x) ** 2 + (by - w.y) ** 2 <= hitDist * hitDist) return edge;
    }
  }
  return null;
}

function rgHexRgba(hex, a) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Data Building ────────────────────────────────────────────────────────────

function rgBuildData() {
  _nodes = [];
  _edges = [];

  const nodeMap = new Map();
  const edgeSet = new Set();

  // Pre-scan events for participant counts to ensure correct node radii
  const participantCounts = new Map();
  state.encyclopedia.forEach(e => {
    if (e.type === 'event' && e.eventData?.participantIds) {
      e.eventData.participantIds.forEach(pId => {
        participantCounts.set(pId, (participantCounts.get(pId) || 0) + 1);
      });
    }
  });

  const allItems = [
    ...(_showAtlas        ? state.features     : []).map(f => ({ entity: f, kind: 'feature'     })),
    ...(_showEncyclopedia ? state.encyclopedia  : []).map(e => ({ entity: e, kind: 'encyclopedia'})),
  ];

  for (const { entity, kind } of allItems) {
    const linkCount = (entity.links || []).filter(l => l.targetId).length;
    let participantCount = 0;
    if (entity.type === 'event' && entity.eventData?.participantIds) {
      participantCount = entity.eventData.participantIds.length;
    }
    // Also add counts where THIS entity is a participant in OTHER events
    const incomingParticipantCount = participantCounts.get(entity.id) || 0;

    const totalConnections = linkCount + participantCount + incomingParticipantCount;
    if (!_showOrphans && totalConnections === 0) continue;
    const radius = Math.min(RG_MAX_R, RG_BASE_R + totalConnections * 1.5);
    const node = {
      id:       entity.id,
      label:    entity.title || entity.name || '(untitled)',
      kind,
      category: entity.category || entity.type || '',
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      vx: 0, vy: 0,
      radius,
      pinned: false,
    };
    _nodes.push(node);
    nodeMap.set(entity.id, node);
  }

  // Collect all link types before visibility filtering so the filter panel stays complete
  const allLinkTypeSet = new Set();
  for (const { entity } of allItems) {
    for (const link of (entity.links || [])) {
      if (link.targetId) allLinkTypeSet.add(link.linkType || 'related');
    }
    if (entity.type === 'event' && entity.eventData?.participantIds?.length) {
      allLinkTypeSet.add('participant');
    }
  }
  _allLinkTypes = [...allLinkTypeSet].sort();

  for (const { entity } of allItems) {
    // Standard links
    for (const link of (entity.links || [])) {
      if (!link.targetId) continue;
      if (_hiddenLinkTypes.has(link.linkType)) continue;
      const src = nodeMap.get(entity.id);
      const tgt = nodeMap.get(link.targetId);
      if (!src || !tgt) continue;
      const key = [entity.id, link.targetId].sort().join('|') + '|' + (link.linkType || 'related');
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      _edges.push({ source: src, target: tgt, linkType: link.linkType || 'related', label: link.label || '', ownerId: entity.id, linkRef: link });
    }

    // Event participants
    if (entity.type === 'event' && entity.eventData?.participantIds) {
      if (_hiddenLinkTypes.has('participant')) continue;
      const src = nodeMap.get(entity.id);
      if (!src) continue;
      for (const pId of entity.eventData.participantIds) {
        const tgt = nodeMap.get(pId);
        if (!tgt) continue;
        const key = [entity.id, pId].sort().join('|') + '|participant';
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        _edges.push({ source: src, target: tgt, linkType: 'participant', label: '' });
      }
    }
  }

  // Local graph: restrict to 1-hop neighborhood of focused entity
  if (_localEntityId) {
    const neighborIds = new Set([_localEntityId]);
    for (const e of _edges) {
      if (e.source.id === _localEntityId) neighborIds.add(e.target.id);
      if (e.target.id === _localEntityId) neighborIds.add(e.source.id);
    }
    _nodes = _nodes.filter(n => neighborIds.has(n.id));
    _edges = _edges.filter(e => neighborIds.has(e.source.id) && neighborIds.has(e.target.id));
  }

  // Arrange in a circle for stable initial layout
  const N = _nodes.length;
  const initR = Math.max(80, Math.sqrt(N) * 65);
  _nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    n.x = Math.cos(angle) * initR;
    n.y = Math.sin(angle) * initR;
  });
}

function rgRebuild() {
  rgBuildData();
  _alpha = 1.0;
  const old = _modal?.querySelector('.graph-filter-panel');
  if (old) old.replaceWith(rgBuildFilterPanel());
}

// ─── Simulation ───────────────────────────────────────────────────────────────

function rgTick() {
  if (_alpha < 0.003 || _nodes.length === 0) return;

  const N = _nodes.length;

  // Repulsion — O(n²), fine for typical world sizes (<500 nodes)
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = _nodes[i], b = _nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy + 0.1;
      const d  = Math.sqrt(d2);
      const f  = RG_REPULSION / d2;
      a.vx -= (dx / d) * f; a.vy -= (dy / d) * f;
      b.vx += (dx / d) * f; b.vy += (dy / d) * f;
    }
  }

  // Spring attraction along edges
  for (const edge of _edges) {
    const s = edge.source, t = edge.target;
    const dx = t.x - s.x, dy = t.y - s.y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    const f  = (d - RG_IDEAL_LEN) * RG_SPRING;
    s.vx += (dx / d) * f; s.vy += (dy / d) * f;
    t.vx -= (dx / d) * f; t.vy -= (dy / d) * f;
  }

  // Gravity toward centre + damping + integrate
  for (const n of _nodes) {
    if (n.pinned) continue;
    n.vx = (n.vx - n.x * RG_CENTER) * RG_DAMPING;
    n.vy = (n.vy - n.y * RG_CENTER) * RG_DAMPING;
    n.x += n.vx;
    n.y += n.vy;
  }

  _alpha *= 0.996;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function rgRender() {
  if (!_ctx) return;

  const rootStyle = getComputedStyle(document.documentElement);
  const themeText      = rootStyle.getPropertyValue('--text').trim()      || '#e8e9eb';
  const themeTextMuted = rootStyle.getPropertyValue('--text-muted').trim() || '#888888';
  const themeBg        = rootStyle.getPropertyValue('--bg').trim()         || '#13131a';
  // Derive dimAlpha from background brightness: light mode needs higher opacity so lines stay visible
  const bgHex = themeBg.replace('#', '');
  const bgR = parseInt(bgHex.slice(0, 2), 16) || 30;
  const isLightMode = bgR > 160;
  const dimAlpha = isLightMode ? 0.55 : 0.30;

  // Fill explicit background so nodes always render on a consistent surface
  _ctx.fillStyle = themeBg;
  _ctx.fillRect(0, 0, _cssW, _cssH);

  if (_nodes.length === 0) {
    _ctx.fillStyle = themeText;
    _ctx.font = '14px Inter, sans-serif';
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    _ctx.fillText('No entities or links to display.', _cssW / 2, _cssH / 2 - 12);
    _ctx.font = '12px Inter, sans-serif';
    _ctx.fillStyle = themeTextMuted;
    _ctx.fillText('Add links between entries and features to build the graph.', _cssW / 2, _cssH / 2 + 14);
    return;
  }

  // Read node colors from CSS tokens so they respect all themes
  const themeAccentOrange  = rootStyle.getPropertyValue('--accent-orange').trim()  || '#ff7a1a';
  const themeAccentMagenta = rootStyle.getPropertyValue('--accent-magenta').trim() || '#ff3ea5';

  // Edges
  for (const edge of _edges) {
    const s = rgW2S(edge.source.x, edge.source.y);
    const t = rgW2S(edge.target.x, edge.target.y);
    const baseColor = RG_LINK_COLORS[edge.linkType] || RG_LINK_COLORS.related;
    const isSelected = edge === _selectedEdge;
    const isHot = isSelected || (_hoveredNode && (edge.source === _hoveredNode || edge.target === _hoveredNode));

    // Curved edges — organic feel, clearer when edges cross
    const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
    const dx = t.x - s.x, dy = t.y - s.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perp = 12;

    _ctx.setLineDash(RG_LINK_DASHES[edge.linkType] || []);
    _ctx.beginPath();
    _ctx.moveTo(s.x, s.y);
    _ctx.quadraticCurveTo(mx - (dy / len) * perp, my + (dx / len) * perp, t.x, t.y);
    _ctx.strokeStyle = isHot ? baseColor : rgHexRgba(baseColor, dimAlpha);
    _ctx.lineWidth   = isSelected ? 3 : isHot ? 2.5 : 1;
    if (isHot) {
      _ctx.shadowColor = baseColor;
      _ctx.shadowBlur  = 6;
    }
    _ctx.stroke();
    _ctx.shadowBlur = 0;
    _ctx.setLineDash([]);
  }

  // Nodes
  for (const n of _nodes) {
    const s    = rgW2S(n.x, n.y);
    const sr   = n.radius * _transform.scale;
    const isHot = n === _hoveredNode;
    const baseColor = n.kind === 'feature' ? themeAccentOrange
                    : n.kind === 'encyclopedia' ? themeAccentMagenta
                    : '#888888';

    if (isHot) {
      // Soft halo
      const halo = _ctx.createRadialGradient(s.x, s.y, sr * 0.8, s.x, s.y, sr + 8);
      halo.addColorStop(0, rgHexRgba(baseColor, 0.30));
      halo.addColorStop(1, rgHexRgba(baseColor, 0));
      _ctx.beginPath();
      _ctx.arc(s.x, s.y, sr + 8, 0, Math.PI * 2);
      _ctx.fillStyle = halo;
      _ctx.fill();
    }

    // Radial gradient fill for depth
    const grad = _ctx.createRadialGradient(
      s.x - sr * 0.3, s.y - sr * 0.3, 0,
      s.x, s.y, Math.max(2, sr)
    );
    grad.addColorStop(0,   rgHexRgba(baseColor, 1.0));
    grad.addColorStop(0.6, rgHexRgba(baseColor, 0.87));
    grad.addColorStop(1,   rgHexRgba(baseColor, 0.53));

    _ctx.beginPath();
    _ctx.arc(s.x, s.y, Math.max(2, sr), 0, Math.PI * 2);
    _ctx.fillStyle = grad;
    if (isHot) {
      _ctx.shadowColor = baseColor;
      _ctx.shadowBlur  = 8;
    }
    _ctx.fill();
    _ctx.shadowBlur  = 0;
    _ctx.strokeStyle = rgHexRgba(baseColor, 0.6);
    _ctx.lineWidth   = 1.5;
    _ctx.stroke();

    // Label — show when zoomed in enough, or on hover
    if (_transform.scale >= 0.55 || isHot) {
      const fontSize = Math.round(Math.min(13, 11 * _transform.scale));
      _ctx.font         = `${fontSize}px Inter, sans-serif`;
      _ctx.textAlign    = 'center';
      _ctx.textBaseline = 'top';
      _ctx.fillStyle    = isHot ? themeText : themeTextMuted;
      _ctx.shadowColor  = isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)';
      _ctx.shadowBlur   = 3;
      const raw = n.label;
      const label = raw.length > 20 ? raw.slice(0, 19) + '…' : raw;
      _ctx.fillText(label, s.x, s.y + Math.max(2, sr) + 3);
      _ctx.shadowBlur = 0;
    }
  }
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

function rgLoop() {
  rgTick();
  rgRender();
  _animFrame = requestAnimationFrame(rgLoop);
}

// ─── Interaction ──────────────────────────────────────────────────────────────

function rgMousePos(e) {
  const rect = _canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function rgOnMouseDown(e) {
  _wasDragging = false; _dragDist = 0;
  const { x, y } = rgMousePos(e);
  const node = rgNodeAt(x, y);
  if (node) {
    _dragNode  = node;
    node.pinned = true;
    _alpha = Math.max(_alpha, 0.3);
  } else {
    _isPanning    = true;
    _panStart     = { x: e.clientX, y: e.clientY };
    _txStart      = { x: _transform.x, y: _transform.y };
  }
}

function rgOnMouseMove(e) {
  const { x, y } = rgMousePos(e);

  if (_dragNode) {
    _dragDist += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (_dragDist > 4) _wasDragging = true;
    const w = rgS2W(x, y);
    _dragNode.x = w.x; _dragNode.y = w.y;
    _dragNode.vx = 0;  _dragNode.vy = 0;
    _alpha = Math.max(_alpha, 0.08);
    return;
  }

  if (_isPanning) {
    _dragDist += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (_dragDist > 4) _wasDragging = true;
    _transform.x = _txStart.x + (e.clientX - _panStart.x);
    _transform.y = _txStart.y + (e.clientY - _panStart.y);
    return;
  }

  const prev = _hoveredNode;
  _hoveredNode = rgNodeAt(x, y);
  if (_hoveredNode !== prev) {
    rgUpdateTooltip(x, y);
    _canvas.style.cursor = _hoveredNode ? 'pointer' : 'default';
  }
}

function rgOnMouseUp() {
  _dragNode  = null;
  _isPanning = false;
}

function rgOnClick(e) {
  if (_wasDragging) return;
  const { x, y } = rgMousePos(e);
  const node = rgNodeAt(x, y);
  if (node) {
    rgCloseEdgeSheet();
    closeRelationalGraph();
    requestAnimationFrame(() => {
      if (node.kind === 'feature') window.navigateAndPeek?.(node.id, 'feature');
      else                         window.enterPeekMode?.(node.id, 'encyclopedia');
    });
    return;
  }
  const edge = rgEdgeAt(x, y);
  if (edge) {
    rgOpenEdgeSheet(edge);
  } else {
    rgCloseEdgeSheet();
  }
}

// ─── Edge Inspector Sheet ─────────────────────────────────────────────────────

function rgOpenEdgeSheet(edge) {
  _selectedEdge = edge;
  const existing = _modal?.querySelector('.graph-edge-sheet');
  if (existing) existing.remove();
  if (!_modal) return;

  const srcLabel  = edge.source.label;
  const tgtLabel  = edge.target.label;
  const linkColor = RG_LINK_COLORS[edge.linkType] || RG_LINK_COLORS.related;
  const desc      = edge.linkRef?.description || '';

  const sheet = el('div', { class: 'graph-edge-sheet' });

  const hdr = el('div', { class: 'graph-edge-sheet-hdr' });
  const titleEl = el('div', { class: 'graph-edge-sheet-title' });
  titleEl.innerHTML =
    `<span class="ges-node">${escapeHtml(srcLabel)}</span>` +
    `<span class="ges-arrow">↔</span>` +
    `<span class="ges-node">${escapeHtml(tgtLabel)}</span>`;

  const closeBtn = el('button', { class: 'ghost ges-close', 'aria-label': 'Close' });
  closeBtn.innerHTML = getIconHTMLSync('x', 'currentColor');
  closeBtn.addEventListener('click', rgCloseEdgeSheet);

  hdr.append(titleEl, closeBtn);

  const typePill = el('div', { class: 'ges-type-pill' });
  typePill.style.setProperty('--pill-color', linkColor);
  typePill.textContent = edge.linkType.charAt(0).toUpperCase() + edge.linkType.slice(1);

  const label = el('label', { class: 'ges-desc-label', text: 'Connection notes' });
  const textarea = el('textarea', {
    class: 'ges-desc-textarea',
    placeholder: 'Describe this relationship…',
  });
  textarea.value = desc;
  textarea.addEventListener('blur', () => {
    if (!edge.linkRef) return;
    edge.linkRef.description = textarea.value;
    if (window.markEntityDirty) window.markEntityDirty('article', edge.ownerId);
    if (window.debouncedSave)   window.debouncedSave();
  });

  sheet.append(hdr, typePill, label, textarea);
  _modal.appendChild(sheet);

  requestAnimationFrame(() => sheet.classList.add('is-open'));
}

function rgCloseEdgeSheet() {
  _selectedEdge = null;
  const sheet = _modal?.querySelector('.graph-edge-sheet');
  if (!sheet) return;
  sheet.classList.remove('is-open');
  setTimeout(() => sheet.remove(), 180);
}

function rgOnWheel(e) {
  e.preventDefault();
  const { x: sx, y: sy } = rgMousePos(e);
  const factor   = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.08, Math.min(6, _transform.scale * factor));
  const ratio    = newScale / _transform.scale;
  const cx = _cssW / 2 + _transform.x;
  const cy = _cssH / 2 + _transform.y;
  _transform.x = sx - _cssW / 2 - (sx - cx) * ratio;
  _transform.y = sy - _cssH / 2 - (sy - cy) * ratio;
  _transform.scale = newScale;
}

function rgOnDblClick() {
  _transform = { x: 0, y: 0, scale: 1 };
}

function rgUpdateTooltip(sx, sy) {
  const tooltip = _modal?.querySelector('.graph-tooltip');
  if (!tooltip) return;
  if (!_hoveredNode) { tooltip.classList.add('hidden'); return; }
  const linkCount = _edges.filter(e => e.source === _hoveredNode || e.target === _hoveredNode).length;
  const kindLabel = _hoveredNode.kind === 'feature' ? 'Atlas' : 'Lore';
  tooltip.innerHTML =
    `<strong class="graph-tt-name">${escapeHtml(_hoveredNode.label)}</strong>` +
    `<span class="graph-tt-meta">${kindLabel}${_hoveredNode.category ? ' · ' + escapeHtml(_hoveredNode.category) : ''}</span>` +
    `<span class="graph-tt-links">${linkCount} connection${linkCount !== 1 ? 's' : ''}</span>`;

  // Clamp to canvas bounds
  const s  = rgW2S(_hoveredNode.x, _hoveredNode.y);
  const sr = _hoveredNode.radius * _transform.scale;
  let tx = s.x + sr + 12;
  let ty = s.y - 24;
  tooltip.classList.remove('hidden');
  // After first paint, clamp right edge
  requestAnimationFrame(() => {
    const tw = tooltip.offsetWidth;
    if (tx + tw > _cssW - 8) tx = s.x - sr - tw - 12;
    tooltip.style.left = `${tx}px`;
    tooltip.style.top  = `${Math.max(4, ty)}px`;
  });
  tooltip.style.left = `${tx}px`;
  tooltip.style.top  = `${Math.max(4, ty)}px`;
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function rgLinkSwatch(color, dashes) {
  const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '10');
  svg.style.cssText = 'flex-shrink:0;overflow:visible';
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '5');
  line.setAttribute('x2', '22');
  line.setAttribute('y2', '5');
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '2');
  if (dashes.length) line.setAttribute('stroke-dasharray', dashes.join(' '));
  svg.appendChild(line);
  return svg;
}


function rgBuildFilterPanel() {
  const panel = el('div', { class: 'graph-filter-panel' });

  const hdr = el('div', { class: 'graph-filter-hdr', text: 'Filters' });
  panel.appendChild(hdr);

  // Entity type toggles — read live CSS vars so dots match the theme-aware canvas colors
  const rootStyle = getComputedStyle(document.documentElement);
  const themeFeatureColor = rootStyle.getPropertyValue('--accent-orange').trim()  || '#ff7a1a';
  const themeLoreColor    = rootStyle.getPropertyValue('--accent-magenta').trim() || '#ff3ea5';
  [
    { label: 'Atlas Features',       key: 'atlas', color: themeFeatureColor },
    { label: 'Lore Entries',         key: 'lore',  color: themeLoreColor    },
  ].forEach(({ label, key, color }) => {
    const row = el('label', { class: 'graph-filter-row' });
    const cb  = el('input', { type: 'checkbox' });
    cb.checked = key === 'atlas' ? _showAtlas : _showEncyclopedia;
    cb.addEventListener('change', () => {
      if (key === 'atlas') _showAtlas = cb.checked;
      else _showEncyclopedia = cb.checked;
      rgRebuild();
    });
    const dot = el('span', { class: 'graph-filter-dot' });
    dot.style.background = color;
    row.append(cb, dot, el('span', { text: label }));
    panel.appendChild(row);
  });

  // Link type filters — derived from all data, not just visible edges
  const linkTypes = _allLinkTypes;
  if (linkTypes.length > 0) {
    panel.appendChild(el('div', { class: 'graph-filter-sep', text: 'Link Types' }));
    linkTypes.forEach(type => {
      const row = el('label', { class: 'graph-filter-row' });
      const cb  = el('input', { type: 'checkbox' });
      cb.checked = !_hiddenLinkTypes.has(type);
      cb.addEventListener('change', () => {
        if (cb.checked) _hiddenLinkTypes.delete(type); else _hiddenLinkTypes.add(type);
        rgRebuild();
      });
      const swatch = rgLinkSwatch(RG_LINK_COLORS[type] || '#888', RG_LINK_DASHES[type] || []);
      const name = type.charAt(0).toUpperCase() + type.slice(1);
      row.append(cb, swatch, el('span', { text: name }));
      panel.appendChild(row);
    });
  }

  // Orphans toggle
  panel.appendChild(el('div', { class: 'graph-filter-sep' }));
  const orphanRow = el('label', { class: 'graph-filter-row' });
  const orphanCb  = el('input', { type: 'checkbox' });
  orphanCb.checked = _showOrphans;
  orphanCb.addEventListener('change', () => { _showOrphans = orphanCb.checked; rgRebuild(); });
  orphanRow.append(orphanCb, el('span', { text: 'Show unlinked' }));
  panel.appendChild(orphanRow);

  // Node count
  panel.appendChild(el('div', {
    class: 'graph-filter-count',
    text: `${_nodes.length} nodes · ${_edges.length} edges`
  }));

  return panel;
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

function openRelationalGraph(focusEntityId = null) {
  if (_modal) closeRelationalGraph();

  _localEntityId   = focusEntityId || null;
  _alpha           = 1.0;
  _transform       = { x: 0, y: 0, scale: 1 };
  _hoveredNode     = null;
  _showAtlas       = true;
  _showEncyclopedia = true;
  _showOrphans     = true;
  _hiddenLinkTypes = new Set();

  // ── Modal shell ──
  _modal = el('div', {
    id: 'relationalGraphModal',
    class: 'graph-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'rg-modal-title',
  });

  // Header
  const header  = el('div', { class: 'graph-modal-header' });
  const titleEl = el('span', { id: 'rg-modal-title', class: 'graph-modal-title', text: focusEntityId ? 'Local Graph' : 'Relational Graph' });
  const actions = el('div', { class: 'graph-modal-actions' });

  if (focusEntityId) {
    const fullBtn = el('button', { class: 'ghost', text: 'Show Full Graph' });
    fullBtn.addEventListener('click', () => {
      _localEntityId = null;
      titleEl.textContent = 'Relational Graph';
      fullBtn.remove();
      rgRebuild();
    });
    actions.appendChild(fullBtn);
  }

  const resetBtn = el('button', { class: 'ghost', text: 'Reset View' });
  resetBtn.addEventListener('click', () => { _transform = { x: 0, y: 0, scale: 1 }; });

  const closeBtn = el('button', { class: 'ghost graph-close-btn', 'aria-label': 'Close' });
  closeBtn.innerHTML = getIconHTMLSync('x', 'currentColor');
  closeBtn.addEventListener('click', closeRelationalGraph);

  actions.append(resetBtn, closeBtn);
  header.append(titleEl, actions);
  _modal.appendChild(header);

  // Canvas
  _canvas = el('canvas', { class: 'graph-canvas' });
  _modal.appendChild(_canvas);

  // Tooltip overlay
  _modal.appendChild(el('div', { class: 'graph-tooltip hidden' }));

  document.body.appendChild(_modal);

  // ── Size canvas in CSS pixels (sharp on HiDPI) ──
  const rect = _canvas.getBoundingClientRect();
  _cssW = rect.width;
  _cssH = rect.height;
  const dpr = window.devicePixelRatio || 1;
  _canvas.width  = _cssW * dpr;
  _canvas.height = _cssH * dpr;
  _ctx = _canvas.getContext('2d');
  _ctx.scale(dpr, dpr);

  // Build data + filter panel
  rgBuildData();
  _modal.appendChild(rgBuildFilterPanel());

  // ── Events ──
  _canvas.addEventListener('mousedown',  rgOnMouseDown);
  _canvas.addEventListener('mousemove',  rgOnMouseMove);
  _canvas.addEventListener('mouseup',    rgOnMouseUp);
  _canvas.addEventListener('mouseleave', rgOnMouseUp);
  _canvas.addEventListener('click',      rgOnClick);
  _canvas.addEventListener('wheel',      rgOnWheel, { passive: false });
  _canvas.addEventListener('dblclick',   rgOnDblClick);

  const onKey = (e) => { if (e.key === 'Escape') closeRelationalGraph(); };
  document.addEventListener('keydown', onKey);
  _modal._onKey = onKey;

  // Animate in
  requestAnimationFrame(() => _modal.classList.add('is-open'));

  // Start simulation loop
  rgLoop();
}

function closeRelationalGraph() {
  if (!_modal) return;
  _selectedEdge = null;
  cancelAnimationFrame(_animFrame);
  _animFrame = null;
  if (_modal._onKey) document.removeEventListener('keydown', _modal._onKey);
  _modal.classList.remove('is-open');
  setTimeout(() => {
    _modal?.remove();
    _modal = _canvas = _ctx = null;
  }, 220);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

window.openRelationalGraph  = openRelationalGraph;
window.closeRelationalGraph = closeRelationalGraph;
