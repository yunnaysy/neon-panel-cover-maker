// Studio additions: undo/redo history, lettering layout (size, spacing, line height,
// position, drag + corner resize, 9-position grid, auto-fit), colour scope
// (entire poster / selected panel), and the mobile bottom sheet.

import { LAYER_RANGES, defaultLayers, logicalUnit } from './typography.js';
import { computePanelPixelRects } from './layouts.js';

let api = null;
let typoInfo = { boxes: {}, effective: {}, overflow: {} };
let selectedLayer = 'title';
let showTextOutline = false;
let colourScope = 'global';
let guide = null;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function setTypoInfo(info) {
  if (info) typoInfo = info;
}

// ---------------------------------------------------------------- history
const undoStack = [];
const redoStack = [];
const imgIds = new WeakMap();
let imgSeq = 1;
const imgId = (img) => { if (!img) return 0; if (!imgIds.has(img)) imgIds.set(img, imgSeq++); return imgIds.get(img); };

function snapshot() {
  const s = api.state;
  return {
    layout: s.layout, canvasWidth: s.canvasWidth, canvasHeight: s.canvasHeight,
    activePanelIndex: s.activePanelIndex,
    colorPreset: s.colorPreset, colorIntensity: s.colorIntensity,
    adjustments: { ...s.adjustments },
    panelGrades: JSON.parse(JSON.stringify(s.panelGrades || [])),
    typography: JSON.parse(JSON.stringify(s.typography)),
    panelPhotos: (s.panelPhotos || []).map(p => (p ? { image: p.image, panX: p.panX, panY: p.panY, zoom: p.zoom } : p)),
    globalPhoto: s.globalPhoto,
  };
}
function signature(snap) {
  const { activePanelIndex, ...rest } = snap;
  return JSON.stringify({ ...rest, panelPhotos: rest.panelPhotos.map(p => (p ? [imgId(p.image), p.panX, p.panY, p.zoom] : 0)), globalPhoto: imgId(rest.globalPhoto) });
}
let current = null;
let currentSig = '';
let commitTimer = 0;
export function commit() {
  clearTimeout(commitTimer);
  const snap = snapshot();
  const sig = signature(snap);
  if (sig === currentSig) return;
  if (current) { undoStack.push(current); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; }
  current = snap; currentSig = sig;
  updateHistoryButtons();
}
function commitSoon(ms = 450) { clearTimeout(commitTimer); commitTimer = setTimeout(commit, ms); }
function restore(snap) {
  const s = api.state;
  Object.assign(s, {
    layout: snap.layout, canvasWidth: snap.canvasWidth, canvasHeight: snap.canvasHeight,
    activePanelIndex: snap.activePanelIndex, colorPreset: snap.colorPreset, colorIntensity: snap.colorIntensity,
    adjustments: { ...snap.adjustments }, panelGrades: JSON.parse(JSON.stringify(snap.panelGrades)),
    typography: JSON.parse(JSON.stringify(snap.typography)),
    panelPhotos: snap.panelPhotos.map(p => (p ? { ...p } : p)), globalPhoto: snap.globalPhoto,
  });
  current = snap; currentSig = signature(snap);
  api.syncUI();
  syncAll();
  api.redraw();
  updateHistoryButtons();
}
function undo() { commit(); if (!undoStack.length) return; redoStack.push(current); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(current); restore(redoStack.pop()); }
function updateHistoryButtons() {
  ['btn-undo', 'm-undo'].forEach(id => { const b = $(id); if (b) b.disabled = !undoStack.length && !pendingChange(); });
  ['btn-redo', 'm-redo'].forEach(id => { const b = $(id); if (b) b.disabled = !redoStack.length; });
}
function pendingChange() { return current && signature(snapshot()) !== currentSig; }

