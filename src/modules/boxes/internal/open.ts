import type { BoxHandle, BoxHost, BoxSpec } from "../types.ts";
import type { Clock } from "~/modules/clock/types.ts";
import { readBox, writeBox } from "./tables.ts";

/** What a work's container is made from: its spec, and the default branch that a bundle is measured from. Found when it is needed, so a token is never kept. */
export interface Place {
  readonly spec: BoxSpec;
  readonly repo: string;
  readonly base: string;
}

export type Found = { readonly _tag: "Place"; readonly place: Place } | { readonly _tag: "Unavailable"; readonly why: string };

export interface Opening {
  readonly sql: SqlStorage;
  readonly host: BoxHost;
  readonly clock: Clock;
  readonly place: (work: string) => Promise<Found>;
}

export type Ready =
  | { readonly _tag: "Ready"; readonly box: BoxHandle; readonly place: Place }
  | { readonly _tag: "Unavailable"; readonly why: string };

/**
 * The box of a work, as it is now: the one that is running, else one started from what was saved, else a new clone. A box
 * that was lost costs time only: the clone is of the work's branch, which is where its last push left it.
 */
export async function ready({ sql, host, clock, place }: Opening, work: string): Promise<Ready> {
  const found = await place(work);
  if (found._tag === "Unavailable") return found;
  const there = await host.find(work).catch(() => undefined);
  if (there !== undefined) {
    writeBox(sql, work, { state: "warm" }, clock.now());
    return { _tag: "Ready", box: there, place: found.place };
  }
  const saved = readBox(sql, work).snapshot;
  const opened = await host.start(found.place.spec, saved === null ? null : { snapshot: saved });
  if (opened._tag === "Unavailable") return opened;
  writeBox(sql, work, { state: "warm", ...(opened.from === "saved" ? {} : { snapshot: null }) }, clock.now());
  return { _tag: "Ready", box: opened.box, place: found.place };
}
