// The catalogue as a viewer travels it: era after era, oldest first, and inside each era its own
// scenes and music in the order the seed deals them - never the order they were written in.
//
// The live keys step through it, the menu shows it, and every seed deals it differently; the eras
// keep their order, so a viewer stepping on always comes to the next era's scenes in its own place.

import { Rng } from './rng.js';
import { ERAS, ERA_NAMES, SCENE_ERAS } from './eras.js';

/** Every era's scenes, era after era, each era's dealt by the seed: [{scene, era}]. A scene in two eras comes twice. */
export function sceneTour(seed) {
  return SCENE_ERAS.flatMap((era) => new Rng(String(seed), `tour-scenes-${era}`).shuffle(ERAS[era].scenes).map((scene) => ({ scene, era })));
}

/** Each scene once, where it first comes in the tour: the menu's list. */
export function sceneList(seed) {
  return [...new Set(sceneTour(seed).map((x) => x.scene))];
}

/**
 * The music styles from an era's point of view: its own first, dealt by the seed, then the other eras'
 * in their order from the next one on, each style once.
 */
export function musicTour(seed, era) {
  const at = Math.max(0, ERA_NAMES.indexOf(era));
  const eras = [...ERA_NAMES.slice(at), ...ERA_NAMES.slice(0, at)];
  const out = [];
  for (const e of eras) for (const m of new Rng(String(seed), `tour-music-${e}`).shuffle(ERAS[e].music)) if (!out.includes(m)) out.push(m);
  return out;
}

/** Names grouped by the first era they belong to, oldest first, then by name: listings with no seed. */
export function byEra(names, erasOf) {
  const first = (n) => { const i = ERA_NAMES.findIndex((e) => erasOf(e).includes(n)); return i < 0 ? ERA_NAMES.length : i; };
  return [...names].sort((a, b) => first(a) - first(b) || a.localeCompare(b));
}
