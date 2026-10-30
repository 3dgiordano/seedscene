// Sound chips: the same score, voiced the way a machine of its era voiced it.
//
// A score says what to play - a bass note, a snare, a chord on the pad - and a
// chip decides how it sounds. Without one, the synthesizer's own instruments
// play (the C64, the arcade, the handheld and the later eras use those, as they
// always have). The others:
//
//   paula   the Amiga: every instrument is sampled once, as a tracker musician
//           would, cut down to 8 bits at about 16.7 kHz, and played back by
//           stepping through it faster or slower with no interpolation - the
//           grain and the aliasing of a MOD. Sustained sounds loop. Drums and
//           the lead sit hard left, bass and chords hard right, through the
//           A500's output filter. Almost dry: trackers had no reverb.
//   opl3    the Sound Blaster 16 (and the AdLib before it): two-operator FM,
//           the chip's seven waveforms, operator feedback, FM drums. Dry, like
//           a DOS game.
//   awe32   the Sound Blaster AWE32: wavetable instruments - a piano, string
//           and brass sections, a choir, plucked bass and guitar, an acoustic
//           kit - with the card's chorus and reverb on.
//
// Plus the instruments the newer styles brought (guitar, flute, harp, electric
// piano, slap bass), which every chip plays.

import { Rng } from './rng.js';

const SR = 44100;
const TAU = Math.PI * 2;
// whole notes from a table - the same numbers, without a power per voice per sample
const FREQ = Float64Array.from({ length: 128 }, (_, m) => 440 * Math.pow(2, (m - 69) / 12));
const midiToFreq = (m) => (m >= 0 && m < 128 && (m | 0) === m ? FREQ[m] : 440 * Math.pow(2, (m - 69) / 12));

function envAt(age, dur, a, d, s, r) {
  if (age < 0) return 0;
  let amp = age < a ? age / a : s + (1 - s) * Math.exp(-(age - a) / d);
  if (age > dur) amp *= Math.exp(-(age - dur) / r);
  return amp;
}

/** One-pole low-pass, for when a gentle slope is all that is needed. */
const POLE = new Map();
function onePole(v, key, x, hz) {
  // the coefficient of a cutoff, worked out once (a sweeping cutoff soon stops filling the cache)
  let a = POLE.get(hz);
  if (a === undefined) { a = 1 - Math.exp(-TAU * hz / SR); if (POLE.size < 4096) POLE.set(hz, a); }
  const y = (v[key] || 0) + a * (x - (v[key] || 0));
  v[key] = y;
  return y;
}

/**
 * A plucked string (Karplus-Strong): a burst of noise in a loop one period
 * long, smoothed a little on every pass. Reads at a fractional delay, so it
 * stays in tune high up.
 */
function pluck(v, f, damp, bright) {
  if (!v.ks) {
    const L = SR / f - 0.5;
    const n = Math.ceil(L) + 2;
    v.ks = new Float32Array(n);
    let lp = 0;
    for (let i = 0; i < n; i++) { lp += (v.noise() - lp) * bright; v.ks[i] = lp * 1.6; }
    v.ksL = L; v.ksW = 0; v.ksPrev = 0;
  }
  const buf = v.ks, n = buf.length;
  let r = v.ksW - v.ksL;
  while (r < 0) r += n;
  const i0 = Math.floor(r), fr = r - i0;
  const y = buf[i0 % n] * (1 - fr) + buf[(i0 + 1) % n] * fr;
  const out = damp * 0.5 * (y + v.ksPrev);
  v.ksPrev = y;
  buf[v.ksW] = out;
  v.ksW = (v.ksW + 1) % n;
  return out;
}

const saw = (p) => 2 * (p - Math.floor(p)) - 1;
function osc(v, i, f) { let p = v.ph[i] + f / SR; p -= Math.floor(p); v.ph[i] = p; return p; }

// ---------------------------------------------------------------------------
// The instruments the newer styles brought, for every chip
// ---------------------------------------------------------------------------