function initHistory() {
  ['btn-undo', 'm-undo'].forEach(id => $(id)?.addEventListener('click', undo));
  ['btn-redo', 'm-redo'].forEach(id => $(id)?.addEventListener('click', redo));
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || e.altKey) return;
    const k = e.key.toLowerCase();
    const inText = e.target.matches?.('input[type="text"], textarea');
    if (k === 'z' && !inText) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (k === 'y' && !inText) { e.preventDefault(); redo(); }
  });
  // Generic commit points: any finished control change, button click, canvas gesture end.
  document.addEventListener('change', () => commitSoon(30), true);
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-undo, #btn-redo, #m-undo, #m-redo, .sheet-tab, .sheet-handle')) return;
    if (e.target.closest('button')) setTimeout(() => commitSoon(30), 0);
  }, true);
  document.addEventListener('input', () => { commitSoon(600); setTimeout(updateHistoryButtons, 0); }, true);
  window.addEventListener('pointerup', () => commitSoon(60));
  api.canvas.addEventListener('wheel', () => commitSoon(500), { passive: true });
}

// ---------------------------------------------------------------- lettering layout
const GRID_X = [6, 50, 94];
const GRID_Y = [16, 52, 84];
const ALIGNS = ['left', 'center', 'right'];

function layers() {
  const t = api.state.typography;
  if (!t.layers) t.layers = defaultLayers();
  return t.layers;
}
function eff(name) { return typoInfo.effective?.[name] || { size: LAYER_RANGES[name].size[0], x: 50, y: 50 }; }

function bindPair(id, onValue) {
  const range = $(id);
  const num = document.querySelector(`.num[data-for="${id}"]`);
  const apply = (raw, src) => {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return;
    const min = parseFloat(range.min), max = parseFloat(range.max);
    const c = clamp(v, min, max);
    if (src !== range) range.value = c;
    if (num && src !== num) num.value = round(c, range.step);
    onValue(c);
  };
  range.addEventListener('input', () => apply(range.value, range));
  num?.addEventListener('input', () => apply(num.value, num));
  num?.addEventListener('blur', () => { num.value = round(parseFloat(range.value), range.step); });
}
function setPair(id, value, min, max) {
  const range = $(id);
  const num = document.querySelector(`.num[data-for="${id}"]`);
  if (min != null) { range.min = min; range.max = max; if (num) { num.min = min; num.max = max; } }
  range.value = value;
  if (num && document.activeElement !== num) num.value = round(value, range.step);
}
function round(v, step) { const d = String(step).includes('.') ? String(step).split('.')[1].length : 0; return Number(v).toFixed(d); }

