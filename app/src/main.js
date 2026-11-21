// Neon Panel: wires the studio together. The state document lives in state.js, the poster in renderer.js, and this
// file owns the DOM, the pointer gestures, the responsive sheet, history commits and exports.

import {
  ASPECTS,
  ASPECT_KEYS,
  SAMPLE_PHOTOS,
  createInitialState,
  ensurePanels,
  fillSampleCast,
  selectedPanel,
  activeGrade,
  setActiveGrade,
  clamp,
} from './state.js';
import { LAYOUTS, panelCount } from './layouts.js';
import { PRESETS } from './colorGrades.js';
import {
  FONTS,
  TEMPLATES,
  TEMPLATE_ORDER,
  LAYER_RANGES,
  templateLayers,
  renderTemplateThumb,
} from './typography.js';
import { renderPoster, rendererState, panelIndexAt, layerBoxAt, handleAt } from './renderer.js';
import { createHistory } from './history.js';
import { exportPoster, ensureFonts } from './export.js';
import { parseShot, applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const shot = parseShot(location.search);
let state = createInitialState();
applyShot(state, shot);
if (shot.shot === 'cover') document.body.classList.add('shot-cover');

const library = new Map();
library.version = 0;
let uploadSeq = 0;

const canvas = $('poster');
const stage = $('stage');
const mobileMedia = window.matchMedia('(max-width: 900px)');

let hoverLayer = null;
let focusedLayer = null;
let dragging = null;
let snapX = false;
let activeLayerName = 'title';
let renderRaf = 0;
let layoutRaf = 0;
let thumbTimer = 0;
let toastTimer = 0;
let sheetCycle = 0;
let sheetHeight = 18;

const templateCanvases = new Map();
const cardOrigins = [];

// ---------------------------------------------------------------- utilities

function fmt0(v) {
  return String(Math.round(v));
}
function fmt1(v) {
  return (Math.round(v * 10) / 10).toFixed(1);
}
function fmt2(v) {
  return (Math.round(v * 100) / 100).toFixed(2);
}
function setInput(el, value) {
  if (document.activeElement !== el) el.value = String(value);
}
function pad2(n) {
  return String(n).padStart(2, '0');
}
function toast(message) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

// ---------------------------------------------------------------- library

async function loadSamples() {
  const images = await Promise.all(
    SAMPLE_PHOTOS.map((s) => loadImage(`samples/${s.file}`).catch(() => null)),
  );
  SAMPLE_PHOTOS.forEach((s, i) => {
    if (images[i]) {
      library.set(s.id, {
        id: s.id,
        name: s.name,
        src: `samples/${s.file}`,
        image: images[i],
        kind: 'sample',
      });
    }
  });
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) => /^image\/(jpeg|png|webp)$/i.test(f.type));
  const added = [];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      const id = `upload-${++uploadSeq}`;
      const clean = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 26);
      const name = clean ? clean.replace(/\b\w/g, (c) => c.toUpperCase()) : `Upload ${uploadSeq}`;
      library.set(id, { id, name, src: url, image, kind: 'upload' });
      added.push(id);
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (added.length === 0) return;
  library.version++;
  ensurePanels(state);
  const count = panelCount(state.layout);
  for (let i = 0; i < added.length; i++) {
    const idx = (state.selectedPanel + i) % count;
    state.panels[idx].photoId = added[i];
  }
  buildSampleGrid();
  renderAll();
  syncUI();
  history.commit();
  toast(`${added.length} photo${added.length === 1 ? '' : 's'} added`);
}

function buildSampleGrid() {
  const grid = $('sampleGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const entry of library.values()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sample-thumb';
    btn.draggable = true;
    btn.dataset.photoId = entry.id;
    btn.title = `${entry.name} — click to place on the selected panel`;
    const img = document.createElement('img');
    img.src = entry.src;
    img.alt = '';
    img.draggable = false;
    const label = document.createElement('span');
    label.textContent = entry.name;
    btn.append(img, label);
    btn.addEventListener('click', () => {
      ensurePanels(state);
      state.panels[state.selectedPanel].photoId = entry.id;
      renderAll();
      syncUI();
      history.commit();
    });
    btn.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', entry.id);
      e.dataTransfer.effectAllowed = 'copy';
    });
    grid.appendChild(btn);
  }
  const counter = $('imageCount');
  if (counter) counter.textContent = `${library.size} IMAGE${library.size === 1 ? '' : 'S'}`;
}

// ---------------------------------------------------------------- UI builders

