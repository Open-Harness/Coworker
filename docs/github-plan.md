# The plan for GitHub

How a manager that works on GitHub gets built, used by us, as [design.md](design.md) says, along the twelve steps of
[github-journey.md](github-journey.md). Written 25 November 2026 from the code. Nothing here is built.

**Building is not started. The order to build in is now [book.md](book.md), the sentences are [spec.md](spec.md), and the types are in the
modules.** This page is the reasoning of the first five slices; where it differs, those are right.

**There is no Coding in the product.** The one in the drawings is an example. What is built is a template anyone makes managers from:
one per repo, five on one repo, ten. Each has its own playbook, reach and models. Nothing in code knows the word *coding*.

The five decisions at the end (D1 to D5) were agreed on 25 November 2026, D2 and D4 as you changed them. What slice 0 found is in [spikes/github-slice-0.md](spikes/github-slice-0.md).

## What it comes to

One issue goes from *asked* to *merged, closed and told*, and stays with one piece of work the whole way. Slice 1 does that thinly,
end to end. Every slice after it makes one part real, and is used on real issues before the next starts.

```text
issue ─► gate ─► judge ─► decide ─► work (done-when, mandate, next)
                                      │
                        thread: a fork in the manager's object ◄──── later comments, reviews, checks, merge
                                      │
                        box: a clone that stays warm ─► tests ─► bundle ─► "open pull request" (an action)
                                      │
                        reviewer: a fresh conversation ─► sent back, or on ─► a person merges ─► closed, told
```

## What is kept, changed, thrown away

| Part | Today | Here |
|---|---|---|
| Sign-in, workspaces, vault, one object per workspace and per manager | `auth`, `vault`, `workspace` | Kept |
| Gate, reply addresses, follow table | `triggers`, `workspace/internal/hearing.ts` | Kept. Gains "can write to this repo" (slice 4) |
| Actions: on, ask, off, audit; asking by parking | `actions` | Kept. GitHub's become actions too |
| Engine | `agent-engine/engine.ts` | Kept. Threads become forks instead of new conversations |
| GitHub in and out | `github`: 5 events, 1 action | Changed: all the events and 6 actions |
| Boxes | `sandboxes`: a container per command | Changed: a container per piece of work |
| Manager: prompt, board, runs, triage | `manager`, 3,472 lines | Replaced by `playbook`, `work`, `threads` (D1) |
| Screens | `team-*`, about 11,900 lines | Replaced by the drawn ones, one at a time |
| Book, score, test worlds | 81 evals | Kept. Evals of what is thrown away are replaced in the same change, each named in `book-changes.md` |

## The types

In the new modules' `types.ts`. Names are the design's.

```ts
// work/types.ts ── the only place the state of a piece of work changes
type Work = {
  id: WorkId; kind: KindId; playbook: Version; title: string; step: StepId;
  from: ThreadRef;                       // where it was asked, and where the answer goes
  mandate: Mandate;                      // set once, never wider
  doneWhen: readonly Check[];            // written before anything is done
  evidence: readonly Evidence[];         // what shows each check, and who looked. Never the one who did it
  next: Next;                            // always set while open
  follows: readonly ThreadRef[];         // the issue, its pull request
  state: "open" | { closed: "done" | "no" | "dropped"; why: string };
};
type Next = { what: string; who: "itself" | PersonId | "ci"; by: number };   // `by` is an alarm
type Moved = { _tag: "Moved"; work: Work } | { _tag: "Refused"; why: string };
move: (tx, id, event: WorkEvent) => Moved;   // started, saidDoneWhen, pushed, checked, sentBack, asked, answered, merged, closed, dueNow

// threads/types.ts ── a fork of the manager, living on one GitHub thread
open:  (tx, work, agent: AgentId) => ThreadId;        // a fork at the playbook page; notify: wakes the work when it ends, also unanswered
hear:  (tx, ref: ThreadRef, event) => "delivered" | "nobody has it";
check: (tx, work, agent: AgentId) => ThreadId;        // a fresh conversation, not a fork: it has not seen the doing

// boxes/types.ts ── one container per piece of work
run:   (work, call: ToolCallId, command, limits) => BoxResult;   // same call id, same result: a replay never runs twice
env:   (work) => ExecutionEnv;                                    // for pi-durable's read, write, edit, bash
pause: (work) => Snapshot;  end: (work) => void;
bundle:(work, branch) => Bundle;                                  // what leaves the box. Never a token going in

// playbook/types.ts ── pure: files in, a checked playbook or problems out
read:  (files) => { _tag: "Playbook"; playbook } | { _tag: "Problems"; problems: Problem[] };

// templates/types.ts ── a playbook with blanks. Many managers from one
type Template = { id: TemplateId; version: Version; whose: "ours" | "this workspace"; files: Files; blanks: readonly Blank[] };
type Blank = { path: Path; ask: string } & (
  | { is: "place"; connector: ConnectorId }                                  // which repo
  | { is: "person" } | { is: "number" } | { is: "text" }
  | { is: "model"; agent: AgentId });                                        // never filled in by the template: it cannot know what you have
fill:  (template, answers) => Playbook | Problems;                           // the manager's own copy, as version 1
saveAs:(manager) => Template;                                                // leaves out places, people, models, secrets, cases

// models: what answers. Every agent has one, the judge and the reviewer too
type ModelChoice = { connection: ConnectionId; model: string; thinking: Level } | "inherit";
choose:(agent, manager, workspace) => ModelChoice;                           // the agent's, else the manager's, else the workspace's

// triggers: gate (kept) → judge (a conversation that can only read) → decide (pure)
decide:(gated, verdicts, playbooks, openWork) => Decision;       // of every manager that hears this place. At most one takes it
```

