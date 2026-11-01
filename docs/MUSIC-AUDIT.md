# Music audit

Seeds aurora, hikari, seedscene; 90 s each; 2026-11-01. ✓ pass, ⚠ warn, ✗ fail, ~ let off by the style, · not measured. Run `npm run audit:music -- <style>` for one style.

| style | bass in chord | bass rubs | melody on beat | held | held rubs | top | range | leaps >3rd | >6th | repeats | stuck | off grid | echo rubs | melody vs chords | sound vs real | peak | speed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `dreamwave` | ⚠ 78% | ✓ 3% | ✗ 54% | ✗ 54% | ✗ 22% | ✗ A7 | ✓ 24 | ✗ 44% | ✗ 9% | ⚠ 11% | ✓ 0.6% | · swung | ✓ 34% | ⚠ -5.8 dB | · - | ✓ -1.9 | ✓ 4.7x |
| `chiptune` | ✓ 99% | ✓ 0% | ✗ 48% | · - | · - | ✗ B8 | ✗ 36 | ✗ 58% | ✗ 44% | ✓ 66% | ⚠ 3.9% | ✓ 0.0% | ✓ 18% | ✓ -2.1 dB | · - | ✓ -2.1 | ✓ 19.8x |
| `acid` | ✓ 96% | ✓ 1% | · - | · - | · - | · - | · - | · - | · - | · - | · - | ✓ 0.0% | · - | · - | · - | ✓ -2.0 | ✓ 5.5x |
| `trance` | ✓ 87% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 12 | ✓ 2% | ✓ 0% | ✓ 77% | ✓ 0.8% | ✓ 0.0% | ⚠ 58% | ✓ -2.0 dB | · - | ✓ -1.9 | ✓ 5.6x |
| `rave` | ✓ 100% | ✓ 0% | ✗ 20% | · - | · - | ✗ G7 | ✓ 17 | ⚠ 28% | ✓ 3% | ✓ 64% | ✓ 0.0% | ✓ 0.0% | ⚠ 42% | ✗ -12.4 dB | · - | ✓ -1.9 | ✓ 4.1x |
| `jungle` | ✓ 99% | ✓ 0% | ⚠ 68% | ⚠ 68% | ⚠ 13% | ✗ D7 | ✓ 17 | ⚠ 27% | ✓ 2% | ✓ 91% | ✓ 1.9% | ✓ 0.0% | ⚠ 42% | ✓ 3.0 dB | · - | ✓ -2.1 | ✓ 4.4x |
| `hardcore` | ✓ 87% | ✓ 0% | ⚠ 73% | · - | · - | ✗ C9 | ✗ 35 | ✗ 38% | ✗ 10% | ✓ 76% | ✓ 0.0% | ✓ 0.0% | ✓ 37% | ✗ -9.7 dB | · - | ✓ -1.8 | ✓ 3.4x |
| `newbeat` | ✓ 95% | ⚠ 4% | ✗ 58% | ✗ 54% | ✗ 33% | ⚠ C#6 | ✓ 19 | ⚠ 27% | ✗ 8% | ✓ 69% | ✓ 0.0% | ✓ 0.0% | ⚠ 61% | ✓ -0.1 dB | ⚠ 11 dB brass | ✓ -1.9 | ⚠ 2.5x |
| `eurodance` | ⚠ 75% | ✓ 0% | ⚠ 63% | ✗ 63% | ⚠ 9% | ✗ C#8 | ✓ 22 | ⚠ 30% | ⚠ 8% | ✓ 50% | ⚠ 9.5% | ✓ 0.0% | ✓ 29% | ✗ -14.0 dB | · - | ✓ -2.0 | ✓ 4.1x |
| `gabber` | · - | · - | ✗ 42% | · - | · - | ✗ G8 | ⚠ 31 | ✗ 38% | ✗ 11% | ✓ 64% | ⚠ 3.8% | ✓ 0.0% | ✓ 37% | ✗ -11.4 dB | · - | ✓ -2.0 | ✓ 6.4x |
| `ambient` | ✓ 99% | ✓ 0% | ⚠ 77% | ⚠ 80% | ⚠ 9% | ✗ E8 | ✗ 34 | ✗ 65% | ✗ 42% | ✗ 8% | ✓ 0.0% | ✓ 0.0% | ✓ 30% | ✓ 1.2 dB | · - | ✓ -2.9 | ✓ 4.0x |
| `orchestral` | ✓ 92% | ✓ 0% | ⚠ 70% | ✗ 62% | ⚠ 11% | ✗ B6 | ⚠ 26 | ⚠ 35% | ✗ 11% | ✓ 42% | ⚠ 6.8% | ✓ 0.0% | ✓ 19% | ✗ -9.3 dB | ⚠ 11 dB brass | ✓ -2.2 | ✓ 4.7x |
| `gameboy` | ✓ 98% | ✓ 2% | ✓ 80% | · - | · - | ✗ F#8 | ✗ 34 | ✗ 59% | ✗ 34% | ✓ 84% | ⚠ 3.0% | ✓ 0.0% | ✓ 24% | ✓ -1.9 dB | · - | ✓ -2.2 | ✓ 16.4x |
| `heroic` | ✓ 99% | ✓ 0% | ✗ 56% | · - | · - | ✗ D#8 | ✗ 32 | ✗ 37% | ✗ 16% | ✓ 63% | ✓ 1.1% | ✓ 0.0% | ✓ 20% | ✓ 0.0 dB | · - | ✓ -2.2 | ✓ 4.3x |
| `synthwave` | ✓ 98% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ C6 | ✓ 12 | ✓ 3% | ✓ 0% | ✓ 61% | ✓ 0.0% | ✓ 0.0% | ⚠ 58% | ✓ -2.6 dB | · - | ✓ -2.4 | ✓ 5.8x |
| `arcade` | ~ 82% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 12 | ✓ 1% | ✓ 0% | ✓ 91% | ✓ 0.0% | ✓ 0.0% | ⚠ 66% | ✓ -0.4 dB | · - | ✓ -2.3 | ✓ 15.3x |
| `cyborg` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ C5 | ✓ 8 | ✓ 10% | ✓ 0% | ✓ 57% | ✓ 0.0% | ✓ 0.0% | ✓ 32% | ✓ -1.0 dB | ✓ 5 dB brass | ✓ -2.1 | ✓ 7.0x |
| `derelict` | ~ 12% | ~ 41% | ⚠ 68% | ✗ 62% | ~ 23% | ✗ G7 | ✓ 20 | ⚠ 33% | ✓ 3% | ✓ 33% | ⚠ 2.4% | ✓ 0.0% | ✓ 24% | ⚠ -7.0 dB | · - | ✓ -2.8 | ✓ 9.8x |
| `synthpop` | ✓ 100% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 13 | ✓ 15% | ✓ 0% | ✓ 80% | ✓ 0.0% | ✓ 0.0% | ⚠ 68% | ✓ -2.3 dB | · - | ✓ -2.3 | ✓ 5.5x |
| `starpilot` | ✓ 99% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G5 | ✓ 12 | ✓ 5% | ✓ 0% | ✓ 82% | ⚠ 11.7% | ✓ 0.0% | ⚠ 50% | ✓ 1.6 dB | ✓ 7 dB brass | ✓ -2.3 | ✓ 3.0x |
| `modjazz` | ~ 77% | ~ 30% | ✓ 100% | ✓ 89% | ✓ 5% | ⚠ E6 | ✓ 15 | ⚠ 26% | ✓ 0% | ✓ 58% | ⚠ 4.7% | · swung | ✓ 17% | ✓ -2.4 dB | ⚠ 10 dB flute | ✓ -2.6 | ✓ 5.5x |
| `fmmetal` | ✓ 99% | ✓ 0% | ✓ 93% | ✓ 95% | ✓ 5% | ✓ F#5 | ✓ 11 | ✓ 4% | ✓ 0% | ✓ 88% | ⚠ 5.0% | ✓ 0.0% | ⚠ 51% | ✓ -2.6 dB | · - | ✓ -1.9 | ✓ 3.4x |
| `midiquest` | ✓ 88% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 12 | ✓ 6% | ✓ 1% | ✓ 73% | ✓ 0.0% | ✓ 0.0% | ✓ 31% | ✓ -2.6 dB | ✓ 6 dB flute | ✓ -3.4 | ✓ 3.5x |
| `rocknroll` | ~ 74% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ B5 | ✓ 12 | ✓ 2% | ✓ 0% | ✓ 82% | ✓ 0.0% | · swung | ⚠ 65% | ✓ 1.6 dB | · - | ✓ -1.9 | ✓ 4.4x |
| `keygen` | ✓ 98% | ⚠ 4% | ✓ 100% | ✓ 100% | ✓ 0% | ✗ G7 | ✓ 24 | ✗ 49% | ⚠ 8% | ✓ 91% | ✓ 0.0% | ✓ 0.0% | · - | ✓ -1.4 dB | · - | ✓ -2.0 | ✓ 10.8x |
| `triphop` | ✓ 97% | ⚠ 4% | ✓ 100% | ⚠ 68% | ✗ 26% | ⚠ G6 | ✓ 19 | ✗ 39% | ✓ 2% | ✓ 34% | ✓ 0.0% | · swung | ⚠ 54% | ✓ 3.3 dB | · - | ✓ -2.5 | ✓ 4.3x |
| `animeop` | ✓ 98% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ G#5 | ✓ 22 | ✓ 10% | ✓ 1% | ✓ 43% | ✓ 0.2% | ✓ 0.0% | ⚠ 68% | ✓ -2.8 dB | · - | ✓ -2.0 | ✓ 3.7x |
| `skatepunk` | ✓ 92% | ✓ 0% | ✓ 100% | ✓ 100% | ✓ 0% | ✓ D5 | ✓ 8 | ✓ 1% | ✓ 0% | ⚠ 30% | ⚠ 23.8% | ✓ 0.0% | ✓ 3% | ⚠ -5.6 dB | · - | ✓ -2.0 | ✓ 3.4x |

