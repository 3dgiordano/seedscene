// Visual renderer: style shader -> offscreen target -> CRT post pass -> canvas.
// The text overlay (title plate and sine scroller) is drawn on a 2D canvas and
// uploaded as a texture, which is how a demo would have blitted its font.

import { Rng } from './rng.js';
import { program, quad, createTarget, startProgram, programDone, finishProgram } from './gl.js';
import { styleSource, POST, STYLE_FX } from '../styles/index.js';
import { SIMS } from './sims.js';
import { ABOUT_PAGES, ABOUT_STORY, ABOUT_GREETS } from '../brand.js';
import { ERAS, eraUniforms, eraResolution } from './eras.js';

/** Seed -> an Inigo Quilez cosine palette that is pleasant rather than muddy. */
export function makePalette(seed, style) {
  const r = new Rng(seed, 'palette:' + style);
  const base = r.float(0.35, 0.55);
  const a = [base, base, base].map((v) => v + r.float(-0.08, 0.08));
  const amp = r.float(0.3, 0.48);
  const b = [amp, amp, amp].map((v) => v + r.float(-0.07, 0.07));
  // Frequencies kept near 1 so the ramp stays readable instead of strobing.
  const cf = r.pick([
    [1.0, 1.0, 1.0], [1.0, 1.0, 0.5], [1.0, 0.7, 0.4], [2.0, 1.0, 0.0], [1.0, 1.0, 2.0],
  ]);
  const d = [r.float(0, 1), r.float(0, 1), r.float(0, 1)];
  // Push the three phases apart so no channel collapses onto another.
  d[1] = (d[0] + r.float(0.12, 0.42)) % 1;
  d[2] = (d[1] + r.float(0.12, 0.42)) % 1;
  return { a, b, c: cf, d };
}

const SCROLL_WORDS = [
  'WELCOME TO ANOTHER LITTLE SLICE OF REALTIME',
  'EVERYTHING YOU SEE AND HEAR CAME OUT OF ONE SEED',
  'NO SAMPLES - NO VIDEO - JUST MATHS AND A BROWSER',
  'GREETINGS TO EVERYONE STILL WATCHING PIXELS MOVE',
  'THE SAME SEED WILL ALWAYS SOUND AND LOOK EXACTLY LIKE THIS',
  'GREETINGS TO EVERYONE WHO EVER TYPED LOAD AND WAITED',
  'TYPE YOUR NAME AS THE SEED AND THIS DEMO BECOMES YOURS',
  'KEEP THE SCENE ALIVE',
];

