import { Via } from "orthograph";
import { proposal } from "./proposal.ts";

export const D4 = proposal({
  id: "D4",
  name: "The co-worker as a principal",
  what:
    "A caller that is an agent acting for one person. Each operation says whether that agent may call it alone (`on`), " +
    "only after a yes (`ask`) or never (`off`), and whether a person must look first (`stops`). An agent never gets more " +
    "than the person it acts for.",
  why:
    "Spec C6: the co-worker can never do what the person asking may not. Spec C10: every doing has `coworker: on | ask | off` " +
    "(the registry's fourth column), and `stops` marks the ones a person must see. Orthograph's `Principal` is a person or " +
    "anonymous, so `workspace/roles.ts` can't tell Bo from Juno acting for Bo. `notVia` is in design prose only " +
    "(agents.md, Today and proposed), and `ask` needs D8.",
  where:
    'packages/orthograph/src/modules/roles: an `agent` principal `{ kind: "agent", agent, for }`, decided by the roles of ' +
    "`for`, so a role's rule is unchanged. modules/operations: `coworker` and `stops` on the spec, and `Blueprint.notVia(" +
    "Via.agent)` as an `allowed` entry that refuses. The generated MCP and SDK tools skip `off` and route `ask` through D8.",
  waits: ["things/workspace/roles.ts", "every verb whose doing is off for the co-worker"],
});

/** The principal Orthograph has, and the one it would add. */
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string }
  | { readonly kind: "agent"; readonly agent: string; readonly for: string; readonly via: typeof Via.agent };

/** What each operation would carry, beside `allowed`. */
export interface ForTheCoworker {
  readonly coworker: "on" | "ask" | "off";
  /** A person sees it before it counts, even when it is on. */
  readonly stops?: true;
}

/** `allowed: [owner.of("workspace"), Blueprint.notVia(Via.agent)]`: a refusal, not a role. */
export interface NotVia {
  readonly kind: "not-via";
  readonly via: Via;
}

export const notVia = (via: Via): NotVia => ({ kind: "not-via", via });

/** The rule C6 adds to every role, whatever its own rule says: the agent is never wider than its person. */
export const neverMoreThanPerson = (personMay: boolean, agentMay: ForTheCoworker["coworker"]): boolean => personMay && agentMay !== "off";

// Three doings, as the registry has them, to show the marks on real operations. The rest are in the registry
// (`src/modules/doings/internal/*.ts`), which Phase 6's check compares with the blueprint.
export const examples = {
  "work.add": { coworker: "on" },
  "soul.save": { coworker: "ask", stops: true },
  "ask.answer": { coworker: "off", stops: true },
} as const satisfies Record<string, ForTheCoworker>;
