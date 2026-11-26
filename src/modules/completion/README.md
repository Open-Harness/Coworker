# completion

One call to a model that speaks OpenAI's chat completions, streamed: the words, the calls it made (their arguments arrive in pieces), what it
used. The call is given (`Call`): the workspace makes it with its credential, so nothing here holds or shows a key.

- A reply that cannot be had is a value, `Failed`, with the status and what the model said (cut), or `0` when it never answered.
- The thinking level goes as `reasoning_effort` (`low`, `medium`, `high`), for any model; `off` sends none.
- `usage.input` is the tokens not cached, and `cached` those that were, as `choosing` prices them.

Test: `completion.test.ts`, with a stream of memory.
