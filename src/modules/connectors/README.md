# connectors

The contract every connector keeps, and the list of them.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec X1 to X16 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `connectors` in [docs/book.md](../../../docs/book.md).

GitHub and mail are read by [github-events](../github-events/README.md) and [mail-events](../mail-events/README.md): `receive` checks the signature, calls their
`read`, and makes one Item of what was heard, its id from `same` or the Message-ID. What work hears later is `told`, not a second Item.

## Settled by the evals

- The data files in `evals/rules/data` are the agreed list; the evals allow more connectors, events and actions than are in them, but not fewer, and hold every action to the same rules. `to` of a mail is text. A call that gives a fixed part is refused, saying which one; only the call's own keys count, not inherited ones.
- An action that is not outside starts on; merging, closing, cancelling, rebasing, running checks again, sending outside or by template, starting a thread and adding a lead never start on.
- A pull request opened for work from an issue has `Closes #<issue>` added to its body by us; the model's body is kept. `github.read.what` is `issue`, `pull`, `files`, `checks` or `log`; `log` is the log of the failed check of the pull request the work follows, `number` defaulting to it.
- A pull request is known to conflict when GitHub says `mergeable` is false (asked, `GET /pulls/<n>`); a push to the default branch wakes work whose pull request now conflicts, and its thread is told it conflicts. A push that leaves it merging wakes nobody.
- While an account is suspended GitHub sends nothing, and not later. When it works again the connector reads what it missed from GitHub (reviews, comments, line comments and checks of the open pull requests since it stopped) and receives them as it would a delivery, so nothing is lost.
- Ours coming back (its comments, its pull request, its push) is `Noise`: kept, not judged, and not a row of intake. A mail whose proof fails (`proof.proven` false) is kept as a `Left` row that says it is not proven, and is never judged or asked about.
