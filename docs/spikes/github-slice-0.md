# Slice 0: what was measured

For [github-plan.md](../github-plan.md). 25 November 2026. The first two parts were run; the last three wait for a person.

## Does a finished thread wake its work, after the object is gone? Yes

A throwaway test in workerd: a task sleeping on `SubmissionSettled`, a fork of the manager's conversation submitted with `notify`, and the
object evicted while the model was answering.

| | |
|---|---|
| A fork sees what was there at its entry, and nothing later | Yes |
| It can have another model and other tools than the manager | Yes. It keeps the manager's own words too, so both are told |
| Evicted during an answer: the model is asked again | Yes, after 2, 4, then 8 s |
| Evicted five times during **one** answer | It gives up: `interrupted`, and the work is told `unanswered` |
| The same start submitted again | Nothing happens twice |
| Tokens of each call | Kept by pi-durable per conversation and model (`pi.usage`). Prices are not, as the catalogue says 0 (F95) |

Four things follow:

1. **`unanswered` is one of a thread's ends.** The work then asks it to go on, a few times, then says so to a person.
2. **An empty conversation cannot be forked** (`Storage.entry() requires an entry ID`). A manager starts with one entry, its playbook page,
   and every thread is forked **from that entry**, not from the newest: a thread does not carry everything the manager ever heard.
3. The engine keeps no timer for a retry when the host has an alarm: without the alarm nothing goes on. Ours has it
   (`manager/internal/alarm.ts`); the new one needs the same.
4. Slice 1's crash test evicts the object after each step, and five times inside one.

## How long is the work itself? On a Mac with 10 cores

A fresh clone of the public repo, packages already on the disk.

| Step | Seconds |
|---|---|
| Clone | 5 |
| `pnpm install`, from the disk | 12 (1.4 GB) |
| `pnpm build` | 7 |
| Types, lint, format, shape, size | 9 |
| `pnpm check:ui`, after the build | 4 |
| `pnpm test` | 225, 616 tests |

- `pnpm check` **fails on a fresh clone** until `pnpm build` was run (F99). An agent and a CI job would both trip on it.
- The tests take 225 s on 10 cores. A box has 4 at most and a command ends after 10 minutes (`COMMAND_TIMEOUT_MS`): they may not finish.
  Measured below. If not: longer commands that report as they go, and the doer runs the tests near its change, the reviewer all of them.

## Waiting for a person

| What | Command | Then |
|---|---|---|
| What the App may do, one real delivery of each event | `pnpm credentials run node scripts/github-look.ts` | Reads only. Says what is missing. Keeps payloads git-ignored until read |
| The boxes: setup, restore with 1.4 GB, check, tests | `BOX_TIMES=1 pnpm credentials run pnpm test:live live/box-times` | About half an hour of one container on staging. Nothing is deployed |
| A model on a real fix | Connect one or more in staging's Settings | Tried with slice 1's own tools: with a shell alone it would measure the wrong thing |