export const NEW_INSTR = {
  guitar: {
    // an overdriven electric: a plucked string through a hard clip and a speaker cabinet;
    // 'mute' is the palm-muted chug, 'lead' the singing solo with vibrato
    tail: 0.3,
    render(v, out) {
      const t = v.age / SR;
      const kit = v.ev.kit;
      const vib = kit === 'lead' ? 1 + 0.008 * Math.sin(TAU * 5.6 * t) * Math.min(1, t * 2.5) : 1;
      const f = midiToFreq(v.ev.note) * vib;
      const damp = kit === 'mute' ? 0.93 : 0.9985;
      const s = pluck(v, f, damp, kit === 'mute' ? 0.25 : 0.6);
      const sub = kit === 'lead' ? 0 : 0.35 * Math.sin(TAU * osc(v, 6, f * 0.5));
      const driven = Math.tanh((s * 4 + sub * 0.4) * (kit === 'lead' ? 3 : 2.4));
      const cab = onePole(v, 'cab', onePole(v, 'cab0', driven, 3600), 3600);
      const amp = envAt(t, v.ev.dur / SR, 0.002, 0.8, 0.85, kit === 'mute' ? 0.02 : 0.06);
      const sig = cab * amp * v.ev.vel * 0.42;
      out[0] = sig * 0.9; out[1] = sig;
    },
  },
  flute: {
    // a breathy flute: a near-sine with a little second harmonic, breath noise, vibrato that blooms
    tail: 0.2,
    render(v, out) {
      const t = v.age / SR;
      const vib = 1 + 0.006 * Math.sin(TAU * 5 * t) * Math.min(1, Math.max(0, t - 0.15) * 3);
      const p = osc(v, 0, midiToFreq(v.ev.note) * vib);
      const tone = Math.sin(TAU * p) + 0.18 * Math.sin(2 * TAU * p);
      const breath = onePole(v, 'br', v.noise(), 2500) * (0.25 + 0.6 * Math.exp(-t * 12));
      const amp = envAt(t, v.ev.dur / SR, 0.06, 0.4, 0.85, 0.08);
      const sig = (tone * 0.8 + breath * 0.5) * amp * v.ev.vel * 0.38;
      out[0] = sig; out[1] = sig * 0.95;
    },
  },
  harp: {
    // a harp string: a soft pluck that rings
    tail: 1.4,
    render(v, out) {
      const s = pluck(v, midiToFreq(v.ev.note), 0.9992, 0.35);
      const sig = s * v.ev.vel * 0.55;
      const pan = 0.25 + 0.5 * ((v.ev.note % 12) / 12);
      out[0] = sig * (1.2 - pan); out[1] = sig * (0.2 + pan);
    },
  },
  ep: {
    // an electric piano: a tine (FM, a bright bark that fades) over a warm body, with tremolo
    tail: 0.8,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note);
      const pm = osc(v, 0, f * 14);
      const pc = osc(v, 1, f);
      const idx = 1.4 * Math.exp(-t * 9) * (0.6 + 0.6 * v.ev.vel);
      const body = Math.sin(TAU * pc + idx * Math.sin(TAU * pm));
      const amp = envAt(t, v.ev.dur / SR, 0.002, 1.1, 0.35, 0.18);
      const trem = 1 + 0.18 * Math.sin(TAU * 4.5 * t);
      const sig = body * amp * v.ev.vel * 0.4;
      out[0] = sig * trem; out[1] = sig * (2 - trem);
    },
  },
  slap: {
    // a slapped bass: a plucked low string with a bright pop on the attack
    tail: 0.2,
    render(v, out) {
      const t = v.age / SR;
      const s = pluck(v, midiToFreq(v.ev.note), 0.996, 0.8);
      const pop = v.noise() * Math.exp(-t * 400) * 0.4;
      const amp = envAt(t, v.ev.dur / SR, 0.001, 0.4, 0.7, 0.04);
      const sig = Math.tanh((s * 2.2 + pop) * 1.3) * amp * v.ev.vel * 0.55;
      out[0] = out[1] = sig;
    },
  },
};

export const NEW_SENDS = {
  guitar: { delay: 0.08, reverb: 0.22 },
  flute: { delay: 0.25, reverb: 0.45 },
  harp: { delay: 0.2, reverb: 0.5 },
  ep: { delay: 0.18, reverb: 0.3 },
  slap: { delay: 0.0, reverb: 0.05 },
};

// ---------------------------------------------------------------------------
// OPL3: two-operator FM
// ---------------------------------------------------------------------------

const fr = (p) => p - Math.floor(p);
/** The chip's waveforms: sine, half-sine, abs-sine, pulse-sine, and OPL3's alternating, camel and square. */
const WAVES = [
  (p) => Math.sin(TAU * p),
  (p) => Math.max(0, Math.sin(TAU * p)),
  (p) => Math.abs(Math.sin(TAU * p)),
  (p) => (fr(p) % 0.5 < 0.25 ? Math.abs(Math.sin(TAU * p)) : 0),
  (p) => (fr(p) < 0.5 ? Math.sin(2 * TAU * p) : 0),
  (p) => (fr(p) < 0.5 ? Math.abs(Math.sin(2 * TAU * p)) : 0),
  (p) => (fr(p) < 0.5 ? 1 : -1),
];

/**
 * One two-operator voice. P: mul [mod, car], wave [mod, car], index (radians,
 * how hard the modulator drives the carrier), fb (the modulator's feedback),
 * menv and cenv [a, d, s, r] for each operator, vib, add (additive rather
 * than FM), sweep (semitones the pitch falls from, and how fast).
 */
