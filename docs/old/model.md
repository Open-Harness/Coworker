# How Co-worker works: the shared model

> **Old.** Kept for the record, do not build from it. Start at [AGENTS.md](../../AGENTS.md); [design.md](../design.md) is what is agreed.

Draft for agreement, 2026-11-23. Once we agree on this, we compare it with the canvas and update the screens.

The model borrows its core from DeepSeek's super-agent design
([deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype), docs 000–008):
**work enters through a Source as a Trigger, passes a Gate, and only a manager's decision turns it into a Task.**
What we add: a hosted workspace, a manager that owns a mission and a board, several agents per task, and email as a
first-class Source.

## The rule everything follows

From DSH 000: **take as little human attention as possible, and give as much value as possible.** For us that means:

- A manager acts only when asked, or when a written rule lets it. Proactive work starts in a mode that only records
  what it *would* have done.
- It speaks only when a person must act or can use a result: once to confirm, again when done, stuck, or asking.
  Replies go back to the conversation the request came from.
- It asks one concrete question at a time, as a structured question, never buried in a report.
- The UI shows first what waits for a person. A healthy state takes no space.

## The flow

```text
Source ──Trigger──▶ Thread ──▶ Gate ──candidate──▶ Manager ──accept──▶ Task ──▶ Runs (agents in roles)
  ▲                   │                              ▲  │ attach / ignore / stop    │
  │                   └── follow-up on a Task's ─────┘  └──── escalate ──▶ a person's Inbox
  │                       Thread, no gate                                          │
  └──────────────────────── Channel (replies, PRs, emails) ◀───────────────────────┘
```

1. A **Source** (GitHub, Slack, email, the app itself…) produces **Triggers**.
2. Each Trigger belongs to a **Thread** (a Slack thread, an email thread, a GitHub issue).
3. If a live **Task** follows that Thread, the Trigger is a **follow-up**: it goes to the manager, marked with the
   Task, without the Gate. The manager answers it, passes it to a Run, or escalates it. Runs never take outside
   messages directly.
4. Otherwise the **Gate** runs: plain code, no model. Who sent it, did they address the agent, is the sender allowed?
   The result is a **candidate** with a strength (`explicit` or `inferred`), or nothing.
5. The **manager** triages candidates: accept (new Task), attach (to an existing Task), stop, or ignore. Every
   triage is recorded as a **Decision** with its reason.
6. An accepted Task records its **Mandate**: why the work is allowed and how far it may go.
7. The manager starts **Runs** on the Task, each an agent in a role (implementer, verifier, researcher…).
8. Everything the agents say to the outside goes out through the Thread's **Channel**.

## The schema

Plain TypeScript, as it would sit in `types.ts` files. Names are proposals.

