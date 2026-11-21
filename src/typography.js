// Poster lettering, fonts and template definitions for Neon Panel.
// Every layer is measured in logical units (u = sqrt(w*h)/1000) so the same
// values render identically at preview and export resolutions.

import { getColorPreset } from './colorGrades.js';

export const TITLE_SAFE_TOP = 0.635;
export const FOOTER_HEIGHT = 0.065;
export const BAND_BOTTOM = 1 - FOOTER_HEIGHT;

export const TITLE_COLOR_THEMES = [
  {
    id: 'coast-sunset',
    name: 'Coast Sunset',
    badge: 'COAST',
    stops: [
      { pos: 0, color: '#fff3d4' },
      { pos: 0.34, color: '#ffc05c' },
      { pos: 0.68, color: '#ff704c' },
      { pos: 1, color: '#ef3982' },
    ],
    outline: '#160c1b',
    glow: 'rgba(255, 104, 87, .82)',
    subtitleColor: '#ff6fba',
  },
];

export const FONTS = [
  { family: 'Bebas Neue', file: 'BebasNeue-Regular.ttf', weight: '400 900', cssWeight: 900, stacks: '"Bebas Neue", Impact, "Arial Black", sans-serif' },
  { family: 'Anton', file: 'Anton-Regular.ttf', weight: 400, cssWeight: 400, stacks: '"Anton", Impact, "Arial Black", sans-serif' },
  { family: 'Archivo Black', file: 'ArchivoBlack-Regular.ttf', weight: 400, cssWeight: 400, stacks: '"Archivo Black", "Arial Black", sans-serif' },
  { family: 'Monoton', file: 'Monoton-Regular.ttf', weight: 400, cssWeight: 400, stacks: '"Monoton", "Arial Black", sans-serif' },
  { family: 'Playfair Display', file: 'PlayfairDisplay-Variable.ttf', weight: '400 900', cssWeight: 900, stacks: '"Playfair Display", Georgia, serif' },
  { family: 'Kaushan Script', file: 'KaushanScript-Regular.ttf', weight: 400, cssWeight: 400, stacks: '"Kaushan Script", "Pacifico", cursive' },
  { family: 'Pacifico', file: 'Pacifico-Regular.ttf', weight: 400, cssWeight: 400, stacks: '"Pacifico", "Kaushan Script", cursive' },
  { family: 'Oswald', file: 'Oswald-Variable.ttf', weight: '200 700', cssWeight: 600, stacks: '"Oswald", "Bebas Neue", Impact, sans-serif' },
  { family: 'Saira Stencil One', file: 'SairaStencilOne-Regular.ttf', weight: 400, cssWeight: 400, stacks: '"Saira Stencil One", "Oswald", Impact, sans-serif' },
];

export const FONT_STACKS = Object.fromEntries(FONTS.map(font => [font.family, font.stacks]));

export const LAYER_META = {
  title: { label: 'Title', minSize: 48, maxSize: 220, minSpacing: -5, maxSpacing: 20, minLine: 0.7, maxLine: 1.5, defaultLine: 1.0 },
  subtitle: { label: 'Subtitle', minSize: 18, maxSize: 80, minSpacing: -3, maxSpacing: 12, minLine: 0.8, maxLine: 1.8, defaultLine: 1.0 },
  billing: { label: 'Billing', minSize: 9, maxSize: 30, minSpacing: 0, maxSpacing: 8, minLine: 0.8, maxLine: 1.5, defaultLine: 1.15 },
};

export const LAYER_NAMES = ['title', 'subtitle', 'billing'];

const BILLING_CREDIT = 'AN ORIGINAL NEON PANEL COVER  ·  MADE FOR THE NIGHT';

