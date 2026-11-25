# Build plan: climbing to Co-worker

How Co-worker gets built from this repo. This file is the **book**: what "done" means, as evals. A coding agent
works through it by raising one number, the score, and never lowering it. [model.md](model.md) says what the product
is, [actions.md](actions.md) says what its managers can do, and the design canvas shows every screen.

## 1. How the climb works

- **The score.** `pnpm score` runs the gates, then every eval, and prints passing evals per milestone. It also writes
  `status/score.json`, which lists every eval id with `pass`, `fail` or `missing`.
- **The book is this file.** Every list item that starts with an eval id in backticks is an eval, for example
  `acc:vault/at-rest` below. The scorer reads the ids from here.
  - An id with no test counts as `missing`, which is a fail.
  - A test whose id is not in the book fails the run, so nobody can invent easy evals.
- **A test names its eval.** `it("acc:vault/at-rest", …)` in Vitest, `test("ui:join/invite", …)` in Playwright.
  - One test per id.
  - The test's name is only the id. The claim lives here.
- **The ratchet.** A change may not turn a passing eval red. The scorer compares against the last `status/score.json`
  and fails if anything went `pass` to `fail`.
- **Gates come first.** If typecheck, lint, `check:shape`, `check:ui` or the size check is red, the score is 0.
- **Changing the book is a decision.** If an eval is wrong, the climber proposes the change and Aaron approves it. It
  never weakens a test to make it pass.
- **Tiers.**

| Tier | Kinds | Runs | Network |
|---|---|---|---|
| fast | `gate`, `acc`, `flw` | every iteration, under 3 minutes | none |
| ui | `ui` | every iteration that touches `app`, `ui` or a route | none: the built app on celld with the scripted model |
| live | `live` | nightly, and before a milestone is called done | staging on Cloudflare, real GitHub, real email |

**Kinds of eval.**

| Kind | Goes through | Asserts on |
|---|---|---|
| `acc` | one module's `types.ts`, in Vitest's server project (workerd) | the values it returns |
| `flw` | the whole Worker: `fetch`, `email` or an alarm in, Durable Objects, fakes out | what the fakes recorded, and what the objects now hold |
| `ui` | a browser on the built app | what a person sees and can do; screens match the canvas |
| `live` | staging, from outside | the same claims as the `flw` twin, on the real platform |
| `spike` | a written answer in `docs/spikes/<id>.md` | a person reads it; counts once Aaron accepts it |

**No git repo yet.** The climb needs one: a branch per task, a revert when the ratchet fails, a diff per step. `git
init` is the first eval of milestone 1.

## 2. The test worlds

Every outside thing is an interface the composition root injects (AGENTS.md rules 2 and 3). The fast tier uses a fake,
and the live tier uses the real thing. **The fakes live in each module's `testing.ts`.** A fake records what it was
asked and holds just enough state to answer.

| Outside thing | Interface | Fast tier (fake) | Live tier (staging) |
|---|---|---|---|
| Models | pi-ai `Models` | the scripted faux provider we already use (`test/engine.ts`, `agent/internal/fake.ts`) | `coworker-fake-model`, a scripted OpenAI-compatible Worker added as the test workspace's **own endpoint**, so the climb also tests that path. One nightly smoke test runs a real Anthropic key |
| Email in | the Worker's `email()` handler | `.eml` fixtures fed to `worker.email()` as a `ForwardableEmailMessage` built from the bytes | Email Routing on the test domain sends everything to `coworker-staging` |
| Email out | `Mailer` | records each message: to, subject, headers, body | the `send_email` binding on the test domain |
| A person on email | — | a fixture's From | mailboxes on the test domain itself, `person@` and `stranger@`, in a Worker of their own (`coworker-mailbox`): literal Email Routing rules bring it their mail, it sends as them with `send_email`, and the live runner reads and writes over its API. Cloudflare to Cloudflare only: another provider's DKIM and a real mail client's threading are not tested |
| GitHub events in | `/in/github` | real payloads from `@octokit/webhooks-examples`, signed with the test secret by `@octokit/webhooks-methods`, the same code GitHub uses | a test org's GitHub App sends to staging |
| GitHub API out | `GitHub` (installation token, comment, review, open PR, read checks) | an in-memory repo: issues, PRs, comments, checks | the App installed on `<test org>/sandbox` |
| A person on GitHub | — | a fixture's `sender` | a machine user whose fine-grained token only reaches `sandbox`, so events come from a real non-bot person |
| Sandboxes | `Sandboxes` | a table of scripted commands and outputs | Cloudflare Containers on staging, one image |
| Sign-in | Better Auth | **real**, on local D1 in workerd; email links go to the fake `Mailer` | real, on D1 `coworker-control-staging` |
| Vault master key | `MasterKey` | a fixed test key | Secrets Store, `VAULT_MASTER_KEY` (staging) |
| Clock, ids | `Clock`, `Ids` | a fixed clock that tests move forward | real |
| Billing | `Billing` | records seats and metered hours | Stripe test mode (milestone 4) |

