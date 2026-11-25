# schedule

Owns instructions a chat receives later: the `schedule` tool, the durable delivery task, and recurrence.

Invariants

- A delivery sleeps inside the engine, holding nothing in memory; the object's alarm wakes it.
- The next occurrence is created in the same commit that starts the current one.
- A delivery is submitted with its schedule id as request id, so a crash never delivers twice.
- A delivery cannot schedule another one (no runaway loops), and repeats are at least 5 minutes apart.

Test: `pnpm vitest --run src/modules/schedule`
