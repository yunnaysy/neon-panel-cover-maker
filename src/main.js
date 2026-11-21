// Main application orchestrator for Neon Panel.
// Three-column studio on desktop, neon top bar + bottom control sheet on phones.
// Manages local photos, on-canvas editing, undo/redo, lettering templates,
// colour-grade scope, responsive preview sizing, and PNG export.

import { LAYOUT_PRESETS, getLayoutPanels } from './layouts.js';
import { COLOR_PRESETS, getColorPreset } from './colorGrades.js';
import { renderCoverArt, computePanelsForState } from './renderer.js';
import { exportCoverPng } from './export.js';
import { runShotHarness } from './shots.js';
import {
  FONTS,
  LETTERING_TEMPLATES,
  LAYER_META,
  LAYER_NAMES,
  getTemplate,
  cloneLayers,
  resolveLayer,
  getTypographyLayout,
  loadAllFonts,
  drawTemplateThumbnail,
  getBandGeometry,
  TITLE_SAFE_TOP,
  FOOTER_HEIGHT,
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
const layoutPicker = $('layout-picker');
const aspectPicker = $('aspect-picker');
const placementSwitch = $('placement-switch');
const gradeScopeSwitch = $('grade-scope');
const panelScopeBar = $('panel-scope-bar');
const panelPrev = $('panel-prev');
const panelNext = $('panel-next');
const panelScopeLabel = $('panel-scope-label');
const gradeScopeHint = $('grade-scope-hint');
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
const layerTabs = $('layer-tabs');
const letterFont = $('letter-font');
const fontLayerName = $('font-layer-name');
const autoFitToggle = $('auto-fit');
const overflowWarning = $('overflow-warning');
const templateCards = $('template-cards');
const positionGrid = $('position-grid');

const studio = $('studio');
const mobileSheet = $('mobile-sheet');
const sheetHandle = $('sheet-handle');
const sheetTabs = $('sheet-tabs');
const sheetBody = $('sheet-body');
const leftSidebar = document.querySelector('.sidebar-left');
const rightSidebar = document.querySelector('.sidebar-right');
const brandHeader = $('brand-header');
const photoLibrary = $('photo-library');
const libraryNote = $('library-note');
const compositionGroup = $('composition-group');
const gradeGroup = $('grade-group');
const letteringGroup = $('lettering-group');
const letteringSizeGroup = $('lettering-size-group');
const cropGroup = $('crop-group');
const exportGroup = $('export-group');

export const state = {
  layout: 'key-art',
  canvasWidth: 1920,
  canvasHeight: 1080,
  activePanelIndex: 0,
  hoveredPanelIndex: null,
  panelPhotos: [],
  globalPhoto: null,
  colorPreset: 'golden-hour',
  colorIntensity: 0.75,
  gradeScope: 'global',
  letteringPlacement: 'below',
  photoVersion: 0,
  decorations: { grain: true, vignette: true, halftone: true },
  typography: {
    mainTitle: 'NEON LIGHTS',
    subtitle: 'Ocean Drive',
    tagline: 'ONE COAST · NO RULES · COMING SOON',
    quoteLine: '★★★★★  “A CLASSIC”',
    badgeText: 'ORIGINAL',
    titleTheme: 'coast-sunset',
    template: 'classic-neon',
    layers: cloneLayers(getTemplate('classic-neon').layers),
    autoFit: true,
    selectedLayer: 'title',
    panelLabels: [],
  },
};

const sampleImageCache = {};
const imageIds = new WeakMap();
let nextImageId = 1;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function bumpPhoto() {
  state.photoVersion = (state.photoVersion || 0) + 1;
}

function resolvePlacement() {
  return state.letteringPlacement || 'below';
}

const guideUI = { hoveredLettering: false, focusedLettering: false };

function letteringGuidesActive() {
  return guideUI.focusedLettering || guideUI.hoveredLettering
    || (!!interaction && (interaction.type === 'move' || interaction.type === 'resize'));
}

export function redraw() {
  if (canvas.width !== state.canvasWidth) canvas.width = state.canvasWidth;
  if (canvas.height !== state.canvasHeight) canvas.height = state.canvasHeight;
  const isCoverShot = document.body.classList.contains('shot-cover');
  const showLetteringGuides = !isCoverShot && letteringGuidesActive();
  const showPanelGuide = !isCoverShot && state.gradeScope === 'panel';
  renderCoverArt(canvas, state, {
    preview: !isCoverShot,
    showLetteringGuides,
    showPanelGuide,
  });
  canvas.dataset.letteringGuide = String(showLetteringGuides);
  canvas.dataset.panelGuide = String(showPanelGuide);
  updateLetteringStatus();
  if (!isCoverShot) updateCanvasDisplaySize();
}

function updateLetteringStatus() {
  if (!overflowWarning) return;
  const layout = getTypographyLayout(state.typography, state.canvasWidth, state.canvasHeight);
  overflowWarning.hidden = !layout.anyOverflow;
}

// === HISTORY ===
const MAX_HISTORY = 80;
let past = [];
let future = [];
let lastSnapshot = null;
let lastSignature = '';
let debounceTimer = 0;

function signature(value) {
  return JSON.stringify(value, (key, val) => {
    if (key.startsWith('_')) return undefined;
    if (typeof HTMLImageElement !== 'undefined' && val instanceof HTMLImageElement) {
      if (!imageIds.has(val)) imageIds.set(val, nextImageId++);
      return `img#${imageIds.get(val)}`;
    }
    return val;
  });
}

function cloneValue(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof HTMLImageElement !== 'undefined' && value instanceof HTMLImageElement) return value;
  if (Array.isArray(value)) return value.map(cloneValue);
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith('_')) continue;
    out[key] = cloneValue(val);
  }
  return out;
}

