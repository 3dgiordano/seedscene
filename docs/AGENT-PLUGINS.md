# Agent plugins behind SEEDSCENE

**SEEDSCENE is built by Claude in Claude Code with the full self-monitoring
set from [3dgiordano/agent-plugins](https://github.com/3dgiordano/agent-plugins)
active the whole time.**

This page is the historical record of that set, version by version: exactly
which plugins, at which versions and commits, and what each one changed in
the build. Machine-readable copies:
[plugins-v0.1.json](plugins-v0.1.json) · [plugins-v0.2.json](plugins-v0.2.json).

- [v0.2 — in development](#v02--in-development)
- [v0.1 — 2026-10-27](#the-set-as-used-for-v01)

## v0.2 — in development

v0.2 began on the set that built v0.1 (below). On 2026-10-28 the development
machine was updated to the agent-plugins release
[`v0.20.0`](https://github.com/3dgiordano/agent-plugins/releases/tag/v0.20.0),
the set v0.2 is finished with:

| Plugin | v0.1 set | v0.20.0 |
|---|---|---|
| aspiration-self-monitoring | 0.3.0 | **0.4.0** |
| coverage-self-monitoring | 0.7.0 | **0.7.1** |
| epistemic-self-monitoring | 0.6.0 | 0.6.0 |
| executive-self-monitoring | 1.10.0 | **1.11.0** |
| handoff-self-monitoring | 0.7.0 | **0.8.0** |
| hygiene-self-monitoring | 0.3.0 | **0.4.0** |
| integrity-self-monitoring | 0.3.0 | **0.4.0** |
| persistence-self-monitoring | 0.5.0 | **0.5.1** |
| progress-self-monitoring | 0.9.0 | **0.10.0** |
| termination-self-monitoring | 0.5.0 | 0.5.0 |

Claude Code applies a plugin update when a session starts. The v0.2 work up
to the relaunch ran on the v0.1 set. The session was relaunched on 2026-10-28
(it resumed at 15:30 UTC), and since then the set in use is v0.20.0: the
installed plugins sit at commit `a00da2a` (epistemic and termination, which
v0.20.0 did not change, at their v0.1 commits), and the hooks speak with the
new versions' voice - hygiene 0.4.0, for one, now asks for a `[HYGIENE CHECK]`
at every close. The sound-card round and the dropout fix were built on it.

### What the plugins caught in v0.2 so far

- **epistemic** — the `S` glitch. Instead of guessing, the synth nodes were
  instrumented: two of them were reporting interleaved positions, ~2 s and
  ~4.5 s apart. The fix was then judged by the same measurement after three
  presses in a row. It also stopped two wrong turns: a screenshot that seemed
  to show a stale tempo was re-measured and turned out to be an old frame,
  and a server holding the live port was checked before being stopped — it
  was the owner's own, so it was left alone.
- **aspiration** — the boot-screen font compared against the chunky C64
  original and redrawn; "HARMONICMINOR" and an `M` typed into the seed field
  caught in the rendered result; an "identical on any machine" claim cut back
  to what had actually been verified.
- **coverage** — the request for keys, an About part and new music became a
  six-part ledger with the music engine named hardest and done first. The
  part no measurement can close — whether the music *sounds* right — was
  reported as open, with `npm run sampler` built so a person can close it.
- **progress** — the work that has to happen after the plugin restart lives
  in `.agent/progress.md`, so the next session picks it up instead of
  re-deriving it.
- **aspiration, again, for the eras** — every era was rendered with several
  scenes and the frames read side by side before anything was called done.
  That found a dot tunnel that vanished in a 16-colour and a 4-green palette,
  vector balls swamping the frame, an inverted grid on the outrun floor, and
  fireworks too dim to see on the console era.
- **persistence** — the fireworks took two tries. The first (wider streaks)
  changed nothing visible; instead of widening them again, the frame was
  re-read, the cause turned out to be the palette's dark colours, and the
  second try fixed that.
- **coverage** — the inspiration pack became an eight-part ledger with the
  era system and THE JOURNEY named hardest and built first, since every other
  part stands on them.
- **hygiene** — the arcade round's new music needed new random choices and a
  configurable bar length inside the composer every style shares. Drawing
  them from the shared stream would have silently changed every existing
  style's notes for every seed. The new material got its own stream, and the
  fifteen earlier styles were hashed before and after to show they did not
  move.
- **aspiration, for the arcade** — the six new scenes were judged from
  rendered contact sheets, not from the shader code: that caught a score
  under the title plate, a cannon and a paddle under the scroller, and a
  formation clipping the plate in the live page.
- **epistemic** — whether this session had restarted onto v0.20.0 was
  checked, not assumed: at first the transcript showed one Claude Code process
  throughout, with the start-of-session hook fired by a context compaction, so
  it was left open; it was recorded only after the relaunch, against the
  installed versions.
- **aspiration, for the boxer and the ship** — the first boxer frame was held
  against what the scene had to evoke and failed (a snowman of a challenger,
  three bubbles for a player); so did the ship, seen edge-on. Both were
  redrawn and re-rendered before anything was called done.
- **epistemic, for the clipping** — lowering the mp4 level by the agreed
  5 dB was measured instead of assumed, and it did not hold: the peaks moved
  erratically with the level. That pointed at the encoder's noise
  substitution, which was turned off; only then did the 5 dB give a steady
  margin on every style.
- **coverage** — the stage round became an eight-part ledger with the 3D
  stage and the simulation channel named hardest and built first, since the
  snake and the maze stand on them.
- **epistemic, for the invisible lasers** — the starfighter's first frame
  sequence showed no lasers, which looked like a drawing fault. The
  simulation's state at that moment was read before anything was redrawn: the
  fight had simply not started. The fix went to the firing range, not to the
  drawing code.
- **aspiration, for the robots** — the robot boxer was judged from rendered
  frames at the moments that matter (the counter, the swing, the knockdown),
  which caught a challenger's head under the title band and a counter that
  landed on the gloves instead of the head.
- **aspiration, a miss** — the starfighter was closed as "lasers reach a
  drone and burst it", and the frames did show that; the owner then saw
  lasers coming in from the screen's edges and a ship that did not point
  where it fired. The criterion had been the letter (the lasers hit
  something), not what the owner would hold it to (a ship that aims and
  fires from itself). The second pass measured exactly that - volleys off
  target, bolt direction against the nose, lean against the slide - before
  calling it done.

On v0.20.0:

- **hygiene, for the sound chips** — the new styles took their material from
  a random stream of their own, and the fifteen original styles were hashed
  on their own synthesizer before and after: byte-identical.
- **epistemic, for a hash that moved** — the build report was about to say
  the test's audio hash was unchanged; the test log said otherwise. The cause
  was traced, not guessed: with 24 styles the test seed's automatic pick moved
  from trance to rave, and trance alone still hashes as before. The report
  says so.
- **epistemic, for the dropouts** — the owner heard cuts in the mixes. They
  were measured block by block, as the browser's audio thread renders them,
  before anything was changed: two wavetable tracks overlapping needed 65% of
  real time, and the next track was composed in one go at the very start of
  each mix.
- **hygiene, for the fix** — every optimization had to give back the same
  numbers: every style on every sound chip, and a minute of AUTOPLAY, were
  fingerprinted before and after, byte-identical. The owner then confirmed
  live that the cuts were gone.

## The set, as used for v0.1

Recorded on 2026-10-27 from the Claude Code plugin registry of the machine
that built it. Every commit below is on the repository's `main` branch.

| Plugin | Version | Commit | Effect on v0.1 |
|---|---|---|---|
| [aspiration-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/aspiration-self-monitoring) | 0.3.0 | [`9efdf2c`](https://github.com/3dgiordano/agent-plugins/commit/9efdf2c5259267dda0c00885a2153205945118f4) | High |
| [coverage-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/coverage-self-monitoring) | 0.7.0 | [`9efdf2c`](https://github.com/3dgiordano/agent-plugins/commit/9efdf2c5259267dda0c00885a2153205945118f4) | High |
| [epistemic-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/epistemic-self-monitoring) | 0.6.0 | [`3199f36`](https://github.com/3dgiordano/agent-plugins/commit/3199f36a21f840bc73050dbbd75906c0557971af) | High |
| [persistence-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/persistence-self-monitoring) | 0.5.0 | [`52bdd19`](https://github.com/3dgiordano/agent-plugins/commit/52bdd19e6f157ad17212a5c5c3ba2c8854101115) | Medium |
| [integrity-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/integrity-self-monitoring) | 0.3.0 | [`ec1aee9`](https://github.com/3dgiordano/agent-plugins/commit/ec1aee934bd769ba8fd859c80ca7e6d80ba0656f) | Medium |
| [handoff-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/handoff-self-monitoring) | 0.7.0 | [`9efdf2c`](https://github.com/3dgiordano/agent-plugins/commit/9efdf2c5259267dda0c00885a2153205945118f4) | Medium |
| [hygiene-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/hygiene-self-monitoring) | 0.3.0 | [`ec1aee9`](https://github.com/3dgiordano/agent-plugins/commit/ec1aee934bd769ba8fd859c80ca7e6d80ba0656f) | Low |
| [executive-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/executive-self-monitoring) | 1.10.0 | [`9efdf2c`](https://github.com/3dgiordano/agent-plugins/commit/9efdf2c5259267dda0c00885a2153205945118f4) | Low |
| [progress-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/progress-self-monitoring) | 0.9.0 | [`52bdd19`](https://github.com/3dgiordano/agent-plugins/commit/52bdd19e6f157ad17212a5c5c3ba2c8854101115) | None needed |
| [termination-self-monitoring](https://github.com/3dgiordano/agent-plugins/tree/main/plugins/termination-self-monitoring) | 0.5.0 | [`9efdf2c`](https://github.com/3dgiordano/agent-plugins/commit/9efdf2c5259267dda0c00885a2153205945118f4) | Not triggered |

The four commits date from 22–23 October 2026: `9efdf2c`, `ec1aee9` and
`52bdd19` landed shortly after the repository's `v0.18.0` release, and
`3199f36` shortly after `v0.19.0`.

| | |
|---|---|
| Host | Claude Code 2.1.309, Claude desktop app (Code tab) |
| Model | Claude Opus 5.5 (`claude-opus-5-5`), effort high |
| Marketplace | `3dgiordano-agent-plugins` |
| Scope | user — active in every session on that machine, not configured per project |

### Installing the same set

```bash
claude plugin marketplace add 3dgiordano/agent-plugins
claude plugin install aspiration-self-monitoring@3dgiordano-agent-plugins
claude plugin install coverage-self-monitoring@3dgiordano-agent-plugins
claude plugin install epistemic-self-monitoring@3dgiordano-agent-plugins
claude plugin install executive-self-monitoring@3dgiordano-agent-plugins
claude plugin install handoff-self-monitoring@3dgiordano-agent-plugins
claude plugin install hygiene-self-monitoring@3dgiordano-agent-plugins
claude plugin install integrity-self-monitoring@3dgiordano-agent-plugins
claude plugin install persistence-self-monitoring@3dgiordano-agent-plugins
claude plugin install progress-self-monitoring@3dgiordano-agent-plugins
claude plugin install termination-self-monitoring@3dgiordano-agent-plugins
```

This installs the current versions. To reproduce the v0.1 set exactly, check
out the commits listed above; for v0.2, the
[`v0.20.0`](https://github.com/3dgiordano/agent-plugins/releases/tag/v0.20.0) tag. The repository's own
[README](https://github.com/3dgiordano/agent-plugins#readme) covers Codex,
Cursor and other hosts.

## How the plugins work

Each plugin pairs a **skill** (what discipline to apply) with **hooks** (when
to apply it): the hooks watch the session and inject a short reminder at the
moment a known failure pattern is likely, and the agent answers with a small
structured block.

The rest of this page records what each one actually changed in this build —
with the moment it mattered — and says plainly where a plugin was loaded but
had nothing to do.

## Effect of each plugin on v0.1

| Plugin | Effect | Why |
|---|---|---|
| aspiration | **High** | drove the review-the-output loop that found most defects |
| epistemic | **High** | the live-mode WebGL bug, the stale console error, the audio clipping question |
| coverage | **High** | ordered the work hardest-first and kept every requirement accounted for |
| persistence | Medium | capped the fractal tuning loop; stopped redundant polling |
| integrity | Medium | kept the pipeline real (no mocked ffmpeg, no stand-in services) |
| handoff | Medium | shaped the final hand-over to the owner |
| hygiene | Low | greenfield project, so there was no existing code to over-reach into |
| executive | Low | the plan was a short requirements file, read once and kept in view |
| progress | None needed | nothing was left blocked, so no cross-session ledger was written |
| termination | Not triggered | the work was never stopped or narrowed early |

### aspiration-self-monitoring — review the result, not the code

The rule: before calling something good enough, look at it in the medium it
will be used in and compare it with a source you did not write.

For a video tool that means *looking at frames*. After the first render, one
frame per style was extracted and viewed as an image, held against what the
demoscene effect is supposed to look like. That review found four defects in
one pass, none of which the code would have revealed:

- metaballs that never merged — six dots at the edges of an empty frame;
- copper bars hidden under a bright checkerboard;
- a Julia set rendered as a flat black hole on a flat red field;
- title and scroller text unreadable over bright frames.

Each was fixed and re-viewed. The same rule pushed the final checks onto the
real artefacts — probing the mp4, extracting frames from across the timeline,
measuring the audio level — and it is why the report lists the two cosmetic
issues still open (tunnel depth, floor aliasing) instead of calling the
styles finished.

### epistemic-self-monitoring — keep what you saw apart from what you concluded

The rule: a diagnosis carries its evidence and a named falsifier; only a
verified claim becomes a fact.

- **The live-mode bug.** Pressing `3` in the live page turned the canvas white.
  The claim "a canvas cannot hand out a second WebGL context" was written down
  with its evidence (the stack trace running through `buildDemo` → `new
  Renderer`) and its falsifier (switching styles keeps drawing). After the
  fix, the falsifier was run in a real browser: styles `3`, `4` and a new seed
  all switched cleanly.
- **The stale console error.** After the fix, the browser console still showed
  the old error. Instead of re-opening the bug, the observation was checked
  against what it implied: its stack named a function and line numbers that
  no longer exist, and the page visibly rendered. It was history, not a
  regression.
- **"Is the audio clipping?"** ffmpeg reported a 0 dB peak on the encoded file.
  Two explanations competed — clipping in the synth, or AAC overshoot on
  decode. Measuring the float buffer before encoding settled it: −2 dBFS peak,
  zero clipped samples. The source is clean.

### coverage-self-monitoring — the hard part first

The rule: list the parts of the request, name the hardest one and do it first;
close every part as done, blocked or returned — never silently dropped.

Before any code, the brief was broken into six parts and the mp4 pipeline was
named the hardest. Doing it first turned up that ffmpeg was not installed in
the first minute, while the architecture was still open. The closing check
walked all six parts against a concrete run each.

Listing "live, in real time" and "an mp4 file" as separate parts kept both
on the ledger, so the tension between them was resolved with one engine and
two front ends rather than by delivering the easier half and deferring the
other.

### persistence-self-monitoring — know when to stop trying

The rule: when an approach keeps failing, decide explicitly whether to try
again, switch, or report.

The Julia-set exterior took two attempts to get visible bands. Before the
third, the plugin's check was written out: one more change was proportionate,
and it would be the last regardless of the outcome. It worked; had it not, the
style would have shipped as it was, with the gap reported. Later the same
check stopped a loop of progress polling on a background render in favour of
waiting for its completion notice.

### integrity-self-monitoring — the result has to be real

The rule: when something cannot be done as asked, say so; do not hand over a
result that only looks done.

ffmpeg was missing from the machine. The route taken was a real encoder (a
vendored static ffmpeg build) rather than anything that only looks like an
mp4 — the outcome this rule asks for. The plugin's direct intervention came
later: its hook flagged that the local server touched two hosts. That was
checked and recorded as a false alarm — `localhost` is only a base for parsing
URLs and `127.0.0.1` is the bind address; nothing leaves the machine.

### handoff-self-monitoring — a close the reader can act on

The rule: end with a status, the situation in the reader's terms, and one next
action.

The final message led with a status (`done`), described what the owner now
has without referring to file names or commands they had not seen, and ended
with one action: run live mode and judge the look and sound.

### hygiene-self-monitoring — change only what was asked

The rule: list every public behaviour a change reaches and keep it to what the
request names.

This was a new project built from an empty folder, so every function was
created for this request and nothing pre-existing could be over-reached. Its
practical contribution was the closing scope check, which confirmed that the
change stayed inside the new project and left `requeriments.txt` untouched.

### executive-self-monitoring — stay on the plan

The rule: re-open the artefact that defines the work instead of working from
memory.

The plan here was `requeriments.txt` — six short paragraphs, read at the
start and turned into the parts list. With a plan that short and a single session, no
drift arose for this plugin to catch.

### progress-self-monitoring — what outlives the session

The rule: anything left blocked or returned to the owner goes into
`.agent/progress.md` so the next session does not lose it.

Every part of v0.1 closed as done, so there was no residue to record and no
ledger was created — which is the plugin's own guidance for that case. The
known limitations are documented in [BUILD-REPORT-v0.1.md](BUILD-REPORT-v0.1.md)
instead.

### termination-self-monitoring — no stopping on a feeling

The rule: a reason to stop, defer or narrow must be checkable, not a sense of
fatigue or a context budget.

It was never triggered: no part of the work was stopped early, deferred to a
later session or narrowed.

## The pattern across them

The plugins that mattered most in this build all push in the same direction:
**check the real artefact instead of trusting the code that made it.** The
two most consequential defects — the invisible styles and the broken live
switch — were invisible from the source and obvious from the output. A video
tool has to be watched, and a live mode has to be run live.
