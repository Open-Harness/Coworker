# measures

An objective against its line, and what must not get worse. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec O1, O2, O9 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `measures` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- A reading counts when its `of` plus `settles` is at or before now; of two readings with the same `of`, the one with the later `at` counts.
- The line stays at `before` until the start and at the aim from its date on; the date is the start of the day it names, in UTC.
- At the line is on its line; at the aim or past it (the better way) is reached.
- `since` is the `of` of the first reading of the unbroken run that stands as now does, each judged against the line where it was read; `before` is the value of the reading just before that run, or null.
- Without a `before` value, or without a reading that counts, the standing is Not yet.
- `lost.most` is the step that lost the most in absolute number, the first on a tie, null when nothing was lost.
- A measure may not be a measure when the manager may write, on the same account, a field whose name is a word in the query.
- A listed limit is fine at the limit itself.