export function commitHistory() {
  clearTimeout(debounceTimer);
  const snap = cloneValue(state);
  const sig = signature(snap);
  if (sig === lastSignature) return false;
  if (lastSnapshot) {
    past.push(lastSnapshot);
    if (past.length > MAX_HISTORY) past.shift();
  }
  lastSnapshot = snap;
  lastSignature = sig;
  future = [];
  updateHistoryButtons();
  return true;
}

function scheduleCommit(delay = 450) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(commitHistory, delay);
}

function restoreSnapshot(snap) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, cloneValue(snap));
  state._snapGuide = false;
  bumpPhoto();
  lastSnapshot = cloneValue(state);
  lastSignature = signature(state);
  redraw();
  syncUI();
  updateHistoryButtons();
}

export function undo() {
  if (!past.length) return;
  clearTimeout(debounceTimer);
  future.push(cloneValue(state));
  if (future.length > MAX_HISTORY) future.shift();
  restoreSnapshot(past.pop());
}

export function redo() {
  if (!future.length) return;
  clearTimeout(debounceTimer);
  past.push(cloneValue(state));
  if (past.length > MAX_HISTORY) past.shift();
  restoreSnapshot(future.pop());
}

function updateHistoryButtons() {
  const undoBtns = [$('btn-undo'), $('btn-undo-mobile')];
  const redoBtns = [$('btn-redo'), $('btn-redo-mobile')];
  for (const btn of undoBtns) if (btn) btn.disabled = past.length === 0;
  for (const btn of redoBtns) if (btn) btn.disabled = future.length === 0;
}

// === UI HELPERS ===
function currentPreset() {
  if (state.gradeScope === 'panel') {
    const panel = state.panelPhotos[state.activePanelIndex];
    return panel?.gradePreset || state.colorPreset;
  }
  return state.colorPreset;
}

function currentIntensity() {
  if (state.gradeScope === 'panel') {
    const panel = state.panelPhotos[state.activePanelIndex];
    return Number.isFinite(panel?.gradeIntensity) ? panel.gradeIntensity : state.colorIntensity;
  }
  return state.colorIntensity;
}

function ensurePhotoData(idx) {
  if (!state.panelPhotos[idx]) {
    state.panelPhotos[idx] = { image: state.globalPhoto || null, panX: 0, panY: 0, zoom: 1 };
  }
  return state.panelPhotos[idx];
}

function renderPanelPills() {
  if (!panelPillsContainer) return;
  const preset = LAYOUT_PRESETS.find(l => l.id === state.layout) || LAYOUT_PRESETS[0];
  panelPillsContainer.innerHTML = '';
  for (let i = 0; i < preset.count; i++) {
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
  const preset = LAYOUT_PRESETS.find(l => l.id === state.layout) || LAYOUT_PRESETS[0];
  idx = Math.max(0, Math.min(preset.count - 1, idx));
  state.activePanelIndex = idx;
  if (activePanelIndicator) activePanelIndicator.textContent = `P${idx + 1}`;
  if (panelEditorTitle) panelEditorTitle.textContent = `Active Panel (P${idx + 1})`;
  panelPillsContainer?.querySelectorAll('.panel-pill').forEach((p, i) => p.classList.toggle('active', i === idx));
  if (panelScopeLabel) panelScopeLabel.textContent = `PANEL ${String(idx + 1).padStart(2, '0')}`;

  const photoData = state.panelPhotos[idx];
  if (zoomSlider) { zoomSlider.value = photoData?.zoom || 1.0; if (zoomVal) zoomVal.textContent = `${(photoData?.zoom || 1.0).toFixed(1)}x`; }
  if (panXSlider) { panXSlider.value = photoData?.panX || 0; if (panXVal) panXVal.textContent = (photoData?.panX || 0).toFixed(2); }
  if (panYSlider) { panYSlider.value = photoData?.panY || 0; if (panYVal) panYVal.textContent = (photoData?.panY || 0).toFixed(2); }

  if (gradeScopeSwitch) {
    gradeScopeSwitch.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === state.gradeScope));
  }
  if (gradeScopeHint) gradeScopeHint.textContent = state.gradeScope === 'panel' ? 'Panel only' : 'Entire poster';
  updatePresetPickerState();
  redraw();
}

