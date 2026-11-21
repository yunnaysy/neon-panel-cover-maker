// Lettering: the six art-direction templates, per-layer measurement and auto-fit, the five title effects, and the
// lavender edit outline used by the live preview. Exports never draw the outline.

import { BAND_PALETTES } from './decorations.js';

export const FONTS = [
  { family: 'Bebas Neue', weight: '400', label: 'Bebas Neue' },
  { family: 'Anton', weight: '400', label: 'Anton' },
  { family: 'Archivo Black', weight: '400', label: 'Archivo Black' },
  { family: 'Monoton', weight: '400', label: 'Monoton' },
  { family: 'Playfair Display', weight: '900', label: 'Playfair Display 900' },
  { family: 'Kaushan Script', weight: '400', label: 'Kaushan Script' },
  { family: 'Pacifico', weight: '400', label: 'Pacifico' },
  { family: 'Oswald', weight: '600', label: 'Oswald 600' },
  { family: 'Saira Stencil One', weight: '400', label: 'Saira Stencil One' },
];

const FONT_META = new Map(FONTS.map((f) => [f.family, f]));

export const LAYER_RANGES = {
  title: { size: [48, 220], spacing: [-5, 20], lineHeight: [0.7, 1.5] },
  subtitle: { size: [18, 80], spacing: [-3, 12], lineHeight: [0.8, 1.8] },
  billing: { size: [9, 30], spacing: [0, 8], lineHeight: [0.8, 1.5] },
};

const L = (font, size, spacing, lineHeight, x, y, align, effect, color, extra = {}) => ({
  font,
  size,
  spacing,
  lineHeight,
  x,
  y,
  align,
  effect,
  color,
  italic: false,
  uppercase: true,
  ...extra,
});

export const TEMPLATES = {
  classic: {
    name: 'Classic Neon',
    layers: {
      title: L('Bebas Neue', 150, 1.5, 0.92, 7, 75, 'left', 'gradient', '#ffd36b', { italic: true }),
      subtitle: L('Kaushan Script', 44, 0, 1.0, 9, 85, 'left', 'flat', '#ffd6e2', { uppercase: false }),
      billing: L('Oswald', 13, 3.2, 1.0, 7, 93, 'left', 'flat', '#f5f0e9'),
    },
  },
  chrome: {
    name: 'Chrome Blockbuster',
    layers: {
      title: L('Archivo Black', 112, 2, 1.02, 50, 74, 'center', 'chrome', '#e8f4ff'),
      subtitle: L('Playfair Display', 26, 7, 1.0, 50, 84, 'center', 'flat', '#cfe3ff', { weight: '700' }),
      billing: L('Oswald', 12, 4, 1.0, 50, 93, 'center', 'flat', '#f5f0e9'),
    },
  },
  script: {
    name: 'Neon Script Sign',
    layers: {
      title: L('Pacifico', 120, 0, 1.05, 50, 74, 'center', 'neon-tube', '#ff6fbf', { uppercase: false }),
      subtitle: L('Oswald', 24, 8, 1.0, 50, 84, 'center', 'flat', '#ffe2f0'),
      billing: L('Oswald', 12, 4, 1.0, 50, 93, 'center', 'flat', '#f5f0e9'),
    },
  },
  noir: {
    name: 'Minimal Noir',
    layers: {
      title: L('Playfair Display', 130, 1, 0.98, 50, 74, 'center', 'flat', '#f7f3ee', { uppercase: false, weight: '900' }),
      subtitle: L('Oswald', 22, 8, 1.0, 50, 84, 'center', 'flat', '#e6ded6'),
      billing: L('Saira Stencil One', 12, 3, 1.0, 50, 93, 'center', 'flat', '#f5f0e9'),
    },
  },
  arcade: {
    name: 'Retro Arcade',
    layers: {
      title: L('Monoton', 118, 1, 1.05, 50, 73, 'center', 'neon-tube', '#66e4eb'),
      subtitle: L('Pacifico', 40, 0, 1.0, 50, 84, 'center', 'flat', '#ffd36b', { uppercase: false }),
      billing: L('Saira Stencil One', 12, 3, 1.0, 50, 93, 'center', 'flat', '#f5f0e9'),
    },
  },
  stacked: {
    name: 'Stacked Bold',
    layers: {
      title: L('Anton', 128, 1, 0.98, 50, 74, 'center', 'outline', '#ffd36b'),
      subtitle: L('Kaushan Script', 42, 0, 1.0, 50, 85, 'center', 'flat', '#ffd6e2', { uppercase: false }),
      billing: L('Oswald', 12, 3.4, 1.0, 50, 93, 'center', 'flat', '#f5f0e9'),
    },
  },
};

export const TEMPLATE_ORDER = ['classic', 'chrome', 'script', 'noir', 'arcade', 'stacked'];

