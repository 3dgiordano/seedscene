# Build report — SEEDSCENE v0.2

> **In development.** v0.2 is being built a piece at a time from its plan
> ([PLAN-v0.2.md](PLAN-v0.2.md)). The usage figures below stop at
> 2026-10-28 09:08 UTC: on 2026-10-29 the owner kept them for v0.1 only.

v0.2 takes the v0.1 tool ([BUILD-REPORT-v0.1.md](BUILD-REPORT-v0.1.md)) and
turns it into **SEEDSCENE**: a name, a nostalgic front door, a live mode you
drive from the keyboard, an About part, eight eras of computing from the
1979 arcade to today with a journey through all of them, an endless AUTOPLAY
channel, forty-four scenes and twenty-seven styles of music on the sound chips of their eras.

## At a glance

| | |
|---|---|
| Version | 0.2.0 — in development |
| Started | 2026-10-27 (local time), the evening v0.1 was documented |
| Built by | Claude, in Claude Code, directed by the owner turn by turn |
| Model | Claude Opus 5.5 (`claude-opus-5-5`), effort high |
| Claude Code | 2.1.309, Claude desktop app (Code tab) |
| Agent plugins | the 10 self-monitoring plugins from [3dgiordano/agent-plugins](https://github.com/3dgiordano/agent-plugins); updated to release **v0.20.0** on 2026-10-28 — see [AGENT-PLUGINS.md](AGENT-PLUGINS.md) |
| Model requests | 370, to 2026-10-28 (not measured further: the owner kept the figures for v0.1 only) |
| Tool calls | 509, to 2026-10-28 |
| Tokens | 204.05 M processed (591.6 K generated), to 2026-10-28 |
| Cost | **$67.32** at Claude Opus 5.5 API list prices, to 2026-10-28 |

## Where it stands, 2026-10-29

Thirty-eight scenes in eight eras. On 2026-10-29, in one day with the owner
looking at each piece live:

- **Built, from references, each approved by the owner:** the unlimited bobs
  (on the original's cycled screens, music-driven, with a twin chain), the dual
  chessboard and the chessboard floor with its cube (the chessboard zoomer,
  split in two at the owner's word), the rubber vector, the bump-mapped logo
  and the cracktro with its starfield and warps - the whole of round 12's
  small demo effects.
- **Reworked at the owner's look:** the 3D pipes (a deep grid filled back to
  front, elbows, the bend where the tip was), the pyramid (played as the
  arcade game, on the beat), the starfighter (drones from the horizon, hits
  that shake and flash once), and every game scene floating on the stage.
- **New in the app:** sound off (`V`, the SETUP menu, `--mute`), a stable
  scene pick (a new scene moves about 3 % of seeds, not half), and a live page
  that survives a GPU reset.
- **Decided by the owner:** the music by ear waits for a stage of its own; the
  project goes under git at the v0.2 release; the usage figures were for v0.1
  only. Still open: six other scenes normalise their palette colours the way
  that once turned the chess scenes black, unchecked by the owner's choice.
- **Next:** the rest of round 12 - the other screensavers, the card cascade,
  the ANSI board, the time car, the moon bike, the anime opening, its modes
  and styles - or another round, as the owner picks.

## What the owner asked for

v0.2 had no written spec up front. It grew from the owner using v0.1 and
asking, in order:

1. **A name and a personality** that would win over people who grew up with
   home computers *and* people meeting the demoscene for the first time.
2. **A fix** for a glitch when pressing `S` for a new seed.
3. **Control over everything**, not only the seed.
4. **Keys that explain themselves**, `space` for the next scene, `P` for
   pause, `H` to see every key; **an About part** in demoscene style; and
   **music with more variety and more fury**, in selectable styles inspired
   by the Amiga and C64 scenes.
5. **The agent plugins updated** to the current release.
6. **The next level**: an inspiration pack of trackmos, musicdisks, effects,
   PC, console and handheld scenes, game soundtracks and modern tools — and a
   journey through every era, from the C64 to today, as an homage.

## What was built

**The name.** `music-gen-video` became **SEEDSCENE** — *seed* + *demoscene*.
It explains itself: "the scene" speaks to those who were there, and "seed" to
anyone who has shared a game world seed. Four candidates were checked against
npm and GitHub; the owner chose this one.

**A Commodore 64 front door.** The browser needs a key press before it may
play sound; that moment became `READY.` → a typed `LOAD` → the striped
loading border → `RUN` → a datasette chirp and a CRT switch-off into the
demo. The LOADING phase is real: the shaders compile behind it.

**A SETUP menu** (`M`), styled like a C64 program menu: type any seed, and
change the scene, the music, the resolution, the length and the titles while
the demo plays; copy the exact live or mp4 command that reproduces it. Every
setting lives in the page address, so a reload keeps it.

**Keys that explain themselves.** `space` next scene, `←` `→` and `1`–`6` for
scenes, `↑` `↓` for the music, `S` new seed, `P` pause, `F` fullscreen, `I`
info panel, `H` every key on screen. Each change shows a short notice, and a
corner reminder says where the keys are. The scroller's key hints appear only
in live mode, so a rendered mp4 never asks its viewer to press anything.

**Seven music styles.** The composer was rewritten around presets — dreamwave,
C64 chiptune, acid, trance, Amiga rave, jungle and happy hardcore — each with
its own drums, bass, chords, lead and mix, arranged with builds, risers,
snare rolls and crashes into the drop. Eleven instruments and effects joined
the synth: a 303 with slides and accents, a reese bass, hoovers, supersaws, a
rave piano, SID pulse leads, 50 Hz arpeggio chords, claps, 909 and break
kits, risers and crashes. The seed picks a style unless you do.

**The About part** (`A`): SEEDSCENE's own demo about itself, with its own
shader, seed and soundtrack — bouncing rainbow logo, greetings scroller,
pages that slam in on the beat, a mirrored sine scroller over raster bars
and a checkerboard tunnel. `A` hands your demo back untouched.

**For the README and the release:** an ASCII-art logo on the CLI, a
`SEEDSCENE.NFO`, a gallery generated by the tool itself (`npm run gallery`),
and `npm run sampler` with all seven music styles in one mp3.

## The next level: eras and THE JOURNEY

The owner then shared an inspiration pack — the trackmos, musicdisks,
effects, PC classics, console scenes, game soundtracks and modern tools that
marked a generation — with one brief: take everyone back through *every* era,
from the C64 to today, as an homage, never a copy. The agent could not watch
or listen to the productions on the list; it worked from what is known and
written about them, and nothing — no melody, logo or name of a production —
was reproduced.

**Seven eras.** An era became a *screen*: a resolution, a palette, a dither
and a display, applied in the post pass so that any scene can be seen through
any era. The C64 gets its 16 measured colours and double-wide pixels on a TV;
the Amiga its 12-bit banding on a PAL monitor; DOS the 256-colour dither of
mode 13h; the 32-bit console its 15-bit dither on composite; the handheld four
greens on an LCD with its pixel grid; Y2K the glow of the 64k intro; modern
the neon, grain and fringing of shader art. Scenes now render at the era's own
resolution, so a C64 frame is genuinely 178×200.

**Thirteen scenes.** Seven new effects from the pack, each written from
scratch: shadebobs (their trails summed from the path, no feedback buffer),
vector balls morphing between formations on the bar, a dot tunnel, fireworks
on the backbeat, water ripples on the beat, the outrun sunset and a
raymarched morphing solid. All are stateless — any frame can be drawn alone —
so live playback and mp4 renders stay identical.

**Fifteen music styles.** Eight new ones — New Beat, eurodance/hip-house,
gabber, ambient techno, orchestral tracker, handheld chip, a heroic game
soundtrack and synthwave — and the instruments they need: a house organ,
strings, a formant choir, timpani, brass, FM bells, a gabber kick, a gated
80s snare, an EBM bass and a 4-bit wave channel.

**Coherent by default.** With everything on `auto`, the seed picks a scene,
then an era that scene belongs to, then music of that era — decided in one
module, so the CLI, the page, the AudioWorklet and the renderer agree.

**THE JOURNEY.** One part per era, oldest first, each with its own sub-seed,
scene, music and tempo, opened by a card with the line its machine would have
greeted you with. Each part's synth keeps ringing 2.5 s into the next, so
reverb tails fade instead of being cut.

### What went wrong in this round

1. **The dot tunnel vanished** on the C64 and the handheld: at 144–200 lines
   its dots were one or two pixels wide and dim enough for a 16-colour or
   4-green palette to round them to black. Bigger, brighter dots and a glow
   down the tunnel's throat fixed it.
2. **Vector balls filled the screen** and the formation could not be read;
   smaller balls and a camera further back.
3. **The outrun floor was solid cyan**: the grid-line test was inverted.
4. **Fireworks stayed dim on the console era — twice.** The first fix made
   the streaks wider and changed nothing visible. Re-reading the frame showed
   the real cause: this seed's palette gave navy and violet. The second fix
   normalised every burst to full brightness, keeping its hue.
5. **Two false alarms checked, not chased**: a capture after leaving THE
   JOURNEY showed a scene that was not playing; a later capture, and the
   page's own state, showed the right one — the browser pane returns earlier
   frames.
6. **Long edit commands were cut off by the shell** (as in v0.1) and
   **escape sequences were mangled**; edits moved into script files.
7. **A showcase render was started before a fix** and stopped, so the shipped
   journey would not carry the dim fireworks.

### What was checked in this round

| Check | Result |
|---|---|
| All 15 music styles × two seeds | no invalid samples, peaks ≈ −2 dBFS, identical across block sizes, ≥ 3.2× real time |
| THE JOURNEY's audio | 8× real time, peak −1 dBFS, identical across block sizes, no silence at any era boundary |
| 300 seeds on `auto` | the scene always belongs to the era, the music always to the era, same choice every time |
| Every era × several scenes, as rendered frames | each era's palette, dither and display visible; four defects found and fixed |
| A full journey rendered to mp4 | 7 parts, 7 cards, every era's look and music in order |
| Eras, `E`, `1`–`7`, `T` and back, the menu's ERA row, in a real browser | all working, music follows the era, no console errors |

## The arcade round: game visualizers, AUTOPLAY, five new styles

The owner's next idea: music that pays homage to the synthetic sounds of
games, with visualizers to match — a modern, glowing take on the first
paddle game, something that feels like the invader and rock-shooting
cabinets, a maze chase, a brick-breaker — recreating the iconic eras of video
games; an **autoplay** mode that pairs music and visuals of the same era with
variations, something to watch for hours; the influence of 80s sci-fi film
scores, and catchy demoscene music inspired by them; a light-cycle look that
recalls the 1982 film without copying it; pop and rock and roll adapted to
the demoscene — catchy, energizing, memorable, and never plagiarism.

**An arcade era** (1979) became the oldest screen: a few hard, bright
colours, heavy bloom, a curved tube. THE JOURNEY now starts there.

**Six game-inspired scenes**, each a fragment shader that draws any frame
from time alone: `paddles` (the ball crosses the court once per beat, so every
hit lands on the music; sparks; seven-segment scores), `invaders` (a 9×5
formation of creatures the seed invents — mirrored 8×6 bitmaps — marching one
step per beat, waves cleared and rebuilt, a saucer, a cannon on the
backbeat), `rocks` (jagged vector polygons drawn as glowing line segments, a
ship that turns and fires on the off-beat), `maze` (a mirrored maze the seed
lays out, a chomper running laps and eating the dots, wisps that turn blue
and flee after each power dot), `bricks` (a bevelled neon wall knocked down
brick by brick on a 48-beat cycle) and `lightcycles` (riders whose
right-angle paths are worked out in closed form, so their light walls can be
drawn without simulating the ride).

**AUTOPLAY.** An endless programme: three tracks in an era, then another era
in a fresh order on every cycle, each track a rotation through that era's
scenes and music so that no pairing repeats back to back. Each part is
composed only when needed — on the page and in the AudioWorklet alike — and
the live clock is the worklet's sample position, so `space` restarts the
synth at the next part and the picture follows.

**Five new music styles** — `arcade`, `cyborg`, `derelict`, `synthpop`,
`rocknroll` — with five new instruments (a struck anvil from inharmonic
partials, a laser zap, a coin blip, an explosion, a deep-space drone), odd
metres (`cyborg` runs 13 sixteenths to the bar), an eighth-note shuffle, a
twelve-bar form, and a new **hook** role: a two-bar call and answer that lands
on chord tones on strong beats and resolves every fourth bar. The film-score
styles take a *mood* — machine percussion in an uneven metre; drones and a
half-step that will not resolve — never a theme.

**Old styles untouched.** The new material draws from a random stream of its
own (`hook:<style>`) and the bar length defaults to 16 steps, so every one of
the fifteen earlier styles renders exactly the samples it did before — checked
by hashing all fifteen across three seeds before and after the change.

### What went wrong in this round

1. **Three scenes collided with the overlays**: the left score of `paddles`
   sat under the title plate, the cannon of `invaders` and the paddle of
   `bricks` under the scroller, and the brick wall ran into the plate. Found
   in the first contact sheet, moved, re-rendered.
2. **The invader formation still clipped the plate in live mode** at 480p; it
   was lowered again and checked in the browser.
3. **The heartbeat in `derelict` rolled into snare fills** (12 hits in 48 s),
   inherited from the generic fill logic; a horror drone should not fill, so
   it now keeps only the riser.
4. **The live page called a method the programme refactor had removed**
   (`setJourney`), so `T` would have thrown, and it still sent the old
   `journey` flag the AudioWorklet no longer read. Found by reading the page
   before wiring AUTOPLAY into it; both now go through one `toggleProgramme`.
5. **AUTOPLAY's C64 card said `LOAD "JOURNEY"`**; the cards now name the
   programme that is playing.
6. **Long shell heredocs were cut off again**; edits went into script files.
7. **The showcase mp4s clipped.** Decoded, their audio peaked at +3 to +4 dB
   over full scale from a −2 dB source. A measurement, not a listen, found
   it. Tracing the worst spot found no click in the synth, only bright noise
   (break snare, crash, hats). Lowering the level alone behaved erratically:
   at −5 dB one programme still peaked at +1.9 dB, while −6 dB gave −4.1 dB.
   The encoder's perceptual noise substitution, which swaps noisy bands for
   noise of its own, was the cause of the randomness. With it off, the
   overshoot is a steady ~3.7 dB. The owner approved encoding 5 dB lower, and
   with both changes no style clips.

### What was checked in this round

| Check | Result |
|---|---|
| Six new scenes, in their own and in other eras, as rendered frames | all compile; two contact sheets read; four placement defects found and fixed |
| The fifteen earlier styles, 3 seeds each, hashed before and after | byte-identical |
| The five new styles | peaks −1.8 to −2.0 dBFS, no invalid samples, 3.8× to 19× real time; `cyborg` bar = 13 sixteenths |
| `npm test` (14 checks, incl. two new AUTOPLAY checks and two full mp4 renders) | all pass |
| AUTOPLAY over 300 tracks | every track in its era; no pairing repeated back to back |
| Live page in a real browser: `O`, `space` skip, era change mid-programme, `S` refused, `T`, switching `T` → `O`, `O` back to the demo | all working; no console errors |
| mp4 audio after the encode fix: all 20 styles × 2 seeds (16 min), AUTOPLAY and THE JOURNEY, decoded to 16-bit | peaks −1.9, −3.0 and −4.3 dBFS; no clipped samples; renders still byte-identical |

## The stage round: impact, real games, three more homages

The owner's feedback on the arcade scenes: keep going, but make them hit —
animated by the music, a screen that moves in 3D, blur and similar effects,
not just a recreation of the game. And: snake, a boxing homage to the
NES/Wii fights, a space-shooter homage with that dynamic music, more icons of
each era, and a maze whose chomper does not run the same path every time.

**The stage.** A shared shader wraps any flat game scene: the game is drawn
on a board in 3D space, ray-cast from a camera that changes angle on every
eight-bar phrase (eased in over one bar), dollies in on the kick, rolls on
the snare and breathes with the bass. The post pass gained a per-scene
**impact** switch: a zoom blur and flash on the kick. Scenes that do not ask
for either are drawn exactly as before.

**A simulation channel.** A shader can draw any frame from time alone, but
it cannot remember. `src/core/sims.js` adds small game simulations on the
JavaScript side that step in fixed ticks locked to the beat, from tick 0,
with their own seeded random stream, and hand the shader the state of the
moment as uniforms (walls and dots packed as bit rows, positions, timers).
Going back in time replays from the start, so live playback, scrubbing and
offline renders agree. Over ten simulated minutes the chomper visited 164
cells (it used to run one 56-cell lap), cleared 8 mazes, was caught 24 times
and ate 64 wisps; the snake ate 293 times and grew to 61 cells.

**Three more homages**, none copying a character, sprite or tune: `snake`
(a lit neon tube with a pulse running down it on the beat), `boxer` (a
seed-made challenger with a tell before every swing; your boxer in
see-through green, slipping and countering on the kick) and `starfighter`
(on-rails flight in flat-shaded polygons, drawn as projected triangles with
a depth test, through space and over a planet). **Star Pilot** gives it a
16-bit space-opera soundtrack.

### What went wrong in this round

1. **The challenger looked like a snowman and the player like three green
   bubbles.** The first boxer frame was compared with what the scene is meant
   to evoke and failed; both were redrawn with heads, faces, hair, arms and a
   back, and the challenger was moved down so his face clears the title band.
2. **The ship showed only its edge**: seen exactly from behind, flat wings
   are a line. It is now pitched so the camera looks down on it.
3. **A name clash** (`R` for both the ring radius and the ship's rotation)
   stopped the starfighter shader compiling.
4. **AUTOPLAY repeated a pairing across an era change** once the eras began
   to share scenes and music (DOS → console, both fireworks with eurodance).
   A block that would open on the previous track's pairing now starts one
   song later; 5 seeds × 2,000 tracks show no repeats.
5. **A showcase render was broken by editing the renderer while it loaded**:
   the autoplay re-render timed out. Renderer files are now left alone while
   a render runs.

### What was checked in this round

| Check | Result |
|---|---|
| Staged and new scenes, as rendered frames in several eras | all compile; three contact sheets read; the two failing figures redrawn and re-checked |
| Maze and snake simulations, 10 simulated minutes; state after a rewind | games play out (numbers above); identical state after replay |
| The 15 original styles hashed again after adding Star Pilot | byte-identical |
| Star Pilot, two seeds | peak −2.0 dBFS, > 5× real time |
| `npm test` (14 checks incl. two full mp4 renders) | all pass after the AUTOPLAY fix |
| Live page: maze, snake, boxer, starfighter on the audio clock | running; no console errors |

## The realism round: games that play, robots that box

The owner's feedback on three of the game scenes: the rock ship fired but
never broke a rock and never moved; the boxer's shapes were very basic, and
the character being hit had a style that could offend; the starfighter's
lasers all went to the centre whatever the ship did, and never hit anything.

**Rocks and starfighter became simulations** on the channel the maze and the
snake use. The rock ship has a pilot: it dodges a rock about to hit it (on
some bars less alertly than others, so rocks do get through), moves to a new
spot every bar, leads its target and fires on the eighths when a rock sits on
its line; shots are tested along the whole stretch they cover each tick, so
fast shots cannot pass through small rocks. The starfighter picks the
nearest drone it can line up on, slides over and turns its nose onto the
point where its bolts will meet the drone, and fires twin bolts from its
wings along the nose, only once the nose is on; two hits burst a drone. The
drones fire back on the backbeat, and the pilot usually sees the shot and
rolls. Over ten simulated minutes on three seeds, the rock ship scored 41,530
to 44,200, cleared 12 waves and was lost 3 or 4 times, flying over 86 to 90
of the field's cells; the starfighter (after the owner's second review,
below) burst 187 to 208 drones, turned away about 180 shots and took 65 to
76.

**The boxer was rebuilt as two robots, raymarched in 3D.** A human figure
with a seed-chosen skin tone, being punched round after round, was the part
that could offend; robots carry the fight without it. They are made of
rounded boxes and capsules with joints, gloves, a visor and a chest light,
lit by a spotlight with specular, rim light and ambient occlusion, inside a
ring with real ropes and posts, shadows on the canvas and beams in the haze.
The seed builds the challenger: its colour, how round its helmet is, its
shoulders, whether it has an antenna.

### What went wrong in this round

1. **The first robot frames hid the challenger's head** under the title band
   and filled half the screen with yours; the camera was raised and pulled
   back.
2. **Your counter landed on his gloves, not his head**: the punch was aimed
   in the body's frame before its forward lean, which carried it down. It is
   aimed higher now, and the zoomed frame shows it reaching the head.
3. **The starfighter's lasers were invisible** in the first sequence, which
   looked like a drawing fault. Reading the simulation's state at that moment
   showed the fight had not started: the drones were still out of range. The
   range was opened up, and the bolts were made slower, longer and wider up
   close.
4. **The first starfighter banked so hard** that it was seen on edge; the
   bank now follows its sideways speed more gently.
5. **Both pilots were perfect at first**: no rock ship was ever lost, and
   almost no shot ever landed. Some alertness was taken away from each.
6. **The owner saw what the frame checks had missed in the starfighter**:
   lasers that came in from the sides of the screen, a ship that did not
   point where it fired, bolts hitting a drone it was not aiming at, and a
   ship that sometimes seemed to fly the wrong way. The checks had asked
   whether the lasers reached a drone, not whether they left the ship along
   its nose. Three causes, all in the code: a laser's trail was drawn 2.4
   units long from the moment it was fired, so near the ship it reached back
   behind the camera and was thrown to the screen's edge; the bolts were
   aimed straight at the drone while the ship had no heading at all; and the
   bank had the wrong sign, so the ship leaned left while sliding right. Now
   the ship has a heading, drawn with the same roll, pitch and yaw the
   simulation fires from; two sights ahead of the nose show where it points;
   it fires only once the nose is on, along the nose; a trail never reaches
   back past where its bolt was fired; and the camera rides above and behind
   the ship, so the wings read without tipping the ship off its line. Over
   ten simulated minutes on three seeds: no volley fired off target, every
   bolt left exactly along the nose, the ship never leaned against its
   slide, and 82 to 87% of the bursts were the drone in the sights - the
   rest were drones that crossed the line of fire.

### What was checked in this round

| Check | Result |
|---|---|
| Rocks and starfighter simulations, 10 simulated minutes, 3 seeds; state after a rewind | games play out (numbers above); identical state after replay |
| Rocks, starfighter and boxer as rendered frames in the arcade, console and modern eras | all compile; contact sheets read; the counter, the swing, the knockdown and a laser sequence checked frame by frame |
| `npm test` (14 checks incl. two full mp4 renders) | all pass; and two 6-second renders each of rocks, boxer and starfighter are byte-identical (the starfighter again after the aiming fix) |
| Starfighter aiming, 10 simulated minutes, 3 seeds | 0 volleys off target; bolts 0 rad off the nose; 0 ticks leaning against the slide |
| Live page: rocks, boxer, starfighter on the audio clock | running; no console errors |

## The AUTOPLAY round: scenes on the music, never the same sequence

The owner asked for AUTOPLAY's scenes to change by themselves with the
music, for it not to play the same sequence every time, and for the music to
move on to another track every forty seconds.

What it did before: one scene for the whole forty-second track; within an
era the scenes and music were walked in the order the era lists them, so
neighbouring tracks always followed the list (paddles, then invaders, then
rocks); and live, `O` always started at the channel's first track, so the
same seed always opened with the same sequence. The music already changed
every forty seconds.

Now each track cuts its scene where its own arrangement turns: the drop after
the break, and the crashes that open each eight-bar phrase, each scene
playing at least nine seconds, always on a bar line. A track is two or three
scenes. Every block of three tracks draws its own shuffled order of the era's
scenes and of its music, with the first ones checked against what the last
block could have ended on. The scenes a track will cut to are compiled when
it opens, under the fade from black, so a cut never stalls on a compile.
Live, `O` drops in at a random point of the endless channel; the mp4 is
still the seed's.

### What went wrong in this round

1. **A live-page edit that never happened**: the first check of the random
   start showed the same track twice. The page was asked for its script,
   which had no trace of the change; the shell command had redirected the
   editing script's input twice, so it ran nothing. Applied again from a file,
   the next three starts landed in three different eras.
2. **Rebuilding the order made `plan()` recursive no more**: the old
   repeat-check looked at the previous block's plan, which looked at the one
   before, all the way back; a random start deep into the channel would have
   recursed through thousands of blocks. Each block now only looks one block
   back, at the raw draw.

### What was checked in this round

| Check | Result |
|---|---|
| 5 seeds × 1,000 tracks | 0 pairings repeated; 0 scenes repeated inside a track; shortest scene 9.0 s; the same scene across a track change once in 5,000 |
| 5 seeds × 5,000 track changes | the same music style twice in a row at most once per seed (a different song) |
| New `npm test` check: scenes cut on the bar, from the track's era, ≥ 9 s | passes; 217 cuts in 120 tracks |
| `npm test` (15 checks incl. two full mp4 renders) | all pass |
| Live page: a cut inside a track; three presses of `O` | maze → snake inside one handheld track; three starts in three eras; no console errors |

## The mix round: tracks that blend into each other

The owner's request: a friendlier change from one track to the next - load
the coming music ahead, morph from what is playing into what is coming, and
let the two overlap, in sync, in between.

Before, a track played to its end and the next began on the slot boundary,
at its own tempo, with the old one's reverb ringing over it for 2.5 seconds.

**The overlap.** Each track now runs from the start of its overlap with the
one before to the end of its overlap with the one after. The incoming track's
first bars (four in AUTOPLAY, two in THE JOURNEY's shorter parts; a bar more
or less if that bends the tempo less) play over the outgoing track's last
beats, beat for beat. Across the overlap both are laid on one tempo that
glides from the old track's to the new one's - a smooth ramp, bent just
enough (at most about 6%) that the beats fill the time exactly, so the new
track's slot opens on one of its own bar lines. Notes keep their pitch: the
synthesizer plays each event where the glide puts it, so this is a tempo
change, not a resampling.

**The morph.** The incoming track enters with a high-pass filter at 900 Hz,
so it arrives as hats, pads and melody without a second bassline; halfway
through the overlap the filters swap - the new track's lows open, the old
track's close - and the old track then fades behind a low-pass that closes
to 900 Hz. Levels cross at equal power, and a limiter on the sum keeps an
overlap no louder than a single track.

**Loading ahead.** A track is composed and its synth readied the moment the
track before it starts, about half a minute before it sounds. The visual
feature track, which the AudioWorklet never needs, is now built only when the
picture first asks for it, which brings composing a track down from about
9 ms to about 2 ms on the audio thread. The picture runs on each score's own
clock, so the beat of the visuals stays on the music's through the glide.

### What went wrong in this round

1. **The audio depended on the block size**: the mix moved in 16-sample
   steps counted from the start of each render call, so 128- and
   4096-sample blocks retuned the filters at different samples. The steps now
   sit on a fixed grid, and the block-size checks pass again.
2. **Odd metres fell between the beats.** A first measurement only checked
   that each track had a note near the shared grid, and passed. A stricter
   test - notes of both tracks on the same beat must sound together - failed
   by 0.19 s: a 13-step metre has 3.25 beats a bar, so a five-bar lead-in put
   the next overlap a quarter beat off. Lead-ins are now always a whole
   number of beats (four bars for such metres).
3. **A scene check flagged the first scene of every track as off the bar**,
   once the overlap length could vary by beats; the overlap now changes by
   whole bars, so every track's slot opens on a bar line.

### What was checked in this round

| Check | Result |
|---|---|
| 6 seeds × 200 overlaps: notes both tracks play on the same beat | 13,881 shared beats, at most 2 samples (0.05 ms) apart |
| Tempo bend across overlaps, 5 seeds × 300 | at most 5.8%; overlaps 4 to 14 s long |
| Level, three programmes rendered | overlaps no louder than the rest (rms −12.3 to −13.0 dB against −11.8 to −12.4); peak −1.3 dBFS; no sample at full scale |
| New `npm test` check: beat on beat in 30 overlaps | passes |
| `npm test` (16 checks incl. two full mp4 renders) | all pass |
| The AUTOPLAY showcase, level every half second across its three track changes | no gap; a dip of 2 to 4 dB at the bass swap; peak −2.2 dBFS after the encode |
| Live AUTOPLAY across a track change | 179 bpm into 139 bpm, no console errors |

## The grid round: paddles, invaders and bricks on the music

The owner's request: make paddles, invaders and bricks play as real games,
as the maze, rocks and starfighter now do. The paddles' opponent never lost:
use a lost point for an explosion on a key musical note. The invaders' shots
never killed anything: make them, with explosions that could land on the
music. The bricks should break on the rhythm, and the ball should be less
predictable.

**The grid.** These three are planned move by move instead of stepped tick
by tick: each move is placed on the grid of the score they play to. The
score now names its sixteenths a bar and its accent bars - those that open
on a crash or on the drop - and a game reads them from it. An odd bar (13
sixteenths) is cut into pieces from its downbeat, so every grid mark is on
the music.

- **Paddles.** The ball crosses once a beat to a new height, straight or off
  a wall. On the downbeat of an accent bar the receiving paddle misjudges
  it: the ball goes by, the paddle bursts on that very note, the other side
  scores, and the winner serves on the next bar.
- **Invaders.** The formation steps on every beat and drops at the edges.
  Two beats ahead the cannon picks an alien - the lowest in a column, nearer
  ones more often - slides under it, and fires so the shot arrives on the
  beat. Two beats before an accent a saucer is already crossing; the cannon
  brings it down on the accent.
- **Bricks.** For each flight the ball's next collision is found (a wall, a
  brick, the paddle) and the flight is timed to land on the next eighth the
  ball can reach at its top speed, or the next sixteenth for a short hop. The
  paddle aims each return at a brick it picks, or at a fresh angle, and
  meets the ball off-centre on that side. A cleared wall goes back up on the
  next return; later walls have mirrored holes and a silver top row.

Over three minutes on four seeds, including an odd-metre one: 1,203 paddle
returns, all on the grid, 44 points lost, every one on an accent, by both
sides; 939 aliens down, all on a beat, 25 saucers, all on an accent; 619
bricks broken, all on a sixteenth (508 on an eighth); state identical after
a rewind.

### What went wrong in this round

1. **Bricks broken off the rhythm.** The first plan let a short hop fly at
   a middle speed when even the next sixteenth would have made it slow:
   10-15% of the bricks broke between the marks. Short hops now always land
   on the next sixteenth.
2. **Three bookkeeping slips in the first draft** - a paddle's return after a
   lost point, the score shown at a given moment, and which bricks are
   silver - were found reading the draft back and fixed before it ran.

### What was checked in this round

| Check | Result |
|---|---|
| 4 seeds × 3 minutes, one in 13-step bars: when the big moments land | numbers above |
| Frames at a lost point, an alien hit, the saucer, a brick breaking | the paddle bursts and is gone; aliens burst in the formation; the saucer bursts at the top; a brick breaks with its pieces flying |
| `npm test` (16 checks) and two 8-second renders each of paddles, invaders and bricks | all pass; each pair byte-identical; the audio hashes unchanged by the score naming its accents |
| Live: paddles, invaders, bricks on the audio clock | running; no console errors |

## The boxing round: a fight with some acting

The owner's request: the knocked-out robot fell straight back like a plank;
it should crumple as if switched off. Bring in the acting of the console
boxing classics - dodging side to side, showing off - so people can tell the
homage was made with care, without losing the punches on the music. And,
mid-way: draw the player's boxer see-through, as the arcade game did, so the
whole show stays in view and the player keeps their identity.

**Joints.** The robot could only tip over whole from its heels. It now has
knees that bend and hips that sink, a body that rolls to the side as well as
leaning and twisting, a head that hangs, and it can tip over from its knees.

**The choreography** runs on the bars: sixteen bars from one knockdown to the
next, the star punch landing on the downbeat that opens bar 8 of every
sixteen - where a phrase opens on a crash. In between, each two-bar phrase
the challenger picks one of five moves, by the seed: a hook or an uppercut
(with a tell in the visor a beat ahead), a flurry of three jabs on the
eighths, a showboat (pounding his gloves together, then waving you in), or
weaving side to side on the beat so your jabs find air. Yours blocks the
jabs, slips the big ones sideways and punishes with a flurry on the eighths;
now and then the big one gets through. In the last phrase he is dazed, you
hit him on every beat and load the star punch.

**The knockdown.** On the punch his visor and chest light go dark, his head
snaps back, then his knees give, his arms drop and hang, his head drops, and
he folds onto his knees and tips over, bouncing once on the canvas. Sparks
spit from his neck and smoke rises; the crowd's cameras flash; the camera
drops to the canvas; the count goes up from 1 to 8, one number a beat. Then
the visor flickers back on and he gets up.

**See-through.** The scene is raymarched without your boxer, then yours is
marched on its own and laid over it in green glass - lit at its edges and
along scan lines, the gloves a little more solid.

### What went wrong in this round

1. **A bar down the back of your boxer**, reported by the owner: once your
   boxer was see-through, the far corner post of the ring showed through it,
   right behind its spine, where the three ropes meet. Yours now stands a
   little to the right, so the post stands clear beside it.
2. **Sparks rising from the empty canvas**, reported by the owner: the sparks,
   smoke, shadow and camera of the knockdown aimed at a guess of where the
   fallen body was. They now use the body's real position - the transform that
   builds the robot, run backwards for the neck, the head and the hips.
3. **Empty space on the right**, reported by the owner: the camera now frames
   the two of them as a pair, and while he is counted yours walks to a
   neutral corner, as a boxer must, leaving the fall in full view. (A first
   attempt moved the camera too far and filled the middle of the frame with
   your boxer; it was put back.)

### What was checked in this round

| Check | Result |
|---|---|
| Frames through a knockdown (the punch, the fold, lying for the count, getting up) and through three phrases at their key beats | the moves read as intended: a showboat, a hook slipped and punished, jabs blocked and countered; the count shows 1, 2, 5, 8 on its beats |
| `npm test` (16 checks) and two 8-second renders of the boxer | all pass; the pair byte-identical |

## The light cycles round

The owner's request: make the light cycles a real game - riders leaving
walls of light, a rider that touches one blowing up - with the turns on the
music and the explosions on a musical moment where possible.

**First pass.** Four riders on a 48 × 26 grid, a cell an eighth, walls that
stayed for the whole round, a rider killed by any wall it touched, and the
game planning one crash a bar ahead of each phrase. The owner's verdict: the
speed of the first version was gone, and with it its look - the dynamics of
the riders were what mattered. If crashing was the trouble, they suggested,
simulate a crash between riders when an explosion is wanted, and keep the
first version's trails.

**As it stands.** The riders fly again: two cells a sixteenth, about the
speed of the first version, each trailing a wall 90 cells long that thins
and dims towards its tail, drawn as the first version drew it - a white-hot
point with a flare across it that kicks with the drum, the line and its
glow, the same grid. They turn on the beat and dodge between beats. Following
the owner's suggestion, a rider never goes down by accident: one boxed in
turns wherever it must, and slips through as a last resort. It goes down only
when the game sends it: two beats before the downbeat that opens a phrase (or
an accent), the game tries every way a rider could go - straight, or a turn
on each eighth - finds the ones that end in a wall, preferring another
rider's wall, spreads the cells to it over the sixteenths left (a cell more
or less in some of them, so the rider surges or eases into it) and plays the
arena ahead once more on a copy to make sure it hits on the downbeat itself.

