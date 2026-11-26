import type { Blank } from "~/modules/templates/types.ts";
import type { FillView } from "~/modules/views-manager/types.ts";
import type { TemplatesView } from "~/modules/views-workspace/types.ts";
import { at, read, write, type Fixture } from "./read.ts";

/* The library of templates, and the blanks of Work on a repo, with what it found when it read acme/api. Drawn in design/src/screens/new. */

const place = (id: string, ask: string, connector: string): Blank => ({ id, ask, is: { a: "place", connector }, best: null });
const text = (id: string, ask: string, value: string, from: string): Blank => ({ id, ask, is: { a: "text" }, best: { value, from } });
const owner = (from: string, value = "whoever makes it"): Blank => ({
  id: "owner",
  ask: "Who answers for it?",
  is: { a: "person" },
  best: { value, from },
});
const money = (id: string, ask: string, value: string, from: string): Blank => ({
  id,
  ask,
  is: { a: "number", unit: "dollars" },
  best: { value, from },
});
const model = (agent: string, ask: string): Blank => ({
  id: agent,
  ask,
  is: { a: "model", agent },
  best: { value: "inherit", from: "the workspace" },
});

type Row = TemplatesView["templates"][number];
const row = (
  one: Pick<Row, "id" | "version" | "name" | "about" | "needs" | "blanks"> & Partial<Pick<Row, "whose" | "managers" | "saved">>,
): Row => ({
  whose: "ours",
  managers: [],
  saved: null,
  ...one,
});

const COMMON = [text("name", "What is it called?", "", "the template"), owner("you")];
export const TEMPLATES: TemplatesView = {
  templates: [
    row({
      id: "repo",
      version: 5,
      name: "Work on a repo",
      about: "Takes issues on one repo to a merged pull request, or an honest no.",
      needs: ["github"],
      blanks: [
        place("repo", "Which repo?", "github"),
        ...COMMON,
        money("perWork", "Most it may spend on one piece of work", "10", "the template"),
        model("doer", "Which model does the work?"),
      ],
      managers: [
        { id: "coding", name: "Coding", behind: true, on: 4 },
        { id: "api", name: "API", behind: false, on: 5 },
      ],
    }),
    row({
      id: "customers",
      version: 3,
      name: "Answer customers",
      about: "Answers mail and chats, and hands bugs to whoever fixes them.",
      needs: ["email", "whatsapp"],
      blanks: [place("mailbox", "Which mailbox?", "email"), ...COMMON, model("writer", "Which model writes?")],
      managers: [{ id: "support", name: "Support", behind: false, on: 3 }],
    }),
    row({
      id: "calls",
      version: 2,
      name: "Bring in calls",
      about: "Takes a lead from first contact to a booked call.",
      needs: ["email", "crm", "calendar"],
      blanks: [place("mailbox", "Which mailbox?", "email"), ...COMMON, model("writer", "Which model writes?")],
      managers: [{ id: "sales", name: "Sales", behind: false, on: 2 }],
    }),
    row({
      id: "docs",
      version: 2,
      name: "Keep docs true",
      about: "Reads each merge, and changes the docs it made untrue.",
      needs: ["github"],
      blanks: [place("repo", "Which repo?", "github"), ...COMMON],
      managers: [{ id: "docs", name: "Docs", behind: false, on: 2 }],
    }),
    row({
      id: "releases",
      version: 1,
      name: "Cut releases",
      about: "Cuts a release on a set day, and tells the people who wait for it.",
      needs: ["github", "email"],
      blanks: [place("repo", "Which repo?", "github"), ...COMMON],
      managers: [{ id: "releases", name: "Releases", behind: false, on: 1 }],
    }),
    row({
      id: "docs-ours",
      version: 1,
      name: "Docs, our way",
      about: "Keep docs true, with Docs’s own rules for tone and what to leave out.",
      needs: ["github"],
      whose: "this workspace",
      blanks: [place("repo", "Which repo?", "github"), ...COMMON],
      saved: { from: "Docs", at: at("12 Nov 09:00") },
    }),
  ],
};

const REPOS = [
  { id: "acme/web", about: "Coding already works on it" },
  { id: "acme/api", about: "TypeScript. Has tests and CI" },
  { id: "acme/docs", about: "Markdown. No tests" },
] as const;
const OWNERS = [
  { id: "ama", about: null },
  { id: "bo", about: null },
  { id: "chidi", about: null },
] as const;

export const FILL: FillView = {
  template: "repo",
  name: "Work on a repo",
  blanks: [
    { ...place("repo", "Which repo?", "github"), picks: REPOS },
    { ...text("name", "What is it called?", "API", "the repo’s name"), picks: [] },
    { ...owner("the repo: Chidi wrote most of its merged pull requests in the last 90 days", "chidi"), picks: OWNERS },
    { ...money("perWork", "Most it may spend on one piece of work", "20", "the workspace: the same as Coding’s"), picks: [] },
    { ...model("doer", "Which model does the work?"), picks: [] },
    { ...model("reviewer", "Which model reviews it?"), picks: [] },
    { ...model("judge", "Which model judges what comes in?"), picks: [] },
  ],
  found: null,
};

export const FOUND: NonNullable<FillView["found"]> = {
  repo: { name: "acme/api", language: "TypeScript", open: 41, merged90: 212 },
  install: "pnpm install --frozen-lockfile",
  test: "pnpm build, then pnpm check",
  took: { read: 2 * 60_000, ran: 4 * 60_000 },
  ran: { passed: 188, skipped: 2, failed: 0 },
  cannot: ["Run the live tests, which need Ama’s keys", "Push to main", "Read .env files"],
  notSure: ["Deploys. The repo has a deploy script, but no page says who may run it"],
};
export const TRIED: FillView = { ...FILL, found: FOUND };

export const TEMPLATE_READS: readonly Fixture[] = [
  read("/templates", {}, TEMPLATES),
  read("/templates/:template", { template: "repo" }, FILL),
  ["/templates/repo?place=acme/api", TRIED],
  ["/templates/repo?place=acme/web", TRIED],
];
export const TEMPLATE_WRITES: readonly Fixture[] = [
  write("/templates/:template/try", { template: "repo" }, TRIED),
  ["/templates/repo/try?place=acme/api", TRIED],
  ["/templates/repo/try?place=acme/web", TRIED],
];
