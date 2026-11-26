import type { AskAnswer, AskOp } from "~/modules/asking/types.ts";
import type { Boxes } from "~/modules/boxes/types.ts";
import type { Message, Models } from "~/modules/completion/types.ts";
import type { Clock } from "~/modules/clock/types.ts";
import type { GitPort } from "~/modules/boxes/types.ts";
import type { Decision, Item, OpenWork } from "~/modules/intake/types.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import type { Playbook } from "~/modules/playbook/types.ts";
import type { Ask } from "~/modules/asks/types.ts";
import type { MailAnswer, MailCall } from "~/modules/mailing/types.ts";
import type { McpAnswer, McpCall } from "~/modules/mcp-servers/types.ts";
import type { ToDo, Work, WorkEvent } from "~/modules/work/types.ts";

/*
 * What a manager does with its work: it moves it (`work`), does what moving it asked, runs the conversations of its agents
 * (`threads`), and keeps their box (`boxes`). Everything it knows it keeps in a `Store` and everything outside is in `Outside`,
 * both given: the manager's Durable Object builds them. A crash loses nothing that was stored and does nothing twice.
 */

/** What the manager does that `work` does not ask of it: it confirms what a connector did, and it runs a step's own commands. */
export type Job =
  | ToDo
  | { readonly key: string; readonly do: "confirm"; readonly check: string }
  | { readonly key: string; readonly do: "run checks"; readonly step: string }
  /** A thread that waited for an answer goes on from where it was. */
  | { readonly key: string; readonly do: "resume"; readonly thread: string };

export interface StoredJob {
  readonly seq: number;
  readonly work: string;
  readonly job: Job;
}

/** One agent's conversation on one piece of work. Its lines are the messages, as a model is sent them. */
export interface ThreadRow {
  readonly id: string;
  readonly work: string;
  readonly agent: string;
  readonly role: "does" | "checks";
  readonly step: string;
  readonly state: "working" | "ended";
  readonly started: number;
  /** What it was set to do. */
  readonly brief: string;
  /** What it said last, in a line. */
  readonly said: string;
  readonly model: string | null;
}

export type { Message } from "~/modules/completion/types.ts";

/** One model call's cost, by the call that made it: a replay changes nothing. */
export interface Spend {
  readonly call: string;
  readonly work: string;
  readonly thread: string;
  readonly connection: string;
  readonly model: string;
  readonly input: number;
  readonly cached: number;
  readonly output: number;
  /** Absent: the price of the model is not known, and it is said, never counted as nothing. */
  readonly dollars?: number;
  readonly at: number;
}

/** Why a work waits for something that is not a person: it is said on its card. */
export interface Hold {
  readonly why: string;
  readonly retry: number;
}

/** One line of what happened to a piece of work, in the words the work's page shows. */
export interface ActivityLine {
  readonly who: string;
  readonly at: number;
  readonly text: string;
}

/** Everything a manager keeps. One transaction is all or nothing. */
export interface Store {
  readonly transaction: <T>(run: () => T) => T;
  readonly work: (id: string) => Work | undefined;
  readonly works: () => readonly Work[];
  readonly putWork: (work: Work) => void;
  /** Events and jobs are done once, by their key. */
  readonly seen: (key: string) => boolean;
  readonly see: (key: string) => void;
  readonly addJobs: (work: string, jobs: readonly Job[]) => void;
  readonly nextJob: (work: string) => StoredJob | undefined;
  readonly finishJob: (key: string) => void;
  readonly busy: () => readonly string[];
  readonly thread: (id: string) => ThreadRow | undefined;
  readonly threadsOf: (work: string) => readonly ThreadRow[];
  readonly putThread: (row: ThreadRow) => void;
  readonly messages: (thread: string) => readonly Message[];
  readonly addMessage: (thread: string, message: Message) => void;
  readonly addSpend: (spend: Spend) => void;
  readonly spendOf: (work: string) => { readonly dollars: number; readonly notKnown: number };
  readonly spends: () => readonly Spend[];
  readonly hold: (work: string) => Hold | undefined;
  readonly setHold: (work: string, hold: Hold | null) => void;
  /** What an outside act did, by a key made for it, so that doing it again finds it. */
  readonly once: (key: string) => string | undefined;
  readonly keepOnce: (key: string, value: string) => void;
  /** What happened to a work, oldest first. */
  readonly addActivity: (work: string, line: ActivityLine) => void;
  readonly activityOf: (work: string) => readonly ActivityLine[];
  /** What waits for a person, made by this manager's work: one each, by its id. */
  readonly putAsk: (ask: Ask) => void;
  readonly asks: () => readonly Ask[];
  /** Rows of a kind that people read and answer later (comments, cases, proposals, what was heard): put by id, oldest first. */
  readonly keep: (kind: string, id: string, value: unknown) => void;
  readonly kept: (kind: string) => readonly unknown[];
}