const BASE_LAYERS = {
  title: {
    font: 'Bebas Neue', size: null, spacing: null, lineHeight: null,
    x: 5.5, y: 80.3, align: 'left', effect: 'gradient', italic: true,
    uppercase: true, color: null,
  },
  subtitle: {
    font: 'Kaushan Script', size: null, spacing: null, lineHeight: null,
    x: 6, y: 90.8, align: 'left', effect: 'neon', italic: false,
    uppercase: false, color: null,
  },
  billing: {
    font: 'Oswald', size: null, spacing: null, lineHeight: null,
    x: 7.5, y: 96.3, align: 'left', effect: 'flat', italic: false,
    uppercase: true, color: null,
  },
};

function makeLayers(title, subtitle, billing) {
  return {
    title: { ...BASE_LAYERS.title, ...title },
    subtitle: { ...BASE_LAYERS.subtitle, ...subtitle },
    billing: { ...BASE_LAYERS.billing, ...billing },
  };
}

export const LETTERING_TEMPLATES = [
  {
    id: 'classic-neon',
    name: 'Classic Neon',
    layers: makeLayers({}, {}, {}),
  },
  {
    id: 'chrome-blockbuster',
    name: 'Chrome Blockbuster',
    layers: makeLayers(
      { font: 'Archivo Black', size: 132, spacing: 1, lineHeight: 0.95, x: 50, y: 79.5, align: 'center', effect: 'chrome', italic: false, color: null },
      { font: 'Playfair Display', size: 30, spacing: 5, lineHeight: 1.1, x: 50, y: 88.4, align: 'center', effect: 'flat', uppercase: true, color: '#f2ecff' },
      { font: 'Oswald', size: 14, spacing: 3, lineHeight: 1.1, x: 50, y: 95.5, align: 'center', effect: 'flat', uppercase: true },
    ),
  },
  {
    id: 'neon-script-sign',
    name: 'Neon Script Sign',
    layers: makeLayers(
      { font: 'Pacifico', size: 150, spacing: 0, lineHeight: 1.05, x: 5.5, y: 79.5, align: 'left', effect: 'neon-tube', italic: false },
      { font: 'Oswald', size: 24, spacing: 6, lineHeight: 1.1, x: 6, y: 89.5, align: 'left', effect: 'flat', uppercase: true, color: '#9df6ff' },
      { font: 'Oswald', size: 13, spacing: 3, lineHeight: 1.1, x: 7.5, y: 96.3, align: 'left', effect: 'flat', uppercase: true },
    ),
  },
  {
    id: 'minimal-noir',
    name: 'Minimal Noir',
    layers: makeLayers(
      { font: 'Playfair Display', size: 128, spacing: 0, lineHeight: 1.0, x: 5.5, y: 80, align: 'left', effect: 'flat', italic: false, color: '#ffffff' },
      { font: 'Oswald', size: 22, spacing: 5, lineHeight: 1.1, x: 6, y: 89.5, align: 'left', effect: 'flat', uppercase: true, color: '#e8e3f1' },
      { font: 'Saira Stencil One', size: 14, spacing: 2, lineHeight: 1.1, x: 7.5, y: 96.3, align: 'left', effect: 'flat', uppercase: true, color: '#ffffff' },
    ),
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    layers: makeLayers(
      { font: 'Monoton', size: 118, spacing: 2, lineHeight: 1.05, x: 50, y: 79.5, align: 'center', effect: 'neon-tube', italic: false, color: '#ff6fd8' },
      { font: 'Pacifico', size: 34, spacing: 0, lineHeight: 1.1, x: 50, y: 88.5, align: 'center', effect: 'neon', uppercase: false, color: '#7df9ff' },
      { font: 'Saira Stencil One', size: 14, spacing: 2, lineHeight: 1.1, x: 50, y: 95.8, align: 'center', effect: 'flat', uppercase: true, color: '#ffffff' },
    ),
  },
  {
    id: 'stacked-bold',
    name: 'Stacked Bold',
    layers: makeLayers(
      { font: 'Anton', size: 170, spacing: 1, lineHeight: 0.92, x: 5.5, y: 79.5, align: 'left', effect: 'outline', italic: false },
      { font: 'Kaushan Script', size: 44, spacing: 0, lineHeight: 1.0, x: 6, y: 89.5, align: 'left', effect: 'neon', uppercase: false },
      { font: 'Oswald', size: 14, spacing: 4, lineHeight: 1.1, x: 7.5, y: 96.3, align: 'left', effect: 'flat', uppercase: true },
    ),
  },
];

