import { randomIds } from "~/modules/clock/service.ts";
import { createConsole, remoteStore } from "~/modules/console/service.ts";
import type { ConsoleFor } from "~/modules/http/types.ts";
import type { ManagerStores } from "~/modules/manager-store/types.ts";
import type { Template } from "~/modules/templates/types.ts";
import type { Clock } from "~/modules/clock/types.ts";

/** What the console is built from, for each request: the outside things of the deployment. */
export interface ConsoleRoot {
  readonly managers: ManagerStores;
  readonly ours: readonly Template[];
  readonly clock: Clock;
  readonly app: string | null;
  readonly mailDomain: string;
}

/** The console for one person in one workspace, over that workspace's own object. */
export const consoleFrom =
  (root: ConsoleRoot): ConsoleFor =>
  ({ object, entry, since, person, me, people, workspaces }) =>
    createConsole({
      workspace: { id: entry.workspaceId, name: entry.name, address: entry.address, region: entry.region, since },
      who: me,
      people,
      store: remoteStore((op) => object.consoleStore(op), root.clock),
      outside: {
        connections: () => object.modelConnections(),
        secrets: () => object.secrets(),
        github: () => object.gitHub(),
        billing: async () => {
          const billed = await object.billing();
          return "_tag" in billed ? null : billed;
        },
        call: (path, body) => object.modelCall({ path, body, headers: { accept: "text/event-stream" } }),
        rename: async (name) => {
          const renamed = await workspaces.updateGeneral(person.userId, entry.workspaceId, { name });
          return renamed._tag === "Updated"
            ? { _tag: "Renamed" }
            : { _tag: "Refused", why: "reason" in renamed ? renamed.reason : "The name could not be changed." };
        },
      },
      managers: root.managers,
      ours: root.ours,
      app: root.app,
      mailbox: `${entry.address}@${root.mailDomain}`,
      clock: root.clock,
      ids: randomIds,
    });
