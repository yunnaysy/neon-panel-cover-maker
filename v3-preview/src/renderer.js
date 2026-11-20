import { computePanelPixelRects, pointInPanel } from './layouts.js';

export const COLOR_GRADES = [
  { id: 'golden-hour', name: 'Golden Hour', swatch: 'linear-gradient(135deg,#ffdb48,#ff674d 54%,#ed347f)', filter: [1.08, 1.17, 1.03], wash: ['#ff9b38', '#ff4d8f', '#6d1f9e'] },
  { id: 'neon-night', name: 'Neon Night', swatch: 'linear-gradient(135deg,#28d8ff,#883bff 55%,#fa36b5)', filter: [1.2, 1.35, 0.92], wash: ['#19d8ff', '#a42bff', '#f32c96'] },
  { id: 'magenta-dusk', name: 'Magenta Dusk', swatch: 'linear-gradient(135deg,#ff668f,#d42bd8 55%,#491b8d)', filter: [1.16, 1.28, 1], wash: ['#ff507e', '#e62ca2', '#541ab2'] },
  { id: 'teal-tide', name: 'Teal Tide', swatch: 'linear-gradient(135deg,#64ffc5,#13a7c7 55%,#273fa9)', filter: [1.14, 1.2, 1.02], wash: ['#2ef0ce', '#148dc9', '#512cb9'] },
  { id: 'noon-heat', name: 'Noon Heat', swatch: 'linear-gradient(135deg,#ffe733,#ff8a24 55%,#f43f5e)', filter: [1.17, 1.18, 1.12], wash: ['#ffe72e', '#ff802b', '#e94445'] },
  { id: 'pastel-deco', name: 'Pastel Deco', swatch: 'linear-gradient(135deg,#77f5f2,#9b8cff 52%,#fb6eb1)', filter: [1.08, 1.12, 1.08], wash: ['#5ce8ef', '#9264ff', '#f74eae'] },
  { id: 'ink-noir', name: 'Ink Noir', swatch: 'linear-gradient(135deg,#b6c8ff,#59617c 55%,#111522)', filter: [1.38, 0.5, 0.95], wash: ['#83a9ff', '#70758f', '#232b49'] },
];

const TITLE_FAMILY = '"Bebas Neue", "Oswald", sans-serif';
const CONDENSED_FAMILY = '"Oswald", sans-serif';
const SCRIPT_FAMILY = '"Mr Dafoe", cursive';
const FONT_LOADS = [
  'italic 900 200px "Bebas Neue"',
  '400 100px "Mr Dafoe"',
  '700 48px "Oswald"',
  '400 48px "Oswald"',
];

const WARM_CHROME = {
  extrusion: '#26064f',
  glow: '#ff2f97',
  innerStroke: '#14071f',
  rim: '#ffeaa0',
  stops: [[0, '#ffffff'], [0.18, '#ffdc6b'], [0.42, '#ff7a1a'], [0.485, '#fff2a0'], [0.515, '#ffffff'], [0.56, '#ff3d9a'], [0.8, '#8d1a8c'], [1, '#2a0a59']],
};
const ICE_CHROME = {
  extrusion: '#071a3a',
  glow: '#24d8ff',
  innerStroke: '#081226',
  rim: '#bff6ff',
  stops: [[0, '#ffffff'], [0.2, '#d7f9ff'], [0.44, '#38e8f4'], [0.485, '#ffffff'], [0.515, '#dff8ff'], [0.58, '#8a6bff'], [0.8, '#4f27bb'], [1, '#1a0b54']],
};

let posterFontsPromise = null;

export function ensurePosterFonts() {
  if (!posterFontsPromise) {
    posterFontsPromise = (async () => {
      if (typeof document === 'undefined' || !document.fonts) return;
      await Promise.all(FONT_LOADS.map(font => document.fonts.load(font)));
      await document.fonts.ready;
    })();
  }
  return posterFontsPromise;
}

