# DX log: what writing the blueprint, and hand-generating from it, felt like

The spec for Orthograph's generators, as [the brief](../prompts/blueprint-light.md) asks. Phase 2's friction with the language is
first. Phase 4's table, one line per hand-written artifact, follows it.

## Phase 2: writing the blueprint

| Friction | Where it showed | What Orthograph could do |
|---|---|---|
| `emits` is required on every move, so every move needs its own event, even `trigger.on` or a call's `approve`, which carry only an id | every `events.ts` | Let a move default to `<Thing><Move>` with the thing's id, and require `emits` only when an event carries more |
| A role cannot do a lookup, so the workspace carries `people` (person id to role) to decide `member`, `builder` and `owner` | `things/workspace/roles.ts` | Let a role read a second thing (`member` rows), or declare membership as a relation |
| There is no store inside another thing's actor. Most of Co-worker's state is rows in the workspace's object or a work's object | `stores/*.ts` | Delta D3 |
| `Blueprint.text` refuses an empty string, so a field that may be blank (a trigger's `only`, a thread's `under` before it forks) has no honest value | `values/coworker.ts` | An `optional` field mark on a thing, as list payloads already have |
| `Principal` is a person or anonymous, with no agent, so nothing says "the co-worker, acting for Bo" | `workspace/roles.ts` | Delta D4 |
| `lives` takes a store value (`lives: workspaceStore`), as hoped. The handover's fallback to the `of` string was not needed | every `thing.ts` in a store | none |
| A list read answers every field, so a secret field (a key's `value`) relies on its `secret` mark to stay out of the answer | `things/key/verbs/list.ts` | Refuse a list over a thing with a secret field, or say that the mark drops it |
| An event's fields must have the same names as the thing's or the payload's fields, or nothing fills them. `ortho model` caught `AccountLent.by`, and `tsc` did not | `things/account/events.ts` | Check it in the types: an event field's key must be a key of the thing, the payload or the answer |
| A move whose `to` is a list (`decide: to: ["kept", "used"]`) needs a payload field that picks the outcome, and nothing ties the two together | `trial/verbs/decide.ts`, `item/verbs/approve.ts` | Let a move name the payload field that chooses its outcome |
| Steps are data, so `work.move` has no `move:`, and the compiler can't check a step is one of the kind's | `work/verbs/move.ts` | Delta D1 |
| A thing with no machine is still reported as having none; a thing like `playbook`, whose versions are rows, has no way to say so | `things/playbook` | A `versions` mark: every save is a new row, and a read takes `version` |
| A doing pressed in many places (`conversation.write` from four connector views) has one operation and no declared doors | the connector verbs | Delta D9 |

## Orthograph's own checks

Run on 27 November 2026 from an Orthograph checkout at 309a409, the vendored commit, with
`node packages/cli/src/main.ts model --root <scratch>` and `… check --root <scratch>`. The CLI wants `<root>/blueprint/things`
and `<root>/ortho.config.ts`, while ours is `packages/blueprint/things`. So the root was a scratch folder outside git, with
`blueprint/{things,values,stores}` linked to this package and a config copied from `examples/work`. Linking the whole package
does not work: the CLI walks into `node_modules` and tries to load Effect's `.ts` docs.

**`ortho model` on the blueprint as it is** refuses five things, all of them expected:

```text
blueprint/things/chat/verbs/list.ts: a list read needs a thing that lives in the database, and chat lives as actors
blueprint/things/work/verbs/list.ts: a list read needs a thing that lives in the database, and work lives as actors
blueprint/stores/vault.ts: a store of kind "vault", which no host of this project supplies (they supply database and actor)
blueprint/stores/work.ts: a store of kind "actor.of.work", which no host of this project supplies (they supply database and actor)
blueprint/stores/workspace.ts: a store of kind "actor.of.workspace", which no host of this project supplies (they supply database and actor)
```

The two lists are delta D2, and the three stores are delta D3, with the vault as a third store kind. The first run also found
`AccountLent.by`, an event field nothing fills. That was a real mistake, and it is fixed.

**`ortho model` on a probe** accepts the rest. The probe is a copy with the three stores changed to `Blueprint.store.database()`
and the two list reads removed. It names 29 things and 136 operations and reads, each with the refusals it generates: the
declared errors, `<Thing>NotFound` for each id in the payload, `<Thing>Not<State>` from the machine, `NotAllowed`, and
`IdempotencyConflict` for every operation marked `idempotent`.

**`ortho check` on the probe** reports:

- 0 blanks.
- Rules pass.
- 0 ratchets.
- Drift fails for the 754 files `ortho generate` would write. Nothing is generated on purpose: Phase 4 writes them by hand.
- Types fail only because the scratch root has no `tsconfig.json`. `pnpm typecheck` compiles the package itself.

## Phase 4: hand-generated artifacts

| Artifact | Derived | Mechanical or judgement | Friction | Generator |
|---|---|---|---|---|
