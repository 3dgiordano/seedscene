// Eras: how a frame looked on the machines the scene grew up on.
//
// An era is a screen, not a scene: a resolution, a palette, a dither and a
// kind of display. Any scene can be shown through any era, and each era
// suggests the scenes and the music that belonged to it. Platform names are
// used only to say which period a look recalls.

export const ERAS = {
  arcade: {
    label: 'Arcade cabinet', year: 1979, blurb: 'raster and vector monitors in a dark room full of coins',
    lines: 224, pixelAspect: 1,
    palette: 'levels', levels: 4, dither: 0.35,  // a few bright colours, hard edges
    display: 'crt', bloom: 1.3, scan: 0.35, barrel: 0.085, aberr: 0.0016, grain: 0.03, vignette: 0.7,
    scenes: ['paddles', 'invaders', 'rocks', 'maze', 'bricks', 'lightcycles', 'snake', 'boxer', 'scanner', 'lcd', 'pyramid'],
    music: ['arcade', 'cyborg', 'derelict', 'synthpop'],
  },
  c64: {
    label: 'Commodore 64', year: 1982, blurb: '16 colours, fat pixels, a TV in the bedroom',
    lines: 200, pixelAspect: 2,             // multicolour mode: pixels twice as wide
    palette: 'c64', levels: 0, dither: 0.55,
    display: 'crt', bloom: 0.55, scan: 0.32, barrel: 0.07, aberr: 0.0012, grain: 0.03, vignette: 0.65,
    scenes: ['plasma', 'copper', 'dottunnel', 'invaders'],
    music: ['chiptune', 'synthpop'],
  },
  amiga: {
    label: 'Amiga', year: 1990, blurb: '4096-colour copper gradients on a PAL monitor',
    lines: 256, pixelAspect: 1,
    palette: 'levels', levels: 16, dither: 0,   // 12-bit colour: honest banding, no dither
    display: 'crt', bloom: 0.8, scan: 0.28, barrel: 0.06, aberr: 0.0012, grain: 0.025, vignette: 0.6,
    scenes: ['shadebobs', 'copper', 'vectorballs', 'ripple', 'metaballs', 'tunnel', 'starfield', 'bricks', 'kefrens', 'ball', 'rings', 'twister', 'bobs', 'dualchess', 'chessfloor', 'rubber', 'cracktro'],
    music: ['rave', 'newbeat', 'orchestral', 'dreamwave', 'modjazz'],
  },
  handheld: {
    label: 'Handheld', year: 1998, blurb: 'four shades of green on a reflective LCD',
    lines: 144, pixelAspect: 1,
    palette: 'dmg', levels: 0, dither: 0.7,
    display: 'lcd', bloom: 0, scan: 0, barrel: 0, aberr: 0, grain: 0, vignette: 0.25,
    scenes: ['dottunnel', 'plasma', 'fireworks', 'starfield', 'tunnel', 'invaders', 'maze', 'snake'],
    music: ['gameboy', 'rocknroll'],
  },
  dos: {
    label: 'PC DOS · VGA', year: 1994, blurb: 'mode 13h: 320x200, 256 colours, dithered',
    lines: 200, pixelAspect: 1,
    palette: 'levels', levels: 6, dither: 0.85,
    display: 'crt', bloom: 0.5, scan: 0.16, barrel: 0.035, aberr: 0.0008, grain: 0.02, vignette: 0.5,
    scenes: ['vectorballs', 'fractal', 'tunnel', 'fireworks', 'ripple', 'metaballs', 'plasma', 'fire', 'rings', 'pipes', 'bumplogo'],
    music: ['ambient', 'acid', 'gabber', 'eurodance', 'jungle', 'fmmetal', 'midiquest'],
  },
  console: {
    label: '32-bit console', year: 1997, blurb: '15-bit colour, ordered dither, composite TV',
    lines: 240, pixelAspect: 1,
    palette: 'levels', levels: 32, dither: 1,
    display: 'tv', bloom: 0.9, scan: 0.18, barrel: 0.05, aberr: 0.0022, grain: 0.02, vignette: 0.55,
    scenes: ['vectorballs', 'starfield', 'tunnel', 'fireworks', 'maze', 'bricks', 'boxer', 'starfighter', 'footsteps'],
    music: ['heroic', 'eurodance', 'rocknroll', 'starpilot', 'midiquest'],
  },
  y2k: {
    label: 'Y2K PC demo', year: 2002, blurb: 'hi-res, glow on everything, the 64k intro',
    lines: 0, pixelAspect: 1,
    palette: 'none', levels: 0, dither: 0,
    display: 'clean', bloom: 1.5, scan: 0, barrel: 0, aberr: 0.0006, grain: 0.01, vignette: 0.4,
    scenes: ['morph', 'metaballs', 'fractal', 'outrun', 'rocks', 'starfighter'],
    music: ['trance', 'hardcore'],
  },
  modern: {
    label: 'Modern', year: 2024, blurb: 'shader art, neon and film grain',
    lines: 0, pixelAspect: 1,
    palette: 'none', levels: 0, dither: 0,
    display: 'modern', bloom: 1.1, scan: 0, barrel: 0, aberr: 0.0015, grain: 0.045, vignette: 0.5,
    scenes: ['outrun', 'morph', 'metaballs', 'paddles', 'lightcycles', 'snake', 'boxer', 'starfighter'],
    music: ['synthwave', 'dreamwave'],
  },
};

/** Oldest first: the order THE JOURNEY travels in. */
export const ERA_NAMES = Object.keys(ERAS).sort((a, b) => ERAS[a].year - ERAS[b].year);

const PALETTE_MODE = { none: 0, c64: 1, levels: 2, dmg: 3 };
const DISPLAY_MODE = { crt: 0, lcd: 1, tv: 2, clean: 3, modern: 4 };

/** The numbers the post shader needs for an era. */
export function eraUniforms(name) {
  const e = ERAS[name];
  return {
    palMode: PALETTE_MODE[e.palette],
    levels: e.levels || 2,
    dither: e.dither,
    display: DISPLAY_MODE[e.display],
    bloom: e.bloom, scan: e.scan, barrel: e.barrel, aberr: e.aberr,
    grain: e.grain, vignette: e.vignette,
  };
}

/**
 * The resolution an era draws at, for a canvas of w x h: the era's line count,
 * as wide as the canvas aspect allows, and halved for fat-pixel modes.
 */
export function eraResolution(name, w, h) {
  const e = ERAS[name];
  if (!e.lines || e.lines >= h) return { w, h, pixelated: false };
  const vh = e.lines;
  const vw = Math.max(16, Math.round((vh * (w / h)) / e.pixelAspect));
  return { w: vw, h: vh, pixelated: true };
}

/** Which eras a scene belongs to, oldest first. */
export function erasForScene(scene) {
  return ERA_NAMES.filter((n) => ERAS[n].scenes.includes(scene));
}
