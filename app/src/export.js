// PNG export: make sure every face and the document's fonts are ready, render a fresh full-resolution poster
// without preview outlines, then hand the blob to a download link.

import { FONTS } from './typography.js';
import { renderPoster } from './renderer.js';

export async function ensureFonts() {
  const loads = FONTS.map((f) =>
    document.fonts.load(`${f.weight || 400} 72px "${f.family}"`).catch(() => null),
  );
  await Promise.all(loads);
  await document.fonts.ready;
}

export async function exportPoster(state, { library, width, height, filename }) {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderPoster(canvas, state, { library, forExport: true });
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The poster could not be encoded.'))), 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `neon-panel-${width}x${height}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return blob;
}
