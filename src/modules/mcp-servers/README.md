# mcp-servers

The MCP servers a workspace added: tools without code, an address and a sign-in. [mcp](../mcp/README.md) says what may be added and what a tool starts at; this
keeps them, asks them what their tools are, and calls a tool.

`handle(call)`: `add` (a server: refused in words unless it is a public https address that answers with the sign-in given), `list` (every server, and every tool as a
model is offered it, named `mcp_<server>_<tool>`), `call` (one tool, by that name). Given: a store, `fetch`, the vault (`put`, and `use` for one call), a clock and ids.

## Invariants

- The secret is in the vault under `mcp:<id>`. It is read inside one call to the server and is in no answer, no view and no log. A server's `signIn.secret` is the vault's name for it.
- A server whose address is not public https, or is ours, is never reached. One that does not answer, or does not accept the sign-in, is refused in words and kept nowhere.
- Read-only tools start on; every other tool starts at ask. Whether a call may be made is the work's mandate's: a tool at ask parks and asks a person.
- A server speaks JSON-RPC in a POST and answers as JSON or as a stream of events; both are read.

## How to test

`mcp-servers.test.ts`, with a server that is a function of `fetch` and a vault of memory. The whole of it is shown by `evals/flows/rest.eval.ts`.
