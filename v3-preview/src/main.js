import { LAYOUTS, computePanelPixelRects, pointInPanel } from './layouts.js';
import { COLOR_GRADES, ensurePosterFonts, faceZoomLimit, photoCrop, renderCoverArt } from './renderer.js';
import { exportCoverPng } from './export.js';

const CAST = [
  { name: 'cast-driver', label: 'The Wheelwoman', role: 'THE WHEELWOMAN', focusX: 0.43, focusY: 0.39, faceHeight: 0.30 },
  { name: 'cast-boss', label: 'The Kingpin', role: 'THE KINGPIN', focusX: 0.52, focusY: 0.38, faceHeight: 0.40 },
  { name: 'cast-mechanic', label: 'The Wrench', role: 'THE WRENCH', focusX: 0.52, focusY: 0.32, faceHeight: 0.30 },
  { name: 'cast-captain', label: 'The Skipper', role: 'THE SKIPPER', focusX: 0.53, focusY: 0.40, faceHeight: 0.34 },
  { name: 'cast-rider', label: 'The Night Rider', role: 'THE NIGHT RIDER', focusX: 0.47, focusY: 0.37, faceHeight: 0.30 },
  { name: 'cast-fixer', label: 'The Broker', role: 'THE BROKER', focusX: 0.45, focusY: 0.35, faceHeight: 0.32 },
  { name: 'cast-hustler', label: 'The Charmer', role: 'THE CHARMER', focusX: 0.42, focusY: 0.33, faceHeight: 0.28 },
  { name: 'cast-lookout', label: 'The Spotter', role: 'THE SPOTTER', focusX: 0.42, focusY: 0.43, faceHeight: 0.30 },
];

const SCENES = [
  { name: 'convertible-sunset', label: 'Sunset Drive' },
  { name: 'neon-portrait', label: 'Neon Portrait' },
  { name: 'motel-sportscar', label: 'Motel Run' },
  { name: 'speedboat-keys', label: 'Open Water' },
  { name: 'deco-avenue', label: 'Deco Avenue' },
  { name: 'night-rider', label: 'Night Ride' },
  { name: 'skyline-chopper', label: 'Skyline' },
  { name: 'pier', label: 'The Pier' },
  { name: 'boulevard', label: 'Boulevard' },
];
const SAMPLES = [...CAST, ...SCENES].map(photo => ({ ...photo, src: `samples/${photo.name}.jpg` }));
const DEFAULT_ROLES = CAST.map(({ role }) => role).concat(['COASTLINE', '']);
const BACKDROP_BY_GRADE = {
  'golden-hour': 'convertible-sunset',
  'magenta-dusk': 'convertible-sunset',
  'noon-heat': 'convertible-sunset',
  'pastel-deco': 'pier',
  'neon-night': 'pier',
  'teal-tide': 'speedboat-keys',
  'ink-noir': 'skyline-chopper',
};
const canvas = document.getElementById('cover-canvas');
const canvasWrapper = document.getElementById('canvas-wrapper');
const studioGrid = document.getElementById('studio-grid');
const previewTitle = document.getElementById('preview-title');
const exportStatus = document.getElementById('export-status');
const photoInput = document.getElementById('photo-input');
const sampleGrid = document.getElementById('sample-grid');
const layoutPicker = document.getElementById('layout-picker');
const panelPills = document.getElementById('panel-pills-container');
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button');

export const state = {
  layout: 'cast-mosaic',
  width: 1920,
  height: 1080,
  activeIndex: 0,
  heroPanelIndex: 0,
  focusMode: false,
  panelPhotos: [],
  backdrop: null,
  colorGrade: 'golden-hour',
  gradeIntensity: 0.78,
  tags: DEFAULT_ROLES.map((text, index) => ({ text, enabled: index < 9 })),
  type: {
    title: 'TIDE RUNNERS',
    subtitle: 'Neon Coast Nights',
    quote: 'A wild ride from first light to last call',
    source: 'COASTLINE WEEKLY',
    billing: 'A NEON PANEL PICTURE · STARRING MIRA SOL, JUNE MERCER, LEO VALE · MUSIC BY ORLA REED · WRITTEN BY KIT MARLOW · DIRECTED BY ARDEN BLUE',
    release: 'COMING SOON',
    seal: 'COAST EDITION',
  },
};

