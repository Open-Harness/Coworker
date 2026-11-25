# transcript

Turns the engine's conversation view into what the page draws, and owns the entry kinds this app adds:
`app.user` (a prompt with its author) and `app.scheduled` (a due instruction).

Invariants

- Pure: no I/O, usable on the server and in the browser.
- The author comes from the entry's data; the text the model reads is asked only when there is none.
- A tool call shows its stored result, else its live progress, else pending while a run exists.

Test: `pnpm vitest --run src/modules/transcript`
