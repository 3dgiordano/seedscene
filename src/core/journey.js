// Programmes: demos played one after another.
//
//   THE JOURNEY  one track per era, oldest first, with as many of the era's
//                scenes as the pace gives. Played again it goes on through
//                each era's list and its music, so every pass shows what the
//                last did not: the seed sets the order the lists start in,
//                not how much of them is seen.
//   AUTOPLAY     an endless mix: a few tracks in one era, then another era.
//                Born in a year, it opens in the era the viewer was twelve in
//                and keeps coming back to it, the eras between drawn from the
//                ones nearest it. Held in one era, it never leaves it.
//                Each era deals its scenes and its music once, in the seed's
//                order, and every visit to it goes on where the last one
//                stopped, so the whole catalogue comes round before any of
//                it comes again. It can run for hours and never repeats a
//                pairing in a row.
//
// THE PACE is the same for both, live and in an mp4: a track of TRACK_SECONDS
// and scenes of SCENE_SECONDS, both the viewer's to change. A track plays the
// whole number of scenes that comes nearest (one, if a scene is asked to be as
// long as a track or longer), shared out evenly, each cut on a bar line - or on
// a drop or a crash that opens a phrase, where one falls close enough.
//
// The picture changes track when the music does: on the new track's bar line
// halfway through the overlap, where the basslines swap - not at the end of the
// overlap, when the new track has already been playing for several seconds.
//
// Every part has its own sub-seed, scene, era and music, composed at its own
// tempo, and is built only when it is needed — on the page and in the
// AudioWorklet alike, from the same seed and pace, so both always agree.
//
// One track mixes into the next the way a DJ would. The next track is
// composed and its synth made ready as soon as the one before it starts. Its
// first bars then play over the last bars of the outgoing track, beat on beat:
// across the overlap both follow one tempo that glides from the old track's to
// the new one's. The new track comes in thin - its lows filtered away - while
// the old one carries on; halfway the basslines swap; then the old track fades
// behind a closing filter. It is all sample-indexed, so a programme is as
// deterministic as a single demo.

import { composeScore, scoreTempo, Features, Synth, SAMPLE_RATE, prepareChip } from './music.js';
import { ERAS, SCENE_ERAS as ERA_NAMES } from './eras.js';   // (the eras with scenes of their own)
import { ERA_CHIPS } from './chips.js';
import { trackBoardFor, chipOfBoard } from './boards.js';
import { SCENE_DISPLAY } from './displays.js';
import { Rng } from './rng.js';

/** How each era is announced: a nod to how it used to start. */
export const ERA_CARDS = {
  1972: ['INSERT COIN', 'CREDIT 01   1UP 000000   HI 999990'],
  1982: ['LOAD "JOURNEY",8,1', 'SEARCHING... LOADING... READY.'],
  1990: ['INSERT DISK 2', 'PAL  50 HZ  512K CHIP'],
  1994: ['C:\\SEEDSCENE> JOURNEY.EXE', 'VGA 320X200  256 COLOURS  SOUND OK'],
  1997: ['PRESS START', '32-BIT  CD-ROM  ANALOG CONTROL'],
  2000: ['PRECALCULATING...', '64K INTRO  ALL CODE, NO DATA'],
  2010: ['COMPILING SHADERS... DONE', 'RAYMARCHING  NEON  NOW'],
};
// each era's chime, the start-up sound of the screen most of its things were seen on
const CHIME_OF = { arcade: 'arcade', c64: 'c64', amiga: 'amiga', vga: 'dos', composite: 'console', snes: 'console', gameboy: 'handheld', nokia: 'handheld' };

const BLOCK = 3;               // autoplay: tracks per era before moving on
const TWELVE = 12;             // born in: the age the era is the viewer's own
const SNAP = 0.1;              // a cut moves to a drop or a crash this share of a scene away, at most

/** THE PACE: seconds a track and a scene last, unless the viewer says otherwise. */
export const TRACK_SECONDS = 40;
export const SCENE_SECONDS = 20;
export const PACE_LIMITS = { track: [12, 600], scene: [5, 600] };

/** A pace as asked for (numbers, text, or nothing), in range and whole. */
export function cleanPace({ track, scene } = {}) {
  const clean = (v, dflt, [lo, hi]) => {
    const n = Number(v);
    return v === undefined || v === null || v === '' || !Number.isFinite(n) ? dflt : Math.min(hi, Math.max(lo, Math.round(n)));
  };
  return { track: clean(track, TRACK_SECONDS, PACE_LIMITS.track), scene: clean(scene, SCENE_SECONDS, PACE_LIMITS.scene) };
}

/** Born in: the era of the year the viewer turned twelve - or, if that era has no scenes yet, the latest before it that has. */
export function bornInHome(year) {
  const at = year + TWELVE;
  let home = ERA_NAMES[0];
  for (const e of ERA_NAMES) if (at >= ERAS[e].year) home = e;
  return home;
}

