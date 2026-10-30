// Live mode: real-time playback in the browser.
// The visual clock is the synth's own sample position, so picture and sound
// stay locked even if a frame is dropped.

import { Demo, STYLE_NAMES } from '../src/app.js';
import { SAMPLE_RATE, MUSIC_NAMES, MUSIC_PRESETS } from '../src/core/music.js';
import { bootSequence } from './boot.js';
import { createMenu } from './menu.js';
import { ERAS, ERA_NAMES } from '../src/core/eras.js';
import { resolveChoices } from '../src/core/choose.js';

const params = new URLSearchParams(location.search);
// No seed in the address (a visitor arriving at a published copy): the seed
// "seedscene"; no scene: the one the seed picks.
const seed0 = params.get('seed') || 'seedscene';
const style0 = STYLE_NAMES.includes(params.get('style')) ? params.get('style')
  : resolveChoices({ seed: seed0, style: 'auto', era: params.get('era') || 'auto', music: 'auto' }).style;
if (params.get('seed') !== seed0 || params.get('style') !== style0) {
  const u = new URL(location.href);
  u.searchParams.set('seed', seed0);
  u.searchParams.set('style', style0);
  history.replaceState(null, '', u);      // so a reload, or the address shared, brings back this demo
}
const cfg = {
  seed: seed0,
  style: style0,
  era: params.get('era') || 'auto',
  music: params.get('music') || 'auto',
  width: parseInt(params.get('width') || '854', 10),
  height: parseInt(params.get('height') || '480', 10),
  duration: parseFloat(params.get('duration') || '180'),
  overlay: params.get('overlay') !== '0',
  intro: params.get('intro') !== '0',
  sound: params.get('sound') !== '0',      // off: the synth still runs - it is the picture's clock - at no volume
  autoplay: params.get('autoplay') === '1', // start in AUTOPLAY
};
if (cfg.music !== 'auto' && !MUSIC_NAMES.includes(cfg.music)) cfg.music = 'auto';
if (cfg.era !== 'auto' && !ERA_NAMES.includes(cfg.era)) cfg.era = 'auto';

const canvas = document.getElementById('c');
const hud = document.getElementById('hud');
const help = document.getElementById('help');
const hint = document.getElementById('hint');
const toastEl = document.getElementById('toast');

let demo, ctx, node, gain;
let audioPos = 0;          // sample position reported by the worklet
let audioPosAt = 0;        // performance.now() when it was reported
let running = false;
let paused = false;

function layout() {
  const ar = cfg.width / cfg.height;
  const wa = innerWidth / innerHeight;
  const w = wa > ar ? innerHeight * ar : innerWidth;
  const h = wa > ar ? innerHeight : innerWidth / ar;
  canvas.style.width = Math.round(w) + 'px';
  canvas.style.height = Math.round(h) + 'px';
}
addEventListener('resize', layout);