**Fixtures that make email and GitHub "properly" tested.** Each one is an eval in milestone 3.

- **Email:**
  - plain text
  - HTML only
  - a reply with `In-Reply-To` and `References`
  - a forward
  - an attachment
  - an out-of-office auto-reply
  - a bounce
  - the same `Message-ID` delivered twice
  - our own reply coming back to us
  - a From that fails DKIM
  - an address that does not exist
  - a message over the size limit
- **GitHub:**
  - an issue opened by someone allowed, and by someone not on the list
  - an issue comment that mentions the manager
  - a comment by our own App
  - a PR from a fork
  - a review
  - a check run failing on a Task's PR
  - the same `X-GitHub-Delivery` twice
  - a bad signature
  - an event this manager did not choose for this repo
  - the App uninstalled

## 3. What to set up for the live tier

Nothing here goes in the repo. `.dev.vars.example` lists the names only.

| # | What | Why | Who |
|---|---|---|---|
| 1 | A test domain on the Cloudflare account (cheap, or a subdomain zone of one you own). Turn on Email Routing with a catch-all to `coworker-staging`, and verify the domain for Email Service sending | Real inbound mail, real outbound mail, both landing back in staging | You: buying the domain and the DNS change |
| 2 | Staging: Worker `coworker-staging`, D1 `coworker-control-staging`, a Secrets Store secret `VAULT_MASTER_KEY`, Containers on (Workers Paid) | The live tier's world | Me with `wrangler`, given an API token scoped to Workers, D1, Secrets Store, Email and Containers |
| 1b | The Worker `coworker-mailbox` at `https://mailbox.<test domain>`, with two literal Email Routing rules (`person@<test domain>`, allowed, and `stranger@<test domain>`) and a token | The outside person in `live:email/*` | Me with `wrangler` (`pnpm staging --apply`) |
| 3 | A GitHub org for tests, with one repo `sandbox` | Somewhere events can happen without touching real code | You |
| 4 | A GitHub App "Co-worker (staging)": issues and PRs read/write, contents and checks read, metadata. Events: issues, issue comment, pull request, review, check run, push. Webhook to `https://<staging>/in/github` with a secret. Install it on `sandbox` | The same App flow customers get | You create it. I can write the manifest so it is one click |
| 5 | A machine-user GitHub account with a fine-grained token on `sandbox` only (issues and PRs read/write) | Events from a person, not a bot | You |
| 6 | Secrets for CI and the live runner: `CLOUDFLARE_API_TOKEN`, `LIVE_MAILBOX_TOKEN`, `GH_APP_ID`, `GH_APP_PRIVATE_KEY`, `GH_WEBHOOK_SECRET`, `GH_PERSON_TOKEN`, and optionally `ANTHROPIC_API_KEY` for the nightly smoke test | Running the live tier without a person | You |

The fast tier needs none of this. The climb can start today, and the live tier joins when the setup is done.

## 4. Milestones and their evals