/**
 * A list dealt round after round, without end: each round the whole list in a new order drawn by the
 * seed, so nothing comes again before all of it has come round, and a round never replays the last
 * one's order by rote (a list as long as a track's or a visit's share would otherwise come back in
 * the same order every time). A round opens away from where the last one closed: not on its last
 * item, nor - with four or more to deal - on the one before it, so a part that runs over the end of
 * a round shows no item twice. `rounds` keeps the rounds dealt so far.
 */
function dealt(rounds, seed, label, list, n) {
  const len = list.length;
  const r = Math.floor(n / len);
  while (rounds.length <= r) {
    const k = rounds.length;
    const round = new Rng(seed, k ? `${label}/${k}` : label).shuffle(list);
    const gap = len > 3 ? 2 : len > 1 ? 1 : 0;
    const prev = rounds[k - 1];
    for (let p = 0; prev && p < gap; p++) {
      const tail = prev.slice(len - (gap - p));
      if (!tail.includes(round[p])) continue;
      const q = round.findIndex((x, j) => j > p && !tail.includes(x));
      if (q > p) [round[p], round[q]] = [round[q], round[p]];
    }
    // the same order as the last round: the last two change places (the opening stays as it was set)
    if (prev && len > 2 && round.every((x, j) => x === prev[j])) [round[len - 2], round[len - 1]] = [round[len - 1], round[len - 2]];
    rounds.push(round);
  }
  return rounds[r][n % len];
}

/**
 * The overlap from one track into the next: `beats` beats of each, played
 * together over `seconds`, on a tempo that glides from the outgoing track's
 * to the incoming one's - bent just enough that the beats fill the time
 * exactly.
 */
class Transition {
  constructor(a, b, beats, seconds, middle) {
    this.a = a.bpm;
    this.b = b.bpm;
    this.beats = beats;
    this.seconds = seconds;
    this.middle = middle;        // beats the outgoing track plays at its own tempo before the overlap
    this.bend = (beats * 60 / seconds - (this.a + this.b) / 2) * Math.PI / 2;
    this.found = new Map();      // beat -> fraction: a chord's notes, and the ends of notes, ask for the same beats
  }

  /** Beats played by fraction u of the overlap. */
  beatsAt(u) {
    const { a, b, bend } = this;
    return this.seconds / 60 * (a * u + (b - a) * (u ** 3 - u ** 4 / 2) + bend * (1 - Math.cos(Math.PI * u)) / Math.PI);
  }

  /** The fraction of the overlap where beat x falls. */
  fractionAt(x) {
    const known = this.found.get(x);
    if (known !== undefined) return known;
    let lo = 0, hi = 1;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (this.beatsAt(mid) < x) lo = mid; else hi = mid;
    }
    this.found.set(x, (lo + hi) / 2);
    return (lo + hi) / 2;
  }
}

export class Programme {
  /**
   * @param {{seed:string, kind:'journey'|'autoplay', partSec:number, sceneSec?:number, count?:number, passes?:number, era?:string}} o
   */
  constructor({ seed, kind, partSec, sceneSec = SCENE_SECONDS, count, bornIn, passes, board, era }) {
    this.seed = seed;
    this.kind = kind;
    this.board = board || 'auto';  // SOUND BOARD: auto (each track its first scene's), or one forced on all
    // born in: AUTOPLAY round the era of the viewer's twelfth year
    this.bornIn = kind === 'autoplay' && Number.isInteger(bornIn) ? bornIn : null;
    this.home = this.bornIn !== null ? bornInHome(this.bornIn) : null;
    // held in one era: AUTOPLAY on the era the viewer asked for, and no other (born in comes first)
    this.era = kind === 'autoplay' && this.bornIn === null && ERA_NAMES.includes(era) ? era : null;
    this.opening = 0;              // held in one era: the track its card opens (where the page dropped in)
    this.partSec = partSec;
    this.sceneSec = sceneSec;
    // scenes a track plays: the whole number nearest the pace, at least one
    this.sceneCount = Math.max(1, Math.round(partSec / sceneSec));
    // THE JOURNEY: every era once a pass; live, pass after pass (or as many tracks as a render asks for)
    this.count = count || (kind === 'journey' ? ERA_NAMES.length * Math.max(1, passes || 1) : 100000);
    this.cache = new Map();
    this.transitions = new Map();
    this.leads = new Map();
    this.visits = [];              // autoplay: how many blocks before each one were in its era
    this.deals = new Map();        // each list's rounds dealt so far
    this.journeyPlans = [];        // THE JOURNEY: the parts planned so far (each opens away from the one before)
    const total = this.partSec * this.count;
    this.totalSamples = Math.round(total * SAMPLE_RATE);
    this.meta = { duration: total, title: kind === 'journey' ? 'THE JOURNEY' : this.bornIn !== null ? `BORN IN ${this.bornIn}` : this.era ? `AUTOPLAY ${ERAS[this.era].label}` : 'AUTOPLAY' };
  }

