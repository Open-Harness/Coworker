import { walkthroughs } from "~/modules/walkthrough/service.ts";
import type { WalkEvent, Walkthrough } from "~/modules/walkthrough/types.ts";
import type { Said, SetUpDeps } from "../types.ts";

/** One event, if code says it may be: checked in words first, made when it is a yes, and only then kept. */
export async function step(deps: SetUpDeps, walk: Walkthrough, event: WalkEvent): Promise<Said> {
  const walked = walkthroughs.walk(walk, event);
  if (walked._tag === "Refused") return walked;
  const draft = event.is === "drafted" || event.is === "edited" ? walked.walk.draft : null;
  if (draft !== null) {
    const problems = await deps.problems(draft);
    if (problems.length > 0) return { _tag: "Refused", why: `The draft cannot be made as it is: ${problems.slice(0, 5).join(" ")}` };
  }
  if (walked.does.includes("make manager")) {
    const made = await deps.make(walked.walk);
    if (made._tag === "Refused") return made;
  }
  if (event.is === "could carry") await deps.comment({ manager: event.manager, text: event.change, by: "Juno" });
  await deps.walks.put(walked.walk);
  return { _tag: "Said", walk: walked.walk };
}
