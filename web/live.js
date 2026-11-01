// Live mode: real-time playback in the browser.
// The visual clock is the synth's own sample position, so picture and sound
// stay locked even if a frame is dropped.

import { Demo, STYLE_NAMES } from '../src/app.js';
import { SAMPLE_RATE, MUSIC_NAMES, MUSIC_PRESETS } from '../src/core/music.js';
import { bootSequence } from './boot.js';
import { createMenu } from './menu.js';
import { ERAS, ERA_NAMES, eraKey } from '../src/core/eras.js';
import { sceneTour, sceneList, musicTour } from '../src/core/catalogue.js';
import { DISPLAYS, DISPLAY_NAMES } from '../src/core/displays.js';
import { BOARDS, BOARD_NAMES } from '../src/core/boards.js';
import { resolveChoices } from '../src/core/choose.js';
import { bornInHome } from '../src/core/journey.js';
import { cleanGreets } from '../src/brand.js';

const params = new URLSearchParams(location.search);
// No seed in the address (a visitor arriving at a published copy): the seed
// "seedscene"; no scene: the one the seed picks.
const seed0 = params.get('seed') || 'seedscene';
// the scene: ?scene=, or ?style= - its old name, still in addresses shared before
const asked = params.get('scene') || params.get('style');
const style0 = STYLE_NAMES.includes(asked) ? asked
  : resolveChoices({ seed: seed0, style: 'auto', era: params.get('era') || 'auto', music: 'auto' }).style;
if (params.get('seed') !== seed0 || params.get('scene') !== style0 || params.has('style')) {
  const u = new URL(location.href);
  u.searchParams.set('seed', seed0);
  u.searchParams.delete('style');
  u.searchParams.set('scene', style0);
  history.replaceState(null, '', u);      // so a reload, or the address shared, brings back this demo
}
const cfg = {
  seed: seed0,
  style: style0,
  era: eraKey(params.get('era')) || 'auto',   // (an old machine name still finds its era)
  music: params.get('music') || 'auto',
  display: params.get('display') || 'auto',   // DISPLAY: auto, or one screen forced on everything
  board: params.get('board') || 'auto',       // SOUND BOARD: auto, or one board forced on all the music
  width: parseInt(params.get('width') || '854', 10),
  height: parseInt(params.get('height') || '480', 10),
  duration: parseFloat(params.get('duration') || '180'),
  overlay: params.get('overlay') !== '0',
  intro: params.get('intro') !== '0',
  sound: params.get('sound') !== '0',      // off: the synth still runs - it is the picture's clock - at no volume
  autoplay: params.get('autoplay') === '1', // start in AUTOPLAY
  journey: params.get('journey') === '1',   // ... or in THE JOURNEY
  bornIn: /^\d{4}$/.test(params.get('born') || '') ? parseInt(params.get('born'), 10) : null,   // ... born in that year
  // the viewer's greetings live after the # of the address: a browser never sends that part anywhere
  greets: cleanGreets(new URLSearchParams(location.hash.slice(1)).get('greets')),
  // seconds without input before the screensaver comes on; 0 never
  saver: /^\d+$/.test(params.get('saver') || '') ? parseInt(params.get('saver'), 10) : 60,
};
if (cfg.music !== 'auto' && !MUSIC_NAMES.includes(cfg.music)) cfg.music = 'auto';
if (cfg.era !== 'auto' && !ERA_NAMES.includes(cfg.era)) cfg.era = 'auto';
if (cfg.display !== 'auto' && !DISPLAYS[cfg.display]) cfg.display = 'auto';
if (cfg.board !== 'auto' && !BOARDS[cfg.board]) cfg.board = 'auto';

