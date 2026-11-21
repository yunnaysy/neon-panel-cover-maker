// Neon Panel — end-to-end checks with playwright-core.
// Run with the static app server on port 8130:
//   python3 -m http.server 8130 --directory app &
//   node tests/playwright.test.mjs
// Chrome and playwright-core paths are provided by the grading environment.

import { chromium } from '/tmp/pw-tools/node_modules/playwright-core/index.mjs';
import { mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const BASE = process.env.NEON_PANEL_URL || 'http://localhost:8130/';
const VIEWPORTS = [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [640, 1024],
  [390, 844],
  [360, 740],
];

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
});
const downloadDir = mkdtempSync(join(tmpdir(), 'neon-panel-downloads-'));

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${name}\n      ${err.message}`);
  }
}

async function openPage(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__neonReady === true, { timeout: 20000 });
  return { context, page, errors };
}

async function activateTab(page, tab) {
  const isMobile = await page.evaluate(() => document.body.classList.contains('mobile-layout'));
  if (isMobile) {
    await page.locator(`.sheet-tab[data-tab="${tab}"]`).click();
  }
}

async function visibleUndoButton(page) {
  return page.locator('#btn-undo-mobile:visible, #btn-undo:visible').first();
}

// ---------------------------------------------------------------------------
console.log('\nDefault look and preview selection');
{
  const { context, page, errors } = await openPage(1440, 900);
  const initial = await page.evaluate(() => {
    const app = window.__neonApp;
    return {
      preset: app.state.colorPreset,
      activePreset: document.querySelector('#preset-picker .preset-btn.active')?.dataset.preset,
      guides: app.previewGuides(),
      canvasGuide: document.getElementById('cover-canvas').dataset.letteringGuide,
      canvasPanel: document.getElementById('cover-canvas').dataset.panelGuide,
    };
  });
  check('default colour preset is Golden Hour', () => {
    assert.equal(initial.preset, 'golden-hour');
    assert.equal(initial.activePreset, 'golden-hour');
  });
  check('no lettering outline or panel highlight is drawn at load', () => {
    assert.equal(initial.guides.lettering, false);
    assert.equal(initial.guides.panel, false);
    assert.equal(initial.canvasGuide, 'false');
    assert.equal(initial.canvasPanel, 'false');
  });

  const titlePoint = await page.evaluate(() => {
    const app = window.__neonApp;
    const info = app.getTypographyLayout().layers.title;
    const canvas = document.getElementById('cover-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.x + ((info.box.x + info.box.width / 2) / app.state.canvasWidth) * rect.width,
      y: rect.y + ((info.box.y + info.box.height / 2) / app.state.canvasHeight) * rect.height,
    };
  });
  await page.mouse.move(titlePoint.x, titlePoint.y);
  await page.waitForTimeout(80);
  const hovered = await page.evaluate(() => window.__neonApp.previewGuides());
  check('lettering outline appears on canvas hover', () => {
    assert.equal(hovered.lettering, true);
    assert.equal(hovered.panel, false);
  });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(80);
  const left = await page.evaluate(() => window.__neonApp.previewGuides());
  check('lettering outline hides when the pointer leaves the lettering', () => {
    assert.equal(left.lettering, false);
  });

  await page.locator('#title-input').focus();
  await page.waitForTimeout(80);
  const focused = await page.evaluate(() => window.__neonApp.previewGuides());
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(80);
  const blurred = await page.evaluate(() => window.__neonApp.previewGuides());
  check('lettering outline follows lettering-control focus', () => {
    assert.equal(focused.lettering, true);
    assert.equal(blurred.lettering, false);
  });

  await page.locator('#grade-scope [data-scope="panel"]').click();
  await page.waitForTimeout(60);
  const panelOn = await page.evaluate(() => window.__neonApp.previewGuides());
  await page.locator('#grade-scope [data-scope="global"]').click();
  await page.waitForTimeout(60);
  const panelOff = await page.evaluate(() => window.__neonApp.previewGuides());
  check('panel highlight and label show only in Selected panel scope', () => {
    assert.equal(panelOn.panel, true);
    assert.equal(panelOff.panel, false);
  });
  check('default-look checks have no console errors', () => assert.deepEqual(errors, []));
  await context.close();
}

// ---------------------------------------------------------------------------
console.log('\nResponsive + feature presence');
for (const [width, height] of VIEWPORTS) {
  const { context, page, errors } = await openPage(width, height);
  const label = `${width}x${height}`;
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    text: document.body.innerText,
  }));
  check(`${label} has no horizontal scroll`, () => {
    assert.equal(metrics.scrollWidth, metrics.innerWidth, `document scrollWidth ${metrics.scrollWidth} != ${metrics.innerWidth}`);
    assert.equal(metrics.bodyScrollWidth, metrics.innerWidth, `body scrollWidth ${metrics.bodyScrollWidth} != ${metrics.innerWidth}`);
  });

  check(`${label} shows the neon brand header`, () => {
    assert.match(metrics.text, /NEON PANEL/);
    assert.match(metrics.text, /Build a city after dark\./);
    assert.match(metrics.text, /STUDIO 02/);
    assert.match(metrics.text, /OFFLINE/);
  });

  check(`${label} keeps the photo privacy note`, () => {
    assert.match(metrics.text, /Photos stay on this device\. Nothing is uploaded\./);
  });

  check(`${label} keeps LIVE PREVIEW / MADE WITH NEON PANEL caption`, () => {
    assert.match(metrics.text, /LIVE PREVIEW/);
    assert.match(metrics.text, /MADE WITH NEON PANEL/);
  });

  const controls = await page.evaluate(() => ({
    exports: ['export-landscape', 'export-portrait', 'export-square'].every(id => document.getElementById(id)),
    library: !!document.getElementById('sample-grid'),
    layouts: document.querySelectorAll('#layout-picker .layout-btn').length,
    aspects: document.querySelectorAll('#aspect-picker .btn-chip').length,
    presets: document.querySelectorAll('#preset-picker .preset-btn').length,
    fields: ['title-input', 'subtitle-input', 'tagline-input', 'badge-input', 'quote-input'].every(id => document.getElementById(id)),
    crop: ['zoom-slider', 'pan-x-slider', 'pan-y-slider', 'btn-reset-crop'].every(id => document.getElementById(id)),
  }));
  check(`${label} keeps every v2 control`, () => {
    assert.equal(controls.exports, true);
    assert.equal(controls.library, true);
    assert.equal(controls.layouts, 5);
    assert.equal(controls.aspects, 3);
    assert.equal(controls.presets, 5);
    assert.equal(controls.fields, true);
    assert.equal(controls.crop, true);
  });

  const rects = await page.evaluate(() => {
    const pick = id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return { canvas: pick('cover-canvas'), undo: pick('btn-undo') || pick('btn-undo-mobile'), redo: pick('btn-redo') || pick('btn-redo-mobile') };
  });
  check(`${label} undo/redo never overlaps the poster`, () => {
    assert.ok(rects.canvas && rects.undo && rects.redo, 'missing canvas or history button rect');
    const intersects = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    assert.equal(intersects(rects.undo, rects.canvas), false, 'undo overlaps canvas');
    assert.equal(intersects(rects.redo, rects.canvas), false, 'redo overlaps canvas');
    if (width <= 900) {
      assert.ok(rects.undo.width >= 44 && rects.undo.height >= 44, 'mobile undo target below 44px');
      assert.ok(rects.redo.width >= 44 && rects.redo.height >= 44, 'mobile redo target below 44px');
    } else {
      assert.ok(rects.undo.width <= 40 && rects.undo.height <= 40, 'desktop undo should be an icon-sized square');
      assert.ok(rects.redo.width <= 40 && rects.redo.height <= 40, 'desktop redo should be an icon-sized square');
    }
  });

  const exportStyle = await page.evaluate(() => {
    const btn = ['btn-export-preview', 'btn-export-mobile']
      .map(id => document.getElementById(id))
      .find(el => el && el.getBoundingClientRect().width > 0);
    if (!btn) return null;
    const style = getComputedStyle(btn);
    return { image: style.backgroundImage, text: btn.innerText, radius: style.borderRadius };
  });
  check(`${label} Export PNG uses the bright gradient call-to-action`, () => {
    assert.ok(exportStyle, 'missing visible Export PNG button');
    assert.match(exportStyle.text, /Export PNG/);
    assert.match(exportStyle.text, /↗/);
    assert.match(exportStyle.image, /linear-gradient/);
    assert.ok(parseFloat(exportStyle.radius) >= 12, 'Export PNG should be pill-shaped');
  });

  if (width <= 900) {
    const sheet = await page.evaluate(() => {
      const app = window.__neonApp;
      const el = document.getElementById('mobile-sheet');
      return {
        state: app.sheetState(),
        attr: el?.dataset.state,
        height: el?.getBoundingClientRect().height,
        viewport: window.innerHeight,
      };
    });
    check(`${label} bottom sheet starts in peek`, () => {
      assert.equal(sheet.state, 'peek');
      assert.equal(sheet.attr, 'peek');
      assert.ok(sheet.height >= sheet.viewport * 0.15, `sheet ${sheet.height}px is too tall for peek`);
      assert.ok(sheet.height <= sheet.viewport * 0.22, `sheet ${sheet.height}px is too short for peek`);
    });
  }

  // Undo then redo restores the title size.
  await activateTab(page, 'type');
  if (width <= 900) {
    const opened = await page.evaluate(() => window.__neonApp.sheetState());
    check(`${label} tapping a tab opens the peek sheet to half`, () => assert.equal(opened, 'half'));
  }
  const sizeInput = page.locator('#letter-size-number');
  await sizeInput.scrollIntoViewIfNeeded();
  const previous = await sizeInput.inputValue();
  const targetSize = previous === '180' ? '176' : '180';
  await sizeInput.fill(targetSize);
  await sizeInput.dispatchEvent('change');
  await page.waitForTimeout(550);
  const changed = await sizeInput.inputValue();
  const undoBtn = await visibleUndoButton(page);
  await undoBtn.click();
  await page.waitForTimeout(80);
  const undone = await sizeInput.inputValue();
  const redoBtn = page.locator('#btn-redo-mobile:visible, #btn-redo:visible').first();
  await redoBtn.click();
  await page.waitForTimeout(80);
  const redone = await sizeInput.inputValue();
  check(`${label} undo then redo restores the title size`, () => {
    assert.equal(changed, targetSize);
    assert.notEqual(undone, targetSize);
    assert.equal(redone, targetSize);
  });

  // Selected-panel grade changes only that panel locally.
  await activateTab(page, 'colour');
  await page.locator('#grade-scope [data-scope="panel"]').click();
  const beforeAfter = await page.evaluate(async () => {
    const app = window.__neonApp;
    const panels = app.computePanelsForState(app.state.canvasWidth, app.state.canvasHeight, 'below');
    const idx = app.state.activePanelIndex;
    const rect = panels[idx];
    const ctx = document.getElementById('cover-canvas').getContext('2d');
    const sample = () => {
      const x = Math.max(0, Math.round(rect.x + rect.width * 0.35));
      const y = Math.max(0, Math.round(rect.y + rect.height * 0.35));
      const w = Math.max(1, Math.round(rect.width * 0.3));
      const h = Math.max(1, Math.round(rect.height * 0.3));
      const d = ctx.getImageData(x, y, w, h).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      return [r / n, g / n, b / n];
    };
    const before = sample();
    document.querySelector('#preset-picker [data-preset="neon-night"]').click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = sample();
    return {
      before, after, idx,
      scope: app.state.gradeScope,
      local: app.state.panelPhotos[idx]?.gradePreset,
    };
  });
  check(`${label} selected-panel grade works`, () => {
    assert.equal(beforeAfter.scope, 'panel');
    assert.equal(beforeAfter.local, 'neon-night');
    const delta = beforeAfter.before.reduce((sum, v, i) => sum + Math.abs(v - beforeAfter.after[i]), 0);
    assert.ok(delta > 4, `panel pixels did not change enough (${delta})`);
  });

  // Export PNG downloads.
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  const exportBtn = width <= 900 ? page.locator('#btn-export-mobile') : page.locator('#btn-export-preview');
  await exportBtn.click();
  const download = await downloadPromise;
  const path = join(downloadDir, download.suggestedFilename());
  await download.saveAs(path);
  check(`${label} exports a PNG`, () => {
    assert.match(download.suggestedFilename(), /\.png$/i);
    assert.ok(statSync(path).size > 10000, 'PNG is unexpectedly small');
    const head = readFileSync(path).subarray(0, 8);
    assert.deepEqual([...head], [137, 80, 78, 71, 13, 10, 26, 10]);
  });

  check(`${label} has 0 console errors`, () => assert.deepEqual(errors, []));
  await context.close();
}

// ---------------------------------------------------------------------------
console.log('\nItem 1: panels reflow above the lettering band');
{
  const { context, page, errors } = await openPage(1440, 900);
  const result = await page.evaluate(async () => {
    const { LAYOUT_PRESETS, getLayoutPanels, computePanelPixelRects } = await import('./src/layouts.js');
    const aspects = [[1920, 1080], [1080, 1350], [1080, 1080]];
    const failures = [];
    const rows = [];
    for (const layout of LAYOUT_PRESETS) {
      for (const [w, h] of aspects) {
        const bandTop = h * 0.635;
        const panels = computePanelPixelRects(layout.id, w, h, 10, { photoHeight: 0.635 });
        const raw = getLayoutPanels(layout.id, w, h * 0.635, w / (h * 0.635));
        const visible = panels.map(p => {
          const ix = Math.max(0, Math.min(p.x + p.width, w) - Math.max(p.x, 0));
          const iy = Math.max(0, Math.min(p.y + p.height, bandTop) - Math.max(p.y, 0));
          return (ix * iy) / Math.max(1, p.width * p.height);
        });
        const minVisible = Math.min(...visible);
        rows.push({ layout: layout.id, w, h, count: panels.length, expected: raw.length, minVisible });
        if (minVisible < 0.85) failures.push(`${layout.id} ${w}x${h} visible ${minVisible}`);
        if (panels.length !== raw.length) failures.push(`${layout.id} ${w}x${h} count ${panels.length} != ${raw.length}`);
        if (panels.length !== layout.count) failures.push(`${layout.id} ${w}x${h} count ${panels.length} != preset ${layout.count}`);
      }
    }
    return { failures, rows };
  });
  check('all 15 layout x aspect BELOW combinations keep panels >=85% visible and correct count', () => {
    assert.deepEqual(result.failures, []);
  });
  check('panel check produced 15 rows', () => assert.equal(result.rows.length, 15));
  check('panel check has no console errors', () => assert.deepEqual(errors, []));
  await context.close();
}

// ---------------------------------------------------------------------------
console.log('\nItem 9: 90 template/layout/aspect combinations');
{
  const { context, page, errors } = await openPage(1440, 900);
  const result = await page.evaluate(async () => {
    const { LAYOUT_PRESETS, computePanelPixelRects } = await import('./src/layouts.js');
    const { getTypographyLayout, LETTERING_TEMPLATES, cloneLayers, getBandGeometry } = await import('./src/typography.js');
    const app = window.__neonApp;
    const aspects = [[1920, 1080], [1080, 1350], [1080, 1080]];
    const failures = [];
    let combos = 0;
    for (const template of LETTERING_TEMPLATES) {
      for (const layout of LAYOUT_PRESETS) {
        for (const [w, h] of aspects) {
          combos++;
          const typo = {
            ...app.state.typography,
            template: template.id,
            layers: cloneLayers(template.layers),
            colorPreset: app.state.colorPreset,
          };
          const layoutInfo = getTypographyLayout(typo, w, h);
          const bandTop = h * 0.635;
          const geo = getBandGeometry(w, h);
          for (const name of ['title', 'subtitle', 'billing']) {
            const info = layoutInfo.layers[name];
            const b = info.box;
            if (b.y < bandTop - 1) failures.push(`${template.id}/${layout.id}/${w}x${h}/${name} above band`);
            if (b.y + b.height > h + 1) failures.push(`${template.id}/${layout.id}/${w}x${h}/${name} below canvas`);
            if (b.x < -1 || b.x + b.width > w + 1) failures.push(`${template.id}/${layout.id}/${w}x${h}/${name} outside canvas horizontally`);
          }
          if (layoutInfo.layers.title.inkHeight > geo.bandH * 0.56 + 1) failures.push(`${template.id}/${layout.id}/${w}x${h} title ink too tall`);
          if (layoutInfo.anyOverflow) failures.push(`${template.id}/${layout.id}/${w}x${h} overflow`);
          const panels = computePanelPixelRects(layout.id, w, h, 10, { photoHeight: 0.635 });
          if (panels.length !== layout.count) failures.push(`${template.id}/${layout.id}/${w}x${h} panel count`);
          for (const panel of panels) {
            const ix = Math.max(0, Math.min(panel.x + panel.width, w) - Math.max(panel.x, 0));
            const iy = Math.max(0, Math.min(panel.y + panel.height, bandTop) - Math.max(panel.y, 0));
            const visible = (ix * iy) / Math.max(1, panel.width * panel.height);
            if (visible < 0.999) failures.push(`${template.id}/${layout.id}/${w}x${h} panel only ${visible} visible`);
          }
        }
      }
    }
    return { combos, failures };
  });
  check('all 90 template/layout/aspect text boxes stay inside the band/canvas, no overflow', () => {
    assert.equal(result.combos, 90);
    assert.deepEqual(result.failures, []);
  });

  // Every template exports a real PNG.
  const downloadResults = [];
  for (const templateId of ['classic-neon', 'chrome-blockbuster', 'neon-script-sign', 'minimal-noir', 'retro-arcade', 'stacked-bold']) {
    await page.evaluate(id => {
      const app = window.__neonApp;
      app.applyTemplate(id);
    }, templateId);
    await page.waitForTimeout(120);
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.evaluate(() => window.__neonApp.exportCoverPng(window.__neonApp.state, 1080, 1080, 'template-test.png'));
    const download = await downloadPromise;
    const path = join(downloadDir, `${templateId}.png`);
    await download.saveAs(path);
    downloadResults.push({ templateId, size: statSync(path).size });
  }
  check('PNG export works for all 6 templates', () => {
    assert.equal(downloadResults.length, 6);
    for (const item of downloadResults) assert.ok(item.size > 10000, `${item.templateId} PNG too small`);
  });

  // Undo after a template click returns to the previous template.
  const templateUndo = await page.evaluate(async () => {
    const app = window.__neonApp;
    app.applyTemplate('classic-neon');
    const before = app.state.typography.template;
    app.applyTemplate('retro-arcade');
    const after = app.state.typography.template;
    app.undo();
    const undone = app.state.typography.template;
    app.redo();
    const redone = app.state.typography.template;
    return { before, after, undone, redone };
  });
  check('undo after a template click returns to the previous template', () => {
    assert.equal(templateUndo.before, 'classic-neon');
    assert.equal(templateUndo.after, 'retro-arcade');
    assert.equal(templateUndo.undone, 'classic-neon');
    assert.equal(templateUndo.redone, 'retro-arcade');
  });

  // Template cards use real canvases and mark the active one.
  await activateTab(page, 'type');
  const cards = await page.evaluate(() => {
    const list = [...document.querySelectorAll('#template-cards .template-card')];
    return {
      count: list.length,
      canvases: list.every(card => card.querySelector('canvas')?.width > 0),
      active: list.filter(card => card.classList.contains('active')).length,
    };
  });
  check('6 template cards with canvas thumbnails and one active outline', () => {
    assert.equal(cards.count, 6);
    assert.equal(cards.canvases, true);
    assert.ok(cards.active >= 1);
  });

  check('template suite has no console errors', () => assert.deepEqual(errors, []));
  await context.close();
}

// ---------------------------------------------------------------------------
console.log('\nLettering placement switch');
{
  const { context, page } = await openPage(1440, 900);
  const placement = await page.evaluate(() => {
    const app = window.__neonApp;
    const before = app.state.letteringPlacement;
    document.querySelector('#placement-switch [data-placement="over"]').click();
    const over = app.state.letteringPlacement;
    document.querySelector('#placement-switch [data-placement="below"]').click();
    const below = app.state.letteringPlacement;
    return { before, over, below };
  });
  check('placement defaults to BELOW and switches to OVER / BELOW', () => {
    assert.equal(placement.before, 'below');
    assert.equal(placement.over, 'over');
    assert.equal(placement.below, 'below');
  });
  await context.close();
}

// ---------------------------------------------------------------------------
console.log('\nKeyboard shortcuts, typing guard, auto-fit and line breaks');
{
  const { context, page } = await openPage(1440, 900);
  const result = await page.evaluate(async () => {
    const app = window.__neonApp;
    const size = document.getElementById('letter-size-number');
    size.value = '180';
    size.dispatchEvent(new Event('input', { bubbles: true }));
    size.dispatchEvent(new Event('change', { bubbles: true }));
    app.commitHistory();
    const title = document.getElementById('title-input');
    title.focus();
    title.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    const afterTypingGuard = app.state.typography.layers.title.size;
    title.blur();
    app.undo();
    const afterUndo = app.state.typography.layers.title.size;
    app.redo();
    const afterRedo = app.state.typography.layers.title.size;
    app.undo();
    app.redo();
    return { afterTypingGuard, afterUndo, afterRedo };
  });
  check('Ctrl/Cmd+Z is ignored while typing in a text field', () => {
    assert.equal(result.afterTypingGuard, 180);
  });
  check('undo/redo return the title size to its prior value', () => {
    assert.notEqual(result.afterUndo, 180);
    assert.equal(result.afterRedo, 180);
  });

  const fit = await page.evaluate(async () => {
    const { getTypographyLayout } = await import('./src/typography.js');
    const app = window.__neonApp;
    app.state.typography.mainTitle = 'NEON LIGHTS FOREVER';
    app.state.typography.autoFit = false;
    app.state.typography.layers.title.size = 220;
    app.state.typography.layers.title.spacing = 20;
    app.syncUI();
    app.redraw();
    const overflowWarn = !document.getElementById('overflow-warning').hidden;
    app.state.typography.autoFit = true;
    app.syncUI();
    app.redraw();
    const hiddenWhenFit = document.getElementById('overflow-warning').hidden;
    app.state.typography.mainTitle = 'NEON/LIGHTS';
    const lo = getTypographyLayout(app.state.typography, 1920, 1080);
    const slashLines = lo.layers.title.lines.length;
    return { overflowWarn, hiddenWhenFit, slashLines };
  });
  check('auto-fit off shows the too-wide warning; auto-fit on hides it', () => {
    assert.equal(fit.overflowWarn, true);
    assert.equal(fit.hiddenWhenFit, true);
  });
  check('title slash creates a line break', () => assert.equal(fit.slashLines, 2));
  await context.close();
}

await browser.close();
if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll Neon Panel checks passed.');
