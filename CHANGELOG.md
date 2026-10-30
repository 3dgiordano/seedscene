# Changelog

## 0.2.0 — in development

The release that turns the tool into **SEEDSCENE**: a name, a personality,
a Commodore 64 front door, eight eras of computing from the 1979 arcade to
now, twenty-four styles of music, an endless AUTOPLAY channel, and a live mode you
can drive entirely from the keyboard.

### Added

- **Eras.** Eight screens a demo can be seen through — `arcade` (1979), `c64` (1982),
  `amiga` (1990), `dos` (1994), `console` (1997), `handheld` (1998),
  `y2k` (2002) and `modern` (2024) — each with its own resolution, palette,
  dither and display: the arcade monitor's few bright colours and heavy
  bloom, the C64's 16 colours and double-wide pixels, the
  Amiga's 12-bit banding, VGA's 256-colour dither, the 32-bit consoles'
  15-bit dither on composite, four LCD greens, the 64k-intro glow, modern
  grain. `--era`, `E` and `1`–`8` live, or `auto`: the seed picks an era the
  scene belongs to, then music of that era.
- **THE JOURNEY** (`T` live, `seedscene journey` for an mp4): a trackmo
  through all eight eras, oldest first — each part with its own scene and
  music at its own tempo, opened by a card with the line its machine would
  have greeted you with. Each era's music mixes into the next, deterministic like
  everything else.
- **AUTOPLAY** (`O` live, `seedscene autoplay` for an mp4 of any length up
  to ten hours): an endless channel — a new track every forty seconds, three
  in an era, then another era. Inside each track the scene cuts where the
  music turns, on the drop and on the crash that opens a phrase, so a track
  plays two or three of its era's scenes, in a fresh order every block, never
  the same pairing twice in a row. Era cards open each era; a NOW PLAYING
  lower third opens every other track. The tracks mix into each other like a
  DJ set: the next one is composed ahead, its first bars overlap the last bars
  of the outgoing one beat on beat, on a tempo that glides between the two;
  it comes in with its lows filtered away, the basslines swap halfway, and
  the old track fades behind a closing filter. `space` / `←` `→` skip
  forward and back, in THE JOURNEY too. Live, it drops in somewhere new each time `O` is
  pressed; a rendered mp4 is the seed's, the same every time.
- **Six game-inspired scenes for the arcade**, homages drawn from maths
  alone: `paddles` (neon paddles, a ball that hits on every beat, sparks,
  seven-segment scores), `invaders` (a seed-made formation marching on the
  beat, a saucer, a cannon on the backbeat), `rocks` (vector boulders and a
  turning ship in phosphor lines), `maze` (a chomper lapping a mirrored
  neon maze, wisps that flee after a power dot), `bricks` (a neon wall
  knocked down and rebuilt) and `lightcycles` (riders leaving walls of
  light on a neon grid). They also appear in the C64, Amiga, console,
  handheld, Y2K and modern eras.
- **The stage.** The flat game scenes now play on a board floating in
  space, with a camera that rides the music: a new angle every eight bars, a
  punch in on the kick, a lean on the snare, a neon frame that breathes with
  the bass — and a zoom blur and flash on every kick for all the game scenes.
- **Games that really play.** The maze, the snake, the rocks and the
  starfighter run as small deterministic simulations locked to the beat
  (`src/core/sims.js`). The chomper hunts the nearest dot and dodges, three
  wisps chase it each in their own way and flee after a power dot, and a
  cleared maze becomes a new one. The snake steers for its food, grows, and
  bursts when it boxes itself in. The rock ship flies, dodges, leads its
  target and fires on the eighths; big rocks break in two, small ones burst,
  a cleared field brings a bigger wave, and a rock that gets through takes the
  ship apart. The starfighter slides over and turns its nose onto a drone,
  with two sights ahead of it showing where it points, and fires along the
  nose once they are on; the drones fire back on the backbeat, the ship slides
  out of the way of the shots it sees, and one that lands shakes it and
  flashes the screen once. Same seed, same game.