export function renderCoverArt(canvas, state, options = {}) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const gutter = Math.max(8, Math.round(Math.min(width, height) * 0.012));
  const panels = computePanelPixelRects(state.layout, width, height, gutter, state.heroPanelIndex || 0);
  const zones = posterZones(state, width, height, panels, gutter);

  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  if (state.backdrop?.image) drawPhotoPanel(ctx, { x: 0, y: 0, width, height }, state.backdrop, state);
  drawTitleZone(ctx, state, zones, width, height);

  for (const panel of panels) {
    ctx.save();
    tracePanel(ctx, panel.points);
    ctx.clip();
    const photo = state.panelPhotos[panel.id] || state.panelPhotos[0];
    if (photo?.image) drawPhotoPanel(ctx, panel, photo, state, { minZoom: minZoomForLayout(state.layout) });
    else drawEmptyPanel(ctx, panel, width, height, panel.id);
    ctx.restore();
  }

  ctx.lineJoin = 'round';
  ctx.lineWidth = gutter;
  ctx.strokeStyle = '#fff';
  panels.forEach(panel => {
    tracePanel(ctx, panel.points);
    ctx.stroke();
  });
  ctx.lineWidth = Math.max(1.5, gutter * 0.13);
  ctx.strokeStyle = '#080b14';
  panels.forEach(panel => {
    tracePanel(ctx, panel.points);
    ctx.stroke();
  });
  const frame = Math.max(4, Math.round(Math.min(width, height) * 0.006));
  ctx.lineWidth = frame;
  ctx.strokeStyle = '#080b14';
  ctx.strokeRect(frame / 2, frame / 2, width - frame, height - frame);
  ctx.lineWidth = Math.max(1, frame * 0.28);
  ctx.strokeStyle = '#ffffffc9';
  ctx.strokeRect(frame + 2, frame + 2, width - (frame + 2) * 2, height - (frame + 2) * 2);

  if (options.highlightPanelIndex != null && options.highlightPanelIndex >= 0) {
    const selected = panels.find(panel => panel.id === options.highlightPanelIndex);
    if (selected) {
      ctx.lineWidth = Math.max(3, Math.round(Math.min(width, height) * 0.004));
      ctx.strokeStyle = '#38e8f4';
      ctx.shadowColor = '#38e8f4';
      ctx.shadowBlur = Math.min(20, width * 0.01);
      tracePanel(ctx, selected.points);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();

  drawVignette(ctx, width, height);
  drawPrintGrain(ctx, width, height);

  const faces = panels
    .map(panel => {
      const photo = state.panelPhotos[panel.id] || state.panelPhotos[0];
      return photo?.image ? faceRectFor(photo, panel, { minZoom: minZoomForLayout(state.layout) }) : null;
    })
    .filter(Boolean);
  const roleBoxes = drawRoleTags(ctx, state, panels, faces, width, height, gutter);
  const plan = planTypography(ctx, state, width, height, zones);
  const offsets = settleOverlayOffsets(plan.boxes(), faces, zones, width, height);
  for (const element of plan.elements()) {
    const offset = offsets.get(element.box.id) || { dx: 0, dy: 0 };
    element.box.x += offset.dx;
    element.box.y += offset.dy;
  }
  drawTypography(ctx, plan, width, height);

  return {
    width,
    height,
    panels: panels.map(panel => ({ id: panel.id, x: panel.x, y: panel.y, width: panel.width, height: panel.height })),
    faces,
    overlays: [...roleBoxes, ...plan.boxes()],
    zones,
  };
}

function posterZones(state, width, height, panels, gutter) {
  const aspect = width / height;
  const contentBottom = Math.max(...panels.map(panel => panel.y + panel.height));
  const reviewH = height * (aspect < 0.85 ? 0.105 : 0.098);
  const titleTop = Math.max(contentBottom + gutter * 1.4, height * (state.layout === 'six-grid' && aspect <= 1.05 ? 0.60 : 0.65));
  const billingTop = height * 0.895;
  const titleBottom = billingTop - height * 0.012;
  return { reviewH, titleTop, titleBottom, billingTop, zoneH: titleBottom - titleTop };
}

function minZoomForLayout(layoutId) {
  return layoutId === 'six-grid' ? 1.18 : 1;
}

function tracePanel(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
}

function alpha(hex, amount) {
  return `${hex}${Math.round(Math.max(0, Math.min(1, amount)) * 255).toString(16).padStart(2, '0')}`;
}

function drawPhotoPanel(ctx, panel, photo, state, options = {}) {
  const img = photo.image;
  const imageWidth = img.naturalWidth || img.width;
  const imageHeight = img.naturalHeight || img.height;
  if (!imageWidth || !imageHeight) return;
  const { sx, sy, cropW, cropH } = photoCrop(photo, panel, options);
  const grade = COLOR_GRADES.find(item => item.id === state.colorGrade) || COLOR_GRADES[0];
  const intensity = Math.max(0, Math.min(1, state.gradeIntensity));
  const [contrast, saturation, brightness] = grade.filter;
  ctx.filter = `contrast(${1 + (contrast - 1) * intensity}) saturate(${1 + (saturation - 1) * intensity}) brightness(${1 + (brightness - 1) * intensity})`;
  ctx.drawImage(img, sx, sy, cropW, cropH, panel.x, panel.y, panel.width, panel.height);
  ctx.filter = 'none';

  const tint = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.width, panel.y + panel.height);
  tint.addColorStop(0, alpha(grade.wash[0], intensity * 0.11));
  tint.addColorStop(0.52, alpha(grade.wash[1], intensity * 0.09));
  tint.addColorStop(1, alpha(grade.wash[2], intensity * 0.12));
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = tint;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.globalCompositeOperation = 'source-over';

  if (state.colorGrade === 'golden-hour') {
    const liftedShadows = ctx.createLinearGradient(panel.x, panel.y + panel.height, panel.x, panel.y);
    liftedShadows.addColorStop(0, `rgba(176,28,128,${0.15 * intensity})`);
    liftedShadows.addColorStop(0.55, `rgba(176,28,128,${0.05 * intensity})`);
    liftedShadows.addColorStop(1, `rgba(255,150,45,${0.11 * intensity})`);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = liftedShadows;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    const sunGlow = ctx.createRadialGradient(
      panel.x + panel.width * 0.78, panel.y + panel.height * 0.14, 0,
      panel.x + panel.width * 0.78, panel.y + panel.height * 0.14, Math.max(panel.width, panel.height) * 0.72,
    );
    sunGlow.addColorStop(0, `rgba(255,170,60,${0.16 * intensity})`);
    sunGlow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = sunGlow;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawTitleZone(ctx, state, zones, width, height) {
  if (state.backdrop?.image) {
    const skyPhoto = {
      ...state.backdrop,
      focusX: state.backdrop.focusX ?? 0.5,
      focusY: 0.18,
      faceHeight: 0.05,
      panX: 0,
      panY: 0,
      zoom: 1,
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, zones.titleTop, width, zones.billingTop - zones.titleTop);
    ctx.clip();
    drawPhotoPanel(ctx, { x: 0, y: zones.titleTop, width, height: zones.billingTop - zones.titleTop }, skyPhoto, state);
    ctx.restore();
  }
  const intensity = Math.max(0, Math.min(1, state.gradeIntensity));
  const ice = state.colorGrade === 'neon-night' || state.colorGrade === 'teal-tide' || state.colorGrade === 'ink-noir';
  const wash = ctx.createLinearGradient(0, zones.titleTop, 0, zones.billingTop);
  wash.addColorStop(0, alpha(ice ? '#2ee0ff' : '#ff8a2e', ice ? 0.10 : 0.13));
  wash.addColorStop(0.5, alpha(ice ? '#7b32e8' : '#ff3f90', 0.17 * intensity));
  wash.addColorStop(1, alpha(ice ? '#0b0a38' : '#220a4d', 0.78));
  ctx.fillStyle = wash;
  ctx.fillRect(0, zones.titleTop, width, zones.billingTop - zones.titleTop);
  const glow = ctx.createRadialGradient(width * 0.72, zones.titleTop + (zones.billingTop - zones.titleTop) * 0.08, 0, width * 0.72, zones.titleTop + (zones.billingTop - zones.titleTop) * 0.08, width * 0.62);
  glow.addColorStop(0, alpha(ice ? '#38e8f4' : '#ffb13a', 0.26 * intensity));
  glow.addColorStop(1, alpha(ice ? '#38e8f4' : '#ffb13a', 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, zones.titleTop, width, zones.billingTop - zones.titleTop);
}

export function faceZoomLimit(photo, panel) {
  const image = photo?.image;
  const imageHeight = image?.naturalHeight || image?.height || 1;
  const imageWidth = image?.naturalWidth || image?.width || 1;
  const fit = Math.max(panel.width / imageWidth, panel.height / imageHeight);
  const coverHeight = panel.height / fit;
  const faceHeight = Math.max(0.12, photo?.faceHeight ?? 0.3) * imageHeight;
  return Math.max(1, Math.min(2.4, coverHeight / (faceHeight * 1.42)));
}

export function photoCrop(photo, panel, options = {}) {
  const image = photo.image;
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const fit = Math.max(panel.width / imageWidth, panel.height / imageHeight);
  const zoom = Math.min(faceZoomLimit(photo, panel), Math.max(options.minZoom || 1, Math.max(1, photo.zoom || 1)));
  const cropW = Math.min(imageWidth, panel.width / fit / zoom);
  const cropH = Math.min(imageHeight, panel.height / fit / zoom);
  const focusX = Math.max(0, Math.min(1, photo.focusX ?? 0.5)) * imageWidth;
  const focusY = Math.max(0, Math.min(1, photo.focusY ?? 0.36)) * imageHeight;
  const panX = (photo.panX || 0) * (imageWidth - cropW) * 0.5;
  const panY = (photo.panY || 0) * (imageHeight - cropH) * 0.5;
  const faceMargin = (photo.faceHeight ?? 0.3) * imageHeight * 0.52;
  const safeXMin = Math.max(0, focusX - cropW + faceMargin);
  const safeXMax = Math.min(imageWidth - cropW, focusX - faceMargin);
  const safeYMin = Math.max(0, focusY - cropH + faceMargin);
  const safeYMax = Math.min(imageHeight - cropH, focusY - faceMargin);
  const sxMin = safeXMin <= safeXMax ? safeXMin : 0;
  const sxMax = safeXMin <= safeXMax ? safeXMax : imageWidth - cropW;
  const syMin = safeYMin <= safeYMax ? safeYMin : 0;
  const syMax = safeYMin <= safeYMax ? safeYMax : imageHeight - cropH;
  const sx = Math.max(sxMin, Math.min(sxMax, focusX - cropW * 0.5 + panX));
  const sy = Math.max(syMin, Math.min(syMax, focusY - cropH * 0.5 + panY));
  return { sx, sy, cropW, cropH, zoom };
}

function faceRectFor(photo, panel, options = {}) {
  const image = photo.image;
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  if (!imageWidth || !imageHeight) return null;
  const crop = photoCrop(photo, panel, options);
  const faceH = Math.max(0.12, photo.faceHeight ?? 0.3) * imageHeight;
  const faceW = faceH * 0.76;
  const focusX = Math.max(0, Math.min(1, photo.focusX ?? 0.5)) * imageWidth;
  const focusY = Math.max(0, Math.min(1, photo.focusY ?? 0.36)) * imageHeight;
  const left = panel.x + (focusX - faceW / 2 - crop.sx) / crop.cropW * panel.width;
  const right = panel.x + (focusX + faceW / 2 - crop.sx) / crop.cropW * panel.width;
  const top = panel.y + (focusY - faceH / 2 - crop.sy) / crop.cropH * panel.height;
  const bottom = panel.y + (focusY + faceH / 2 - crop.sy) / crop.cropH * panel.height;
  const x = Math.max(panel.x, left);
  const y = Math.max(panel.y, top);
  const w = Math.min(panel.x + panel.width, right) - x;
  const h = Math.min(panel.y + panel.height, bottom) - y;
  if (w <= 0 || h <= 0) return null;
  return { id: `face-${panel.id}`, panelId: panel.id, x, y, w, h };
}

function drawEmptyPanel(ctx, panel, width, height, index) {
  const shade = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.width, panel.y + panel.height);
  shade.addColorStop(0, '#222239');
  shade.addColorStop(1, '#090e1b');
  ctx.fillStyle = shade;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.fillStyle = '#ffffff77';
  ctx.font = `700 ${Math.max(14, Math.round(Math.min(width, height) * 0.022))}px ${CONDENSED_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PHOTO ${String(index + 1).padStart(2, '0')}`, panel.x + panel.width / 2, panel.y + panel.height / 2);
}

function drawVignette(ctx, width, height) {
  const radius = Math.hypot(width, height) * 0.64;
  const shade = ctx.createRadialGradient(width * 0.5, height * 0.43, radius * 0.27, width * 0.5, height * 0.43, radius);
  shade.addColorStop(0, '#090b1400');
  shade.addColorStop(1, '#12071e73');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

let grainTile = null;
function drawPrintGrain(ctx, width, height) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 96;
    grainTile.height = 96;
    const tileCtx = grainTile.getContext('2d');
    const image = tileCtx.createImageData(grainTile.width, grainTile.height);
    let seed = 3417;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const tone = seed % 256;
      image.data[i] = tone;
      image.data[i + 1] = tone;
      image.data[i + 2] = tone;
      image.data[i + 3] = 18;
    }
    tileCtx.putImageData(image, 0, 0);
  }
  const pattern = ctx.createPattern(grainTile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function overlapFraction(face, box) {
  return overlapArea(face, box) / Math.max(1, face.w * face.h);
}

function totalOverlap(box, faces) {
  return faces.reduce((sum, face) => sum + overlapFraction(face, box), 0);
}

function boxInsidePanel(box, panel) {
  return [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x + box.w, box.y + box.h],
    [box.x, box.y + box.h],
  ].every(([x, y]) => pointInPanel(x, y, panel.points));
}

