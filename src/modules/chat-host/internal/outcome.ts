import type { CommandErrorCode, CommandOutcome, CommandOutput } from "~/modules/protocol/types.ts";
import type { ChatResult } from "~/modules/chats/types.ts";

export const done: CommandOutcome = { ok: true, output: { kind: "done" } };
export const succeeded = (output: CommandOutput): CommandOutcome => ({ ok: true, output });
export const refused = (code: CommandErrorCode, message: string): CommandOutcome => ({
  ok: false,
  error: { code, message },
});
export const refusedBy = (result: Extract<ChatResult<unknown>, { readonly ok: false }>): CommandOutcome =>
  refused(result.reason === "not_found" ? "not_found" : "rejected", result.message);
