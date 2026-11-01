// Deterministic generative music engine.
//
// Two halves that must never disagree:
//   composeScore() turns a seed (and a music style) into a sample-exact list
//   of note events.
//   Synth renders those events by absolute sample index and holds no
//   wall-clock state, so the live AudioWorklet and the offline render produce
//   the same samples for the same seed.

import { Rng } from './rng.js';
import { buildChips, NEW_INSTR, NEW_SENDS } from './chips.js';

export const SAMPLE_RATE = 44100;
const SR = SAMPLE_RATE;
const TAU = Math.PI * 2;

const SCALES = {
  minor:         [0, 2, 3, 5, 7, 8, 10],
  dorian:        [0, 2, 3, 5, 7, 9, 10],
  phrygian:      [0, 1, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  lydian:        [0, 2, 4, 6, 7, 9, 11],
  major:         [0, 2, 4, 5, 7, 9, 11],
  mixolydian:    [0, 2, 4, 5, 7, 9, 10],
};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const PROGRESSIONS = [
  [0, 5, 3, 4], [0, 3, 4, 4], [0, 6, 5, 4], [0, 4, 5, 3],
  [5, 3, 0, 4], [0, 2, 5, 4], [0, 5, 1, 4], [3, 4, 0, 0],
];
// Anthemic loops for the big-room styles.
const ANTHEM = [[0, 5, 2, 6], [5, 3, 0, 4], [0, 6, 5, 6], [0, 3, 5, 4]];
// The chart-single loops, every one of them public property for sixty years.
const POP = [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [0, 3, 4, 4]];
// Twelve bars: I I I I  IV IV I I  V IV I V.
const TWELVE_BAR = [[0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4]];
// Space opera: the flat sixth and seventh climbing home to the minor root.
const EPIC = [[0, 5, 6, 0], [0, 6, 5, 6], [0, 3, 5, 6], [5, 6, 0, 0]];
// Slow and uneasy: the half-step above the root does the work.
const DREAD = [[0, 0, 1, 0], [0, 5, 0, 1], [0, 0, 6, 5]];
// jazz turnarounds: ii-V-I-vi, I-vi-ii-V, IV-iii-ii-V
const JAZZ = [[1, 4, 0, 5], [0, 5, 1, 4], [3, 2, 1, 4]];
// metal: the minor i with its VI and VII, the phrygian half-step, a darker walk
const METAL = [[0, 0, 5, 6], [0, 1, 0, 6], [0, 5, 3, 4]];
// three-chord punk: I-V-vi-IV, I-IV-V, and the ska punk turn through ii (V I ii IV)
const PUNK = [[0, 4, 5, 3], [0, 3, 4, 3], [4, 0, 1, 3], [0, 5, 3, 4]];
// the anison's chorus: the "Royal Road", IV-V-iii-vi, most of all
const ROYAL = [[3, 4, 2, 5], [3, 4, 2, 5], [3, 4, 0, 5], [0, 4, 5, 3]];
// noir: the minor i that will not move, the VI, the iv, a half-step of the spy films
const NOIR = [[0, 0, 5, 5], [0, 3, 0, 4], [0, 5, 3, 4], [0, 0, 1, 1]];

/**
 * Music styles. Each one picks its own drums, bass, chords, lead and arp
 * behaviour from the role implementations in composeScore, plus a tempo
 * range, the modes it likes and how wet it wants the mix.
 */
export const MUSIC_PRESETS = {
  dreamwave: {
    label: 'Dreamwave', blurb: 'mellow cracktro synths and lush pads',
    bpm: [84, 118], scales: ['minor', 'dorian', 'lydian', 'phrygian'],
    drums: 'classic', bass: 'walk', chords: 'pad', lead: 'lead', arp: 'arp',
    swing: 0.4, intro: 0.12, fx: { reverb: 1.15, delay: 1, delayBeats: 0.75 },
  },
  chiptune: {
    label: 'C64 Chiptune', blurb: 'SID-style pulse leads and 50 Hz arpeggio chords',
    bpm: [132, 158], scales: ['minor', 'harmonicMinor', 'dorian'],
    drums: 'chip', bass: 'octave', chords: 'chiparp', lead: 'chip', arp: null,
    swing: 0, intro: 0.04, fx: { reverb: 0.3, delay: 0.7, delayBeats: 0.5 },
  },
  acid: {
    label: 'Acid', blurb: 'squelching 303 lines over a 909',
    bpm: [124, 135], scales: ['minor', 'phrygian', 'dorian'],
    drums: 'four', bass: 'acid', chords: 'dubstab', lead: null, arp: null,
    swing: 0.3, intro: 0.04, fx: { reverb: 0.8, delay: 1.3, delayBeats: 0.75 },
  },
  trance: {
    label: 'Trance', blurb: 'gated supersaws, rolling offbeat bass, big builds',
    bpm: [134, 142], scales: ['minor', 'harmonicMinor'], progressions: ANTHEM,
    drums: 'trance', bass: 'offbeat', chords: 'gated', lead: 'hook', arp: 'pluck16',
    hook: { instr: 'supersaw', oct: 72, vel: 0.5, line: true },
    melody: { free: [1, 9], dense: [0.65, 0.65, 0.65], close: true, moving: true },
    swing: 0, intro: 0.06, fx: { reverb: 1.3, delay: 1.1, delayBeats: 0.75 },
  },
  rave: {
    label: 'Amiga Rave', blurb: '1992: breakbeats, hoovers and rave piano',
    bpm: [138, 150], scales: ['minor', 'phrygian', 'harmonicMinor'],
    drums: 'break', bass: 'sub', chords: 'hoover', lead: 'pianolead', arp: 'arp',
    swing: 0, intro: 0.04, fx: { reverb: 0.9, delay: 0.9, delayBeats: 0.75 },
  },
  jungle: {
    label: 'Jungle', blurb: 'chopped amen breaks over a rolling reese',
    bpm: [164, 174], scales: ['minor', 'dorian'],
    drums: 'amen', bass: 'reese', chords: 'pad', lead: 'lead', arp: null,
    swing: 0, intro: 0.05, fx: { reverb: 1.25, delay: 1, delayBeats: 0.75 },
  },
  hardcore: {
    label: 'Happy Hardcore', blurb: '175 bpm, piano stabs and screaming leads',
    bpm: [168, 180], scales: ['major', 'lydian', 'minor'], progressions: ANTHEM,
    drums: 'hardcore', bass: 'offbeat', chords: 'piano', lead: 'supersaw', arp: 'pluck16',
    swing: 0, intro: 0.04, fx: { reverb: 1, delay: 0.9, delayBeats: 0.75 },
  },
  newbeat: {
    label: 'New Beat', blurb: 'slow and heavy Belgian EBM: sequenced bass, big claps',
    bpm: [108, 120], scales: ['phrygian', 'minor'],
    drums: 'newbeat', bass: 'ebm', chords: 'dubstab', lead: 'brass', arp: null,
    swing: 0, intro: 0.04, fx: { reverb: 1.3, delay: 1, delayBeats: 0.75 },
  },
  eurodance: {
    label: 'Eurodance', blurb: 'hip-house organ bass, house piano, an anthem on top',
    bpm: [126, 136], scales: ['minor', 'dorian', 'major'], progressions: ANTHEM,
    drums: 'four', bass: 'organ', chords: 'piano', lead: 'lead', arp: 'pluck16',
    swing: 0, intro: 0.04, fx: { reverb: 1, delay: 0.9, delayBeats: 0.75 },
  },
  gabber: {
    label: 'Gabber', blurb: 'Rotterdam, 1993: a distorted kick and nothing to hide behind',
    bpm: [175, 190], scales: ['phrygian', 'minor', 'harmonicMinor'],
    drums: 'gabber', bass: null, chords: 'hoover', lead: 'supersaw', arp: null,
    swing: 0, intro: 0.03, fx: { reverb: 0.8, delay: 0.7, delayBeats: 0.75 },
  },
  ambient: {
    label: 'Ambient Techno', blurb: 'deep pads, FM bells, a heartbeat kick: the chill-out room',
    bpm: [92, 110], scales: ['dorian', 'lydian', 'minor'],
    drums: 'ambient', bass: 'sub', chords: 'ambientpad', lead: 'fmbell', arp: 'bell',
    swing: 0.2, intro: 0.15, fx: { reverb: 1.6, delay: 1.4, delayBeats: 0.75 },
  },
  orchestral: {
    label: 'Orchestral Tracker', blurb: 'strings, choir, timpani and brass, squeezed into four channels',
    bpm: [96, 120], scales: ['minor', 'harmonicMinor', 'dorian'], progressions: ANTHEM,
    drums: 'orchestral', bass: 'strings', chords: 'orchestra', lead: 'brass', arp: 'arp',
    swing: 0, intro: 0.08, fx: { reverb: 1.5, delay: 0.7, delayBeats: 0.75 },
  },
  gameboy: {
    label: 'Handheld Chip', blurb: 'two pulse channels, a 4-bit wave and noise',
    bpm: [120, 150], scales: ['major', 'minor', 'dorian'],
    drums: 'gb', bass: 'wave', chords: 'gbarp', lead: 'gbchip', arp: null,
    swing: 0, intro: 0.04, fx: { reverb: 0.15, delay: 0.5, delayBeats: 0.5 },
  },
  heroic: {
    label: 'Heroic Game', blurb: 'a hero on a mission: driving bass, brass, a lead that soars',
    bpm: [132, 152], scales: ['minor', 'dorian', 'harmonicMinor'], progressions: ANTHEM,
    drums: 'heroic', bass: 'octave8', chords: 'power', lead: 'hero', arp: 'arp',
    swing: 0, intro: 0.04, fx: { reverb: 1.1, delay: 0.9, delayBeats: 0.75 },
  },
  synthwave: {
    label: 'Synthwave', blurb: 'the modern revival: gated snares, octave bass, neon arps',
    bpm: [92, 118], scales: ['minor', 'dorian'],
    drums: 'synthwave', bass: 'octave8', chords: 'synthpad', lead: 'hook', arp: 'pluck16',
    hook: { instr: 'lead', oct: 72, vel: 0.5, line: true },
    melody: { free: [1, 9], dense: [0.6, 0.6, 0.6], close: true, moving: true },
    swing: 0, intro: 0.06, fx: { reverb: 1.4, delay: 1.3, delayBeats: 0.75 },
  },
  // --- tributes to the arcade, the cinema and the charts. Sounds and moods,
  //     never tunes: every melody below is written by the seed.
  arcade: {
    label: 'Arcade Attract', blurb: 'coin-op bleeps: a pulse hook, a marching bass, zaps and blips',
    bpm: [140, 165], scales: ['minor', 'dorian', 'major'],
    drums: 'arcade', bass: 'march', chords: 'chiparp', lead: 'hook', arp: null, sfx: true,
    hook: { instr: 'chip', oct: 72, vel: 0.5, line: true }, leadFrom: 0.15,
    melody: { free: [1, 9], dense: [0.65, 0.65, 0.65], close: true, moving: true },
    swing: 0, intro: 0.03, fx: { reverb: 0.35, delay: 0.8, delayBeats: 0.5 },
  },
  cyborg: {
    label: 'Cyborg Pulse', blurb: 'a mid-80s machine score: anvils in an odd metre, ostinato bass, dark brass',
    bpm: [96, 112], steps: 13, scales: ['harmonicMinor', 'minor', 'phrygian'],
    drums: 'cyborg', bass: 'ostinato', chords: 'power', lead: 'hook', arp: null,
    hook: { instr: 'brass', kit: 'real', oct: 60, vel: 0.6, hits: [3, 4], line: true, answer: true }, leadFrom: 0.3,
    melody: { free: [0, 5], dense: [0.5, 0.5, 0.5], hits: [0, 6, 8], pickup: 11, close: true, moving: 'always', home: 0 },
    power: { fifths: true, vel: 0.32 },            // (the stabs the root and the fifth, a little back: the brass line on top)
    swing: 0, intro: 0.06, fx: { reverb: 1.4, delay: 0.5, delayBeats: 2 },   // (a long echo, two beats on: a dotted one, or one a beat on, landed a step from the theme's next note)
  },
  derelict: {
    label: 'Derelict Ship', blurb: 'deep-space dread: drones, pings off the hull, a slow heartbeat',
    bpm: [64, 76], scales: ['phrygian', 'harmonicMinor'], progressions: DREAD,
    drums: 'heartbeat', bass: 'drone', chords: 'ambientpad', lead: 'fmbell', arp: null,
    swing: 0, intro: 0.15, fx: { reverb: 1.7, delay: 1.5, delayBeats: 0.75 },
  },
  synthpop: {
    label: 'Synth-Pop', blurb: 'the 80s chart single: gated drums, octave bass, a chorus you hum all day',
    bpm: [112, 124], scales: ['major', 'minor', 'dorian'], progressions: POP,
    drums: 'synthwave', bass: 'octave8', chords: 'synthpad', lead: 'hook', arp: 'arp',
    hook: { instr: 'lead', oct: 72, vel: 0.5, lift: true, line: true }, leadFrom: 0.15,
    melody: { free: [1, 9], dense: [0.65, 0.65, 0.65] },
    swing: 0, intro: 0.04, fx: { reverb: 1.2, delay: 1.1, delayBeats: 0.75 },
  },
  starpilot: {
    label: 'Star Pilot', blurb: '16-bit space opera: driving octave bass, a brass hook, orchestra hits, lasers in key',
    bpm: [140, 158], scales: ['minor', 'dorian'], progressions: EPIC,
    drums: 'heroic', bass: 'octave8', chords: 'orchhit', lead: 'hook', arp: 'arp', sfx: true,
    hook: { instr: 'brass', kit: 'real', oct: 72, vel: 0.68, lift: true, line: true }, leadFrom: 0.15,
    melody: { free: [1, 9], dense: [0.6, 0.6, 0.6], close: true },
    swing: 0, intro: 0.04, fx: { reverb: 1.2, delay: 0.8, delayBeats: 0.5 },   // (an echo on the eighths, under the brass line)
  },
  // --- the eras of better sound cards: tracker samples, FM and wavetable. Each
  //     brings its own instruments (an electric piano, a flute, a harp, an
  //     overdriven guitar, a slapped bass) and its own grooves.
  modjazz: {
    label: 'Tracker Jazz', blurb: 'a demo-party jazz tune: a walking slap bass, electric piano comping, a flute that improvises',
    bpm: [100, 126], scales: ['dorian', 'mixolydian', 'minor'], progressions: JAZZ, shuffle: 0.333,
    drums: 'jazz', bass: 'upright', chords: 'ep', lead: 'hook', arp: null,
    hook: { instr: 'flute', kit: 'real', oct: 72, vel: 0.55 }, leadFrom: 0.2,   // (a flute with a real flute's harmonics)
    swing: 0, intro: 0.06, fx: { reverb: 1.1, delay: 0.9, delayBeats: 0.75 },
  },
  fmmetal: {
    label: 'FM Metal', blurb: 'a DOS shooter at full tilt: palm-muted power chords, a double kick, a guitar that solos',
    bpm: [150, 178], scales: ['phrygian', 'minor', 'harmonicMinor'], progressions: METAL,
    drums: 'metal', bass: 'chug', chords: 'riff', lead: 'hook', arp: null,
    hook: { instr: 'guitar', kit: 'lead', oct: 64, vel: 0.6, hits: [5, 8], line: true }, leadFrom: 0.3,
    melody: { free: [0, 9], dense: [0.7, 0.7, 0.7], close: true },
    swing: 0, intro: 0.03, fx: { reverb: 0.8, delay: 0.6, delayBeats: 0.5 },   // (an echo on the eighths: a dotted one smears the solo)
  },
  midiquest: {
    label: 'MIDI Quest', blurb: 'an adventure on a sound card: strings, a harp, a flute and the timpani of a long road',
    bpm: [92, 112], scales: ['major', 'dorian', 'mixolydian', 'minor'], progressions: EPIC,
    drums: 'orchestral', bass: 'strings', chords: 'orchestra', lead: 'hook', arp: 'harp',
    hook: { instr: 'flute', kit: 'real', oct: 72, vel: 0.6, lift: true, line: true, answer: true }, leadFrom: 0.2,
    melody: { free: [1, 9], dense: [0.55, 0.55, 0.55], close: true, moving: true },
    orch: { noChoir: true },                       // (the strings hold the chord; no choir over the flute)
    swing: 0, intro: 0.08, fx: { reverb: 1.4, delay: 0.35, delayBeats: 1 },   // (a quiet echo on the beat: a dotted one rubbed the next note)
  },
  rocknroll: {
    label: 'Chip Rock and Roll', blurb: 'a 50s shuffle on a sound chip: boogie bass, twelve bars, a riff',
    bpm: [150, 176], scales: ['major'], progressions: TWELVE_BAR, shuffle: 0.333,   // (major: the blues' V is a major chord, mixolydian's minor)
    drums: 'rock', bass: 'boogie', chords: 'boogie', lead: 'hook', arp: null,
    hook: { instr: 'lead', kit: 'hero', oct: 72, vel: 0.46, line: true, bars: 12 }, leadFrom: 0.15,
    melody: { free: [0, 8], dense: [0.6, 0.6, 0.6], close: true, moving: true },
    swing: 0, intro: 0.03, fx: { reverb: 0.7, delay: 0.6, delayBeats: 0.5 },
  },
  // --- the crack intros' tracker music, from the pattern data of forty keygen
  //     modules: 125 bpm (the tracker's default) in most, the arpeggio effect's
  //     chords stepping on the tick, slides and vibrato on the lead, and in half
  //     of them a second channel echoing the lead a few rows later, quieter
  keygen: {
    label: 'Keygen', blurb: 'the crack intros\' tracker tunes: chords arpeggiated on the tick, a squelchy sliding lead and its echo, a bouncing bass',
    bpm: [120, 140], bpmPick: [125, 125, 125, 125, 125, 125, 128, 128, 120, 132, 135, 140, 140],
    scales: ['minor', 'harmonicMinor', 'dorian', 'major'], progressions: ANTHEM,
    drums: 'keygen', bass: 'bounce', chords: 'xmarp', lead: 'squelch', arp: null,
    hook: { hits: [7, 10] }, leadFrom: 0.12,
    swing: 0, intro: 0.04, fx: { reverb: 0.25, delay: 0.3, delayBeats: 0.75 },
  },
  // --- the 90s Bristol sound, from a trip-hop drum cheat sheet (the tempo, the
  //     kicks leading into the beats, two snares, the ride on the upbeats, the
  //     MPC shuffle, the drums pitched down in a big room, the crackle) and the
  //     genre's own description (a bass-heavy beat, film-score strings, a
  //     Rhodes, a theremin, turntable scratches)
  triphop: {
    label: 'Trip-Hop', blurb: 'the Bristol sound: a slow, shuffled break in a big room, a deep bass, dark strings, a Rhodes, a theremin, scratches, the crackle of the record',
    bpm: [68, 90], scales: ['minor', 'harmonicMinor', 'phrygian', 'dorian'], progressions: NOIR, mpc: 0.15,
    drums: 'triphop', bass: 'deep', chords: 'noir', lead: 'noir', arp: null,
    hook: { hits: [3, 5] }, leadFrom: 0.35,
    swing: 0, intro: 0.06, fx: { reverb: 1.5, delay: 1.0, delayBeats: 0.75 },
  },
  // --- the 90s anime opening: J-rock with brass in the anison's form - intro, verse,
  //     prechorus, chorus (a corpus study of openings finds almost all of them so,
  //     at about ninety seconds); the chorus often a minor third up from the verse,
  //     and the last chorus pumped up a step; 140-170 bpm (openings of the era
  //     measure 142 and 155); a big lead to sing along, brass doubling it
  animeop: {
    label: 'Anime Opening', blurb: 'the 90s anime opening: J-rock with brass, verse, prechorus, a chorus to sing along, a key change before the last one',
    bpm: [140, 170], scales: ['major', 'major', 'minor', 'harmonicMinor'], progressions: ROYAL, form: 'anime',
    drums: 'jrock', bass: 'jrock', chords: 'jrock', lead: 'anisong', arp: null,
    hook: { hits: [6, 9] },
    swing: 0, intro: 0.04, fx: { reverb: 0.9, delay: 0.6, delayBeats: 0.75 },
  },
  // --- the skateboarding games' punk: fast, 180-200 (the skate games' ska-punk
  //     single plays at about 195), ska verses - upstrokes on the off-beats over a
  //     backbeat - and punk choruses: the snare on every "and", the kick on the beat
  //     and the sixteenth after, doubled before the snare, the hats open; a lead like
  //     a shouted gang chorus, a few notes, chanted
  skatepunk: {
    label: 'Skate Punk', blurb: 'the skate games\' punk at 190: ska verses with upstrokes, punk choruses, a synth chorus shouted like a gang',
    bpm: [180, 200], scales: ['major', 'major', 'mixolydian', 'minor'], progressions: PUNK, form: 'punk',
    drums: 'skate', bass: 'skate', chords: 'skate', lead: 'shout', arp: null,
    melody: { verse: [0, 5], pre: [1, 6], chorus: [2, 7], bridge: [0, 5], dense: [0.55, 0.7, 0.85], square: true },
    swing: 0, intro: 0.03, fx: { reverb: 0.5, delay: 0.15, delayBeats: 0.5 },
  },
};
export const MUSIC_NAMES = Object.keys(MUSIC_PRESETS);

/** The music style a seed chooses for itself when none is asked for. */
export function pickMusic(seed) {
  return new Rng(seed, 'music-style').pick(MUSIC_NAMES);
}

// whole notes from a table - the same numbers, without a power per voice per sample
const FREQ = Float64Array.from({ length: 128 }, (_, m) => 440 * Math.pow(2, (m - 69) / 12));
export function midiToFreq(m) { return m >= 0 && m < 128 && (m | 0) === m ? FREQ[m] : 440 * Math.pow(2, (m - 69) / 12); }

/** Scale degree (may be negative or beyond the octave) -> semitones from root. */
function degreeToSemitone(scale, degree) {
  const n = scale.length;
  const oct = Math.floor(degree / n);
  return scale[((degree % n) + n) % n] + 12 * oct;
}

const ADJ = ['neon', 'hyper', 'crystal', 'velvet', 'cobalt', 'static', 'lunar',
  'chrome', 'ultra', 'phantom', 'amber', 'solar', 'void', 'azure'];
const NOUN = ['drift', 'circuit', 'horizon', 'cascade', 'vector', 'mirage', 'pulse',
  'lattice', 'echo', 'raster', 'spire', 'monolith', 'parallax', 'bitstream'];

function makeTitle(seed) {
  const r = new Rng(seed, 'title');
  return (r.pick(ADJ) + ' ' + r.pick(NOUN)).toUpperCase();
}

// Breakbeats, as [step, hit] with k = kick, s = snare, g = ghost snare.
const BREAKS = [
  [[0, 'k'], [4, 's'], [7, 'g'], [9, 'g'], [10, 'k'], [12, 's'], [15, 'g']],
  [[0, 'k'], [2, 'k'], [4, 's'], [6, 'g'], [10, 'k'], [12, 's'], [14, 'g']],
  [[0, 'k'], [4, 's'], [6, 'k'], [10, 'k'], [12, 's'], [13, 'g'], [14, 's']],
];
const AMENS = [
  [[0, 'k'], [2, 'k'], [4, 's'], [7, 'g'], [9, 's'], [10, 'k'], [11, 'k'], [12, 's'], [15, 'g']],
  [[0, 'k'], [2, 'k'], [4, 's'], [7, 'g'], [9, 's'], [10, 'k'], [14, 's'], [15, 's']],
  [[0, 'k'], [3, 'g'], [4, 's'], [6, 'k'], [7, 'g'], [9, 's'], [12, 's'], [13, 'g'], [14, 'k']],
];

/**
 * Turn a seed into a complete score.
 * @param {string|number} seed
 * @param {number} duration seconds
 * @param {string} [music] a MUSIC_PRESETS key, or 'auto' to let the seed choose
 */
/**
 * A score's tempo and metre without composing it: the first draw composeScore
 * makes, so a programme can line up a track it has not built yet.
 */
export function scoreTempo(seed, music = 'auto') {
  const style = !music || music === 'auto' ? pickMusic(seed) : music;
  const P = MUSIC_PRESETS[style];
  if (!P) throw new Error(`Unknown music style "${music}"`);
  const r = new Rng(seed, 'music:' + style);
  const bpm = P.bpmPick ? r.pick(P.bpmPick) : Math.round(r.float(P.bpm[0], P.bpm[1]));
  return { bpm, spb: 60 / bpm, barBeats: (P.steps || 16) / 4 };
}

/**
 * Compose a score. `chip` names the sound chip it will be played on (see
 * chips.js) - it changes how the notes sound, never which notes they are.
 */
export function composeScore(seed, duration, music = 'auto', chip = null) {
  const style = !music || music === 'auto' ? pickMusic(seed) : music;
  const P = MUSIC_PRESETS[style];
  if (!P) throw new Error(`Unknown music style "${music}". Available: ${MUSIC_NAMES.join(', ')}`);
  const rng = new Rng(seed, 'music:' + style);

  const bpm = P.bpmPick ? rng.pick(P.bpmPick) : Math.round(rng.float(P.bpm[0], P.bpm[1]));
  const root = rng.int(0, 11);
  const scaleName = rng.pick(P.scales);
  const scale = SCALES[scaleName];
  const progression = rng.pick(P.progressions || PROGRESSIONS);
  const swing = rng.bool(P.swing) ? rng.float(0.04, 0.12) : 0;

  const spb = 60 / bpm;               // seconds per beat
  const STEPS = P.steps || 16;         // sixteenths per bar: 13 is an odd metre
  const barSec = spb * STEPS / 4;
  const totalSamples = Math.round(duration * SR);
  const totalBars = Math.max(2, Math.ceil(duration / barSec));

  const events = [];
  const push = (timeSec, instr, note, vel, durSec, extra) => {
    const t = Math.round(timeSec * SR);
    if (t < 0 || t >= totalSamples) return;
    events.push({ t, instr, note, vel, dur: Math.round(durSec * SR), ...extra });
  };
  let keyShift = 0;                     // semitones the key has moved by (the anime opening's sections)
  const noteOf = (base, deg) => base + root + keyShift + degreeToSemitone(scale, deg);

  // --- material shared by several roles -----------------------------------
  const classicKick = rng.pick([
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  ]);
  const classicSnare = rng.pick([
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  ]);
  const chipKick = rng.pick([
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  ]);
  const hatPat = rng.euclid(16, rng.pick([8, 11, 12, 16]), rng.int(0, 3)).map((v) => (v ? 1 : 0));
  const openHatStep = rng.pick([2, 6, 10, 14]);

  const bassOct = 36 + 12 * rng.int(0, 1);
  const bassPat = rng.pick([
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    rng.euclid(16, rng.int(6, 10), 0).map((v) => (v ? 1 : 0)),
    [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
  ]);
  const arpShape = rng.pick([[0, 2, 4, 2], [0, 2, 4, 6], [0, 4, 2, 6], [4, 2, 0, 2], [0, 2, 4, 7]]);
  const arpStride = rng.pick([1, 2, 2, 3]);
  const leadRhythm = rng.euclid(16, rng.int(4, 7), rng.int(0, 5));
  const lead16 = rng.euclid(16, rng.int(9, 12), rng.int(0, 3));
  const lead8 = rng.euclid(8, rng.int(5, 7), rng.int(0, 2));
  const gate = rng.euclid(16, rng.int(9, 11), rng.int(0, 3));
  const pianoRhythm = rng.pick([[0, 3, 6, 10, 12], [0, 3, 6, 8, 11, 14], [0, 2, 6, 10, 14]]);
  const leadOct = 60 + 12 * rng.int(0, 1);
  const ambHat = rng.euclid(16, rng.int(4, 6), rng.int(0, 4));
  const ebmPat = rng.pick([
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1],
  ]);
  const ebmFifth = rng.euclid(16, 3, rng.int(1, 5));
  const heroKick = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0];
  const powerRhythm = rng.pick([[0, 3, 6], [0, 3, 6, 10], [0, 6, 10]]);

  // A motif reused across the piece, so the lead sounds composed.
  const motif = [];
  let cur = rng.int(0, 4);
  for (let i = 0; i < 8; i++) {
    motif.push(cur);
    cur += rng.weighted([-3, -2, -1, 0, 1, 2, 3, 4], [1, 2, 4, 2, 4, 3, 2, 1]);
    cur = Math.max(-2, Math.min(9, cur));
  }

  // A 303 line: one 16-step phrase per four bars, notes hugging the root.
  const acidPhrases = [];
  const makeAcid = () => Array.from({ length: 16 }, (_, i) => ({
    on: i === 0 || rng.bool(0.72),
    deg: rng.weighted([0, 0, 2, 4, 6, 7, -1], [5, 3, 1, 2, 1, 2, 1]),
    oct: rng.weighted([0, 1, -1], [6, 2, 1]),
    accent: rng.bool(0.3),
    slide: rng.bool(0.28),
  }));

  // --- material for the newer styles, from a stream of its own so the older
  //     styles keep every note they had ---------------------------------------
  const hr = new Rng(seed, 'hook:' + style);
  // the hook: a two-bar call and answer that keeps coming back
  const hits = (P.hook && P.hook.hits) || [5, 7];
  const hookRhythm = [
    hr.euclid(STEPS, hr.int(hits[0], hits[1]), hr.int(0, 2)),
    hr.euclid(STEPS, hr.int(Math.max(2, hits[0] - 2), hits[1] - 2), hr.int(0, 2)),
  ];
  hookRhythm[0][0] = true;
  const hookDeg = Array.from({ length: STEPS * 2 }, () => hr.weighted([0, 1, 2, 3, 4, 5, 7, -1], [3, 2, 3, 1, 3, 1, 2, 1]));
  const zapPat = hr.euclid(STEPS, 3, hr.int(1, 4));
  const accents = hr.pick([[0, 3, 6, 9, 11], [0, 3, 6, 8, 11], [0, 2, 5, 8, 11]]);   // 13 split unevenly
  const BOOGIE = [0, 4, 7, 9, 10, 9, 7, 4];
  const leadFrom = P.leadFrom === undefined ? 0.4 : P.leadFrom;

  // --- material for the sound-card styles, from yet another stream, so every
  //     style before them keeps every note it had -------------------------------
  const xr = new Rng(seed, 'card:' + style);
  const compRhythm = xr.pick([[0, 6, 10], [3, 8, 14], [0, 7, 12], [2, 6, 11, 14]]);
  const riffPat = xr.euclid(16, xr.int(9, 12), xr.int(0, 3));
  const riffAccents = xr.pick([[0, 6, 10], [0, 3, 6, 12], [0, 7, 10, 13]]);
  const harpShape = xr.pick([[0, 2, 4, 7], [0, 4, 7, 9], [0, 2, 4, 6]]);
  const ghosts = xr.euclid(16, xr.int(3, 5), xr.int(1, 6));
  const approach = Array.from({ length: 64 }, () => xr.pick([-1, 1]));

  // --- the keygen's material, from a stream of its own -----------------------
  const kr = new Rng(seed, 'keygen:' + style);
  const kgKick = kr.pick([[0, 4, 8, 12], [0, 8, 10], [0, 6, 8], [0, 3, 8, 11], [0, 7, 8, 10]]);
  const kgBounce = kr.pick([[0, 12, 0, 12, 0, 12, 0, 12], [0, 0, 12, 0, 0, 12, 0, 12], [0, 12, 7, 12, 0, 12, 7, 12]]);
  // the chord: held for half a bar, struck on the eighths, or on the off-beats against the bass
  const kgChord = kr.pick(['held', 'eighths', 'offbeat']);
  // the arpeggio's numbers: the triad's (47 major, 37 minor), or the fifth and the octave (7c)
  const kgWide = kr.bool(0.3);
  // the echo channel, in about half the tunes: four rows behind most often
  const kgEcho = kr.bool(0.55) ? kr.weighted([1, 2, 3, 4, 6], [3, 3, 3, 6, 2]) : 0;
  const kgSlide = kr.float(0.2, 0.45);
  const kgTick = bpm * 2 / 5;                 // the tracker's tick: 50 a second at 125 bpm
  let kgLast = null;

  // --- trip-hop's material, from a stream of its own --------------------------
  const tr = new Rng(seed, 'triphop:' + style);
  const thLead = tr.pick([[3, 7, 11], [7, 11], [3, 11], [11], [7, 10]]);   // the kicks leading into the beats
  const thShake = tr.euclid(16, tr.int(3, 5), tr.int(1, 5));                 // the shaker's accents
  const thEvery = tr.pick([2, 4]);                                           // a scratch every other bar, or every fourth
  const thScratch = tr.pick(['baby', 'chirp', 'tear']);
  const thBass = tr.pick([[0, 10], [0, 7, 10], [0, 11, 14]]);
  const thComp = tr.pick([[0, 7], [0, 10], [3, 10]]);
  let thPrevBass = null;
  let thLast = null;

  // --- the anime opening's material and form, from a stream of its own --------
  const ar = new Rng(seed, 'anime:' + style);
  const anVerse = ar.pick([[0, 5, 3, 4], [0, 4, 5, 3], [0, 3, 4, 4], [5, 3, 0, 4]]);
  const anPre = ar.pick([[3, 4, 3, 4], [3, 4, 5, 4], [1, 4, 3, 4]]);
  const anChorusUp = ar.bool(0.4) ? 3 : 0;            // the chorus a minor third up, on the flat mediant
  const anPump = ar.pick([1, 2, 2]);                   // and the last one a step higher still
  const anKick = ar.pick([[0, 8], [0, 6, 8], [0, 8, 10], [0, 6, 8, 10]]);
  const anStab = ar.pick([[0, 6, 10], [0, 3, 6, 10], [0, 7, 10]]);
  const sk = new Rng(seed, 'skate:' + style);
  const skKick = sk.bool(0.35);                        // the chorus's kick doubled before every snare
  const skWalk = sk.pick([[0, 2, 4, 2], [0, 0, 4, 2], [0, 4, 7, 4]]);   // the verse bass, in degrees of the scale: the chord's own
  // the sections, bar by bar: intro, verse, prechorus, chorus, again; a bridge; the last chorus; out
  const anForm = P.form === 'anime' || P.form === 'punk' ? (() => {
    const T = totalBars, big = T >= 40;
    const V = big ? 8 : 4, PR = big ? 4 : 2, CH = big ? 8 : 4, BR = big ? 4 : 2;
    const intro = T >= 16 ? 4 : 2, outro = T >= 16 ? 2 : 1, tail = BR + CH + outro;
    const sec = [];
    const add = (name, n) => { for (let k = 0; k < n; k++) sec.push({ name, k, n }); };
    add('intro', intro);
    const cycles = Math.max(1, Math.floor((T - intro - tail) / (V + PR + CH)));
    for (let c = 0; c < cycles; c++) { add('verse', V); add('pre', PR); add('chorus', CH); }
    while (sec.length < T - tail) add('verse', Math.min(V, T - tail - sec.length));
    add('bridge', BR); add('last', CH); add('outro', outro);
    while (sec.length < T) add('outro', 1);
    return sec.slice(0, T);
  })() : null;

  // the singer's line, composed once per section and sung the same each time it comes back.
  // Degrees count from the tonic (not from each chord, or the line jumps with the harmony),
  // in one register whatever the key: the tonic between F#3 and F4.
  const anBase = root >= 6 ? 48 : 60;
  const anChords = {
    verse: (k) => anVerse[k % 4], pre: (k) => anPre[k % 4],
    chorus: (k) => progression[k % 4], bridge: (k) => [5, 3, 4, 4][k % 4],
    free: (k) => progression[k % progression.length],
  };
  const isChordTone = (d, c) => [0, 2, 4].includes((((d - c) % 7) + 7) % 7);
  // a two-bar phrase's rhythm: on the eighths, a sixteenth now and then, a long last note and a breath
  const anRhythm = (density, pickup) => {
    const on = [];
    // (a theme of long notes on the style's own hits, two bars a phrase; now and then a pickup into the second)
    if (P.melody && P.melody.hits) {
      for (const b of [0, 16]) for (const h of P.melody.hits) on.push(b + h);
      if (P.melody.pickup && ar.bool(density)) on.push(16 + P.melody.pickup);
      return [...new Set(on)].sort((x, y) => x - y);
    }
    for (let st = pickup ? 2 : 0; st < 24; st += 2) {
      if (st === 0 || st === 16 || ar.bool(density)) on.push(st);
      if (st % 4 === 2 && ar.bool(0.12) && !(P.melody && P.melody.square)) on.push(st + 1);
    }
    on.push(ar.pick([24, 26]));
    return [...new Set(on)].sort((x, y) => x - y);
  };
  // the pitches of a phrase over its two chords: a chord tone nearest the last note on each beat and on
  // every long note, steps between them, heading for a target; the last note a chord tone held
  const anWalk = (rhythm, chordOf, from, lo, hi, peak, end) => {
    // the phrase's shape: an arch, rising from where it starts to its peak a little before the middle,
    // falling to where it ends; on each beat and each long note the chord tone nearest the arch, no
    // more than a fifth from the last note, and not the same note three times running; steps between
    const out = [];
    let prev = from, same = 0;
    const home = end !== null ? end : Math.round((from + lo) / 2);
    const arch = (st) => { const x = Math.min(1, st / 26); return x < 0.45 ? from + (peak - from) * (x / 0.45) : peak + (home - peak) * ((x - 0.45) / 0.55); };
    rhythm.forEach((st, j) => {
      const c = chordOf(st < 16 ? 0 : 1);
      const len = (j + 1 < rhythm.length ? rhythm[j + 1] : 32) - st;
      const last = j === rhythm.length - 1;
      const goal = last ? home : arch(st);
      let d;
      // (a chant - a gang shouting over a chord struck on every eighth - sings only the chord's tones)
      if (st % 4 === 0 || len >= 3 || last || (P.melody && P.melody.square)) {
        let best = null, score = 1e9;
        // (a chant stays close: a chord tone within a third of the last note, if there is one)
        const reach = P.melody && (P.melody.square || P.melody.close) ? [2, 4] : [4];
        for (const r of reach) {
          if (best !== null) break;
          for (let x = Math.max(lo, prev - r); x <= Math.min(hi, prev + r); x++) {
            if (!isChordTone(x, c)) continue;
            if (x === prev && P.melody && (P.melody.moving === 'always' || (P.melody.moving && same >= 1))) continue;
            const sc = Math.abs(x - goal) + (x === prev && same >= 1 ? 2 : 0);
            if (sc < score) { score = sc; best = x; }
          }
        }
        d = best === null ? prev : best;
      } else {
        const dir = Math.sign(goal - prev) || (j % 2 ? 1 : -1);
        d = prev + (Math.abs(goal - prev) > 2 && ar.bool(0.25) ? 2 * dir : dir);
      }
      d = Math.max(lo, Math.min(hi, d));
      // (at the edge of the register a step turns back rather than standing still)
      if (d === prev && P.melody && (P.melody.moving === 'always' || (P.melody.moving && same >= 1))) d = Math.max(lo, Math.min(hi, prev + (prev <= lo ? 1 : -1)));
      same = d === prev ? same + 1 : 0;
      out.push({ step: st, deg: d, len: Math.max(1, Math.min(len, last ? 8 : 6)) });
      prev = d;
    });
    return out;
  };
  // a section's line, two bars a phrase: A, A' (the same rhythm, its own notes over its chords), A
  // again, and B ending home; a prechorus climbs, each phrase a third higher; a bridge sings long notes
  const anLine = (name, nBars) => {
    const chords = anChords[name];
    const reg = (P.melody || { verse: [-1, 7], pre: [0, 8], chorus: [2, 9], bridge: [0, 7] })[name];
    const dense = (P.melody && P.melody.dense) || [0.5, 0.6, 0.75];          // verse, prechorus, chorus
    const bars = [];
    const phraseAt = (b) => (k) => chords(b + k);
    if (name === 'bridge') {
      for (let b = 0; b < nBars; b++) {
        const c = chords(b);
        let d = reg[0]; for (let x = reg[0]; x <= reg[1]; x++) if (isChordTone(x, c)) { d = x; if (x >= 3) break; }
        bars.push([{ step: 0, deg: d, len: 14 }]);
      }
      return bars;
    }
    const rA = anRhythm(name === 'chorus' ? dense[2] : name === 'pre' ? dense[1] : dense[0], ar.bool(0.4) && !(P.melody && P.melody.square));
    const rB = anRhythm(name === 'chorus' ? 0.6 : 0.5, false);
    const phrases = [];
    const start = name === 'chorus' ? reg[0] + 3 : reg[0] + 2;
    for (let ph = 0; ph * 2 < nBars; ph++) {
      const b = ph * 2;
      const lastPh = (ph + 1) * 2 >= nBars;
      let notes;
      // A again - where its chords come round again (a twelve-bar's fifth bar is the IV, not the I)
      if (ph === 2 && phrases[0] && chords(b) === chords(0) && chords(b + 1) === chords(1)) notes = phrases[0];
      else if (name === 'pre') {
        const lift = ph * 2;
        notes = anWalk(rA, phraseAt(b), start + lift, reg[0] + lift, Math.min(reg[1] + 2, reg[1] + lift), reg[1], null);
      } else {
        notes = anWalk(lastPh && ph > 0 ? rB : rA, phraseAt(b), phrases.length ? phrases[phrases.length - 1].at(-1).deg : start,
          reg[0], reg[1], reg[1] - (ph % 2) - (name === 'verse' ? 1 : 0), lastPh && (name === 'chorus' || name === 'free') ? (P.melody && P.melody.home !== undefined ? P.melody.home : 7) : null);   // (home: the octave, or where the style says)
      }
      phrases.push(notes);
      bars.push(notes.filter((n) => n.step < 16), notes.filter((n) => n.step >= 16).map((n) => ({ ...n, step: n.step - 16 })));
    }
    return bars.slice(0, nBars);
  };
  const anMel = {};
  if (anForm) {
    const lens = {};
    for (const sc of anForm) lens[sc.name] = Math.max(lens[sc.name] || 0, sc.n);
    for (const name of ['verse', 'pre', 'chorus', 'bridge']) if (lens[name]) anMel[name] = anLine(name, lens[name]);
    anMel.last = anMel.chorus;
  }
  // a hook that sings a line (a style without sections): eight bars over its progression, home at the end
  // (as long as the style's chords go round: a twelve-bar blues sings twelve bars, not eight over the wrong chords)
  const hookBars = P.hook && P.hook.bars ? P.hook.bars : 8;
  const hookLine = P.hook && P.hook.line ? anLine('free', hookBars) : null;
  // an answer: a second eight bars, so the tune goes A A B A rather than the same eight all the way
  const hookAnswer = hookLine && P.hook.answer ? anLine('free', hookBars) : null;

  // --- arrangement --------------------------------------------------------
  const arrangement = [];
  const breakStart = Math.floor(totalBars * rng.float(0.5, 0.62));
  const breakLen = totalBars > 12 ? rng.int(2, 4) : 0;
  const breakEnd = breakStart + breakLen;
  for (let bar = 0; bar < totalBars; bar++) {
    const p = totalBars <= 1 ? 1 : bar / (totalBars - 1);
    const inBreak = breakLen > 0 && bar >= breakStart && bar < breakEnd;
    const last = bar >= totalBars - 1 && totalBars > 3;
    const drumsIn = !inBreak && p > P.intro && !last;
    arrangement.push({
      pad: true,
      hat: !inBreak && p > P.intro * 0.5,
      kick: drumsIn,
      snare: drumsIn && p > Math.max(P.intro, 0.2),
      bass: !inBreak && p > P.intro + 0.06,
      arp: (p > 0.2 && p < 0.55) || p > 0.72 || inBreak,
      lead: (p > leadFrom && !inBreak) || p > 0.82,
      stab: inBreak || (p > 0.3 && bar % 4 === 0),
      chords: p > P.intro || inBreak,
      fill: drumsIn && bar % 8 === 7 && bar !== breakStart - 1,
      build: breakLen > 0 && bar === breakEnd - 1,            // the roll into the drop
      drop: breakLen > 0 && bar === breakEnd,
      crash: (breakLen > 0 && bar === breakEnd) || (drumsIn && bar % 8 === 0 && p > P.intro),
      intensity: inBreak ? 0.45 : Math.min(1, 0.35 + p * 0.85),
    });
  }

  if (anForm) {
    anForm.forEach((sec, bar) => {
      const end = sec.k === sec.n - 1, first = sec.k === 0;
      const loud = sec.name === 'chorus' || sec.name === 'last';
      arrangement[bar] = {
        pad: true, section: sec.name,
        hat: sec.name !== 'bridge' || sec.k >= sec.n - 1,
        kick: sec.name !== 'bridge' && !(sec.name === 'outro' && sec.k > 0),
        snare: sec.name !== 'bridge',
        bass: sec.name !== 'bridge' || sec.k > 0,
        arp: false,
        lead: sec.name === 'verse' || sec.name === 'pre' || loud || sec.name === 'bridge',
        stab: sec.name === 'intro' || loud,
        chords: true,
        fill: (sec.name === 'verse' && end) || (sec.name === 'chorus' && end),
        build: (sec.name === 'pre' || sec.name === 'bridge') && end,
        drop: (loud && first),
        crash: (loud && first) || (sec.name === 'intro' && first) || (sec.name === 'outro' && first),
        intensity: loud ? 1 : sec.name === 'pre' ? 0.75 : sec.name === 'intro' ? 0.8 : sec.name === 'bridge' ? 0.45 : 0.6,
      };
    });
  }

  // --- the bars -----------------------------------------------------------
  let prevAcid = null;
  let prevReese = null;
  for (let bar = 0; bar < totalBars; bar++) {
    const a = arrangement[bar];
    const barT = bar * barSec;
    // the anime opening moves its key at the sections' edges: the chorus maybe on the flat
    // mediant, the last chorus pumped up a step; and each section has its own progression
    const sec = anForm ? anForm[bar] : null;
    if (sec && P.form === 'anime') keyShift = sec.name === 'chorus' ? anChorusUp : (sec.name === 'last' || sec.name === 'outro') ? anChorusUp + anPump : 0;
    const chordDeg = !sec ? progression[bar % progression.length]
      : sec.name === 'chorus' || sec.name === 'last' ? progression[sec.k % 4]
        : sec.name === 'pre' ? anPre[sec.k % 4] : sec.name === 'bridge' ? [5, 3, 4, 4][sec.k % 4] : anVerse[sec.k % 4];
    const triad = [0, 2, 4].map((d) => d + chordDeg);
    const breakPat = rng.pick(P.drums === 'amen' ? AMENS : BREAKS);
    if (P.bass === 'acid' && bar % 4 === 0) acidPhrases[bar / 4] = makeAcid();
    const acidPhrase = acidPhrases[Math.floor(bar / 4)];
    const acidCut = 0.5 + 0.5 * Math.sin(bar * 0.37 + root);   // the knob someone keeps turning

    if (a.crash) push(barT, 'crash', 0, 0.55, 0.01);
    if (a.build) push(barT, 'riser', 0, 0.75, barSec);

    // ---- chords held for the bar ----
    if (['pad', 'gated', 'dubstab', 'ambientpad', 'synthpad'].includes(P.chords)) {
      const tones = rng.bool(0.5) ? [0, 2, 4, 6] : [0, 2, 4];
      const full = P.chords === 'pad' || P.chords === 'ambientpad' || P.chords === 'synthpad';
      const vel = (full ? 0.16 : 0.09) + 0.1 * a.intensity;
      for (const ct of tones) push(barT, 'pad', noteOf(48, chordDeg + ct), vel, barSec * 1.05);
    }
    if (P.chords === 'synthpad' && a.chords) {
      for (const d of triad) push(barT, 'supersaw', noteOf(60, d), 0.07 + 0.04 * a.intensity, barSec * 0.98);
    }
    if (P.chords === 'orchestra' && a.chords) {
      for (const d of triad) push(barT, 'strings', noteOf(60, d), 0.5 + 0.2 * a.intensity, barSec * 1.02);
      if ((a.lead || a.stab) && !(P.orch && P.orch.noChoir)) for (const d of triad) push(barT, 'choir', noteOf(48, d), 0.45, barSec * 1.02);
    }
    if (P.chords === 'power' && a.chords) {
      for (const d of [0, 4]) push(barT, 'strings', noteOf(48, chordDeg + d), 0.35, barSec * 1.02);
    }
    if (P.chords === 'gbarp' && a.chords) {
      const chord = triad.map((d) => noteOf(60, d));
      push(barT, 'chiparp', 0, 0.5, barSec * 0.5, { chord, kit: 'gb' });
      push(barT + barSec / 2, 'chiparp', 0, 0.45, barSec * 0.5, { chord, kit: 'gb' });
    }
    if (P.chords === 'pad' && a.stab) {
      for (const d of triad) push(barT, 'stab', noteOf(60, d), 0.3, 0.3);
    }
    if (P.chords === 'chiparp' && a.chords) {
      const chord = triad.map((d) => noteOf(60, d));
      if (rng.bool(0.4)) chord.push(chord[0] + 12);
      push(barT, 'chiparp', 0, 0.55, barSec * 0.5, { chord });
      push(barT + barSec / 2, 'chiparp', 0, 0.5, barSec * 0.5, { chord });
    }
    if (P.chords === 'hoover' && a.chords) {
      for (const d of triad) push(barT, 'hoover', noteOf(48, d), 0.5, barSec * 0.42);
    }
    if (P.chords === 'noir' && a.chords) {
      // the dark strings of the film scores, low and held
      for (const d of triad) push(barT, 'strings', noteOf(48, d), 0.3 + 0.12 * a.intensity, barSec * 1.02);
    }

    for (let step = 0; step < STEPS; step++) {
      // swing nudges the odd sixteenths; a shuffle drags the off-beat eighth
      const swingOff = (step % 2 === 1 ? swing * spb * 0.5 : 0)
        + (P.shuffle && step % 4 === 2 ? P.shuffle * spb * 0.5 : 0)
        + (P.mpc && step % 2 === 1 ? P.mpc * spb * 0.5 : 0);
      const t = barT + (step / 4) * spb + swingOff;
      const accent = step % 4 === 0 ? 1 : (step % 2 === 0 ? 0.82 : 0.66);
      const sixteenth = spb / 4;

      // ---- drums ----
      switch (P.drums) {
        case 'classic':
          if (a.kick && classicKick[step]) push(t, 'kick', 0, 0.95, 0.42);
          if (a.snare && classicSnare[step]) push(t, 'snare', 0, 0.78, 0.3);
          if (a.hat && hatPat[step]) {
            const open = step === openHatStep;
            push(t, 'hat', 0, (open ? 0.35 : 0.26) * accent, open ? 0.28 : 0.065, { open });
          }
          break;
        case 'chip':
          if (a.kick && chipKick[step]) push(t, 'kick', 0, 0.9, 0.15, { kit: 'chip' });
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.8, 0.1, { kit: 'chip' });
          if (a.hat && step % 2 === 0) push(t, 'hat', 0, 0.15 * accent, 0.03);
          break;
        case 'four':
        case 'trance':
        case 'hardcore':
          if (a.kick && step % 4 === 0) push(t, 'kick', 0, 1, 0.4, { kit: '909' });
          if (a.snare && (step === 4 || step === 12)) push(t, 'clap', 0, 0.8, 0.2);
          if (a.hat) {
            if (step % 4 === 2) push(t, 'hat', 0, 0.3, 0.12, { open: true });
            else if (P.drums !== 'hardcore') push(t, 'hat', 0, 0.11 * accent, 0.04);
          }
          if (P.drums === 'hardcore' && a.snare && step % 4 === 2 && a.intensity > 0.75) {
            push(t, 'clap', 0, 0.35, 0.1);
          }
          break;
        case 'newbeat':
          if (a.kick && step % 4 === 0) push(t, 'kick', 0, 1, 0.5, { kit: '909' });
          if (a.snare && (step === 4 || step === 12)) {
            push(t, 'clap', 0, 0.9, 0.25);
            push(t, 'snare', 0, 0.45, 0.3);
          }
          if (a.hat && step % 2 === 1) push(t, 'hat', 0, 0.12 * accent, 0.04);
          break;
        case 'gabber':
          if (a.kick && step % 4 === 0) push(t, 'kick', 0, 1, 0.35, { kit: 'gabber' });
          if (a.hat && step % 4 === 2) push(t, 'hat', 0, 0.3, 0.1, { open: true });
          if (a.snare && a.intensity > 0.7 && (step === 4 || step === 12)) push(t, 'clap', 0, 0.6, 0.15);
          break;
        case 'ambient':
          if (a.kick && (step === 0 || step === 10)) push(t, 'kick', 0, 0.7, 0.4);
          if (a.snare && step === 12 && bar % 2 === 1) push(t, 'snare', 0, 0.35, 0.2);
          if (a.hat && ambHat[step]) push(t, 'hat', 0, 0.09 + 0.06 * accent, 0.03);
          break;
        case 'orchestral':
          if (a.kick && (step === 0 || (step === 8 && bar % 2 === 1))) {
            push(t, 'timpani', noteOf(36, chordDeg), 0.85, 0.8);
          }
          if (a.snare && a.intensity > 0.6 && (step === 4 || step === 12)) push(t, 'snare', 0, 0.45, 0.2);
          break;
        case 'gb':
          if (a.kick && chipKick[step]) push(t, 'kick', 0, 0.85, 0.15, { kit: 'chip' });
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.75, 0.1, { kit: 'chip' });
          if (a.hat && step % 2 === 0) push(t, 'hat', 0, 0.12 * accent, 0.03);
          break;
        case 'heroic':
          if (a.kick && heroKick[step]) push(t, 'kick', 0, 0.95, 0.35, { kit: '909' });
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.85, 0.25, { kit: 'break' });
          if (a.hat && step % 2 === 0) push(t, 'hat', 0, 0.18 * accent, 0.05);
          break;
        case 'synthwave':
          if (a.kick && (step === 0 || step === 8 || (step === 10 && bar % 2 === 1))) {
            push(t, 'kick', 0, 0.95, 0.4, { kit: '909' });
          }
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.85, 0.3, { kit: 'gated' });
          if (a.hat) push(t, 'hat', 0, (step % 2 === 0 ? 0.13 : 0.07) * accent, 0.04);
          break;
        case 'arcade':
          if (a.kick && chipKick[step]) push(t, 'kick', 0, 0.9, 0.15, { kit: 'chip' });
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.8, 0.1, { kit: 'chip' });
          if (a.hat && step % 2 === 0) push(t, 'hat', 0, 0.13 * accent, 0.03);
          if (a.crash && step === 0) push(t, 'boom', 0, 0.8, 0.6);
          break;
        case 'cyborg':
          // the machine: an anvil on every accent of an uneven bar
          if (a.kick && (step === 0 || step === accents[2])) push(t, 'kick', 0, 1, 0.4, { kit: '909' });
          if (a.kick && accents.includes(step)) push(t, 'anvil', 79, step === 0 ? 0.6 : 0.42, 0.2);
          if (a.snare && step === accents[3]) push(t, 'snare', 0, 0.85, 0.3, { kit: 'gated' });
          if (a.hat && step % 2 === 1) push(t, 'hat', 0, 0.1, 0.03);
          break;
        case 'heartbeat':
          if (a.kick && (step === 0 || step === 8)) push(t, 'kick', 0, 0.85, 0.4);
          if (a.kick && (step === 2 || step === 10)) push(t, 'kick', 0, 0.5, 0.3);
          if (a.snare && bar % 4 === 2 && step === 14) push(t, 'anvil', 67, 0.22, 0.4);   // something on the hull
          if (a.hat && ambHat[step]) push(t, 'hat', 0, 0.05 + 0.04 * accent, 0.03);
          break;
        case 'rock':
          if (a.kick && (step === 0 || step === 8 || (step === 10 && bar % 2 === 1))) push(t, 'kick', 0, 0.95, 0.3, { kit: 'break' });
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.85, 0.2, { kit: 'break' });
          if (a.hat && step % 2 === 0) push(t, 'hat', 0, (step % 4 === 0 ? 0.2 : 0.13), 0.06);
          break;
        case 'jazz':
          // the ride's ding, ding-da-ding; the hi-hat foot on two and four; a feathered kick, ghost notes
          if (a.hat && step % 4 === 0) push(t, 'hat', 0, 0.24, 0.25, { open: true });
          if (a.hat && (step === 6 || step === 14)) push(t, 'hat', 0, 0.16, 0.12, { open: true });
          if (a.hat && (step === 4 || step === 12)) push(t, 'hat', 0, 0.2, 0.04);
          if (a.kick && step === 0) push(t, 'kick', 0, 0.45, 0.3);
          if (a.snare && ghosts[step]) push(t, 'snare', 0, 0.16 + 0.1 * a.intensity, 0.1);
          break;
        case 'metal':
          // a double kick when it is all-out, the snare on the backbeat, the ride on the eighths
          if (a.kick && (a.intensity > 0.8 ? step % 2 === 0 || riffAccents.includes(step) : (step % 8 === 0 || riffAccents.includes(step)))) {
            push(t, 'kick', 0, 0.95, 0.25, { kit: '909' });
          }
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.9, 0.25, { kit: 'break' });
          if (a.hat && step % 2 === 0) push(t, 'hat', 0, 0.2 * accent, 0.08, { open: step % 4 === 0 });
          break;
        case 'break':
        case 'amen':
          if (a.kick) {
            for (const [s, h] of breakPat) {
              if (s !== step) continue;
              if (h === 'k') push(t, 'kick', 0, 0.95, 0.3, { kit: 'break' });
              else if (h === 's' && a.snare) push(t, 'snare', 0, 0.85, 0.2, { kit: 'break' });
              else if (h === 'g' && a.snare) push(t, 'snare', 0, 0.32, 0.1, { kit: 'break' });
            }
            // rave doubles the beat with a four-to-the-floor kick when it peaks
            if (P.drums === 'break' && a.intensity > 0.8 && step % 4 === 0) push(t, 'kick', 0, 0.75, 0.3, { kit: '909' });
          }
          if (a.hat && step % 2 === 0) push(t, 'hat', 0, 0.2 * accent, 0.05);
          if (a.hat && P.drums === 'amen' && step % 2 === 1) push(t, 'hat', 0, 0.09, 0.03);
          break;
        case 'skate':
          if (a.section === 'chorus' || a.section === 'last' || a.section === 'intro') {
            // the punk beat: the snare on every "and", the kick on the beat and the sixteenth after,
            // or doubled just before the snare; the hats open, eighths
            const kicks = skKick ? [0, 1, 4, 5, 8, 9, 12, 13] : [0, 5, 8, 13];
            if (a.kick && kicks.includes(step)) push(t, 'kick', 0, step % 4 === 0 ? 0.95 : 0.78, 0.25, { kit: 'break' });
            if (a.snare && step % 4 === 2) push(t, 'snare', 0, 0.85, 0.2, { kit: 'break' });
            if (a.hat && step % 2 === 0) push(t, 'hat', 0, 0.2, 0.14, { open: true });
          } else if (a.section === 'bridge') {
            // the breakdown: half time
            if (a.kick && step === 0) push(t, 'kick', 0, 0.9, 0.3, { kit: 'break' });
            if (a.snare && step === 8) push(t, 'snare', 0, 0.85, 0.25, { kit: 'break' });
            if (a.hat && step % 4 === 0) push(t, 'hat', 0, 0.16, 0.05);
          } else {
            // the ska verse: a backbeat, the hats closed on the eighths
            if (a.kick && (step === 0 || step === 8 || (step === 10 && bar % 2))) push(t, 'kick', 0, 0.9, 0.25, { kit: 'break' });
            if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.85, 0.2, { kit: 'break' });
            if (a.hat && step % 2 === 0) push(t, 'hat', 0, step % 4 === 2 ? 0.2 : 0.13, 0.04);
          }
          break;
        case 'jrock':
          // a J-rock drummer: the kick on one and three and the seed's pushes, the snare's backbeat,
          // eighths on the hat - open and riding through the chorus - a crash on each chorus
          if (a.kick && anKick.includes(step)) push(t, 'kick', 0, step % 8 === 0 ? 0.95 : 0.8, 0.3, { kit: 'break' });
          if (a.snare && (step === 4 || step === 12)) push(t, 'snare', 0, 0.9, 0.25, { kit: 'break' });
          if (a.hat && step % 2 === 0) {
            const loud = a.section === 'chorus' || a.section === 'last';
            push(t, 'hat', 0, (step % 4 === 0 ? 0.22 : 0.15) + (loud ? 0.06 : 0), loud ? 0.18 : 0.05, { open: loud && step % 4 === 2 });
          }
          break;
        case 'triphop':
          // the break slowed down and shuffled: the kick on one and three with sixteenths leading into
          // the beats, a big roomy snare on two and a crisp side-stick on four, the ride on the upbeats,
          // a shaker when it builds, the record's crackle under it all, and a scratch at the end of a phrase
          if (a.kick && (step === 0 || step === 8 || thLead.includes(step))) push(t, 'thkick', 0, step % 8 === 0 ? 0.95 : 0.62, 0.4);
          if (a.snare && step === 4) push(t, 'thsnare', 0, 0.85, 0.4, { kit: 'room' });
          if (a.snare && step === 12) push(t, 'thsnare', 0, 0.7, 0.2, { kit: 'stick' });
          if (a.hat && step % 4 === 2) push(t, 'thride', 0, 0.3, 0.6);
          if (a.hat && a.intensity > 0.5) push(t, 'thshaker', 0, thShake[step] ? 0.16 : 0.07, 0.06);
          if (step === 0) push(t, 'vinyl', 0, 0.5, barSec);
          if (a.kick && bar % thEvery === thEvery - 1 && step >= 8 && step % 2 === 0) {
            push(t, 'scratch', noteOf(48, chordDeg), step === 8 ? 0.6 : 0.5, sixteenth * 2, { kit: thScratch });
          }
          break;
        case 'keygen':
          // a tracker's drum samples: a kick and a snare cut from records, the hat on the eighths
          if (a.kick && kgKick.includes(step)) push(t, 'xmkick', 0, 0.95, 0.3);
          if (a.snare && (step === 4 || step === 12)) push(t, 'xmsnare', 0, 0.85, 0.25);
          if (a.hat && step % 2 === 0) {
            const open = step % 4 === 2 && a.intensity > 0.7;
            push(t, 'xmhat', 0, step % 4 === 2 ? 0.26 : 0.15, open ? 0.2 : 0.05, { open });
          }
          break;
        default:
          break;
      }

      // ---- rolls: fills at phrase ends, a full roll into the drop ----
      const SNARE_ROLLS = ['classic', 'chip', 'break', 'amen', 'gb', 'ambient', 'orchestral', 'heroic', 'synthwave', 'jrock', 'skate',
        'arcade', 'cyborg', 'rock', 'jazz', 'metal'];
      const rollInstr = P.drums === 'keygen' ? 'xmsnare' : SNARE_ROLLS.includes(P.drums) ? 'snare' : 'clap';
      const rollKit = (P.drums === 'chip' || P.drums === 'gb' || P.drums === 'arcade') ? 'chip'
        : (P.drums === 'break' || P.drums === 'amen' || P.drums === 'heroic' || P.drums === 'rock' || P.drums === 'jrock' || P.drums === 'skate') ? 'break'
          : P.drums === 'cyborg' ? 'gated' : undefined;
      if (P.drums === 'heartbeat' || P.drums === 'triphop') {
        // no rolls in the dark: only the riser before the drop
      } else if (a.build) {
        const every = step < 8 ? 2 : 1;
        if (step % every === 0) push(t, rollInstr, 0, 0.2 + 0.045 * step, 0.08, { kit: rollKit });
      } else if (a.fill && step >= 12) {
        push(t + (P.drums === 'classic' ? spb / 8 : 0), rollInstr, 0, 0.34 + 0.1 * (step - 12), 0.08, { kit: rollKit });
      }

      // ---- bass ----
      if (a.bass) {
        switch (P.bass) {
          case 'walk':
            if (bassPat[step]) {
              const walk = step === 0 ? 0 : rng.weighted([0, 2, -2, 4], [7, 2, 2, 1]);
              push(t, 'bass', noteOf(bassOct, chordDeg + walk), 0.6 * accent + 0.15, sixteenth * 0.9);
            }
            break;
          case 'octave':
            if (step % 2 === 0) {
              const n = noteOf(36, chordDeg) + (step % 4 === 2 ? 12 : 0);
              push(t, 'chipbass', n, 0.8, sixteenth * 1.8);
            }
            break;
          case 'acid': {
            const s = acidPhrase[step];
            if (s.on) {
              const n = noteOf(36, chordDeg + s.deg) + 12 * s.oct;
              const slide = s.slide && prevAcid !== null;
              push(t, 'acid', n, s.accent ? 0.95 : 0.7, sixteenth * (s.slide ? 1.05 : 0.55), {
                accent: s.accent, slideFrom: slide ? prevAcid : null, cut: acidCut,
              });
              prevAcid = n;
            } else {
              prevAcid = null;
            }
            break;
          }
          case 'offbeat':
            if (step % 4 === 2) push(t, 'bass', noteOf(36, chordDeg), 0.85, sixteenth * 1.6, { kit: 'pluck' });
            break;
          case 'sub':
            if (step === 0 || step === 6 || step === 10) {
              push(t, 'bass', noteOf(36, chordDeg), 0.95, spb * 1.3, { kit: 'sub' });
            }
            break;
          case 'ebm':
            if (ebmPat[step]) {
              const n = noteOf(36, chordDeg) + (step % 4 === 2 ? 12 : 0) + (ebmFifth[step] ? 7 : 0);
              push(t, 'bass', n, 0.8, sixteenth * 0.8, { kit: 'ebm' });
            }
            break;
          case 'organ':
            if (step % 4 === 2 || step === 7 || (step === 15 && bar % 2 === 1)) {
              push(t, 'organ', noteOf(36, chordDeg) + (step === 7 ? 12 : 0), 0.85, sixteenth * 1.4);
            }
            break;
          case 'wave':
            if (step % 2 === 0) {
              push(t, 'chipbass', noteOf(36, chordDeg) + (step % 8 === 4 ? 7 : 0), 0.9, sixteenth * 1.8, { kit: 'wave' });
            }
            break;
          case 'strings':
            if (step === 0) push(t, 'strings', noteOf(36, chordDeg), 0.7, barSec * 0.98);
            break;
          case 'octave8':
            if (step % 2 === 0) {
              push(t, 'bass', noteOf(36, chordDeg) + (step % 4 === 2 ? 12 : 0), 0.8, sixteenth * 1.7, { kit: 'pluck' });
            }
            break;
          case 'march':
            // four steps down, one per beat: the formation closing in - a step that would land a semitone
            // from the chord's notes goes on down to the next (in C major: C A G E, not C B A G)
            if (step % 4 === 0) {
              const pcs = triad.map((d) => (((noteOf(0, d) % 12) + 12) % 12));
              const rubs = (d) => { const pc = (((noteOf(0, d) % 12) + 12) % 12); return pcs.some((c) => (pc - c + 12) % 12 === 1 || (c - pc + 12) % 12 === 1); };
              let d = chordDeg;
              for (let k = 0; k < step / 4; k++) d = rubs(d - 1) ? d - 2 : d - 1;
              push(t, 'chipbass', noteOf(36, d), 0.85, spb * 0.45);
            }
            break;
          case 'ostinato':
            push(t, 'bass', noteOf(36, chordDeg) + (accents.includes(step) ? 0 : 12),
              accents.includes(step) ? 0.85 : 0.5, sixteenth * 0.8, { kit: 'ebm' });
            break;
          case 'drone':
            if (step === 0 && bar % 2 === 0) {
              push(t, 'drone', noteOf(36, 0), 0.75, barSec * 2.05);
              // and, when it gets close, the half-step above it
              if (a.intensity > 0.6) push(t, 'drone', noteOf(36, 0) + 1, 0.35, barSec * 2.05);
            }
            break;
          case 'boogie':
            if (step % 2 === 0) {
              const n = 36 + root + degreeToSemitone(scale, chordDeg) + BOOGIE[(step / 2) % 8];
              push(t, 'bass', n, 0.75 + 0.1 * (step % 4 === 0), sixteenth * 1.8, { kit: 'pluck' });
            }
            break;
          case 'upright': {
            // walking: the root, a chord tone, another, then a half-step into the next chord's root
            if (step % 4 === 0) {
              const beat = step / 4;
              const nextDeg = progression[(bar + 1) % progression.length];
              const n = beat === 3 ? noteOf(36, nextDeg) + approach[bar % 64]
                : noteOf(36, chordDeg + [0, 2, 4][beat]);
              push(t, 'slap', n, beat === 0 ? 0.7 : 0.55, spb * 0.9);
            }
            break;
          }
          case 'chug':
            // the bass doubles the riff's root, palm-muted with it
            if (riffPat[step] || riffAccents.includes(step)) {
              push(t, 'bass', noteOf(36, chordDeg), riffAccents.includes(step) ? 0.9 : 0.7, sixteenth * 0.8, { kit: 'pluck' });
            }
            break;
          case 'skate':
            if (a.section === 'verse' || a.section === 'bridge') {
              // the ska verse: the bass walking on the beats
              if (step % 4 === 0) push(t, 'bass', noteOf(36, chordDeg + skWalk[step / 4]), 0.8, spb * 0.8, { kit: 'pluck' });
            } else if (step % 2 === 0) {
              // the punk chorus: eighths on the root, picked hard
              push(t, 'bass', noteOf(36, chordDeg), step % 4 === 0 ? 0.9 : 0.78, sixteenth * 1.6, { kit: 'pluck' });
            }
            break;
          case 'jrock':
            // driving eighths on the root, an octave popping up on the off-beats in the chorus
            if (step % 2 === 0) {
              const pop = (a.section === 'chorus' || a.section === 'last') && step % 4 === 2;
              push(t, 'bass', noteOf(36, chordDeg) + (pop ? 12 : 0), step % 4 === 0 ? 0.85 : 0.72, sixteenth * 1.7, { kit: 'pluck' });
            }
            break;
          case 'deep':
            // the deep bass: a long note on the root, a pickup into the next, sliding
            if (thBass.includes(step)) {
              const n = step === 0 ? noteOf(36, chordDeg) : noteOf(36, chordDeg + tr.pick([4, 0, -1]));
              push(t, 'thbass', n, step === 0 ? 0.9 : 0.7, step === 0 ? spb * 1.6 : spb * 0.7, { slideFrom: step === 0 ? null : thPrevBass });
              thPrevBass = n;
            }
            break;
          case 'bounce':
            // the bouncing bass: a row on, a row off, up to the octave and back
            if (step % 2 === 0) {
              push(t, 'xmbass', noteOf(36, chordDeg) + kgBounce[step / 2], 0.8, sixteenth * 1.5);
            } else if (step === 15 && bar % 2 === 1) {
              push(t, 'xmbass', noteOf(36, chordDeg) + 12, 0.6, sixteenth * 0.8);
            }
            break;
          case 'reese':
            if (step === 0 || step === 8) {
              const n = noteOf(36, chordDeg + (step === 8 ? rng.pick([0, 0, 4, -3]) : 0));
              push(t, 'reese', n, 0.85, barSec * 0.5, { slideFrom: prevReese });
              prevReese = n;
            }
            break;
          default:
            break;
        }
      }

      // ---- rhythmic chords ----
      if (a.chords) {
        if (P.chords === 'gated' && a.lead && gate[step]) {
          for (const d of triad) push(t, 'supersaw', noteOf(60, d), 0.2, sixteenth * 0.7);
        }
        if (P.chords === 'dubstab' && (step === 3 || (step === 10 && bar % 2 === 1))) {
          for (const d of [0, 2, 4, 6]) push(t, 'stab', noteOf(60, chordDeg + d), 0.3, 0.18, { kit: 'dub' });
        }
        if (P.chords === 'hoover' && a.lead && step === 10) {
          for (const d of triad) push(t, 'hoover', noteOf(48, d), 0.4, spb * 0.5);
        }
        if (P.chords === 'power' && a.lead && powerRhythm.includes(step)) {
          // (where the style asks, a power chord as its name says - the root and the fifth - under the line)
          const pv = P.power && P.power.fifths ? [chordDeg, chordDeg + 4] : triad;
          for (const d of pv) push(t, 'brass', noteOf(48, d), P.power && P.power.vel ? P.power.vel : 0.4, spb * 0.4);
        }
        if (P.chords === 'piano' && pianoRhythm.includes(step)) {
          for (const d of triad) push(t, 'piano', noteOf(60, d), 0.5, spb * 0.35);
        }
        // orchestra hits: brass, strings and a timpani on the syncopations
        if (P.chords === 'orchhit' && [0, 3, 6, 10].includes(step) && (a.lead || step === 0)) {
          // the chord shared between the sections, not doubled: the brass the root and the fifth,
          // the strings the root and the third (on a wavetable card each note is a whole section)
          for (const d of [chordDeg, chordDeg + 4]) push(t, 'brass', noteOf(60, d), 0.4, spb * 0.28);
          for (const d of [chordDeg, chordDeg + 2]) push(t, 'strings', noteOf(48, d), 0.5, spb * 0.3);
          if (step === 0 || step === 6) push(t, 'timpani', noteOf(36, chordDeg), 0.7, 0.6);
        }
        if (P.chords === 'ep' && compRhythm.includes((step + (bar % 2) * 2) % 16)) {
          // comping: the seventh chord on the off-beats, pushed a little on odd bars
          for (const d of [0, 2, 4, 6]) push(t, 'ep', noteOf(60, chordDeg + d), 0.3 + 0.08 * a.intensity, spb * 0.6);
        }
        if (P.chords === 'riff') {
          // power chords: palm-muted chugs on the riff, open on its accents
          // (on the chord's own root - the bass's - raised into the guitar's low register)
          let root = noteOf(36, chordDeg);
          if (root < 40) root += 12;
          if (riffAccents.includes(step)) {
            for (const iv of [0, 7]) push(t, 'guitar', root + iv, 0.42, spb * 0.9);
          } else if (riffPat[step] && a.lead) {
            for (const iv of [0, 7]) push(t, 'guitar', root + iv, 0.34, sixteenth * 0.9, { kit: 'mute' });
          }
        }
        if (P.chords === 'skate') {
          // the power chord on the chord's own root (the bass's), up into the guitar's low register
          let g = noteOf(36, chordDeg);
          if (g < 40) g += 12;
          if (a.section === 'verse' || a.section === 'bridge') {
            // the ska upstroke: a short, bright chop on every off-beat
            if (step % 4 === 2) for (const d of [chordDeg, chordDeg + 2]) push(t, 'guitar', noteOf(60, d), 0.34, sixteenth * 0.9, { kit: 'mute' });
          } else if (a.section === 'pre') {
            if (step % 4 === 0) for (const iv of [0, 7]) push(t, 'guitar', g + iv, 0.42, spb * 0.9);
          } else if (step % 2 === 0) {
            // the punk chorus: power chords hammered on the eighths
            for (const iv of [0, 7]) push(t, 'guitar', g + iv, step % 4 === 0 ? 0.48 : 0.4, sixteenth * 1.7);
          }
        }
        if (P.chords === 'jrock') {
          const loud = a.section === 'chorus' || a.section === 'last';
          // (on the chord's own root - the bass's - raised into the guitar's low register)
          let g = noteOf(36, chordDeg);
          if (g < 40) g += 12;
          if (a.section === 'verse' && step % 2 === 0) {
            // the verse: the guitar palm-muted on the eighths
            push(t, 'guitar', g, 0.4, sixteenth * 1.3, { kit: 'mute' });   // (one string: the drive fills in the fifth)
          } else if ((loud || a.section === 'intro' || a.section === 'outro') && (step === 0 || step === 6 || step === 10)) {
            // the chorus: open power chords, ringing
            for (const iv of [0, 7]) push(t, 'guitar', g + iv, 0.5, spb * 0.8);
          } else if (a.section === 'pre' && step % 4 === 0) {
            for (const iv of [0, 7]) push(t, 'guitar', g + iv, 0.42, spb * 0.9);
          }
          // the brass: stabs through the intro and the chorus
          // (one horn line, on the chord's third - the guitars and strings hold the chord - under the singer)
          if (a.stab && anStab.includes(step)) push(t, 'brass', noteOf(48, chordDeg + 2), 0.4, spb * 0.3);
          // strings holding the chord under the prechorus and the chorus, swelling into it
          if (step === 0 && (a.section === 'pre' || loud || a.section === 'bridge')) {
            for (const d of [chordDeg, chordDeg + 2]) push(t, 'strings', noteOf(60, d), a.section === 'pre' ? 0.36 + 0.08 * a.intensity : 0.34, barSec * 1.02);
          }
        }
        if (P.chords === 'noir' && thComp.includes(step)) {
          // a Rhodes on top, the seventh chord, softly
          for (const d of [0, 2, 4, 6]) push(t, 'ep', noteOf(60, chordDeg + d), 0.2 + 0.06 * a.intensity, spb * 0.9);
        }
        if (P.chords === 'xmarp' && (kgChord === 'held' ? step % 8 === 0 : kgChord === 'eighths' ? step % 2 === 0 : step % 4 === 2)) {
          // the arpeggio effect: one channel stepping the chord on the tracker's tick
          const base = noteOf(60, chordDeg);
          const chord = kgWide ? [base, base + 7, base + 12] : [base, noteOf(60, chordDeg + 2), noteOf(60, chordDeg + 4)];
          const len = kgChord === 'held' ? barSec * 0.5 : sixteenth * 1.8;
          push(t, 'xmarp', 0, kgChord === 'held' ? 0.5 : 0.55 * accent, len, { chord, rate: kgTick });
        }
        if (P.chords === 'boogie' && step % 2 === 0) {
          // the fifties comp, on every eighth with the boogie bass: on each chord's own root, the major chord with its
          // sixth added on the second and fourth beats (C, C6, C, C6), chopped short
          const r0 = noteOf(60, chordDeg);
          const sixth = Math.floor(step / 4) % 2 === 1;
          for (const iv of sixth ? [0, 4, 7, 9] : [0, 4, 7]) push(t, 'piano', r0 + iv, step % 4 === 0 ? 0.36 : 0.3, spb * 0.2, { kit: 'chop', tail: 0.12 });
        }
      }

      // ---- arpeggios ----
      if (a.arp && P.arp === 'arp' && step % arpStride === 0) {
        const idx = step / arpStride;
        const octave = Math.floor(idx / arpShape.length) % 2;
        const deg = chordDeg + arpShape[idx % arpShape.length] + 7 * octave;
        push(t, 'arp', noteOf(60, deg), 0.22 * accent + 0.08, spb / 6);
      }
      if (a.arp && P.arp === 'bell' && step % 3 === 0) {
        const deg = chordDeg + arpShape[(step / 3) % arpShape.length] + 7;
        push(t, 'fmbell', noteOf(72, deg), 0.18 + 0.08 * accent, spb * 0.8);
      }
      if (a.arp && P.arp === 'harp') {
        // a harp running up two octaves of the chord, and back down
        const seq = [...harpShape, ...harpShape.map((d) => d + 7)];
        const idx = step < 8 ? step : 15 - step;
        push(t, 'harp', noteOf(60, chordDeg + seq[idx % 8]), 0.2 * accent + 0.1, spb);
      }
      if (a.arp && P.arp === 'pluck16') {
        const deg = chordDeg + arpShape[step % arpShape.length] + 7 * (Math.floor(step / 8) % 2);
        push(t, 'arp', noteOf(72, deg), 0.13 + 0.06 * accent, sixteenth * 0.8);
      }

      // ---- arcade sound effects, played in time and in key ----
      if (P.sfx) {
        if (a.arp && zapPat[step]) push(t, 'zap', noteOf(84, chordDeg + [0, 2, 4][step % 3]), 0.3, 0.14);
        if (a.chords && bar % 4 === 1 && step === 0) push(t, 'blip', noteOf(84, chordDeg), 0.35, 0.16);
      }

      // ---- lead ----
      if (a.lead) {
        const mi = (bar * 3 + Math.floor(step / 2)) % motif.length;
        switch (P.lead) {
          case 'lead':
            if (leadRhythm[step]) {
              push(t, 'lead', noteOf(leadOct, chordDeg + motif[mi]), 0.3 + 0.12 * a.intensity,
                spb * (step % 4 === 0 ? 0.75 : 0.42));
            }
            break;
          case 'chip':
            if (lead16[step]) {
              const run = motif[(step + bar * 3) % motif.length] + (step % 4 === 3 ? 7 : 0);
              push(t, 'chip', noteOf(72, chordDeg + run), 0.5, sixteenth * 0.95);
            }
            break;
          case 'supersaw':
            if (step % 2 === 0 && lead8[step / 2]) {
              const up = a.intensity > 0.85 ? 12 : 0;
              push(t, 'supersaw', noteOf(72 + up, chordDeg + motif[mi]), 0.42, sixteenth * 1.8);
            }
            break;
          case 'brass':
            if (step % 2 === 0 && lead8[step / 2]) {
              push(t, 'brass', noteOf(60, chordDeg + motif[mi]), 0.5, spb * 0.9);
            }
            break;
          case 'fmbell':
            if (leadRhythm[step]) push(t, 'fmbell', noteOf(72, chordDeg + motif[mi]), 0.35, spb * 1.2);
            break;
          case 'hero': {
            const fill = bar % 4 === 3;
            if (fill ? lead16[step] : (step % 2 === 0 && lead8[step / 2])) {
              const run = fill ? motif[(step + bar) % motif.length] + (step % 4 === 3 ? 7 : 0) : motif[mi];
              push(t, 'lead', noteOf(72, chordDeg + run), 0.42 + 0.1 * a.intensity,
                sixteenth * (fill ? 0.95 : 1.8), { kit: 'hero' });
            }
            break;
          }
          case 'gbchip':
            if (lead16[step]) {
              const run = motif[(step + bar * 3) % motif.length] + (step % 4 === 3 ? 7 : 0);
              push(t, 'chip', noteOf(72, chordDeg + run), 0.5, sixteenth * 0.95, { kit: 'gb' });
            }
            break;
          case 'hook': {
            if (hookLine) {
              // the line: chord tones on the beats, steps between, an arch to each phrase, the same each time round
              const tune = hookAnswer && Math.floor(bar / hookBars) % 4 === 2 ? hookAnswer : hookLine;
              const nt = tune[bar % hookBars].find((x) => x.step === step);
              if (!nt) break;
              const lift = 0;                      // (a line keeps one register: no octave leap at the peak)
              const len = STEPS < 16 ? Math.min(nt.len, STEPS - step) : nt.len;   // (an odd metre's bar ends early)
              push(t, P.hook.instr, noteOf(anBase + lift, nt.deg) + (P.hook.oct >= 64 && anBase < 60 ? 12 : 0), P.hook.vel * (step % 4 === 0 ? 1 : 0.9),
                len * sixteenth * 0.95, P.hook.kit ? { kit: P.hook.kit } : undefined);
              break;
            }
            const half = bar % 2;
            const rh = hookRhythm[half];
            if (!rh[step]) break;
            let deg = hookDeg[half * STEPS + step];
            // strong beats land on the chord
            if (step % 4 === 0) deg = [0, 2, 4, 7].reduce((b, c) => (Math.abs(c - deg) < Math.abs(b - deg) ? c : b));
            // every fourth bar the answer comes home
            if (bar % 4 === 3 && step >= STEPS / 2) deg = step % 4 === 0 ? 0 : Math.min(deg, 2);
            let next = step + 1;
            while (next < STEPS && !rh[next]) next++;
            const H = P.hook;
            const lift = H.lift && a.intensity > 0.9 ? 12 : 0;
            push(t, H.instr, noteOf(H.oct + lift, chordDeg + deg), H.vel * (step % 4 === 0 ? 1 : 0.85),
              Math.min((next - step) * sixteenth * 0.9, spb * 1.5), H.kit ? { kit: H.kit } : undefined);
            break;
          }
          case 'shout': {
            // the line: sung plain in the verse, and in the chorus shouted - two voices in unison, the
            // wide one doubling it like a gang - a few notes, chanted on the eighths
            const sc = anForm[bar];
            const line = anMel[sc.name];
            if (!line) break;
            const nt = line[sc.k % line.length].find((x) => x.step === step);
            if (!nt) break;
            const n = noteOf(anBase, nt.deg);
            const len = nt.len * sixteenth * 0.9;
            const loud = sc.name === 'chorus' || sc.name === 'last';
            push(t, 'lead', n, loud ? 0.42 : 0.38, len);
            if (loud) push(t, 'supersaw', n, 0.3, len);
            break;
          }
          case 'anisong': {
            // the singer: the section's line, the same each time it comes back; in the last
            // chorus the brass sings it too, an octave down
            const sc = anForm[bar];
            const line = anMel[sc.name];
            if (!line) break;
            const nt = line[sc.k % line.length].find((x) => x.step === step);
            if (!nt) break;
            const n = noteOf(anBase, nt.deg);
            const len = nt.len * sixteenth * 0.96;
            const loud = sc.name === 'chorus' || sc.name === 'last';
            push(t, 'lead', n, (loud ? 0.62 : 0.55) * (step % 4 === 0 ? 1 : 0.9), len);   // (the singer over the band)
            if (sc.name === 'last') push(t, 'brass', n - 12, 0.22, len);
            break;
          }
          case 'noir': {
            // a theremin singing the hook, sparse, gliding from one note to the next
            const half = bar % 2;
            const rh = hookRhythm[half];
            if (!rh[step]) break;
            let deg = hookDeg[half * STEPS + step];
            if (step % 4 === 0) deg = [0, 2, 4, 7].reduce((b, c) => (Math.abs(c - deg) < Math.abs(b - deg) ? c : b));
            if (bar % 4 === 3 && step >= STEPS / 2) deg = step % 4 === 0 ? 0 : Math.min(deg, 2);
            let next = step + 1;
            while (next < STEPS && !rh[next]) next++;
            const n = noteOf(72, chordDeg + deg);
            const at = bar * STEPS + step;
            push(t, 'theremin', n, 0.4, Math.min((next - step) * sixteenth, spb * 2), { slideFrom: thLast && at - thLast.at <= 6 ? thLast.n : null });
            thLast = { n, at };
            break;
          }
          case 'squelch': {
            // the call and answer of the hook, on a squelching tracker lead that slides into its
            // notes (the 3xx effect); the echo channel plays it again a few rows on, quieter, on the other side
            const half = bar % 2;
            const rh = hookRhythm[half];
            if (!rh[step]) break;
            let deg = hookDeg[half * STEPS + step];
            if (step % 4 === 0) deg = [0, 2, 4, 7].reduce((b, c) => (Math.abs(c - deg) < Math.abs(b - deg) ? c : b));
            if (bar % 4 === 3 && step >= STEPS / 2) deg = step % 4 === 0 ? 0 : Math.min(deg, 2);
            let next = step + 1;
            while (next < STEPS && !rh[next]) next++;
            const n = noteOf(72, chordDeg + deg);
            const at = bar * STEPS + step;
            const from = kgLast && at - kgLast.at <= 2 && kgLast.n !== n && kr.bool(kgSlide) ? kgLast.n : null;
            const len = Math.min((next - step) * sixteenth * 0.95, spb * 1.5);
            const vel = 0.5 * (step % 4 === 0 ? 1 : 0.85);
            push(t, 'xmlead', n, vel, len, { slideFrom: from });
            if (kgEcho) push(t + kgEcho * sixteenth, 'xmlead', n, vel * 0.45, len, { slideFrom: from, kit: 'echo' });
            kgLast = { n, at };
            break;
          }
          case 'pianolead':
            if (lead16[step] && step % 2 === 0) {
              push(t, 'piano', noteOf(72, chordDeg + motif[mi]), 0.45, spb * 0.5);
            }
            break;
          default:
            break;
        }
      }
    }
  }

  events.sort((x, y) => x.t - y.t);

  return {
    meta: {
      bpm, root, rootName: NOTE_NAMES[root], scaleName,
      scaleLabel: scaleName.replace(/([A-Z])/g, ' $1').toLowerCase(),   // "harmonic minor"
      music: style, musicLabel: P.label, fx: P.fx, chip,
      progression, swing,
      bars: totalBars, barSec, spb, duration, title: makeTitle(seed),
      // sixteenths a bar, and the bars that open on a crash or the drop: where games land their big moments
      steps: STEPS,
      accents: arrangement.flatMap((a, bar) => (a.crash || a.drop ? [bar] : [])),
    },
    events,
    arrangement,
    totalSamples,
  };
}

