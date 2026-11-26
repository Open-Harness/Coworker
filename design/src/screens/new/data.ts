/* Templates, and the blanks of one of them. Used by Settings > Templates and by New manager. */

/** A template: a playbook with blanks. `of`: managers made from it, none or more, each with its own copy. */
export interface Template {
  readonly id: string; readonly name: string; readonly about: string; readonly connectors: readonly string[];
  readonly ours: boolean; readonly saved?: string; readonly version: number;
  readonly of: readonly string[]; readonly more?: number; readonly behind?: string;
}
export const TEMPLATES: readonly Template[] = [
  { id: "repo", name: "Work on a repo", about: "Takes issues on one repo to a merged pull request, or an honest no.", connectors: ["GitHub"], ours: true, version: 5, of: ["Coding"], more: 1, behind: "Coding is on 4" },
  { id: "customers", name: "Answer customers", about: "Answers mail and chats, and hands bugs to whoever fixes them.", connectors: ["Email", "WhatsApp"], ours: true, version: 3, of: ["Support"] },
  { id: "calls", name: "Bring in calls", about: "Takes a lead from first contact to a booked call.", connectors: ["Email", "CRM", "Calendar"], ours: true, version: 2, of: ["Sales"] },
  { id: "docs", name: "Keep docs true", about: "Reads each merge, and changes the docs it made untrue.", connectors: ["GitHub"], ours: true, version: 2, of: ["Docs"] },
  { id: "releases", name: "Cut releases", about: "Cuts a release on a set day, and tells the people who wait for it.", connectors: ["GitHub", "Email"], ours: true, version: 1, of: ["Releases"] },
  { id: "docs-ours", name: "Docs, our way", about: "Keep docs true, with Docs’s own rules for tone and what to leave out.", connectors: ["GitHub"], ours: false, saved: "Saved from Docs on 12 Nov", version: 1, of: [] },
];
export const KINDS = ["All", "Ours", "Yours"] as const;
export type KindName = (typeof KINDS)[number];

/** How many managers, said plainly: “Coding and 1 other”. */
export const madeFrom = (t: Template): string => {
  const n = t.of.length + (t.more ?? 0);
  if (n === 0) return "No manager yet";
  if (n === 1) return `1 manager: ${t.of[0]}`;
  return `${n} managers: ${t.of.join(", ")} and ${t.more ?? 0} other`;
};

/** The blanks of Work on a repo. Each has an answer and says where it came from. */
export const REPOS = [
  { value: "acme/web", label: "acme/web", description: "Coding already works on it" },
  { value: "acme/api", label: "acme/api", description: "TypeScript. Has tests and CI" },
  { value: "acme/docs", label: "acme/docs", description: "Markdown. No tests" },
] as const;
export const OWNERS = ["Ama Mensah", "Bo Larsen", "Chidi Okafor"] as const;
export const AGENTS = ["Doer", "Reviewer", "Judge"] as const;
export const FROM = {
  name: "From the repo’s name",
  who: "From the repo: Chidi wrote most of its merged pull requests in the last 90 days",
  most: "From the workspace: the same as Coding’s",
  models: "From the workspace. A template never names a model",
} as const;

/** What it found when it read acme/api and tried it, in a copy of its own. */
export const FOUND: readonly (readonly [string, string])[] = [
  ["Repo", "acme/api, TypeScript, 41 open issues, 212 pull requests merged in the last 90 days"],
  ["How to install", "pnpm install --frozen-lockfile"],
  ["How to test", "pnpm build, then pnpm check. The tests take about 4 minutes"],
  ["Time it took", "6 minutes: 2 to read the repo, 4 to run the tests once in a copy of its own"],
  ["Tried", "The tests ran: 188 passed, 2 skipped, none failed"],
  ["It can not", "Run the live tests, which need Ama’s keys. Push to main. Read .env files"],
  ["Not sure of", "Deploys. The repo has a deploy script, but no page says who may run it"],
];
