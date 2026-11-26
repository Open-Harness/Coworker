# connection

Owns one socket from a page to the server: reconnecting, joining split messages, and matching commands with results.

Invariants

- Nothing is sent before the server's snapshot, and what the page had open is restored before waiting commands.
- A lasting command keeps its id until it is answered, across any number of sockets. A read fails when the socket drops.
- A page that cannot read the server stops and asks to be reloaded.

Test: `pnpm vitest --run src/modules/connection`