function syncTypeControls() {
  const L = layers()[selectedLayer];
  const R = LAYER_RANGES[selectedLayer];
  const e = eff(selectedLayer);
  setPair('ty-size', Math.round(L.size ?? e.size), R.size[0], R.size[1]);
  setPair('ty-spacing', L.spacing, R.spacing[0], R.spacing[1]);
  setPair('ty-lh', L.lineHeight, R.lineHeight[0], R.lineHeight[1]);
  setPair('ty-x', L.x ?? e.x);
  setPair('ty-y', L.y ?? e.y);
  $('ty-autofit').checked = L.autoFit !== false;
  document.querySelectorAll('.layer-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === selectedLayer));
  const mode = api.state.typography.letteringMode || 'below';
  document.querySelectorAll('.mode-seg .seg-btn').forEach(b => { b.classList.toggle('active', b.dataset.mode === mode); b.setAttribute('aria-checked', b.dataset.mode === mode); });
  document.querySelectorAll('#pos-grid button').forEach(b => {
    const on = Math.abs(GRID_X[b.dataset.c] - (L.x ?? -99)) < 0.6 && Math.abs(GRID_Y[b.dataset.r] - (L.y ?? -99)) < 0.6;
    b.classList.toggle('active', on);
  });
  const warn = $('overflow-warn');
  const over = Object.keys(typoInfo.overflow || {}).filter(k => typoInfo.overflow[k]);
  if (warn) { warn.hidden = !over.length; warn.textContent = over.length ? `${over.join(' & ')} too wide` : ''; }
}

function selectLayer(name, outline = true) {
  selectedLayer = name;
  showTextOutline = outline;
  syncTypeControls();
  api.redraw();
}

function updateLayer(patch) {
  Object.assign(layers()[selectedLayer], patch);
  api.redraw();
  syncTypeControls();
}

function initTypeControls() {
  document.querySelectorAll('.layer-seg .seg-btn').forEach(b => b.addEventListener('click', () => selectLayer(b.dataset.layer)));
  document.querySelectorAll('.mode-seg .seg-btn').forEach(b => b.addEventListener('click', () => {
    api.state.typography.letteringMode = b.dataset.mode; api.redraw(); syncTypeControls();
  }));
  bindPair('ty-size', v => updateLayer({ size: v }));
  bindPair('ty-spacing', v => updateLayer({ spacing: v }));
  bindPair('ty-lh', v => updateLayer({ lineHeight: v }));
  bindPair('ty-x', v => { const e = eff(selectedLayer); updateLayer({ x: v, y: layers()[selectedLayer].y ?? e.y }); });
  bindPair('ty-y', v => { const e = eff(selectedLayer); updateLayer({ y: v, x: layers()[selectedLayer].x ?? e.x }); });
  $('ty-autofit').addEventListener('change', (e) => updateLayer({ autoFit: e.target.checked }));
  document.querySelectorAll('#pos-grid button').forEach(b => b.addEventListener('click', () => {
    updateLayer({ x: GRID_X[b.dataset.c], y: GRID_Y[b.dataset.r], align: ALIGNS[b.dataset.c] });
  }));
  $('ty-reset').addEventListener('click', () => { layers()[selectedLayer] = defaultLayers()[selectedLayer]; api.redraw(); syncTypeControls(); });
  $('ty-reset-all').addEventListener('click', () => { api.state.typography.layers = defaultLayers(); api.redraw(); syncTypeControls(); });
}

// ---------------------------------------------------------------- on-canvas text drag / resize
function handleRects(box, scale) {
  const r = 9 * scale;
  return [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => ({ x, y, r }));
}
function canvasScale() {
  const rect = api.canvas.getBoundingClientRect();
  return rect.width ? api.canvas.width / rect.width : 1;
}
function hitText(pt) {
  const sc = canvasScale();
  const pad = 8 * sc;
  if (showTextOutline) {
    const box = typoInfo.boxes[selectedLayer];
    if (box) {
      const hit = handleRects(box, sc).find(h => Math.abs(pt.x - h.x) <= h.r * 2 && Math.abs(pt.y - h.y) <= h.r * 2);
      if (hit) return { layer: selectedLayer, mode: 'resize' };
    }
  }
  for (const name of ['title', 'subtitle', 'billing']) {
    const b = typoInfo.boxes[name];
    if (b && pt.x >= b.x - pad && pt.x <= b.x + b.w + pad && pt.y >= b.y - pad && pt.y <= b.y + b.h + pad) return { layer: name, mode: 'move' };
  }
  return null;
}

function initCanvasText() {
  const canvas = api.canvas;
  let drag = null;
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; api.redraw(); syncTypeControls(); }); };

  canvas.addEventListener('pointerdown', (e) => {
    const pt = api.getCanvasCoords(e);
    const hit = hitText(pt);
    if (!hit) {
      showTextOutline = false;
      // Clicking a photo panel targets that panel for colour edits.
      const idx = api.getPanelAtPoint(pt.x, pt.y);
      if (idx !== -1) { setScope('panel', false); setTimeout(syncColourControls, 0); }
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    selectedLayer = hit.layer;
    showTextOutline = true;
    const L = layers()[hit.layer];
    const e0 = eff(hit.layer);
    const box = typoInfo.boxes[hit.layer];
    drag = {
      mode: hit.mode, start: pt, x0: L.x ?? e0.x, y0: L.y ?? e0.y, size0: L.size ?? e0.size,
      cx: box.x + box.w / 2, cy: box.y + box.h / 2, align: L.align,
      boxCx0: (box.x + box.w / 2) / canvas.width * 100,
    };
    drag.d0 = Math.hypot(pt.x - drag.cx, pt.y - drag.cy) || 1;
    if (window.matchMedia('(max-width: 900px)').matches) openSheetTab('type', false);
    syncTypeControls();
    api.redraw();
  }, true);

  canvas.addEventListener('pointermove', (e) => {
    const pt = api.getCanvasCoords(e);
    if (!drag) {
      if (e.pointerType === 'mouse') {
        const hit = hitText(pt);
        canvas.style.cursor = hit ? (hit.mode === 'resize' ? 'nwse-resize' : 'move') : 'crosshair';
      }
      return;
    }
    e.stopImmediatePropagation();
    const L = layers()[selectedLayer];
    if (drag.mode === 'resize') {
      const d = Math.hypot(pt.x - drag.cx, pt.y - drag.cy);
      const R = LAYER_RANGES[selectedLayer].size;
      L.size = clamp(drag.size0 * d / drag.d0, R[0], R[1]);
      if (L.x == null) { L.x = drag.x0; L.y = drag.y0; }
    } else {
      let nx = drag.x0 + (pt.x - drag.start.x) / canvas.width * 100;
      let ny = drag.y0 + (pt.y - drag.start.y) / canvas.height * 100;
      guide = null;
      // Snap the block centre to the poster's vertical centre line.
      const boxCx = drag.boxCx0 + (nx - drag.x0);
      if (Math.abs(boxCx - 50) < 1.4) { nx += 50 - boxCx; guide = { x: 50 }; }
      L.x = clamp(nx, 0, 100);
      L.y = clamp(ny, 2, 98);
    }
    schedule();
  }, true);

  const end = () => { if (drag) { drag = null; guide = null; schedule(); commitSoon(30); } };
  canvas.addEventListener('pointerup', end, true);
  canvas.addEventListener('pointercancel', end, true);
}

