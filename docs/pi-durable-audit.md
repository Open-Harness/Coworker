# pi-durable: what it gives, what it doesn't, and what makes the loop production-ready

Written 26 November 2026, on branch `core`, after the old loop came out (7b5fa4b). Nothing here is built. The seam it fills is
`src/modules/agent/types.ts`; today `noAgent` answers `NotBuilt` to every call.

Read for this: pi-durable 1.6.0's README and CHANGELOG (in `node_modules`), Cloudflare's
[Pi harness](https://developers.cloudflare.com/agents/harnesses/pi/) page, its
[changelog post](https://developers.cloudflare.com/changelog/post/2026-10-02-pi-harness/) and its
[Lifecycle](https://github.com/cloudflare/agents/blob/main/docs/agents/lifecycle.md) doc, Earendil's
[announcement](https://earendil.com/posts/pi-durable/), and
[a guarantees write-up](https://redreamality.com/blog/pi-durable-agent-harness-durable-execution/). For Orthograph:
`design/frame/examples/agents.md`, `design/decisions/H1-agent-harness.md`, `K10`, `K11`, and `spikes/durable-run` in the
Orthograph repo.

## How the agents are meant to work

A **manager** is made from a template, one per repo or job, with its own playbook, reach and models. Juno is the
workspace's own main agent.

1. Something arrives: an issue, a comment, a mail, a line in Juno's chat. The gate decides whether it is heard. The judge
   decides what kind it is. `deciding` decides what to do.
2. It becomes a **piece of work**. The work has a mandate set once, a `doneWhen` written before anything is done, a `next`
   that is always set, and the threads it follows. `work` is the only place its state changes.
3. **Threads** run on the work. One that *does* is a fork of the work's conversation at the playbook page. One that *checks*
   is a fresh conversation that never saw the doing.
4. Threads act through **actions**: GitHub, mail, MCP, the box (read, write, edit, bash in a clone that stays warm). Each
   action is on, ask or off. An action set to *ask* waits for a person's yes, and nothing runs until the yes comes.
5. **Waiting is parking.** A person's answer, CI or a review wakes the thread by a signal. Nothing polls, and a wait holds
   no process.
6. A thread **ends** by reporting `done`, `stuck` or `no`, or by a check that is met or not met. That end reaches the work
   exactly once. The work moves on: the next thread, a person, or closed and told.
7. Every model call goes through pi-ai. Spend is counted and capped. Every turn, tool call, park and failure is a span you
   can look at.

## What pi-durable gives

| Need | pi-durable 1.6 | Where in its README |
|---|---|---|
| A transcript that survives a crash or eviction | Conversations, entries and atomic commits; `resume()` continues unfinished runs | Persist and Resume |
| An input taken once | `submit({requestId})`: the same id finds the same submission | Persist and Resume |
| Threads as forks | `sessions.fork`, and a fresh conversation for a checker | Concepts |
| Every tool call durable | Each call is a `pi.tool` task with a checkpoint | Concepts, Tools |
| Waiting without a process | A tool parks with `{sleep:{signals,until,checkpoint}}`; `harness.signal(taskId, Signal, key, value)` wakes it. Results: `delivered`, `duplicate`, `invalid`, `closed`, `not_found` | Signals, Tools that park |
| Ask before acting | A `beforeTool` gate parks on a signal keyed by the argument digest, with a deadline it memoizes | Gates before a tool runs |
| Checker and publish | `afterRun` and `onYield` hooks return durable `hookTask`s | Hooks |
| Subagents | `notify:{taskId,key}` on a submission, parked on `SubmissionSettled` | Tools that park |
| Crash loops end | `settings.restartLimit` (5), then `task_faulted` or `task_interrupted` reaches `onReport` | Failures and Recovery |
| Spend | `docs["pi.usage"]` per conversation, `harness.usage()` for all of them, failed attempts included | Usage and Cost |
| Spans | `HarnessOptions.telemetry` takes a pi-telemetry `TelemetryContext`. It emits `pi.durable.submit` and `pi.durable.phase` spans, `pi.durable.report` events, and `phase.duration` and `tasks.active` metrics. A stored carrier keeps a resumed task in the same trace. Attributes are ids only, never content | Concepts (Telemetry) |
| An evictable host | `onWake(wake)` says when to arm the alarm; `alarm()` calls `resume()` | Sleeping and Waking Up |

## What it does not give, and what we must build

1. **Exactly-once effects outside.** Only a tool marked `replay:"safe"` runs again after a crash. Any other tool gets an
   *interrupted* result. So any tool that writes to GitHub, mail or MCP needs its own idempotency key, memoized before the
   call (`api.memo`) and sent to the provider. Orthograph's spike verified the recipe: key
   `${objectId}:${taskId}:${callId}`, and `safe` only where the provider honours the key. A key without the object id
   collides across objects.
2. **A model request is not exactly-once.** An eviction during a request sends it again under `settings.retry`. That is
   accepted: it costs tokens, not correctness. Only the tool boundary is exactly-once.
3. **The host.** The Durable Object (DO) owns the alarm, arms it *before* anything that can start work, keeps a heartbeat
   while active, and calls `resume()`. Either we write this (about 60 lines, the README's example), or Cloudflare's
   `PiHarness` and `Lifecycle` do it. See decision 1.
4. **One writer per storage.** pi-durable has no cross-process lock. One DO owns one Harness. That is why the size of the
   DO matters. See decision 2.
5. **The approval inbox.** pi-durable parks the call. Showing the question, checking who may answer, and calling
   `signal()` are ours. Nothing checks who sends a signal.
6. **Budgets.** `pi.usage` counts spend but caps nothing. Spend is enforced by a `beforeTool` gate and a check before each
   generation (`OverBudget`), plus `maxTurns`.
7. **Telling the work.** pi-durable doesn't know about `work`. A thread's end has to reach `work` exactly once, even if the
   DO dies between the end and the telling. That takes an outbox row committed in the same Pi commit as the end, drained
   to `work` with a key.
8. **Somewhere for spans to go.** pi-telemetry is not installed. Nothing turns its spans into Cloudflare traces, and
   `wrangler.jsonc` has no `observability` block. See "Instrumentation".
9. **The API moves.** It is marked experimental and changes between minors. Pin the version exactly (we do: 1.6.0) and keep
   all pi-durable imports inside `src/modules/agent/internal/`.

## Decision 1: who hosts the Harness

**The problem, in code.** The seam wants the host to drive `wake` and `resume`
(`src/modules/agent/types.ts:110-112`):

```ts
/** The host's alarm: what pi-durable's `onWake` says, and `resume` when it fires. */
readonly wake: () => Wake;
readonly resume: () => void;
```

`ManagerStore`, in `src/main.ts`, is the object it would live in. It has no `alarm()` that resumes a Harness yet.

**A · Our own host, the README's pattern** (recommended)

```ts
// src/modules/agent/internal/host.ts, called from ManagerStore's constructor and alarm()
ctx.blockConcurrencyWhile(async () => {
  await armFallback(ctx.storage, clock.now() + 60_000);        // before anything can throw
  const storage = await openDurableObjectSqliteStorage(ctx.storage);
  harness = await Harness.open(storage, { models, registry, onWake: (w) => void arm(w), telemetry }, context);
  await arm(harness.wake());
  harness.resume();
});
// arm = min(wake.at, heartbeat while active): setAlarm, or deleteAlarm when nothing is due
```

**B · Cloudflare `PiHarness` plus `Lifecycle`**

```ts
import { PiHarness } from "agents/harness/pi";
import { Lifecycle } from "agents/lifecycle";
// needs the `agents` package and Pi 1.6.1; Lifecycle owns the single alarm, retries, deploy recovery
Lifecycle.install(this).use(this.harness);
```

| Axis | A · Own host | B · PiHarness |
|---|---|---|
| Floor-first | ✅ about 60 lines on what is installed | ⚠️ a new package, a Pi bump, and a beta |
| Reversibility | ✅ one file | ⚠️ Lifecycle takes the DO's only alarm |
| Blast radius | ✅ `agent/internal` only | ⚠️ the agents SDK's own tables and RPC (`await lifecycle.start()`) |
| Correctness | ⚠️ we own the heartbeat and arming order, and test it with a kill test | ✅ heartbeat, fallback alarm and deploy retries come built in |
| Fit | ✅ errors as values, one root | ❌ no tracing hook; 15-minute invocations hand off every 10 |

**Recommendation: A**, built behind the same `wake`/`resume` seam, so B stays a later swap of one file if the beta
settles. A kill test proves it: evict mid-tool and mid-model, wake on the alarm, assert one effect and one end.

## Decision 2: one object per manager, or per piece of work

**The problem, in code.** Today's seam says one Harness per manager (`src/modules/agent/types.ts:8`):

```ts
 * The loop: how an agent runs. One pi-durable Harness in each manager's Durable Object, over that object's SQLite.
```

Orthograph says one DO per run (`H1:300`, `K10:83`, `F5:50`). A manager and a run are each "a conversation or a harness,
never the mission's state". The shared state (the board, the list of runs) lives in database rows.

**A · One DO per piece of work** (recommended). The work's conversation, its doing forks and its fresh checkers all live in one
Harness. Forks only work inside one storage, so that is where the threads must be. The manager becomes configuration
(playbook, reach, models) read by the work's DO, not an actor. Juno's chat gets its own DO per chat.

**B · One DO per manager.** Every piece of work the manager has shares one Harness and one SQLite. One stuck work, or a
crash loop, holds the alarm and the restart count for all of them. The DO's 10 GB and its single thread are shared too.

| Axis | A · Per work | B · Per manager |
|---|---|---|
| Fit with Orthograph | ✅ matches "one DO per run", where run = our work | ❌ the open difference |
| Blast radius of a crash | ✅ one work | ❌ every work of that manager |
| Forks for threads | ✅ all in one storage | ✅ all in one storage |
| Listing a manager's work | ⚠️ needs a D1 index, which `work` keeps anyway | ✅ one place |
| Reversibility | ✅ a manager is only config | ⚠️ splitting later moves transcripts |

**Recommendation: A.** It answers the open Orthograph question without waiting: their design already says per run.

## Instrumentation

Today: zero. `src/modules/telemetry` is the seam (`Telemetry.span`, `noTelemetry`). Spans go nowhere.

1. Install `@earendil-works/pi-telemetry` at 1.6.0 and write one adapter. It makes a pi-telemetry `TelemetryContext` whose
   spans become Cloudflare trace spans, via `cloudflare:workers` tracing. Verify that API against the docs before building.
2. Add `"observability": { "enabled": true, "traces": { "enabled": true } }` to `wrangler.jsonc`, top level and staging.
3. Pass it as `HarnessOptions.telemetry`. That gives `pi.durable.submit`, `pi.durable.phase` (task, phase, attempt,
   `resumed`, outcome, tool and call id) and `pi.ai.request` (tokens, cost, stop reason) for free.
4. Take Orthograph's names for our own spans: `agent.run`, `agent.turn`, `agent.tool.<name>`. Put `call.id` and `attempt`
   on every attempt. Put `gen_ai.*` usage on spans, never content. A declared refusal (`OverBudget`, a gate saying no) ends
   **ok** with `refusal.code`. Only a defect ends **error**.
5. `onReport` goes to one structured log line per report, with `kind`, `reason`, task id and extension, plus a counter.
   `task_faulted` and `storage_failed` are the alerts.
6. Actions get a span each: `action.<name>` with outcome `done | asked | refused | failed` and the idempotency key's hash.
   The audit row and the span carry the same key, so one can be found from the other.

## Actions

You are right on both counts: many don't work, and the ones that do are not consistent with each other. This is a
read-only sweep at 7b5fa4b, and the code is spot-checked below. Some of it is the cut (the loop is out). Most of it was
there before the cut.

**What does not work**

- **Only 24 of the 81 registered doings have a handler.** The other 57 answer "is not available yet". The UI presses
  some of them: `connector.connect` (`screens/settings/pages/connect-github.tsx:43`), `work.order`
  (`screens/board/index.tsx:56`), and `ask.remind` (`screens/inbox/index.tsx:77`), which is not even registered.
- **`createWorking` rejects on every call** (`src/modules/working/service.ts:4`). Since the cut, that means `work.add`
  is refused, approvals never reach the work, and the decider loops (below).
- **No tools reach GitHub, mail or MCP.** `working/internal/tools/*` went with the cut. `outside.github`, `outside.mail`
  and `outside.mcp` have no callers. `hearFor` drops every webhook trigger (`workspace/internal/answers.ts:31`).
- **There are no boxes on a deployed worker.** `world.ts:128,131` give `noBoxes` and `noPush` unless the fake world is on.
  `BOXES` exists only in staging.

**What is inconsistent**

- **Three doors for one kind of thing.** These are `/do` (keyed, audited to `console_audit`), the REST settings routes
  (not keyed, audited to `audit_log`) and `POST /inbox/:ask` (`answerOnce`, answers not audited). That makes two audit
  tables with two row shapes.
- **Five failure shapes:**
  - `Did` (`/do`);
  - `{is:"failed"}` (mailing, MCP);
  - `Unavailable` (boxes);
  - a thrown `Error` (`working`);
  - `AgentError`.
- **A bug is recorded as a refusal.** `console/internal/do.ts:96-101` catches a handler's throw and answers
  `refuse(error.message)`. The audit row says `refused`. A person can't tell a bug from a "no", and nothing logs it.
- **Silent waits:**
  - **The decider stalls the queue.** `deciding/internal/run.ts:118` catches every throw and returns "again in 5 s", with
    nothing decided after it. Behind it, `decider-host.ts:95` does `.catch(soon)`. With `working.take` rejecting, it
    loops forever and logs nothing.
  - **Ask answers never land.** `asking/internal/answer.ts:29` swallows the failed tell.
  - **A failed weekly look is skipped.** `look.ts:98` marks it as done.
  - **The Owner's ask email is swallowed.** `settings/internal/deliver.ts:29` drops it.
- **56 `.catch(`es discard the error.** About 40 are harmless (a JSON body parse that is then validated, or best-effort
  cleanup). 16 hide real failures. Among them are the decider, mailing, asking, following, look, deliver, a box snapshot,
  the MCP client, and a GitHub read that turns into `"main"`.

**What the evals prove.** 22 of the 24 handlers are driven end to end through `/do`. `suggestion.leave` and `try.change`
never are. 38 of the 57 doings without a handler have no flow at all. Every flow runs in the fake world, so `noBoxes` and
the missing `observability` block on a real worker are outside what they assert.

**What makes actions consistent** (this goes with build step 3):

1. **One door, one shape.** Every action, whether a person presses it or a tool calls it, goes through one `act(key, actor,
   doing, values)`. It returns `Done | Asked | Refused{code} | Failed{why}`. `Failed` is new, and a thrown handler
   becomes it, never `Refused`. REST settings and the inbox answer go through it too. That leaves one audit table.
2. **One key everywhere.** For a person, the key is the press key. For a tool, it is `${objectId}:${taskId}:${callId}`.
   The audit row, the span and the provider's idempotency key are the same string.
3. **Registry equals handlers.** Add a check to `pnpm check`: every registered doing has a handler or is marked `planned`,
   and the UI never presses a `planned` one. That turns the 57 into a visible list instead of a surprise.
4. **No silent catch.** Replace the 16 harmful `.catch`es with a value that is logged and counted. The decider marks the
   one item `failed` with its reason and goes on to the next.

## What to take from Orthograph now, without adopting it

1. **The tool key recipe and the replay rule** (decision-free; Orthograph verified it): `${objectId}:${taskId}:${callId}`,
   memoized before the call. `replay:"safe"` only where the provider honours the key. The same key with different arguments
   is an `IdempotencyConflict` value.
2. **Arm before admitting, and a kill test.** The alarm is set before any submit or signal. Two eviction assertions: a lost
   tool reply gives one effect; a lost model reply gives one end.
3. **A closed run machine.** States `working | waiting | done | failed | cancelled`. `wait`, `wake`, `finish` and `fail` are
   moved only by the loop, never by a caller. `failed.reason` is a closed union: `budget | turns | wall | refused | model |
   box | crash`. It is stored in a Pi document in the same commit as the entry, so it never disagrees with the transcript.
4. **Limits per agent**: `maxTurns`, `maxUsd`, `wall`. A ledger reserves `maxUsd` at start and settles the real cost at the
   end. The invariant: cost equals the sum of the turns.
5. **Span conventions** (above), and **evals that assert states, ends, spans and spend, never model text**. pi-ai's `faux`
   model is used only for crash-mechanics tests.

What not to take today: Effect, the blueprint compiler, generated SDK tools, E2B.

## The order to build in

Each step lands green (`pnpm check`) and is used before the next.

1. **Host and kill test.** One DO per work, `Harness.open` behind `createAgent`, arm and resume, `answer` for Juno's chat.
   The test evicts mid-tool and mid-model.
2. **Telemetry adapter** and the wrangler `observability` block. A chat turn shows up as one trace in the dashboard.
3. **Actions as tools.** The key recipe, the replay rule, one span and one audit row per call, the same key in both. A tool
   that fails gives the model an error result, never a silent wait.
4. **Ask as a gate.** `beforeTool` parks on the person's yes. The inbox calls `signal()` after checking who answers.
5. **Run machine, limits and outbox.** A thread's end reaches `work` exactly once.
6. **Checkers and publish** as `onYield` and `afterRun` hook tasks.
