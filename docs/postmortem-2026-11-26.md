# Postmortem, 26 November 2026: 100 of 100, and no real pull request

## What happened

The climb reached 100 of 100 (853 evals). The first run of the jobs, the only evals where a real model does the work, passed 8 of 18 on
Sonnet 5.5 and 7 of 18 the day before on another model. Every red job was one that needs a pull request, and each failed the same way:
"Never came true: a pull request is open. Last: []".

## The cause

Traced call by call (`JOBS_TRACE`): the model understood the issue, fixed the code, ran the tests (5 of 5), and called `github_push` with a
commit message. It never heard back.

- The tool says "Push the work's changes to its branch" and takes "The commit message" (`connectors/internal/github.ts`). It never committed
  and ignored the message; it bundled only commits already made (`boxes/internal/bundle.ts`).
- Nothing was committed, so the bundle was empty and git refused it.
- `push()` treated that as "wait and try again" instead of telling the agent (`working/internal/tools/github.ts`). The work went on hold
  quietly; every retry was the same empty push.

Fixed in `fe491b5`: the push commits what is left, with the agent's message, and an empty push is told to the agent. A flow now does what the
model did (`flow:repo/a-change-left-uncommitted-is-committed-with-its-message-and-pushed`); it fails on the old code with the jobs' error.

## Why no test caught it

1. **The scripts always committed.** Every scripted doer runs `git add -A && git commit` itself before `github_push`. Only a real model takes
   the tool at its word, and no flow pushed uncommitted work.
2. **The score left out the only real-model tests.** `pnpm climb --all` is the score and does not run the jobs: they need a key and cost money.
   So 100 of 100 said nothing about whether a real model can finish a job, and the jobs were first run after the climb was "done".
3. **A failure became a silent wait.** A tool result of `Waits` puts the work on hold with a reason that nobody reads in a job, and is retried.
   A wrong call should be told to the agent.
4. **Nothing is instrumented.** No traces, timings or logs in the product (finding F16). Even the work's own record of why it waits is never
   printed when a job fails. Finding the cause took a hand-made trace of the model calls.
5. **The evals check behaviour, not how it is built.** They pass whatever engine is underneath, so they could not see the departures below.

## What the build departed from

An audit of the build against `docs/book.md` and the plan (13 items; 8 were recorded nowhere). The ones that matter most:

| | Plan | Build |
|---|---|---|
| 1 | The engine is pi-durable ("Kept as machinery", book.md) | Two hand-written agent loops (`working/internal/thread.ts`, `turns/internal/run.ts`); pi-durable only in the old code |
| 2 | Model calls through pi-ai | Raw `fetch` to `/chat/completions` (`completion/internal/ask.ts`); an Anthropic-format connection is refused |
| 3 | Boxes and push in production | `noBoxes` and `noPush` outside the test world (`src/world.ts`): a deployed Co-worker cannot run a command or push |
| 4 | Replaced modules go when the new is there | The old manager (a second Durable Object), settings, board, agents, dashboards and the "delete when unused" modules are all still live |
| 5 | One mutation path for a work's state | `working/internal/adopt.ts` writes work state outside `works.move` |

Recorded but not escalated: item 1 was written down as a "choice" on the first slice (findings.md, "Choices, the Worker") and the climb went on.
The orchestrator should have stopped there and asked.

## What changes

- **The score includes a real model.** The jobs run before a slice is called done, with a cap (`JOBS_BUDGET`) and the trace on.
- **A tool that fails tells the agent.** `Waits` only for what is truly outside (a box not free, GitHub down), with a time limit.
- **Observability in the product:** Cloudflare Workers Logs and Traces, and pi's own telemetry (`pi.ai.request` spans with tokens, cost and
  stop reason) through a small adapter onto Cloudflare's custom spans. Every agent turn, tool call and hold reason is a span.
- **A departure from the plan stops the work** until the owner decides. Builders can't record a departure as a "choice" and carry on.
- **The stock-take:** one agent loop on pi-durable, model calls through pi-ai, the replaced modules deleted, the folder and module shape checked
  against the six-slot rule, and the core put in the shape Orthograph expects, so a later move onto it is one seam.
