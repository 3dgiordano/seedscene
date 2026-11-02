// The reviewer's tools: what a listener would hear in a style, measured from its score and its rendered audio.
//
//   npm run review:music -- <command> <style> [--chip paula|opl3|awe32|ym|hifi] [--seeds a,b,c] [--instr name] [--which n]
//
// The music audit (tools/music-audit.js) checks a style's harmony and line against rules; these tools look for
// what it does not measure - what the owner heard by ear in the styles of 2026-11 and a reviewer can only find in
// the numbers: a part that swamps or is buried, a whistle up high, a hiss, fills that do not belong to the genre,
// a roll off the grid, a sample that loses what the score asked for, a rhythm that never changes. They were built
// by a review subagent on the round-5 styles, whose findings matched everything the owner heard, and kept here so
// every review starts from them (docs/MUSIC-REVIEW.md, "The reviewer").
//
//   layers    each part of the score (register, density, off-grid notes), the lead's overlaps and flams, its
//             rhythm from bar to bar; then each layer rendered alone: its level against the mix, its loudest
//             moment, its peak, its share of highs, how much of the time it sounds; the mix's left/right balance
//             and clipping; the lead against everything else, full band and in its own band (400 Hz - 4 kHz)
//   stack     how often the accompaniment sits at or above the lead, or a tone or a semitone from it
//   spectrum  where one instrument's energy lies, band by band (a fizzing or a whistling part)
//   fills     the fills, rolls, risers and crashes: where they fall, how loud against the melody, how far off
//             the grid (a swung roll limps)
//   probe     one event of an instrument alone: how long it lasts, whether it pulses or clicks (a chip's sample
//             cut short, a loop swelling, a scratch that ignores its stroke)
//   gaps      the dead air: every stretch of 0.4 s or more where the mix falls 24 dB under its own level, by bar,
//             and what is still sounding there (a breakdown where everything stops - the owner heard it in bomb)
//
// Without --chip each command runs on every chip of the style's eras (the synthesizer's own voices for an era
// with none); without --seeds on the audit's three seeds. It changes nothing and writes nothing.

import { composeScore, Synth, SAMPLE_RATE as SR, MUSIC_PRESETS, MUSIC_NAMES } from '../src/core/music.js';
import { ERAS, ERA_NAMES } from '../src/core/eras.js';
import { ERA_CHIPS } from '../src/core/chips.js';
import { SCENE_BOARD, chipOfBoard } from '../src/core/boards.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [cmd, style] = positional;
const COMMANDS = ['layers', 'stack', 'spectrum', 'fills', 'probe', 'gaps'];
if (!COMMANDS.includes(cmd) || !MUSIC_PRESETS[style]) {
  console.log(`usage: npm run review:music -- <${COMMANDS.join('|')}> <style> [--chip c] [--seeds a,b] [--instr name] [--which n]\nstyles: ${MUSIC_NAMES.join(' ')}`);
  process.exit(cmd ? 1 : 0);
}
const SECS = Number(opt('secs', 90));
const SEEDS = opt('seeds', 'aurora,hikari,seedscene').split(',');
// every board a style is heard on: its eras' own, and the boards of the scenes it plays with there (as the audit)
const chipsOf = (st) => {
  const set = new Set();
  for (const era of ERA_NAMES) {
    if (!ERAS[era].music.includes(st)) continue;
    for (const c of ERA_CHIPS[era] || [null]) set.add(c);
    for (const scene of ERAS[era].scenes) if (SCENE_BOARD[scene]) set.add(chipOfBoard(SCENE_BOARD[scene]));
  }
  if (!set.size) set.add(null);
  return [...set];
};
const CHIPS = opt('chip') ? [opt('chip') === 'hifi' ? null : opt('chip')] : chipsOf(style);
const P = MUSIC_PRESETS[style];

const NAMES = 'C C# D D# E F F# G G# A A# B'.split(' ');
const nm = (p) => NAMES[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);
const db = (x) => (20 * Math.log10(x + 1e-12)).toFixed(1);
const key = (e) => e.instr + (e.kit ? ':' + e.kit : '');
// the lead: the hook's instrument (and kit), or the style's own lead role's instrument
const LEAD = P.lead === 'hook' && P.hook && P.hook.instr ? { instr: P.hook.instr, kit: P.hook.kit || null }
  : { instr: { squelch: 'xmlead', noir: 'theremin', pianolead: 'piano', hero: 'lead', gbchip: 'chip', fmbell: 'fmbell' }[P.lead] || P.lead, kit: null };
