import { spawn } from 'node:child_process';
import { chromium } from '/tmp/pw-tools/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..');
const appDir = path.join(repo, 'app');
const shotsPath = path.join(repo, 'shots.json');
const outDir = path.join(repo, 'screenshots');
const port = 8133;
const base = `http://127.0.0.1:${port}`;

async function waitForServer(url, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('server not ready');
}

function startServer() {
  return spawn('python3', ['-m', 'http.server', String(port), '--directory', appDir], { stdio: 'ignore' });
}

async function saveUnder250(page, outPath) {
  for (let quality = 92; quality >= 30; quality -= 4) {
    const buf = await page.screenshot({ type: 'jpeg', quality, fullPage: false });
    if (buf.length <= 250 * 1024 || quality <= 30) {
      fs.writeFileSync(outPath, buf);
      return { quality, bytes: buf.length };
    }
  }
  const buf = await page.screenshot({ type: 'jpeg', quality: 30, fullPage: false });
  fs.writeFileSync(outPath, buf);
  return { quality: 30, bytes: buf.length };
}

function jpegDimensions(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not jpeg');
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    i += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker >= 0xd0 && marker <= 0xd7) continue; // RSTn
    if (i + 2 > buf.length) break;
    const segLen = buf.readUInt16BE(i);
    if (segLen < 2) break;
    const isSOF = (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf);
    if (isSOF) {
      if (i + 7 > buf.length) break;
      const h = buf.readUInt16BE(i + 3);
      const w = buf.readUInt16BE(i + 5);
      return { w, h };
    }
    i += segLen;
  }
  throw new Error('SOF not found');
}

function verifyOutputs(shots) {
  let ok = true;
  for (const shot of shots) {
    const outPath = path.join(outDir, shot.name);
    const buf = fs.readFileSync(outPath);
    const { w, h } = jpegDimensions(buf);
    const longSide = Math.max(w, h);
    const shortSide = Math.min(w, h);
    const bytes = buf.length;
    const rules = [longSide <= 1280, shortSide >= 480, bytes <= 250 * 1024];
    const pass = rules.every(Boolean);
    console.log(`${shot.name} ${w}x${h} bytes=${bytes} ${pass ? 'OK' : 'FAIL'}`);
    if (!pass) {
      if (longSide > 1280) console.error(`  long side ${longSide} > 1280`);
      if (shortSide < 480) console.error(`  short side ${shortSide} < 480`);
      if (bytes > 250 * 1024) console.error(`  size ${bytes} > 256000`);
      ok = false;
    }
  }
  return ok;
}

async function main() {
  const shots = JSON.parse(fs.readFileSync(shotsPath, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const keep = new Set(shots.map(s => s.name));
  for (const f of fs.readdirSync(outDir)) {
    if (!keep.has(f)) fs.unlinkSync(path.join(outDir, f));
  }

  const server = startServer();
  try {
    await waitForServer(base + '/index.html');
    const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    try {
      for (const shot of shots) {
        const scale = shot.scale ?? 1;
        const context = await browser.newContext({
          viewport: { width: shot.w, height: shot.h },
          deviceScaleFactor: scale,
        });
        const page = await context.newPage();
        await page.goto(base + '/' + shot.query, { waitUntil: 'load', timeout: 20000 });
        await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 }).catch(() => {});
        if (shot.query.includes('photo=cast')) {
          await page.waitForFunction(() => window.__neonPanel?.library?.size >= 9, null, { timeout: 20000 }).catch(() => {});
        }
        await page.waitForTimeout(400);
        await page.evaluate(() => document.fonts?.ready);
        await page.waitForTimeout(200);
        const outPath = path.join(outDir, shot.name);
        const info = await saveUnder250(page, outPath);
        console.log(`captured ${shot.name} viewport=${shot.w}x${shot.h} scale=${scale} q=${info.quality} bytes=${info.bytes}`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }

  const ok = verifyOutputs(shots);
  if (!ok) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