  /** Era, scene and music of part i, without composing it. */
  /** The n-th item of a list dealt round after round (see dealt). */
  deal(seed, label, list, n) {
    const key = `${seed}\n${label}`;
    if (!this.deals.has(key)) this.deals.set(key, []);
    return dealt(this.deals.get(key), seed, label, list, n);
  }

  plan(i) {
    if (this.kind === 'journey') {
      // planned in order, each part from the one before it (only the last few are worth keeping)
      for (let j = this.journeyPlans.length; j <= i; j++) this.journeyPlans.push(this.journeyPlan(j, this.journeyPlans[j - 1]));
      return this.journeyPlans[i];
    }
    // autoplay: eras in blocks of tracks; music and scenes in a fresh order every block
    const block = Math.floor(i / BLOCK);
    const k = i % BLOCK;
    const era = this.blockEra(block);
    const music = this.blockMusic(block);
    const order = this.blockScenes(block);
    return {
      era,
      style: order[(k * this.sceneCount) % order.length],
      music: music[k % music.length],
      seed: `${this.seed}/${i}`,
      // held in one era, its card opens only the first track seen; every other one has its NOW PLAYING
      eraChanged: this.era ? i === this.opening : k === 0,
    };
  }

  /**
   * THE JOURNEY: part i, given the part before it. The era's scenes and music, dealt by the seed round
   * after round, taken a few at a time pass after pass, so every scene and every style comes round,
   * each round in a new order. Eras share scenes and styles: a part does not open on the scene the one
   * before it closed on, nor play the style it played.
   */
  journeyPlan(i, before) {
    const era = ERA_NAMES[i % ERA_NAMES.length];
    const pass = Math.floor(i / ERA_NAMES.length);
    const e = ERAS[era];
    const key = `${this.seed}/${era}`;
    const k = Math.min(e.scenes.length, this.sceneCount);
    const scenes = Array.from({ length: k }, (_, j) => this.deal(key, 'journey-scenes', e.scenes, pass * k + j));
    let music = this.deal(key, 'journey-music', e.music, pass);
    // (an era of few scenes can deal the last pass's again: not in the same order)
    const lastPass = this.journeyPlans[i - ERA_NAMES.length];
    if (k > 1 && lastPass && scenes.every((sc, j) => sc === lastPass.scenes[j])) [scenes[0], scenes[1]] = [scenes[1], scenes[0]];
    if (before) {
      const last = before.scenes[before.scenes.length - 1];
      const j = scenes.indexOf(last) === 0 ? scenes.findIndex((sc) => sc !== last) : -1;
      if (j > 0) [scenes[0], scenes[j]] = [scenes[j], scenes[0]];
      // (the era's next style instead - the one after it in the deal comes round on the next pass)
      if (music === before.music && e.music.length > 1) music = this.deal(key, 'journey-music', e.music, pass + 1);
    }
    return {
      era, style: scenes[0], scenes, music,
      seed: pass ? `${this.seed}/${era}/${pass}` : `${this.seed}/${era}`, eraChanged: true,
    };
  }

  /**
   * Autoplay: the era of a block - every era once a cycle, in a new order each cycle.
   * Born in: the viewer's own era every other block, from the first; between them an
   * era drawn by how near its year is to the one they turned twelve in. Held in one era: that era.
   */
  blockEra(block) {
    if (this.era) return this.era;
    if (this.home) {
      if (block % 2 === 0) return this.home;
      const at = this.bornIn + TWELVE;
      const others = ERA_NAMES.filter((e) => e !== this.home);
      return new Rng(this.seed, `born-${this.bornIn}-${block}`).weighted(others, others.map((e) => Math.exp(-Math.abs(ERAS[e].year - at) / 5)));
    }
    const cycle = Math.floor(block / ERA_NAMES.length);
    return this.cycleEras(cycle)[block % ERA_NAMES.length];
  }

  /** Autoplay: a cycle's order of the eras - never opening on the era the cycle before closed on. */
  cycleEras(cycle) {
    const order = new Rng(this.seed, `autoplay-cycle-${cycle}`).shuffle(ERA_NAMES);
    if (cycle > 0 && order.length > 2) {
      const before = new Rng(this.seed, `autoplay-cycle-${cycle - 1}`).shuffle(ERA_NAMES);
      // (the cycle before is taken as drawn: only its first two can have moved, never its last)
      if (order[0] === before[before.length - 1]) [order[0], order[1]] = [order[1], order[0]];
    }
    return order;
  }

