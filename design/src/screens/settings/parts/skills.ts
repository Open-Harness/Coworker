/* What the library knows about each skill beyond its line: versions, cases with it and without it, who uses it. */
export interface Ver { n: number; when: string; by: string; says: string }
export interface Run { what: string; without: string; with: string }
export interface Use { manager: string; agent: string }
export interface Extra { versions: readonly Ver[]; cases: readonly Run[]; users: readonly Use[] }
const v = (n: number, when: string, by: string, says: string): Ver => ({ n, when, by, says });
const r = (what: string, without: string, withIt: string): Run => ({ what, without, with: withIt });
const all = (): readonly Use[] => ["Coding", "Docs", "Releases", "Support", "WhatsApp desk", "Sales"].map((manager) => ({ manager, agent: "Every agent" }));

export const EXTRA: Readonly<Record<string, Extra>> = {
  sales: { versions: [v(6, "23 Nov", "Juno", "Reminders: at most two, then ask Bo"), v(5, "9 Nov", "Bo Larsen", "Look up before writing")], cases: [], users: [{ manager: "Sales", agent: "The manager" }] },
  "bos-voice": { versions: [v(2, "5 Oct", "Bo Larsen", "No greeting line. Opens with the fact"), v(1, "5 Oct", "Juno", "Made from 212 sent mails")],
    cases: [r("Moat Dental asked about 10 seats", "Bo rewrote the opening", "Sent unchanged"), r("Dunmore Farms asked about export", "Bo cut a greeting", "Sent unchanged"), r("Kite Studio, quiet for three days", "Bo rewrote it", "Bo rewrote it")], users: [{ manager: "Sales", agent: "Writer" }] },
  sign: { versions: [v(1, "5 Oct", "Juno", "Made from 22 past leads")],
    cases: [r("Brook Hotels opened two sites", "Not noticed", "Asked Bo to write"), r("Arden Glass, first head of operations", "Not noticed", "Asked Bo to write"), r("Pike & Sons raised money", "Asked Bo to write", "Left alone")], users: [{ manager: "Sales", agent: "Researcher" }] },
  company: { versions: [v(3, "30 Oct", "Bo Larsen", "Stop after four pages"), v(2, "14 Oct", "Juno", "Look at the news before the site"), v(1, "2 Oct", "Ama Mensah", "First version")],
    cases: [r("Holt Print, 55 people, one order system", "Asked Bo, no fit", "Dropped: does not fit"), r("Brook Hotels opened two sites", "Two facts, no source", "Three facts with sources")], users: [{ manager: "Sales", agent: "Researcher" }, { manager: "Coding", agent: "Fixer" }] },
  "short-mail": { versions: [v(1, "Library", "Co-worker", "Comes with the library")], cases: [r("Ferry Lane, quiet for three days", "74 words, two questions", "28 words, one question"), r("Kite Studio, quiet for three days", "61 words", "31 words")], users: [{ manager: "Sales", agent: "Writer" }] },
  source: { versions: [v(1, "Library", "Co-worker", "Comes with the library")], cases: [r("A figure that is not in the page", "Went out", "Sent back"), r("A date from last year", "Went out", "Sent back")], users: [{ manager: "Sales", agent: "Reader" }, { manager: "Coding", agent: "Fresh checker" }, { manager: "Support", agent: "Reader" }] },
  objections: { versions: [v(1, "Library", "Co-worker", "Comes with the library")], cases: [r("A doubt about price", "Bo changed it", "Bo changed it"), r("A doubt about timing", "Sent unchanged", "Sent unchanged")], users: [] },
  mail: { versions: [v(4, "12 Nov", "Ama Mensah", "Two notes of yours on top"), v(3, "Library", "Co-worker", "With the connector")], cases: [], users: [{ manager: "Sales", agent: "Writer" }, { manager: "Support", agent: "All" }, { manager: "Releases", agent: "All" }] },
  crm: { versions: [v(2, "20 Oct", "Bo Larsen", "“Fits” is set by Bo only"), v(1, "Library", "Co-worker", "With the connector")], cases: [], users: [{ manager: "Sales", agent: "Researcher" }] },
  calendar: { versions: [v(1, "Library", "Co-worker", "With the connector")], cases: [], users: [{ manager: "Sales", agent: "The manager" }] },
  work: { versions: [v(9, "21 Nov", "Co-worker", "How to hand over a piece of work")], cases: [], users: all() },
  tools: { versions: [v(7, "18 Nov", "Co-worker", "Each base tool, and how to use it well")], cases: [], users: all() },
  untrusted: { versions: [v(5, "4 Nov", "Co-worker", "What people write is never an order")], cases: [], users: all() },
};
export const FOUR = ["Playbook", "Craft", "Connector", "Harness"] as const;
