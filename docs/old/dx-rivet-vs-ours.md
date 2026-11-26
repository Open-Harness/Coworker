# DX comparison: Rivet's `@rivet-dev/pi`, Cloudflare's Pi harness and ours

> Written against the prototype. Section 3's proposal is replaced by [dx-refactor.md](dx-refactor.md), whose Part A is the one agent definition.

All three host the same engine, `@earendil-works/pi-durable`. They differ in what wraps it.

- **Versions.** We run pi-durable 1.5.2. Rivet's `@rivet-dev/pi` is at 0.5.7, and Cloudflare's `agents` package pins pi-durable `~1.6.0`.
- **Effect.** None of the three depends on Effect. Rivet's Effect binding (`rivetkit-typescript/packages/effect`) is optional and the pi package does not use it.
- **Where Rivet's code lives.** `packages/pi` is in **rivet-dev/agents**, not rivet-dev/rivet; that path returns 404 in rivet-dev/rivet. Rivet paths below are in rivet-dev/agents at `main`.
- **Cloudflare paths** are in cloudflare/agents at `main`.

**TL;DR: borrow Rivet's API shape, don't adopt Rivet.** Rivet's wins are things a caller sees: one definition per agent, a key per instance, a typed `prompt`/`submit`/`watch` handle and `onAnswer`. None of them needs Rivet's runtime. Rivet's runtime has no Cloudflare hosting path and would replace everything we already have that works. Cloudflare's `PiHarness` is a better fit for the part we hand-wrote, the engine and alarm plumbing. Revisit it when we move to pi-durable 1.6.

---

## 1. Smallest example: define an agent with a tool, then prompt it from a client

### Rivet

The server-side example is from rivet.dev/ecosystem/pi-durable ("Use pi-ai"). The example with actor context is at `examples/docs/pi/actor-tools.ts:24-54`.

```ts
const findPokemon = defineTool({
  name: "find_pokemon", description: "…",
  parameters: obj({ pokemon: str() }),
  replay: "safe",
  execute: async ({ pokemon }, _api, context) => ({ output: [{ type: "text", text: "…" }] }),
});
const extensions = createRegistry();
extensions.install(defineExtension({ name: "pokedex", tools: [findPokemon] }));

const agent = pi({ model: "anthropic/claude-opus-5-5", registry: extensions });  // ← the whole host
export const registry = setup({ use: { agent } });
registry.start();
```

The client is `examples/docs/pi/client.ts:1-12`:

```ts
const client = createClient<typeof registry>();
const agent = client.agent.getOrCreate(["user-123"]);          // one actor per key
const result = await agent.prompt("…", { requestId: crypto.randomUUID() });
console.log(result.status === "done" ? result.text : `Unanswered: ${result.reason}`);
```

### Cloudflare Agents SDK (`agents/harness/pi`)

The server is from `docs/agents/harnesses/pi.md:23-57` and `:77-109`:

```ts
export class Assistant extends DurableObject<Env> {
  ai = createAI({ binding: this.env.AI });
  registry = createRegistry();
  harness = new PiHarness({
    harness: ({ storage, context, onWake }) => {
      const models = createModels(); models.setProvider(this.ai.provider);
      return Harness.open(storage, { models, registry: this.registry, onWake }, context);
    },
    defaults: { model: this.ai("@cf/…"), thinkingLevel: "low" },
  });
  lifecycle = Lifecycle.install(this).use(this.harness);           // owns alarm / wake / recovery
  async ask(prompt: string) { return (await this.harness.prompt(prompt)).text; }
}
// tools: registry.install({ name: "writing", tools: [wordCount], sections: [...] })
```

The client side ships no protocol. You either call the DO directly over RPC (`env.Assistant.getByName(key).ask("hi")`) or use `useAgent({ agent: "pi-agent", name })` with the example's own WebSocket protocol (`examples/next/harnesses/pi/src/use-pi-session.ts:58-60`). Sessions come from `harness.sessions.create()`, and their `submit`/`wait` take an `operationId` that makes repeats idempotent.

### Ours today

The tool is plain pi-durable, the same as both of the others. From [src/modules/web/service.ts:7-22](../../src/modules/web/service.ts):

