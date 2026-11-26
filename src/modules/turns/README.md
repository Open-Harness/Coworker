# turns

The co-worker's own turns: one conversation, a model, and the tools it may call. Used to set a manager up from a sentence and for the weekly look.

A turn asks the model (the workspace's own choice), does what it called and answers each call in words, and asks again, until the model says
something without calling, or no model can be had. Messages are kept as they are made through `TurnThread`, so a lost object goes on from the last
one: a call that was made and not answered is answered first.

## Invariants

- A call to a tool it was not offered, or with arguments that are not JSON, is answered in words and nothing runs.
- A tool answers in words, never by throwing; what it did is in its answer.
- At most 40 model calls in one go.

## How to test

`turns.test.ts`, with a thread of memory and a model that answers from a script.
