/**
 * Automated screenshot harness for the project's screenshots.
 * Loads the bundled sample photos and renders the ?shot=cover and
 * ?shot=editor scenes requested via URL parameters.
 */
// Automated screenshot harness for Neon Panel v2.
// Responds to URL ?shot=cover or ?shot=editor.
// Loads sample photos and sets up the requested scene.

const SAMPLE_PHOTOS = [
  'convertible-sunset',
  'neon-portrait',
  'motel-sportscar',
  'speedboat-keys',
  'deco-avenue',
  'night-rider',
  'skyline-chopper',
  'pier',
  'boulevard',
];

/**
 * Runs the screenshot scenario requested via URLSearchParams.
 */
export async function runShotHarness(params, state, redrawCallback, loadImageCallback, syncUICallback) {
  const shotType = params.get('shot');
  if (!shotType) return false;

  const isCoverOnly = shotType === 'cover';
  if (isCoverOnly) {
    document.body.classList.add('shot-cover');
    state.hoveredPanelIndex = null;
    state.activePanelIndex = -1;
  } else if (shotType === 'editor') {
    document.body.classList.add('shot-editor');
  }

  // Parse layout
  if (params.get('layout')) state.layout = params.get('layout');

  // Parse color grade
  if (params.get('preset')) state.colorPreset = params.get('preset');
  if (params.get('intensity') != null) state.colorIntensity = parseFloat(params.get('intensity'));

  // Parse typography
  if (params.get('caption') != null) state.typography.mainTitle = params.get('caption');
  if (params.get('subtitle') != null) state.typography.subtitle = params.get('subtitle');
  if (params.get('tagline') != null) state.typography.tagline = params.get('tagline');
  if (params.get('quote') != null) state.typography.quoteLine = params.get('quote');
  if (params.get('badge') != null) state.typography.badgeText = params.get('badge');
  if (params.get('theme') != null) state.typography.titleTheme = params.get('theme');
  if (params.get('font') != null) state.typography.titleFont = params.get('font');
  if (params.get('position') != null) state.typography.textPosition = params.get('position');

  // Parse aspect ratio
  const aspect = params.get('aspect');
  if (aspect === '1:1' || aspect === 'square') {
    state.canvasWidth = 1080; state.canvasHeight = 1080;
  } else if (aspect === '4:5' || aspect === 'portrait') {
    state.canvasWidth = 1080; state.canvasHeight = 1350;
  } else if (aspect === '16:9' || aspect === 'landscape') {
    state.canvasWidth = 1920; state.canvasHeight = 1080;
  }

  // Parse explicit dimensions
  const reqW = parseInt(params.get('w'), 10);
  const reqH = parseInt(params.get('h'), 10);
  if (!isNaN(reqW) && !isNaN(reqH) && reqW > 100 && reqH > 100) {
    state.canvasWidth = reqW;
    state.canvasHeight = reqH;
  } else if (isCoverOnly && !aspect) {
    state.canvasWidth = 1920; state.canvasHeight = 1080;
  }

  // Load sample photos
  const photoParam = params.get('photo') || 'cast';
  const loaded = {};

  if (photoParam === 'cast' || photoParam === 'all') {
    // Load all samples
    const promises = SAMPLE_PHOTOS.map(async name => {
      try {
        loaded[name] = await loadImageCallback(`samples/${name}.jpg`);
      } catch { /* skip missing */ }
    });
    await Promise.all(promises);
  } else {
    // Load specific photos (comma-separated)
    const names = photoParam.split(',');
    const promises = names.map(async name => {
      try {
        loaded[name.trim()] = await loadImageCallback(`samples/${name.trim()}.jpg`);
      } catch { /* skip */ }
    });
    await Promise.all(promises);
  }

  // Assign photos to panels based on layout
  const castOrder = [
    'convertible-sunset', 'neon-portrait', 'motel-sportscar',
    'speedboat-keys', 'deco-avenue', 'night-rider', 'skyline-chopper',
    'pier', 'boulevard',
  ];
  const availableImages = castOrder.filter(n => loaded[n]).map(n => loaded[n]);

  if (availableImages.length > 0) {
    state.globalPhoto = availableImages[0];

    // Parse panel assignments from URL, or auto-assign
    const panelAssign = params.get('panels'); // e.g. "0,1,2,3,4,5"
    const panelCount = getPanelCount(state.layout);

    if (panelAssign) {
      const indices = panelAssign.split(',').map(s => parseInt(s.trim(), 10));
      state.panelPhotos = indices.map((imgIdx, panelIdx) => ({
        image: availableImages[imgIdx % availableImages.length],
        panX: 0, panY: 0, zoom: 1.05 + (panelIdx % 3) * 0.1,
      }));
    } else {
      // Auto-assign: each panel gets a different photo
      state.panelPhotos = [];
      for (let i = 0; i < panelCount; i++) {
        const img = availableImages[i % availableImages.length];
        state.panelPhotos.push({
          image: img,
          panX: ((i * 0.15) % 0.4) - 0.1,
          panY: ((i * 0.12) % 0.3) - 0.1,
          zoom: 1.05 + (i % 3) * 0.08,
        });
      }
    }
  }

  // Parse panel labels
  const labelsParam = params.get('labels');
  if (labelsParam) {
    try {
      state.typography.panelLabels = JSON.parse(decodeURIComponent(labelsParam));
    } catch { /* skip */ }
  }

  // Ensure fonts loaded
  try {
    await Promise.all([
      document.fonts.load('60px "Bebas Neue"'),
      document.fonts.load('60px "Anton"'),
      document.fonts.load('60px "Archivo Black"'),
      document.fonts.load('40px "Pacifico"'),
      document.fonts.load('40px "Kaushan Script"'),
      document.fonts.load('30px "Oswald"'),
      document.fonts.ready,
    ]);
  } catch (err) {
    console.warn('Font loading notice in shots harness:', err);
  }

  // Sync UI if in editor mode
  if (shotType === 'editor' && typeof syncUICallback === 'function') {
    syncUICallback();
  }

  redrawCallback();

  // Signal ready after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });

  return true;
}

function getPanelCount(layoutId) {
  const counts = {
    'key-art': 6, 'hero-four': 5, 'mosaic-six': 6,
    'split-diagonal': 4, 'full-bleed': 1,
  };
  return counts[layoutId] || 6;
}
