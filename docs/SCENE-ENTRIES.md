# How a scene is written up in the README

The README's scene section ("Scenes, straight out of the scene") is where
people meet each scene for the first time. Every entry follows these rules, so
the section stays in order and reads as one piece as scenes are added.
`npm test` checks the heading, the order, the images and the length.

## Order

- Era by era, oldest first, each era under its own heading: its years and its
  title from `src/core/eras.js` (`### 1972–1981 · the first video games`). The
  heading is the era: a scene of one era carries no era note of its own.
- Within an era, in the order `src/core/eras.js` lists the era's scenes.
- A scene that belongs to several eras appears once, under the first, and says
  where else it plays: `*Also 1994–1996.*`. An era that borrows scenes from an
  earlier one names them under its table: `*Also in this era: …*`.
- Three to a row: a row of images, then a row of entries.
- The section's heading never changes - no count in it - so a link to it
  (`#scenes-straight-out-of-the-scene`) can be shared and keeps working as
  scenes are added.

## An entry

```
**name** — <the memory>: <the wink>; <the music>. *Also <years>.* `--scene name --era <year> --seed <seed>`
```

- **The memory** first: what the scene brings back, and its time - "the
  bouncing checkered ball of the Amiga's first demos", "the talking car of 80s
  television, as an idea". Whoever was there should know it from these words.
- **The wink**: the one or two details that make it unmistakable - the red
  light sweeping in the car's nose, the readout climbing to 88.
- **The music**: one clause, the clearest way the scene moves to it - "landing
  on every beat", "a burst on every backbeat". One, not every link.
- **At most forty words** from the dash to the era note. A short entry is
  fine when the memory and the wink fit in fewer.
- **Left out**: how it is made (the technique, the camera's moves), the
  second and third musical links, and what every scene has (the title plate,
  the scroller, the punch on the kick, the display). Those belong in the build
  report.
- **Evoke, never copy**: no title of a game, film, show or demo, and no name of
  an author, group, brand or character. A film or a show is "as an idea"; a
  machine or a technique may be named (the Amiga, the copper, ANSI).
- **The command** reproduces the gallery image: the era and the seed are the
  ones `tools/gallery.js` renders it with.
