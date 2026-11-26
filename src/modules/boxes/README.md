# boxes

One container per piece of work, and how a branch leaves it.

Built (`createBoxes`, over the manager's own storage). What it must do: spec H6 to H10 in [docs/spec.md](../../../docs/spec.md). `BoxHost` is the outside thing; Cloudflare Containers
stand behind it on staging (the spike's `sandboxes` has the calls), `boxWorld` in `evals/world` in the evals. What shows it: the evals under
`boxes` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- `most` is the largest bundle allowed; the evals only use bundles that are over it, or at or under it, in files and in bytes alike. A path with a leading `./` or a doubled slash is still the path it names.

## How it is built

- `createBoxes({ sql, host, clock, place })`: `place(work)` finds what a container is made from when it is needed (a clone of the work's repo on the work's
  own branch, with a token that can only read, made for it now and kept nowhere), so that no credential is stored. The manager's `working` gives it.
- A call is kept by its id (`box_call`): the same call again answers what it answered and does not run. A call cut off in the middle runs again.
- A box that is gone (it was lost, or never there) is started again from its snapshot when it has one, else cloned from the branch: that is where the last push left it,
  so a lost box costs time only (H10). Lost is what the host says when asked after a call failed (`find` has no box), never what the failure's words were, so any adapter gets the retry. A write that cannot be done is `put`'s value (`Unavailable`), which is what the product calls: the contract's `write` answers nothing, so it can only reject. `Unavailable` is said in words (no container is free), never thrown.
- `bundle` is `git bundle` of the branch against the merge-base with the default branch, read back as base64 from a command; `most` of `checkBundle` is files and bytes alike.
- `noBoxes` and `noPush` stand where there are no containers and nothing to push to. The Cloudflare Containers host and a push to the real GitHub are not behind `BoxHost` and
  `GitPort` yet: the spike's `sandboxes` has the calls for the first, and the second is git's smart HTTP or the Git Data API.
