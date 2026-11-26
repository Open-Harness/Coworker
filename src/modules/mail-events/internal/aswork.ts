import type { WorkEvent } from "~/modules/work/types.ts";
import type { Told } from "../types.ts";

/** What was told, as an event of the work that follows the conversation. Everything told is something work can hear. */
export function asWork(told: Told, thread: { readonly account: string; readonly place: string }): WorkEvent | undefined {
  const base = { key: told.key, at: told.at };
  const from = { connector: "email", account: thread.account, place: thread.place, id: told.conversation };
  switch (told.is) {
    case "wrote":
      return { ...base, is: "heard", from, event: "wrote", item: told.mail };
    case "away":
      return { ...base, is: "heard", from, event: "away", item: told.key };
    case "came back":
      return {
        ...base,
        is: "failed",
        by: "connector",
        check: "delivered",
        says: `${told.to ?? "An address"} did not get it: ${told.says}`,
      };
    case "complained":
      return { ...base, is: "failed", by: "connector", check: "delivered", says: `${told.to ?? "The person"} complained about it.` };
  }
}
