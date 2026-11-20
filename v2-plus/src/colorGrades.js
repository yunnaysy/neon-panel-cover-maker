// Cinematic color grading presets for Neon Panel v2.
// Seven named looks: Golden Hour, Neon Night, Magenta Dusk, Neon Haze, Pastel Deco, Midnight Drive, 35mm Grit.

export const COLOR_PRESETS = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    badge: '☀️',
    cssFilter: 'contrast(1.18) saturate(1.30) brightness(1.04)',
    poster: {
      titleStops: ['#fff3d8', '#ffb15a', '#ff704d', '#ff3d8b'],
      titleGlow: 'rgba(255, 91, 83, .88)',
      subtitleColor: '#ff73b7',
      bandStops: ['#241326', '#45202f', '#87402f', '#a34c32'],
      sunColors: ['rgba(255, 190, 103, .32)', 'rgba(255, 82, 119, .18)'],
      footerStops: ['#351a32', '#85364a', '#a84a3c'],
      accentColor: '#ffbd70',
      lineColor: 'rgba(255, 181, 123, .62)',
      glowColor: 'rgba(255, 128, 68, .3)',
      vignetteColor: 'rgba(39, 9, 23, .82)',
    },
    stops: [
      { pos: 0.0, color: 'rgba(255, 230, 120, 0.42)' },
      { pos: 0.45, color: 'rgba(255, 140, 50, 0.48)' },
      { pos: 1.0, color: 'rgba(80, 20, 10, 0.72)' },
    ],
    blendMode: 'overlay',
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    badge: '⚡',
    cssFilter: 'contrast(1.25) saturate(1.42) brightness(0.96)',
    poster: {
      titleStops: ['#ffffff', '#b5ffff', '#35dcff', '#ff3bab'],
      titleGlow: 'rgba(31, 228, 255, .95)',
      subtitleColor: '#68f3ff',
      bandStops: ['#071422', '#0b2637', '#133744', '#16182f'],
      sunColors: ['rgba(32, 229, 255, .25)', 'rgba(255, 54, 177, .17)'],
      footerStops: ['#0c2537', '#16495b', '#342149'],
      accentColor: '#79f2ff',
      lineColor: 'rgba(74, 226, 246, .62)',
      glowColor: 'rgba(18, 216, 255, .32)',
      vignetteColor: 'rgba(3, 18, 34, .84)',
    },
    stops: [
      { pos: 0.0, color: 'rgba(0, 220, 255, 0.50)' },
      { pos: 0.5, color: 'rgba(255, 0, 128, 0.52)' },
      { pos: 1.0, color: 'rgba(10, 6, 40, 0.88)' },
    ],
    blendMode: 'overlay',
  },
  {
    id: 'vice-dusk',
    name: 'Magenta Dusk',
    badge: '🌆',
    cssFilter: 'contrast(1.20) saturate(1.32) brightness(1.0)',
    poster: {
      titleStops: ['#fff0de', '#ffc49e', '#f775b6', '#bc39c1'],
      titleGlow: 'rgba(241, 74, 193, .9)',
      subtitleColor: '#ff8bdf',
      bandStops: ['#190f2d', '#35143c', '#57205b', '#31183f'],
      sunColors: ['rgba(255, 153, 175, .25)', 'rgba(158, 68, 229, .2)'],
      footerStops: ['#211236', '#552458', '#74345d'],
      accentColor: '#ffb0ca',
      lineColor: 'rgba(223, 128, 219, .62)',
      glowColor: 'rgba(211, 52, 200, .3)',
      vignetteColor: 'rgba(28, 8, 41, .84)',
    },
    stops: [
      { pos: 0.0, color: 'rgba(255, 200, 100, 0.40)' },
      { pos: 0.45, color: 'rgba(255, 60, 130, 0.48)' },
      { pos: 1.0, color: 'rgba(30, 10, 60, 0.82)' },
    ],
    blendMode: 'overlay',
  },
  {
    id: 'neon-haze',
    name: 'Neon Haze',
    badge: '🔥',
    cssFilter: 'contrast(1.22) saturate(1.38) brightness(1.06)',
    poster: {
      titleStops: ['#fff7d9', '#ffd17c', '#ff986b', '#e25d74'],
      titleGlow: 'rgba(255, 177, 108, .78)',
      subtitleColor: '#a8edf0',
      bandStops: ['#182c35', '#32505a', '#72514d', '#8e493f'],
      sunColors: ['rgba(255, 214, 137, .28)', 'rgba(97, 215, 220, .16)'],
      footerStops: ['#24434b', '#80604f', '#934b45'],
      accentColor: '#ffe092',
      lineColor: 'rgba(255, 212, 150, .62)',
      glowColor: 'rgba(255, 168, 91, .28)',
      vignetteColor: 'rgba(30, 36, 36, .76)',
    },
    stops: [
      { pos: 0.0, color: 'rgba(255, 245, 200, 0.40)' },
      { pos: 0.48, color: 'rgba(255, 170, 50, 0.44)' },
      { pos: 1.0, color: 'rgba(50, 22, 8, 0.78)' },
    ],
    blendMode: 'overlay',
  },
  {
    id: 'pastel-deco',
    name: 'Pastel Deco',
    badge: '🌴',
    cssFilter: 'contrast(1.12) saturate(1.15) brightness(1.08)',
    poster: {
      titleStops: ['#fff7ed', '#ffd5b5', '#a9eadb', '#c4a4ff'],
      titleGlow: 'rgba(103, 226, 224, .78)',
      subtitleColor: '#ffadd4',
      bandStops: ['#172937', '#254554', '#4b536b', '#5e4169'],
      sunColors: ['rgba(255, 200, 176, .25)', 'rgba(146, 157, 255, .18)'],
      footerStops: ['#223c4d', '#506071', '#654766'],
      accentColor: '#ffcee4',
      lineColor: 'rgba(171, 224, 225, .64)',
      glowColor: 'rgba(139, 223, 226, .25)',
      vignetteColor: 'rgba(11, 25, 42, .78)',
    },
    stops: [
      { pos: 0.0, color: 'rgba(255, 220, 240, 0.35)' },
      { pos: 0.5, color: 'rgba(180, 230, 255, 0.30)' },
      { pos: 1.0, color: 'rgba(255, 240, 210, 0.28)' },
    ],
    blendMode: 'soft-light',
  },
  {
    id: 'midnight-drive',
    name: 'Midnight Drive',
    badge: '🌙',
    cssFilter: 'contrast(1.22) saturate(1.05) brightness(0.92) hue-rotate(-8deg)',
    poster: {
      titleStops: ['#ffffff', '#c9f6ff', '#5fd3ff', '#3a6bff'],
      titleGlow: 'rgba(70, 170, 255, .9)',
      subtitleColor: '#7fe7ff',
      bandStops: ['#060d1a', '#0b1b2e', '#10283d', '#0a1426'],
      sunColors: ['rgba(90, 190, 255, .22)', 'rgba(40, 90, 200, .18)'],
      footerStops: ['#08121f', '#12324a', '#1b2240'],
      accentColor: '#9be8ff',
      lineColor: 'rgba(110, 200, 255, .6)',
      glowColor: 'rgba(40, 140, 255, .26)',
      vignetteColor: 'rgba(2, 8, 20, .86)',
    },
    stops: [
      { pos: 0.0, color: 'rgba(60, 200, 255, 0.40)' },
      { pos: 0.5, color: 'rgba(20, 80, 160, 0.46)' },
      { pos: 1.0, color: 'rgba(4, 10, 30, 0.86)' },
    ],
    blendMode: 'overlay',
  },
  {
    id: 'grit-35mm',
    name: '35mm Grit',
    badge: '🎞️',
    cssFilter: 'contrast(1.1) saturate(0.72) brightness(1.02) sepia(0.12)',
    poster: {
      titleStops: ['#ffffff', '#f2e9ff', '#ff9a8a', '#d6456d'],
      titleGlow: 'rgba(230, 90, 110, .7)',
      subtitleColor: '#ff8fa8',
      bandStops: ['#17151b', '#26222b', '#3a2d33', '#211c24'],
      sunColors: ['rgba(255, 170, 150, .2)', 'rgba(150, 120, 170, .16)'],
      footerStops: ['#1b181f', '#3a2f38', '#2a2230'],
      accentColor: '#ffb3a6',
      lineColor: 'rgba(230, 200, 210, .5)',
      glowColor: 'rgba(200, 120, 110, .2)',
      vignetteColor: 'rgba(10, 8, 12, .86)',
    },
    stops: [
      { pos: 0.0, color: 'rgba(230, 230, 240, 0.22)' },
      { pos: 0.5, color: 'rgba(120, 110, 130, 0.30)' },
      { pos: 1.0, color: 'rgba(20, 16, 24, 0.70)' },
    ],
    blendMode: 'soft-light',
  },
];