// ---------------------------------------------------------------------------
// DSP primitives
// ---------------------------------------------------------------------------

function polyBlep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

/** Band-limited saw on oscillator slot i of a voice. */
function sawAt(v, i, dt) {
  let p = v.ph[i] + dt;
  if (p >= 1) p -= 1;
  v.ph[i] = p;
  return 2 * p - 1 - polyBlep(p, dt);
}

/** Band-limited pulse of width pw on oscillator slot i. */
function pulseAt(v, i, dt, pw) {
  let p = v.ph[i] + dt;
  if (p >= 1) p -= 1;
  v.ph[i] = p;
  let s = p < pw ? 1 : -1;
  s += polyBlep(p, dt);
  s -= polyBlep((p + 1 - pw) % 1, dt);
  return s;
}

/** Sine on oscillator slot i. */
function sineAt(v, i, dt) {
  let p = v.ph[i] + dt;
  if (p >= 1) p -= 1;
  v.ph[i] = p;
  return Math.sin(TAU * p);
}

/** Chamberlin state-variable filter, one channel. */
class SVF {
  constructor() { this.low = 0; this.band = 0; this.high = 0; }
  /** Returns the filter itself, its low, band and high outputs set: nothing to allocate per sample. */
  process(x, cutoff, res) {
    const f = 2 * Math.sin(Math.PI * Math.min(cutoff, SR * 0.2) / SR);
    const q = Math.max(0.05, 1 / Math.max(0.5, res));
    const high = x - this.low - q * this.band;
    this.band += f * high;
    this.low += f * this.band;
    if (!Number.isFinite(this.low) || !Number.isFinite(this.band)) { this.low = 0; this.band = 0; }
    this.high = high;
    return this;
  }
}