```ts
export const createWebFetchTool: CreateWebFetchTool = (dependencies) => ({
  name: "web_fetch", description: "…",
  parameters: obj({ url: str({ minLength: 1, maxLength: 4_096 }) }),
  replay: "safe",
  execute: async ({ url }: { url: string }) => { /* … */ },
});
```

The agent definition is spread over four places:

1. **Tool groups.** [src/modules/agent/service.ts:17-22](../../src/modules/agent/service.ts):
   ```ts
   const toolsByGroup = (config: AgentConfig): ToolsByGroup => ({
     documents: documentTools, web: [createWebFetchTool({ fetch: config.fetch })],
     schedule: [scheduleTool], history: [searchHistoryTool],
   });
   ```
2. **The chat extension.** It holds the preamble, clock and workspace instructions ([agent/service.ts:24-39](../../src/modules/agent/service.ts)).
3. **The harness options.** Registry, settings and the per-chat defaults set when a conversation is created ([agent/service.ts:41-62](../../src/modules/agent/service.ts)).
4. **The `ToolGroup` union.** Defined at [src/modules/agent-config/types.ts:8](../../src/modules/agent-config/types.ts), plus its schema in `agent-config/internal/schema.ts`.

The host is a Durable Object subclass, wired up in [src/main.ts:62-75](../../src/main.ts):

```ts
export class Workspace extends WorkspaceHost<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, { agent: agentFrom(env), directory: createDirectoryPort(env.DIRECTORY), report });
  }
}
```

`WorkspaceHost` ([src/modules/workspace/service.ts:28-201](../../src/modules/workspace/service.ts)) does the rest:

- It opens the engine ([internal/engine.ts:17-53](../../src/modules/workspace/internal/engine.ts)), which runs one alarm with a heartbeat ([internal/alarm.ts:7-30](../../src/modules/workspace/internal/alarm.ts)).
- It routes 14 socket commands ([internal/router.ts:72-113](../../src/modules/workspace/internal/router.ts)).

The client takes three steps, across two sockets ([src/modules/app/internal/session.ts:32-41](../../src/modules/app/internal/session.ts)):

```ts
const chatId = await directory.createChat(workspaceId, agentId);                       // directory socket, relayed
const ws = createWorkspaceClient({ workspaceId, connect, open: open(`/api/workspaces/${workspaceId}/socket`), onError });
ws.openChat(chatId);
await ws.submit(chatId, "…", "followUp");      // → Answer<void>; the reply arrives later in ws.state.chats[chatId]
```

`WorkspaceClient` ([src/modules/workspace-client/types.ts:31-54](../../src/modules/workspace-client/types.ts)) has 17 methods, all keyed by `chatId: number`. None of them returns an answer to await. The caller has to subscribe to `state` and work out when the run finished.

### What the comparison shows

| | Rivet | Cloudflare | Ours |
|---|---|---|---|
| Lines to a working agent with one tool | ~10 | ~25 | ~15 to add a tool, but spread over 4 files; a new *kind* of agent has no single place to go |
| How an instance is addressed | `getOrCreate([key])`, typed | DO name, plus a session id | DO name (workspace UUID), plus `chatId: number` |
| Client-side "prompt and wait for the answer" | `prompt()` returns `{status, text}` | `harness.prompt()` (server side), `session.wait()` | none: the client gets `submit` and then watches the store |
| Wire protocol | generated from the actions | bring your own | hand-written, versioned ([protocol/internal/commands.ts](../../src/modules/protocol/internal/commands.ts)) |

---

## 2. What each side has that the other lacks

### What Rivet's shape gives that ours lacks

