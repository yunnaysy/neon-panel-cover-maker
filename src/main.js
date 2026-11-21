// Main application orchestrator for Neon Panel.
// Three-column desktop studio and a dedicated phone/tablet layout with a
// bottom control sheet. Manages photos, layouts, lettering, colour scope,
// undo/redo history, on-canvas text editing and PNG export.

import { LAYOUT_PRESETS, computePanelPixelRects } from './layouts.js';
import { COLOR_PRESETS } from './colorGrades.js';
import { renderCoverArt, computePanelsForState } from './renderer.js';
import { exportCoverPng } from './export.js';
import { runShotHarness } from './shots.js';
import {
  LAYER_META,
  LAYER_NAMES,
  LETTERING_TEMPLATES,
  FONTS,
  getTemplate,
  cloneLayers,
  resolveLayer,
  getTypographyLayout,
  drawTemplateThumbnail,
  loadAllFonts,
  logicalUnit,
} from './typography.js';

const SAMPLE_LIST = [
  { name: 'convertible-sunset', label: 'Convertible Sunset' },
  { name: 'neon-portrait',      label: 'Neon Portrait' },
  { name: 'motel-sportscar',    label: 'Motel Sportscar' },
  { name: 'speedboat-keys',     label: 'Speedboat Keys' },
  { name: 'deco-avenue',        label: 'Deco Avenue' },
  { name: 'night-rider',        label: 'Night Rider' },
  { name: 'skyline-chopper',    label: 'Skyline Chopper' },
  { name: 'pier',               label: 'Pier Sunset' },
  { name: 'boulevard',          label: 'Boulevard Neon' },
];

const $ = id => document.getElementById(id);

const canvas = $('cover-canvas');
const canvasWrapper = $('canvas-wrapper');
const previewArea = $('preview-area');
const studio = $('studio');
const layoutPicker = $('layout-picker');
const aspectPicker = $('aspect-picker');
const panelPillsContainer = $('panel-pills-container');
const dropzone = $('dropzone');
const photoInput = $('photo-input');
const btnFillAll = $('btn-fill-all');
const btnResetCrop = $('btn-reset-crop');
const btnLoadCast = $('btn-load-cast');
const sampleGrid = $('sample-grid');
const zoomSlider = $('zoom-slider');
const zoomVal = $('zoom-val');
const panXSlider = $('pan-x-slider');
const panXVal = $('pan-x-val');
const panYSlider = $('pan-y-slider');
const panYVal = $('pan-y-val');
const presetPicker = $('preset-picker');
const gradeIntensity = $('grade-intensity');
const gradeVal = $('grade-val');
const gradeScopeSwitch = $('grade-scope');
const gradeScopeHint = $('grade-scope-hint');
const panelScopeBar = $('panel-scope-bar');
const panelScopeLabel = $('panel-scope-label');
const panelPrev = $('panel-prev');
const panelNext = $('panel-next');
const titleInput = $('title-input');
const subtitleInput = $('subtitle-input');
const taglineInput = $('tagline-input');
const quoteInput = $('quote-input');
const badgeInput = $('badge-input');
const previewTitle = $('preview-title');
const mobilePreviewTitle = $('mobile-preview-title');
const previewRatio = $('preview-ratio');
const activePanelIndicator = $('active-panel-indicator');
const panelEditorTitle = $('panel-editor-title');
const exportStatus = $('export-status');
const placementSwitch = $('placement-switch');
const templateCards = $('template-cards');
const layerTabs = $('layer-tabs');
const letterFont = $('letter-font');
const fontLayerName = $('font-layer-name');
const autoFitToggle = $('auto-fit');
const overflowWarning = $('overflow-warning');
const letteringGroup = $('lettering-group');
const letteringSizeGroup = $('lettering-size-group');
const leftSidebar = document.querySelector('.sidebar-left');
const rightSidebar = document.querySelector('.sidebar-right');
const photoLibrary = $('photo-library');
const libraryNote = $('library-note');
const compositionGroup = $('composition-group');
const gradeGroup = $('grade-group');
const cropGroup = $('crop-group');
const exportGroup = $('export-group');
const mobileSheet = $('mobile-sheet');
const sheetBody = $('sheet-body');
const sheetTabs = $('sheet-tabs');
const sheetHandle = $('sheet-handle');

export const state = {
  layout: 'key-art',
  canvasWidth: 1920,
  canvasHeight: 1080,
  activePanelIndex: 0,
  panelPhotos: [],
  globalPhoto: null,
  photoVersion: 0,
  colorPreset: 'golden-hour',
  colorIntensity: 0.75,
  gradeScope: 'global',
  letteringPlacement: 'below',
  decorations: { grain: true, vignette: true, halftone: true },
  typography: {
    mainTitle: 'NEON LIGHTS',
    subtitle: 'Ocean Drive',
    tagline: 'ONE COAST · NO RULES · COMING SOON',
    quoteLine: '★★★★★  “A CLASSIC”',
    badgeText: 'ORIGINAL',
    titleTheme: 'coast-sunset',
    placement: 'below',
    template: 'classic-neon',
    selectedLayer: 'title',
    autoFit: true,
    layers: cloneLayers(getTemplate('classic-neon').layers),
    panelLabels: [],
  },
};

const sampleImageCache = {};
const guideUI = { hovered: false, focused: false, dragging: false };

// === PHOTO HELPERS ===
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSampleImage(name) {
  if (sampleImageCache[name]) return sampleImageCache[name];
  const img = await loadImage(`samples/${name}.jpg`);
  sampleImageCache[name] = img;
  return img;
}

function panelCount() {
  return (LAYOUT_PRESETS.find(preset => preset.id === state.layout) || LAYOUT_PRESETS[0]).count;
}

function activePhoto() {
  return state.panelPhotos[state.activePanelIndex];
}

