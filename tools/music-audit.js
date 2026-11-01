// The music audit: each style analysed as music, from its score, before anyone listens.
//
//   npm run audit:music                      every style
//   npm run audit:music -- keygen animeop    some styles
//   node tools/music-audit.js skatepunk --seeds a,b,c --duration 90 --no-mix --out report.md --json
//
// It reads the notes the composer writes - which instrument plays what, when, over which chord -
// and checks what a musician would check first: the harmony (does every chord stand on the bass's
// root? do the bass and the chords rub a semitone? does the melody land on chord tones?), the
// melody (its register, its leaps, whether it repeats), the rhythm (notes and echoes on the grid),
// the mix (is the melody heard over the chords?), the form and the levels - and the sound itself: a
// melody instrument that imitates a real one (a flute, a trombone) is held against that instrument's
// measured spectrum (tools/timbre-refs.js), on every chip its style plays on. Each check has a
// threshold - pass, warn, fail - and a style may be let off one where the clash is the point
// (a horror drone's half-step). It changes nothing: it reports, so a style can be put right one at
// a time, and audited again.

import { writeFileSync } from 'node:fs';
import { composeScore, Synth, MUSIC_PRESETS, MUSIC_NAMES, SAMPLE_RATE, SENDS } from '../src/core/music.js';
import { ERAS, ERA_NAMES } from '../src/core/eras.js';
import { ERA_CHIPS } from '../src/core/chips.js';
import { TIMBRE_REFS } from './timbre-refs.js';
import { SCENE_BOARD, chipOfBoard } from '../src/core/boards.js';

const SR = SAMPLE_RATE;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const pc = (m) => ((m % 12) + 12) % 12;
const pct = (a, b) => (b ? (100 * a) / b : 0);

// ---- what each instrument is ------------------------------------------------------
const UNPITCHED = new Set(['kick', 'snare', 'clap', 'hat', 'crash', 'riser', 'boom', 'anvil', 'zap', 'blip', 'timpani',
  'xmkick', 'xmsnare', 'xmhat', 'thkick', 'thsnare', 'thride', 'thshaker', 'vinyl', 'scratch', 'modem', 'cartridge', 'chime']);
const BASS = new Set(['bass', 'chipbass', 'acid', 'reese', 'xmbass', 'thbass', 'slap', 'drone']);
// the lead roles and the instrument each plays the melody on
const LEAD_INSTR = {
  lead: ['lead'], chip: ['chip'], supersaw: ['supersaw'], brass: ['brass'], fmbell: ['fmbell'], hero: ['lead'],
  gbchip: ['chip'], pianolead: ['piano'], squelch: ['xmlead'], noir: ['theremin'], anisong: ['lead'], shout: ['lead'],
};

// where a clash is what the style is about, or its bass is meant to walk away from the chord
const EXEMPT = {
  derelict: { clash: 'the half-step above the root is the dread it is built on', walk: 'a drone holds the tonic under the moving chords (a pedal)' },
  cyborg: { clash: 'an odd-metre machine score: tension is the point' },
  modjazz: { walk: 'a walking bass leaves the chord on purpose, and approaches the next root by a half-step', rubs: true },
  rocknroll: { walk: 'a boogie bass walks the sixth and seventh' },
  arcade: { walk: 'the marching bass steps down through the scale' },
  acid: { walk: 'a 303 line weaves round the root' },
  gabber: { nobass: true },
  trance: { echo: 'the dotted-eighth delay is the genre\'s own: it fills the sixteenths between the lead\'s eighths' },
};