const LAYOUT_ICONS = {
  keyArt:
    '<svg viewBox="0 0 24 20" preserveAspectRatio="none"><rect width="10" height="20" fill="#ff5b9c"/><rect x="12" width="5" height="9" fill="#f7bd68"/><rect x="19" width="5" height="9" fill="#66e4eb"/><rect x="12" y="11" width="3" height="9" fill="#c9b6ff"/><rect x="17" y="11" width="3" height="9" fill="#ff8a6b"/><rect x="22" y="11" width="2" height="9" fill="#ff5b9c"/></svg>',
  heroFour:
    '<svg viewBox="0 0 24 20" preserveAspectRatio="none"><rect width="12" height="20" fill="#ff5b9c"/><rect x="14" width="4" height="9" fill="#f7bd68"/><rect x="20" width="4" height="9" fill="#66e4eb"/><rect x="14" y="11" width="4" height="9" fill="#c9b6ff"/><rect x="20" y="11" width="4" height="9" fill="#ff8a6b"/></svg>',
  mosaic:
    '<svg viewBox="0 0 24 20" preserveAspectRatio="none"><rect width="7" height="9" fill="#ff5b9c"/><rect x="8.5" width="7" height="9" fill="#f7bd68"/><rect x="17" width="7" height="9" fill="#66e4eb"/><rect y="11" width="7" height="9" fill="#c9b6ff"/><rect x="8.5" y="11" width="7" height="9" fill="#ff8a6b"/><rect x="17" y="11" width="7" height="9" fill="#ff5b9c"/></svg>',
  split:
    '<svg viewBox="0 0 24 20" preserveAspectRatio="none"><polygon points="0,0 24,0 12,10" fill="#ff5b9c"/><polygon points="24,0 24,20 12,10" fill="#66e4eb"/><polygon points="24,20 0,20 12,10" fill="#f7bd68"/><polygon points="0,20 0,0 12,10" fill="#c9b6ff"/></svg>',
  bleed:
    '<svg viewBox="0 0 24 20" preserveAspectRatio="none"><rect width="24" height="20" fill="#ff5b9c"/><rect x="3" y="3" width="18" height="14" fill="none" stroke="#f7bd68" stroke-width="1"/></svg>',
};

function buildLayoutTiles() {
  const wrap = $('layoutTiles');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (const info of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.layout = info.key;
    const icon = document.createElement('span');
    icon.className = 'tile-icon';
    icon.innerHTML = LAYOUT_ICONS[info.key] || LAYOUT_ICONS.mosaic;
    const text = document.createElement('span');
    text.className = 'tile-text';
    const name = document.createElement('span');
    name.className = 'tile-name';
    name.textContent = info.name;
    const count = document.createElement('span');
    count.className = 'tile-count';
    count.textContent = `${info.count} PANEL${info.count === 1 ? '' : 'S'}`;
    text.append(name, count);
    btn.append(icon, text);
    btn.addEventListener('click', () => {
      state.layout = info.key;
      ensurePanels(state);
      renderAll();
      syncUI();
      history.commit();
    });
    wrap.appendChild(btn);
  }
}

function buildFormatTiles() {
  const wrap = $('formatTiles');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (const key of ASPECT_KEYS) {
    const aspect = ASPECTS[key];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'format-tile';
    btn.dataset.aspect = key;
    const name = document.createElement('strong');
    name.textContent = aspect.name.toUpperCase();
    const size = document.createElement('span');
    size.textContent = `${aspect.w} × ${aspect.h}`;
    btn.append(name, size);
    btn.addEventListener('click', () => {
      state.aspect = key;
      layoutCanvas(true);
      syncUI();
      history.commit();
    });
    wrap.appendChild(btn);
  }
}

function buildPresetChips() {
  const wrap = $('presetChips');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-chip';
    btn.dataset.preset = preset.key;
    const swatch = document.createElement('i');
    swatch.style.background = `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`;
    const label = document.createElement('span');
    label.textContent = preset.name;
    btn.append(swatch, label);
    btn.addEventListener('click', () => {
      setActiveGrade(state, { preset: preset.key });
      renderAll();
      syncUI();
      history.commit();
    });
    wrap.appendChild(btn);
  }
}

function buildTemplateCards() {
  const wrap = $('templateRow');
  if (!wrap) return;
  wrap.innerHTML = '';
  templateCanvases.clear();
  for (const key of TEMPLATE_ORDER) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'template-card';
    card.dataset.template = key;
    const c = document.createElement('canvas');
    c.width = 184;
    c.height = 84;
    const label = document.createElement('span');
    label.textContent = TEMPLATES[key].name;
    card.append(c, label);
    card.addEventListener('click', () => applyTemplate(key));
    wrap.appendChild(card);
    templateCanvases.set(key, c);
  }
}

function buildFontSelect() {
  const select = $('fontSelect');
  if (!select) return;
  select.innerHTML = '';
  for (const font of FONTS) {
    const option = document.createElement('option');
    option.value = font.family;
    option.textContent = font.label;
    select.appendChild(option);
  }
}

function renderTemplateThumbs() {
  for (const [key, c] of templateCanvases) {
    renderTemplateThumb(c, key, state.text.title || 'NEON LIGHTS', state.preset);
  }
}

function scheduleThumbRefresh() {
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(renderTemplateThumbs, 240);
}

function applyTemplate(key) {
  state.lettering.template = key;
  state.lettering.layers = templateLayers(key);
  activeLayerName = 'title';
  focusedLayer = null;
  renderAll();
  syncUI();
  scheduleThumbRefresh();
  history.commit();
}