/** Analytic AD(S)R: amplitude from note age, so nothing can drift. */
function envAt(age, dur, a, d, s, r) {
  if (age < 0) return 0;
  let amp;
  if (age < a) amp = age / a;
  else amp = s + (1 - s) * Math.exp(-(age - a) / d);
  if (age > dur) amp *= Math.exp(-(age - dur) / r);
  return amp;
}

class Delay {
  constructor(maxSec) {
    this.buf = new Float32Array(Math.ceil(maxSec * SR));
    this.idx = 0;
  }
  read(delaySamples) {
    let i = this.idx - delaySamples;
    while (i < 0) i += this.buf.length;
    return this.buf[i | 0];
  }
  write(x) { this.buf[this.idx] = x; this.idx = (this.idx + 1) % this.buf.length; }
}

/** Schroeder reverb: four combs into two allpasses. */
class Reverb {
  constructor(offset) {
    this.combs = [1557, 1617, 1491, 1422].map((n) =>
      ({ buf: new Float32Array(n + offset), i: 0, fb: 0.8, store: 0 }));
    this.aps = [225, 556].map((n) => ({ buf: new Float32Array(n + offset), i: 0 }));
    this.damp = 0.3;
  }
  process(x) {
    let out = 0;
    for (const c of this.combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - this.damp) + c.store * this.damp;
      c.buf[c.i] = x + c.store * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      out += y;
    }
    out *= 0.25;
    for (const a of this.aps) {
      const y = a.buf[a.i];
      const v = out + y * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      out = y - v * 0.5;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

class Voice {
  constructor(ev, seedNum) {
    this.ev = ev;
    this.age = 0;
    this.phase = 0;
    this.phase2 = 0;
    this.phase3 = 0;
    this.ph = new Float64Array(8);
    this.done = false;
    this.filt = new SVF();
    this.filt2 = new SVF();
    // noise seeded from the event's position: same event, same noise, always
    this.noiseState = ((seedNum ^ Math.imul(ev.t + 1, 2654435761)) >>> 0) || 1;
  }
  noise() {
    let x = this.noiseState;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.noiseState = x;
    return x / 2147483648 - 1;
  }
}

// the scratched record's "ah": the voice's harmonics, two formants
const SCRATCH_W = [0.5, 0.7, 0.9, 1.0, 0.8, 0.5, 0.55, 0.4, 0.2, 0.1];
const SUPERSAW = [-0.03, -0.018, -0.008, 0, 0.009, 0.019, 0.031];
const ORGAN_H = [1, 2, 3, 4, 6];               // the organ's drawbars
const ORGAN_A = [1, 0.7, 0.45, 0.3, 0.18];
const ANVIL_R = [1, 2.76, 5.4, 8.93, 13.34];   // struck metal's partials
const HOOVER = [-0.025, -0.011, 0, 0.013, 0.027];

const INSTR = {
  kick: {
    tail: 0.5,
    render(v, out) {
      const t = v.age / SR;
      const kit = v.ev.kit;
      if (kit === 'chip') {
        // C64: a square that drops in pitch, over in a blink
        const f = 55 + 260 * Math.exp(-t * 45);
        v.phase += f / SR;
        const sq = Math.sin(TAU * v.phase) > 0 ? 1 : -1;
        out[0] = out[1] = sq * Math.exp(-t * 18) * v.ev.vel * 0.5;
        return;
      }
      if (kit === 'gabber') {
        // a 909 pushed through a wall of distortion until it whistles
        const f = 52 + 240 * Math.exp(-t * 20) + 600 * Math.exp(-t * 200);
        v.phase += f / SR;
        const amp = Math.exp(-t * 4.2) * (1 - Math.exp(-t * 1500));
        out[0] = out[1] = Math.tanh(Math.sin(TAU * v.phase) * amp * 7) * v.ev.vel * 0.62;
        return;
      }
      if (kit === '909' || kit === 'break') {
        const f = 48 + 150 * Math.exp(-t * 30) + 500 * Math.exp(-t * 220);
        v.phase += f / SR;
        const body = Math.sin(TAU * v.phase);
        const click = v.noise() * Math.exp(-t * 600) * 0.6;
        const decay = kit === 'break' ? 9 : 5.2;
        const amp = Math.exp(-t * decay) * (1 - Math.exp(-t * 1200));
        out[0] = out[1] = Math.tanh(body * amp * 1.7 + click) * v.ev.vel * 0.95;
        return;
      }
      const f = 48 + 120 * Math.exp(-t * 34) + 400 * Math.exp(-t * 180);
      v.phase += f / SR;
      const body = Math.sin(TAU * v.phase);
      const click = v.noise() * Math.exp(-t * 420) * 0.5;
      const amp = Math.exp(-t * 6.2) * (1 - Math.exp(-t * 900));
      out[0] = out[1] = (body * amp + click) * v.ev.vel * 1.15;
    },
  },
  snare: {
    tail: 0.45,
    render(v, out) {
      const t = v.age / SR;
      const kit = v.ev.kit;
      if (kit === 'chip') {
        const n = v.filt.process(v.noise(), 3200, 0.8).high;
        v.phase += 190 / SR;
        const tone = (Math.sin(TAU * v.phase) > 0 ? 1 : -1) * Math.exp(-t * 40) * 0.3;
        out[0] = out[1] = (n * Math.exp(-t * 26) * 0.75 + tone) * v.ev.vel;
        return;
      }
      if (kit === 'gated') {
        // the 1980s snare: a burst of room, then the gate slams shut
        v.phase += 190 / SR;
        const tone = Math.sin(TAU * v.phase) * Math.exp(-t * 18) * 0.5;
        const f = v.filt.process(v.noise(), 1800 + 1500 * Math.exp(-t * 10), 0.9);
        const body = (f.band * 1.2 + f.high * 0.6) * (t < 0.18 ? Math.exp(-t * 2.5) : Math.exp(-0.45 - (t - 0.18) * 110));
        const sig = Math.tanh((tone + body) * 1.2) * v.ev.vel;
        out[0] = sig * 0.95; out[1] = sig;
        return;
      }
      if (kit === 'break') {
        // brighter and snappier: the sampled-break sound
        v.phase += 205 / SR;
        v.phase2 += 345 / SR;
        const tone = (Math.sin(TAU * v.phase) + 0.5 * Math.sin(TAU * v.phase2)) * Math.exp(-t * 22);
        const f = v.filt.process(v.noise(), 2600 + 3000 * Math.exp(-t * 25), 1.0);
        const noisy = (f.band * 1.4 + f.high * 0.8) * Math.exp(-t * 12);
        const s = Math.tanh((tone * 0.5 + noisy) * 1.3) * v.ev.vel;
        out[0] = s * 0.97; out[1] = s;
        return;
      }
      v.phase += 186 / SR;
      v.phase2 += 331 / SR;
      const tone = (Math.sin(TAU * v.phase) + 0.6 * Math.sin(TAU * v.phase2)) * Math.exp(-t * 26);
      const f = v.filt.process(v.noise(), 1900 + 2600 * Math.exp(-t * 20), 1.1);
      const noisy = (f.band * 1.6 + f.high * 0.5) * Math.exp(-t * 15.5);
      const s = (tone * 0.45 + noisy * 0.9) * v.ev.vel;
      out[0] = s * 0.96; out[1] = s;
    },
  },
  clap: {
    tail: 0.35,
    render(v, out) {
      const t = v.age / SR;
      // three quick bursts, then the room
      let env = 0;
      for (let k = 0; k < 3; k++) {
        const tk = t - k * 0.0105;
        if (tk >= 0) env += Math.exp(-tk * 190);
      }
      env += Math.exp(-t * 13) * 0.55;
      const n = v.filt.process(v.noise(), 1250, 1.7).band;
      const s = n * env * v.ev.vel * 1.5;
      out[0] = s * 1.02; out[1] = s * 0.98;
    },
  },
  hat: {
    tail: 0.35,
    render(v, out) {
      const t = v.age / SR;
      const decay = v.ev.open ? 9.5 : 52;
      const n = v.noise() * 0.7 + v.noise() * 0.3;
      const s = v.filt.process(n, 7200, 0.9).high * Math.exp(-t * decay) * v.ev.vel;
      out[0] = s * 0.8; out[1] = s;
    },
  },
  crash: {
    tail: 2.6,
    render(v, out) {
      const t = v.age / SR;
      const n = v.noise();
      const f = v.filt.process(n, 6500, 0.8);
      const s = (f.high * 0.8 + f.band * 0.4) * Math.exp(-t * 2.1) * v.ev.vel * 0.5;
      out[0] = s * 0.9; out[1] = s;
    },
  },
  riser: {
    tail: 0.05,
    render(v, out) {
      const t = v.age / SR;
      const u = Math.min(1, t / Math.max(0.01, v.ev.dur / SR));
      const cut = 300 * Math.pow(2, 5 * u);
      const n = v.filt.process(v.noise(), Math.min(9000, cut), 3).band;
      const amp = u * u * v.ev.vel * 0.55 * (t > v.ev.dur / SR ? Math.exp(-(t - v.ev.dur / SR) * 60) : 1);
      const pan = 0.5 + 0.4 * Math.sin(TAU * 3 * t * u);
      out[0] = n * amp * (1 - pan) * 1.4; out[1] = n * amp * pan * 1.4;
    },
  },
  bass: {
    tail: 0.25,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note);
      const dt = f / SR;
      const dur = v.ev.dur / SR;
      if (v.ev.kit === 'sub') {
        // pure sub, a soft knock on top
        const s = sineAt(v, 0, dt) + 0.25 * sineAt(v, 1, dt * 2) * Math.exp(-t * 20);
        out[0] = out[1] = Math.tanh(s * 1.2) * envAt(t, dur, 0.004, 0.5, 0.85, 0.06) * v.ev.vel * 0.6;
        return;
      }
      v.phase += dt; if (v.phase >= 1) v.phase -= 1;
      v.phase2 += dt * 0.5; if (v.phase2 >= 1) v.phase2 -= 1;
      const saw = 2 * v.phase - 1 - polyBlep(v.phase, dt);
      const sub = Math.sin(TAU * v.phase2);
      if (v.ev.kit === 'ebm') {
        // New Beat sequencer bass: dark, short, a little dirty
        const amp = envAt(t, dur, 0.002, 0.07, 0.3, 0.02);
        const cut = Math.min(3200, 180 + 1700 * Math.exp(-t * 16));
        const o = v.filt.process(saw, cut, 3).low;
        out[0] = out[1] = Math.tanh(o * 2.6) * amp * v.ev.vel * 0.5;
        return;
      }
      if (v.ev.kit === 'pluck') {
        // offbeat trance bass: bright, short, punchy
        const amp = envAt(t, dur, 0.002, 0.09, 0.4, 0.03);
        const cut = Math.min(5000, 220 + 3200 * Math.exp(-t * 18));
        const o = v.filt.process(saw + sub * 0.6, cut, 1.6).low;
        out[0] = out[1] = Math.tanh(o * 2) * amp * v.ev.vel * 0.55;
        return;
      }
      const amp = envAt(t, dur, 0.004, 0.16, 0.55, 0.05);
      const cut = Math.min(6500, f * (2.2 + 9 * Math.exp(-t * 11)) + 80);
      const o = v.filt.process(saw * 0.8 + sub * 0.75, cut, 1.9).low;
      out[0] = out[1] = Math.tanh(o * 1.7) * amp * v.ev.vel * 0.72;
    },
  },
  chipbass: {
    tail: 0.06,
    render(v, out) {
      const t = v.age / SR;
      const dt = midiToFreq(v.ev.note) / SR;
      let s;
      if (v.ev.kit === 'wave') {
        // a triangle stored as 16 steps, the way a handheld's wave channel held it
        let p = v.ph[0] + dt;
        if (p >= 1) p -= 1;
        v.ph[0] = p;
        s = Math.round((1 - 4 * Math.abs(p - 0.5)) * 7.5) / 7.5;
      } else {
        s = pulseAt(v, 0, dt, 0.5);
      }
      const amp = envAt(t, v.ev.dur / SR, 0.002, 0.1, 0.7, 0.02);
      out[0] = out[1] = s * amp * v.ev.vel * 0.34;
    },
  },
  acid: {
    tail: 0.06,
    render(v, out) {
      const t = v.age / SR;
      let f = midiToFreq(v.ev.note);
      if (v.ev.slideFrom !== null && v.ev.slideFrom !== undefined) {
        const f0 = midiToFreq(v.ev.slideFrom);
        f = f0 * Math.pow(f / f0, Math.min(1, t / 0.055));
      }
      const acc = v.ev.accent ? 1 : 0;
      const s = sawAt(v, 0, f / SR);
      const envc = Math.exp(-t * (acc ? 8 : 13));
      const cut = Math.min(4800, 160 + (700 + 2300 * acc + v.ev.cut * 1700) * envc + v.ev.cut * 500);
      const o = v.filt.process(s, cut, 7 + 3 * acc).low;
      const amp = envAt(t, v.ev.dur / SR, 0.002, 0.3, 0.8, 0.012) * (acc ? 1.2 : 0.9);
      out[0] = out[1] = Math.tanh(o * 2.4) * amp * v.ev.vel * 0.4;
    },
  },
  reese: {
    tail: 0.12,
    render(v, out) {
      const t = v.age / SR;
      let f = midiToFreq(v.ev.note);
      if (v.ev.slideFrom !== null && v.ev.slideFrom !== undefined) {
        const f0 = midiToFreq(v.ev.slideFrom);
        f = f0 * Math.pow(f / f0, Math.min(1, t / 0.12));
      }
      const a = sawAt(v, 0, (f * 0.994) / SR);
      const b = sawAt(v, 1, (f * 1.006) / SR);
      const c = sawAt(v, 2, (f * 1.0015) / SR);
      const sub = sineAt(v, 3, (f * 0.5) / SR);
      const cut = 280 + 520 * (0.5 + 0.5 * Math.sin(TAU * 0.35 * t + v.ev.note));
      const o = v.filt.process((a + b + c) * 0.4, cut, 1.5).low;
      const amp = envAt(t, v.ev.dur / SR, 0.012, 0.6, 0.9, 0.08);
      const s = Math.tanh(o * 2.2 + sub * 0.7) * amp * v.ev.vel * 0.5;
      out[0] = s; out[1] = s;
    },
  },
  pad: {
    tail: 1.6,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note);
      const d1 = f / SR, d2 = f * 1.0048 / SR, d3 = f * 0.9951 / SR;
      v.phase += d1; if (v.phase >= 1) v.phase -= 1;
      v.phase2 += d2; if (v.phase2 >= 1) v.phase2 -= 1;
      v.phase3 += d3; if (v.phase3 >= 1) v.phase3 -= 1;
      const a = 2 * v.phase - 1 - polyBlep(v.phase, d1);
      const b = 2 * v.phase2 - 1 - polyBlep(v.phase2, d2);
      const c = 2 * v.phase3 - 1 - polyBlep(v.phase3, d3);
      const amp = envAt(t, v.ev.dur / SR, 0.45, 1.2, 0.8, 0.9);
      const lfo = Math.sin(TAU * (0.11 * t + v.ev.note * 0.017));
      const o = v.filt.process((a + b + c) * 0.33, 420 + 700 * (0.5 + 0.5 * lfo), 1.2).low;
      const s = o * amp * v.ev.vel;
      out[0] = s * (0.75 + 0.25 * lfo); out[1] = s * (0.75 - 0.25 * lfo);
    },
  },
  arp: {
    tail: 0.3,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note);
      const dt = f / SR;
      v.phase += dt; if (v.phase >= 1) v.phase -= 1;
      const pw = 0.3;
      let sq = v.phase < pw ? 1 : -1;
      sq += polyBlep(v.phase, dt);
      sq -= polyBlep((v.phase + 1 - pw) % 1, dt);
      const amp = envAt(t, v.ev.dur / SR, 0.002, 0.07, 0, 0.03);
      const o = v.filt.process(sq, 1200 + 4200 * Math.exp(-t * 24), 1.5).low;
      const pan = ((v.ev.note % 7) / 7) * 0.7 + 0.15;
      const s = o * amp * v.ev.vel * 0.6;
      out[0] = s * (1 - pan); out[1] = s * pan;
    },
  },
  chip: {
    tail: 0.06,
    render(v, out) {
      const t = v.age / SR;
      // SID lead: pulse-width modulation, and vibrato that waits a moment
      const vib = 1 + 0.012 * Math.sin(TAU * 6 * t) * Math.min(1, Math.max(0, (t - 0.16) * 5));
      const dt = (midiToFreq(v.ev.note) * vib) / SR;
      const pw = v.ev.kit === 'gb' ? 0.25 : 0.5 + 0.38 * Math.sin(TAU * 3.1 * t + v.ev.note);
      const s = pulseAt(v, 0, dt, pw);
      const o = v.filt.process(s, 5500, 0.7).low;
      const amp = envAt(t, v.ev.dur / SR, 0.003, 0.2, 0.65, 0.02);
      const sig = o * amp * v.ev.vel * 0.32;
      out[0] = sig * 0.92; out[1] = sig;
    },
  },
  chiparp: {
    tail: 0.04,
    render(v, out) {
      const t = v.age / SR;
      // the C64 chord: one voice cycling through the notes at 50 Hz
      const chord = v.ev.chord;
      const note = chord[Math.floor(t * 50) % chord.length];
      const pw = v.ev.kit === 'gb' ? 0.5 : 0.25 + 0.18 * Math.sin(TAU * 0.7 * t);
      const s = pulseAt(v, 0, midiToFreq(note) / SR, pw);
      const amp = envAt(t, v.ev.dur / SR, 0.003, 0.4, 0.7, 0.02);
      const sig = s * amp * v.ev.vel * 0.26;
      out[0] = sig; out[1] = sig * 0.9;
    },
  },
  // --- the sounds between the tracks ----------------------------------------------
  // a dial-up modem's handshake, from an annotated spectrogram of one (Oona
  // Raisanen, "The sound of the dialup, pictured"), squeezed into the mix from one
  // track into the next: the dial tone, the number dialled in DTMF, the answering
  // modem's bursts, the 2100 Hz answer tone with its snaps, the probing comb of
  // tones, the hiss of scrambled data - and silence, connected, on the drop
  modem: {
    tail: 0.01,
    render(v, out) {
      const t = v.age / SR, D = Math.max(0.5, v.ev.dur / SR), u = t / D;
      if (u >= 1) { out[0] = out[1] = 0; return; }
      const sin = (f, ph = 0) => Math.sin(TAU * f * t + ph);
      let s = 0;
      if (u < 0.05) s = 0.5 * (sin(350) + sin(440));                          // the dial tone
      else if (u < 0.16) {                                                    // the number, in DTMF
        const k = Math.floor((u - 0.05) / 0.01), w = ((u - 0.05) / 0.01) % 1;
        const lo = [697, 770, 852, 941][(k * 7 + 3) % 4], hi = [1209, 1336, 1477][(k * 5 + 1) % 3];
        s = w < 0.65 ? 0.5 * (sin(lo) + sin(hi)) : 0;
      } else if (u >= 0.22 && u < 0.40) {                                     // the answer, bursts of FSK
        const burst = Math.floor((u - 0.22) / 0.045), on = ((u - 0.22) / 0.045) % 1 < 0.75;
        const bit = (Math.floor(t * 300) * 2654435761 >>> 0) % 2;
        const [m0, m1] = burst % 2 ? [980, 1180] : [1650, 1850];
        if (on) { v.phase += (bit ? m1 : m0) / SR; s = Math.sin(TAU * v.phase) * 0.8; }
      } else if (u >= 0.44 && u < 0.63) {                                     // the answer tone, its snaps every 450 ms
        const ta = t - 0.44 * D;
        s = 0.7 * Math.sin(TAU * 2100 * t + Math.PI * Math.floor(ta / 0.45)) * (1 + 0.2 * Math.sin(TAU * 15 * t));
        if (u >= 0.53) { const bit = (Math.floor(t * 300) * 40503 >>> 0) % 2; v.phase2 += (bit ? 1180 : 980) / SR; s += 0.5 * Math.sin(TAU * v.phase2); }
      } else if (u >= 0.63 && u < 0.70) {                                     // the probing: a comb of tones, 150 Hz apart
        const on = ((u - 0.63) / 0.035) % 1 < 0.8 ? 1 : 0;
        for (let k = 1; k <= 25; k++) s += Math.cos(TAU * 150 * k * t + k * k * 0.37) * 0.09;
        s *= on;
      } else if (u >= 0.70) {                                                 // scrambled data: the hiss
        const f = v.filt.process(v.noise(), 1800, 0.55);
        s = f.band * (u < 0.85 ? 4.0 : 5.0);                                 // as loud as the tones, louder when both talk
      }
      // a telephone line's band, and the speaker it came out of
      s = v.filt2.process(s, 2600, 0.7).low;
      const sig = s * v.ev.vel * 0.32;
      out[0] = sig; out[1] = sig;
    },
  },
  // a cartridge going in: a slide, the click as it seats, the clack, the power switch's thump
  cartridge: {
    tail: 0.05,
    render(v, out) {
      const t = v.age / SR;
      let s = 0;
      if (t < 0.06) s += v.filt.process(v.noise(), 1500, 1.2).band * 0.15;
      const hit = (at, f, body, decay) => {
        const x = t - at;
        if (x < 0) return 0;
        return Math.sin(TAU * body * x) * Math.exp(-x * decay) * 0.6 + v.noise() * Math.exp(-x * 900) * f;
      };
      s += hit(0.06, 0.8, 320, 60) + hit(0.14, 0.5, 140, 35);
      const p = t - 0.27;
      if (p >= 0) s += Math.sin(TAU * 60 * p) * Math.exp(-p * 40) * 0.8;
      const sig = Math.tanh(s) * v.ev.vel * 0.6;
      out[0] = sig; out[1] = sig * 0.95;
    },
  },
  // each era's chime, of its own, in the spirit of how its machines started; on the incoming
  // track's key (the note is its root)
  chime: {
    tail: 2.6,
    render(v, out) {
      const t = v.age / SR, era = v.ev.kit, n = v.ev.note;
      const hz = (m) => midiToFreq(m);
      let s = 0;
      if (era === 'arcade') {
        // a coin dropping in - two metal pings - and the credit counting up
        for (const at of [0, 0.07]) {
          const x = t - at;
          if (x >= 0) for (const [r, a] of [[1, 0.5], [2.76, 0.3], [5.4, 0.15]]) s += Math.sin(TAU * 1900 * r * x) * a * Math.exp(-x * 9);
        }
        const x = t - 0.25;
        if (x >= 0 && x < 0.3) { v.phase += hz(n + 24) * Math.pow(2, Math.min(1, x / 0.12)) / SR; s += (v.phase % 1 < 0.5 ? 0.35 : -0.35) * Math.exp(-x * 6); }
      } else if (era === 'c64') {
        // the SID: a pulse running up the chord, then holding with its width moving
        const steps = [0, 4, 7, 12], k = Math.min(3, Math.floor(t / 0.06));
        v.phase += hz(n + 12 + steps[k]) / SR;
        const pw = 0.5 + 0.35 * Math.sin(TAU * 3 * t);
        s = (v.phase % 1 < pw ? 0.4 : -0.4) * envAt(t, 0.9, 0.003, 0.3, 0.6, 0.25);
      } else if (era === 'amiga') {
        // the floppy drive, stepping: click, click, click-clack
        for (const at of [0, 0.13, 0.26, 0.33]) {
          const x = t - at;
          if (x >= 0) s += v.filt.process(v.noise(), 1100, 3).band * Math.exp(-x * 120) * 0.9 + Math.sin(TAU * 90 * x) * Math.exp(-x * 50) * 0.3;
        }
      } else if (era === 'dos') {
        // the beep a PC gives when it has checked itself and found all well
        v.phase += 1000 / SR;
        s = t < 0.18 ? (v.phase % 1 < 0.5 ? 0.3 : -0.3) : 0;
      } else if (era === 'handheld') {
        // a ping in two notes, the second a fifth above and ringing
        const second = t >= 0.08;
        v.phase += hz(n + 24 + (second ? 7 : 0)) / SR;
        s = (v.phase % 1 < 0.25 ? 0.3 : -0.1) * (second ? Math.exp(-(t - 0.08) * 3.5) : 1);
      } else if (era === 'console') {
        // a deep chord swelling out of nothing, a shimmer over it
        const sw = Math.min(1, t / 0.7) * Math.exp(-Math.max(0, t - 0.9) * 1.6);
        for (const [m, a] of [[-24, 0.35], [-12, 0.3], [-5, 0.2], [0, 0.18], [4, 0.12]]) s += Math.sin(TAU * hz(n + m) * t) * a;
        s += Math.sin(TAU * hz(n + 31) * t) * 0.06 * (0.5 + 0.5 * Math.sin(TAU * 7 * t));
        s *= sw;
      } else {
        // a soft bell, a chord of sines dying away slowly
        for (const [m, a, d] of [[-12, 0.3, 0.995], [0, 0.25, 1.002], [7, 0.18, 1], [16, 0.1, 1.003]]) s += Math.sin(TAU * hz(n + m) * d * t) * a;
        s *= Math.min(1, t / 0.02) * Math.exp(-t * 1.6);
      }
      const sig = s * v.ev.vel;
      out[0] = sig * 0.95; out[1] = sig;
    },
  },
  // --- trip-hop's: a break pitched down (a dull deep kick, a roomy snare and a
  //     side-stick, a ride, a shaker), the record's crackle, a deep bass, a
  //     record scratched back and forth, a theremin
  thkick: {
    tail: 0.5,
    render(v, out) {
      const t = v.age / SR;
      const f = 42 + 90 * Math.exp(-t * 25) + 300 * Math.exp(-t * 160);
      v.phase += f / SR;
      const amp = Math.exp(-t * 5) * (1 - Math.exp(-t * 900));
      const knock = v.filt.process(v.noise(), 1800, 0.8).low * Math.exp(-t * 90) * 0.6;
      out[0] = out[1] = Math.tanh((Math.sin(TAU * v.phase) * amp + knock) * 1.6) * v.ev.vel * 0.85;
    },
  },
  thsnare: {
    tail: 0.45,
    render(v, out) {
      const t = v.age / SR;
      if (v.ev.kit === 'stick') {
        // the side-stick: a short wooden click
        v.phase += 420 / SR;
        const n = v.filt.process(v.noise(), 2500, 1.2).band * Math.exp(-t * 45);
        const s = (Math.sin(TAU * v.phase) * Math.exp(-t * 60) * 0.6 + n) * v.ev.vel * 0.7;
        out[0] = s * 0.9; out[1] = s;
        return;
      }
      // the big one, pitched down: a low tone and a long, trashy noise
      v.phase += 160 / SR;
      v.phase2 += 270 / SR;
      const tone = (Math.sin(TAU * v.phase) + 0.5 * Math.sin(TAU * v.phase2)) * Math.exp(-t * 20);
      const f = v.filt.process(v.noise(), 1500 + 1500 * Math.exp(-t * 18), 0.9);
      const noisy = (f.band * 1.3 + f.high * 0.5) * Math.exp(-t * 9);
      const s = Math.tanh((tone * 0.5 + noisy) * 1.5) * v.ev.vel * 0.8;
      out[0] = s; out[1] = s * 0.95;
    },
  },
  thride: {
    tail: 0.8,
    render(v, out) {
      const t = v.age / SR;
      // a ride: a wash of noise and three metal partials ringing
      v.ph[0] += 3170 / SR; v.ph[1] += 4730 / SR; v.ph[2] += 5910 / SR;
      const ping = (Math.sin(TAU * v.ph[0]) + Math.sin(TAU * v.ph[1]) + Math.sin(TAU * v.ph[2])) * Math.exp(-t * 4) * 0.12;
      const wash = v.filt.process(v.noise(), 6000, 0.9).high * Math.exp(-t * 6) * 0.5;
      const s = (ping + wash) * v.ev.vel;
      out[0] = s * 0.8; out[1] = s;
    },
  },
  thshaker: {
    tail: 0.1,
    render(v, out) {
      const t = v.age / SR;
      const s = v.filt.process(v.noise(), 6500, 0.9).high * (1 - Math.exp(-t * 300)) * Math.exp(-t * 35) * v.ev.vel;
      out[0] = s; out[1] = s * 0.8;
    },
  },
  vinyl: {
    tail: 0.02,
    render(v, out) {
      const t = v.age / SR;
      // the record: a soft hiss, and a pop now and then
      const hiss = v.filt.process(v.noise(), 3000, 0.8).band * 0.012;
      if (v.noise() > 0.9993) v.phase = 1;
      v.phase *= 0.93;
      const pop = v.phase * (v.noise() > 0 ? 1 : -1) * 0.12;
      const fade = Math.min(1, t * 20, Math.max(0, (v.ev.dur / SR - t) * 20));
      const s = (hiss + pop) * fade * v.ev.vel;
      out[0] = s; out[1] = s * 0.9;
    },
  },
  thbass: {
    tail: 0.15,
    render(v, out) {
      const t = v.age / SR;
      let f = midiToFreq(v.ev.note);
      if (v.ev.slideFrom !== null && v.ev.slideFrom !== undefined) {
        const f0 = midiToFreq(v.ev.slideFrom);
        f = f0 * Math.pow(f / f0, Math.min(1, t / 0.1));
      }
      const dt = f / SR;
      const s = sineAt(v, 0, dt) + 0.3 * sineAt(v, 1, dt * 2) + 0.12 * sineAt(v, 2, dt * 3);
      const amp = envAt(t, v.ev.dur / SR, 0.006, 0.6, 0.8, 0.12);
      out[0] = out[1] = Math.tanh(s * 1.3) * amp * v.ev.vel * 0.55;
    },
  },
  scratch: {
    tail: 0.03,
    render(v, out) {
      const t = v.age / SR;
      const dur = v.ev.dur / SR;
      // a record pushed forward and pulled back once in the note's length: the hand's speed is the
      // pitch; a chirp cuts the fader on the way back, a tear stutters the push
      const u = Math.min(1, t / dur);
      let rate = 2.4 * Math.sin(TAU * u);
      if (v.ev.kit === 'tear' && u < 0.5) rate *= 0.6 + 0.4 * Math.sign(Math.sin(TAU * u * 6));
      v.phase += rate / SR;
      const pos = v.phase;
      // the sound on the record: a voice's "ah" on the chord's root, as a few harmonics
      const f0 = midiToFreq(v.ev.note);
      let src = 0;
      for (let k = 0; k < SCRATCH_W.length; k++) src += SCRATCH_W[k] * Math.sin(TAU * (k + 1) * f0 * pos);
      const gate = v.ev.kit === 'chirp' && rate < 0 ? 0 : 1;
      const level = Math.min(1, Math.abs(rate) * 0.8) * gate * Math.max(0, Math.min(1, (dur - t) * 200));
      const s = Math.tanh(src * 0.9) * level * v.ev.vel * 0.35;
      out[0] = s * 0.85; out[1] = s;
    },
  },
  theremin: {
    tail: 0.3,
    render(v, out) {
      const t = v.age / SR;
      let f = midiToFreq(v.ev.note);
      if (v.ev.slideFrom !== null && v.ev.slideFrom !== undefined) {
        const f0 = midiToFreq(v.ev.slideFrom);
        f = f0 * Math.pow(f / f0, Math.min(1, t / 0.18));
      }
      f *= 1 + 0.012 * Math.sin(TAU * 6 * t) * Math.min(1, t * 2.5);
      const dt = f / SR;
      const s = sineAt(v, 0, dt) + 0.08 * sineAt(v, 1, dt * 2);
      const amp = envAt(t, v.ev.dur / SR, 0.08, 0.5, 0.85, 0.25);
      const sig = s * amp * v.ev.vel * 0.42;
      out[0] = sig * 0.9; out[1] = sig;
    },
  },
  // --- the keygen's tracker samples: drums cut from records, the arpeggio effect
  //     stepping a chord on the tick, a bouncing bass, a squelchy lead
  xmkick: {
    tail: 0.4,
    render(v, out) {
      const t = v.age / SR;
      const f = 46 + 170 * Math.exp(-t * 32) + 700 * Math.exp(-t * 260);
      v.phase += f / SR;
      const amp = Math.exp(-t * 8) * (1 - Math.exp(-t * 1500));
      const click = v.noise() * Math.exp(-t * 500) * 0.5;
      out[0] = out[1] = Math.tanh(Math.sin(TAU * v.phase) * amp * 2.2 + click) * v.ev.vel * 0.85;
    },
  },
  xmsnare: {
    tail: 0.35,
    render(v, out) {
      const t = v.age / SR;
      v.phase += 210 / SR;
      const tone = Math.sin(TAU * v.phase) * Math.exp(-t * 28);
      const f = v.filt.process(v.noise(), 3000 + 2500 * Math.exp(-t * 30), 0.9);
      const noisy = (f.band * 1.2 + f.high) * Math.exp(-t * 16);
      const s = Math.tanh((tone * 0.55 + noisy) * 1.4) * v.ev.vel * 0.8;
      out[0] = s; out[1] = s * 0.96;
    },
  },
  xmhat: {
    tail: 0.3,
    render(v, out) {
      const t = v.age / SR;
      // (the filter's own limit: much past 7 kHz this one runs away)
      const s = v.filt.process(v.noise(), 7000, 0.9).high * Math.exp(-t * (v.ev.open ? 11 : 45)) * v.ev.vel;
      out[0] = s * 0.85; out[1] = s;
    },
  },
  xmbass: {
    tail: 0.05,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note), dt = f / SR;
      const s = sawAt(v, 0, dt) * 0.6 + pulseAt(v, 1, dt, 0.5) * 0.5;
      const o = v.filt.process(s, Math.min(6000, f * 4 + 2400 * Math.exp(-t * 26)), 1.4).low;
      const amp = envAt(t, v.ev.dur / SR, 0.001, 0.14, 0.45, 0.015);
      out[0] = out[1] = Math.tanh(o * 1.8) * amp * v.ev.vel * 0.5;
    },
  },
  xmarp: {
    tail: 0.03,
    render(v, out) {
      const t = v.age / SR;
      // the arpeggio effect: the note, then +x, then +y, a tick each, at the song's tick rate
      const chord = v.ev.chord;
      const note = chord[Math.floor(t * v.ev.rate) % chord.length];
      const s = pulseAt(v, 0, midiToFreq(note) / SR, 0.5);
      const amp = envAt(t, v.ev.dur / SR, 0.001, 0.3, 0.55, 0.02);
      const sig = s * amp * v.ev.vel * 0.24;
      out[0] = sig * 0.7; out[1] = sig;
    },
  },
  xmlead: {
    tail: 0.05,
    render(v, out) {
      const t = v.age / SR;
      let f = midiToFreq(v.ev.note);
      // sliding into the note (the 3xx effect), then a vibrato that waits a moment (4xy)
      if (v.ev.slideFrom !== null && v.ev.slideFrom !== undefined) {
        const f0 = midiToFreq(v.ev.slideFrom);
        f = f0 * Math.pow(f / f0, Math.min(1, t / 0.07));
      }
      f *= 1 + 0.008 * Math.sin(TAU * 5.5 * t) * Math.min(1, Math.max(0, (t - 0.14) * 6));
      const dt = f / SR;
      const s = sawAt(v, 0, dt) * 0.55 + pulseAt(v, 1, dt, 0.35) * 0.45;
      // the squelch: a resonant filter snapping open and closing again on every note; the echo duller
      const echo = v.ev.kit === 'echo';
      const cut = Math.min(7000, 500 + 3800 * Math.exp(-t * 11) + f * 1.5) * (echo ? 0.6 : 1);
      const o = v.filt.process(s, cut, 6).low;
      const amp = envAt(t, v.ev.dur / SR, 0.002, 0.2, 0.7, 0.02);
      const sig = Math.tanh(o * 1.6) * amp * v.ev.vel * 0.42;
      if (echo) { out[0] = sig * 0.35; out[1] = sig; } else { out[0] = sig; out[1] = sig * 0.55; }
    },
  },
  lead: {
    tail: 0.5,
    render(v, out) {
      const t = v.age / SR;
      const hero = v.ev.kit === 'hero';
      const vib = 1 + (hero ? 0.009 : 0.004) * Math.sin(TAU * 5.4 * t) * Math.min(1, t * 3);
      const f = midiToFreq(v.ev.note) * vib;
      const d1 = f / SR, d2 = f * 1.007 / SR;
      v.phase += d1; if (v.phase >= 1) v.phase -= 1;
      v.phase2 += d2; if (v.phase2 >= 1) v.phase2 -= 1;
      const a = 2 * v.phase - 1 - polyBlep(v.phase, d1);
      const b = 2 * v.phase2 - 1 - polyBlep(v.phase2, d2);
      const amp = envAt(t, v.ev.dur / SR, 0.012, 0.35, 0.6, 0.12);
      const o = v.filt.process((a + b) * 0.5, (hero ? 1800 : 900) + 3600 * amp, 1.6).low;
      const s = Math.tanh(o * (hero ? 1.8 : 1.4)) * amp * v.ev.vel * 0.55;
      out[0] = s * 0.95; out[1] = s * 1.05;
    },
  },
  supersaw: {
    tail: 0.25,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note);
      let L = 0, R = 0;
      for (let i = 0; i < SUPERSAW.length; i++) {
        const s = sawAt(v, i, (f * (1 + SUPERSAW[i])) / SR);
        if (i % 2) L += s; else R += s;
        if (i === 3) { L += s * 0.5; R += s * 0.5; }
      }
      const amp = envAt(t, v.ev.dur / SR, 0.004, 0.3, 0.75, 0.15);
      const cut = 1400 + 4200 * amp;
      const l = v.filt.process(L, cut, 0.9).low;
      const r = v.filt2.process(R, cut, 0.9).low;
      out[0] = l * amp * v.ev.vel * 0.2; out[1] = r * amp * v.ev.vel * 0.2;
    },
  },
  hoover: {
    tail: 0.3,
    render(v, out) {
      const t = v.age / SR;
      // the 1991 hoover: detuned saws that swoop up into pitch
      const semis = -5 * Math.exp(-t * 26) + 0.25 * Math.sin(TAU * 5 * t) * Math.min(1, t * 2);
      const f = midiToFreq(v.ev.note) * Math.pow(2, semis / 12);
      let L = 0, R = 0;
      for (let i = 0; i < HOOVER.length; i++) {
        const s = sawAt(v, i, (f * (1 + HOOVER[i])) / SR);
        if (i % 2) L += s; else R += s;
      }
      const sub = sineAt(v, 6, (f * 0.5) / SR);
      const amp = envAt(t, v.ev.dur / SR, 0.01, 0.4, 0.7, 0.12);
      const cut = 1600 + 1600 * Math.exp(-t * 5);
      const l = v.filt.process(L + sub, cut, 1.1).low;
      const r = v.filt2.process(R + sub, cut, 1.1).low;
      out[0] = Math.tanh(l * 0.6) * amp * v.ev.vel * 0.5;
      out[1] = Math.tanh(r * 0.6) * amp * v.ev.vel * 0.5;
    },
  },
  piano: {
    tail: 0.4,
    render(v, out) {
      const t = v.age / SR;
      // a rave piano stab: a few decaying partials and a hammer
      const f = midiToFreq(v.ev.note);
      let s = 0;
      for (let k = 1; k <= 6; k++) {
        const p = sineAt(v, k - 1, (f * k * (1 + 0.0004 * k * k)) / SR);
        s += p * Math.exp(-t * (2.2 + 1.8 * k)) / Math.pow(k, 1.3);
      }
      s += v.noise() * Math.exp(-t * 300) * 0.12;
      const dur = v.ev.dur / SR;
      const rel = t > dur ? Math.exp(-(t - dur) * (v.ev.kit === 'chop' ? 40 : 12)) : 1;   // (chopped: the damper down at once)
      const sig = s * rel * v.ev.vel * 0.42;
      out[0] = sig * 1.03; out[1] = sig * 0.97;
    },
  },
  organ: {
    tail: 0.1,
    render(v, out) {
      const t = v.age / SR;
      // the hip-house organ: a few drawbars and a key click
      const f = midiToFreq(v.ev.note);
      let s = 0;
      for (let k = 0; k < ORGAN_H.length; k++) s += sineAt(v, k, (f * ORGAN_H[k]) / SR) * ORGAN_A[k];
      const click = v.noise() * Math.exp(-t * 900) * 0.25;
      const amp = envAt(t, v.ev.dur / SR, 0.003, 0.15, 0.55, 0.04);
      out[0] = out[1] = Math.tanh((s * 0.36 + click) * 1.2) * amp * v.ev.vel * 0.7;
    },
  },
  strings: {
    tail: 0.6,
    render(v, out) {
      const t = v.age / SR;
      const vib = 1 + 0.003 * Math.sin(TAU * 5.5 * t + v.ev.note);
      const f = midiToFreq(v.ev.note) * vib;
      const a = sawAt(v, 0, (f * 0.994) / SR);
      const b = sawAt(v, 1, f / SR);
      const c = sawAt(v, 2, (f * 1.006) / SR);
      const amp = envAt(t, v.ev.dur / SR, 0.28, 1.0, 0.85, 0.45);
      const cut = 1600 + 900 * Math.sin(TAU * 0.2 * t);
      const l = v.filt.process(a + b * 0.6, cut, 0.8).low;
      const r = v.filt2.process(c + b * 0.6, cut, 0.8).low;
      out[0] = l * amp * v.ev.vel * 0.22; out[1] = r * amp * v.ev.vel * 0.22;
    },
  },
  choir: {
    tail: 0.7,
    render(v, out) {
      const t = v.age / SR;
      // "aah": bright sources through two vowel formants
      const f = midiToFreq(v.ev.note) * (1 + 0.004 * Math.sin(TAU * 4.8 * t));
      const src = sawAt(v, 0, f / SR) + sawAt(v, 1, (f * 1.005) / SR) + v.noise() * 0.08;
      const f1 = v.filt.process(src, 720, 5).band;
      const f2 = v.filt2.process(src, 1150, 5).band;
      const amp = envAt(t, v.ev.dur / SR, 0.35, 1.2, 0.9, 0.6);
      const sig = (f1 + f2 * 0.7) * amp * v.ev.vel * 0.32;
      out[0] = sig; out[1] = sig * 0.95;
    },
  },
  timpani: {
    tail: 1.2,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note) * (1 + 0.15 * Math.exp(-t * 20));
      const body = sineAt(v, 0, f / SR) + 0.4 * sineAt(v, 1, (f * 1.5) / SR) * Math.exp(-t * 6);
      const thump = v.filt.process(v.noise(), 300, 0.8).low * Math.exp(-t * 40);
      const sig = Math.tanh((body * Math.exp(-t * 3) + thump * 2.5) * 1.1) * v.ev.vel * 0.85;
      out[0] = out[1] = sig;
    },
  },
  brass: {
    tail: 0.25,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note);
      const s = sawAt(v, 0, f / SR) + sawAt(v, 1, (f * 1.004) / SR);
      if (v.ev.kit === 'real') {
        // a horn that plays a melody: as a real trombone, mellow when soft and brighter as it grows louder -
        // the harmonics above a kilohertz or so falling steeply, the lowest ones a little under the next few -
        // and each long note swelling into its brightness
        const level = Math.min(1, v.ev.vel * (0.6 + 0.4 * Math.min(1, t / 0.35) + 0.15 * Math.min(1, t / 1.5)));
        const cut = 300 + 1100 * level;
        const lo = v.filt2.process(v.filt.process(s * 0.5, cut, 0.75).low, cut, 0.75).low;
        // (the fundamental eased back, more as it grows loud: a loud trombone's second harmonic is its strongest)
        v.lowz = (v.lowz || 0) + (lo - (v.lowz || 0)) * (1 - Math.exp((-TAU * (120 + 320 * level)) / SR));
        const hp = lo - v.lowz;
        const amp = envAt(t, v.ev.dur / SR, 0.05, 0.3, 0.85, 0.15);
        const sig = hp * amp * v.ev.vel * 0.75;
        out[0] = sig * 0.97; out[1] = sig;
        return;
      }
      // the brass swell: the filter opens fast, then settles
      const cut = 500 + 2800 * Math.min(1, t * 14) * (0.6 + 0.4 * Math.exp(-t * 3));
      const o = v.filt.process(s * 0.5, cut, 1.2).low;
      const amp = envAt(t, v.ev.dur / SR, 0.02, 0.3, 0.7, 0.12);
      const sig = Math.tanh(o * 1.6) * amp * v.ev.vel * 0.42;
      out[0] = sig * 0.97; out[1] = sig;
    },
  },
  fmbell: {
    tail: 1.6,
    render(v, out) {
      const t = v.age / SR;
      // two-operator FM: a modulator at 3.5x the carrier, fading as the bell rings
      const f = midiToFreq(v.ev.note);
      let p0 = v.ph[0] + f / SR; if (p0 >= 1) p0 -= 1; v.ph[0] = p0;
      let p1 = v.ph[1] + (f * 3.5) / SR; if (p1 >= 1) p1 -= 1; v.ph[1] = p1;
      const s = Math.sin(TAU * p0 + 3 * Math.exp(-t * 5) * Math.sin(TAU * p1));
      const sig = s * Math.exp(-t * 2.2) * (1 - Math.exp(-t * 800)) * v.ev.vel * 0.45;
      const pan = 0.5 + 0.3 * Math.sin(v.ev.note);
      out[0] = sig * (1.2 - pan); out[1] = sig * (0.2 + pan);
    },
  },
  anvil: {
    tail: 0.6,
    render(v, out) {
      const t = v.age / SR;
      // struck metal: partials that are not harmonics, each dying at its own rate
      const f = midiToFreq(v.ev.note);
      let s = 0;
      for (let k = 0; k < ANVIL_R.length; k++) s += sineAt(v, k, (f * ANVIL_R[k]) / SR) * Math.exp(-t * (7 + 6 * k)) / (1 + k * 0.6);
      s += v.noise() * Math.exp(-t * 500) * 0.5;
      const sig = Math.tanh(s * 0.9) * v.ev.vel * 0.55;
      out[0] = sig; out[1] = sig * 0.94;
    },
  },
  zap: {
    tail: 0.05,
    render(v, out) {
      const t = v.age / SR;
      // a laser: a pulse diving two octaves
      const f = midiToFreq(v.ev.note) * Math.pow(2, -2 * Math.min(1, t / Math.max(0.02, v.ev.dur / SR)));
      const s = pulseAt(v, 0, f / SR, 0.5);
      const sig = s * Math.exp(-t * 12) * v.ev.vel * 0.3;
      const pan = 0.5 + 0.35 * Math.sin(v.ev.note * 1.7);
      out[0] = sig * (1.2 - pan); out[1] = sig * (0.2 + pan);
    },
  },
  blip: {
    tail: 0.04,
    render(v, out) {
      const t = v.age / SR;
      // the coin: a note, then a fourth above it
      const n = v.ev.note + (t < 0.055 ? 0 : 5);
      const s = pulseAt(v, 0, midiToFreq(n) / SR, 0.25);
      const amp = envAt(t, v.ev.dur / SR, 0.002, 0.25, 0.6, 0.03);
      out[0] = out[1] = s * amp * v.ev.vel * 0.3;
    },
  },
  boom: {
    tail: 0.8,
    render(v, out) {
      const t = v.age / SR;
      // an explosion: noise behind a closing filter, a thump underneath
      const n = v.filt.process(v.noise(), 80 + 2400 * Math.exp(-t * 7), 1.2).low;
      v.phase += (40 + 60 * Math.exp(-t * 15)) / SR;
      const thump = Math.sin(TAU * v.phase) * Math.exp(-t * 6);
      const sig = Math.tanh((n * 2.2 + thump) * Math.exp(-t * 2.6)) * v.ev.vel * 0.6;
      out[0] = sig; out[1] = sig * 0.96;
    },
  },
  drone: {
    tail: 2.0,
    render(v, out) {
      const t = v.age / SR;
      // dark detuned saws under a filter that barely moves, and air
      const f = midiToFreq(v.ev.note);
      const a = sawAt(v, 0, (f * 0.995) / SR);
      const b = sawAt(v, 1, f / SR);
      const c = sawAt(v, 2, (f * 1.007) / SR);
      const sub = sineAt(v, 3, (f * 0.5) / SR);
      const cut = 160 + 520 * (0.5 + 0.5 * Math.sin(TAU * 0.07 * t + v.ev.note));
      const o = v.filt.process((a + b + c) * 0.33, cut, 2.2).low;
      const air = v.filt2.process(v.noise(), 420 + 200 * Math.sin(TAU * 0.05 * t), 3).band * 0.12;
      const amp = envAt(t, v.ev.dur / SR, 1.4, 2, 0.85, 1.2);
      const sig = (o + sub * 0.45) * amp * v.ev.vel * 0.55;
      out[0] = sig + air * amp; out[1] = sig - air * amp;
    },
  },
  stab: {
    tail: 0.8,
    render(v, out) {
      const t = v.age / SR;
      const f = midiToFreq(v.ev.note);
      const dt = f / SR;
      v.phase += dt; if (v.phase >= 1) v.phase -= 1;
      const saw = 2 * v.phase - 1 - polyBlep(v.phase, dt);
      const dub = v.ev.kit === 'dub';
      const amp = envAt(t, v.ev.dur / SR, 0.004, dub ? 0.12 : 0.09, 0, 0.05);
      const o = v.filt.process(saw, (dub ? 500 : 700) + (dub ? 2600 : 5200) * Math.exp(-t * 30), dub ? 3 : 2.2).low;
      out[0] = out[1] = o * amp * v.ev.vel * 0.5;
    },
  },
};