```ts
// ── Where work comes from ───────────────────────────────────────────────
/** A plugin: GitHub, Slack, Mattermost, Discord, WhatsApp, Telegram, Email, Schedule, Webhook, App. */
interface SourceKind<Config> {
  kind: string;                         // stable id: "slack", "email"
  configSchema: Schema<Config>;         // the settings form is generated from it
  ingress: "webhook" | "socket" | "poll" | "internal";
  verify(request: Request, secrets: Vault): Result<unknown, "bad_signature">;
  translate(raw: unknown, me: BotIdentity): Trigger | undefined;   // drops the bot's own messages
  scope(trigger: Trigger, config: Config): { listened: boolean; observed: boolean; row?: string };
  channel: { send(msg: Outbound): Promise<"sent" | "gone">; allowed(addr: Address, config: Config): boolean };
  threadContext?: { read(trigger: Trigger, part: "thread" | "root" | "parent", cursor?: string): Promise<ContextPage> };
}

/** One configured connection in a workspace: "Slack · Acme", "launch.acme@co-worker.tech". */
interface SourceInstance { id: string; kind: string; config: unknown; bot: BotIdentity; enabled: boolean; health: Health }

/** One immutable event. Accepting the same Trigger twice makes one Task. */
interface Trigger {
  id: string;                    // derived from the platform's own id: the idempotency key
  source: string;                // SourceInstance id
  threads: ThreadRef[];          // the first is primary; the rest only add context
  actor: { id: string; human: boolean };       // in the platform's own identity, never mapped
  addressed?: "mention" | "direct";            // did it speak to the agent?
  at: string; text: string; attachments: FileRef[];
  replyTo: Address;              // where an answer goes
  meta: Record<string, unknown>; // untrusted: text and meta never grant anything
}

// ── Deciding what is work ───────────────────────────────────────────────
/** The manager's rules for accepting work. Versioned on its own, not with the agent. */
interface Policy {
  version: number;
  acceptMode: "off" | "observe" | "auto";      // for inferred work only; explicit asks always work
  rules: { name: string; instructions: string; enabled: boolean }[];  // kinds of proactive work
  allowed: Allow[];              // who may ask, on every Source this manager listens to
  perSource: Record<string, {
    allowed: Allow[];            // extra, for this Source only (a support channel opened to everyone)
    bots: Handle[];              // bots whose messages may become inferred candidates
    admission: Record<string, AdmissionRow>;   // per receiving scope: channel, mailbox, repo event
  }>;
}

// ── Who someone is ──────────────────────────────────────────────────────
/** One stable identity across every platform. A workspace member is a Person with an account. */
interface Person {
  id: PersonId;
  name: string;
  member?: MemberId;             // set when they can sign in to the workspace
  handles: Handle[];
}
/** How one Person appears on one platform. */
interface Handle {
  kind: string;                  // the SourceKind: "slack", "email", "github", "discord"…
  space?: string;                // where the id is unique: a Slack team, a Discord guild; none for email
  id: string;                    // the platform's own stable id: U02ABC, priya@acme.com, github user id
  display?: string;              // @priya, Priya Shah: shown, never matched on
  proof: "signed_in" | "verified" | "added";   // see "People and handles"
}
/** An entry in an allowed list. */
type Allow =
  | { kind: "person"; person: PersonId }                 // every handle this Person has, now and later
  | { kind: "group"; group: GroupId }                    // "Members", "Launch team"
  | { kind: "domain"; domain: string }                   // email only: *@acme.com
  | { kind: "handle"; handle: Handle };                  // someone we only know on one platform
type Strength = "explicit" | "inferred";
type Decision =
  | { kind: "accept"; task: TaskId; mandate: Mandate }
  | { kind: "attach"; task: TaskId }
  | { kind: "stop"; task: TaskId }
  | { kind: "ignore"; reason: string; wouldAccept?: boolean }    // wouldAccept: observe mode
  | { kind: "unavailable"; reason: string };

interface Mandate {
  policyVersion: number; strength: Strength; scope: string;
  matchedRules: string[]; sender: { source: string; id: string };
}

// ── The work ────────────────────────────────────────────────────────────
interface Manager { id: string; agent: AgentRef; mission: MissionPage; board: Board; policy: Policy; sources: string[] }

/** One model for every kind of manager. A Kanban, an incident console and a support inbox differ only in values. */
interface Board {
  lanes: Lane[];                 // Kanban columns, List groups, Console groups: one list
  fields: Field[];               // typed, set by the manager: severity, service, priority, due
  defaultView: View;             // every view is always available; this is the one it opens on
}
type View = "kanban" | "list" | "console" | "inbox";
interface Lane { id: string; name: string; meaning: string; needsApproval: boolean; limit?: number }
type Field =
  | { key: string; label: string; type: "select"; options: { value: string; tone?: "red" | "amber" | "green" }[] }
  | { key: string; label: string; type: "text" | "number" | "date" | "person" };

interface Task {
  id: string; title: string; lane: string;
  values: Record<string, unknown>; // { severity: "SEV1", service: "checkout-api" }
  owner?: PersonId;              // the person answerable for it: an incident commander
  mandate: Mandate;              // why this work is allowed
  follows: Subscription[];       // Threads whose messages reach it
  replyTo: Address[];            // Channels it answers on
  runs: RunId[];                 // every agent that has worked on it, in order
  waitingOn: Stage;              // derived, never set by hand (see Stages)
  questions: Question[];         // structured questions waiting for a person
  comments: Comment[];
}
interface Subscription { thread: ThreadRef; kind: "origin" | "follows" | "context" }

/** One agent working on one Task in one role: a task-owned pi-durable conversation. */
interface Run {
  id: string; task: TaskId; role: string; agent: AgentRef; attempt: number;
  state: "queued" | "running" | "ended";
  report?: "progress" | "waiting" | "ready" | "blocked" | "failed" | "dropped";
}
```

## Who may start work: the Gate

Straight from DSH 002, kept as code, never as prompt text:

| Who | Says it to the agent? | Strength |
|---|---|---|
| A Person or group the Policy allows | yes (mention or DM) | explicit |
| Someone following up on a Thread that already has a Task | either | explicit if on the list, else inferred |
| Someone not on the list | yes | ignored by default; the admission table can make it explicit (a support channel) |
| Anyone, in a scope that receives every message | no | inferred, or ignored, per admission table |
| A bot on the Source's bot list | — | inferred, never explicit |
| Any other bot, CI | — | not admitted, but still reaches subscribed Tasks as context |

