# chat-host

The prototype's chat room, kept until the app is rebuilt to the canvas. Owns one room: the Durable Object that hosts a Pi session, its sockets, its alarm, and the copy of its chats and
documents it publishes to the directory.

Read `types.ts` for what others can ask of it, `internal/router.ts` for what a page can ask.

Invariants

- Only a provisioned object opens an engine. Guessing a workspace id creates nothing.
- The alarm is armed before work can start, so a process that dies mid-run is woken to resume it.
- A prompt is accepted once per request id. Limits (budget, queue) are never applied to one already accepted.
- Every chat change happens here; the directory only relays and shows.
- Deleting a workspace closes its sockets, stops its engine, and erases its storage.

Test: `pnpm vitest --run src/modules/manager`
