# SEEDSCENE v0.3 — the plan

**Status: opened by the owner's split of 2026-11-02 (decision Q9 of
[PLAN-v0.2.md](PLAN-v0.2.md)).** 0.2.0 closes the holes that show and is
released; everything else the v0.2 plan approved comes here, with the new
ideas of an outside proposal the owner had reviewed. The two rules of the v0.2
plan hold: homages, never copies; the kind of game, never its characters. And
the lessons it paid for: every homage built from real references, every chip
tuned by the owner's ear, every screen checked on the real GPU.

- [1. Carried over from v0.2](#1-carried-over-from-v02)
- [2. New: screens and sound by the real hardware](#2-new-screens-and-sound-by-the-real-hardware)
- [3. New: scenes and styles](#3-new-scenes-and-styles)
- [4. Order](#4-order)
- [5. Sources](#5-sources)
- [6. Ideas: phones, tablets and touch](#6-ideas-phones-tablets-and-touch)

---

## 1. Carried over from v0.2

Approved on 2026-10-28; their detail stays in PLAN-v0.2.md, sections 3 to 7.

| v0.2 round | What it lands |
|---|---|
| 1 | the 16-bit consoles: YM2612 and SPC700; `speedzone`, `jumpworld`, `coastline`, `chopper`, `pinball`; runner, jumper, racer, helicopter, rotozoomer; the radio stations |
| 2 | the arcade of 1995 and the fighters: YM2610, 2A03; their five styles and six scenes; cabinet mode |
| 3 | sports and pinball |
| 4 | racing and the music of the cyberpunk film of 1999 (the code rain itself is in 0.2.0) |
| 5 (rest) | glenz, landscape, the musicdisk player and the musicdisk mode, left out of 0.2.0 at the owner's word |
| 6 | adventures, pirates and the woodgrain console: MT-32, AdLib, PC speaker, TIA |
| 7 | the DOS party and the city: GUS; the party mode |
| 8 | the rhythm games |
| 9 | the years since 2001: the tape; ten styles; the visualizer channel and seven scenes |
| 10 | the 8-bit micros and the phones: AY-3-8910, the beeper, the two ringtone chips |
| 13 | the first screens and the gothic family: the lab oscillators |
| 14 | the rest: bouncing balls, bomber grid, bullet hell, smoke, the era marathon's mp4 (`seedscene autoplay --era`; live it landed in 0.2.0 on 2026-11-03: AUTOPLAY held in the era asked for) |

The v0.2 plan wrote its periods (P1–P14) as eras of their own; since
2026-11-01 eras are spans of years, so a period now lands as boards, displays
and scenes inside its span. Only P14 (1958) falls before every span and would
open one.

## 2. New: screens and sound by the real hardware

A display is one technology and a sound board one machine
(`src/core/displays.js`, `src/core/boards.js`). The outside proposal named
four screens and an AY board; first set aside as covered, then looked at again
at the owner's word: each one does something to a picture or a sound that
nothing here does, so each stays, tied to the scenes of its machine.

### Displays

| Display | What its screen did that no display here does | Scenes it would carry | With |
|---|---|---|---|
| **GBA** | the first Game Boy Advance's TFT had no light of its own: its low colour values came out almost black and the rest washed out, which games answered with brighter palettes (emulators correct it with a gamma near 4 and a colour matrix); 15-bit colour, 240×160, a pixel grid, slow pixels that smear motion. `gameboy` is a four-green STN, `snes` a TV | the handheld games of 2000–2009: a kart race, a platformer, the Mode 7 of the handheld; it gives the thin era a screen of its own | round 1 or 9 |
| **AGA** | the Amiga 1200's chips: 256 colours out of 24 bits, so no banding, where `amiga` keeps the 12-bit banding of the first chips on purpose | the Amiga demos of 1992 on: texture-mapped tunnels, the landscape, chunky 3D; some of 1990–1993's effects may belong to it - each looked at against its year | round 5's rest |
| **HAM** | hold-and-modify: each pixel changes one channel of the last, so near-photographic stills, and a colour fringe trailing every sharp horizontal edge - an artefact no other screen has | a raytraced scene in the spirit of the HAM animations of the mid-80s, HAM slideshows; 1982–1989 | round 5's rest |
| **PC CRT** | the PC's own monitor at 31 kHz: a fine shadow mask or aperture grille (on the flat tubes of the late 90s, two thin damper wires across it), sharp, scan lines too fine to see at high resolutions - and at 320×200 every line drawn twice, a thin dark line between the pairs. `vga` draws 200 coarse TV-like lines; `svga` is the 64k intro's glow, a look rather than a screen | `vga` re-made on it (mode 13h line-doubled); 2000–2009's desktop things; whether `svga`'s glow becomes the scenes' own and the era's screen this one is the owner's | the post shader's mask |
| **ZX Spectrum** | colour by attribute: two colours in each 8×8 cell, so a sprite crossing a background takes its colours (the attribute clash); fifteen colours, bright and normal | round 10's micros | round 10 |
| **MSX** | the TMS9918: fifteen colours, two in each eight pixels of a line | round 10's micros | round 10 |
| **Amstrad CPC** | 27 colours, mode 0's wide pixels | round 10's micros | round 10 |

The post shader draws scan lines, glow, curvature and fringes, but no
phosphor mask; the PC CRT, and the TVs and arcade monitors told apart by
their masks, need one. It goes in first, checked so the displays of 0.2.0
look the same unless one asks for a mask.

### Sound boards

| Board | What it does that the boards here do not | Where | With |
|---|---|---|---|
| **AY-3-8910** | the YM2149 is its licensed copy, but not its twin: the AY's envelope has 16 steps where the YM's has 32, so its buzzing bass is coarser; its volume steps are uneven, small at the top and wide at the bottom, where the YM's are even; its clock is the machine's - 1.77 MHz on the Spectrum 128, 1.79 on the MSX, 1 MHz on the CPC, so each machine's notes fall out of tune a little differently; the CPC heard its three channels left, centre and right; the Spectrum and the MSX had no digi-drums, so drums were noise and envelope. Built as a variant of the YM2149 chip, by machine | 1982–1989, with round 10's Spectrum, MSX and CPC scenes: without them it would be one more chip that is not the C64's under the C64's display | round 10 |
| **GB APU** | the handheld's own: two pulses, a 4-bit wave channel, noise; the `gameboy` style plays today on the studio's voices | 1997–1999's handheld | with the 2A03 (round 2): near the same chip |

## 3. New: scenes and styles

| Idea | What it is | Era |
|---|---|---|
| C64 demo effects | the DYCP scroller (each letter on its own sine), the open borders, raster bars under the sprites, an early crack intro | 1982–1989 |
| More shader art | after 0.2.0's three or four: a procedural city, an abstract piece | 2010–now |
| `darksynth`, `futurefunk` | the synthwave revival's darker side; the sampled-disco loops of the 2010s | 2010–now |

## 4. Order

1. The phosphor mask in the post shader: the PC CRT and the machines' TVs
   stand on it.
2. The v0.2 rounds in their order (1, 2, …), each with the displays and boards
   of its machines from section 2: the GBA with the handheld scenes, AGA and HAM
   with round 5's rest, the AY, Spectrum, MSX and CPC with round 10, the GB APU
   with the 2A03.
3. Section 3's scenes and styles where they fit.

The gates are v0.2's (PLAN-v0.2.md, section 8, **When a round is done**).

## 5. Sources

Looked at on 2026-11-02 for section 2; each piece is built against its machine's
datasheet, captures and recordings, as every homage here is.

- AY and YM: [General Instrument AY-3-8910](https://en.wikipedia.org/wiki/General_Instrument_AY-3-8910),
  [AY / YM differences](https://maidavale.org/blog/ay-ym-differences/),
  [AY and YM clock speeds](https://maidavale.org/blog/ay-and-ym-clock-speeds/),
  [MAME's ay8910.cpp](https://git.redump.net/mame/plain/src/devices/sound/ay8910.cpp),
  [vgmrips: AY vs YM](https://vgmrips.net/forum/viewtopic.php?p=17318),
  [CPC wiki: AY](https://www.cpcwiki.eu/index.php?title=AY)
- GBA: [emulating the GBA's display with gamma](https://codewitchgamedev.blogspot.com/2015/08/emulating-gbas-display-with-gamma.html),
  [color emulation (near)](https://archive.ares-emu.net/near.sh/articles/video/color-emulation.html),
  [libretro: real GBA colours](https://forums.libretro.com/t/real-gba-and-ds-phat-colors/1540?page=13)
- AGA and HAM: [Amiga AGA](https://en.wikipedia.org/wiki/Amiga_Advanced_Graphics_Architecture),
  [Hold-And-Modify](https://Www.Wikipedia.org/wiki/HAM_mode),
  [HAM8 chunky graphics](https://lysator.liu.se/~mikaelk/doc/2ham8.html)
- PC monitors: [libretro CRT shader thread](https://forums.libretro.com/t/please-show-off-what-crt-shaders-can-do/19193/3886),
  [Vogons on scan line gaps](https://www.vogons.org/viewtopic.php?p=266958)
- Still to fetch before building: the Spectrum's, MSX's and CPC's video
  datasheets, the CPC's stereo wiring (left, centre, right is from memory),
  the first GBA's panel captures, the SID datasheet and the 6581 filter's
  measurements.

---

## 6. Ideas: phones, tablets and touch

**Ideas noted by the owner on 2026-11-03, not yet approved or placed in the
order of section 4.** 0.3.0 should play on a phone and a tablet as well as on
a computer: everything the keys do today reachable with a finger, and nothing
on the screen that stays in the way of the picture.

What the page has today (`web/live.js`, `web/menu.js`, `web/index.html`): every
action is a key (the help screen lists them); a touch only wakes the demo from
the screensaver; the menu closes when its backdrop is clicked; the help screen
lets clicks through (`pointer-events: none`) and closes only with H or Esc;
F asks for full screen; the page has a viewport meta but no web app manifest.

### Gestures

| Gesture | Does | As the key |
|---|---|---|
| swipe left / right | previous / next scene | ← → |
| swipe up / down | change the music style | ↑ ↓ |
| tap | brings up the touch buttons (below) | — |

In AUTOPLAY and THE JOURNEY a swipe left or right skips a part, as the arrows
do there. A swipe must not be taken for a tap, nor scroll or zoom the page.

### Touch buttons

- A tap anywhere on the picture brings up the buttons, drawn in the page's own
  look:
  - **quick actions**: next scene, next style, next era, pause, sound on/off,
    display, sound board, full screen;
  - **the rest**: the menu, the help, the About part, AUTOPLAY, THE JOURNEY,
    BORN IN, GREETINGS, a new random seed, the info panel.
- They go away by themselves after a few seconds without a touch, so they
  never cover the picture for long and need no close button of their own. A
  touch on a button counts as a touch and keeps them up.
- The menu and the help, once opened, stay until closed: a tap outside their
  panel closes them. The menu does this today; the help must learn it, since
  it lets clicks through now.
- The boxes that ask for typing (BORN IN's year, GREETINGS, the menu's seed)
  need the phone's keyboard: an input that brings it up, and an OK and a
  CANCEL button in place of Return and Esc.
- The menu is driven by ↑ ↓ ← → today: on touch each row's value changes by
  tapping it, or by arrows on the row.
- The panels and their text fit a phone held either way, portrait and
  landscape.
- The hints that name keys (`H · KEYS` in the corner, `PRESS T TO GO BACK`,
  the help's key list) name the touch instead on a touch screen.

### Full screen and installing as an app

- Full screen: the F key's request, from a button. Whether each phone's
  browser grants it to a page is to be checked.
- Installing as an app: a web app manifest (name, icons, colours, standalone
  display, the start address and scope of the site on GitHub Pages) and the
  matching meta tags, so the site can be put on a phone's home screen and open
  without the browser's bars - the way to a full screen where the browser
  gives a page none.
- An easy **INSTALL AS APP** button where the browser offers one to the page;
  where it does not, a short help on how to add it to the home screen by hand.
- The button and that help show only when the page is not already running as
  an installed app, so the viewer is never asked to install what they are
  using.

### To check before building

- Which mobile browsers grant full screen to a page, what each one needs
  before it offers to install a site (manifest fields, icons, a service
  worker or not), and how a page tells that it runs installed.
- Sound on phones: the audio starts only after a touch, as after a key today;
  how the phone's silent switch and battery saver treat it.
- The frame rate and the heat of the shaders on a phone's GPU at the phone's
  own pixel ratio, checked live on real devices, as every screen is.
- The screensaver and the screen wake lock on a phone.
