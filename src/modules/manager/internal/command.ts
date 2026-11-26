import type { ToolRegistration } from "@earendil-works/pi-durable";
import { obj, str } from "@earendil-works/pi-schema";
import type { ExecOutcome } from "~/modules/sandboxes/types.ts";
import type { ToolEffects } from "./asking.ts";
import { BoardDoc, ProfileDoc } from "./state.ts";

const MAX_OUTPUT = 8_000;

const said = (outcome: ExecOutcome | { readonly _tag: "NotProvisioned" }): { readonly text: string; readonly failed: boolean } => {
  switch (outcome._tag) {
    case "Ran": {
      const { exitCode, stdout, stderr } = outcome.output;
      const text = [`Exit ${exitCode} in ${outcome.environment}.`, stdout, stderr].filter((part) => part !== "").join("\n");
      return { text: text.slice(0, MAX_OUTPUT), failed: exitCode !== 0 };
    }
    case "NoEnvironment":
      return { text: `The environment this run of ${outcome.agent} started in was deleted, so it can run no more commands`, failed: true };
    case "MissingSecret":
      return { text: `The environment names the secret ${outcome.name}, which the vault does not have`, failed: true };
    case "SetupFailed":
      return { text: `The environment's setup failed:\n${outcome.output}`.slice(0, MAX_OUTPUT), failed: true };
    case "Unavailable":
      return { text: `Sandboxes are unavailable: ${outcome.reason}`, failed: true };
    case "Stopped":
      return { text: outcome.reason, failed: true };
    case "NotProvisioned":
      return { text: "The workspace is gone", failed: true };
  }
};

/**
 * Runs a shell command in the run's agent's environment. The Workspace object opens the secrets the environment names
 * and hides their values in what comes back, so the run never sees one.
 */
export const commandTool = (effects: ToolEffects): ToolRegistration => ({
  name: "run_command",
  description: "Run a shell command in your environment: a container made from its setup. Say what you ran in your report.",
  parameters: obj({ command: str({ minLength: 1, maxLength: 4_000 }) }),
  replay: "safe",
  execute: async (args: { command: string }, api, context) => {
    const found = await api.commit(async (tx) => {
      const board = await tx.doc(BoardDoc);
      const run = Object.values(board.runs).find(({ conversationId }) => conversationId === Number(api.conversationId));
      const profile = (await tx.doc(ProfileDoc)).profile;
      if (run === undefined || profile === undefined) return undefined;
      // Copied: a value read in a transaction is not usable after it.
      const thread: unknown = JSON.parse(JSON.stringify(board.tasks[run.task]?.replyTo ?? null));
      const saved = run.saved !== undefined;
      return { run: { id: run.id, agent: run.agent, thread, saved, environment: run.saved?.environment ?? null }, profile: { ...profile } };
    }, context);
    if (found === undefined) return { output: [{ type: "text", text: "This conversation is not a run." }], isError: true };
    const { run, profile } = found;
    const outcome = await effects.workspace(profile).sandbox({
      agent: run.agent,
      ...(run.saved ? { environment: run.environment } : {}),
      command: args.command,
      managerId: profile.managerId,
      run: run.id,
      thread: run.thread,
    });
    const { text, failed } = said(outcome);
    return { output: [{ type: "text", text }], isError: failed };
  },
});