// the instruments the newer styles brought
Object.assign(INSTR, NEW_INSTR);

/** How much of each instrument feeds the delay and reverb busses. */
/** How much of each instrument goes to the echo and the reverb (exported for the music audit). */
export const SENDS = {
  kick:     { delay: 0.00, reverb: 0.02 },
  snare:    { delay: 0.08, reverb: 0.26 },
  clap:     { delay: 0.06, reverb: 0.3 },
  hat:      { delay: 0.05, reverb: 0.10 },
  crash:    { delay: 0.04, reverb: 0.3 },
  riser:    { delay: 0.12, reverb: 0.45 },
  bass:     { delay: 0.00, reverb: 0.02 },
  chipbass: { delay: 0.00, reverb: 0.0 },
  acid:     { delay: 0.14, reverb: 0.05 },
  reese:    { delay: 0.00, reverb: 0.06 },
  pad:      { delay: 0.05, reverb: 0.45 },
  arp:      { delay: 0.34, reverb: 0.20 },
  chip:     { delay: 0.25, reverb: 0.12 },
  chiparp:  { delay: 0.1,  reverb: 0.1 },
  lead:     { delay: 0.30, reverb: 0.28 },
  supersaw: { delay: 0.22, reverb: 0.38 },
  hoover:   { delay: 0.12, reverb: 0.35 },
  piano:    { delay: 0.16, reverb: 0.3 },
  stab:     { delay: 0.22, reverb: 0.40 },
  organ:    { delay: 0.05, reverb: 0.15 },
  strings:  { delay: 0.05, reverb: 0.5 },
  choir:    { delay: 0.06, reverb: 0.6 },
  timpani:  { delay: 0.0,  reverb: 0.35 },
  brass:    { delay: 0.15, reverb: 0.35 },
  fmbell:   { delay: 0.4,  reverb: 0.45 },
  anvil:    { delay: 0.2,  reverb: 0.55 },
  zap:      { delay: 0.25, reverb: 0.15 },
  blip:     { delay: 0.2,  reverb: 0.1 },
  boom:     { delay: 0.0,  reverb: 0.3 },
  drone:    { delay: 0.05, reverb: 0.5 },
  xmkick:   { delay: 0.0,  reverb: 0.02 },
  xmsnare:  { delay: 0.04, reverb: 0.12 },
  xmhat:    { delay: 0.02, reverb: 0.05 },
  xmbass:   { delay: 0.0,  reverb: 0.0 },
  xmarp:    { delay: 0.1,  reverb: 0.1 },
  xmlead:   { delay: 0.12, reverb: 0.12 },
  thkick:   { delay: 0.0,  reverb: 0.08 },
  thsnare:  { delay: 0.1,  reverb: 0.65 },
  thride:   { delay: 0.05, reverb: 0.2 },
  thshaker: { delay: 0.02, reverb: 0.1 },
  vinyl:    { delay: 0.0,  reverb: 0.0 },
  thbass:   { delay: 0.0,  reverb: 0.02 },
  scratch:  { delay: 0.2,  reverb: 0.25 },
  theremin: { delay: 0.3,  reverb: 0.45 },
  modem:    { delay: 0.0,  reverb: 0.0 },
  cartridge: { delay: 0.0, reverb: 0.08 },
  chime:    { delay: 0.15, reverb: 0.5 },
};

