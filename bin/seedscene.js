#!/usr/bin/env node
// SEEDSCENE command line.
//
//   seedscene live                           play it in a browser, right now
//   seedscene render --seed x --era amiga    write an mp4
//   seedscene journey --seed x               every era, oldest first, as an mp4
//   seedscene autoplay --seed x              an endless mix by era, as long an mp4 as you like
//   seedscene styles                         list the scenes, eras and music

import { spawn } from 'node:child_process';
import path from 'node:path';
import { STYLE_NAMES, STYLE_INFO } from '../src/styles/index.js';
import { composeScore, MUSIC_PRESETS, MUSIC_NAMES } from '../src/core/music.js';
import { byEra } from '../src/core/catalogue.js';
import { DISPLAYS, DISPLAY_NAMES } from '../src/core/displays.js';
import { BOARDS, BOARD_NAMES } from '../src/core/boards.js';
import { ERAS, ERA_NAMES, erasForScene } from '../src/core/eras.js';
import { resolveChoices, checkChoice } from '../src/core/choose.js';
import { composeJourney, composeAutoplay, AUTOPLAY_PART } from '../src/core/journey.js';
import { startServer } from '../tools/server.js';
import { cleanGreets, banner, TAGLINE, VERSION } from '../src/brand.js';

const RESOLUTIONS = {
  '240p': [426, 240], '360p': [640, 360], '480p': [854, 480],
  '576p': [1024, 576], '720p': [1280, 720], '1080p': [1920, 1080],
};

const C = process.stdout.isTTY
  ? { dim: '\x1b[2m', b: '\x1b[1m', cy: '\x1b[36m', gr: '\x1b[32m', ye: '\x1b[33m', rd: '\x1b[31m', r: '\x1b[0m' }
  : { dim: '', b: '', cy: '', gr: '', ye: '', rd: '', r: '' };

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      let key, val;
      if (eq > 0) { key = a.slice(2, eq); val = a.slice(eq + 1); }
      else {
        key = a.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) { val = next; i++; }
        else val = true;
      }
      if (key.startsWith('no-') && val === true) { out[key.slice(3)] = false; }
      else out[key] = val;
    } else out._.push(a);
  }
  return out;
}

function resolveResolution(args) {
  let w, h;
  const res = args.res || args.resolution || args.r;
  if (res && res !== true) {
    const key = String(res).toLowerCase();
    if (RESOLUTIONS[key]) [w, h] = RESOLUTIONS[key];
    else {
      const m = key.match(/^(\d+)\s*[x:*]\s*(\d+)$/);
      if (!m) throw new Error(`Bad --res "${res}". Use WxH (854x480) or a preset: ${Object.keys(RESOLUTIONS).join(', ')}`);
      w = parseInt(m[1], 10); h = parseInt(m[2], 10);
    }
  }
  if (args.width) w = parseInt(args.width, 10);
  if (args.height) h = parseInt(args.height, 10);
  w = w || 854; h = h || 480;
  if (!(w > 15 && h > 15 && w <= 3840 && h <= 2160)) {
    throw new Error(`Resolution ${w}x${h} is out of range (16x16 .. 3840x2160).`);
  }
  // h.264 with yuv420p needs even dimensions
  if (w % 2 || h % 2) {
    const nw = w - (w % 2), nh = h - (h % 2);
    console.warn(`${C.ye}note${C.r}  ${w}x${h} rounded to ${nw}x${nh} (h.264 needs even sides)`);
    w = nw; h = nh;
  }
  return { width: w, height: h };
}

function num(v, dflt, name, min, max) {
  if (v === undefined || v === true) return dflt;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`--${name} must be a number between ${min} and ${max} (got "${v}").`);
  }
  return n;
}