const isLead = (e) => e.instr === LEAD.instr && (!LEAD.kit || e.kit === LEAD.kit) && e.note > 0 && e.kit !== 'echo';
const isDouble = (e) => P.hook && P.hook.double && e.instr === P.hook.double.instr && (e.kit || null) === (P.hook.double.kit || null);

function render(seed, chip, filter) {
  const sc = composeScore(seed, SECS, style, chip);
  if (filter) sc.events = sc.events.filter(filter);
  const L = new Float32Array(sc.totalSamples), R = new Float32Array(sc.totalSamples);
  const sy = new Synth(sc, seed);
  for (let o = 0; o < sc.totalSamples; o += 8192) sy.render(L, R, o, Math.min(8192, sc.totalSamples - o));
  return { L, R, sc };
}
const biquad = (type, f, q = 0.707) => {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  const [b0, b1, b2] = type === 'hp' ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [(1 - c) / 2, 1 - c, (1 - c) / 2];
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
};
function bandpass(L, R, lo, hi) {
  const fs = [lo ? biquad('hp', lo) : null, lo ? biquad('hp', lo) : null, hi ? biquad('lp', hi) : null, hi ? biquad('lp', hi) : null].filter(Boolean);
  const o = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) { let y = (L[i] + R[i]) / 2; for (const f of fs) y = f(y); o[i] = y; }
  return o;
}
function stats(L, R) {
  let s2 = 0, pk = 0, hf2 = 0, prev = 0, prevh = 0, we = 0, wc = 0;
  const W = Math.round(0.05 * SR), win = [];
  for (let i = 0; i < L.length; i++) {
    const x = (L[i] + R[i]) * 0.5; s2 += x * x; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const h = x - prev, hh = h - prevh; prev = x; prevh = h; hf2 += hh * hh;          // a rough high-pass, ~5 kHz up
    we += x * x; if (++wc === W) { win.push(Math.sqrt(we / W)); we = 0; wc = 0; }
  }
  const rms = Math.sqrt(s2 / L.length), loud = Math.max(...win, 1e-12);
  return { rms, pk, loud, hf: Math.sqrt(hf2 / L.length) / (rms + 1e-12), on: win.filter((w) => w > loud * 0.1).length / Math.max(1, win.length) };
}
const head = (seed, chip, sc) => {
  const m = sc.meta, six = m.spb * SR / 4, bar = six * (m.steps || 16);
  console.log(`\n== ${cmd} ${style} on ${chip || 'hifi'}, seed ${seed}: ${m.bpm} bpm ${m.rootName} ${m.scaleLabel}, ${m.steps || 16} steps a bar, ${(sc.totalSamples / bar).toFixed(0)} bars`);
  return { six, bar };
};

