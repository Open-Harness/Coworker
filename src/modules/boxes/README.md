# boxes

One container per piece of work, and how a branch leaves it.

Not built. What it must do: spec H6 to H10 in [docs/spec.md](../../../docs/spec.md). `BoxHost` is the outside thing; Cloudflare Containers
stand behind it on staging (the spike's `sandboxes` has the calls), `boxWorld` in `evals/world` in the evals. What shows it: the evals under
`boxes` in [docs/book.md](../../../docs/book.md).

## Settled by the evals

- `most` is the largest bundle allowed; the evals only use bundles that are over it, or at or under it, in files and in bytes alike. A path with a leading `./` or a doubled slash is still the path it names.
