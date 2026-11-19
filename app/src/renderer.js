// Main Canvas Composition Pipeline for Neon Panel.
// Assembles panels, photos, color grading, vector decorations, and typography.

import { computePanelPixelRects } from './layouts.js';
import { applyColorGrade, COLOR_PRESETS } from './colorGrades.js';
import {
  drawSunsetSun,
  drawPalmSilhouettes,
  drawPerspectiveGrid,
  drawFilmGrain,
  drawVignette,
  drawLetterboxBars,
  drawPanelBorders,
  drawOuterFrame,
} from './decorations.js';
import { drawCoverTypography } from './typography.js';

/**
 * Main function to render cover art onto a canvas according to state.
 */
export function renderCoverArt(canvas, state, options = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 1. Dark base background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#1c0c2e');
  bgGrad.addColorStop(0.5, '#10061c');
  bgGrad.addColorStop(1, '#05020a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Compute panel layout rectangles
  const layoutId = state.layout || 'hero-strip';
  const borderWidth = Math.max(6, Math.round(Math.min(w, h) * 0.01));
  const panels = computePanelPixelRects(layoutId, w, h, borderWidth);

  // 3. Render each panel's photo & color grade
  const panelPhotos = state.panelPhotos || [];
  const globalPhoto = state.globalPhoto || null;
  const colorPreset = state.colorPreset || 'sunset';
  const colorIntensity = state.colorIntensity ?? 0.85;

  panels.forEach((panel, idx) => {
    const photoData = panelPhotos[idx] || (globalPhoto ? { image: globalPhoto, panX: 0, panY: 0, zoom: 1 } : null);
    renderPanel(ctx, panel, photoData, colorPreset, colorIntensity);
  });

  // 4. Panel dividing comic borders
  drawPanelBorders(ctx, panels, w, h, borderWidth);

  // 5. Vector decorations (customizable via state.decorations)
  const dec = state.decorations || {
    sun: true,
    palms: true,
    grid: true,
    grain: true,
    vignette: true,
    letterbox: false,
    frame: true,
  };

  if (dec.grid) {
    drawPerspectiveGrid(ctx, w, h, 0.28);
  }

  if (dec.sun) {
    // Elegant sun disk in upper sky of primary panel
    const sunRadius = Math.min(w, h) * 0.12;
    const sunX = layoutId === 'classic-6' ? w * 0.25 : w * 0.28;
    const sunY = h * 0.16;
    drawSunsetSun(ctx, sunX, sunY, sunRadius, 0.85);
  }

  if (dec.palms) {
    drawPalmSilhouettes(ctx, w, h, 0.95);
  }

  if (dec.vignette) {
    drawVignette(ctx, w, h, 0.52);
  }

  if (dec.letterbox) {
    drawLetterboxBars(ctx, w, h, 0.05);
  }

  if (dec.frame) {
    const frameW = Math.max(8, Math.round(Math.min(w, h) * 0.016));
    drawOuterFrame(ctx, w, h, frameW);
  }

  if (dec.grain) {
    drawFilmGrain(ctx, w, h, 0.1);
  }

  // 6. Typography overlay
  drawCoverTypography(ctx, state.typography || {}, w, h);

  // 7. Interactive selection highlight for active panel in editor only (never in export or shot=cover)
  if (options.highlightPanelIndex != null && panels[options.highlightPanelIndex]) {
    const hp = panels[options.highlightPanelIndex];
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(hp.x + 2, hp.y + 2, hp.width - 4, hp.height - 4);
    ctx.restore();
  }
}

/**
 * Draws an individual panel: photo with pan & zoom, or placeholder, then color grade.
 */
function renderPanel(ctx, panel, photoData, colorPreset, colorIntensity) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.width, panel.height);
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

    const preset = COLOR_PRESETS.find((p) => p.id === colorPreset) || COLOR_PRESETS[0];
    ctx.filter = preset.cssFilter || 'none';
    ctx.drawImage(img, destX, destY, drawW, drawH);
    ctx.filter = 'none';
  } else {
    // Stylized empty panel placeholder
    const phGrad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.width, panel.y + panel.height);
    phGrad.addColorStop(0, '#1c102a');
    phGrad.addColorStop(1, '#0e0717');
    ctx.fillStyle = phGrad;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);

    ctx.strokeStyle = 'rgba(255, 42, 133, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(panel.x + 8, panel.y + 8, panel.width - 16, panel.height - 16);

    ctx.font = '700 16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PANEL ${panel.id + 1}`, panel.x + panel.width * 0.5, panel.y + panel.height * 0.5);
  }

  // Apply color grade tint over this panel
  applyColorGrade(ctx, colorPreset, colorIntensity, panel.width, panel.height, panel.x, panel.y);

  ctx.restore();
}
