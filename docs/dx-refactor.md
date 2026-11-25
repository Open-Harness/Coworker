# DX refactor: one definition per agent, in Rivet's shape

Written at `9109d69`, rewritten at `f3971c4`, 2026-11-24. It replaces section 3 of
[dx-rivet-vs-ours.md](dx-rivet-vs-ours.md), which compared Rivet with the prototype, before `manager`, `actions` and
`settings` existed. Rivet was read again at `@rivet-dev/pi` 0.5.7 (`rivet-dev/agents`, `main`).

**Part A is the point: defining and configuring an agent.** It got worse since the first comparison: the prototype spread
it over four places, and today it is three agents, a saved agent typed again in every layer, and the same four thinking
levels written in seven files. Part B is what else the trace found; it supports A and can wait.

# Part A: one definition per agent

## A1. The problem, in code

In Rivet an agent is one value in one file, and the list of agents is one line
(`examples/docs/multi-agent-system/`):

```ts
// orchestrator.ts: tools, role, model and what happens with the answer, together
extensions.install(defineExtension({ name: "orchestrator", tools: [askSpecialist], sections: [section("role", () => "You run research jobs. …")] }));
export const orchestrator = pi({ model: "anthropic/claude-opus-5-5", registry: extensions, onAnswer: async (c, answer) => { /* hand to the reviewer */ } });

// server.ts
export const registry = setup({ use: { orchestrator, researcher, reviewer } });
```

Ours, the same four things for the worker:

| What it is | Where |
|---|---|
| Its tools | [runs.ts](../src/modules/manager/internal/runs.ts): **two** extensions both named `run`, one with one tool to configure by name, one with four to install |
| Which tools it gets | [launch.ts:56](../src/modules/manager/internal/launch.ts) `toolsLeftOut`: says what to **remove**, by string, through fake tools made by `named()` |
| Its instructions, thinking, model | `conversationFor` in `runs.ts`, `instructionsOf` in `launch.ts`, `modelFor` in `brain`, named again after a restart in [engine.ts](../src/modules/manager/internal/engine.ts) |
| What happens with its answer | nowhere |

The manager is split the same way: `PREAMBLE`, `managerExtension`, `offTools` and a `conversationCreated` hook in
`engine.ts`, `actionTools` in `tools.ts`, `agentsSection` in its own file. The prototype's chat is a third agent with a
third way of doing it (`agent/service.ts`).

**A saved agent is declared again in every layer.** `thinking`, one field, today:

```text
settings/views.ts:87            readonly thinking: "off" | "low" | "medium" | "high";
settings/internal/agents.ts:14  const THINKING: readonly string[] = ["off", "low", "medium", "high"];
settings/internal/launch.ts     thinking: config.thinking,
manager/agents.ts:24            readonly thinking: "off" | "low" | "medium" | "high";
manager/internal/runs.ts        thinkingLevel: agent.thinking
http/internal/settings-work.ts:34  if (thinking !== "off" && thinking !== "low" && …) return undefined;
team-build/types.ts:128         export type Thinking = "off" | "low" | "medium" | "high";
team-build/internal/decode-work.ts:7  const THINKING: readonly Thinking[] = ["off", "low", "medium", "high"];
team-build/internal/api.ts      (rebuilds the object)
team-build/internal/AgentForm.tsx:20  const LEVELS: readonly Thinking[] = ["off", "low", "medium", "high"];
```

The tools are worse, because the copies disagree. `settings` accepts four
([agents.ts:13](../src/modules/settings/internal/agents.ts)), `manager` knows two, and the form hides the other two by a
list of its own (`NOT_YET`, [AgentForm.tsx:24](../src/modules/team-build/internal/AgentForm.tsx)). The API still saves
them, and a run in such an agent has only `report`.

## A2. The shape

Two modules. `agents` is what a saved agent **is**: pages and server both import it. `agent-engine` is what a **kind**
of agent is: server only.

```ts
// modules/agents/types.ts: the one declaration
export const THINKING = ["off", "low", "medium", "high"] as const;
export const TOOLS = {
  bash: { label: "Run commands", built: true },
  read: { label: "Read files", built: true },
  edit: { label: "Edit files", built: false },           // accepted and saved as today; no run has it
  web_fetch: { label: "Read web pages", built: false },
} as const;

export const agentConfig = obj({
  name: str({ minLength: 1, maxLength: 60, pattern: "\\S" }),
  instructions: str({ maxLength: 20_000 }),
  model: nullable(obj({ connectionId: str(), model: str() })),
  thinking: oneOf(THINKING),
  tools: arr(oneOf(Object.keys(TOOLS) as ToolId[])),
  skills: arr(str()),
  environment: nullable(str()),                           // where its commands run, by id (A9); null: the plain container
  output: nullable(arr(outputField)),                     // what it hands back, field by field (A7); null: words only
});
export type AgentConfig = Static<typeof agentConfig>;

/** A saved agent as a run takes it: the config whole, and what only the workspace knows. */
export interface RunAgent { version: number; config: AgentConfig; skills: readonly RunSkill[] }
```

