import type { Stage } from "~/modules/board/types.ts";
import type { Loaded } from "~/modules/team-core/types.ts";

/*
 * What a person does with managers: the Inbox and its Needs you pages, and each manager's chat, board and mission.
 * The server's answers arrive as `unknown` and are narrowed into these shapes before any screen sees them.
 */

export type View = "kanban" | "list" | "console" | "inbox";

export interface LaneData {
  readonly id: string;
  readonly name: string;
  readonly needsApproval: boolean;
}

export interface FieldData {
  readonly key: string;
  readonly label: string;
}

export type FieldValue = string | number | boolean | null;

export interface TaskCard {
  /** Shown as `DT-14`. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly lane: string;
  readonly stage: Stage;
  readonly stageLabel: string;
  readonly createdBy: string;
  /** Milliseconds since the epoch. */
  readonly createdAt: number;
  readonly runs: number;
  readonly values: Readonly<Record<string, FieldValue>>;
}

/** Whether the manager can answer, and when it cannot, what to tell the person and whether they can fix it. */
export type ModelState = { readonly ready: true } | { readonly ready: false; readonly reason: string; readonly canFix: boolean };

export interface BoardData {
  readonly managerId: string;
  readonly managerName: string;
  readonly address: string;
  readonly lanes: readonly LaneData[];
  readonly fields: readonly FieldData[];
  readonly defaultView: View;
  readonly tasks: readonly TaskCard[];
  readonly model?: ModelState;
}

/** A task or a mission page the manager points at. */
export interface RefData {
  readonly kind: "task" | "page";
  readonly ref: string;
  readonly title: string;
  /** The task's lane, or where the page sits. */
  readonly sub: string;
}

export interface ChoiceData {
  readonly label: string;
  readonly next: readonly string[];
  readonly risk?: string;
  readonly cost?: string;
}

/** One thing a manager needs from a person: an approval or a question, with what it knows. A notice is only to read. */
export interface ItemData {
  readonly id: string;
  readonly kind: "approval" | "question" | "notice";
  readonly managerId: string;
  readonly managerName: string;
  readonly title: string;
  readonly task?: string;
  readonly createdAt: number;
  readonly context?: string;
  readonly facts: readonly { readonly text: string; readonly source?: RefData }[];
  readonly choices: readonly ChoiceData[];
  readonly recommend?: { readonly option: string; readonly why: string };
  readonly links: readonly RefData[];
  readonly answer?: { readonly text: string; readonly byName: string };
}

/** A person's reply: one of the options, or their own words. */
export type Reply = { readonly choice: string } | { readonly text: string };

/** One line of a manager's chat. */
export interface ChatLineData {
  readonly id: string;
  readonly role: "person" | "manager" | "action";
  /** The answer being written now: the words so far, which grow until the manager's own entry replaces them. */
  readonly streaming?: true;
  readonly authorId?: string;
  readonly authorName?: string;
  readonly text: string;
}

/** A page of a manager's mission. The mission itself has no parent. */
export interface PageData {
  readonly id: string;
  readonly parent?: string;
  readonly title: string;
  readonly body: string;
  readonly updatedAt: number;
  readonly updatedBy: string;
}

/** What the server lets this person do with a page: on, ask (an Owner approves it first) or off. */
export type Allowed = "on" | "ask" | "off";

/** A manager's pages, and whether the person may edit the mission and the pages under it. */
export interface MissionData {
  readonly pages: readonly PageData[];
  readonly can: { readonly mission: Allowed; readonly page: Allowed };
}

/** What became of an edit: written, waiting for an Owner to approve it, or refused by the page itself (it changed meanwhile). */
export type SaveResult = { readonly _tag: "Saved" } | { readonly _tag: "Waiting" } | { readonly _tag: "Refused"; readonly message: string };

/** One edit: the text a person wrote over a page, and the `updatedAt` of the version they started from. */
export interface PageEdit {
  readonly page: PageData;
  readonly body: string;
  readonly base: number;
}

/** The server, as the screens use it. */
export interface TeamApi {
  readonly board: (workspaceId: string, managerId: string) => Promise<Loaded<BoardData>>;
  readonly inbox: (workspaceId: string) => Promise<Loaded<readonly ItemData[]>>;
  readonly item: (workspaceId: string, itemId: string) => Promise<Loaded<ItemData>>;
  readonly answer: (workspaceId: string, itemId: string, reply: Reply) => Promise<Loaded<ItemData>>;
  readonly chat: (workspaceId: string, managerId: string) => Promise<Loaded<readonly ChatLineData[]>>;
  /** The same `requestId` twice is one message. */
  readonly say: (workspaceId: string, managerId: string, text: string, requestId: string) => Promise<Loaded<true>>;
  readonly pages: (workspaceId: string, managerId: string) => Promise<Loaded<MissionData>>;
  /** The action a person and the manager share: `mission.update` or `page.update`. Refused when the page changed since `base`. */
  readonly savePage: (workspaceId: string, managerId: string, edit: PageEdit, requestId: string) => Promise<Loaded<SaveResult>>;
}

export interface BoardScreenProps {
  readonly board: BoardData;
  /** Where the board is, so a task can open as its own page. */
  readonly workspaceId?: string;
  /** The view being shown; the board's own default when omitted. */
  readonly view?: View;
  readonly onView: (view: View) => void;
}

export interface NeedsYouProps {
  readonly workspaceId: string;
  readonly item: ItemData;
  readonly onReply: (reply: Reply) => Promise<void>;
}

export interface InboxScreenProps {
  readonly workspaceId: string;
  readonly items: readonly ItemData[];
  /** Answers one item from the reading pane, as its own page does. */
  readonly onReply: (itemId: string, reply: Reply) => Promise<void>;
  /** An answer that was not sent, in the server's words. */
  readonly failure?: string;
}

export interface ChatScreenProps {
  readonly managerName: string;
  readonly address: string;
  readonly lines: readonly ChatLineData[];
  /** A message that was not sent, in the server's words. */
  readonly failure?: string;
  /** The workspace has no model: what to do about it, and where a person who can fix it goes. Without `fixHref`, who to ask. */
  readonly noModel?: { readonly reason: string; readonly fixHref?: string };
  readonly onSay: (text: string) => void;
  /** What the manager asked and nobody has answered, each a card that opens its Inbox item. */
  readonly questions?: { readonly workspaceId: string; readonly items: readonly ItemData[] };
}

export interface MissionScreenProps {
  readonly workspaceId: string;
  readonly managerId: string;
  readonly managerName: string;
  readonly pages: readonly PageData[];
  /** What the person may edit. Omitted, the pages are only read. */
  readonly can?: MissionData["can"];
  readonly onSave?: (edit: PageEdit) => Promise<Loaded<SaveResult>>;
  /** The page being read; the mission itself when omitted. */
  readonly pageId?: string;
}

export interface TeamAppDependencies {
  readonly api: TeamApi;
  /** Who is signed in, by name. */
  readonly me: string;
}
