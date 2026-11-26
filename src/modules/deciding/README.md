# deciding

What came in, decided: in the order it came, one at a time, so that the second item of a conversation finds the work the first made.

For each item: who it is (the connector says whether they may write where it came from), then `intake.settled` (follows open work, says stop,
nobody lets it in), else a judge, then `intake.decide`. A manager that took it is given it (`take`, once per item); work that follows it hears it
(`heard`). The decision is kept with the item, and so is the time to ask again when the judge did not answer.

An item that says one of the options of an ask made on its thread (`answered`, given) is that answer and not a new thing: it is kept as `Joined` to the work that asked, and is not handed on.

Given: the store of what is pending, the managers' objects, the models and a call to one, `standing`, a clock. Nothing is read from anywhere.

## Invariants

- An item is decided once. A crash between handing it over and keeping the decision hands it over again, and `take` and `heard` are once per item.
- A judge that does not answer decides nothing: the item is `CouldNot`, and comes back fifteen minutes on. Nothing after it in the order is decided first.
- What the judge says is narrowed (`intake.verdicts`) and what is decided is code's. The judge has one tool, `judge`.

## How to test

`deciding.test.ts`: a store of memory, managers of memory, and a judge that answers from a script.