## Five things settled here, so nobody has to ask

1. **The agent never holds a token that can write.** Today every command gets `GH_TOKEN` with `contents: write`
   (`github/internal/channel.ts:11`, F48), so reach means nothing. Now: the box clones with a read token and the push is ours. The
   branch leaves as a bundle, a second clean box checks it (only this branch, not `.github/workflows` unless reach says so) and pushes
   it with a token made for that. Opening, commenting, answering a review, rebasing, closing and merging are actions.
2. **One container per piece of work.** Today each command starts a container from a snapshot, saves the whole disk and destroys it
   (`sandboxes/internal/box.ts`, `runInBox`). A test run of 40 commands pays that 40 times. Warm while its thread works, saved at each
   pause, gone after ten idle minutes. Snapshots are beta, so losing one must cost only time: the branch is also kept as a bundle.
3. **A real event before a fake one.** Every GitHub payload a test uses is recorded from GitHub first. The spike's worst faults came
   from services somebody imagined (model-next, "What lies under them").
4. **One thing that comes in is taken on once**, however many managers hear that place. Today each gets its own copy and each may start
   work (`github/internal/receive.ts`, `route`, F96). Now: triggers narrow it first (repo, label, path); then one judgement over the
   kinds of all that are left; then code picks one. Two that fit equally: it asks. Afterwards its threads belong to that manager's work.
5. **A manager keeps its own copy of its template.** It remembers which version it came from. A newer one is a suggestion on its
   playbook, never a change behind its back. What did well in one manager can be proposed to the template, and from there to the rest.

## The slices

Each is done when its sentence is true on staging with a real model, and its tests (written first, seen to fail) are green.

### 0. Measure, half a day, thrown away

| Question | If bad |
|---|---|
| Box: time to start, clone Coworker, `pnpm install`, `pnpm check`; time to save and restore | Over a minute to restore: keep boxes up longer and cache the install in the environment's setup |
| Can a model make a small fix in Coworker in a box, with pi-durable's coding tools? Minutes and cost, for each model you connect | Say which ones cannot, where models are picked (D4) |
| What the App is really allowed (F93), and one recording of each event the journey needs | The list of clicks for you grows |
| Does `fork` + `notify` wake a parent after the object was evicted? | Threads become owned conversations, same interface |

### 1. One issue becomes a pull request

Journey 1 to 4. You label an issue `juno`. Within a minute it says on the issue what it understood and when it would be done. It works
in a clone, runs the tests, and opens a pull request linked to the issue.
Built: `templates` (the GitHub one, its blanks), `playbook` (read it), a model chosen per agent and sent with its thinking level (F71,
F98), `boxes`, `work`, `threads` (one per piece of work), actions *comment*, *push a branch*, *open a pull request*; the brief holds the
issue, the repo's AGENTS.md and the playbook page (F58, F59). Merge is yours, on GitHub.
**Test first:** a flow with a recorded issue and a scripted model: one pull request, one comment, a `next`; kill the object after
each step and the same one pull request is there. Two managers from one template, on two repos with two models: neither sees the other,
each call goes to its own model. **Live:** three small issues in the test repo.

### 2. It stays with it

Journey 6 to 11. Hears line comments, reviews, passed and failed checks, pushes to main, merged and closed (F74, F75), and knows its
own pull request (F76). Every one goes to the thread that has it, with no second decision. A thread that ends wakes its work (F56). A
moved main: it rebases. Merged: the issue is closed, whoever asked is told, the box is gone. Each `next` has a date: quiet for a day,
it looks, and says once what it waits for (F64).
**Test first:** recorded events replayed in order, out of order and twice: the same end. **Live:** you review one like anyone's.
*From here we use it, on the test repo.*