export const LAYER_DEFAULT_X = { left: 5.5, center: 50, right: 94.5 };

export function getTemplate(id) {
  return LETTERING_TEMPLATES.find(template => template.id === id) || LETTERING_TEMPLATES[0];
}

export function cloneLayers(layers) {
  return {
    title: { ...layers.title },
    subtitle: { ...layers.subtitle },
    billing: { ...layers.billing },
  };
}

export function resolveLayer(typo, name) {
  const template = getTemplate(typo?.template);
  const base = template.layers[name] || BASE_LAYERS[name];
  const current = typo?.layers?.[name] || {};
  return { ...BASE_LAYERS[name], ...base, ...current };
}

export function getBandGeometry(w, h) {
  const bandTop = h * TITLE_SAFE_TOP;
  const footerTop = h * (1 - FOOTER_HEIGHT);
  return { bandTop, footerTop, bandH: footerTop - bandTop, footerH: h * FOOTER_HEIGHT };
}

export function getDefaultSizePx(name, w, h) {
  if (name === 'title') return h * 0.22;
  if (name === 'subtitle') return h * 0.061;
  return h * FOOTER_HEIGHT * 0.37;
}

export function logicalUnit(w, h) {
  return Math.sqrt(Math.max(1, w * h)) / 1000;
}

function fontFor(layer, sizePx) {
  const font = FONTS.find(item => item.family === layer.font) || FONTS[0];
  const weight = font.cssWeight || 400;
  const italic = layer.italic && layer.font === 'Bebas Neue' ? 'italic ' : '';
  return `${italic}${weight} ${Math.max(1, Math.round(sizePx))}px ${FONT_STACKS[layer.font] || FONT_STACKS['Bebas Neue']}`;
}

function getTextLines(typo, name, layer) {
  if (name === 'title') {
    const raw = String(typo.mainTitle ?? '').trim();
    const parts = raw.split('/').map(line => line.trim()).filter(Boolean);
    const value = parts.length ? parts : ['UNTITLED COVER'];
    return value.map(line => (layer.uppercase === false ? line : line.toUpperCase()));
  }
  if (name === 'subtitle') {
    const raw = String(typo.subtitle ?? '').trim();
    if (!raw) return [];
    return [layer.uppercase ? raw.toUpperCase() : raw];
  }
  const raw = String(typo.tagline ?? '').trim();
  const main = layer.uppercase === false ? raw : raw.toUpperCase();
  return [main, BILLING_CREDIT].filter(Boolean);
}