function setPanelImage(panelIdx, img) {
  const data = ensurePhotoData(panelIdx);
  data.image = img;
  if (!state.globalPhoto) state.globalPhoto = img;
  bumpPhoto();
  redraw();
}

async function loadSampleImage(name) {
  if (sampleImageCache[name]) return sampleImageCache[name];
  const img = await loadImage(`samples/${name}.jpg`);
  sampleImageCache[name] = img;
  return img;
}

// === BUILDERS / INITIALISERS ===
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
      const count = preset.count;
      if (state.activePanelIndex >= count) state.activePanelIndex = 0;
      bumpPhoto();
      renderPanelPills();
      setActivePanel(state.activePanelIndex);
      commitHistory();
      syncUI();
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
    btn.className = 'btn preset-btn';
    btn.dataset.preset = preset.id;
    btn.innerHTML = `<span>${preset.badge}</span><span>${preset.name}</span>`;
    btn.addEventListener('click', () => {
      if (state.gradeScope === 'panel') {
        const data = ensurePhotoData(state.activePanelIndex);
        data.gradePreset = preset.id;
        if (!Number.isFinite(data.gradeIntensity)) data.gradeIntensity = state.colorIntensity;
      } else {
        state.colorPreset = preset.id;
      }
      bumpPhoto();
      updatePresetPickerState();
      updateGradeValue();
      redraw();
      commitHistory();
    });
    presetPicker.appendChild(btn);
  }
}

function updatePresetPickerState() {
  const preset = currentPreset();
  presetPicker?.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === preset);
  });
}

function updateGradeValue() {
  if (gradeVal) gradeVal.textContent = `${Math.round(currentIntensity() * 100)}%`;
  if (gradeIntensity) gradeIntensity.value = currentIntensity();
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
      commitHistory();
    });

    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', sample.name);
      e.dataTransfer.effectAllowed = 'copy';
    });

    sampleGrid.appendChild(thumb);
  }
}

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

  if (photoInput) {
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        URL.revokeObjectURL(url);
        setPanelImage(state.activePanelIndex, img);
        commitHistory();
      } catch (error) {
        if (exportStatus) exportStatus.textContent = `Could not load photo: ${error.message}`;
      } finally {
        photoInput.value = '';
      }
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const sampleName = e.dataTransfer.getData('text/plain');
      if (sampleName && SAMPLE_LIST.some(s => s.name === sampleName)) {
        const img = await loadSampleImage(sampleName);
        setPanelImage(state.activePanelIndex, img);
        commitHistory();
        return;
      }
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          const url = URL.createObjectURL(file);
          const img = await loadImage(url);
          URL.revokeObjectURL(url);
          setPanelImage(state.activePanelIndex, img);
          commitHistory();
        } catch (error) {
          if (exportStatus) exportStatus.textContent = `Could not load photo: ${error.message}`;
        }
      }
    });
  }

  canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    const pt = getCanvasCoords(e);
    const panelIdx = getPanelAtPoint(pt.x, pt.y);
    const targetPanel = panelIdx !== -1 ? panelIdx : state.activePanelIndex;

    const sampleName = e.dataTransfer.getData('text/plain');
    if (sampleName && SAMPLE_LIST.some(s => s.name === sampleName)) {
      const img = await loadSampleImage(sampleName);
      setPanelImage(targetPanel, img);
      setActivePanel(targetPanel);
      commitHistory();
      return;
    }
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        URL.revokeObjectURL(url);
        setPanelImage(targetPanel, img);
        setActivePanel(targetPanel);
        commitHistory();
      } catch (error) {
        if (exportStatus) exportStatus.textContent = `Could not load photo: ${error.message}`;
      }
    }
  });

  if (btnFillAll) {
    btnFillAll.addEventListener('click', () => {
      const currentImg = state.panelPhotos[state.activePanelIndex]?.image || state.globalPhoto;
      if (!currentImg) return;
      const preset = LAYOUT_PRESETS.find(l => l.id === state.layout) || LAYOUT_PRESETS[0];
      for (let i = 0; i < preset.count; i++) {
        const data = ensurePhotoData(i);
        data.image = currentImg;
      }
      state.globalPhoto = currentImg;
      bumpPhoto();
      redraw();
      commitHistory();
    });
  }

  if (btnResetCrop) {
    btnResetCrop.addEventListener('click', () => {
      const data = state.panelPhotos[state.activePanelIndex];
      if (!data) return;
      data.panX = 0;
      data.panY = 0;
      data.zoom = 1.0;
      bumpPhoto();
      setActivePanel(state.activePanelIndex);
      commitHistory();
    });
  }

  if (btnLoadCast) btnLoadCast.addEventListener('click', () => { loadSampleCast().catch(() => {}); });
}

