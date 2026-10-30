# Publishing the demo on GitHub Pages

The live demo is a static site (`npm run build:web` → `dist/`). On GitHub it
is published by a workflow, [.github/workflows/pages.yml](../.github/workflows/pages.yml):
**every release published on GitHub builds the site and deploys it to Pages.**

## How it is laid out

- **One branch, the source.** `main` holds the code; nothing generated is
  committed. `.gitignore` keeps out what a machine makes or owns - the
  dependencies, the renders and the site (`out/`, `dist/`, any `*.mp4` or
  sound file), logs and caches, any `.env` or key, one person's editor and
  agent settings, the operating system's leftovers. What goes in: the code,
  the docs and their gallery, the release notes, the package files, this
  workflow, the agent's notes (`.agent/`, where the work stands, so it can
  be picked up from any clone) and `.claude/launch.json` (the live preview,
  silent, for agent sessions) - 87 files, about 25 MB.
  `.gitattributes` stores text with LF on every machine, so a clone is the
  same on Windows, Linux and macOS, and what the workflow builds is what was
  committed.
- **No `gh-pages` branch.** Pages takes the site straight from the workflow
  ("GitHub Actions" as the Pages source), so there is no second branch to
  keep in step, and the site's history is the releases' history.
- **On a release**, the workflow:
  1. checks the release's tag names the version in `package.json`
     (`v0.2.0` for `0.2.0`) and stops if it does not;
  2. installs the packages without their downloads (`npm ci --ignore-scripts`:
     no Chrome, no ffmpeg - neither is needed here);
  3. runs the quick tests (`npm run test:quick`): the same-seed promise for the
     score, the audio, the choices and AUTOPLAY - a release that breaks it is
     not published;
  4. builds the site (`npm run build:web`) and deploys it.

The site is served at `https://<owner>.github.io/<repository>/` - a
subfolder, which the site handles (it was tested served under `/seedscene/`).
It opens straight into AUTOPLAY with the seed `seedscene`; a link with a seed
opens that seed's demo. Pages serves over HTTPS, which the sound needs.

## Once: setting it up

1. Create the repository on GitHub (for example `3dgiordano/seedscene`) and
   push `main` to it:

   ```bash
   git init -b main
   git add .
   git commit -m "SEEDSCENE v0.2"
   git remote add origin https://github.com/3dgiordano/seedscene.git
   git push -u origin main
   ```

2. In the repository: **Settings → Pages → Build and deployment → Source:
   GitHub Actions.** Nothing else; the workflow does the rest.

## Each release

1. Set the version in `package.json` (and `VERSION` in `src/brand.js`, which
   the screens show) and the release date in `CHANGELOG.md`; commit and push.
2. Publish a release whose tag is that version with a `v`:

   ```bash
   gh release create v0.2.0 --title "SEEDSCENE v0.2" --notes-file SEEDSCENE.NFO
   ```

   or from the repository's **Releases → Draft a new release** page.
3. The workflow runs (the **Actions** tab shows it); a minute or two later the
   new site is live. Its URL is on the workflow run and under Settings → Pages.

A draft or a pre-release saved as a draft does not deploy; publishing it does.

## By hand

To republish without a new release - after changing a Pages setting, say -
open **Actions → Deploy the demo to GitHub Pages → Run workflow**. Run by hand,
the tag check is skipped and the site is built from the branch chosen there.

## If it fails

- **"release tag … does not match package.json"**: the tag and the version
  disagree. Fix the version or the tag, then publish again (or run the
  workflow by hand).
- **A quick test fails**: the same seed no longer gives the same demo on that
  commit; the old site stays up. `npm run test:quick` locally shows which check.
- **The deploy step is refused**: Pages is not set to "GitHub Actions" yet
  (step 2 above).

## A custom domain

Settings → Pages → Custom domain. With the "GitHub Actions" source the domain
lives in the settings, not in a `CNAME` file. The site works at a domain's root
as well as in a subfolder.
