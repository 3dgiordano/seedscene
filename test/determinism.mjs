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
import { composeJourney, composeAutoplay, ProgrammeSynth, cleanPace } from '../src/core/journey.js';
import { resolveChoices } from '../src/core/choose.js';
import { ERAS, ERA_NAMES, SCENE_ERAS } from '../src/core/eras.js';
import { sceneTour } from '../src/core/catalogue.js';
import { DISPLAYS, DISPLAY_NAMES, SCENE_DISPLAY, displayFor, displayUniforms, displayResolution } from '../src/core/displays.js';
import { BOARDS, BOARD_NAMES, SCENE_BOARD, boardFor, trackBoardFor, chipOfBoard } from '../src/core/boards.js';
import { STYLE_NAMES } from '../src/styles/index.js';
import { SIMS, TANK_REACH, TANK_RANGE, KT_LONG, KT_WIDE, KT_LANE } from '../src/core/sims.js';
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
  // given only the era, the seed picks one of that era's scenes - or, in an era with none of its own yet,
  // one of them all, seen through that era's screen
  const era = Object.keys(ERAS)[i % Object.keys(ERAS).length];
  const e = resolveChoices({ seed: 'seed' + i, era });
  const pool = ERAS[era].scenes.length ? ERAS[era].scenes : STYLE_NAMES;
  if (e.era !== era || !pool.includes(e.style) || !ERAS[era].music.includes(e.music)) coherent = false;
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
{
  // played on, THE JOURNEY shows two of an era's scenes a pass at the usual pace, all of them its own,
  // and goes on through each era's scenes and music until every one has come round; an era with none is passed by
  const j = composeJourney('aurora', null, 20);
  let two = true, belongs = true, all = true;
  for (const [k, era] of SCENE_ERAS.entries()) {
    const scenes = new Set(), tunes = new Set();
    for (let pass = 0; pass < 20; pass++) {
      const p = j.plan(pass * SCENE_ERAS.length + k);
      const n = Math.min(2, ERAS[era].scenes.length);
      if (p.era !== era || p.scenes.length !== n || new Set(p.scenes).size !== n) two = false;
      if (!p.scenes.every((s) => ERAS[era].scenes.includes(s)) || !ERAS[era].music.includes(p.music)) belongs = false;
      p.scenes.forEach((s) => scenes.add(s)); tunes.add(p.music);
    }
    if (scenes.size !== ERAS[era].scenes.length || tunes.size !== ERAS[era].music.length) all = false;
  }
  check('THE JOURNEY plays two scenes an era at the usual pace, and pass after pass shows every scene and style of each', two && belongs && all, '20 passes');
}
{
  // pass after pass an era's part is not the last pass's again (an era of three scenes deals them in a new
  // order), and where eras share a scene or a style a part neither opens on the scene the last closed on
  // nor plays the style it played
  let again = 0, joins = 0;
  for (const seed of ['aurora', 'seedscene', 'insertcoin']) {
    const j = composeJourney(seed, null, 40);
    const n = SCENE_ERAS.length * 40;
    for (let i = 1; i < n; i++) {
      const p = j.plan(i), q = j.plan(i - 1);
      if (p.scenes[0] === q.scenes[q.scenes.length - 1] || p.music === q.music) joins++;
      if (i >= SCENE_ERAS.length && p.scenes.join() === j.plan(i - SCENE_ERAS.length).scenes.join()) again++;
    }
  }
  check('THE JOURNEY plays an era differently each pass, and never joins two parts on one scene or one style', joins === 0 && again <= 6,
    `${again} passes like the last of ${SCENE_ERAS.length * 39}`);
}

