# walkthrough

Setting a manager up from what someone says: the steps and what may happen in them. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec S1 to S9 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `walkthrough` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- The stage is "first questions" after the first round is asked, "connect" after what it wants is said, "found" after the findings, "second questions" after the second round, "draft" after the draft; "made", "thrown away" and "carried by another" end it, and then every event is refused.
- Answers go to the latest round, and only for its own questions. A question with nothing in `changes`, or with an empty `best`, is refused; so is a want that leaves `reads`, `tells` or `without` empty, and a finding with an empty `from`.
- `does` has "read the past" for a connection, "make manager" and "end read access" for Make it, "end read access" for Throw away. Everything else does nothing.
- Make it needs at least 10 cases with a `said`, each case counted once; `made` is then a non-empty id. Connected wants become "ended" when the walkthrough is made or thrown away.
- A person's edit is kept in the draft's `because.yaml` as `you said` with their name; `because` reads that file. `score.idle` are the questions answered with their best or not answered at all; `kept` is every line when nobody edited.
- The co-worker is asked for the next event, with the `set_up` tool, after `said`, after each `answers`, `connected` and `skipped`; each call is one `WalkEvent`, a `Refused` comes back to it in words (with the problem's file and line), and it may call again in the same turn. `could carry` leaves a comment on the manager's page (line `page`) whose text is the `change`, and nothing else is made.
