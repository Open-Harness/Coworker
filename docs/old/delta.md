# What we have, what is needed, and can it be climbed

25 November 2026. From the code, and from two readers who had seen none of the conversations: one read the repo as a new harness would,
one tested whether it can be climbed. What they claimed was checked where it is stated as fact here.

**In short.** We have the design and the hard plumbing. We do not have the middle of the product, nor a score that knows good from bad.
**It cannot be climbed yet.** The score says 81 of 81 for a build that was thrown away: a harness climbing it today starts at the top.

## The delta

Words: ✅ there · ◐ partly · ✗ not.

| What it must do | Written down | Types | Code | Drawn | A test that fails today |
|---|---|---|---|---|---|
| Sign-in, workspaces, vault, people | ✅ | ✅ | ✅ | ✅ | none needed |
| Actions on / ask / off, asking by parking | ✅ | ✅ | ✅ | ✅ | none needed |
| Email in and out | ✅ | ✅ | ✅ | ✅ | none needed |
| Who may ask (gate) | ✅ | ✅ | ◐ a typed list, not "can write to the repo" | ✅ | ✗ |
| Judge, decide, one manager takes it (F96) | ✅ | ◐ | ✗ | ✅ | ✗ |
| Templates, many managers from one (F53, F97) | ✅ | ◐ | ✗ | ✗ | ✗ |
| A model on each agent (F71, F98), prices (F95) | ✅ | ◐ | ◐ saved agents only | ◐ three fixed names | ✗ |
| Playbook: files, versions, comments, suggestions | ✅ | ✗ no file has a schema | ✗ | ✅ | ✗ |
| Work: next, done-when, evidence, mandate | ✅ | ◐ two `Work` types that differ | ✗ | ✅ | ✗ |
| Threads: forks, woken, unanswered (F56) | ✅ tried | ◐ | ✗ | ✅ | ✗ the trial was thrown away |
| One warm box per work; no write token in it (F48) | ✅ | ◐ | ✗ a container per command | – | ✗ |
| GitHub: what it hears, what it can do (F74 to F77, F93) | ✅ | ◐ | ◐ 5 events, 1 action | ✗ its own view | ✗ |
| A fresh reviewer, done-when, sent back | ✅ | ◐ | ✗ | ✅ | ✗ |
| Dates, chasing, merge, close, tell (F64) | ✅ | ◐ | ✗ | ✅ | ✗ |
| Remembers a correction (F63) | ◐ | ✗ | ✗ | ◐ | ✗ |
| Objective, measure read from outside | ✅ | ✅ | ✗ | ✅ | ✗ |
| Set-up skill, walkthrough | ✅ | ◐ | ✗ | ✅ | ✗ |
| Evals of parts, one change a week | ✅ | ◐ | ✗ | ✅ | ✗ |
| Juno: one identity, acts on screen, palette | ✅ | ✗ | ✗ | ✅ | ✗ |
| Connectors with their own views | ✅ | ✗ | ✗ | ✅ four | ✗ |
| Tree of managers | ✅ | ◐ | ✗ | ✅ | ✗ |
| Usable within 1 s (F15 to F20) | ◐ | – | ✗ 1.3 to 1.9 s | – | ✗ |

About 46,000 lines of code: some 20,000 (the manager and the screens) go, and nothing lists which of the old prototype's modules go too.

## The gaps, most costly first

| # | Gap | Closed by | Who |
|---|---|---|---|
| G1 | **No score for the new product.** Every eval in the book is about the spike, and passes | A new book: one line per behaviour, each red today | Us, you approve which old ones go |
| G2 | **No cases.** Nothing to run an agent on, nothing anyone has judged | Ten past issues judged by you; planted faults; hidden tests | **You**, about 40 minutes |
| G3 | **Nothing real was recorded.** GitHub's tests use a package's examples, not our events | `scripts/github-look.ts` | **You**, one command |
| G4 | **No real model was ever run** on any of it | Connect one or more | **You** |
| G5 | **Types are sketches.** `Evidence`, `WorkEvent`, `Version`, `Bundle`, `Snapshot`, `Playbook` are used and defined nowhere; `Work` three times, each different | `types.ts` files that compile, in the new modules, no code behind them | Us |
| G6 | **Playbook files have no schema**, and the GitHub template is not written | Schemas and the template, as files | Us, you comment |
| G7 | **Screens are not in the repo.** The drawings are git-ignored and no page points at them; loading and error states are not drawn | An index: screen, template, source, its data, its states | Us |
| G8 | **Some screens are not drawn**: templates, New manager from one, model picker, GitHub's view, most Settings | Draw them | Us, you look |
| G9 | **Rules lived in conversations.** No README, no AGENTS.md; code rules were in a file outside the repo | `AGENTS.md`, now there | Done |
| G10 | **Old pages mislead.** `build-plan.md` still holds a prompt to paste that builds the spike again | Each says so on top, now | Done |
| G11 | **Slice 1 has holes**: the label and mentions, the words on the issue and in the pull request, limits as numbers, what judges before slice 4 | Say each, in the plan | Us |
| G12 | **The box is unknown**: do 225 s of tests on 10 cores end in 10 minutes on 4? | `live/box-times` | **You**, one command |
| G13 | **Words differ**: feed, station, task, run, root still in five pages and in the code | Rewrite `manager.md` and `model-next.md` as one; a check for banned words | Us |
| G14 | **A fresh clone fails its own check** (F99), and nothing runs it on a pull request (F94) | Fix, one workflow | Us |

