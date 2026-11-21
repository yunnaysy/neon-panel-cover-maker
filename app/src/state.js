// The editable studio document. Everything here is plain JSON (photos are referenced by id through the runtime
// library), so snapshots are cheap and undo keeps the images by reference.

import { templateLayers } from './typography.js';
import { panelCount } from './layouts.js';

export const ASPECTS = {
  '16:9': { w: 1920, h: 1080, label: '16:9 • 1920 × 1080', name: '16:9 landscape' },
  '4:5': { w: 1080, h: 1350, label: '4:5 • 1080 × 1350', name: '4:5 portrait' },
  '1:1': { w: 1080, h: 1080, label: '1:1 • 1080 × 1080', name: '1:1 square' },
};

export const ASPECT_KEYS = Object.keys(ASPECTS);

export const SAMPLE_PHOTOS = [
  { id: 'convertible-sunset', name: 'Convertible Sunset', file: 'convertible-sunset.jpg' },
  { id: 'neon-portrait', name: 'Neon Portrait', file: 'neon-portrait.jpg' },
  { id: 'motel-sportscar', name: 'Motel Sportscar', file: 'motel-sportscar.jpg' },
  { id: 'speedboat-keys', name: 'Speedboat Keys', file: 'speedboat-keys.jpg' },
  { id: 'deco-avenue', name: 'Deco Avenue', file: 'deco-avenue.jpg' },
  { id: 'night-rider', name: 'Night Rider', file: 'night-rider.jpg' },
  { id: 'skyline-chopper', name: 'Skyline Chopper', file: 'skyline-chopper.jpg' },
  { id: 'pier', name: 'Pier', file: 'pier.jpg' },
  { id: 'boulevard', name: 'Boulevard', file: 'boulevard.jpg' },
];

const SAMPLE_BY_ID = new Map(SAMPLE_PHOTOS.map((s) => [s.id, s]));

export function sampleById(id) {
  return SAMPLE_BY_ID.get(id) ?? null;
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function createInitialState() {
  const template = 'classic';
  const panels = Array.from({ length: 6 }, (_, i) => ({
    photoId: SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length].id,
    zoom: 1,
    ox: 0,
    oy: 0,
    local: null,
  }));
  return {
    layout: 'keyArt',
    aspect: '16:9',
    preset: 'golden',
    intensity: 0.75,
    gradeScope: 'all',
    selectedPanel: 0,
    panels,
    lettering: {
      placement: 'below',
      template,
      layers: templateLayers(template),
    },
    autoFit: true,
    text: {
      title: 'NEON LIGHTS',
      subtitle: 'Ocean Drive',
      quote: '★★★★★  "A CLASSIC"',
      seal: 'ORIGINAL',
      tagline: 'ONE COAST · NO RULES · COMING SOON',
    },
  };
}

export function ensurePanels(state) {
  const count = panelCount(state.layout);
  while (state.panels.length < count) {
    const i = state.panels.length;
    state.panels.push({
      photoId: SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length].id,
      zoom: 1,
      ox: 0,
      oy: 0,
      local: null,
    });
  }
  if (state.selectedPanel >= count) state.selectedPanel = count - 1;
}

export function fillSampleCast(state) {
  ensurePanels(state);
  for (let i = 0; i < state.panels.length; i++) {
    state.panels[i].photoId = SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length].id;
  }
}

export function selectedPanel(state) {
  ensurePanels(state);
  return state.panels[state.selectedPanel] ?? state.panels[0];
}

/** The preset and intensity the colour controls currently edit. */
export function activeGrade(state) {
  const panel = selectedPanel(state);
  if (state.gradeScope === 'panel' && panel && panel.local) {
    return { preset: panel.local.preset, intensity: panel.local.intensity, local: true };
  }
  return { preset: state.preset, intensity: state.intensity, local: false };
}

export function setActiveGrade(state, patch) {
  const panel = selectedPanel(state);
  if (state.gradeScope === 'panel') {
    const base = panel.local ?? { preset: state.preset, intensity: state.intensity };
    panel.local = { ...base, ...patch };
  } else {
    if (patch.preset !== undefined) state.preset = patch.preset;
    if (patch.intensity !== undefined) state.intensity = patch.intensity;
  }
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
