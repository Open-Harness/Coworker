# Handover: finish the blueprint (Phase 2), then Phases 3 to 6

For the next agent. Written 27 November 2026, on branch `blueprint-light`, PR Open-Harness/Coworker#1 into `core`. Read
[the brief](../prompts/blueprint-light.md) first, then this page, then [inventory.md](inventory.md) and [layout.md](layout.md).

## Where it stands

| Phase | State |
|---|---|
| 0 · Inventory | **Done**: [inventory.md](inventory.md) |
| 1 · Layout | **Done**: the owner chose **A and A** in [layout.md](layout.md). The app stays at the root. `packages/orthograph` is Orthograph's declaration layer, vendored at commit 309a409 ([VENDORED.md](../../packages/orthograph/VENDORED.md)). The repo is a pnpm workspace. `scripts/check-packages.ts` is in `pnpm check`. |
| 2 · Blueprint | **Started**: values, stores, and the things `workspace`, `person`, `invite` and `join` are done. The rest is below. |
| 3 to 6 | Not started |

`pnpm check` was green at c6aec75. 2be6a37 passed every check except the tests, which it cannot affect: no test imports
`packages/blueprint`.

## How the blueprint is written

Copy what is there. Everything uses the real `Blueprint.*` from `orthograph`, as Orthograph's `examples/work/blueprint` does.

```text
packages/blueprint/
  values/coworker.ts         the words of docs/design.md, as values. Add here; never inline a Schema in a thing
  stores/workspace.ts        Blueprint.store.kind("actor.of.workspace"): rows inside the workspace's Durable Object (delta D3)
  stores/work.ts             Blueprint.store.kind("actor.of.work"): rows inside a piece of work's Durable Object (delta D3)
  things/<thing>/
    thing.ts                 Blueprint.thing({ description, code, lives?, fields })
    events.ts                Blueprint.event: one for every move, because a move must emit one
    machine.ts               Blueprint.machine: only where the inventory found a lifecycle. `from: []` is the creating move
    errors.ts                class X extends Blueprint.error({...}, { exit: N }) {}
    roles.ts                 only where a role is decided on this thing
    verbs/<verb>.ts          export default Blueprint.operation(...) or Blueprint.read(...)
  index.ts                   exports what the SDK will import as types
```

**Rules that are already decided:**

- **Where a thing lives.**
  - No `lives` means a D1 row. That is person, invite, join and billing.
  - `lives: "actor"` means one Durable Object per instance. That is `workspace`, `work`, and `chat` (one per root chat, with its forks inside it).
  - Inside the workspace object, import `stores/workspace.ts` and set `lives:` to it. That is the co-worker, note, manager, playbook, comment, template, walk, trigger, trial, item (intake), ask, rule, account, mcp, environment, agent, skill and audit.
  - Inside a work object, use `stores/work.ts`. That is thread, call (an action call) and conversation.
  - Check that `lives` takes a store value. If it does not, use the store's `of` string, and log it in the DX log.
- **Roles.** Use `member`, `builder` and `owner` from `things/workspace/roles.ts`, as `<role>.of("workspace")`. So every
  operation's payload carries `workspace: Workspace.fields.id`. The doing's `needs` column (Member, Builder or Owner) picks the role.
- **Every verb's comment** names its doing id (`// Doing \`work.add\`.`). It also says when the screen sends the wrong fields, and
  when nothing presses it. The inventory's Gaps section has both.
- **Exit codes** are ranges per thing. 20s workspace, 25 to 26 person, 27 invite, 28 join. Then, by plan: 30s co-worker and note,
  35s chat, 40s manager, 45s playbook and comment, 50s template and walk, 55s trigger and trial, 57s item, 60s work, 70s thread,
  75s ask and rule, 80s call, 85s account and conversation, 88s mcp, 90s environment, agent and skill, 97s billing.
- **Not a machine.** A work's `step` is playbook data (inventory, question 1). `work.move` writes it, with no `move:`. Work's machine
  is its lifecycle only.
