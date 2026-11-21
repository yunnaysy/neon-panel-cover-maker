// Neon Panel: an offline multi-panel cover-art poster studio (Node 22, standard library only).
// The app lives in the static app/ folder: plain HTML, CSS and ES modules with no build step,
// no external library and no runtime network request. It composes photo panels, applies colour
// grades, renders a neon title band with lettering templates, and exports PNG posters.
// This entry program copies app/ and screenshots/ into MAKEFUN_OUTPUT_DIR (or /output) and
// writes the dossier the judge reads with the vendored make.fun helper.
//
// Serve locally: node serve.ts
// Build output: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

let shots = 0;
try {
  shots = readdirSync(join(out, 'screenshots')).filter((name) => /\.(?:png|jpe?g)$/i.test(name)).length;
} catch {
  shots = 0;
}
console.log(`Neon Panel: wrote ${join(out, 'dossier.json')} with ${shots} screenshot(s) and the static studio in app/.`);
