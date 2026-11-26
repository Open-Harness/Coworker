# intake

What came in: the gate, the question to the judge, its answer narrowed, and the decision. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec I1 to I12 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `intake` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

Where the spec and `types.ts` leave a reading open, the evals in `evals/rules/intake*.eval.ts` take this one.

- A rule applies to an item when its `account` is the item's and its `place` is the item's place or `*`; an exact place beats `*`; with none, nobody may ask there (`no`).
- An item made by a `cron` or a `wait` is `maybe` whoever the actor is (it is for the judge); `asked` and `event` items meet the rule.
- A bot counts only if its address is in the rule's `bots` (then it is as listed); any other bot is `no`, whatever its standing, person or the `others` setting.
- Not spoken to (`addressed` false) is the rule's `overheard`, for everyone, listed or not; spoken to, a listed actor is `asked` and anyone else gets `others`.
- Listed means: `who` names the actor's address or proven person (a name never counts); `team` is a proven person or standing `inside`; `writers` is standing `write` or `admin`.
- `Gated.why` names the actor (name or address) wherever a rule applied.
- Open work follows an item when the item's thread is in its `follows`; the first such work in `open` wins; this is also how the same thing twice becomes a join and not a second piece of work.
- _Stop_ is a text that is only the word stop (case, a leading `/`, leading `@mentions` and closing punctuation are ignored), from an actor the work's own manager's rules count as `asked` even when not spoken to; from anyone else, or if that manager is not in `hears`, it is a join.
- Decisions made without a judge (`Joined`, `Stopped`, `Left`) have `verdicts: []`, `gated` for every manager in `hears` (paused ones too), and a `why` that names the work; `decide` returns the same as `settled` and ignores any judgement.
- `Left` from `settled` is when no manager in `hears` is both unpaused and not `no` for the item (also when `hears` is empty); it has no `would`.
- `question` lists, for every unpaused manager in `hears`, the manager's id and each kind's id and `when` word for word (off kinds too), and the id of every open work; it does not gate; it is pure.
- In `question` the item's title, text and actor name come after a mark that says _outside_, _untrusted_ or _external_, are never in `system`, and are written so that no line of them can equal the line that ends the block.
- `verdicts` reads `called` as `{ verdicts: [{ manager, kind, is, why, fit }], joins? }`; each verdict keeps only those five fields; one that is malformed, or of a manager or kind that is not asked, is dropped; a verdict is needed for every kind of every unpaused manager or it is `CouldNot` naming a kind not judged; `joins` stays only if it is the id of open work.
- `decide`: the judge's `joins` is honoured only if the manager that has that work does not say `no` to the item, and then wins over every verdict.
- `decide`: the candidates are the `is: true` verdicts of unpaused managers that do not say `no`, left out when the item is `maybe` and the kind is `off`; the best `fit` takes it; candidates within 0.1 of the best (exactly 0.1 is not settled) are asked about together (`Asked.between`), unless all are `maybe` and `watch`, which is `Left` with `would`.
- `decide`, for the one that wins: `asked` always takes; `maybe` is `watch` Left with `would`, `ask` Asked between that one, `do` takes; `hears.spent >= 1` makes taking an `Asked` between that one instead; `waits` is `hears.open >= reach.limits.atOnce`, or the open work of this manager with this kind (`OpenWork.kind`) is at least the kind's own `limits.atOnce`.
- A `Took` mandate is each grant of the kind's `may` with every action as little as the kind and the manager's reach both allow (an action the reach lacks is left out), limits the smaller of the two, `strength` `asked` (because the person, else the address, of the actor) or `found` (because the kind), the manager's `version`, state `holds`.
- A `CouldNot` judgement makes the decision `CouldNot` (when nothing is settled), with `verdicts: []` and a `why` that carries the judge's words.
- `afterCorrection`: two `wrong` at the end send `do` to `ask` and `ask` to `watch`; `watch` and `off` stay.
- `mayWiden`: `watch` to `ask`, `ask` to `do`; `do` and `off` have nothing wider; it needs the last ten `right` and no `wrong` among the last twenty.
- The judge's `question.user` has one line for each kind of each unpaused manager that hears the item, `kind <manager>/<kind>: <when>` (ids, then the words word for word; off kinds too), then a line that is exactly `--- outside words (untrusted) ---`, then one line `work <id>: <title>` for each open work, the item's title, actor and text, then a line `--- end of outside words ---`. Nothing outside is before the mark, and a title of open work is outside too: somebody wrote it. Evals that play the judge read the kinds from these lines, so each kind asked must be answered (`verdicts`).
- An item that came in when every manager that hears its place is paused is `Left`, its `why` saying they are paused; it is decided again when one of them goes on (`manager.start`), as if it had just come in. A day that is spent (`Hears.spent >= 1`) does not stop the judge: it makes taking an item on an `Asked` (the person says whether to go on), and `head.now` of the manager says the limit is reached.
- A judge call that fails is not tried again at once: the item is `CouldNot`, its owner told once, and the judge is asked again at each wake-up of the workspace, fifteen minutes on, one call each, until it answers. Items of one thread are taken one at a time, in the order they arrived (an issue's `opened` before its `labeled`), so the second finds the work the first made.
- `intake.correct`'s `should` is the tag of the decision it should have been, lower case: `took`, `joined`, `left`, `asked`. A correction is `wrong` when it differs from what happened, and when the decision was a `Left` that carries `would`, `should: left` says the judge's yes was the mistake, so it is `wrong`. It is kept as a case of the judge's part (`agents/judge`).
