import type { Work, WorkEvent } from "~/modules/work/types.ts";
import type { ActivityLine, WorkingDeps } from "../types.ts";
import { agentOf } from "./brief.ts";

/* What the work's page says happened, one line for each event that changed it. The words are the page's, not the event's. */

const first = (text: string): string => text.split("\n")[0]?.trim() ?? "";

/** Who did it, as the page names them: an agent by its role's name, the manager by its own. */
function agentName(c: WorkingDeps, work: Work, thread: string): string {
  const row = c.store.thread(thread);
  const playbook = c.playbook(work.version);
  return (row === undefined || playbook === undefined ? undefined : agentOf(playbook, row.agent)?.name) ?? c.manager.name;
}

export function lineOf(c: WorkingDeps, after: Work, event: WorkEvent, says?: string): ActivityLine | undefined {
  const at = event.at;
  const line = (who: string, text: string): ActivityLine => ({ who, at, text: says ?? text });
  switch (event.is) {
    case "started":
      return line(agentName(c, after, event.thread), "Started working on it.");
    case "said done when":
      return line(c.manager.name, `Said what done means: ${event.checks.map(({ says: one }) => one).join("; ")}.`);
    case "reported":
      return line(agentName(c, after, event.thread), `Said it is ${event.result === "done" ? "done" : event.result}: ${first(event.says)}`);
    case "unanswered":
      return line(c.manager.name, `A thread stopped without saying it was done: ${event.why}`);
    case "checked":
      return line(agentName(c, after, event.thread), `Checked it: ${first(event.says)}`);
    case "heard":
      return line("GitHub", `${event.event.replaceAll("_", " ")} on #${event.from.id}: ${first(event.item)}`);
    case "follows":
      return line(c.manager.name, `Follows #${event.thread.id} too.`);
    case "asked":
      return line(c.manager.name, `Asked ${event.person}.`);
    case "answered":
      return line(event.person, `Answered: ${event.answer}`);
    case "passed":
      return line(event.by === "ci" ? "Checks" : (event.person ?? "GitHub"), `Check ${event.check} passed.`);
    case "failed":
      return line(event.by === "ci" ? "Checks" : (event.person ?? "GitHub"), `Check ${event.check} failed: ${first(event.says)}`);
    case "finished outside":
      return line("GitHub", event.says);
    case "due":
      return line(c.manager.name, `Looked, and it still waits${after.next === null ? "" : ` for ${after.next.what}`}.`);
    case "moved":
      return line(event.person, `Moved it to ${event.step}.`);
    case "stopped":
      return line(event.person, `Stopped it: ${event.why}`);
    case "opened again":
      return line(event.person, `Opened it again: ${event.why}`);
    case "handed over":
      return line(c.manager.name, `Handed it over to ${event.manager}.`);
    case "narrowed":
    case "spent":
      return says === undefined ? undefined : line(c.manager.name, says);
  }
}