## Dreamwave (`dreamwave`)

91, 113, 97 bpm; F phrygian, A# lydian, C# phrygian. Layers: 169 bass, 341 chord, 120 melody notes.

- ✗ only 54% of melody notes on the beat are chord tones
- ✗ only 54% of held melody notes are chord tones
- ✗ 22% of held melody notes rub a semitone against the harmony
- ✗ the melody reaches A7 - shrill on a sustained lead
- ✗ 9% of melodic moves leap wider than a sixth
- ✗ 44% of melodic moves leap wider than a third
- ⚠ the bass's note is in the chord at 78% of chord changes - a chord instrument may stand on the wrong root
- ⚠ only 11% of its two-bar phrases come back - little to remember
- ⚠ 1.5% of onsets fall off the sixteenth grid
- ⚠ the melody sits -5.8 dB against the chords - buried

## C64 Chiptune (`chiptune`)

134, 134, 148 bpm; D harmonicMinor, B minor, B harmonicMinor. Layers: 338 bass, 95 chord, 272 melody notes.

- ✗ only 48% of melody notes on the beat are chord tones
- ✗ the melody reaches B8 - shrill on a sustained lead
- ✗ the melody spans 36 semitones - more than a singer's line
- ✗ 44% of melodic moves leap wider than a sixth
- ✗ 58% of melodic moves leap wider than a third
- ⚠ 3.9% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it

