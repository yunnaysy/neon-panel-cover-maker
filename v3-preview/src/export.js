import { ensurePosterFonts, renderCoverArt } from './renderer.js';

export async function exportCoverPng(state, width, height, filename = 'neon-panel-cover.png') {
  await ensurePosterFonts();
  const canvas = renderToOffscreenCanvas(state, width, height);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => {
      if (result) resolve(result);
      else reject(new Error('The browser could not encode this poster as PNG.'));
    }, 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { blob, width, height };
}

export function renderToOffscreenCanvas(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderCoverArt(canvas, state);
  return canvas;
}