## Can it be climbed

There are four hills. They need different things.

| Hill | The score would be | What is there | Today |
|---|---|---|---|
| **The code**: does it behave as written | Tests | 616 tests, a ratchet, test worlds, eviction, a scripted model | **No.** Holds what is there; nothing pulls towards the new |
| **The screens**: do they look and work as drawn | Compare with the drawing, at three widths and in the dark | Every drawing, its source, a photographer | **No.** Pictures are kept "for a person"; nothing compares |
| **The agents**: are fixes, reviews, triage any good | Cases, run several times, hidden tests, a judge checked against you | The set-up skill, the idea | **No.** No cases, no judge, no model |
| **The product**: is the number moving | Issues fixed that stay fixed, your minutes, cost | The definition | **No, and slow.** Fourteen days to read. Until then: ten issues, minutes and cost |

### Why the present score misleads

- 81 of 81 since 25 November 05:55, while the build was found unusable by hand at 07:00.
- The model in every behaviour test is a script that always does the right thing. It proves plumbing.
- `pnpm score` runs the fast tests; a `ui` or `live` eval keeps its **last** result (`score/internal/judge.ts:42`). Here the last ui run is of
  23 November.
- Who writes the code writes the test. Nothing but a sentence stops it being weakened. Some evals never checked what they claim
  ([attack-plan.md](attack-plan.md)).
- One eval is one point: a trivial one is worth as much as a hard one.
- The ratchet will fight the rewrite: taking the old manager out turns its evals red. Only you can retire them.

### What would make it climbable

1. **The contract first.** `types.ts` of `templates`, `playbook`, `work`, `threads`, `boxes`, `decide`, compiling, with nothing behind them.
2. **A new book**, about 30 lines, all red. By tier:

| Tier | Runs | Holds | Time, cost |
|---|---|---|---|
| 0 | Every edit | Types, lint, words, pure tables: `decide`, `work`, `playbook`, `template`, `choose` | 30 s |
| 1 | Every step | Flows in workerd on recorded events, the object killed after each step, twice, out of order | 4 min |
| 2 | Every screen change, never carried over | Each drawn screen: the same parts in the same order, then pixels, at 1440, 390 and dark; 1 s | 8 min |
| 3 | Every slice | A real model on the cases, three times each: how many passed, minutes, cost | 30 min, dollars |
| 4 | Nightly, and before *done* | Staging; the cases kept back; a person looks | – |

3. **Cases**: your ten issues, three planted faults, hidden tests for each fix. **Half are kept outside the repo**, unseen by what builds.
4. **A judge checked against you**: another maker's model, used only where it agrees with your judgements, as [manager.md](../manager.md) says.
5. **A lock**: tests, cases, checks and the book cannot be changed in the change that they score. A pull request does one or the other.
6. **Two versions, same cases.** Kept if nothing that passed fails, and it is better by more than it varies by itself.

What stays a person's: what good is, retiring an eval, the look of a screen, the ten issues on our own repo.

## The order

| Step | What | Yours |
|---|---|---|
| 1 | Contract: types that compile, playbook schemas, the GitHub template, words made one (G5, G6, G11, G13) | Comment |
| 2 | Screens: the index, the missing drawings, pictures to compare with (G7, G8) | Look |
| 3 | Data: recorded events, box times, a model (G3, G4, G12) | Two commands, a key |
| 4 | Cases and judge (G2) | Judge ten issues |
| 5 | The book, red; the lock; the checks that run by themselves (G1, G14) | Approve what retires |
| 6 | One prompt for a harness, and it starts | Say go |

1, 2 and 3 run side by side. Nothing of the product is built before 5.
