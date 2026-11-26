/*
 * What is built when, and which evals show it. An eval belongs to the first slice one of whose patterns its id matches.
 * `says`: the sentences of docs/spec.md a group of evals shows.
 */
export interface Group {
  readonly match: RegExp;
  readonly says: string;
}
export interface Slice {
  readonly n: number;
  readonly name: string;
  readonly done: string;
  readonly groups: readonly Group[];
}

const g = (match: RegExp, says: string): Group => ({ match, says });
const screens = (ids: string): RegExp => new RegExp(`^screen:(?:${ids})/`, "u");

export const SLICES: readonly Slice[] = [
  {
    n: 1,
    name: "The pure middle",
    done: "Every rule of a manager is true in code that touches nothing: a playbook is read, what comes in is decided, work moves.",
    groups: [
      g(/^rules:(?:playbook|templates|reach)\//u, "T1 to T5, B1 to B7, X3, W3, M5, R1"),
      g(/^rules:(?:intake|work|asks)\//u, "I1 to I12, W1 to W13, A1 to A6"),
      g(/^rules:(?:github-events|mail-events)\//u, "X2, X5, X7, X8, X15, X16, I2"),
      g(/^rules:(?:threads|boxes|choosing|connectors|doings)\//u, "H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7"),
      g(/^rules:(?:measures|trials|walkthrough|knowledge|tree|mcp|coworker)\//u, "O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3"),
    ],
  },
  {
    n: 2,
    name: "One issue becomes a pull request",
    done: "Label an issue: within a minute it says what done means, works in a clone, runs the tests, opens a pull request. A crash at any moment changes nothing.",
    groups: [g(/^flow:start\//u, "P2, P5, P6, T1, T2, M1, M2, U4"), g(/^flow:repo\/(?!.*(?:review|comment|merge|closed|check|conflict|quiet|uninstall|later|follows|touch|backwards|stop-))/u, "X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1")],
  },
  { n: 3, name: "It stays with it", done: "Comments, reviews, checks, a moved main, a merge: each goes to the thread that has it, once, and the issue is closed and told.", groups: [g(/^flow:repo\//u, "X5, X7, I2, W8, W9, H1, H4, H6")] },
  { n: 4, name: "Someone else checks", done: "Nothing reaches a person that a fresh agent has not checked against done when.", groups: [g(/^flow:check\//u, "W5, W6, H5"), g(/^jobs:(?:fix|check)\//u, "W5, the agents are good")] },
  {
    n: 5,
    name: "The playbook decides",
    done: "Whose words count, which kind, one manager, what may be done: all of it is the playbook's, and a person can change it.",
    groups: [g(/^flow:(?:decide|playbook)\//u, "I3 to I12, T5, B4 to B6, W3"), g(/^jobs:triage\//u, "I4, L2")],
  },
  { n: 6, name: "Asking, models, money", done: "It asks one person, in one place, once; runs on the models that were chosen; and stops at its limits.", groups: [g(/^flow:asks\//u, "A1 to A6"), g(/^flow:models\//u, "M1 to M5, C11, P6")] },
  {
    n: 7,
    name: "You can see it",
    done: "The shell, the managers, their boards, the work and the inbox look and work as drawn, and change while you look.",
    groups: [
      g(screens("shell|every|system|root|inbox|m-coding-overview|m-coding-board|m-coding-threads|task|thread|m-coding-settings|m-sales-overview|m-sales-intake|m-sales-board|m-sales-search|state-[a-z]+"), "U1, U2, U4, U5, U7"),
      g(/^flow:(?:live|safe|search)\//u, "U3, U4, U6, P2, P5, P7, L5"),
    ],
  },
  { n: 8, name: "Templates and the tree", done: "Pick a template, pick a repo: made. Five of them. One under another. One retired, with nothing lost.", groups: [g(/^flow:tree\//u, "T1 to T5, R1 to R3, W12, W13"), g(screens("new|new-fill|new-check|set-templates|set-general|set-keys|set-usage|set-connectors|set-connect-github|m-coding-connectors-github"), "U2, S9, X6")] },
  {
    n: 9,
    name: "The co-worker",
    done: "You talk to Juno: it answers from the records, does what you may do, shows you how, and stops before what is yours.",
    groups: [g(/^flow:juno\//u, "C1 to C13, L2"), g(screens("home|palette|chats|chat-support|chat-support-october|juno-[a-z-]+|live"), "U2, C4, C7 to C12")],
  },
  { n: 10, name: "It gets better", done: "A correction becomes a line. Each week the weakest part gets one change, tried beside the old one.", groups: [g(/^flow:good\//u, "O1 to O9"), g(screens("m-sales-playbook|m-sales-playbook-[a-z]+"), "U2, B4, B5, O3, O4")] },
  { n: 11, name: "From a sentence", done: "Say what you want to get to; it asks three things, looks, drafts; you judge ten cases and say yes.", groups: [g(/^flow:set-up\//u, "S1 to S9"), g(screens("setup|setup-[a-z0-9-]+|draft|draft-[a-z-]+"), "U2, S1 to S8")] },
  {
    n: 12,
    name: "Mail, MCP and the rest",
    done: "Customers' mail is answered; tools are added without code; every other screen is there; a workspace can leave whole.",
    groups: [
      g(/^flow:(?:mail|mcp|workspace)\//u, "X2, X6, X8, X13, X16, L3, L4"),
      g(screens("signin|signup|join|start|m-[a-z]+-connectors(?:-[a-z]+)?|set-[a-z-]+"), "U2, P1, P3, X6"),
    ],
  },
];

export const sliceOf = (id: string): Slice | undefined => SLICES.find(({ groups }) => groups.some(({ match }) => match.test(id)));
export const says = (id: string): string => SLICES.flatMap(({ groups }) => groups).find(({ match }) => match.test(id))?.says ?? "";
export const WEIGHTS = { rules: 1, screen: 2, flow: 3, jobs: 5 } as const;
export type Tier = keyof typeof WEIGHTS;
export const tierOf = (id: string): Tier => id.split(":")[0] as Tier;

/** In the spec, and in no eval: there is no account to try it on, or it is a person's to say. Said so, instead of pretended. */
export const NOT_SHOWN: Readonly<Record<string, string>> = {
  P1: "Kept from the spike; its tests are kept",
  P3: "Kept from the spike; its tests are kept",
  P4: "GitHub and mail are shown; Slack and WhatsApp need an account",
  X9: "Its rules and its view are shown; the real Slack needs an app in a workspace",
  X10: "Its rules and its view are shown; the real WhatsApp needs a number",
  X11: "Its rules and its view are shown; a real CRM needs an account",
  X12: "Its rules are shown; a real calendar needs an account",
  X14: "Lending is in the types; only who leaves is shown (L5)",
  C8: "The morning list is shown; Mondays is the same machine",
};
