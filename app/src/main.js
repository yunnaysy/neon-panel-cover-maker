// Main application orchestrator for Neon Panel.
// Manages UI interactions, drag-and-drop photo loading, on-canvas pan & zoom,
// real-time rendering, and high-res PNG export.

import { LAYOUT_PRESETS, computePanelPixelRects } from './layouts.js';
import { COLOR_PRESETS } from './colorGrades.js';
import { TITLE_COLOR_THEMES } from './typography.js';
import { renderCoverArt } from './renderer.js';
import { exportCoverPng } from './export.js';
import { runShotHarness } from './shots.js';

// DOM elements
const canvas = document.getElementById('cover-canvas');
const layoutPicker = document.getElementById('layout-picker');
const aspectPicker = document.getElementById('aspect-picker');
const panelPillsContainer = document.getElementById('panel-pills-container');
const dropzone = document.getElementById('dropzone');
const photoInput = document.getElementById('photo-input');
const btnFillAll = document.getElementById('btn-fill-all');
const btnResetCrop = document.getElementById('btn-reset-crop');
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
const fontSelect = document.getElementById('font-select');
const themePicker = document.getElementById('theme-picker');
const btnPosBottom = document.getElementById('btn-pos-bottom');
const btnPosTop = document.getElementById('btn-pos-top');
const activePanelIndicator = document.getElementById('active-panel-indicator');
const panelEditorTitle = document.getElementById('panel-editor-title');
const exportStatus = document.getElementById('export-status');

// Decoration checkboxes
const decCheckboxes = {
  sun: document.getElementById('dec-sun'),
  palms: document.getElementById('dec-palms'),
  grid: document.getElementById('dec-grid'),
  grain: document.getElementById('dec-grain'),
  vignette: document.getElementById('dec-vignette'),
  frame: document.getElementById('dec-frame'),
  letterbox: document.getElementById('dec-letterbox'),
};

// Application State
export const state = {
  layout: 'hero-strip',
  canvasWidth: 1920,
  canvasHeight: 1080,
  activePanelIndex: 0,
  hoveredPanelIndex: null,
  panelPhotos: [],
  globalPhoto: null,
  colorPreset: 'sunset',
  colorIntensity: 0.85,
  decorations: {
    sun: true,
    palms: true,
    grid: true,
    grain: true,
    vignette: true,
    frame: true,
    letterbox: false,
  },
  typography: {
    mainTitle: 'VICE LIGHTS',
    subtitle: 'OCEAN DRIVE CHRONICLES',
    tagline: 'FALL 2026 • AN ORIGINAL TALE',
    titleTheme: 'vice-sunset',
    titleFont: 'Bebas Neue',
    textPosition: 'bottom',
  },
};

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
  const highlightIdx = isCoverShot || state.activePanelIndex < 0 ? null : (state.hoveredPanelIndex ?? state.activePanelIndex);
  renderCoverArt(canvas, state, { highlightPanelIndex: highlightIdx });
}

/** Updates panel pills in UI according to current layout. */
function renderPanelPills() {
  const currentLayout = LAYOUT_PRESETS.find((l) => l.id === state.layout) || LAYOUT_PRESETS[0];
  panelPillsContainer.innerHTML = '';

  for (let i = 0; i < currentLayout.count; i++) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `btn btn-secondary panel-pill ${i === state.activePanelIndex ? 'active' : ''}`;
    pill.textContent = `P${i + 1}`;
    pill.addEventListener('click', () => {
      setActivePanel(i);
    });
    panelPillsContainer.appendChild(pill);
  }
}

/** Sets active panel index and synchronizes sliders. */
function setActivePanel(idx) {
  state.activePanelIndex = idx;
  activePanelIndicator.textContent = `P${idx + 1}`;
  panelEditorTitle.textContent = `🖼️ Active Panel (Panel ${idx + 1})`;

  // Highlight active pill
  const pills = panelPillsContainer.querySelectorAll('.panel-pill');
  pills.forEach((p, i) => {
    p.classList.toggle('active', i === idx);
  });

  // Sync sliders
  const photoData = state.panelPhotos[idx];
  if (photoData) {
    zoomSlider.value = photoData.zoom || 1.0;
    zoomVal.textContent = `${(photoData.zoom || 1.0).toFixed(1)}x`;
    panXSlider.value = photoData.panX || 0.0;
    panXVal.textContent = (photoData.panX || 0.0).toFixed(2);
    panYSlider.value = photoData.panY || 0.0;
    panYVal.textContent = (photoData.panY || 0.0).toFixed(2);
  } else {
    zoomSlider.value = 1.0;
    zoomVal.textContent = '1.0x';
    panXSlider.value = 0.0;
    panXVal.textContent = '0.0';
    panYSlider.value = 0.0;
    panYVal.textContent = '0.0';
  }

  redraw();
}

