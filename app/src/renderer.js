// Canvas composition pipeline for Neon Panel.
// The graded photo collage is rendered once into an offscreen canvas keyed by
// the photo state. Lettering is painted on top on every frame, so typing never
// re-grades any photo.

import { computePanelPixelRects } from './layouts.js';
import { applyColorGrade, getColorPreset } from './colorGrades.js';
import {
  drawPanelKeylines,
  drawOuterFrame,
  drawFilmGrain,
  drawVignette,
  drawHalftone,
} from './decorations.js';
import { drawCoverTypography, getTypographyLayout, TITLE_SAFE_TOP } from './typography.js';

export function getPhotoAreaHeight(placement) {
  return placement === 'below' ? TITLE_SAFE_TOP : 1;
}

export function computePanelsForState(state, w, h) {
  const gutterPx = Math.max(6, Math.round(Math.min(w, h) * 0.016));
  const photoHeight = getPhotoAreaHeight(state.letteringPlacement || 'below');
  return computePanelPixelRects(state.layout || 'key-art', w, h, gutterPx, { photoHeight });
}

const photoCache = { key: null, canvas: null };

function photoCacheKey(state, w, h) {
  const photoData = (state.panelPhotos || []).map(panel => panel ? [
    panel.gradePreset || null,
    panel.gradeIntensity ?? null,
    panel.panX,
    panel.panY,
    panel.zoom,
  ] : null);
  return JSON.stringify({
    v: state.photoVersion || 0,
    w,
    h,
    layout: state.layout,
    placement: state.letteringPlacement || 'below',
    preset: state.colorPreset,
    intensity: state.colorIntensity,
    decorations: state.decorations,
    photoData,
  });
}

