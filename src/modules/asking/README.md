# asking

What waits for a person: kept, shown in their inbox, answered once from anywhere, reminded, and told to whoever asked. One way, for any
kind of thing asked (a question, an action that waits for a yes, a limit that was reached, a model that stopped, an MCP tool). Spec A1 to A6.

Pure over `AskStore` (the workspace's object keeps the rows, `workspace/internal/asks-store.ts`) and a `tell` that says to whoever asked
"it was answered". Over `asks` (the pure rules of one ask).

## How it goes

- Whoever asks gives the ask an id of its own (made from what it is asking about). Asking again with it finds the ask that is there.
- The answer is kept first and told second. A tell that could not be made is made again at the next `tick`; the answer is never lost.
- An answer from the inbox (`answer`), from a comment on the thread it was asked on (`heard`: the words, without who they speak to and the
  stop at the end, are an option's label or id), or from silence (`else`, a decision only) is the same answer: the first counts, the next is `Late`.
- A comment answers for the one asked when the place proves who wrote it; where it cannot (a GitHub login is not a person here), whoever the
  place says may act there. Everything else in the comment is outside words and grants nothing.
- `tick` does each step once: a reminder, then each stand-in, then `else`. After any number of days an ask has been reminded once.
- `always` makes a rule (`covers`) only for an approved action: an approval has the answers `yes` and `no`, and only `yes` is repeated.

## Invariants

- Silence never approves: `else` is only for a decision that shows nothing.
- Only the one asked, their stand-ins and an Owner may answer; another member is `Refused` and does not see it.
- A work that ended is not asked any more (`gone`).

## How to test

`asking.test.ts`, with a store of memory. The whole of it is shown by `evals/flows/asks.eval.ts`.
