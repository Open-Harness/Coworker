import type { Store, Thing } from "orthograph";
import { Work, Workspace, workStore, workspaceStore } from "@coworker/blueprint";
import { proposal } from "./proposal.ts";

export const D3 = proposal({
  id: "D3",
  name: "A store inside another thing's actor",
  what:
    "Rows kept in the SQLite of one instance of an actor-backed thing, chosen by a field of the row that names that " +
    "instance: every manager row is inside its workspace's object, every thread row inside its work's object.",
  why:
    "Most of Co-worker's state is rows inside two kinds of object (inventory, Where state lives). The workspace's object " +
    "holds the co-worker, the managers, playbooks, intake, asks and the audit table, so intake can be one serial place " +
    "(spec I5). A work's object holds its threads, calls and conversations beside its one Pi Harness. Today the blueprint " +
    'says `Blueprint.store.kind("actor.of.workspace")`, which `ortho model` refuses: no host supplies it.',
  where:
    "packages/orthograph/src/modules/stores: `Blueprint.store.inside(Thing)`. The compiler checks that each thing in it has " +
    "a field that is that thing's id, and that a step writes one instance's store. host-cloudflare routes the write to that " +
    "object. The vault is a third kind, `Blueprint.store.vault()`, whose fields are all secret.",
  waits: ["stores/workspace.ts", "stores/work.ts", "stores/vault.ts", "every thing that sets lives: to one of them"],
});

/** The smallest declaration: a store whose instance is the one the row's `by` field names. */
export interface Inside<T extends Thing = Thing> extends Store<`actor.of.${string}`> {
  readonly inside: T;
  /** The field every row in it carries, naming the instance: `workspace`, `work`. */
  readonly by: string;
}

export const inside = <T extends Thing>(thing: T, by: string): Inside<T> => ({ kind: "store", of: `actor.of.${by}`, inside: thing, by });

export const insideWorkspace = inside(Workspace, "workspace");
export const insideWork = inside(Work, "work");

// The stores the blueprint declares today, and what they would become: the `of` strings already match.
export const today = { workspace: workspaceStore.of, work: workStore.of } as const;
