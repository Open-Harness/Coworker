# Layout: the repo around a component library, a blueprint and an SDK

Phase 1 of [the blueprint light](../prompts/blueprint-light.md). This is a proposal. **No file moves until the owner answers
Q1 and Q2 below.** Written 26 November 2026, on top of [inventory.md](inventory.md).

## The shape

```text
/                          the app, as the workspace's root package (Q1)
  src/                     routes, screens, modules, main.ts: as today
  evals/  design/          untouched (read only)
  packages/
    ui/                    @coworker/ui: every component the screens use, with its stories. Storybook lives here
    blueprint/             @coworker/blueprint: Co-worker's model in Orthograph's Blueprint.*
    blueprint-delta/       @coworker/blueprint-delta: what Orthograph can't say yet, one named proposal each
    sdk/                   @coworker/sdk: the client, the hooks, the route stubs that answer NotBuilt, the fakes
    orthograph/            the vendored declaration layer, pinned to one Orthograph commit (Q2)
```

`pnpm-workspace.yaml` gains `packages: [".", "packages/*"]`. Each package has the six slots wherever it has behaviour (`AGENTS.md`). A
package that only declares, like `blueprint`, has `README.md`, `types.ts` and its declarations, and no `internal/` until it needs one.

**Who may import whom.** A script in `pnpm check` enforces this.

| From | May import |
|---|---|
| the app (`src/`) | `@coworker/ui`, `@coworker/sdk` |
| `sdk` | `@coworker/blueprint` (type imports only), `@coworker/ui` never |
| `ui` | nothing of ours: components take values and callbacks |
| `blueprint`, `blueprint-delta` | `orthograph`, `effect` |
| anything else | never `effect` or `orthograph` |

This keeps Effect contained, as `AGENTS.md` asks. The blueprint needs Effect's `Schema` in value position
(`Blueprint.value(Schema.Literals([...]))`), so the blueprint packages own it, and no screen, hook or module sees it.

## Q1 — Where does the app live: at the root, or under `apps/`?

**The problem, in code.** The evals are locked. They reach the app through the `~` alias, which points at `./src`
(`tsconfig.json:6`, `vite.config.ts:18`, `vitest.config.ts:44`):

```jsonc
// tsconfig.json:6
"paths": { "~/*": ["./src/*"] }
```

```ts
// evals/*: 47 distinct module imports, plus one relative one
import type { WorkView } from "~/modules/views-manager/types.ts";
import { flows } from "../../test/flows.ts";
```

If `src/` moves, every one of those has to keep resolving without an edit to `evals/`.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `evals/` (locked) | 47 `~/modules/*` imports and `../../test/flows.ts` |
| `vite.config.ts`, `vitest.config.ts`, `wrangler*.jsonc` | aliases, the test pool and the worker entry, all relative to the root |
| `scripts/check-*.ts` | globs on `src/**` and `src/modules` |
| Phase 5 and 6 | the screens move to the hooks and the library, wherever the app is |

**The options**

**Today**: one package at the root (`package.json` `"name": "pi-exp"`), with no workspace packages.

**A · The app stays at the root** (recommended)
```yaml
# pnpm-workspace.yaml
packages: [".", "packages/*"]
```
```jsonc
// package.json: the app depends on the new packages
"dependencies": { "@coworker/ui": "workspace:*", "@coworker/sdk": "workspace:*" }
```

**B · The app moves to `apps/console`**
```jsonc
// tsconfig.json at the root, kept only so the evals still resolve
"paths": { "~/*": ["./apps/console/src/*"] }
```
```ts
// vitest.config.ts moves too, and its eval project must reach back up
const source = fileURLToPath(new URL("../../apps/console/src", import.meta.url));
// and test/flows.ts must stay at the root, or the evals' ../../test/flows.ts breaks
```

**You do X → what happens**

| Scenario | A · Root | B · apps/console |
|---|---|---|
| Run an eval after the move | resolves as today | resolves only through a root `paths` kept for it, with `test/` left behind |
| Open the repo | the app, plus `packages/` | `apps/` and `packages/`, symmetrical |
| Phase 5 moves components into `ui` | the same work | the same work |
| Undo the change | delete `packages/` | move everything back |

**Rubric**

| Axis | A · Root | B · apps/console |
|---|---|---|
| Floor-first | ✅ packages land on day one, nothing moves | ⚠️ a move before anything is built |
| Reversibility | ✅ delete the folders | ⚠️ a large rename |
| Blast radius | ✅ new folders only | ❌ configs, scripts, the test pool, the worker entry |
| Correctness | ✅ the evals untouched by construction | ⚠️ the evals depend on a kept alias |
| Fit | ✅ `AGENTS.md`'s one root `main.ts` stays where it is | ⚠️ a cleaner tree, at the cost of the above |

**Recommendation: A.** The boundaries that matter, `ui`, `blueprint` and `sdk`, become packages either way. Moving the app buys symmetry
and costs the only risk there is, the locked evals.