// ---------------------------------------------------------------- rendering

function activeOutlineLayer() {
  if (dragging && (dragging.type === 'lettering' || dragging.type === 'resize')) return dragging.layer;
  return hoverLayer || focusedLayer || null;
}

function renderAll() {
  if (!canvas || !canvas.width || !canvas.height) return;
  renderPoster(canvas, state, {
    library,
    activeLayer: activeOutlineLayer(),
    snapX,
  });
  updateTooWide();
}

function queueRender() {
  if (renderRaf) return;
  renderRaf = requestAnimationFrame(() => {
    renderRaf = 0;
    renderAll();
  });
}

function updateTooWide() {
  const warning = $('tooWide');
  if (warning) warning.hidden = !(state.autoFit === false && rendererState.tooWide);
}

function layoutCanvas(force = false) {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let cssW;
  let cssH;

  if (shot.shot === 'cover') {
    cssW = window.innerWidth;
    cssH = window.innerHeight;
  } else   if (mobileMedia.matches) {
    cssW = Math.max(240, document.documentElement.clientWidth);
    const ar = ASPECTS[state.aspect].w / ASPECTS[state.aspect].h;
    cssH = cssW / ar;
  } else {
    const rect = stage.getBoundingClientRect();
    const ar = ASPECTS[state.aspect].w / ASPECTS[state.aspect].h;
    cssW = Math.max(240, rect.width - 6);
    cssH = cssW / ar;
    if (cssH > rect.height - 6) {
      cssH = Math.max(140, rect.height - 6);
      cssW = cssH * ar;
    }
  }

  const bw = Math.max(2, Math.round(cssW * dpr));
  const bh = Math.max(2, Math.round(cssH * dpr));
  if (!force && canvas.width === bw && canvas.height === bh && canvas.style.width === `${cssW}px` && canvas.style.height === `${cssH}px`) {
    return;
  }
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = bw;
  canvas.height = bh;
  renderAll();
}

function queueLayout() {
  if (layoutRaf) return;
  layoutRaf = requestAnimationFrame(() => {
    layoutRaf = 0;
    layoutCanvas();
  });
}

// ---------------------------------------------------------------- sync

function updateHistoryButtons() {
  const undo = $('undo');
  const redo = $('redo');
  const mu = $('mobileUndo');
  const mr = $('mobileRedo');
  if (undo) undo.disabled = !history.canUndo();
  if (redo) redo.disabled = !history.canRedo();
  if (mu) mu.disabled = !history.canUndo();
  if (mr) mr.disabled = !history.canRedo();
}

function syncLayerControls() {
  const layer = state.lettering.layers[activeLayerName];
  if (!layer) return;
  const defs = [
    { prop: 'size', range: 'sizeRange', number: 'sizeNumber', out: 'sizeValue', step: 1, format: fmt0 },
    { prop: 'spacing', range: 'spacingRange', number: 'spacingNumber', out: 'spacingValue', step: 0.1, format: fmt1 },
    { prop: 'lineHeight', range: 'lineHeightRange', number: 'lineHeightNumber', out: 'lineHeightValue', step: 0.01, format: fmt2 },
    { prop: 'x', range: 'xRange', number: 'xNumber', out: 'xValue', step: 0.5, format: fmt1, limits: [0, 100] },
    { prop: 'y', range: 'yRange', number: 'yNumber', out: 'yValue', step: 0.5, format: fmt1, limits: [0, 100] },
  ];
  for (const def of defs) {
    const limits = def.limits || LAYER_RANGES[activeLayerName][def.prop];
    const range = $(def.range);
    const number = $(def.number);
    const out = $(def.out);
    if (range) {
      range.min = String(limits[0]);
      range.max = String(limits[1]);
      range.step = String(def.step);
      range.value = String(layer[def.prop]);
    }
    if (number) {
      number.min = String(limits[0]);
      number.max = String(limits[1]);
      number.step = String(def.step);
      setInput(number, def.format(layer[def.prop]));
    }
    if (out) out.textContent = def.format(layer[def.prop]);
  }
  const select = $('fontSelect');
  if (select) select.value = layer.font;
}

function updateCropUI() {
  const panel = selectedPanel(state);
  if (!panel) return;
  const label = `PANEL ${pad2(state.selectedPanel + 1)}`;
  if ($('cropPanelLabel')) $('cropPanelLabel').textContent = label;
  if ($('panelPickerLabel')) $('panelPickerLabel').textContent = label;
  setInput($('cropZoom'), panel.zoom.toFixed(2));
  if ($('cropZoomValue')) $('cropZoomValue').textContent = `${panel.zoom.toFixed(2)}×`;
  setInput($('cropX'), Math.round(panel.ox * 100));
  if ($('cropXValue')) $('cropXValue').textContent = `${Math.round(panel.ox * 100)}%`;
  setInput($('cropY'), Math.round(panel.oy * 100));
  if ($('cropYValue')) $('cropYValue').textContent = `${Math.round(panel.oy * 100)}%`;
}

