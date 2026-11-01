// Checks the one guarantee the tool makes: the same seed produces the same
// clip. Run it with `npm test`.
//
//   1. the score is identical across processes
//   2. the audio is identical, and does not depend on the render block size
//   3. two full mp4 renders of the same seed are byte-identical
//   4. a different seed actually produces something different

import { createHash } from 'node:crypto';
import { readFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { composeScore, Synth, Features, SAMPLE_RATE, MUSIC_NAMES } from '../src/core/music.js';
import { composeJourney, composeAutoplay, ProgrammeSynth } from '../src/core/journey.js';
import { resolveChoices } from '../src/core/choose.js';
import { ERAS } from '../src/core/eras.js';
import { renderVideo } from '../tools/render.js';

const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
let failures = 0;

function check(name, ok, detail = '') {
  console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

function audioHash(seed, duration, block) {
  const score = composeScore(seed, duration);
  const n = score.totalSamples;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const synth = new Synth(score, seed);
  for (let o = 0; o < n; o += block) synth.render(L, R, o, Math.min(block, n - o));
  return { hash: sha(Buffer.concat([Buffer.from(L.buffer), Buffer.from(R.buffer)])), L, R };
}

console.log('\n  determinism\n');

// 1 --------------------------------------------------------------------
const s1 = composeScore('aurora', 12);
const s2 = composeScore('aurora', 12);
check('score is identical for the same seed',
  JSON.stringify(s1) === JSON.stringify(s2), `${s1.events.length} events`);
check('score differs for a different seed',
  JSON.stringify(composeScore('aurora', 12)) !== JSON.stringify(composeScore('borealis', 12)));

// 2 --------------------------------------------------------------------
const a = audioHash('aurora', 12, 4096);
const b = audioHash('aurora', 12, 128);
check('audio is identical for the same seed', a.hash === audioHash('aurora', 12, 4096).hash, a.hash);
check('audio does not depend on the block size', a.hash === b.hash, b.hash);
check('audio differs for a different seed', a.hash !== audioHash('borealis', 12, 4096).hash);
let peak = 0;
let finite = true;
for (let i = 0; i < a.L.length; i++) {
  const v = a.L[i];
  if (!Number.isFinite(v)) { finite = false; break; }
  if (Math.abs(v) > peak) peak = Math.abs(v);
}
check('audio is finite and audible', finite && peak > 0.2, `peak ${peak.toFixed(3)}`);

// features ---------------------------------------------------------------
const f1 = new Features(s1).at(5.0);
const f2 = new Features(s2).at(5.0);
check('visual features are identical for the same seed',
  JSON.stringify(f1) === JSON.stringify(f2));

// eras and choices ------------------------------------------------------
let coherent = true;
for (let i = 0; i < 300; i++) {
  const c = resolveChoices({ seed: 'seed' + i });
  const again = resolveChoices({ seed: 'seed' + i });
  if (JSON.stringify(c) !== JSON.stringify(again)) coherent = false;
  if (!ERAS[c.era].scenes.includes(c.style) || !ERAS[c.era].music.includes(c.music)) coherent = false;
  // given only the era, the seed picks one of that era's scenes
  const era = Object.keys(ERAS)[i % Object.keys(ERAS).length];
  const e = resolveChoices({ seed: 'seed' + i, era });
  if (e.era !== era || !ERAS[era].scenes.includes(e.style) || !ERAS[era].music.includes(e.music)) coherent = false;
}
check('a seed always chooses the same scene, era and music, and they belong together', coherent);
check('every music style composes', MUSIC_NAMES.every((m) => composeScore('aurora', 8, m).events.length > 0),
  `${MUSIC_NAMES.length} styles`);

// THE JOURNEY -------------------------------------------------------------
function programmeHash(make, block) {
  const j = make();
  const n = j.totalSamples;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const synth = new ProgrammeSynth(j);
  for (let o = 0; o < n; o += block) synth.render(L, R, o, Math.min(block, n - o));
  return sha(Buffer.concat([Buffer.from(L.buffer), Buffer.from(R.buffer)]));
}
const journey = () => composeJourney('aurora', 84);
const jh = programmeHash(journey, 4096);
check('THE JOURNEY sounds the same every time, whatever the block size', jh === programmeHash(journey, 128), jh);

// AUTOPLAY ------------------------------------------------------------------
const autoplay = () => composeAutoplay('aurora', 120);
const ah = programmeHash(autoplay, 4096);
check('AUTOPLAY sounds the same every time, whatever the block size', ah === programmeHash(autoplay, 128), ah);
{
  const a = composeAutoplay('aurora');
  let belongs = true;
  let repeats = 0;
  for (let i = 0; i < 300; i++) {
    const p = a.plan(i);
    if (!ERAS[p.era].scenes.includes(p.style) || !ERAS[p.era].music.includes(p.music)) belongs = false;
    if (i > 0) {
      const q = a.plan(i - 1);
      if (q.style === p.style && q.music === p.music) repeats++;
    }
  }
  check('AUTOPLAY keeps every track in its era, and never repeats a pairing back to back', belongs && repeats === 0,
    '300 tracks');
}
{
  // born in 1985: twelve in 1997, the 32-bit console's year - it opens there and comes back every other
  // block; it sounds the same whatever the block size; and every track still belongs to its era
  const born = () => composeAutoplay('aurora', 120, 1985);
  const bh = programmeHash(born, 4096);
  const b = composeAutoplay('aurora', undefined, 1985);
  let home = true, belongs = true, repeats = 0;
  for (let i = 0; i < 300; i++) {
    const p = b.plan(i);
    if (Math.floor(i / 3) % 2 === 0 && p.era !== 'console') home = false;
    if (!ERAS[p.era].scenes.includes(p.style) || !ERAS[p.era].music.includes(p.music)) belongs = false;
    if (i > 0) { const q = b.plan(i - 1); if (q.style === p.style && q.music === p.music) repeats++; }
  }
  check('BORN IN opens in the era of the twelfth year, keeps coming back, sounds the same whatever the block size',
    home && belongs && repeats === 0 && bh === programmeHash(born, 128), bh);
}
{
  // inside a track the scene changes with the music: on a bar line, each scene
  // of the track's era, none shown twice in a row, none for less than 9 seconds
  const a = composeAutoplay('aurora');
  let ok = true, changes = 0;
  for (let i = 0; i < 120; i++) {
    const p = a.part(i);
    const bar = p.meta.barSec;
    p.scenes.forEach((s, j) => {
      const end = j + 1 < p.scenes.length ? p.scenes[j + 1].from : p.duration;
      const at = (s.from + p.inOffset) / bar;
      const onBar = Math.abs(at - Math.round(at)) < 1e-6;
      if (!ERAS[p.era].scenes.includes(s.style) || end - s.from < 9 || !onBar) ok = false;
      if (j > 0 && s.style === p.scenes[j - 1].style) ok = false;
    });
    changes += p.scenes.length - 1;
  }
  check('AUTOPLAY changes scene with the music, on the bar, inside every track', ok && changes >= 120,
    `${changes} cuts in 120 tracks`);
}
{
  // each track mixes into the next beat on beat: in every overlap, a note the
  // outgoing track plays on a beat and one the incoming track plays on the same
  // beat sound within two samples (rounding) of each other
  const a = composeAutoplay('aurora');
  const SR = SAMPLE_RATE;
  let worst = 0, matched = 0;
  for (let i = 0; i < 30; i++) {
    const A = a.part(i), B = a.part(i + 1), tr = a.transition(i);
    const beatsIn = (p, first) => {
      const spb = p.meta.spb, out = new Map();
      p.audio.events.forEach((ae, k) => {
        const b = p.score.events[k].t / SR / spb, bi = Math.round(b);
        if (Math.abs(b - bi) * spb * SR > 1 || bi < first || bi >= first + tr.beats) return;
        out.set(bi - first, p.audioStart + ae.t);
      });
      return out;
    };
    const outA = beatsIn(A, Math.round(A.inOffset / A.meta.spb) + tr.middle), inB = beatsIn(B, 0);
    for (const [k, t] of inB) if (outA.has(k)) { worst = Math.max(worst, Math.abs(outA.get(k) - t)); matched++; }
  }
  check('AUTOPLAY mixes each track into the next beat on beat', matched > 100 && worst <= 2,
    `${matched} shared beats in 30 overlaps, at most ${worst} samples apart`);
}

// 3 --------------------------------------------------------------------
const quick = process.argv.includes('--quick');
if (quick) {
  console.log('\n  \x1b[2mskipping the mp4 comparison (--quick)\x1b[0m\n');
} else {
  console.log('\n  rendering the same seed twice (this takes a minute)\n');
  const tmp = path.join(os.tmpdir(), `seedscene-test-${process.pid}`);
  await mkdir(tmp, { recursive: true });
  const opts = {
    seed: 'aurora', style: 'tunnel', width: 256, height: 144,
    duration: 2, fps: 24, quiet: true,
  };
  try {
    await renderVideo({ ...opts, out: path.join(tmp, 'a.mp4') });
    await renderVideo({ ...opts, out: path.join(tmp, 'b.mp4') });
    await renderVideo({ ...opts, seed: 'borealis', out: path.join(tmp, 'c.mp4') });
    const [ha, hb, hc] = await Promise.all(['a', 'b', 'c'].map(
      async (n) => sha(await readFile(path.join(tmp, `${n}.mp4`)))));
    check('two renders of the same seed are byte-identical', ha === hb, ha);
    check('a different seed renders a different file', ha !== hc, hc);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

console.log(failures ? `\n  \x1b[31m${failures} check(s) failed\x1b[0m\n` : '\n  \x1b[32mall checks passed\x1b[0m\n');
process.exitCode = failures ? 1 : 0;
