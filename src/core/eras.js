// Eras: spans of years, and what came out in them.
//
// An era is a time - from one year to another - not a machine: the scenes and the
// music of those years, and the display most of its things were seen on (the
// screens themselves are in displays.js, and a scene can bring its own). A scene
// belongs to the era of its year: a game or a film to the year it came out, a demo
// effect to the years the scene made it famous (a few to two or three, each seen
// through that era's display) - and is shown only there. An era is named by its
// years; its key is the year it starts, and the machine names it once had still
// work as aliases (arcade, c64, amiga, dos, console, handheld, y2k, modern).

export const ERAS = {
  1972: {
    label: '1972–1981', year: 1972, to: 1981, title: 'The first video games',
    blurb: 'the arcades and the black-and-white set: Pong, the invaders, the rocks, the maze',
    display: 'arcade',   // the screen most of its things were seen on (src/core/displays.js)
    scenes: ['paddles', 'invaders', 'rocks', 'maze', 'lcd'],
    music: ['arcade', 'cyborg', 'derelict', 'synthpop'],
  },
  1982: {
    label: '1982–1989', year: 1982, to: 1989, title: 'Home computers, arcades and the video shop',
    blurb: 'the 8-bit home, the arcade hits of the decade, and the films and series on tape',
    display: 'c64',
    scenes: ['lightcycles', 'pyramid', 'boxer', 'bricks', 'outrun', 'scanner', 'timecar', 'moonbike', 'dottunnel', 'plasma', 'ball'],
    music: ['chiptune', 'synthpop'],
  },
  1990: {
    label: '1990–1993', year: 1990, to: 1993, title: 'The demoscene\'s golden years',
    blurb: 'copper, vector balls and cracktros; the first 3D on the consoles; the desktop and its games',
    display: 'amiga',
    scenes: ['shadebobs', 'copper', 'vectorballs', 'ripple', 'metaballs', 'tunnel', 'starfield', 'kefrens', 'rings', 'twister', 'bobs', 'dualchess', 'chessfloor', 'rubber', 'cracktro', 'plasma', 'fractal', 'bumplogo', 'fireworks', 'morph', 'footsteps', 'starfighter', 'cascade', 'echolines'],
    music: ['rave', 'newbeat', 'orchestral', 'dreamwave', 'modjazz'],
  },
  1994: {
    label: '1994–1996', year: 1994, to: 1996, title: 'The PC demos and the multimedia years',
    blurb: 'mode 13h, the sound card, the bulletin boards and the screensavers',
    display: 'vga',
    scenes: ['fractal', 'tunnel', 'metaballs', 'plasma', 'fire', 'pipes', 'bumplogo', 'ansi', 'maze3d'],
    music: ['ambient', 'acid', 'gabber', 'eurodance', 'jungle', 'fmmetal', 'midiquest', 'keygen', 'triphop'],
  },
  1997: {
    label: '1997–1999', year: 1997, to: 1999, title: '3D consoles and pocket screens',
    blurb: 'the 32-bit consoles on the TV, a game on every phone, the anime of the afternoons',
    display: 'composite',
    scenes: ['snake', 'animeop'],
    music: ['heroic', 'eurodance', 'rocknroll', 'starpilot', 'midiquest', 'animeop', 'skatepunk', 'gameboy'],
  },
  2000: {
    label: '2000–2009', year: 2000, to: 2009, title: 'The 64k intro',
    blurb: 'hi-res, glow on everything, a whole demo in 64 kilobytes',
    display: 'svga',
    scenes: ['morph'],
    music: ['trance', 'hardcore', 'keygen', 'triphop'],
  },
  2010: {
    label: '2010–now', year: 2010, to: null, title: 'Shader art',
    blurb: 'shader art, neon and the synthwave revival',
    display: 'modern',
    scenes: [],
    music: ['synthwave', 'dreamwave'],
  },
};

/** Oldest first: the order THE JOURNEY travels in. */
export const ERA_NAMES = Object.keys(ERAS).sort((a, b) => ERAS[a].year - ERAS[b].year);

/** The names the eras had when they were machines: still understood, so no shared link breaks. */
export const ERA_ALIASES = {
  arcade: '1972', c64: '1982', amiga: '1990', dos: '1994', console: '1997', handheld: '1997', y2k: '2000', modern: '2010',
};

/** An era asked for by its key, a year inside it, or an old machine name: the era's key (or the input as it was). */
export function eraKey(name) {
  if (name === undefined || name === null) return name;
  const s = String(name).toLowerCase();
  if (ERAS[s]) return s;
  if (ERA_ALIASES[s]) return ERA_ALIASES[s];
  if (/^\d{4}$/.test(s)) { const y = Number(s); const e = eraOfYear(y); if (e) return e; }
  return name;
}

/** The era a year falls in (the first one for a year before them all, the last for one after). */
export function eraOfYear(y) {
  let found = null;
  for (const e of ERA_NAMES) if (y >= ERAS[e].year) found = e;
  return found || ERA_NAMES[0];
}

/** The eras that have scenes of their own, oldest first: the ones a programme travels. */
export const SCENE_ERAS = ERA_NAMES.filter((n) => ERAS[n].scenes.length > 0);

/** Which eras a scene belongs to, oldest first. */
export function erasForScene(scene) {
  return ERA_NAMES.filter((n) => ERAS[n].scenes.includes(scene));
}