// ---- thresholds: [pass, warn] - past warn it fails --------------------------------------
const LIMITS = {
  bassInChord: { pass: 85, warn: 60, hi: true },      // % of chord onsets with the bass's note in the chord
  bassRub: { pass: 3, warn: 10 },                     // % of bass notes a minor second from a chord tone sounding
  melBeat: { pass: 80, warn: 60, hi: true },          // % of melody notes on the beat that are chord tones
  melHeld: { pass: 85, warn: 65, hi: true },          // % of held melody notes that are chord tones
  melRub: { pass: 5, warn: 15 },                      // % of held melody notes a minor second from the harmony
  top: { pass: 84, warn: 91 },                        // the melody's highest note (84 = C6, 91 = G6)
  range: { pass: 24, warn: 31 },                      // the melody's span, in semitones
  leapBig: { pass: 3, warn: 8 },                      // % of melodic moves wider than a major sixth
  leap: { pass: 20, warn: 35 },                       // % of melodic moves wider than a major third
  repeat: { pass: 30, warn: 10, hi: true },           // % of two-bar melodic phrases heard again
  offGrid: { pass: 1, warn: 5 },                      // % of onsets off the sixteenth grid (styles without swing)
  melMix: { pass: -3, warn: -8, hi: true },           // the melody's level against the chords', dB
  peak: { pass: -1, warn: -0.3 },                     // dBFS
  speed: { pass: 3, warn: 2, hi: true },              // times real time, on the slowest chip of its eras
  // (these two only ever warn: the owner approved styles past them - synth-pop's dotted echo rubs more than MIDI
  // quest's did, star pilot's fanfare repeats its notes, skate punk chants on one - so they are things to listen for)
  stuck: { pass: 2, warn: 6, warnOnly: true },        // % of melody notes struck a third time running on one pitch
  echoRub: { pass: 40, warn: 50, warnOnly: true },    // % of the melody's echoes landing a step from the note then sounding
  timbre: { pass: 9, warn: 13 },                      // dB the melody instrument strays from the real one, on average, at its worst
};
const grade = (key, v) => {
  const L = LIMITS[key];
  if (v === null || v === undefined || Number.isNaN(v)) return '·';
  const g = L.hi ? (v >= L.pass ? '✓' : v >= L.warn ? '⚠' : '✗') : v <= L.pass ? '✓' : v <= L.warn ? '⚠' : '✗';
  return L.warnOnly && g === '✗' ? '⚠' : g;
};

// ---- the score, split into its layers -------------------------------------------------
function layers(score, style) {
  const P = MUSIC_PRESETS[style];
  const leadInstr = P.lead === 'hook' ? [P.hook.instr] : (LEAD_INSTR[P.lead] || []);
  const pitched = score.events.filter((e) => !UNPITCHED.has(e.instr) && (e.note > 0 || e.chord));
  // notes struck together on one instrument are a chord, whatever the instrument
  const together = new Map();
  // (an instrument's variants - a guitar's lead and its muted riff - are separate players; and so is a note
  // struck with a chord but held its own length: a horn line on the beat a horn section stabs)
  const key = (e) => e.instr + '|' + (e.kit || '') + '|' + e.t + '|' + e.dur;
  for (const e of pitched) together.set(key(e), (together.get(key(e)) || 0) + 1);
  const isBass = (e) => BASS.has(e.instr) || (e.instr === 'organ' && e.note < 50) || (e.instr === 'strings' && e.note < 48);
  const bass = [], melody = [], chords = [];
  for (const e of pitched) {
    if (isBass(e)) bass.push(e);
    else if (leadInstr.includes(e.instr) && together.get(key(e)) === 1 && e.kit !== 'echo' && !e.chord) melody.push(e);
    else chords.push(e);
  }
  return { bass, melody, chords, leadInstr };
}

/** The pitch classes sounding in a layer at sample t (an arpeggio's chord counts whole). */
function sounding(list, t, tol) {
  const out = new Set();
  for (const e of list) {
    if (e.t > t + tol) break;
    if (e.t + e.dur > t - tol) { if (e.chord) for (const n of e.chord) out.add(pc(n)); else out.add(pc(e.note)); }
  }
  return out;
}
function bassAt(bass, t, tol, maxAge) {
  let b = null;
  for (const e of bass) { if (e.t > t + tol) break; b = e; }
  return b && t - b.t < maxAge ? b : null;
}

