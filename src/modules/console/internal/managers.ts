import { playbooks } from "~/modules/playbook/service.ts";
import type { Playbook, Problem, Version } from "~/modules/playbook/types.ts";
import type { ManagerStoreApi } from "~/modules/manager-store/types.ts";
import type { ManagerHead } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps, ManagerRow } from "../types.ts";
import { idle, rolled, surroundings, wholeOf, accountsOf } from "./around.ts";

/** One manager of this workspace, opened: its row, its object, and the playbook version asked for. */
export interface Open {
  readonly row: ManagerRow;
  readonly store: ManagerStoreApi;
  readonly version: Version;
  readonly playbook: Playbook | null;
  /** What is wrong with it, for a person: it did not read, or code says it cannot be made. */
  readonly problems: readonly Problem[];
}

export async function openManager(c: ConsoleDeps, id: string, number?: number): Promise<Open | undefined> {
  const row = (await c.store.managers()).find(({ node }) => node.id === id);
  if (row === undefined) return undefined;
  const store = c.managers.get(row.objectId, row.region);
  const version = await store.version(number);
  if (version === undefined) return undefined;
  const read = playbooks.read(version.files);
  if (read._tag === "Problems") return { row, store, version, playbook: null, problems: read.problems };
  const around = await surroundings(c, wholeOf(await accountsOf(c)));
  return { row, store, version, playbook: read.playbook, problems: playbooks.check(read.playbook, around) };
}

export async function headOf(c: ConsoleDeps, open: Open): Promise<ManagerHead> {
  const nodes = (await c.store.managers()).map(({ node }) => node);
  const now = rolled(nodes).find(({ id }) => id === open.row.node.id) ?? idle(open.row.node);
  const latest = (await open.store.version())?.number ?? open.version.number;
  const perDay = open.playbook?.reach.limits.perDay;
  const spent = perDay === undefined || perDay <= 0 ? 0 : ((await open.store.hearing())?.spent ?? 0);
  const over = perDay !== undefined && perDay > 0 && spent >= perDay;
  return {
    id: open.row.node.id,
    name: open.row.node.name,
    above: open.row.node.above,
    is: now.is,
    now:
      open.row.node.state === "paused"
        ? "Paused"
        : over
          ? `Reached its limit for today (${perDay} dollars): it takes nothing on, and keeps what comes in, until tomorrow`
          : "Waiting for something to come in",
    version: latest,
  };
}
