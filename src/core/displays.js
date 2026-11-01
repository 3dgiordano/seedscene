// Displays: how a picture looked on the screens it was made for.
//
// A display is a screen and its signal: a palette, a dither and a kind of tube, glass or tape. It is a
// simulation for today's eyes, not an emulation: the picture is always drawn at full resolution - a display
// never lowers it to its machine's - and only what its screen did to a picture is added: the scan lines,
// curvature, glow and fringes of a CRT for what was seen on one; for an LCD or anything later, no CRT at all,
// only its palette. Each display is one technology, named for it, so a scene is never filed under the wrong
// one; more will come, one for each machine a scene simulates.
// It is not an era: an era is a span of years (what came out then), a display is how one of those things
// was seen. Each era has the display most of its things were seen on; a scene that needs a look of its own
// names it - a game its machine's screen, a film or a series the videotape it was watched on - so a game is
// never shown through a machine it did not run on. DISPLAY on AUTO keeps all that; any other display is
// forced on everything, for anyone who wants today's scenes on yesterday's screens.

export const DISPLAYS = {
  bw: {
    name: 'B/W', label: 'Black-and-white TV', blurb: 'a black-and-white television: grey, soft and grainy',
    screen: 'crt',
    lines: 240, pixelAspect: 1,
    palette: 'gray', levels: 0, dither: 0,
    tube: 'tv', bloom: 0.7, scan: 0.25, barrel: 0.06, aberr: 0, grain: 0.06, vignette: 0.65,
  },
  arcade: {
    name: 'ARCADE', label: 'Arcade monitor', blurb: 'the coin-op raster monitor: a few hard, bright colours, heavy bloom, a curved tube',
    screen: 'crt',
    lines: 224, pixelAspect: 1,
    palette: 'levels', levels: 4, dither: 0.35,  // a few bright colours, hard edges
    tube: 'crt', bloom: 1.3, scan: 0.35, barrel: 0.085, aberr: 0.0016, grain: 0.03, vignette: 0.7,
  },
  mono: {
    name: 'MONO', label: 'Monochrome monitor', blurb: 'green phosphor on black, the office PC before colour',
    screen: 'crt',
    lines: 350, pixelAspect: 1,
    palette: 'mono', levels: 8, dither: 0.3,
    tube: 'crt', bloom: 0.9, scan: 0.22, barrel: 0.05, aberr: 0, grain: 0.02, vignette: 0.6,
  },
  c64: {
    name: 'C64', label: '8-bit home computer', blurb: 'the 8-bit home computer\'s 16 colours, on the family TV',
    screen: 'crt',
    lines: 200, pixelAspect: 2,             // multicolour mode: pixels twice as wide
    palette: 'c64', levels: 0, dither: 0.55,
    tube: 'crt', bloom: 0.55, scan: 0.32, barrel: 0.07, aberr: 0.0012, grain: 0.03, vignette: 0.65,
  },
  vhs: {
    name: 'VHS', label: 'Videotape', blurb: 'a film or a series on tape: soft brightness the deck sharpens back, colour smeared wide and late, lines that wave, the heads switching at the bottom',
    screen: 'crt',
    lines: 240, pixelAspect: 1,
    palette: 'none', levels: 0, dither: 0,
    tube: 'vhs', bloom: 0.6, scan: 0.12, barrel: 0.03, aberr: 0.003, grain: 0.05, vignette: 0.55,
  },
  ega: {
    name: 'EGA', label: 'EGA PC', blurb: 'the sixteen fixed colours of the early PC, dithered',
    screen: 'crt',
    lines: 200, pixelAspect: 1,
    palette: 'ega', levels: 0, dither: 0.6,
    tube: 'crt', bloom: 0.4, scan: 0.2, barrel: 0.04, aberr: 0.0008, grain: 0.02, vignette: 0.5,
  },
  amiga: {
    name: 'AMIGA', label: '16-bit home computer', blurb: '4096-colour copper gradients with honest banding, a PAL monitor',
    screen: 'crt',
    lines: 256, pixelAspect: 1,
    palette: 'levels', levels: 16, dither: 0,   // 12-bit colour: honest banding, no dither
    tube: 'crt', bloom: 0.8, scan: 0.28, barrel: 0.06, aberr: 0.0012, grain: 0.025, vignette: 0.6,
  },
  vga: {
    name: 'VGA', label: 'VGA PC', blurb: 'the PC\'s 256-colour mode, dithered, on its monitor',
    screen: 'crt',
    lines: 200, pixelAspect: 1,
    palette: 'levels', levels: 6, dither: 0.85,
    tube: 'crt', bloom: 0.5, scan: 0.16, barrel: 0.035, aberr: 0.0008, grain: 0.02, vignette: 0.5,
  },
  snes: {
    name: 'SNES', label: '16-bit console', blurb: '15-bit colour without dither, on the TV',
    screen: 'crt',
    lines: 224, pixelAspect: 1,
    palette: 'levels', levels: 32, dither: 0,
    tube: 'tv', bloom: 0.6, scan: 0.2, barrel: 0.05, aberr: 0.0018, grain: 0.02, vignette: 0.55,
  },
  composite: {
    name: 'COMPOSITE TV', label: 'Late-90s console on a composite TV', blurb: '15-bit colour, ordered dither, a composite TV',
    screen: 'crt',
    lines: 240, pixelAspect: 1,
    palette: 'levels', levels: 32, dither: 1,
    tube: 'tv', bloom: 0.9, scan: 0.18, barrel: 0.05, aberr: 0.0022, grain: 0.02, vignette: 0.55,
  },
  gameboy: {
    name: 'GAME BOY', label: 'Reflective STN LCD', blurb: 'the handheld\'s passive-matrix LCD: four shades of green, pixel grid and all',
    screen: 'lcd',
    lines: 144, pixelAspect: 1,
    palette: 'dmg', levels: 0, dither: 0.7,
    tube: 'lcd', bloom: 0, scan: 0, barrel: 0, aberr: 0, grain: 0, vignette: 0.25,
  },
  nokia: {
    name: 'NOKIA', label: 'Phone LCD', blurb: 'the phone\'s monochrome LCD: dark pixels on a green backlight',
    screen: 'lcd',
    lines: 160, pixelAspect: 1,            // (a homage, not an emulation: fine enough to read, coarse enough to recall it)
    palette: 'phone', levels: 0, dither: 0.35,
    tube: 'lcd', bloom: 0.25, scan: 0, barrel: 0, aberr: 0, grain: 0, vignette: 0.3,
  },
  svga: {
    name: 'SVGA', label: 'SVGA PC', blurb: 'hi-res and glow on everything, the 64k intro',
    screen: 'crt',
    lines: 0, pixelAspect: 1,
    palette: 'none', levels: 0, dither: 0,
    tube: 'clean', bloom: 1.5, scan: 0, barrel: 0, aberr: 0.0006, grain: 0.01, vignette: 0.4,
  },
  modern: {
    name: 'MODERN', label: 'Modern', blurb: 'no filter: the picture as it is drawn',
    screen: 'flat',
    lines: 0, pixelAspect: 1,
    palette: 'none', levels: 0, dither: 0,
    tube: 'clean', bloom: 0, scan: 0, barrel: 0, aberr: 0, grain: 0, vignette: 0,
  },
};

