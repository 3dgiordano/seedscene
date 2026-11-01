// AudioWorklet host for the synth. Worklet scripts are module scripts, so the
// very same music.js the offline renderer uses runs here unchanged.

import { composeScore, Synth } from '../src/core/music.js';
import { composeJourney, composeAutoplay, ProgrammeSynth } from '../src/core/journey.js';

class SeedsceneProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.seed = o.seed;
    this.duration = o.duration;
    this.music = o.music || 'auto';
    this.loop = o.loop !== false;
    // a programme (THE JOURNEY, AUTOPLAY) plays its parts in turn, starting
    // from any of them; a demo plays one score
    this.kind = o.programme || null;
    this.startPart = o.startPart || 0;
    this.score = this.kind === 'journey' ? composeJourney(this.seed, Math.max(this.duration, 96))
      : this.kind === 'autoplay' ? composeAutoplay(this.seed, undefined, Number.isInteger(o.bornIn) ? o.bornIn : null)
        : composeScore(this.seed, this.duration, this.music, o.chip || null);
    this.synth = this.makeSynth();
    this.total = this.score.totalSamples;
    this.tick = 0;
    this.ended = false;
    this.stopped = false;
    // Live mode retires this synth when the seed changes.
    this.port.onmessage = (e) => { if (e.data && e.data.type === 'stop') this.stopped = true; };
    this.port.postMessage({ type: 'ready', meta: this.score.meta });
  }

  makeSynth(startPart = this.startPart) {
    return this.kind ? new ProgrammeSynth(this.score, startPart) : new Synth(this.score, this.seed);
  }

  process(_inputs, outputs) {
    if (this.stopped) return false;   // let the node be collected
    const out = outputs[0];
    const L = out[0];
    const R = out[1] || out[0];
    const n = L.length;

    if (this.synth.pos >= this.total) {
      if (this.loop) {
        this.synth = this.makeSynth(0);     // a programme loops from its first part
        this.port.postMessage({ type: 'loop' });
      } else if (!this.ended) {
        this.ended = true;
        this.port.postMessage({ type: 'end' });
        return false;
      }
    }

    this.synth.render(L, R, 0, n);

    // Hand the exact sample position back so the visuals can lock to it.
    if ((this.tick++ & 3) === 0) {
      this.port.postMessage({ type: 'pos', pos: this.synth.pos });
    }
    return true;
  }
}

registerProcessor('seedscene-synth', SeedsceneProcessor);