- **Games on the music's grid.** Paddles, invaders and bricks are planned
  move by move on the bars, beats and accents of the score they play to (the
  score now names its accent bars and its sixteenths a bar). Every paddle
  return lands on a beat, and on an accent the receiving paddle misses and is
  blown apart on that note, the other side scores, the winner serves on the
  next bar. The invaders' cannon times its shots so each alien bursts on a
  beat; a saucer crossing before an accent goes down on it. The bricks
  ball flies each stretch at the speed that lands it on the next eighth or
  sixteenth, so every brick breaks on the rhythm; the paddle aims each return
  at a brick or a new angle; later walls come with holes and a silver row
  that takes two hits. In lightcycles four riders fly across the grid,
  two cells a sixteenth, trailing walls of light that thin towards their
  tails; they turn on the beat and dodge between beats. A rider goes down only
  where the music turns: two beats before a phrase opens (or an accent) the
  game sends one into another rider's wall, timing its speed so the crash
  lands on the downbeat, and its wall derezzes; the last one riding wins the
  round.
- **Three more game homages**: `snake`, `boxer` (a title fight between
  two boxing robots, raymarched in 3D and staged like the console boxing
  classics. Every two bars the challenger picks a move on the beat - a hook
  or an uppercut with a tell in his visor, a flurry of jabs, a showboat
  pounding his gloves and waving you in, or weaving so your jabs find air.
  Yours, drawn see-through in green glass so the whole show stays in view,
  blocks, slips sideways and punishes on the eighths. On the downbeat where
  a phrase opens on a crash the star punch lands: his visor goes dark, his
  knees give, his arms hang and he crumples to the canvas while yours walks
  to a neutral corner and the count goes up on the beats, then he reboots and
  gets back up) and `starfighter` (an on-rails run through
  space and over a planet in flat-shaded polygons, seen from a camera riding
  above and behind it: sights, lasers fired along the nose, drones that shoot
  back and rings on the bar).
- **Star Pilot** (`starpilot`), a 16-bit space-opera style: driving octave
  bass, a brass hook, orchestra hits with timpani, lasers in key.
- **Seven new scenes**, homages written from scratch: `shadebobs`,
  `vectorballs` (morphing between formations), `dottunnel`, `fireworks`
  (a burst on every backbeat), `ripple` (drops on the beat), `outrun` (the
  synthwave sunset) and `morph` (a raymarched solid melting between shapes).
- **The name SEEDSCENE** (*seed* + *demoscene*) and its command,
  `seedscene`, replacing the working name `music-gen-video` and `mgv`.
- **Sound chips by era.** The same score plays on the sound of its machine:
  Paula's 8-bit samples on the Amiga (every instrument sampled once, played
  back with no smoothing, hard-panned, almost dry), a Sound Blaster 16's
  two-operator FM or an AWE32's wavetable with chorus and reverb in DOS (the
  seed picks the card), wavetable on the 32-bit consoles. The C64, arcade,
  handheld and later eras keep the synthesizer's own voices, note for note.
- **Three sound-card styles**: `modjazz` (tracker jazz: a walking slap bass,
  electric-piano comping, a flute, a swinging ride), `fmmetal` (palm-muted
  power chords, a double kick, a soloing guitar) and `midiquest` (strings, a
  harp, a flute and timpani for an adventure), with five new instruments:
  overdriven guitar, flute, harp, electric piano and slap bass.
- **The fire** (`fire`, DOS): the classic 256-colour fire of the DOS demos —
  tongues of flame rising through the fire palette, leaping on the kick,
  sparks flying up on the snare and the hats, and at the peak of the music a
  seed-made emblem catching fire. Some seeds burn blue, like a gas flame. The
  first piece of the v0.2 plan (`docs/PLAN-v0.2.md`).