function syncUI() {
  const title = state.text.title || 'UNTITLED';
  if ($('currentTitle')) $('currentTitle').textContent = title;
  if ($('mobileCurrentTitle')) $('mobileCurrentTitle').textContent = title;

  const meta = ASPECTS[state.aspect]?.label || '';
  if ($('aspectMeta')) $('aspectMeta').textContent = meta;
  if ($('mobileAspectMeta')) $('mobileAspectMeta').textContent = meta;

  document.querySelectorAll('#layoutTiles [data-layout]').forEach((el) => {
    el.classList.toggle('active', el.dataset.layout === state.layout);
  });
  document.querySelectorAll('#formatTiles [data-aspect]').forEach((el) => {
    el.classList.toggle('active', el.dataset.aspect === state.aspect);
  });

  const scopeAll = $('scopeAll');
  const scopePanel = $('scopePanel');
  if (scopeAll) scopeAll.classList.toggle('active', state.gradeScope === 'all');
  if (scopePanel) scopePanel.classList.toggle('active', state.gradeScope === 'panel');

  updateCropUI();

  const grade = activeGrade(state);
  document.querySelectorAll('#presetChips [data-preset]').forEach((el) => {
    el.classList.toggle('active', el.dataset.preset === grade.preset);
  });
  const intensity = $('intensity');
  const intensityValue = $('intensityValue');
  const pct = Math.round(grade.intensity * 100);
  if (intensity) setInput(intensity, pct);
  if (intensityValue) intensityValue.textContent = `${pct}%`;

  const bindings = [
    ['titleInput', 'title'],
    ['subtitleInput', 'subtitle'],
    ['quoteInput', 'quote'],
    ['sealInput', 'seal'],
    ['taglineInput', 'tagline'],
  ];
  for (const [id, key] of bindings) {
    const el = $(id);
    if (el) setInput(el, state.text[key]);
  }

  if ($('placementBelow')) $('placementBelow').classList.toggle('active', state.lettering.placement !== 'over');
  if ($('placementOver')) $('placementOver').classList.toggle('active', state.lettering.placement === 'over');

  document.querySelectorAll('#templateRow [data-template]').forEach((el) => {
    el.classList.toggle('active', el.dataset.template === state.lettering.template);
  });

  document.querySelectorAll('#layerTabs [data-layer]').forEach((el) => {
    const active = el.dataset.layer === activeLayerName;
    el.classList.toggle('active', active);
    el.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  syncLayerControls();

  const autoFit = $('autoFit');
  if (autoFit) autoFit.checked = state.autoFit;

  const counter = $('imageCount');
  if (counter) counter.textContent = `${library.size} IMAGE${library.size === 1 ? '' : 'S'}`;

  const current = selectedPanel(state);
  document.querySelectorAll('#sampleGrid [data-photo-id]').forEach((el) => {
    el.classList.toggle('active', current && el.dataset.photoId === current.photoId);
  });

  updateHistoryButtons();
  updateTooWide();
}

// ---------------------------------------------------------------- history

const history = createHistory({
  getState: () => state,
  setState: (next) => {
    state = next;
    ensurePanels(state);
    renderAll();
    syncUI();
    scheduleThumbRefresh();
  },
  onChange: () => updateHistoryButtons(),
});

// ---------------------------------------------------------------- events

function bindLayerControls() {
  const defs = [
    { prop: 'size', range: 'sizeRange', number: 'sizeNumber', out: 'sizeValue', step: 1, format: fmt0 },
    { prop: 'spacing', range: 'spacingRange', number: 'spacingNumber', out: 'spacingValue', step: 0.1, format: fmt1 },
    { prop: 'lineHeight', range: 'lineHeightRange', number: 'lineHeightNumber', out: 'lineHeightValue', step: 0.01, format: fmt2 },
    { prop: 'x', range: 'xRange', number: 'xNumber', out: 'xValue', step: 0.5, format: fmt1, limits: [0, 100] },
    { prop: 'y', range: 'yRange', number: 'yNumber', out: 'yValue', step: 0.5, format: fmt1, limits: [0, 100] },
  ];
  for (const def of defs) {
    const range = $(def.range);
    const number = $(def.number);
    const out = $(def.out);
    if (!range || !number) continue;
    const apply = (raw) => {
      const limits = def.limits || LAYER_RANGES[activeLayerName][def.prop];
      const value = clamp(Number(raw) || 0, limits[0], limits[1]);
      const layer = state.lettering.layers[activeLayerName];
      layer[def.prop] = value;
      range.value = String(value);
      number.value = def.format(value);
      if (out) out.textContent = def.format(value);
      focusedLayer = activeLayerName;
      renderAll();
      history.scheduleCommit();
    };
    range.addEventListener('input', () => apply(range.value));
    range.addEventListener('change', () => history.commit());
    number.addEventListener('input', () => {
      if (number.value !== '') apply(number.value);
    });
    number.addEventListener('change', () => {
      apply(number.value);
      history.commit();
    });
  }
}

function bindCropControls() {
  const zoom = $('cropZoom');
  const cx = $('cropX');
  const cy = $('cropY');
  if (zoom) {
    zoom.addEventListener('input', () => {
      const panel = selectedPanel(state);
      panel.zoom = clamp(Number(zoom.value) || 1, 1, 3);
      updateCropUI();
      renderAll();
      history.scheduleCommit();
    });
    zoom.addEventListener('change', () => history.commit());
  }
  if (cx) {
    cx.addEventListener('input', () => {
      const panel = selectedPanel(state);
      panel.ox = clamp((Number(cx.value) || 0) / 100, -1, 1);
      updateCropUI();
      renderAll();
      history.scheduleCommit();
    });
    cx.addEventListener('change', () => history.commit());
  }
  if (cy) {
    cy.addEventListener('input', () => {
      const panel = selectedPanel(state);
      panel.oy = clamp((Number(cy.value) || 0) / 100, -1, 1);
      updateCropUI();
      renderAll();
      history.scheduleCommit();
    });
    cy.addEventListener('change', () => history.commit());
  }
  if ($('resetCrop')) {
    $('resetCrop').addEventListener('click', () => {
      const panel = selectedPanel(state);
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      updateCropUI();
      renderAll();
      history.commit();
    });
  }
}

function bindTextInputs() {
  const bindings = [
    ['titleInput', 'title'],
    ['subtitleInput', 'subtitle'],
    ['quoteInput', 'quote'],
    ['sealInput', 'seal'],
    ['taglineInput', 'tagline'],
  ];
  for (const [id, key] of bindings) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener('input', () => {
      state.text[key] = el.value;
      if (key === 'title') {
        if ($('currentTitle')) $('currentTitle').textContent = el.value || 'UNTITLED';
        if ($('mobileCurrentTitle')) $('mobileCurrentTitle').textContent = el.value || 'UNTITLED';
        scheduleThumbRefresh();
      }
      renderAll();
      history.scheduleCommit();
    });
    el.addEventListener('change', () => history.commit());
  }
}

function bindLetteringFocus() {
  const selector =
    '#letteringCard input, #letteringCard select, #letteringCard button, #typeCard input, #typeCard select, #typeCard button';
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener('focus', () => {
      focusedLayer = activeLayerName;
      renderAll();
    });
    el.addEventListener('blur', () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || !active.closest('#letteringCard, #typeCard')) {
          focusedLayer = null;
          renderAll();
        }
      }, 0);
    });
  });
}

