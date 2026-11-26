import { head } from "./managers-kit.ts";
import { read, type Fixture } from "./read.ts";

/* Coding's own Settings, as drawn: a part of the $100 a day, $20 for one piece of work, the workspace's model, 8 open pieces of work. */

export const CODING_SETTINGS: Fixture = read(
  "/m/:manager/settings",
  { manager: "coding" },
  {
    head: head("coding"),
    answers: "ama",
    people: [
      { id: "ama", name: "Ama Mensah", role: "Owner", initials: "AM" },
      { id: "bo", name: "Bo Larsen", role: "Builder", initials: "BL" },
      { id: "chidi", name: "Chidi Okafor", role: "Member", initials: "CO" },
    ],
    model: "inherit",
    workspace: { model: { connection: "anthropic", model: "sonnet", thinking: "medium" }, perDay: 100 },
    limits: { perDay: 30, perWork: 20 },
    below: ["Docs", "Releases"],
    running: 4,
    waiting: 2,
    openWork: 8,
    template: null,
  },
);
