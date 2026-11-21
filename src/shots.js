// Screenshot parameters. ?shot=cover shows only the poster, ?shot=editor the whole studio. The other keys set a
// repeatable scene: photo=cast, layout, aspect, preset, template, intensity, caption, subtitle, quote, badge and tagline.

import { ASPECTS, SAMPLE_PHOTOS, fillSampleCast, ensurePanels, clamp } from './state.js';
import { LAYOUT_KEYS, normalizeLayout } from './layouts.js';
import { PRESET_KEYS, normalizePreset } from './colorGrades.js';
import { TEMPLATE_ORDER, templateLayers } from './typography.js';

const TEMPLATE_KEYS = new Set(TEMPLATE_ORDER);

export function parseShot(search) {
  const q = new URLSearchParams(search || '');
  const shot = q.get('shot');
  return {
    shot: shot === 'cover' || shot === 'editor' ? shot : null,
    photo: q.get('photo'),
    layout: q.get('layout'),
    aspect: q.get('aspect'),
    preset: q.get('preset'),
    template: q.get('template'),
    intensity: q.get('intensity'),
    caption: q.get('caption'),
    subtitle: q.get('subtitle'),
    quote: q.get('quote'),
    badge: q.get('badge'),
    tagline: q.get('tagline'),
  };
}

export function applyShot(state, params) {
  const layout = normalizeLayout(params.layout);
  if (layout && LAYOUT_KEYS.includes(layout)) state.layout = layout;
  if (params.aspect && ASPECTS[params.aspect]) state.aspect = params.aspect;
  const preset = normalizePreset(params.preset);
  if (preset && PRESET_KEYS.has(preset)) state.preset = preset;
  if (params.template && TEMPLATE_KEYS.has(params.template)) {
    state.lettering.template = params.template;
    state.lettering.layers = templateLayers(params.template);
  }

  if (params.intensity !== null && params.intensity !== undefined && params.intensity !== '') {
    const n = Number(params.intensity);
    if (Number.isFinite(n)) state.intensity = clamp(n > 1 ? n / 100 : n, 0, 1);
  }

  if (params.caption !== null) state.text.title = params.caption;
  if (params.subtitle !== null) state.text.subtitle = params.subtitle;
  if (params.quote !== null) state.text.quote = params.quote;
  if (params.badge !== null) state.text.seal = params.badge;
  if (params.tagline !== null) state.text.tagline = params.tagline;

  ensurePanels(state);

  if (params.photo === 'cast') {
    fillSampleCast(state);
  } else if (params.photo) {
    const sample = SAMPLE_PHOTOS.find((s) => s.id === params.photo || s.file === params.photo);
    if (sample) state.panels[0].photoId = sample.id;
  }
  return state;
}