function fm2(v, P, note, t, dur, vel) {
  let f = midiToFreq(note);
  if (P.sweep) f *= Math.pow(2, (P.sweep[0] * Math.exp(-t * P.sweep[1])) / 12);
  if (P.vib) f *= 1 + P.vib * Math.sin(TAU * 6.1 * t) * Math.min(1, t * 2);
  const pm = osc(v, 0, f * P.mul[0]);
  const pc = osc(v, 1, f * P.mul[1]);
  const me = P.menv, ce = P.cenv;
  const menv = envAt(t, dur, me[0], me[1], me[2], me[3]);
  const fbk = P.fb ? (v.ph[2] + v.ph[3]) * 0.5 * P.fb : 0;
  const m = WAVES[P.wave[0]](pm + fbk / TAU);
  v.ph[3] = v.ph[2]; v.ph[2] = m;
  const idx = P.index * menv * (P.velIndex ? 0.5 + vel : 1);
  const c = P.add ? WAVES[P.wave[1]](pc) + m * menv * P.add : WAVES[P.wave[1]](pc + (idx * m) / TAU);
  const amp = envAt(t, dur, ce[0], ce[1], ce[2], ce[3]);
  // the chip's DAC: 16 bits, but the operators work in coarse steps
  return Math.round(c * amp * 1024) / 1024;
}

const OPL = {
  bass: { mul: [1, 1], wave: [0, 1], index: 4.2, fb: 0.9, menv: [0.001, 0.12, 0.35, 0.05], cenv: [0.002, 0.3, 0.7, 0.05], velIndex: true },
  chipbass: { mul: [1, 1], wave: [2, 0], index: 2.2, fb: 0.3, menv: [0.001, 0.08, 0.5, 0.03], cenv: [0.002, 0.2, 0.8, 0.03] },
  pad: { mul: [1, 1], wave: [1, 0], index: 1.8, fb: 0.5, menv: [0.35, 1.2, 0.7, 0.8], cenv: [0.4, 1.5, 0.85, 0.9], vib: 0.004 },
  strings: { mul: [1, 1], wave: [0, 0], index: 2.8, fb: 1, menv: [0.18, 0.8, 0.8, 0.5], cenv: [0.2, 1, 0.9, 0.5], vib: 0.005 },
  choir: { mul: [2, 1], wave: [0, 0], index: 1.6, fb: 0.3, menv: [0.25, 1, 0.8, 0.6], cenv: [0.3, 1.2, 0.9, 0.6], vib: 0.006 },
  brass: { mul: [1, 1], wave: [0, 0], index: 4.6, fb: 1.3, menv: [0.04, 0.4, 0.6, 0.1], cenv: [0.015, 0.4, 0.75, 0.12], vib: 0.004 },
  lead: { mul: [1, 1], wave: [0, 1], index: 3.4, fb: 1.9, menv: [0.01, 0.6, 0.7, 0.1], cenv: [0.01, 0.5, 0.8, 0.1], vib: 0.007 },
  chip: { mul: [1, 1], wave: [6, 6], index: 0.8, fb: 0, menv: [0.002, 0.2, 0.5, 0.02], cenv: [0.002, 0.2, 0.7, 0.02], vib: 0.006 },
  arp: { mul: [3, 1], wave: [0, 0], index: 3.2, fb: 0.5, menv: [0.001, 0.06, 0, 0.03], cenv: [0.001, 0.12, 0, 0.04] },
  stab: { mul: [1, 1], wave: [1, 0], index: 4, fb: 1.2, menv: [0.001, 0.08, 0.1, 0.04], cenv: [0.002, 0.15, 0, 0.05] },
  piano: { mul: [1, 1], wave: [0, 0], index: 3, fb: 0.7, menv: [0.001, 0.35, 0.1, 0.1], cenv: [0.001, 0.9, 0.15, 0.12], velIndex: true },
  organ: { mul: [2, 1], wave: [0, 2], index: 0, add: 0.6, menv: [0.003, 1, 1, 0.04], cenv: [0.003, 1, 0.9, 0.04] },
  supersaw: { mul: [1, 1], wave: [0, 1], index: 3.8, fb: 2.2, menv: [0.005, 0.5, 0.75, 0.15], cenv: [0.005, 0.4, 0.8, 0.15] },
  hoover: { mul: [1, 1], wave: [0, 0], index: 4.6, fb: 2.2, menv: [0.01, 0.5, 0.7, 0.12], cenv: [0.01, 0.4, 0.8, 0.12], sweep: [-5, 26] },
  guitar: { mul: [1, 1], wave: [0, 6], index: 5.5, fb: 2.4, menv: [0.002, 0.6, 0.7, 0.05], cenv: [0.002, 0.8, 0.8, 0.05] },
  flute: { mul: [1, 1], wave: [0, 0], index: 0.5, fb: 0.2, menv: [0.05, 0.5, 0.6, 0.08], cenv: [0.06, 0.6, 0.85, 0.08], vib: 0.006 },
  harp: { mul: [1, 2], wave: [0, 0], index: 2, fb: 0.3, menv: [0.001, 0.25, 0, 0.3], cenv: [0.001, 1.2, 0, 0.6] },
  ep: { mul: [1, 1], wave: [0, 0], index: 2.4, fb: 0.2, menv: [0.001, 0.3, 0.1, 0.2], cenv: [0.001, 1.2, 0.3, 0.2] },
  slap: { mul: [1, 1], wave: [0, 1], index: 4, fb: 0.6, menv: [0.001, 0.05, 0.3, 0.03], cenv: [0.001, 0.3, 0.6, 0.04] },
};

