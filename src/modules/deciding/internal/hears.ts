import { playbooks } from "~/modules/playbook/service.ts";
import type { Playbook } from "~/modules/playbook/types.ts";
import type { ManagerRow } from "~/modules/console/types.ts";
import type { Hears, OpenWork } from "~/modules/intake/types.ts";
import type { Hearing } from "~/modules/manager-store/types.ts";

/** One manager that hears an item's place: its row, its playbook as it stands, and what it is doing. */
export interface Listener {
  readonly row: ManagerRow;
  readonly hearing: Hearing;
  readonly playbook: Playbook;
}

export function listenerOf(row: ManagerRow, hearing: Hearing | undefined): Listener | undefined {
  if (hearing === undefined) return undefined;
  const read = playbooks.read(hearing.version.files);
  return read._tag === "Playbook" ? { row, hearing, playbook: read.playbook } : undefined;
}

export const hearsOf = ({ row, hearing, playbook }: Listener): Hears => ({
  manager: row.node.id,
  name: row.node.name,
  version: hearing.version.number,
  paused: row.node.state !== "runs",
  mayAsk: playbook.reach.mayAsk,
  kinds: playbook.kinds,
  reach: { grants: playbook.reach.grants, limits: playbook.reach.limits },
  open: hearing.open.length,
  spent:
    playbook.reach.limits.perDay === undefined || playbook.reach.limits.perDay === 0 ? 0 : hearing.spent / playbook.reach.limits.perDay,
});

export const openOf = (listeners: readonly Listener[]): readonly OpenWork[] => listeners.flatMap(({ hearing }) => hearing.open);