## Acid (`acid`)

125, 134, 128 bpm; F# phrygian, D# dorian, A minor. Layers: 483 bass, 432 chord, 0 melody notes.

- ~ the bass let off the chord: a 303 line weaves round the root
- · no melody found to analyse

## Trance (`trance`)

136, 138, 135 bpm; C# minor, G# harmonicMinor, D# minor. Layers: 164 bass, 1611 chord, 128 melody notes.

- ⚠ 58% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo
- ~ the echo (3 sixteenths, level 0.242) between the melody's eighths let off: the dotted-eighth delay is the genre's own: it fills the sixteenths between the lead's eighths

## Amiga Rave (`rave`)

139, 146, 149 bpm; G phrygian, A phrygian, C minor. Layers: 133 bass, 751 chord, 116 melody notes.

- ✗ only 20% of melody notes on the beat are chord tones
- ✗ the melody reaches G7 - shrill on a sustained lead
- ✗ the melody sits -12.4 dB against the chords - buried
- ✗ the echo (3 sixteenths, level 0.144) falls between the eighths the melody sits on
- ⚠ 28% of melodic moves leap wider than a third
- ⚠ 42% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Jungle (`jungle`)

165, 169, 169 bpm; F# minor, A# minor, B minor. Layers: 104 bass, 260 chord, 237 melody notes.