async function loadSampleCast() {
  const preset = LAYOUT_PRESETS.find(l => l.id === state.layout) || LAYOUT_PRESETS[0];
  const images = await Promise.all(SAMPLE_LIST.map(s => loadSampleImage(s.name)));
  state.panelPhotos = [];
  for (let i = 0; i < preset.count; i++) {
    state.panelPhotos.push({
      image: images[i % images.length],
      panX: ((i * 0.12) % 0.3) - 0.1,
      panY: ((i * 0.1) % 0.25) - 0.08,
      zoom: 1.05 + (i % 3) * 0.06,
    });
  }
  state.globalPhoto = images[0];
  bumpPhoto();
  renderPanelPills();
  setActivePanel(0);
}

function initCropControls() {
  if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (zoomVal) zoomVal.textContent = `${val.toFixed(1)}x`;
      ensurePhotoData(state.activePanelIndex).zoom = val;
      bumpPhoto();
      redraw();
      scheduleCommit();
    });
    zoomSlider.addEventListener('change', commitHistory);
  }

  if (panXSlider) {
    panXSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (panXVal) panXVal.textContent = val.toFixed(2);
      ensurePhotoData(state.activePanelIndex).panX = val;
      bumpPhoto();
      redraw();
      scheduleCommit();
    });
    panXSlider.addEventListener('change', commitHistory);
  }

  if (panYSlider) {
    panYSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (panYVal) panYVal.textContent = val.toFixed(2);
      ensurePhotoData(state.activePanelIndex).panY = val;
      bumpPhoto();
      redraw();
      scheduleCommit();
    });
    panYSlider.addEventListener('change', commitHistory);
  }
}

// === CANVAS INTERACTION ===
let interaction = null;

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
    y: (e.clientY - rect.top) * (canvas.height / Math.max(1, rect.height)),
  };
}

function getPanelAtPoint(px, py) {
  const panels = computePanelsForState(state, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (px >= p.x && px <= p.x + p.width && py >= p.y && py <= p.y + p.height) return i;
  }
  return -1;
}

function pointInBox(pt, box) {
  return pt.x >= box.x && pt.x <= box.x + box.width && pt.y >= box.y && pt.y <= box.y + box.height;
}

function getHitText(pt) {
  const layout = getTypographyLayout(state.typography, canvas.width, canvas.height);
  const selected = state.typography.selectedLayer || 'title';
  const selectedInfo = layout.layers[selected];
  if (selectedInfo) {
    const hx = selectedInfo.handle.x;
    const hy = selectedInfo.handle.y;
    const radius = Math.max(14, canvas.width * 0.012);
    if (Math.hypot(pt.x - hx, pt.y - hy) <= radius) {
      return { layer: selected, handle: true, info: selectedInfo };
    }
  }
  for (const name of [...LAYER_NAMES].reverse()) {
    const info = layout.layers[name];
    if (info && pointInBox(pt, info.box)) return { layer: name, handle: false, info };
  }
  return null;
}