Object.assign(SENDS, NEW_SENDS);

/** The era's sound chips, built against the instruments above (Paula samples them). */
const CHIPS = buildChips({ INSTR, Voice });

/**
 * Get a chip ready for these styles before anything plays: Paula cuts its
 * samples the first time an instrument is heard, which is too slow to do on
 * the audio thread mid-song. Composing a short score of each style is enough
 * to meet every instrument (and kit) it uses.
 */
export function prepareChip(chip, styles) {
  const c = CHIPS[chip];
  if (!c || !c.prepare) return;
  for (const style of styles) c.prepare(composeScore('prepare', 24, style, chip).events);
}

/**
 * Sample-exact renderer. Call render() with contiguous blocks; block size does
 * not affect the output.
 */
export class Synth {
  constructor(score, seed) {
    this.score = score;
    this.seedNum = new Rng(seed, 'synth').int(0, 0x7fffffff);
    this.pos = 0;
    this.nextEvent = 0;
    this.voices = [];
    this.delayL = new Delay(2.5);
    this.delayR = new Delay(2.5);
    this.revL = new Reverb(0);
    this.revR = new Reverb(23);
    const fx = score.meta.fx || { reverb: 1, delay: 1, delayBeats: 0.75 };
    this.fx = fx;
    this.delaySamples = Math.round(score.meta.spb * (fx.delayBeats || 0.75) * SR);
    this.limGain = 1;
    // the sound chip the score is played on, if its era had one
    this.chip = (score.meta.chip && CHIPS[score.meta.chip]) || null;
    if (this.chip) {
      if (this.chip.prepare) this.chip.prepare(score.events);
      this.fxScale = this.chip.sendScale || { delay: 1, reverb: 1 };
      this.post = this.chip.makePost ? this.chip.makePost() : null;
      this.post2 = [0, 0];
    }
    this.tmp = [0, 0];
  }

