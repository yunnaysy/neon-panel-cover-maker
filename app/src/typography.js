// High-impact poster typography engine for Neon Panel.
// Uses a heavy display system font stack with multi-pass canvas strokes,
// neon/metallic gradient fills, and 3D extruded drop shadows.

export const TITLE_COLOR_THEMES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    badge: '🌆',
    stops: [
      { pos: 0.0, color: '#ffffff' },
      { pos: 0.22, color: '#ffe66d' },
      { pos: 0.65, color: '#ff2a85' },
      { pos: 1.0, color: '#900050' },
    ],
    accentGlow: 'rgba(255, 42, 133, 0.75)',
  },
  {
    id: 'miami-cyan',
    name: 'Miami Cyan',
    badge: '⚡',
    stops: [
      { pos: 0.0, color: '#ffffff' },
      { pos: 0.3, color: '#00f0ff' },
      { pos: 0.72, color: '#7b00ff' },
      { pos: 1.0, color: '#250066' },
    ],
    accentGlow: 'rgba(0, 240, 255, 0.8)',
  },
  {
    id: 'chrome-silver',
    name: 'Chrome Steel',
    badge: '🛡️',
    stops: [
      { pos: 0.0, color: '#ffffff' },
      { pos: 0.44, color: '#d8dee9' },
      { pos: 0.52, color: '#2b303c' },
      { pos: 0.8, color: '#8892a4' },
      { pos: 1.0, color: '#161922' },
    ],
    accentGlow: 'rgba(200, 220, 255, 0.6)',
  },
  {
    id: 'gold-amber',
    name: 'Golden Hour',
    badge: '☀️',
    stops: [
      { pos: 0.0, color: '#ffffff' },
      { pos: 0.28, color: '#ffeb3b' },
      { pos: 0.68, color: '#ff9800' },
      { pos: 1.0, color: '#b72c00' },
    ],
    accentGlow: 'rgba(255, 170, 0, 0.75)',
  },
];

export const TITLE_FONTS = [
  { id: 'Bebas Neue', name: 'Bebas Neue (Condensed)' },
  { id: 'Anton', name: 'Anton (Impact Display)' },
  { id: 'Archivo Black', name: 'Archivo Black (Block)' },
];

const DEFAULT_HEAVY_FONT_FAMILY = '"Bebas Neue", "Anton", "Archivo Black", Impact, "Arial Black", "Franklin Gothic Heavy", sans-serif';
const SUBTITLE_FONT_FAMILY = '"Arimo", "Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

/**
 * Draws the entire cover typography block: main title, subtitle badge, and tagline.
 */
export function drawCoverTypography(ctx, state, canvasWidth, canvasHeight) {
  const {
    mainTitle = 'VICE LIGHTS',
    subtitle = 'OCEAN DRIVE CHRONICLES',
    tagline = 'FALL 2026 • AN ORIGINAL TALE',
    titleTheme = 'vice-sunset',
    titleFont = 'Bebas Neue',
    textPosition = 'bottom',
  } = state;

  const hasMain = mainTitle && mainTitle.trim().length > 0;
  const hasSub = subtitle && subtitle.trim().length > 0;
  const hasTag = tagline && tagline.trim().length > 0;

  if (!hasMain && !hasSub && !hasTag) return;

  const activeFontFamily = titleFont
    ? `"${titleFont}", ${DEFAULT_HEAVY_FONT_FAMILY}`
    : DEFAULT_HEAVY_FONT_FAMILY;

  ctx.save();

  // Determine main title font size first to calculate non-overlapping layout
  const cleanTitle = mainTitle.trim().toUpperCase();
  let titleFontSize = Math.round(canvasHeight * 0.125);
  ctx.font = `italic 900 ${titleFontSize}px ${activeFontFamily}`;
  const maxAllowedWidth = canvasWidth * 0.82;

  while (ctx.measureText(cleanTitle).width > maxAllowedWidth && titleFontSize > 18) {
    titleFontSize -= 3;
    ctx.font = `italic 900 ${titleFontSize}px ${activeFontFamily}`;
  }

  // Calculate clean non-overlapping Y baselines
  let mainY;
  if (textPosition === 'top') {
    mainY = canvasHeight * 0.18;
  } else {
    // Bottom placement
    mainY = canvasHeight * 0.83;
  }

  // 1. Tagline teaser (strictly above main title)
  if (hasTag) {
    const tagY = mainY - titleFontSize * 0.72 - canvasHeight * 0.015;
    drawTagline(ctx, tagline.trim().toUpperCase(), canvasWidth * 0.5, tagY, canvasWidth);
  }

  // 2. Main Title
  if (hasMain) {
    drawMainTitle(ctx, cleanTitle, canvasWidth * 0.5, mainY, titleFontSize, titleTheme, activeFontFamily);
  }

  // 3. Subtitle Pill Badge (strictly below main title)
  if (hasSub) {
    const subY = mainY + titleFontSize * 0.72 + canvasHeight * 0.018;
    drawSubtitleBadge(ctx, subtitle.trim().toUpperCase(), canvasWidth * 0.5, subY, canvasWidth);
  }

  ctx.restore();
}

