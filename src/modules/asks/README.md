# asks

What waits for a person, by when, and what silence means. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec A1 to A6 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `asks` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

Where the spec and `types.ts` leave a reading open, the evals in `evals/rules/asks.eval.ts` take this one.

- `ask` refuses: no person in `to`; an `approve` that shows nothing; any need but `know` with no date or a date that is not after `at`; a `best` that is not one of the options. It keeps the input as it was, with `at`, `reminded` 0 and state `Open`.
- `else` can be an option only on a `decide` that shows nothing (`shows` null) and only an option that is there.
- `answer` is `Refused` if `may` is false, if the ask is `Gone`, if the answer is empty, or if the ask has options and the answer is not one of their ids; an ask already answered gives `Late`, the ask unchanged, `says` naming who answered and where. An answer after its date still answers.
- `due` is `Nothing` for an ask that is not `Open`, has no date, or whose date has not come. Otherwise it goes by `reminded`: 0 is `Remind` of `to`, then each person of `then` in turn is a `StandIn`, then `Else` if `else` is an option (once), then `Nothing`. Whoever uses it adds one to `reminded` each time it is done.
- `whom` takes, in order, `answers`, `lender`, `asked`, then `owners`, and the first who is not away; if all are away, the first of them.
- `covers` is true only for a rule that is `on`, of the same action, and whose thread, person or kind is the use's.
- `afterUse` counts `right` or `wrong`; a wrong use after a wrong one sends an `on` rule to `back to ask`; `back to ask` and `taken away` stay as they are.
- An ask made from a tool call or a to-do without a date is due one day after it is made and has no stand-in unless `answers` of the work names one; a wake-up of the workspace runs `due` once for each ask, so after any number of days it has been reminded once.
- A comment on the thread of the work, by the person it was asked, whose text without leading `@mentions` and closing punctuation is an option's label or id (case ignored) answers the ask with `where` `github`; the second answer, anywhere, is `Late`. `Shows.where` is the thread: `<repo>#<number>` for GitHub.
