# console

The console's server side for one request by one person in one workspace: each read of `api/types.ts`' map answered in its view, and
every change as a doing of the one registry (`POST /do`). `createConsole(deps)` is given what it reads and changes (`ConsoleDeps`) and
reaches for nothing; the Worker builds it (`src/console-root.ts`) and `http` calls it (`/api/ws/<workspace>/…`).

Built: the reads every start flow makes (`/shell`, `/home`, `/inbox`, `/chats`, `/overview`, `/tree`, `/coworker`, `/templates`,
`/templates/:template`, `/settings/*`, and a manager's `/board` (its open work as cards, from the manager's own object), `/playbook`, `/intake`; `/settings/usage` sums what every manager's model calls cost, a model with no price known counted in `notKnown`), `/do`, `/walk`. `/inbox` is what waits for the person (the workspace keeps the asks: `asking`), and `POST /inbox/:ask` is their answer (`Answered`, `Late`, or `Refused` for someone it is not for). `/m/:manager`, `/m/:manager/work/:work` and `/m/:manager/threads` are small views of what the manager's object keeps. A manager's own model is the setting `manager.model.<id>` (`manager.settings`), `spending.save` keeps the parts of the day (`spending.parts`) and never more than the day. A path with no builder is 404
in words. A doing that is in the registry and has no handler is refused in words ("is not available yet"), never pretended: handlers
are `workspace.general`, `models.default`, `manager.make`, `template.save`. Add one in `internal/do-*.ts` and `handlers.ts`.

## What it keeps, and where

Nothing itself. The workspace's object keeps the rows (`StoreOp`, run by `workspace/internal/console-store.ts`): `console_did` (what
each key did), `console_audit`, `console_setting` (`perDay`, `choice`, `templates`, `coworker.name`, …), `console_manager` (the tree's
nodes and where each manager's own object is), `console_item` (what came in, once by `same`, with the managers that hear its place and,
when there is one, its decision). A manager's own object is `manager-store`.

## Invariants

- A doing is claimed by its key first: the same key again answers what the first did and does nothing; one still in flight is `busy`.
- Every doing that reaches the registry, done or refused, is one line of the audit log. A doing nobody knows is refused and logged.
- A needed field that is missing, or a role that may not, is refused in words before any handler runs.
- No view carries a secret: a model connection shows its models and prices, never its key; vault names of `model:<id>` are the
  connection's and not listed.
- A manager is made in this order: filled and checked, grown in the tree (`tree.grow`, never wider than above), its object opened with
  its own copy as version 1, and only then registered. Nothing is registered that failed before.

## The playbook, as it is decided and changed

- An intake row's `line` is what became of the item, step by step: found, let through (one for each manager), judged, decided.
- `intake.correct` is right or wrong against what intake did; a `Left` that carries `would` counts as the judge's yes. Each correction is a case of
  the judge's eval (`agents/judge`); twice wrong in a row for a kind sends the kind back a step as a new version.
- `GET /m/:manager/versions` lists every version, newest first, with what each did to open work (open work keeps the version it began on).
  `version.go_back` is a new version made of an earlier one's files (`from: "went back"`); nothing is taken out of the history.
- `line.comment` keeps the comment, and the co-worker's model replies with `Change:`, `Answer:` or `Case:`; a change waits for a person to accept (`suggestion.accept`).
- What a manager does that a person said yes to (an action set to ask) is a line of the audit log, with who said yes (`approvedBy`).

## How to test

With `ConsoleDeps` of memory: a store that keeps rows in a map, a fake `outside`, and manager objects of memory. The whole Worker is
shown by `evals/flows/start.eval.ts`.
