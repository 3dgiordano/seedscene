// SEEDSCENE's name, tagline and block-letter logo, shared by the CLI banner
// and the release .NFO, so there is one spelling of the brand.

export const NAME = 'SEEDSCENE';
export const VERSION = '0.2';
export const TAGLINE = 'One seed. One demo. Forever.';

// "ANSI Shadow" letterforms, six rows each.
const GLYPHS = {
  S: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  D: ['██████╗ ', '██╔══██╗', '██║  ██║', '██║  ██║', '██████╔╝', '╚═════╝ '],
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  N: ['███╗   ██╗', '████╗  ██║', '██╔██╗ ██║', '██║╚██╗██║', '██║ ╚████║', '╚═╝  ╚═══╝'],
};

/** The logo as six lines of block characters. */
export function logoLines(word = NAME) {
  const rows = ['', '', '', '', '', ''];
  for (const ch of word) {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`No glyph for "${ch}"`);
    for (let i = 0; i < 6; i++) rows[i] += g[i];
  }
  return rows;
}

// ---- the About part (key A in live mode) ----------------------------------

/** The pages that zoom in, one every two bars, in time with the music. */
export const ABOUT_PAGES = [
  [`SEEDSCENE V${VERSION}`, 'ONE SEED. ONE DEMO. FOREVER.'],
  ['TYPE ANY WORD', 'GET A DEMO MADE JUST FOR IT'],
  ['38 SCENES  8 ERAS', '24 MUSIC STYLES'],
  ['1972 TO NOW', 'O FOR AUTOPLAY  T FOR THE JOURNEY'],
  ['NO SAMPLES  NO VIDEO', 'ONLY MATHS AND A BROWSER'],
  ['SAME SEED = SAME DEMO', 'BYTE FOR BYTE'],
  ['ARCADE  C64  AMIGA  DOS', 'CONSOLE  HANDHELD  Y2K  MODERN'],
  ['CHIPTUNE  NEW BEAT  RAVE  GABBER', 'JUNGLE  TRANCE  ORCHESTRAL  SYNTHWAVE'],
  ['SYNTH-POP  ROCK AND ROLL  STAR PILOT', 'CYBORG PULSE  DERELICT SHIP'],
  ['CODE + MUSIC ENGINE', 'CLAUDE BY ANTHROPIC'],
  ['IDEA + DIRECTION', '3DGIORDANO'],
  ['BUILT WITH', 'GITHUB.COM/3DGIORDANO/AGENT-PLUGINS'],
  ['PRESS A AGAIN', 'TO GO BACK TO YOUR DEMO'],
];

/** The big scroller along the bottom: the story. */
export const ABOUT_STORY = [
  'HELLO AND WELCOME TO THE SEEDSCENE ABOUT PART',
  'REMEMBER LOADING A DEMO FROM A FLOPPY AND WAITING FOR THE MAGIC',
  'SEEDSCENE BRINGS THAT MAGIC BACK - TYPE A WORD AND A BRAND NEW DEMO IS BORN',
  'MUSIC AND GRAPHICS ARE COMPOSED ON THE SPOT - NOTHING IS PRE-RECORDED',
  'PLASMA - TUNNELS - METABALLS - SHADEBOBS - VECTOR BALLS - DOT TUNNELS - COPPER BARS - FIREWORKS - WATER - FRACTALS - OUTRUN SUNSETS',
  'AND THE ARCADE: PADDLES - INVADERS - ROCKS - A MAZE - A BRICK WALL - LIGHT RIDERS - A SNAKE - A TITLE FIGHT - A SPACE RUN - ALL ON A STAGE THAT RIDES THE MUSIC',
  'EIGHT ERAS: THE ARCADE - THE C64 - THE AMIGA - DOS AND VGA - THE 32-BIT CONSOLES - THE HANDHELD - THE Y2K 64K INTRO - TODAY',
  'PRESS T AND TRAVEL FROM 1972 TO NOW IN ONE GO - OR PRESS O AND LET IT PLAY FOR HOURS',
  'SID CHIPTUNE - NEW BEAT - AMIGA RAVE - ORCHESTRAL TRACKERS - GABBER - JUNGLE - TRANCE - SYNTHWAVE',
  'SHARE YOUR SEED AND YOUR FRIENDS GET EXACTLY THE SAME DEMO',
  'WRITTEN BY CLAUDE IN CLAUDE CODE WITH THE AGENT-PLUGINS FROM 3DGIORDANO',
  'KEEP THE SCENE ALIVE',
].join('   ***   ');

/**
 * Greetings typed by the viewer: up to eight names, twenty letters each, in
 * capitals, accents dropped (the demo fonts had none), separated by commas.
 */
export function cleanGreets(text) {
  return String(text || '').split(/[,;\n]/)
    .map((s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      .replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20))
    .filter(Boolean).slice(0, 8);
}

/** The fast little scroller along the top, running the other way. */
export const ABOUT_GREETS = [
  'GREETINGS TO', 'EVERYONE WHO EVER TYPED LOAD AND WAITED', 'EVERYONE WHO EVER INSERTED DISK 2', 'THE TRACKER MUSICIANS',
  'THE COPPER-LIST WIZARDS', 'THE 3 A.M. CODERS', 'THE KIDS ABOUT TO SEE THEIR FIRST DEMO',
  'AND YOU',
].join('  -  ');

// A copper-bar gradient for the terminal: one 256-colour shade per row.
const COPPER = [51, 45, 39, 33, 99, 165];

/** The logo coloured for a terminal, or plain when colour is off. */
export function banner(color = true) {
  return logoLines()
    .map((l, i) => (color ? `\x1b[38;5;${COPPER[i]}m${l}\x1b[0m` : l))
    .join('\n');
}