const canvas = document.getElementById('c');
const hud = document.getElementById('hud');
const help = document.getElementById('help');
const hint = document.getElementById('hint');
const toastEl = document.getElementById('toast');
const bornEl = document.getElementById('born');
const greetEl = document.getElementById('greet');

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
    `era    ${ERAS[demo.era].label} ${ERAS[demo.era].title}${cfg.era === 'auto' ? ' (auto)' : ''}`,
    `scene  ${demo.style}`,
    `screen ${DISPLAYS[demo.renderer.display].name}${cfg.display === 'auto' ? ' (auto)' : ''}`,
    `sound  ${BOARDS[demo.board].name}${cfg.board === 'auto' ? ' (auto)' : ''}`,
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

async function startAudio(ready = null) {
  ctx = new AudioContext({ sampleRate: SAMPLE_RATE });          // inside the viewer's gesture, before any wait
  if (ctx.sampleRate !== SAMPLE_RATE) {
    console.warn(`AudioContext runs at ${ctx.sampleRate} Hz; the synth assumes ${SAMPLE_RATE} Hz.`);
  }
  await ctx.audioWorklet.addModule('./worklet.js');
  gain = ctx.createGain();
  gain.gain.value = cfg.sound ? 0.9 : 0;
  gain.connect(ctx.destination);
  // the music starts with the picture: once the first scene can be drawn
  if (ready) await ready;
  connectSynth(firstPart());
}

/**
 * Where a programme starts playing. THE JOURNEY starts at the beginning;
 * AUTOPLAY drops in somewhere new in its endless channel every time it is
 * started, so it never plays the same sequence twice. (An mp4 rendered with
 * `seedscene autoplay` starts at its beginning, so a seed still reproduces it.)
 */
function firstPart() {
  return demo && demo.inAutoplay ? demo.programme.entry(Math.random()) : 0;
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
      seed: demo.seed, duration: demo.duration, music: demo.music, chip: demo.chip, board: cfg.board, loop: true,
      programme: pr ? pr.kind : null, startPart, bornIn: pr ? pr.bornIn : null,
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
  // every scene compiled in the background while the boot screen plays: this
  // era's first, then the rest, so switching never waits for the driver
  const era = ERAS[demo.era] ? demo.era : null;
  const mine = era ? ERAS[era].scenes : [];
  demo.renderer.warm([...mine, ...STYLE_NAMES.filter((n) => !mine.includes(n))]);
}

/** Runs inside the viewer's key press or click, so audio is allowed to start. */
async function start() {
  prepare();
  // asked for in the address: start in AUTOPLAY (the synth then starts somewhere new in it)
  if (cfg.journey) { if (!demo.inJourney) demo.setProgramme('journey'); programmeChrome('journey', true); }
  else if (cfg.autoplay) { if (!demo.inAutoplay) demo.setProgramme('autoplay', { bornIn: cfg.bornIn }); programmeChrome('autoplay', true); }
  await startAudio(demo.renderer.whenReady());
  running = true;
  loop();
  // Let the info panel introduce the demo, then get out of its way.
  setTimeout(() => hud.classList.add('hidden'), 6000);
}

// ---- the things a viewer can change ---------------------------------------

function remember(key, value) {
  const u = new URL(location.href);
  if (value === null) u.searchParams.delete(key);
  else u.searchParams.set(key, value);
  history.replaceState(null, '', u);
}

function setStyle(name) {
  cfg.style = name;
  remember('scene', name);
  if (demo.setStyle(name).musicChanged) connectSynth();
  // the scene comes on now, on the music's clock (a new tune starts it from the top)
  else demo.renderer.sceneStart = now() % (demo.inProgramme ? demo.programme.meta.duration : demo.duration);
  updateHud();
  toast(`SCENE: ${name.toUpperCase()}`);
}

function setEra(name) {
  cfg.era = name;
  remember('era', name);
  if (demo.setEra(name).musicChanged) connectSynth();
  updateHud();
  const e = ERAS[demo.era];
  toast(name === 'auto' ? `ERA: AUTO (${e.label.toUpperCase()})` : `${e.label} ${e.title.toUpperCase()}`);
}

