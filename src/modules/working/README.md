# working

What a manager does with its work: it moves it (`work`), does what moving it asked, runs the conversations of its agents (`threads`), and
keeps their box (`boxes`). It is the manager's behaviour; `manager-store` is where it is kept and run (the manager's own Durable Object).

Given: a `Store` (what it keeps), `Outside` (its workspace's models and GitHub, and where a branch is pushed), `Boxes`, a clock, the playbook
as it was at a version, and `alarm` and `later`. Nothing is read from anywhere.

## How work goes

- `take` (once per item) puts work on the first step of its kind, and the first job is to start that step's agent.
- Every change of the work is an event applied by `work.move` and stored with the jobs it asks for, in one transaction, once by its key (`internal/events.ts`).
- Jobs are done in order, each once: start a thread, tell one, say something where it was asked, confirm that a connector did what it was asked, run a
  step's own commands in the box (`internal/jobs.ts`). A job that cannot go on (no container is free, the model did not answer, GitHub is out of reach)
  stays, the work says why it waits (`Hold`), and it is tried again at the hold's date. Nothing is lost and nothing is done twice.
- A thread is the messages of one agent on one step. A turn asks the model, does what it called, and asks again, until the agent ends its part with
  `report` or `check`, has nothing more to say, or must wait (`internal/thread.ts`). Every message is stored as it is made, so a lost object goes on from the last.
- A step that code checks (`checkedBy: code`, a leave that is a command) is left when its commands pass, whatever the agent said: when its turn ends
  without a report, what it did is looked at all the same.
- The cost of every model call is kept by its call id, priced when the model's price is known and counted without one when it is not.

## How it asks a person

One way, for anything that waits for a person (`internal/asking.ts`): the ask is made by the workspace (`outside.asks`, module `asking`) under an id made from what asked, the
issue says it once, the work waits for that person (`asked`), and the manager keeps how to go on under the ask's id (`once` `asked:<id>`). A thread that asked at a call is
**parked**: the call stays without a result, the job ends, and nothing polls. When the workspace tells `answered`, the answer is kept (`once` `answered:<id>`), the work hears it
(`answered`), and a `resume` job goes on from the same call, which then says what the answer was (the `ask` tool), or does what was said yes to (an action set to ask:
`tools/asked.ts` `guarded`, or without asking when a rule the person made with "always" covers it). Four kinds: `tool` (a call waits), `limit` (the work spent more than its
own limit: go on with the same again, or stop), `model` (the model did not answer: try again, or stop; the hold is let go), `plain` (whoever is working is told).

## Invariants

- No token that can write is ever in a box or a prompt. A box clones with a token that can only read; a branch leaves as a bundle, is checked, and is
  pushed outside the box with a token made for that push.
- An agent is offered exactly its tools and the actions its mandate has on (`threads.offer`); a call to anything else is answered in words.
- A comment, a pull request and a push are done once: a mark in the comment, or the pull request that is there already, says that it was.
- Work that has ended does nothing but say that it ended and let go of its threads and box.

## How to test

`working.test.ts`, with `memoryStore()` from `testing.ts`. The whole of it is shown by `evals/flows/repo-*.eval.ts`.
