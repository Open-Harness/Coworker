# @coworker/blueprint-delta

What Orthograph's blueprint language can't say yet, as named proposals. Each file has what it is, why Co-worker needs it, the
smallest declaration that would cover it, typed and used on Co-worker's own things, and where in Orthograph it would go.

- **Owns:** the gap between `@coworker/blueprint` and `orthograph` at 309a409, and `d9-bindings.ts`, which says which operation each
  doing and write path calls.
- **Invariant:** a proposal is data for a person to read. Nothing runs it, and no generator reads it. Only `d9-bindings.ts` is read
  by a check (Phase 6).
- **Test:** `pnpm typecheck` compiles every sketch against the real blueprint.

|                                | Proposal                                                                                               | Waits on it                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| [D1](d1-data-states.ts)        | A machine whose states are read from data: a kind's steps                                              | `work.move`                             |
| [D2](d2-projection.ts)         | A projection of an actor into a table: the work, thread and chat indexes, the workspace list           | `work.list`, `chat.list`, `thread.list` |
| [D3](d3-nested-store.ts)       | A store inside another thing's actor, and the vault                                                    | `stores/*.ts` and every thing in them   |
| [D4](d4-coworker-principal.ts) | The co-worker as a principal: on, ask or off, `stops`, never more than its person, `notVia(Via.agent)` | `workspace/roles.ts`                    |
| [D5](d5-system-moves.ts)       | Moves only the loop makes (`Blueprint.system`), and five person moves no doing presses yet             | every machine                           |
| [D6](d6-forks.ts)              | Threads and chats as forks of a conversation, and fresh checkers                                       | `thread`, `chat`                        |
| [D7](d7-signals.ts)            | Parked tools woken by signals: a person's answer, CI                                                   | `thread` and `work` waits               |
| [D8](d8-approval-gate.ts)      | Approval as a gate before an action call runs                                                          | `call`, `ask.approve`, `rule`           |
| [D9](d9-bindings.ts)           | A screen bound to an operation: 81 doings, 14 planned verbs, 17 write paths                            | the SDK and Phase 6's check             |

`ortho model` refuses five things in the blueprint today, all D2 or D3: see
[the DX log](../../docs/blueprint-light/dx-log.md#orthographs-own-checks).
