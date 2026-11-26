# Proposed book changes

> **Old.** Kept for the record, do not build from it. Start at [AGENTS.md](../../AGENTS.md); [design.md](../design.md) is what is agreed.

Changes to evals in docs/build-plan.md that the climber thinks are wrong. Each waits for Aaron. Until one is
approved, its eval stays as the book says, and the climber works on other evals.

## 1. `gate:score`: tests with no id

**Approved 2026-11-24** (Aaron accepted the recommendation). Applied to the book.

**The claim now:** "`pnpm score` prints the table, writes `status/score.json`, and fails on an id that is not in the
book or a test with no id."

**The problem:** "a test with no id" fails the run, so every test must be an eval. The repo has 175 unit tests (the
`schedule`, `transcript`, `protocol`, `web` and `history` modules among them) that guard real behaviour but match no
eval, and the plan keeps those modules. Passing the claim as written means deleting them, or renaming them to ids
the book doesn't have, which the other half of the same claim forbids.

**Proposed claim:** "`pnpm score` prints the table, writes `status/score.json`, and fails on a test named like an
eval (`kind:area/name`) that is not in the book, or on two tests with one id. A test with no eval id is a support
test: it doesn't score, but if one fails the `tests` gate is red and the score is 0."

**What is built:** `pnpm score` behaves as approved, and `gate:score` in `src/modules/score/score.test.ts` checks it.

## 2. `acc:manager/tools-are-actions`: tool names cannot hold a dot

**Approved 2026-11-24** (Aaron accepted the recommendation). Applied to the book.

**The claim now:** "The manager's tools are exactly the actions in actions.md, with the same ids."

**The problem:** Anthropic and OpenAI accept tool names of letters, digits, `_` and `-` only, so a tool named
`task.create` is refused by the provider. The action ids keep their dots everywhere else (Permissions, the audit
log, buttons).

**Proposed claim:** "The manager's tools are exactly the actions in actions.md: one tool per action, named by its id
with `.` written `_` (`task.create` is `task_create`)."

**What is built meanwhile:** that, and the eval's test checks it: the tools the model is offered, with `_` read
back as `.`, together with the actions set to off, are exactly the ids in actions.md, and no two collide. Actions
set to off are left out because model.md says so ("off: the tool isn't offered at all"). If Aaron wants the claim
kept as written, the test is the one to change.

## 3. Screens no eval covers

**Approved 2026-11-24.** Applied to the book.

**The problem:** the book has five `ui` evals. `ui:settings/all` covers the settings screens, and the others cover the
board, Needs you, joining and onboarding. A person spends most of their time on screens none of them names: the chat,
a run's transcript, the mission page, Events, search. 73 of 73 would therefore not mean a finished app.

**Proposed: eight new `ui` evals, each with a claim a browser can check.** Each also saves its screenshots at
1440×900 and 390×844, for a person to look at: no eval can say a screen looks right.

Milestone 2:

- `ui:chat/talk` In the browser, a person writes to a manager and the answer appears as it is made. After a reload the
  chat is the same, and a person with no model connected reads what to do about it.
- `ui:run/transcript` From a task, a person opens the agent run, reads its steps and its report, and stops a running
  one.
- `ui:mission/page` A person reads and edits the mission page, opens a sub-page, and sees who changed it last.
- `ui:search/open` Search finds tasks, mission pages, managers and people, and opens each with the keyboard alone.
- `ui:shell/phone` At 390 wide, every page is reachable and usable: no page scrolls sideways, and nothing that can be
  clicked on a desktop is missing.

Milestone 3:

- `ui:events/list` Events shows what arrived, what it became and why one was ignored. A person filters it and opens
  the task an event made.
- `ui:sources/connect` A person adds a manager's email address and a GitHub repo, chooses the events it hears, and sees
  when a source loses its connection.

Milestone 4:

- `ui:access/pages` No page a person's role may not open is shown to them: not in the navigation, and not by its
  address. A page that fails to load says so and offers to try again.

**The cost:** the book goes from 73 evals to 81. The score falls to about 65 of 81 until they are built. Milestones 2 and 3
stop being complete until their new evals pass.

**The five screens in section 6** (one-off chat, mission sub-page, phone layouts, a source that lost its connection,
the spending limit) are still not drawn. `ui:mission/page`, `ui:shell/phone` and `ui:sources/connect` include three of
them. Aaron said the canvas need not match strictly, so they would be designed in the app and shown as screenshots.

## 4. `acc:manager/tools-are-actions`: actions nobody has built

**Approved 2026-11-24** (Aaron chose to hide them). Applied to the book.

**The claim now:** "The manager's tools are exactly the actions in actions.md: one tool per action, named by its id with
`.` written `_` (`task.create` is `task_create`)."

**The problem:** 41 of the 70 tools a new manager is offered have no handler. 23 of them are set to ask, so a person is
asked to allow something, says yes, and the call then fails with "is not available yet". The claim keeps them offered.

**Proposed claim:** "The manager's tools are exactly the actions in actions.md that are built: one tool per action,
named by its id with `.` written `_` (`task.create` is `task_create`). Every one offered can be carried out."