## Q2 — How is `orthograph` imported, so `pnpm check` passes on a fresh clone?

**The problem, in code.** The blueprint has to import the real language, as the example does
(`examples/work/blueprint/things/run/thing.ts`, in the Orthograph checkout):

```ts
import { Blueprint } from "orthograph";
export const Run = Blueprint.thing({ fields: { id: Blueprint.id("run"), budget: Cents } });
```

Orthograph's own examples get it through `"orthograph": "workspace:*"`. In the checkout, `exports` point at `./src/index.ts`, and
`imports` map `#modules/*.js` to `./src/modules/*.ts` (`packages/orthograph/package.json`). Co-worker has no sibling checkout in CI.

There is an npm build, `orthograph@0.1.0-next.2`, published on 26 November 2026, with `effect@4.1.4` as its only dependency. The
owner says it does not work yet, so it is not an option today.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `pnpm check` on a fresh clone and in CI | it must install and typecheck with no sibling folder |
| `packages/blueprint`, `packages/blueprint-delta` | every declaration imports `Blueprint` and `Schema` |
| Phase 4, the DX log | what the blueprint can say decides what the scaffolding derives |
| `ortho model` and `ortho check` | they need `@orthograph/cli`, a separate and heavy package (nx, wrangler, alchemy) |

**The options**

**Today**: nothing imports Orthograph.

**A · Vendor the declaration layer, pinned to one commit** (recommended)
```text
packages/orthograph/
  VENDORED.md        Orthograph commit 309a409 (21 Nov 2026), Apache-2.0, what was copied, how to refresh
  LICENSE            Apache-2.0, as the licence asks
  package.json       { "name": "orthograph", "exports": { ".": "./src/index.ts" }, "imports": { "#modules/*.js": "./src/modules/*.ts" },
                       "dependencies": { "effect": "4.1.1" } }
  src/               the 75 files of packages/orthograph/src (about 2,400 lines), unchanged
```
```jsonc
// packages/blueprint/package.json
"dependencies": { "orthograph": "workspace:*", "effect": "4.1.1" }
```
It is left out of the size, lint and format checks, as `routeTree.gen.ts` is, because it is someone else's code.

**B · A link to the sibling checkout, left out of CI**
```jsonc
"dependencies": { "orthograph": "link:../architect/packages/orthograph" }
```
```bash
pnpm install   # on a fresh clone: the link target does not exist, and the blueprint does not typecheck
```

**C · The npm build, pinned**
```jsonc
"dependencies": { "orthograph": "0.1.0-next.2", "effect": "4.1.4" }
```

**D · Our own look-alike `Blueprint.*`**
```ts
// packages/blueprint/internal/blueprint.ts: functions with Orthograph's names that return plain objects
export const Blueprint = { thing: (spec: ThingSpec) => spec, machine: … };
```

**You do X → what happens**

| Scenario | A · Vendored | B · Link | C · npm | D · Look-alike |
|---|---|---|---|---|
| Fresh clone, `pnpm check` | green | red: the blueprint has no import | green, if the build worked | green |
| Orthograph changes its language | nothing, until we refresh on purpose | breaks us on their next commit | nothing, until we bump | nothing ever: it is not their language |
| We learn what Orthograph can't say | true: it is their code | true | true | false: our copy says what we let it |
| Their npm build starts working | swap `workspace:*` for the version: one line | the same | already there | a rewrite |

**Rubric**

| Axis | A · Vendored | B · Link | C · npm | D · Look-alike |
|---|---|---|---|---|
| Floor-first | ✅ works today | ❌ red on a fresh clone | ❌ the owner says it does not work yet | ⚠️ works, but it is not the real thing |
| Reversibility | ✅ one line to switch to npm later | ✅ | ✅ | ❌ |
| Blast radius | ✅ one folder, excluded from our checks | ⚠️ every clone and CI | ✅ | ✅ |
| Correctness | ✅ the real language at a known commit | ✅ the real language, at whatever commit is checked out | ✅ once it works | ❌ it defeats the point of a blueprint light |
| Fit | ⚠️ 2,400 lines of someone else's code in a public repo, with its licence | ❌ the brief rules it out | ✅ the way it is meant to be used | ❌ |

**Recommendation: A**, pinned to 309a409, with `VENDORED.md` saying how to switch to the npm build in one line once it works. `ortho
model` and `ortho check` are not part of `pnpm check`. When they are run, they run from the Orthograph checkout with `--root` pointed
here, and the result is recorded in the DX log.

## The evals

With Q1 at A, nothing an eval imports moves. If Phase 5 moves a component out of `src/` that an eval imports, the old path stays as a
re-export. Today no eval imports a screen or a component: all 47 of their module imports are `~/modules/*/types.ts`, `service.ts` or
`testing.ts`, and none of those move.
