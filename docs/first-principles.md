# First principles

A draft to argue with, 25 November 2026. What is built so far is a **spike**. This starts again from what the
application is for. Nothing here is agreed until it says so. Evidence is in [findings.md](findings.md).

## What it is for

> You hand over an **outcome**. Co-workers keep it moving for days or weeks, in the tools the work is already in, and
> come to a person only when a person is needed. Someone always answers for it, and anyone can see why.

Three things follow, and each rules something out:

1. **It is about outcomes, not chats and not cards.** A board is how a manager keeps track (28). It is not the product.
2. **A co-worker is measured by what it finishes per minute of your attention.** A screen you have to check is a cost.
3. **Trust is earned per kind of work.** So it must show its evidence, be corrected, and remember the correction.

## The loop

Everything the product does is one loop. Take one job: *a customer emails that checkout fails.*

| Step | What should happen | What the spike does |
|---|---|---|
| 1. Hear | The mail is matched to a customer and to earlier mail about it | Heard and threaded. Nothing knows who the customer is |
| 2. Decide | Is it work? whose? how urgent? Against the mission and what it was taught | A judgement by a fixed four-sentence prompt that **never contains the mission** (`manager-agent.ts:11`; the mission is a page it may choose to read). Accept mode `auto` and `observe` behave the same (`gate.ts:20`) |
| 3. Plan | Done-when, the steps, who does each (co-worker or person), what it may cost | A title and a description. No done-when, subtasks or links (`task.subtask`, `task.link`: no handler), no budget |
| 4. Do | The right co-worker, with the task, the mission, its tools and connections | The worker gets the title and a free-text brief: **not the task's description, not the mission** (`runs.ts:19`). It can read a file and run a command. No edit, web or MCP |
| 5. Check | Someone else compares the result with done-when, and looks at the evidence | Nothing. `ready` is the worker's own word. A result has no form: no PR, file or page attached to the task |
| 6. Carry on | The manager hears the result and takes the next step | **Nothing wakes it.** A report changes a field on the board (`worker.ts:38`). The manager is started only by a chat message or an outside event. A comment you write on a task reaches nobody either |
| 7. Ask | The right person, with what they need to decide; someone else if they do not answer | Nearly always whoever made the manager. No reminder, deadline or stand-in |
| 8. Answer | The customer is told, in their thread, once it is really fixed | It can reply in the thread, if it happens to be woken |
| 9. Learn | What it was told, and what went wrong, changes the next time | No memory of any kind. Saying it again is the only way |
| 10. Wake | Chase what is stuck, look again on Friday, when nothing has happened | No schedules. It sleeps until spoken to |

**The loop is open at 6.** Delegate, then nothing. The rest of the screens are drawn around a loop that does not turn.
That is why clicking through it feels pointless. 46 of the 76 actions in the catalogue have nothing behind them.

## What we are missing

In order of how much the product depends on it.

| # | Missing | Why it is load-bearing |
|---|---|---|
| 1 | **The loop closes by itself**: a result, a comment, a person's move or a date wakes whoever it concerns | Without it there is no long-running anything |
| 2 | **The co-worker as someone you can open**: its mission, identity, scope, model, what it knows, what it is doing, what waits for it | Today it is hidden behind a board, with a fixed prompt and board settings |
| 3 | **An outcome with done-when and evidence** | Otherwise nothing can be checked, so a person must check everything |
| 4 | **People do work too** | A co-worker that needs a password, a call or a decision gives *you* a task, with a date, and carries on when it is done |
| 5 | **An inbox for everyone**: each person has one, and each co-worker has one | Yours: what needs you. Its: what reached it, and what became of it |
| 6 | **Connections**: what it hears, what it can do, what it looks like from inside, with permissions per action | GitHub, email and Slack are one kind of thing. MCP servers are another (33) |
| 7 | **Knowledge**: mission, customers, decisions, corrections, with where each came from | Step 9. Also step 2: you cannot judge without it |
| 8 | **Limits**: money, time, how many at once, how far it may go | Nobody leaves an unlimited thing running for a week |
| 9 | **Trust that grows**: watch, then ask, then do, per kind of work, from its record | Today a fixed on, off, ask that nothing learns from |
| 10 | **Why**: from any result back to who asked, what it decided and what it did | Today a one-sentence log |

## Agreed

