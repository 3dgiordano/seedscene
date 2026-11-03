# Changelog

## 0.2.0 — in development

The release that turns the tool into **SEEDSCENE**: a name, a personality,
a Commodore 64 front door, seven eras of computing from 1972 to now,
fifty-one scenes, thirty-five styles of music, sixteen displays and six
sound boards, an endless AUTOPLAY channel, and a live mode you
can drive entirely from the keyboard.

### Added

The eras named in the entries below are where each scene was first put; each
scene now has one era, a span of years (see **Eras are spans of years** and
**One era per scene** under Changed, and the README's scene table).

- **Eras.** Seven spans of years - 1972–1981, 1982–1989, 1990–1993,
  1994–1996, 1997–1999, 2000–2009, 2010–now - each with its scenes, its music
  and the display most of its things were seen on (see **Displays** under
  Changed). `--era` (by the year it starts, any year inside it, or its old
  machine name), `E` and `1`–`7` live, or `auto`: the seed picks an era the
  scene belongs to, then music of that era.
- **THE JOURNEY** (`T` live, `seedscene journey` for an mp4): a trackmo
  through every era with scenes of its own, oldest first — each part with up
  to three of its scenes and music at its own tempo, opened by a card with the
  line its machines would have greeted you with. Each era's music mixes into the next, deterministic like
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
  light on a neon grid). `paddles`, `invaders`, `rocks` and `maze` are of
  1972–1981; `bricks` and `lightcycles` of 1982–1989.
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
- **Sound chips.** The same score plays on the sound of a machine: Paula's
  8-bit samples (every instrument sampled once, played back with no
  smoothing, hard-panned, almost dry) in 1990–1993, a Sound Blaster 16's
  two-operator FM or an AWE32's wavetable with chorus and reverb in 1994–1996
  (the seed picks the card), wavetable in 1997–1999; the other eras keep the
  synthesizer's own voices, note for note. Which one a scene plays on is now
  its sound board (see **Sound boards** under Changed).
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
- **The bouncing checkered ball** (`ball`, Amiga): the ball of the Amiga's
  first demos — the red and white ball spinning on its tilted axis, bouncing
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
  headlamps glow on the kick. No name, no logo, no design of any one car.
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
  hopper is a round green one of its own, no character of the arcades; it
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
  by ratio so no squares stream past at the edges, the palette giving every overlap of squares its own shade (evoking
  the dual boards and the fluid zoom of the Amiga years' chessboard intros). Two modes, a phrase
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
  it (as the chessboard intros of the early 90s are remembered). Ours: the board is a surface that
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
  demos' cubes were; the colour is the bars'.
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
- **The card cascade** (`cascade`, Y2K): the end of the desktop card game,
  as the win screens of the 90s office PC are remembered - the four foundations
  emptying from the kings down, each card falling and bouncing off the bottom
  of the table and leaving a copy of itself at every step, never cleared: fast
  cards fan out in white edges with their red and black indices, slow ones
  pile their borders into black arches, and a card that has stopped bouncing
  slides along the bottom. On the music: a card leaves on every bar, and
  another halfway through the bar when the music is busy; each first lands on
  the beat, on the "and" or on the sixteenth between; the busier the music,
  the livelier the bounce; every phrase deals a new game. The Y2K era's glow
  and colour fringes are turned down for this scene, so the one-pixel edges
  stay black. After the owner's look, the effects: the table floats on the
  stage like the game scenes, punching in on the kick; the trails keep the
  music - the copies after a kick warm, after a snare cool, a band of colour
  for each hit - and older copies sink into the table; each card casts its
  shadow; its first landing throws up sparks and a flash along the floor; the
  felt is woven cloth breathing with the bass; and in the last bar of each
  phrase colour runs through every trail before the new deal.
- **The ANSI board** (`ansi`, DOS): the art of the bulletin boards, built
  from ANSI works of 1995 - VGA text mode in sixteen colours, pictures and
  block-letter logos of full and half blocks and the three shades, gradients
  down the artists' ramps, grey outlines, stars. All of it drawn by the seed,
  the texts about the project only. A line of the file arrives each beat, at
  about the speed of a 2400-baud modem, the screen scrolling smoothly as it fills;
  each phrase brings a part - a spaced-out header, a sunset or a night sky
  with its moon over a shaded land, a line about the music, and a logo
  (SEEDSCENE, the seed, the music) whose last line lands as the next phrase
  opens. The camera shows the whole screen on the drop, draws slowly nearer
  as the picture arrives - the lines already drawn kept in view - and eases
  back out over the logo so the drop shows it whole; the kick lights the
  letters as they arrive and punches the screen in,
  the snare sets the stars twinkling, and on the drop the logo cycles its
  colours.
- **The bouncing lines** (`echolines`, DOS): the screensaver of the early 90s,
  as it is remembered - two figures of four corners, each corner flying
  straight and bouncing off the edges of the screen, each figure drawn again
  at the moments just behind it in thin lines of one colour, a fan of echoes.
  On the music: the figures fly faster as it builds, with a shove on each kick
  and a burst as each phrase opens; the kick stretches the echoes apart and
  punches the screen; each snare hit moves the colours on; the busier the
  music, the more echoes, from six to fourteen.
- **The 3D maze** (`maze3d`, DOS): the maze screensaver of the mid-90s,
  as it is remembered - corridors of dark red bricks with pale mortar,
  a tan floor, a ceiling of white tiles, walked in first person through a maze
  of the seed's own with a hand on the wall, corners taken walking. A move
  every two beats, on the first and third of the bar; each kick a footfall
  that dips the view and punches the screen; the snare brightens the ceiling;
  as each phrase ends a grey stone spins on the path ahead, and on the drop
  the walk goes through it and the world turns upside down, until the next.
- **The moon bike** (`moonbike`, modern): the boy and his friend from the
  stars, as an idea, as the moon crossing of the early 80s is remembered - a deep blue
  night, a huge pale moon with its seas and a wisp of cloud, pines at the
  corners, and a bicycle crossing the moon in silhouette, the rider hunched
  over the bars with his cape flying and a bundle in a blanket in the basket.
  It always opens with the bicycle riding in; it crosses for four bars and
  is gone for two, turning round past the edge of the frame, then comes back
  the way it went - near and through the moon, then far and high; the
  camera pans after it and draws in as it crosses, the stars, the moon, a far
  forest and the corner pines each moving less the farther they are; the
  halo opens as it crosses; the wheels turn a turn a beat, the cape streams
  and ripples on the eighths, the kick lights the moon and
  punches the screen, the hats set the stars twinkling, and the snare sends a
  shooting star every other bar. A scene can now know when it came on, so
  a cut of AUTOPLAY opens it with its entrance; and the gallery can take a
  scene's still at its own moment.
- **The local server's front door works.** Its root address served the live
  page where the page's own relative paths could not resolve, so it never
  started; the root now sends the browser to `/web/index.html`, keeping the
  address's settings.
- **Scenes compile in the background.** The live page compiles every scene
  while its boot screen plays, two at a time, so showing one for the first
  time no longer stops the picture - the heaviest took seconds; renders are
  unchanged. The first scene starts compiling as soon as the boot screen is
  up, nothing competes with it, and the tape stripes run on until it is ready;
  the time car's, the boxing match's and the card cascade's shaders compile in
  a third of the time or less, with the same pictures; and the live page
  starts loading the first scene as soon as its boot screen is up.
- **Five more styles of the Amiga years**, homages to moods, never to tunes:
  `beast` (beast lands - tribal toms in a slow 6/8, a pan flute, a bowed drone
  on the tonic, a mysterious minor), `agony` (lament - a slow piano broken in
  eighths over strings, a lonely lead, the rain, a slow pulse), `ballad`
  (musicdisk ballad - a four-channel ballad, a lead singing with vibrato
  under A5 as a tracker's did, an arpeggio, a soft beat), `march` (jolly
  march - at 120, rudimental snare drags and rolls, an oom-pah tuba, a
  whistled tune, a dance beat under it when it gets going) and `bomb`
  (hip-hop blaster - a boom-bap break at 88-100, scratches, orchestra stabs,
  a lead chopped like a rap). All five play in 1990–1993; lament and the
  march in 1994–1996 too, and the march in 1997–1999. Each passes the music
  audit, the march's and the beast's flute with the warning the Amiga's one
  flute sample has had before; trip-hop's scratches are shared with the
  hip-hop blaster, and trip-hop stays note for note as it was. Put right
  after the first review by the reviewer below, which found what the owner
  heard: no dance-floor claps, riser or crash in the lament, the ballad or the
  tribal piece (the beast rolls on its toms; the march rolls its own snare in
  thirty-seconds; the hip-hop's rolls play straight on the grid); on the
  Amiga a tom sampled at its own pitch, a drone looped past its swell, the
  ballad's vibrato kept, the scratches played by hand rather than from one
  sample, and the march's tuba and chords on the right; the lament's lead a
  softer FM patch on the Sound Blaster, its piano an Alberti bass under it,
  the rain a steady wash; the oom-pah chords under the tune; the hip-hop's
  stab an accent every two bars, under the lead; a second rhythm for the
  beast's, the lament's and the rap's tunes. And after a second review, made
  with the reviewer's tools: that second rhythm given to the answering phrases
  (a coin each phrase left half the seeds with one rhythm); the beast's tune on
  the 6/8's eighths, its toms on the left, its tom rolls between the groove's
  toms; the march's kick with the tuba, softer, no riser before its drop; the
  ballad's and the rap's lead the soft FM patch on the Sound Blaster, where it
  fizzed; the ballad's arpeggio under its tune; the rap resting while the
  record is scratched; the lament's rain heard under the music. And the rap's
  dead air, heard by the owner - an empty first bar and eight seconds near
  silence in its breakdown, where every part stopped with the kick - filled by
  the DJ scratching alone before the beat and through the breakdown, softer
  than over the beat and a longer move each bar, never the last one again,
  with the last beat left open every other bar; over strings holding the
  chord in the middle of the keyboard.
- **The reviewer**: a subagent (`.claude/agents/music-reviewer.md`) that
  reviews every new or changed style from its score and its rendered audio
  before the owner listens, with a checklist of what the owner has heard by
  ear; and its tools, `npm run review:music -- layers|stack|spectrum|fills|probe|gaps
  <style>` - each part's register, density and grid, each layer's level,
  highs and time sounding, the lead in its own band, the accompaniment over
  the lead, an instrument's spectrum, the fills and how far off the grid,
  one event alone, the dead air where everything stops at once. Its first review found everything the owner heard in the
  five styles above. The music audit can now hold a style to a grid of
  thirty-seconds where its rolls mean it.
- **Italo disco** (`italo`), the 80s Italian dance floor next to synth-pop,
  from the genre's own guides: 115-125 bpm in a minor key, its i, VI and VII;
  an octave bass in sixteenths, the root and its octave in turn; an
  arpeggiator; a drum machine with hand claps on two and four and an open hat
  on the off-beat; a vocoder singing the tune - a buzzing carrier through a
  vowel's formants, steady as a machine's voice - over synth pads. In the
  1982–1989 era, on the synthesizer's own voices or the Atari ST's chip. It
  passes every check of the music audit.
- **The new scenes after the owner's look.** `sculpture`: the ball now
  travels through the arch's hole and the ring's and melts into them as it
  passes - the smooth-blending trick the scene is about - where before it
  bounced in place. `gimbal`: a light behind the rings, its shafts through the
  haze cut by the rings, and a lens flare; every colour the seed's. `coderain`:
  continuous falls that run until they leave the screen (they were cut on the
  rhythm), small glyphs in sheets of depth with focus, glow and transparency,
  white heads typing and leaving fading ghosts; then, at the owner's second
  look, no punch (it shook the fine glyphs), a camera moving slowly forward
  through the sheets, the flow gathering speed through each phrase, and a face
  in dark glasses woven of code revealed as each phrase opens - rising glyph by
  glyph with soft edges, its glasses - two full rounded ovals nearly as wide
  together as the face, half-way down the head - a place where the code is
  dimmed to about the hair's tone so the rain still shows through them, the head
  given a jaw and dark hair, no neck or shoulders; and in turn
  with the face, the seed and SEEDSCENE rise out of the rain the same way,
  coming towards the camera from far off, soft, sharpening, then fading and
  blurring as they come too near, and no tape tear along the bottom of this scene. The other five
  new scenes get the kick's zoom punch; the 3D ones a slowly drifting camera.
  `djdecks`: the decks and the mixer as they were, and round them now a club
  night - the booth with a lit edge, dancers below with their hands up over a
  floor of chasing tiles, moving heads throwing beams through drifting smoke,
  a laser fan, the mirror ball's spots, a strobe at the end of each phrase, and
  the lights flaring in the lens as each phrase opens; the camera moves as
  before, a little farther back.
- **Three scenes for the thin eras**, so every era has three of its own:
  `coderain` (1997–1999), falling green code as the cyberpunk screens of the
  time imagined it - glyphs of the seed's own, falls starting on the beat, seen
  on videotape; `gimbal` (2000–2009), the 64k intros of the time as the memory
  of them goes - steel rings turning a quarter on the beat round a metal
  core, in a hall of tiled bands and warm haze, letterboxed; and `djdecks`
  (2000–2009), two turntables and a mixer from above, the live deck changing
  each phrase, the crossfader sliding over, a scratch to end it. Each evokes
  its time, written from scratch: no titles, names or logos.
- **Shader art for 2010–now**, the era named for it, which had no scene:
  three scenes evoking the 2010s' fragment-shader art, written from scratch.
  `prism`, in the spirit of its tiny chromatic light pieces: a lattice of
  points of light pushed out by a wave, each colour a moment behind, a white
  star where they meet. `sculpture`, the raymarched still life: shapes of
  distance functions melting on a floor under a low sun, with soft shadows,
  penumbrae and ambient occlusion, a ball bouncing on the beat. `fractalflight`,
  a slow flight round the mandelbox (2010), written from its definition, the
  same pace whatever the tempo so the fractal can be seen. Each moves with the music. Synthwave, the era's own
  style, plays in THE JOURNEY and AUTOPLAY again, which no longer pass the era by.
- **The vector monitors**, two displays: `vector`, the black-and-white tube
  of the vector arcades of 1979, and `colorvector`, the colour tube of the
  years after. From how the beam and the phosphor work and the published
  instruction sets of the vector generators. A beam
  only draws lines, so the display traces any picture's lines and the outlines
  of what it fills, and leaves the inside of every shape unlit, black: a filled
  scene becomes its contours. The black-and-white tube draws them blue-white
  in sixteen intensities (the generator's four-bit field); the colour tube in
  seven colours - three guns, each on or off - at any intensity. A glow round
  every line, the brightest running to white; the tube's curvature, a very
  slight wobble across and the picture pumping a little with the bright
  things on it, never a flash. Its phosphor fades in a few milliseconds,
  under a frame, so nothing trails. `rocks` is seen through `vector` now (on
  AUTO); `D` live, `?display=`, `--display`.
- **The Commodore 64's sound chip, the SID** (the MOS 6581), a sixth sound
  board, from the chip's datasheet: three kinds of wave and noise on the PAL
  C64's clock - a pulse whose 12-bit width sweeps, a sawtooth, a triangle, and
  the 23-bit noise register (as reSID models it) - at the pitches its 16-bit
  frequencies allow; an envelope of 256 steps at the datasheet's sixteen rates,
  rising in a straight line and falling in a curve; the 6581's two-pole filter,
  low-, band- or high-pass with sixteen steps of resonance, its cutoff on a
  near-log scale, distorting a little; ring modulation for bells and hard sync
  for a sweeping lead. Written once a frame as the 50 Hz music player wrote
  it: chords as arpeggios on one voice, vibrato that waits, a filtered pulse
  bass, and drums from waveform tables - a frame of noise then a square
  falling in pitch for the kick, a punch of pulse then noise for the snare.
  It plays half the tracks of 1982–1989, the era seen on the C64's display;
  the YM2149 and the synthesizer's own voices the rest, by the seed;
  `--board sid`, `C` live.
- **The Atari ST's sound chip, the YM2149**, a fifth sound board: three
  square channels, a noise generator and the hardware envelope on the ST's
  2 MHz clock, from the chip's datasheet - pitches at what its 12-bit periods
  allow, a logarithmic volume 3 dB a step, written once a frame as the 50 Hz
  music player wrote it; the envelope run at audio rate as a buzzing bass,
  chords stepped as 50 Hz arpeggios on one channel, hats from the noise
  channel - a closed one a tick of a frame, as the players wrote it - and the
  drums as digi-drums played through the volume register, their quiet tails
  trimmed; a gated snare is played as the plain one (the ST had no gated
  reverb, and its long burst of noise came out as static on the chip). It is one of
  the 1982–1989 era's boards, with the synthesizer's own voices, by the seed;
  `--board ym`, `C` live.
- **ST Buzz** (`stchip`), the ST demos' music: the buzzer bass in a rhythm of
  the seed's, an octave up now and then, 50 Hz arpeggio chords, a square lead
  singing a line, digi-drums and the noise channel's hats, at 125 bpm most
  often; in the 1982–1989 era. It passes every check of the music audit, and
  the full audit, run again on a free machine, passes all twenty-nine styles.
- **No colour goes black any more in the rings, the fireworks, the maze, the
  bricks, the snake, the boxing match and the stage's rim.** Each brought a
  colour of the seed's palette to full brightness, and the palette can dip
  below zero, so for about one seed in fifty a row of bricks, a wisp, a burst
  or the stage's rim went black for a while - the fault that once blacked
  out the chess scenes. The colour is now clipped at zero first and lifted
  only where it would otherwise be black, so every other colour keeps the
  seed's own hue and strength (the gallery's seeds look the same).
- **Happy hardcore, gabber, ambient techno and dreamwave, put right**
  through the music audit, the last four: each lead played its chord's own
  steps, up to C9, G8, E8 and A7, leaping about; each sings a line of its own
  now, chord tones on the beats and steps between, up to the octave, its echo
  on the beat - on the same supersaw for hardcore and gabber (gabber's in half
  time over its kick, both raised out from under the piano and the hoovers),
  on a bell of its own for ambient, apart from the bells of its arpeggio, and
  on the same lead for dreamwave. Hardcore's plucks, ambient's bells and
  dreamwave's arpeggio stay under C6, where they climbed to F#8, C8 and C7.
  Gabber's off-beat hat is closed and short, and its clap softer, where an
  open hat hissed over every off-beat at 180; dreamwave's rolls and fills
  play straight on the grid under its swing, where they limped and fell a
  thirty-second late. Every check passes but dreamwave's walking bass, as
  before. All twenty-eight styles now pass the audit.
- **C64 chiptune, put right** through the music audit: its pulse lead ran
  sixteenths off each chord, leaping an octave on every beat's last one, up
  to B8 over three octaves, half its notes on the beat off the chord; it
  sings a line now on the same pulse, chord tones on the beats and steps
  between, up to the octave, its echo on the beat. Every check passes.
- **Heroic game, put right** through the music audit: its lead played the
  chord's own steps with fills leaping an octave, up to D#8 over more than
  two octaves, nearly half its notes on the beat off the chord; it sings a
  line now on the same soaring lead, chord tones on the beats and steps
  between, up to the octave, its echo on the beat. Every check passes.
- **Orchestral tracker, laid out as an orchestra** through the music audit
  and the principles of orchestration: the first violins sing the melody on
  top, a line of its own, chord tones on the beats and steps between; the
  brass doubles it an octave below at the climax; the rest of the strings
  sit under it, spaced as a section is, wide below and closer above; the
  choir comes in only at the climax, softly; the timpani mark the accents;
  the pizzicato stays under C6. It was a choir wall and organ-like string
  blocks over a brass line buried nine decibels among them up to B6, the
  timpani loudest of all and the pizzicato ringing up to D7. Every check
  passes. The audit now takes a melody played by a variant of its own
  instrument (the violins among the strings) as that variant alone, and
  leaves out a section doubling it, which it took for chords.
- **New beat, put right** through the music audit: its brass played the
  chord's own steps, two of five notes on the beat off the chord and a third
  of its long notes a semitone from the harmony, its dotted echo between its
  eighths; it sings a line now on the real brass, as cyborg's and star
  pilot's, chord tones on the beats and steps between, up to the octave, its
  echo on the beat. Every check passes but two warnings: the EBM bass's
  passing notes, and the brass on the Amiga, which one sample cannot brighten.
- **Handheld chip, put right** through the music audit: its pulse lead ran
  sixteenths off each chord, leaping an octave on every beat's last one, up
  to F#8 over nearly three octaves; it sings a line now on the same pulse
  channel, chord tones on the beats and steps between, up to the octave, its
  echo on the beat. Every check passes.
- **Eurodance, put right** through the music audit: its anthem lead sang
  high in a singer's place, the chord's own steps up to C#8, buried fourteen
  decibels under the house piano, and its plucks climbed to G#8; it plays a
  synth riff now, as the genre's records do - short, syncopated, played
  again every four bars, in the middle of the keyboard, cutting through the
  piano - and the plucks stay under C6, the same sixteenths as before. Its
  echo is on the beat. Every check passes but one warning, the organ bass's
  note under some chord changes.
- **Amiga rave, put right** through the music audit: its piano played the
  chord's own steps up to G7, four of five notes on the beat off the chord,
  buried twelve decibels under the hoovers, its dotted echo between its
  eighths; it plays a riff of its own now in the rave piano's syncopation -
  on the one, the "a" of one, the "and" of two and of three - chord tones on
  the beats, as loud as the Amiga plays a sample, its echo on the beat.
  Every check passes but one warning: the piano still sits 3.5 dB under the
  hoovers, all the Amiga's volume gives it.
- **Trip-hop, put right** through the music audit: its theremin sang the
  hook a chord's step above each new root, leaping with every chord, a
  quarter of its long notes a semitone from the harmony; it sings a line now
  over its four-bar progression - two notes a bar, on the one and on four,
  clear of the Rhodes, swooping into each new pitch, one note at a time as a
  theremin plays, within a sixth - its echo on the beat. Every check passes
  but one warning, the bass's chromatic approach notes into the next chord.
- **Trip-hop's scratches, rebuilt** from measurements of real turntable
  scratching (Hansen, Bresin and Fabiani at KTH) and played as a DJ plays
  them: the record carries a sung "aaah", held and fading slowly, at a pitch
  of its own - the key's tonic where a man's voice speaks; the hand moves it
  back and forth, each move gathering speed, fastest halfway and slowing to
  nothing where it turns, so the pitch rises and falls with it and a pull
  plays the voice backwards; how far the hand pushes is how much of the
  voice comes out; the record turns on the grid, a sixteenth or an eighth a
  move; a whole bar closes each four-bar phrase, a routine of one or two
  beats - baby scratches, forwards, backwards, chirps, tears - played again
  and varied at the end, from one mark on the record at one speed; up front
  in the mix, where four identical short strokes ran in a row sixteen
  decibels under it, wandering in pitch with the chords; the stylus hisses
  as fast as the record goes, and nothing clicks.
- **Derelict ship, put right** through the music audit: its FM bell rang the
  chord's own steps, up to G7, a third of its long notes off the harmony and
  buried under the pads; it sings a slow line now, chord tones on the beats
  and steps between, up to the octave, up front as a ping off the hull, its
  echo on the beat. Every check passes; its half-step and its drone stay,
  let off by name as before.
- **Keygen, put right** through the music audit: its squelchy lead played
  the hook a chord's step above each new root, leaping with every chord to
  G7; it sings a line now, chord tones on the beats and steps between, up to
  the octave, with its slides and its echo channel as before. Every check
  passes but one warning: the bass on the bar line beside the last chord's
  final arpeggio, which stops a fifth of a row before it.
- **Jungle, put right** through the music audit: its lead played the shared
  motif on every chord, up to D7, a third of its notes off the harmony; it
  sings a line now, in half time over the break - three long notes a bar, on
  the one and the "ands" of two and three, B5 at most - where a first line of
  eighths and sixteenth runs sounded messy at 170; its echo is quieter and on
  the beat. Every check passes.
- **Cyborg pulse, put right** through the music audit: its brass hook leapt
  with every chord to D#6, under brass triads struck on the same hits; the
  brass sings a slow theme now, long, short, long in each bar of thirteen,
  with an answer phrase, over power chords that are the root and the fifth;
  a brass of its own for the theme, mellow when soft and brighter as it
  grows, as a real trombone, where it was a saw. Every check passes.
- **The music audit** tells a note struck with a chord but held its own length
  from the chord: a horn line on the beat a horn section stabs.
- **Trance, put right** through the music audit: its supersaw leapt with every
  chord to E8; it sings a line now. Its dotted-eighth delay, the genre's own,
  stays, let off by name in the audit. Every check passes.
- **Synthwave, put right** through the music audit: its lead leapt with every
  chord to A#7; it sings a line now, as synth-pop does. Every check passes.
- **Chip rock and roll, put right** through the music audit: its piano comped
  the key's triads against a boogie bass that walks each chord's own sixth
  and flat seventh; it comps as the fifties did now, C and C6 on every eighth
  with the bass, chopped short. Its melody sings a twelve-bar line over the
  twelve bars (it sang eight, then over the wrong chords). Every check
  passes; it renders faster than before.
- **Star pilot's brass** is the real brass now (cyborg's): on the AWE32 its
  filter opens with the note's velocity, as a SoundFont's does - mellow soft,
  brighter loud, as a trombone - where it was the same saw at every loudness.
  The orchestral score's and new beat's, on the Amiga, are as they were: one
  tracker sample cannot brighten as it is played louder.
- **Tracker jazz's flute** is a real flute's now (MIDI quest's), where it was a
  whistle: on the Amiga, one sample taken at A4, 10 dB from the real flute at
  its worst where it was 25.
- **The music audit listens for the instrument**: a melody instrument that
  imitates a real one is held against that instrument's measured spectrum
  (a flute, a trombone soft and loud; `tools/timbre-refs.js`, each with its
  source), on every chip of its eras. And two things to listen for, which
  only warn: echoes landing a step from the next note, and one note struck a
  third time running. In a bar of thirteen it counts the beats from the bar
  line. It finds tracker jazz's flute a whistle, and three styles' brass no
  brighter loud than soft.
- **Arcade attract, put right** through the music audit: its marching bass
  stepped through the scale whatever the chord, a sixth of its notes a
  semitone off the arpeggio; it skips those steps now (C A G E). The pulse
  hook, which climbed to F7, sings a line. Every check passes.
- **MIDI quest, put right** through the music audit: its flute climbed to
  C#8 and leapt with every chord, 12 dB under a choir that entered with it;
  it sings a line now, over the strings and the harp, with no choir on top;
  a flute of its own, with a real flute's harmonics by register where it was
  a whistle; an answer phrase (A A B A); an echo on the beat, not the dotted
  one that rubbed the next note; a little faster. Every check passes.
- **Star pilot, put right** through the music audit: its brass line climbed
  to C#8 and leapt with the chords, 8 dB under orchestra hits so heavy on the
  AWE32 that it rendered at 1.2 times real time; it sings a line now, above
  hits that share one chord between brass and strings, at 4 times real time.
  Every check passes.
- **Synth-pop, put right** through the music audit: its hook climbed to C#8
  and leapt with every chord; it sings a line now, in one register, in steps
  over chord tones, the same each time round - a chorus to hum. Every check
  passes.
- **The anime opening, put right** through the music audit: its guitars stood
  on the chord's third, not its root, and on the AWE32 its brass and ringing
  guitars made it render at 1.6 times real time, too slow for AUTOPLAY's
  overlaps; the guitars on the root, the brass one line, 4.2 times real time,
  the singer a little louder; every check passes.
- **FM metal, put right** through the music audit: its power chords stood a
  major third above the harmony (the bass rubbed them at 97% of its notes) and
  its solo leapt with every chord, 16 dB under the riff. The riff now stands
  on the bass's root, the solo sings a line of chord tones in steps, the same
  each time round, above the riff; every check of the audit passes.
- **The music audit** (`npm run audit:music [-- <style>]`): every style,
  or one, analysed as music from its score - the bass under each chord, rubs
  between bass, chords and melody, the melody's register, leaps and repeats,
  the grid and the echo, the melody against the chords in the mix, peaks and
  speed - each check passing, warning or failing, a style let off where the
  clash is its point. The review it belongs to is written down
  (`docs/MUSIC-REVIEW.md`): audit, fix, audit again, then the ear.
- **Skate Punk** (`skatepunk`, 32-bit console): the skateboarding games'
  punk at 180-200 bpm (the skate games' best-known ska-punk single plays at
  about 195), from a punk drumming lesson's beats - ska verses, the guitar
  chopping on the off-beats over a backbeat; punk choruses with the snare on
  every "and", the kick on the beat and the sixteenth after or doubled before
  the snare, the hats open; power chords on the eighths; a synth chorus
  shouted like a gang, an octave at most, the same every time it returns.
- **Anime Opening** (`animeop`, 32-bit console): the anime opening scene's
  own music, built from a corpus study of anime openings (J. Li, *Music
  Theory Online* 32.1) and the measured tempos of the era's - an anison in
  sections: intro, verse, prechorus, a chorus a singer could sing (one
  register, mostly steps, chord tones on the beats, the same tune each time
  it returns), again, a bridge, the last chorus with the brass joining in; the chorus on the Royal
  Road progression, in some seeds a minor third up from the verse, and the
  last chorus pumped up a step or two; J-rock drums, a driving bass,
  palm-muted guitars in the verse and open power chords in the chorus.
- **Between the tracks**: in THE JOURNEY each era opens on a chime of its
  own, in the spirit of its screen's start-up (a coin, a SID arpeggio, the
  floppy drive, the POST beep, a swell), on the incoming track's key; a track
  whose scene is on the Game Boy's screen starts with a cartridge clicking in
  (none is yet); and the mix into the 2000s rises on a dial-up handshake, built
  from an annotated spectrogram of one, the line connecting on the drop. They
  play over the mix, outside its fades and filters.
- **Screensaver** (live): after a minute without input AUTOPLAY takes the
  screen, nothing on it but the picture; any key, a click or a touch brings
  the demo back. Full screen if the page already was (a browser allows a page
  full screen only right after a key or a click); `saver=<seconds>` in the
  address changes the wait, `saver=0` turns it off.
- **Greetings** (`G` live, `--greets` for a video): type a few names and
  they scroll in the greetings - in every scene's scroller, the About part's
  greetings and the cracktro's pages - as every demo greeted its friends.
  Live, they are kept after the address's `#`, which a browser never sends:
  they stay on the screen.
- **Born in** (`B` live, `--born` for `autoplay`): type the year you were
  born and AUTOPLAY opens in the era you were twelve in, its card saying so,
  and comes back to it every other block, the eras between drawn by how near
  their year is to yours. The year stays in the page's address, so a reload
  comes back to it.
- **Trip-Hop** (`triphop`, DOS and Y2K): the 90s Bristol sound, from a
  trip-hop drum cheat sheet and the genre's own description - 68 to 90 bpm, a
  break pitched down and shuffled as an MPC does (the off-sixteenths at 65%),
  the kick on one and three with sixteenths leading into the beats, a big
  roomy snare on two and a side-stick on four, the ride on the upbeats, a
  shaker when it builds, the record's crackle; a deep bass sliding into its
  pickups, dark strings held low, a Rhodes, a theremin singing the hook, and a
  record scratched back and forth at the end of a phrase.
- **Keygen** (`keygen`, DOS and Y2K): the crack intros' tracker tunes,
  built from the pattern data of forty real keygen modules - 125 bpm most
  often (the tracker's default), the chord stepped by the arpeggio effect on
  the tracker's tick (major, minor, or the fifth and the octave), a squelchy
  lead sliding into its notes with a vibrato that waits, and in about half the
  tunes an echo channel playing it again a few rows later, quieter, on the
  other side; a bouncing octave bass and drum samples. On DOS it plays from
  samples, as a module player did, whatever card the seed chose.
- **The anime opening** (`animeop`, 32-bit console): the openings the 90s
  brought to Latin America, as they are remembered - a cut on every
  bar: the team in a row against a red sunburst, three of them against a
  sunset, a power-up over two bars - the charge, then on the downbeat a white
  flash, a column of fire bursting up and a ring of dust, lightning out of the
  sky, and the energized state that stays: a tall serrated aura with arcs of
  lightning crawling round it, the hair spiked up gold, the muscles swollen - a
  flight across a sky rushing right to left, a charge out of speed lines;
  muscular silhouettes of their own, drawn as the cels draw them, striking a new pose on
  every beat, the kick punching and bursting the lines, the last bar cutting on
  every beat into a white flash, and the title card - the seed in thick outlined
  letters over rushing blue streaks - slamming in on the drop.
- **The time car** (`timecar`, arcade): the time-travel car of the 80s, as
  an idea, evoking the first run and the fire trails of the 80s time-travel film - a
  wet parking lot lit orange, a long low building beyond, two onlookers (one
  with the remote, one filming) swaying to the music. A steel wedge in 3D laps
  the lot, passing in front of them, swings round and charges between them,
  its readout climbing to 88 on the next big moment of the music; lightning
  crawls round it as it nears; they brace. At 88 it bursts and is gone, and
  only then the fire: the reverse shot, the two hopping from foot to foot on
  the beat as the trails race between their legs; then the plate it left,
  spinning on its edge like a coin until it falls flat, SEEDSCENE on it. The
  car is drawn from the coupe's side profile; the fire is a volume with a glow.
- **The starfighter, as the 16-bit space shooters looked.** Six frames of
  the kind were measured. White streaks that crossed the screen
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
- **Music styles**, chosen by the era or with `--music` - thirty-five in all, these and the ones below:
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
  era, music, display, sound board, resolution, length and titles/scroller
  while the demo plays. It
  copies the live or mp4 command that reproduces what is on screen. Settings
  live in the page address, so a reload keeps them.
- **New live keys**: `space` and `←` `→` for scenes, `↑` `↓` for the music,
  `E` and `1`–`7` for eras, `O` for AUTOPLAY, `T` for THE JOURNEY, `S` new seed, `P` pause,
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

- **An era key goes to that era's scenes.** `E`, `1`–`7` and the menu's ERA
  used to change the era and keep the scene on screen, showing it in an era not
  its own; now they go to the era's first scene in the seed's order (an era
  with no scenes yet keeps the one on screen).
- **The screen stays on in AUTOPLAY and THE JOURNEY.** While a programme plays
  (not paused, the page in view) the page holds the browser's Screen Wake
  Lock, so the computer's power settings don't turn the picture off under the
  music; the screensaver lets the computer sleep as before.
- **VHS display.** Rebuilt from how a tape records (ntsc-rs's VHS figures):
  soft brightness sharpened back, colour smeared wide and late, a slow wave on
  the lines, colour noise and grain, the heads switching at the bottom. The rolling tracking band - a fault, not the format - is gone.
- **Sound boards.** The music plays on a board as the picture on a display:
  HI-FI, PAULA, OPL3 FM, AWE32. On AUTO each scene its own (a film or a series
  the studio's, and so a game whose machine has no board here - the 16-bit
  space shooter, the phone's snake, the LCD game; the Amiga's ball the Amiga's
  chip, the PC desktop's things the sound card) or its era's; `C` live, the menu, `?board=` and `--board` force
  one. A programme's track plays on its first scene's board.
- **Eras are spans of years.** Seven, keyed by the year they start - 1972–1981,
  1982–1989, 1990–1993, 1994–1996, 1997–1999, 2000–2009, 2010–now - and a game
  or a film goes to the year it came out (the light-cycle film, the
  cube-pyramid hopper, the robot fight, the brick breaker and the arcade road
  racer to the 1980s; the 16-bit space shooter and the dinosaur film to
  1990–1993). The machine names still find their era.
- **Displays.** The screens are their own catalogue, apart from the eras:
  sixteen, each named for one technology - B/W, ARCADE, VECTOR, COLOR VECTOR, MONO, C64, VHS, EGA,
  AMIGA, VGA, SNES, COMPOSITE TV, GAME BOY, NOKIA, SVGA and MODERN (no filter).
  Every display draws at full resolution - a simulation, not an emulation -
  and only one that was a CRT gets a CRT's scan lines, curvature and glow; an
  LCD gets its palette. On AUTO every scene is seen through its own (a game its
  machine's, a film or a series the videotape's, an effect its era's); `D`
  live, the menu, `?display=` and `--display` force one on everything.
- **One era per scene.** A scene belongs to the era it comes from (a game to
  its year, an effect to the machines that made it famous, a film or a series
  to the era of its year), and is shown only there; six effects share two or
  three eras on purpose. The eras are their filters and could be mixed one day,
  not yet. An era with no scenes yet (modern) is passed by in THE JOURNEY and
  AUTOPLAY. The gallery and the README show each scene in its era.
- **The catalogue in the seed's order.** The live keys and the menu step
  through the scenes era by era, oldest first, each era's in the order the
  seed deals them, the era changing with the scene; the music from the era's
  own styles first. Nothing is shown in the order it was written in any more.
  AUTOPLAY deals each era's scenes and music once and carries on where its
  last visit stopped, so a big era shows all it has in about a quarter of the
  time (measured then, before the eras became spans of years: the Amiga's
  seventeen scenes by track 41, not 160; DOS's nine styles by track 68, not 407). The README's scene table and `seedscene scenes` go by
  era.
- **THE JOURNEY shows the catalogue.** Three of an era's scenes in each part,
  cut where the music turns, where it showed one; and played on it goes on
  through each era's scenes three at a time, and its music one style a pass,
  starting each list again when it runs out - so the seed sets the order, not
  how much is seen. A rendered journey's default length is 126 s, 21 s an era,
  room for three scenes of seven. Y2K no longer plays the 1979 asteroid game
  or the 90s shooter.
- **The README's scenes** each name their era; two broken rows
  of its table mended.
- **A scene is called a scene.** What v0.1 called a style - the brief asked
  for "a style name" - is a scene everywhere a person meets it: `--scene`,
  `seedscene scenes`, `?scene=` in the page's address, SCENE in the menu and
  in the scroller. "Style" now means only a style of music. `--style`,
  `seedscene styles` and `?style=` still work, so no shared link breaks.
- **The README's gallery** gives each still the command that makes it
  (`--scene cracktro --era amiga --seed hyperspace`), not its seed alone; the
  cracktro's still takes a new seed, `hyperspace`, in place of one that named
  the scene's illegal side. A **Watch it online** section links the published
  page straight into AUTOPLAY, THE JOURNEY (`journey=1`, new), born in, the
  greetings, each era. The block-letter logo lines up again: two of its lines
  were two characters shorter, and centred, they sat one to the right.
- **An era chosen alone brings its own scenes.** Given only the era
  (`--era dos`, `?era=dos`), a seed picks the scene it favours most among
  that era's, not among all of them; a seed whose scene was already of the era
  keeps it, and a seed left to choose everything chooses as before.
- **A seed keeps its scene as scenes are added.** A seed used to pick its
  scene from the list by position, so every new scene moved about half the
  seeds to another scene. Now each scene gets its own score from the seed
  and the seed takes the one it favours most: a new scene takes only the
  seeds that favour it (one in forty-five today). THE JOURNEY picks each
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
- The number keys now pick an era instead of a scene: `1`–`7`.
- The maze no longer runs laps of its outer lane: it is a game now.
- THE JOURNEY now starts at the arcade (1972–1981).
- The CRT finish became a display: the same scene looks the way its screen
  would have shown it.
- Scale names read naturally ("harmonic minor", not "HARMONICMINOR").

### Fixed

- After the eras became spans of years, the command line refused any
  `--scene`, `--era` or `--music` (`ERA_NAMES is not defined`), and the
  dial-up handshake into the 2000s no longer played; both work again.

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