// ---- the checks ---------------------------------------------------------------------
function analyse(style, seed, duration) {
  const P = MUSIC_PRESETS[style];
  const score = composeScore(seed, duration, style);
  const { spb, barSec } = score.meta;
  const row = (spb / 4) * SR, tol = row * 0.45;
  const L = layers(score, style);
  const r = { seed, bpm: score.meta.bpm, key: `${score.meta.rootName} ${score.meta.scaleName}` };
  const semi = (a, b) => { const d = (((a - b) % 12) + 12) % 12; return d === 1 || d === 11; };
  // the key: which pitch classes belong to it
  const SCALE_PCS = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonicMinor: [0, 2, 3, 5, 7, 8, 11], lydian: [0, 2, 4, 6, 7, 9, 11], major: [0, 2, 4, 5, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10] };
  const keyPcs = new Set((SCALE_PCS[score.meta.scaleName] || SCALE_PCS.major).map((x) => (x + score.meta.root) % 12));
  const inKey = (n) => keyPcs.has(pc(n));
  // a rub: a note that is not in the harmony, a semitone from one that is (a seventh over its root is not)
  const rubs = (n, s) => !s.has(pc(n)) && [...s].some((x) => semi(x, n));

  // H1: the bass under each chord, H2: the bass rubbing the chord
  let chordOn = 0, inChord = 0;
  const seenT = new Set();
  for (const e of L.chords) {
    if (seenT.has(e.t)) continue;
    seenT.add(e.t);
    const b = bassAt(L.bass, e.t, tol, spb * 4 * SR);
    if (!b) continue;
    const pcs = new Set(L.chords.filter((x) => x.t === e.t).flatMap((x) => (x.chord ? x.chord.map(pc) : [pc(x.note)])));
    if (pcs.size < 2) continue;                      // a single note is a line, not a chord
    chordOn++;
    if (pcs.has(pc(b.note))) inChord++;
  }
  r.bassInChord = chordOn ? pct(inChord, chordOn) : null;
  let bassN = 0, bassRub = 0;
  for (const b of L.bass) {
    const s = sounding(L.chords, b.t, tol);
    if (!s.size) continue;
    bassN++;
    if (rubs(b.note, s)) bassRub++;
  }
  r.bassRub = bassN ? pct(bassRub, bassN) : null;

  // H3/H4: the melody over the harmony
  const mel = L.melody;
  let beatN = 0, beatOk = 0, heldN = 0, heldOk = 0, heldRub = 0;
  for (const e of mel) {
    const s = sounding(L.chords, e.t, tol);
    if (!s.size) continue;                          // nothing but the bass sounding: no chord to judge it by
    const b = bassAt(L.bass, e.t, tol, spb * SR * 2);
    // the bass and the fifth over it belong to the chord even when no one plays that fifth - unless the bass walks
    // (a style let off for it) under a whole chord sounding: its passing notes imply no chord of their own
    if (b && (EXEMPT[style] || {}).walk && s.size >= 3) s.add(pc(b.note));
    else if (b) {
      // over a power chord (the root and its fifth, no third) the scale's third is implied: either third will do
      const power = [...s].every((x) => x === pc(b.note) || x === pc(b.note + 7));
      s.add(pc(b.note)); s.add(pc(b.note + 7));
      if (power) { s.add(pc(b.note + 3)); s.add(pc(b.note + 4)); }
      // and the key's own third over the bass: the chord the bass implies, when the chords are only struck now and then
      else s.add(pc(b.note + (inKey(b.note + 4) ? 4 : 3)));
    }
    if (s.size < 2) continue;
    // (on the beat within its bar: an odd metre's bar of thirteen does not run on the grid of fours)
    const onBeat = (Math.round(e.t / row) % (P.steps || 16)) % 4 === 0;
    const held = e.dur >= 2.5 * row;
    const tone = s.has(pc(e.note));
    if (onBeat) { beatN++; if (tone) beatOk++; }
    if (held) { heldN++; if (tone) heldOk++; if (rubs(e.note, s)) heldRub++; }
  }
  r.melBeat = beatN ? pct(beatOk, beatN) : null;
  r.melHeld = heldN ? pct(heldOk, heldN) : null;
  r.melRub = heldN ? pct(heldRub, heldN) : null;

  // M: the melody itself
  if (mel.length) {
    const notes = mel.map((e) => e.note);
    r.lo = Math.min(...notes); r.top = Math.max(...notes); r.range = r.top - r.lo;
    let moves = 0, leap = 0, leapBig = 0;
    for (let i = 1; i < mel.length; i++) {
      if (mel[i].t - mel[i - 1].t > barSec * SR) continue;        // a new phrase after a rest
      moves++;
      const d = Math.abs(mel[i].note - mel[i - 1].note);
      if (d > 4) leap++;
      if (d > 9) leapBig++;
    }
    r.leap = pct(leap, moves); r.leapBig = pct(leapBig, moves);
    // a line standing still: the third (and fourth...) time running on one pitch, within a phrase
    let run = 0, stuck = 0;
    for (let i = 1; i < mel.length; i++) {
      run = mel[i].note === mel[i - 1].note && mel[i].t - mel[i - 1].t <= barSec * SR ? run + 1 : 0;
      if (run >= 2) stuck++;
    }
    r.stuck = pct(stuck, mel.length);
    // two-bar phrases heard again (same notes on the same steps)
    const phrases = new Map();
    for (const e of mel) {
      const w = Math.floor(e.t / (2 * barSec * SR));
      const st = Math.round((e.t - w * 2 * barSec * SR) / row);
      phrases.set(w, (phrases.get(w) || '') + st + ':' + e.note + ',');
    }
    const counts = new Map();
    for (const sig of phrases.values()) counts.set(sig, (counts.get(sig) || 0) + 1);
    const total = phrases.size;
    let again = 0;
    for (const sig of phrases.values()) if (counts.get(sig) > 1) again++;
    r.repeat = total ? pct(again, total) : null;
    r.melPerBar = mel.length / Math.max(1, score.meta.bars);
  }

  // R: the grid, and the echo against the line's own grid
  const swung = (score.meta.swing || 0) > 0 || P.shuffle || P.mpc;
  const timed = score.events.filter((e) => e.instr !== 'crash' && e.instr !== 'riser');
  let off = 0;
  for (const e of timed) { const x = e.t / row; if (Math.abs(x - Math.round(x)) > 0.08) off++; }
  r.offGrid = swung ? null : pct(off, timed.length);
  r.swung = !!swung;
  const eighths = mel.length && mel.every((e) => Math.round(e.t / row) % 2 === 0);
  const delaySteps = (P.fx.delayBeats || 0.75) * 4;
  // the echo the melody actually gets: the style's delay times the melody instrument's send to it
  const send = Math.max(0, ...L.leadInstr.map((i) => (SENDS[i] ? SENDS[i].delay : 0)));
  r.echo = { level: +(P.fx.delay * send).toFixed(3), steps: delaySteps, offLine: eighths && Math.abs(delaySteps % 2 - 1) < 0.01 };
  // where each echo lands: a tone or a semitone from the melody note sounding then is a rub at every turn
  // of the line (a dotted echo under a line that moves by steps); judged only where the echo is heard
  if (mel.length && r.echo.level >= 0.04) {
    let n = 0, rub = 0;
    for (const e of mel) {
      const te = e.t + delaySteps * row;
      const now = mel.find((x) => x !== e && x.t <= te && x.t + x.dur > te);
      if (!now) continue;
      n++;
      const d = Math.abs(now.note - e.note) % 12;
      if (d === 1 || d === 2 || d === 10 || d === 11) rub++;
    }
    r.echoRub = n >= 10 ? pct(rub, n) : null;
  } else r.echoRub = null;

  // form: crashes and drops, the sections where a style has them
  r.sections = [...new Set(score.arrangement.map((a) => a.section).filter(Boolean))];
  r.drops = score.arrangement.filter((a) => a.drop).length;
  r.layerCounts = { bass: L.bass.length, chords: L.chords.length, melody: mel.length };
  r.score = score; r.layers = L;
  return r;
}

