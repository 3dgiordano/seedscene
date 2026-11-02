# Music audit

Seeds aurora, hikari, seedscene; 90 s each; 2026-11-02. ✓ pass, ⚠ warn, ✗ fail, ~ let off by the style, · not measured; off grid is measured on the seeds that do not swing; speed is wall-clock time on the machine that ran it. Run `npm run audit:music -- <style>` for one style.

**29 of 29 styles pass** (no ✗ anywhere).

| style | bass in chord | bass rubs | melody on beat | held | held rubs | top | range | leaps >3rd | >6th | repeats | stuck | off grid | echo rubs | melody vs chords | sound vs real | peak | speed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `dreamwave` | ⚠ 78% | ✓ 3% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ A#5 | ✓ 12 | ✓ 3% | ✓ 0% | ✓ 36% | ✓ 0.0% | ✓ 0.0% | ✓ 39% | ✓ -1.2 dB | · - | ✓ -1.9 | ✓ 12.1x |
| `chiptune` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 12 | ✓ 3% | ✓ 0% | ✓ 57% | ✓ 0.0% | ✓ 0.0% | ✓ 17% | ✓ -0.4 dB | · - | ✓ -2.1 | ✓ 10.6x |
| `acid` | ✓ 96% | ✓ 1% | · - | · - | · - | · - | · - | · - | · - | · - | · - | ✓ 0.0% | · - | · - | · - | ✓ -2.0 | ✓ 6.4x |
| `trance` | ✓ 87% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 12 | ✓ 2% | ✓ 0% | ✓ 77% | ✓ 0.8% | ✓ 0.0% | ⚠ 58% | ✓ -2.0 dB | · - | ✓ -1.9 | ✓ 9.2x |
| `rave` | ✓ 100% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ A5 | ✓ 10 | ✓ 3% | ✓ 0% | ✓ 65% | ✓ 0.0% | ✓ 0.0% | ✓ 0% | ⚠ -3.5 dB | · - | ✓ -1.8 | ✓ 6.5x |
| `jungle` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 9 | ✓ 8% | ✓ 0% | ✓ 73% | ✓ 0.0% | ✓ 0.0% | ✓ 0% | ✓ -2.0 dB | · - | ✓ -2.1 | ✓ 6.6x |
| `hardcore` | ✓ 87% | ✓ 0% | ✓ 98% | ✓ 95% | ✓ 5% | ✓ A#5 | ✓ 11 | ✓ 6% | ✓ 0% | ✓ 88% | ✓ 0.0% | ✓ 0.0% | ✓ 18% | ✓ -1.7 dB | · - | ✓ -1.8 | ✓ 5.0x |
| `newbeat` | ✓ 95% | ⚠ 4% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ C#5 | ✓ 12 | ✓ 1% | ✓ 0% | ✓ 75% | ✓ 0.0% | ✓ 0.0% | ✓ 34% | ✓ -1.3 dB | ⚠ 11 dB brass | ✓ -1.9 | ✓ 6.2x |
| `eurodance` | ⚠ 75% | ✓ 0% | ✓ 96% | · - | · - | ✓ B4 | ✓ 11 | ✓ 7% | ✓ 0% | ✓ 64% | ✓ 0.0% | ✓ 0.0% | ✓ 34% | ✓ -1.6 dB | · - | ✓ -1.8 | ✓ 6.2x |
| `gabber` | · - | · - | ✓ 100% | ✓ 100% | ✓ 0% | ✓ A5 | ✓ 11 | ✓ 7% | ✓ 0% | ✓ 81% | ✓ 0.0% | ✓ 0.0% | ✓ 0% | ✓ -1.2 dB | · - | ✓ -2.1 | ✓ 11.1x |
| `ambient` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 11 | ✓ 7% | ✓ 0% | ✓ 32% | ✓ 0.0% | ✓ 0.0% | ✓ 0% | ✓ -1.8 dB | · - | ✓ -2.8 | ✓ 7.3x |
| `orchestral` | ✓ 92% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 10 | ✓ 3% | ✓ 0% | ✓ 69% | ✓ 0.0% | ✓ 0.0% | · - | ✓ -1.6 dB | · - | ✓ -2.6 | ✓ 5.5x |
| `gameboy` | ✓ 98% | ✓ 2% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ A5 | ✓ 12 | ✓ 3% | ✓ 0% | ✓ 71% | ✓ 0.0% | ✓ 0.0% | ✓ 36% | ✓ 0.0 dB | · - | ✓ -2.1 | ✓ 18.9x |
| `heroic` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ A#5 | ✓ 10 | ✓ 3% | ✓ 0% | ✓ 75% | ✓ 0.0% | ✓ 0.0% | ✓ 19% | ✓ 0.7 dB | · - | ✓ -2.1 | ✓ 7.3x |
| `synthwave` | ✓ 98% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ C6 | ✓ 12 | ✓ 3% | ✓ 0% | ✓ 61% | ✓ 0.0% | ✓ 0.0% | ⚠ 58% | ✓ -2.6 dB | · - | ✓ -2.4 | ✓ 8.9x |
| `arcade` | ~ 82% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 12 | ✓ 1% | ✓ 0% | ✓ 91% | ✓ 0.0% | ✓ 0.0% | ⚠ 66% | ✓ -0.4 dB | · - | ✓ -2.3 | ✓ 28.1x |
| `cyborg` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ C5 | ✓ 8 | ✓ 10% | ✓ 0% | ✓ 57% | ✓ 0.0% | ✓ 0.0% | ✓ 32% | ✓ -1.0 dB | ✓ 5 dB brass | ✓ -2.1 | ✓ 9.6x |
| `derelict` | ~ 12% | ~ 41% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ F#5 | ✓ 12 | ✓ 3% | ✓ 0% | ✓ 38% | ✓ 2.0% | ✓ 0.0% | ✓ 10% | ✓ -1.9 dB | · - | ✓ -2.5 | ✓ 17.5x |
| `synthpop` | ✓ 100% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 13 | ✓ 15% | ✓ 0% | ✓ 80% | ✓ 0.0% | ✓ 0.0% | ⚠ 68% | ✓ -2.3 dB | · - | ✓ -2.1 | ✓ 6.0x |
| `starpilot` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G5 | ✓ 12 | ✓ 5% | ✓ 0% | ✓ 82% | ⚠ 11.7% | ✓ 0.0% | ⚠ 50% | ✓ 1.6 dB | ✓ 7 dB brass | ✓ -2.0 | ✓ 5.4x |
| `modjazz` | ~ 77% | ~ 30% | ✓ 100% | ✓ 89% | ✓ 5% | ⚠ E6 | ✓ 15 | ⚠ 26% | ✓ 0% | ✓ 58% | ⚠ 4.7% | · swung | ✓ 17% | ✓ -2.4 dB | ⚠ 10 dB flute | ✓ -2.1 | ✓ 8.9x |
| `fmmetal` | ✓ 99% | ✓ 0% | ✓ 93% | ✓ 95% | ✓ 5% | ✓ F#5 | ✓ 11 | ✓ 4% | ✓ 0% | ✓ 88% | ⚠ 5.0% | ✓ 0.0% | ⚠ 51% | ✓ -2.6 dB | · - | ✓ -1.9 | ✓ 5.5x |
| `midiquest` | ✓ 88% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 12 | ✓ 6% | ✓ 1% | ✓ 73% | ✓ 0.0% | ✓ 0.0% | ✓ 31% | ✓ -2.6 dB | ✓ 6 dB flute | ✓ -2.4 | ✓ 5.5x |
| `rocknroll` | ~ 74% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 12 | ✓ 2% | ✓ 0% | ✓ 82% | ✓ 0.0% | · swung | ⚠ 65% | ✓ 1.6 dB | · - | ✓ -1.9 | ✓ 7.5x |
| `stchip` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G5 | ✓ 12 | ✓ 3% | ✓ 0% | ✓ 64% | ✓ 0.0% | ✓ 0.0% | ✓ 17% | ✓ 2.9 dB | · - | ✓ -1.8 | ✓ 11.0x |
| `keygen` | ✓ 98% | ⚠ 3% | ✓ 98% | ✓ 100% | ✓ 0% | ✓ G5 | ✓ 10 | ✓ 3% | ✓ 0% | ✓ 91% | ✓ 0.0% | ✓ 0.0% | · - | ✓ -1.9 dB | · - | ✓ -2.1 | ✓ 16.9x |
| `triphop` | ✓ 97% | ⚠ 4% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ F5 | ✓ 9 | ✓ 4% | ✓ 0% | ✓ 35% | ✓ 0.0% | · swung | · - | ✓ 0.3 dB | · - | ✓ -2.4 | ✓ 7.0x |
| `animeop` | ✓ 98% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 22 | ✓ 10% | ✓ 1% | ✓ 43% | ✓ 0.2% | ✓ 0.0% | ⚠ 68% | ✓ -2.8 dB | · - | ✓ -1.9 | ✓ 5.8x |
| `skatepunk` | ✓ 92% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ D5 | ✓ 8 | ✓ 1% | ✓ 0% | ⚠ 30% | ⚠ 23.8% | ✓ 0.0% | ✓ 3% | ⚠ -5.6 dB | · - | ✓ -1.9 | ✓ 5.7x |

