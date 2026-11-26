import type { Playbook, AgentRole } from "~/modules/playbook/types.ts";
import { threads } from "~/modules/threads/service.ts";
import type { Brief } from "~/modules/threads/types.ts";
import type { Work } from "~/modules/work/types.ts";
import type { Message, Outside, Store, ThreadRow } from "../types.ts";
import { commentsOf, issueOf } from "./github.ts";

/* What an agent is told when its thread begins: the page, its words, its skills, the work, the thread so far, and what to do. */

const BOT = /\[bot\]$/u;

/** The conversation as it stands on the issue or the pull request, oldest first. Where GitHub cannot be asked, what came in with the work. */
async function conversation(outside: Outside, work: Work): Promise<Brief["thread"]> {
  if (work.from.connector !== "github") return [];
  const number = Number(work.from.id);
  const [issue, comments] = await Promise.all([issueOf(outside, work.from.place, number), commentsOf(outside, work.from.place, number)]);
  const opening = issue === undefined ? [] : [{ by: issue.by, at: 0, text: `${issue.title}\n\n${issue.body}`.trim() }];
  const said = (comments ?? []).filter((one) => !BOT.test(one.by)).map((one, at) => ({ by: one.by, at: at + 1, text: one.text }));
  return [...opening, ...said];
}

/** What the agents of this work said when they reported, so that a later thread of the same agent knows what its earlier one did. */
function notesOf(store: Store, work: string, agent: string, now: string): readonly string[] {
  return store
    .threadsOf(work)
    .filter((one) => one.agent === agent && one.id !== now && one.said !== "")
    .map((one) => one.said);
}

export function agentOf(playbook: Playbook, id: string): AgentRole | undefined {
  return playbook.agents.find((agent) => agent.id === id);
}

/** The first two messages of a thread. Nothing else is told it. */
export async function opening(
  store: Store,
  outside: Outside,
  playbook: Playbook,
  work: Work,
  row: ThreadRow,
  agent: AgentRole,
  todo: string,
): Promise<readonly Message[]> {
  const brief: Brief = {
    role: row.role,
    page: playbook.page,
    agent: { name: agent.name, told: agent.told },
    skills: agent.skills.flatMap((id) => {
      const skill = playbook.skills.find((one) => one.id === id);
      return skill === undefined ? [] : [{ id: skill.id, says: skill.says }];
    }),
    work: { id: work.id, title: work.title, about: work.about, doneWhen: work.doneWhen, step: row.step },
    place:
      work.from.connector === "github"
        ? {
            says: `The repository ${work.from.place}. Your box has a clone of it on the branch of this work, and commands run in it.`,
            files: {},
          }
        : null,
    thread: await conversation(outside, work),
    notes: row.role === "does" ? notesOf(store, work.id, row.agent, row.id) : [],
    todo,
  };
  const { system, user } = threads.prompt(brief);
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
