# journeys

Owns `Blueprint.journey`, `Blueprint.startingWorld` and the checks a step makes (`expect`, `emits`, `noEvents`,
`refuses`, `spans`; `machine.isIn` lives with machines). Everything is a plain description: values the world gives
later (`s.world.x`, `s.<name>.person`, `s.last.x`) are refs, read by `prove` through `Scripting.resolve` once the world
has said them. `last` is the most recent call's answer, so a step's checks see that step's own answer.
Test: `journeys.test.ts`.
