// Programmes: demos played one after another.
//
//   THE JOURNEY  one part per era, oldest first, three of the era's scenes in each,
//                cut where the music turns. Played again it goes on through
//                each era's list, three scenes a time, and its music, so
//                every pass shows what the last did not: the seed sets the
//                order the lists start in, not how much of them is seen.
//   AUTOPLAY     an endless mix: a few tracks in one era, then another era.
//                Born in a year, it opens in the era the viewer was twelve in
//                and keeps coming back to it, the eras between drawn from the
//                ones nearest it.
//                Every 40 seconds a new track, and inside each track the
//                scene changes where the music turns - on the drop, on the
//                crash that opens a phrase - two or three scenes a track.
//                Each era deals its scenes and its music once, in the seed's
//                order, and every visit to it goes on where the last one
//                stopped, so the whole catalogue comes round before any of
//                it comes again. It can run for hours and never repeats a
//                pairing in a row.
//
// Every part has its own sub-seed, scene, era and music, composed at its own
// tempo, and is built only when it is needed — on the page and in the
// AudioWorklet alike, from the same seed, so both always agree.
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
import { boardFor, chipOfBoard } from './boards.js';
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
const SCENES_PER_TRACK = 3;    // autoplay: at most this many scenes in one track
const MIN_SCENE = 9;           // autoplay: seconds a scene plays at least
const JOURNEY_SCENES = 3;      // THE JOURNEY: scenes in each era's part
const JOURNEY_MIN_SCENE = 7;   // THE JOURNEY: seconds a scene plays at least (a short part plays fewer)
export const AUTOPLAY_PART = 40;
const TWELVE = 12;             // born in: the age the era is the viewer's own

