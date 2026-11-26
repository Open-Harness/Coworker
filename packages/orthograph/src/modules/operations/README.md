# operations

Owns `Blueprint.operation`, `Blueprint.read` and `Blueprint.step`: what can be called, with its payload, answer,
move, declared errors, who may call, steps (named by key), idempotency and budget. `PayloadOf`, `AnswerOf`, `ErrorOf`
and `StepsOf` read the types a handler and a client work with. Test: `operations.test.ts` (with type tests).
