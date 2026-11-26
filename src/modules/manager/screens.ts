import type { By, PermissionSet, PersonPreset } from "~/modules/actions/types.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type { Report, Stage } from "~/modules/board/types.ts";
import type { ModelPick } from "~/modules/models/types.ts";
import type { Field, Lane, TemplateId, View } from "./types.ts";

/** What the manager's own screens show beyond its board: the Task page, Permissions, the template gallery. */

/** A template as the gallery shows it, with what it changes in the catalogue's defaults. */
export interface TemplateCard {
  readonly id: TemplateId;
  readonly name: string;
  readonly about: string;
  readonly opensOn: View;
  readonly lanes: readonly Lane[];
  readonly fields: readonly Field[];
  readonly permissions: PermissionSet;
}

/** One task with its comments, its history (the audit line's own sentences), its runs and, from outside, why it is allowed. */
export interface TaskDetail {
  readonly task: TaskView;
  /** The person answerable for it. */
  readonly owner?: string;
  readonly comments: readonly { readonly id: string; readonly by: By; readonly at: number; readonly text: string }[];
  readonly history: readonly { readonly at: number; readonly by: By; readonly sentence: string }[];
  readonly runs: readonly RunView[];
  readonly mandate?: {
    readonly trigger: string;
    readonly strength: "explicit" | "inferred";
    readonly source: string;
    readonly sender: string;
  };
}

/** What a manager may do: its own settings over the catalogue, and the template's it can be reset to. */
export type PermissionsView = PermissionSet & { readonly template: TemplateId; readonly templateDefaults: PermissionSet };

/** A person pressing a button: the same action, checked against their preset and own changes. */
export interface PersonCall {
  readonly actionId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly by: Person;
  readonly preset: PersonPreset;
  readonly own: PermissionSet;
  readonly requestId: string;
  /** The Owner who allowed a press whose setting is ask. */
  readonly approvedBy?: string;
}

export interface TaskView {
  /** Shown as `DT-14`. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly lane: string;
  readonly values: Readonly<Record<string, string | number | boolean | null>>;
  readonly stage: Stage;
  readonly stageLabel: string;
  /**
   * A person put it in the last lane and nothing has reported since: it waits for nobody, so `stage` is `idle` with no
   * words in `stageLabel`. Only an open question still shows.
   */
  readonly settled: boolean;
  readonly createdBy: By;
  readonly createdAt: number;
  readonly runs: readonly string[];
}

export interface RunView {
  readonly id: string;
  readonly task: string;
  readonly role: string;
  readonly agent: string;
  /** The saved agent's version this run took. Absent for a run no saved agent was behind. */
  readonly agentVersion?: number;
  /** The model the run asked for, and what answered if that could not be used. */
  readonly model?: ModelPick;
  readonly modelNotice?: string;
  readonly attempt: number;
  readonly state: "queued" | "running" | "ended";
  readonly report?: Report;
  readonly note?: string;
  /** Set when the run was stopped, not ended by its own report. */
  readonly stopped?: { readonly at: number; readonly by: By };
  readonly startedBy: By;
}

/** What the dashboards count: each task's lane, stage and dates, and each run's agent and state. No words of any transcript. */
export interface ProgressView {
  readonly lanes: readonly { readonly id: string; readonly name: string }[];
  readonly tasks: readonly {
    readonly id: string;
    readonly title: string;
    readonly lane: string;
    readonly stage: Stage;
    readonly stageLabel: string;
    readonly createdAt: number;
    /** When it entered the last lane, if it is there. */
    readonly finishedAt?: number;
    readonly runs: readonly string[];
  }[];
  readonly runs: readonly {
    readonly id: string;
    readonly task: string;
    readonly agent: string;
    readonly state: RunView["state"];
    readonly startedAt: number;
  }[];
}