Over four minutes on four seeds, including a 13-step one: 42 rounds; 121
crashes, every one on a phrase downbeat or an accent and every one into
another rider's wall; 4,274 turns, 58% on a beat and 71% on an eighth - the
rest are dodges at speed, between eighths.

### What went wrong in this round

1. **The speed was lost**, reported by the owner: a cell an eighth was five
   to ten times slower than the first version. It is two cells a sixteenth
   now, with walls of limited length so the arena never fills.
2. **At that speed, crashes by accident**: half of them missed the musical
   moment, riders cutting across each other's path. Riders now watch where
   the others are about to ride; and, as the owner suggested, only a planned
   crash kills. Every crash now lands on its moment.
3. **Turns off the beat**, in the first pass: only 14% of the corners fell on
   a beat, because the turn was decided on the beat but the corner is where
   the rider stood a step earlier, and most turns were last-moment escapes.
   The decision is now taken standing on the corner, and a rider turns on
   the beat before a wall gets close.
4. **12 frames a second live**, in the first pass. The renderer was not the
   cause - the boxer, with the machine under the same load, ran at 60. The
   shader kept each rider's distance in an array indexed by a variable,
   which GPUs do slowly; with plain variables it runs at 60. Planning a crash
   costs up to about 45 ms once every four bars, which can drop a frame.
5. **Renders stopped mid-way twice**, to change the renderer's files without
   breaking them; both were run again from the start.

### What was checked in this round

| Check | Result |
|---|---|
| 4 seeds × 4 minutes: when the crashes and the turns land | numbers above; identical state after a rewind |
| Frames: riders and their walls, a crash into a wall, the wall derezzing, a later crash | as intended, in the first version's look |
| Live, the gallery seed | 60 fps; no console errors |
| `npm test` (16 checks) and two 8-second renders of the light cycles | all pass; the pair byte-identical |

## The sound-card round: the music of the better machines

The owner's request: more variety in the music. Much of it sounded like a
C64, not like an Amiga or DOS, or the era of better sound - the Sound
Blaster 16, the Sound Blaster 32 and the AWE.

**The cause.** A score names its instruments (a bass, a pad, a snare) and the
synthesizer had one voice for each, so every era sounded the same, and
several styles leaned on chip pulses and arpeggios.

**Sound chips** (`src/core/chips.js`). The era now chooses what plays the
score: Paula for the Amiga, a Sound Blaster 16's OPL3 FM or an AWE32's
wavetable for DOS (by the seed), wavetable for the consoles; the C64, arcade,
handheld and later eras keep the synthesizer's own voices.

- **Paula** samples each of the synthesizer's instruments once, at C-3, cuts
  the sample to 8 bits at 16.7 kHz (drums at 28 kHz) point by point, and
  plays it back as a tracker does: stepping through it faster or slower with
  no smoothing, looping sustained sounds, a 64-step volume, hard panning
  (drums and lead left, bass and chords right, a quarter of each to the other
  side), the A500's output filter, almost no reverb.
- **OPL3**: two operators per note with the chip's seven waveforms, operator
  feedback, envelopes for each, a DC blocker for the one-sided waves, and the
  rhythm mode's drums (a swept bass drum, a snare from a tone and the coarse
  noise bit, hi-hats and cymbals from two squares and noise).
- **AWE32**: a grand piano from decaying inharmonic partials (rotating
  phasors, cheap enough for chords), a six-player string section, a
  four-voice choir through three formants, a three-horn brass section, a
  plucked bass and arp, an acoustic kit, and the card's chorus on the mix.

**Three styles of the sound-card years**, and five instruments every chip
plays (overdriven guitar, flute, harp, electric piano, slap bass):
`modjazz` on the Amiga, `fmmetal` and `midiquest` in DOS, `midiquest` on the
consoles. Their material comes from a random stream of their own, so the 21
styles before them keep every note.

**The sampler** plays each style on the chips of its eras: 24 styles, 33
takes.

### What went wrong in this round

1. **A brightness measurement that lied**: it read every other sample but
   counted frequencies as if it had read them all, and reported centroids of
   10-15 kHz. Corrected before any decision was taken on it.
2. **Paula too dull** (a centroid of 391 Hz against 3,466 for the same song
   on the synthesizer): the drums were sampled at the melodic rate and every
   sample was averaged on the way down, smoothing away the grit. Drums now at
   28 kHz, point-sampled; the same song now centres at about 1.2 kHz.
3. **OPL3 dull, then muddy**: its first patches drove the carriers too
   gently, and the abs- and half-sine waves put DC in the choir and organ (a
   centroid of 63 Hz). Brighter patches and a DC blocker.
4. **Instruments out of level**, found by playing each instrument alone on
   every chip: the AWE32 hi-hats 25 dB down, the OPL3 hi-hats and lead and
   both chips' snares low, panned instruments losing level when Paula folded
   them to mono. Matched to within a few dB of the synthesizer's own (Paula
   is left a little lower and drier on purpose: trackers had no reverb).
5. **The AWE32 too slow for chords**: 1.6x real time on eurodance's piano
   chords; the piano's partials became rotating phasors, 4.1x now.
6. **Paula cutting samples mid-song**: 30-170 ms the first time an
   instrument plays - too long for the audio thread. Every chip is now made
   ready for its eras' styles before a programme starts (about 400 ms, once).
7. **The sampler touched 0 dBFS** after the mp3 encode (the chips' sharp
   edges); it now leaves 2 dB of headroom.
8. **Dropouts in the mixes**, heard by the owner live. Measured block by
   block as the worklet renders, two AWE32 tracks overlapping needed up to
   65% of real time, with 88 blocks in 4 seconds over the 2.9 ms a 128-sample
   block allows; and the next track was composed in one go (3-10 ms) at the
   very start of the mix, when two tracks play. Causes: arrays and filter
   results allocated on every sample, a power for every pitch and an
   exponential for every filter coefficient, every sample; and the mixing loop
   asking for the next track every block, which composed it on the spot. Now
   the constants are made once, pitches come from a table, coefficients from a
   cache, the next track is composed a slice per block once the last mix has
   ended, and the loop knows where the next track starts without composing it.
   The same overlap needs 41%; over 8 minutes of AUTOPLAY, 22 of 165,375
   blocks run over (worst 4.6 ms), against thousands before. Every style on
   every chip, and AUTOPLAY, still hash the same, bit for bit.

### What was checked in this round

| Check | Result |
|---|---|
| The 15 original styles hashed against the earlier record, on their own synthesizer | byte-identical |
| The demo audio hash in `npm test` | changed, b9639ed94feaebe9 to 1e84e735099c3646, and only because the list grew: the test seed's `auto` pick moved from trance to rave. Trance alone still hashes b9639ed94feaebe9. Seeds that let the era or `auto` choose may now land on another style, as with every style added before |
| Every style on every chip: level, centroid, share above 8 kHz, L/R correlation, speed | peaks −1.9 to −3.1 dBFS; Paula hard-panned (correlation ≈ 0.5); OPL3 near-mono; AWE32 with chorus; all faster than real time |
| Each instrument alone on each chip against the synthesizer's | within a few dB, after the fixes above |
| Live: an Amiga demo, then AUTOPLAY | runs; no console errors |
| The audio thread, block by block over 8 min of AUTOPLAY, after the dropouts fix | 19% average load; 22 blocks over budget, worst 4.6 ms; every transition under 32% |
| The fix against the audio before it: every style on every chip, 12 s each, and 60 s of AUTOPLAY | byte-identical |
| Live: AUTOPLAY through a track change after the fix | plays on; no console errors (the browser's own favicon request aside) |
| `npm test` | 16 checks pass, 24 styles compose |

## The plan, and its first piece: the fire

The owner and Claude turned every inspiration given so far into one plan,
`docs/PLAN-v0.2.md`: everything in it goes into v0.2, built a little at a
time. The owner asked to start with something small. The first piece is the
**fire** (`fire`, in the DOS era): the 256-colour fire every DOS demo had.

**How it works.** A grid of chunky cells, a hundred rows, as the demos ran
the fire at half resolution. Every column burns to its own height, the
heights drifting up and sideways, so the flames come out as separate tongues
with dark gaps; the base burns solid and only the upper parts fray. The heat
goes through the fire palette — black, red, yellow, white. The flames reach
higher on the kick and as the music builds, sparks fly up on the snare and
the hats, and when the music peaks a seed-made emblem (a ring around a
diamond, a star or a triangle) catches fire, with tongues rising off it.
Some seeds burn blue.

### What went wrong in this piece

1. **A wall, not a fire.** The first version, held against the classic
   effect, read as a glowing wall: a solid white and yellow base taking a
   third of the screen, black holes inside the flames, and an emblem that
   only turned white. The flames were rebuilt as columns of their own height,
   the flicker kept off the base, and the emblem given rising tongues.
2. **A ghost before the fire.** Live, the unlit emblem showed as a ring of
   red dots: its "almost black" was dithered by the DOS palette. It is now
   pure black until it burns.
3. **A frame rate that could not be read.** The in-app browser was hidden,
   so the page was throttled — the existing plasma scene measured 2.9 fps
   there too. The cost was measured instead against the other DOS scenes on
   the same software renderer.

### What was checked in this piece

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for three seeds | low flames when calm, tall on the kick, the emblem burning at the peak; orange and blue seeds |
| Shader cost against the DOS scenes, same software renderer, 854×480 | fire 5.4 ms a frame, the same as plasma; fireworks 12.6, ripple 11.2, metaballs 10.4 (all of them run live at 60 fps) |
| Live in the browser | runs; no console errors |
| `npm test` | 16 checks pass |

Adding a scene changes which scene some seeds pick when the scene is left to
the seed, as every scene added before did.

### The second piece: the Kefrens bars

The Amiga classic (`kefrens`). On every raster line a short shaded bar is
drawn at a position that swings on two sines, into a line buffer that is
never cleared, so each line shows every bar drawn above it and the bars pile
up into a ribbon. The shader does the same thing backwards: for each line it
looks up the raster lines above for the last bar that covers the pixel. The
swing widens on the bass and as the music builds, the bars fatten and
brighten on the kick, the colours turn with each bar of the music, and a
copper bar rolls down behind the ribbon on every beat.

**What went wrong.** The first version barely moved with the music — the
calm, the kick and the peak looked alike — and its beat bar crossed the
ribbon as a murky grey stripe. The swing and the bars' width now follow the
bass and the kick, the beat bar runs behind the ribbon, and a faint
background gradient that the Amiga's 12-bit colour cut into a visible band
was replaced by black, as in the original.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for three seeds | narrow and calm when quiet, wide, fat and bright on the kick and at the peak |
| Shader cost against the Amiga scenes, same software renderer, 854×480 | kefrens 7.9 ms a frame; vectorballs 8.5, ripple 7.6, copper 7.4 (all live at 60 fps) |
| `npm test` | 16 checks pass |

### The third piece: the bouncing checkered ball

The Amiga's first and most famous demo (`ball`): a red and white ball, sixteen
squares round and eight from pole to pole, spinning on a tilted axis and
bouncing from wall to wall of a grey room ruled in purple, its shadow thrown
on the back wall. Here its arc is the beat — it touches the floor on every
one — it spins faster as the music builds, and the room catches the light on
the kick. Flat red and white, as the original was, with only a hint of the
ball's edge.

**What went wrong.** The floor's perspective came out inverted: its lines
crowded at the bottom of the screen, in a moiré, where they should crowd at
the far wall and open out towards the viewer. The floor is now laid out by
its depth, and its squares grow as they come closer.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for three seeds, against the original demo | the grey room and purple grid, the tilted spin, the shadow down and to the right, the bounce wall to wall; the floor's perspective corrected |
| Shader cost against the Amiga scenes, same software renderer, 854×480 | ball 4.1 ms a frame; kefrens 3.8, copper 4.3 in the same run |
| `npm test` | 16 checks pass |

### The fourth piece: the interference rings

The XOR circles of the Amiga and DOS demos (`rings`, in both eras): two sets
of concentric rings drifting through each other, every crossing flipping the
colour, so the moiré between them seems to move on its own. The rings run
outward on the kick and tighten on the bass, two of the seed's colours turn
with each bar of the music, and a third set joins in when the music peaks.

**What went wrong.**

1. **A muddy peak.** The third set of rings was blended in by degrees, so at
   the peak half the screen sat between the two colours — darker and duller
   exactly when the music was loudest. It now joins in all at once.
2. **Colours that could not be told apart.** The seed's palette sometimes
   gives a "light" colour as dark as the dark one. Each colour is now set to
   a brightness of its own: the light one always light, the dark one never
   black.
3. **Kinder to the eyes.** A fine, high-contrast pattern covering the whole
   screen, moving, can trouble people sensitive to visual patterns. The dark
   colour stays a fifth as bright as the light one rather than black, and the
   beat moves the rings outward instead of inverting the screen.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for two Amiga seeds and one DOS seed | two clear colours in every frame; the third set at the peak |
| Shader cost against the Amiga scenes, same software renderer, 854×480 | rings 4.3 ms a frame; ball 4.4, copper 4.9 in the same run |
| `npm test` | 16 checks pass |

### The fifth piece: the LCD juggler

The single-game LCD handhelds of the early 80s (`lcd`, in the handheld era):
a juggler drawn in fixed black segments on a grey screen, with every unlit
segment faintly visible behind, as on the real glass. The balls jump from
cell to cell along three arcs and land in a hand exactly on the beat — the
inner ball every beat, the middle every two, the outer every three — and the
juggler's arm is always out where the next catch is. The outer ball only
comes in when the music picks up. The score counts every catch so far, in
seven-segment digits with the ghost of an 8 behind each.

**What went wrong.** The first frames had the juggler too low, cut off by
the bottom of the screen with the top half empty, and the unlit segments so
faint the LCD look was lost. The figure was raised and given legs, and the
ghost segments darkened to the next shade of the LCD.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for two seeds | the ghost of every cell, arm and digit visible; two balls when calm, three when the music picks up |
| Shader cost against the handheld scenes, same software renderer, 854×480 | lcd 5.8 ms a frame, the same as fireworks, the costliest handheld scene |
| `npm test` | 16 checks pass |

**The owner's verdict, and the rebuild.** The owner found the juggler
unrecognisable: nobody would see the 1980 game in it. This time it was held
against the real thing — a photograph of the device, and one of it running,
from Wikimedia Commons — and not against memory. What makes it recognisable
was missing: the device itself (the brushed silver face, the maroon case,
the two big round red buttons with their arrows, the three small ones, the
screen sunk in a red border), a grey screen rather than a green one, and a
juggler with character — a round head with a tuft, eyes, a round body, short
legs, arms straight out with open hands — big enough to fill the screen. It
was rebuilt that way, without the brand's name or logo, and moved to the
1979 arcade era: the device came out in 1980, and the handheld era's four
greens would have turned its silver and red into green. Shader cost 4.7 ms a
frame, the same as the other arcade scenes.

### The sixth piece: the scanner car

The talking car of 80s television, as an idea (`scanner`, in the 1979 arcade
era, next to the synth-pop): a long, low black car coming down a night road
straight at the viewer, the red light in its nose sweeping left and right —
eight lights, one pass on every beat, a trail fading behind it. The road
rushes faster as the music builds and the headlamps glow brighter on the
kick. No name, logo or design of the original: a black wedge of a car and a
red light.

**What went wrong.** The first car looked like a box — almost a television
set — with a straight bar across it, the scanner too small to be the star,
and a road so wide that its edges ran out sideways instead of narrowing to
the horizon. The car was rebuilt long and low, as a wedge with a raked
windscreen and slim headlamps; the scanner made a long slot across the nose;
the road narrowed to a lane that meets at the horizon.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for two seeds | the sweep and its trail on the beat; the road converging; the headlamps on the kick |
| Shader cost against the arcade scenes, same software renderer, 854×480 | scanner 4.6 ms a frame, the same as paddles and snake |
| `npm test` | 16 checks pass |

### The seventh piece: the footsteps

The dinosaur films' most famous warning, as an idea (`footsteps`, in the
32-bit console era): two short plastic cups of water on a car's dashboard,
at night in the rain, the water trembling into rings with every footstep.
The musical direction is Claude's: the left cup shakes on the kick and the
right on the snare, as if the steps came from two sides; the rings run
deeper with the bass; at the peak the light drops as something huge goes by
the windscreen. Nothing of the animal is shown.

