// Offline capture page. Puppeteer drives this: it steps frames by index and
// reads each one back, so nothing depends on how fast the machine actually is.

import { Demo } from '../src/app.js';
import { cleanGreets } from '../src/brand.js';

const p = new URLSearchParams(location.search);
const cfg = {
  seed: p.get('seed') || 'demo',
  style: p.get('scene') || p.get('style') || 'auto',     // (style: the scene's old name)
  era: p.get('era') || 'auto',
  journey: p.get('programme') === 'journey' || p.get('journey') === '1',
  autoplay: p.get('programme') === 'autoplay',
  bornIn: /^\d{4}$/.test(p.get('born') || '') ? parseInt(p.get('born'), 10) : null,
  width: parseInt(p.get('width') || '854', 10),
  height: parseInt(p.get('height') || '480', 10),
  duration: parseFloat(p.get('duration') || '20'),
  music: p.get('music') || 'auto',
  overlay: p.get('overlay') !== '0',
  greets: cleanGreets(p.get('greets')),
};
const fps = parseFloat(p.get('fps') || '30');
const mime = p.get('format') === 'jpeg' ? 'image/jpeg' : 'image/png';
const quality = parseFloat(p.get('quality') || '0.95');

const canvas = document.getElementById('c');

try {
  const demo = new Demo({ canvas, ...cfg });
  window.SEEDSCENE = {
    meta: demo.meta,
    fps,
    totalFrames: Math.max(1, Math.round((demo.inJourney ? demo.journey.meta.duration : cfg.duration) * fps)),
    /** Draw frame i and hand back the encoded image. */
    grab(i) {
      demo.drawAt(i / fps);
      return canvas.toDataURL(mime, quality);
    },
    draw(i) { demo.drawAt(i / fps); },
  };
} catch (err) {
  window.SEEDSCENE_ERROR = String(err && err.stack ? err.stack : err);
}
