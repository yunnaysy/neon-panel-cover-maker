import test from 'node:test';
import assert from 'node:assert/strict';

import { LAYOUTS, LAYOUT_KEYS, LAYOUT_ALIASES, normalizeLayout, panelCount, buildPanels, pointInPolygon } from '../app/src/layouts.js';
import { createHistory } from '../app/src/history.js';
import { PRESETS, PRESET_KEYS, PRESET_ALIASES, normalizePreset, gradeImageData } from '../app/src/colorGrades.js';
import { TEMPLATES, TEMPLATE_ORDER, LAYER_RANGES, FONTS, templateLayers } from '../app/src/typography.js';
import { parseShot, applyShot } from '../app/src/shots.js';
import { ASPECTS, createInitialState } from '../app/src/state.js';

function clone(v){ return JSON.parse(JSON.stringify(v)); }

test('layouts: all expected layouts exist with correct panel counts', () => {
  const expected = { keyArt:6, heroFour:5, mosaic:6, split:4, bleed:1 };
  for (const [key,count] of Object.entries(expected)) {
    assert.ok(LAYOUT_KEYS.includes(key), `missing layout ${key}`);
    assert.equal(panelCount(key), count, `count for ${key}`);
  }
  assert.deepEqual([...LAYOUT_KEYS].sort(), Object.keys(expected).sort());
});

test('layouts: every layout x aspect gives polygons inside 0..1', () => {
  const aspects = [[16,9],[4,5],[1,1]];
  for (const key of LAYOUT_KEYS) {
    for (const [aw,ah] of aspects) {
      const W = aw*100, H = ah*100;
      const bandTop = H * 0.64; // below mode
      const photoH = bandTop;
      const u = Math.sqrt(W*H)/1000;
      const gx = (6*u)/W;
      const gy = (6*u)/Math.max(1,photoH);
      const polys = buildPanels(key, gx, gy);
      assert.equal(polys.length, panelCount(key), `${key} ${aw}:${ah} count`);
      for (const poly of polys) {
        assert.ok(poly.length >= 3, 'polygon points');
        for (const p of poly) {
          assert.ok(p.x >= -0.0001 && p.x <= 1.0001, `${key} x ${p.x}`);
          assert.ok(p.y >= -0.0001 && p.y <= 1.0001, `${key} y ${p.y}`);
        }
      }
    }
  }
});

test('layouts: BELOW reflow keeps panels above band', () => {
  const aspects = [[16,9],[4,5],[1,1]];
  for (const key of LAYOUT_KEYS) {
    for (const [aw,ah] of aspects) {
      const W = aw*100, H = ah*100;
      const bandTop = H * 0.64;
      const photoH = bandTop;
      const u = Math.sqrt(W*H)/1000;
      const polys = buildPanels(key, (6*u)/W, (6*u)/Math.max(1,photoH));
      for (const poly of polys) {
        for (const p of poly) {
          const yPx = p.y * photoH;
          assert.ok(yPx <= bandTop + 0.01, `${key} ${aw}:${ah} yPx ${yPx} <= ${bandTop}`);
        }
      }
    }
  }
});

test('layouts: URL aliases normalize', () => {
  assert.equal(normalizeLayout('key-art'), 'keyArt');
  assert.equal(normalizeLayout('hero-four'), 'heroFour');
  assert.equal(normalizeLayout('mosaic-six'), 'mosaic');
  assert.equal(normalizeLayout('split-diagonal'), 'split');
  assert.equal(normalizeLayout('full-bleed'), 'bleed');
  for (const k of LAYOUT_KEYS) assert.equal(normalizeLayout(k), k);
});

test('history: undo/redo, 80-step cap, redo cleared on new step', () => {
  let state = { n: 0 };
  const h = createHistory({ getState: () => state, setState: (s) => { state = s; }, limit: 80 });
  h.commit(); // no-op same state
  state = { n: 1 }; h.commit();
  state = { n: 2 }; h.commit();
  assert.equal(state.n, 2);
  h.undo(); assert.equal(state.n, 1);
  h.redo(); assert.equal(state.n, 2);
  h.undo(); state = { n: 3 }; h.commit();
  assert.equal(h.canRedo(), false);
  assert.equal(state.n, 3);
  h.undo(); assert.equal(state.n, 1);

  // cap
  let s2 = { n: 0 };
  const h2 = createHistory({ getState: () => s2, setState: (s) => { s2 = s; }, limit: 80 });
  for (let i=1;i<=90;i++){ s2 = { n:i }; h2.commit(); }
  let undos = 0;
  while(h2.canUndo()){ h2.undo(); undos++; }
  assert.ok(undos <= 79, `undos ${undos} should be <= 79`);
  assert.equal(s2.n, 11); // 90 commits + initial, shifted to keep 80 => oldest kept is n=11
});