function buildDemo() {
  demo = new Demo({ canvas, ...cfg, live: true });
  layout();
  updateHud();
  return demo;
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function updateHud() {
  const m = demo.meta;
  hud.innerHTML = [
    `<b>${m.title}</b>`,
    `seed   ${escapeHtml(cfg.seed)}`,
    `era    ${ERAS[demo.era].label} ${ERAS[demo.era].year}${cfg.era === 'auto' ? ' (auto)' : ''}`,
    `scene  ${demo.style}`,
    `music  ${m.musicLabel}${cfg.music === 'auto' ? ' (auto)' : ''} &middot; ${m.bpm} bpm &middot; ${m.rootName} ${m.scaleLabel}`,
    `res    ${cfg.width}x${cfg.height}`,
    `<b>H</b> every key &middot; <b>M</b> menu &middot; <b>O</b> autoplay &middot; <b>T</b> the journey &middot; <b>A</b> about`,
  ].join('<br>');
}

/** A short C64-style notice in the corner: what just changed. */
let toastTimer = 0;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

// ---- audio ---------------------------------------------------------------

async function startAudio() {
  ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  if (ctx.sampleRate !== SAMPLE_RATE) {
    console.warn(`AudioContext runs at ${ctx.sampleRate} Hz; the synth assumes ${SAMPLE_RATE} Hz.`);
  }
  await ctx.audioWorklet.addModule('./worklet.js');
  gain = ctx.createGain();
  gain.gain.value = cfg.sound ? 0.9 : 0;
  gain.connect(ctx.destination);
  connectSynth(firstPart());
}

/**
 * Where a programme starts playing. THE JOURNEY starts at the beginning;
 * AUTOPLAY drops in somewhere new in its endless channel every time it is
 * started, so it never plays the same sequence twice. (An mp4 rendered with
 * `seedscene autoplay` starts at its beginning, so a seed still reproduces it.)
 */
function firstPart() {
  return demo && demo.inAutoplay ? Math.floor(Math.random() * Math.min(demo.programme.count, 50000)) : 0;
}

/** Stop a synth for good. Disconnecting alone leaves it running and talking. */
function retire(old) {
  old.port.onmessage = null;
  old.port.postMessage({ type: 'stop' });     // its processor returns false and ends
  try { old.disconnect(); } catch { /* already gone */ }
}

/**
 * Start a synth on whatever the demo is playing now (its seed, music, length),
 * or on a programme from part `startPart` on.
 */
function connectSynth(startPart = 0) {
  if (node) retire(node);
  const pr = demo.programme;
  const current = new AudioWorkletNode(ctx, 'seedscene-synth', {
    numberOfInputs: 0,
    outputChannelCount: [2],
    processorOptions: {
      seed: demo.seed, duration: demo.duration, music: demo.music, chip: demo.chip, loop: true,
      programme: pr ? pr.kind : null, startPart,
    },
  });
  node = current;
  current.port.onmessage = (e) => {
    // Only the live synth may move the clock; a message still in flight from
    // a retired one would drag the picture back to the old seed's time.
    if (node !== current) return;
    if (e.data.type === 'pos') {
      audioPos = e.data.pos;
      audioPosAt = performance.now();
    } else if (e.data.type === 'loop') {
      audioPos = 0;
      audioPosAt = performance.now();
    }
  };
  node.connect(gain);
  // the synth reports where it is shortly; until then, start where it starts
  audioPos = pr ? pr.part(startPart).start : 0;
  audioPosAt = performance.now();
}

function now() {
  // Interpolate between worklet position reports for a smooth clock.
  const extra = paused ? 0 : (performance.now() - audioPosAt) / 1000;
  return audioPos / SAMPLE_RATE + extra;
}

function loop() {
  requestAnimationFrame(loop);
  if (!running) return;
  const length = demo.inProgramme ? demo.programme.meta.duration : demo.duration;
  demo.drawAt(now() % length);
}

function prepare() {
  if (!demo) buildDemo();
}

/** Runs inside the viewer's key press or click, so audio is allowed to start. */
async function start() {
  prepare();
  // asked for in the address: start in AUTOPLAY (the synth then starts somewhere new in it)
  if (cfg.autoplay) { if (!demo.inAutoplay) demo.setProgramme('autoplay'); programmeChrome('autoplay', true); }
  await startAudio();
  running = true;
  loop();
  // Let the info panel introduce the demo, then get out of its way.
  setTimeout(() => hud.classList.add('hidden'), 6000);
}

// ---- the things a viewer can change ---------------------------------------

function remember(key, value) {
  const u = new URL(location.href);
  u.searchParams.set(key, value);
  history.replaceState(null, '', u);
}

function setStyle(name) {
  cfg.style = name;
  remember('style', name);
  if (demo.setStyle(name).musicChanged) connectSynth();
  updateHud();
  toast(`SCENE: ${name.toUpperCase()}`);
}

function setEra(name) {
  cfg.era = name;
  remember('era', name);
  if (demo.setEra(name).musicChanged) connectSynth();
  updateHud();
  const e = ERAS[demo.era];
  toast(name === 'auto' ? `ERA: AUTO (${e.label.toUpperCase()})` : `${e.year} ${e.label.toUpperCase()}`);
}

const ERA_CYCLE = ['auto', ...ERA_NAMES];
function stepEra(d) {
  const i = ERA_CYCLE.indexOf(cfg.era) + d;
  setEra(ERA_CYCLE[(i + ERA_CYCLE.length) % ERA_CYCLE.length]);
}

function stepStyle(d) {
  const i = STYLE_NAMES.indexOf(cfg.style) + d;
  setStyle(STYLE_NAMES[(i + STYLE_NAMES.length) % STYLE_NAMES.length]);
}

function setSeed(seed) {
  cfg.seed = seed;
  remember('seed', seed);
  demo.setSeed(seed);
  updateHud();
  connectSynth();          // the synth has to restart on the new score
  toast(`SEED: ${String(seed).toUpperCase()}`);
}

const randomSeed = () => setSeed(Math.random().toString(36).slice(2, 9));

function setMusic(music) {
  cfg.music = music;
  remember('music', music);
  if (demo.setMusic(music).musicChanged) connectSynth();
  updateHud();
  toast(`MUSIC: ${demo.meta.musicLabel.toUpperCase()}${music === 'auto' ? ' (AUTO)' : ''}`);
}

const MUSIC_CYCLE = ['auto', ...MUSIC_NAMES];
function stepMusic(d) {
  const i = MUSIC_CYCLE.indexOf(cfg.music) + d;
  setMusic(MUSIC_CYCLE[(i + MUSIC_CYCLE.length) % MUSIC_CYCLE.length]);
}

function setResolution(w, h) {
  cfg.width = w;
  cfg.height = h;
  remember('width', w);
  remember('height', h);
  demo.resize(w, h);
  layout();
  updateHud();
}

function setDuration(seconds) {
  cfg.duration = seconds;
  remember('duration', seconds);
  demo.setDuration(seconds);
  updateHud();
  connectSynth();          // a new length is a new arrangement
}

function setOverlay(on) {
  cfg.overlay = on;
  remember('overlay', on ? '1' : '0');
  demo.setOverlay(on);
}

/** Sound on or off; off, the demo plays on in silence, the picture still on the beat. */
function setSound(on) {
  cfg.sound = on;
  remember('sound', on ? '1' : '0');
  if (gain) gain.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.02);
  toast(on ? 'SOUND ON' : 'SOUND OFF - V TO TURN IT ON');
}