  /** Autoplay: how many blocks before this one played its era - where its era's lists carry on from. */
  eraVisit(block) {
    for (let b = this.visits.length; b <= block; b++) {
      const era = this.blockEra(b);
      let v = 0;
      for (let c = b - 1; c >= 0; c--) if (this.blockEra(c) === era) { v = this.visits[c] + 1; break; }
      this.visits.push(v);
    }
    return this.visits[block];
  }

  /**
   * Autoplay: the share of an era's scenes or music a block plays - `perVisit` of them, on from where
   * the era's last visit stopped in its deal (see dealt), so each visit plays the next of them and a
   * list comes round again only when all of it has played, each time in a new order.
   */
  eraDeal(block, kind, list, perVisit, skip = 0) {
    const at = this.eraVisit(block) * perVisit + skip;
    return Array.from({ length: perVisit }, (_, j) => this.deal(this.seed, `autoplay-${kind}-${this.blockEra(block)}`, list, at + j));
  }

  /**
   * Autoplay: the order a block plays its era's scenes in - on from where the era's last visit stopped.
   * It does not open on a scene the last block may have closed on (eras share scenes): any of the
   * places its last track could have reached, or the one it may have swapped.
   */
  blockScenes(block) {
    const share = (n, skip) => this.eraDeal(n, 'scenes', ERAS[this.blockEra(n)].scenes, BLOCK * this.sceneCount, skip);
    // (an era of few scenes can deal the last visit's order again: then it starts one further on in its deal;
    // not where a block follows another in its era, which goes on from it, scene after scene)
    const draw = (n) => {
      const mine = share(n, 0);
      if (n > 0 && this.blockEra(n - 1) === this.blockEra(n)) return mine;
      let c = n - 1;
      while (c >= 0 && this.blockEra(c) !== this.blockEra(n)) c--;
      return c >= 0 && share(c, 0).join() === mine.join() ? share(n, 1) : mine;
    };
    const order = draw(block);
    // (a block after one in its own era carries on in the era's deal, which never repeats a scene in a row)
    if (block > 0 && this.blockEra(block - 1) !== this.blockEra(block)) {
      const prev = draw(block - 1);
      const last = (BLOCK - 1) * this.sceneCount;
      const maybe = [0, ...Array.from({ length: this.sceneCount }, (_, j) => last + j)].map((j) => prev[j % prev.length]);
      // (and where the swap leaves no scene next to itself, in the order the block plays them)
      const fits = (sc, j) => j > 0 && !maybe.includes(sc);
      const apart = (j) => [j - 1, j + 1].every((n) => n < 1 || n >= order.length || order[n] !== order[0])
        && (j === 1 || order[1] !== order[j]);
      const good = order.findIndex((sc, n) => fits(sc, n) && apart(n));
      const j = !maybe.includes(order[0]) ? -1 : good > 0 ? good : order.findIndex(fits);
      if (j > 0) [order[0], order[j]] = [order[j], order[0]];
    }
    return order;
  }

  /**
   * Autoplay: the order a block plays its era's music in, on from the era's last visit. Eras share styles,
   * so a block that would open on the style the last block (as drawn) closed
   * on starts one further on in its era's deal instead (never two of a style in a row, even in an
   * era of two).
   */
  blockMusic(block) {
    const list = ERAS[this.blockEra(block)].music;
    const order = this.eraDeal(block, 'music', list, BLOCK);
    if (block > 0 && list.length > 1) {
      const prev = this.eraDeal(block - 1, 'music', ERAS[this.blockEra(block - 1)].music, BLOCK);
      if (order[0] === prev[BLOCK - 1]) return this.eraDeal(block, 'music', list, BLOCK, 1);
    }
    return order;
  }

  /** The scenes track i plays, in order; never the same one twice in a track (an era with few plays fewer). */
  trackScenes(i, pl) {
    if (this.kind === 'journey') return pl.scenes;
    const order = this.blockScenes(Math.floor(i / BLOCK));
    const first = (i % BLOCK) * this.sceneCount;
    const n = Math.min(this.sceneCount, ERAS[pl.era].scenes.length);
    return Array.from({ length: n }, (_, j) => order[(first + j) % order.length]);
  }

  /**
   * Where track i's scenes change, in seconds into its slot: its time on screen shared out evenly, each cut
   * moved onto a drop or a crash that opens a phrase if one falls close, or else onto the nearest bar line.
   */
  sceneCuts(i, scenes, score, inOffset) {
    const from = this.viewFrom(i), to = this.partSec - this.leadOf(i + 1);
    const n = scenes.length;
    const each = (to - from) / n;
    const { barSec } = score.meta;
    const at = (bar) => bar * barSec - inOffset;         // a bar line, in seconds into the slot
    const marks = [];
    score.arrangement.forEach((x, bar) => { if (x.drop || x.crash) marks.push(at(bar)); });
    const cuts = [from];
    for (let q = 1; q < n; q++) {
      const even = from + each * q;
      const fits = (t) => t - cuts[cuts.length - 1] >= each / 2 && to - t >= (n - q) * each / 2;
      const near = marks.filter((t) => Math.abs(t - even) <= each * SNAP && fits(t)).sort((x, y) => Math.abs(x - even) - Math.abs(y - even))[0];
      const bar = at(Math.round((even + inOffset) / barSec));
      cuts.push(near !== undefined ? near : fits(bar) ? bar : even);
    }
    return cuts.map((t, j) => ({ from: t, style: scenes[j] }));
  }

