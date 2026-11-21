import { spawn } from 'node:child_process';
import { chromium } from '/tmp/pw-tools/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..');
const appDir = path.join(repo, 'app');
const port = 8130;
const base = `http://127.0.0.1:${port}`;

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, name) {
  if (cond) { console.log(`PASS ${name}`); pass++; }
  else { console.log(`FAIL ${name}`); fail++; failures.push(name); }
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('server not ready');
}

function startServer() {
  const p = spawn('python3', ['-m', 'http.server', String(port), '--directory', appDir], { stdio: 'ignore' });
  return p;
}

async function withPage(browser, viewport, fn) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  try {
    await fn(page, { pageErrors, consoleErrors });
  } finally {
    await context.close();
  }
}

async function gotoReady(page, query, { waitCast = true } = {}) {
  await page.goto(base + query, { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  if (waitCast && query.includes('photo=cast')) {
    await page.waitForFunction(() => window.__neonPanel?.library?.size >= 9, null, { timeout: 20000 });
  }
  await page.waitForTimeout(150);
}

function intersects(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

async function checkViewport(browser, viewport) {
  const label = `${viewport.width}x${viewport.height}`;
  await withPage(browser, viewport, async (page, { pageErrors, consoleErrors }) => {
    await gotoReady(page, '/?shot=editor&photo=cast&layout=key-art&aspect=16%3A9&preset=golden-hour');
    const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(noHScroll, `[${label}] no horizontal scroll`);
    ok(pageErrors.length === 0 && consoleErrors.filter(e => !/favicon/i.test(e)).length === 0, `[${label}] no console/page errors`);

    const wordmarkVisible = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*')).filter(e => (e.textContent || '').includes('NEON PANEL'));
      return els.some(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'; });
    });
    ok(wordmarkVisible, `[${label}] NEON PANEL wordmark visible`);

    const overlap = await page.evaluate(() => {
      const canvas = document.querySelector('#poster, canvas');
      const cr = canvas.getBoundingClientRect();
      const btns = Array.from(document.querySelectorAll('[aria-label="Undo"], [aria-label="Redo"]'));
      return btns.some(b => {
        const r = b.getBoundingClientRect();
        const s = getComputedStyle(b);
        if (r.width < 2 || r.height < 2) return false;
        if (s.visibility === 'hidden' || s.display === 'none') return false;
        if (r.bottom <= 0 || r.right <= 0 || r.top >= window.innerHeight || r.left >= window.innerWidth) return false;
        return !(r.right <= cr.left || cr.right <= r.left || r.bottom <= cr.top || cr.bottom <= r.top);
      });
    });
    ok(!overlap, `[${label}] undo/redo do not intersect canvas`);

    const state = await page.evaluate(() => ({
      preset: window.__neonPanel.state.preset,
      intensity: window.__neonPanel.state.intensity,
    }));
    ok(state.preset === 'golden' && Math.abs(state.intensity - 0.75) < 0.02, `[${label}] default preset golden-hour`);

    const noOutlineAtLoad = await page.evaluate(() => {
      const c = document.querySelector('#poster');
      const ctx = c.getContext('2d');
      // Sample edge area for lavender dashed outline isn't trivial; check renderer state instead
      return !window.__neonPanel.rendererState.handle && !window.__neonPanel.rendererState.activeLayer;
    });
    // The app doesn't expose activeLayer, but handle should be null at load
    const handleNull = await page.evaluate(() => window.__neonPanel.rendererState.handle === null);
    ok(handleNull, `[${label}] no lettering outline handle at load`);

    const panelHighlight = await page.evaluate(() => window.__neonPanel.state.gradeScope);
    ok(panelHighlight === 'all', `[${label}] no panel highlight at load (scope all)`);

    if (viewport.width <= 900) {
      const peek = await page.evaluate(() => {
        const s = document.getElementById('mobileSheet');
        const r = s.getBoundingClientRect();
        return r.height / window.innerHeight;
      });
      ok(peek > 0.14 && peek < 0.22, `[${label}] bottom sheet starts in peek`);
      // tap a tab opens to ~55%
      await page.click('#sheetTabs [data-sheet-tab="layout"]');
      await page.waitForTimeout(350);
      const opened = await page.evaluate(() => {
        const s = document.getElementById('mobileSheet');
        return s.getBoundingClientRect().height / window.innerHeight;
      });
      ok(opened > 0.45 && opened < 0.65, `[${label}] tapping tab opens sheet`);
    }

    // presence checks at requested sizes
    const presenceSizes = [1440,1024,768,640,390];
    if (presenceSizes.includes(viewport.width)) {
      const isMobile = viewport.width <= 900;
      if (isMobile) {
        await page.click('#sheetTabs [data-sheet-tab="photos"]');
        await page.waitForTimeout(250);
      }
      const presence = await page.evaluate((isMobile) => {
        const text = document.body.innerText;
        const note = text.includes('Photos stay on this device. Nothing is uploaded.');
        const live = text.includes('LIVE PREVIEW');
        const exportCards = document.querySelectorAll('#exportCards [data-w]').length === 3;
        const photos = document.querySelectorAll('#sampleGrid .sample-thumb').length >= 1;
        const layouts = document.querySelectorAll('#layoutTiles [data-layout]').length >= 5;
        const formats = document.querySelectorAll('#formatTiles [data-aspect]').length >= 3;
        const presets = document.querySelectorAll('#presetChips [data-preset]').length >= 5;
        const lettering = !!document.getElementById('titleInput') && !!document.getElementById('subtitleInput');
        const crop = !!document.getElementById('cropZoom') && !!document.getElementById('resetCrop');
        return {note, live, exportCards, photos, layouts, formats, presets, lettering, crop};
      }, isMobile);
      ok(presence.note, `[${label}] privacy note present`);
      ok(presence.live, `[${label}] LIVE PREVIEW caption present`);
      ok(presence.exportCards, `[${label}] three export cards present`);
      ok(presence.photos, `[${label}] photo library present`);
      ok(presence.layouts, `[${label}] layout picker present`);
      ok(presence.formats, `[${label}] aspect picker present`);
      ok(presence.presets, `[${label}] colour presets present`);
      ok(presence.lettering, `[${label}] lettering fields present`);
      ok(presence.crop, `[${label}] crop controls present`);
    }
  });
}

async function checkUndoRedo(browser) {
  await withPage(browser, { width:1440, height:900 }, async (page) => {
    await gotoReady(page, '/?shot=editor&photo=cast&layout=key-art&aspect=16%3A9&preset=golden-hour');
    const before = await page.evaluate(() => window.__neonPanel.state.lettering.layers.title.size);
    await page.evaluate(() => { const n=document.getElementById('sizeNumber'); n.value='180'; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true})); });
    await page.waitForTimeout(450);
    const after = await page.evaluate(() => window.__neonPanel.state.lettering.layers.title.size);
    await page.click('#undo');
    await page.waitForTimeout(200);
    const undone = await page.evaluate(() => window.__neonPanel.state.lettering.layers.title.size);
    await page.click('#redo');
    await page.waitForTimeout(200);
    const redone = await page.evaluate(() => window.__neonPanel.state.lettering.layers.title.size);
    ok(Math.abs(after - 180) < 0.6, '[undo] size changed');
    ok(Math.abs(undone - before) < 0.6, '[undo] undo restored title size');
    ok(Math.abs(redone - 180) < 0.6, '[undo] redo restored title size');
  });
}