function togglePause() {
  paused = !paused;
  if (paused) { ctx.suspend(); } else { ctx.resume(); audioPosAt = performance.now(); }
  toast(paused ? 'PAUSED - P TO GO ON' : 'PLAYING');
}

const PROGRAMME_KEY = { journey: 'T', autoplay: 'O' };

/** THE JOURNEY (T) or AUTOPLAY (O); the same key again goes back to the demo. */
function toggleProgramme(kind) {
  const on = !(demo.programme && demo.programme.kind === kind);
  demo.setProgramme(on ? kind : null);
  connectSynth(firstPart());
  cfg.autoplay = demo.inAutoplay;                // kept in the address, so a reload comes back to it
  remember('autoplay', cfg.autoplay ? '1' : '0');
  programmeChrome(kind, on);
  if (!on) toast(`BACK TO ${String(cfg.seed).toUpperCase()}`);
  else toast(kind === 'journey' ? `THE JOURNEY: ${ERAS[ERA_NAMES[0]].year} TO NOW` : 'AUTOPLAY: ERA AFTER ERA, NO END');
}

/** The page's chrome for a programme: quiet, as the About part, and the hint to get back. */
function programmeChrome(kind, on) {
  document.body.classList.toggle('about', on);    // the same quiet chrome as About
  if (on) hud.classList.add('hidden');
  else updateHud();
  const key = PROGRAMME_KEY[kind];
  hint.textContent = on ? `${key} · BACK TO YOUR DEMO   SPACE · NEXT` : 'H · KEYS';
}

/** In a programme: jump to the next (or previous) part, sound and picture. */
function skipPart(d) {
  const pr = demo.programme;
  const i = (pr.indexAt(now() % pr.meta.duration) + d + pr.count) % pr.count;
  connectSynth(i);
  toast(pr.kind === 'journey' ? ERAS[pr.plan(i).era].label.toUpperCase() : (d > 0 ? 'NEXT TRACK' : 'PREVIOUS TRACK'));
}

function toggleAbout() {
  const on = !demo.inAbout;
  demo.setAbout(on);
  connectSynth();
  document.body.classList.toggle('about', on);
  if (on) hud.classList.add('hidden');
  else updateHud();
  hint.textContent = on ? 'A · BACK TO YOUR DEMO' : 'H · KEYS';
  toast(on ? 'ABOUT SEEDSCENE' : `BACK TO ${String(cfg.seed).toUpperCase()}`);
}

/** The command lines that reproduce exactly what is on screen. */
function commands() {
  const q = (s) => (/^[\w.-]+$/.test(s) ? s : `"${s.replace(/"/g, '\\"')}"`);
  const base = `--seed ${q(cfg.seed)} --style ${cfg.style}`
    + (cfg.era === 'auto' ? '' : ` --era ${cfg.era}`)
    + (cfg.music === 'auto' ? '' : ` --music ${cfg.music}`)
    + ` --res ${cfg.width}x${cfg.height} --duration ${cfg.duration}`
    + (cfg.overlay ? '' : ' --no-overlay');
  return {
    live: `node bin/seedscene.js live ${base}${cfg.sound ? '' : ' --mute'}`,
    render: `node bin/seedscene.js render ${base}`,
  };
}

const menu = createMenu({
  root: document.getElementById('menu'),
  styles: STYLE_NAMES,
  musics: MUSIC_CYCLE,
  musicLabel: (m) => (m === 'auto' ? `AUTO: ${demo.meta.musicLabel}` : MUSIC_PRESETS[m].label),
  eras: ERA_CYCLE,
  eraLabel: (e) => (e === 'auto' ? `AUTO: ${ERAS[demo.era].label}` : `${ERAS[e].year} ${ERAS[e].label}`),
  getState: () => ({ ...cfg }),
  actions: {
    setSeed, randomSeed, setStyle, setEra, setMusic, setResolution, setDuration, setOverlay, setSound, commands,
  },
});