const ERA_CYCLE = ['auto', ...ERA_NAMES];
function stepEra(d) {
  const i = ERA_CYCLE.indexOf(cfg.era) + d;
  setEra(ERA_CYCLE[(i + ERA_CYCLE.length) % ERA_CYCLE.length]);
}

/**
 * The next or previous scene: through the catalogue era by era, oldest first, each era's scenes in the
 * order the seed deals them; past an era's last scene, on into the next era's first, scene and era together.
 */
function stepStyle(d) {
  const tour = sceneTour(cfg.seed);
  let i = tour.findIndex((x) => x.scene === cfg.style && x.era === demo.era);
  if (i < 0) i = tour.findIndex((x) => x.scene === cfg.style);
  const next = tour[(i + d + tour.length) % tour.length];
  if (next.era === demo.era) setStyle(next.scene);
  else setSceneInEra(next.scene, next.era);
}

function setSceneInEra(name, era) {
  cfg.style = name;
  cfg.era = era;
  remember('scene', name);
  remember('era', era);
  if (demo.setSceneInEra(name, era).musicChanged) connectSynth();
  else demo.renderer.sceneStart = now() % (demo.inProgramme ? demo.programme.meta.duration : demo.duration);
  updateHud();
  toast(`SCENE: ${name.toUpperCase()}  ${ERAS[era].label}`);
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

/** The music, from the era playing: its own styles first in the seed's order, then the other eras', each once. */
const musicCycle = () => ['auto', ...musicTour(cfg.seed, demo.era)];
function stepMusic(d) {
  const cycle = musicCycle();
  const i = cycle.indexOf(cfg.music) + d;
  setMusic(cycle[(i + cycle.length) % cycle.length]);
}

/** DISPLAY: auto (each scene its own screen, or its era's), or one screen forced on everything. */
function setDisplay(name) {
  cfg.display = name;
  remember('display', name === 'auto' ? null : name);
  demo.setDisplay(name);
  updateHud();
  toast(name === 'auto' ? `DISPLAY: AUTO (${DISPLAYS[demo.renderer.display].name})` : `DISPLAY: ${DISPLAYS[name].name} - ${DISPLAYS[name].label.toUpperCase()}`);
}
const DISPLAY_CYCLE = ['auto', ...DISPLAY_NAMES];

/** SOUND BOARD: auto (each scene its own, or its era's), or one board forced on all the music; the tune starts again on it. */
function setBoard(name) {
  cfg.board = name;
  remember('board', name === 'auto' ? null : name);
  const pr = demo.programme;
  const at = pr ? pr.indexAt(now() % pr.meta.duration) : 0;
  if (demo.setBoard(name).musicChanged) connectSynth(at);
  updateHud();
  toast(name === 'auto' ? `SOUND BOARD: AUTO (${BOARDS[demo.board].name})` : `SOUND BOARD: ${BOARDS[name].name} - ${BOARDS[name].label.toUpperCase()}`);
}
const BOARD_CYCLE = ['auto', ...BOARD_NAMES];
function stepBoard(d) {
  const i = BOARD_CYCLE.indexOf(cfg.board) + d;
  setBoard(BOARD_CYCLE[(i + BOARD_CYCLE.length) % BOARD_CYCLE.length]);
}
function stepDisplay(d) {
  const i = DISPLAY_CYCLE.indexOf(cfg.display) + d;
  setDisplay(DISPLAY_CYCLE[(i + DISPLAY_CYCLE.length) % DISPLAY_CYCLE.length]);
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
  cfg.journey = demo.inJourney;
  remember('autoplay', cfg.autoplay ? '1' : '0');
  remember('journey', cfg.journey ? '1' : null);
  cfg.bornIn = null;
  remember('born', null);
  programmeChrome(kind, on);
  if (!on) toast(`BACK TO ${String(cfg.seed).toUpperCase()}`);
  else toast(kind === 'journey' ? `THE JOURNEY: ${ERAS[ERA_NAMES[0]].year} TO NOW` : 'AUTOPLAY: ERA AFTER ERA, NO END');
}

/** Born in: AUTOPLAY opened in the era of the viewer's twelfth year, and kept near it. */
function startBornIn(year) {
  demo.setProgramme('autoplay', { bornIn: year });
  connectSynth(firstPart());
  cfg.autoplay = true;
  cfg.journey = false;
  remember('journey', null);
  cfg.bornIn = year;
  remember('autoplay', '1');
  remember('born', String(year));
  programmeChrome('autoplay', true);
  const e = ERAS[bornInHome(year)];
  toast(`BORN IN ${year}: ${e.label} ${e.title.toUpperCase()}`);
}

/** The key that leaves the programme playing: B for born in, O for AUTOPLAY, T for THE JOURNEY. */
const backKey = (kind) => (kind === 'autoplay' && demo.programme && demo.programme.bornIn !== null ? 'B' : PROGRAMME_KEY[kind]);

/** The page's chrome for a programme: quiet, as the About part, and the hint to get back. */
function programmeChrome(kind, on) {
  document.body.classList.toggle('about', on);    // the same quiet chrome as About
  if (on) hud.classList.add('hidden');
  else updateHud();
  const key = backKey(kind);
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
  const base = `--seed ${q(cfg.seed)} --scene ${cfg.style}`
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
  styles: () => sceneList(cfg.seed),
  musics: musicCycle,
  musicLabel: (m) => (m === 'auto' ? `AUTO: ${demo.meta.musicLabel}` : MUSIC_PRESETS[m].label),
  eras: ERA_CYCLE,
  displays: DISPLAY_CYCLE,
  boards: BOARD_CYCLE,
  boardLabel: (b) => (b === 'auto' ? `AUTO: ${BOARDS[demo.board].name}` : `${BOARDS[b].name} ${BOARDS[b].label}`),
  displayLabel: (d) => (d === 'auto' ? `AUTO: ${DISPLAYS[demo.renderer.display].name}` : `${DISPLAYS[d].name} ${DISPLAYS[d].label}`),
  eraLabel: (e) => (e === 'auto' ? `AUTO: ${ERAS[demo.era].label}` : `${ERAS[e].label} ${ERAS[e].title}`),
  getState: () => ({ ...cfg }),
  actions: {
    setSeed, randomSeed, setStyle, stepStyle, setEra, setMusic, stepMusic, setDisplay, setBoard, setResolution, setDuration, setOverlay, setSound, commands,
  },
});