function bindCanvas() {
  const point = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (shot.shot === 'cover') return;
    e.preventDefault();
    const p = point(e);
    canvas.setPointerCapture?.(e.pointerId);

    if (handleAt(p.x, p.y)) {
      const layerKey = activeOutlineLayer();
      if (layerKey) {
        const layer = state.lettering.layers[layerKey];
        const anchorX = (layer.x / 100) * canvas.width;
        const anchorY = (layer.y / 100) * canvas.height;
        dragging = {
          type: 'resize',
          layer: layerKey,
          startSize: layer.size,
          anchorX,
          anchorY,
          startDist: Math.max(1, Math.hypot(p.x - anchorX, p.y - anchorY)),
        };
        hoverLayer = layerKey;
        renderAll();
        return;
      }
    }

    const lettering = layerBoxAt(p.x, p.y);
    if (lettering) {
      const layer = state.lettering.layers[lettering];
      dragging = {
        type: 'lettering',
        layer: lettering,
        startX: p.x,
        startY: p.y,
        startLayerX: layer.x,
        startLayerY: layer.y,
      };
      hoverLayer = lettering;
      renderAll();
      return;
    }

    const index = panelIndexAt(p.x, p.y);
    if (index >= 0) {
      ensurePanels(state);
      state.selectedPanel = index;
      const panel = state.panels[index];
      const poly = rendererState.panelsPx[index];
      const xs = poly.map((v) => v.x);
      const ys = poly.map((v) => v.y);
      const bw = Math.max(1, Math.max(...xs) - Math.min(...xs));
      const bh = Math.max(1, Math.max(...ys) - Math.min(...ys));
      dragging = {
        type: 'panel',
        index,
        startX: p.x,
        startY: p.y,
        startOx: panel.ox,
        startOy: panel.oy,
        bw,
        bh,
        moved: false,
      };
      renderAll();
      syncUI();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (shot.shot === 'cover') return;
    const p = point(e);

    if (dragging) {
      if (dragging.type === 'lettering') {
        const layer = state.lettering.layers[dragging.layer];
        const dx = ((p.x - dragging.startX) / canvas.width) * 100;
        const dy = ((p.y - dragging.startY) / canvas.height) * 100;
        layer.x = clamp(dragging.startLayerX + dx, 0, 100);
        layer.y = clamp(dragging.startLayerY + dy, 0, 100);
        snapX = Math.abs(layer.x - 50) < 1.3;
        if (snapX) layer.x = 50;
        hoverLayer = dragging.layer;
        renderAll();
        syncLayerControls();
      } else if (dragging.type === 'resize') {
        const layer = state.lettering.layers[dragging.layer];
        const limits = LAYER_RANGES[dragging.layer].size;
        const dist = Math.hypot(p.x - dragging.anchorX, p.y - dragging.anchorY);
        layer.size = clamp((dragging.startSize * dist) / dragging.startDist, limits[0], limits[1]);
        hoverLayer = dragging.layer;
        renderAll();
        syncLayerControls();
      } else if (dragging.type === 'panel') {
        const panel = state.panels[dragging.index];
        const dx = (p.x - dragging.startX) / dragging.bw;
        const dy = (p.y - dragging.startY) / dragging.bh;
        if (Math.abs(p.x - dragging.startX) + Math.abs(p.y - dragging.startY) > 2) dragging.moved = true;
        panel.ox = clamp(dragging.startOx + dx, -1, 1);
        panel.oy = clamp(dragging.startOy + dy, -1, 1);
        renderAll();
        updateCropUI();
      }
      return;
    }

    const lettering = layerBoxAt(p.x, p.y);
    const nextHover = handleAt(p.x, p.y) ? activeOutlineLayer() : lettering;
    canvas.style.cursor = handleAt(p.x, p.y)
      ? 'nwse-resize'
      : lettering
        ? 'move'
        : panelIndexAt(p.x, p.y) >= 0
          ? 'grab'
          : 'crosshair';
    if (nextHover !== hoverLayer) {
      hoverLayer = nextHover;
      renderAll();
    }
  });

  const endDrag = (e) => {
    if (!dragging) return;
    const moved = dragging.type !== 'panel' || dragging.moved;
    dragging = null;
    snapX = false;
    canvas.releasePointerCapture?.(e.pointerId);
    renderAll();
    syncUI();
    if (moved) history.commit();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    if (!dragging && hoverLayer) {
      hoverLayer = null;
      renderAll();
    }
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      if (shot.shot === 'cover') return;
      e.preventDefault();
      const p = point(e);
      let index = panelIndexAt(p.x, p.y);
      if (index < 0) index = state.selectedPanel;
      ensurePanels(state);
      state.selectedPanel = index;
      const panel = state.panels[index];
      const factor = e.deltaY < 0 ? 1.08 : 0.926;
      panel.zoom = clamp((panel.zoom || 1) * factor, 1, 4);
      renderAll();
      syncUI();
      history.scheduleCommit(280);
    },
    { passive: false },
  );

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files);
      return;
    }
    const id = e.dataTransfer.getData('text/plain');
    if (!id || !library.has(id)) return;
    const p = point(e);
    const index = panelIndexAt(p.x, p.y);
    if (index < 0) return;
    ensurePanels(state);
    state.selectedPanel = index;
    state.panels[index].photoId = id;
    renderAll();
    syncUI();
    history.commit();
  });
}