Four milestones, each ending in something a person can try. Lanes inside a milestone are groups of work whose files
do not overlap, so they run at the same time. 81 evals in all.

| # | Milestone | Evals | Needs | Lanes |
|---|---|---|---|---|
| 1 | Foundations | 20 | — | platform |
| 2 | A manager works | 15 | 1 | manager, people |
| 3 | It hears the world | 25 | 2 | email, github |
| 4 | Teams and money | 12 | 1 for joining, 2 for sandboxes | people, platform |
| — | Chat SDK spike | 1 | 2 | email or github, whichever is free |

### 1 · Foundations (needs nothing)

**Done when** you can sign up, create a workspace and add a model key that is tested and encrypted. 20 evals.

#### Ground (lane: platform)

- `gate:repo` The repo is a git repo with a `main` branch, and `pnpm check` passes on it.
- `gate:size` No source file is over 250 lines (a script, added to `pnpm check`).
- `gate:score` `pnpm score` prints the table, writes `status/score.json`, and fails on a test named like an eval
  (`kind:area/name`) that is not in the book, or on two tests with one id. A test with no eval id is a support test:
  it doesn't score, but if one fails the `tests` gate is red and the score is 0.
- `gate:ratchet` `pnpm score` fails when an eval that passed in the last `status/score.json` now fails.
- `acc:worlds/fakes` Every interface in section 2 has a fake in a `testing.ts`, and the composition root is the only
  place real ones are built.
- `gate:bindings` `wrangler.jsonc` declares D1 `AUTH`, the `WORKSPACE` and `MANAGER` objects, R2 `FILES`,
  `send_email` `EMAIL`, the Secrets Store binding and the email route. Local and test configs start without network.

#### Accounts and workspaces (lane: platform)

- `acc:auth/sign-up` A new person signs up with an email link (captured by the fake `Mailer`) and gets a session.
- `acc:auth/google-github` Google and GitHub sign-in create one user with two linked accounts when the emails match.
- `flw:workspace/create` Creating an organization provisions its Workspace object in the chosen region and writes
  `workspace_directory`. A failure halfway leaves no organization without an object.
- `acc:workspace/address` The workspace address must be unique. A taken one returns `{ _tag: "AddressTaken" }`,
  not a throw.
- `flw:workspace/many` One person in two workspaces sees each one's data only through that workspace's object. A
  request for the other one is refused.
- `flw:workspace/delete` Deleting a workspace removes its objects, its D1 rows and its data key. Any ciphertext left
  can no longer be decrypted.
- `acc:auth/tailscale-gone` Nothing reads `Tailscale-User-*` any more. `identity` and `visitor` are removed.

#### Vault and model access (lane: platform)

- `acc:vault/at-rest` A stored secret is AES-GCM ciphertext under the workspace's data key, and the plaintext appears
  in no table.
- `acc:vault/use-once` `vault.use(name, fn)` gives `fn` the plaintext and nothing keeps it afterwards. The value never
  appears in a log, an audit line or a socket message.
- `acc:vault/rewrap` Replacing the master key rewraps data keys only. Every secret still decrypts.
- `flw:models/test-key` Adding an Anthropic key runs a test call and saves "works, checked at" or the provider's
  error, as on the Keys screen.
- `flw:models/endpoint` Adding an OpenAI-compatible endpoint fetches its model list and runs a test call against it.
- `flw:models/chatgpt` ChatGPT sign-in stores its tokens in the vault and refreshes them before expiry.
- `acc:models/none` With no model connected, managers cannot start and say why. Nothing crashes.

### 2 · A manager works (needs 1)

**Done when** you chat to a manager and it makes tasks, runs agents, and asks you before an action set to ask.
20 evals.

#### The manager (lane: manager)

- `flw:manager/create` Creating a manager from a template makes its Manager object, mission page, board lanes and
  email address.
- `acc:manager/tools-are-actions` The manager's tools are exactly the actions in actions.md that are built: one tool
  per action, named by its id with `.` written `_` (`task.create` is `task_create`). Every one offered can be carried out.
