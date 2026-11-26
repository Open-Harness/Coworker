import type { Item } from "~/modules/intake/types.ts";
import type { Comment } from "~/modules/views-manager/types.ts";
import type { Call } from "./tool.ts";

/* What someone inside said to the work, and a note made on it: a line of the agent's words, proposed for a person to accept (spec O8). */

/** What was heard from someone, kept to answer a note with the right person. */
export interface Heard {
  readonly work: string;
  readonly item: string;
  readonly by: string;
  readonly text: string;
  readonly at: number;
  readonly where: string;
}

const STANDING = new Set(["admin", "write", "inside"]);

/** Whether the workspace knows them: proven to be a person, or a connector says they may write or are inside. Never a bot. */
export const isInside = (item: Item): boolean =>
  !item.actor.bot && (item.actor.person !== undefined || (item.actor.standing !== undefined && STANDING.has(item.actor.standing)));

export const heardOf = (work: string, item: Item, at: number): Heard => ({
  work,
  item: item.id,
  by: item.actor.name,
  text: item.text,
  at,
  where: `${item.place} ${item.thread.slice(item.thread.lastIndexOf("#"))}`,
});

/** The latest thing an inside person said to this work that the thread was told. */
function latestHeard(call: Call): Heard | undefined {
  const told = call.c.store
    .messages(call.thread.id)
    .flatMap((message) => (message.role === "user" && typeof message.content === "string" ? [message.content] : []))
    .join("\n");
  return call.c.store
    .kept("heard")
    .map((row) => row as Heard)
    .filter((row) => row.work === call.work.id && row.text !== "" && told.includes(row.text))
    .at(-1);
}

/** A note made while working on a comment of someone inside is also proposed as a change to what the agent is told. */
export function proposeFrom(call: Call, says: string): void {
  const heard = latestHeard(call);
  const agent = call.playbook.agents.find(({ id }) => id === call.thread.agent);
  if (heard === undefined || agent === undefined) return;
  const id = `cm_${call.id.replaceAll(/[^a-z0-9]/giu, "")}`;
  const was = agent.told;
  const comment: Comment = {
    id,
    on: `agents/${agent.id}/told`,
    part: "Agents",
    by: heard.by,
    at: call.c.clock.now(),
    text: says,
    quote: null,
    became: {
      _tag: "Change",
      change: { line: `agents/${agent.id}/told`, was, becomes: `${was.trimEnd()}\n\n${says}\n` },
      says: `${heard.by} said: ${heard.text}`,
      is: "offered",
      case: null,
    },
  };
  call.c.store.keep("comment", id, comment);
}
