import { getColorPreset } from './colorGrades.js';

// Original poster lettering and title-band ornaments for Neon Panel v2.

export const TITLE_COLOR_THEMES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    badge: 'SUNSET',
    stops: [
      { pos: 0, color: '#fff3d4' },
      { pos: 0.34, color: '#ffc05c' },
      { pos: 0.68, color: '#ff704c' },
      { pos: 1, color: '#ef3982' },
    ],
    outline: '#160c1b',
    glow: 'rgba(255, 104, 87, .82)',
    subtitleColor: '#ff6fba',
  },
];

const DISPLAY_FONT_STACK = '"Bebas Neue", Impact, "Arial Black", sans-serif';
const SCRIPT_FONT_STACK = '"Kaushan Script", "Pacifico", cursive';
const CONDENSED_FONT_STACK = '"Oswald", "Bebas Neue", Impact, sans-serif';
const SANS_STACK = 'Arial, Helvetica, sans-serif';
const TITLE_SAFE_TOP = 0.635;
const FOOTER_HEIGHT = 0.065;

export function drawCoverTypography(ctx, typo, canvasW, canvasH) {
  const {
    mainTitle = 'VICE LIGHTS',
    subtitle = 'Ocean Drive',
    tagline = 'ONE COAST · NO RULES · COMING SOON',
    quoteLine = '★★★★★  “AN INSTANT CLASSIC”',
    titleTheme = 'vice-sunset',
    textPosition = 'bottom',
    panelLabels = [],
    badgeText = 'ORIGINAL',
  } = typo;
  const theme = TITLE_COLOR_THEMES.find(item => item.id === titleTheme) || TITLE_COLOR_THEMES[0];
  const poster = getColorPreset(typo.colorPreset).poster;
  const gradeTheme = {
    ...theme,
    stops: poster.titleStops,
    glow: poster.titleGlow,
    subtitleColor: poster.subtitleColor,
  };
  const title = String(mainTitle || '').trim().toUpperCase();
  const isTop = textPosition === 'top';

  ctx.save();
  drawTitleBand(ctx, canvasW, canvasH, poster);

  const bandTop = isTop ? canvasH * 0.035 : canvasH * TITLE_SAFE_TOP;
  const footerTop = canvasH * (1 - FOOTER_HEIGHT);
  const bandH = footerTop - bandTop;
  const quoteY = bandTop + bandH * 0.14;
  const titleY = bandTop + bandH * 0.56;
  const subtitleY = bandTop + bandH * 0.91;

  drawQuoteLine(ctx, quoteLine, canvasW * 0.055, quoteY, canvasW, canvasH, poster.accentColor);
  drawFiveStarStrip(ctx, canvasW * 0.84, quoteY, canvasH, poster.accentColor, poster.titleGlow);

  if (title) {
    const titleSize = fitTitle(ctx, title, canvasW, canvasH);
    drawMainTitle(ctx, title, canvasW * 0.055, titleY, titleSize, gradeTheme, canvasW);
  }

  if (subtitle && subtitle.trim()) {
    drawScriptSubtitle(ctx, subtitle.trim(), canvasW * 0.06, subtitleY, canvasW, canvasH, gradeTheme);
  }

  if (badgeText && badgeText.trim()) {
    const sealRadius = Math.min(canvasH * 0.055, canvasW * 0.065);
    drawStarburstBadge(ctx, badgeText.trim().toUpperCase(), canvasW * 0.92, bandTop + bandH * 0.57, sealRadius, poster);
  }

  if (Array.isArray(panelLabels) && panelLabels.length) {
    drawPanelLabels(ctx, panelLabels, canvasW, canvasH);
  }

  drawFooterStrip(ctx, String(tagline || '').trim().toUpperCase(), canvasW, canvasH, poster);
  ctx.restore();
}

export function getTitleSafeZone(canvasH) {
  return { top: canvasH * TITLE_SAFE_TOP, bottom: canvasH };
}

