# Prompt: blueprint light, a component library, and hooks written to the interface

For the next agent. Written 26 November 2026, on branch `core`. Paste it whole, or point the agent at this file.

---

## The goal

Co-worker looks finished but does nothing. The audits say why:

- 57 of the 81 buttons have no handler.
- The score was measured in a fake world.
- Failures are swallowed.
- The core was hand-rolled.

The core loop was cut out in 7b5fa4b. Read [docs/pi-durable-audit.md](../pi-durable-audit.md) (the actions section) and
[docs/audit-2026-11-26.md](../audit-2026-11-26.md).

**What works is the UI.** The screens already encode the product: an information architecture, the things that exist,
what a person can do to each, and the state each screen assumes is there. Your job is to pull that implied model out into
a clean target, so the product can be rebuilt to it rather than patched in place. The owner does not want to read the old
backend code to judge it, and neither should the design. **The screens, the drawn design and the docs are the source of
truth; the old backend is not.**

You deliver three things:

1. **A blueprint light.** Co-worker's model is declared in Orthograph's real blueprint language: things, values, errors,
   machines, operations, roles, and where each piece of state lives. It is as real as possible without constraining us.
   Anything Orthograph can't express yet goes in a separate delta package as a named proposal.
2. **Hand-written scaffolding**: what Orthograph's generator would emit (SDK client, React hooks, route handler stubs,
   fakes), written by hand so the DX is measured. Every step is logged.
3. **A component library and a Storybook** with every component and every screen in it. Screens run on fakes through
   the hooks. Use this to reorganise the repo so the boundaries are physical.

You are **not** building the agent loop, the backend services or any handler's real behaviour. Handler stubs return a
`NotBuilt` value.

## Read first

In this repo:

- `AGENTS.md`, the house rules: six slots per module, errors as values, one composition root, files of at most 250
  lines, `~/*` imports across modules.
- `docs/pi-durable-audit.md`: how agents are meant to work, the two settled decisions (one Durable Object per piece of
  work; our own host), and what to take from Orthograph.
- `docs/design.md`, `docs/spec.md`, `docs/github-plan.md` (the types section: `Work`, `Next`, `Moved`) and
  `docs/github-journey.md`.
- `src/screens/*` and `src/routes/*`: the UI as it is. `design/`: the drawn screens (`design/BRIEF.md`,
  `design/routes.txt`). It is read only.
- `src/modules/*/types.ts`: the contracts as they stand. Read them as evidence of intent, not as truth.

In Orthograph, the sibling checkout named `architect` (ask the owner if you can't find it). Read only, never edited:

- `examples/work/`, the closest example. Start with `blueprint/things/run/{thing,machine,errors,events}.ts` and
  `blueprint/things/run/verbs/`, `src/run/` (the handler scaffolds), `generated/` (what the generator emits) and the
  README.
- `packages/orthograph/src/modules/`: the language (`things`, `values`, `errors`, `machines`, `operations`, `roles`,
  `stores`, `journeys`, `telemetry`, ...).
- `design/frame/examples/agents.md`, and `design/decisions/H1-agent-harness.md`, `F5-work-blueprint.md`,
  `K10-factory.md`, `K11-work-board.md`.

What Orthograph already declares:

```ts
// examples/work/blueprint/things/run/machine.ts
export const machine = Blueprint.machine(Run, {
  states: ["running", "waiting", "finished", "failed", "stopped"],
  moves: {
    start: { from: [], to: "running", emits: Events.RunStarted },
    finish: { from: ["running"], to: "finished", emits: Events.RunFinished },
    // ...
  },
  notFrom: { exit: 60 },
});
```

## How to work

Work in phases. **Every phase ends in something the owner can open**: a doc, a story, a typecheck, a scaffold that
compiles. `pnpm check` stays green at every commit.

### Phase 0: inventory

Write it to `docs/blueprint-light/inventory.md`. One table row per screen and route:

| Column | What goes in it |
|---|---|
| Route | the route |
| Screen file | its file |
| Components | the components it uses |
| Data | what data it shows |
| Actions | what it presses, by doing id |
| Noun and operation | which noun and operation each maps to |
| Store | where that state must live: workspace DO, work DO, D1, R2 |

Then list the nouns, with their fields and lifecycles as the screens imply them, and the open gaps. Use the drawn design
where the built screen differs from it, and say which way you chose.

### Phase 1: the repo layout (stop and ask once)

Propose the new layout in `docs/blueprint-light/layout.md` before you move a file. A pnpm workspace is the likely shape:

- the app;
- `packages/ui`, the component library;
- `packages/blueprint`, Co-worker's blueprint;
- `packages/blueprint-delta`, the extensions;
- `packages/sdk`, the client, hooks and fakes.

Settle two things in that proposal:

- **How `orthograph` is imported.** `pnpm check` must pass on a fresh clone that has no sibling checkout. The ways to get
  there are a relative link left out of CI, a vendored copy of only the declaration layer pinned to an Orthograph commit,
  or something else. Use the owner's decision format from their global instructions: the problem in code, what it
  touches, each option as a diff sketch, and a grading. **Then ask the owner and wait.**
- **The evals.** `evals/` is locked. If a move would break an eval's import, keep the old path working (tsconfig `paths`
  or a re-export) or stop and ask. Never edit `evals/` yourself.

