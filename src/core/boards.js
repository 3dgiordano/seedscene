// Sound boards: what a scene's music came out of.
//
// As a display is the screen a thing was seen on, a sound board is the hardware its music was heard on:
// a chip, a card, or the studio. Each era has the boards its music mostly played on (the Amiga's samples
// in 1990–1993, the PC's FM or wavetable card in 1994–1996, wavetable in 1997–1999); a scene that needs a
// sound of its own names its board - a film or a series the studio's full quality, the Amiga's ball its
// sample chip, the PC desktop's things its sound card. SOUND BOARD on AUTO keeps all that; any other board
// is forced on everything. The music style stays the seed's and the era's: the board is only what plays it.
//
// A programme's track has one board, since a board cannot change in the middle of a tune: the studio's if any of
// its scenes asks for the studio, or else its first scene's.

import { chipFor } from './chips.js';

export const BOARDS = {
  hifi: {
    name: 'HI-FI', label: 'Studio', chip: null,
    blurb: 'the synthesizer\'s own voices, each style\'s sound made in full - the quality of a film\'s soundtrack',
  },
  paula: {
    name: 'PAULA', label: 'Amiga sample chip', chip: 'paula',
    blurb: '8-bit samples on four channels, as a tracker played them',
  },
  opl3: {
    name: 'OPL3 FM', label: 'Sound card FM', chip: 'opl3',
    blurb: 'a 90s PC sound card\'s FM synthesis',
  },
  awe32: {
    name: 'AWE32', label: 'Wavetable sound card', chip: 'awe32',
    blurb: 'sampled instruments on a 90s wavetable card, with its chorus and reverb',
  },
  ym: {
    name: 'YM2149', label: 'Atari ST sound chip', chip: 'ym',
    blurb: 'three square channels, noise and the envelope buzzer, written 50 times a second, with digi-drums',
  },
  sid: {
    name: 'SID', label: 'Commodore 64 sound chip', chip: 'sid',
    blurb: 'pulse, saw, triangle and noise through the 6581\'s filter, written 50 times a second, drums from waveform tables',
  },
};

/** The boards in the order a viewer steps through them. */
export const BOARD_NAMES = Object.keys(BOARDS);

/**
 * The scenes that need a sound of their own: a film or a series the studio's (its soundtrack was never a
 * chip's), a game whose machine had no board here the studio's too, and a thing whose years fall in an era
 * heard mostly on another machine its own machine's. Every other scene plays on its era's boards.
 */
export const SCENE_BOARD = {
  scanner: 'hifi', timecar: 'hifi', moonbike: 'hifi', footsteps: 'hifi', animeop: 'hifi', coderain: 'hifi',
  starfighter: 'hifi', snake: 'hifi', lcd: 'hifi',
  castle: 'hifi',                     // (the laserdisc played its own recorded soundtrack)
  ball: 'paula',                      // (the Amiga's bouncing ball, in the 8-bit decade)
  cascade: 'opl3', echolines: 'opl3', // (the PC desktop's card game and screensaver, in the Amiga's years)
};

/** The board a scene's music plays on: forced, the scene's own, or one of its era's (by the seed). */
export function boardFor(scene, era, seed, forced = 'auto') {
  if (forced && forced !== 'auto' && BOARDS[forced]) return forced;
  if (SCENE_BOARD[scene]) return SCENE_BOARD[scene];
  return chipFor(era, seed) || 'hifi';
}

/** The one board a programme's track plays on, whichever of its scenes is showing: forced, the studio if any scene asks for it, or its first scene's. */
export function trackBoardFor(scenes, era, seed, forced = 'auto') {
  if ((!forced || forced === 'auto') && scenes.some((scene) => SCENE_BOARD[scene] === 'hifi')) return 'hifi';
  return boardFor(scenes[0], era, seed, forced);
}

/** The chip the synthesizer plays a board on (null: its own voices). */
export const chipOfBoard = (board) => (BOARDS[board] ? BOARDS[board].chip : null);
