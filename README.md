<div align="center">

<pre>
███████╗███████╗███████╗██████╗ ███████╗ ██████╗███████╗███╗   ██╗███████╗
██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝████╗  ██║██╔════╝
███████╗█████╗  █████╗  ██║  ██║███████╗██║     █████╗  ██╔██╗ ██║█████╗  
╚════██║██╔══╝  ██╔══╝  ██║  ██║╚════██║██║     ██╔══╝  ██║╚██╗██║██╔══╝  
███████║███████╗███████╗██████╔╝███████║╚██████╗███████╗██║ ╚████║███████╗
╚══════╝╚══════╝╚══════╝╚═════╝ ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═══╝╚══════╝
</pre>

### One seed. One demo. Forever.

**Type a word. Get a demoscene production — music and motion — made just for it.
Then ride it through forty-five years of machines, from the arcade cabinet to now.**

![THE JOURNEY: every era from the C64 to today, each with its own card, scene and music](docs/gallery/journey.gif)

`v0.2` · 8 eras · 45 scenes · 28 music styles · 4 sound chips · endless autoplay · runs in your browser · renders to mp4 ·
no assets, only maths · built with [3dgiordano/agent-plugins](https://github.com/3dgiordano/agent-plugins)

</div>

---

## If you were there

You remember. A coin in the slot and `INSERT COIN` blinking in the dark. The blue screen and `READY.` The `LOAD"*",8,1` and the wait.
The border going mad with stripes while the tape squealed. *Insert disk 2.*
The `C:\>` prompt and a demo that somehow ran on a 486. A handheld with four
shades of green. And the intros — before the game, sometimes better than the
game: copper bars, a sine scroller, a plasma melting through a palette, a tune
you can still hum.

SEEDSCENE brings all of it back. Every machine gets its **era**: its own
resolution, its own palette, its own dither, its own screen — an arcade
monitor glowing in a dark room, a C64 on a TV,
an Amiga on a PAL monitor, VGA in mode 13h, a 32-bit console on composite, a
handheld LCD, the glossy 64k intros of the 2000s, today's shader art. And every
demo it plays has never been seen before — composed on the spot, from the word
you gave it.

## If you weren't

Think of a world seed in a game: the same word always builds the same world.
SEEDSCENE does that for **the demoscene** — the art form kids built on home
computers, squeezing impossible graphics and music out of machines with less
memory than a single photo on your phone.

Type your name, your birthday, your cat's name. You get your own music
video, in the style of any era you like. Send someone the word, and they get
the exact same one.

![LOAD, the striped border, READY., RUN — and the demo begins](docs/gallery/boot.gif)

## Watch it online

Nothing to install: open a link and press any key at `READY.` (the browser
lets the sound start only after a key or a click). Then `H` shows every key.

| | |
|---|---|
| **[AUTOPLAY](https://3dgiordano.github.io/seedscene/)** | the endless channel: a new track every forty seconds, era after era |
| **[THE JOURNEY](https://3dgiordano.github.io/seedscene/?seed=seedscene&journey=1)** | every era in turn, 1979 to now |
| **[Born in 1985](https://3dgiordano.github.io/seedscene/?seed=seedscene&autoplay=1&born=1985)** | AUTOPLAY from the era you were twelve in - change the year in the address, or press `B` |
| **[Greetings](https://3dgiordano.github.io/seedscene/?seed=hyperspace&scene=cracktro&era=amiga#greets=ANA,LUIS,THE+3+A.M.+CODERS)** | the cracktro greeting your friends - press `G` for your own names |
| **One era** | [Arcade 1979](https://3dgiordano.github.io/seedscene/?seed=insertcoin&era=arcade) · [C64 1982](https://3dgiordano.github.io/seedscene/?seed=readyrun&era=c64) · [Amiga 1990](https://3dgiordano.github.io/seedscene/?seed=disk2&era=amiga) · [DOS 1994](https://3dgiordano.github.io/seedscene/?seed=soundblaster&era=dos) · [32-bit console 1997](https://3dgiordano.github.io/seedscene/?seed=pressstart&era=console) · [Handheld 1998](https://3dgiordano.github.io/seedscene/?seed=poweron&era=handheld) · [Y2K 2002](https://3dgiordano.github.io/seedscene/?seed=precalc&era=y2k) · [Modern 2024](https://3dgiordano.github.io/seedscene/?seed=raymarch&era=modern) |
| **Your own word** | `https://3dgiordano.github.io/seedscene/?seed=yourname` - the same word gives everyone the same demo |
| **A screensaver** | `https://3dgiordano.github.io/seedscene/?saver=10` - ten seconds untouched and AUTOPLAY takes the screen |

## Try it

```bash
npm install
npm run live
```

Or pick the word, the era, the music:

```bash
node bin/seedscene.js live    --seed yourname --era amiga
node bin/seedscene.js render  --seed yourname --scene vectorballs --era dos --music gabber
node bin/seedscene.js journey  --seed yourname          # every era, 1979 to now → out/yourname-journey.mp4
node bin/seedscene.js autoplay --seed yourname --duration 3600   # an hour of it → out/yourname-autoplay.mp4
```

Press any key at `READY.` to run. Then press **`H`** any time to see every key
on screen (and `H` again to hide it):

| key | |
|---|---|
| `O` | **AUTOPLAY** — a new track every 40 seconds, scenes cut on the music, somewhere new each time |
| `T` | **THE JOURNEY** — every era in turn, 1979 to now |
| `B` | **BORN IN** — type the year you were born: AUTOPLAY opens in the era you were twelve in, and stays near it |
| `G` | **GREETINGS** — type a few names: they scroll in the greetings, and stay on this screen |
| `E` · `1` … `8` | travel to the next era, or jump to one: arcade, C64, Amiga, DOS, console, handheld, Y2K, modern |
| `space` · `←` `→` | next / previous scene — in AUTOPLAY or THE JOURNEY, the next / previous track |
| `↑` `↓` | change the music style |
| `S` | a brand-new random seed |
| `M` | **the SETUP menu** — type your own seed; pick the scene, the era, the music, the resolution, the length, the sound; copy the command that reproduces it |
| `A` | **the About part** |
| `P` | pause |
| `V` | sound on / off — off, the demo plays on in silence, the picture still on the beat |
| `F` | fullscreen (do it) |
| `I` | the info panel |
| `H` | every key, on screen |

Everything you change is kept in the page address, so a reload brings back
the same demo — and **COPY LIVE COMMAND** / **COPY MP4 COMMAND** in the menu
give you the exact line to share it or render it to a video.

## Eight eras

An era is a screen, not a scene: any scene can be seen through any era. Leave
it on `auto` and the seed picks an era the scene belongs to, then music of
that era; choose only the era, and the seed picks one of that era's own
scenes.

| | era | the screen | the music it brings |
|---|---|---|---|
| **1979** | `arcade` | the coin-op cabinet: a few hard, bright colours, heavy bloom, a curved tube | arcade attract, cyborg pulse, derelict ship, synth-pop |
| **1982** | `c64` | 16 colours, fat double-wide pixels, a TV in the bedroom | SID chiptune, synth-pop |
| **1990** | `amiga` | 4096-colour copper gradients with honest banding, PAL monitor | Amiga rave, New Beat, orchestral trackers, dreamwave, tracker jazz — on Paula's 8-bit samples |
| **1994** | `dos` | VGA mode 13h: 320×200, 256 colours, ordered dither | ambient techno, acid, gabber, eurodance, jungle, FM metal, MIDI quest — on a Sound Blaster 16's FM or an AWE32's wavetable; and keygen, the party's tracker tunes, played from samples as a module player did; and trip-hop, its strings and Rhodes on the card |
| **1997** | `console` | 15-bit colour, the 32-bit consoles' dither, composite TV | heroic game soundtracks, eurodance, chip rock and roll, star pilot, MIDI quest, the anime opening, skate punk — on wavetable |
| **1998** | `handheld` | four shades of green on a reflective LCD, pixel grid and all | handheld chip, chip rock and roll |
| **2002** | `y2k` | hi-res, glow on everything — the 64k intro | trance, happy hardcore, keygen, trip-hop |
| **2024** | `modern` | shader art: neon, film grain, chromatic aberration | synthwave, dreamwave |

## THE JOURNEY

Press **`T`** live, or run `seedscene journey`, and SEEDSCENE plays a trackmo
through all eight eras, oldest first. Each part is its own little production
— its own scene, its own music at its own tempo — and each opens with the line
its machine would have greeted you with: `INSERT COIN`, `LOAD "JOURNEY",8,1`,
`INSERT DISK 2`, `C:\SEEDSCENE> JOURNEY.EXE`, `PRESS START`, `POWER ON`,
`PRECALCULATING...`, `COMPILING SHADERS... DONE`. One seed, forty-five years.

## AUTOPLAY

Press **`O`** and lean back. SEEDSCENE becomes a channel that never ends: a new
track every forty seconds, three in one era, then on to another. Inside each
track the picture changes with the music: the scene cuts where the music turns
— on the drop after the break, on the crash that opens a phrase — so a track
plays two or three of its era's scenes, in a fresh order every block, never the
same pairing twice in a row. A new era opens with its card; every other track
with a **NOW PLAYING** lower third. `space` skips ahead, `←` goes back, `O`
returns you to your own demo.

The tracks mix into each other the way a DJ would mix them. The next track is
composed and ready as soon as the one before it starts. Its first bars then
play over the last bars of the outgoing one, beat on beat: across the overlap
both follow one tempo that glides from the old track's to the new one's. The
new track comes in thin, its lows filtered away; halfway the basslines swap;
then the old track fades behind a closing filter. THE JOURNEY's eras are
mixed the same way.

Live, AUTOPLAY drops in somewhere new in its channel every time you press
`O`, so it never plays the same sequence twice. The rendered channel is
still the seed's: `seedscene autoplay --duration 3600` puts an hour of it in
an mp4, the same every time for the same word.

### Between the tracks

The programmes have their own sounds between the tracks, played over the mix:
each era opens THE JOURNEY with a chime of its own, in the spirit of how its
machines started - a coin and a credit for the arcade, a SID arpeggio for
the C64, the floppy drive stepping for the Amiga, the beep of a PC that has
checked itself, a deep swell for the 32-bit console, a two-note ping for
the handheld, a soft bell for now - on the incoming track's key. A handheld
track starts with its cartridge clicking in. And the way into the
media-player years is a dial-up modem's handshake, as the riser of the mix:
the dial tone, the number, the answer, the 2100 Hz tone and its snaps, the
probing, the hiss - and silence, the line connected, on the drop.

### Born in

Press **`B`** and type the year you were born. AUTOPLAY opens in the era you
were twelve in - born in 1985, the 32-bit console of 1997 - its card saying
so (`BORN 1985   TWELVE IN 1997`), and keeps coming back to it every other
block; the eras between are drawn from the ones nearest your year, so a 1985
childhood hears mostly the console, the Y2K PC and DOS, the Amiga now and then.
`B` again takes you back to your demo; the year stays in the page's address,
so a reload comes back to it. Rendered:
`seedscene autoplay --born 1985`.

### Greetings

Every demo greeted its friends. Press **`G`** and type a few names, between
commas - up to eight, twenty letters each, accents dropped as the old fonts
dropped them. RETURN puts them in the greetings: first in the sine scroller of
every scene (`GREETINGS TO JOSE - ANA MARIA - LUCIA`), in AUTOPLAY and THE
JOURNEY too, in the About part's greetings, and on the cracktro's own pages,
three names a page after its thanks. The names are kept after the `#` of the
page's address, the part a browser never sends to any server: they stay on
this screen, and a reload brings them back. For a video:
`seedscene render --scene cracktro --greets "Jose, Ana Maria"`.

### Screensaver

Leave it alone for a minute - no key, no click, no mouse moving - and
SEEDSCENE turns into a screensaver: AUTOPLAY takes the screen, with nothing
on it but the picture, not even the pointer. Any key, a click or a touch
brings your own demo back (the key does nothing else). It waits while the
demo is paused, while a menu or a box is open, and over a programme or the
About part. A browser lets a page go full screen only right after a key or a
click, never after a minute of nothing: in full screen (`F`) the screensaver
stays full screen; in a window it fills the window. `saver=<seconds>` in
the page's address changes the wait, `saver=0` turns it off.

## The arcade

![paddles, invaders, rocks, a maze, a brick wall, light riders, a snake, a robot title fight and a space run, each moving to its own music](docs/gallery/arcade.gif)

Before the demoscene there was the arcade, and SEEDSCENE starts there: eleven
game-inspired visualizers that move to the music instead of a joystick. Not a
replay of the games — a show made of them. Every game scene plays on a
**board floating in space** — and a game that is a device of its own, the LCD
juggler, floats as that device — and the camera rides the music round it: a
new angle on every eight-bar phrase, a punch in on the kick, a lean on the
snare, the board's neon frame breathing with the bass, and a zoom blur on
every kick.

Nine of them are real games underneath, run as small simulations locked to
the beat. The chomper hunts the nearest dot and dodges, while the wisps chase
it — one straight at it, one cutting it off, one keeping its distance — and
flee after a power dot. The snake steers for its food, keeps itself room to
escape, grows, and when it finally boxes itself in it bursts and starts again.
The rock ship flies round the field, dodges what is about to hit it, leads
its target and fires on the eighths: a big rock breaks in two, a small one
bursts, and now and then a rock gets through. The starfighter slides over and
turns its nose onto a drone — two sights ahead of it show where it points —
and fires from its wings along the nose once the sights are on; two hits and
the drone bursts. The drones come in from the far distance — over the planet,
from just above the horizon — and fire back on the backbeat; the ship slides
out of the way of the shots it sees, and one that lands shakes it and flashes
the screen once. The pyramid hopper turns the cube tops a hop a beat while the
red balls drop onto the second row and bounce down on the off-beats, and the
egg hatches into a snake that chases; a ball on its cube and it stops and
swears in a balloon, and with the snake close behind it rides a disc to the
top and the snake, following, falls.

Four of them play on the music's own grid, so their big moments land on it.
In **paddles** every return falls on a beat, and on an accent - the crash
that opens a phrase, the drop - the paddle the ball is heading for misses
and is blown apart on that very note; the other side scores. In **invaders**
the cannon times its shots so each alien bursts on a beat, and a saucer that
crosses the top is brought down on the accent. In **bricks** every flight of
the ball is timed to land on an eighth or a sixteenth, so the wall breaks on
the rhythm, and the paddle aims each return somewhere new. In
**lightcycles** four riders fly across the grid trailing walls of light,
turning on the beat and dodging between beats; a rider goes down only where
the music turns - two beats ahead, the game sends one of them into another's
wall, timing its speed so it blows up on the downbeat that opens a phrase, or
on an accent. Same seed, same game, move
for move.

They are homages, drawn from nothing but maths — no sprite, no maze, no
character and no tune is copied from any game. The creatures in the
formation, the mazes, the rocks and the challenger robot are all made up by
the seed.

## Forty-five scenes, straight out of the scene

| | | |
|---|---|---|
| ![plasma](docs/gallery/plasma.png) | ![dottunnel](docs/gallery/dottunnel.png) | ![copper](docs/gallery/copper.png) |
| **plasma** — sine waves melting through a palette. *Handheld,* `--scene plasma --era handheld --seed 1989` | **dottunnel** — rings of dots rushing down a snaking tunnel. *C64,* `--scene dottunnel --era c64 --seed warpspeed` | **copper** — copper bars glowing over an endless checkerboard. *Amiga,* `--scene copper --era amiga --seed copperlist` |
| ![shadebobs](docs/gallery/shadebobs.png) | ![vectorballs](docs/gallery/vectorballs.png) | ![ripple](docs/gallery/ripple.png) |
| **shadebobs** — glowing trails that wrap round the palette. *Amiga,* `--scene shadebobs --era amiga --seed shadebob` | **vectorballs** — shaded spheres morphing between shapes every two bars. *Amiga,* `--scene vectorballs --era amiga --seed vectorballs` | **ripple** — drops landing on the beat across a pool floor. *Amiga,* `--scene ripple --era amiga --seed raindrops` |
| ![tunnel](docs/gallery/tunnel.png) | ![metaballs](docs/gallery/metaballs.png) | ![fractal](docs/gallery/fractal.png) |
| **tunnel** — a twisting, texture-mapped tunnel punched by the kick. *DOS,* `--scene tunnel --era dos --seed insertdisk2` | **metaballs** — liquid blobs that merge and split. *DOS,* `--scene metaballs --era dos --seed lavalamp` | **fractal** — an orbiting Julia set, the classic end-part. *DOS,* `--scene fractal --era dos --seed julia` |
| ![fireworks](docs/gallery/fireworks.png) | ![starfield](docs/gallery/starfield.png) | ![morph](docs/gallery/morph.png) |
| **fireworks** — a burst on every backbeat, streaks falling to earth. *Console,* `--scene fireworks --era console --seed newyear` | **starfield** — warp speed around a drilled glenz-vector solid. *Console,* `--scene starfield --era console --seed hyperspace` | **morph** — a raymarched solid melting between shapes on the bar. *Y2K,* `--scene morph --era y2k --seed liquidmetal` |
| ![outrun](docs/gallery/outrun.png) | ![paddles](docs/gallery/paddles.png) | ![invaders](docs/gallery/invaders.png) |
| **outrun** — the synthwave sunset: striped sun, neon grid, mountains. *Modern,* `--scene outrun --era modern --seed nightdrive` | **paddles** — the first video game in neon: a return on every beat, and on an accent a paddle misses and is blown apart. *Modern,* `--scene paddles --era modern --seed rally` | **invaders** — a formation the seed invents, a step per beat; each shot lands on a beat and the alien bursts on the kick. *Arcade,* `--scene invaders --era arcade --seed formation` |
| ![rocks](docs/gallery/rocks.png) | ![maze](docs/gallery/maze.png) | ![bricks](docs/gallery/bricks.png) |
| **rocks** — a ship that flies, dodges and fires on the eighths; hit rocks break in two, in glowing phosphor lines. *Arcade,* `--scene rocks --era arcade --seed vectorscope` | **maze** — a chomper hunting dots round a mirrored neon maze, three wisps on the chase, a new maze each time it is cleared. *Arcade,* `--scene maze --era arcade --seed powerpill` | **bricks** — a neon wall broken on the rhythm by a ball that goes somewhere new each return. *Arcade,* `--scene bricks --era arcade --seed brickwall` |
| ![lightcycles](docs/gallery/lightcycles.png) | ![snake](docs/gallery/snake.png) | ![boxer](docs/gallery/boxer.png) |
| **lightcycles** — four riders flying on a neon grid trailing walls of light, turning on the beat; on the downbeat that opens a phrase, one is sent into another's wall and blows up. *Modern,* `--scene lightcycles --era modern --seed neongrid` | **snake** — a neon snake that hunts its food, grows, and bursts when it boxes itself in. *Modern,* `--scene snake --era modern --seed longsnake` | **boxer** — a title fight between two robots, staged like the console classics: hooks, jab flurries, uppercuts and showboating on the beat; yours, see-through, slips and punishes; on the crash a star punch switches him off, he crumples and the count goes up. *Arcade,* `--scene boxer --era arcade --seed titlefight` |
| ![starfighter](docs/gallery/starfighter.png) | ![fire](docs/gallery/fire.png) | ![kefrens](docs/gallery/kefrens.png) |
| **starfighter** — an on-rails run in flat-shaded polygons, after the 16-bit console classic: a white fighter with tall blue fins turns its nose and sights onto a red delta-wing, fires along them and bursts it; the drones come in from the horizon or the far distance, their shots come back, the ship slides out of their way, and one that lands shakes it and flashes the screen once. Space of points of light that stretch into a warp at each new sector; a planet of snowy mountains, clouds and stone arches, the ship's shadow running on the ground; a red shield bar. *Console,* `--scene starfighter --era console --seed hyperdrive` | **fire** — the classic 256-colour fire of the DOS demos: tongues of flame leaping on the kick, sparks flying up on the snare, and at the peak of the music a seed-made emblem catching fire. *DOS,* `--scene fire --era dos --seed inferno` | **kefrens** — the Amiga classic: a shaded bar on every raster line, never cleared, piling up into a ribbon that weaves wider on the bass, fattens on the kick and turns colour with the bars of the music. *Amiga,* `--scene kefrens --era amiga --seed copperwave` |
| ![ball](docs/gallery/ball.png) | ![rings](docs/gallery/rings.png) | ![lcd](docs/gallery/lcd.png) |
| **ball** — the Amiga's first and most famous demo: the red and white ball spinning on its tilted axis, bouncing from wall to wall of a grid room with its shadow behind it — landing on every beat, spinning faster as the music builds. *Amiga,* `--scene ball --era amiga --seed boing` | **rings** — interference rings: two sets of rings drifting through each other, every crossing flipping the colour into a moiré that seems to move on its own; they run outward on the kick, tighten on the bass, and a third set joins in at the peak. *Amiga,* `--scene rings --era amiga --seed moire` | **lcd** — the juggling LCD handheld of 1980, the whole device: brushed silver in a maroon case, two big round red buttons, the grey screen in its red border; on it a juggler in black segments, arms straight out, balls hopping cell by cell and landing in a hand on the beat, the side button going down for each catch, the score counting them. The whole device floats in space, punching in on the kick. *Arcade,* `--scene lcd --era arcade --seed juggler` |
| ![scanner](docs/gallery/scanner.png) | ![footsteps](docs/gallery/footsteps.png) | ![twister](docs/gallery/twister.png) |
| **scanner** — the talking car of 80s television, as an idea: a long, low black car coming down a night road straight at you, the red light in its nose sweeping left and right, one pass on every beat, a trail fading behind it; the road rushes faster as the music builds. *Arcade,* `--scene scanner --era arcade --seed redsweep` | **footsteps** — the dinosaur films' most famous warning, as an idea: two plastic cups of water on a car's dashboard, at night in the rain, the water trembling into rings with every footstep — the left cup on the kick, the right on the snare — until, at the peak, the light drops as something huge goes by. Nothing of the animal is shown. *Console,* `--scene footsteps --era console --seed impact` | **twister** — the twisted bar of the Amiga and Atari ST demos: a square column of block-textured faces, each lit by the angle it turns to you, twisting up the screen; the twist winds up as the music builds, the bar snaps a quarter turn on the kick, and at the peak two more join it. *Amiga,* `--scene twister --era amiga --seed stonebar` |
| ![pyramid](docs/gallery/pyramid.png) | ![pipes](docs/gallery/pipes.png) | ![bobs](docs/gallery/bobs.png) |
| **pyramid** — the cube-pyramid hopper of the 1982 arcades, played, on a board floating in space: a round green hopper of its own hops a cube a beat to turn every top, while the game's enemies come down between the beats — red balls dropping onto the second row and bouncing down at random, a purple egg that hatches into a coiled snake and chases. A ball or the snake on its cube and it stops and swears in a balloon; with the snake close behind it rides a disc to the top and the snake, following, falls. Each round the pyramid builds itself a row an eighth note, every landing ripples through the cubes, and a won round is a wave of jumping cubes before it falls away. *Arcade,* `--scene pyramid --era arcade --seed cubes` | **pipes** — the 3D pipes screensaver of the mid-90s office PC, seen from above: shiny pipes of solid colours growing cell by cell through a deep grid, never into a cell another holds, turning on the eighth notes with a smooth elbow (now and then a ball joint). The tangle fills from the distance forwards for sixteen bars until the screen is saturated, then dissolves in blocks through the last bar; the camera punches in on the kick. *DOS,* `--scene pipes --era dos --seed screensaver` | **bobs** — unlimited bobs, the Amiga and Atari ST trick: a few screens shown in turn and never cleared, one shaded ball drawn each frame, so a chain of balls seems to slide along behind its head, tracing its path. Ours runs on the music's clock: it surges ahead on the kick and on the pitched hits — stabs, lead, arpeggio — and glides between them; older balls recede into the distance and fade, so the chain flows away into the depth. On the kick it swells and settles back, on the snare it lightens, each bar draws its colour, and the screen punches in on the kick and shakes with the bass. A twin chain runs the figure the other way in the other colours, and the two weave a knot as they cross. *Amiga,* `--scene bobs --era amiga --seed copperlist` |
| ![dualchess](docs/gallery/dualchess.png) | ![chessfloor](docs/gallery/chessfloor.png) | ![rubber](docs/gallery/rubber.png) |
| **dualchess** — the dual chessboard of the Amiga intros: a chessboard on each bitplane, each zooming slowly between big squares and small ones, the palette giving every overlap its own shade. Two modes, a phrase each: the layers sliding sideways past each other at their own speeds; then the boards turning slowly on their own axes against each other, a quarter turn, breaking into moiré, square again for the next. The first board's squares punch in on the kick; the second breathes on the snare and slides with the bass; a third fades in for the second half of each phrase. *Amiga,* `--scene dualchess --era amiga --seed zoomboard` | **chessfloor** — the chessboard floor of the Amiga intros, with its cube: a board seen from above in perspective, turning beneath you, and a red cube bouncing on it. The board waves in 3D — a slow swell that grows with the bass, and every time the cube lands, on the beat, the board gives under it and a ring of waves runs out and dies away. The cube moves smoothly: its spin speeds up as the rhythm gets busy and slows as it thins, each hop set as it leaves. And the touches of the time: the cube mirrored in the board, glints on the wave crests, a glow round the cube, a bright copper line at the horizon. *Amiga,* `--scene chessfloor --era amiga --seed sunnfun` | **rubber** — the rubber vector of the Amiga demos: a flat-shaded cube turning, its lower part lagging behind its top, so it bends and wobbles like jelly — each line of the screen shows the cube as it was a moment before, as the demos did with copies of the cube. Each kick gives the spin a shove that dies away, so the jolt runs down the cube like a wave through jelly; the snare tips it on a spring; the screen punches in on the kick and shakes with the bass, the copper bars behind flaring on the kick, a third joining them at the peak. *Amiga,* `--scene rubber --era amiga --seed jelly` |
| ![bumplogo](docs/gallery/bumplogo.png) | ![cracktro](docs/gallery/cracktro.png) | ![cascade](docs/gallery/cascade.png) |
| **bumplogo** — the bump-mapped logo of the mid-90s PC demos: an emblem raised out of rough stone, lit by moving coloured lights so it reads as embossed metal — done in 2D, as the demos did, each pixel's slope shifting where the light is looked up — on a plate seen at an angle, the camera leaning slowly round it. The lights circle the emblem and flare wider on the snare; the relief deepens on the kick, the screen punching in with it; a third light joins them in the second half of each phrase. *DOS,* `--scene bumplogo --era dos --seed emboss` | **cracktro** — the crack intro of the Amiga years and its starfield: a field of stars in depth that you fly through — drifting sideways, the near stars sliding past faster than the far ones, then diving forward or pulling back — steered by the music, a new heading every two bars, faster as it builds, a surge on each kick, and in the last two bars of each phrase a warp into the next — forward, the stars stretching into lines out of the middle as the jump to hyperspace did, or sideways into long streaks, each star glowing. It opens with the intro: a chrome SEEDSCENE logo bouncing on the beat over rainbow copper lines, and pages typing in, in a 5×7 bitmap font — what this is, and thanks to 3dgiordano and the SEEDSCENE community — which then fade away and leave the stars. *Amiga,* `--scene cracktro --era amiga --seed hyperspace` | **cascade** — the card game won, as the desktop of the 90s showed it: the four foundations empty one card at a time, kings first, and each card falls off its pile and bounces down the green table, leaving a copy of itself at every step because the game never cleared the screen — fast cards as fans of white edges with their red and black indices, slow ones piling their borders into black arches, a card that has stopped bouncing sliding along the bottom. A card leaves the piles on each bar, and another halfway through the bar when the music is busy; each is thrown so that it first lands on the beat, on the "and" or on the sixteenth between, and bounces livelier the busier the music; the trails keep the music - the copies drawn just after a kick are warm, after a snare cool, so each hit is a band of colour down the trail - and older copies sink into the table while the newest arcs stand out; each card casts its shadow, and its first landing throws up sparks and a flash along the floor. The table floats on the stage like the game scenes, the camera riding the music, punching in on the kick; in the last bar of each phrase colour runs through every trail, and the next phrase deals a new game, the table cleared and the piles full again. *Y2K,* `--scene cascade --era y2k --seed cascade` |
| ![ansi](docs/gallery/ansi.png) | ![echolines](docs/gallery/echolines.png) | ![maze3d](docs/gallery/maze3d.png) |
| **ansi** — the art of the bulletin boards, arriving over the modem: VGA text mode in its sixteen colours, pictures and big block-letter logos built from full and half blocks and the three shades, the gradients run down the artists' ramps from white through yellow to brown or light blue to blue, grey outlines, a sparkle of stars. A line of the file arrives each beat, the cursor sweeping it at about the speed of a 2400-baud modem, and the screen scrolls smoothly up as it fills; each phrase brings a part of the file — a spaced-out header, a sunset or a night sky with its moon over a shaded land, a line about the music, and a logo (SEEDSCENE, the seed, the music) whose last line lands as the next phrase opens. The camera shows the whole screen on the drop, then draws slowly nearer as the picture arrives, keeping the lines already drawn in view above the cursor, and eases back out over the logo so the drop shows it whole; the kick lights the letters as they arrive and punches the screen in, the snare sets the stars twinkling, and on the drop the finished logo cycles its colours. *DOS,* `--scene ansi --era dos --seed colorbars` || **echolines** — the bouncing lines of the screensavers of the early 90s: two figures of four corners, each corner flying in a straight line and bouncing off the edges of the screen, each figure drawn again at the moments just behind it in thin lines of one colour, so it trails a fan of echoes. The music sets the pace: the figures fly faster as it builds, get a shove on each kick and a burst as each phrase opens; the kick stretches the echoes apart like a spring and punches the screen, each snare hit moves the colours on, and the busier the music, the more echoes — six when it is quiet, up to fourteen. *DOS,* `--scene echolines --era dos --seed nightshift` | **maze3d** — the 3D maze of the screensavers of the mid-90s, walked in first person: corridors of dark red bricks with pale mortar, a tan floor, a ceiling of white tiles, a maze of the seed's own, walked with a hand on the wall so it never ends. A move every two beats — a step down the corridor, or a corner taken walking — so the steps land on the first and third beats of the bar; each kick is a footfall that dips the view and punches the screen, the snare brightens the ceiling, and as each phrase ends a grey stone spins on the path ahead: the walk goes through it on the drop and the world turns upside down, until the next. *DOS,* `--scene maze3d --era dos --seed corridors` |
| ![moonbike](docs/gallery/moonbike.png) | ![timecar](docs/gallery/timecar.png) | ![animeop](docs/gallery/animeop.png) |
| **moonbike** — the boy and his friend from the stars, as an idea: a deep blue night, a huge pale moon with its seas and a wisp of cloud, pines black at the corners, and a bicycle crossing the moon in silhouette — the rider hunched over the bars, hood up, cape flying, a bundle in a blanket sitting up in the basket. It always opens with the bicycle riding in; it crosses for four bars, is gone for two — turning round somewhere past the edge of the frame while the camera settles — and comes back the way it went, near and through the moon, then far and high. The camera pans after it and draws in as it crosses the moon, each layer moving less the farther it is — the stars, the moon, a forest far off, the pines in the corners — and the halo opens as it crosses; the wheels turn a turn a beat, the pedals with them, the cape streams and ripples on the eighths, the kick lights the moon and punches the screen, the hats set the stars twinkling and the snare sends a shooting star every other bar. *Modern,* `--scene moonbike --era modern --seed moonride` || **timecar** — the time-travel car of the 80s, as an idea, on the night of its first run: a wet parking lot lit orange by its lamps, a long low building beyond, two onlookers — one with the remote and its aerial, one filming — swaying to the music with their backs to us. A stainless wedge in 3D - the low nose, the steep windscreen, the louvred fastback - laps the lot fast, passing close in front of them, swings round at the far end and charges at them, between them, its readout climbing to 88 on the next big moment of the music — the bars where a crash or the drop falls — the light gathering at its nose and lightning crawling round it on the sixteenths; they brace as it comes. At 88 the light bursts, they shield their faces, and it is gone; only then the fire: the cut goes to the reverse, the two of them from the front hopping from foot to foot on the beat as two trails of fire race down its tracks and between their legs, and then close on the plate it left - SEEDSCENE on it - standing on its edge and spinning like a coin, wobbling faster as it tilts, until it falls flat. *Arcade,* `--scene timecar --era arcade --seed gigawatts` | **animeop** — the anime openings the 90s brought to Latin America, as an idea: a cut on every bar, as those openings cut on the music — the team in a row against a flat red sunburst, three of them against a sunset, a power-up over two bars — the charge, crouched, the ground cracking; bolts of lightning out of the sky, and on the downbeat a white flash, a column of fire bursting up and a ring of dust; then the energized state that stays, a tall serrated aura with lightning crawling round it, the hair spiked up gold and the muscles swollen — a flight in formation across a sky rushing right to left, a charge out of black speed lines — silhouettes of their own, striking a new pose on every beat; the kick punches the picture and bursts the lines, the last bar of each phrase cuts on every beat into a white flash, and on the drop the title card slams in: the seed as the show's name in thick outlined letters, yellow into orange over rushing blue streaks, SEEDSCENE above it and a star glinting at its corner. *32-bit console,* `--scene animeop --era console --seed hikari` |

Every scene carries the two things no demo went without: a title plate and a
sine scroller that opens with **SEEDSCENE PRESENTS…** — and every scene is an
homage, written from scratch, to an effect the scene made famous.

## Twenty-four music styles, on the sound chips of their eras

Every seed composes its own track, like a tracker module that writes itself.
Let the era pick the style, or choose with `--music`, with `↑` `↓` while it
plays, or in the menu:

| style | | bpm |
|---|---|---|
| `chiptune` | Commodore 64 SID: pulse-width leads, square bass, 50 Hz arpeggio chords | 132–158 |
| `newbeat` | Belgian New Beat: slow, heavy EBM sequencer bass, big claps | 108–120 |
| `rave` | **Amiga rave, 1992**: chopped breakbeats, hoovers, sub bass, rave piano | 138–150 |
| `orchestral` | the orchestral tracker: strings, choir, timpani and brass in four channels | 96–120 |
| `dreamwave` | mellow cracktro synths and lush pads | 84–118 |
| `acid` | a squelching, sliding 303 over a 909, the filter knob always turning | 124–135 |
| `gabber` | Rotterdam, 1993: a distorted kick and nothing to hide behind | 175–190 |
| `ambient` | the chill-out room: deep pads, FM bells, a heartbeat kick | 92–110 |
| `eurodance` | hip-house organ bass, house piano, an anthem on top | 126–136 |
| `jungle` | amen breaks at 170 over a detuned reese bass | 164–174 |
| `heroic` | the game soundtrack: driving bass, brass, a lead that soars | 132–152 |
| `gameboy` | handheld chip: two pulses, a 4-bit wave, noise | 120–150 |
| `trance` | gated supersaws, rolling offbeat bass, snare rolls into big drops | 134–142 |
| `hardcore` | happy hardcore: 175 bpm, piano stabs, screaming leads | 168–180 |
| `synthwave` | the modern revival: gated snares, octave bass, neon arps | 92–118 |
| `arcade` | **arcade attract**: a pulse hook, a bass that marches down, zaps, blips and explosions in time and in key | 140–165 |
| `cyborg` | **cyborg pulse**: the mid-80s machine score — anvils in an odd 13-step metre, an ostinato bass, dark brass | 96–112 |
| `derelict` | **derelict ship**: deep-space dread — drones, a half-step that will not resolve, pings off the hull, a heartbeat | 64–76 |
| `synthpop` | **synth-pop**: the 80s chart single — gated drums, octave bass, the four chords everyone knows, a chorus you hum | 112–124 |
| `rocknroll` | **chip rock and roll**: a 50s shuffle on a sound chip — boogie bass, twelve bars, piano on the off-beat, a riff | 150–176 |
| `starpilot` | **star pilot**: 16-bit space opera — driving octave bass, a brass hook, orchestra hits, lasers in key, the minor sixth and seventh climbing home | 140–158 |
| `modjazz` | **tracker jazz**: the demo-party jazz tune — a walking slap bass, electric-piano comping on the off-beats, a flute that improvises, the ride swinging | 100–126 |
| `fmmetal` | **FM metal**: a DOS shooter at full tilt — palm-muted power chords, a double kick when it peaks, a guitar that solos | 150–178 |
| `midiquest` | **MIDI quest**: an adventure on a sound card — strings and choir, a harp running up and down, a flute, the timpani of a long road | 84–108 |
| `keygen` | **keygen**: the crack intros' tracker tunes, from the patterns of forty real ones — chords arpeggiated on the tracker's tick, a squelchy lead sliding into its notes with an echo channel a few rows behind, a bouncing bass, drum samples; 125 bpm most often, the tracker's default | 120–140 |
| `triphop` | **trip-hop**: the 90s Bristol sound — a slow break pitched down and shuffled like an MPC, the kick leading into the beats, a big roomy snare and a side-stick, the ride on the upbeats; a deep sliding bass, dark film-score strings, a Rhodes, a theremin, a record scratched at the end of a phrase, the crackle under it all | 68–90 |
| `animeop` | **anime opening**: the 90s anime opening, in the anison's form — an intro, a verse, a prechorus climbing into a chorus you could sing - mostly steps, an arch to each phrase, the same tune every time it returns, the brass joining it in the last one - the Royal Road progression under it, often a minor third up from the verse, and the last chorus a step higher still; J-rock drums, driving bass, palm-muted then open guitars, brass stabs | 140–170 |
| `skatepunk` | **skate punk**: the skateboarding games' punk — ska verses, the guitar chopping on the off-beats over a backbeat and the bass walking; punk choruses, the snare on every "and", the kick on the beat and the sixteenth after (or doubled before the snare), the hats open, power chords hammered on the eighths; a synth chorus shouted like a gang, a few notes, the same each time | 180–200 |

Each one is arranged like a real piece — intro, build, main part, a breakdown
with a riser, a crash into the drop, an outro. The newest five are built
around a **hook**: a two-bar call and answer the seed writes, landing on the
chord on the strong beats and coming home every fourth bar, so it sticks. Every sound is synthesized from
scratch in plain JavaScript: 909, gabber and break kicks, claps, a 303, a reese,
hoovers, supersaws, a rave piano, a house organ, strings, choir, timpani,
brass, FM bells, SID pulses, a 4-bit wave, struck anvils, laser zaps, coin
blips, explosions and deep-space drones. No recorded samples anywhere (on the
Amiga, Paula plays samples SEEDSCENE cuts from its own instruments) — and no melody
borrowed from anyone: the moods of the arcades, the sci-fi scores and the
charts are homages to sounds, not copies of songs. The chord loops are the
public-domain kind every pop song shares; every tune on top is the seed's.

**The sound chips.** A score says which notes to play; the era says what plays
them. The C64, the arcade, the handheld and the later eras use SEEDSCENE's
own synthesizer, as before. The others play the same score on the sound of
their machine:

| era | chip | how it sounds |
|---|---|---|
| `amiga` | **Paula** | every instrument sampled once, as a tracker musician would, cut to 8 bits at about 16.7 kHz (the drums at 28 kHz) and played back by stepping through the sample faster or slower with no smoothing — the grain and the aliasing of a MOD. Sustained sounds loop. Drums and lead hard left, bass and chords hard right, through the A500's output filter, almost dry. |
| `dos` | **Sound Blaster 16 (OPL3)** or **AWE32**, by the seed | OPL3: two-operator FM with the chip's seven waveforms and operator feedback, FM drums, and dry, like a DOS game. AWE32: wavetable instruments — a grand piano, string and brass sections, a choir, plucked bass and guitar, an acoustic kit — with the card's chorus and reverb. |
| `console` | **AWE32-style wavetable** | the sampled sound of the CD-era consoles |

Hear all twenty-eight back to back, each on the chips of its eras:

```bash
npm run sampler        # → out/music-sampler.mp3
```

And check them as music, from their scores - the harmony, the melody, the
grid, the mix - all of them or one at a time ([the review](docs/MUSIC-REVIEW.md),
[the latest audit](docs/MUSIC-AUDIT.md)):

```bash
npm run audit:music -- keygen
```

## The About part

Press **`A`** in live mode and SEEDSCENE plays its own demo about itself — the
part every production saved for the credits: a bouncing rainbow logo, a
greetings scroller racing along the top, pages slamming in on the beat, a
giant sine scroller with its reflection, raster bars over a spinning
checkerboard tunnel, and its own happy-hardcore soundtrack. `A` again drops
you back into your demo exactly where you left it.

## The promise: same seed, same demo

Not "similar". **Identical, byte for byte.** Every random choice is drawn from
a seeded generator; the synth counts in samples, not in clock time; the
renderer steps frame by frame and draws in software, so your graphics card
cannot change a pixel. THE JOURNEY and AUTOPLAY keep the same promise.

```bash
npm test     # renders the same seed twice and compares the files
```

That is what makes a seed worth sharing.

## For the tinkerers

Everything is web technology: WebGL2 fragment shaders for the scenes, a post
pass that draws each era's screen, an AudioWorklet for live sound, headless
Chrome and ffmpeg for the mp4. The visuals never listen to the audio — the
composer hands them each instrument's envelope directly — so the zoom lands on
exactly the frame the kick does, live or rendered.

```
seed ──> scene · era · music ──> composeScore ──┬──> Synth     ──> samples  ──> speakers / wav
                                                └──> Features  ──> uniforms ──> scene at the era's resolution
                                                                               ──> era screen ──> pixels
```

<details>
<summary><b>All command-line options</b></summary>

```
seedscene live    [options]     run it in a browser, in real time
seedscene render  [options]     render a demo to an mp4 file
seedscene journey [options]     render THE JOURNEY to an mp4 file
seedscene autoplay [options]    render AUTOPLAY to an mp4 file, as long as you like
seedscene scenes                list the eras, scenes and music styles
seedscene info    [options]     show what a seed composes
```

| option | meaning | default |
|---|---|---|
| `--seed <word>` | anything at all; the same word always gives the same demo | random |
| `--scene <name>` | one of the forty-five scenes (`--style`, its old name, works too) | chosen by the seed - one of the era's, if the era is given |
| `--era <name>` | `auto` `arcade` `c64` `amiga` `dos` `console` `handheld` `y2k` `modern` | an era the scene belongs to |
| `--music <name>` | `auto` or one of the twenty-eight styles | music of the era |
| `--res <WxH\|preset>` | `854x480`, or `240p` `360p` `480p` `576p` `720p` `1080p` | `480p` |
| `--duration <seconds>` | length | 30 render, 180 live, 128 journey, 600 autoplay |
| `--born <year>` | autoplay: open in the era you were twelve in, and stay near it | — |
| `--greets "A, B"` | names to greet in the scroller and the cracktro, up to eight | — |
| `--fps <n>` | frames per second | 30 |
| `--out <file.mp4>` | output path | `out/<seed>-<scene>.mp4` |
| `--crf <n>` | h.264 quality, lower is better | 18 |
| `--format <png\|jpeg>` | frame transfer format; jpeg is faster | png |
| `--gpu` | draw on the GPU: faster, but no longer identical across machines | off |
| `--no-overlay` | drop the title plate and the scroller | — |
| `--no-intro` | live mode: skip the LOAD sequence, straight to `READY.` | — |
| `--mute` | live mode: start with the sound off, to watch only (`V` turns it on) | — |
| `--port <n>` / `--no-open` | live server port; don't launch a browser | 8787 |

Run `npm link` once to type `seedscene` instead of `node bin/seedscene.js`.

</details>

<details>
<summary><b>Put it on the web</b></summary>

The live demo is a static site: nothing runs on the server. Build it and copy
the folder to any host that serves files — GitHub Pages, Netlify, an S3
bucket, nginx — at its root or in a subfolder:

```bash
npm run build:web
```

That writes `dist/` (about 500 KB, no build step, no dependencies). Its
`index.html` opens the live page: a visitor arriving with no seed of their own
gets the seed `seedscene`, straight into AUTOPLAY. A link with a seed opens
that seed's demo instead, and every setting of the live page works in the
address the same way (`?seed=aurora&scene=cracktro`, `&autoplay=1` to start in
AUTOPLAY, `&journey=1` in THE JOURNEY, `&born=1985` born in a year,
`#greets=ANA,LUIS` with greetings, `&sound=0` to start silent); the address keeps what the viewer
changes, so a reload or a shared link brings back the same demo.

On GitHub, publishing a release does all of it: a workflow checks the
same-seed promise, builds the site and deploys it to GitHub Pages — see
[docs/DEPLOY.md](docs/DEPLOY.md). The sound needs HTTPS: browsers allow the audio
worklet only on secure pages (or on `localhost`).

</details>

<details>
<summary><b>What's in the box</b></summary>

```
bin/seedscene.js      the command line
src/brand.js          the logo, the name and the About part texts
src/core/eras.js      the eight eras: resolution, palette, dither, screen
src/core/choose.js    what 'auto' means: scene, then era, then music
src/core/journey.js   THE JOURNEY and AUTOPLAY: tracks mixed beat on beat
src/core/sims.js      the games under the game scenes, and the scenes that move with the music
src/core/rng.js       seeded random streams
src/core/music.js     composer, twenty-eight styles, synthesizer, feature track
src/core/chips.js     the sound chips: Paula, OPL3, AWE32
src/core/visual.js    renderer, palette, title plate, scroller, era cards
src/core/gl.js        WebGL2 helpers
src/styles/index.js   the forty-five scenes, the 3D stage, the About part, the era screen
src/app.js            ties the music and the picture together
web/index.html        the live page
web/boot.js           the C64 boot screen
web/menu.js           the SETUP menu
web/live.js           real-time loop, locked to the synth clock
web/worklet.js        AudioWorklet host for the synth
web/render.html       the page headless Chrome draws into
tools/render.js       audio + frames + ffmpeg → mp4
tools/gallery.js      regenerates the images on this page (npm run gallery)
tools/sampler.js      every music style in one mp3 (npm run sampler)
tools/music-audit.js  every music style checked as music (npm run audit:music)
tools/server.js       local static server
tools/build-web.js    the live demo as a static site (npm run build:web)
.github/workflows/    publishing the site to GitHub Pages on each release
test/determinism.mjs  the same-seed promise, checked
SEEDSCENE.NFO         the release notes, the way they used to be written
```

Node 18+. `npm install` brings its own Chromium and its own ffmpeg; nothing
else to install.

</details>

## Built with agent-plugins

SEEDSCENE was written end to end by Claude, in Claude Code, with the ten
self-monitoring plugins from
**[3dgiordano/agent-plugins](https://github.com/3dgiordano/agent-plugins)**
running the whole time — with the
[v0.20.0](https://github.com/3dgiordano/agent-plugins/releases/tag/v0.20.0)
release installed for the finish of v0.2. They are what made the agent *watch* its own demos instead of
trusting its code: that is how broken effects were caught in rendered frames,
from metaballs that never merged to a dot tunnel that vanished in four shades
of green, and how a live-mode glitch was traced to two synths fighting over
one clock.

The exact plugin set for each version, with commits and what each plugin
caught, is on record in [docs/AGENT-PLUGINS.md](docs/AGENT-PLUGINS.md).
How each version was built, with token counts and cost, is in the build
reports: [v0.2](docs/BUILD-REPORT-v0.2.md) · [v0.1](docs/BUILD-REPORT-v0.1.md).

```bash
claude plugin marketplace add 3dgiordano/agent-plugins
```

## Greetings

To everyone who ever dropped a coin and pressed start. To everyone who ever typed `LOAD` and waited. To everyone who ever inserted
disk 2. To the trackers and the people who made them sing. To every coder
still up at 3 a.m. chasing one more frame — on a C64, an Amiga, a 486, a
handheld, or a GPU. To the kids about to type their name and see their first
demo.

**Keep the scene alive.**

---

<sub>v0.2 · [MIT license](LICENSE) · [changelog](CHANGELOG.md) · [release .NFO](SEEDSCENE.NFO) · build reports [v0.2](docs/BUILD-REPORT-v0.2.md) · [v0.1](docs/BUILD-REPORT-v0.1.md) · [agent plugins](docs/AGENT-PLUGINS.md)</sub>
