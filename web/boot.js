// The Commodore 64 boot screen that stands in front of live mode.
//
// It is not only decoration: the browser will not play sound until the viewer
// presses something, so the demo needs a "press a key" moment anyway. This
// makes that moment the one a whole generation knows by heart: READY., a
// LOAD, the striped border, and RUN.
//
// While the screen says LOADING, the demo really is loading — shaders compile
// behind it.

import { VERSION } from '../src/brand.js';

// Pepto's measured C64 palette.
const C64 = [
  '#000000', '#ffffff', '#68372b', '#70a4b2', '#6f3d86', '#588d43', '#352879', '#b8c76f',
  '#6f4f25', '#433900', '#9a6759', '#444444', '#6c6c6c', '#9ad284', '#6c5eb5', '#959595',
];
const BLUE = C64[6];
const LIGHT_BLUE = C64[14];

const COLS = 40;
const ROWS = 25;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} o
 * @param {HTMLElement} o.root     full-viewport border element
 * @param {HTMLElement} o.screen   the 40x25 text screen inside it
 * @param {string} o.seed
 * @param {boolean} o.intro        false skips the typing and goes straight to READY.
 * @param {() => void} o.prepare   heavy setup to run while "LOADING"
 * @param {() => Promise<void>} o.onRun  called from inside the viewer's gesture
 */
export function bootSequence({ root, screen, seed, intro, sound = true, prepare, onRun }) {
  const name = String(seed).toUpperCase().replace(/[^A-Z0-9 .\-_]/g, '').slice(0, 16) || 'DEMO';
  const lines = [];
  let cursorOn = true;
  let hint = '';
  let stripes = false;
  let ran = false;
  let prepared = false;

  // ---- layout: square 8x8 cells, 40x25 of them, scaled to the window ------
  const probe = document.createElement('canvas').getContext('2d');
  function layout() {
    const cell = Math.max(6, Math.floor(Math.min(
      (innerWidth * 0.84) / COLS, (innerHeight * 0.80) / ROWS)));
    screen.style.width = `${cell * COLS}px`;
    screen.style.height = `${cell * ROWS}px`;
    screen.style.lineHeight = `${cell}px`;
    // The C64 font fills its 8x8 cell. Size the glyph to the cell, then pad
    // each one out to a square by the width actually measured for this font.
    const size = cell * 1.08;
    screen.style.fontSize = `${size}px`;
    probe.font = `bold ${size}px ${getComputedStyle(screen).fontFamily}`;
    const glyph = probe.measureText('M').width;
    screen.style.letterSpacing = `${Math.max(0, cell - glyph)}px`;
  }
  addEventListener('resize', layout);
  layout();

  // ---- drawing ------------------------------------------------------------
  function draw() {
    const out = lines.slice(-(ROWS - 2));
    const html = out.map((l, i) => {
      const last = i === out.length - 1;
      const text = escape(l);
      return last && cursorOn ? `${text}<span class="cur">&nbsp;</span>` : text;
    });
    while (html.length < ROWS - 1) html.push('');
    html.push(hint ? `<span class="rev">${escape(hint)}</span>` : '');
    screen.innerHTML = html.join('\n');
  }

  function escape(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const blink = setInterval(() => { cursorOn = !cursorOn; draw(); }, 330);

  // the tape-loading border: bands of random C64 colours, redrawn every frame
  function stripeFrame() {
    if (!stripes) { root.style.background = LIGHT_BLUE; return; }
    const stops = [];
    let y = 0;
    while (y < 100) {
      const h = 0.6 + Math.random() * 3.2;
      const c = C64[(Math.random() * 16) | 0];
      stops.push(`${c} ${y.toFixed(2)}%`, `${c} ${(y + h).toFixed(2)}%`);
      y += h;
    }
    root.style.background = `linear-gradient(to bottom, ${stops.join(',')})`;
    requestAnimationFrame(stripeFrame);
  }

  async function type(text, cps = 15) {
    lines.push('');
    for (const ch of text) {
      if (ran) { lines[lines.length - 1] += text.slice(lines[lines.length - 1].length); break; }
      lines[lines.length - 1] += ch;
      cursorOn = true;
      draw();
      await sleep(1000 / cps + (Math.random() * 30));
    }
  }
  const say = (text) => { lines.push(text); draw(); };

  function doPrepare() {
    if (prepared) return;
    prepared = true;
    prepare();
  }

  // ---- the sequence before the viewer does anything ----------------------
  async function intro_() {
    say('');
    say(`    **** SEEDSCENE V${VERSION} ****`);
    say('');
    say(' 64K RAM SYSTEM  38911 BASIC BYTES FREE');
    say('');
    say('READY.');
    // the loading starts at once, so the first scene compiles while the intro types and the viewer reads
    setTimeout(doPrepare, 60);
    if (!intro) { readyForRun(); return; }
    await sleep(900);
    if (ran) return;
    await type(`LOAD "${name}",8,1`);
    if (ran) return;
    say('');
    say(`SEARCHING FOR ${name}`);
    await sleep(700);
    if (ran) return;
    say('LOADING');
    stripes = true;
    requestAnimationFrame(stripeFrame);
    await sleep(60);          // let the stripes show before the main thread is busy
    doPrepare();
    await sleep(1500);
    stripes = false;
    if (ran) return;
    say('READY.');
    readyForRun();
  }

  function readyForRun() {
    hint = ' PRESS ANY KEY OR CLICK TO RUN ';
    draw();
    let on = true;
    const t = setInterval(() => {
      if (ran) { clearInterval(t); return; }
      on = !on;
      hint = on ? ' PRESS ANY KEY OR CLICK TO RUN ' : '';
      draw();
    }, 600);
  }

  // ---- RUN ----------------------------------------------------------------
  async function run(e) {
    if (ran) return;
    if (e && e.type === 'keydown') {
      // modifier keys alone are not a "press"
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      e.preventDefault();
    }
    ran = true;
    removeEventListener('keydown', run);
    root.removeEventListener('click', run);
    hint = '';
    doPrepare();
    // Audio has to start inside the gesture, before anything is awaited.
    const started = onRun();
    if (sound) tapeChirp();

    if (lines[lines.length - 1] !== 'READY.') say('READY.');
    lines.push('RUN');
    draw();
    stripes = true;
    requestAnimationFrame(stripeFrame);
    // the stripes run on as a tape loading until the first scene is ready to show
    await Promise.all([sleep(650), started]);
    stripes = false;

    clearInterval(blink);
    root.classList.add('off');                     // CRT switch-off collapse
    await sleep(420);
    root.style.display = 'none';
  }

  addEventListener('keydown', run);
  root.addEventListener('click', run);
  draw();
  intro_();
}

/** A short burst of datasette noise to go with the RUN stripes. */
function tapeChirp() {
  try {
    const ac = new AudioContext();
    const len = Math.floor(ac.sampleRate * 0.55);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / ac.sampleRate;
      // square tones hopping between the two tape frequencies, plus hiss
      const f = (Math.floor(t * 90) % 3 === 0) ? 1950 : 2840;
      phase += f / ac.sampleRate;
      const sq = (phase % 1) < 0.5 ? 1 : -1;
      const env = Math.min(1, t * 40) * Math.min(1, (0.55 - t) * 12);
      d[i] = (sq * 0.6 + (Math.random() * 2 - 1) * 0.4) * env * 0.07;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start();
    src.onended = () => ac.close();
  } catch { /* sound is a nicety here */ }
}

export const BOOT_COLORS = { BLUE, LIGHT_BLUE };
