# Findings

What is wrong, as found by using the product on staging. Nothing here is being fixed yet: first the list, then a plan.

- **Found by**: `you` (used it) or `code` (seen while tracing one of yours, or in a review).
- **Cause**: `known` (shown in the code, the docs or a measurement), `likely`, or `open`.
- **Weight**: `blocks` (cannot go on), `hurts`, `rough`.

Two kinds, because they are planned differently:

- **F, fixes**: it was decided, and what is there does not do it.
- **M, the model**: what the product is meant to be is unclear, missing or wrong. Decide these before fixing the screens
  that depend on them.

Last changed: 26 November 2026. 104 fixes, 12 model questions.

## Connecting a model

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F1 | "Open the sign-in page" for ChatGPT lands on OpenAI's "A required parameter is missing" | It opens the sign-in | blocks | you | known: `app/internal/RouterLink.tsx:8` cuts the address at `?`; the router then links outside addresses without the rest. "Copy its address" works. The earlier explanation (the Claude app) was wrong |
| F2 | After signing in: "The provider lists no models" | The plan's models are listed | blocks | you | likely: OpenAI's docs give `{models: [{slug, visibility}]}` for this sign-in; `models/internal/probe.ts` reads `{data: [{id}]}`. Not seen on a live call |
| F3 | Even with F2 fixed, a manager could not think with ChatGPT | It answers | blocks | code | likely: OpenAI documents `/responses` with `store: false, stream: true` for plan tokens; `models/internal/forward.ts` sends `/chat/completions` |
| F4 | The person copies a dead `127.0.0.1` address back by hand | One sign-in, nothing to paste | hurts | you | known: OpenAI's open flow only returns to the person's own computer, and we are hosted. A hosted client needs OpenAI's approval. Their terms for a hosted product are not checked |
| F5 | Pressing Finish a second time says the sign-in "was already used" | It can be tried again | hurts | you | known: `models/internal/chatgpt.ts` uses the sign-in up before the test call |
| F6 | Command Code (own endpoint) is refused: `MODEL_NOT_IN_PLAN: GPT-5.4 Mini` | The person picks the models they use; one they lack does not fail the rest | blocks | you | known: `probe.ts` tests one model it picks, the first with "mini" in its name |
| F7 | Another Command Code entry: "The provider answered 404 Not Found" | It says which address was asked and what to change | hurts | you | open |
| F8 | Each failed try stays as another "Not working" row, with no visible way to remove it in setting up | A retry replaces it, or it can be removed there | rough | you (screenshot) | open |
| F9 | The test call failing is all the error there is: no model named, no next step | It says what was tested and what to do | rough | you (screenshot) | open |

## The manager

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F10 | The manager asks its questions in chat; the Inbox says "Nothing waits for you" | "A structured question, never buried in a report" (`model.md:19`) | blocks | you | likely: it has `question_ask` (on), but `manager/internal/manager-agent.ts` never tells it when to use it, and the tool's description is one label. Not tried with a real model |
| F11 | "Answer its first question" in Getting started cannot be finished | It can | hurts | code | known: it waits for an answered Inbox question, which F10 prevents |
| F12 | Not every screen action is a tool: 30 of 76 | Every button is a tool with the same id (`actions.md`) | hurts | you (asked) | known: an action without parameters is left out (`manager/internal/parameters.ts`). Missing: all sources, who-may-ask and self actions, task comments/subtasks/links, run messages and retry, new messages |
| F13 | Tasks are numbered `DT-1`, from the old name Durable Teams | Named for the workspace, or Co-worker | rough | you (screenshot) | known: `DT-` is written into the code |
| F14 | The Board's count of open questions never goes up | It counts | hurts | code | known, unfixed since the review |

## Board and task

