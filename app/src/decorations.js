// Original vector decorations drawn on HTML5 Canvas:
// Vice City sunset sun, realistic silhouette coconut palms,
// glowing neon floor grid, film grain, vignette, letterbox bars, and comic panel borders.

/**
 * Draws a stylized 80s synthwave / Vice City segmented sunset sun.
 */
export function drawSunsetSun(ctx, cx, cy, radius, alpha = 0.85) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer ambient neon bloom
  const bloom = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.6);
  bloom.addColorStop(0, 'rgba(255, 230, 80, 0.45)');
  bloom.addColorStop(0.5, 'rgba(255, 42, 133, 0.25)');
  bloom.addColorStop(1, 'rgba(255, 0, 100, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Create sun clipping circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Sun vertical gradient: bright pale yellow to tropical magenta
  const sunGrad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  sunGrad.addColorStop(0.0, '#fffbe0');
  sunGrad.addColorStop(0.22, '#ffd13b');
  sunGrad.addColorStop(0.60, '#ff4071');
  sunGrad.addColorStop(1.0, '#9e0059');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Horizontal blind cutouts in lower 60% of the sun
  ctx.fillStyle = 'rgba(10, 4, 18, 0.95)';
  const numStripes = 6;
  const startY = cy - radius * 0.12;
  const heightSpan = radius * 1.08;

  for (let i = 0; i < numStripes; i++) {
    const t = i / (numStripes - 1);
    const y = startY + t * heightSpan;
    const slitH = Math.max(3, radius * 0.035 + t * radius * 0.07);
    ctx.fillRect(cx - radius, y, radius * 2, slitH);
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws a realistic silhouette palm tree with lush arching fronds.
 */
export function drawPalmTree(ctx, baseX, baseY, height, bendX = 0.35, flip = false) {
  ctx.save();
  const dir = flip ? -1 : 1;
  const topX = baseX + bendX * height * dir;
  const topY = baseY - height;
  const cpX = baseX + (bendX * 0.45) * height * dir;
  const cpY = baseY - height * 0.52;

  // 1. Tapered Trunk
  ctx.fillStyle = '#06020a';
  ctx.beginPath();
  ctx.moveTo(baseX - height * 0.045, baseY);
  ctx.quadraticCurveTo(cpX - height * 0.024, cpY, topX - height * 0.015, topY);
  ctx.lineTo(topX + height * 0.015, topY);
  ctx.quadraticCurveTo(cpX + height * 0.024, cpY, baseX + height * 0.045, baseY);
  ctx.closePath();
  ctx.fill();

  // Trunk rings
  ctx.strokeStyle = '#180a24';
  ctx.lineWidth = Math.max(1.5, height * 0.005);
  for (let s = 0.1; s < 0.92; s += 0.07) {
    const rx = (1 - s) * (1 - s) * baseX + 2 * (1 - s) * s * cpX + s * s * topX;
    const ry = (1 - s) * (1 - s) * baseY + 2 * (1 - s) * s * cpY + s * s * topY;
    const segW = height * 0.035 * (1 - s * 0.4);
    ctx.beginPath();
    ctx.ellipse(rx, ry, segW, segW * 0.3, dir * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Crown coconuts
  ctx.fillStyle = '#040108';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(topX + i * height * 0.018, topY + height * 0.015, height * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Dense lush canopy of arching fronds
  const fronds = [
    { rad: -2.85, len: 0.62, sag: 0.48, w: 0.065 },
    { rad: -2.55, len: 0.72, sag: 0.38, w: 0.075 },
    { rad: -2.25, len: 0.80, sag: 0.28, w: 0.082 },
    { rad: -1.95, len: 0.78, sag: 0.20, w: 0.080 },
    { rad: -1.68, len: 0.70, sag: 0.16, w: 0.075 },
    { rad: -1.40, len: 0.62, sag: 0.12, w: 0.070 },
    { rad: -1.15, len: 0.58, sag: 0.14, w: 0.065 },
    { rad: -0.85, len: 0.65, sag: 0.20, w: 0.072 },
    { rad: -0.55, len: 0.75, sag: 0.30, w: 0.080 },
    { rad: -0.25, len: 0.72, sag: 0.42, w: 0.075 },
    { rad: 0.05,  len: 0.60, sag: 0.52, w: 0.065 },
    { rad: 0.35,  len: 0.48, sag: 0.60, w: 0.055 },
  ];

  for (const f of fronds) {
    drawFrondBlade(ctx, topX, topY, height * f.len, f.rad, f.sag, height * f.w, dir);
  }

  ctx.restore();
}

/**
 * Draws an individual tapered, curved palm frond blade with natural smooth tapering.
 */
function drawFrondBlade(ctx, startX, startY, len, rad, sag, width, dir) {
  ctx.save();
  ctx.fillStyle = '#06020a';

  const endX = startX + Math.cos(rad) * len * dir;
  const endY = startY + Math.sin(rad) * len + sag * len;
  const midX = startX + (endX - startX) * 0.55;
  const midY = startY + Math.sin(rad) * len * 0.45 - len * 0.12;

  // Solid arched leaf blade with natural aerodynamic tapering
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(midX, midY - width * 0.5, endX, endY);
  ctx.quadraticCurveTo(midX, midY + width * 0.5, startX, startY);
  ctx.closePath();
  ctx.fill();

  // Subtle natural leafy notches along outer edge
  const numNotches = 8;
  for (let i = 2; i < numNotches; i++) {
    const t = i / numNotches;
    const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
    const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
    const tipW = Math.sin(t * Math.PI) * width * 0.25;

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - dir * tipW * 1.1, by + tipW * 0.8);
    ctx.lineTo(bx, by + 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws silhouette palm clusters framing the bottom left and right edges.
 * Heights are balanced to frame the footer typography cleanly without covering faces.
 */
export function drawPalmSilhouettes(ctx, canvasWidth, canvasHeight, alpha = 0.95) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Left corner palm cluster: stays in lower 40% of canvas
  const h1 = canvasHeight * 0.42;
  drawPalmTree(ctx, -canvasWidth * 0.02, canvasHeight * 1.02, h1, 0.32, false);

  const h2 = canvasHeight * 0.32;
  drawPalmTree(ctx, canvasWidth * 0.06, canvasHeight * 1.02, h2, 0.40, false);

  // Right corner palm cluster: stays in lower 40% of canvas
  const h3 = canvasHeight * 0.38;
  drawPalmTree(ctx, canvasWidth * 1.02, canvasHeight * 1.02, h3, 0.28, true);

  const h4 = canvasHeight * 0.28;
  drawPalmTree(ctx, canvasWidth * 0.94, canvasHeight * 1.02, h4, 0.36, true);

  ctx.restore();
}

/**
 * Draws a subtle synthwave perspective horizon grid at the lower footer ground.
 */
export function drawPerspectiveGrid(ctx, canvasWidth, canvasHeight, alpha = 0.3) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Confine grid to bottom 20% of canvas so it acts as a ground plane for title
  const horizonY = canvasHeight * 0.80;
  const bottomY = canvasHeight;
  const vpX = canvasWidth * 0.5;

  ctx.beginPath();
  ctx.rect(0, horizonY, canvasWidth, bottomY - horizonY);
  ctx.clip();

  // Perspective vertical rays converging at vanishing point
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = Math.max(1, canvasWidth * 0.0012);
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 6;

  const numRays = 18;
  for (let i = 0; i <= numRays; i++) {
    const bottomX = (i / numRays) * (canvasWidth * 1.8) - canvasWidth * 0.4;
    ctx.beginPath();
    ctx.moveTo(vpX, horizonY);
    ctx.lineTo(bottomX, bottomY);
    ctx.stroke();
  }

  // Logarithmic horizontal grid lines
  const numHoriz = 8;
  ctx.strokeStyle = '#ff2a85';
  ctx.shadowColor = '#ff2a85';
  ctx.shadowBlur = 5;

  for (let j = 1; j <= numHoriz; j++) {
    const t = Math.pow(j / numHoriz, 2.2);
    const y = horizonY + t * (bottomY - horizonY);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Procedural film grain pattern.
 */
let grainPatternCache = null;
function getGrainPattern(ctx) {
  if (grainPatternCache) return grainPatternCache;
  const pCanvas = document.createElement('canvas');
  const size = 128;
  pCanvas.width = size;
  pCanvas.height = size;
  const pCtx = pCanvas.getContext('2d');
  const imgData = pCtx.createImageData(size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 28;
  }
  pCtx.putImageData(imgData, 0, 0);
  grainPatternCache = ctx.createPattern(pCanvas, 'repeat');
  return grainPatternCache;
}

export function drawFilmGrain(ctx, canvasWidth, canvasHeight, intensity = 0.08) {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = getGrainPattern(ctx);
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Cinematic vignette darkening corners.
 */
export function drawVignette(ctx, canvasWidth, canvasHeight, intensity = 0.48) {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.globalCompositeOperation = 'multiply';

  const radius = Math.hypot(canvasWidth * 0.5, canvasHeight * 0.5);
  const vig = ctx.createRadialGradient(
    canvasWidth * 0.5,
    canvasHeight * 0.5,
    radius * 0.48,
    canvasWidth * 0.5,
    canvasHeight * 0.5,
    radius
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(0.7, 'rgba(10, 5, 18, 0.35)');
  vig.addColorStop(1, 'rgba(3, 1, 6, 0.90)');

  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Cinematic letterbox bars at top and bottom.
 */
export function drawLetterboxBars(ctx, canvasWidth, canvasHeight, barRatio = 0.05) {
  if (barRatio <= 0.005) return;
  ctx.save();
  const barH = canvasHeight * barRatio;
  ctx.fillStyle = '#06020a';

  ctx.fillRect(0, 0, canvasWidth, barH);
  ctx.fillRect(0, canvasHeight - barH, canvasWidth, barH);

  ctx.strokeStyle = 'rgba(255, 180, 0, 0.45)';
  ctx.lineWidth = Math.max(1, canvasHeight * 0.002);
  ctx.beginPath();
  ctx.moveTo(0, barH);
  ctx.lineTo(canvasWidth, barH);
  ctx.moveTo(0, canvasHeight - barH);
  ctx.lineTo(canvasWidth, canvasHeight - barH);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws bold dark panel borders with subtle neon pinstripe seam.
 */
export function drawPanelBorders(ctx, panels, canvasWidth, canvasHeight, borderWidth = 8) {
  if (panels.length <= 1 || borderWidth <= 0) return;
  ctx.save();

  // Dark comic borders
  ctx.strokeStyle = '#08030e';
  ctx.lineWidth = borderWidth;
  ctx.lineJoin = 'miter';

  for (const panel of panels) {
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
  }

  // Inner neon pinstripe seam
  const pinstripeWidth = Math.max(1, borderWidth * 0.16);
  ctx.strokeStyle = 'rgba(255, 42, 133, 0.45)';
  ctx.lineWidth = pinstripeWidth;
  for (const panel of panels) {
    const inset = borderWidth * 0.5;
    ctx.strokeRect(panel.x + inset, panel.y + inset, panel.width - borderWidth, panel.height - borderWidth);
  }

  ctx.restore();
}

/**
 * Draws outer poster border frame.
 */
export function drawOuterFrame(ctx, canvasWidth, canvasHeight, frameWidth = 14) {
  if (frameWidth <= 0) return;
  ctx.save();

  // Outer border
  ctx.strokeStyle = '#08030e';
  ctx.lineWidth = frameWidth;
  ctx.strokeRect(frameWidth * 0.5, frameWidth * 0.5, canvasWidth - frameWidth, canvasHeight - frameWidth);

  // Inner gold hairline
  ctx.strokeStyle = 'rgba(255, 215, 64, 0.6)';
  ctx.lineWidth = 2;
  const innerInset = frameWidth + 3;
  ctx.strokeRect(
    innerInset,
    innerInset,
    canvasWidth - innerInset * 2,
    canvasHeight - innerInset * 2
  );

  // Corner neon accents
  const cornerLen = Math.min(canvasWidth, canvasHeight) * 0.035;
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.5;

  const corners = [
    [innerInset, innerInset, 1, 1],
    [canvasWidth - innerInset, innerInset, -1, 1],
    [innerInset, canvasHeight - innerInset, 1, -1],
    [canvasWidth - innerInset, canvasHeight - innerInset, -1, -1],
  ];

  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * cornerLen);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * cornerLen, cy);
    ctx.stroke();
  }

  ctx.restore();
}