function initCanvasInteraction() {
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    const pt = getCanvasCoords(e);
    const hit = getHitText(pt);

    if (hit) {
      state.typography.selectedLayer = hit.layer;
      const layer = resolveLayer(state.typography, hit.layer);
      interaction = {
        type: hit.handle ? 'resize' : 'move',
        pointerId: e.pointerId,
        layer: hit.layer,
        startX: pt.x,
        startY: pt.y,
        startLayerX: Number.isFinite(layer.x) ? layer.x : (hit.info.anchorX / canvas.width) * 100,
        startLayerY: Number.isFinite(layer.y) ? layer.y : (hit.info.anchorY / canvas.height) * 100,
        startSize: hit.info.logicalSize,
        startDistance: Math.max(1, Math.hypot(pt.x - hit.info.anchorX, pt.y - hit.info.anchorY)),
      };
      canvas.setPointerCapture?.(e.pointerId);
      syncLetteringUI();
      redraw();
      e.preventDefault();
      return;
    }

    const panelIdx = getPanelAtPoint(pt.x, pt.y);
    if (panelIdx !== -1) {
      setActivePanel(panelIdx);
      const data = ensurePhotoData(panelIdx);
      interaction = {
        type: 'pan',
        pointerId: e.pointerId,
        panelIdx,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: data.panX || 0,
        startPanY: data.panY || 0,
        moved: false,
      };
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!interaction) {
      const pt = getCanvasCoords(e);
      const hovering = !!getHitText(pt);
      if (hovering !== guideUI.hoveredLettering) {
        guideUI.hoveredLettering = hovering;
        canvas.style.cursor = hovering ? 'move' : 'crosshair';
        redraw();
      }
      return;
    }
    const pt = getCanvasCoords(e);

    if (interaction.type === 'move') {
      const layer = resolveLayer(state.typography, interaction.layer);
      const target = state.typography.layers[interaction.layer];
      let x = interaction.startLayerX + ((pt.x - interaction.startX) / canvas.width) * 100;
      let y = interaction.startLayerY + ((pt.y - interaction.startY) / canvas.height) * 100;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      const snap = Math.abs(x - 50) <= Math.max(0.8, 14 / canvas.width * 100);
      if (snap) x = 50;
      state._snapGuide = snap;
      target.x = Math.round(x * 10) / 10;
      target.y = Math.round(y * 10) / 10;
      redraw();
      syncPositionUI(layer, target);
    } else if (interaction.type === 'resize') {
      const meta = LAYER_META[interaction.layer];
      const info = getTypographyLayout(state.typography, canvas.width, canvas.height).layers[interaction.layer];
      const distance = Math.max(1, Math.hypot(pt.x - info.anchorX, pt.y - info.anchorY));
      const ratio = distance / interaction.startDistance;
      const next = Math.max(meta.minSize, Math.min(meta.maxSize, interaction.startSize * ratio));
      state.typography.layers[interaction.layer].size = Math.round(next * 10) / 10;
      redraw();
      syncLetteringUI();
    } else if (interaction.type === 'pan') {
      const rect = canvas.getBoundingClientRect();
      if (Math.abs(e.clientX - interaction.startClientX) > 3 || Math.abs(e.clientY - interaction.startClientY) > 3) {
        interaction.moved = true;
      }
      const data = ensurePhotoData(interaction.panelIdx);
      data.panX = Math.max(-1, Math.min(1, interaction.startPanX + ((e.clientX - interaction.startClientX) / Math.max(1, rect.width)) * 2));
      data.panY = Math.max(-1, Math.min(1, interaction.startPanY + ((e.clientY - interaction.startClientY) / Math.max(1, rect.height)) * 2));
      if (panXSlider) { panXSlider.value = data.panX; if (panXVal) panXVal.textContent = data.panX.toFixed(2); }
      if (panYSlider) { panYSlider.value = data.panY; if (panYVal) panYVal.textContent = data.panY.toFixed(2); }
      bumpPhoto();
      redraw();
    }
  });

  const endPointer = (e) => {
    if (!interaction) return;
    const current = interaction;
    interaction = null;
    state._snapGuide = false;
    if (current.type !== 'pan') {
      guideUI.hoveredLettering = e.type === 'pointerup' && e.pointerType === 'mouse'
        && !!getHitText(getCanvasCoords(e));
    }
    try { canvas.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    if (current.type === 'pan' && !current.moved) {
      state.gradeScope = 'panel';
      syncScopeUI();
      commitHistory();
    } else {
      commitHistory();
    }
    redraw();
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    if (!interaction && guideUI.hoveredLettering) {
      guideUI.hoveredLettering = false;
      canvas.style.cursor = 'crosshair';
      redraw();
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const data = ensurePhotoData(state.activePanelIndex);
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    data.zoom = Math.max(1.0, Math.min(3.0, (data.zoom || 1.0) + delta));
    if (zoomSlider) { zoomSlider.value = data.zoom; if (zoomVal) zoomVal.textContent = `${data.zoom.toFixed(1)}x`; }
    bumpPhoto();
    redraw();
    scheduleCommit(500);
  }, { passive: false });
}

