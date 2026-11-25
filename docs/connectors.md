# Connectors: three examples

How first-principles 32 works for GitHub, email and WhatsApp. Facts about GitHub's MCP server, OpenWA and Slack were read
from their own docs on 25 November 2026, nothing was run. Names are proposals.

## The shape

A connector is **not** an MCP server. MCP is one way a connector gets its *actions*. No MCP server here delivers what
comes in, or can be used to set itself up. So a connector has four parts:

| Part | What it is | Who uses it | Where it comes from |
|---|---|---|---|
| **Set up** | Make an account, prove it, watch that it is alive, take it away | The root manager, and a person where only a person can | The system's admin API. Never a thread |
| **In** | Events, made into one form: which conversation, who, what, when | The manager they are for | A signed webhook, or the mail handler |
| **Out** | Actions, each on, ask or off, and only where it was handed | Threads | MCP tools, our own calls, or git in the sandbox |
| **Know-how** | Skills, and how one conversation is shown | Threads, and the console | Ours |

```ts
interface Connector {
  id: ConnectorId;                         // "github", "email", "whatsapp"
  setUp: AdminAction[];                    // connect, add, check, remove. Says which need a person, and why
  events: EventKind[];                     // in
  receive: (raw: unknown) => Result<Event, "not_signed" | "not_ours" | "broken">;
  actions: ActionSpec[];                   // out
  skills: SkillId[]; thread: ThreadView | null;
}
interface ActionSpec {
  id: ActionId; does: string;              // "Open a pull request"
  by: { mcp: ToolName } | { call: "ours" } | { git: true };
  fixed: ArgName[];                        // filled in by us from the grant, a model never gives these
  starts: "on" | "ask" | "off";            // an MCP tool we did not list is off
}
```

A thread never talks to an MCP server. It calls an action; we check the grant, fill in the fixed parts, use the secret for
that one call, and write down what was done. So changing who supplies an action (OpenWA, or Meta's own API) changes nothing
for a manager.

## GitHub

| Part | |
|---|---|
| Set up | **A person** installs our GitHub App and picks the repos (two clicks). Then: hand a repo to a manager, choose its events, check the App is still installed |
| In | The App's webhook, signed: issues, comments, line comments, reviews, checks, merges. Conversation: the issue, and the pull requests that close it |
| Out | GitHub's MCP server (about 100 tools), **and git in the sandbox** for clone, commit and push, which MCP is the wrong tool for |
| Know-how | How this repo tests, how to answer a review. Shown as an issue with its pull request |

```jsonc
{ "id": "github", "account": "the workspace's GitHub App", "on": "Open-Harness/Coworker",
  "in":  ["issue", "comment", "line_comment", "review", "check", "merged"],
  "out": {
    "issue_read":                         { "by": "mcp", "fixed": ["owner", "repo"], "may": "on" },
    "pull_request_read":                  { "by": "mcp", "fixed": ["owner", "repo"], "may": "on" },   // diff, reviews, checks
    "get_job_logs":                       { "by": "mcp", "fixed": ["owner", "repo"], "may": "on" },
    "add_reply_to_pull_request_comment":  { "by": "mcp", "fixed": ["owner", "repo"], "may": "on" },
    "create_pull_request":                { "by": "mcp", "fixed": ["owner", "repo"], "may": "on" },
    "push":                               { "by": "git", "fixed": ["repo", "branch"], "may": "on" },  // its own branches
    "merge_pull_request":                 { "by": "mcp", "fixed": ["owner", "repo"], "may": "ask" },
    "delete_repository":                  { "by": "mcp", "may": "off" }                                 // off, like all not listed
  } }
```

The token is made by us for one repo and lasts an hour at most (the spike has this: `github.repoToken`). Not checked: that
GitHub's hosted server takes an App's token. If it does not, we run their server ourselves and pass the token to it.

## Email

| Part | |
|---|---|
| Set up | The root does it alone: give a manager an address, an alias, take it away. **A person** once, for the domain's DNS |
| In | Cloudflare hands each mail to our Worker. DKIM says who really sent it. Conversation: the mail chain, by its message ids |
| Out | Our own calls to Cloudflare's sending binding. **No MCP needed**: the mailbox is ours |
| Know-how | Write to people, keep someone in copy, know who is inside and outside. Shown as a mail client |

```jsonc
{ "id": "email", "account": "coder.openharness@co-worker.tech",
  "in":  ["mail", "bounced"],
  "out": {
    "search_mail": { "by": "ours", "fixed": ["mailbox"], "may": "on" },
    "draft":       { "by": "ours", "fixed": ["from"],    "may": "on" },
    "reply":       { "by": "ours", "fixed": ["from", "thread"], "may": "on" },
    "send_inside": { "by": "ours", "fixed": ["from"], "may": "on" },     // to people in the workspace
    "send_outside":{ "by": "ours", "fixed": ["from"], "may": "ask" }     // a new chain with a stranger
  } }
```

Cloudflare has an MCP server that can set email up, but it reaches the whole Cloudflare API. Not for a manager.

## WhatsApp, with OpenWA

| Part | |
|---|---|
| Set up | OpenWA's admin API, which its MCP server leaves out on purpose: make a session, start it, its QR code, its webhook, its keys. **A person** must hold the phone and scan the code |
| In | OpenWA's signed webhook: `message.received`, `message.edited`, `message.reaction`, `message.failed`, and `session.status`, which says the phone was unlinked. Conversation: the chat |
| Out | OpenWA's MCP server: 25 tools that read, and the ones that write once switched on |
| Know-how | Short messages, no second message to someone who said stop. Shown as a chat list and a chat |

```jsonc
{ "id": "whatsapp", "account": "+44 7700 900123", "on": "chats it started, or that wrote to it",
  "in":  ["message.received", "message.edited", "message.reaction", "message.failed", "session.status"],
  "out": {
    "MessageHistory":  { "by": "mcp", "fixed": ["sessionId", "chatId"], "may": "on" },
    "MessageReply":    { "by": "mcp", "fixed": ["sessionId", "chatId"], "may": "on" },
    "MessageSendText": { "by": "mcp", "fixed": ["sessionId"], "may": "ask" },                // to someone new
    "GroupCreate":     { "by": "mcp", "may": "off" }
  } }
```

OpenWA's keys can be held to one session and to chosen chats, so a thread's part is also refused by OpenWA, not only by us.

Three things to know before choosing it:

- **It is unofficial and can get the number banned.** Its own README says so, and says to use Meta's official API for
  large commercial messaging. A sales factory that writes first is the risky case.
- **It is a server that is always on**, with a whole Chromium per number (300 to 500 MB). Not a Worker: a container or a machine.
- **Its MCP must not face the internet**, and a key used over MCP cannot be tied to our addresses. So it sits behind us.

Meta's own API would be another supplier under the same connector. It has its own webhook, and needs approved templates to
write first.

## Slack, in short

Slack's MCP server lists its tools with *user* permissions only, so it acts as a person, not as a co-worker. To speak as
itself: Slack's Events API in, our own calls out, as an app a person installs. Its MCP fits a lent account.

## What this decides

1. Every connector has all four parts, ours in every case for *set up* and *in*.
2. MCP supplies actions where it is good. We list the ones we use, the rest are off. It is never handed to a thread whole.
3. Set-up actions are tools of the root manager only. Where only a person can do it, it asks for exactly that: click, scan.
4. A plain MCP server (a database, a search) is the smallest connector: its set up is a sign-in, nothing comes in.