/** Render a set of events on a chip and return its rms and peak (dB) and the render's speed. */
function render(score, events, seed, chip, seconds) {
  const n = Math.min(score.totalSamples, Math.round(seconds * SR));
  const sc = { ...score, events: events.filter((e) => e.t < n), totalSamples: n, meta: { ...score.meta, chip } };
  const L = new Float32Array(n), R = new Float32Array(n);
  const syn = new Synth(sc, seed);
  const t0 = performance.now();
  for (let o = 0; o < n; o += 512) syn.render(L, R, o, Math.min(512, n - o));
  const ms = performance.now() - t0;
  let sq = 0, pk = 0, bad = 0;
  for (let i = 0; i < n; i++) {
    const a = L[i], b = R[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) { bad++; continue; }
    sq += a * a + b * b; pk = Math.max(pk, Math.abs(a), Math.abs(b));
  }
  return { rms: 10 * Math.log10(sq / (2 * n) + 1e-12), peak: 20 * Math.log10(pk + 1e-12), bad, speed: (n / SR) / (ms / 1000) };
}

/** Every chip a style is heard on: its eras' boards, and the boards of the scenes it plays with there. */
function chipsOf(style) {
  const set = new Set();
  for (const era of ERA_NAMES) {
    if (!ERAS[era].music.includes(style)) continue;
    for (const c of ERA_CHIPS[era] || [null]) set.add(c);
    for (const scene of ERAS[era].scenes) if (SCENE_BOARD[scene]) set.add(chipOfBoard(SCENE_BOARD[scene]));
  }
  return set.size ? [...set] : [null];
}

