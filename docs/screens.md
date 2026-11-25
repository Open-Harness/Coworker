# Screens

What stands between the spike and the agreement, and which Astryx template each screen adapts. Checked 25 November 2026
by rendering all 58 page templates and capturing every screen. `pnpm exec astryx template <name>` prints one.

44 screens: 3 kept, 27 adapted, 7 redone, 6 new, 1 dropped, from 25 templates.

## Why the first ones look made up

`scripts/check-ui.ts` refuses 52 of the 58 page templates as they ship, so every screen was rebuilt from loose parts. Proposed
instead: a screen names its template (`// astryx-template: kanban-board`), and a styled line passes only if that template
has the same line. A screen that names none is refused.

## The delta

| Part | Today | Agreed | |
|---|---|---|---|
| A tree of managers | A flat list: `ManagerEntry` has no parent (`workspace/types.ts:54`) | A parent on each, versions kept, and a root in every new workspace | Build |
| The root manager | Nothing | Tools of its own: make, copy, change, pause and retire a manager; hand on accounts; read how each does; try a change on past cases | Build |
| What a manager is told | Four fixed sentences; its mission is not among them (`manager-agent.ts:11`) | Its job, mission, process and connectors | Rework |
| The loop | A worker’s report changes a field and wakes nobody (`worker.ts:38`) | Reports, comments, moves and dates wake the manager through one path | Build |
| Dates | No schedules for managers. The old prototype has a working `schedule` module (400 lines) | Lift it | Lift |
| Connectors | GitHub can only comment, as a reply (`github/types.ts:46`). Email the same | Set up, in, out, know-how; GitHub opens pull requests, reviews, labels | Rework |
| Accounts | One GitHub installation per workspace, one address per manager | Held by a manager, the root or a person; handed on in parts; lent | Build |
| What it may do | On, ask, off per manager. A worker gets nothing from it | A smaller part handed down at each level, taken back from above | Rework |
| MCP servers | Nothing | Add one, choose its tools, on, ask or off | Build |
| Threads that do the work | Read a file, run a command, report | Edit, search the web, open a pull request, hand in evidence; a fresh thread checks | Rework |
| The board | Lanes, fields, moving, approval. No done-when, steps, evidence or next | Add those four. The manager decides its process | Rework |
| Numbers | Open, blocked, created and finished, events by outcome (332 lines) | In to out, time in each step, rework, cost, per manager and rolled up | Rework |
| Learning | Nothing for managers | Notes with who said so; proposed rules; versions tried on past cases | Build |
| Asking people | Works. No deadline, reminder or stand-in | Add those | Rework |
| Tenancy, sign-in, vault, sandboxes, models, billing, audit, test worlds | Work | Stay as they are | Keep |

## One look

1. **One shell.** `shell-side-nav`, with the tree. Settings stay inside it.
2. **One header.** Title, one line of status, actions on the right, tabs under it. 24 px gutter. Today there are three: edge to edge at 12 px (Board, Inbox, Events), 24 px (Agents, manager settings), and a centred column (Billing, a run).
3. **Three bodies.** Panes (inbox, in and out, chat), a grid (the dashboards), a record (task, agent, connector). Nothing else.
4. **Colour means something is wrong, or waits.** Soft tokens for states, a dot for who is working. Solid badges only for what needs a person.
5. **One icon set.** Heroicons outline. Three templates use Lucide; those icons are swapped.
6. **One chart file.** The dashboards carry their own colour codes; they go through our chart component and the theme.
7. **A template fills its pane.** Some size to the whole window. Under the tabs the chat’s composer fell off the screen when I tried it, so each is given its pane’s height.

## The shell and the system

| Screen | | Template | Today | Take |
|---|---|---|---|---|
| Sidebar | Adapt | `shell-side-nav` | Six links under every manager, always open. With three managers the Build group is already off screen. No sign of who is working or stuck. A tree cannot fit. | The tree, folding out under the root to any depth, with a status dot per row. Names are yours. A manager’s views become tabs on its page. |
| Home becomes System | Redo | `dashboard-scorecard` | Counts of open tasks. It says nothing about how the system does. | Scorecard tiles with change, goals per manager, and “What changed & why” written by the root manager. |
| Root manager: the tree | New | `table-tree` | Does not exist. Managers are a flat list. | Managers as rows that roll up what is below them; the rail says what the root has and what it has handed out. |
| Root manager: versions compared | New | `table-comparison` | Does not exist. A manager has no versions. | Old and new version of a manager side by side on the same past cases, best highlighted. |
| Inbox | Adapt | `table-inbox` | The proportions are the wrong way round: a wide table with two rows, and the thing to decide squeezed into 340 px. | Narrow list, wide reading pane you can resize, actions at the top of the pane. |
| A question, as a page | Adapt | `detail-page` | Close. The header and rail follow no template, so it sits differently from every other page. | The record header (status, who, when, actions) and the collapsing rail. Our option cards stay. |
| Search | Keep | `CommandPalette block` | Already the Astryx command palette. | Nothing. |
| New manager | Redo | `form-wizard-dialog` | A name and a template. A manager is made for a job, with connectors and authority. | Steps: the job, its connectors, what it may do, check. Mostly the root makes them; this is by hand. |

## A manager