function ensureActivePhoto() {
  if (!state.panelPhotos[state.activePanelIndex]) {
    state.panelPhotos[state.activePanelIndex] = {
      image: state.globalPhoto,
      panX: 0,
      panY: 0,
      zoom: 1,
    };
  }
  return state.panelPhotos[state.activePanelIndex];
}

function setPanelImage(panelIdx, img) {
  if (!state.panelPhotos[panelIdx]) {
    state.panelPhotos[panelIdx] = { image: img, panX: 0, panY: 0, zoom: 1 };
  } else {
    state.panelPhotos[panelIdx].image = img;
  }
  if (!state.globalPhoto) state.globalPhoto = img;
  state.photoVersion++;
  redraw();
  commitHistory();
}

// === RENDER ===
function guidesVisible() {
  if (document.body.classList.contains('shot-cover')) return false;
  return guideUI.hovered || guideUI.focused || guideUI.dragging;
}

export function redraw() {
  if (canvas.width !== state.canvasWidth) canvas.width = state.canvasWidth;
  if (canvas.height !== state.canvasHeight) canvas.height = state.canvasHeight;
  const showGuides = guidesVisible();
  const panelGuide = state.gradeScope === 'panel' && !document.body.classList.contains('shot-cover');
  canvas.dataset.letteringGuide = showGuides ? 'true' : 'false';
  canvas.dataset.panelGuide = panelGuide ? 'true' : 'false';
  renderCoverArt(canvas, state, {
    preview: !document.body.classList.contains('shot-cover'),
    showLetteringGuides: showGuides,
    showPanelGuide: !document.body.classList.contains('shot-cover'),
  });
  updateOverflowWarning();
}

function updateOverflowWarning() {
  if (!overflowWarning) return;
  const layout = getTypographyLayout(state.typography, state.canvasWidth, state.canvasHeight);
  overflowWarning.hidden = !layout.anyOverflow;
}

// === HISTORY ===
const HISTORY_LIMIT = 80;
let past = [];
let future = [];
let pendingCommit = 0;
const imageIds = new WeakMap();
let nextImageId = 1;

function imageId(img) {
  if (!imageIds.has(img)) imageIds.set(img, nextImageId++);
  return imageIds.get(img);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object' && (value.constructor === Object || value.constructor === undefined)) {
    const out = {};
    for (const key of Object.keys(value)) out[key] = cloneValue(value[key]);
    return out;
  }
  return value;
}

function snapshot() {
  return cloneValue({
    layout: state.layout,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    activePanelIndex: state.activePanelIndex,
    panelPhotos: state.panelPhotos,
    globalPhoto: state.globalPhoto,
    photoVersion: state.photoVersion,
    colorPreset: state.colorPreset,
    colorIntensity: state.colorIntensity,
    gradeScope: state.gradeScope,
    letteringPlacement: state.letteringPlacement,
    decorations: state.decorations,
    typography: state.typography,
  });
}

function snapshotSignature(value) {
  return JSON.stringify(value, (key, item) => {
    if (item && typeof item === 'object' && item.tagName === 'IMG') return `@image:${imageId(item)}`;
    return item;
  });
}

export function commitHistory() {
  const snap = snapshot();
  const sig = snapshotSignature(snap);
  if (!past.length || snapshotSignature(past[past.length - 1]) !== sig) {
    past.push(snap);
    if (past.length > HISTORY_LIMIT) past.shift();
  }
  future = [];
  updateHistoryUI();
}

function restoreSnapshot(snap) {
  const next = cloneValue(snap);
  state.layout = next.layout;
  state.canvasWidth = next.canvasWidth;
  state.canvasHeight = next.canvasHeight;
  state.activePanelIndex = next.activePanelIndex;
  state.panelPhotos = next.panelPhotos;
  state.globalPhoto = next.globalPhoto;
  state.photoVersion = next.photoVersion;
  state.colorPreset = next.colorPreset;
  state.colorIntensity = next.colorIntensity;
  state.gradeScope = next.gradeScope;
  state.letteringPlacement = next.letteringPlacement;
  state.decorations = next.decorations;
  state.typography = next.typography;
  syncUI();
  redraw();
  updateCanvasDisplaySize();
}

function flushPendingCommit() {
  if (pendingCommit) {
    clearTimeout(pendingCommit);
    pendingCommit = 0;
    commitHistory();
  }
}

export function undo() {
  flushPendingCommit();
  if (past.length <= 1) return;
  future.push(past.pop());
  restoreSnapshot(past[past.length - 1]);
  updateHistoryUI();
}

export function redo() {
  flushPendingCommit();
  if (!future.length) return;
  const snap = future.pop();
  past.push(snap);
  restoreSnapshot(snap);
  updateHistoryUI();
}

function scheduleCommit(delay = 420) {
  if (pendingCommit) clearTimeout(pendingCommit);
  pendingCommit = setTimeout(() => {
    pendingCommit = 0;
    commitHistory();
  }, delay);
}

function resetHistory() {
  past = [snapshot()];
  future = [];
  updateHistoryUI();
}

function updateHistoryUI() {
  const canUndo = past.length > 1;
  const canRedo = future.length > 0;
  for (const id of ['btn-undo', 'btn-undo-mobile']) {
    const btn = $(id);
    if (btn) btn.disabled = !canUndo;
  }
  for (const id of ['btn-redo', 'btn-redo-mobile']) {
    const btn = $(id);
    if (btn) btn.disabled = !canRedo;
  }
}

// === PANEL SELECTION ===
function renderPanelPills() {
  if (!panelPillsContainer) return;
  panelPillsContainer.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `btn btn-secondary panel-pill ${i === state.activePanelIndex ? 'active' : ''}`;
    pill.textContent = `P${i + 1}`;
    pill.addEventListener('click', () => {
      setActivePanel(i);
      commitHistory();
    });
    panelPillsContainer.appendChild(pill);
  }
}

