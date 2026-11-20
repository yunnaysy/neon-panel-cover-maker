// Main application orchestrator for Neon Panel v2.
// Three-column studio: left (photos/samples), center (live preview),
// right (layout, grade, caption controls). Manages drag-and-drop,
// on-canvas pan & zoom, real-time rendering, and PNG export.

import { LAYOUT_PRESETS, computePanelPixelRects } from './layouts.js';
import { COLOR_PRESETS } from './colorGrades.js';
import { renderCoverArt } from './renderer.js';
import { exportCoverPng } from './export.js';
import { runShotHarness } from './shots.js';
import { defaultLayers } from './typography.js';
import { initPlus, drawEditorOverlay, setTypoInfo } from './plus.js';

// === SAMPLE PHOTOS ===
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

// === DOM ===
const canvas = document.getElementById('cover-canvas');
const layoutPicker = document.getElementById('layout-picker');
const aspectPicker = document.getElementById('aspect-picker');
const panelPillsContainer = document.getElementById('panel-pills-container');
const dropzone = document.getElementById('dropzone');
const photoInput = document.getElementById('photo-input');
const btnFillAll = document.getElementById('btn-fill-all');
const btnResetCrop = document.getElementById('btn-reset-crop');
const btnLoadCast = document.getElementById('btn-load-cast');
const sampleGrid = document.getElementById('sample-grid');
const zoomSlider = document.getElementById('zoom-slider');
const zoomVal = document.getElementById('zoom-val');
const panXSlider = document.getElementById('pan-x-slider');
const panXVal = document.getElementById('pan-x-val');
const panYSlider = document.getElementById('pan-y-slider');
const panYVal = document.getElementById('pan-y-val');
const presetPicker = document.getElementById('preset-picker');
const gradeIntensity = document.getElementById('grade-intensity');
const gradeVal = document.getElementById('grade-val');
const titleInput = document.getElementById('title-input');
const subtitleInput = document.getElementById('subtitle-input');
const taglineInput = document.getElementById('tagline-input');
const quoteInput = document.getElementById('quote-input');
const badgeInput = document.getElementById('badge-input');
const previewTitle = document.getElementById('preview-title');
const previewRatio = document.querySelector('.preview-ratio');
const activePanelIndicator = document.getElementById('active-panel-indicator');
const panelEditorTitle = document.getElementById('panel-editor-title');
const exportStatus = document.getElementById('export-status');

// === APPLICATION STATE ===
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
  adjustments: { exposure: 0, contrast: 0, saturation: 0 },
  panelGrades: [],
  decorations: {
    grain: true,
    vignette: true,
    halftone: true,
  },
  typography: {
    mainTitle: 'NEON LIGHTS',
    subtitle: 'Ocean Drive',
    tagline: 'ONE COAST · NO RULES · COMING SOON',
    quoteLine: '★★★★★  “A CLASSIC”',
    badgeText: 'ORIGINAL',
    titleTheme: 'coast-sunset',
    titleFont: 'Bebas Neue',
    textPosition: 'bottom',
    panelLabels: [],
    layers: defaultLayers(),
    template: 'classic-neon',
    letteringMode: 'below',
  },
};

// Cache for loaded sample images
const sampleImageCache = {};

/** Loads an image from a URL or object URL. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Redraws the cover art onto the active canvas. */
export function redraw() {
  if (canvas.width !== state.canvasWidth) canvas.width = state.canvasWidth;
  if (canvas.height !== state.canvasHeight) canvas.height = state.canvasHeight;
  const isCoverShot = document.body.classList.contains('shot-cover');
  const highlightIdx = isCoverShot || state.activePanelIndex < 0
    ? null
    : (state.hoveredPanelIndex ?? state.activePanelIndex);
  const info = renderCoverArt(canvas, state, { highlightPanelIndex: highlightIdx });
  setTypoInfo(info);
  if (!isCoverShot) drawEditorOverlay(canvas);
}

/** Updates panel pills in UI. */
function renderPanelPills() {
  if (!panelPillsContainer) return;
  const preset = LAYOUT_PRESETS.find(l => l.id === state.layout) || LAYOUT_PRESETS[0];
  panelPillsContainer.innerHTML = '';
  for (let i = 0; i < preset.count; i++) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `btn btn-secondary panel-pill ${i === state.activePanelIndex ? 'active' : ''}`;
    pill.textContent = `P${i + 1}`;
    pill.addEventListener('click', () => setActivePanel(i));
    panelPillsContainer.appendChild(pill);
  }
}

