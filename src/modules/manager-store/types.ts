import type { Files, Version } from "~/modules/playbook/types.ts";
import type { Region } from "~/modules/workspace/types.ts";

/*
 * A manager's own Durable Object: what one manager keeps. Everything of it that is not the workspace's (people, keys,
 * intake, the tree) is here, behind these calls and nothing else. Today: who it is and its playbook, version by version.
 * The work, the threads, the runs and the boxes come next, as tables of this object (README).
 */

export interface ManagerRecord {
  readonly id: string;
  readonly workspace: string;
  readonly name: string;
  /** The template its copy came from, and the version of the template then. Null: it was written from nothing. */
  readonly template: { readonly id: string; readonly version: number } | null;
  readonly by: string;
  readonly at: number;
}

export interface OpenManager extends ManagerRecord {
  /** Its own copy of the filled template, version 1. */
  readonly files: Files;
}

export type Opened = { readonly _tag: "Opened" } | { readonly _tag: "AlreadyOpen" };

/** What the workspace asks of one manager's object. Every call is a plain value in, a plain value out. */
export interface ManagerStoreApi {
  /** Once: a second call with another id or the same one changes nothing. */
  open(input: OpenManager): Promise<Opened>;
  /** Undefined until it is opened, so an id nobody made answers nothing. */
  head(): Promise<ManagerRecord | undefined>;
  /** Newest first. */
  versions(): Promise<readonly Version[]>;
  /** The newest when `number` is left out. */
  version(number?: number): Promise<Version | undefined>;
  /** What its template gave and what it is now. */
  copy(): Promise<{ readonly template: ManagerRecord["template"]; readonly given: Files; readonly now: Files } | undefined>;
  /** A new version on top: the one authoritative path for a change of the playbook. Its number is the one after the newest. */
  save(input: {
    readonly files: Files;
    readonly by: string;
    readonly at: number;
    readonly says: string;
    readonly from: Version["from"];
  }): Promise<Version>;
}

/** Where managers' objects are: made in the workspace's jurisdiction and never moved. */
export interface ManagerStores {
  readonly mint: (region: Region) => { readonly objectId: string; readonly store: ManagerStoreApi };
  readonly get: (objectId: string, region: Region) => ManagerStoreApi;
}