const OPL_SUB = { ...OPL.bass, index: 0.8, fb: 0 };

/** FM voices for the melodic instruments: the note's own patch, its tails as the synthesizer expects. */
function oplMelodic(name, tail, gain, spread) {
  return {
    tail,
    render(v, out) {
      const t = v.age / SR;
      const P = OPL[name];
      const kit = v.ev.kit;
      // a sub-bass asks for a purer tone; a palm mute for a shorter one
      let s = fm2(v, kit === 'sub' && name === 'bass' ? OPL_SUB : P, v.ev.note, t, v.ev.dur / SR, v.ev.vel);
      if (kit === 'mute') s *= Math.exp(-t * 18);
      s -= onePole(v, 'dc', s, 25);          // the one-sided waves sit above zero
      const sig = s * v.ev.vel * gain;
      const pan = spread ? 0.5 + spread * Math.sin(v.ev.note * 1.3) : 0.5;
      out[0] = sig * (1.5 - pan) * 0.8; out[1] = sig * (0.5 + pan) * 0.8;
    },
  };
}

/** OPL drums: the rhythm mode's bass drum, snare, hi-hat and cymbal, made the way the chip made them. */
const OPL_DRUMS = {
  kick: {
    tail: 0.4,
    render(v, out) {
      const t = v.age / SR;
      const f = 50 + 140 * Math.exp(-t * 28);
      const p = osc(v, 0, f);
      const mod = Math.sin(TAU * osc(v, 1, f * 1.5)) * 1.2 * Math.exp(-t * 60);
      const s = Math.sin(TAU * p + mod) * Math.exp(-t * 9);
      out[0] = out[1] = Math.round(s * 1024) / 1024 * v.ev.vel * 0.95;
    },
  },
  snare: {
    tail: 0.25,
    render(v, out) {
      const t = v.age / SR;
      // a tone and the chip's noise bit, which is coarse: sample-and-hold every few samples
      if (v.age % 3 === 0) v.nz = v.noise() > 0 ? 1 : -1;
      const tone = Math.sin(TAU * osc(v, 0, 220)) * Math.exp(-t * 25);
      const s = (tone * 0.5 + (v.nz || 0) * 0.55 * Math.exp(-t * 16)) * v.ev.vel * 1.15;
      out[0] = s; out[1] = s * 0.95;
    },
  },
  clap: null,
  hat: {
    tail: 0.3,
    render(v, out) {
      const t = v.age / SR;
      // two high squares, their phase bits mixed with noise: metallic and grainy
      const a = fr(osc(v, 0, 3520)) < 0.5, b = fr(osc(v, 1, 5810)) < 0.5;
      const ring = (a !== b ? 1 : -1) * 0.6 + (v.noise() > 0.2 ? 0.4 : -0.4);
      const s = ring * Math.exp(-t * (v.ev.open ? 8 : 45)) * v.ev.vel * 1.0;
      out[0] = s * 0.85; out[1] = s;
    },
  },
  crash: {
    tail: 2,
    render(v, out) {
      const t = v.age / SR;
      const a = fr(osc(v, 0, 2970)) < 0.5, b = fr(osc(v, 1, 4410)) < 0.5;
      const s = ((a !== b ? 1 : -1) * 0.5 + v.noise() * 0.5) * Math.exp(-t * 2.4) * v.ev.vel * 0.45;
      out[0] = s; out[1] = s * 0.9;
    },
  },
  timpani: {
    tail: 1,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note) * (1 + 0.2 * Math.exp(-t * 18));
      const s = Math.sin(TAU * osc(v, 0, f) + 1.5 * Math.exp(-t * 10) * Math.sin(TAU * osc(v, 1, f * 1.4)));
      out[0] = out[1] = s * Math.exp(-t * 3.5) * v.ev.vel * 0.8;
    },
  },
};
OPL_DRUMS.clap = OPL_DRUMS.snare;

