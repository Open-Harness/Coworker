# coworker

The one identity of a workspace, and how it speaks.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec C1 to C13 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `coworker` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- A group of people fits by: `team` when the person is inside, `customers` when a customer, `leads` when a lead, `anyone` always, `{domain}` when the person's domain is exactly it; the first in the list that fits counts.
- The weekly look and the morning list are triggers of the co-worker with its own model (the workspace's); it works through the same tools as in a chat (`look`, `act`), and its morning list is one `know` ask each day with something waiting.
