import type { Answer } from "~/modules/api/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { carryOn } from "./chat-approved.ts";
import { answerAsk } from "./inbox.ts";

/** A person's answer to an ask: kept and told as any answer is, and what the co-worker waited to do for it is done now, if it was a yes. */
export async function answering(c: ConsoleDeps, ask: string, body: unknown): Promise<Answer<unknown>> {
  const answered = await answerAsk(c, ask, body);
  const said = typeof body === "object" && body !== null ? (body as Record<string, unknown>)["answer"] : undefined;
  if (answered._tag === "Ok" && typeof said === "string" && (answered.value as { _tag?: string })._tag === "Answered")
    await carryOn(c, ask, said);
  return answered;
}