function oplChip() {
  const instr = {
    bass: oplMelodic('bass', 0.15, 0.62, 0),
    chipbass: oplMelodic('chipbass', 0.06, 0.5, 0),
    pad: oplMelodic('pad', 1.2, 0.22, 0.25),
    strings: oplMelodic('strings', 0.6, 0.24, 0.3),
    choir: oplMelodic('choir', 0.7, 0.5, 0.2),
    brass: oplMelodic('brass', 0.2, 0.3, 0.15),
    lead: oplMelodic('lead', 0.2, 0.8, 0.1),
    chip: oplMelodic('chip', 0.05, 0.22, 0.1),
    arp: oplMelodic('arp', 0.1, 0.42, 0.35),
    stab: oplMelodic('stab', 0.1, 0.3, 0.2),
    piano: oplMelodic('piano', 0.3, 0.48, 0.2),
    organ: oplMelodic('organ', 0.08, 0.3, 0),
    supersaw: oplMelodic('supersaw', 0.2, 0.18, 0.3),
    hoover: oplMelodic('hoover', 0.2, 0.22, 0.2),
    guitar: oplMelodic('guitar', 0.1, 0.26, 0.15),
    flute: oplMelodic('flute', 0.1, 0.32, 0.1),
    harp: oplMelodic('harp', 0.8, 0.34, 0.35),
    ep: oplMelodic('ep', 0.4, 0.32, 0.2),
    slap: oplMelodic('slap', 0.1, 0.5, 0),
    ...OPL_DRUMS,
  };
  return { name: 'opl3', instr, sendScale: { reverb: 0.3, delay: 0.45 } };
}

// ---------------------------------------------------------------------------
// AWE32: wavetable instruments, chorus and reverb
// ---------------------------------------------------------------------------

// the AWE32's constants, made once rather than on every sample
const STRING_D = [-0.009, -0.005, -0.0015, 0.002, 0.006, 0.01];   // six players, out of tune
const CHOIR_F = [[700, 6], [1220, 7], [2600, 8]];                  // vowel formants: hz, q
const CHOIR_FQ = CHOIR_F.map(([hz]) => 2 * Math.sin(Math.PI * hz / SR));
const CHOIR_Q = CHOIR_F.map(([, q]) => 1 / q);
const CHOIR_G = [1, 0.6, 0.25];
const HAT_R = [205.3, 304.4, 369.6, 522.7, 540, 800];
const CRASH_R = [333, 471, 598, 789, 911, 1183];

