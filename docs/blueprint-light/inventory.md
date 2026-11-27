# Inventory: what the screens say Co-worker is

Phase 0 of [the blueprint light](../prompts/blueprint-light.md). Written 26 November 2026, on branch `core` at 5288f4c.

The screens are read as the source of truth. The old backend is read only for whether a doing has a handler. How it was made:

- Every `src/screens/*/route.ts` and `index.tsx` was read, with the components, reads and presses it uses.
- The doings registry was loaded and listed in full (`src/modules/doings/internal/registry.ts`). The handler map was grepped (`src/modules/console/internal/do-*.ts`).
- Each screen was compared with its drawing in `design/src/screens/<same name>`.

## In numbers

| | |
|---|---|
| Routes in the console | 34 paths in 23 screen folders, plus 5 outside a workspace |
| Reads (`Reads` in `src/modules/api/types.ts`) | 43 |
| Writes that are not `/do` | 9 (`/inbox/:ask`, `/chats`, `/chats/:chat`, `/chats/:chat/fork`, `/set-up`, `/set-up/:walk`, `/templates/:template/try`, a connector conversation, `/settings/mcp-servers`) |
| Registered doings | 81 |
| Doings with a handler | 24 |
| Without a handler, and pressed by a screen | 27 |
| Without a handler, and pressed by no screen | 30 |
| Pressed but not registered | 1 (`ask.remind`, `screens/inbox/index.tsx:77`) |
| Controls that only toast or change local state | about 45 (listed under each row, and in [Gaps](#gaps)) |

## Where state lives

These are the store calls used in the table. The settled decisions are one Durable Object per piece of work, and the manager is configuration.

| Store | Holds |
|---|---|
| **work DO** | One per piece of work. Its state and lifecycle, and its Pi Harness: the doing forks, the fresh checkers, the transcripts. Also the conversations it follows (mail, WhatsApp, Slack and GitHub streams), its box and its cost rows. |
| **chat DO** | One per root Juno chat. Its forks live in the same storage, because Pi forks only work inside one storage. |
| **workspace DO** | One per workspace. The co-worker: soul, talking, may do, spending, memory, history. The manager tree, and each manager's configuration: playbook files, versions, comments, cases, trials, triggers, settings. Templates saved here, shared agents, skills and environments. Account and MCP server records. Intake items and decisions, asks and their always-rules, the audit table, and the rollups (overview, usage). |
| **D1** | What crosses workspaces or must be listed: auth, people, sessions, members, invites, join requests, the workspace index, billing, a person's profile and notifications. Also index rows mirrored from the work DOs: the work index (board, counts) and the thread index. |
| **R2** | Blobs: exports, invoices, attachments, big diffs and outputs, large skill files. |
| **vault** | Secret values, encrypted (the `vault` module, `VAULT_MASTER_KEY`), referred to by name. Never in a view. |

**Intake sits in the workspace DO, not D1.** "At most one manager takes it" (spec I5) needs one serial place that sees every manager hearing that place.

**Work lists sit in a D1 index.** This follows the audit's decision 2: "listing a manager's work needs a D1 index, which work keeps anyway". Orthograph's compiler refuses a list read on an actor-backed thing (F5), so the list has to be a database thing anyway.

## Routes

Marks in **Actions**:

| Mark | Means |
|---|---|
| ✓ | registered, with a handler |
| ✗ | registered, no handler: the console refuses it in words |
| ∅ | pressed but not registered |
| ◌ | the control only toasts or changes local state: nothing is sent |
| → | navigation only |

All paths are under `/ws/<workspace>` unless marked *outside*.

### Workspace and Juno

| Route | Screen file | Components | Data | Actions | Noun and operation | Store |
|---|---|---|---|---|---|---|
| *outside* `/` | `landing/index.tsx` | `Waiting` | `GET /api/workspaces` | redirects | none | D1 (workspace index) |
| *outside* `/sign-in`, `/sign-up` | `signin/`, `signup/`, `door/SignIn.tsx` | login card: `Button`, `Link`, input | `GET /api/sign-in`, `GET /api/me` | `POST /api/auth/sign-in/magic-link` (`SignIn.tsx:67`), `…/social` (`:72`): better-auth, not doings | Session.start, Account.create | D1 (auth) |
| *outside* `/join` | `join/index.tsx` | `Door`, `Card`, `Avatar` | `GET /api/join/known`: workspace name, address, people, managers, owners | `POST /api/join/request {address}` (`:28`). → `/start` | JoinRequest.ask | D1; the Owner's ask is in that workspace's inbox |
| *outside* `/start` | `start/index.tsx`, `steps.tsx`, `workspace.ts` | `Stepper`, `SelectableCard`, `RadioList`, `NumberInput`, `Switch` | `GET /api/start/repos` | `POST /api/workspaces {name, address, region}` (`workspace.ts:23`). ◌ model, key, daily limit, connector, repos, join policy: collected, never sent | Workspace.create | D1 (index, member), then the workspace DO; the key goes in the vault |
| `/` Home | `home/index.tsx`, `composer.tsx` | `ChatComposer`, `ClickableCard`, `ToggleButtonGroup`, `DropdownMenu` | `/home`: suggestions (category set, know, do or learn; heading, prompt, link); `/shell` | `POST /chats {text, key}` (`:25`) → the chat. ◌ the mode menu "Do it / while I watch / only answer" (`composer.tsx:120`). ◌ attachments (`:99`) | Chat.start | chat DO; chat index row in the workspace DO |
| `/inbox` | `inbox/index.tsx`, `pane`, `rows` | `Table` (rowStatus), `Layout`, `ResizeHandle`, `EmptyState` | `/inbox`: items with ask (to, need, about, question, why, options, state), standing (asks, waits, know, done), proposes, links | `POST /inbox/:ask {answer}` (`:78`). ∅ `ask.remind` (`:77`). The `always` field of `/inbox/:ask` has no control | Ask.answer, Ask.remind | workspace DO: one place for an ask, since it can be answered from the inbox, GitHub, Slack or mail (A4) and an `always` rule spans works (A6). Answering signals the work DO that waits |
| `/chats` | `chats/index.tsx`, `rows.ts` | `Table` (tree), `StatusDot`, `Avatar` | `/chats`: chats (title, with, where, last, state working, waits or quiet, under, knew) | → `/` for a new chat | Chat.list | workspace DO (index of chats) |
| `/chats/:chat` | `chat/index.tsx`, `column.tsx` | `ChatLayout`, `ChatMessage`, `ChatToolCalls`, `ChatComposer` | `/chats/:chat`: chat, lines (by, text, did, from, calls), forks | `POST /chats/:chat {text, key}` (`:25`). No control calls `/chats/:chat/fork`. `did`, `from` and `showMe` are in the view and not drawn | Chat.say, Chat.fork | chat DO |
| `/overview` | `system/index.tsx`, `goals`, `scorecard`, `trends` | `SegmentedControl`, `Grid`, `ProgressBar`, `Card` | `/overview?period`: tiles, daily, objectives (standing, progress), changed | none; the period is a read parameter | reads Objective, Measure | workspace DO rollup, fed by the work DOs |
| `/managers` | `tree/index.tsx`, `columns`, `rail`, `pages` | `Table` (tree, sort, resize, keyboard), `TabList`, `Markdown`, `Badge` | `/tree`: rows (above, name, version, connectors, limit, objective, standing, open, waiting, cost, is), trying, pages | → `/set-up`, `/`, `/juno/history`, settings | Manager.list | workspace DO (the tree); counts from the D1 work index |
| `/juno`, `/juno/:page` | `juno/index.tsx` and one file per page | `Layout`, `List`, `Table`, `Switch`, `TextArea`, `TreeList` | `/coworker`: identity, voice, soul, never, talking, triggers, skills, setUp, memory, corrections, may, spending, history | per page, below | Coworker.* | workspace DO |
| `/set-up`, `/set-up/:walk` | `setup/index.tsx`, `walk`, `look`, `questions`, `draft` | `Stepper`, `ChatComposer`, `RadioList`, `MetadataList` | `/set-up/:walk`: walk (stage, said, rounds, wants, objective, cases), heard, asked, looks, figures, draft, tried | `POST /set-up {said}` (`:17`). `POST /set-up/:walk`: `answers` (`walk.tsx:75`), `connected` or `skipped` (`look.tsx:39`), `that is wrong` (`look.tsx:144`). ◌ "Keep for later" (`walk.tsx:126`). → "Talk it through instead" drops what was said | Walk.start, Walk.answer, Walk.connect, Walk.skip, Walk.dispute | workspace DO (a walk is a draft playbook, not yet a manager) |
| `/managers/new` | `new/index.tsx`, `pick.tsx` | `Stepper`, `ChatComposer`, `List` | `/templates`, `/settings/connectors` | `POST /set-up {said}` (`pick.tsx:29`). → a template, → all templates | Walk.start | workspace DO |
| `/managers/new/:template` | `new/fill.tsx`, `model-picker.tsx` | `FormLayout`, `Selector`, `NumberInput` | `/templates/:template` (blanks: place, person, number, text, model) | answers are local until Make | none | none (client state) |
| `/managers/new/:template/check` | `new/check.tsx` | `MetadataList`, `Card` | `POST /templates/:template/try {place}`: found (install, test, ran, cannot, notSure) | `/templates/:t/try`. `manager.make` ✓ (`index.tsx:72`). "Open the draft" goes to `/set-up/<template id>/draft`: a template id where a walk id belongs (`:154`) | Template.try, Manager.make | box for the try; then the workspace DO |
| shell, palette, dock | `shell.tsx`, `juno/palette.tsx`, `palette-items.ts`, `dock.tsx` | `AppShell`, `SideNav`, `CommandPalette` | `/shell`: workspace, me, co-worker, tree, people, chats, inbox count, doings. `/search?words` | Palette doings only navigate to `doing.at.page`. "Show me how" → `/walk`. "Ask Juno: …" drops the words. The dock posts `/chats` with `place` | Walk.show, Chat.say | chat DO |

**The Juno pages**

| Page | Control | Doing | |
|---|---|---|---|
| About | every field | none | read only (`about.tsx:28-55`, `onChange={() => undefined}`) |
| Soul | Save (`soul.tsx:21`) | `soul.save` | ✓ |
| Soul | "may suggest a change", "Never" | none | read only |
| Talking | Save (`talking.tsx:17`) | `talking.edit` | ✗ |
| Triggers | switch off (`triggers.tsx:144`), "Run it now" (`:167`), "Add one" (`add-trigger.tsx:46`) | `trigger.off`, `trigger.run`, `trigger.add` | ✗ ✗ ✗ |
| Skills | comment (`skills.tsx:31`) | `line.comment` | ✓, but `manager` is given the set-up skill's id |
| Memory | Forget (`memory.tsx:93`), Accept (`:139`), Leave it (`:145`) | `note.forget`, `note.accept`, `note.leave` | ✓ ✗ ✗ |
| May do | Save (`may-do.tsx:56`) | `coworker.may`, one per changed row | ✗ |
| Spending | Save (`spending.tsx:67`) | `spending.save` | ✓ |
| History | Undo (`history.tsx:83`) | `history.undo` | ✗ |

### A manager

Every page but the sales board sits under `ManagerFrame` (`manager-frame/frame.tsx:11`). Its tabs are Overview, Intake, Board, Playbook, Connectors, Threads and Settings. It reads `/shell`.

| Route | Screen file | Components | Data | Actions | Noun and operation | Store |
|---|---|---|---|---|---|---|
| `/m/:manager` | `overview/index.tsx`, `rail`, `six`, `chart` | `MeasureTile`, `MetricChart`, `Grid`, `Table`, `SegmentedControl` | `/m/:manager`: standing (not yet, or now, aim, line, points), measures (result or guard), brought, rail (who waits), lost and why, connectors | → "Change it with Juno", rail rows, where-lost rows | reads Objective, Measure | workspace DO rollup; the rail from the D1 work index |
| `/m/:manager/intake` | `intake/index.tsx`, `rows`, `inspector`, `came.ts` | `PowerSearch`, `ResizeHandle`, `BottomSheet`, `MetadataList` | `/m/:manager/intake?from&state&before`: rows (item, decision, verdicts, line, mandate, said, work), triggers, kinds. The query is never sent: it filters on the page | `intake.correct` ✓ (`:69`). "Yes, take it on" and "No" on an item that waits also press `intake.correct` (`inspector.tsx:54-55`): a correction where an approval belongs | Intake.correct; Intake.approve is missing | workspace DO |
| `/m/:manager/triggers/:trigger` | `search/index.tsx`, `parts`, `panel` | `TabList`, `MetadataList`, `Collapsible`, `ProgressBar` | `/m/:manager/triggers/:trigger`: row (came, took, cost, next), looksAt, may, spent, steps, found, runs, tried | `trigger.run` ✗ (`:40`); the toast says "Running" before the answer is known. → "Change" | Trigger.run | config in the workspace DO; runs and finds in the workspace DO (intake); the schedule is an alarm |
| `/m/:manager/board`, `/m/sales/board` | `board/`, `sales-board/` (a near copy), `board-kit/` | `Board`, `BoardColumn`, `Card`, `MoreMenu`, `Badge` | `/m/:manager/board`: columns (steps, with waits and more), cards (step, order, priority, next, waits, cost, kind, who, thread, done-when met of n), totals | drag or "Move to …": `work.move` ✓ then always `work.order` ✗ (`board/index.tsx:54-58`), so every move reports a failure. ◌ Add work, Sort, Filter, Search, the List and Console views (`board-kit/layout.tsx:178-186`), "N more" (`sales-board/index.tsx:115`). `work.add` ✓ is never pressed | Work.move, Work.order, Work.add | the D1 work index; the move is in the work DO |
| `/m/:manager/work/:work` | `task/index.tsx`, `header`, `details`, `done-when`, `lists`, `activity` | `PageHeader`, `DetailsPanel`, `Selector`, `Tokenizer`, `AvatarGroup` | `/m/:manager/work/:work`: work (step, kind, done-when, evidence, cost), answers, labels, told, options, from, limit, threads, activity. Gone is drawn | step: `work.move` ✓ (`:78`). Who answers: `work.answers` ✗ (`:80`). Add done-when: `work.done_when` ✗ (`:92`). ◌ kind, labels (`:82`), tick a done-when line (`:108`), "Send to …" (`:124`), "Tell me when it moves" (`:154`). No stop, open again or hand over | Work.move, Work.answers, Work.sayDoneWhen | work DO |
| `/m/:manager/threads` | `threads/index.tsx`, `model.ts`, `tree.ts`, `columns` | `Table` (tree), `Toolbar`, `DropdownMenu` | `/m/:manager/threads`: rows (state, under, work, took, cost, title, knew), conversations, ended7, cost7, limits | none; filters on the page | Thread.list | D1 thread index |
| `/m/:manager/threads/:thread` | `thread/index.tsx`, `transcript`, `header`, `panel`, `composer` | `ChatLayout`, `ChatToolCalls`, `Dialog` | `/m/:manager/threads/:thread`: thread (state, model, version, brief, lines: said, thought, told, called, diff), running, touched, work | ◌ "Stop this thread" (`composer.tsx:32-40`). No composer, by design | Thread.stop (missing) | work DO; big diffs in R2 |
| `/m/:manager/playbook`, `…/:part`, `…/skills/:skill` | `playbook/index.tsx` and 17 part files | `Objective`, `Workflow`, `Triggers`, `Agents`, `Skills`, `Reach`, `Evals`, `Cases`, `Versions` | `/m/:manager/playbook?version`: playbook, files, version, comments, evals, triggers, agents, skills, accounts, cases, because. Also `/m/:manager/versions` | `line.comment` ✓ (`changes.ts:51`). `suggestion.accept`, `suggestion.leave` ✓ (`:46`). `version.save` ✓, but it sends the unchanged `view.files` (`:55`). `version.go_back` ✗ (`versions.tsx:18`). ◌ "Try on past work" (`header.tsx:67`). ◌ every edit of a part (page, objective, steps, triggers, agents, reach, limits, cases) only marks the page dirty | Playbook.comment, Suggestion.accept and leave, Version.save, Version.goBack | workspace DO |
| `/set-up/:walk/draft`, `…/:part`, `…/skills/:skill` | the same `playbook/index.tsx`, as a draft | the same | `/set-up/:walk` → draft | `POST /set-up/:walk {is: "make it"}` (`changes.ts:63`). ◌ "Try again" (`header.tsx:58`). Comments in a draft write nothing (`changes.ts:45,51`) | Walk.make → Manager.make | workspace DO |
| `/m/:manager/playbook/compare/:trial` | `compare/index.tsx`, `lines.ts` | `Table` (grouped), `Token`, `Card` | `/m/:manager/compare/:trial`: trial (of, changes, now and next scores, differ, worse), cases, asks, guards | ◌ "Keep N" and "Use N+1" (`:175`). `try.change` ✓ is never pressed | Trial.decide | workspace DO |
| `/m/:manager/settings` | `manager-settings/index.tsx`, `model.tsx` | `TextInput`, `Selector`, `Switch`, `AlertDialog`, `ModelPicker` | `/m/:manager/settings`: answers, people, model, workspace model and perDay, limits, below, running, waiting, openWork, template | `manager.settings` ✓ (`:64`), `manager.pause` and `manager.start` ✓ (`:166`), `template.save` ✓ (`:183`), `manager.retire` ✓ (`:206`) | Manager.* , Template.save | workspace DO; counts from the D1 index |
| `/m/:manager/connectors`, `…/:connector` | `connectors/index.tsx`, `when.ts` | `SegmentedControl`, lazy views | `/m/:manager`.connectors (works, as, says) | → switch. "All" and calendar show an empty state | reads Account | workspace DO |

### A connector's view

Each is drawn under `/m/:manager/connectors/:connector`. Their conversations belong to the work that follows them.

| View | Screen file | Components | Data | Actions | Noun and operation | Store |
|---|---|---|---|---|---|---|
| Email | `email/view.tsx`, `open`, `pane`, `thread`, `replybox` | `Table` (selection, status), `ChatComposer`, `TextArea` | `…/email`: mailbox, conversations (with, subject, unread, waits, work, has, stopped). `…/email/:conversation`: stream (in, out, draft, note) | `POST …/:connector/:conversation {is: tell, write or hand back}` (`open.tsx:36-38`): not a doing, though `conversation.tell`, `.write`, `.hand_back` are registered. Draft Send answers its ask through `/inbox/:ask` (`ask.ts:13`). ◌ draft Change then Save (`open.tsx:25`): the edited text is never sent. ◌ mark read, mark done (`view.tsx:40,57-75`) | Conversation.tell, write, handBack; Ask.answer | work DO; attachments in R2 |
| WhatsApp | `whatsapp/view.tsx`, `list`, `pane`, `send-box`, `sending.ts` | `Pane`, `ToggleButton`, `Banner` | `…/whatsapp`: number, works, conversations (group, saved, stopped). `…/:conversation`: stream | the same conversation write (`view.tsx:36,39`). → "Scan the code" to settings, which presses `connector.scan` ✗. ◌ seen count (`:70`) | Conversation.* | work DO; the phone link is account state in the workspace DO |
| Slack | `slack/view.tsx`, `list`, `thread` | `Pane`, `Card`, `Badge` | `…/slack?channel`: team, channels (threads: state, waits, work, forks), open | the same write, with the Slack thread as the conversation (`:36`). `isYours={false}` is hard-coded (`:78`), so Hand back never shows | Conversation.* | work DO |
| GitHub | `github/view.tsx`, `list`, `record`, `timeline`, `files`, `box` | `Table`, `Tabs`, `ChatComposer` | `…/github?repo`: items (is, state, labels, waits, work, checks). `…/github/:number`: body, stream, comments, checks, files | the same write (`:43,93-106`). ◌ "Yours" (`:47`), lost on reload. Merge, close and re-run are not drawn | Conversation.* | work DO |
| CRM | `crm/view.tsx`, `list`, `columns`, `model.ts` | `Table`, `PowerSearch`, `HoverCard` | `…/crm`: stages, deals (stage, amount, owner, work, waits, closes), total | → a deal page at `…/crm/:deal`, which has a read and no screen: a dead link | Deal.list | the customer's CRM, read through the connector; links to work in the work DO |

### Settings

The frame is `settings/index.tsx`, with its list beside the page and Save in the header. Every page reads `/shell`.

| Route | Screen file | Components | Data | Actions | Noun and operation | Store |
|---|---|---|---|---|---|---|
| `/settings`, `/settings/general` | `pages/general.tsx` | `Part`, `TextInput`, `CheckboxInput` | `/settings/general`: name, address, zone, perDay, tellAt, mayMake, mayTry, mayJoin | `workspace.general` ✓ on Save. The handler keeps only `name` and `perDay` and says Done for all eight (`console/internal/do-general.ts:13-25`). No Export or Delete control, though both are registered | Workspace.update, export, delete | name in D1; the rest in the workspace DO |
| `/settings/members` | `pages/members.tsx` | `Table`, `Selector`, `DropdownMenu`, `Badge` | `/settings/members`: people (role, mails, known accounts, lastSeen), invited, wantIn | `person.role` ✓ (`:93`), `person.remove` ✓ (`:155,167`), `person.let_in` ✗ (`:207`), `person.say_no` ✗ (`:216`). ◌ Invite (`:190`), Send again (`:150`), Link another account (`:73`) | Member.role, remove; JoinRequest.letIn, sayNo; Invite.add | D1 |
| `/settings/keys` | `pages/keys.tsx`, `model-picker.tsx` | `Card`, `Collapsible`, `Table`, `ModelPicker` | `/settings/keys`: models (provider, works, checked, prices, levels), choice, secrets (name, of, usedBy; never a value) | `models.default` ✓ on Save. ◌ Replace (`:106`), Connect another (`:149`); `key.add` and `key.replace` are pressed by nothing | Model.default, Key.add, Key.replace | metadata in the workspace DO; values in the vault |
| `/settings/usage` | `pages/usage.tsx` | `Grid`, `BarChart`, `Table` | `/settings/usage`: days (cost, boxes), by manager, by model, perDay, tellAt | → Juno's Spending | reads Usage | workspace DO rollup of the work DOs' cost rows |
| `/settings/audit-log` | `pages/audit-log.tsx` | `Table`, `Selector`, `TextInput` | `/settings/audit-log?by&outcome&before`: lines (at, by, says, permission, under, approvedBy, outcome, why), next. The query and `next` are never sent | none | reads AuditLine | workspace DO (one table) |
| `/settings/billing` | `pages/billing.tsx` | `MetadataList`, `ProgressBar`, `Table` | `/settings/billing`: plan, people, perPerson, boxHours, nextInvoice, invoices | `billing.download` ✗ (`:57`). ◌ Change plan (`:69`), Update card (`:74`) | Plan.change, Card.update, Invoice.download | D1; invoices in R2 |
| `/settings/connectors` | `pages/connectors.tsx`, `connector-columns.tsx` | `Card`, `Table` (expand), `DropdownMenu` | `/settings/connectors`: connectors, accounts (as, holder, works, scope, usedBy, in7Days, may, asks) | `connector.check` ✗ (`:54`), `connector.scan` ✗ (`:61`), `connector.take_away` ✗ (`:68`), `connector.connect` ✗ (`:147`). GitHub → its own page | Account.connect, check, scan, remove | workspace DO; tokens in the vault |
| `/settings/connectors/github` | `pages/connect-github.tsx`, `github-steps.tsx` | `Stepper`, `CheckboxList`, `Banner` | `/settings/connectors/github`: installed, repos, chosen, abilities (missing) | `connector.connect` ✗ (`:43`), `connector.check` ✗ (`:59`). ◌ the repo choice (`:21`), "Open the app's permissions" | Account.connect, Account.chooseRepos | workspace DO; the app key in the vault |
| `/settings/mcp-servers` | `pages/mcp-servers.tsx`, `mcp-detail.tsx` | `Table`, `SegmentedControl`, `CheckboxList` | `/settings/mcp-servers`: servers (url, signIn, tools with readOnly and on/ask/off, state, usedBy) | `POST /settings/mcp-servers` (`:71`), always with `name: ""`. `mcp.tool` ✗ (`:62`), `mcp.check` ✗ (`:152`), `mcp.remove` ✗ (`:156`). ◌ "Which managers have it" (`:147`) | McpServer.add, setTool, check, remove | workspace DO; the sign-in in the vault |
| `/settings/agents` | `pages/agents.tsx`, `split.tsx` | `Split`, `Table`, `TextArea`, `ModelPicker` | `/settings/shared`.agents (told, model, tools, skills, version, usedBy, measure) | ◌ "Use it in a manager" (`:63`), Save after an edit (`:131`) | Agent.edit, Agent.use | workspace DO |
| `/settings/skills` | `pages/skills.tsx`, `skill-detail.tsx` | `Split`, `Table`, `TreeList`, `Markdown` | `/settings/shared`.skills (layer, files, versions, with and without, cut, usedBy) | ◌ "Add a skill" (`:76`) | Skill.add | workspace DO; big files in R2 |
| `/settings/environments` | `pages/environments.tsx`, `environment-detail.tsx` | `Split`, `Table`, `Selector`, `TextArea` | `/settings/shared`.environments (size, setUp, secrets, starts, usedBy) | `environment.add` ✗ (`environment-detail.tsx:164`), pressed to add a secret, while the registry means a new environment. ◌ Save (`environments.tsx:24`), "Start one to try" (`:89`), remove a secret (`:149`) | Environment.add, edit, remove; Environment.secret | workspace DO; values in the vault |
| `/settings/templates` | `pages/templates.tsx`, `template-card.tsx` | `Card`, `DropdownMenu`, `ToggleButtonGroup` | `/templates`: templates (whose, version, saved, managers and how far behind) | ◌ rename (`template-card.tsx:56`), take away (`:83`). → New manager | Template.rename, remove (not registered) | workspace DO; ours ship in code |
| `/settings/profile` | `pages/profile.tsx` | `Part`, `Avatar`, `TextInput` | `/settings/me`: name, mails (proven), zone | ◌ Save (`:21`), "Send a link to prove it" (`:76`). `profile.add_mail` ✗ (`:82`), sent with `{}` where the field is `mail`. Sign out posts `/api/auth/sign-out` | Profile.edit, Mail.add, Mail.prove | D1 |
| `/settings/notifications` | `pages/notifications.tsx` | `CheckboxInput`, `TextInput` | `/settings/me`: tell (each kind to inbox, mail or Slack), weekAt, quiet | ◌ Save (`:56`); nothing is registered for it | Notifications.set (missing) | D1, because it follows the person |
| `/settings/security` | `pages/security.tsx` | `Part`, `Button` | `/settings/me`: ways, sessions | `security.remove_passkey` ✗ (`:37`), sent with `{way}` where the field is `passkey`. `session.sign_out` ✗ (`:64`), `security.sign_out_others` ✗ (`:78`). ◌ "Add a way to sign in" (`:42`) | Credential.add, remove; Session.end | D1 (better-auth) |

## The nouns

These are the fields and lifecycles as the screens imply them. Fields named in `src/modules/*/types.ts` are taken from there when a screen shows them.

| Noun | Fields the screens show | Lifecycle | Evidence |
|---|---|---|---|
| **Workspace** | name, address, region, zone, perDay, tellAt, mayMake, mayTry, mayJoin | made → open → deleted (30 days to take back) | `start/workspace.ts:23`; `views-workspace/settings.ts:10`; spec L4 |
| **Person** | name, role (Owner, Builder, Member), mails (proven), known accounts on connectors, lastSeen, zone | invited → member → removed; a join request is asked → let in, or said no | `members.tsx`; spec P3, L5 |
| **Co-worker** (Juno) | identity, voice, soul, never, talking (who, how, may, sign), may do (on, ask, off), spending (whole, tellAt, parts), memory notes, history | one per workspace; its configuration, no lifecycle | `juno/*` |
| **Note** (memory) | for, tell, used, said by | proposed → kept, or left; kept → forgotten | `juno/memory.tsx` |
| **Chat** | title, with, where, last, state, waitsFor, under, knew, lines (by, text, did, calls) | working, waits or quiet; a fork knows the lines up to `knew` | `chats/index.tsx:21-45` |
| **Manager** | name, above, version, connectors, limit, objective, standing, open, waiting, cost, answers, model, template | working, needs you, idle and stuck are worked out; paused is set; then retired | `tree/columns.tsx:14`; `manager-settings/index.tsx:166,206` |
| **Template** | name, about, whose (ours or this workspace's), version, blanks (place, person, number, text, model), managers and how far behind | saved → renamed → taken away | `templates.tsx`; `new/fill.tsx` |
| **Walk** (setting one up) | said, rounds, wants, objective, findings, cases, draft, tried | said → first questions → connect → found → second questions → draft → made, thrown away, or carried by another | `setup/steps.ts:26-36` |
| **Playbook** | page, objective, kinds, triggers, agents, skills, reach, evals, because, files | versions: made, edited, from a suggestion, went back (a new version) | `playbook/*`; spec B1-B6 |
| **Comment** | on (a line), part, quote, became | open → a change (offered → taken or left), an answer, or a case | `views-manager/playbooks.ts:9-22` |
| **Kind** | when, alone (off, watch, ask, do), steps, doneWhen, may, limits, look | alone goes back to ask after two corrections | `playbook/workflow.tsx`; spec I8 |
| **Step** | does, by (agent, person or manager), skills, leaves (checks), checkedBy, otherwise (back n times then ask or drop) | data in the playbook: each kind has its own steps, and they are the board's columns | `playbook/kind.tsx`; spec W4 |
| **Trigger** | by (cron, event, wait, asked), on, makes, only, atMost, next, last (done, asked, failed) | on → off; run now | `search/index.tsx`; `juno/triggers.tsx` |
| **Intake item** | item, decision, verdicts per kind, version, mandate, line, said | kept once → took, joined, asked, left (with what it would have done), stopped, or could not tell → said right or wrong | `intake/came.ts:37`; spec I5 |
| **Work** | id (`ACME-412`), kind, version, title, about, from, step, priority, order, mandate, doneWhen, evidence, answers, next (what, who, by), waits, cost, limit, threads, follows | open → ended (done, no, dropped, stopped, handed over), with a reason; opened again only by a person | `work/types.ts:30-71`; `board/card.tsx:20-26` |
| **Thread** | agent, role (does or checks), under (a fork's parent), knew, state, model, version, brief, lines (said, thought, told, called, diff), took, cost | working → waits → ended: reported done, no or stuck, unanswered, stopped, or over its limit | `threads/model.ts:38`; `thread/header.tsx:11` |
| **Ask** | to, need (decide, approve, do, review, know), about, question, why, options, by, else, reminded | open → answered or gone; reminded past its date; an answer can be *always* for a thread, person or kind | `inbox/*`; `asks/types.ts`; spec A1-A6 |
| **Action call** | the action, account, on/ask/off, key, outcome (done, asked, refused, failed) | asked → (yes) → done, refused or failed | audit `outcome` (`audit-log.tsx`); `ChatToolCalls` state; the audit doc's "one door" |
| **Account** | connector, as, holder (the workspace, or lent by a person), works, scope, usedBy, may, asks | connected → offline → connected; lent → given back | `connectors/types.ts:29-39`; spec X5, X14 |
| **Connector** | id, name, what (GitHub, email, Slack, WhatsApp, CRM, calendar) | in code; no lifecycle | `connectors/types.ts:9` |
| **Conversation** | with, subject, unread, waits, work, has (the manager or a person), stopped, stream (in, out, draft, note) | the manager has it → a person takes it → handed back; stopped | `views-connector/types.ts:46-67`; spec X6 |
| **MCP server** | url, signIn, tools (readOnly, on, ask or off), state, usedBy | added → works or failed → removed | `mcp/types.ts:5-13` |
| **Agent**, **Skill**, **Environment** (shared) | told, model, tools, skills; layer, files, with and without; size, setUp, secrets, starts | versions; a manager keeps its own copy; a craft skill is cut when it does not help | `views-workspace/settings.ts:140-179` |
| **Trial** | of, changes, now and next scores, differ, worse, cases | tried → kept, or used as the next version | `compare/index.tsx:175`; spec O4-O6 |
| **Objective**, **Measure** | said, counts, read where, aim and date, line, notWorse, standing | not yet (until when) → read | `overview/*`; spec O1-O2 |
| **Secret**, **Key** | name, of, usedBy, set (never a value) | set → replaced | `keys.tsx` |
| **Audit line** | at, by, says, permission, under, approvedBy, outcome, why | appended only | `audit-log.tsx` |
| **Billing** | plan, perPerson, boxHours, invoices | paid or not | `billing.tsx` |

The likely machines are Work, Thread, Ask and Action call, as the brief guessed. Walk, Intake item and Conversation also have closed lifecycles.

## Built against drawn

Where the built screen and the drawing disagree in a way that changes the model.

| Where | Drawn | Built | Chosen |
|---|---|---|---|
| Juno About, Soul, Talking | Save on all three | About read only; Soul saves the text only | **Drawn**: the blueprint gets a doing for identity and voice, and Soul's *never* and *may suggest* |
| Juno routines | a `routines.tsx` page, with "What it did before" | only the triggers table | **Drawn**: a routine is the co-worker's own cron trigger, with run history (`routine.add` is registered) |
| Chat fork pane | "Open on its own" beside Close | missing | **Drawn**; navigation only |
| Manager settings Save and Pause | toast only | real doings | **Built**: a later decision |
| Account holder | a name | the workspace, or a person who lent it, with who sees what | **Built**: it carries spec X14 |
| MCP tool state | `chosen`: a person set it, not the rule | dropped | **Drawn**: the mark says who decided |
| CRM | a deal page, with tell, note, and yes or no on a pending change | the list, linking to nothing | **Drawn** |
| Connector home | no "All" tab | "All", an empty state | **Drawn**: drop it |
| Task, lanes | `LANES`, kinds Bug, Feature, Upkeep | `step`, `kind` | **Built** names, drawn behaviour |
| Inbox | the same options | adds `beside` (remind, open) | **Built**: remind needs a doing (`ask.remind`) |
| Join | Acme hard-coded | reads `/api/join/known` | **Built** |

## Gaps

What a screen shows or presses that nothing supports, and what the blueprint has to decide.

**Pressed, with no handler (27).**
- Work: `work.order`, `work.answers`, `work.done_when`.
- Playbook and triggers: `version.go_back`, `trigger.add`, `trigger.off`, `trigger.run`.
- Co-worker: `talking.edit`, `coworker.may`, `note.accept`, `note.leave`, `history.undo`.
- Connectors and MCP: `connector.connect`, `connector.check`, `connector.scan`, `connector.take_away`, `mcp.tool`, `mcp.check`, `mcp.remove`, `environment.add`.
- People, billing and security: `person.let_in`, `person.say_no`, `billing.download`, `profile.add_mail`, `security.remove_passkey`, `security.sign_out_others`, `session.sign_out`.
- Pressed and not registered: `ask.remind`.

**Registered, pressed by nothing (30).**
- Managers and playbook: `manager.move`, `skill.add`, `agent.use`, `reach.edit`, `objective.edit`, `eval.judge`, `eval.retire`, `kind.alone`, `routine.add`.
- Work, asks and chats: `work.open_again`, `work.hand_over`, `ask.approve`, `ask.answer`, `ask.always`, `rule.take_away`, `chat.new`, `chat.fork`.
- Connectors and conversations: `account.lend`, `mcp.add`, `conversation.tell`, `conversation.write`, `conversation.hand_back`.
- People, keys, billing and workspace: `person.invite`, `key.add`, `key.replace`, `billing.change_plan`, `billing.update_card`, `security.add_passkey`, `environment.remove`, `workspace.take_back`.

**Done with a handler, and never pressed.** `work.add`, `work.stop`, `try.change`, `workspace.export`, `workspace.delete`.

**Two doors for one thing.**
- `/inbox/:ask` against `ask.answer`.
- A conversation write against `conversation.tell`, `.write` and `.hand_back`.
- `POST /chats`, `/chats/:chat` and `/chats/:chat/fork` against `chat.new` and `chat.fork`.
- `POST /settings/mcp-servers` against `mcp.add`.
- `/set-up/:walk` events against `manager.make`.

The blueprint gives each one operation. The write paths become how a screen reaches it.

**Fields that disagree with the registry.**
- `security.remove_passkey` is sent `{way}`; the registry field is `passkey`.
- `profile.add_mail` is sent `{}`; the registry field is `mail`.
- `environment.add` is pressed to add a secret.
- `line.comment` is given a skill id as `manager`.
- `workspace.general` is sent eight fields, and the handler keeps two.
- `version.save` sends the files it read, not the edits.

**Missing operations the screens imply.**
- Intake: approve an item that waits. Today it is a correction.
- Thread: stop.
- Work: kind, labels, a tick on a done-when line, tell the manager, follow.
- Trial: keep or use.
- Playbook: an edit of each part (page, objective, steps, triggers, agents, reach, limits, cases).
- Template: rename and remove.
- Agent: edit.
- Environment: edit, and a secret.
- MCP: give a server to a manager.
- GitHub: choose repos.
- Conversation: read and done.
- Person: profile, notifications, quiet hours.
- Start: the model, key, daily limit, connector, repos and join policy it collects.
- A walk made from a template (`new/check` links a template id as a walk).

**Shown with no read behind it.**
- The CRM deal page.
- A calendar view.
- The audit log's filters and its next page.
- A thread's role (does or checks) and its ends stuck, no and *not met*, which no screen draws.
- On the task page: `next`, `waits`, `ended`, `mandate`, `sentBack`.
- "Yours" on Slack and GitHub, which have no `has`.

**Questions the model must answer.** These go to Phase 2 and the delta.
1. **Steps are data, not a machine.** Each kind's steps come from its playbook. Orthograph's machine declares fixed states, as K11 makes the column the state. Work's machine is open, waiting or ended; `step` is a field moved by `work.move` under the playbook's rules. That is a delta proposal: a machine whose states are read from data.
2. **Lists over actors.** One DO per work, but the board, threads, overview and counts list across them. The model declares Work in the work DO and an index row in D1, kept by an outbox. Orthograph has no "projection of an actor into a table".
3. **Chat forks.** A fork must share its parent's storage. So the chat DO is per root chat, and `chat.fork` is a move inside it, not a new object.
4. **Who acts.** Spec C6 says the co-worker can never do what the person asking may not. Every doing has `coworker: on | ask | off` and `stops`. Orthograph's `Principal` is a person or anonymous, with no agent, and `notVia` is design prose only.
5. **Approval as a gate.** An action set to *ask* parks until a person's yes (spec H3, A3). That is pi-durable's `beforeTool` with a signal. Orthograph has no gate or signal.
6. **A screen bound to an operation.** `Doing.at` names the page and the control. Orthograph has no screen.

## Appendix: every registered doing

The **Pressed at** column is the first screen file that names the id. A dash means no screen names it.

| Doing | Group | Needs | Co-worker | Handler | Pressed at |
|---|---|---|---|---|---|
| `manager.make` | Managers | Builder | ask, stops | yes | screens/new/index.tsx |
| `manager.pause` | Managers | Builder | ask | yes | screens/manager-settings/index.tsx |
| `manager.start` | Managers | Builder | ask | yes | screens/manager-settings/index.tsx |
| `manager.retire` | Managers | Builder | ask, stops | yes | screens/manager-settings/index.tsx |
| `manager.move` | Managers | Builder | ask, stops | **no** | — |
| `manager.settings` | Managers | Builder | ask, stops | yes | screens/manager-settings/index.tsx |
| `template.save` | Managers | Builder | ask | yes | screens/manager-settings/index.tsx |
| `version.save` | Managers | Builder | ask, stops | yes | screens/playbook/changes.ts |
| `version.go_back` | Managers | Builder | ask, stops | **no** | screens/playbook/versions.tsx |
| `line.comment` | Managers | Member | on | yes | screens/playbook/changes.ts |
| `suggestion.accept` | Managers | Builder | ask, stops | yes | screens/playbook/changes.ts |
| `suggestion.leave` | Managers | Builder | on | yes | screens/playbook/changes.ts |
| `trigger.add` | Managers | Builder | ask, stops | **no** | screens/juno/add-trigger.tsx |
| `trigger.off` | Managers | Builder | ask | **no** | screens/juno/triggers.tsx |
| `trigger.run` | Managers | Builder | ask | **no** | screens/search/index.tsx |
| `try.change` | Managers | Builder | on | yes | — |
| `skill.add` | Managers | Builder | ask | **no** | — |
| `agent.use` | Managers | Builder | ask | **no** | — |
| `reach.edit` | Managers | Builder | ask, stops | **no** | — |
| `objective.edit` | Managers | Builder | ask, stops | **no** | — |
| `eval.judge` | Managers | Member | off, stops | **no** | — |
| `eval.retire` | Managers | Builder | off, stops | **no** | — |
| `work.add` | Work | Member | on | yes | juno/palette-items.ts |
| `work.stop` | Work | Member | ask | yes | — |
| `work.move` | Work | Member | on | yes | screens/board/index.tsx |
| `work.order` | Work | Member | on | **no** | screens/board/index.tsx |
| `work.done_when` | Work | Member | ask, stops | **no** | screens/task/index.tsx |
| `work.open_again` | Work | Member | off, stops | **no** | — |
| `work.answers` | Work | Member | ask | **no** | screens/task/index.tsx |
| `work.hand_over` | Work | Builder | ask, stops | **no** | — |
| `ask.approve` | Work | Member | off, stops | **no** | — |
| `ask.answer` | Work | Member | off, stops | **no** | — |
| `ask.always` | Work | Builder | off, stops | **no** | — |
| `rule.take_away` | Work | Builder | ask | **no** | — |
| `intake.correct` | Intake | Member | off, stops | yes | screens/intake/index.tsx |
| `kind.alone` | Intake | Builder | ask, stops | **no** | — |
| `chat.new` | Chats | Member | off | **no** | — |
| `chat.fork` | Chats | Member | on | **no** | — |
| `connector.connect` | Connectors | Owner | ask | **no** | screens/settings/pages/connectors.tsx |
| `connector.check` | Connectors | Builder | on | **no** | screens/settings/pages/connectors.tsx |
| `connector.scan` | Connectors | Owner | off | **no** | screens/settings/pages/connectors.tsx |
| `connector.take_away` | Connectors | Owner | ask, stops | **no** | screens/settings/pages/connectors.tsx |
| `account.lend` | Connectors | Member | off, stops | **no** | — |
| `mcp.add` | Connectors | Owner | off, stops | **no** | — |
| `mcp.check` | Connectors | Builder | on | **no** | screens/settings/pages/mcp-servers.tsx |
| `mcp.remove` | Connectors | Owner | ask | **no** | screens/settings/pages/mcp-servers.tsx |
| `mcp.tool` | Connectors | Builder | ask, stops | **no** | screens/settings/pages/mcp-servers.tsx |
| `conversation.tell` | Connectors | Member | on | **no** | — |
| `conversation.write` | Connectors | Member | ask, stops | **no** | — |
| `conversation.hand_back` | Connectors | Member | on | **no** | — |
| `note.forget` | Co-worker | Member | off, stops | yes | screens/juno/memory.tsx |
| `note.accept` | Co-worker | Builder | off, stops | **no** | screens/juno/memory.tsx |
| `note.leave` | Co-worker | Member | on | **no** | screens/juno/memory.tsx |
| `soul.save` | Co-worker | Owner | ask, stops | yes | screens/juno/soul.tsx |
| `talking.edit` | Co-worker | Owner | ask, stops | **no** | screens/juno/talking.tsx |
| `coworker.may` | Co-worker | Owner | ask, stops | **no** | screens/juno/may-do.tsx |
| `spending.save` | Co-worker | Owner | ask, stops | yes | screens/juno/spending.tsx |
| `routine.add` | Co-worker | Owner | ask | **no** | — |
| `history.undo` | Co-worker | Builder | ask | **no** | screens/juno/history.tsx |
| `person.invite` | Settings | Owner | ask, stops | **no** | — |
| `person.let_in` | Settings | Owner | off, stops | **no** | screens/settings/pages/members.tsx |
| `person.say_no` | Settings | Owner | ask | **no** | screens/settings/pages/members.tsx |
| `person.role` | Settings | Owner | ask, stops | yes | screens/settings/pages/members.tsx |
| `person.remove` | Settings | Owner | ask, stops | yes | screens/settings/pages/members.tsx |
| `key.add` | Settings | Owner | off, stops | **no** | — |
| `key.replace` | Settings | Owner | off, stops | **no** | — |
| `models.default` | Settings | Owner | ask, stops | yes | screens/settings/pages/keys.tsx |
| `billing.change_plan` | Settings | Owner | off, stops | **no** | — |
| `billing.update_card` | Settings | Owner | off, stops | **no** | — |
| `billing.download` | Settings | Owner | on | **no** | screens/settings/pages/billing.tsx |
| `profile.add_mail` | Settings | Member | off | **no** | screens/settings/pages/profile.tsx |
| `security.add_passkey` | Settings | Member | off | **no** | — |
| `security.remove_passkey` | Settings | Member | off | **no** | screens/settings/pages/security.tsx |
| `security.sign_out_others` | Settings | Member | off | **no** | screens/settings/pages/security.tsx |
| `session.sign_out` | Settings | Member | off | **no** | screens/settings/pages/security.tsx |
| `environment.add` | Settings | Builder | ask, stops | **no** | screens/settings/pages/environment-detail.tsx |
| `environment.remove` | Settings | Builder | ask | **no** | — |
| `workspace.general` | Settings | Owner | ask, stops | yes | screens/settings/pages/general.tsx |
| `workspace.export` | Settings | Owner | off | yes | — |
| `workspace.delete` | Settings | Owner | off, stops | yes | — |
| `workspace.take_back` | Settings | Owner | off | **no** | — |
