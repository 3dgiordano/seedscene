// Deterministic pseudo-random utilities.
// Everything the tool generates hangs off these: same seed in, same bits out.

/** FNV-1a style string hash -> uint32. Accepts numbers too. */
export function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // avalanche
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32: small, fast, well-distributed, bit-identical across engines. */
export function mulberry32(a) {
  a = a >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A named random stream: independent sequences from one seed. */
/**
 * The item a seed favours most. Each item gets its own score from the seed, so
 * adding an item to the list moves only the seeds that favour the newcomer
 * (about one in the list's length); every other seed keeps its pick.
 */
export function stablePick(seed, stream, items) {
  let best = items[0], top = -1;
  for (const it of items) {
    const v = new Rng(seed, `${stream}:${it}`).next();
    if (v > top) { top = v; best = it; }
  }
  return best;
}

export class Rng {
  constructor(seed, stream = 'main') {
    this.seed = hashSeed(seed);
    this.next = mulberry32((this.seed ^ hashSeed(stream)) >>> 0);
    // warm up so near-identical seeds diverge immediately
    for (let i = 0; i < 8; i++) this.next();
  }
  float(min = 0, max = 1) { return min + (max - min) * this.next(); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  bool(p = 0.5) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length) % arr.length]; }
  /** weighted pick: weights parallel to items */
  weighted(items, weights) {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** n booleans with exactly `hits` true, deterministic placement */
  euclid(steps, hits, rotate = 0) {
    const out = new Array(steps).fill(false);
    if (hits <= 0) return out;
    for (let i = 0; i < steps; i++) {
      out[(i + rotate) % steps] = (Math.floor((i * hits) / steps) !== Math.floor(((i + 1) * hits) / steps));
    }
    return out;
  }
}
