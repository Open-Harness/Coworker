import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Work } from "~/modules/work/types.ts";
import type { ConsoleDeps, ManagerRow } from "../types.ts";
import { grow, managerOf } from "./tree-ops.ts";
import type { Handler } from "./handlers.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Open work of a manager, each piece as it stands. */
async function openWork(c: ConsoleDeps, row: ManagerRow): Promise<readonly Work[]> {
  return (await c.managers.get(row.objectId, row.region).board()).flatMap(({ work }) => (work.ended === null ? [work] : []));
}

/**
 * A manager retired: its open work goes to the one named, else to the one above it, and else ends with the reason. Nothing is left
 * without one who answers. What it had can still be read where it was.
 */
export const retire: Handler = async (c, values) => {
  const row = await managerOf(c, text(values["manager"]));
  if (row === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
  const named = text(values["handTo"]);
  const to = named === "" ? row.node.above : named;
  const heir = to === null ? undefined : await managerOf(c, to);
  if (to !== null && (heir === undefined || heir.node.state === "retired" || heir.node.id === row.node.id))
    return refuse(`"${to}" cannot take over: it is not a manager that is there.`);
  // What it is in the middle of (a pull request being opened, say) is finished first, so that what the heir takes over is all of it.
  await c.managers.get(row.objectId, row.region).tick();
  const open = await openWork(c, row);
  const at = c.clock.now();
  const taken = new Map<string, string>();
  if (heir !== undefined) {
    const store = c.managers.get(heir.objectId, heir.region);
    const version = (await store.version())?.number ?? heir.node.version;
    for (const work of open) {
      const adopted = await store.adopt({ from: work, version, at });
      if ("_tag" in adopted) return refuse(adopted._tag === "NoSuchKind" ? adopted.why : `${heir.node.name} is not opened yet.`);
      taken.set(work.id, adopted.work);
    }
  }
  const grown = await grow(c, {
    is: "retire",
    id: row.node.id,
    open: heir === undefined ? { _tag: "end", why: "The manager was retired" } : { _tag: "up" },
  });
  if (typeof grown === "string") return refuse(grown);
  const store = c.managers.get(row.objectId, row.region);
  for (const work of open) {
    const over = taken.get(work.id);
    const key = `retired:${work.id}`;
    const event =
      heir === undefined || over === undefined
        ? ({ key, at, is: "stopped", person: c.who.name, why: "The manager was retired" } as const)
        : ({ key, at, is: "handed over", manager: heir.node.name, work: over } as const);
    await store.event(work.id, event);
    await c.store.note({
      manager: row.node.id,
      work: work.id,
      who: c.who.name,
      at,
      text: heir === undefined ? "Stopped it: the manager was retired" : `Handed it over to ${heir.node.name}`,
    });
  }
  return {
    _tag: "Done",
    id: row.node.id,
    says: doings.sentence("manager.retire", { manager: row.node.name }, c.who.name),
    link: heir === undefined ? null : `/m/${heir.node.id}`,
  };
};