function drawRoleTags(ctx, state, panels, faces, width, height, gutter) {
  const boxes = [];
  const scale = Math.min(width, height);
  for (const panel of panels) {
    const tag = state.tags[panel.id];
    if (!tag?.enabled || !tag.text?.trim()) continue;
    const text = tag.text.trim().toUpperCase();
    const panelFaces = faces.filter(face => face.panelId === panel.id);
    let size = Math.max(10, Math.round(scale * 0.015));
    let placed = null;
    for (let attempt = 0; attempt < 5 && !placed; attempt++) {
      ctx.font = `700 ${size}px ${CONDENSED_FAMILY}`;
      const padX = size * 0.58;
      const padY = size * 0.32;
      const boxW = ctx.measureText(text).width + padX * 2;
      const boxH = size + padY * 2;
      const innerX = panel.x + gutter + size * 0.28;
      const innerY = panel.y + gutter + size * 0.28;
      const right = panel.x + panel.width - gutter - size * 0.28;
      const bottom = panel.y + panel.height - gutter - size * 0.28;
      const candidates = [
        [innerX, bottom - boxH],
        [innerX, innerY],
        [right - boxW, bottom - boxH],
        [right - boxW, innerY],
        [innerX + (panel.width - boxW) * 0.5, bottom - boxH],
      ];
      let best = null;
      for (const [x, y] of candidates) {
        const box = { x, y, w: boxW, h: boxH };
        if (!boxInsidePanel(box, panel)) continue;
        const score = panelFaces.reduce((sum, face) => sum + overlapFraction(face, box), 0);
        if (!best || score < best.score) best = { box, score };
      }
      if (best && best.score <= 0.02) placed = { box: best.box, size, text };
      else size = Math.max(7, Math.round(size * 0.84));
    }
    if (!placed) continue;
    const { box, size: finalSize, text: finalText } = placed;
    ctx.save();
    ctx.fillStyle = '#080b14ef';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = '#ffffffd0';
    ctx.lineWidth = Math.max(1, finalSize * 0.055);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${finalSize}px ${CONDENSED_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(finalText, box.x + box.w / 2, box.y + box.h / 2 + finalSize * 0.02);
    ctx.restore();
    boxes.push({ id: `tag-${panel.id}`, panelId: panel.id, x: box.x, y: box.y, w: box.w, h: box.h });
  }
  return boxes;
}

function makeBox(id, x, y, w, h) {
  return { id, x, y, w, h };
}

function planTypography(ctx, state, width, height, zones) {
  const type = state.type;
  const review = planReview(ctx, type, width, height, zones.reviewH);
  const { title, subtitle, seal } = planTitleBlock(ctx, state, width, height, zones);
  const billing = planBilling(ctx, type, width, height, zones.billingTop);
  const elements = [review, title, subtitle, seal, billing].filter(Boolean);
  return {
    review,
    title,
    subtitle,
    seal,
    billing,
    elements: () => elements,
    boxes: () => elements.map(element => ({ ...element.box })),
  };
}

function planReview(ctx, type, width, height, stripH) {
  const stars = '★★★★★';
  const starSize = Math.max(11, Math.round(height * 0.021));
  ctx.font = `700 ${starSize}px ${CONDENSED_FAMILY}`;
  const starW = ctx.measureText(stars).width;
  const quote = String(type.quote || '').trim().toUpperCase();
  const quoteSize = fitFontSize(ctx, quote, width * 0.43, Math.max(11, Math.round(height * 0.021)), 'italic 700', CONDENSED_FAMILY);
  ctx.font = `italic 700 ${quoteSize}px ${CONDENSED_FAMILY}`;
  const quoteW = ctx.measureText(quote).width;
  const source = String(type.source || '').trim().toUpperCase();
  const sourceSize = Math.max(8, Math.round(height * 0.0105));
  ctx.font = `700 ${sourceSize}px ${CONDENSED_FAMILY}`;
  const sourceTracking = sourceSize * 0.28;
  const sourceW = trackedWidth(ctx, source, sourceTracking);
  return {
    kind: 'review',
    box: makeBox('review', 0, 0, width, stripH),
    stars,
    starX: width * 0.035,
    starY: stripH * 0.45,
    starSize,
    starW,
    quote,
    quoteX: width * 0.55,
    quoteY: stripH * 0.40,
    quoteSize,
    quoteW,
    source,
    sourceX: width * 0.55,
    sourceY: stripH * 0.78,
    sourceSize,
    sourceTracking,
    sourceW,
  };
}

function planTitleBlock(ctx, state, width, height, zones) {
  const type = state.type;
  const titleText = String(type.title || '').trim().toUpperCase();
  const subtitleText = String(type.subtitle || '').trim();
  const targetW = width * 0.65;
  let title = null;
  if (titleText) {
    const size = Math.round(Math.min(height * 0.178, zones.zoneH * 0.66));
    ctx.font = `italic 900 ${size}px ${TITLE_FAMILY}`;
    const metrics = ctx.measureText(titleText);
    const scaleX = Math.min(1.9, Math.max(0.9, targetW / Math.max(1, metrics.width)));
    const depth = Math.max(8, Math.min(12, Math.round(size * 0.07)));
    const outline = Math.max(4, Math.round(size * 0.085));
    const visualW = metrics.width * scaleX;
    const visualH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + depth + outline;
    const baselineOffset = metrics.actualBoundingBoxAscent + outline * 0.5;
    const ice = ['neon-night', 'teal-tide', 'ink-noir'].includes(state.colorGrade);
    const chrome = ice ? ICE_CHROME : WARM_CHROME;
    title = {
      kind: 'title',
      box: makeBox('title', width * 0.055, zones.titleTop, visualW, visualH),
      text: titleText,
      size,
      scaleX,
      depth,
      outline,
      baselineOffset,
      chrome,
    };
  }

  let subtitle = null;
  if (subtitleText) {
    const size = fitFontSize(ctx, subtitleText, width * 0.56, Math.round(Math.min(height * 0.05, width * 0.052)), '400', SCRIPT_FAMILY);
    ctx.font = `${size}px ${SCRIPT_FAMILY}`;
    const metrics = ctx.measureText(subtitleText);
    const stroke = Math.max(2, Math.round(size * 0.055));
    const visualW = metrics.width;
    const visualH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + stroke;
    subtitle = {
      kind: 'subtitle',
      box: makeBox('subtitle', width * 0.085, zones.titleTop, visualW, visualH),
      text: subtitleText,
      size,
      stroke,
      baselineOffset: metrics.actualBoundingBoxAscent + stroke * 0.5,
    };
  }

  const gap = Math.round(height * 0.012);
  const stackH = (title ? title.box.h : 0) + (subtitle ? gap + subtitle.box.h : 0);
  const stackTop = zones.titleTop + Math.max(4, (zones.zoneH - stackH) * 0.22);
  if (title) {
    title.box.y = stackTop;
    title.box.x = width * 0.055;
  }
  if (subtitle) {
    subtitle.box.y = stackTop + (title ? title.box.h + gap : 0);
    subtitle.box.x = width * 0.085;
  }

  const radius = Math.min(height * 0.05, width * 0.045);
  const sealY = stackTop + Math.max(radius * 1.2, stackH * 0.38);
  const seal = {
    kind: 'seal',
    box: makeBox('seal', width * 0.925 - radius, sealY - radius, radius * 2, radius * 2),
    text: String(type.seal || '').trim().toUpperCase(),
  };
  return { title, subtitle, seal };
}

function planBilling(ctx, type, width, height, top) {
  const zoneH = height - top;
  const release = String(type.release || '').trim().toUpperCase();
  const releaseSize = Math.max(10, Math.round(height * 0.019));
  ctx.font = `700 ${releaseSize}px ${CONDENSED_FAMILY}`;
  const releaseTracking = releaseSize * 0.28;
  const releaseW = trackedWidth(ctx, release, releaseTracking);
  const bigSize = Math.max(12, Math.round(height * 0.0175));
  const smallSize = Math.max(9, Math.round(height * 0.0125));
  const billing = String(type.billing || '').trim().toUpperCase();
  const tokens = billing.split(/\s+/).filter(Boolean).map((word, index) => ({ text: word, big: index % 2 === 0 }));
  const lines = splitBillingTokens(ctx, tokens, width * 0.66, bigSize, smallSize);
  return {
    kind: 'billing',
    box: makeBox('billing', 0, top, width, zoneH),
    release,
    releaseSize,
    releaseTracking,
    releaseW,
    lines,
    bigSize,
    smallSize,
  };
}

function splitBillingTokens(ctx, tokens, maxWidth, bigSize, smallSize) {
  const widths = tokens.map(token => {
    ctx.font = `700 ${token.big ? bigSize : smallSize}px ${CONDENSED_FAMILY}`;
    return ctx.measureText(token.text).width;
  });
  let scale = 1;
  for (let attempt = 0; attempt < 12; attempt++) {
    const lines = balanceLines(tokens, widths, maxWidth, scale);
    const widest = Math.max(0, ...lines.map(line => line.width));
    if (widest <= maxWidth) return { lines: lines.map(line => line.tokens), scale };
    scale *= Math.max(0.82, maxWidth / Math.max(1, widest));
  }
  return { lines: [tokens.slice(0, Math.ceil(tokens.length / 2)), tokens.slice(Math.ceil(tokens.length / 2))], scale };
}

function balanceLines(tokens, widths, maxWidth, scale) {
  const lines = [[], []];
  const totals = [0, 0];
  tokens.forEach((token, index) => {
    const target = totals[0] <= totals[1] ? 0 : 1;
    lines[target].push(token);
    totals[target] += widths[index] * scale + bigSizeSpace(scale);
  });
  return lines.map((line, index) => ({ tokens: line, width: totals[index] }));
}

function bigSizeSpace(scale) {
  return 7 * scale;
}

function settleOverlayOffsets(boxes, faces, zones, width, height) {
  const offsets = new Map();
  for (const box of boxes) {
    let best = { dx: 0, dy: 0, score: totalOverlap(box, faces) };
    if (best.score > 0.02) {
      const steps = [0.01, 0.02, 0.04, 0.07].map(fraction => Math.round(height * fraction));
      const vertical = [0, ...steps.flatMap(step => [-step, step])];
      const horizontal = [0, -Math.round(width * 0.01), Math.round(width * 0.01)];
      for (const dy of vertical) {
        for (const dx of horizontal) {
          const moved = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h };
          const score = totalOverlap(moved, faces);
          if (score < best.score) best = { dx, dy, score };
        }
      }
    }
    offsets.set(box.id, { dx: best.dx, dy: best.dy });
  }
  return offsets;
}

