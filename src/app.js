// Ties the music engine and the renderer together.
//
// One Demo instance serves both paths: live playback drives it from the audio
// clock, the offline capture drives it from a frame index. Both read the same
// score and the same feature track, so the picture at t is the same either way.
//
// A demo is a seed plus three choices — scene, era, music — any of which may
// be 'auto'. resolveChoices() turns them into concrete names the same way
// everywhere, so the picture and the sound always agree.

import { composeScore, Features } from './core/music.js';
import { createContext } from './core/gl.js';
import { Renderer } from './core/visual.js';
import { STYLE_NAMES } from './styles/index.js';
import { resolveChoices } from './core/choose.js';
import { composeJourney, composeAutoplay, partAt, JOURNEY_PASSES } from './core/journey.js';
import { boardFor, chipOfBoard } from './core/boards.js';

export { STYLE_NAMES };

export class Demo {
  /**
   * @param {{canvas:HTMLCanvasElement, seed:string, style?:string, era?:string,
   *          music?:string, duration:number, width:number, height:number,
   *          overlay?:boolean, live?:boolean, journey?:boolean, autoplay?:boolean, display?:string}} opts
   */
  constructor(opts) {
    this.opts = opts;
    this.seed = opts.seed;
    this.duration = opts.duration;
    this.req = { style: opts.style || 'auto', era: opts.era || 'auto', music: opts.music || 'auto', board: opts.board || 'auto' };
    this.resolve();
    this.compose();

    const canvas = opts.canvas;
    canvas.width = opts.width;
    canvas.height = opts.height;
    this.gl = createContext(canvas);
    this.renderer = new Renderer(this.gl, canvas, {
      seed: this.seed, style: this.style, era: this.era,
      width: opts.width, height: opts.height,
      meta: this.meta, features: this.features, overlay: opts.overlay, live: !!opts.live,
      greets: opts.greets || [],
      display: opts.display || 'auto',   // DISPLAY: auto, or one display forced on everything
    });
    if (opts.journey) this.setProgramme('journey');
    else if (opts.autoplay) this.setProgramme('autoplay', { bornIn: opts.bornIn });
  }

  /** Turn the requested choices (maybe 'auto') into concrete ones. */
  resolve() {
    const c = resolveChoices({ seed: this.seed, ...this.req });
    this.style = c.style;
    this.era = c.era;
    this.music = c.music;
  }

  compose() {
    this.board = boardFor(this.style, this.era, this.seed, this.req.board);
    this.chip = chipOfBoard(this.board);
    this.score = composeScore(this.seed, this.duration, this.music, this.chip);
    this.features = new Features(this.score);
    this.meta = this.score.meta;
  }

  /**
   * Apply a change of requested choices. Returns whether the music changed,
   * so the live page knows to restart the synth.
   */
  update(change) {
    const before = { music: this.music, seed: this.seed, duration: this.duration, style: this.style, era: this.era };
    Object.assign(this.req, change.req || {});
    if (change.seed !== undefined) this.seed = change.seed;
    if (change.duration !== undefined) this.duration = change.duration;
    this.resolve();
    const recompose = this.music !== before.music || this.seed !== before.seed || this.duration !== before.duration
      || chipOfBoard(boardFor(this.style, this.era, this.seed, this.req.board)) !== this.chip;   // another board
    if (recompose) this.compose();
    if (this.style !== before.style) this.renderer.setStyle(this.style);
    if (this.era !== before.era) this.renderer.setEra(this.era);
    if (recompose || this.style !== before.style) this.renderer.setSeed(this.seed, this.meta, this.features);
    return { musicChanged: recompose };
  }

  setStyle(name) { return this.update({ req: { style: name } }); }
  /** A scene in a given era of its own, both at once (the live keys travel the catalogue era by era). */
  setSceneInEra(name, era) { return this.update({ req: { style: name, era } }); }
  setEra(name) { return this.update({ req: { era: name } }); }
  setMusic(name) { return this.update({ req: { music: name } }); }
  /**
   * SOUND BOARD: 'auto' (each scene its own, or its era's) or one board forced on everything. A programme
   * playing is made again with it, so the page and the audio worklet agree on every track's board.
   */
  setBoard(name) {
    if (this.programme) {
      const { kind, bornIn } = this.programme;
      this.req.board = name;
      this.programme = null;
      this.setProgramme(kind, { bornIn });
      return { musicChanged: true };
    }
    return this.update({ req: { board: name } });
  }
  /** DISPLAY: 'auto' (each scene its own look, or its era's) or a display forced on everything. */
  setDisplay(name) { this.renderer.setDisplay(name); return { musicChanged: false }; }
  setSeed(seed) { return this.update({ seed }); }
  setDuration(seconds) { return this.update({ duration: seconds }); }