function drawTitleBand(ctx, w, h, poster) {
  const top = h * TITLE_SAFE_TOP;
  const footerTop = h * (1 - FOOTER_HEIGHT);
  const bg = ctx.createLinearGradient(0, top, w, footerTop);
  poster.bandStops.forEach((color, index) => {
    bg.addColorStop(index / (poster.bandStops.length - 1), color);
  });
  ctx.fillStyle = bg;
  ctx.fillRect(0, top, w, footerTop - top);

  const sunX = w * 0.92;
  const sunY = top + (footerTop - top) * 0.56;
  const radius = h * 0.145;
  const sun = ctx.createRadialGradient(sunX, sunY, radius * 0.05, sunX, sunY, radius);
  sun.addColorStop(0, poster.sunColors[0]);
  sun.addColorStop(0.62, poster.sunColors[1]);
  sun.addColorStop(1, 'rgba(10, 12, 26, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - radius, sunY - radius, radius * 2, radius * 2);

  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, radius * 0.63, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = poster.sunColors[0];
  ctx.fillRect(sunX - radius, sunY - radius, radius * 2, radius * 0.7);
  ctx.fillStyle = poster.sunColors[1];
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(sunX - radius, sunY - radius * 0.04 + i * radius * 0.2, radius * 2, radius * 0.065);
  }
  ctx.restore();

  ctx.strokeStyle = poster.lineColor;
  ctx.lineWidth = Math.max(1, h * 0.0015);
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(w, top);
  ctx.stroke();
  ctx.strokeStyle = poster.lineColor.replace(/[\d.]+\)$/, '0.24)');
  ctx.beginPath();
  ctx.moveTo(0, footerTop);
  ctx.lineTo(w, footerTop);
  ctx.stroke();

  drawPalmSilhouette(ctx, w * 0.975, footerTop - h * 0.012, h * 0.11, poster.accentColor);
}

function fitTitle(ctx, text, w, h) {
  const maxWidth = w * 0.765;
  let size = h * 0.22;
  while (size > 1) {
    ctx.font = `italic 900 ${Math.round(size)}px ${DISPLAY_FONT_STACK}`;
    const textWidth = ctx.measureText(text).width;
    if (textWidth <= maxWidth) break;
    size = Math.max(1, size * maxWidth / textWidth * 0.995);
  }
  return Math.round(size);
}

