# agent-engine

Owns how a kind of agent becomes a conversation: one value (`AgentKind`) in, an extension and `configure` out. It is server
only and knows pi-durable; what a saved agent is comes from `agents`.

Read `types.ts`. The kinds are in `manager/internal`: `manager-agent.ts` and `worker.ts`, listed in `engine.ts`.

Invariants

- `configure` is the only place a conversation of a kind is configured.
- Every setting of a saved agent is used or named as used elsewhere (`internal/settings.ts`), and every built tool has a
  registration in each kind with `chosen`. Missing either does not compile.
- A kind's name is stored in its conversations and is never renamed.
- With no saved agent a conversation has every chosen tool, the workspace's model and no instructions of its own.

Test: `pnpm vitest --run src/modules/agent-engine`
