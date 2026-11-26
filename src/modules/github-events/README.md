# github-events

What GitHub's deliveries and answers say, what is true because of it, and what became true.

Not built. `types.ts` (with `records.ts`) is the contract and compiles; `service.ts` says so where it is called. What it must do: spec X2, X7,
X15 in [docs/spec.md](../../../docs/spec.md). What shows it: the evals under `github-events` and `github-state` in
[docs/book.md](../../../docs/book.md). Why it is so, with what was measured: [docs/spikes/real-events.md](../../../docs/spikes/real-events.md).

## How it is used

Pure. The `github` connector checks the signature and stores the raw delivery; then, in the workspace's object:

```ts
const read = githubEvents.read(event, payload, us); // Heard | Account | Noise | Broken
const after = githubEvents.keep(before, read.records); // newest of each, stored
// numbers: read.numbers, and withHead(after, read.sha) for a check, which names a commit only
for (const n of numbers)
  for (const told of githubEvents.told(before, after, n, us)) {
    const event = githubEvents.asWork(told, thread); // to the work that follows this item, keyed by told.key
  }
```

- An item nobody follows goes to intake: one Item for a `Heard`, with `same` as what makes it once.
- **A delivery that was missed**, `sure: false`, or starting to follow something: ask GitHub, and `asked` gives the same records. There is no second path.
- `waits` is what the board shows; `told` is what wakes work. Nothing else reads a payload.

## Settled by the evals

- A verb (`synchronize`, `closed`) is never applied as a step. A delivery is read for the whole records in it.
- The newest of each wins by GitHub's time, then by rank. Its times are whole seconds, so ties are normal: ranks settle what GitHub does in one second (a check queued and done, a review given and dismissed), and a real tie says `tied`, and the state `sure: false`.
- A check run again has a new id, and the newer id wins, even when the older one ends later. Cancelled, stale: neither passed nor failed.
- A review of an older head is told with `onHead: false`, and is not what merging waits for.
- What was not known before is not news. What we did ourselves is not told, but that it ended.
- The key of a told thing is of the thing: the same comment heard twice, or heard and asked, has one. A head that moved back to an earlier commit is told again.