`configOf`, `problemWith`'s shape checks, `agentOf`, `decodeAgent`, `Thinking`, `LEVELS`, `NOT_YET` and the
field-by-field copy in `agentToStart` all come out of this. What needs the workspace stays in `settings`: that a skill
exists, and that the model's connection does.

```ts
// modules/agent-engine/types.ts: a kind of agent, as Rivet's pi({...})
export interface AgentKind<Deps, Out extends object = never> {
  readonly name: string;
  readonly instructions?: string;
  readonly sections?: (deps: Deps) => readonly PromptSection[];
  readonly tools: (deps: Deps) => readonly ToolRegistration[];                              // always there
  readonly chosen?: (deps: Deps) => { readonly [K in BuiltTool]: ToolRegistration };        // a saved agent's switches
  readonly skills?: (deps: Deps) => ToolRegistration;                                       // when it has skills
  readonly leaveOut?: (tx: Tx, tools: readonly ToolRegistration[]) => Promise<readonly string[]>;
  readonly output?: Output<Out, Deps>;                                                      // what it hands back (A7)
  readonly onSettled?: (tx: Tx, conversation: ConversationId, end: Settled<Out>, deps: Deps) => Promise<Tell | undefined>;
}
export const mount: <Deps, Out>(kind: AgentKind<Deps, Out>, deps: Deps, models: Models) =>
  { extension; configure(tx, conversation, agent); prompt(tx, conversation, { content, requestId }) };
```

Then the two agents are one file each:

```ts
// modules/manager/internal/worker.ts: all of it
export const worker: AgentKind<ToolEffects, WorkerReport> = {
  name: "run",
  tools: () => [],
  chosen: (effects) => ({ bash: commandTool(effects), read: readFileTool(effects.files) }),
  skills: readSkillTool,
  output: { tool: "report", schema: report, accept: /* set the run on the board */, … },
  onSettled: async (tx, conversation, end) => { /* end a run that never reported; tell the manager */ },
};

// modules/manager/internal/manager.ts: all of it
export const manager: AgentKind<ManagerDeps> = {
  name: "manager",
  instructions: PREAMBLE,
  sections: ({ effects }) => [agentsSection(effects)],
  tools: ({ brain, effects }) => actionTools(brain, effects),
  leaveOut: async (tx, tools) => (await offTools(tx, tools)).map(({ name }) => name),
};

// modules/manager/internal/engine.ts: the list, as Rivet's setup({ use })
const use = { manager: mount(manager, { brain, effects }, models), worker: mount(worker, effects, models) };
for (const { extension } of Object.values(use)) registry.install(extension);
await use.worker.configure(tx, conversation.id, agent);   // the only way a conversation is configured
```

## A3. What each change costs

| You want to… | Today | After |
|---|---|---|
| add a setting to a saved agent | 10 files. Missing the copy into a run, the configure call, the decoder or the form is not an error | `agents/types.ts`, `agent-engine/service.ts`, `agent-fields.ts`. Missing either of the last two **does not compile** |
| add a tool an agent may have | `settings/internal/agents.ts`, `runs.ts`, `launch.ts`, `AgentForm.tsx` | `agents/types.ts`, `worker.ts`. Missing the second **does not compile** |
| add a kind of agent | extension, hook, configure and registration by hand, in `engine.ts` and `runs.ts` | one file, one word in `use` |
| see what the worker is made of | `runs.ts`, `launch.ts`, `engine.ts`, `settings/internal/agents.ts` | `worker.ts` |
| act when an agent finishes | not possible | `onSettled`, with a typed result |
| have an agent hand back data in a shape | not possible: a report is a word and a note | set its `output` |

## A4. Where ours should differ from Rivet

| Rivet | Ours |
|---|---|
| An agent's settings are code | Saved agents stay **data**, versioned, over the `worker` kind |
| `onAnswer` may fire twice, and not for a failed run | `onSettled` on pi-durable's `SubmissionSettled`: in the settling commit, for answered, failed and stopped runs (the task is Move 2) |
| No structured output: `onAnswer` gets text, and their reviewer is told to "end with APPROVE or REVISE" | `output` on a kind and on a saved agent (A7) |
| One actor per agent | Manager and workers share one harness per manager, so a run and its task change in one commit |
| `getOrCreate([key])` | Nothing is made by guessing a key; objects answer `NotProvisioned` |