- **Kefrens bars** (`kefrens`, Amiga): a shaded bar on every raster line,
  drawn into a line that is never cleared, so the bars pile up into a weaving
  ribbon — wider on the bass, fatter and brighter on the kick, its colours
  turning with the bars of the music, a copper bar rolling behind it on the
  beat.
- **The bouncing checkered ball** (`ball`, Amiga): the Amiga's first and most
  famous demo — the red and white ball spinning on its tilted axis, bouncing
  from wall to wall of a grid room, its shadow on the back wall; it lands on
  every beat, spins faster as the music builds, and the room lights up on
  the kick.
- **Interference rings** (`rings`, Amiga and DOS): two sets of rings drifting
  through each other, every crossing flipping the colour — the moiré that
  seems to move on its own. They run outward on the kick, tighten on the
  bass, and a third set joins in when the music peaks. The dark colour is
  never black, and nothing flashes the whole screen.
- **The LCD juggler** (`lcd`, arcade): the juggling LCD handheld of 1980, the
  whole device — brushed silver in a maroon case, two big round red buttons
  with their arrows, three small ones, the grey screen in its red border —
  and on it a juggler in black segments, arms straight out with open hands,
  balls hopping cell by cell along their arcs and landing in a hand on the
  beat (the inner ball every beat, the middle every two, the outer every
  three once the music picks up); the side button goes down for each catch,
  and the score counts them. No brand name or logo.
- **The scanner car** (`scanner`, arcade): the talking car of 80s television,
  as an idea — a long, low black car coming down a night road, the red light
  in its nose sweeping left and right, one pass on every beat with a trail
  fading behind it; the road rushes faster as the music builds and the
  headlamps glow on the kick. No name, no logo, no design of the original.
- **The footsteps** (`footsteps`, 32-bit console): the dinosaur films' most
  famous warning, as an idea — two short plastic cups of water on a car's
  dashboard at night in the rain, the water trembling into rings with every
  footstep (the left cup on the kick, the right on the snare), the rings
  deeper with the bass, and at the peak the light dropping as something huge
  goes by. Nothing of the animal is shown.
- **The twister** (`twister`, Amiga): the twisted bar of the Amiga and Atari
  ST demos — a square column of block-textured faces, each lit by the angle
  it turns to the viewer, twisting up the screen. The twist winds up as the
  music builds and unwinds after, the bar snaps a quarter turn on the kick,
  the faces' pattern pulses with the hats, and at the peak two more twisters
  join it.
- **The pyramid hopper** (`pyramid`, arcade): the cube-pyramid game of the
  1982 arcades — twenty-eight cubes in seven rows whose tops change colour as
  they are landed on, rainbow discs floating at the sides, red balls
  bouncing down, the score and the colour to change to in the corner. The
  hopper is a round green one of its own, not the original character; it
  lands on every beat, the balls drop in every two bars, the discs turn with
  the hats, and each round brings its own colours.
- **The 3D pipes** (`pipes`, DOS): the screensaver of the mid-90s office PC,
  seen from above at an angle — on black, shiny pipes of solid colours
  growing cell by cell through a deep grid, never into a cell another pipe
  holds, turning at right angles on the eighth notes, mostly with a smooth
  elbow and now and then a ball joint that swells on the kick. Each pipe
  decides its next cell ahead, so a bend forms exactly where the growing tip
  was. The first pipes start at the back of the grid and the later ones
  nearer, so the tangle fills the screen from the distance forwards; for
  sixteen bars it grows until the screen is saturated, then it dissolves in
  blocks through the last bar (never a flash) and a new tangle grows under a
  new camera angle. The camera punches in on the kick with the game scenes'
  zoom blur and leans on the snare.