- **One-call definition.** `pi({ model, registry, tools, hooks, actions, sandbox, onAnswer })` is the whole agent kind. Ours is the four places listed above plus a Durable Object subclass. For an orchestrator kind and a worker kind we would duplicate all of it, or bolt each one onto `createAgent`.
- **Per-key isolation as an API.** `client.agent.getOrCreate(["support", userId])` gets or creates the instance for a key. We isolate per workspace (one DO named by `workspaceId`), but inside a workspace a conversation is a bare `number`. There is no "get or create the worker for card 42".
- **A typed client generated from the server.** Rivet has `createClient<typeof registry>()`, `prompt` returning a `{status:"done", text} | {status:"unanswered", reason}` union, `submit` returning `{submissionId}`, and `connect().conversation.watch(id)` streaming `pi.view` frames. Our client is hand-kept in step with the protocol, and it has no awaitable answer.
- **`onAnswer`.** It is called with `(c, { conversationId, text, message })` and runs *inside* the run (`packages/pi/src/answers.ts:16-30`), so an answer finished after a crash still fires it. It can fire twice. This is exactly the hook a kanban needs to move a card when a worker finishes. We have nothing equivalent.
- **Sandbox adapters.** `@rivet-dev/sandbox-adapter` provides agentOS, E2B, Daytona, Freestyle and Docker, each behind one small interface: `create`, `connect` and optional `suspend`/`destroy`, returning a sandbox with `exec`, `readFile`, `writeFile` and so on. We have no shell or file system for agents at all.
- **Scoped tokens.** `agent.issueToken({ subject, expiresIn: 900 })` mints a JWT for one actor (`examples/docs/client-sdk/token.ts:14-21`), and the client refreshes it with `getToken`. Our identity module is explicitly *"attribution, not authentication"* ([src/modules/identity/README.md](../../src/modules/identity/README.md)). Anyone who reaches the Worker can open any workspace socket whose UUID they know ([src/modules/http/service.ts:15-21](../../src/modules/http/service.ts)). For a multi-tenant hosted platform, this is the **largest real gap**.
- **Cron and one-shot schedules on the actor.** Rivet has `c.cron.set(...)` and `c.schedule.after(...)`. We have a `schedule` tool the model calls, but no host-level schedule.

### What ours has that Rivet lacks

- **It runs on Cloudflare.** `@rivet-dev/pi` needs Node 22.19 or later and Node SDKs for its sandboxes. No docs page or test shows Pi on RivetKit's wasm or Workers runtime, and rivet.dev frames Cloudflare as something to migrate *off*. Adopting Rivet means leaving Durable Objects.
- **Provisioning.** A Durable Object that was never provisioned stays empty and refuses connections, so guessing an id creates nothing ([workspace/service.ts:24-27, 112-119](../../src/modules/workspace/service.ts)). The directory records the workspace first and provisions it second, with `reconcile` finishing a crash in between ([directory/internal/lifecycle.ts:21-34, 55-65](../../src/modules/directory/internal/lifecycle.ts)). By contrast, Rivet's `getOrCreate` creates an actor for *any* key. Its docs say "keys aren't secret".
- **A projection of every workspace into the directory.** Each workspace publishes its whole picture with a growing `sequence` ([workspace/types.ts:6-13](../../src/modules/workspace/types.ts)). The directory ignores any older one: `lt(workspaces.sequence, sequence)` at [directory/internal/store.ts:77-82](../../src/modules/directory/internal/store.ts). That is what makes the admin console and cross-workspace lists possible. Rivet has no cross-actor index.
- **Idempotent relays.** Chat create, update and delete are relayed through the directory, carrying the request id into `chats.create` ([workspace/internal/chat-commands.ts:33-38](../../src/modules/workspace/internal/chat-commands.ts)). A replayed prompt returns its first submission and is never re-checked against limits ([internal/run-commands.ts:60-65](../../src/modules/workspace/internal/run-commands.ts)). Rivet's `requestId` gives the same guarantee for `prompt`.
- **A budget.** A prompt is refused once the workspace's cost reaches its `budgetUsd` ([internal/run-commands.ts:38-42](../../src/modules/workspace/internal/run-commands.ts)). Rivet exposes `usage()` but enforces nothing.
- **Admin-defined, versioned and deployed agents as data.** These are `AgentConfig`, `AgentStamp` and `Deployment` ([agent-config/types.ts:9-35](../../src/modules/agent-config/types.ts)), applied to each chat with `configure()` ([agent/internal/assign.ts:7-21](../../src/modules/agent/internal/assign.ts)). Rivet agents exist only in code.
- **No wait cap.** Rivet's actions time out at 10 minutes (`actionTimeout`), so long jobs must use `submit` plus `watch`. We never hold a request open for a run. That is also why we have no `prompt()`; see the correctness note in section 3.