function setActivePanel(idx) {
  const count = panelCount();
  state.activePanelIndex = Math.max(0, Math.min(count - 1, idx));
  if (activePanelIndicator) activePanelIndicator.textContent = `P${state.activePanelIndex + 1}`;
  if (panelEditorTitle) panelEditorTitle.textContent = `Active panel (P${state.activePanelIndex + 1})`;
  const pills = panelPillsContainer?.querySelectorAll('.panel-pill') || [];
  pills.forEach((pill, i) => pill.classList.toggle('active', i === state.activePanelIndex));
  syncCropUI();
  syncScopeUI();
  redraw();
}

function syncCropUI() {
  const photoData = state.panelPhotos[state.activePanelIndex];
  const zoom = photoData?.zoom ?? 1;
  const panX = photoData?.panX ?? 0;
  const panY = photoData?.panY ?? 0;
  if (zoomSlider) zoomSlider.value = zoom;
  if (zoomVal) zoomVal.textContent = `${zoom.toFixed(1)}x`;
  if (panXSlider) panXSlider.value = panX;
  if (panXVal) panXVal.textContent = panX.toFixed(2);
  if (panYSlider) panYSlider.value = panY;
  if (panYVal) panYVal.textContent = panY.toFixed(2);
  if (activePanelIndicator) activePanelIndicator.textContent = `P${state.activePanelIndex + 1}`;
  if (panelEditorTitle) panelEditorTitle.textContent = `Active panel (P${state.activePanelIndex + 1})`;
}

// === BUILDERS ===
function initLayoutPicker() {
  if (!layoutPicker) return;
  layoutPicker.innerHTML = '';
  for (const preset of LAYOUT_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn layout-btn ${preset.id === state.layout ? 'active' : ''}`;
    btn.dataset.layout = preset.id;
    btn.innerHTML = `<span class="layout-icon">${preset.icon}</span><span class="layout-label">${preset.name}</span>`;
    btn.addEventListener('click', () => {
      state.layout = preset.id;
      if (state.activePanelIndex >= preset.count) state.activePanelIndex = 0;
      renderPanelPills();
      setActivePanel(state.activePanelIndex);
      syncLayoutUI();
      redraw();
      commitHistory();
    });
    layoutPicker.appendChild(btn);
  }
}

function initPresetPicker() {
  if (!presetPicker) return;
  presetPicker.innerHTML = '';
  for (const preset of COLOR_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn preset-btn ${preset.id === state.colorPreset ? 'active' : ''}`;
    btn.dataset.preset = preset.id;
    btn.innerHTML = `<span>${preset.badge}</span><span>${preset.name}</span>`;
    btn.addEventListener('click', () => {
      if (state.gradeScope === 'panel') {
        const panel = ensureActivePhoto();
        panel.gradePreset = preset.id;
        if (!Number.isFinite(panel.gradeIntensity)) panel.gradeIntensity = state.colorIntensity;
      } else {
        state.colorPreset = preset.id;
      }
      syncPresetUI();
      redraw();
      commitHistory();
    });
    presetPicker.appendChild(btn);
  }
}

function initSampleGrid() {
  if (!sampleGrid) return;
  sampleGrid.innerHTML = '';
  for (const sample of SAMPLE_LIST) {
    const thumb = document.createElement('div');
    thumb.className = 'sample-thumb';
    thumb.setAttribute('draggable', 'true');
    thumb.dataset.sample = sample.name;
    thumb.title = sample.label;

    const img = document.createElement('img');
    img.src = `samples/${sample.name}.jpg`;
    img.alt = sample.label;
    thumb.appendChild(img);

    const label = document.createElement('span');
    label.className = 'sample-label';
    label.textContent = sample.label;
    thumb.appendChild(label);

    thumb.addEventListener('click', async () => {
      const loaded = await loadSampleImage(sample.name);
      setPanelImage(state.activePanelIndex, loaded);
    });

    thumb.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', sample.name);
      event.dataTransfer.effectAllowed = 'copy';
    });

    sampleGrid.appendChild(thumb);
  }
}

function initFontSelect() {
  if (!letterFont) return;
  letterFont.innerHTML = '';
  for (const font of FONTS) {
    const option = document.createElement('option');
    option.value = font.family;
    option.textContent = font.family;
    letterFont.appendChild(option);
  }
}

function buildTemplateCards() {
  if (!templateCards) return;
  templateCards.innerHTML = '';
  for (const template of LETTERING_TEMPLATES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'template-card';
    card.dataset.template = template.id;
    card.setAttribute('aria-label', `Apply ${template.name} lettering template`);

    const preview = document.createElement('canvas');
    preview.width = 360;
    preview.height = 104;
    preview.className = 'template-preview';
    card.appendChild(preview);

    const label = document.createElement('span');
    label.className = 'template-name';
    label.textContent = template.name;
    card.appendChild(label);

    card.addEventListener('click', () => applyTemplate(template.id));
    templateCards.appendChild(card);
  }
  renderTemplateCards();
}

function renderTemplateCards() {
  templateCards?.querySelectorAll('.template-card').forEach(card => {
    const canvasEl = card.querySelector('canvas');
    if (canvasEl) drawTemplateThumbnail(canvasEl, state.typography, card.dataset.template);
    card.classList.toggle('active', card.dataset.template === state.typography.template);
  });
}

export function applyTemplate(id) {
  const template = getTemplate(id);
  state.typography.template = id;
  state.typography.layers = cloneLayers(template.layers);
  redraw();
  syncLetteringUI();
  renderTemplateCards();
  commitHistory();
}

