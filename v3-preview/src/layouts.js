export const LAYOUTS = [
  { id: 'cast-mosaic', name: 'Cast Mosaic', icon: '▦', count: 9 },
  { id: 'slash', name: 'Slash', icon: '◩', count: 6 },
  { id: 'six-grid', name: 'Six Grid', icon: '▥', count: 6 },
  { id: 'one-story', name: 'One-Photo Story', icon: '▧', count: 6 },
];

function rectangle(id, x, y, w, h, points) {
  return { id, x, y, w, h, points: points || [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] };
}

function castMosaic(width, height, heroIndex) {
  const aspect = width / height;
  if (aspect < 0.85) {
    const hero = rectangle(heroIndex, 0, 0.12, 0.5, 0.30);
    const support = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) support.push(rectangle(-1, 0.5 + col / 6, 0.12 + row * 0.15, 1 / 6, 0.15));
    }
    support.push(rectangle(-1, 0, 0.42, 0.5, 0.21));
    const ids = Array.from({ length: 8 }, (_, id) => id).filter(id => id !== heroIndex);
    support.forEach((panel, index) => { panel.id = ids[index]; });
    const scene = rectangle(8, 0.5, 0.42, 0.5, 0.21);
    return [hero, ...support, scene];
  }
  const hero = rectangle(heroIndex, 0, 0.12, 0.5, 0.415);
  const slots = [
    [0.5, 0.12, 0.25, 0.2075], [0.75, 0.12, 0.25, 0.2075],
    [0.5, 0.3275, 0.25, 0.2075], [0.75, 0.3275, 0.25, 0.2075],
    [0, 0.535, 0.25, 0.105], [0.25, 0.535, 0.25, 0.105],
    [0.5, 0.535, 0.25, 0.105],
  ];
  const ids = Array.from({ length: 8 }, (_, id) => id).filter(id => id !== heroIndex);
  const castPanels = slots.map(([x, y, w, h], index) => rectangle(ids[index], x, y, w, h));
  return [
    hero,
    ...castPanels,
    rectangle(8, 0.75, 0.535, 0.25, 0.105),
  ];
}

function slash(width, height) {
  const aspect = width / height;
  const panels = [];
  if (aspect < 0.85) {
    for (let row = 0; row < 3; row++) {
      const top = 0.13 + row * 0.1667;
      const bottom = top + 0.1667;
      const skew = 0.05;
      panels.push(rectangle(row, 0, top, 0.5, 0.1667, [[0, top], [0.5 + skew, top], [0.5 - skew, bottom], [0, bottom]]));
      panels.push(rectangle(row + 3, 0.5, top, 0.5, 0.1667, [[0.5 + skew, top], [1, top], [1, bottom], [0.5 - skew, bottom]]));
    }
    return panels;
  }
  const cols = 3;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col / cols;
      const y = 0.12 + row * 0.26;
      const w = 1 / cols;
      const h = 0.26;
      const skew = 0.045;
      panels.push(rectangle(row * cols + col, x, y, w, h, [
        [x + skew, y], [x + w, y], [x + w - skew, y + h], [x, y + h],
      ]));
    }
  }
  return panels;
}

function sixGrid(width, height) {
  const aspect = width / height;
  const top = aspect <= 1.05 ? 0.125 : 0.12;
  const bottom = aspect <= 1.05 ? 0.60 : 0.64;
  const rowHeight = (bottom - top) / 2;
  return Array.from({ length: 6 }, (_, id) => {
    const col = id % 3;
    const row = Math.floor(id / 3);
    return rectangle(id, col / 3, top + row * rowHeight, 1 / 3, rowHeight);
  });
}

function onePhotoStory() {
  return [
    rectangle(0, 0, 0.12, 1, 0.30),
    rectangle(1, 0, 0.45, 0.2, 0.19),
    rectangle(2, 0.2, 0.45, 0.2, 0.19),
    rectangle(3, 0.4, 0.45, 0.2, 0.19),
    rectangle(4, 0.6, 0.45, 0.2, 0.19),
    rectangle(5, 0.8, 0.45, 0.2, 0.19),
  ];
}

export function getPanels(layoutId, width, height, heroIndex = 0) {
  if (layoutId === 'slash') return slash(width, height);
  if (layoutId === 'six-grid') return sixGrid(width, height);
  if (layoutId === 'one-story') return onePhotoStory(width, height);
  return castMosaic(width, height, heroIndex);
}

export function pointInPanel(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = (yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function computePanelPixelRects(layoutId, width, height, gutter = 9, heroIndex = 0) {
  return getPanels(layoutId, width, height, heroIndex).map(panel => {
    const points = panel.points.map(([x, y]) => [x * width, y * height]);
    const minX = Math.min(...points.map(point => point[0]));
    const maxX = Math.max(...points.map(point => point[0]));
    const minY = Math.min(...points.map(point => point[1]));
    const maxY = Math.max(...points.map(point => point[1]));
    return {
      id: panel.id,
      points: points.map(([x, y]) => {
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.hypot(dx, dy) || 1;
        const inset = gutter / 2;
        return [x - dx / distance * inset, y - dy / distance * inset];
      }),
      x: minX + gutter / 2,
      y: minY + gutter / 2,
      width: Math.max(12, maxX - minX - gutter),
      height: Math.max(12, maxY - minY - gutter),
    };
  });
}