export function cloneLayers(layers) {
  return JSON.parse(JSON.stringify(layers));
}

export function templateLayers(key) {
  return cloneLayers((TEMPLATES[key] ?? TEMPLATES.classic).layers);
}

function fontSpec(layer, px) {
  const meta = FONT_META.get(layer.font) ?? FONTS[0];
  const weight = layer.weight || meta.weight;
  const style = layer.italic ? 'italic' : 'normal';
  return `${style} ${weight} ${Math.max(1, px)}px "${layer.font}", "Arial Narrow", sans-serif`;
}

function textFor(state, key) {
  if (key === 'title') return state.text.title ?? '';
  if (key === 'subtitle') return state.text.subtitle ?? '';
  return state.text.tagline ?? '';
}

function splitLines(text, key) {
  const parts = String(text).split('/');
  const lines = parts.map((p) => p.trim());
  if (key === 'title' && lines.length === 0) return [''];
  return lines.length === 0 ? [''] : lines;
}

function measureAt(ctx, lines, layer, px, u) {
  ctx.font = fontSpec(layer, px);
  ctx.letterSpacing = `${layer.spacing * u}px`;
  let maxW = 0;
  let ascent = 0;
  let descent = 0;
  for (const line of lines) {
    const m = ctx.measureText(line.length === 0 ? ' ' : line);
    maxW = Math.max(maxW, m.width);
    ascent = Math.max(ascent, m.actualBoundingBoxAscent ?? px * 0.74);
    descent = Math.max(descent, m.actualBoundingBoxDescent ?? px * 0.24);
  }
  const advance = px * layer.lineHeight;
  const totalH = lines.length > 1 ? ascent + descent + (lines.length - 1) * advance : ascent + descent;
  return { maxW, ascent, descent, advance, totalH };
}