## A5. What it keeps

- **Behaviour.** For every mix of tools, skills and instructions, and for the plain worker, `mount` was run beside
  today's `toolsLeftOut` and `instructionsOf` on a real harness: 68 compared, 0 different. Built, it was compared again with the code
  it replaced, for both agents: model, thinking, instructions, extensions and tools in order, 411 compared, 0 different.
- **Stored data.** A run stores `saved`, `model` and the conversation's own configuration, none of which change. An
  agent's stored JSON is `AgentConfig` but for `output` and `environment`. A row without them reads `output` as null and
  takes its environment from `agent_environment` by name, once.
- **The tests.** `settings-agents.test.ts` saves `edit` and expects all four tools listed; both still hold.

## A6. Order

**Steps 1, 2, 3 and 6 are built** (`src/modules/agents`, `src/modules/agent-engine`, 2026-11-24), with bugs 8, 9 and 10 fixed.
"Today" in this document is before them, and so are its line numbers. Differences from the sketch:

- The controls are components, `FIELDS` in `team-build/internal/AgentFields.tsx`, not a table of labels: each is typed by its
  own setting, so one that gives back the wrong value does not compile either.
- Each setting carries the words for a refusal (`description`), so the API says what is wrong: "thinking must be one of off, low,
  medium, high".
- `RunAgent` is the config plus the version, flat, and lives in `agents`.
- The kinds are `manager/internal/worker.ts` and `manager-agent.ts`, and the list is `agentsFor` in `engine.ts`. `AgentKind` has no
  `output` or `onSettled` yet: steps 4 and 5 add them with what they do.
- What starts a run is given the mounted `worker`, where it was given the brain, so nothing else can configure a conversation.
- A new manager's stored configuration now names its extension, which it took from the harness's default before.
- The environment is sent in `config`; beside it, as before, is a 400. Stored versions get theirs by a migration.

| Step | Ships | Touches | Clashes with |
|---|---|---|---|
| 1 | `agents`: the one config, server side | `settings/views`, `settings/internal/{agents,launch}`, `manager/agents`, `manager/internal/launch`, `http/internal/settings-work` | `step/ui-access-phone` (`settings-work`) |
| 2 | the form and decoder on it | `team-build/{types,decode-work,api,AgentForm}` | `step/ui-events-sources` (`types`, `api`), `step/ui-chat-run` (`types`) |
| 3 | `agent-engine`, `manager.ts`, `worker.ts` | `manager/internal/{engine,runs,launch}` | `step/ui-chat-run` (`runs`) |
| 4 | `onSettled` (Move 2) | `manager/internal/{runs,call,person}` | `step/ui-chat-run` |
| 5 | `output` on a saved agent (A7) | `agents`, `agent-engine`, `AgentForm` | – |
| 6 | the environment in the config (A9) | `settings/internal/agents`, `sandboxes`, `http/internal/sandboxes`, `EnvironmentDialog` | `step/ui-access-phone` (`http/sandboxes`) |
| 7 | the manager's own agent on its settings page (A10) | `manager`, `team-build` | `step/ui-chat-run`, `step/ui-events-sources` |
| 8 | the prototype's chat leaves (Move 4) | `agent`, `agent-config` | – |

Step 6 is why `saveAgent` re-assigns the environment on a rename and `agentView` searches every environment's `usedBy`.

## A7. Structured output

Nothing in the stack has it: Rivet's `onAnswer` gets text, and pi-durable's `structuredOutput` is for a tool called by
another tool, not for an agent's answer. Ours today is one hard-coded shape, `{ report, note }`, inside `reportTool`.

The engine builds it from pieces pi-durable has. `output` on a kind is a schema in code; `output` on a saved agent is a
list of fields a person sets, which the engine turns into a JSON Schema and the model fills in as `data`.

```ts
export const outputField = obj({
  key: str({ pattern: "^[a-z][a-z0-9_]{0,39}$" }),
  type: oneOf(["text", "number", "yes or no", "choice", "list"]),
  options: opt(arr(str())),                             // of a choice
  required: bool(),
});

export interface Output<Out extends object, Deps> {
  readonly tool: string;                                // the tool the engine makes
  readonly description: string;
  readonly schema: Schema<Out>;                         // the engine checks it before the value is seen
  readonly data: (value: Out) => unknown;               // where a saved agent's own shape goes
  readonly needsData: (value: Out) => boolean;          // "ready" must carry it; "failed" need not
  readonly mayStop: (value: Out) => boolean;            // "progress" is no reason to stop
  readonly missing: string;                             // said once, by an onYield hook, to one that stops without it
  readonly accept?: (tx, conversation, value: Out, now, deps: Deps) => Promise<void>;
}
export type Settled<Out> =
  | { _tag: "Finished"; output: Out }
  | { _tag: "Silent"; last: Out | undefined }           // it stopped and never handed it back
  | { _tag: "Unanswered"; reason: string; last: Out | undefined };   // it failed or was stopped
```