**Accept mode** applies to inferred candidates only: `off` drops them, `observe` (the default) records "would accept"
without acting, `auto` accepts when a rule matches. Explicit requests work in every mode. A new manager starts in
`observe`; you switch to `auto` after reading what it would have done.

**A person's message in a manager's own chat, or on the board, is always explicit.** The App Source has no Gate
beyond being a workspace member.

## People and handles

Unlike DSH, a person is a concept: one **Person** with a **Handle** on each platform. `priya@acme.com`, Slack
`U02ABC` in the Acme team and GitHub user `123456` are one Person, so allowing Priya once allows her everywhere.

- **Matching uses the platform's stable id, never the display name.** Slack and Discord ids are unique within a
  `space` (the Slack team, the Discord guild), so a Handle carries it. Email has no space; addresses are lowercased.
- **A Trigger is resolved to a Person at the Gate**: look up `(kind, space, id)`. No match means an unknown sender,
  who falls under the admission table as before.
- **Proof decides how much a Handle counts:**

| Proof | How it got there | Counts for |
|---|---|---|
| `signed_in` | A member connected their own Slack, GitHub or email account (OAuth, or a sign-in link) | explicit |
| `verified` | The platform vouches: a Slack user in a team the workspace installed into, a domain that passes DKIM | explicit |
| `added` | An owner typed it in for someone outside the workspace (a customer's email) | explicit, because an owner vouched; shown as unverified |

- **Email is the weak spot.** A From address can be forged, so an email Handle only counts when the message passes
  DKIM for that domain. A failing message is treated as an unknown sender.
- **Groups**: "Members" is built in. Owners can make others ("Launch team"), and an allowed list can name a group.
- **Bots** are Handles too, kept in a Source's bot list, never on a Person.

## The manager's authority

The manager can handle almost anything itself. It escalates to a person only when it can't.

- **Every action a person can take on the manager's screens is also a manager tool.** Lanes, tasks, comments, the
  mission page and its sub-pages, the board's settings, the Policy, its Sources: if there's a button for it, the
  manager has a tool for it. One action, two callers. This parity is checked: each UI action names its tool.
- **Reading its own state is a tool too**: the board, a Task's history, a Run's transcript, the events it heard.
- **Anything else goes to an agent.** Code, research, writing a document, calling an outside API through MCP: the
  manager starts a Run, with an agent from the workspace or one it makes for the job.
- **Follow-ups come back to the manager**, not to the Runs. It decides who should see them.
- **Escalation** is a structured Question to a person, which lands in their Inbox. It's for actions set to `ask`,
  and for things the manager cannot work out.

### Permissions: on, off or ask, per action

We don't decide up front what a manager may do. Every action in the catalogue ([actions.md](actions.md)) has a
permission, set per manager:

```ts
type Permission = "on" | "off" | "ask";
interface Permissions {
  categories: Record<CategoryId, Permission>;   // the default for every action in the category
  actions: Partial<Record<ActionId, Permission>>; // overrides for single actions
}
```

- **on**: the manager does it.
- **off**: the tool isn't offered at all, so the manager never tries.
- **ask**: the call parks until a person answers in their Inbox: *Allow once*, *Always allow* (sets it to `on`),
  or *Deny*. On pi-durable this is a `beforeTool` hook that sleeps on an approval signal, so a waiting manager
  holds no process.
- A template ships its own Permissions. The catalogue gives every action a default, and nothing is locked: an owner
  can set any action to any value.

## Stages: lanes are the manager's, waiting is the system's

Lanes are the manager's workflow and it changes them freely. Separately, every open Task has one **stage**, derived
from facts, first match wins (DSH 003):

| Stage | When | Shown as |
|---|---|---|
| person · answer | it has an open Question | Needs your answer |
| person · review | the latest report is `ready` | Needs your review |
| person · blocked | the latest report is `blocked` or `failed`, and nobody wrote since | Blocked |
| queued | no Run, or none started yet | Queued |
| idle | the latest report is `waiting` | Waiting for something |
| working | everything else | Working |

The board shows lanes. "Needs you" across every manager comes from stages, so a person never has to know a manager's
lanes to find what waits on them.

## Sources as plugins

Every platform is a `SourceKind`. Adding one never touches the core: it maps its events onto Trigger and Thread,
declares its settings form, its Channel and who may ask (DSH 008 is the recipe).

| Source | Thread is | Channel writes | Ingress |
|---|---|---|---|
| App | a manager chat, a Task's comments | messages in the app | internal |
| Email | an email thread (Message-ID, References) | a reply in the thread | Cloudflare Email Routing → Worker |
| Slack, Mattermost | a message and its thread replies | thread replies | Events API webhook / outgoing webhook |
| Discord | a channel thread | thread replies | Gateway socket (a Durable Object holds it) |
| WhatsApp, Telegram | a chat | messages in the chat | webhook |
| GitHub | an issue or pull request | comments, reviews, PRs | GitHub App webhook |
| Schedule | one schedule | none | internal alarm |
| Webhook | whatever the sender keys it by | none, or a callback URL | signed webhook |

**Chat platforms wrap Vercel's Chat SDK adapters** (`@chat-adapter/slack`, `discord`, `teams`, `telegram`,
`whatsapp`, `gchat`…) inside one generic `SourceKind`. The adapter parses and verifies platform events and posts
replies; our wrapper maps them onto Trigger, Thread, Handle and Channel, and keeps the Gate, Policy and outbox. Still
to check: that the adapters and their state run in a Durable Object, and how Discord's Gateway socket is held.
Mattermost has no official adapter yet, so it's either a community one or ours.