// ---- the sound: the melody instrument against the real one it imitates --------------------------
/** One held note on a chip, alone and dry; its magnitude at a frequency (a narrow band round it, so a vibrato's spread counts). */
function heldNote(instr, kit, note, vel, chip) {
  const n = Math.round(1.6 * SR);
  const ev = { t: 0, instr, note, vel, dur: Math.round(1.4 * SR) };
  if (kit) ev.kit = kit;
  const sc = { events: [ev], totalSamples: n, meta: { spb: 0.5, chip, fx: { reverb: 0, delay: 0, delayBeats: 0.5 } } };
  const syn = new Synth(sc, 'timbre');
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let o = 0; o < n; o += 4096) syn.render(L, R, o, Math.min(4096, n - o));
  const x = L.slice(Math.round(0.6 * SR), Math.round(1.2 * SR));
  const w = x.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (x.length - 1))));
  return (f) => {
    let sum = 0;
    for (let k = -6; k <= 6; k++) {
      const ff = f * (1 + k * 0.0015);
      let re = 0, im = 0;
      for (let i = 0; i < w.length; i++) { const ph = (2 * Math.PI * ff * i) / SR; re += w[i] * Math.cos(ph); im += w[i] * Math.sin(ph); }
      sum += re * re + im * im;
    }
    return Math.sqrt(sum);
  };
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** How far, in dB on average, an instrument strays from a real one's spectrum at each of its reference points. */
function timbreOf(instr, kit, chip) {
  const ref = TIMBRE_REFS[instr];
  const pts = ref.points.map((pt) => {
    const at = heldNote(instr, kit, pt.note, pt.vel, chip);
    const f0 = hz(pt.note);
    let got;
    if (ref.kind === 'harmonics') {
      const h1 = at(f0);
      got = [2, 3, 4, 5, 6].map((k) => 20 * Math.log10(at(k * f0) / h1 + 1e-9));
    } else {
      const hs = []; for (let k = 1; k * f0 < 3000; k++) hs.push([k * f0, at(k * f0)]);
      const top = Math.max(...hs.map((h) => h[1]));
      got = ref.freqs.map((f) => { const h = hs.reduce((b, c) => (Math.abs(c[0] - f) < Math.abs(b[0] - f) ? c : b)); return 20 * Math.log10(h[1] / top + 1e-9); });
    }
    return { label: pt.label, got, want: pt.db };
  });
  // (a difference past 30 dB counts as 30: one missing harmonic must not outweigh the rest; a point the source
  // does not show is not judged)
  const dev = (got, want) => { const d = got.map((v, i) => (want[i] === null ? null : Math.min(30, Math.abs(v - want[i])))).filter((x) => x !== null); return d.reduce((a, b) => a + b, 0) / d.length; };
  const out = pts.map((x) => ({ label: x.label, dev: dev(x.got, x.want), got: x.got.map((v) => Math.round(v)), want: x.want.map((v) => (v === null ? '-' : v)) }));
  // and how it changes with loudness, against how the real one changes
  if (ref.dynamics) {
    const [a, b] = ref.dynamics.map((l) => pts.find((x) => x.label === l));
    const got = b.got.map((v, i) => v - a.got[i]), want = b.want.map((v, i) => (v === null || a.want[i] === null ? null : v - a.want[i]));
    out.push({ label: a.label + ' to ' + b.label, dev: dev(got, want), got: got.map((v) => Math.round(v)), want: want.map((v) => (v === null ? '-' : v)) });
  }
  return out;
}
/** The melody instrument's worst reference point, over every chip its style plays on (null: nothing to hold it against). */
function timbre(style, leadInstr) {
  const P = MUSIC_PRESETS[style];
  const kit = P.lead === 'hook' ? P.hook.kit : undefined;
  let worst = null;
  for (const instr of leadInstr) {
    if (!TIMBRE_REFS[instr]) continue;
    for (const chip of chipsOf(style)) {
      for (const pt of timbreOf(instr, kit, chip)) {
        if (!worst || pt.dev > worst.dev) worst = { ...pt, instr, kit, chip: chip || 'synth', ref: TIMBRE_REFS[instr] };
      }
    }
  }
  return worst;
}