/** The displays in the order a viewer steps through them: roughly as they came. */
export const DISPLAY_NAMES = Object.keys(DISPLAYS);

/**
 * The scenes that need a look of their own: a game its machine's screen (Pong a black-and-white set, the
 * arcade games the arcade monitor, the phone's snake its phone's LCD, the 16-bit space shooter its console's TV), a film or a
 * television series the videotape it was watched on, a scene that draws its own device no filter at all, and a
 * thing whose years fall in an era seen mostly on another machine its own machine's. Every other scene - the demo
 * effects - is seen through its era's display.
 */
export const SCENE_DISPLAY = {
  paddles: 'bw',
  invaders: 'arcade', rocks: 'arcade', maze: 'arcade', bricks: 'arcade', lightcycles: 'arcade',
  boxer: 'arcade', pyramid: 'arcade', outrun: 'arcade',
  lcd: 'modern',
  snake: 'nokia',                     // (the phone's game, on the phone's screen)
  starfighter: 'snes',                // (the 16-bit console's polygons)
  scanner: 'vhs', timecar: 'vhs', moonbike: 'vhs', footsteps: 'vhs', animeop: 'vhs',
  // a demo or a desktop thing whose years put it in an era seen mostly on another machine keeps its own
  ball: 'amiga',                      // (the Amiga's bouncing ball of 1984, in the 8-bit decade)
  cascade: 'vga', echolines: 'vga',   // (the PC desktop's card game and screensaver, in the Amiga's years)
};

/** The display a scene is seen through: forced, the scene's own, or its era's. */
export function displayFor(scene, eraDisplay, forced = 'auto') {
  if (forced && forced !== 'auto' && DISPLAYS[forced]) return forced;
  return SCENE_DISPLAY[scene] || eraDisplay || 'modern';
}

const PALETTE_MODE = { none: 0, c64: 1, levels: 2, dmg: 3, ega: 4, mono: 5, gray: 6, phone: 7 };
const TUBE_MODE = { crt: 0, lcd: 1, tv: 2, clean: 3, modern: 4, vhs: 5 };

/** The numbers the post shader needs for a display: a screen that was not a CRT gets none of a CRT's effects. */
export function displayUniforms(name) {
  const d = DISPLAYS[name];
  const crt = d.screen === 'crt';
  return {
    palMode: PALETTE_MODE[d.palette],
    levels: d.levels || 2,
    dither: d.dither,
    display: TUBE_MODE[d.tube],
    lines: d.lines || 0,          // its scan lines (or an LCD's grid), drawn over the full-resolution picture
    bloom: crt ? d.bloom : 0, scan: crt ? d.scan : 0, barrel: crt ? d.barrel : 0, aberr: crt ? d.aberr : 0,
    grain: crt ? d.grain : 0, vignette: crt ? d.vignette : 0,
  };
}

/** The resolution a display draws at: always the canvas's own - a display simulates its screen, it never lowers the picture. */
export function displayResolution(name, w, h) {
  return { w, h, pixelated: false };
}