- **Idempotent.** Every operation that changes something has `idempotent: "request"`. The screen's key is the request key.
- Check after each thing with `node_modules/.bin/tsc -p packages/blueprint`, then `pnpm exec oxfmt packages/blueprint`. Commit each
  group. Files stay at or under 250 lines.

## What is left in Phase 2

Each row gives the thing, where it lives, its machine, and its verbs with the doing each one answers. Payload fields are in the
registry (`src/modules/doings/internal/*.ts`). An asterisk marks a verb the screens imply that is not registered: declare it, and the
binding file marks it `planned`.

| Thing | Lives | Machine | Verbs (doing) |
|---|---|---|---|
| `coworker` | workspace | none | `save-soul` (soul.save), `edit-talking` (talking.edit), `set-may` (coworker.may), `save-spending` (spending.save, refuses parts that add up to more than the whole: C11), `add-routine` (routine.add), `undo` (history.undo) |
| `note` | workspace | proposed → kept or left; kept → forgotten | `accept` (note.accept), `leave` (note.leave), `forget` (note.forget) |
| `chat` | actor | none: its working, waits or quiet state is the loop's | `start` (chat.new, `POST /chats`), `say` (`POST /chats/:chat`), `fork` (chat.fork, `POST /chats/:chat/fork`) |
| `manager` | workspace | working ⇄ paused → retired | `make` (manager.make), `pause`, `start`, `retire` (handTo), `move` (manager.move), `settings` (manager.settings) |
| `playbook` | workspace | none; versions are rows | `save-version` (version.save), `go-back` (version.go_back), `edit-reach` (reach.edit, refuses wider than above: R1), `edit-objective` (objective.edit), `add-skill` (skill.add), `set-alone` (kind.alone), `judge` (eval.judge), `retire-eval` (eval.retire), `edit-part`\* (every part edit that is local today) |
| `comment` | workspace | open → offered → taken or left; open → answered or case | `make` (line.comment), `accept` (suggestion.accept), `leave` (suggestion.leave) |
| `template` | workspace | none | `save` (template.save), `try` (`POST /templates/:t/try`), `rename`\*, `remove`\* |
| `walk` | workspace | said → questions → connect → found → more → draft → made, thrown or carried | `start` (`POST /set-up`), `answer`, `connect`, `skip`, `dispute`, `make` (the `/set-up/:walk` events) |
| `trigger` | workspace | on ⇄ off | `add` (trigger.add), `off` (trigger.off), `run` (trigger.run) |
| `trial` | workspace | running → tried → kept or used | `try` (try.change), `decide`\* (Keep or Use on compare) |
| `item` | workspace | kept → took, joined, asked, left, stopped or couldNot | `correct` (intake.correct), `approve`\* ("Yes, take it on" presses intake.correct today) |
| `work` | actor | open ⇄ waiting → done, no, dropped, stopped or handedOver; ended → open (`openAgain`, people only) | `add` (work.add), `stop`, `move` (no `move:`), `order`, `say-done-when` (work.done_when), `open-again`, `answers` (work.answers), `hand-over`; reads `get`, `list` (the board: `where: ["manager", "step"]`) |
| `thread` | work | working ⇄ waiting → reported (done, no or stuck), unanswered, stopped or over | `stop`\*; reads `get`, `list`. The loop's moves are delta D5 |
| `call` | work | asked → running → done, refused or failed | none a person presses: the ask's answer moves it. Read `list` (audit) |
| `ask` | workspace | open → answered or gone | `answer` (ask.answer, `POST /inbox/:ask`), `approve` (ask.approve), `always` (ask.always), `remind` (ask.remind: pressed, not registered) |
| `rule` | workspace | none | `take-away` (rule.take_away) |
| `conversation` | work | managed ⇄ person → stopped | `tell` (conversation.tell), `write` (conversation.write), `hand-back` (conversation.hand_back) |
| `account` | workspace | connected ⇄ offline → removed; lent → given back | `connect` (connector.connect), `check` (connector.check), `scan` (connector.scan), `take-away` (connector.take_away), `lend` (account.lend), `choose-repos`\* |
| `mcp` | workspace | works ⇄ failed → removed | `add` (mcp.add, `POST /settings/mcp-servers`), `check`, `remove`, `set-tool` (mcp.tool), `give`\* (to a manager) |
| `key` | vault (`Blueprint.store.kind("vault")`) | none | `add` (key.add), `replace` (key.replace). Never a value in an answer: use `Blueprint.visibility` if it fits |
| `environment` | workspace | none | `add` (environment.add), `remove` (environment.remove), `edit`\*, `set-secret`\* |
| `agent`, `skill` | workspace | none | `use` (agent.use), `edit`\* |
| `billing` | D1 | none | `change-plan` (billing.change_plan), `update-card`, `download` (billing.download) |
| `audit` | workspace | none | read `list` (where by, outcome; next) |