**What went wrong.** The first version was drawn from memory — one tall
glass, small in a black frame, rain that read as stars. The owner asked, the
same turn, never to work from memory again: always look at reference images
first, then give the homage a musical direction. Two frames of the scene
showed what was missing: two short cups that flare at the rim, side by side
on a grey-blue dashboard ledge, the whole shot in a cold blue, the rain on
the windscreen at the top. It was rebuilt against them.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for two seeds, against two frames of the scene | the two flared cups on the ledge, the cold blue, the rain on the glass; rings on the kick and the snare; the light dropping at the peak |
| Shader cost against the 32-bit console scenes, same software renderer, 854×480 | footsteps 4.3 ms a frame; vectorballs 4.0, starfield 5.7 in the same run |
| `npm test` | 16 checks pass |

### The eighth piece: the twister

The twisted bar of the Amiga and Atari ST demos (`twister`, Amiga), the first
piece started from a reference rather than from memory: a still of an Amiga
twister demo showed what to keep — a column whose faces carry a texture
(stone blocks, lettering), each face lit by the angle it turns to the
viewer, the column twisting up the screen in an S with curved edges. Each
line of the screen turns the square a little further; of its four faces,
the ones turned towards the viewer are drawn, block-textured and edged.

The musical direction is Claude's: the twist winds up as the music builds
and unwinds after it; the bar snaps a quarter turn on each kick; the blocks
flicker with the hats; at the peak two more twisters join, turning the
other way.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for two seeds, against the reference still | the textured faces, the shading by angle, the S-shaped twist; nearly straight when calm, wound tight on the kick, three at the peak |
| Shader cost against the Amiga scenes, same software renderer, 854×480 | twister 6.6 ms a frame; starfield 6.2 in the same run |
| `npm test` | 16 checks pass |

### The ninth piece: the pyramid hopper

The cube-pyramid game of the 1982 arcades (`pyramid`, arcade), built from the
game's screenshot on Wikipedia: twenty-eight cubes in seven rows on black,
each top changing from blue to yellow when landed on, a teal left face and a
dark right one; rainbow discs floating at the sides; a red ball bouncing
down; the score and the "change to" cube in a corner. The original's hopper
is a character, so this one is a round green hopper with big eyes.

The musical direction is Claude's: it hops one cube a beat and lands on the
beat, the cube it lands on lighting up with the kick; a red ball drops in
every two bars and bounces down a row a beat; the discs turn with the hats;
each round of 48 hops brings its own colours, as the game's levels did.

**What went wrong.**

1. **A hopper lost on the yellow tops** — green on yellow, without an edge. It
   has a dark outline now, as the arcade's sprites had.
2. **A score under the title plate**, and its first digit cut by the screen's
   curve. The score and the "change to" cube moved to the top right, and the
   pyramid down a little, clear of the plate.
3. **Forty-eight walks a pixel.** Whether a cube had been landed on was found
   by walking the hopper's path again from the start for every hop, 48 × 48
   steps for every pixel of a cube's top. The path is now walked once; the
   frames came out identical, the cost a third of what it was.

| Check | Result |
|---|---|
| Frames at the calm, the strongest kick and the peak, for two seeds, against the game's screenshot | the pyramid, the two-colour tops, the faces, the discs, the ball, the score and the target cube |
| The walk-once rewrite against the frames before it | identical |
| Shader cost against the arcade scenes, same software renderer, 854×480 | pyramid 5.5 ms a frame; snake 9.0, bricks 5.8 in the same run |
| `npm test` | 16 checks pass |

### The tenth piece: the 3D pipes

The screensaver of the mid-90s office PC (`pipes`, DOS), built from three
captures of the original: on black, shiny pipes of solid colours (green,
teal, orange, white, red, yellow), each growing through a grid in space,
turning at right angles with a ball joint at the turn, the tangle piling up
into the distance until the screen is full. Each stretch is drawn as a
polished cylinder - lit across its width, a highlight running along it - and
the nearest one at each pixel wins.

The musical direction is Claude's: a pipe grows a stretch a beat and turns
on the beat; a new pipe starts every bar; the joints swell on the kick; the
colours warm with the pad; every eight bars the tangle dissolves away, pixel
by pixel, and a new one grows.

**What went wrong.** Five things, each seen in the frames against the
captures: the tangle lay almost flat, with pipes passing huge in front of
the camera (a deeper box, the camera further back, the nearest stretches
left out); a ball at every stretch rather than at the turns; the dissolve in
big blocks that looked like a glitch (now pixel by pixel); a seam with a dark
spot wherever two straight stretches met (the stretches are now cut flat and
overlap by a hair); and one black pixel fixed on the screen, which turned out
to be the dissolve itself — a pixel whose random value was exactly zero went
dark even before the fade began. The test is now strict.

**Black on the owner's machine.** Every check above ran on the software GPU
the offline renderer uses. Live, on a real GPU, the scene was black: Chrome on
Windows hands shaders to Direct3D 11, whose compiler rejected one function -
the one that turns a pipe - because it chained conditional expressions that
return vectors (`a ? v1 : b ? v2 : v3`). Narrowed down by compiling variants
on the owner's GPU in the live page; the same logic written with if/else
compiles, and the offline frames came out byte-identical to before. Every
other scene, the earlier ones and the new, was compiled and drawn on the real
GPU at the same time: all of them pass. From now on each new scene is checked
there too before it is called done.

| Check | Result |
|---|---|
| Frames across a whole cycle, against three captures of the original | the tangle growing a stretch a beat, the colours, the joints at the turns, the depth, the dissolve |
| A close-up of a straight run | one continuous tube, no seam, no dark pixel |
| Live, on the real GPU (after the owner found it black) | draws; no shader errors in the console |
| Shader cost against the DOS scenes, same software renderer, 854×480 | pipes 7.0 ms a frame; plasma 7.6, tunnel 7.2 in the same run |
| `npm test` | 16 checks pass |

**The owner's second look.** With the scene running, the owner asked for
three things: the screen shake the game scenes have; the original's view,
from above at an angle, where the 3D of the pipes shows - the first version
looked at them head on; and no pipes crossing through each other, which made
glitches the original never had. The pipes became a simulation
(`src/core/sims.js`): a grid of cells, three pipes growing an eighth note at a
time, turning on the beat, never into a cell another holds; boxed in, a pipe
ends and a new one starts. The shader only draws what it grew, from a camera
above and in front, punching in on the kick with the game scenes' zoom blur
and leaning on the snare.

| Check | Result |
|---|---|
| Cells held by two pipes, 5 seeds × 6 cycles | none |
| Frames across a cycle, two seeds | seen from above; pipes running into the distance in perspective; joints at the turns |
| On the real GPU, live, every scene compiled and drawn | all 32 pass; pipes runs with no errors in the console |
| Shader cost against the DOS scenes | pipes 7.4 ms a frame; fire 9.0, fireworks 8.3 in the same run |
| `npm test` | 16 checks pass |

**The owner's third look.** The owner asked for joints like the original's -
not a ball at every turn - for the use of space the screensaver had, pipes
far away and the tangle progressing from the back forwards, for a slower
change, the screen saturated with pipes before it clears, and pointed out a
glitch: the growing tip ran on past the cell where the pipe then turned, so
the pipe seemed to break at the bend. The algorithm was checked against a
remake of the screensaver (1j01/pipes, MIT), used for ideas only - the owner
noted it is not faithful to the original: joints only at the turns, mostly
elbows, a ball a third of the time, a ball where each pipe starts, a big grid.
Each pipe now decides its next cell a step ahead and holds it, so the tip
always grows towards where the pipe really goes; the grid is 17 × 11 × 17;
the first pipes start at the back and the later ones nearer; a tangle lasts
sixteen bars, saturates, holds, and dissolves in blocks through the last bar;
each tangle has its own camera angle, always from above. The simulation now
projects the runs onto the screen and the shader only draws them, lit with
one light and a white highlight shared by pipes and elbows, so a joint shows
no seam. The owner looked at it running live and called it perfect.

| Check | Result |
|---|---|
| A growing tip off its run, or not next to the cell it heads for, 5 seeds × 4 tangles | none |
| Cells held by two pipes, same runs | none |
| How full a tangle gets | 182 to 192 runs (the cap) by the thirteenth bar |
| Frames across a tangle | pipes at the back first, the screen full by bar 13, elbows at the turns, the dissolve in blocks |
| On the real GPU, live, every scene compiled and drawn | all 32 pass; pipes runs with no errors in the console |
| Shader cost with the screen full (167 runs) | pipes 5.5 ms a frame; plasma 8.2, fire 9.4 in the same run |
| `npm test` | 16 checks pass (one earlier run failed loading the render page and passed on the rerun) |

### Every game scene floats, and the pyramid moves

The owner asked for the floating screen the flat games have on every scene
inspired by a game - and, where the game is a device of its own, as the LCD
juggler is, for the whole device to float - so everything moves with the
music; and for the pyramid to stop being static: the hops in time with the
music, the pyramid built in motion, its cubes jumping on the rhythm.

The stage takes a game in one of two ways now: on the board, as before, or as
an object, where the game marks its own outline and space shows round it.
The pyramid, the robot title fight and the space run went on the board; the
LCD juggler floats as the device. All of them got the zoom blur on the kick.

The pyramid's round is twelve bars: four beats to build it from the bottom
up, a row dropping into place on each eighth note; the hopper drops onto the
top as it finishes; forty hops, each with a crouch before it leaves, a
stretch in the air and a squash as it lands on the beat, the cube under it
giving and a ripple running out through the cubes round it; three beats in
which the cubes jump in a wave down the pyramid and the tops run through the
colours; and one in which the pyramid falls away, the bottom row first.

| Check | Result |
|---|---|
| Frames across a round of the pyramid | the build bottom up, the drop, crouch, air and squash, the ripple, the wave, the fall, the next round |
| Frames of the LCD juggler, the robot fight and the space run on the stage | the juggler floats as the device with space round it; the other two on the board |
| On the real GPU, live, every scene compiled and drawn | all 32 pass |
| Shader cost, same software renderer, 854×480 | pyramid 8.6, lcd 7.5, boxer 8.3, starfighter 8.5 ms a frame; paddles 9.7, outrun 9.4 in the same run |
| `npm test` | 16 checks pass |

### The pyramid, played

