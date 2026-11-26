import type { WorkEvent } from "~/modules/work/types.ts";
import type { Told } from "../types.ts";

/* A thing that became true, as an event of the work that follows the item. */

const says = (failed: readonly { readonly name: string; readonly says: string }[]): string =>
  failed.map(({ name, says: why }) => (why === "" ? name : `${name}: ${why}`)).join("; ");

export function asWork(told: Told, thread: { readonly account: string; readonly place: string }): WorkEvent | undefined {
  const base = { key: told.key, at: told.at };
  const from = { connector: "github", account: thread.account, place: thread.place, id: String(told.number) };
  const heard = (event: string, item: string): WorkEvent => ({ ...base, is: "heard", from, event, item });
  switch (told.is) {
    case "said":
      return heard(told.where === "line" ? "line_comment" : "comment", `${told.who.login}: ${told.text}`);
    case "reviewed":
      if (!told.onHead || told.says === "commented") return heard("review", `${told.who.login}: ${told.text}`);
      return told.says === "approved"
        ? { ...base, is: "passed", by: "person", check: "review", person: told.who.login }
        : {
            ...base,
            is: "failed",
            by: "person",
            check: "review",
            says: told.text === "" ? "Changes requested." : told.text,
            person: told.who.login,
          };
    case "taken back":
      return heard("review", `${told.who} took a review back`);
    case "checked":
      return told.ended === "passed"
        ? { ...base, is: "passed", by: "ci", check: "checks" }
        : { ...base, is: "failed", by: "ci", check: "checks", says: says(told.failed) };
    case "conflict":
      return {
        ...base,
        is: "failed",
        by: "connector",
        check: "mergeable",
        says: `It conflicts with its base, at ${told.sha.slice(0, 7)}.`,
      };
    case "ended":
      return told.as === "merged"
        ? { ...base, is: "finished outside", as: "done", says: told.who === null ? "Merged." : `Merged by ${told.who}.` }
        : { ...base, is: "finished outside", as: "no", says: "Closed without merging." };
    case "opened again":
      return heard("pull_request", "It was opened again.");
    case "moved":
    case "ready":
      return undefined;
  }
}