- **Unlimited bobs** (`bobs`, Amiga): the Amiga and Atari ST trick, done as
  the machines did it - a few screens shown in turn and never cleared, one
  shaded ball drawn each frame on the screen about to be shown - so a chain
  of balls seems to slide along behind its head, tracing its path. Our turn
  on it: the head runs on the music's clock, surging ahead on the kick and on
  the pitched hits (the stabs, the lead, the arpeggio) and gliding between
  them, so the chain keeps time with the track, the balls evenly spaced
  along it; an older ball recedes into the distance and fades, so the chain
  flows away into the depth and never ends; on the kick it swells, most at
  the head, and settles back, and on the snare it lightens for a moment; each
  bar draws its own colour; the screen punches in on the kick, with the game
  scenes' zoom blur, and shakes with the bass. A twin chain runs the same
  figure the other way round, in the other colours, so the two cross and
  weave a knot as they pass.
- **The dual chessboard** (`dualchess`, Amiga): a chessboard on each of the
  Amiga's bitplanes, each zooming slowly between big squares and small ones,
  by ratio so no squares stream past at the edges, the palette giving every overlap of squares its own shade (after
  Nuance's Dual Chess and Sanity's Quarters Chess Board). Two modes, a phrase
  each: the layers sliding sideways past each other at their own speeds; then
  the boards turning slowly on their own axes against each other, a quarter
  turn a notch on each beat, breaking into moiré, square again for the next. The
  first board's squares punch in on the kick; the second breathes on the snare and slides
  with the bass; a third fades in for the second half of each phrase; each
  phrase brings its own colour, coming in over a beat; the screen shakes with
  the bass.