export type { Models } from "~/modules/completion/types.ts";

/** What is outside the manager's object. */
export interface Outside {
  readonly models: () => Promise<Models>;
  /** One call to a model, made for the workspace with its credential. Never holds or shows a key. */
  readonly call: (path: string, body: string) => Promise<Response>;
  /** The GitHub installation the workspace has, if it has one. */
  readonly installation: () => Promise<number | undefined>;
  readonly github: GitHubApi;
  readonly git: GitPort;
  readonly fetch: typeof fetch;
  /** What waits for a person: kept, shown and answered by the workspace. It is asked again with the same id, never twice. */
  readonly asks: (op: AskOp) => Promise<AskAnswer>;
  /** The workspace's mailbox: what a manager reads of it and sends from it, once by its key. */
  readonly mail: (call: MailCall) => Promise<MailAnswer>;
  /** The workspace's MCP servers: their tools, as a model is offered them, and one called by its name. */
  readonly mcp: (call: McpCall) => Promise<McpAnswer>;
  /** A line in the workspace's audit log: what the manager did that a person had to say yes to. */
  readonly audit?: (line: AuditLine) => Promise<void>;
}

export interface AuditLine {
  readonly at: number;
  /** What was done, in words that say who did it. */
  readonly says: string;
  /** The action's id. */
  readonly action: string;
  readonly outcome: "done" | "refused" | "failed";
  readonly why: string | null;
  readonly approvedBy: string;
}

/** What was asked of a person for a piece of work was answered, anywhere: `answer` in the words it is known by, `option` its id. */
export interface Answer {
  readonly ask: string;
  readonly work: string;
  readonly person: string;
  readonly answer: string;
  readonly option: string | null;
  readonly where: string;
  readonly at: number;
}

export interface WorkingDeps {
  readonly store: Store;
  readonly boxes: Boxes & BoxPut;
  readonly outside: Outside;
  readonly clock: Clock;
  /** A playbook, as it was at a version. */
  readonly playbook: (version: number) => Playbook | undefined;
  readonly manager: { readonly id: string; readonly name: string };
  /** The one thing to wake for: when the earliest thing is due, or never. */
  readonly alarm: (at: number | null) => void;
  /** Lets something go on after the call that began it has answered. */
  readonly later: (running: Promise<unknown>) => void;
}

/** A write in the box that answers in a value when it could not be done: `Boxes.write` answers nothing, so it has no way to say so. */
export interface BoxPut {
  readonly put: (
    work: string,
    call: string,
    path: string,
    text: string,
  ) => Promise<{ readonly _tag: "Unavailable"; readonly why: string } | undefined>;
}

export interface TakeInput {
  readonly item: Item;
  readonly took: Extract<Decision, { readonly _tag: "Took" }>;
  /** Who answers for the work. */
  readonly answers: string;
}

/** What became of an event applied to a piece of work by someone outside it. */
export type Changed = { readonly _tag: "Moved" | "Same" } | { readonly _tag: "Refused"; readonly why: string } | { readonly _tag: "Gone" };

/** Work of another manager that was handed over: it goes on here, under a new id, with what it had. */
export interface AdoptInput {
  readonly from: Work;
  /** The version of this manager's playbook it goes on under. */
  readonly version: number;
  readonly at: number;
}

export interface Working {
  /** Takes what intake decided on as a piece of work, once per item. */
  readonly take: (input: TakeInput) => Promise<{ readonly work: string } | { readonly _tag: "NoSuchKind"; readonly why: string }>;
  /** An ask of this work was answered: the work and its threads go on, once for each ask. */
  readonly answered: (input: Answer) => Promise<void>;
  /** What came in on a conversation that work follows goes to that work. */
  readonly heard: (input: { readonly work: string; readonly item: Item }) => Promise<void>;
  /** Something happened that the work follows or a person said: it moves the work by that event, once by its key. `says`: how its page puts it. */
  readonly news: (input: { readonly work: string; readonly event: WorkEvent; readonly says?: string }) => Promise<void>;
  /** One change of one piece of work by a person (the console): an event applied once by its key. */
  readonly event: (work: string, event: WorkEvent) => Promise<Changed>;
  /** Work handed over by another manager goes on here, on the step it was at, following what it followed. */
  readonly adopt: (input: AdoptInput) => Promise<{ readonly work: string } | { readonly _tag: "NoSuchKind"; readonly why: string }>;
  /** Open work, as intake counts it. */
  readonly open: () => readonly OpenWork[];
  /** Does what is to be done now, for every piece of work, and says when to wake next. */
  readonly run: () => Promise<void>;
  /** What came due, and what waited for a place or a model, is tried again; then `run`. */
  readonly due: () => Promise<void>;
}
