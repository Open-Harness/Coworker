import type { JsonValue } from "@earendil-works/chord/json";
import { defineDoc } from "@earendil-works/pi-durable";
import type { Category, Permission } from "~/modules/actions/types.ts";
import type { Field, Lane, ManagerProfile, View } from "../types.ts";

/*
 * Everything a manager owns lives in pi-durable documents, so a tool's change commits in the same transaction as its
 * receipt, and a call replayed after a crash changes nothing twice.
 */

export type ByRecord = { kind: "person" | "manager"; id: string; name: string };

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  lane: string;
  values: { [key: string]: string | number | boolean | null };
  createdBy: ByRecord;
  createdAt: number;
  archived: boolean;
  runs: string[];
  questions: number;
  lastPersonWriteAt?: number;
  /** When a person moved it into the last lane: from then on it is settled, until it moves out or a run reports again. */
  settledAt?: number;
  /** When anyone last moved it into the last lane; cleared when it moves out. Older tasks have only `settledAt`. */
  finishedAt?: number;
  /** The person answerable for it: their person id. */
  owner?: string;
  /** What people and the manager wrote on the task, oldest first. */
  comments?: { id: string; by: ByRecord; at: number; text: string }[];
  /** What was done to it, as the audit line's own sentence, oldest first. */
  history?: { at: number; by: ByRecord; sentence: string }[];
  /** Why the work is allowed, when it came from outside: the Trigger, its strength and sender. */
  mandate?: { trigger: string; strength: "explicit" | "inferred"; source: string; sender: string };
  /** Where answers go: the Trigger's `ReplyAddress`, as stored JSON. */
  replyTo?: JsonValue;
  /** Files it came with (`FileRef`s), kept in the file store. */
  files?: JsonValue;
};

export type RunRecord = {
  id: string;
  task: string;
  role: string;
  agent: string;
  attempt: number;
  state: "queued" | "running" | "ended";
  report?: "progress" | "waiting" | "ready" | "blocked" | "failed" | "dropped";
  reportedAt?: number;
  note?: string;
  conversationId: number;
  startedAt: number;
  startedBy: ByRecord;
  /** Set when a person or the manager stopped it: who, and when. A stopped run ignores what it says afterwards. */
  stopped?: { at: number; by: ByRecord };
  /** What the run took from the saved agent behind it. Absent for a run no saved agent was behind. */
  saved?: {
    version: number;
    /** Environment id, or none. */
    environment: string | null;
    skills: { id: string; name: string; version: number }[];
  };
  /** The model the agent asked for, and what the workspace said when that could not be used. */
  model?: { connectionId: string; model: string };
  modelNotice?: string;
};

export type BoardState = {
  lanes: Lane[];
  fields: Field[];
  defaultView: View;
  nextNumber: number;
  tasks: { [id: string]: TaskRecord };
  runs: { [id: string]: RunRecord };
};

export type PageRecord = { id: string; parent: string | null; title: string; body: string; updatedAt: number; updatedBy: ByRecord };

export type PagesState = { order: string[]; pages: { [id: string]: PageRecord } };

export type OwnPermissions = { categories: { [category in Category]?: Permission }; actions: { [action: string]: Permission } };

type ProfileState = { profile?: { [K in keyof ManagerProfile]: ManagerProfile[K] } };

export const ProfileDoc = defineDoc<ProfileState>({
  kind: "dt.manager-profile",
  version: 1,
  scope: "session",
  initial: () => ({}),
  checkpointWhen: () => true,
});

export const BoardDoc = defineDoc<BoardState>({
  kind: "dt.board",
  version: 1,
  scope: "session",
  initial: () => ({ lanes: [], fields: [], defaultView: "kanban", nextNumber: 1, tasks: {}, runs: {} }),
  checkpointWhen: (_value, ops) => ops.length > 20,
});

export const PagesDoc = defineDoc<PagesState>({
  kind: "dt.pages",
  version: 1,
  scope: "session",
  initial: () => ({ order: [], pages: {} }),
  checkpointWhen: (_value, ops) => ops.length > 20,
});

export const PermissionsDoc = defineDoc<OwnPermissions>({
  kind: "dt.manager-permissions",
  version: 1,
  scope: "session",
  initial: () => ({ categories: {}, actions: {} }),
  checkpointWhen: () => true,
});

export const MISSION = "mission";

/** The manager's questions, by Inbox item id: which task each is about and whether it is still open. */
export const QuestionsDoc = defineDoc<{ items: { [id: string]: { task: string | null; open: boolean } } }>({
  kind: "dt.questions",
  version: 1,
  scope: "session",
  initial: () => ({ items: {} }),
  checkpointWhen: (_value, ops) => ops.length > 20,
});
