// Game simulations behind some of the arcade scenes.
//
// A fragment shader can draw a frame from time alone, but it cannot remember:
// a chomper that hunts the nearest dot, wisps that chase it, a snake that
// grows each time it eats all need the history of the game. These little
// simulations keep that history on the JavaScript side and hand the shader
// the state of the moment as uniforms.
//
// Each one steps in fixed ticks locked to the beat, from tick 0, with its own
// seeded random stream, so the state at time t depends on the seed and t and
// nothing else: live playback, a scrub backwards and an offline render all see
// the same game. Going back in time replays from the start.

import { Rng } from './rng.js';
import { FEATURE_RATE } from './music.js';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/** Breadth-first distances on a grid from one or more cells; walls are -1. */
function bfs(w, h, blocked, sources, limit = Infinity) {
  const dist = new Int16Array(w * h).fill(-1);
  const queue = [];
  for (const [x, y] of sources) {
    const i = y * w + x;
    if (dist[i] === -1) { dist[i] = 0; queue.push(i); }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const d = dist[i];
    if (d >= limit) continue;
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (dist[j] !== -1 || blocked(nx, ny)) continue;
      dist[j] = d + 1;
      queue.push(j);
    }
  }
  return dist;
}

/** Rows of a grid packed into numbers, one bit per cell (exact up to 24 wide). */
function packRows(w, h, on) {
  const rows = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let v = 0;
    for (let x = 0; x < w; x++) if (on(x, y)) v += 2 ** x;
    rows[y] = v;
  }
  return rows;
}

/** Shared clock: fixed ticks from 0, replayed from the start when t goes back. */
class TickSim {
  constructor(seed, spb, ticksPerBeat) {
    this.seed = seed;
    this.tickSec = Math.max(0.05, spb / ticksPerBeat);
    this.reset();
  }

  /** The state at time t; `frac` is how far into the current tick t is. */
  advanceTo(t) {
    const target = Math.max(0, Math.floor(t / this.tickSec));
    if (target < this.tick) this.reset();
    // a long jump forward (a skipped track) costs one replay, never a hang
    while (this.tick < target) { this.step(); this.tick++; }
    this.frac = t / this.tickSec - target;
  }
}

// ---------------------------------------------------------------------------
// The maze: a chomper that hunts dots and dodges, three wisps that chase it
// ---------------------------------------------------------------------------

export const MAZE_W = 21;
export const MAZE_H = 13;

/**
 * A mirrored maze with loops: a random spanning tree on the left half's
 * junctions, mirrored, joined across the middle, then opened up in places so
 * that there is always another way round.
 */
export function makeMaze(rng) {
  const W = MAZE_W, H = MAZE_H;
  const wall = Array.from({ length: H }, () => new Uint8Array(W).fill(1));
  const open = (x, y) => { wall[y][x] = 0; wall[y][W - 1 - x] = 0; };
  // junctions sit on odd cells; the left half has columns 1,3,5,7,9
  const cols = [1, 3, 5, 7, 9];
  const rows = [1, 3, 5, 7, 9, 11];
  const seen = new Set();
  const key = (x, y) => x * 100 + y;
  const stack = [[rng.pick(cols), rng.pick(rows)]];
  seen.add(key(...stack[0]));
  open(...stack[0]);
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = rng.shuffle(DIRS).map(([dx, dy]) => [x + 2 * dx, y + 2 * dy, x + dx, y + dy])
      .filter(([nx, ny]) => cols.includes(nx) && rows.includes(ny) && !seen.has(key(nx, ny)));
    if (!next.length) { stack.pop(); continue; }
    const [nx, ny, mx, my] = next[0];
    seen.add(key(nx, ny));
    open(mx, my);
    open(nx, ny);
    stack.push([nx, ny]);
  }
  // the outer lane is always open, so every corner can be reached two ways
  for (let x = 1; x < W - 1; x++) { wall[1][x] = 0; wall[H - 2][x] = 0; }
  for (let y = 1; y < H - 1; y++) { wall[y][1] = 0; wall[y][W - 2] = 0; }
  // the middle column joins the halves on a few rows
  for (const y of rows) if (y === 1 || y === H - 2 || rng.bool(0.5)) wall[y][10] = 0;
  wall[5][10] = 0;   // and the wisps' home in the centre always opens
  // knock out extra walls between junctions: loops make a chase
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < 10; x++) {
      const between = (x % 2 === 1) !== (y % 2 === 1);
      if (between && wall[y][x] && rng.bool(0.22)) open(x, y);
    }
  }
  return wall;
}

const POWER = [[1, 1], [MAZE_W - 2, 1], [1, MAZE_H - 2], [MAZE_W - 2, MAZE_H - 2]];
const HOME = [10, 5];
const FRIGHT_TICKS = 24;   // three bars at two ticks a beat

export class MazeSim extends TickSim {
  constructor(seed, spb) { super(seed, spb, 2); }

  reset() {
    this.rng = new Rng(this.seed, 'maze-sim');
    this.blocked = (x, y) => this.wall[y][x] === 1;
    this.tick = 0;
    this.frac = 0;
    this.level = 0;
    this.newLevel();
    this.flash = { death: -99, clear: -99, eat: -99 };
  }

