# Connectors: three examples

How first-principles 32 works for GitHub, email and WhatsApp. Facts about OpenWA and Slack were read
from their own docs on 25 November 2026, nothing was run. Names are proposals.

## The shape

A connector is **ours, in code**, so that we control all of it. It does not wrap an MCP server. MCP servers are a separate
layer, below. A connector has five parts:

| Part | What it is | Who uses it | How |
|---|---|---|---|
| **Set up** | Make an account, prove it, watch that it is alive, take it away | The root manager, and a person where only a person can | The system's admin API. Never a thread |
| **In** | Events, made into one form: which conversation, who, what, when | The manager they are for | A signed webhook, or the mail handler |
| **Out** | Actions, each on, ask or off, and only where it was handed | Threads | Our calls to the system's API, or git in the sandbox |
| **Know-how** | Skills | Threads | Ours |
| **View** | How its things are listed and opened, for the people who run the system | The console | One of four shapes, filled in. [Agreed](#the-view) |

```ts
interface Connector {
  id: ConnectorId;                         // "github", "email", "whatsapp"
  setUp: AdminAction[];                    // connect, add, check, remove. Says which need a person, and why
  events: EventKind[];                     // in
  receive: (raw: unknown) => Result<Event, "not_signed" | "not_ours" | "broken">;
  actions: ActionSpec[];                   // out
  skills: SkillId[]; thread: ThreadView;
}
interface ActionSpec {
  id: ActionId; does: string;              // "Open a pull request"
  fixed: ArgName[];                        // filled in by us from the grant, a model never gives these
  starts: "on" | "ask" | "off";
}
```

An action checks the grant, fills in the fixed parts, uses the secret for that one call, and writes down what was done.

## MCP servers, the other layer

Tools a manager can use, **added without code**: an address and a sign-in. A person adds one, or the root manager asks for
one. Nothing comes in through it, and it has no board, conversations or set up of its own.

| | Connector | MCP server |
|---|---|---|
| Made by | Us, in code | Anyone, in settings |
| Things come in | Yes, and become work | No |
| Is someone outside | Yes: an address, a number, a GitHub account | No |
| Actions | Chosen and written by us, parts filled in | Its own tools, as they are |
| Permission | On, ask, off, per action, handed on as a part | On, ask, off, per tool, handed on as a part |
| Examples | GitHub, email, WhatsApp, Slack | A database, a search, Linear, Figma, a company's own |

Permissions, secrets and the record are the same for both. A tool that only reads starts on, the others start at ask (mine).
An MCP server for a system we have a connector for (GitHub's) can be added, but acts outside the connector's limits, so the
console says so (mine).

## GitHub

| Part | |
|---|---|
| Set up | **A person** installs our GitHub App and picks the repos (two clicks). Then: hand a repo to a manager, choose its events, check the App is still installed |
| In | The App's webhook, signed: issues, comments, line comments, reviews, checks, merges. Conversation: the issue, and the pull requests that close it |
| Out | Our calls to GitHub's API, and git in the sandbox for clone, commit and push |
| Know-how | How this repo tests, how to answer a review. Shown as an issue with its pull request |

```jsonc
{ "id": "github", "account": "the workspace's GitHub App", "on": "Open-Harness/Coworker",
  "in":  ["issue", "comment", "line_comment", "review", "check", "merged"],
  "out": {
    "read":              { "fixed": ["repo"], "may": "on" },            // issues, diffs, reviews, checks, logs
    "comment":           { "fixed": ["repo"], "may": "on" },
    "reply_on_line":     { "fixed": ["repo"], "may": "on" },            // in the same thread
    "push":              { "fixed": ["repo", "branch"], "may": "on" },  // git, its own branches
    "open_pull_request": { "fixed": ["repo"], "may": "on" },
    "run_checks_again":  { "fixed": ["repo"], "may": "ask" },
    "merge":             { "fixed": ["repo"], "may": "ask" },
    "close_issue":       { "fixed": ["repo"], "may": "ask" }
  } }
```

The token is made by us for one repo and lasts an hour at most (the spike has this: `github.repoToken`).

## Email

| Part | |
|---|---|
| Set up | The root does it alone: give a manager an address, an alias, take it away. **A person** once, for the domain's DNS |
| In | Cloudflare hands each mail to our Worker. DKIM says who really sent it. Conversation: the mail chain, by its message ids |
| Out | Our calls to Cloudflare's sending binding. The mailbox is ours |
| Know-how | Write to people, keep someone in copy, know who is inside and outside. Shown as a mail client |

```jsonc
{ "id": "email", "account": "coder.openharness@co-worker.tech",
  "in":  ["mail", "bounced"],
  "out": {
    "search_mail": { "fixed": ["mailbox"], "may": "on" },
    "draft":       { "fixed": ["from"],    "may": "on" },
    "reply":       { "fixed": ["from", "thread"], "may": "on" },
    "send_inside": { "fixed": ["from"], "may": "on" },     // to people in the workspace
    "send_outside":{ "fixed": ["from"], "may": "ask" }     // a new chain with a stranger
  } }
```

## WhatsApp, with OpenWA

| Part | |
|---|---|
| Set up | OpenWA's API: make a session, start it, its QR code, its webhook, its keys. **A person** must hold the phone and scan the code |
| In | OpenWA's signed webhook: `message.received`, `message.edited`, `message.reaction`, `message.failed`, and `session.status`, which says the phone was unlinked. Conversation: the chat |
| Out | Our calls to OpenWA's API |
| Know-how | Short messages, no second message to someone who said stop. Shown as a chat list and a chat |

```jsonc
{ "id": "whatsapp", "account": "+44 7700 900123", "on": "chats it started, or that wrote to it",
  "in":  ["message.received", "message.edited", "message.reaction", "message.failed", "session.status"],
  "out": {
    "read_chat":    { "fixed": ["number", "chat"], "may": "on" },
    "reply":        { "fixed": ["number", "chat"], "may": "on" },
    "react":        { "fixed": ["number", "chat"], "may": "on" },
    "write_first":  { "fixed": ["number"], "may": "ask" },              // to someone new
    "make_group":   { "fixed": ["number"], "may": "off" }
  } }
```

OpenWA's keys can be held to one session and to chosen chats, so a thread's part is also refused by OpenWA, not only by us.

Three things to know before choosing it:

- **It is unofficial and can get the number banned.** Its own README says so, and says to use Meta's official API for
  large commercial messaging. A sales factory that writes first is the risky case.
- **It is a server that is always on**, with a whole Chromium per number (300 to 500 MB). Not a Worker: a container or a machine.
- **Its keys open the chats**, so it is not on the internet: it sits behind us.

Meta's own API would be another supplier under the same connector. It has its own webhook, and needs approved templates to
write first.

## Slack, in short

An app a person installs. Slack's Events API in, our calls to its Web API out, so it speaks as itself.

## The view

Every connector says the same two things: a **thing** (a chat, a mail chain, a Slack thread, an issue, a deal) and an **entry** on
it (a message, a change, a file). We keep both as they arrive, so a list, a page, filters and search need no code of the plug-in's.

```ts
interface Thing { id: ThingId; title: string; who: Actor; state: string; fields: Record<string, Value>; in?: ThingId }  // in: the channel, the company
interface Entry { id: EntryId; thing: ThingId; at: Time; by: Actor; kind: "message" | "change" | "file" | "note"; body: unknown }

interface View {
  shape: "chats" | "mail" | "records" | "reviews";   // we draw these four
  columns: FieldName[]; filters: Filter[];            // what its list shows and can be filtered by
  box: ActionId[];                                    // what a person may do at the bottom of an open thing
  pages?: Page[];                                     // later: its own pages, framed, when no shape fits
}
```

Agreed 25 November 2026: our four shapes first, and a plug-in may add its own framed pages later. A shape is always there, so
search, the palette and the co-worker can read every connector, with or without its own pages.

`receive` answers with a thing and an entry. An action that went out is an entry too. So the view never differs from what the manager saw.

## A thread is a fork

`tx.forkConversation(parent, at, …)` in pi-durable 1.6 makes "a history fork at one concrete visible entry". A Slack mention
forks the manager's conversation with that channel, at that message. Work on it is forked again. Each is its own agent, with its
own limits, and reports to what it was forked from.

How others do it, read on 25 November 2026: OpenClaw gives each Slack thread its own session, fetches the last 20 messages of the
thread, and does not take on the channel's session unless `thread.inheritParent` is set. Claude Tag keeps one session for the
channel's top level and reads every reply in a thread it is in.

## What this decides

1. Every connector is a plug-in on one contract. The first ones are ours (first-principles 37).
2. MCP servers are a separate layer that a manager can use, like skills, with the same permissions.
3. Set-up actions are tools of the root manager only. Where only a person can do it, it asks for exactly that: click, scan.
