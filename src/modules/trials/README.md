# trials

Cases, the weakest part, one change, and whether to keep it. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec O3 to O8 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `trials` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- `of` in a score is the number of different cases; a case run again counts once, and `spread` is 0 when every run again gives the same result and above 0 when they differ.
- A line of an eval is a value to reach or pass: a part is below its line when `now` is under `line.value`.
- The weakest part is the one with the largest (line minus now) times `seen`; the first on a tie.
- Better means the share of cases passed rose by more than the larger of the two spreads; equal is not more.
- "Nothing that passed fails twice" is read as: any case listed in `differ` that passed before and fails next stops it.
- `mayAlone` goes by the line: `page`, `page/<heading>`, `agents/<id>/told`, `agents/<id>/model` and `skills/<id>` are alone; any other line, also an unknown one, is asked; all changes must be alone.
- A skill stays only when its share of passes is higher with it than without it.
- Two inputs for `caseOf` are the same case when every field is equal; it then returns the case that was there.
- `held` ignores the `held` flags: it chooses half of each part's cases (the lower or upper half of an odd number) by the cases alone, not their order; a new case's `held` is whether `held` picks it among the existing ones and itself.
- A judge agrees at 18 of 20, exactly 9 in 10, and not below 20 judgements.
- Each week the co-worker is woken with the weakest part and its cases, and proposes one change to it with `act` `try.change`; `part` is the `Change` as JSON (`{ line, was, becomes }`). It is tried on the same cases beside what is there. A change that is not better by more than the spread is never made, also on a line `mayAlone` allows; it stays a proposal (rail `proposes`, an ask for a review) with its comparison.