## Dreamwave (`dreamwave`)

91, 113, 97 bpm; F phrygian, A# lydian, C# phrygian. Layers: 169 bass, 341 chord, 87 melody notes.

- ⚠ the bass's note is in the chord at 78% of chord changes - a chord instrument may stand on the wrong root

## C64 Chiptune (`chiptune`)

134, 134, 148 bpm; D harmonicMinor, B minor, B harmonicMinor. Layers: 338 bass, 95 chord, 110 melody notes.

- nothing stands out

## Acid (`acid`)

125, 134, 128 bpm; F# phrygian, D# dorian, A minor. Layers: 483 bass, 432 chord, 0 melody notes.

- ~ the bass let off the chord: a 303 line weaves round the root
- · no melody found to analyse

## Trance (`trance`)

136, 138, 135 bpm; C# minor, G# harmonicMinor, D# minor. Layers: 164 bass, 1611 chord, 128 melody notes.

- ⚠ 58% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo
- ~ the echo (3 sixteenths, level 0.242) between the melody's eighths let off: the dotted-eighth delay is the genre's own: it fills the sixteenths between the lead's eighths

## Amiga Rave (`rave`)

139, 146, 149 bpm; G phrygian, A phrygian, C minor. Layers: 133 bass, 751 chord, 117 melody notes.

