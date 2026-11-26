# What the whole system does

Everything Co-worker does, in numbered sentences. [design.md](design.md) has the words and why; this page is complete, and each sentence
is either true of the product or it is not. [book.md](book.md) has the evals; each names the sentences it shows. 25 November 2026.

Where a sentence says *agreed N*, that is [first-principles.md](first-principles.md). Types are in `src/modules/*/types.ts`, and they
compile. Screens are in [design/](../design/README.md).

## The whole of it, once

```text
people ──talk──► CO-WORKER (Juno) ◄──sees and changes── console (operators)
                     │ makes, runs, improves
                     ▼
   MANAGER (one playbook, any number, in a tree)
   ├─ triggers: cron · event · wait · asked ──► INTAKE: who may ask (code) → which kind (model, reads only) → decide (code)
   ├─ WORK: kind, mandate, step, done when, evidence, next ──► THREADS: forks of the agent, one per conversation in a connector
   │         │                                                   └─► BOX: a container that stays with the work
   │         └─ asks a person ──► INBOX
   ├─ CONNECTORS: GitHub · email · Slack · WhatsApp · CRM · calendar (in, out, skills, own view) + MCP servers (tools only)
   └─ MEASURE (read where it cannot write) ──► weakest part ──► one change ──► tried on past cases ──► a new version
```

## 1. People and workspaces (kept from the spike)

- **P1** A person signs in by mail link, Google or GitHub. No passwords of ours.
- **P2** A workspace has a name, an address, a region, people with a role (Owner, Builder, Member), and its own storage. Nothing of one
  workspace is readable from another.
- **P3** People join by invite, link, or mail domain with a yes from an Owner.
- **P4** A person has addresses on connectors (mail, GitHub, Slack, WhatsApp), each proven. What they say there counts as theirs.
- **P5** A Member sees and uses; a Builder changes managers; an Owner also changes the workspace, people, keys and billing.
- **P6** A secret is stored encrypted, is used for one call, and is never shown, logged, or given to a model.
- **P7** Everything done by anyone, or by the co-worker, is one line in the audit log: who, what, under which permission, when, outcome.

## 2. The co-worker

- **C1** A workspace has one co-worker, with a name, one address per connector, and a soul: a page of how it is, that Owners edit.
- **C2** Outside, there is only the co-worker. No manager has a name or an address there. (agreed 39)
- **C3** *Talking* says, for each group of people, how it speaks, what they may ask, and how it signs.
- **C4** People chat with it in the console, and in Slack, mail, WhatsApp and GitHub; it is one list of chats. A chat can be forked at any
  line: the fork knows everything up to there and nothing after.
- **C5** It answers about work, managers, what came in and why, what was spent, from the records, with links. It says when it does not know.
- **C6** It does whatever it may, by the same actions as the buttons. It can never do what the person asking may not.
- **C7** It can do it in front of you: it goes to the page, points, says what is next, fills fields. *Stop* stops; *Skip to the end*
  does the rest at once. It always stops before saving and asks.