/**
 * Draws the main title with heavy stroke, gradient fill, and 3D shadow.
 */
function drawMainTitle(ctx, text, centerX, centerY, fontSize, themeId, fontFamily = DEFAULT_HEAVY_FONT_FAMILY) {
  const theme = TITLE_COLOR_THEMES.find((t) => t.id === themeId) || TITLE_COLOR_THEMES[0];

  ctx.font = `italic 900 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Deep 3D extruded drop shadow passes
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;
  const shadowDepth = Math.max(5, Math.round(fontSize * 0.08));
  ctx.fillStyle = '#040108';
  for (let s = shadowDepth; s >= 1; s--) {
    ctx.fillText(text, centerX + s * 1.6, centerY + s * 1.6);
  }

  // 2. Heavy outer dark stroke
  const strokeWidth = Math.max(6, Math.round(fontSize * 0.13));
  ctx.strokeStyle = '#05020a';
  ctx.lineWidth = strokeWidth;
  ctx.strokeText(text, centerX, centerY);

  // 3. Glowing neon aura behind letters
  ctx.shadowColor = theme.accentGlow;
  ctx.shadowBlur = Math.round(fontSize * 0.22);
  ctx.strokeStyle = '#090412';
  ctx.lineWidth = strokeWidth * 0.75;
  ctx.strokeText(text, centerX, centerY);
  ctx.shadowBlur = 0;

  // 4. Gradient Fill
  const textGrad = ctx.createLinearGradient(centerX, centerY - fontSize * 0.5, centerX, centerY + fontSize * 0.5);
  for (const stop of theme.stops) {
    textGrad.addColorStop(stop.pos, stop.color);
  }
  ctx.fillStyle = textGrad;
  ctx.fillText(text, centerX, centerY);

  // 5. Crisp inner top highlight stroke
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(1, fontSize * 0.025);
  ctx.strokeText(text, centerX, centerY - 1.5);
}

/**
 * Draws a sleek dark subtitle pill badge with tracking.
 */
function drawSubtitleBadge(ctx, text, centerX, centerY, canvasWidth) {
  let fontSize = Math.max(12, Math.round(canvasWidth * 0.021));
  ctx.font = `800 ${fontSize}px ${SUBTITLE_FONT_FAMILY}`;

  const spacedText = text.split('').join(' ');
  const maxBadgeW = canvasWidth * 0.86;
  while (ctx.measureText(spacedText).width + fontSize * 3 > maxBadgeW && fontSize > 10) {
    fontSize -= 1;
    ctx.font = `800 ${fontSize}px ${SUBTITLE_FONT_FAMILY}`;
  }

  const metrics = ctx.measureText(spacedText);
  const padX = fontSize * 1.5;
  const padY = fontSize * 0.65;
  const badgeW = metrics.width + padX * 2;
  const badgeH = fontSize + padY * 2;
  const badgeX = centerX - badgeW * 0.5;
  const badgeY = centerY - badgeH * 0.5;
  const radius = badgeH * 0.4;

  ctx.save();
  // Pill background with dark opacity
  ctx.fillStyle = 'rgba(8, 4, 16, 0.92)';
  ctx.strokeStyle = 'rgba(255, 215, 64, 0.85)'; // Gold border
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
  ctx.fill();
  ctx.stroke();

  // Accent neon glow dots on left and right tips
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.arc(badgeX + padX * 0.45, centerY, 3.5, 0, Math.PI * 2);
  ctx.arc(badgeX + badgeW - padX * 0.45, centerY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 5;
  ctx.fillText(spacedText, centerX, centerY);

  ctx.restore();
}

/**
 * Draws a subtle tagline teaser flanked by accent lines.
 */
function drawTagline(ctx, text, centerX, centerY, canvasWidth) {
  let fontSize = Math.max(10, Math.round(canvasWidth * 0.015));
  ctx.font = `700 ${fontSize}px ${SUBTITLE_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const spaced = text.split('').join(' ');
  const maxTagW = canvasWidth * 0.82;
  while (ctx.measureText(spaced).width > maxTagW && fontSize > 8) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px ${SUBTITLE_FONT_FAMILY}`;
  }

  const textW = ctx.measureText(spaced).width;

  ctx.save();
  // Flanking horizontal lines
  const lineLen = Math.min(canvasWidth * 0.14, (canvasWidth * 0.85 - textW) * 0.4);
  if (lineLen > 10) {
    ctx.strokeStyle = 'rgba(255, 42, 133, 0.7)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(centerX - textW * 0.5 - 18, centerY);
    ctx.lineTo(centerX - textW * 0.5 - 18 - lineLen, centerY);
    ctx.moveTo(centerX + textW * 0.5 + 18, centerY);
    ctx.lineTo(centerX + textW * 0.5 + 18 + lineLen, centerY);
    ctx.stroke();
  }

  // Tagline text with soft glow
  ctx.fillStyle = '#ffe066';
  ctx.shadowColor = 'rgba(255, 60, 140, 0.7)';
  ctx.shadowBlur = 6;
  ctx.fillText(spaced, centerX, centerY);
  ctx.restore();
}
