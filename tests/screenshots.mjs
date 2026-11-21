// Regenerates screenshots/ with the current Neon Panel UI.
// Serve app/ on port 8130 first:
//   python3 -m http.server 8130 --directory app &
//   node tests/screenshots.mjs

import { chromium } from '/tmp/pw-tools/node_modules/playwright-core/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const base = process.env.NEON_PANEL_URL || 'http://localhost:8130/';
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
});

for (const shot of shots) {
  const context = await browser.newContext({ viewport: { width: shot.w, height: shot.h } });
  const page = await context.newPage();
  await page.goto(base + shot.query, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(350);

  let buffer = null;
  for (const quality of [88, 80, 72, 64, 56, 48]) {
    buffer = await page.screenshot({ type: 'jpeg', quality });
    if (buffer.length <= 255000) break;
  }
  writeFileSync(join(root, 'screenshots', shot.name), buffer);
  console.log(`${shot.name}: ${shot.w}x${shot.h}, ${buffer.length} bytes`);
  await context.close();
}

await browser.close();
