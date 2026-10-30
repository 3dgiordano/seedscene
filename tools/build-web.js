#!/usr/bin/env node
// Build the live demo as a static site: dist/ holds everything the browser
// needs and nothing else, so it can be copied to any host that serves static
// files - GitHub Pages, Netlify, an S3 bucket, nginx, a USB stick behind a
// local server. The pages load each other by relative paths, so the site works
// at the host's root or in a subfolder.
//
//   npm run build:web            -> dist/
//   npm run build:web -- out/web -> another folder
//
// Two needs of the browser, not of the host: the audio runs in an AudioWorklet,
// which browsers allow only over HTTPS (or on localhost); and ES modules must be
// served with a JavaScript content type, which every common host does.

import { cp, mkdir, rm, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/brand.js';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.resolve(ROOT, process.argv[2] || 'dist');
if (!OUT.startsWith(ROOT + path.sep)) throw new Error(`refusing to build outside the project: ${OUT}`);

// the live page and what it loads; the offline render page (web/render.*) is for the mp4 renderer only
const WEB = ['index.html', 'live.js', 'boot.js', 'menu.js', 'worklet.js'];

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, 'web'), { recursive: true });
for (const f of WEB) await cp(path.join(ROOT, 'web', f), path.join(OUT, 'web', f));
await cp(path.join(ROOT, 'src'), path.join(OUT, 'src'), { recursive: true });

// the front door: straight to the live page, keeping whatever the address carries
await writeFile(path.join(OUT, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEEDSCENE — one seed, one demo</title>
<link rel="icon" href="data:,">
<meta http-equiv="refresh" content="0; url=web/index.html?seed=seedscene&amp;autoplay=1">
<script>
  // a visitor with no seed of their own: the seed "seedscene", straight into AUTOPLAY
  const q = new URLSearchParams(location.search);
  if (!q.has('seed')) { q.set('seed', 'seedscene'); if (!q.has('autoplay')) q.set('autoplay', '1'); }
  location.replace('web/index.html?' + q + location.hash);
</script>
<style>body{background:#352879;color:#6c5eb5;font:16px monospace;padding:2em}a{color:#a59ce6}</style>
</head>
<body><p>SEEDSCENE ${VERSION} &mdash; <a href="web/index.html?seed=seedscene&amp;autoplay=1">RUN</a></p></body>
</html>
`);
// GitHub Pages would otherwise run the files through Jekyll
await writeFile(path.join(OUT, '.nojekyll'), '');

// what went in
async function size(dir) {
  let n = 0, files = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const s = await size(p); n += s.n; files += s.files; } else { n += (await stat(p)).size; files++; }
  }
  return { n, files };
}
const { n, files } = await size(OUT);
console.log(`\n  SEEDSCENE ${VERSION} static site -> ${path.relative(ROOT, OUT)}${path.sep}  (${files} files, ${(n / 1024).toFixed(0)} KB)`);
console.log('  copy that folder to any static host; open it over HTTPS (or localhost) for the sound\n');