### Where Cloudflare's `PiHarness` sits

Cloudflare's harness is a **host primitive, not a DX layer**:

- `Lifecycle` owns wake, heartbeat and recovery.
- The harness has a `sessions` API: `create`, `fork`, `get`, `list`, plus `submit`/`wait` with `operationId`.
- It ships `skills(sources)` and a `@cloudflare/computer` `Workspace` with Codemode and Container backends. That makes it the Cloudflare-native answer to Rivet's sandbox adapters.

It has no auth, no client protocol and no MCP. It is marked experimental: it supports one Pi minor version at a time and can only roll forward. It would replace our hand-written [engine.ts](../../src/modules/workspace/internal/engine.ts) and [alarm.ts](../../src/modules/workspace/internal/alarm.ts), about 80 lines, and nothing above them.

---

## 3. Proposal: an `agent-kind` host helper and a typed `agent-client` (sketch only)

### The seam already exists

pi-durable lets each conversation carry its own agent: `configure(tx, id, AgentChange)` takes `extensions`, `tools`, `instructions`, `model` and `maxTurns` (pi-durable `dist/harness/types.d.ts:394-452`). We already use it for admin agents ([agent/internal/assign.ts:14-20](../../src/modules/agent/internal/assign.ts)).

So a **kind** is just an `Extension` plus a default `AgentChange` plus an answer hook, applied when a conversation is created. It needs **no new Durable Object class per kind**. The orchestrator and its workers stay conversations in one Harness inside one workspace DO, as the platform design says. Rivet's `getOrCreate([key])` maps onto a get-or-create *conversation* keyed by `(kind, key)` inside that DO. It does not map onto one actor per key.

### `src/modules/agent-kind/` — six slots

```
src/modules/agent-kind/
  README.md        owns: kind definitions → HarnessOptions; key → conversation; answer delivery
  types.ts         below
  service.ts       defineKind, createKindHost
  internal/        compile.ts (kind → Extension + AgentChange), keys.ts (KindKeysDoc), answers.ts
  agent-kind.test.ts
```

```ts
// src/modules/agent-kind/types.ts
import type {
  ConversationId, Extension, HarnessOptions, ToolRegistration, Tx,
} from "@earendil-works/pi-durable";
import type { ModelRef, ThinkingLevel } from "~/modules/protocol/types.ts";

/** A finished answer of one conversation of a kind. */
export interface KindAnswer {
  readonly conversationId: ConversationId;
  readonly key: string;
  readonly text: string;
}

/** Everything that makes one kind of durable agent. One value, like Rivet's `pi({...})`. */
export interface KindDefinition<Name extends string> {
  readonly name: Name;
  readonly instructions: string;
  readonly tools: readonly ToolRegistration[];
  /** Prompt sections rendered before `instructions`, e.g. the kanban board for the orchestrator. */
  readonly sections?: Extension["sections"];
  readonly tasks?: Extension["tasks"];
  readonly model?: ModelRef;
  readonly thinkingLevel?: ThinkingLevel;
  readonly maxTurns?: number;
  /**
   * Runs in the commit that records a final answer, so a crash cannot lose it. It may run twice for one answer:
   * write idempotently (e.g. "card 42 → done").
   */
  readonly onAnswer?: (tx: Tx, answer: KindAnswer) => Promise<void>;
}

/** A compiled kind. Opaque to callers; `createKindHost` is the only consumer. */
export interface AgentKind<Name extends string> {
  readonly name: Name;
  readonly definition: KindDefinition<Name>;
}

export type DefineKind = <const Name extends string>(definition: KindDefinition<Name>) => AgentKind<Name>;

export type Opened =
  | { readonly ok: true; readonly conversationId: ConversationId; readonly created: boolean }
  | { readonly ok: false; readonly reason: "unknown_kind" | "key_taken_by_other_kind" };

/** Every kind one workspace hosts. Built once in the composition root. */
export interface KindHost<Names extends string> {
  /** Goes to `Harness.open`. Its `conversationCreated` applies the kind's AgentChange. */
  readonly harnessOptions: HarnessOptions;
  /** Rivet's `getOrCreate([key])`, inside one Harness: the same (kind, key) always yields the same conversation. */
  open(tx: Tx, kind: Names, key: string, owner?: { readonly taskId: string }): Promise<Opened>;
  /** Which kind and key a conversation was opened as. `undefined` for plain chats. */
  kindOf(tx: Tx, conversationId: ConversationId): Promise<{ readonly kind: Names; readonly key: string } | undefined>;
}

export interface KindHostDependencies {
  /** The existing chat extension and models stay; kinds are added beside them. */
  readonly base: HarnessOptions;
  readonly report: (message: string, error: unknown, details?: Readonly<Record<string, unknown>>) => void;
}

export type CreateKindHost = <const Kinds extends readonly AgentKind<string>[]>(
  kinds: Kinds,
  dependencies: KindHostDependencies,
) => KindHost<Kinds[number]["name"]>;
```