function layers(seed, chip) {
  const full = render(seed, chip);
  const { six, bar } = head(seed, chip, full.sc);
  const ev = full.sc.events, bars = full.sc.totalSamples / bar;
  const by = {};
  for (const e of ev) (by[key(e)] ||= []).push(e);
  console.log('score: part, events (a bar), notes, velocity, length in sixteenths (median, longest), off the grid');
  for (const [k, es] of Object.entries(by)) {
    const notes = es.filter((e) => e.note > 0).map((e) => e.note);
    const off = es.filter((e) => { const r = e.t % six; return Math.min(r, six - r) / six > 0.05; }).length;
    const durs = es.map((e) => e.dur / six).sort((a, b) => a - b);
    console.log(`  ${k.padEnd(16)} ${String(es.length).padStart(4)} (${(es.length / bars).toFixed(1).padStart(4)})  ${notes.length ? (nm(Math.min(...notes)) + '-' + nm(Math.max(...notes))).padEnd(8) : '-'.padEnd(8)} vel ${Math.min(...es.map((e) => e.vel)).toFixed(2)}-${Math.max(...es.map((e) => e.vel)).toFixed(2)}  ${durs[durs.length >> 1].toFixed(2)}, ${durs.at(-1).toFixed(1)}  off-grid ${off}`);
  }
  const lead = ev.filter(isLead).sort((a, b) => a.t - b.t);
  if (lead.length) {
    let ov = 0; for (let i = 1; i < lead.length; i++) if (lead[i].t < lead[i - 1].t + lead[i - 1].dur - 1) ov++;
    const others = ev.filter((e) => e.note > 0 && !isLead(e) && !isDouble(e));
    let flam = 0; for (const l of lead) for (const o of others) { const d = Math.abs(o.t - l.t); if (d > 0.1 * six && d < 1.05 * six) { flam++; break; } }
    const pats = {}; for (const l of lead) { const b = Math.floor((l.t + six / 2) / bar); (pats[b] ||= []).push(Math.round((l.t - b * bar) / six)); }
    const cnt = {}; for (const p of Object.values(pats)) cnt[p.join(',')] = (cnt[p.join(',')] || 0) + 1;
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
    console.log(`lead ${key(lead[0])}: ${lead.length} notes, overlapping the next ${ov}, with another part's onset 0.1-1 sixteenth away (a flam) ${flam}`);
    console.log(`lead rhythm a bar: ${top.length} different in ${Object.keys(pats).length} bars; most often ${top.slice(0, 3).map(([p, c]) => `[${p}] x${c}`).join(', ')}`);
  }
  const mix = stats(full.L, full.R);
  let sl = 0, sr = 0, clip = 0;
  for (let i = 0; i < full.L.length; i++) { sl += full.L[i] ** 2; sr += full.R[i] ** 2; if (Math.abs(full.L[i]) > 0.99 || Math.abs(full.R[i]) > 0.99) clip++; }
  console.log(`mix: level ${db(mix.rms)} dB, peak ${db(mix.pk)} dBFS, left/right ${(10 * Math.log10(sl / sr)).toFixed(1)} dB, clipped samples ${clip}`);
  console.log('each layer alone: level against the mix, loudest 50 ms, peak, highs index (hiss, fizz), sounding');
  const groups = [...new Set(ev.map((e) => e.instr))];
  for (const g of groups) {
    const r = render(seed, chip, (e) => e.instr === g), s = stats(r.L, r.R);
    console.log(`  ${g.padEnd(10)} ${(20 * Math.log10(s.rms / mix.rms)).toFixed(1).padStart(6)} dB  ${db(s.loud).padStart(6)}  ${db(s.pk).padStart(6)}  hf ${s.hf.toFixed(2).padStart(5)}  ${(s.on * 100).toFixed(0).padStart(3)}%`);
  }
  if (lead.length) {
    const a = render(seed, chip, isLead), b = render(seed, chip, (e) => !isLead(e) && !isDouble(e));
    const ab = bandpass(a.L, a.R, 400, 4000), bb = bandpass(b.L, b.R, 400, 4000);
    let fa = 0, fb = 0, na = 0, nb = 0;
    for (const l of lead) for (let i = l.t; i < Math.min(a.L.length, l.t + l.dur); i++) {
      fa += ((a.L[i] + a.R[i]) / 2) ** 2; fb += ((b.L[i] + b.R[i]) / 2) ** 2; na += ab[i] ** 2; nb += bb[i] ** 2;
    }
    console.log(`lead against everything else while it sounds: ${(10 * Math.log10(fa / fb)).toFixed(1)} dB full band, ${(10 * Math.log10(na / nb)).toFixed(1)} dB in 400 Hz - 4 kHz`);
  }
}