function measureText(ctx, text, font, spacingPx, fallbackSize) {
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacingPx}px`;
  const metrics = ctx.measureText(text || ' ');
  const width = metrics.width || 0;
  const ascent = Number.isFinite(metrics.actualBoundingBoxAscent) ? metrics.actualBoundingBoxAscent : fallbackSize * 0.72;
  const descent = Number.isFinite(metrics.actualBoundingBoxDescent) ? metrics.actualBoundingBoxDescent : fallbackSize * 0.22;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return { width, ascent, descent, ink: ascent + descent };
}

function measureLayer(ctx, typo, name, w, h) {
  const meta = LAYER_META[name];
  const layer = resolveLayer(typo, name);
  const u = logicalUnit(w, h);
  const geo = getBandGeometry(w, h);
  const align = layer.align || 'left';
  const autoFit = typo.autoFit !== false;
  const spacingPx = (Number.isFinite(layer.spacing) ? layer.spacing : 0) * u;
  const lineHeight = Number.isFinite(layer.lineHeight) ? layer.lineHeight : meta.defaultLine;
  const lines = getTextLines(typo, name, layer);
  const sizes = name === 'billing' ? [1, 0.62] : lines.map(() => 1);

  let sizePx = Number.isFinite(layer.size)
    ? Math.max(1, layer.size * u)
    : getDefaultSizePx(name, w, h);

  const maxWidth = w * (align === 'center' ? 0.70 : 0.765);
  const maxInkHeight = name === 'billing' ? h * 0.12 : geo.bandH * 0.56;

  let measured = [];
  let width = 0;
  let inkHeight = 0;
  let blockHeight = 0;

  const measure = () => {
    measured = [];
    width = 0;
    let ink = 0;
    let block = 0;
    for (let i = 0; i < lines.length; i++) {
      const ratio = sizes[i] ?? 1;
      const lineSize = sizePx * ratio;
      const lineSpacing = spacingPx * ratio;
      const font = fontFor(layer, lineSize);
      const metrics = measureText(ctx, lines[i], font, lineSpacing, lineSize);
      measured.push({ text: lines[i], font, size: lineSize, spacing: lineSpacing, ...metrics });
      width = Math.max(width, metrics.width);
      ink += metrics.ink;
      block += lineSize * lineHeight;
    }
    if (name !== 'billing' && measured.length > 1) {
      ink += (measured.length - 1) * sizePx * lineHeight * 0.35;
    }
    inkHeight = ink;
    blockHeight = block;
  };

  measure();

  if (autoFit) {
    let guard = 0;
    while (guard++ < 60 && (width > maxWidth + 0.5 || inkHeight > maxInkHeight + 0.5)) {
      const widthRatio = width > maxWidth ? maxWidth / width : 1;
      const heightRatio = inkHeight > maxInkHeight ? maxInkHeight / inkHeight : 1;
      const scale = Math.min(widthRatio, heightRatio) * 0.995;
      if (!Number.isFinite(scale) || scale <= 0 || scale > 0.999) break;
      sizePx *= scale;
      measure();
    }
  }

  const overflow = width > maxWidth + 0.5 || inkHeight > maxInkHeight + 0.5;
  const anchorX = (Number.isFinite(layer.x) ? layer.x : BASE_LAYERS[name].x) / 100 * w;
  const anchorY = (Number.isFinite(layer.y) ? layer.y : BASE_LAYERS[name].y) / 100 * h;
  const boxW = Math.max(width, sizePx * 0.4);
  const boxH = Math.max(blockHeight, sizePx * 0.6);
  const left = align === 'center' ? anchorX - boxW / 2 : align === 'right' ? anchorX - boxW : anchorX;
  const top = anchorY - boxH / 2;

  return {
    name,
    layer,
    u,
    sizePx,
    logicalSize: sizePx / u,
    spacingPx,
    lineHeight,
    lines: measured,
    width,
    inkHeight,
    blockHeight,
    overflow,
    autoFit,
    anchorX,
    anchorY,
    align,
    box: { x: left, y: top, width: boxW, height: boxH },
    maxWidth,
    maxInkHeight,
    handle: { x: left + boxW, y: top + boxH },
  };
}

let measureCanvas = null;
function getMeasureContext() {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return ctx;
}

export function getTypographyLayout(typo, w, h, ctx = null) {
  if (!ctx) ctx = getMeasureContext();
  const geo = getBandGeometry(w, h);
  const layers = {};
  for (const name of LAYER_NAMES) layers[name] = measureLayer(ctx, typo, name, w, h);
  return {
    ...geo,
    layers,
    anyOverflow: LAYER_NAMES.some(name => layers[name].overflow),
  };
}

export function getTitleSafeZone(canvasH) {
  return { top: canvasH * TITLE_SAFE_TOP, bottom: canvasH };
}

export function drawCoverTypography(ctx, typo, canvasW, canvasH, options = {}) {
  const placement = options.placement || typo.placement || 'below';
  const poster = getColorPreset(typo.colorPreset).poster;
  const layout = getTypographyLayout(typo, canvasW, canvasH, ctx);
  const geo = getBandGeometry(canvasW, canvasH);

  ctx.save();
  drawTitleBand(ctx, canvasW, canvasH, poster, placement, options);
  drawFooterStrip(ctx, poster, options);

  if (!options.minimal) {
    drawQuoteLine(ctx, typo.quoteLine, canvasW * 0.055, geo.bandTop + geo.bandH * 0.14, canvasW, canvasH, poster.accentColor);
    drawFiveStarStrip(ctx, canvasW * 0.84, geo.bandTop + geo.bandH * 0.14, canvasH, poster.accentColor, poster.titleGlow);
    if (typo.badgeText && String(typo.badgeText).trim()) {
      const sealRadius = Math.min(canvasH * 0.055, canvasW * 0.065);
      drawStarburstBadge(ctx, String(typo.badgeText).trim().toUpperCase(), canvasW * 0.92, geo.bandTop + geo.bandH * 0.57, sealRadius, poster);
    }
  }

  drawTextLayer(ctx, layout.layers.title, poster, 'title', canvasW);
  drawTextLayer(ctx, layout.layers.subtitle, poster, 'subtitle', canvasW);
  drawBillingLayer(ctx, layout.layers.billing);

  if (Array.isArray(typo.panelLabels) && typo.panelLabels.length && !options.minimal) {
    drawPanelLabels(ctx, typo.panelLabels, canvasW, canvasH);
  }
  ctx.restore();
}

function drawTextLayer(ctx, info, poster, kind, canvasW) {
  if (!info || !info.lines.length) return;
  const layer = info.layer;
  const effect = layer.effect || (kind === 'title' ? 'gradient' : 'neon');
  const color = layer.color || (kind === 'title' ? poster.titleStops[0] : poster.subtitleColor);
  let cursor = info.anchorY - info.blockHeight / 2;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  for (const line of info.lines) {
    const advance = line.size * info.lineHeight;
    const centerY = cursor + advance / 2;
    const x = info.align === 'center' ? info.anchorX : info.align === 'right' ? info.anchorX - line.width : info.anchorX;
    ctx.font = line.font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${line.spacing}px`;
    drawLineEffect(ctx, line.text, x, centerY, line.size, effect, poster, kind, color, canvasW);
    cursor += advance;
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
}