// === LETTERING UI ===
function syncLetteringUI() {
  const name = state.typography.selectedLayer || 'title';
  const meta = LAYER_META[name];
  const layer = resolveLayer(state.typography, name);
  const layout = getTypographyLayout(state.typography, state.canvasWidth, state.canvasHeight);
  const info = layout.layers[name];

  layerTabs?.querySelectorAll('.seg-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.layer === name));
  if (fontLayerName) fontLayerName.textContent = meta.label.toUpperCase();
  if (letterFont) letterFont.value = layer.font;

  const size = Math.max(meta.minSize, Math.min(meta.maxSize, Math.round(Number.isFinite(layer.size) ? layer.size : info.logicalSize)));
  const spacing = Number.isFinite(layer.spacing) ? layer.spacing : 0;
  const lineHeight = Number.isFinite(layer.lineHeight) ? layer.lineHeight : meta.defaultLine;
  const x = Number.isFinite(layer.x) ? layer.x : 5.5;
  const y = Number.isFinite(layer.y) ? layer.y : 80.3;

  setPair('letter-size', [meta.minSize, meta.maxSize, 1], size);
  setPair('letter-spacing', [meta.minSpacing, meta.maxSpacing, 0.5], spacing);
  setPair('letter-lineheight', [meta.minLine, meta.maxLine, 0.01], Math.round(lineHeight * 100) / 100);
  setPair('letter-x', [0, 100, 0.5], x);
  setPair('letter-y', [0, 100, 0.5], y);

  if (autoFitToggle) autoFitToggle.checked = state.typography.autoFit !== false;
  if (overflowWarning) overflowWarning.hidden = !layout.anyOverflow;
  templateCards?.querySelectorAll('.template-card').forEach(card => {
    card.classList.toggle('active', card.dataset.template === state.typography.template);
  });
  positionGridButtons()?.forEach(btn => btn.classList.remove('active'));
}

function positionGridButtons() {
  return document.querySelectorAll('#position-grid .pos-btn');
}

function setPair(prefix, [min, max, step], value) {
  const range = $(`${prefix}-range`);
  const number = $(`${prefix}-number`);
  if (range) {
    range.min = min; range.max = max; range.step = step; range.value = value;
  }
  if (number) {
    number.min = min; number.max = max; number.step = step; number.value = value;
  }
}

function bindRangePair(prefix, prop) {
  const range = $(`${prefix}-range`);
  const number = $(`${prefix}-number`);
  if (!range || !number) return;

  const apply = (raw, commit) => {
    const name = state.typography.selectedLayer || 'title';
    const meta = LAYER_META[name];
    let value = parseFloat(raw);
    if (!Number.isFinite(value)) return;
    const min = prop === 'x' || prop === 'y' ? 0 : prop === 'size' ? meta.minSize : prop === 'spacing' ? meta.minSpacing : meta.minLine;
    const max = prop === 'x' || prop === 'y' ? 100 : prop === 'size' ? meta.maxSize : prop === 'spacing' ? meta.maxSpacing : meta.maxLine;
    value = Math.max(min, Math.min(max, value));
    state.typography.layers[name][prop] = value;
    range.value = value;
    number.value = value;
    redraw();
    if (commit) commitHistory();
    else scheduleCommit();
  };

  range.addEventListener('input', event => apply(event.target.value, false));
  range.addEventListener('change', event => apply(event.target.value, true));
  number.addEventListener('input', event => apply(event.target.value, false));
  number.addEventListener('change', event => apply(event.target.value, true));
}

function initLetteringControls() {
  layerTabs?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.typography.selectedLayer = btn.dataset.layer;
      guideUI.focused = true;
      syncLetteringUI();
      redraw();
    });
  });

  letterFont?.addEventListener('change', (event) => {
    const name = state.typography.selectedLayer || 'title';
    state.typography.layers[name].font = event.target.value;
    redraw();
    commitHistory();
  });

  bindRangePair('letter-size', 'size');
  bindRangePair('letter-spacing', 'spacing');
  bindRangePair('letter-lineheight', 'lineHeight');
  bindRangePair('letter-x', 'x');
  bindRangePair('letter-y', 'y');

  positionGridButtons().forEach(btn => {
    btn.addEventListener('click', () => {
      const name = state.typography.selectedLayer || 'title';
      const col = Number(btn.dataset.col);
      const row = Number(btn.dataset.row);
      const align = btn.dataset.align;
      const geo = { bandTop: 0.635, footerTop: 0.935, bandH: 0.3 };
      const x = col === 0 ? 5.5 : col === 1 ? 50 : 94.5;
      let y;
      if (name === 'billing') {
        y = [95.5, 96.3, 97.2][row];
      } else {
        y = [geo.bandTop * 100 + geo.bandH * 100 * 0.28, geo.bandTop * 100 + geo.bandH * 100 * 0.58, geo.bandTop * 100 + geo.bandH * 100 * 0.88][row];
      }
      state.typography.layers[name].x = x;
      state.typography.layers[name].y = y;
      state.typography.layers[name].align = align;
      guideUI.focused = true;
      syncLetteringUI();
      positionGridButtons().forEach(item => item.classList.toggle('active', item === btn));
      redraw();
      commitHistory();
    });
  });

  autoFitToggle?.addEventListener('change', (event) => {
    state.typography.autoFit = event.target.checked;
    redraw();
    syncLetteringUI();
    commitHistory();
  });

  $('btn-reset-layer')?.addEventListener('click', () => {
    const name = state.typography.selectedLayer || 'title';
    const template = getTemplate(state.typography.template);
    state.typography.layers[name] = { ...template.layers[name] };
    redraw();
    syncLetteringUI();
    commitHistory();
  });
}