const imageCache = new Map();
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 70;
let pointerAction = null;
let lastSampleName = '';
let lastGeometry = null;

window.__npDebug = () => lastGeometry ? JSON.parse(JSON.stringify(lastGeometry)) : null;

function snapshot(value) {
  return {
    ...value,
    panelPhotos: value.panelPhotos.map(photo => photo ? { ...photo } : null),
    tags: value.tags.map(tag => ({ ...tag })),
    type: { ...value.type },
  };
}

function saveHistory() {
  undoStack.push(snapshot(state));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  updateHistoryButtons();
}

function restoreSnapshot(source) {
  Object.assign(state, snapshot(source));
  syncControls();
  render();
}

function updateHistoryButtons() {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot(state));
  restoreSnapshot(undoStack.pop());
  updateHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot(state));
  restoreSnapshot(redoStack.pop());
  updateHistoryButtons();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be opened.'));
    image.src = url;
  });
}

function getImage(name) {
  if (!imageCache.has(name)) {
    imageCache.set(name, loadImage(`samples/${name}.jpg`));
  }
  return imageCache.get(name);
}

function estimateFaceFocus(image) {
  const analysis = document.createElement('canvas');
  analysis.width = 64;
  analysis.height = 64;
  const context = analysis.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, 64, 64);
  const data = context.getImageData(0, 0, 64, 40).data;
  let total = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 2; y < 38; y++) {
    for (let x = 2; x < 62; x++) {
      const offset = (y * 64 + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const skinPixel = red > 62 && green > 28 && blue > 12
        && red > green * 1.06 && red > blue * 1.12
        && red - green > 8 && red - green < 105;
      if (skinPixel) {
        const weight = 1 + (red - blue) / 180;
        total += weight;
        sumX += x * weight;
        sumY += y * weight;
      }
    }
  }
  if (total < 14) return { focusX: 0.5, focusY: 0.36, faceHeight: 0.3 };
  return {
    focusX: Math.max(0.16, Math.min(0.84, sumX / total / 64)),
    focusY: Math.max(0.15, Math.min(0.5, sumY / total / 64)),
    faceHeight: 0.3,
  };
}

function photoRecord(image, focus = {}, name = '') {
  return {
    image,
    name,
    focusX: focus.focusX ?? 0.5,
    focusY: focus.focusY ?? 0.36,
    faceHeight: focus.faceHeight ?? 0.3,
    panX: 0,
    panY: 0,
    zoom: 1,
  };
}

function loadPhotoGrid() {
  sampleGrid.replaceChildren();
  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sample-thumb';
    button.dataset.sample = sample.name;
    button.title = `${sample.label} · assign to panel ${state.activeIndex + 1}`;
    button.setAttribute('aria-label', `Use ${sample.label} in selected panel`);
    const image = document.createElement('img');
    image.src = sample.src;
    image.alt = '';
    image.loading = 'eager';
    const label = document.createElement('span');
    label.className = 'sample-label';
    label.textContent = sample.label;
    button.append(image, label);
    button.addEventListener('click', () => assignSample(sample.name, state.activeIndex));
    button.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', sample.name);
      event.dataTransfer.effectAllowed = 'copy';
    });
    button.draggable = true;
    sampleGrid.append(button);
  }
}

async function assignSample(name, panelIndex) {
  try {
    const image = await getImage(name);
    const sample = SAMPLES.find(item => item.name === name);
    saveHistory();
    state.panelPhotos[panelIndex] = photoRecord(image, sample, name);
    state.activeIndex = panelIndex;
    lastSampleName = name;
    syncControls();
    render();
  } catch (error) {
    showStatus(error.message);
  }
}

