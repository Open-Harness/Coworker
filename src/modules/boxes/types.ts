/*
 * One container per piece of work: files stay between commands and between days. `BoxHost` is the outside thing
 * (Cloudflare Containers, or `boxWorld` in testing.ts); `Boxes` is ours, over it. No write credential ever goes in.
 */

export type Size = "1 vCPU · 2 GB" | "2 vCPU · 4 GB" | "4 vCPU · 8 GB";

export interface BoxSpec {
  /** The work's id: the box's name for its whole life. */
  readonly work: string;
  readonly size: Size;
  readonly setUp: string;
  /** Read-only, for one clone. Made for it, gone in an hour. */
  readonly clone: { readonly url: string; readonly token: string; readonly branch: string } | null;
  readonly env: Readonly<Record<string, string>>;
  readonly hosts: readonly string[];
}

export interface Ran {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly seconds: number;
}

export type Opened =
  | { readonly _tag: "Open"; readonly box: BoxHandle; readonly from: "new" | "warm" | "saved" | "bundle" }
  | { readonly _tag: "Unavailable"; readonly why: string };

/** A running container, as the host gives it. Commands run in the clone; paths are relative to it. */
export interface BoxHandle {
  readonly exec: (command: string, options: { readonly seconds: number; readonly env?: Readonly<Record<string, string>> }) => Promise<Ran>;
  readonly read: (path: string) => Promise<string | undefined>;
  readonly write: (path: string, text: string) => Promise<void>;
}

/** The outside thing. */
export interface BoxHost {
  readonly start: (spec: BoxSpec, from: { readonly snapshot: string } | null) => Promise<Opened>;
  readonly find: (work: string) => Promise<BoxHandle | undefined>;
  readonly save: (work: string) => Promise<{ readonly snapshot: string } | undefined>;
  readonly destroy: (work: string) => Promise<void>;
}

/** What leaves a box: a branch, as git bundles it. Checked in a clean one, then pushed for it. */
export interface Bundle {
  readonly repo: string;
  readonly branch: string;
  readonly base: string;
  readonly head: string;
  readonly files: readonly string[];
  readonly bytes: Uint8Array;
}

export type Checked = { readonly _tag: "Fine" } | { readonly _tag: "Refused"; readonly why: string };

/** The push, done outside every box with a token made for it. */
export interface GitPort {
  readonly push: (
    bundle: Bundle,
    token: string,
    options: { readonly force: "only if it is ours" | "no" },
  ) => Promise<{ readonly _tag: "Pushed"; readonly head: string } | { readonly _tag: "Refused"; readonly why: string }>;
}

export interface BoxState {
  readonly state: "none" | "warm" | "saved" | "gone";
  readonly seconds: number;
  readonly snapshot: string | null;
  readonly bundle: string | null;
  readonly lastUsed: number;
}

export interface Boxes {
  /** The same call id gives the same result and never runs twice, also after a crash in the middle. */
  readonly run: (
    work: string,
    call: string,
    command: string,
    seconds: number,
  ) => Promise<Ran | { readonly _tag: "Unavailable"; readonly why: string }>;
  readonly read: (work: string, path: string) => Promise<string | undefined>;
  readonly write: (work: string, call: string, path: string, text: string) => Promise<void>;
  readonly bundle: (work: string, branch: string) => Promise<Bundle | { readonly _tag: "Unavailable"; readonly why: string }>;
  readonly state: (work: string) => Promise<BoxState>;
  /** Ten quiet minutes: saved, and stopped. */
  readonly pause: (work: string) => Promise<void>;
  readonly end: (work: string) => Promise<void>;
}

/** Only its own branch, never the default one, and no workflow files unless the mandate says so. Pure. */
export type CheckBundle = (
  bundle: Bundle,
  rules: { readonly branch: string; readonly defaultBranch: string; readonly workflows: boolean; readonly most: number },
) => Checked;