// ---- born in (B): the year, typed --------------------------------------------

let bornDigits = '';
const bornOpen = () => bornEl.classList.contains('open');
function drawBorn() {
  const year = parseInt(bornDigits, 10);
  const ok = bornDigits.length === 4 && year >= 1900 && year <= new Date().getFullYear();
  const e = ok ? ERAS[bornInHome(year)] : null;
  bornEl.innerHTML = `
    <div class="panel">
      <div class="title">**** BORN IN ****</div>
      <div class="krow"><span>THE YEAR YOU WERE BORN</span><span class="key">${bornDigits}<span class="cur">_</span></span></div>
      <div class="krow"><span>TWELVE IN</span><span class="key">${ok ? `${year + 12} &middot; ${e.label.toUpperCase()}` : '....'}</span></div>
      <div class="help">${ok ? 'RETURN &middot; AUTOPLAY FROM THERE' : 'TYPE FOUR DIGITS'} &nbsp; ESC &middot; CANCEL</div>
    </div>`;
  return ok ? year : null;
}
function openBorn() { bornDigits = cfg.bornIn ? String(cfg.bornIn) : ''; drawBorn(); bornEl.classList.add('open'); }
function closeBorn() { bornEl.classList.remove('open'); }
/** Keys while the year is being typed. */
function bornKey(e) {
  const k = e.key;
  e.preventDefault();
  if (k === 'Escape') closeBorn();
  else if (k === 'Backspace') { bornDigits = bornDigits.slice(0, -1); drawBorn(); }
  else if (/^\d$/.test(k) && bornDigits.length < 4) { bornDigits += k; drawBorn(); }
  else if (k === 'Enter') {
    const year = drawBorn();
    if (year !== null) { closeBorn(); startBornIn(year); }
  }
}