  /** Start from sample n of the score instead of the beginning (notes already under way are skipped). */
  seek(n) {
    this.pos = n;
    const ev = this.score.events;
    let lo = 0, hi = ev.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ev[mid].t < n) lo = mid + 1; else hi = mid; }
    this.nextEvent = lo;
  }

  render(outL, outR, offset, n) {
    const ev = this.score.events;
    const dsamp = this.delaySamples;
    const fxD = this.fx.delay * (this.chip ? this.fxScale.delay : 1);
    const fxR = this.fx.reverb * (this.chip ? this.fxScale.reverb : 1);
    const chip = this.chip;
    for (let i = 0; i < n; i++) {
      const pos = this.pos;

      while (this.nextEvent < ev.length && ev[this.nextEvent].t <= pos) {
        const e = ev[this.nextEvent++];
        if (INSTR[e.instr]) {
          const v = new Voice(e, this.seedNum);
          v.spec = (chip && chip.instr[e.instr]) || INSTR[e.instr];
          v.sends = SENDS[e.instr];
          this.voices.push(v);
        }
      }

      let dryL = 0, dryR = 0, sendD = 0, sendR = 0;
      const vs = this.voices;
      let anyDone = false;
      for (let k = 0; k < vs.length; k++) {
        const v = vs[k];
        const spec = v.spec;
        const t = this.tmp;
        t[0] = 0; t[1] = 0;
        spec.render(v, t);
        v.age++;
        const sends = v.sends;
        dryL += t[0]; dryR += t[1];
        const mono = (t[0] + t[1]) * 0.5;
        sendD += mono * sends.delay * fxD;
        sendR += mono * sends.reverb * fxR;
        if (v.age > v.ev.dur + (v.ev.tail !== undefined ? v.ev.tail : spec.tail) * SR) { v.done = true; anyDone = true; }
      }
      if (anyDone) this.voices = vs.filter((v) => !v.done);

      // ping-pong delay
      const dl = this.delayL.read(dsamp);
      const dr = this.delayR.read(dsamp);
      this.delayL.write(sendD + dr * 0.42);
      this.delayR.write(dl * 0.42 + sendD * 0.5);

      const rl = this.revL.process(sendR);
      const rr = this.revR.process(sendR);

      let L = dryL + dl * 0.5 + rl * 0.42;
      let R = dryR + dr * 0.5 + rr * 0.42;
      if (this.post) {
        const o = this.post2;
        o[0] = L; o[1] = R;
        this.post(o);
        L = o[0]; R = o[1];
      }

      // master bus: envelope-follower limiter, then soft clip
      const peak = Math.max(Math.abs(L), Math.abs(R));
      const target = peak > 0.85 ? 0.85 / peak : 1;
      this.limGain += (target - this.limGain) * (target < this.limGain ? 0.02 : 0.0004);
      L *= this.limGain; R *= this.limGain;
      // 0.82 leaves ~2 dB of headroom, so the lossy encode does not overshoot
      // into full scale on the way out
      outL[offset + i] = Math.tanh(L * 1.05) * 0.82;
      outR[offset + i] = Math.tanh(R * 1.05) * 0.82;

      this.pos++;
    }
  }
}