- ✗ the melody reaches D7 - shrill on a sustained lead
- ⚠ only 68% of melody notes on the beat are chord tones
- ⚠ only 68% of held melody notes are chord tones
- ⚠ 13% of held melody notes rub a semitone against the harmony
- ⚠ 27% of melodic moves leap wider than a third
- ⚠ 42% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Happy Hardcore (`hardcore`)

180, 171, 177 bpm; A lydian, A# minor, F# major. Layers: 226 bass, 1665 chord, 183 melody notes.

- ✗ the melody reaches C9 - shrill on a sustained lead
- ✗ the melody spans 35 semitones - more than a singer's line
- ✗ 10% of melodic moves leap wider than a sixth
- ✗ 38% of melodic moves leap wider than a third
- ✗ the melody sits -9.7 dB against the chords - buried
- ✗ the echo (3 sixteenths, level 0.198) falls between the eighths the melody sits on
- ⚠ only 73% of melody notes on the beat are chord tones

## New Beat (`newbeat`)

112, 108, 108 bpm; F# phrygian, C phrygian, C# phrygian. Layers: 544 bass, 389 chord, 154 melody notes.

- ✗ only 58% of melody notes on the beat are chord tones
- ✗ only 54% of held melody notes are chord tones
- ✗ 33% of held melody notes rub a semitone against the harmony
- ✗ 8% of melodic moves leap wider than a sixth
- ✗ the echo (3 sixteenths, level 0.15) falls between the eighths the melody sits on
- ⚠ 4% of bass notes rub a minor second against a chord tone sounding
- ⚠ the melody reaches C#6 - shrill on a sustained lead
- ⚠ 27% of melodic moves leap wider than a third
- ⚠ renders at 2.5x real time on its slowest chip - too slow for two tracks at once
- ⚠ 61% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo
- ⚠ the brass strays 11 dB on average from a trombone (soft to loud, on paula): 0 0 0 0 0 0 where the real one has 0 16 16 - - - - UNSW Music Acoustics, brass acoustics (a trombone crescendo, soft and loud)

## Eurodance (`eurodance`)

130, 131, 126 bpm; C major, B major, B dorian. Layers: 199 bass, 1257 chord, 134 melody notes.

- ✗ only 63% of held melody notes are chord tones
- ✗ the melody reaches C#8 - shrill on a sustained lead
- ✗ the melody sits -14.0 dB against the chords - buried
- ⚠ the bass's note is in the chord at 75% of chord changes - a chord instrument may stand on the wrong root
- ⚠ only 63% of melody notes on the beat are chord tones
- ⚠ 9% of held melody notes rub a semitone against the harmony
- ⚠ 8% of melodic moves leap wider than a sixth
- ⚠ 30% of melodic moves leap wider than a third
- ⚠ 9.5% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it

## Gabber (`gabber`)

176, 179, 179 bpm; A minor, D harmonicMinor, C minor. Layers: 0 bass, 297 chord, 245 melody notes.

- ✗ only 42% of melody notes on the beat are chord tones
- ✗ the melody reaches G8 - shrill on a sustained lead
- ✗ 11% of melodic moves leap wider than a sixth
- ✗ 38% of melodic moves leap wider than a third
- ✗ the melody sits -11.4 dB against the chords - buried
- ✗ the echo (3 sixteenths, level 0.154) falls between the eighths the melody sits on
- ⚠ the melody spans 31 semitones - more than a singer's line
- ⚠ 3.8% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it

## Ambient Techno (`ambient`)

97, 95, 103 bpm; D# dorian, F dorian, A lydian. Layers: 79 bass, 133 chord, 224 melody notes.

- ✗ the melody reaches E8 - shrill on a sustained lead
- ✗ the melody spans 34 semitones - more than a singer's line
- ✗ 42% of melodic moves leap wider than a sixth
- ✗ 65% of melodic moves leap wider than a third
- ✗ only 8% of its two-bar phrases come back - little to remember
- ⚠ only 77% of melody notes on the beat are chord tones
- ⚠ only 80% of held melody notes are chord tones
- ⚠ 9% of held melody notes rub a semitone against the harmony