function showScenes() {
  console.log(`\n${C.b}eras${C.r}  ${C.dim}(--era, keys 1-${ERA_NAMES.length} or E live; each era suggests its scenes and music)${C.r}\n`);
  for (const [i, name] of ERA_NAMES.entries()) {
    const e = ERAS[name];
    console.log(`  ${C.cy}${i + 1}${C.r} ${C.b}${name.padEnd(6)}${C.r}${e.label.padEnd(11)}${e.title.padEnd(44)}${C.dim}${e.blurb}${C.r}`);
  }
  console.log(`\n${C.b}scenes${C.r}  ${C.dim}(--scene, space or arrows live)${C.r}\n`);
  // (by the first era each belongs to, oldest first, then by name - not the order they were written in)
  for (const name of byEra(STYLE_NAMES, (e) => ERAS[e].scenes)) {
    console.log(`    ${C.b}${name.padEnd(12)}${C.r}${STYLE_INFO[name].padEnd(54)}${C.dim}${erasForScene(name).join(' ')}${C.r}`);
  }
  console.log(`\n${C.b}music styles${C.r}  ${C.dim}(--music, up/down live)${C.r}\n`);
  for (const name of byEra(MUSIC_NAMES, (e) => ERAS[e].music)) {
    const p = MUSIC_PRESETS[name];
    const home = ERA_NAMES.filter((e) => ERAS[e].music.includes(name));
    console.log(`    ${C.b}${name.padEnd(11)}${C.r}${p.label.padEnd(20)}${C.dim}${p.bpm[0]}-${p.bpm[1]} bpm, ${p.blurb}  [${home.join(' ')}]${C.r}`);
  }
  console.log('');
}

