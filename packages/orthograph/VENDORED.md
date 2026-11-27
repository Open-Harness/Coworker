# orthograph, vendored

Orthograph's declaration language (`Blueprint.*`), copied unchanged so that Co-worker's blueprint imports the real thing and `pnpm check`
passes on a fresh clone. Decided in [docs/blueprint-light/layout.md](../../docs/blueprint-light/layout.md), Q2.

| | |
|---|---|
| From | `github.com/Open-Harness/architect`, `packages/orthograph/src` |
| Commit | `309a409a92f1e01cb08151ab701c26e4d93e47c0` (21 November 2026) |
| Licence | Apache-2.0, in [LICENSE](LICENSE) |
| Copied | the 75 source files of `src/`, unchanged |
| Left out | the 22 `*.test.ts` files beside them, `test/`, `project.json`, the tsconfigs and the build |
| Changed | `package.json` only: private, a vendored version, the same `exports`, `imports` and `effect` pin |

Nothing here is ours to edit. `pnpm check`'s size, lint and format rules skip this folder, as they skip `routeTree.gen.ts`. The typecheck
does not: our blueprint imports it.

## Refresh it

```bash
git -C <architect checkout> archive <commit> packages/orthograph/src | tar -x --strip-components=2 -C packages/orthograph
find packages/orthograph/src -name "*.test.ts" -delete
```

Then set the commit above and in `version`, and run `pnpm check`.

## Leave it for npm

Once the npm build works, delete this folder and change one line in `packages/blueprint/package.json`:

```jsonc
"orthograph": "workspace:*"   →   "orthograph": "<version>"
```
