// What 'auto' means, decided in one place so the CLI, the live page, the
// AudioWorklet and the offline renderer always resolve a seed the same way.
//
// The chain keeps a demo coherent: the scene picks an era it belongs to, and
// the era picks music of its time. Given only the era, the seed picks one of
// the era's own scenes.

import { Rng, stablePick } from './rng.js';
import { ERAS, ERA_NAMES, erasForScene } from './eras.js';
import { STYLE_NAMES } from '../styles/index.js';
import { MUSIC_NAMES } from './music.js';

const isAuto = (v) => v === undefined || v === null || v === '' || v === 'auto' || v === true;

/**
 * @param {{seed:string, style?:string, era?:string, music?:string}} o
 * @returns {{style:string, era:string, music:string}} every field resolved
 */
export function resolveChoices({ seed, style, era, music }) {
  // the scene a seed favours most: a new scene takes only the seeds that favour it;
  // with the era given, the one it favours most among the era's (so a seed whose
  // favourite is already there keeps it)
  const pool = isAuto(style) && !isAuto(era) && ERAS[era] ? ERAS[era].scenes : STYLE_NAMES;
  const s = isAuto(style) ? stablePick(seed, 'style-choice', pool) : style;
  let e = era;
  if (isAuto(era)) {
    const home = erasForScene(s);
    e = new Rng(seed, 'era-choice').pick(home.length ? home : ERA_NAMES);
  }
  const m = isAuto(music) ? new Rng(seed, 'music-style').pick(ERAS[e].music) : music;
  return { style: s, era: e, music: m };
}

/** Validate user input, with the list of what is allowed in the message. */
export function checkChoice(kind, value) {
  if (isAuto(value)) return 'auto';
  const v = String(value).toLowerCase();
  const allowed = { scene: STYLE_NAMES, style: STYLE_NAMES, era: ERA_NAMES, music: MUSIC_NAMES }[kind];
  if (!allowed.includes(v)) {
    throw new Error(`Unknown ${kind} "${value}". Available: auto, ${allowed.join(', ')}`);
  }
  return v;
}
