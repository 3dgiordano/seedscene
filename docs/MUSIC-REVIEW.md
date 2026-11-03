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
measures. A style whose melody plays a variant of its own (the first
violins among the strings) has only that variant for its melody, and a
section doubling the melody an octave below is left out rather than taken
for a chord (2026-11-02, for the orchestral tracker). It then measures:

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
| Stuck notes | a line standing still: one pitch struck a third time running | 2% of melody notes | warns at 6%, never fails (owner-approved styles go past it) |
| Off the grid | notes out of time (styles without swing) | 1% of onsets | 5% |
| The echo | a delay landing between the eighths a melody sits on | - | warns at level 0.04, fails at 0.1 |
| Echo rubs | an echo landing a tone or a semitone from the melody note then sounding (judged where the echo is heard, level 0.04 or more) | 40% of echoes | warns at 50%, never fails |
| Melody against chords | a buried melody, rendered on the first chip the style is heard on | -3 dB | -8 dB |
| Sound against the real one | a melody instrument that does not sound like the instrument it imitates, held against a measured spectrum of the real one, on every chip of its eras and of the scenes it plays with there | 9 dB on average at its worst point | 13 dB |
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
   other style (their sound byte for byte, hashed before and after).
4. Audit again; repeat until nothing fails that the style does not mean.
5. **The reviewer** (below) reviews it - every new style and every change -
   and what it finds is fixed, or handed over as a question, before the owner
   hears it.
6. Hand over with a table, before and after, and a taste to listen to.
7. The owner listens. The audit finds what can be measured; whether it sounds
   like its genre and is good to listen to is the owner's ear.
8. When the owner hears a fault the audit passed, find how to measure it and
   add the check - tried on the version the owner turned down (it must
   fail) and on the one put right (it must pass) - so the next style is
   caught before it reaches the owner.

## The reviewer

The audit checks rules; a listener hears more. Since 2026-11-02 every new or
changed style is also reviewed by a subagent, `music-reviewer`
(`.claude/agents/music-reviewer.md`), before the owner listens: it cannot hear,
so it reads the score and measures the rendered audio, against a checklist of
what the owner has heard by ear - a messy line, a whistle up high, a hiss, a
part buried or swamping, a genre missed, a roll limping, a phrase that never
changes, dead air, what a chip drops. Its first review, of round 5's five styles, found
everything the owner heard. Its tools are the project's, so no review starts
from nothing:

```bash
npm run review:music -- layers <style>     # each part: register, density, grid; each layer's level, highs, time sounding; the lead in its own band
npm run review:music -- stack <style>      # how often the accompaniment sits at or above the lead
npm run review:music -- spectrum <style> --instr <name>   # an instrument's energy by band
npm run review:music -- fills <style>      # fills, rolls, risers, crashes: where, how loud, how far off the grid
npm run review:music -- probe <style> --instr <name>      # one event alone: how long, whether it swells or clicks
npm run review:music -- gaps <style>       # dead air: stretches where everything stops, and what still sounds
```

Each runs on every chip of the style's eras and the audit's three seeds unless
given `--chip` (`hifi` for the synthesizer's own voices) or `--seeds`. The
reviewer reports, per style, the likely audible problems with their evidence,
its confidence and a one-line fix, and what it could not judge without ears.
When the owner hears something it missed, the measurement that would have shown
it goes into the tools and the fault into its checklist.

## The SID, reviewed (2026-11-02)

A new board rather than a new style: the reviewer heard the four styles of
1982–1989 on the C64's SID against the YM2149 and the studio. It found the
hats almost silent and the open hat a tick (-35 to -41 dB against the mix; the
YM's -17 to -27), a DC offset under every pulse voice, the lead 2-3.5 dB lower
against the rest than on the YM, the dance kick and clap thin, the sync lead
lost, and ST buzz's buzzer turned into a filtered pulse. Put right on the chip
alone: hats louder and their high-pass lowered from about 9 kHz to 4.4, an open hat of its own, the lead's
sustain up and chords stepped as arpeggios set under it, the output
AC-coupled, a longer kick for the dance kit, a fuller clap, the sync lead
louder, and an unfiltered sawtooth for the buzz bass. After: italo's hats
-18 dB, its clap's peak -7.6 dBFS (was -20.7), the lead +1.0 dB in its own
band (was -0.7); chiptune's lead -0.2 dB (was -3.1); the buzz bass's highs
index 0.15 (was 0.01; on the YM 0.28). The dance kick stays under the YM's
(-4.3 dB against -0.7): the owner's ear decides.

## What it cannot judge

Feel, taste, whether a groove swings or a melody is catchy rather than merely
correct. Its numbers are evidence for the owner's ear, not a replacement.
