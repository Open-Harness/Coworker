import type { Conversation, Entry } from "~/modules/views-connector/types.ts";
import { at } from "./read.ts";

/* Small makers for what the connectors' own views are given: a conversation's stream, oldest first. Times are the story's, 25 Nov 2026. */

export const inn = (
  id: string,
  when: string,
  by: string,
  address: string,
  text: string,
  files: readonly { readonly name: string; readonly link: string }[] = [],
): Entry => ({
  id,
  at: at(when),
  is: "in",
  by,
  address,
  text,
  files,
});
export const out = (id: string, when: string, by: string, text: string, person = false, sent = true): Entry => ({
  id,
  at: at(when),
  is: "out",
  by,
  person,
  text,
  sent,
});
export const note = (id: string, when: string, text: string, link: string | null = null): Entry => ({
  id,
  at: at(when),
  is: "note",
  text,
  link,
});

interface Seed {
  readonly id: string;
  readonly with: string;
  readonly address: string;
  readonly subject?: string;
  readonly preview: string;
  readonly when: string;
  readonly unread?: number;
  readonly waits: Conversation["waits"];
  readonly tags?: readonly string[];
  readonly work?: readonly [string, string];
  readonly thread?: string;
  readonly person?: string;
  readonly last?: Conversation["lastIs"];
  readonly group?: number;
  readonly saved?: boolean;
  readonly stopped?: boolean;
}

export const conversation = (seed: Seed): Conversation => ({
  id: seed.id,
  with: seed.with,
  address: seed.address,
  subject: seed.subject ?? "",
  preview: seed.preview,
  at: at(seed.when),
  unread: seed.unread ?? 0,
  waits: seed.waits,
  tags: seed.tags ?? [],
  work: seed.work?.[0] ?? null,
  workTitle: seed.work?.[1] ?? null,
  lastIs: seed.last ?? "them",
  thread: seed.thread ?? null,
  has: seed.person === undefined ? "manager" : { person: seed.person },
  group: seed.group ?? null,
  saved: seed.saved ?? true,
  stopped: seed.stopped ?? false,
});