  /**
   * Seconds before its slot that track i comes on screen: the new track's bar line nearest the middle of
   * the overlap, where the basslines swap (without an overlap - the first track, or none before it - none).
   */
  leadOf(i) {
    const into = this.transition(i - 1);
    if (!into) return 0;
    if (this.leads.has(i)) return this.leads.get(i);
    const { barBeats } = this.tempo(i);
    const swapBeat = Math.round(into.beats / barBeats / 2) * barBeats;
    const lead = into.seconds * (1 - into.fractionAt(swapBeat));
    this.leads.set(i, lead);
    if (this.leads.size > 8) this.leads.delete(this.leads.keys().next().value);
    return lead;
  }

  /** When track i comes on screen, in seconds into its slot (at or before 0). */
  viewFrom(i) { return -this.leadOf(i); }

  /** When track i comes on screen, in seconds of the programme. */
  viewStart(i) { return i * this.partSec - this.leadOf(i); }

  /** The track on screen at t: the slot's, until the next track's swap. */
  viewIndexAt(t) {
    const i = this.indexAt(t);
    return i + 1 < this.count && t >= this.viewStart(i + 1) ? i + 1 : i;
  }

  /**
   * Where the live page drops into an endless programme, for u in [0, 1): anywhere
   * in AUTOPLAY; born in, at the start of one of the viewer's own era's blocks; held in one era,
   * at the start of a block, the era's card opening it.
   */
  entry(u) {
    const n = Math.min(this.count, 50000);
    if (this.home) return Math.floor(u * n / (2 * BLOCK)) * 2 * BLOCK;
    if (this.era) return (this.opening = Math.floor(u * n / BLOCK) * BLOCK);
    return Math.floor(u * n);
  }

  /** Part i, composed on first use; only the last few are kept. */
  part(i) {
    if (this.cache.has(i)) return this.cache.get(i);
    const build = this.build(i);
    let r = build.next();
    while (!r.done) r = build.next();
    return r.value;
  }

  /** Where part i starts sounding (its overlap with the one before), without composing it. */
  audioStartOf(i) {
    const into = this.transition(i - 1);
    return Math.round((i * this.partSec - (into ? into.seconds : 0)) * SAMPLE_RATE);
  }

  /**
   * Part i, composed in slices: each next() does a little and the last returns
   * the part. The audio thread takes one slice per block, so a new track is
   * never composed all at once while music plays; part() runs it straight through.
   */
  *build(i) {
    const pl = this.plan(i);
    // the track runs from the start of its overlap with the one before to the
    // end of its overlap with the one after: lead-in, its own middle, lead-out
    const into = this.transition(i - 1), out = this.transition(i);
    const { spb } = this.tempo(i);
    const inBeats = into ? into.beats : 0, inSec = into ? into.seconds : 0;
    const midBeats = out ? out.middle : this.partSec / spb;
    const outBeats = out ? out.beats : 0, outSec = out ? out.seconds : 0;
    // the track's one sound board (it cannot change in the middle of a tune): see trackBoardFor
    const trackScenes = this.trackScenes(i, pl);
    const score = composeScore(pl.seed, (inBeats + midBeats + outBeats) * spb, pl.music, chipOfBoard(trackBoardFor(trackScenes, pl.era, pl.seed, this.board)));
    yield;
    // score time -> seconds after the track starts sounding
    const warp = (s) => {
      const b = s / spb;
      if (b < inBeats) return into.fractionAt(b) * inSec;
      if (b <= inBeats + midBeats) return inSec + (b - inBeats) * spb;
      const x = b - inBeats - midBeats;
      return x < outBeats ? inSec + midBeats * spb + out.fractionAt(x) * outSec : null;
    };
    const audioSec = inSec + midBeats * spb + outSec;
    const events = [];
    let sliced = 0;
    for (const e of score.events) {
      if ((++sliced & 63) === 0) yield;
      const t0 = warp(e.t / SAMPLE_RATE);
      if (t0 === null) continue;
      const t1 = warp((e.t + e.dur) / SAMPLE_RATE);
      events.push({ ...e, t: Math.round(t0 * SAMPLE_RATE), dur: Math.max(1, Math.round(((t1 === null ? audioSec : t1) - t0) * SAMPLE_RATE)) });
    }
    const startSec = i * this.partSec;
    const inOffset = inBeats * spb;
    const lead = this.leadOf(i);
    const between = this.between(pl, inSec, audioSec, score.meta, lead);
    let features = null;
    const p = {
      index: i, ...pl,
      // the scenes this part plays, and from when (seconds into the part; the first from before it, at the swap)
      scenes: this.sceneCuts(i, trackScenes, score, inOffset),
      startSec,
      start: Math.round(startSec * SAMPLE_RATE),
      duration: this.partSec,
      // when it is on screen, in seconds into the part: from one swap to the next
      view: { from: -lead, to: this.partSec - this.leadOf(i + 1) },
      // what the synth plays: the score with its first and last beats laid on the shared tempo
      audio: { meta: score.meta, events, totalSamples: Math.round(audioSec * SAMPLE_RATE) },
      // the sounds between the tracks, played over the mix rather than in it
      between,
      audioStart: Math.round((startSec - inSec) * SAMPLE_RATE),
      outStart: Math.round((startSec + this.partSec - outSec) * SAMPLE_RATE),
      inOffset,
      /** Score time at t seconds into the part's slot, on the same clock the music plays. */
      scoreTimeAt: (t) => {
        if (into && t < 0) return into.beatsAt((t + inSec) / inSec) * spb;   // on screen already, in the overlap's second half
        return !out || t < this.partSec - outSec
          ? inOffset + t
          : (inBeats + midBeats + out.beatsAt((t - (this.partSec - outSec)) / outSec)) * spb;
      },
      score,
      meta: score.meta,
      // the visuals' feature track, built only when something draws it (the synth never does)
      get features() { return features || (features = new Features(score)); },
      // the cards load whichever programme is playing
      card: pl.eraChanged
        ? { kind: 'era', lines: this.eraCard(pl.era) }
        : { kind: 'track' },
    };
    if (this.cache.has(i)) return this.cache.get(i);   // finished another way meanwhile
    this.cache.set(i, p);
    if (this.cache.size > 4) this.cache.delete(this.cache.keys().next().value);
    return p;
  }