function initTextInputs() {
  const bind = (input, prop, updatePreview) => {
    if (!input) return;
    input.addEventListener('input', (event) => {
      state.typography[prop] = event.target.value;
      if (updatePreview) {
        if (previewTitle) previewTitle.textContent = event.target.value || 'UNTITLED COVER';
        if (mobilePreviewTitle) mobilePreviewTitle.textContent = event.target.value || 'UNTITLED COVER';
      }
      redraw();
      scheduleCommit();
    });
    input.addEventListener('focus', () => {
      state.typography.selectedLayer = prop === 'mainTitle' ? 'title' : prop === 'subtitle' ? 'subtitle' : prop === 'tagline' ? 'billing' : state.typography.selectedLayer;
      guideUI.focused = true;
      syncLetteringUI();
      redraw();
    });
    input.addEventListener('blur', () => {
      flushPendingCommit();
      requestAnimationFrame(updateFocusGuide);
    });
  };

  bind(titleInput, 'mainTitle', true);
  bind(subtitleInput, 'subtitle', false);
  bind(taglineInput, 'tagline', false);
  bind(quoteInput, 'quoteLine', false);
  bind(badgeInput, 'badgeText', false);

  for (const group of [letteringGroup, letteringSizeGroup]) {
    group?.addEventListener('focusin', () => {
      guideUI.focused = true;
      redraw();
    });
    group?.addEventListener('focusout', () => requestAnimationFrame(updateFocusGuide));
  }
}

function updateFocusGuide() {
  const active = document.activeElement;
  const focused = !!(active && (letteringGroup?.contains(active) || letteringSizeGroup?.contains(active)));
  if (focused !== guideUI.focused) {
    guideUI.focused = focused;
    redraw();
  }
}

// === COLOUR SCOPE ===
function syncPresetUI() {
  const panel = state.gradeScope === 'panel' ? activePhoto() : null;
  const activePreset = panel?.gradePreset || state.colorPreset;
  const intensity = panel && Number.isFinite(panel.gradeIntensity)
    ? panel.gradeIntensity
    : state.colorIntensity;
  presetPicker?.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === activePreset);
  });
  if (gradeIntensity) gradeIntensity.value = intensity;
  if (gradeVal) gradeVal.textContent = `${Math.round(intensity * 100)}%`;
}

function syncScopeUI() {
  gradeScopeSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scope === state.gradeScope);
  });
  if (gradeScopeHint) gradeScopeHint.textContent = state.gradeScope === 'panel' ? 'Panel only' : 'Entire poster';
  if (panelScopeLabel) panelScopeLabel.textContent = `PANEL ${String(state.activePanelIndex + 1).padStart(2, '0')}`;
  if (panelScopeBar) panelScopeBar.classList.toggle('panel-mode', state.gradeScope === 'panel');
}

function initColourControls() {
  gradeScopeSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.gradeScope = btn.dataset.scope;
      syncScopeUI();
      syncPresetUI();
      redraw();
      commitHistory();
    });
  });

  gradeIntensity?.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    if (state.gradeScope === 'panel') {
      const panel = ensureActivePhoto();
      panel.gradeIntensity = value;
      if (!panel.gradePreset) panel.gradePreset = state.colorPreset;
    } else {
      state.colorIntensity = value;
    }
    if (gradeVal) gradeVal.textContent = `${Math.round(value * 100)}%`;
    redraw();
    scheduleCommit();
  });
  gradeIntensity?.addEventListener('change', () => commitHistory());

  panelPrev?.addEventListener('click', () => {
    state.gradeScope = 'panel';
    setActivePanel((state.activePanelIndex - 1 + panelCount()) % panelCount());
    syncPresetUI();
    commitHistory();
  });
  panelNext?.addEventListener('click', () => {
    state.gradeScope = 'panel';
    setActivePanel((state.activePanelIndex + 1) % panelCount());
    syncPresetUI();
    commitHistory();
  });

  $('btn-reset-strength')?.addEventListener('click', () => {
    if (state.gradeScope === 'panel') {
      const panel = ensureActivePhoto();
      panel.gradeIntensity = 0.75;
    } else {
      state.colorIntensity = 0.75;
    }
    syncPresetUI();
    redraw();
    commitHistory();
  });

  $('btn-remove-panel-look')?.addEventListener('click', () => {
    const panel = activePhoto();
    if (panel) {
      delete panel.gradePreset;
      delete panel.gradeIntensity;
    }
    syncPresetUI();
    redraw();
    commitHistory();
  });

  $('btn-reset-colour')?.addEventListener('click', () => {
    state.colorPreset = 'golden-hour';
    state.colorIntensity = 0.75;
    state.gradeScope = 'global';
    for (const panel of state.panelPhotos) {
      if (panel) {
        delete panel.gradePreset;
        delete panel.gradeIntensity;
      }
    }
    syncPresetUI();
    syncScopeUI();
    redraw();
    commitHistory();
  });
}

// === PLACEMENT / ASPECT ===
function syncPlacementUI() {
  placementSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.placement === state.letteringPlacement);
  });
}

function initPlacementSwitch() {
  placementSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.letteringPlacement = btn.dataset.placement;
      state.typography.placement = state.letteringPlacement;
      syncPlacementUI();
      redraw();
      commitHistory();
    });
  });
}

function syncLayoutUI() {
  layoutPicker?.querySelectorAll('.layout-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  });
  aspectPicker?.querySelectorAll('.btn-chip').forEach(chip => {
    const w = parseInt(chip.dataset.w, 10);
    const h = parseInt(chip.dataset.h, 10);
    const active = w === state.canvasWidth && h === state.canvasHeight;
    chip.classList.toggle('active', active);
    if (active && previewRatio) {
      previewRatio.innerHTML = `${chip.dataset.aspect} <i></i> ${w} × ${h}`;
    }
  });
}

function initAspectPicker() {
  aspectPicker?.querySelectorAll('.btn-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.canvasWidth = parseInt(chip.dataset.w, 10);
      state.canvasHeight = parseInt(chip.dataset.h, 10);
      syncLayoutUI();
      syncLetteringUI();
      redraw();
      updateCanvasDisplaySize();
      commitHistory();
    });
  });
}