function bindControls() {
  const undo = $('undo');
  const redo = $('redo');
  const mu = $('mobileUndo');
  const mr = $('mobileRedo');
  if (undo) undo.addEventListener('click', () => history.undo());
  if (redo) redo.addEventListener('click', () => history.redo());
  if (mu) mu.addEventListener('click', () => history.undo());
  if (mr) mr.addEventListener('click', () => history.redo());

  const exportTop = () => {
    const aspect = ASPECTS[state.aspect];
    runExport(aspect.w, aspect.h);
  };
  if ($('exportPng')) $('exportPng').addEventListener('click', exportTop);
  if ($('mobileExport')) $('mobileExport').addEventListener('click', exportTop);

  if ($('loadCast')) {
    $('loadCast').addEventListener('click', () => {
      fillSampleCast(state);
      renderAll();
      syncUI();
      history.commit();
      toast('Sample cast loaded');
    });
  }

  const dropZone = $('dropZone');
  const fileInput = $('fileInput');
  if (fileInput) fileInput.addEventListener('change', () => addFiles(fileInput.files));
  if (dropZone) {
    ['dragenter', 'dragover'].forEach((type) => {
      dropZone.addEventListener(type, (e) => {
        e.preventDefault();
        dropZone.classList.add('over');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      dropZone.addEventListener(type, (e) => {
        e.preventDefault();
        dropZone.classList.remove('over');
      });
    });
    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
  }

  if ($('scopeAll')) {
    $('scopeAll').addEventListener('click', () => {
      state.gradeScope = 'all';
      renderAll();
      syncUI();
      history.commit();
    });
  }
  if ($('scopePanel')) {
    $('scopePanel').addEventListener('click', () => {
      state.gradeScope = 'panel';
      renderAll();
      syncUI();
      history.commit();
    });
  }
  if ($('panelPrev')) {
    $('panelPrev').addEventListener('click', () => {
      const count = panelCount(state.layout);
      state.selectedPanel = (state.selectedPanel - 1 + count) % count;
      renderAll();
      syncUI();
    });
  }
  if ($('panelNext')) {
    $('panelNext').addEventListener('click', () => {
      const count = panelCount(state.layout);
      state.selectedPanel = (state.selectedPanel + 1) % count;
      renderAll();
      syncUI();
    });
  }

  const intensity = $('intensity');
  if (intensity) {
    intensity.addEventListener('input', () => {
      setActiveGrade(state, { intensity: clamp(Number(intensity.value) / 100, 0, 1) });
      renderAll();
      syncUI();
      history.scheduleCommit();
    });
    intensity.addEventListener('change', () => history.commit());
  }

  if ($('resetStrength')) {
    $('resetStrength').addEventListener('click', () => {
      setActiveGrade(state, { intensity: 0.75 });
      renderAll();
      syncUI();
      history.commit();
    });
  }
  if ($('removePanelLook')) {
    $('removePanelLook').addEventListener('click', () => {
      const panel = selectedPanel(state);
      if (panel) panel.local = null;
      renderAll();
      syncUI();
      history.commit();
    });
  }
  if ($('resetAllColour')) {
    $('resetAllColour').addEventListener('click', () => {
      state.preset = 'golden';
      state.intensity = 0.75;
      for (const panel of state.panels) panel.local = null;
      renderAll();
      syncUI();
      scheduleThumbRefresh();
      history.commit();
    });
  }

  document.querySelectorAll('#layerTabs [data-layer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeLayerName = btn.dataset.layer;
      focusedLayer = activeLayerName;
      syncUI();
      renderAll();
    });
  });

  if ($('fontSelect')) {
    $('fontSelect').addEventListener('change', () => {
      const layer = state.lettering.layers[activeLayerName];
      const font = FONTS.find((f) => f.family === $('fontSelect').value) || FONTS[0];
      layer.font = font.family;
      layer.weight = font.weight;
      renderAll();
      scheduleThumbRefresh();
      history.commit();
    });
  }

  if ($('placementBelow')) {
    $('placementBelow').addEventListener('click', () => {
      state.lettering.placement = 'below';
      renderAll();
      syncUI();
      history.commit();
    });
  }
  if ($('placementOver')) {
    $('placementOver').addEventListener('click', () => {
      state.lettering.placement = 'over';
      renderAll();
      syncUI();
      history.commit();
    });
  }

  document.querySelectorAll('#quickGrid button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qx = Number(btn.dataset.qx);
      const qy = Number(btn.dataset.qy);
      const layer = state.lettering.layers[activeLayerName];
      layer.x = [10, 50, 90][qx];
      layer.align = ['left', 'center', 'right'][qx];
      layer.y = 64 + 36 * [0.3, 0.6, 0.86][qy];
      focusedLayer = activeLayerName;
      renderAll();
      syncUI();
      history.commit();
    });
  });

  if ($('autoFit')) {
    $('autoFit').addEventListener('change', () => {
      state.autoFit = $('autoFit').checked;
      renderAll();
      syncUI();
      history.commit();
    });
  }
  if ($('resetLayer')) {
    $('resetLayer').addEventListener('click', () => {
      const defaults = templateLayers(state.lettering.template);
      state.lettering.layers[activeLayerName] = defaults[activeLayerName];
      renderAll();
      syncUI();
      scheduleThumbRefresh();
      history.commit();
    });
  }

  document.querySelectorAll('#exportCards [data-w]').forEach((btn) => {
    btn.addEventListener('click', () => {
      runExport(Number(btn.dataset.w), Number(btn.dataset.h));
    });
  });

  bindLayerControls();
  bindCropControls();
  bindTextInputs();
  bindLetteringFocus();
  bindCanvas();

  window.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const el = document.activeElement;
    const typing =
      el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    const key = e.key.toLowerCase();
    if (key === 'z') {
      if (typing) return;
      e.preventDefault();
      if (e.shiftKey) history.redo();
      else history.undo();
    } else if (key === 'y') {
      if (typing) return;
      e.preventDefault();
      history.redo();
    }
  });
}

