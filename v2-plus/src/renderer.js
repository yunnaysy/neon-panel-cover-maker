// Main Canvas Composition Pipeline for Neon Panel v2.
// Assembles: gutter base, panel photos with clip paths, color grading,
// panel keylines, outer frame, grain, vignette, halftone, typography.
// Never draws decorations (sun, palms) over photo subjects.

import { computePanelPixelRects, setPhotoArea } from './layouts.js';
import { applyColorGrade, getColorPreset } from './colorGrades.js';
import {
  drawPanelGutters,
  drawPanelKeylines,
  drawOuterFrame,
  drawFilmGrain,
  drawVignette,
  drawHalftone,
} from './decorations.js';
import { drawCoverTypography, TITLE_SAFE_TOP } from './typography.js';

/**
 * Main render function: draws complete cover art onto a canvas.
 */
// Offscreen cache of the graded photo layer, so typography edits never re-grade photos.
const photoLayerCache = new Map();
let imageIds = new WeakMap();
let nextImageId = 1;
function imageKey(img) {
  if (!img) return 0;
  if (!imageIds.has(img)) imageIds.set(img, nextImageId++);
  return imageIds.get(img);
}

function adjustmentFilter(adj) {
  if (!adj) return '';
  const parts = [];
  if (adj.exposure) parts.push(`brightness(${(1 + adj.exposure / 100).toFixed(3)})`);
  if (adj.contrast) parts.push(`contrast(${(1 + adj.contrast / 100).toFixed(3)})`);
  if (adj.saturation) parts.push(`saturate(${(1 + adj.saturation / 100).toFixed(3)})`);
  return parts.join(' ');
}

export function renderCoverArt(canvas, state, options = {}) {
  const w = canvas.width;
  const h = canvas.height;
  const typo = state.typography || {};
  setPhotoArea(typo.letteringMode === 'over' || typo.textPosition === 'top' ? 1 : TITLE_SAFE_TOP);
  const panelPhotosKey = (state.panelPhotos || []).map(p => p ? [imageKey(p.image), p.panX, p.panY, p.zoom] : null);
  const key = JSON.stringify([state.layout, w, h, state.colorPreset, state.colorIntensity, state.adjustments,
    state.panelGrades, panelPhotosKey, imageKey(state.globalPhoto), options.highlightPanelIndex, state.decorations, typo.letteringMode]);
  let layer = photoLayerCache.get(key);
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = w; layer.height = h;
    renderPhotoLayer(layer, state, options);
    if (photoLayerCache.size > 6) photoLayerCache.delete(photoLayerCache.keys().next().value);
    photoLayerCache.set(key, layer);
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(layer, 0, 0);
  // Separate pass: typography on top of the graded photos.
  return drawCoverTypography(ctx, { ...(state.typography || {}), colorPreset: state.colorPreset || 'golden-hour' }, w, h);
}

