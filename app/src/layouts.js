// Panel arrangements for the poster. Every polygon lives in normalized 0..1 space over the photo area; the
// renderer converts it to pixels. The gutter fractions gx/gy keep the dark seams about six design units wide.

export const LAYOUTS = [
  { key: 'keyArt', name: 'Key Art', count: 6, blurb: 'Hero + five' },
  { key: 'heroFour', name: 'Hero + Four', count: 5, blurb: 'One big hero' },
  { key: 'mosaic', name: 'Mosaic Six', count: 6, blurb: '3 × 2 grid' },
  { key: 'split', name: 'Split Diagonal', count: 4, blurb: 'Four wedges' },
  { key: 'bleed', name: 'Full Bleed', count: 1, blurb: 'One scene' },
];

export const LAYOUT_KEYS = LAYOUTS.map((l) => l.key);

export const LAYOUT_ALIASES = {
  'key-art': 'keyArt',
  'hero-four': 'heroFour',
  'mosaic-six': 'mosaic',
  'split-diagonal': 'split',
  'full-bleed': 'bleed',
};

export function normalizeLayout(key) {
  if (!key) return null;
  if (LAYOUT_KEYS.includes(key)) return key;
  return LAYOUT_ALIASES[key] ?? null;
}

export function layoutInfo(key) {
  return LAYOUTS.find((l) => l.key === key) ?? LAYOUTS[0];
}

export function panelCount(key) {
  return layoutInfo(key).count;
}

function rect(x0, y0, x1, y1, hx, hy) {
  const xa = x0 + hx;
  const xb = x1 - hx;
  const ya = y0 + hy;
  const yb = y1 - hy;
  return [
    { x: xa, y: ya },
    { x: xb, y: ya },
    { x: xb, y: yb },
    { x: xa, y: yb },
  ];
}

function centroid(points) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function insetToward(points, d) {
  const c = centroid(points);
  return points.map((p) => {
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * d, y: p.y + (dy / len) * d };
  });
}

/**
 * The panel polygons for a layout. gx and gy are the full gutter widths as fractions of the photo area's
 * width and height, so a 6u seam looks the same at every export size.
 */
export function buildPanels(key, gx, gy) {
  const hx = Math.max(0.0015, gx / 2);
  const hy = Math.max(0.0015, gy / 2);

  if (key === 'heroFour') {
    return [
      rect(0, 0, 0.55, 1, hx, hy),
      rect(0.565, 0, 0.7825, 0.49, hx, hy),
      rect(0.7825, 0, 1, 0.49, hx, hy),
      rect(0.565, 0.51, 0.7825, 1, hx, hy),
      rect(0.7825, 0.51, 1, 1, hx, hy),
    ];
  }

  if (key === 'mosaic') {
    return [
      rect(0, 0, 0.3333, 0.5, hx, hy),
      rect(0.3333, 0, 0.6666, 0.5, hx, hy),
      rect(0.6666, 0, 1, 0.5, hx, hy),
      rect(0, 0.5, 0.3333, 1, hx, hy),
      rect(0.3333, 0.5, 0.6666, 1, hx, hy),
      rect(0.6666, 0.5, 1, 1, hx, hy),
    ];
  }

  if (key === 'split') {
    const c = { x: 0.5, y: 0.5 };
    const d = (gx + gy) / 2;
    return [
      insetToward([{ x: 0, y: 0 }, { x: 1, y: 0 }, c], d),
      insetToward([{ x: 1, y: 0 }, { x: 1, y: 1 }, c], d),
      insetToward([{ x: 1, y: 1 }, { x: 0, y: 1 }, c], d),
      insetToward([{ x: 0, y: 1 }, { x: 0, y: 0 }, c], d),
    ];
  }

  if (key === 'bleed') {
    return [rect(0, 0, 1, 1, hx, hy)];
  }

  // Key Art: a tall hero with a gently tilted right edge, then two rows of smaller scenes to its right.
  const hero = [
    { x: hx, y: hy },
    { x: 0.445 - hx, y: hy },
    { x: 0.429 - hx, y: 0.5 },
    { x: 0.412 - hx, y: 1 - hy },
    { x: hx, y: 1 - hy },
  ];
  const right = 0.462;
  return [
    hero,
    rect(right, 0, 0.731, 0.49, hx, hy),
    rect(0.731, 0, 1, 0.49, hx, hy),
    rect(right, 0.51, 0.641, 1, hx, hy),
    rect(0.641, 0.51, 0.8205, 1, hx, hy),
    rect(0.8205, 0.51, 1, 1, hx, hy),
  ];
}

export function polygonBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
