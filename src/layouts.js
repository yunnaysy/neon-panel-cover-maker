// Poster-collage layout presets for Neon Panel v2.
// Each layout adapts to 1920x1080, 1080x1350 and 1080x1080 canvas sizes.
// Panels use a thick neutral gutter with a thin black keyline. Some panels
// have angled/diagonal cuts for a classic open-world crime-story poster feel.

export const LAYOUT_PRESETS = [
  { id: 'key-art',       name: 'Key Art',        count: 6, icon: '◫' },
  { id: 'hero-four',     name: 'Hero + Four',    count: 5, icon: '▦' },
  { id: 'mosaic-six',    name: 'Mosaic Six',     count: 6, icon: '⊞' },
  { id: 'split-diagonal',name: 'Split Diagonal', count: 4, icon: '◩' },
  { id: 'full-bleed',    name: 'Full Bleed',     count: 1, icon: '▢' },
];

/**
 * Returns normalized panel clip-path polygons for a given layout and canvas size.
 * Each panel is { id, points: [[x,y],...], bounds: {x,y,w,h} }
 * Points are normalized 0-1 relative to canvas.
 */
export function getLayoutPanels(layoutId, canvasW, canvasH, aspectOverride = null) {
  const aspect = aspectOverride ?? (canvasW / canvasH);
  const isLandscape = aspect > 1.5;   // 16:9
  const isPortrait  = aspect < 0.85;   // 4:5
  // else square 1:1

  switch (layoutId) {
    case 'key-art':
      return keyArtLayout(isLandscape, isPortrait);
    case 'hero-four':
      return heroFourLayout(isLandscape, isPortrait);
    case 'mosaic-six':
      return mosaicSixLayout(isLandscape, isPortrait);
    case 'split-diagonal':
      return splitDiagonalLayout(isLandscape, isPortrait);
    case 'full-bleed':
    default:
      return [{ id: 0, points: [[0,0],[1,0],[1,1],[0,1]], bounds: {x:0,y:0,w:1,h:1} }];
  }
}

function rectPanel(id, x, y, w, h) {
  return {
    id,
    points: [[x,y],[x+w,y],[x+w,y+h],[x,y+h]],
    bounds: {x,y,w,h}
  };
}

function polyPanel(id, pts) {
  let minX=1,minY=1,maxX=0,maxY=0;
  for (const [px,py] of pts) {
    if (px<minX) minX=px; if (py<minY) minY=py;
    if (px>maxX) maxX=px; if (py>maxY) maxY=py;
  }
  return { id, points: pts, bounds: {x:minX,y:minY,w:maxX-minX,h:maxY-minY} };
}