function drawTypography(ctx, plan, width, height) {
  if (plan.review) drawReview(ctx, plan.review, width);
  if (plan.title) drawMainTitle(ctx, plan.title);
  if (plan.subtitle) drawSubtitle(ctx, plan.subtitle);
  if (plan.seal) drawRoundSeal(ctx, plan.seal);
  if (plan.billing) drawCreditsAndBarcode(ctx, plan.billing, width, height);
}

function drawReview(ctx, plan, width) {
  const box = plan.box;
  ctx.save();
  const strip = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  strip.addColorStop(0, '#04060df5');
  strip.addColorStop(0.62, '#04060dc4');
  strip.addColorStop(1, '#04060d00');
  ctx.fillStyle = strip;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffcb45';
  ctx.font = `700 ${plan.starSize}px ${CONDENSED_FAMILY}`;
  ctx.fillText(plan.stars, plan.starX, box.y + plan.starY);

  ctx.font = `italic 700 ${plan.quoteSize}px ${CONDENSED_FAMILY}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(plan.quote, plan.quoteX, box.y + plan.quoteY);

  const ruleY = Math.round(box.y + plan.quoteY) + 0.5;
  const quoteLeft = plan.quoteX - plan.quoteW / 2;
  const quoteRight = plan.quoteX + plan.quoteW / 2;
  ctx.strokeStyle = '#ff4d9dcc';
  ctx.lineWidth = Math.max(1, plan.quoteSize * 0.06);
  ctx.beginPath();
  ctx.moveTo(plan.starX + plan.starW + width * 0.015, ruleY);
  ctx.lineTo(Math.max(plan.starX + plan.starW + width * 0.02, quoteLeft - width * 0.014), ruleY);
  ctx.moveTo(Math.min(width * 0.96, quoteRight + width * 0.014), ruleY);
  ctx.lineTo(width * 0.965, ruleY);
  ctx.stroke();

  ctx.font = `700 ${plan.sourceSize}px ${CONDENSED_FAMILY}`;
  ctx.fillStyle = '#d3dbea';
  drawTrackedText(ctx, plan.source, plan.sourceX, box.y + plan.sourceY, plan.sourceTracking, 'center');
  ctx.restore();
}

function drawMainTitle(ctx, plan) {
  const box = plan.box;
  ctx.save();
  ctx.translate(box.x, box.y + plan.baselineOffset);
  ctx.scale(plan.scaleX, 1);
  ctx.font = `italic 900 ${plan.size}px ${TITLE_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  ctx.fillStyle = plan.chrome.extrusion;
  for (let offset = plan.depth; offset >= 1; offset--) {
    ctx.fillText(plan.text, offset / plan.scaleX * 0.65, offset * 1.08);
  }

  ctx.shadowColor = plan.chrome.glow;
  ctx.shadowBlur = plan.size * 0.2;
  ctx.strokeStyle = '#05060b';
  ctx.lineWidth = plan.outline;
  ctx.strokeText(plan.text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = plan.chrome.innerStroke;
  ctx.lineWidth = Math.max(2, plan.outline * 0.34);
  ctx.strokeText(plan.text, 0, 0);

  const chrome = ctx.createLinearGradient(0, -plan.size * 0.62, 0, plan.size * 0.44);
  plan.chrome.stops.forEach(([stop, color]) => chrome.addColorStop(stop, color));
  ctx.fillStyle = chrome;
  ctx.fillText(plan.text, 0, 0);
  ctx.strokeStyle = plan.chrome.rim;
  ctx.lineWidth = Math.max(1, plan.size * 0.01);
  ctx.strokeText(plan.text, 0, -plan.size * 0.012);
  ctx.restore();
}

function drawSubtitle(ctx, plan) {
  const box = plan.box;
  ctx.save();
  ctx.font = `${plan.size}px ${SCRIPT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const baseline = box.y + plan.baselineOffset;
  ctx.lineWidth = plan.stroke;
  ctx.strokeStyle = '#080b14';
  ctx.strokeText(plan.text, box.x, baseline);
  ctx.shadowColor = '#ff3fad';
  ctx.shadowBlur = plan.size * 0.5;
  ctx.fillStyle = '#ff54b2';
  ctx.fillText(plan.text, box.x, baseline);
  ctx.shadowBlur = plan.size * 0.2;
  ctx.fillStyle = '#fff';
  ctx.fillText(plan.text, box.x, baseline);
  ctx.restore();
}

function drawRoundSeal(ctx, plan) {
  const box = plan.box;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const radius = box.w / 2;
  ctx.save();
  ctx.fillStyle = '#101522ed';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, radius * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
  ctx.strokeStyle = '#38e8f4';
  ctx.lineWidth = Math.max(1, radius * 0.035);
  ctx.stroke();
  let fontSize = Math.max(7, radius * 0.27);
  const lines = wrapWords(plan.text, 10).slice(0, 3);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(fontSize)}px ${CONDENSED_FAMILY}`;
  while (lines.some(line => ctx.measureText(line).width > radius * 1.35) && fontSize > 5) {
    fontSize -= 1;
    ctx.font = `700 ${Math.round(fontSize)}px ${CONDENSED_FAMILY}`;
  }
  lines.forEach((line, index) => ctx.fillText(line, cx, cy + (index - (lines.length - 1) / 2) * fontSize * 1.1));
  ctx.restore();
}

function drawCreditsAndBarcode(ctx, plan, width, height) {
  const box = plan.box;
  const zoneH = box.h;
  ctx.save();
  ctx.fillStyle = '#070912';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeStyle = '#4a2a4e';
  ctx.lineWidth = Math.max(1, height * 0.0016);
  ctx.beginPath();
  ctx.moveTo(0, Math.round(box.y) + 0.5);
  ctx.lineTo(width, Math.round(box.y) + 0.5);
  ctx.stroke();

  drawStudioMark(ctx, width * 0.055, box.y + zoneH * 0.52, zoneH * 0.29);

  ctx.fillStyle = '#ffd36b';
  ctx.font = `700 ${plan.releaseSize}px ${CONDENSED_FAMILY}`;
  drawTrackedText(ctx, plan.release, width * 0.5, box.y + zoneH * 0.27, plan.releaseTracking, 'center');

  const lineY = [box.y + zoneH * 0.56, box.y + zoneH * 0.84];
  plan.lines.lines.forEach((tokens, index) => {
    if (index > 1) return;
    drawBillingLine(ctx, tokens, width * 0.5, lineY[index], plan.lines.scale, plan.bigSize, plan.smallSize);
  });

  drawBarcode(ctx, width * 0.87, box.y + zoneH * 0.13, width * 0.09, zoneH * 0.74, plan.release);
  ctx.restore();
}

function drawStudioMark(ctx, cx, cy, radius) {
  ctx.save();
  ctx.fillStyle = '#0c1020';
  ctx.strokeStyle = '#ff4d9d';
  ctx.lineWidth = Math.max(2, radius * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#38e8f4';
  ctx.lineWidth = Math.max(1, radius * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.74, -Math.PI * 0.78, Math.PI * 0.34);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(radius * 0.82)}px ${CONDENSED_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NP', cx, cy + radius * 0.02);
  ctx.restore();
}

function drawBillingLine(ctx, tokens, centerX, baselineY, scale, bigSize, smallSize) {
  const space = bigSizeSpace(scale);
  const measured = tokens.map(token => {
    const size = Math.max(6, (token.big ? bigSize : smallSize) * scale);
    ctx.font = `700 ${size}px ${CONDENSED_FAMILY}`;
    return { token, size, width: ctx.measureText(token.text).width };
  });
  const total = measured.reduce((sum, item) => sum + item.width, 0) + space * Math.max(0, measured.length - 1);
  let cursor = centerX - total / 2;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e7ecf5';
  for (const item of measured) {
    ctx.font = `700 ${item.size}px ${CONDENSED_FAMILY}`;
    ctx.fillText(item.token.text, cursor, baselineY);
    cursor += item.width + space;
  }
  ctx.restore();
}

function drawBarcode(ctx, x, y, width, height, seedText) {
  const barcodeX = Math.round(x);
  const barcodeY = Math.round(y);
  const barcodeW = Math.max(42, Math.round(width));
  const barcodeH = Math.max(30, Math.round(height));
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(barcodeX, barcodeY, barcodeW, barcodeH);
  const digits = Array.from({ length: 10 }, (_, index) => {
    const code = (seedText.charCodeAt(index % Math.max(1, seedText.length)) || 49) + index * 7;
    return String(code % 10);
  }).join('');
  let cursor = barcodeX + 4;
  const base = digits.split('').map(Number);
  for (let index = 0; index < 64 && cursor < barcodeX + barcodeW - 5; index++) {
    const digit = base[index % base.length];
    const barWidth = index % 9 === 0 ? 3 : (digit + index) % 3 === 0 ? 2 : 1;
    if ((digit + index) % 5 !== 0) {
      ctx.fillStyle = '#080b14';
      ctx.fillRect(cursor, barcodeY + 2, barWidth, barcodeH - 13);
    }
    cursor += barWidth + ((digit + index) % 2) + 1;
  }
  ctx.fillStyle = '#080b14';
  ctx.font = `700 ${Math.max(7, Math.round(barcodeH * 0.09))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(digits, barcodeX + barcodeW / 2, barcodeY + barcodeH - 1);
  ctx.restore();
}

function fitFontSize(ctx, text, maxWidth, initialSize, prefix, family) {
  let size = initialSize;
  ctx.font = `${prefix} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 7) {
    size -= 1;
    ctx.font = `${prefix} ${size}px ${family}`;
  }
  return size;
}

function trackedWidth(ctx, text, tracking) {
  return [...text].reduce((sum, character) => sum + ctx.measureText(character).width, 0) + tracking * Math.max(0, text.length - 1);
}

function drawTrackedText(ctx, text, x, y, tracking, align) {
  const width = trackedWidth(ctx, text, tracking);
  let cursor = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  ctx.textAlign = 'left';
  for (const character of text) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + tracking;
  }
}

function wrapWords(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
