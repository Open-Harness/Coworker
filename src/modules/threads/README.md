# threads

Conversations of the agent: what each is told and offered, and what its tools are called.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec H1 to H5 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `threads` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- A line of outside words (a message's text, or its author's name) is never the same line as one of the prompt's own; outside words come after a sentence that says they are from outside and not instructions.
- The offer: for `does`, the agent's own base tools plus its connector actions that the mandate (holding, at that account and place, or `*`) has on; the ones at ask are in `asks` (and may also be in `tools`). Checkers have exactly check, read, bash, skill; judges only judge; the co-worker in a chat only the chat tools. No place, no mandate or an ended one: no connector actions.
- A call that names more than the tool takes is refused or the extra left out; `set_up` needs an `event` key; a verdict's `fit` is from 0 to 1.
- Evidence is always by the agent and thread given, at the time given; what the model wrote of who it is does not count.
- What an agent is told as `todo` is the step's `does` word for word, then, when it was sent back, what was wrong. A checker's `todo` holds the diff of the work's branch against its base and every done-when. A line comment is told as `<name> on <path>:<line>, comment <id>: <text>` (digits only in the id). What an agent called, with its arguments, is part of what it was told when it is woken.
- `Offer.tools` has every action that is on or ask; `asks` is the part of it at ask. A call to one at ask parks. A number given as digits in text is a number.
- The `ask` tool parks as an action at ask does: the model is not called again before it is answered, and the answer is what the tool returns. `tell thread` with that answer is this, and not a second message.