async function runExport(width, height) {
  try {
    toast(`Rendering ${width} × ${height}…`);
    await exportPoster(state, {
      library,
      width,
      height,
      filename: `neon-panel-${width}x${height}.png`,
    });
    renderAll();
    toast(`Saved neon-panel-${width}x${height}.png`);
  } catch (err) {
    console.error(err);
    toast('Export failed');
  }
}

// ---------------------------------------------------------------- responsive sheet

function setSheetHeight(h) {
  sheetHeight = h;
  document.documentElement.style.setProperty('--sheet-h', `${h}vh`);
}

function setupSheet() {
  setSheetHeight(sheetHeight);
  const handle = $('sheetHandle');
  if (handle) {
    handle.addEventListener('click', () => {
      const cycle = [15, 55, 88];
      setSheetHeight(cycle[sheetCycle]);
      sheetCycle = (sheetCycle + 1) % cycle.length;
    });
  }
  document.querySelectorAll('#sheetTabs [data-sheet-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.sheetTab;
      document.querySelectorAll('#sheetTabs [data-sheet-tab]').forEach((el) => {
        const active = el === tab;
        el.classList.toggle('active', active);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('[data-sheet-panel]').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.sheetPanel === name);
      });
      sheetCycle = 2;
      setSheetHeight(55);
    });
  });
}