// Key Art: big hero left, 4-5 angled panels right
function keyArtLayout(isLand, isPort) {
  if (isPort) {
    // Portrait: hero top (60%), 5 panels bottom in 2 rows
    const h0 = 0.42;
    const sk = 0.04; // skew for diagonal
    return [
      polyPanel(0, [[0,0],[1,0],[1,h0],[0,h0+sk]]),         // hero top
      polyPanel(1, [[0,h0+sk],[0.5,h0],[0.5,h0+0.20],[0,h0+0.20+sk]]),  // mid-left
      polyPanel(2, [[0.5,h0],[1,h0],[1,h0+0.20],[0.5,h0+0.20]]),         // mid-right
      polyPanel(3, [[0,h0+0.20+sk],[0.33,h0+0.20],[0.33,1],[0,1]]),       // bot-left
      polyPanel(4, [[0.33,h0+0.20],[0.66,h0+0.20],[0.66,1],[0.33,1]]),    // bot-mid
      polyPanel(5, [[0.66,h0+0.20],[1,h0+0.20],[1,1],[0.66,1]]),          // bot-right
    ];
  }
  if (isLand) {
    // Landscape: hero left (45%), 5 panels right with diagonal cuts
    const heroW = 0.44;
    const sk = 0.05;
    return [
      polyPanel(0, [[0,0],[heroW+sk,0],[heroW,1],[0,1]]),           // hero left (angled right edge)
      polyPanel(1, [[heroW+sk,0],[0.72,0],[0.72,0.50],[heroW+sk*0.5,0.50]]),  // top-mid
      polyPanel(2, [[0.72,0],[1,0],[1,0.50],[0.72,0.50]]),                     // top-right
      polyPanel(3, [[heroW,1],[heroW+sk*0.5,0.50],[0.60,0.50],[0.60,1]]),      // bot-left
      polyPanel(4, [[0.60,0.50],[0.80,0.50],[0.80,1],[0.60,1]]),               // bot-mid
      polyPanel(5, [[0.80,0.50],[1,0.50],[1,1],[0.80,1]]),                     // bot-right
    ];
  }
  // Square
  const heroW = 0.48;
  const sk = 0.04;
  return [
    polyPanel(0, [[0,0],[heroW+sk,0],[heroW,1],[0,1]]),
    polyPanel(1, [[heroW+sk,0],[0.74,0],[0.74,0.50],[heroW+sk*0.5,0.50]]),
    polyPanel(2, [[0.74,0],[1,0],[1,0.50],[0.74,0.50]]),
    polyPanel(3, [[heroW,1],[heroW+sk*0.5,0.50],[0.65,0.50],[0.65,1]]),
    polyPanel(4, [[0.65,0.50],[0.82,0.50],[0.82,1],[0.65,1]]),
    polyPanel(5, [[0.82,0.50],[1,0.50],[1,1],[0.82,1]]),
  ];
}

// Hero + Four: one big panel + 4 smaller
function heroFourLayout(isLand, isPort) {
  if (isPort) {
    const h0 = 0.48;
    return [
      rectPanel(0, 0, 0, 1, h0),
      rectPanel(1, 0, h0, 0.50, 0.26),
      rectPanel(2, 0.50, h0, 0.50, 0.26),
      rectPanel(3, 0, h0+0.26, 0.50, 1-h0-0.26),
      rectPanel(4, 0.50, h0+0.26, 0.50, 1-h0-0.26),
    ];
  }
  if (isLand) {
    return [
      rectPanel(0, 0, 0, 0.55, 1),
      rectPanel(1, 0.55, 0, 0.225, 0.50),
      rectPanel(2, 0.775, 0, 0.225, 0.50),
      rectPanel(3, 0.55, 0.50, 0.225, 0.50),
      rectPanel(4, 0.775, 0.50, 0.225, 0.50),
    ];
  }
  // landscape fallback with 5 panels
  return [
    rectPanel(0, 0, 0, 0.55, 1),
    rectPanel(1, 0.55, 0, 0.225, 0.50),
    rectPanel(2, 0.775, 0, 0.225, 0.50),
    rectPanel(3, 0.55, 0.50, 0.225, 0.50),
    rectPanel(4, 0.775, 0.50, 0.225, 0.50),
  ];
}

// Mosaic Six: mixed-size grid with 6 panels
function mosaicSixLayout(isLand, isPort) {
  if (isPort) {
    return [
      rectPanel(0, 0, 0, 0.60, 0.35),
      rectPanel(1, 0.60, 0, 0.40, 0.35),
      rectPanel(2, 0, 0.35, 0.40, 0.30),
      rectPanel(3, 0.40, 0.35, 0.60, 0.30),
      rectPanel(4, 0, 0.65, 0.50, 0.35),
      rectPanel(5, 0.50, 0.65, 0.50, 0.35),
    ];
  }
  if (isLand) {
    return [
      rectPanel(0, 0, 0, 0.42, 0.55),
      rectPanel(1, 0.42, 0, 0.30, 0.55),
      rectPanel(2, 0.72, 0, 0.28, 0.55),
      rectPanel(3, 0, 0.55, 0.33, 0.45),
      rectPanel(4, 0.33, 0.55, 0.38, 0.45),
      rectPanel(5, 0.71, 0.55, 0.29, 0.45),
    ];
  }
  // Square
  return [
    rectPanel(0, 0, 0, 0.55, 0.50),
    rectPanel(1, 0.55, 0, 0.45, 0.50),
    rectPanel(2, 0, 0.50, 0.33, 0.50),
    rectPanel(3, 0.33, 0.50, 0.33, 0.50),
    rectPanel(4, 0.66, 0.50, 0.34, 0.25),
    rectPanel(5, 0.66, 0.75, 0.34, 0.25),
  ];
}