## Orchestral Tracker (`orchestral`)

112, 118, 113 bpm; F# minor, G# minor, A dorian. Layers: 17 bass, 672 chord, 154 melody notes.

- ✗ only 62% of held melody notes are chord tones
- ✗ the melody reaches B6 - shrill on a sustained lead
- ✗ 11% of melodic moves leap wider than a sixth
- ✗ the melody sits -9.3 dB against the chords - buried
- ✗ the echo (3 sixteenths, level 0.105) falls between the eighths the melody sits on
- ⚠ only 70% of melody notes on the beat are chord tones
- ⚠ 11% of held melody notes rub a semitone against the harmony
- ⚠ the melody spans 26 semitones - more than a singer's line
- ⚠ 35% of melodic moves leap wider than a third
- ⚠ 6.8% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it
- ⚠ the brass strays 11 dB on average from a trombone (soft to loud, on paula): 0 0 0 0 0 0 where the real one has 0 16 16 - - - - UNSW Music Acoustics, brass acoustics (a trombone crescendo, soft and loud)

## Handheld Chip (`gameboy`)

128, 134, 133 bpm; G# minor, A dorian, D# major. Layers: 328 bass, 92 chord, 270 melody notes.

- ✗ the melody reaches F#8 - shrill on a sustained lead
- ✗ the melody spans 34 semitones - more than a singer's line
- ✗ 34% of melodic moves leap wider than a sixth
- ✗ 59% of melodic moves leap wider than a third
- ⚠ 3.0% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it

## Heroic Game (`heroic`)

148, 145, 151 bpm; C dorian, A# harmonicMinor, A# dorian. Layers: 380 bass, 604 chord, 204 melody notes.

- ✗ only 56% of melody notes on the beat are chord tones
- ✗ the melody reaches D#8 - shrill on a sustained lead
- ✗ the melody spans 32 semitones - more than a singer's line
- ✗ 16% of melodic moves leap wider than a sixth
- ✗ 37% of melodic moves leap wider than a third

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

67, 72, 70 bpm; F# phrygian, D# harmonicMinor, F# harmonicMinor. Layers: 17 bass, 94 chord, 85 melody notes.

- ✗ only 62% of held melody notes are chord tones
- ✗ the melody reaches G7 - shrill on a sustained lead
- ⚠ only 68% of melody notes on the beat are chord tones
- ⚠ 33% of melodic moves leap wider than a third
- ⚠ the melody sits -7.0 dB against the chords - buried
- ⚠ 2.4% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it
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

## Keygen (`keygen`)

135, 140, 125 bpm; E minor, A dorian, E dorian. Layers: 353 bass, 379 chord, 284 melody notes.

- ✗ the melody reaches G7 - shrill on a sustained lead
- ✗ 49% of melodic moves leap wider than a third
- ⚠ 4% of bass notes rub a minor second against a chord tone sounding
- ⚠ 8% of melodic moves leap wider than a sixth

## Trip-Hop (`triphop`)

82, 81, 69 bpm; F# harmonicMinor, D phrygian, C# minor. Layers: 71 bass, 319 chord, 76 melody notes.

- ✗ 26% of held melody notes rub a semitone against the harmony
- ✗ 39% of melodic moves leap wider than a third
- ⚠ 4% of bass notes rub a minor second against a chord tone sounding
- ⚠ only 68% of held melody notes are chord tones
- ⚠ the melody reaches G6 - shrill on a sustained lead
- ⚠ 54% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Anime Opening (`animeop`)

162, 154, 169 bpm; A# major, G major, D major. Layers: 478 bass, 631 chord, 286 melody notes; sections intro, verse, pre, chorus, bridge, last, outro.

- ⚠ 68% of the melody's echoes land a step from the note then sounding - listen: a rub at every turn, or the genre's own echo

## Skate Punk (`skatepunk`)

197, 183, 183 bpm; G# major, D major, A# major. Layers: 443 bass, 956 chord, 286 melody notes; sections intro, verse, pre, chorus, bridge, last, outro.

- ⚠ only 30% of its two-bar phrases come back - little to remember
- ⚠ the melody sits -5.6 dB against the chords - buried
- ⚠ 23.8% of melody notes are struck a third time running on one pitch - listen: a line standing still, or a fanfare or a chant meaning it
