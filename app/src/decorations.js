// Vector decorations for Neon Panel v2.
// Key change from v1: sun and palms are NEVER drawn over photo panels.
// They appear only in the title band / footer area or behind lettering.
// Decorations: film grain, global vignette, panel gutters, outer frame with keyline.

/**
 * Draws panel gutters — thick off-white gutter with thin black keyline.
 * Uses the actual clip-path polygons for angled panels.
 */
export function drawPanelGutters(ctx, panels, canvasW, canvasH, gutterPx) {
  if (panels.length <= 1 || gutterPx <= 0) return;
  ctx.save();

  // Draw the gutter background (off-white)
  // We fill the entire canvas with gutter color, then each panel clips its photo over it
  // This function is called BEFORE panels to lay down the gutter, then panels draw on top.
  // Actually, the gutter is the gap between panels, so we draw it as the base.
  ctx.fillStyle = '#f0ece4'; // warm off-white
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Thin black keyline around each panel (drawn after panels in renderer)
  ctx.restore();
}

/**
 * Draws the black keyline around each panel border (after photos).
 */
export function drawPanelKeylines(ctx, panels, canvasW, canvasH, gutterPx) {
  if (panels.length <= 1) return;
  ctx.save();
  ctx.strokeStyle = '#1a1520';
  ctx.lineWidth = Math.max(1.5, gutterPx * 0.14);
  ctx.lineJoin = 'round';

  for (const panel of panels) {
    if (!panel.clipPath || panel.clipPath.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(panel.clipPath[0][0], panel.clipPath[0][1]);
    for (let i = 1; i < panel.clipPath.length; i++) {
      ctx.lineTo(panel.clipPath[i][0], panel.clipPath[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws outer poster border frame with corner accents.
 */
export function drawOuterFrame(ctx, canvasW, canvasH, frameWidth) {
  if (frameWidth <= 0) return;
  ctx.save();

  // Dark outer border
  ctx.strokeStyle = '#1a1520';
  ctx.lineWidth = frameWidth;
  ctx.strokeRect(frameWidth * 0.5, frameWidth * 0.5, canvasW - frameWidth, canvasH - frameWidth);

  // Inner gold hairline
  ctx.strokeStyle = 'rgba(255, 210, 60, 0.50)';
  ctx.lineWidth = 1.5;
  const inset = frameWidth + 2;
  ctx.strokeRect(inset, inset, canvasW - inset * 2, canvasH - inset * 2);

  ctx.restore();
}

/**
 * Procedural film grain overlay.
 */
let grainCache = null;
function getGrainPattern(ctx) {
  if (grainCache) return grainCache;
  const c = document.createElement('canvas');
  const sz = 128;
  c.width = sz; c.height = sz;
  const g = c.getContext('2d');
  const img = g.createImageData(sz, sz);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 24;
  }
  g.putImageData(img, 0, 0);
  grainCache = ctx.createPattern(c, 'repeat');
  return grainCache;
}

export function drawFilmGrain(ctx, canvasW, canvasH, intensity = 0.08) {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = getGrainPattern(ctx);
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();
}

/**
 * Cinematic vignette darkening corners.
 */
export function drawVignette(ctx, canvasW, canvasH, intensity = 0.42, tint = 'rgba(4, 2, 8, 0.80)') {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.globalCompositeOperation = 'multiply';
  const radius = Math.hypot(canvasW * 0.5, canvasH * 0.5);
  const vig = ctx.createRadialGradient(
    canvasW * 0.5, canvasH * 0.5, radius * 0.45,
    canvasW * 0.5, canvasH * 0.5, radius
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(0.65, tint.replace(/[\d.]+\)$/, '0.25)'));
  vig.addColorStop(1, tint);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();
}

/**
 * Subtle halftone / print texture.
 */
let halftoneCache = null;
function getHalftonePattern(ctx) {
  if (halftoneCache) return halftoneCache;
  const c = document.createElement('canvas');
  const sz = 6;
  c.width = sz; c.height = sz;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.04)';
  g.beginPath();
  g.arc(sz/2, sz/2, 1.2, 0, Math.PI * 2);
  g.fill();
  halftoneCache = ctx.createPattern(c, 'repeat');
  return halftoneCache;
}

export function drawHalftone(ctx, canvasW, canvasH, intensity = 0.3) {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = getHalftonePattern(ctx);
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();
}