function aweChip() {
  const instr = {
    piano: {
      // a grand: inharmonic partials, low ones left and high ones right, a hammer, a long decay
      tail: 0.7,
      render(v, out) {
        const t = v.age / SR;
        const f = midiToFreq(v.ev.note);
        const bright = 0.6 + 0.6 * v.ev.vel;
        if (!v.pc) {
          // each partial a phasor turning at its own rate, and its own decay per sample
          v.pc = new Float64Array(7); v.ps = new Float64Array(7); v.rc = new Float64Array(7); v.rs = new Float64Array(7); v.pa = new Float64Array(7); v.pd = new Float64Array(7);
          for (let k = 1; k <= 7; k++) {
            const fk = f * k * Math.sqrt(1 + 0.0004 * k * k);
            v.pc[k - 1] = 1; v.ps[k - 1] = 0;
            v.rc[k - 1] = Math.cos(TAU * fk / SR); v.rs[k - 1] = Math.sin(TAU * fk / SR);
            v.pa[k - 1] = Math.pow(bright / k, 0.75);
            v.pd[k - 1] = Math.exp(-(0.9 + 0.55 * k) / SR);
          }
        }
        let L = 0, R = 0;
        for (let k = 0; k < 7; k++) {
          const c = v.pc[k], sn = v.ps[k];
          v.pc[k] = c * v.rc[k] - sn * v.rs[k];
          v.ps[k] = c * v.rs[k] + sn * v.rc[k];
          v.pa[k] *= v.pd[k];
          const s = v.ps[k] * v.pa[k];
          // low partials lean left, high ones right: the width of a grand
          L += s * (1.12 - k * 0.08); R += s * (0.58 + k * 0.08);
        }
        const hammer = onePole(v, 'hm', v.noise(), 3000) * Math.exp(-t * 120) * 0.6;
        const dur = v.ev.dur / SR;
        const rel = t > dur ? Math.exp(-(t - dur) * 8) : 1;
        const sig = v.ev.vel * rel * 0.3;
        out[0] = (L + hammer) * sig; out[1] = (R + hammer) * sig;
      },
    },
    strings: {
      // a string section: six players slightly out of tune, bowing in slowly, warm
      tail: 0.8,
      render(v, out) {
        const t = v.age / SR;
        const f = midiToFreq(v.ev.note) * (1 + 0.003 * Math.sin(TAU * 5.2 * t + v.ev.note));
        let L = 0, R = 0;
        for (let i = 0; i < STRING_D.length; i++) { const s = saw(osc(v, i, f * (1 + STRING_D[i]))); if (i % 2) L += s; else R += s; }
        const amp = envAt(t, v.ev.dur / SR, 0.35, 1.2, 0.85, 0.5);
        const l = onePole(v, 'l1', L, 4200), r = onePole(v, 'r1', R, 4200);
        out[0] = l * amp * v.ev.vel * 0.11; out[1] = r * amp * v.ev.vel * 0.11;
      },
    },
    choir: {
      // a choir: four voices through three vowel formants
      tail: 0.8,
      render(v, out) {
        const t = v.age / SR;
        const f = midiToFreq(v.ev.note) * (1 + 0.005 * Math.sin(TAU * 4.6 * t));
        let src = 0;
        for (let i = 0; i < 4; i++) src += saw(osc(v, i, f * (1 + (i - 1.5) * 0.004)));
        src += v.noise() * 0.1;
        if (!v.svf) v.svf = CHOIR_F.map(() => ({ low: 0, band: 0 }));
        let y = 0;
        for (let k = 0; k < 3; k++) {
          const fq = CHOIR_FQ[k], q = CHOIR_Q[k], st = v.svf[k];
          const high = src - st.low - q * st.band;
          st.band += fq * high; st.low += fq * st.band;
          y += st.band * CHOIR_G[k];
        }
        const amp = envAt(t, v.ev.dur / SR, 0.4, 1.4, 0.9, 0.6);
        const sig = y * amp * v.ev.vel * 0.11;
        out[0] = sig; out[1] = sig * 0.92;
      },
    },
    brass: {
      // a brass section: three horns, the bell opening as they blow
      tail: 0.25,
      render(v, out) {
        const t = v.age / SR;
        const f = midiToFreq(v.ev.note) * (1 + 0.003 * Math.sin(TAU * 5 * t) * Math.min(1, t * 3));
        let s = 0;
        for (let i = 0; i < 3; i++) s += saw(osc(v, i, f * (1 + (i - 1) * 0.004)));
        const open = 900 + 5200 * Math.min(1, t * 10) * (0.55 + 0.45 * Math.exp(-t * 2.5)) * (0.6 + 0.5 * v.ev.vel);
        const o = onePole(v, 'b2', onePole(v, 'b1', s, open), open);
        const amp = envAt(t, v.ev.dur / SR, 0.03, 0.35, 0.75, 0.12);
        const sig = Math.tanh(o * 0.9) * amp * v.ev.vel * 0.34;
        out[0] = sig * 0.95; out[1] = sig;
      },
    },
    bass: {
      // fingered bass: a plucked low string; a sub stays a sine
      tail: 0.2,
      render(v, out) {
        const t = v.age / SR;
        const f = midiToFreq(v.ev.note);
        let s;
        if (v.ev.kit === 'sub') s = Math.sin(TAU * osc(v, 0, f)) * 0.9;
        else s = onePole(v, 'bl', pluck(v, f, 0.997, 0.5), 1400) * 2.2;
        const amp = envAt(t, v.ev.dur / SR, 0.002, 0.6, 0.75, 0.05);
        out[0] = out[1] = Math.tanh(s * 1.2) * amp * v.ev.vel * 0.6;
      },
    },
    chipbass: null,
    lead: null,
    arp: {
      // pizzicato / harp: a short pluck
      tail: 0.5,
      render(v, out) {
        const s = pluck(v, midiToFreq(v.ev.note), 0.9975, 0.55);
        const sig = s * v.ev.vel * 0.7;
        const pan = 0.2 + 0.6 * ((v.ev.note * 7) % 12) / 12;
        out[0] = sig * (1.2 - pan); out[1] = sig * (0.2 + pan);
      },
    },
    organ: null,
    kick: {
      // an acoustic kick: a boomy head and the beater's click
      tail: 0.45,
      render(v, out) {
        const t = v.age / SR;
        const f = 52 + 70 * Math.exp(-t * 22);
        const body = Math.sin(TAU * osc(v, 0, f)) * Math.exp(-t * 7);
        const click = onePole(v, 'kc', v.noise(), 4500) * Math.exp(-t * 250) * 0.9;
        out[0] = out[1] = Math.tanh((body * 1.4 + click) * 1.1) * v.ev.vel * 0.9;
      },
    },
    snare: {
      // an acoustic snare: the drum's body and the wires rattling under it
      tail: 0.4,
      render(v, out) {
        const t = v.age / SR;
        const body = (Math.sin(TAU * osc(v, 0, 185)) + 0.5 * Math.sin(TAU * osc(v, 1, 330))) * Math.exp(-t * 20);
        const wires = (v.noise() - onePole(v, 'sw', v.noise(), 1800)) * Math.exp(-t * 11);
        const s = (body * 0.45 + wires * 0.85) * v.ev.vel * 1.15;
        out[0] = s * 0.95; out[1] = s;
      },
    },
    hat: {
      // six square partials, the classic metal cluster, through a bright filter
      tail: 0.4,
      render(v, out) {
        const t = v.age / SR;
        let m = 0;
        for (let i = 0; i < 6; i++) m += fr(osc(v, i, HAT_R[i] * 8.3)) < 0.5 ? 1 : -1;
        const x = m / 6 + v.noise() * 0.25;
        const hi = x - onePole(v, 'hh', x, 7000);
        const s = hi * Math.exp(-t * (v.ev.open ? 7 : 40)) * v.ev.vel * 4.5;
        out[0] = s * 0.85; out[1] = s;
      },
    },
    crash: {
      tail: 2.6,
      render(v, out) {
        const t = v.age / SR;
        let m = 0;
        for (let i = 0; i < 6; i++) m += fr(osc(v, i, CRASH_R[i] * 2.3)) < 0.5 ? 1 : -1;
        const hi = (m / 6 + v.noise() * 0.6) - onePole(v, 'ch', m / 6 + v.noise() * 0.6, 4000);
        const s = hi * Math.exp(-t * 1.7) * v.ev.vel * 0.7;
        out[0] = s; out[1] = s * 0.92;
      },
    },
  };
  for (const k of Object.keys(instr)) if (!instr[k]) delete instr[k];
  return {
    name: 'awe32',
    instr,
    sendScale: { reverb: 1.25, delay: 0.8 },
    makePost: makeChorus,       // one chorus per synthesizer: two songs mixing must not share one
  };
}