const HELP = `
${banner(!!C.b)}

  ${C.b}${TAGLINE}${C.r}  ${C.dim}v${VERSION} - generative demoscene, music and motion from a single seed${C.r}

${C.b}usage${C.r}
  seedscene live    [options]     run it live in a browser, in real time
  seedscene render  [options]     render a demo to an mp4 file
  seedscene journey [options]     render THE JOURNEY - every era, ${ERAS[ERA_NAMES[0]].year} to now - to mp4
  seedscene autoplay [options]    render AUTOPLAY - era after era, ${AUTOPLAY_PART}s a track - to mp4
  seedscene scenes                list the eras, scenes and music styles
  seedscene info    [options]     print what a seed composes, without rendering

${C.b}options${C.r}
  --seed <string>          anything; the same seed always gives the same demo   ${C.dim}(default: random)${C.r}
  --scene <name>           the scene, see 'seedscene scenes'                    ${C.dim}(default: chosen by the seed)${C.r}
  --era <name>             auto | ${ERA_NAMES.join(' | ')}   ${C.dim}(default: an era the scene belongs to)${C.r}
  --music <name>           auto | a music style                                 ${C.dim}(default: music of the era)${C.r}
  --res <WxH|preset>       854x480, or 240p 360p 480p 576p 720p 1080p           ${C.dim}(default: 480p)${C.r}
  --duration <seconds>     length                                ${C.dim}(default: 30 render, 180 live, ${16 * ERA_NAMES.length} journey, 600 autoplay)${C.r}
  --born <year>            autoplay: open in the era you were twelve in, and stay near it
  --display <name>         auto | ${DISPLAY_NAMES.join(' | ')}   ${C.dim}(default: each scene its own screen, or its era's)${C.r}
  --board <name>           auto | ${BOARD_NAMES.join(' | ')}   ${C.dim}(default: each scene its own sound board, or its era's)${C.r}
  --greets "A, B, C"       names to greet in the scroller (and the cracktro): up to eight
  --fps <n>                frames per second                                    ${C.dim}(default: 30)${C.r}
  --out <file.mp4>         output path                                          ${C.dim}(default: out/<seed>-<scene>.mp4)${C.r}
  --crf <n>                h.264 quality, lower is better                       ${C.dim}(default: 18)${C.r}
  --format <png|jpeg>      frame transfer format; jpeg is faster                ${C.dim}(default: png)${C.r}
  --gpu                    render frames on the GPU instead of SwiftShader      ${C.dim}(faster, machine-dependent)${C.r}
  --no-overlay             drop the title plate and the scroller
  --no-intro               live mode: skip the LOAD sequence, go straight to READY.
  --mute                   live mode: start with the sound off (V turns it on; the picture keeps the beat)
  --port <n>               port for live mode                                   ${C.dim}(default: 8787)${C.r}
  --no-open                do not launch a browser in live mode

${C.b}examples${C.r}
  seedscene live --seed aurora --era amiga
  seedscene render --seed aurora --scene vectorballs --era dos --music gabber
  seedscene journey --seed yourname --res 720p
  seedscene autoplay --seed yourname --duration 3600
  seedscene autoplay --seed yourname --born 1985
`;

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const cmd = args._[0] || 'help';

  if (cmd === 'help' || args.help || args.h) { console.log(HELP); return; }
  // (styles, --style and ?style= are the old names, from when a scene was called a style)
  if (cmd === 'scenes' || cmd === 'styles') { showScenes(); return; }

  const seed = args.seed !== undefined && args.seed !== true
    ? String(args.seed)
    : Math.random().toString(36).slice(2, 9);
  const req = {
    style: checkChoice('scene', args.scene !== undefined ? args.scene : args.style),
    era: checkChoice('era', args.era),
    music: checkChoice('music', args.music),
  };
  // DISPLAY: auto (each scene its own screen, or its era's), or one forced on everything
  const display = args.display === undefined || args.display === true ? 'auto' : String(args.display).toLowerCase();
  if (display !== 'auto' && !DISPLAYS[display]) throw new Error(`Unknown display "${args.display}". Available: auto, ${DISPLAY_NAMES.join(', ')}`);
  // SOUND BOARD: auto (each scene its own, or its era's), or one forced on all the music
  const board = args.board === undefined || args.board === true ? 'auto' : String(args.board).toLowerCase();
  if (board !== 'auto' && !BOARDS[board]) throw new Error(`Unknown sound board "${args.board}". Available: auto, ${BOARD_NAMES.join(', ')}`);
  const choice = resolveChoices({ seed, ...req });
  const { width, height } = resolveResolution(args);

  if (cmd === 'info') {
    const duration = num(args.duration, 30, 'duration', 1, 3600);
    const score = composeScore(seed, duration, choice.music);
    const counts = {};
    for (const e of score.events) counts[e.instr] = (counts[e.instr] || 0) + 1;
    const why = (k) => (req[k] === 'auto' ? `${C.dim} (chosen by the seed)${C.r}` : '');
    const era = ERAS[choice.era];
    console.log(`\n  ${C.b}${score.meta.title}${C.r}`);
    console.log(`  ${C.dim}seed${C.r}       ${seed}`);
    console.log(`  ${C.dim}era${C.r}        ${era.label} ${era.title} ${C.dim}- ${era.blurb}${C.r}${why('era')}`);
    console.log(`  ${C.dim}scene${C.r}      ${choice.style} ${C.dim}- ${STYLE_INFO[choice.style]}${C.r}${why('style')}`);
    console.log(`  ${C.dim}music${C.r}      ${score.meta.musicLabel} ${C.dim}- ${MUSIC_PRESETS[choice.music].blurb}${C.r}${why('music')}`);
    console.log(`  ${C.dim}tempo${C.r}      ${score.meta.bpm} bpm${score.meta.swing ? `, swing ${(score.meta.swing * 100).toFixed(0)}%` : ''}`);
    console.log(`  ${C.dim}key${C.r}        ${score.meta.rootName} ${score.meta.scaleLabel}`);
    console.log(`  ${C.dim}form${C.r}       ${score.meta.bars} bars over ${duration}s, chords ${score.meta.progression.map((d) => d + 1).join('-')}`);
    console.log(`  ${C.dim}notes${C.r}      ${score.events.length} ${C.dim}(${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')})${C.r}\n`);
    return;
  }

  if (cmd === 'render' || cmd === 'journey' || cmd === 'autoplay') {
    const programme = cmd === 'render' ? null : cmd;
    const journey = programme === 'journey';
    const minDur = journey ? 12 * ERA_NAMES.length : 0.5;
    const dflt = journey ? 16 * ERA_NAMES.length : programme ? 600 : 30;
    const duration = num(args.duration, dflt, 'duration', minDur, programme ? 36000 : 3600);
    const fps = num(args.fps, 30, 'fps', 1, 120);
    const crf = num(args.crf, 18, 'crf', 0, 51);
    const format = args.format === 'jpeg' ? 'jpeg' : 'png';
    const overlay = args.overlay !== false;
    const safe = String(seed).replace(/[^\w.-]/g, '_');
    // born in a year (autoplay only): the programme opens in the era the viewer was twelve in
    const bornIn = programme === 'autoplay' && args.born !== undefined && args.born !== true
      ? Math.round(num(args.born, 1985, 'born', 1900, 2100)) : null;
    const out = args.out && args.out !== true
      ? String(args.out)
      : path.join('out', programme ? `${safe}-${bornIn !== null ? `born${bornIn}` : programme}.mp4` : `${safe}-${choice.style}.mp4`);

    if (programme) {
      const j = journey ? composeJourney(seed, duration) : composeAutoplay(seed, duration, bornIn);
      const total = journey ? j.meta.duration : duration;
      console.log(`\n  ${C.b}${j.meta.title}${C.r}  ${C.cy}${seed}${C.r} / ${width}x${height} / ${total}s @ ${fps}fps`);
      // the plan only: listing a programme should not compose it
      const shown = Math.min(j.count, 24);
      for (let i = 0; i < shown; i++) {
        const p = j.plan(i);
        console.log(`  ${C.dim}${String(i + 1).padStart(3)}  ${ERAS[p.era].label.padEnd(11)} ${p.style.padEnd(12)} ${MUSIC_PRESETS[p.music].label}${C.r}`);
      }
      if (j.count > shown) console.log(`  ${C.dim}  ... and ${j.count - shown} more${C.r}`);
    } else {
      console.log(`\n  ${C.b}rendering${C.r}  ${C.cy}${seed}${C.r} / ${C.cy}${choice.style}${C.r} / ${ERAS[choice.era].label} / ${width}x${height} / ${duration}s @ ${fps}fps`);
    }
    const { renderVideo } = await import('../tools/render.js');
    const r = await renderVideo({
      seed, style: choice.style, era: choice.era, music: choice.music, programme, bornIn, display, board,
      greets: cleanGreets(args.greets === true ? '' : args.greets),
      width, height, duration, fps, out, crf, format, overlay,
      gpu: args.gpu === true || args.gpu === 'true',
    });
    const { statSync } = await import('node:fs');
    const mb = statSync(r.out).size / 1048576;
    console.log(`\n  ${C.gr}done${C.r}  ${r.out}  ${C.dim}${mb.toFixed(1)} MB, ${r.frames} frames, ${r.seconds.toFixed(1)}s${C.r}\n`);
    return;
  }

  if (cmd === 'live') {
    const duration = num(args.duration, 180, 'duration', 4, 3600);
    const port = num(args.port, 8787, 'port', 1, 65535);
    const overlay = args.overlay !== false;
    const { origin } = await startServer(port);
    const q = new URLSearchParams({
      seed: String(seed), scene: choice.style, era: req.era, music: req.music, display, board,
      width: String(width), height: String(height),
      duration: String(duration), overlay: overlay ? '1' : '0',
      intro: args.intro === false ? '0' : '1',
      sound: args.mute === true || args.sound === false ? '0' : '1',
    });
    const url = `${origin}/web/index.html?${q}`;
    console.log(`\n  ${C.b}live${C.r}  ${C.cy}${seed}${C.r} / ${C.cy}${choice.style}${C.r} / ${ERAS[choice.era].label} / ${width}x${height}`);
    console.log(`  ${url}`);
    console.log(`  ${C.dim}press any key at READY. to run - then H shows every key, O starts AUTOPLAY, T THE JOURNEY${C.r}`);
    console.log(`  ${C.dim}ctrl-c to stop the server${C.r}\n`);
    if (args.open !== false) {
      const cmdline = process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')]]
        : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
      spawn(cmdline[0], cmdline[1], { detached: true, stdio: 'ignore' }).unref();
    }
    return;
  }

  console.error(`${C.rd}unknown command${C.r} "${cmd}"`);
  console.log(HELP);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\n${C.rd}error${C.r}  ${err.message}\n`);
  process.exitCode = 1;
});
