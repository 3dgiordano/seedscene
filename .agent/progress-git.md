# SEEDSCENE on GitHub

Owner, 2026-10-29: a 0.2.0 WIP on GitHub now; the official 0.2.0 release only
when docs/PLAN-v0.2.md is closed. Claude does not commit or push.

Owner, 2026-11-02: never commit or push without the owner's review first; the
commit title and description are reviewed by the owner too; Claude never
appears as a co-author (no Co-Authored-By or session trailer in any commit).
Owner, 2026-11-02: each change starts from a branch made from the latest
`main`; the owner squash-merges each PR into `main`, so a branch already
merged is not reused without being rebuilt from `main`. Branches are named
for the change, plainly (e.g. `melody-lines`), never with a `claude/` prefix. Commits are made in
the owner's name (git -c user.name/user.email), since the container's git
identity is Claude's.

Where it stands (2026-11-01): the owner committed this session's work as
23fe562 (eras, displays and sound boards apart) and 2485742 (the screen kept
on in a programme); `main` was one commit ahead of `origin/main` when checked.

Before that (2026-10-30):
- https://github.com/3dgiordano/seedscene, `main` pushed by the owner (the WIP,
  the MIT license, the repository's preparation)
- GitHub Pages on, source "GitHub Actions"; the workflow run by hand deployed
  the WIP to https://3dgiordano.github.io/seedscene/ - checked: it opens in
  AUTOPLAY with the seed seedscene, draws, no console errors
- the `state/` rule in .gitignore, the error text in docs/DEPLOY.md and these
  notes were committed by the owner (e2ad4a9, 0b2be4b); then 74e5d55 (the new scenes and music)
- the project folder was renamed to C:/David/seedscene on 2026-10-30; the
  remote is unchanged, nothing in the repository refers to the folder path

Left, the owner's:
- the official release when the plan is closed: docs/DEPLOY.md, "Each release"
- optional: the workflow's actions have newer majors (checkout v7, setup-node v7,
  configure-pages v6, upload-pages-artifact v5, deploy-pages v5); GitHub warns
  the current ones run on a deprecated Node 20 - read their notes before moving