A **connection** (keys, OAuth, bot token) lives in the workspace vault. A **Source instance** is one connection plus
what it listens to, owned by a manager. Several managers can share a connection and listen to different channels.

## Email, first class

- **Every manager gets an address**: `launch.acme@co-worker.tech`. The last dot separates the manager from the
  workspace, and every workspace is on one domain, so nothing is set up per workspace. A custom domain is a workspace setting.
- **Every Task gets a reply address**: `launch.acme+dt-14@…`. A reply lands on the Task as a follow-up, with no triage.
- **Threads** come from `Message-ID`, `In-Reply-To` and `References`. Replies go out with the same headers, so they
  thread in the sender's mail app.
- **Who may ask** is an allowed list of addresses and domains (`*@acme.com`). Mail from anyone else is ignored unless
  the admission table says otherwise.
- **Loops and spoofing**: mail from a manager's address or the app's own is dropped, auto-replies are dropped (the Agents SDK's `isAutoReplyEmail`), reply routing headers are
  signed, and SPF/DKIM failures never count as explicit.
- **Attachments** go to R2 and reach the agents as files.
- **On Cloudflare**: inbound through Email Routing to the Worker's `email()` handler, outbound through the Email
  Service `send_email` binding. The Agents SDK already does address-based routing and signed replies; we copy the
  pattern, not the class.
- Later: connect your own mailbox (Gmail, Outlook) as a second email kind, so the manager reads and writes from it.

## How it sits on pi-durable

pi-durable has no Source or Channel layer. It gives us the durable pieces, and we build the layer on them:

| Need | pi-durable piece |
|---|---|
| A Trigger counts once | `submit` with `requestId` = Trigger id |
| The manager triages | the manager's conversation; triage tools record Decisions |
| A Run on a Task | a task-owned background child conversation |
| A Run waits for CI, a person, an email reply | a tool that parks on a signal; `harness.signal()` wakes it |
| A follow-up reaches the manager | a submit to the manager's conversation, marked with its Task |
| The manager passes it to a Run | a submit to that Run's conversation, or a signal if the Run is parked |
| The schedule Source | a durable task with `sleepUntil` on the one Durable Object alarm |
| Replies retry without duplicates | an outbox task with an idempotency key per message, retrying with backoff |

Ingress is one route, `/in/:sourceInstance`: verify, translate, store the Trigger and gate in the Workspace object,
then submit to the Manager object with the Trigger id as `requestId`.

## Where data lives (decided 2026-11-23)

| Store | Holds | Why there |
|---|---|---|
| **D1** `coworker-control` (one database) | Better Auth: user, session, account, organization, member, invitation. Plus `workspace_directory`: workspace id → its object and region | Read on every request, from any request. Small and shared |
| **Workspace** Durable Object, one per tenant | People and handles, Sources, Policy, the vault, the Inbox, join requests, the audit log, the list of managers, people's permission changes | Workspace-wide records in one consistent place. One tenant's load and failures stay in its object |
| **Manager** Durable Object, one per manager | The pi-durable harness: the manager's conversation and its Runs; the mission page and sub-pages; the board, tasks and comments | Managers run side by side; each has its own 10 GB |
| **R2** | Skill files, attachments, page images | Large files |

- No table holds rows for more than one tenant except D1's auth tables. Deleting a workspace deletes its objects and
  its D1 rows.
- A workspace's objects are created in its data region (EU or US jurisdiction), chosen at creation.
- A Manager talks to its Workspace by one idempotent call per thing: gate a trigger, add an Inbox item, write an
  audit line, read a vault secret.

**Auth.** Better Auth with the organization plugin owns sign-in (Google, GitHub, email link, SSO later), sessions,
linked accounts, organizations, members and invitations, on D1 through the Drizzle adapter. Its roles are the presets
(Owner, Builder, Member) and gate only coarse things, like opening Settings. Every action, by a person or a manager,
goes through one check: preset default plus that person's own changes, giving on, ask or off. Domain auto-join and
requests to join are ours: a hook on sign-in and a join request in the Owners' Inbox, approved through Better Auth's
`addMember`. Its `account` rows are the person's "signed in" handles.

**The vault.** Envelope encryption. One master key in Cloudflare Secrets Store, bound to the Worker. Each workspace
has its own data key, stored wrapped by the master key in its Workspace object, and every secret (model keys,
endpoint keys, OAuth tokens, bot tokens, signing secrets) is stored as AES-GCM ciphertext under it. A secret is
decrypted in memory for one call (`vault.use(name, fn)`) and never returned to a screen, an agent or a sandbox.
Sandboxes get short-lived tokens, such as a GitHub installation token. Deleting a workspace destroys its data key,
which makes every ciphertext unreadable. Replacing the master key rewraps the data keys only.

## Words

| Ours | DSH | Means |
|---|---|---|
| Source | Source | a stream of events from one platform connection |
| Trigger | Trigger | one immutable event |
| Thread | Thread | Triggers that belong together on the platform |
| Gate | Gate | code that decides who may start work, and how strongly |
| Triage | Assessment | the manager's judgement on a candidate |
| Decision | Decision | accept, attach, stop, ignore, unavailable |
| Mandate | Mandate | why a Task is allowed, and how far it may go |
| Task | Ticket | a unit of accepted work: a card on the board |
| Run | Assignment + Executor Session | one agent on one Task in one role |
| Manager | Main Session | owns the mission, the board, the Policy and its Sources |
| Question | Attention | a structured question waiting for a person |
| Channel | Channel | the write side of a Thread |

## Where we differ from DSH, on purpose

- **A manager has a mission and a board.** DSH has one router for everything; we have one per mission.
- **Several Runs per Task, in roles.** DSH runs one executor per ticket.
- **Hosted, multi-tenant.** Sources are plugins per workspace, configured in the app, not CLIs on one machine.
- **Lanes are the manager's own.** DSH has no board; its stages become our "Needs you".
- **People are a concept.** One Person, a Handle per platform. DSH keeps identities per Source.
- **Follow-ups go to the manager.** In DSH the executor owns them; ours has near-full authority and routes them.

## Decided (2026-11-23)

- Allowed lists name People, groups, email domains or single Handles; a Person has one Handle per platform.
- Follow-ups on a Task go back to the manager. It handles anything it can, and escalates to a person when it can't.
- The manager's tools are every action a person can take on its screens. Everything else goes to an agent.
- Chat platforms wrap Vercel's Chat SDK adapters.
- A person's message in the manager's chat is always explicit.
- What a manager may do isn't fixed: every action is on, off or ask, per manager, with defaults from the catalogue.
- One Board model serves Kanban, list, incident console and inbox. Every view is always available.
- Small jobs go to an agent. The manager does only what its tools allow, however small the job.
- GitHub arrives through one GitHub App per workspace. Each manager picks its repos and, per repo, which events it
  hears (pull requests, issues, labels, CI results, reviews). A template turns on a starting set.
- People's permissions use the same catalogue. Owner, Builder and Member stay as presets; an owner can set any single
  action to on, ask or off for any person.
- A person can always answer in their own words: on the Needs you page, in the Inbox, on the task and in the chat.
  The manager asks again if the answer is unclear.
- Hosted, not packaged for self-hosting. Workspaces bring model access only: provider keys (Anthropic, OpenAI,
  Google, OpenCode), ChatGPT sign-in, or their own OpenAI- or Anthropic-compatible endpoint. Sandboxes run on our
  Cloudflare account and are billed per hour beyond what each seat includes.
- There is no separate Library. Documents are a manager's mission page and its sub-pages; Search finds them
  across managers.
- Storage, tenancy, auth and secrets are as described in "Where data lives": D1 for auth and the workspace directory,
  a Workspace object and one Manager object per manager, Better Auth with the organization plugin, and an
  envelope-encrypted vault.

## Open

1. **Chat SDK on Workers**: a spike must show the adapters run in a Durable Object (Slack first) before any chat
   platform is promised. Email does not depend on it.