export function getColorPreset(presetId) {
  const id = presetId === 'noon-haze' ? 'neon-haze' : presetId;
  return COLOR_PRESETS.find(preset => preset.id === id) || COLOR_PRESETS[0];
}

/**
 * Applies the selected color grade wash over a panel region.
 * Includes per-panel vignette, fine grain and halftone texture.
 */
export function applyColorGrade(ctx, presetId, intensity, width, height, x = 0, y = 0) {
  if (intensity <= 0.01) return;
  const preset = getColorPreset(presetId);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  // 1. Main colour wash
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  for (const stop of preset.stops) {
    grad.addColorStop(stop.pos, stop.color);
  }
  ctx.globalAlpha = Math.min(1.0, Math.max(0.0, intensity));
  ctx.globalCompositeOperation = preset.blendMode || 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);

  // 2. Warm radial glow in lower region (keeps skin warm)
  const warmGlow = ctx.createRadialGradient(
    x + width * 0.5, y + height * 0.75, width * 0.08,
    x + width * 0.5, y + height * 0.75, width * 0.7
  );
  warmGlow.addColorStop(0, preset.poster?.glowColor || 'rgba(255, 100, 60, 0.30)');
  warmGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = intensity * 0.5;
  ctx.fillStyle = warmGlow;
  ctx.fillRect(x, y, width, height);

  // 3. Per-panel gentle vignette
  const vig = ctx.createRadialGradient(
    x + width * 0.5, y + height * 0.5, Math.min(width, height) * 0.35,
    x + width * 0.5, y + height * 0.5, Math.max(width, height) * 0.72
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = intensity * 0.6;
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, width, height);

  ctx.restore();
}
