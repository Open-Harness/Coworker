# The book

Every eval, in the order to build, with the sentences of [spec.md](spec.md) it shows. Written by `node evals/climb/book.ts`; locked.
The score is `pnpm climb --all`: of 100, weighted. On 25 November 2026 it is **0**: the types are there, nothing behind them is.

{{counts}}

## How to climb

```bash
pnpm climb --slice 1
```

1. Take the next red eval. Read the sentences it shows in `docs/spec.md`, the module's `types.ts` and `README.md`, the drawing if it is a screen.
2. Build the least that makes it green, the way `AGENTS.md` says. The evals never change; the module's own tests beside it are yours.
3. `pnpm climb --slice N` again. Something that was green and is red comes first. So do types and shape.
4. Commit when a group is green. `pnpm climb --all` at the end of each slice; its line goes in `status/climb.json`.

| Command | Runs |
|---|---|
| `pnpm climb` | Types, shape, rules, flows |
| `pnpm climb --slice 3` | Everything of slice 3 but the jobs |
| `pnpm climb --only flow:check` | The evals with these words in their id |
| `pnpm climb --all` | Everything but the jobs, every gate, the kept tests. The score |
| `pnpm climb --all --jobs` | That, and the jobs |
| `pnpm climb --lock` | Whether something locked was changed |

**A slice is done** when its evals are green, nothing that was green is red, and it was used by hand once (`pnpm dev`) beside its drawings.
**It is all done** when `pnpm climb --all` says 100 and the jobs are green on the models the owner means to use.

**When an eval is wrong**, say why in `docs/findings.md`, leave it red, and go on. Never change it, the drawing, the spec or a contract's
`types.ts`. A type may be *added to* your own files; a contract's may not change.

## What of the spike is kept

| | |
|---|---|
| **Kept, and its tests with it** | auth, billing, brain, clock, credentials, github (the App, tokens, checks on a hook), http, live, mail, mailbox, models, outsiders, vault, web, workspace, workspaces, chat-sdk. `evals/climb/kept.json` has each test's title. What a kept test expects never changes; what it imports, and how it is set up (`test/team.ts` makes an old manager), may |
| **Kept as machinery, rebuilt around** | agent-engine (pi-durable, how a turn runs), the container host in sandboxes (behind boxes), the live pages' build |
| **Lifted** | email's reading of a mail → mail-events (one address for the co-worker, not one per manager). github's of a delivery → github-events. actions → doings (what may be pressed) and connectors (what a tool may do). access → reach. search → `GET /search`. triggers' gate → intake. schedule → playbook triggers |
| **Replaced** | manager, board, agents, settings, dashboards, team-app, team-build, team-core, team-home, team-settings, team-shell, team-start (team-join stays until its screen is replaced). Their tests go with them, each in the slice that replaces it. The e2e specs go with their screens |
| **Deleted once nothing imports it** | score (`pnpm score` was the spike's), admin, agent, agent-config, app, chat-host, chats, connection, directory, directory-client, documents, history, manager-client, protocol, schedule, transcript, ui |

A workspace is no longer deleted at once (L4: thirty days). No manager has an address outside (C2). There are no presets: there are templates.

## In the spec and in no eval

| Sentence | Why |
|---|---|
{{not shown}}