- **The chessboard floor** (`chessfloor`, Amiga): the chessboard of the Amiga
  intros seen from above in perspective and turning beneath you, its corners
  swinging out over the black, the sky in copper bands, and a red cube over
  it (after Quadriga's Chessboard intro). Ours: the board is a surface that
  waves in 3D - a slow swell that grows with the bass, and every time the
  cube lands, its corner on the surface, the board gives under it and a ring
  of waves runs out from under it and dies away; the board turns in lurches
  on the beat. The cube moves smoothly: its spin speeds up as the rhythm gets
  busy and slows as it thins, and each hop's height is set as it leaves the
  board, higher as the music builds. And the touches the demos of the time
  used: the cube mirrored in the board, faint and broken by the waves; glints
  on the wave crests; the board catching the sky towards the horizon; a glow
  round the cube; a bright copper line at the horizon.
- **The rubber vector** (`rubber`, Amiga): a flat-shaded cube turning, its
  lower part lagging behind its top, so it bends and wobbles like a block of
  jelly - each line of the screen shows the cube as it was a moment before,
  the lower the older, as the demos did with copies of the cube. Each kick
  gives the spin a shove that dies away, so the jolt runs down the cube like a
  wave through jelly; the snare tips it on a spring and flashes its light;
  the screen punches in on the kick, with the zoom blur, and shakes with the
  bass; the copper bars behind flare on the kick and widen with the bass, a
  third joining them when the music peaks. The cube is grey, as the
  original's; the colour is the bars'.
- **The bump-mapped logo** (`bumplogo`, DOS): an emblem raised out of rough
  stone, lit by moving coloured lights so it reads as embossed metal, done in
  2D as the mid-90s PC demos did - each pixel's slope shifts where the light
  is looked up, and the light is added to the picture - on a plate seen at an
  angle, the camera leaning slowly round it, the shadows a flat deep blue
  rather than black. The lights circle the
  emblem and flare wider on the snare; the relief deepens on the kick, the
  screen punching in with it and shaking with the bass; a third light joins
  them in the second half of each phrase; each phrase brings its own colours.
- **The cracktro** (`cracktro`, Amiga): the crack intro of the Amiga years
  and its starfield - a field of stars in depth that the viewer flies
  through, drifting sideways with the near stars sliding past faster than the
  far ones, then diving forward or pulling back, each star with a short
  trail. The music steers the flight: a new heading every two bars, faster as
  the music builds, a surge on each kick; the stars twinkle with the hats.
  In the last two bars of each phrase, a warp into the next: forward, the
  stars stretching into lines out of the middle as the jump to hyperspace
  did, or sideways into long streaks - white at the head, blue down the
  tail, each star with a glow. It
  opens with the intro - a chrome SEEDSCENE logo bouncing on the beat over
  rainbow copper lines, and pages typing in, in a 5x7 bitmap font of the
  time: what this is, and thanks to 3dgiordano and the SEEDSCENE community -
  which then fades away and leaves the stars.
- **The starfighter, against the console original.** Six screenshots of the
  16-bit classic were the reference. White streaks that crossed the screen
  from below are gone: they were background stars passing too close to the
  camera. The ship is a white fighter with tall blue fins at its wing tips,
  the drones are red delta-wing fighters banking as they weave, space is
  points of light that stretch into a warp at each new sector, the planet
  has snowy mountains, clouds, stone arches and the ship's shadow on the
  ground, and a red shield bar drops when a shot lands. Nothing flashes the
  whole screen any more — neither the new sector nor the ring.
- **Mixes without dropouts.** The audio thread does less per sample (no
  allocations, cached pitches and filter coefficients), and the next track is
  composed a slice per audio block while only one track plays, never all at
  once in the middle of a mix. The sound is the same, bit for bit.
- **Twenty-four music styles**, chosen by the era or with `--music`:
  `chiptune` (C64 SID), `newbeat`, `rave` (Amiga, 1992), `orchestral`
  (tracker strings, choir, timpani, brass), `dreamwave`, `acid` (303),
  `gabber`, `ambient`, `eurodance`, `jungle`, `heroic` (game soundtrack),
  `gameboy` (handheld chip), `trance`, `hardcore`, `synthwave`, `arcade`
  (attract-mode bleeps with zaps, blips and explosions in key), `cyborg` (a
  mid-80s machine score in an odd 13-step metre), `derelict` (deep-space
  dread: drones and a heartbeat), `synthpop` (the 80s chart single) and
  `rocknroll` (a 50s shuffle on a sound chip, twelve-bar). Each has
  its own drums, bass, chords, lead and mix, arranged with builds, risers,
  rolls and crashes into the drop. All synthesized: 909, gabber and break
  kits, a gated snare, claps, a 303, EBM and reese basses, hoovers,
  supersaws, a rave piano, a house organ, strings, choir, timpani, brass, FM
  bells, SID pulses, 50 Hz arpeggio chords, a 4-bit wave channel, struck
  anvils, laser zaps, coin blips, explosions and drones. The newest five are
  built round a **hook**: a two-bar call and answer written by the seed that
  lands on the chord on the strong beats and resolves every fourth bar. No
  melody is taken from any song, film or game.
- `npm run sampler`: every music style back to back in one mp3.
- **A Commodore 64 boot screen** in front of live mode: `READY.`, a typed
  `LOAD "<SEED>",8,1`, the striped loading border (while the shaders really
  compile), a key press to `RUN`, a datasette chirp and a CRT switch-off into
  the demo. `--no-intro` skips straight to `READY.`
- **The About part** (`A`): SEEDSCENE's own demo about itself — bouncing
  rainbow logo, greetings scroller, pages that slam in on the beat, a
  mirrored sine scroller, raster bars over a checkerboard tunnel, and its own
  soundtrack. `A` again returns to your demo untouched.
- **A C64-style SETUP menu** (`M`): type any seed, and change the scene,
  music, resolution, length and titles/scroller while the demo plays. It
  copies the live or mp4 command that reproduces what is on screen. Settings
  live in the page address, so a reload keeps them.
- **New live keys**: `space` and `←` `→` for scenes, `↑` `↓` for the music,
  `E` and `1`–`8` for eras, `O` for AUTOPLAY, `T` for THE JOURNEY, `S` new seed, `P` pause,
  `F` fullscreen, `I` info panel — and `H` to see every key on screen. A short notice
  confirms each change; a corner reminder says where the keys are.
- The scroller opens with "SEEDSCENE PRESENTS …" and names the music style;
  its key hints appear only in live mode, never in a rendered mp4.
- An ASCII-art logo on the CLI help screen and a release `SEEDSCENE.NFO`.
- **A static site of the live demo.** `npm run build:web` writes `dist/`, the
  live page and the code it loads and nothing else, ready to copy to any
  static host, at its root or in a subfolder. A visitor arriving with no seed
  of their own gets the seed `seedscene`, straight into AUTOPLAY; a link with
  a seed opens that demo. The live page takes `autoplay=1` in its address
  and keeps it there, as it keeps every setting. The sound needs HTTPS.
- **An MIT `LICENSE` file**, as `package.json` already declared, so GitHub
  shows the repository's license.
- **Published on each release.** A GitHub Actions workflow builds the static
  site and deploys it to GitHub Pages when a release is published (or when
  run by hand), after checking the release's tag matches `package.json` and
  that the quick tests - the same-seed promise - pass. No `gh-pages` branch:
  the source stays on `main`; `.gitignore` keeps out the dependencies, the
  renders, the built site, logs, caches, secrets and one person's settings,
  and `.gitattributes` keeps text as LF on every machine. Setting it up and
  releasing: `docs/DEPLOY.md`.
- **The live page survives a GPU reset.** If the browser takes the GPU away
  (a driver reset, waking from sleep), the page says so and, when the GPU
  comes back, reloads at READY with the same demo - every choice is in the
  page address - instead of staying black.
- **Sound off.** `V` in live mode, a SOUND row in the SETUP menu, and
  `seedscene live --mute` to start silent: the demo plays on with no sound -
  the synth still runs as the picture's clock, so everything stays on the
  beat. The choice is kept in the page address and in the copied live command.
- A README gallery — a still and a seed for every scene, an animated tour,
  the arcade scenes in motion and a GIF of the boot screen — regenerated with
  `npm run gallery`.

### Changed

- **A seed keeps its scene as scenes are added.** A seed used to pick its
  scene from the list by position, so every new scene moved about half the
  seeds to another scene. Now each scene gets its own score from the seed
  and the seed takes the one it favours most: a new scene takes only the
  seeds that favour it (one in thirty-two today). THE JOURNEY picks each
  era's scene the same way. This reorders the seeds once, now.
- **Every game scene floats.** The robot title fight, the space run and the
  cube pyramid now play on the floating board the flat games use, with its
  camera moves on the music and the zoom blur on the kick. The LCD juggler,
  a game that is a device of its own, floats as the whole device, with space
  round it.
- **The starfighter's drones come from the horizon.** They showed first low on
  the screen, over the planet out of the ground, and dived below the ship.
  Now a flight shows first far off: over the planet as specks just above the
  horizon, never out of the ground; in space anywhere in the distance, half
  the flights sweeping in from a side; as they near they come down to the
  ship's height to pass round it, out of the haze. No barrel roll turns their
  shots away any more: the ship slides out of the way of the shots it sees,
  and a shot that lands shakes the ship, jolts the camera and flashes the
  screen once - a single flash, never two back to back.
- **The pyramid is played.** It is a simulation of the game now
  (`src/core/sims.js`): the hopper hops a cube a beat to turn every top,
  heading for the tops still to turn and away from danger; the enemies come
  down between the beats, as in the arcade - red balls dropping onto the
  second row and bouncing down at random until they fall off the bottom, a
  purple egg that bounces to the bottom row and hatches into the coiled
  snake, which chases. A ball or the snake on the hopper's cube is a hit: it
  stops and swears in a balloon, the board is cleared and it goes on from
  where it stood. With the snake close behind it jumps onto the disc beside
  the third row and rides it to the top, and the snake, following, falls off
  the edge. All tops turned wins the round. On top of the game, the music:
  the pyramid builds itself from the bottom up, a row on each eighth note;
  the hopper crouches before it leaves, stretches in the air and squashes as
  it lands on the beat, and each landing sends a ripple through the cubes; a
  won round is a wave of jumping cubes and running colours before the
  pyramid falls away for the next one.
- `space` no longer pauses; it moves to the next scene. Pause is `P`.
- `H` now shows every key; the info panel moved to `I` and fades out by
  itself after six seconds.
- The number keys now pick an era instead of a scene: there are twenty-two
  scenes now, and eight eras.
- The maze no longer runs laps of its outer lane: it is a game now.
- THE JOURNEY now starts in 1979, at the arcade, and runs 16 seconds per era
  by default (128 s).
- The CRT finish became the era screen: the same scene looks the way its
  machine would have shown it.
- Scale names read naturally ("harmonic minor", not "HARMONICMINOR").

### Fixed

- Pressing `S` for a new seed left the old synth running, and both fought
  over the visual clock: titles overlapped and flickered, worse with each
  press.
- Every render printed a misleading "404" warning for a missing favicon.
- The mp4 soundtrack could clip: the AAC encoder rebuilt peaks up to ~6 dB
  above the source on bright drums (57 clipped samples in 160 s of
  AUTOPLAY). The soundtrack is now encoded 5 dB lower, with the encoder's
  noise substitution off, which made its peaks unpredictable. Peaks now stay
  at −1.9 dBFS or below across every style. Rendered mp4s are 5 dB quieter
  than before; the live sound is unchanged.

### Built with

- Claude Code 2.1.309, Claude Opus 5.5, effort high.
- The ten self-monitoring plugins from
  [3dgiordano/agent-plugins](https://github.com/3dgiordano/agent-plugins),
  updated to release v0.20.0 during development. Versions, commits and what
  each one caught are in [docs/AGENT-PLUGINS.md](docs/AGENT-PLUGINS.md).

See [docs/BUILD-REPORT-v0.2.md](docs/BUILD-REPORT-v0.2.md).

## 0.1.0 — 2026-10-27

The first version, built under the working name `music-gen-video`.

### Added

- `mgv render`: seed + resolution + style → mp4 (h.264 + AAC), rendered
  offline in headless Chrome and muxed with a vendored ffmpeg.
- `mgv live`: real-time playback in the browser, with the visuals locked to
  the synth's sample clock. Keys: `space` pause, `F` fullscreen, `1`–`6`
  style, `S` new seed, `H` info panel.
- `mgv styles` and `mgv info`.
- Six demoscene styles: `plasma`, `tunnel`, `metaballs`, `starfield`,
  `copper`, `fractal`, all through a shared CRT post pass, with a title plate
  and a sine scroller.
- A generative composer (tempo, key and mode, chord progression, euclidean
  drums, walking bass, arpeggio, motif-based lead, a full arrangement) and an
  eight-instrument JavaScript synthesizer.
- Deterministic output: one seed produces one byte-identical mp4.
  `npm test` checks it with two full renders.
- `--gpu` to render on the GPU instead of SwiftShader (faster, but no longer
  identical across machines).

### Known limitations

- Rendering runs slower than real time under SwiftShader (~6× clip length at
  854×480).
- The tunnel's depth shading is flat, and the copper floor aliases near the
  bottom edge.
- Live mode assumes a 44.1 kHz audio device.

### Built with

- Claude Code 2.1.309, Claude Opus 5.5, effort high.
- The ten self-monitoring plugins from
  [3dgiordano/agent-plugins](https://github.com/3dgiordano/agent-plugins).
  Versions and commits in [docs/AGENT-PLUGINS.md](docs/AGENT-PLUGINS.md).

See [docs/BUILD-REPORT-v0.1.md](docs/BUILD-REPORT-v0.1.md).
