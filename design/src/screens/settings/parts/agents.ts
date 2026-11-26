/* Roles saved to use again, from any manager. The three of Sales are in the playbook's data; two of Coding’s are added here. */
import { AGENTS, type AgentLine } from "../../playbook/data";

export interface Saved extends Record<string, unknown> { id: string; line: AgentLine; saved: string; from: string; usedBy: readonly string[] }
const coding = (id: string, name: string, is: string, told: string, tools: string, good: string, first: string, line: string, now: string, skills: readonly string[]): AgentLine =>
  ({ id, name, is, model: "Claude Sonnet 5.5", skills, told, tools, good, first, line, now });

export const SAVED: readonly Saved[] = [
  { id: "researcher", line: AGENTS[0]!, saved: "Bo Larsen, 5 Oct", from: "Sales", usedBy: ["Sales"] },
  { id: "writer", line: AGENTS[1]!, saved: "Bo Larsen, 5 Oct", from: "Sales", usedBy: ["Sales"] },
  { id: "reader", line: AGENTS[2]!, saved: "Bo Larsen, 5 Oct", from: "Sales", usedBy: ["Sales", "Support"] },
  { id: "fixer", saved: "Ama Mensah, 12 Nov", from: "Coding", usedBy: ["Coding"], line: coding("fixer", "Fixer", "Makes one change in its own copy of the repo",
    "Make the change the done-when asks for, and nothing wider. Write a test that fails without it. Push to your own branch and open a pull request. Never merge.", "Its copy of the repo, GitHub: push, open a pull request",
    "Pull requests that merge without a second round", "61%", "70%", "81%", ["Reading the web, files, commands", "Work, asks and reports", "GitHub"]) },
  { id: "checker", saved: "Ama Mensah, 12 Nov", from: "Coding", usedBy: ["Coding", "Docs", "Releases"], line: coding("checker", "Fresh checker", "Compares the result with done-when, and has not seen how it was made",
    "You get the done-when and the result. For each line, say what shows it is true. If nothing shows it, send it back and say what is missing. Do not fix it.", "Read only: its copy of the repo, GitHub: read",
    "Mistakes caught, of those put in", "7 of 11", "9 of 11", "10 of 11", ["Read against the source", "Reading the web, files, commands", "GitHub"]) },
];
export const MODELS = ["Claude Haiku 5.5", "Claude Sonnet 5.5"] as const;
