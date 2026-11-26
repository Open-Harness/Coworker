import type { ChatView } from "~/modules/views-workspace/types.ts";
import { MONDAY, NOTE, OCTOBER, SUPPORT } from "./workspace-chats.ts";
import { at, read, type Fixture } from "./read.ts";

type Line = ChatView["lines"][number];
const ama = { person: "ama" } as const;
const line = (id: string, when: string, by: Line["by"], text: string, calls: Line["calls"] = []): Line => ({
  id,
  at: at(when),
  by,
  text,
  did: [],
  from: [],
  calls,
});

/** "Why is Support slower?", and its forks as they hang under it. */
export const SUPPORT_LINES: readonly Line[] = [
  line("l1", "25 Nov 09:18", ama, "Why is Support slower this week?"),
  line(
    "l2",
    "25 Nov 09:18",
    "coworker",
    "Two things. WhatsApp messages grew by a third, and the number has been offline since 08:10. Median is 3.1 hours; the aim is 2.",
    [
      { name: "objective.read", target: "Support", state: "done", took: 0.2 },
      { name: "connector.read", target: "WhatsApp", state: "done", took: 0.4 },
    ],
  ),
  line("l3", "25 Nov 09:22", ama, "And if the number had stayed up?"),
  line(
    "l4",
    "25 Nov 09:22",
    "coworker",
    "Then about 2.4 hours. Still over. Version 5 of Support answers the short ones first; I’m trying it on 40 past mails now.",
  ),
  line("l5", "25 Nov 09:30", ama, "Good. Tell me when it is done."),
  line("l6", "25 Nov 09:31", "coworker", "I will, here. 12 of 40 so far: 2 better, 10 the same.", [
    { name: "manager.try", target: "Support, version 5", state: "running", took: null },
  ]),
];
/** What was said in the fork, after the six lines it knew. */
export const OCTOBER_LINES: readonly Line[] = [
  line("f1", "25 Nov 09:45", ama, "In here: was October the same, or is this new?"),
  line("f2", "25 Nov 09:46", "coworker", "Reading October’s 840 mails. I’ll leave the other chat alone and only bring back the answer.", [
    { name: "event.read", target: "Support, October", state: "running", took: null },
  ]),
];

export const CHAT: readonly Fixture[] = [
  read(
    "/chats/:chat",
    { chat: "support" },
    {
      chat: SUPPORT,
      lines: SUPPORT_LINES,
      forks: [
        { ...OCTOBER, replies: 2 },
        { ...NOTE, replies: 4 },
      ],
    },
  ),
  read("/chats/:chat", { chat: "october" }, { chat: OCTOBER, lines: OCTOBER_LINES, forks: [] }),
  read("/chats/:chat", { chat: "note" }, { chat: NOTE, lines: [], forks: [] }),
  read("/chats/:chat", { chat: "monday" }, { chat: MONDAY, lines: [], forks: [] }),
];
