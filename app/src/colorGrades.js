// Per-pixel colour grades. Each preset mixes contrast, saturation, split toning and a vignette over the source
// pixels by an intensity in 0..1, so the original photograph always remains part of the result.

export const PRESETS = [
  {
    key: 'golden',
    name: 'Golden Hour',
    colors: ['#f7bd68', '#ff8a5c'],
    params: {
      contrast: 1.12,
      saturation: 1.18,
      lift: 0.015,
      shadows: [58, 16, 50],
      highlights: [255, 170, 96],
      shadowMix: 0.2,
      highlightMix: 0.24,
      tint: [1.07, 0.99, 0.91],
      vignette: 0.3,
    },
  },
  {
    key: 'neon',
    name: 'Neon Night',
    colors: ['#3f7bff', '#ff4fd8'],
    params: {
      contrast: 1.2,
      saturation: 1.12,
      lift: 0,
      shadows: [18, 44, 92],
      highlights: [112, 244, 235],
      shadowMix: 0.3,
      highlightMix: 0.22,
      tint: [0.9, 1.02, 1.12],
      vignette: 0.42,
    },
  },
  {
    key: 'magenta',
    name: 'Magenta Dusk',
    colors: ['#ff5b9c', '#8a5cff'],
    params: {
      contrast: 1.14,
      saturation: 1.2,
      lift: 0.008,
      shadows: [92, 18, 104],
      highlights: [255, 112, 190],
      shadowMix: 0.28,
      highlightMix: 0.26,
      tint: [1.09, 0.93, 1.07],
      vignette: 0.36,
    },
  },
  {
    key: 'haze',
    name: 'Neon Haze',
    colors: ['#ff7ac8', '#66e4eb'],
    params: {
      contrast: 0.98,
      saturation: 1.08,
      lift: 0.075,
      shadows: [128, 32, 118],
      highlights: [116, 242, 235],
      shadowMix: 0.3,
      highlightMix: 0.3,
      tint: [1.07, 1.0, 1.08],
      vignette: 0.18,
    },
  },
  {
    key: 'pastel',
    name: 'Pastel Deco',
    colors: ['#f3b6c8', '#bfe8e0'],
    params: {
      contrast: 0.92,
      saturation: 0.78,
      lift: 0.1,
      shadows: [124, 112, 164],
      highlights: [255, 212, 220],
      shadowMix: 0.22,
      highlightMix: 0.28,
      tint: [1.03, 1.0, 1.02],
      vignette: 0.12,
    },
  },
];

const BY_KEY = new Map(PRESETS.map((p) => [p.key, p]));
export const PRESET_KEYS = new Set(PRESETS.map((p) => p.key));

export const PRESET_ALIASES = {
  'golden-hour': 'golden',
  'neon-night': 'neon',
  'magenta-dusk': 'magenta',
  'neon-haze': 'haze',
  'pastel-deco': 'pastel',
};

export function normalizePreset(key) {
  if (!key) return null;
  if (PRESET_KEYS.has(key)) return key;
  return PRESET_ALIASES[key] ?? null;
}

export function presetInfo(key) {
  return BY_KEY.get(key) ?? PRESETS[0];
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Grades one ImageData in place. */
export function gradeImageData(data, width, height, presetKey, intensity) {
  const t = clamp(intensity, 0, 1);
  if (t <= 0) return;
  const p = presetInfo(presetKey).params;
  const px = data.data;
  const sr = p.shadows[0] / 255 - 0.5;
  const sg = p.shadows[1] / 255 - 0.5;
  const sb = p.shadows[2] / 255 - 0.5;
  const hr = p.highlights[0] / 255 - 0.5;
  const hg = p.highlights[1] / 255 - 0.5;
  const hb = p.highlights[2] / 255 - 0.5;
  let i = 0;
  for (let y = 0; y < height; y++) {
    const ny = (y / height - 0.5) * 2;
    const ny2 = ny * ny;
    for (let x = 0; x < width; x++) {
      const nx = (x / width - 0.5) * 2;
      const or = px[i] / 255;
      const og = px[i + 1] / 255;
      const ob = px[i + 2] / 255;
      let l = or * 0.2126 + og * 0.7152 + ob * 0.0722;

      let r = (or - 0.5) * p.contrast + 0.5 + p.lift;
      let g = (og - 0.5) * p.contrast + 0.5 + p.lift;
      let b = (ob - 0.5) * p.contrast + 0.5 + p.lift;

      r = l + (r - l) * p.saturation;
      g = l + (g - l) * p.saturation;
      b = l + (b - l) * p.saturation;

      const shadow = (1 - l) * (1 - l) * p.shadowMix;
      const highlight = l * l * p.highlightMix;
      r += sr * shadow + hr * highlight;
      g += sg * shadow + hg * highlight;
      b += sb * shadow + hb * highlight;

      r *= p.tint[0];
      g *= p.tint[1];
      b *= p.tint[2];

      const vignette = 1 - p.vignette * Math.min(1, (nx * nx + ny2) * 0.55);
      r *= vignette;
      g *= vignette;
      b *= vignette;

      px[i] = clamp((or + (r - or) * t) * 255, 0, 255);
      px[i + 1] = clamp((og + (g - og) * t) * 255, 0, 255);
      px[i + 2] = clamp((ob + (b - ob) * t) * 255, 0, 255);
      i += 4;
    }
  }
}

/** Grades a whole canvas in place. */
export function applyGrade(ctx, width, height, presetKey, intensity) {
  if (intensity <= 0) return;
  const data = ctx.getImageData(0, 0, width, height);
  gradeImageData(data, width, height, presetKey, intensity);
  ctx.putImageData(data, 0, 0);
}
