// Renders a short taste of every music style, back to back, into one mp3:
//
//   npm run sampler            -> out/music-sampler.mp3
//
// Each style plays the same seed, taken from the middle of its piece where
// the drums, bass and lead are all in - on the sound chip of every era it
// belongs to: the Amiga's samples, the Sound Blaster 16's FM or the AWE32's
// wavetable, or the synthesizer's own voices for the eras without one.

import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ffmpegPath from 'ffmpeg-static';
import { composeScore, Synth, MUSIC_NAMES, MUSIC_PRESETS, SAMPLE_RATE } from '../src/core/music.js';
import { encodeWav } from './wav.js';
import { ERAS, ERA_NAMES } from '../src/core/eras.js';
import { ERA_CHIPS } from '../src/core/chips.js';

const CHIP_LABEL = { paula: 'Amiga, Paula samples', opl3: 'Sound Blaster 16, OPL3 FM', awe32: 'Sound Blaster AWE32, wavetable' };
// every style, on each chip of the eras it belongs to
const TAKES = [];
for (const name of MUSIC_NAMES) {
  const chips = new Set();
  for (const era of ERA_NAMES) if (ERAS[era].music.includes(name)) for (const c of ERA_CHIPS[era] || [null]) chips.add(c);
  if (!chips.size) chips.add(null);
  for (const chip of chips) TAKES.push({ name, chip });
}

const SEED = process.argv[2] || 'seedscene';
const PIECE = 48;        // seconds composed per style
const TAKE = 14;         // seconds kept from each
const FROM = 22;         // where the take starts
const FADE = 0.25;

const n = TAKE * SAMPLE_RATE;
const gap = Math.round(0.6 * SAMPLE_RATE);
const L = new Float32Array((n + gap) * TAKES.length);
const R = new Float32Array(L.length);

let at = 0;
for (const [k, { name, chip }] of TAKES.entries()) {
  const score = composeScore(SEED, PIECE, name, chip);
  const total = score.totalSamples;
  const l = new Float32Array(total), r = new Float32Array(total);
  const synth = new Synth(score, SEED);
  for (let o = 0; o < total; o += 8192) synth.render(l, r, o, Math.min(8192, total - o));
  const start = FROM * SAMPLE_RATE;
  const fade = FADE * SAMPLE_RATE;
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / fade, (n - i) / fade);
    L[at + i] = l[start + i] * g;
    R[at + i] = r[start + i] * g;
  }
  at += n + gap;
  console.log(`  ${String(k + 1).padStart(2)}. ${MUSIC_PRESETS[name].label.padEnd(20)} ${String(score.meta.bpm).padStart(3)} bpm  ${(score.meta.rootName + ' ' + score.meta.scaleLabel).padEnd(18)} ${chip ? CHIP_LABEL[chip] : 'its own synthesizer'}`);
}

const tmp = path.join(os.tmpdir(), `seedscene-sampler-${process.pid}`);
await mkdir(tmp, { recursive: true });
const wav = path.join(tmp, 'sampler.wav');
// 2 dB of headroom: the mp3 encoder overshoots on the chips' sharpest edges (square FM, 8-bit samples)
for (let i = 0; i < L.length; i++) { L[i] *= 0.79; R[i] *= 0.79; }
await writeFile(wav, encodeWav(L, R, SAMPLE_RATE));
await mkdir('out', { recursive: true });
const out = path.resolve('out/music-sampler.mp3');
await new Promise((resolve, reject) => {
  const p = spawn(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav,
    '-codec:a', 'libmp3lame', '-b:a', '192k', out]);
  p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${c}`))));
});
await rm(tmp, { recursive: true, force: true });
console.log(`\n  ${out}  (${MUSIC_NAMES.length} styles, ${TAKES.length} takes x ${TAKE}s, seed "${SEED}")`);
