# choosing

Which model answers, what it cost, and whether there is room. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec M1 to M5, C11 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `choosing` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- A model that is not among the connected ones counts as one that does not work.
- A fall-back goes to the next level above (agent, manager, workspace) that names a model that works, with that level's thinking.
- `input` in a usage is the tokens not cached; `cached` ones are priced at the cached rate.
- A limit is reached when spent is at least its most, and near when spent is at least `tellAt` times its most.
- `parts` cuts every ask by the same share when the whole is not enough.
- `mayFallBack` is false until a person turns it on (nothing does yet): a manager's call to a model that stopped working does not go to another one, it waits, and the person is asked once, naming the model. (`route` in `models` still falls back, for who asks it to: the chats of the spike. A manager's call does not go through that.) The thinking level goes to an OpenAI-compatible endpoint as `reasoning_effort` (`low`, `medium`, `high`), also for a model not known to think; `off` sends none.