/** Assigns an image object to a specific panel. */
function setPanelImage(panelIdx, img) {
  if (!state.panelPhotos[panelIdx]) {
    state.panelPhotos[panelIdx] = { image: img, panX: 0, panY: 0, zoom: 1.0 };
  } else {
    state.panelPhotos[panelIdx].image = img;
  }
  if (!state.globalPhoto) {
    state.globalPhoto = img;
  }
  redraw();
}

/** Builds layout selector buttons. */
function initLayoutPicker() {
  layoutPicker.innerHTML = '';
  for (const preset of LAYOUT_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn layout-btn ${preset.id === state.layout ? 'active' : ''}`;
    btn.innerHTML = `<span class="layout-icon">${preset.icon}</span><span class="layout-label">${preset.name}</span>`;
    btn.addEventListener('click', () => {
      state.layout = preset.id;
      layoutPicker.querySelectorAll('.layout-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (state.activePanelIndex >= preset.count) {
        state.activePanelIndex = 0;
      }
      renderPanelPills();
      setActivePanel(state.activePanelIndex);
      redraw();
    });
    layoutPicker.appendChild(btn);
  }
}

/** Builds color preset buttons. */
function initPresetPicker() {
  presetPicker.innerHTML = '';
  for (const preset of COLOR_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn preset-btn ${preset.id === state.colorPreset ? 'active' : ''}`;
    btn.innerHTML = `<span>${preset.badge}</span><span>${preset.name}</span>`;
    btn.addEventListener('click', () => {
      state.colorPreset = preset.id;
      presetPicker.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    presetPicker.appendChild(btn);
  }
}

/** Builds title theme buttons. */
function initThemePicker() {
  themePicker.innerHTML = '';
  for (const theme of TITLE_COLOR_THEMES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn theme-btn ${theme.id === state.typography.titleTheme ? 'active' : ''}`;
    btn.innerHTML = `<span>${theme.badge}</span><span>${theme.name}</span>`;
    btn.addEventListener('click', () => {
      state.typography.titleTheme = theme.id;
      themePicker.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      redraw();
    });
    themePicker.appendChild(btn);
  }
}

/** Wires file upload and drag-and-drop. */
function initPhotoLoading() {
  dropzone.addEventListener('click', () => photoInput.click());

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = await loadImage(URL.createObjectURL(file));
    setPanelImage(state.activePanelIndex, img);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const img = await loadImage(URL.createObjectURL(file));
      setPanelImage(state.activePanelIndex, img);
    }
  });

  btnFillAll.addEventListener('click', () => {
    const currentImg = state.panelPhotos[state.activePanelIndex]?.image || state.globalPhoto;
    if (!currentImg) return;
    const currentLayout = LAYOUT_PRESETS.find((l) => l.id === state.layout) || LAYOUT_PRESETS[0];
    for (let i = 0; i < currentLayout.count; i++) {
      if (!state.panelPhotos[i]) {
        state.panelPhotos[i] = { image: currentImg, panX: 0, panY: 0, zoom: 1.0 };
      } else {
        state.panelPhotos[i].image = currentImg;
      }
    }
    state.globalPhoto = currentImg;
    redraw();
  });

  btnResetCrop.addEventListener('click', () => {
    if (!state.panelPhotos[state.activePanelIndex]) return;
    state.panelPhotos[state.activePanelIndex].panX = 0;
    state.panelPhotos[state.activePanelIndex].panY = 0;
    state.panelPhotos[state.activePanelIndex].zoom = 1.0;
    setActivePanel(state.activePanelIndex);
  });
}

/** Wires pan/zoom sliders and interactive canvas dragging. */
function initCropAndPan() {
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

  // Interactive mouse dragging & wheel zoom directly on canvas
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function getPanelAtPoint(px, py) {
    const panels = computePanelPixelRects(state.layout, canvas.width, canvas.height);
    return panels.findIndex(
      (p) => px >= p.x && px <= p.x + p.width && py >= p.y && py <= p.y + p.height
    );
  }

  canvas.addEventListener('mousedown', (e) => {
    const pt = getCanvasCoords(e);
    const panelIdx = getPanelAtPoint(pt.x, pt.y);
    if (panelIdx !== -1) {
      setActivePanel(panelIdx);
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) {
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
    cur.panX = Math.max(-1.0, Math.min(1.0, (cur.panX || 0) + deltaX));
    cur.panY = Math.max(-1.0, Math.min(1.0, (cur.panY || 0) + deltaY));
    state.panelPhotos[state.activePanelIndex] = cur;

    panXSlider.value = cur.panX;
    panXVal.textContent = cur.panX.toFixed(2);
    panYSlider.value = cur.panY;
    panYVal.textContent = cur.panY.toFixed(2);

    redraw();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = state.panelPhotos[state.activePanelIndex] || { image: state.globalPhoto, panX: 0, panY: 0, zoom: 1.0 };
    const deltaZoom = e.deltaY < 0 ? 0.08 : -0.08;
    cur.zoom = Math.max(1.0, Math.min(3.0, (cur.zoom || 1.0) + deltaZoom));
    state.panelPhotos[state.activePanelIndex] = cur;

    zoomSlider.value = cur.zoom;
    zoomVal.textContent = `${cur.zoom.toFixed(1)}x`;
    redraw();
  }, { passive: false });
}

/** Wires caption inputs and decoration toggles. */
function initCaptionAndDecorations() {
  titleInput.addEventListener('input', (e) => {
    state.typography.mainTitle = e.target.value;
    redraw();
  });

  subtitleInput.addEventListener('input', (e) => {
    state.typography.subtitle = e.target.value;
    redraw();
  });

  taglineInput.addEventListener('input', (e) => {
    state.typography.tagline = e.target.value;
    redraw();
  });

  if (fontSelect) {
    fontSelect.value = state.typography.titleFont || 'Bebas Neue';
    fontSelect.addEventListener('change', (e) => {
      state.typography.titleFont = e.target.value;
      redraw();
    });
  }

  btnPosBottom.addEventListener('click', () => {
    state.typography.textPosition = 'bottom';
    btnPosBottom.classList.add('active');
    btnPosTop.classList.remove('active');
    redraw();
  });

  btnPosTop.addEventListener('click', () => {
    state.typography.textPosition = 'top';
    btnPosTop.classList.add('active');
    btnPosBottom.classList.remove('active');
    redraw();
  });

  gradeIntensity.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.colorIntensity = val;
    gradeVal.textContent = `${Math.round(val * 100)}%`;
    redraw();
  });

  // Toggles
  for (const [key, checkbox] of Object.entries(decCheckboxes)) {
    if (!checkbox) continue;
    checkbox.addEventListener('change', (e) => {
      state.decorations[key] = e.target.checked;
      redraw();
    });
  }

  // Aspect picker chips
  aspectPicker.querySelectorAll('.btn-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      aspectPicker.querySelectorAll('.btn-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.canvasWidth = parseInt(chip.dataset.w, 10);
      state.canvasHeight = parseInt(chip.dataset.h, 10);
      redraw();
    });
  });
}

/** Wires export buttons for 1080x1080, 1080x1350, 1920x1080 PNG. */
function initExportButtons() {
  const exportConfigs = [
    { id: 'export-landscape', w: 1920, h: 1080, name: 'neon-panel-1920x1080.png' },
    { id: 'export-square', w: 1080, h: 1080, name: 'neon-panel-1080x1080.png' },
    { id: 'export-portrait', w: 1080, h: 1350, name: 'neon-panel-1080x1350.png' },
  ];

  for (const cfg of exportConfigs) {
    const btn = document.getElementById(cfg.id);
    if (!btn) continue;
    btn.addEventListener('click', async () => {
      exportStatus.textContent = 'Rendering high-res cover...';
      try {
        await exportCoverPng(state, cfg.w, cfg.h, cfg.name);
        exportStatus.textContent = `Saved ${cfg.name}!`;
      } catch (err) {
        exportStatus.textContent = `Export error: ${err.message}`;
      }
    });
  }
}

/** One-click demo buttons. */
function initDemoPresets() {
  document.getElementById('demo-pier').addEventListener('click', async () => {
    const imgPier = await loadImage('samples/pier.jpg');
    state.layout = 'hero-strip';
    state.colorPreset = 'sunset';
    state.colorIntensity = 0.85;
    state.globalPhoto = imgPier;
    state.panelPhotos = [
      { image: imgPier, panX: 0, panY: 0, zoom: 1.05 },
      { image: imgPier, panX: 0.2, panY: -0.15, zoom: 1.35 },
      { image: imgPier, panX: -0.2, panY: 0.15, zoom: 1.25 },
      { image: imgPier, panX: 0.1, panY: 0.1, zoom: 1.4 },
    ];
    state.typography.mainTitle = 'VICE LIGHTS';
    state.typography.subtitle = 'OCEAN DRIVE CHRONICLES';
    state.typography.tagline = 'FALL 2026 • AN ORIGINAL TALE';
    state.typography.titleTheme = 'vice-sunset';

    titleInput.value = state.typography.mainTitle;
    subtitleInput.value = state.typography.subtitle;
    taglineInput.value = state.typography.tagline;
    initLayoutPicker();
    initPresetPicker();
    initThemePicker();
    renderPanelPills();
    setActivePanel(0);
    redraw();
  });

  document.getElementById('demo-boulevard').addEventListener('click', async () => {
    const [imgBlvd, imgPier] = await Promise.all([
      loadImage('samples/boulevard.jpg'),
      loadImage('samples/pier.jpg'),
    ]);
    state.layout = 'classic-6';
    state.colorPreset = 'neon';
    state.colorIntensity = 0.9;
    state.globalPhoto = imgBlvd;
    state.panelPhotos = [
      { image: imgBlvd, panX: -0.1, panY: 0, zoom: 1.1 },
      { image: imgPier, panX: 0.1, panY: -0.1, zoom: 1.2 },
      { image: imgBlvd, panX: 0, panY: 0.1, zoom: 1.0 },
      { image: imgPier, panX: -0.2, panY: 0.2, zoom: 1.3 },
      { image: imgBlvd, panX: 0.2, panY: -0.1, zoom: 1.25 },
      { image: imgPier, panX: 0, panY: 0, zoom: 1.05 },
    ];
    state.typography.mainTitle = 'SUNSET HEIST';
    state.typography.subtitle = 'VICE CITY UNDERGROUND';
    state.typography.tagline = 'FALL 2026 • DIRECTORS CUT';
    state.typography.titleTheme = 'miami-cyan';

    titleInput.value = state.typography.mainTitle;
    subtitleInput.value = state.typography.subtitle;
    taglineInput.value = state.typography.tagline;
    initLayoutPicker();
    initPresetPicker();
    initThemePicker();
    renderPanelPills();
    setActivePanel(0);
    redraw();
  });
}

/** Synchronizes UI controls to match current application state. */
export function syncUI() {
  if (titleInput) titleInput.value = state.typography.mainTitle || '';
  if (subtitleInput) subtitleInput.value = state.typography.subtitle || '';
  if (taglineInput) taglineInput.value = state.typography.tagline || '';
  if (fontSelect) fontSelect.value = state.typography.titleFont || 'Bebas Neue';

  initLayoutPicker();
  initPresetPicker();
  initThemePicker();
  renderPanelPills();

  if (state.activePanelIndex >= 0) {
    setActivePanel(state.activePanelIndex);
  }

  aspectPicker.querySelectorAll('.btn-chip').forEach((chip) => {
    const w = parseInt(chip.dataset.w, 10);
    const h = parseInt(chip.dataset.h, 10);
    const isActive = (w === state.canvasWidth && h === state.canvasHeight);
    chip.classList.toggle('active', isActive);
  });

  for (const [key, checkbox] of Object.entries(decCheckboxes)) {
    if (checkbox && state.decorations[key] !== undefined) {
      checkbox.checked = !!state.decorations[key];
    }
  }
}

/** Application initialization. */
async function initApp() {
  // Ensure OFL display fonts are completely loaded
  try {
    await Promise.all([
      document.fonts.load('60px "Bebas Neue"'),
      document.fonts.load('60px "Anton"'),
      document.fonts.load('60px "Archivo Black"'),
      document.fonts.ready,
    ]);
  } catch (err) {
    console.warn('Font loading notice:', err);
  }

  initLayoutPicker();
  initPresetPicker();
  initThemePicker();
  renderPanelPills();
  initPhotoLoading();
  initCropAndPan();
  initCaptionAndDecorations();
  initExportButtons();
  initDemoPresets();

  // Check URL params for automated screenshot harness
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    await runShotHarness(params, state, redraw, loadImage, syncUI);
  } else {
    // Initial startup: load default sample pier photo
    try {
      const defaultImg = await loadImage('samples/pier.jpg');
      state.globalPhoto = defaultImg;
      state.panelPhotos = [
        { image: defaultImg, panX: 0, panY: 0, zoom: 1.05 },
        { image: defaultImg, panX: 0.2, panY: -0.1, zoom: 1.25 },
        { image: defaultImg, panX: -0.15, panY: 0.15, zoom: 1.2 },
        { image: defaultImg, panX: 0.1, panY: 0.1, zoom: 1.3 },
      ];
      setActivePanel(0);
    } catch {
      redraw();
    }
  }
}

// Start application
initApp();
