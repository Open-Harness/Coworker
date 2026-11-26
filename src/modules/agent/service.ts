import type { Agent, AgentDeps, AgentError } from "./types.ts";

const notBuilt = (what: string): AgentError => ({ _tag: "NotBuilt", what: `agent.${what}` });

/** What every caller gets until the loop is built: each call says so, as a value. */
export const noAgent: Agent = {
  open: async () => notBuilt("open"),
  tell: async () => notBuilt("tell"),
  signal: async () => notBuilt("signal"),
  stop: async () => notBuilt("stop"),
  lines: async () => notBuilt("lines"),
  answer: async () => notBuilt("answer"),
  ask: async () => notBuilt("ask"),
  fork: async () => notBuilt("fork"),
  wake: () => ({ active: false, at: null }),
  resume: () => undefined,
};

/** The loop over pi-durable, given what the manager's object holds. Not built. */
export function createAgent(_deps: AgentDeps): Agent {
  return noAgent;
}

/** What went wrong, in the words a person is shown. */
export function saysWhy(error: AgentError): string {
  switch (error._tag) {
    case "NotBuilt":
      return `the agent loop is not built yet (${error.what})`;
    case "OverBudget":
      return `it has spent ${error.spent} of the ${error.limit} dollars it may`;
    case "OutOfTurns":
      return `it took ${error.turns} turns and stopped`;
    default:
      return error.why;
  }
}
