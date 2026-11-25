# live

The live tier's settings and the staging setup plan (book sections 2 and 3). Pure: the composition roots read the
environment and files and hand them in as values.

**Owns**

- The four live evals (`LIVE_IDS`) and the settings each needs (`needs`, `missing`, `skipped`). A live test with a
  setting missing is skipped, which is neither a pass nor a fail, and the names are printed: by
  `vitest.live.config.ts` when the tests start and by `pnpm score --live` in its report.
- The list of every setting name (`settings`). `.dev.vars.example` lists exactly these, names only; a test checks it.
- The staging plan (`plan`, `describe`, `runnable`): the `wrangler` commands that set staging up, in order, without those whose
  thing the account has (`found`), and the Email steps only a person can do. `fill` fills in the three wrangler files.
  `scripts/staging.ts` prints it, and runs it only with `--apply`.

**Invariants**

- A plan is data: it holds `wrangler` arguments and, for a step's standard input, names of settings. Never a secret value.
- Nothing runs unless wrangler is signed in or there is a `CLOUDFLARE_API_TOKEN`. While a `REPLACE_AT_DEPLOY` is left or a secret
  is missing, only the `create` steps run.
- Nothing here talks to Cloudflare or GitHub.

**Testing**: `live.test.ts` checks the settings, the placeholders in the real `wrangler.jsonc`, `.dev.vars.example`,
the GitHub App manifest in `live/github-app-manifest.json`, and what the plan would run.