// Split Diagonal: 4 panels with strong diagonal cuts
function splitDiagonalLayout(isLand, isPort) {
  const sk = 0.08;
  if (isPort) {
    return [
      polyPanel(0, [[0,0],[1,0],[1,0.28],[0,0.28+sk]]),
      polyPanel(1, [[0,0.28+sk],[1,0.28],[1,0.52],[0,0.52+sk]]),
      polyPanel(2, [[0,0.52+sk],[1,0.52],[1,0.76],[0,0.76+sk]]),
      polyPanel(3, [[0,0.76+sk],[1,0.76],[1,1],[0,1]]),
    ];
  }
  if (isLand) {
    return [
      polyPanel(0, [[0,0],[0.28+sk,0],[0.28,1],[0,1]]),
      polyPanel(1, [[0.28+sk,0],[0.52+sk,0],[0.52,1],[0.28,1]]),
      polyPanel(2, [[0.52+sk,0],[0.76+sk,0],[0.76,1],[0.52,1]]),
      polyPanel(3, [[0.76+sk,0],[1,0],[1,1],[0.76,1]]),
    ];
  }
  // Square
  return [
    polyPanel(0, [[0,0],[0.28+sk,0],[0.28,1],[0,1]]),
    polyPanel(1, [[0.28+sk,0],[0.53+sk,0],[0.53,1],[0.28,1]]),
    polyPanel(2, [[0.53+sk,0],[0.78+sk,0],[0.78,1],[0.53,1]]),
    polyPanel(3, [[0.78+sk,0],[1,0],[1,1],[0.78,1]]),
  ];
}

/**
 * Computes pixel-space panel clip polygons and axis-aligned bounding rects.
 * Returns array of { id, clipPath: [[px,py],...], x, y, width, height }.
 * Panels are inset by half the gutter on each shared edge.
 */
export function computePanelPixelRects(layoutId, canvasW, canvasH, gutterPx = 10, options = {}) {
  const photoHeight = (options.photoHeight ?? 1) * canvasH;
  const photoAspect = canvasW / Math.max(1, photoHeight);
  const panels = getLayoutPanels(layoutId, canvasW, photoHeight, photoAspect);
  const halfG = gutterPx / 2;

  return panels.filter(p => p.bounds.w > 0.01 && p.bounds.h > 0.01).map(p => {
    // Convert normalized points to pixel, reflowed into the photo area.
    const clipPath = p.points.map(([nx,ny]) => [nx * canvasW, ny * photoHeight]);

    // Bounds in pixels
    const bx = p.bounds.x * canvasW;
    const by = p.bounds.y * photoHeight;
    const bw = p.bounds.w * canvasW;
    const bh = p.bounds.h * photoHeight;

    // Inset clip path by half-gutter toward the center of the bounds
    const cx = bx + bw/2;
    const cy = by + bh/2;
    const insetClip = clipPath.map(([px,py]) => {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const shrink = halfG;
      return [
        px - (dx/dist) * shrink,
        py - (dy/dist) * shrink
      ];
    });

    return {
      id: p.id,
      clipPath: insetClip,
      x: Math.round(bx + halfG),
      y: Math.round(by + halfG),
      width: Math.max(10, Math.round(bw - gutterPx)),
      height: Math.max(10, Math.round(bh - gutterPx)),
    };
  });
}