test('color grades: intensity 0 leaves pixels unchanged', () => {
  const data = { data: new Uint8ClampedArray([10,20,30,255, 200,100,50,255]) };
  const before = Array.from(data.data);
  gradeImageData(data, 2, 1, 'golden', 0);
  assert.deepEqual(Array.from(data.data), before);
});

test('color grades: each preset changes a test pixel array', () => {
  const base = [120, 100, 90, 255, 40, 60, 80, 255, 200, 180, 160, 255, 30, 30, 30, 255];
  for (const p of PRESETS) {
    const data = { data: new Uint8ClampedArray(base) };
    gradeImageData(data, 2, 2, p.key, 0.75);
    assert.notDeepEqual(Array.from(data.data), base, `preset ${p.key} should change pixels`);
  }
});

test('color grades: aliases normalize', () => {
  assert.equal(normalizePreset('golden-hour'), 'golden');
  assert.equal(normalizePreset('neon-night'), 'neon');
  assert.equal(normalizePreset('magenta-dusk'), 'magenta');
  assert.equal(normalizePreset('neon-haze'), 'haze');
  assert.equal(normalizePreset('pastel-deco'), 'pastel');
  for (const k of PRESET_KEYS) assert.equal(normalizePreset(k), k);
});

test('typography: all 6 templates present with valid fonts and layers', () => {
  const expected = ['classic','chrome','script','noir','arcade','stacked'];
  assert.deepEqual(TEMPLATE_ORDER, expected);
  const fontNames = new Set(FONTS.map(f=>f.family));
  for (const key of expected) {
    const t = TEMPLATES[key];
    assert.ok(t, `template ${key}`);
    for (const layer of ['title','subtitle','billing']) {
      assert.ok(t.layers[layer], `${key}.${layer}`);
      assert.ok(fontNames.has(t.layers[layer].font), `${key}.${layer} font ${t.layers[layer].font}`);
    }
  }
});

test('typography: layer ranges and templateLayers clone', () => {
  assert.deepEqual(LAYER_RANGES.title.size, [48,220]);
  assert.deepEqual(LAYER_RANGES.subtitle.size, [18,80]);
  assert.deepEqual(LAYER_RANGES.billing.size, [9,30]);
  const a = templateLayers('classic');
  a.title.size = 999;
  const b = templateLayers('classic');
  assert.notEqual(b.title.size, 999);
});

test('shots: URL parsing and application', () => {
  const p = parseShot('?shot=cover&photo=cast&layout=key-art&aspect=4:5&preset=golden-hour&intensity=0.78&caption=HELLO&subtitle=Sub&quote=Q&badge=B&tagline=T');
  assert.equal(p.shot, 'cover');
  assert.equal(p.photo, 'cast');
  assert.equal(p.layout, 'key-art');
  assert.equal(p.aspect, '4:5');
  assert.equal(p.preset, 'golden-hour');
  assert.equal(p.intensity, '0.78');
  assert.equal(p.caption, 'HELLO');

  const state = createInitialState();
  applyShot(state, { layout:'hero-four', aspect:'1:1', preset:'magenta-dusk', intensity:'0.5', caption:'SUNSET RUN', subtitle:'S', quote:'Q', badge:'V1', tagline:'TAG', photo:'cast' });
  assert.equal(state.layout, 'heroFour');
  assert.equal(state.aspect, '1:1');
  assert.equal(state.preset, 'magenta');
  assert.equal(state.intensity, 0.5);
  assert.equal(state.text.title, 'SUNSET RUN');
  assert.equal(state.text.seal, 'V1');
  assert.equal(state.panels.length >= 5, true);
});

test('shots: accepts all required layout and preset ids', () => {
  for (const id of ['key-art','hero-four','mosaic-six','split-diagonal','full-bleed']) {
    assert.ok(normalizeLayout(id), id);
  }
  for (const id of ['golden-hour','neon-night','magenta-dusk','neon-haze','pastel-deco']) {
    assert.ok(normalizePreset(id), id);
  }
});