/** The EMU8000's chorus: the mix through a short delay that wavers, left and right out of step. */
function makeChorus() {
  const n = 2048;
  const bl = new Float32Array(n), br = new Float32Array(n);
  let w = 0, i = 0;
  return (out) => {
    bl[w] = out[0]; br[w] = out[1];
    const ph = TAU * 0.6 * i / SR;
    const dl = (0.012 + 0.003 * Math.sin(ph)) * SR, dr = (0.012 + 0.003 * Math.sin(ph + 1.9)) * SR;
    const read = (b, d) => { let r = w - d; while (r < 0) r += n; const i0 = Math.floor(r), f = r - i0; return b[i0 % n] * (1 - f) + b[(i0 + 1) % n] * f; };
    out[0] = out[0] * 0.82 + read(bl, dl) * 0.3;
    out[1] = out[1] * 0.82 + read(br, dr) * 0.3;
    w = (w + 1) % n; i++;
  };
}

// ---------------------------------------------------------------------------
// Paula: every instrument sampled once, then played as a tracker plays it
// ---------------------------------------------------------------------------

const PAULA_RATE = 16726;        // C-3 on a PAL Amiga: the rate melodic samples are taken at
const PAULA_DRUM_RATE = 27928;   // near Paula's top rate: drums and cymbals keep their bite
const PAULA_REF = 60;
const PAULA_LEFT = new Set(['kick', 'snare', 'clap', 'hat', 'crash', 'riser', 'timpani', 'anvil', 'boom',
  'lead', 'chip', 'brass', 'fmbell', 'zap', 'blip', 'flute', 'guitar']);
const SUSTAINED = new Set(['pad', 'strings', 'choir', 'organ', 'drone', 'reese', 'lead', 'brass', 'chip',
  'bass', 'chipbass', 'supersaw', 'hoover', 'flute', 'guitar', 'acid']);
const PITCHED_DRUMS = new Set(['timpani', 'anvil']);

/**
 * Paula needs the synthesizer's own instruments to sample, so it is built by
 * the synthesizer: native = { INSTR, Voice }.
 */
