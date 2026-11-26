# reach

How far something may go: grants, limits, and the one way to make a smaller part. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec W3, B3, X3, M5, I12 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `reach` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- A limit equal to the one above is not wider, and a limit that is reached is reached when spent is the limit or more. A part with no limit of its own has the one above, and a reach above with no limit does not stop one below.
- `mandate` cuts what is asked to the reach and says each cut in `leftOut`, once each: an action to the permission above it, a limit to the limit above it, an account or place that is not above left out whole. `until` is there only when it was given.
- `narrow` lowers a limit the reach above lowered, never raises one, leaves `strength`, `because`, `version` and `until`, keeps a `stopped` or `taken back` mandate as it is, and drops an action that is no longer there instead of setting it off.
- A grant for `*` counts for every place of its account, and a grant for one place for that place only.
