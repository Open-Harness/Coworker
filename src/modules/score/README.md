# score

Owns the score: reading the evals out of the book (`docs/build-plan.md`), judging a run's test results against it,
and the ratchet. Pure: the composition root `src/bin/score.ts` runs the gates and the test runners, reads and writes
`status/score.json`, and prints.

Invariants

- The book is the only list of evals. An id the book lists twice is an error.
- A test whose name has the shape of an eval id (`kind:area/name`) but is not in the book is a problem.
- Two tests with the same eval id are a problem, and the eval fails.
- An eval with no test is `missing`, which counts as a fail.
- An eval whose tier did not run keeps its last result.
- A pass that becomes anything else is a regression (the ratchet).
- Any red gate makes the score 0. The eval results are still recorded.

Test: `pnpm vitest --run src/modules/score`