Adding a kind is one definition:

```ts
// src/modules/kanban/service.ts (illustrative)
export const worker = defineKind({
  name: "worker",
  instructions: "You work one card of the board. Finish with a short report.",
  tools: [...documentTools, webFetch],
  maxTurns: 40,
  onAnswer: (tx, { key, text }) => cards.finish(tx, key, text),   // idempotent
});

export const orchestrator = defineKind({
  name: "orchestrator",
  instructions: "You run the board: split work into cards and assign each to a worker.",
  tools: [createCardTool, assignWorkerTool /* calls host.open(tx, "worker", cardId, { taskId }) */],
  sections: [boardSection],
});

// src/main.ts — the composition root, the only place that changes
const kinds = createKindHost([orchestrator, worker], { base: agent.harnessOptions, report });
```

### `src/modules/agent-client/` — the typed handle

`WorkspaceClient` becomes the transport underneath, and this module sits on top:

```ts
// src/modules/agent-client/types.ts
import type { Answer } from "~/modules/directory-client/types.ts";
import type { ChatView } from "~/modules/transcript/types.ts";

export type Prompted =
  | { readonly status: "done"; readonly text: string; readonly submissionId: number }
  | { readonly status: "unanswered"; readonly reason: "aborted" | "turn_limit" | "model_error" | "no_model"; readonly submissionId: number };

export interface SubmitOptions {
  /** The same id returns the first submission's result instead of submitting again. */
  readonly requestId?: string;
  readonly whenBusy?: "followUp" | "steer";
}

/** One conversation of one kind, the way Rivet's `getOrCreate([key])` handle reads. */
export interface AgentHandle {
  /** Submits, then resolves when that submission's run settles. Composed on the client from submit + watch. */
  prompt(content: string, options?: SubmitOptions): Promise<Answer<Prompted>>;
  submit(content: string, options?: SubmitOptions): Promise<Answer<{ readonly submissionId: number }>>;
  watch(onView: (view: ChatView) => void): () => void;
  stop(): Promise<Answer<void>>;
}

export interface AgentClient<Names extends string> {
  /** Gets or creates the conversation for (kind, key) in this workspace, through the directory relay. */
  get(kind: Names, key: string): AgentHandle;
}

export type CreateAgentClient = <Names extends string>(dependencies: {
  readonly workspace: import("~/modules/workspace-client/types.ts").WorkspaceClient;
  readonly directory: import("~/modules/directory-client/types.ts").DirectoryClient;
}) => AgentClient<Names>;
```

### Notes on getting this right

- **`prompt()` is composed on the client, not served as a server-side wait.** Sockets run one command at a time each, through `KeyedSerialQueue` ([workspace/service.ts:32, 159](../../src/modules/workspace/service.ts)). A server command that awaited a run would block that socket's other commands, and it would bring back Rivet's 10-minute cap. So `prompt` is `submit` followed by waiting on `chat.view`/`chat.ops` for that submission to settle.
- **Wire changes for `open(kind, key)`.** It travels as `chat.create { kind, key }` through the existing directory relay ([protocol/internal/commands.ts:13](../../src/modules/protocol/internal/commands.ts)). The key-to-id map is a workspace doc, with the same idempotency as `chats.create`'s `requestId`.
- **`onAnswer` mechanism.** In pi-durable 1.5.2 it needs a hook in the run's final commit. Rivet does this in `packages/pi/src/answers.ts`. pi-durable 1.6 adds signals and parked tools (`SubmissionSettled`), which also give the orchestrator a durable "wait for worker" without polling. **Do the 1.6 upgrade first.**
- **Scoped tokens are a separate module** (`access`). Copy Rivet's model: a backend mints a short-lived token for one workspace, and `http` checks it before it forwards to the DO. It does not belong in `agent-kind`.

