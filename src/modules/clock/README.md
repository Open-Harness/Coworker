# clock

Owns time and ids. Everything that stamps a time or makes an id takes a `Clock` or `Ids` as a dependency, so tests
can fix them. `service.ts` has the real ones; `testing.ts` has a clock that only moves when told and ids that count.

Test: `pnpm vitest --run src/modules/clock`
