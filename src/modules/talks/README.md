# talks

A chat of a person with the co-worker, as the workspace keeps it, and as a page is shown it. Pure.

Invariants

- A chat waits (`state` "waits", `waitsFor` the one asked) exactly while one of its lines has an ask that has not been answered.
- A fork is listed under the chat it was forked from, with how many lines it has of its own.
- The co-worker's lines are by `coworker`; a person's are by that person's id.

Test: `pnpm vitest --run src/modules/talks`
