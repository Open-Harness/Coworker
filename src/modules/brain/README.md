# brain

What a manager thinks with outside the fake world: its **workspace's own model connection** (a provider key, its own
endpoint, ChatGPT), reached without the manager ever holding a key.

**How it works**

- `workspaceBrain` (a `MakeBrain`) gives pi-ai one provider, `workspace`, with one catalogue entry, `workspace-model`.
  Every conversation names that entry, so a workspace can change its connection and no conversation goes stale.
- Each call asks the Workspace object `modelRoute()` (which connection, in which wire format: no key, no provider
  address), points pi-ai's own OpenAI-completions or Anthropic-messages implementation at
  `https://models.workspace.invalid/<connection>/…`, and gives it a `fetch` that sends nothing but the path, the body and
  three plain headers to `modelCall()` on the Workspace object. The SDK's placeholder credential goes nowhere, and a
  request to any other host is refused.
- The Workspace object (`models.forward`) chooses the model, adds the credential inside `vault.use`, and streams the
  answer back. See `models/README.md`.

**Invariants**

- Nothing in this module, nor anything it stores, logs or returns, contains a key or a provider's address.
- When there is no connection, the connection fails, or the call throws, the manager answers in words (an ordinary
  `stop` message), so the person reads why in the chat. Nothing hangs and nothing is an error nobody shows.
- `ready` tells `provision` whether to start a manager at all: `NoModel` with the workspace's own reason.
- Which connection and model answer is not decided in `docs/old/model.md`: the first working connection, and the model
  `models/internal/route.ts` picks from it.

**Testing:** `brain.test.ts` drives the provider through pi-ai with a fake workspace link. The whole path, in workerd with
no network, is `src/flows/own-endpoint.workspace-model.test.ts`, which runs in the `workspace-model` Vitest project
(`DT_MANAGER_MODEL=workspace`), because the fast tier otherwise gives managers the script.

**Choosing a model.** `modelFor(choice)` names the choice inside a conversation's model id (`workspace-model@<connection>@<model>`, a name only); `relay` hands it to `modelRoute(wanted)`, and the route's model is the one the call carries. The catalogue entry is added when a run starts and again on restart, from the runs' recorded choices.
