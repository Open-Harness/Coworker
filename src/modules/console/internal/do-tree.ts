import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Files } from "~/modules/playbook/types.ts";
import { reaches } from "~/modules/reach/service.ts";
import type { ManagerNode } from "~/modules/tree/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { accountsOf, surroundings, wholeOf } from "./around.ts";
import { withReasons } from "./reasons.ts";
import type { Handler } from "./handlers.ts";
import { retire } from "./retire.ts";
import { grow, managerOf } from "./tree-ops.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const sentence = (id: string, words: Readonly<Record<string, string>>, by: string): string => doings.sentence(id, words, by);

/** Pausing and going on are of one manager only: what comes in is kept while it is paused, and decided again when it goes on. */
const switchTo =
  (is: "pause" | "go on"): Handler =>
  async (c, values) => {
    const row = await managerOf(c, text(values["manager"]));
    if (row === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
    const result = await grow(c, { is, id: row.node.id });
    if (typeof result === "string") return refuse(result);
    if (is === "go on") await c.store.reopen(row.node.id);
    const id = is === "pause" ? "manager.pause" : "manager.start";
    return { _tag: "Done", id: row.node.id, says: sentence(id, { manager: row.node.name }, c.who.name), link: `/m/${row.node.id}` };
  };

/** Files as they are sent: a record of text, or the same written as JSON. */
function filesOf(value: unknown): Files | undefined {
  const raw: unknown =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return undefined;
          }
        })()
      : value;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const entries = Object.entries(raw);
  return entries.every(([, body]) => typeof body === "string")
    ? Object.fromEntries(entries.map(([path, body]) => [path, String(body)]))
    : undefined;
}

/** A new version on top of the one it was made from: a clash when somebody saved meanwhile, problems when it does not read or is wider than above. */
const saveVersion: Handler = async (c, values) => {
  const row = await managerOf(c, text(values["manager"]));
  if (row === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
  const files = filesOf(values["files"]);
  if (files === undefined) return refuse("The files are a record of the playbook's files and their text.");
  const store = c.managers.get(row.objectId, row.region);
  const newest = await store.version();
  if (newest === undefined) return refuse("That manager has no playbook yet.");
  const based = Number(values["version"]);
  if (Number.isFinite(based) && based < newest.number) return { _tag: "Clash", theirs: newest.files, version: newest.number };
  const first = playbooks.read(files);
  if (first._tag === "Problems") return { _tag: "Problems", problems: first.problems };
  const above = row.node.above === null ? undefined : await managerOf(c, row.node.above);
  const around = await surroundings(c, above === undefined ? wholeOf(await accountsOf(c)) : above.node.reach);
  const found = playbooks.check(first.playbook, around);
  const given = withReasons(files, first.playbook, found, c.who.name);
  const [kept, read] = given === undefined ? [files, first.playbook] : [given.files, given.playbook];
  const problems = given === undefined ? found : playbooks.check(read, around);
  if (problems.length > 0) return { _tag: "Problems", problems };
  const reach = { grants: read.reach.grants, limits: read.reach.limits };
  const grown = await grow(c, { is: "reach", id: row.node.id, reach });
  if (typeof grown === "string") return refuse(grown);
  const saved = await store.save({ files: kept, by: c.who.id, at: c.clock.now(), says: `Saved by ${c.who.name}`, from: "edited" });
  const now = (await managerOf(c, row.node.id))?.node ?? row.node;
  const node: ManagerNode = { ...now, version: saved.number, name: read.name };
  await c.store.setManager({ ...row, node });
  await narrowWork(c, grown.grown.narrowed);
  return {
    _tag: "Done",
    id: String(saved.number),
    says: sentence("version.save", { version: String(saved.number), manager: node.name }, c.who.name),
    link: `/m/${node.id}/playbook`,
  };
};

/** What was taken back above is gone from the open work below: its mandate is cut to what is still there. */
async function narrowWork(c: ConsoleDeps, ids: readonly string[]): Promise<void> {
  const rows = await c.store.managers();
  for (const row of rows.filter(({ node }) => ids.includes(node.id))) {
    const store = c.managers.get(row.objectId, row.region);
    for (const { work } of await store.board()) {
      if (work.ended !== null) continue;
      const mandate = reaches.narrow(work.mandate, row.node.reach);
      if (JSON.stringify(mandate) !== JSON.stringify(work.mandate))
        await store.event(work.id, { key: `narrowed:${work.id}:${c.ids.next("evt")}`, at: c.clock.now(), is: "narrowed", mandate });
    }
  }
}

export const treeHandlers: Readonly<Record<string, Handler>> = {
  "manager.pause": switchTo("pause"),
  "manager.start": switchTo("go on"),
  "manager.retire": retire,
  "version.save": saveVersion,
};