  resize(w, h) {
    this.opts.canvas.width = w;
    this.opts.canvas.height = h;
    this.renderer.resize(w, h);
  }

  /** The viewer's greetings: up to eight names for the scroller and the cracktro. */
  setGreets(names) { this.renderer.setGreets(names); }

  /** Live mode: show or hide the title plate and the scroller. */
  setOverlay(on) {
    this.opts.overlay = on;
    this.renderer.showOverlay = on;
  }

  /**
   * Live mode: the About part. It brings its own seed and its own music, and
   * hands the viewer's demo back untouched when it ends.
   */
  setAbout(on, aboutSeed = 'SEEDSCENE', aboutMusic = 'hardcore') {
    if (on === !!this.saved) return;
    if (on) {
      this.saved = { seed: this.seed, req: { ...this.req } };
      this.update({ seed: aboutSeed, req: { music: aboutMusic } });
      this.renderer.setAbout(true);
    } else {
      const { seed, req } = this.saved;
      this.saved = null;
      this.renderer.setAbout(false);
      this.update({ seed, req });
    }
  }

  get inAbout() { return !!this.saved; }

  /**
   * Programmes: THE JOURNEY (every era in turn) or AUTOPLAY (an endless mix
   * by era). While one plays, the demo's own choices are kept aside and
   * restored afterwards. null switches back to the demo. AUTOPLAY may be born
   * in a year: { bornIn: 1985 } opens it in the era the viewer was twelve in.
   */
  setProgramme(kind, { bornIn = null } = {}) {
    const born = kind === 'autoplay' && Number.isInteger(bornIn) ? bornIn : null;
    if ((this.programme && this.programme.kind) === kind && (!kind || this.programme.bornIn === born)) return;
    if (kind) {
      this.programme = kind === 'journey'
        ? composeJourney(this.seed, Math.max(this.duration, 96), JOURNEY_PASSES, this.req.board)
        : composeAutoplay(this.seed, undefined, born, this.req.board);
      this.partIndex = -1;
    } else {
      this.programme = null;
      this.renderer.card = null;
      this.renderer.fade = 0;
      this.renderer.setStyle(this.style);
      this.renderer.setEra(this.era);
      this.renderer.setSeed(this.seed, this.meta, this.features);
    }
  }

  get inJourney() { return !!this.programme && this.programme.kind === 'journey'; }
  get inAutoplay() { return !!this.programme && this.programme.kind === 'autoplay'; }
  get inProgramme() { return !!this.programme; }
  /** Kept for the render page written against the first journey. */
  get journey() { return this.programme; }

  /** The programme's part at t, or null outside a programme. */
  partAt(t) {
    return this.programme ? partAt(this.programme, t) : null;
  }

  /** Draw the frame for time t (seconds). */
  drawAt(t) {
    if (!this.programme) {
      this.renderer.draw(t, this.features.at(t));
      return;
    }
    const { part, local, scene, time } = partAt(this.programme, t);
    if (part.index !== this.partIndex) {
      this.partIndex = part.index;
      this.sceneStyle = scene.style;
      // every scene this track will cut to, compiled now, under the fade from black
      for (const sc of part.scenes) this.renderer.programFor(sc.style);
      this.renderer.setStyle(scene.style);
      this.renderer.setEra(part.era);
      this.renderer.setSeed(part.seed, part.meta, part.features);
      this.renderer.sceneStart = part.scoreTimeAt(scene.from);
    } else if (scene.style !== this.sceneStyle) {
      // the music turned: cut to the next scene on the beat
      this.sceneStyle = scene.style;
      this.renderer.setStyle(scene.style);
      this.renderer.sceneStart = part.scoreTimeAt(scene.from);
    }
    // in from black, out to black: each era its own reel
    const fadeIn = Math.max(0, 1 - local / 0.7);
    const fadeOut = Math.max(0, 1 - (part.duration - local) / 0.5);
    this.renderer.fade = Math.min(1, Math.max(fadeIn, fadeOut));
    this.renderer.card = { ...part.card, era: part.era, t: local, index: part.index, title: part.meta.title,
      music: part.meta.musicLabel, style: scene.style };
    // the picture runs on the score's clock, so its beat stays on the music's through the mix
    this.renderer.draw(time, part.features.at(time));
  }
}
