// Layout definitions and panel geometry calculators for Neon Panel cover art.

/**
 * Available layout types with metadata.
 */
export const LAYOUT_PRESETS = [
  { id: 'hero-strip', name: 'Hero + Strip', count: 4, icon: '◫' },
  { id: 'classic-6', name: 'Vice 6-Panel', count: 6, icon: '▦' },
  { id: 'grid-4', name: 'Quad Comic', count: 4, icon: '⊞' },
  { id: 'triad-3', name: 'Triad Hero', count: 3, icon: '⊟' },
  { id: 'split-2', name: 'Duo Split', count: 2, icon: '◫' },
  { id: 'solo-1', name: 'Full Bleed', count: 1, icon: '▢' },
];

/**
 * Calculates normalized rectangle coordinates [x, y, width, height] (0.0 to 1.0)
 * for each panel in the chosen layout.
 */
export function getNormalizedPanelRects(layoutId) {
  switch (layoutId) {
    case 'hero-strip':
      // Large hero on left (58% width), 3 stacked panels on right (42% width)
      return [
        { id: 0, x: 0.0, y: 0.0, w: 0.58, h: 1.0 },
        { id: 1, x: 0.58, y: 0.0, w: 0.42, h: 0.333 },
        { id: 2, x: 0.58, y: 0.333, w: 0.42, h: 0.334 },
        { id: 3, x: 0.58, y: 0.667, w: 0.42, h: 0.333 },
      ];

    case 'classic-6':
      // Authentic GTA poster style: 2 panels top, 1 hero panel mid, 3 panels bottom
      return [
        { id: 0, x: 0.0, y: 0.0, w: 0.50, h: 0.34 },
        { id: 1, x: 0.50, y: 0.0, w: 0.50, h: 0.34 },
        { id: 2, x: 0.0, y: 0.34, w: 0.62, h: 0.34 },
        { id: 3, x: 0.62, y: 0.34, w: 0.38, h: 0.34 },
        { id: 4, x: 0.0, y: 0.68, w: 0.34, h: 0.32 },
        { id: 5, x: 0.34, y: 0.68, w: 0.66, h: 0.32 },
      ];

    case 'grid-4':
      // 2x2 grid
      return [
        { id: 0, x: 0.0, y: 0.0, w: 0.50, h: 0.50 },
        { id: 1, x: 0.50, y: 0.0, w: 0.50, h: 0.50 },
        { id: 2, x: 0.0, y: 0.50, w: 0.50, h: 0.50 },
        { id: 3, x: 0.50, y: 0.50, w: 0.50, h: 0.50 },
      ];

    case 'triad-3':
      // Top hero (56% height), two split panels at bottom
      return [
        { id: 0, x: 0.0, y: 0.0, w: 1.0, h: 0.56 },
        { id: 1, x: 0.0, y: 0.56, w: 0.50, h: 0.44 },
        { id: 2, x: 0.50, y: 0.56, w: 0.50, h: 0.44 },
      ];

    case 'split-2':
      // 2 horizontal split or 2 vertical split depending on aspect
      return [
        { id: 0, x: 0.0, y: 0.0, w: 0.50, h: 1.0 },
        { id: 1, x: 0.50, y: 0.0, w: 0.50, h: 1.0 },
      ];

    case 'solo-1':
    default:
      return [
        { id: 0, x: 0.0, y: 0.0, w: 1.0, h: 1.0 },
      ];
  }
}

/**
 * Computes pixel boundaries for each panel, inset by a border gap.
 */
export function computePanelPixelRects(layoutId, canvasWidth, canvasHeight, borderGap = 8) {
  const normRects = getNormalizedPanelRects(layoutId);
  const halfGap = borderGap / 2;

  return normRects.map((rect) => {
    const rawX = rect.x * canvasWidth;
    const rawY = rect.y * canvasHeight;
    const rawW = rect.w * canvasWidth;
    const rawH = rect.h * canvasHeight;

    // Apply gap insets so borders align cleanly
    const insetX = rect.x === 0 ? rawX : rawX + halfGap;
    const insetY = rect.y === 0 ? rawY : rawY + halfGap;
    const insetW = (rect.x === 0 && rect.w === 1.0)
      ? rawW
      : (rect.x === 0 || rect.x + rect.w >= 0.999) ? rawW - halfGap : rawW - borderGap;
    const insetH = (rect.y === 0 && rect.h === 1.0)
      ? rawH
      : (rect.y === 0 || rect.y + rect.h >= 0.999) ? rawH - halfGap : rawH - borderGap;

    return {
      id: rect.id,
      x: Math.round(insetX),
      y: Math.round(insetY),
      width: Math.max(10, Math.round(insetW)),
      height: Math.max(10, Math.round(insetH)),
    };
  });
}
