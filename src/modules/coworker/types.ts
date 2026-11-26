import type { Permission } from "~/modules/reach/types.ts";

/* The one identity of a workspace: who it is, how it speaks, what it may do by itself. Its chats are conversations in its own object. */

export interface Identity {
  readonly name: string;
  readonly role: string;
  readonly since: number;
  readonly addresses: readonly { readonly connector: string; readonly as: string; readonly works: boolean }[];
}

/** How it speaks to a group of people. The first group that fits counts. */
export interface Talking {
  readonly id: string;
  readonly who: string;
  readonly is:
    | { readonly people: "team" }
    | { readonly people: "customers" }
    | { readonly people: "leads" }
    | { readonly people: "anyone" }
    | { readonly domain: string };
  readonly how: string;
  readonly may: string;
  readonly sign: string;
}

export interface Chat {
  readonly id: string;
  readonly title: string;
  readonly with: string;
  readonly where: string;
  readonly last: number;
  readonly state: "working" | "waits" | "quiet";
  readonly waitsFor: string | null;
  readonly under: string | null;
  /** How many lines of the one it was forked from it knows. */
  readonly knew: number | null;
}

export interface ChatLine {
  readonly id: string;
  readonly at: number;
  readonly by: "coworker" | { readonly person: string };
  readonly text: string;
  readonly did: readonly {
    readonly doing: string;
    readonly says: string;
    readonly link: string | null;
    readonly state: "done" | "waits for you" | "refused";
    /** It can show how, in front of the person: what `POST /walk` is sent for this one. */
    readonly showMe?: { readonly doing: string; readonly values: Readonly<Record<string, string>> };
  }[];
  readonly from: readonly { readonly label: string; readonly link: string }[];
}

export interface MayDo {
  readonly doing: string;
  readonly label: string;
  readonly group: string;
  readonly is: Permission;
  readonly from: string;
}

export interface Did {
  readonly id: string;
  readonly at: number;
  readonly says: string;
  readonly with: string | null;
  readonly permission: Permission;
  readonly undo: "can" | "too late" | "cannot";
  readonly link: string | null;
}

export interface Part {
  readonly manager: string;
  readonly part: number;
  readonly used: number;
  readonly perWork: number | null;
}

export interface Coworker {
  /** Which way of talking fits someone: pure. */
  readonly talkingTo: (
    talking: readonly Talking[],
    person: { readonly inside: boolean; readonly customer: boolean; readonly lead: boolean; readonly domain: string },
  ) => Talking;
  /** Its system words: the soul, the way of talking, what it may look at for this person. */
  readonly prompt: (input: {
    readonly identity: Identity;
    readonly soul: string;
    readonly talking: Talking;
    readonly speaksWith: string;
    readonly notes: readonly string[];
    readonly may: readonly string[];
  }) => string;
}