function paulaChip(native) {
  const bank = new Map();      // one sample per instrument (and kit), shared by every song

  /** Record an instrument once, at C-3, and cut it down to an 8-bit sample. */
  function sampleOf(ev) {
    const key = `${ev.instr}|${ev.kit || ''}|${ev.open ? 1 : 0}`;
    if (bank.has(key)) return bank.get(key);
    const spec = native.INSTR[ev.instr];
    const drum = !SUSTAINED.has(ev.instr) && !['piano', 'arp', 'stab', 'fmbell', 'harp', 'ep', 'slap', 'zap', 'blip', 'chiparp'].includes(ev.instr);
    const pitched = !drum || PITCHED_DRUMS.has(ev.instr);
    const len = SUSTAINED.has(ev.instr) ? 1.0 : Math.min(1.2, (spec.tail || 0.5) + 0.25);
    const fake = {
      t: 0, instr: ev.instr, note: pitched ? PAULA_REF : ev.note, vel: 1,
      dur: Math.round((SUSTAINED.has(ev.instr) ? 1.0 : 0.25) * SR),
      kit: ev.kit, open: ev.open, chord: [PAULA_REF, PAULA_REF + 4, PAULA_REF + 7], cut: 0.5,
    };
    const voice = new native.Voice(fake, 12345);
    const n = Math.round(len * SR);
    const raw = new Float32Array(n), tmp = [0, 0];
    let eSt = 0, eMono = 0;
    for (let i = 0; i < n; i++) {
      tmp[0] = 0; tmp[1] = 0; spec.render(voice, tmp); voice.age++;
      raw[i] = (tmp[0] + tmp[1]) * 0.5;
      eSt += (tmp[0] * tmp[0] + tmp[1] * tmp[1]) * 0.5; eMono += raw[i] * raw[i];
    }
    // folded to mono, a sound panned to one side loses level: give it back
    const fold = eMono > 0 ? Math.min(2.5, Math.sqrt(eSt / eMono)) : 1;
    for (let i = 0; i < n; i++) raw[i] *= fold;
    // down to the sample's rate point by point, as a cheap sampler did (no smoothing: the grit is the sound);
    // then to 8 bits
    const rate = pitched && !PITCHED_DRUMS.has(ev.instr) ? PAULA_RATE : PAULA_DRUM_RATE;
    const m = Math.floor(n * rate / SR);
    const data = new Int8Array(m);
    let peak = 1e-6;
    const down = new Float32Array(m);
    for (let j = 0; j < m; j++) {
      down[j] = raw[Math.min(n - 1, Math.round(j * SR / rate))];
      peak = Math.max(peak, Math.abs(down[j]));
    }
    const norm = 0.98 / peak;
    for (let j = 0; j < m; j++) data[j] = Math.max(-128, Math.min(127, Math.round(down[j] * norm * 127)));
    const loop = SUSTAINED.has(ev.instr) ? [Math.floor(m * 0.45), m] : null;
    const smp = { data, norm, loop, pitched, rate };
    bank.set(key, smp);
    return smp;
  }

  const player = {
    tail: 1.2,            // a one-shot sample plays out; a looped one fades on its note-off
    render(v, out) {
      if (!v.smp) { v.smp = sampleOf(v.ev); v.pos = 0; }
      const smp = v.smp;
      const step = (smp.pitched && v.ev.note ? Math.pow(2, (v.ev.note - PAULA_REF) / 12) : 1) * smp.rate / SR;
      let i = Math.floor(v.pos);
      if (i >= smp.data.length) {
        if (!smp.loop) { out[0] = out[1] = 0; return; }
        const [a, b] = smp.loop;
        v.pos = a + ((v.pos - a) % (b - a));
        i = Math.floor(v.pos);
      }
      v.pos += step;
      // the tracker's volume column: 64 steps; a note-off cuts it short
      const t = v.age / SR, dur = v.ev.dur / SR;
      const vol = Math.round(Math.min(1, v.ev.vel) * 64) / 64 * (t > dur && smp.loop ? Math.exp(-(t - dur) * 40) : 1);
      // (and 2 dB of make-up: a dry tracker mix sits lower than one with reverb)
      let s = (smp.data[i] / 127) / smp.norm * vol * 1.26;
      // the A500's fixed output filter: a gentle slope, so the stepping still shows
      s = onePole(v, 'led', s, 6800);
      const left = PAULA_LEFT.has(v.ev.instr);
      out[0] = s * (left ? 1 : 0.25); out[1] = s * (left ? 0.25 : 1);
    },
  };
  const instr = {};
  for (const name of Object.keys(native.INSTR)) {
    // the 50 Hz chip chords stay what they are: a C64 trick, not a sample
    if (name === 'chiparp') continue;
    instr[name] = player;
  }
  return {
    name: 'paula',
    instr,
    sendScale: { reverb: 0.12, delay: 0.55 },
    // samples are cut on the voice's first note; sustained ones need their loop, so the voice lives on its note
    prepare(events) { for (const e of events) if (instr[e.instr]) sampleOf(e); },
  };
}

/** The chips, built against the synthesizer's own instruments (for Paula to sample). */
export function buildChips(native) {
  return { paula: paulaChip(native), opl3: oplChip(), awe32: aweChip() };
}

/** Which chip an era's music plays on: none for the eras that keep the synthesizer's own voices. */
export const ERA_CHIPS = {
  amiga: ['paula'],
  dos: ['opl3', 'awe32'],
  console: ['awe32'],
};

/** The chip a song plays on in an era: chosen by the song's seed where the era had more than one. */
export function chipFor(era, seed) {
  const list = ERA_CHIPS[era];
  return list ? new Rng(String(seed), 'sound-chip').pick(list) : null;
}