// === PHOTO LOADING ===
function initPhotoLoading() {
  if (dropzone) {
    dropzone.addEventListener('click', () => photoInput?.click());
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        photoInput?.click();
      }
    });
  }

  photoInput?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      setPanelImage(state.activePanelIndex, img);
    } catch (error) {
      if (exportStatus) exportStatus.textContent = `Could not load photo: ${error.message}`;
    } finally {
      photoInput.value = '';
    }
  });

  if (dropzone) {
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', async (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
      const sampleName = event.dataTransfer.getData('text/plain');
      if (sampleName && SAMPLE_LIST.some(sample => sample.name === sampleName)) {
        const img = await loadSampleImage(sampleName);
        setPanelImage(state.activePanelIndex, img);
        return;
      }
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          const url = URL.createObjectURL(file);
          const img = await loadImage(url);
          URL.revokeObjectURL(url);
          setPanelImage(state.activePanelIndex, img);
        } catch (error) {
          if (exportStatus) exportStatus.textContent = `Could not load photo: ${error.message}`;
        }
      }
    });
  }

  canvas.addEventListener('dragover', event => event.preventDefault());
  canvas.addEventListener('drop', async (event) => {
    event.preventDefault();
    const point = getCanvasPoint(event);
    const panelIdx = getPanelAtPoint(point.x, point.y);
    const targetPanel = panelIdx !== -1 ? panelIdx : state.activePanelIndex;

    const sampleName = event.dataTransfer.getData('text/plain');
    if (sampleName && SAMPLE_LIST.some(sample => sample.name === sampleName)) {
      const img = await loadSampleImage(sampleName);
      setPanelImage(targetPanel, img);
      setActivePanel(targetPanel);
      return;
    }
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        URL.revokeObjectURL(url);
        setPanelImage(targetPanel, img);
        setActivePanel(targetPanel);
      } catch (error) {
        if (exportStatus) exportStatus.textContent = `Could not load photo: ${error.message}`;
      }
    }
  });

  btnFillAll?.addEventListener('click', () => {
    const currentImg = activePhoto()?.image || state.globalPhoto;
    if (!currentImg) return;
    for (let i = 0; i < panelCount(); i++) {
      if (!state.panelPhotos[i]) {
        state.panelPhotos[i] = { image: currentImg, panX: 0, panY: 0, zoom: 1 };
      } else {
        state.panelPhotos[i].image = currentImg;
      }
    }
    state.globalPhoto = currentImg;
    state.photoVersion++;
    redraw();
    commitHistory();
  });

  btnResetCrop?.addEventListener('click', () => {
    const panel = activePhoto();
    if (!panel) return;
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    syncCropUI();
    redraw();
    commitHistory();
  });

  btnLoadCast?.addEventListener('click', async () => {
    await loadSampleCast();
    commitHistory();
  });
}

async function loadSampleCast() {
  const names = SAMPLE_LIST.map(sample => sample.name);
  const images = await Promise.all(names.map(name => loadSampleImage(name)));
  state.panelPhotos = [];
  for (let i = 0; i < panelCount(); i++) {
    state.panelPhotos.push({
      image: images[i % images.length],
      panX: ((i * 0.12) % 0.3) - 0.1,
      panY: ((i * 0.1) % 0.25) - 0.08,
      zoom: 1.05 + (i % 3) * 0.06,
    });
  }
  state.globalPhoto = images[0];
  state.photoVersion++;
  renderPanelPills();
  setActivePanel(0);
}

// === CROP SLIDERS ===
function initCropSliders() {
  zoomSlider?.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    const panel = ensureActivePhoto();
    panel.zoom = value;
    if (zoomVal) zoomVal.textContent = `${value.toFixed(1)}x`;
    redraw();
    scheduleCommit();
  });
  zoomSlider?.addEventListener('change', () => commitHistory());

  panXSlider?.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    const panel = ensureActivePhoto();
    panel.panX = value;
    if (panXVal) panXVal.textContent = value.toFixed(2);
    redraw();
    scheduleCommit();
  });
  panXSlider?.addEventListener('change', () => commitHistory());

  panYSlider?.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    const panel = ensureActivePhoto();
    panel.panY = value;
    if (panYVal) panYVal.textContent = value.toFixed(2);
    redraw();
    scheduleCommit();
  });
  panYSlider?.addEventListener('change', () => commitHistory());
}

// === CANVAS INTERACTION ===
function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getPanelAtPoint(px, py) {
  const panels = computePanelsForState(state, canvas.width, canvas.height);
  return panels.findIndex(panel =>
    px >= panel.x && px <= panel.x + panel.width && py >= panel.y && py <= panel.y + panel.height
  );
}

function hitTestLettering(point) {
  const layout = getTypographyLayout(state.typography, canvas.width, canvas.height);
  for (const name of ['title', 'subtitle', 'billing']) {
    const box = layout.layers[name]?.box;
    if (!box) continue;
    const pad = Math.max(6, canvas.width * 0.006);
    if (point.x >= box.x - pad && point.x <= box.x + box.width + pad &&
        point.y >= box.y - pad && point.y <= box.y + box.height + pad) {
      return { name, box, info: layout.layers[name] };
    }
  }
  return null;
}

