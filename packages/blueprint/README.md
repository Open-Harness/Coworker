# @coworker/blueprint

Co-worker's model, declared in Orthograph's `Blueprint.*`: things, values, errors, events, machines, operations, roles and stores. It is
imported but does not constrain the app yet: nothing is generated from it, and the SDK reads it only as types.

- **Owns:** what Co-worker _is_. The screens are the source; [docs/blueprint-light/inventory.md](../../docs/blueprint-light/inventory.md)
  is the evidence for every declaration.
- **Invariant:** only this package and `blueprint-delta` import `effect` or `orthograph` (`scripts/check-packages.ts`).
- **Test:** `pnpm typecheck` compiles it against the vendored language in `packages/orthograph`.

Laid out as Orthograph's `examples/work`: `things/<thing>/{thing,machine,events,errors,roles,verbs/*}.ts`, and `values/`.
