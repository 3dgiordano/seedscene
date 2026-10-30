// Builds the README gallery: a still of every scene in one of its eras, a GIF
// of THE JOURNEY (each era's card, then its scene), a GIF of the arcade
// scenes in motion, and a GIF of the C64 boot screen.
//
//   npm run gallery
//
// Everything is drawn by the same render page the mp4 renderer uses, so the
// gallery shows exactly what the tool produces.

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ffmpegPath from 'ffmpeg-static';
import puppeteer from 'puppeteer';
import { startServer } from './server.js';
import { ERA_NAMES } from '../src/core/eras.js';

const OUT = path.resolve('docs/gallery');

// One seed per scene, chosen to read as a word worth typing, and an era the
// scene belongs to, so that every era shows up somewhere.
export const GALLERY = [
  { style: 'plasma',      era: 'handheld', seed: '1989' },
  { style: 'dottunnel',   era: 'c64',      seed: 'warpspeed' },
  { style: 'copper',      era: 'amiga',    seed: 'copperlist' },
  { style: 'shadebobs',   era: 'amiga',    seed: 'shadebob' },
  { style: 'vectorballs', era: 'amiga',    seed: 'vectorballs' },
  { style: 'ripple',      era: 'amiga',    seed: 'raindrops' },
  { style: 'tunnel',      era: 'dos',      seed: 'insertdisk2' },
  { style: 'metaballs',   era: 'dos',      seed: 'lavalamp' },
  { style: 'fractal',     era: 'dos',      seed: 'julia' },
  { style: 'fireworks',   era: 'console',  seed: 'newyear' },
  { style: 'fire',        era: 'dos',      seed: 'inferno' },
  { style: 'kefrens',     era: 'amiga',    seed: 'copperwave' },
  { style: 'ball',        era: 'amiga',    seed: 'boing' },
  { style: 'rings',       era: 'amiga',    seed: 'moire' },
  { style: 'lcd',         era: 'arcade',   seed: 'juggler' },
  { style: 'scanner',     era: 'arcade',   seed: 'redsweep' },
  { style: 'footsteps',   era: 'console',  seed: 'impact' },
  { style: 'twister',     era: 'amiga',    seed: 'stonebar' },
  { style: 'bobs',        era: 'amiga',    seed: 'copperlist' },
  { style: 'dualchess',   era: 'amiga',    seed: 'zoomboard' },
  { style: 'chessfloor',  era: 'amiga',    seed: 'sunnfun' },
  { style: 'rubber',      era: 'amiga',    seed: 'jelly' },
  { style: 'bumplogo',    era: 'dos',      seed: 'emboss' },
  { style: 'cracktro',    era: 'amiga',    seed: 'warez' },
  { style: 'pyramid',     era: 'arcade',   seed: 'cubes' },
  { style: 'pipes',       era: 'dos',      seed: 'screensaver' },
  { style: 'starfield',   era: 'console',  seed: 'hyperspace' },
  { style: 'morph',       era: 'y2k',      seed: 'liquidmetal' },
  { style: 'outrun',      era: 'modern',   seed: 'nightdrive' },
  { style: 'paddles',     era: 'modern',   seed: 'rally' },
  { style: 'invaders',    era: 'arcade',   seed: 'formation' },
  { style: 'rocks',       era: 'arcade',   seed: 'vectorscope' },
  { style: 'maze',        era: 'arcade',   seed: 'powerpill' },
  { style: 'bricks',      era: 'arcade',   seed: 'brickwall' },
  { style: 'lightcycles', era: 'modern',   seed: 'neongrid' },
  { style: 'snake',       era: 'modern',   seed: 'longsnake' },
  { style: 'boxer',       era: 'arcade',   seed: 'titlefight' },
  { style: 'starfighter', era: 'console',  seed: 'hyperdrive' },
];

// The game-inspired scenes, in motion.
const ARCADE = GALLERY.slice(-9);

const STILL = { w: 640, h: 360, at: 10.5 };
// small enough that the README loads fast
const GIF = { w: 320, h: 180, fps: 8 };
const JOURNEY = { seed: 'seedscene', duration: 16 * ERA_NAMES.length, card: [0.3, 1.8], scene: [7.0, 8.1] };
const ARCADE_CLIP = [9.0, 10.6];

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(err))));
  });
}

