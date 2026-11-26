import type { SharedView } from "~/modules/views-workspace/types.ts";
import { BO_FILES } from "./settings-skill-files.ts";
import { c, skill, v } from "./settings-skills-kit.ts";
import { at } from "./read.ts";
import { LIBRARY } from "./settings-skills-library.ts";

/* The skill library, in four layers: this workspace's own first, then ours. */
export const SKILLS: SharedView["skills"] = [
  skill(
    {
      id: "sales",
      name: "Sales",
      layer: "playbook",
      says: "What this manager is for and how it works. The page you are in",
      from: "here",
      madeFor: "Sales",
    },
    [["Sales", "The manager"]],
    6,
    null,
    false,
    undefined,
    [
      v(6, at("23 Nov 12:00"), "Juno", "Reminders: at most two, then ask Bo"),
      v(5, at("9 Nov 12:00"), "Bo Larsen", "Look up before writing"),
    ],
    [],
  ),
  skill(
    {
      id: "bos-voice",
      name: "Bo’s way of writing",
      layer: "craft",
      says: "How Bo opens, asks and ends. From 212 sent mails",
      from: "here",
      madeFor: "Sales",
    },
    [["Sales", "Writer"]],
    2,
    { without: 0.22, with: 0.46, of: null },
    false,
    BO_FILES,
    [
      v(2, at("5 Oct 12:00"), "Bo Larsen", "No greeting line. Opens with the fact"),
      v(1, at("5 Oct 12:00"), "Juno", "Made from 212 sent mails"),
    ],
    [
      c("Moat Dental asked about 10 seats", "Bo rewrote the opening", "Sent unchanged"),
      c("Dunmore Farms asked about export", "Bo cut a greeting", "Sent unchanged"),
      c("Kite Studio, quiet for three days", "Bo rewrote it", "Bo rewrote it"),
    ],
  ),
  skill(
    {
      id: "sign",
      name: "Spot a sign",
      layer: "craft",
      says: "What counts as a company that needs us now, and what only looks like it",
      from: "here",
      madeFor: "Sales",
    },
    [["Sales", "Researcher"]],
    1,
    { without: 0.51, with: 0.86, of: null },
    false,
    undefined,
    [v(1, at("5 Oct 12:00"), "Juno", "Made from 22 past leads")],
    [
      c("Brook Hotels opened two sites", "Not noticed", "Asked Bo to write"),
      c("Arden Glass, first head of operations", "Not noticed", "Asked Bo to write"),
      c("Pike & Sons raised money", "Asked Bo to write", "Left alone"),
    ],
  ),
  skill(
    {
      id: "company",
      name: "Read a company",
      layer: "craft",
      says: "Where to look, in which order, and when to stop",
      from: "here",
      madeFor: "Sales",
    },
    [
      ["Sales", "Researcher"],
      ["Coding", "Fixer"],
    ],
    3,
    { without: 0.74, with: 0.88, of: null },
    false,
    undefined,
    [
      v(3, at("30 Oct 12:00"), "Bo Larsen", "Stop after four pages"),
      v(2, at("14 Oct 12:00"), "Juno", "Look at the news before the site"),
      v(1, at("2 Oct 12:00"), "Ama Mensah", "First version"),
    ],
    [
      c("Holt Print, 55 people, one order system", "Asked Bo, no fit", "Dropped: does not fit"),
      c("Brook Hotels opened two sites", "Two facts, no source", "Three facts with sources"),
    ],
  ),
  skill(
    {
      id: "short-mail",
      name: "A short mail",
      layer: "craft",
      says: "One thing, one question, nothing else",
      from: "library",
      madeFor: null,
    },
    [["Sales", "Writer"]],
    1,
    { without: 0.39, with: 0.46, of: null },
    false,
    undefined,
    [v(1, null, "Co-worker", "Comes with the library")],
    [
      c("Ferry Lane, quiet for three days", "74 words, two questions", "28 words, one question"),
      c("Kite Studio, quiet for three days", "61 words", "31 words"),
    ],
  ),
  skill(
    {
      id: "source",
      name: "Read against the source",
      layer: "craft",
      says: "Check each sentence against where it came from",
      from: "library",
      madeFor: null,
    },
    [
      ["Sales", "Reader"],
      ["Coding", "Fresh checker"],
      ["Support", "Reader"],
    ],
    1,
    { without: 5, with: 9, of: 11 },
    false,
    undefined,
    [v(1, null, "Co-worker", "Comes with the library")],
    [c("A figure that is not in the page", "Went out", "Sent back"), c("A date from last year", "Went out", "Sent back")],
  ),
  skill(
    { id: "objections", name: "Answer a doubt", layer: "craft", says: "What to say when they hesitate", from: "library", madeFor: null },
    [],
    1,
    { without: 0.46, with: 0.46, of: null },
    true,
    undefined,
    [v(1, null, "Co-worker", "Comes with the library")],
    [c("A doubt about price", "Bo changed it", "Bo changed it"), c("A doubt about timing", "Sent unchanged", "Sent unchanged")],
  ),
  ...LIBRARY,
];
