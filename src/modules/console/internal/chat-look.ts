import type { Answer } from "~/modules/api/types.ts";
import type { ToolArgs } from "~/modules/threads/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { inboxItems } from "./inbox.ts";
import { intakeView, playbookView } from "./manager-views.ts";
import { managerOverview } from "./manager-overview.ts";
import { searchView } from "./search.ts";
import { spendingParts } from "./spending.ts";
import { threadsView } from "./threads-view.ts";
import { workView } from "./work-view.ts";

/* What the co-worker reads in the records when it is asked something: the views a person would open, as words, and where each is. */

export interface Looked {
  readonly text: string;
  readonly label: string;
  readonly link: string | null;
}

const MOST = 6000;

const wordsOf = (value: unknown): string => {
  const said = JSON.stringify(value);
  return said.length > MOST ? `${said.slice(0, MOST)}…` : said;
};

const valueOf = (answer: Answer<unknown>): string => (answer._tag === "Ok" ? wordsOf(answer.value) : answer.says);

/** The manager that has this piece of work: work is found by its id, wherever it is. */
async function managerOf(c: ConsoleDeps, work: string): Promise<string | undefined> {
  for (const row of await c.store.managers())
    if ((await c.managers.get(row.objectId, row.region).board()).some((one) => one.work.id === work)) return row.node.id;
  return undefined;
}

const gone = (label: string, what: string): Looked => ({ text: `There is no ${what} to look at.`, label, link: null });

export async function lookAt(c: ConsoleDeps, args: ToolArgs["look"]): Promise<Looked> {
  const id = args.id ?? "";
  switch (args.at) {
    case "work": {
      const manager = await managerOf(c, id);
      if (manager === undefined) return gone("Work", `work "${id}"`);
      return { text: valueOf(await workView(c, manager, id)), label: `Work ${id}`, link: `/m/${manager}/work/${id}` };
    }
    case "manager":
      return { text: valueOf(await managerOverview(c, id)), label: `Manager ${id}`, link: `/m/${id}` };
    case "intake":
      return { text: valueOf(await intakeView(c, id, new URLSearchParams())), label: `What came in for ${id}`, link: `/m/${id}/intake` };
    case "playbook":
      return { text: valueOf(await playbookView(c, id, undefined)), label: `Playbook of ${id}`, link: `/m/${id}/playbook` };
    case "thread":
      return { text: valueOf(await threadsView(c, id)), label: `Threads of ${id}`, link: `/m/${id}/threads` };
    case "spending":
      return { text: wordsOf(await spendingParts(c)), label: "Spending", link: "/settings/usage" };
    case "asks":
      return {
        text: wordsOf((await inboxItems(c)).map(({ ask, from }) => ({ id: ask.id, from, question: ask.question, state: ask.state._tag }))),
        label: "What waits for people",
        link: "/inbox",
      };
  }
}

/** What there is for some words: what a person would find by searching. */
export async function findWords(c: ConsoleDeps, words: string): Promise<{ readonly text: string; readonly found: readonly Looked[] }> {
  const answered = await searchView(c, new URLSearchParams({ words }));
  if (answered._tag !== "Ok") return { text: answered.says, found: [] };
  const found = answered.value.found.map(({ is, title, about, link }) => ({
    text: `${is}: ${title} (${about}) ${link}`,
    label: title,
    link,
  }));
  return { text: found.length === 0 ? "Nothing was found." : found.map(({ text }) => text).join("\n"), found };
}
