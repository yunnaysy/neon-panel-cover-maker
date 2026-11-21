// The title band and its ornaments: warm preset gradients, quote and stars, the starburst seal, palm and umbrella
// line drawings, the barcode and the fixed credit line beneath the billing layer.

export const BAND_PALETTES = {
  golden: ['#2a0f26', '#6d2439', '#d8704f', '#ffd7a3'],
  neon: ['#0b1530', '#3a1b4d', '#c33f9e', '#6ee7e6'],
  magenta: ['#2a0b2e', '#6a1a5a', '#e64a96', '#c9a6ff'],
  haze: ['#1a1030', '#4a2a6a', '#ef6ab4', '#8ff1ef'],
  pastel: ['#2a2038', '#665274', '#e7a8bd', '#c8ece4'],
};

function paletteOf(key) {
  return BAND_PALETTES[key] ?? BAND_PALETTES.golden;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawBand(ctx, state, geom) {
  const { W, H, u, bandTop, bandH, below } = geom;
  const pal = paletteOf(state.preset);

  if (below) {
    const g = ctx.createLinearGradient(0, bandTop, W, bandTop + bandH);
    g.addColorStop(0, pal[0]);
    g.addColorStop(0.42, pal[1]);
    g.addColorStop(0.78, pal[2]);
    g.addColorStop(1, pal[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, bandTop, W, H - bandTop);

    const shade = ctx.createLinearGradient(0, bandTop, 0, H);
    shade.addColorStop(0, 'rgba(16,13,24,0.08)');
    shade.addColorStop(0.55, 'rgba(16,13,24,0)');
    shade.addColorStop(1, 'rgba(16,13,24,0.34)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, bandTop, W, H - bandTop);
  } else {
    const scrim = ctx.createLinearGradient(0, bandTop, 0, H);
    scrim.addColorStop(0, 'rgba(16,13,24,0)');
    scrim.addColorStop(0.34, 'rgba(16,13,24,0.52)');
    scrim.addColorStop(0.74, 'rgba(16,13,24,0.86)');
    scrim.addColorStop(1, 'rgba(16,13,24,0.95)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, bandTop, W, H - bandTop);

    const tint = ctx.createLinearGradient(0, bandTop, W, H);
    tint.addColorStop(0, pal[0]);
    tint.addColorStop(0.55, pal[1]);
    tint.addColorStop(1, pal[2]);
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = tint;
    ctx.fillRect(0, bandTop, W, H - bandTop);
    ctx.restore();
  }

  const glow = ctx.createRadialGradient(W * 0.76, bandTop + bandH * 0.6, 0, W * 0.76, bandTop + bandH * 0.6, bandH * 0.72);
  glow.addColorStop(0, 'rgba(255,226,176,0.22)');
  glow.addColorStop(0.5, 'rgba(255,150,120,0.08)');
  glow.addColorStop(1, 'rgba(255,120,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, bandTop, W, H - bandTop);

  ctx.fillStyle = 'rgba(255,235,210,0.13)';
  ctx.fillRect(0, bandTop, W, Math.max(1, u * 0.8));
}

function star(ctx, cx, cy, r, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * inner;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function palm(ctx, x, y, s, flip, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(9, -42, 4, -96);
  ctx.stroke();

  const fronds = [
    [-58, -38, -30, -62],
    [-36, -64, -12, -76],
    [-4, -74, 14, -78],
    [30, -64, 46, -50],
    [54, -38, 62, -20],
    [-16, -52, 8, -60],
    [20, -46, 38, -40],
  ];
  for (const [cx, cy, ex, ey] of fronds) {
    ctx.beginPath();
    ctx.moveTo(4, -96);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function umbrella(ctx, x, y, s, flip, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -86);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -86, 54, Math.PI, Math.PI * 2);
  ctx.stroke();

  for (const dx of [-40, -20, 0, 20, 40]) {
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.lineTo(dx, -86 - Math.sqrt(Math.max(0, 54 * 54 - dx * dx)));
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(-54, -86);
  ctx.quadraticCurveTo(-40, -80, -27, -86);
  ctx.quadraticCurveTo(-13, -80, 0, -86);
  ctx.quadraticCurveTo(13, -80, 27, -86);
  ctx.quadraticCurveTo(40, -80, 54, -86);
  ctx.stroke();
  ctx.restore();
}

function drawSeal(ctx, state, geom) {
  const { W, u, bandTop, bandH } = geom;
  const cx = W * 0.868;
  const cy = bandTop + bandH * 0.47;
  const R = Math.min(bandH * 0.17, W * 0.074);

  ctx.save();
  ctx.beginPath();
  const points = 44;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? R : R * 0.84;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  g.addColorStop(0, '#ffe6b0');
  g.addColorStop(0.45, '#f7bd68');
  g.addColorStop(0.75, '#ff8a6b');
  g.addColorStop(1, '#ff5b9c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,241,210,0.72)';
  ctx.lineWidth = Math.max(1, u * 1.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.71, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(32,10,28,0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(247,189,104,0.8)';
  ctx.lineWidth = Math.max(1, u);
  ctx.stroke();

  let label = (state.text.seal || 'ORIGINAL').toUpperCase();
  let size = R * 0.24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe4b0';
  for (let i = 0; i < 20; i++) {
    ctx.font = `600 ${size}px "Oswald", "Arial Narrow", sans-serif`;
    ctx.letterSpacing = `${size * 0.08}px`;
    if (ctx.measureText(label).width <= R * 1.32 || size < R * 0.1) break;
    size *= 0.9;
  }
  ctx.fillText(label, cx, cy - R * 0.08);

  ctx.font = `600 ${R * 0.15}px "Oswald", "Arial Narrow", sans-serif`;
  ctx.letterSpacing = `${R * 0.03}px`;
  ctx.fillStyle = 'rgba(255,220,180,0.72)';
  ctx.fillText('NEON PANEL', cx, cy + R * 0.3);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

function drawBarcode(ctx, geom) {
  const { W, H, u, bandH } = geom;
  const bw = W * 0.115;
  const bh = bandH * 0.072;
  const bx = W * 0.855;
  const by = H - bh - bandH * 0.045;
  let seed = 17;
  let x = bx;
  ctx.save();
  ctx.fillStyle = 'rgba(245,240,233,0.78)';
  while (x < bx + bw) {
    seed = (seed * 9301 + 49297) % 233280;
    const bar = Math.max(1, u * (0.6 + (seed % 3) * 0.55));
    if (seed % 5 > 1) {
      const h = bh * (0.72 + ((seed >> 3) % 28) / 100);
      ctx.fillRect(x, by + (bh - h), bar, h);
    }
    x += bar + u * (0.7 + (seed % 2) * 0.5);
  }
  ctx.font = `600 ${6.2 * u}px "Oswald", "Arial Narrow", sans-serif`;
  ctx.letterSpacing = `${1.6 * u}px`;
  ctx.fillStyle = 'rgba(245,240,233,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText('NP · 02 · COAST SUNSET', bx + bw, by + bh + 8 * u);
  ctx.restore();
}

export function drawDecor(ctx, state, geom) {
  const { W, u, bandTop, bandH } = geom;

  const quote = state.text.quote || '';
  const qx = W * 0.055;
  const qy = bandTop + bandH * 0.115;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${10.5 * u}px "Oswald", "Arial Narrow", sans-serif`;
  ctx.letterSpacing = `${2.1 * u}px`;
  ctx.fillStyle = 'rgba(255,235,206,0.88)';
  ctx.fillText(quote.toUpperCase(), qx, qy);
  ctx.letterSpacing = '0px';
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 5; i++) {
    star(ctx, W * (0.795 + i * 0.032), qy, 6.4 * u, 0.44);
    ctx.fillStyle = '#ffd06f';
    ctx.fill();
  }
  ctx.restore();

  const lineColor = 'rgba(255,225,188,0.46)';
  palm(ctx, W * 0.035, bandTop + bandH * 0.97, bandH / 270, false, lineColor);
  umbrella(ctx, W * 0.965, bandTop + bandH * 0.985, bandH / 260, true, 'rgba(255,190,220,0.42)');

  drawSeal(ctx, state, geom);
  drawBarcode(ctx, geom);
}

export function drawCredit(ctx, state, geom, billingBox) {
  if (!billingBox) return;
  const { H, u } = geom;
  const size = 7.2 * u;
  const text = 'AN ORIGINAL NEON PANEL COVER · MADE FOR THE NIGHT';
  ctx.save();
  ctx.font = `600 ${size}px "Oswald", "Arial Narrow", sans-serif`;
  ctx.letterSpacing = `${1.9 * u}px`;
  ctx.fillStyle = 'rgba(245,240,233,0.6)';
  ctx.textBaseline = 'alphabetic';
  let x = billingBox.x;
  if (billingBox.align === 'center') x = billingBox.x + billingBox.w / 2;
  else if (billingBox.align === 'right') x = billingBox.x + billingBox.w;
  ctx.textAlign = billingBox.align || 'left';
  const y = Math.min(H - 6 * u, billingBox.y + billingBox.h + 11 * u);
  ctx.fillText(text, x, y);
  ctx.letterSpacing = '0px';
  ctx.restore();
}
