import type { Thing } from "orthograph";
import { Chat, Thread, Work } from "@coworker/blueprint";
import { proposal } from "./proposal.ts";

export const D6 = proposal({
  id: "D6",
  name: "Threads as forks of a conversation, and fresh checkers",
  what:
    "A thing whose instances are conversations with a model, forked from a parent's lines up to one point, or started " +
    "fresh with only a brief. The lines are a transcript the host keeps, not fields.",
  why:
    "A piece of work has one Pi Harness. Each thread that does is a fork of the work's conversation; each that checks is " +
    "fresh and never saw the doing (spec W5; the audit). A chat's forks share the root chat's storage because Pi forks work " +
    "only inside one storage (inventory, question 3). The blueprint says `under` and `knew` as plain fields, and their " +
    "lines are not in it at all.",
  where:
    "A new module, packages/orthograph/src/modules/conversations, owned by the agents feature (architect H1): " +
    "`Blueprint.conversation(thing, { in, forks, fresh })`. The host keeps the transcript in the store `in` names; a read " +
    "of the thing may ask for `lines`.",
  waits: ["things/thread/thing.ts", "things/chat/thing.ts", "things/chat/verbs/fork.ts", "things/walk/thing.ts"],
});

/** The smallest declaration: whose storage holds the transcript, and how a new one may start. */
export interface Conversation<T extends Thing = Thing> {
  readonly kind: "conversation";
  readonly thing: T;
  /** The actor whose storage holds every fork: a fork never leaves it. */
  readonly in: Thing;
  /** The field naming the parent, and the field counting the parent's lines it knew. */
  readonly forks: { readonly under: keyof T["fields"] & string; readonly knew: keyof T["fields"] & string };
  /** A field and its value that say a new one starts with only a brief: a checker. */
  readonly fresh?: { readonly field: keyof T["fields"] & string; readonly is: string };
}

export const conversation = <T extends Thing>(thing: T, spec: Omit<Conversation<T>, "kind" | "thing">): Conversation<T> => ({
  kind: "conversation",
  thing,
  ...spec,
});

export const threads = conversation(Thread, { in: Work, forks: { under: "under", knew: "knew" }, fresh: { field: "role", is: "checks" } });
export const chats = conversation(Chat, { in: Chat, forks: { under: "under", knew: "knew" } });