// === TEXT CONTROLS ===
function initCaptionControls() {
  const bindText = (input, key, onChange) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      state.typography[key] = e.target.value;
      onChange?.(e.target.value);
      redraw();
      scheduleCommit();
      scheduleThumbnails();
    });
    input.addEventListener('change', commitHistory);
  };

  bindText(titleInput, 'mainTitle', (value) => {
    if (previewTitle) previewTitle.textContent = value || 'UNTITLED COVER';
    if (mobilePreviewTitle) mobilePreviewTitle.textContent = value || 'UNTITLED COVER';
  });
  bindText(subtitleInput, 'subtitle');
  bindText(taglineInput, 'tagline');
  bindText(quoteInput, 'quoteLine');
  bindText(badgeInput, 'badgeText');

  if (gradeIntensity) {
    gradeIntensity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (state.gradeScope === 'panel') {
        ensurePhotoData(state.activePanelIndex).gradeIntensity = val;
      } else {
        state.colorIntensity = val;
      }
      if (gradeVal) gradeVal.textContent = `${Math.round(val * 100)}%`;
      bumpPhoto();
      redraw();
      scheduleCommit();
    });
    gradeIntensity.addEventListener('change', commitHistory);
  }

  aspectPicker?.querySelectorAll('.btn-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.canvasWidth = parseInt(chip.dataset.w, 10);
      state.canvasHeight = parseInt(chip.dataset.h, 10);
      bumpPhoto();
      updateAspectUI();
      redraw();
      updateCanvasDisplaySize();
      commitHistory();
    });
  });

  placementSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.letteringPlacement = btn.dataset.placement;
      bumpPhoto();
      updatePlacementUI();
      redraw();
      updateCanvasDisplaySize();
      commitHistory();
    });
  });

  gradeScopeSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.gradeScope = btn.dataset.scope;
      syncScopeUI();
      redraw();
      commitHistory();
    });
  });

  panelPrev?.addEventListener('click', () => {
    setActivePanel(state.activePanelIndex - 1);
    commitHistory();
  });
  panelNext?.addEventListener('click', () => {
    setActivePanel(state.activePanelIndex + 1);
    commitHistory();
  });

  $('btn-reset-strength')?.addEventListener('click', () => {
    if (state.gradeScope === 'panel') {
      ensurePhotoData(state.activePanelIndex).gradeIntensity = 0.75;
    } else {
      state.colorIntensity = 0.75;
    }
    bumpPhoto();
    updateGradeValue();
    redraw();
    commitHistory();
  });

  $('btn-remove-panel-look')?.addEventListener('click', () => {
    const data = state.panelPhotos[state.activePanelIndex];
    if (data) {
      delete data.gradePreset;
      delete data.gradeIntensity;
    }
    bumpPhoto();
    syncScopeUI();
    redraw();
    commitHistory();
  });

  $('btn-reset-colour')?.addEventListener('click', () => {
    state.colorPreset = 'golden-hour';
    state.colorIntensity = 0.75;
    state.gradeScope = 'global';
    for (const data of state.panelPhotos) {
      if (data) { delete data.gradePreset; delete data.gradeIntensity; }
    }
    bumpPhoto();
    updatePresetPickerState();
    updateGradeValue();
    syncScopeUI();
    redraw();
    commitHistory();
  });

  // Layer tabs
  layerTabs?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.typography.selectedLayer = btn.dataset.layer;
      syncLetteringUI();
      redraw();
    });
  });

  // Fonts
  if (letterFont) {
    letterFont.innerHTML = FONTS.map(f => `<option value="${f.family}">${f.family}</option>`).join('');
    letterFont.addEventListener('change', (e) => {
      const name = state.typography.selectedLayer || 'title';
      state.typography.layers[name].font = e.target.value;
      redraw();
      scheduleThumbnails();
      commitHistory();
    });
  }

  // Numeric + range pairs
  bindRangePair('letter-size', 'size', LAYER_META);
  bindRangePair('letter-spacing', 'spacing', LAYER_META);
  bindRangePair('letter-lineheight', 'lineHeight', LAYER_META);
  bindRangePair('letter-x', 'x', LAYER_META);
  bindRangePair('letter-y', 'y', LAYER_META);

  if (autoFitToggle) {
    autoFitToggle.addEventListener('change', (e) => {
      state.typography.autoFit = e.target.checked;
      redraw();
      commitHistory();
    });
  }

  positionGrid?.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = state.typography.selectedLayer || 'title';
      const target = state.typography.layers[name];
      const col = parseInt(btn.dataset.col, 10);
      const row = parseInt(btn.dataset.row, 10);
      const geo = getBandGeometry(state.canvasWidth, state.canvasHeight);
      const bandTopPct = (geo.bandTop / state.canvasHeight) * 100;
      const bandHpct = (geo.bandH / state.canvasHeight) * 100;
      const xs = [5.5, 50, 94.5];
      const ys = [bandTopPct + bandHpct * 0.18, bandTopPct + bandHpct * 0.5, bandTopPct + bandHpct * 0.82];
      target.x = xs[col];
      target.y = Math.round(ys[row] * 10) / 10;
      target.align = btn.dataset.align;
      redraw();
      syncLetteringUI();
      commitHistory();
    });
  });

  $('btn-reset-layer')?.addEventListener('click', () => {
    const name = state.typography.selectedLayer || 'title';
    const template = getTemplate(state.typography.template);
    state.typography.layers[name] = { ...template.layers[name] };
    redraw();
    syncLetteringUI();
    commitHistory();
  });

  $('btn-undo')?.addEventListener('click', undo);
  $('btn-redo')?.addEventListener('click', redo);
  $('btn-undo-mobile')?.addEventListener('click', undo);
  $('btn-redo-mobile')?.addEventListener('click', redo);

  const updateFocusGuide = () => {
    const active = document.activeElement;
    const focused = !!(active && (
      letteringGroup?.contains(active) || letteringSizeGroup?.contains(active)
    ));
    if (focused !== guideUI.focusedLettering) {
      guideUI.focusedLettering = focused;
      redraw();
    }
  };
  for (const group of [letteringGroup, letteringSizeGroup]) {
    group?.addEventListener('focusin', updateFocusGuide);
    group?.addEventListener('focusout', () => requestAnimationFrame(updateFocusGuide));
  }
}