// DISPLAYS -----------------------------------------------------------------
{
  // a game or a film is seen through its own display whatever the era; an effect through its era's; a forced
  // display wins over both; every display gives the post pass its numbers and a resolution
  const ok = displayFor('paddles', 'arcade') === 'bw' && displayFor('moonbike', 'c64') === 'vhs'
    && displayFor('plasma', ERAS[1994].display) === 'vga' && displayFor('plasma', ERAS[1982].display) === 'c64'
    && displayFor('paddles', 'arcade', 'mono') === 'mono' && displayFor('kefrens', ERAS[1990].display, 'auto') === 'amiga';
  const named = Object.values(SCENE_DISPLAY).every((d) => DISPLAYS[d]) && ERA_NAMES.every((e) => DISPLAYS[ERAS[e].display]);
  const whole = DISPLAY_NAMES.every((d) => { const u = displayUniforms(d); const r = displayResolution(d, 854, 480); return Number.isInteger(u.palMode) && Number.isInteger(u.display) && r.w > 0 && r.h > 0; });
  check('A scene is seen through its own display, or its era\'s, unless one is forced; every display is complete', ok && named && whole,
    `${DISPLAY_NAMES.length} displays`);
}
{
  // a film's music is the studio's, the Amiga's ball its sample chip's, an Amiga effect its era's chip; a forced
  // board wins; and THE JOURNEY with a board forced is made with it, the same on the page and in the worklet
  const ok = boardFor('moonbike', '1982', 'aurora') === 'hifi' && boardFor('ball', '1982', 'aurora') === 'paula'
    && boardFor('kefrens', '1990', 'aurora') === 'paula' && boardFor('invaders', '1972', 'aurora') === 'hifi'
    && boardFor('moonbike', '1982', 'aurora', 'opl3') === 'opl3' && BOARD_NAMES.every((b) => BOARDS[b].chip === null || ['paula', 'opl3', 'awe32', 'ym', 'sid'].includes(BOARDS[b].chip));
  const forced = () => composeJourney('aurora', 84, 1, 'awe32');
  const fh = programmeHash(forced, 4096);
  check('A scene\'s music plays on its own sound board, or its era\'s, unless one is forced; a forced board sounds the same every time',
    ok && fh === programmeHash(forced, 128) && fh !== jh, fh);
}

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
  // each era deals its scenes and music once and every visit goes on from the last: within a few visits an era
  // has shown all it has (a block's three tracks reach six of its scenes and three of its styles)
  const a = composeAutoplay('aurora');
  const scenes = {}, tunes = {}, visits = {};
  for (const e of SCENE_ERAS) { scenes[e] = new Set(); tunes[e] = new Set(); visits[e] = 0; }
  for (let block = 0; block < 8 * 9; block++) {
    const e = a.plan(block * 3).era;
    visits[e]++;
    a.blockScenes(block).slice(0, 6).forEach((s) => scenes[e].add(s));
    for (let k = 0; k < 3; k++) tunes[e].add(a.plan(block * 3 + k).music);
  }
  const short = SCENE_ERAS.filter((e) => scenes[e].size !== ERAS[e].scenes.length || tunes[e].size !== ERAS[e].music.length);
  check('AUTOPLAY goes on through each era\'s scenes and music visit by visit, until all have come round', short.length === 0,
    short.length ? `short: ${short.join(', ')}` : `${Math.min(...Object.values(visits))}+ visits an era`);
}
{
  // a visit to an era is not the last visit again (an era whose scenes a visit uses up exactly, or a track
  // does, deals them in a new order every time round); a block is never in the era the one before was in;
  // and no scene or style follows itself, from one track to the next, from one block to the next
  let again = 0, sameEra = 0, twice = 0, visits = 0;
  for (const seed of ['aurora', 'seedscene', 'insertcoin']) {
    const a = composeAutoplay(seed);
    const last = {};
    let prevScene = null, prevMusic = null;
    for (let block = 0; block < 300; block++) {
      const e = a.blockEra(block), order = a.blockScenes(block);
      if (block > 0 && e === a.blockEra(block - 1)) sameEra++;
      const shown = order.slice(0, 6);
      if (last[e] === shown.join()) again++;
      last[e] = shown.join(); visits++;
      for (let k = 0; k < 3; k++) {
        const m = a.plan(block * 3 + k).music;
        if (m === prevMusic) twice++;
        prevMusic = m;
        for (let s = 0; s < Math.min(2, ERAS[e].scenes.length); s++) {
          const sc = order[k * 2 + s];
          if (sc === prevScene) twice++;
          prevScene = sc;
        }
      }
    }
  }
  check('AUTOPLAY plays each visit to an era its own way, moves on to another era every block, and never plays a scene or style twice in a row',
    again <= visits / 50 && sameEra === 0 && twice === 0, `${again} visits like the last of ${visits}`);
}
{
  // the live keys' catalogue: era after era, oldest first, every scene of every era, dealt by the seed
  const t1 = sceneTour('aurora'), t2 = sceneTour('hikari');
  const inOrder = t1.every((x, i) => i === 0 || ERA_NAMES.indexOf(x.era) >= ERA_NAMES.indexOf(t1[i - 1].era));
  const whole = ERA_NAMES.every((e) => ERAS[e].scenes.every((s) => t1.some((x) => x.era === e && x.scene === s)));
  const dealt = t1.some((x, i) => x.scene !== t2[i].scene);
  check('The catalogue goes era by era, holds every scene, and each seed deals it its own way', inOrder && whole && dealt,
    `${t1.length} stops`);
}
{
  // the README's scenes, as docs/SCENE-ENTRIES.md writes them: era by era in the eras' order, each once,
  // with its image, at most forty words, under a heading that never changes (its link can be shared)
  const readme = await readFile('README.md', 'utf8');
  const at = readme.search(/^## Scenes, straight out of the scene$/m);
  const section = at < 0 ? '' : readme.slice(at, readme.indexOf('\n## ', at + 1));
  const listed = [...section.matchAll(/\*\*(\w+)\*\* — (.*?)(?: \*Also [^*]*\*)? `--scene \1 /g)];
  const expected = [];
  for (const e of ERA_NAMES) for (const s of ERAS[e].scenes) if (!expected.includes(s)) expected.push(s);
  const order = listed.map((m) => m[1]).join() === expected.join() && expected.length === STYLE_NAMES.length;
  const images = expected.every((s) => section.includes(`![${s}](docs/gallery/${s}.png)`));
  const long = listed.filter((m) => m[2].split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length > 40).map((m) => m[1]);
  // every row of the tables three cells wide, so no entry falls into a fourth column the page does not show
  const rows = section.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('|---'));
  const cells = (l) => l.replace(/`[^`]*`/g, '').split('|').length - 2;
  const wide = rows.filter((l) => cells(l) !== 3).map((l) => (l.match(/\*\*(\w+)\*\*|!\[(\w+)\]/) || [])[1] || (l.match(/!\[(\w+)\]/) || [])[1] || l.slice(0, 20));
  check('The README lists every scene once, era by era, with its image, in forty words or fewer',
    at >= 0 && order && images && long.length === 0 && wide.length === 0,
    at < 0 ? 'no "## Scenes, straight out of the scene" heading' : `${listed.length} entries${long.length ? `, too long: ${long.join(', ')}` : ''}${wide.length ? `, rows not three cells: ${wide.join(', ')}` : ''}`);
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
    if (Math.floor(i / 3) % 2 === 0 && p.era !== '1997') home = false;
    if (!ERAS[p.era].scenes.includes(p.style) || !ERAS[p.era].music.includes(p.music)) belongs = false;
    if (i > 0) { const q = b.plan(i - 1); if (q.style === p.style && q.music === p.music) repeats++; }
  }
  check('BORN IN opens in the era of the twelfth year, keeps coming back, sounds the same whatever the block size',
    home && belongs && repeats === 0 && bh === programmeHash(born, 128), bh);
}
{
  // held in one era (an era link left to AUTOPLAY, or the screensaver over it): every track in that era, its
  // card only on the track it drops in on, no scene or style twice in a row, the same whatever the block size
  const held = () => composeAutoplay('aurora', 120, null, 'auto', '1997');
  const hh = programmeHash(held, 4096);
  let inEra = true, twice = 0, cards = 0;
  for (const era of SCENE_ERAS) {
    const a = composeAutoplay('aurora', undefined, null, 'auto', era);
    const at = a.entry(0.5);
    let prevScene = null, prevMusic = null;
    for (let i = at; i < at + 120; i++) {
      const p = a.plan(i);
      if (p.era !== era) inEra = false;
      if (p.eraChanged) cards++;
      if (p.music === prevMusic) twice++;
      prevMusic = p.music;
      const order = a.blockScenes(Math.floor(i / 3));
      for (let s = 0; s < Math.min(2, ERAS[era].scenes.length); s++) {
        const sc = order[(i % 3) * 2 + s];
        if (sc === prevScene) twice++;
        prevScene = sc;
      }
    }
  }
  check('AUTOPLAY held in one era plays only that era, opens on its card, never twice in a row, sounds the same whatever the block size',
    inEra && cards === SCENE_ERAS.length && twice === 0 && hh === programmeHash(held, 128), hh);
}
{
  // THE PACE: 40 s a track, 20 s a scene unless asked otherwise. In both programmes a track's scenes are of its
  // era, none twice in a row, each cut on a bar line, and each scene within a few seconds of what was asked
  const scenesOf = (p) => p.scenes.map((s, j) => (j + 1 < p.scenes.length ? p.scenes[j + 1].from : p.view.to) - s.from);
  const survey = (pr, n, want) => {
    let ok = true, shortest = Infinity, longest = 0, count = 0;
    for (let i = 0; i < n; i++) {
      const p = pr.part(i), bar = p.meta.barSec, lens = scenesOf(p);
      if (p.scenes.length !== Math.min(want, ERAS[p.era].scenes.length)) ok = false;
      p.scenes.forEach((s, j) => {
        const at = (s.from + p.inOffset) / bar;
        if (!ERAS[p.era].scenes.includes(s.style)) ok = false;
        if (j > 0 && (s.style === p.scenes[j - 1].style || Math.abs(at - Math.round(at)) > 1e-6)) ok = false;
        shortest = Math.min(shortest, lens[j]); longest = Math.max(longest, lens[j]); count++;
      });
    }
    return { ok, shortest, longest, count };
  };
  const a = survey(composeAutoplay('aurora'), 120, 2), j = survey(composeJourney('aurora', null, 3), 21, 2);
  const inBand = (r) => r.shortest >= 15 && r.longest <= 25;
  check('AUTOPLAY and THE JOURNEY play 40 s tracks of 20 s scenes, each cut on a bar line', a.ok && j.ok && inBand(a) && inBand(j)
    && composeAutoplay('aurora').partSec === 40 && composeJourney('aurora').partSec === 40,
    `AUTOPLAY ${a.shortest.toFixed(1)}-${a.longest.toFixed(1)} s, THE JOURNEY ${j.shortest.toFixed(1)}-${j.longest.toFixed(1)} s`);
  // and any other pace: a scene as long as the track or longer plays alone; the same pace sounds the same whatever the block size
  const paced = { track: 60, scene: 15 };
  const p = survey(composeAutoplay('aurora', undefined, null, 'auto', null, paced), 30, 4);
  const one = survey(composeJourney('aurora', null, 2, 'auto', { track: 30, scene: 90 }), 14, 1);
  const make = () => composeAutoplay('aurora', 60, null, 'auto', null, paced);
  const ph = programmeHash(make, 4096);
  check('THE PACE can be changed, and a programme at any pace sounds the same whatever the block size',
    // (a slow track's bars are long: a scene this short is within half its length of what was asked)
    p.ok && p.shortest >= 7.5 && p.longest <= 22.5 && one.ok && ph === programmeHash(make, 128) && ph !== ah, `60/15: ${p.shortest.toFixed(1)}-${p.longest.toFixed(1)} s; ${ph}`);
  // a track with a scene that asks for the studio plays on it whole, in both programmes; a forced board still wins
  let studio = 0, off = 0, chipTracks = 0;
  for (const pr of [composeAutoplay('aurora'), composeAutoplay('seedscene'), composeJourney('aurora', null, 6), composeJourney('seedscene', null, 6)]) {
    for (let i = 0; i < 42; i++) {
      const part = pr.part(i), asks = part.scenes.some((s) => SCENE_BOARD[s.style] === 'hifi');
      if (asks) { studio++; if (part.meta.chip) off++; } else if (part.meta.chip) chipTracks++;
    }
  }
  const forcedWins = trackBoardFor(['plasma', 'moonbike'], '1982', 'aurora', 'opl3') === 'opl3' && chipOfBoard(trackBoardFor(['plasma', 'moonbike'], '1982', 'aurora')) === null
    && trackBoardFor(['kefrens', 'tunnel'], '1990', 'aurora') === boardFor('kefrens', '1990', 'aurora');
  check('A track with a scene that asks for HI-FI plays all on HI-FI, unless a board is forced', studio > 20 && off === 0 && chipTracks > 20 && forcedWins,
    `${studio} such tracks, ${off} on a chip; ${chipTracks} other tracks still on their era's chips`);
  const c = cleanPace({ track: '3', scene: 'x' }), d = cleanPace({ track: 90, scene: '1000' });
  check('A pace asked for out of range comes back in range', c.track === 12 && c.scene === 20 && d.track === 90 && d.scene === 600, JSON.stringify([c, d]));
}
{
  // the picture changes track with the music: on the new track's bar line, in the overlap, within a bar of the
  // middle where the basslines swap, and the picture's clock runs on without a jump through the cut
  const pr = composeAutoplay('aurora');
  let ok = true, worst = 0, seam = 0;
  for (let i = 1; i < 60; i++) {
    const p = pr.part(i), tr = pr.transition(i - 1), lead = -p.view.from;
    const inSec = (p.start - p.audioStart) / SAMPLE_RATE;
    if (lead <= 0 || lead >= inSec) ok = false;
    worst = Math.max(worst, Math.abs(inSec - lead - inSec / 2));
    const bars = p.scoreTimeAt(p.view.from) / p.meta.barSec;
    if (Math.abs(bars - Math.round(bars)) > 1e-3) ok = false;
    if (Math.abs(pr.viewStart(i) - (i * pr.partSec - lead)) > 1e-9 || pr.viewIndexAt(pr.viewStart(i) - 0.01) !== i - 1 || pr.viewIndexAt(pr.viewStart(i)) !== i) ok = false;
    // just after the slot opens and just before: the new track's clock is continuous at its slot's start
    seam = Math.max(seam, Math.abs(p.scoreTimeAt(-1e-3) - p.scoreTimeAt(0)));
    if (tr.beats <= 0) ok = false;
  }
  check('The picture changes track where the basslines swap, on the new track\'s bar line', ok && worst < 2.5 && seam < 0.01,
    `at most ${worst.toFixed(2)} s from the middle of an overlap`);
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

{
  // the artillery is real physics that still lands on the music: what goes off on touching or on a fuse goes off on
  // the grid (within a physics step), the game keeps going, and coming back reaches the same state as a fresh run.
  // One side holds each end of the island with open ground between, and no shot is ever meant for the shooter's own
  let worst = 0, shots = 0, turns = 0, same = true, parted = true, meant = 0;
  for (const [seed, spb] of [['incoming', 0.5], ['aurora', 0.36], ['hikari', 0.75]]) {
    const sim = new SIMS.artillery(seed, spb, null);
    const burst = sim.burst.bind(sim), begin = sim.beginTurn.bind(sim), round = sim.newRound.bind(sim);
    const look = () => {
      const left = sim.beetles.filter((q) => q.team === 0).map((q) => q.x), right = sim.beetles.filter((q) => q.team === 1).map((q) => q.x);
      if (left.length !== 5 || right.length !== 5 || Math.max(...left) > -100 || Math.min(...right) < 100) parted = false;
    };
    look();
    sim.newRound = (t) => { round(t); look(); };
    sim.burst = (b, t) => {
      if (b.kind !== 'piece' && b.kind !== 'pod') {
        const q = t / (spb / 2);
        worst = Math.max(worst, Math.abs(q - Math.round(q)) * (spb / 2));
        shots++;
      }
      burst(b, t);
    };
    sim.beginTurn = (t) => {
      turns++;
      begin(t);
      const T = sim.turn;
      if (!T || T.kind === 'air') return;
      const dir = Math.sign(T.tx - T.s.x), seen = T.sol.seen;
      if (T.sol.avx * dir <= 0 || (seen.x - T.s.x) * dir <= 0) meant++;
      if (sim.beetles.some((q) => q.team === T.s.team && q.state === 'live' && Math.hypot(q.x - seen.x, q.y - seen.y) < 50)) meant++;
    };
    sim.advanceTo(240);
    const a = new SIMS.artillery(seed, spb, null).uniforms(100), b = new SIMS.artillery(seed, spb, null);
    b.uniforms(160);
    const c = b.uniforms(100);
    for (const k of ['uCam', 'uBeetles', 'uCraters']) if (String(a[k].v) !== String(c[k].v)) same = false;
  }
  check('The artillery\'s shots go off on the music\'s grid, the game goes on, and going back replays it the same',
    worst < 0.0045 && turns > 30 && shots > 15 && same, `${shots} shots in ${turns} turns, at worst ${(worst * 1000).toFixed(1)} ms off`);
  check('The artillery\'s two sides start apart, one to each end of the island, and no shot is meant for the shooter\'s own',
    parted && meant === 0, `${meant} shots meant for its own side or thrown back`);
}

{
  // the scanner car is driven, not drawn on a path: it stays on the road it is given, whatever the tempo; each flight
  // clears its barrier and ends on the music's big moment; and going back replays the same drive.
  let off = 0, late = 0, landed = 0, flights = 0, low = Infinity, same = true;
  for (const [seed, spb, accents] of [['redsweep', 0.4348, null], ['nightdrive', 0.5, [8, 16, 32, 40]], ['hikari', 0.75, null], ['aurora', 0.33, null]]) {
    const meta = { spb, steps: 16, barSec: spb * 4, accents };
    const sim = new SIMS.scanner(seed, spb, meta);
    const crossed = new Set();
    for (let t = 0; t < 150; t += 1 / 60) {
      sim.advanceTo(t);
      for (const s of sim.stunts) {
        if (crossed.has(s) || sim.Z < s.zBar) continue;
        crossed.add(s);
        low = Math.min(low, sim.Y - sim.roadY(sim.Z));       // the body's floor is 0.17 above this; the board and its lamps stand 1.3 high
      }
    }
    off = Math.max(off, sim.maxOff);
    for (const s of sim.stunts.filter((q) => q.T < 148)) {
      flights++;
      const near = sim.landings.reduce((m, v) => Math.min(m, Math.abs(v - s.T)), Infinity);
      if (near < 0.5) { landed++; late = Math.max(late, near); }
    }
    const a = new SIMS.scanner(seed, spb, meta).uniforms(40), b = new SIMS.scanner(seed, spb, meta);
    b.uniforms(70);
    const c = b.uniforms(40);
    for (const k of ['uScCam', 'uScCar', 'uScWheel', 'uScRoad', 'uScProp']) if (String(a[k].v) !== String(c[k].v)) same = false;
  }
  check('The scanner car stays on its road, clears each barrier, lands on the music\'s big moments, and going back replays the same drive',
    off < 4.8 && flights >= 8 && landed === flights && late < 0.04 && low + 0.17 > 1.3 && same,
    `${landed} of ${flights} landings, at worst ${(late * 1000).toFixed(0)} ms off; ${off.toFixed(1)} m from the middle of the road at most; ${(low + 0.17 - 1.3).toFixed(2)} m over the barrier at least`);
}

{
  // the kart race: each race ends on an accented bar - the drop - with the player's kart on the line and the leader
  // beside it, nose to nose, the rest behind; no two karts ever touch or leave the track between its barriers;
  // items leave on a snare and land on a beat, ahead of whoever threw them; going back replays the same race
  let jumps = 0, offJump = 0;
  let finishes = 0, offBar = 0, apart = 0, ahead = 0, offLine = 0, touch = Infinity, wide = 0, shots = 0, offBeat = 0, behindThrower = 0, same = true;
  for (const [seed, spb, accents] of [['kartcup', 0.451, [8, 16, 24, 28, 32, 40, 48]], ['aurora', 0.36, null], ['hikari', 0.75, null], ['grandprix', 0.328, [0, 16, 36, 59, 67]]]) {
    const meta = { spb, steps: 16, barSec: spb * 4, accents };
    const sim = new SIMS.karts(seed, spb, meta, null);
    const seen = new Set(), done = new Set();
    const finish = (r) => {
      finishes++;
      // its jumps leave on a bar line and land on a beat, the player in the air in between and down after
      for (const q of r.ramps) {
        jumps++;
        const b = q.T / meta.barSec, k = q.T1 / spb;
        if (Math.abs(b - Math.round(b)) > 1e-6 || Math.abs(k - Math.round(k)) > 1e-6) offJump++;
        if (!sim.jumpAt(0, r, (q.T + q.T1) / 2, 0).air || sim.jumpAt(0, r, q.T1 + 0.01, 0).air) offJump++;
      }
      const b = r.t1 / meta.barSec;
      if (Math.abs(b - Math.round(b)) > 1e-6 || (accents && !accents.includes(Math.round(b)) && b < 64)) offBar++;
      const sP = sim.sRace(r, r.t1);
      offLine = Math.max(offLine, Math.abs(sP / r.lap - Math.round(sP / r.lap)) * r.lap);
      apart = Math.max(apart, Math.abs(sim.gap(r.photo, r.t1)));
      for (let i = 1; i < 8; i++) if (i !== r.photo && sim.gap(i, r.t1) > -2) ahead++;
    };
    for (let t = 0; t < 150; t += 1 / 60) {
      sim.advanceTo(t);
      // (each finish looked at as it is crossed, while its race is still kept)
      for (const r of sim.races) if (r.t1 <= t && r.cum && !done.has(r)) { done.add(r); finish(r); }
      for (let i = 0; i < 8; i++) wide = Math.max(wide, Math.abs(sim.d[i]) - KT_LANE);
      for (const h of sim.hits) {
        if (seen.has(h) || t < h.T || t >= h.Th || h.dFrom === null) continue;
        seen.add(h);
        shots++;
        // (on the grid's backbeat without features; on the next beat)
        if (Math.abs(h.T / spb - Math.round(h.T / spb)) > 1e-6 || Math.round(h.T / spb) % 2 !== 1) offBeat++;
        if (Math.abs(h.Th / spb - Math.round(h.Th / spb)) > 1e-6) offBeat++;
        const race = sim.raceAt(t), q = sim.shotAt(h, race, (h.T + h.Th) / 2);
        const sThrower = sim.sRace(race, (h.T + h.Th) / 2) + sim.gap(h.from, (h.T + h.Th) / 2);
        const sShot = sim.sRace(race, h.T) + sim.gap(h.from, h.T) + 1.2 + (sim.sRace(race, h.Th) + sim.gap(h.to, h.Th) - 0.8 - (sim.sRace(race, h.T) + sim.gap(h.from, h.T) + 1.2)) * 0.5;
        if (!q || sShot < sThrower) behindThrower++;
      }
    }
    touch = Math.min(touch, sim.minGap);
    const a = new SIMS.karts(seed, spb, meta, null).uniforms(40), c2 = new SIMS.karts(seed, spb, meta, null);
    c2.uniforms(70);
    const c = c2.uniforms(40);
    for (const k of ['uKtCam', 'uKtK0', 'uKtK1', 'uKtShot', 'uKtPart', 'uKtHud']) if (String(a[k].v) !== String(c[k].v)) same = false;
  }
  check('The kart race ends each race on an accented bar, the player on the line and the leader nose to nose beside it, the rest behind',
    finishes >= 16 && offBar === 0 && offLine < 1e-6 && apart < 0.3 && ahead === 0,
    `${finishes} finishes; the leader ${(apart * 100).toFixed(0)} cm from the player at most`);
  check("The kart race's jumps leave on a bar line and land on a beat",
    jumps >= 10 && offJump === 0, `${jumps} jumps`);
  check('No two karts ever touch or leave the track, items leave on the snare and land on the beat ahead of their thrower, and going back replays the same race',
    touch > 0 && wide <= 1e-9 && shots > 20 && offBeat === 0 && behindThrower === 0 && same,
    `${shots} items; two karts side by side never nearer than ${(touch * 100).toFixed(0)} cm`);
}

{
  // the tanks are things in their world: neither ever gets into a block or a pyramid, nor into the other, and the
  // tank fires only with the enemy near, large in the sight, and nothing between them. Going back replays the same.
  let lowest = Infinity, apart = Infinity, farthest = 0, kills = 0, blocked = 0, longest = 0, same = true;
  let offMuzzle = 0, offTip = 0, shortest = Infinity, unfalling = 0;
  for (const [seed, spb] of [['radar', 0.5], ['aurora', 0.36], ['hikari', 0.75]]) {
    const sim = new SIMS.tanks(seed, spb, null);
    const shot = new Set(), flown = new Set();
    let last = 0;
    for (let t = 0; t < 120; t += 1 / 15) {
      sim.uniforms(t);
      const me = sim.placeAt(t);
      const clearOf = (x, z) => Math.min(...sim.obstacles.map((o) => { const [cx, cz] = sim.nearCopy(o, x, z); return Math.hypot(x - cx, z - cz) - o.r; }));
      lowest = Math.min(lowest, clearOf(me.x, me.z));
      for (const f of sim.foes) {
        const a = sim.foeAt(f, t);
        if (!a) continue;
        lowest = Math.min(lowest, clearOf(a.x, a.z));
        apart = Math.min(apart, Math.hypot(a.x - me.x, a.z - me.z));
      }
      for (const s of sim.shots) {
        if (shot.has(s.t)) continue;
        shot.add(s.t);
        kills++;
        farthest = Math.max(farthest, s.range);
        longest = Math.max(longest, s.t - last);
        last = s.t;
      }
      for (const s of sim.shells) {
        if (s.mine && t >= s.t0 && !sim.lineClear(s.x0, s.z0, s.x1, s.z1)) blocked++;
        if (flown.has(s) || t < s.t0) continue;
        flown.add(s);
        // every shell leaves its gun's muzzle and falls under gravity: the middle of its flight is above the straight line
        const mid = sim.shellAt(s, 0.5);
        if (mid[1] <= (s.y0 + s.y1) / 2) unfalling++;
        if (s.mine) {
          // ours starts at the tip of the gun drawn on the glass, at (0, -0.3)
          const at = sim.placeAt(s.t0), sn = Math.sin(at.h), cs = Math.cos(at.h), dx = s.x0 - at.x, dz = s.z0 - at.z;
          const cx = dx * cs - dz * sn, cz = dx * sn + dz * cs;
          offTip = Math.max(offTip, Math.hypot(cx / cz * 1.45, 0.1 + (s.y0 - 2.7) / cz * 1.45 + 0.3));
        } else {
          // theirs starts at the end of the enemy's gun, and flies well clear of it unless a block or a pyramid is in the way
          const a = sim.foeAt(s.by, s.t0), px = a.x - Math.sin(a.h) * 0.45, pz = a.z - Math.cos(a.h) * 0.45;
          offMuzzle = Math.max(offMuzzle, Math.hypot(px + Math.sin(a.g) * 4.65 - s.x0, pz + Math.cos(a.g) * 4.65 - s.z0));
          if (s.t1 >= s.t0 + s.T - 1e-6) shortest = Math.min(shortest, Math.hypot(s.x1 - s.x0, s.z1 - s.z0));
        }
      }
    }
    const a = new SIMS.tanks(seed, spb, null).uniforms(100), b = new SIMS.tanks(seed, spb, null);
    b.uniforms(110);
    const c = b.uniforms(100);
    for (const k of ['uSeg', 'uFace', 'uTank', 'uTBlasts']) if (String(a[k].v) !== String(c[k].v)) same = false;
  }
  check('The tanks steer round the blocks and pyramids and never enter them, and fire only near, with nothing between',
    lowest >= TANK_REACH - 0.25 && apart >= 9.5 && farthest <= TANK_RANGE && blocked === 0 && kills > 40 && longest < 30 && same,
    `${kills} shots, at most ${farthest.toFixed(0)} away; a tank's middle at least ${lowest.toFixed(1)} from anything, ${apart.toFixed(1)} from the other`);
  check('Every shell leaves its gun\'s muzzle and falls under gravity, and the enemy\'s fly well clear of it',
    offMuzzle < 0.001 && offTip < 0.01 && unfalling === 0 && shortest >= 9,
    `theirs ${offMuzzle.toFixed(3)} from the muzzle, ours ${offTip.toFixed(3)} from the gun's tip on the screen; theirs fly at least ${shortest.toFixed(1)}`);
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