The owner liked the pyramid's rhythm and asked for the game under it to be
faithful in part, as the other game scenes are - how the red ball behaved,
and what happened to the character when it touched one. From the game's
description (Wikipedia's Q*bert article) and a screenshot of the arcade
original: red balls appear on the second row and bounce down until they fall
off the bottom, and touching one costs a life, with the character's
cartoon swearing in a balloon; a purple egg bounces to the bottom and hatches
into Coily, the snake, who chases; a disc at each side carries the character
to the top, and Coily, in close pursuit, jumps after it and falls.

The pyramid became a simulation (`src/core/sims.js`), on eighth notes: the
hopper lands on the beats, the enemies between them, so the two make a
rhythm together. The hopper heads for the tops still to turn, away from the
balls and the snake - now and then it misses a ball coming, so hits happen -
and, with the snake out, keeps near a disc to lure it off the edge. A hit
stops everything for two beats while it swears, then clears the board. All
tops turned wins the round; the build, the ripples, the squash, the wave and
the fall from the last pass stay, now on the game's own timing. The
character stays a round green hopper of our own.

| Check | Result |
|---|---|
| 600 beats of play, five seeds | 8 to 10 rounds won, 60 to 80 beats a round; every disc ride lured the snake to its fall; the hopper never off the pyramid |
| Frames against the arcade screenshot | the ball dropping onto the second row and falling off the bottom, the egg, the coiled snake chasing, the ride, the snake's fall, the swearing balloon on a hit, the won round |
| On the real GPU, live, every scene compiled and drawn | all 32 pass |
| Shader cost, same software renderer, 854×480 | pyramid 4.6 ms a frame (it reads the game's state instead of walking it); paddles 4.9, maze 7.0 in the same run |
| `npm test` | 16 checks pass |

### The starfighter, against the console original

The owner saw white rays crossing the starfighter's screen, seeming to come
from below, out of view, like shots at the ship from nowhere. Measured
before anything was changed: a strip of sixteen frames showed four of them.
The shots are drawn green, red and yellow; these were white. The cause was
the background's stars: each is a short streak flying at the camera, and the
nearest came so close that its streak projected across the whole screen,
drawn at its thickest and brightest. Cutting the near stars on the same
frames made the four rays vanish and changed nothing else — the cause
confirmed before the fix.

The owner then asked for the same work as the other homages, from
references, and for more of them: six screenshots of the 16-bit console
original (from Wikipedia and an image search) were held against the scene.

| The original | Before | Now |
|---|---|---|
| A white fighter with tall, slender blue fins rising from the wing tips | two blue triangles, a bow tie when it rolled | a long white body, light swept wings, the fins rising and leaning in; tipped a little more towards the camera so the wings read |
| Red delta-wing enemy fighters | red spinning octahedra | red delta-wings with a grey belly and fin, banking as they weave |
| Space of points of light; long streaks only in the warp | long streaks everywhere | points and short dashes; a warp on each new sector |
| A planet of snowy mountains, clouds, green ground with dots; stone arches; the ship's shadow on the ground | an orange sunset over a neon grid | blue sky and clouds (an orange desert for some seeds), snowy mountains, green ground with dots, stone arches on the bar, the shadow beneath the ship |
| A red SHIELD bar | none | a red bar that drops when a shot lands and charges back; the kills counted top right |

**What went wrong on the way.** A second full-screen flash came to light: the
camera passing through a ring tinted the whole screen beige, every two bars
— against the plan's rule of no full-screen flashes. It is gone, and so is
the white flash at a new sector, now a warp. The first redrawn fins came out
as great dark sails, and the planet's shadow fell near the horizon, on the
decorative ground's own scale; the fins were slimmed and the shadow placed
under the ship as it is drawn.

| Check | Result |
|---|---|
| The same sixteen frames, before and after | no ray across the screen |
| Frames in space and over both planets, for four seeds, against the six screenshots | the ship, the fighters, the stars, the mountains, clouds, arches and shadow, the shield bar |
| Shader cost against the console scenes, same software renderer | in their range (13.8 ms a frame against fireworks' 14.9 in the same, busier run) |
| `npm test` | 16 checks pass |

**The owner's second look.** Two things still read wrong. The drones showed
up low on the screen and close - over the planet they seemed to come out of
the ground - and dived below the ship, against the perspective of the game,
where enemies come from the horizon. The cause, measured: a flight was placed
by its spot on the screen but held at a fixed height in the world, and that
height was below the ground's line at the depth where it appeared; as it
came on, its fixed height took it down the screen, under the ship. And the
barrel roll turned the drones' shots away, which the owner does not remember
in the original - Wikipedia's Star Fox article says the Arwing manoeuvres
round attacks, and a hit costs shield energy; the owner remembers the ship
shaking and the screen flashing when hit.

A flight now shows first far off, at depth 30 to 34: over the planet as
specks just above the horizon, in space anywhere in the distance, half of
them sweeping in from a side; as it nears it eases down to the ship's height
to pass round it, and over the planet it never goes below the ground's line
at its depth. Far off the drones come out of the haze - the sky's colour
over the planet, the dark in space. The roll is gone: the pilot sees most
shots coming, works out where each will cross and slides aside of it; a shot
that lands shakes the ship (a jolt and a rock), jolts the camera, flashes the
screen once and flares the edges red. After a hit the shield holds for a
moment, so two flashes never come back to back.

| Check | Result |
|---|---|
| Drones over 400 beats, five seeds | about 300 born a seed; none born nearer than depth 25; over the planet none below the horizon when born, none below the ground's line on the way |
| Hits | 15 to 28 in 400 beats a seed - about one every five bars; before the dodge aimed at where the shot would cross, about one every two |
| Frames, space and planet | specks in the distance and over the horizon, growing as they come; the flash and the red edges on a hit, the ship rocking |
| On the real GPU, live, every scene compiled and drawn | all 32 pass |
| Shader cost, same software renderer, 854×480 | starfighter 4.4 ms a frame; footsteps 8.1, morph 4.8 in the same run |
| `npm test` | 16 checks pass |

### Sound off, a stable scene pick, and the unlimited bobs

**The owner's decisions (2026-10-29).** The scene pick goes stable; the
music by ear waits for a stage of its own, going over the styles one by one;
the project goes under git at the v0.2 release (v0.1's lost source does not
matter); and the token and cost figures were for v0.1 only, so v0.2 is not
measured further. Next: round 12's small demo effects.

**Sound off.** The owner asked for a way to work without the development PC
making sound, and for viewers who only want to watch: `V` in live mode, a
SOUND row in the SETUP menu, and `seedscene live --mute`. The synth keeps
running at no volume - it is the picture's clock - so everything stays on the
beat; the choice is kept in the page address and the copied live command.
Everything Claude runs now starts muted.

**A stable scene pick.** A seed used to take its scene by position in the
list, so a new scene moved about half the seeds. Now every scene gets its
own score from the seed and the seed takes the one it favours most.

| Check | Result |
|---|---|
| Seeds moved by one more scene, 5000 seeds | 48.7 % before, 3.3 % now (1 in 32 is 3.1 %) |
| How evenly the 32 scenes are picked, same seeds | 128 to 189 seeds each |
| Sound off, live | volume 0 at the start with `sound=0`; `V` turns it on and off, the toast and the address follow |

**The unlimited bobs** (`bobs`, Amiga), from three videos of the effect: a
chain of shaded balls on a Lissajous figure (Amiga), a tube of balls on an
Apple II, and one with a counter of the sprites drawn. A ball every 48th
note, never erased; bigger on the kick, lighter on the snare, each bar its
colour; eight bars weave one figure twice round into a knot, the last bar
takes it back from the tail. The first version also counted the balls in a
corner, as one of the videos did; the owner pointed out that counters belong
to the game scenes, and it went. The first version laid a ball every 32nd note
once round and looked sparse next to the references - a thin figure eight,
not a woven chain; now the chain is dense and knotted, as theirs.

| Check | Result |
|---|---|
| Frames across a phrase, against the three videos | no counter; the chain growing, the knot, the swell on the beat, the bar colours, the tail taken back, a new figure |
| On the real GPU, live, every scene compiled and drawn | all 33 pass |
| Shader cost, same software renderer, 854×480 | bobs 4.5 ms a frame; kefrens 5.1, twister 5.2, copper 5.2 in the same run |
| `npm test` | 16 checks pass |

**The owner's look at the bobs.** The owner was not sure the simulation was
the original's: the frames caught what a picture shows, not how it moves.
The algorithm, from Sol's Graphics Tutorial and the Plus/4 encyclopedia: the
machine cycles a few screens without clearing them and draws one ball a
frame on the screen it is about to show, so each screen holds the balls of
every round, and the chain "looks like all the bobs are moving". The first
version laid balls that stayed where they fell, a trail growing at its head;
in the original the whole chain slides along behind the head, tracing its
path. Now at time t the scene draws the balls drawn at t, t - D, t - 2D ...,
D a 48th note: one frame to the next, every ball moves a step along the path,
and the chain grows a ball each round. The tail no longer winds back at the
end of a phrase - the original never undrew anything: the next phrase
clears the screens, as a demo cleared them for its next part.

| Check | Result |
|---|---|
| Four frames 0.03 beats apart, zoomed | every ball a step further along the chain, the chain sliding behind its head |
| Frames across a phrase | the chain growing into the knot; the cut to a new figure on the phrase |
| On the real GPU, live | compiled and drawn |
| `npm test` | 16 checks pass |

**And a second look.** The owner liked it, and asked for the shake on the
bass the game screens have; for the old balls to fade out; for a movement
backwards into the depth; and pointed out that the balls were hard to see as
balls - so dense, and sliding, that they read as a tube. Now a ball every
16th note (it was every 48th), so each one is a ball; as a ball ages it
recedes (drawn smaller, nearer the centre) and fades, and older balls show
through where newer ones fade, so the chain flows away from its head into
the distance and never needs clearing; the swelling of a kick is smooth, so
it flows away with the chain rather than flickering from ball to ball; the
screen punches in on the kick with the zoom blur and shakes with the bass.

| Check | Result |
|---|---|
| Frames over 56 beats | separate balls, the chain receding and fading into the distance, the zoom blur on a kick |
| On the real GPU, live | compiled and drawn |
| Shader cost, same software renderer, 854×480 | bobs 8.7 ms a frame; kefrens 9.9, twister 9.8, copper 11.3 in the same run |
| `npm test` | 16 checks pass |

**And a third.** A ball drawn on a kick stayed big as it flowed away, which
read oddly: the owner wanted the swelling, not to keep it. Now the kick
swells the whole chain at that moment - most at the head, less down the
chain - and it settles back; the snare lightens it for a moment the same
way. Frames round a kick show balls of one size along the chain.

**And the speed.** The owner found it hypnotic but too slow for tracks with a
lot of rhythm: it did not keep the bar, and could surge on some sounds. The
scene's simulation now gets the music's feature tracks (the renderer hands
them to it with the score), and sums them into the head's clock: a slow
glide, a surge on each kick and on the pitched hits - the stabs, the lead,
the arpeggio. The first try spaced the balls in time, a 16th note apart, and
a surge pulled them apart into gaps, which the owner saw in the frames; now
they sit at even steps along the path behind the head, each one's age the
time since the head passed it, so a surge slides the whole chain on faster
and leaves no gap.

| Check | Result |
|---|---|
| Frames over 56 beats, and a quarter beat apart round a kick | an even chain, no gaps; the head a long way on after the kick |
| On the real GPU, live | compiled and drawn |
| Shader cost, same software renderer, 854×480 | bobs 7.1 ms a frame; kefrens 9.6, twister 8.0 in the same run |
| `npm test` | 16 checks pass |

**And a twin.** The owner, pleased with it, asked for a sibling moving the
other way, to bring back the woven look of the first version. A second chain
now runs the same figure backwards from another point, in the complementary
colours, on the same clock: the two cross and weave a knot as they pass.

| Check | Result |
|---|---|
| Frames over 56 beats | two chains running opposite ways, crossing into a knot |
| On the real GPU, live | compiled and drawn |
| Shader cost, same software renderer, 854×480 | bobs 4.0 ms a frame; kefrens 5.5, twister 4.8 in the same run |
| `npm test` | 16 checks pass |

### The chessboard, in two

The owner approved the bobs ("quedaron muy bien") and asked to continue with
round 12. The chessboard zoomer (`chessboard`, Amiga), from four videos of
the effect - Nuance's Dual Chess (1993), Sanity's Quarters Chess Board,
Quadriga's Chessboard intro and an A500 chessboard effect: a chessboard on
each bitplane, each zooming and sliding on its own, the palette giving each
overlap of squares its own shade, so the boards weave a shifting lattice
(the perspective chessboard floor of Quadriga's intro is already the copper
scene's). The musical direction: the first board's squares punch in on the
kick and ease back, the second breathes on the snare and slides with the
bass, a third fades in for the second half of each phrase (eight shades),
each phrase brings its own colour - crossfaded over a beat, never a cut of
the whole screen - and the screen shakes with the bass.

| Check | Result |
|---|---|
| Frames across two phrases, against the four videos | two boards weaving, the third fading in, the new phrase's colour; the purple phrase reads as Dual Chess |
| On the real GPU, live, every scene compiled and drawn | all 34 pass |
| Shader cost, same software renderer, 854×480 | chessboard 7.3 ms a frame; bobs 3.8, kefrens 4.9, shadebobs 5.3 in the same run |
| `npm test` | 16 checks pass |

**The owner's look.** The owner was not sure that was the effect: they
remembered it rotating. The references, looked at again frame by frame,
hold two effects: Nuance and Sanity zoom flat boards, the one built first;
Quadriga's intro has the one remembered - a chessboard seen from above at
an angle, in perspective, turning beneath the viewer like a turntable, its
corners swinging out over the black (the plan's own words for it: the board
turning beneath you). The scene was rebuilt as that: the board turns in
lurches on the beat, its squares breathe over two bars, the kick drops the
camera towards it, the snare tips it, each phrase its colour, the screen
shaking with the bass.

| Check | Result |
|---|---|
| Frames across a phrase and round a beat, against Quadriga's intro | the board turning a notch on the beat, its far corners over the black, the copper sky, the new phrase's colour |
| On the real GPU, live | compiled and drawn |
| Shader cost, same software renderer, 854×480 | chessboard 5.5 ms a frame; bobs 5.0, shadebobs 6.4 in the same run |
| `npm test` | 16 checks pass |

**Split in two.** Neither was the effect the owner remembered, and the plan
had it as Claude's own proposal with no one demo behind it, so the owner went
through the references: the first version was close to Nuance's Dual Chess,
and Sanity's Quarters Chess Board added the fluid zoom in and out; the
rotation they remembered was each board turning on its own axis; the second
version was very like Quadriga's intro, and with its bouncing cube it could
be a scene of its own. Both kept, with names to match:

- **dualchess** - the dual boards, now each turning on its own axis against
  the other, which breaks the squares into moiré, and zooming smoothly from
  huge squares to tiny ones and back; the kick punch, the snare breath, the
  bass slide and the third board as before.
- **chessfloor** - the perspective floor, now with Quadriga's red cube,
  turning and bouncing on the board, landing on every beat, jumping higher as
  the music builds, growing with the bass, spinning faster on the snare, its
  shadow on the board; and the board ripples in a wave, as so many demos
  bent their pictures, swelling with the bass.

| Check | Result |
|---|---|
| Frames of each | dualchess: the boards turning against each other, moiré as the squares shrink, the third board; chessfloor: the cube in the air and landing, its shadow, the wave on the board |
| On the real GPU, live, every scene compiled and drawn | all 35 pass |
| Shader cost, same software renderer, 854×480 | dualchess 4.5, chessfloor 4.6 ms a frame; bobs 5.8, twister 5.4 in the same run |
| `npm test` | 16 checks pass |

**And the owner's look at dualchess.** Excellent, the owner said, but it
overdid the turning and lost the first version's sliding layers; and at some
moment the screen went black. The black was measured on the real GPU, a
frame a second over three minutes: whole phrases at 0 and 9 out of 255 -
each phrase's colour comes from the palette, which can dip below zero, and
the colour was only scaled up, so some phrases came out black. Now the
colour is clipped at zero and lifted before it is scaled to full brightness,
in dualchess and in chessfloor, which shared the code. And the modes take
turns, a phrase each: the layers sliding sideways past each other, each at
its own speed; then the boards turning half a turn against each other, a
notch on each beat, square again at the end of the phrase.

| Check | Result |
|---|---|
| Brightness, a frame every two seconds over three minutes, both scenes, four seeds each, real GPU | lowest 59 out of 255 (it was 0) |
| Frames across three phrases | sliding, turning, square again, sliding; every phrase in colour |
| `npm test` | 16 checks pass |

**Too fast.** Live, the owner found it too fast: it made them dizzy. Measured
in the shader: the two layers crossed each other at about a third of the
screen's height a second, three or four squares a second; at the bottom of
the zoom the squares were about 8 pixels and shimmered; the kick snapped the
squares bigger and the bass shook the screen - all on a high-contrast
pattern. Now the layers slide at a third of that speed (about one square a
second against each other), the zoom takes a whole phrase and stops at
squares twice as big, the turning is a quarter turn a phrase with a softer
notch, and the kick and bass only nudge it.

| Check | Result |
|---|---|
| Frames half a beat apart, sliding and turning | sliding: a small shift in a beat; turning: a few degrees a beat |
| On the real GPU, live | compiled and drawn |
| `npm test` | 16 checks pass |

**Still some small squares rushing.** Much better, the owner said, but at
moments small squares still moved fast. They came from the zoom, not the
slide: zooming round its centre, a board's squares near the edges move far
more than the middle ones, most when they are small. The zoom now goes by
ratio (an exponential), slower - two phrases for the first board, three for
the second - over a narrower range, and the kick and snare nudge the size
half as much. The worst a square at the screen's corner moves in a beat,
counted in squares: 1.40 before, 0.38 now.

| Check | Result |
|---|---|
| Worst corner speed, computed from the zoom over 192 beats | 0.38 squares a beat (was 1.40) |
| Frames across the zoom's range | no small squares at any point |
| On the real GPU, live | compiled and drawn |
| `npm test` | 16 checks pass |

**The owner approved dualchess, and asked for chessfloor's wave in 3D**,
with the cube's landing making the board ripple; the flat bending of the
squares was not needed. The board is now a height field, found by marching
each ray down through the band the waves can reach: a slow swell all over
it that grows with the bass, and for each of the cube's last three landings
a ring - the board gives under the cube, rebounds, and a ring of two or
three crests runs out and dies away; the squares are lit by their slope, so
the waves read as relief. The flat bending was tried with it and left out:
it bent the squares without lifting them, at odds with the relief. The owner then saw in the
frames that the ring did not start where the cube hit: the cube never touched
the board - it rested at a fixed height, above the surface for most of its
turns, and did not follow the dent down. Now its lowest corner, as it is
turned, rests on the surface under it, so on landing it presses into the dent
its own landing makes, and the ring runs out from under it.

| Check | Result |
|---|---|
| Frames round a landing | the cube landing on the beat and pressing into the dent its landing makes, the ring running out from under it |
| On the real GPU, live | compiled and drawn |
| Shader cost, same software renderer, 854×480 | chessfloor 6.2 ms a frame; kefrens 6.8, copper 7.2 in the same run |
| `npm test` | 16 checks pass |

**The owner loved it; two things left.** The cube shook oddly, and the scene
looked flat. The shake came from three things that changed every frame: the
cube's size followed the kick and the bass, the hop's height followed the
music's instant energy (so the cube trembled in mid-air), and the camera
dipped on every kick. Now the cube keeps its size; its spin runs on a clock
of the music smoothed over about 0.7 s - faster as the rhythm gets busy,
slower as it thins, never more than 0.04 radians from one frame to the next;
each hop's height is set as it leaves the board, from the smoothed energy;
the board's swell follows the smoothed bass; the camera no longer dips. For
depth, the touches the demos of the time used, inside the Amiga screen's
sixteen levels: the cube mirrored in the board, faint and broken by the
waves; glints on the wave crests; the board catching the sky towards the
horizon; a glow round the cube; a bright copper line at the horizon.

| Check | Result |
|---|---|
| The spin over a minute | between 0.41 and 1.14 radians a second, following the rhythm; at most 0.04 a frame |
| Frames round a landing and later | the cube one size, landing in its dent; its mirror image in the board, the glints, the glow, the horizon line |
| On the real GPU, live | compiled and drawn |
| Shader cost, same software renderer, 854×480 | chessfloor 4.5 ms a frame; bobs 5.2, kefrens 5.3 in the same run |
| `npm test` | 16 checks pass |

### The rubber vector

The owner approved chessfloor and asked to go on with round 12. The rubber
vector (`rubber`, Amiga), from a video of the Amiga effect - a grey
flat-shaded cube, its sides bent - whose notes say it is done "by fiddling
with multiple copies of the cube", and Wikipedia's vector slime article: the
older implementations "kept old copies of the rendering result ... and
selected scan-lines from the different buffers" for a time displacement down
the screen. So each line of the screen draws the cube as it was a moment
before, the lower the older, over 0.6 s; the turn comes from a simulation
(`src/core/sims.js`) that hands the shader that stretch of it. The musical
direction: each kick gives the spin a shove that dies away, so the jolt runs
down the cube like a wave through jelly; the snare tips it on a spring; each
phrase its colours; copper bars behind it ride the bass. The cube keeps its
size.

| Check | Result |
|---|---|
| Frames round a kick and later, against the video | the cube bent and twisted as its lower lines lag, the jolt running down it after a kick |
| The gallery still | the first one showed a corner turned at the camera filling the screen over the title; the camera now sits further back, a corner reaching 0.44 of the half-height at most |
| On the real GPU, live, every scene compiled and drawn | all 36 pass |
| Shader cost, same software renderer, 854×480 | rubber 4.2 ms a frame; kefrens 4.4, twister 5.4 in the same run |
| `npm test` | 16 checks pass |

**The owner's look.** As a demo effect the cube was perfect; it lacked the
response to the music every scene of ours has. Now the screen punches in on
the kick, with the zoom blur, and shakes with the bass; the copper bars
flare on the kick and widen with the bass, a third joining them when the
music peaks; the snare flashes the light on the cube. The cube itself is
unchanged in shape and motion, but grey now, as the original's - in the
phrase's colour it melted into the bars.

| Check | Result |
|---|---|
| Frames on and after kicks, across phrases | the punch and the blur, the bars flaring, the third bar at the peak, the grey cube clear of the bars |
| On the real GPU, live | compiled and drawn |
| `npm test` | 16 checks pass |

### The bump-mapped logo

The owner approved the rubber vector with its music response, and the work
went on with round 12. The bump-mapped logo (`bumplogo`, DOS), from the
algorithm in Sol's Graphics Tutorial ("Bumping Along"): a 2D bump map, where
the slope of a height map at each pixel shifts where a light map is looked
up, and that light is added to the picture. Videos were searched for a
still of the classic look and none was faithful enough, so the scene stands
on the algorithm; the owner was asked for a demo they remember. The height
map is a seed-made emblem - a ring round a diamond, a star or a triangle -
raised with rounded edges out of rough stone. The musical direction:
coloured lights circle the emblem, flaring wider on the snare; the relief
deepens on the kick, the screen punching in with it and shaking with the
bass; a third light joins in the second half of each phrase; each phrase its
colours.

| Check | Result |
|---|---|
| Frames across a phrase | the emblem embossed in stone, its edges catching the lights on their side, the third light, a new phrase's colours |
| On the real GPU, live, every scene compiled and drawn | all 37 pass |
| Shader cost, same software renderer, 854×480 | bumplogo 6.1 ms a frame; fire 6.6, pipes 5.8 in the same run |
| `npm test` | 16 checks pass |

**The owner's look.** Good, but the shadows showed the screen filter's dots,
being pure black, and it was too frontal. The DOS screen has six levels a
channel and dithers between them, so a near-black breaks into dots between
black and the first level. The dark is now a deep blue that sits exactly on
the screen's levels - no red, no green, the first step of blue - so it stays
flat, and never pure black; the stone and the emblem show only where the
lights fall. And the relief is a plate seen at an angle, in perspective, the
camera leaning slowly round it over the phrase and tipping on the snare, its
far side dimming into the dark.

| Check | Result |
|---|---|
| Frames across a phrase | the emblem foreshortened, the angle changing; the shadows a flat deep blue, no dots |
| On the real GPU, live | compiled and drawn |
| `npm test` | 16 checks pass |

### The cracktro

The owner approved the bump-mapped logo and asked to go on. The cracktro
(`cracktro`, Amiga), from frames of Skid Row's, Paradox's and Fairlight's
Amiga crack intros: a chrome group logo - sky blue to white over a dark
horizon to gold, with a bevel - over stars streaming sideways, rainbow
copper lines, centred lines of text in a small bitmap font, and a big
rainbow sine scroller. The group, the release, the credits and the
greetings are made up from the seed (`src/core/sims.js`), never a real
group's name, in a 5x7 bitmap font handed to the shader as bits. The
musical direction: the logo bounces, landing on every beat and squashing,
a shine sweeping it on the snare; a page line types in each beat, a page
every two bars; the scroller's wave swells with the music and kicks on the
kick; the copper lines flare on the kick; the stars stream faster as the
music builds. The first frames had the scroller over the page's last line,
dull colours from the scene's palette and a line cut short; the layout was
spaced, the intros' own rainbow used, and the line shortened.

| Check | Result |
|---|---|
| Frames over three pages, against the references | the chrome logo, the stars, the copper lines, the pages typing in, the rainbow sine scroller below them |
| On the real GPU, live, every scene compiled and drawn | all 38 pass |
| Shader cost, same software renderer, 854×480 | cracktro 4.5 ms a frame; rubber 4.4, bobs 5.5 in the same run |
| `npm test` | 16 checks pass |

**The owner's look.** Three things. The texts: no made-up groups - if there
is text, it is about the project, and the thanks go to 3dgiordano and the
SEEDSCENE community at most. The heart of Skid Row's intro is its
starfield: stars in parallax that also move forward and back, as if
navigating space, which the flat layers did not give. And the text intro
belongs at the start, then fades out; two scrollers dancing at once (the
scene's and the title's) did not look good, so the scene's went. Now the
stars are sixteen layers in depth that the flight passes through, with a
short trail along each star's motion on the screen; the flight is a
simulation of the music (`src/core/sims.js`) - a new heading every two
bars (sideways, forward, back, or between), eased in over a beat, faster as
the music builds, a surge on each kick. The first try drew long lines
across the screen from the nearest stars, as the starfighter once did: the
trails are now capped at a few pixels and the nearest stars fade out. The
intro runs two pages - SEEDSCENE presents, one seed one demo, the music; then
the thanks - and fades over a bar.

| Check | Result |
|---|---|
| The flight over a minute | headings changing every two bars between sideways, forward and back |
| Frames through the intro and after | the intro's two pages fading away; the stars as dots with short trails, streaming out from the middle when diving, sliding sideways when drifting; no lines across the screen |
| On the real GPU, live | compiled and drawn |
| Shader cost, same software renderer, 854×480 | cracktro 3.9 ms a frame; rubber 5.7, bobs 5.3 in the same run |
| `npm test` | 16 checks pass |

**And the warp.** The owner asked for a warp now and then, forward as the
jump to hyperspace or sideways, with glow and filters to make the stars
more of today while keeping the era. In the last two bars of each phrase
the flight warps into the next - forward or sideways, by the seed, eased
in and out over a beat and a half: the trails stretch into long lines,
still capped so none crosses the whole screen, white at the head and blue
down the tail; every star has a glow, wider in a warp; in a forward warp
the middle glows softly where the lines come from - never a flash.

| Check | Result |
|---|---|
| Frames through a sideways and a forward warp | the streaks, the lines out of the middle, the glow; easing back to the cruise |
| On the real GPU, live | compiled and drawn |
| Shader cost in a warp, same software renderer, 854×480 | cracktro 3.9 ms a frame; rubber 3.7 in the same run |
| `npm test` | 16 checks pass |

### A static site

After the folder was renamed to `seedscene` (nothing in the project pointed
at the old path; the agent's memory moved with it), the owner asked for a
demo version as a static page that any static host can serve. The live page
already was one - every module loads by a relative path and the local server
only serves files - so `npm run build:web` (`tools/build-web.js`) copies the
live page and the code it loads into `dist/`, adds a front door that opens
the live page keeping the address's settings, and a `.nojekyll` for GitHub
Pages. One change to the live page: with no seed in the address it used to
open seed "demo" on the plasma; now it opens a seed's own scene, written into
the address so a reload or a shared link brings back the same demo. The command line always passes both, so nothing
changes there.

| Check | Result |
|---|---|
| The build | 19 files, about 500 KB |
| Served by a plain static host under a subfolder (`/seedscene/`), not the project's server | the front door opens the live page keeping `?sound=0`, adds a seed and its scene; the demo runs, `space` changes scene, `O` starts AUTOPLAY; no file missing in the host's log |
| `npm test` | 16 checks pass |

**Its defaults.** The owner asked for it to start in AUTOPLAY, with the seed
`seedscene`. The front door now sends a visitor with no seed of their own to
the seed `seedscene` with `autoplay=1`; a link that carries a seed opens that
demo as it is. The live page takes `autoplay=1` from its address and writes
it back as the viewer goes in and out of AUTOPLAY; with no seed at all it falls
back to `seedscene` too.

| Check | Result |
|---|---|
| The front door with no seed (`?sound=0`) | `seed=seedscene&autoplay=1`; RUN goes straight into AUTOPLAY, its quiet chrome and hint; `O` goes back to the demo and the address says `autoplay=0` |
| The front door with a seed (`?seed=aurora`) | that seed's demo, no AUTOPLAY |
| `npm test` | 16 checks pass |

### Published on each release

The owner asked how to keep the demo site and the source on GitHub, and for
the build and the deploy to run on their own when a version is released. The
answer was one branch, not two: Pages published from GitHub Actions, so the
source stays on `main`, nothing generated is committed, and the site's
history is the releases'. The workflow (`.github/workflows/pages.yml`) runs
when a release is published or by hand: it checks the tag names the version
in `package.json`, installs the packages without their Chrome and ffmpeg
downloads, runs the quick tests (the same-seed promise without the mp4
renders), builds the site and deploys it. `.gitignore` keeps `node_modules`,
`out` and `dist` out of the repository; `docs/DEPLOY.md` has the one-time
setup and the release steps. Nothing was created on GitHub: the repository,
the Pages setting and the first release are the owner's - the project goes
under git at the v0.2 release, as decided.

| Check | Result |
|---|---|
| The workflow's steps, run in a clean copy of the project | the tag check, `npm ci --ignore-scripts`, the quick tests (all pass) and the build (19 files, 500 KB, with `.nojekyll`) |
| A tag that does not match | caught (`v0.2.1` against `v0.2.0`) |
| The workflow parsed as YAML | triggers on a release and by hand; build, then deploy; permissions limited to reading the code, writing Pages and its token |

**What gets versioned.** The owner asked to be sure nothing is versioned or
deployed that should not be. Every file in the folder was listed and the
versioned ones scanned for personal data, local paths and secrets - none
(the "token" hits are the build reports' token counts). `.gitignore` now
keeps out the dependencies, the renders and the site (584 MB in `out/`,
including a personal mp4), any render or sound file written elsewhere,
logs, caches, `.env` files and keys, one person's editor and agent settings
(`.claude/settings.local.json`) and the operating system's leftovers. A dry
run of `git add` against a scratch repository, which wrote nothing into the
project, showed what would go in: 87 files, about 25 MB, the largest the
gallery's 3.7 MB GIF. The same run showed this machine's git turning line
endings to CRLF, so `.gitattributes` now stores text as LF everywhere and
the images as binary. The deploy takes only `dist/`, which the build fills
from a fixed list - the live page and `src/` - never the agent's notes, the
docs or the renders.

| Check | Result |
|---|---|
| Versioned files scanned for personal data, local paths, secrets | none |
| `git add` dry run | 87 files, about 25 MB; `dist/`, `node_modules/`, `out/` ignored |
| Paths that must stay out | an mp4 in `out/`, the site, a package, `.claude/settings.local.json`, a stray `x.mp4`: all ignored |
| Line endings | text stored as LF, images binary; one file (`requeriments.txt`) has CRLF and will be stored as LF |

**Online.** The owner created the repository (3dgiordano/seedscene), pushed
the 0.2.0 work in progress and turned GitHub Pages on. The first run of the
workflow, by hand, built the site and passed the quick tests but stopped at
`configure-pages`: Pages was not on yet (the API answered 404); once the
owner set the source to GitHub Actions the same run deployed. The demo is at
https://3dgiordano.github.io/seedscene/ - checked there: it opens in AUTOPLAY
with the seed `seedscene`, draws on the GPU, no console errors.

### The card cascade

The owner asked to go on with round 12, and the card cascade was the next
piece (`cascade`, Y2K): the win animation of the desktop card game. The
references were a still of the original's end screen and two animated
captures of it, frames taken from them and measured: a card 71 x 96 on a
table about 640 wide, the four foundations at the top right with the kings on
them, the spent stock with its green ring at the top left; a card leaves a
pile left or right, falls, and bounces off the bottom, each bounce reaching
about two thirds of the last; the game draws it at every step and never
clears the screen, so fast cards leave fans of white edges with the red and
black indices down them, and slow ones - a pixel or so a step - pile their
borders into solid black arches; a card that stops bouncing slides along the
bottom. The cards are drawn in the game's own pixels (`src/styles/index.js`):
the indices in a 5x7 font, the pips laid out as on the cards, the court cards
a picture of our own (a figure in red, yellow and blue, turned round through
the middle), never the original's art. The throws are planned a phrase at a
time (`src/core/sims.js`), and the shader works out every copy from a few
numbers per card: within a bounce the height is a parabola, so the newest
copy over a point is solved, not searched.

The musical direction: a card leaves the piles on every bar, round the four
piles from the kings down, and another halfway through the bar when the
music is busy; each is thrown so that it first lands on the beat, on the
"and" or on the sixteenth between; the busier the music, the livelier the
bounce; every phrase (32 beats) deals a new game - the table cleared, the
piles full - so a cut of AUTOPLAY, which falls where a phrase opens, finds a
clean table.

Three things changed after the first frames. The plan says a card on each
beat: at 175 BPM that covered the table in seconds and the arcs, which are
the effect, were lost - the original throws one card at a time - so it is a
card a bar, two when the music is busy; the owner chose that over a card
a beat on 2026-10-30. The cards crossed too fast for the
black arches: a third of them now crawl a pixel or so a step, as the
original's slow cards did. And the Y2K era's glow filled in the one-pixel
edges and fringed them with colour, so the trails read as a white wash: a
scene can now ask for less of its era's glow and fringes (`STYLE_FX`, read
in `src/core/visual.js`), and the cascade takes a quarter; every other scene
is drawn as before - a full gallery run gave byte-identical stills.

The plan puts the cascade in the media-player years, a period not yet built;
it plays in the Y2K era, the nearest, until then.

| Check | Result |
|---|---|
| Frames at the start, mid-phrase and with the table full, against the references | the cards falling off the piles, the fans of edges with their indices, the black arches of the slow cards, the decaying bounces, the green table and the stock's ring |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 39 pass |
| Cost with the table full, software renderer, 854×480, a harness that times the whole frame (post pass included, so not comparable with the figures above) | cascade 246 ms a frame; starfighter 477, rocks 269, morph 154 in the same run |
| Cost on the real GPU, whole frame, table full | 21.6 ms at 1280×720 and 29.9 at 1920×1080; morph 19.8 and 33.5, starfighter 52.4 and 85.0 |
| The copy search solved instead of walked, and the visible card's face drawn once instead of once for each pile | frames the same as the stepwise version (PSNR 98 dB); the cost from 664 to 489 ms, then to 246 |
| `npm test` | 16 checks pass |

**The owner's look.** The table looked static: it needed the punch the other
scenes have, more movement with the music, and effects that look worked on.
Now the table floats on the stage as the game scenes do - the camera riding
the music, a new angle every eight bars, punching in on the kick, leaning on
the snare - with the zoom blur on each kick. The trails keep the music: the
sim hands the shader each beat's kick and snare for the phrase, and the
copies drawn just after a hit are tinted, warm for a kick, cool for a snare,
fading through the beat, so each hit is a band of colour down the trail
(the first frames tinted one copy a beat, too thin to see). Older copies sink
into the table, so the newest arcs stand out; the card in flight casts a
shadow; its first landing, which falls on the beat, throws up sparks and a
flash along the floor; the felt is woven cloth with a pool of light,
breathing with the bass; and in the last bar of each phrase colour runs
through every trail before the new deal.

| Check | Result |
|---|---|
| Frames through two phrases: the first landing, the kick bands, a kick, the last bar | the sparks and floor flash on landing; orange bands down the trails once the kick comes in; the zoom blur on the kick; the colour running through the trails; the stage's angles |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 39 pass |
| Cost with the table full, software renderer, 854×480, whole frame | cascade 329 ms a frame; starfighter 454, rocks 265, morph 151 in the same run |
| Cost on the real GPU, whole frame, table full | 17.3 ms at 1280×720 and 31.0 at 1920×1080; morph 11.9 and 24.6, starfighter 32.3 and 69.5 |
| `npm test` | 16 checks pass |

The owner approved the card cascade on 2026-10-30.

### The ANSI board

The owner said go on, and the next piece was the ANSI board (`ansi`, DOS):
the art the bulletin boards showed their callers. The references were works
from an ANSI art pack of June 1995 in the 16colo.rs archive, the first
screen of each: VGA text mode, 80 x 25 cells of 9 x 16 pixels in the sixteen
colours; pictures and logos built of full and half blocks and the light,
medium and dark shades; gradients drawn down a ramp of colours - white,
yellow, brown; white, light cyan, cyan, blue - with the shades between the
stops; grey outlines round the letters; sparkles in the sky; small text with
its letters spaced out; long files that scroll up the screen as they arrive.
None of their art is copied: the scene draws its own from the seed
(`src/styles/index.js`), and its words - in the 5x7 font the cracktro uses -
are about the project only (`src/core/sims.js`).

The musical direction: a line of the file arrives each beat, the cursor
sweeping it - at 130 to 180 BPM, about the 2400 baud of the modems of the
time - and the screen scrolls up as it fills. Each phrase brings a part of
the file: a spaced-out header (SEEDSCENE PRESENTS, CONNECT 2400, NOW
PLAYING), a rule, a picture - a sunset over a black land, or a night sky with
its moon over a land shaded in the part's colours - a line about the music,
and a block-letter logo of thirteen lines (SEEDSCENE, the seed, the music's
name) whose last line lands as the next phrase opens: the logo complete on
the drop, as the plan asks. The camera rides in close on the cursor, swinging
back with each line like a carriage return, and pulls out over the logo so
the drop shows the whole screen, coming back in a bar later; the kick lights
the letters as they arrive and punches the screen (the zoom blur of the game
scenes); the snare sets the stars twinkling; on the drop the finished logo
cycles its colours for a bar.

The first frames were mostly grey (the ramp was chosen at random and the grey
one came up twice), with a flat white sky and a notched rule: the parts now
take the coloured ramps only, the bright sky became a sunset, and the rule a
bar of half blocks. A night sky seen close up was nearly black: it has a moon
now, shaded down the ramp, and more stars.

| Check | Result |
|---|---|
| Frames through two phrases: a part arriving, the logo arriving, the drop, the next part, a night sky close up | the header, the rule, the pictures, the info line, the logo with its ramp, outline and shadow; the camera close on the cursor and out for the drop; the logo cycling its colours under the punch; the moon and the stars |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 40 pass |
| Cost, software renderer, 854×480, whole frame | ansi 134 ms a frame; fire 90, bumplogo 115, fireworks 117, pipes 217 in the same run |
| Cost on the real GPU, whole frame, 1920×1080 | ansi 20.4 ms; fire 21.6, bumplogo 79.7 |
| `npm test` | 16 checks pass |

**The owner's look.** The writing seen in close-up was odd: everything shook
and was so near that what was being drawn could not be seen until it was
finished; the zoom should come in and go out instead. Three things shook it:
the camera swinging with each line, the full punch on every kick (at 173 BPM,
every beat), and the whole screen jumping a line each beat once it was full.
Now the camera shows the whole screen on the drop, draws slowly nearer as
the picture arrives - to a fifth closer at most, centred, drifting gently
over the phrase, the lines already drawn kept in view above the cursor - and
eases back out over the logo; the screen scrolls smoothly, the line being
written rising as it fills; and the scene takes half the punch, so the text
can be read as it arrives. The gallery's seed moved to one whose still falls
just after a drop, the logo whole.

The owner then missed the punch with the rhythm, and saw the seed's last
letter missing from the logo (`3dgiordano` came out as 3DGIORDAN): the seed
word was cut at nine letters, and the logo has room for twelve, so it now
takes twelve, in the logo and the info line. The full punch is back, and the
camera pushes in on each kick as the stage does for the game scenes - a
punch, not a swing.

| Check | Result |
|---|---|
| Frames with the seed `3dgiordano`: after the drop, on a kick and off it | the logo and the info line with all ten letters; the push-in and the zoom blur on the kick (on the off-beat, where this jungle puts it) |
| On the real GPU, every scene compiled and drawn | all 40 pass |
| `npm test` | 16 checks pass |

The owner approved the ANSI board on 2026-10-30.

### The bouncing lines

The owner said go on; the next piece was the second of the plan's
screensavers, the bouncing lines (`echolines`, DOS). The references were
captures of the screensaver as Windows 3.1 and 95 showed it, still and
animated: a black screen; two closed figures of four corners, each in one
solid colour that changes over time; each drawn again at moments just
behind, a fan of thin parallel lines evenly apart; the corners flying in
straight lines and bouncing off the edges. A corner bouncing in a straight
line is a triangle wave along each axis, so the shader works out every echo
from how far along its path the figure is (`src/styles/index.js`); the music
sets that distance (`src/core/sims.js`).

The musical direction: the figures fly faster as the music builds, with a
shove on each kick and a burst as each phrase opens; the kick stretches the
echoes apart like a spring and punches the screen (the zoom blur of the game
scenes); each snare hit moves both figures' colours on; the busier the music,
the more echoes, from six when it is quiet to fourteen. In the first frames
the quiet intro drew the echoes on top of one another, a thick band: the
screensaver always drew them apart, so the echoes now keep a least distance
along the path, about the gap the captures show.

| Check | Result |
|---|---|
| Frames through the intro and a busy part, against the captures | two figures in fans of thin lines, one colour each, bouncing off the edges; the fan open in the intro too; the echoes stretched and the punch on a kick |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 41 pass |
| Cost, software renderer, 854×480, whole frame | echolines 88 ms a frame; fire 59, ansi 89, pipes 214 in the same run |
| Cost on the real GPU, whole frame, 1920×1080 | echolines 17.6 ms; fire 13.8 |
| `npm test` | 16 checks pass |

The owner approved the bouncing lines on 2026-10-30.

### The 3D maze

The owner said go on; the next piece was the last of the plan's
screensavers, the maze walked on the bar (`maze3d`, DOS - `maze` was taken
by the chomper). The references were captures of the maze screensaver of
Windows 95, still and animated: corridors seen in first person, the eye
halfway up walls as tall as the corridor is wide; dark red bricks, mottled,
with pale grey mortar, a third of a block long and six courses high; a tan
floor; a ceiling of white speckled tiles in a grid; corners taken while
walking; grey stones spinning in the corridors that turn the world upside
down when they are passed. Its sign with the system's logo, and its other
characters, are left out. The seed cuts a maze of 11 x 11 cells and the walk
keeps a hand on the wall (`src/core/sims.js`); the shader steps through the
grid a block at a time to find the wall each ray meets, and draws the bricks,
the floor, the tiles and the stone (`src/styles/index.js`).

The musical direction: a move every two beats - a step down the corridor, or
a corner taken walking - so the steps land on the first and third beats of
the bar; each kick is a footfall that dips the view, with the punch of the
game scenes; the snare brightens the ceiling; as each phrase ends a stone
spins on the path four bars ahead, the walk reaches it on the drop and the
world turns over in a beat, staying upside down until the next drop turns it
back. The first frames had bricks too bright and tiles too large against the
captures; the bricks are darker and blotched now, the tiles smaller. And the
walk at first turned standing still in the middle of a cell, half a block
from a wall, so for a whole move the screen was bricks: corners are now taken
walking, as the screensaver did, and only a dead end is turned in place.

| Check | Result |
|---|---|
| Frames of a walk, the stone before the drop, the drop, against the captures | brick corridors, the floor and the tiled ceiling; corners taken walking; the stone growing ahead; the world turning over on the drop |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 42 pass |
| Cost, software renderer, 854×480, whole frame | maze3d 78 ms a frame; fire 67, echolines 93, pipes 186 in the same run |
| Cost on the real GPU, whole frame, 1920×1080 | maze3d 19.6 ms; fire 15.6 |
| `npm test` | 16 checks pass |

The owner approved the 3D maze on 2026-10-30.

### The moon bike

The owner said go on; the next piece was the moon bike (`moonbike`,
modern), the boy and his friend from the stars. The references were stills
of the film's moon shot: a deep blue sky going violet at the edges; a moon so
large it fills most of the height, pale blue with darker seas and wisps of
cloud, a halo round it; pines black in the lower corners; and the bicycle in
silhouette against the moon - a BMX with spoked wheels, the rider hunched
over the bars with his hood up and a cape streaming behind, a bundle in a
blanket sitting up in the basket on the bars. The friend's face is left out:
the bundle stays a blanket. All of it is drawn in the shader
(`src/styles/index.js`), the bicycle and its riders as shapes.

The musical direction: the bicycle comes in low from the left over the last
two bars of each phrase, rising, and is right in front of the moon on the
drop, slowing to all but still as the halo opens, then away over the next
bar; the wheels turn a turn a beat and the pedals with them, the cape flaps
on the eighths; the kick lights the moon and punches the screen; the hats
set the stars twinkling; the snare sends a shooting star every other bar.
The first frames had the moon nearly white - the era's glow washing out its
seas - and the bicycle crossing low; the moon is darker now, so the glow
brightens it without hiding its face, and the bicycle crosses its upper
half, as in the shot. The moon, the pines and the bicycle are worked out only
where they can be seen, which brought the cost down by a quarter with the
frames unchanged. And since the gallery takes every still at the same second,
when the bicycle is not crossing, a gallery entry can now name its own moment
(`tools/gallery.js`); this one is taken on a drop.

| Check | Result |
|---|---|
| Frames through a crossing, against the stills | the moon with its seas and clouds, the pines, the bicycle in silhouette with its spokes, the cape and the bundle, crossing the moon's upper half; the halo opening on the drop |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 43 pass |
| Cost, software renderer, 854×480, whole frame | moonbike 141 ms a frame; outrun 99, starfighter 578, boxer 601 in the same run |
| Cost on the real GPU, whole frame, 1920×1080 | moonbike 24.3 ms; outrun 16.1, starfighter 68.8 |
| Bounded to where they can be seen | the gallery still the same, byte for byte; 31.6 ms down to 24.3 |
| `npm test` | 16 checks pass |

**The owner's look.** Three things. The cape did not look right: close up it
was two stiff triangles standing off the back; it is cloth now, streaming
back from the shoulders and widening, a wave running down it on the eighths
and its hem rippling. The scene felt static even with the punch: it wanted
zooming in and out, a moving camera, parallax. Now the camera pans after the
bicycle and draws in as it crosses the moon, back out as it leaves, and the
picture is in layers that move less the farther they are - the stars, the
moon, a forest far off along the foot of the frame (a treeline of tips of
their own heights; the first was a regular saw), and clumps of pines in the
corners. And the scene should always open with the boy riding in, not in the
middle of the screen: AUTOPLAY cuts to a scene on any bar where a drop or a
crash falls, so the scene now knows when it came on - the renderer hands the
scene's start, on the score's clock, to its simulation: the cut's time in a
programme, the moment of the switch in the live page, the top otherwise
(`src/core/visual.js`, `src/app.js`, `web/live.js`); every other scene ignores
it. From there a crossing comes every four bars: near, left to right through
the moon, then far and high on the way back, behind the pines. The gallery
still moved to the first crossing's moment.

| Check | Result |
|---|---|
| Frames from the scene's start through two crossings | the bicycle riding in from the left; the camera following, drawing in over the moon; the far crossing small and high; the cape as cloth; the pines and the far forest shifting against the moon |
| A cut of AUTOPLAY to the moon bike | 0.4 s after the cut the scene counts 0.6 beats since it came on: it opens with the entrance |
| On the real GPU, every scene compiled and drawn | all 43 pass |
| Cost on the real GPU, whole frame, 1920×1080 | moonbike 27.5 ms; outrun 14.8 |
| `npm test` | 16 checks pass |

The owner liked it, and asked for time out of the frame: the bicycle left and
came straight back, so the boy was always going out or coming in. Now a
crossing takes four bars and is followed by two with the bicycle gone -
turning round somewhere past the edge of the frame - while the camera
settles toward the middle; it comes back from the side it left by, as if it
had turned. The scene still opens with it riding in.

| Check | Result |
|---|---|
| Frames through the exit, the two bars out and the return | the bicycle out on the right; the moon, the pines and the stars alone as the camera settles; the bicycle back from the right, far and high |
| On the real GPU, every scene compiled and drawn | all 43 pass |
| `npm test` | 16 checks pass |

The owner approved the moon bike on 2026-10-30.

### The time car

The owner said go on; the next piece was the time car (`timecar`, arcade).
The plan has it as a car down a night road, a speedometer climbing through
the build, a burst of light and two trails of fire on the drop. The first
version was that, seen from behind on a road, from stills of the film's
posters; the owner asked, before seeing it finished, for another
perspective for the car and for references to recreate the best-known
scene. So the references became stills of the first run in the film: a
parking lot at night, wet and lit orange by its lamps, a long low building
with lit windows beyond; the two onlookers standing in the lot; two
straight trails of fire running on the asphalt and between their legs as
the car vanishes; the car itself a long low wedge of brushed steel with a
black band across its nose and its lamps set in it. The onlookers stay
silhouettes, with no faces; the car is a shape of our own, a wedge with a
raked windscreen and a fastback, with no maker's marks or plate text.

The car is now in 3D (`src/styles/index.js`): a wedge raymarched in the
scene, lit by the lot's lamps, the night mirrored in its steel, on a ground
that mirrors the lamps and the fire. Two shots, cut on the music: over the
onlookers' shoulders as it comes at them three-quarters on; and on the jump
the reverse, low between the trails, the onlookers standing over them. The
simulation (`src/core/sims.js`) takes the music's big moments from the score
- the bars where a crash or the drop falls, where AUTOPLAY cuts too - and
sets the readout and the car's place on its run by them.

The musical direction: the readout climbs from 30 toward 88 as the next big
moment nears, faster at the end; past 70 the light gathers blue at the
car's nose and lightning crawls round it, jumping on every sixteenth; on the
moment it reads 88, the light bursts and the car is gone, the cut to the
reverse with it; the trails burn down over the next bars, tongues leaping;
six beats on the car comes back out of a flash; the kick shakes the camera
and punches the screen.

The first frames of the 3D version had the onlookers so near that they
filled the frame, the car lit flat and pale, lamp poles crossing the frame
as dark bars, and the light at its nose a glare over the whole car; the
camera was moved back and onto the car's line so it comes between them, the
steel darkened and lit from above, the poles taken out and the glow
tightened.

| Check | Result |
|---|---|
| Frames through a run and a jump, against the stills | the lot, the building and the lamps; the onlookers from behind with the car coming between them; the lightning; the burst; the reverse with the trails between their legs; the trails burning out |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 44 pass |
| Cost, software renderer, 854×480, whole frame | timecar 147 ms a frame; scanner 81, pyramid 175, boxer 267 in the same run |
| Cost on the real GPU, whole frame, 1920×1080 | timecar 21.4 ms; scanner 15.6 |
| `npm test` | 16 checks pass |

**The owner's look.** It was not right. The scene opened with fire on the
ground and the plate already spinning, when both belong after the jump: the
simulation treated the time before the first big moment as if the car had
just jumped; now nothing burns and no plate falls unless a jump has happened
since the scene came on. The plate did not look like a plate, and the change
of shot was odd - the "reverse" looked the same way as the first shot. The
car crept toward the camera and one of the onlookers hid most of it; the
scene took too long; the onlookers stood like statues; and the plate only
turned on the ground instead of spinning like a coin.

Now: between moments the car laps the lot - in from the far right, across in
front of the onlookers, round the far left - and charges in six beats from
the far end, the readout from 30 to 88, the camera centred behind the two of
them so it comes between them. On the jump the cut goes to a true reverse -
low on the car's side, looking back at them over the fire - and then to an
insert of the plate on the ground. The plate is a plate - cream, a coloured
band, a row of characters of no real text, a dark rim - and it tumbles down,
lands on its edge, and spins like a coin, tilting further and wobbling faster
as it slows, until it falls flat with a rattle. The onlookers move: one holds
the remote with its aerial up, the other films with the camera at the eye;
they sway on the beat, lean back and brace as the car charges, shield their
faces from the burst, and hop from foot to foot on the beat over the fire.

| Check | Result |
|---|---|
| Frames from the start through a lap, a charge, the jump, the reverse and the insert | no fire or plate before the jump; the car passing in front of them and charging between them; the burst with the two shielding; the reverse with them hopping over the trails; the plate on its edge, wobbling, falling flat face up |
| On the real GPU, every scene compiled and drawn | all 44 pass |
| Cost on the real GPU, whole frame, 1920×1080 | timecar 22.0 ms; scanner 19.6 |
| `npm test` | 16 checks pass |

Then, at the owner's word: the plate reads SEEDSCENE, in a 5x7 font of the
shader's own, the right way up on its face. The car looked like a limousine -
a long box with another on top: it is now drawn from its side profile, the
wedge of the stainless coupe of the early 80s - a low sharp nose, a long flat
bonnet, a steep windscreen, a short roof, a long louvred fastback, a cut-off
tail - with the glasshouse narrower than the flanks, the black band round its
foot, four lamps in the black nose panel, red bands at the tail and two vent
boxes on the deck; checked from six angles in a view made for the purpose.
It goes faster: nine metres a beat round a longer lap, with a second
crossing, and a five-beat charge from 44 to 88. The fire is a volume over
each track now, marched front to back - turbulence rising, coloured by its
heat from deep red to a white core - with a glow round it and its light on
the wet ground; in the arcade era its four levels a channel still draw it in
flat bands, as they draw everything there.

**Why the scene is slow to load.** Measured on the real GPU: the time car's
shader takes 4.6 to 5.6 s to compile and draw its first frame the first time
(the browser keeps it, so the next time is 0.4 s); the other scenes take
under 0.8 s, most a few tenths. The renderer compiles a scene when it is
first shown, on the page's own thread, so the picture stops until it is
done. Taking the shader apart showed no single culprit: without the car it
takes 2.1 s, without the onlookers 2.9, the fire 3.2, the ground 3.6, the
plate 3.8 - the Direct3D compiler's time is spread across the whole of it;
keeping its loops rolled and the car's normal to one copy changed nothing.
The browser here can compile in the background (`KHR_parallel_shader_compile`
is available), which would take the wait off the picture; that is a change to
how every scene loads, and the owner's to decide.

**Compiled in the background.** The owner chose it. A program is now handed
to the driver to compile and link without asking how it went - asking is what
makes the page wait - and finished only when it is done or needed
(`src/core/gl.js`). The live page queues every scene while its boot screen
plays, this era's first, two at a time, collecting each as the driver reports
it done (`src/core/visual.js`, `web/live.js`); the first scene is started the
same way and finished on its first frame. A scene asked for before it is ready
waits only for the rest of its compile. Where the driver cannot say when a
compile is done, scenes compile when first shown, as before. The offline
render and the tests are unchanged: the same render hash, the gallery still
the same byte for byte.

| Check | Result |
|---|---|
| The time car compiled from scratch, waiting as before | the page stopped for 4.76 s |
| The same, in the background | the page never busy more than 0.13 s at a time; finishing it took 0 ms |
| The twelve heaviest scenes from scratch, two at a time | the page busy at most 14 ms at a time, 55 ms in all, over 26 s of compiling |
| Every scene warmed in the live renderer | 44 of 44 ready, no errors; switching to the time car then took 3 ms |
| The live page, opened at the time car | loads clean, the boot screen plays to READY |
| `npm test` | 16 checks pass, the render hash unchanged |

**Still about 14 seconds.** The owner still waited about 14 s for the scene.
Measured as a first visit - a browser on the real GPU with an empty profile,
so nothing cached - a click on the boot screen took 10 s to show the time car,
and a CPU profile put 5.35 s of it in waiting for the driver to finish the
scene's program on the first frame; the warm-up's own compiles, started at
the same time, slowed it further. Three changes to how the first scene loads:
without the intro, the loading starts as soon as the boot screen says READY,
not at the click (`web/boot.js`); nothing else is compiled while the scene on
screen still is (`src/core/visual.js`); and the boot screen's tape stripes
run on until the scene is ready, with the music starting together with the
picture (`web/boot.js`, `web/live.js`). The page no longer freezes, but the
compile still had to finish: so the time car's shader was made lighter to
compile with the same picture - the car's side drawn from the lines of two
convex pieces instead of a loop over its corners, one copy of the car in the
march (its normal sampled in the same loop instead of six more copies), and
one march of fire folded across the car's line for both trails. Its first
compile on an empty profile went from 4.9 s to 2.6 s.

| Check | Result |
|---|---|
| First visit, click to scene, before | 10 s, the page frozen for 4.4 and 8.5 s |
| After the loading changes alone | 6.4 to 6.6 s, no freeze |
| After the lighter shader too, with the intro, three runs | 3.4 to 4.6 s, no freeze; with the browser's cache, a later visit is near instant |
| The frames before and after the lighter shader | the same picture; the fire's turbulence drawn a little differently |
| On the real GPU, every scene compiled and drawn | all 44 pass |
| `npm test` | 16 checks pass, the render hash unchanged |

Measured the same way, two other scenes take as long to compile on a first
visit: the card cascade 4.4 s and the starfighter 4.2 s; the warm-up covers
them once the page has been open a while.

**Lighter to compile.** The owner asked for the card cascade and the
starfighter too, then said the time car still took a while and the boxing
match was slow to load. Measured in a fresh browser each time (the machine
was busy with another program's build for part of the session, and those
runs were thrown away): the boxer took 12.8 to 18.4 s to compile, its robot's
shape twelve copies in the shader - his march, his normal's four samples, his
shade, yours, its four, its part; it is now one loop that takes them all in
turn, one copy, and compiles in 3.8 to 4.1 s. The card cascade drew a suit's
shape for every pip a card could have: it now finds the nearest pip from the
layout and draws one shape a card face (3.9 s to about 1.5). The time car
looks up the lot's lamps once a pixel instead of three times and draws only
the onlooker nearer the pixel (1.6 to 1.7 s, from 4.9 at first). The
starfighter's ship and drones were put in tables of corners and faces; its
picture is unchanged but its compile did not move (about 5 s), its weight
being elsewhere. And the live page now starts loading the first scene as soon
as the boot screen is up, so the intro's typing covers the compile.

| Check | Result |
|---|---|
| The frames of each changed scene, before and after | the same, byte for byte (time car, card cascade, boxer, starfighter) |
| First visit, empty cache, click to scene, with the intro | time car 1.1 s, boxer 1.1 s - the boot screen's own RUN stripes and switch-off; the compile is done while the intro types |
| The same without the intro | time car 2.1 s |
| On the real GPU, every scene compiled and drawn | all 44 pass |
| `npm test` | 16 checks pass, the render hash unchanged |

The owner approved the time car on 2026-10-31, every scene loading well.

### The anime opening

The owner approved the time car and said go on; the next piece was the anime
opening (`animeop`, 32-bit console). The references were frames of two
openings of the late 80s that Latin American television played through the
90s: a title card of thick letters with a black outline and a yellow-to-orange
or blue fill, over horizontal streaks rushing past; the team lined up against
a flat red; the hero in armour against ruins and the cosmos; figures flying
across a sky of clouds; close-ups; flat colours, black outlines. No character,
name or logo is copied: the figures are silhouettes of our own (three kinds -
spiky hair, long hair and a cape, short hair and broad - and four poses), and
the title is the seed in the project's 5x7 font, SEEDSCENE above it
(`src/core/sims.js` hands the letters over).

The musical direction: a cut on every bar, as those openings cut on the music
- the title for the drop's two bars, then the lineup against a red sunburst,
the hero in a flame aura against the cosmos, a flight in formation through
rushing clouds, three of them closer against a sunset, a charge out of black
speed lines growing through the bar; a new pose on every beat; the kick
punches the picture and bursts the lines; the last bar of each phrase cuts on
every beat and ends in a white flash; on the drop the title slams in with a
bounce, a star glinting at its corner. The first frames had the fliers
tumbling (the pointing arm hung down once they were laid flat) and the second
lineup a copy of the first: they fly fist first now, and the second lineup is
three of them, closer, against a sunset. Made with the loading lesson in mind:
each pixel draws only the figure nearest it, and the title's outline reads its
neighbours in one loop.

| Check | Result |
|---|---|
| Frames through a phrase, against the reference frames | the title card, the sunburst lineup, the aura, the flight, the sunset lineup, the speed lines, the white flash into the title |
| First compile on an empty profile, fresh browser | 1.2 s |
| First visit, click to scene, with the intro | 1.1 s |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 45 pass |
| Cost on the real GPU, whole frame, 1920×1080 | animeop 18.7 ms; footsteps 19.6 |
| `npm test` | 16 checks pass |

On the way, the local server's root address turned out not to work: it
served the live page there, where the page's relative path to its own script
pointed at a file that does not exist, so the page never started (the `live`
command opens `/web/index.html` and was never affected). At the owner's word
the root now redirects to `/web/index.html`, keeping the address's settings
(`tools/server.js`): opened at the root with a seed and a scene, the page
lands on the live page with them, loads its script and boots to READY; the
16 checks pass.

The owner's look found two things. The clouds of the flight ran the wrong way
- the figures fly to the right, so the sky has to rush past right to left;
the clouds and the streaks run that way now. And the power-up began well but
fell short where it matters: the moment they explode with all their energy
and stay energized. New references - animated frames of the transformations
in those series - showed it in three beats: the charge (crouched, arms
crossed before the face, the ground cracking, pebbles rising, a small aura
flickering close); the burst (a white flash, the arms thrown down and out, a
column of fire shooting up out of the body and the ground, a ring of dust
racing out across the plain); and the state that stays (a tall pale-yellow
aura, its tongues rising and serrated, sharper at the tips above the head,
drawn a frame at a time as cel animation is, the hair standing up spiked and
gold with a dark outline, lightning crackling round the body). The power-up
is a shot of two bars now: the charge through the first, the burst on the
next bar's downbeat, the energized aura for the rest; the kick swells the
aura, the snare throws the lightning; a moment of it comes back in the last
bar's cuts.

| Check | Result |
|---|---|
| Frames through the power-up, against the reference frames | the charge with the cracks and pebbles, the white flash, the column of fire and the ring of dust, the serrated aura and the gold spiked hair after |
| Frames of the flight | the clouds and the streaks rushing right to left, the figures flying right |
| First compile on an empty profile, fresh browser | 1.7 s |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 45 pass |
| Cost on the real GPU, whole frame, 1920×1080, through the energized aura | 17.5 ms |
| `npm test` | 16 checks pass |

The owner's second look: the transformation lacked lightning, and the figure
was tubes and spheres - it should gain muscle as it transforms. New
references: stills of the transformed state with its lightning (long jagged
arcs, white at the core and blue at the rim, crawling up beside the body and
round the aura's edge, always some of them), and full-body drawings of
muscular fighters, measured for the figure's proportions (shoulders about
3.5 heads wide with the deltoids, the waist half that, the lats flaring under
the arms, thighs and calves swelling and tapering). The figure is drawn the
way those are now: a torso whose width follows the body from the narrow
waist up through the lats and the chest to the traps sloping into a thick
neck, deltoids capping the shoulders, every limb tapering with its muscle
swelling along it - the quads, the calves, the biceps, the forearms - all
joined smoothly. Every shot uses it. In the power-up the muscles swell a
little through the charge and burst out on the downbeat, pumping on the
kick, and the chest's edge, the line down the middle and the stomach's rows
are drawn in light on him once he is lit. The lightning: eight arcs, each
living two frames - a few through the charge, more on the snare; always some
once he is lit; and on the charge's last beat and the burst, bolts down out
of the sky onto him, the sky flickering with them. They cross in front of
him as they do in the references.

The new figure, drawn in each of the four shots, took the first compile from
1.7 s to 3.7 s: the compiler copies a function at every place it is called.
Each shot now only says where the figure stands, its pose, its kind and its
size, and it is drawn once - 1.9 s, the same pictures.

| Check | Result |
|---|---|
| Frames through the phrase, against the references | the lineup, the flight and the speed lines with the new figure; the charge with bolts from the sky; the energized aura with arcs round it and the muscles drawn in light |
| First compile on an empty profile, fresh browser | 1.9 s |
| On the real GPU (Intel UHD 630, Direct3D 11), every scene compiled and drawn | all 45 pass |
| Cost on the real GPU, whole frame, 1920×1080 | charge 18.3 ms, energized 16.8, lineup 13.0 |
| `npm test` | 16 checks pass |

The owner approved the anime opening on 2026-10-31.

| Check | Result |
|---|---|
| Frames of a lap, the charge, the burst, the reverse, the plate | the car passing close in front of them, charging between them; the fire at their feet; the plate spinning, reading SEEDSCENE |
| On the real GPU, every scene compiled and drawn | all 44 pass |
| Cost on the real GPU, whole frame, 1920×1080 | timecar 17.2 to 19.9 ms through a run and the fire; scanner 14.5 to 15.0 |
| `npm test` | 16 checks pass |

| Check | Result |
|---|---|
| Frames through a phrase, every four beats | the whole screen at the drop, the slow approach with the earlier lines in view, the pull-out over the logo, the text readable under the punch |
| On the real GPU, every scene compiled and drawn | all 40 pass |
| `npm test` | 16 checks pass |

### Keygen

The owner approved the anime opening and chose the next piece: `keygen`, the
first of round 12's two music styles - the chiptunes of the crack intros:
tracker music with fast arpeggios, a squelchy lead and a bouncing bass (the
plan's words), for the media-player years (the Y2K PC stands in for them)
and the DOS party.

**The references.** Not descriptions: the music itself. An online library
of keygen music plays the modules in the browser, so their files could be
read there, in memory, without playing a note: forty FastTracker 2 modules
spread across its archive, their headers and every pattern parsed. What they
share:

| Measured in 40 keygen modules | Result |
|---|---|
| Tempo | 125 bpm (the tracker's default) in 16; 128 in 4; 140 in 3; almost all 118 to 143 |
| Rows | speed 6 (four rows a beat) in 16, speed 3 in 10 |
| Channels | 4 in 13, 8 to 14 in most of the rest |
| The arpeggio effect | in 22: most often 47 (a major chord), 37 (minor), 49, 38, 7c (the fifth and the octave), 0c |
| Vibrato, slides to the note | in 25 and 22 |
| An echo channel - a second channel playing another's notes a few rows later | in 19: 4 rows behind most often, then 1, 2, 3, 6; quieter in most |

From the format's description: the arpeggio effect plays the note, then +x,
then +y, a tick each, and the tick is the tempo times two-fifths a second -
50 at 125 bpm.

**What was built** (`src/core/music.js`). The tempo is picked from the ones
the modules used, 125 most often. The chord is one channel stepping through
it on the tick - the triad's numbers, or the fifth and the octave - held for
half a bar, struck on the eighths or on the off-beats. The lead is a saw and
a pulse through a resonant filter that snaps open and closes on every note
(the squelch), sliding into a note close after the last (the 3xx slide), its
vibrato waiting a moment (4xy); it plays the style's call and answer. In
about half the seeds an echo channel plays it again 1 to 6 rows later - 4
most often - quieter and duller, on the other side. The bass bounces a row
on, a row off, up to the octave and back; the drums are samples of a kick and
a snare, the hat on the eighths. Its instruments are its own, so on DOS it
plays from samples, as a module player mixed them, whatever card the seed
chose; the crash and the riser still sound on the card. Its material comes
from a stream of its own, so the other styles keep every note.

**What went wrong.** The first renders were almost all invalid samples: the
hat's filter, set at 8.5 kHz, ran away and filled the echo and the reverb
with infinities. It sits at 7 kHz now, where the engine's own hat sits.

**One consequence.** A seed left to choose its music picks from its era's
list, and the DOS and Y2K lists are longer by one: some seeds of those eras
now land on another style, as happened when the earlier styles were added.
Two gallery stills changed this way (`julia` now plays eurodance, `emboss`
MIDI quest), and THE JOURNEY's animation.

| Check | Result |
|---|---|
| The arpeggio alone, at 50 ticks a second | three notes in turn, a tick each |
| Six seeds | 120 to 140 bpm; the echo 3 or 4 rows behind in five, none in one; 14 to 32 slides in 40 s |
| Every earlier style on every chip of its eras, three seeds, before and after | 138 takes, all byte-identical |
| Keygen on the synthesizer's own voices, OPL3 and AWE32, three seeds | peaks -2.0 to -2.5 dBFS, no invalid samples, 7 to 17 times real time |
| Live, DOS, seed `razor` (muted) | Keygen, 140 bpm, C dorian; no console errors |
| `npm test` | 16 checks pass, 25 styles compose; the render hash unchanged |
| A taste to listen to | `out/keygen-taste.mp3`: three seeds, 24 s each |

The owner listened and approved keygen on 2026-10-31.

### Trip-hop

The owner chose the next piece: `triphop`, round 12's last music style -
the 90s Bristol sound: a slow, heavy break, a deep bass, a dark string,
scratches (the plan's words), for DOS 1994 and the media-player years.

**The references.** The modules of the genre could not be read this time
(the archive that holds them does not let a page read its files), so the
style is built from two written sources: a trip-hop drum cheat sheet from a
music-software maker (the tempo, 60 to 90 bpm; the kick on one and three
with sixteenths leading into two, three and four; a big snare on two and a
crisp side-stick on four; the ride on the upbeats, a shaker; a heavy MPC
shuffle, about 65%, "what actually makes the beat sound like trip-hop"; the
drums pitched down into a big room, thinned like a vinyl sample, with
crackle) and the genre's encyclopedia entry (a bass-heavy beat of slowed
breaks, film-score samples, Rhodes, theremin, turntable scratching, minor
keys).

**What was built** (`src/core/music.js`). 68 to 90 bpm, minor modes, a
progression of its own that hardly moves (the i held, the VI, the iv, the
half-step of the spy films). The break, as the cheat sheet programs it, on
drums of its own pitched down - a dull deep kick, the big snare with most of
the room on it, a side-stick, a ride ringing on three metal partials, a
shaker - every off-sixteenth late by the MPC's 65%; the record's hiss and
pops under every bar; no snare rolls. The bass: a long deep note on the root
and a pickup sliding into the next. The strings held low through each bar,
a Rhodes on top with the seventh, a theremin singing the style's hook,
sparse, gliding between its notes. At the end of a phrase - every second or
fourth bar - a record scratched: a voice's "ah" on the chord's root, pushed
forward and pulled back once an eighth, the hand's speed as its pitch; a
chirp cuts the fader on the way back, a tear stutters the push. The strings
and the Rhodes sound on the card on DOS (the AWE32's section, or the OPL3's
FM); the drums, the scratch and the theremin are its own.

As with keygen, some DOS and Y2K seeds left to choose now land on another
style: two more gallery stills changed (`inferno` now plays FM metal,
`insertdisk2` keygen), and THE JOURNEY's animation.

| Check | Result |
|---|---|
| The shuffle, measured on the shaker | the off-sixteenths at 65.0% of the eighth |
| Three seeds | 76 to 82 bpm, D phrygian, D# dorian, F# harmonic minor; every part present |
| Every earlier style on every chip of its eras, three seeds, before and after | 147 takes (keygen among them), all byte-identical |
| Trip-hop on the synthesizer's own voices, OPL3 and AWE32, three seeds | peaks -2.2 to -2.9 dBFS, no invalid samples, 8.6 to 13 times real time |
| Live, Y2K, seed `bristol` (muted) | Trip-Hop, 76 bpm, D# dorian; the cards falling on the beat; no console errors |
| `npm test` | 16 checks pass, 26 styles compose; the render hash unchanged |
| A taste to listen to | `out/triphop-taste.mp3`: three seeds, 24 s each |

The owner listened and approved trip-hop on 2026-10-31. With it, round 12's two music styles are done.

### Born in

The owner chose the next piece: the first of round 12's three ways to watch.
The plan: "type the year you were born: AUTOPLAY starts in the era when you
were twelve, and stays near it".

**What was built.** The era is the one whose year is nearest the year the
viewer turned twelve (the earlier on a tie; before 1979 that is the arcade,
after 2002 the modern era). AUTOPLAY born in a year plays it every other
block, from the first, and between those an era drawn by how near its year
is: the weight falls by e for every five years away. Born in 1985: the
console, then Y2K, the console, DOS, the console, DOS, the console, the
handheld, the console, the Amiga. The era's card says so - `BORN 1985
TWELVE IN 1997` under the era's own line - and the programme is called
BORN IN 1985. Live, `B` opens a C64-style box that asks for the year and
shows, as it is typed, the year it was twelve and that era; RETURN starts it,
dropping in at the start of one of its own era's blocks (somewhere new each
time, as AUTOPLAY does); `B` again goes back to the demo. The year is kept
in the page's address (`born=1985`), so a reload returns to it. (The
address's query goes with the page's request when it is reloaded; the
greetings, built next, keep their names where a browser never sends them.) The audio thread builds the same programme from the same year.
On the command line: `seedscene autoplay --born 1985`.

| Check | Result |
|---|---|
| Eight years, 1950 to 2015 | arcade, arcade, C64, Amiga, console, Y2K, modern, modern - each first, every other block, its neighbours between |
| Live (muted): `B`, 1985, RETURN | the box shows TWELVE IN 1997 - 32-BIT CONSOLE; AUTOPLAY drops into a console block; the address keeps `autoplay=1&born=1985`; `B` goes back and the year leaves the address; no console errors |
| Live, reloaded with `born=1972` | born-in AUTOPLAY on a Commodore 64 block |
| `seedscene autoplay --born 1985`, 40 s | the plan opens on the 1997 console; the era card reads BORN 1985 TWELVE IN 1997 |
| `npm test` | 17 checks pass - a new one: born in 1985 opens on the console and comes back every other block, every track in its era, no pairing twice in a row, the same sound whatever the block size; plain AUTOPLAY's hash unchanged |

The owner approved born in on 2026-10-31.

### Greetings

The owner chose the next piece, the second way to watch. The plan: "type a
few names: they scroll in the greetings, as every demo greeted its friends.
The names stay on the screen; nothing is sent anywhere".

**What was built.** `G` opens a C64-style box with a field for names,
between commas; RETURN keeps them, ESC leaves. The names are cleaned once,
for every place that shows them (`src/brand.js`): up to eight, twenty
letters each, in capitals, accents dropped as the demo fonts had none (José
is JOSE, Ñoño NONO). They go first into the sine scroller of every scene -
`GREETINGS TO JOSE - ANA MARIA - LUCIA` right after the title, before the
key hints - and stay there through AUTOPLAY and THE JOURNEY; into the About
part's greetings, after its GREETINGS TO; and onto the cracktro's pages, three
names a page after its thanks, in the letters its font has. Without names
everything is as before, byte for byte.

**Nothing is sent anywhere.** The names are kept after the `#` of the page's
address (`#greets=JOSE,ANA+MARIA`). A browser never sends that part with a
request, so the server - the local one, or the published page's - never sees
them; a reload brings them back from the address itself. Checked in the
browser's own list of requests: the page's request carries the address up to
the `#` and stops there. A video takes them on the command line,
`--greets "Jose, Ana Maria"`, and the renderer only hands them to its own
page on this machine.

| Check | Result |
|---|---|
| Live (muted): `G`, four names with accents, RETURN | the toast GREETINGS TO JOSE, ANA MARIA, THE 3 A.M. CODER, LUCIA; the scroller GREETINGS TO JOSE - ANA MARIA - ...; the cracktro's page GREETINGS TO / LUCIA; no console errors |
| The page's request after a reload | the address up to `#` only; the names back in the box from the address |
| Names cleaned | José, Ana María, the 3 a.m. coders, Lucía, Ñoño & co -> JOSE, ANA MARIA, THE 3 A.M. CODERS, LUCIA, NONO & CO; eight at most |
| The cracktro's pages | two pages of greetings after the thanks; a character its font lacks dropped (NONO CO) |
| `seedscene render --style cracktro --greets ...`, 12 s | the cracktro's GREETINGS TO page typing in at 9 s |
| `npm test` | 17 checks pass; the render hash unchanged (no names, the same file) |

A first limit of sixteen letters cut THE 3 A.M. CODERS short; it is twenty
now, inside the cracktro's 24-letter line.

The owner approved greetings on 2026-10-31.

### Screensaver

The owner chose the last way to watch. The plan: "after a minute without
input, SEEDSCENE goes to AUTOPLAY full screen; any key brings you back".

**What was built** (`web/live.js`). The page notes the last key, click,
wheel, touch or mouse movement (a movement of more than a few pixels: a
hand on the mouse, not the desk shaking). A minute after it, with the demo
running and visible, AUTOPLAY comes on, dropping in somewhere new as it does,
with nothing on the screen but the picture: no info panel, no hint, no toast,
no pointer. Any key, a click, the wheel, a touch or the mouse moving brings
the demo back; the key that wakes it is caught before every other key
handler, so it does nothing else. It does not come on while the demo is
paused, while the menu, the keys screen or a box is open, or over a
programme or the About part. It changes nothing in the page's address.
`saver=<seconds>` there changes the wait; `saver=0` turns it off.

**Full screen, as far as a browser allows.** A page may ask for full screen
only right after a key or a click; after a minute of nothing the browser
refuses it (seen live: "API can only be initiated by a user gesture"). So the
screensaver does not ask: in full screen (`F`) it stays full screen, in a
window it fills the window, its chrome gone.

| Check | Result |
|---|---|
| Live (muted), `saver=5` | after five seconds untouched, AUTOPLAY on a handheld track, the panel and the hint gone; the address unchanged |
| A key (`E`) | the demo back - the Amiga plasma of the seed - and the era unchanged: the key did nothing else |
| The mouse moving | the demo back |
| A fresh tab | no console warnings (the first version asked for full screen and the browser logged its refusal) |
| `npm test` | 17 checks pass |

The owner approved the screensaver on 2026-10-31. With it, round 12's three ways to watch are done.

### A scene is called a scene

The owner found the README's gallery misleading: each still ended with its
seed (`--seed warez` under the cracktro) as if the seed chose the scene, and
asked whether the style should be called a scene, and where the word came
from. It came from the first brief (`requeriments.txt`, 2026-10-27): "given
a seed, a resolution and a style name"; v0.1's six visual styles took
`--style`. v0.2 brought styles of music, and the word came to mean two
things - `--music` takes one of twenty-six styles, `--style` one of
forty-five scenes - while the live page already said scene. At the owner's
word it is a scene wherever a person meets it: `--scene` and `seedscene
scenes` on the command line, `?scene=` in the page's address (an old
`?style=` is read and rewritten to `scene`), SCENE in the menu and in every
scroller, the commands the menu copies. `--style`, `seedscene styles` and
`?style=` still work. The code keeps its own names (`STYLE_NAMES`,
`src/styles/`): renaming them would change nothing for anyone using it.

The gallery's captions now give the command that makes each still,
`--scene cracktro --era amiga --seed hyperspace`. `warez` - the scene's
word for pirated software - gave way to `hyperspace` (not `starfield`,
first tried: that is also a scene's name, the very confusion being fixed).
Every still was rendered again, its scroller reading SCENE.

Two more of the owner's notes, the same day:

- **Watch it online.** The README now opens with links to the published
  page set up for each way to watch: AUTOPLAY, THE JOURNEY, born in 1985, the
  cracktro with greetings, each era, your own word, the screensaver. THE
  JOURNEY had no address of its own: `journey=1` now starts the live page in
  it, as `autoplay=1` does AUTOPLAY. Building the era links showed that
  with only the era given, a seed picked its scene from all forty-five - the
  scene chose its era, not the other way round - so `?seed=insertcoin&era=arcade`
  opened the tunnel. At the owner's word an era chosen alone now brings its
  own scenes (`src/core/choose.js`): the seed takes the scene it favours most
  among the era's. Each scene has a fixed score for each seed, so a seed whose
  favourite was already of the era keeps it. The era links use the words
  first meant for them: insertcoin, readyrun, disk2, soundblaster,
  pressstart, poweron, precalc, raymarch. The party mode the owner asked
  about is not built yet: it is round 7's.
- **The logo.** Its third and fourth lines were two characters shorter (the
  last letter's trailing spaces trimmed); centred on GitHub, each line on its
  own, they sat one character to the right. All six are 74 now.

| Check | Result |
|---|---|
| `seedscene scenes` and `styles`; `info --scene` and `--style`; a bad name | the same list; the same scene; "Unknown scene" |
| Live, an old link with `?style=cracktro` | the cracktro; the address rewritten to `?scene=cracktro`; the menu's SCENE row; no console errors |
| Live, `journey=1` | THE JOURNEY from the 1979 card; T goes back |
| Live, the greetings link through the root address | the names after the `#` survive the redirect and reach the box |
| The eight era links | each opens on a scene of its era: the time car, the copper bars, the rings, the 3D maze, the footsteps, the invaders, the fractal, the morph |
| An era given alone, 2,000 seeds in each of the eight | 16,000 of 16,000 on a scene of the era; 3,612 of 3,612 seeds whose scene was already there keep it; everything on `auto` unchanged; a check of it added to `npm test`'s choices |

### Between the tracks

The owner said go on with round 12's last piece. The plan: a modem's
handshake "as the riser of a transition in the media-player era, the drop
when the line connects"; a start-up chime "of its own, in the spirit of each
era's start-up sound, opening an era in THE JOURNEY"; "the click of a
cartridge going in, opening the woodgrain console's and the 16-bit consoles'
tracks".

**The reference.** For the modem, an annotated spectrogram of a real
handshake (Oona Raisanen, "The sound of the dialup, pictured", 2012), read
off over its nineteen seconds: the dial tone; the number in DTMF; the
answering modem and the V.8bis bursts of FSK around 1 and 2 kHz; the 2100 Hz
answer tone with its phase snaps, the calling modem's bursts over it; the
probing, a comb of tones 150 Hz apart; the scrambled data's hiss, the
loudest stretch; then silence.

**What was built.** Three instruments (`src/core/music.js`) and a layer of
their own in the programmes (`src/core/journey.js`): each part carries the
sounds between it and the part before, on a synth of its own that plays
over the mix - a modem placed in the incoming track would have come in at
nothing and thin, as the mix brings a track in, just where the dial tone
is. The modem is the handshake squeezed into the overlap into the media-
player years (the Y2K PC stands in for them), entering the era, in AUTOPLAY
and THE JOURNEY; it stops dead where the overlap ends, as the new track
lands whole. The cartridge clicks in as each handheld track starts - the
cartridge era the project has; the woodgrain and 16-bit consoles' periods
are not built yet, and will take it when they are. The chimes open each era
in THE JOURNEY, on the incoming track's key, each in the spirit of its
machines and none a copy of one: a coin's two pings and a credit counting
up; a SID pulse running up the chord; the floppy drive stepping; the beep a
PC gives when its self-test passes; a deep chord swelling; a ping of two
notes a fifth apart; a soft bell. Y2K's is the modem.

| Check | Result |
|---|---|
| The modem, 8 s, measured in twentieths against the spectrogram | 350 Hz dial tone; DTMF pairs; a gap; FSK at 1650-1850 and 980-1180 Hz; a gap; 2100 Hz (96% of the power) with the calling bursts over it; the comb; the hiss at -18 to -20 dB, as loud as the tones (it was 13 dB under them at first); nothing after the drop |
| THE JOURNEY, seed `aurora` | the seven chimes at each era's slot, the cartridge and the handheld's ping, the modem into Y2K |
| AUTOPLAY, 60 tracks | 3 modems (each way into Y2K), 6 cartridges (each handheld track), no chimes |
| THE JOURNEY, 128 s rendered | peak -1.3 dBFS, no invalid samples, 3x real time |
| Live (muted), `journey=1`, skipping on | plays on; no console errors |
| The 26 styles on every chip of their eras, three seeds | 156 takes, all byte-identical |
| `npm test` | 17 checks pass; THE JOURNEY's sound changed (the chimes), the same whatever the block size |
| A taste to listen to | `out/between-tracks-taste.mp3`: each era's way in, 85 s |

The owner approved the sounds between the tracks on 2026-10-31. With them, round 12 of the plan is done: its two styles, its films, screens and demo effects, its three ways to watch and its sounds between the tracks.

### The anime opening's music

The owner chose round 11's `animeop` style next: the anime opening scene
played music borrowed from its era. The plan: "fast J-rock with brass, a key
change before the last chorus, a big sing-along lead"; the famous themes are
never quoted, the tune is the seed's.

**The references.** A corpus study of anime openings (Joy Li, "Modulation
and Chromatic Mediants in Japanese Anime Songs", *Music Theory Online* 32.1):
of 108 openings of the most popular series, 92.6% are in verse-prechorus-
chorus form, cut to about ninety seconds (the "TV size"); their sections
change key at their edges - the prechorus often carrying the chorus a minor
third away, to the flat mediant - and full-length songs "pump up" into the
final chorus. The J-pop corpora's "Royal Road" progression, IV-V-iii-vi. The
tempos and keys of openings of the era, measured: 142 bpm in C harmonic minor,
155 in D major.

**What was built** (`src/core/music.js`). The anison's form, bar by bar, to
fit the length: an intro; verse, prechorus, chorus, again as often as there
is room; a bridge; the last chorus; out. Each section has its progression -
the chorus the Royal Road - and the key moves at their edges: in two seeds of
five the chorus goes up a minor third, and the last chorus a step or two
higher still (a key that moves with the sections: an offset added to every
note, nought for every other style). J-rock drums - the kick on one and three
and the seed's pushes, the backbeat, the hat open through the chorus - a bass
driving on the eighths with octaves popping in the chorus, the guitar
palm-muted in the verse and ringing power chords in the chorus, brass stabs
in the intro and the chorus, strings swelling under the prechorus; the lead
the style's hook, lower and sparer in the verse, climbing in the prechorus,
high and full in the chorus with the brass doubling it an octave down. On the
32-bit console it plays on the AWE32's guitar, brass and strings.

**What went wrong.** The first arrangement rendered at only 1.1 to 1.4 times
real time on the AWE32 - two tracks overlapping in AUTOPLAY would have
dropped out. Measured instrument by instrument, the guitar's three-note
chords ringing long were most of it, then the brass and strings' triads. The
verse's muted guitar is one string now (the drive fills in the fifth), the
chorus's power chords root and fifth, the brass and strings two notes: 4.9
to 5.9 times real time on the AWE32, where FM metal, the other guitar style,
runs at 4.2 to 4.9.

| Check | Result |
|---|---|
| The form, three lengths | 90 s at 154 bpm: intro, verse, prechorus, chorus, twice, bridge, last chorus, out; 40 s and 180 s fitted the same way |
| The key change into the last chorus, six seeds | up 1 or 2 semitones in all six |
| Levels, the synthesizer's own voices and the AWE32, three seeds | peaks -1.9 to -2.1 dBFS, no invalid samples |
| Speed | 6.9 to 9.4 times real time on its own voices, 4.9 to 5.9 on the AWE32 |
| Every earlier style on every chip of its eras, three seeds, before and after | 156 takes, all byte-identical |
| Live (muted), its own scene on the 32-bit console | Anime Opening, 154 bpm, G major; no console errors |
| `npm test` | 17 checks pass, 27 styles compose |
| A taste to listen to | `out/animeop-taste.mp3`: three seeds, each from the last prechorus through the key change |

**The owner's listen: strident and disconnected** - "the attempt at a voice
that sounds like high tones over a good tune", the analysis left to Claude.
The lead, measured as a melody over five seeds, bore it out: it reached E7 to
G7 in the chorus and spread over two and a half octaves; 38% of its moves
were leaps wider than a major third, 13% wider than a sixth; and the two
choruses did not sing the same tune. The cause: each note was placed from the
chord's root, not the key's, so the line jumped with every change of chord,
and its register rose with the chord, the key and the section at once. It is
a singer's line now, composed once per section: degrees counted from the
tonic, in one register whatever the key (the tonic between F#3 and F4, the
verse lowest, the chorus highest); two-bar phrases on the eighths with a long
last note and a breath; each phrase an arch, rising to a peak a little before
its middle and falling home; on every beat and long note the chord tone
nearest the arch, never more than a fifth from the last note nor the same
note three times running, steps between; the chorus A A' A B, ending on the
tonic, the same tune each time it comes back; the prechorus climbing a third
each phrase; the bridge long notes. The lead is the plain one, not the
screaming hero lead; the brass joins it only in the last chorus, and its
stabs sit an octave lower, under the singer.

| The lead, five seeds | Before | After |
|---|---|---|
| Range | 30 to 33 semitones, up to G7 | 18 to 22, about F#3 to B5 |
| Leaps wider than a major third / a sixth | 38% / 13% | 10% / 0% |
| On the beat, a tone of that beat's chord | 61% | 99 to 100% |
| Held notes, a chord tone | - | 99 to 100% |
| The choruses sing the same tune | no | yes |

One chorus, hikari (G major): D4 G4 A4 G4 A4 B4 A4 | A4 G4 F#4 E4 F#4 D4- |
E4 E4 F#4 G4 A4 G4 A4 | G4 F#4 E4 D4 E4 C4- | the first two bars again |
E4 F#4 G4 A4 G4 | G4 E4 F#4 G4-. Speed unchanged: 5.3 to 5.9 times real time
on the AWE32; peaks -2 dBFS; `npm test` passes; the taste rendered again.

The owner listened live and approved the anime opening's music on 2026-10-31.

### Skate punk

The owner chose round 11's `skatepunk` next. The plan: "fast punk at 190,
ska upstrokes, a synth lead like a shouted chorus", for the 32-bit console.

**The references.** The skate games' best-known ska-punk single: about 195
bpm, in D, its chords A, D, Em, G and Bm - ska verses against punk choruses.
A punk drumming lesson's beats (drumhelper, "10 Punk Drum Beats"): eighths on
the hat, the snare on every "and", the kick on the beat and the "e" after it;
the kick doubled just before the snare, "one of the biggest concepts that make
a punk drum beat sound like a punk drum beat"; the hats opened for aggression.

**What was built** (`src/core/music.js`), on the anime opening's song form,
shared: its sections and its singer's line, with this style's register and
density and no key changes (the anime opening, checked, is byte for byte as
approved). 180-200 bpm, the progressions of three-chord punk - I-V-vi-IV,
I-IV-V, the ska-punk turn V-I-ii-IV. The verse is ska: a backbeat, the hats
closed, the bass walking the chord on the beats, the guitar chopping two-note
upstrokes on every off-beat. The prechorus strikes power chords on the beat.
The chorus is punk: the lesson's beat - the snare on every "and", the kick on
the beat and the sixteenth after, or in a third of the seeds doubled before
every snare - the hats open, the bass picking eighths on the root, power
chords hammered on the eighths. The bridge drops to half time. The lead sings
the verse plain; in the chorus a wide supersaw doubles it in unison, the gang
shouting - the line kept to an octave (the anime opening's lesson: no high
screaming), chanted on the eighths, the same each time it comes back.

| Check | Result |
|---|---|
| The lead, five seeds | one octave, G3 to D5 by key; leaps wider than a third 7%, wider than a sixth none; chord tones on the beat 93% (measured against the bass, which walks the third and fifth in the verse); the choruses the same tune |
| The anime opening after the shared form changed | its six takes byte-identical |
| Levels and speed, its own voices and the AWE32 | peaks -1.9 to -2.0 dBFS, no invalid samples; 6 to 7.6 times real time, 4.7 to 5.8 on the AWE32; 183 to 197 bpm |
| Every earlier style on every chip of its eras, three seeds | 162 takes, all byte-identical |
| `npm test` | 17 checks pass, 28 styles compose |
| A taste to listen to | `out/skatepunk-taste.mp3`: three seeds, each from the ska verse into the punk chorus |

**The owner's listen: out of step** - "two things playing at the same time,
out of square", harmonies overlapping at different times; the cause left to
Claude. Measured, three things, the first the worst:

1. **The guitar a major third off.** Its power chords were built from
   `noteOf(40, ...)`, and the 40 is not a register: the key's tonic sits at
   the base plus the key's root, so 40 put every power chord four semitones
   above the harmony - on the chord's third and major seventh - and that
   seventh rubbed a semitone against the root the bass played: 99% of the bass
   notes sounded a semitone from a guitar note. The chords now stand on the
   bass's root, raised an octave into the guitar's register.
2. **The echo off the grid.** A dotted-eighth echo (237 ms at 190 bpm) laid a
   copy of every note of the chant a sixteenth off the eighths, over the next
   chord. It is an eighth now, on the grid, and quieter.
3. **The verse bass** walked a major triad's fixed semitones over minor chords
   too; it walks the scale's degrees, the chord's own tones.

And the chant is square: on the eighths, no sixteenths, no pickup; its every
note a chord tone (a gang shouting over a chord struck on each eighth sings
nothing else), within a third of the last where it can be.

| Measured, five seeds | Before | After |
|---|---|---|
| Bass notes a semitone from the guitar struck with them | 99% | 0% |
| Lead notes a semitone from a guitar note sounding with them | 12% | 0% |
| Lead notes off the eighths | 5% | 0% |
| Leaps wider than a third | 7% | 1% |
| The anime opening (sharing the form) | - | byte-identical |

The same `noteOf(40, ...)` stands in two styles already built: the anime
opening's guitars (approved by ear) and FM metal's riff. It is the owner's to
say whether they are put right: it changes what they sound like.

The owner listened again and approved skate punk on 2026-10-31.

### The music audit

The owner asked how the music was being reviewed: twice the faults had been
found only once he heard them, though the score showed them. Until now a
style was checked for its levels, its peaks, its speed on each chip and its
determinism - nothing about it as music. At his word there is now a music
audit (`tools/music-audit.js`, `npm run audit:music [-- <style>]`), a style
at a time or all of them, and a written review it belongs to
(`docs/MUSIC-REVIEW.md`): audit, find the cause, fix, audit again, then the
ear. It splits each score into bass, chords and melody and checks the bass
under each chord, rubs between them, the melody's chord tones, register,
leaps and repeats, the grid and the echo, the melody against the chords in
the mix, peaks and speed, each against a threshold, a style let off where
the clash is the point (the derelict ship's half-step and pedal, the jazz
bass's chromatic approach), with the reason written down.

**Tested on the faults already known** before it was run on the rest: FM
metal's guitars a third off (the bass in the chord at 1% of changes, 97% of
bass notes rubbing - fail); the anime opening's guitar, the same fault under
correct strings and brass (77% and 6% - warn); skate punk, fixed, passing.
Two false alarms were found and removed: a melody note on the fifth when no
one plays the fifth, and a melody note when only the bass is sounding.

**All 28 styles** (`docs/MUSIC-AUDIT.md`): four pass with no failure - acid,
tracker jazz, the anime opening, skate punk. In the other 24 the failures
gather round a few causes:

| Cause | Styles failing | What it is |
|---|---|---|
| The melody's register | 20 | the shared lead roles place each note from the chord's root, with octave leaps, so the line climbs to C7-C9 (the anime opening's first fault) |
| The melody's leaps | 15 wider than a third, 16 wider than a sixth | the same: the line jumps with every chord |
| The melody off the chord | 9 on the beat, 7 held, 5 rubbing | the same, and lines that ignore the chord under them |
| A buried melody | 9 | the lead 8 to 16 dB under the chords: trance, rave, hardcore, eurodance, gabber, orchestral, star pilot, FM metal, MIDI quest |
| The guitar a third off | FM metal (fail), the anime opening (warn) | `noteOf(40, ...)` used as a register |
| Bass rubs | arcade, rock and roll, FM metal | the marching and boogie basses through the scale, and the guitar fault |

Nothing failed off the grid, at its peaks or on speed. Nothing was changed:
the audit only reports. Which style is put right first, and how, is the
owner's: each fix changes how a style sounds, and comes back to him with its
audit before and after and a taste to listen to.

### FM metal, through the audit

The owner chose FM metal for the first turn of the loop: the worst of the 28,
with nearly every kind of fault. Four passes, two of which put the audit
itself right.

1. **The audit, before**: the bass in the chord at 1% of chord changes, 97%
   of bass notes rubbing; 33% of held melody notes rubbing; 41% of moves
   leaping past a third, 21% past a sixth; the melody 16 dB under the riff.
2. **The causes, in the composer.** The riff's power chords from
   `noteOf(40, ...)` - a major third above the harmony. The solo is the
   shared "hook", which places each note from the chord's root, so it leapt
   with the chords. And the riff struck three-note chords louder than the solo.
3. **The fixes, in this style's own code.** The riff on the bass's root,
   raised into the guitar's register, root and fifth, a little softer; the
   hook may now sing a line (`hook.line`, FM metal's alone - the other seven
   hook styles are untouched): eight bars over the progression, composed as
   the anime opening's singer's line - chord tones on the beats, steps between,
   an arch to each phrase, home at the end, the same each time round - kept
   close (a chord tone within a third where there is one), and louder; the
   echo on the eighths, as skate punk's.
4. **The audit put right on the way.** It took the solo for part of the riff
   (both a guitar, struck together): an instrument's variants are separate
   players now. It counted the third as off the chord over power chords that
   have none: over a bare root and fifth the scale's third counts. And it
   judged the echo by the style's delay alone: it now uses what the melody's
   instrument sends to it.

| FM metal | Before | After |
|---|---|---|
| Bass in the chord | 1% | 99% |
| Bass rubs | 97% | 0% |
| Melody on the beat a chord tone | - | 87% |
| Held notes a chord tone, rubbing | 67%, 33% | 94%, 5% |
| Leaps past a third, past a sixth | 41%, 21% | 4%, 0% |
| Range, top note | 14, C6 | 11, F#5 |
| Phrases heard again | 97% | 88% |
| Melody against the riff | -16.0 dB | -2.6 dB |
| Speed on its slowest chip | 4.2x | 3.8 to 4.5x |
| Every check | 6 fail, 1 warn | all pass |

Every other style byte for byte as it was (159 takes); `npm test` passes. A
before-and-after to listen to: `out/fmmetal-before-after.mp3`, two seeds -
one on the Sound Blaster 16's FM, one on the AWE32 - each before, then after.

The owner listened and approved FM metal, put right, on 2026-10-31.

### The anime opening, through the audit

The owner chose the anime opening next: approved by ear, but its audit
warned of the same guitar a third off, its melody a little under the band -
and, on its slowest chip, it failed on speed.

| The anime opening | Before | After |
|---|---|---|
| Bass in the chord | 77% | 98% |
| Bass rubs | 6% | 0% |
| Melody against the chords | -6.4 dB | -2.8 dB |
| Speed on the AWE32, seed aurora, live block size | 1.6x | 4.2 to 4.6x |
| Every check | 1 fail, 3 warn | all pass |

The causes: the guitar from `noteOf(40, ...)` (in G major it struck B, the
third, for G); and on the AWE32 the brass stabs - two notes, each a section
of three horns - and the chorus guitars ringing past the next chord cost so
much that a track ran at 1.6 times real time where the dense part fell (the
first measurements, of twelve seconds, had missed it), too slow for two
tracks overlapping in AUTOPLAY. The guitar now stands on the bass's root; the
stabs are one horn line on the chord's third (the guitars and the strings
hold the chord); the chorus guitars ring for most of a beat, not past it;
and the singer is a little louder. The melody, the form and the key changes
are as approved. Every other style byte for byte as it was; `npm test`
passes. A before and after: `out/animeop-before-after.mp3`, two seeds on
the AWE32, a chorus each, before then after.

The owner listened and approved the anime opening, put right, on 2026-10-31.

### Synth-pop, through the audit

The owner chose synth-pop next, the style whose point is "a chorus you hum
all day". Its hook was the shared one: each note placed from the chord's root
at C5, so the line ran round D6-F#6 and leapt with the chords, and an octave
lift in the busiest bars (fifteen of forty-three) took it to C#8.

| Synth-pop | Before | After |
|---|---|---|
| Top note, range | C#8, 33 semitones | G#5, 13 |
| Leaps past a third, past a sixth | 46%, 10% | 15%, 0% |
| Held notes a chord tone, rubbing | 90%, 7% | 100%, 0% |
| Phrases heard again | 63% | 80% |
| Melody against the chords | -3.2 dB | -2.3 dB |
| Every check | 4 fail, 2 warn | all pass |

The fix is FM metal's, by the style's own setting: the hook sings a line
(`hook.line`), eight bars over the progression in one register, chord tones
on the beats, steps between, an arch to each phrase, the same each time
round, a little louder; and a line keeps its register - no octave leap at the
peak. The eighties' dotted-eighth echo stays: it is the genre's own sound,
and this line is not held to the eighths. One phrase of the new hook (seed
aurora): G4 A4 B4 E5 G5 F#5 E5 | D5 C5 B4 A4-, and again two bars on. One
pass was enough. Every other style byte for byte as it was; `npm test`
passes. Before and after: `out/synthpop-before-after.mp3`, two seeds.

The owner listened and approved synth-pop, put right, on 2026-10-31.

### Star pilot, through the audit

Next, star pilot: the same hook, its brass line climbing to C#8 and leaping
with the chords, buried 8 dB under the orchestra hits - and those hits, a
three-note chord in the brass and another in the strings four times a bar,
made it render at 1.2 times real time on the 32-bit console's AWE32, where
every brass and string note is a section of players.

| Star pilot | Before | After |
|---|---|---|
| Top note, range | C#8, 34 semitones | G5, 10 |
| Leaps past a third, past a sixth | 40%, 19% | 13%, 0% |
| Held notes a chord tone, rubbing | 85%, 8% | 100%, 0% |
| Melody against the chords | -8.2 dB | -2.9 dB |
| Speed on its slowest chip | 1.2x | 3.9 to 4.0x |
| Every check | 6 fail, 2 warn | all pass |

Two passes. The hook sings a line, kept close, louder; the orchestra hit is
one chord shared between the sections rather than doubled - the brass the
root and the fifth, the strings the root and the third, the same three notes
at half the players; the echo on the eighths, under the brass line.

The audit learned one more thing on the way: where the chords are only
struck now and then - an orchestra hit, then nothing but an arpeggio - it
counted a held note on the chord's third as off the chord. It now adds the
key's third over the bass, as it already added the fifth: the chord the bass
implies. The styles already put right still pass. Every other style byte
for byte as it was; `npm test` passes. Before and after:
`out/starpilot-before-after.mp3`, two seeds on the AWE32.

The owner listened and approved star pilot, put right, on 2026-10-31.

### MIDI quest, through the audit

Next, MIDI quest, the adventure on a sound card. Its flute had the old hook:
each note placed from the chord's root, so it leapt with every chord change,
and an octave lift in the busiest bars took it to C#8. Under it, the
orchestra laid a choir triad on top of the strings - entering exactly when
the flute did - and the flute sat 12 dB under them.

| MIDI quest | Before | After |
|---|---|---|
| Top note, range | C#8, 33 semitones | F#5, 12 |
| Leaps past a third, past a sixth | 40%, 12% | 5%, 0% |
| Held notes a chord tone, rubbing | 89%, 5% | 100%, 0% |
| Phrases heard again | 18% | 40% |
| Melody against the chords | -11.9 dB | -2.1 dB |
| Speed on its slowest chip | 5.9x | 4.8 to 8.6x (two runs) |
| Every check | 5 fail, 1 warn | all pass |

The fix, by the style's own settings: the flute sings a line (`hook.line`),
kept close, a little louder; and the choir stays out (`orch.noChoir`) - the
strings hold the chord, the harp arpeggiates it, the flute has the air above.
The orchestral style, which shares those chords, keeps its choir. One phrase
of the new line (seed aurora, E mixolydian): F#5 D5 E5 D5 G#4 | B4 B4 C#5 |
E5 C#5 B4 A4 | G#4 G#4 G#4 A4. Three passes: the line, the choir, the level.
Every other style byte for byte as it was; `npm test` passes. Before and
after: `out/midiquest-before-after.mp3`, two seeds on the OPL3.

The owner listened: not yet - the melody, the flute's sound, and the tempo
or the echo. Measured, each had a cause the audit does not look for:

- **The flute's sound.** Held against a real flute's spectra (the University
  of New South Wales's flute acoustics pages, a modern flute's G4 and A5),
  ours was a whistle: at G4 the real flute's third harmonic is 3 dB under
  its fundamental, ours 32 dB on the OPL3 and 55 on the synthesizer's own
  voice. Exposed, now that the line sits on top of the mix, it sounded like
  one. The quest has its own flute now: on the synthesizer and the AWE32 the
  real flute's harmonics, sliding from G4's to A5's with the register; on the
  OPL3 the nearest two operators come (a sweep of them, held against G4),
  with the chip's key scaling making it purer as it climbs, as the real one
  does, and a little chiff at the start.

| Harmonics 2 to 6 at G4, dB | Real flute | Before | After |
|---|---|---|---|
| Synthesizer's own, AWE32 | -12 -3 -17 -21 -27 | -16 -55 -56 -58 -70 | -13 -7 -27 -49 -41 |
| OPL3 | -12 -3 -17 -21 -27 | -16 -32 -48 -66 -92 | -5 -12 -19 -26 -35 |

  (The higher harmonics of the synthesizer's flute measure lower than they
  are made: its vibrato spreads them past the measuring window.)
- **The echo.** On the dotted eighth, half of its repeats (47 to 63 of every
  hundred, three seeds) landed a step from the note then sounding: a rub at
  every turn of the line. It is on the beat now, and quieter (0.35 from 0.7).
- **The melody.** The same eight bars ran the whole track, and at the bottom
  of the register the line stood on one note three and four times running
  (5, 6 and 13 times, three seeds). It now has an answer - a second eight
  bars, so the tune goes A A B A - and keeps moving: at the edge of its
  register a step turns back.
- **The tempo** from 84-108 to 92-112, a little more walking pace.

| MIDI quest, second pass | First pass | Now |
|---|---|---|
| Notes three in a row (three seeds) | 5, 6, 13 | 0, 0, 0 |
| Echo landing a step from the note sounding | 51%, 58%, 47% | 35%, 37%, 25% |
| Tempo, three seeds | 87, 91, 99 | 94, 98, 105 |
| Phrases heard again | 40% | 73% |
| Every check | all pass | all pass |

The quest's flute is a kit of its own: tracker jazz's flute, the other style
that plays one, is as it was. Every other style byte for byte as it was;
`npm test` passes. Before and after: `out/midiquest-before-after.mp3`, the
first pass then this one, two seeds on the OPL3.

The owner listened and approved MIDI quest, put right in two passes, on 2026-10-31.

### Arcade attract, through the audit

The owner chose arcade next. Two faults: the shared hook again - each note
from the chord's root, leaping with the chords, its octave reaching F7 - and
the marching bass. That bass walks four steps down the scale, one a beat,
whatever the chord: in a major key its second step is the seventh, a
semitone under the chord's root; in a minor key its third is the sixth, a
semitone over the fifth. A sixth of its notes rubbed against the arpeggio.

| Arcade attract | Before | After |
|---|---|---|
| Bass notes rubbing a semitone | 17% | 0% |
| Bass in the chord (a walk: noted, not judged) | 50% | 82% |
| Top note, range | F7, 20 semitones | B5, 12 |
| Leaps past a third | 29% | 1% |
| Held notes a chord tone | 96% | 100% |
| Phrases heard again | 85% | 91% |
| Every check | 2 fail, 1 warn | all pass |

The march still steps down a beat at a time, but a step that would land a
semitone from the chord's notes goes on to the next: in C major C A G E,
not C B A G. The pulse hook sings a line (`hook.line`), kept close and
moving - MIDI quest's rule, no note three times running (aurora's line had
seven such runs before it). Two passes. Every other style byte for byte as
it was; `npm test` passes. Before and after:
`out/arcade-before-after.mp3`, two seeds.

The owner listened and approved arcade attract, put right, on 2026-10-31.

### Cyborg pulse, through the audit

The owner chose cyborg next, the machine score in thirteen. Its hook was the
shared one - three or four brass notes a bar, each from the chord's root,
leaping with the chords to D#6 - and under it the power chords: a brass
triad struck on the odd metre's hits, entering only when the hook did, on
the same instrument and in the same register.

The fix, by the style's own settings: the brass sings a slow theme - a line
on the style's own hits (`melody.hits`: three long notes a bar, now and
then a pickup into the next phrase), chord tones on the hits, steps between,
moving (no note three times running); a bar of thirteen ends a note with it.
And the power chords are what their name says (`power.fifths`): the root
and the fifth, a little back, so the theme has the top. Heroic, which shares
those chords, keeps its triads.

The audit learned one more thing. A third of the theme's notes fall on the
same instant as a stab, on the same brass; the audit grouped notes struck
together into a chord, so those notes were counted as harmony, and the leaps
measured across the gaps they left. A chord is struck together *and held
together*: a note struck with a chord but held its own length is another
player. Measured with the corrected audit, before and after:

| Cyborg pulse | Before | After |
|---|---|---|
| Top note, range | D#6, 21 semitones | E5, 11 |
| Leaps past a third, past a sixth | 40%, 20% | 8%, 0% |
| Held notes a chord tone, rubbing | 87%, 10% | 100%, 0% |
| Melody against the chords | -4.7 dB | -0.6 dB |
| Every check | 2 fail, 2 warn | all pass |

The corrected audit moves three other styles' numbers without a note of
theirs changing: star pilot still passes every check (its brass line, too,
fell on its orchestra hits); trance (melody against the chords -13.2 to -4.2
dB, leaps past a sixth 16% to 2%) and ambient (phrases heard again 33% to 8%)
still fail, as before. Four passes. Every other style byte for byte as it
was; `npm test` passes. Before and after: `out/cyborg-before-after.mp3`, two
seeds.

The owner listened: not yet - the brass theme, and the brass's sound.

- **The brass's sound.** Held against a real trombone (the University of New
  South Wales's brass acoustics pages: a crescendo, its soft start and its
  loud end), ours was a synthesizer's saw: the same at every loudness, and
  above a kilohertz far brighter than even the loud trombone. A real brass
  instrument is mellow when soft and brightens as it grows louder, the high
  harmonics rising far more than the low ones. The theme has a brass of its
  own now (`kit: 'theme'`): its brightness follows its loudness and swells
  over each long note, the harmonics above a kilohertz falling steeply, the
  fundamental eased back as it grows loud. The stabs, and every other style's
  brass, are as they were.

| Harmonics at 0.25, 0.5, 1, 1.5, 2, 2.5 kHz, dB (A3, held) | Soft | Loud |
|---|---|---|
| Real trombone | -4 -16 -30 -40 -44 -48 | -4 0 -14 -22 -30 -40 |
| Before (the same soft or loud) | 0 -15 -17 -19 -21 -23 | 0 -15 -17 -19 -21 -23 |
| After | 0 -12 -32 -46 -56 -65 | 0 -9 -14 -21 -28 -35 |

  (Above a kilohertz the loud brass is within 5 dB of the trombone; the
  second harmonic stays under the first, where the trombone's is above it.)
- **The theme.** Three long notes a bar, one length each, and the same note
  struck twice running, again and again: it stood still. It has a shape now:
  long, short, long in each bar of thirteen (six, two and five sixteenths),
  the short note a step between two chord tones; no note struck twice
  running; an answer phrase, so the tune goes A A B A; and each phrase comes
  home to the tonic, in a register narrow enough that it can - the first try
  left it a seventh above where the tune starts again, a leap at every turn.
- **The echo.** The audit's new check (below) found what the ear had: on the
  dotted eighth, 56% of the theme's echoes landed a step from its next note.
  A beat on was no better (49%: the theme's short step lands there); two
  beats on, 32%, and quieter (0.5 from 0.8).

| Cyborg pulse, second pass | First pass | Now |
|---|---|---|
| Top note, range | E5, 11 semitones | C5, 8 |
| Leaps past a third, past a sixth | 8%, 0% | 10%, 0% |
| Phrases heard again | 69% | 57% |
| Melody against the chords | -0.6 dB | -1.0 dB |
| Echoes landing a step from the next note | 56% | 32% |
| The brass against a trombone (worst point) | 11 dB (no brighter loud) | 5 dB |
| Every check | all pass | all pass |

The audit learned one more thing: in a bar of thirteen the beats are counted
from the bar line, not on a grid of fours running across it (which had
judged the short step between two chord tones as a wrong note on the beat,
whenever the grid happened to fall there). Only cyborg plays in thirteen.
Every other style byte for byte as it was; `npm test` passes. Before and
after: `out/cyborg-before-after.mp3`, the first pass then this one, two
seeds.

The owner listened and approved cyborg pulse, put right in two passes, on 2026-11-01.

### The audit learns to listen for the instrument

The owner asked the audit to learn from this: twice now (MIDI quest's flute,
cyborg's brass) a style passed every check and the ear still heard what was
wrong, and the fault was found by holding the instrument against a real one.
Three checks come from those two cases, each tried on the version the owner
turned down (it should not pass) and on the one put right (it should):

- **Sound against the real one.** The melody instrument, where it imitates a
  real one, is rendered alone - a held note at a few pitches and loudnesses,
  on every chip its style plays on - and its harmonics compared with a real
  player's, in dB. The references (`tools/timbre-refs.js`) are read off
  published measured spectra and name their source: a flute at G4 and A5,
  and a trombone's crescendo, soft and loud - and how much brighter loud is
  than soft, since that is what brass does. (Reading the soft trombone, past
  a kilohertz the figure shows only its noise floor: those points are not
  read.) Pass within 9 dB on average at the worst point, warn to 13.
- **Echo rubs.** How many of the melody's echoes land a tone or a semitone
  from the note then sounding.
- **Stuck notes.** How many melody notes are one pitch struck a third time
  running.

| Check | MIDI quest turned down | MIDI quest approved | Cyborg turned down | Cyborg now |
|---|---|---|---|---|
| Sound against the real one | ✗ 25 dB (the flute a whistle, on the OPL3) | ✓ 6 dB | ⚠ 11 dB (no brighter loud) | ✓ 5 dB |
| Echo rubs | 54% | 31% | 56% | 32% |
| Stuck notes | 3.9% | 0% | 0% | 0% |

The sound check separates what the owner turned down from what was put
right. The other two do not stand on their own: the owner approved synth-pop
with an echo that rubs more (68%, and louder) than MIDI quest's did, star
pilot's fanfare repeats its notes (12%), skate punk chants on one. So those
two only ever warn - something to listen for, not a fault - and say so.

Run on every style, the sound check finds tracker jazz's flute - the old one,
the whistle - 25 dB from the real flute (fail), and the brass of star pilot,
the orchestral score and new beat (on Paula) 10 to 11 dB from the trombone,
no brighter loud than soft (warn). Nothing in them is changed here: the
owner chooses. With it, 9 of 28 styles pass every check (cyborg among them,
awaiting the owner); tracker jazz, which passed, now fails on its flute.
`docs/MUSIC-REVIEW.md` has the checks, the references and a seventh step to
the loop: when the owner hears a fault the audit passed, find how to measure
it, and try it on both versions.

### Tracker jazz's flute

The first thing the sound check found, and the owner chose it next: tracker
jazz's flute was the old one, the whistle - on the Amiga, 25 dB from a real
flute, its third harmonic 50 dB under the fundamental where a real flute's
is 3. It now plays MIDI quest's flute, the one with a real flute's
harmonics (the kit renamed from `quest` to `real`: it is no longer one
style's). Nothing else in the style changed - its improvising line, its
walking bass, its echo are as they were.

On the Amiga it cannot match the real flute at both ends of its range: a
tracker plays one sample of an instrument, transposed, and a real flute is
rich low down and nearly a sine an octave and a half up. Sampled with C4's
harmonics, its high notes measured 13 dB too bright; with D5's, its low ones
16 dB too dull; taken at A4, between, it strays 10 dB at its worst - a
warning, the least one sample can do.

| Tracker jazz, on the Amiga | Before | After |
|---|---|---|
| The flute against a real one (worst point) | ✗ 25 dB | ⚠ 10 dB |
| Melody against the chords | -1.0 dB | -2.4 dB |

The style's other warnings (a top note of E6, leaps, notes repeated) are its
improvising flute's, as before. MIDI quest's sound byte for byte as it was,
and every other style's; `npm test` passes. Before and after:
`out/modjazz-before-after.mp3`, two seeds on the Amiga.

The owner listened and approved tracker jazz's flute on 2026-11-01.

### The brass the sound check found

Next, the owner chose the brass: star pilot's, the orchestral score's and new
beat's, each warned by the sound check - no brighter played loud than soft,
where a real trombone's high harmonics rise far more than its low ones.

**Star pilot** plays on the AWE32, whose brass was three detuned saws through
a filter barely moved by the velocity. Its melody now plays the real brass
(cyborg's, the kit renamed from `theme` to `real`, as the flute's), made
for the AWE32 as that card would: the EMU8000's filter opened by the note's
velocity, as a SoundFont's velocity-to-cutoff modulator does, swelling over
a long note. Its orchestra hits keep the old brass.

| Star pilot's brass on the AWE32, dB at 0.25, 0.5, 1, 1.5, 2, 2.5 kHz (A3, held) | Soft | Loud |
|---|---|---|
| Real trombone | -4 -16 -30 | -4 0 -14 -22 -30 -40 |
| Before (the same soft or loud) | 0 -27 -16 -20 -26 -30 | 0 -26 -15 -19 -25 -29 |
| After | 0 -27 -34 -47 -61 -68 | 0 -23 -18 -26 -38 -43 |
| Sound check, worst point | ⚠ 10 dB (no brighter loud) | ✓ 7 dB |

(The second harmonic dips in both: the three detuned horns beat against each
other there.)

**The orchestral score and new beat** play on the Amiga, and there the
warning is the tracker's own: one sample of the brass, played louder only by
being played at a higher volume, cannot brighten. The real brass, sampled,
was tried at three brightnesses: the worst point stays at 11 dB whatever the
sample (the soft-to-loud change, which no sample has), and on average it
came to 6.75 dB from the old brass's 6.9 - no change worth hearing. So both
are left as they were, the warning standing for what Paula cannot do.

Cyborg's sound byte for byte as it was, and every style's but star pilot's;
`npm test` passes. Before and after: `out/starpilot-before-after.mp3`, two
seeds on the AWE32.

The owner listened and approved star pilot's brass on 2026-11-01.

### Chip rock and roll, through the audit

The owner chose rock and roll next. Four faults, one under another:

- **The comp against the boogie bass.** The bass walks root, third, fifth,
  sixth, flat seventh under every chord - a twelve-bar's chords are all
  major with that flat seventh, whatever the key - but the piano comped the
  key's own triads: in a mixolydian key the V a minor chord against the
  bass's major third, the IV's added note a semitone from the bass's. 17% of
  the bass's notes rubbed. Comping the dominant seventh itself did worse
  (27%: its flat seventh against the bass's sixth, struck together). The
  fifties' own comp moves with the bass instead: on each chord's root, the
  major chord on the first and third beats and the sixth chord on the second
  and fourth (C, C6, C, C6), on every eighth, chopped short. The key is
  major now: the blues' V is a major chord, mixolydian's is minor.
- **A twelve-bar melody on an eight-bar loop.** The sung line (`hook.line`,
  as in the styles before) was eight bars long, so from the ninth bar it sang
  over the wrong chords. It is as long as the chords go round now
  (`hook.bars: 12`).
- **The line's repeat.** Its third phrase is the first again - on the same
  chords in a four-chord loop, but in a twelve-bar the fifth and sixth bars
  are the IV: the I's phrase landed on the IV. A phrase comes back only
  where its chords do.
- **Its cost.** A comp on every eighth, each note ringing on for the piano's
  long tail, rendered at 3 times real time. Chopped means the damper down at
  once: the comp's notes now release fast and end there (a note can carry its
  own tail), and the style renders faster than before.

| Chip rock and roll | Before | After |
|---|---|---|
| Bass rubbing a semitone | 17% | 0% |
| Bass in the chord (a boogie walk: noted, not judged) | 50% | 74% |
| Top note, range | E7, 19 semitones | B5, 12 |
| Leaps past a third, past a sixth | 34%, 12% | 2%, 0% |
| Held notes a chord tone, rubbing | 94%, 0% | 100%, 0% |
| Notes struck a third time running | 3.4% | 0% |
| Speed on the AWE32, three seeds | 5.1 to 6.5x | 6.9 to 8.0x |
| Every check | 3 fail, 2 warn | all pass |

The echo is still a warning to listen for - 65% of its repeats land a step
from the next note - but it is the eighth-note slapback of the records the
style is after, kept.

The audit learned one thing: where a style's bass walks (let off for it),
its passing notes, under a whole chord sounding, imply no chord of their own
- the bass on the sixth is not a chord on the sixth. It moves the derelict
ship's numbers a little (its drone, a pedal, let off the same way); it still
fails as before. Every other style byte for byte as it was; `npm test`
passes. Before and after: `out/rocknroll-before-after.mp3`, two seeds on
the AWE32.

The owner listened and approved chip rock and roll, put right, on 2026-11-01.

### Synthwave, through the audit

Next, synthwave: one fail, the cause the first styles had. Its lead played
the shared lead role - each note from the chord's root, leaping with the
chords - and reached A#7. It sings a line now, as synth-pop does (`hook.line`,
kept close, moving), on the same lead; one pass. The big dotted echo of the
genre stays, as synth-pop's did: a warning to listen for (58% of its repeats
land a step from the next note), not a fault.

| Synthwave | Before | After |
|---|---|---|
| Top note, range | A#7, 21 semitones | C6, 12 |
| Leaps past a third, past a sixth | 25%, 4% | 3%, 0% |
| Held notes a chord tone, rubbing | 85%, 7% | 100%, 0% |
| Phrases heard again | 29% | 61% |
| Melody against the chords | -4.6 dB | -2.6 dB |
| Every check | 1 fail, 6 warn | all pass |

The shared lead role is as it was for the three other styles that play it
(dreamwave, jungle, eurodance). Every other style byte for byte as it was;
`npm test` passes. Before and after: `out/synthwave-before-after.mp3`, two
seeds.

The owner listened and approved synthwave, put right, on 2026-11-01.

### Trance, through the audit

Next, trance: its supersaw lead played the shared supersaw role - each note
from the chord's root, an octave up in the loudest bars - and reached E8,
spanning 30 semitones. It sings a line now on the same supersaw (`hook.line`,
kept close, moving, a little louder); one pass.

| Trance | Before | After |
|---|---|---|
| Top note, range | E8, 30 semitones | B5, 12 |
| Melody on the beat a chord tone | 68% | 100% |
| Leaps past a third | 27% | 2% |
| Phrases heard again | 39% | 77% |
| Melody against the chords | -4.2 dB | -2.0 dB |
| Every check | 2 fail, 5 warn | all pass |

The second fail was the echo: a dotted eighth between the eighths the lead
sits on. That is the genre's own - the delay that fills the sixteenths
between a trance lead's eighths - so it stays, let off by name in the audit
(`EXEMPT`, as the derelict ship's half-step is), and still listed as a
warning to listen for. Should the owner hear it as a fault, it goes to the
eighths. Every other style byte for byte as it was; `npm test` passes.
Before and after: `out/trance-before-after.mp3`, two seeds.

The owner listened and approved trance, put right, its dotted delay kept, on 2026-11-01.

## THE JOURNEY shows the catalogue

The owner noticed THE JOURNEY showed one scene an era, the same ones every
time, most of them games, and in the Y2K part the asteroid game of 1979. The
causes, read in the code: a part played one scene, picked from its era by the
seed, so a seed (and with no seed in the address, always `seedscene`) gave
the same eight scenes for ever; `seedscene` happened to draw five games; and
`rocks` - with `starfighter`, a 90s shooter - had been on Y2K's list since
the first 0.2 commit, with no reason recorded.

The owner's brief: the seed signs the order, it does not ration the
material; a journey should show the catalogue, and its replays what the last
pass did not. So:

- **Three scenes an era.** Each part is shared between three of its era's
  scenes, each cut moved onto a drop or a crash that opens a phrase when one
  falls near it, every scene at least seven seconds (a part too short for
  three plays fewer: a 96-second journey, one an era).
- **Pass after pass.** Live, THE JOURNEY goes on: each era's scenes, in the
  seed's order, are taken three at a time, and when the list runs out it
  starts again from the top; its music goes round the era's styles the same
  way, one a pass. Every scene of an era has come round by its fourth to
  sixth pass, every style by its ninth at most (DOS has nine). A render is
  one pass.
- **Y2K** plays morph, metaballs, fractal, outrun and cascade - no asteroid
  game, no 90s shooter; both stay in their own eras.

| THE JOURNEY, seed `seedscene` | Before | After, first pass | Second pass |
|---|---|---|---|
| Arcade | rocks | lightcycles, timecar, paddles | pyramid, rocks, invaders |
| C64 | invaders | copper, invaders, plasma | dottunnel, copper, invaders |
| Y2K | rocks | cascade, morph, metaballs | fractal, outrun, cascade |
| Modern | snake | morph, outrun, boxer | starfighter, metaballs, moonbike |

Checked live (muted): the arcade part opens on its card over lightcycles,
cuts to timecar and to paddles; the second pass's arcade plays pyramid and
rocks to synth-pop where the first played cyborg; no errors. A new test: three
scenes a part, all its era's, and every scene and style of every era shown
within twenty passes; `npm test` passes. The gallery's `journey.gif` shows
the old one-scene parts until the gallery is made again.

## The catalogue in the seed's order, not the order it was written

The owner asked whether AUTOPLAY really shows all the material, and noticed
that in the plain demo the keys walk the scenes and the music in one fixed
order - the order they were created in. Read in the code: `space` and the
arrows stepped through `STYLE_NAMES`, the forty-five scenes as written into
the scenes' module, ignoring the seed and the era (stepping into scenes of
other eras without changing it); `↑` `↓` through the twenty-eight styles as
written; the menu numbered the scenes that way; `seedscene scenes` listed
them so. AUTOPLAY drew every block's scenes and music afresh - sampling, not
dealing - so a big era took long to show all it had and showed some of it far
more than the rest.

| AUTOPLAY, seed `seedscene`, 480 tracks | Before | After |
|---|---|---|
| Amiga's 17 scenes all seen by | track 160 (1 h 47 min) | track 41 |
| DOS's 14 scenes all seen by | track 166 | track 31 |
| DOS's 9 styles all heard by | track 407 (4 h 31 min) | track 68 |
| Console's 7 styles all heard by | track 114 | track 54 |
| Amiga, most / least shown scene | 14 / 6 times | 11 / 10 |
| DOS, most / least shown scene | 17 / 5 times | 13 / 12 |

The owner's rule: the order is the eras', and inside an era the seed's; the
order something was made in is nowhere in the system. So:

- **The catalogue** (`src/core/catalogue.js`): every era's scenes, era after
  era, oldest first, each era's dealt by the seed; the music from an era's
  point of view, its own styles first in the seed's order, then the other
  eras'. `space` and the arrows step through it, scene and era together -
  past an era's last scene, on into the next era's first, its card and its
  music with it; `↑` `↓` through the music. The menu steps the same way and
  shows the scene by name, no number. `seedscene scenes` lists scenes and
  styles by their first era, then by name.
- **AUTOPLAY** deals each era's scenes and music once, in the seed's order,
  and each visit to an era carries on where the last one stopped; a list
  starts again only when it runs out. The eras still take turns as before,
  and no track repeats the last one's pairing.
- **The README's scene table** goes by era too: each scene under the first
  era it belongs to, oldest first, then by name.

Checked live (muted), seed `seedscene`: from pyramid in the arcade, `space`
goes to paddles, then on into the C64 and its copper bars, the era changing
with it; `←` comes back; `↑` brings synth-pop, the first of the arcade's
music in that seed's deal; the menu shows the scene by name; no errors. Two
new tests: AUTOPLAY shows every scene and style of every era within its
visits; the catalogue goes era by era, holds every scene, and each seed deals
it its own way. `npm test` passes, twenty checks.

## One era per scene: the catalogue put right

Stepping through the scenes with the keys, the owner saw some come back far
more than expected: twenty-one of the forty-five scenes sat in two, three or
four eras, so the tour (every era's scenes in turn) had seventy-nine stops,
some repeats four presses apart. The cause was a design of the first 0.2:
"an era is a screen, not a scene: any scene can be shown through any era",
each era's list suggesting scenes from others. The owner's reading: an era is
a time, with its filter; a scene belongs to the era it comes from, and only
there - the filters may be mixed one day (a party mode), not yet. The owner
went through the list scene by scene:

| Era | Its scenes now |
|---|---|
| Arcade 1979 | paddles (Pong is 1972: no era of its own yet), invaders, rocks, maze, bricks, lightcycles, boxer, lcd, pyramid, outrun |
| C64 1982 | dottunnel, plasma; the films and series of its years: scanner, timecar, moonbike |
| Amiga 1990 | shadebobs, copper, vectorballs, ripple, metaballs, tunnel, starfield, kefrens, ball, rings, twister, bobs, dualchess, chessfloor, rubber, cracktro, plasma, fractal, bumplogo, fireworks, morph |
| DOS 1994 | fractal, tunnel, metaballs, plasma, fire, pipes, bumplogo, ansi, echolines, maze3d, cascade |
| Console 1997 | starfighter, footsteps, animeop |
| Handheld 1998 | snake |
| Y2K 2002 | morph |
| Modern 2024 | none yet |

Six scenes share eras on purpose (plasma C64, Amiga and DOS; metaballs,
tunnel, fractal and bumplogo Amiga and DOS; morph Amiga and Y2K), each seen
through its era's own filter. A film or a series belongs to the computing era
of its year (Knight Rider, Back to the Future and E.T. to the C64's).

What follows from it: an era with no scenes of its own - modern, now - is
passed by: THE JOURNEY travels seven eras, AUTOPLAY's turns skip it, a viewer
born after 2012 is taken to the nearest era that has scenes. Choosing the
modern era by hand shows the scene of the moment through its filter (or, with
the scene on auto, the seed's pick of them all). An era with one or two
scenes shows what it has: THE JOURNEY's part plays fewer than three, and
AUTOPLAY does not cut to the scene it is already on. Synthwave, modern's own
style, now plays in no programme (dreamwave still does, in the Amiga's).

The gallery was made again with each scene in its era (eleven stills moved:
plasma, scanner, timecar and moonbike to the C64; fireworks and starfield to
the Amiga; cascade to DOS; outrun, paddles and lightcycles to the arcade;
snake to the handheld; `journey.gif` with seven eras and three scenes each),
the README's examples, era labels and table order with it, and its era
section tells the new rule. Checked live (muted): `E` from Y2K to modern keeps
the scene through modern's screen; THE JOURNEY's Y2K part plays morph and
goes round to the arcade without a modern part; no errors. `npm test` passes,
twenty checks (the journey's and AUTOPLAY's cut checks now ask fewer scenes of
an era that has fewer).

The owner left the thin eras as they are for now (2026-11-01): new scenes for
them, or a party mode that mixes the filters, come later.

## Displays: how each thing was seen, apart from when

The owner's next step: a film should not be seen through a console's screen,
nor a game through a machine it did not run on; the screens should have names
of their own, a switch on AUTO, and a few the eras never used - MONO, B/W, EGA -
for anyone who wants today's scenes on yesterday's screens; one of them no
filter at all.

`src/core/displays.js` holds twelve displays, each a screen and its signal
(resolution, palette, dither, tube, bloom, scan lines, curvature, fringes,
grain): B/W, ARCADE, MONO, C64, VHS, EGA, AMIGA, VGA, 32-BIT, LCD, HI-RES and
MODERN. Eight are the eras' screens as they were, moved out of the eras and
named for what they are; four are new - B/W (grey, soft, grainy), MONO (green
phosphor, a few steps of brightness), EGA (the sixteen fixed colours of the
early PC's default palette, dithered) and VHS (colour smeared sideways off a
sharp brightness, a jitter per line, a tracking band rolling up, the
head-switching tear at the bottom - since rebuilt without the band, below); MODERN is now no filter at all. Each era
names the display most of its things were seen on.

A scene that needs a look of its own names its display: Pong B/W; the arcade
games ARCADE; the phone's snake LCD; the console's space shooter 32-BIT; the
films and the series (scanner, timecar, moonbike, footsteps, the anime
opening) VHS; the LCD game, which draws its own device, MODERN. The demo
effects are seen through their era's, so plasma is the C64's in the C64's
years and the VGA's in DOS's. DISPLAY on AUTO keeps all of it; any other
display is forced on everything - `D` live (and the menu, `?display=`), and
`--display` on the command line and in renders.

Checked on the real GPU (Intel UHD 630, Direct3D 11 through ANGLE), live and
muted: moonbike on AUTO through VHS, then every display forced in turn - B/W,
MONO, EGA, LCD and MODERN looked at - with no shader error; Pong on AUTO in
black and white. A new test: a game or a film keeps its display whatever the
era, an effect takes its era's, a forced one wins, and every display is
complete; `npm test` passes, twenty-one checks. The gallery was made again
with the scenes' own displays.

## Eras as spans of years

The owner's rule: an era is a span of years, not a machine, so whoever looks
at it sees what came out in those years. Seven eras now, keyed by the year
they start: 1972–1981 (the first video games), 1982–1989 (home computers,
arcades and the video shop), 1990–1993 (the demoscene's golden years),
1994–1996 (the PC demos and the multimedia years), 1997–1999 (3D consoles and
pocket screens - the console and the handheld years made one), 2000–2009 (the
64k intro) and 2010–now (shader art). `--era 1990`, any year inside one
(`--era 1995`) or the machine name it had (`--era amiga`) all find it, so no
shared link breaks.

A game or a film goes to the year it came out; a demo effect to the years the
owner placed its machine in (the Amiga's in 1990–1993, the PC's in 1994–1996,
the C64's in the 1980s). Moved by that: lightcycles, pyramid, boxer, bricks
and outrun (1982–1986) and the Amiga's bouncing ball (1984) to 1982–1989;
starfighter and footsteps (1993), cascade and echolines (the early-90s
desktop) to 1990–1993; Pong now has its year. Each keeps its own display, so
moving its years never changes how it looks: the ball stays on the Amiga's
screen, the desktop's card game and screensaver on VGA.

The cards of THE JOURNEY show the span and its title; each era's chime is the
start-up sound of its display's machine; the sound chips follow the spans
(Paula's samples in 1990–1993, the FM or wavetable card in 1994–1996,
wavetable in 1997–1999); BORN IN opens in the span of the twelfth year (or the
last one before it that has scenes); the intro and the help say 1972 to now.

The owner also asked for display names that say which screen, not which kind:
32-BIT is PS1, LCD is GAME BOY (the handheld's reflective, passive-matrix STN
LCD), HI-RES is SVGA; two are new - SNES, the 16-bit console (256×224, 15-bit
colour without dither), for the 16-bit space shooter; and NOKIA, the phone's
monochrome LCD (dark pixels on a green backlight, 84×48), for snake, which was
a phone game, not a Game Boy one. Checked on the real GPU (Intel UHD 630,
D3D11), muted: starfighter through SNES, snake through NOKIA, THE JOURNEY's
first card "1972–1981 / THE FIRST VIDEO GAMES", `?era=handheld` finding
1997–1999, no errors. At the phone's own 84×48 the snake barely read; the
owner's rule settled it - a homage, not an emulation, pleasant to today's eyes:
the NOKIA display draws at 160 lines, and an on pixel is dark on the green
backlight, so the snake the scene draws bright is dark, as on the phone. `npm test`
passes, twenty-one checks; the README's era section, scene labels, examples
and order, and the gallery, follow the spans.

The owner then set the rules the displays follow from here on, for the
catalogue to come - one display for each technology a scene simulates:

- **A display never lowers the picture.** It is a simulation for today's
  eyes, not an emulation: every display draws at full resolution (until now
  each drew at its machine's - 200 lines for the C64 and VGA, 144 for the
  handheld, 48 for the phone - and that lowered the product). Its own line
  count now only spaces its scan lines, an LCD's grid, a tape's jitter.
- **A CRT's effects only for what was seen on a CRT.** Each display says
  which kind of screen it is: CRT, LCD or flat. Scan lines, curvature, glow,
  colour fringes, grain and the vignette are drawn only for a CRT; the Game
  Boy's STN and the phone's LCD get their palettes and their grid, nothing of
  a tube; MODERN nothing.
- **A name that files nothing wrong.** 32-bit was many machines, and no scene
  is one of them precisely: the late-90s display is COMPOSITE TV - what it
  simulates - not PS1. SNES stays: the space shooter is that console's.

Checked on the real GPU (Intel UHD 630, D3D11), muted: the C64's dot tunnel
and the arcade's invaders sharp, in their palettes, behind their scan lines;
the snake through NOKIA and the dot tunnel through GAME BOY sharp, in their
greens, no tube; no errors. `npm test` passes; the gallery was made again.

## Sound boards

The owner's next: the sound boards should follow the scenes as the displays
do - a film with a better sound than a chip, a console game on its own, the
Windows things on a PC card - with a switch on AUTO. `src/core/boards.js`
holds four: HI-FI (the synthesizer's own voices, in full), PAULA, OPL3 FM and
AWE32 (the chips there were). A scene that needs a sound of its own names its
board: the films and the series, the 16-bit space shooter, the phone's snake
and the LCD game HI-FI (no chip here is theirs); the Amiga's ball PAULA, in the
8-bit decade; the desktop's card game and screensaver OPL3 FM, in the Amiga's
years. Every other scene plays on its era's, by the seed, as before. The style
stays the seed's and the era's.

The demo resolves its board with its scene and its era, and composes its music
for it; in AUTOPLAY and THE JOURNEY a track plays on its first scene's board -
it cannot change in the middle of a tune - and a forced board makes the
programme again, the same on the page and in the audio worklet. `C` live, the
menu's SOUND BOARD, `?board=`, and `--board` on the command line and in
renders. The music audit now measures a style on every board it is heard on:
its eras' chips and the boards of the scenes it plays with there.

Checked live (muted): kefrens on AUTO, `C` through HI-FI, PAULA and OPL3 FM,
the menu's row; THE JOURNEY with AWE32 forced, carrying on across tracks; no
errors. A new test: a film's music on HI-FI, the ball's on PAULA, an Amiga
effect's on its era's chip, a forced board winning, and a forced journey the
same at any block size; `npm test` passes, twenty-two checks.

Audited on every board each style is now heard on: nothing that passed fails;
the styles that meet a film's HI-FI (the 1997–1999 music, chiptune) peak a
little higher, within the limit; 13 of 28 styles still pass every check.

The README's scene table had two rows broken (a doubled cell divider before
echolines and timecar pushed their descriptions out of line); each scene now
names every era it plays in - read from the eras themselves, every example
command checked to be one of them - and the music heading counts twenty-eight.
| The logo, rendered as GitHub renders it | six lines of 74 characters, lined up |
| The gallery, rendered again | 46 stills and animations; their scrollers read SCENE |
| `npm test` | 17 checks pass |


## VHS, from how a tape records

The owner, on the VHS display: a band of noise rolled up the picture and looked
bad; find a better simulation. That band was a tracking fault - a tape played
on a deck whose heads do not follow its tracks - not how a VHS tape looks. The
display was rebuilt from how the format records, with the figures of ntsc-rs's
VHS emulation ([standard.rs](https://github.com/ntsc-rs/ntsc-rs/blob/main/crates/ntscrs/src/settings/standard.rs)):
at standard play the brightness is recorded up to 2.4 MHz and the colour,
"under" it, at only 320 kHz and four pixels late; the deck sharpens the
brightness back; the edges wave a little; the colour has blotchy noise and the
picture a fine grain and rare snow; and the heads switch over a few lines at
the bottom. Other sources agree on the bandwidths - about 240 lines of
brightness and about 30 of colour across the picture
([US patent 5751884](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5751884),
[videouniversity](https://www.videouniversity.com/?p=909),
[vhs-77](https://vhs-77.blogspot.com)).

The shader now, at full resolution as every display: the brightness blurred
over about 1/250 of the width and sharpened back against a wider blur (a light
halo on its edges); the colour blurred over about 1/30 of the width, delayed to
the right and a little washed out; each line shifted by a slow, smooth wave
(no per-frame jitter); slow colour blotches and a fine grain; the bottom 3%
torn sideways, more the lower, with noise. No tracking band. Checked live and muted on the real GPU (moonbike and timecar on
VHS): no errors, no band; the colour smears and lags off the bright shapes.
`npm test` passes; the gallery was made again.

The owner, looking at it: much better, but white dust now and then, coming down
from the top - take it out. It was the snow: its specks were hashed from the
line plus seven times the frame, so a speck drawn on one line came back seven
lines lower on the next frame, and fell down the picture. The grain and the
colour blotches carried the same fault, softer (one line a frame, and
diagonally). The snow is gone; every noise left is now drawn afresh each frame
(the cell hashed, then that with the frame), so nothing carries over. Checked
live and muted on the real GPU: timecar's sky shows only its own lights, in the
same places frame to frame; moonbike's stars show as short horizontal streaks,
a point of light as a tape smears it, and they stay where the scene puts them.

## What went wrong before that

1. **New seed (`S`) made the picture glitch** — reported by the owner.
   Instrumenting the synth nodes showed the cause: the old synth was
   disconnected but never stopped, so two synths kept reporting their
   positions into the same visual clock, ~2 s and ~4.5 s apart, and the
   picture jumped between them every frame. Fixed by telling the old synth to
   stop and ignoring anything still in flight; re-measured after three
   presses in a row: one synth reporting, no backward jumps.
2. **The `M` that opened the menu was typed into the seed field.** Caught on
   the first screenshot of the menu.
3. **The boot-screen font looked thin** next to the chunky C64 original, and
   **scale names printed as "HARMONICMINOR"** — both caught in rendered frames.
4. **Every render printed a misleading "404"** for a missing favicon; the
   filter meant to hide it never matched. Fixed at the source.
5. **The CHANGELOG listed six features as fixes** after an edit put a heading
   in the wrong place; and **regenerating the `.NFO` brought back two
   corrections** that had been made to the file instead of to its generator.
   Both found on re-reading, both fixed where they belong.
6. **A false alarm, checked rather than chased.** One screenshot after a
   music change showed the old tempo; re-measuring showed the page was right
   and the capture was an earlier frame.

## What was checked

| Check | Result |
|---|---|
| Every music style × two seeds, in 128- and 4096-sample blocks | no invalid samples, peaks ≈ −2 dBFS, RMS −10 to −15 dBFS, identical across block sizes |
| Real-time headroom (slowest style, happy hardcore) | 3.3× faster than real time |
| All seven styles back to back (`npm run sampler`) | silence only in the gaps between styles |
| Seeds spread over the styles | ~1,000 of 7,000 seeds per style |
| Boot screen, menu, every key, About and its return, `S` three times in a row | all working in a real browser, no console errors |
| Same seed, same mp4 (`npm test`) | two full renders byte-identical |

The music was checked by measurement, not by ear. Whether each style *sounds*
right is for a listener to judge; `npm run sampler` exists for that.

## Known limitations

- Rendering runs slower than real time under SwiftShader (~6× the clip length
  at 854×480); `--gpu` is faster but gives up cross-machine pixel identity.
- The tunnel's depth shading is flat, and the copper floor aliases near the
  bottom edge.
- Live mode assumes a 44.1 kHz audio device.
- The project is not under version control yet, which is why v0.1's exact
  source was not preserved.

## Token usage and cost, to 2026-10-28

Measured from the Claude Code session transcript, from the first v0.2
request to 2026-10-28 09:08 UTC. On 2026-10-29 the owner decided these
figures matter for v0.1 only: v0.2 is not measured further. Streamed chunks were counted once.

| Token type | Tokens | Price per MTok | Cost |
|---|---:|---:|---:|
| Input (uncached) | 744 | $4.00 | $0.00 |
| Output (incl. reasoning) | 591,557 | $20.00 | $11.83 |
| Cache write (1-hour TTL, 2× input) | 1,896,391 | $8.00 | $15.17 |
| Cache read | 201,565,818 | $0.20 | $40.31 |
| **Total** | **204,054,510** | | **$67.32** |

Anthropic first-party API list prices for Claude Opus 5.5. As in v0.1,
almost all of the volume is cache reads: each request re-sends the whole
conversation, served from the prompt cache at a twentieth of the input price.

## Before release

- Restart Claude Code so the v0.20.0 plugins load, and finish v0.2 with them.
- The music by ear: a stage of its own, going over the styles one by one with
  the owner (owner, 2026-10-29); `npm run sampler` plays them on their chips.
- Put the project under git at the v0.2 release (owner, 2026-10-29).
- Check the six other scenes that normalise palette colours the way that turned
  the chess scenes black (left by the owner's choice on 2026-10-29).
- Regenerate the gallery and the showcase, and run `npm test`.
