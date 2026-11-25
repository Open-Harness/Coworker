# agent-config

Owns what an agent is: its config, what a valid one looks like, and how saved versions and deployments are described.

Read `types.ts`. Every module that mentions an agent uses these types; only `directory` stores them and only `agent` runs
them.

Invariants

- A config is whole: there are no partial configs, defaults to fill in later, or unknown fields.
- No secrets: a config is shown to everyone who can open the app.

Test: `pnpm vitest --run src/modules/agent-config`