// Only in live mode: an mp4 should not tell its viewer to press keys.
const KEY_WORDS = [
  'PRESS H TO SEE EVERY KEY',
  'SPACE JUMPS TO THE NEXT SCENE - THE ARROWS STEER - UP AND DOWN CHANGE THE MUSIC',
  'PRESS E TO TRAVEL TO ANOTHER ERA - OR T FOR THE JOURNEY FROM 1982 TO NOW',
  'PRESS A FOR THE ABOUT PART - M FOR THE MENU',
];

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{seed:string, style:string, width:number, height:number, meta:object}} opts
   */
  constructor(gl, canvas, opts) {
    this.gl = gl;
    this.canvas = canvas;
    this.opts = opts;
    this.width = opts.width;
    this.height = opts.height;
    this.showOverlay = opts.overlay !== false;
    this.fade = 0;

    this.deriveLook();

    this.vao = quad(gl);
    this.programs = new Map();             // compiled once, reused on every switch
    this.started = new Map();              // handed to the driver, compiling in the background
    this.warmQueue = [];                   // scenes to compile in the background, in turn
    this.parallel = gl.getExtension('KHR_parallel_shader_compile');
    // the first scene too: started now, waited for only when its first frame is drawn
    if (this.parallel) this.started.set(opts.style, startProgram(gl, styleSource(opts.style)));
    this.style = this.parallel ? null : this.programFor(opts.style);
    this.post = program(gl, POST);

    // one texture, two ways to read it: hard pixels for the picture, filtered
    // for the glow
    this.nearest = gl.createSampler();
    this.linear = gl.createSampler();
    for (const [smp, flt] of [[this.nearest, gl.NEAREST], [this.linear, gl.LINEAR]]) {
      gl.samplerParameteri(smp, gl.TEXTURE_MIN_FILTER, flt);
      gl.samplerParameteri(smp, gl.TEXTURE_MAG_FILTER, flt);
      gl.samplerParameteri(smp, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.samplerParameteri(smp, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    this.era = opts.era || 'amiga';
    this.buildSceneTarget();

    // text overlay canvas + texture
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = this.width;
    this.textCanvas.height = this.height;
    this.tctx = this.textCanvas.getContext('2d', { willReadFrequently: false });
    this.textTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.width, this.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.scrollText = this.buildScrollText();
  }

  /** Palette, shader seed vector and scroller text all hang off seed+style. */
  deriveLook() {
    const { seed, style } = this.opts;
    this.palette = makePalette(seed, style);
    const r = new Rng(seed, 'visual:' + style);
    this.seedVec = [r.float(), r.float(), r.float(), r.float()];
    this.scrollText = this.buildScrollText();
    // the game behind a scene, if it has one, starts over with every new seed
    const Sim = SIMS[style];
    // (games that play on the music's grid read its bars and accents from the score's meta;
    // a scene that moves with the notes reads the music's feature tracks)
    this.sim = Sim ? new Sim(seed, (this.opts.meta && this.opts.meta.spb) || 0.5, this.opts.meta, this.opts.features, this.opts.greets || []) : null;
  }

  /**
   * Swap the style shader in place. A canvas only ever hands out one WebGL
   * context, so the renderer has to be reused rather than rebuilt.
   */
  setStyle(name) {
    this.style = this.programFor(name);
    this.opts.style = name;
    // when the scene came on, on the score's clock: a scene that opens with an
    // entrance starts it there (the caller sets it after a cut; 0 otherwise)
    this.sceneStart = 0;
    this.deriveLook();
  }

  /** A scene's compiled program, compiled the first time it is asked for. */
  programFor(name) {
    if (!this.programs.has(name) && this.started.has(name)) {
      // compiling in the background already: only the rest of it is waited for
      this.programs.set(name, finishProgram(this.gl, this.started.get(name)));
      this.started.delete(name);
    }
    if (!this.programs.has(name)) this.programs.set(name, program(this.gl, styleSource(name)));
    return this.programs.get(name);
  }
  /**
   * Compile scenes in the background before they are needed, so that showing one
   * for the first time does not stop the picture while the driver works on it
   * (the heaviest takes seconds). Two at a time, in the order given; only where
   * the driver can say when one is done - elsewhere scenes compile when first shown.
   */
  /** A promise kept when a scene's program is ready to draw with (at once where the driver cannot tell). */
  whenReady(name = this.opts.style) {
    return new Promise((resolve) => {
      const check = () => {
        const st = this.started.get(name);
        if (!st || !this.parallel || programDone(this.gl, st, this.parallel)) resolve();
        else setTimeout(check, 30);
      };
      check();
    });
  }

  warm(names) {
    if (!this.parallel) return;
    for (const n of names) if (!this.programs.has(n) && !this.started.has(n) && !this.warmQueue.includes(n)) this.warmQueue.push(n);
    if (this.warming) return;
    this.warming = true;
    const step = () => {
      // collect what the driver has finished, then start the next while two are not running
      for (const [n, st] of this.started) {
        if (!programDone(this.gl, st, this.parallel)) continue;
        try { this.programs.set(n, finishProgram(this.gl, st)); } catch (e) { console.error(e); }
        this.started.delete(n);
      }
      // nothing else starts while the scene on screen is still compiling: it would only slow it
      const first = this.started.has(this.opts.style) && !this.programs.has(this.opts.style);
      while (!first && this.started.size < 2 && this.warmQueue.length) {
        const n = this.warmQueue.shift();
        if (!this.programs.has(n)) this.started.set(n, startProgram(this.gl, styleSource(n)));
      }
      if (this.started.size || this.warmQueue.length) setTimeout(step, 16);   // a timer: it keeps on in a background tab
      else this.warming = false;
    };
    step();
  }


  /** The scene is drawn at the era's own resolution. */
  buildSceneTarget() {
    const gl = this.gl;
    const v = eraResolution(this.era, this.width, this.height);
    if (this.scene && this.scene.w === v.w && this.scene.h === v.h) return;
    if (this.scene) { gl.deleteFramebuffer(this.scene.fbo); gl.deleteTexture(this.scene.tex); }
    this.scene = createTarget(gl, v.w, v.h);
  }

  /** Look at everything through another era's screen. */
  setEra(name) {
    this.era = name;
    this.opts.era = name;
    this.buildSceneTarget();
  }

  /** Switch the About part on or off: its own shader and its own overlay. */
  setAbout(on) {
    if (on === !!this.about) return;
    if (on) {
      this.savedStyle = this.opts.style;
      this.setStyle('about');
    } else {
      this.setStyle(this.savedStyle);
    }
    this.about = on;
  }

  /** The viewer's greetings: in the scroller, the About part's greetings and the cracktro's pages. */
  setGreets(names) {
    this.opts.greets = names;
    this.deriveLook();
  }

  /** Point the renderer at a different seed (and its freshly composed score and features). */
  setSeed(seed, meta, features) {
    this.opts.seed = seed;
    this.opts.meta = meta;
    this.opts.features = features;
    this.deriveLook();
  }

  buildScrollText() {
    const { seed, style, meta } = this.opts;
    const r = new Rng(seed, 'scroller');
    const head = `SEEDSCENE PRESENTS ...   ${meta.title}   ***   SCENE: ${style.toUpperCase()}   SEED: ${String(seed).toUpperCase()}   `
      + `${meta.musicLabel.toUpperCase()}   ${meta.bpm} BPM   ${meta.rootName} ${meta.scaleLabel.toUpperCase()}   ***   `;
    const words = r.shuffle(SCROLL_WORDS);
    // the viewer's own greetings first, as a demo greeted its friends; then, live, the keys
    const greets = this.opts.greets && this.opts.greets.length ? [`GREETINGS TO ${this.opts.greets.join(' - ')}`] : [];
    const body = [...greets, ...(this.opts.live ? KEY_WORDS : []), ...words].join('   ...   ');
    return (head + body + '   ...   ').replace(/\s+/g, ' ');
  }

  resize(width, height) {
    if (width === this.width && height === this.height) return;
    const gl = this.gl;
    this.width = width; this.height = height;
    this.buildSceneTarget();
    this.textCanvas.width = width;
    this.textCanvas.height = height;
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  /**
   * The About part's text layer: a bouncing rainbow logo, a fast greetings
   * scroller running backwards along the top, pages that slam in on the bar,
   * and a big mirrored sine scroller telling the story along the bottom.
   */
  drawAbout(t, f) {
    const ctx = this.tctx;
    const W = this.width, H = this.height;
    const s = H / 360;
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round';

    // ---- greetings: small and fast, running left to right ----
    ctx.save();
    ctx.font = `bold ${Math.round(11 * s)}px Consolas, "Courier New", monospace`;
    ctx.textBaseline = 'middle';
    const greets = this.opts.greets && this.opts.greets.length
      ? ABOUT_GREETS.replace('GREETINGS TO  -  ', `GREETINGS TO  -  ${this.opts.greets.join('  -  ')}  -  `) : ABOUT_GREETS;
    const gw = ctx.measureText(greets + '     ').width;
    const gx = ((t * 230 * s) % gw) - gw;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 6 * s, W, 16 * s);
    ctx.fillStyle = `hsl(${(t * 200) % 360},90%,75%)`;
    for (let x = gx; x < W; x += gw) ctx.fillText(greets, x, 14 * s);
    ctx.restore();

    // ---- the logo, every letter on its own sine, scale-punched by the kick
    ctx.save();
    const word = 'SEEDSCENE';
    const ls = Math.round(50 * s);
    ctx.font = `900 ${ls}px Impact, "Arial Black", sans-serif`;
    ctx.textBaseline = 'middle';
    const widths = [...word].map((c) => ctx.measureText(c).width + 3 * s);
    const total = widths.reduce((a, b) => a + b, 0);
    const punch = 1 + 0.12 * f.kick;
    ctx.translate(W / 2, 72 * s);
    ctx.scale(punch, punch);
    let x = -total / 2;
    for (let i = 0; i < word.length; i++) {
      const y = Math.sin(t * 5 + i * 0.7) * 13 * s * (0.6 + f.energy);
      const hue = (t * 140 + i * 34) % 360;
      ctx.lineWidth = 6 * s;
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.strokeText(word[i], x, y);
      const g = ctx.createLinearGradient(0, y - ls / 2, 0, y + ls / 2);
      g.addColorStop(0, `hsl(${hue},100%,85%)`);
      g.addColorStop(0.5, `hsl(${(hue + 40) % 360},95%,58%)`);
      g.addColorStop(1, `hsl(${(hue + 80) % 360},90%,38%)`);
      ctx.fillStyle = g;
      ctx.fillText(word[i], x, y);
      x += widths[i];
    }
    ctx.restore();

    // ---- pages: one every two bars, slamming in with a flash
    const pageDur = (this.opts.meta.barSec || 2) * 2;
    const page = ABOUT_PAGES[Math.floor(t / pageDur) % ABOUT_PAGES.length];
    const u = (t % pageDur) / pageDur;
    const zoom = u < 0.1 ? 2.6 - 16 * u : 1 + 0.03 * Math.sin(t * 9) + 0.05 * f.kick;
    const alpha = u < 0.1 ? u * 10 : u > 0.92 ? (1 - u) * 12 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(W / 2 + Math.sin(t * 23) * 2 * s * f.snare, H * 0.5);
    ctx.scale(zoom, zoom);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pageFont = (px) => `bold ${Math.round(px * s)}px Consolas, "Courier New", monospace`;
    for (const [i, line] of page.entries()) {
      const px = i === 0 ? 26 : 16;
      ctx.font = pageFont(line.length > 26 ? px * 0.8 : px);
      const y = (i - (page.length - 1) / 2) * 30 * s;
      ctx.lineWidth = 5 * s;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(line, 0, y);
      ctx.fillStyle = i === 0 ? '#ffffff' : `hsl(${(t * 90 + 180) % 360},85%,72%)`;
      ctx.fillText(line, 0, y);
    }
    ctx.restore();
    if (u < 0.06) {                                   // the slam
      ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - u / 0.06)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ---- the story: big sine scroller with a water reflection under it
    ctx.save();
    const fs = Math.round(22 * s);
    ctx.font = `bold ${fs}px Consolas, "Courier New", monospace`;
    ctx.textBaseline = 'middle';
    const chW = ctx.measureText('M').width;
    const totalW = ABOUT_STORY.length * chW;
    const x0 = W - ((t * 170 * s) % (totalW + W));
    const baseY = H - 52 * s;
    const amp = (10 + 10 * f.energy) * s;
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    for (let i = 0; i < ABOUT_STORY.length; i++) {
      const cx = x0 + i * chW;
      if (cx < -chW || cx > W + chW) continue;
      const ch = ABOUT_STORY[i];
      if (ch === ' ') continue;
      const ph = cx * 0.02 - t * 4.2;
      const cy = baseY + Math.sin(ph) * amp;
      const col = `hsl(${(i * 9 + t * 160) % 360},95%,${68 + 14 * Math.sin(ph)}%)`;
      ctx.globalAlpha = 1;
      ctx.strokeText(ch, cx, cy);
      ctx.fillStyle = col;
      ctx.fillText(ch, cx, cy);
      // reflection: flipped, squashed, faint
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.translate(cx, baseY + 30 * s);
      ctx.scale(1, -0.55);
      ctx.fillText(ch, 0, (cy - baseY) - 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * THE JOURNEY's era card: the year, the machine, and the line that machine
   * would have greeted you with, typed out as each part begins.
   */
  drawCard(card) {
    if (card.kind === 'track') { this.drawTrackCard(card); return; }
    const t = card.t;
    if (t > 3.2) return;
    const ctx = this.tctx;
    const W = this.width, H = this.height;
    const s = H / 360;
    const era = ERAS[card.era];
    const alpha = Math.min(1, t / 0.25) * (t > 2.6 ? Math.max(0, 1 - (t - 2.6) / 0.6) : 1);
    const mono = 'Consolas, "Courier New", monospace';
    const face = card.era === 'y2k' || card.era === 'modern' ? '"Segoe UI", Helvetica, Arial, sans-serif' : mono;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, H * 0.3, W, H * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, H * 0.3, W, Math.max(1, s));
    ctx.fillRect(0, H * 0.7, W, Math.max(1, s));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(54 * s)}px ${face}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(era.year), W / 2, H * 0.42);
    ctx.font = `bold ${Math.round(15 * s)}px ${face}`;
    ctx.letterSpacing = `${Math.round(5 * s)}px`;
    ctx.fillStyle = '#cfe8ff';
    ctx.fillText(era.label.toUpperCase(), W / 2, H * 0.53);
    ctx.letterSpacing = '0px';

    // the machine's greeting, typed
    ctx.font = `${Math.round(12 * s)}px ${mono}`;
    const [l1, l2] = card.lines;   // the machine's greeting
    const typed = l1.slice(0, Math.floor(Math.max(0, t - 0.3) * 28));
    const cursor = Math.floor(t * 3) % 2 === 0 && typed.length < l1.length ? '_' : '';
    ctx.fillStyle = '#9fe0a0';
    ctx.fillText(typed + cursor, W / 2, H * 0.61);
    if (t > 0.3 + l1.length / 28 + 0.2) {
      ctx.globalAlpha = alpha * 0.7;
      ctx.font = `${Math.round(10 * s)}px ${mono}`;
      ctx.fillText(l2, W / 2, H * 0.66);
    }
    ctx.restore();
  }

  /**
   * AUTOPLAY's "now playing" card: a lower third that slides in as a new
   * track starts in the same era — the era card announces a new era instead.
   */
  drawTrackCard(card) {
    const t = card.t;
    if (t < 0.2 || t > 4.4) return;
    const ctx = this.tctx;
    const W = this.width, H = this.height;
    const s = H / 360;
    const era = ERAS[card.era];
    const slide = t < 0.6 ? 1 - (t - 0.2) / 0.4 : t > 4.0 ? (t - 4.0) / 0.4 : 0;
    const x = 18 * s - slide * slide * 320 * s;
    const y = H * 0.62;
    const mono = 'Consolas, "Courier New", monospace';
    ctx.save();
    ctx.font = `bold ${Math.round(17 * s)}px ${mono}`;
    const w = Math.max(ctx.measureText(card.title).width, 200 * s) + 28 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 10 * s, y - 16 * s, w, 56 * s);
    ctx.fillStyle = `hsl(${(card.index * 47) % 360},90%,62%)`;
    ctx.fillRect(x - 10 * s, y - 16 * s, Math.max(2, 3 * s), 56 * s);
    ctx.textBaseline = 'top';
    ctx.font = `${Math.round(9 * s)}px ${mono}`;
    ctx.fillText('NOW PLAYING', x, y - 11 * s);
    ctx.font = `bold ${Math.round(17 * s)}px ${mono}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(card.title, x, y);
    ctx.font = `${Math.round(10 * s)}px ${mono}`;
    ctx.fillStyle = '#bfe4ff';
    ctx.fillText(`${card.music.toUpperCase()}  ·  ${card.style.toUpperCase()}  ·  ${era.year} ${era.label.toUpperCase()}`, x, y + 22 * s);
    ctx.restore();
  }

  /** Draw the title plate and the sine scroller for time t. */
  drawOverlay(t, f) {
    const ctx = this.tctx;
    const W = this.width, H = this.height;
    ctx.clearRect(0, 0, W, H);
    if (!this.showOverlay) return;

    const s = H / 360;                      // everything scales off a 360p design
    const { meta, seed, style } = this.opts;

    // --- title plate, sliding in over the first bars
    const intro = Math.min(1, Math.max(0, (t - 0.4) / 1.6));
    const titleAlpha = intro * (t > meta.duration - 1.5
      ? Math.max(0, (meta.duration - t) / 1.5) : 1);
    if (titleAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = titleAlpha;
      ctx.textBaseline = 'top';
      const px = Math.round(22 * s);
      const sub = Math.round(10 * s);
      const x = Math.round(18 * s) + (1 - intro) * 40 * s;
      const y = Math.round(16 * s);

      ctx.font = `bold ${px}px "Courier New", monospace`;
      ctx.letterSpacing = `${Math.round(4 * s)}px`;
      const l1 = meta.title;
      const l2 = `${ERAS[this.era].label.toUpperCase()}  //  ${style.toUpperCase()}  //  SEED ${String(seed).toUpperCase()}`;
      const l3 = `${meta.bpm} BPM  ${meta.rootName} ${meta.scaleLabel.toUpperCase()}  BAR ${f.barIndex + 1}/${meta.bars}`;
      const wTitle = ctx.measureText(l1).width;
      ctx.font = `${sub}px "Courier New", monospace`;
      ctx.letterSpacing = `${Math.round(2 * s)}px`;
      const wSub = Math.max(ctx.measureText(l2).width, ctx.measureText(l3).width);
      const boxW = Math.max(wTitle, wSub) + 18 * s;
      const boxH = px * 1.3 + sub * 2.9 + 12 * s;

      // a dark plate, so the lettering survives a bright frame underneath
      ctx.fillStyle = 'rgba(4,7,14,0.46)';
      ctx.fillRect(x - 10 * s, y - 7 * s, boxW, boxH);
      ctx.fillStyle = 'rgba(150,210,255,0.75)';
      ctx.fillRect(x - 10 * s, y - 7 * s, Math.max(1, 2 * s), boxH);

      ctx.font = `bold ${px}px "Courier New", monospace`;
      ctx.letterSpacing = `${Math.round(4 * s)}px`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, 3 * s);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(l1, x, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(l1, x, y);

      ctx.font = `${sub}px "Courier New", monospace`;
      ctx.letterSpacing = `${Math.round(2 * s)}px`;
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.globalAlpha = titleAlpha * 0.95;
      for (const [i, line] of [l2, l3].entries()) {
        const ly = y + px * 1.3 + i * sub * 1.45;
        ctx.strokeText(line, x, ly);
        ctx.fillStyle = i === 0 ? '#bfe4ff' : '#8fc4e8';
        ctx.fillText(line, x, ly);
      }
      ctx.restore();
    }

    // --- sine scroller along the bottom
    ctx.save();
    const fs = Math.round(16 * s);
    const baseY = H - Math.round(30 * s);
    const amp = (6 + 6 * f.energy) * s;

    // a dim band keeps the scroller legible over a bright style
    const band = ctx.createLinearGradient(0, baseY - fs - amp, 0, baseY + fs + amp);
    band.addColorStop(0, 'rgba(4,7,14,0)');
    band.addColorStop(0.5, 'rgba(4,7,14,0.42)');
    band.addColorStop(1, 'rgba(4,7,14,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, baseY - fs - amp, W, (fs + amp) * 2);

    ctx.font = `bold ${fs}px "Courier New", monospace`;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, 3 * s);
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    const chW = ctx.measureText('M').width;
    const text = this.scrollText;
    const total = text.length * chW;
    const speed = 95 * s;
    const x0 = W - ((t * speed) % (total + W));
    for (let i = 0; i < text.length; i++) {
      const cx = x0 + i * chW;
      if (cx < -chW || cx > W + chW) continue;
      const ch = text[i];
      if (ch === ' ') continue;
      const ph = cx * 0.018 - t * 3.4;
      const cy = baseY + Math.sin(ph) * amp;
      ctx.strokeText(ch, cx, cy);
      ctx.fillStyle = `hsl(${(i * 7 + t * 90) % 360},88%,${74 + 16 * Math.sin(ph)}%)`;
      ctx.fillText(ch, cx, cy);
    }
    ctx.restore();

    // --- small time code, bottom right
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.font = `${Math.round(10 * s)}px "Courier New", monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#9fd8ff';
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    const cs = String(Math.floor((t * 100) % 100)).padStart(2, '0');
    ctx.fillText(`${mm}:${ss}.${cs}`, W - 12 * s, H - 10 * s);
    ctx.restore();
  }

  setStyleUniforms(u, t, f) {
    const gl = this.gl;
    const set1 = (name, v) => { if (u[name]) gl.uniform1f(u[name], v); };
    if (u.uRes) gl.uniform2f(u.uRes, this.scene.w, this.scene.h);
    if (u.uSeed) gl.uniform4fv(u.uSeed, this.seedVec);
    set1('uPixAspect', this.scene.w < this.width ? (this.width / this.height) / (this.scene.w / this.scene.h) : 1);
    set1('uSpb', (this.opts.meta && this.opts.meta.spb) || 0.5);
    if (u.uPalA) gl.uniform3fv(u.uPalA, this.palette.a);
    if (u.uPalB) gl.uniform3fv(u.uPalB, this.palette.b);
    if (u.uPalC) gl.uniform3fv(u.uPalC, this.palette.c);
    if (u.uPalD) gl.uniform3fv(u.uPalD, this.palette.d);
    set1('uTime', t);
    set1('uKick', f.kick); set1('uSnare', f.snare); set1('uHat', f.hat);
    set1('uBass', f.bass); set1('uPad', f.pad); set1('uArp', f.arp);
    set1('uLead', f.lead); set1('uStab', f.stab);
    set1('uEnergy', f.energy); set1('uBeat', f.beat);
    set1('uBar', f.bar); set1('uBarIndex', f.barIndex);
    if (this.sim) {
      const SET = { '1f': 'uniform1f', '4f': 'uniform4f', '1fv': 'uniform1fv', '2fv': 'uniform2fv', '4fv': 'uniform4fv' };
      for (const [name, { v, kind }] of Object.entries(this.sim.uniforms(t, this.sceneStart || 0))) {
        if (!u[name]) continue;
        if (kind === '1f') gl.uniform1f(u[name], v);
        else if (kind === '4f') gl.uniform4f(u[name], v[0], v[1], v[2], v[3]);
        else gl[SET[kind]](u[name], v);
      }
    }
  }

  /** Render one frame at time t with feature set f. */
  draw(t, f) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);

    // 1. style pass into the offscreen target
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    gl.viewport(0, 0, this.scene.w, this.scene.h);
    if (!this.style) this.style = this.programFor(this.opts.style);
    gl.useProgram(this.style.p);
    this.setStyleUniforms(this.style.uniforms, t, f);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. overlay -> texture
    if (this.about) this.drawAbout(t, f);
    else this.drawOverlay(t, f);
    if (this.card) this.drawCard(this.card);
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.textCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // 3. post pass to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.post.p);
    const u = this.post.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.scene.tex);
    gl.bindSampler(0, this.nearest);
    if (u.uScene) gl.uniform1i(u.uScene, 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.scene.tex);
    gl.bindSampler(2, this.linear);
    if (u.uSceneSoft) gl.uniform1i(u.uSceneSoft, 2);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textTex);
    if (u.uText) gl.uniform1i(u.uText, 1);
    const p1 = (name, v) => { if (u[name]) gl.uniform1f(u[name], v); };
    if (u.uRes) gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    if (u.uVRes) gl.uniform2f(u.uVRes, this.scene.w, this.scene.h);
    p1('uTime', t); p1('uKick', f.kick); p1('uSnare', f.snare); p1('uEnergy', f.energy);
    const e = eraUniforms(this.era);
    if (u.uPalMode) gl.uniform1i(u.uPalMode, e.palMode);
    if (u.uDisplay) gl.uniform1i(u.uDisplay, e.display);
    p1('uLevels', e.levels); p1('uDither', e.dither);
    // a scene drawn in fine lines can ask for less of the era's glow and colour fringes
    const fx = STYLE_FX[this.opts.style] || {};
    const glow = fx.glow === undefined ? 1 : fx.glow;
    p1('uBloom', e.bloom * glow); p1('uScan', e.scan); p1('uBarrel', e.barrel);
    p1('uAberr', e.aberr * glow); p1('uGrain', e.grain); p1('uVignette', e.vignette);
    p1('uFade', this.fade);
    // scenes that ask for it get a zoom blur on the kick
    p1('uImpact', fx.impact || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindSampler(0, null);
    gl.bindSampler(2, null);
    gl.bindVertexArray(null);
  }
}
