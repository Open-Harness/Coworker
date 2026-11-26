import type { Permission } from "~/modules/reach/types.ts";

/*
 * The one registry of what can be done on the console. A button, the palette, the co-worker and a walk in front of you
 * press the same entry. Takes the place of `actions`' catalogue. Pure; the doing is in the module that owns the thing.
 */

export type Role = "Owner" | "Builder" | "Member";
export type Group = "Managers" | "Work" | "Intake" | "Chats" | "Connectors" | "Settings" | "Co-worker";

export interface Field {
  readonly name: string;
  readonly label: string;
  readonly is: "text" | "long text" | "number" | "pick" | "person" | "date";
  readonly needed: boolean;
}

export interface Doing {
  /** `work.add`, `trigger.add`, `version.save`. */
  readonly id: string;
  readonly label: string;
  readonly group: Group;
  /** Where a person does it: the page, and the control on it by its accessible name. What the co-worker points at. */
  readonly at: { readonly page: string; readonly press: string };
  readonly fields: readonly Field[];
  readonly needs: Role;
  /** What the co-worker may do with it when nobody says otherwise. */
  readonly coworker: Permission;
  /** It changes something a person decides: the co-worker stops before it and asks, always. */
  readonly stops: boolean;
  readonly keys?: string;
  /** For the audit log, the ask and the history, with `{field}` slots. */
  readonly sentence: string;
  readonly undo: string | null;
}

export interface Who {
  readonly id: string;
  readonly name: string;
  readonly is: "person" | "coworker";
  readonly role: Role;
  /** Set over the registry for this person, or for the co-worker. */
  readonly own: Readonly<Record<string, Permission>>;
}

export type May = { readonly is: Permission; readonly why: string };

/** One thing the co-worker does in front of someone. `yours`: it stops, and only a person goes on. */
export interface WalkStep {
  readonly say: string;
  readonly at: { readonly page: string; readonly press: string | null };
  readonly does: "go" | "point" | "press" | "fill";
  readonly field?: string;
  readonly value?: string;
  readonly yours: boolean;
}

export interface Found {
  readonly is: "ask" | "go" | "do" | "find";
  readonly id: string;
  readonly label: string;
  readonly about: string;
}

export interface Doings {
  readonly all: readonly Doing[];
  /** The co-worker on someone's behalf has the less of what it and they may do. */
  readonly may: (doing: string, who: Who, onBehalfOf?: Who) => May;
  readonly offered: (who: Who, page?: string) => readonly Doing[];
  /** What the palette shows for some words: asking first, then places, doings and things, best first. */
  readonly find: (words: string, who: Who, things: readonly Found[]) => readonly Found[];
  readonly sentence: (doing: string, values: Readonly<Record<string, string>>, by: string) => string;
  /** Page, control, fields in order, and a stop before what a person decides. */
  readonly walk: (doing: string, values: Readonly<Record<string, string>>) => readonly WalkStep[];
}