Run on pi-durable's harness with a scripted model, for an agent with the fields `price` (number) and `sources` (list):

| The model | What `onSettled` got |
|---|---|
| reports ready with the right shape | `Finished`, with the data |
| gives `{ price: "nine" }`, is told what is wrong, then gets it right | `Finished`, with the corrected data |
| reports ready with no data, is told, then gives it | `Finished`, with the data |
| stops without reporting, is asked once, then reports | `Finished`, with the data |
| stops twice without reporting | `Silent` |
| fails | `Unanswered`, `model_error` |
| has no shape to fill | `Finished`, as today |

**The limit:** a saved agent's shape is told to the model and checked when it answers. It does not constrain how a
provider samples, because a tool's schema is fixed for all runs in a registry. Wrong shapes cost a retry.

## A8. Before and after

**Before.** A worker, as it is in `src` at `f3971c4` (shortened, no line changed):

```ts
// runs.ts: two extensions with one name
export const runExtension = defineExtension({ name: "run", tools: [reportTool] });
export const runExtensionWith = (effects: ToolEffects) =>
  defineExtension({ name: "run", tools: [reportTool, readFileTool(effects.files), commandTool(effects), readSkillTool(effects)] });

// runs.ts: a fake tool, to take a real one out by name
const named = (name: string): ToolRegistration => ({
  name, description: name, parameters: obj({}), replay: "safe", execute: async () => ({ output: [] }),
});

// runs.ts: the agent's settings
function conversationFor(brain: Brain, launch: Launch | undefined) {
  const agent = launch?.kind === "agent" ? launch.agent : undefined;
  const instructions = agent === undefined ? "" : instructionsOf(agent);
  return {
    model: { ...(brain.modelFor?.(agent?.model ?? null) ?? brain.model) },
    extensions: [runExtension],
    tools: { remove: toolsLeftOut(agent).map(named) },
    ...(agent === undefined ? {} : { thinkingLevel: agent.thinking }),
    ...(instructions === "" ? {} : { instructions }),
  };
}

// launch.ts: which tools, the wrong way round
export function toolsLeftOut(agent: RunAgent | undefined): readonly string[] {
  if (agent === undefined) return ["read_skill"];
  return [
    ...(agent.tools.includes("bash") ? [] : ["run_command"]),
    ...(agent.tools.includes("read") ? [] : ["read_file"]),
    ...(agent.skills.length === 0 ? ["read_skill"] : []),
  ];
}

// engine.ts: the registration
registry.install(runExtensionWith(effects));
```

**After.** The same worker, whole, with what it hands back and what happens when it ends:

```ts
// worker.ts
const report = obj({
  report: oneOf(["progress", "waiting", "ready", "blocked", "failed", "dropped"]),
  note: opt(str({ maxLength: 2_000 })),
  data: opt(unknown()),
});

export const worker: AgentKind<ToolEffects, Static<typeof report>> = {
  name: "run",
  tools: () => [],
  chosen: (effects) => ({ bash: commandTool(effects), read: readFileTool(effects.files) }),
  skills: readSkillTool,
  output: {
    tool: "report",
    description: "Tell the board how your work is going: …",
    schema: report,
    data: ({ data }) => data,
    needsData: (value) => value.report === "ready",
    mayStop: (value) => value.report !== "progress",
    missing: "Say how your work ended with report before you stop.",
    accept: async (tx, conversation, value, now) => { /* set run.report, note and state on the board, as today */ },
  },
  onSettled: async (tx, conversation, end) => {
    const run = runOf(await tx.doc(BoardDoc), conversation);
    if (run === undefined) return undefined;
    if (end._tag !== "Finished") Object.assign(run, { state: "ended", report: "failed", note: whyOf(end) });
    return { to: ROOT_CONVERSATION_ID, words: wordsOf(run, end) };       // the manager is told
  },
};

// engine.ts
const use = { manager: mount(manager, { brain, effects }, models), worker: mount(worker, effects, models) };
```

`runExtension`, `runExtensionWith`, `named`, `conversationFor`, `toolsLeftOut`, `instructionsOf`, `reportTool` and
`managerExtension` go. `agent-engine` is about 160 lines that every later kind uses.

## A9. Where a sandbox is configured

