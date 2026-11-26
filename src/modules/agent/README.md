# agent

How an agent runs: the loop. One pi-durable Harness in each manager's Durable Object.

Not built. `types.ts` is the contract and compiles; `service.ts` answers `NotBuilt` to every call, as a value.

## What it must do

- **One Harness per manager's object,** over the object's own SQLite (`openDurableObjectSqliteStorage`). pi-durable's `onWake` arms the object's alarm, and `alarm()` calls `resume()`. See pi-durable's README, "Sleeping and Waking Up".
- **A piece of work is a conversation.** A thread that does the work is a fork of it at the playbook page. A thread that checks is a fresh conversation that has not seen the doing.
- **Every tool is a pi-durable tool,** and every call is a durable task. Read, write, edit and bash run in the work's box through `env(work)`, an `ExecutionEnv`. Connector actions (GitHub, mail, MCP) are tools too. A tool that fails gives the model an error result. It never becomes a silent wait (postmortem, 26 November).
- **A wait for the outside is a parked tool woken by a signal,** never a poll. That covers a person's answer (`signal` with the ask's key) and CI. An action set to ask is a `beforeTool` gate parked on the person's yes.
- **A checker is an `onYield` hook task.** Publishing after the checks pass is an `afterRun` hook task.
- **Every model call goes through pi-ai** (`models.pi`), so Anthropic, OpenAI and Google are each spoken to in their own format. Spend is pi-durable's `pi.usage`.
- **Telemetry is the Harness's `telemetry` option,** through `telemetry`. Every turn, tool call, park and failure is a span.

## Orthograph

This is the loop of Orthograph's agents design (`design/frame/examples/agents.md` in Open-Harness/orthograph). There, `Agent.open` runs Pi Durable behind a seam, the lifecycle is a declared machine (here, `work`), and each model provider is an adapter (here, `models`).

One difference is still open. Orthograph puts one Durable Object per run. The plan (`docs/github-plan.md`) puts one Harness per manager's object, with threads as forks. Settle it with the Orthograph goal before building.

## Wiring

Until it is built, the composition root passes `noAgent` to the workspace object, each manager's object and the console. Once it is built, `main.ts` builds `createAgent` inside `ManagerStore` over `ctx.storage`, and `worlds.test.ts` lists `createAgent` among the real things the roots build.