The canvas named the template for each of these screens (its Inventory board): Kanban `kanban-board`, List
`table-grouped`, Console `incident-console`, Task `work-item-detail`. None was used for these four. Only the workspace
Inbox (`table-inbox`) and Events (`incident-console`) follow theirs.

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F25 | Board and Task look nothing like the templates chosen for them | They are built from those templates | blocks | you | known: built from scratch. `ui:manager/board` claims "as on the canvas" and its test only looks for three task titles in each view. Nothing in the book claims the Task page at all |
| F26 | A lane marked "Asks first" asks nobody: anyone, the manager too, moves a task straight through it | A person approves a task leaving that lane (`model.md`, the lane's own setting) | blocks | code (you asked what the badge means) | known: `manager/internal/handlers.ts` `moveTask` never looks at `needsApproval`, and no other code does. A lane's `limit` is not looked at either. `task.approve` is not built |
| F27 | Clicking a card opens a thin panel on the side; the task itself is a second, small "Open" button in it | A click opens the task | hurts | you | known: `BoardScreen.tsx` |
| F28 | The task page is a form: title, description, lane, owner and every field are always input boxes, with three Save buttons | It is read first, and each thing is edited where it stands. `work-item-detail` has status, priority, assignee and labels as small selectors in the header; Linear has them in the side panel. Neither has a Save button for them | blocks | you | known: `TaskTextForm.tsx`, `TaskDetailsForm.tsx`, `SaveBar` |
| F29 | A description is raw text in a box | It shows formatted, with "Done when" under it, as drawn on the canvas | hurts | you | known: the page's form shows no Markdown. A task has no "Done when" |
| F30 | Missing from the task page, all in the template and drawn on the canvas: subtasks with progress, watchers, what it depends on and blocks, attachments, what it follows, what it has cost | They are there | hurts | you | known: `task.subtask`, `task.link`, `task.follow` are in the list of actions and have no code |
| F31 | Comments and History are two separate lists, far down the page | One activity list, with the comment box under it | hurts | you | known: `TaskActivity.tsx` |
| F32 | A card shows its number, one field, a stage and who started it | Priority, title, two lines of description, owner, agents on it, comments, when it changed and is due, and a menu (open, assign to me, move to…) | hurts | you | known: `KanbanView.tsx`. The board is not sent the owner or the number of comments; a due date is there only if the board has such a field |
| F33 | No way to add a task, filter, search, sort or group on the board | All five, as drawn on the canvas | blocks | you | known: not built. No button anywhere calls `task.create` |
| F34 | Nothing can be changed in the List | A cell is changed in place, as in Linear | hurts | you | known: `ListView.tsx` shows words only. Groups do not fold, unlike `table-grouped` |
| F35 | Lanes and fields cannot be changed from the board; it does not say that Settings is where, or that the manager can do it | Change them where you see them, and choose what a card shows. Linear: one "Display" menu with grouping, order, hidden lanes and which properties show | hurts | you | known: only under Settings → Board; `lane.*`, `field.*` are tools the manager has |
| F36 | A `person` field is a plain text box | A picker of people | hurts | code | known: `TaskDetailsForm.tsx` `FieldInput` has no case for it |
| F37 | Making a person the owner does nothing for them: no Inbox item, no mail, no list of their tasks, not shown on the card or in the list | They are told, and it is in their work | blocks | you | known: `board-handlers.ts` `setOwner` only stores the id, and takes any text |
| F38 | A lane with nothing in it says "Nothing here" | It says what would be here (a lane has a "meaning"), as in the template | rough | you | known: the meaning is not sent to the board |
| F39 | The incident console has nothing to press | Actions of its own (Mark mitigated, Escalate, Declare incident) | rough: not needed now, you said | you | known: a task has no actions beyond moving it. See M5 |
| F40 | The template's moving parts cannot be copied as they are | Decide first: allow a template's own styling in named files, or keep the rule and lose dragging | rough | code | known: `kanban-board` and `work-item-detail` style themselves with StyleX, and `pnpm check:ui` refuses `xstyle`. Dragging is also why that template needs it, and you do not need dragging |
| F41 | A question to a mistyped or unknown email waits forever: nobody can see it or answer it | Refused, with who can be asked | hurts | code | known: `manager/internal/tools.ts:51` takes any email; the store does not check it is a member |

## The manager's settings, tools and events

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F42 | A manager has no settings for itself: no model, instructions, spending limit, pause | The "Agent and budget" tab drawn on the canvas | blocks | you | known: not built. Every manager is the same fixed agent (`manager/internal/manager-agent.ts`); `model.md` gives a Manager an `agent` and the canvas says "pick one here when you make a manager"; `ManagerProfile` has none. All `self.*` actions but Permissions are not built |
| F43 | No list of the agents working now | "Running" under each manager in the sidebar, as drawn, and a page of all of them | blocks | you | known: not built. Runs are only listed on their own task; the server has no route that lists them |
| F44 | A manager may start every agent in the workspace, and nothing shows or limits it | Its own list, shown and changeable | hurts | you | known: `manager/internal/agents-section.ts` gives it all of them |
| F45 | No Sources page for the workspace: connection, who uses it, recent deliveries | As drawn on the canvas (Sources, and one page per source) | hurts | you | known: not built; a source is only inside one manager's settings |
| F46 | What arrived cannot be read in Events: only a title. The message of anything not admitted is kept nowhere | The whole message, its sender and thread, and what happened to it | hurts | code | known: an event is one sentence (`workspace/internal/hearing.ts`), which the page takes apart again with patterns (`team-build/internal/heard.ts`) |
| F47 | Two of an agent's four tools do not exist, and nothing can be added | Edit files and read web pages work; tools can be added. See M7 | hurts | code | known: `agents/types.ts` `built: false`; the form hides them |
| F48 | What an agent does outside is not under Permissions at all: with commands on, it uses GitHub as far as its token goes | On, ask or off, like everything else. See M8 | blocks | code (you asked) | known: Permissions cover the manager's actions only; a run's tools are not checked (`worker.ts`, `command.ts`). The token is for one repo, at most an hour, read-only for a fork |

## Skills

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F49 | A skill is a form on a page: a name box, a list, a plain text box, checks, versions and a delete banner, one under another | The editor drawn on the canvas: file tree with folders and search, tabs, line numbers and highlighting, checks and sandbox output in a drawer below, About, Used by and Versions at the side | blocks | you | known: `team-build/internal/SkillForm.tsx`. Every file is a `TextArea` |
| F50 | A new skill is saved broken: named `test`, and its own SKILL.md still says `my-skill` | The name is in one place | hurts | you (screenshot) | known: `SkillForm.tsx` `STARTER` is fixed text; checks are only shown after saving, and do not stop it |
| F51 | No upload, no folders, no "Try in sandbox" | As drawn | hurts | you | known: not built |
| F52 | "Delete this skill" is a large warning always on the page, for a thing that is not wrong | In a menu | rough | you (screenshot) | known: `SkillForm.tsx` uses a warning banner |

## Templates

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F53 | "This is pointless": four cards that cannot be opened, changed or added to. The same four are in New manager | Either a page that earns its place (open one, change it, save a manager as one), or no page: choosing happens in New manager | hurts | you | known: the four are written into the code (`manager/internal/templates.ts`, and again in `template-list.ts` and `NewManagerDialog.tsx`). A template is lanes, fields, a first view and permissions; nothing of the manager itself (M9) |

## Agents

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F54 | New agent is one long plain form beside an empty "No agents yet" column | The editor drawn on the canvas: cards for instructions, model, tools and connections, skills, environment; versions and used-by | blocks | you (screenshot) | known: `team-build/internal/AgentForm.tsx`, `MasterDetail.tsx` |
| F55 | No "Try in a chat", no "Used by", no way to open or restore a version; "What changed" is asked of an agent that does not exist yet | As drawn | hurts | you | known: not built |

## The loop does not close

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F56 | When a worker finishes, its manager is never told, so nothing follows | The result wakes it | blocks | code | known: `worker.ts` `reportTool` only writes the board. The manager's conversation is submitted to in two places, chat (`manager/service.ts`) and outside events (`heard.ts`) |
| F57 | A comment a person writes on a task, or a card they move, reaches no one | The manager and the worker hear it | blocks | code | known: `board-handlers.ts` `comment` only stores it |
| F58 | The manager's prompt is the same four sentences for every manager and does not hold its mission | It knows what it is for | blocks | code | known: `manager-agent.ts` `PREAMBLE`, `agents-section.ts` |
| F59 | A worker is not given its task's description, or the mission: only the title and a brief | It knows what it is doing and why | blocks | code | known: `runs.ts` `briefOf` |
| F60 | Accept mode Auto does the same as Observe; the rules it speaks of do not exist | As in `model.md` | blocks | code | known: `gate.ts` reads only `off`; nothing else reads it |
| F61 | 46 of the 76 actions in the catalogue have no handler for a manager | Built, or not listed | hurts | code | known: searched `manager/internal` for each |
| F63 | It remembers nothing it was told | Corrections and facts are kept, with who said so | blocks | code | known: no such store anywhere |
| F64 | Nothing happens on a date, and nothing unanswered is chased | Schedules, reminders, a stand-in | hurts | code | known: `schedule.update` has no handler; no deadline on an Inbox item |
| F65 | A person's own words on an approval count as a refusal: the action is turned down, with the words passed on | It reads them, and asks again if unclear, as the screen promises | hurts | code | known: `call.ts`, `Options.tsx` |
| F66 | An approval does not show what will be sent: one sentence, no draft, no "Edit, then post" | What, where, to whom, why | blocks | code | known: `tools.ts` sends no `detail` for an approval |
| F67 | A chat or a run longer than 200 entries shows only its first 200 | The latest | blocks | code | known: `partial.ts` reads oldest first with a limit and no next page |
| F68 | While it waits for an answer, a manager may take no other chat or event | Other work goes on, as its screen says | blocks | code | likely: `question.ask` parks the turn, and new messages queue behind it. Not run |
| F71 | An agent's thinking level is never sent to a model | It is | hurts | code | known: `brain/internal/provider.ts` declares every model `reasoning: false` |
| F72 | Mail held outside working hours is dropped, and a failed notice is not tried again | Sent later | hurts | code | known: `settings/internal/deliver.ts` |
| F73 | Mail from one manager to another is dropped as "our own mail came back" | Managers can write to each other, without loops | hurts | code | known: `email/internal/receive.ts:46`. No manager knows of another (`ManagerProfile`) |
| F74 | A comment on a line of a pull request is not heard | It is | blocks | code | known: `github/types.ts` has five events, `pull_request_review_comment` is not one |
| F75 | It never hears that checks passed, or that a pull request was merged or closed | It does | blocks | code | known: `github/internal/events.ts`: `FAILED`, `PR_ACTIONS` |
| F76 | A review on a pull request its own worker opened does not reach the task | It does | blocks | code | likely: the opening is dropped as "our own comment" (`receive.ts`), so its thread is never followed. Not run |
| F77 | It can only comment on GitHub: no way to open, review, merge or close but by hand in a shell without `gh` | Actions of the app, with permissions | blocks | code | known: `GitHubApi` has one action, `comment` |
| F78 | A worker starts in an empty container, with no clone of the repo | In a clone that installs and tests | hurts | code | known: `sandboxes` `PLAIN`; `environment` has a setup script only |

F62, F69 and F70 are about who may do what on staging, and are kept elsewhere until they are fixed. So is the list of everything
the canvas drew and the build left out.

## Speed

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F15 | Pages take very long to load | Usable within about 1 s | blocks | you | known, measured 25 Nov: Inbox 1.3 s, Chat 1.7 s, Board 1.9 s, Overview 2.2 s per request, with 5–15 ms of CPU. The rest is waiting on data far away |
| F16 | Nothing says where the time goes | Each request says what each step took; slow pages are recorded | hurts | you (asked) | known: no observability setting, traces or timings; only error logs |
| F17 | Every request asks the sign-in database in Western Europe before it starts (session, membership, workspace) | One trip, near the data | hurts | code | likely: read in `auth`, `workspaces/internal/members.ts`; the steps are not timed one by one |
| F18 | Every page starts empty and fetches again, also when coming back to it | It shows what it had, then refreshes | hurts | code | known: `team-core` `useLoading` keeps nothing |
| F19 | Chat asks again every 0.6 s though an answer takes 1.7 s | Changes are sent to the page | hurts | code | known: `ChatPage.tsx`. One person clicking around sent about 550 API requests in seven minutes, most of them pages asking again |
| F20 | The browser checks every file again on each load, and one is 866 KB (66 are preloaded) | Files with a hash in their name are kept | hurts | code | known: `cache-control: max-age=0` |

## The rest of the product

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F21 | staging.co-worker.tech opens the old prototype chat | Your workspaces | hurts | code | known: `routes/_app/_chat/index.tsx:4` |
| F22 | Staging hears GitHub events from all six repos (200 in seven minutes) | Only the test repo | rough | code | known: the App is installed on all of them |
| F79 | “Create your workspace” has an “Ask to join a workspace instead” button bottom left, across from Create. It is odd and clunky | No join on that page. Joining is its own step after signing up, only when there is a team to join; otherwise by the invite or the link a team gives you | hurts | you | known: `team-start/internal/CreateWorkspacePage.tsx:106` |
| F80 | The sidebar is too busy: Build's six links sit under the managers | Build's pages are in Settings. The sidebar keeps System, Inbox, Search and the tree, with a mark only on a manager that is stuck or waits for you | hurts | you | known: agreed, drawn |
| F81 | “In and out” and the words around it (came in, became work, went out, sent back) are inconsistent and ugly | One set of words, each said one way everywhere | annoys | you | known: drawn as Connectors, and Received, Taken on, Delivered, Returned. Waits for a yes |
| F82 | Every manager has a “Talk to” button, as if managers were who you speak to | You and everyone else speak to one named co-worker, in chats that fork. Managers are how it splits its work | hurts | you | known: drawn, waits for a yes |
| F83 | No screen has anything that runs by the clock | Routines, of the co-worker and of each manager | hurts | you | known: `src/modules/schedule` has them, no screen does. Drawn, waits for a yes |
| F84 | Search only finds chats, documents and messages (`ui/internal/SearchPalette.tsx`) | One palette for everything: ask, do, be shown, go, find | hurts | you | known: drawn, waits for a yes |
| F85 | No drawn screen shows how a manager decides: things come in, work appears. No policy, no kinds of work, no mandate. “Look for new work: weekdays 08:00” stands for all of it | What comes in (also what it goes and finds, on a cadence, with an agent, over a list), what it may take on, how far each piece may go; and the co-worker guides you through setting that up | blocks | you | known: first-principles 1 to 38 dropped DeepSeek’s middle, which model.md had. The spike has half (F60, F64). Proposed in [manager.md](manager.md), drawn, waits for a yes |
| F86 | “New manager” is a wizard in which a person designs: name, connectors, when to look, a limit. Nothing asks what they want to get to | You explain the objective; the co-worker writes a plan from a fixed set of primitives, rehearses it, makes it on your yes; the settings screens show parts of that plan | blocks | you | known: no objective, plan or schema anywhere. Proposed in [manager.md](manager.md), drawn, waits for a yes |
| F87 | Overview and System chart Received, Delivered, Returned and Time to done: the manager’s own activity, written by itself | A result read where the manager cannot write, with what it was before, a target, and what must not get worse; “Not yet” where there is no number | blocks | you | known: goals in the sample were outputs too (“merge 20 pull requests”). Same proposal |
| F88 | A manager has no workflow. Making one takes a name, a template and a mission (`workspace/types.ts` `CreateManager`); a lane is a name, a meaning, an approval and a limit (`manager/types.ts` `Lane`), with no agent, no input, no output and no check. [model.md](old/model.md) says “lanes are the manager’s workflow”. The [manager.md](manager.md) proposal has it only as `steps` | You describe the work; it looks at how it is done now; a workflow is generated: the steps from raw to finished, who does each, with what, and what must be true to go on. It is kept as the manager’s own documentation | blocks | you | known. To be agreed in words before anything is drawn |
| F89 | Nobody sets up the hill climb. Nothing says how a manager gets better: no evals, no past cases, no rule for keeping a change. First-principles has one paragraph (how I read 19 to 25); “evals” in the code are for building this product | Whatever the field, its evals, its cases and its climb are set up with the workflow, and it is clear by whom | blocks | you | known. Same |
| F90 | A manager has no skill of its own. Skills reach an agent as one flat list it can read (`agent-engine/internal/settings.ts:6`); a manager has a template and a mission (`workspace/types.ts:65`), so nothing says how it works, and the layers (harness, connector, craft, its own) are not there | Skills are layered, and a manager has one that says what it is and its working process: crons, agents, skills, measures | blocks | you | known. [manager.md](manager.md#skills-and-the-one-that-is-the-manager) |
| F91 | Nothing says if a skill, agent or cron is any good. Versions are kept (`settings/internal/skills.ts`), never compared | Each has a measure; they get better over time | blocks | you | known. Same |
| F92 | A set-up cannot be read, edited and commented on as a draft. A manager is made by a form, at once | A custom walkthrough for this one set-up, with rounds of questions, a step to connect and look at the past, then a draft of everything, editable, with comments | blocks | you | known. [manager.md](manager.md#the-set-up-skill) |
| F93 | On a piece of work from a GitHub thread, a run may get no token at all, so it can neither clone nor push | It gets exactly what it needs | blocks | code | likely: `github/internal/channel.ts:11` asks for `contents: write`; `live/github-app-manifest.json` gives the App `contents: read`, GitHub refuses a wider token, and `workspace/internal/token.ts` turns that into none without a word. `sandbox-token.test.ts` passes because the fake grants anything. The App's real permissions were not looked at |
| F94 | The repo has no checks in GitHub, so “CI fails, CI passes” has nothing to hear, and `main` has nothing to require | `pnpm check` on every pull request | hurts | code | known: no `.github/workflows` |
| F95 | What a model costs is not counted: not per issue, not at all, so a limit in money has nothing to read | Tokens and price of each call, on the work it was for | blocks | code | known: `brain/internal/provider.ts:23` declares every cost as 0, and `settings/internal/usage.ts` says model spend “is not metered here” |
| F96 | Several managers on one repo each get their own copy of an issue, and each may start work on it | One takes it on | blocks | you (several managers of one sort), then code | known: `github/internal/receive.ts` `route` hands the event to every manager listening, under a different id for each |
| F97 | No drawing has templates: nothing to pick one from, open one, or save a manager as one. The drawn Agents page lists three models written into it | A library; New manager starts from a template, or from what you say; each agent's model is picked from what is connected, with its thinking level | blocks | you | known: the drawing has `start` and `setup` only; `playbook/agents.tsx` `MODELS` |
| F98 | A manager's own model cannot be chosen. Only a saved agent's, or the workspace's | Each manager, and each agent in it, the judge and the reviewer too | hurts | you, then code | known: `brain/service.ts` `modelRoute()` is called with no choice for a manager, though `models/types.ts:110` speaks of one |
| F99 | `pnpm check` fails on a fresh clone: “dist: not built; run pnpm build first” | It passes, or builds what it needs | hurts | code, run | known: `scripts/check-ui.ts` `doctor` looks at `dist/client`, which `check` does not build |
| F100 | Since `AGENTS.md` is there, `pnpm check:ui` fails: astryx doctor warns that it has no Astryx section | It is ours, and has none | hurts | run, 25 Nov | known, fixed: `scripts/check-ui.ts` leaves that one warning out |
| F101 | A mail of ours that came back, or was complained about, is dropped as "automatic"; nobody is told it did not arrive, and it would be written to again | The work that sent it knows, and why; an address that does not exist is not written to again | blocks | code, spike, 25 Nov | known: `email/internal/parse.ts` throws away every mail with `Auto-Submitted` or an empty Return-Path. [real-events](spikes/real-events.md) |
| F102 | A sender is proven only if the signature is exactly of their domain. A company that signs as `mail.its-domain` is a stranger | A domain above or below it that is theirs counts | hurts | code, 25 Nov | known: `email/internal/parse.ts` |
| F103 | GitHub is heard by the verb of a delivery: a late or doubled one is believed, only failed checks are heard, and dismissed reviews, edits, deletions and settled lines are not | What is true comes from the newest records, in any order | blocks | code, spike, 25 Nov | known: `github/internal/`. Steps by verb end right 566 times of 1,400; records 1,400 of 1,400. [real-events](spikes/real-events.md) |
| F104 | The drawings contradict each other in five small places: the MCP page names its secrets otherwise than Keys; Coding uses a skill "GitHub" that the library does not have; Sales' Evals show two steps and the playbook refuses a step with none; a draft's head says 28 lines and has 45; intake row 1 made a work the board calls SALES-34 | They agree | rough | run, 25 Nov | known. Where the app reads both from one place it will agree by itself; the fixtures show each page as drawn |

## How we test

| # | What happens | What should | Weight | Found by | Cause |
|---|---|---|---|---|---|
| F23 | 81 of 81 passed with all of the above true | A green score means a person can use it | blocks | you | known, four ways: the fakes copy what our code assumes (F2, F3); the model is scripted, so nothing sees what a real one chooses (F10); parts are tested without what surrounds them (the F1 test leaves out the router link); whoever wrote the code wrote its test |
| F24 | `acc:manager/tools-are-actions` passes at 30 of 76 | It fails until they are there | hurts | code | known: the claim says "exactly the actions that are built". A book change, so not made |

## The model

What you said, against what the model and the code say now.

| # | What you said | Today | To decide |
|---|---|---|---|
| M1 | The Inbox should be a lot more holistic, and everyone should have their own | Each item already belongs to one person, but nearly all of them to the same one: an approval always goes to whoever made the manager, and a question too unless the manager types an email (`manager/internal/tools.ts:51,106`). Nothing tells a manager who is in the workspace | What puts something in a person's Inbox, and how a manager picks the person: the task's owner, a role, who asked for the work? What happens when they do not answer? |
| M2 | More than questions | The canvas drew Questions, Asks, Reviews and Escalations. Built: question, approval, notice. A task that is ready for review or blocked counts as "needs you" on the board and never reaches an Inbox; nor does a task given to you, a mention or a comment | Is the Inbox everything that needs or concerns a person, with what needs an answer first? |
| M3 | If unblocking takes more than a decision, the person's work should be on the board | A task is work for agents, with an `owner` who answers for it. There is no task *for* a person, so a manager can only ask for an answer | Can a person do a task the way an agent does (assigned, done, it unblocks another)? Is the owner that person, or someone else? Linear keeps Assignee and Agent apart |
| M4 | Four views make no sense; Console and Inbox are the same | Same list and panes, different headings (`SplitView.tsx`). `model.md` says every view is always available. "Inbox" also means the workspace Inbox, and a support manager is a "Support inbox" | Which views are kept, and is Inbox one of them? |
| M5 | The console needs an actual schema, structured outputs and actions | A board has typed fields, the same for every task on it. No actions of its own, and an agent's report is text | Does a manager have kinds of task, each with its fields, its actions and the report its agents must fill in? You said not now; it decides how M3 and F39 are built |
| M6 | The agent should customise rows and columns | It has the tools for lanes and fields. Which fields a card or the list shows, and their order, is not stored anywhere | Is how a board looks part of the board (the manager and people change it for everyone), each person's own, or both? Linear has both |
| M7 | Where are tools and MCP? There should be something like an adapter or plugin | MCP exists in two sentences of the docs and nowhere in the code. `model.md` calls a *source* a plugin, and it only listens and replies | Is there one thing, a connector, with three parts: what it tells you (events), what you can do with it (actions), and its own view? With GitHub, Email, Slack and any MCP server as kinds of it |
| M8 | Where are the permissions of GitHub, email, an MCP server? | One fixed list of our own actions. Nothing for what a connector can do | Does each connector bring its actions, each on, ask or off, per manager? And per agent, or does an agent get what its manager allows? |
| M9 | Where are the manager's own settings, what is its agent, what can it call? | Settings are Sources, Who may ask, Permissions, Board. The manager itself is not a thing you can open | Is a manager an agent with a mission and a board (so the same editor: model, instructions, tools, connectors, the agents it may call)? |
| M10 | Events are a fire hose; each goes to a manager and may become nothing, one or several things | Every event already belongs to one manager; if two listen to one repo each gets its own copy. One event makes at most one task. Nothing holds the stream before it is shared out | Is there one stream for the workspace, with routing to no, one or several managers, and from a manager to no, one or several tasks? |
| M11 | Each adapter should have a view as the agent sees it: its mail inbox (answered, to do), its Slack threads | Email and GitHub show one line in Events and the manager's chat. What was sent out is not shown anywhere but the task's history | Is this a manager's view of each connector (its mailbox: threads, what it answered, what waits), and is Events then only the raw log behind it? |
| M12 | (follows from M7 to M11) | Person, manager and run each reach the outside differently: Inbox, sources, shell | Do all three work through the same connectors and permissions, each with their own inbox? Then the person's Inbox (M1) and a manager's are one idea |

## What lies under them

Not conclusions, places to look when planning.

1. **Outside services were imagined, not recorded.** F2, F3, F6, F7, and perhaps GitHub and email paths nobody has used by hand.
2. **The manager's behaviour was never specified or tried with a real model.** F10, F11, F12, F14.
3. **Distance and waiting were never measured.** F15 to F20.
4. **The score measures the book, not the product.** F23, F24.
5. **The chosen templates were not followed, and nothing checked.** F25 to F35. Only screenshots were kept "for a person to look at".
6. **Settings that are stored and never obeyed.** F26 (approval, limit), F37 (owner). Worth a search for more.
7. **The model says who decides, not who does.** M1 to M3: people are there to approve, not to work.

## Building, slice 1: what could not be known

Written while building the pure middle, 26 November 2026. Each is the smallest choice that keeps the evals green, or a place where two locked pages disagree. **D** is a disagreement between locked pages: built as the eval says, and the other page should change.

| # | Where | What disagrees | Built as |
|---|---|---|---|
| D1 | `threads/README.md`, Settled by the evals, last line, and `evals/rules/threads.eval.ts`, the offer | The README: `Offer.tools` has every action on or ask. The eval: `github.push` (ask) is only in `asks`, not `tools` | The eval: `tools` the on actions, `asks` the ask ones |
| D2 | `work/README.md` (a manager step tells the manager's doer) and `evals/rules/work-ends.eval.ts`, `moved-by-a-person` (it "only waits there") | Whether a person moving work into a manager step starts the doer | The eval for `moved`; the README for every other way in |
| D3 | spec O5 (how often it looks may change alone) and `trials/README.md` (names no cadence line) | Whether a cadence change may go alone | The README |

### Choices, by module


**boxes / choosing**

- boxes `checkBundle`: empty and `.` path segments dropped before testing `.github/workflows/` (README: `./` and `//` still name it; `a/./b` not said). `.github/workflowsx/`, `docs/workflows/` are not workflow files. Order: default branch, then not its own branch, then workflow files, then size (refused when strictly over `most`).
- boxes `createBoxes` left as a stub: no rule eval reaches it; the pages do not fix its idempotency table or SqlStorage shape. Built when a flow needs it.
- choosing fallback: only to levels above the first that names a model (`inherit`/`null` skipped); a level naming the same connection and model as the one that failed is not another.
- choosing `room`: the narrowest reached limit, in the order work, manager, workspace; none reached → tells of the first near limit in list order.
- choosing `parts`: when the whole is not enough, each ask is cut by the same share (whole / total); a negative whole counts as 0.

**asks / mcp**

- asks: a `know` with a date not after `at` is accepted (README refuses a missing or past date for every need but `know`, and says nothing of know with one).
- asks `answer` refuses in order: may not answer, gone, already answered, empty, not an option. An answer must equal an option id exactly ("YES" is refused).
- asks: the README's last two settled lines (a one-day default for tool-call and to-do asks; answering by a GitHub comment) are not this module's functions; they belong where asks are made and where comments are read.
- mcp `mayBe`: parsed with `new URL`, so numeric and hex hosts and `user@host` come out as the real host; a trailing dot is dropped. Private beyond the spec's list: 0/8, 100.64/10, `::`, fc00::/7, fe80::/10, IPv4-mapped IPv6, the bare names `local` and `internal`.
- mcp `toolName`: `mcp_<server>_<tool>`, anything outside [A-Za-z0-9_-] as `_`; the prefix means it can never be one of ours.

**coworker / knowledge**

- coworker `talkingTo`: when no group fits, a careful "anyone" (polite and brief, only what is public, no sign) — the contract is not nullable and the README does not say. A domain fits only exactly; an empty domain never.
- knowledge `clash`: only the existing notes must be kept (the new one is usually still proposed); a note with the new one's id is skipped; a curly apostrophe counts as a straight one.
- knowledge README's last line (a note from a comment by someone inside is also proposed as a change to `agents/<id>/told`) has no function in `Knowledge`; whichever module makes `Proposed` must do it.

**connectors / doings**

- doings registry: the 81 doings' ids, groups, roles, co-worker defaults, stops and fields follow evals/rules/data/doings.ts exactly; their labels, pages, control names, sentences and undo words are ours, read from nowhere. A field's label comes from its name ("perWork" → "Per work"). Page names (managers, work, intake, chats, connectors, people, keys, billing, profile, security, environments, workspace, co-worker) are not fixed anywhere.
- doings palette: a doing's `about` is its group; matched on label or id only; the ask line is `Ask: <words>`, nothing for empty words. A sentence is "{by} {template}", an empty field filled by its label in lower case. The co-worker acting for someone gets the lesser of the two, with the stricter side's why. The last step of a walk that stops says "<control> is yours to press."
- connectors `checked`: one problem at a time, in order: not an object, a fixed part, an unknown key, a missing needed one, a wrong kind; a number is finite, a list is of text.
- connectors: the registry holds what the evals check (set-up steps, events, actions, skills of evals/rules/data/connectors.ts), our own words for each. `receive`, `act`, `standing` wait for intake.

**intake**

- `question`: every outside field (open work titles, item title, actor, text) has its line breaks put as ` / `, so no outside line can be the closing line; "outside" is not written before the mark.
- A listed bot not spoken to is overheard like anyone; spoken to, it is asked.
- Stop: whether the actor may stop is read from the work's own manager's rules with addressed true; a cron or wait never stops; a stop from anyone else joins the work.
- Verdicts: fit clamped to 0..1, a repeated manager/kind keeps its first, the judge's order kept. `decide` with nothing settled and no judgement: CouldNot, saying why. A tie within 0.1 is asked (1e-9 of slack for floating point).

**github-events**

- Ties in real data: open and closed records of the same item in the same second, on 6 of 35 real pull requests. Settled by rank: closed after open, deleted after both; no tie is left in the real traces.
- An item's labels are kept sorted (the real traces end sorted while events come in their own order).
- A dismissed review is heard (`review`), not noise. Ours coming back is noise, its records kept.
- Records do not say who acted, so `moved` and `ready` are not told when the item is ours; `ended`, `conflict`, `checked` always are. A review that is only a wrapper (commented, empty) is not told; its line comments are.
- Checks: the newest id of each (app, name) counts; cancelled or stale counts as nothing; of a commit's checks, failed over running over passed. The `checked` key has the deciding check ids, so a rerun that passes again is told again. Answers take max(updated, at).
- Work events: check ids and heard fields are not fixed by the pages; chosen: `review`, `checks`, `mergeable`; `heard.item` is "<login>: <text>". No work event for moved, ready, or a review off the head or only a comment (those go out as heard), nor a review taken back (heard).

**mail-events**

- A report (bounce, complaint, delivered, late) is `Mail`, not `Noise`, so its state is kept; only list, machine and our own mail are noise.
- A report reaches a conversation only through the Message-ID it is about; about a mail not ours or not kept, it has none and is not told. A report that comes before our sent mail is told once that mail is kept.
- A plain-text bounce (about 20 of the 57 recorded) gives one report for the message, its first recipient: `why-it-did-not-arrive` wants one report for lhost-exim-02 and lhost-qmail-02, which name two. So a second wrong address in such a bounce is not closed. Machine-readable ones give one per recipient.
- `why` is read from the words first, the status second (missing in many, wrong in some: "5.0.0"); all of 5.1.x is "no such address"; of several recipients only the first's lines are read.
- Away goes before machine (rfc3834-06 has Precedence: bulk and a no-reply sender). A report's `of` is the first Message-ID after the first embedded message.
- `asWork`: new person mail → heard (wrote, item = mail id); away → heard (away, item = the told key); bounce or complaint → failed, by connector, check `delivered` (our choice of id). `answer` always says autoSubmitted null (every auto case is already No). A conversation waits for nobody when the last mail is ours and everyone else is closed to. Late and delivered are not told (Told has no case); they change `sent` only.

**threads / tree**

- A checker's tools are its own cut to check, read, bash and skill, never more (a checker without `check` in its list cannot call it); README says "exactly", the eval's comment says "has only what it has". Judges always get `judge`; the co-worker in a chat its eight chat tools. `tries` and `searches` are offered as `does`.
- A connector action is offered only while the mandate holds, a place is given, and a grant covers that account and place (or `*`); the strongest grant wins; dotted names not on the mandate are dropped.
- Outside words: each line marked so it cannot be a prompt line or close its block (every Unicode line break), with a sentence before the first saying they are outside and not instructions. Tool-call arguments are rebuilt from known own keys only.
- tree: a move that would give a manager more than its new parent has is refused, not narrowed (the README allows either). Narrowing below is tree's own cut (not `reaches.narrow`): limits a manager never had stay out, a `*` place becomes the parent's places. Children of a retired manager move up to its `above`; retired managers stay in `under`; `under` and `above` nearest first. Roll: a node with no row counts zero and idle.

**measures / trials / walkthrough**

- measures: a point's time and its line are those of the reading's `of`, not `at`; the line of the current standing is the line at `now` (the eval needs it, the README does not say). `Worse.now` is NaN when nothing settled was read (the type allows only a number). `NotYet.until`: when the first unsettled reading counts; with none, now plus the settle time; with an unknown before, now.
- trials `score`: a case passes when more than half its runs pass; cost is the mean per case, summed; spread is the mean of 2·min(pass, fail)/runs. `mayAlone` of no change is true. Cadence: spec O5 says how often it looks may change alone, the README's list names no cadence line; followed the README. Case ids are a content hash, salted when taken; `held` takes the lower half of each part by id.
- walkthrough: `made` is `manager-<walkthrough id>` (pure code cannot mint an id). Answers to questions outside the latest round are ignored (the eval needs a draft-stage "make it" for q1 to walk); a round of none is allowed; a question asked again, two cases with one id, or "that is wrong" about an unknown finding is refused; throw away at any stage not ended.
- walkthrough `score`: the types have nowhere to say who edited a line; a `you said` line no asked question lists in `changes` counts as a person's edit. A real record of edits needs a type.
- walkthrough `because.yaml`: written as simple `key:` blocks of why, by, where — our own format, to be checked against playbook's reader.

**playbook**

- `skills.yaml` and `because.yaml` may be missing and read as empty; SKILL.md, objective, workflow, triggers and reach are needed. `skills/<id>/SKILL.md` holds the body only (its front matter comes from skills[]); a skill's other files are kept as they are.
- Read sorts agents, evals and skills here by id, skills here before listed ones; write then read is the same.
- Lines: each `##` section is an exact slice with its heading, so the slices joined are the page (adding a section changes the old last one's text, which a new-section edit allows). `objective` has empty text; a grant line carries its account and place; a skill here is its whole SKILL.md, otherwise YAML.
- The name, `because` and a skill's other files are no shown line but merge three ways; diff and apply ignore them. If one of the three cannot be read, merge (and diff) go file by file. A clash of meaning after a merge (a step added to a kind the other removed) is a Clash on that line. A new line in apply goes at the end of its group.
- Beyond the README: read refuses duplicate ids and grants; check refuses an eval of nothing and an event its account does not offer. Kinds are checked against `Surroundings.above` (the wider eval), not reach.yaml.
- YAML: the `yaml` library cannot keep some texts (a line of only spaces); then the value is written with every text double-quoted.
- oxlint warns twice `no-thenable`: the locked types have a `then` key.

**work**

- `Work` has nowhere to note that a thread died once at a step: each first `unanswered` adds code evidence, met false, check `unanswered@<step>`; the second at the same step asks. No leave or done-when names that id.
- A person who says passed or failed with no `person` on the event is recorded as code (work-ends and work-waits send `failed by: person` with no name; `person?` is optional in types.ts).
- A failure follows the step's `otherwise` only when the failed check is one of that step's leaves; any other is evidence only.
- No cascade on old evidence: entering a step moves at most once per event; evidence from earlier (merged while at Build) is held and used at the next evidence event there. The last step is checked on every evidence event, so merged and closed work in either order.
- "The agent of the last agent step before it" skips checking steps (in templates/repo the manager's own hands are then the doer). The manager's doer is its last `does` thread: told if working, started if ended. A person moving work back adds the same "nothing before counts" evidence as a send-back. `answered` on a person's step ends it with no evidence.
- `take` sets order 0 and priority soon (said nowhere). `narrowed` uses `reaches.wider`. `opened again` turns a stopped mandate back to holds; a taken-back one stays. `reported done` from a checker is refused (it uses `checked`; it may report no or stuck). After done on a step whose unmet leaves are commands and no checker started, next is `ci`. A replayed `answered` is refused (no record of keys; the evals allow it).

**templates**

- A person blank with no answer takes its best, the literal `whoever makes it` (README: a person is always answered; `fill("repo", {})` lists only `["repo"]`), which check then refuses as an unknown person. Nothing in the types tells `fill` who makes it.
- An answer with a line break is refused at `template.yaml`, the blank's id as the line (the README allows refusing or one text).
- `read` also refuses a `{{id}}` in a file where it is no blank; both written templates pass.
- `saveAs`: places become `repo` (GitHub), `mailbox` (email), `place` (other); people `owner`, `person`, `person2`…; a model blank takes its agent's id; clashes numbered; unused dropped. Names are swapped at word boundaries in all text ("ama" leaves "drama"); model names in free text are not swept. Files that do not read as a playbook: secrets cut, no blanks (the type has no way to say so). `gone` lists only what was cut outright (secrets, eval cases), one entry per file and kind, never the text.
- `newer` finds the manager's own value of each blank by matching the new template's text and YAML against `given`; one not found takes its best or empty. YAML with blanks and front matter is written again from a parsed document: reformatted, the same playbook.

## Building: flaky under load

| # | What happens | Found by | Cause |
|---|---|---|---|
| B1 | `pnpm climb --all` at 27368c8 says two kept tests broke: `brain.test.ts` "sends the workspace a path and a body…" and "speaks Anthropic's path…". Run alone, `brain.test.ts` passes 7 of 7, and slice 1 changed nothing in `brain` | code | likely: a timeout while every tier runs at once |