async function loadSampleCast() {
  showStatus('Loading the cast…');
  try {
    const images = await Promise.all(CAST.map(photo => getImage(photo.name)));
    const scene = await getImage('deco-avenue');
    const backdrop = await getImage('convertible-sunset');
    saveHistory();
    state.layout = 'cast-mosaic';
    state.heroPanelIndex = 0;
    state.panelPhotos = CAST.map((photo, index) => photoRecord(images[index], photo, photo.name));
    state.panelPhotos.push(photoRecord(scene, {}, 'deco-avenue'));
    state.backdrop = photoRecord(backdrop, {}, 'convertible-sunset');
    state.tags = DEFAULT_ROLES.map((text, index) => ({ text, enabled: index < 9 }));
    state.colorGrade = 'golden-hour';
    state.gradeIntensity = 0.78;
    state.activeIndex = 0;
    state.type = {
      title: 'TIDE RUNNERS',
      subtitle: 'Neon Coast Nights',
      quote: 'A wild ride from first light to last call',
      source: 'COASTLINE WEEKLY',
      billing: 'A NEON PANEL PICTURE · STARRING MIRA SOL, JUNE MERCER, LEO VALE · MUSIC BY ORLA REED · WRITTEN BY KIT MARLOW · DIRECTED BY ARDEN BLUE',
      release: 'COMING SOON',
      seal: 'COAST EDITION',
    };
    syncControls();
    render();
    showStatus('Eight cast portraits and a coastal scene are ready.');
  } catch (error) {
    showStatus(`Sample cast could not load: ${error.message}`);
  }
}

async function addUserPhoto(file, panelIndex) {
  if (!file || !file.type.startsWith('image/')) {
    showStatus('Choose an image file to add a photo.');
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const focus = estimateFaceFocus(image);
    saveHistory();
    state.panelPhotos[panelIndex] = photoRecord(image, focus, file.name);
    state.activeIndex = panelIndex;
    syncControls();
    render();
    showStatus('Photo added. Drag on the frame or set face focus to refine it.');
  } catch (error) {
    showStatus(error.message);
  } finally {
    URL.revokeObjectURL(url);
    photoInput.value = '';
  }
}

function activePhoto() {
  return state.panelPhotos[state.activeIndex] || state.panelPhotos[0] || null;
}

function setActivePanel(index) {
  state.activeIndex = index;
  syncPanelControls();
  render();
}