- `flw:manager/chat-task` A person writes in the manager's chat and the manager creates a task with `task.create`.
  The board shows it.
- `flw:manager/run` `run.start` starts an agent in a role on a task. Its transcript is readable, and its report sets
  the task's stage.
- `acc:board/stages` A task's stage comes from facts, first match wins, as in model.md "Stages".
- `flw:manager/restart` Killing the Manager object mid-run and waking it resumes the run with nothing done twice.
- `flw:pages/mission` The manager edits the mission page and adds a sub-page. Search finds both across managers.
- `ui:manager/board` In the browser, Kanban, List, Console and Inbox show the same tasks, as on the canvas.

#### Permissions, asking, Inbox, Needs you (lane: people)

- `acc:permissions/check` `permissions.check(by, actionId)` gives the preset's default, overridden by that manager's
  or person's own setting: `on`, `ask` or `off`.
- `flw:permissions/ask` An action set to ask parks the tool on a signal, puts a question in the right person's
  Inbox, and runs only after "allow". "Refuse" returns a refusal the manager can read.
- `flw:permissions/off` An action set to off is refused, and the audit log says so.
- `acc:audit/sentence` Every action writes one audit line: who did it, the permission it ran under, and its
  `describe()` sentence.
- `flw:inbox/question` `question.ask` adds one Inbox item per question id, even if sent twice.
- `flw:inbox/own-words` A person answers in their own words. The manager gets the text, and asks again if it is
  unclear.
- `ui:needs-you/page` The Needs you page shows the context, the decision, the options and linked pages, as on the
  canvas.

#### The screens a person works in (lane: screens)

Each also saves its screenshots at 1440×900 and 390×844, for a person to look at.

- `ui:chat/talk` In the browser, a person writes to a manager and the answer appears as it is made. After a reload the
  chat is the same, and a person with no model connected reads what to do about it.
- `ui:run/transcript` From a task, a person opens the agent run, reads its steps and its report, and stops a running
  one.
- `ui:mission/page` A person reads and edits the mission page, opens a sub-page, and sees who changed it last.
- `ui:search/open` Search finds tasks, mission pages, managers and people, and opens each with the keyboard alone.
- `ui:shell/phone` At 390 wide, every page is reachable and usable: no page scrolls sideways, and nothing that can be
  clicked on a desktop is missing.

### 3 · It hears the world (needs 2)

**Done when** an email and a GitHub issue each become a task, and the manager's reply gets back to the sender. 27
evals, in lanes that run side by side.

#### Email (lane: email)

- `flw:email/new-request` Mail from an allowed person to `launch@…` becomes a Trigger, passes the Gate as
  explicit, and the manager accepts it as a task.
- `flw:email/reply-follows` A reply to `launch+dt-14@…` lands on DT-14 as a follow-up with no Gate.
- `flw:email/threading` The manager's reply carries `In-Reply-To` and `References`, so it threads in the sender's
  mail app.
- `flw:email/dedupe` The same `Message-ID` twice makes one Trigger.
- `flw:email/auto-reply` Out-of-office replies and bounces make no candidate.
- `flw:email/no-loop` Our own outgoing mail arriving back makes no Trigger.
- `flw:email/dkim` A From that fails DKIM counts as an unknown sender, even if the address is on the list.
- `flw:email/unknown-address` Mail to an address that does not exist is rejected with a reason.
- `flw:email/attachment` An attachment is stored in R2 and reaches the run as a file.
- `flw:email/too-big` A message over the limit is rejected, and the sender gets a short reason.
- `live:email/round-trip` On staging: mail the allowed person sends from their own mailbox to `launch@<test domain>`
  becomes a task, and the manager's reply reaches that mailbox, threaded, within 60 seconds.
- `live:email/stranger` On staging: the same mail from the stranger's mailbox makes no task, and one line in Events.

#### GitHub (lane: github)

- `flw:github/install` Installing the App records the installation. A manager picks repos and, per repo, the events
  it hears. A template turns on its starting set.
