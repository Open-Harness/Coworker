# agents

Owns what a saved agent is: every setting it has and what each may be. Pages and the server both use it.

Read `types.ts`. `AGENT_SETTINGS` is the one list; `AgentConfig` is its type. To add a setting, add it there and to
`BLANK_AGENT`. What then does not compile is the rest of the work: its control in `team-build/internal/AgentFields.tsx`, and
what it does to a conversation in `agent-engine/internal/settings.ts`. Saving, versions, HTTP, the decoder and what a run takes
need no change. A tool marked `built` does not compile until the worker has it.

Invariants

- A config is whole: no partial configs, and no setting that is not in `AGENT_SETTINGS`.
- `checkAgentConfig` is for what someone sends and refuses with a reason in words. `readAgentConfig` is for what was saved
  and always opens.
- What only a workspace knows (its skills, environments and models) is checked where they are: `settings`.
- A config names an environment, a model and skills; it holds no secret.

Test: `pnpm vitest --run src/modules/agents`
