// Export utilities for high-resolution PNG cover art downloads.

import { renderCoverArt } from './renderer.js';

export const EXPORT_PRESETS = [
  { id: 'square', name: 'Square Feed', width: 1080, height: 1080, aspectLabel: '1:1' },
  { id: 'portrait', name: 'Portrait Post', width: 1080, height: 1350, aspectLabel: '4:5' },
  { id: 'landscape', name: 'Landscape Banner', width: 1920, height: 1080, aspectLabel: '16:9' },
];

/**
 * Renders the state onto an offscreen canvas at target resolution and triggers a browser PNG download.
 */
export function exportCoverPng(state, targetWidth, targetHeight, filename = 'neon-panel-cover.png') {
  return new Promise((resolve, reject) => {
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = targetWidth;
      offscreen.height = targetHeight;

      // Render clean cover with no interactive highlights
      renderCoverArt(offscreen, state, { highlightPanelIndex: null });

      offscreen.toBlob((blob) => {
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
 * Generates an offscreen canvas rendered at target dimensions.
 */
export function renderToOffscreenCanvas(state, width, height) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  renderCoverArt(offscreen, state, { highlightPanelIndex: null });
  return offscreen;
}