  /**
   * The sounds between the tracks for a part, on the part's own clock (0 is where it starts
   * sounding, inSec where its slot opens): a modem's handshake through the mix into the
   * years from 2000 (the Y2K PC stands in for the media-player years), the line connecting on
   * the drop (not held in one era, where no track comes in from another); a cartridge going in as a track starts whose scene is on the Game Boy's screen;
   * and in THE JOURNEY, the era's chime as it comes on screen, on the incoming track's key.
   */
  between(pl, inSec, audioSec, meta, lead = 0) {
    const events = [];
    const at = (sec) => Math.round(sec * SAMPLE_RATE);
    if (String(pl.era) === '2000' && pl.eraChanged && inSec > 0 && !this.era) events.push({ t: 0, instr: 'modem', note: 0, vel: 0.8, dur: at(inSec) });
    if (SCENE_DISPLAY[pl.style] === 'gameboy') events.push({ t: 0, instr: 'cartridge', note: 0, vel: 0.8, dur: at(0.4) });
    if (this.kind === 'journey' && pl.eraChanged && ERAS[pl.era].display !== 'svga') {
      events.push({ t: at(inSec - lead), instr: 'chime', kit: CHIME_OF[ERAS[pl.era].display] || 'bell', note: 60 + meta.root, vel: 0.55, dur: at(2.5) });
    }
    return {
      meta: { fx: { reverb: 0.5, delay: 0.3, delayBeats: 0.5 }, spb: meta.spb, chip: null },
      events, totalSamples: at(audioSec),
    };
  }

  /** The card an era opens on; born in, the viewer's own era says so. */
  eraCard(era) {
    const lines = ERA_CARDS[era].map((l) => l.replace('JOURNEY', this.kind.toUpperCase()));
    if (era === this.home) lines[1] = `BORN ${this.bornIn}   TWELVE IN ${this.bornIn + TWELVE}`;
    return lines;
  }

  /** A part's tempo, without composing it. */
  tempo(i) {
    const pl = this.plan(i);
    return scoreTempo(pl.seed, pl.music);
  }

  /** Bars of the incoming track that play over the outgoing one. */
  leadBars() { return this.partSec >= 30 ? 4 : 2; }

  /** The overlap from part i into part i+1, or null after the last part. */
  transition(i) {
    if (i < 0 || i >= this.count - 1) return null;
    if (this.transitions.has(i)) return this.transitions.get(i);
    const a = this.tempo(i), b = this.tempo(i + 1);
    // part i plays whole beats at its own tempo up to the overlap, which takes the rest of its
    // slot; of a bar more or less than planned, take the length that bends the tempo least.
    // Whole bars, so the new track's slot opens on one of its bar lines - and a whole number of
    // beats, so the track after it lines up on whole beats too (an odd metre's 13-step bar is
    // 3.25 beats: then only four bars will do).
    const L = this.leadBars();
    const whole = (n) => n >= 1 && Math.abs(n * b.barBeats - Math.round(n * b.barBeats)) < 1e-9;
    let tr = null;
    for (const bars of [L, L - 1, L + 1, 4].filter(whole)) {
      const beats = bars * b.barBeats;
      const middle = Math.round((this.partSec - beats * 120 / (a.bpm + b.bpm)) / a.spb);
      const t = new Transition(a, b, beats, this.partSec - middle * a.spb, middle);
      if (!tr || Math.abs(t.bend) < Math.abs(tr.bend) - 1e-9) tr = t;
    }
    this.transitions.set(i, tr);
    if (this.transitions.size > 8) this.transitions.delete(this.transitions.keys().next().value);
    return tr;
  }

