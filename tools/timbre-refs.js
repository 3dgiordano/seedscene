// Real instruments, measured: what the music audit holds the synthesizer's imitations against.
//
// Each reference is read off a published spectrum of a real player on a real instrument - not from
// memory - and says where it came from. A style's melody instrument that has a reference here is
// rendered on every chip of its eras and its harmonics compared with these, point by point, in dB.
// An instrument with no reference is not judged: add one, with its source, before judging it.

export const TIMBRE_REFS = {
  // A modern flute (B foot), its sound spectrum at two notes: harmonics 2 to 6 against the fundamental.
  // University of New South Wales, Music Acoustics, flute: modernB/G4.html and modernB/A5.html.
  // Rich low down - the third harmonic nearly as loud as the fundamental - and nearly a sine an octave
  // and a half higher.
  flute: {
    name: 'a flute',
    source: 'UNSW Music Acoustics, flute spectra (modern B-foot flute, G4 and A5)',
    kind: 'harmonics',
    points: [
      { label: 'G4', note: 67, vel: 0.6, db: [-12, -3, -17, -21, -27] },
      { label: 'A5', note: 81, vel: 0.6, db: [-24, -29, -40, -42, -44] },
    ],
  },
  // A trombone's crescendo on one note: the spectrum over its first (soft) and last (loud) 0.3 s, read at
  // 0.25 to 2.5 kHz, each against its own loudest harmonic. UNSW Music Acoustics, brassacoustics.html
  // (crescendo.jpg). Mellow when soft; loud, the high harmonics rise far more than the low ones. (Soft, past
  // a kilohertz the figure shows only its noise floor, so those points are not read: null.) And the change
  // itself is checked - how much brighter loud is than soft, point by point - since that is what the page
  // says brass does.
  brass: {
    name: 'a trombone',
    source: 'UNSW Music Acoustics, brass acoustics (a trombone crescendo, soft and loud)',
    kind: 'bands',
    freqs: [250, 500, 1000, 1500, 2000, 2500],
    points: [
      { label: 'soft', note: 57, vel: 0.3, db: [-4, -16, -30, null, null, null] },
      { label: 'loud', note: 57, vel: 0.9, db: [-4, 0, -14, -22, -30, -40] },
    ],
    dynamics: ['soft', 'loud'],
  },
};