---

## 4. Recommendation

**What is at stake.** Adding the orchestrator and worker kinds today means editing `createAgent`, the tool-group union, its schema and the protocol, once per kind. The kanban also has no durable place to learn that a worker finished. If nobody decides, each new kind repeats that surgery, and card state ends up inferred from transcripts.

| Option | What it means |
|---|---|
| **A · Adopt Rivet** | Run agents as Rivet Actors and drop the workspace and directory DOs. |
| **B · Borrow Rivet's shape** (recommended) | Build `agent-kind` and `agent-client` as sketched in section 3 on our own DO host. |
| **C · Adopt Cloudflare `PiHarness` as the engine** | Replace `engine.ts` and `alarm.ts` with `Lifecycle` + `PiHarness` and keep everything above them. It complements B rather than competing with it. |
| **D · Neither** | Keep adding kinds by hand inside `createAgent`. |

| Axis | A · Adopt Rivet | B · Borrow shape | C · CF PiHarness engine | D · Neither |
|---|---|---|---|---|
| Floor-first | ❌ A rewrite before the first kind ships | ✅ Orchestrator and worker ship on the current host | ⚠️ Ships nothing a user sees; plumbing only | ⚠️ Ships now, and every kind costs more after |
| Reversibility | ❌ Leaves Durable Objects; data lives in Rivet's storage | ✅ New modules; delete them and `createAgent` still works | ⚠️ Roll-forward only (Pi minors); `agents` pins one Pi minor | ✅ Nothing to reverse |
| Blast radius | ❌ The workspace, directory, http, protocol and both clients | ✅ Two new modules, plus `main.ts` and one relay field | ✅ Two internal files of `workspace` | ✅ None now, growing with each kind |
| Correctness | ❌ Loses provisioning, sequenced projection and budget; keys aren't secret; 10-minute waits | ✅ Keeps every invariant in workspace/README; `prompt` composed client-side avoids the wait cap | ✅ Cloudflare-maintained wake and recovery; ⚠️ experimental | ⚠️ No durable answer hook for the kanban |
| Fit with ~/AGENTS.md and the codebase | ❌ Actor context `c` is ambient, and errors are thrown `UserError`s | ✅ Six slots, `types.ts` is the module, errors as values, one composition root | ✅ Hides behind `engine.ts` | ⚠️ `createAgent` keeps growing past one concern |
| Parallelizability | ❌ | ✅ `agent-kind`, `agent-client` and `access` are independent | ✅ Independent of B | — |

**Decision (agreed 2026-11-23): B, after the pi-durable 1.6 upgrade; C judged then.**

**Recommendation: B now, then C when we take pi-durable 1.6.** B scores best on floor-first, blast radius and fit, and it gives us the parts of Rivet worth having. Those are the one-call kind definition, keyed get-or-create, the awaitable `prompt`/`submit`/`watch` handle and `onAnswer`. We keep the Cloudflare hosting and the provisioning, projection and budget invariants that Rivet lacks.

Do the pi-durable 1.6 upgrade before B's `onAnswer` and orchestrator wait, because 1.6 adds signals and parked tools. Then judge C as a swap of `engine.ts`. Take scoped tokens (`access`) from Rivet's design as a separate, early module: it is the one gap that blocks multi-tenancy no matter which option we pick.

### Not verified

- **Rivet:**
  - MCP support.
  - Per-action JWT permissions.
  - Whether Pi runs on RivetKit's wasm or Workers runtime.
  - Whether the inline `tools:` form of `pi()` is stable API.
- **Cloudflare:** MCP support, and an auth pattern for `PiHarness`.
- **Ours:** the line counts above were measured. The proposed modules are not implemented.