Rivet: `pi({ sandbox: … })`, one line of code beside the model. Ours, today:

| What | Where | Front end? |
|---|---|---|
| Which provider runs containers | `sandboxHostFrom`, [world.ts:81](../src/world.ts): Cloudflare with the `BOXES` binding, else none | no |
| The image, how many at once | `wrangler.jsonc` (`node:24.11.1-bookworm`, 10) | no |
| What a size runs on, time limits, internet (always on) | [cloudflare.ts](../src/modules/sandboxes/internal/cloudflare.ts), [box.ts](../src/modules/sandboxes/internal/box.ts) | no |
| An environment: name, setup script, size | `environment` in the Workspace object | Environments page |
| Secrets | the vault; a setup line `export NAME=vault:<secret>` | Keys page, and by hand in the setup text |
| Which environment an agent uses | `agent_environment`, **by the agent's name** | the agent's form **and** the Environments dialog |
| Whether it may run commands | `tools` has `bash` | the agent's form |
| The environment a run took | `RunRecord.saved.environment`, by id | – |

The provider, image and limits are the deployment's and stay there. The rest is the agent's, and it goes wrong where it is
kept by name. Reproduced, then fixed, with `src/flows/agent-environment.test.ts`:

| # | What happens | Why |
|---|---|---|
| 8 | The form offers **"None: the plain container"**, and the Environments page says agents "will run in the plain container". A run with it failed: *"The agent Docs writer has no environment to run commands in"* | `exec` answers `NoEnvironment` for null ([service.ts:111](../src/modules/sandboxes/service.ts)); no plain container exists |
| 9 | Choosing "Docs writer" in the Environments dialog answers **404** | The route allows a space, but the browser sends `%20` ([http/sandboxes.ts:13](../src/modules/http/internal/sandboxes.ts)) |
| 10 | An agent that does not exist (`Nobody`) is assigned, 200, and shown under "used by" | `assign` takes any name |

Also: the three sizes are typed in `sandboxes/types.ts`, `cloudflare.ts` and `EnvironmentDialog.tsx`, and their default in four places.

**After**, the environment is one more field of `agentConfig`, so the form, the checks, versions and the run all have it:

```ts
environment: nullable(str()),        // agents/types.ts
```
```ts
chosen: (effects) => ({ bash: commandTool(effects), … })   // worker.ts: this kind has a sandbox, through `bash`
```
```ts
// sandboxes: null means what the form says
const PLAIN: Environment = { id: "plain", name: "the plain container", setup: "", size: "2 vCPU · 4 GB", version: 1, updatedAt: 0 };
const environment = request.environment === null ? PLAIN : environmentById(sql, request.environment);
```

- "Used by" is read from the agents, so a rename, a space or a name nobody has cannot break it (8, 9 and 10).
- Changing the environment makes a new version of the agent. It does not today.
- The plain `Worker` is not a saved agent, and `flw:sandbox/run` sets its environment by name: that one route stays, for it.
- Three tests said null is `NoEnvironment` (`environment-choice.test.ts`, `sandboxes.test.ts`) and changed with 8. An environment
  deleted while a run is in it still is: a run does not move halfway.
- An unassigned plain `Worker` runs in the plain container too. It could run no commands before.

## A10. What the front end can set

| | Today | After Part A |
|---|---|---|
| **Saved agent**: name, instructions, model, thinking, skills, versions | yes, `AgentForm` | yes |
| its tools | `bash` and `read` | every tool marked `built` |
| its environment | yes, by name, with 8 to 10 | yes, a field like the others |
| what it hands back | no | yes, a list of fields |
| **Environment**: name, setup, size, a test start | yes | yes |
| its secrets | by writing `export NAME=vault:…` | the same |
| **Manager**: name, purpose, lanes, fields, sources, who may ask, permissions | yes | yes |
| its instructions, model, thinking | **no**: `PREAMBLE` in code, the workspace's default model, thinking off | yes, in step 7: [model.md](model.md) already says a manager has an `agent: AgentRef` |
| **A kind of agent**, the tools themselves, the provider, the image | no | no: code and the deployment |

The form has one control per setting, and a setting with none does not compile:

```ts
// team-build/internal/agent-fields.ts
export const AGENT_FIELDS: { readonly [K in keyof AgentConfig]: Control } = {
  name: { kind: "line", label: "Name" },
  instructions: { kind: "area", label: "Instructions" },
  model: { kind: "model", label: "Model" },
  thinking: { kind: "one", label: "Thinking", options: THINKING.map(named) },
  tools: { kind: "many", label: "Tools", options: builtTools },
  skills: { kind: "skills", label: "Skills" },
  environment: { kind: "environment", label: "Environment" },
  output: { kind: "output", label: "What it hands back" },   // the same idea as the board's FieldEditor
};
```

