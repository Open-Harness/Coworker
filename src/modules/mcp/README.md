# mcp

MCP servers: tools added without code.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec X13 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `mcp` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- Our own addresses are `co-worker.tech` and everything under it. Hosts ending in `.localhost`, `.local` or `.internal` are private, and so are addresses that a browser reads as a private number (also written as a whole number, in hex or in short form).
- A new tool, or one whose words or read-only claim changed, is at ask, also a read-only one; a tool that left and came back is new.
- A name the model sees is `mcp_<server>_<tool>` with anything outside letters, numbers, `_` and `-` made into `_`; two different pairs may give the same name.
- A server is an account whose id is the server's `id`; its place is `*`; its tools are the actions `mcp_<id>_<tool>` (the name the model sees), set to on, ask or off in a grant like any action of a connector.