  /** Every part — for finite programmes only. */
  get parts() {
    return Array.from({ length: Math.min(this.count, 64) }, (_, i) => this.part(i));
  }

  indexAt(t) {
    return Math.min(this.count - 1, Math.max(0, Math.floor(t / this.partSec)));
  }
}

/**
 * THE JOURNEY: every era once a pass, each a track at the pace. `duration` seconds of it for a render
 * (one pass is SCENE_ERAS x the track's length); with none, `passes` passes - live, one after another,
 * each with the next scenes of every era and the next of its music.
 */
export function composeJourney(seed, duration = null, passes = 1, board = 'auto', pace = {}) {
  const { track, scene } = cleanPace(pace);
  const count = duration ? Math.max(1, Math.ceil(duration / track)) : undefined;
  return new Programme({ seed, kind: 'journey', partSec: track, sceneSec: scene, count, passes, board });
}
/** Passes a live journey plays before it comes round to the first again. */
export const JOURNEY_PASSES = 500;

/** AUTOPLAY: an endless mix, or `duration` seconds of it for a render; born in a year, round its era; or held in one era. */
export function composeAutoplay(seed, duration, bornIn = null, board = 'auto', era = null, pace = {}) {
  const { track, scene } = cleanPace(pace);
  const count = duration ? Math.max(1, Math.ceil(duration / track)) : undefined;
  return new Programme({ seed, kind: 'autoplay', partSec: track, sceneSec: scene, count, bornIn, board, era });
}

/**
 * The track on screen at time t (seconds), t within its view, the scene showing
 * then, and the time in its score - the clock its music and features run on.
 */
export function partAt(programme, t) {
  const part = programme.part(programme.viewIndexAt(t));
  const local = t - part.startSec;
  let scene = part.scenes[0];
  for (const sc of part.scenes) if (sc.from <= local) scene = sc;
  return { part, local, scene, time: part.scoreTimeAt(local) };
}

// the mix: a state-variable filter (Zavalishin's TPT form), one per channel and kind
class Filter {
  constructor() { this.s1 = 0; this.s2 = 0; this.g = 0; this.k = Math.SQRT2; }
  tune(hz) { this.g = Math.tan(Math.PI * Math.min(hz, SAMPLE_RATE * 0.45) / SAMPLE_RATE); }
  run(x, high) {
    const { g, k } = this;
    const a1 = 1 / (1 + g * (g + k));
    const v3 = x - this.s2;
    const v1 = a1 * this.s1 + g * a1 * v3;
    const v2 = this.s2 + g * v1;
    this.s1 = 2 * v1 - this.s1;
    this.s2 = 2 * v2 - this.s2;
    return high ? x - k * v1 - v2 : v2;
  }
}

const HP_THIN = 900, HP_FULL = 20, LP_OPEN = 19000, LP_SHUT = 900;
const glide = (a, b, u) => a * (b / a) ** Math.min(1, Math.max(0, u));

/**
 * How part p sits in the mix at sample s: its level, and where its high-pass
 * and low-pass filters are. Coming in, it is thin until halfway, when the
 * basslines swap; going out, it gives up its bass at the swap and fades behind
 * a closing filter. The levels cross at equal power.
 */
function mixAt(p, s) {
  if (s < p.start) {
    const u = (s - p.audioStart) / (p.start - p.audioStart);
    return { gain: Math.sin(Math.PI / 2 * u), hp: glide(HP_THIN, HP_FULL, (u - 0.5) / 0.15), lp: LP_OPEN };
  }
  if (s >= p.outStart && p.outStart < p.start + p.duration * SAMPLE_RATE) {
    const u = (s - p.outStart) / (p.audioStart + p.audio.totalSamples - p.outStart);
    return { gain: Math.cos(Math.PI / 2 * u), hp: glide(HP_FULL, HP_THIN, (u - 0.5) / 0.15), lp: glide(LP_OPEN, LP_SHUT, (u - 0.5) / 0.5) };
  }
  return { gain: 1, hp: HP_FULL, lp: LP_OPEN };
}