function stack(seed, chip) {
  const sc = composeScore(seed, SECS, style, chip);
  head(seed, chip, sc);
  const lead = sc.events.filter(isLead);
  if (!lead.length) { console.log('no lead found'); return; }
  const acc = sc.events.filter((e) => e.note > 0 && !isLead(e) && !isDouble(e) && e.kit !== 'echo');
  const parts = [...new Set(acc.map(key))];
  for (const p of ['(all)', ...parts]) {
    const oth = p === '(all)' ? acc : acc.filter((e) => key(e) === p);
    let above = 0, near = 0;
    for (const l of lead) {
      const ov = oth.filter((o) => o.t < l.t + l.dur && o.t + o.dur > l.t);
      if (ov.some((o) => o.note >= l.note)) above++;
      if (ov.some((o) => o.note !== l.note && Math.abs(o.note - l.note) <= 2)) near++;
    }
    const ns = oth.map((e) => e.note);
    console.log(`  ${p.padEnd(16)} ${ns.length ? (nm(Math.min(...ns)) + '-' + nm(Math.max(...ns))).padEnd(8) : '-'.padEnd(8)} at or above the lead ${(100 * above / lead.length).toFixed(0).padStart(3)}%, a tone or a semitone from it ${(100 * near / lead.length).toFixed(0).padStart(3)}%`);
  }
  const ln = lead.map((e) => e.note);
  console.log(`  lead ${key(lead[0])} ${nm(Math.min(...ln))}-${nm(Math.max(...ln))}`);
}

function spectrum(seed, chip) {
  const instr = opt('instr', LEAD.instr);
  const r = render(seed, chip, (e) => e.instr === instr);
  head(seed, chip, r.sc);
  const bands = [[0, 250], [250, 1000], [1000, 2500], [2500, 5000], [5000, 10000], [10000, 0]];
  const e = bands.map(([lo, hi]) => { const b = bandpass(r.L, r.R, lo, hi); let s = 0; for (const x of b) s += x * x; return s; });
  const tot = e.reduce((a, b) => a + b, 0) || 1;
  console.log(`  ${instr} energy by band: ${bands.map(([lo, hi], i) => `${lo}-${hi || '…'} Hz ${(100 * e[i] / tot).toFixed(0)}%`).join(', ')}`);
}

function fills(seed, chip) {
  const full = render(seed, chip);
  const { six, bar } = head(seed, chip, full.sc);
  const ev = full.sc.events;
  // (and the toms a tribal piece rolls on)
  const NOISE = ['clap', 'snare', 'riser', 'crash', 'xmsnare', 'thsnare', 'timpani'];
  // a fill: the same drum struck three or more times inside a bar's last half, or a riser or a crash
  const marks = [];
  const byBar = {};
  for (const e of ev) if (NOISE.includes(e.instr)) (byBar[Math.floor((e.t + six / 2) / bar) + ':' + e.instr] ||= []).push(e);
  for (const [k, es] of Object.entries(byBar)) {
    const [b, instr] = k.split(':');
    const late = es.filter((e) => ((e.t % bar) / six) >= 8);
    if (instr === 'riser' || instr === 'crash' || late.length >= 3) marks.push({ bar: +b, instr, es: instr === 'riser' || instr === 'crash' ? es : late });
  }
  marks.sort((a, b) => a.bar - b.bar);
  if (!marks.length) { console.log('  no fills, risers or crashes'); return; }
  const lead = ev.filter(isLead);
  const lr = lead.length ? stats(...Object.values(render(seed, chip, isLead)).slice(0, 2)) : null;
  for (const m of marks) {
    // (the score is composed again for each render: a hit is known by its time and instrument, not by its object)
    const ids = new Set(m.es.map((e) => e.instr + '@' + e.t));
    const r = render(seed, chip, (e) => ids.has(e.instr + '@' + e.t));
    const s = stats(r.L, r.R);
    const offs = m.es.map((e) => { const x = e.t % six; return Math.min(x, six - x) / six; });
    console.log(`  bar ${String(m.bar).padStart(3)}: ${m.instr.padEnd(7)} x${String(m.es.length).padEnd(2)} loudest ${db(s.loud)} dB${lr ? ` (lead at its loudest ${db(lr.loud)})` : ''}, off the grid up to ${Math.max(...offs).toFixed(2)} of a sixteenth`);
  }
}

