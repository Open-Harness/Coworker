# The model, from first principles

What was agreed in [first-principles.md](first-principles.md) (numbers in brackets), as types. It replaces
[model.md](model.md) once the first job works; "Where data lives", sign-in, people and the vault stay as they are there.
Names are proposals. Things marked **mine** were not asked, only follow from what was.

**Behind**: 19 to 23 in first-principles.md (one agent, an instance per thing, factories) are not in these types yet.
`WorkerKind` becomes a role, `Work.kind` a factory's item.

## The shape

```text
You ─▶ Lead ─▶ Manager ─▶ Worker          hand down a part of scope, report up, ask up (10, 12)

outside event ┐
worker report │                     ┌▶ left alone, with why
comment, move ├─▶ manager's inbox ──┼▶ answered
other manager │   (threads)         └▶ work ─▶ worker ─▶ evidence ─▶ check ─▶ done
its own date  ┘                                  └─ needs a person ─▶ that person's inbox
```

## Who

```ts
interface Manager {                        // the co-worker (1, 2)
  id: ManagerId; name: string;
  above: ManagerId | null;                 // null: the lead. One per workspace (10)
  mission: PageId;                         // always in its prompt: mine
  agent: { instructions: string; model: ModelPick; thinking: Level };   // built from an agent, but its own (1)
  scope: Grant[];
  kits: KitId[];
  workers: WorkerKindId[];                 // which workers it may start
  limits: Limits;
}
interface WorkerKind {                     // what is called an agent today
  id: WorkerKindId; name: string; instructions: string; model: ModelPick | null;
  skills: SkillId[]; environment: EnvironmentId | null;
  ever: Grant[];                           // the most it may be handed (12)
}
interface Person { id: PersonId; handles: Handle[]; standIn?: PersonId }   // (17)
```

## Reach

```ts
interface Connector {                      // GitHub, email, Slack, WhatsApp: ours, in code (32). See connectors.md
  id: ConnectorId;
  setUp: AdminAction[];                    // the root manager's, and a person's where only a person can
  events: EventKind[];                     // in
  receive: (raw: unknown) => Result<Event, "not_signed" | "not_ours" | "broken">;
  actions: ActionSpec[]; skills: SkillId[]; // out, and how to use it well
  thread: ThreadView;                      // how a thread of it is drawn (14)
}
interface McpServer {                      // tools a manager can use, added without code (33). Nothing comes in
  id: McpId; url: string; signIn: SecretId | null;
  tools: Record<ToolName, "on" | "ask">;   // not listed: off. Handed on as a part, like a Grant
}
interface Account {                        // (9, 11)
  id: AccountId; connector: ConnectorId;
  holder: { manager: ManagerId } | { person: PersonId; seenBy: "lender" | "shared" };
  as: string;                              // who the outside sees: always said
}
interface Grant {                          // scope is a list of these (12)
  account: AccountId; on: string;          // "acme/api", "#launch", "*"
  may: Record<ActionId, "on" | "ask">;     // not listed: off
  from: GrantId | null;                    // whose part it is; taking that away takes this
  limits?: Limits;
}
interface Limits { money?: PerMonth; time?: Duration; atOnce?: number }    // handed on like scope: mine
interface Kit { id: KitId; name: string; grants: GrantSpec[]; skills: SkillId[]; workers: WorkerKindId[]; kinds: KindId[] }

// The only way to make a grant. A wider one than its parent is an error, not a warning.
type HandOn = (parent: Grant, part: GrantSpec) => Result<Grant, "wider_than_held">;
// A worker's grants: the manager's, and what was handed for the job, and what its kind may ever have.
```

`ask` is answered by a person only (13). A request from a person is held to what that person may do; more than that
goes to someone who may (13).

## What reaches it

```ts
interface Event { id: EventId; account: AccountId; thread: ThreadId; at: Time; who: Actor; what: unknown }   // kept once, unchanged
interface InboxItem {                      // a manager's. One per thread, not per event (14, 16)
  thread: ThreadId;
  from: "outside" | "worker" | "person" | "manager" | "date";
  state: "new" | "working" | "waiting_person" | "waiting_outside" | "done" | "left";
  why?: string;                            // required for left
  work: WorkId[];                          // none, one or several
}
// An event goes to every manager whose grant hears it. One nobody hears goes to the lead.
// Arriving together is one wake. A wake is a submit to the manager's conversation, once per item and change.
```

## Work

```ts
interface Work {                           // (15)
  id: WorkId; under: WorkId | MissionId; kind: KindId;        // "plain" adds nothing
  title: string; why: string; doneWhen: Check[];
  answers: PersonId | ManagerId;           // one
  doer: { worker: WorkerKindId } | { manager: ManagerId } | { person: PersonId; due: Date } | null;
  next: Next;                              // always set while open (16)
  evidence: Evidence[];                    // a pull request, a sent mail, a file, a page, a test run
  from: ThreadId[];                        // where the answer goes
}
type Next = { kind: "working"; session: SessionId } | { kind: "asked"; ask: AskId }
          | { kind: "outside"; thread: ThreadId; look: Date } | { kind: "look"; at: Date };
interface Check { says: string; met?: { by: SessionId | PersonId; evidence: EvidenceId } }   // not by whoever did it
interface Session { id: SessionId; work: WorkId; kind: WorkerKindId; role: string; grants: Grant[]; report?: Report }
```

A worker is given the work, its done-when, its thread and the mission. Its report is an inbox item, so it wakes its manager.

## People

```ts
interface Ask {                            // in a person's inbox (17)
  id: AskId; to: PersonId; need: "decide" | "approve" | "do" | "review" | "know";
  about: WorkId; shows: unknown;           // for approve: exactly what will be sent or done
  by?: Date; then: PersonId[];             // who next
  elseDo: "wait" | { option: string };     // an option only for decide. Never for approve
}
```

## What it knows

```ts
interface Note { says: string; from: PersonId; seenIn: ThreadId | WorkId; for: ManagerId; tell: "always" | "when_relevant" }  // goes down the tree
interface Rule { allow: ActionId; when: string; from: EvidenceId[]; acceptedBy: PersonId; backToAskAfter: 2 }                  // (18)
// Both are proposed by the manager and accepted by a person of the workspace. Nothing from outside can make one.
```

`when` in a rule must be something code can check (a thread, a person, a kind of work, a connector), or the rule is not offered: mine.

## On pi-durable

| Part | Piece |
|---|---|
| A manager, a worker | A conversation each, with its own agent and extensions |
| A connector | An extension: tools, prompt section, `beforeTool` check, namespace |
| Scope | The extension's `beforeTool` reads the conversation's grants; off actions are not offered |
| A worker's report wakes its manager | Background subagent with a reporter task (their example 22) |
| A date | A task asleep until then |
| An ask | A tool call parked on a signal. The manager carries on with other items meanwhile: each ask is its own task, so it does not hold the conversation |
| Many actions | `deferred` tools and `tool_search`, or code mode |

## Not decided

1. The first real job, and how the spike's code is replaced.
2. The screens.
3. Which person is "the lead's person".