// ---- greetings (G): names for the scroller -----------------------------------

const greetOpen = () => greetEl.classList.contains('open');
function openGreet() {
  greetEl.innerHTML = `
    <div class="panel">
      <div class="title">**** GREETINGS ****</div>
      <div class="row">NAMES TO GREET, BETWEEN COMMAS - UP TO EIGHT</div>
      <input class="names" type="text" maxlength="160" spellcheck="false" autocomplete="off">
      <div class="note">THEY STAY ON THIS SCREEN. NOTHING IS SENT ANYWHERE.</div>
      <div class="help">RETURN &middot; INTO THE SCROLLER &nbsp; ESC &middot; CANCEL</div>
    </div>`;
  const input = greetEl.querySelector('input');
  input.value = cfg.greets.join(', ').toLowerCase();
  greetEl.classList.add('open');
  input.focus();
}
function closeGreet() { greetEl.classList.remove('open'); }
/** Keys while names are typed: the field takes the letters; RETURN keeps them, ESC leaves. */
function greetKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeGreet(); return; }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  setGreets(cleanGreets(greetEl.querySelector('input').value));
  closeGreet();
}
function setGreets(names) {
  cfg.greets = names;
  demo.setGreets(names);
  // kept after the #, so a reload brings them back without them ever reaching a server
  const u = new URL(location.href);
  u.hash = names.length ? new URLSearchParams({ greets: names.join(',') }).toString() : '';
  history.replaceState(null, '', u);
  toast(names.length ? `GREETINGS TO ${names.join(', ')}` : 'NO GREETINGS');
}

// ---- the screensaver: a minute without input, and AUTOPLAY takes the screen ---------

let lastInput = performance.now();
// the screensaver is on (in full screen if the page was - a browser lets a page ask for full
// screen only right after a key or a click, never after a minute of nothing: in a window it fills the window)
let saver = false;
let lastMouse = null;

function sleepCheck() {
  if (!running || saver || paused || !cfg.saver || document.visibilityState !== 'visible') return;
  // not over a programme, the About part, or a box the viewer has open
  if (demo.inProgramme || demo.inAbout || menu.isOpen() || bornOpen() || greetOpen() || help.classList.contains('open')) return;
  if (performance.now() - lastInput < cfg.saver * 1000) return;
  saver = true;
  demo.setProgramme('autoplay');
  connectSynth(firstPart());
  programmeChrome('autoplay', true);
  hint.textContent = '';
  document.body.classList.add('saver');
}

/** Any key, a click, the wheel, a touch, the mouse moving: the demo comes back. */
function wake() {
  saver = false;
  document.body.classList.remove('saver');
  demo.setProgramme(null);
  connectSynth();
  programmeChrome('autoplay', false);
  toast(`BACK TO ${String(cfg.seed).toUpperCase()}`);
}