**What is built:** an action is offered once it has its input in `manager/internal/parameters.ts`. The eval's test presses
every action's button with no input, takes those that answer "is not available yet" as not built, and checks that the
tools are the rest less those set to off. The catalogue, the Permissions screens and actions.md still list every action.

## 5. The outside people on email are on the test domain

**Approved 2026-11-24** (Aaron: use co-worker.tech, not a personal Hostinger domain. The words were "I want to use this
domain. That is a different domain. That's my personal email."; moving the mailboxes to the test domain is what we
understood from them). Applied to the book.

**The book said:** the person on email is a Hostinger mailbox on another domain (section 2), set up by Aaron (section 3, row 1b,
with `HOSTINGER_MAIL_TOKEN` and `SINK_TOKEN` in row 6). `live:email/round-trip` is mail "the allowed person sends from Hostinger".

**It says now:** two mailboxes on the test domain, `dt-person@` and `dt-stranger@`, in a Worker of their own (`dt-mailbox`).
`live:email/round-trip` is mail "the allowed person sends from their own mailbox". What the evals check has not changed.

**What is lost:** no other provider's DKIM. Mail goes from Cloudflare to Cloudflare only, so the live tier no longer shows
that mail signed by somebody else's provider counts as verified, or that another provider accepts and threads the manager's reply.

## 6. Managers' addresses are on one domain

**The model change: approved 2026-11-24** (Aaron: "Yes, change it"). Applied to docs/model.md and built.
**The claims' wording: proposed, not approved.** The claims in the book are unchanged.

**The problem:** a manager's address is `launch@acme.<mail domain>`. Cloudflare's Email Routing has a catch-all for a domain itself but
not for its subdomains, each workspace's subdomain must be added by hand, and a zone holds at most 30 domains. So a 30th workspace
could not have mail. And mail from anyone on the mail domain or under it is dropped as our own, so a person on that domain (the live
tier's two people, entry 5) cannot write to a manager.

**The change:** `launch.acme@<mail domain>`, and `launch.acme+dt-14@…` for a Task. The last dot separates the manager from the workspace. One
catch-all carries every workspace. Our own mail is mail from an address of that form or from the app's own send-from address.

**Claims whose wording would differ** (proposed, not approved; what they check does not differ):

- `flw:email/new-request`: "to `launch@…`" becomes "to `launch.acme@…`".
- `flw:email/reply-follows`: "A reply to `launch+dt-14@…`" becomes "A reply to `launch.acme+dt-14@…`".
- `live:email/round-trip`: "to `launch@<test domain>`" becomes "to `launch.live@<test domain>`".

**What it costs:**

- The part before the `@` is at most 64 characters, so a manager's own part of it is at most 24 (it was 30).
- A person on the mail domain whose address holds a dot (`jane.doe@<mail domain>`) looks like a manager and is dropped.
- All workspaces send from one domain, so they share one reputation. Before, each had its own subdomain.
- Mail to an address of the old form is refused. Nothing is deployed, so nobody has one.

## 7. Dashboards

**Proposed, not approved.** Built on `step/dashboards`; the book and the score are untouched.

**The book said:** a workspace opens on its Inbox, and a manager has Chat, Board, Mission and Events. Nothing shows how the
work is going: how many tasks are open, how many agents are running, what waits on people, what was finished, what arrived
and what became of it.

**It says now:** two screens that count it, from real data only.

- **Home**, at `/ws/<workspace>`: tiles (open tasks, agents running, waiting on people, needs you), tasks created and finished
  per day, and events per day by what became of them, over a switchable 7 or 30 days (UTC days). A rail that scrolls on its
  own holds "Needs you" (open Inbox items, newest first, each opening its item) and the managers with their state; on a
  narrow screen it folds into the content. Home is in the sidebar above Inbox. A workspace with no managers shows what to do first.
- **Overview**, at `/ws/<workspace>/m/<manager>/overview`, in each manager's sidebar group below Chat: the manager's name
  and mission line, tasks by lane, a burndown, tasks created and finished, "Blocked and waiting" (tasks that need a person)
  and a table with one row per agent and its progress. It has no timeline of milestones: tasks have no due dates, and none are invented.

**Evals proposed** (one sentence each; not added to the build plan or the score):

- `ui:home/overview`: Home counts the open tasks, the agents running and what waits on people from the managers' real boards,
  lists the person's open Inbox items newest first with each opening its item, and shows no chart for a workspace with nothing in it.
- `ui:manager/overview`: A manager's Overview shows its tasks by lane, its burndown and the tasks that wait for a person, each
  opening its task, and a row for each agent with how many of its tasks are done.

**What it costs:**

- A task's `finishedAt` is new: the day it was last moved into the last lane. A task finished before this change has only the
  day a person settled it, and one moved there by an agent has no earlier day; they count from the day they are next moved.
- "Finished" means the last lane, as the board already treats it. A board with one lane has no finished tasks.
- Counts come from the board, so a task that was archived or deleted leaves the history.
- The charts need a library, `recharts` (3.10.1, the newest release at least two weeks old), which Astryx's own dashboard
  templates use. It is the only chart code, in one file of `ui`, and loads when the first chart is shown.
- What a heard line became is counted from the line's words and the manager's decision, as the Events page reads it.
