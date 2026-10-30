# SEEDSCENE on GitHub

Owner, 2026-10-29: a 0.2.0 WIP on GitHub now; the official 0.2.0 release only
when docs/PLAN-v0.2.md is closed. Claude does not commit or push.

Where it stands (2026-10-30):
- https://github.com/3dgiordano/seedscene, `main` pushed by the owner (the WIP,
  the MIT license, the repository's preparation)
- GitHub Pages on, source "GitHub Actions"; the workflow run by hand deployed
  the WIP to https://3dgiordano.github.io/seedscene/ - checked: it opens in
  AUTOPLAY with the seed seedscene, draws, no console errors
- uncommitted: the `state/` rule in .gitignore, the error text in docs/DEPLOY.md,
  these notes

Left, the owner's:
- commit and push those when convenient
- the official release when the plan is closed: docs/DEPLOY.md, "Each release"
- optional: the workflow's actions have newer majors (checkout v7, setup-node v7,
  configure-pages v6, upload-pages-artifact v5, deploy-pages v5); GitHub warns
  the current ones run on a deprecated Node 20 - read their notes before moving
