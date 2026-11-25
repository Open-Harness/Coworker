---
name: update-build-dashboard
description: Refresh the Co-worker build dashboard from docs/build-plan.md and status/score.json. Run after every `pnpm score`, and on the schedule.
---

# Update the build dashboard

The dashboard is https://claude.ai/artifact/1QeAK2p8LzcazB113T7yds (a Data artifact). Its two datasets are files:
`evals` (every eval in the book with its latest result) and `runs` (the score history). This skill replaces both files
with fresh ones. It changes nothing in the repo except `status/dashboard/`.

## Steps

1. In `~/projects/pi-exp`, if `package.json` has a `score` script, run `pnpm score` and let it finish.
   Its failure is a result, not a reason to stop: it still writes `status/score.json`.
2. Run `node scripts/dashboard-data.ts`. It writes `status/dashboard/evals.json` and `status/dashboard/runs.json`.
   If it throws (for example an eval id used twice in the book), stop and report the error.
3. Upload both files to the dashboard as assets: the `Artifact` tool, `url` = the dashboard, `asset: true`, one call
   per file (`file_path` = each JSON file). Note each result's `/_blob/<id>` url.
4. Read `datasets/evals` and `datasets/runs` with `ArtifactData` `get` to learn their `version` and current
   `source.url`.
5. One `ArtifactData` `batch` of two `update` writes, each pinned with `if_version`: set `source.url` to the new
   blob url and `updated` to `{ "at": <now, ISO UTC>, "by": "Build updater" }`. Change nothing else.
6. Delete each old asset (`Artifact` `action: "delete"`, `url` = the dashboard, `path` = the old 32-character id),
   only if no dataset still names it.
7. Read `data/users/me/runs` with `ArtifactData`. If it exists and lists errors, report them. Do not edit the page.

## Report

One line: `<pass> of <total> evals pass · <fail> fail · <missing> not written · next: <milestone>`, plus any error
from steps 1, 2 or 7. Never paste secrets or file contents.
