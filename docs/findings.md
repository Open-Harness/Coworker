# Findings

What is wrong, as found by using the product on staging. Nothing here is being fixed yet: first the list, then a plan.

- **Found by**: `you` (used it) or `code` (seen while tracing one of yours, or in a review).
- **Cause**: `known` (shown in the code, the docs or a measurement), `likely`, or `open`.
- **Weight**: `blocks` (cannot go on), `hurts`, `rough`.

Two kinds, because they are planned differently:

- **F, fixes**: it was decided, and what is there does not do it.
- **M, the model**: what the product is meant to be is unclear, missing or wrong. Decide these before fixing the screens
  that depend on them.

Last changed: 25 November 2026. 78 fixes, 12 model questions.

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