function bindRangePair(prefix, prop, metaMap) {
  const range = $(`${prefix}-range`);
  const number = $(`${prefix}-number`);
  if (!range || !number) return;

  const apply = (raw, commit) => {
    const name = state.typography.selectedLayer || 'title';
    const meta = metaMap[name];
    let value = parseFloat(raw);
    if (!Number.isFinite(value)) return;
    const min = prop === 'x' || prop === 'y' ? 0 : (prop === 'size' ? meta.minSize : prop === 'spacing' ? meta.minSpacing : meta.minLine);
    const max = prop === 'x' || prop === 'y' ? 100 : (prop === 'size' ? meta.maxSize : prop === 'spacing' ? meta.maxSpacing : meta.maxLine);
    value = Math.max(min, Math.min(max, value));
    state.typography.layers[name][prop] = value;
    range.value = value;
    number.value = value;
    redraw();
    if (commit) commitHistory();
    else scheduleCommit();
  };

  range.addEventListener('input', (e) => apply(e.target.value, false));
  range.addEventListener('change', (e) => apply(e.target.value, true));
  number.addEventListener('input', (e) => apply(e.target.value, false));
  number.addEventListener('change', (e) => apply(e.target.value, true));
}

function syncPositionUI(layer, target) {
  const xr = $('letter-x-range'); const xn = $('letter-x-number');
  const yr = $('letter-y-range'); const yn = $('letter-y-number');
  if (xr) xr.value = target.x;
  if (xn) xn.value = target.x;
  if (yr) yr.value = target.y;
  if (yn) yn.value = target.y;
}

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
  positionGrid?.querySelectorAll('.pos-btn').forEach(btn => btn.classList.remove('active'));
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

// === TEMPLATES ===
let thumbnailTimer = 0;

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
  syncLetteringUI();
}

function renderTemplateCards() {
  templateCards?.querySelectorAll('.template-card').forEach(card => {
    const canvasEl = card.querySelector('canvas');
    if (canvasEl) drawTemplateThumbnail(canvasEl, state.typography, card.dataset.template);
    card.classList.toggle('active', card.dataset.template === state.typography.template);
  });
}

function scheduleThumbnails() {
  clearTimeout(thumbnailTimer);
  thumbnailTimer = setTimeout(renderTemplateCards, 220);
}

function applyTemplate(id) {
  const template = getTemplate(id);
  state.typography.template = id;
  state.typography.layers = cloneLayers(template.layers);
  redraw();
  syncLetteringUI();
  renderTemplateCards();
  commitHistory();
}

// === EXPORT ===
async function exportWithDims(w, h, filename) {
  if (exportStatus) exportStatus.textContent = 'Loading fonts and rendering high-res cover...';
  try {
    await exportCoverPng(state, w, h, filename || `neon-panel-${w}x${h}.png`);
    if (exportStatus) exportStatus.textContent = `Saved neon-panel-${w}x${h}.png!`;
  } catch (err) {
    if (exportStatus) exportStatus.textContent = `Export error: ${err.message}`;
  }
  syncUI();
}