  newLevel() {
    this.wall = makeMaze(this.rng);
    this.dots = this.wall.map((row) => Uint8Array.from(row, (v) => 1 - v));
    this.dots[HOME[1]][HOME[0]] = 0;
    this.dotsLeft = this.dots.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0);
    this.place();
    this.wallRows = packRows(MAZE_W, MAZE_H, (x, y) => this.wall[y][x] === 1);
  }

  /** Everyone back to the start: the chomper at the bottom, the wisps at home. */
  place() {
    const start = [10, MAZE_H - 2];
    if (this.dots[start[1]][start[0]]) { this.dots[start[1]][start[0]] = 0; this.dotsLeft--; }
    this.chomp = { x: start[0], y: start[1], px: start[0], py: start[1], dir: [1, 0], wait: 4 };
    this.wisps = [0, 1, 2].map((i) => ({
      x: HOME[0], y: HOME[1], px: HOME[0], py: HOME[1], dir: [0, -1],
      state: 'home', wait: 6 + i * 10, corner: POWER[i + 1],
    }));
    this.fright = 0;
  }

  moves(a, allowReverse) {
    const out = [];
    for (const d of DIRS) {
      const nx = a.x + d[0], ny = a.y + d[1];
      if (this.blocked(nx, ny)) continue;
      if (!allowReverse && d[0] === -a.dir[0] && d[1] === -a.dir[1]) continue;
      out.push(d);
    }
    if (!out.length && !allowReverse) return this.moves(a, true);
    return out;
  }

  go(a, d) {
    a.px = a.x; a.py = a.y;
    a.x += d[0]; a.y += d[1];
    a.dir = d;
  }

  step() {
    const T = this.tick;
    const c = this.chomp;
    for (const a of [c, ...this.wisps]) { a.px = a.x; a.py = a.y; }
    if (c.wait > 0) { c.wait--; return; }

    // the chomper: nearest dot first, away from danger, after the wisps when it can eat them
    const toDot = bfs(MAZE_W, MAZE_H, this.blocked,
      this.dots.flatMap((row, y) => [...row].flatMap((v, x) => (v ? [[x, y]] : []))));
    const hunters = this.wisps.filter((w) => w.state === 'chase');
    const prey = this.wisps.filter((w) => w.state === 'fright');
    const danger = hunters.length ? bfs(MAZE_W, MAZE_H, this.blocked, hunters.map((w) => [w.x, w.y]), 6) : null;
    const food = prey.length ? bfs(MAZE_W, MAZE_H, this.blocked, prey.map((w) => [w.x, w.y]), 10) : null;
    let best = null, bestScore = -Infinity;
    for (const d of this.moves(c, true)) {
      const i = (c.y + d[1]) * MAZE_W + (c.x + d[0]);
      let s = -(toDot[i] < 0 ? 40 : toDot[i]);
      if (danger && danger[i] >= 0) s -= 30 * Math.max(0, 5 - danger[i]);
      if (food && food[i] >= 0) s += 3 * Math.max(0, 10 - food[i]);
      if (d[0] === -c.dir[0] && d[1] === -c.dir[1]) s -= 1.5;     // momentum
      s += this.rng.float(0, 0.8);
      if (s > bestScore) { bestScore = s; best = d; }
    }
    this.go(c, best);
    if (this.dots[c.y][c.x]) {
      this.dots[c.y][c.x] = 0;
      this.dotsLeft--;
      if (POWER.some(([x, y]) => x === c.x && y === c.y)) {
        this.fright = FRIGHT_TICKS;
        for (const w of this.wisps) if (w.state === 'chase') { w.state = 'fright'; w.dir = [-w.dir[0], -w.dir[1]]; }
      }
    }

    // the wisps: out of home one by one, then after the chomper, each its own way
    if (this.fright > 0 && --this.fright === 0) {
      for (const w of this.wisps) if (w.state === 'fright') w.state = 'chase';
    }
    const scatter = (T % 80) < 14;   // now and then they fall back to their corners
    this.wisps.forEach((w, i) => {
      if (w.state === 'home' || w.state === 'eaten') {
        if (--w.wait <= 0) { w.state = this.fright > 0 ? 'fright' : 'chase'; w.x = HOME[0]; w.y = HOME[1]; w.px = w.x; w.py = w.y; }
        return;
      }
      if (w.state === 'fright' && T % 2 === 1) return;     // frightened: half speed
      const opts = this.moves(w, false);
      let d;
      if (w.state === 'fright') d = this.rng.pick(opts);
      else {
        const ahead = i === 1 ? 4 : 0;
        let tx = c.x + c.dir[0] * ahead, ty = c.y + c.dir[1] * ahead;
        if (i === 2 && Math.abs(w.x - c.x) + Math.abs(w.y - c.y) < 6) [tx, ty] = w.corner;   // the shy one
        if (scatter) [tx, ty] = w.corner;
        d = opts.reduce((b, o) => {
          const db = (w.x + b[0] - tx) ** 2 + (w.y + b[1] - ty) ** 2;
          const dd = (w.x + o[0] - tx) ** 2 + (w.y + o[1] - ty) ** 2;
          return dd < db ? o : b;
        });
      }
      this.go(w, d);
    });

    // contact
    for (const w of this.wisps) {
      const hit = (w.x === c.x && w.y === c.y) || (w.x === c.px && w.y === c.py && w.px === c.x && w.py === c.y);
      if (!hit) continue;
      if (w.state === 'fright') {
        w.state = 'eaten'; w.wait = 12; w.x = HOME[0]; w.y = HOME[1]; w.px = w.x; w.py = w.y;
        this.flash.eat = T;
      } else if (w.state === 'chase') {
        this.flash.death = T;
        this.place();
        this.chomp.wait = 6;
        return;
      }
    }

    if (this.dotsLeft <= 0) {
      this.flash.clear = T;
      this.level++;
      this.newLevel();
      this.chomp.wait = 6;
    }
  }

  /** Uniforms for the maze scene at time t. */
  uniforms(t) {
    this.advanceTo(t);
    const f = this.frac;
    const lerp = (a) => [a.px + (a.x - a.px) * f, a.py + (a.y - a.py) * f];
    const c = this.chomp;
    const wisps = new Float32Array(12);
    this.wisps.forEach((w, i) => {
      const [x, y] = lerp(w);
      const state = { chase: 0, fright: 1, eaten: 2, home: 2 }[w.state];
      wisps.set([x, y, state, w.dir[0] * 2 + w.dir[1]], i * 4);
    });
    const since = (k) => (this.tick - k + f) * this.tickSec;
    return {
      uWalls: { v: this.wallRows, kind: '1fv' },
      uDots: { v: packRows(MAZE_W, MAZE_H, (x, y) => this.dots[y][x] === 1), kind: '1fv' },
      uChomp: { v: [...lerp(c), c.dir[0], c.dir[1]], kind: '4f' },
      uWisps: { v: wisps, kind: '4fv' },
      uMazeFx: { v: [this.fright * this.tickSec, since(this.flash.death), since(this.flash.clear), since(this.flash.eat)], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// Snake: steers for the food, keeps room to escape, grows, and sometimes loses
// ---------------------------------------------------------------------------

export const SNAKE_W = 24;
export const SNAKE_H = 14;
export const SNAKE_MAX = 64;

export class SnakeSim extends TickSim {
  constructor(seed, spb) { super(seed, spb, 4); }

  reset() {
    this.rng = new Rng(this.seed, 'snake-sim');
    this.tick = 0;
    this.frac = 0;
    this.round = 0;
    this.flash = { eat: -99, crash: -99, food: [0, 0] };
    this.newRound();
  }

  newRound() {
    const y = (SNAKE_H / 2) | 0;
    this.body = [[6, y], [5, y], [4, y], [3, y]];
    this.prev = this.body.map((p) => [...p]);
    this.grow = 0;
    this.dir = DIRS[0];
    this.wait = 0;
    this.placeFood();
  }

  placeFood() {
    const taken = new Set(this.body.map(([x, y]) => y * SNAKE_W + x));
    for (;;) {
      const x = this.rng.int(1, SNAKE_W - 2), y = this.rng.int(1, SNAKE_H - 2);
      if (!taken.has(y * SNAKE_W + x)) { this.food = [x, y]; return; }
    }
  }

  step() {
    this.prev = this.body.map((p) => [...p]);
    if (this.wait > 0) { if (--this.wait === 0) this.newRound(); return; }
    const head = this.body[0];
    // cells the body will still cover after this move (the tail moves on)
    const occupied = new Set(this.body.slice(0, this.body.length - (this.grow > 0 ? 0 : 1)).map(([x, y]) => y * SNAKE_W + x));
    const blocked = (x, y) => occupied.has(y * SNAKE_W + x);
    let best = null, bestScore = -Infinity;
    for (const d of DIRS) {
      if (d[0] === -this.dir[0] && d[1] === -this.dir[1]) continue;
      const nx = head[0] + d[0], ny = head[1] + d[1];
      if (nx < 0 || ny < 0 || nx >= SNAKE_W || ny >= SNAKE_H || blocked(nx, ny)) continue;
      // how much room is left from there, and how far the food is
      const room = bfs(SNAKE_W, SNAKE_H, blocked, [[nx, ny]]);
      let area = 0;
      for (const v of room) if (v >= 0) area++;
      const toFood = room[this.food[1] * SNAKE_W + this.food[0]];
      let s = area >= this.body.length + 2 ? 1000 : area * 5;     // never box itself in if it can help it
      s -= toFood < 0 ? 60 : toFood;
      if (d === this.dir) s += 0.5;
      s += this.rng.float(0, 0.6);
      if (s > bestScore) { bestScore = s; best = d; }
    }
    if (!best) {             // nowhere to go: crash, and start again on the next bar
      this.flash.crash = this.tick;
      this.round++;
      this.wait = 8;
      return;
    }
    this.dir = best;
    this.body.unshift([head[0] + best[0], head[1] + best[1]]);
    if (this.grow > 0) { this.grow--; this.prev.push([...this.prev[this.prev.length - 1]]); } else this.body.pop();
    const h = this.body[0];
    if (h[0] === this.food[0] && h[1] === this.food[1]) {
      this.flash.eat = this.tick;
      this.flash.food = [...this.food];
      this.grow += 3;
      if (this.body.length + this.grow >= SNAKE_MAX) {     // a full-length snake wins the round
        this.flash.crash = this.tick;
        this.round++;
        this.wait = 8;
        return;
      }
      this.placeFood();
    }
  }

  uniforms(t) {
    this.advanceTo(t);
    const f = this.frac;
    const body = new Float32Array(SNAKE_MAX * 2);
    const n = Math.min(SNAKE_MAX, this.body.length);
    for (let i = 0; i < n; i++) {
      const a = this.prev[i] || this.body[i], b = this.body[i];
      body[i * 2] = a[0] + (b[0] - a[0]) * f;
      body[i * 2 + 1] = a[1] + (b[1] - a[1]) * f;
    }
    const since = (k) => (this.tick - k + f) * this.tickSec;
    return {
      uSnake: { v: body, kind: '2fv' },
      uSnakeLen: { v: n, kind: '1f' },
      uFood: { v: [...this.food, ...this.flash.food], kind: '4f' },
      uSnakeFx: { v: [since(this.flash.eat), since(this.flash.crash), this.round, this.wait > 0 ? 1 : 0], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// Rocks: a ship that flies, aims and fires on the eighths; rocks that split
// ---------------------------------------------------------------------------

export const ROCK_MAX = 24;
export const SHOT_MAX = 8;
export const BOOM_MAX = 8;
const RX = 1.02, RY = 0.62;                  // the field wraps just past the board's edge
const ROCK_R = [0, 0.03, 0.055, 0.095];      // small, medium, large
const ROCK_SCORE = [0, 100, 50, 20];
const SHOT_SPEED = 1.5, SHOT_LIFE = 0.6;

const wrapTo = (v, h) => ((((v + h) % (2 * h)) + 2 * h) % (2 * h)) - h;
const angDiff = (a, b) => wrapTo(a - b, Math.PI);
/** Distance from point (px, py) to the segment (ax, ay)-(bx, by). */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const h = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / Math.max(dx * dx + dy * dy, 1e-12)));
  return Math.hypot(px - ax - dx * h, py - ay - dy * h);
}

export class RocksSim extends TickSim {
  constructor(seed, spb) { super(seed, spb, 8); }

  reset() {
    this.rng = new Rng(this.seed, 'rocks-sim');
    this.tick = 0;
    this.frac = 0;
    this.level = 0;
    this.score = 0;
    this.nextId = 1;
    this.clearTicks = 0;
    this.rocks = [];
    this.shots = [];
    this.booms = [];
    this.ship = { x: 0, y: 0, vx: 0, vy: 0, a: Math.PI / 2, pa: Math.PI / 2, thrust: 0, alive: true, safe: 16, respawn: 0, goal: [0, 0], alert: 1 };
    this.flash = { death: -99 };
    this.wave();
  }

  /** A new wave of big rocks, in from the edges. */
  wave() {
    const n = Math.min(4 + this.level, 7);
    for (let i = 0; i < n; i++) {
      const fromSide = this.rng.bool();
      const x = fromSide ? this.rng.pick([-RX, RX]) : this.rng.float(-RX, RX);
      const y = fromSide ? this.rng.float(-RY, RY) : this.rng.pick([-RY, RY]);
      this.addRock(x, y, 3, this.rng.float(0, Math.PI * 2), this.rng.float(0.06, 0.11 + 0.01 * this.level));
    }
  }

  addRock(x, y, size, heading, speed) {
    if (this.rocks.length >= ROCK_MAX) return;
    this.rocks.push({ x, y, vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed, size, id: this.nextId++ % 97 });
  }

  boom(x, y, size) {
    this.booms.push({ x, y, tick: this.tick, size });
    if (this.booms.length > BOOM_MAX) this.booms.shift();
  }

  /** A hit rock breaks in two smaller ones, flung off either side of the shot. */
  split(r, shot) {
    r.dead = true;
    this.score += ROCK_SCORE[r.size];
    this.boom(r.x, r.y, r.size);
    if (r.size === 1) return;
    const base = Math.atan2(shot.vy, shot.vx);
    const speed = Math.hypot(r.vx, r.vy) * 1.35 + 0.05;
    for (const k of [-1, 1]) {
      this.addRock(r.x, r.y, r.size - 1, base + k * this.rng.float(0.5, 1.3), speed * this.rng.float(0.9, 1.3));
    }
  }

  step() {
    const dt = this.tickSec, T = this.tick, s = this.ship;
    s.pa = s.a;
    for (const r of this.rocks) { r.x = wrapTo(r.x + r.vx * dt, RX); r.y = wrapTo(r.y + r.vy * dt, RY); }

    // shots fly; each one is tested along the whole stretch it covered this tick
    for (const sh of this.shots) {
      const x0 = sh.x, y0 = sh.y;
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
      for (const r of this.rocks) {
        if (r.dead || segDist(r.x, r.y, x0, y0, sh.x, sh.y) > ROCK_R[r.size]) continue;
        this.split(r, sh);
        sh.life = 0;
        break;
      }
      sh.x = wrapTo(sh.x, RX); sh.y = wrapTo(sh.y, RY);
    }
    this.rocks = this.rocks.filter((r) => !r.dead);
    this.shots = this.shots.filter((sh) => sh.life > 0);

    if (s.alive) {
      this.fly(s, dt, T);
      if (s.safe > 0) s.safe--;
      else {
        for (const r of this.rocks) {
          if (Math.hypot(wrapTo(r.x - s.x, RX), wrapTo(r.y - s.y, RY)) > ROCK_R[r.size] + 0.022) continue;
          s.alive = false;
          s.respawn = 32;                       // a bar to wait, then back in the middle
          this.flash.death = T;
          this.boom(s.x, s.y, 4);
          break;
        }
      }
    } else if (--s.respawn <= 0 && this.rocks.every((r) => Math.hypot(r.x, r.y) > ROCK_R[r.size] + 0.25)) {
      Object.assign(s, { alive: true, x: 0, y: 0, vx: 0, vy: 0, a: Math.PI / 2, pa: Math.PI / 2, safe: 24 });
    }

    // the field cleared: a bar's breath, then a bigger wave
    if (!this.rocks.length && ++this.clearTicks >= 32) {
      this.clearTicks = 0;
      this.level++;
      this.wave();
    }
  }

  /** The pilot: dodge what is about to hit, move somewhere new each bar, aim ahead of a rock, fire on the eighths. */
  fly(s, dt, T) {
    let threat = null, soonest = Infinity;
    for (const r of this.rocks) {
      const dx = wrapTo(r.x - s.x, RX), dy = wrapTo(r.y - s.y, RY);
      const rvx = r.vx - s.vx, rvy = r.vy - s.vy;
      const vv = rvx * rvx + rvy * rvy;
      const tc = vv > 1e-9 ? Math.max(0, Math.min(0.7 * s.alert, -(dx * rvx + dy * rvy) / vv)) : 0;
      const miss = Math.hypot(dx + rvx * tc, dy + rvy * tc) - ROCK_R[r.size];
      if (miss < 0.07 && tc < soonest) { soonest = tc; threat = { dx, dy, rvx, rvy, vv }; }
    }
    let target = null, best = Infinity;
    for (const r of this.rocks) {
      const dx = wrapTo(r.x - s.x, RX), dy = wrapTo(r.y - s.y, RY);
      const score = Math.hypot(dx, dy) + Math.abs(angDiff(Math.atan2(dy, dx), s.a)) * 0.12 - (r.size === 1 ? 0.05 : 0);
      if (score < best) { best = score; target = r; }
    }
    if (T % 32 === 0) {                         // somewhere new to be, each bar, and some bars less alert
      s.alert = this.rng.float(0.15, 1);
      s.goal = [Math.max(-0.6, Math.min(0.6, s.x + this.rng.float(-0.45, 0.45))),
                Math.max(-0.3, Math.min(0.3, s.y + this.rng.float(-0.3, 0.3)))];
    }

    let want = s.a, thrust = 0;
    if (threat) {
      // sideways off the rock's line, and burn
      const k = threat.vv > 1e-9 ? (threat.dx * threat.rvx + threat.dy * threat.rvy) / threat.vv : 0;
      let ox = -(threat.dx - threat.rvx * k), oy = -(threat.dy - threat.rvy * k);
      if (Math.hypot(ox, oy) < 1e-3) { ox = -threat.rvy; oy = threat.rvx; }
      want = Math.atan2(oy, ox);
      thrust = Math.abs(angDiff(want, s.a)) < 0.9 ? 1 : 0;
    } else if (T % 32 < 10 && Math.hypot(s.goal[0] - s.x, s.goal[1] - s.y) > 0.1) {
      want = Math.atan2(s.goal[1] - s.y, s.goal[0] - s.x);
      thrust = Math.abs(angDiff(want, s.a)) < 0.5 ? 1 : 0;
    } else if (target) {
      // lead the rock: where it will be when the shot gets there
      let dx = wrapTo(target.x - s.x, RX), dy = wrapTo(target.y - s.y, RY);
      const tt = Math.hypot(dx, dy) / SHOT_SPEED;
      dx += (target.vx - s.vx) * tt; dy += (target.vy - s.vy) * tt;
      want = Math.atan2(dy, dx);
      thrust = Math.hypot(dx, dy) > 0.6 && Math.abs(angDiff(want, s.a)) < 0.3 ? 1 : 0;
    }
    const turn = 6 * dt;
    s.a = wrapTo(s.a + Math.max(-turn, Math.min(turn, angDiff(want, s.a))), Math.PI);
    s.thrust = thrust;
    const hx = Math.cos(s.a), hy = Math.sin(s.a);
    s.vx += hx * thrust * 1.4 * dt; s.vy += hy * thrust * 1.4 * dt;
    const drag = 1 - 0.9 * dt;
    s.vx *= drag; s.vy *= drag;
    const sp = Math.hypot(s.vx, s.vy);
    if (sp > 0.55) { s.vx *= 0.55 / sp; s.vy *= 0.55 / sp; }
    s.x = wrapTo(s.x + s.vx * dt, RX); s.y = wrapTo(s.y + s.vy * dt, RY);

    // fire on the eighths, when a rock sits on the line of the nose
    if (T % 4 !== 0 || this.shots.length >= 6) return;
    const onLine = this.rocks.some((r) => {
      const dx = wrapTo(r.x - s.x, RX), dy = wrapTo(r.y - s.y, RY);
      const along = dx * hx + dy * hy;
      return along > 0 && along < 0.85 && Math.abs(dx * hy - dy * hx) < ROCK_R[r.size] + 0.02;
    });
    if (!onLine) return;
    this.shots.push({ x: s.x + hx * 0.035, y: s.y + hy * 0.035, vx: hx * SHOT_SPEED + s.vx, vy: hy * SHOT_SPEED + s.vy, life: SHOT_LIFE });
  }

  uniforms(t) {
    this.advanceTo(t);
    const e = this.frac * this.tickSec;          // glide between ticks
    const s = this.ship;
    const rocks = new Float32Array(ROCK_MAX * 4);
    this.rocks.forEach((r, i) => rocks.set([wrapTo(r.x + r.vx * e, RX), wrapTo(r.y + r.vy * e, RY), ROCK_R[r.size], r.id], i * 4));
    const shots = new Float32Array(SHOT_MAX * 4).fill(9);
    this.shots.forEach((sh, i) => {
      const v = Math.hypot(sh.vx, sh.vy) || 1;
      shots.set([sh.x + sh.vx * e, sh.y + sh.vy * e, sh.vx / v, sh.vy / v], i * 4);
    });
    const booms = new Float32Array(BOOM_MAX * 4);
    for (let i = 0; i < BOOM_MAX; i++) {
      const b = this.booms[i];
      booms.set(b ? [b.x, b.y, (this.tick - b.tick) * this.tickSec + e, b.size] : [0, 0, 99, 0], i * 4);
    }
    const glide = s.alive ? e : 0;
    return {
      uRocks: { v: rocks, kind: '4fv' },
      uShots: { v: shots, kind: '4fv' },
      uBooms: { v: booms, kind: '4fv' },
      uShip: { v: [s.x + s.vx * glide, s.y + s.vy * glide, s.pa + angDiff(s.a, s.pa) * this.frac, s.alive ? 1 : 0], kind: '4f' },
      uRockFx: { v: [s.thrust, (this.tick - this.flash.death) * this.tickSec + e, this.score, s.safe > 0 ? 1 : 0], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// Starfighter: the ship turns its nose onto a drone and fires along it; the
// drones come in from the horizon or the far distance and shoot back - the
// ship slides out of the way of the shots it sees coming, and the rest land
// ---------------------------------------------------------------------------

export const DRONE_MAX = 8;
export const BOLT_MAX = 16;
export const SBOOM_MAX = 6;
const SHIP_Z = 1.6;
const SHIP_SCALE = 0.36;
const VIEW_TILT = 0.2;           // the ship is drawn tipped towards the camera, so its wings read from behind
const BOLT_SPEED = 30, FOE_SPEED = 13;
const DRONE_R = 0.6;
const DODGE = 0.7;               // how far the ship slides aside from a shot it sees
const CAM_PITCH = 0.22, STAR_FL = 1.4;          // the shader's camera
const HORIZON = Math.tan(CAM_PITCH) * STAR_FL;  // where level flight meets the sky on the screen
const TURN = 2.4;                // how fast the nose comes round, radians a second
const GUNS = [[-0.55, -0.03, -0.2], [0.55, -0.03, -0.2]];   // on the wings, in the ship's own frame

/** The shader's rot(a) * v, for a pair of coordinates. */
const rot2 = (a, x, y) => [Math.cos(a) * x + Math.sin(a) * y, -Math.sin(a) * x + Math.cos(a) * y];
/** Where the nose points: yaw to the right, pitch up. */
const aimDir = (yaw, pitch) => [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** The height at depth z that the shader's camera shows at screen height ys (its proj, solved for y). */
function heightAt(ys, z) {
  const c = Math.cos(CAM_PITCH), s = Math.sin(CAM_PITCH);
  return z * (ys * c / STAR_FL - s) / (c + ys * s / STAR_FL);
}
/** Over the planet (the shader's second section of eight bars), or in space. */
const overPlanet = (T) => Math.floor(T / 256) % 2 === 1;

/**
 * A point on the ship, from its own frame to the world, exactly as the shader
 * draws it: roll, then pitch, then yaw, then scale and place.
 */
function shipPoint(v, s, bank) {
  let [x, y, z] = v;
  [x, y] = rot2(bank, x, y);
  [y, z] = rot2(VIEW_TILT + s.pitch, y, z);
  [x, z] = rot2(s.yaw, x, z);
  return [x * SHIP_SCALE + s.x, y * SHIP_SCALE + s.y, z * SHIP_SCALE + SHIP_Z];
}

/** Distance from a drone's centre to the stretch a bolt covered this tick. */
function segDist3(d, x0, y0, z0, b) {
  const dx = b.x - x0, dy = b.y - y0, dz = b.z - z0;
  const h = clamp(((d.x - x0) * dx + (d.y - y0) * dy + (d.z - z0) * dz) / Math.max(dx * dx + dy * dy + dz * dz, 1e-12), 0, 1);
  return Math.hypot(d.x - x0 - dx * h, d.y - y0 - dy * h, d.z - z0 - dz * h);
}

export class StarSim extends TickSim {
  constructor(seed, spb) { super(seed, spb, 8); }

  reset() {
    this.rng = new Rng(this.seed, 'star-sim');
    this.tick = 0;
    this.frac = 0;
    this.kills = 0;
    this.nextId = 1;
    this.sway = this.rng.float(0, 6.28);
    this.ship = { x: 0, y: -0.35, vx: 0, vy: 0, yaw: 0, pitch: 0, onTarget: false, jink: 0, jinkUntil: -1 };
    this.drones = [];
    this.bolts = [];
    this.booms = [];
    this.target = null;
    this.flash = { hurt: -99, kill: -99 };
  }

  /**
   * A flight of three or four, in a V, a line or an arc, far ahead. Over the planet it
   * shows first as specks just above the horizon - never out of the ground; in space,
   * anywhere ahead in the distance, and half the flights sweep in from a side. As it
   * nears it comes down to the ship's height, to pass round it.
   */
  squadron(T) {
    const planet = overPlanet(T);
    const n = this.rng.int(3, 4);
    const shape = this.rng.int(0, 2);
    const cx = this.rng.float(-0.25, 0.25);
    const cy = planet ? HORIZON + this.rng.float(0.015, 0.07) : this.rng.float(-0.08, 0.3);
    const from = !planet && this.rng.bool(0.5) ? (this.rng.bool() ? -1 : 1) : 0;
    const z = this.rng.float(30, 34);
    const vz = -this.rng.float(7, 10);
    const passX = this.rng.float(-0.5, 0.5), passY = this.rng.float(-0.3, 0.2);
    for (let i = 0; i < n && this.drones.length < DRONE_MAX; i++) {
      const k = i - (n - 1) / 2;
      const off = shape === 0 ? -Math.abs(k) : shape === 2 ? -k * k * 0.6 : 0;
      const dz = z + (shape === 0 ? Math.abs(k) * 1.5 : 0);
      const d = {
        sx: cx + k * 0.12, sy: Math.max(cy + off * 0.025, planet ? HORIZON + 0.008 : -1), from, planet,
        passX: passX + k * 0.55, passY: passY + off * 0.18, z0: dz, age: 0,
        x: 0, y: 0, z: dz, vx: 0, vy: 0, vz,
        hp: 2, id: this.nextId++ % 61, phase: this.rng.float(0, 6.28), weave: this.rng.float(0.6, 1.6),
      };
      this.place(d, T * this.tickSec);
      this.drones.push(d);
    }
  }

  /**
   * Where a drone is at its depth: far off, on the screen spot it showed at (a side entry
   * sweeping in); nearer, easing down to its lane past the ship, weaving more as it comes.
   */
  place(d, time) {
    const far = smooth(4, d.z0, d.z);
    const sx = d.sx + d.from * 1.3 * Math.exp(-d.age * 1.8);
    let x = d.passX + (sx * d.z / STAR_FL - d.passX) * far + Math.cos(time * d.weave + d.phase) * 0.5 * (1 - 0.7 * far);
    let y = d.passY + (heightAt(d.sy, d.z) - d.passY) * far + Math.sin(time * d.weave * 1.3 + d.phase) * 0.2 * (1 - far);
    // over the planet it stays above the ground's line at its depth
    if (d.planet) y = Math.max(y, heightAt(HORIZON - 0.25 / d.z + 0.03, d.z));
    return [x, y];
  }

  boom(x, y, z) {
    this.booms.push({ x, y, z, tick: this.tick });
    if (this.booms.length > SBOOM_MAX) this.booms.shift();
  }

  addBolt(b) {
    if (this.bolts.length >= BOLT_MAX) this.bolts.shift();
    this.bolts.push({ ...b, run: 0 });
  }

  /** Into the slide: moving right, the right wing dips. */
  bank() { return clamp(this.ship.vx * 1.0, -0.55, 0.55); }

  /** Yaw and pitch that would put the nose on a point. */
  angles(px, py, pz) {
    const s = this.ship;
    const dx = px - s.x, dy = py - s.y, dz = pz - SHIP_Z;
    return [Math.atan2(dx, dz), Math.atan2(dy, Math.hypot(dx, dz))];
  }

  /** A drone the ship can line up on: as far over as it can slide, plus as far as its nose turns. */
  reachable(d) {
    if (d.z < 5 || d.z > 24 || d.hp <= 0) return false;
    const ahead = d.z - SHIP_Z;
    return Math.abs(d.x) < 0.75 + Math.tan(0.28) * ahead
      && d.y > -0.55 - Math.tan(0.23) * ahead && d.y < -0.15 + Math.tan(0.23) * ahead;
  }

  step() {
    const dt = this.tickSec, T = this.tick, s = this.ship;
    const time = T * dt;
    if (T % 64 === 8 || (this.drones.length === 0 && T % 16 === 8)) this.squadron(T);

    // drones come on along their paths, weaving as they near
    for (const d of this.drones) {
      d.z += d.vz * dt; d.age += dt;
      const [x, y] = this.place(d, time + dt);
      d.vx = (x - d.x) / dt; d.vy = (y - d.y) / dt;
      d.x = x; d.y = y;
    }
    this.drones = this.drones.filter((d) => d.z > 2.2 && d.hp > 0);
    if (this.target && (!this.drones.includes(this.target) || !this.reachable(this.target))) this.target = null;
    if (!this.target) this.target = this.drones.filter((d) => this.reachable(d)).sort((a, b) => a.z - b.z)[0] || null;
    const tg = this.target;

    // where to put the nose: ahead of the target, where the bolts will meet it
    let wantYaw = 0, wantPitch = 0, lead = null;
    if (tg) {
      let px = tg.x, py = tg.y, pz = tg.z;
      for (let k = 0; k < 2; k++) {
        const tt = Math.hypot(px - s.x, py - s.y, pz - SHIP_Z) / BOLT_SPEED;
        px = tg.x + tg.vx * tt; py = tg.y + tg.vy * tt; pz = tg.z + tg.vz * tt;
      }
      lead = [px, py, pz];
      [wantYaw, wantPitch] = this.angles(px, py, pz);
    } else {
      wantYaw = clamp(s.vx * 0.4, -0.2, 0.2);     // nothing to shoot: the nose follows the flight
    }
    const turn = TURN * dt;
    // the nose turns only so far: the rest of the aiming is done by sliding over
    s.yaw = clamp(s.yaw + clamp(clamp(wantYaw, -0.3, 0.3) - s.yaw, -turn, turn), -0.3, 0.3);
    s.pitch = clamp(s.pitch + clamp(clamp(wantPitch, -0.25, 0.25) - s.pitch, -turn, turn), -0.25, 0.25);

    // the ship slides the way its nose points, lining up on the target; with nothing to chase it sways
    const gx = tg ? clamp(tg.x / tg.z * SHIP_Z, -0.75, 0.75) : 0.42 * Math.sin(time * 0.6 + this.sway);
    const gy = tg ? clamp(tg.y / tg.z * SHIP_Z - 0.25, -0.55, -0.15) : -0.35 + 0.08 * Math.sin(time * 0.9);
    const dodging = time < s.jinkUntil;
    s.vx += ((clamp(gx + (dodging ? s.jink : 0), -0.85, 0.85) - s.x) * (dodging ? 16 : 9) - s.vx * 6) * dt;
    s.vy += ((gy - s.y) * 9 - s.vy * 6) * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;

    // bolts fly, each one tested along the whole stretch it covered this tick
    for (const b of this.bolts) {
      const x0 = b.x, y0 = b.y, z0 = b.z;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt;
      b.run += Math.hypot(b.vx, b.vy, b.vz) * dt;
      if (b.kind === 1) {
        for (const d of this.drones) {
          if (d.hp <= 0 || segDist3(d, x0, y0, z0, b) > DRONE_R) continue;
          b.life = 0;
          if (--d.hp <= 0) { this.boom(d.x, d.y, d.z); this.kills++; this.flash.kill = T; } else d.hit = T;
          break;
        }
      } else if (b.kind === 2 && b.z <= SHIP_Z + 0.3 && z0 > SHIP_Z + 0.3) {
        // a drone's shot reaches the ship: if the ship is still in its way, it lands
        // (for a moment after a hit the shield holds, so two never flash back to back)
        if (Math.hypot(b.x - s.x, b.y - s.y) < 0.4) { if ((T - this.flash.hurt) * dt > 1.2) this.flash.hurt = T; b.life = 0; }
      }
    }
    // a shot of theirs that misses goes past the ship and is gone: it never sweeps across the camera
    this.bolts = this.bolts.filter((b) => b.life > 0 && b.z > (b.kind === 2 ? SHIP_Z - 0.2 : 0.3) && b.z < 45);

    // fire on the eighths, along the nose, only when it is on the target
    const dir = aimDir(s.yaw, s.pitch);
    s.onTarget = false;
    if (lead) {
      const dx = lead[0] - s.x, dy = lead[1] - s.y, dz = lead[2] - SHIP_Z;
      const dist = Math.hypot(dx, dy, dz);
      const off = Math.acos(clamp((dx * dir[0] + dy * dir[1] + dz * dir[2]) / dist, -1, 1));
      s.onTarget = off < Math.atan2(DRONE_R * 0.7, dist);
    }
    if (T % 4 === 0 && s.onTarget) {
      const bank = this.bank();
      for (const g of GUNS) {
        const [x, y, z] = shipPoint(g, s, bank);
        this.addBolt({ kind: 1, x, y, z, vx: dir[0] * BOLT_SPEED, vy: dir[1] * BOLT_SPEED, vz: dir[2] * BOLT_SPEED, life: 1.5 });
      }
    }
    // the drones fire back on the backbeat
    if (T % 32 === 8 || T % 32 === 24) {
      const shooters = this.drones.filter((d) => d.z > 6 && d.z < 20);
      if (shooters.length && this.rng.bool(0.7)) {
        const d = this.rng.pick(shooters);
        const l = Math.hypot(s.x - d.x, s.y - d.y, SHIP_Z - d.z);
        this.addBolt({ kind: 2, seen: this.rng.bool(0.85), x: d.x, y: d.y, z: d.z, vx: (s.x - d.x) / l * FOE_SPEED, vy: (s.y - d.y) / l * FOE_SPEED, vz: (SHIP_Z - d.z) / l * FOE_SPEED, life: 3 });
      }
    }
    // the pilot sees one coming (most of the time), and slides out of its way
    for (const b of this.bolts) {
      if (b.kind !== 2 || !b.seen || b.dodged || b.z <= SHIP_Z || (b.z - SHIP_Z) / -b.vz > 0.5) continue;
      b.dodged = true;
      // aside from where it will cross, towards the middle when there is no room
      const tt = (b.z - SHIP_Z) / -b.vz, cross = b.x + b.vx * tt;
      let side = s.x >= cross ? 1 : -1;
      if (Math.abs(cross + side * DODGE) > 0.85) side = -side;
      s.jink = cross + side * DODGE - s.x;
      s.jinkUntil = time + tt + 0.15;
    }
  }

  uniforms(t) {
    this.advanceTo(t);
    const e = this.frac * this.tickSec;
    const s = this.ship;
    const since = (k) => (this.tick - k) * this.tickSec + e;
    const drones = new Float32Array(DRONE_MAX * 4);
    this.drones.forEach((d, i) => drones.set([d.x + d.vx * e, d.y + d.vy * e, d.z + d.vz * e, d.id + (d.hit !== undefined && since(d.hit) < 0.25 ? 0.5 : 0)], i * 4));
    const bolts = new Float32Array(BOLT_MAX * 4), dirs = new Float32Array(BOLT_MAX * 4);
    this.bolts.forEach((b, i) => {
      const v = Math.hypot(b.vx, b.vy, b.vz) || 1;
      bolts.set([b.x + b.vx * e, b.y + b.vy * e, b.z + b.vz * e, b.kind], i * 4);
      dirs.set([b.vx / v, b.vy / v, b.vz / v, b.run + v * e], i * 4);     // w: how far it has come, so the trail never reaches back past the gun
    });
    const booms = new Float32Array(SBOOM_MAX * 4);
    for (let i = 0; i < SBOOM_MAX; i++) {
      const b = this.booms[i];
      booms.set(b ? [b.x, b.y, b.z, since(b.tick)] : [0, 0, 10, 99], i * 4);
    }
    const tg = this.target;
    // a shot that lands: the ship shudders, rocking and jolting for a moment
    const hurt = since(this.flash.hurt);
    const shake = hurt < 1 ? Math.exp(-hurt * 5) : 0;
    return {
      uShip: { v: [s.x + s.vx * e + 0.05 * shake * Math.sin(hurt * 55), s.y + s.vy * e + 0.03 * shake * Math.sin(hurt * 43), this.bank() + 0.45 * shake * Math.sin(hurt * 38), s.yaw], kind: '4f' },
      uAim: { v: [s.pitch, s.onTarget ? 1 : 0, VIEW_TILT, 0], kind: '4f' },
      uDrones: { v: drones, kind: '4fv' },
      uBolts: { v: bolts, kind: '4fv' },
      uBoltDir: { v: dirs, kind: '4fv' },
      uSBooms: { v: booms, kind: '4fv' },
      uTarget: { v: tg ? [tg.x + tg.vx * e, tg.y + tg.vy * e, tg.z + tg.vz * e, 1] : [0, 0, 10, 0], kind: '4f' },
      uStarFx: { v: [hurt, this.kills, 99, since(this.flash.kill)], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// Games on the music's grid: paddles, invaders, bricks
// ---------------------------------------------------------------------------

/**
 * Where a game can land its moments: the bar lines, beats and eighths of the
 * score it plays to, and its accents - the bars that open on a crash or on the
 * drop. A bar may be odd (13 sixteenths): it is cut into equal pieces from its
 * downbeat, and the last piece takes what is left.
 */
class MusicGrid {
  constructor(spb, meta) {
    this.spb = (meta && meta.spb) || spb;
    this.steps = (meta && meta.steps) || 16;
    this.barSec = (meta && meta.barSec) || this.spb * this.steps / 4;
    this.six = this.spb / 4;
    this.accents = meta && meta.accents ? new Set(meta.accents) : null;
  }

  /** The first mark after t on a grid of `step` sixteenths. */
  next(t, step) {
    const bar = Math.floor(t / this.barSec + 1e-9);
    for (let b = bar; b <= bar + 1; b++) {
      for (let s = 0; s + step <= this.steps; s += step) {
        const g = b * this.barSec + s * this.six;
        if (g > t + 1e-6) return g;
      }
    }
    return (bar + 2) * this.barSec;
  }

  /** Whether t is the downbeat of an accented bar (every eighth bar when the score names none). */
  isAccent(t) {
    const bar = Math.round(t / this.barSec);
    if (bar <= 0 || Math.abs(t - bar * this.barSec) > 1e-4) return false;
    return this.accents ? this.accents.has(bar) : bar % 8 === 0;
  }
}

/**
 * A game planned move by move, each move landing on the music's grid. It is
 * planned ahead only as far as it is watched; what is behind is let go, and
 * going back further than what is kept replays from the start.
 */
class PlannedSim {
  constructor(seed, spb, meta) {
    this.seed = seed;
    this.grid = new MusicGrid(spb, meta);
    this.reset();
  }

  advanceTo(t) {
    if (t < this.kept) this.reset();
    while (this.clock <= t + 0.5) this.plan();
    this.forget(t - 3);
  }
}

/** Keyframes of one number over time, eased between: a paddle, a cannon. */
class Track {
  constructor(v) { this.keys = [[-1e9, v]]; }
  set(t, v) { this.keys.push([t, v]); }
  at(t) {
    const k = this.keys;
    let i = k.length - 1;
    while (i > 0 && k[i][0] > t) i--;
    if (i === k.length - 1) return k[i][1];
    const [t0, v0] = k[i], [t1, v1] = k[i + 1];
    const u = Math.min(1, Math.max(0, (t - t0) / Math.max(t1 - t0, 1e-6)));
    return v0 + (v1 - v0) * u * u * (3 - 2 * u);
  }
  last() { return this.keys[this.keys.length - 1]; }
  forget(t) { while (this.keys.length > 2 && this.keys[1][0] < t) this.keys.shift(); }
}

/** Distance along a ray to a box, and which face it meets (0: a side, 1: top or bottom). */
function rayBox(px, py, dx, dy, x0, y0, x1, y1) {
  let tmin = -Infinity, tmax = Infinity, axis = 0;
  if (Math.abs(dx) < 1e-12) { if (px < x0 || px > x1) return null; } else {
    let a = (x0 - px) / dx, b = (x1 - px) / dx;
    if (a > b) [a, b] = [b, a];
    if (a > tmin) { tmin = a; axis = 0; }
    tmax = Math.min(tmax, b);
  }
  if (Math.abs(dy) < 1e-12) { if (py < y0 || py > y1) return null; } else {
    let a = (y0 - py) / dy, b = (y1 - py) / dy;
    if (a > b) [a, b] = [b, a];
    if (a > tmin) { tmin = a; axis = 1; }
    tmax = Math.min(tmax, b);
  }
  if (tmax < tmin || tmin < 1e-7) return null;
  return { t: tmin, axis };
}

const recent = (list, t, keep) => list.filter((e) => e.t <= t).slice(-keep);

// --- paddles ---------------------------------------------------------------

const PONG_X = 0.817;           // where the ball meets a paddle's face
const PONG_Y = 0.405;           // where it meets the walls
const PADDLE_HALF = 0.075;

/** Fold a straight path back into the court, as the walls bounce it. */
function foldY(u) {
  const span = 4 * PONG_Y;
  const m = ((u + PONG_Y) % span + span) % span;
  return m < 2 * PONG_Y ? m - PONG_Y : 3 * PONG_Y - m;
}

/**
 * Paddles: the ball crosses the court once a beat, so every return lands on
 * the music. On an accent - the crash that opens a phrase, the drop - the
 * paddle the ball is heading for gets there too late: it is blown apart on
 * that very note, the other side scores, and the next bar serves again.
 */
export class PaddlesSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'paddles-sim');
    this.clock = 0;
    this.kept = 0;
    this.side = -1;               // the ball leaves the left paddle first
    this.u = 0;                   // where it left from, as an unfolded height
    this.legs = [];               // the ball's flights
    this.hits = [];               // returns, for the sparks
    this.misses = [];             // points lost, for the explosions
    this.score = [0, 0];
    this.paddle = [new Track(0), new Track(0)];
  }

  plan() {
    const g = this.grid.next(this.clock + this.grid.spb * 0.5, 4);
    const to = -this.side;
    const y1 = this.rng.float(-0.34, 0.34);
    // straight across, or off a wall
    const bank = this.rng.weighted([0, 1, -1], [5, 2, 2]);
    const u1 = bank === 0 ? y1 : bank === 1 ? 2 * PONG_Y - y1 : -2 * PONG_Y - y1;
    const miss = this.grid.isAccent(g) && this.clock > 0;
    this.legs.push({ t0: this.clock, t1: g, x0: this.side * PONG_X, x1: to * PONG_X, u0: this.u, u1, score: [...this.score] });
    const k = to < 0 ? 0 : 1, other = 1 - k;
    // the receiver goes for the ball - or, on the accent, misjudges it
    const aim = miss ? y1 + (y1 > 0 ? -1 : 1) * this.rng.float(0.15, 0.22) : y1 + this.rng.float(-0.04, 0.04);
    this.paddle[k].set(g, Math.max(-0.33, Math.min(0.33, aim)));
    this.paddle[other].set(g, this.paddle[other].at(this.clock) * 0.4 + y1 * 0.3);
    if (miss) {
      this.misses.push({ t: g, side: to, k, y: this.paddle[k].at(g), x: to * 0.84 });
      this.score[other]++;
      // the ball flies on into the gutter and is gone; the winner serves on the next bar
      const serve = g + this.grid.barSec;
      const gone = g + 0.12;
      this.legs.push({ t0: g, t1: gone, x0: to * PONG_X, x1: to * 1.0, u0: u1, u1: u1 + (u1 - this.u) * 0.1, score: [...this.score] });
      this.legs.push({ t0: gone, t1: serve, x0: to * 1.0, x1: to * 1.0, u0: 0, u1: 0, score: [...this.score], out: true });
      this.side = -to;
      this.u = this.paddle[other].at(serve);
      this.clock = serve;
      return;
    }
    this.hits.push({ t: g, x: to * PONG_X, y: foldY(u1), side: to });
    this.side = to;
    this.u = foldY(u1);
    this.clock = g;
  }

  forget(t) {
    this.kept = this.legs.length > 1 ? this.legs[0].t0 : 0;
    while (this.legs.length > 2 && this.legs[1].t1 < t) { this.legs.shift(); this.kept = this.legs[0].t0; }
    this.hits = this.hits.filter((h) => h.t > t - 2);
    this.misses = this.misses.filter((m) => m.t > t - 4);
    for (const p of this.paddle) p.forget(t - 2);
  }

  uniforms(t) {
    this.advanceTo(t);
    const leg = this.legs.find((l) => t >= l.t0 && t < l.t1) || this.legs[this.legs.length - 1];
    const f = Math.min(1, Math.max(0, (t - leg.t0) / (leg.t1 - leg.t0)));
    const x = leg.x0 + (leg.x1 - leg.x0) * f;
    const y = foldY(leg.u0 + (leg.u1 - leg.u0) * f);
    const hit = recent(this.hits, t, 1)[0];
    const miss = recent(this.misses, t, 1)[0];
    // a paddle blown apart is gone for the bar, and fades back in over its last quarter
    const there = (k) => {
      const m = this.misses.filter((x) => x.k === k && x.t <= t).pop();
      if (!m) return 1;
      const back = m.t + this.grid.barSec;
      return Math.min(1, Math.max(0, (t - (back - this.grid.barSec * 0.25)) / (this.grid.barSec * 0.25)));
    };
    return {
      uBall: { v: [x, y, leg.x1 > leg.x0 ? 1 : -1, leg.out ? 0 : 1], kind: '4f' },
      uPaddles: { v: [this.paddle[0].at(t), this.paddle[1].at(t), there(0), there(1)], kind: '4f' },
      uHit: { v: hit ? [hit.x, hit.y, t - hit.t, hit.side] : [0, 0, 99, 0], kind: '4f' },
      uMiss: { v: miss ? [miss.x, miss.y, t - miss.t, miss.side] : [0, 0, 99, 0], kind: '4f' },
      uScore: { v: [leg.score[0] % 100, leg.score[1] % 100, 0, 0], kind: '4f' },
    };
  }
}

// --- invaders --------------------------------------------------------------

const INV_COLS = 9, INV_ROWS = 5;
const INV_CELL = [0.105, 0.075];
const CANNON_Y = -0.33;
const SHOT_V = 1.4;

/**
 * Invaders: the formation steps on every beat and drops a row at the edges.
 * The cannon slides under an alien and fires so its shot arrives on a beat:
 * the alien bursts on the kick. Before an accent a saucer crosses the top,
 * and the cannon brings it down on the crash itself. A cleared wave marches
 * in again on the next bar.
 */
export class InvadersSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'invaders-sim');
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.newWave(0);
    this.cannon = new Track(0);
    this.forms = [{ t: -1e9, ox: this.ox, oy: this.oy, frame: 0, alive: this.alive.slice() }];
    this.shots = [];              // {t0 launch, t1 arrival, x, y1}
    this.booms = [];
    this.bombs = [];
    this.saucers = [];
    this.pending = [];            // kills on their way: {t, row, col} or {t, saucer}
  }

  newWave(t) {
    this.alive = Array.from({ length: INV_ROWS }, () => (1 << INV_COLS) - 1);
    this.ox = -0.47;
    this.oy = 0.25;
    this.dir = 1;
    this.frame = 0;
    this.waveAt = t;
  }

  cols() {
    let lo = INV_COLS, hi = -1;
    for (const row of this.alive) for (let c = 0; c < INV_COLS; c++) if (row & (1 << c)) { lo = Math.min(lo, c); hi = Math.max(hi, c); }
    return [lo, hi];
  }

  /** The formation one step on from (ox, oy, dir). */
  stepped(ox, oy, dir) {
    const [lo, hi] = this.cols();
    const step = 0.035;
    if (dir > 0 && ox + (hi + 1) * INV_CELL[0] + step > 0.8) return [ox, oy - 0.03, -1];
    if (dir < 0 && ox + lo * INV_CELL[0] - step < -0.8) return [ox, oy - 0.03, 1];
    return [ox + dir * step, oy, dir];
  }

  alienAt(ox, oy, row, col) { return [ox + (col + 0.5) * INV_CELL[0], oy - (row + 0.5) * INV_CELL[1]]; }

  plan() {
    const g = this.grid.next(this.clock, 4);
    const g2 = this.grid.next(this.grid.next(g, 4), 4);
    // 1. the formation steps
    [this.ox, this.oy, this.dir] = this.stepped(this.ox, this.oy, this.dir);
    this.frame ^= 1;
    // 2. what was fired two beats ago lands now
    for (const k of this.pending.filter((p) => p.t === g)) {
      if (k.saucer) {
        this.booms.push({ t: g, x: k.x, y: 0.43, kind: 1 });
        this.score += 300;
      } else if (this.alive[k.row] & (1 << k.col)) {
        this.alive[k.row] &= ~(1 << k.col);
        const [x, y] = this.alienAt(this.ox, this.oy, k.row, k.col);
        this.booms.push({ t: g, x, y, kind: 0, row: k.row });
        this.score += [30, 20, 20, 10, 10][k.row];
      }
    }
    this.pending = this.pending.filter((p) => p.t > g);
    const cleared = this.alive.every((r) => r === 0);
    const landed = this.oy - INV_ROWS * INV_CELL[1] < -0.24;
    if (cleared || landed) {
      if (landed) this.booms.push({ t: g, x: this.cannon.at(g), y: CANNON_Y, kind: 2 });
      // the next wave marches in on a bar line
      const bar = Math.ceil((g + this.grid.barSec * 0.5) / this.grid.barSec) * this.grid.barSec;
      this.newWave(bar);
      this.pending = [];
      this.forms.push({ t: g, ox: 9, oy: 9, frame: 0, alive: this.alive.map(() => 0) });
      this.forms.push({ t: bar, ox: this.ox, oy: this.oy, frame: 0, alive: this.alive.slice() });
      this.clock = bar;
      return;
    }
    this.forms.push({ t: g, ox: this.ox, oy: this.oy, frame: this.frame, alive: this.alive.slice() });

    // 3. aim a shot to land two beats on: the saucer on an accent, an alien otherwise
    const [nx, ny] = this.stepped(this.ox, this.oy, this.dir);
    const cx = this.cannon.at(g);
    let target = null;
    if (this.grid.isAccent(g2)) {
      // a saucer has been crossing since two bars before
      const from = this.rng.bool() ? -1.05 : 1.05;
      const xHit = this.rng.float(-0.45, 0.45);
      const enter = g2 - 2 * this.grid.barSec;
      this.saucers.push({ t0: enter, t1: g2, x0: from, x1: xHit });
      target = { x: xHit, y: 0.43, saucer: true };
    } else if (this.rng.bool(0.75)) {
      // the lowest alien of a column, near the cannon more often than not
      const choices = [];
      for (let c = 0; c < INV_COLS; c++) {
        for (let r = INV_ROWS - 1; r >= 0; r--) {
          if (!(this.alive[r] & (1 << c)) || this.pending.some((p) => p.row === r && p.col === c)) continue;
          const [x, y] = this.alienAt(nx, ny, r, c);
          choices.push({ x, y, row: r, col: c, w: 1 / (0.15 + Math.abs(x - cx)) });
          break;
        }
      }
      if (choices.length) target = this.rng.weighted(choices, choices.map((c) => c.w));
    }
    if (target) {
      const flight = (target.y - CANNON_Y) / SHOT_V;
      const launch = g2 - flight;
      // the cannon has to be under it when it fires, and the last shot has to be home
      const busy = this.shots.length && this.shots[this.shots.length - 1].t1 > launch;
      if (launch > g && !busy && Math.abs(target.x - cx) <= 1.6 * (launch - g)) {
        this.cannon.set(launch, target.x);
        this.cannon.set(g2, target.x);
        this.shots.push({ t0: launch, t1: g2, x: target.x, y1: target.y });
        this.pending.push({ t: g2, ...target });
      } else if (target.saucer) {
        this.saucers.pop();         // it could not get there: the saucer stays away
      }
    }
    // now and then an alien drops a bomb on the backbeat
    if (this.rng.bool(0.3)) {
      const c = this.rng.int(0, INV_COLS - 1);
      const r = [4, 3, 2, 1, 0].find((rr) => this.alive[rr] & (1 << c));
      if (r !== undefined) {
        const [x, y] = this.alienAt(this.ox, this.oy, r, c);
        this.bombs.push({ t0: g + this.grid.spb * 0.5, x, y0: y });
      }
    }
    this.clock = g;
  }

  forget(t) {
    while (this.forms.length > 2 && this.forms[1].t < t) this.forms.shift();
    this.kept = this.forms[0].t > -1e8 ? this.forms[0].t : 0;
    this.shots = this.shots.filter((s) => s.t1 > t - 1);
    this.booms = this.booms.filter((b) => b.t > t - 2);
    this.bombs = this.bombs.filter((b) => b.t0 > t - 3);
    this.saucers = this.saucers.filter((s) => s.t1 > t - 2);
    this.cannon.forget(t - 2);
  }

  uniforms(t) {
    this.advanceTo(t);
    let f = this.forms[0];
    for (const x of this.forms) if (x.t <= t) f = x;
    const shot = this.shots.find((s) => t >= s.t0 && t < s.t1);
    const booms = new Float32Array(24).fill(0);
    recent(this.booms, t, 6).forEach((b, i) => booms.set([b.x, b.y, t - b.t, b.kind + (b.row || 0) * 0.1], i * 4));
    for (let i = recent(this.booms, t, 6).length; i < 6; i++) booms.set([0, 0, 99, 0], i * 4);
    const bombs = new Float32Array(12).fill(0);
    this.bombs.filter((b) => t >= b.t0).slice(-3).forEach((b, i) => {
      const y = b.y0 - (t - b.t0) * 0.55;
      bombs.set([b.x, Math.max(y, CANNON_Y - 0.02), y > CANNON_Y - 0.02 ? 1 : 0, 0], i * 4);
    });
    const ufo = this.saucers.find((s) => t >= s.t0 && t < s.t1);
    return {
      uAliens: { v: Float32Array.from(f.alive), kind: '1fv' },
      uForm: { v: [f.ox, f.oy, f.frame, t - f.t], kind: '4f' },
      uCannon: { v: [this.cannon.at(t), shot ? t - shot.t0 : 99, this.score % 100000, 0], kind: '4f' },
      uShot: { v: shot ? [shot.x, CANNON_Y + (t - shot.t0) * SHOT_V, 1, 0] : [0, 0, 0, 0], kind: '4f' },
      uSaucer: { v: ufo ? [ufo.x0 + (ufo.x1 - ufo.x0) * (t - ufo.t0) / (ufo.t1 - ufo.t0), 1, 0, 0] : [0, 0, 0, 0], kind: '4f' },
      uBombs: { v: bombs, kind: '4fv' },
      uBooms: { v: booms, kind: '4fv' },
    };
  }
}

// --- bricks ----------------------------------------------------------------

const BR_COLS = 12, BR_ROWS = 6;
const BR_X = 0.8, BR_W = 1.6 / BR_COLS, BR_H = 0.042;
const BALL_R = 0.012;
const PAD_Y = -0.335 + 0.014 + BALL_R;     // where the ball meets the paddle
const PAD_HALF = 0.074;
const VMAX = 1.5, VMIN = 0.4;

/**
 * Bricks: the ball's every bounce is timed to the grid. Each flight - to a
 * wall, a brick or the paddle - is flown at whatever speed lands it on the
 * next eighth (or sixteenth) it can reach, so bricks break on the rhythm.
 * The paddle picks a brick to aim for, or just an angle, and gets under the
 * ball off-centre to send it there: the ball goes somewhere new every time.
 * A cleared wall is built again on the next return; the top row of later
 * walls takes two hits.
 */
export class BricksSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'bricks-sim');
    this.clock = 0;
    this.kept = 0;
    this.level = 0;
    this.px = 0; this.py = PAD_Y + 0.001;
    const a = this.rng.float(-0.6, 0.6);
    this.dx = Math.sin(a); this.dy = Math.cos(a);
    this.legs = [];
    this.walls = [];
    this.booms = [];
    this.returns = [];
    this.paddle = new Track(0);
    this.build(0);
  }

  build(t) {
    const hp = new Uint8Array(BR_COLS * BR_ROWS);
    // a new shape each wall: some bricks left out, mirrored
    const gaps = this.level === 0 ? 0 : this.rng.float(0, 0.25);
    for (let r = 0; r < BR_ROWS; r++) {
      for (let c = 0; c < BR_COLS / 2; c++) {
        const on = this.rng.bool(1 - gaps) ? (r === BR_ROWS - 1 && this.level > 0 ? 2 : 1) : 0;
        hp[r * BR_COLS + c] = on;
        hp[r * BR_COLS + BR_COLS - 1 - c] = on;
      }
    }
    this.wall = { t, hp, init: hp.slice(), dead: new Float64Array(BR_COLS * BR_ROWS).fill(Infinity), cracked: new Float64Array(BR_COLS * BR_ROWS).fill(Infinity) };
    this.walls.push(this.wall);
    this.level++;
  }

  plan() {
    const { px, py, dx, dy } = this;
    let best = { d: Infinity, kind: null };
    const consider = (d, kind, extra) => { if (d > 1e-7 && d < best.d) best = { d, kind, ...extra }; };
    if (dx > 0) consider((BR_X - BALL_R - px) / dx, 'side');
    if (dx < 0) consider((-BR_X + BALL_R - px) / dx, 'side');
    if (dy > 0) consider((0.45 - BALL_R - py) / dy, 'top');
    if (dy < 0) consider((PAD_Y - py) / dy, 'paddle');
    const w = this.wall;
    for (let i = 0; i < w.hp.length; i++) {
      if (!w.hp[i]) continue;
      const c = i % BR_COLS, r = (i / BR_COLS) | 0;
      const x0 = -BR_X + c * BR_W, y0 = r * BR_H;
      const hit = rayBox(px, py, dx, dy, x0 - BALL_R, y0 - BALL_R, x0 + BR_W + BALL_R, y0 + BR_H + BALL_R);
      if (hit) consider(hit.t, 'brick', { i, axis: hit.axis });
    }
    const d = best.d;
    // arrive on the next eighth it can reach; a short hop on the next sixteenth
    let t1 = this.grid.next(this.clock + d / VMAX - 1e-6, 2);
    // (a hop that short is slow even then, but it still lands on the rhythm)
    if (d / (t1 - this.clock) < VMIN) t1 = this.grid.next(this.clock + d / VMAX - 1e-6, 1);
    const nx = px + dx * d, ny = py + dy * d;
    this.legs.push({ t0: this.clock, t1, x0: px, y0: py, x1: nx, y1: ny });
    this.px = nx; this.py = ny;
    if (best.kind === 'side') this.dx = -dx;
    else if (best.kind === 'top') this.dy = -dy;
    else if (best.kind === 'brick') {
      if (best.axis === 0) this.dx = -dx; else this.dy = -dy;
      const i = best.i;
      const c = i % BR_COLS, r = (i / BR_COLS) | 0;
      const x = -BR_X + (c + 0.5) * BR_W, y = (r + 0.5) * BR_H;
      if (--w.hp[i] === 0) { w.dead[i] = t1; this.booms.push({ t: t1, x, y, row: r }); } else w.cracked[i] = t1;
    } else {
      // the paddle: aim at a brick, or just send it somewhere, never straight up
      const alive = [];
      for (let i = 0; i < w.hp.length; i++) if (w.hp[i]) alive.push(i);
      if (!alive.length) this.build(t1);     // a cleared wall goes back up on this return
      let a;
      const now = this.wall.hp.reduce((s, v, i) => (v ? [...s, i] : s), []);
      if (now.length && this.rng.bool(0.65)) {
        const i = this.rng.pick(now);
        const tx = -BR_X + (i % BR_COLS + 0.5) * BR_W, ty = ((i / BR_COLS | 0) + 0.5) * BR_H;
        a = Math.atan2(tx - nx, ty - ny) + this.rng.float(-0.12, 0.12);
      } else a = this.rng.float(-1.05, 1.05);
      a = Math.max(-1.08, Math.min(1.08, a));
      if (Math.abs(a) < 0.14) a = 0.14 * (a < 0 ? -1 : 1);
      this.dx = Math.sin(a); this.dy = Math.cos(a);
      // the paddle meets the ball off-centre, on the side it sends it to
      this.paddle.set(t1, Math.max(-BR_X + PAD_HALF, Math.min(BR_X - PAD_HALF, nx - (a / 1.08) * PAD_HALF * 0.8)));
      this.returns.push({ t: t1 });
    }
    if (best.kind !== 'paddle' && this.dy < 0) {
      // drifting under the ball while it is up the court
      this.paddle.set(t1, Math.max(-BR_X + PAD_HALF, Math.min(BR_X - PAD_HALF, this.paddle.at(this.clock) * 0.5 + nx * 0.5)));
    }
    this.clock = t1;
  }

  forget(t) {
    while (this.legs.length > 2 && this.legs[1].t1 < t) this.legs.shift();
    this.kept = this.legs.length ? this.legs[0].t0 : 0;
    while (this.walls.length > 2 && this.walls[1].t < t) this.walls.shift();
    this.booms = this.booms.filter((b) => b.t > t - 2);
    this.returns = this.returns.filter((r) => r.t > t - 2);
    this.paddle.forget(t - 2);
  }

  uniforms(t) {
    this.advanceTo(t);
    const leg = this.legs.find((l) => t >= l.t0 && t < l.t1) || this.legs[this.legs.length - 1];
    const f = Math.min(1, Math.max(0, (t - leg.t0) / Math.max(leg.t1 - leg.t0, 1e-6)));
    let w = this.walls[0];
    for (const x of this.walls) if (x.t <= t) w = x;
    const rows = new Float32Array(BR_ROWS), hard = new Float32Array(BR_ROWS);
    // the wall as it stood at t: standing until its break, silver until its first hit
    for (let i = 0; i < w.init.length; i++) {
      const r = (i / BR_COLS) | 0, bit = 2 ** (i % BR_COLS);
      if (w.init[i] && w.dead[i] > t) rows[r] += bit;
      if (w.init[i] === 2 && w.cracked[i] > t && w.dead[i] > t) hard[r] += bit;
    }
    const booms = new Float32Array(24);
    const rb = recent(this.booms, t, 6);
    for (let i = 0; i < 6; i++) booms.set(rb[i] ? [rb[i].x, rb[i].y, t - rb[i].t, rb[i].row] : [0, 0, 99, 0], i * 4);
    const dx = leg.x1 - leg.x0, dy = leg.y1 - leg.y0, l = Math.hypot(dx, dy) || 1;
    const ret = recent(this.returns, t, 1)[0];
    return {
      uBricks: { v: rows, kind: '1fv' },
      uHard: { v: hard, kind: '1fv' },
      uBall: { v: [leg.x0 + dx * f, leg.y0 + dy * f, dx / l, dy / l], kind: '4f' },
      uPaddle: { v: [this.paddle.at(t), ret ? t - ret.t : 99, t - w.t, 0], kind: '4f' },
      uBooms: { v: booms, kind: '4fv' },
    };
  }
}

// --- light cycles ----------------------------------------------------------

const LC_W = 48, LC_H = 26, LC_CELL = 0.036;
const LC_RIDERS = 4;
const LC_STRIDE = 2;            // cells a rider covers each sixteenth: they fly
const LC_TRAIL = 90;            // cells of wall each rider trails behind it
export const LC_SEGS = 80;
const LC_DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const lcX = (gx) => (gx - (LC_W - 1) / 2) * LC_CELL;
const lcY = (gy) => (gy - (LC_H - 1) / 2) * LC_CELL;

/** mulberry32 with its state in the open, so a game can be copied and played ahead. */
class Dice {
  constructor(a) { this.a = a >>> 0; }
  next() {
    this.a = (this.a + 0x6d2b79f5) >>> 0;
    let t = this.a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  copy() { return new Dice(this.a); }
}

/** The arena and its riders at one moment: everything the game needs to play on, and to be copied. */
class Arena {
  constructor(dice) {
    this.dice = dice;
    this.occ = new Int8Array(LC_W * LC_H).fill(-1);
    const starts = [[3, 8, 0], [LC_W - 4, LC_H - 9, 2], [13, LC_H - 3, 3], [LC_W - 14, 2, 1]];
    this.riders = starts.map(([x, y, d], i) => ({ id: i, x, y, d, alive: true, trail: [y * LC_W + x] }));
    for (const r of this.riders) this.occ[r.y * LC_W + r.x] = r.id;
  }

  copy() {
    const a = Object.create(Arena.prototype);
    a.dice = this.dice.copy();
    a.occ = this.occ.slice();
    a.riders = this.riders.map((r) => ({ ...r, trail: r.trail.slice() }));
    return a;
  }

  free(x, y) { return x >= 0 && y >= 0 && x < LC_W && y < LC_H && this.occ[y * LC_W + x] === -1; }

  /** Cells reachable from (x, y), up to a cap: how much room a rider would have there. */
  room(x, y, cap) {
    if (!this.free(x, y)) return 0;
    const seen = new Uint8Array(LC_W * LC_H);
    const q = [y * LC_W + x];
    seen[q[0]] = 1;
    for (let i = 0; i < q.length && q.length < cap; i++) {
      const cx = q[i] % LC_W, cy = (q[i] / LC_W) | 0;
      for (const [dx, dy] of LC_DIRS) {
        const nx = cx + dx, ny = cy + dy, j = ny * LC_W + nx;
        if (this.free(nx, ny) && !seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
    return Math.min(q.length, cap);
  }

  /** Free cells straight ahead of (x, y) going d, up to n - counting cells others are about to ride as taken. */
  run(x, y, d, n, avoid) {
    let k = 0;
    for (; k < n; k++) {
      const cx = x + LC_DIRS[d][0] * (k + 1), cy = y + LC_DIRS[d][1] * (k + 1);
      if (!this.free(cx, cy) || (avoid && avoid.has(cy * LC_W + cx))) break;
    }
    return k;
  }

  /** The cells the other riders will ride through in the next sixteenths, if they keep on. */
  paths(r) {
    const out = new Set();
    for (const o of this.riders) {
      if (o === r || !o.alive) continue;
      for (let k = 1; k <= LC_STRIDE * 3; k++) out.add((o.y + LC_DIRS[o.d][1] * k) * LC_W + o.x + LC_DIRS[o.d][0] * k);
    }
    return out;
  }

  /**
   * A rider's own choice, standing where it may turn: keep room to live, turn
   * on the beat - now and then for the fun of it, and before a wall gets close
   * enough to catch it between beats - and go after the others.
   */
  choose(r, onBeat) {
    const reach = LC_STRIDE * 8;       // two beats' ride
    const avoid = this.paths(r);
    const ahead = this.run(r.x, r.y, r.d, reach, avoid);
    // off the beat it rides straight on, unless something is about to be in its way
    if (!onBeat && ahead >= LC_STRIDE * 2) return r.d;
    let best = r.d, bestScore = -Infinity;
    const wantTurn = onBeat && this.dice.next() < 0.35;
    for (const turn of [0, 1, -1]) {
      const d = (r.d + turn + 4) % 4;
      if (this.run(r.x, r.y, d, LC_STRIDE) < LC_STRIDE) continue;
      const clear = this.run(r.x, r.y, d, reach, avoid);
      const nx = r.x + LC_DIRS[d][0] * LC_STRIDE, ny = r.y + LC_DIRS[d][1] * LC_STRIDE;
      let score = this.room(nx, ny, 400) + clear * 3;
      if (turn === 0) score += 4;
      if (wantTurn && turn !== 0) score += 12;
      // on the beat, turn away from whatever is closing in, rather than dodge it later between beats
      if (onBeat && turn !== 0 && ahead < LC_STRIDE * 6) score += 25;
      for (const o of this.riders) {
        if (o === r || !o.alive) continue;
        if (Math.abs(o.x - nx) + Math.abs(o.y - ny) <= LC_STRIDE + 1) score -= 80;   // never head into another's path
        score -= 0.1 * (Math.abs(o.x - nx) + Math.abs(o.y - ny));                    // and go after them
      }
      score += this.dice.next() * 2;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  /**
   * One sixteenth: everyone rides LC_STRIDE cells; `forced` holds the moves of
   * riders whose way is already planned. Returns who crashed, at which of the
   * cells, and into what (a rider's id, or -1 for the arena's edge).
   */
  step(onBeat, forced) {
    const plan = this.riders.map((r) => (r.alive ? (forced && forced.has(r.id) ? forced.get(r.id) : { d: this.choose(r, onBeat), stride: LC_STRIDE }) : null));
    const moves = plan.map((p) => (p ? p.d : -1));
    const crashed = [];
    for (let sub = 1; sub <= 3; sub++) {
      // a rider whose way is planned may ride a cell more or less this sixteenth
      const next = this.riders.map((r, i) => (r.alive && sub <= plan[i].stride ? [r.x + LC_DIRS[moves[i]][0], r.y + LC_DIRS[moves[i]][1]] : null));
      const now = [];
      this.riders.forEach((r, i) => {
        if (!next[i]) return;
        const [nx, ny] = next[i];
        const head = next.some((o, j) => j !== i && o && o[0] === nx && o[1] === ny);
        const inside = nx >= 0 && ny >= 0 && nx < LC_W && ny < LC_H;
        // only a rider sent down by the game goes down; any other rides on
        const doomed = forced && forced.has(r.id);
        if (doomed && (!inside || this.occ[ny * LC_W + nx] !== -1 || head)) {
          now.push({ id: r.id, sub, stride: plan[i].stride, into: !inside ? -1 : head ? next.findIndex((o, j) => j !== i && o && o[0] === nx && o[1] === ny) : this.occ[ny * LC_W + nx] });
        }
      });
      this.riders.forEach((r, i) => {
        if (!next[i]) return;
        r.d = moves[i];
        const c = now.find((x) => x.id === r.id);
        if (c) { r.alive = false; r.hit = next[i]; crashed.push(c); return; }
        // (one boxed in with nowhere to turn slips through, or bounces off the arena's edge)
        if (next[i][0] < 0 || next[i][1] < 0 || next[i][0] >= LC_W || next[i][1] >= LC_H) { r.d = (r.d + 2) % 4; return; }
        r.x = next[i][0]; r.y = next[i][1];
        const cell = r.y * LC_W + r.x;
        this.occ[cell] = r.id;
        r.trail.push(cell);
        // the wall it trails is only so long
        if (r.trail.length > LC_TRAIL) { const old = r.trail.shift(); if (this.occ[old] === r.id) this.occ[old] = -1; }
      });
    }
    // a crashed rider's wall comes down at once
    for (const c of crashed) for (const cell of this.riders[c.id].trail) if (this.occ[cell] === c.id) this.occ[cell] = -1;
    return crashed;
  }
}

/**
 * Light cycles: four riders flying across a grid, two cells a sixteenth, each
 * trailing a wall of light; whoever runs into a wall - another rider's, its
 * own, or the arena's edge - blows up, and its wall comes down. They turn on
 * the beat. A rider is only lost where the music turns: a bar before the
 * downbeat that opens a phrase (or an accent), the game finds one rider a way
 * that ends on that very downbeat, crashing into another rider's wall if it
 * can - trying the turns it could make, playing the others ahead to make
 * sure. The last one riding wins the round, and a new round starts on a bar.
 */
export class LightcyclesSim extends PlannedSim {
  reset() {
    this.dice = new Dice(new Rng(this.seed, 'lightcycles-sim').int(0, 0x7fffffff));
    this.clock = 0;
    this.kept = 0;
    this.rounds = [];
    this.newRound(0);
  }

  newRound(t) {
    this.arena = new Arena(this.dice);
    this.round = {
      t, end: Infinity, winner: -1,
      trails: this.arena.riders.map((r) => ({ log: [{ t, x: r.x, y: r.y, n: 0 }], turns: [{ t, x: r.x, y: r.y, n: 0 }], cells: 0, dead: Infinity, hit: null })),
    };
    this.rounds.push(this.round);
    this.doom = null;               // a planned end: { id, moves: Map(time -> direction), at }
  }

  next(t) { return this.grid.next(t, 1); }
  isBeat(t) { return Math.abs(this.grid.next(t - 1e-4, 4) - t) < 1e-6; }
  isMoment(t) {
    const bar = Math.round(t / this.grid.barSec);
    return Math.abs(t - bar * this.grid.barSec) < 1e-6 && bar > 0 && (bar % 4 === 0 || this.grid.isAccent(t));
  }

  /**
   * Two beats ahead of a musical moment: find a rider a way into a wall - another
   * rider's, if it can - and time its speed so it hits the wall on the moment.
   * Every way it could go is tried (straight, or a turn on each eighth) at its
   * usual speed; where one ends in a wall, the cells to it are spread over the
   * sixteenths left, a cell more or less in some of them, and the arena is
   * played ahead once more on a copy to make sure nobody else goes down.
   */
  planDoom(now) {
    const steps = 8;
    const times = [];
    for (let t = now; times.length < steps; ) { t = this.next(t); times.push(t); }
    const at = times[steps - 1];
    if (!this.isMoment(at)) return;
    const alive = this.arena.riders.filter((r) => r.alive);
    if (alive.length < 2) return;
    const beatAt = (i) => this.isBeat(i === 0 ? now : times[i - 1]);
    const turnAt = (i) => i % 2 === 0;                    // the doomed rider may turn on each eighth
    const first = Math.floor(this.dice.next() * alive.length);
    const order = alive.map((r, i) => alive[(i + first) % alive.length].id);
    let plans = [[]];
    for (let i = 0; i < steps; i++) {
      const next = [];
      for (const pl of plans) for (const turn of turnAt(i) ? [0, 1, -1] : [0]) next.push([...pl, turn]);
      plans = next;
    }
    let fallback = null;
    for (const id of order) {
      for (const pl of plans) {
        // 1. at its usual speed: where does this way end in a wall?
        const look = this.arena.copy();
        const lr = look.riders[id];
        let cells = 0, end = null;
        for (let i = 0; i < steps + 4 && !end; i++) {
          const d = (lr.d + (i < steps ? pl[i] : 0) + 4) % 4;
          const crashed = look.step(beatAt(Math.min(i, steps - 1)), new Map([[id, { d, stride: LC_STRIDE }]]));
          const mine = crashed.find((c) => c.id === id);
          if (crashed.some((c) => c.id !== id)) break;
          if (mine) end = mine; else cells += LC_STRIDE;
          if (mine) cells += mine.sub;
        }
        if (!end || cells < steps || cells > steps * 3) continue;
        // 2. spread those cells over the sixteenths left: a cell more or less here and there
        const strides = new Array(steps).fill(Math.floor(cells / steps));
        for (let k = 0; k < cells - strides[0] * steps; k++) strides[steps - 1 - Math.floor(k * steps / Math.max(1, cells - strides[0] * steps))]++;
        if (strides.some((x) => x < 1 || x > 3)) continue;
        // 3. play it once more, at that speed: it must hit on the moment and nobody else go down
        const trial = this.arena.copy();
        const r = trial.riders[id];
        const moves = new Map();
        let ok = true, into = null;
        for (let i = 0; i < steps && ok; i++) {
          const d = (r.d + pl[i] + 4) % 4;
          moves.set(times[i], { d, stride: strides[i] });
          const crashed = trial.step(beatAt(i), new Map([[id, { d, stride: strides[i] }]]));
          const mine = crashed.find((c) => c.id === id);
          const last = i === steps - 1;
          if (!!mine !== last || (mine && mine.sub !== strides[i])) ok = false;
          if (crashed.some((c) => c.id !== id)) ok = false;
          if (mine) into = mine.into;
        }
        if (!ok) continue;
        if (into >= 0) { this.doom = { id, moves, at }; return; }      // into another rider: the best end
        if (!fallback) fallback = { id, moves, at };
      }
    }
    if (fallback) this.doom = fallback;
  }

  plan() {
    const t = this.next(this.clock);
    if (this.round.end <= t) {
      this.newRound(this.round.next);
      this.clock = this.round.t;
      return;
    }
    if (!this.doom) this.planDoom(this.clock);
    const forced = new Map();
    if (this.doom && this.doom.moves.has(t)) forced.set(this.doom.id, this.doom.moves.get(t));
    const crashed = this.arena.step(this.isBeat(this.clock), forced);
    if (this.doom && t >= this.doom.at) this.doom = null;
    const dt = t - this.clock;
    this.arena.riders.forEach((r) => {
      const tr = this.round.trails[r.id];
      if (tr.dead < Infinity) return;
      const prev = tr.log[tr.log.length - 1];
      const c = crashed.find((x) => x.id === r.id);
      if (c) {
        // it gets as far as the face of the wall it hits
        const tc = this.clock + dt * c.sub / c.stride;
        tr.dead = tc;
        tr.into = c.into;
        const fx = prev.x + LC_DIRS[r.d][0] * (c.sub - 0.5), fy = prev.y + LC_DIRS[r.d][1] * (c.sub - 0.5);
        tr.hit = [lcX(fx), lcY(fy)];
        tr.log.push({ t: tc, x: fx, y: fy, n: prev.n + c.sub - 0.5 });
        return;
      }
      tr.log.push({ t, x: r.x, y: r.y, n: prev.n + Math.abs(r.x - prev.x) + Math.abs(r.y - prev.y) });
      if (tr.log.length > 2) {
        const pp = tr.log[tr.log.length - 3];
        if (Math.sign(prev.x - pp.x) !== Math.sign(r.x - prev.x) || Math.sign(prev.y - pp.y) !== Math.sign(r.y - prev.y)) tr.turns.push(prev);
      }
    });
    const left = this.arena.riders.filter((r) => r.alive);
    if (left.length <= 1 && this.round.end === Infinity) {
      // the last one riding wins; a new round on a bar line
      this.round.winner = left.length ? left[0].id : -1;
      this.round.won = t;
      this.round.end = t + this.grid.barSec * 1.5;
      this.round.next = Math.ceil(this.round.end / this.grid.barSec - 1e-6) * this.grid.barSec;
    }
    this.clock = t;
  }

  forget(t) {
    while (this.rounds.length > 1 && this.rounds[1].t < t) this.rounds.shift();
    this.kept = this.rounds[0].t;
    for (const r of this.rounds) {
      for (const tr of r.trails) {
        if (tr.log.length > 64) tr.log.splice(0, tr.log.length - 64);
        while (tr.turns.length > 40) tr.turns.shift();
      }
    }
  }

  uniforms(t) {
    this.advanceTo(t);
    let round = this.rounds[0];
    for (const r of this.rounds) if (r.t <= t) round = r;
    const segs = new Float32Array(LC_SEGS * 4).fill(0);
    const riders = new Float32Array(16), booms = new Float32Array(16);
    let n = 0;
    round.trails.forEach((tr, id) => {
      // where the head is now, gliding between steps, and how far it has come
      const log = tr.log;
      let i = log.length - 1;
      while (i > 0 && log[i].t > t) i--;
      const a = log[i], b = log[Math.min(i + 1, log.length - 1)];
      const f = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
      const hx = a.x + (b.x - a.x) * f, hy = a.y + (b.y - a.y) * f, hn = a.n + (b.n - a.n) * f;
      const dead = tr.dead <= t;
      riders.set([lcX(hx), lcY(hy), dead ? 0 : 1, dead ? t - tr.dead : -1], id * 4);
      booms.set(dead && tr.hit ? [tr.hit[0], tr.hit[1], t - tr.dead, tr.into === undefined ? -1 : tr.into] : [0, 0, 99, -1], id * 4);
      if (dead && t - tr.dead > 1.2) return;
      // the wall: from its tail, LC_TRAIL cells back, through the corners to the head
      const tailN = hn - LC_TRAIL;
      const corners = tr.turns.filter((c) => c.t <= t);
      const pts = [];
      for (let k = 0; k < corners.length; k++) {
        const c = corners[k], nx = k + 1 < corners.length ? corners[k + 1] : { x: hx, y: hy, n: hn };
        if (nx.n <= tailN) continue;
        if (c.n < tailN) {
          const u = (tailN - c.n) / (nx.n - c.n);
          pts.push([c.x + (nx.x - c.x) * u, c.y + (nx.y - c.y) * u]);
        } else pts.push([c.x, c.y]);
      }
      pts.push([hx, hy]);
      // newest first, so the shader can thin the wall towards its tail
      for (let k = pts.length - 1, age = 0; k > 0 && n < LC_SEGS; k--, n++, age++) {
        segs.set([lcX(pts[k][0]) + 4 * id, lcY(pts[k][1]) + 2 * Math.min(age, 9), lcX(pts[k - 1][0]), lcY(pts[k - 1][1])], n * 4);
      }
    });
    for (; n < LC_SEGS; n++) segs.set([-9, 0, 0, 0], n * 4);
    return {
      uSegs: { v: segs, kind: '4fv' },
      uRiders: { v: riders, kind: '4fv' },
      uCrash: { v: booms, kind: '4fv' },
      uRound: { v: [t - round.t, round.winner, round.won !== undefined && round.won <= t ? t - round.won : -1, 0], kind: '4f' },
    };
  }
}

/** Which scenes run on a simulation. */
// ---------------------------------------------------------------------------
// The 3D pipes: pipes growing cell by cell through a deep grid in space, never
// into a cell another pipe holds, as the screensaver did. Each pipe decides its
// next cell a step ahead and holds it, so the growing tip always heads where the
// pipe really goes and a bend lands exactly where the tip was. Three grow at
// once, a cell a sixteenth note; a pipe lives a few bars and a new one starts on
// the beat, the first ones at the back of the grid and the later ones nearer, so
// the tangle fills the screen from the distance forwards. Sixteen bars a tangle:
// it saturates, holds, and dissolves in the last bar. The camera is chosen anew
// for each tangle, always from above, and the runs reach the shader already
// projected onto the screen.
// ---------------------------------------------------------------------------

export const PIPE_SEG_MAX = 192;
const PG = [17, 11, 17];                     // the grid: x, y, z cells
const PDIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const PIPE_CYCLE = 256;                      // sixteen bars of sixteenths
const PIPE_GROW = 208;                       // new pipes start through the first thirteen
const PIPE_FL = 1.9;                         // the lens, as the shader's

export class PipesSim extends TickSim {
  constructor(seed, spb) { super(seed, spb, 4); }      // a cell a sixteenth note

  reset() {
    this.rng = new Rng(this.seed, 'pipes-sim');
    this.tick = 0;
    this.frac = 0;
    this.cycleStart = 0;
    this.cycle = 0;
    this.clear();
  }

  clear() {
    this.grid = new Uint8Array(PG[0] * PG[1] * PG[2]);
    this.segs = [];            // { a: [x,y,z], b: [x,y,z], color, joint: 0 none, 1 elbow, 2 ball }
    this.pipes = [];           // the growing ones: { at, dir, next, seg, color, left }
    this.colors = this.rng.int(0, 5);
    // a new view for each tangle, always from above and at an angle
    this.view = { yaw: this.rng.float(-0.55, 0.55), pitch: this.rng.float(0.38, 0.68) };
  }

  idx(c) { return (c[2] * PG[1] + c[1]) * PG[0] + c[0]; }
  inside(c) { return c[0] >= 0 && c[1] >= 0 && c[2] >= 0 && c[0] < PG[0] && c[1] < PG[1] && c[2] < PG[2]; }
  free(c) { return this.inside(c) && !this.grid[this.idx(c)]; }
  add(c, d) { return [c[0] + d[0], c[1] + d[1], c[2] + d[2]]; }

  /** A new pipe with a ball at its start; q, how far into the growing, sets how near it starts. */
  spawn(q) {
    if (this.segs.length >= PIPE_SEG_MAX - 4) return;
    const zc = Math.round((1 - q) * (PG[2] - 1));          // the far side first, then nearer
    for (let tries = 0; tries < 40; tries++) {
      const z = Math.min(PG[2] - 1, Math.max(0, zc + this.rng.int(-2, 2)));
      const at = [this.rng.int(0, PG[0] - 1), this.rng.int(0, PG[1] - 1), z];
      if (!this.free(at)) continue;
      if (!PDIRS.some((d) => this.free(this.add(at, d)))) continue;
      this.grid[this.idx(at)] = 1;
      const seg = { a: at.slice(), b: at.slice(), color: this.colors++ % 6, joint: 2 };
      this.segs.push(seg);
      const p = { at, dir: null, next: null, seg, color: seg.color, left: this.rng.int(20, 40) };
      this.plan(p, this.tick);
      if (p.next) this.pipes.push(p);
      return;
    }
  }

  /** Decide and hold the cell the pipe moves into on the next tick; a turn starts its new run now. */
  plan(p, T) {
    p.next = null;
    const d = p.dir;
    let dir = d && this.free(this.add(p.at, d)) ? d : null;
    // turns land on the eighth notes
    if (!dir || ((T + 1) % 2 === 0 && this.rng.bool(0.33))) {
      const turns = this.rng.shuffle(PDIRS).filter((n) => (!d || n[0] * d[0] + n[1] * d[1] + n[2] * d[2] === 0)
        && this.free(this.add(p.at, n)));
      if (turns.length) dir = turns[0];
    }
    if (!dir) return;                                       // boxed in: this pipe is done
    if (d && dir !== d) {
      if (this.segs.length >= PIPE_SEG_MAX) return;
      p.seg = { a: p.at.slice(), b: p.at.slice(), color: p.color, joint: this.rng.bool(1 / 3) ? 2 : 1 };
      this.segs.push(p.seg);
    }
    p.next = dir;
    this.grid[this.idx(this.add(p.at, dir))] = 1;
  }

  step() {
    const T = this.tick;
    if (T > 0 && T % PIPE_CYCLE === 0) { this.cycle++; this.clear(); this.cycleStart = T; }
    const local = T - this.cycleStart;
    for (const p of this.pipes) {
      p.at = this.add(p.at, p.next);
      p.dir = p.next;
      p.seg.b = p.at.slice();
      p.next = null;
      if (--p.left > 0) this.plan(p, T);
    }
    this.pipes = this.pipes.filter((p) => p.next);
    // a new pipe on the beat while there is room
    if (local < PIPE_GROW && local % 4 === 0 && this.pipes.length < 3) this.spawn(local / PIPE_GROW);
  }

  /** Where a grid point lands on the screen, and how deep. */
  camera(t) {
    const yaw = this.view.yaw + 0.06 * Math.sin(t * 0.05), pitch = this.view.pitch, dist = 23;
    const eye = [dist * Math.sin(yaw) * Math.cos(pitch), dist * Math.sin(pitch), -dist * Math.cos(yaw) * Math.cos(pitch)];
    const fw = eye.map((v) => -v / dist);
    const rl = Math.hypot(fw[2], fw[0]);
    const rt = [fw[2] / rl, 0, -fw[0] / rl];                // up x forward
    const up = [fw[1] * rt[2] - fw[2] * rt[1], fw[2] * rt[0] - fw[0] * rt[2], fw[0] * rt[1] - fw[1] * rt[0]];
    return (c) => {
      const w = [c[0] - (PG[0] - 1) / 2 - eye[0], c[1] - (PG[1] - 1) / 2 - eye[1], c[2] - (PG[2] - 1) / 2 - eye[2]];
      const z = w[0] * fw[0] + w[1] * fw[1] + w[2] * fw[2];
      return [(w[0] * rt[0] + w[1] * rt[1] + w[2] * rt[2]) / z * PIPE_FL, (w[0] * up[0] + w[1] * up[1] + w[2] * up[2]) / z * PIPE_FL, z];
    };
  }

  uniforms(t) {
    this.advanceTo(t);
    const A = new Float32Array(PIPE_SEG_MAX * 4), B = new Float32Array(PIPE_SEG_MAX * 4);
    const proj = this.camera(t);
    // the tips grow through the tick towards the cell already held for them
    const heads = new Map(this.pipes.map((p) => [p.seg, p]));
    this.segs.forEach((s, i) => {
      const p = heads.get(s);
      const b = p ? [s.b[0] + p.next[0] * this.frac, s.b[1] + p.next[1] * this.frac, s.b[2] + p.next[2] * this.frac] : s.b;
      A.set([...proj(s.a), s.color], i * 4);
      B.set([...proj(b), s.joint], i * 4);
    });
    const into = (this.tick - this.cycleStart + this.frac) / PIPE_CYCLE;
    return {
      uPipeA: { v: A, kind: '4fv' },
      uPipeB: { v: B, kind: '4fv' },
      uPipeInfo: { v: [this.segs.length, into, this.cycle, 0], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The cube pyramid, played: the hopper turns the tops one by one, hopping a
// cube a beat and landing on the beat, while the arcade's enemies come down
// on the off-beats - red balls dropping onto the second row and bouncing down
// at random until they fall off the bottom; a purple egg that bounces to the
// bottom, hatches into the coiled snake and chases. A red ball or the snake on
// the hopper's cube is a hit: it stops and swears in a balloon, the board is
// cleared, and it goes on from where it stood. Beside the third row a disc on
// each side: with the snake close behind, the hopper jumps onto one, rides it
// to the top, and the snake, following, falls to its end. All tops turned:
// the round is won, the pyramid falls away and builds itself anew.
// ---------------------------------------------------------------------------

export const PYR_ENEMIES = 3;
const PYR_BUILD = 8, PYR_GLORY = 6, PYR_FALL = 2, PYR_HIT = 4, PYR_RIDE = 4;   // in eighth notes
const PYR_DISC_ROW = 3;
const PYR_MOVES = [[1, 0], [1, 1], [-1, -1], [-1, 0]];      // down-left, down-right, up-left, up-right
const pyrIdx = (r, c) => r * (r + 1) / 2 + c;
const pyrIn = (r, c) => r >= 0 && r <= 6 && c >= 0 && c <= r;
const pyrDist = (a, b) => Math.hypot((b[1] - b[0] / 2) - (a[1] - a[0] / 2), (b[0] - a[0]) * 0.75);

export class PyramidSim extends TickSim {
  constructor(seed, spb) { super(seed, spb, 2); }      // eighth notes: the hopper on the beats, the enemies between

  reset() {
    this.rng = new Rng(this.seed, 'pyramid-sim');
    this.tick = 0;
    this.frac = 0;
    this.round = -1;
    this.score = 0;
    this.newRound(0);
  }

  newRound(B) {
    this.round++;
    this.phase = 0;                              // 0 build, 1 play, 2 glory, 3 fall
    this.phaseStart = B;
    this.tops = new Uint8Array(28);
    this.enemies = [];
    this.discs = [1, 1];
    this.hop = { cur: [0, 0], next: [0, 0], dec: B, mode: 0, modeStart: B };   // mode 0 hop, 1 hit, 2 ride
    this.nextBall = B + PYR_BUILD + 5;
    this.nextEgg = B + PYR_BUILD + 21;
  }

  turn(r, c) {
    const k = pyrIdx(r, c);
    if (!this.tops[k]) { this.tops[k] = 1; this.score += 25; }
  }

  /** Where the hopper goes next: tops still to turn, away from the enemies, a disc when the snake is close. */
  decide(B) {
    const h = this.hop, [r, c] = h.cur;
    const coily = this.enemies.find((e) => e.look === 3 && !e.falling);
    const blind = this.rng.bool(0.07);            // now and then it does not see a ball coming
    // with the snake out, it keeps near a disc, to lure the snake off the edge
    const launches = [[PYR_DISC_ROW + 1, 0], [PYR_DISC_ROW + 1, PYR_DISC_ROW + 1]].filter((q, i) => this.discs[i]);
    const todo = [];
    for (let rr = 0; rr <= 6; rr++) for (let cc = 0; cc <= rr; cc++) if (!this.tops[pyrIdx(rr, cc)]) todo.push([rr, cc]);
    let best = null, bestS = -1e9;
    for (const [dr, dc] of PYR_MOVES) {
      const t = [r + dr, c + dc];
      let s = this.rng.float(0, 1.5);
      if (!pyrIn(t[0], t[1])) {
        // off the edge: only onto a disc, and only with the snake close behind
        const side = t[1] < 0 ? 0 : t[1] > t[0] ? 1 : -1;
        if (side < 0 || t[0] !== PYR_DISC_ROW || !this.discs[side]) continue;
        s += coily && pyrDist(coily.cur, h.cur) <= 1.6 ? 40 : -100;
      } else {
        if (!this.tops[pyrIdx(t[0], t[1])]) s += 4;
        if (todo.length) s -= 0.6 * Math.min(...todo.map((q) => pyrDist(q, t)));
        if (coily && !coily.hatch && launches.length) s -= 0.9 * Math.min(...launches.map((q) => pyrDist(q, t)));
        for (const e of this.enemies) {
          if (e.falling || (blind && e.look === 1)) continue;
          if (e.cur.join() === t.join() || e.next.join() === t.join()) s -= 60;
          if (e.look === 3 && pyrDist(e.next, t) < 1.6) s -= 25;
        }
      }
      if (s > bestS) { bestS = s; best = t; }
    }
    h.next = best || h.cur.slice();
    h.dec = B;
  }

  /** An enemy's next cube: the balls and the egg bounce down at random; the snake chases. */
  aim(e) {
    const [r, c] = e.cur;
    if (e.look !== 3) { e.next = [r + 1, c + this.rng.int(0, 1)]; if (r >= 6) e.falling = true; return; }   // off the bottom it falls
    if (e.hatch > 0) { e.next = e.cur.slice(); return; }
    const goal = this.hop.mode === 2 ? this.hop.launch : this.hop.next;
    let best = e.cur, bd = 1e9;
    for (const [dr, dc] of PYR_MOVES) {
      const t = [r + dr, c + dc];
      if (!pyrIn(t[0], t[1])) continue;
      const d = pyrDist(t, goal) + this.rng.float(0, 0.2);
      if (d < bd) { bd = d; best = t; }
    }
    e.next = best;
  }

  step() {
    const B = this.tick + 1;                     // this step is the boundary entering eighth note B
    const h = this.hop;
    const beat = B % 2 === 0;
    if (this.phase === 0) {
      if (B - this.phaseStart >= PYR_BUILD) { this.phase = 1; this.phaseStart = B; h.cur = [0, 0]; this.turn(0, 0); this.decide(B); }
      return;
    }
    if (this.phase === 2) { if (B - this.phaseStart >= PYR_GLORY) { this.phase = 3; this.phaseStart = B; } return; }
    if (this.phase === 3) { if (B - this.phaseStart >= PYR_FALL) this.newRound(B); return; }

    // --- play -------------------------------------------------------------
    if (h.mode === 1) {
      // hit: everything stands still while it swears; then the board is cleared and it goes on
      if (beat && B - h.modeStart >= PYR_HIT) {
        h.mode = 0; this.enemies = [];
        this.nextBall = B + 5; this.nextEgg = Math.max(this.nextEgg, B + 13);
        this.decide(B);
      }
      return;
    }
    if (beat) {
      if (h.mode === 2) {
        // riding the disc to the top
        if (B - h.modeStart >= PYR_RIDE) {
          h.mode = 0; h.cur = [0, 0]; this.turn(0, 0);
          this.enemies = this.enemies.filter((e) => e.falling);
          this.nextBall = B + 5; this.nextEgg = B + 21;
          this.decide(B);
        }
      } else {
        h.cur = h.next.slice();
        if (!pyrIn(h.cur[0], h.cur[1])) {
          // onto a disc: off it goes to the top, and the snake, if close, jumps after it
          const side = h.cur[1] < 0 ? 0 : 1;
          this.discs[side] = 0;
          h.launch = [h.cur[0] + 1, side ? h.cur[0] + 1 : 0];
          h.mode = 2; h.modeStart = B; h.next = [0, 0]; h.dec = B;
        } else {
          this.turn(h.cur[0], h.cur[1]);
          if (this.tops.every((v) => v)) { this.phase = 2; this.phaseStart = B; this.enemies = []; h.next = h.cur.slice(); return; }
          this.decide(B);
        }
      }
    } else {
      // the enemies land between the beats, and pick their next cube
      for (const e of this.enemies) {
        e.cur = e.next.slice();
        e.dec = B;
        if (e.falling || e.cur[0] > 6) { e.gone = (e.gone || 0) + 1; e.falling = true; e.next = [e.cur[0] + 3, e.cur[1]]; continue; }
        if (e.look === 2 && e.cur[0] === 6) { e.look = 3; e.hatch = 2; }
        else if (e.hatch > 0) e.hatch--;
        if (e.look === 3 && h.mode === 2 && pyrDist(e.cur, h.launch) <= 1.6) {
          // it follows the hopper off the edge, and falls
          e.next = [h.launch[0] - 1, h.launch[1] === 0 ? -1 : h.launch[0]];
          e.falling = true; this.score += 500;
          continue;
        }
        this.aim(e);
      }
      this.enemies = this.enemies.filter((e) => (e.gone || 0) < 2);
      // new ones drop in from above onto the second row
      if (h.mode === 0) {
        if (B >= this.nextBall && this.enemies.filter((e) => e.look === 1).length < 2 && this.enemies.length < PYR_ENEMIES) {
          this.spawn(1); this.nextBall = B + 15;
        } else if (B >= this.nextEgg && !this.enemies.some((e) => e.look >= 2) && this.enemies.length < PYR_ENEMIES) {
          this.spawn(2); this.nextEgg = B + 47;
        }
      }
    }
    // a ball or the snake on the hopper's cube: a hit
    if (h.mode === 0) {
      for (const e of this.enemies) {
        if (!e.falling && e.dropped && e.cur[0] === h.cur[0] && e.cur[1] === h.cur[1]) {
          h.mode = 1; h.modeStart = B; h.next = h.cur.slice(); h.dec = B;
          break;
        }
      }
    }
    for (const e of this.enemies) e.dropped = true;
  }

  spawn(look) {
    const c = this.rng.int(0, 1);
    this.enemies.push({ look, cur: [-2, c - 1.5], next: [1, c], dec: this.tick + 1, hatch: 0, falling: false });
  }

  uniforms(t) {
    this.advanceTo(t);
    const T = this.tick + this.frac;
    const h = this.hop;
    const hf = h.mode === 2 ? (T - h.modeStart) / PYR_RIDE : h.mode === 1 ? (T - h.modeStart) / 2 : Math.min(1, (T - h.dec) / 2);
    const E = new Float32Array(PYR_ENEMIES * 4), K = new Float32Array(PYR_ENEMIES * 4);
    this.enemies.slice(0, PYR_ENEMIES).forEach((e, i) => {
      E.set([e.cur[0], e.cur[1], e.next[0], e.next[1]], i * 4);
      const ef = h.mode === 1 ? 0 : Math.min(1, (T - e.dec) / 2);
      K.set([e.look, ef, e.falling ? 1 : 0, e.hatch || 0], i * 4);
    });
    let lo = 0, hi = 0;
    for (let k = 0; k < 28; k++) if (this.tops[k]) { if (k < 10) lo += 2 ** k; else hi += 2 ** (k - 10); }
    return {
      uPyrHop: { v: [h.cur[0], h.cur[1], h.next[0], h.next[1]], kind: '4f' },
      uPyrHop2: { v: [hf, h.mode, h.launch ? h.launch[1] === 0 ? 0 : 1 : 0, 0], kind: '4f' },
      uPyrTops: { v: [lo, hi, this.phase, (T - this.phaseStart) / 2], kind: '4f' },
      uPyrE: { v: E, kind: '4fv' },
      uPyrK: { v: K, kind: '4fv' },
      uPyrInfo: { v: [this.score, this.discs[0], this.discs[1], this.round], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// Unlimited bobs: the moving point runs on the music's own clock - it surges
// ahead on the kick and on the pitched hits (the stabs, the lead, the
// arpeggio) and glides between them - so the chain keeps time with the track.
// The clock is the music's feature tracks, summed once. The balls sit at even
// steps back along the figure from the head - so a surge never opens a gap in
// the chain, it slides the whole chain on faster - and each one's age is how
// long ago the point passed there.
// ---------------------------------------------------------------------------

export const BOB_BALLS = 128;
const BOB_GLIDE = 0.55;                      // the pace between hits, in figure beats a beat
const BOB_STEP = 0.2;                        // from one ball to the next, in figure beats

export class BobsSim {
  constructor(seed, spb, meta, features) {
    this.spb = spb;
    this.clock = null;
    if (!features) return;
    const tr = features.tracks;
    this.clock = new Float32Array(features.n + 1);
    for (let i = 0; i < features.n; i++) {
      const pitched = Math.max(tr.stab[i], 0.8 * tr.lead[i], 0.6 * tr.arp[i]);
      const pace = BOB_GLIDE + 2.2 * tr.kick[i] + 1.4 * pitched;
      this.clock[i + 1] = this.clock[i] + pace / FEATURE_RATE / spb;
    }
  }

  /** Where the point is on its figure at t seconds, in figure beats. */
  at(t) {
    if (!this.clock) return t / this.spb;
    const x = Math.max(0, t * FEATURE_RATE), i = Math.floor(x), n = this.clock.length - 1;
    if (i >= n) return this.clock[n] + (x - n) * BOB_GLIDE / FEATURE_RATE / this.spb;
    return this.clock[i] + (this.clock[i + 1] - this.clock[i]) * (x - i);
  }

  /** When the point passed u: the clock run backwards. */
  when(u) {
    if (!this.clock) return u * this.spb;
    const c = this.clock, n = c.length - 1;
    if (u >= c[n]) return (n + (u - c[n]) / (BOB_GLIDE / FEATURE_RATE / this.spb)) / FEATURE_RATE;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c[mid] <= u) lo = mid; else hi = mid; }
    return (lo + (u - c[lo]) / Math.max(c[hi] - c[lo], 1e-9)) / FEATURE_RATE;
  }

  uniforms(t) {
    const u = new Float32Array(BOB_BALLS), age = new Float32Array(BOB_BALLS);
    const head = this.at(t);
    for (let j = 0; j < BOB_BALLS; j++) {
      u[j] = head - j * BOB_STEP;
      age[j] = u[j] < 0 ? 1e3 : (t - this.when(u[j])) / this.spb;     // in beats; not drawn yet: none
    }
    return { uBobU: { v: u, kind: '1fv' }, uBobAge: { v: age, kind: '1fv' } };
  }
}

// ---------------------------------------------------------------------------
// The chessboard floor's cube: its spin runs on the music, smoothed - it speeds
// up as the rhythm gets busy and slows as it thins, never with a jolt - and
// each hop's height is set as it takes off, from the music's smoothed energy,
// so nothing about the cube twitches from frame to frame. The board's swell
// follows the smoothed bass.
// ---------------------------------------------------------------------------

export class ChessfloorSim {
  constructor(seed, spb, meta, features) {
    this.spb = spb;
    this.f = null;
    if (!features) return;
    const tr = features.tracks, n = features.n;
    const k = 1 - Math.exp(-1 / (0.7 * FEATURE_RATE));      // a one-pole smoothing, about 0.7 s
    this.spin = new Float32Array(n + 1);
    this.energy = new Float32Array(n);
    this.bass = new Float32Array(n);
    let pace = 0.6, en = 0, ba = 0;
    for (let i = 0; i < n; i++) {
      const busy = 0.35 + 1.6 * tr.kick[i] + 0.9 * tr.snare[i] + 0.6 * tr.hat[i] + 0.8 * tr.stab[i];
      pace += (busy - pace) * k;
      this.spin[i + 1] = this.spin[i] + pace / FEATURE_RATE;
      const e = Math.min(1, tr.kick[i] * 0.55 + tr.snare[i] * 0.4 + tr.bass[i] * 0.35 + tr.lead[i] * 0.3 + tr.arp[i] * 0.25 + tr.pad[i] * 0.5);
      en += (e - en) * k; ba += (tr.bass[i] - ba) * k;
      this.energy[i] = en; this.bass[i] = ba;
    }
    this.f = features;
  }

  sample(arr, t) {
    const x = Math.max(0, t * FEATURE_RATE), i = Math.min(arr.length - 1, Math.floor(x));
    return arr[i];
  }

  uniforms(t) {
    if (!this.f) return { uCube: { v: [t * 0.6, t * 0.37, 0.4, 0.3], kind: '4f' } };
    const spin = this.sample(this.spin, t);
    const takeoff = Math.floor(t / this.spb) * this.spb;            // this hop's height is set as it leaves
    return { uCube: { v: [spin, spin * 0.62, this.sample(this.energy, takeoff), this.sample(this.bass, t)], kind: '4f' } };
  }
}

// ---------------------------------------------------------------------------
// The rubber vector: the cube's turn, driven by the music - each kick gives
// the spin a shove that dies away, the snare tips it on a spring - and the
// last stretch of that turn handed to the shader, so each line of the screen
// can show the cube as it was a moment before: the lower the line, the
// longer ago, as the demos did with copies of the cube.
// ---------------------------------------------------------------------------

export const RUBBER_SAMPLES = 64;
export const RUBBER_SPAN = 0.6;              // seconds of the turn the lines reach back over

export class RubberSim {
  constructor(seed, spb, meta, features) {
    this.spb = spb;
    this.ay = null;
    if (!features) return;
    const tr = features.tracks, n = features.n, dt = 1 / FEATURE_RATE;
    this.ay = new Float32Array(n + 1);
    this.ax = new Float32Array(n + 1);
    let w = 0.9, tilt = 0, tv = 0, prevKick = 0, prevSnare = 0;
    for (let i = 0; i < n; i++) {
      const kick = tr.kick[i], snare = tr.snare[i];
      w += (0.9 - w) * 2.2 * dt + Math.max(0, kick - prevKick) * 3.2;     // a shove on each kick, dying away
      tv += (-tilt * 30 - tv * 4) * dt + Math.max(0, snare - prevSnare) * 2.4;  // the snare tips it on a spring
      tilt += tv * dt;
      prevKick = kick; prevSnare = snare;
      this.ay[i + 1] = this.ay[i] + w * dt;
      this.ax[i + 1] = 0.45 + tilt;
    }
  }

  at(arr, t) {
    const x = Math.max(0, t * FEATURE_RATE), i = Math.min(arr.length - 2, Math.floor(x)), f = Math.min(1, x - i);
    return arr[i] + (arr[i + 1] - arr[i]) * f;
  }

  uniforms(t) {
    const v = new Float32Array(RUBBER_SAMPLES * 4);
    for (let i = 0; i < RUBBER_SAMPLES; i++) {
      const s = Math.max(0, t - i * RUBBER_SPAN / (RUBBER_SAMPLES - 1));
      if (this.ay) v.set([this.at(this.ay, s), this.at(this.ax, s), 0, 0], i * 4);
      else v.set([s * 0.9, 0.45, 0, 0], i * 4);
    }
    return { uRub: { v, kind: '4fv' } };
  }
}

// ---------------------------------------------------------------------------
// The cracktro: its intro's texts - what this is, and the thanks - in a 5x7
// bitmap font as the intros' own, handed to the shader as bits; and its flight
// through the stars, steered by the music.
// ---------------------------------------------------------------------------

const CRACK_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!.,-+:'?/";
const CRACK_FONT = [
  '.....|.....|.....|.....|.....|.....|.....',          // space
  '.###.|#...#|#...#|#####|#...#|#...#|#...#', '####.|#...#|#...#|####.|#...#|#...#|####.',
  '.###.|#...#|#....|#....|#....|#...#|.###.', '####.|#...#|#...#|#...#|#...#|#...#|####.',
  '#####|#....|#....|####.|#....|#....|#####', '#####|#....|#....|####.|#....|#....|#....',
  '.###.|#...#|#....|#.###|#...#|#...#|.####', '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  '.###.|..#..|..#..|..#..|..#..|..#..|.###.', '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', '#....|#....|#....|#....|#....|#....|#####',
  '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  '.###.|#...#|#...#|#...#|#...#|#...#|.###.', '####.|#...#|#...#|####.|#....|#....|#....',
  '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  '.####|#....|#....|.###.|....#|....#|####.', '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  '#...#|#...#|#...#|#...#|#...#|#...#|.###.', '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', '#####|....#|...#.|..#..|.#...|#....|#####',
  '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  '.###.|#...#|....#|...#.|..#..|.#...|#####', '####.|....#|....#|.###.|....#|....#|####.',
  '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', '#####|#....|####.|....#|....#|#...#|.###.',
  '..##.|.#...|#....|####.|#...#|#...#|.###.', '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '.###.|#...#|#...#|.###.|#...#|#...#|.###.', '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '..#..|..#..|..#..|..#..|..#..|.....|..#..', '.....|.....|.....|.....|.....|.##..|.##..',
  '.....|.....|.....|.....|.##..|..#..|.#...', '.....|.....|.....|.###.|.....|.....|.....',
  '.....|..#..|..#..|#####|..#..|..#..|.....', '.....|.##..|.##..|.....|.##..|.##..|.....',
  "..#..|..#..|.#...|.....|.....|.....|.....", '.###.|#...#|....#|...#.|..#..|.....|..#..',
  '....#|...#.|...#.|..#..|.#...|.#...|#....',
];
const crackCode = (ch) => Math.max(0, CRACK_CHARS.indexOf(ch));
export const CRACK_LINE = 24;              // characters a line of a page

/**
 * The code rain's words: what the rain reveals besides a face - the seed itself and the project's name - in
 * the crack intros' 5x7 font. Nothing moves here; the scene reads the letters and the font.
 */
export class CoderainSim {
  constructor(seed) {
    const clean = [...String(seed).toUpperCase()].filter((ch) => CRACK_CHARS.includes(ch)).join('').trim().slice(0, 12);
    const words = [clean || 'SEED', 'SEEDSCENE'];
    this.words = new Float32Array(24);
    words.forEach((w, j) => [...w].forEach((ch, i) => { this.words[j * 12 + i] = crackCode(ch); }));
    this.lens = [words[0].length, words[1].length, 0, 0];
    this.font = new Float32Array(48 * 2);
    CRACK_FONT.forEach((g, i) => {
      let lo = 0, hi = 0;
      g.split('|').forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== '#') return;
        if (y < 4) lo += 2 ** (y * 5 + x); else hi += 2 ** ((y - 4) * 5 + x);
      }));
      this.font[i * 2] = lo; this.font[i * 2 + 1] = hi;
    });
  }

  uniforms() {
    return {
      uFont: { v: this.font, kind: '4fv' },
      uWords: { v: this.words, kind: '4fv' },
      uWordLen: { v: this.lens, kind: '4f' },
    };
  }
}

export class CracktroSim {
  constructor(seed, spb, meta, features, greets = []) {
    this.spb = spb;
    this.logo = 'SEEDSCENE';
    const music = meta && meta.musicLabel ? meta.musicLabel.toUpperCase().slice(0, CRACK_LINE) : 'A LITTLE TUNE';
    const bpm = meta && meta.bpm ? `AT ${meta.bpm} BPM` : '';
    // the intro's pages: what this is, then the thanks
    this.pages = [
      ['SEEDSCENE', 'PRESENTS', 'ONE SEED - ONE DEMO', music + (bpm && music.length + bpm.length < CRACK_LINE ? ' ' + bpm : '')],
      ['THANKS TO', '3DGIORDANO', 'AND THE SEEDSCENE', 'COMMUNITY!'],
    ];
    // and the viewer's greetings, three names a page, in the letters the font has
    const names = greets.map((n) => [...n].filter((ch) => CRACK_CHARS.includes(ch)).join('').replace(/ +/g, ' ').trim()).filter(Boolean);
    for (let i = 0; i < names.length; i += 3) this.pages.push(['GREETINGS TO', ...names.slice(i, i + 3)]);
    // the font as bits: rows 0-3 in one number, rows 4-6 in the next, two glyphs a vec4
    this.font = new Float32Array(48 * 2);
    CRACK_FONT.forEach((g, i) => {
      const rows = g.split('|');
      let lo = 0, hi = 0;
      rows.forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== '#') return;
        if (y < 4) lo += 2 ** (y * 5 + x); else hi += 2 ** ((y - 4) * 5 + x);
      }));
      this.font[i * 2] = lo; this.font[i * 2 + 1] = hi;
    });
    // the flight through the stars: every two bars a new heading - drifting left or right,
    // diving forward, pulling back, or between - eased in over a beat; faster as the music
    // builds, a surge forward on each kick
    this.cam = null;
    if (!features) return;
    const tr = features.tracks, n = features.n, dt = 1 / FEATURE_RATE;
    const HEADINGS = [[1, 0, 0.2], [-1, 0, 0.2], [0, 0, 1], [0, 0, -0.8], [0.7, 0.2, 0.7], [-0.7, -0.2, 0.7], [0.6, 0, -0.6], [-0.6, 0.15, -0.6]];
    const seg = (k) => new Rng(`${seed}/${k}`, 'cracktro-heading').pick(HEADINGS);
    this.cam = new Float32Array((n + 1) * 3);
    this.warpKind = (si) => new Rng(`${seed}/${si}`, 'cracktro-warp').pick([[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 0, 1]]);
    const k = 1 - Math.exp(-dt / 0.6);
    let pace = 0.6, push = 0, prevKick = 0, x = 0, y = 0, z = 0;
    for (let i = 0; i < n; i++) {
      const tt = i * dt, beats = tt / spb, si = Math.floor(beats / 8);
      const e = Math.min(1, tr.kick[i] * 0.55 + tr.snare[i] * 0.4 + tr.bass[i] * 0.35 + tr.lead[i] * 0.3 + tr.arp[i] * 0.25 + tr.pad[i] * 0.5);
      pace += (0.7 + 2.2 * e - pace) * k;
      push += Math.max(0, tr.kick[i] - prevKick) * 1.4; push *= Math.exp(-dt * 5);
      prevKick = tr.kick[i];
      const from = seg(si - 1), to = seg(si);
      const w = Math.min(1, (beats - si * 8) / 1.0);
      const ease = w * w * (3 - 2 * w);
      const h = from.map((v, j) => v + (to[j] - v) * ease);
      x += h[0] * pace * dt * 1.6; y += h[1] * pace * dt * 1.6;
      z += (h[2] * pace + push * Math.sign(h[2] || 1)) * dt * 3.0;
      // the warp: the last two bars of each phrase, forward or sideways, leading into the next
      const wa = this.warpAt(beats);
      if (wa > 0) {
        const wk = this.warpKind(Math.floor(beats / 32));
        x += wk[0] * wa * 14 * dt; z += wk[2] * wa * 38 * dt;
      }
      this.cam.set([x, y, z], (i + 1) * 3);
    }
  }

  /** How deep into a warp the flight is at this beat: 0 to 1. */
  warpAt(beats) {
    const local = beats - Math.floor(beats / 32) * 32 - 24;
    if (local < 0) return 0;
    const up = Math.min(1, local / 1.5), down = Math.min(1, Math.max(0, (8 - local) / 1.5));
    const e = (v) => v * v * (3 - 2 * v);
    return e(up) * e(down);
  }

  at(t) {
    if (!this.cam) return [t * 0.3, 0, t * 1.2];
    const x = Math.max(0, t * FEATURE_RATE), n = this.cam.length / 3 - 1, i = Math.min(n - 1, Math.floor(x)), f = Math.min(1, x - i);
    const c = this.cam;
    return [0, 1, 2].map((j) => c[i * 3 + j] + (c[(i + 1) * 3 + j] - c[i * 3 + j]) * f);
  }

  uniforms(t) {
    const beats = t / this.spb;
    const logo = new Float32Array(12);
    [...this.logo.slice(0, 12)].forEach((c, i) => { logo[i] = crackCode(c); });
    // the intro: a page every two bars, a line typing in on each of the first four beats
    const pi = Math.min(this.pages.length - 1, Math.floor(beats / 8));
    const page = this.pages[pi];
    const into = beats - pi * 8;
    const text = new Float32Array(4 * CRACK_LINE);
    page.forEach((line, l) => {
      const s2 = line.slice(0, CRACK_LINE);
      const pad = Math.floor((CRACK_LINE - s2.length) / 2);
      const shown = Math.floor(Math.max(0, Math.min(1, into - l)) * s2.length + 1e-6);
      for (let i = 0; i < shown; i++) text[l * CRACK_LINE + pad + i] = crackCode(s2[i]);
    });
    // it fades out over the bar after the last page
    const fade = 1 - Math.min(1, Math.max(0, (beats - this.pages.length * 8) / 4));
    const [x, y, z] = this.at(t);
    const [x2, y2, z2] = this.at(t + 0.05);
    return {
      uFont: { v: this.font, kind: '4fv' },
      uLogoText: { v: logo, kind: '4fv' },
      uPageText: { v: text, kind: '4fv' },
      uCrack: { v: [fade, Math.min(12, this.logo.length), 0, 0], kind: '4f' },
      uCam: { v: [x, y, z, 0], kind: '4f' },
      uCamV: { v: [(x2 - x) / 0.05, (y2 - y) / 0.05, (z2 - z) / 0.05, this.warpAt(beats)], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The card cascade: the card game won, its four foundations emptying one card
// at a time, each card falling and bouncing off the bottom of the table and
// leaving a copy of itself at every step, as the game drew it without ever
// clearing the screen. Planned here a phrase at a time: a card leaves a pile
// on every bar, round the four piles from the kings down, and when the music
// is busy another leaves halfway through the bar; each is thrown so it first
// lands on the beat, on the "and" or on the sixteenth between, and bounces
// livelier the busier the music. Most cards fly across a few steps at a time;
// a third crawl a step or so, and their edges pile up into black arches. Each phrase deals a new game: the table is cleared and the
// piles are full again. The shader works out every copy from these numbers.
// ---------------------------------------------------------------------------

export const CASCADE_MAX = 52;             // a deck: no phrase throws more
export const CASCADE_PHRASE = 32;          // beats between new deals
const CASCADE_STEPS = 24;                  // copies a beat
const CASCADE_G = 402;                     // gravity, in card pixels a beat squared
const CASCADE_BUSY = 0.55;                // the smoothed energy above which the off-beat throws too
const CASCADE_H0 = 332;                    // a card on its pile: its bottom this far above the floor

export class CascadeSim {
  constructor(seed, spb, meta, features) {
    this.seed = seed;
    this.spb = spb;
    this.phrases = new Map();
    // the piles: one suit each, in the seed's order (0 spades, 1 hearts, 2 clubs, 3 diamonds)
    this.suits = new Rng(seed, 'cascade-suits').shuffle([0, 1, 2, 3]);
    this.energy = null;
    this.tracks = null;
    if (!features) return;
    const tr = features.tracks, n = features.n;
    this.tracks = tr;
    const k = 1 - Math.exp(-1 / (spb * FEATURE_RATE));      // smoothed over about a beat
    this.energy = new Float32Array(n);
    let en = 0;
    for (let i = 0; i < n; i++) {
      const e = Math.min(1, tr.kick[i] * 0.55 + tr.snare[i] * 0.4 + tr.bass[i] * 0.35 + tr.lead[i] * 0.3 + tr.arp[i] * 0.25 + tr.pad[i] * 0.5);
      en += (e - en) * k;
      this.energy[i] = en;
    }
  }

  energyAt(t) {
    if (!this.energy) return 0.5;
    const i = Math.min(this.energy.length - 1, Math.max(0, Math.floor(t * FEATURE_RATE)));
    return this.energy[i];
  }

  /** How hard the kick and the snare hit at the start of a beat, and how busy the music was. */
  hitsAt(beat) {
    if (!this.tracks) return [beat % 2 === 0 ? 1 : 0, beat % 2 === 1 ? 1 : 0, 0.5];
    const tr = this.tracks, n = tr.kick.length;
    const i0 = Math.max(0, Math.floor(beat * this.spb * FEATURE_RATE));
    const i1 = Math.min(n, i0 + Math.max(1, Math.round(this.spb * FEATURE_RATE / 6)));
    let kick = 0, snare = 0;
    for (let i = i0; i < i1; i++) { kick = Math.max(kick, tr.kick[i]); snare = Math.max(snare, tr.snare[i]); }
    return [kick, snare, this.energyAt(beat * this.spb)];
  }

  /** The cards a phrase throws: when, from which pile, how. */
  phrase(pi) {
    if (this.phrases.has(pi)) return this.phrases.get(pi);
    const cards = [];
    const r = new Rng(`${this.seed}/${pi}`, 'cascade-throws');
    for (let b = 0; b < CASCADE_PHRASE / 2 && cards.length < CASCADE_MAX; b++) {
      const beat = pi * CASCADE_PHRASE + b * 2;
      const e = this.energyAt(beat * this.spb);
      if (b % 2 === 1 && e < CASCADE_BUSY) continue;      // the mid-bar card only when the music is busy
      const n = cards.length;
      const pile = n % 4, rank = 12 - Math.floor(n / 4);
      const k1 = r.pick([1, 1, 1.5, 1.5, 1.25]);        // the first landing, in beats after the throw
      const u0 = (0.5 * CASCADE_G * k1 * k1 - CASCADE_H0) / k1;
      const step = r.float() < 0.33 ? 1 + r.float() * 0.6 : 2 + r.float() * 4;   // card pixels a copy
      const speed = step * CASCADE_STEPS;
      const vx = r.float() < 0.5 ? -speed : speed;
      const rest = Math.min(0.88, 0.7 + 0.16 * e + r.float() * 0.03);
      cards.push({ t0: beat * this.spb, pile, vx, id: this.suits[pile] * 13 + rank, u0, rest, k1 });
    }
    this.phrases.set(pi, cards);
    if (this.phrases.size > 8) this.phrases.delete(this.phrases.keys().next().value);
    return cards;
  }

  uniforms(t) {
    const beats = Math.max(0, t / this.spb);
    const all = this.phrase(Math.floor(beats / CASCADE_PHRASE));
    const a = new Float32Array(CASCADE_MAX * 4), b = new Float32Array(CASCADE_MAX * 4);
    const top = [-1, -1, -1, -1];
    let n = 0;
    for (const c of all) {
      if (c.t0 > t) { if (top[c.pile] < 0) top[c.pile] = c.id; continue; }
      a.set([c.t0, c.pile, c.vx, c.id], n * 4);
      b.set([c.u0, c.rest, c.k1, 0], n * 4);
      n++;
    }
    // a pile this phrase has finished throwing from shows what the deck left on it, if anything
    for (let p = 0; p < 4; p++) {
      if (top[p] >= 0) continue;
      const thrown = all.filter((c) => c.pile === p).length;
      if (thrown < 13) top[p] = this.suits[p] * 13 + 12 - thrown;
    }
    // the hits on each beat of the phrase: the trails keep them
    const pi = Math.floor(beats / CASCADE_PHRASE), hits = new Float32Array(CASCADE_PHRASE * 4);
    for (let i = 0; i < CASCADE_PHRASE; i++) hits.set([...this.hitsAt(pi * CASCADE_PHRASE + i), 0], i * 4);
    return {
      uBeats: { v: hits, kind: '4fv' },
      uCA: { v: a, kind: '4fv' },
      uCB: { v: b, kind: '4fv' },
      uPiles: { v: top, kind: '4f' },
      uCasc: { v: [n, CASCADE_G, CASCADE_H0, pi * CASCADE_PHRASE], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The ANSI board: a bulletin board's art arriving over the modem, a line a
// beat, scrolling up as it fills the screen. Each phrase brings a part of the
// file - a spaced-out header, a picture, a line about the music and a big
// block-letter logo whose last line lands as the next phrase opens. The art is
// drawn by the shader from the seed; here are only its words, in the 5x7 font
// the cracktro uses, for the part arriving and the one above it.
// ---------------------------------------------------------------------------

export const ANSI_PHRASE = 32;             // lines a part: one a beat, a part a phrase
export const ANSI_WORD = 12;               // letters a logo
export const ANSI_LINE = 40;               // characters a line of text

export class AnsiSim {
  constructor(seed, spb, meta) {
    this.spb = spb;
    const clean = (s, n) => [...String(s).toUpperCase()].filter((ch) => CRACK_CHARS.includes(ch)).join('').slice(0, n);
    const word = clean(seed, ANSI_WORD).replace(/^ +| +$/g, '') || 'SEED';
    const music = meta && meta.musicLabel ? clean(meta.musicLabel, 24) : 'A LITTLE TUNE';
    const bpm = meta && meta.bpm ? ` AT ${meta.bpm} BPM` : '';
    const style = clean(music.split(' ')[0], 9) || 'MUSIC';
    // what each part says: the first presents the project, then the seed, the music, the project again
    this.parts = [
      { head: 'SEEDSCENE PRESENTS', info: 'ONE SEED - ONE DEMO', logo: 'SEEDSCENE' },
      { head: 'CONNECT 2400', info: `SEED: ${word}`, logo: word },
      { head: 'NOW PLAYING', info: (music + bpm).slice(0, ANSI_LINE), logo: style },
      { head: 'THANKS FOR CALLING', info: 'THANKS TO 3DGIORDANO', logo: 'SEEDSCENE' },
    ];
    this.font = new Float32Array(48 * 2);
    CRACK_FONT.forEach((g, i) => {
      let lo = 0, hi = 0;
      g.split('|').forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== '#') return;
        if (y < 4) lo += 2 ** (y * 5 + x); else hi += 2 ** ((y - 4) * 5 + x);
      }));
      this.font[i * 2] = lo; this.font[i * 2 + 1] = hi;
    });
  }

  part(si) { return si < 0 ? this.parts[3] : si < this.parts.length ? this.parts[si] : this.parts[1 + ((si - 1) % 3)]; }

  uniforms(t) {
    const si = Math.floor(Math.max(0, t / this.spb) / ANSI_PHRASE);
    // two parts: the one above (si - 1) and the one arriving (si)
    const words = new Float32Array(2 * ANSI_WORD), lines = new Float32Array(4 * ANSI_LINE), lens = [0, 0, 0, 0];
    [si - 1, si].forEach((s, j) => {
      const p = this.part(s);
      [...p.logo].forEach((ch, i) => { words[j * ANSI_WORD + i] = crackCode(ch); });
      [...p.head].forEach((ch, i) => { lines[(j * 2) * ANSI_LINE + i] = crackCode(ch); });
      [...p.info].forEach((ch, i) => { lines[(j * 2 + 1) * ANSI_LINE + i] = crackCode(ch); });
      lens[j * 2] = p.logo.length;
      lens[j * 2 + 1] = p.head.length + 100 * p.info.length;
    });
    return {
      uFont: { v: this.font, kind: '4fv' },
      uWords: { v: words, kind: '4fv' },
      uLines: { v: lines, kind: '4fv' },
      uAnsi: { v: [si, ...lens.slice(0, 3)], kind: '4f' },
      uAnsiLen: { v: [lens[3], 0, 0, 0], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The bouncing lines screensaver: two four-cornered figures whose corners fly
// in straight lines and bounce off the edges of the screen, each drawn again
// at moments just behind, so it trails a fan of echoes. The corners' paths are
// fixed by the seed; the music sets how far along them the figures are - a
// clock that runs faster as the music builds, with a shove on each kick and a
// burst as each phrase opens. The kick stretches the echoes apart like a
// spring; each snare hit moves the figures' colours on; the busier the music,
// the more echoes.
// ---------------------------------------------------------------------------

export const ECHO_MAX = 16;                // echoes a figure, at most
const ECHO_GAP = 0.045;                    // seconds between echoes
const ECHO_STEP = 0.05;                    // the least distance between echoes along the path

export class EcholinesSim {
  constructor(seed, spb, meta, features) {
    this.spb = spb;
    this.clock = null;
    if (!features) return;
    const tr = features.tracks, n = features.n, dt = 1 / FEATURE_RATE;
    const k = 1 - Math.exp(-dt / 0.8);
    this.clock = new Float32Array(n + 1);
    this.hue = new Float32Array(n + 1);
    this.energy = new Float32Array(n);
    let pace = 0.6, push = 0, prevKick = 0, prevSnare = 0, en = 0, hue = 0;
    for (let i = 0; i < n; i++) {
      const e = Math.min(1, tr.kick[i] * 0.55 + tr.snare[i] * 0.4 + tr.bass[i] * 0.35 + tr.lead[i] * 0.3 + tr.arp[i] * 0.25 + tr.pad[i] * 0.5);
      en += (e - en) * k;
      pace += (0.45 + 1.4 * en - pace) * k;
      push += Math.max(0, tr.kick[i] - prevKick) * 0.9;
      // as each phrase opens, a burst
      const beats = i * dt / spb, local = beats - Math.floor(beats / 32) * 32;
      if (local < dt / spb) push += 2.5;
      push *= Math.exp(-dt * 4);
      if (tr.snare[i] - prevSnare > 0.3) hue += 0.11;
      prevKick = tr.kick[i]; prevSnare = tr.snare[i];
      this.clock[i + 1] = this.clock[i] + (pace + push) * dt;
      this.hue[i + 1] = hue;
      this.energy[i] = en;
    }
    this.kick = tr.kick;
  }

  sample(arr, t) {
    const x = Math.max(0, t * FEATURE_RATE), i = Math.min(arr.length - 2, Math.floor(x)), f = Math.min(1, x - i);
    return arr[i] + (arr[i + 1] - arr[i]) * f;
  }

  uniforms(t) {
    const u = new Float32Array(ECHO_MAX);
    if (!this.clock) {
      for (let j = 0; j < ECHO_MAX; j++) u[j] = Math.max(0, t - j * ECHO_GAP) * 0.7;
      return { uEchoU: { v: u, kind: '4fv' }, uEcho: { v: [8, t * 0.03, 0.5 + t * 0.03, 1], kind: '4f' } };
    }
    const fi = Math.min(this.kick.length - 1, Math.max(0, Math.floor(t * FEATURE_RATE)));
    // echoes evenly apart along the path, as the screensaver drew them a frame apart; never
    // closer than a fixed step, so they stay a fan when the music is slow; the kick stretches them
    const stretch = 1 + 1.6 * this.kick[fi];
    const now = this.sample(this.clock, t);
    const du = Math.max(now - this.sample(this.clock, Math.max(0, t - ECHO_GAP)), ECHO_STEP) * stretch;
    for (let j = 0; j < ECHO_MAX; j++) u[j] = now - j * du;
    const en = this.energy[fi];
    const hue = this.sample(this.hue, t);
    return {
      uEchoU: { v: u, kind: '4fv' },
      uEcho: { v: [Math.min(ECHO_MAX, 6 + 9 * en), hue + t * 0.01, hue + 0.5 + t * 0.013, 0.85 + 0.3 * en], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The 3D maze screensaver: brick corridors walked in first person. The seed
// cuts a maze of 11 x 11 cells (walls are whole blocks, 23 x 23 of them) and
// the walk keeps a hand on the right-hand wall, so it never ends. A move every
// two beats - a step to the next cell, or a quarter turn - so the steps and the
// turns land on the first and third beats of the bar. As each phrase ends a spinning stone waits on the path ahead; the walk
// goes through it on the drop and the world turns upside down, until the next.
// ---------------------------------------------------------------------------

export const MAZE3D_CELLS = 11;
export const MAZE3D_BLOCKS = 2 * MAZE3D_CELLS + 1;    // 23: rows fit a float exactly
const MAZE3D_MOVES = 4096;                           // beats of walk planned

export class Maze3dSim {
  constructor(seed, spb) {
    this.spb = spb;
    const n = MAZE3D_CELLS, B = MAZE3D_BLOCKS;
    const r = new Rng(seed, 'maze3d');
    // carve: a depth-first walk from a random cell, the seed's own maze
    const open = new Uint8Array(B * B);
    const seen = new Uint8Array(n * n);
    const stack = [[r.int(0, n - 1), r.int(0, n - 1)]];
    seen[stack[0][1] * n + stack[0][0]] = 1;
    open[(2 * stack[0][1] + 1) * B + 2 * stack[0][0] + 1] = 1;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const next = r.shuffle(DIRS).map(([dx, dy]) => [x + dx, y + dy, dx, dy])
        .find(([nx, ny]) => nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx]);
      if (!next) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = next;
      seen[ny * n + nx] = 1;
      open[(2 * y + 1 + dy) * B + 2 * x + 1 + dx] = 1;
      open[(2 * ny + 1) * B + 2 * nx + 1] = 1;
      stack.push([nx, ny]);
    }
    const isOpen = (bx, by) => bx >= 0 && by >= 0 && bx < B && by < B && open[by * B + bx] === 1;
    this.rows = new Float32Array(24);                   // a vec4 array: padded to 24
    this.rows.set(packRows(B, B, (x, y) => !isOpen(x, y)));
    // the walk: a hand on the right-hand wall; each beat a step or a quarter turn
    // a corner is taken walking - the turn and the step in one move, as the screensaver rounded
    // them - and only a dead end is turned in place, all the way round
    let cx = 2 * r.int(0, n - 1) + 1, cy = 2 * r.int(0, n - 1) + 1, d = r.int(0, 3), turn = d;
    this.px = new Float32Array(MAZE3D_MOVES + 1);
    this.py = new Float32Array(MAZE3D_MOVES + 1);
    this.ang = new Float32Array(MAZE3D_MOVES + 1);
    const canGo = (dir) => isOpen(cx + DIRS[dir][0], cy + DIRS[dir][1]);
    for (let i = 0; i <= MAZE3D_MOVES; i++) {
      this.px[i] = cx; this.py[i] = cy; this.ang[i] = turn * Math.PI / 2;
      const right = (d + 1) % 4, left = (d + 3) % 4;
      if (canGo(right)) { d = right; turn += 1; }
      else if (canGo(d)) { /* straight on */ }
      else if (canGo(left)) { d = left; turn -= 1; }
      else { d = (d + 2) % 4; turn += 2; continue; }
      cx += 2 * DIRS[d][0]; cy += 2 * DIRS[d][1];
    }
  }

  uniforms(t) {
    const beats = Math.max(0, t / this.spb), moves = beats / 2;
    const i = Math.min(MAZE3D_MOVES - 1, Math.floor(moves)), f = moves - Math.floor(moves);
    const e = f * f * (3 - 2 * f);
    const x = this.px[i] + (this.px[i + 1] - this.px[i]) * e;
    const y = this.py[i] + (this.py[i + 1] - this.py[i]) * e;
    const a = this.ang[i] + (this.ang[i + 1] - this.ang[i]) * e;
    // the stone: on the path four beats before each drop, met on the drop
    const phrase = Math.floor(beats / 32), local = beats - phrase * 32;
    const at = Math.min(MAZE3D_MOVES, (phrase + 1) * 16);
    const stone = local > 24 ? [this.px[at], this.py[at], 1] : [0, 0, 0];
    // the world turns over on each drop, over a beat
    const flip = Math.min(1, local);
    const roll = Math.PI * (phrase + (phrase > 0 ? flip * flip * (3 - 2 * flip) : 0) - (phrase > 0 ? 1 : 0));
    return {
      uMaze: { v: this.rows, kind: '4fv' },
      uWalk: { v: [x, y, a, roll], kind: '4f' },
      uStone: { v: [stone[0], stone[1], stone[2], 0], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The moon bike's clock: beats since the scene came on, so that it always
// opens with the bicycle riding in, wherever the music is when the cut comes.
// ---------------------------------------------------------------------------

export class MoonbikeSim {
  constructor(seed, spb) {
    this.spb = spb;
  }

  uniforms(t, start = 0) {
    const from = t >= start ? start : 0;      // the loop came round: from the top
    return { uMoonT: { v: [(t - from) / this.spb, 0, 0, 0], kind: '4f' } };
  }
}

// ---------------------------------------------------------------------------
// The time car's runs, on the music's big moments - the bars that open on a
// crash or on the drop, where the programmes cut too. Before each the car
// comes in at the far end of the lot, swings round to face the onlookers and
// charges, its readout climbing to 88 on the moment; there it is gone. Only a
// jump seen since the scene came on leaves fire and a plate behind it. Between
// moments it laps the lot, passing in front of the onlookers.
// ---------------------------------------------------------------------------

const TIMECAR_RETURN = 8;                  // beats after a jump before it comes in again
const TIMECAR_CHARGE = 5;                  // beats of the charge, flat out
const TIMECAR_SPEED = 9;                   // metres a beat round the lap
// the lap: in from the far right, across the lot in front of the onlookers, round the far left,
// back across the middle, round the far right, across the back and into the charge
const TC_LAP = [[46, 38], [14, 11], [-12, 10], [-27, 25], [-12, 35], [15, 29], [27, 41], [8, 49], [-11, 43], [-7, 32]];
// the lot, in metres (the shader has the same): where the charge starts, where the car vanishes
const TC_S = [-7, 32], TC_V = [-0.4, 6.5];

export class TimecarSim {
  constructor(seed, spb, meta) {
    this.spb = spb;
    const barBeats = meta && meta.barSec ? Math.round(meta.barSec / spb) : 4;
    const acc = (meta && meta.accents) || [];
    // the big moments, in beats; with none, every eight bars
    this.marks = acc.map((bar) => bar * barBeats).filter((b) => b > 0);
    this.every = 8 * barBeats;
    const hx = TC_V[0] - TC_S[0], hz = TC_V[1] - TC_S[1], hl = Math.hypot(hx, hz);
    this.h = [hx / hl, hz / hl];
    this.side = [-this.h[1], this.h[0]];
    this.runLen = hl;
  }

  /** The i-th big moment, in beats: the music's own, then every eight bars after the last (from the top if none). */
  mark(i) {
    const m = this.marks, n = m.length;
    if (!n) return (i + 1) * this.every;
    return i < n ? m[i] : m[n - 1] + (i - n + 1) * this.every;
  }

  /** The big moment at or before this beat (-Infinity if none), and the next after it. */
  around(beats) {
    let i = 0;
    while (this.mark(i) <= beats) i++;
    return [i > 0 ? this.mark(i - 1) : -Infinity, this.mark(i)];
  }

  /** A point on the lap: segment i, t 0 to 1 along it (a Catmull-Rom curve through the lap's points). */
  lapPoint(i, t) {
    const P = TC_LAP, n = P.length;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[Math.min(n - 1, i + 1)];
    const p3 = i + 2 < n ? P[i + 2] : [2 * P[n - 1][0] - P[n - 2][0], 2 * P[n - 1][1] - P[n - 2][1]];
    const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const g = (a, b, c, d) => 0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t * t);
    const dx = g(p0[0], p1[0], p2[0], p3[0]), dz = g(p0[1], p1[1], p2[1], p3[1]), dl = Math.hypot(dx, dz) || 1;
    return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), dx / dl, dz / dl];
  }

  /** Where the car is on its lap, u from 0 to 1 of the lap's length, and which way it faces. */
  lap(u) {
    if (!this.lapLen) {
      this.lapLen = [];
      for (let i = 0; i < TC_LAP.length - 1; i++) {
        let L = 0, prev = this.lapPoint(i, 0);
        for (let k = 1; k <= 16; k++) { const p = this.lapPoint(i, k / 16); L += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; }
        this.lapLen.push(L);
      }
      this.lapTotal = this.lapLen.reduce((a, b) => a + b, 0);
    }
    let d = Math.max(0, Math.min(1, u)) * this.lapTotal, i = 0;
    while (i < this.lapLen.length - 1 && d > this.lapLen[i]) { d -= this.lapLen[i]; i++; }
    return this.lapPoint(i, Math.min(1, d / this.lapLen[i]));
  }

  uniforms(t, start = 0) {
    const beats = Math.max(0, t / this.spb), sb = Math.max(0, start / this.spb);
    const [prev, next] = this.around(beats);
    const seen = prev >= sb - 1e-6;                        // a jump since the scene came on
    const since = seen ? beats - prev : 1e3;
    const from = Math.max(sb, Number.isFinite(prev) ? prev + TIMECAR_RETURN : 0);
    const chargeAt = Math.max(from, next - TIMECAR_CHARGE);
    this.lap(0);
    const lapBeats = this.lapTotal / TIMECAR_SPEED;
    const swingAt = Math.max(from, chargeAt - lapBeats);
    // a short lap starts part of the way round, so its pace stays the same
    const lapFrom = 1 - (chargeAt - swingAt) / lapBeats;
    let car = [0, 0, 0, 0], present = 0, mph = 0, charge = 0;
    if (beats >= swingAt && beats < next) {
      present = 1;
      if (beats < chargeAt) {
        const u = lapFrom + (1 - lapFrom) * (beats - swingAt) / Math.max(1e-3, chargeAt - swingAt);
        car = this.lap(u);
        mph = 44 + 5 * Math.sin(u * 13);
      } else {
        const r = (beats - chargeAt) / Math.max(1e-3, next - chargeAt);
        charge = r;
        mph = 44 + 44 * Math.pow(r, 1.5);
        const along = (44 * r + 44 * Math.pow(r, 2.5) / 2.5) / (44 + 44 / 2.5);
        car = [TC_S[0] + this.h[0] * this.runLen * along, TC_S[1] + this.h[1] * this.runLen * along, this.h[0], this.h[1]];
      }
    }
    return {
      uTimecar: { v: [since, mph, present, charge], kind: '4f' },
      uTcCar: { v: car, kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The anime opening's title card: the seed, as the show's name, in the 5x7 font
// the cracktro uses, handed to the shader as bits; SEEDSCENE above it, small.
// ---------------------------------------------------------------------------

export const ANIMEOP_TITLE = 10;            // letters a title, at most

export class AnimeopSim {
  constructor(seed) {
    const clean = (s) => [...String(s).toUpperCase()].filter((ch) => CRACK_CHARS.includes(ch) && ch !== ' ').join('');
    this.title = clean(seed).slice(0, ANIMEOP_TITLE) || 'SEEDSCENE';
    this.font = new Float32Array(48 * 2);
    CRACK_FONT.forEach((g, i) => {
      let lo = 0, hi = 0;
      g.split('|').forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== '#') return;
        if (y < 4) lo += 2 ** (y * 5 + x); else hi += 2 ** ((y - 4) * 5 + x);
      }));
      this.font[i * 2] = lo; this.font[i * 2 + 1] = hi;
    });
    this.text = new Float32Array(12);
    [...this.title].forEach((ch, i) => { this.text[i] = crackCode(ch); });
  }

  uniforms() {
    return {
      uFont: { v: this.font, kind: '4fv' },
      uTitle: { v: this.text, kind: '4fv' },
      uAo: { v: [this.title.length, 0, 0, 0], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The road crossing: a hopper crossing lanes of traffic and a river
// ---------------------------------------------------------------------------

export const CROSS_ROWS = 12;               // the start, four lanes of road, the verge, five of river, the bank
const CROSS_X = 0.8;                         // the field's half width
const CROSS_STEP = 0.08;                     // a hop sideways
const CROSS_HALF = 0.022;                    // the hopper's half width
export const CROSS_BAYS = [-0.64, -0.32, 0, 0.32, 0.64];
const crossRoad = (r) => r >= 1 && r <= 4;
const crossRiver = (r) => r >= 6 && r <= 10;

/**
 * The road crossing: four lanes of traffic, a verge, five lanes of a river of
 * logs, and a bank with five bays at the top. Every lane steps on the beat, as
 * the arcade's traffic moved in jerks; the hopper hops a lane on the beat too,
 * choosing each hop two beats ahead so it is still safe after the next one -
 * carried along on a log, waiting on the verge, stepping aside. When nothing is
 * safe it is run over or falls in. Five bays filled light up on the next
 * accented bar - the drop - and empty for the next round.
 */
export class CrossingSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'crossing-sim');
    this.lanes = this.makeLanes(new Rng(this.seed, 'crossing-lanes'));
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.bays = 0;
    this.full = false;
    this.hops = [{ t0: -1e9, t1: -1e9, row: 0, x: 0, face: 0 }];
    this.deaths = [];             // {t, x, y, kind 1 run over, 2 fell in}
    this.homes = [];              // {t, bay}
    this.clears = [];             // {t}
    this.bayLog = [{ t: -1e9, m: 0 }];   // the bays filled, from each moment on
    this.dead = false;
    this.respawn = 0;
  }

  makeLanes(r) {
    const lanes = [];
    let dir = r.bool() ? 1 : -1;
    for (let row = 0; row < CROSS_ROWS; row++) {
      if (crossRoad(row)) {
        const kind = r.pick([1, 1, 2, 3]);              // car, car, lorry, bike
        const len = kind === 2 ? r.float(0.15, 0.19) : kind === 3 ? 0.055 : r.float(0.085, 0.1);
        const count = kind === 2 ? 1 : r.int(1, kind === 3 ? 3 : 2);
        const gap = len + r.float(0.05, 0.09);
        const period = count * gap + r.float(0.22, 0.42);
        const speed = (kind === 3 ? r.float(0.085, 0.12) : kind === 2 ? r.float(0.035, 0.055) : r.float(0.05, 0.09)) * dir;
        lanes.push({ kind, len, count, gap, period, speed, colour: r.float() });
      } else if (crossRiver(row)) {
        const len = r.float(0.17, 0.32);
        const count = r.bool(0.35) ? 2 : 1;
        const gap = len + r.float(0.03, 0.06);
        const period = count * gap + r.float(0.12, 0.22);
        lanes.push({ kind: 4, len, count, gap, period, speed: r.float(0.03, 0.065) * dir, colour: r.float() });
      } else {
        lanes.push({ kind: row === CROSS_ROWS - 1 ? 5 : 0, len: 0, count: 0, gap: 0, period: 1, speed: 0, colour: 0 });
        continue;
      }
      dir = -dir;
    }
    return lanes;
  }

  /** Beats since the start, stepping: each beat of the grid the traffic jumps forward, eased, then holds. */
  beats(t) {
    const g = this.grid;
    const bar = Math.floor(t / g.barSec + 1e-9);
    const s = (t - bar * g.barSec) / g.six;
    const perBar = Math.ceil(g.steps / 4);
    const beat = Math.min(perBar - 1, Math.floor(s / 4));
    const len = Math.min(4, g.steps - beat * 4);
    const f = Math.min(1, (s - beat * 4) / len);
    const e = Math.min(1, f / 0.45);
    return bar * perBar + beat + e * e * (3 - 2 * e);
  }

  offset(row, t) { return this.lanes[row].speed * this.beats(t); }

  /** Whether a hopper at x in a row is safe at t: clear of the traffic, or on a log and still on the field. */
  safeAt(row, x, t) {
    if (Math.abs(x) > CROSS_X - CROSS_HALF) return false;
    const L = this.lanes[row];
    if (L.kind === 0 || L.kind === 5) return true;
    const o = this.offset(row, t);
    const local = (((x - o) % L.period) + L.period) % L.period;   // where in the lane's pattern
    for (let k = 0; k < L.count; k++) {
      for (const c of [k * L.gap, k * L.gap + L.period]) {
        const d = Math.abs(local - c);
        if (L.kind === 4 && d < L.len / 2 - 0.01) return true;
        if (L.kind !== 4 && d < L.len / 2 + CROSS_HALF) return false;
      }
    }
    return L.kind !== 4;
  }

  /** Where a hopper that landed at x in a row at t0 is at t: carried by its log on the river. */
  xAt(row, x, t0, t) { return crossRiver(row) ? x + this.offset(row, t) - this.offset(row, t0) : x; }

  /** The first moment in [a, b] the hopper is not safe, or null. */
  danger(row, x, t0, a, b) {
    for (let i = 0; i <= 8; i++) {
      const t = a + (b - a) * i / 8;
      if (!this.safeAt(row, this.xAt(row, x, t0, t), t)) return t;
    }
    return null;
  }

  /** The bay a landing at x would reach, or -1. */
  bayAt(x) {
    const i = CROSS_BAYS.findIndex((b, k) => Math.abs(x - b) < 0.075 && !(this.bays & (1 << k)));
    return i >= 0 && !(this.bays & (1 << i)) ? i : -1;
  }

  moves(row, x) {
    // near the top it heads for the nearest empty bay
    let toward = 0;
    if (row >= CROSS_ROWS - 4) {
      const open = CROSS_BAYS.filter((b, i) => !(this.bays & (1 << i)));
      const b = open.reduce((a, c) => (Math.abs(c - x) < Math.abs(a - x) ? c : a), open[0] ?? x);
      if (Math.abs(b - x) > 0.04) toward = Math.sign(b - x);
    }
    const side = (d) => (toward === 0 ? 1 : toward === d ? 2.6 : 0.25);
    // the river's last two lanes run opposite ways: it rides the one that carries it to the bay
    let up = 3, stay = toward ? 0.5 : 1.6, down = 0.3;
    const drift = (r) => Math.sign(this.lanes[r].speed);
    if (toward && row === CROSS_ROWS - 2 && drift(row) !== toward) { down = 2.4; stay = 0.3; }
    if (toward && row === CROSS_ROWS - 3) {
      if (drift(row) === toward) { stay = 2.2; up = 0.8; } else if (drift(row + 1) === toward) up = 3.2;
    }
    return [
      { row: row + 1, x, face: 0, w: up },
      { row, x, face: -1, w: stay },
      { row, x: x - CROSS_STEP, face: 1, w: side(-1) },
      { row, x: x + CROSS_STEP, face: 2, w: side(1) },
      { row: row - 1, x, face: 3, w: down },
    ].filter((m) => m.row >= 0 && m.row < CROSS_ROWS && (m.row < CROSS_ROWS - 1 || this.bayAt(m.x) >= 0));
  }

  plan() {
    const g = this.grid.next(this.clock, 4);
    const g2 = this.grid.next(g, 4), g3 = this.grid.next(g2, 4);
    this.clock = g;
    // five bays filled: they light up on the drop, and the next round begins
    if (this.full && (this.grid.isAccent(g) || g - this.fullAt > 8 * this.grid.barSec)) {
      this.full = false;
      this.bays = 0;
      this.bayLog.push({ t: g, m: 0 });
      this.clears.push({ t: g });
      this.score += 1000;
    }
    if (this.dead) {
      if (g < this.respawn) return;
      this.dead = false;
      this.hops.push({ t0: g, t1: g, row: 0, x: 0, face: 0, fresh: true });
      return;
    }
    const h = this.hops[this.hops.length - 1];
    const x = this.xAt(h.row, h.x, h.t1, g);
    const hop = Math.min(0.14, this.grid.spb * 0.4);
    // each move, scored: safe through the next beat, and with a safe move after it
    // now and then it is bold, and looks only one beat ahead
    const bold = this.rng.bool(0.07);
    let best = null, bestW = -1;
    for (const m of this.moves(h.row, x)) {
      if (m.row === CROSS_ROWS - 1) { best = m; bestW = 99; break; }    // a bay in reach: home
      const hit = this.danger(m.row, m.x, g, g, g2);
      if (hit !== null && bold && m.face === 0 && crossRoad(m.row) && this.rng.bool(0.3)) {
        // it misjudges the traffic, and is run over
        this.hops.push({ t0: g - hop, t1: g, row: m.row, x: m.x, face: 0 });
        this.die(hit, m.row, m.x);
        return;
      }
      if (hit !== null) continue;
      const next = bold || this.moves(m.row, this.xAt(m.row, m.x, g, g2)).some((n) =>
        n.row === CROSS_ROWS - 1 || this.danger(n.row, n.x, g2, g2, g3) === null);
      if (!next) continue;
      const w = m.w * (0.6 + 0.8 * this.rng.float());
      if (w > bestW) { best = m; bestW = w; }
    }
    if (!best) {
      // nothing is safe: it hops on and is caught
      const m = this.moves(h.row, x)[0];
      const t = this.danger(m.row, m.x, g, g, g2) ?? g;
      this.hops.push({ t0: g - hop, t1: g, row: m.row, x: m.x, face: m.face });
      this.die(t, m.row, this.xAt(m.row, m.x, g, t));
      return;
    }
    if (best.face === -1) {
      // it stays: a still hop, so it can still be found where it is
      this.hops.push({ t0: g, t1: g, row: h.row, x, face: h.face, still: true });
      return;
    }
    if (best.row === CROSS_ROWS - 1) {
      const bay = this.bayAt(best.x);
      this.hops.push({ t0: g - hop, t1: g, row: best.row, x: CROSS_BAYS[bay], face: 0 });
      this.bays |= 1 << bay;
      this.bayLog.push({ t: g, m: this.bays });
      this.homes.push({ t: g, bay });
      this.score += 50;
      if (this.bays === 31) { this.full = true; this.fullAt = g; }
      // the next one sets off from the start a beat later
      this.hops.push({ t0: g2, t1: g2, row: 0, x: 0, face: 0, fresh: true });
      this.clock = g2;
      return;
    }
    if (best.row > h.row) this.score += 10;
    this.hops.push({ t0: g - hop, t1: g, row: best.row, x: best.x, face: best.face });
    // the river can still carry it off the field before the next beat
    const lost = this.danger(best.row, best.x, g, g, g2);
    if (lost !== null) this.die(lost, best.row, this.xAt(best.row, best.x, g, lost));
  }

  die(t, row, x) {
    this.dead = true;
    this.deaths.push({ t, x, row, kind: crossRiver(row) ? 2 : 1 });
    this.hops.push({ t0: t, t1: t, row: -1, x, face: 0 });
    // back at the start on the second bar line after
    const bar = this.grid.barSec;
    this.respawn = (Math.floor(t / bar + 1e-9) + 2) * bar;
    this.clock = Math.max(this.clock, this.respawn - this.grid.six);
  }

  forget(t) {
    while (this.hops.length > 2 && this.hops[1].t1 < t) this.hops.shift();
    this.kept = this.hops[0].t1 > -1e8 ? Math.max(this.hops[0].t1, 0) : 0;
    this.deaths = this.deaths.filter((d) => d.t > t - 3);
    this.homes = this.homes.filter((d) => d.t > t - 3);
    this.clears = this.clears.filter((d) => d.t > t - 6);
    while (this.bayLog.length > 1 && this.bayLog[1].t < t) this.bayLog.shift();
  }

  uniforms(t) {
    this.advanceTo(t);
    const rowY = (r) => -0.43 + r * 0.066;
    // where the hopper is: resting, or in the air between two rows
    let i = 0;
    while (i + 1 < this.hops.length && this.hops[i + 1].t0 <= t) i++;
    const h = this.hops[i], prev = this.hops[Math.max(0, i - 1)];
    let x, y, air = -1, alive = h.row >= 0 ? 1 : 0;
    if (t < h.t1 && h.t1 > h.t0) {
      const u = (t - h.t0) / (h.t1 - h.t0);
      const px = this.xAt(prev.row, prev.x, prev.t1, h.t0);
      x = px + (h.x - px) * u;
      y = rowY(prev.row) + (rowY(h.row) - rowY(prev.row)) * u;
      air = u;
    } else {
      x = h.row >= 0 ? this.xAt(h.row, h.x, h.t1, t) : h.x;
      y = rowY(Math.max(h.row, 0));
    }
    const laneA = new Float32Array(CROSS_ROWS * 4), laneB = new Float32Array(CROSS_ROWS * 4);
    this.lanes.forEach((L, r) => {
      laneA.set([this.offset(r, t), L.len, L.period, L.kind], r * 4);
      laneB.set([L.count, L.gap, Math.sign(L.speed), L.colour], r * 4);
    });
    const death = recent(this.deaths, t, 1)[0];
    const home = recent(this.homes, t, 1)[0];
    const clear = recent(this.clears, t, 1)[0];
    const face = h.face >= 0 ? h.face : prev.face;
    let bays = this.bayLog[0].m;
    for (const b of this.bayLog) if (b.t <= t) bays = b.m;
    return {
      uLaneA: { v: laneA, kind: '4fv' },
      uLaneB: { v: laneB, kind: '4fv' },
      uHop: { v: [x, y, Math.max(face, 0), alive ? air : -2], kind: '4f' },
      uDeath: { v: death ? [death.x, rowY(death.row), t - death.t, death.kind] : [0, 0, 99, 0], kind: '4f' },
      uCrossFx: { v: [this.score % 100000, bays, home ? t - home.t : 99, clear ? t - clear.t : 99], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The vector tube: a claw on the rim of a tube, things climbing its lanes
// ---------------------------------------------------------------------------

export const TUBE_PTS = 17;                 // the rim's points (16 lanes closed, or 15 open)
export const TUBE_FOES = 8;
export const TUBE_SHOTS = 8;
export const TUBE_BOOMS = 6;
const TUBE_RUNGS = 7;                        // the steps a climber takes from the far end to the rim
const TUBE_SHOT = 0.5;                       // beats a shot takes down the whole tube

// The tube's shapes, each a polygon (closed) or a line (open), resampled to its lanes; and the point it
// vanishes to, as a fraction of the way up the screen.
const TUBE_SHAPES = [
  { closed: true, pts: Array.from({ length: 24 }, (_, i) => [Math.cos(i / 24 * 2 * Math.PI), Math.sin(i / 24 * 2 * Math.PI)]) },
  { closed: true, pts: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
  { closed: true, pts: [[-0.35, -1], [0.35, -1], [0.35, -0.35], [1, -0.35], [1, 0.35], [0.35, 0.35], [0.35, 1], [-0.35, 1], [-0.35, 0.35], [-1, 0.35], [-1, -0.35], [-0.35, -0.35]] },
  { closed: true, pts: Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + i / 10 * 2 * Math.PI, r = i % 2 ? 0.5 : 1; return [r * Math.cos(a), r * Math.sin(a)]; }) },
  { closed: true, pts: [[0, 1], [-1, -0.8], [1, -0.8]] },
  { closed: true, pts: [[-1, 0.7], [-0.45, 0.85], [0, 0.35], [0.45, 0.85], [1, 0.7], [1, -0.7], [0.45, -0.85], [0, -0.35], [-0.45, -0.85], [-1, -0.7]] },
  { closed: false, pts: [[-1, 0.9], [0, -0.9], [1, 0.9]], vanish: 0.55 },
  { closed: false, pts: [[-1.2, -0.6], [1.2, -0.6]], vanish: 0.75 },
  { closed: false, pts: [[-1, 0.9], [-1, -0.6], [1, -0.6], [1, 0.9]], vanish: 0.5 },
];

function resample(shape) {
  const P = shape.closed ? [...shape.pts, shape.pts[0]] : shape.pts;
  const seg = [];
  let total = 0;
  for (let i = 0; i + 1 < P.length; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(l); total += l; }
  const n = shape.closed ? 16 : 15;
  const out = [];
  for (let k = 0; k <= n; k++) {
    let d = total * k / n, i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const u = Math.min(1, d / seg[i]);
    out.push([P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u]);
  }
  return { lanes: n, closed: shape.closed, pts: out, vanish: shape.vanish || 0 };
}

/**
 * The vector tube: a tube seen from its open end, its lanes running down to a
 * point. Things climb the lanes from the far end a step on each beat; the claw
 * on the rim slides lane to lane after the nearest one and fires down the lane
 * on the backbeats, where the snare is, and on the eighths when one is close.
 * One that reaches the rim crawls round it toward the claw. On an accented bar
 * - the drop - the claw dives down the tube, and the next shape opens.
 */
export class TubeSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'tube-sim');
    this.order = new Rng(this.seed, 'tube-shapes').shuffle(TUBE_SHAPES.map((_, i) => i));
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.level = 0;
    this.shape = resample(TUBE_SHAPES[this.order[0]]);
    this.levels = [{ t: -1e9, shape: this.shape, level: 0 }];
    this.lane = Math.floor(this.shape.lanes / 2);
    this.claw = new Track(this.lane);
    this.foes = [];               // {id, lane, rung, kind, keys: [{t, lane, rung}]}
    this.gone = [];               // foes shot or zapped, kept a while for their keys
    this.shots = [];              // {t0, t1, lane, hit}
    this.booms = [];              // {t, lane, depth, kind}
    this.warps = [];              // {t}
    this.deaths = [];             // {t}
    this.nextId = 0;
    this.beat = 0;
    this.down = 0;                // until when the claw is gone
  }

  wrapLane(l) { const n = this.shape.lanes; return this.shape.closed ? ((l % n) + n) % n : Math.max(0, Math.min(n - 1, l)); }
  /** The way round from one lane to another: the short way on a closed tube. */
  laneDelta(a, b) {
    const n = this.shape.lanes;
    let d = b - a;
    if (this.shape.closed) { d = ((d % n) + n) % n; if (d > n / 2) d -= n; }
    return d;
  }

  plan() {
    const g = this.grid.next(this.clock, 4);
    const spb = this.grid.spb;
    this.clock = g;
    this.beat++;
    const perBar = Math.ceil(this.grid.steps / 4);
    const inBar = Math.round(((g / this.grid.barSec) % 1) * perBar) % perBar;
    // the drop: every one still climbing is zapped, and the claw dives down the tube to the next shape
    // (the claw caught just before comes back for it: the drop always dives)
    if (this.grid.isAccent(g) && !this.warps.some((w) => w.t > g - this.grid.barSec * 1.5)) {
      for (const f of this.foes) {
        this.booms.push({ t: g, lane: f.lane, depth: f.rung / TUBE_RUNGS, kind: 1 });
        this.score += 50;
        f.keys.push({ t: g, lane: f.lane, rung: f.rung, gone: true });
        this.gone.push(f);
      }
      this.foes = [];
      this.warps.push({ t: g });
      this.level++;
      this.shape = resample(TUBE_SHAPES[this.order[this.level % this.order.length]]);
      const opens = g + this.grid.barSec;
      this.levels.push({ t: opens, shape: this.shape, level: this.level });
      this.lane = Math.floor(this.shape.lanes / 2);
      this.claw.set(opens, this.lane);
      this.down = opens;
      this.clock = opens - this.grid.six;
      return;
    }
    if (g < this.down) return;
    // 1. they climb a rung; on the rim they crawl a lane toward the claw
    for (const f of this.foes) {
      if (f.rung > 0) f.rung--;
      else f.lane = this.wrapLane(f.lane + Math.sign(this.laneDelta(f.lane, this.lane)));
      f.keys.push({ t: g, lane: f.lane, rung: f.rung });
    }
    // one that reaches the claw takes it apart
    const caught = this.foes.find((f) => f.rung === 0 && f.lane === this.lane);
    if (caught) {
      this.deaths.push({ t: g });
      this.booms.push({ t: g, lane: this.lane, depth: 0, kind: 2 });
      for (const f of this.foes) { f.keys.push({ t: g, lane: f.lane, rung: f.rung, gone: true }); this.gone.push(f); }
      this.foes = [];
      this.down = Math.ceil((g + this.grid.barSec) / this.grid.barSec) * this.grid.barSec;
      this.clock = this.down - this.grid.six;
      return;
    }
    // 2. new ones at the far end, more as the bar goes on
    if (this.foes.length < 6 && this.rng.bool(0.7)) {
      const f = { id: this.nextId++, lane: this.rng.int(0, this.shape.lanes - 1), rung: TUBE_RUNGS, kind: this.rng.int(0, 2), keys: [] };
      f.keys.push({ t: g - 1e-3, lane: f.lane, rung: TUBE_RUNGS + 1 });
      f.keys.push({ t: g, lane: f.lane, rung: f.rung });
      this.foes.push(f);
    }
    // 3. the claw goes after the nearest, the ones on the rim first
    const target = this.foes.slice().sort((a, b) => a.rung - b.rung || Math.abs(this.laneDelta(this.lane, a.lane)) - Math.abs(this.laneDelta(this.lane, b.lane)))[0];
    if (target) {
      const d = this.laneDelta(this.lane, target.lane);
      const step = Math.sign(d) * Math.min(Math.abs(d), target.rung <= 1 ? 4 : 3);
      const arrive = g + spb * 0.12 * Math.max(1, Math.abs(step) * 0.6);
      if (step) { this.claw.set(g, this.claw.at(g)); this.claw.set(arrive, this.claw.at(g) + step); }
      this.lane = this.wrapLane(this.lane + step);
      // 4. it fires: on the backbeats, and on the off-beat eighth when one is close
      const backbeat = inBar % 2 === 1;
      const times = [];
      if (backbeat) times.push(g + spb * 0.25, g + spb * 0.5);
      else if (target.rung <= 2) times.push(g + spb * 0.5);
      for (const t0 of times) {
        if (t0 < arrive) continue;
        const f = this.foes.find((x) => x.lane === this.lane && !x.dead);
        const shot = { t0, t1: t0 + TUBE_SHOT * spb, lane: this.lane };
        if (f) {
          // it meets the one in its lane where the climber stands until the next beat
          const depth = f.rung / TUBE_RUNGS;
          shot.t1 = t0 + Math.max(0.02, depth) * TUBE_SHOT * spb;
          f.dead = true;
          this.booms.push({ t: shot.t1, lane: f.lane, depth, kind: 0 });
          this.score += [150, 200, 100][f.kind];
          f.keys.push({ t: shot.t1, lane: f.lane, rung: f.rung, gone: true });
        }
        this.shots.push(shot);
      }
      for (const f of this.foes.filter((x) => x.dead)) this.gone.push(f);
      this.foes = this.foes.filter((x) => !x.dead);
    }
  }

  forget(t) {
    this.kept = Math.max(0, Math.min(this.levels[this.levels.length - 1].t, t) - 0);
    while (this.levels.length > 1 && this.levels[1].t < t - 4) this.levels.shift();
    this.kept = this.levels[0].t > -1e8 ? this.levels[0].t : 0;
    this.gone = this.gone.filter((f) => f.keys[f.keys.length - 1].t > t - 2);
    for (const f of this.foes) while (f.keys.length > 3 && f.keys[1].t < t - 2) f.keys.shift();
    this.shots = this.shots.filter((s) => s.t1 > t - 1);
    this.booms = this.booms.filter((b) => b.t > t - 2);
    this.warps = this.warps.filter((w) => w.t > t - 4);
    this.deaths = this.deaths.filter((d) => d.t > t - 4);
    this.claw.forget(t - 2);
  }

  /** Where a climber is at t: the step to its rung eased in over the first third of the beat. */
  foeAt(f, t) {
    const k = f.keys;
    let i = -1;
    for (let j = 0; j < k.length; j++) if (k[j].t <= t) i = j;
    if (i < 0 || k[i].gone) return null;
    const a = k[Math.max(0, i - 1)], b = k[i];
    const u = Math.min(1, (t - b.t) / (this.grid.spb * 0.33));
    const e = u * u * (3 - 2 * u);
    let dl = b.lane - a.lane;
    if (this.levelAt(t).shape.closed) { const n = this.levelAt(t).shape.lanes; if (dl > n / 2) dl -= n; if (dl < -n / 2) dl += n; }
    return { lane: a.lane + dl * e, depth: (a.rung + (b.rung - a.rung) * e) / TUBE_RUNGS };
  }

  levelAt(t) { let L = this.levels[0]; for (const l of this.levels) if (l.t <= t) L = l; return L; }

  uniforms(t) {
    this.advanceTo(t);
    const L = this.levelAt(t);
    const rim = new Float32Array(TUBE_PTS * 2);
    L.shape.pts.forEach((p, i) => rim.set(p, i * 2));
    const foes = new Float32Array(TUBE_FOES * 4).fill(0);
    let n = 0;
    for (const f of [...this.foes, ...this.gone].sort((a, b) => a.id - b.id)) {
      if (n >= TUBE_FOES) break;
      const at = this.foeAt(f, t);
      if (at && at.depth <= 1) foes.set([at.lane, at.depth, f.kind, 1], 4 * n++);
    }
    const shots = new Float32Array(TUBE_SHOTS * 4).fill(0);
    this.shots.filter((s) => t >= s.t0 && t < s.t1).slice(-TUBE_SHOTS).forEach((s, i) => {
      shots.set([s.lane, (t - s.t0) / (TUBE_SHOT * this.grid.spb), 1, 0], i * 4);
    });
    const booms = new Float32Array(TUBE_BOOMS * 4);
    const bl = recent(this.booms, t, TUBE_BOOMS);
    for (let i = 0; i < TUBE_BOOMS; i++) { const b = bl[i]; booms.set(b ? [b.lane, b.depth, t - b.t, b.kind] : [0, 0, 99, 0], i * 4); }
    const warp = recent(this.warps, t, 1)[0], death = recent(this.deaths, t, 1)[0];
    const clawGone = t < this.down && (!warp || t >= warp.t) && death && t - death.t < this.grid.barSec * 2 && t < this.down;
    return {
      uRim: { v: rim, kind: '2fv' },
      uTube: { v: [L.shape.lanes, L.shape.closed ? 1 : 0, L.shape.vanish, L.level], kind: '4f' },
      uClaw: { v: [this.wrapClaw(this.claw.at(t), L), clawGone ? 0 : 1, warp ? t - warp.t : 99, this.score % 100000], kind: '4f' },
      uFoes: { v: foes, kind: '4fv' },
      uTShots: { v: shots, kind: '4fv' },
      uTBooms: { v: booms, kind: '4fv' },
      uTubeFx: { v: [death ? t - death.t : 99, this.grid.barSec, warp && t - warp.t < this.grid.barSec ? (t - warp.t) / this.grid.barSec : -1, 0], kind: '4f' },
    };
  }

  wrapClaw(x, L) { const n = L.shape.lanes; return L.shape.closed ? ((x % n) + n) % n : Math.max(0, Math.min(n - 1, x)); }
}

// ---------------------------------------------------------------------------
// The wireframe tank: a battlefield of lines through a tank's sight
// ---------------------------------------------------------------------------

export const TANK_SEGS = 128;
const TANK_F = 1.45;                         // the sight's focal length, in screen units
const TANK_EYE = 1.0;                        // how high the gunner sits
const TANK_HORIZON = -0.03;                  // where level ground meets the sky on the screen
const TANK_TOP = 0.29;                       // the world stops under the strip of the radar and the score
const TANK_WORLD = 240;                      // the battlefield repeats every this many units, so it never runs out
const TANK_TURN = 0.42;                           // radians the hull comes round in a beat, at most
const SHELL = 34;                            // units a shell flies in a beat

// models: edges between corners, in their own units (x across, y up, z forward)
function boxEdges(w, h, d, x = 0, y = 0, z = 0, taper = 0) {
  const c = [];
  for (const yy of [0, h]) for (const zz of [-d / 2, d / 2]) for (const xx of [-w / 2, w / 2]) {
    const k = yy > 0 ? 1 - taper : 1;
    c.push([x + xx * k, y + yy, z + zz * k]);
  }
  const e = [[0, 1], [2, 3], [0, 2], [1, 3], [4, 5], [6, 7], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  return e.map(([a, b]) => [c[a], c[b]]);
}
function pyramidEdges(w, h) {
  const b = [[-w / 2, 0, -w / 2], [w / 2, 0, -w / 2], [w / 2, 0, w / 2], [-w / 2, 0, w / 2]], top = [0, h, 0];
  return [[b[0], b[1]], [b[1], b[2]], [b[2], b[3]], [b[3], b[0]], ...b.map((p) => [p, top])];
}
// the enemy: a low hull, wider at the tracks than on top, a turret and its gun - drawn here, no one's tank
const TANK_MODEL = [
  ...boxEdges(3.2, 1.0, 4.6, 0, 0, 0, 0.18),
  ...boxEdges(1.7, 0.7, 2.0, 0, 1.0, -0.3, 0.12),
  [[0, 1.35, 0.7], [0, 1.35, 3.4]],
  [[-0.12, 1.25, 0.7], [-0.12, 1.25, 3.4]],
];
const OBSTACLES = [() => boxEdges(4, 4, 4), () => pyramidEdges(5, 5.5), () => boxEdges(7, 1.8, 2.5), () => pyramidEdges(3, 7)];

/**
 * The wireframe tank: the battlefield seen through the gunner's sight -
 * mountains round the horizon, a moon, blocks and pyramids, and an enemy tank
 * somewhere about. The tank rolls forward and comes round after the enemy on
 * the beat; once it is in the sight it fires on the backbeat, where the snare
 * is, and the enemy flies apart where the shell lands. The radar sweeps round
 * once a bar; the enemy fires back now and then, its shells going past.
 */
export class TankSim extends PlannedSim {
  reset() {
    const r = new Rng(this.seed, 'tank-field');
    this.rng = new Rng(this.seed, 'tank-sim');
    this.obstacles = Array.from({ length: 14 }, () => {
      const a = r.float(0, Math.PI * 2), d = r.float(18, TANK_WORLD / 2);
      return { x: Math.sin(a) * d, z: Math.cos(a) * d, rot: r.float(0, Math.PI), edges: r.pick(OBSTACLES)() };
    });
    // the mountains: a ring of ridges at the horizon, higher in ranges
    this.ridge = [];
    const phase = r.float(0, 6);
    for (let i = 0; i < 96; i++) {
      // peaks and saddles in turn, higher where a range rises
      const range = 0.55 + 0.45 * Math.sin(i / 96 * Math.PI * 2 * 3 + phase);
      this.ridge.push(i % 2 ? range * r.float(0.045, 0.1) : range * r.float(0.0, 0.03));
    }
    this.moon = r.float(0, Math.PI * 2);
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.heading = new Track(0);
    this.pos = [{ t: -1e9, x: 0, z: 0, h: 0 }];   // where the tank is at each beat
    this.x = 0; this.z = 0; this.h = 0;
    this.foe = null;                // {x, z, h, keys: [{t, x, z, h}], born}
    this.foes = [];                 // every enemy, kept while it can still be seen
    this.shells = [];               // {t0, t1, x0, z0, x1, z1, mine}
    this.blasts = [];               // {t, x, z, h}
    this.shots = [];                // {t} the tank's own, for the sight's flash
    this.next = 0;                  // when the next enemy rolls in
  }

  spawn(g) {
    const a = this.h + this.rng.float(-2.2, 2.2), d = this.rng.float(55, 80);
    const f = { x: this.x + Math.sin(a) * d, z: this.z + Math.cos(a) * d, h: a + Math.PI + this.rng.float(-0.6, 0.6), keys: [], born: g };
    f.keys.push({ t: g, x: f.x, z: f.z, h: f.h });
    this.foe = f;
    this.foes.push(f);
  }

  plan() {
    const g = this.grid.next(this.clock, 4);
    const spb = this.grid.spb;
    this.clock = g;
    const perBar = Math.ceil(this.grid.steps / 4);
    const inBar = Math.round(((g / this.grid.barSec) % 1) * perBar) % perBar;
    if (!this.foe && g >= this.next) this.spawn(g);
    let fire = false;
    if (this.foe) {
      const f = this.foe;
      // the enemy comes on, turning toward the tank and away again
      const toMe = Math.atan2(this.x - f.x, this.z - f.z);
      f.h += Math.max(-0.25, Math.min(0.25, angDiff(toMe + Math.sin(g * 0.7) * 0.6, f.h)));
      const dist = Math.hypot(this.x - f.x, this.z - f.z);
      if (dist > 22) { f.x += Math.sin(f.h) * 1.4; f.z += Math.cos(f.h) * 1.4; }
      f.keys.push({ t: g, x: f.x, z: f.z, h: f.h });
      // now and then it fires, and misses
      if (dist < 60 && this.rng.bool(0.12) && !this.shells.some((s) => !s.mine && s.t1 > g)) {
        const miss = this.rng.bool() ? 3 : -3;
        const side = [Math.cos(this.h) * miss, -Math.sin(this.h) * miss];
        this.shells.push({ t0: g, t1: g + dist / SHELL * spb * 1.2, x0: f.x, z0: f.z, x1: this.x + side[0] - (f.x - this.x) * 0.3, z1: this.z + side[1] - (f.z - this.z) * 0.3, mine: false });
      }
      // the tank comes round after it
      const want = Math.atan2(f.x - this.x, f.z - this.z);
      const d = angDiff(want, this.h);
      const turn = Math.max(-TANK_TURN, Math.min(TANK_TURN, d));
      this.heading.set(g, this.h);
      this.h += turn;
      this.heading.set(g + spb * 0.6, this.h);
      // in the sight: it fires on the backbeat, and the shell lands where the enemy is
      const busy = this.shells.some((s) => s.mine && s.t1 > g);
      if (Math.abs(angDiff(want, this.h)) < 0.04 && dist < 75 && inBar % 2 === 1 && !busy) {
        const t1 = g + Math.max(0.3, dist / SHELL) * spb;
        this.shells.push({ t0: g, t1, x0: this.x, z0: this.z, x1: f.x, z1: f.z, mine: true });
        this.shots.push({ t: g });
        this.blasts.push({ t: t1, x: f.x, z: f.z, h: f.h, big: this.grid.isAccent(this.grid.next(t1 - 1e-6, 16)) });
        f.dead = t1;
        f.keys.push({ t: t1, x: f.x, z: f.z, h: f.h, gone: true });
        this.score += 1000;
        this.foe = null;
        this.next = Math.ceil((t1 + this.grid.barSec) / this.grid.barSec) * this.grid.barSec;
        fire = true;
      }
    }
    // it rolls forward when it is not turning hard
    if (!fire && (!this.foe || Math.abs(angDiff(Math.atan2(this.foe.x - this.x, this.foe.z - this.z), this.h)) < 0.3)) {
      this.x += Math.sin(this.h) * 1.2;
      this.z += Math.cos(this.h) * 1.2;
    }
    this.pos.push({ t: g, x: this.x, z: this.z, h: this.h });
  }

  forget(t) {
    while (this.pos.length > 2 && this.pos[1].t < t - 2) this.pos.shift();
    this.kept = this.pos[0].t > -1e8 ? this.pos[0].t : 0;
    this.foes = this.foes.filter((f) => !f.dead || f.dead > t - 3);
    for (const f of this.foes) while (f.keys.length > 3 && f.keys[1].t < t - 2) f.keys.shift();
    this.shells = this.shells.filter((s) => s.t1 > t - 1);
    this.blasts = this.blasts.filter((b) => b.t > t - 4);
    this.shots = this.shots.filter((b) => b.t > t - 2);
    this.heading.forget(t - 2);
  }

  /** The tank's place at t, eased between beats. */
  placeAt(t) {
    let i = 0;
    while (i + 1 < this.pos.length && this.pos[i + 1].t <= t) i++;
    const a = this.pos[i], b = this.pos[Math.min(i + 1, this.pos.length - 1)];
    const u = b.t > a.t ? Math.min(1, (t - a.t) / (b.t - a.t)) : 0;
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, h: this.heading.at(t) };
  }

  foeAt(f, t) {
    let i = -1;
    for (let j = 0; j < f.keys.length; j++) if (f.keys[j].t <= t) i = j;
    if (i < 0 || f.keys[i].gone) return null;
    const a = f.keys[i], b = f.keys[Math.min(i + 1, f.keys.length - 1)];
    const u = b.t > a.t ? Math.min(1, (t - a.t) / (b.t - a.t)) : 0;
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, h: a.h + angDiff(b.h, a.h) * u };
  }

  uniforms(t) {
    this.advanceTo(t);
    const me = this.placeAt(t);
    const sh = Math.sin(me.h), ch = Math.cos(me.h);
    const segs = [];
    // a segment of the world, projected through the sight and cut at the near plane and the screen's edges
    const put = (A, B) => {
      if (segs.length >= TANK_SEGS * 4) return;
      const cam = (P) => {
        const dx = P[0] - me.x, dz = P[2] - me.z;
        return [dx * ch - dz * sh, P[1] - TANK_EYE, dx * sh + dz * ch];
      };
      let a = cam(A), b = cam(B);
      const near = 0.6;
      if (a[2] < near && b[2] < near) return;
      if (a[2] < near) { const u = (near - a[2]) / (b[2] - a[2]); a = a.map((v, k) => v + (b[k] - v) * u); }
      if (b[2] < near) { const u = (near - b[2]) / (a[2] - b[2]); b = b.map((v, k) => v + (a[k] - v) * u); }
      const pa = [a[0] / a[2] * TANK_F, TANK_HORIZON + a[1] / a[2] * TANK_F], pb = [b[0] / b[2] * TANK_F, TANK_HORIZON + b[1] / b[2] * TANK_F];
      if (Math.max(pa[0], pb[0]) < -1 || Math.min(pa[0], pb[0]) > 1) return;
      segs.push(pa[0], pa[1], pb[0], pb[1]);
    };
    // the world repeats, so it never runs out: each thing is placed at its copy nearest the tank
    const near = (v, c) => v + Math.round((c - v) / TANK_WORLD) * TANK_WORLD;
    const model = (edges, x, z, rot, lift = [0, 0, 0], spin = 0) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      for (const [p, q] of edges) {
        const w = (P) => [x + P[0] * c + P[2] * s + lift[0], P[1] + lift[1], z - P[0] * s + P[2] * c + lift[2]];
        put(w(p), w(q));
      }
    };
    for (const f of this.foes) {
      const at = this.foeAt(f, t);
      if (at) model(TANK_MODEL, at.x, at.z, at.h);
    }
    for (const o of this.obstacles) {
      const x = near(o.x, me.x), z = near(o.z, me.z);
      const dx = x - me.x, dz = z - me.z;
      if (dx * sh + dz * ch < 1 || Math.hypot(dx, dz) > 115) continue;
      model(o.edges, x, z, o.rot);
    }
    // blasts: the enemy's lines flung apart, tumbling and falling
    for (const b of this.blasts) {
      const e = t - b.t;
      if (e < 0 || e > 2.2) continue;
      const r = new Rng(this.seed, 'blast' + Math.round(b.t * 1000));
      TANK_MODEL.forEach(([p, q], k) => {
        if (k % 2) return;
        const v = [r.float(-5, 5), r.float(4, 9), r.float(-5, 5)];
        const lift = [v[0] * e, Math.max(-0.2, v[1] * e - 9 * e * e), v[2] * e];
        const spin = r.float(-6, 6) * e, c = Math.cos(spin), s = Math.sin(spin);
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
        const tw = (P) => [m[0] + (P[0] - m[0]) * c - (P[1] - m[1]) * s, m[1] + (P[0] - m[0]) * s + (P[1] - m[1]) * c, P[2]];
        model([[tw(p), tw(q)]], b.x, b.z, b.h, lift);
      });
    }
    // shells: a short line on its way
    for (const s of this.shells) {
      if (t < s.t0 || t >= s.t1) continue;
      const u = (t - s.t0) / (s.t1 - s.t0), u2 = Math.min(1, u + 0.05);
      const y = s.mine ? 0.8 : 1.1;
      put([s.x0 + (s.x1 - s.x0) * u, y, s.z0 + (s.z1 - s.z0) * u], [s.x0 + (s.x1 - s.x0) * u2, y, s.z0 + (s.z1 - s.z0) * u2]);
    }
    // the mountains, at the horizon all round
    for (let i = 0; i < this.ridge.length; i++) {
      const a0 = i / this.ridge.length * Math.PI * 2, a1 = (i + 1) / this.ridge.length * Math.PI * 2;
      const d0 = angDiff(a0, me.h), d1 = angDiff(a1, me.h);
      if (Math.abs(d0) > 1.0 || Math.abs(d1) > 1.0 || segs.length >= TANK_SEGS * 4) continue;
      segs.push(Math.tan(d0) * TANK_F, TANK_HORIZON + this.ridge[i], Math.tan(d1) * TANK_F, TANK_HORIZON + this.ridge[(i + 1) % this.ridge.length]);
    }
    const n = segs.length / 4;
    const arr = new Float32Array(TANK_SEGS * 4);
    arr.set(segs);
    // the radar: where the enemy is, round the tank
    const f = this.foe && this.foeAt(this.foe, t) ? this.foeAt(this.foe, t) : null;
    let blip = [0, 0, 0, 0];
    if (f) {
      const dx = f.x - me.x, dz = f.z - me.z;
      blip = [dx * ch - dz * sh, dx * sh + dz * ch, 1, 0];
    }
    const want = f ? Math.abs(angDiff(Math.atan2(f.x - me.x, f.z - me.z), me.h)) : 9;
    const shot = recent(this.shots, t, 1)[0], blast = recent(this.blasts, t, 1)[0];
    const md = angDiff(this.moon, me.h);
    return {
      uSeg: { v: arr, kind: '4fv' },
      uTank: { v: [n, Math.max(0, 1 - want / 0.5), shot ? t - shot.t : 99, this.score % 100000], kind: '4f' },
      uBlip: { v: blip, kind: '4f' },
      uMoon: { v: [Math.tan(md) * TANK_F, TANK_HORIZON + 0.2, Math.abs(md) < 0.9 ? 1 : 0, blast ? t - blast.t : 99], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The football match: a pitch seen from above, the goal on the drop
// ---------------------------------------------------------------------------

export const FOOT_MAX = 22;
const PITCH_X = 52.5, PITCH_Y = 34;          // half the pitch, in metres
// a 4-4-2 for the side attacking +x, in its own half: the keeper, the back four, the midfield, the two up front
const FORM = [[-50, 0], [-35, -22], [-36, -8], [-36, 8], [-35, 22], [-16, -25], [-17, -8], [-17, 8], [-16, 25], [-4, -7], [-3, 7]];
const WINGERS = [5, 8];

/**
 * The football match: two sides of eleven on a striped pitch, seen from above,
 * the camera following the ball. The ball moves on the beat - every pass lands
 * on one - working its way up the pitch through a phrase; through the build a
 * winger takes it down the line, crosses on the last beat but one, and the
 * header goes in on the accented bar - the drop - with the crowd going up. The
 * side that conceded kicks off two bars later.
 */
export class FootballSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'football-sim');
    this.clock = 0;
    this.kept = 0;
    this.moves = [];              // the ball: {t0, t1, x0, y0, x1, y1, h, team, who, kind}
    this.goals = [];              // {t, team, x, y}
    this.score = [0, 0];
    this.kickoff(0, this.rng.int(0, 1));
  }

  /** Where a player stands in his side's shape, with the ball at (bx, by). */
  formAt(team, i, bx, by, t) {
    const dir = team === 0 ? 1 : -1;
    const [fx, fy] = FORM[i];
    let x, y;
    if (i === 0) { x = fx; y = Math.max(-5, Math.min(5, by * dir * 0.15)); }
    else {
      x = fx * 0.7 + bx * dir * 0.55 + 6;
      y = fy * 0.85 + by * dir * 0.2;
      x += Math.sin(t * 0.6 + i * 1.7 + team * 3) * 1.5;
      y += Math.cos(t * 0.5 + i * 2.3 + team) * 1.5;
    }
    x = Math.max(-PITCH_X + 1, Math.min(PITCH_X - 1, x));
    return [x * dir, y * dir];
  }

  kickoff(t, team) {
    this.team = team;
    this.holder = 9 + this.rng.int(0, 1);
    this.bx = 0; this.by = 0;
    this.clock = t;
    this.moves.push({ t0: t, t1: t, x0: 0, y0: 0, x1: 0, y1: 0, h: 0, team, who: this.holder, kind: 'rest' });
    this.planGoal(t);
  }

  /** The next accented bar at least a few bars on: the goal is planned for it. */
  planGoal(t) {
    const bar = this.grid.barSec;
    let a = Math.ceil((t + 5 * bar) / bar) * bar;
    while (!this.grid.isAccent(a) && a < t + 20 * bar) a += bar;
    this.goalAt = a;
  }

  /** A teammate's spot when the ball comes to him at (x, y): his place in the shape, ahead of the ball. */
  spotFor(who, x, y, t) {
    let p = [x, y];
    for (let k = 0; k < 3; k++) p = this.formAt(this.team, who, p[0], p[1], t);
    return p;
  }

  push(m) { this.moves.push(m); this.bx = m.x1; this.by = m.y1; this.clock = m.t1; }

  plan() {
    const spb = this.grid.spb, bar = this.grid.barSec;
    const t = this.clock;
    const dir = this.team === 0 ? 1 : -1;
    const left = this.goalAt - t;
    if (left <= spb * 0.6) {
      // (already at the goal: the next one)
      this.planGoal(t);
      return;
    }
    if (left <= 2 * bar + 1e-6) {
      // the build: out to a winger, down the line, the cross, the header on the drop
      const w = WINGERS[this.by * dir > 0 ? 1 : 0];
      const side = FORM[w][1] > 0 ? 1 : -1;
      const wy = side * 28 * dir;
      const g1 = this.grid.next(t, 4);
      this.push({ t0: t, t1: g1, x0: this.bx, y0: this.by, x1: 28 * dir, y1: wy, h: 2, team: this.team, who: w, kind: 'pass' });
      const cross = this.goalAt - spb * 1.5;
      this.push({ t0: g1, t1: cross, x0: 28 * dir, y0: wy, x1: 46 * dir, y1: wy * 0.95, h: 0, team: this.team, who: w, kind: 'run' });
      const head = this.goalAt - spb * 0.5;
      const striker = 9 + (side > 0 ? 1 : 0);
      const hy = -side * dir * this.rng.float(0.5, 3);
      this.push({ t0: cross, t1: head, x0: 46 * dir, y0: wy * 0.95, x1: 44 * dir, y1: hy, h: 6, team: this.team, who: striker, kind: 'cross' });
      const gy = this.rng.float(-2.8, 2.8);
      this.push({ t0: head, t1: this.goalAt, x0: 44 * dir, y0: hy, x1: (PITCH_X + 0.8) * dir, y1: gy, h: 1.2, team: this.team, who: striker, kind: 'shot' });
      this.goals.push({ t: this.goalAt, team: this.team, x: (PITCH_X + 0.8) * dir, y: gy, who: striker });
      this.score[this.team]++;
      // the scorer away to the corner; the side that conceded kicks off two bars on
      this.push({ t0: this.goalAt, t1: this.goalAt + 2 * bar, x0: (PITCH_X + 0.8) * dir, y0: gy, x1: (PITCH_X + 1.2) * dir, y1: gy, h: 0, team: this.team, who: striker, kind: 'net' });
      this.kickoff(this.goalAt + 2 * bar, 1 - this.team);
      return;
    }
    // the build-up: a pass every beat or two, working up the pitch, now and then back or across
    const beats = this.rng.pick([1, 2, 2]);
    let t1 = t;
    for (let k = 0; k < beats; k++) t1 = this.grid.next(t1, 4);
    if (t1 > this.goalAt - 2 * bar) t1 = this.goalAt - 2 * bar;
    if (t1 <= t + 1e-6) { this.clock = this.goalAt - 2 * bar; return; }
    const progress = 1 - (this.goalAt - 2 * bar - t1) / Math.max(bar, this.goalAt - 2 * bar - (this.goalAt - 12 * bar));
    const aimX = Math.max(-20, Math.min(26, progress * 26 + this.rng.float(-10, 6)));
    const cands = [];
    for (let i = 1; i <= 10; i++) {
      if (i === this.holder) continue;
      const [sx, sy] = this.spotFor(i, aimX * dir, this.by * 0.4, t1);
      const d = Math.hypot(sx - this.bx, sy - this.by);
      if (d < 6 || d > 32) continue;
      cands.push({ i, sx, sy, w: 1 / (1 + Math.abs(sx * dir - aimX) * 0.2) });
    }
    if (!cands.length) { this.push({ t0: t, t1, x0: this.bx, y0: this.by, x1: this.bx + 6 * dir, y1: this.by, h: 0, team: this.team, who: this.holder, kind: 'run' }); return; }
    const c = this.rng.weighted(cands, cands.map((q) => q.w));
    const far = Math.hypot(c.sx - this.bx, c.sy - this.by) > 20;
    this.push({ t0: t, t1, x0: this.bx, y0: this.by, x1: c.sx, y1: c.sy, h: far ? 3 : 0, team: this.team, who: c.i, kind: 'pass', from: this.holder });
    this.holder = c.i;
  }

  advanceTo(t) {
    if (t < this.kept) this.reset();
    while (this.clock <= t + 1) this.plan();
    this.forget(t - 4);
  }

  forget(t) {
    while (this.moves.length > 2 && this.moves[1].t1 < t) this.moves.shift();
    this.kept = this.moves[0].t0;
    this.goals = this.goals.filter((g) => g.t > t - 8);
  }

  /** The ball at t: along its move, lofted in an arc where it was kicked high. */
  ballAt(t) {
    let m = this.moves[0];
    for (const x of this.moves) if (x.t0 <= t) m = x;
    const u = m.t1 > m.t0 ? Math.min(1, Math.max(0, (t - m.t0) / (m.t1 - m.t0))) : 1;
    const e = m.kind === 'run' ? u : 1 - (1 - u) * (1 - u) * 0.6 - 0.4 * (1 - u);    // (a kicked ball slows a little)
    return { x: m.x0 + (m.x1 - m.x0) * e, y: m.y0 + (m.y1 - m.y0) * e, h: m.h * 4 * u * (1 - u), m, u };
  }

  uniforms(t) {
    this.advanceTo(t);
    const b = this.ballAt(t);
    const lag = this.ballAt(Math.max(0, t - 0.5));
    const m = b.m;
    const goal = recent(this.goals, t, 1)[0];
    const sinceGoal = goal ? t - goal.t : 99;
    const pl = new Float32Array(FOOT_MAX * 4);
    let k = 0;
    for (let team = 0; team < 2; team++) {
      for (let i = 0; i < 11; i++) {
        let [x, y] = this.formAt(team, i, lag.x, lag.y, t);
        const [x2, y2] = this.formAt(team, i, lag.x, lag.y, t + 0.2);
        let face = Math.atan2(y2 - y, x2 - x), moving = Math.hypot(x2 - x, y2 - y) > 0.15 ? 1 : 0;
        const mine = team === m.team;
        // the one with the ball, or running on to it
        if (mine && i === m.who && m.kind !== 'rest') {
          const toward = Math.atan2(m.y1 - m.y0, m.x1 - m.x0);
          if (m.kind === 'run') { x = b.x - Math.cos(toward) * 0.8; y = b.y - Math.sin(toward) * 0.8; face = toward; moving = 1; }
          else if (m.kind === 'net') { const u = Math.min(1, sinceGoal / 2); x = m.x0 * 0.9 + (Math.sign(m.x0) * 46 - m.x0 * 0.9) * u * 0; x = Math.sign(m.x0) * (44 + 6 * u); y = (m.y0 + Math.sign(m.y0 || 1) * 30 * u); face = Math.atan2(Math.sign(m.y0 || 1), 0); moving = u < 1 ? 1 : 0; }
          else { const u = Math.min(1, (t - m.t0) / Math.max(0.01, m.t1 - m.t0)); const [fx, fy] = [x, y]; x = fx + (m.x1 - fx) * u; y = fy + (m.y1 - fy) * u; face = Math.atan2(m.y1 - fy, m.x1 - fx); moving = 1; }
        }
        if (mine && i === m.from && t - m.t0 < 0.25) { x = m.x0 - Math.cos(face) * 0.7; y = m.y0 - Math.sin(face) * 0.7; }
        // the keeper who is beaten dives for it
        if (!mine && i === 0 && (m.kind === 'shot' || m.kind === 'net')) {
          const u = m.kind === 'shot' ? Math.min(1, (t - m.t0) / Math.max(0.01, m.t1 - m.t0)) : 1;
          y = y + (Math.sign(m.y1 || 1) * -2.5) * u;
          face = Math.atan2(-Math.sign(m.y1 || 1), 0);
        }
        pl.set([x, y, (i === 0 ? 2 : 0) + team + (moving ? 4 : 0), face], k * 4);
        k++;
      }
    }
    // the camera: on the ball, a little ahead of it, never far past the pitch
    const cx = Math.max(-PITCH_X + 10, Math.min(PITCH_X - 10, lag.x * 0.6 + b.x * 0.4));
    const cy = Math.max(-PITCH_Y + 3, Math.min(PITCH_Y - 3, lag.y * 0.6 + b.y * 0.4));
    return {
      uPl: { v: pl, kind: '4fv' },
      uBall: { v: [b.x, b.y, b.h, 0], kind: '4f' },
      uCam: { v: [cx, cy, 0, 0], kind: '4f' },
      uFoot: { v: [this.scoreAt(t, 0), this.scoreAt(t, 1), sinceGoal, goal ? goal.team : 0], kind: '4f' },
    };
  }

  /** A side's goals scored by t (the plan runs ahead of it). */
  scoreAt(t, team) { return this.score[team] - this.goals.filter((g) => g.team === team && g.t > t).length; }
}

// ---------------------------------------------------------------------------
// The skate park: a skater on a half-pipe, a trick on every bar
// ---------------------------------------------------------------------------

export const SKATE_SEGS = 16;
// a real vert ramp's measures (Ocean City, Maryland's: 12 ft tall, 10.5 ft transitions, 1.5 ft of vert, 32 ft wide);
// the flat bottom a little wider than the ramp is tall (no standard is published; taller ramps take more flat)
const RAMP_F = 2.15, RAMP_R = 3.2, RAMP_V = 0.46;   // the flat's half width, the transitions' radius, the vert above them
const RAMP_L = 4.88;                                 // half its width along the coping
const GRAV = 9.81;
const RAMP_LIP = RAMP_F + RAMP_R;                   // where the coping runs
const RAMP_TOP = RAMP_R + RAMP_V;
const SKATE_FOCAL = 1.6;

/** A point of the ramp's profile, a distance s along it from the middle of the flat (negative: the left side). */
function rampPoint(s) {
  const side = s < 0 ? -1 : 1, a = Math.abs(s);
  const arc = RAMP_R * Math.PI / 2;
  if (a <= RAMP_F) return { x: s, y: 0, nx: 0, ny: 1 };
  if (a <= RAMP_F + arc) {
    const th = (a - RAMP_F) / RAMP_R;
    const x = RAMP_F + RAMP_R * Math.sin(th), y = RAMP_R - RAMP_R * Math.cos(th);
    return { x: side * x, y, nx: -side * Math.sin(th), ny: Math.cos(th) };
  }
  return { x: side * RAMP_LIP, y: RAMP_R + Math.min(RAMP_V, a - RAMP_F - arc), nx: -side, ny: 0 };
}
const RAMP_S = RAMP_F + RAMP_R * Math.PI / 2 + RAMP_V;   // from the middle up to the coping

// The airs of vert skating (Wikipedia, "Aerial (skateboarding)"): each launched straight up off the vert, the
// skater turning backside (toward the toes) or frontside (toward the back) - half a turn, so it comes down the wall
// going forward - and holding the board by an edge: which hand, which edge. The 540 turns one and a half.
const AIRS = [
  { name: 'backside air', turn: 0.5, dir: -1, hand: 'front', edge: 'heel', pts: 500 },
  { name: 'frontside air', turn: 0.5, dir: 1, hand: 'back', edge: 'toe', pts: 500 },
  { name: 'indy', turn: 0.5, dir: -1, hand: 'back', edge: 'toe', pts: 600 },
  { name: 'melon', turn: 0.5, dir: -1, hand: 'front', edge: 'heel', tweak: 0.4, pts: 600 },
  { name: 'method', turn: 0.5, dir: -1, hand: 'front', edge: 'heel', method: true, pts: 750 },
  { name: 'mute', turn: 0.5, dir: -1, hand: 'front', edge: 'toe', pts: 550 },
];
const AIR_540 = { name: '540', turn: 1.5, dir: -1, hand: 'back', edge: 'toe', pts: 2000 };
const GRIND = { name: '50-50', turn: 0, dir: 0, hand: null, edge: null, pts: 250 };

/**
 * The skate park: a vert ramp in a warehouse built to a real one's measures,
 * the skater life size, riding wall to wall - a crossing taking the two
 * seconds or more a skater takes - and reaching a lip on a bar line, aiming
 * for the accented one, where it goes straight up off the
 * vert into an air - a backside or frontside air, an indy, a melon, a method, a
 * mute - turning half round in the air to come down the wall going forward, a
 * little along the ramp from where it went up, landing on the beat. On the
 * walls it rides square to the surface, crouching deepest in the transition and
 * standing up into the vert, arms out for balance. Through the build it grinds
 * along the coping on both trucks (a 50-50), board along the pipe; on the drop
 * - the accented bar - it goes up twice as high for a 540, and the combo
 * counted up through the phrase is banked. (Drawn from Wikipedia's articles on
 * aerials, grinds and the vert ramp, and a sequence photograph of a vert air.)
 */
export class SkateSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'skate-sim');
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.combo = 0;
    this.bars = [];               // per bar line: {t, side, kind: 'air'|'grind'|'big', trick, z, z1, combo, score, air}
  }

  /**
   * The next bar line it reaches a lip on: a crossing, lip to lip (some fifteen metres), takes at least about two
   * seconds as skaters ride it, so at a fast tempo it is every second or third bar; an accented bar near enough is
   * aimed for, so the big air lands on the drop.
   */
  nextHit(t) {
    const bar = this.grid.barSec;
    const k = Math.max(1, Math.ceil(3.2 / bar));
    for (let j = Math.max(1, k - 1); j <= k + 1; j++) if (this.grid.isAccent(t + j * bar)) return t + j * bar;
    return t + k * bar;
  }

  /** An air's time aloft for its height, as gravity sets it - its half rounded to the eighths, so it lands on one. */
  airOf(h) {
    const e = this.grid.spb / 2;
    const half = Math.max(e, Math.round(Math.sqrt(2 * h / GRAV) / e) * e);
    return { half, h: 0.5 * GRAV * half * half };
  }

  plan() {
    const spb = this.grid.spb;
    if (!this.bars.length) {
      // (the run starts on the far wall, coming down)
      const t0 = -this.nextHit(0);
      this.bars.push({ t: t0, side: 1, kind: 'air', trick: AIRS[0], z: 0, z1: 0, combo: 0, score: 0, air: this.airOf(1).half, h: this.airOf(1).h });
      this.next = this.nextHit(0) > this.grid.barSec ? this.grid.barSec * Math.ceil(this.nextHit(0) / this.grid.barSec / 2) : this.nextHit(0);
    }
    const t = this.next;
    const nx = this.nextHit(t);
    const kind = this.grid.isAccent(t) ? 'big' : this.grid.isAccent(nx) ? 'grind' : 'air';
    const trick = kind === 'big' ? AIR_540 : kind === 'grind' ? GRIND : this.rng.pick(AIRS);
    this.combo++;
    if (kind === 'big') this.score += Math.round(this.combo * 250 + trick.pts);
    else this.score += trick.pts;
    const prev = this.bars[this.bars.length - 1];
    const z = Math.max(-3.6, Math.min(3.6, prev.z1 + this.rng.float(-0.8, 0.8)));
    // an air comes down a little along the ramp from where it went up; a grind slides a couple of metres
    const drift = kind === 'grind' ? (z > 0 ? -2.2 : 2.2) : (this.rng.bool() ? 1 : -1) * this.rng.float(0.7, 1.3);
    const z1 = Math.max(-3.8, Math.min(3.8, z + drift));
    const air = kind === 'grind' ? { half: Math.max(spb, 0.35), h: 0 } : this.airOf(kind === 'big' ? 2.4 : this.rng.float(0.9, 1.4));
    this.bars.push({ t, side: -prev.side, kind, trick, z, z1, combo: this.combo, score: this.score, air: air.half, h: air.h });
    if (kind === 'big') this.combo = 0;
    this.next = nx;
    this.clock = t;
  }

  advanceTo(t) {
    if (t < this.kept) this.reset();
    while (!this.bars.length || this.clock <= t + 4 * this.grid.barSec) this.plan();
    while (this.bars.length > 3 && this.bars[2].t < t - this.grid.barSec) this.bars.shift();
    this.kept = this.bars.length ? Math.max(0, this.bars[0].t) : 0;
  }

  /**
   * The skater at t: where its feet are, the board's direction (al) and the up of its body (up), the trick and how
   * far through it (u), how high above the coping, how deep it crouches.
   */
  pose(t) {
    this.advanceTo(t);
    let i = 0;
    while (i + 1 < this.bars.length && this.bars[i + 1].t <= t + this.bars[i + 1].air) i++;
    const A = this.bars[i], B = this.bars[i + 1] || A;
    const dt = t - A.t;
    if (dt <= A.air && dt >= -A.air) {
      const u = (dt + A.air) / (2 * A.air);
      if (A.kind === 'grind') {
        // a 50-50 on the coping: both trucks on the pipe, the board along it, the body upright and leaning a little in
        const dir = Math.sign(A.z1 - A.z) || 1;
        const lean = 0.25;
        return { x: A.side * RAMP_LIP, y: RAMP_TOP + 0.06, z: A.z + (A.z1 - A.z) * u, al: [0, 0, dir], up: norm3([-A.side * Math.sin(lean), Math.cos(lean), 0]), h: 0, u, A, crouch: 0.22, mode: 'grind' };
      }
      // an air: straight up off the vert and down again, a little along the ramp; square to the wall it left, the
      // turn taken about the body's own length (feet to head), so the board comes round to point down the wall
      const hgt = A.h * 4 * u * (1 - u);                                          // (a parabola: gravity's)
      const tuck = 0.18 + 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.25));       // knees pulled up to the grab
      return { x: A.side * (RAMP_LIP - 0.2), y: RAMP_TOP + hgt, z: A.z + (A.z1 - A.z) * u, al: [0, 1, 0], up: [-A.side, 0, 0], h: hgt, u, A, crouch: tuck, mode: 'air' };
    }
    // riding from A's lip to B's: down the wall, across the flat and up, fastest at the bottom; square to the surface
    const t0 = A.t + A.air, t1 = B.t - B.air;
    const u = Math.max(0, Math.min(1, (t - t0) / Math.max(0.05, t1 - t0)));
    const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    const s = A.side * RAMP_S + (B.side * RAMP_S - A.side * RAMP_S) * e;
    const p = rampPoint(s), q = rampPoint(s + Math.sign(B.side - A.side) * 0.01);
    const tx = q.x - p.x, ty = q.y - p.y, tl = Math.hypot(tx, ty) || 1;
    let al = [tx / tl, ty / tl, 0];
    let up = [p.nx, p.ny, 0];
    // up onto the coping before a grind, and back in off it after one: the board swings between the wall and the
    // pipe, and the body between square to the wall and upright over the lip
    const onto = (q, w) => {
      const gUp = norm3([-q.side * Math.sin(0.25), Math.cos(0.25), 0]);
      al = norm3(add3(scale3(al, 1 - w), scale3([0, 0, Math.sign(q.z1 - q.z) || 1], w)));
      up = norm3(add3(scale3(up, 1 - w), scale3(gUp, w)));
    };
    if (A.kind === 'grind' && u < 0.2) onto(A, 1 - smooth01(u / 0.2));
    if (B.kind === 'grind' && u > 0.8) onto(B, smooth01((u - 0.8) / 0.2));
    // the crouch: pumping as a variable-length pendulum (Kogelbauer et al., "Mechanical optimization of skateboard
    // pumping", Phys. Rev. Research 2024, from motion capture): standing tall coming down the wall, crouching
    // steadily across the flat, then pushing up early in the curve going up - standing tall into the vert
    const dir = Math.sign(B.side - A.side) || 1;
    const sAlong = s * dir;
    const arc = RAMP_R * Math.PI / 2;
    let crouch;
    if (sAlong < -RAMP_F) {
      const k = Math.max(0, Math.min(1, (-sAlong - RAMP_F) / arc));        // 1 at the top of the curve coming down, 0 at the flat
      crouch = 0.08 + 0.12 * (1 - k) * (1 - k);
    } else if (sAlong <= RAMP_F) {
      crouch = 0.2 + 0.22 * (sAlong + RAMP_F) / (2 * RAMP_F);
    } else {
      const k = Math.min(1, (sAlong - RAMP_F) / arc);
      crouch = 0.42 - 0.36 / (1 + Math.exp(-(k - 0.22) * 14));
    }
    crouch += 0.3 * Math.max(0, 1 - u / 0.15);                              // (and deep just after a landing, to take it)
    // the board speeding up down the wall and slowing up the next: the body leans with it to keep its weight over it
    const accel = Math.cos(Math.PI * u);
    return { x: p.x + p.nx * 0.05, y: p.y + p.ny * 0.05, z: A.z1 + (B.z - A.z1) * e, al, up, h: 0, u, A, crouch, mode: 'ride', accel, rise: Math.max(0, 1 - crouch / 0.42) };
  }

  camera(t) {
    const a = 0.14 * Math.sin(t * 0.09 + 1.3);   // (from the front of the ramp, swinging a little to each side: further round, a wall hid its own curve)
    // it follows the skater, as television does, smoothed over half a second so the frame does not jerk
    let px = 0, py = 0, pz = 0;
    for (let k = 0; k < 5; k++) { const Q = this.pose(Math.max(0, t - k * 0.12)); px += Q.x / 5; py += Q.y / 5; pz += Q.z / 5; }
    const target = [px * 0.6, 1.6 + py * 0.45, pz * 0.6];
    const eye = [target[0] * 0.6 + Math.sin(a) * 11, 5.2 + 0.5 * Math.sin(t * 0.13), target[2] + Math.cos(a) * 11];
    const f = norm3(sub3(target, eye));
    const r = norm3(cross3(f, [0, 1, 0]));
    const u = cross3(r, f);
    return { eye, f, r, u };
  }

  /**
   * The skater's body, in the hall: feet on the board, sideways to it as a skater stands (the chest toward the
   * toe edge), knees and hips folding with the crouch, arms out for balance or a hand on the board in a grab.
   */
  skeleton(P, t) {
    const K = 1;         // (life size, about 1.8 m: the camera follows him instead)
    const tr = P.A.trick;
    let al = P.al, up = P.up;
    // the air's turn, about the body's own length; half a turn brings the board round to point down the wall
    if (P.mode === 'air') al = rotateAxis(al, up, tr.dir * tr.turn * Math.PI * 2 * smooth01(P.u));
    const toe = norm3(cross3(up, al));              // the toe edge's side: where the chest faces
    const base = [P.x, P.y, P.z];
    const L = (a, h, c) => [base[0] + (al[0] * a + up[0] * h + toe[0] * c) * K, base[1] + (al[1] * a + up[1] * h + toe[1] * c) * K, base[2] + (al[2] * a + up[2] * h + toe[2] * c) * K];
    const cr = P.crouch;
    const grab = P.mode === 'air' && tr.hand ? Math.sin(Math.PI * Math.min(1, Math.max(0, (P.u - 0.12) / 0.76))) : 0;
    // the board: in a method pulled up behind the back, in a melon pushed out in front
    let dh = 0, dc = 0;
    if (P.mode === 'air') { dh = cr * 0.9; if (tr.method) { dh += 0.25 * grab; dc -= 0.3 * grab; } if (tr.tweak) dc += tr.tweak * 0.3 * grab; }
    const B = (a, h, c) => L(a, h + dh, c + dc);
    const seg = [];
    const put = (A3, B3, w, kind) => seg.push([A3, B3, w, kind]);
    put(B(0.42, 0.04, 0), B(-0.42, 0.04, 0), 0.06, 0);                       // the deck
    // The body to a man's proportions (Wikipedia, "Body proportions"; figure-drawing canons): 1.78 m, seven and a
    // half heads of 23.7 cm; the hip joints - the greater trochanters - at half the height, 0.89 m, 9 cm either
    // side of the middle in a pelvis a head and a half wide; the knees two heads up; the shoulders two heads
    // apart at their outer edge (the joints 38 cm); the upper arm a head and a half, the forearm to the wrist a
    // little over one, so a hanging elbow comes to the navel and the wrist to the crotch; the hand as long as the
    // face. The knees and elbows are found by two-bone inverse kinematics, so no limb ever changes its length.
    const THIGH = 0.43, SHIN = 0.4, UPPER = 0.31, FORE = 0.26, HIPW = 0.09;
    const ik = (root, end, l1, l2, pole) => {
      const v = sub3(end, root);
      const d = Math.min(Math.hypot(v[0], v[1], v[2]), (l1 + l2) * 0.999);
      const dir = norm3(v);
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const pp = norm3(sub3(pole, scale3(dir, dot3(pole, dir))));
      return add3(add3(root, scale3(dir, a)), scale3(pp, h));
    };
    // the ankles over the board, the stance about shoulder width
    const aF = B(0.22, 0.09, 0), aB = B(-0.22, 0.09, 0);
    // the pelvis: lowered and sent back by the crouch, the trunk leaning forward over the toes to keep balance
    const pelvis = L(0, 0.89 - cr * 0.55, -0.02 - cr * 0.22 + dc * 0.3);
    const hjF = add3(pelvis, scale3(al, HIPW * K)), hjB = add3(pelvis, scale3(al, -HIPW * K));
    const kneePole = norm3(add3(toe, scale3(up, 0.2)));
    const kF = ik(hjF, aF, THIGH * K, SHIN * K, kneePole), kB = ik(hjB, aB, THIGH * K, SHIN * K, kneePole);
    put(aF, kF, 0.075, 1); put(kF, hjF, 0.085, 1); put(aB, kB, 0.075, 1); put(kB, hjB, 0.085, 1);
    // the trunk: bent over the toes as the skater crouches, and leaning with the board's speeding up and slowing down
    // so the weight stays over it; the shoulders turned toward the way it rides (the hips stay square to the board,
    // so the trunk twists between them), as skaters ride a ramp in the motion-capture study's photographs
    const lean = 0.08 + cr * 0.35, fore = 0.12 * (P.accel || 0);
    const tUp = norm3(add3(add3(scale3(up, Math.cos(lean)), scale3(toe, Math.sin(lean))), scale3(al, fore)));
    const twist = P.mode === 'grind' ? 0.3 : P.mode === 'air' ? 0.15 : 0.42;
    const sa = rotateAxis(al, tUp, -twist), chest = norm3(cross3(tUp, sa));
    const shC = add3(pelvis, scale3(tUp, 0.56 * K));
    const shF = add3(shC, scale3(sa, 0.19 * K)), shB = add3(shC, scale3(sa, -0.19 * K));
    const neck = add3(shC, scale3(tUp, 0.07 * K));
    const head = add3(add3(shC, scale3(tUp, 0.215 * K)), scale3(chest, 0.015 * K));
    put(pelvis, neck, 0.13, 2);
    // the arms as counterweights, not alike: the leading one reaching forward and up the way it rides, the trailing
    // one back and down; both rising as the skater stands and dropping as it crouches; out wide in the air
    const rise = P.mode === 'ride' ? P.rise : P.mode === 'grind' ? 0.6 : 0.8;
    const sway = 0.05 * Math.sin(t * 2.1);
    let hF = add3(shF, add3(scale3(sa, 0.34 * K), add3(scale3(tUp, (-0.3 + 0.32 * rise + sway) * K), scale3(chest, 0.16 * K))));
    let hB = add3(shB, add3(scale3(sa, -0.26 * K), add3(scale3(tUp, (-0.42 + 0.12 * rise - sway) * K), scale3(chest, -0.06 * K))));
    if (P.mode === 'air') { hF = add3(shF, add3(scale3(sa, 0.38 * K), scale3(tUp, 0.05 * K))); hB = add3(shB, add3(scale3(sa, -0.36 * K), scale3(tUp, -0.1 * K))); }
    if (P.mode === 'grind') { hF = add3(shF, add3(scale3(sa, 0.42 * K), scale3(tUp, -0.12 * K))); hB = add3(shB, add3(scale3(sa, -0.4 * K), scale3(tUp, -0.22 * K))); }
    if (grab > 0.05) {
      const edge = B(tr.hand === 'front' ? 0.08 : -0.02, 0.06, tr.edge === 'toe' ? 0.12 : -0.12);
      if (tr.hand === 'front') hF = lerp3(hF, edge, Math.min(1, grab * 1.6));
      else hB = lerp3(hB, edge, Math.min(1, grab * 1.6));
    }
    const elbowPole = norm3(add3(scale3(tUp, -1), scale3(chest, -0.5)));
    const eF = ik(shF, hF, UPPER * K, FORE * K, elbowPole), eB = ik(shB, hB, UPPER * K, FORE * K, elbowPole);
    // (the wrist where the forearm ends: the hand reaches a little past it toward the target)
    const wF = add3(eF, scale3(norm3(sub3(hF, eF)), FORE * K)), wB = add3(eB, scale3(norm3(sub3(hB, eB)), FORE * K));
    put(shF, eF, 0.05, 3); put(eF, wF, 0.045, 3); put(shB, eB, 0.05, 3); put(eB, wB, 0.045, 3);
    const fF = aF, fB = aB, hip = pelvis;
    hF = wF; hB = wB;
    // the joints the shader builds the body round, and the board's frame
    const joints = [fF, fB, kF, kB, hip, neck, shF, shB, eF, eB, hF, hB, head, hjF, hjB];
    const board = { c: B(0, 0.04, 0), al, up, toe };
    return { seg, head, K, joints, board };
  }

  uniforms(t) {
    const P = this.pose(t);
    const C = this.camera(t);
    const A = P.A;
    const { joints, board, head } = this.skeleton(P, t);
    const J = new Float32Array(SKATE_SEGS * 4);
    joints.forEach((q, n) => J.set([q[0], q[1], q[2], 1], n * 4));
    const spb = this.grid.spb;
    const shown = this.bars.filter((b) => b.t <= t + b.air);
    const last = shown[shown.length - 1] || A;
    const since = t - (last.t + last.air);
    const hp = joints[4];
    return {
      uSkJ: { v: J, kind: '4fv' },
      uSkB: { v: Float32Array.from([...board.c, 0, ...board.al, 0, ...board.up, 0, ...board.toe, 0]), kind: '4fv' },
      uSkHip: { v: [hp[0], hp[1], hp[2], P.h], kind: '4f' },
      uSkShadow: { v: [P.x, P.y - P.h, P.z, P.mode === 'grind' ? 1 : 0], kind: '4f' },
      uCamE: { v: [...C.eye, SKATE_FOCAL], kind: '4f' },
      uCamF: { v: [...C.f, 0], kind: '4f' },
      uCamR: { v: [...C.r, 0], kind: '4f' },
      uCamU: { v: [...C.u, 0], kind: '4f' },
      uSkFx: { v: [last.score % 100000, last.combo, since, last.kind === 'big' ? 1 : 0], kind: '4f' },
    };
  }
}
const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const smooth01 = (x) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function rotateAxis(v, k, ang) {
  // Rodrigues: v turned by ang about the unit axis k
  const c = Math.cos(ang), s = Math.sin(ang), kv = cross3(k, v), kd = dot3(k, v);
  return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)];
}

// ---------------------------------------------------------------------------
// The artillery: two teams of little soldiers on a hill, shots on the bar
// ---------------------------------------------------------------------------

export const ART_CRATERS = 32;
export const ART_SOLDIERS = 10;
const ART_GRAV = 0.9;                       // board units a second squared

/** The hill before any crater: a few slow waves, the seed's; the same sum the shader draws. */
function artBase(x, k) {
  return -0.18 + 0.16 * Math.cos(x * 2.6 + k[0]) * 0.6 + 0.09 * Math.sin(x * 5.3 + k[1]) + 0.045 * Math.sin(x * 11.0 + k[2]) + 0.12 * Math.exp(-x * x * 6.0) * k[3];
}

/**
 * The artillery: two teams of five little soldiers on a hill of earth, seen
 * from the side, as the turn-based artillery games of the PC showed it. On
 * each bar line a soldier of one side and then the other fires; the shell
 * arcs through the wind and lands on the beat where the snare is, blowing a
 * crater in the hill and anyone near it. On the accented bar - the drop - the
 * shell splits in five at the top of its arc. A side wiped out, the other
 * cheers, and two bars later a new round starts on a whole hill.
 */
export class ArtillerySim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'artillery-sim');
    const r = new Rng(this.seed, 'artillery-hill');
    this.k = [r.float(0, 6.28), r.float(0, 6.28), r.float(0, 6.28), r.float(0.3, 1)];
    this.clock = 0;
    this.kept = 0;
    this.round = 0;
    this.craters = [];            // {t, x, y, r}
    this.shells = [];             // {t0, t1, x0, y0, vx, vy, split, kids}
    this.booms = [];              // {t, x, y, size}
    this.deaths = [];             // {t, i}
    this.rounds = [{ t: -1e9 }];
    this.turn = this.rng.int(0, 1);
    this.next = 0;
    this.deploy(0);
  }

  /** The ground's height at x, the craters dug out of it so far. */
  surface(x, t = Infinity) {
    let y = artBase(x, this.k);
    let from = -1e9;
    for (const r of this.rounds) if (r.t <= t) from = r.t;
    for (const c of this.craters) {
      if (c.t > t || c.t < from) continue;
      const dx = Math.abs(x - c.x);
      if (dx >= c.r) continue;
      const h = Math.sqrt(c.r * c.r - dx * dx);
      if (c.y + h > y) y = Math.min(y, c.y - h);
    }
    return y;
  }

  deploy(t) {
    this.soldiers = [];
    this.rounds.push({ t, soldiers: this.soldiers });
    for (let team = 0; team < 2; team++) {
      for (let i = 0; i < 5; i++) {
        const x = (team ? 1 : -1) * (0.18 + i * 0.13 + this.rng.float(-0.03, 0.03));
        this.soldiers.push({ x, team, alive: true, died: null });
      }
    }
    this.wind = this.rng.float(-0.35, 0.35);
  }

  plan() {
    const bar = this.grid.barSec, spb = this.grid.spb;
    const t = this.next;
    this.clock = t;
    this.next = t + bar;
    const alive = (team) => this.soldiers.filter((q) => q.alive && q.team === team);
    if (!alive(0).length || !alive(1).length) {
      // a side wiped out: two bars of cheering, then a whole hill and both sides again
      this.deploy(t + bar);
      this.next = t + 2 * bar;
      return;
    }
    const shooter = this.rng.pick(alive(this.turn));
    const targets = alive(1 - this.turn);
    const target = this.rng.pick(targets);
    this.turn = 1 - this.turn;
    if (this.rng.bool(0.3)) this.wind = Math.max(-0.4, Math.min(0.4, this.wind + this.rng.float(-0.15, 0.15)));
    const big = this.grid.isAccent(t);
    // it lands on the snare: the fourth beat (the second, when the tempo is slow)
    const land = t + (spb < 0.45 ? 3 : 1) * spb;
    const x0 = shooter.x, y0 = this.surface(x0, t) + 0.035;
    const miss = this.rng.bool(0.55) ? this.rng.float(0.07, 0.16) * (this.rng.bool() ? 1 : -1) : 0;
    const tx = target.x + miss, ty = this.surface(tx, land);
    const T = land - t;
    const vx = (tx - x0 - 0.5 * this.wind * T * T) / T, vy = (ty - y0 + 0.5 * ART_GRAV * T * T) / T;
    const shell = { t0: t, t1: land, x0, y0, vx, vy, from: this.soldiers.indexOf(shooter), split: big, round: this.rounds[this.rounds.length - 1] };
    this.shells.push(shell);
    // where it lands: one crater, or five from the split
    const hits = big ? [-0.16, -0.08, 0, 0.08, 0.16].map((d) => tx + d) : [tx];
    for (const hx of hits) {
      const hy = this.surface(hx, land);
      const rr = big ? 0.075 : 0.06;
      this.craters.push({ t: land, x: hx, y: hy, r: rr });
      this.booms.push({ t: land, x: hx, y: hy, size: big ? 1.4 : 1 });
      for (const q of this.soldiers) {
        if (q.alive && Math.abs(q.x - hx) < rr + 0.02) { q.alive = false; q.died = land; this.deaths.push({ t: land, i: this.soldiers.indexOf(q), from: hx }); }
      }
    }
    // the next one fires on the next bar line
  }

  advanceTo(t) {
    if (t < this.kept) this.reset();
    while (this.clock <= t + 2 * this.grid.barSec) this.plan();
    const keep = t - 4;
    this.shells = this.shells.filter((q) => q.t1 > keep);
    this.booms = this.booms.filter((q) => q.t > keep);
    this.deaths = this.deaths.filter((q) => q.t > keep);
    const from = this.rounds.filter((r) => r.t <= t).pop();
    this.craters = this.craters.filter((c) => c.t >= (from ? from.t : -1e9) - 1e-6 || c.t > t);
    while (this.rounds.length > 2 && this.rounds[2].t <= t) this.rounds.shift();
    this.kept = Math.max(0, this.rounds[1] ? this.rounds[1].t : 0);
  }

  uniforms(t) {
    this.advanceTo(t);
    // the round in play at t, and its soldiers as they stood then
    const round = this.rounds.filter((r) => r.t <= t).pop() || this.rounds[0];
    const cr = new Float32Array(ART_CRATERS * 4);
    let n = 0;
    for (const c of this.craters) {
      if (c.t > t || c.t < round.t || n >= ART_CRATERS) continue;
      cr.set([c.x, c.y, c.r, t - c.t], 4 * n++);
    }
    for (let i = n; i < ART_CRATERS; i++) cr.set([0, 0, 0, 99], 4 * i);
    const so = new Float32Array(ART_SOLDIERS * 4);
    // (the soldiers of the round shown: the plan may already have dealt the next one)
    const live = round.soldiers || this.soldiers;
    live.forEach((q, i) => {
      const dead = q.died !== null && q.died <= t;
      const since = dead ? t - q.died : -1;
      const shooting = this.shells.find((s) => s.round === round && s.from === i && t >= s.t0 - this.grid.spb && t < s.t0 + 0.2);
      so.set([q.x, this.surface(q.x, t), q.team + (shooting ? 2 : 0), dead ? since : -1], i * 4);
    });
    const sh = new Float32Array(24);
    let m = 0;
    for (const s of this.shells) {
      if (t < s.t0 || t >= s.t1 || m >= 6) continue;
      const u = t - s.t0;
      const x = s.x0 + s.vx * u + 0.5 * this.wind * u * u, y = s.y0 + s.vy * u - 0.5 * ART_GRAV * u * u;
      const apex = s.vy / ART_GRAV;
      if (s.split && u > apex) {
        for (const d of [-0.16, -0.08, 0, 0.08, 0.16]) if (m < 6) sh.set([x + d * (u - apex) / (s.t1 - s.t0 - apex), y, 1, 1], 4 * m++);
      } else sh.set([x, y, 1, 0], 4 * m++);
    }
    const bo = new Float32Array(24);
    const bl = recent(this.booms, t, 6);
    for (let i = 0; i < 6; i++) { const b = bl[i]; bo.set(b ? [b.x, b.y, t - b.t, b.size] : [0, 0, 99, 0], i * 4); }
    const a0 = live.filter((q) => q.team === 0 && !(q.died !== null && q.died <= t)).length;
    const a1 = live.filter((q) => q.team === 1 && !(q.died !== null && q.died <= t)).length;
    return {
      uArtK: { v: this.k, kind: '4f' },
      uCraters: { v: cr, kind: '4fv' },
      uSoldiers: { v: so, kind: '4fv' },
      uShells: { v: sh, kind: '4fv' },
      uABooms: { v: bo, kind: '4fv' },
      uArtFx: { v: [this.wind, a0, a1, t - round.t], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The behind-view shooter: a flyer over a checkered plain, waves on the bar
// ---------------------------------------------------------------------------

export const SKY_FOES = 8;
export const SKY_SHOTS = 6;
const SKY_F = 0.9, SKY_EYE = 1.0, SKY_HOR = 0.06, SKY_Z = 3.0;   // focal, eye height, horizon, the flyer's depth

/**
 * The behind-view shooter: a flyer with a jetpack seen from behind over a
 * checkered plain rushing toward the screen, columns and bushes going by. On
 * each bar a wave of saucers comes in from the horizon; the flyer slides in
 * front of the nearest and fires on the beat, each shot reaching its saucer on
 * the next beat. Two bars before an accented bar a serpent of glowing orbs
 * weaves in; on the drop it is hit and bursts orb by orb.
 */
export class SkyrushSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'skyrush-sim');
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.foes = [];               // {t0, x, y, z0, wx, wy, ph, dead}
    this.shots = [];              // {t0, t1, foe}
    this.booms = [];              // {t, x, y, z}
    this.serpents = [];           // {t0, t1 (the drop), ph}
    this.aims = [{ t: -1e9, x: 0, y: 0.6 }];
  }

  /** A saucer's place at t (world units: x across, y up, z ahead). */
  foeAt(f, t) {
    const u = t - f.t0;
    return [f.x + f.wx * Math.sin(u * 1.7 + f.ph), f.y + f.wy * Math.sin(u * 2.3 + f.ph * 1.3), f.z0 - u * f.vz];
  }

  plan() {
    const bar = this.grid.barSec, spb = this.grid.spb;
    const t = this.clock;
    const accentSoon = this.grid.isAccent(t + 2 * bar);
    if (accentSoon) this.serpents.push({ t0: t, t1: t + 2 * bar, ph: this.rng.float(0, 6) });
    // a wave: four saucers in a line or a V, coming in from the horizon
    const v = this.rng.bool();
    const cx = this.rng.float(-1.2, 1.2), cy = this.rng.float(0.4, 1.4);
    const wave = [];
    for (let k = 0; k < 4; k++) {
      const off = k - 1.5;
      const f = { t0: t, x: cx + off * 0.9, y: cy + (v ? Math.abs(off) * 0.25 : 0), z0: 26 + Math.abs(off) * (v ? 1.5 : 0), wx: 0.3, wy: 0.15, ph: this.rng.float(0, 6), vz: 26 / (2 * bar) };
      wave.push(f);
      this.foes.push(f);
    }
    // the flyer fires on the beats of the bar, each shot reaching a saucer of the wave on the next beat
    let b = t;
    for (let k = 0; k < 4; k++) {
      const fire = this.grid.next(b + 1e-6, 4);
      const hit = this.grid.next(fire + 1e-6, 4);
      b = fire;
      const f = wave.filter((q) => !q.dead).sort((p, q) => this.foeAt(p, hit)[2] - this.foeAt(q, hit)[2])[0];
      if (!f || this.rng.bool(0.15)) continue;
      const at = this.foeAt(f, hit);
      if (at[2] < SKY_Z + 1) continue;
      f.dead = hit;
      this.shots.push({ t0: fire, t1: hit, foe: f });
      this.booms.push({ t: hit, x: at[0], y: at[1], z: at[2] });
      this.aims.push({ t: fire - spb * 0.5, x: Math.max(-1.3, Math.min(1.3, at[0] * 0.6)), y: Math.max(0.3, Math.min(1.5, at[1] * 0.8)) });
      this.score += 100;
    }
    if (this.grid.isAccent(t)) this.score += 5000;
    this.clock = t + bar;
  }

  advanceTo(t) {
    if (t < this.kept) this.reset();
    while (this.clock <= t + 3 * this.grid.barSec) this.plan();
    const keep = t - 3;
    this.foes = this.foes.filter((f) => f.t0 > keep - 4 * this.grid.barSec);
    this.shots = this.shots.filter((q) => q.t1 > keep);
    this.booms = this.booms.filter((q) => q.t > keep);
    this.serpents = this.serpents.filter((q) => q.t1 > keep);
    while (this.aims.length > 2 && this.aims[1].t < keep) this.aims.shift();
    this.kept = Math.max(0, this.aims[0].t > -1e8 ? this.aims[0].t : 0);
  }

  /** Where the flyer is: easing from aim to aim, bobbing as it flies. */
  heroAt(t) {
    let i = 0;
    while (i + 1 < this.aims.length && this.aims[i + 1].t <= t) i++;
    const a = this.aims[i], b = this.aims[Math.min(i + 1, this.aims.length - 1)];
    const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / Math.max(0.05, b.t - a.t))) : 1;
    const e = u * u * (3 - 2 * u);
    return [a.x + (b.x - a.x) * e + 0.05 * Math.sin(t * 1.9), a.y + (b.y - a.y) * e + 0.06 * Math.sin(t * 2.7)];
  }

  uniforms(t) {
    this.advanceTo(t);
    const proj = (P) => [P[0] / P[2] * SKY_F, SKY_HOR + (P[1] - SKY_EYE) / P[2] * SKY_F, P[2]];
    const hero = this.heroAt(t);
    const foes = new Float32Array(SKY_FOES * 4).fill(0);
    let n = 0;
    for (const f of this.foes) {
      if (t < f.t0 || (f.dead && f.dead <= t) || n >= SKY_FOES) continue;
      const P = this.foeAt(f, t);
      if (P[2] < 0.6) continue;
      const s = proj(P);
      foes.set([s[0], s[1], P[2], 1], 4 * n++);
    }
    const shots = new Float32Array(SKY_SHOTS * 4).fill(0);
    let m = 0;
    for (const q of this.shots) {
      if (t < q.t0 || t >= q.t1 || m >= SKY_SHOTS) continue;
      const u = (t - q.t0) / (q.t1 - q.t0);
      const to = this.foeAt(q.foe, q.t1);
      const P = [hero[0] + (to[0] - hero[0]) * u, hero[1] + (to[1] - hero[1]) * u, SKY_Z + (to[2] - SKY_Z) * u];
      const s = proj(P);
      shots.set([s[0], s[1], P[2], 1], 4 * m++);
    }
    const booms = new Float32Array(24);
    const bl = recent(this.booms, t, 6);
    for (let i = 0; i < 6; i++) {
      const b = bl[i];
      if (!b) { booms.set([0, 0, 1, 99], i * 4); continue; }
      const s = proj([b.x, b.y, b.z]);
      booms.set([s[0], s[1], b.z, t - b.t], i * 4);
    }
    // the serpent: eight orbs following its head along a weaving path, nearer as the drop comes, bursting on it
    const serp = new Float32Array(32);
    const S = this.serpents.find((q) => t >= q.t0 && t < q.t1 + 1.2);
    for (let k = 0; k < 8; k++) {
      if (!S) { serp.set([0, 0, 1, -1], 4 * k); continue; }
      const u = Math.min(1, (t - S.t0) / (S.t1 - S.t0));
      const lag = k * 0.18;
      const tt = t - lag;
      const z = 30 - 24 * Math.min(1, Math.max(0, (tt - S.t0) / (S.t1 - S.t0)));
      const P = [2.2 * Math.sin(tt * 1.3 + S.ph), 1.8 + 0.8 * Math.sin(tt * 2.1 + S.ph), z];
      const s = proj(P);
      const burst = t - (S.t1 + k * this.grid.spb * 0.12);
      serp.set([s[0], s[1], z, burst > 0 ? burst : (u > 0 ? -0.5 : -1)], 4 * k);
    }
    const hp = proj([hero[0], hero[1], SKY_Z]), hs = proj([hero[0], 0, SKY_Z]);
    return {
      uSkyHero: { v: [hp[0], hp[1], hs[1], SKY_Z], kind: '4f' },
      uSkyFoes: { v: foes, kind: '4fv' },
      uSkyShots: { v: shots, kind: '4fv' },
      uSkyBooms: { v: booms, kind: '4fv' },
      uSerp: { v: serp, kind: '4fv' },
      uSkyFx: { v: [this.scoreAt(t) % 1000000, t / this.grid.spb, hero[0], 0], kind: '4f' },
    };
  }

  scoreAt(t) { return this.score - 100 * this.shots.filter((q) => q.t1 > t).length - 5000 * this.serpents.filter((q) => q.t1 > t).length; }
}

export const SIMS = { skyrush: SkyrushSim, artillery: ArtillerySim, skatepark: SkateSim, football: FootballSim, tanks: TankSim, tube: TubeSim, crossing: CrossingSim, coderain: CoderainSim, animeop: AnimeopSim, timecar: TimecarSim, moonbike: MoonbikeSim, maze3d: Maze3dSim, echolines: EcholinesSim, ansi: AnsiSim, cascade: CascadeSim, cracktro: CracktroSim, rubber: RubberSim, chessfloor: ChessfloorSim, bobs: BobsSim, pyramid: PyramidSim, pipes: PipesSim, maze: MazeSim, snake: SnakeSim, rocks: RocksSim, starfighter: StarSim, paddles: PaddlesSim, invaders: InvadersSim, bricks: BricksSim, lightcycles: LightcyclesSim };
