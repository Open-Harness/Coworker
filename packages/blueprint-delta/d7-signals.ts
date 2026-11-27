import type { Event, Move } from "orthograph";
import { AskEvents, threadMachine, workMachine } from "@coworker/blueprint";
import { proposal } from "./proposal.ts";

export const D7 = proposal({
  id: "D7",
  name: "Parked tools woken by signals",
  what:
    "A tool call that parks its thread until a signal comes: a person's answer to an ask, a CI result, a reply in a " +
    "conversation, a time. The signal is an event, maybe from another object, and it names what it wakes.",
  why:
    "A thread that asks a person waits for hours, and its Durable Object sleeps meanwhile (pi-durable's parked tools; the " +
    "audit). The ask is in the workspace's object and the thread in the work's, so the answer must cross objects. CI " +
    "comes from GitHub's webhook. Orthograph has `Blueprint.step.wait()` with nothing to say what ends the wait.",
  where:
    "packages/orthograph/src/modules/operations: `Blueprint.step.wait({ until: signal })`. A new modules/signals for " +
    "`Blueprint.signal(event, { wakes, by })`. host-cloudflare delivers it to the object `by` names, once, by the event's key.",
  waits: ["things/thread/machine.ts (wait, wake)", "things/work/machine.ts (wait, wake)", "things/ask/verbs/answer.ts"],
});

/** The smallest declaration: which event, which move it makes, and the event field naming the instance it wakes. */
export interface Signal {
  readonly kind: "signal";
  readonly on: Event | "ci" | "time";
  readonly wakes: Move;
  readonly by: string;
}

export const signal = (on: Signal["on"], wakes: Move, by: string): Signal => ({ kind: "signal", on, wakes, by });

/** A person answers; the thread that asked goes on. */
export const answered = signal(AskEvents.AskAnswered, threadMachine.moves.wake, "thread");
/** CI says how a pushed branch did; the work that waited for it goes on. */
export const ci = signal("ci", workMachine.moves.wake, "work");
