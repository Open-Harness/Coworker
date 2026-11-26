# How it came to be

Three days, in order: what was asked, what was drawn or built, what was dropped and why. The result is [design.md](design.md).

| When | What we thought it was | What changed it |
|---|---|---|
| 23 Nov, evening | Managed agents you host yourself, on pi-durable and Cloudflare, with a console like Anthropic's | Sessions are not something a person should see. Managers with a board and a mission are |
| 23 Nov, night | A shared schema (from DeepSeek's super-agent), a catalogue of actions, each on, off or ask, a canvas of screens | *We* should not decide what each may do |
| 24 Nov | Hosted, for many workspaces, people bring their own keys. Built against a book of evals, 64 of 73 by the next morning | Passing evals, with no screenshot anyone had looked at |
| 25 Nov, 07:00 | A working build, tried by hand: dozens of findings | "This is garbage." Not bugs only: the idea of how it works was off |
| 25 Nov, 07:25 | **First principles.** The build is a spike | A co-worker is a manager; it works through others, with a part of what it may do |
| 25 Nov, 08:05 | WhatsApp, mail and Slack are gateways; GitHub is the work. Any factory from the same parts. One lead sets up the others and climbs the hill | With 200 leads one conversation would jam: every thing gets its own instance |
| 25 Nov, 09:20 | A tree of managers. The console is for **operators**: aggregates first | One word, *connector*. MCP servers are something else |
| 25 Nov, 10:20 | The audit: 49 screens, each from a template. The first six, drawn | The sidebar was too busy; the join flow clunky; managers nest |
| 25 Nov, 10:40 | A connector is a plug-in and **brings its own view**. Threads are nested forks | Why would a person see managers' names outside at all? |
| 25 Nov, 11:05 | **One named co-worker**: a soul, addresses, its own actions on the screen, one palette for everything | The wizard for a new manager was "woefully inadequate" |
| 25 Nov, 11:40 | People bring an **objective**, not a set-up. Plans made of primitives. **Real measures** only | Where are workflows, agents, skills, evals? |
| 25 Nov, 12:00 | **Skills in four layers, a playbook per manager, a skill that sets one up** with a walkthrough, a draft and comments | "This is what I was talking about" |
| 25 Nov, 12:53 | This: one design, every screen following it, all of it kept | |
| 25 Nov, 15:00 | The plan for GitHub, with a Coding manager in it | There is no Coding: **templates**, any number of managers from one, **models chosen on each** |

## The turns that mattered

**Sessions went.** The first canvas had agents, environments, sessions, vaults: the console we were given as a model. You do not want to
run sessions. You want someone to answer for an outcome. What was a session is now a thread, seen when you want to know how.

**Permissions went from roles to three words.** A list of what each kind of manager may do became *on, off, ask* on every action, and
later *reach*: handed down the tree in parts, never wider than above.

**The score was not the product.** The build passed nearly every eval in its book and was wrong on sight: a card opened a side panel that
said nothing, forms where a record should be, an event log nobody needs. Since then a screen is adapted from a template, drawn,
looked at, and compared by someone who did not draw it, before it is built. The spike stays for its hard parts: sign-in, tenancy,
the vault, sandboxes, mail and GitHub both ways, asking by parking a call.

**Attention is the limit.** "Your limited by my attention." So: log what is found, plan together, then fix. Ask once, with the thing
itself on the screen. The product took the same rule: it is measured by what it finishes per minute of people's attention.

**Connector, gateway, source, app became one word.** Four words for one thing made four settings pages. A connector is set-up, what
comes in, actions, skills and a view, in code. An MCP server is tools without code.

**Managers lost their names outside.** Each had an address, a soul, a bot. Outside there is now one identity. Inside there can be as many
as the work needs.

**The co-worker came onto the screen.** One list of actions: a button, the palette and Juno press the same one. It can do a thing in
front of you, stops before it counts, and you can take over.

**A manager stopped being a form.** Name, connectors, "look for new work", a limit: that asks a person to design. Now they say what they
want, and the co-worker writes a walkthrough for that one case, from a skill of its own. *When do you look for work* became four
triggers it proposes from the past, with what each would have found and cost.

**Counting was replaced by measuring.** Received, delivered, returned and time to done are the manager's own counts of itself. A measure is
now read where it cannot write, or said by a person, has a before, and says *not yet* until it can be read.

**Policy and Mission became Playbook.** Two pages and a pile of rules became one thing with eight parts, the same as a draft and live, on
which anyone can comment and to which the co-worker proposes one change a week.

## Drawn, then dropped

| Dropped | Why |
|---|---|
| Sessions, Agents, Environments as main pages | Parts of a manager, not places to work |
| Swim lanes, a fixed board for every manager | Each manager decides its steps |
| Board as Inbox | The same work a fourth time |
| Events as a log | Became Intake: what came in, what was decided, why |
| Seven settings tabs per manager | Playbook, Connectors, Settings |
| A list of 76 actions, 46 with nothing behind them | Reach: what it does by itself, what it asks |
| An address, soul and bot for each manager | One identity |
| Templates as code, then "a Coding factory" | Templates: a playbook with blanks, as files. Managers are made from them |
| The New manager wizard | Setting up from an objective |
| Feeds and Routines | Triggers, in the playbook |
| Policy, Mission, Authority | Playbook, Reach |
| Goals as percentages the manager reports | Objective, measure, line |
| Self-hosting as the main way | Hosted; you bring your own model keys |

## What others gave

- **DeepSeek's super-agent** (its papers 000 to 008): the gate before judging, policies with versions, observe before acting, a mandate that
  never grows, speak only when someone must act. Ours adds going out to find things, kinds of work, agents per step, and the tree.
- **pi-durable on Cloudflare**: threads that live for weeks, and forks.
- **Rivet**: how a developer should feel using it.
- **Astryx**: every component, and the templates every screen adapts.
- **Anthropic's console**: aggregates over many runs, one run in depth.
- **Products looked at for single screens** (on Mobbin): issue trackers for
  [a board](https://mobbin.com/screens/29621c0a-9946-46aa-9d39-6d5f4f578b21), [a piece of work](https://mobbin.com/screens/f00cc4fb-4083-43fc-a0fb-703a6c4ef771),
  [views](https://mobbin.com/screens/94bb4d3b-a8e3-41e8-b8f1-b82d1f904b03) and [an inbox](https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338);
  [n8n](https://mobbin.com/flows/c6fc25b0-6c5f-4813-9496-254df13911fb), [Gumloop](https://mobbin.com/flows/d527947d-308c-48c4-9375-1eadf48ea6a5) and
  [Cofounder](https://mobbin.com/flows/abe501b6-bb77-4c9e-90a6-bf599a45a24d) for workflows and setting up by talking;
  [Contractbook](https://mobbin.com/screens/c6054632-91f3-4049-94cc-282c19be6fc6) and [Intercom](https://mobbin.com/screens/334349c0-b6dd-468d-b7d4-d5e1f4971806) for a draft
  with comments and for content one can judge.

## Open

- Which parts the first build takes: GitHub, for us, stays the agreed first slice ([github-journey.md](github-journey.md)).
- Who may say yes to a draft, when several people set up a manager together.
- How two managers with objectives that pull apart are settled: the owner of each is asked, and then?
- Connectors made by others: the contract is drawn ([connectors.md](connectors.md)); how one is checked before it runs is not.