// ---------------------------------------------------------------------------
// Visual feature track
// ---------------------------------------------------------------------------

export const FEATURE_RATE = 240; // Hz

/** Which visual channel each instrument drives. */
const FEATURE_OF = {
  kick: 'kick', snare: 'snare', clap: 'snare', hat: 'hat', crash: 'hat',
  bass: 'bass', chipbass: 'bass', acid: 'bass', reese: 'bass',
  pad: 'pad', riser: 'pad',
  arp: 'arp', chiparp: 'arp',
  lead: 'lead', chip: 'lead', supersaw: 'lead',
  stab: 'stab', hoover: 'stab', piano: 'stab', brass: 'stab',
  organ: 'bass', timpani: 'kick', strings: 'pad', choir: 'pad', fmbell: 'arp',
  guitar: 'stab', flute: 'lead', harp: 'arp', ep: 'stab', slap: 'bass',
  anvil: 'snare', zap: 'arp', blip: 'arp', boom: 'kick', drone: 'pad',
  xmkick: 'kick', xmsnare: 'snare', xmhat: 'hat', xmbass: 'bass', xmarp: 'arp', xmlead: 'lead',
  thkick: 'kick', thsnare: 'snare', thride: 'hat', thshaker: 'hat', thbass: 'bass', scratch: 'stab', theremin: 'lead',
};
const FEATURE_DECAY = { kick: 7, snare: 9, hat: 26, bass: 8, pad: 1.1, arp: 14, lead: 4.5, stab: 5 };