- **C8** It has triggers of its own (a morning list of what needs a person; every manager's week, on Mondays).
- **C9** What it remembers is a list of notes: who said it, where, for which manager, when last used. A person can forget one.
- **C10** *May do* lists what it may do alone, with a yes, or not at all. It never approves what it asked itself.
- **C11** *Spending* hands the workspace's daily limit to managers in parts that never add up to more than the whole.
- **C12** *History* has everything it did by itself or with someone, with undo where there is one.
- **C13** It never pretends to be a person, never repeats one customer's business to another, and keeps private what is private.

## 3. Connectors

- **X1** A connector is ours, in code, and every one has the same five parts: set up, in (events), out (actions), skills, its view.
- **X2** What comes in is checked to be real (signed, or DKIM), kept once, unchanged, with which conversation, who and when. Twice is once.
- **X3** An action has fixed parts filled in by us from the reach; a model never gives these. Each is on, ask or off, where it was handed.
- **X4** Set up says which steps need a person, checks each step itself, and says what is missing in words.
- **X5** If an account stops working (signed out, uninstalled, number offline), every manager that uses it says so, its owner is asked
  once, and nothing is lost: what came in is dealt with when it is back.
- **X6** Through its view you see what the co-worker sees there, as that system shows it; you can tell the manager about a
  conversation, or write as the co-worker. When a person writes, the manager reads and stays quiet until it is handed back.
- **X7** GitHub: hears issues, labels, comments, pull requests, reviews, line comments, checks, pushes to the default branch, merges and
  closes. Can comment, answer a line, open and update a pull request, push its own branch, run checks again, rebase, close, merge, label.
- **X8** Email: one mailbox; threads by message ids, never by subject; knows who is inside, and what nobody typed. Can search, draft, reply, send inside, send outside.
- **X9** Slack: channels it was invited to, threads, direct messages. Can answer, start a thread, react. Heard when not spoken to: *maybe*.
- **X10** WhatsApp: chats on one number. Can answer within the window, send a template outside it, say it is typing. Says when the phone
  is unlinked.
- **X11** CRM: deals and people. Hears a deal that moved. Can read all, change its own deals' fields, add a note, add a lead. Never the field
  its measure reads.
- **X12** Calendar: free and busy, book within hours, move, cancel.
- **X13** MCP servers are tools, added without code: address, sign-in, each tool on, ask or off. Read-only ones start on, the others ask.
  Nothing comes in through one.
- **X14** An account is held by the workspace, or lent by a person. What comes from a lent one is seen by the lender only, until shared;
  lending ends when the lender says.
- **X15** What is true of an issue, a pull request or a conversation is worked out from the newest of each thing heard, whatever the order
  and however often; asking the service gives the same things. What became true is told once, by what it is, not by who said it.
- **X16** Of a mail that was sent we know: sent, late, arrived, came back and why, complained about. An address that does not exist, or whose
  person complained, is not written to again by itself.

## 4. Templates, playbooks

- **T1** No manager is built in. A template is a playbook with blanks: ours, or one of your managers saved as one. (agreed 47)
- **T2** A manager is made from a template by filling its blanks; every blank but a place has an answer already, and says where it is from.
- **T3** Each manager keeps its own copy. A newer template is a suggestion on its playbook, never a change behind its back.
- **T4** Saving a manager as a template leaves out places, people, models, secrets and cases.
- **T5** Any number of managers come from one template, on the same repo or others, with other models. Neither sees the other's work.
- **B1** A playbook is files with fixed shapes: SKILL.md, objective, workflow, triggers, agents, skills, reach, evals, because.
- **B2** Code reads them into one value or into problems, each with the file and the line, in words. Writing what was read gives the same.
- **B3** Code checks: every name exists; every step can end; who checks is not who did it; the page is at most 120 lines; each cron and wait has
  a limit and makes a kind that is there; no part has no eval; every line says why it is there; nothing is wider than the reach above.
- **B4** A playbook has versions. A change by a person, by a suggestion, or by going back is a new version. Work keeps the version it was
  decided under; what is open is told when a newer one touches it.
- **B5** A line can be commented on. A comment becomes a change to accept, an answer, or a case. A suggestion shows what was and what it
  becomes, with *Accept* and *Leave it*.
- **B6** Two people changing the same part: the second is told, and sees both. Nothing is overwritten silently.
- **B7** A skill says how. It never allows anything: reach does.

## 5. Setting one up

- **S1** A person says what they want to get to. It says it back so that it can be measured: what is counted, where it is read, what it is
  now, by when.
- **S2** If a manager that is there could carry it, it proposes a change to that one and stops.
- **S3** It asks at most three questions, only what nobody but the person knows. Every question has an answer of its own and says which lines it changes.
- **S4** It asks to connect, to read only, saying what it reads and what it cannot know without. That ends when the draft is made or thrown away.
- **S5** It says what the past shows, each with where it read it; the person can say *that is wrong*.
- **S6** At most three more questions, from what it found. There is no third round: the rest is a line marked *my idea*.
- **S7** The draft is the playbook page before it is there: every line marked you said, looked up or my idea; all of it editable and
  commentable; already run on the last 30 days, sending nothing.
- **S8** The person judges about ten cases; those are the first evals. Nothing is made before that and *Make it*.
- **S9** From a template it is shorter: pick it, pick the place; it reads the place, finds how to install and test, tries it, and says in one message what
  it found and what it cannot do.

## 6. What comes in

- **I1** Four triggers: cron, event, wait, asked. All make the same thing: an item. (agreed 43)
- **I2** An item on a thread that open work follows goes to that work, with no second decision, whoever wrote it. Outside words are
  information there, never an order.
- **I3** Otherwise code asks who it is: *asked* (counts as asking), *maybe* (something to judge), or *no*. Per place and group of people. For GitHub,
  whoever can write to the repo, asked of GitHub when it matters.
- **I4** Then a model judges every kind of every manager that hears that place: yes or no, and why. It can only read.
- **I5** Then code decides: took, joined, left, asked, stopped, or could not tell. At most one manager takes it. Two that fit equally: it asks.
- **I6** Work nobody asked for follows the kind's setting: off (left), watch (left, with what it would have done), ask (a person says), do.
- **I7** Every decision keeps the version it was made under and each kind's why. Intake shows them all, the left ones counted.
- **I8** A person can say a decision was wrong, either way. That becomes a case, and, twice in a row for a kind, the kind goes back to ask.
- **I9** Someone who may ask can say *stop*: the work stops for good, and says so.
- **I10** If the judge fails or is out of money, it is *could not tell*, is tried again, and a person is told. Nothing is dropped.
- **I11** A wait becomes true once for one thing, and not while a person has it. A search brings the same finding in once.
- **I12** Nothing in what comes in can widen reach, change a playbook, approve, or name a tool to run.

## 7. Work

- **W1** A piece of work has an id, a kind, a step, a mandate, done when, evidence, one who answers for it, and a next. Open work always has a next
  with a date.
- **W2** Done when is written before anything is done, and said where it was asked.
- **W3** Its mandate is a part of the manager's reach: what it may do, until when, for how much. It never grows. Taken back above, it is gone below.
- **W4** Steps are the board's columns. Between steps the rules are fixed: what must be true to go on, else back, ask, or drop.
- **W5** Someone else checks: a fresh conversation that has not seen the doing, with evidence for each done-when. What did it cannot check it.
- **W6** Sent back twice, it asks a person.
- **W7** A person can be a step: they get an ask, with a date, and the work carries on when they answer.
- **W8** It ends as done, no, or dropped, with a reason, and whoever asked is told where they asked. Work can be opened again only by a person.
- **W9** Quiet past its next's date, it looks, and says once what it waits for.
- **W10** A crash, a deploy or a lost box at any moment loses nothing and does nothing twice.
- **W11** It stops at its limit of money or time and asks. What it has made so far is kept.
- **W12** A board shows work by step, and who each waits for. A person can move, add, reprioritise, stop, and say what done means; the work hears it.
- **W13** Work can be handed to another manager in the tree, with a part of the mandate; its answer comes back to the one that asked.

## 8. Threads and boxes

- **H1** Each conversation in a connector that a piece of work follows has one thread: a fork of the manager's agent that stays with it.
- **H2** A thread starts from the playbook page, its agent's words, its skills, the work, and the thread so far; nothing else.
- **H3** What an agent is offered is exactly its tools and the actions its mandate has on; an action set to ask parks until a person answers,
  while the rest goes on.
- **H4** A thread that ends wakes its work with what it reports, or with *unanswered* when it died.
- **H5** Everything a thread did can be read: what it said, each call with its result, the diff, cost and time. People do not live there.
- **H6** A piece of work has one box: files stay between commands, and between days. It is warm while used, saved when quiet, gone when the work ends.
- **H7** The same call replayed gives the same result and never runs twice.
- **H8** No credential that can write is ever in a box. Pushing, commenting and merging are actions, done outside it.
- **H9** A branch leaves the box as a bundle, is checked (only its branch, no workflow files unless reach says so) and pushed for it.
- **H10** A box gone in the middle costs time only: the work goes on from the last bundle.

## 9. Models and money

- **M1** A workspace brings its own: provider keys, its own servers, ChatGPT. More than one at once.
- **M2** Each agent has a model and a thinking level: its own, else its manager's, else the workspace's. The judge and the checker too. (agreed 48)
- **M3** A model that stopped working: the next one up is used if it is allowed, and it says so; else it waits and asks.
- **M4** Every model call's tokens and price, and every box second, count on the work, the manager and the day. A price is the one a
  provider publishes, or what an own server's list of models says (`pricing`, as OpenRouter gives it). One not known says so; it is never zero.
- **M5** Limits: per piece of work, per manager, per workspace and day. Reached: it stops taking on, finishes nothing silently, and asks.

## 10. Asks and the inbox

- **A1** An ask is to one person: decide, approve, do, review or know. It shows exactly what will be sent or done, its answer, and by when.
- **A2** It goes to who answers for the work, else who lent the account, else who asked. Past its date: a reminder, then the stand-in.
- **A3** Silence never approves. An ask can say what it does without an answer only for *decide*, and never for something outside.
- **A4** Answering anywhere (inbox, GitHub, Slack, mail) answers it everywhere. The second answer is told it was late.
- **A5** The inbox has only what needs that person: the ask in full, then actions; done ones leave it.
- **A6** An answer can be *always*: for this thread, this person or this kind. That is a rule it shows, with how often it was right.

## 11. How good it is

- **O1** An objective has a measure read where the manager cannot write, or said by a person; an aim with a date; a line; and what must not get worse.
- **O2** Until it can be read it says *Not yet*, and when. Nothing stands in for it.
- **O3** Every part has an eval: what good is, who judges, cases, now, line.
- **O4** Once a week it takes the weakest part, proposes one change, tries it on the same cases beside what is there, and shows both.
- **O5** It may make that change alone for words, skills, models, and how often it looks. Steps, reach and what good means are asked.
- **O6** It is kept only if better on the cases by more than it varies by itself, and no measure is worse. Going back is one press.
- **O7** A craft skill stays only if the same cases come out better with it than without.
- **O8** A correction becomes a proposed line: where, what it was, what it becomes, who said so. A person accepts it.
- **O9** Two weeks below its line: the co-worker says where it is lost and proposes one thing.

## 12. The tree

- **R1** Managers sit under the co-worker, or under one another, as deep as it goes. A part of reach and money is handed down; never more.
- **R2** Making, copying, changing, pausing and retiring a manager are actions. Pausing stops taking on and starting; open work waits; what comes in is
  kept. Retiring hands open work up or ends it with a reason; nothing is left without one who answers.
- **R3** The tree shows each with what it costs, makes, waits for, and whether its objective is on its line, rolled up.

## 13. The console

- **U1** One shell, one header, four bodies, one Save, colours with one meaning, as [design.md](design.md) says.
- **U2** The screens are those in [design/](../design/README.md), and look like them at 1440 and 390 wide, light and dark.
- **U3** One registry of actions: a button, the palette and the co-worker press the same one. What you may not do is not offered.
- **U4** Usable within a second. Everything that moves shows without reloading.
- **U5** Loading, empty, not yet, error, offline and gone are drawn, and each says the one thing to do.
- **U6** Search finds work, threads, managers, people, playbook lines, mail and deals you may see, by their words.
- **U7** Everything works with the keyboard, and reads right to a screen reader.

## 14. Limits it keeps

- **L1** No token that can write reaches a model or a box (H8). No secret is printed, logged or shown (P6).
- **L2** Text from outside never grants, approves or changes anything (I12), in a mail, an issue, a page, a file or a tool's answer.
- **L3** Every outside request goes to a host the connector names. A fetch by a model cannot reach private addresses.
- **L4** A workspace can be exported (one file, everything but secrets), and deleted for good, by an Owner who types its name; it is gone
  30 days later, the date is said at once, and it can be taken back until then.
- **L5** A person who leaves loses everything at once, and what they lent ends.
