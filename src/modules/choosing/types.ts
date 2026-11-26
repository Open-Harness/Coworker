import type { ModelChoice, Thinking } from "~/modules/playbook/types.ts";

/* Which model answers, and what it cost. Pure. Replaces `models.ModelPick` as the choice; `models` keeps connections and keys. */

export interface ModelOn {
  readonly connection: string;
  readonly model: string;
  readonly works: boolean;
  /** Dollars per million tokens. Absent: not known, which is said, and never counted as zero. */
  readonly price?: { readonly input: number; readonly cached: number; readonly output: number };
  readonly thinks: boolean;
}

export interface Levels {
  readonly agent: ModelChoice;
  readonly manager: ModelChoice;
  readonly workspace: Exclude<ModelChoice, "inherit"> | null;
  /** May another one answer when the chosen one does not work? */
  readonly mayFallBack: boolean;
}

export type Chosen =
  | {
      readonly _tag: "Chosen";
      readonly connection: string;
      readonly model: string;
      readonly thinking: Thinking;
      readonly from: "agent" | "manager" | "workspace";
      /** Set when another answered than was chosen: says which, and why. */
      readonly instead?: string;
    }
  | { readonly _tag: "None"; readonly why: string };

export interface Usage {
  readonly input: number;
  readonly cached: number;
  readonly output: number;
}

export type Price = { readonly known: true; readonly dollars: number } | { readonly known: false; readonly tokens: number };

export interface Limit {
  readonly is: "work" | "manager" | "workspace";
  readonly most: number;
  readonly spent: number;
  /** Say so from here: 0 to 1. */
  readonly tellAt: number;
}

export type Room =
  | { readonly _tag: "Room" }
  | { readonly _tag: "Tell"; readonly says: string }
  | { readonly _tag: "Over"; readonly is: Limit["is"]; readonly says: string };

export interface Choosing {
  readonly choose: (levels: Levels, models: readonly ModelOn[]) => Chosen;
  readonly price: (usage: Usage, model: ModelOn | undefined) => Price;
  readonly add: (prices: readonly Price[]) => { readonly dollars: number; readonly notKnown: number };
  /** The narrowest limit that is reached, else the first that is near. */
  readonly room: (limits: readonly Limit[]) => Room;
  /** A day's money in parts for the managers. Never more than the whole. */
  readonly parts: (whole: number, asks: Readonly<Record<string, number>>) => Readonly<Record<string, number>>;
}
