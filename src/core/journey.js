// Programmes: demos played one after another.
//
//   THE JOURNEY  one part per era, oldest first.
//   AUTOPLAY     an endless mix: a few tracks in one era, then another era.
//                Every 40 seconds a new track, and inside each track the
//                scene changes where the music turns - on the drop, on the
//                crash that opens a phrase - two or three scenes a track,
//                in a fresh order every block. It can run for hours and
//                never repeats a pairing in a row.
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
import { ERAS, ERA_NAMES } from './eras.js';
import { chipFor, ERA_CHIPS } from './chips.js';
import { Rng, stablePick } from './rng.js';

/** How each era is announced: a nod to how it used to start. */
export const ERA_CARDS = {
  arcade: ['INSERT COIN', 'CREDIT 01   1UP 000000   HI 999990'],
  c64: ['LOAD "JOURNEY",8,1', 'SEARCHING... LOADING... READY.'],
  amiga: ['INSERT DISK 2', 'PAL  50 HZ  512K CHIP'],
  dos: ['C:\\SEEDSCENE> JOURNEY.EXE', 'VGA 320X200  256 COLOURS  SOUND OK'],
  console: ['PRESS START', '32-BIT  CD-ROM  ANALOG CONTROL'],
  handheld: ['POWER ON', '160X144  4 SHADES  BATTERY OK'],
  y2k: ['PRECALCULATING...', '64K INTRO  ALL CODE, NO DATA'],
  modern: ['COMPILING SHADERS... DONE', 'RAYMARCHING  NEON  NOW'],
};

const BLOCK = 3;               // autoplay: tracks per era before moving on
const SCENES_PER_TRACK = 3;    // autoplay: at most this many scenes in one track
const MIN_SCENE = 9;           // autoplay: seconds a scene plays at least
export const AUTOPLAY_PART = 40;

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
   * @param {{seed:string, kind:'journey'|'autoplay', partSec:number, count?:number}} o
   */
  constructor({ seed, kind, partSec, count }) {
    this.seed = seed;
    this.kind = kind;
    this.partSec = partSec;
    this.count = kind === 'journey' ? ERA_NAMES.length : (count || 100000);
    this.cache = new Map();
    this.transitions = new Map();
    const total = this.partSec * this.count;
    this.totalSamples = Math.round(total * SAMPLE_RATE);
    this.meta = { duration: total, title: kind === 'journey' ? 'THE JOURNEY' : 'AUTOPLAY' };
  }

  /** Era, scene and music of part i, without composing it. */
  plan(i) {
    if (this.kind === 'journey') {
      const era = ERA_NAMES[i];
      const r = new Rng(`${this.seed}/${era}`, 'journey');
      const e = ERAS[era];
      // the scene this part favours most, so a scene added to the era moves few seeds' journeys
      const style = stablePick(String(r.next()), 'journey-scene', e.scenes);
      return { era, style, music: r.pick(e.music), seed: `${this.seed}/${era}`, eraChanged: true };
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

  /** Autoplay: the era of a block - every era once a cycle, in a new order each cycle. */
  blockEra(block) {
    const cycle = Math.floor(block / ERA_NAMES.length);
    return new Rng(this.seed, `autoplay-cycle-${cycle}`).shuffle(ERA_NAMES)[block % ERA_NAMES.length];
  }

  /**
   * Autoplay: the order a block plays its era's scenes in. It does not open on
   * a scene the last block may have closed on (eras share scenes): any of the
   * places its last track could have reached, or the one it may have swapped.
   */
  blockScenes(block) {
    const draw = (n) => new Rng(this.seed, `autoplay-scenes-${n}`).shuffle(ERAS[this.blockEra(n)].scenes);
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
   * Autoplay: the order a block plays its era's music in. Eras share styles,
   * so a block that would open on the style the last block (as drawn) closed
   * on starts with its next one instead.
   */
  blockMusic(block) {
    const draw = (n) => new Rng(this.seed, `autoplay-music-${n}`).shuffle(ERAS[this.blockEra(n)].music);
    const order = draw(block);
    if (block > 0 && order.length > 1) {
      const prev = draw(block - 1);
      if (order[0] === prev[(BLOCK - 1) % prev.length]) order.push(order.shift());
    }
    return order;
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
    const cuts = [];
    score.arrangement.forEach((x, bar) => { if (x.drop && fits(at(bar), cuts)) cuts.push(at(bar)); });
    score.arrangement.forEach((x, bar) => {
      if (x.crash && cuts.length < SCENES_PER_TRACK - 1 && fits(at(bar), cuts)) cuts.push(at(bar));
    });
    if (!cuts.length) cuts.push(at(Math.round((inOffset + len / 2) / barSec)));
    cuts.sort((x, y) => x - y);
    const order = this.blockScenes(Math.floor(i / BLOCK));
    const first = (i % BLOCK) * SCENES_PER_TRACK;
    return [0, ...cuts].map((from, j) => ({ from, style: order[(first + j) % order.length] }));
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
    const score = composeScore(pl.seed, (inBeats + midBeats + outBeats) * spb, pl.music, chipFor(pl.era, pl.seed));
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
    let features = null;
    const p = {
      index: i, ...pl,
      // the scenes this part plays, and from when (seconds into the part)
      scenes: this.kind === 'autoplay' ? this.sceneCuts(i, score, inOffset) : [{ from: 0, style: pl.style }],
      startSec,
      start: Math.round(startSec * SAMPLE_RATE),
      duration: this.partSec,
      // what the synth plays: the score with its first and last beats laid on the shared tempo
      audio: { meta: score.meta, events, totalSamples: Math.round(audioSec * SAMPLE_RATE) },
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
        ? { kind: 'era', lines: ERA_CARDS[pl.era].map((l) => l.replace('JOURNEY', this.kind.toUpperCase())) }
        : { kind: 'track' },
    };
    if (this.cache.has(i)) return this.cache.get(i);   // finished another way meanwhile
    this.cache.set(i, p);
    if (this.cache.size > 4) this.cache.delete(this.cache.keys().next().value);
    return p;
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

/** THE JOURNEY: every era once; the length is split evenly between them. */
export function composeJourney(seed, duration) {
  return new Programme({ seed, kind: 'journey', partSec: Math.max(12, duration / ERA_NAMES.length) });
}

/** AUTOPLAY: an endless mix, or `duration` seconds of it for a render. */
export function composeAutoplay(seed, duration) {
  const count = duration ? Math.max(1, Math.ceil(duration / AUTOPLAY_PART)) : undefined;
  return new Programme({ seed, kind: 'autoplay', partSec: AUTOPLAY_PART, count });
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
    this.limGain = 1;
  }

  /** Part k's deck: composed, its synth made and set at sample `at` of the programme. */
  deck(k, at) {
    let d = this.decks.get(k);
    if (!d) {
      const p = this.programme.part(k);
      const synth = new Synth(p.audio, p.seed);
      if (at > p.audioStart) synth.seek(at - p.audioStart);    // joining a track under way
      d = { p, synth, hp: [new Filter(), new Filter()], lp: [new Filter(), new Filter()] };
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