function drawBillingLayer(ctx, info) {
  if (!info || !info.lines.length) return;
  let cursor = info.anchorY - info.blockHeight / 2;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (let i = 0; i < info.lines.length; i++) {
    const line = info.lines[i];
    const advance = line.size * info.lineHeight;
    const y = cursor + advance / 2;
    const x = info.align === 'center' ? info.anchorX : info.align === 'right' ? info.anchorX - line.width : info.anchorX;
    ctx.font = line.font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${line.spacing}px`;
    if (i === 0) {
      ctx.fillStyle = '#fff0d6';
      ctx.shadowColor = 'rgba(255, 190, 130, .35)';
      ctx.shadowBlur = line.size * 0.35;
    } else {
      ctx.fillStyle = 'rgba(255, 224, 214, .66)';
      ctx.shadowBlur = 0;
    }
    if (info.layer.effect === 'outline') {
      ctx.strokeStyle = '#fff0d6';
      ctx.lineWidth = Math.max(1, line.size * 0.05);
      ctx.strokeText(line.text, x, y);
    } else {
      ctx.fillText(line.text, x, y);
    }
    cursor += advance;
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
}

function drawLineEffect(ctx, text, x, y, sizePx, effect, poster, kind, color, canvasW) {
  const outline = Math.max(4, sizePx * 0.085);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  if (effect === 'flat') {
    ctx.fillStyle = color;
    if (kind === 'title') {
      ctx.shadowColor = 'rgba(0,0,0,.42)';
      ctx.shadowBlur = sizePx * 0.18;
      ctx.shadowOffsetY = sizePx * 0.035;
    }
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    return;
  }

  if (effect === 'outline') {
    const stroke = ctx.createLinearGradient(0, y - sizePx * 0.55, 0, y + sizePx * 0.48);
    (poster.titleStops || ['#fff']).forEach((stop, index, all) => stroke.addColorStop(index / Math.max(1, all.length - 1), stop));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(3, sizePx * 0.075);
    ctx.strokeText(text, x, y);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = poster.titleStops[0] || '#fff';
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
    return;
  }

  if (effect === 'chrome') {
    const depth = Math.max(5, Math.round(sizePx * 0.07));
    for (let d = depth; d > 0; d--) {
      ctx.fillStyle = `rgba(8, 12, 28, ${(0.30 + 0.4 * (1 - d / depth)).toFixed(2)})`;
      ctx.fillText(text, x + d * 1.1, y + d * 1.05);
    }
    ctx.strokeStyle = '#101528';
    ctx.lineWidth = Math.max(3, sizePx * 0.06);
    ctx.strokeText(text, x, y);
    ctx.shadowColor = 'rgba(126, 197, 255, .55)';
    ctx.shadowBlur = sizePx * 0.18;
    const chrome = ctx.createLinearGradient(0, y - sizePx * 0.58, 0, y + sizePx * 0.5);
    chrome.addColorStop(0, '#ffffff');
    chrome.addColorStop(0.28, '#dfe7f8');
    chrome.addColorStop(0.49, '#7f8ba8');
    chrome.addColorStop(0.52, '#f8fbff');
    chrome.addColorStop(0.76, '#9fb0cf');
    chrome.addColorStop(1, '#edf3ff');
    ctx.fillStyle = chrome;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = Math.max(1, sizePx * 0.012);
    ctx.strokeText(text, x, y - sizePx * 0.014);
    return;
  }

  if (effect === 'neon-tube') {
    const tube = color || poster.subtitleColor || '#ff8be4';
    ctx.shadowColor = tube;
    ctx.shadowBlur = sizePx * 0.55;
    ctx.strokeStyle = tube;
    ctx.lineWidth = Math.max(3, sizePx * 0.075);
    ctx.strokeText(text, x, y);
    ctx.shadowBlur = sizePx * 0.28;
    ctx.lineWidth = Math.max(1.5, sizePx * 0.032);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, x, y);
    ctx.shadowBlur = sizePx * 0.12;
    ctx.fillStyle = '#fff8ff';
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    return;
  }

  if (effect === 'neon') {
    ctx.lineWidth = Math.max(2, sizePx * 0.06);
    ctx.strokeStyle = 'rgba(24, 9, 26, .9)';
    ctx.strokeText(text, x, y);
    ctx.shadowColor = color;
    ctx.shadowBlur = sizePx * 0.65;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = sizePx * 0.3;
    ctx.fillStyle = '#fff2f5';
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    return;
  }

  // v2 gradient title: extrusion, dark outline, glow and warm gradient fill.
  const depth = Math.max(7, Math.round(sizePx * 0.09));
  for (let d = depth; d > 0; d--) {
    const alpha = 0.55 + 0.4 * (1 - d / depth);
    ctx.fillStyle = `rgba(14, 5, 20, ${alpha.toFixed(2)})`;
    ctx.fillText(text, x + d * 1.15, y + d * 1.1);
  }
  ctx.strokeStyle = '#160c1b';
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.shadowColor = poster.titleGlow;
  ctx.shadowBlur = Math.min(sizePx * 0.22, canvasW * 0.035);
  ctx.strokeStyle = '#160c1b';
  ctx.lineWidth = outline * 0.55;
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
  const fill = ctx.createLinearGradient(0, y - sizePx * 0.55, 0, y + sizePx * 0.48);
  (poster.titleStops || ['#fff']).forEach((stop, index, all) => fill.addColorStop(index / Math.max(1, all.length - 1), stop));
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.strokeStyle = 'rgba(255,255,255,.62)';
  ctx.lineWidth = Math.max(1.2, sizePx * 0.012);
  ctx.strokeText(text, x, y - sizePx * 0.012);
}

function drawTitleBand(ctx, w, h, poster, placement, options = {}) {
  const top = h * TITLE_SAFE_TOP;
  const footerTop = h * (1 - FOOTER_HEIGHT);

  if (placement === 'over') {
    const scrim = ctx.createLinearGradient(0, top, 0, footerTop);
    scrim.addColorStop(0, 'rgba(8, 6, 14, 0)');
    scrim.addColorStop(0.24, 'rgba(8, 6, 14, .22)');
    scrim.addColorStop(0.58, 'rgba(8, 6, 14, .58)');
    scrim.addColorStop(1, 'rgba(8, 6, 14, .88)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, top, w, footerTop - top);
  } else {
    const bg = ctx.createLinearGradient(0, top, w, footerTop);
    poster.bandStops.forEach((color, index) => {
      bg.addColorStop(index / (poster.bandStops.length - 1), color);
    });
    ctx.fillStyle = bg;
    ctx.fillRect(0, top, w, footerTop - top);

    if (!options.minimal) {
      const sunX = w * 0.92;
      const sunY = top + (footerTop - top) * 0.56;
      const radius = h * 0.145;
      const sun = ctx.createRadialGradient(sunX, sunY, radius * 0.05, sunX, sunY, radius);
      sun.addColorStop(0, poster.sunColors[0]);
      sun.addColorStop(0.62, poster.sunColors[1]);
      sun.addColorStop(1, 'rgba(10, 12, 26, 0)');
      ctx.fillStyle = sun;
      ctx.fillRect(sunX - radius, sunY - radius, radius * 2, radius * 2);

      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius * 0.63, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = poster.sunColors[0];
      ctx.fillRect(sunX - radius, sunY - radius, radius * 2, radius * 0.7);
      ctx.fillStyle = poster.sunColors[1];
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(sunX - radius, sunY - radius * 0.04 + i * radius * 0.2, radius * 2, radius * 0.065);
      }
      ctx.restore();
    }
  }

  ctx.strokeStyle = poster.lineColor;
  ctx.lineWidth = Math.max(1, h * 0.0015);
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(w, top);
  ctx.stroke();
  ctx.strokeStyle = poster.lineColor.replace(/[\d.]+\)$/, '0.24)');
  ctx.beginPath();
  ctx.moveTo(0, footerTop);
  ctx.lineTo(w, footerTop);
  ctx.stroke();

  if (!options.minimal) drawPalmSilhouette(ctx, w * 0.975, footerTop - h * 0.012, h * 0.11, poster.accentColor);
}

function drawQuoteLine(ctx, value, x, y, w, h, accentColor) {
  const text = String(value || '').trim();
  if (!text) return;
  ctx.save();
  let size = Math.max(9, Math.round(h * 0.018));
  ctx.font = `600 ${size}px ${FONT_STACKS['Oswald']}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  while (ctx.measureText(text).width > w * 0.68 && size > 7) {
    size -= 1;
    ctx.font = `600 ${size}px ${FONT_STACKS['Oswald']}`;
  }
  ctx.fillStyle = '#fff0d9';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = Math.max(2, h * 0.003);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawFiveStarStrip(ctx, x, y, h, accentColor, glow) {
  ctx.save();
  ctx.font = `700 ${Math.round(h * 0.018)}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;
  ctx.shadowColor = glow;
  ctx.shadowBlur = h * 0.006;
  ctx.fillText('★  ★  ★  ★  ★', x, y);
  ctx.restore();
}

function drawStarburstBadge(ctx, text, cx, cy, radius, poster) {
  ctx.save();
  const rays = 12;
  ctx.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const angle = (i * Math.PI) / rays - Math.PI / 2;
    const r = i % 2 ? radius * 0.84 : radius;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = poster.bandStops[2];
  ctx.fill();
  ctx.strokeStyle = poster.accentColor;
  ctx.lineWidth = Math.max(1.5, radius * 0.045);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.67, 0, Math.PI * 2);
  ctx.strokeStyle = poster.lineColor;
  ctx.lineWidth = Math.max(1, radius * 0.025);
  ctx.stroke();

  let size = radius * 0.34;
  ctx.font = `700 ${Math.round(size)}px ${FONT_STACKS['Oswald']}`;
  while (ctx.measureText(text).width > radius * 1.08 && size > radius * 0.16) {
    size -= 1;
    ctx.font = `700 ${Math.round(size)}px ${FONT_STACKS['Oswald']}`;
  }
  ctx.fillStyle = '#fff5e3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function drawFooterStrip(ctx, poster, options = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const stripH = h * FOOTER_HEIGHT;
  const y = h - stripH;
  const band = ctx.createLinearGradient(0, y, w, h);
  poster.footerStops.forEach((color, index) => {
    band.addColorStop(index / (poster.footerStops.length - 1), color);
  });
  ctx.fillStyle = band;
  ctx.fillRect(0, y, w, stripH);

  if (!options.minimal) {
    drawPalmSilhouette(ctx, w * 0.035, h * 0.99, stripH * 0.92, poster.accentColor);
    drawMiniBarcode(ctx, w * 0.91, y + stripH * 0.14, w * 0.06, stripH * 0.66);
  }
}

function drawPalmSilhouette(ctx, x, baseY, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.055);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + size * 0.03, baseY - size * 0.38, x - size * 0.05, baseY - size * 0.77);
  ctx.stroke();

  const topX = x - size * 0.05;
  const topY = baseY - size * 0.77;
  for (let i = 0; i < 7; i++) {
    const spread = (i - 3) / 3;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + spread * size * 0.34, topY - size * 0.1, topX + spread * size * 0.72, topY + size * (0.12 + Math.abs(spread) * 0.12));
    ctx.stroke();
  }
  ctx.restore();
}

function drawMiniBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 239, 218, .92)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#241520';
  for (let i = 0; i < 27; i++) {
    const hash = ((i * 13 + 7) * 17) % 23;
    if (hash > 5) {
      const barW = w / 48 * (hash > 16 ? 1.7 : 0.85);
      ctx.fillRect(x + i * w / 29, y + 1, barW, h - 2);
    }
  }
  ctx.restore();
}

function drawPanelLabels(ctx, labels, w, h) {
  ctx.save();
  const size = Math.max(9, Math.round(Math.min(w, h) * 0.014));
  ctx.font = `600 ${size}px ${FONT_STACKS['Oswald']}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const label of labels) {
    if (!Number.isFinite(label.x) || !Number.isFinite(label.y) || label.y >= TITLE_SAFE_TOP) continue;
    const text = String(label.text || '').trim().toUpperCase();
    if (!text) continue;
    const x = Math.max(0, label.x * w);
    const y = Math.max(0, label.y * h);
    const pad = size * 0.45;
    const width = Math.min(ctx.measureText(text).width + pad * 2, w * 0.44);
    ctx.fillStyle = 'rgba(16, 13, 24, .76)';
    ctx.fillRect(x, y, width, size * 1.55);
    ctx.fillStyle = '#f9e3ca';
    ctx.fillText(text, x + pad, y + size * 0.23, width - pad * 2);
  }
  ctx.restore();
}

/** Loads every bundled poster font before an export or a thumbnail render. */
export async function loadAllFonts() {
  if (!('fonts' in document)) return;
  await Promise.all(FONTS.map(font => {
    const weight = font.cssWeight || 400;
    return document.fonts.load(`${weight} 64px "${font.family}"`).catch(() => null);
  }));
  await document.fonts.ready;
}

/** Renders the real title band of a template into a card canvas. */
export function drawTemplateThumbnail(canvas, typo, templateId) {
  const template = getTemplate(templateId);
  const virtual = document.createElement('canvas');
  virtual.width = 800;
  virtual.height = 600;
  const vctx = virtual.getContext('2d');
  const thumbTypo = {
    ...typo,
    template: template.id,
    layers: cloneLayers(template.layers),
    placement: 'below',
  };
  drawCoverTypography(vctx, thumbTypo, virtual.width, virtual.height, { placement: 'below', minimal: true });
  const geo = getBandGeometry(virtual.width, virtual.height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(virtual, 0, geo.bandTop, virtual.width, virtual.height - geo.bandTop, 0, 0, canvas.width, canvas.height);
}

export { BILLING_CREDIT };