So adding a setting is three files, and the compiler names the two you have not written.

# Part B: what else the trace found

## B1. What is wrong today

All of these were reproduced by running the code (a temporary flow test, since deleted), except where marked *read*.

| # | What happens | Why |
|---|---|---|
| 1 | Moving `DT-999`, which does not exist, answers HTTP 200 and the audit log says **"Ama moved DT-999 to done", outcome `done`**. The page shows success | Two result types: `CallResult` and `Handled`. A refusal is `Done` holding `{ok: false}` ([actions/service.ts:44-46](../src/modules/actions/service.ts)), and the page's `decodePressed` reads only the tag ([decode-task.ts:76](../src/modules/team-build/internal/decode-task.ts)) |
| 2 | Of the 70 tools a new manager is offered, **41 do nothing**. 23 of them ask a person first, then fail with "is not available yet" after the person says yes | The catalogue (76 rows) and the handlers (29) are separate lists; nothing compares them |
| 3 | A run finishes and **the manager is never told**. Its chat is empty afterwards | Only `chat` and `hear` submit to the manager's conversation ([service.ts:171](../src/modules/manager/service.ts), [heard.ts:47](../src/modules/manager/internal/heard.ts)) |
| 4 | A run whose model stops without calling `report` stays `running` for ever (*read*) | `run.state` is written in two places only, at the start and by `report` ([runs.ts:47, 163](../src/modules/manager/internal/runs.ts)). No hook or signal sees a run end |
| 5 | An open question on `DT-1` does not show "Needs your answer" on the board; it said "Needs your review" | `TaskRecord.questions` is set to 0 and never again. The open questions are in `QuestionsDoc`, which `boardView` does not read ([views.ts:63, 82](../src/modules/manager/internal/views.ts)) |
| 6 | An agent saved through the API with `web_fetch` and `edit` runs with **only `report`** (the form hides both). Part A | `TOOLS` is in `settings` ([agents.ts:13](../src/modules/settings/internal/agents.ts)), the mapping is in `manager` ([launch.ts:56](../src/modules/manager/internal/launch.ts)) and knows two of the four |
| 7 | A person can make a task with a 5,000-character title; the manager is held to 200 | `PARAMETERS` is checked for the model's calls only ([tools.ts:88](../src/modules/manager/internal/tools.ts)). A person's input goes to the handler as sent |

### What one action and one read cost today

**One action** (`task.move`) is:

| Where | What it holds | Typed? |
|---|---|---|
| [catalogue.ts](../src/modules/actions/internal/catalogue.ts) | label, screen, sentence | a tuple of strings |
| [parameters.ts](../src/modules/manager/internal/parameters.ts) | the input schema | `Record<string, object>`: the type is thrown away |
| [handlers.ts](../src/modules/manager/internal/handlers.ts) | the code, taking `Record<string, unknown>` | 80 hand parses across four handler files |
| [call.ts](../src/modules/manager/internal/call.ts), [tools.ts](../src/modules/manager/internal/tools.ts), [person.ts](../src/modules/manager/internal/person.ts) | special cases by id for `run.start`, `question.ask`, `self.permissions` | 8 string comparisons |
| [actions.md](actions.md) | the book | compared by a test |

Calls also have **two mutation paths**: `decide` for the manager and `actAsPerson` for a person. Each builds its own
`createActions`, notes history, queues audit lines and starts runs (`startRunFrom` and `beginRun` are the same code).

**One read** (`GET …/tasks/DT-1`) is: `ManagerApi.task`, a route regex, a status mapping, a path in `api.ts`, a type
again in `team-build/types.ts`, and a decoder. There are **983 lines of decoders** in nine files. The layer rule in
`check-shape.ts` is why: pages may not import `manager`, and no module both sides may import holds the shape.

## B2. The other moves

### Move 1: an action is one typed contract (`actions`)

Contract and code stay apart, because pages must not import the server. The contract holds the schema, so both sides
get their types from it. `actions` is already importable from both sides. Typechecked against pi-schema 1.6.

```ts
// modules/actions/internal/contract.ts: replaces ROWS, PARAMETERS and BOARD_PARAMETERS
export const ACTIONS = {
  "task.move": action({
    by: "manager", category: "tasks", label: "Move to another lane", screen: "Board, Task",
    sentence: "{by} moved {task} to {lane}",
    input: obj({ task: str(), lane: str() }),
  }),
  "task.archive": action({ by: "planned", /* … */ }),        // in the book, not built
  "manager.create": action({ by: "workspace", /* … */ }),    // a permission only: no manager handler
} as const;

export type InputOf<K extends ActionId> = Static<(typeof ACTIONS)[K]["input"]>;
```

