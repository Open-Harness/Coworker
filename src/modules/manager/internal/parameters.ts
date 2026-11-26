import { arr, bool, int, obj, opt, str } from "@earendil-works/pi-schema";

import { BOARD_PARAMETERS } from "./parameters-board.ts";

const BASE = int({ description: "The page's updatedAt as you read it. The save is refused when the page changed since" });
const task = str({ description: "The task, such as DT-14" });

/** The input of each action the manager can carry out. An action with none here has no handler yet, and is not offered. */
export const PARAMETERS: Readonly<Record<string, object>> = {
  ...BOARD_PARAMETERS,
  "board.read": obj({}),
  "task.read": obj({ task }),
  "task.create": obj({
    title: str({ minLength: 1, maxLength: 200 }),
    description: opt(str({ maxLength: 10_000 })),
    lane: opt(str({ description: "A lane id. Omit for the first lane" })),
  }),
  "task.update": obj({ task, title: opt(str({ minLength: 1, maxLength: 200 })), description: opt(str({ maxLength: 10_000 })) }),
  "task.move": obj({ task, lane: str({ description: "A lane id or name" }) }),
  "task.delete": obj({ task }),
  "mission.read": obj({}),
  "mission.update": obj({ body: str({ description: "The whole new mission page, in Markdown" }), base: opt(BASE) }),
  "page.create": obj({
    title: str({ minLength: 1, maxLength: 120 }),
    body: str(),
    parent: opt(str({ description: "Omit for the mission page" })),
  }),
  "page.update": obj({ page: str(), title: opt(str({ minLength: 1, maxLength: 120 })), body: opt(str()), base: opt(BASE) }),
  "run.start": obj({
    task,
    role: str({ minLength: 1, maxLength: 60, description: "What the agent is on this task for: writer, reviewer, fixer" }),
    agent: opt(str({ description: "A workspace agent. Omit for the default one" })),
    brief: opt(str({ maxLength: 10_000, description: "What to do, beyond the task itself" })),
  }),
  "run.read": obj({ run: str({ description: "The run, such as run-3" }) }),
  "run.stop": obj({ run: str({ description: "The run to stop, such as run-3" }) }),
  "triage.accept": obj({
    trigger: str({ description: "The Trigger id from the candidate" }),
    title: opt(str({ minLength: 1, maxLength: 200, description: "Omit to use the subject" })),
    lane: opt(str({ description: "A lane id. Omit for the first lane" })),
  }),
  "triage.attach": obj({ trigger: str(), task }),
  "triage.ignore": obj({
    trigger: str(),
    reason: str({ maxLength: 500 }),
    wouldAccept: opt(bool({ description: "Observe mode: you would have accepted it" })),
  }),
  "reply.thread": obj({ task, text: str({ minLength: 1, maxLength: 10_000 }) }),
  "question.ask": obj({
    id: str({ minLength: 1, maxLength: 80, description: "Your own id for the question. Asking again with the same id asks once" }),
    question: str({ minLength: 1, maxLength: 2_000 }),
    to: opt(str({ description: "The person's email. Omit for the manager's owner" })),
    options: opt(arr(str({ maxLength: 80 }), { maxItems: 6 })),
    task: opt(task),
    context: opt(str({ maxLength: 2_000, description: "What the person is deciding and why you will not decide alone" })),
    facts: opt(
      arr(obj({ text: str({ maxLength: 500 }), source: opt(str({ description: "A task id such as DT-14, or a page id or title" })) }), {
        maxItems: 8,
      }),
    ),
    choices: opt(
      arr(
        obj({
          label: str({ minLength: 1, maxLength: 80 }),
          next: opt(arr(str({ maxLength: 200 }), { maxItems: 5, description: "What you do next if the person picks this" })),
          risk: opt(str({ maxLength: 300 })),
          cost: opt(str({ maxLength: 300 })),
        }),
        { maxItems: 6, description: "Options with detail. Their labels are the options; use this or options" },
      ),
    ),
    recommend: opt(obj({ option: str({ maxLength: 80 }), why: str({ maxLength: 500 }) })),
    links: opt(arr(str(), { maxItems: 8, description: "Task ids or page ids to look at" })),
  }),
};