function initCanvasInteractions() {
  let dragMode = null;
  let dragStart = null;
  let pointerId = null;

  const endDrag = () => {
    if (!dragMode) return;
    if (dragMode === 'text' || dragMode === 'resize') {
      guideUI.dragging = false;
      state._snapGuide = false;
      commitHistory();
    } else if (dragMode === 'panel') {
      commitHistory();
    }
    dragMode = null;
    dragStart = null;
    if (pointerId != null) {
      try { canvas.releasePointerCapture(pointerId); } catch { /* noop */ }
      pointerId = null;
    }
    redraw();
  };

  canvas.addEventListener('pointerdown', (event) => {
    const point = getCanvasPoint(event);
    const layout = getTypographyLayout(state.typography, canvas.width, canvas.height);
    const selected = state.typography.selectedLayer || 'title';
    const handle = layout.layers[selected]?.handle;

    if (handle) {
      const radius = Math.max(12, canvas.width * 0.012);
      if (Math.hypot(point.x - handle.x, point.y - handle.y) <= radius) {
        dragMode = 'resize';
        dragStart = {
          point,
          sizePx: layout.layers[selected].sizePx,
          boxH: Math.max(1, layout.layers[selected].box.height),
          layer: selected,
        };
        guideUI.dragging = true;
        guideUI.hovered = true;
        canvas.setPointerCapture?.(event.pointerId);
        pointerId = event.pointerId;
        redraw();
        return;
      }
    }

    const hit = hitTestLettering(point);
    if (hit) {
      state.typography.selectedLayer = hit.name;
      guideUI.dragging = true;
      guideUI.hovered = true;
      const layer = resolveLayer(state.typography, hit.name);
      dragMode = 'text';
      dragStart = {
        point,
        x: Number.isFinite(layer.x) ? layer.x : 5.5,
        y: Number.isFinite(layer.y) ? layer.y : 80.3,
        layer: hit.name,
      };
      syncLetteringUI();
      canvas.setPointerCapture?.(event.pointerId);
      pointerId = event.pointerId;
      redraw();
      return;
    }

    const panelIdx = getPanelAtPoint(point.x, point.y);
    if (panelIdx !== -1) {
      state.gradeScope = 'panel';
      setActivePanel(panelIdx);
      syncScopeUI();
      syncPresetUI();
      dragMode = 'panel';
      dragStart = { clientX: event.clientX, clientY: event.clientY };
      canvas.setPointerCapture?.(event.pointerId);
      pointerId = event.pointerId;
      redraw();
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragMode) return;
    const point = getCanvasPoint(event);

    if (dragMode === 'text') {
      const layer = state.typography.layers[dragStart.layer];
      let x = dragStart.x + ((point.x - dragStart.point.x) / canvas.width) * 100;
      let y = dragStart.y + ((point.y - dragStart.point.y) / canvas.height) * 100;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      state._snapGuide = Math.abs(x - 50) < 1.5;
      if (state._snapGuide) x = 50;
      layer.x = Math.round(x * 10) / 10;
      layer.y = Math.round(y * 10) / 10;
      syncLetteringUI();
      redraw();
      return;
    }

    if (dragMode === 'resize') {
      const dy = point.y - dragStart.point.y;
      const ratio = Math.max(0.25, 1 + dy / dragStart.boxH);
      const meta = LAYER_META[dragStart.layer];
      const u = logicalUnit(canvas.width, canvas.height);
      const next = Math.max(meta.minSize, Math.min(meta.maxSize, (dragStart.sizePx * ratio) / u));
      state.typography.layers[dragStart.layer].size = Math.round(next * 10) / 10;
      syncLetteringUI();
      redraw();
      return;
    }

    if (dragMode === 'panel') {
      const deltaX = (event.clientX - dragStart.clientX) * 0.005;
      const deltaY = (event.clientY - dragStart.clientY) * 0.005;
      dragStart.clientX = event.clientX;
      dragStart.clientY = event.clientY;
      const panel = ensureActivePhoto();
      panel.panX = Math.max(-1, Math.min(1, (panel.panX || 0) + deltaX));
      panel.panY = Math.max(-1, Math.min(1, (panel.panY || 0) + deltaY));
      syncCropUI();
      redraw();
    }
  });

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = ensureActivePhoto();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) + delta));
    syncCropUI();
    redraw();
    scheduleCommit(320);
  }, { passive: false });
}

function initHoverGuides() {
  window.addEventListener('pointermove', (event) => {
    if (guideUI.dragging || document.body.classList.contains('shot-cover')) return;
    const rect = canvas.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;
    let next = false;
    if (inside) {
      const point = {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      };
      next = !!hitTestLettering(point);
    }
    if (next !== guideUI.hovered) {
      guideUI.hovered = next;
      redraw();
    }
  });
}

// === EXPORT ===
async function exportWithDims(width, height, filename) {
  if (exportStatus) exportStatus.textContent = 'Loading fonts and rendering high-res cover...';
  try {
    await exportCoverPng(state, width, height, filename || `neon-panel-${width}x${height}.png`);
    if (exportStatus) exportStatus.textContent = `Saved neon-panel-${width}x${height}.png!`;
  } catch (error) {
    if (exportStatus) exportStatus.textContent = `Export error: ${error.message}`;
  }
  syncUI();
}

function initExportButtons() {
  const configs = [
    { id: 'export-landscape', w: 1920, h: 1080 },
    { id: 'export-square', w: 1080, h: 1080 },
    { id: 'export-portrait', w: 1080, h: 1350 },
  ];
  for (const config of configs) {
    $(config.id)?.addEventListener('click', () => exportWithDims(config.w, config.h));
  }
  $('btn-export-preview')?.addEventListener('click', () => exportWithDims(state.canvasWidth, state.canvasHeight));
  $('btn-export-mobile')?.addEventListener('click', () => exportWithDims(state.canvasWidth, state.canvasHeight));
}

// === RESPONSIVE ===
const mobileQuery = window.matchMedia('(max-width: 900px)');
const SHEET_SIZES = { peek: '18dvh', half: '55dvh', full: '88dvh' };
const SHEET_CYCLE = ['peek', 'half', 'full'];
let sheetState = 'peek';

