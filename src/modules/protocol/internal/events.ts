import type { Op } from "@earendil-works/chord/delta";
import type { ConversationView, EntryRecord, TaskGraph } from "@earendil-works/pi-durable";
import { arr, bool, int, lit, map, num, obj, oneOf, opt, type Schema, str, union, unknown, unsafe } from "@earendil-works/pi-schema";
import type { DirectoryEvent, EntryPage, WorkspaceEvent } from "../types.ts";
import { agentConfig } from "~/modules/agent-config/service.ts";
import { agentEvents, agentRow, agentStamp } from "./agents.ts";
import { modelRef, thinkingLevel } from "./values.ts";

// Open objects: a server one version ahead may add fields. Engine payloads keep the engine's own types; only their
// outline is checked here, and Chord checks each operation before it is applied.
const open = { open: true } as const;
const person = obj({ id: str(), name: str(), avatarUrl: opt(str()) }, open);
const model = obj({ provider: str(), modelId: str(), label: str(), thinkingLevels: arr(thinkingLevel) }, open);
const chat = obj(
  {
    id: int(),
    title: str(),
    pinned: bool(),
    archivedAt: opt(num()),
    createdAt: num(),
    updatedAt: num(),
    createdBy: str(),
    status: oneOf(["idle", "working", "failed"]),
    parentId: opt(int()),
    agent: opt(agentStamp),
  },
  open,
);
const document = obj(
  {
    id: str(),
    title: str(),
    language: str(),
    version: int(),
    versions: arr(int()),
    chatId: int(),
    updatedAt: num(),
  },
  open,
);
const workspace = obj(
  {
    id: str(),
    name: str(),
    pinned: bool(),
    archivedAt: opt(num()),
    createdAt: num(),
    updatedAt: num(),
    createdBy: str(),
    chats: arr(chat),
    documents: arr(document),
  },
  open,
);
const schedule = obj({ taskId: int(), chatId: int(), instruction: str(), runAt: num(), repeats: opt(str()) }, open);
const settings = obj(
  {
    model: opt(modelRef),
    thinkingLevel,
    instructions: str(),
    budgetUsd: opt(num()),
    maxTurns: int(),
  },
  open,
);
const usage = obj({ costUsd: num(), models: arr(obj({ model: str(), costUsd: num(), tokens: num() }, open)) }, open);
const presence = obj({ person, chatId: opt(int()), typing: bool() }, open);
const taskGraph = unsafe<TaskGraph>(obj({ tasks: map(obj({ id: int(), kind: str() }, open)) }, open));
const view = unsafe<ConversationView>(
  obj({ conversation: obj({}, open), entries: arr(obj({ id: int(), kind: str() }, open)), docs: map(unknown()) }, open),
);
const page = unsafe<EntryPage>(obj({ items: arr(unsafe<EntryRecord>(obj({ id: int(), kind: str() }, open))), next: opt(unknown()) }, open));
const match = obj({ chatId: int(), entryId: int(), role: oneOf(["user", "assistant"]), snippet: str() }, open);

const output = union([
  obj({ kind: lit("done") }, open),
  obj({ kind: lit("chat"), chatId: int() }, open),
  obj({ kind: lit("submitted"), submissionId: int() }, open),
  obj({ kind: lit("entries"), page }, open),
  obj(
    {
      kind: lit("document"),
      document: obj(
        {
          documentId: str(),
          title: str(),
          language: str(),
          version: int(),
          content: str(),
          savedAt: num(),
        },
        open,
      ),
    },
    open,
  ),
  obj({ kind: lit("agent"), config: agentConfig }, open),
  obj({ kind: lit("matches"), matches: arr(match), truncated: bool() }, open),
]);
const errorCode = oneOf([
  "invalid",
  "not_found",
  "rejected",
  "budget_reached",
  "queue_full",
  "no_model",
  "forbidden",
  "conflict",
  "unavailable",
  "failed",
]);
const results = [
  obj({ type: lit("command.result"), requestId: str(), ok: lit(true), output }, open),
  obj(
    {
      type: lit("command.result"),
      requestId: str(),
      ok: lit(false),
      error: obj({ code: errorCode, message: str() }, open),
    },
    open,
  ),
  obj({ type: lit("error"), message: str() }, open),
] as const;

export const directoryEvent: Schema<DirectoryEvent> = union([
  obj(
    {
      type: lit("directory.snapshot"),
      protocol: int(),
      me: person,
      models: arr(model),
      workspaces: arr(workspace),
      people: arr(person),
      agents: arr(agentRow),
      isAdmin: bool(),
    },
    open,
  ),
  ...agentEvents,
  obj({ type: lit("workspace.changed"), workspace }, open),
  obj({ type: lit("workspace.removed"), workspaceId: str() }, open),
  obj({ type: lit("people.changed"), people: arr(person) }, open),
  ...results,
]);

const state = {
  name: str(),
  settings,
  usage,
  documents: arr(document),
  schedules: arr(schedule),
  activity: taskGraph,
  presence: arr(presence),
};

export const workspaceEvent: Schema<WorkspaceEvent> = union([
  obj(
    {
      type: lit("workspace.snapshot"),
      protocol: int(),
      workspaceId: str(),
      me: person,
      models: arr(model),
      state: obj(state, open),
    },
    open,
  ),
  obj(
    {
      type: lit("workspace.patch"),
      patch: obj(
        {
          name: opt(state.name),
          settings: opt(state.settings),
          usage: opt(state.usage),
          documents: opt(state.documents),
          schedules: opt(state.schedules),
          activity: opt(state.activity),
          presence: opt(state.presence),
        },
        open,
      ),
    },
    open,
  ),
  obj({ type: lit("chat.view"), chatId: int(), view }, open),
  obj({ type: lit("chat.ops"), chatId: int(), ops: arr(unsafe<Op>(unknown())) }, open),
  obj({ type: lit("chat.closed"), chatId: int() }, open),
  ...results,
]);
