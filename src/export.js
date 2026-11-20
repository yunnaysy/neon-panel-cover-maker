// Export utilities for Neon Panel v2 — high-resolution PNG cover downloads.

import { renderCoverArt } from './renderer.js';

export const EXPORT_PRESETS = [
  { id: 'landscape', name: 'Landscape Banner', width: 1920, height: 1080, aspectLabel: '16:9' },
  { id: 'portrait', name: 'Portrait Post', width: 1080, height: 1350, aspectLabel: '4:5' },
  { id: 'square', name: 'Square Feed', width: 1080, height: 1080, aspectLabel: '1:1' },
];

/**
 * Renders state onto an offscreen canvas at target resolution and triggers PNG download.
 */
export async function exportCoverPng(state, targetWidth, targetHeight, filename = 'neon-panel-cover.png') {
  // Make sure every chosen poster font is ready before drawing the export.
  try {
    const { FONTS } = await import('./typography.js');
    await Promise.all(FONTS.map(f => document.fonts.load(`${f.style} 60px ${f.family}`)));
    await document.fonts.ready;
  } catch {}
  return new Promise((resolve, reject) => {
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = targetWidth;
      offscreen.height = targetHeight;

      // Temporarily override canvas dimensions in state
      const origW = state.canvasWidth;
      const origH = state.canvasHeight;
      state.canvasWidth = targetWidth;
      state.canvasHeight = targetHeight;

      renderCoverArt(offscreen, state, { highlightPanelIndex: null });

      state.canvasWidth = origW;
      state.canvasHeight = origH;

      offscreen.toBlob(blob => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve({ blob, width: targetWidth, height: targetHeight });
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates an offscreen canvas rendered at target dimensions (no download).
 */
export function renderToOffscreenCanvas(state, width, height) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;

  const origW = state.canvasWidth;
  const origH = state.canvasHeight;
  state.canvasWidth = width;
  state.canvasHeight = height;

  renderCoverArt(offscreen, state, { highlightPanelIndex: null });

  state.canvasWidth = origW;
  state.canvasHeight = origH;

  return offscreen;
}
