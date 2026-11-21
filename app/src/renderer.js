// The poster renderer. Photos and grades are cached in an offscreen layer keyed by the photo/layout/grade state;
// the band, ornaments and lettering are painted over it on every frame, so typing never re-grades a photograph.

import { buildPanels, polygonBounds, pointInPolygon } from './layouts.js';
import { applyGrade } from './colorGrades.js';
import { drawBand, drawDecor, drawCredit } from './decorations.js';
import { drawLettering } from './typography.js';

const layerCache = new Map();
const CACHE_LIMIT = 3;

export const rendererState = {
  panelsPx: [],
  boxes: {},
  handle: null,
  tooWide: false,
  geom: null,
  canvas: null,
};

function clipPolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.clip();
}

function drawCover(ctx, img, bounds, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = Math.max(1, panel.zoom || 1);
  const scale = Math.max(bounds.w / iw, bounds.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const cx = bounds.x + bounds.w / 2 + (panel.ox || 0) * bounds.w;
  const cy = bounds.y + bounds.h / 2 + (panel.oy || 0) * bounds.h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

function signature(W, H, state, library) {
  return JSON.stringify({
    W,
    H,
    layout: state.layout,
    placement: state.lettering.placement,
    preset: state.preset,
    intensity: state.intensity,
    scope: state.gradeScope,
    selected: state.gradeScope === 'panel' ? state.selectedPanel : -1,
    panels: state.panels.map((p) => [p.photoId, p.zoom, p.ox, p.oy, p.local]),
    v: library?.version || 0,
  });
}

function buildPhotoLayer(W, H, panelsPx, state, library) {
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#100d18';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < panelsPx.length; i++) {
    const poly = panelsPx[i];
    const panel = state.panels[i];
    if (!panel) continue;
    const entry = library?.get(panel.photoId);
    const img = entry?.image;
    const bounds = polygonBounds(poly);
    ctx.save();
    clipPolygon(ctx, poly);
    if (img && (img.naturalWidth || img.width)) {
      drawCover(ctx, img, bounds, panel);
    } else {
      ctx.fillStyle = '#241d31';
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.fillStyle = 'rgba(157,149,166,0.35)';
      ctx.font = `${Math.max(10, bounds.h * 0.04)}px "Oswald", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('PHOTO', bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
    }
    ctx.restore();
  }

  if (state.intensity > 0) applyGrade(ctx, W, H, state.preset, state.intensity);

  if (state.gradeScope === 'panel') {
    const panel = state.panels[state.selectedPanel];
    const poly = panelsPx[state.selectedPanel];
    if (panel && panel.local && poly && panel.local.intensity > 0) {
      const temp = document.createElement('canvas');
      temp.width = W;
      temp.height = H;
      const tc = temp.getContext('2d');
      tc.drawImage(off, 0, 0);
      applyGrade(tc, W, H, panel.local.preset, 1);
      ctx.save();
      clipPolygon(ctx, poly);
      ctx.globalAlpha = panel.local.intensity;
      ctx.drawImage(temp, 0, 0);
      ctx.restore();
    }
  }
  return off;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPanelSelection(ctx, state, panelsPx, geom) {
  const poly = panelsPx[state.selectedPanel];
  if (!poly) return;
  const { u, bandTop, H } = geom;
  ctx.save();
  ctx.setLineDash([7 * u, 4 * u]);
  ctx.lineWidth = Math.max(1, 1.6 * u);
  ctx.strokeStyle = '#c9b6ff';
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  const label = `PANEL ${String(state.selectedPanel + 1).padStart(2, '0')}`;
  const size = Math.max(8, 9.5 * u);
  ctx.font = `700 ${size}px "Oswald", "Arial Narrow", sans-serif`;
  ctx.letterSpacing = `${1.4 * u}px`;
  const tw = ctx.measureText(label).width;
  const bx = Math.max(4 * u, poly[0].x + 6 * u);
  const by = Math.max(4 * u, poly[0].y + 6 * u);
  const padX = 6 * u;
  const bh = size * 1.7;
  ctx.fillStyle = 'rgba(16,13,24,0.82)';
  roundRect(ctx, bx, by, tw + padX * 2, bh, bh / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201,182,255,0.7)';
  ctx.lineWidth = Math.max(1, u);
  ctx.stroke();
  ctx.fillStyle = '#e7ddff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + padX, by + bh / 2 + size * 0.05);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

export function renderPoster(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  if (!W || !H) return;
  const u = Math.sqrt(W * H) / 1000;
  const bandH = H * 0.36;
  const bandTop = H - bandH;
  const below = state.lettering.placement !== 'over';
  const photoH = below ? bandTop : H;
  const gx = (6 * u) / W;
  const gy = (6 * u) / Math.max(1, photoH);
  const panels = buildPanels(state.layout, gx, gy);
  const panelsPx = panels.map((poly) => poly.map((p) => ({ x: p.x * W, y: p.y * photoH })));

  const key = signature(W, H, state, opts.library);
  let layer = layerCache.get(key);
  if (!layer) {
    layer = buildPhotoLayer(W, H, panelsPx, state, opts.library);
    layerCache.set(key, layer);
    while (layerCache.size > CACHE_LIMIT) layerCache.delete(layerCache.keys().next().value);
  }

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#100d18';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(layer, 0, 0);

  const geom = { W, H, u, bandTop, bandH, below };
  drawBand(ctx, state, geom);
  drawDecor(ctx, state, geom);

  if (!opts.forExport && state.gradeScope === 'panel') {
    drawPanelSelection(ctx, state, panelsPx, geom);
  }

  const result = drawLettering(ctx, state, geom, {
    forExport: !!opts.forExport,
    activeLayer: opts.activeLayer || null,
    snapX: !!opts.snapX,
  });
  drawCredit(ctx, state, geom, result.boxes.billing);

  rendererState.panelsPx = panelsPx;
  rendererState.boxes = result.boxes;
  rendererState.handle = result.handle;
  rendererState.tooWide = result.tooWide;
  rendererState.geom = geom;
  rendererState.canvas = canvas;
}

export function panelIndexAt(x, y) {
  for (let i = rendererState.panelsPx.length - 1; i >= 0; i--) {
    if (pointInPolygon(x, y, rendererState.panelsPx[i])) return i;
  }
  return -1;
}

export function layerBoxAt(x, y) {
  const boxes = rendererState.boxes;
  const pad = (rendererState.geom?.u || 1) * 4;
  for (const key of ['title', 'subtitle', 'billing']) {
    const b = boxes[key];
    if (!b) continue;
    if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return key;
  }
  return null;
}

export function handleAt(x, y) {
  const h = rendererState.handle;
  if (!h) return false;
  return Math.hypot(x - h.x, y - h.y) <= h.size / 2 + 2;
}