| Screen | | Template | Today | Take |
|---|---|---|---|---|
| Overview | Adapt | `dashboard-alert-rail` | Charts float without cards at three widths, legends are badges, and the only list is at the far right. Home already follows this template; the manager’s page does not. | Tiles with sparklines (in, out, waiting, quality), charts in cards, a rail of what is stuck and of its connectors. |
| Board | Adapt | `kanban-board` | Cards hold an id, a title and a badge. No description, menu, search, filter, sort or add. Empty lanes say “Nothing here”. | The card, the lane header with its tip, the empty lane, the toolbar. Plus one line for the thread working on it. |
| Board as a list | Adapt | `table-grouped` | A table per lane, and a heading with “Nothing here” for each empty one. | One table grouped by lane, with filter and view options. This template passes our check as it is. |
| Board: Console | Adapt | `incident-console` | Three columns, two nearly empty. No timeline, and no way to the task. | Rows grouped by state, the pane with actions and the timeline. |
| Board: Inbox | Drop | `none` | The same tasks a fourth time. Dropped by you. | Templates that open on it open on List. |
| Task | Redo | `work-item-detail` | A form. Six boxes and three Save buttons, where you came to read what is going on. | The record: properties in the header, done-when as the checklist with progress, linked items for the pull request and the thread, activity below. |
| Mission | Adapt | `documentation-technical` | Two lines of text in an empty page. | The article with its outline, and the “AI assistance” card as “ask the manager to change this”. |
| In and out (was Events) | Adapt | `incident-console` | Follows the template well. It only shows what came in. | Keep it. Add what went out, and a timeline from event to task to output in the pane. |
| Threads | New | `table-filter` | Does not exist. A run is only reachable from its task. | Every thread, filtered and grouped by state or task, with saved views and a detail pane. |
| One thread, with its trace | Redo | `ai-chat` | A narrow column of text with no work in it. The calls it made are one grey line. | Turns with collapsible tool calls, and the panel for the diff, the files or the terminal. No composer: you talk to the manager. |
| Talk to it | Adapt | `ai-chat` | Raw JSON in the answers, and no room for what it made. | The same template, so a thread and a chat read alike. The panel shows the task, page or change being discussed. |
| Its connectors (was Sources) | Adapt | `table-collapsible` | A table, then the same three things again as cards. Nothing about accounts. | One group per connector, one row per account, with in, out and what came through. |
| What it may do | Adapt | `table-collapsible` | A stack of boxed bars, for 76 actions of which 46 have nothing behind them. | Groups by connector and MCP server with counts in the header; on, ask or off per row; where it was handed from. |
| Who may ask | Adapt | `settings` | Headings, a radio list and two tables with no common layout. | Label and explanation on the left, control on the right. |
| Its board’s set-up | Adapt | `settings` | Fine as tables, but a different page shape from the other three tabs. | The same settings layout. |

## What it is built from

| Screen | | Template | Today | Take |
|---|---|---|---|---|
| Connectors and accounts | New | `table-collapsible` | Does not exist. GitHub is a card on Keys, email a tab of a manager. | Every account, whose it is, which managers have a part of it, whether it works. |
| Connect GitHub (or mail, or WhatsApp) | Redo | `form-wizard-inline` | Switches and checkboxes per repo, after you have left for GitHub and come back. | Steps that check themselves: install, choose repos, trial, enable. The sample is already about CI on pull requests. |
| Email set-up | Adapt | `form-wizard-inline` | A table with one row and a paragraph in a box. | The same set-up as GitHub, so every connector looks alike. |
| One connector | New | `detail-page` | Does not exist. | Tabs for its four parts: set up, in, out, know-how. Rail: accounts and managers using it. |
| MCP servers | New | `table, then detail-page` | Does not exist. | A list, then one server with its tools at on, ask or off. |
| Agents | Adapt | `detail-page` | A grey block for a list and a long form with no header, status or history. | Record header and tabs: what it is, versions, where it is used. |
| Skills | Redo | `ide` | Files in a text box, in a form. | File tree, code, properties and history at the side; the checks go in the drawer. |
| Environments | Adapt | `table, then detail-page` | A table with the set-up script of one row hanging below it. | A list, then one environment with its script, secrets and last starts. |
| Templates | Adapt | `library` | Four uneven cards with different heights. | Search, categories and even cards. The picture becomes a small drawing of the process. |

## The workspace

| Screen | | Template | Today | Take |
|---|---|---|---|---|
| People | Adapt | `table` | Three columns, no sort, search or row menu. | The same table as Members. |
| General, profile, notifications, security | Adapt | `settings` | A boxed column in the middle, with Save under each box. Billing and Profile are another width from Members and Usage. | Label left, control right, one Save per group, search. One width for all. |
| Roles and permissions | Redo | `table-comparison` | Eleven boxed bars with three solid badges each: a wall of green, then the same list again per person. | One table: a column per role or person, rows grouped, differences highlighted. |
| Members | Keep | `table` | Close already. | Sort, search and the row menu. |
| Keys | Adapt | `table-collapsible` | Models, connections and secrets as three layouts. Connections leave for their own page. | Groups: models, secrets. |
| Usage | Adapt | `dashboard` | Three tiles, an empty chart, a stack of boxes per manager. | Chart first, tiles with sparklines, then spend split by manager. |
| Audit log | Adapt | `table-filter` | Every row ends in a solid green “Done”. | Filter chips, grouping, a detail pane. Only what went wrong has colour. |
| Billing | Adapt | `settings` | As General. | As General. |

## Getting in

| Screen | | Template | Today | Take |
|---|---|---|---|---|
| Sign in, sign up | Adapt | `login-card` | I had called this kept. It is not the template: white page, boxed card, one page for both. | The grey page, the mark above the card, the same three ways in. Two pages: sign in, create your account. |
| Check your email; your team is already here | Adapt | `login-sso` | A green banner over the form, and a button on another page (F79). | Its step for an organisation it knows. |
| Create workspace | Adapt | `form-wizard` | Another stepper, no fixed footer, no Cancel, six steps, and “Ask to join a workspace instead” beside Create (F79). | Four steps: workspace, model, connector, review. Root is made, and makes the rest. No join here. |
| Your workspaces | Keep | `a list` | A list of cards. Fine. | Nothing. |
