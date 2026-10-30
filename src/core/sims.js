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

export class CracktroSim {
  constructor(seed, spb, meta, features) {
    this.spb = spb;
    this.logo = 'SEEDSCENE';
    const music = meta && meta.musicLabel ? meta.musicLabel.toUpperCase().slice(0, CRACK_LINE) : 'A LITTLE TUNE';
    const bpm = meta && meta.bpm ? `AT ${meta.bpm} BPM` : '';
    // the intro's pages: what this is, then the thanks
    this.pages = [
      ['SEEDSCENE', 'PRESENTS', 'ONE SEED - ONE DEMO', music + (bpm && music.length + bpm.length < CRACK_LINE ? ' ' + bpm : '')],
      ['THANKS TO', '3DGIORDANO', 'AND THE SEEDSCENE', 'COMMUNITY!'],
    ];
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

export const SIMS = { cracktro: CracktroSim, rubber: RubberSim, chessfloor: ChessfloorSim, bobs: BobsSim, pyramid: PyramidSim, pipes: PipesSim, maze: MazeSim, snake: SnakeSim, rocks: RocksSim, starfighter: StarSim, paddles: PaddlesSim, invaders: InvadersSim, bricks: BricksSim, lightcycles: LightcyclesSim };
