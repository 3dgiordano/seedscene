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
    const lastShot = this.shots.reduce((w, s) => (s.t0 <= t && s.t0 > w ? s.t0 : w), -1);
    return {
      uRim: { v: rim, kind: '2fv' },
      uTube: { v: [L.shape.lanes, L.shape.closed ? 1 : 0, L.shape.vanish, L.level], kind: '4f' },
      uClaw: { v: [this.wrapClaw(this.claw.at(t), L), clawGone ? 0 : 1, warp ? t - warp.t : 99, this.score % 100000], kind: '4f' },
      uFoes: { v: foes, kind: '4fv' },
      uTShots: { v: shots, kind: '4fv' },
      uTBooms: { v: booms, kind: '4fv' },
      uTubeFx: { v: [death ? t - death.t : 99, this.grid.barSec, warp && t - warp.t < this.grid.barSec ? (t - warp.t) / this.grid.barSec : -1, lastShot < 0 ? 99 : t - lastShot], kind: '4f' },
    };
  }

  wrapClaw(x, L) { const n = L.shape.lanes; return L.shape.closed ? ((x % n) + n) % n : Math.max(0, Math.min(n - 1, x)); }
}

// ---------------------------------------------------------------------------
// The wireframe tank: a battlefield of solid, lit shapes through a tank's sight
// ---------------------------------------------------------------------------

export const TANK_SEGS = 180;
export const TANK_FACES = 36;
export const TANK_BLASTS = 4;
export const TANK_WORLD = 240;               // the battlefield repeats every this many units, so it never runs out
export const TANK_REACH = 5.6;               // how far a tank keeps its middle from anything: its length, with the gun swung round
const TANK_F = 1.45;                         // the sight's focal length, in screen units
const TANK_EYE = 2.7;                        // how high the gunner sits: over the enemy's turret, looking down on it
const TANK_HORIZON = 0.1;                    // where level ground meets the sky on the screen
const TANK_TURN = 0.42;                      // radians the hull comes round in a beat, at most
const TANK_ROLL = 1.4;                       // units it rolls in a beat
const TANK_FOE_ROLL = 2.0;                   // the enemy's, closing in
export const TANK_RANGE = 18;                // it holds its fire until the enemy is this near, large in the sight
const TANK_CLOSE = 11.5;                       // the enemy comes no closer than this while it can see the tank
const TANK_APART = 10;                       // and neither ever gets nearer than this
const SHELL = 26;                            // units an enemy shell flies in a beat
const SHELL_G = 14;                          // gravity on a shell, in units a second a second
const TANK_NEAR = 0.6;                       // the near plane
const TANK_GUN = [1.54, 4.2];                // the tank's own muzzle, how high and how far ahead: on the screen, the tip of the gun drawn there

// The shapes are solids, not bare lines: convex parts with faces, so what is behind a face can be hidden and a
// face can be lit. Each face's corners run counter-clockwise from outside.
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function solid(v, faces) {
  const c = v.reduce((s, p) => [s[0] + p[0] / v.length, s[1] + p[1] / v.length, s[2] + p[2] / v.length], [0, 0, 0]);
  const f = faces.map((ids) => {
    const a = v[ids[0]], n = cross3(sub3(v[ids[1]], a), sub3(v[ids[2]], a));
    return dot3(n, sub3(a, c)) < 0 ? ids.slice().reverse() : ids;
  });
  const edges = new Map();
  f.forEach((ids, k) => ids.forEach((a, j) => {
    const b = ids[(j + 1) % ids.length], key = Math.min(a, b) * 100 + Math.max(a, b);
    if (!edges.has(key)) edges.set(key, { a, b, f: [] });
    edges.get(key).f.push(k);
  }));
  return { v, f, e: [...edges.values()], c };
}
const BOX_FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
// a block: a footprint at its foot and another at its top, each a width and how far it runs to the rear and the front
function block({ w0, r0, f0, w1 = w0, r1 = r0, f1 = f0, y0 = 0, y1, x = 0, z = 0 }) {
  const v = [];
  for (const [yy, w, re, fr] of [[y0, w0, r0, f0], [y1, w1, r1, f1]]) {
    for (const zz of [re, fr]) for (const xx of [-w / 2, w / 2]) v.push([x + xx, yy, z + zz]);
  }
  return solid(v, BOX_FACES);
}
const cuboid = (w, h, d) => block({ w0: w, r0: -d / 2, f0: d / 2, y1: h });
function pyramid(w, h) {
  const a = w / 2;
  return solid([[-a, 0, -a], [a, 0, -a], [a, 0, a], [-a, 0, a], [0, h, 0]], [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]);
}
// The enemy: drawn here, no one's tank. Long and low, tracks the whole length of it and sloped at both ends, the hull
// sloped down to the front between them, a low turret set back that turns on its own, a long gun well past the nose.
const TRACK_X = 1.38;
const TANK_BODY = [
  block({ w0: 0.92, r0: -2.35, f0: 2.45, r1: -2.95, f1: 3.05, y1: 0.98, x: -TRACK_X }),
  block({ w0: 0.92, r0: -2.35, f0: 2.45, r1: -2.95, f1: 3.05, y1: 0.98, x: TRACK_X }),
  block({ w0: 2.5, r0: -2.85, f0: 3.0, w1: 2.1, r1: -2.45, f1: 0.95, y0: 0.5, y1: 1.5 }),
];
const TANK_TURRET_AT = -0.45;                // where the turret turns, back of the hull's middle
const TANK_TOP = [
  block({ w0: 2.1, r0: -1.3, f0: 1.15, w1: 1.45, r1: -1.05, f1: 0.5, y0: 1.5, y1: 2.25 }),
  block({ w0: 0.2, r0: 0.7, f0: 4.0, y0: 1.72, y1: 1.92 }),
  block({ w0: 0.32, r0: 4.0, f0: 4.65, y0: 1.66, y1: 1.98 }),
];
const TANK_MUZZLE = [0, 1.82, 4.65];
// the blocks and pyramids of the plain
const OBSTACLES = [() => cuboid(4.4, 4.2, 4.4), () => pyramid(6, 6), () => cuboid(8, 2.0, 3), () => pyramid(3.6, 7.5), () => cuboid(3, 6.5, 3)];

const hypot2 = (x, z) => Math.sqrt(x * x + z * z);
/** Counter-clockwise convex hull of points on the screen. */
function hull2(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const side = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length > 1 && side(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length > 1 && side(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
/** A line on the screen with what a convex shape in front of it hides taken out: nothing, or one or two lines left. */
function cutBehind(a, b, h) {
  if (h.pts.length < 3) return [[a, b]];
  if (Math.max(a[0], b[0]) < h.lo[0] || Math.min(a[0], b[0]) > h.hi[0] || Math.max(a[1], b[1]) < h.lo[1] || Math.min(a[1], b[1]) > h.hi[1]) return [[a, b]];
  let t0 = 0, t1 = 1;
  const n = h.pts.length;
  for (let i = 0; i < n; i++) {
    const A = h.pts[i], B = h.pts[(i + 1) % n];
    const ex = B[0] - A[0], ey = B[1] - A[1];
    const s0 = ex * (a[1] - A[1]) - ey * (a[0] - A[0]) - 1e-5, s1 = ex * (b[1] - A[1]) - ey * (b[0] - A[0]) - 1e-5;
    if (s0 < 0 && s1 < 0) return [[a, b]];
    if (s0 < 0) t0 = Math.max(t0, s0 / (s0 - s1));
    else if (s1 < 0) t1 = Math.min(t1, s0 / (s0 - s1));
  }
  if (t0 >= t1) return [[a, b]];
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const out = [];
  if (t0 > 1e-4) out.push([a, at(t0)]);
  if (t1 < 1 - 1e-4) out.push([at(t1), b]);
  return out;
}
/** A line on the screen cut to the board and a little past it (so it can roll and shake), or null. */
function cutToBoard(a, b) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] + 1.15], [dx, 1.15 - a[0]], [-dy, a[1] + 0.8], [dy, 0.8 - a[1]]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; t0 = Math.max(t0, r); } else { if (r < t0) return null; t1 = Math.min(t1, r); }
  }
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
}

/**
 * The wireframe tank: the battlefield seen through the gunner's sight -
 * mountains round the horizon, a moon, blocks and pyramids, and an enemy tank
 * closing in. Both tanks are things in that world: they steer round what stands
 * in their way and are never let into it. The enemy comes on with its turret
 * tracking the tank; the tank comes round after it on the beat and holds its
 * fire until it is near, large in the sight and with nothing between them; then
 * it fires on the backbeat, where the snare is, the shell lands on the next beat
 * and the enemy flies apart. The radar sweeps round once a bar. The enemy fires
 * back now and then, its turret laid a little to one side of the tank. Every shell
 * leaves its gun's muzzle and flies under gravity until it meets the ground or a
 * block or pyramid, where it bursts.
 */
export class TankSim extends PlannedSim {
  reset() {
    const r = new Rng(this.seed, 'tank-field');
    this.rng = new Rng(this.seed, 'tank-sim');
    // the blocks and pyramids, each far enough from the next for a tank to pass between
    this.obstacles = [];
    const across = (a, b) => hypot2(wrapTo(a.x - b.x, TANK_WORLD / 2), wrapTo(a.z - b.z, TANK_WORLD / 2));
    for (let tries = 0; this.obstacles.length < 30 && tries < 900; tries++) {
      const s = r.pick(OBSTACLES)(), rot = r.float(0, Math.PI);
      const c = Math.cos(rot), sn = Math.sin(rot);
      const v = s.v.map((P) => [P[0] * c + P[2] * sn, P[1], -P[0] * sn + P[2] * c]);
      const o = { x: r.float(-TANK_WORLD / 2, TANK_WORLD / 2), z: r.float(-TANK_WORLD / 2, TANK_WORLD / 2), s, v, r: Math.max(...v.map((P) => hypot2(P[0], P[2]))) };
      if (hypot2(o.x, o.z) < o.r + TANK_REACH + 4) continue;
      if (this.obstacles.some((q) => across(o, q) < o.r + q.r + TANK_REACH * 2 + 1)) continue;
      this.obstacles.push(o);
    }
    // the mountains: a ring of ridges at the horizon, higher in ranges
    this.ridge = [];
    const phase = r.float(0, 6);
    for (let i = 0; i < 72; i++) {
      // peaks and saddles in turn, higher where a range rises
      const range = 0.55 + 0.45 * Math.sin(i / 72 * Math.PI * 2 * 3 + phase);
      this.ridge.push(i % 2 ? range * r.float(0.07, 0.15) : range * r.float(0.01, 0.045));
    }
    this.moon = r.float(0, Math.PI * 2);
    const sun = r.float(0, Math.PI * 2);
    this.light = [Math.sin(sun) * 0.62, 0.62, Math.cos(sun) * 0.48];   // what lights the faces, from high up on one side
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.heading = new Track(0);
    this.pos = [{ t: -1e9, x: 0, z: 0, h: 0 }];   // where the tank is at each beat
    this.x = 0; this.z = 0; this.h = 0;
    this.foe = null;                // {x, z, h, g, d, side, keys: [{t, x, z, h, g, d}], born}
    this.foes = [];                 // every enemy, kept while it can still be seen
    this.shells = [];               // {t0, t1, x0, y0, z0, x1, y1, z1, mine}
    this.blasts = [];               // {t, x, z, h, g, big, kind: 0 a shell bursting, 1 the enemy, 2 the enemy on the drop}
    this.muzzles = [];              // {t, x, z} the enemy's gun going off
    this.shots = [];                // {t, range} the tank's own
    this.next = 0;                  // when the next enemy rolls in
  }

  /** An obstacle's copy nearest a place: the world repeats. */
  nearCopy(o, x, z) {
    return [o.x + Math.round((x - o.x) / TANK_WORLD) * TANK_WORLD, o.z + Math.round((z - o.z) / TANK_WORLD) * TANK_WORLD];
  }

  /** The nearest place to (x, z) that a tank fits: pushed straight out of anything it would be in. */
  clear(x, z) {
    for (const o of this.obstacles) {
      const [cx, cz] = this.nearCopy(o, x, z);
      const dx = x - cx, dz = z - cz, d = hypot2(dx, dz), R = o.r + TANK_REACH;
      if (d < R) { const k = R / Math.max(d, 1e-3); x = cx + dx * k; z = cz + dz * k; }
    }
    return [x, z];
  }

  /** Whether nothing stands on the line between two places. */
  lineClear(x0, z0, x1, z1) {
    return this.lineHit(x0, z0, x1, z1) === null;
  }

  /** How far along the line (0 to 1) it first meets an obstacle, or null. */
  lineHit(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz;
    let best = null;
    for (const o of this.obstacles) {
      const [cx, cz] = this.nearCopy(o, (x0 + x1) / 2, (z0 + z1) / 2);
      const fx = x0 - cx, fz = z0 - cz;
      const b = (fx * dx + fz * dz) / Math.max(L2, 1e-9), c = (fx * fx + fz * fz - o.r * o.r) / Math.max(L2, 1e-9);
      const disc = b * b - c;
      if (disc < 0) continue;
      const u = -b - Math.sqrt(disc);
      if (u > 1) continue;
      if (u < 0 && -b + Math.sqrt(disc) < 0) continue;
      const hit = Math.max(0, u);
      if (best === null || hit < best) best = hit;
    }
    return best;
  }

  /** The heading to steer for: the one wanted, or if something stands in its way, the one that just passes it. */
  around(x, z, want, step) {
    let best = null;
    for (const o of this.obstacles) {
      const [cx, cz] = this.nearCopy(o, x, z);
      const dx = cx - x, dz = cz - z, d = hypot2(dx, dz), R = o.r + TANK_REACH + 0.5;
      if (d > R + step * 7) continue;
      const to = Math.atan2(dx, dz), off = angDiff(want, to);
      if (Math.abs(off) >= Math.PI / 2 || d * Math.abs(Math.sin(off)) >= R) continue;
      if (!best || d < best.d) best = { d, to, off, R };
    }
    if (!best) return want;
    const side = best.off >= 0 ? 1 : -1;
    return best.to + side * Math.asin(Math.min(1, best.R / Math.max(best.d, 1e-3)));
  }

  /** Where the enemy lays its gun, round the tank: ahead of it, or now and then past it, and always to one side. */
  layOff() {
    return { ahead: this.rng.bool(0.25) ? -6 : this.rng.float(4, 7), wide: this.rng.float(3, 5.5) * (this.rng.bool() ? 1 : -1) };
  }

  /** A shell at u of its flight (0 the muzzle, 1 where it was aimed): straight over the ground, falling under gravity. */
  shellAt(s, u) {
    return [
      s.x0 + (s.x1 - s.x0) * u,
      s.y0 + (s.y1 - s.y0) * u + 0.5 * SHELL_G * s.T * s.T * u * (1 - u),
      s.z0 + (s.z1 - s.z0) * u,
    ];
  }

  /** Where a shell's flight first meets a block or a pyramid, its real faces: how far along and how high, or null. */
  shellHit(s) {
    for (let k = 1; k <= 48; k++) {
      const u = k / 48, P = this.shellAt(s, u);
      for (const o of this.obstacles) {
        const [cx, cz] = this.nearCopy(o, P[0], P[2]);
        const Q = [P[0] - cx, P[1], P[2] - cz];
        if (hypot2(Q[0], Q[2]) > o.r) continue;
        const inside = o.s.f.every((ids) => {
          const a = o.v[ids[0]];
          return dot3(cross3(sub3(o.v[ids[1]], a), sub3(o.v[ids[2]], a)), sub3(Q, a)) <= 0;
        });
        if (inside) return { u, y: P[1] };
      }
    }
    return null;
  }

  spawn(g) {
    const a = this.h + this.rng.float(-1.25, 1.25), d = this.rng.float(34, 48);
    const [x, z] = this.clear(this.x + Math.sin(a) * d, this.z + Math.cos(a) * d);
    const h = Math.atan2(this.x - x, this.z - z) + this.rng.float(-0.4, 0.4);
    const f = { x, z, h, g: h, d: 0, side: this.rng.bool() ? 1 : -1, keys: [], fires: [], miss: this.layOff(), born: g };
    f.keys.push({ t: g, x, z, h, g: h, d: 0 });
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
    let fire = false, aim, hold = false;
    if (this.foe) {
      const f = this.foe;
      // the enemy comes on, weaving; close up it holds where it can see the tank, or goes round to where it can
      const toMe = Math.atan2(this.x - f.x, this.z - f.z);
      const far = hypot2(this.x - f.x, this.z - f.z);
      const seen = this.lineClear(f.x, f.z, this.x, this.z);
      let wants = toMe + Math.sin(g * 0.7) * 0.5, step = TANK_FOE_ROLL;
      if (far <= TANK_CLOSE) { if (seen) step = 0; else wants = toMe + f.side * Math.PI / 2; }
      if (step) wants = this.around(f.x, f.z, wants, step);
      const tf = Math.max(-0.35, Math.min(0.35, angDiff(wants, f.h)));
      f.h += tf;
      if (step) {
        const go = step * (1 - 0.4 * Math.abs(tf) / 0.35);
        const [nx, nz] = this.clear(f.x + Math.sin(f.h) * go, f.z + Math.cos(f.h) * go);
        if (hypot2(nx - this.x, nz - this.z) >= TANK_APART) { f.d += hypot2(nx - f.x, nz - f.z); f.x = nx; f.z = nz; }
      }
      // its turret comes round to where it means to land a shell, a little to one side of the tank
      const dist = hypot2(this.x - f.x, this.z - f.z);
      const ux = (f.x - this.x) / dist, uz = (f.z - this.z) / dist;
      const ax = this.x + ux * f.miss.ahead + uz * f.miss.wide, az = this.z + uz * f.miss.ahead - ux * f.miss.wide;
      const px = f.x + Math.sin(f.h) * TANK_TURRET_AT, pz = f.z + Math.cos(f.h) * TANK_TURRET_AT;
      const lay = Math.atan2(ax - px, az - pz);
      f.g += Math.max(-0.5, Math.min(0.5, angDiff(lay, f.g)));
      f.keys.push({ t: g, x: f.x, z: f.z, h: f.h, g: f.g, d: f.d });
      // laid, and not yet on top of the tank, it fires now and then: the shell leaves the muzzle along the gun and
      // flies to the ground beside the tank, unless it meets a block or a pyramid on the way
      if (dist >= 22 && dist < 44 && Math.abs(angDiff(lay, f.g)) < 0.05 && this.rng.bool(0.22) && !this.shells.some((s) => !s.mine && s.t1 > g)) {
        const sg = Math.sin(f.g), cg = Math.cos(f.g);
        const mx = px + sg * TANK_MUZZLE[2], mz = pz + cg * TANK_MUZZLE[2];
        const reach = hypot2(ax - px, az - pz) - TANK_MUZZLE[2];
        const T = this.grid.next(g + Math.max(0.3, reach / SHELL) * spb - 1e-6, 2) - g;
        const shell = { t0: g, T, t1: g + T, x0: mx, y0: TANK_MUZZLE[1], z0: mz, x1: mx + sg * reach, y1: 0, z1: mz + cg * reach, mine: false, by: f };
        const hit = this.shellHit(shell);
        // (with a block or a pyramid right in front of the gun it holds its fire)
        if (!hit || hit.u * reach >= 10) {
          if (hit) shell.t1 = g + T * hit.u;
          const end = this.shellAt(shell, hit ? hit.u : 1);
          this.shells.push(shell);
          this.blasts.push({ t: shell.t1, x: end[0], y: Math.max(0, end[1]), z: end[2], h: 0, g: 0, kind: 0 });
          this.muzzles.push({ t: g, x: mx, z: mz });
          f.fires.push(g);
          f.miss = this.layOff();
        }
      }
      // the tank comes round after it: straight at it when it can shoot, round whatever is in the way when not
      const want = Math.atan2(f.x - this.x, f.z - this.z);
      const open = this.lineClear(this.x, this.z, f.x, f.z);
      const inRange = dist <= TANK_RANGE;
      aim = open && inRange ? want : this.around(this.x, this.z, want, TANK_ROLL);
      const turn = Math.max(-TANK_TURN, Math.min(TANK_TURN, angDiff(aim, this.h)));
      this.heading.set(g, this.h);
      this.h += turn;
      this.heading.set(g + spb * 0.6, this.h);
      hold = open && inRange;
      // near, in the sight and nothing between: it fires on the backbeat, the shell landing on the next beat
      const busy = this.shells.some((s) => s.mine && s.t1 > g);
      // (the view must already be on it: the shell leaves the gun as it is seen, not as it will be)
      if (open && inRange && Math.abs(angDiff(want, this.h)) < 0.04 && Math.abs(turn) < 0.05 && inBar % 2 === 1 && !busy) {
        const t1 = g + spb;
        // (the enemy rolls on while the shell flies, if that leaves the two apart)
        let [lx, lz] = this.clear(f.x + Math.sin(f.h) * (step ? TANK_FOE_ROLL : 0), f.z + Math.cos(f.h) * (step ? TANK_FOE_ROLL : 0));
        if (hypot2(lx - this.x, lz - this.z) < TANK_APART) { lx = f.x; lz = f.z; }
        // (the shell leaves the gun where the gun is now: the hull's last small turn is still to come)
        const h0 = this.h - turn;
        const gx = this.x + Math.sin(h0) * TANK_GUN[1], gz = this.z + Math.cos(h0) * TANK_GUN[1];
        this.shells.push({ t0: g, T: spb, t1, x0: gx, y0: TANK_GUN[0], z0: gz, x1: lx, y1: 1.2, z1: lz, mine: true });
        this.shots.push({ t: g, range: dist });
        this.blasts.push({ t: t1, x: lx, y: 1.2, z: lz, h: f.h, g: f.g, kind: this.grid.isAccent(t1) ? 2 : 1 });
        f.dead = t1;
        f.keys.push({ t: t1, x: lx, z: lz, h: f.h, g: f.g, d: f.d + hypot2(lx - f.x, lz - f.z), gone: true });
        this.score += 1000;
        this.foe = null;
        this.next = Math.ceil((t1 + this.grid.barSec * 0.5) / this.grid.barSec) * this.grid.barSec;
        fire = true;
      }
    } else {
      // nothing to shoot: it rolls on, looking about (once its last shell has landed)
      hold = this.shells.some((s) => s.mine && s.t1 >= g - 1e-6);   // (a step is taken over the beat before it: this one too)
      aim = hold ? this.h : this.around(this.x, this.z, this.h + Math.sin(g * 0.31) * 0.3, TANK_ROLL);
      const turn = Math.max(-TANK_TURN, Math.min(TANK_TURN, angDiff(aim, this.h)));
      this.heading.set(g, this.h);
      this.h += turn;
      this.heading.set(g + spb * 0.6, this.h);
    }
    // it rolls forward, slower through a hard turn; it stops to shoot, and is never let into anything
    if (!fire && !hold) {
      const off = Math.abs(angDiff(aim, this.h));
      const go = TANK_ROLL * (1 - 0.7 * Math.min(1, off / 0.6));
      const [nx, nz] = this.clear(this.x + Math.sin(this.h) * go, this.z + Math.cos(this.h) * go);
      if (!this.foe || hypot2(nx - this.foe.x, nz - this.foe.z) >= TANK_APART) { this.x = nx; this.z = nz; }
    }
    this.pos.push({ t: g, x: this.x, z: this.z, h: this.h });
  }

  forget(t) {
    while (this.pos.length > 2 && this.pos[1].t < t - 2) this.pos.shift();
    this.kept = this.pos[0].t > -1e8 ? this.pos[0].t : 0;
    this.foes = this.foes.filter((f) => !f.dead || f.dead > t - 3);
    for (const f of this.foes) while (f.keys.length > 3 && f.keys[1].t < t - 2) f.keys.shift();
    this.shells = this.shells.filter((s) => s.t1 > t - 1);
    this.blasts = this.blasts.filter((b) => b.t > t - 7);
    this.muzzles = this.muzzles.filter((b) => b.t > t - 2);
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
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, h: a.h + angDiff(b.h, a.h) * u, g: a.g + angDiff(b.g, a.g) * u, d: a.d + (b.d - a.d) * u };
  }

  uniforms(t) {
    this.advanceTo(t);
    const me = this.placeAt(t);
    const sh = Math.sin(me.h), ch = Math.cos(me.h);
    const cam = (P) => {
      const dx = P[0] - me.x, dz = P[2] - me.z;
      return [dx * ch - dz * sh, P[1] - TANK_EYE, dx * sh + dz * ch];
    };
    const onScreen = (c) => [c[0] / c[2] * TANK_F, TANK_HORIZON + c[1] / c[2] * TANK_F];
    const lightC = [this.light[0] * ch - this.light[2] * sh, this.light[1], this.light[0] * sh + this.light[2] * ch];

    // ---- the solids in view, as parts: each with its lit faces, its visible edges and its outline on the screen
    const part = (s, place, kind, far) => {
      const V = s.v.map((P) => cam(place(P)));
      if (V.every((c) => c[2] < TANK_NEAR)) return null;
      const front = s.f.map((ids) => {
        const a = V[ids[0]];
        return dot3(cross3(sub3(V[ids[1]], a), sub3(V[ids[2]], a)), a) < 0;
      });
      const polys = [], every = [];
      s.f.forEach((ids, k) => {
        if (!front[k]) return;
        // cut at the near plane
        const pts = [];
        ids.forEach((id, j) => {
          const a = V[id], b = V[ids[(j + 1) % ids.length]];
          if (a[2] >= TANK_NEAR) pts.push(a);
          if ((a[2] < TANK_NEAR) !== (b[2] < TANK_NEAR)) {
            const u = (TANK_NEAR - a[2]) / (b[2] - a[2]);
            pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, TANK_NEAR]);
          }
        });
        if (pts.length < 3) return;
        const n = cross3(sub3(V[ids[1]], V[ids[0]]), sub3(V[ids[2]], V[ids[0]]));
        const shade = Math.max(0, dot3(n, lightC) / Math.max(Math.sqrt(dot3(n, n)), 1e-6));
        const scr = pts.map(onScreen);
        scr.forEach((q) => every.push(q));
        polys.push({ scr, shade });
      });
      const hullPts = hull2(every);
      const lo = [Math.min(...hullPts.map((q) => q[0])), Math.min(...hullPts.map((q) => q[1]))];
      const hi = [Math.max(...hullPts.map((q) => q[0])), Math.max(...hullPts.map((q) => q[1]))];
      return { s, V, front, polys, hull: { pts: hullPts, lo, hi }, kind, far };
    };
    const objects = [];
    for (const o of this.obstacles) {
      const [x, z] = this.nearCopy(o, me.x, me.z);
      const dx = x - me.x, dz = z - me.z, cz = dx * sh + dz * ch, cx = dx * ch - dz * sh;
      if (hypot2(dx, dz) > 105 || cz < -o.r || Math.abs(cx) - o.r > Math.max(cz, 0) * 0.95 + 0.5) continue;
      const P = part({ ...o.s, v: o.v }, (Q) => [Q[0] + x, Q[1], Q[2] + z], 0, hypot2(dx, dz));
      if (P) objects.push({ far: hypot2(dx, dz), parts: [P] });
    }
    let target = null;
    for (const f of this.foes) {
      const at = this.foeAt(f, t);
      if (!at) continue;
      const dx = at.x - me.x, dz = at.z - me.z, far = hypot2(dx, dz);
      const c = Math.cos(at.h), s = Math.sin(at.h), cg = Math.cos(at.g), sg = Math.sin(at.g);
      const onBody = (P) => [at.x + P[0] * c + P[2] * s, P[1], at.z - P[0] * s + P[2] * c];
      const px = at.x + s * TANK_TURRET_AT, pz = at.z + c * TANK_TURRET_AT;
      const onTop = (P) => [px + P[0] * cg + P[2] * sg, P[1], pz - P[0] * sg + P[2] * cg];
      // the gun runs back into the turret as it fires
      const fired = f.fires.reduce((w, q) => (q <= t ? q : w), -99);
      const back = 0.75 * Math.exp(-(t - fired) * 9);
      const onGun = (P) => onTop([P[0], P[1], P[2] - back]);
      const parts = [];
      for (const q of TANK_BODY) { const P = part(q, onBody, 1, 0); if (P) parts.push(P); }
      TANK_TOP.forEach((q, i) => { const P = part(q, i ? onGun : onTop, 1, 0); if (P) parts.push(P); });
      if (!parts.length) continue;
      // painted far to near: the far track, the hull, the near track, then the turret and the gun, by which is nearer
      const dist = (Q) => { const m = sub3(Q, [me.x, TANK_EYE, me.z]); return dot3(m, m); };
      const lT = dist(onBody([-TRACK_X, 0.5, 0])), rT = dist(onBody([TRACK_X, 0.5, 0]));
      const gun = dist(onTop([0, 1.8, 2.4])), top = dist(onTop([0, 1.8, -0.1]));
      const order = [lT > rT ? 0 : 1, 2, lT > rT ? 1 : 0, ...(gun > top ? [4, 5, 3] : [3, 4, 5])];
      const named = [...TANK_BODY, ...TANK_TOP];
      const sorted = order.map((i) => parts.find((P) => P.s === named[i])).filter(Boolean);
      objects.push({ far, parts: sorted, foe: at, onBody });
      {
        // the enemy's outline on the screen, without its gun: what the sight frames, for as long as it is there to see
        // (not this.foe: the game is planned ahead of what is shown, and that one may already be done for)
        const held = parts.filter((P) => P.s === TANK_BODY[0] || P.s === TANK_BODY[1] || P.s === TANK_BODY[2] || P.s === TANK_TOP[0]);
        const lo = [Math.min(...held.map((P) => P.hull.lo[0])), Math.min(...held.map((P) => P.hull.lo[1]))];
        const hi = [Math.max(...held.map((P) => P.hull.hi[0])), Math.max(...held.map((P) => P.hull.hi[1]))];
        target = { at, far, lo, hi };
      }
    }
    objects.sort((a, b) => b.far - a.far);
    const drawn = objects.flatMap((O) => O.parts.map((P) => ({ P, O })));

    // ---- the lines, near ones brighter and thicker; whatever a part painted later stands in front of is hidden
    const enemy = [], world = [], hot = [], peaks = [];
    const fog = (z) => Math.max(0.22, Math.min(0.98, 1.15 * Math.exp(-z / 62)));
    const emit = (to, a, b, kind, bright, from) => {
      const C = cutToBoard(a, b);
      if (!C) return;
      let pieces = [C];
      for (let j = from; j < drawn.length && pieces.length; j++) pieces = pieces.flatMap(([u, v]) => cutBehind(u, v, drawn[j].P.hull));
      for (const [u, v] of pieces) to.push(u[0], u[1], v[0], v[1], kind + Math.min(0.98, bright));
    };
    const line3 = (a, b, to, kind, bright, from) => {
      if (a[2] < TANK_NEAR && b[2] < TANK_NEAR) return;
      if (a[2] < TANK_NEAR) { const u = (TANK_NEAR - a[2]) / (b[2] - a[2]); a = a.map((v, k) => v + (b[k] - v) * u); }
      if (b[2] < TANK_NEAR) { const u = (TANK_NEAR - b[2]) / (a[2] - b[2]); b = b.map((v, k) => v + (a[k] - v) * u); }
      emit(to, onScreen(a), onScreen(b), kind, bright, from);
    };
    drawn.forEach(({ P, O }, i) => {
      const to = P.kind ? enemy : world;
      for (const e of P.s.e) {
        if (!e.f.some((k) => P.front[k])) continue;
        const a = P.V[e.a], b = P.V[e.b];
        line3(a, b, to, P.kind, fog((a[2] + b[2]) / 2), i + 1);
      }
      // the road wheels on the side of a track it can see, turning as the tank rolls
      if (P.kind && O.foe && O.far < 34 && (P.s === TANK_BODY[0] || P.s === TANK_BODY[1])) {
        const x0 = P.s === TANK_BODY[0] ? -TRACK_X - 0.46 : TRACK_X + 0.46;
        const outer = cam(O.onBody([x0 * 2, 0.45, 0])), side = cam(O.onBody([x0, 0.45, 0]));
        if (dot3(sub3(outer, side), side) < 0) {
          const spin = O.foe.d / 0.33;
          for (let w = 0; w < 5; w++) {
            const wz = -1.92 + w * 0.97;
            for (let k = 0; k < 6; k++) {
              const a0 = spin + k / 6 * Math.PI * 2, a1 = spin + (k + 1) / 6 * Math.PI * 2;
              const A = cam(O.onBody([x0, 0.42 + Math.sin(a0) * 0.33, wz + Math.cos(a0) * 0.33]));
              const B = cam(O.onBody([x0, 0.42 + Math.sin(a1) * 0.33, wz + Math.cos(a1) * 0.33]));
              line3(A, B, to, P.kind, fog(A[2]) * 0.8, i + 1);
            }
          }
        }
      }
    });
    // what is thrown up: a burst flings the enemy's lines apart, tumbling and falling; its turret goes up whole
    for (const b of this.blasts) {
      const e = t - b.t;
      if (b.kind < 1 || e < 0 || e > 2.2) continue;
      const r = new Rng(this.seed, 'blast' + Math.round(b.t * 1000));
      const c = Math.cos(b.h), s = Math.sin(b.h);
      const power = b.kind > 1 ? 1.5 : 1;
      const heat = Math.max(0.12, 1 - e / 2.2);
      const inWorld = (P, lift) => [b.x + P[0] * c + P[2] * s + lift[0], P[1] + lift[1], b.z - P[0] * s + P[2] * c + lift[2]];
      TANK_BODY.forEach((q) => q.e.forEach((ed, k) => {
        const v = [r.float(-7, 7) * power, r.float(5, 12) * power, r.float(-7, 7) * power];
        const spin = r.float(-7, 7) * e, cs = Math.cos(spin), sn = Math.sin(spin);
        if (k % 2) return;
        const lift = [v[0] * e, Math.max(-0.3, v[1] * e - 9 * e * e), v[2] * e];
        const A = q.v[ed.a], B = q.v[ed.b], m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
        const tw = (P) => [m[0] + (P[0] - m[0]) * cs - (P[1] - m[1]) * sn, m[1] + (P[0] - m[0]) * sn + (P[1] - m[1]) * cs, P[2]];
        line3(cam(inWorld(tw(A), lift)), cam(inWorld(tw(B), lift)), hot, 2, heat, drawn.length);
      }));
      const topUp = Math.max(0, 11 * power * e - 7 * e * e);
      if (topUp > 0 || e < 0.5) {
        const spin = e * 3.5 * r.float(0.6, 1.4), cs = Math.cos(spin), sn = Math.sin(spin);
        const cg = Math.cos(b.g), sg = Math.sin(b.g);
        const dx = r.float(-3, 3) * e, dz = r.float(-3, 3) * e;
        const tumble = (P) => {
          const y = P[1] - 1.8;
          const z = P[2] * cs - y * sn, yy = P[2] * sn + y * cs + 1.8;
          return [b.x + dx + P[0] * cg + z * sg, yy + topUp, b.z + dz - P[0] * sg + z * cg];
        };
        for (const q of TANK_TOP) for (const ed of q.e) line3(cam(tumble(q.v[ed.a])), cam(tumble(q.v[ed.b])), hot, 2, heat, drawn.length);
      }
    }
    // shells: a hot line on its way, a bright head on it
    const heads = [];
    for (const s of this.shells) {
      if (t < s.t0 || t >= s.t1) continue;
      const u = (t - s.t0) / s.T, back = Math.max(0, u - 0.14);
      const H = cam(this.shellAt(s, u)), Tl = cam(this.shellAt(s, back));
      line3(Tl, H, hot, 2, 0.98, drawn.length);
      if (H[2] > TANK_NEAR) { const q = onScreen(H); heads.push(q[0], q[1], Math.min(0.09, 0.28 / H[2]), s.mine ? 1 : 2); }
    }
    // the mountains, at the horizon all round, behind everything
    for (let i = 0; i < this.ridge.length; i++) {
      const a0 = i / this.ridge.length * Math.PI * 2, a1 = (i + 1) / this.ridge.length * Math.PI * 2;
      const d0 = angDiff(a0, me.h), d1 = angDiff(a1, me.h);
      if (Math.abs(d0) > 1.0 || Math.abs(d1) > 1.0) continue;
      emit(peaks, [Math.tan(d0) * TANK_F, TANK_HORIZON + this.ridge[i]], [Math.tan(d1) * TANK_F, TANK_HORIZON + this.ridge[(i + 1) % this.ridge.length]], 3, 0.7, 0);
    }
    // the enemy and the shells first, then the plain near to far, the mountains last: if the lines run out it is at the far end
    const nearFirst = [];
    for (let k = world.length - 5; k >= 0; k -= 5) nearFirst.push(world[k], world[k + 1], world[k + 2], world[k + 3], world[k + 4]);
    const all = [...hot, ...enemy, ...nearFirst, ...peaks];
    const n = Math.min(TANK_SEGS, all.length / 5);
    const arr = new Float32Array(TANK_SEGS * 4), segK = new Float32Array(TANK_SEGS);
    for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) arr[i * 4 + k] = all[i * 5 + k]; segK[i] = all[i * 5 + 4]; }

    // ---- the faces, far to near, each a quad on the screen (the near ones win if there are too many)
    const quads = [];
    for (const { P } of drawn) {
      for (const poly of P.polys) {
        const area = poly.scr.reduce((s, q, i, a) => { const w = a[(i + 1) % a.length]; return s + q[0] * w[1] - w[0] * q[1]; }, 0);
        const pts = area < 0 ? poly.scr.slice().reverse() : poly.scr;
        // (cut at the near plane a quad can have five corners: split in two)
        for (let j = 0; j + 2 < pts.length; j += 2) {
          const q = [pts[0], pts[j + 1], pts[j + 2], pts[Math.min(j + 3, pts.length - 1)]];
          quads.push({ q, k: P.kind + Math.min(0.98, poly.shade * fog(P.V.reduce((sum, c) => sum + c[2], 0) / P.V.length)) });
        }
      }
    }
    const faces = quads.slice(-TANK_FACES);
    const fA = new Float32Array(TANK_FACES * 8), fK = new Float32Array(TANK_FACES);
    faces.forEach((F, i) => { fA.set([...F.q[0], ...F.q[1], ...F.q[2], ...F.q[3]], i * 8); fK[i] = F.k; });

    // ---- the bursts, and what they do to the view
    const rel = (x, z) => {
      const dx = x - me.x, dz = z - me.z;
      return [dx * ch - dz * sh, dx * sh + dz * ch];
    };
    const bl = new Float32Array(TANK_BLASTS * 4).fill(-1), blH = new Float32Array(TANK_BLASTS);
    const live = [
      ...this.muzzles.filter((m) => t >= m.t && t - m.t < 0.3).map((m) => ({ ...m, kind: 3 })),
      ...this.blasts.filter((b) => t >= b.t && t - b.t < 6.5),
    ].sort((a, b) => b.t - a.t).slice(0, TANK_BLASTS);
    let sx = 0, sy = 0, roll = 0;
    let lastBlast = 99, lastKind = 0;
    live.forEach((b, i) => {
      const e = t - b.t, [cx, cz] = rel(b.x, b.z);
      bl.set([cx, cz, e, b.kind], i * 4);
      blH[i] = b.y || 0;
      if (b.kind < 3) {
        const shake = (b.kind === 2 ? 1.6 : b.kind === 1 ? 1 : 0.55) * Math.min(1, 16 / Math.max(hypot2(cx, cz), 1)) * Math.exp(-e * 7);
        sx += shake * 0.014 * Math.sin(e * 71); sy += shake * 0.014 * Math.cos(e * 53); roll += shake * 0.016 * Math.sin(e * 37);
        if (e < lastBlast) { lastBlast = e; lastKind = b.kind; }
      }
    });
    // the gun's kick; a lean into a turn; the hull's rock as it rolls
    const shot = recent(this.shots, t, 1)[0];
    const since = shot ? t - shot.t : 99;
    sy += 0.03 * Math.exp(-since * 9);
    roll -= Math.max(-0.05, Math.min(0.05, (this.heading.at(t + 0.06) - this.heading.at(t - 0.06)) / 0.12 * 0.035));
    sy += 0.004 * Math.sin(t / this.grid.spb * Math.PI * 2);

    // ---- the sight on the enemy, and the radar
    let aimAt = [0, 0, 0, -1], aimH = 0, blip = [0, 0, 0, 0], off = 9;
    if (target) {
      const { at, far } = target;
      const dx = at.x - me.x, dz = at.z - me.z, cx = dx * ch - dz * sh, cz = dx * sh + dz * ch;
      blip = [cx, cz, 1, 0];
      off = Math.abs(angDiff(Math.atan2(dx, dz), me.h));
      if (cz > 2) {
        const { lo, hi } = target;
        aimAt = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, Math.min(0.5, (hi[0] - lo[0]) / 2 + 0.018), far];
        aimH = Math.min(0.4, (hi[1] - lo[1]) / 2 + 0.018);
      }
    }
    const shells2 = new Float32Array(8);
    shells2.set(heads.slice(0, 8));
    const md = angDiff(this.moon, me.h);
    return {
      uSeg: { v: arr, kind: '4fv' },
      uSegK: { v: segK, kind: '1fv' },
      uFace: { v: fA, kind: '4fv' },
      uFaceK: { v: fK, kind: '1fv' },
      uTank: { v: [n, Math.max(0, 1 - off / 0.5), since, (this.score - 1000 * this.blasts.filter((b) => b.kind > 0 && b.t > t).length) % 100000], kind: '4f' },
      uTankCam: { v: [wrapTo(me.x, TANK_WORLD / 2), wrapTo(me.z, TANK_WORLD / 2), me.h, faces.length], kind: '4f' },
      uTankFx: { v: [roll, sx, sy, lastBlast < 99 ? lastBlast + lastKind * 100 : 999], kind: '4f' },
      uTarget: { v: aimAt, kind: '4f' },
      uTargetH: { v: aimH, kind: '1f' },
      uBlip: { v: blip, kind: '4f' },
      uMoon: { v: [Math.tan(md) * TANK_F, TANK_HORIZON + 0.25, Math.abs(md) < 0.9 ? 1 : 0, 0], kind: '4f' },
      uTBlasts: { v: bl, kind: '4fv' },
      uTBlastH: { v: blH, kind: '1fv' },
      uTShell: { v: shells2, kind: '4fv' },
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
const SKATE_FOCAL = 1.5, SKATE_DROP_FOCAL = 2.6;     // the chase, wide; the shot from the flat on the drop, long
// the chase: how far behind along the ramp, how far off the surface, how far ahead of the skater it looks; how quickly the camera and its aim catch up (the
// spring's rate, a second), its lean with the wall, and the samples of the skater's recent past that spring is worked out from
const SK_CAM_BACK = 3.4, SK_CAM_OFF = 1.6, SK_CAM_AHEAD = 3, SK_CAM_RATE = 6, SK_CAM_AIM = 8, SK_CAM_LEAN = 0.5, SK_CAM_N = 14, SK_CAM_STEP = 0.07;
// the forces on the wheels: the rolling friction Kogelbauer et al. measured, drag on 0.5 m2 of a 75 kg skater, steel on the coping
const SK_MU = 0.02, SK_DRAG = 0.5 * 1.2 * 0.5 / 75, SK_GRIND = 0.25 * GRAV;
// the centre of mass over the board: at the lip; standing tall, arms up; the most a crossing can raise it from a full crouch
const SK_HLIP = 0.9, SK_HTOP = 1.05, SK_EMAX = 0.55;
const SK_DT = 1 / 120;                               // the physics' fixed step, a second
// up onto the coping the board stops and the body swings up over it, its centre of mass rising some 87 cm: it takes that
// much speed at the lip to get there, in the time the swing takes, and it gives it all back dropping in
const SK_RISE = 0.87, SK_SWING = 1.32, SK_VLIP = Math.sqrt(2 * GRAV * SK_RISE), SK_POP = 2 * SK_SWING * SK_HLIP / SK_VLIP;
const SK_LAP = 2.8;                                  // wall to wall and through the air, peak to peak: as gravity gives it
const SK_TUNE = 0.08;                                // how far a peak may fall from its mark: the eye cannot place a peak any closer
const SK_HOLD = 0.35, SK_HOLD_MAX = 2.2;             // the shortest grind; the longest wait up there

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
 * A crossing, lip to lip, as forces make it: the skater's centre of mass under gravity, rolling friction and drag, a
 * variable-length pendulum on the curves (Kogelbauer et al., "Mechanical optimization of skateboard pumping", Phys.
 * Rev. Research 2024, whose equation and whose friction these are: (L-h)th'' - 2h'th' + g sin th = 0, mu 0.02, the
 * load on the wheels g cos th + (L-h)th'^2), with h the height of the centre of mass over the board. Standing up
 * against the load pumps speed in, crouching under it takes speed out, so `e` is how hard this crossing pumps: above
 * zero crouched from the landing, as low as e asks, and standing up after the lowest point; below zero tall to the
 * bottom and crouching up the far curve, to die away at the lip. It runs left to right; `keep` keeps the path:
 * where the board is along the ramp, h, the speed of the centre of mass and the load, four numbers a step.
 */
function skateRide(v0, e, keep) {
  const hLow = e > 0 ? SK_HTOP - e : SK_HTOP, hEnd = e > 0 ? SK_HTOP : SK_HTOP + e;
  const reach = RAMP_V + RAMP_R * Math.PI * 0.15, HALF_PI = Math.PI / 2;
  const hOf = (ph, q) => {
    if (ph === 0) return SK_HLIP + (hLow - SK_HLIP) * smooth01(q / reach);
    if (ph === 1) return SK_HLIP + (hLow - SK_HLIP) * smooth01((RAMP_V + RAMP_R * (q + HALF_PI)) / reach);
    if (ph === 2) return hLow;
    if (ph === 3) return hLow + (hEnd - hLow) * smooth01((q - 0.02) / 1.05);
    return hEnd + (SK_HLIP - hEnd) * smooth01(q / RAMP_V);
  };
  const out = keep ? [-RAMP_S, SK_HLIP, v0, 0] : null, dt = SK_DT;
  let t = 0, v = v0, ph = 0, q = 0, om = 0, h = SK_HLIP, n = 0;
  for (let i = 0; i < 1200; i++) {
    const was = q;
    if (ph === 1 || ph === 3) {
      const dh = (hOf(ph, q + 1e-3) - hOf(ph, q - 1e-3)) / 2e-3;
      const acc = (o, a) => {
        const r = RAMP_R - hOf(ph, a), N = GRAV * Math.cos(a) + r * o * o;
        return (2 * dh * o * o - GRAV * Math.sin(a) - SK_MU * Math.max(N, 0) - SK_DRAG * r * r * o * o) / r;
      };
      const k = acc(om, q), om2 = om + k * dt / 2;
      q += om2 * dt;
      om += acc(om2, was + om * dt / 2) * dt;
      if (om <= 0) return null;                       // it never got there
      h = hOf(ph, q);
      v = om * (RAMP_R - h);
      n = GRAV * Math.cos(q) + (RAMP_R - h) * om * om;
      if (ph === 1 && q >= 0) { ph = 2; q = -RAMP_F; }
      else if (ph === 3 && q >= HALF_PI) { ph = 4; q = 0; }
    } else if (ph === 2) {
      h = hLow; n = GRAV;
      v += (-SK_MU * GRAV - SK_DRAG * v * v) * dt;
      q += v * dt;
      if (q >= RAMP_F) { ph = 3; q = 0; om = v / (RAMP_R - hOf(3, 0)); }
    } else {
      // the vert: nothing pressing the wheels to it, only gravity along it
      h = hOf(ph, q); n = 0;
      const a = (ph === 0 ? GRAV : -GRAV) - SK_DRAG * v * v;
      const v1 = v + a * dt;
      if (ph === 4 && v1 <= 0) return null;
      q += (v + v1) / 2 * dt;
      v = v1;
      if (ph === 0 && q >= RAMP_V) { ph = 1; q = -HALF_PI; om = v / (RAMP_R - hOf(1, q)); }
      else if (ph === 4 && q >= RAMP_V) {
        const over = (q - RAMP_V) / Math.max(v, 0.1);
        if (!out) return { t: t + dt - over, v, data: null };
        out.push(RAMP_S, SK_HLIP, v, 0);
        // (round a curve the board runs faster than the centre of mass, its radius being the larger; a body eases into
        // that over a moment, so where the curve begins and ends the board's own speed is smoothed over a tenth of a second)
        const data = Float32Array.from(out), N = data.length / 4;
        for (let a = 1; a < N - 1; a++) {
          const w = Math.min(a, N - 1 - a, 6);
          let sum = 0;
          for (let b = a - w; b <= a + w; b++) sum += out[b * 4];
          data[a * 4] = sum / (2 * w + 1);
        }
        return { t: t + dt - over, v, data };
      }
    }
    t += dt;
    if (out) {
      const arc = RAMP_R * HALF_PI;
      const s = ph === 0 ? q - RAMP_S : ph === 1 ? -RAMP_F + RAMP_R * q : ph === 2 ? q : ph === 3 ? RAMP_F + RAMP_R * q : RAMP_F + arc + q;
      out.push(s, h, v, n);
    }
  }
  return null;
}

/** How hard to pump to come up to the far lip at speed v1, and what that crossing takes; null if no pump reaches it. */
function skateArrive(v0, v1) {
  let lo = -SK_EMAX, hi = SK_EMAX;
  const top = skateRide(v0, hi);
  if (!top || top.v < v1) return null;
  const low = skateRide(v0, lo);
  if (low && low.v > v1) return { e: lo, t: low.t, v: low.v };      // (it cannot shed that much: it arrives faster)
  // (the speed at the lip is close to a straight line in e, so a few interpolations find it)
  let best = top, bestE = hi, vLo = low ? low.v : 0, vHi = top.v;
  for (let k = 0; k < 4 && Math.abs(best.v - v1) > 0.01; k++) {
    const m = Math.max(lo + 0.01, Math.min(hi - 0.01, lo + (hi - lo) * (v1 - vLo) / Math.max(vHi - vLo, 1e-3)));
    const r = skateRide(v0, m);
    if (!r || r.v < v1) { lo = m; vLo = r ? r.v : vLo; } else { hi = m; vHi = r.v; }
    if (r) { best = r; bestE = m; }
  }
  return { e: bestE, t: best.t, v: best.v };
}

/**
 * The crossings back up from the coping: dropping in with the speed of that fall, pumping as hard as it can each time. It
 * comes out the same every time, so the time it takes is known before it goes up there: for each crossing, the
 * air it reaches and the time from dropping in to that air's peak.
 */
let skateClimbMemo = null;
function skateClimb() {
  if (skateClimbMemo) return skateClimbMemo;
  skateClimbMemo = [];
  let v = SK_VLIP, sum = 0, half0 = 0;
  for (let k = 0; k < 4; k++) {
    const top = skateRide(v, SK_EMAX);
    const ride = skateArrive(v, Math.sqrt(2 * GRAV * Math.min(2.4, top.v * top.v / (2 * GRAV) * 0.98)));
    const h = ride.v * ride.v / (2 * GRAV), half = Math.sqrt(2 * h / GRAV);
    sum += half0 + ride.t + half;
    skateClimbMemo.push({ ride, h, half, sum });
    v = ride.v; half0 = half;
  }
  return skateClimbMemo;
}

/**
 * The skate park: a vert ramp in a warehouse built to a real one's measures,
 * the skater life size, every metre of it moved by forces. It falls down the
 * wall speeding up, rides fastest across the flat, slows up the far wall, and
 * leaves the lip at the speed that takes it as high as it goes, its centre of
 * mass on a parabola, to land at the speed it left at. Pumping is what keeps
 * it going: friction and drag take about a metre of height from each crossing,
 * and it gains at most some 60 cm over that, so height is built up over a
 * phrase. A crossing's time is gravity's, not the music's: wall to wall and
 * through the air takes 2.7 to 2.9 s, whatever the height and whatever the
 * tempo, as a pendulum keeps its time. So the peak of each air comes on the
 * eighth (or else the sixteenth) nearest, its height chosen to fit, and the time
 * left over in a phrase is spent on the coping, where a skater can wait: a
 * 50-50 along the pipe, slowing on the steel, stalling if it stops. From there
 * it falls back in, and pumps its way up over the crossings left, to a 540 at
 * the top of an accented bar, the combo counted up through the phrase banked. The airs are as before (Wikipedia, "Aerial
 * (skateboarding)"): straight up off the vert, half a turn about the body's own
 * length, a hand on the board's edge.
 */
export class SkateSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'skate-sim');
    this.camPhase = new Rng(this.seed, 'skate-cam').float(0, Math.PI * 2);
    this.clock = 0;
    this.kept = 0;
    this.score = 0;
    this.combo = 0;
    this.sinceGrind = 0;
    this.climb = 0;
    this.climbFrom = 0;
    this.bars = [];               // per lip: {t, side, kind, trick, z, z1, vzIn, vzOut, combo, score, air, h, vOut, spin, ride}
  }

  /** The first accented bar line after t, if any within reach of the planning. */
  nextAccent(t) {
    const bar = this.grid.barSec;
    for (let b = Math.floor(t / bar) + 1, end = b + 256; b < end; b++) {
      if (b * bar > t + 1e-3 && this.grid.isAccent(b * bar)) return b * bar;
    }
    return null;
  }

  /** A lip's place along the ramp and how it moves there: airs drift a little, grinds slide toward the middle. */
  placeLip(hit) {
    const prev = this.bars[this.bars.length - 1];
    const z = Math.max(-2.6, Math.min(2.6, prev.z1 + this.rng.float(-0.8, 0.8)));
    if (hit.kind === 'grind') {
      // both trucks on the steel, slowing as the friction takes it (steel on steel, about 0.25: an assumption); stalled if
      // it stops. It comes up the wall and falls back in at the speed along the pipe it has at each end
      const dir = z > 0 ? -1 : 1, T = hit.air * 2 - 2 * SK_POP;
      const vzIn = Math.min(2.6, SK_GRIND * T + 0.3);
      const vzOut = Math.max(0, vzIn - SK_GRIND * T);
      const stop = Math.min(T, vzIn / SK_GRIND);
      const z1 = z + dir * (vzIn * SK_POP + vzIn * stop - SK_GRIND * stop * stop / 2 + vzOut * SK_POP);
      Object.assign(hit, { z, dirZ: dir, vzIn: dir * vzIn, vzOut: dir * vzOut, z1, slide: T });
      return;
    }
    const drift = (this.rng.bool() ? 1 : -1) * this.rng.float(0.7, 1.3);
    const z1 = Math.max(-3.3, Math.min(3.3, z + drift));
    const vz = (z1 - z) / (2 * hit.air);
    const al = norm3([0, hit.vOut, vz]), end = norm3([0, -hit.vOut, vz]), up = [-hit.side, 0, 0];
    // the turn to bring the board round to where it is going when it lands
    const b = cross3(up, al), base = Math.atan2(dot3(end, b), dot3(end, al));
    const want = hit.trick.dir * hit.trick.turn * Math.PI * 2;
    Object.assign(hit, { z, z1, vzIn: vz, vzOut: vz, al0: al, spin: base + Math.round((want - base) / (Math.PI * 2)) * Math.PI * 2 });
  }

  /** The air to go up into, its height chosen so its peak comes on the nearest eighth or sixteenth, if any height can. */
  planAir(prev, hWant, goalAt) {
    const top = skateRide(prev.vOut, SK_EMAX);
    if (!top) return null;
    const hTop = top.v * top.v / (2 * GRAV) * 0.98;
    const fit = (h) => {
      const a = skateArrive(prev.vOut, Math.sqrt(2 * GRAV * h));
      if (!a) return null;
      const hh = a.v * a.v / (2 * GRAV), half = Math.sqrt(2 * hh / GRAV);
      return { ride: a, h: hh, half, at: prev.t + prev.air + a.t + half };
    };
    const low = Math.min(0.7, hTop), want = Math.max(low, Math.min(hTop, hWant));
    const mid = fit(want);
    if (!mid) return null;
    const near = (g) => Math.round(mid.at / g) * g;
    const e = this.grid.spb / 2;
    const A = fit(low) || mid, B = fit(hTop) || mid;
    for (const goal of goalAt !== undefined ? [goalAt] : [near(e), near(e / 2)]) {
      if (goal < A.at - SK_TUNE || goal > B.at + SK_TUNE) continue;
      let best = goal < A.at ? A : goal > B.at ? B : mid;
      // (the peak's time is close to a straight line in the height)
      if (goal >= A.at && goal <= B.at && Math.abs(mid.at - goal) > 0.01) {
        const [P, Q] = goal < mid.at ? [A, mid] : [mid, B];
        const f = fit(P.h + (Q.h - P.h) * (goal - P.at) / Math.max(Q.at - P.at, 1e-3));
        if (f) best = f;
      }
      return best;
    }
    return mid;
  }

  plan() {
    if (!this.bars.length) {
      // (the run starts on the far wall, already moving)
      const h = 1.1, half = Math.sqrt(2 * h / GRAV);
      this.bars.push({ t: -2 * this.grid.spb - 1.5, side: 1, kind: 'air', trick: AIRS[0], z: 0, z1: 0, vzIn: 0, vzOut: 0, combo: 0, score: 0, air: half, h, vOut: Math.sqrt(2 * GRAV * h), al0: [0, 1, 0], spin: -Math.PI });
    }
    const prev = this.bars[this.bars.length - 1];
    let hit = null;
    if (this.climb > 0) {
      // pumping back up off the coping, each crossing as hard as it can, as worked out when it went up there
      const C = skateClimb()[this.climbFrom - this.climb];
      this.climb--;
      hit = { kind: this.climb === 0 ? 'big' : 'air', trick: this.climb === 0 ? AIR_540 : this.rng.pick(AIRS), f: { ride: C.ride, h: C.h, half: C.half, at: prev.t + prev.air + C.ride.t + C.half } };
    } else {
      const accent = this.nextAccent(prev.t + prev.air + 1);
      const R = accent === null ? 1e9 : accent - prev.t;
      // straight into the accent, if a crossing comes out there
      if (accent !== null && R < 3.6) {
        const f = this.planAir(prev, 2.4, accent);
        if (f && Math.abs(f.at - accent) < SK_TUNE) hit = { kind: 'big', trick: AIR_540, f };
      }
      if (!hit) {
        const a = skateArrive(prev.vOut, SK_VLIP);
        if (a) {
          const reach = prev.t + prev.air + a.t;
          const C = skateClimb();
          let hold = 0;
          // up on the coping, for what time leaves so the crossings back up come out on the accent: as many as fit
          if (accent !== null) {
            for (let m = C.length; m >= 1 && !hold; m--) {
              const w = accent - reach - 2 * SK_POP - C[m - 1].sum;
              if (w >= SK_HOLD && w <= SK_HOLD_MAX) { hold = w; this.climb = m; this.climbFrom = m; }
            }
            // (the time left over is any fraction of a crossing: too long for one wait, it is spent in two if there is room)
            for (let m = C.length; m >= 1 && !hold; m--) {
              const w = accent - reach - 2 * SK_POP - C[m - 1].sum;
              if (w > SK_HOLD_MAX && w < SK_HOLD + SK_LAP) {
                if (R > 14) hold = w / 2;
                else { hold = w; this.climb = m; this.climbFrom = m; }
              }
            }
          }
          // and now and then on a long run with no accent near, for the variety of it
          if (!hold && this.sinceGrind >= 6 && (accent === null || R > 22)) hold = SK_HOLD;
          if (hold) hit = { kind: 'grind', trick: GRIND, f: { ride: a, h: 0, half: SK_POP + hold / 2, at: reach + SK_POP + hold / 2 } };
        }
      }
      if (!hit) {
        // a crossing or three from an accent with no time to wait: each air higher than the last, in step with it
        const k = accent === null ? 0 : Math.round(R / SK_LAP);
        const inStep = k >= 2 && k <= 3 && Math.abs(R - k * SK_LAP) < k * SK_TUNE;
        const want = inStep ? (k === 2 ? 1.9 : 1.4) : this.rng.float(0.9, 1.5);
        const f = this.planAir(prev, want, inStep ? prev.t + R / k : undefined) || this.planAir(prev, 0.7);
        hit = { kind: 'air', trick: this.rng.pick(AIRS), f };
      }
    }
    const { kind, trick, f } = hit;
    this.sinceGrind = kind === 'grind' ? 0 : this.sinceGrind + 1;
    this.combo++;
    if (kind === 'big') this.score += Math.round(this.combo * 250 + trick.pts);
    else this.score += trick.pts;
    const next = { t: f.at, side: -prev.side, kind, trick, combo: this.combo, score: this.score, air: f.half, h: f.h, vOut: kind === 'grind' ? SK_VLIP : Math.sqrt(2 * GRAV * f.h) };
    this.placeLip(next);
    const path = skateRide(prev.vOut, f.ride.e, true);
    prev.ride = { data: path.data, n: path.data.length / 4, dur: f.at - f.half - (prev.t + prev.air) };
    this.bars.push(next);
    if (kind === 'big') this.combo = 0;
    this.clock = f.at;
  }

  advanceTo(t) {
    if (t < this.kept) this.reset();
    while (!this.bars.length || this.clock <= t + 4) this.plan();
    while (this.bars.length > 3 && this.bars[2].t < t - this.grid.barSec) this.bars.shift();
    this.kept = this.bars.length ? Math.max(0, this.bars[0].t) : 0;
  }

  /**
   * The skater at t: where its feet are, the board's direction (al) and the up of its body (up), the trick and how
   * far through it (u), how high above the coping, how deep it crouches, how far it has gone into the trick's own
   * pose (w), and what the ride is doing: the speed of its centre of mass and the load on its legs.
   */
  pose(t) {
    this.advanceTo(t);
    let i = 0;
    while (i + 1 < this.bars.length && this.bars[i + 1].t - this.bars[i + 1].air <= t) i++;
    const A = this.bars[i], B = this.bars[i + 1] || A;
    const dt = t - A.t;
    if (dt <= A.air) {
      const u = Math.max(0, (dt + A.air) / (2 * A.air));
      if (A.kind === 'grind') {
        // a 50-50 on the coping: the board stops against the pipe and the body swings up over it, slowing as it rises, an
        // inverted pendulum; both trucks on the pipe, the board along it, the steel's friction slowing it until it goes
        // back in or, stopped, stalls there; and it topples back in, speeding up as it falls
        const g = u * 2 * A.air, T = A.slide, lean = 0.25;
        const up0 = [-A.side, 0, 0], up1 = norm3([-A.side * Math.sin(lean), Math.cos(lean), 0]);
        const w = g < SK_POP ? 1 - (1 - g / SK_POP) ** 2 : g > SK_POP + T ? 1 - ((g - SK_POP - T) / SK_POP) ** 2 : 1;
        const vIn = Math.abs(A.vzIn), stop = Math.min(T, vIn / SK_GRIND), m = Math.min(Math.max(0, g - SK_POP), stop);
        const z = A.z + A.dirZ * (vIn * Math.min(g, SK_POP) + vIn * m - SK_GRIND * m * m / 2 + Math.abs(A.vzOut) * Math.max(0, g - SK_POP - T));
        const speed = g < SK_POP ? SK_VLIP * (1 - g / SK_POP) : g > SK_POP + T ? SK_VLIP * (g - SK_POP - T) / SK_POP : 0;
        const al0 = norm3([0, g < SK_POP ? speed : -speed, g < SK_POP ? A.vzIn : A.vzOut]);
        return { x: A.side * (RAMP_LIP - 0.05 + 0.05 * w), y: RAMP_TOP + 0.06 * w, z, al: norm3(add3(scale3(al0, 1 - w), scale3([0, 0, A.dirZ], w))), up: norm3(add3(scale3(up0, 1 - w), scale3(up1, w))), h: 0, u, A, crouch: 0.18 + 0.04 * w, mode: 'grind', w, lean: 0, com: 0.9 - 0.022 * w, sliding: g >= SK_POP && g < SK_POP + stop };
      }
      // an air: from here on nothing acts on it but gravity, so its centre of mass goes straight up and comes back down
      // the line it left on, on a parabola, at the speed it left at. Folding up pulls the board in toward the centre of
      // mass, which is what takes it clear of the coping, and the legs reach out for the wall again to land.
      const hgt = A.h * 4 * u * (1 - u);
      const tuck = 0.18 + 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.25));
      const reach = 1 - 0.55 * tuck;
      const x = A.side * (RAMP_LIP - SK_HLIP + reach - 0.05);
      return { x, y: RAMP_TOP + hgt, z: A.z + (A.z1 - A.z) * u, al: A.al0, up: [-A.side, 0, 0], h: hgt, u, A, crouch: tuck, mode: 'air', w: smooth01(Math.min(u, 1 - u) / 0.15), lean: 0, com: reach, spin: A.spin };
    }
    // riding from A's lip to B's, along the path the forces gave it
    const t0 = A.t + A.air, t1 = B.t - B.air, R = A.ride;
    const dur = R.dur, since = Math.max(0, t - t0);
    const k = Math.min(R.n - 2, Math.floor(since / SK_DT)), span = k === R.n - 2 ? Math.max(dur - k * SK_DT, 1e-4) : SK_DT;
    const g = Math.min(1, (since - k * SK_DT) / span), D = R.data, at = (c) => D[k * 4 + c] + (D[(k + 1) * 4 + c] - D[k * 4 + c]) * g;
    const s = B.side * at(0), hc = at(1), speed = at(2), load = at(3);
    const p = rampPoint(s);
    const ds = (D[(k + 1) * 4] - D[k * 4]) / span;              // the board's own speed: faster than its centre of mass round a curve
    const tang = rampPoint(s + B.side * 0.01);
    const tx = tang.x - p.x, ty = tang.y - p.y, tl = Math.hypot(tx, ty) || 1;
    // the wheels roll where they point, so the board points along its velocity: up the wall and along it, carving
    const u = (t - t0) / dur;
    const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    const z = h00 * A.z1 + h10 * dur * A.vzOut + h01 * B.z + h11 * dur * B.vzIn;
    const vz = (6 * u * u - 6 * u) * A.z1 / dur + (3 * u * u - 4 * u + 1) * A.vzOut + (-6 * u * u + 6 * u) * B.z / dur + (3 * u * u - 2 * u) * B.vzIn;
    const al = norm3([tx / tl * Math.max(ds, 0.3), ty / tl * Math.max(ds, 0.3), vz]);
    const crouch = Math.max(0, (1 - hc) / 0.55);
    // on the wheels the skater feels gravity and the curve together, square to the surface: the board's slowing and
    // speeding up is gravity's own and cancels, so only friction and drag lean it into the ride, a very little
    const lean = (SK_MU * Math.max(load, 0) + SK_DRAG * speed * speed) / Math.max(load, 3);
    return { x: p.x + p.nx * 0.05, y: p.y + p.ny * 0.05, z, al, up: [p.nx, p.ny, 0], h: 0, u, A, crouch, mode: 'ride', w: 0, lean, com: hc, speed, load, s, dir: B.side };
  }

  /**
   * Where the chase wants the camera for the skater as it is at one moment: behind it along the ramp the way it is going
   * and off the surface, so it looks down the wall from above as the skater falls away, along the flat, and up the far
   * wall from below, always looking a little ahead, so the skater rides the lower half of the frame and the upper shows
   * where it is going; in an air the way it is going turns over at the top, so the camera passes under it, close, and
   * looks at it alone. On the coping, behind it along the pipe.
   */
  chase(Q, t) {
    const zOff = 1.6 * Math.sin(t * 0.21 + this.camPhase);
    const aim = [Q.x + Q.up[0] * 0.85, Q.y + Q.up[1] * 0.85, Q.z];
    const lean = [0, 1, SK_CAM_LEAN * Q.up[0]];
    if (Q.mode === 'grind') {
      // (swinging round behind it as it comes up onto the pipe, back again as it drops in)
      const A = Q.A, sense = 1 - 2 * Q.u, ride = this.behind(A.side * RAMP_S, A.side * sense);
      const g = [A.side * (RAMP_LIP - 1.9), RAMP_TOP + 1.2, Q.z - A.dirZ * 4.2];
      const w = Q.w;
      return { eye: [ride[0] + (g[0] - ride[0]) * w, ride[1] + (g[1] - ride[1]) * w, Q.z + zOff * (1 - w) + (g[2] - Q.z) * w], aim: add3(aim, [0, 0.2 * w + SK_CAM_AHEAD * sense * (1 - w), A.dirZ * 2.5 * w]), lean: [0, 1, 0.12 * A.side * w] };
    }
    if (Q.mode === 'air') {
      const sense = 1 - 2 * smooth01((Q.u - 0.3) / 0.4);
      const e = this.behind(Q.A.side * RAMP_S, Q.A.side * sense);
      // (standing off a little further as it passes under, or the skater would overflow the frame)
      return { eye: [e[0] - Q.A.side * 0.9 * Q.w, e[1] + Q.h * 0.55, Q.z + zOff], aim: add3(aim, [0, SK_CAM_AHEAD * sense * (1 - Q.w), 0]), lean };
    }
    const e = this.behind(Q.s, Q.dir);
    return { eye: [e[0], e[1], Q.z + zOff], aim: add3(aim, scale3(Q.al, SK_CAM_AHEAD)), lean };
  }

  /** The point behind a place along the ramp, going that way, off the surface; past the lip, straight on up. */
  behind(s, dir) {
    const es = s - dir * SK_CAM_BACK, a = Math.abs(es);
    if (a > RAMP_S) {
      const side = Math.sign(es);
      return [side * (RAMP_LIP - SK_CAM_OFF), RAMP_TOP + (a - RAMP_S)];
    }
    const p = rampPoint(es);
    return [p.x + p.nx * SK_CAM_OFF, p.y + p.ny * SK_CAM_OFF];
  }

  /**
   * The camera, chasing as the skateboarding games of the late 90s chased (seen in their footage): always behind the
   * skater, no cuts while it rides, leaning with the wall, the skater kept near the middle of the frame. It has weight:
   * it follows a critically damped spring, so it falls behind when the skater speeds up, and the skater flying up off
   * the wall comes right at it. That spring is worked out from the skater's recent past, a weighted sum, not stepped
   * from frame to frame, so scrubbing gives the same picture. One cut, for the music: from the beat before the air on
   * the drop to the beat after its landing, a long lens low on the flat looks up at it.
   */
  camera(t) {
    const eye = [0, 0, 0], aim = [0, 0, 0], lean = [0, 0, 0];
    let we = 0, wa = 0;
    for (let k = 0; k < SK_CAM_N; k++) {
      const tau = (k + 0.5) * SK_CAM_STEP, at = Math.max(0, t - tau);
      const c = this.chase(this.pose(at), at);
      const ke = tau * Math.exp(-SK_CAM_RATE * tau), ka = tau * Math.exp(-SK_CAM_AIM * tau);
      for (let j = 0; j < 3; j++) { eye[j] += c.eye[j] * ke; lean[j] += c.lean[j] * ke; aim[j] += c.aim[j] * ka; }
      we += ke; wa += ka;
    }
    for (let j = 0; j < 3; j++) { eye[j] /= we; lean[j] /= we; aim[j] /= wa; }
    eye[2] = Math.max(-4.5, Math.min(4.5, eye[2]));
    let focal = SKATE_FOCAL;
    const now = this.pose(t), spb = this.grid.spb;
    for (const b of this.bars) {
      if (b.kind !== 'big') continue;
      const from = Math.floor((b.t - b.air - 0.15) / spb) * spb, to = Math.ceil((b.t + b.air + 0.05) / spb) * spb;
      if (t < from || t >= to) continue;
      const dz = b.z1 >= b.z ? -1 : 1;
      // (it follows the skater as a camera operator would, with no lag to speak of: on a long lens any would lose it)
      eye[0] = b.side * (RAMP_LIP - 4.6) + b.side * 0.2 * (t - from);
      eye[1] = 0.9;
      eye[2] = Math.max(-4.5, Math.min(4.5, b.z + dz * 2.2));
      aim[0] = now.x + now.up[0] * 0.5; aim[1] = now.y + now.up[1] * 0.5; aim[2] = now.z;
      lean[0] = 0; lean[1] = 1; lean[2] = 0;
      focal = SKATE_DROP_FOCAL;
    }
    const f = norm3(sub3(aim, eye));
    let r = cross3(f, lean);
    if (Math.hypot(r[0], r[1], r[2]) < 0.15) r = cross3(f, [0.5, 0.5, 0.7]);
    r = norm3(r);
    return { eye, f, r, u: cross3(r, f), focal };
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
    if (P.mode === 'air') al = rotateAxis(al, up, P.spin * smooth01(P.u));
    const trickPose = P.mode === 'ride' ? null : P.mode;
    const w = trickPose ? P.w : 0;                 // how far it has gone from its riding pose into the trick's, so no limb jumps
    const toe = norm3(cross3(up, al));              // the toe edge's side: where the chest faces
    const base = [P.x, P.y, P.z];
    const L = (a, h, c) => [base[0] + (al[0] * a + up[0] * h + toe[0] * c) * K, base[1] + (al[1] * a + up[1] * h + toe[1] * c) * K, base[2] + (al[2] * a + up[2] * h + toe[2] * c) * K];
    const cr = P.crouch;
    const grab = P.mode === 'air' && tr.hand ? Math.sin(Math.PI * Math.min(1, Math.max(0, (P.u - 0.12) / 0.76))) : 0;
    // the board: in a method pulled up behind the back, in a melon pushed out in front
    let dh = 0, dc = 0;
    if (P.mode === 'air') { dh = cr * 0.9 * w; if (tr.method) { dh += 0.25 * grab; dc -= 0.3 * grab; } if (tr.tweak) dc += tr.tweak * 0.3 * grab; }
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
    // the trunk: bent over the toes as the skater crouches, and into the ride only as far as friction and drag push
    // it (gravity along the ramp speeds the board and the body alike, so it does not lean them); the shoulders turned
    // toward the way it rides (the hips stay square to the board, so the trunk twists between them), as skaters ride a
    // ramp in the motion-capture study's photographs
    const lean = 0.08 + cr * 0.35, fore = P.lean;
    const tUp = norm3(add3(add3(scale3(up, Math.cos(lean)), scale3(toe, Math.sin(lean))), scale3(al, fore)));
    const twist = 0.42 + ((trickPose === 'grind' ? 0.3 : trickPose === 'air' ? 0.15 : 0.42) - 0.42) * w;
    const sa = rotateAxis(al, tUp, -twist), chest = norm3(cross3(tUp, sa));
    const shC = add3(pelvis, scale3(tUp, 0.56 * K));
    const shF = add3(shC, scale3(sa, 0.19 * K)), shB = add3(shC, scale3(sa, -0.19 * K));
    const neck = add3(shC, scale3(tUp, 0.07 * K));
    const head = add3(add3(shC, scale3(tUp, 0.215 * K)), scale3(chest, 0.015 * K));
    put(pelvis, neck, 0.13, 2);
    // the arms as counterweights, not alike: the leading one reaching forward and up the way it rides, the trailing
    // one back and down; both rising as the skater stands and dropping as it crouches; out wide in the air
    const rideRise = Math.min(1, Math.max(0, 1 - cr / 0.7));
    const rise = rideRise + ((trickPose === 'grind' ? 0.6 : trickPose === 'air' ? 0.8 : rideRise) - rideRise) * w;
    const sway = 0.05 * Math.sin(t * 2.1);
    let hF = add3(shF, add3(scale3(sa, 0.34 * K), add3(scale3(tUp, (-0.3 + 0.32 * rise + sway) * K), scale3(chest, 0.16 * K))));
    let hB = add3(shB, add3(scale3(sa, -0.26 * K), add3(scale3(tUp, (-0.42 + 0.12 * rise - sway) * K), scale3(chest, -0.06 * K))));
    if (trickPose === 'air') { hF = lerp3(hF, add3(shF, add3(scale3(sa, 0.38 * K), scale3(tUp, 0.05 * K))), w); hB = lerp3(hB, add3(shB, add3(scale3(sa, -0.36 * K), scale3(tUp, -0.1 * K))), w); }
    if (trickPose === 'grind') { hF = lerp3(hF, add3(shF, add3(scale3(sa, 0.42 * K), scale3(tUp, -0.12 * K))), w); hB = lerp3(hB, add3(shB, add3(scale3(sa, -0.4 * K), scale3(tUp, -0.22 * K))), w); }
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
    // what the shader would otherwise work out over and over for each pixel: the body's frames, and a sphere about all of it
    const tu = norm3(sub3(joints[5], hp)), sa = norm3(sub3(joints[6], joints[7])), hu = norm3(sub3(joints[12], joints[5]));
    const face = norm3(add3(scale3(board.al, 0.75), scale3(board.toe, 0.65)));
    const V = [tu, norm3(cross3(board.al, tu)), sa, norm3(cross3(sa, tu)), hu, face, norm3(cross3(hu, face))];
    const pts = [...joints, add3(board.c, scale3(board.al, 0.45)), add3(board.c, scale3(board.al, -0.45))];
    const lo = [0, 1, 2].map((a) => Math.min(...pts.map((q) => q[a]))), hi = [0, 1, 2].map((a) => Math.max(...pts.map((q) => q[a])));
    const mid = lerp3(lo, hi, 0.5);
    const radius = Math.sqrt(Math.max(...pts.map((q) => dot3(sub3(q, mid), sub3(q, mid))))) + 0.3;
    return {
      uSkV: { v: Float32Array.from(V.flatMap((q) => [...q, 0])), kind: '4fv' },
      uSkBound: { v: [...mid, radius], kind: '4f' },
      uSkJ: { v: J, kind: '4fv' },
      uSkB: { v: Float32Array.from([...board.c, 0, ...board.al, 0, ...board.up, 0, ...board.toe, 0]), kind: '4fv' },
      uSkHip: { v: [hp[0], hp[1], hp[2], P.h], kind: '4f' },
      uSkShadow: { v: [P.x, P.y - P.h, P.z, P.sliding ? 1 : 0], kind: '4f' },
      uCamE: { v: [...C.eye, C.focal], kind: '4f' },
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
const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function rotateAxis(v, k, ang) {
  // Rodrigues: v turned by ang about the unit axis k
  const c = Math.cos(ang), s = Math.sin(ang), kv = cross3(k, v), kd = dot3(k, v);
  return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)];
}

// ---------------------------------------------------------------------------
// The artillery: two teams on an island, every shot a real flight
// ---------------------------------------------------------------------------

export const ART_CRATERS = 64;
export const ART_BEETLES = 10;
const ART_DT = 1 / 240;                     // the physics' fixed step, a second
const ART_FRAME = 4;                        // a frame kept for the screen every so many steps
const ART_G = 500;                          // gravity, world units a second squared (a beetle's radius is 9 units)
const ART_WIND = 250;                       // the strongest wind: half of gravity, on what feels it
const ART_VMAX = 1000;                      // the hardest launch
const ART_HP = 60;
const ART_HALF = 820;                       // the island reaches this far each way
const ART_R = 9;                            // a beetle's radius
const ART_APART = 130;                      // each side keeps this far from the island's middle
// How far from its own side a shot may be meant to go off: past a blast's reach, or a scatter's
const ART_KEEP = { missile: 104, homing: 104, grenade: 104, mortar: 70, cluster: 170, air: 170 };

// What flies, and the beetles. r: its radius; e, f: what a bounce keeps of the speed along the surface's normal and along the
// surface; wind: whether the wind pushes it; blast: the crater's radius; bias: how far under it the blast's push
// comes from, a share of the blast, so what it hits is thrown upward; contact: it goes off on touching the
// ground (or else on its fuse, bouncing until then).
const ART_ARMS = {
  missile: { id: 1, r: 4, e: 0.8, f: 0.8, wind: true, blast: 50, bias: 0, contact: true, trail: 0.035 },
  homing: { id: 2, r: 4, e: 0.8, f: 0.8, wind: true, blast: 50, bias: 0, contact: true, trail: 0.03 },
  mortar: { id: 3, r: 4, e: 0.2, f: 0.08, wind: false, blast: 20, bias: 0, contact: true, trail: 0.09 },
  grenade: { id: 4, r: 5, e: 0.8, f: 0.8, wind: false, blast: 50, bias: 0, contact: false },
  cluster: { id: 5, r: 5, e: 0.8, f: 0.8, wind: false, blast: 20, bias: 0, contact: false },
  piece: { id: 6, r: 2, e: 0.8, f: 0.8, wind: false, blast: 25, bias: 0, contact: true },
  pod: { id: 7, r: 5, e: 0.55, f: 0.995, wind: false, blast: 30, bias: 0.5, contact: true, trail: 0.08 },
  beetle: { id: 0, r: ART_R, e: 0.35, f: 0.85, wind: false, blast: 30, bias: 0, contact: false, grip: 70 },
  tomb: { id: 0, r: 5, e: 0.2, f: 0.5, wind: false, blast: 0, bias: 0, contact: false },
};

/** The ground before any crater: an island of slow waves, the round's; the same sum the shader draws. */
function artGround(x, k) {
  let e = Math.min(1, Math.max(0, (ART_HALF - Math.abs(x)) / 260));
  e = e * e * (3 - 2 * e);
  return -90 + e * (230 + 70 * Math.cos(x * 0.0061 + k[0]) + 46 * Math.sin(x * 0.0137 + k[1]) + 20 * Math.sin(x * 0.031 + k[2])
    + 8 * Math.sin(x * 0.083 + k[0]) + 80 * k[3] * Math.exp(-x * x / 90000));
}

const ART_RING = [...Array(8)].map((_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
const ART_FAN = [...Array(16)].map((_, i) => [Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
const artEase = (u) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };

/**
 * The artillery: two teams of five little beetles on an island, seen from the
 * side, as the turn-based artillery games of the PC played it. Everything is
 * simulated at a fixed step: gravity on all that flies, the wind on shells,
 * bounces off the ground's real slope, fuses, blasts that dig the ground and
 * throw beetles, who fly, bounce, are hurt by a long fall and drown in the sea.
 * One side holds each end of the island, with open ground between, and every
 * shot is meant for the other side: it goes astray only as a real one would,
 * the wind misjudged or a throw slipping, its bounces going where they go.
 *
 * The music holds because the shooter solves the shot with the same physics:
 * it runs the flight ahead, and what it can choose - the launch, the fuse, the
 * moment of firing - it chooses so that the blast lands on the snare, or on the
 * drop's downbeat for the big ones. Nothing is moved in flight to make it fit.
 *
 * A turn: the camera closes in on the shooter, pulls back to frame the whole
 * shot while trial arcs show the sum being done (the first ignoring the wind,
 * the last allowing for it), follows the shell, closes in for the blast, follows
 * whoever is thrown, and pulls back to the whole island.
 */
export class ArtillerySim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'artillery-sim');
    this.step = 0;
    this.simT = 0;
    this.frames = [];
    this.events = [];
    this.shells = [];
    this.puffs = [];
    this.booms = [];
    this.pops = [];
    this.rounds = [];
    this.turnSide = this.rng.int(0, 1);
    this.lastArm = '';
    this.windScroll = 0;
    this.pendingDeath = false;
    this.nextRoundAt = undefined;
    this.cam = { x: 0, y: 260, z: 960 };
    this.follow = null;
    this.focus = null;
    this.newRound(0);
    this.keepFrame();
  }

  // ---- the ground -----------------------------------------------------------

  solid(x, y) {
    if (y >= artGround(x, this.k)) return false;
    for (const c of this.holes) {
      const dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy < c.r * c.r) return false;
    }
    return true;
  }

  touching(x, y, r) {
    if (y - 2.5 * r > artGround(x, this.k)) return false;
    if (this.solid(x, y)) return true;
    for (const d of ART_RING) if (this.solid(x + d[0] * r, y + d[1] * r)) return true;
    return false;
  }

  /** Which way the ground faces at a point touching it: away from what is solid round it. */
  normalAt(x, y, r) {
    let nx = 0, ny = 0;
    for (const d of ART_FAN) if (this.solid(x + d[0] * (r + 2), y + d[1] * (r + 2))) { nx -= d[0]; ny -= d[1]; }
    const l = Math.hypot(nx, ny);
    return l > 1e-6 ? [nx / l, ny / l] : [0, 1];
  }

  // ---- one step of anything that flies --------------------------------------

  body(kind, x, y, vx, vy, extra = {}) {
    return { kind, arm: ART_ARMS[kind], x, y, vx, vy, age: 0, rest: false, ...extra };
  }

  /** One step of a body under gravity and the wind, bounced off the ground. Says what ended it, if anything did. */
  stepBody(b) {
    const a = b.arm, dt = ART_DT;
    let ax = a.wind ? (b.windAs !== undefined ? b.windAs : this.wind) : 0, ay = -ART_G;
    // a homing shell flies as any other for its first second, then drives straight at its mark
    if (b.kind === 'homing' && b.age >= 1) {
      const dx = b.tx - b.x, dy = b.ty - b.y, l = Math.hypot(dx, dy) || 1, k = Math.min(1, 9 * dt);
      b.vx += (dx / l * b.speed - b.vx) * k;
      b.vy += (dy / l * b.speed - b.vy) * k;
      ax = 0; ay = 0;
    }
    const nx = b.x + b.vx * dt + 0.5 * ax * dt * dt, ny = b.y + b.vy * dt + 0.5 * ay * dt * dt;
    const vx = b.vx + ax * dt, vy = b.vy + ay * dt;
    b.age += dt;
    if (Math.abs(nx) > 1700 || ny > 2600) return 'out';
    if (ny - a.r < this.water) {
      // fast and flat enough, it skips off the sea; otherwise the sea has it
      const sp = Math.hypot(vx, vy);
      if (vy < 0 && sp > 500 && Math.abs(vx) > 1.9 * Math.abs(vy)) {
        b.x = nx; b.y = this.water + a.r; b.vx = vx * 0.87; b.vy = -vy * 0.87;
        return 'skip';
      }
      b.x = nx; b.y = ny; b.vx = vx; b.vy = vy;
      return 'water';
    }
    if (!this.touching(nx, ny, a.r)) { b.x = nx; b.y = ny; b.vx = vx; b.vy = vy; return null; }
    if (a.contact) { b.x = nx; b.y = ny; b.vx = vx; b.vy = vy; return 'hit'; }
    // the bounce: the speed into the ground turned back and cut, the speed along it dragged
    const [gx, gy] = this.normalAt(nx, ny, a.r);
    const vn = vx * gx + vy * gy;
    // already leaving this surface (out from under a roof, off a wall): it goes on and only feels it again if it comes back
    if (vn >= 0) { b.x = nx; b.y = ny; b.vx = vx; b.vy = vy; return null; }
    const drag = vn < -30 ? a.f : Math.pow(a.f, 4);     // once for a bounce, every step while it rolls
    const tx = (vx - vn * gx) * drag, ty = (vy - vn * gy) * drag;
    b.vx = tx - vn * a.e * gx; b.vy = ty - vn * a.e * gy;
    // it slides on along the surface if there is room; wedged with no way on, it has stopped
    const sx = b.x + b.vx * dt, sy = b.y + b.vy * dt;
    if (!this.touching(sx, sy, a.r)) { b.x = sx; b.y = sy; b.stuck = 0; } else {
      if (this.touching(b.x, b.y, a.r)) { b.x += gx * 0.6; b.y += gy * 0.6; }
      b.stuck = (b.stuck || 0) + 1;
    }
    // what comes slowly to a slope it can hold stays there; a beetle holds on harder than a rolling grenade
    if ((Math.hypot(b.vx, b.vy) < (a.grip && gy > 0.55 ? a.grip : 20) && gy > 0.2) || b.stuck > 24) { b.vx = 0; b.vy = 0; b.rest = true; }
    return 'bounce';
  }

  /** The flight ahead, by the same steps the real one will take: where it ends, when, and its path. */
  fly(kind, x, y, vx, vy, limit, extra = {}) {
    const b = this.body(kind, x, y, vx, vy, extra);
    const path = [[x, y]];
    let end = 'time', n = 0;
    while (b.age < limit) {
      const r = this.stepBody(b);
      if (++n % 4 === 0) path.push([b.x, b.y]);
      if (r === 'hit' || r === 'water' || r === 'out') { end = r; break; }
      if (b.rest) { end = 'rest'; break; }
    }
    path.push([b.x, b.y]);
    return { t: b.age, x: b.x, y: b.y, end, path, vx: b.vx, vy: b.vy };
  }

  // ---- the blast ------------------------------------------------------------

  /** A blast: it digs the ground and hurts and throws what is near it, harder the nearer. */
  explode(x, y, R, biasShare, t) {
    if (R <= 0) return;
    let near = false;
    for (const d of ART_FAN) if (this.solid(x + d[0] * R, y + d[1] * R)) { near = true; break; }
    if (near || this.solid(x, y)) this.holes.push({ t, x, y, r: R, cave: false });
    this.booms.push({ t, x, y, blast: R });
    const cy = y - biasShare * R, base = 2 * R + 4;
    let thrown = null, most = 0;
    for (const s of this.beetles) {
      if (s.state === 'gone') continue;
      s.rest = false;     // what stood on this ground may have nothing under it now
      if (s.state === 'drown' || s.state === 'tomb') continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d >= base) continue;
      const dmg = Math.min(Math.floor((base - d) / 2), R);
      if (dmg <= 1) continue;
      s.hp -= dmg;
      this.pops.push({ t, x: s.x, y: s.y + 22, v: dmg });
      // thrown from a point a little under the blast when the weapon says so; the push grows with the harm
      const dx = s.x - x, dy = s.y - cy, l = Math.hypot(dx, dy);
      const ux = l > 1e-3 ? dx / l : 0, uy = l > 1e-3 ? dy / l : 1;
      const push = (5 * dmg + 10) * 1.41;
      s.vx += ux * push;
      s.vy += uy * push;
      s.flung = true;
      s.spin = (ux >= 0 ? -1 : 1) * push * 0.05;
      if (push > most) { most = push; thrown = s; }
    }
    if (thrown) this.follow = thrown;
    this.focus = { t, x, y };
  }

  /** The stream of pieces a cluster throws up, each landing on its own eighth note of the music. */
  throwPieces(b, t) {
    const first = this.grid.next(t + 0.32, 2);
    for (let i = 0; i < 5; i++) {
      const land = first + i * 2 * this.grid.six;
      const vx = this.rng.float(-100, 100) + b.vx / 5;
      // the throw is found by running it: the ground under it is uneven, so a few tries, keeping the closest
      let vy = ART_G * (land - t) / 2, best = vy, gap = Infinity;
      for (let k = 0; k < 7 && gap > 0.006; k++) {
        const run = this.fly('piece', b.x, b.y + 6, vx, vy, 4);
        if (run.end !== 'hit') { vy *= 0.8; continue; }
        const miss = (land - t) - run.t;
        if (Math.abs(miss) < gap) { gap = Math.abs(miss); best = vy; }
        vy += ART_G * miss / 2;
      }
      this.shells.push(this.body('piece', b.x, b.y + 6, vx, best));
    }
  }

  burst(b, t) {
    this.explode(b.x, b.y, b.arm.blast, b.arm.bias, t);
    if (b.kind === 'cluster') this.throwPieces(b, t);
    if (b.kind === 'mortar') {
      // bomblets thrown back the way it came
      const gx = -b.vx * 0.2, gy = -b.vy * 0.2;
      for (let i = 0; i < 5; i++) this.shells.push(this.body('piece', b.x - b.vx * 0.012, b.y - b.vy * 0.012 + 3, gx + this.rng.float(-30, 30), gy + this.rng.float(-30, 30) + 90));
    }
  }

  // ---- a round --------------------------------------------------------------

  newRound(t) {
    const r = this.rng;
    this.water = 0;
    this.waterGoal = 0;
    this.turns = 0;
    this.lastFlyer = -9;
    this.turn = null;
    this.over = false;
    this.follow = null;
    this.focus = null;
    this.wind = r.float(-0.7, 0.7) * ART_WIND;
    this.shells = [];
    // an island with room for both sides: one to each end of it, a stretch of open ground between them, so that every
    // shot has a distance to cross
    let sides;
    for (let tries = 0; tries < 30; tries++) {
      this.k = [r.float(0, 6.28), r.float(0, 6.28), r.float(0, 6.28), r.float(0.3, 1)];
      this.holes = [];
      // caves the sea and the years cut, so the land is all arches, tunnels and overhangs before anyone fires
      for (let i = r.int(5, 8); i > 0; i--) {
        const x = r.float(-640, 640), g = artGround(x, this.k);
        this.holes.push({ t: -1e9, x, y: g - r.float(18, 105), r: r.float(26, 78), cave: true });
      }
      sides = [-1, 1].map((sign) => {
        const spots = [];
        for (let gap = 75; gap >= 30 && spots.length < 5; gap -= 15) {
          for (let n = 0; n < 60 && spots.length < 5; n++) {
            const x = sign * r.float(ART_APART, ART_HALF - 235);
            if (this.surfaceY(x, -1e9) < this.water + 45 || spots.some((q) => Math.abs(q - x) < gap)) continue;
            spots.push(x);
          }
        }
        return spots;
      });
      if (sides[0].length === 5 && sides[1].length === 5) break;
    }
    this.round = { t, k: this.k, holes: this.holes };
    this.rounds.push(this.round);
    while (this.rounds.length > 2) this.rounds.shift();
    // they drop in, each facing the other side
    this.beetles = [];
    sides.forEach((spots, team) => {
      for (const x of spots) {
        const s = this.body('beetle', x, artGround(x, this.k) + 120 + r.float(0, 60), 0, 0);
        this.beetles.push(Object.assign(s, { team, hp: ART_HP, state: 'live', face: team ? -1 : 1, rot: 0, spin: 0, aim: 0.5, flung: false, dropping: true }));
      }
    });
    this.nextTurn = (Math.floor((t + 1.6) / this.grid.barSec) + 1) * this.grid.barSec;
  }

  aliveOf(team) { return this.beetles.filter((s) => s.team === team && s.state === 'live' && s.hp > 0); }

  /** The snare's beats between two times: the even beats of the bar, counting from one. */
  snares(a, b) {
    const beats = Math.max(1, Math.round(this.grid.steps / 4)), out = [];
    for (let bar = Math.floor(a / this.grid.barSec); bar * this.grid.barSec <= b; bar++) {
      for (let i = 1; i < beats; i += 2) {
        const t = bar * this.grid.barSec + i * this.grid.spb;
        if (t >= a && t <= b) out.push(t);
      }
    }
    return out;
  }

  accentIn(a, b) {
    const bar = this.grid.barSec;
    for (let n = Math.ceil(a / bar); n * bar <= b; n++) if (this.grid.isAccent(n * bar)) return n * bar;
    return null;
  }

  pickArm(big) {
    const r = this.rng;
    if (big) {
      // a big moment gets a big arm, the dragonfly no more than one turn in three
      const pool = ['cluster', 'cluster', 'grenade', 'missile'].filter((q) => q !== this.lastArm);
      if (this.turns - this.lastFlyer >= 3) pool.push('air', 'air');
      return r.pick(pool);
    }
    const pool = ['missile', 'missile', 'grenade', 'grenade', 'homing', 'mortar', 'cluster'].filter((q) => q !== this.lastArm);
    return r.pick(pool);
  }

  // ---- solving a shot -------------------------------------------------------

  /** A launch from a point that reaches another in T seconds under gravity and the wind it allows for. */
  launch(x0, y0, x1, y1, T, wind) {
    return [(x1 - x0 - 0.5 * wind * T * T) / T, (y1 - y0 + 0.5 * ART_G * T * T) / T];
  }

  /** Whether a blast there leaves the shooter's whole side out of its reach; how far is the arm's to say. */
  clearOfOwn(team, x, y, kind) {
    const keep = ART_KEEP[kind];
    for (const q of this.beetles) if (q.team === team && q.state === 'live' && Math.hypot(q.x - x, q.y - y) < keep) return false;
    return true;
  }

  /** The launch that really leaves: what was aimed, and how it slipped from the hand. */
  released(best, kind, limit, err) {
    best.avx = best.vx; best.avy = best.vy;
    best.vx *= 1 + err.slip; best.vy *= 1 + err.slip;
    best.run = this.fly(kind, best.x, best.y, best.vx, best.vy, limit);
    return best;
  }

  /**
   * Aim a shell that goes off on touching, at a mark on the other side and never back over the shoulder: the landing
   * beat, the launch, and the moment of firing so that they meet. The aim allows for the wind as the shooter judges it,
   * which may be wrong; the moment of firing comes from the flight as it will really be, so the blast still keeps time.
   */
  solveDirect(kind, s, tx, ty, earliest, lands, err) {
    const arm = ART_ARMS[kind], est = arm.wind ? this.wind * (1 + err.wind) : 0, dir = Math.sign(tx - s.x) || 1;
    let best = null;
    for (const land of lands) {
      const T = land - earliest;
      const raw = this.launch(s.x, s.y + 4, tx, ty, T, est);
      const sp = Math.hypot(raw[0], raw[1]);
      if (sp > ART_VMAX || sp < 60 || raw[0] * dir <= 0) continue;
      const mx = s.x + raw[0] / sp * 16, my = s.y + 4 + raw[1] / sp * 16;
      const [vx, vy] = this.launch(mx, my, tx, ty, T, est);
      const seen = this.fly(kind, mx, my, vx, vy, T + 2, { windAs: est });
      const miss = Math.abs(seen.x - tx) + 0.5 * Math.abs(seen.y - ty) + (seen.end === 'hit' && seen.t > T * 0.6 ? 0 : 400);
      if (!this.clearOfOwn(s.team, seen.x, seen.y, kind) || (seen.x - s.x) * dir < 40) continue;
      if (!best || miss < best.miss) best = { miss, land, x: mx, y: my, vx, vy, seen, est, T };
      if (miss < 24) break;
    }
    if (!best || best.miss >= 160) return null;
    return this.released(best, kind, best.T + 4, err);
  }

  /** Aim what goes off on a fuse: try throws, and pick the one whose bounces leave it nearest its mark when the fuse ends. */
  solveFused(kind, s, tx, ty, earliest, lands, err) {
    const dir = Math.sign(tx - s.x) || 1;
    let best = null;
    search: for (const land of lands) {
      const fuse = land - earliest;
      for (const T of [0.5, 0.75, 1.0, 1.3, 1.7]) {
        if (T > fuse) continue;
        for (const back of [0, 50, 100, 170]) {
          const lx = tx - dir * back, ly = artGround(lx, this.k);
          const raw = this.launch(s.x, s.y + 4, lx, ly, T, 0);
          const sp = Math.hypot(raw[0], raw[1]);
          if (sp > ART_VMAX || sp < 60 || raw[0] * dir <= 0) continue;
          const mx = s.x + raw[0] / sp * 16, my = s.y + 4 + raw[1] / sp * 16;
          const [vx, vy] = this.launch(mx, my, lx, ly, T, 0);
          const seen = this.fly(kind, mx, my, vx, vy, fuse);
          if (!this.clearOfOwn(s.team, seen.x, seen.y, kind) || (seen.x - s.x) * dir < 40) continue;
          const miss = Math.abs(seen.x - tx) + 0.5 * Math.abs(seen.y - ty) + (seen.end === 'water' || seen.end === 'out' ? 400 : 0);
          if (!best || miss < best.miss) best = { miss, land, x: mx, y: my, vx, vy, seen, fuse };
          if (miss < 18) break search;       // near enough: the rest of the tries would only cost a frame
        }
      }
    }
    if (!best || best.miss >= 260) return null;
    return this.released(best, kind, best.fuse, err);
  }

  /** The shell that goes up and then turns on its mark: its speed sets how long it takes, the moment of firing does the rest. */
  solveHoming(s, tx, ty, earliest, big) {
    const dir = Math.sign(tx - s.x) || 1;
    const vx = dir * 170, vy = 300, l = Math.hypot(vx, vy);
    const mx = s.x + vx / l * 16, my = s.y + 4 + vy / l * 16;
    let best = null;
    for (const speed of [320, 420, 540, 680]) {
      const run = this.fly('homing', mx, my, vx, vy, 6, { tx, ty, speed });
      const miss = Math.hypot(run.x - tx, run.y - ty) + (run.end === 'hit' && run.t > 1 ? 0 : 400);
      if (!this.clearOfOwn(s.team, run.x, run.y, 'homing')) continue;
      if (!best || miss < best.miss) best = { miss, x: mx, y: my, vx, vy, avx: vx, avy: vy, run, seen: run, speed, tx, ty, est: this.wind };
    }
    if (!best || best.miss > 160) return null;
    const land = this.snares(earliest + best.run.t - 0.05, earliest + best.run.t + 4)[0];
    best.land = big !== null && big >= earliest + best.run.t - 0.05 ? big : land;
    return best;
  }

  /** No clear shot at anyone from down here: any way out toward the other side that keeps the blast off its own. */
  wayForward(s, tx, ty, earliest) {
    const dir = Math.sign(tx - s.x) || 1;
    let best = null, score = Infinity;
    for (let a = 0.3; a < 1.45; a += 0.2) {
      for (const sp of [380, 680]) {
        const ux = Math.cos(a) * dir, uy = Math.sin(a), x = s.x + ux * 16, y = s.y + 4 + uy * 16;
        const run = this.fly('missile', x, y, ux * sp, uy * sp, 5);
        if (run.end !== 'hit' || run.t < 0.7 || (run.x - s.x) * dir < 60 || !this.clearOfOwn(s.team, run.x, run.y, 'missile')) continue;
        const v = Math.hypot(run.x - tx, run.y - ty);
        if (v < score) { score = v; best = { x, y, vx: ux * sp, vy: uy * sp, avx: ux * sp, avy: uy * sp, run, seen: run, est: this.wind }; }
      }
    }
    if (best) best.land = this.snares(earliest + best.run.t, earliest + best.run.t + 4)[0];
    return best;
  }

  // ---- a turn ---------------------------------------------------------------

  beginTurn(t) {
    const r = this.rng;
    const side = this.turnSide;
    this.turnSide = 1 - side;
    this.turns++;
    if (this.turns > 16) this.waterGoal += 26;     // the fight has gone on: the sea rises
    if (r.bool(0.75)) this.wind = r.float(-1, 1) * ART_WIND;

    const bar = this.grid.barSec;
    // the sum takes a little over two seconds, or a little under if that lands a big one on the drop
    const unhurried = Math.ceil((t + 2.2) / bar - 1e-9) * bar, hurried = Math.ceil((t + 1.5) / bar - 1e-9) * bar;
    const big = this.accentIn(hurried + 0.7, unhurried + 3.6);
    const earliest = big !== null && big < unhurried + 0.7 ? hurried : unhurried;
    const beats = (a, b) => r.shuffle(this.snares(earliest + a, earliest + b));

    // the shot is always meant for the other side; what goes wrong goes wrong in the air: nearly half the time the wind
    // is misjudged, or a throw slips from the hand and its bounces go elsewhere
    const off = r.bool(0.45), wrong = r.float(0.15, 0.4) * (r.bool() ? 1 : -1), slip = r.float(0.015, 0.05) * (r.bool() ? 1 : -1);
    const err = (kind) => (off ? { wind: ART_ARMS[kind]?.wind ? wrong : 0, slip: ART_ARMS[kind]?.wind ? 0 : slip } : { wind: 0, slip: 0 });
    const shooters = r.shuffle(this.aliveOf(side)).slice(0, 2), marks = r.shuffle(this.aliveOf(1 - side)).slice(0, 3);

    const aim = (kind, s, m) => {
      const tx = m.x, ty = this.surfaceY(tx, m.y);
      let sol = null;
      if (kind === 'air') sol = this.clearOfOwn(s.team, tx, ty, 'air') ? {} : null;
      else if (kind === 'homing') sol = this.solveHoming(s, tx, ty, earliest, big);
      else {
        const fused = kind === 'grenade' || kind === 'cluster';
        const solve = (lands) => (fused ? this.solveFused(kind, s, tx, ty, earliest, lands, err(kind)) : this.solveDirect(kind, s, tx, ty, earliest, lands, err(kind)));
        if (big !== null) sol = solve([big]);       // the drop first, if it can be done
        if (!sol) sol = solve(fused ? beats(1.5, 4.5).slice(0, 1) : beats(0.7, 3.6));
      }
      return sol ? { kind, s, m, tx, ty, sol } : null;
    };
    const search = (kind) => {
      for (const s of shooters) for (const m of marks) { const got = aim(kind, s, m); if (got) return got; }
      return null;
    };
    const wanted = this.pickArm(big !== null);
    let shot = search(wanted) || (wanted !== 'missile' ? search('missile') : null);
    if (!shot) {
      outer: for (const s of shooters) {
        for (const m of marks) {
          const way = this.wayForward(s, m.x, this.surfaceY(m.x, m.y), earliest);
          if (way) { shot = { kind: 'missile', s, m, tx: m.x, ty: this.surfaceY(m.x, m.y), sol: way }; break outer; }
        }
      }
    }
    if (!shot) {
      // nobody on this side can fire without hitting its own: the turn passes
      this.nextTurn = (Math.floor(t / bar) + 2) * bar;
      return;
    }
    this.lastArm = shot.kind;
    if (shot.kind === 'air') this.lastFlyer = this.turns;
    const { s, tx, ty, sol, kind } = shot;
    s.face = tx >= s.x ? 1 : -1;
    const T = { kind, s, t0: t, tx, ty, fired: false, trials: [], settled: null };
    if (kind === 'air') this.planAir(T, earliest, big);
    else {
      if (kind === 'grenade' || kind === 'cluster') T.fuseEnd = sol.land;
      T.sol = sol;
      T.land = sol.land;
      // a fused throw leaves on the bar and its fuse counts to the beat; a shell that goes off on touching leaves
      // when its flight will end on the beat
      T.fire = T.fuseEnd !== undefined ? earliest : Math.max(t + 1.2, sol.land - sol.run.t);
      this.planTrials(T, tx, ty);
    }
    T.box = this.boxOf(T);
    this.turn = T;
  }

  /** The ground's top near a mark, so a shot is aimed at where the beetle stands. */
  surfaceY(x, near) {
    let y = artGround(x, this.k);
    while (y > -100 && !this.solid(x, y - 1)) y -= 3;
    return Math.max(y, near - 60);
  }

  /** The sum done in front of us, in the wind as the shooter judges it: the trial arcs, the last the shot it means to make. */
  planTrials(T, tx, ty) {
    const sol = T.sol, kind = T.kind;
    const arm = ART_ARMS[kind];
    const flight = T.fire - T.t0;
    const spots = [0.42, 0.6, 0.78];
    const add = (u, vx, vy) => {
      const run = kind === 'homing'
        ? this.fly('homing', sol.x, sol.y, vx, vy, 6, { tx: sol.tx, ty: sol.ty, speed: sol.speed })
        : this.fly(kind, sol.x, sol.y, vx, vy, T.fuseEnd !== undefined ? T.fuseEnd - T.fire : 5, arm.wind ? { windAs: sol.est } : {});
      T.trials.push({ t: T.t0 + flight * u, path: run.path, angle: Math.atan2(vy, vx), power: Math.hypot(vx, vy) / ART_VMAX, ex: run.x, ey: run.y });
    };
    if (arm.wind && kind !== 'homing' && Math.abs(sol.est) > 15) {
      // first with no wind in the sum, then half of it: the arcs drift off, and come back
      const flightT = sol.seen.t;
      const v0 = this.launch(sol.x, sol.y, tx, ty, flightT, 0);
      const v1 = this.launch(sol.x, sol.y, tx, ty, flightT, sol.est * 0.5);
      add(spots[0], v0[0], v0[1]);
      add(spots[1], v1[0], v1[1]);
    } else {
      // no wind to allow for: too short, then too long
      add(spots[0], sol.avx * 0.82, sol.avy * 0.86);
      add(spots[1], sol.avx * 1.14, sol.avy * 1.08);
    }
    add(spots[2], sol.avx, sol.avy);
  }

  /** A great dragonfly called in: it crosses at a height, its pods leaving so each lands on a sixteenth, the first on the beat. */
  planAir(T, earliest, big) {
    const { tx, ty } = T, r = this.rng;
    const dir = r.bool() ? 1 : -1;
    const six = this.grid.six, height = Math.max(ty, artGround(tx, this.k)) + 330;
    const vp = Math.max(240, Math.min(700, 50 / six));
    const fall = Math.sqrt(2 * (height - ty) / ART_G);
    const land = big !== null && big - fall > earliest ? big : this.snares(earliest + fall + 0.5, earliest + fall + 4)[0];
    T.land = land;
    T.fire = earliest;
    // over the mark when the third pod leaves
    const t2 = land + 2 * six - fall;
    const px = (u) => tx - dir * 100 * fall + dir * vp * (u - t2);
    T.flyer = { dir, height, vp, x: px, t0: t2 - 1500 / vp, t1: t2 + 1500 / vp, drops: [] };
    for (let i = 0; i < 5; i++) {
      const hit = land + i * six;
      let at = hit - fall;
      for (let k = 0; k < 6; k++) at = hit - this.fly('pod', px(at), height, dir * 100, 0, 5).t;
      T.flyer.drops.push({ t: at, done: false });
    }
    // no arcs: the mark is what is framed
    T.trials.push({ t: T.t0 + (T.fire - T.t0) * 0.5, path: [], angle: 1.1, power: 0.25, ex: tx, ey: ty });
    T.sol = { run: { path: [[tx - 130, ty], [tx + 130, ty], [tx, height]] }, x: T.s.x, y: T.s.y };
  }

  boxOf(T) {
    let a = T.s.x, b = T.s.x, c = T.s.y, d = T.s.y;
    const eat = (q) => { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); };
    eat([T.tx, T.ty]);
    for (const q of T.sol.run.path) eat(q);
    if (T.sol.seen) for (const q of T.sol.seen.path) eat(q);
    return [a, b, c, d];
  }

  fireShot(T) {
    T.fired = true;
    if (T.kind === 'air') return;
    const sol = T.sol;
    const b = this.body(T.kind, sol.x, sol.y, sol.vx, sol.vy, T.kind === 'homing' ? { tx: sol.tx, ty: sol.ty, speed: sol.speed } : {});
    if (T.fuseEnd !== undefined) b.fuseEnd = T.fuseEnd;
    this.shells.push(b);
    this.follow = null;
    this.focus = null;
  }

  // ---- the world's step -----------------------------------------------------

  /** One beetle into the sea: gone under, and off the camera. */
  drown(s, t) {
    s.state = s.state === 'tomb' ? 'gone' : 'drown';
    s.hp = 0; s.vx = 0; s.vy = 0; s.rest = true;
    this.splash(s.x, t, 1);
    if (this.follow === s) this.follow = null;
  }

  tick() {
    this.step++;
    const t = this.simT = this.step * ART_DT;
    while (this.events.length && this.events[0].t <= t) this.events.shift().fn(t);
    if (this.nextRoundAt !== undefined && t >= this.nextRoundAt) { this.nextRoundAt = undefined; this.newRound(t); }
    if (!this.turn && !this.over && t >= this.nextTurn) {
      if (this.beetles.some((s) => !s.rest && (s.state === 'live' || s.state === 'tomb'))) this.nextTurn += this.grid.barSec;
      else if (!this.aliveOf(0).length || !this.aliveOf(1).length) this.endRound(t);   // the sea can finish a side between turns
      else this.beginTurn(t);
    }
    const T = this.turn;

    // the shooter's shot
    if (T) {
      if (!T.fired && t >= T.fire) this.fireShot(T);
      if (T.flyer) {
        for (const d of T.flyer.drops) {
          if (!d.done && t >= d.t) { d.done = true; this.shells.push(this.body('pod', T.flyer.x(d.t), T.flyer.height, T.flyer.dir * 100, 0)); }
        }
      }
    }

    // what flies
    let leader = null;
    for (const b of this.shells) {
      const res = this.stepBody(b);
      const a = b.arm;
      if (a.trail && (!b.lastPuff || t - b.lastPuff >= a.trail)) { this.puffs.push({ t, x: b.x, y: b.y }); b.lastPuff = t; }
      if ((b.fuseEnd !== undefined && t >= b.fuseEnd) || res === 'hit') { this.burst(b, t); b.dead = true; continue; }
      if (res === 'water') { this.splash(b.x, t, 0.5); b.dead = true; continue; }
      if (res === 'skip') this.splash(b.x, t, 0.25);
      if (res === 'out') { b.dead = true; continue; }
      leader = b;
    }
    this.shells = this.shells.filter((b) => !b.dead);

    // who was thrown or dropped
    for (const s of this.beetles) {
      if (s.state === 'gone') continue;
      if (s.state === 'drown') {
        s.y -= 60 * ART_DT;
        if (s.y < this.water - 70) s.state = 'gone';
        continue;
      }
      if (s.y - ART_R < this.water) { this.drown(s, t); continue; }
      if (s.rest) continue;
      const fell = s.vy;
      const res = this.stepBody(s);
      s.rot += s.spin * ART_DT;
      if (res === 'water') { this.drown(s, t); continue; }
      // dropped in at the start of a round, it digs its feet in where it lands
      if (s.dropping && res === 'bounce') { s.dropping = false; s.vx = 0; s.vy = 0; s.rest = true; continue; }
      if (res === 'bounce') {
        s.spin *= 0.7;
        if (fell < -400 && s.state === 'live') {
          // a long fall hurts
          const dmg = 1 + Math.round((-fell - 400) * 0.07);
          s.hp -= dmg;
          this.pops.push({ t, x: s.x, y: s.y + 22, v: dmg });
        }
      }
      if (s.rest) { s.flung = false; s.rot = 0; s.spin = 0; if (this.follow === s) this.follow = null; }
    }

    // the sea, rising when the fight has gone on
    if (this.water < this.waterGoal) this.water = Math.min(this.waterGoal, this.water + 14 * ART_DT);
    this.windScroll += this.wind * ART_DT * 0.5;

    // when all is still: the fallen go up one by one on the eighths, and the turn is over
    if (T && T.fired) {
      const flying = this.shells.length > 0 || (T.flyer && T.flyer.drops.some((d) => !d.done));
      const moving = this.beetles.some((s) => !s.rest && (s.state === 'live' || s.state === 'tomb'));
      if (!flying && !moving && t > T.land) {
        if (!this.pendingDeath) {
          const fallen = this.beetles.find((s) => s.state === 'live' && s.hp <= 0);
          if (fallen) {
            this.pendingDeath = true;
            this.schedule(this.grid.next(t, 2), (u) => {
              this.pendingDeath = false;
              fallen.state = 'tomb';
              fallen.arm = ART_ARMS.tomb;
              fallen.rot = 0; fallen.spin = 0; fallen.flung = false;
              this.explode(fallen.x, fallen.y, ART_ARMS.beetle.blast, 0, u);
              fallen.rest = false;
            });
          } else if (T.settled === null) T.settled = t;
        }
      } else T.settled = null;
      const late = t > T.land + 4 * this.grid.barSec;   // nothing waits for ever
      if ((T.settled !== null && t - T.settled > 0.5) || late) {
        this.turn = null;
        const ended = !this.aliveOf(0).length || !this.aliveOf(1).length || this.holes.length > ART_CRATERS - 8;
        if (ended) this.endRound(t);
        else this.nextTurn = this.nextTurnAfter(t);
      }
    }

    this.aimCamera(t, leader);
    if (this.step % ART_FRAME === 0) this.keepFrame();
  }

  /** The next bar line a turn can start on, held back up to a few seconds if that lands its shot on the drop. */
  nextTurnAfter(t) {
    const bar = this.grid.barSec;
    const soon = (Math.floor((t + 0.8) / bar) + 1) * bar;
    const drop = this.accentIn(soon + 2.9, soon + 11);
    if (drop === null || drop - soon <= 7.5) return soon;
    return Math.max(soon, drop - Math.ceil(5.2 / bar) * bar);
  }

  schedule(t, fn) {
    this.events.push({ t, fn });
    this.events.sort((a, b) => a.t - b.t);
  }

  endRound(t) {
    this.over = true;
    const bar = this.grid.barSec, spb = this.grid.spb;
    const end = (Math.floor(t / bar) + 3) * bar;
    // the side still standing hops for joy on each beat
    const winners = this.aliveOf(0).length ? 0 : 1;
    for (let u = this.grid.next(t, 4); u < end - 0.1; u += spb) {
      this.schedule(u, () => {
        for (const s of this.beetles) if (s.team === winners && s.state === 'live' && s.hp > 0 && s.rest) { s.vy = 150; s.rest = false; }
      });
    }
    this.nextRoundAt = end;
  }

  splash(x, t, size) { this.booms.push({ t, x, y: this.water, blast: -size }); }

  // ---- the camera -----------------------------------------------------------

  /**
   * Where the camera wants to be. It closes in on the shooter, pulls back to
   * frame the whole shot, follows the shell ahead of its flight, closes in as
   * it comes down, stays on the blast, follows whoever it threw, and pulls back
   * to the whole island. Position and zoom ease toward what is wanted every step.
   */
  aimCamera(t, leader) {
    const T = this.turn, spb = this.grid.spb, c = this.cam;
    let x, y, z, rate = 3.5, zoomRate = 2.6;
    const sinceBlast = this.focus ? t - this.focus.t : 99;
    const live = this.beetles.filter((s) => s.state === 'live');
    if (T && !T.fired) {
      const u = (t - T.t0) / Math.max(T.fire - T.t0, 0.01);
      if (u < 0.33) { x = T.s.x + T.s.face * 18; y = T.s.y + 12; z = 112; zoomRate = 3.2; }
      else {
        const [a, b, l, h] = T.box;
        x = (a + b) / 2; y = (l + h) / 2 + 12;
        z = Math.max(250, Math.min(960, Math.max((b - a + 130) / 1.6, (h - l + 110) / 0.84)));
        rate = 2.8; zoomRate = 2.2;
      }
    } else if (T && leader && (sinceBlast > 0.5 || leader.kind !== 'piece')) {
      const tau = T.land - t, pull = artEase(tau / (1.6 * spb));
      const reach = Math.max((T.box[1] - T.box[0]) / 2.6, (T.box[3] - T.box[2]) / 1.1);
      const far = Math.max(280, Math.min(760, reach));
      x = leader.x + leader.vx * 0.22; y = leader.y + leader.vy * 0.22;
      z = tau > 0 ? 210 + (far - 210) * pull : 300;
      rate = 8; zoomRate = 3.4;
    } else if (T && T.flyer && t < T.land) {
      x = T.tx; y = (T.flyer.height + T.ty) / 2; z = Math.max(320, (T.flyer.height - T.ty + 90) / 0.86);
      rate = 3; zoomRate = 2.2;
    } else if (this.follow && sinceBlast > 0.18 && !this.follow.rest) {
      const f = this.follow;
      x = f.x + f.vx * 0.2; y = f.y + f.vy * 0.2; z = 250;
      rate = 6; zoomRate = 2.6;
    } else if (this.focus && sinceBlast < 0.9) {
      x = this.focus.x; y = this.focus.y + 16; z = 215 + 90 * artEase((sinceBlast - 0.1) / 0.8);
      rate = 7; zoomRate = 5;
    } else if (this.focus && T) {
      x = this.focus.x; y = this.focus.y + 20; z = 330;
      rate = 2.5; zoomRate = 2;
    } else {
      // the whole fight
      let a = -300, b = 300;
      for (const s of live) { a = Math.min(a, s.x); b = Math.max(b, s.x); }
      x = (a + b) / 2; y = 240; z = Math.max(560, Math.min(960, (b - a + 240) / 1.6));
      rate = 2.2; zoomRate = 1.8;
    }
    const kp = 1 - Math.exp(-rate * ART_DT), kz = 1 - Math.exp(-zoomRate * ART_DT);
    c.x += (x - c.x) * kp;
    c.y += (y - c.y) * kp;
    c.z = Math.exp(Math.log(c.z) + (Math.log(z) - Math.log(c.z)) * kz);
    // never much of the sea's floor or past the ends of the world
    c.y = Math.max(c.y, this.water + c.z * 0.5 - Math.max(46, c.z * 0.17));
    const edge = Math.max(0, ART_HALF + 260 - c.z * 0.89);
    c.x = Math.max(-edge, Math.min(edge, c.x));
  }

  // ---- what the screen is told ----------------------------------------------

  keepFrame() {
    const T = this.turn, n = ART_BEETLES;
    const so = new Float32Array(n * 8);
    let h0 = 0, h1 = 0;
    this.beetles.forEach((s, i) => {
      const code = { live: s.flung ? 2 : 0, tomb: 3, drown: 4, gone: 5 }[s.state];
      so.set([s.x, s.y, s.rot, Math.max(0, s.hp) / ART_HP, s.team, code, s.aim, s.face], i * 8);
      if (s.team === 0) h0 += Math.max(0, s.hp); else h1 += Math.max(0, s.hp);
    });
    for (let i = this.beetles.length; i < n; i++) so[i * 8 + 5] = 5;
    let aim = null, arc = null, arcAge = 0;
    if (T && !T.fired) {
      const u = (this.simT - T.t0) / Math.max(T.fire - T.t0, 0.01);
      const seen = T.trials.filter((q) => q.t <= this.simT);
      const last = seen[seen.length - 1];
      const rest = T.s.face > 0 ? 0.5 : Math.PI - 0.5;
      const before = seen.length > 1 ? seen[seen.length - 2].angle : rest;
      const angle = last ? before + (last.angle - before) * artEase((this.simT - last.t) / 0.35) : rest;
      const final = T.trials[T.trials.length - 1];
      const charge = artEase((u - 0.8) / 0.2) * Math.max(0.15, final ? final.power : 0.3);
      const i = this.beetles.indexOf(T.s);
      T.s.aim = angle;
      if (so[i * 8 + 5] === 0) so[i * 8 + 5] = 1;
      so[i * 8 + 6] = angle;
      aim = [T.s.x, T.s.y + 4, angle, charge];
      if (last && last.path.length) { arc = last.path; arcAge = this.simT - last.t; }
    }
    const fired = T && T.fired && this.simT - T.fire < 0.25 ? 1 - (this.simT - T.fire) / 0.25 : 0;
    const shells = this.shells.slice(0, 8).map((b) => [b.x, b.y, b.arm.id, Math.atan2(b.vy, b.vx), b.fuseEnd !== undefined ? b.fuseEnd : -1]);
    const flyer = T && T.flyer && this.simT > T.flyer.t0 && this.simT < T.flyer.t1 ? [T.flyer.x(this.simT), T.flyer.height, T.flyer.dir, 1] : null;
    const mark = T && !T.fired && T.trials.length && this.simT >= T.trials[0].t ? [T.tx, T.ty] : null;
    this.frames.push({
      t: this.simT, cam: [this.cam.x, this.cam.y, this.cam.z], water: this.water, so, h0, h1, aim, arc, arcAge, fired,
      shells, flyer, mark, wind: this.wind, scroll: this.windScroll, round: this.round,
      fx: T && T.fired ? T.sol.x : 0, fy: T && T.fired ? T.sol.y : 0, left: T && !T.fired ? T.fire - this.simT : -1,
    });
    if (this.frames.length > 1000) {
      const from = this.simT - 3;
      let cut = 0;
      while (cut < this.frames.length - 2 && this.frames[cut].t < from) cut++;
      if (cut > 300) this.frames.splice(0, cut);
    }
    const keep = this.simT - 6;
    if (this.puffs.length > 200) this.puffs = this.puffs.filter((q) => q.t > keep);
    if (this.booms.length > 40) this.booms = this.booms.filter((q) => q.t > keep);
    if (this.pops.length > 30) this.pops = this.pops.filter((q) => q.t > keep);
  }

  advanceTo(t) {
    if (t < this.frames[0].t) this.reset();
    while (this.simT < t + 0.05) this.tick();
  }

  uniforms(t) {
    this.advanceTo(t);
    const fs = this.frames, span = ART_FRAME * ART_DT;
    const i = Math.max(0, Math.min(fs.length - 2, Math.floor((t - fs[0].t) / span)));
    const A = fs[i], B = fs[i + 1] || A;
    const u = Math.max(0, Math.min(1, (t - A.t) / Math.max(B.t - A.t, 1e-6)));
    const same = A.round === B.round;
    const lerp = (a, b) => (same ? a + (b - a) * u : a);
    const round = A.round;

    // the shake of what has just gone off
    let shake = 0;
    const bl = recent(this.booms, t, 8);
    for (const b of bl) if (b.blast > 0) shake = Math.max(shake, Math.exp(-(t - b.t) * 9) * b.blast / 50);
    const zoom = lerp(A.cam[2], B.cam[2]);
    const sx = shake * zoom * 0.018 * Math.sin(t * 71.0), sy = shake * zoom * 0.018 * Math.sin(t * 93.0 + 1.0);

    const cr = new Float32Array(ART_CRATERS * 4);
    let n = 0;
    for (const c of round.holes) {
      if (c.t > t || n >= ART_CRATERS) continue;
      cr.set([c.x, c.y, c.r, c.cave ? -1 : t - c.t], 4 * n++);
    }

    const so = new Float32Array(ART_BEETLES * 4), sb = new Float32Array(ART_BEETLES * 4);
    for (let k = 0; k < ART_BEETLES; k++) {
      const a = k * 8;
      so.set([lerp(A.so[a], B.so[a]), lerp(A.so[a + 1], B.so[a + 1]), lerp(A.so[a + 2], B.so[a + 2]), A.so[a + 3]], k * 4);
      sb.set([A.so[a + 4], A.so[a + 5], A.so[a + 6], A.so[a + 7]], k * 4);
    }

    const sh = new Float32Array(32);
    A.shells.forEach((s, k) => {
      const m = B.shells[k];
      const ok = m && m[2] === s[2] && same;
      const left = s[4] > 0 ? Math.max(1, Math.ceil(s[4] - t)) : 0;
      sh.set([ok ? s[0] + (m[0] - s[0]) * u : s[0], ok ? s[1] + (m[1] - s[1]) * u : s[1], s[2] + left * 10, s[3]], 4 * k);
    });

    const pu = new Float32Array(24 * 4);
    const pl0 = recent(this.puffs, t, 24);
    for (let k = 0; k < 24; k++) {
      const q = pl0[k];
      if (!q) { pu[4 * k + 2] = 99; continue; }
      const age = t - q.t;
      pu.set([q.x + A.wind * 0.1 * age, q.y + 22 * age, age, 0], 4 * k);
    }

    const bo = new Float32Array(32);
    for (let k = 0; k < 8; k++) { const b = bl[k]; bo.set(b ? [b.x, b.y, t - b.t, b.blast] : [0, 0, 99, 0], k * 4); }

    const po = new Float32Array(16);
    const pl = recent(this.pops, t, 4);
    for (let k = 0; k < 4; k++) { const p = pl[k]; po.set(p ? [p.x, p.y, p.v, t - p.t] : [0, 0, 0, 99], k * 4); }

    const dots = new Float32Array(32 * 2);
    if (A.arc) {
      const m = A.arc.length;
      for (let k = 0; k < 32; k++) dots.set(A.arc[Math.min(m - 1, Math.floor(k * (m - 1) / 31))], k * 2);
    }
    const ar = A.aim || [0, 0, 0, -1];
    return {
      uArtK: { v: round.k, kind: '4f' },
      uCam: { v: [lerp(A.cam[0], B.cam[0]) + sx, lerp(A.cam[1], B.cam[1]) + sy, zoom, lerp(A.water, B.water)], kind: '4f' },
      uCraters: { v: cr, kind: '4fv' },
      uBeetles: { v: so, kind: '4fv' },
      uBeetleB: { v: sb, kind: '4fv' },
      uShells: { v: sh, kind: '4fv' },
      uPuffs: { v: pu, kind: '4fv' },
      uABooms: { v: bo, kind: '4fv' },
      uPops: { v: po, kind: '4fv' },
      uDots: { v: dots, kind: '2fv' },
      uAim: { v: ar, kind: '4f' },
      uMark: { v: [A.mark ? A.mark[0] : 0, A.mark ? A.mark[1] : 0, A.mark ? 1 : 0, A.arc ? A.arcAge : -1], kind: '4f' },
      uFlyer: { v: A.flyer || [0, 0, 0, 0], kind: '4f' },
      uArtFx: { v: [A.wind / ART_WIND, A.h0 / (5 * ART_HP), A.h1 / (5 * ART_HP), A.scroll], kind: '4f' },
      uMuzzle: { v: [A.fx, A.fy, A.fired, A.left], kind: '4f' },
    };
  }
}

// ---------------------------------------------------------------------------
// The behind-view shooter: a flyer free over the whole screen, the plain and
// the horizon answering him, waves on the bar, a serpent closing each stage
// ---------------------------------------------------------------------------

export const SKY_SPRITES = 48;
export const SKY_LIMBS = 27;
const SKY_F = 0.9, SKY_ZH = 4.4;            // the focal length; how far ahead of the eye the flyer flies
const SKY_GY = -0.45;                       // on the screen, the ground under the flyer: it stays there, whatever the camera does
const SKY_DT = 1 / 120;                     // the game's fixed step
const SKY_YMAX = 0.64 * SKY_ZH / SKY_F;     // how high he can go, in world units (near the top of the screen)
const SKY_XMAX = 0.72 * SKY_ZH / SKY_F;     // how far to the side
const SKY_VX = 1.37 * SKY_ZH / SKY_F;       // his speed across: the width of the screen in 1.3 seconds, as the genre flew
const SKY_VY = 0.77 * SKY_ZH / SKY_F;       // and up: the height of the screen in 1.3 seconds
const SKY_ACC = 34;                         // how quickly he gets to that speed
const SKY_CAM = 3.2;                        // how fast the plain slides under him at the edge of the screen
const SKY_FIG = 0.8;                        // the figure's scale, world units for one of its own
const SKY_FAR = 38;                         // how far ahead scenery appears
const SKY_HOR0 = -0.38, SKY_HOR1 = -0.03;     // the horizon on the screen, with him on the ground and at his highest

const skyMix = (a, b, u) => a + (b - a) * u;

// The figure: a skeleton in three dimensions, posed by joint angles, turned to
// the angle the camera sees it from, and handed to the shader as tapered limbs
// sorted far to near. So its view changes with where it is on the screen, as
// the genre's sprites changed by column, but continuously: at the left of the
// screen its right side shows and its blaster points in toward the middle.
const SKP = { lean: 0, roll: 1, twist: 2, headP: 3, headY: 4, hipFL: 5, hipAL: 6, kneeL: 7, ankL: 8, hipFR: 9, hipAR: 10, kneeR: 11, ankR: 12, shFL: 13, shAL: 14, elL: 15, shFR: 16, shAR: 17, elR: 18, pitch: 19, gun: 20 };
const SKY_POSE_N = 21;
function skyPose(o) {
  const p = new Array(SKY_POSE_N).fill(0);
  p[SKP.shFR] = 0.95; p[SKP.shAR] = 0.18; p[SKP.elR] = 0.75; p[SKP.gun] = 1;
  for (const k in o) p[SKP[k]] = o[k];
  return p;
}
const skyBlend = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);

// Falling: thrown back, arms up; toppling; flat out; a knee under him; up. (The times in parts of the whole fall.)
const SKY_FALL = [
  [0.0, skyPose({ lean: -0.1, hipFL: 0.1, kneeL: 0.3, hipFR: -0.1, kneeR: 0.4 })],
  [0.1, skyPose({ lean: -0.55, pitch: -0.25, roll: 0.25, headP: -0.5, hipFL: 0.5, hipAL: 0.35, kneeL: 0.5, hipFR: -0.4, hipAR: 0.3, kneeR: 0.7, shFL: 0.4, shAL: 2.5, elL: 0.3, shFR: 0.5, shAR: 2.3, elR: 0.3, gun: 0.3 })],
  [0.22, skyPose({ lean: 0.2, pitch: 0.75, roll: -0.2, headP: 0.3, hipFL: 0.1, hipAL: 0.3, kneeL: 0.9, hipFR: -0.3, hipAR: 0.25, kneeR: 0.3, shFL: 1.2, shAL: 1.8, elL: 0.2, shFR: 1.2, shAR: 1.8, elR: 0.2, gun: 0.1 })],
  [0.34, skyPose({ lean: 0.05, pitch: 1.5, roll: 0.05, headP: -0.5, hipFL: -0.05, hipAL: 0.5, kneeL: 0.25, ankL: 0.8, hipFR: -0.05, hipAR: 0.4, kneeR: 0.5, ankR: 0.8, shFL: 0.5, shAL: 1.5, elL: 0.4, shFR: 0.5, shAR: 1.5, elR: 0.4, gun: 0 })],
  [0.62, skyPose({ lean: 0.05, pitch: 1.5, headP: -0.5, hipFL: -0.05, hipAL: 0.5, kneeL: 0.25, ankL: 0.8, hipFR: -0.05, hipAR: 0.4, kneeR: 0.5, ankR: 0.8, shFL: 0.5, shAL: 1.5, elL: 0.4, shFR: 0.5, shAR: 1.5, elR: 0.4, gun: 0 })],
  [0.76, skyPose({ lean: 0.5, pitch: 0.75, headP: -0.45, hipFL: 1.3, hipAL: 0.25, kneeL: 1.9, hipFR: 0.2, hipAR: 0.2, kneeR: 1.3, shFL: 1.0, shAL: 0.7, elL: 0.2, shFR: 1.0, shAR: 0.6, elR: 0.3, gun: 0.2 })],
  [0.9, skyPose({ lean: 0.3, pitch: 0.12, headP: -0.2, hipFL: 0.7, hipAL: 0.15, kneeL: 1.0, hipFR: -0.1, hipAR: 0.15, kneeR: 0.3, shFL: 0.4, shAL: 0.5, elL: 0.4, gun: 0.7 })],
  [1.0, skyPose({ lean: 0.12, hipFL: 0.1, kneeL: 0.3, hipFR: -0.1, kneeR: 0.4, shFL: 0.2, shAL: 0.3, elL: 0.8 })],
];
// Stumbling over something low: head down, arms out, a leg kicked up behind; caught.
const SKY_TRIP = [
  [0.0, skyPose({ lean: 0.15, hipFL: 0.1, kneeL: 0.3, hipFR: -0.1, kneeR: 0.4 })],
  [0.28, skyPose({ lean: 0.85, pitch: 0.35, roll: 0.15, headP: 0.2, hipFL: 0.75, hipAL: 0.2, kneeL: 0.5, hipFR: -0.75, hipAR: 0.3, kneeR: 1.5, shFL: 0.5, shAL: 1.5, elL: 0.3, shFR: 0.4, shAR: 1.3, elR: 0.3, gun: 0.7 })],
  [0.55, skyPose({ lean: 0.95, pitch: 0.5, roll: -0.15, headP: 0.1, hipFL: 1.05, hipAL: 0.2, kneeL: 1.2, hipFR: -0.45, hipAR: 0.2, kneeR: 1.1, shFL: 0.9, shAL: 1.3, elL: 0.3, shFR: 0.7, shAR: 1.2, elR: 0.3, gun: 0.7 })],
  [1.0, skyPose({ lean: 0.15, hipFL: -0.1, kneeL: 0.4, hipFR: 0.1, kneeR: 0.3, shFL: 0.2, shAL: 0.3, elL: 0.8 })],
];
function skyKeys(keys, u) {
  let i = 0;
  while (i + 2 < keys.length && keys[i + 1][0] <= u) i++;
  const A = keys[i], B = keys[i + 1];
  return skyBlend(A[1], B[1], smooth01((u - A[0]) / (B[0] - A[0])));
}

// The three turns, each in place: pitch tips the top toward +z (away from the eye), yaw turns the front toward +x, roll tips the top toward +x.
const rX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
const rY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
const rZ = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c, v[2]]; };

const SKY_ID = { jacket: 0, trousers: 1, boots: 2, skin: 3, head: 4, pack: 5, gun: 6, flame: 7, scarf: 8, flash: 9 };

/**
 * Stand the figure up from a pose. `view` is what the camera's angle does to it;
 * `ground` is how far it stands on the ground (0 in the air; at 1 its lowest point
 * rests on the ground). Returns its limbs, far to near, in world units about the
 * point under its feet, and where its muzzle is.
 */
function skyFigure(P, view, ground, flame, scarf, flash) {
  const bodyTurn = (v) => rY(rZ(rX(v, P[SKP.pitch]), view.roll), view.turn);
  const spine = (v) => rX(rZ(rY(v, P[SKP.twist]), P[SKP.roll]), P[SKP.lean]);
  const pelvis = [0, 0, 0];
  const chest = spine([0, 0.52, 0]);
  const inChest = (v) => add3(chest, spine(v));
  const neck = inChest([0, 0.13, 0.01]);
  const inHead = (v) => spine(rX(rY(v, P[SKP.headY]), P[SKP.headP]));
  const head = add3(neck, inHead([0, 0.13, 0.015]));
  const leg = (side, F, A, K, An) => {
    const turn = (v) => rZ(rX(v, -F), side * -A);
    const hip = [side * 0.115, -0.02, 0];
    const knee = add3(hip, turn([0, -0.38, 0]));
    const ankle = add3(knee, turn(rX([0, -0.36, 0], K)));
    const toe = add3(ankle, turn(rX(rX([0, -0.03, 0.19], K), An)));
    return [hip, knee, ankle, toe];
  };
  const arm = (side, F, A, E) => {
    const shoulder = inChest([side * 0.275, -0.02, 0]);
    const turn = (v) => spine(rZ(rX(v, -F), side * -A));
    const elbow = add3(shoulder, turn([0, -0.27, 0]));
    const hand = add3(elbow, turn(rX([0, -0.25, 0], -E)));
    return [shoulder, elbow, hand];
  };
  const LL = leg(-1, P[SKP.hipFL], P[SKP.hipAL], P[SKP.kneeL], P[SKP.ankL]);
  const LR = leg(1, P[SKP.hipFR], P[SKP.hipAR], P[SKP.kneeR], P[SKP.ankR]);
  const AL = arm(-1, P[SKP.shFL], P[SKP.shAL], P[SKP.elL]);
  const AR = arm(1, P[SKP.shFR], P[SKP.shAR], P[SKP.elR]);
  // on his back the jetpack and its nozzles, pushing down and behind him
  const tankL = [inChest([-0.09, -0.1, -0.2]), inChest([-0.09, -0.36, -0.2])], tankR = [inChest([0.09, -0.1, -0.2]), inChest([0.09, -0.36, -0.2])];
  const nzL = inChest([-0.09, -0.42, -0.2]), nzR = inChest([0.09, -0.42, -0.2]);
  const flameDir = spine([0, -0.9, -0.42]);
  // the blaster, under the arm that holds it: along the way he flies while he holds it up, dropped when he cannot
  const hold = P[SKP.gun];
  const down = spine([0.9, -0.15, 0.1]);
  const gd = [down[0] * (1 - hold), down[1] + (0.03 - down[1]) * hold, down[2] + (1 - down[2]) * hold];
  const gn = Math.hypot(gd[0], gd[1], gd[2]);
  const gunDir = [gd[0] / gn, gd[1] / gn, gd[2] / gn];
  const gunA = add3(AR[2], [gunDir[0] * -0.12, gunDir[1] * -0.12, gunDir[2] * -0.12]);
  const gunB = add3(AR[2], [gunDir[0] * 0.44, gunDir[1] * 0.44, gunDir[2] * 0.44]);

  // where the ground is, to rest on it; in the air he carries his pelvis at a height of his own
  let low = 1e9;
  for (const q of [LL[1], LL[2], LL[3], LR[1], LR[2], LR[3], AL[2], AR[2], head, chest]) {
    const w = bodyTurn(q);
    if (w[1] < low) low = w[1];
  }
  const rootY = skyMix(0.84, -low + 0.03, ground);
  // from the figure's space to the camera's: turned about its middle by the angle it is seen from, near parts larger
  const pivot = 0.66, near = SKY_ZH / SKY_FIG, size = SKY_FIG * (1 + 0.12 * (1 - ground));     // (flight foreshortens him: the sprites kept their size)
  const see = (q) => {
    const w = bodyTurn(q);
    const v = rX(rY([w[0], w[1] + rootY - pivot, w[2]], -view.yaw), view.pitch);
    const pf = 1 / Math.max(0.45, 1 + v[2] / near);
    return [v[0] * pf * size, (v[1] * pf + pivot) * size, v[2], pf];
  };
  const out = [];
  const limb = (a, b, ra, rb, id, bias = 0, aux = null) => {
    const A = see(a), B = see(b);
    out.push({ ax: A[0], ay: A[1], bx: B[0], by: B[1], ra: ra * A[3] * size, rb: rb * B[3] * size, id, z: (A[2] + B[2]) * 0.5 + bias, aux });
  };
  limb(LL[0], LL[1], 0.14, 0.105, SKY_ID.trousers);
  limb(LL[1], LL[2], 0.1, 0.075, SKY_ID.trousers);
  limb(LL[2], LL[3], 0.08, 0.07, SKY_ID.boots);
  limb(LR[0], LR[1], 0.14, 0.105, SKY_ID.trousers);
  limb(LR[1], LR[2], 0.1, 0.075, SKY_ID.trousers);
  limb(LR[2], LR[3], 0.08, 0.07, SKY_ID.boots);
  limb(pelvis, chest, 0.17, 0.215, SKY_ID.jacket);
  limb(AL[0], AR[0], 0.115, 0.115, SKY_ID.jacket, 0.02);
  limb(AL[0], AL[1], 0.105, 0.085, SKY_ID.jacket);
  limb(AL[1], AL[2], 0.08, 0.062, SKY_ID.jacket);
  limb(AL[2], AL[2], 0.066, 0.066, SKY_ID.skin);
  limb(AR[0], AR[1], 0.105, 0.085, SKY_ID.jacket);
  limb(AR[1], AR[2], 0.08, 0.062, SKY_ID.jacket);
  limb(AR[2], AR[2], 0.066, 0.066, SKY_ID.skin);
  limb(chest, neck, 0.06, 0.056, SKY_ID.skin, -0.45);
  // the head, and with it which way it looks on the screen, to know how much of the face shows
  const fA = see(head), fB = see(add3(head, inHead([0, 0, 0.3])));
  limb(head, head, 0.14, 0.14, SKY_ID.head, -0.5, [(fB[0] - fA[0]) / (0.3 * size), (fB[1] - fA[1]) / (0.3 * size)]);
  limb(tankL[0], tankL[1], 0.075, 0.075, SKY_ID.pack);
  limb(tankR[0], tankR[1], 0.075, 0.075, SKY_ID.pack);
  limb(nzL, add3(nzL, spine([0, -0.05, 0])), 0.042, 0.05, SKY_ID.gun, -0.01);
  limb(nzR, add3(nzR, spine([0, -0.05, 0])), 0.042, 0.05, SKY_ID.gun, -0.01);
  const fl = (n, k) => add3(n, [flameDir[0] * k, flameDir[1] * k, flameDir[2] * k]);
  limb(fl(nzL, 0.06), fl(nzL, 0.06 + flame[0]), 0.05, 0.012, SKY_ID.flame);
  limb(fl(nzR, 0.06), fl(nzR, 0.06 + flame[1]), 0.05, 0.012, SKY_ID.flame);
  limb(gunA, gunB, 0.085, 0.06, SKY_ID.gun);
  // the scarf, streaming behind his neck: the one part that shows how fast he goes, whatever the pose
  let s0 = inChest([0, 0.09, -0.08]);
  for (const d of scarf) { const s1 = add3(s0, d); limb(s0, s1, 0.05, 0.034, SKY_ID.scarf, -0.05); s0 = s1; }
  const fr = flash > 0 ? 0.2 * flash + 0.03 : 0;
  limb(gunB, gunB, fr, fr, SKY_ID.flash, -0.3);
  out.sort((a, b) => b.z - a.z);
  return { limbs: out, muzzle: see(gunB) };
}

// A foe's way, in beats since it set out, through keys of beat, across, up, ahead.
function skyWay(k, b) {
  let i = 0;
  while (i + 2 < k.length && k[i + 1][0] <= b) i++;
  const P1 = k[i], P2 = k[i + 1], P0 = k[Math.max(0, i - 1)], P3 = k[Math.min(k.length - 1, i + 2)];
  const u = Math.max(0, Math.min(1, (b - P1[0]) / (P2[0] - P1[0])));
  const cr = (a, c, d, e) => 0.5 * (2 * c + (d - a) * u + (2 * a - 5 * c + 4 * d - e) * u * u + (3 * c - a - 3 * d + e) * u * u * u);
  return [cr(P0[1], P1[1], P2[1], P3[1]), cr(P0[2], P1[2], P2[2], P3[2]), Math.max(0.1, cr(P0[3], P1[3], P2[3], P3[3]))];
}

/**
 * The behind-view shooter, its rules read from two open-source tributes to the
 * genre and its sprite sheets: the flyer goes where he likes on the screen at a
 * fixed speed and runs when he is on the ground; the horizon rises with him and
 * the plain slides under him as he nears an edge of the screen; his shadow stays
 * on the ground at the foot of the screen. Foes fly set ways, in trains and lanes,
 * and fire where he was; low things trip him and tall ones throw him down, and the
 * plain stops while he gets up. A shot's hit is settled as it is fired.
 *
 * Its own, and on the music: he runs a stride on each beat, the rows of scenery
 * pass him on the beat, shots land on the eighths, what bounces lands on the beat,
 * what is fired at him arrives on the beat, a fall lasts a bar; a serpent of orbs
 * closes each stage and bursts on the drop, and the next stage starts there.
 */
export class SkyrushSim extends PlannedSim {
  reset() {
    this.rng = new Rng(this.seed, 'skyrush-sim');
    const spb = this.grid.spb;
    this.U = spb > 0.62 ? 8 : 4;          // the ground covered in a beat
    this.step = 0;
    this.t = 0;
    this.travel = SKY_ZH % this.U;        // so a row of scenery passes him exactly on each beat
    this.camX = 0;
    this.hor = SKY_HOR0;
    this.X = 0; this.Y = 0; this.vx = 0; this.vy = 0;
    this.lagX = 0; this.lagY = 0;         // his speed as his limbs feel it, late
    this.tx = 0; this.ty = 0;
    this.wRun = 1;                        // how far he is running rather than flying
    this.land = 0;                        // the knock of touching down
    this.lastFire = -9;
    this.fall = null; this.trip = null;
    this.safeUntil = -1;
    this.lives = 3;
    this.score = 0;
    this.stage = 0;
    this.flash = -9;
    this.foes = [];
    this.props = [];
    this.nextRow = 0;
    while (this.nextRow < this.travel) this.nextRow += this.U;
    this.shots = [];
    this.bolts = [];
    this.booms = [];
    this.sparks = [];
    this.boss = null;
    this.bar = -1;
    this.nextThink = 0;
    this.nextFire = 0;
    this.podsUntil = -1;
    this.lastPhrase = -1;
    this.prefY = 0;
    this.prefPh = this.rng.float(0, 6.28);
  }

  barT(b) { return b * this.grid.barSec; }

  /** How many stages are behind us at a time: one for each accented bar. */
  stageAt(t) {
    const bars = Math.floor(t / this.grid.barSec + 1e-6);
    let n = 0;
    for (let b = 1; b <= bars; b++) if (this.grid.isAccent(this.barT(b))) n++;
    return n;
  }

  /** The look of a stage, from the seed and its number, the same however it was reached. */
  stageTheme(n) {
    let h = 2166136261;
    const s = `${this.seed}:${n}`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 3;
  }

  foeAt(f, t) {
    const b = (t - f.t0) / this.grid.spb;
    if (f.kind === 6) {                   // a hopper: straight in, landing on every beat
      const u = b - Math.floor(b);
      return [f.x, 0.5 + 2.4 * 4 * u * (1 - u), Math.max(0.1, skyMix(f.z0, f.z1, b / f.end)), 1 - Math.min(1, Math.min(u, 1 - u) * 7)];
    }
    return skyWay(f.keys, b);
  }

  addRow() {
    const r = this.rng, wz = this.nextRow;
    this.nextRow += this.U;
    const pass = (wz - SKY_ZH) / this.U * this.grid.spb;      // when it will pass him, had nothing stopped him
    const beat = Math.round(pass / this.grid.spb);
    const theme = this.stageTheme(this.stageAt(pass));
    const put = (rel, kind, h) => this.props.push({ wz, rel, kind, h, lock: false, x: 0, dead: 0, gone: false, ph: r.float(0, 1), blind: r.bool(kind === 1 ? 0.3 : 0.1) });
    if (beat % 8 === 3) this.props.push({ wz, rel: r.float(-3, 3), kind: 1, h: r.float(0.6, 0.85), lock: false, x: 0, dead: 0, gone: false, ph: r.float(0, 1), blind: r.bool(0.7) });
    if (theme === 0) {
      // a colonnade, a pair on every other beat, something low on the way now and then
      if (beat % 2 === 0) { put(-5.0, 0, 3.6); put(5.0, 0, 3.6); }
      if (beat % 8 === 6) put(r.float(-3, 3), 1, 0.7);
      if (beat % 16 === 12) put(r.float(-1.5, 1.5), 2, 1.0);
    } else if (theme === 1) {
      // a wood: trees to the sides, thickets on the way
      if (beat % 3 === 0) put((r.bool() ? -1 : 1) * r.float(3.4, 8), 3, r.float(3.0, 4.4));
      if (r.bool(0.5)) put(r.float(-5, 5), 1, r.float(0.6, 0.9));
    } else {
      // pillars left and right in turn, stones between
      if (beat % 2 === 0) put((beat % 4 === 0 ? -1 : 1) * r.float(2.0, 4.5), 0, r.float(2.2, 3.6));
      if (r.bool(0.4)) put(r.float(-5, 5), 2, r.float(0.8, 1.3));
    }
  }

  // ---- what comes in on a bar ----
  wave(t) {
    if (t < this.podsUntil) return;
    const r = this.rng, s = r.bool() ? 1 : -1, spb = this.grid.spb;
    const add = (o) => this.foes.push(Object.assign({ t0: t, dead: 0, crossed: false, fires: [], fired: 0 }, o));
    const roll = r.float(0, 1);
    if (roll < 0.34) {
      // a train: one after another along the same way, from the middle of the horizon, past the eye
      const y = r.float(1.6, 2.6);
      const keys = [[0, s * 0.4, y, 40], [2, s * 3.2, y + 0.6, 24], [4, -s * 2.8, y - 0.5, 13], [6, s * 2.2, y + 0.3, 7], [7.5, s * 5.5, y + 1.3, 2.5], [8.5, s * 9, y + 2, 0.2]];
      for (let k = 0; k < 5; k++) add({ kind: 4, keys, t0: t + k * 0.5 * spb, fires: k === 2 ? [3] : [], end: 8.5 });
    } else if (roll < 0.62) {
      // three lanes: out to their places, a pause, a lift, and down past him
      const y = r.float(1.2, 3.0);
      for (let k = -1; k <= 1; k++) {
        const X = k * 3.0;
        const keys = [[0, X * 0.1, 2.2, 40], [2, X, y, 14], [4, X, y, 12.5], [5, X, y + 1.2, 10], [6.5, X * 1.5, y - 0.6, 3], [7.5, X * 3, y - 0.8, 0.2]];
        add({ kind: 4, keys, t0: t + (k + 1) * 0.25 * spb, fires: k === 0 ? [4] : [], end: 7.5 });
      }
    } else if (roll < 0.8) {
      // across, from one side to the other, in front of him
      const y = r.float(1.6, 3.2);
      for (let k = 0; k < 3; k++) {
        const keys = [[0, s * 10, y, 17], [2, s * 2.6, y - 0.3, 12], [4, -s * 3, y + 0.2, 9], [6, -s * 11, y + 0.8, 7]];
        add({ kind: 4, keys, t0: t + k * spb, fires: k === 1 ? [3] : [], end: 6 });
      }
    } else if (roll < 0.92) {
      // hoppers, straight in at him along the ground, each landing on a beat
      const X0 = this.X;
      for (let k = 0; k < 3; k++) add({ kind: 6, t0: t + k * spb, x: Math.max(-4, Math.min(4, X0 + (k - 1) * 2.1)), z0: 36, z1: 0.2, end: 8 });
    } else {
      // pods holding their places, opening on the back half of each bar: a shot on a closed shell only glances off
      const keys = (X, Y) => [[0, 0, 2.2, 40], [2.5, X, Y, 12], [6, X, Y, 11.5], [10, X, Y, 11], [12, X * 1.6, Y + 2.2, 36], [13, X * 1.8, Y + 2.5, 60]];
      add({ kind: 5, keys: keys(-3.2, 2.2), fires: [6], end: 13 });
      add({ kind: 5, keys: keys(3.2, 2.2), fires: [10], end: 13 });
      add({ kind: 5, keys: keys(0, 3.8), end: 13 });
      this.podsUntil = t + 3 * this.grid.barSec;
    }
  }

  podOpen(f, t) {
    const b = (t - f.t0) / this.grid.spb;
    const c = b - 4 * Math.floor(b / 4);
    return b > 2 ? smooth01((c - 2) * 5) * smooth01((4 - c) * 5) : 0;
  }

  // ---- the serpent: its head sets the way and each link follows a moment later ----
  bossAt(B, tau) {
    const cycle = Math.max(this.grid.barSec * 2, 2.5);
    const u = (tau - B.t0) / cycle;
    const entry = smooth01((tau - B.t0) / this.grid.barSec);
    const swing = u * 5.5 * Math.PI + B.ph;
    const near = skyMix(21, 8.5, 0.5 - 0.5 * Math.cos(u * 2 * Math.PI));
    const end = smooth01((tau - (B.t1 - this.grid.barSec)) / this.grid.barSec);
    return [3.3 * Math.sin(swing) * entry, 2.6 + 1.5 * Math.sin(swing * 0.73 + 1.0), skyMix(46, skyMix(near, 11, end), entry)];
  }

  bossLink(k) { return k * this.grid.spb * 0.2; }

  // ---- him ----
  hit(t, kind) {
    if (t < this.safeUntil || this.fall || this.trip) return;
    // nothing throws him in the bars before a drop: he has the serpent to finish
    const bar = this.grid.barSec, next = Math.ceil(t / bar + 1e-6) * bar;
    if (this.grid.isAccent(next) || this.grid.isAccent(next + bar)) return;
    if (kind === 'trip') {
      this.trip = { t0: t, dur: 2 * this.grid.spb };
    } else {
      // the plain slows, stops and picks up over the fall's bar, losing a whole number of beats, so the rows stay on them
      this.fall = { t0: t, dur: 4 * this.grid.spb };
      this.lives = Math.max(0, this.lives - 1);
      this.vy = 2.6;
    }
  }

  think(t) {
    const spb = this.grid.spb, r = this.rng;
    // where he would like to be: running on some phrases, high on others, wandering from side to side so all his sides are seen
    const phrase = Math.floor(t / (2 * this.grid.barSec));
    if (phrase !== this.lastPhrase) {
      this.lastPhrase = phrase;
      const seq = [0, 0.3, 0.75, 0, 0.45, 1, 0, 0.55];
      this.prefY = phrase === 0 ? 0 : seq[(phrase + Math.floor(this.prefPh * 3)) % seq.length] * SKY_YMAX;
    }
    const prefX = this.wander(t);
        // the foe to line up with: the nearest still coming
    let aim = null, az = 1e9;
    for (const f of this.foes) {
      if (f.dead || t < f.t0) continue;
      const P = this.foeAt(f, t + spb * 0.5);
      if (P[2] < SKY_ZH + 2 || P[2] > 30) continue;
      if (P[2] < az) { az = P[2]; aim = P; }
    }
    if (this.boss && !this.boss.done && t > this.boss.t0 + this.grid.barSec && t < this.boss.t1) aim = this.bossAt(this.boss, t + spb * 0.5);
    // what is coming through the plane he flies in, in the next moment
    const haz = [];
    const v = this.U / spb;
    for (const p of this.props) {
      if (p.dead || p.gone || p.blind) continue;
      const tau = (p.wz - this.travel - SKY_ZH) / v;
      if (tau < -0.05 || tau > 1.5) continue;
      const hw = p.kind === 0 ? 0.42 : p.kind === 3 ? 0.9 : 0.85;
      haz.push({ x: this.propRel(p), hw: hw + 0.3, y0: 0, y1: p.h * (p.kind === 3 ? 0.88 : 1), tau, prop: true });
    }
    for (const q of this.bolts) {
      const tau = q.t1 - t;
      if (q.blind || tau < -0.02 || tau > 2.2) continue;
      haz.push({ x: q.to[0], hw: 0.6, y0: q.to[1] - 0.55, y1: q.to[1] + 0.4, tau });
    }
    for (const f of this.foes) {
      if (f.dead || t < f.t0 || f.crossed) continue;
      for (const dt of [0.3, 0.6, 0.9, 1.2]) {
        const P = this.foeAt(f, t + dt);
        if (Math.abs(P[2] - SKY_ZH) < 1.2) { haz.push({ x: P[0], hw: 1.0, y0: P[1] - 0.8, y1: P[1] + 0.8, tau: dt }); break; }
      }
    }
    let best = -1e9, bx = this.tx, by = this.ty;
    for (let iy = 0; iy < 6; iy++) {
      const cy = iy * SKY_YMAX / 5;
      for (let ix = -4; ix <= 4; ix++) {
        const cx = ix * SKY_XMAX / 4;
        let s = -0.12 * Math.abs(cx - this.X) - 0.12 * Math.abs(cy - this.Y);
        s -= 0.3 * Math.abs(cx - prefX) + 0.55 * Math.abs(cy - this.prefY);
        if (aim) s -= (this.prefY === 0 ? 0.08 : 0.3) * Math.abs(cx - aim[0]) + (this.prefY === 0 ? 0 : 0.2) * Math.abs(cy - (aim[1] - 0.6));
        s -= 0.1 * (Math.abs(cx - this.tx) + Math.abs(cy - this.ty));
        for (const h of haz) {
          // where he could be by then, on his way there
          const hx = this.X + Math.max(-SKY_VX * h.tau, Math.min(SKY_VX * h.tau, cx - this.X));
          const hy = this.Y + Math.max(-SKY_VY * h.tau, Math.min(SKY_VY * h.tau, cy - this.Y));
          const slide = h.prop ? SKY_CAM * (hx / SKY_XMAX) * h.tau : 0;
          if (Math.abs(hx - (h.x - slide)) < h.hw + 0.25 && hy + 0.05 < h.y1 && hy + 1.25 > h.y0) s -= 12;
        }
        s += r.float(0, 0.03);
        if (s > best) { best = s; bx = cx; by = cy; }
      }
    }
    this.tx = bx; this.ty = by;
  }

  propRel(p) { return p.lock ? p.x - this.camX : p.rel; }

  /** Where he drifts when nothing calls him: side to side over seven beats, so all his sides are seen. */
  wander(t) { return 3.1 * Math.sin(t / this.grid.spb * Math.PI / 7 + this.prefPh); }

  fire(t) {
    const grid = this.grid, spb = grid.spb;
    if (this.fall || this.trip || t < 2 * spb) return;
    const X = this.X, Yc = this.Y + 0.62;
    // what lies along his line, settled now: near it is hard to miss, far it takes a good line
    const tol = (z) => Math.max(0.7, 1.7 - z * 0.035);
    let found = null, fz = 1e9;
    const landAt = (z) => grid.next(z > 17 ? grid.next(t + 1e-6, 2) : t + 1e-6, 2);
    const consider = (P, what) => {
      const z = P[2];
      if (z < SKY_ZH + 1.2 || z > 34) return;
      if (Math.abs(P[0] - X) > tol(z) || Math.abs(P[1] - Yc) > tol(z) + 0.3) return;
      if (z < fz) { fz = z; found = what; }
    };
    for (const f of this.foes) {
      if (f.dead || t < f.t0) continue;
      const l = landAt(this.foeAt(f, t)[2]);
      const P = this.foeAt(f, l);
      consider(P, { foe: f, l, P });
    }
    if (this.boss && !this.boss.done && t > this.boss.t0 && t < this.boss.t1) {
      // the serpent's head can be hurt; a shot on its body glances off
      const B = this.boss;
      const l = landAt(this.bossAt(B, t)[2]);
      for (let k = 0; k < B.n; k++) {
        const P = this.bossAt(B, l - this.bossLink(k));
        consider(P, { link: k, l, P });
      }
    }
    for (const p of this.props) {
      if (p.dead || p.gone || p.blind) continue;     // (what he has not seen he does not shoot at)
      const l = landAt(p.wz - this.travel);
      const z = p.wz - this.travel - (l - t) * this.U / spb;
      const rx = this.propRel(p);
      if (Math.abs(rx - X) > 0.8 || Yc > p.h + 0.3) continue;
      const P = [rx, Math.min(Yc, p.h * 0.6), z];
      consider(P, { prop: p, l, P });
    }
    // with nothing on his line he still fires on the beat
    const onBeat = Math.abs(t / spb - Math.round(t / spb)) < 1e-3;
    if (!found && !onBeat) return;
    this.lastFire = t;
    const m = this.figure(t).muzzle;
    const from = [X + m[0], this.Y + m[1], SKY_ZH];
    if (found) {
      const q = { t0: t, t1: found.l, from, to: found.P, kind: 'hit' };
      if (found.foe) {
        const f = found.foe;
        if (f.kind === 5 && this.podOpen(f, found.l) < 0.5) q.kind = 'glance';
        else { f.dead = found.l; q.foe = f; }
      } else if (found.prop) {
        if (found.prop.kind === 0) q.kind = 'glance';
        else { found.prop.dead = found.l; q.prop = found.prop; }
      } else if (found.link > 0) q.kind = 'glance';
      else q.head = true;
      this.shots.push(q);
    } else {
      this.shots.push({ t0: t, t1: t + 0.42, from, to: [X * 0.5, Yc * 0.6, SKY_ZH + 30], kind: 'miss' });
    }
  }

  tick() {
    const t = this.t, dt = SKY_DT, grid = this.grid, spb = grid.spb;
    // the bar: a stage ends, a serpent comes, a wave sets out
    const bar = Math.floor(t / grid.barSec + 1e-6);
    if (bar !== this.bar) {
      this.bar = bar;
      const bt = this.barT(bar);
      if (grid.isAccent(bt)) {
        this.stage++;
        this.lives = 3;
        this.flash = bt;
        this.score += 5000;
      }
      if (!this.boss || this.boss.done) {
        for (let k = 3; k >= 2; k--) {
          if (!grid.isAccent(this.barT(bar + k))) continue;
          let clear = true;
          for (let j = 1; j < k; j++) if (grid.isAccent(this.barT(bar + j))) clear = false;
          if (!clear) continue;
          this.boss = { t0: bt, t1: this.barT(bar + k), ph: this.rng.float(0, 6.28), n: 9, done: false, fired: -1, bursting: false };
          break;
        }
      }
      const fighting = this.boss && !this.boss.done && bt < this.boss.t1;
      if (bar >= 1 && !fighting) this.wave(bt);
    }
    // the serpent's rounds: three quick shots on the back half of its bars
    if (this.boss && !this.boss.done) {
      const B = this.boss;
      if (t < B.t1 && t > B.t0 + grid.barSec) {
        const six = Math.floor(t / grid.six + 1e-6);
        if (six !== B.fired) {
          B.fired = six;
          const inBar = six - Math.round(bar * grid.steps);
          if (inBar >= 8 && inBar < 14 && inBar % 2 === 0) {
            const from = this.bossAt(B, t);
            if (from[2] > SKY_ZH + 2) this.bolts.push({ t0: t, t1: t + 2 * spb, from, to: [this.X + (inBar - 10) * 0.28, this.Y + 0.62] });
          }
        }
      }
      if (t >= B.t1 && !B.bursting) {
        B.bursting = true;
        for (let k = 0; k < B.n; k++) {
          const P = this.bossAt(B, B.t1 - this.bossLink(k));
          this.booms.push({ t: B.t1 + k * grid.six * 0.5, x: P[0], y: P[1], z: P[2], size: k === 0 ? 2.8 : 2.0 });
        }
        this.score += 1000;
      }
      if (t > B.t1 + 2) B.done = true;
    }
    // foes firing where he is now, the shot arriving on a beat
    for (const f of this.foes) {
      if (f.dead || f.fired >= f.fires.length || t < f.t0) continue;
      if ((t - f.t0) / spb >= f.fires[f.fired]) {
        f.fired++;
        const from = this.foeAt(f, t);
        if (from[2] > SKY_ZH + 2) this.bolts.push({ t0: t, t1: grid.next(t + 1.5 * spb, 4), from, to: [this.X, this.Y + 0.62], blind: this.rng.bool(0.35) });
      }
    }
    // the plain goes on, stopping for a fall
    let speed = 1;
    if (this.fall) speed = 0.5 + 0.5 * Math.cos(Math.PI * 2 * Math.min(1, (t - this.fall.t0) / this.fall.dur));
    this.travel += this.U / spb * speed * dt;
    this.camX += SKY_CAM * (this.X / SKY_XMAX) * speed * (this.fall || this.trip ? 0.2 : 1) * dt;
    while (this.nextRow < this.travel + SKY_FAR) this.addRow();
    for (const p of this.props) {
      const z = p.wz - this.travel;
      // far away it keeps its place on the screen, where nobody could see it slide; near, it is on the ground for good
      // (and what he will not see, while he is on foot, drifts onto his way while it is too far to tell: so he does stumble)
      const stray = p.blind && p.kind === 1 && this.prefY === 0 && this.Y < 0.3;
      if (!p.lock && stray) p.rel += (this.X + SKY_CAM * (this.X / SKY_XMAX) * (z - SKY_ZH) * spb / this.U - p.rel) * (1 - Math.exp(-dt * 1.6));
      if (!p.lock && z < (stray ? 9 : 18)) { p.lock = true; p.x = this.camX + p.rel; }
      if (!p.gone && !p.dead && z <= SKY_ZH) {
        p.gone = true;     // through his plane: he clears it or he does not
        const hw = p.kind === 0 ? 0.36 : p.kind === 3 ? 0.55 : 0.6;
        if (Math.abs(this.propRel(p) - this.X) < hw + 0.16 && this.Y < p.h * (p.kind === 3 ? 0.88 : 1) - 0.1) this.hit(t, p.kind === 1 ? 'trip' : 'fall');
      }
    }
    // shots land when they said they would
    for (const q of this.shots) {
      if (q.done || t < q.t1) continue;
      q.done = true;
      if (q.foe) { this.booms.push({ t: q.t1, x: q.to[0], y: q.to[1], z: q.to[2], size: 1.15 }); this.score += 100; }
      if (q.prop) { this.booms.push({ t: q.t1, x: q.to[0], y: q.to[1], z: q.to[2], size: 1.1 }); this.score += 50; }
      if (q.head) { this.score += 200; this.sparks.push({ t: q.t1, x: q.to[0], y: q.to[1], z: q.to[2], dx: 0, dy: 0 }); }
      if (q.kind === 'glance') {
        const a = (q.t1 * 91.7) % 6.28;
        this.sparks.push({ t: q.t1, x: q.to[0], y: q.to[1], z: q.to[2], dx: Math.cos(a) * 6, dy: Math.sin(a) * 6 });
      }
    }
    // what crosses his plane
    for (const q of this.bolts) {
      if (q.hit || t < q.t1) continue;
      q.hit = true;
      if (Math.abs(q.to[0] - this.X) < 0.42 && Math.abs(q.to[1] - (this.Y + 0.62)) < 0.62) this.hit(t, 'fall');
    }
    for (const f of this.foes) {
      if (f.dead || t < f.t0 || f.crossed) continue;
      const P = this.foeAt(f, t);
      if (P[2] <= SKY_ZH) {
        f.crossed = true;
        if (Math.abs(P[0] - this.X) < 0.75 && Math.abs(P[1] - (this.Y + 0.62)) < 0.8 && t > this.safeUntil && !this.fall && !this.trip) {
          f.dead = t;
          this.booms.push({ t, x: P[0], y: P[1], z: P[2], size: 1.5 });
          this.hit(t, 'fall');
        }
      }
    }
    // the eighth, and he fires; the sixteenth, and he thinks again
    if (t >= this.nextFire) { this.fire(this.nextFire); this.nextFire = grid.next(this.nextFire + 1e-6, 2); }
    if (t >= this.nextThink) { this.think(t); this.nextThink = grid.next(this.nextThink + 1e-6, 1); }
    // him
    if (this.fall) {
      this.vx *= Math.exp(-dt * 7);
      this.X += this.vx * dt;
      this.vy -= 13 * dt;
      this.Y = Math.max(0, this.Y + this.vy * dt);
      if (this.Y <= 0) this.vy = 0;
      if (t >= this.fall.t0 + this.fall.dur) {
        this.fall = null;
        this.safeUntil = t + 4 * spb;
        this.tx = this.X; this.ty = 0;
      }
    } else if (this.trip) {
      this.vx *= Math.exp(-dt * 8);
      this.X += this.vx * dt;
      this.vy = 0;
      this.Y = Math.max(0, this.Y - 8 * dt);
      if (t >= this.trip.t0 + this.trip.dur) { this.trip = null; this.safeUntil = t + 2 * spb; }
    } else {
      const wantX = Math.max(-SKY_VX, Math.min(SKY_VX, (this.tx - this.X) * 7));
      const wantY = Math.max(-SKY_VY, Math.min(SKY_VY, (this.ty - this.Y) * 7));
      this.vx += Math.max(-SKY_ACC * dt, Math.min(SKY_ACC * dt, wantX - this.vx));
      this.vy += Math.max(-SKY_ACC * dt, Math.min(SKY_ACC * dt, wantY - this.vy));
      this.X = Math.max(-SKY_XMAX, Math.min(SKY_XMAX, this.X + this.vx * dt));
      const wasUp = this.Y > 0;
      this.Y = Math.max(0, Math.min(SKY_YMAX, this.Y + this.vy * dt));
      if (wasUp && this.Y <= 0) { this.land = Math.min(1, Math.max(0.3, -this.vy / SKY_VY)); this.vy = 0; }
    }
    const lk = 1 - Math.exp(-dt / 0.17);
    this.lagX += (this.vx - this.lagX) * lk;
    this.lagY += (this.vy - this.lagY) * lk;
    this.land *= Math.exp(-dt * 7);
    this.wRun += ((this.Y < 0.02 && !this.fall ? 1 : 0) - this.wRun) * (1 - Math.exp(-dt / 0.07));
    // the horizon, late, rising with him
    this.hor += (skyMix(SKY_HOR0, SKY_HOR1, Math.pow(this.Y / SKY_YMAX, 1.2)) - this.hor) * (1 - Math.exp(-dt / 0.3));
    // let go of what has gone by
    if (this.step % 240 === 0) {
      const old = t - 3;
      this.foes = this.foes.filter((f) => !(f.dead && f.dead < old) && (t - f.t0) / spb < f.end + 1);
      this.props = this.props.filter((p) => p.wz - this.travel > 0.3 && !(p.dead && p.dead < old));
      this.shots = this.shots.filter((q) => q.t1 > old);
      this.bolts = this.bolts.filter((q) => q.t1 > old);
      this.booms = this.booms.filter((q) => q.t > old);
      this.sparks = this.sparks.filter((q) => q.t > old);
    }
    this.step++;
    this.t = this.step * SKY_DT;
  }

  advanceTo(t) {
    const want = Math.floor(Math.max(0, t) / SKY_DT);
    if (want < this.step) this.reset();
    while (this.step < want) this.tick();
  }

  /** His pose now: which of his actions, blended with the next. */
  pose(t) {
    const spb = this.grid.spb, beat = t / spb;
    if (this.fall) return skyKeys(SKY_FALL, Math.min(1, (t - this.fall.t0) / this.fall.dur));
    if (this.trip) return skyKeys(SKY_TRIP, Math.min(1, (t - this.trip.t0) / this.trip.dur));
    // running: a stride to the beat, as near half a second as the tempo lets; the knees high and the heels kicked up behind
    const strides = spb < 0.4 ? 0.5 : spb > 0.72 ? 2 : 1;
    const ph = beat * strides * Math.PI * 2;
    const legRun = (a) => {
      const c = Math.cos(a - 0.2);
      const swing = Math.pow(Math.max(0, c), 1.5);
      return [0.22 + 0.95 * Math.sin(a), 0.07 + 0.2 * swing, 0.25 + 1.75 * swing, 0.15 + 0.6 * Math.max(0, c)];
    };
    const L = legRun(ph), R = legRun(ph + Math.PI);
    const run = skyPose({
      lean: 0.2 + 0.05 * Math.cos(2 * ph), roll: 0.09 * Math.cos(ph), twist: 0.32 * Math.sin(ph), headY: -0.2 * Math.sin(ph), pitch: 0.1,
      hipFL: L[0], hipAL: L[1], kneeL: L[2], ankL: L[3], hipFR: R[0], hipAR: R[1], kneeR: R[2], ankR: R[3],
      shFL: 0.2 - 0.95 * Math.sin(ph), shAL: 0.3, elL: 1.4, shFR: 1.0 + 0.16 * Math.sin(ph), shAR: 0.22, elR: 0.75,
    });
    if (this.wRun > 0.995 && this.land < 0.01) return run;
    // flying: his legs apart and trailing, swaying, and thrown by what he has just done
    const lx = this.lagX / SKY_VX, ly = this.lagY / SKY_VY;
    const sway = Math.sin(beat * Math.PI) * 0.11, sw2 = Math.sin(beat * Math.PI + 1.1) * 0.09;
    const fly = skyPose({
      pitch: 0.2 - 0.2 * ly, lean: 0.12 - 0.08 * ly, twist: 0.1 * lx, headP: -0.14 + 0.18 * ly, headY: 0.18 * lx,
      hipFL: -0.08 + sway - 0.1 * ly, hipAL: 0.44 + 0.14 * Math.max(0, -lx) + sw2 * 0.4,
      kneeL: 0.5 + 0.4 * Math.max(0, -ly) + sw2, ankL: 0.9,
      hipFR: -0.16 - sway + 0.05 * ly, hipAR: 0.44 + 0.14 * Math.max(0, lx) - sw2 * 0.4,
      kneeR: 0.34 + 0.5 * Math.max(0, -ly) - sw2, ankR: 0.9,
      shFL: 0.35 + 0.25 * ly, shAL: 0.85 + 0.55 * lx + 0.45 * Math.max(0, ly) + 0.08 * Math.sin(beat * Math.PI + 0.5), elL: 0.55,
      shFR: 0.98, shAR: 0.2, elR: 0.72,
    });
    const P = skyBlend(fly, run, this.wRun);
    if (this.land > 0.01) {
      // touching down, the knees take it
      const k = this.land;
      P[SKP.kneeL] += 0.9 * k; P[SKP.kneeR] += 0.9 * k;
      P[SKP.hipFL] += 0.5 * k; P[SKP.hipFR] += 0.5 * k;
      P[SKP.lean] += 0.35 * k;
    }
    return P;
  }

  /** The figure now, seen from where the eye is: at the side of the screen, from the side; high up, from below. */
  figure(t) {
    const F = SKY_F, H = this.hor;
    const hx = this.X * F / SKY_ZH, feet = SKY_GY + this.Y * F / SKY_ZH;
    const lx = this.lagX / SKY_VX, ly = this.lagY / SKY_VY;
    const view = { yaw: Math.atan2(hx, F) * 0.88, pitch: Math.atan2(feet + 0.14 - H, F) + (feet + 0.14) * 0.25, roll: 0.28 * lx, turn: 0.26 * lx };
    let ground = this.wRun;
    if (this.fall) ground = skyMix(1, 0.35, Math.min(1, this.Y / 0.3));
    if (this.trip) ground = 1;
    const air = 1 - this.wRun;
    const fl = (k) => (0.1 + air * (0.32 + 0.22 * Math.max(0, ly))) * (0.85 + 0.25 * Math.sin(t * 70 + k * 2.1));
    const scarf = [];
    for (let k = 0; k < 3; k++) {
      const w = Math.sin(t * 11 - k * 1.5) * (0.03 + 0.022 * k);
      scarf.push([-0.1 - lx * 0.1 + w * 0.5, -ly * 0.05 - 0.03 - 0.018 * k + w, -0.1]);
    }
    const age = t - this.lastFire;
    return skyFigure(this.pose(t), view, ground, [fl(0), fl(1)], scarf, age >= 0 && age < 0.07 ? 1 - age / 0.07 : 0);
  }

  uniforms(t) {
    this.advanceTo(t);
    const spb = this.grid.spb, F = SKY_F;
    const H = this.hor;
    const E = (H - SKY_GY) * SKY_ZH / F;      // the eye's height: what keeps the ground under him at the foot of the screen
    const proj = (P) => [P[0] * F / P[2], H + (P[1] - E) * F / P[2]];
    const list = [];
    const put = (x, y, z, kind, a, b, c, R) => list.push({ x, y, z, kind, a, b, c, R });
    for (const p of this.props) {
      const z = p.wz - this.travel;
      // (what has passed him goes soon after, as the genre's scenery did: nothing grows across the screen in front of him)
      if ((p.dead && p.dead <= t) || z < (p.kind === 0 || p.kind === 3 ? 2.2 : 3.4)) continue;
      const rx = this.propRel(p);
      if (Math.abs(rx) * F / z > 1.3) continue;
      put(rx * F / z, H - E * F / z, z, p.kind, p.h, p.ph, 0, p.kind === 0 ? 0.55 : p.kind === 3 ? 1.15 + p.h * 0.1 : 0.95);
    }
    for (const f of this.foes) {
      if ((f.dead && f.dead <= t) || t < f.t0) continue;
      const P = this.foeAt(f, t);
      if (P[2] < 0.4) continue;
      const s = proj(P);
      if (Math.abs(s[0]) > 1.4) continue;
      const u = (t - f.t0) / spb;
      if (f.kind === 5) put(s[0], s[1], P[2], 5, this.podOpen(f, t), u, 0, 1.0);
      else if (f.kind === 6) put(s[0], s[1], P[2], 6, P[3], u, 0, 0.75);
      else put(s[0], s[1], P[2], 4, Math.max(-1, Math.min(1, (this.foeAt(f, t + 0.05)[0] - P[0]) * 2)), u, 0, 0.75);
    }
    // the serpent; its head nearest in its own line, so it is in front of its body
    const B = this.boss;
    if (B && t >= B.t0 && t < B.t1) {
      const hurt = Math.min(6, Math.round((t - B.t0) / (B.t1 - B.t0) * 6));
      for (let k = B.n - 1; k >= 0; k--) {
        const tau = t - this.bossLink(k);
        if (tau < B.t0) continue;
        const P = this.bossAt(B, tau);
        const s = proj(P);
        const r = k === 0 ? 1.1 : 0.95 - k * 0.045;
        put(s[0], s[1], P[2], 7, r, hurt, k === 0 ? 1 : 0, r * 1.3);
      }
    }
    for (const q of this.shots) {
      if (t < q.t0 || t >= q.t1) continue;
      const u = (t - q.t0) / (q.t1 - q.t0);
      const P = [skyMix(q.from[0], q.to[0], u), skyMix(q.from[1], q.to[1], u), skyMix(q.from[2], q.to[2], u)];
      const s = proj(P);
      put(s[0], s[1], P[2], 8, u, Math.floor(t * 30) % 4, 0, 0.7);
    }
    for (const q of this.bolts) {
      if (t < q.t0) continue;
      const u = (t - q.t0) / (q.t1 - q.t0);
      if (u > 1.25) continue;
      const P = [skyMix(q.from[0], q.to[0], u), skyMix(q.from[1], q.to[1], u), Math.max(0.5, skyMix(q.from[2], SKY_ZH, u))];
      const s = proj(P);
      put(s[0], s[1], P[2], 9, t, 0, 0, 0.5);
    }
    for (const b of this.booms) {
      const since = t - b.t;
      if (since < 0 || since > 0.6) continue;
      const s = proj([b.x, b.y, b.z]);
      put(s[0], s[1], b.z, 10, since, b.size, 0, b.size * 1.5);
    }
    for (const q of this.sparks) {
      const since = t - q.t;
      if (since < 0 || since > 0.25) continue;
      const P = [q.x + q.dx * since, q.y + q.dy * since, q.z];
      const s = proj(P);
      put(s[0], s[1], P[2], 11, since, 0, 0, 0.7);
    }
    list.sort((a, b) => b.z - a.z);
    while (list.length > SKY_SPRITES - 1) list.shift();    // (the farthest go first)
    let split = list.length;
    for (let i = 0; i < list.length; i++) if (list[i].z < SKY_ZH) { split = i; break; }
    const spr = new Float32Array(SKY_SPRITES * 4), sprB = new Float32Array(SKY_SPRITES * 4);
    list.forEach((s, i) => { spr.set([s.x, s.y, s.z, s.kind], i * 4); sprB.set([s.a, s.b, s.c, s.R], i * 4); });

    const limbA = new Float32Array(SKY_LIMBS * 4), limbB = new Float32Array(SKY_LIMBS * 4);
    this.figure(t).limbs.slice(0, SKY_LIMBS).forEach((l, i) => {
      if (l.aux) limbA.set([l.ax, l.ay, l.aux[0], l.aux[1]], i * 4);
      else limbA.set([l.ax, l.ay, l.bx, l.by], i * 4);
      limbB.set([l.ra, l.rb, l.id, 0], i * 4);
    });
    // while he gets over a fall he blinks, nothing touches him
    const shown = t < this.safeUntil && !this.fall && !this.trip ? Math.floor(t / this.grid.six * 2) % 2 : 1;
    const hx = this.X * F / SKY_ZH, air = this.Y * F / SKY_ZH;
    return {
      uSkyCam: { v: [H, E, this.lives, t - this.flash], kind: '4f' },
      uSkyFx: { v: [this.score % 1000000, this.travel, this.camX, this.stage], kind: '4f' },
      uSkyHero: { v: [hx, SKY_GY + air, F / SKY_ZH, shown], kind: '4f' },
      uSkyShade: { v: [hx, SKY_GY, 1, 0], kind: '4f' },
      uSkyCount: { v: [list.length, split, spb, 0], kind: '4f' },
      uSkySpr: { v: spr, kind: '4fv' },
      uSkySprB: { v: sprB, kind: '4fv' },
      uSkyLimbA: { v: limbA, kind: '4fv' },
      uSkyLimbB: { v: limbB, kind: '4fv' },
    };
  }
}

// ---------------------------------------------------------------------------
// The scanner car: a real car on a real road. The road is laid out ahead of the
// car in samples - long straights, sweepers, rises and dips - and the car drives
// it as a vehicle does: a driver looks ahead and steers, the tyres grip until
// they slide, four springs carry the body, which dives, squats and leans, and
// leaves the ground when it is thrown off it. The music plans the stunts: on its
// big moments the car lands, so the boost fires a flight's time before them, over
// a barrier across a stretch of road kept straight for it. A director cuts between
// cameras on the bars. Everything goes to the shader relative to the eye, so the
// numbers stay small however far the car has gone.
// ---------------------------------------------------------------------------

export const SC_ROAD = 64, SC_PROPS = 22, SC_PARTS = 24;
const SC_DT = 1 / 120;
const SC_STEP = 30;                  // metres of road between samples (the shader has the same)
const SC_TILE = 3000;                // the road's markings and grit repeat after this
const SC_G = 9.81;
const SC_MASS = 1500, SC_IZ = 2500, SC_IP = 2200, SC_IR = 550;
const SC_LF = 1.33, SC_LR = 1.23, SC_TRACK = 0.79, SC_H = 0.5;  // axles, half track, height of the weight
const SC_WHEEL = 0.33;
const SC_K = 30000, SC_C = 2400;     // each spring and damper
const SC_SAG = SC_MASS * SC_G / (4 * SC_K);
const SC_DROOP = 0.14, SC_BUMP = 0.11;
const SC_MUF = 1.04, SC_MUR = 1.0, SC_CORNER = 95000;
const SC_LANE = 1.85;

export class ScannerSim {
  constructor(seed, spb, meta, features) {
    this.seed = seed;
    this.grid = new MusicGrid(spb, meta);
    this.spb = this.grid.spb;
    this.sh = 0;
    for (let i = 0; i < String(seed).length; i++) this.sh = Math.imul(this.sh ^ String(seed).charCodeAt(i), 16777619) >>> 0;
    // how hard the music is going, smoothed: the car's pace
    this.energy = null;
    this.kicks = null;
    if (features) {
      const tr = features.tracks, n = features.n;
      const k = 1 - Math.exp(-1 / (1.4 * FEATURE_RATE));
      this.energy = new Float32Array(n);
      this.kicks = tr.kick;
      let en = 0.1, top = 0;
      for (let i = 0; i < n; i++) {
        const e = Math.min(1, tr.kick[i] * 0.55 + tr.snare[i] * 0.4 + tr.bass[i] * 0.35 + tr.lead[i] * 0.3 + tr.arp[i] * 0.25 + tr.pad[i] * 0.4);
        en += (e - en) * k;
        this.energy[i] = en;
        top = Math.max(top, en);
      }
      this.energyTop = Math.max(0.05, top);    // (a thin tune and a thick one both reach the car's top pace)
    }
    // a flight lasts four beats, or two when four would throw it too high
    this.flight = 4 * this.spb <= 2.3 ? 4 * this.spb : 2 * this.spb;
    this.road = new Float32Array(SC_ROAD * 2);
    this.props = new Float32Array(SC_PROPS * 4);
    this.parts = new Float32Array(SC_PARTS * 4);
    this.reset();
  }

  reset() {
    this.rng = new Rng(this.seed, 'scanner-sim');
    this.t = 0;
    // the road
    this.rx = []; this.ry = []; this.rk = [];
    this.ri = 0;                     // samples laid: index i is at z = (i - 64) * SC_STEP
    this.th = 0; this.kap = 0; this.kapT = 0; this.seg = 300;
    this.y1 = this.rng.float(0, 6.28); this.y2 = this.rng.float(0, 6.28);
    // the music's stunts
    this.stunts = [];
    this.scanBar = 1;
    this.lastStunt = -1e9;
    this.lastZ = 0; this.lastT = -1;
    // the car: position, heading, speed along and across, yaw rate, steering
    this.X = 0; this.Z = 0; this.psi = 0; this.u = 34; this.w = 0; this.r = 0; this.delta = 0;
    this.ax = 0; this.ae = 0;
    this.scheduleStunts();
    this.layRoad();
    this.X = this.roadX(0) + SC_LANE;
    // the body on its springs
    this.Y = this.roadY(0); this.vy = 0; this.pitch = 0; this.pv = 0; this.roll = 0; this.rv = 0;
    this.c = [SC_SAG, SC_SAG, SC_SAG, SC_SAG];
    this.F = [0, 0, 0, 0];
    this.wy = [SC_WHEEL, SC_WHEEL, SC_WHEEL, SC_WHEEL];
    this.air = false; this.airFrom = 0; this.lastLand = -9;
    this.spin = 0;
    this.lane = SC_LANE; this.laneT = SC_LANE; this.nextLane = 6;
    this.brake = 0;
    // the light
    this.phase = 0; this.rate = 1;
    this.boost = 0; this.flash = 0; this.shake = 0;
    this.particles = [];
    this.emit = 0;
    this.landings = [];              // when each flight ended (for the checks)
    this.maxOff = 0;
    this.maxSlip = 0;
    // the eye
    this.shot = null; this.lastKinds = [];
    this.cutAt = 0;
    this.cam = [0, 1, 0]; this.look = [0, 1, 10]; this.cv = [0, 0, 0];
    this.nextCut();
    this.placeEye(1);
  }

  // ---- the road ----
  roadSample(arr, u) {
    const i = Math.floor(u), f = u - i;
    const a = arr[i - 1], b = arr[i], c = arr[i + 1], d = arr[i + 2];
    return b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
  }
  roadX(z) { return this.roadSample(this.rx, z / SC_STEP + 64); }
  roadY(z) { return this.roadSample(this.ry, z / SC_STEP + 64); }

  /** How far z lies inside the straight, level stretch a stunt keeps for itself: 0 to 1. */
  zone(z) {
    let w = 0;
    for (const s of this.stunts) {
      const a = s.zOff - 180, b = s.zEnd + 160;
      w = Math.max(w, smooth(a - 200, a, z) * (1 - smooth(b, b + 200, z)));
    }
    return w;
  }

  /** Lay the road a kilometre and more ahead of the car. */
  layRoad() {
    const until = this.Z + 1150;
    while ((this.ri - 64) * SC_STEP < until) {
      const i = this.ri++, z = (i - 64) * SC_STEP;
      if (z < 0) { this.rx.push(0); this.ry.push(this.heightAt(0)); this.rk.push(0); continue; }
      if (this.seg <= 0) {
        const r = this.rng, roll = r.float(0, 1);
        if (roll < 0.42) {
          this.kapT = 0; this.seg = r.float(180, 520);
        } else {
          const side = Math.abs(this.th) > 0.3 ? -Math.sign(this.th) : (r.bool() ? 1 : -1);
          const R = roll > 0.82 ? r.float(170, 230) : r.float(320, 800);
          this.kapT = side / R;
          this.seg = Math.min(r.float(180, 420), 0.7 * R);
        }
      }
      this.seg -= SC_STEP;
      const w = this.zone(z);
      this.kap += (this.kapT * (1 - w) - this.kap) * 0.25;
      this.th = Math.max(-0.65, Math.min(0.65, this.th + this.kap * SC_STEP));
      const x0 = this.rx.length ? this.rx[this.rx.length - 1] : 0;
      this.rx.push(x0 + Math.tan(this.th) * SC_STEP);
      this.rk.push(this.kap);
      // each stunt levels the road round it, one easing into the next
      let h = this.heightAt(z);
      for (const s of this.stunts) {
        const a = s.zOff - 180, b = s.zEnd + 160;
        h += (s.y - h) * smooth(a - 200, a, z) * (1 - smooth(b, b + 200, z));
      }
      this.ry.push(h);
    }
  }
  heightAt(z) { return 7 * Math.sin(z * 0.0043 + this.y1) + 1.8 * Math.sin(z * 0.0151 + this.y2); }

  /** The music's big moments, as far ahead as the road is not yet laid. */
  scheduleStunts() {
    const barSec = this.grid.barSec;
    const gap = Math.max(16, barSec * 8 - 0.01);
    for (;;) {
      const T = this.scanBar * barSec;
      if (T - this.t > 60) break;      // (far enough that the road there is not yet laid)
      this.scanBar++;
      if (!this.grid.isAccent(T)) continue;
      const off = T - this.flight;
      if (off - this.t < 9 || T < this.lastStunt + gap) continue;
      const v = Math.max(34, 27 + 27 * this.energyAt(off));
      // from the last landing planned, or from here: at a pace the car can hold
      const from = this.lastT > this.t ? [this.lastZ, this.lastT] : [this.Z, this.t];
      const zOff = from[0] + (off - from[1]) * v;
      const span = v * this.flight;
      this.stunts.push({ T, off, zOff, zBar: zOff + span / 2, zEnd: zOff + span, y: this.heightAt(zOff), done: false });
      this.lastStunt = T;
      this.lastT = T;
      this.lastZ = zOff + span;
    }
  }

  energyAt(t) {
    if (!this.energy) return 0.5;
    return this.energy[Math.min(this.energy.length - 1, Math.max(0, Math.floor(t * FEATURE_RATE)))] / this.energyTop;
  }
  kickAt(t) {
    if (!this.kicks) return 0;
    return this.kicks[Math.min(this.kicks.length - 1, Math.max(0, Math.floor(t * FEATURE_RATE)))];
  }

  /** The stunt still to come or in flight. */
  stunt() {
    for (const s of this.stunts) if (s.T + 0.8 > this.t) return s;
    return null;
  }

  // ---- a sixtieth or so of the world ----
  step() {
    const dt = SC_DT, t = this.t;
    this.scheduleStunts();
    this.layRoad();
    const s = this.stunt();

    // the driver: the pace the music asks, what the bend ahead allows, and being on time for the stunt
    const e = this.energyAt(t);
    let vT = 29 + 27 * e;
    const iNow = Math.floor(this.Z / SC_STEP) + 64, iFar = Math.floor((this.Z + this.u * 2.2) / SC_STEP) + 64;
    let kMax = 0;
    for (let i = iNow; i <= iFar && i < this.rk.length; i++) kMax = Math.max(kMax, Math.abs(this.rk[i]));
    if (kMax > 1e-4) vT = Math.min(vT, Math.sqrt(8.8 / kMax));
    if (s && t < s.off) {
      // the nearer the stunt, the closer to the one speed that arrives on time
      const left = s.off - t;
      const avg = Math.max(0, s.zOff - this.Z) / Math.max(0.05, left);
      const give = 0.3 * Math.min(1, Math.max(0, (left - 1.5) / 14));
      vT = Math.max(20, Math.min(58, Math.max(avg * (1 - give), Math.min(avg * (1 + give), vT))));
      if (kMax > 1e-4) vT = Math.min(vT, Math.sqrt(8.8 / kMax));
      // the barrier stands where the flight will be highest, settled while it is still a speck
      if (left > 4) s.zBar = this.Z + this.u * (left + this.flight / 2);
    }
    const dv = vT - this.u;
    let ax = Math.max(-10, Math.min(7.5, dv * 1.6));
    this.brake += ((ax < -2.5 && !this.air ? 1 : 0) - this.brake) * Math.min(1, dt * 12);

    // and where it points her: a point on the lane ahead
    if (t > this.nextLane) {
      this.nextLane = t + this.rng.float(4, 11);
      this.laneT = this.rng.bool(0.62) ? SC_LANE : -SC_LANE * 0.2;
    }
    if (s && t > s.off - 6 && t < s.T + 1) this.laneT = 0;
    this.lane += (this.laneT - this.lane) * Math.min(1, dt * 0.7);
    const La = 7 + this.u * 0.72;
    const px = this.roadX(this.Z + La) + this.lane;
    const ang = Math.atan2(px - this.X, La) - this.psi;
    const L = SC_LF + SC_LR;
    let dT = Math.atan(2 * L * Math.sin(ang) / La);
    dT = Math.max(-0.42, Math.min(0.42, dT));
    this.delta += Math.max(-1.6 * dt, Math.min(1.6 * dt, dT - this.delta));

    // the tyres, as far as each axle is pressed to the road
    const Nf = this.F[0] + this.F[1], Nr = this.F[2] + this.F[3];
    const uu = Math.max(4, this.u);
    const afz = this.delta - Math.atan((this.w + SC_LF * this.r) / uu);
    const arz = -Math.atan((this.w - SC_LR * this.r) / uu);
    const limF = SC_MUF * Nf;
    const drive = ax > 0 ? SC_MASS * ax : SC_MASS * ax * 0.35;
    // (the throttle is held to what the rear tyres can give and still hold a line)
    const limLong = Math.abs(ax > 0 ? 0.72 * SC_MUR * Nr : SC_MUF * Nf);
    const longF = Math.max(-limLong, Math.min(limLong, ax > 0 ? drive : SC_MASS * ax));
    const limR = Math.sqrt(Math.max(0, (SC_MUR * Nr) ** 2 - (ax > 0 ? longF * longF : (0.35 * longF) ** 2)));
    const Ff = limF > 1 ? limF * Math.tanh(SC_CORNER * afz / limF) : 0;
    const Fr = limR > 1 ? limR * Math.tanh(SC_CORNER * arz / limR) : 0;
    ax = (Nf + Nr) > 10 ? longF / SC_MASS : 0;

    // a car built for this keeps herself straight: the brakes on one side answer a yaw she was not asked for
    const yawWanted = this.u * Math.tan(this.delta) / L;
    const yawKeep = (Nf + Nr) > 10 ? -9000 * (this.r - yawWanted) : 0;

    this.w += ((Ff + Fr) / SC_MASS - this.u * this.r) * dt;
    this.r += ((SC_LF * Ff - SC_LR * Fr + yawKeep) / SC_IZ) * dt;
    if (Nf + Nr < 10) this.r *= 1 - dt * 1.2;     // in the air she keeps her line and slowly stops turning
    this.u = Math.max(4, this.u + (ax + this.w * this.r) * dt);
    this.psi += this.r * dt;
    const sp = Math.sin(this.psi), cp = Math.cos(this.psi);
    this.X += (this.u * sp + this.w * cp) * dt;
    this.Z += (this.u * cp - this.w * sp) * dt;
    this.ax = ax;
    this.ae = (Ff + Fr) / SC_MASS;
    this.spin = (this.spin + this.u / SC_WHEEL * dt) % 6.283185;

    // the body on its four springs
    const sumF = this.suspend(sp, cp, dt);

    // the boost: a flight's time before the moment
    if (s && !s.done && t >= s.off) {
      s.done = true;
      this.vy += SC_G * this.flight / 2;
      this.pv += 0.32;
      this.boost = 1;
      this.burst(10, 6);
      this.airFrom = t;
    }
    // (a blow, then she flies on what it gave her)
    this.boost *= 1 - dt * 3.5;

    // back to earth
    const airNow = sumF < 1;
    if (this.air && !airNow && t - this.airFrom > 0.2 && t - this.lastLand > 0.8) {
      this.flash = 1;
      this.shake = 1;
      this.burst(16, 8);
      this.landings.push(t);
      this.lastLand = t;
    }
    if (!this.air && airNow) this.airFrom = this.airFrom || t;
    this.air = airNow;
    this.flash *= 1 - dt * 4.5;
    this.shake *= 1 - dt * 4;

    // the sweep: a pass on every beat, faster as the stunt nears
    let rate = 1;
    if (s && t > s.off - 2 * this.spb * 2 && t < s.T) rate = 2;
    if (s && s.done && t < s.T) rate = 4;
    this.rate = rate;
    this.phase = (this.phase + rate * dt / this.spb) % 2;

    this.moveParticles(sp, cp, Math.abs(arz), dt);
    this.maxOff = Math.max(this.maxOff, Math.abs(this.X - this.roadX(this.Z)));
    this.maxSlip = Math.max(this.maxSlip, Math.abs(arz));

    this.t += dt;
    if (this.t >= this.cutAt) this.nextCut();
    this.moveEye(dt);
  }

  /** Each corner's spring and the body's answer; returns what the ground pushes with. */
  suspend(sp, cp, dt) {
    let up = 0, tp = 0, tr = 0;
    const m = SC_MASS, sinP = Math.sin(this.pitch), sinR = Math.sin(this.roll);
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 === 0 ? -SC_TRACK : SC_TRACK;
      const sz = i < 2 ? SC_LF : -SC_LR;
      const wx = this.X + cp * sx + sp * sz, wz = this.Z - sp * sx + cp * sz;
      // the road's own grain: a seam here and there, a long shallow ripple
      const G = this.roadY(wz) + 0.002 * Math.sin(wz * 2.1 + sx * 3) + 0.012 * Math.sin(wz * 0.53 + sx);
      const at = this.Y + sz * sinP - sx * sinR;
      const c = G + SC_SAG - at;                  // how far this spring is pressed
      const rate = (c - this.c[i]) / dt;
      this.c[i] = c;
      let F = 0;
      if (c > 0) {
        F = SC_K * c + SC_C * rate;
        if (c > SC_SAG + SC_BUMP) F += 9 * SC_K * (c - SC_SAG - SC_BUMP) + 3 * SC_C * rate;
        F = Math.max(0, F);
      }
      this.F[i] = F;
      up += F; tp += F * sz; tr -= F * sx;
      // where the wheel sits in the body's frame: on the road, or hanging free
      this.wy[i] = Math.min(SC_WHEEL + SC_BUMP + 0.03, Math.max(SC_WHEEL - SC_SAG - SC_DROOP, G + SC_WHEEL - at));
      if (c > SC_SAG + 0.13 && this.emit <= 0) {
        this.emit = 0.012;
        this.spark(wx, G + 0.05, wz, 1);
      }
    }
    const kick = this.kickAt(this.t) * (this.air ? 0 : 1);
    this.vy += (up / m - SC_G - kick * 0.9) * dt;
    this.Y += this.vy * dt;
    // squat, dive, lean; in the air she levels herself, as a car built for it would
    const air = up < 1;
    this.pv += ((tp + m * this.ax * SC_H) / SC_IP - (air ? this.pitch * 2.2 + this.pv * 1.6 : 0)) * dt;
    this.rv += ((tr - m * this.ae * SC_H) / SC_IR - (air ? this.roll * 3 + this.rv * 2 : 0)) * dt;
    this.pitch += this.pv * dt;
    this.roll += this.rv * dt;
    return up;
  }

  // ---- sparks and dust ----
  spark(x, y, z, n) {
    const r = this.rng;
    const sp = Math.sin(this.psi), cp = Math.cos(this.psi);
    for (let k = 0; k < n; k++) {
      this.addPart({ kind: 1, x, y, z, life: r.float(0.25, 0.7),
        vx: sp * this.u * 0.75 + r.float(-3.5, 3.5), vy: r.float(1, 5.5), vz: cp * this.u * 0.75 + r.float(-3.5, 3.5) });
    }
  }
  dust(x, y, z, life) {
    const sp = Math.sin(this.psi), cp = Math.cos(this.psi), r = this.rng;
    this.addPart({ kind: 2, x, y, z, life, life0: life, vx: sp * this.u * 0.2 + r.float(-1, 1), vy: r.float(0.2, 0.9), vz: cp * this.u * 0.2 + r.float(-1, 1) });
  }
  addPart(p) {
    if (this.particles.length >= SC_PARTS) this.particles.shift();
    this.particles.push(p);
  }
  burst(sparks, puffs) {
    const sp = Math.sin(this.psi), cp = Math.cos(this.psi), G = this.roadY(this.Z), r = this.rng;
    for (let k = 0; k < sparks; k++) {
      const a = r.float(-1, 1), b = r.float(-2.2, 2.2);
      this.spark(this.X + cp * a + sp * b, G + 0.08, this.Z - sp * a + cp * b, 1);
    }
    for (let k = 0; k < puffs; k++) {
      const a = r.float(-1.6, 1.6), b = r.float(-3, 2);
      this.dust(this.X + cp * a + sp * b, G + 0.25, this.Z - sp * a + cp * b, r.float(0.8, 1.5));
    }
  }
  moveParticles(sp, cp, slip, dt) {
    this.emit -= dt;
    // tyres letting go smoke
    if (slip > 0.085 && !this.air && this.emit <= 0) {
      this.emit = 0.05;
      const s = this.rng.bool() ? -1 : 1;
      this.dust(this.X + cp * s * SC_TRACK - sp * SC_LR, this.roadY(this.Z) + 0.2, this.Z - sp * s * SC_TRACK - cp * SC_LR, 0.8);
    }
    const parts = this.particles;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.kind === 1) {
        p.vy -= SC_G * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const G = this.roadY(p.z);
        if (p.y < G) { p.y = G; p.vy *= -0.45; p.vx *= 0.8; p.vz *= 0.8; }
      } else {
        const k = 1 - dt * 1.3;
        p.vx *= k; p.vz *= k;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
    }
  }

  // ---- the director ----
  nextCut() {
    const r = this.rng, bar = this.grid.barSec, t = this.t;
    const s = this.stunt();
    let kind, dur;
    const pickBars = () => {
      const e = this.energyAt(t);
      const bars = bar * 4 <= 5.5 ? 4 : (bar * 4 <= 9.5 && e < 0.45 ? 4 : 2);
      const d = bars * bar;
      return d < 3 ? d * 2 : d;
    };
    if (s && t >= s.T - 0.01 && t < s.T + 0.5) {
      kind = 'land'; dur = 2 * bar;
    } else if (s && t >= s.off - 2 * this.spb - 0.01 && t < s.T) {
      kind = 'stunt'; dur = s.T - t;
    } else {
      if (this.t < 0.01) {
        kind = 'fly'; dur = Math.max(5, pickBars());
      } else {
        const bag = ['front', 'side', 'rear', 'nose', 'fly', 'crane', 'dash', 'tail', 'quarter', 'quarter'];
        for (;;) {
          kind = bag[Math.floor(r.float(0, bag.length))];
          if (!this.lastKinds.includes(kind)) break;
        }
        dur = pickBars();
        if (kind === 'dash' || kind === 'nose') dur = Math.min(dur, Math.max(3, 2 * bar));
      }
      // never run past the shot that watches the boost
      if (s && t < s.off - 2 * this.spb && t + dur > s.off - 2 * this.spb) {
        dur = s.off - 2 * this.spb - t;
        if (dur < 1.6 && this.shot) { kind = this.shot.kind === 'rear' ? 'tail' : 'rear'; }
      }
    }
    this.lastKinds.push(kind);
    if (this.lastKinds.length > 2) this.lastKinds.shift();
    this.cutAt = t + Math.max(0.25, dur);
    const sd = r.bool() ? 1 : -1;
    const shot = { kind, t0: t, dur: Math.max(0.25, dur), side: sd, a: r.float(0, 1), b: r.float(0, 1), snap: true };
    if (kind === 'fly') {
      const zp = this.Z + this.u * shot.dur * 0.62;
      this.layRoad();
      const y = this.roadY(zp), x = this.roadX(zp);
      shot.at = [x + 1.85 + sd * (4.8 + 1.5 * shot.b), y + 0.42 + 0.35 * shot.a, zp];
    }
    if (kind === 'stunt' && s) {
      const y = this.roadY(s.zBar), x = this.roadX(s.zBar);
      shot.at = [x - 9.5, y + 0.34, s.zBar + 3];
    }
    this.shot = shot;
    this.placeEye(1);
  }

  /** Where this shot wants the eye and what it looks at, given the car. */
  aim() {
    const s = this.shot, sp = Math.sin(this.psi), cp = Math.cos(this.psi);
    const h = Math.min(1, (this.t - s.t0) / s.dur);
    const car = [this.X, this.Y, this.Z];
    const onRoad = (along, lat, up) => {
      const z = this.Z + along;
      const x0 = this.roadX(z), x1 = this.roadX(z + 2);
      const tn = (x1 - x0) / 2, n = Math.hypot(tn, 1);
      return [x0 + (lat) / n, this.roadY(z) + up, z - lat * tn / n];
    };
    let eye, look, f = 2, omega = 7, lookO = 12;
    switch (s.kind) {
      case 'front':
        eye = onRoad(8.5 + 2.5 * s.a, this.lane + (s.side * 1.6 * s.b), 0.5 + 0.5 * s.a);
        look = [car[0], car[1] + 0.55, car[2] + 1.2];
        f = 2.3; omega = 3.2;
        break;
      case 'quarter':
        // ahead and to one side, low: the car as its photographs show it
        eye = onRoad(6.6 + 1.6 * s.a, this.lane + s.side * (3.6 + 1.2 * s.b), 0.62 + 0.5 * s.a);
        look = [car[0], car[1] + 0.5, car[2] + 0.4];
        f = 2.1; omega = 4;
        break;
      case 'side': {
        const along = (s.side > 0 ? 1 : -1) * (5.5 - 11 * h);
        eye = onRoad(along, this.lane - 7.2, 0.75 + 0.5 * s.a);
        look = [car[0], car[1] + 0.55, car[2]];
        f = 1.75; omega = 5;
        break;
      }
      case 'rear':
        eye = onRoad(-9.5, this.lane + 0.5 * s.side * s.a, 2.1 + 0.8 * s.b);
        look = [car[0] + sp * 12, car[1] + 0.8, car[2] + cp * 12];
        f = 1.4; omega = 2.8;
        break;
      case 'tail':
        eye = onRoad(-13, this.lane + 1.2 * s.side, 0.6);
        look = [car[0], car[1] + 0.65, car[2] - 1];
        f = 3; omega = 2.4;
        break;
      case 'nose':
        eye = [car[0] + sp * 4.3 + cp * (s.side * 0.55), car[1] + 0.68, car[2] + cp * 4.3 - sp * (s.side * 0.55)];
        look = [car[0] + sp * 1.7, car[1] + 0.62, car[2] + cp * 1.7];
        f = 1.55; omega = 16; lookO = 22;
        break;
      case 'fly':
        eye = s.at;
        look = [car[0] + sp * 1, car[1] + 1.0, car[2] + cp * 1];
        // a long lens on the car far off, opening as it arrives
        f = 1.7 + 3.2 * Math.pow(1 - Math.min(1, h / 0.62), 2); omega = 1e3; lookO = 9;
        break;
      case 'crane': {
        const along = 12 - 20 * h;
        eye = onRoad(along, this.lane - 8.5 * s.side, 5.5 + 3 * s.a);
        look = [car[0] + sp * 0.6, car[1] + 0.5, car[2] + cp * 0.6];
        f = 2; omega = 4; lookO = 20;
        break;
      }
      case 'dash':
        // from the driver's seat, looking out over the bonnet
        eye = [car[0] + sp * 0.1 - cp * 0.34, car[1] + 1.06, car[2] + cp * 0.1 + sp * 0.34];
        look = [car[0] + sp * 40, car[1] + 0.85, car[2] + cp * 40];
        f = 1.3; omega = 1e3; lookO = 18;
        break;
      case 'stunt':
        eye = s.at;
        look = [car[0], car[1] + 1.1, car[2]];
        f = 1.5; omega = 1e3; lookO = 8;
        break;
      default: // 'land'
        eye = onRoad(12, this.lane - 0.8, 0.42);
        look = [car[0], car[1] + 0.5, car[2]];
        f = 2.8; omega = 3.5;
    }
    return { eye, look, f, omega, lookO };
  }

  placeEye() {
    const a = this.aim(), car = [this.X, this.Y, this.Z];
    this.cam = a.eye.slice(); this.look = a.look.slice(); this.f = a.f;
    this.camRel = a.eye.map((v, i) => v - car[i]);
    this.lookRel = a.look.map((v, i) => v - car[i]);
    this.cv = [0, 0, 0];
  }

  /** The eye follows as an operator would: late relative to the car, never left behind by its speed. */
  moveEye(dt) {
    const a = this.aim(), car = [this.X, this.Y, this.Z];
    const k = 1 - Math.exp(-dt * a.omega), kl = 1 - Math.exp(-dt * a.lookO);
    for (let i = 0; i < 3; i++) {
      this.camRel[i] += (a.eye[i] - car[i] - this.camRel[i]) * k;
      this.lookRel[i] += (a.look[i] - car[i] - this.lookRel[i]) * kl;
      const n = car[i] + this.camRel[i];
      this.cv[i] = (n - this.cam[i]) / dt;
      this.cam[i] = n;
      this.look[i] = car[i] + this.lookRel[i];
    }
    // the ground is under the eye whatever the car does
    const floor = this.roadY(this.cam[2]) + 0.22;
    if (this.cam[1] < floor) this.cam[1] = floor;
    this.f += (a.f - this.f) * Math.min(1, dt * 4);
  }

  advanceTo(t) {
    if (t < this.t - 1e-6) this.reset();
    while (this.t + SC_DT <= t) this.step();
  }

  // ---- what the shader sees: everything relative to the eye ----
  uniforms(t) {
    this.advanceTo(t);
    const ex = Math.max(0, t - this.t);
    const sp = Math.sin(this.psi), cp = Math.cos(this.psi);
    const vx = this.u * sp + this.w * cp, vz = this.u * cp - this.w * sp;
    // a shake that dies away, on the eye only
    const sh = this.shake * this.shake;
    const cx = this.cam[0] + this.cv[0] * ex + sh * 0.1 * Math.sin(t * 61);
    const cy = this.cam[1] + this.cv[1] * ex + sh * 0.14 * Math.sin(t * 73 + 1);
    const cz = this.cam[2] + this.cv[2] * ex;
    const lx = this.look[0] + vx * ex - cx, ly = this.look[1] - cy, lz = this.look[2] + vz * ex - cz;
    const ll = Math.hypot(lx, ly, lz) || 1;
    const F = [lx / ll, ly / ll, lz / ll];
    const hr = Math.hypot(F[2], F[0]) || 1;
    const lean = sh * 0.02 * Math.sin(t * 47);
    let Rx = F[2] / hr, Ry = lean, Rz = -F[0] / hr;
    const rl = Math.hypot(Rx, Ry, Rz) || 1; Rx /= rl; Ry /= rl; Rz /= rl;
    const U = [F[1] * Rz - F[2] * Ry, F[2] * Rx - F[0] * Rz, F[0] * Ry - F[1] * Rx];
    const eyeSpeed = Math.hypot(this.cv[0], this.cv[1], this.cv[2]);

    // the body's axes: its heading, then pitch and lean, a little more than life so they read
    const pi = this.pitch * 1.25, ro = this.roll * 1.35;
    const cP = Math.cos(pi), sP = Math.sin(pi), cR = Math.cos(ro), sR = Math.sin(ro);
    const f = [sp * cP, sP, cp * cP];
    const r0 = [cp, 0, -sp];
    const u0 = [-sp * sP, cP, -cp * sP];
    const R = [r0[0] * cR - u0[0] * sR, r0[1] * cR - u0[1] * sR, r0[2] * cR - u0[2] * sR];
    const Up = [r0[0] * sR + u0[0] * cR, r0[1] * sR + u0[1] * cR, r0[2] * sR + u0[2] * cR];
    const carX = this.X + vx * ex - cx, carY = this.Y + this.vy * ex - cy, carZ = this.Z + vz * ex - cz;

    // the road, sampled round the eye
    const i0 = Math.floor(cz / SC_STEP);
    const base = i0 - 31 + 64;
    for (let j = 0; j < SC_ROAD; j++) {
      const k = Math.max(0, Math.min(this.rx.length - 1, base + j));
      this.road[j * 2] = this.rx[k] - cx;
      this.road[j * 2 + 1] = this.ry[k] - cy;
    }

    this.fillProps(cx, cy, cz, F, i0);

    // sparks and dust
    this.parts.fill(0);
    for (let k = 0; k < this.particles.length && k < SC_PARTS; k++) {
      const p = this.particles[k];
      this.parts[k * 4] = p.x + p.vx * ex - cx;
      this.parts[k * 4 + 1] = p.y + p.vy * ex - cy;
      this.parts[k * 4 + 2] = p.z + p.vz * ex - cz;
      this.parts[k * 4 + 3] = p.kind === 1 ? Math.min(1, p.life * 3) : -Math.max(0.001, p.life / (p.life0 || 1));
    }

    // the barrier of the stunt in hand
    let bar = [0, 0, 1e4, 0];
    const s = this.stunt();
    if (s && t < s.T + 2) {
      const x0 = this.roadX(s.zBar), x1 = this.roadX(s.zBar + 4);
      bar = [x0 - cx, this.roadY(s.zBar) - cy, s.zBar - cz, Math.atan2(x1 - x0, 4)];
    }

    const phase = (this.phase + this.rate * ex / this.spb) % 2;
    const zt = ((cz % SC_TILE) + SC_TILE) % SC_TILE;
    return {
      uScCam: { v: [0, 0, 0, this.f, Rx, Ry, Rz, eyeSpeed, U[0], U[1], U[2], this.shot.kind === 'dash' ? 1 : 0, F[0], F[1], F[2], 0], kind: '4fv' },
      uScCar: { v: [carX, carY, carZ, this.u, R[0], R[1], R[2], this.delta, Up[0], Up[1], Up[2], this.spin, f[0], f[1], f[2], this.brake], kind: '4fv' },
      uScWheel: { v: [this.wy[0], this.wy[1], this.wy[2], this.wy[3]], kind: '4f' },
      uScZ: { v: [cz - i0 * SC_STEP, phase, this.rate, zt], kind: '4f' },
      uScFx: { v: [this.flash, this.boost, this.air ? 1 : 0, this.u], kind: '4f' },
      uScBar: { v: bar, kind: '4f' },
      uScRoad: { v: this.road, kind: '2fv' },
      uScProp: { v: this.props, kind: '4fv' },
      uScPart: { v: this.parts, kind: '4fv' },
    };
  }

  /** What stands by the road near the eye and in its view, nearest first. */
  fillProps(cx, cy, cz, F, i0) {
    const hash = (i, k) => {
      let x = Math.imul(i * 73856093 ^ k * 19349663 ^ this.sh, 0x5bd1e995);
      x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995);
      return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
    };
    const fl = Math.hypot(F[0], F[2]) || 1, fx = F[0] / fl, fz = F[2] / fl;
    const cosCone = Math.cos(Math.atan(1.05 / Math.max(1, this.f)) + 0.12);
    let n = 0;
    this.props.fill(-1);
    const put = (x, y, z, code) => {
      if (n >= SC_PROPS) return;
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d > 430) return;
      if (d > 26 && (dx * fx + dz * fz) / d < cosCone) return;
      const o = n * 4;
      this.props[o] = dx; this.props[o + 1] = dz; this.props[o + 2] = y - cy; this.props[o + 3] = code;
      n++;
    };
    const items = (i) => {
      if (i < 0 || i >= this.rx.length - 2) return;
      const idx = i - 64, z = idx * SC_STEP, x = this.rx[i], y = this.ry[i];
      put(x + 11.5, y, z, 0.5);                                 // a pole on every sample
      const a = hash(idx, 1), b = hash(idx, 2), c = hash(idx, 3);
      const s = a < 0.5 ? -1 : 1;
      const dz = (b - 0.5) * SC_STEP * 0.9;
      const xz = this.roadSample(this.rx, Math.max(2, Math.min(this.rx.length - 3, i + dz / SC_STEP)));
      const yz = this.roadSample(this.ry, Math.max(2, Math.min(this.rx.length - 3, i + dz / SC_STEP)));
      put(xz + s * (13.5 + 42 * c * c), yz, z + dz, (c < 0.6 ? 1 : 2) + 0.998 * b);
      const d = hash(idx, 4);
      if (d < 0.5) put(x - s * (8 + 26 * hash(idx, 5)), y, z + 7, 2 + 0.998 * d * 2);
      if (idx % 11 === 3) put(x + 6.4, y, z + 3, 3.5);
    };
    const near = i0 + 64;
    for (let k = 0; n < SC_PROPS && k < 16; k++) {
      items(near + k);
      if (k > 0) items(near - k);
    }
  }
}

// ---------------------------------------------------------------------------
// The kart race: a pack of eight round a course, the photo finish on the drop
// ---------------------------------------------------------------------------

export const KT_N = 8, KT_SEG = 72, KT_PROPS = 20, KT_PARTS = 32, KT_SHOTS = 4;
export const KT_HALF = 6.0;                 // the track's half width, in metres
export const KT_WALL = 8.4;                 // the barrier either side, from the middle
export const KT_LANE = 5.05;                // how far from the middle a kart's middle may go
export const KT_LONG = 1.8, KT_WIDE = 1.3;  // a kart over its bumpers and its wheels
const KT_DT = 1 / 60;
const KT_FINE = 720;                        // samples round a course, for the karts (one every half metre)
const KT_V0 = 24;                           // the pace, m/s
const KT_RAMP = 2.6;                        // a ramp's length up to its lip, half a metre high
const KT_ROWS = [0.3, 0.68];                // the rows of item cubes, as parts of the lap
const KT_CUBE_D = [-4.2, -1.4, 1.4, 4.2];
// each animal by numbers, one shape for all: its ears (a tapering stub from a base to a tip, the frog's eyes on top)
// with their radii, its muzzle likewise, its eyes, how far out its nose is (0: the frog, whose head is wider)
const KT_LOOK = [
  [[0.15, 0.16, -0.02, 0.07], [0.16, 0.18, -0.02, 0.07], [0, -0.05, 0.16, 0.1], [0, -0.05, 0.17, 0.1], [0.08, 0.04, 0.18, 0.27]],     // bear
  [[0.12, 0.13, -0.02, 0.075], [0.16, 0.31, -0.04, 0.01], [0, -0.05, 0.16, 0.1], [0, -0.05, 0.17, 0.1], [0.08, 0.04, 0.18, 0.27]],  // cat
  [[0.07, 0.16, -0.04, 0.05], [0.1, 0.47, -0.1, 0.05], [0, -0.05, 0.16, 0.1], [0, -0.05, 0.17, 0.1], [0.08, 0.04, 0.18, 0.27]],     // rabbit
  [[0.16, 0.16, -0.04, 0.12], [0.17, 0.19, -0.05, 0.11], [0, -0.05, 0.16, 0.1], [0, -0.05, 0.17, 0.1], [0.08, 0.04, 0.18, 0.27]],   // mouse
  [[0.1, 0.14, 0.07, 0.075], [0.1, 0.15, 0.07, 0.075], [0, 0, 0, 0.01], [0, 0, 0.01, 0.01], [0.1, 0.16, 0.13, 0]],                  // frog
  [[0.13, 0.13, -0.02, 0.06], [0.17, 0.23, 0.02, 0.015], [0, -0.03, 0.15, 0.08], [0, -0.03, 0.24, 0.08], [0.08, 0.04, 0.18, 0.27]], // pig
  [[0.11, 0.13, -0.03, 0.08], [0.15, 0.36, -0.05, 0.01], [0, -0.04, 0.12, 0.1], [0, -0.06, 0.32, 0.03], [0.08, 0.04, 0.18, 0.33]],  // fox
  [[0.19, 0.09, -0.03, 0.06], [0.23, -0.1, -0.05, 0.06], [0, -0.05, 0.16, 0.1], [0, -0.05, 0.17, 0.1], [0.08, 0.04, 0.18, 0.27]],   // dog
];
const KT_SPECIES = 8;                       // bear, cat, rabbit, mouse, frog, pig, fox, dog
const KT_NOSE = 0.95;                       // a kart's nose ahead of its middle: the line is crossed when the nose is on it
const ktWrap = (a) => a - Math.round(a / (2 * Math.PI)) * 2 * Math.PI;

/**
 * A closed course from a seed: a loop pushed out of round by a few slow waves -
 * bends, a hairpin or two, a straight - sampled evenly by length. A loop is
 * thrown away if a bend is tighter than a kart can take or two parts of it come
 * near enough for their barriers to meet.
 */
function ktCourse(rng, lap) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const sx = rng.float(1.05, 1.6);
    const H = [[2, rng.float(0.1, 0.26), rng.float(0, 6.283)], [3, rng.float(0.05, 0.16), rng.float(0, 6.283)], [4, rng.float(0, 0.06), rng.float(0, 6.283)]];
    const pts = ktSample((a) => {
      let r = 1;
      for (const [k, am, ph] of H) r += am * Math.cos(k * a + ph);
      return [sx * r * Math.cos(a), r * Math.sin(a)];
    }, lap);
    const c = ktShape(pts, lap);
    if (c.tight >= 15 && c.near >= 2 * KT_WALL + 12) return c;
  }
  // (an oval always fits)
  return ktShape(ktSample((a) => [1.5 * Math.cos(a), Math.sin(a)], lap), lap);
}

function ktSample(f, lap) {
  const M = 2048, raw = [];
  for (let i = 0; i < M; i++) raw.push(f(i / M * 2 * Math.PI));
  const cum = [0];
  for (let i = 1; i <= M; i++) { const a = raw[i - 1], b = raw[i % M]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const k = lap / cum[M], pts = [];
  let j = 0;
  for (let i = 0; i < KT_FINE; i++) {
    const want = i / KT_FINE * cum[M];
    while (cum[j + 1] < want) j++;
    const u = (want - cum[j]) / (cum[j + 1] - cum[j]);
    const a = raw[j], b = raw[(j + 1) % M];
    pts.push([(a[0] + (b[0] - a[0]) * u) * k, (a[1] + (b[1] - a[1]) * u) * k]);
  }
  return pts;
}

/** The course's frame at each sample: where, the way on, the bend (positive: turning right), and how tight and close it gets. */
function ktShape(pts, lap) {
  const n = pts.length, step = lap / n;
  const tx = new Float64Array(n), tz = new Float64Array(n), kap = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    tx[i] = (b[0] - a[0]) / l; tz[i] = (b[1] - a[1]) / l;
  }
  let tight = Infinity;
  for (let i = 0; i < n; i++) {
    const a = (i - 4 + n) % n, b = (i + 4) % n;
    kap[i] = ktWrap(Math.atan2(tz[b], tx[b]) - Math.atan2(tz[a], tx[a])) / (8 * step);
    tight = Math.min(tight, 1 / Math.max(Math.abs(kap[i]), 1e-6));
  }
  let near = Infinity;
  for (let i = 0; i < n; i += 4) for (let q = i + 4; q < n; q += 4) {
    if (Math.min(q - i, n - (q - i)) * step < 70) continue;
    near = Math.min(near, Math.hypot(pts[i][0] - pts[q][0], pts[i][1] - pts[q][1]));
  }
  return { pts, tx, tz, kap, lap, step, tight, near };
}

/** The course at s metres round it: where, the way on, its right, the bend. */
function ktAt(c, s) {
  const n = c.pts.length;
  let u = (s / c.step) % n;
  if (u < 0) u += n;
  const i = Math.floor(u), f = u - i, j = (i + 1) % n;
  const a = c.pts[i], b = c.pts[j];
  let x = c.tx[i] + (c.tx[j] - c.tx[i]) * f, z = c.tz[i] + (c.tz[j] - c.tz[i]) * f;
  const l = Math.hypot(x, z);
  x /= l; z /= l;
  return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, tx: x, tz: z, rx: -z, rz: x, kap: c.kap[i] + (c.kap[j] - c.kap[i]) * f };
}

/** What stands round a course: trees past the barriers, arrow boards on the outside of the bends, tyres. */
function ktDress(c, rng) {
  const props = [];
  const clear = (x, z, r) => {
    for (let i = 0; i < c.pts.length; i += 6) if (Math.hypot(c.pts[i][0] - x, c.pts[i][1] - z) < r) return false;
    return true;
  };
  for (let s = 0; s < c.lap; s += 4) {
    const a = ktAt(c, s);
    // arrow boards along the outside of a tight bend, pointing the way it turns
    if (Math.abs(a.kap) > 1 / 45 && Math.round(s / 4) % 2 === 0) {
      const side = -Math.sign(a.kap), off = KT_WALL + 0.9;
      const x = a.x + a.rx * side * off, z = a.z + a.rz * side * off;
      if (clear(x, z, KT_WALL + 0.5)) props.push([x, z, a.kap > 0 ? 3 : 2, 1.5]);
      continue;
    }
    if (Math.round(s / 4) % 3 !== 0) continue;
    for (const side of [-1, 1]) {
      if (!rng.bool(0.55)) continue;
      const off = KT_WALL + rng.float(2.2, 14);
      const x = a.x + a.rx * side * off + rng.float(-1.5, 1.5), z = a.z + a.rz * side * off + rng.float(-1.5, 1.5);
      if (!clear(x, z, KT_WALL + 2)) continue;
      const kind = rng.bool(0.12) ? 4 : rng.bool(0.5) ? 0 : 1;          // a tyre stack, or one of the course's two trees
      props.push([x, z, kind, kind === 4 ? 1.1 : rng.float(4.5, 8)]);
    }
  }
  return props;
}

/**
 * The kart race. Eight karts round a closed course, each driven by an animal: the
 * camera rides behind the player's. The music sets the finishes: every accented
 * bar far enough from the last - the drop - ends a race, the player and the
 * leader crossing the line nose to nose, caught by the photo-finish camera. The
 * player's distance round the course is planned for that: its pace is solved so
 * the last lap ends on the drop, with a boost through the build before it, from a
 * pad on the track where the build begins. The rest of the pack keep their
 * places by gaps planned every two bars, eased between, overtaking and falling
 * back; items are thrown on the snare and land on the next beat, the kart hit
 * spinning out and losing ground it wins back. Across the track the karts are
 * stepped like drivers: each holds the inside of a bend and gives way to the
 * kart beside it, so no two ever touch. Each race is a new course.
 */
export class KartSim {
  constructor(seed, spb, meta, features) {
    this.seed = seed;
    this.grid = new MusicGrid(spb, meta);
    // the snares: thrown items leave on them
    this.snares = null;
    if (features && features.tracks && features.tracks.snare) {
      const tr = features.tracks.snare, out = [];
      let last = -1;
      for (let i = 1; i < features.n; i++) {
        if (tr[i] >= 0.3 && tr[i - 1] < 0.3 && i - last > FEATURE_RATE * 0.12) { out.push(i / FEATURE_RATE); last = i; }
      }
      this.snares = out;
    }
    const r = new Rng(seed, 'kart-cast');
    const species = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    this.species = species.slice(0, KT_N);
    this.look = new Float32Array(KT_N * 20);
    this.species.forEach((k, i) => KT_LOOK[k].forEach((v, j) => this.look.set(v, i * 20 + j * 4)));
    this.font = new Float32Array(48 * 2);
    CRACK_FONT.forEach((g, i) => {
      let lo = 0, hi = 0;
      g.split('|').forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch !== '#') return;
        if (y < 4) lo += 2 ** (y * 5 + x); else hi += 2 ** ((y - 4) * 5 + x);
      }));
      this.font[i * 2] = lo; this.font[i * 2 + 1] = hi;
    });
    this.reset();
  }

  reset() {
    this.rng = new Rng(this.seed, 'kart-plan');
    this.fxr = new Rng(this.seed, 'kart-fx');
    this.races = [];
    this.keys = Array.from({ length: KT_N }, () => []);      // each rival's gap to the player: [t, metres ahead]
    this.hits = [];
    this.lane = new Float64Array(KT_N);
    // the stepped state: across the track, how fast, the slide, the eye's heading
    this.t = 0;
    this.d = new Float64Array(KT_N); this.vd = new Float64Array(KT_N);
    this.d0 = new Float64Array(KT_N);
    this.s1 = new Float64Array(KT_N); this.s0 = new Float64Array(KT_N);
    this.drift = new Float64Array(KT_N); this.drift0 = new Float64Array(KT_N);
    this.slide = new Float64Array(KT_N);                      // how long it has slid this bend
    this.mini = new Float64Array(KT_N);                       // the burst after a long slide, until
    this.camH = null; this.camH0 = null;
    this.fut = null; this.futRace = -1;
    this.off = new Float64Array(KT_N); this.off0 = new Float64Array(KT_N); this.offRace = -1;
    this.air = new Array(KT_N).fill(false);
    this.landT = -9; this.placeNow = 0; this.placeT = -9; this.lapNow = -1; this.lapT = -9;
    this.raceI = 0;
    this.cubes = [];                                          // when each cube is back
    this.parts = [];
    this.snap = null;                                         // the karts at the last finish, for its photo
    this.minGap = Infinity;                                   // (for the checks: how close two karts came)
    // the spread at the start: the pack strung out in front of and behind the player
    const g = this.rng.shuffle([-14, -10, -6.5, -3, 3.5, 7.5, 12]);
    for (let i = 1; i < KT_N; i++) this.keys[i].push([-4 * this.grid.barSec, g[i - 1]], [0, g[i - 1]]);
    while (this.races.length < 3) this.planRace();
    this.laneFor(0);
    for (let i = 0; i < KT_N; i++) {
      this.d[i] = this.d0[i] = Math.max(-KT_LANE, Math.min(KT_LANE, this.lane[i] + (i % 2 ? 1 : -1) * 1.2 * ((i >> 1) % 3)));
      this.s1[i] = this.s0[i] = this.sOf(i, 0);
    }
    this.cubesFor(this.races[0]);
    this.planHits(this.races[0]);
  }

  // ---- the races ----

  /** The next accented bar far enough on to end a race (a race needs a lap at a kart's top pace). */
  nextFinish(after, first, lap) {
    const bar = this.grid.barSec;
    const gap = first ? Math.max(4 * bar, 6) : Math.max(6 * bar, lap / 30);
    let b = Math.ceil((after + gap) / bar - 1e-6);
    for (let k = 0; k < 28; k++, b++) if (this.grid.isAccent(b * bar)) return b * bar;
    return Math.ceil((after + 16 * bar) / bar - 1e-6) * bar;
  }

  planRace() {
    const k = this.races.length, prev = this.races[k - 1], r = this.rng;
    const bar = this.grid.barSec;
    const t0 = prev ? prev.t1 : 0;
    const lap = r.float(300, 360);
    const course = ktCourse(new Rng(this.seed, `kart-course-${k}`), lap);
    const props = ktDress(course, new Rng(this.seed, `kart-dress-${k}`));
    const t1 = this.nextFinish(t0, k === 0, lap);
    const len = t1 - t0;
    const B = t1 - (len >= 5 * bar ? 2 : 1) * bar;           // the build: the boost from here to the line
    // the race's own beats, on its bars: a pad a bar in - a short boost that takes the player past the kart just
    // ahead - and a ramp on the bar halfway to the build, the jump leaving on the downbeat and landing on a beat; in
    // a long race again every eight bars; the big pad on the build
    const spb = this.grid.spb, pads = [], ramps = [];
    const jumpBeats = Math.max(1, Math.round(0.85 / spb));
    const b0 = Math.round(t0 / bar), bB = Math.round(B / bar), half = Math.max(2, Math.round((bB - b0) / 2));
    for (let b = b0 + half; b < bB; b += 8) {
      const T = b * bar, T1 = T + jumpBeats * spb;
      if (T1 <= B - 0.5 * bar) ramps.push({ T, T1 });
    }
    // (a pad that would fall on a jump's bar goes two bars on)
    for (let b = b0 + 1; b < bB; b += 8) {
      const bp = ramps.some((q) => Math.abs(q.T - b * bar) < 1.5 * bar) ? b + 2 : b;
      if ((bp + 3) * bar <= t1 - 0.5 * bar) pads.push({ T: bp * bar });
    }
    const w = (t) => {
      let v = 1 + 0.42 * smooth(B, B + 0.3, t);
      for (const q of pads) v += 0.2 * smooth(q.T, q.T + 0.25, t) * (1 - smooth(q.T + bar, q.T + bar + 0.6, t));
      return v;
    };
    const tau = 1.2, vPrev = prev ? prev.vEnd : KT_V0;
    const n = Math.ceil(len / KT_DT - 1e-9);
    const dt = len / n;
    const e = (t) => (k === 0 ? 1 : smooth(t0, t0 + tau, t));
    let I1 = 0, I2 = 0;
    for (let i = 0; i < n; i++) { const t = t0 + (i + 0.5) * dt; I1 += (1 - e(t)) * dt; I2 += e(t) * w(t) * dt; }
    let laps, D, c;
    if (k === 0) {
      c = KT_V0; D = c * I2; laps = Math.max(1, Math.ceil(D / lap - 1e-9));
    } else {
      laps = Math.max(1, Math.round(len * KT_V0 / lap));
      while (laps > 1 && laps * lap / len > 31) laps--;
      while (laps * lap / len < 15) laps++;
      D = laps * lap;
      c = (D - vPrev * I1) / I2;
    }
    const cum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      const t = t0 + (i + 0.5) * dt;
      cum[i + 1] = cum[i] + ((1 - e(t)) * vPrev + e(t) * c * w(t)) * dt;
    }
    const fix = D / cum[n];
    for (let i = 0; i <= n; i++) cum[i] *= fix;
    const race = {
      k, t0, t1, B, course, props, lap, laps, D, cum, dt,
      s0: laps * lap - D, vEnd: c * w(t1) * fix,
      theme: r.int(0, 2),
      photo: 1 + r.int(0, KT_N - 2), win: r.bool(0.55),
    };
    // the pad the player's boost comes from, where it will be when the build begins; the phrases' pads and ramps
    race.pad = this.sRace(race, B);
    for (const q of pads) q.s = this.sRace(race, q.T);
    for (const q of ramps) q.s = this.sRace(race, q.T);
    race.pads = [...pads, { T: B, s: race.pad, big: true }];
    race.ramps = ramps;
    // the pack's gaps: every two bars, the leader ahead through the build, the line nose to nose
    const times = [];
    for (let t = t0 + 2 * bar; t < B - 0.5 * bar; t += 2 * bar) times.push(t);
    times.push(B, t1);
    // where each ends: the leader beside the player on the line, the rest strung out behind; on the way there each
    // drifts toward a place a little ahead of its end, the pack moving as one through the build as the player boosts
    // past it (never more than two and a half metres a second against the player, so the pack never scatters)
    const behind = r.shuffle([-3.2, -6, -8.8, -11.5, -14, -17, -20.5]);
    for (let i = 1; i < KT_N; i++) {
      const ks = this.keys[i];
      const end = i === race.photo ? (race.win ? -0.22 : 0.22) : behind[i - 1];
      const aim = i === race.photo ? r.float(3, 6.5) : end + r.float(2.5, 7);
      let [tl, last] = ks[ks.length - 1];
      for (const t of times) {
        const lim = 2.5 * (t - tl);
        let g;
        if (t === t1) g = end;
        else if (t === B) g = aim;
        else {
          const p = (t - t0) / Math.max(B - t0, 1e-6);
          g = last + (aim - last) * 0.45 * p + r.float(-6, 6) * (1 - 0.6 * p);
          g = Math.max(-24, Math.min(20, g));
        }
        if (t !== t1) g = Math.max(last - lim, Math.min(last + lim, g));
        ks.push([t, g]);
        tl = t; last = g;
      }
    }
    // no more than two side by side: at each key the pack (the player too, at 0) is spread to two and a half metres
    // between one and the next, the line's pair excepted
    for (const t of times) {
      if (t === t1) continue;
      const at = [{ i: 0, g: 0 }];
      for (let i = 1; i < KT_N; i++) at.push({ i, g: this.keys[i].find((k) => k[0] === t)[1] });
      at.sort((a, b) => a.g - b.g);
      const z = at.findIndex((o) => o.i === 0);
      for (let q = z + 1; q < at.length; q++) at[q].g = Math.max(at[q].g, at[q - 1].g + 2.5);
      for (let q = z - 1; q >= 0; q--) at[q].g = Math.min(at[q].g, at[q + 1].g - 2.5);
      for (const o of at) if (o.i) this.keys[o.i].find((k) => k[0] === t)[1] = o.g;
    }
    this.races.push(race);
    return race;
  }

  /** The lanes the rivals like for a race, spread over the track. */
  laneFor(k) {
    const r = new Rng(this.seed, `kart-lanes-${k}`);
    const opts = r.shuffle([-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6]);
    this.lane[0] = 0;
    for (let i = 1; i < KT_N; i++) this.lane[i] = opts[i - 1];
  }

  /** The race on at t (a race runs from its start up to its finish). */
  raceAt(t) {
    while (this.races[this.races.length - 1].t1 <= t + 2) this.planRace();
    let i = 0;
    while (i < this.races.length - 1 && this.races[i].t1 <= t) i++;
    return this.races[i];
  }

  /** How far round its course the player is at t, within a race. */
  sRace(race, t) {
    const u = Math.max(0, Math.min(race.cum.length - 1, (t - race.t0) / race.dt));
    const i = Math.min(race.cum.length - 2, Math.floor(u)), f = u - i;
    return race.s0 + race.cum[i] + (race.cum[i + 1] - race.cum[i]) * f;
  }

  vRace(race, t) {
    const i = Math.max(0, Math.min(race.cum.length - 2, Math.floor((t - race.t0) / race.dt)));
    return (race.cum[i + 1] - race.cum[i]) / race.dt;
  }

  /** A rival's gap ahead of the player at t: its keys eased through (a cubic through them), less what hits cost it. */
  gap(i, t) {
    if (i === 0) return 0;
    const ks = this.keys[i];
    let j = 0;
    while (j < ks.length - 2 && ks[j + 1][0] <= t) j++;
    const [ta, ga] = ks[j], [tb, gb] = ks[Math.min(j + 1, ks.length - 1)];
    const h = tb - ta;
    let g = ga;
    if (h > 1e-6) {
      const u = Math.max(0, Math.min(1, (t - ta) / h));
      const pa = ks[Math.max(0, j - 1)], pb = ks[Math.min(ks.length - 1, j + 2)];
      const ma = (gb - pa[1]) / Math.max(tb - pa[0], 1e-6) * h, mb = (pb[1] - ga) / Math.max(pb[0] - ta, 1e-6) * h;
      const u2 = u * u, u3 = u2 * u;
      g = (2 * u3 - 3 * u2 + 1) * ga + (u3 - 2 * u2 + u) * ma + (-2 * u3 + 3 * u2) * gb + (u3 - u2) * mb;
    }
    return g - this.dip(i, t) + this.dip(0, t) - this.surge(t);
  }

  /** How far a phrase's pad has taken the player past the pack: two and a half metres over a bar, given back over two. */
  surge(t) {
    const bar = this.grid.barSec;
    for (const r of this.races) {
      if (t < r.t0 || t >= r.t1) continue;
      let v = 0;
      for (const q of r.pads) {
        const x = t - q.T;
        if (q.big || x <= 0 || x > 3 * bar) continue;
        v += 2.5 * (x < bar ? smooth(0, bar, x) : 1 - smooth(bar, 3 * bar, x));
      }
      return v;
    }
    return 0;
  }

  /** A kart over a ramp while it stands: how high, its nose's pitch (up positive), whether it is in the air. */
  jumpAt(i, race, t, s) {
    for (const q of race.ramps || []) {
      if (t < q.T - 6 || t > q.T + 4) continue;
      const T = q.T1 - q.T, h = Math.min(1.6, 9.81 * T * T / 8);
      let tau, v = Math.max(this.vRace(race, t), 5);
      if (i === 0) tau = t - q.T;
      else {
        let ds = (s - q.s) % race.lap;
        if (ds > race.lap / 2) ds -= race.lap;
        if (ds < -race.lap / 2) ds += race.lap;
        tau = ds / v;
      }
      const x = -tau * v;                         // (on the ramp: how far from its lip)
      if (tau < 0 && x < KT_RAMP) return { hop: 0.5 * (1 - x / KT_RAMP), pitch: 0.19, air: false };
      if (tau >= 0 && tau < T) { const u = tau / T; return { hop: 0.5 * (1 - u) + 4 * h * u * (1 - u), pitch: 0.25 - 0.5 * u, air: true }; }
    }
    return { hop: 0, pitch: 0, air: false };
  }

  /** The ground a kart hit loses: five metres over its spin, won back over three seconds. */
  dip(i, t) {
    let v = 0;
    for (const h of this.hits) {
      if (h.to !== i) continue;
      const x = t - h.Th;
      if (x <= 0 || x > 4) continue;
      v += 5 * (x < 1.2 ? smooth(0, 1.2, x) : 1 - smooth(1.2, 4, x));
    }
    return v;
  }

  /** Where kart i is round the course at t: the player as planned, the others by their gaps. */
  sOf(i, t) {
    const race = this.raceAt(t);
    return this.sRace(race, t) + this.gap(i, t);
  }

  snareTimes(a, b) {
    if (this.snares) return this.snares.filter((t) => t > a && t < b);
    const out = [], spb = this.grid.spb;
    for (let t = Math.ceil(a / spb) * spb; t < b; t += spb) if (Math.round(t / spb) % 2 === 1) out.push(t);
    return out;
  }

  /** The items of a race: one now and then on a snare, landing on the next beat. */
  planHits(race) {
    if (race.hitsPlanned) return;
    race.hitsPlanned = true;
    // (the gaps it reads reach into the race after: plan that far first, so it reads the same however it is reached)
    while (this.races.length < race.k + 3) this.planRace();
    const r = new Rng(this.seed, `kart-items-${race.k}`), bar = this.grid.barSec;
    const end = race.t1 - Math.max(2 * bar, 4.6);
    const snares = this.snareTimes(race.t0 + bar, end);
    let lastBar = -1;
    for (const T of snares) {
      const b = Math.floor(T / bar + 1e-6);
      if (b <= lastBar + 1 || !r.bool(0.5)) continue;
      const Th = this.grid.next(T + 0.3, 4);
      if (Th > end + 0.6) continue;
      const g = (i, t) => (i === 0 ? 0 : this.gap(i, t));
      const cands = [], ws = [];
      for (let a = 0; a < KT_N; a++) for (let q = 0; q < KT_N; q++) {
        if (a === q || q === race.photo || this.hits.some((h) => (h.to === q || h.to === a) && Math.abs(h.Th - Th) < 2.5)) continue;
        const ga = g(a, T), gq = g(q, Th);
        if (Math.abs(ga) > 24 || Math.abs(gq) > 26) continue;
        const ahead = g(q, T) - ga;
        if (ahead < 5 || ahead > 26) continue;
        // the item must outrun the kart that threw it
        if ((gq - ga) / (Th - T) < 6) continue;
        cands.push([a, q]);
        ws.push(a === 0 ? 3 : q === 0 ? 0.6 : 1);
      }
      if (!cands.length) continue;
      const [from, to] = r.weighted(cands, ws);
      this.hits.push({ T, Th, from, to, kind: r.bool(0.5) ? 0 : 1, dFrom: null, race: race.k });
      lastBar = b;
    }
  }

  cubesFor(race) {
    this.cubes = KT_ROWS.map(() => KT_CUBE_D.map(() => -1));
    this.cubeRace = race.k;
  }

  // ---- the stepped part: across the track ----

  step() {
    const t = this.t + KT_DT;
    const race = this.raceAt(t);
    if (race.k !== this.raceI) {
      // a new race: a new course, the rivals' favourite lanes, the cubes all back
      this.raceI = race.k;
      this.laneFor(race.k);
      this.cubesFor(race);
      this.camH = null;
    }
    this.planHits(race);
    const next = this.races[race.k + 1];
    if (next) this.planHits(next);
    const c = race.course;
    for (let i = 0; i < KT_N; i++) { this.s0[i] = this.s1[i]; this.d0[i] = this.d[i]; this.drift0[i] = this.drift[i]; }
    const v = this.vRace(race, t);
    // (a kart held up behind another eases back to its own place at a metre and a half a second)
    for (let i = 0; i < KT_N; i++) {
      this.off0[i] = this.off[i];
      if (race.k !== this.offRace) this.off[i] = 0;
      else this.off[i] -= Math.sign(this.off[i]) * Math.min(Math.abs(this.off[i]), 1.5 * KT_DT);
      this.s1[i] = this.sRace(race, t) + (i === 0 ? 0 : this.gap(i, t)) + this.off[i];
    }
    this.offRace = race.k;
    const want = new Float64Array(KT_N);
    for (let i = 0; i < KT_N; i++) {
      const a = ktAt(c, this.s1[i] + 7);
      // the inside of the bend coming, as tight as the bend asks, over the lane it likes
      const inside = Math.sign(a.kap) * Math.min(1, Math.abs(a.kap) * 28) * 3.0;
      const target = Math.max(-KT_LANE, Math.min(KT_LANE, inside + this.lane[i] * (1 - 0.5 * Math.min(1, Math.abs(a.kap) * 28))));
      want[i] = Math.max(-3.2, Math.min(3.2, (target - this.d[i]) * 1.3));
    }
    // give way: a kart beside another, or that will be within the next second and a half (where each will be is
    // planned, so it is known), moves over in the time it has before they would touch
    // (looked at every other step, which is soon enough)
    const n = Math.round(t / KT_DT);
    if (n % 2 === 0 || !this.fut || this.futRace !== race.k) {
      this.ahead = [0, 0.25, 0.5, 0.8, 1.2, 1.6, 2.2].filter((tau) => t + tau < race.t1);
      this.fut = this.ahead.map((tau) => { const sp = this.sRace(race, t + tau); return Array.from({ length: KT_N }, (_, i) => sp + this.gap(i, t + tau)); });
      this.futRace = race.k;
    }
    const ahead = this.ahead, fut = this.fut;
    for (let i = 0; i < KT_N; i++) for (let j = i + 1; j < KT_N; j++) {
      const dd = this.d[j] - this.d[i], need = 2.05;
      if (Math.abs(dd) >= need) continue;
      let tc = Infinity;
      for (let q = 0; q < ahead.length; q++) if (Math.abs(fut[q][j] - fut[q][i]) < KT_LONG + 1.2) { tc = ahead[q]; break; }
      if (tc === Infinity) continue;
      let dir = Math.sign(dd) || (this.d[i] > 0 ? 1 : -1);
      // (against a barrier there is only one way to go)
      if (Math.abs(this.d[i]) > KT_LANE - 0.3 && Math.sign(this.d[i]) === -dir) dir = -Math.sign(this.d[i]);
      if (Math.abs(this.d[j]) > KT_LANE - 0.3 && Math.sign(this.d[j]) === dir) dir = -Math.sign(this.d[j]);
      // (the one behind does most of the moving: the one ahead holds its line)
      const push = (need - Math.abs(dd)) * (1 / Math.max(tc, 0.3) + 2.5);
      const jBehind = this.s1[j] < this.s1[i] ? 1.4 : 0.6;
      want[j] += push * dir * jBehind; want[i] -= push * dir * (2 - jBehind);
    }
    for (let i = 0; i < KT_N; i++) {
      const w = Math.max(-9, Math.min(9, want[i]));
      this.vd[i] += (w - this.vd[i]) * 0.4;
      this.d[i] += this.vd[i] * KT_DT;
      if (Math.abs(this.d[i]) > KT_LANE) { this.d[i] = Math.sign(this.d[i]) * KT_LANE; this.vd[i] = 0; }
      // sliding through a tight bend, the tail out; a long slide gives a burst out of it
      const b = ktAt(c, this.s1[i] + 2);
      const sliding = Math.abs(b.kap) > 1 / 26;
      this.drift[i] += ((sliding ? Math.sign(b.kap) : 0) - this.drift[i]) * (1 - Math.exp(-KT_DT * 4));
      if (Math.abs(this.drift[i]) > 0.5) this.slide[i] += KT_DT;
      else {
        if (this.slide[i] > 0.8) this.mini[i] = t + 0.7;
        this.slide[i] = 0;
      }
      if (Math.abs(this.drift[i]) > 0.5 && (Math.round(t / KT_DT) + i) % 3 === 0) {
        const p = this.place(i, race, t);
        const side = this.fxr.bool() ? 1 : -1;
        this.parts.push({ x: p.x - p.fx * 0.75 + p.rx * side * 0.6, y: 0.08, z: p.z - p.fz * 0.75 + p.rz * side * 0.6,
          vx: -p.fx * 3 + this.fxr.float(-1.5, 1.5) - p.rx * this.drift[i] * 3, vy: this.fxr.float(1.5, 3.5), vz: -p.fz * 3 + this.fxr.float(-1.5, 1.5) - p.rz * this.drift[i] * 3,
          t0: t, life: 0.35, kind: this.slide[i] > 0.8 ? 2 : 1 });
      }
    }
    // and never touching: two karts side by side are held apart, the one against the barrier staying where it is,
    // never more than six centimetres a step each (what is left is settled along the track, below)
    const moved = new Float64Array(KT_N);
    for (let it = 0; it < 4; it++) for (let i = 0; i < KT_N; i++) for (let j = i + 1; j < KT_N; j++) {
      const ds = Math.abs(this.s1[j] - this.s1[i]);
      if (ds >= KT_LONG + 0.2) continue;
      const dd = this.d[j] - this.d[i], need = KT_WIDE + 0.15;
      if (Math.abs(dd) >= need) continue;
      const dir = Math.sign(dd) || (this.d[i] > 0 ? 1 : -1);
      // (inside the margin, eased over a few steps; only a real touch is put right at once)
      const touch = ds < KT_LONG && Math.abs(dd) < KT_WIDE;
      let mi = Math.min(0.04, (need - Math.abs(dd)) / 2, 0.14 - moved[i]), mj = Math.min(mi, 0.14 - moved[j]);
      mi = Math.max(0, mi); mj = Math.max(0, mj);
      if (Math.abs(this.d[i] - dir * mi) > KT_LANE) { mj += mi; mi = 0; }
      if (Math.abs(this.d[j] + dir * mj) > KT_LANE) { mi += mj; mj = 0; }
      this.d[i] = Math.max(-KT_LANE, Math.min(KT_LANE, this.d[i] - dir * mi));
      this.d[j] = Math.max(-KT_LANE, Math.min(KT_LANE, this.d[j] + dir * mj));
      moved[i] += mi; moved[j] += mj;
    }
    // no room across the track: the kart behind holds back (the player's place is the plan's: the other gives way)
    for (let it = 0; it < 3; it++) for (let i = 0; i < KT_N; i++) for (let j = 0; j < KT_N; j++) {
      if (i === j) continue;
      const ds = this.s1[j] - this.s1[i];             // j behind i when negative
      if (ds >= 0 || ds <= -KT_LONG - 0.1) continue;
      if (Math.abs(this.d[j] - this.d[i]) >= KT_WIDE + 0.05) continue;
      const short = KT_LONG + 0.1 + ds;
      if (j !== 0) { this.off[j] -= short; this.s1[j] -= short; }
      else { this.off[i] += short; this.s1[i] += short; }
    }
    for (let i = 0; i < KT_N; i++) this.maxOff = Math.max(this.maxOff || 0, Math.abs(this.off[i]));
    for (let i = 0; i < KT_N; i++) for (let j = i + 1; j < KT_N; j++) {
      if (Math.abs(this.s1[j] - this.s1[i]) < KT_LONG) this.minGap = Math.min(this.minGap, Math.abs(this.d[j] - this.d[i]) - KT_WIDE);
    }
    // the cubes: a kart through a row takes the cube it meets
    for (let rI = 0; rI < KT_ROWS.length; rI++) {
      const sr = KT_ROWS[rI] * race.lap;
      for (let i = 0; i < KT_N; i++) {
        if (Math.floor((this.s0[i] - sr) / race.lap) === Math.floor((this.s1[i] - sr) / race.lap)) continue;
        KT_CUBE_D.forEach((cd, q) => {
          if (Math.abs(this.d[i] - cd) > 1.15 || this.cubes[rI][q] > t) return;
          this.cubes[rI][q] = t + 2.5;
          const a = ktAt(c, sr), x = a.x + a.rx * cd, z = a.z + a.rz * cd;
          for (let m = 0; m < 6; m++) {
            const an = m / 6 * 6.283 + this.fxr.float(0, 1);
            this.parts.push({ x, y: 1.0, z, vx: Math.cos(an) * 3 + a.tx * v * 0.6, vy: this.fxr.float(0, 3), vz: Math.sin(an) * 3 + a.tz * v * 0.6, t0: t, life: 0.5, kind: 5, hue: (q / 4 + m * 0.1) % 1 });
          }
        });
      }
    }
    // the items: thrown from where the thrower is; a blast where they land
    for (const h of this.hits) {
      if (h.race !== race.k) continue;
      if (h.dFrom === null && t >= h.T) h.dFrom = this.d[h.from];
      if (t >= h.T && t < h.Th && h.kind === 1 && Math.round(t / KT_DT) % 2 === 0) {
        const p = this.shotAt(h, race, t);
        if (p) this.parts.push({ x: p.x, y: p.y, z: p.z, vx: this.fxr.float(-0.5, 0.5), vy: this.fxr.float(0.3, 1), vz: this.fxr.float(-0.5, 0.5), t0: t, life: 0.7, kind: 3 });
      }
      if (!h.boomed && t >= h.Th) {
        h.boomed = true;
        const p = this.place(h.to, race, h.Th);
        for (let m = 0; m < 10; m++) {
          const an = this.fxr.float(0, 6.283), up = this.fxr.float(2, 6);
          this.parts.push({ x: p.x, y: 0.6, z: p.z, vx: Math.cos(an) * 4 + p.fx * v, vy: up, vz: Math.sin(an) * 4 + p.fz * v, t0: t, life: 0.55, kind: m < 3 ? 4 : 2 });
        }
      }
    }
    // a jump's landing: dust, and the player's lands under the eye
    for (let i = 0; i < KT_N; i++) {
      const j = this.jumpAt(i, race, t, this.s1[i]);
      if (this.air[i] && !j.air) {
        const pl = this.place(i, race, t);
        for (let m = 0; m < 5; m++) this.parts.push({ x: pl.x + this.fxr.float(-0.7, 0.7), y: 0.1, z: pl.z + this.fxr.float(-0.7, 0.7), vx: this.fxr.float(-2, 2), vy: this.fxr.float(0.5, 1.5), vz: this.fxr.float(-2, 2), t0: t, life: 0.6, kind: 3 });
        if (i === 0) this.landT = t;
      }
      this.air[i] = j.air;
    }
    // the place and the lap, and when each last changed
    let place = 1;
    for (let i = 1; i < KT_N; i++) if (this.s1[i] > this.s1[0]) place++;
    if (place !== this.placeNow) { this.placeNow = place; this.placeT = t; }
    const lapNow = Math.floor(this.s1[0] / race.lap);
    if (lapNow !== this.lapNow) { this.lapNow = lapNow; this.lapT = t; }
    this.parts = this.parts.filter((q) => t - q.t0 < q.life);
    // the eye: it turns after the player's way round, late, so the kart's slide shows
    const way = Math.atan2(ktAt(c, this.s1[0]).tz, ktAt(c, this.s1[0]).tx);
    this.camH0 = this.camH;
    if (this.camH === null) this.camH = way;
    else this.camH += ktWrap(way - this.camH) * (1 - Math.exp(-KT_DT * 5));
    if (this.camH0 === null) this.camH0 = this.camH;
    this.t = t;
  }

  advanceTo(t) {
    if (t < this.t - 1e-9) this.reset();
    while (this.t + KT_DT <= t + 1e-9) {
      const prevRace = this.raceAt(this.t);
      const before = this.t;
      this.step();
      // the finish line crossed this step: keep the karts as they stood on it, for the photo
      if (before < prevRace.t1 && this.t >= prevRace.t1 - 1e-9) this.snap = { race: prevRace, at: this.view(prevRace.t1, prevRace, 1 - (this.t - prevRace.t1) / KT_DT) };
    }
    this.forget(t);
  }

  forget(t) {
    const now = this.raceAt(t).k;
    this.hits = this.hits.filter((h) => h.Th > t - 6 || h.race >= now);
    // a race long gone lets its course go (its finish time stays: the shots read it)
    for (const r of this.races) if (r.k < now - 1 && r.course) { r.course = null; r.props = null; r.cum = null; }
    for (const ks of this.keys) while (ks.length > 8 && ks[2][0] < t - 30) ks.shift();
  }

  /** Kart i at t on a race's course: where, its way, its right, as the stepped state is between the last two steps. */
  place(i, race, t, w = 1) {
    const s = this.sRace(race, t) + (i === 0 ? 0 : this.gap(i, t)) + (race.k === this.offRace ? this.off0[i] + (this.off[i] - this.off0[i]) * w : 0);
    const d = this.d0[i] + (this.d[i] - this.d0[i]) * w;
    const a = ktAt(race.course, s);
    const v = this.vRace(race, t);
    const head = Math.atan2(a.tz, a.tx) + Math.atan2(this.vd[i], Math.max(v, 1));
    return { x: a.x + a.rx * d, z: a.z + a.rz * d, fx: Math.cos(head), fz: Math.sin(head), rx: -Math.sin(head), rz: Math.cos(head), head, s, d };
  }

  /** An item in flight at t: from the thrower to the target, bouncing (a bomb) or straight (a rocket). */
  shotAt(h, race, t) {
    if (t < h.T || t >= h.Th || h.dFrom === null) return null;
    const u = (t - h.T) / (h.Th - h.T);
    const sa = this.sRace(race, h.T) + (h.from === 0 ? 0 : this.gap(h.from, h.T)) + 1.2;
    const sb = this.sRace(race, t) + this.gap(h.to, t) - 0.8;
    const se = this.sRace(race, h.Th) + this.gap(h.to, h.Th) - 0.8;
    // (straight on at its own pace, so it reaches the target on the beat; never past it)
    const s = Math.min(sa + (se - sa) * u, sb);
    // (it homes on the target across the track as it closes)
    const d = h.dFrom + (this.d[h.to] - h.dFrom) * smooth(0, 1, u);
    const a = ktAt(race.course, s);
    const hop = h.kind === 0 ? 0.3 + 1.1 * Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u * 0.5) : 0.55;
    return { x: a.x + a.rx * d, y: hop, z: a.z + a.rz * d, dx: a.tx, dz: a.tz };
  }

  /** Everything as the camera sees it at t (w: how far between the last two steps the stepped state is). */
  view(t, race, w = 1) {
    const c = race.course;
    const spb = this.grid.spb;
    const karts = [];
    for (let i = 0; i < KT_N; i++) {
      const p = this.place(i, race, t, w);
      let yaw = p.head + 0.42 * (this.drift0[i] + (this.drift[i] - this.drift0[i]) * w);
      let hop = 0, spun = 0;
      for (const h of this.hits) {
        if (h.to !== i || h.race !== race.k) continue;
        const x = t - h.Th;
        if (x < 0 || x > 1.2) continue;
        yaw += 2 * Math.PI * smooth(0, 1.0, x);
        hop = Math.max(hop, x < 0.5 ? 1.2 * 4 * (x / 0.5) * (1 - x / 0.5) : 0);
        spun = Math.max(spun, 1 - x / 1.2);
      }
      const boost = i === 0 ? smooth(race.B, race.B + 0.2, t) * (1 - smooth(race.t1, race.t1 + 0.6, t))
        : Math.max(t < this.mini[i] ? 1 : 0, Math.max(0, Math.min(1, (this.gapRate(i, t) - 1.5) / 3)) * smooth(race.B, race.B + 0.5, t));
      const jp = this.jumpAt(i, race, t, p.s);
      hop = Math.max(hop, jp.hop);
      karts.push({ ...p, yaw, hop, spun, pitch: jp.pitch, boost: i === 0 ? Math.max(boost, t < this.mini[0] ? 1 : 0) : boost,
        wheel: p.s / 0.27, drift: this.drift[i], species: this.species[i] });
    }
    const shots = [];
    for (const h of this.hits) {
      if (h.race !== race.k) continue;
      const q = this.shotAt(h, race, t);
      if (q) shots.push({ ...q, kind: h.kind, age: t - h.T });
    }
    return { t, race, karts, shots, c, spb };
  }

  gapRate(i, t) { return (this.gap(i, t + 0.05) - this.gap(i, t - 0.05)) / 0.1; }

  /** Which shot the camera takes at t: behind the player, the photo finish's, or ahead looking back. */
  shotKind(t) {
    const bar = this.grid.barSec, spb = this.grid.spb;
    const app = spb < 0.42 ? 2 * spb : spb, hold = Math.max(spb, 0.45);
    for (const r of this.races) {
      if (t >= r.t1 - app && t < r.t1) return { kind: 1, race: r };
      if (t >= r.t1 && t < r.t1 + hold) return { kind: 2, race: r };
    }
    const b = Math.floor(t / bar + 1e-6);
    const race = this.raceAt(t);
    if (b % 8 === 4 && t > race.t0 + 2 * bar && t < race.B - bar) return { kind: 3, race };
    return { kind: 0, race };
  }

  uniforms(t) {
    this.advanceTo(t);
    const w = Math.max(0, Math.min(1, 1 - (this.t - t) / KT_DT));
    const shot = this.shotKind(t);
    const spb = this.grid.spb;
    let V;
    if (shot.kind === 2 && this.snap && this.snap.race === shot.race) V = this.snap.at;
    else V = this.view(t, shot.race.k === this.raceI ? shot.race : this.raceAt(t), w);
    const race = V.race, c = race.course;
    // ---- the eye
    const P = V.karts[0];
    let eye, look, focal = 1.45;
    if (shot.kind === 0) {
      const h = this.camH0 + ktWrap(this.camH - this.camH0) * w;
      const boost = P.boost;
      // (as the 32-bit kart racers framed it: the kart a tenth of the screen across, low in the middle, the road ahead)
      const back = 7.6 + 1.0 * boost, up = 2.55 - 0.2 * boost;
      eye = [P.x - Math.cos(h) * back, up + P.hop * 0.3, P.z - Math.sin(h) * back];
      look = [P.x + Math.cos(h) * 7, 0.55 + P.hop * 0.3, P.z + Math.sin(h) * 7];
      focal = 1.5 - 0.3 * boost;
    } else if (shot.kind === 1 || shot.kind === 2) {
      // across the line from outside the barrier on the leaders' side, a little toward where they come from, on them
      const a = ktAt(c, 0);
      const ld = (P.d + V.karts[race.photo].d) / 2;
      const side = ld >= 0 ? 1 : -1;
      eye = [a.x + a.rx * side * (KT_WALL + 2.5) - a.tx * 2.5, 3.0, a.z + a.rz * side * (KT_WALL + 2.5) - a.tz * 2.5];
      look = [a.x + a.rx * ld - a.tx * 1.5, 0.4, a.z + a.rz * ld - a.tz * 1.5];
      focal = 1.3;
    } else {
      const a = ktAt(c, P.s + 11);
      eye = [a.x + a.rx * 2.2, 1.3, a.z + a.rz * 2.2];
      look = [P.x - P.fx * 4, 0.7, P.z - P.fz * 4];
      focal = 1.6;
    }
    const F = norm3([look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]]);
    const R = norm3([-F[2], 0, F[0]]);
    const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    // ---- the course
    const seg = new Float32Array(KT_SEG * 4);
    const every = KT_FINE / KT_SEG;
    for (let i = 0; i < KT_SEG; i++) {
      const j = i * every, p = c.pts[j];
      seg.set([p[0], p[1], -c.tz[j], c.tx[j]], i * 4);
    }
    // ---- the karts
    const k0 = new Float32Array(KT_N * 4), k1 = new Float32Array(KT_N * 4), k2 = new Float32Array(KT_N * 4);
    V.karts.forEach((k, i) => {
      k0.set([k.x, k.hop, k.z, k.yaw], i * 4);
      k1.set([k.wheel, 0, k.boost, k.species], i * 4);
      k2.set([k.drift, k.spun, k.pitch, 1], i * 4);
    });
    // ---- the items in flight
    const sh = new Float32Array(KT_SHOTS * 8);
    V.shots.slice(0, KT_SHOTS).forEach((q, i) => { sh.set([q.x, q.y, q.z, 1 + q.kind], i * 4); sh.set([q.dx, q.dz, q.age, 0], (KT_SHOTS + i) * 4); });
    // ---- the cubes and the pad
    // (only those in front of the eye and near enough, packed first: the shader looks at as many as there are)
    const cubes = new Float32Array(8 * 4);
    let nCubes = 0;
    KT_ROWS.forEach((fr, rI) => {
      const a = ktAt(c, fr * race.lap);
      KT_CUBE_D.forEach((cd, q) => {
        const back = this.cubes[rI] && this.cubeRace === race.k ? this.cubes[rI][q] : -1;
        const sc = back < 0 || V.t >= back ? 1 : V.t > back - 0.3 ? smooth(back - 0.3, back, V.t) : 0;
        const x = a.x + a.rx * cd, z = a.z + a.rz * cd;
        const fwd = (x - eye[0]) * F[0] + (z - eye[2]) * F[2];
        if (sc < 0.05 || fwd < -1 || Math.hypot(x - eye[0], z - eye[2]) > 90) return;
        cubes.set([x, 1.0 + 0.12 * Math.sin(V.t * 3 + q), z, sc], nCubes++ * 4);
      });
    });
    const pads = new Float32Array(4 * 4);
    const padList = race.pads.filter((q) => q.T > V.t - 8 && q.T < V.t + 25).slice(0, 4);
    race.pads.filter((q) => q.T > V.t - 8 && q.T < V.t + 25).slice(0, 4).forEach((q, i) => {
      const a = ktAt(c, q.s), d = this.padLane(race, q.s);
      pads.set([a.x + a.rx * d, a.z + a.rz * d, Math.atan2(a.tz, a.tx), (V.t < q.T + 0.6 ? 1 : 0.35) * (q.big ? 1.4 : 1)], i * 4);
    });
    const ramps = new Float32Array(2 * 4);
    race.ramps.filter((q) => V.t > q.T - 6 && V.t < q.T + 4).slice(0, 2).forEach((q, i) => {
      const a = ktAt(c, q.s - KT_RAMP);
      ramps.set([a.x, a.z, Math.atan2(a.tz, a.tx), 1], i * 4);
    });
    // the eye shaken: by a hit on the player, a blast near it, a landing
    let shake = Math.exp(-Math.max(0, t - this.landT) * 9) * 0.6;
    for (const h of this.hits) {
      const x = t - h.Th;
      if (x < 0 || x > 1.5 || h.race !== race.k) continue;
      const near = h.to === 0 ? 1 : Math.max(0, 1 - Math.abs(this.gap(h.to, h.Th)) / 15);
      shake += Math.exp(-x * 6) * near;
    }
    // ---- what stands by the track, nearest in front of the eye
    const props = race.props
      .map((q) => ({ q, z: (q[0] - eye[0]) * F[0] + (q[1] - eye[2]) * F[2], r: Math.hypot(q[0] - eye[0], q[1] - eye[2]) }))
      .filter((o) => o.z > -2 && o.r < 140)
      .sort((a, b) => a.r - b.r)
      .slice(0, KT_PROPS);
    const pr = new Float32Array(KT_PROPS * 4);
    props.forEach((o, i) => pr.set(o.q, i * 4));
    // ---- sparks, smoke, blasts and confetti, nearest the eye
    const parts = this.parts
      .filter((q) => q.t0 <= V.t)
      .map((q) => {
        const a = V.t - q.t0;
        const g = q.kind === 3 ? -0.5 : 9;
        return { x: q.x + q.vx * a, y: Math.max(0.02, q.y + q.vy * a - 0.5 * g * a * a), z: q.z + q.vz * a, k: q.kind, f: Math.min(0.999, a / q.life), hue: q.hue || 0 };
      })
      .map((q) => {
        const v = [q.x - eye[0], q.y - eye[1], q.z - eye[2]];
        const z = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
        return { ...q, z, sx: (v[0] * R[0] + v[1] * R[1] + v[2] * R[2]) / z * focal, sy: (v[0] * U[0] + v[1] * U[1] + v[2] * U[2]) / z * focal };
      })
      .filter((q) => q.z > 0.3 && q.z < 60 && Math.abs(q.sx) < 1.1 && Math.abs(q.sy) < 0.7)
      .sort((a, b) => a.z - b.z)
      .slice(0, KT_PARTS);
    const pt = new Float32Array(KT_PARTS * 4);
    parts.forEach((q, i) => pt.set([q.sx, q.sy, q.z, q.k + q.f * 0.9], i * 4));
    // ---- the race as the player sees it: the place, the lap, the time
    const order = V.karts.map((k, i) => ({ i, s: k.s })).sort((a, b) => b.s - a.s);
    const place = order.findIndex((o) => o.i === 0) + 1;
    const lap = Math.max(1, Math.min(race.laps, Math.floor(P.s / race.lap) + 1));
    const rank = new Float32Array(8);
    order.forEach((o, i) => { rank[i] = o.i; });
    // the map: the course's box
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of c.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    // which piece of the course the eye is nearest (the shader looks for barriers from there)
    let eyeSeg = 0, eyeBest = Infinity;
    for (let i = 0; i < KT_SEG; i++) { const q = c.pts[i * every]; const dd = (q[0] - eye[0]) ** 2 + (q[1] - eye[2]) ** 2; if (dd < eyeBest) { eyeBest = dd; eyeSeg = i; } }
    // where the photo's line is drawn: across the leaders' noses, where they stand
    const fl = ktAt(c, KT_NOSE), lead = (P.d + V.karts[race.photo].d) / 2;
    const lineX = fl.x + fl.rx * lead, lineZ = fl.z + fl.rz * lead;
    // since the last finish, and how it went
    const prev = shot.kind === 2 ? shot.race : this.races[race.k - 1];
    const since = prev ? t - prev.t1 : 99;
    // the HUD's words, written here and drawn by one piece of the shader: where each line starts (its top left), a
    // font pixel, its letters, its colour (a shader that drew each line itself took a minute to compile on a laptop's GPU)
    const lines = [];
    const say = (x, y, px, str, rgb) => lines.push({ x, y, px, str: String(str).slice(0, 8), rgb });
    const flash = Math.floor(t / spb * 2) % 2;
    const hold = Math.max(spb, 0.45);
    const p2 = (v) => String(v).padStart(2, '0');
    if (shot.kind === 2) say(-0.2, 0.43, 0.014, 'PHOTO', [1, 1, 1]);
    else if (shot.kind === 0 || shot.kind === 3) {
      const pop = 1 + 0.5 * Math.exp(-Math.max(0, t - this.placeT) * 8);
      const gold = place === 1 ? [1, 0.85, 0.15] : [1, 0.95, 0.6];
      say(-0.86, -0.22 + 0.06 * (pop - 1), 0.028 * pop, place, gold);
      say(-0.69, -0.33, 0.012, ['ST', 'ND', 'RD'][place - 1] || 'TH', gold);
      say(-0.86, 0.46, 0.007, `LAP ${lap}/${race.laps}`, [1, 0.9, 0.3]);
      const tm = Math.max(0, V.t - race.t0);
      say(0.55, 0.46, 0.0065, `${p2(Math.floor(tm / 60))}:${p2(Math.floor(tm % 60))}:${p2(Math.floor((tm % 1) * 100))}`, [0.6, 1, 0.4]);
      if (race.laps > 1 && lap === race.laps && t - this.lapT < 2.2) {
        const on = 0.7 + 0.5 * flash;
        say(-0.255, 0.22, 0.017, 'FINAL', [on, 0.35 * on, 0.2 * on]);
        say(-0.153, 0.06, 0.017, 'LAP', [on, 0.35 * on, 0.2 * on]);
      }
      if (prev && since > hold && since < hold + 2.4) {
        const pop2 = 1 + 0.6 * Math.exp(-(since - hold) * 9), px = 0.028 * pop2;
        const word = prev.win ? '1ST!' : '2ND';
        say(-word.length * 6 * px / 2, 0.12 * pop2, px, word, prev.win ? (flash ? [1, 1, 0.7] : [1, 0.8, 0.1]) : [0.85, 0.9, 1]);
      }
    }
    const text = new Float32Array(8 * 16);
    lines.slice(0, 8).forEach((l, i) => {
      const codes = [...l.str].map(crackCode);
      while (codes.length < 8) codes.push(0);
      text.set([l.x, l.y, l.px, l.str.length, ...codes, ...l.rgb, 1], i * 16);
    });
    return {
      uKtCam: { v: [eye[0], eye[1], eye[2], focal, F[0], F[1], F[2], 0, R[0], R[1], R[2], 0, U[0], U[1], U[2], 0], kind: '4fv' },
      uKtSeg: { v: seg, kind: '4fv' },
      uKtCourse: { v: [race.lap, race.theme, V.t - race.t0, shot.kind], kind: '4f' },
      uKtK0: { v: k0, kind: '4fv' },
      uKtK1: { v: k1, kind: '4fv' },
      uKtK2: { v: k2, kind: '4fv' },
      uKtShot: { v: sh, kind: '4fv' },
      uKtCube: { v: cubes, kind: '4fv' },
      // how many of each there are this frame: props, particles, cubes, items in flight; pads, ramps, karts on boost
      uKtN: { v: [props.length, parts.length, nCubes, Math.min(V.shots.length, KT_SHOTS), padList.length, ramps.filter((v, i) => i % 4 === 3 && v > 0).length, V.karts.some((k) => k.boost > 0.02) ? KT_N : 0, KT_N, KT_SEG, 36, 24, Math.min(lines.length, 8)], kind: '4fv' },
      uKtText: { v: text, kind: '4fv' },
      uKtLook: { v: this.look, kind: '4fv' },
      uKtPad: { v: pads, kind: '4fv' },
      uKtRamp: { v: ramps, kind: '4fv' },
      uKtBeat: { v: [P.s, Math.min(shake, 1.5), t - this.placeT, t - this.lapT], kind: '4f' },
      uKtProp: { v: pr, kind: '4fv' },
      uKtPart: { v: pt, kind: '4fv' },
      uKtHud: { v: [place, lap, race.laps, since], kind: '4f' },
      uKtHud2: { v: [prev ? (prev.win ? 1 : 2) : 0, P.boost, (x0 + x1) / 2, (z0 + z1) / 2], kind: '4f' },
      uKtMap: { v: [Math.max(x1 - x0, z1 - z0) / 2 + 4, lineX, lineZ, eyeSeg], kind: '4f' },
      uKtRank: { v: rank, kind: '4fv' },
      uFont: { v: this.font, kind: '4fv' },
    };
  }

  /** Where across the track the pad lies: on the player's line as it reaches it. */
  padLane(race, s) {
    const a = ktAt(race.course, s + 7);
    return Math.max(-KT_LANE, Math.min(KT_LANE, Math.sign(a.kap) * Math.min(1, Math.abs(a.kap) * 28) * 3.0));
  }
}

// ---------------------------------------------------------------------------
// The cartoon castle: the laserdisc cartoon adventure, a room a phrase
// ---------------------------------------------------------------------------

export const CS_JOINTS = 17;                // a figure's joints; the hero's, then the guard's
const CS_K = 0.0275;                        // metres a pixel of the drawings measured: the hero is 42 of them tall
const CS_THIGH = 10.5, CS_SHIN = 10.6, CS_UPPER = 7.0, CS_FORE = 7.4;
// The poses, as the side-view action games of 1989 drew their hero - rotoscoped from a real runner, twelve drawings a
// second - measured from those drawings frame by frame: the hip's height; the head, the shoulders, the hands and the
// feet, each [ahead of the hip, up from the floor] in the drawings' pixels. The knees and elbows are solved from them,
// so the limbs keep their length. 'swap': the right hand is the back one. Swords: [ahead, up] the blade points, or none
// when it is in its scabbard.
export const CS_DRAW = {
  // the run: eight drawings, two strides; the left foot strikes in the second
  run: [
    { hip: 18, head: [6, 36.5], sh: [3.5, 31], fL: [-1, 5], fR: [-11, 2], hF: [12, 25], hB: [-2, 21] },
    { hip: 18, head: [7.5, 36.5], sh: [4.5, 31], fL: [7, 1], fR: [-15, 5], hF: [14, 26], hB: [-2, 22] },
    { hip: 17, head: [6.5, 36], sh: [3.5, 30], fL: [6, 1], fR: [-17, 7], hF: [11, 24], hB: [0, 21] },
    { hip: 18, head: [4, 35.5], sh: [2, 30], fL: [-1, 1], fR: [-11, 7], hF: [4, 22], hB: [-1, 23] },
    { hip: 17, head: [6, 35.5], sh: [4, 30], fL: [-9, 2], fR: [1, 5], hF: [12, 22], hB: [-1, 26], swap: 1 },
    { hip: 18, head: [7.5, 36.5], sh: [4.5, 31], fL: [-16, 5], fR: [9, 1], hF: [14, 24], hB: [0, 22], swap: 1 },
    { hip: 17, head: [6.5, 36.5], sh: [3.5, 31], fL: [-17, 7], fR: [7, 1], hF: [11, 23], hB: [0, 21], swap: 1 },
    { hip: 18, head: [5, 35.5], sh: [3, 30], fL: [-10, 7], fR: [-2, 1], hF: [5, 22], hB: [-2, 24], swap: 1 },
  ],
  stand: { hip: 21, head: [1, 38], sh: [0.5, 32], fL: [1, 0], fR: [-1, 0], hF: [1, 18], hB: [-1, 17] },
  // the take: rearing back from what he sees, hands up
  take: { hip: 20, head: [-3, 37.5], sh: [-2.5, 32], fL: [3, 0], fR: [-4, 0], hF: [6, 30], hB: [3, 31] },
  // the standing jump: stooping, bending further with the arms going back (the two drawings before the fold); legs
  // straight, the body folded forward flat with the arms flung back; the arms swung through as
  // he sinks; the drive off the back foot, arms reaching; up and out; the long split with the body laid forward; the
  // front leg reaching down; the strike, arms thrown back; the crouch
  stoop: { hip: 20, head: [6.5, 36.5], sh: [5, 31], fL: [0, 0], fR: [-1, 0], hF: [-1, 20], hB: [-2, 19] },
  bend: { hip: 19, head: [9.5, 35.5], sh: [8, 30], fL: [1, 0], fR: [0, 0], hF: [-5, 22], hB: [-6, 21] },
  gather: { hip: 21, head: [15.5, 27.5], sh: [11, 24], fL: [0, 0], fR: [-1, 0], hF: [-5, 23], hB: [-4, 22] },
  swing: { hip: 19, head: [13.5, 29], sh: [11, 24], fL: [-3, 0], fR: [-4, 0], hF: [16.5, 10.5], hB: [15, 11] },
  takeoff: { hip: 15, head: [8.5, 30.5], sh: [8, 24], fL: [6, 5], fR: [-11, 1], hF: [22.5, 26.5], hB: [15, 21] },
  rise: { hip: 17, head: [8.5, 30.5], sh: [7, 26], fL: [10, 5], fR: [-18, 5], hF: [22.5, 33], hB: [20, 31] },
  split: { hip: 13, head: [19.5, 22.5], sh: [13, 22], fL: [21, 4], fR: [-17, 4], hF: [28, 26], hB: [22, 27] },
  reach: { hip: 11, head: [19, 22], sh: [11, 22], fL: [19, 1], fR: [-13, 6], hF: [9, 13], hB: [8, 12] },
  strike: { hip: 12, head: [11, 22], sh: [5, 20], fL: [4, 0], fR: [-10, 5], hF: [-10, 11], hB: [-9, 10] },
  // set to sprint: low, weight forward, arms back
  set: { hip: 17, head: [7, 34], sh: [5, 29], fL: [2, 0], fR: [-3, 0], hF: [-6, 20], hB: [-8, 22] },
  crouch: { hip: 11, head: [9.5, 21.5], sh: [5, 18], fL: [6, 0], fR: [4, 0], hF: [0, 6], hB: [-1, 6] },
  // a dive under a falling gate: flat out, low, arms ahead
  dive: { hip: 8, head: [17.5, 10], sh: [12, 9], fL: [-14, 9], fR: [-17, 6], hF: [24, 10], hB: [22, 7] },
  // the sword, from the fencing drawings: drawn and presented, on guard with the free hand low, the step in with the
  // blade up and the free arm back, the lunge with the free arm flung up behind
  draw: { hip: 18, head: [3.5, 34], sh: [2, 29.5], fL: [5, 0], fR: [-5, 0], hF: [10, 29], hB: [-5, 26], sword: [0.6, 0.8] },
  guard: { hip: 16, head: [6, 32], sh: [3, 27], fL: [8, 0], fR: [-9, 0], hF: [14, 23.5], hB: [-4, 20], sword: [0.8, 0.6] },
  windup: { hip: 17, head: [1.5, 34], sh: [1, 29], fL: [14, 2], fR: [-12, 0], hF: [16, 28], hB: [-6, 30], sword: [-0.4, 0.9] },
  lunge: { hip: 13, head: [10.5, 27.5], sh: [6, 24], fL: [12, 0], fR: [-18, 0], hF: [27, 22.5], hB: [-10, 27], sword: [1, 0.02] },
  // the parry: the blade up across the cut, the free hand low; the cut, stepping in with the blade forward and up;
  // struck: the arms still out, the knees giving; reeling back, the head thrown back; down on his knees; lying on his
  // back
  block: { hip: 17, head: [0, 34.5], sh: [0.5, 29], fL: [8, 0], fR: [-9, 0], hF: [13, 33], hB: [-5, 25], sword: [0.25, 0.97] },
  cut: { hip: 15, head: [8, 30], sh: [5, 26], fL: [12, 0], fR: [-14, 0], hF: [22, 27], hB: [-8, 26], sword: [0.85, 0.5] },
  struck: { hip: 14, head: [5.5, 31], sh: [4, 26], fL: [3, 0], fR: [-11, 0], hF: [14.5, 25], hB: [6, 24] },
  reel: { hip: 15, head: [-1, 32], sh: [1, 28], fL: [5, 0], fR: [-2, 3], hF: [12, 26], hB: [8, 25] },
  kneel: { hip: 12, head: [5.5, 26.5], sh: [3, 22], fL: [-5, 1], fR: [-4, 1], hF: [6, 12], hB: [5, 11] },
  down: { hip: 3.5, head: [-20, 4], sh: [-14, 4.5], fL: [19, 2], fR: [16, 4], hF: [-6, 2], hB: [-17, 9] },
  // knocked back, falling: arms flung up, legs dangling
  fall: { hip: 18, head: [-2, 34.5], sh: [-1.5, 29], fL: [3, 3], fR: [-3, 5], hF: [5, 44], hB: [-3, 44] },
};
// the face with each drawing: how wide the eyes, where they look (across, up), how open the mouth
export const CS_FACE = { run: [0.85, 0.6, 0, 0.15], stand: [1, 0.2, 0, 0], take: [1.5, -0.2, 0.4, 1], gather: [0.6, 0.8, -0.2, 0], stoop: [0.8, 0.5, -0.3, 0], bend: [0.7, 0.7, -0.3, 0], swing: [0.8, 0.9, 0.1, 0.2], set: [0.6, 0.8, -0.2, 0], takeoff: [1.1, 0.8, 0.3, 0.6],
  rise: [1.1, 0.8, 0.3, 0.6], split: [1.2, 0.8, 0, 0.5], reach: [1.2, 0.6, -0.4, 0.4], strike: [1.25, 0.3, 0.2, 0.3], crouch: [0.9, 0.4, 0, 0.2],
  dive: [0.6, 0.9, 0, 0.8], block: [1.1, 0.9, 0.1, 0.25], cut: [0.7, 0.9, 0, 0.7], struck: [1.7, 0, 0.5, 1], reel: [1.5, -0.3, 0.7, 0.9],
  kneel: [0.6, 0.2, -0.6, 0.5], down: [0.15, 0, 0, 0.3], draw: [0.7, 0.8, 0, 0], guard: [0.65, 0.9, 0, 0], windup: [0.6, 0.9, 0, 0.3], lunge: [1.2, 1, 0, 0.9], fall: [1.6, 0, 0.6, 1] };

/** The 2-bone limb in the drawing's plane: the middle joint from the ends and the bones' lengths; bend 1 ahead, -1 behind. */
function csIK(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.max(Math.hypot(dx, dy), 1e-6), dm = Math.min(d, l1 + l2 - 1e-3);
  const ux = dx / d, uy = dy / d;
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm)))) * bend;
  const ca = Math.cos(A), sa = Math.sin(A);
  return { mid: [a[0] + l1 * (ux * ca - uy * sa), a[1] + l1 * (ux * sa + uy * ca)], end: [a[0] + ux * dm, a[1] + uy * dm] };
}

/**
 * A drawing as the figure's joints in its own frame: x across (to his right), y up, z ahead; metres.
 *
 * The drawings are side views; the body in the round is read from their own limbs, as runners are seen from in front
 * (the frontal rows of the 1887 motion studies, and the gait laboratories' numbers - the pelvis turning some ten to
 * fourteen degrees through a stride and dropping eight or nine, the chest turning against it): the pelvis turns with
 * the leg ahead and the chest with the arm ahead, so the two turn against each other as the arms swing against the
 * legs; the hip drops on the side of the leg in the air and the shoulders tilt the other way; the trunk sways over
 * the foot it stands on, and a running foot lands under the body's middle; the hands swing in toward the chest. The
 * head is steadied - it rides a little of the sway and none of the twist; where it looks is the simulation's.
 */
export function csJoints(d, tailSwing) {
  const k = CS_K;
  // (the head a neck's length from the shoulders, the way the drawing tips it)
  const nx = d.head[0] - d.sh[0], ny = d.head[1] - d.sh[1], nl = Math.max(Math.hypot(nx, ny), 1e-6), ns = Math.max(5, Math.min(7, nl)) / nl;
  d = { ...d, head: [d.sh[0] + nx * ns, d.sh[1] + ny * ns] };
  const sw = d.swap ? 1 : 0;
  const hR = sw ? d.hB : d.hF, hL = sw ? d.hF : d.hB;
  const cl = (v, a) => Math.max(-a, Math.min(a, v));
  const yawP = cl((d.fR[0] - d.fL[0]) * 0.006, 0.3);
  const yawT = cl((hR[0] - hL[0]) * 0.008, 0.45);
  const lift = d.fR[1] - d.fL[1];
  const rollP = cl(lift * 0.008, 0.12), rollT = -rollP * 0.7;
  const sway = cl(-lift * 0.0015, 0.02);
  const footX = 0.035 + 0.045 * Math.max(0, Math.min(1, 1 - Math.max(d.fL[1], d.fR[1]) / 5));
  // the hips, turned and tilted about the pelvis; the legs solved from them
  // (the hips a little inside the waist's width, so a belt at the waist and a skirt from it go over them)
  const hip = (s) => [sway + s * 0.066 * Math.cos(yawP), d.hip * k - s * 0.066 * Math.sin(rollP), s * 0.066 * Math.sin(yawP)];
  const shoulder = (s) => [sway * 0.8 + s * 0.12 * Math.cos(yawT), d.sh[1] * k - s * 0.12 * Math.sin(rollT), d.sh[0] * k + s * 0.12 * Math.sin(yawT)];
  const hipR = hip(1), hipL = hip(-1), shR = shoulder(1), shL = shoulder(-1);
  const leg = (hp, f, s) => {
    const r = csIK([hp[2] / k, hp[1] / k], f, CS_THIGH, CS_SHIN, 1);
    const fx = sway * 0.5 + s * footX;
    return [[(hp[0] + fx) / 2 + s * 0.01, r.mid[1] * k, r.mid[0] * k], [fx, r.end[1] * k, r.end[0] * k]];
  };
  const arm = (sp, h, s) => {
    const r = csIK([sp[2] / k, sp[1] / k], h, CS_UPPER, CS_FORE, -1);
    const inward = Math.max(0, Math.min(1, (h[0] - d.sh[0]) / 12));
    return [[sp[0] + s * 0.035, r.mid[1] * k, r.mid[0] * k], [sway * 0.8 + s * (0.16 - 0.07 * inward), r.end[1] * k, r.end[0] * k]];
  };
  const [kR, fR] = leg(hipR, d.fR, 1), [kL, fL] = leg(hipL, d.fL, -1);
  const [eR, wR] = arm(shR, hR, 1), [eL, wL] = arm(shL, hL, -1);
  const chest = [d.sh[0] * 0.8, d.hip + (d.sh[1] - d.hip) * 0.8];
  return [
    [sway, d.hip * k, 0], [sway * 0.85, chest[1] * k, chest[0] * k], [sway * 0.5, d.head[1] * k, d.head[0] * k],
    shR, eR, wR,
    shL, eL, wL,
    hipR, kR, fR,
    hipL, kL, fL,
    [sway, d.hip * k + 0.045, -0.125], [sway, d.hip * k - 0.2, -0.3],
  ];
}

const csV = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
// the tails: eight points down each; its length, its thickness along it (root to tip, at five even places between which
// it runs smoothly), the shape it hangs in (across, up, ahead; s from 0 at the root to 4 at the tip) and how firmly it
// keeps that shape - the fox's bushy and carried, the lizard's long, heavy and dragged
export const CS_TAIL_N = 8;
const CS_TAILS = [
  { len: 0.34, r: [0.03, 0.058, 0.068, 0.055, 0.016], rest: (s) => [0, -0.07 * s + 0.008 * s * s, -0.06 * s], hold: 0.3, drag: 0.1 },
  { len: 0.6, r: [0.05, 0.045, 0.035, 0.022, 0.008], rest: (s) => [0, -0.1 * s, -0.11 * s], hold: 0.12, drag: 0.35 },
].map((T) => ({ ...T, link: T.len / (CS_TAIL_N - 1),
  rr: Array.from({ length: CS_TAIL_N }, (_, i) => { const s = i / (CS_TAIL_N - 1) * 4, k = Math.min(3, Math.floor(s)); return T.r[k] + (T.r[k + 1] - T.r[k]) * (s - k); }) }));
/** Each tail's thickness at each of its points (the fox's, the lizard's), as the shader draws it. */
export const CS_TAIL_R = CS_TAILS.map((T) => T.rr);

/** A figure's frame for its clothes, from its joints (in any frame): the pelvis's axes and the trunk's. */
export function csDressFrame(F) {
  const J = F.J, pel = J[0], Y = [0, 1, 0];
  const up = csV.norm(csV.sub(J[1], J[0]));
  const su = csV.norm(csV.add(csV.mul(up, 0.55), Y));
  const hl = csV.sub(J[9], J[12]);
  const sdP = csV.norm(csV.sub(hl, csV.mul(su, csV.dot(hl, su))));
  const fbP = csV.norm(csV.cross(sdP, su));
  const mid = csV.mul(csV.add(J[3], J[6]), 0.5);
  const u = csV.norm(csV.sub(mid, pel)), sd = csV.norm(csV.sub(J[3], J[6]));
  const fb = csV.norm(csV.cross(sd, u));
  return { J, pel, su, sdP, fbP, mid, u, fb, top: csV.add(mid, csV.mul(u, 0.03)),
    fwd: [F.f[0], 0, F.f[1]], right: csV.norm(csV.cross([F.f[0], 0, F.f[1]], Y)).map((v) => -v) };
}

const csTailRest = (fr, kind) => Array.from({ length: CS_TAIL_N }, (_, i) => {
  const o = CS_TAILS[kind].rest(i / (CS_TAIL_N - 1) * 4);
  return csV.add(csV.add(csV.add(fr.J[15], csV.mul(fr.right, o[0])), [0, o[1], 0]), csV.mul(fr.fwd, o[2]));
});

/** Out of a capsule from a to b of radius r, straight out; speed into it lost. */
function csPush(p, o, a, b, r) {
  const ab = csV.sub(b, a), aa = csV.dot(ab, ab) || 1;
  const s = Math.max(0, Math.min(1, csV.dot(csV.sub(p, a), ab) / aa));
  const c = csV.sub(p, csV.add(a, csV.mul(ab, s))), cl = Math.hypot(c[0], c[1], c[2]);
  if (cl >= r) return;
  const dir = cl > 1e-6 ? csV.mul(c, 1 / cl) : [0, 1, 0], depth = r - cl;
  for (let i = 0; i < 3; i++) { p[i] += dir[i] * depth; o[i] += dir[i] * depth; }
  const vn = csV.dot(csV.sub(p, o), dir);
  if (vn < 0) for (let i = 0; i < 3; i++) o[i] += dir[i] * vn;
}

/**
 * The tail, a chain of eight points by Verlet's method: gravity, the air's drag, a pull toward the shape it hangs in;
 * each link held at its length and every other point kept apart, so it bends in a curve, never a kink; kept off the
 * legs, the trunk and the skirt (it comes out above the belt and hangs over the skirt); on the floor it drags.
 */
function csTailStep(S, fr, dt) {
  const J = fr.J, T = CS_TAILS[S.kind], C = S.tail, Y = [0, -9.8, 0], N = CS_TAIL_N;
  const legs = [[J[9], J[10], 0.06], [J[10], J[11], 0.05], [J[12], J[13], 0.06], [J[13], J[14], 0.05]];
  const tr = csTailRest(fr, S.kind), hip = csV.add(fr.pel, csV.mul(fr.u, 0.1)), hem = csV.sub(fr.pel, csV.mul(fr.su, 0.26));
  for (let i = 1; i < N; i++) {
    const p = C.p[i], o = C.q[i], v = csV.sub(p, o), a = csV.add(Y, csV.mul(csV.sub(tr[i], p), T.hold / (dt * dt) * 0.02));
    C.q[i] = p.slice();
    for (let k = 0; k < 3; k++) p[k] += v[k] * 0.98 + a[k] * dt * dt;
  }
  C.p[0] = J[15].slice(); C.q[0] = J[15].slice();
  const link = (A, B, len, min) => {
    const d = csV.sub(B, A), dl = Math.hypot(d[0], d[1], d[2]) || 1;
    if (min && dl >= len) return;
    const e = (dl - len) / dl;
    for (let k = 0; k < 3; k++) { if (A !== C.p[0]) A[k] += d[k] * e * 0.5; B[k] -= d[k] * e * (A !== C.p[0] ? 0.5 : 1); }
  };
  for (let it = 0; it < 6; it++) {
    for (let i = 0; i < N - 1; i++) link(C.p[i], C.p[i + 1], T.link, false);
    for (let i = 0; i < N - 2; i++) link(C.p[i], C.p[i + 2], T.link * 1.85, true);
    for (let i = 1; i < N; i++) {
      const p = C.p[i], o = C.q[i], r = T.rr[i];
      for (const g of legs) csPush(p, o, g[0], g[1], g[2] + r + 0.01);
      csPush(p, o, fr.pel, fr.top, 0.1 + r * 0.5);
      csPush(p, o, hip, hem, 0.2 + r * 0.7);
      if (p[1] < r) { p[1] = r; o[1] = r; o[0] += (p[0] - o[0]) * T.drag; o[2] += (p[2] - o[2]) * T.drag; }
    }
  }
  // (the lengths once more last, from the root out, so no push leaves a link long)
  for (let i = 0; i < N - 1; i++) { const A = C.p[i], B = C.p[i + 1], d = csV.sub(B, A), dl = Math.hypot(d[0], d[1], d[2]) || 1, e = (dl - T.link) / dl; for (let k = 0; k < 3; k++) B[k] -= d[k] * e; }
}

// ---- the body as the shader draws it (csFigure in the castle's style), for the cloth to keep off: the same shapes
// with the same sizes, kept in step with it by hand - a change to one is a change to the other
const csConeD = (x, y, z, a, b, r1, r2) => {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], ax = x - a[0], ay = y - a[1], az = z - a[2];
  const h = Math.max(0, Math.min(1, (ax * bx + ay * by + az * bz) / (bx * bx + by * by + bz * bz || 1)));
  const dx = ax - bx * h, dy = ay - by * h, dz = az - bz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * h);
};
const csSminD = (a, b, k) => { const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); };
const csBoxD = (x, y, z, ex, ey, ez, r) => {
  const qx = Math.abs(x) - ex, qy = Math.abs(y) - ey, qz = Math.abs(z) - ez;
  const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
  return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

/** A figure's body for the cloth: its joints, its axes, its tail as it is, its scabbard when the sword is in it. */
export function csBody(F, tail) {
  const J = F.J, V = csV, pel = J[0], che = J[1], hea = J[2];
  const sd = V.norm([J[3][0] - J[6][0], J[3][1] - J[6][1], J[3][2] - J[6][2] + 1e-4]);
  const up = V.norm(V.sub(che, pel)), fb = V.norm(V.cross(sd, up));
  const fh = V.norm([fb[0] + 1e-4, 0, fb[2]]);
  const shm = V.mul(V.add(J[3], J[6]), 0.5);
  const lerp = (a, b, w) => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
  const boots = [[10, 11], [13, 14]].map(([a, b]) => {
    const kn = J[a], ft = J[b], top = lerp(kn, ft, 0.18), dl = V.norm(V.sub(ft, kn));
    return [top, V.add(ft, [0, 0.02, 0]), V.sub(top, V.mul(dl, 0.01)), V.add(top, V.mul(dl, 0.045)), V.sub(V.add(ft, [0, 0.005, 0]), V.mul(fh, 0.02)), V.add(ft, V.mul(fh, 0.13))];
  });
  const scab = F.scab ? [F.scab[0], F.scab[1], V.sub(F.scab[0], V.mul(V.norm(V.sub(F.scab[1], F.scab[0])), 0.14))] : null;
  // (a ball round each part - its points, and as much again as its thickness can reach past them)
  const ball = (P, pad) => {
    const c = [0, 1, 2].map((k) => P.reduce((s, q) => s + q[k], 0) / P.length);
    return [c[0], c[1], c[2], Math.max(...P.map((q) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]))) + pad];
  };
  const cc = V.sub(shm, V.mul(up, 0.1)), n1 = V.sub(hea, V.mul(up, 0.05));
  const bArm = [3, 6].map((s) => ball([J[s], J[s + 1], J[s + 2]], 0.06));
  const bLeg = [[9, 0], [12, 1]].map(([l, k]) => ball([J[l], J[l + 1], J[l + 2], boots[k][5]], 0.08));
  const bTail = tail ? ball(tail, 0.1) : null, bScab = scab ? ball(scab, 0.04) : null;
  return { bArm, bLeg, bTail, bScab, bTrunk: ball([J[3], J[6], pel, n1, cc], 0.21),
 J, pel, che, hea, sd, up, fb, shm, cc, g0: V.sub(J[3], V.mul(up, 0.01)), g1: V.sub(J[6], V.mul(up, 0.01)),
    w0: V.sub(shm, V.mul(up, 0.17)), w1: V.add(pel, V.mul(up, 0.02)), p0: V.add(J[3], V.mul(up, 0.02)), p1: V.add(J[6], V.mul(up, 0.02)),
    n0: V.add(che, V.mul(up, 0.06)), n1, gl: [lerp(J[4], J[5], 0.72), lerp(J[7], J[8], 0.72)], boots, tail, scab };
}

/** How far a point is from the body's surface (negative inside), as csFigure draws it. */
export function csBodyD(B, x, y, z) {
  const J = B.J, sd = B.sd, up = B.up, fb = B.fb;
  const near = (s) => { const dx = x - s[0], dy = y - s[1], dz = z - s[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz) - s[3]; };
  // the belt (snug at the waist), the head (a ball round it, ears and muzzle within reach)
  const sx = x - B.pel[0], sy = y - B.pel[1], sz = z - B.pel[2], by = sx * up[0] + sy * up[1] + sz * up[2];
  const rx = sx - up[0] * by, ry = sy - up[1] * by, rz = sz - up[2] * by;
  let d = Math.max(Math.abs(by - 0.085) - 0.024, Math.sqrt(rx * rx + ry * ry + rz * rz) - 0.106);
  const hx = x - B.hea[0], hy = y - B.hea[1], hz = z - B.hea[2];
  d = Math.min(d, Math.sqrt(hx * hx + hy * hy + hz * hz) - 0.11);
  // the trunk: the chest, the shoulder girdle, the waist; the breastplate, the pauldrons, the neck
  if (near(B.bTrunk) < d) {
    const tx = x - B.cc[0], ty = y - B.cc[1], tz = z - B.cc[2];
    const lx = tx * sd[0] + ty * sd[1] + tz * sd[2], ly = tx * up[0] + ty * up[1] + tz * up[2], lz = tx * fb[0] + ty * fb[1] + tz * fb[2];
    const chest = csBoxD(lx, ly, lz, 0.085, 0.07, 0.05, 0.045);
    d = Math.min(d, csSminD(csSminD(chest, csConeD(x, y, z, B.g0, B.g1, 0.055, 0.055), 0.05), csConeD(x, y, z, B.w0, B.w1, 0.1, 0.085), 0.06));
    d = Math.min(d, Math.max(csBoxD(lx, ly - 0.01, lz - 0.014, 0.068, 0.05, 0.046, 0.05), -(lz - 0.005)));
    for (let k = 0; k < 2; k++) { const c = k ? B.p1 : B.p0, ax = x - c[0], ay = (y - c[1]) * 1.5, az = z - c[2]; d = Math.min(d, Math.sqrt(ax * ax + ay * ay + az * az) - 0.06); }
    d = Math.min(d, csConeD(x, y, z, B.n0, B.n1, 0.034, 0.034));
  }
  // the legs and boots, the arms and gloves
  for (let k = 0; k < 2; k++) {
    const l = k ? 12 : 9;
    if (near(B.bLeg[k]) < d) {
      d = Math.min(d, csSminD(csConeD(x, y, z, J[l], J[l + 1], 0.046, 0.04), csConeD(x, y, z, J[l + 1], J[l + 2], 0.04, 0.032), 0.02));
      const b = B.boots[k];
      d = Math.min(d, csSminD(Math.min(csConeD(x, y, z, b[0], b[1], 0.052, 0.042), csConeD(x, y, z, b[2], b[3], 0.07, 0.06)), csConeD(x, y, z, b[4], b[5], 0.044, 0.026), 0.025));
    }
    const s = k ? 6 : 3;
    if (near(B.bArm[k]) < d) {
      d = Math.min(d, csSminD(csConeD(x, y, z, J[s], J[s + 1], 0.04, 0.03), csConeD(x, y, z, J[s + 1], J[s + 2], 0.03, 0.024), 0.015));
      const h = J[s + 2], gx = x - h[0], gy = y - h[1], gz = z - h[2];
      d = Math.min(d, Math.sqrt(gx * gx + gy * gy + gz * gz) - 0.042, csConeD(x, y, z, B.gl[k], h, 0.03, 0.045));
    }
  }
  // the tail as it hangs now; the scabbard and its hilt
  const T = B.tail;
  if (T && near(B.bTail) < d) d = Math.min(d, csTailD(T, x, y, z));
  if (B.scab && near(B.bScab) < d) d = Math.min(d, csConeD(x, y, z, B.scab[0], B.scab[1], 0.028, 0.02), csConeD(x, y, z, B.scab[2], B.scab[0], 0.018, 0.018));
  return d;
}

// ---- the clothes, as cloth: each one a grid of points - the cape a sheet hung across his shoulders, the skirt a tube
// round the belt - drawn as the triangles between them, so what is drawn is what is simulated. Stepped the way games
// step cloth (position-based, in small steps, after Müller, Macklin and others): each step moves the points by their
// speed and gravity and the air's push on each triangle, then holds each edge at its length, keeps the cloth from
// folding sharp (every other point a set way apart), tethers each point within its length down the cloth from where it
// hangs (so the cloth never stretches, Kim and others' long-range attachments), keeps each within a reach of where it
// would lie on the body still (so a cape cannot be thrown over his head), and last keeps every point a little off the
// body as it is drawn - its own shapes, the tail's included - so neither tail nor back nor leg comes through it.
const CS_CAPE_C = 7, CS_CAPE_R = 7, CS_CAPE_ROW = 0.09;
const CS_SKIRT_C = 16, CS_SKIRT_R = 5, CS_SLIT = 0.22;
// (each row's depth down from the belt and its round's radius: from under the belt, out over the hips, then hanging)
const CS_SKIRT_DOWN = [0, 0.05, 0.125, 0.205, 0.285], CS_SKIRT_RAD = [0.098, 0.13, 0.156, 0.174, 0.19];   // the skirt's slit at the back, for the tail: half its angle
export const CS_CLOTH_KEEP = 0.02;           // how far cloth keeps off the body: more than a flat triangle's sag round a thigh
const CS_SUB = 1;                            // small steps to each 1/120 s
export const CS_CLOTH_N = CS_CAPE_C * CS_CAPE_R + 2 * CS_SKIRT_C * CS_SKIRT_R;

/** A cloth's grid: C points across, R down (the first row hung), joined round if wrap; its rest shape gives its lengths. */
function csGrid(C, R, wrap, rest) {
  const n = C * R, id = (r, c) => r * C + ((c % C) + C) % C, P = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) P.push(rest(r, c));
  const dist = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]);
  const E = [], Bn = [], cm = wrap ? C : C - 1;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const i = id(r, c);
    if (c < cm && r > 0) E.push(i, id(r, c + 1));
    if (r < R - 1) {
      E.push(i, id(r + 1, c));
      if (c < cm) E.push(i, id(r + 1, c + 1), id(r, c + 1), id(r + 1, c));
    }
    if (r > 0 && (wrap || c + 2 < C)) Bn.push(i, id(r, c + 2));
    if (r + 2 < R) Bn.push(i, id(r + 2, c));
  }
  const len = (A) => Float64Array.from({ length: A.length / 2 }, (_, k) => dist(A[2 * k], A[2 * k + 1]));
  // (each point's length down the cloth from the point it hangs from)
  const tether = Float64Array.from({ length: n }, (_, i) => { let s = 0; for (let r = 1; r <= Math.floor(i / C); r++) s += dist(id(r - 1, i % C), id(r, i % C)); return s; });
  return { C, R, wrap, n, e: Int32Array.from(E), eLen: len(E), b: Int32Array.from(Bn), bLen: len(Bn), tether,
    p: new Float64Array(n * 3), q: new Float64Array(n * 3), v: new Float64Array(n * 3) };
}

// where each cloth's points lie on the body still, and how far each may go from there: the cape from an arc behind his
// neck down his back, widening; the skirt from a ring under the belt, flaring, hanging between his trunk's line and
// the plumb
// (each worked out for a body once, then asked point by point)
const csCapeAt = (B) => (r, c) => {
  const w = r / (CS_CAPE_R - 1), x = (c / (CS_CAPE_C - 1) - 0.5) * (0.2 + 0.18 * w), x0 = (c / (CS_CAPE_C - 1) - 0.5) * 0.2;
  const back = 0.1 - 1.2 * x0 * x0 + 0.015 * r, dn = 0.02 - r * CS_CAPE_ROW * 0.97;
  return [B.shm[0] + B.up[0] * dn + B.sd[0] * x - B.fb[0] * back, B.shm[1] + B.up[1] * dn + B.sd[1] * x - B.fb[1] * back, B.shm[2] + B.up[2] * dn + B.sd[2] * x - B.fb[2] * back];
};
const csCapeOut = (B) => { const o = [-B.fb[0], -B.fb[1], -B.fb[2]]; return () => o; };
const csCapeReach = (r) => r === 0 ? 0 : 0.05 + 0.4 * r / (CS_CAPE_R - 1);
const csSkirtAt = (B) => {
  const su = csV.norm([B.up[0] * 0.55, B.up[1] * 0.55 + 1, B.up[2] * 0.55]), hl = csV.sub(B.J[9], B.J[12]);
  const axes = [B.up, su].map((ax) => { const s = csV.norm(csV.sub(hl, csV.mul(ax, csV.dot(hl, ax)))); return [s, csV.cross(s, ax)]; });
  return (r, c) => {
    const a = Math.PI + CS_SLIT + (c / (CS_SKIRT_C - 1)) * (Math.PI - CS_SLIT) * 2, [sdP, fbP] = axes[r ? 1 : 0], sa = Math.sin(a), ca = Math.cos(a);
    const rad = CS_SKIRT_RAD[r], down = CS_SKIRT_DOWN[r];
    return [0, 1, 2].map((k) => B.pel[k] + B.up[k] * 0.09 - su[k] * down + (sdP[k] * sa + fbP[k] * ca) * rad);
  };
};
const csSkirtReach = (r) => 0.12 + 0.1 * r;
const csSkirtOut = (B) => (x, y, z, hung) => {
  if (hung) return B.up;
  const dx = x - B.pel[0], dy = y - B.pel[1], dz = z - B.pel[2], h = dx * B.up[0] + dy * B.up[1] + dz * B.up[2];
  return csV.norm([dx - B.up[0] * h, dy - B.up[1] * h, dz - B.up[2] * h]);
};

/** The bone of the limb nearest a point (an arm's, a leg's, the tail's), as a direction; null if the trunk is nearer. */
function csLimbAxis(B, x, y, z) {
  const J = B.J;
  let best = csConeD(x, y, z, B.w0, B.w1, 0.1, 0.085) + 0.03, a = null;
  const seg = (A, C, r) => { const d = csConeD(x, y, z, A, C, r, r); if (d < best) { best = d; a = csV.norm(csV.sub(C, A)); } };
  for (const s of [3, 6]) { seg(J[s], J[s + 1], 0.035); seg(J[s + 1], J[s + 2], 0.03); }
  for (const l of [9, 12]) { seg(J[l], J[l + 1], 0.05); seg(J[l + 1], J[l + 2], 0.04); }
  if (B.tail) for (let i = 0; i < B.tail.length - 1; i++) seg(B.tail[i], B.tail[i + 1], B.tail[i][3]);
  return a;
}
/** The body's outward facing at a point (its distance's gradient). */
function csBodyN(B, x, y, z) {
  const e = 0.002, f = (sx, sy, sz) => csBodyD(B, x + sx * e, y + sy * e, z + sz * e);
  const a = f(1, -1, -1), b = f(-1, -1, 1), c = f(-1, 1, -1), g = f(1, 1, 1);
  const nx = a - b - c + g, ny = -a - b + c + g, nz = -a + b - c + g, nl = Math.hypot(nx, ny, nz) || 1;
  return [nx / nl, ny / nl, nz / nl];
}
/**
 * A cloth point kept off the body: pushed out along the body's facing while that leads outward of the garment (out:
 * away from him - back off his back for the cape, out from his hips for the skirt); where it would lead inward (a point
 * caught between the tail and his back, or inside a leg on its inner side), carried outward until clear instead, so
 * the cloth always lies over him, never between his parts. Returns the facing where it ends, or null if it was clear.
 */
function csKeepOff(B, P, k, keep, out, d0) {
  let d = d0 === undefined ? csBodyD(B, P[k], P[k + 1], P[k + 2]) : d0, across = null, n = null;
  csKeepOff.d = d;
  // (within two millimetres of its keep is kept: a point resting at it must not creep)
  if (d >= keep - 0.002) return null;
  // (and carried at most six centimetres a step: cloth caught where two parts of him meet - a thigh against his belly
  // in a crouch - stays in the fold rather than being flung out)
  let moved = 0;
  for (let it = 0; it < 14 && d < keep - 0.002 && moved < 0.06; it++) {
    // (the body's facing taken once, and again only if the point is still in after two pushes along it)
    if (it === 0 || it === 2 || it > 4) n = csBodyN(B, P[k], P[k + 1], P[k + 2]);
    if (across || n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0.2) {
      // (across the limb it is caught in, at right angles to its bone, to the garment's outer side - never along it)
      if (!across) {
        const a = csLimbAxis(B, P[k], P[k + 1], P[k + 2]), o = a ? csV.sub(out, csV.mul(a, csV.dot(out, a))) : out, ol = Math.hypot(o[0], o[1], o[2]);
        across = ol > 0.3 ? csV.mul(o, 1 / ol) : n;
      }
      n = across;
    }
    const s = Math.min(Math.max(keep - d, 0.004) + 1e-4, 0.06 - moved);
    moved += s;
    P[k] += n[0] * s; P[k + 1] += n[1] * s; P[k + 2] += n[2] * s;
    d = csBodyD(B, P[k], P[k + 1], P[k + 2]);
  }
  csKeepOff.d = d;
  return n;
}

/** One small step of a cloth on a body at that moment (B), the body's step before (B0). */
/** How far a point is from a tail (its points with their thicknesses), as csFigure draws it. */
function csTailD(T, x, y, z) {
  let tl = 1e9;
  for (let i = 0; i < T.length - 1; i++) tl = csSminD(tl, csConeD(x, y, z, T[i], T[i + 1], T[i][3], T[i + 1][3]), 0.025);
  return tl;
}
/** A cloth point kept off a tail, along the tail's own facing (so a skirt parts round it, or goes under it). */
function csTailOff(tail, P, k) {
  for (let it = 0; it < 3; it++) {
    const d = csTailD(tail, P[k], P[k + 1], P[k + 2]);
    if (d >= CS_CLOTH_KEEP) break;
    const e = 0.002, f = (sx, sy, sz) => csTailD(tail, P[k] + sx * e, P[k + 1] + sy * e, P[k + 2] + sz * e);
    const a = f(1, -1, -1), b = f(-1, -1, 1), c = f(-1, 1, -1), g = f(1, 1, 1);
    const nx = a - b - c + g, ny = -a - b + c + g, nz = -a + b - c + g, s = (CS_CLOTH_KEEP - d) / (Math.hypot(nx, ny, nz) || 1);
    P[k] += nx * s; P[k + 1] += ny * s; P[k + 2] += nz * s;
  }
}
function csClothSub(G, B, B0, atB, outB, reach, dt, air, tail) {
  const { n, p, q, v, C } = G, at = atB(B), out = outB(B);
  // (where each point would hang on the body this step: the same for the whole step, so worked out once)
  const rest = G.rest || (G.rest = new Float64Array(n * 3));
  for (let i = 0; i < n; i++) { const P = at(Math.floor(i / C), i % C); rest[i * 3] = P[0]; rest[i * 3 + 1] = P[1]; rest[i * 3 + 2] = P[2]; }
  // the hung row goes with the body, kept off it
  for (let c = 0; c < C; c++) {
    const k = c * 3, P = [rest[k], rest[k + 1], rest[k + 2]];
    q[k] = p[k]; q[k + 1] = p[k + 1]; q[k + 2] = p[k + 2];
    p[k] = P[0]; p[k + 1] = P[1]; p[k + 2] = P[2];
    if (!G.underBelt) csKeepOff(B, p, k, CS_CLOTH_KEEP, out(p[k], p[k + 1], p[k + 2], true));
    if (p[k + 1] < 0.012) p[k + 1] = 0.012;
    v[k] = (p[k] - q[k]) / dt; v[k + 1] = (p[k + 1] - q[k + 1]) / dt; v[k + 2] = (p[k + 2] - q[k + 2]) / dt;
  }
  // the air's push on each triangle, against its speed through it, along its facing
  const acc = new Float64Array(n * 3);
  const cm = G.wrap ? C : C - 1;
  for (let r = 0; r < G.R - 1; r++) for (let c = 0; c < cm; c++) {
    const i00 = r * C + c, i01 = r * C + (c + 1) % C, i10 = i00 + C, i11 = i01 + C;
    for (const [a, b, d] of [[i00, i01, i10], [i01, i11, i10]]) {
      const A = a * 3, Bk = b * 3, D = d * 3;
      const ux = p[Bk] - p[A], uy = p[Bk + 1] - p[A + 1], uz = p[Bk + 2] - p[A + 2], wx = p[D] - p[A], wy = p[D + 1] - p[A + 1], wz = p[D + 2] - p[A + 2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const vn = ((v[A] + v[Bk] + v[D]) * nx + (v[A + 1] + v[Bk + 1] + v[D + 1]) * ny + (v[A + 2] + v[Bk + 2] + v[D + 2]) * nz) / 3;
      for (const j of [A, Bk, D]) { acc[j] -= air * vn * nx; acc[j + 1] -= air * vn * ny; acc[j + 2] -= air * vn * nz; }
    }
  }
  for (let i = C; i < n; i++) {
    const k = i * 3;
    v[k] += acc[k] * dt; v[k + 1] += (acc[k + 1] - 9.8) * dt; v[k + 2] += acc[k + 2] * dt;
    for (let j = 0; j < 3; j++) { v[k + j] *= 0.998; q[k + j] = p[k + j]; p[k + j] += v[k + j] * dt; }
  }
  // the edges at their lengths, the folds kept round (soft, by compliance), the tethers and the reach
  const pin = (i) => i < C;
  const hold = (I, L, alpha, minOnly) => {
    for (let s = 0; s < L.length; s++) {
      const i = I[2 * s], j = I[2 * s + 1], wi = pin(i) ? 0 : 1, wj = pin(j) ? 0 : 1;
      if (wi + wj === 0) continue;
      const a = i * 3, b = j * 3, dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
      const dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9, Cn = dl - L[s];
      if (minOnly && Cn > 0) continue;
      const g = Cn / (wi + wj + alpha) / dl;
      p[a] += dx * g * wi; p[a + 1] += dy * g * wi; p[a + 2] += dz * g * wi;
      p[b] -= dx * g * wj; p[b + 1] -= dy * g * wj; p[b + 2] -= dz * g * wj;
    }
  };
  // (the lengths and the body taken in turn, twice over: so where a leg pushes the cloth, the cloth rides up over it
  // rather than stretching)
  const bv = [B.pel[0] - B0.pel[0], B.pel[1] - B0.pel[1], B.pel[2] - B0.pel[2]];
  const dist = G.dist || (G.dist = new Float64Array(n));
  for (let pass = 0; pass < 2; pass++) {
  // (the lengths four times over: one pass a step cannot carry the body's motion down the cloth)
  for (let it = 0; it < 4; it++) {
  hold(G.e, G.eLen, 0, false);
  hold(G.b, G.bLen, G.bend / (dt * dt), false);
  for (let i = C; i < n; i++) {
    const k = i * 3, a = (i % C) * 3, r = Math.floor(i / C);
    let dx = p[k] - p[a], dy = p[k + 1] - p[a + 1], dz = p[k + 2] - p[a + 2], dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dl > G.tether[i]) { const s = G.tether[i] / dl; p[k] = p[a] + dx * s; p[k + 1] = p[a + 1] + dy * s; p[k + 2] = p[a + 2] + dz * s; }
    const m = reach(r);
    dx = p[k] - rest[k]; dy = p[k + 1] - rest[k + 1]; dz = p[k + 2] - rest[k + 2]; dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dl > m) { const s = m / dl; p[k] = rest[k] + dx * s; p[k + 1] = rest[k + 1] + dy * s; p[k + 2] = rest[k + 2] + dz * s; }
  }
  }
  // off the body, sliding on it with a little friction (relative to the body's own motion there)
  if (tail) for (let i = C; i < n; i++) csTailOff(tail, p, i * 3);
  for (let i = 0; i < C; i++) dist[i] = CS_CLOTH_KEEP;
  for (let i = C; i < n; i++) {
    const k = i * 3;
    const nrm = csKeepOff(B, p, k, CS_CLOTH_KEEP, out(p[k], p[k + 1], p[k + 2]));
    dist[i] = csKeepOff.d;
    if (nrm && pass) {
      const rx = p[k] - q[k] - bv[0], ry = p[k + 1] - q[k + 1] - bv[1], rz = p[k + 2] - q[k + 2] - bv[2], rn = rx * nrm[0] + ry * nrm[1] + rz * nrm[2];
      q[k] += (rx - nrm[0] * rn) * 0.3; q[k + 1] += (ry - nrm[1] * rn) * 0.3; q[k + 2] += (rz - nrm[2] * rn) * 0.3;
    }
  }
  }
  // (and the faces between the points: a point on each edge and in each triangle's middle is kept off the body too,
  // carrying its corners with it - the virtual particles of games' cloth - so no limb comes through between points)
  // (each corner moved by the average of the pushes on it, not their sum, so a crowded corner is not flung out)
  const vp = [[0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], [1 / 3, 1 / 3, 1 / 3]], X = [0, 0, 0];
  const push = new Float64Array(n * 3), cnt = new Uint8Array(n);
  for (let r = 0; r < G.R - 1; r++) for (let c = 0; c < cm; c++) {
    const i00 = r * C + c, i01 = r * C + (c + 1) % C, i10 = i00 + C, i11 = i01 + C;
    for (const T of [[i00, i01, i10], [i01, i11, i10]]) {
      for (const w of vp) {
        if (w[0] && w[1] && !w[2] && r === 0 && T[1] < C) continue;
        for (let k = 0; k < 3; k++) X[k] = p[T[0] * 3 + k] * w[0] + p[T[1] * 3 + k] * w[1] + p[T[2] * 3 + k] * w[2];
        // (clear for certain if a corner is far enough off the body: no surface is nearer it than the body is to
        // the corner, less the way to it - half as much again for the pauldrons' squashed balls)
        let lb = -1e9;
        for (let j = 0; j < 3; j++) if (w[j]) { const m = T[j] * 3; lb = Math.max(lb, dist[T[j]] - 1.5 * Math.hypot(X[0] - p[m], X[1] - p[m + 1], X[2] - p[m + 2])); }
        const x0 = X[0], y0 = X[1], z0 = X[2];
        if (lb < CS_CLOTH_KEEP) {
          const dx = csBodyD(B, X[0], X[1], X[2]);
          if (dx < CS_CLOTH_KEEP) csKeepOff(B, X, 0, CS_CLOTH_KEEP, out(x0, y0, z0), dx);
        }
        // (the skirt off the tail that hangs over it, along the tail's own facing)
        if (tail && csTailD(tail, X[0], X[1], X[2]) < CS_CLOTH_KEEP) csTailOff(tail, X, 0);
        if (X[0] === x0 && X[1] === y0 && X[2] === z0) continue;
        for (let j = 0; j < 3; j++) if (w[j] && T[j] >= C) {
          const m = T[j] * 3;
          push[m] += X[0] - x0; push[m + 1] += X[1] - y0; push[m + 2] += X[2] - z0; cnt[T[j]]++;
        }
      }
    }
  }
  for (let i = C; i < n; i++) if (cnt[i]) for (let k = 0; k < 3; k++) p[i * 3 + k] += push[i * 3 + k] / cnt[i];
  for (let i = C; i < n; i++) {
    const k = i * 3;
    if (p[k + 1] < 0.012) { p[k + 1] = 0.012; q[k] += (p[k] - q[k]) * 0.4; q[k + 2] += (p[k + 2] - q[k + 2]) * 0.4; if (q[k + 1] < 0.012) q[k + 1] = 0.012; }
    v[k] = (p[k] - q[k]) / dt; v[k + 1] = (p[k + 1] - q[k + 1]) / dt; v[k + 2] = (p[k + 2] - q[k + 2]) / dt;
  }
}

const csLerpF = (F0, F1, w) => ({ J: F1.J.map((p, i) => p.map((x, k) => F0.J[i][k] + (x - F0.J[i][k]) * w)), f: F1.f,
  scab: F1.scab && F0.scab ? F1.scab.map((p, i) => p.map((x, k) => F0.scab[i][k] + (x - F0.scab[i][k]) * w)) : F1.scab });

/** A figure's clothes at rest on it (F: its joints in the room): the cape (the hero's), the tail, the skirt, settled. */
export function csDressHang(F, kind, settle = CS_SETTLE) {
  const fr = csDressFrame(F);
  const tail = csTailRest(fr, kind);
  const S = { kind, tail: { p: tail, q: tail.map((v) => v.slice()) }, F };
  const B = csBody(F, null);
  S.cape = kind === 0 ? csGrid(CS_CAPE_C, CS_CAPE_R, false, csCapeAt(B)) : null;
  S.skirt = csGrid(CS_SKIRT_C, CS_SKIRT_R, false, csSkirtAt(B));
  if (S.cape) S.cape.bend = 2e-6;
  S.skirt.bend = 4e-6;
  S.skirt.underBelt = true;
  for (const [G, atB] of [[S.cape, csCapeAt], [S.skirt, csSkirtAt]]) if (G) for (let i = 0, at = atB(B); i < G.n; i++) {
    const P = at(Math.floor(i / G.C), i % G.C);
    G.p.set(P, i * 3); G.q.set(P, i * 3);
  }
  // (settled: a second still, so it starts hanging as it would, off the tail and the body)
  csDressSettle(S, settle);
  return S;
}
const CS_SETTLE = 60;

/** The hang's settling, k steps more of it (live, spread over the frames before the room comes on). */
export function csDressSettle(S, k) {
  S.settled = S.settled || 0;
  for (; k > 0 && S.settled < CS_SETTLE; k--, S.settled++) csDressStep(S, S.F, S.F, 1 / 120);
  return S.settled >= CS_SETTLE;
}

/** The clothes a step on (dt), the body going from F0 to F1 over it. */
export function csDressStep(S, F0, F1, dt) {
  csTailStep(S, csDressFrame(F1), dt);
  // (the cape keeps off the tail; the skirt is under it, and keeps off the rest of him)
  const tail = S.tail.p.map((p, i) => [p[0], p[1], p[2], CS_TAIL_R[S.kind][i]]);
  let Bp = csBody(F0, tail), Bq = csBody(F0, null);
  for (let s = 1; s <= CS_SUB; s++) {
    const Fs = s === CS_SUB ? F1 : csLerpF(F0, F1, s / CS_SUB), B = csBody(Fs, tail), Bs = csBody(Fs, null);
    if (S.cape) csClothSub(S.cape, B, Bp, csCapeAt, csCapeOut, csCapeReach, dt / CS_SUB, 1.2);
    csClothSub(S.skirt, Bs, Bq, csSkirtAt, csSkirtOut, csSkirtReach, dt / CS_SUB, 0.8, tail);
    Bp = B; Bq = Bs;
  }
  S.F = F1;
}

const csClone = (G) => G && { ...G, p: G.p.slice(), q: G.q.slice(), v: G.v.slice() };

/**
 * The clothes as drawn at a moment between steps: a copy carried on from the last step to the moment itself, the body
 * as it is then - so nothing drawn is a step behind the body. Each cloth's points with their facing (the triangles'
 * round each point, outward: off his back for the cape, out from him for the skirt).
 */
export function csDressShown(S, F, dt) {
  let T = S;
  if (dt > 1e-9) {
    T = { kind: S.kind, tail: { p: S.tail.p.map((v) => v.slice()), q: S.tail.q.map((v) => v.slice()) }, cape: csClone(S.cape), skirt: csClone(S.skirt), F: S.F };
    csDressStep(T, S.F, F, dt);
  }
  const normals = (G, sign) => {
    if (!G) return null;
    const { p, C, R } = G, N = new Float64Array(G.n * 3), cm = G.wrap ? C : C - 1;
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < cm; c++) {
      const i00 = r * C + c, i01 = r * C + (c + 1) % C, i10 = i00 + C, i11 = i01 + C;
      for (const [a, b, d] of [[i00, i01, i10], [i01, i11, i10]]) {
        const A = a * 3, Bk = b * 3, D = d * 3;
        const ux = p[Bk] - p[A], uy = p[Bk + 1] - p[A + 1], uz = p[Bk + 2] - p[A + 2], wx = p[D] - p[A], wy = p[D + 1] - p[A + 1], wz = p[D + 2] - p[A + 2];
        const nx = (uy * wz - uz * wy) * sign, ny = (uz * wx - ux * wz) * sign, nz = (ux * wy - uy * wx) * sign;
        for (const j of [A, Bk, D]) { N[j] += nx; N[j + 1] += ny; N[j + 2] += nz; }
      }
    }
    for (let i = 0; i < G.n; i++) { const k = i * 3, l = Math.hypot(N[k], N[k + 1], N[k + 2]) || 1; N[k] /= l; N[k + 1] /= l; N[k + 2] /= l; }
    return { p: G.p, N, C, R, wrap: G.wrap, n: G.n };
  };
  return { tail: T.tail.p, cape: normals(T.cape, 1), skirt: normals(T.skirt, -1) };
}

// (a facing packed into one number, two eleven-bit halves of its octahedral map; the shader unpacks it)
const csOct = (x, y, z) => {
  const l = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
  let a = x / l, b = y / l;
  if (z < 0) { const a0 = a; a = (1 - Math.abs(b)) * (a0 >= 0 ? 1 : -1); b = (1 - Math.abs(a0)) * (b >= 0 ? 1 : -1); }
  return Math.round((a + 1) * 1023.5) * 2048 + Math.round((b + 1) * 1023.5);
};

/**
 * The clothes for the shader: every cloth point (the cape's, the hero's skirt's, the guard's skirt's) with its facing;
 * the cloth cut in patches of a few quads, each with a ball round it - so a ray tests only the triangles it can meet -
 * and where its quads begin, how many, the row, which cloth; how many patches each figure has. Shown: the hero's
 * clothes and the guard's (or null).
 */
export function csClothOut(sh0, sh1) {
  const pts = new Float32Array(CS_CLOTH_N * 4), patches = [], count = [0, 0];
  const put = (G, base, mat, fig) => {
    if (!G) return;
    for (let i = 0; i < G.n; i++) pts.set([G.p[i * 3], G.p[i * 3 + 1], G.p[i * 3 + 2], csOct(G.N[i * 3], G.N[i * 3 + 1], G.N[i * 3 + 2])], (base + i) * 4);
    const nq = G.wrap ? G.C : G.C - 1, per = mat > 8.5 ? 3 : 4;
    for (let r = 0; r < G.R - 1; r++) for (let c0 = 0; c0 < nq; c0 += per) {
      const idx = [];
      for (let c = c0; c <= c0 + per; c++) for (const rr of [r, r + 1]) idx.push(rr * G.C + (c % G.C));
      let cx = 0, cy = 0, cz = 0;
      for (const i of idx) { cx += G.p[i * 3]; cy += G.p[i * 3 + 1]; cz += G.p[i * 3 + 2]; }
      cx /= idx.length; cy /= idx.length; cz /= idx.length;
      let rad = 0;
      for (const i of idx) rad = Math.max(rad, Math.hypot(G.p[i * 3] - cx, G.p[i * 3 + 1] - cy, G.p[i * 3 + 2] - cz));
      patches.push([cx, cy, cz, rad + 0.01, base + r * G.C, c0, Math.min(per, nq - c0), G.C, r, G.R, mat, G.wrap ? 0 : mat > 8.5 ? 1 : 2]);
      count[fig]++;
    }
  };
  put(sh0.cape, 0, 9, 0);
  put(sh0.skirt, CS_CAPE_C * CS_CAPE_R, 3, 0);
  if (sh1) put(sh1.skirt, CS_CAPE_C * CS_CAPE_R + CS_SKIRT_C * CS_SKIRT_R, 3, 1);
  const P = new Float32Array(CS_PATCHES * 12);
  patches.forEach((v, i) => P.set(v, i * 12));
  return { pts, patches: P, n: [count[0], count[0], count[1], 0] };
}
export const CS_PATCHES = Math.ceil((CS_CAPE_C - 1) / 3) * (CS_CAPE_R - 1) + 2 * Math.ceil((CS_SKIRT_C - 1) / 4) * (CS_SKIRT_R - 1);

// the rooms, as a seed deals them: the floor that gives way over spikes, the gate falling shut, the guard
const CS_ROOMS = ['pit', 'gate', 'duel'];
export const CS_PIT0 = -0.7, CS_PIT1 = 0.7, CS_PITZ = 2.1;      // the floor that gives way: across the hall
const CS_TILE = 0.7;
export const CS_EXIT = 6.0;                                     // the hall's far end, where the gate is

/**
 * The cartoon castle, as the laserdisc games of 1983 played: not a game moved by the player but a film the player
 * keeps going, a room at a time - the hero walks into danger, the way out flashes, the stick is pushed or the sword
 * button struck at the right moment, and the film goes on to the next room. Here the music is the player: a room takes a
 * phrase, the danger on its second bar with the prompt on that bar's last beat, the move on the third bar's downbeat,
 * and the camera cuts between shots on the bars as an animated film's editor would. The hero is a fox knight whose
 * every movement is drawn from the side-view action games of 1989 - rotoscoped runs, a long jumper's leap, a fencer's
 * lunge - twelve drawings a second; each room is its own: the floor crumbling into a pit of spikes, the gate falling
 * shut, a lizard guard with a sword.
 */
export class CastleSim {
  constructor(seed, spb, meta) {
    this.seed = seed;
    this.grid = new MusicGrid(spb, meta);
    this.J = new Float32Array(2 * CS_JOINTS * 4);
    this.tiles = new Float32Array(12 * 4);
    const r = new Rng(seed, 'castle-rooms');
    this.order = r.shuffle([...CS_ROOMS]);
  }

  /** The room a phrase plays, and its own look. */
  room(n) { return { kind: this.order[n % this.order.length], look: Math.floor(n / this.order.length) % 2 }; }

  /** A figure in the hall: its root, the way it faces (+1 along the hall, -1 back), a drawing; into the joint array at slot. */
  place(slot, x, y, face, d, swing = 0, z = 0) {
    const J = csJoints(d, swing);
    // (seen from the hall's front: the figure's side toward the eye is its sword side)
    J.forEach((p, i) => this.J.set([x + p[2] * face, y + p[1], z - p[0] * face, 0], (slot * CS_JOINTS + i) * 4));
    return J;
  }

  /** Where everything is at t, and the drawing each figure is in (a drawing changes twelve times a second). */
  stateAt(t) {
    const bar = this.grid.barSec, spb = this.grid.spb;
    const m = spb < 0.38 ? 2 : 1;                         // (a fast tune gives a room two phrases' time)
    const unit = spb * m, len = 16 * unit;
    const n = Math.floor(t / len + 1e-9);
    const R = this.room(n);
    // (the drawings are chosen as they come, twelve a second, through the run's frames; everything else is smooth)
    const tq = t;
    const u = (t - n * len) / unit, uq = u;
    const runSpeed = 16 * CS_K * 12 / 3;                   // the run's own pace: 16 pixels a stride's three drawings
    const runFrame = (tt) => CS_DRAW.run[((Math.floor(tt * 12 + 1e-6) % 8) + 8) % 8];
    let hx = 0, hy = 0, face = 1, D = CS_DRAW.stand, F = CS_FACE.stand, sword = null;
    let gx = 99, gy = 0, gz = 0, spark = [0, 0, 0, 0], gface = -1, GD = CS_DRAW.guard, GF = CS_FACE.guard, gSword = null, guard = 0;
    let prompt = 0, stick = 0, stickDir = [1, 0], button = 0, crack = 0, open = 0, gate = 1, slam = 99, flash = 0;
    const tiles = [];
    // ---- the rooms
    if (R.kind === 'pit') {
      const xStop = CS_PIT0 - 0.55, xLand = CS_PIT1 + 0.75;
      // in at a run; the floor ahead rattles, cracks, gives way; the take; the leap on the downbeat over the spikes
      if (uq < 5) { hx = xStop - runSpeed * (5 - uq) * unit; D = runFrame(tq); F = CS_FACE.run; }
      else if (uq < 5.4) { hx = xStop; D = CS_DRAW.crouch; F = CS_FACE.crouch; }
      else if (uq < 6.4) { hx = xStop; D = CS_DRAW.take; F = CS_FACE.take; }
      else if (uq < 6.8) { hx = xStop; D = CS_DRAW.stoop; F = CS_FACE.stoop; }
      else if (uq < 7.2) { hx = xStop; D = CS_DRAW.bend; F = CS_FACE.bend; }
      else if (uq < 7.6) { hx = xStop; D = CS_DRAW.gather; F = CS_FACE.gather; }
      else if (uq < 8) { hx = xStop; D = CS_DRAW.swing; F = CS_FACE.swing; }
      else if (uq < 9) {
        const w = uq - 8;
        hx = xStop + (xLand - xStop) * w; hy = 0.75 * 4 * w * (1 - w);
        const seq = ['takeoff', 'rise', 'split', 'split', 'reach'];
        D = CS_DRAW[seq[Math.min(4, Math.floor(w * 5))]]; F = CS_FACE[seq[Math.min(4, Math.floor(w * 5))]];
      } else if (uq < 9.4) { hx = xLand; D = CS_DRAW.strike; F = CS_FACE.strike; }
      else if (uq < 10) { hx = xLand; D = CS_DRAW.crouch; F = CS_FACE.crouch; }
      else { hx = xLand + runSpeed * (uq - 10) * unit; D = runFrame(tq); F = CS_FACE.run; }
      crack = Math.min(1, Math.max(0, (u - 4.3) / 0.7));
      open = u >= 4.5 ? 1 : 0;
      prompt = u >= 7 && u < 8.2 ? 1 : 0; stick = u >= 8 && u < 8.6 ? 1 : 0;
      // the tiles: rattling from a beat before, then falling one after another, the nearest last
      let k = 0;
      for (let ix = 0; ix < 2; ix++) for (let iz = 0; iz < 6; iz++) {
        const h = ((ix * 7 + iz * 13 + n * 5) % 11) / 11;
        const tf = 5.0 + (1 - ix) * 0.25 + h * 0.6 + Math.abs(iz - 2.5) * 0.05;
        const x = CS_PIT0 + (ix + 0.5) * CS_TILE, z = -CS_PITZ + (iz + 0.5) * CS_TILE;
        let y = 0, ang = 0;
        if (u >= 4.5 && u < tf) y = 0.025 * Math.sin(t * 70 + k * 1.7) * (u > 4.8 ? 1 : 0.5);
        if (u >= tf) { const s = (u - tf) * unit; y = -4.9 * s * s; ang = (h - 0.5) * 6 * s; }
        if (u >= 4.5 && y > -3.2) tiles.push([x, y, z, ang + (k % 2 ? 100 : 0)]);
        k++;
      }
    } else if (R.kind === 'gate') {
      // in at a run; the gate at the far end starts down; the take; on the downbeat a sprint, and a dive under it as it
      // slams on the next bar's downbeat
      const xStop = 0.6, xGate = CS_EXIT;
      if (uq < 5) { hx = xStop - runSpeed * (5 - uq) * unit; D = runFrame(tq); F = CS_FACE.run; }
      else if (uq < 5.4) { hx = xStop; D = CS_DRAW.crouch; F = CS_FACE.crouch; }
      else if (uq < 7.5) { hx = xStop; D = CS_DRAW.take; F = CS_FACE.take; }
      else if (uq < 8) { hx = xStop; D = CS_DRAW.set; F = CS_FACE.set; }
      else if (uq < 11) {
        const w = (uq - 8) / 3;
        hx = xStop + (xGate - 0.9 - xStop) * Math.min(1, w * 1.25);
        D = runFrame(tq * 1.5); F = CS_FACE.lunge;
        if (w > 0.8) { hx = xGate - 0.9 + (w - 0.8) * 5 * 2.2; D = CS_DRAW.dive; F = CS_FACE.dive; }
      } else { hx = xGate + 1.3 + (uq - 11) * 0.8; D = CS_DRAW.crouch; F = CS_FACE.stand; }
      gate = u < 4 ? 1 : Math.max(0, 1 - (u - 4) / 8) * (u < 12 ? 1 : 0);
      slam = u >= 12 ? (u - 12) * unit : 99;
      prompt = u >= 7 && u < 8.2 ? 1 : 0; stick = u >= 8 && u < 8.6 ? 1 : 0;
    } else {
      // the duel, staged to read as the side-view fights did: the guard comes in through the far door while its gate is
      // up; both on guard; then the exchanges, each on a beat with the blades ringing and sparks flying - the guard cuts
      // and the hero parries, giving ground; the hero steps in and cuts and the guard parries, giving ground; the guard
      // cuts again and the hero parries; the prompt; the hero's riposte on the downbeat runs him through; the guard
      // reels, drops his sword, sinks to his knees and falls back, off the hero's way; the hero puts up his sword and goes
      const xStop = -1.4, gStop = xStop + 1.9;
      const ease = (a, b) => Math.max(0, Math.min(1, (uq - a) / (b - a)));
      guard = 1;
      if (uq < 3) { hx = xStop - runSpeed * (3 - uq) * unit; D = runFrame(tq); F = CS_FACE.run; }
      else if (uq < 3.4) { hx = xStop; D = CS_DRAW.draw; F = CS_FACE.draw; }
      else if (uq < 3.7) { hx = xStop; D = CS_DRAW.guard; F = CS_FACE.guard; }
      else if (uq < 4.4) { hx = xStop - 0.12 * ease(3.8, 4.1); D = CS_DRAW.block; F = CS_FACE.block; }
      else if (uq < 4.7) { hx = xStop - 0.12; D = CS_DRAW.windup; F = CS_FACE.windup; }
      else if (uq < 5.3) { hx = xStop - 0.12 + 0.37 * ease(4.7, 5); D = CS_DRAW.cut; F = CS_FACE.cut; }
      else if (uq < 6.6) { hx = xStop + 0.25 - 0.13 * ease(5.3, 5.9); D = CS_DRAW.guard; F = CS_FACE.guard; }
      else if (uq < 7.4) { hx = xStop + 0.12; D = CS_DRAW.block; F = CS_FACE.block; }
      else if (uq < 8) { hx = xStop + 0.12; D = CS_DRAW.windup; F = CS_FACE.windup; }
      else if (uq < 9) { hx = xStop + 0.12 + 0.3 * Math.min(1, (uq - 8) * 4); D = CS_DRAW.lunge; F = CS_FACE.lunge; }
      else if (uq < 10.5) { hx = xStop + 0.42; D = CS_DRAW.guard; F = CS_FACE.guard; }
      else if (uq < 11.3) { hx = xStop + 0.42; D = CS_DRAW.stand; F = CS_FACE.stand; }
      else { hx = xStop + 0.42 + runSpeed * (uq - 11.3) * unit; D = runFrame(tq); F = CS_FACE.run; }
      sword = D.sword || null;
      // the guard
      if (uq < 0.4) { gx = CS_EXIT + 1.2; GD = CS_DRAW.stand; }
      else if (uq < 3.2) { gx = CS_EXIT + 1.2 - (CS_EXIT + 1.2 - gStop) * (uq - 0.4) / 2.8; GD = runFrame(tq * 0.75); GF = [0.8, 0.6, 0, 0.2]; }
      else if (uq < 3.4) { gx = gStop; GD = CS_DRAW.guard; }
      // (the first exchange: his cut, parried)
      else if (uq < 3.7) { gx = gStop; GD = CS_DRAW.windup; GF = [1, 0.9, 0, 0.6]; }
      else if (uq < 4.3) { gx = gStop - 0.25 * ease(3.7, 4); GD = CS_DRAW.cut; GF = CS_FACE.cut; }
      else if (uq < 4.7) { gx = gStop - 0.25 + 0.25 * ease(4.3, 4.6); GD = CS_DRAW.guard; }
      // (the second: the hero's cut, parried, the guard giving ground)
      else if (uq < 5.4) { gx = gStop + 0.12 * ease(4.8, 5.1); GD = CS_DRAW.block; GF = CS_FACE.block; }
      else if (uq < 6.2) { gx = gStop + 0.12 - 0.12 * ease(5.4, 6); GD = CS_DRAW.guard; }
      else if (uq < 6.7) { gx = gStop; GD = CS_DRAW.windup; GF = [1, 0.9, 0, 0.6]; }
      else if (uq < 7.3) { gx = gStop - 0.25 * Math.min(1, (uq - 6.7) * 3); GD = CS_DRAW.cut; GF = CS_FACE.cut; }
      else if (uq < 8.2) { gx = gStop - 0.25 + 0.25 * Math.min(1, (uq - 7.3) * 2); GD = CS_DRAW.guard; }
      else if (uq < 8.6) { gx = gStop; GD = CS_DRAW.struck; GF = CS_FACE.struck; }
      else if (uq < 9.3) { gx = gStop + 0.3 * (uq - 8.6) / 0.7; GD = CS_DRAW.reel; GF = CS_FACE.reel; }
      else if (uq < 10.2) { gx = gStop + 0.3; GD = CS_DRAW.kneel; GF = CS_FACE.kneel; }
      else { gx = gStop + 0.35; GD = CS_DRAW.down; GF = CS_FACE.down; }
      gz = 0.75 * Math.max(0, Math.min(1, (uq - 8.6) / 1.6));
      gSword = uq < 8.25 ? GD.sword || [0.8, 0.6] : null;
      prompt = u >= 7.3 && u < 8.2 ? 2 : 0; button = u >= 8 && u < 8.5 ? 1 : 0;
      flash = u >= 8.25 && u < 8.6 ? 1 - (u - 8.25) / 0.35 : 0;
      // where the blades ring and where the riposte goes home: sparks
      if (u >= 4 && u < 4.6) spark = [hx + 0.42, 1.12, 0, 1 - (u - 4) / 0.6];
      else if (u >= 5 && u < 5.6) spark = [gx - 0.42, 1.12, 0, 1 - (u - 5) / 0.6];
      else if (u >= 7 && u < 7.6) spark = [hx + 0.42, 1.12, 0, 1 - (u - 7) / 0.6];
      else if (u >= 8.25 && u < 8.9) spark = [gStop - 0.1, 0.95, 0, 1 - (u - 8.25) / 0.65];
      gate = 1;
    }
    // where each looks: the danger, the edge he makes for, his foe; nothing (ahead) otherwise
    let look0 = null, look1 = null;
    if (R.kind === 'pit') {
      if (u >= 4.3 && u < 5.4) look0 = [0, 0, 0];
      else if (u >= 5.4 && u < 7) look0 = [0, -0.7, 0];
      else if (u >= 7 && u < 9) look0 = [CS_PIT1 + 0.8, 0, 0];
    } else if (R.kind === 'gate') {
      if (u >= 5 && u < 10.6) look0 = [CS_EXIT, 1.1, 0];
      else if (u >= 11.4 && u < 13) look0 = [CS_EXIT - 1, 0.6, 0];
    } else {
      if (u >= 2 && u < 11.3) look0 = [gx, (u >= 9.3 ? 0.3 : 1.0) + gy, gz];
      if (u < 9.3) look1 = [hx, 1.0 + hy, 0];
    }
    // the gate at the far end opens for him as he nears it (the gate room's falls shut instead)
    if (R.kind !== 'gate') gate = Math.min(1, Math.max(0, (hx - (CS_EXIT - 3.2)) / 1.2)) || (guard ? Math.max(0, Math.min(1, (5.4 - u) / 0.6)) : 0);
    return { bar, spb, m, unit, len, n, R, u, runSpeed, hx, hy, face, D, F, sword, gx, gy, gface, GD, GF, gSword, guard, look0, look1, gz, spark,
      prompt, stick, stickDir, button, crack, open, gate, slam, flash, tiles };
  }

  /** A drawing as numbers: the hip; the head, the shoulders, the right hand, the left, the feet; the sword; the face. */
  static chan(D, F) {
    const hR = D.swap ? D.hB : D.hF, hL = D.swap ? D.hF : D.hB;
    return [D.hip, ...D.head, ...D.sh, ...hR, ...hL, ...D.fL, ...D.fR, ...(D.sword || [0.8, 0.6]), ...F];
  }

  /**
   * The figure's drawing at t, in between: the drawings are key frames twelve a second, and between them every number
   * of the pose follows a cubic through the four nearest - a Catmull-Rom spline, the Kochanek-Bartels spline with no
   * tension, continuity or bias (1984) - so the motion is continuous and its speed too, a held pose easing in and out
   * of itself. The knees and elbows are solved afterwards from the ends, so no limb changes length on the way.
   */
  between(t, which) {
    const t0 = Math.floor(t * 12 + 1e-6) / 12, w = (t - t0) * 12;
    const S = [-1, 0, 1, 2].map((k) => this.stateAt(Math.max(0, t0 + k / 12)));
    const c = S.map((q) => (which ? CastleSim.chan(q.GD, q.GF) : CastleSim.chan(q.D, q.F)));
    const w2 = w * w, w3 = w2 * w;
    const v = c[1].map((_, i) => 0.5 * (2 * c[1][i] + (c[2][i] - c[0][i]) * w + (2 * c[0][i] - 5 * c[1][i] + 4 * c[2][i] - c[3][i]) * w2 + (3 * c[1][i] - c[0][i] - 3 * c[2][i] + c[3][i]) * w3));
    const near = w < 0.5 ? S[1] : S[2];
    const drawn = which ? near.gSword : near.sword;
    const sl = Math.hypot(v[13], v[14]) || 1;
    return {
      D: { hip: v[0], head: [v[1], v[2]], sh: [v[3], v[4]], hF: [v[5], v[6]], hB: [v[7], v[8]], fL: [v[9], v[10]], fR: [v[11], v[12]], sword: drawn ? [v[13] / sl, v[14] / sl] : null },
      F: v.slice(15, 19),
    };
  }

  /** A figure's joints in the room at t, and the way it faces. */
  figureWorld(t, slot) {
    const st = this.stateAt(t), D = this.between(t, slot).D;
    const x = slot ? st.gx : st.hx, y = slot ? st.gy : st.hy, z = slot ? st.gz : 0, face = slot ? st.gface : st.face;
    const J = csJoints(D, 0).map((p) => [x + p[2] * face, y + p[1], z - p[0] * face]);
    // (and the scabbard at the far hip while the sword is in it, as uniforms() hangs it - the guard's is gone once his
    // sword is knocked away)
    const hip = J[12], dropped = slot === 1 && st.R.kind === 'duel' && st.u >= 8.25;
    const scab = D.sword || dropped ? null : [[hip[0] + 0.03 * face, hip[1] + 0.02, hip[2]], [hip[0] - 0.16 * face, hip[1] - 0.3, hip[2]]];
    return { J, f: [face, 0], scab };
  }

  /**
   * The figures' clothes, as cloth (see csDressStep): settled at the start of each room, stepped from there to the
   * time asked for, so going back replays them the same; as drawn at that moment (csDressShown).
   */
  dress(t, n, len) {
    const start = n * len, duel = this.room(n).kind === 'duel';
    // (live, the clock follows the audio and can step back a few milliseconds: the cloth is then shown as it is, not
    // simulated again from the room's start, which cost up to two seconds a time; going back further starts it over)
    const S0 = this.dressState;
    if (S0 && S0.n === n && S0.t > t + 1e-9 && S0.t - t < 0.25) return S0.fig.map((f, s) => f && csDressShown(f, this.figureWorld(S0.t, s), 0));
    if (!this.dressState || this.dressState.n !== n || this.dressState.t > t + 1e-9) {
      // (the next room's clothes, hung ahead in the last second of this one, are the same as hung now)
      const P = this.preHang;
      if (P && P.n === n && S0 && S0.n === n - 1 && P.fig[0] && (!P.duel || P.fig[1])) { P.fig.forEach((f) => f && csDressSettle(f, CS_SETTLE)); this.dressState = { n, t: start, fig: P.fig }; }
      else this.dressState = { n, t: start, fig: [csDressHang(this.figureWorld(start, 0), 0), duel ? csDressHang(this.figureWorld(start, 1), 1) : null] };
      this.preHang = null;
    }
    const S = this.dressState, dt = 1 / 120;
    // live: the clothes stepped right up to the frame, in as many even steps of about a 120th of a second as reach it -
    // no copy stepped on to it each frame, a third of the work - and never more than four: a frame that came late would
    // otherwise ask for more steps, come later still, and the picture fall to a few frames a second; they skip ahead
    // instead and catch up with the body. A file is drawn on the 120ths and never falls behind: every step is taken.
    if (this.live && t - S.t > 1e-4) {
      if (t - S.t > 4 * dt) S.t = t - 4 * dt;
      const k = Math.max(1, Math.round((t - S.t) / dt)), h = (t - S.t) / k;
      for (let i = 0; i < k; i++) {
        S.t = i === k - 1 ? t : S.t + h;
        for (let s = 0; s < 2; s++) if (S.fig[s]) csDressStep(S.fig[s], S.fig[s].F, this.figureWorld(S.t, s), h);
      }
    }
    while (S.t + dt <= t + 1e-9) {
      S.t += dt;
      for (let s = 0; s < 2; s++) if (S.fig[s]) csDressStep(S.fig[s], S.fig[s].F, this.figureWorld(S.t, s), dt);
    }
    // live, a few steps a frame of the next room's hang, through this room's last second
    const next = (n + 1) * len;   // (as the next room will reckon its start, to the last bit)
    if (t > next - 1 && t < next) {
      // (one figure begun a frame, then two steps a frame each: the hang's sixty steps in under a second)
      if (!this.preHang || this.preHang.n !== n + 1) this.preHang = { n: n + 1, fig: [null, null], duel: this.room(n + 1).kind === 'duel' };
      const P = this.preHang;
      if (!P.fig[0]) P.fig[0] = csDressHang(this.figureWorld(next, 0), 0, 0);
      else if (P.duel && !P.fig[1]) P.fig[1] = csDressHang(this.figureWorld(next, 1), 1, 0);
      else P.fig.forEach((f) => f && csDressSettle(f, 2));
    }
    return S.fig.map((f, s) => f && csDressShown(f, this.figureWorld(t, s), t - S.t));
  }

  /**
   * Where a figure's head turns at t: toward what it looks at - the floor giving way, the pit, the far edge, the gate,
   * its foe - turned no further than a neck turns, the body's way when it looks at nothing; eased over a fifth of a
   * second as a head turns. Its forward and up, in the room.
   */
  headAt(t, slot) {
    let yaw = 0, pitch = 0, wsum = 0;
    for (let k = 0; k < 4; k++) {
      const tk = Math.max(0, t - k * 0.06), st = this.stateAt(tk), w = 4 - k;
      const face = slot ? st.gface : st.face, x = slot ? st.gx : st.hx, y = (slot ? st.gy : st.hy) + 1.0;
      const target = slot ? st.look1 : st.look0;
      let yw = 0, pt = -0.08;
      if (target) {
        const dx = (target[0] - x) * face, dz = -(target[2] - (slot ? st.gz : 0)) * face, dy = target[1] - y;
        yw = Math.max(-1.2, Math.min(1.2, Math.atan2(dz, Math.max(dx, -0.2))));
        pt = Math.max(-0.75, Math.min(0.45, Math.atan2(dy, Math.hypot(dx, dz))));
      }
      yaw += yw * w; pitch += pt * w; wsum += w;
    }
    yaw /= wsum; pitch /= wsum;
    const st = this.stateAt(t), face = slot ? st.gface : st.face;
    // (in the figure's frame: ahead is +z, its right +x; into the room: x' = z*face, z' = -x*face)
    const h = [Math.sin(yaw), 0, Math.cos(yaw)];
    const fwd = [h[0] * Math.cos(pitch), Math.sin(pitch), h[2] * Math.cos(pitch)];
    const up = [-h[0] * Math.sin(pitch), Math.cos(pitch), -h[2] * Math.sin(pitch)];
    const w = (v) => [v[2] * face, v[1], -v[0] * face];
    return [...w(fwd), 0, ...w(up), 0];
  }

  uniforms(t) {
    const st = this.stateAt(t);
    let { bar, spb, unit, n, R, u, hx, hy, face, D, F, sword, gx, gy, gface, GD, GF, gSword, guard,
      prompt, stick, stickDir, button, crack, open, gate, slam, flash, tiles } = st;
    // the poses in between their drawings
    const hb = this.between(t, 0);
    D = hb.D; F = hb.F; sword = D.sword;
    if (guard) { const gb = this.between(t, 1); GD = gb.D; GF = gb.F; gSword = GD.sword; }
    // ---- the figures into the joint array
    this.place(0, hx, hy, face, D, Math.sin(t * 9) * 0.5);
    this.place(1, gx, gy, gface, GD, Math.sin(t * 7) * 0.4, st.gz);
    const Jw = (slot, i) => [this.J[(slot * CS_JOINTS + i) * 4], this.J[(slot * CS_JOINTS + i) * 4 + 1], this.J[(slot * CS_JOINTS + i) * 4 + 2]];
    const blade = (slot, dir) => {
      const hand = Jw(slot, 5);
      const f = slot === 0 ? face : gface;
      if (!dir) {
        // in its scabbard at the far hip, pointing back and down
        const hip = Jw(slot, 12);
        return [hip[0] + 0.03 * f, hip[1] + 0.02, hip[2], hip[0] - 0.16 * f, hip[1] - 0.3, hip[2]];
      }
      return [...hand, hand[0] + dir[0] * 0.72 * f, hand[1] + dir[1] * 0.72, hand[2]];
    };
    const b0 = blade(0, sword);
    let b1 = blade(1, gSword), b1drawn = guard ? 1 : 0;
    if (R.kind === 'duel' && u >= 8.25) {
      const s = (u - 8.25) * unit, fall = Math.min(s, 0.4);
      const y = Math.max(0.03, 0.8 - 4.9 * fall * fall), a = 0.6 - (0.6 + 0.05) * Math.min(1, s / 0.4);
      const cx = st.gx - 0.55 - 0.25 * Math.min(s, 0.4), cz = st.gz * 0.5;
      b1 = [cx - 0.38 * Math.cos(a), y + 0.38 * Math.sin(a) * (y > 0.03 ? 1 : 0), cz, cx + 0.38 * Math.cos(a), y - 0.38 * Math.sin(a) * (y > 0.03 ? 1 : 0), cz];
      b1drawn = 1;
    }
    // ---- the shots, cut on the bars
    const s = Math.floor(u / 4), lerp = (a, c, w) => a.map((v, i) => v + (c[i] - v) * w);
    let eye, look, focal, roll = 0;
    // (the duel's first exchange comes in the first bar: the two of them in profile, as the fight is shot)
    if (s === 0 && R.kind === 'duel' && u >= 2.6) { const cx = (Math.max(hx, -2) + Math.min(gx, 2.5)) / 2; eye = [cx, 1.15, -3.5]; look = [cx, 0.95, 0]; focal = 1.3; }
    else if (s === 0) { eye = [hx - 1.7, 0.55, -3.1]; look = [hx + 0.7, 1.15, 0.8]; focal = 1.3; }
    else if (s === 1 && u < 6) {
      if (R.kind === 'pit') { eye = [CS_PIT0 - 1.8, 2.6, -2.4]; look = [0, -0.3, 0.2]; focal = 1.45; roll = 0.06; }
      else if (R.kind === 'gate') { eye = [CS_EXIT - 2.4, 0.5, -1.5]; look = [CS_EXIT, 2.4, 0.0]; focal = 1.45; roll = -0.05; }
      // (the duel: the second exchange closer, from a three-quarter angle, both blades in view)
      else { const cx = (hx + gx) / 2; eye = [cx - 1.0, 1.2, -2.3]; look = [cx + 0.1, 1.0, 0]; focal = 1.45; }
    } else if (s === 1 && R.kind === 'duel') {
      const cx = (Math.max(hx, -2) + Math.min(gx, 2.5)) / 2;
      eye = [cx, 1.15, -3.5]; look = [cx, 0.95, 0]; focal = 1.3 + 0.15 * (u - 6) / 2;
    } else if (s === 1) {
      // the close-up keeps his face: it follows his head down as he winds up
      const w = (u - 6) / 2, hd = Jw(0, 2), dx = hd[0] - hx, dy = hd[1] - 1.05;
      eye = lerp([hx + 1.5, 1.2, -1.1], [hx + 1.15, 1.12, -0.75], w).map((v, i) => v + [dx * 0.85, dy * 0.75, 0][i]);
      look = [hx + dx * 0.9, 0.98 + dy * 0.9, 0]; focal = 1.7 + 0.5 * w - 0.25 * Math.min(1, Math.abs(dy) * 2);
    }
    else if (s === 2) {
      if (R.kind === 'gate') { const cx = Math.min(hx, CS_EXIT - 1.2); eye = [cx - 2.6, 0.7, -2.4]; look = [cx + 1.0, 0.7, 0.3]; focal = 1.25; roll = -0.06; }
      else if (R.kind === 'duel') { const cx = (Math.max(hx, -2) + Math.min(gx + 0.3, 2.5)) / 2; eye = [cx, 1.25, -3.8]; look = [cx, 0.7, 0.3]; focal = 1.25; }
      else { const w = (u - 8) / 4; eye = lerp([-0.6, 3.0, -3.2], [1.4, 2.8, -2.8], w); look = [hx * 0.7 + 0.3, 0.5 + hy * 0.8, 0.3]; focal = 1.25; roll = -0.1; }
    } else {
      if (R.kind === 'gate') { eye = [CS_EXIT - 3.5, 1.0, -2.0]; look = [CS_EXIT, 1.2, 0]; focal = 1.4; }
      else { eye = [Math.min(hx, CS_EXIT - 0.5) - 2.3, 1.1, -0.3]; look = [CS_EXIT + 1.5, 1.0, 0.0]; focal = 1.4; }
    }
    const Fv = norm3([look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]]);
    let Rv = norm3([-Fv[2], 0, Fv[0]]);
    let Uv = [Rv[1] * Fv[2] - Rv[2] * Fv[1], Rv[2] * Fv[0] - Rv[0] * Fv[2], Rv[0] * Fv[1] - Rv[1] * Fv[0]];
    const cr = Math.cos(roll), sr = Math.sin(roll);
    [Rv, Uv] = [Rv.map((v, i) => v * cr + Uv[i] * sr), Uv.map((v, i) => Uv[i] * cr - Rv[i] * sr)];
    // the clothes: cape, tails and skirts, as cloth
    const shown = this.shown = this.dress(t, n, st.len);
    const cloth = csClothOut(shown[0], guard ? shown[1] : null);
    const tails = new Float32Array(2 * CS_TAIL_N * 4);
    for (let s = 0; s < 2; s++) if (shown[s] && (s === 0 || guard)) shown[s].tail.forEach((p, i) => tails.set([p[0], p[1], p[2], CS_TAIL_R[s][i]], (s * CS_TAIL_N + i) * 4));
    // the slam and the strike shake the eye
    const shake = Math.exp(-Math.max(0, slam) * 8) * (slam < 99 ? 1 : 0) + flash * 0.5;
    this.tiles.fill(0);
    tiles.slice(0, 12).forEach((q, i) => this.tiles.set(q, i * 4));
    const bound = (slot) => {
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < CS_JOINTS; i++) { const p = Jw(slot, i); cx += p[0]; cy += p[1]; cz += p[2]; }
      return [cx / CS_JOINTS, cy / CS_JOINTS, cz / CS_JOINTS];
    };
    return {
      uCsCam: { v: [eye[0], eye[1], eye[2], focal, Fv[0], Fv[1], Fv[2], shake, Rv[0], Rv[1], Rv[2], 0, Uv[0], Uv[1], Uv[2], 0], kind: '4fv' },
      uCsJ: { v: this.J, kind: '4fv' },
      uCsBlade: { v: [...b0, sword ? 1 : 0, 0, ...b1, b1drawn, 0], kind: '4fv' },
      uCsSpark: { v: st.spark, kind: '4f' },
      uCsBound: { v: [...bound(0), 1.1, ...bound(1), guard ? 1.1 : 0], kind: '4fv' },
      uCsRoom: { v: [R.look, CS_ROOMS.indexOf(R.kind), prompt, Math.floor(t * 12)], kind: '4f' },
      uCsPit: { v: [R.kind === 'pit' ? crack : 0, R.kind === 'pit' ? open : 0, gate, flash], kind: '4f' },
      uCsTile: { v: this.tiles, kind: '4fv' },
      uCsHud: { v: [stickDir[0], stickDir[1], stick, button], kind: '4f' },
      uCsFace: { v: [...F, ...GF], kind: '4fv' },
      uCsN: { v: [tiles.length, guard ? 2 : 1, 0, 0], kind: '4f' },
      uCsTail: { v: tails, kind: '4fv' },
      uCsCloth: { v: cloth.pts, kind: '4fv' },
      uCsPatch: { v: cloth.patches, kind: '4fv' },
      uCsClothN: { v: cloth.n, kind: '4f' },
      uCsHead: { v: [...this.headAt(t, 0), ...(guard ? this.headAt(t, 1) : [1, 0, 0, 0, 0, 1, 0, 0])], kind: '4fv' },
    };
  }
}

export const SIMS = { castle: CastleSim, karts: KartSim, scanner: ScannerSim, skyrush: SkyrushSim, artillery: ArtillerySim, skatepark: SkateSim, football: FootballSim, tanks: TankSim, tube: TubeSim, crossing: CrossingSim, coderain: CoderainSim, animeop: AnimeopSim, timecar: TimecarSim, moonbike: MoonbikeSim, maze3d: Maze3dSim, echolines: EcholinesSim, ansi: AnsiSim, cascade: CascadeSim, cracktro: CracktroSim, rubber: RubberSim, chessfloor: ChessfloorSim, bobs: BobsSim, pyramid: PyramidSim, pipes: PipesSim, maze: MazeSim, snake: SnakeSim, rocks: RocksSim, starfighter: StarSim, paddles: PaddlesSim, invaders: InvadersSim, bricks: BricksSim, lightcycles: LightcyclesSim };