### Phase 2: the blueprint

In `packages/blueprint`, written in `Blueprint.*`, declare:

- **things and values**: workspace, person, manager, template, playbook, work, thread, ask, action, connector, trigger,
  chat, and whatever the inventory finds;
- **errors**, with exit codes;
- **events**;
- **machines**, only where something has a lifecycle. Work, thread (run), ask and an action call are the likely ones;
- **operations and verbs**, one per doing the screens press, including the 57 that have no handler;
- **roles**: who may do what, and what an agent may never do (`notVia(Via.agent)`);
- **stores**: which state lives in which object or table. One Durable Object per piece of work, and the manager is
  configuration, not an actor.

Run Orthograph's own checks against it if its CLI works here (`ortho model`, `ortho check`), and record what they say.

### Phase 3: the delta

Put each thing Orthograph can't express in `packages/blueprint-delta`. Each one is a named proposal: what it is, why
Co-worker needs it, the smallest declaration that would cover it, and where in Orthograph it would go. The audit has
already found some:

- threads as forks of a piece of work's conversation;
- parked tools woken by signals (a person's answer, CI);
- approval as a gate before a tool runs;
- binding a screen to an operation.

### Phase 4: hand-written scaffolding, with the DX measured

For every operation, write by hand what a generator would emit, in the six-slot shape, in `packages/sdk`:

- the typed client call;
- the React hook (`useWork(id)`, `useAct(doing)`, and so on);
- the route handler stub that answers `NotBuilt` as a value;
- the fake the stories and tests run on.

Log every artifact in `docs/blueprint-light/dx-log.md`, one line each:

| Column | What goes in it |
|---|---|
| Artifact | what it is |
| Derived | what it was derived from in the blueprint |
| Mechanical or judgement | which it was, and for judgement, which judgement |
| Friction | what hurt |
| Generator | what the generator should do |

The log is the spec for Orthograph's generators. It is as important as the code.

### Phase 5: the component library and Storybook

Move every component the screens use into `packages/ui`. Each one gets stories for its states: empty, loading, full,
refused, asked, failed. Every screen gets a story too, running on the fakes through the hooks, so the whole app can be
browsed with no backend. Clean up as you go, with the same names, the same look and one component per job. The drawn
design decides disputes. The deletion test from `AGENTS.md` applies: a component that only passes props through is
merged away.

### Phase 6: screens written to the interface

Rewire every screen to the hooks. No screen imports a backend module. Add a check to `pnpm check` that fails if one
does, and one that fails if a registered doing has neither an operation in the blueprint nor a `planned` mark.

## Rules

- **Public repo.** No account ids, home paths or personal details in tracked files. Commits use the GitHub noreply
  identity and carry no attribution lines.
- **Secrets.** Never read `.env` or `.dev.vars`, and never print a secret.
- **Read-only areas.** Don't edit `evals/`, `design/`, locked docs (see `AGENTS.md`), or an existing module's contract
  `types.ts`. New packages have their own `types.ts`. If a contract has to change, stop and ask.
- **Formatting.** Don't run oxfmt on `docs/`.
- **No deploys.** Don't deploy anything. The v6 migration on this branch deletes old Durable Object data.
- **Versions.** Pi stays pinned at 1.6.0. Don't build the agent loop; that is separate work.
- **Nothing that pretends.** A stub says `NotBuilt`, a fake says it is a fake, and a planned button is marked planned.
  This is the slop we are removing; don't add more.

## Done when

- The inventory, layout, blueprint, delta, scaffolding and DX log exist and agree with each other.
- Storybook opens with every component and every screen, and every screen runs on fakes.
- No screen imports backend code. Both new checks are in `pnpm check`, and it is green.
- The owner can read `docs/blueprint-light/README.md`, one page, and see what Co-worker is, where each piece of state
  lives, what Orthograph covered, what the delta adds, and what hand-generating felt like.
