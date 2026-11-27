import type { Store, Thing } from "orthograph";
import { Chat, Thread, Work, Workspace, workspaceStore } from "@coworker/blueprint";
import { proposal } from "./proposal.ts";

export const D2 = proposal({
  id: "D2",
  name: "A projection of an actor into a table",
  what:
    "Some fields of each instance of an actor-backed thing, copied into a table in another store after every commit, so a " +
    "list read can answer from that table.",
  why:
    "One Durable Object per piece of work, but the board, the threads page, the overview and every count list across them " +
    "(inventory, question 2; the audit's decision 2). The compiler refuses a list over actors (F5), so `ortho model` refuses " +
    "`work/verbs/list.ts` and `chat/verbs/list.ts`. The workspace's name is also a row in D1, so a person lists their workspaces.",
  where:
    "packages/orthograph/src/modules/stores: `Blueprint.projection(thing, { into, fields })`. The compiler lets a list read " +
    "a projected thing and answers from the projection; host-cloudflare writes it with an outbox from the actor's commit, so " +
    "the index may lag but never invents a row.",
  waits: ["things/work/verbs/list.ts", "things/chat/verbs/list.ts", "things/thread/verbs/list.ts", "things/workspace/thing.ts"],
});

/** The smallest declaration: which thing, into which store, which fields. The table's name is the file's. */
export interface Projection<T extends Thing = Thing> {
  readonly kind: "projection";
  readonly thing: T;
  readonly into: "database" | Store;
  readonly fields: ReadonlyArray<(keyof T["fields"] & string) | "state">;
}

export const projection = <T extends Thing>(thing: T, spec: Omit<Projection<T>, "kind" | "thing">): Projection<T> => ({
  kind: "projection",
  thing,
  ...spec,
});

/** The board, the rail and the counts. */
export const workIndex = projection(Work, {
  into: "database",
  fields: ["workspace", "manager", "kind", "title", "step", "priority", "order", "answers", "cost", "state"],
});
/** The threads page, as a tree. */
export const threadIndex = projection(Thread, {
  into: "database",
  fields: ["workspace", "work", "agent", "role", "under", "cost", "report", "state"],
});
/** The chats page: inside the workspace's object, not D1, since nothing lists chats across workspaces. */
export const chatIndex = projection(Chat, { into: workspaceStore, fields: ["workspace", "title", "with", "where", "under"] });
/** The workspaces a person can open, from `GET /api/workspaces`. */
export const workspaceIndex = projection(Workspace, { into: "database", fields: ["name", "address", "region", "people", "state"] });