async function openRender(page, origin, params, w, h) {
  const q = new URLSearchParams({ width: String(w), height: String(h), format: 'png', overlay: '1', ...params });
  await page.setViewport({ width: w, height: h });
  await page.goto(`${origin}/web/render.html?${q}`, { waitUntil: 'load' });
  await page.waitForFunction('window.SEEDSCENE || window.SEEDSCENE_ERROR');
  const err = await page.evaluate(() => window.SEEDSCENE_ERROR || null);
  if (err) throw new Error(err);
}

async function grab(page, frame) {
  const d = await page.evaluate((i) => window.SEEDSCENE.grab(i), frame);
  return Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const tmp = path.join(os.tmpdir(), `seedscene-gallery-${process.pid}`);
  await mkdir(tmp, { recursive: true });
  const { server, origin } = await startServer(0);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
      '--mute-audio', '--hide-scrollbars'],
  });

  try {
    const page = await browser.newPage();

    // ---- a still per scene
    for (const g of GALLERY) {
      await openRender(page, origin, { seed: g.seed, style: g.style, era: g.era, duration: '40', fps: '30' }, STILL.w, STILL.h);
      await writeFile(path.join(OUT, `${g.style}.png`), await grab(page, Math.round(STILL.at * 30)));
      console.log(`  ${g.style.padEnd(12)} ${g.era.padEnd(9)} seed "${g.seed}"`);
    }

    // ---- THE JOURNEY: each era's card, then a moment of its scene
    await openRender(page, origin, {
      seed: JOURNEY.seed, programme: 'journey', duration: String(JOURNEY.duration), fps: String(GIF.fps),
    }, GIF.w, GIF.h);
    const partSec = JOURNEY.duration / ERA_NAMES.length;
    let n = 0;
    for (let part = 0; part < ERA_NAMES.length; part++) {
      for (const [a, b] of [JOURNEY.card, JOURNEY.scene]) {
        for (let t = a; t < b; t += 1 / GIF.fps) {
          const frame = Math.round((part * partSec + t) * GIF.fps);
          await writeFile(path.join(tmp, `j${String(n++).padStart(4, '0')}.png`), await grab(page, frame));
        }
      }
    }
    await ffmpeg([
      '-framerate', String(GIF.fps), '-i', path.join(tmp, 'j%04d.png'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
      '-loop', '0', path.join(OUT, 'journey.gif'),
    ]);
    console.log(`  journey.gif (${n} frames)`);

    // ---- the arcade scenes, a moment of each, without the plates
    let m = 0;
    for (const g of ARCADE) {
      await openRender(page, origin, { seed: g.seed, style: g.style, era: g.era, duration: '40', fps: String(GIF.fps), overlay: '0' }, GIF.w, GIF.h);
      for (let t = ARCADE_CLIP[0]; t < ARCADE_CLIP[1]; t += 1 / GIF.fps) {
        await writeFile(path.join(tmp, `a${String(m++).padStart(4, '0')}.png`), await grab(page, Math.round(t * GIF.fps)));
      }
    }
    await ffmpeg([
      '-framerate', String(GIF.fps), '-i', path.join(tmp, 'a%04d.png'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
      '-loop', '0', path.join(OUT, 'arcade.gif'),
    ]);
    console.log(`  arcade.gif (${m} frames)`);

    // ---- the boot screen, captured as it plays: LOAD, the striped border,
    // READY., a key press, RUN, and the drop into the demo
    const boot = await browser.newPage();
    await boot.setViewport({ width: 640, height: 400 });
    const q = new URLSearchParams({ seed: 'readyprompt', style: 'copper', era: 'amiga', width: '640', height: '360' });
    await boot.goto(`${origin}/web/index.html?${q}`, { waitUntil: 'load' });
    const bootDir = path.join(tmp, 'boot');
    await mkdir(bootDir);
    const t0 = Date.now();
    let k = 0;
    let pressed = false;
    while (Date.now() - t0 < 11000) {
      if (!pressed && Date.now() - t0 > 7200) {
        pressed = true;
        await boot.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 500));
        await boot.keyboard.press('i');      // a clean frame for the GIF
      }
      await boot.screenshot({ path: path.join(bootDir, `b${String(k++).padStart(4, '0')}.png`) });
      await new Promise((r) => setTimeout(r, 60));
    }
    const fps = (k / ((Date.now() - t0) / 1000)).toFixed(2);
    await ffmpeg([
      '-framerate', fps, '-i', path.join(bootDir, 'b%04d.png'),
      '-vf', 'scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
      '-loop', '0', path.join(OUT, 'boot.gif'),
    ]);
    console.log(`  boot.gif (${k} frames)`);
  } finally {
    await browser.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
