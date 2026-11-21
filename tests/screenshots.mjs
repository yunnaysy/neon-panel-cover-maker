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
        const context = await browser.newContext({ viewport: { width: shot.w, height: shot.h }, deviceScaleFactor: 1 });
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
        console.log(`${shot.name} ${shot.w}x${shot.h} q=${info.quality} bytes=${info.bytes}`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