Yours in 1 to 7, 9, 10 and 19 to 25; the rest proposed and agreed. 25 November 2026:

1. **A co-worker is the manager, and it is special.** It may be built from an agent, but it is its own thing. One person,
   or a company, has several.
2. **It does not do the work.** It looks after its mission, its board and its own matters, and may hand even those over.
   The work is done by **workers**: agents it starts.
3. **It has a scope, and hands on parts of it.** It is given permission. A worker gets a part of that, never more.
4. **It has an environment.** GitHub is the first. Email is native: its own address, it knows the people in its
   organisation, writes to them and is part of email chains. Then Slack, WhatsApp, others.
5. **It can be lent yours**, such as your mailbox, to read only, or to draft for you to send.
6. **One pattern for all of them**: events come in, actions go out, with permissions, and you can see it all.
7. **How tools, permissions and skills are grouped matters a lot.**
8. **Apps and kits.** Everything about an app (events, actions, skills, its view) is in one place. A kit is a named set
   across apps, for one kind of job.
9. **A manager has accounts**: its own, or handed to it by another manager.
10. **There is a lead manager, at the top of a tree.** Every level works the same: hand down a part, report up, ask up. It
    starts as the lead and one level under it. Every workspace begins with its lead.
11. **Accounts are a manager's own, the workspace's (the lead holds them), or lent by a person.** What comes from a lent
    account is seen by the lender only, until shared. It always says who wrote something. Lending ends when the lender says.
12. **Scope is handed on as a part, per job, only ever smaller.** A worker gets what its manager has, and was handed, and
    that kind of worker may ever have. Needing more, it asks its manager. Taken back above, it is gone below.
13. **What is set to ask goes to a person, never to another manager.** Asking in chat for what you may not do goes to
    someone who may allow it.
14. **Each manager has its own inbox**: threads, not events; open ones on top, left alone ones counted, each with why. A
    view per app opens a thread as what it is. It replaces Events, Console and the Inbox view.
15. **Work has done-when and evidence, and someone else checks it.** One answers for it, one does it: a worker, a manager
    or a person. Kinds of work (fields, steps, what must be handed in) come after, with kits.
16. **Everything that wakes a manager comes through its inbox**: outside events, a worker's report, a person's comment or
    move, another manager, a date. Things that arrive together are one wake. **No open task without a next.**