/** The same interface as Synth, playing a programme's parts back to back, mixed into each other. */
export class ProgrammeSynth {
  /** @param {Programme} programme  @param {number} [startPart] where playback begins */
  constructor(programme, startPart = 0) {
    this.programme = programme;
    // the eras' sound chips, ready before the first note rather than mid-song
    for (const era of ERA_NAMES) for (const chip of ERA_CHIPS[era] || []) prepareChip(chip, ERAS[era].music);
    this.pos = programme.part(startPart).start;
    this.first = startPart;
    this.slot = -1;
    this.decks = new Map();      // part index -> its synth and filters
    this.bufL = new Float32Array(128);
    this.bufR = new Float32Array(128);
    this.fxL = new Float32Array(16);
    this.fxR = new Float32Array(16);
    this.limGain = 1;
  }

  /** Part k's deck: composed, its synth made and set at sample `at` of the programme. */
  deck(k, at) {
    let d = this.decks.get(k);
    if (!d) {
      const p = this.programme.part(k);
      const synth = new Synth(p.audio, p.seed);
      if (at > p.audioStart) synth.seek(at - p.audioStart);    // joining a track under way
      // the sounds between the tracks: their own synth, outside the part's fades and filters
      const fx = p.between.events.length ? new Synth(p.between, p.seed) : null;
      if (fx && at > p.audioStart) fx.seek(at - p.audioStart);
      d = { p, synth, fx, hp: [new Filter(), new Filter()], lp: [new Filter(), new Filter()] };
      this.decks.set(k, d);
    }
    return d;
  }

  render(outL, outR, offset, n) {
    for (let i = 0; i < n; i++) { outL[offset + i] = 0; outR[offset + i] = 0; }
    const pr = this.programme;
    const now = pr.indexAt(this.pos / SAMPLE_RATE);
    // the next track is composed and its synth readied while only one track plays: once the
    // last one has faded out, well before the next comes in - never in the middle of a mix,
    // when the audio thread has two tracks to play
    if (now !== this.slot) { this.slot = now; this.readied = now + 1 >= pr.count; }
    if (!this.readied) {
      const prev = now - 1 >= this.first ? this.decks.get(now - 1) : null;
      if (!prev || this.pos >= prev.p.audioStart + prev.p.audio.totalSamples) {
        this.readied = true;
        this.building = { k: now + 1, slices: pr.build(now + 1) };
      }
    }
    if (this.building) {
      const b = this.building;
      const r = b.slices.next();
      if (r.done) { this.building = null; this.deck(b.k, r.value.audioStart); }
    }
    for (let k = Math.max(this.first, now - 1); k <= Math.min(pr.count - 1, now + 1); k++) {
      // the next track only once it is ready, or due - then whatever is left is done now
      if (k === now + 1 && !this.decks.has(k) && this.pos + n <= pr.audioStartOf(k)) continue;
      const p = pr.part(k);
      const from = Math.max(this.pos, p.audioStart);
      const to = Math.min(this.pos + n, p.audioStart + p.audio.totalSamples);
      if (to <= from) continue;
      const d = this.deck(k, from);
      let done = from;
      while (done < to) {
        // the mix moves in steps on a fixed grid of 16 samples, whatever the block size
        const m = Math.min(16 - (done % 16), to - done);
        d.synth.render(this.bufL, this.bufR, 0, m);
        const mx = mixAt(p, done);
        for (const f of d.hp) f.tune(mx.hp);
        for (const f of d.lp) f.tune(mx.lp);
        const o = offset + (done - this.pos);
        for (let jj = 0; jj < m; jj++) {
          outL[o + jj] += d.lp[0].run(d.hp[0].run(this.bufL[jj], true), false) * mx.gain;
          outR[o + jj] += d.lp[1].run(d.hp[1].run(this.bufR[jj], true), false) * mx.gain;
        }
        if (d.fx) {
          d.fx.render(this.fxL, this.fxR, 0, m);
          for (let jj = 0; jj < m; jj++) { outL[o + jj] += this.fxL[jj]; outR[o + jj] += this.fxR[jj]; }
        }
        done += m;
      }
    }
    // where two tracks overlap, a limiter keeps the sum where one track would be
    for (let i = offset; i < offset + n; i++) {
      const peak = Math.max(Math.abs(outL[i]), Math.abs(outR[i]));
      const target = peak > 0.82 ? 0.82 / peak : 1;
      this.limGain += (target - this.limGain) * (target < this.limGain ? 0.05 : 0.0004);
      const g = Math.min(this.limGain, peak > 0 ? 0.86 / peak : 1);
      outL[i] *= g; outR[i] *= g;
    }
    for (const k of this.decks.keys()) if (k < now) { const p = this.decks.get(k).p; if (p.audioStart + p.audio.totalSamples <= this.pos) this.decks.delete(k); }
    this.pos += n;
  }
}

/** Kept for the tests and tools written against the first journey. */
export const JourneySynth = ProgrammeSynth;