- `flw:github/signature` A bad signature returns 401 and makes no Trigger.
- `flw:github/dedupe` The same `X-GitHub-Delivery` twice makes one Trigger.
- `flw:github/issue-allowed` An issue from an allowed person, mentioning the manager, becomes an explicit candidate.
- `flw:github/issue-unknown` The same issue from someone not on the list follows the admission table, ignored by
  default.
- `flw:github/not-chosen` An event this manager did not choose for this repo is dropped, with one line in Events.
- `flw:github/own-comment` A comment by our own App makes no candidate.
- `flw:github/pr-follows` A comment on a Task's PR is a follow-up on that Task.
- `flw:github/check-failed` A failing check run on a Task's PR reaches the Task as context, and the manager sees it.
- `flw:github/fork` A PR from a fork never gets a token that can write to the base repo.
- `flw:github/token` A sandbox gets an installation token for one repo that expires within an hour, never the App's
  key.
- `flw:github/uninstall` Uninstalling the App stops the GitHub sources and puts a notice in the Owners' Inbox.
- `live:github/round-trip` On staging: the machine user opens an issue on `sandbox` mentioning the manager. It
  becomes a task, and the manager comments back within 60 seconds.

#### What arrives, on screen (lane: screens)

- `ui:events/list` Events shows what arrived, what it became and why one was ignored. A person filters it and opens
  the task an event made.
- `ui:sources/connect` A person adds a manager's email address and a GitHub repo, chooses the events it hears, and sees
  when a source loses its connection.

### 4 · Teams and money (joining needs 1; sandboxes need 2; can overlap 3)

**Done when** people join by every route on the Joining board, every settings screen saves, runs use containers, and
hours and seats are billed. 13 evals.

#### People, joining, settings (lane: people)

- `flw:join/invite` An emailed invite lasts 7 days, works once, and joins with the invited preset. The email must
  match.
- `flw:join/link` An invite link joins as a Member. Owners can turn links off.
- `flw:join/domain` With `acme.com` approved, a new acme.com account joins straight away.
- `flw:join/request` Without approval, the request goes to every Owner's Inbox. The first answer counts.
- `flw:people/handles` Linking Slack, GitHub or another email adds a Handle with its proof. The Gate then matches
  that person by the platform's stable id.
- `ui:join/invite` In the browser, the invite lane on the Joining board works end to end.
- `ui:onboarding/first` In the browser, onboarding steps 1 to 8 work. Skipped steps show up in "Getting started".
- `ui:settings/all` Every settings screen on the canvas exists and saves.
- `ui:access/pages` No page a person's role may not open is shown to them: not in the navigation, and not by its
  address. A page that fails to load says so and offers to try again.

#### Sandboxes and billing (lane: platform)

- `flw:sandbox/run` A run uses its agent's environment. Setup runs once, and secrets reach it by name through the
  vault, never as values in a file.
- `flw:sandbox/hours` Sandbox time is metered per workspace. The included hours, the overage and the limit behave as
  on the Billing screen.
- `flw:billing/seats` Adding a member adds a seat. Removing one takes effect at renewal.
- `live:sandbox/clone-test` On staging: a run clones `sandbox`, runs its tests in a container and reports the result.

### Alongside · Chat SDK spike (any time after 2)

Not a milestone: it decides whether chat platforms are promised.

#### Spike (lane: spike)

- `spike:chat-sdk/slack-in-do` The Slack adapter receives an event, verifies it and replies from inside a Durable
  Object. Records what does not work.

## 5. Old modules to new

What happens to each module of today's prototype.