```ts
// modules/manager/internal/handlers: one per action, input already valid and typed
export interface Handler<I, P = undefined> {
  /** Outside the commit: may ask the workspace. `run.start` finds its agent here. */
  readonly before?: (hands: Hands, input: I) => Promise<P>;
  /** Inside the commit. */
  readonly run: (hands: Hands & { tx: Tx }, input: I, prepared: P) => Promise<Outcome>;
  /** After it landed; may run twice. */
  readonly after?: (hands: Hands, value: unknown) => Promise<void>;
}
/** An action `by: "manager"` with no handler does not compile. */
export type ManagerHandlers = { readonly [K in CarriedOutBy<"manager">]: Handler<InputOf<K>> };
```

```ts
// a page
press("task.move", { task: "DT-1", lane: "done" });
press("task.move", { task: "DT-1", lnae: "done" });   // does not compile
```

- **One result.** A handler returns `Done | Refused | Failed`, `Handled` goes, and `actions.call` takes the audit
  outcome from what it returned. HTTP already maps `Failed` to 409. Fixes bug 1.
- **One door.** `perform(tx, {by, id, input, prepared, approved})` replaces `decide` and `actAsPerson`. It validates
  for both callers. Fixes bug 7.
- **Phases instead of ids.** `before`/`run`/`after` remove the 8 comparisons. `question.ask` parks in a fourth, tool-only
  phase (`waitsFor`), because a person's button cannot park.
- The catalogue says what is built. `planned` ones are not offered (B5).

### Move 2: a run is a durable task, behind `onSettled` (`manager/internal/runs`)

This is Rivet's `onAnswer`, done better. Their hook runs in `onYield`, may fire twice and never fires for a failed
run. pi-durable 1.6's `SubmissionSettled` is delivered in the settling commit, for answered, failed and aborted runs
alike. Typechecked against 1.6:

```ts
export const RunTask = defineTask<RunInput, Phase, null>({
  name: "dt.run", version: 1, initial: () => ({ phase: "start" }),
  phases: {
    start: async (task, runtime, context) => {
      const { run, conversationId, brief } = task.input;
      const conversation = await runtime.conversation(conversationId, context);
      await conversation?.submit(
        { type: "input", content: brief, requestId: `start:${run}`, notify: { taskId: runtime.taskId, key: run } }, context);
      await runtime.commit(() => ({ status: "sleeping", signals: [SubmissionSettled.key(run)], checkpoint: { phase: "settled" } }), context);
    },
    settled: /* read the signal; a run that said nothing becomes ended + failed "Stopped without reporting" */,
    tell: /* submit "run-1 on DT-1 is ready: …" to the manager, requestId `settled:run-1`, followUp */,
  },
});
```

- `run.start` creates it in its own commit, so `startRunFrom` and `beginRun` go: there is no window in which a run
  exists but nobody briefed it. Fixes bugs 3 and 4.
- Runs started before this have no task. On open, each `running` one gets one; `start:<run>` makes the brief a repeat.
- `tell` costs one manager turn per run. It is one phase, so removing it is one deletion.
- A run that is only `waiting` or `blocked` is left as it is.

**Open questions** are counted from `QuestionsDoc` in `boardView`, and `TaskRecord.questions` goes. Fixes bug 5.

### Move 3: a read is one contract (`team-contract`, new)

Typechecked; a missing path parameter or read handler does not compile.

```ts
export const READS = {
  board: read("/managers/:manager", obj({ board: boardView })),
  task: read("/managers/:manager/tasks/:task", obj({ task: taskDetail })),
} as const;

// server: http mounts the table          // page
handlers: ReadHandlers<Reached>            const t = await get("task", { manager, task: "DT-1" });
```

- **The URLs stay**, so the flow tests and evals are untouched. Screens move one at a time.
- The decoders go, and `manager/screens.ts` takes its types from the contract.
- **The cost:** decoders today drop one malformed row and show the rest; a schema refuses the whole answer. So
  objects are open, and lists use a lenient `rows(schema)` that keeps the valid ones, as `each` does.
- TanStack Start's server functions were considered. They would give the types for free, but change every URL the
  flows drive and break the rule that pages never see the server.

### Move 4: the prototype goes

13 modules serve only the old `_app` routes and the `Directory` and `Workspace` objects: 6,403 lines of 40,631, plus
1,473 of tests. They cost reading time: there are two `WorkspaceHost`s, `Workspace` and
`WorkspaceObject`, and `manager-client` exports `WorkspaceClient`.