/** Born in: the era of the year the viewer turned twelve - or, if that era has no scenes yet, the latest before it that has. */
export function bornInHome(year) {
  const at = year + TWELVE;
  let home = ERA_NAMES[0];
  for (const e of ERA_NAMES) if (at >= ERAS[e].year) home = e;
  return home;
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
   * @param {{seed:string, kind:'journey'|'autoplay', partSec:number, count?:number, passes?:number}} o
   */
  constructor({ seed, kind, partSec, count, bornIn, passes, board }) {
    this.seed = seed;
    this.kind = kind;
    this.board = board || 'auto';  // SOUND BOARD: auto (each track its first scene's), or one forced on all
    // born in: AUTOPLAY round the era of the viewer's twelfth year
    this.bornIn = kind === 'autoplay' && Number.isInteger(bornIn) ? bornIn : null;
    this.home = this.bornIn !== null ? bornInHome(this.bornIn) : null;
    this.partSec = partSec;
    // THE JOURNEY: every era once a pass; live, pass after pass
    this.count = kind === 'journey' ? ERA_NAMES.length * Math.max(1, passes || 1) : (count || 100000);
    this.cache = new Map();
    this.transitions = new Map();
    this.visits = [];              // autoplay: how many blocks before each one were in its era
    const total = this.partSec * this.count;
    this.totalSamples = Math.round(total * SAMPLE_RATE);
    this.meta = { duration: total, title: kind === 'journey' ? 'THE JOURNEY' : this.bornIn !== null ? `BORN IN ${this.bornIn}` : 'AUTOPLAY' };
  }

  /** Era, scene and music of part i, without composing it. */
  plan(i) {
    if (this.kind === 'journey') {
      // the era's scenes and music in the seed's order, taken a few at a time pass after pass: when a
      // list runs out it starts again from the top, so every scene and every style comes round
      const era = ERA_NAMES[i % ERA_NAMES.length];
      const pass = Math.floor(i / ERA_NAMES.length);
      const e = ERAS[era];
      const order = new Rng(`${this.seed}/${era}`, 'journey-scenes').shuffle(e.scenes);
      const k = Math.min(order.length, this.journeyScenes());
      const scenes = Array.from({ length: k }, (_, j) => order[(pass * k + j) % order.length]);
      const tunes = new Rng(`${this.seed}/${era}`, 'journey-music').shuffle(e.music);
      return {
        era, style: scenes[0], scenes, music: tunes[pass % tunes.length],
        seed: pass ? `${this.seed}/${era}/${pass}` : `${this.seed}/${era}`, eraChanged: true,
      };
    }
    // autoplay: eras in blocks of tracks; music and scenes in a fresh order every block
    const block = Math.floor(i / BLOCK);
    const k = i % BLOCK;
    const era = this.blockEra(block);
    const music = this.blockMusic(block);
    return {
      era,
      style: this.blockScenes(block)[(k * SCENES_PER_TRACK) % ERAS[era].scenes.length],
      music: music[k % music.length],
      seed: `${this.seed}/${i}`,
      eraChanged: k === 0,
    };
  }

  /**
   * Autoplay: the era of a block - every era once a cycle, in a new order each cycle.
   * Born in: the viewer's own era every other block, from the first; between them an
   * era drawn by how near its year is to the one they turned twelve in.
   */
  blockEra(block) {
    if (this.home) {
      if (block % 2 === 0) return this.home;
      const at = this.bornIn + TWELVE;
      const others = ERA_NAMES.filter((e) => e !== this.home);
      return new Rng(this.seed, `born-${this.bornIn}-${block}`).weighted(others, others.map((e) => Math.exp(-Math.abs(ERAS[e].year - at) / 5)));
    }
    const cycle = Math.floor(block / ERA_NAMES.length);
    return new Rng(this.seed, `autoplay-cycle-${cycle}`).shuffle(ERA_NAMES)[block % ERA_NAMES.length];
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
   * Autoplay: an era's scenes or music, dealt once by the seed, turned on to where this block's visit
   * starts - so each visit plays the next of them, and the list starts again only when it runs out.
   */
  eraDeal(block, kind, list, perVisit) {
    const deal = new Rng(this.seed, `autoplay-${kind}-${this.blockEra(block)}`).shuffle(list);
    const at = (this.eraVisit(block) * perVisit) % deal.length;
    return [...deal.slice(at), ...deal.slice(0, at)];
  }

  /**
   * Autoplay: the order a block plays its era's scenes in - on from where the era's last visit stopped.
   * It does not open on a scene the last block may have closed on (eras share scenes): any of the
   * places its last track could have reached, or the one it may have swapped.
   */
  blockScenes(block) {
    const draw = (n) => this.eraDeal(n, 'scenes', ERAS[this.blockEra(n)].scenes, BLOCK * SCENES_PER_TRACK);
    const order = draw(block);
    if (block > 0) {
      const prev = draw(block - 1);
      const last = (BLOCK - 1) * SCENES_PER_TRACK;
      const maybe = [0, last, last + 1, last + 2].map((j) => prev[j % prev.length]);
      const j = order.findIndex((sc) => !maybe.includes(sc));
      if (j > 0) [order[0], order[j]] = [order[j], order[0]];
    }
    return order;
  }

  /**
   * Autoplay: the order a block plays its era's music in, on from the era's last visit. Eras share styles,
   * so a block that would open on the style the last block (as drawn) closed
   * on starts with its next one instead.
   */
  blockMusic(block) {
    const draw = (n) => this.eraDeal(n, 'music', ERAS[this.blockEra(n)].music, BLOCK);
    const order = draw(block);
    if (block > 0 && order.length > 1) {
      const prev = draw(block - 1);
      if (order[0] === prev[(BLOCK - 1) % prev.length]) order.push(order.shift());
    }
    return order;
  }

  /** THE JOURNEY: scenes in each part - three, or fewer where a part is too short to show them. */
  journeyScenes() {
    return Math.max(1, Math.min(JOURNEY_SCENES, Math.floor(this.partSec / JOURNEY_MIN_SCENE)));
  }

  /**
   * THE JOURNEY: where part i changes scene - the part shared out evenly between its scenes, each cut
   * moved onto a drop or a crash that opens a phrase if one falls near it, or else onto the nearest bar
   * line, as long as every scene keeps its time.
   */
  journeyCuts(pl, score, inOffset) {
    const k = pl.scenes.length;
    if (k < 2) return [{ from: 0, style: pl.style }];
    const { barSec } = score.meta;
    const len = this.partSec;
    const at = (bar) => bar * barSec - inOffset;
    const marks = [];
    score.arrangement.forEach((x, bar) => { if (x.drop || x.crash) marks.push(at(bar)); });
    const cuts = [];
    for (let q = 1; q < k; q++) {
      const even = (len * q) / k;
      const ok = (t) => t - (cuts.length ? cuts[cuts.length - 1] : 0) >= JOURNEY_MIN_SCENE && len - t >= JOURNEY_MIN_SCENE * (k - q);
      const near = marks.filter((t) => Math.abs(t - even) <= len / (3 * k) && ok(t)).sort((x, y) => Math.abs(x - even) - Math.abs(y - even))[0];
      const bar = at(Math.round((even + inOffset) / barSec));
      const lo = (cuts.length ? cuts[cuts.length - 1] : 0) + JOURNEY_MIN_SCENE, hi = len - JOURNEY_MIN_SCENE * (k - q);
      cuts.push(near !== undefined ? near : ok(bar) ? bar : Math.min(hi, Math.max(lo, even)));
    }
    return [0, ...cuts].map((from, j) => ({ from, style: pl.scenes[j] }));
  }

  /**
   * Autoplay: where the scene changes inside part i - on the drop, and on the
   * crashes that open a phrase, each scene playing at least MIN_SCENE seconds.
   * With nothing in the music to cut on, it cuts on the bar nearest the middle.
   */
  sceneCuts(i, score, inOffset) {
    const { barSec } = score.meta;
    const len = this.partSec;
    const at = (bar) => bar * barSec - inOffset;         // a bar line, in seconds into the slot
    const fits = (t, cuts) => t >= MIN_SCENE && len - t >= MIN_SCENE && cuts.every((c) => Math.abs(c - t) >= MIN_SCENE);
    // (an era with one scene has nothing to cut to; with two, one cut)
    const most = Math.min(SCENES_PER_TRACK, ERAS[this.blockEra(Math.floor(i / BLOCK))].scenes.length) - 1;
    if (most < 1) return [{ from: 0, style: this.blockScenes(Math.floor(i / BLOCK))[0] }];
    const cuts = [];
    score.arrangement.forEach((x, bar) => { if (x.drop && cuts.length < most && fits(at(bar), cuts)) cuts.push(at(bar)); });
    score.arrangement.forEach((x, bar) => {
      if (x.crash && cuts.length < most && fits(at(bar), cuts)) cuts.push(at(bar));
    });
    if (!cuts.length) cuts.push(at(Math.round((inOffset + len / 2) / barSec)));
    cuts.sort((x, y) => x - y);
    const order = this.blockScenes(Math.floor(i / BLOCK));
    const first = (i % BLOCK) * SCENES_PER_TRACK;
    return [0, ...cuts].map((from, j) => ({ from, style: order[(first + j) % order.length] }));
  }

  /**
   * Where the live page drops into an endless programme, for u in [0, 1): anywhere
   * in AUTOPLAY; born in, at the start of one of the viewer's own era's blocks.
   */
  entry(u) {
    const n = Math.min(this.count, 50000);
    if (this.home) return Math.floor(u * n / (2 * BLOCK)) * 2 * BLOCK;
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
    // the track's sound board: its first scene's (a board cannot change in the middle of a tune), or the forced one
    const score = composeScore(pl.seed, (inBeats + midBeats + outBeats) * spb, pl.music, chipOfBoard(boardFor(pl.style, pl.era, pl.seed, this.board)));
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
    const between = this.between(pl, inSec, audioSec, score.meta);
    let features = null;
    const p = {
      index: i, ...pl,
      // the scenes this part plays, and from when (seconds into the part)
      scenes: this.kind === 'autoplay' ? this.sceneCuts(i, score, inOffset) : this.journeyCuts(pl, score, inOffset),
      startSec,
      start: Math.round(startSec * SAMPLE_RATE),
      duration: this.partSec,
      // what the synth plays: the score with its first and last beats laid on the shared tempo
      audio: { meta: score.meta, events, totalSamples: Math.round(audioSec * SAMPLE_RATE) },
      // the sounds between the tracks, played over the mix rather than in it
      between,
      audioStart: Math.round((startSec - inSec) * SAMPLE_RATE),
      outStart: Math.round((startSec + this.partSec - outSec) * SAMPLE_RATE),
      inOffset,
      /** Score time at t seconds into the part's slot, on the same clock the music plays. */
      scoreTimeAt: (t) => (!out || t < this.partSec - outSec
        ? inOffset + t
        : (inBeats + midBeats + out.beatsAt((t - (this.partSec - outSec)) / outSec)) * spb),
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
   * media-player years (the Y2K PC stands in for them), the line connecting on the drop; a
   * cartridge going in as a handheld track starts; and in THE JOURNEY, the era's chime as
   * it opens, on the incoming track's key.
   */
  between(pl, inSec, audioSec, meta) {
    const events = [];
    const at = (sec) => Math.round(sec * SAMPLE_RATE);
    if (pl.era === 'y2k' && pl.eraChanged && inSec > 0) events.push({ t: 0, instr: 'modem', note: 0, vel: 0.8, dur: at(inSec) });
    if (pl.era === 'handheld') events.push({ t: 0, instr: 'cartridge', note: 0, vel: 0.8, dur: at(0.4) });
    if (this.kind === 'journey' && pl.eraChanged && ERAS[pl.era].display !== 'svga') {
      events.push({ t: at(inSec), instr: 'chime', kit: CHIME_OF[ERAS[pl.era].display] || 'bell', note: 60 + meta.root, vel: 0.55, dur: at(2.5) });
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
 * THE JOURNEY: every era once a pass, the length split evenly between them. A render is one pass;
 * live it goes on, each pass three new scenes an era and the next of its music.
 */
export function composeJourney(seed, duration, passes = 1, board = 'auto') {
  return new Programme({ seed, kind: 'journey', partSec: Math.max(12, duration / ERA_NAMES.length), passes, board });
}
/** Passes a live journey plays before it comes round to the first again. */
export const JOURNEY_PASSES = 500;

/** AUTOPLAY: an endless mix, or `duration` seconds of it for a render; born in a year, round its era. */
export function composeAutoplay(seed, duration, bornIn = null, board = 'auto') {
  const count = duration ? Math.max(1, Math.ceil(duration / AUTOPLAY_PART)) : undefined;
  return new Programme({ seed, kind: 'autoplay', partSec: AUTOPLAY_PART, count, bornIn, board });
}

/**
 * The part playing at time t (seconds), t inside its slot, the scene showing
 * then, and the time in its score - the clock its music and features run on.
 */
export function partAt(programme, t) {
  const part = programme.part(programme.indexAt(t));
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
