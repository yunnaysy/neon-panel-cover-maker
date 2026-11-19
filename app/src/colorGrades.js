// Vice City and GTA 6-inspired color grading presets for Neon Panel.

export const COLOR_PRESETS = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    description: 'Golden tropical warmth with rich magenta and deep purple tones',
    badge: '🌅',
    cssFilter: 'contrast(1.22) saturate(1.35) brightness(1.02)',
    stops: [
      { pos: 0.0, color: 'rgba(255, 215, 64, 0.45)' }, // Warm gold highlight
      { pos: 0.45, color: 'rgba(255, 61, 127, 0.55)' }, // Neon coral/magenta
      { pos: 1.0, color: 'rgba(38, 8, 68, 0.85)' },    // Deep midnight purple
    ],
    blendMode: 'overlay',
    accentColor: '#ff2a85',
  },
  {
    id: 'neon',
    name: 'Neon Pink / Cyan',
    description: 'High-contrast synthwave grade with electric cyan and hot magenta',
    badge: '⚡',
    cssFilter: 'contrast(1.28) saturate(1.45) brightness(0.98)',
    stops: [
      { pos: 0.0, color: 'rgba(0, 240, 255, 0.55)' },  // Electric cyan highlight
      { pos: 0.5, color: 'rgba(255, 0, 128, 0.60)' },  // Hot magenta midtone
      { pos: 1.0, color: 'rgba(10, 8, 48, 0.90)' },    // Indigo shadow
    ],
    blendMode: 'overlay',
    accentColor: '#00f0ff',
  },
  {
    id: 'dusk',
    name: 'Dusk Horizon',
    description: 'Moody twilight indigo with glowing crimson horizon accents',
    badge: '🌆',
    cssFilter: 'contrast(1.20) saturate(1.25) brightness(0.95)',
    stops: [
      { pos: 0.0, color: 'rgba(255, 120, 80, 0.40)' }, // Dusky peach highlight
      { pos: 0.5, color: 'rgba(138, 43, 226, 0.55)' }, // Purple violet midtone
      { pos: 1.0, color: 'rgba(15, 12, 38, 0.92)' },   // Deep obsidian shadow
    ],
    blendMode: 'overlay',
    accentColor: '#ff77aa',
  },
  {
    id: 'noon',
    name: 'Noon Haze',
    description: 'Blazing Miami sun with warm golden highlights and deep punchy contrast',
    badge: '☀️',
    cssFilter: 'contrast(1.25) saturate(1.40) brightness(1.06)',
    stops: [
      { pos: 0.0, color: 'rgba(255, 240, 180, 0.45)' }, // Scorching pale gold
      { pos: 0.48, color: 'rgba(255, 160, 40, 0.50)' }, // Warm amber
      { pos: 1.0, color: 'rgba(45, 20, 10, 0.85)' },    // Rich bronze shadow
    ],
    blendMode: 'overlay',
    accentColor: '#ffaa00',
  },
];

/**
 * Applies the selected color grade wash over a panel or entire canvas.
 */
export function applyColorGrade(ctx, presetId, intensity = 0.85, width, height, x = 0, y = 0) {
  if (intensity <= 0.01) return;

  const preset = COLOR_PRESETS.find((p) => p.id === presetId) || COLOR_PRESETS[0];

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  // Create vertical gradient wash
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  for (const stop of preset.stops) {
    grad.addColorStop(stop.pos, stop.color);
  }

  ctx.globalAlpha = Math.min(1.0, Math.max(0.0, intensity));
  ctx.globalCompositeOperation = preset.blendMode || 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);

  // Subtle secondary soft-light warmth in lower half
  const warmGlow = ctx.createRadialGradient(
    x + width * 0.5,
    y + height * 0.8,
    width * 0.1,
    x + width * 0.5,
    y + height * 0.8,
    width * 0.8
  );
  warmGlow.addColorStop(0, 'rgba(255, 80, 160, 0.35)');
  warmGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = intensity * 0.6;
  ctx.fillStyle = warmGlow;
  ctx.fillRect(x, y, width, height);

  ctx.restore();
}