- Move first: `RouterLink`, `Failed` and `Gone` out of `app`; `personOf` and `Person` out of `protocol`.
- `schedule` and `history` have behaviour the manager does not have yet. Port or drop them knowingly.
- Removing the objects needs a `deleted_classes` migration, which **erases their stored data**. Confirm nothing
  deployed is worth keeping first.

## B3. What not to take

| Rivet | Why not |
|---|---|
| `agent-client` with an awaited `prompt()` | No page waits for an answer; they show a conversation. The gap is that pages **poll** instead of watching, which is a separate piece |
| Human approval as tool arguments (`approvalId`) | Parking on a signal is stronger: the model cannot forget or forge it |
| Sandbox adapters, scoped tokens | `SandboxHost` and Better Auth now exist |

## B4. Order

Bugs 1 and 5 are small and alone, with a test each. Moves 1 and 2 wait for `step/ui-chat-run` and `step/ui-mission-search`,
which edit the same files; `step/ui-chat-run` adds `run.stop` with its own comparison by id. Move 3 goes one screen at
a time. Move 4 is last.

## B5. Decided: hide the actions nobody has built (Aaron, 2026-11-24)

Built: an action is offered once it has its input in `manager/internal/parameters.ts`, so one being built on another
branch appears by itself when that lands. The book's claim is changed (`book-changes.md`, 4). Move 1 replaces that rule
with `by`. The Permissions screens still list all 76 actions.

### Q1: are actions nobody has built offered to the manager?

**The problem, in code.** The eval `acc:manager/tools-are-actions` requires every action in the book that is not off to
be offered, so hiding the 41 turns it red:

```ts
// src/flows/manager.test.ts:55
expect([...asIds, ...off].sort()).toEqual([...bookIds].sort());
```

```text
message.new  -> Ask: "Launch started a conversation in channel"
  a person allows it
             -> Failed: "Start a new conversation in a channel it listens to is not available yet"
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `acc:manager/tools-are-actions` | Its claim has to change in the book, which only Aaron does |
| `actionTools` ([tools.ts:126](../src/modules/manager/internal/tools.ts)) | Where the list is made |
| Permissions screen | Shows 76 switches; 41 of the live ones do nothing |
| Inbox | 23 of them put a useless question to a person |

**The options**

**A · Hide planned** (recommended)
```ts
export const actionTools = (brain, effects) =>
  MANAGER_ACTIONS.map((id) => actionTool(id, brain, effects));   // by: "manager" only
// book: "…exactly the actions in actions.md that are built: …"; a planned row is marked in actions.md
```

**B · Offer, refuse at once**
```ts
if (spec.by === "planned") return said(`${spec.label} is not available yet`, false);   // before asking anyone
```

**C · Leave it**
```ts
CATALOGUE.map((spec) => actionTool(spec, brain, effects));   // as today
```

| Scenario | A · Hide planned | B · Refuse at once | C · Leave it |
|---|---|---|---|
| The manager wants to archive a task | It has no such tool and says so | Tries, is refused, spends a turn | The same as B |
| It wants to message a channel | No tool | Refused, nobody asked | A person is asked, says yes, nothing happens |
| Tools sent on every model call | 29 | 70 | 70 |
| An action gets built | Change one word; it appears | Change one word | Add a handler |

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ offers what works | ⚠️ offers promises | ❌ asks people for promises |
| Reversibility | ✅ one filter | ✅ one line | ✅ nothing done |
| Blast radius | ⚠️ one eval's claim, with a book change | ✅ no eval | ✅ none |
| Correctness | ✅ | ⚠️ | ❌ |
| Fit | ✅ as `off` is treated | ⚠️ | ⚠️ |

**Recommendation: A.** The only cost is wording in the book.

## Checks behind this

- Part A's code was typechecked with the repo's compiler settings against the real `actionTools`, `agentsSection`,
  `commandTool` and `readSkillTool`; the file-reading tool was declared, not imported. Adding a setting, and marking `web_fetch` built, were each tried and each failed to
  compile until the second place was written. `mount` and `output` were run as A5 and A7 say, in memory with a scripted model, not a real one. None of it is in `src` yet.
- The sketches in moves 1 to 3 were typechecked the same way; none is implemented.
- The hidden actions (B5) are implemented. `pnpm check` reaches its tests: 505 pass, 2 fail. The two
  (`flw:manager/restart` and one in `settings-apply.test.ts`) time out the same way with the change to `tools.ts`
  taken out, on a machine at a load of 14 to 21. Why is not known.
- Not checked: whether `Directory` or `Workspace` hold data on a deployment, and bug 4 by a run that never reports.