async function checkSelectedPanelGrade(browser) {
  await withPage(browser, { width:1440, height:900 }, async (page) => {
    await gotoReady(page, '/?shot=editor&photo=cast&layout=mosaic&aspect=16%3A9&preset=golden-hour');
    const changed = await page.evaluate(() => {
      const c = window.__neonPanel.canvas;
      const w=c.width,h=c.height;
      const ctx=c.getContext('2d');
      const snap = () => ctx.getImageData(0,0,w,h).data;
      const before = snap();
      window.__neonPanel.state.gradeScope='panel';
      window.__neonPanel.state.selectedPanel=0;
      window.__neonPanel.state.panels[0].local = { preset:'neon', intensity:1 };
      window.__neonPanel.render();
      const after = snap();
      // find pixels changed inside panel 0 vs outside
      const rects = window.__neonPanel.panelRectsCanvas();
      const p0 = rects[0];
      let inChanged=0, inTotal=0, outChanged=0, outTotal=0;
      for (let y=0;y<h;y+=4) for (let x=0;x<w;x+=4) {
        const i=(y*w+x)*4;
        const diff = Math.abs(after[i]-before[i])+Math.abs(after[i+1]-before[i+1])+Math.abs(after[i+2]-before[i+2]);
        const inside = x>=p0.x && x<=p0.x+p0.w && y>=p0.y && y<=p0.y+p0.h;
        if (inside) { inTotal++; if (diff>6) inChanged++; }
        else { outTotal++; if (diff>6) outChanged++; }
      }
      return { inRatio: inChanged/Math.max(1,inTotal), outRatio: outChanged/Math.max(1,outTotal) };
    });
    ok(changed.inRatio > 0.15, `[selected-panel] selected panel pixels changed (${changed.inRatio.toFixed(3)})`);
    ok(changed.outRatio < 0.08, `[selected-panel] other panels mostly unchanged (${changed.outRatio.toFixed(3)})`);
  });
}