function probe(seed, chip) {
  const instr = opt('instr');
  if (!instr) { console.log('probe needs --instr'); return; }
  const sc = composeScore(seed, SECS, style, chip);
  head(seed, chip, sc);
  const es = sc.events.filter((e) => e.instr === instr);
  if (!es.length) { console.log(`  no ${instr} in this score`); return; }
  const which = Number(opt('which', 0));
  const picks = opt('which') !== undefined ? [es[which]] : [es[0], es[Math.floor(es.length / 2)], es.at(-1)];
  for (const e of picks) {
    const one = composeScore(seed, SECS, style, chip);
    one.events = [{ ...e, t: 0 }];
    const n = Math.round(Math.min(8, e.dur / SR + 3) * SR); one.totalSamples = n;
    const L = new Float32Array(n), R = new Float32Array(n), sy = new Synth(one, seed);
    for (let o = 0; o < n; o += 4096) sy.render(L, R, o, Math.min(4096, n - o));
    const W = Math.round(0.05 * SR), env = [];
    for (let i = 0; i + W <= n; i += W) { let s = 0; for (let k = 0; k < W; k++) s += ((L[i + k] + R[i + k]) / 2) ** 2; env.push(Math.sqrt(s / W)); }
    const pk = Math.max(...env, 1e-12);
    const last = (thr) => { let x = -1; env.forEach((v, i) => { if (v > pk * thr) x = i; }); return ((x + 1) * 0.05).toFixed(2); };
    // a click: a jump from one sample to the next far bigger than the jumps around it (10 ms either side)
    const D = new Float32Array(n); for (let i = 1; i < n; i++) D[i] = Math.abs(L[i] - L[i - 1]);
    // (on Paula the 8-bit sample's own steps count too: compare a chip's figure with the studio's, --chip hifi)
    const H = Math.round(0.01 * SR); let clicks = 0;
    const pre = new Float64Array(n + 1); for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + D[i];
    for (let i = H; i < n - H; i++) { const local = (pre[i + H] - pre[i - H] - D[i]) / (2 * H - 1); if (D[i] > 0.02 && D[i] > 12 * local) clicks++; }
    // a sustained note that swells after its attack: the largest rise in level after the first 0.3 s
    let swell = 0; for (let i = 6; i < env.length; i++) for (let j = Math.max(6, i - 10); j < i; j++) if (env[j] > pk * 0.05) swell = Math.max(swell, 20 * Math.log10(env[i] / env[j]));
    console.log(`  ${key(e)} note ${e.note > 0 ? nm(e.note) : '-'} vel ${e.vel.toFixed(2)}, asked for ${(e.dur / SR).toFixed(2)} s: lasts to -20 dB ${last(0.1)} s, to -40 dB ${last(0.01)} s, swells ${swell.toFixed(1)} dB after its attack, clicks ${clicks}`);
    console.log(`    level every 0.2 s (dB from its peak): ${env.filter((_, i) => i % 4 === 0).slice(0, 30).map((v) => Math.round(20 * Math.log10(v / pk + 1e-9))).join(' ')}`);
  }
}

function gaps(seed, chip) {
  const full = render(seed, chip);
  const { bar } = head(seed, chip, full.sc);
  const { L, R, sc } = full, W = Math.round(0.1 * SR);
  let s2 = 0; for (let i = 0; i < L.length; i++) s2 += (L[i] ** 2 + R[i] ** 2) / 2;
  const mix = Math.sqrt(s2 / L.length);
  const found = []; let start = -1;
  for (let i = 0; i + W <= L.length; i += W) {
    let e = 0; for (let k = 0; k < W; k++) e += (L[i + k] ** 2 + R[i + k] ** 2) / 2;
    const quiet = 20 * Math.log10(Math.sqrt(e / W) / mix + 1e-9) < -24;
    if (quiet && start < 0) start = i;
    if ((!quiet || i + 2 * W > L.length) && start >= 0) { if ((i - start) / SR >= 0.4) found.push([start, i]); start = -1; }
  }
  if (!found.length) { console.log('  no dead air (nothing 24 dB under the mix for 0.4 s or more)'); return; }
  let total = 0;
  for (const [a, b] of found) {
    total += (b - a) / SR;
    const there = [...new Set(sc.events.filter((e) => e.t < b && e.t + e.dur > a).map((e) => e.instr))];
    console.log(`  bars ${(a / bar).toFixed(1)}-${(b / bar).toFixed(1)}: ${((b - a) / SR).toFixed(1)} s, sounding: ${there.join(', ') || 'nothing'}`);
  }
  console.log(`  dead air in all: ${total.toFixed(1)} s of ${(L.length / SR).toFixed(0)}`);
}

const RUN = { layers, stack, spectrum, fills, probe, gaps }[cmd];
for (const chip of CHIPS) for (const seed of SEEDS) RUN(seed, chip);
