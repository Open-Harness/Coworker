import type { Move, Thing } from "orthograph";
import { Ask, Call, callMachine } from "@coworker/blueprint";
import { proposal } from "./proposal.ts";

export const D8 = proposal({
  id: "D8",
  name: "Approval as a gate before a tool runs",
  what:
    "Before an action runs, the gate reads its permission: `on` runs it, `off` refuses it, `ask` makes an ask and parks " +
    "the call until the answer. A yes moves the call to running, a no to refused.",
  why:
    "Spec H3 and A3: an action set to ask waits for a person's yes. An always-answer (`ask.always`, spec A6) lets the gate " +
    "say yes alone next time. It is pi-durable's `beforeTool` with a signal (D7), and every action goes through one door " +
    "(the audit). The co-worker's own `ask` doings (D4) are the same gate on an operation.",
  where:
    "A new modules/gates: `Blueprint.gate(thing, { permission, asks, yes, no, rules })`. The agents feature runs it in " +
    "`beforeTool`; the compiler checks `yes` and `no` start from the state the ask leaves the call in.",
  waits: ["things/call/machine.ts", "things/ask/verbs/approve.ts", "things/rule/thing.ts"],
});

/** The smallest declaration: where the permission is, what to ask, and the two moves the answer makes. */
export interface Gate<T extends Thing = Thing> {
  readonly kind: "gate";
  readonly thing: T;
  readonly permission: keyof T["fields"] & string;
  readonly asks: Thing;
  readonly yes: Move;
  readonly no: Move;
}

export const gate = <T extends Thing>(thing: T, spec: Omit<Gate<T>, "kind" | "thing">): Gate<T> => ({ kind: "gate", thing, ...spec });

export const beforeAction = gate(Call, {
  permission: "permission",
  asks: Ask,
  yes: callMachine.moves.approve,
  no: callMachine.moves.refuse,
});
