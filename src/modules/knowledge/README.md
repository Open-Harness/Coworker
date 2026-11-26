# knowledge

Notes and corrections, with who said them. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec C9, O8 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `knowledge` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- The co-worker's own notes (no `for`) are told to every manager's agent; a note for a manager without `tree` is told to that manager only, with `tree` to it and everything below it.
- A private note is told only when the one it is private to is the only person the agent speaks with.
- "Say the same" is the same words once spaces at the ends are taken off; of two the one with the later `at` is told, and on a tie one of them.
- Two notes clash when they are kept, of the same manager (or both the co-worker's), and, with case, end punctuation and a leading Always, Never, Do not or Don't taken off, say the same while one has Never, Do not or Don't in front and the other has not.
- A note is stale when its last use, or its `at` when it was never used, is 90 days or more before now, and it is kept.
- `mayPropose` is true exactly when the correction is from someone inside.
- A `note` an agent makes while working on a comment from someone inside the workspace is also proposed as a change to that agent's `told` (a comment on `agents/<id>/told`, `became` `Change`, `by` the one who commented, its text the note's).