function initExportButtons() {
  const configs = [
    { id: 'export-landscape', w: 1920, h: 1080, name: 'neon-panel-1920x1080.png' },
    { id: 'export-square', w: 1080, h: 1080, name: 'neon-panel-1080x1080.png' },
    { id: 'export-portrait', w: 1080, h: 1350, name: 'neon-panel-1080x1350.png' },
  ];
  for (const cfg of configs) {
    $(cfg.id)?.addEventListener('click', () => exportWithDims(cfg.w, cfg.h, cfg.name));
  }
  $('btn-export-preview')?.addEventListener('click', () => exportWithDims(state.canvasWidth, state.canvasHeight));
  $('btn-export-mobile')?.addEventListener('click', () => exportWithDims(state.canvasWidth, state.canvasHeight));
}

// === RESPONSIVE / MOBILE ===
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
    observer.observe(document.querySelector('.preview-area'));
  }
  window.addEventListener('resize', () => {
    applyResponsiveStructure();
    updateCanvasDisplaySize();
  });
}

// === SYNC ===
function updateAspectUI() {
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

function updatePlacementUI() {
  placementSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.placement === state.letteringPlacement);
  });
}

function syncScopeUI() {
  gradeScopeSwitch?.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scope === state.gradeScope);
  });
  if (gradeScopeHint) gradeScopeHint.textContent = state.gradeScope === 'panel' ? 'Panel only' : 'Entire poster';
  if (panelScopeLabel) panelScopeLabel.textContent = `PANEL ${String(state.activePanelIndex + 1).padStart(2, '0')}`;
  const panelMode = state.gradeScope === 'panel';
  panelScopeBar?.classList.toggle('panel-mode', panelMode);
  updatePresetPickerState();
  updateGradeValue();
}

export function syncUI() {
  if (titleInput) titleInput.value = state.typography.mainTitle || '';
  if (subtitleInput) subtitleInput.value = state.typography.subtitle || '';
  if (taglineInput) taglineInput.value = state.typography.tagline || '';
  if (quoteInput) quoteInput.value = state.typography.quoteLine || '';
  if (badgeInput) badgeInput.value = state.typography.badgeText || '';
  if (previewTitle) previewTitle.textContent = state.typography.mainTitle || 'UNTITLED COVER';
  if (mobilePreviewTitle) mobilePreviewTitle.textContent = state.typography.mainTitle || 'UNTITLED COVER';

  layoutPicker?.querySelectorAll('.layout-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  });
  updateAspectUI();
  updatePlacementUI();

  const preset = LAYOUT_PRESETS.find(l => l.id === state.layout) || LAYOUT_PRESETS[0];
  if (state.activePanelIndex >= preset.count) state.activePanelIndex = 0;
  renderPanelPills();
  setActivePanel(state.activePanelIndex);
  syncScopeUI();
  syncLetteringUI();
  updateHistoryButtons();
  renderTemplateCards();
  updateCanvasDisplaySize();
}

// === KEYBOARD ===
function isTextField(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (el.isContentEditable) return true;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(type);
  }
  return false;
}

function initKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (isTextField(e.target)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (key === 'y') {
      e.preventDefault();
      redo();
    }
  });
}

// === INIT ===
async function initApp() {
  buildTemplateCards();
  initLayoutPicker();
  initPresetPicker();
  initSampleGrid();
  renderPanelPills();
  initPhotoLoading();
  initCropControls();
  initCaptionControls();
  initCanvasInteraction();
  initExportButtons();
  initKeyboard();
  initResponsiveUI();

  try {
    await loadAllFonts();
  } catch (err) {
    console.warn('Font loading:', err);
  }
  renderTemplateCards();

  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await runShotHarness(params, state, redraw, loadImage, syncUI);
  } else {
    try {
      await loadSampleCast();
    } catch {
      redraw();
    }
  }

  syncUI();
  redraw();
  lastSnapshot = cloneValue(state);
  lastSignature = signature(state);
  updateHistoryButtons();

  window.__neonApp = {
    state,
    redraw,
    syncUI,
    commitHistory,
    undo,
    redo,
    applyTemplate,
    getTypographyLayout: () => getTypographyLayout(state.typography, state.canvasWidth, state.canvasHeight),
    computePanelsForState: (w, h, placement) => computePanelsForState(
      { ...state, letteringPlacement: placement || state.letteringPlacement },
      w, h,
    ),
    getLayoutPanels,
    layouts: LAYOUT_PRESETS,
    templates: LETTERING_TEMPLATES,
    colors: COLOR_PRESETS,
    fonts: FONTS,
    exportCoverPng,
    previewGuides: () => ({
      lettering: canvas.dataset.letteringGuide === 'true',
      panel: canvas.dataset.panelGuide === 'true',
    }),
    sheetState: () => sheetState,
    TITLE_SAFE_TOP,
    FOOTER_HEIGHT,
  };
  window.__neonReady = true;
}

initApp();
