# Progress

Updated: 2026-11-09
Plan: docs/PLAN-v0.2.md section 8, "What 0.2.0 still takes", then docs/BUILD-REPORT-v0.2.md "Before release"; after it docs/PLAN-v0.3.md

## Open
- returned: a press of the arrow key in AUTOPLAY seemed twice not to move on for 37-40 s (2 of 5 live runs, not reproduced with the press logged) - to look at if the owner sees it
- returned: the skate park's technique - the trunk shifting, the arms adapting, the body's line of gravity over the board; to rework from real skaters in motion, when the owner takes it up ([detail](progress-plan.md))
- returned: version control - the v0.2.0 release was cut on 039ce3d, without the work of 2026-11-08/09 (28 files uncommitted on main); its deploy was refused, the github-pages environment allowing main only - the owner adds a tag rule v*, commits, and re-cuts the release ([detail](progress-git.md))
- returned: the rocks drawn as bright as the ship; on the real screen they are dimmer than the ship and shots - changing the approved scene is the owner's call
- returned: ST buzz on the SID or not - it plays there with an unfiltered sawtooth buzzer; keeping it off needs boards chosen by style, the owner's call
- returned: dead air in 19 approved styles, found by `npm run review:music -- gaps`; whether to fill them (intros and breakdowns, likely) is the owner's ([detail](progress-music.md))

Next: the owner allows tags v* on the github-pages environment, commits the 28 files, and re-creates the v0.2.0 release on main; then PLAN-v0.3.md section 4, step 1: the phosphor mask.
