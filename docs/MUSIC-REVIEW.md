# Reviewing the music

Every music style is reviewed as music before the owner listens to it: from
its score, by the music audit, then by ear. Agreed with the owner on
2026-10-31, after two styles reached the owner with faults the score already showed
(the anime opening's melody up to G7, leaping on every chord; skate punk's
guitars a major third off the harmony).

## When

- **A new style**: audit it before it is handed over.
- **A change to a style**: audit it again before and after, and show both.
- **The styles already built**: audited once (`docs/MUSIC-AUDIT.md`), then
  put right one at a time, as the owner chooses.

## How

```bash
npm run audit:music -- <style> [<style> ...]
```

With no style it audits all of them. `--seeds a,b,c` and `--duration 90`
choose what it composes (three seeds, ninety seconds by default);
`--no-mix` skips the rendered checks for a quick pass; `--out file.md` writes
the report; `--json` prints the numbers.

## What it checks

It splits the score into its layers - the bass, the chords (notes struck
and held together, and arpeggios), the melody (the lead role's single notes,
a note struck with a chord but held its own length among them) - and
measures:

| Check | What it catches | Pass | Warn |
|---|---|---|---|
| Bass in the chord | a chord instrument on the wrong root (the "noteOf(40)" guitars) | 85% of chord changes | 60% |
| Bass rubs | a bass note outside the chord, a semitone from a chord tone | 3% of bass notes | 10% |
| Melody on the beat | the line off the harmony where it is heard most | 80% chord tones | 60% |
| Held melody notes | long notes off the chord | 85% chord tones | 65% |
| Held rubs | long notes a semitone from the harmony | 5% | 15% |
| Top note | a shrill lead | up to C6 | G6 |
| Range | more than a line can carry | 24 semitones | 31 |
| Leaps | a line that jumps instead of moving | 20% wider than a third, 3% wider than a sixth | 35%, 8% |
| Repeats | nothing to remember | 30% of two-bar phrases heard again | 10% |
| Stuck notes | a line standing still: one pitch struck a third time running | 2% of melody notes | 6% |
| Off the grid | notes out of time (styles without swing) | 1% of onsets | 5% |
| The echo | a delay landing between the eighths a melody sits on | - | warns at level 0.04, fails at 0.1 |
| Echo rubs | an echo landing a tone or a semitone from the melody note then sounding (judged where the echo is heard, level 0.04 or more) | 40% of echoes | 50% |
| Melody against chords | a buried melody, rendered on the style's chip | -3 dB | -8 dB |
| Sound against the real one | a melody instrument that does not sound like the instrument it imitates, held against a measured spectrum of the real one, on every chip of its eras | 9 dB on average at its worst point | 13 dB |
| Peak, invalid samples | clipping, broken audio | -1 dBFS, none | -0.3 |
| Speed | too slow for two tracks at once in AUTOPLAY | 3x real time | 2x |

A style can be let off a check where the clash is the point, with the reason
written in the tool (`EXEMPT` in `tools/music-audit.js`): the derelict ship's
half-step, the cyborg score's tension, a walking or boogie bass leaving the
chord, trance's dotted-eighth delay between its lead's eighths.

## The real instruments

A synthesizer's flute or brass can be in tune, on the chord and in the
right register and still not sound like a flute or brass: the owner heard
that twice (MIDI quest's flute a whistle, cyborg's brass a saw) before the
audit could. So the melody instrument is rendered alone, a held note at a
few pitches and loudnesses, on every chip its style plays on, and its
harmonics compared with a real player's, point by point, in dB. The
references live in `tools/timbre-refs.js`, each read off a published,
measured spectrum and naming its source - never drawn from memory:

- **Flute** - a modern flute at G4 and A5 (UNSW Music Acoustics): rich low
  down, the third harmonic nearly as loud as the fundamental; nearly a sine
  an octave and a half up.
- **Brass** - a trombone's crescendo, soft and loud (UNSW Music Acoustics):
  mellow soft, the high harmonics rising far more than the low ones as it
  grows loud - and that change itself is checked.

An instrument with no reference is not judged (· in the report). When the
owner hears an instrument that sounds wrong, find a measured reference for
it, add it, and let the audit catch the next one.

## The loop

1. Audit. Read the findings worst first.
2. Find the cause in the composer, not just the symptom.
3. Fix it, in the style's own code; a shared change is checked against every
   other style (their sound byte for byte, `tools` hashes).
4. Audit again; repeat until nothing fails that the style does not mean.
5. Hand over with a table, before and after, and a taste to listen to.
6. The owner listens. The audit finds what can be measured; whether it sounds
   like its genre and is good to listen to is the owner's ear.
7. When the owner hears a fault the audit passed, find how to measure it and
   add the check - tried on the version the owner turned down (it must
   fail) and on the one put right (it must pass) - so the next style is
   caught before it reaches the owner.

## What it cannot judge

Feel, taste, whether a groove swings or a melody is catchy rather than merely
correct. Its numbers are evidence for the owner's ear, not a replacement.