When the table is done, every registered doing is on it, along with `ask.remind`. The appendix in [inventory.md](inventory.md) is the
checklist: 81 rows.

Then:

1. **Run Orthograph's own checks** from the Orthograph checkout, never as part of `pnpm check`:
   `ortho model --root <this repo>/packages/blueprint` and `ortho check --root …`. They want an `ortho.config.ts` (copy
   `examples/work`'s). Record what they say in the DX log, including the refusals of `actor.of.*`, which are expected.
2. **Write `packages/blueprint/README.md`**'s map: every thing, where it lives, its machine, and its verbs.

## Phase 3: the delta, `packages/blueprint-delta`

One named proposal per file, each with what it is, why Co-worker needs it, the smallest declaration that covers it, and where in
Orthograph it would go. The numbers are already used in comments:

| | Proposal | Found in |
|---|---|---|
| D1 | A machine whose states are read from data: a kind's steps | inventory, question 1 |
| D2 | A projection of an actor into a database table: the work index, the chat list, a workspace's name in D1 | question 2 |
| D3 | A store inside another thing's actor: `actor.of.workspace`, `actor.of.work` | `stores/*.ts` |
| D4 | The co-worker as a principal: on, ask or off per operation, `stops`, never more than the person it acts for (C6, C10), `notVia(Via.agent)` | `workspace/roles.ts` |
| D5 | Moves only the loop makes (`Blueprint.system`): a thread's wait, wake and report; a work's finish | agents.md |
| D6 | Threads as forks of a work's conversation, and fresh checkers | the brief |
| D7 | Parked tools woken by signals: a person's answer, CI | the brief |
| D8 | Approval as a gate before a tool runs | the brief |
| D9 | A screen bound to an operation: `bindings.ts`, doing id to operation module, with `planned` marks. Phase 6's check reads it | the brief |

The delta may import `@coworker/blueprint` and `orthograph`. `scripts/check-packages.ts` already allows it. Add `packages/blueprint-delta` to
`typecheck` and `format` in `package.json`, as `packages/blueprint` is.

## Phases 4 to 6

The brief says it all. Two things learned so far:

- **The SDK imports the blueprint as types only** (`import type`). The check fails a value import, which keeps Effect out of the app
  bundle. Hand-derive the client's types from the blueprint, and log each one in `docs/blueprint-light/dx-log.md`.
- **Start the DX log now**, with what Phase 2 already found:
  - `emits` is required on every move, so every move needs its own event.
  - A role cannot do a lookup, so the workspace carries `people` to decide one.
  - There is no "inside another actor" store.
  - `Blueprint.text` refuses an empty string, so optional words need care.
  - `Principal` has no agent.

## Housekeeping

- Commit as the GitHub noreply identity (it is set in this worktree's config), with no attribution lines.
- Push with `git push origin HEAD:blueprint-light`. The local branch name differs.
- `pnpm check` needs `pnpm build` first on a fresh worktree: `check:ui` reads `dist/`.
- Don't run oxfmt on `docs/`. Don't edit `evals/`, `design/`, `packages/orthograph/`, or any `src/modules/*/types.ts`.
