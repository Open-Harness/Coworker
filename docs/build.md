# Build Co-worker

For the agent that builds it. Everything needed is in this repo; nothing is anywhere else. 25 November 2026.

## What there is

| | |
|---|---|
| What the whole system does | [spec.md](spec.md): numbered sentences, complete. The words and the rules of screens: [design.md](design.md) |
| Every type, compiled | `src/modules/*/types.ts`, with a README each. The 24 contract modules have `service.ts` stubs that throw "Not built" |
| Every screen | [design/](../design/README.md), 88 of them |
| What says it is there | [evals/](../evals/README.md): every one red today. In order: [book.md](book.md) |
| Templates, as files | [templates/repo](templates/repo), [templates/customers](templates/customers). Their skills are ready; three more are yours to write from T1 |
| What works already | Sign-in, workspaces, people, vault, models and keys, mail, the GitHub App, containers, the engine. [book.md](book.md) lists what is kept, rebuilt, replaced, deleted |
| Why | [first-principles.md](first-principles.md), [manager.md](manager.md), [github-plan.md](github-plan.md), [github-journey.md](github-journey.md), [findings.md](findings.md), [spikes/](spikes) |

## First

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

```bash
pnpm climb --lock
```

```bash
pnpm climb
```

The first score is 0. `pnpm build` comes before anything else that needs the pages (F99).

## Then, until it is 100

Follow *How to climb* in [book.md](book.md), slice by slice. Work in a branch; commit when a group is green. Never push, never deploy.

- **The modules you add** are yours to shape, by `AGENTS.md`: the store of a manager, the Durable Object, the console API's routes, the pages.
  The contract modules are pure; the wiring imports them and gives them what they need.
- **A slice at a time, but each through the whole**: slice 1 is the pure middle, slice 2 the first real thread of it from issue to pull request.
- **Screens**: take the drawing's own code (`design/src/screens/<name>`) as the start, give it the view instead of sample data, put it at
  the page in `evals/screens/screens.ts`. Do not redraw. `check:ui` allows a template's own styling in files named in the check (D5).
- **The old goes when the new is there**: delete in the same change, with its tests. Nothing imports both.
- **The agents' own words** (a doer's role, the judge's prompt, the set-up skill) are the product too: the jobs measure them. Improve them
  against the jobs, not against the fakes.
- **If it cannot be known** from these pages, take the smallest choice that keeps the evals green and write it in `docs/findings.md`.
- **If you are stuck on one eval** for long, write what you tried in `docs/findings.md`, leave it red, go to the next.

## What only the owner does

Keys and accounts ([live-setup.md](live-setup.md)), the real GitHub App, staging, running the jobs, pushing, deploying, saying an eval is
wrong, the look of something not drawn.

## When it is done

`pnpm climb --all` says 100; the jobs are green on the owner's models; the owner uses it on a test repo, then on this one.