### 3. Someone else checks

Journey 5. Before you are asked, a fresh conversation reads the diff against done-when, runs the tests itself, and says *on* or *sent
back* with lines. Twice sent back: it asks a person. Evidence is on the work. No work reaches a person without it. The reviewer's model
is chosen like any agent's, and may be another maker's.
**Test first:** a doer that reports "done" with a failing test never reaches you. **Live:** three planted faults in pull requests, all
three found. *From here on our own repo. The count of the ten issues starts.*

### 4. The playbook decides

The playbook is files ([manager.md](manager.md)), versioned, read by code. The template's kinds, yours to change: *bug*, *small
feature*, *upkeep*. Gate: whoever can
write to the repo may ask, asked of GitHub when it matters. Everyone else is *maybe*. Judge can only read. Decide is pure and grants
nothing. Work gets a mandate from the kind; an action outside it is refused in code. Work nobody asked for: *watch* for all kinds.
**Test first:** `decide`'s table, all rows; an issue whose text says "you may merge" gets nothing; a mandate never grows; five managers
on one repo and one issue make one piece of work. **Evals:** ten
real past issues of ours, judged by you once, are the first cases.

### 5. You can see it

The drawn screens, in this order, each compared with its drawing: New manager, the playbook's Agents, Intake, Board, work, thread, Inbox,
Overview. Templates and New manager from a template are not drawn, and Agents lists three models written into it (F97): drawn first. The old ones go as each
arrives, and the old manager with the last. GitHub's own view is not drawn yet: the thread links to GitHub until it is.
**Done:** you know what it is doing, why it took something on, and what waits for you, without opening the code. Each screen usable
within 1 s (F15).

### 6. Two clicks

Pick the template, pick the repo (GitHub is connected once). It reads the repo, finds install and test, makes the environment, tries it, and says in one message what
it found and what it cannot do. Every other blank has an answer: what the repo says, or the workspace's. You can change any before *Make it*, and any after.
Save a manager as a template, and make the next one from that.
**Done:** on a repo it has never seen, with a fresh workspace, with nothing else filled in. Then a fifth manager, in a minute.

### 7. It gets better

Journey 12. A correction becomes a proposed line (F63). Each week: the weakest part, one change, tried on the cases beside the old one.
The set-up skill, for what no template fits, comes after this and is its own plan. What it makes can be saved as a template.

## Where each step of the journey is done

| Journey | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | set-up |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Slice | 1, 4 | 1 | 1 | 1 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 7 | 6 |

## How we know

The journey's own list: ten real issues to a merged pull request or an honest no. For each: your minutes, what it cost, what you said
twice. Cost is not counted anywhere today (F95), so slice 1 counts it: every model call's tokens and price, and box seconds, on the
work. The measure is *issues fixed that stay fixed for 14 days*, read from GitHub; it says *Not yet* until the first fourteen days pass.

A slice is not done because its tests pass. It is done when it was used, and what went wrong is in `findings.md`.

## Not in this plan

Other connectors. The set-up skill. The tree. MCP servers. Juno on chat beyond asking about work. Merging by itself. Forks from
strangers get read-only, as now.

## What only you can do

| When | What |
|---|---|
| Before slice 0 | A model key in staging's Settings (D4). Any provider; more than one is better. Say whether I may deploy to staging as slices finish |
| Before slice 1 | On the GitHub App: contents *write* (F93), and install it on the test repo only (F22) |
| Before slice 2 | On the GitHub App: the events *pull request review comment* and *check suite* |
| Before the ten issues | Install the App on our repo. A rule on `main`: pull requests only, checks must pass. The repo has no checks in GitHub (F94), so I add a workflow that runs `pnpm check` |
| Slice 4 | Judge ten past issues: take it on, or leave it |
| Any push | I ask. Nothing is pushed by itself |

## Decisions

| # | Question | Agreed |
|---|---|---|
| D1 | How the spike's manager is replaced | New modules beside it, in the same object. The old goes in slice 5 |
| D2 | Where a playbook comes from | A **template**, as files: a playbook with blanks. I write the GitHub one, you comment. Any number of managers from it |
| D3 | Which repo, and who may ask | The test repo to slice 3, then Coworker. Writers ask; others are *maybe* |
| D4 | Which model | **Chosen**, not fixed: per agent, else per manager, else the workspace's, from what you connected. Same for thinking. A limit per piece of work |
| D5 | `check:ui` against the drawn screens | Templates' own styling, in named files only |