- ⚠ the melody sits -3.5 dB against the chords - buried

## Jungle (`jungle`)

165, 169, 169 bpm; F# minor, A# minor, B minor. Layers: 104 bass, 260 chord, 102 melody notes.

- nothing stands out

## Happy Hardcore (`hardcore`)

180, 171, 177 bpm; A lydian, A# minor, F# major. Layers: 226 bass, 1665 chord, 220 melody notes.

- nothing stands out

## New Beat (`newbeat`)

112, 108, 108 bpm; F# phrygian, C phrygian, C# phrygian. Layers: 544 bass, 389 chord, 110 melody notes.

- ⚠ 4% of bass notes rub a minor second against a chord tone sounding
- ⚠ the brass:real strays 11 dB on average from a trombone (soft to loud, on paula): 0 0 0 0 0 1 where the real one has 0 16 16 - - - - UNSW Music Acoustics, brass acoustics (a trombone crescendo, soft and loud)

## Eurodance (`eurodance`)

130, 131, 126 bpm; C major, B major, B dorian. Layers: 199 bass, 1257 chord, 161 melody notes.

- ⚠ the bass's note is in the chord at 75% of chord changes - a chord instrument may stand on the wrong root

## Gabber (`gabber`)

176, 179, 179 bpm; A minor, D harmonicMinor, C minor. Layers: 0 bass, 297 chord, 105 melody notes.

- nothing stands out

## Ambient Techno (`ambient`)

97, 95, 103 bpm; D# dorian, F dorian, A lydian. Layers: 79 bass, 279 chord, 58 melody notes.

- nothing stands out

## Orchestral Tracker (`orchestral`)

112, 118, 113 bpm; F# minor, G# minor, A dorian. Layers: 17 bass, 674 chord, 91 melody notes.

- nothing stands out

## Handheld Chip (`gameboy`)

128, 134, 133 bpm; G# minor, A dorian, D# major. Layers: 328 bass, 92 chord, 111 melody notes.

- nothing stands out

## Heroic Game (`heroic`)

148, 145, 151 bpm; C dorian, A# harmonicMinor, A# dorian. Layers: 380 bass, 604 chord, 149 melody notes.

