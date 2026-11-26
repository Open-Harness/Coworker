import { works } from "~/modules/work/service.ts";
import type { BoardRow } from "~/modules/manager-store/types.ts";
import type { Kind } from "~/modules/playbook/types.ts";
import type { Work } from "~/modules/work/types.ts";
import type { BoardView, Card } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { headOf, openManager } from "./managers.ts";
import { ok, problem } from "./around.ts";

/* A manager's board: its open work as cards, in the steps of its kinds. */

const GITHUB = "https://github.com";

/** How many of what done means are shown true, by someone who did not do it. */
function metOf(work: Work): { readonly met: number; readonly of: number } {
  const checks = work.doneWhen ?? [];
  const met = checks.filter(({ id }) => work.evidence.findLast((one) => one.check === id)?.met === true).length;
  return { met, of: checks.length };
}

function linksOf(work: Work): Card["links"] {
  return work.follows
    .filter((one) => one.connector === "github")
    .map((one) => ({
      label: one.id === work.from.id ? `Issue #${one.id}` : `Pull request #${one.id}`,
      link: `${GITHUB}/${one.place}/${one.id === work.from.id ? "issues" : "pull"}/${one.id}`,
    }));
}

function cardOf(row: BoardRow, kinds: readonly Kind[], names: Readonly<Record<string, string>>, now: number): Card {
  const { work, hold } = row;
  const { id, title, about, kind, step, priority, order, cost, waits, next } = work;
  return {
    work: { id, title, about, kind, step, priority, order, cost, waits, next },
    kindName: kinds.find((one) => one.id === kind)?.name ?? kind,
    from: `${work.from.place} #${work.from.id}`,
    says: hold === null ? works.says(work, names) : hold.why,
    who: names[work.answers] ?? work.answers,
    links: linksOf(work),
    thread: row.threads.at(-1)?.id ?? null,
    since: row.threads[0]?.started ?? now,
    doneWhen: metOf(work),
  };
}

export async function boardView(c: ConsoleDeps, id: string) {
  const open = await openManager(c, id);
  if (open === undefined) return problem(404, `There is no manager "${id}" here.`);
  const kinds = open.playbook?.kinds ?? [];
  const names = Object.fromEntries(c.people.map((one) => [one.id, one.name]));
  const rows = await open.store.board();
  const live = rows.filter(({ work }) => work.ended === null);
  const view: BoardView = {
    head: await headOf(c, open),
    totals: {
      open: live.length,
      outside: live.filter(({ work }) => work.next?.who === "outside" || work.next?.who === "ci").length,
      person: live.filter(({ work }) => work.waits !== null).length,
    },
    columns: works.columns(kinds).map((column) => ({ ...column, waits: false, more: 0 })),
    cards: rows.map((row) => cardOf(row, kinds, names, c.clock.now())),
  };
  return ok(view);
}
