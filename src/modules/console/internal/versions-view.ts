import { playbooks } from "~/modules/playbook/service.ts";
import type { Version } from "~/modules/playbook/types.ts";
import type { VersionsView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";
import { openManager } from "./managers.ts";

/* Every version of a playbook, newest first: what changed in it, who made it, and what it did to work that was open. */

const HOW: Readonly<Record<Version["from"], string | null>> = {
  made: "made from its template",
  edited: null,
  suggestion: "from a suggestion that was accepted",
  "went back": "went back to an earlier version",
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** What a version did to open work: nothing, for work already begun keeps the version it began on and what that allowed. */
function toldOf(number: number, open: readonly number[]): string {
  const behind = open.filter((one) => one < number);
  if (behind.length === 0) return "No open work was begun on an earlier version, so none was left as it was.";
  const on = [...new Set(behind)].toSorted((a, b) => a - b).join(", ");
  return `${plural(behind.length, "piece of open work stays", "pieces of open work stay")} on version ${on}, with what that version allowed: it was not changed.`;
}

export async function versionsView(c: ConsoleDeps, id: string) {
  const open = await openManager(c, id);
  if (open === undefined) return problem(404, `There is no manager "${id}" here.`);
  const all = await open.store.versions();
  const working = (await open.store.board()).filter(({ work }) => work.ended === null).map(({ work }) => work.version);
  const view: VersionsView = {
    versions: all.map(({ files, ...version }) => {
      const before = all.find((one) => one.number === version.number - 1);
      return {
        ...version,
        changes: before === undefined ? 0 : playbooks.diff(before.files, files).length,
        told: toldOf(version.number, working),
        how: HOW[version.from],
      };
    }),
  };
  return ok(view);
}