export function drawEditorOverlay(canvas) {
  if (!api) return;
  const ctx = canvas.getContext('2d');
  const sc = canvasScale();
  ctx.save();
  if (colourScope === 'panel' && api.state.activePanelIndex >= 0) {
    const p = computePanelPixelRects(api.state.layout, canvas.width, canvas.height)[api.state.activePanelIndex];
    if (p) {
      const label = `PANEL ${String(api.state.activePanelIndex + 1).padStart(2, '0')}`;
      ctx.font = `600 ${Math.round(12 * sc)}px Oswald, sans-serif`;
      const tw = ctx.measureText(label).width + 14 * sc;
      ctx.fillStyle = 'rgba(20, 14, 32, .82)';
      ctx.fillRect(p.x + 8 * sc, p.y + 8 * sc, tw, 22 * sc);
      ctx.fillStyle = '#d9ccff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, p.x + 15 * sc, p.y + 19 * sc);
    }
  }
  if (showTextOutline && typoInfo.boxes[selectedLayer]) {
    const b = typoInfo.boxes[selectedLayer];
    ctx.strokeStyle = typoInfo.overflow?.[selectedLayer] ? '#ff6b81' : '#c9b6ff';
    ctx.lineWidth = Math.max(1, 1.2 * sc);
    ctx.setLineDash([5 * sc, 4 * sc]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    handleRects(b, sc).forEach(h => { ctx.fillRect(h.x - h.r / 2, h.y - h.r / 2, h.r, h.r); ctx.strokeRect(h.x - h.r / 2, h.y - h.r / 2, h.r, h.r); });
  }
  if (guide) {
    ctx.strokeStyle = 'rgba(201, 182, 255, .9)';
    ctx.lineWidth = Math.max(1, sc);
    ctx.beginPath(); ctx.moveTo(canvas.width * guide.x / 100, 0); ctx.lineTo(canvas.width * guide.x / 100, canvas.height); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- colour scope
function localGrade(create) {
  const s = api.state;
  const i = s.activePanelIndex < 0 ? 0 : s.activePanelIndex;
  if (!s.panelGrades) s.panelGrades = [];
  if (!s.panelGrades[i] && create) s.panelGrades[i] = { preset: s.colorPreset, intensity: 0.75, adjustments: { exposure: 0, contrast: 0, saturation: 0 } };
  return s.panelGrades[i] || null;
}

function setScope(scope, redraw = true) {
  colourScope = scope;
  document.querySelectorAll('.scope-seg .seg-btn').forEach(b => {
    const on = b.dataset.scope === scope;
    b.classList.toggle('active', on); b.setAttribute('aria-checked', on);
  });
  $('panel-target').hidden = scope !== 'panel';
  syncColourControls();
  if (redraw) api.redraw();
}

function syncColourControls() {
  const s = api.state;
  const local = colourScope === 'panel' ? localGrade(false) : null;
  const presetId = colourScope === 'panel' ? (local?.preset ?? null) : s.colorPreset;
  const intensity = colourScope === 'panel' ? (local?.intensity ?? 0) : s.colorIntensity;
  const adj = colourScope === 'panel' ? (local?.adjustments || { exposure: 0, contrast: 0, saturation: 0 }) : s.adjustments;
  document.querySelectorAll('#preset-picker .preset-btn').forEach((b, i) => {
    const id = PRESET_IDS[i];
    b.classList.toggle('active', id === presetId);
  });
  $('grade-intensity').value = intensity;
  $('grade-val').textContent = `${Math.round(intensity * 100)}%`;
  const n = String((s.activePanelIndex < 0 ? 0 : s.activePanelIndex) + 1).padStart(2, '0');
  $('panel-target-label').textContent = `PANEL ${n}`;
  $('panel-target-note').textContent = local ? 'Own look' : 'Using poster look';
  $('reset-local').disabled = !(s.panelGrades || []).some(Boolean);
}

let PRESET_IDS = [];
function initColour(presets) {
  PRESET_IDS = presets.map(p => p.id);
  document.querySelectorAll('.scope-seg .seg-btn').forEach(b => b.addEventListener('click', () => setScope(b.dataset.scope)));
  // Intercept preset + intensity while a single panel is targeted.
  $('preset-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    const id = PRESET_IDS[[...btn.parentNode.children].indexOf(btn)];
    if (colourScope === 'panel') {
      e.stopImmediatePropagation();
      const g = localGrade(true);
      g.preset = id;
      if (!g.intensity) g.intensity = 0.75;
      api.redraw();
    }
    setTimeout(syncColourControls, 0);
  }, true);
  $('grade-intensity').addEventListener('input', (e) => {
    if (colourScope !== 'panel') return;
    e.stopImmediatePropagation();
    const g = localGrade(true);
    g.intensity = parseFloat(e.target.value);
    $('grade-val').textContent = `${Math.round(g.intensity * 100)}%`;
    api.redraw();
  }, true);
  $('reset-adjust').addEventListener('click', () => {
    if (colourScope === 'panel') { const g = localGrade(false); if (g) g.intensity = 0.75; }
    else api.state.colorIntensity = 0.75;
    syncColourControls(); api.redraw();
  });
  $('reset-local').addEventListener('click', () => {
    const s = api.state;
    if (colourScope === 'panel') { if (s.panelGrades) s.panelGrades[s.activePanelIndex] = null; }
    else s.panelGrades = [];
    syncColourControls(); api.redraw();
  });
  $('reset-colour').addEventListener('click', () => {
    const s = api.state;
    s.colorPreset = 'golden-hour'; s.colorIntensity = 0.75; s.adjustments = { exposure: 0, contrast: 0, saturation: 0 }; s.panelGrades = [];
    setScope('global', false); syncColourControls(); api.redraw();
  });
  const step = (d) => {
    const s = api.state;
    const n = computePanelPixelRects(s.layout, s.canvasWidth, s.canvasHeight).length;
    api.setActivePanel(((s.activePanelIndex < 0 ? 0 : s.activePanelIndex) + d + n) % n);
    syncColourControls();
  };
  $('panel-prev').addEventListener('click', () => step(-1));
  $('panel-next').addEventListener('click', () => step(1));
  // Keep the target label in sync when a panel pill is chosen.
  $('panel-pills-container')?.addEventListener('click', () => setTimeout(syncColourControls, 0));
}

// ---------------------------------------------------------------- layout: canvas fit, header export, mobile sheet
function fitCanvas() {
  const wrap = $('canvas-wrapper');
  const stage = $('canvas-stage');
  if (!wrap || !stage) return;
  const r = wrap.getBoundingClientRect();
  const ar = api.state.canvasWidth / api.state.canvasHeight;
  let w = r.width, h = w / ar;
  if (h > r.height) { h = r.height; w = h * ar; }
  stage.style.width = `${Math.floor(w)}px`;
  stage.style.height = `${Math.floor(h)}px`;
}

const TAB_SECTIONS = {
  photos: ['sec-photos'],
  layout: ['sec-compose', 'sec-crop'],
  type: ['sec-lettering', 'sec-typelayout'],
  colour: ['sec-grade'],
  export: ['sec-export'],
};
const homes = new Map();
let mobile = false;
let activeTab = 'photos';

function openSheetTab(tab, expand = true) {
  activeTab = tab;
  document.querySelectorAll('.sheet-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  Object.entries(TAB_SECTIONS).forEach(([k, ids]) => ids.forEach(id => { const el = $(id); if (el) el.classList.toggle('sheet-hidden', k !== tab); }));
  const sheet = $('sheet');
  if (expand && sheet.dataset.state === 'peek') sheet.dataset.state = 'half';
  if (tab === 'colour') setScope(colourScope, false);
  requestAnimationFrame(fitCanvas);
}

function setMobile(on) {
  mobile = on;
  const body = $('sheet-body');
  Object.values(TAB_SECTIONS).flat().forEach(id => {
    const el = $(id);
    if (!el) return;
    if (on) {
      if (!homes.has(id)) homes.set(id, { parent: el.parentNode, next: el.nextSibling });
      body.appendChild(el);
    } else if (homes.has(id)) {
      const h = homes.get(id);
      h.parent.insertBefore(el, h.next && h.next.parentNode === h.parent ? h.next : null);
      el.classList.remove('sheet-hidden');
    }
  });
  if (!on) { // restore original right-column order
    const right = document.querySelector('.sidebar-right');
    ['sec-compose', 'sec-grade', 'sec-lettering', 'sec-typelayout', 'sec-crop', 'sec-export'].forEach(id => right.appendChild($(id)));
    document.querySelector('.sidebar-left').insertBefore($('sec-photos'), document.querySelector('.library-note'));
  }
  if (on) openSheetTab(activeTab, false);
  requestAnimationFrame(fitCanvas);
}

function initSheet() {
  const sheet = $('sheet');
  const order = ['peek', 'half', 'full'];
  document.querySelectorAll('.sheet-tab').forEach(t => t.addEventListener('click', () => openSheetTab(t.dataset.tab)));
  const handle = $('sheet-handle');
  let startY = null, moved = false;
  handle.addEventListener('pointerdown', (e) => { startY = e.clientY; moved = false; handle.setPointerCapture?.(e.pointerId); });
  handle.addEventListener('pointermove', (e) => { if (startY != null && Math.abs(e.clientY - startY) > 24) moved = true; });
  handle.addEventListener('pointerup', (e) => {
    if (startY == null) return;
    const i = order.indexOf(sheet.dataset.state);
    if (moved) sheet.dataset.state = order[clamp(i + (e.clientY < startY ? 1 : -1), 0, 2)];
    else sheet.dataset.state = order[(i + 1) % 3];
    startY = null;
    requestAnimationFrame(fitCanvas);
  });
  const mq = window.matchMedia('(max-width: 900px)');
  setMobile(mq.matches);
  mq.addEventListener('change', (e) => setMobile(e.matches));
}

function syncAll() {
  syncTypeControls();
  syncColourControls();
  fitCanvas();
}

export function initPlus(a) {
  api = a;
  initHistory();
  initTypeControls();
  import('./colorGrades.js').then(({ COLOR_PRESETS }) => { initColour(COLOR_PRESETS); syncColourControls(); });
  initCanvasText();
  initSheet();
  $('btn-head-export')?.addEventListener('click', async () => {
    const s = api.state;
    const name = `neon-panel-${s.canvasWidth}x${s.canvasHeight}.png`;
    const st = $('export-status');
    try { await api.exportCoverPng(s, s.canvasWidth, s.canvasHeight, name); if (st) st.textContent = `Saved ${name}!`; }
    catch (err) { if (st) st.textContent = `Export error: ${err.message}`; }
  });
  window.addEventListener('resize', fitCanvas);
  new ResizeObserver(fitCanvas).observe($('canvas-wrapper'));
  // Keep fit + controls in sync with any aspect/layout change, and seed history once content has loaded.
  const origRedraw = api.redraw;
  let seeded = false;
  api.redraw = (...args) => { origRedraw(...args); };
  document.addEventListener('click', () => requestAnimationFrame(() => { fitCanvas(); syncTypeControls(); }));
  const seed = () => { if (!seeded && api.state.panelPhotos.some(Boolean)) { seeded = true; commit(); syncAll(); } else if (!seeded) setTimeout(seed, 150); };
  seed();
  setTimeout(syncAll, 200);
}
