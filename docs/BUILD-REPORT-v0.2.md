# Build report — SEEDSCENE v0.2

> **In development.** v0.2 is being built a piece at a time from its plan
> ([PLAN-v0.2.md](PLAN-v0.2.md)). The usage figures below stop at
> 2026-10-28 09:08 UTC: on 2026-10-29 the owner kept them for v0.1 only.

v0.2 takes the v0.1 tool ([BUILD-REPORT-v0.1.md](BUILD-REPORT-v0.1.md)) and
turns it into **SEEDSCENE**: a name, a nostalgic front door, a live mode you
drive from the keyboard, an About part, eight eras of computing from the
1979 arcade to today with a journey through all of them, an endless AUTOPLAY
channel, thirty-eight scenes and twenty-four styles of music on the sound chips of their eras.

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
