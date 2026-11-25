import type { CommandRequest, ExecOutcome } from "~/modules/sandboxes/types.ts";
import type { Models } from "@earendil-works/pi-ai/models";
import type { ModelCall, ModelPick, ModelRoute } from "~/modules/models/types.ts";
import type { ActionRecord, By, CallResult } from "~/modules/actions/types.ts";
import type { Clock } from "~/modules/clock/types.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type { SearchHit } from "~/modules/search/types.ts";
import type { Channel, FileStore, Routed, Trigger } from "~/modules/triggers/types.ts";
import type { PermissionsView, PersonCall, ProgressView, RunView, TaskDetail, TaskView } from "./screens.ts";
import type { ManagerWorkspace } from "./agents.ts";

export type * from "./agents.ts";

/** What reaches a manager: work through the Gate, or a follow-up on one of its Tasks. */
export type Heard = Extract<Routed, { _tag: "FollowUp" | "Candidate" }>;

/** What a manager decided about a Trigger it heard (model.md "Decision"), found by the Trigger's id. */
export interface TriggerDecision {
  readonly trigger: string;
  readonly kind: "accept" | "attach" | "ignore";
  /** The Task it became, or was attached to. */
  readonly task?: string;
  readonly reason?: string;
  /** Observe mode: the manager would have taken it. */
  readonly wouldAccept?: boolean;
}

/** What a manager starts from. A Kanban, an incident console and a support inbox differ only in these values. */
export type TemplateId = "kanban" | "incident" | "support" | "research";

export type View = "kanban" | "list" | "console" | "inbox";

export type Lane = { id: string; name: string; meaning: string; needsApproval: boolean; limit?: number };

export type Field =
  | { key: string; label: string; type: "select"; options: { value: string; tone?: "red" | "amber" | "green" }[] }
  | { key: string; label: string; type: "text" | "number" | "date" | "person" };

export interface ManagerProfile {
  readonly managerId: string;
  readonly workspaceId: string;
  readonly name: string;
  /** Unique in its workspace; the local part of its email address. */
  readonly slug: string;
  /** Where people email it: `launch.acme@co-worker.tech`. */
  readonly address: string;
  readonly template: TemplateId;
  /** What it is for, in the words of whoever made it. The template's own when omitted. */
  readonly mission?: string;
  readonly createdBy: string;
  readonly createdAt: number;
  /** Where its Workspace object is, for audit lines and Inbox items. */
  readonly workspaceObjectId: string;
  readonly region: "eu" | "us";
}

export type NoModel = { readonly _tag: "NoModel"; readonly reason: string };
export type ProvisionResult =
  | { readonly _tag: "Provisioned" }
  | { readonly _tag: "AlreadyProvisioned"; readonly managerId: string }
  | NoModel;
export type NotProvisioned = { readonly _tag: "NotProvisioned" };

export type { PermissionsView, PersonCall, ProgressView, RunView, TaskDetail, TaskView, TemplateCard } from "./screens.ts";

export interface BoardView {
  readonly lanes: readonly Lane[];
  readonly fields: readonly Field[];
  readonly defaultView: View;
  readonly tasks: readonly TaskView[];
}

export interface PageView {
  readonly id: string;
  /** The mission page has none; a sub-page names the page it sits under. */
  readonly parent: string | null;
  readonly title: string;
  readonly body: string;
  readonly updatedAt: number;
  readonly updatedBy: By;
}

/** One line of the manager's chat, as people read it. */
export interface ChatLine {
  readonly id: string;
  readonly role: "person" | "manager" | "action";
  readonly author?: Person;
  readonly text: string;
  /** The answer being written now, as far as it has got: it has no entry yet, and it grows until it does. */
  readonly streaming?: true;
  /** Set on a question the manager asked a person: the Inbox item it waits in, so a chat page can link to it. */
  readonly question?: { readonly itemId: string };
}

/** `notice` says, in words, that the model chosen for the manager could not be used and another answered. */
export type ChatResult = { readonly _tag: "Accepted"; readonly submissionId: string; readonly notice?: string } | NotProvisioned | NoModel;

/** The model a manager thinks with, and the catalog it comes from. */
export interface Brain {
  readonly models: Models;
  readonly model: { readonly provider: string; readonly modelId: string };
  /** Whether it can answer now, and if not, what to tell the person. Without it, a brain always can. */
  readonly ready?: (workspace: WorkspaceLink) => Promise<NoModel | undefined>;
  /**
   * The model a conversation names to think with the choice made for it: the connection and model an agent was saved
   * with. `null`, or a brain with no such choices, names `model`. A choice is a name only; which connection answers is
   * still decided by the workspace on each call.
   */
  readonly modelFor?: (choice: ModelPick | null) => { readonly provider: string; readonly modelId: string };
}

/**
 * Makes a manager's brain. `workspace` reaches the manager's Workspace object once the manager is provisioned, and
 * answers undefined before that.
 */
export type MakeBrain = (workspace: () => Promise<WorkspaceLink | undefined>) => Brain;