/** Sets active panel index and synchronizes sliders. */
function setActivePanel(idx) {
  state.activePanelIndex = idx;
  if (activePanelIndicator) activePanelIndicator.textContent = `P${idx + 1}`;
  if (panelEditorTitle) panelEditorTitle.textContent = `Active Panel (P${idx + 1})`;

  const pills = panelPillsContainer?.querySelectorAll('.panel-pill') || [];
  pills.forEach((p, i) => p.classList.toggle('active', i === idx));

  const photoData = state.panelPhotos[idx];
  if (photoData) {
    if (zoomSlider) { zoomSlider.value = photoData.zoom || 1.0; zoomVal.textContent = `${(photoData.zoom || 1.0).toFixed(1)}x`; }
    if (panXSlider) { panXSlider.value = photoData.panX || 0; panXVal.textContent = (photoData.panX || 0).toFixed(2); }
    if (panYSlider) { panYSlider.value = photoData.panY || 0; panYVal.textContent = (photoData.panY || 0).toFixed(2); }
  } else {
    if (zoomSlider) { zoomSlider.value = 1.0; zoomVal.textContent = '1.0x'; }
    if (panXSlider) { panXSlider.value = 0; panXVal.textContent = '0.00'; }
    if (panYSlider) { panYSlider.value = 0; panYVal.textContent = '0.00'; }
  }
  redraw();
}

/** Assigns an image to a specific panel. */
function setPanelImage(panelIdx, img) {
  if (!state.panelPhotos[panelIdx]) {
    state.panelPhotos[panelIdx] = { image: img, panX: 0, panY: 0, zoom: 1.0 };
  } else {
    state.panelPhotos[panelIdx].image = img;
  }
  if (!state.globalPhoto) state.globalPhoto = img;
  redraw();
}

/** Loads a sample image (cached). */
async function loadSampleImage(name) {
  if (sampleImageCache[name]) return sampleImageCache[name];
  const img = await loadImage(`samples/${name}.jpg`);
  sampleImageCache[name] = img;
  return img;
}

// === INITIALIZATION FUNCTIONS ===

