// Offline render: audio in Node, frames in headless Chrome, muxed by ffmpeg.
//
// Both sides build the score from the same seed with the same module, so the
// soundtrack Node renders and the picture Chrome draws describe the same piece.

import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ffmpegPath from 'ffmpeg-static';
import puppeteer from 'puppeteer';

import { composeScore, Synth, SAMPLE_RATE } from '../src/core/music.js';
import { composeJourney, composeAutoplay, ProgrammeSynth } from '../src/core/journey.js';
import { chipFor } from '../src/core/chips.js';
import { encodeWav } from './wav.js';
import { startServer } from './server.js';

/** Render the soundtrack (a demo, or a programme) to a 16-bit WAV buffer. */
export function renderAudio(seed, duration, music, programme = null, era = null, bornIn = null) {
  const score = programme === 'journey' ? composeJourney(seed, duration)
    : programme === 'autoplay' ? composeAutoplay(seed, duration, bornIn)
      : composeScore(seed, duration, music, chipFor(era, seed));
  const n = score.totalSamples;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const synth = programme ? new ProgrammeSynth(score) : new Synth(score, seed);
  const block = 8192;
  for (let o = 0; o < n; o += block) synth.render(L, R, o, Math.min(block, n - o));
  return { wav: encodeWav(L, R, SAMPLE_RATE), score };
}

function bar(frac, width = 28) {
  const n = Math.round(frac * width);
  return '[' + '#'.repeat(n) + '-'.repeat(width - n) + ']';
}

/**
 * @param {object} opts seed, style, width, height, duration, fps, out, crf,
 *                      format, overlay, quiet
 */
export async function renderVideo(opts) {
  const {
    seed, style, width, height, duration, fps, out,
    crf = 18, format = 'png', overlay = true, quiet = false, gpu = false,
    music, era, programme = null, bornIn = null, greets = [],
  } = opts;

  const log = quiet ? () => {} : (s) => process.stdout.write(s);
  const t0 = Date.now();

  // 1. soundtrack ---------------------------------------------------------
  log(`  audio   rendering ${duration}s of ${SAMPLE_RATE} Hz stereo...`);
  const { wav, score } = renderAudio(seed, duration, music, programme, era, bornIn);
  const tmp = path.join(os.tmpdir(), `seedscene-${process.pid}-${Date.now()}`);
  await mkdir(tmp, { recursive: true });
  const wavPath = path.join(tmp, 'track.wav');
  await writeFile(wavPath, wav);
  if (programme) {
    log(` done (${score.count} parts of ${score.partSec.toFixed(1)}s)\n`);
  } else {
    log(` done (${score.meta.musicLabel}, ${score.meta.bpm} bpm ${score.meta.rootName} ${score.meta.scaleLabel}, ${score.events.length} notes)\n`);
  }

  // 2. frames -------------------------------------------------------------
  const { server, origin } = await startServer(0);
  let browser;
  let ff;
  try {
    // SwiftShader by default: software rasterisation gives the same pixels on
    // every machine, which is the point of the seed. --gpu trades that for speed.
    const glArgs = gpu
      ? ['--enable-gpu', '--ignore-gpu-blocklist']
      : ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'];
    browser = await puppeteer.launch({
      headless: true,
      args: [
        ...glArgs,
        '--hide-scrollbars',
        '--mute-audio',
        '--disable-dev-shm-usage',
        `--window-size=${width},${height}`,
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => {
      // the missing favicon is not worth reporting
      if (m.type() === 'error' && !m.text().includes('favicon')) pageErrors.push(m.text());
    });

    const q = new URLSearchParams({
      seed: String(seed), scene: style || 'auto', width: String(width), height: String(height),
      duration: String(duration), fps: String(fps), format,
      music: music || 'auto', era: era || 'auto', programme: programme || '', born: bornIn === null ? '' : String(bornIn),
      overlay: overlay ? '1' : '0', greets: greets.join(','),
    });
    await page.goto(`${origin}/web/render.html?${q}`, { waitUntil: 'load' });
    await page.waitForFunction('window.SEEDSCENE || window.SEEDSCENE_ERROR', { timeout: 60000 });

    const err = await page.evaluate(() => window.SEEDSCENE_ERROR || null);
    if (err) throw new Error('Renderer failed in the browser:\n' + err);

    const total = await page.evaluate(() => window.SEEDSCENE.totalFrames);

    // 3. ffmpeg -----------------------------------------------------------
    await mkdir(path.dirname(path.resolve(out)), { recursive: true });
    const args = [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps), '-i', 'pipe:0',
      '-i', wavPath,
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf),
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      // AAC rebuilds peaks ~4 dB above the source on bright drums, so the
      // soundtrack goes in 5 dB lower; noise substitution stays off, or the
      // encoder trades the hats and snares for noise of its own and its peaks
      // land anywhere
      '-af', 'volume=-5dB',
      '-c:a', 'aac', '-b:a', '192k', '-aac_pns', '0',
      '-shortest',
      path.resolve(out),
    ];
    ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'inherit', 'pipe'] });
    let ffErr = '';
    ff.stderr.on('data', (d) => { ffErr += d.toString(); });
    const ffDone = new Promise((resolve, reject) => {
      ff.on('error', reject);
      ff.on('close', (code) => code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited with ${code}\n${ffErr}`)));
    });
    // stdin errors surface through ffDone; one handler, not one per frame
    let stdinError = null;
    ff.stdin.on('error', (e) => { stdinError = e; });

    const write = (buf) => new Promise((resolve, reject) => {
      if (stdinError) { reject(stdinError); return; }
      if (ff.stdin.write(buf)) resolve();
      else ff.stdin.once('drain', resolve);
    });

    let last = 0;
    for (let i = 0; i < total; i++) {
      const dataUrl = await page.evaluate((n) => window.SEEDSCENE.grab(n), i);
      await write(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
      const nowMs = Date.now();
      if (!quiet && (nowMs - last > 120 || i === total - 1)) {
        last = nowMs;
        const frac = (i + 1) / total;
        const elapsed = (nowMs - t0) / 1000;
        const eta = frac > 0.01 ? elapsed / frac - elapsed : 0;
        log(`\r  frames  ${bar(frac)} ${i + 1}/${total}  ${(frac * 100).toFixed(0)}%  eta ${eta.toFixed(0)}s   `);
      }
    }
    log('\n');

    if (pageErrors.length) {
      log(`  warning browser reported: ${pageErrors.slice(0, 3).join(' | ')}\n`);
    }

    ff.stdin.end();
    log('  encode  muxing video and audio...');
    await ffDone;
    log(' done\n');

    return { out: path.resolve(out), seconds: (Date.now() - t0) / 1000, meta: score.meta, frames: total };
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