/** One manager in one Durable Object: its pi-durable harness, mission pages, board and runs. */
export interface ManagerApi {
  provision(profile: ManagerProfile): Promise<ProvisionResult>;
  describe(): Promise<{ readonly _tag: "Found"; readonly profile: ManagerProfile } | NotProvisioned>;
  /** A person writes in the manager's chat. The same `requestId` twice is one message. */
  chat(input: { readonly text: string; readonly by: Person; readonly requestId: string }): Promise<ChatResult>;
  conversation(): Promise<readonly ChatLine[] | NotProvisioned>;
  board(): Promise<BoardView | NotProvisioned>;
  /** The numbers the Home and Overview dashboards are made of. */
  progress(): Promise<ProgressView | NotProvisioned>;
  /** One run and its transcript. */
  run(
    runId: string,
  ): Promise<
    { readonly _tag: "Run"; readonly run: RunView; readonly lines: readonly ChatLine[] } | { readonly _tag: "NoSuchRun" } | NotProvisioned
  >;
  pages(): Promise<readonly PageView[] | NotProvisioned>;
  /** Its pages and tasks that match, ranked so a workspace can merge every manager's. */
  search(query: string): Promise<readonly SearchHit[]>;
  /** A person's answer reaching the tool call that waits for it. */
  deliver(waiter: Waiter, answer: Answer): Promise<{ readonly _tag: "Delivered" } | { readonly _tag: "Gone" }>;
  act(call: PersonCall): Promise<CallResult | NotProvisioned>;
  /** The workspace's address changed: the manager's own is made of it. */
  readdress(address: string): Promise<{ readonly _tag: "Readdressed" } | NotProvisioned>;
  task(taskId: string): Promise<{ readonly _tag: "Task"; readonly detail: TaskDetail } | { readonly _tag: "NoSuchTask" } | NotProvisioned>;
  permissions(): Promise<{ readonly _tag: "Permissions"; readonly permissions: PermissionsView } | NotProvisioned>;
  /** How many runs began from `since` up to `until` (now when omitted). */
  runCount(since: number, until?: number): Promise<number>;
  /** Every Decision the manager took on what it heard. A Trigger it has not decided yet is not in the list. */
  decisions(): Promise<readonly TriggerDecision[]>;
  /** From the Workspace: a candidate to triage, or a follow-up on a Task. Hearing the same Trigger twice does nothing. */
  hear(trigger: Trigger, routed: Heard): Promise<{ readonly _tag: "Heard" } | NotProvisioned>;
  destroy(): Promise<{ readonly _tag: "Destroyed" }>;
}

/** One audit line on its way to the workspace's log. The key makes sending it twice harmless. */
export interface AuditLine {
  readonly key: string;
  readonly managerId: string;
  readonly record: ActionRecord;
}

/** Where an answer goes back to: a parked tool call in a Manager object. */
export interface Waiter {
  readonly managerId: string;
  readonly taskId: number;
  readonly key: string;
}

/** A task or page on the manager's board, as a "Needs you" page links to it. */
export interface QuestionRef {
  readonly kind: "task" | "page";
  /** `DT-14`, or a page id. */
  readonly ref: string;
  readonly title: string;
  /** The task's lane, or "Mission" / "Mission sub-page". */
  readonly sub: string;
}

/** What a person needs to decide a question: why it reached them, what is known, the choices and where to look. */
export interface QuestionDetail {
  readonly context?: string;
  readonly facts: readonly { readonly text: string; readonly source?: QuestionRef }[];
  readonly choices: readonly { readonly label: string; readonly next: readonly string[]; readonly risk?: string; readonly cost?: string }[];
  readonly recommend?: { readonly option: string; readonly why: string };
  readonly links: readonly QuestionRef[];
}

/** An Inbox item a manager asks for: an approval of an action set to ask, or a question. */
export interface InboxRequest {
  /** One item per id, however often it is sent. */
  readonly id: string;
  readonly kind: "approval" | "question";
  /** The person who answers, as a person id: `email:ama@example.test`. */
  readonly to: string;
  readonly managerId: string;
  readonly managerName: string;
  /** The action's sentence, or the question. */
  readonly title: string;
  readonly options: readonly string[];
  readonly task?: string;
  readonly detail?: QuestionDetail;
  readonly waiter: Waiter;
}

/** What a person said: one of the options, or their own words. */
export type Answer = {
  readonly decision: "allow" | "always" | "deny" | "text";
  readonly text: string;
  readonly byId: string;
  readonly byName: string;
};

export type AskResult = { readonly _tag: "Asked" } | { readonly _tag: "Answered"; readonly answer: Answer };

/** What a manager needs of its Workspace object: one idempotent call per thing. */
export interface WorkspaceLink {
  recordActions(lines: readonly AuditLine[]): Promise<void>;
  ask(request: InboxRequest): Promise<AskResult>;
  follow(managerId: string, task: string, threads: Trigger["threads"]): Promise<void>;
  sandbox(request: CommandRequest): Promise<ExecOutcome | { readonly _tag: "NotProvisioned" }>;
  /** The connection its model calls go to now, for a choice if there is one. No key. */
  modelRoute(wanted?: ModelPick): Promise<ModelRoute>;
  /** One model call, made by the Workspace object with the workspace's credential. The answer holds no key. */
  modelCall(call: ModelCall): Promise<Response>;
}

export interface ManagerDependencies {
  readonly clock: Clock;
  /** What a manager thinks with: its workspace's own model connection, or the fast tier's script. */
  readonly brain: MakeBrain;
  readonly workspace: (objectId: string, region: "eu" | "us") => ManagerWorkspace;
  /** Where replies go out: email, GitHub. */
  readonly channel: Channel;
  /** Where attachments are kept. */
  readonly files: FileStore;
  readonly report: (message: string, error: unknown) => void;
}

/** The `MANAGER` namespace, as far as a workspace uses it: objects made in its jurisdiction. */
export interface ManagerObjects {
  readonly mint: (region: "eu" | "us") => { readonly objectId: string; readonly object: ManagerApi };
  readonly get: (objectId: string, region: "eu" | "us") => ManagerApi;
}