function mix(style, a, seconds) {
  const { score, layers: L, seed } = a;
  const chips = chipsOf(style);
  const out = { chips: {} };
  for (const chip of chips) {
    const sc = composeScore(seed, Math.min(seconds, score.meta.duration), style, chip);
    const all = render(sc, sc.events, seed, chip, seconds);
    out.chips[chip || 'synth'] = all;
  }
  const home = chips[0];
  const sc = composeScore(seed, Math.min(seconds, score.meta.duration), style, home);
  const Lh = layers(sc, style);
  const mel = Lh.melody.length ? render(sc, Lh.melody, seed, home, seconds).rms : null;
  const ch = Lh.chords.length ? render(sc, Lh.chords, seed, home, seconds).rms : null;
  out.melMix = mel !== null && ch !== null ? mel - ch : null;
  out.home = home || 'synth';
  out.peak = Math.max(...Object.values(out.chips).map((c) => c.peak));
  out.bad = Object.values(out.chips).reduce((x, c) => x + c.bad, 0);
  out.speed = Math.min(...Object.values(out.chips).map((c) => c.speed));
  return out;
}

// ---- one style: run every seed, average, grade, and say what stands out ---------------------
function audit(style, seeds, duration, withMix) {
  const runs = seeds.map((s) => analyse(style, s, duration));
  const avg = (k) => { const v = runs.map((r) => r[k]).filter((x) => x !== null && x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const max = (k) => { const v = runs.map((r) => r[k]).filter((x) => x !== null && x !== undefined); return v.length ? Math.max(...v) : null; };
  const m = {
    bassInChord: avg('bassInChord'), bassRub: avg('bassRub'), melBeat: avg('melBeat'), melHeld: avg('melHeld'), melRub: avg('melRub'),
    top: max('top'), range: max('range'), leap: avg('leap'), leapBig: avg('leapBig'), repeat: avg('repeat'), offGrid: avg('offGrid'),
    stuck: avg('stuck'), echoRub: avg('echoRub'),
  };
  const tb = timbre(style, runs[0].layers.leadInstr);
  m.timbre = tb ? tb.dev : null;
  const mx = withMix ? mix(style, runs[0], 16) : null;
  if (mx) { m.melMix = mx.melMix; m.peak = mx.peak; m.speed = mx.speed; }
  const ex = EXEMPT[style] || {};
  const g = {};
  for (const k of Object.keys(m)) g[k] = grade(k, m[k]);
  if (ex.clash) { for (const k of ['bassRub', 'melRub']) if (g[k] !== '✓' && g[k] !== '·') g[k] = '~'; }
  if (ex.walk && g.bassInChord !== '✓' && g.bassInChord !== '·') g.bassInChord = '~';
  if (ex.rubs && g.bassRub !== '✓' && g.bassRub !== '·') g.bassRub = '~';
  // the findings, in words, worst first
  const say = [];
  const f = (k, text) => { if (g[k] === '✗' || g[k] === '⚠') say.push(`${g[k]} ${text}`); };
  f('bassInChord', `the bass's note is in the chord at ${m.bassInChord?.toFixed(0)}% of chord changes - a chord instrument may stand on the wrong root`);
  f('bassRub', `${m.bassRub?.toFixed(0)}% of bass notes rub a minor second against a chord tone sounding`);
  f('melBeat', `only ${m.melBeat?.toFixed(0)}% of melody notes on the beat are chord tones`);
  f('melHeld', `only ${m.melHeld?.toFixed(0)}% of held melody notes are chord tones`);
  f('melRub', `${m.melRub?.toFixed(0)}% of held melody notes rub a semitone against the harmony`);
  f('top', `the melody reaches ${m.top !== null ? noteName(m.top) : '-'} - shrill on a sustained lead`);
  f('range', `the melody spans ${m.range} semitones - more than a singer's line`);
  f('leapBig', `${m.leapBig?.toFixed(0)}% of melodic moves leap wider than a sixth`);
  f('leap', `${m.leap?.toFixed(0)}% of melodic moves leap wider than a third`);
  f('repeat', `only ${m.repeat?.toFixed(0)}% of its two-bar phrases come back - little to remember`);
  f('offGrid', `${m.offGrid?.toFixed(1)}% of onsets fall off the sixteenth grid`);
  f('melMix', `the melody sits ${m.melMix?.toFixed(1)} dB against the chords - buried`);
  f('peak', `peaks at ${m.peak?.toFixed(1)} dBFS`);
  f('speed', `renders at ${m.speed?.toFixed(1)}x real time on its slowest chip - too slow for two tracks at once`);
  f('stuck', `${m.stuck?.toFixed(1)}% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it`);
  f('echoRub', `${m.echoRub?.toFixed(0)}% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo`);
  if (tb) f('timbre', `the ${tb.instr}${tb.kit ? ':' + tb.kit : ''} strays ${tb.dev.toFixed(0)} dB on average from ${tb.ref.name} (${tb.label}, on ${tb.chip}): ${tb.got.join(' ')} where the real one has ${tb.want.join(' ')} - ${tb.ref.source}`);
  const echo = runs[0].echo;
  if (echo.offLine && echo.level >= 0.04 && ex.echo) say.push(`~ the echo (${echo.steps} sixteenths, level ${echo.level}) between the melody's eighths let off: ${ex.echo}`);
  else if (echo.offLine && echo.level >= 0.1) say.push(`✗ the echo (${echo.steps} sixteenths, level ${echo.level}) falls between the eighths the melody sits on`);
  else if (echo.offLine && echo.level >= 0.04) say.push(`⚠ a quiet echo (${echo.steps} sixteenths, level ${echo.level}) falls between the melody's eighths`);
  if (ex.clash) say.push(`~ clashes let off: ${ex.clash}`);
  if (ex.walk) say.push(`~ the bass let off the chord: ${ex.walk}`);
  if (!runs[0].layers.melody.length) say.push('· no melody found to analyse');
  if (mx && mx.bad) say.push(`✗ ${mx.bad} invalid samples`);
  say.sort((a, b) => '✗⚠~·'.indexOf(a[0]) - '✗⚠~·'.indexOf(b[0]));
  const r0 = runs[0];
  return { style, label: MUSIC_PRESETS[style].label, seeds, m, g, mix: mx, say, swung: r0.swung, sections: r0.sections, timbre: tb,
    tempos: runs.map((r) => r.bpm), keys: runs.map((r) => r.key), layers: r0.layerCounts };
}

// ---- the report ---------------------------------------------------------------------
const fmt = (v, d = 0, unit = '') => (v === null || v === undefined || Number.isNaN(v) ? '-' : v.toFixed(d) + unit);
function markdown(results, opts) {
  const lines = [];
  lines.push('# Music audit', '');
  lines.push(`Seeds ${opts.seeds.join(', ')}; ${opts.duration} s each; ${new Date().toISOString().slice(0, 10)}. ` +
    '✓ pass, ⚠ warn, ✗ fail, ~ let off by the style, · not measured. Run `npm run audit:music -- <style>` for one style.', '');
  lines.push('| style | bass in chord | bass rubs | melody on beat | held | held rubs | top | range | leaps >3rd | >6th | repeats | stuck | off grid | echo rubs | melody vs chords | sound vs real | peak | speed |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const { m, g } = r;
    lines.push(`| \`${r.style}\` | ${g.bassInChord} ${fmt(m.bassInChord, 0, '%')} | ${g.bassRub} ${fmt(m.bassRub, 0, '%')} | ${g.melBeat} ${fmt(m.melBeat, 0, '%')} | ${g.melHeld} ${fmt(m.melHeld, 0, '%')} | ${g.melRub} ${fmt(m.melRub, 0, '%')} | ${g.top} ${m.top !== null && m.top !== undefined ? noteName(m.top) : '-'} | ${g.range} ${fmt(m.range)} | ${g.leap} ${fmt(m.leap, 0, '%')} | ${g.leapBig} ${fmt(m.leapBig, 0, '%')} | ${g.repeat} ${fmt(m.repeat, 0, '%')} | ${g.stuck} ${fmt(m.stuck, 1, '%')} | ${r.swung ? '· swung' : g.offGrid + ' ' + fmt(m.offGrid, 1, '%')} | ${g.echoRub} ${fmt(m.echoRub, 0, '%')} | ${g.melMix || '·'} ${fmt(m.melMix, 1, ' dB')} | ${g.timbre} ${r.timbre ? fmt(m.timbre, 0, ' dB') + ' ' + r.timbre.instr : '-'} | ${g.peak || '·'} ${fmt(m.peak, 1)} | ${g.speed || '·'} ${fmt(m.speed, 1, 'x')} |`);
  }
  lines.push('');
  for (const r of results) {
    lines.push(`## ${r.label} (\`${r.style}\`)`, '');
    lines.push(`${r.tempos.join(', ')} bpm; ${r.keys.join(', ')}. Layers: ${r.layers.bass} bass, ${r.layers.chords} chord, ${r.layers.melody} melody notes${r.sections.length ? '; sections ' + r.sections.join(', ') : ''}.`, '');
    if (r.say.length) for (const s of r.say) lines.push(`- ${s}`);
    else lines.push('- nothing stands out');
    lines.push('');
  }
  return lines.join('\n');
}

// ---- the command line -------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : dflt; };
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const valued = new Set(['--seeds', '--duration', '--out']);
const styles = argv.filter((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1]));
for (const s of styles) if (!MUSIC_NAMES.includes(s)) { console.error(`Unknown style "${s}". Styles: ${MUSIC_NAMES.join(', ')}`); process.exit(1); }
const opts = {
  seeds: String(opt('seeds', 'aurora,hikari,seedscene')).split(',').filter(Boolean),
  duration: Number(opt('duration', 90)),
};
const results = [];
for (const style of styles.length ? styles : MUSIC_NAMES) {
  const r = audit(style, opts.seeds, opts.duration, !flags.has('--no-mix'));
  results.push(r);
  const worst = r.say.filter((s) => s[0] === '✗').length, warn = r.say.filter((s) => s[0] === '⚠').length;
  console.log(`${r.style.padEnd(11)} ${worst ? '✗ ' + worst : '  '} ${warn ? '⚠ ' + warn : '  '}  ${r.say.filter((s) => '✗⚠'.includes(s[0])).slice(0, 2).join(' | ').slice(0, 150)}`);
}
const md = markdown(results, opts);
const out = opt('out', null);
if (out) { writeFileSync(out, md); console.log(`\nreport: ${out}`); }
if (flags.has('--json')) console.log(JSON.stringify(results.map(({ style, m, g, say, mix: mx }) => ({ style, m, g, say, mix: mx && { ...mx, chips: mx.chips } })), null, 1));
if (!out && !flags.has('--json')) console.log('\n' + md);
