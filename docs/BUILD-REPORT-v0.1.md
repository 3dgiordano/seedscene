# Build report — v0.1

> **Historical record.** v0.1 was the first version, released on 2026-10-27
> under the working name `music-gen-video` (command `mgv`). It became
> **SEEDSCENE** in v0.2 — see [BUILD-REPORT-v0.2.md](BUILD-REPORT-v0.2.md).

How the first version of this tool was built: what was asked, how the work
was ordered, what was checked, what broke along the way, and what it cost.

## At a glance

| | |
|---|---|
| Version | 0.1.0 (initial release, as `music-gen-video`) |
| Date | 2026-10-27 |
| Built by | Claude, in Claude Code, working from `requeriments.txt` |
| Model | Claude Opus 5.5 (`claude-opus-5-5`) |
| Reasoning effort | High |
| Claude Code | 2.1.309, running in the Claude desktop app (Code tab) |
| Platform | Windows 11 Pro, Node 22.18.0 |
| Agent plugins | the 10 self-monitoring plugins from [3dgiordano/agent-plugins](https://github.com/3dgiordano/agent-plugins), commits `9efdf2c` / `ec1aee9` / `52bdd19` / `3199f36` — versions and effects in [AGENT-PLUGINS.md](AGENT-PLUGINS.md) |
| Wall-clock time | ~36 minutes, first prompt to delivered clip |
| Model requests | 125 |
| Tool calls | 131 |
| Tokens | 24.78 M processed (130.7 K generated) |
| Cost | **$9.19** at Claude Opus 5.5 API list prices |
| Source | ~2,280 lines across 14 files, no runtime dependencies beyond puppeteer and ffmpeg-static |

## What was asked

The whole brief was `requeriments.txt`:

- given a **seed**, a **resolution** and a **style name**, generate a full
  video clip with motion and music, as an **mp4**;
- the **same seed must produce the same output**;
- a **command-line interface** and **a few built-in styles**;
- it must **run in real time and be experienced live**;
- low resolution is fine, but it should look like a **90s/2000s demoscene**
  production;
- ideally built entirely with **web technologies**, using Chrome's multimedia
  capabilities.

There is a tension in it: "an mp4 file" and "runs in real time, live" pull in
different directions, because capturing frames from a headless browser is not
a real-time process. It was resolved by building **one engine with two
front ends** rather than choosing between them (see *Architecture decisions*).

## How the work was ordered

Before writing any code, the request was broken into six parts and the
hardest one was named:

1. deterministic seed → same output
2. a generative music engine
3. a few demoscene visual styles
4. a live, real-time browser experience
5. a CLI that takes seed, resolution and style
6. the mp4 pipeline — **hardest**: headless capture of frames and audio into
   one file, with no ffmpeg on the machine, and determinism that has to
   survive the offline path

Part 6 went first, as a toolchain check, because it decided the architecture
for everything else. That check found ffmpeg missing in the first minute,
which led to vendoring `ffmpeg-static` and `puppeteer` (with its own
Chromium) instead of depending on anything installed system-wide.

Then, in order: the RNG, the music engine, the WebGL renderer and six styles,
the live page and AudioWorklet, the CLI and render pipeline, and finally a
verification pass over all six parts.

## Architecture decisions

**One engine, two front ends.** `src/app.js` exposes a `Demo` that draws the
frame for any time `t`. Live mode drives `t` from the synth's sample clock;
offline mode drives it from a frame index. Neither path knows about the other.

**The synth is plain JavaScript, not WebAudio nodes.** WebAudio graphs are not
bit-reproducible across runs or machines. Writing the DSP by hand — PolyBLEP
oscillators, a Chamberlin state-variable filter, analytic envelopes, a
ping-pong delay, a Schroeder reverb and a limiter — means the same code runs
inside an `AudioWorklet` live and in Node offline, sample for sample.

**Synth state is indexed by absolute sample position.** Envelopes are computed
from note age, and per-voice noise is seeded from the note's start sample, so
the size of the block the synth is asked to render cannot change its output.
This was tested directly: rendering with 128-sample and 4096-sample blocks
gives identical buffers.

**Visuals never analyse the audio.** The composer emits a *feature track* —
per-instrument envelopes at 240 Hz, derived analytically from the note
events — and the shaders read that. An FFT of live audio would differ between
a live run and an offline render; the feature track does not.

**Audio is rendered in Node, frames in Chrome.** Both build the score from the
same seed with the same module, so they describe the same piece without
having to pass anything between them except the seed.

**SwiftShader by default.** Headless Chrome rasterises through SwiftShader
(software WebGL) unless `--gpu` is passed, so pixels do not depend on the
graphics card. It is what is meant to make "same seed, same file" hold across
machines, at the price of render speed — v0.1 verified it on one machine
only (two renders, byte-identical).

**Frames are piped, not written to disk.** Each frame comes back from the page
as a PNG and is written straight into ffmpeg's stdin (`image2pipe`), muxed
with the WAV into h.264 + AAC.

## What was checked, and how

Every claim below was checked by running or viewing the result, not by
reading the code.

| Check | How | Result |
|---|---|---|
| Synth speed | rendered 8 s of audio in Node | 0.9 s — ~9× faster than real time |
| Block-size independence | 128- vs 4096-sample blocks | max difference 0 |
| Same seed, same mp4 | two full renders, sha256 compared | byte-identical |
| Different seed, different mp4 | a third render | different hash |
| Every style compiles and looks right | one frame per style, viewed as an image | 6/6 render |
| Live mode runs in real time | real browser; timecode vs wall clock | 3.28 s → 39.82 s in ~36 s, no console errors |
| Live style switch and new seed | keys `3`, `4`, `S` in a real browser | all three work |
| Audio level | peak and RMS on the float buffer | −2.1 dBFS peak, ~−13 dBFS RMS, 0 clipped samples |
| Final clip | ffmpeg probe + extracted frames | 854×480, 30 fps, 30.00 s, h.264 + AAC 44.1 kHz stereo |
| CLI validation | bad style, bad resolution, bad fps | each rejected with a clear message |

The repeatable checks live in `test/determinism.mjs` (`npm test`).

## What went wrong along the way

Problems found during the build, each caught by looking at the actual output:

1. **Large files were silently truncated** when written through a shell
   heredoc — the command hit a length limit and the music engine came out at
   195 lines. Caught by counting lines in the result; large files were written
   with the editor tool instead.
2. **Metaballs did not merge.** The first render showed six small dots at the
   edges of an empty frame. Radii and orbits were too small for the
   aspect-corrected coordinate space; fixed so the blobs fuse and split.
3. **Copper bars were invisible** under a bright rotozoom checkerboard.
   Rebuilt as glowing bars over a dark sky and a perspective floor, so the bars
   carry the frame.
4. **The Julia set was a flat black hole** on a flat red field. Fixed in two
   steps: orbit-trap filigree inside the set, and log-scaled smooth escape
   time outside it so the contour bands become visible. A third attempt was
   ruled out in advance — the second fix was the last try either way.
5. **Text was hard to read** over bright frames. Added a dark plate behind the
   title, a dim band behind the scroller and an outline on every glyph.
6. **Live style switching killed the renderer.** Switching rebuilt the `Demo`,
   which asked the same canvas for a second WebGL context; a canvas only ever
   has one, so shader compilation failed and the screen went white. Diagnosed
   from the console stack, fixed by swapping the style program in place.
   This bug was invisible to the offline render, which never switches styles —
   it only showed up because live mode was tested in a real browser.
7. **The AAC encode touched full scale.** The master bus was lowered by ~1 dB.
   Measuring the float buffer directly then confirmed the source is clean; the
   0 dB peak ffmpeg still reports on the decoded mp4 is codec overshoot, not
   clipping in the synth.
8. **A stale sample clip.** A clip rendered before the master-gain change would
   no longer reproduce from its own seed, so it was deleted rather than shipped.

## Known limitations in v0.1

- **Rendering is slower than real time** with SwiftShader: about 3× the clip
  length at 640×360 and about 6× at 854×480 (the 30 s showcase clip took
  172 s). `--gpu` is faster but gives up cross-machine pixel identity.
- **The tunnel's depth shading is flatter** than a classic texture-mapped
  tunnel.
- **The copper floor aliases** near the bottom edge (no mip-mapping on the
  procedural checker).
- **The AudioWorklet assumes 44.1 kHz.** On a device that forces another
  sample rate the live mode logs a warning and plays at the wrong pitch; the
  offline render is unaffected.
- **No `.gitignore`**, since the project was not a git repository when it was
  built.

## Token usage and cost

Measured from the Claude Code session transcript, counting every model
request from the first prompt to the delivered clip (125 requests). Streamed
chunks of the same response were counted once.

| Token type | Tokens | Price per MTok | Cost |
|---|---:|---:|---:|
| Input (uncached) | 250 | $4.00 | $0.00 |
| Output (incl. reasoning) | 130,749 | $20.00 | $2.61 |
| Cache write (1-hour TTL, 2× input) | 210,922 | $8.00 | $1.69 |
| Cache read | 24,441,970 | $0.20 | $4.89 |
| **Total** | **24,783,891** | | **$9.19** |

Prices are Anthropic first-party API list prices for Claude Opus 5.5
($4 input, $20 output, $0.20 cache read per million tokens; a 1-hour cache
write costs 2× input). Notes on reading the table:

- **Almost all of the volume is cache reads.** Each request re-sends the whole
  conversation, and 99% of it was served from the prompt cache at a twentieth
  of the input price. Without caching the same work would have cost roughly
  $100.
- **Cache reads are still the largest single line** ($4.89 of $9.19), because
  the conversation carried large files, shader sources and screenshots for
  the whole session.
- The figure is what the work would cost billed through the API. On a Claude
  subscription plan it counts against plan usage instead of being billed per
  token.
- The figures cover the build itself. Writing the v0.1 documentation and
  its plugin record afterwards took a further 33 requests, 11.0 M tokens and
  **$5.40** at the same prices.

### Where the tool calls went

| Tool | Calls | Used for |
|---|---:|---|
| Bash | 54 | installs, smoke tests, renders, ffmpeg probes, the test suite |
| Edit | 26 | shader fixes, the WebGL context fix, renderer changes |
| Write | 16 | source files, README, tests |
| Read | 15 | viewing rendered frames as images |
| Browser | 9 | running live mode in a real browser, console checks |
| Other | 11 | task list, background tasks, delivering the clip |

## Reproducing v0.1

The project was not under version control when v0.1 was built, so its exact
source was not kept apart from what followed: the working tree today is v0.2,
whose music engine composes differently for the same seed. v0.1's outputs can
no longer be regenerated byte for byte from this tree; this report and
[CHANGELOG.md](../CHANGELOG.md) are its record.