export function renderCoverArt(canvas, state, options = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const panels = computePanelsForState(state, w, h);

  const key = photoCacheKey(state, w, h);
  if (photoCache.key !== key || !photoCache.canvas || photoCache.canvas.width !== w || photoCache.canvas.height !== h) {
    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = h;
    drawPhotoLayer(layer.getContext('2d'), state, w, h, panels);
    photoCache.canvas = layer;
    photoCache.key = key;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(photoCache.canvas, 0, 0, w, h);

  drawCoverTypography(ctx, {
    ...(state.typography || {}),
    colorPreset: state.colorPreset,
    placement: state.letteringPlacement,
  }, w, h, { placement: state.letteringPlacement || 'below' });

  if (options.preview) drawPreviewOverlays(ctx, state, w, h, panels, options);
}

function drawPhotoLayer(ctx, state, w, h, panels) {
  const gutterPx = Math.max(6, Math.round(Math.min(w, h) * 0.016));
  const colorPreset = state.colorPreset || 'golden-hour';
  const globalIntensity = state.colorIntensity ?? 0.75;
  const panelPhotos = state.panelPhotos || [];
  const globalPhoto = state.globalPhoto || null;

  if (panels.length > 1) {
    ctx.fillStyle = '#f4f4f6';
    ctx.fillRect(0, 0, w, h);
  } else {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#1c0c2e');
    bg.addColorStop(1, '#05020a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  panels.forEach((panel, idx) => {
    const photoData = panelPhotos[idx] || (globalPhoto ? { image: globalPhoto, panX: 0, panY: 0, zoom: 1 } : null);
    renderPanel(ctx, panel, photoData, colorPreset, globalIntensity);
  });

  drawPanelKeylines(ctx, panels, w, h, gutterPx);

  const frameW = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  drawOuterFrame(ctx, w, h, frameW);

  const grade = getColorPreset(colorPreset);
  if (state.decorations?.vignette !== false) drawVignette(ctx, w, h, 0.38, grade.poster.vignetteColor);
  if (state.decorations?.grain !== false) drawFilmGrain(ctx, w, h, 0.08);
  if (state.decorations?.halftone !== false) drawHalftone(ctx, w, h, 0.25);
}

function renderPanel(ctx, panel, photoData, colorPreset, colorIntensity) {
  ctx.save();

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

    const preset = getColorPreset(colorPreset);
    ctx.filter = preset.cssFilter || 'none';
    ctx.drawImage(img, panel.x + offsetX, panel.y + offsetY, drawW, drawH);
    ctx.filter = 'none';
  } else {
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

  // Global grade first, then the optional local panel look on top.
  applyColorGrade(ctx, colorPreset, colorIntensity, panel.width, panel.height, panel.x, panel.y);
  if (photoData?.gradePreset) {
    const localIntensity = Number.isFinite(photoData.gradeIntensity) ? photoData.gradeIntensity : colorIntensity;
    applyColorGrade(ctx, photoData.gradePreset, localIntensity, panel.width, panel.height, panel.x, panel.y);
  }

  ctx.restore();
}

function drawPreviewOverlays(ctx, state, w, h, panels, options = {}) {
  const active = state.activePanelIndex;
  const panelMode = state.gradeScope === 'panel';

  if (options.showPanelGuide !== false && panelMode && active != null && active >= 0 && panels[active]) {
    const panel = panels[active];
    ctx.save();
    ctx.strokeStyle = '#66e4eb';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.003));
    ctx.setLineDash([Math.max(7, w * 0.006), Math.max(4, w * 0.004)]);
    if (panel.clipPath && panel.clipPath.length > 2) {
      ctx.beginPath();
      ctx.moveTo(panel.clipPath[0][0], panel.clipPath[0][1]);
      for (let i = 1; i < panel.clipPath.length; i++) ctx.lineTo(panel.clipPath[i][0], panel.clipPath[i][1]);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(panel.x + 2, panel.y + 2, panel.width - 4, panel.height - 4);
    }
    ctx.restore();
  }

  if (panelMode && active != null && active >= 0) {
    const panel = panels[active];
    if (panel) {
      const size = Math.max(12, Math.round(Math.min(w, h) * 0.017));
      const label = `PANEL ${String(active + 1).padStart(2, '0')}`;
      ctx.save();
      ctx.font = `700 ${size}px "Oswald", sans-serif`;
      const pad = size * 0.55;
      const tw = ctx.measureText(label).width + pad * 2;
      const x = Math.min(w - tw - 4, panel.x + size * 0.6);
      const y = Math.max(4, panel.y + size * 0.6);
      ctx.fillStyle = 'rgba(16, 13, 24, .82)';
      ctx.fillRect(x, y, tw, size * 1.9);
      ctx.strokeStyle = 'rgba(188, 174, 255, .8)';
      ctx.lineWidth = Math.max(1, size * 0.08);
      ctx.strokeRect(x, y, tw, size * 1.9);
      ctx.fillStyle = '#dcd2ff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + pad, y + size * 0.98);
      ctx.restore();
    }
  }

  if (options.showLetteringGuides) {
    const layout = getTypographyLayout(state.typography, w, h, ctx);
    const selected = state.typography?.selectedLayer || 'title';
    const box = layout.layers[selected]?.box;
    if (box) {
      ctx.save();
      ctx.strokeStyle = '#bcaeff';
      ctx.lineWidth = Math.max(1, w * 0.0018);
      ctx.setLineDash([Math.max(5, w * 0.005), Math.max(4, w * 0.0035)]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      const hs = Math.max(9, w * 0.008);
      ctx.setLineDash([]);
      ctx.fillStyle = '#bcaeff';
      ctx.fillRect(box.x + box.width - hs / 2, box.y + box.height - hs / 2, hs, hs);
      ctx.restore();
    }
  }

  if (state._snapGuide && options.showLetteringGuides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(188, 174, 255, .8)';
    ctx.lineWidth = Math.max(1, w * 0.0015);
    ctx.setLineDash([Math.max(6, w * 0.006), Math.max(4, w * 0.004)]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.restore();
  }
}