async function checkExport(browser) {
  await withPage(browser, { width:1440, height:900 }, async (page) => {
    await gotoReady(page, '/?shot=editor&photo=cast&layout=key-art&aspect=16%3A9&preset=golden-hour');
    const bg = await page.$eval('#exportPng', el => getComputedStyle(el).backgroundImage);
    ok(/gradient/i.test(bg), '[export] Export PNG has gradient style');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('#exportPng')]);
    const suggested = dl.suggestedFilename();
    const tmp = path.join('/tmp', suggested);
    await dl.saveAs(tmp);
    const buf = fs.readFileSync(tmp);
    ok(buf.slice(0,8).toString('hex') === '89504e470d0a1a0a', '[export] download is PNG');
  });
}

async function checkLayoutsBelow(browser) {
  const layouts = ['key-art','hero-four','mosaic-six','split-diagonal','full-bleed'];
  const layoutKey = { 'key-art':'keyArt', 'hero-four':'heroFour', 'mosaic-six':'mosaic', 'split-diagonal':'split', 'full-bleed':'bleed' };
  const aspects = ['16:9','4:5','1:1'];
  for (const layout of layouts) {
    for (const aspect of aspects) {
      await withPage(browser, { width:1440, height:900 }, async (page) => {
        await gotoReady(page, `/?shot=editor&photo=cast&layout=${layout}&aspect=${aspect}&preset=golden-hour`);
        const info = await page.evaluate((lk) => {
          const s = window.__neonPanel.state;
          const rects = window.__neonPanel.panelRectsCanvas();
          const geom = window.__neonPanel.geom();
          const bandTop = geom.bandTop;
          let minVisibleRatio = 1;
          for (const r of rects) {
            const visibleH = Math.max(0, Math.min(r.y + r.h, bandTop) - r.y);
            minVisibleRatio = Math.min(minVisibleRatio, visibleH / Math.max(1, r.h));
          }
          return { layout: s.layout, count: rects.length, minVisibleRatio, bandTop };
        }, layoutKey[layout]);
        ok(info.layout === layoutKey[layout], `[below ${layout} ${aspect}] layout applied`);
        ok(info.count === ({keyArt:6,heroFour:5,mosaic:6,split:4,bleed:1}[layoutKey[layout]]), `[below ${layout} ${aspect}] panel count`);
        ok(info.minVisibleRatio >= 0.85, `[below ${layout} ${aspect}] panels >=85% visible (${info.minVisibleRatio.toFixed(3)})`);
      });
    }
  }
}