| Today | Becomes | Note |
|---|---|---|
| `identity`, `visitor` | `auth` | Better Auth replaces Tailscale headers and typed names |
| `directory` (one global object) | `workspaces` on D1, plus the `workspace` object's list of managers | The singleton goes away |
| `workspace` (an object per Pi session) | `workspace` (one per tenant) and `manager` (one per manager) | The biggest split: 1,469 lines today |
| `agent`, `agent-config` | `agents` | Saving makes a new version (decision 19). The draft-and-deploy tests in `directory/agents.test.ts` are replaced |
| `admin` | the agent editor under Build | |
| `chats` | the manager chat, plus one-off chats | |
| `documents` | `pages`: the mission page and its sub-pages | There is no Library (decision 27) |
| `history` | `search` | Grows to tasks, pages, events and people |
| `schedule`, `transcript`, `web`, `protocol`, `connection` | kept | `protocol` gains the new messages |
| `workspace-client`, `directory-client` | `workspace-client`, `manager-client` | |
| `http` | kept | Gains `/in/:source` and `/api/auth/*` |
| `app`, `ui` | rebuilt to the canvas | Astryx templates as listed on the canvas |
| new | `vault`, `permissions`, `audit`, `inbox`, `sources` (with `email` and `github` inside), `gate`, `board`, `people`, `sandboxes`, `billing` | Each has all six slots |

## 6. Screens not drawn yet

These get drawn before their `ui` eval is written:

- a one-off chat
- a mission sub-page
- phone layouts of the Inbox, Needs you and the board
- a source that lost its connection
- the screen when a spending limit is reached

## 7. The goal prompt

Paste this after `/goal`:

```text
Build Co-worker in ~/projects/pi-exp by raising `pnpm score` until every eval in
docs/build-plan.md passes.

Read first: docs/build-plan.md (the book: evals, test worlds, milestones), docs/model.md (what the product is,
including "Where data lives"), docs/actions.md (the manager's actions), ~/AGENTS.md (code shape). The screens
are on the design canvas https://claude.ai/artifact/XGrk8UAk3nmYGfNfBH8fqL; build UI with Astryx only.

Order: the four milestones in order (1 Foundations, 2 A manager works, 3 It hears the world, 4 Teams and
money); milestone 4's joining work may start once 1 is done. Start with gate:repo (git init), gate:score and
gate:ratchet, so every later step is measured. Within a milestone, run lanes in parallel when their files
don't overlap.

Rules:
- One eval or a small group per step, on its own branch; merge only when `pnpm score` is green and no
  passing eval turned red. If the ratchet fails, revert the step.
- A test's name is only its eval id. Never add an eval that isn't in the book, never edit a claim, never
  weaken a test to pass it. If an eval looks wrong, write the proposed change in docs/book-changes.md and
  carry on with other evals.
- Follow ~/AGENTS.md: six slots per module, errors as values, dependencies injected, one composition root
  (src/main.ts), no file over 250 lines. Outside services go through interfaces with fakes in testing.ts
  (section 2 of the book).
- Fast and ui tiers need no network and no real keys. Skip live evals until their secrets exist; don't
  create accounts, domains or GitHub Apps yourself.
- After every `pnpm score` run, and when a milestone or task finishes, start one subagent with
  `model: "sonnet"` that follows .claude/skills/update-build-dashboard/SKILL.md, and keep working while it runs.

Stop and ask me only when: a book change blocks every remaining eval in the milestone, a decision isn't
covered by docs/model.md, or the live tier needs setup from section 3 of the book. Done when every fast and
ui eval passes; report what live evals still wait on.
```

## 8. The dashboard

https://claude.ai/artifact/1QeAK2p8LzcazB113T7yds shows the score, each milestone, the lanes and every eval.

- **What it reads.** `node scripts/dashboard-data.ts` turns this book and `status/score.json` into
  `status/dashboard/evals.json` and `runs.json`. `pnpm score` writes `status/score.json` as
  `{ evals: { "<id>": "pass" | "fail" | "missing" }, history: [{ at, pass, fail, missing, total, commit }] }`.
- **Who updates it.** A Sonnet subagent following `.claude/skills/update-build-dashboard/SKILL.md`, started two
  ways: by the climber after every score run or finished task (the goal prompt above), and by the scheduled
  task "Durable Teams build dashboard" every 2 hours.
- **How staleness shows.** Both datasets go stale after 48 hours without an upload, and the page says when the
  last score ran and turns that line amber after two days.