function updateCanvasDisplaySize() {
  if (document.body.classList.contains('shot-cover')) return;
  if (!canvasWrapper || !canvas) return;
  const rect = canvasWrapper.getBoundingClientRect();
  const availableW = Math.max(1, rect.width);
  const availableH = Math.max(1, rect.height);
  const scale = Math.min(availableW / state.canvasWidth, availableH / state.canvasHeight);
  canvas.style.width = `${Math.max(1, Math.floor(state.canvasWidth * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(state.canvasHeight * scale))}px`;
}

function applyResponsiveStructure() {
  if (mobileQuery.matches) {
    for (const el of [photoLibrary, libraryNote, compositionGroup, gradeGroup, letteringGroup, letteringSizeGroup, cropGroup, exportGroup]) {
      if (el && el.parentElement !== sheetBody) sheetBody.appendChild(el);
    }
    document.body.classList.add('mobile-layout');
    setMobileTab(document.body.dataset.mobileTab || 'photos');
  } else {
    if (photoLibrary && photoLibrary.parentElement !== leftSidebar) leftSidebar.appendChild(photoLibrary);
    if (libraryNote && libraryNote.parentElement !== leftSidebar) leftSidebar.appendChild(libraryNote);
    for (const el of [compositionGroup, gradeGroup, letteringGroup, letteringSizeGroup, cropGroup, exportGroup]) {
      if (el && el.parentElement !== rightSidebar) rightSidebar.appendChild(el);
    }
    document.body.classList.remove('mobile-layout');
  }
  requestAnimationFrame(updateCanvasDisplaySize);
}

function setMobileTab(tab) {
  document.body.dataset.mobileTab = tab;
  sheetTabs?.querySelectorAll('.sheet-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
    btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
  });
}

function setSheetState(next) {
  sheetState = next;
  studio.style.setProperty('--sheet-h', SHEET_SIZES[next] || SHEET_SIZES.half);
  mobileSheet?.setAttribute('data-state', next);
  requestAnimationFrame(() => {
    updateCanvasDisplaySize();
    redraw();
  });
}

function initResponsiveUI() {
  applyResponsiveStructure();
  mobileQuery.addEventListener?.('change', applyResponsiveStructure);
  sheetTabs?.querySelectorAll('.sheet-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      setMobileTab(btn.dataset.tab);
      if (sheetState === 'peek') setSheetState('half');
    });
  });
  sheetHandle?.addEventListener('click', () => {
    const idx = SHEET_CYCLE.indexOf(sheetState);
    setSheetState(SHEET_CYCLE[(idx + 1) % SHEET_CYCLE.length]);
  });
  setSheetState(mobileQuery.matches ? 'peek' : 'half');

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => updateCanvasDisplaySize());
    observer.observe(canvasWrapper);
    observer.observe(previewArea);
  }
  window.addEventListener('resize', () => {
    applyResponsiveStructure();
    updateCanvasDisplaySize();
  });
}

// === KEYBOARD ===
function initKeyboard() {
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      redo();
    }
  });
}

// === SYNC ===
function setInputValue(input, value) {
  if (input && document.activeElement !== input) input.value = value;
}

export function syncUI() {
  setInputValue(titleInput, state.typography.mainTitle || '');
  setInputValue(subtitleInput, state.typography.subtitle || '');
  setInputValue(taglineInput, state.typography.tagline || '');
  setInputValue(quoteInput, state.typography.quoteLine || '');
  setInputValue(badgeInput, state.typography.badgeText || '');
  if (previewTitle) previewTitle.textContent = state.typography.mainTitle || 'UNTITLED COVER';
  if (mobilePreviewTitle) mobilePreviewTitle.textContent = state.typography.mainTitle || 'UNTITLED COVER';

  syncLayoutUI();
  syncPlacementUI();
  syncScopeUI();
  syncPresetUI();
  syncCropUI();
  syncLetteringUI();
  updateHistoryUI();
  updateOverflowWarning();
}

// === INIT ===
async function initApp() {
  initLayoutPicker();
  initPresetPicker();
  initSampleGrid();
  initFontSelect();
  buildTemplateCards();
  initPhotoLoading();
  initCropSliders();
  initTextInputs();
  initColourControls();
  initPlacementSwitch();
  initAspectPicker();
  initLetteringControls();
  initCanvasInteractions();
  initHoverGuides();
  initExportButtons();
  initResponsiveUI();
  initKeyboard();

  $('btn-undo')?.addEventListener('click', undo);
  $('btn-redo')?.addEventListener('click', redo);
  $('btn-undo-mobile')?.addEventListener('click', undo);
  $('btn-redo-mobile')?.addEventListener('click', redo);

  try {
    await loadAllFonts();
  } catch (error) {
    console.warn('Font loading:', error);
  }

  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await runShotHarness(params, state, redraw, loadImage, syncUI);
    renderTemplateCards();
    syncUI();
    redraw();
    resetHistory();
  } else {
    try {
      await loadSampleCast();
    } catch {
      redraw();
    }
    syncUI();
    redraw();
    resetHistory();
  }

  renderTemplateCards();
  updateCanvasDisplaySize();
  window.__neonApp = {
    state,
    redraw,
    syncUI,
    commitHistory,
    undo,
    redo,
    applyTemplate,
    exportCoverPng,
    getTypographyLayout: (typo, w, h) => getTypographyLayout(
      typo || state.typography,
      w || state.canvasWidth,
      h || state.canvasHeight,
    ),
    computePanelsForState: (w, h, placement) => computePanelsForState(
      { ...state, letteringPlacement: placement || state.letteringPlacement },
      w,
      h,
    ),
    previewGuides: () => ({
      lettering: guidesVisible(),
      panel: state.gradeScope === 'panel' && !document.body.classList.contains('shot-cover'),
    }),
    sheetState: () => sheetState,
  };
  window.__neonReady = true;
}

initApp();