// ---- the help screen (H) ---------------------------------------------------

const KEYS = [
  ['SPACE', 'NEXT SCENE'],
  ['← →', 'PREVIOUS / NEXT SCENE'],
  ['↑ ↓', 'CHANGE THE MUSIC STYLE'],
  ['E', `NEXT ERA (OR 1-${ERA_NAMES.length} TO JUMP: ${ERA_NAMES[0].toUpperCase()} ... ${ERA_NAMES[ERA_NAMES.length - 1].toUpperCase()})`],
  ['O', 'AUTOPLAY: ERA AFTER ERA, FOR HOURS (SPACE SKIPS)'],
  ['T', `THE JOURNEY: EVERY ERA, ${ERAS[ERA_NAMES[0]].year} TO NOW`],
  ['S', 'NEW RANDOM SEED'],
  ['M', 'MENU: TYPE YOUR OWN SEED AND MORE'],
  ['A', 'THE ABOUT PART'],
  ['P', 'PAUSE'],
  ['V', 'SOUND ON / OFF (THE PICTURE KEEPS THE BEAT)'],
  ['F', 'FULLSCREEN'],
  ['I', 'SHOW / HIDE THE INFO PANEL'],
  ['H', 'SHOW / HIDE THIS SCREEN'],
];
help.innerHTML = `
  <div class="panel">
    <div class="title">**** SEEDSCENE KEYS ****</div>
    ${KEYS.map(([k, d]) => `<div class="krow"><span class="key">${k}</span><span>${d}</span></div>`).join('')}
    <div class="help">PRESS H AGAIN TO HIDE</div>
  </div>`;
const toggleHelp = () => help.classList.toggle('open');

// ---- keyboard ----------------------------------------------------------------

addEventListener('keydown', (e) => {
  if (!running) return;
  if (menu.isOpen()) { menu.handleKey(e); return; }
  const k = e.key.toLowerCase();
  const handled = () => e.preventDefault();

  // keys that work everywhere, the About part included
  if (k === 'h') { handled(); toggleHelp(); return; }
  if (k === 'escape' && help.classList.contains('open')) { help.classList.remove('open'); return; }
  if (k === 'p') { handled(); togglePause(); return; }
  if (k === 'v') { handled(); setSound(!cfg.sound); return; }
  if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
    return;
  }
  if (!demo.inProgramme && (k === 'a' || (k === 'escape' && demo.inAbout))) { handled(); toggleAbout(); return; }
  if (!demo.inAbout) {
    if (k === 't' || (k === 'escape' && demo.inJourney)) { handled(); toggleProgramme('journey'); return; }
    if (k === 'o' || (k === 'escape' && demo.inAutoplay)) { handled(); toggleProgramme('autoplay'); return; }
  }
  if (demo.inProgramme && (k === ' ' || k === 'arrowright' || k === 'arrowleft')) {
    handled();
    skipPart(k === 'arrowleft' ? -1 : 1);
    return;
  }
  if (demo.inAbout || demo.inProgramme) {
    const back = demo.inAbout ? 'A' : PROGRAMME_KEY[demo.programme.kind];
    if (k.length === 1 || k.startsWith('arrow')) { handled(); toast(`PRESS ${back} TO GO BACK`); }
    return;
  }

  if (k === 'm') {
    handled();               // or the "m" lands in the seed field the menu focuses
    menu.toggle();
  } else if (k === ' ') {
    handled();
    stepStyle(1);
  } else if (k === 'arrowright' || k === 'arrowleft') {
    handled();
    stepStyle(k === 'arrowright' ? 1 : -1);
  } else if (k === 'arrowup' || k === 'arrowdown') {
    handled();
    stepMusic(k === 'arrowup' ? 1 : -1);
  } else if (k === 's') {
    randomSeed();
  } else if (k === 'i') {
    hud.classList.toggle('hidden');
  } else if (k === 'e') {
    stepEra(1);
  } else if (k >= '1' && k <= String(ERA_NAMES.length)) {
    setEra(ERA_NAMES[parseInt(k, 10) - 1]);
  }
});

// If the browser takes the GPU away (a driver reset, waking from sleep), the
// picture would stay black: wait for it to come back, then reload - every
// choice is in the page address, so the same demo returns at READY.
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();                       // ask for it back
  toast('THE GPU WAS RESET - RESTORING');
});
canvas.addEventListener('webglcontextrestored', () => location.reload());

bootSequence({
  root: document.getElementById('boot'),
  screen: document.getElementById('screen'),
  seed: cfg.seed,
  intro: cfg.intro,
  sound: cfg.sound,
  prepare,
  onRun: start,
});
