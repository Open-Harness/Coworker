import type { Move } from "orthograph";
import * as B from "@coworker/blueprint";
import { proposal } from "./proposal.ts";

export const D5 = proposal({
  id: "D5",
  name: "Moves only the loop makes",
  what:
    "A principal that is the system itself, the agent loop or a schedule, and operations only it may call: a thread waits, " +
    "wakes and reports; a piece of work waits and finishes; the co-worker proposes a note or offers a change.",
  why:
    "Every machine here has moves no person presses (the list below). Without a caller for them, they are declared and " +
    "nothing may make them: the blueprint can't say who does. Orthograph's own design names it `Blueprint.system` " +
    "(architect design/frame/examples/agents.md, `run.finish`), and does not build it yet.",
  where:
    "packages/orthograph/src/modules/roles: a built-in `Blueprint.system`, beside `anyone` and `signedIn`, that no session, " +
    "key or agent token carries. The host's loop calls the generated handler with it. The compiler warns on a move that no " +
    "operation names, so a gap like the five below is said out loud.",
  waits: ["every machine.ts with a move in `loop` below"],
});

/** `allowed: [Blueprint.system]`: only the runtime's own loop. */
export const system = { kind: "system" } as const;

/** The moves the loop makes, by thing. Each would be an operation with `allowed: [system]`. */
export const loop = {
  thread: [B.threadMachine.moves.start, B.threadMachine.moves.wait, B.threadMachine.moves.wake, B.threadMachine.moves.report],
  threadEnds: [B.threadMachine.moves.unanswered, B.threadMachine.moves.over],
  work: [B.workMachine.moves.wait, B.workMachine.moves.wake, B.workMachine.moves.finish],
  call: [B.callMachine.moves.make, B.callMachine.moves.end],
  ask: [B.askMachine.moves.ask, B.askMachine.moves.go],
  item: [B.itemMachine.moves.come, B.itemMachine.moves.decide],
  note: [B.noteMachine.moves.propose],
  comment: [B.commentMachine.moves.offer, B.commentMachine.moves.answer, B.commentMachine.moves.makeCase],
  walk: [B.walkMachine.moves.ask, B.walkMachine.moves.find, B.walkMachine.moves.draft],
  trial: [B.trialMachine.moves.tried],
  conversation: [B.conversationMachine.moves.follow, B.conversationMachine.moves.stop],
  account: [B.accountMachine.moves.offline],
  invite: [B.inviteMachine.moves.lapse],
} as const satisfies Record<string, ReadonlyArray<Move>>;

/** Moved by an answer, not by the loop: D8's gate makes these. */
export const byAnswer = [B.callMachine.moves.approve, B.callMachine.moves.refuse] as const;

/**
 * A person's moves that no doing presses yet. They are not the loop's: each is a gap the screens leave. Taking an invite
 * happens on sign-in, which better-auth owns.
 */
export const noDoingYet = {
  "account.giveBack": B.accountMachine.moves.giveBack,
  "invite.take": B.inviteMachine.moves.take,
  "trigger.on": B.triggerMachine.moves.on,
  "walk.throw": B.walkMachine.moves.throw,
  "walk.carry": B.walkMachine.moves.carry,
} as const satisfies Record<string, Move>;