- nothing stands out

## Synthwave (`synthwave`)

111, 111, 118 bpm; G# minor, A# minor, F# dorian. Layers: 261 bass, 728 chord, 109 melody notes.

- ⚠ 58% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Arcade Attract (`arcade`)

143, 158, 156 bpm; E dorian, F# major, A minor. Layers: 183 bass, 104 chord, 182 melody notes.

- ⚠ 66% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo
- ~ the bass let off the chord: the marching bass steps down through the scale

## Cyborg Pulse (`cyborg`)

110, 112, 102 bpm; D phrygian, G# phrygian, F harmonicMinor. Layers: 543 bass, 356 chord, 115 melody notes.

- ~ clashes let off: an odd-metre machine score: tension is the point

## Derelict Ship (`derelict`)

67, 72, 70 bpm; F# phrygian, D# harmonicMinor, F# harmonicMinor. Layers: 17 bass, 94 chord, 48 melody notes.

- ~ clashes let off: the half-step above the root is the dread it is built on
- ~ the bass let off the chord: a drone holds the tonic under the moving chords (a pedal)

## Synth-Pop (`synthpop`)

113, 117, 120 bpm; E minor, F minor, C# minor. Layers: 275 bass, 499 chord, 153 melody notes.

- ⚠ 68% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Star Pilot (`starpilot`)

149, 151, 147 bpm; F minor, D minor, E minor. Layers: 375 bass, 961 chord, 182 melody notes.

- ⚠ 11.7% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it
- ⚠ 50% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Tracker Jazz (`modjazz`)

110, 114, 107 bpm; D mixolydian, C# minor, C# mixolydian. Layers: 129 bass, 456 chord, 127 melody notes.

- ⚠ the melody reaches E6 - shrill on a sustained lead
- ⚠ 26% of melodic moves leap wider than a third
- ⚠ 4.7% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it
- ⚠ the flute:real strays 10 dB on average from a flute (A5, on paula): -18 -13 -26 -35 -37 where the real one has -24 -29 -40 -42 -44 - UNSW Music Acoustics, flute spectra (modern B-foot flute, G4 and A5)
- ~ the bass let off the chord: a walking bass leaves the chord on purpose, and approaches the next root by a half-step

## FM Metal (`fmmetal`)

167, 176, 157 bpm; D# minor, G minor, D# minor. Layers: 709 bass, 1232 chord, 172 melody notes.

- ⚠ 5.0% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it
- ⚠ 51% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## MIDI Quest (`midiquest`)

94, 98, 105 bpm; E mixolydian, C dorian, C dorian. Layers: 13 bass, 485 chord, 98 melody notes.

- nothing stands out

## Chip Rock and Roll (`rocknroll`)

175, 152, 155 bpm; C# major, A major, E major. Layers: 453 bass, 1781 chord, 190 melody notes.

- ⚠ 65% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo
- ~ the bass let off the chord: a boogie bass walks the sixth and seventh

## ST Buzz (`stchip`)

132, 125, 125 bpm; F# harmonicMinor, G harmonicMinor, E dorian. Layers: 243 bass, 95 chord, 113 melody notes.

- nothing stands out

## Keygen (`keygen`)

135, 140, 125 bpm; E minor, A dorian, E dorian. Layers: 353 bass, 275 chord, 180 melody notes.

- ⚠ 3% of bass notes rub a minor second against a chord tone sounding

## Trip-Hop (`triphop`)

82, 81, 69 bpm; F# harmonicMinor, D phrygian, C# minor. Layers: 71 bass, 319 chord, 33 melody notes.

- ⚠ 4% of bass notes rub a minor second against a chord tone sounding

## Anime Opening (`animeop`)

162, 154, 169 bpm; A# major, G major, D major. Layers: 478 bass, 631 chord, 286 melody notes; sections intro, verse, pre, chorus, bridge, last, outro.

- ⚠ 68% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Skate Punk (`skatepunk`)

197, 183, 183 bpm; G# major, D major, A# major. Layers: 443 bass, 956 chord, 286 melody notes; sections intro, verse, pre, chorus, bridge, last, outro.

- ⚠ only 30% of its two-bar phrases come back - little to remember
- ⚠ the melody sits -5.6 dB against the chords - buried
- ⚠ 23.8% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it