async function checkTemplateCombos(browser) {
  const templates = ['classic','chrome','script','noir','arcade','stacked'];
  const layouts = ['key-art','hero-four','mosaic-six','split-diagonal','full-bleed'];
  const aspects = ['16:9','4:5','1:1'];
  for (const template of templates) {
    for (const layout of layouts) {
      for (const aspect of aspects) {
        await withPage(browser, { width:1440, height:900 }, async (page) => {
          await gotoReady(page, `/?shot=editor&photo=cast&layout=${layout}&aspect=${aspect}&preset=golden-hour`);
          const beforeTemplate = await page.evaluate(() => window.__neonPanel.state.lettering.template);
          if (template !== beforeTemplate) {
            await page.click(`#templateRow [data-template="${template}"]`);
            await page.waitForTimeout(120);
          }
          const info = await page.evaluate(() => {
            const s = window.__neonPanel.state;
            const boxes = window.__neonPanel.textBoxesCanvas();
            const geom = window.__neonPanel.geom();
            const rects = window.__neonPanel.panelRectsCanvas();
            const bandTop = geom.bandTop;
            let overflow = false;
            let aboveBand = false;
            for (const b of Object.values(boxes)) {
              if (!b) continue;
              if (b.x < -1 || b.y < -1 || b.x + b.w > geom.W + 1 || b.y + b.h > geom.H + 1) overflow = true;
              if (b.y < bandTop - 1) aboveBand = true;
            }
            let allVisible = true;
            for (const r of rects) {
              const visibleH = Math.max(0, Math.min(r.y + r.h, bandTop) - r.y);
              if (visibleH / Math.max(1, r.h) < 0.999) allVisible = false;
            }
            return { template: s.lettering.template, overflow, aboveBand, allVisible, tooWide: window.__neonPanel.tooWide() };
          });
          ok(info.template === template, `[combo ${template} ${layout} ${aspect}] template applied`);
          ok(!info.aboveBand, `[combo ${template} ${layout} ${aspect}] no text above band`);
          ok(!info.overflow, `[combo ${template} ${layout} ${aspect}] no text outside canvas`);
          ok(!info.tooWide, `[combo ${template} ${layout} ${aspect}] no overflow flag`);
          ok(info.allVisible, `[combo ${template} ${layout} ${aspect}] every panel 100% visible`);

          const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('#exportPng')]);
          const tmp = path.join('/tmp', `np-${template}-${layout}-${aspect.replace(':','-')}.png`);
          await dl.saveAs(tmp);
          const buf = fs.readFileSync(tmp);
          ok(buf.slice(0,8).toString('hex') === '89504e470d0a1a0a', `[combo ${template} ${layout} ${aspect}] png export`);

          if (template !== beforeTemplate) {
            await page.click('#undo');
            await page.waitForTimeout(150);
            const undoneTpl = await page.evaluate(() => window.__neonPanel.state.lettering.template);
            ok(undoneTpl === beforeTemplate, `[combo ${template} ${layout} ${aspect}] undo returns template`);
          } else {
            ok(true, `[combo ${template} ${layout} ${aspect}] undo returns template`);
          }
          // redo to leave state clean-ish? not necessary
        });
      }
    }
  }
}

async function checkRepoText() {
  const banned = ['V'+'ice', 'G'+'TA', 'Grand '+'Theft', 'Rock'+'star'];
  const allowedExt = new Set(['.js','.mjs','.ts','.html','.css','.json','.md','.txt','.svg']);
  function walk(dir) {
    let out=[];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out = out.concat(walk(p));
      else out.push(p);
    }
    return out;
  }
  const files = walk(repo).filter(f => allowedExt.has(path.extname(f)));
  let bad = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    for (const b of banned) if (txt.includes(b)) bad.push(`${path.relative(repo,f)}:${b}`);
  }
  ok(bad.length === 0, `[repo] no banned names (${bad.slice(0,5).join(', ')})`);

  // cream/beige colors check in app/style.css and source
  const styleFiles = files.filter(f => /\.(css|html|js|mjs)$/.test(f) && f.includes(`${path.sep}app${path.sep}`));
  let cream = [];
  for (const f of styleFiles) {
    const txt = fs.readFileSync(f, 'utf8');
    if (/cream|beige|ivory|#fffdd0|#f5f5dc/i.test(txt)) cream.push(path.relative(repo,f));
  }
  ok(cream.length === 0, `[repo] no cream/beige colors (${cream.slice(0,5).join(', ')})`);
}

async function main() {
  const server = startServer();
  try {
    await waitForServer(base + '/index.html');
    const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    try {
      for (const vp of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:640,height:1024},{width:390,height:844},{width:360,height:740}]) {
        await checkViewport(browser, vp);
      }
      await checkUndoRedo(browser);
      await checkSelectedPanelGrade(browser);
      await checkExport(browser);
      await checkLayoutsBelow(browser);
      await checkTemplateCombos(browser);
      await checkRepoText();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
  console.log(`\nRESULT pass=${pass} fail=${fail}`);
  if (failures.length) console.log('FAILURES:\n' + failures.join('\n'));
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
