// Automated screenshot harness for Neon Panel.
// Responds to URL query ?shot=cover or ?shot=editor and flags window.__shotReady when rendered.

/**
 * Executes the screenshot scenario requested via URLSearchParams.
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
  const layout = params.get('layout');
  if (layout) {
    state.layout = layout;
  }

  // Parse color grade
  const preset = params.get('preset');
  if (preset) {
    state.colorPreset = preset;
  }

  const intensity = params.get('intensity');
  if (intensity != null) {
    state.colorIntensity = parseFloat(intensity);
  }

  // Parse typography
  const caption = params.get('caption');
  if (caption != null) {
    state.typography.mainTitle = caption;
  }
  const subtitle = params.get('subtitle');
  if (subtitle != null) {
    state.typography.subtitle = subtitle;
  }
  const tagline = params.get('tagline');
  if (tagline != null) {
    state.typography.tagline = tagline;
  }
  const theme = params.get('theme');
  if (theme != null) {
    state.typography.titleTheme = theme;
  }

  const font = params.get('font');
  if (font) {
    state.typography.titleFont = font;
  }

  // Parse aspect ratio
  const aspect = params.get('aspect');
  if (aspect === '1:1' || aspect === 'square') {
    state.canvasWidth = 1080;
    state.canvasHeight = 1080;
  } else if (aspect === '4:5' || aspect === 'portrait') {
    state.canvasWidth = 1080;
    state.canvasHeight = 1350;
  } else if (aspect === '16:9' || aspect === 'landscape') {
    state.canvasWidth = 1920;
    state.canvasHeight = 1080;
  }

  // Parse dimensions
  const reqW = parseInt(params.get('w'), 10);
  const reqH = parseInt(params.get('h'), 10);
  if (!isNaN(reqW) && !isNaN(reqH) && reqW > 100 && reqH > 100) {
    state.canvasWidth = reqW;
    state.canvasHeight = reqH;
  } else if (isCoverOnly && !aspect) {
    // If not specified for cover shot, default to 1080x1080 square poster
    state.canvasWidth = 1080;
    state.canvasHeight = 1080;
  }

  // Load photos
  const photoParam = params.get('photo') || 'both';
  const [imgPier, imgBlvd] = await Promise.all([
    loadImageCallback('samples/pier.jpg'),
    loadImageCallback('samples/boulevard.jpg'),
  ]);

  if (photoParam === 'both') {
    state.globalPhoto = imgBlvd;
    if (state.layout === 'classic-6') {
      state.panelPhotos = [
        // Panel 0 (Top-left): Woman sunglasses portrait
        { image: imgBlvd, panX: -0.15, panY: 0.75, zoom: 1.55 },
        // Panel 1 (Top-right): Fisherman smile portrait
        { image: imgPier, panX: 0.15, panY: 0.70, zoom: 1.50 },
        // Panel 2 (Mid-left): Red convertible car
        { image: imgBlvd, panX: 0.35, panY: -0.25, zoom: 1.25 },
        // Panel 3 (Mid-right): Fishing rod & turquoise ocean
        { image: imgPier, panX: -0.35, panY: -0.35, zoom: 1.40 },
        // Panel 4 (Bottom-left): Beach sunset & lifeguard tower
        { image: imgBlvd, panX: 0.70, panY: 0.45, zoom: 1.65 },
        // Panel 5 (Bottom-right): Boardwalk & smiling fisherman
        { image: imgPier, panX: -0.05, panY: 0.20, zoom: 1.15 },
      ];
    } else if (state.layout === 'grid-4') {
      state.panelPhotos = [
        // Panel 0: Woman face
        { image: imgBlvd, panX: -0.15, panY: 0.75, zoom: 1.55 },
        // Panel 1: Fisherman face
        { image: imgPier, panX: 0.15, panY: 0.70, zoom: 1.50 },
        // Panel 2: Red convertible
        { image: imgBlvd, panX: 0.30, panY: -0.30, zoom: 1.25 },
        // Panel 3: Ocean fishing rod
        { image: imgPier, panX: -0.30, panY: -0.30, zoom: 1.35 },
      ];
    } else {
      // hero-strip
      state.panelPhotos = [
        // Hero left: full boulevard scene with convertible & woman
        { image: imgBlvd, panX: 0.05, panY: 0.25, zoom: 1.05 },
        // Top right: fisherman smile
        { image: imgPier, panX: 0.15, panY: 0.75, zoom: 1.55 },
        // Mid right: red convertible chrome
        { image: imgBlvd, panX: 0.35, panY: -0.45, zoom: 1.40 },
        // Bottom right: fishing rod in ocean
        { image: imgPier, panX: -0.30, panY: -0.35, zoom: 1.40 },
      ];
    }
  } else if (photoParam === 'boulevard') {
    state.globalPhoto = imgBlvd;
    state.panelPhotos = [
      { image: imgBlvd, panX: -0.15, panY: 0.75, zoom: 1.55 },
      { image: imgBlvd, panX: 0.35, panY: -0.25, zoom: 1.25 },
      { image: imgBlvd, panX: 0.70, panY: 0.45, zoom: 1.65 },
      { image: imgBlvd, panX: 0.0, panY: 0.2, zoom: 1.10 },
      { image: imgBlvd, panX: -0.2, panY: -0.3, zoom: 1.30 },
      { image: imgBlvd, panX: 0.2, panY: 0.0, zoom: 1.15 },
    ];
  } else {
    // 'pier'
    state.globalPhoto = imgPier;
    state.panelPhotos = [
      { image: imgPier, panX: 0.15, panY: 0.70, zoom: 1.50 },
      { image: imgPier, panX: -0.30, panY: -0.35, zoom: 1.40 },
      { image: imgPier, panX: 0.0, panY: 0.20, zoom: 1.15 },
      { image: imgPier, panX: -0.15, panY: 0.0, zoom: 1.10 },
      { image: imgPier, panX: 0.25, panY: 0.35, zoom: 1.35 },
      { image: imgPier, panX: -0.10, panY: -0.20, zoom: 1.25 },
    ];
  }

  // Ensure all fonts are completely loaded before rendering
  try {
    await Promise.all([
      document.fonts.load('60px "Bebas Neue"'),
      document.fonts.load('60px "Anton"'),
      document.fonts.load('60px "Archivo Black"'),
      document.fonts.ready,
    ]);
  } catch (err) {
    console.warn('Font loading notice in shots harness:', err);
  }

  // Sync UI controls if in editor mode
  if (shotType === 'editor' && typeof syncUICallback === 'function') {
    syncUICallback();
  }

  // Trigger redraw
  redrawCallback();

  // Double requestAnimationFrame ensures browser paints canvas before signaling ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });

  return true;
}
