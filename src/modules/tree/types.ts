import type { Reach } from "~/modules/reach/types.ts";
import type { Problem } from "~/modules/playbook/types.ts";

/* The managers of a workspace, each under the one that looks after it. The co-worker is the top. Pure. */

export interface ManagerNode {
  readonly id: string;
  readonly name: string;
  /** Null: under the co-worker. */
  readonly above: string | null;
  readonly answers: string;
  readonly template: { readonly id: string; readonly version: number } | null;
  readonly version: number;
  readonly state: "runs" | "paused" | "retired";
  readonly reach: Reach;
}

export interface Rolled {
  readonly id: string;
  readonly came: number;
  readonly work: number;
  readonly out: number;
  readonly open: number;
  readonly waiting: number;
  readonly cost: number;
  readonly is: "working" | "needs you" | "idle" | "stuck" | "paused";
}

export type TreeEvent =
  | { readonly is: "make"; readonly node: ManagerNode }
  | { readonly is: "move"; readonly id: string; readonly above: string | null }
  | { readonly is: "rename"; readonly id: string; readonly name: string }
  | { readonly is: "reach"; readonly id: string; readonly reach: Reach }
  | { readonly is: "pause" | "go on"; readonly id: string }
  /** Open work goes up to who is above, or ends with this reason. */
  | { readonly is: "retire"; readonly id: string; readonly open: { readonly _tag: "up" } | { readonly _tag: "end"; readonly why: string } };

export type Grown =
  | {
      readonly _tag: "Grown";
      readonly nodes: readonly ManagerNode[];
      readonly narrowed: readonly string[];
      readonly work: "stays" | "up" | "ends";
    }
  | { readonly _tag: "Refused"; readonly why: string; readonly problems: readonly Problem[] };

export interface Tree {
  readonly grow: (nodes: readonly ManagerNode[], event: TreeEvent, whole: Reach) => Grown;
  readonly under: (nodes: readonly ManagerNode[], id: string | null) => readonly ManagerNode[];
  readonly above: (nodes: readonly ManagerNode[], id: string) => readonly ManagerNode[];
  /** Each with what is below it added. The loudest below shows on it. */
  readonly roll: (nodes: readonly ManagerNode[], own: readonly Rolled[]) => readonly Rolled[];
}