17. **It asks whoever answers for the work** (or the account's lender, or who asked), says what it needs and by when, then
    goes onwards. Everyone has an inbox. **Silence never approves.**
18. **It learns by notes you can see, with who said so, and narrow rules proposed from its record.** A person accepts each.
    "Always" means always for this thread, person or kind.
19. **A worker is the same agent.** From outside there is one co-worker. A worker is another instance of it, in another
    conversation. (Corrects 2: not other agents.)
20. **A gateway is how it talks to people**: email, WhatsApp, Telegram, Slack. Work comes in through it, and it writes to
    people inside and outside through it.
21. **Through its eyes, each app looks like itself**: a mail client for mail, a list of chats and a chat for WhatsApp, issues
    and pull requests for GitHub.
22. **The work fits the app and the business.** GitHub is a coding factory. Email and WhatsApp are a sales factory, where
    leads go through a funnel. They are totally different things.
23. **First: GitHub, for us. It should just work.**
24. **Any factory, from the same primitives.** Coding and sales are two examples. Nothing in the primitives knows of either.
25. **The lead is a special manager: its job is the other managers.** It sets them up, with prompts, tools, accounts and
    scope; provisions what they need (a phone number, a WhatsApp account, an address); runs the email system; and over time
    watches, refines and updates them. It mostly makes a new one from a template, or forks itself. *Meta-management, hill
    climbing.* It has the permission to do this, and scopes permissions to the others.

**Restated by the user after the first GitHub drawings, which had drifted, and confirmed. Where it differs, this wins:**

26. **A tree.** The root manager has all the authority there is. It does not do the jobs. It creates, manages, maintains and
    improves the managers that do, and so the whole system.
27. **Each manager is made for one job**, with the connectors that job needs: GitHub, or email, or several together.
28. **A manager runs a process, like a factory.** Events come in from its connectors and turn into work, the work is tracked
    on its board, output goes out. It decides how it keeps its state and how things move through it. *The board, the
    mission and the rest of what the canvas had for a manager stay.* (Takes back "no board".)
29. **A manager starts the threads that do the work.** They can be opened, with their reasoning trace, but people do not
    live in them. Whoever wants to talk, talks to the manager.
30. **Mostly you look at it in aggregate**: what came in, what is in each step, what went out, how well, where it is stuck.
31. **The console is for the people who configure and run the system.** Everyone else meets it in the connector: the pull
    request, the mail, the chat.
32. **One thing: a connector.** GitHub, email, WhatsApp, Slack: a system that things come in from and go out to. App, source
    and gateway are the same thing under other words. It has four parts: set
    up, in, out, know-how. All of it is ours, in code: [connectors.md](connectors.md).
33. **MCP servers are a separate layer**: tools a manager can use, added without code. Not connectors, not inside them.

How I read 19 to 25, to be corrected:

- **One instance per thing.** An issue, or a lead, has one instance of the co-worker that stays with it for weeks and holds
  all its threads (the issue, its pull request, the mail about it). What arrives on them goes to that instance. The
  co-worker's own conversation, where you talk to it, hears what matters: new, stuck, done. (Changes 16 and 17's "one inbox wakes
  one manager": with 200 leads that one conversation would be the bottleneck. The inbox you see stays one.)
- **A checker is a fresh instance** that has not seen how it was done.
- **The lead's tools are other tools**, not a bigger set of the same: make, fork, change, pause, retire a manager;
  provision and hand on accounts; read how a manager does; try a change. It does not do a factory's work.
- **Hill climbing needs a measure.** Each factory says what good is (merged without rework; replies per lead) and keeps its
  cases. The lead proposes a change, tries it on past cases and on a few new ones beside the old version, keeps what is
  better, and can always go back. Each version of a manager is kept.
- **It never widens scope on its own**: more reach, spending money (a phone number) or a new account goes to a person.
- **No Agents page.** An instance may take a *role*: extra instructions, skills, an environment, a cheaper model.
- **A factory** is what flows (an issue, a lead), its stages, what moves it on, what must be handed in, its views, and the
  kit it needs. It replaces templates, and "kinds" in 15.

Earlier idea dropped: person, manager and worker as one kind of thing ("member").

## The nouns

| Noun | Is |
|---|---|
| **Co-worker** | A manager. Has a mission, a board, its own identity and a scope. Decides, hands out, follows up, answers |
| **Worker** | An agent a co-worker starts for one piece of work, with a part of its scope. Its report wakes the co-worker |
| **Person** | Someone in the organisation, or outside it. May answer, do a piece of work, or lend an account |
| **Connector** | GitHub, email, Slack, WhatsApp: set up, events in, actions out, skills and a view. Ours, in code |
| **MCP server** | Tools a manager can use, added without code |
| **Account** | One account of a connector. Someone holds it: a manager (its own), or a person who lends it. A holder can hand on a part of it, to a manager or a worker |
| **Scope** | Which accounts, which actions on them, on, ask or off, within which limits |
| **Work** | Mission, task, step. Done-when, who answers for it, who does it, evidence |
| **Thread** | One conversation in a connector: a mail chain, an issue, a Slack thread. What events belong to |
| **Knowledge** | What it knows and who said so |

## What we keep from the spike

Keep: sign-in and tenancy, one object per workspace and per manager, the vault, the gate, email and GitHub in and out,
sandboxes, asking by parking a tool call, saved versions, the test worlds. These are the hard parts, and they hold.

Throw away: the screens as built, the manager's prompt, the Events log, templates as fixed code, the settings tabs, and
the book as the measure. The canvas becomes input, not the answer.

## How we design it

The agreed parts as types: [model-next.md](model-next.md).

One decision at a time, biggest first. Each is written here once agreed. No product code until 1 to 5 are done.

1. **Who is there?** Agreed: co-worker, worker, person (see Agreed)
2. **What is work?** Agreed (15)
3. **What wakes whom?** Agreed (16, 17)
4. **How does it reach the outside?** Agreed (7 to 14)
5. **What does it know, and how does it learn?** Agreed (18). Limits go with scope: money, time, how many at once
6. **What do you see?** First the GitHub screens, see [github-journey.md](github-journey.md)
7. **The thinnest true slice**: GitHub, for us: [github-journey.md](github-journey.md)

The measure is step 7's job done end to end without anyone looking, and how many minutes it asked of you.