function moveCardsToSheet() {
  const mapping = [
    ['photosCard', 'photos'],
    ['privacyNote', 'photos'],
    ['compositionCard', 'layout'],
    ['cropCard', 'layout'],
    ['letteringCard', 'type'],
    ['typeCard', 'type'],
    ['gradeCard', 'colour'],
    ['exportCard', 'export'],
  ];
  for (const [id, tab] of mapping) {
    const el = $(id);
    if (!el) continue;
    if (!cardOrigins.some((entry) => entry.el === el)) {
      const parent = el.parentNode;
      const index = Array.from(parent.children).indexOf(el);
      cardOrigins.push({ el, parent, index });
    }
    const panel = document.querySelector(`[data-sheet-panel="${tab}"]`);
    if (panel && el.parentNode !== panel) panel.appendChild(el);
  }
}

function restoreCards() {
  const groups = new Map();
  for (const entry of cardOrigins) {
    if (!groups.has(entry.parent)) groups.set(entry.parent, []);
    groups.get(entry.parent).push(entry);
  }
  for (const [parent, list] of groups) {
    list.sort((a, b) => a.index - b.index);
    for (const entry of list) parent.appendChild(entry.el);
  }
  cardOrigins.length = 0;
}

function applyResponsive() {
  if (mobileMedia.matches) moveCardsToSheet();
  else restoreCards();
  layoutCanvas(true);
}

// ---------------------------------------------------------------- boot

function installDebugHook() {
  window.__neonPanel = {
    get state() {
      return state;
    },
    get rendererState() {
      return rendererState;
    },
    get library() {
      return library;
    },
    get canvas() {
      return canvas;
    },
    get history() {
      return { canUndo: history.canUndo(), canRedo: history.canRedo() };
    },
    panelRects() {
      const rect = canvas.getBoundingClientRect();
      const sx = rect.width / Math.max(1, canvas.width);
      const sy = rect.height / Math.max(1, canvas.height);
      return (rendererState.panelsPx || []).map((poly) => {
        const xs = poly.map((p) => p.x);
        const ys = poly.map((p) => p.y);
        const x = Math.min(...xs) * sx + rect.left;
        const y = Math.min(...ys) * sy + rect.top;
        const w = (Math.max(...xs) - Math.min(...xs)) * sx;
        const h = (Math.max(...ys) - Math.min(...ys)) * sy;
        return { x, y, w, h, poly: poly.map((p) => ({ x: p.x * sx + rect.left, y: p.y * sy + rect.top })) };
      });
    },
    panelRectsCanvas() {
      return (rendererState.panelsPx || []).map((poly) => {
        const xs = poly.map((p) => p.x);
        const ys = poly.map((p) => p.y);
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      });
    },
    textBoxes() {
      const rect = canvas.getBoundingClientRect();
      const sx = rect.width / Math.max(1, canvas.width);
      const sy = rect.height / Math.max(1, canvas.height);
      const out = {};
      for (const [k, b] of Object.entries(rendererState.boxes || {})) {
        if (!b) continue;
        out[k] = { x: b.x * sx + rect.left, y: b.y * sy + rect.top, w: b.w * sx, h: b.h * sy };
      }
      return out;
    },
    textBoxesCanvas() {
      const out = {};
      for (const [k, b] of Object.entries(rendererState.boxes || {})) {
        if (b) out[k] = { ...b };
      }
      return out;
    },
    geom() {
      return rendererState.geom ? { ...rendererState.geom } : null;
    },
    tooWide() {
      return !!rendererState.tooWide;
    },
    render() {
      renderAll();
      syncUI();
    },
    async exportPng(width, height) {
      const aspect = ASPECTS[state.aspect];
      return runExport(width || aspect.w, height || aspect.h);
    },
  };
}

function boot() {
  buildLayoutTiles();
  buildFormatTiles();
  buildPresetChips();
  buildTemplateCards();
  buildFontSelect();
  bindControls();
  setupSheet();
  setupResponsiveObservers();
  applyResponsive();
  layoutCanvas(true);
  syncUI();
  installDebugHook();

  ensureFonts()
    .then(async () => {
      renderTemplateThumbs();
      await loadSamples();
      library.version++;
      buildSampleGrid();
      renderAll();
      syncUI();
      renderTemplateThumbs();
      installDebugHook();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.__shotReady = true;
        }),
      );
    })
    .catch((err) => {
      console.error(err);
      window.__shotReady = true;
    });
}

let stageObserver = null;

function setupResponsiveObservers() {
  if (mobileMedia.addEventListener) mobileMedia.addEventListener('change', applyResponsive);
  window.addEventListener('resize', queueLayout);
  if ('ResizeObserver' in window) {
    stageObserver = new ResizeObserver(queueLayout);
    stageObserver.observe(stage);
  }
}

boot();
