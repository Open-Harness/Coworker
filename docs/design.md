# The design

What Co-worker is, the words it uses, how it behaves, and the rules every screen follows. 25 November 2026.
This page is the one to read first. Where another page here says something else, this one is right.
How it came to be is in [history.md](history.md). The agreements, numbered, are in [first-principles.md](first-principles.md).
All of it in numbered sentences is [spec.md](spec.md); what shows each is [book.md](book.md). How to build it: [build.md](build.md).

## In one minute

A workspace has **one co-worker**. It has a name (Juno), an address on every connector, and a soul. People speak to it, and only to it.

A person tells it **what they want to get to**. It makes that measurable, looks at the past, asks the few things only they know, and
drafts a **playbook**: how the work is found, done, checked and measured. They comment on the draft until it is right, judge a few
cases, and say yes. Then there is a **manager**: the inside part of the co-worker that runs that playbook. Managers sit in a tree,
and people meet them in the console, never by mail.

What a manager takes on is **work**. Each piece has **threads**: forks of the agent that live inside a connector (a mail chain, an
issue, a deal) and stay with it. Work goes step by step. Someone other than who did it checks it. A person hears of it only when
they must act or can use the result.

It is good when its **measure** moves, read from somewhere it cannot write. Each week the co-worker takes the weakest part, proposes
one change, and tries it on past cases beside the old one.

The console is where operators see all this in aggregate and change it. The co-worker uses the same screens, in the open.

## Words

One word for one thing, on screen, in code and in these pages.

| Word | Is | Not |
|---|---|---|
| **Co-worker** | The one identity of a workspace. Juno here | Agent, assistant, bot, root, lead |
| **Manager** | Runs one playbook. Has a manager above it and may have some below. Has no name outside | Agent, factory, mission, team |
| **Objective** | What a person wants to get to, in their words | Goal, mission, job |
| **Measure** | The number that says whether we are there. Read from a place the manager cannot write, or said by a person | Metric, KPI |
| **Aim**, **line** | The number to reach, and the path to it. *On its line, below its line* | Target, goal |
| **Must not get worse** | The measures an objective may not cost | Guardrail |
| **Playbook** | How a manager works, all of it, in versions | Policy, mission, factory, template, plan |
| **Template** | A playbook with blanks. Ours, or one of your managers saved as one. Any number of managers are made from it, each with its own copy | A type of manager, code |
| **Kind of work** | When something is work, how it goes, when it is done | Type, category, rule |
| **Step** | One part of a workflow. The board's columns are the steps | Station, stage, lane, status |
| **Agent** | A role in a step: what it is told, its skills, its model | Worker, bot |
| **Skill** | How something is done well. Harness, connector, craft or playbook | Instruction, prompt |
| **Trigger** | What makes something come in: a cron, an event, a wait, or being asked | Feed, routine, schedule, source |
| **Intake** | What came in, what became of it, and why | Events, triage queue |
| **Work** | One thing taken on. Has an id, done-when, evidence, one who answers for it | Task, ticket, card, job |
| **Thread** | One conversation in a connector, with the fork of the agent that lives in it | Run, session, instance |
| **Done when**, **evidence** | What must be true, and what shows it | Acceptance criteria |
| **Reach** | What a manager may do, on which accounts, within which limits | Permissions, authority, scope |
| **Mandate** | The part of a reach that one piece of work has. It never grows | Grant |
| **Connector** | Ours, in code: set-up, what comes in, actions, skills, its own view | App, source, integration, gateway |
| **MCP server** | Tools added without code. Not a connector | Plug-in |
| **Account** | One account of a connector, held by someone | Credential |
| **Eval** | What good is for one part, its cases, its line | Test, benchmark |
| **Version** | A playbook as it was. Going back is a new one | Revision |
| **Sent back** | Came back from the check | Returned, rejected, rework |

**No manager is built in.** Coding, Sales and Support in the drawings are examples of what somebody made. There can be ten that work on
GitHub.

Words for what waits: *Waits for Bo*, *Waits for the customer*. Never "blocked" or "pending".

## How a manager works

```text
 triggers         intake                 workflow                          measure
 cron  ─┐   came in ─► who may ask?  ┌─► step ─► check ─► step ─► done ─► read in the CRM
 event ─┼─►            which kind?  ─┤      └─ sent back ─┘                    │
 wait  ─┤              one decision  │   steps of a person: an ask, a date     ▼
 asked ─┘   left alone, with why ◄───┘                                weakest part ─► one change ─► tried ─► version
```

1. **A trigger brings something in.** Kept once, unchanged.
2. **Code asks who it is**: may this person or thing ask? Outside text never grants anything.
3. **A model judges the kinds**, each one, also the noes. It can only read.
4. **Code decides**: take it on, add it to open work, leave it, ask, stop, or *could not tell*. Every decision keeps the version it was
   made under.
