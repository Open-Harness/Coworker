# api

The console's whole HTTP surface under `/api/ws/<workspace>`, as one map of types, and the page's client of it.

Built. Pages load their data in the browser through it, and through nothing else. Every change is a doing (`/do`).

## Settled by the evals

- `Changed.reads` has paths with their parts filled in (`/shell`, `/m/ab12/board`), as the page asks for them. A workspace export (`workspace.export`) is one JSON file, at the link the doing answers, holding the workspace's rows as text (files by path) and no secret.