function syncPanelControls() {
  const layout = LAYOUTS.find(item => item.id === state.layout) || LAYOUTS[0];
  panelPills.replaceChildren();
  for (let index = 0; index < layout.count; index++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn panel-pill${index === state.activeIndex ? ' active' : ''}`;
    button.textContent = `P${index + 1}`;
    button.setAttribute('aria-label', `Select panel ${index + 1}`);
    button.addEventListener('click', () => setActivePanel(index));
    panelPills.append(button);
  }
  document.getElementById('active-panel-title').textContent = `Panel ${state.activeIndex + 1}${state.activeIndex === state.heroPanelIndex ? ' · Hero' : ''}`;
  document.getElementById('active-panel-indicator').textContent = `P${state.activeIndex + 1}`;
  const role = state.tags[state.activeIndex] || { text: '', enabled: false };
  document.getElementById('role-input').value = role.text;
  document.getElementById('tag-toggle').checked = role.enabled;
  const photo = activePhoto();
  const zoomSlider = document.getElementById('zoom-slider');
  const panel = photo && computePanelPixelRects(state.layout, state.width, state.height, 9, state.heroPanelIndex)
    .find(item => item.id === state.activeIndex);
  const zoomLimit = photo && panel ? faceZoomLimit(photo, panel) : 2.4;
  if (photo) photo.zoom = Math.min(photo.zoom || 1, zoomLimit);
  zoomSlider.max = zoomLimit.toFixed(2);
  zoomSlider.value = photo?.zoom ?? 1;
  document.getElementById('zoom-val').value = `${(photo?.zoom ?? 1).toFixed(1)}×`;
  document.getElementById('btn-make-hero').classList.toggle('active', state.activeIndex === state.heroPanelIndex);
  document.querySelectorAll('.sample-thumb').forEach(button => button.classList.toggle('selected', button.dataset.sample === photo?.name));
}

function syncControls() {
  const layout = LAYOUTS.find(item => item.id === state.layout) || LAYOUTS[0];
  layoutPicker.querySelectorAll('.layout-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.layout === layout.id);
    button.setAttribute('aria-checked', String(button.dataset.layout === layout.id));
  });
  document.querySelectorAll('.format-button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.w) === state.width && Number(button.dataset.h) === state.height);
  });
  document.querySelectorAll('.preset-btn').forEach(button => button.classList.toggle('active', button.dataset.grade === state.colorGrade));
  document.getElementById('grade-intensity').value = state.gradeIntensity;
  document.getElementById('grade-val').textContent = `${Math.round(state.gradeIntensity * 100)}%`;
  document.getElementById('grade-output').value = `${Math.round(state.gradeIntensity * 100)}%`;
  for (const [id, key] of Object.entries({
    'title-input': 'title',
    'subtitle-input': 'subtitle',
    'quote-input': 'quote',
    'source-input': 'source',
    'billing-input': 'billing',
    'release-input': 'release',
    'badge-input': 'seal',
  })) document.getElementById(id).value = state.type[key];
  previewTitle.textContent = state.type.title || 'UNTITLED POSTER';
  syncPanelControls();
}

function initPickers() {
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn layout-btn';
    button.dataset.layout = layout.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(layout.id === state.layout));
    button.innerHTML = `<span class="layout-icon">${layout.icon}</span><span class="layout-label">${layout.name}</span>`;
    button.addEventListener('click', () => {
      saveHistory();
      state.layout = layout.id;
      state.activeIndex = Math.min(state.activeIndex, layout.count - 1);
      if (layout.id === 'one-story') {
        const selected = activePhoto();
        if (selected) {
          for (let index = 0; index < layout.count; index++) state.panelPhotos[index] = { ...selected };
        }
      }
      syncControls();
      render();
    });
    layoutPicker.append(button);
  }
  const presetPicker = document.getElementById('preset-picker');
  for (const grade of COLOR_GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-btn';
    button.dataset.grade = grade.id;
    button.innerHTML = `<span class="preset-swatch" style="background:${grade.swatch}"></span><span>${grade.name}</span>`;
    button.addEventListener('click', () => {
      saveHistory();
      state.colorGrade = grade.id;
      syncControls();
      render();
    });
    presetPicker.append(button);
  }
}

function initPhotoControls() {
  const dropzone = document.getElementById('dropzone');
  document.getElementById('btn-load-cast').addEventListener('click', loadSampleCast);
  dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file) addUserPhoto(file, state.activeIndex);
  });
  photoInput.addEventListener('change', event => addUserPhoto(event.target.files[0], state.activeIndex));
  document.getElementById('btn-fill-all').addEventListener('click', () => {
    const current = activePhoto();
    if (!current) return showStatus('Choose a photo first.');
    saveHistory();
    const count = LAYOUTS.find(item => item.id === state.layout).count;
    for (let index = 0; index < count; index++) state.panelPhotos[index] = { ...current };
    render();
    showStatus('The selected photo now fills every panel.');
  });
  document.getElementById('btn-reset-crop').addEventListener('click', () => {
    const photo = activePhoto();
    if (!photo) return;
    saveHistory();
    Object.assign(photo, { panX: 0, panY: 0, zoom: 1 });
    syncPanelControls();
    render();
  });
  document.getElementById('btn-make-hero').addEventListener('click', () => {
    if (state.heroPanelIndex === state.activeIndex) return;
    saveHistory();
    state.heroPanelIndex = state.activeIndex;
    syncControls();
    render();
  });
  document.getElementById('btn-focus-mode').addEventListener('click', event => {
    state.focusMode = !state.focusMode;
    event.currentTarget.classList.toggle('active', state.focusMode);
    event.currentTarget.textContent = state.focusMode ? 'Tap face on art' : 'Set face focus';
    showStatus(state.focusMode ? 'Tap the face center in the poster to focus this crop.' : 'Face focus mode is off.');
  });
  document.getElementById('zoom-slider').addEventListener('pointerdown', saveHistory);
  document.getElementById('zoom-slider').addEventListener('input', event => {
    const photo = activePhoto();
    if (!photo) return;
    photo.zoom = Number(event.target.value);
    document.getElementById('zoom-val').value = `${photo.zoom.toFixed(1)}×`;
    render();
  });
  document.getElementById('role-input').addEventListener('input', event => {
    saveHistory();
    if (!state.tags[state.activeIndex]) state.tags[state.activeIndex] = { text: '', enabled: true };
    state.tags[state.activeIndex].text = event.target.value;
    render();
  });
  document.getElementById('tag-toggle').addEventListener('change', event => {
    saveHistory();
    if (!state.tags[state.activeIndex]) state.tags[state.activeIndex] = { text: '', enabled: true };
    state.tags[state.activeIndex].enabled = event.target.checked;
    render();
  });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

function panelAt(point) {
  const panels = computePanelPixelRects(state.layout, canvas.width, canvas.height, 9, state.heroPanelIndex);
  const match = panels.find(panel => pointInPanel(point.x, point.y, panel.points));
  return match?.id ?? -1;
}

function initCanvasGestures() {
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const point = canvasPoint(event);
    const panelIndex = panelAt(point);
    if (panelIndex < 0) return;
    setActivePanel(panelIndex);
    const photo = activePhoto();
    if (state.focusMode && photo) {
      saveHistory();
      const panel = computePanelPixelRects(state.layout, canvas.width, canvas.height, 9, state.heroPanelIndex)
        .find(item => item.id === panelIndex);
      const crop = panel && photoCrop(photo, panel);
      if (panel && crop) {
        photo.focusX = Math.max(0, Math.min(1, (crop.sx + (point.x - panel.x) / panel.width * crop.cropW) / photo.image.naturalWidth));
        photo.focusY = Math.max(0, Math.min(1, (crop.sy + (point.y - panel.y) / panel.height * crop.cropH) / photo.image.naturalHeight));
      }
      state.focusMode = false;
      const button = document.getElementById('btn-focus-mode');
      button.classList.remove('active');
      button.textContent = 'Set face focus';
      showStatus('Face focus updated. Drag to reframe or zoom with the slider.');
      render();
      return;
    }
    saveHistory();
    canvas.setPointerCapture(event.pointerId);
    pointerAction = { pointerId: event.pointerId, panelIndex, x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointerAction || pointerAction.pointerId !== event.pointerId) return;
    const photo = state.panelPhotos[pointerAction.panelIndex];
    if (!photo) return;
    const rect = canvas.getBoundingClientRect();
    photo.panX = Math.max(-1, Math.min(1, photo.panX - (event.clientX - pointerAction.x) * 2 / rect.width));
    photo.panY = Math.max(-1, Math.min(1, photo.panY - (event.clientY - pointerAction.y) * 2 / rect.height));
    pointerAction.x = event.clientX;
    pointerAction.y = event.clientY;
    render();
  });
  const finish = event => {
    if (pointerAction?.pointerId === event.pointerId) pointerAction = null;
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const photo = activePhoto();
    if (!photo) return;
    saveHistory();
    photo.zoom = Math.max(1, Math.min(2.4, photo.zoom + (event.deltaY < 0 ? 0.08 : -0.08)));
    syncPanelControls();
    render();
  }, { passive: false });
  canvas.addEventListener('dragover', event => event.preventDefault());
  canvas.addEventListener('drop', event => {
    event.preventDefault();
    const point = canvasPoint(event);
    const index = panelAt(point);
    const sampleName = event.dataTransfer.getData('text/plain');
    const sample = SAMPLES.find(item => item.name === sampleName);
    if (sample) assignSample(sample.name, index >= 0 ? index : state.activeIndex);
    else if (event.dataTransfer.files[0]) addUserPhoto(event.dataTransfer.files[0], index >= 0 ? index : state.activeIndex);
  });
}

function initWordsAndLooks() {
  const fields = {
    'title-input': 'title',
    'subtitle-input': 'subtitle',
    'quote-input': 'quote',
    'source-input': 'source',
    'billing-input': 'billing',
    'release-input': 'release',
    'badge-input': 'seal',
  };
  for (const [id, property] of Object.entries(fields)) {
    document.getElementById(id).addEventListener('input', event => {
      saveHistory();
      state.type[property] = event.target.value;
      if (property === 'title') previewTitle.textContent = event.target.value || 'UNTITLED POSTER';
      render();
    });
  }
  document.getElementById('grade-intensity').addEventListener('pointerdown', saveHistory);
  document.getElementById('grade-intensity').addEventListener('input', event => {
    state.gradeIntensity = Number(event.target.value);
    const label = `${Math.round(state.gradeIntensity * 100)}%`;
    document.getElementById('grade-val').textContent = label;
    document.getElementById('grade-output').value = label;
    render();
  });
  document.querySelectorAll('.format-button').forEach(button => button.addEventListener('click', () => {
    saveHistory();
    state.width = Number(button.dataset.w);
    state.height = Number(button.dataset.h);
    document.querySelectorAll('.format-button').forEach(item => item.classList.toggle('active', item === button));
    render();
  }));
}

function showStatus(message) {
  exportStatus.textContent = message;
}

async function exportSize(width, height) {
  const filename = `neon-panel-${width}x${height}.png`;
  await exportCoverPng(snapshot(state), width, height, filename);
}

function initExports() {
  document.getElementById('export-all').addEventListener('click', async () => {
    const sizes = [[1080, 1080], [1080, 1350], [1920, 1080]];
    try {
      for (let index = 0; index < sizes.length; index++) {
        showStatus(`Rendering export ${index + 1} of 3…`);
        await exportSize(...sizes[index]);
        if (index < sizes.length - 1) await new Promise(resolve => setTimeout(resolve, 260));
      }
      showStatus('All three PNG posters are ready.');
    } catch (error) {
      showStatus(`Export stopped: ${error.message}`);
    }
  });
  for (const button of document.querySelectorAll('.btn-single')) {
    button.addEventListener('click', async () => {
      try {
        await exportSize(Number(button.dataset.w), Number(button.dataset.h));
        showStatus(`Saved ${button.dataset.w} × ${button.dataset.h} PNG.`);
      } catch (error) {
        showStatus(`Export failed: ${error.message}`);
      }
    });
  }
}

function initMobileTabs() {
  document.querySelectorAll('.mobile-tabs button').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      studioGrid.dataset.activePane = tab;
      document.querySelectorAll('.mobile-tabs button').forEach(item => item.classList.toggle('active', item === button));
      requestAnimationFrame(fitPreview);
    });
  });
}

function applyShotParameters(params) {
  const layoutAliases = { 'key-art': 'cast-mosaic', 'mosaic-six': 'six-grid', 'split-diagonal': 'slash', 'full-bleed': 'one-story' };
  const layout = layoutAliases[params.get('layout')] || params.get('layout');
  if (LAYOUTS.some(item => item.id === layout)) state.layout = layout;
  const aspect = params.get('aspect');
  if (aspect === '4:5' || aspect === 'portrait') [state.width, state.height] = [1080, 1350];
  else if (aspect === '1:1' || aspect === 'square') [state.width, state.height] = [1080, 1080];
  else [state.width, state.height] = [1920, 1080];
  const grade = params.get('preset');
  if (COLOR_GRADES.some(item => item.id === grade)) state.colorGrade = grade;
  if (params.has('intensity')) state.gradeIntensity = Number(params.get('intensity'));
  const textParameters = {
    caption: 'title', title: 'title', subtitle: 'subtitle', quote: 'quote',
    source: 'source', billing: 'billing', release: 'release', badge: 'seal',
  };
  for (const [query, property] of Object.entries(textParameters)) {
    if (params.has(query)) state.type[property] = params.get(query);
  }
}

async function loadShotPhotos(params) {
  const photoParam = params.get('photo') || 'cast';
  const requested = photoParam === 'cast' || photoParam === 'all'
    ? [...CAST.map(item => item.name), 'deco-avenue']
    : photoParam.split(',').map(name => name.trim());
  const backdropName = BACKDROP_BY_GRADE[state.colorGrade] || 'convertible-sunset';
  if (!requested.includes(backdropName)) requested.push(backdropName);
  const loaded = await Promise.all(requested.map(async name => {
    const sample = SAMPLES.find(item => item.name === name);
    if (!sample) return null;
    return { sample, image: await getImage(sample.name) };
  }));
  const images = loaded.filter(Boolean);
  if (!images.length) return;
  const panelCount = LAYOUTS.find(item => item.id === state.layout).count;
  const assignments = params.get('panels')?.split(',').map(Number);
  state.panelPhotos = Array.from({ length: panelCount }, (_, index) => {
    const selected = images[(assignments?.[index] ?? (index >= 8 ? 8 : index)) % images.length];
    return photoRecord(selected.image, selected.sample, selected.sample.name);
  });
  const scene = images.find(item => item.sample.name === backdropName) || images[0];
  state.backdrop = photoRecord(scene.image, scene.sample, scene.sample.name);
}

async function runShotHarness(params) {
  await ensurePosterFonts();
  applyShotParameters(params);
  await loadShotPhotos(params);
  if (params.get('shot') === 'cover') {
    document.body.classList.add('shot-cover');
    state.activeIndex = -1;
  }
  syncControls();
  render();
  await document.fonts.ready;
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

function fitPreview() {
  const availableWidth = canvasWrapper.clientWidth;
  const availableHeight = canvasWrapper.clientHeight;
  if (!availableWidth || !availableHeight) return;
  const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
  canvas.style.width = `${Math.max(1, Math.floor(canvas.width * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(canvas.height * scale))}px`;
}

function render() {
  if (canvas.width !== state.width) canvas.width = state.width;
  if (canvas.height !== state.height) canvas.height = state.height;
  const hidden = document.body.classList.contains('shot-cover');
  lastGeometry = renderCoverArt(canvas, state, {
    highlightPanelIndex: hidden || state.activeIndex < 0 ? null : state.activeIndex,
  });
  fitPreview();
}

function initHistory() {
  undoButton.addEventListener('click', undo);
  redoButton.addEventListener('click', redo);
  window.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
    }
  });
}

async function init() {
  document.fonts.addEventListener('loadingdone', () => render(), { once: true });
  await ensurePosterFonts();
  initPickers();
  loadPhotoGrid();
  initHistory();
  initPhotoControls();
  initCanvasGestures();
  initWordsAndLooks();
  initExports();
  initMobileTabs();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fitPreview).observe(canvasWrapper);
  window.addEventListener('resize', fitPreview);
  const params = new URLSearchParams(location.search);
  if (params.has('shot')) {
    await runShotHarness(params);
  } else {
    await loadSampleCast();
  }
  document.fonts.ready.then(() => render());
  window.__npReady = true;
}

init().catch(error => {
  showStatus(`Studio failed to start: ${error.message}`);
  console.error(error);
});
