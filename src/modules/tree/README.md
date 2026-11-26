# tree

The managers of a workspace, each under another. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec R1 to R3 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `tree` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- A manager may be made, moved or given a reach only if it is no wider than the one above it (or the whole, at the top); a wider one is refused, each wider thing said. Nothing is made under a retired manager. Moving under one that has less is either refused or narrowed to fit (then `narrowed` names it).
- When a reach is narrowed, everything below is cut to fit, all the way down; a limit a manager did not have stays absent. `narrowed` names the ones below that really changed. A reach given back above does not come back below.
- Pausing is of one manager only; a retired one can be neither paused nor go on. Retiring moves its children up to its own `above`, keeps it in the list as `retired`, and `work` is `up` or `ends`; ending needs a reason that is not blank.
- `under` is every manager below, at any depth, `null` meaning all; `above` is every one above it, not the co-worker.
- `roll` gives one row per node: its own row plus every row below it added; `is` is the loudest of its own and those below, in the order stuck, needs you, working, idle, paused (evals never put stuck and needs you together).
- What a retired manager had can still be read where it was. Work of its that was handed over has `ended` as _handed over_ there, and goes on under a new id where it went.
- `limit` of a row is the manager's `perDay`. A manager is made under another by `manager.make` with `above`; it is refused when its reach or `perDay` is wider than the one above.