function touched() {
  lastInput = performance.now();
  if (saver) wake();
}
setInterval(sleepCheck, 1000);
// before every other key handler: the key that wakes the demo does nothing else
addEventListener('keydown', (e) => {
  const was = saver;
  touched();
  if (was) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
for (const ev of ['mousedown', 'wheel', 'touchstart']) addEventListener(ev, touched, { passive: true });
addEventListener('mousemove', (e) => {
  // a hand on the mouse, not the desk shaking
  const far = !lastMouse || Math.abs(e.screenX - lastMouse[0]) + Math.abs(e.screenY - lastMouse[1]) > 8;
  lastMouse = [e.screenX, e.screenY];
  if (far) touched();
});

// ---- the help screen (H) ---------------------------------------------------

const KEYS = [
  ['SPACE', 'NEXT SCENE'],
  ['← →', 'PREVIOUS / NEXT SCENE'],
  ['↑ ↓', 'CHANGE THE MUSIC STYLE'],
  ['E', `NEXT ERA (OR 1-${ERA_NAMES.length} TO JUMP: ${ERA_NAMES[0].toUpperCase()} ... ${ERA_NAMES[ERA_NAMES.length - 1].toUpperCase()})`],
  ['O', 'AUTOPLAY: ERA AFTER ERA, FOR HOURS (SPACE SKIPS)'],
  ['T', `THE JOURNEY: EVERY ERA, ${ERAS[ERA_NAMES[0]].year} TO NOW`],
  ['B', 'BORN IN: TYPE YOUR YEAR, AUTOPLAY FROM WHEN YOU WERE TWELVE'],
  ['G', 'GREETINGS: TYPE NAMES FOR THE SCROLLER (THEY STAY ON THIS SCREEN)'],
  ['S', 'NEW RANDOM SEED'],
  ['M', 'MENU: TYPE YOUR OWN SEED AND MORE'],
  ['A', 'THE ABOUT PART'],
  ['P', 'PAUSE'],
  ['D', 'DISPLAY: AUTO, OR FORCE ONE SCREEN ON EVERYTHING - B/W, MONO, C64, VHS, EGA, SNES, GAME BOY...'],
  ['C', 'SOUND BOARD: AUTO (EACH SCENE ITS OWN), OR FORCE ONE - HI-FI, PAULA, OPL3 FM, AWE32'],
  ['V', 'SOUND ON / OFF (THE PICTURE KEEPS THE BEAT)'],
  ['F', 'FULLSCREEN'],
  ['I', 'SHOW / HIDE THE INFO PANEL'],
  ['H', 'SHOW / HIDE THIS SCREEN'],
  ['', 'A MINUTE WITHOUT INPUT: AUTOPLAY AS A SCREENSAVER - ANY KEY BRINGS YOU BACK'],
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
  if (bornOpen()) { bornKey(e); return; }
  if (greetOpen()) { greetKey(e); return; }
  const k = e.key.toLowerCase();
  const handled = () => e.preventDefault();

  // keys that work everywhere, the About part included
  if (k === 'h') { handled(); toggleHelp(); return; }
  if (k === 'escape' && help.classList.contains('open')) { help.classList.remove('open'); return; }
  if (k === 'p') { handled(); togglePause(); return; }
  if (k === 'v') { handled(); setSound(!cfg.sound); return; }
  if (k === 'd') { handled(); stepDisplay(1); return; }
  if (k === 'c') { handled(); stepBoard(1); return; }
  if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
    return;
  }
  if (!demo.inProgramme && (k === 'a' || (k === 'escape' && demo.inAbout))) { handled(); toggleAbout(); return; }
  if (!demo.inAbout) {
    if (k === 't' || (k === 'escape' && demo.inJourney)) { handled(); toggleProgramme('journey'); return; }
    if (k === 'o' || (k === 'escape' && demo.inAutoplay)) { handled(); toggleProgramme('autoplay'); return; }
    if (k === 'b') {
      handled();
      // born in: B asks for the year; in it, B goes back to the demo
      if (demo.inAutoplay && demo.programme.bornIn !== null) toggleProgramme('autoplay');
      else openBorn();
      return;
    }
  }
  if (demo.inProgramme && (k === ' ' || k === 'arrowright' || k === 'arrowleft')) {
    handled();
    skipPart(k === 'arrowleft' ? -1 : 1);
    return;
  }
  if (demo.inAbout || demo.inProgramme) {
    const back = demo.inAbout ? 'A' : backKey(demo.programme.kind);
    if (k.length === 1 || k.startsWith('arrow')) { handled(); toast(`PRESS ${back} TO GO BACK`); }
    return;
  }

  if (k === 'g') {
    handled();               // or the "g" lands in the names field
    openGreet();
  } else if (k === 'm') {
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
