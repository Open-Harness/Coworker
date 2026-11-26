# setting-up

A manager set up from a sentence, as it goes on (spec S1 to S9). `walkthrough` says what may happen in each step; this module is how the co-worker
and the person take them.

A person says what they want to get to. The co-worker (`turns`) answers with one event at a time through its `set_up` tool: each is narrowed,
checked by `walkthrough` and, for a draft, by the playbook's own check, and anything refused comes back to it in words with the file and line. The
person answers it (`answers`, `connected`, `skipped`, `that is wrong`) and the co-worker is asked for the next. Nothing is made before ten cases are
judged and a yes (`make it`): then the manager is made from the draft, with the cases judged as its first evals, and read access ends.

Given: where set-ups are kept, the co-worker's conversation, the models and a call, a check of a draft, how a manager is made, and where a comment
goes. Nothing is read from anywhere.

## Invariants

- An event is kept only after it was checked: a refused one changes nothing. `by` is who spoke, never what the page sent.
- The co-worker cannot say what is the person's (`make it`, `answers`, …); the person cannot say what is the co-worker's.
- What a person wrote reaches the co-worker between marks that say it is theirs, with its line breaks put as `/`.
- A set-up that ended (made, thrown away, carried by another) takes no more events.

## Not yet

Reading the past through a connection (`read the past`) is not done: a connection is recorded and ended, and the co-worker says what it found from what it
was told. A failed turn (no model) is reported to the one who started the set-up only as a note.

## How to test

`setting-up.test.ts`, with set-ups of memory and a model that answers from a script. The whole of it is shown by `evals/flows/set-up.eval.ts`.