function drawMainTitle(ctx, text, x, y, fontSize, theme, canvasW) {
  ctx.save();
  ctx.font = `italic 900 ${fontSize}px ${DISPLAY_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const depth = Math.max(7, Math.round(fontSize * 0.09));
  for (let d = depth; d > 0; d--) {
    const alpha = 0.55 + 0.4 * (1 - d / depth);
    ctx.fillStyle = `rgba(14, 5, 20, ${alpha.toFixed(2)})`;
    ctx.fillText(text, x + d * 1.15, y + d * 1.1);
  }

  const outline = Math.max(5, fontSize * 0.085);
  ctx.strokeStyle = theme.outline;
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);

  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = Math.min(fontSize * 0.22, canvasW * 0.035);
  ctx.strokeStyle = theme.outline;
  ctx.lineWidth = outline * 0.55;
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;

  const fill = ctx.createLinearGradient(0, y - fontSize * 0.55, 0, y + fontSize * 0.48);
  theme.stops.forEach((color, index) => {
    fill.addColorStop(index / (theme.stops.length - 1), color);
  });
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);

  ctx.strokeStyle = 'rgba(255,255,255,.62)';
  ctx.lineWidth = Math.max(1.2, fontSize * 0.012);
  ctx.strokeText(text, x, y - fontSize * 0.012);
  ctx.restore();
}

function drawScriptSubtitle(ctx, text, x, y, w, h, theme) {
  ctx.save();
  let size = Math.round(h * 0.061);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${size}px ${SCRIPT_FONT_STACK}`;
  const maxWidth = w * 0.72;
  while (ctx.measureText(text).width > maxWidth && size > 6) {
    size -= 1;
    ctx.font = `400 ${size}px ${SCRIPT_FONT_STACK}`;
  }

  ctx.lineWidth = Math.max(2, size * 0.075);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(24, 9, 26, .9)';
  ctx.strokeText(text, x, y, maxWidth);
  ctx.shadowColor = theme.subtitleColor;
  ctx.shadowBlur = size * 0.65;
  ctx.fillStyle = theme.subtitleColor;
  ctx.fillText(text, x, y, maxWidth);
  ctx.shadowBlur = size * 0.3;
  ctx.fillStyle = '#fff2f5';
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

function drawQuoteLine(ctx, value, x, y, w, h, accentColor) {
  const text = String(value || '').trim();
  if (!text) return;
  ctx.save();
  let size = Math.max(9, Math.round(h * 0.018));
  ctx.font = `600 ${size}px ${CONDENSED_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  while (ctx.measureText(text).width > w * 0.68 && size > 7) {
    size -= 1;
    ctx.font = `600 ${size}px ${CONDENSED_FONT_STACK}`;
  }
  ctx.fillStyle = '#fff0d9';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = Math.max(2, h * 0.003);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawFiveStarStrip(ctx, x, y, h, accentColor, glow) {
  ctx.save();
  ctx.font = `700 ${Math.round(h * 0.018)}px ${SANS_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;
  ctx.shadowColor = glow;
  ctx.shadowBlur = h * 0.006;
  ctx.fillText('★  ★  ★  ★  ★', x, y);
  ctx.restore();
}

function drawStarburstBadge(ctx, text, cx, cy, radius, poster) {
  ctx.save();
  const rays = 12;
  ctx.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const angle = (i * Math.PI) / rays - Math.PI / 2;
    const r = i % 2 ? radius * 0.84 : radius;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = poster.bandStops[2];
  ctx.fill();
  ctx.strokeStyle = poster.accentColor;
  ctx.lineWidth = Math.max(1.5, radius * 0.045);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.67, 0, Math.PI * 2);
  ctx.strokeStyle = poster.lineColor;
  ctx.lineWidth = Math.max(1, radius * 0.025);
  ctx.stroke();

  let size = radius * 0.34;
  ctx.font = `700 ${Math.round(size)}px ${CONDENSED_FONT_STACK}`;
  while (ctx.measureText(text).width > radius * 1.08 && size > radius * 0.16) {
    size -= 1;
    ctx.font = `700 ${Math.round(size)}px ${CONDENSED_FONT_STACK}`;
  }
  ctx.fillStyle = '#fff5e3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function drawFooterStrip(ctx, tagline, w, h, poster) {
  const stripH = h * FOOTER_HEIGHT;
  const y = h - stripH;
  const band = ctx.createLinearGradient(0, y, w, h);
  poster.footerStops.forEach((color, index) => {
    band.addColorStop(index / (poster.footerStops.length - 1), color);
  });
  ctx.fillStyle = band;
  ctx.fillRect(0, y, w, stripH);

  drawPalmSilhouette(ctx, w * 0.035, h * 0.99, stripH * 0.92, poster.accentColor);

  const text = tagline.split('').join('\u2009');
  let size = Math.max(8, Math.round(stripH * 0.37));
  ctx.font = `600 ${size}px ${CONDENSED_FONT_STACK}`;
  while (ctx.measureText(text).width > w * 0.68 && size > 7) {
    size -= 1;
    ctx.font = `600 ${size}px ${CONDENSED_FONT_STACK}`;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff0d6';
  ctx.fillText(text, w * 0.075, y + stripH * 0.43);

  ctx.font = `500 ${Math.max(6, Math.round(stripH * 0.15))}px ${SANS_STACK}`;
  ctx.fillStyle = 'rgba(255, 224, 214, .66)';
  ctx.fillText('AN ORIGINAL NEON PANEL COVER  ·  MADE FOR THE NIGHT', w * 0.075, y + stripH * 0.79);
  drawMiniBarcode(ctx, w * 0.91, y + stripH * 0.14, w * 0.06, stripH * 0.66);
}

function drawPalmSilhouette(ctx, x, baseY, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.055);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + size * 0.03, baseY - size * 0.38, x - size * 0.05, baseY - size * 0.77);
  ctx.stroke();

  const topX = x - size * 0.05;
  const topY = baseY - size * 0.77;
  for (let i = 0; i < 7; i++) {
    const spread = (i - 3) / 3;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + spread * size * 0.34, topY - size * 0.1, topX + spread * size * 0.72, topY + size * (0.12 + Math.abs(spread) * 0.12));
    ctx.stroke();
  }
  ctx.restore();
}

function drawMiniBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 239, 218, .92)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#241520';
  for (let i = 0; i < 27; i++) {
    const hash = ((i * 13 + 7) * 17) % 23;
    if (hash > 5) {
      const barW = w / 48 * (hash > 16 ? 1.7 : 0.85);
      ctx.fillRect(x + i * w / 29, y + 1, barW, h - 2);
    }
  }
  ctx.restore();
}

function drawPanelLabels(ctx, labels, w, h) {
  ctx.save();
  const size = Math.max(9, Math.round(Math.min(w, h) * 0.014));
  ctx.font = `600 ${size}px ${CONDENSED_FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const label of labels) {
    if (!Number.isFinite(label.x) || !Number.isFinite(label.y) || label.y >= TITLE_SAFE_TOP) continue;
    const text = String(label.text || '').trim().toUpperCase();
    if (!text) continue;
    const x = Math.max(0, label.x * w);
    const y = Math.max(0, label.y * h);
    const pad = size * 0.45;
    const width = Math.min(ctx.measureText(text).width + pad * 2, w * 0.44);
    ctx.fillStyle = 'rgba(16, 13, 24, .76)';
    ctx.fillRect(x, y, width, size * 1.55);
    ctx.fillStyle = '#f9e3ca';
    ctx.fillText(text, x + pad, y + size * 0.23, width - pad * 2);
  }
  ctx.restore();
}

export { DISPLAY_FONT_STACK, SCRIPT_FONT_STACK, CONDENSED_FONT_STACK };