function paintLine(ctx, text, x, baseline, px, layer, effect, block) {
  const color = layer.color || '#f5f0e9';
  ctx.save();
  ctx.textAlign = layer.align;
  ctx.textBaseline = 'alphabetic';

  if (effect === 'gradient') {
    const g = ctx.createLinearGradient(0, block.top, 0, block.top + block.height);
    g.addColorStop(0, '#ff4f1d');
    g.addColorStop(0.3, '#ff8a1e');
    g.addColorStop(0.62, '#ffc23d');
    g.addColorStop(1, '#ffe1a6');
    const ex = px * 0.045;
    const ey = px * 0.055;
    ctx.fillStyle = 'rgba(38,10,28,0.92)';
    for (let i = 4; i >= 1; i--) ctx.fillText(text, x + (ex * i) / 4, baseline + (ey * i) / 4);
    ctx.shadowColor = 'rgba(255,105,140,0.5)';
    ctx.shadowBlur = px * 0.2;
    ctx.fillStyle = g;
    ctx.fillText(text, x, baseline);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,240,210,0.14)';
    ctx.fillText(text, x, baseline - px * 0.012);
  } else if (effect === 'chrome') {
    const g = ctx.createLinearGradient(0, baseline - px * 0.82, 0, baseline + px * 0.18);
    g.addColorStop(0, '#f8fdff');
    g.addColorStop(0.34, '#b9d7e8');
    g.addColorStop(0.52, '#ffffff');
    g.addColorStop(0.7, '#7c9db5');
    g.addColorStop(1, '#dcefff');
    ctx.lineJoin = 'round';
    ctx.lineWidth = px * 0.042;
    ctx.strokeStyle = 'rgba(8,12,22,0.92)';
    ctx.strokeText(text, x, baseline);
    ctx.fillStyle = g;
    ctx.fillText(text, x, baseline);
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.fillText(text, x, baseline - px * 0.02);
  } else if (effect === 'neon-tube') {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = px * 0.55;
    ctx.lineWidth = px * 0.075;
    ctx.strokeText(text, x, baseline);
    ctx.strokeText(text, x, baseline);
    ctx.shadowBlur = px * 0.18;
    ctx.strokeStyle = 'rgba(255,255,255,0.94)';
    ctx.lineWidth = px * 0.026;
    ctx.strokeText(text, x, baseline);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, baseline);
  } else if (effect === 'outline') {
    const g = ctx.createLinearGradient(0, block.top, 0, block.top + block.height);
    g.addColorStop(0, '#ff6a3d');
    g.addColorStop(0.5, '#ffd36b');
    g.addColorStop(1, '#ff8ac2');
    ctx.fillStyle = 'rgba(28,10,26,0.44)';
    ctx.fillText(text, x, baseline);
    ctx.strokeStyle = g;
    ctx.lineWidth = px * 0.032;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, baseline);
  } else {
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(16,13,24,0.42)';
    ctx.shadowBlur = px * 0.07;
    ctx.fillText(text, x, baseline);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawLayer(ctx, state, key, layer, geom) {
  const { W, H, u, bandH } = geom;
  const raw = textFor(state, key);
  const lines = splitLines(raw, key).map((line) => (layer.uppercase ? line.toUpperCase() : line));
  const range = LAYER_RANGES[key];
  const base = Math.min(range.size[1], Math.max(range.size[0], layer.size));
  const centered = layer.align === 'center';
  const maxWidth = (key === 'title' ? (centered ? 0.7 : 0.765) : 0.9) * W;
  const maxHeight = key === 'title' ? 0.56 * bandH : bandH * 0.9;
  const auto = key === 'title' && state.autoFit;

  let size = base;
  let m = measureAt(ctx, lines, layer, size * u, u);
  if (auto) {
    let guard = 0;
    while (guard++ < 120 && size > range.size[0] && (m.maxW > maxWidth + 0.5 || m.totalH > maxHeight + 0.5)) {
      size = Math.max(range.size[0], size * 0.96);
      m = measureAt(ctx, lines, layer, size * u, u);
    }
  }

  const px = size * u;
  const x = (layer.x / 100) * W;
  const y = (layer.y / 100) * H;
  const top = y - m.totalH / 2;
  const block = { top, height: m.totalH };
  const effect = key === 'title' ? layer.effect || 'gradient' : layer.effect || 'flat';

  ctx.save();
  ctx.font = fontSpec(layer, px);
  ctx.letterSpacing = `${layer.spacing * u}px`;
  const baselines = [];
  for (let i = 0; i < lines.length; i++) {
    baselines.push(top + m.ascent + i * m.advance);
    paintLine(ctx, lines[i], x, baselines[i], px, layer, effect, block);
  }
  ctx.letterSpacing = '0px';
  ctx.restore();

  const bx = layer.align === 'left' ? x : layer.align === 'center' ? x - m.maxW / 2 : x - m.maxW;
  const box = { x: bx, y: top, w: m.maxW, h: m.totalH, align: layer.align };
  const tooWide = m.maxW > maxWidth + 0.5 || m.totalH > maxHeight + 0.5;
  return { box, tooWide };
}

function drawOutline(ctx, box, geom) {
  const pad = 4 * geom.u;
  const x = box.x - pad;
  const y = box.y - pad;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  ctx.save();
  ctx.setLineDash([6 * geom.u, 4 * geom.u]);
  ctx.lineWidth = Math.max(1, 1.1 * geom.u);
  ctx.strokeStyle = '#c9b6ff';
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  const hs = Math.max(10, 7 * geom.u);
  const hx = x + w;
  const hy = y + h;
  ctx.fillStyle = '#c9b6ff';
  ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
  ctx.strokeStyle = '#2a1f3d';
  ctx.lineWidth = Math.max(1, geom.u);
  ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
  ctx.restore();
  return { x: hx, y: hy, size: hs + 8 * geom.u };
}

export function drawLettering(ctx, state, geom, opts = {}) {
  const boxes = {};
  let tooWide = false;
  for (const key of ['title', 'subtitle', 'billing']) {
    const layer = state.lettering.layers[key];
    const result = drawLayer(ctx, state, key, layer, geom);
    boxes[key] = result.box;
    if (key === 'title') tooWide = result.tooWide;
  }

  let handle = null;
  if (!opts.forExport) {
    if (opts.activeLayer && boxes[opts.activeLayer]) {
      handle = drawOutline(ctx, boxes[opts.activeLayer], geom);
    }
    if (opts.snapX) {
      ctx.save();
      ctx.setLineDash([7 * geom.u, 5 * geom.u]);
      ctx.lineWidth = Math.max(1, 1.1 * geom.u);
      ctx.strokeStyle = 'rgba(201,182,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(geom.W / 2, geom.bandTop);
      ctx.lineTo(geom.W / 2, geom.H);
      ctx.stroke();
      ctx.restore();
    }
  }
  return { boxes, tooWide, handle };
}

export function renderTemplateThumb(canvas, key, title, preset = 'golden') {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  if (!W || !H) return;
  ctx.clearRect(0, 0, W, H);
  const pal = BAND_PALETTES[preset] ?? BAND_PALETTES.golden;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, pal[0]);
  g.addColorStop(0.45, pal[1]);
  g.addColorStop(0.8, pal[2]);
  g.addColorStop(1, pal[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const fake = {
    lettering: { layers: templateLayers(key) },
    text: {
      title: title || 'NEON LIGHTS',
      subtitle: 'Ocean Drive',
      tagline: 'ONE COAST · NO RULES',
    },
    autoFit: true,
  };
  const u = Math.sqrt(W * H) / 1000;
  drawLettering(ctx, fake, { W, H, u, bandTop: 0, bandH: H }, { forExport: true });
}
