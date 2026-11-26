import { githubEvents } from "~/modules/github-events/service.ts";
import type { ThreadRef, WorkEvent } from "~/modules/work/types.ts";
import type { News } from "../types.ts";

/* What became true of a conversation, as it moves the work that follows it. `says` is how the work's page puts it. */

export interface ToWork {
  readonly event: WorkEvent;
  readonly says?: string;
}

const join = (names: readonly string[]): string => names.join(", ");

/**
 * `own`: the conversation is the work's own issue, and the work has a pull request: the pull request's end is the work's, and an issue
 * that is closed because it was merged is not a second end. Speech (a comment, a review) is not here: intake judges it.
 */
export function toWork(news: News, thread: ThreadRef, own: boolean, hasPull: boolean): readonly ToWork[] {
  const { told } = news;
  const base = githubEvents.asWork(told, thread);
  if (base === undefined) return [];
  const heard = (event: string, item: string): ToWork => ({
    event: { key: `${told.key}:heard`, at: told.at, is: "heard", from: thread, event, item },
  });
  switch (told.is) {
    case "checked":
      if (told.ended === "passed")
        return [{ event: base, says: `Check ${join(news.passed.length === 0 ? ["checks"] : news.passed)} passed.` }];
      return [
        { event: base, says: `Check ${join(told.failed.map(({ name }) => name))} failed.` },
        heard("check", join(told.failed.map(({ name, says }) => (says === "" ? `${name} failed` : `${name} failed: ${says}`)))),
      ];
    case "conflict":
      return [
        { event: base, says: "It no longer merges: main moved." },
        heard("conflict", `It conflicts with main, at ${told.sha.slice(0, 7)}.`),
      ];
    case "ended": {
      if (own && hasPull) return [];
      if (told.as === "closed") return [{ event: base, says: "Closed without merging." }];
      const by = told.who === null ? "" : ` by ${told.who}`;
      const says = `Merged #${news.number}${by}.`;
      return base.is === "finished outside" ? [{ event: { ...base, says }, says }] : [];
    }
    // What people said reaches the work through intake, which judges who may ask. Learned by asking GitHub, it is told here.
    case "said":
    case "reviewed":
    case "taken back":
      if (!news.asked) return [];
      if (base.is === "heard") return [{ event: base }];
      return [{ event: base }, heard("review", told.is === "reviewed" ? `${told.who.login}: ${told.text}` : "A review was taken back")];
    case "moved":
    case "opened again":
    case "ready":
      return [];
  }
}