function renderPhotoLayer(canvas, state, options) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const layoutId = state.layout || 'key-art';
  const gutterPx = Math.max(6, Math.round(Math.min(w, h) * 0.016));
  const panels = computePanelPixelRects(layoutId, w, h, gutterPx);

  // 1. Gutter base layer: warm off-white fills the whole canvas
  if (panels.length > 1) {
    ctx.fillStyle = '#f4f4f6';
    ctx.fillRect(0, 0, w, h);
  } else {
    // Full bleed: dark base
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#1c0c2e');
    bg.addColorStop(1, '#05020a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Render each panel: clip, draw photo, color grade
  const panelPhotos = state.panelPhotos || [];
  const globalPhoto = state.globalPhoto || null;
  const colorPreset = state.colorPreset || 'golden-hour';
  const grade = getColorPreset(colorPreset);
  const colorIntensity = state.colorIntensity ?? 0.75;

  panels.forEach((panel, idx) => {
    const photoData = panelPhotos[idx] || (globalPhoto ? { image: globalPhoto, panX: 0, panY: 0, zoom: 1 } : null);
    const local = (state.panelGrades || [])[idx] || null;
    renderPanel(ctx, panel, photoData, colorPreset, colorIntensity, state.adjustments, local);
  });

  // 3. Panel keylines (thin black lines on panel edges)
  drawPanelKeylines(ctx, panels, w, h, gutterPx);

  // Keep the active-panel guide on the photos; the title band covers it below.
  if (options.highlightPanelIndex != null && panels[options.highlightPanelIndex]) {
    const hp = panels[options.highlightPanelIndex];
    ctx.save();
    ctx.strokeStyle = '#c9b6ff';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.0024));
    if (hp.clipPath && hp.clipPath.length > 2) {
      ctx.beginPath();
      ctx.moveTo(hp.clipPath[0][0], hp.clipPath[0][1]);
      for (let i = 1; i < hp.clipPath.length; i++) {
        ctx.lineTo(hp.clipPath[i][0], hp.clipPath[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(hp.x + 2, hp.y + 2, hp.width - 4, hp.height - 4);
    }
    ctx.restore();
  }

  // 4. Outer frame
  const frameW = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  drawOuterFrame(ctx, w, h, frameW);

  // 5. Global vignette
  if (state.decorations?.vignette !== false) {
    drawVignette(ctx, w, h, 0.38, grade.poster.vignetteColor);
  }

  // 6. Film grain
  if (state.decorations?.grain !== false) {
    drawFilmGrain(ctx, w, h, 0.08);
  }

  // 7. Halftone print texture
  if (state.decorations?.halftone !== false) {
    drawHalftone(ctx, w, h, 0.25);
  }

}

/**
 * Draws an individual panel: clips to its polygon, draws photo with pan & zoom,
 * then applies color grade.
 */
function renderPanel(ctx, panel, photoData, colorPreset, colorIntensity, adjustments, local) {
  ctx.save();

  // Clip to panel polygon
  ctx.beginPath();
  if (panel.clipPath && panel.clipPath.length > 2) {
    ctx.moveTo(panel.clipPath[0][0], panel.clipPath[0][1]);
    for (let i = 1; i < panel.clipPath.length; i++) {
      ctx.lineTo(panel.clipPath[i][0], panel.clipPath[i][1]);
    }
    ctx.closePath();
  } else {
    ctx.rect(panel.x, panel.y, panel.width, panel.height);
  }
  ctx.clip();

  if (photoData && photoData.image) {
    const img = photoData.image;
    const zoom = Math.max(0.5, Math.min(4.0, photoData.zoom || 1.0));
    const panX = photoData.panX || 0;
    const panY = photoData.panY || 0;

    const baseScale = Math.max(panel.width / img.naturalWidth, panel.height / img.naturalHeight);
    const finalScale = baseScale * zoom;
    const drawW = img.naturalWidth * finalScale;
    const drawH = img.naturalHeight * finalScale;

    const maxOffsetW = Math.max(0, drawW - panel.width);
    const maxOffsetH = Math.max(0, drawH - panel.height);
    const offsetX = (panel.width - drawW) * 0.5 + panX * (maxOffsetW * 0.5);
    const offsetY = (panel.height - drawH) * 0.5 + panY * (maxOffsetH * 0.5);

    const destX = panel.x + offsetX;
    const destY = panel.y + offsetY;

    // Apply CSS filter for the color preset
    // Global grade first (same base filter as v2, plus optional fine adjustments).
    const preset = getColorPreset(colorPreset);
    ctx.filter = `${preset.cssFilter || ''} ${adjustmentFilter(adjustments)}`.trim() || 'none';
    ctx.drawImage(img, destX, destY, drawW, drawH);
    ctx.filter = 'none';
    photoData._dest = [destX, destY, drawW, drawH];
  } else {
    // Stylized empty panel placeholder
    const phGrad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.width, panel.y + panel.height);
    phGrad.addColorStop(0, '#1c102a');
    phGrad.addColorStop(1, '#0e0717');
    ctx.fillStyle = phGrad;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);

    ctx.font = '700 14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PANEL ${panel.id + 1}`, panel.x + panel.width * 0.5, panel.y + panel.height * 0.5);
  }

  // Apply the poster (global) colour grade wash
  applyColorGrade(ctx, colorPreset, colorIntensity, panel.width, panel.height, panel.x, panel.y);

  // Local panel grade layered on top of the globally graded pixels: C = (1-a)*C_in + a*C_local
  if (local && photoData && photoData.image && local.intensity > 0.01) {
    const lp = getColorPreset(local.preset);
    const [dx, dy, dw, dh] = photoData._dest;
    const a = Math.max(0, Math.min(1, local.intensity));
    ctx.globalAlpha = a;
    ctx.filter = `${lp.cssFilter || ''} ${adjustmentFilter(local.adjustments)}`.trim() || 'none';
    ctx.drawImage(photoData.image, dx, dy, dw, dh);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    applyColorGrade(ctx, local.preset, a, panel.width, panel.height, panel.x, panel.y);
  }

  ctx.restore();
}