5. **Work gets a mandate**, a part of the manager's reach. Wider is new work.
6. **Agents do the steps.** Between steps the rules are fixed; inside one an agent is free. What arrives later on its threads goes to
   the work without a second decision.
7. **The answer goes back where it was asked.**

Work nobody asked for is **off, watch, ask or do**, for each kind. Everything found starts on watch. Two corrections in a row and
the kind goes back to ask by itself.

## A playbook

The same eight parts, as a draft and when it is there. A live one also has Versions.

| Part | Holds |
|---|---|
| Playbook | One page in words. The manager reads all of it, an agent its step |
| Objective | What you said, what is counted, the aim, what must not get worse |
| Workflow | Each kind of work: when it is that, whether it starts alone, its steps, done when |
| Triggers | Crons, events, waits, what is asked. Each with what it brought in 7 days and what it costs |
| Agents | What each is told, its skills, its model |
| Skills | In four layers: harness (ours), connector, craft, playbook |
| Reach | Accounts, actions, limits, who may ask, what it never does |
| Evals | What good is for each part, its cases, now and its line |

- Every line knows why it is there: **you said** it, it was **looked up**, or it is **my idea**.
- Anything can be **edited** or **commented on**. A comment comes back as a change to accept, an answer, or a case.
- A skill **never allows** anything. Reach does, and code compares the two.
- A craft skill stays only if the same cases come out better with it than without.

**A new manager** starts from a template, or from what you say. From a template: pick it, fill the blanks (which repo; the rest has an
answer already), and it is the same draft as below. What comes in is taken on by one manager, however many hear that place.

**Every agent's model is chosen**, with its thinking level, from what the workspace connected: the agent's own, else its manager's, else
the workspace's. A template never names a model.

**Setting one up from what you say** is itself a skill ([set-up-a-manager](skills/set-up-a-manager/SKILL.md)). It writes a walkthrough for this one case:
say it → at most three questions → connect, read-only → what the past says → at most three more → the draft, with comments →
judge about ten cases → make it. It never asks what it can look up, and always has an answer of its own. The types are in
[manager.md](manager.md).

## The co-worker on the screen

- **One registry of actions.** A button, the ⌘K palette and the co-worker all press the same action. It cannot do what you cannot see.
- **It can do things in front of you**: its pointer, what it is about to do, *Stop*, *Skip to the end*. It stops before saving and asks.
- **It proposes, people decide** what good is, how far it may go, and what it costs.

## Every screen

| Rule | |
|---|---|
| **One shell** | Sidebar: Home, Inbox, Chats, Overview, the tree of managers, Settings. ⌘K anywhere. The same talk box at the bottom right |
| **One header** | A 24 px title, one line of status under it, actions at the right, tabs below, then a rule. 16 px from the edge |
| **Four bodies** | *Panes* (inbox, intake, a connector, a thread). *A grid* (overviews). *A record* (work, a trigger, an account). *A list beside its page* (playbook, Juno, settings) |
| **A list beside its page** | 220 px wide, on the left. On a phone it is a menu on top |
| **One Save** | In the header, off until something changed. A playbook saves as a version, and says which |
| **Tables** | Rules between rows, no stripes. Numbers at the right, lined up. Compact |
| **Nothing scrolls sideways** | A table that does not fit drops columns, then folds a row into lines |

**Colour means one thing.**

| | |
|---|---|
| Yellow | It waits for a person. Solid badges are only for this |
| Red | Something is wrong, or below its line |
| Green | A dot or a line only: working, or on its line |
| Blue | The co-worker proposes it, or it is new |
| Grey | Everything else, also *connected*, *current*, *you said*, *looked up* |

**Comments** are one thing everywhere: a quiet icon at the end of a line, with a count once there is one. They open in the same pane.
**Suggestions** show what was and what it becomes, with *Accept* and *Leave it*.
**Empty** says what will be there and the one thing to do. **Not yet readable** says *Not yet*, and when; nothing stands in for it.
**A connector brings its own view**: mail looks like mail, a deal like a deal. Nothing else does.

Built from Astryx templates, changed as little as possible; each screen names the one it adapts. A screen is drawn, looked at, and
compared with its template by someone who did not draw it, before it is built.

## The people and numbers in the drawings

They agree on every screen. Workspace Acme. Ama Mensah (owner), Bo Larsen (builder, sales), Chidi Okafor (member), Pat Reyes (customer,
Northwind). Juno. Managers: Coding (Docs and Releases below it), Support (WhatsApp desk below it), Sales. Sales: more good calls, aim
12 a week by 31 December, 9 now, on its line; in 7 days 41 came in and 33 became work; 21 are open, 9 of them wait for the customer and
1 for Bo; playbook version 6. Today is 25 November 2026, about 09:54.

## Drawn

All of it, as code: 88 screens in [design/](../design/README.md), with loading, failed, empty, not readable yet, offline and gone, and the
co-worker working in front of you. Which page of the app is which drawing, and what it reads, is in `evals/screens`.
