import type { Answer } from "~/modules/directory-client/types.ts";
import type { CommandOutcome, CommandOutput } from "~/modules/protocol/types.ts";

type Kind = CommandOutput["kind"];
type Output<K extends Kind> = Extract<CommandOutput, { readonly kind: K }>;

/** The value of an outcome of the expected kind. Another kind means the server is not the one this page was made for. */
export function answerOf<K extends Kind, T>(outcome: CommandOutcome, kind: K, value: (output: Output<K>) => T): Answer<T> {
  if (!outcome.ok) return { ok: false, error: outcome.error };
  return outcome.output.kind === kind
    ? { ok: true, value: value(outcome.output as Output<K>) }
    : { ok: false, error: { code: "failed", message: "The server gave an unexpected answer" } };
}