function initLayoutPicker() {
  if (!layoutPicker) return;
  layoutPicker.innerHTML = '';
  for (const preset of LAYOUT_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn layout-btn ${preset.id === state.layout ? 'active' : ''}`;
    btn.innerHTML = `<span class="layout-icon">${preset.icon}</span><span class="layout-label">${preset.name}</span>`;
    btn.addEventListener('click', () => {
      state.layout = preset.id;
      layoutPicker.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (state.activePanelIndex >= preset.count) state.activePanelIndex = 0;
      renderPanelPills();
      setActivePanel(state.activePanelIndex);
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
    btn.innerHTML = `<span>${preset.badge}</span><span>${preset.name}</span>`;
    btn.addEventListener('click', () => {
      state.colorPreset = preset.id;
      presetPicker.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    presetPicker.appendChild(btn);
  }
}

/** Builds sample thumbnail grid. */
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

    // Click to load into active panel
    thumb.addEventListener('click', async () => {
      const loaded = await loadSampleImage(sample.name);
      setPanelImage(state.activePanelIndex, loaded);
    });

    // Drag start
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

      // Check if dropped from sample grid
      const sampleName = e.dataTransfer.getData('text/plain');
      if (sampleName && SAMPLE_LIST.some(s => s.name === sampleName)) {
        const img = await loadSampleImage(sampleName);
        setPanelImage(state.activePanelIndex, img);
        return;
      }

      const file = e.dataTransfer.files[0];
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

  // Also allow drop on canvas for panel-targeted drop
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
        if (!state.panelPhotos[i]) {
          state.panelPhotos[i] = { image: currentImg, panX: 0, panY: 0, zoom: 1.0 };
        } else {
          state.panelPhotos[i].image = currentImg;
        }
      }
      state.globalPhoto = currentImg;
      redraw();
    });
  }

  if (btnResetCrop) {
    btnResetCrop.addEventListener('click', () => {
      if (!state.panelPhotos[state.activePanelIndex]) return;
      state.panelPhotos[state.activePanelIndex].panX = 0;
      state.panelPhotos[state.activePanelIndex].panY = 0;
      state.panelPhotos[state.activePanelIndex].zoom = 1.0;
      setActivePanel(state.activePanelIndex);
    });
  }

  // "Load Sample Cast" button
  if (btnLoadCast) {
    btnLoadCast.addEventListener('click', loadSampleCast);
  }
}

/** Loads all sample photos and assigns one per panel. */
async function loadSampleCast() {
  const preset = LAYOUT_PRESETS.find(l => l.id === state.layout) || LAYOUT_PRESETS[0];
  const castNames = SAMPLE_LIST.map(s => s.name);
  const promises = castNames.map(n => loadSampleImage(n));
  const images = await Promise.all(promises);

  state.panelPhotos = [];
  for (let i = 0; i < preset.count; i++) {
    const img = images[i % images.length];
    state.panelPhotos.push({
      image: img,
      panX: ((i * 0.12) % 0.3) - 0.1,
      panY: ((i * 0.1) % 0.25) - 0.08,
      zoom: 1.05 + (i % 3) * 0.06,
    });
  }
  state.globalPhoto = images[0];
  renderPanelPills();
  setActivePanel(0);
}

function initCropAndPan() {
  if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      zoomVal.textContent = `${val.toFixed(1)}x`;
      if (!state.panelPhotos[state.activePanelIndex]) {
        state.panelPhotos[state.activePanelIndex] = { image: state.globalPhoto, panX: 0, panY: 0, zoom: val };
      } else {
        state.panelPhotos[state.activePanelIndex].zoom = val;
      }
      redraw();
    });
  }

  if (panXSlider) {
    panXSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      panXVal.textContent = val.toFixed(2);
      if (!state.panelPhotos[state.activePanelIndex]) {
        state.panelPhotos[state.activePanelIndex] = { image: state.globalPhoto, panX: val, panY: 0, zoom: 1.0 };
      } else {
        state.panelPhotos[state.activePanelIndex].panX = val;
      }
      redraw();
    });
  }

  if (panYSlider) {
    panYSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      panYVal.textContent = val.toFixed(2);
      if (!state.panelPhotos[state.activePanelIndex]) {
        state.panelPhotos[state.activePanelIndex] = { image: state.globalPhoto, panX: 0, panY: val, zoom: 1.0 };
      } else {
        state.panelPhotos[state.activePanelIndex].panY = val;
      }
      redraw();
    });
  }

  // Interactive canvas dragging & wheel zoom
  let isDragging = false;
  let startX = 0, startY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    const pt = getCanvasCoords(e);
    const panelIdx = getPanelAtPoint(pt.x, pt.y);
    if (panelIdx !== -1) {
      setActivePanel(panelIdx);
      isDragging = true;
      canvas.setPointerCapture?.(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) {
      if (e.pointerType !== 'mouse') return;
      const pt = getCanvasCoords(e);
      const panelIdx = getPanelAtPoint(pt.x, pt.y);
      if (panelIdx !== state.hoveredPanelIndex && panelIdx !== -1) {
        state.hoveredPanelIndex = panelIdx;
        redraw();
      }
      return;
    }
    const deltaX = (e.clientX - startX) * 0.005;
    const deltaY = (e.clientY - startY) * 0.005;
    startX = e.clientX;
    startY = e.clientY;

    const cur = state.panelPhotos[state.activePanelIndex] || { image: state.globalPhoto, panX: 0, panY: 0, zoom: 1.0 };
    cur.panX = Math.max(-1, Math.min(1, (cur.panX || 0) + deltaX));
    cur.panY = Math.max(-1, Math.min(1, (cur.panY || 0) + deltaY));
    state.panelPhotos[state.activePanelIndex] = cur;

    if (panXSlider) { panXSlider.value = cur.panX; panXVal.textContent = cur.panX.toFixed(2); }
    if (panYSlider) { panYSlider.value = cur.panY; panYVal.textContent = cur.panY.toFixed(2); }
    redraw();
  });

  window.addEventListener('pointerup', () => { isDragging = false; });
  window.addEventListener('pointercancel', () => { isDragging = false; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = state.panelPhotos[state.activePanelIndex] || { image: state.globalPhoto, panX: 0, panY: 0, zoom: 1.0 };
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    cur.zoom = Math.max(1.0, Math.min(3.0, (cur.zoom || 1.0) + delta));
    state.panelPhotos[state.activePanelIndex] = cur;
    if (zoomSlider) { zoomSlider.value = cur.zoom; zoomVal.textContent = `${cur.zoom.toFixed(1)}x`; }
    redraw();
  }, { passive: false });
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getPanelAtPoint(px, py) {
  const panels = computePanelPixelRects(state.layout, canvas.width, canvas.height);
  return panels.findIndex(p =>
    px >= p.x && px <= p.x + p.width && py >= p.y && py <= p.y + p.height
  );
}

function initCaptionAndDecorations() {
  if (titleInput) titleInput.addEventListener('input', (e) => {
    state.typography.mainTitle = e.target.value;
    if (previewTitle) previewTitle.textContent = e.target.value || 'UNTITLED COVER';
    redraw();
  });
  if (subtitleInput) subtitleInput.addEventListener('input', (e) => { state.typography.subtitle = e.target.value; redraw(); });
  if (taglineInput) taglineInput.addEventListener('input', (e) => { state.typography.tagline = e.target.value; redraw(); });
  if (quoteInput) quoteInput.addEventListener('input', (e) => { state.typography.quoteLine = e.target.value; redraw(); });
  if (badgeInput) badgeInput.addEventListener('input', (e) => { state.typography.badgeText = e.target.value; redraw(); });

  if (gradeIntensity) {
    gradeIntensity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.colorIntensity = val;
      if (gradeVal) gradeVal.textContent = `${Math.round(val * 100)}%`;
      redraw();
    });
  }

  // Aspect picker
  aspectPicker?.querySelectorAll('.btn-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      aspectPicker.querySelectorAll('.btn-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.canvasWidth = parseInt(chip.dataset.w, 10);
      state.canvasHeight = parseInt(chip.dataset.h, 10);
      if (previewRatio) {
        const aspect = chip.dataset.aspect;
        previewRatio.innerHTML = `${aspect} <i></i> ${state.canvasWidth} × ${state.canvasHeight}`;
      }
      redraw();
    });
  });
}

function initExportButtons() {
  const configs = [
    { id: 'export-landscape', w: 1920, h: 1080, name: 'neon-panel-1920x1080.png' },
    { id: 'export-square', w: 1080, h: 1080, name: 'neon-panel-1080x1080.png' },
    { id: 'export-portrait', w: 1080, h: 1350, name: 'neon-panel-1080x1350.png' },
  ];
  for (const cfg of configs) {
    const btn = document.getElementById(cfg.id);
    if (!btn) continue;
    btn.addEventListener('click', async () => {
      if (exportStatus) exportStatus.textContent = 'Rendering high-res cover...';
      try {
        await exportCoverPng(state, cfg.w, cfg.h, cfg.name);
        if (exportStatus) exportStatus.textContent = `Saved ${cfg.name}!`;
      } catch (err) {
        if (exportStatus) exportStatus.textContent = `Export error: ${err.message}`;
      }
    });
  }
}

/** Synchronizes UI controls to match current state. */
export function syncUI() {
  if (titleInput) titleInput.value = state.typography.mainTitle || '';
  if (subtitleInput) subtitleInput.value = state.typography.subtitle || '';
  if (taglineInput) taglineInput.value = state.typography.tagline || '';
  if (quoteInput) quoteInput.value = state.typography.quoteLine || '';
  if (badgeInput) badgeInput.value = state.typography.badgeText || '';
  if (previewTitle) previewTitle.textContent = state.typography.mainTitle || 'UNTITLED COVER';

  initLayoutPicker();
  initPresetPicker();
  renderPanelPills();

  if (state.activePanelIndex >= 0) setActivePanel(state.activePanelIndex);

  aspectPicker?.querySelectorAll('.btn-chip').forEach(chip => {
    const w = parseInt(chip.dataset.w, 10);
    const h = parseInt(chip.dataset.h, 10);
    chip.classList.toggle('active', w === state.canvasWidth && h === state.canvasHeight);
    if (w === state.canvasWidth && h === state.canvasHeight && previewRatio) {
      previewRatio.innerHTML = `${chip.dataset.aspect} <i></i> ${w} × ${h}`;
    }
  });
}

/** Application initialization. */
async function initApp() {
  // Load fonts
  try {
    await Promise.all([
      document.fonts.load('60px "Bebas Neue"'),
      document.fonts.load('40px "Pacifico"'),
      document.fonts.load('40px "Kaushan Script"'),
      document.fonts.load('30px "Oswald"'),
      document.fonts.load('40px "Anton"'),
      document.fonts.load('40px "Archivo Black"'),
      document.fonts.load('40px "Monoton"'),
      document.fonts.load('900 40px "Playfair Display"'),
      document.fonts.load('40px "Saira Stencil One"'),
      document.fonts.ready,
    ]);
  } catch (err) {
    console.warn('Font loading:', err);
  }

  initLayoutPicker();
  initPresetPicker();
  initSampleGrid();
  renderPanelPills();
  initPhotoLoading();
  initCropAndPan();
  initCaptionAndDecorations();
  initExportButtons();
  initPlus({ state, canvas, redraw, syncUI, setActivePanel, getCanvasCoords, getPanelAtPoint, exportCoverPng });

  // Check for screenshot harness
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await runShotHarness(params, state, redraw, loadImage, syncUI);
  } else {
    // Load sample cast by default so the editor never looks empty
    try {
      await loadSampleCast();
    } catch {
      redraw();
    }
  }
}

initApp();