/**
 * Per-instrument envelopes sampled at FEATURE_RATE, derived analytically from
 * the score. Visuals read this instead of an FFT of live audio, so the picture
 * is identical during live playback and in an offline render.
 */
export class Features {
  constructor(score) {
    this.score = score;
    this.n = Math.ceil(score.meta.duration * FEATURE_RATE) + FEATURE_RATE;
    this.keys = ['kick', 'snare', 'hat', 'bass', 'pad', 'arp', 'lead', 'stab'];
    this.tracks = {};
    for (const k of this.keys) this.tracks[k] = new Float32Array(this.n);

    for (const e of score.events) {
      const key = FEATURE_OF[e.instr];
      const arr = key && this.tracks[key];
      if (!arr) continue;
      const start = Math.floor((e.t / SR) * FEATURE_RATE);
      const d = FEATURE_DECAY[key];
      const len = Math.ceil((5 / d) * FEATURE_RATE);
      const vel = Math.min(1, e.vel);
      for (let i = 0; i < len; i++) {
        const idx = start + i;
        if (idx < 0) continue;
        if (idx >= this.n) break;
        const t = i / FEATURE_RATE;
        const v = vel * (1 - Math.exp(-t * 180)) * Math.exp(-t * d);
        if (v > arr[idx]) arr[idx] = v;
      }
    }
  }

  /** Interpolated feature set at time t (seconds). */
  at(t) {
    const x = Math.max(0, t * FEATURE_RATE);
    const i0 = Math.min(this.n - 1, Math.floor(x));
    const i1 = Math.min(this.n - 1, i0 + 1);
    const f = x - i0;
    const o = {};
    for (const k of this.keys) {
      const a = this.tracks[k];
      o[k] = a[i0] * (1 - f) + a[i1] * f;
    }
    const { spb, barSec } = this.score.meta;
    o.beat = (t / spb) % 1;
    o.beatIndex = Math.floor(t / spb);
    o.bar = (t / barSec) % 1;
    o.barIndex = Math.floor(t / barSec);
    o.energy = Math.min(1, o.kick * 0.55 + o.snare * 0.4 + o.bass * 0.35
      + o.lead * 0.3 + o.arp * 0.25 + o.pad * 0.5);
    o.time = t;
    return o;
  }
}
