# SEEDSCENE v0.2 — the plan

**Status: approved by the owner on 2026-10-28, all of it, for v0.2.** v0.1 is
history; v0.2 is the first release, and it has to be masterful. Everything in
this plan goes into it — as much as can be built — and later versions polish
it. The plan keeps being refined as new ideas come in; the order of the work
is in [section 8](#8-the-build-plan).

Everything the owner has given as inspiration since the project began, what
SEEDSCENE already does with it, and what it will do next: periods, sound
chips, music styles, the tracks each period plays, and visualizations.

Two rules hold for all of it:

- **Homages, never copies.** A sound, a look and a feeling, never a tune:
  every melody is written by the seed.
- **The kind of game, never its characters.** A blue blur racing down ramps
  without the hedgehog, a jumper on platforms without the plumber, a soldier
  without the franchise. Names, characters, levels and logos stay out.

- [1. The sources](#1-the-sources)
- [2. Inventory: each idea, and where it stands](#2-inventory-each-idea-and-where-it-stands)
- [3. Proposals: periods](#3-proposals-periods)
- [4. Proposals: music styles](#4-proposals-music-styles)
- [5. Proposals: tracks for each period](#5-proposals-tracks-for-each-period)
- [6. Proposals: visualizations](#6-proposals-visualizations)
- [7. Proposals: ways to watch](#7-proposals-ways-to-watch)
- [8. The build plan](#8-the-build-plan)
- [9. How it fits the app](#9-how-it-fits-the-app)
- [10. Risks, and the lessons already paid for](#10-risks-and-the-lessons-already-paid-for)
- [11. Decisions taken](#11-decisions-taken)

Effort: **S** about one round of work (one scene or one style), **M** two or
three, **L** a new system the rest stands on.

---

## 1. The sources

| When | What the owner gave |
|---|---|
| 2026-10-27 | `requeriments.txt`: a seed, a resolution and a style give a clip with music; real time, live in the browser; the look of 90s and 2000s demoscene productions. |
| 2026-10-28 | More varied, more frantic music, styles you can switch, presets with the fury of the demoscene; the Amiga scene and others. An About part. |
| 2026-10-28 | **The inspiration pack**: musical styles; classic Amiga trackmos; musicdisks; iconic effects; PC demo classics; console and handheld scenes; game soundtracks of the MOD era; modern visualizers; energy keywords; parties and archives. Every era, from the C64 to today. |
| 2026-10-28 | Game sounds and their eras: Pong, Space Invaders, Asteroids, Pac-Man, Arkanoid, each with a visualizer of its own; an AUTOPLAY that plays music and visuals of one era together, for hours. Film scores with a signature: Terminator, Alien. Tron's look. Pop and rock and roll. Catchy, energizing, memorable. |
| 2026-10-28 | The visuals move with the music, in 3D, with blur — not just the game redrawn. Snake; Punch-Out (NES and Wii); Star Fox and its music. |
| 2026-10-28 | Scenes cut on the music in AUTOPLAY, never the same sequence; a new track every 40 s, mixed into the next. |
| 2026-10-28 | Realistic game simulations: the loser of a point explodes on a key note; invaders and bricks die on the rhythm; Punch-Out's dodges and showing off, a see-through player; Tron's light walls and their speed. |
| 2026-10-28 | Music that sounds like the Amiga, DOS and the better sound cards — Sound Blaster 16, Sound Blaster 32, AWE — not like a C64. |
| 2026-10-28 | For later: racing games (Need for Speed, OutRun and others of the kind) and the music of The Matrix. |
| 2026-10-28 | **This plan, approved.** Fill the gap in the periods, build the styles, the sound chips of the new periods and the tracks of each period. More games, as concepts: platformers (a run-and-gun soldier like Metal Slug, a runner at full speed down ramps like Sonic, a jumper on platforms like Mario), plane shooters like 1945, a city builder like SimCity with a monster destroying it, hurricanes and earthquakes, helicopters; a first-person rollercoaster, in lines or in 3D, whichever hits harder. "Be creative." |
| 2026-10-28 | All of it goes into **v0.2**, which has to be masterful. Fill 2010 to 2024 and keep adding. More, as concepts: martial arts — the kung-fu corridor that marked an era, the arrival of Street Fighter II and Mortal Kombat, and the Mortal Kombat film's theme, a rhythm that brings it back; sports — the athletics games where you hammer the buttons to run and jump, motocross, basketball (shooting hoops, NBA Jam); Dance Dance Revolution, with feet hitting the arrows and a simulator that hits or misses the timing; Guitar Hero; pinball, its hits and launches on the music, effects on every bounce. |
| 2026-10-28 | Pirates: Monkey Island and Pirates of the Caribbean. The adventure games: Goblins, Day of the Tentacle and the other icons. Prince of Persia's sword duel; Pitfall; Pang, with balls bouncing all over the screen. "The list is long": scenes and visualizers that each bring back an era. "I keep giving ideas — take note." |
| 2026-10-28 | Asked for more ideas, then approved all of Claude's: two more periods (the 8-bit micros, the first phones), more games that marked an era, the home computer's screens, films and TV as concepts, the classic demo effects the pack did not name, seven styles, three ways to watch and the sounds between the tracks. |
| 2026-10-28 | A homage to Tennis for Two, the tennis game played on an oscilloscope; and the Addams Family, another great influence: visualizers and music inspired by them. |

---

## 2. Inventory: each idea, and where it stands

**Done** — SEEDSCENE has it. **Partly** — there is something, but not the
whole idea. **Not yet** — nothing covers it.

### Musical styles from the pack

| Idea | Where it stands |
|---|---|
| New Beat / Belgian techno | Done — `newbeat` (Amiga) |
| Early eurodance / hip-house | Done — `eurodance` (DOS, consoles) |
| Amiga tracker techno / rave | Done — `rave`, on Paula's samples |
| Hardcore / gabber | Done — `gabber` (DOS), `hardcore` (Y2K) |
| Ambient techno / IDM | Partly — `ambient` is the chill-out room; nothing has IDM's broken, glitchy rhythms |
| Chip / SID | Done — `chiptune` (C64), `gameboy` (handheld) |
| Orchestral tracker | Done — `orchestral` (Amiga), `midiquest` (DOS, consoles) |
| Breakbeat / jungle | Done — `jungle` (DOS) |
| Synthwave / retrowave | Done — `synthwave`, `dreamwave` (modern) |

### Amiga trackmos and musicdisks

| Idea | Where it stands |
|---|---|
| The trackmo itself: parts that follow the music | Done — THE JOURNEY, and AUTOPLAY cutting scenes on the bar |
| The Amiga palette of effects (copper, shadebobs, vector balls) | Done |
| Glenz vectors, the see-through solid | Partly — a glenz solid flies inside `starfield`; it is not a scene of its own |
| Kefrens bars, twisters, rotozoomers, the bouncing checkered ball | Not yet |
| Landscapes and voyages (the travelling trackmos) | Not yet |
| Dancers and silhouettes | Not yet |
| The musicdisk: a player you watch and listen to | Not yet — the closest is the sampler mp3 |
| Melodic tracker ballads, the musicdisk mood | Partly — `dreamwave` and `modjazz`; no slow melodic MOD ballad |

### Iconic effects

| Effect | Where it stands |
|---|---|
| Blobs / metaballs, plasma, starfield, tunnel, dot tunnel, copper bars, shadebobs, vector balls, water ripple, fireworks, sine scroller | Done |
| Raymarching, morphing shapes | Done — `morph` |
| 3D meshes, rotating objects | Partly — flat-shaded ships in `starfighter`, the glenz in `starfield` |
| Smoke / volumetric | Not yet |
| Feedback / trail effects | Partly — shadebobs' trails, the stage's blur; no image feeding back on itself |
| Lens flare / glow | Partly — glow everywhere, no flare |
| Parallax | Partly — the starfield's depth; no layered parallax |
| Motion blur | Done — on the 3D stage |

### PC demo classics

| Idea | Where it stands |
|---|---|
| The DOS look: VGA palette, fractals, plasma | Done — the DOS era |
| Second Reality's tricks: the lens, the rotozoomer, the city flyover | Not yet |
| The crystals and dreamlike 3D of the early 90s | Not yet |
| The 64k intro: a whole world from a few kilobytes | Partly — SEEDSCENE is all code; no procedural city or landscape |
| The Gravis Ultrasound, the demoscene's sound card | Not yet — DOS plays on OPL3 or AWE32 |

### Consoles and handhelds

| Idea | Where it stands |
|---|---|
| C64 | Done — its era, its boot screen |
| Game Boy / LSDJ | Done — the handheld era, `gameboy` |
| Atari ST / Falcon | Not yet — no era, no YM chip |
| SNES / Mega Drive | Not yet — the console era is 32-bit; no 16-bit chips |
| PlayStation | Partly — the console era, on wavetable |
| Dreamcast | Partly — the Y2K era stands near it |

### Game soundtracks of the MOD era

| Game | What it brings | Where it stands |
|---|---|---|
| Turrican, Apidya, Battle Squadron, R-Type | heroic shooters, driving and melodic | Done — `heroic`, `starpilot` |
| Shadow of the Beast | atmosphere: tribal drums, flutes, mystery | Not yet |
| Lotus | racing at full speed | Not yet |
| Agony | melancholy: piano, strings, a slow pulse | Not yet |
| Pinball Dreams / Fantasies | bouncy, bright, catchy | Not yet |
| Super Stardust | orchestral techno in space | Partly — `starpilot` |
| Alien Breed, Walker | dark, industrial | Partly — `derelict`, `cyborg` |
| Cannon Fodder, Lemmings | jolly, a march, a tune you whistle | Not yet |
| Xenon 2 | hip-hop breakbeat in a shooter | Not yet |

### Modern visualizers

| Idea | Where it stands |
|---|---|
| Shadertoy-style live shaders | Done — every scene is a shader |
| projectM / Butterchurn / MilkDrop | Not yet — no feedback-warp visualizer |
| Synesthesia, Magic, Plane9: audio-reactive 3D worlds | Partly — the 3D stage under the games |
| Touhou bullet hell | Not yet |
| Neon synthwave demos | Done — `outrun`, the modern era |

### Energy keywords

| Keyword | Where it stands |
|---|---|
| Full-energy trackmo, beat-synced everything, euphoric drops, pure rave, hypnotic loops, infinite tunnel, particles on the snare, morphing, CRT glow | Done |
| Dark ambient contrast | Partly — `derelict`; no dark scene to go with it |

### Games, films and pop (the owner's own list)

| Idea | Where it stands |
|---|---|
| Pong, Space Invaders, Asteroids, Pac-Man, Arkanoid | Done — `paddles`, `invaders`, `rocks`, `maze`, `bricks`, simulated, on the beat |
| Snake, Punch-Out, Star Fox | Done — `snake`, `boxer`, `starfighter` with `starpilot` |
| Tron | Done — `lightcycles`; no music of its own |
| Terminator, Alien | Done — `cyborg`, `derelict` |
| Pop, rock and roll | Done — `synthpop`, `rocknroll` |
| Racing: OutRun, Need for Speed, Lotus | Not yet — `outrun` is a sunset, not a road |
| The Matrix | Not yet |
| Parties: The Party, Assembly, Revision, Evoke | Not yet — no party atmosphere: a big screen, a crowd, a compo |
| Archives: Demozoo, Pouet, CSDb, ModArchive, Scene.org | Sources to search and listen to, not content: they feed the proposals below |

### The owner's second list of games

| Idea | Where it stands |
|---|---|
| Run-and-gun soldier (Metal Slug) | Not yet |
| A runner at full speed, down ramps and round loops (Sonic) | Not yet |
| A jumper on platforms (Mario) | Not yet |
| Plane shooters (1945) | Partly — `starfighter` flies on rails in 3D; nothing vertical, nothing over the sea |
| A city builder (SimCity) | Not yet |
| A monster destroying the city, hurricanes, earthquakes | Not yet |
| Helicopters | Not yet |
| A first-person rollercoaster | Not yet — the closest is `dottunnel`'s ride |

### The owner's third list

| Idea | Where it stands |
|---|---|
| The kung-fu corridor (Kung-Fu) | Not yet |
| Versus fighters (Street Fighter II, Mortal Kombat) | Partly — `boxer` is a fight on the beat; nothing with special moves, rounds and a versus screen |
| The fighting film's techno theme (Mortal Kombat) | Not yet — the closest is `gabber` and `trance` |
| Athletics, hammering the buttons (track and field) | Not yet |
| Motocross | Not yet |
| Basketball: shooting hoops, two-on-two (NBA Jam) | Not yet |
| Dance pads (Dance Dance Revolution) | Not yet |
| Guitar games (Guitar Hero) | Not yet |
| Pinball | Partly — `bricks` bounces a ball on the beat; there is no table, no flippers, no bumpers |
| The years from 2010 to 2024 | Not yet — one era, 2024, for fourteen years |

### The owner's fifth list

| Idea | Where it stands |
|---|---|
| Tennis for Two, the oscilloscope tennis of 1958 | Not yet — `paddles` is the 1972 game seen from above; nothing comes before 1979 |
| The Addams Family: the 60s series, the 90s films and their game and pinball table, the 2020s revival | Not yet — no gothic mansion, no harpsichord, no finger snaps |

### The owner's fourth list

| Idea | Where it stands |
|---|---|
| Pirates: the island adventure games (Monkey Island), the pirate films (Pirates of the Caribbean) | Not yet |
| The point-and-click adventures: Goblins, Day of the Tentacle and the rest | Not yet — no adventure era, no Roland MT-32, the sound card those games were scored for |
| Prince of Persia's sword duel | Not yet — `boxer` is the only duel |
| Pitfall | Not yet — no Atari 2600 era |
| Pang: balls bouncing everywhere, split by a harpoon | Partly — `rocks` splits what it hits; nothing bounces |
| "The list is long": other games that marked an era | Not yet — see the classics proposed below: the walkers, the bomber grid, the cinematic chase, the gallery shooter |

### What the inventory says

- The pack's **musical styles** are all covered.
- The **game soundtracks** are half covered. What's missing are the moods that aren't heroic: atmosphere, melancholy, bounce, a march, hip-hop.
- The **effects** are mostly covered. The well-known Amiga tricks are missing (Kefrens bars, rotozoomer, glenz, the checkered ball), and so is anything that feeds back on itself (MilkDrop).
- The **periods** have one hole each between 1985 and 1993: the Atari ST, the Mega Drive and the SNES, and the Gravis Ultrasound.
- Racing and The Matrix are entirely open.
- The owner's second list is entirely open, and it points at two more
  periods: the arcade of the 90s, where the run-and-gun and plane shooters
  lived, and the years of the browser and indie games, the newest nostalgia
  for younger players.
- The owner's third list — fighting, sports, rhythm games, pinball — is open
  too, and with the years since 2002 it asks for three more periods: the
  rhythm games of 2005, the festivals of 2014, lo-fi and vaporwave in 2017.
- The fourth list — pirates, adventures, the classics — asks for two more:
  the point-and-click adventures of 1990, on the Roland MT-32, and the
  woodgrain console of 1981, the Atari 2600 that Pitfall ran on.

---

## 3. Proposals: periods

Today there are eight eras. Eleven more close the gaps: three the inventory
found, one brings the turn of the century home, two came with the owner's
second list, three fill the years since 2002, two came with the fourth, and
two more are Claude's, approved with the rest, and one opens the timeline
before the arcades.

| # | Period | Sound | Its scenes | Its music | Effort |
|---|---|---|---|---|---|
| P1 | **Atari ST, 1987** — the scrolltext and fullscreen demos | **YM2149**: three square channels, noise, the hardware envelope used as a buzzing bass | big sine scrollers over rasters, Kefrens bars, a twister, starfield | `chiptune`-like but buzzier; a new `stchip` style | M |
| P2 | **16-bit console, 1991** — Mega Drive and SNES | by the seed: **YM2612** (Mega Drive: six FM voices, a slap bass, a sampled drum) or **SPC700** (SNES: eight sampled voices, soft interpolation, the echo) | runner (new), jumper (new), the racer (new), helicopter (new), rotozoomer (Mode 7, new), `starfighter`, `boxer` | `speedzone`, `jumpworld`, `coastline`, `chopper`, `pinball` (new); `heroic`, `starpilot` | L |
| P3 | **DOS demo party, 1993** — the Gravis Ultrasound | **GUS**: 32 voices of interpolated samples, clean and wide; joins OPL3 and AWE32 as a third card the seed can pick | the lens, glenz, crystals, the city builder, the raycaster corridor (new) | `idm`, `zoning`, `kaiju` (new); `rave`, `ambient`, `jungle` | M |
| P4 | **The media player, 2001** — Winamp, MilkDrop, the first MP3s | the synthesizer's own voices, through a gentle "MP3" band-limit | the MilkDrop channel, code rain, the rollercoaster (new) | `bigbeat`, `lobby`, `coaster` (new); `trance` | M |
| P5 | **Arcade, 1995** — the Neo Geo and the shooter cabinets | **YM2610**: four FM voices, three squares and sampled drums that hit hard | run-and-gun, plane shooter, versus fighter, tournament, hoops (new); `boxer`, the racer | `brigade`, `squadron`, `versus`, `kombat`, `courtjam` (new); `fmmetal`, `heroic` | M |
| P6 | **Flash and indie, 2010** — browser games, the pixel-art revival, the rhythm runners | the synthesizer's own voices with a bit-crushed chip layer: chiptune over a modern low end | rhythm runner, blocks (new); jumper, `snake` | `indiechip`, `wobble`, `electroswing` (new) | M |
| P7 | **Lo-fi and vaporwave, 2017** — beats to study to, the mall at dusk | the synthesizer's own voices on a worn tape: wow and flutter, crackle, a soft top end | rainy window, vapor plaza (new); `ripple`, `outrun` | `lofi`, `vapor` (new); `dreamwave` | M |
| P8 | **Rhythm games, 2005** — the dance pads and the plastic guitars | the synthesizer's own voices, mastered loud and bright, as the discs were | dance pad, note highway (new); the racer at night | `eurobeat`, `arenarock` (new); `trance`, `hardcore` | M |
| P9 | **Festival and mobile, 2014** — the main stages and the games you tapped | the synthesizer's own voices, with the side-chained pump of the festival sound | festival stage, tap flyer (new); rhythm runner | `bigroom` (new); `wobble`, `trance` | M |
| P10 | **Adventure games, 1990** — point and click: pirates, mansions, goblins, the desert palace | by the seed: **Roland MT-32** (LA synthesis: a sampled attack on a synthesized body, its own reverb — the card the adventures were scored for), **AdLib** (the OPL3's older sister) or, rarely, the **PC speaker** | pirate duel, treasure island, time-split mansion, three helpers, sword duel, cinematic chase (new) | `calypso`, `toon`, `whimsy`, `persia` (new); `midiquest` | L |
| P11 | **Woodgrain console, 1981** — the Atari 2600 | **TIA**: two voices whose pitches come out famously out of tune, and buzzy noise | jungle runner, gallery shooter (new); `paddles`, `invaders`, `rocks` | `vcs` (new); `arcade` | S |
| P12 | **8-bit micros, 1985** — the MSX and the ZX Spectrum, many people's first computer in Spain and Latin America | by the seed: **AY-3-8910** (three squares and noise) or the Spectrum's one-bit **beeper** | loading screen (new); bomber grid, jungle runner | `micro` (new); `chiptune` | S |
| P13 | **Phones, 2003** — the first mobile games, before the smartphone | a **monophonic ringtone** buzzer, then the **polyphonic ringtone** synth | phone screen, LCD handheld, virtual pet (new); `snake` | `ringtone` (new); `gameboy` | S |
| P14 | **The first screens, 1958** — a tennis game on a laboratory oscilloscope, the first space duel on a vector scope, the gothic family on a black-and-white television | **Lab oscillators**: pure sine and square test tones, a tape echo, a theremin-like glide, a ring modulator | oscilloscope tennis, XY scope, space duel, haunted mansion (new) | `labtones`, `scope`, `gothic` (new) | M |

Existing eras also take the new material where it belongs: the 1979 arcade
the racer, the missile defense, the rollercoaster in lines, the kung-fu
corridor, the athletics and the motocross; the 16-bit console the versus
fighter and the hoops; the Amiga the pinball table; the Amiga the
Kefrens bars, the ball and the landscape; DOS the city builder and its
disasters; the 32-bit console the rollercoaster in 3D; the handheld the
blocks; Y2K the code rain; the modern era the MilkDrop channel, the bullet
hell, the rhythm runner and the rollercoaster at night.

The pirates also sail in other eras: the films' swashbuckling orchestra in
Y2K and the modern era, the sea-shanty revival of 2021 in the modern era;
the bouncing balls in the 1995 arcade and on the 16-bit consoles; the walkers
and the cinematic chase on the Amiga; the bomber grid on the 16-bit consoles
and the handheld.

The rest of the classics go where they were played: the vector tube, the
wireframe tank, the road crossing, the pyramid hopper, the time car and the
scanner car in the 1979 arcade; the football match on the Amiga and the
16-bit consoles; the kart race on the 16-bit and 32-bit consoles; the
skate park, the footsteps and the anime opening on the 32-bit console; the
behind-view shooter in the 1995 arcade; the cartoon castle with the
adventures; the artillery, the screensavers, the ANSI board and the fire in
DOS; the cracktro and the demo effects on the Amiga and at the DOS party;
the card cascade in the media-player years; the DJ decks with the rhythm
games; the moon bike in the modern era.

The gothic family comes back in three ages, as it did: the haunted mansion on
the black-and-white set of 1958's era; the haunted levels of the jumper and a
haunted pinball table in the early 90s, when the films, their game and the
best-selling pinball table came out; and the stiff gothic dance in a ballroom
in the modern era, the one a new generation learned in the 2020s. The
oscilloscope's phosphor comes back in the 1979 arcade, and the XY scope in
the modern era.

With them the timeline reads: 1958 first screens · 1979 arcade · 1981 woodgrain console ·
1982 C64 · 1985 8-bit micros · 1987 Atari ST · 1990 Amiga ·
1990 adventure games · 1991 16-bit console · 1993 DOS party · 1994 DOS ·
1995 arcade · 1997 32-bit console · 1998 handheld · 2001 media player ·
2002 Y2K · 2003 phones · 2005 rhythm games · 2010 Flash and indie ·
2014 festival and mobile · 2017 lo-fi and vaporwave · 2024 modern.
Twenty-two eras: a prologue in 1958, then, from 1979 on, no gap longer than
seven years.

---

## 4. Proposals: music styles

Each proposal names the referent it is a homage to, the elements that make it
recognizable, and the era and sound chip it would play on.

### Racing (the owner's latest inspiration)

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `coastline` **Coastline Fusion** | OutRun's beach-side radio | latin-fusion jazz-funk: a slap bass, brass stabs, a bright lead, congas and timbales, major-seventh chords, 130–150 bpm | 16-bit console · YM2612; arcade · native FM | M |
| `turbo` **Turbo Techno** | the Lotus games on the Amiga | driving tracker techno at 150+, a pumping octave bass, a pitch-bending lead like an engine | Amiga · Paula | S |
| `nitro` **Nitro Rock** | Need for Speed's first years | rock guitars over a breakbeat, a synth riff, a drop into a chase | DOS · AWE32; 32-bit console | S (the guitar exists) |
| `underground` **Night Street** | the street-racing years of the 2000s | dark electro, a sub bass, a half-time beat, a vocal-chop lead | Y2K, modern | M |

### The Matrix

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `lobby` **Lobby Breaks** | the slow orchestral breakbeat of the film's lobby and club | a heavy, slow breakbeat (95–105), strings and a sombre piano, a brooding bass, a choir rising | media player; modern | M |
| `bigbeat` **Big Beat** | the film's chase music, and the late-90s big-beat sound | breaks at 125–135, a distorted acid bass, sirens, a stab riff, a scratch | media player; Y2K | M |

### From the pack's game soundtracks

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `beast` **Beast Lands** | Shadow of the Beast | tribal toms in a slow 6/8, a pan flute, a bowed drone, a mysterious minor | Amiga · Paula | S |
| `agony` **Lament** | Agony | a slow piano over strings, a lonely lead, rain-like noise | Amiga · Paula; DOS · GUS | S |
| `pinball` **Pinball Fever** | Pinball Dreams and Fantasies | bouncy techno-pop at 130, a clavinet riff, bells, a chorus that hits | Amiga; 16-bit console | S |
| `march` **Jolly March** | Cannon Fodder and Lemmings | a march: snare rolls, a tuba bass, a whistled lead, then a dance beat under it | Amiga; handheld | S |
| `bomb` **Hip-Hop Blaster** | Xenon 2 | a slow hip-hop break, scratches, a stab, a rap-like chopped lead (no voice) | Amiga · Paula | S |
| `industrial` **Steel Works** | Alien Breed and Walker | a metallic loop in 4/4, a grinding bass, hammer hits, sirens | DOS; 32-bit console | S |

### From the pack's styles and scenes

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `idm` **Glitch** | the IDM of the early 90s | broken beats that stutter and reverse, granular blips, a warm pad underneath | DOS · GUS; modern | M |
| `ballad` **Musicdisk Ballad** | the melodic tracker tunes of the musicdisks | a slow 4-channel ballad: a vibrato lead, an arpeggio, a soft beat — the tune you play twice | Amiga · Paula | S |
| `stchip` **ST Buzz** | the Atari ST demos | YM squares, the buzzer bass, fast arpeggios, a digi-drum | Atari ST · YM2149 | S (with the chip) |
| `grid` **Grid Symphony** | Tron, then and now | orchestra and synth together: a pulsing synth bass, big brass, a heroic theme over an arpeggio | modern; 32-bit console | M |
| `neonnoir` **Neon Noir** | the 80s sci-fi film score of rain and neon | slow, lush brass pads, a long reverb, a lonely lead, a distant drum | modern; arcade | S |
| `italo` **Italo Disco** | the 80s Italian dance hits next to synth-pop | an octave bass at 120, a vocoder-like lead, hand claps, a big chorus | C64 · SID; arcade | S |
| `powerballad` **Stadium Ballad** | 80s rock ballads | a gated-reverb snare, an overdriven guitar, a piano, a key change for the last chorus | 32-bit console; modern | S |

### Platforms, planes, cities and rides (the owner's second list)

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `speedzone` **Speed Zone** | the 16-bit runner at full speed | a bright FM lead over a funky slap bass, brass stabs, a sampled snare, 150–170 bpm, a key change when the phrase loops | 16-bit · YM2612 | S |
| `jumpworld` **Jump World** | the platform jumper's overworld | a bouncy major tune, a calypso-like bass, steel-drum and whistle leads, a light swing; a minor variant for the underground levels | 16-bit · SPC700; arcade 1979 · 2A03 | S |
| `brigade` **Bullet Brigade** | the run-and-gun soldier games | a military snare and brass over a funky bass, a big-band hit on every explosion, 140 bpm | arcade 1995 · YM2610 | S |
| `squadron` **Squadron** | the vertical plane shooters of the 40s | a brass march played as rock, a fast snare, a heroic lead, an air-raid siren before the boss | arcade 1995 · YM2610; arcade 1979 · 2A03 | S |
| `chopper` **Rotor** | the helicopter missions | a rotor-like sixteenth pulse, a tense synth bass, war drums, a rock guitar when the attack starts | 16-bit · YM2612; DOS | S |
| `zoning` **Zoning Jazz** | the calm of the city builders | smooth jazz: a brushed beat, a walking bass, an electric piano, a soft sax-like lead | DOS party · GUS; DOS · AWE32 | S (built on `modjazz`) |
| `kaiju` **Monster Alert** | the monster films and their sirens | taiko and timpani, a low brass march, sirens, a choir when the monster stands up | DOS; 32-bit console | S |
| `coaster` **Fairground Rush** | the theme-park games and the ride itself | a fairground organ climbing with the lift hill, a rave break on the drop, then the organ again | media player; 32-bit console; modern | S |
| `indiechip` **Pixel Revival** | the chiptune of the indie years | chip leads and arpeggios over a modern sub bass and a crisp kit | Flash and indie | S |
| `wobble` **Wobble** | the bass music of the early 2010s | a half-time beat at 140, a bass that wobbles with the bar, a long build and a heavy drop | Flash and indie; modern | M |
| `electroswing` **Electro Swing** | the swing revival of the browser years | a swing beat over a house kick, brass stabs, a walking bass, a clarinet-like lead | Flash and indie | S |

### Fighting, sports and rhythm (the owner's third list)

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `kungfu` **Dragon Steps** | the kung-fu corridor of the 80s arcades | a pentatonic chip lead, a marching snare, a gong at each floor, faster as the boss nears | arcade 1979 · 2A03 | S |
| `versus` **Stage Select** | the stage themes of the 90s versus fighters | a funky slap bass, brass stabs, a catchy lead over a shuffling beat, a sting for each round | arcade 1995 · YM2610; 16-bit · YM2612 | S |
| `kombat` **Tournament Techno** | the techno of the 90s fighting films | a pounding kick at 140, a stabbing synth riff in a minor key, a gong, shouts turned into vocal-like synth hits; the rhythm and the rush, never the riff | arcade 1995; 32-bit console; media player | S |
| `olympic` **Stadium Fanfare** | the athletics games you played by hammering the buttons | a brass fanfare at the start, a galloping chip beat that speeds up with the race, a jingle for the record | arcade 1979 · 2A03 | S |
| `dirt` **Dirt Track** | the motocross games | punk-rock drive: a buzzing bass, a lead that revs like an engine, a crash cymbal on every landing | arcade 1979 · 2A03; 32-bit console | S |
| `courtjam` **Court Jam** | the 90s arcade basketball | a hip-house beat, crowd-chant stabs, a scratch on every dunk, a horn at the buzzer | arcade 1995 · YM2610; 16-bit | S |
| `eurobeat` **Eurobeat** | the dance games' and the street racers' 2000s | 150–160 bpm, a galloping octave bass, a brassy synth lead, big stabs, a key change for the last chorus | rhythm games 2005; Y2K | S |
| `arenarock` **Arena Rock** | the guitar games' setlists | big drums, power chords, a shredding solo on the bridge, the crowd roaring on the drop | rhythm games 2005; 32-bit console | S (the guitar exists) |

### The years since 2010

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `bigroom` **Main Stage** | the festival sound of 2014 | a big-room kick, a long build with a snare roll, a one-note drop, the whole mix pumping on the kick | festival 2014; modern | S |
| `lofi` **Lo-fi Beats** | beats to study to | a dusty, swung beat at 75–90, jazz chords on soft keys, vinyl crackle, a tape that wobbles | lo-fi 2017 | S |
| `vapor` **Mall Dusk** | vaporwave | smooth 80s chords slowed down and drenched in chorus and reverb, a slowed groove, a dreamy echo | lo-fi 2017 | S |

### Pirates, adventures and the classics (the owner's fourth list)

The famous themes of these games and films are never quoted: what comes
back is their instruments, their scales and their rhythm. The tune is the
seed's.

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `calypso` **Grog Harbor** | the Caribbean of the island adventure games | a reggae skank on the off-beats, steel drums and marimba, a lazy walking bass, a whistled lead — a harbour at night | adventure 1990 · MT-32 / AdLib | S |
| `highseas` **High Seas** | the swashbuckling scores of the pirate films | an orchestra in a driving 6/8: a cello ostinato, horns, war drums, a choir on the drop, the storm in the strings | Y2K; modern | M |
| `shanty` **Shanty Night** | the sea-shanty revival of 2021 | stomps and claps, a call-and-response lead, a deep voice-like bass, an accordion and a fiddle | modern | S |
| `toon` **Cartoon Caper** | the cartoon adventures of the 90s | zany ragtime: a stride piano, pizzicato, a bassoon, a xylophone, a slide whistle, sudden changes of tempo | adventure 1990 · MT-32 | S |
| `whimsy` **Goblin Mischief** | the whimsical puzzle adventures | a wonky waltz on a music box, bassoon and tuba, odd little percussion, a stop and a giggle-like trill | adventure 1990 · MT-32 / AdLib | S |
| `persia` **Desert Duel** | the palace-and-dungeon adventures of the desert | the Hijaz scale, darbuka and frame drums, an oud-like pluck, a ney-like flute; the drums tighten when the swords come out | adventure 1990 · AdLib / PC speaker; Amiga | S |
| `vcs` **Woodgrain** | the Atari 2600's music | two buzzing voices slightly out of tune, a noise drum, a march you played on a joystick | woodgrain 1981 · TIA | S |

### Claude's additions (approved 2026-10-28)

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `keygen` **Keygen** | the chiptunes of the crack intros | XM-tracker chip music: fast arpeggios, a squelchy lead, a bouncing bass | media player; DOS party · GUS | S |
| `skatepunk` **Skate Punk** | the skateboarding games | fast punk at 190, ska upstrokes, a synth lead like a shouted chorus | 32-bit console | S |
| `terrace` **Terrace Drums** | the football crowds of Latin America and Europe | big bass drums and snares in a march, trumpets, the crowd's chant turned into a synth lead | Amiga; 16-bit console; modern | S |
| `animeop` **Anime Opening** | the 90s anime openings | fast J-rock with brass, a key change before the last chorus, a big sing-along lead | 32-bit console | S |
| `triphop` **Trip-Hop** | the 90s Bristol sound | a slow, heavy break, a deep bass, a dark string, scratches | DOS 1994; media player | S |
| `micro` **Micro** | the MSX and Spectrum music | three AY squares, fast arpeggios, a beeper drum | 8-bit micros · AY / beeper | S |
| `ringtone` **Ringtone** | the first phone ringtones | a tune you could type into the keypad, then the same in polyphony | phones · ringtone chips | S |

### The first screens and the gothic family (the owner's fifth list)

| Style | Homage to | What makes it | Era · chip | Effort |
|---|---|---|---|---|
| `labtones` **Lab Tones** | the electronic music of the 50s laboratories, next to the first oscilloscope game | pure sine and square tones, a tape echo, a theremin-like glide, ring-modulated bleeps over a slow pulse | first screens · lab oscillators | S |
| `scope` **Scope Music** | oscilloscope music, where the sound draws the picture | pure tones in simple ratios so the left-right figure holds still and turns; the bass pulls the shape, the chords bloom it | first screens; modern | M |
| `gothic` **Gothic Snaps** | the gothic family's series and films | a harpsichord riff, finger snaps on two and four, a walking bass, a spooky organ, a theremin wail — the sound of the theme, never its tune | first screens; 16-bit console; Amiga | S |
| `psychobilly` **Graveyard Rockabilly** | the garage punk the 2020s gothic dance brought back | a twangy slapback guitar, a slapped upright bass, a tom-heavy beat, a scream of feedback | modern | S |

### Sound chips the new periods would bring

| Chip | Where | What it adds | Effort |
|---|---|---|---|
| YM2149 (Atari ST) | P1 | squares, noise, the envelope buzzer | S |
| YM2612 (Mega Drive) | P2 | four-operator FM — brighter and punchier than the OPL3 | M |
| SPC700 (SNES) | P2 | soft-interpolated samples and the echo: a warmer Paula | M |
| GUS (DOS) | P3 | clean interpolated samples, wide and in stereo | S (built on Paula's sampler) |
| 2A03 (NES) | arcade, handheld | two pulses, a triangle bass, noise, a sampled kick | S |
| YM2610 (Neo Geo) | P5 | four FM voices and sampled drums: the hard-hitting arcade of the 90s | M (built on the YM2612) |
| Roland MT-32 | P10 | LA synthesis: the sampled attack of a real instrument on a synthesized body, and its own reverb — the adventure games' orchestra | M |
| AdLib (OPL2) | P10 | the OPL3's older sister: two operators, four waveforms, mono | S (on the OPL3) |
| PC speaker | P10 | one square wave, arpeggios faster than the ear can split, the click of the first PC games | S |
| TIA (Atari 2600) | P11 | two voices on coarse dividers, out of tune by design, buzzy noise | S |
| AY-3-8910 | P12 | three squares, noise, an envelope: the MSX's sound and the later Spectrums' | S |
| Spectrum beeper | P12 | one bit, played so fast it makes chords and drums | S |
| Monophonic ringtone | P13 | one square-ish buzzer voice, a little tinny speaker | S |
| Polyphonic ringtone | P13 | a small FM/wavetable synth in a phone: four voices, bright and boxy | S |
| Lab oscillators | P14 | sine and square test-tone generators, a tape echo, a ring modulator: the laboratory before the chips | S |
| Tape (not a chip) | P7 | wow and flutter, crackle, a worn top end, over the synthesizer's own voices | S |

---

## 5. Proposals: tracks for each period

A **track** here is a named piece, a style plus a mood and a scene to go
with it. These are the theme tunes each period carries: written by the seed
every time, always with the same intent. In AUTOPLAY and THE JOURNEY a
period plays its tracks with their scenes; the names show on the "now
playing" card. 136 tracks across the twenty-two periods.

| Period | Track | Style | Mood | Scene |
|---|---|---|---|---|
| First screens 1958 | *Lab Court* | `labtones` | the laboratory open day, a crowd round the scope | oscilloscope tennis |
| First screens 1958 | *Lissajous* | `scope` | the figure turning on the green screen | XY scope |
| First screens 1958 | *Orbit* | `labtones` | two ships round a star | space duel |
| First screens 1958 | *Snap Twice* | `gothic` | a mansion on a black-and-white set | haunted mansion |
| Arcade 1979 | *Insert Coin Overture* | `arcade` | the attract mode calling you over | `invaders` |
| Arcade 1979 | *Rain on the Grid* | `neonnoir` | 1982 sci-fi, at night | `lightcycles` |
| Arcade 1979 | *First Lap* | `coastline` (2A03) | the first driving games | racer |
| Arcade 1979 | *Last City Standing* | `squadron` (2A03) | missiles falling on six cities | missile defense |
| Arcade 1979 | *Vector Ride* | `arcade` | a ride drawn in glowing lines | rollercoaster (lines) |
| Arcade 1979 | *Dragon Floor* | `kungfu` (2A03) | five floors to the top of the temple | kung-fu corridor |
| Arcade 1979 | *Hundred Meters* | `olympic` (2A03) | hammer the buttons, beat the record | athletics |
| Arcade 1979 | *Dirt Jump* | `dirt` (2A03) | the ramp, the air, the landing | motocross |
| Arcade 1979 | *Down the Tube* | `arcade` | the claw on the rim, the tube glowing | vector tube |
| Arcade 1979 | *Green Radar* | `arcade` | a tank in a wireframe valley | wireframe tank |
| Arcade 1979 | *Rush Hour* | `arcade` | five lanes of traffic and a river | road crossing |
| Arcade 1979 | *Cube Colors* | `arcade` | every cube a new colour | pyramid hopper |
| Arcade 1979 | *Time Machine* | `synthpop` | the speedometer climbing, then the light | time car |
| Arcade 1979 | *Red Scanner* | `synthpop` | a black car on an empty highway | scanner car |
| Arcade 1979 | *Phosphor* | `arcade` | the oscilloscope game, twenty years on | oscilloscope tennis |
| Woodgrain console 1981 | *Vine Swing* | `vcs` (TIA) | the jungle, the vine, the crocodiles below | jungle runner |
| Woodgrain console 1981 | *Cartridge* | `vcs` (TIA) | the cartridge clicks in, the game starts | `paddles` |
| Woodgrain console 1981 | *Target Range* | `arcade` (TIA) | the plastic gun, the cans on the fence | gallery shooter |
| C64 1982 | *Ready Run* | `chiptune` | the moment after RUN | `copper` |
| C64 1982 | *Disco Sprite* | `italo` (SID) | the dance floor of the 80s | `plasma` |
| 8-bit micros 1985 | *Loading* | `micro` (AY) | the tape turning, the picture drawn line by line | loading screen |
| 8-bit micros 1985 | *Bomb Squad* | `micro` (beeper) | one bit and a lot of bombs | bomber grid |
| 8-bit micros 1985 | *Jungle Tape* | `micro` (AY) | the jungle loaded from cassette | jungle runner |
| Atari ST 1987 | *Fullscreen* | `stchip` | the border broken | sine scroller |
| Atari ST 1987 | *Buzzer Beat* | `stchip` | the demo menu | Kefrens bars |
| Amiga 1990 | *Rave of the Art* | `rave` | the party at 3 a.m. | vector balls |
| Amiga 1990 | *Beast Lands* | `beast` | the long walk under a purple sky | landscape |
| Amiga 1990 | *Lament* | `agony` | the quiet part of the demo | water ripple |
| Amiga 1990 | *Bumper* | `pinball` | the table lights up | pinball |
| Amiga 1990 | *Multiball* | `pinball` | three balls at once on the drop | pinball |
| Amiga 1990 | *Turbo* | `turbo` | top speed, split screen | racer |
| Amiga 1990 | *Second Disk* | `ballad` | the musicdisk you kept | musicdisk player |
| Amiga 1990 | *Blaster* | `bomb` | the shooter with a beat | starfield |
| Amiga 1990 | *Little Army* | `march` | a column of tiny soldiers on the hill | run-and-gun |
| Amiga 1990 | *Save Them All* | `march` | a hundred little walkers and one exit | walkers |
| Amiga 1990 | *Escape* | `derelict` | a stranger world, the beast behind you | cinematic chase |
| Amiga 1990 | *Moiré* | `newbeat` | two rings passing through each other | interference rings |
| Amiga 1990 | *Jelly Cube* | `rave` | the cube that wobbles | rubber vector |
| Amiga 1990 | *Infinity Bob* | `dreamwave` | one sprite, drawn forever | unlimited bobs |
| Amiga 1990 | *Zoom Board* | `turbo` | the board turning beneath you | chessboard zoomer |
| Amiga 1990 | *Wing Play* | `terrace` | down the wing, the cross, the header | football match |
| Amiga 1990 | *Haunted Table* | `gothic` | the best-selling table of them all | haunted table |
| Adventure games 1990 | *Grog Harbor* | `calypso` (MT-32) | the harbour at night, the swords out | pirate duel |
| Adventure games 1990 | *X Marks the Spot* | `calypso` (AdLib) | the map, the dotted line, the shovel | treasure island |
| Adventure games 1990 | *Mansion Time* | `toon` (MT-32) | one house, three centuries, a lot of plumbing | time-split mansion |
| Adventure games 1990 | *Goblin Work* | `whimsy` (MT-32) | three little helpers, one big puzzle | three helpers |
| Adventure games 1990 | *Desert Duel* | `persia` (AdLib) | the dungeon, the guard, the clock running | sword duel |
| Adventure games 1990 | *Sixty Minutes* | `persia` (PC speaker) | one hour to save her | sword duel |
| Adventure games 1990 | *Trapdoor* | `toon` (MT-32) | the right move, or the trapdoor | cartoon castle |
| 16-bit console 1991 | *Coastline* | `coastline` (YM2612) | the beach road, the radio on | racer |
| 16-bit console 1991 | *Speed Zone* | `speedzone` (YM2612) | down the ramp, round the loop | runner |
| 16-bit console 1991 | *World One* | `jumpworld` (SPC700) | the first level, a sunny day | jumper |
| 16-bit console 1991 | *Underground* | `jumpworld` (SPC700, minor) | the level below the level | jumper |
| 16-bit console 1991 | *Mode Seven* | `heroic` (SPC700) | flying low over a world | rotozoomer |
| 16-bit console 1991 | *Rotor* | `chopper` (YM2612) | the desert at dawn | helicopter |
| 16-bit console 1991 | *Title Fight* | `starpilot` | the bell rings | `boxer` |
| 16-bit console 1991 | *World Warrior* | `versus` (SPC700) | a fighter from every corner of the map | versus fighter |
| 16-bit console 1991 | *Short Fuse* | `jumpworld` (YM2612) | the bombs, the grid, the blast | bomber grid |
| 16-bit console 1991 | *Derby Day* | `terrace` (YM2612) | the stands full, the derby on | football match |
| 16-bit console 1991 | *Kart Cup* | `jumpworld` (SPC700) | eight karts and a banana | kart race |
| 16-bit console 1991 | *Mansion Run* | `gothic` (SPC700) | the house of a hundred doors | jumper (haunted levels) |
| DOS party 1993 | *Big Screen* | `rave` (GUS) | the big screen at the party | lens |
| DOS party 1993 | *Crystal Sleep* | `ambient` (GUS) | the crystal part | crystals |
| DOS party 1993 | *Glitch Room* | `idm` | the hall gone dark | MilkDrop channel |
| DOS party 1993 | *Zoning Board* | `zoning` (GUS) | the city grows, block by block | city builder |
| DOS party 1993 | *Greetings To* | `keygen` (GUS) | the logo, the scroller, the friends | cracktro |
| DOS party 1993 | *Emboss* | `rave` (GUS) | a light circling the logo | bump-mapped logo |
| DOS 1994 | *Monster Alert* | `kaiju` | the monster wades in from the bay | city builder: the monster |
| DOS 1994 | *Eye of the Storm* | `industrial` | the hurricane makes landfall | city builder: the storm |
| DOS 1994 | *Fault Line* | `kaiju` | the ground opens under the grid | city builder: the earthquake |
| DOS 1994 | *Corridor* | `fmmetal` | first person, the dark, the door ahead | raycaster |
| DOS 1994 | *Steel Works* | `industrial` | the base under attack | `fireworks` |
| DOS 1994 | *Nitro* | `nitro` | the police behind you | racer |
| DOS 1994 | *Incoming* | `march` | two teams, one hill, a lot of craters | artillery |
| DOS 1994 | *Pipes* | `triphop` | the office empty, the screen still going | screensavers |
| DOS 1994 | *2400 Baud* | `keygen` | the board loading, line by line | ANSI board |
| DOS 1994 | *Burning Logo* | `gabber` | the flames and the name in them | fire |
| Arcade 1995 | *Front Line* | `brigade` (YM2610) | the tanks roll in | run-and-gun |
| Arcade 1995 | *Squadron 45* | `squadron` (YM2610) | the sky over the sea, the big bomber | plane shooter |
| Arcade 1995 | *Round One* | `fmmetal` (YM2610) | two fighters face off | `boxer` |
| Arcade 1995 | *Stage Select* | `versus` (YM2610) | the map, the flight, the next opponent | versus fighter |
| Arcade 1995 | *Tournament* | `kombat` | the island, the torches, the gong | tournament |
| Arcade 1995 | *On Fire* | `courtjam` (YM2610) | three in a row and the net burns | hoops |
| Arcade 1995 | *Burst* | `pinball` (YM2610) | balls bouncing round a famous skyline | bouncing balls |
| Arcade 1995 | *Checkerboard Sky* | `heroic` (YM2610) | running over the endless checkers | behind-view shooter |
| 32-bit console 1997 | *Stadium* | `powerballad` | the credits roll | `starfield` |
| 32-bit console 1997 | *Grid Symphony* | `grid` | the world inside the computer | `lightcycles` |
| 32-bit console 1997 | *Lift Hill* | `coaster` | click, click, click — then the drop | rollercoaster (3D) |
| 32-bit console 1997 | *Mud Season* | `dirt` | the stadium track, the triple jump | motocross |
| 32-bit console 1997 | *Half-Pipe* | `skatepunk` | one more trick before the timer | skate park |
| 32-bit console 1997 | *Tremor* | `kaiju` | the water in the glass trembles | footsteps |
| 32-bit console 1997 | *Opening Theme* | `animeop` | Saturday morning, the opening song | anime opening |
| 32-bit console 1997 | *Grand Prix* | `speedzone` | the last lap of the kart cup | kart race |
| Handheld 1998 | *Pocket March* | `march` (2A03) | a little army on the move | `snake` |
| Handheld 1998 | *Line Clear* | `gameboy` | the blocks fall faster | blocks |
| Handheld 1998 | *Pocket Blast* | `gameboy` | four corners, four bombers | bomber grid |
| Handheld 1998 | *Juggle* | `gameboy` | black segments, three balls | LCD handheld |
| Handheld 1998 | *Feed Me* | `gameboy` | the pet wants dinner | virtual pet |
| Media player 2001 | *Slow Motion* | `lobby` | the lobby, in slow motion | code rain |
| Media player 2001 | *Breakout* | `bigbeat` | the chase over the rooftops | MilkDrop channel |
| Media player 2001 | *Park Opening* | `coaster` | the theme park you built yourself | rollercoaster (3D) |
| Media player 2001 | *Finish Him* | `kombat` | the tournament on the big screen | tournament |
| Media player 2001 | *Cascade* | `keygen` | the game is won, the cards fly | card cascade |
| Media player 2001 | *Dial Up* | `bigbeat` | the modem screams, the line connects | screensavers |
| Media player 2001 | *Keygen Night* | `keygen` | the little window with the big music | cracktro |
| Y2K 2002 | *Night Street* | `underground` | the city at 2 a.m. | racer at night |
| Y2K 2002 | *Broadside* | `highseas` | the storm, two galleons, the guns run out | sea battle |
| Y2K 2002 | *From the Deep* | `highseas` | the tentacles rise on the drop | sea battle: the sea monster |
| Phones 2003 | *Pocket Snake* | `ringtone` (monophonic) | the snake on a green screen | phone screen |
| Phones 2003 | *Polyphony* | `ringtone` (polyphonic) | the ringtone you paid for | phone screen |
| Phones 2003 | *Ring Ring* | `ringtone` (monophonic) | the pet in your pocket | virtual pet |
| Rhythm games 2005 | *Perfect Combo* | `eurobeat` | the arrows coming faster | dance pad |
| Rhythm games 2005 | *Encore* | `arenarock` | the last song of the set | note highway |
| Rhythm games 2005 | *Mountain Pass* | `eurobeat` | the downhill at night, sideways | racer at night |
| Rhythm games 2005 | *Two Decks* | `eurobeat` | scratch on the fill, cut on the bar | DJ decks |
| Flash and indie 2010 | *Geometry* | `wobble` | jump on the beat or crash | rhythm runner |
| Flash and indie 2010 | *Pixel Hearts* | `indiechip` | a small hero, a big world | jumper |
| Flash and indie 2010 | *Swing Shift* | `electroswing` | the browser tab you never closed | blocks |
| Festival and mobile 2014 | *Main Stage* | `bigroom` | a hundred thousand hands in the air | festival stage |
| Festival and mobile 2014 | *Tap to Fly* | `bigroom` | one more try | tap flyer |
| Lo-fi and vaporwave 2017 | *Rainy Window* | `lofi` | homework, rain, the lamp on | rainy window |
| Lo-fi and vaporwave 2017 | *Mall Dusk* | `vapor` | an empty mall at closing time | vapor plaza |
| Lo-fi and vaporwave 2017 | *Night Bus* | `lofi` | the city through a wet window | `ripple` |
| Modern 2024 | *Neon Rain* | `neonnoir` | rain on a neon street | `outrun` |
| Modern 2024 | *Bullet Dance* | `hardcore` | a screen full of bullets | bullet hell |
| Modern 2024 | *Coaster Night* | `coaster` | a neon ride over the skyline | rollercoaster (3D, at night) |
| Modern 2024 | *Stamp and Haul* | `shanty` | the whole crew stamping on the deck | sea battle |
| Modern 2024 | *Island Night* | `shanty` | the chest, the gold, the dawn | treasure island |
| Modern 2024 | *Moon Ride* | `synthwave` | a bicycle across the moon | moon bike |
| Modern 2024 | *Full Time* | `terrace` | the final whistle, the stands singing | football match |
| Modern 2024 | *Ballroom* | `psychobilly` | the stiff dance everyone learned | gothic ballroom |
| Modern 2024 | *Scope Night* | `scope` | the music drawing itself | XY scope |

---

## 6. Proposals: visualizations

Each one moves with the music, as the owner asked: not the effect drawn, but
the effect driven by the beat, on the 3D stage with its blur where it fits.

### Simulations, in the spirit of the arcade round

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **racer** | OutRun, Lotus, Need for Speed | a pseudo-3D road with curves and hills; the car leans into each curve on the bar; traffic overtaken on the beat; a checkpoint and EXTENDED PLAY on the drop; the night version for Night Street | M |
| **bullet hell** | Touhou | a ship weaving through patterns that open like flowers on the bar, change on the drop, and burst on the crash | M |
| **musicdisk player** | the musicdisks | a tracker's pattern view scrolling the real notes of the score, VU bars on each channel, a track list, the title | S |
| **party** | The Party, Assembly, Revision | a hall from the back row: a big screen playing the demo, the crowd's lights, a "compo" card before each track | M |

### Platforms, planes, cities and rides (the owner's second list)

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **runner** | the 16-bit speed runner | a seed-made hero racing down ramps, through loops and over springs; the speed builds with the build, a loop on the drop, rings scattering on the crash; the camera pulled back as the speed rises | M |
| **jumper** | the platform jumper | a small hero jumping on the beat: platforms, blocks bumped on the snare, coins on the hats, a warp at the end of the phrase, a flag on the last bar | M |
| **run-and-gun** | the soldier games of the 90s arcades | a side-scrolling soldier, enemies and tanks, explosions on the kick, a big boss on the drop, prisoners freed on the crash | M |
| **plane shooter** | the vertical plane shooters | a twin-engine plane over a scrolling sea and islands, formations entering on the bar, a loop to dodge on the break, the big bomber on the drop | M |
| **helicopter** | the helicopter missions | a gunship seen from above over desert and bases, the rotor's blur, rockets on the snare, a rescue on the break | M |
| **city builder** | the city builders | a city growing from empty land on the beat: roads, zones, towers, traffic, a news helicopter overhead; on the drop a disaster — a monster wading in, a hurricane spinning across, an earthquake shaking the grid — rescue helicopters, then the city rebuilding. Its camera also flies the avenues at night, the 64k-intro flyover | L |
| **rollercoaster** | the first-person ride | from the front seat: the lift hill clicking up through the build, the drop on the drop, loops and corkscrews on the phrase. A 3D track with glowing rails, supports flashing past and motion blur hits hardest; a pure-lines version gives the 1979 arcade its vector ride | M |
| **missile defense** | the missile-defense arcades | missiles falling on six cities, interceptors bursting on the beat, a city lost on the crash | S |
| **blocks** | the falling-blocks puzzle | blocks dropping and locking on the beat, lines clearing on the snare, the stack speeding up with the build, four lines at once on the drop | S |
| **raycaster** | the first-person corridors of DOS | a textured corridor run, doors opening on the bar, a muzzle flash on the snare | M |
| **rhythm runner** | the jump-on-the-beat games | a cube running over spikes and jumping exactly on the beat; the world flips on the drop | S |

### Fighting, sports, rhythm and pinball (the owner's third list)

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **kung-fu corridor** | the kung-fu arcade of the 80s | a fighter walking a temple floor, enemies coming from both sides, kicks and punches on the beat, a boss at the stairs at the end of each phrase | M |
| **versus fighter** | the 90s versus fighters | two seed-made fighters; special moves and projectiles on the accents, combos on the fills with a hit counter, a knockout on the drop, ROUND 2 — FIGHT on the next phrase; no blood | M |
| **tournament** | the fighting films of the 90s | a dark island arena, torches and a gong; the fight in silhouette against the fire, the finishing move a burst of light in slow motion; no gore | M |
| **athletics** | the button-hammering athletics games | sprinters whose legs go as fast as the hats; hurdles on the kick, the long jump on the accent, a stopwatch, a new record on the drop | S |
| **motocross** | the motocross games | a side view of ramps and dunes; the jump on the bar, a wheelie through the build, a flip on the drop; a fall now and then, and the rider back on the bike | S |
| **hoops** | arcade basketball | the shooting game: balls arcing in on the beat, the hoop starting to move with the build; then two-on-two, a dunk on the drop and the ball on fire after three in a row | M |
| **dance pad** | the dance games | arrows rising to the targets in time with the notes, two sneakers stepping on the pad; the simulator judges each step — PERFECT, GREAT, the odd MISS — the combo counter climbing, the gauge filling | M |
| **note highway** | the guitar games | a five-lane highway rushing at the camera, the gems taken from the lead's own notes, sustains as trails, a flash on every strum, star power on the drop, the crowd meter swinging | M |
| **pinball** | the pinball tables | the ball launched on the downbeat, the flippers firing on the kick and the snare, bumpers flashing and ringing in key, a ramp on each fill, multiball on the drop | M |

### Pirates, adventures and the classics (the owner's fourth list)

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **pirate duel** | the insult sword fights of the island adventures | two pirates on a moonlit dock, parries and lunges on the beat; each bar one throws a seed-made jibe in a speech bubble and the other a comeback; the better comeback wins the exchange, the duel ends on the drop | M |
| **sea battle** | the pirate films and the sailing games | two galleons in a storm: broadsides on the kick, sails filling with the pad, the swell on the bass, lightning on the crash; a sea monster's tentacles on the drop | M |
| **treasure island** | the treasure maps | an old map: a dotted trail drawn across the island on the beat, the compass swinging on the bar, the X on the drop, the chest opening in a shower of gold | S |
| **time-split mansion** | the time-travel cartoon adventure | one mansion in three panels — past, present, future — objects flushed from one to another on the beat, the three panels in sync on the drop | M |
| **three helpers** | the puzzle adventures with three goblin-like helpers | three little helpers, one on each instrument: the brawler acts on the kick, the picker on the snare, the wizard on the hats; the puzzle solves itself on the drop | M |
| **sword duel** | the palace-and-dungeon sword fights | a dungeon, a fighter animated as fluidly as the rotoscoped originals; guard and thrust on the beat, the gate rising on the bar, a spike trap timed to the snare, the guard falling on the drop | M |
| **jungle runner** | the jungle runners of the woodgrain console | a runner in a flat jungle: vines swung on the bar, logs jumped on the beat, crocodiles opening and closing their jaws in time, a tar pit on the break | S |
| **bouncing balls** | the ball-splitting arcade shooters | big balls bouncing on the kick over a seed-made skyline, a harpoon fired on the snare, each ball hit splitting in two smaller and faster ones, the last pop on the drop | S |
| **walkers** | the little walkers' puzzle games | a stream of little walkers; builders laying steps on the beat, diggers on the snare, a floater with an umbrella on the break, all of them home on the drop — nobody lost | M |
| **bomber grid** | the grid bombers | bombers on a block grid, bombs laid on the beat, blasts crossing on the snare, walls crumbling, a chain reaction on the drop | S |
| **cinematic chase** | the flat-polygon cinematic adventures | a lone figure fleeing in flat polygons across an alien world, the camera cutting on the bar, laser fire on the snare, a leap on the drop | M |
| **gallery shooter** | the light-gun games | targets crossing a fairground stall, shots on the snare, scores popping up; the hit marked without full-screen flashes | S |

### The years since 2010

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **festival stage** | the main stages of 2014 | lasers fanning on the beat, an LED wall, the crowd's hands; CO2 jets through the build, confetti cannons on the drop | M |
| **tap flyer** | the tap-to-fly mobile games | a little flyer flapping through gaps on the beat; a crash on the crash, and straight back to the start | S |
| **rainy window** | the lo-fi study streams | a desk lamp and a window at night: raindrops sliding on the hats, the city's lights blurring and pulsing with the chords, steam from a mug | S |
| **vapor plaza** | vaporwave | a pastel grid at dusk, a marble bust turning slowly, palm trees, an old desktop window popping up on the bar | S |

### The Amiga's and the PC's classic tricks

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **kefrens** | Kefrens bars | a wall of bars weaving like a ribbon, width on the bass, colours on the chords | S |
| **twister** | the twisted bar | a column twisting faster on the build, snapping on the kick | S |
| **rotozoom** | the rotozoomer and Mode 7 | a seed-made picture rotating and zooming, the angle on the bar, the zoom on the kick | S |
| **ball** | the bouncing checkered ball | the big red and white ball bouncing on the kick, its shadow on the grid | S |
| **glenz** | glenz vectors | the see-through solid as a scene of its own, flipping shape on the drop | S |
| **lens** | the lens over a picture | a glass sphere rolling over a landscape, bulging on the snare | S |
| **landscape** | the travelling trackmos and voxel worlds | flying low over a seed-made landscape, the camera dipping on the bar | M |
| **crystals** | the dreamlike 3D of early PC demos | glowing crystals growing on the chords, light refracting on the lead | M |
| **smoke** | volumetrics | smoke and light rays that pulse with the pad and burst on the crash | M |

### The film and media-player looks

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **code rain** | The Matrix | falling columns of seed-made glyphs, the rain speeding on the build, a shape appearing in it on the drop | S |
| **MilkDrop channel** | projectM and Butterchurn | the frame fed back into itself through warps that change on the bar, the waveform drawn in it, a new preset on each scene cut | L |
| **bullet time** | the slow-motion shot | any scene slowed to a crawl and orbited by the camera at the break, then snapping back on the drop | M |

### Claude's additions (approved 2026-10-28)

Games that marked an era:

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **vector tube** | the vector tube shooter of 1981 | a claw on the rim of a glowing tube, enemies climbing the lanes on the beat, the zap on the snare, the warp down the tube on the drop | S |
| **wireframe tank** | the first 3D tank battle | green wireframe tanks and volcanoes, the radar sweeping on the bar, shells on the snare | S |
| **road crossing** | the frog crossing the road | lanes of cars and logs moving on the beat, a hop on each kick, home on the drop | S |
| **pyramid hopper** | the cube-pyramid hopper | a hopper bouncing down a pyramid, each cube changing colour on the beat, the pyramid finished on the drop | S |
| **behind-view shooter** | the 3D runner over a checkerboard | a flying hero over a checkered plain, pillars rushing past, enemies in waves on the bar, a dragon-like boss on the drop | M |
| **cartoon castle** | the laserdisc cartoon adventure | a knight in a hand-drawn castle; the right move appears on the beat and the knight makes it, or falls through a trapdoor | M |
| **artillery** | the artillery games with little soldiers | two teams on a hill of earth, shots arcing on the bar, craters on the snare, a sheep-shaped surprise on the drop | M |
| **skate park** | the skateboarding games of the late 90s | a skater on a half-pipe, a trick on every bar, a grind through the build, a huge air on the drop, the combo counter | M |
| **football match** | the top-down football games | a pitch seen from above, passes on the beat, a run down the wing through the build, the goal on the drop, the crowd going up | M |
| **kart race** | the kart racers | karts in a pack, items thrown on the snare, a boost on the build, the photo finish on the drop | M |
| **DJ decks** | the DJ rhythm games | two turntables and a mixer, scratches on the fills, the crossfader on the bar, the notes falling in seven lanes | S |
| **LCD handheld** | the single-game LCD handhelds | a little juggler in black segments catching balls on the beat, the ghost of the unlit segments behind | S |
| **virtual pet** | the egg-shaped virtual pets | a pixel pet that dances on the beat, eats on the snare, sleeps through the break | S |
| **loading screen** | the 8-bit micros' tape loading | the picture drawn line by line as the tape loads, the border stripes rolling gently in time — never strobing | S |
| **phone screen** | the first phone games | a green LCD screen: the snake on the phone, a space shooter in four shades, a high score on the drop | S |

The home computer's screens, and the internet:

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **screensavers** | the screensavers of the 90s | pipes growing through 3D space on the beat, bouncing lines with trails, a maze walked on the bar | M |
| **card cascade** | the card-game win | the cards bouncing off the bottom of the screen in trails, a new card on each bar (two when the music is busy) | S |
| **ANSI board** | the bulletin boards | ANSI art drawn line by line at modem speed in text-mode colours, the logo complete on the drop | S |
| **cracktro** | the crack intros | a chrome logo bouncing, a sine scroller of greetings, a starfield, a little music: the purest demoscene there is | S |

Films and TV of the 80s and 90s, as concepts:

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **time car** | the time-travel car of the 80s | a car racing down a night road, the speedometer climbing through the build, a burst of light and two trails of fire on the drop | M |
| **scanner car** | the talking car of 80s TV | a black car with a red light sweeping left and right in time, the road rushing past | S |
| **footsteps** | the dinosaur films | a glass of water rippling with every giant footstep on the kick, the shadow passing on the drop | S |
| **moon bike** | the boy and his friend from the stars | a bicycle crossing a huge moon in silhouette on the drop | S |
| **anime opening** | the anime openings the 90s brought to Latin America | speed lines, silhouettes striking a pose on the bar, the title card on the drop | M |

Classic demo effects the pack did not name:

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **fire** | the 256-colour flames | the flames leap on the kick, a logo burning through on the drop | S |
| **bump-mapped logo** | the embossed logos of the mid-90s | a light circling an embossed logo, flaring on the snare | S |
| **interference rings** | the moiré rings | two sets of rings drifting through each other, the moiré pulsing on the bass | S |
| **rubber vector** | the jelly cube | a cube that wobbles like jelly when the kick hits it | S |
| **unlimited bobs** | the endless sprite | a single sprite drawn into infinity, tracing a figure that changes on the bar | S |
| **chessboard zoomer** | the rotating checkerboard | a checkerboard plane rotating and zooming on the beat | S |

### The first screens and the gothic family (the owner's fifth list)

| Scene | Homage to | On the music | Effort |
|---|---|---|---|
| **oscilloscope tennis** | the tennis game played on a laboratory oscilloscope in 1958 | the court seen from the side on a round green screen: a net, the ball arcing in a phosphor trail, a hit on the beat, the bounce on the kick, the ball into the net on the crash; the glow fading slowly as real phosphor does | S |
| **XY scope** | oscilloscope music | the music's own left and right drawn against each other on the phosphor: figures that hold, turn and bloom with the chords — the sound literally drawing the picture | S |
| **space duel** | the first space duel on a vector scope, 1962 | two ships circling a star on a round vector screen, gravity bending their paths, shots on the snare, a jump to hyperspace on the break | S |
| **haunted mansion** | the gothic family's house | a gothic house at night on a black-and-white set: candles flickering with the hats, bats on the bar, portraits whose eyes follow, lightning as a bolt and a soft glow on the crash, the front door creaking open on the drop | M |
| **gothic ballroom** | the stiff gothic dance of the 2020s | a ballroom in grey, a dancer in silhouette with jerky, deadpan moves locked to the beat, the candelabras swaying | S |
| **haunted table** | the gothic family's pinball table, the best-selling of all | the pinball scene with a haunted mansion on its playfield: a bookcase ramp, a swamp, a chair that throws the ball back, lightning on the multiball | with pinball |

### Improvements to what exists

| Scene | Proposal | Effort |
|---|---|---|
| `outrun` | add the road: becomes the racer's sunset stage | with racer |
| `starfield` | layered parallax and a lens flare on the brightest star | S |
| `lightcycles` | its own `grid` music in the 32-bit and modern eras | with `grid` |
| `vectorballs` | gouraud-shaded meshes on the bar, the torus and the knot | S |

---

## 7. Proposals: ways to watch

| Mode | What it is | Effort |
|---|---|---|
| **Musicdisk mode** | the Amiga musicdisk as a mode: a menu of seed-made tracks, the player scene, next and previous | S (with the player) |
| **Party mode** | AUTOPLAY as a demo party: a compo card before each track ("AMIGA DEMO COMPO — ENTRY 3"), applause on the crowd's lights at the end | M |
| **Radio stations** | for the racer: the car's radio with three stations (fusion, techno, rock), switched with a key, the road keeps going | S (after the racer and its styles) |
| **Era marathon** | AUTOPLAY locked to one era for hours, for the people who want only their own years | S |
| **Cabinet mode** | the arcade scenes inside a cabinet: a marquee, side art and bezel made by the seed, the glass catching the light | S |
| **Born in** | type the year you were born: AUTOPLAY starts in the era when you were twelve, and stays near it | S |
| **Greetings** | type a few names: they scroll in the greetings, as every demo greeted its friends. The names stay on the screen; nothing is sent anywhere | S |
| **Screensaver** | after a minute without input, SEEDSCENE goes to AUTOPLAY full screen; any key brings you back | S |

### Sounds between the tracks

| Idea | What it is | Effort |
|---|---|---|
| **Modem handshake** | the dial-up screech as the riser of a transition in the media-player era, the drop when the line connects | S |
| **Startup chimes** | a short chime of its own, in the spirit of each era's start-up sound, opening an era in THE JOURNEY | S |
| **Cartridge click** | the click of a cartridge going in, opening the woodgrain console's and the 16-bit consoles' tracks | S |

---

## 8. The build plan

Approved on 2026-10-28, for v0.2. Each round lands a whole period or pack: its
sound chip, its styles, its tracks and its scenes, so every round can be
watched and listened to on its own, and v0.2 stays releasable after each one.
Inside each round the chip goes first, since the styles are tuned on it.

| Round | What lands | Why in this place |
|---|---|---|
| 1 | **The 16-bit consoles** (P2): YM2612 and SPC700; `speedzone`, `jumpworld`, `coastline`, `chopper`, `pinball`; runner, jumper, racer, helicopter, rotozoomer; the radio stations | the biggest gap in the timeline and most of the owner's second list; the two hardest chips first |
| 2 | **The arcade of 1995, and the fighters** (P5): YM2610 (on the YM2612), 2A03; `brigade`, `squadron`, `versus`, `kombat`, `kungfu`; run-and-gun, plane shooter, missile defense, kung-fu corridor, versus fighter, tournament; cabinet mode | stands on round 1's FM; the platform, plane and fighting games together |
| 3 | **Sports and pinball**: `olympic`, `dirt`, `courtjam`; athletics, motocross, hoops, pinball | the games of the arcades and the 8-bit years, on the chips of rounds 1 and 2 |
| 4 | **Racing and The Matrix**: `turbo`, `nitro`, `underground`, `lobby`, `bigbeat`; code rain, bullet time | the racer from round 1 gets its other eras |
| 5 | **The Atari ST and the Amiga classics** (P1): YM2149; `stchip`, `beast`, `agony`, `ballad`, `march`, `bomb`, `italo`; Kefrens bars, twister, ball, glenz, landscape, the musicdisk player; the musicdisk mode | the pack's own heart: the trackmos and the MOD-era soundtracks |
| 6 | **Adventures, pirates and the woodgrain console** (P10, P11): MT-32, AdLib, PC speaker, TIA; `calypso`, `toon`, `whimsy`, `persia`, `vcs`, `highseas`, `shanty`; pirate duel, sea battle, treasure island, time-split mansion, three helpers, sword duel, jungle runner, gallery shooter, cinematic chase, walkers | the adventure games need a chip of their own, the MT-32, and the most character animation of any round |
| 7 | **The DOS party and the city** (P3): GUS; `idm`, `zoning`, `kaiju`, `industrial`; lens, crystals, raycaster, the city builder and its disasters; the party mode | the city builder is the largest scene: it comes when the rest is settled |
| 8 | **The rhythm games** (P8): `eurobeat`, `arenarock`; dance pad, note highway | both need a simulator that judges timing against the score |
| 9 | **The years since 2001** (P4, P6, P7, P9): the tape for lo-fi; `coaster`, `indiechip`, `wobble`, `electroswing`, `bigroom`, `lofi`, `vapor`, `grid`, `neonnoir`, `powerballad`; the MilkDrop channel, the rollercoaster, blocks, rhythm runner, festival stage, tap flyer, rainy window, vapor plaza | brings the timeline up to now; the MilkDrop channel is a system of its own |
| 10 | **The 8-bit micros and the phones** (P12, P13): AY-3-8910, the beeper, the two ringtone chips; `micro`, `ringtone`; loading screen, phone screen, LCD handheld, virtual pet | small chips and small screens: quick to build, on the rhythm grid every game already uses |
| 11 | **More classics**: `skatepunk`, `terrace`, `animeop`; vector tube, wireframe tank, road crossing, pyramid hopper, behind-view shooter, cartoon castle, artillery, skate park, football match, kart race, DJ decks | games that marked an era, each a simulation on the beat like the arcade round's |
| 12 | **Screens, films and demo effects**: `keygen`, `triphop`; screensavers, card cascade, ANSI board, cracktro, time car, scanner car, footsteps, moon bike, anime opening, fire, bump-mapped logo, interference rings, rubber vector, unlimited bobs, chessboard zoomer; born in, greetings, screensaver; the sounds between the tracks | mostly single effects and modes, each small |
| 13 | **The first screens and the gothic family** (P14): lab oscillators; `labtones`, `scope`, `gothic`, `psychobilly`; oscilloscope tennis, XY scope, space duel, haunted mansion, gothic ballroom, haunted table | a prologue to the whole timeline, and a family that crosses three ages |
| 14 | **The rest**: bouncing balls, bomber grid, bullet hell, smoke, the starfield's parallax, the vector balls' meshes, the era marathon | improvements that need nothing new under them |

**Done so far** — small pieces first, as the owner asked on 2026-10-28: the
fire and the interference rings (round 12's classic demo effects); the
Kefrens bars, the bouncing checkered ball and the twister (round 5's Amiga
classics); the
LCD juggler and the pyramid hopper (round 11's classics, in the 1979 arcade
era; the device is from 1980, and it needs its colours);
the scanner car and the footsteps (round 12's films and TV); the 3D pipes
(round 12's home computer screens); the unlimited bobs, the dual chessboard,
the chessboard floor with its cube, the rubber vector, the bump-mapped logo
and the cracktro (round 12's demo effects); the card cascade (round 12's
home computer screens, in the Y2K era until the media-player years are built);
the ANSI board, the bouncing lines and the 3D maze (round 12's home
computer screens, which completes its screensavers); the moon bike and the time car (round
12's films and TV); the anime opening.

**When a round is done** — the same gates as before:

- every new style plays on each chip of its eras in the sampler, its levels
  measured; the owner listens;
- every new scene is judged from rendered frames at its key moments, and runs
  live at 60 fps;
- the earlier styles keep every note (hashed before and after) and the
  determinism tests pass;
- AUTOPLAY plays the new period's tracks and mixes them without dropouts,
  measured block by block.

**In all:** fourteen new periods (twenty-two eras), fifty-nine new styles
(eighty-three), fifteen new sound chips (nineteen in all) and a tape,
136 tracks, eighty-eight new scenes (one hundred and ten), eight ways
to watch and three sounds between the tracks.

---

## 9. How it fits the app

Approved by the owner on 2026-10-28. What twenty-two eras change in what already runs, measured on the code as it is:

- **AUTOPLAY** plays three tracks of 40 seconds in an era, then moves on, and
  goes through every era once before any comes back. With eight eras a cycle
  takes 16 minutes; with twenty-two it takes 44. Someone waiting for their own
  years waits more than half an hour, which is what the era marathon is for.
- **THE JOURNEY** stops once in every era, in order, and shares its length
  among them: today 96 seconds give each era 12. With twenty-two eras the same
  12 seconds a stop need 264 seconds, and the trip now starts in 1958; the default length goes up with the eras.
- **The era key** and the menu's ERA setting step through all twenty-two, in order of year, as they do through the eight today.
- **The "now playing" card** keeps the title the seed writes for each
  rendition, so no two are alike; the track it plays shows under it, small:
  *after Speed Zone*.
- **The sampler** grows with the styles: every style on each chip of its
  eras: at least one take for each of the 83 styles, against today's 33. It splits into one file per
  period so each can be heard on its own.
- **The gallery and the showcase videos** gain a frame per new scene and a
  stop per new period, re-rendered at the end of each round.

---

## 10. Risks, and the lessons already paid for

Approved by the owner on 2026-10-28.

| Risk | What already happened | How each round handles it |
|---|---|---|
| The audio thread falls behind | two wavetable tracks overlapping needed 65% of real time and cut out live | every new chip measured block by block as the browser renders it: two overlapping tracks under 50% of real time, no block over budget; samples cut before anything plays, as Paula's are |
| A scene drops below 60 fps | the light cycles fell to 12 fps on an array indexed in the shader | simulations run on the CPU, on the beat grid, as the arcade games do; shaders read plain values; every scene timed live |
| Old music changes by accident | adding styles could have moved the notes of every earlier style | new material on random streams of its own; the earlier styles hashed before and after each round |
| A homage turns into a copy | a style name echoed a real song title and was renamed | names checked against real titles before they ship; characters, names, levels and logos never used |
| A disaster scene that hurts | the boxer's first challenger risked giving offence and was redrawn | the city is a toy city: nobody is shown hurt, the monster is a giant toy, and every disaster ends in the city rebuilding |
| A fight that goes too far | the fighting games of the 90s were known for their gore | the fights are on the beat and in the light: no blood, no gore; a knockout is a burst of light and a count |
| A famous theme slips in | the owner's own words: "maybe some idea, or melody, or animation" | ideas and animations are welcome; melodies never: the instruments, scales and rhythm of a famous theme, never its tune — every melody stays the seed's |
| A screen that flashes | light-gun games flashed the whole screen white on every shot | no full-screen flashes on the beat, anywhere: hits are marked locally, so nobody sensitive to flashing light is put at risk |
| A famous family on screen | the gothic family is a registered name, with its own characters and theme | the house, the mood, the harpsichord and the snaps; never the family's names, faces, characters or theme tune — the dancer is a silhouette, the mansion anyone's |
| A release that never comes | everything now goes into v0.2, in fourteen rounds | each round leaves v0.2 complete and releasable; the owner calls the release when it is masterful |
| Work with no record | the folder is still not under version control, which is how v0.1's exact source was lost | the owner decides when; it is asked again before the release |

---

## 11. Decisions taken

The owner's answers of 2026-10-28.

| # | Question | Decision |
|---|---|---|
| Q1 | Release v0.2 first, then build this as v0.3? | **No.** All of it goes into v0.2, the first release, which has to be masterful; later versions polish it |
| Q2 | Fill 2010 to 2024 — a lo-fi and vaporwave period in 2017? | **Yes**, and keep adding: the rhythm games of 2005 and the festivals of 2014 came with it |
| Q3 | The "now playing" card: the seed's title, the track's name, or both? | **Both** |
| Q4 | The rollercoaster: 3D as the main ride, lines for the 1979 arcade? | **Yes**, the two versions |
| Q5 | The city's disasters: one per track, picked by the seed, the monster the rarest? | **Yes** |
| Q6 | The radio stations only in the racer? | **Yes** |
| Q7 | Claude's own ideas, proposed after "anything else?"? | **Yes, all of them** — now in sections 3 to 8 |
| Q8 | The card cascade: a card on each beat, as planned, or on each bar? (2026-10-30: a card a beat buried the arcs at 175 BPM) | **On each bar**, another halfway through when the music is busy |
