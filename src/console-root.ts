import { noAgent } from "~/modules/agent/service.ts";
import { randomIds } from "~/modules/clock/service.ts";
import { readPlace } from "./console-place.ts";
import { createConsole, remoteStore } from "~/modules/console/service.ts";
import type { ConsoleFor } from "~/modules/http/types.ts";
import type { ManagerStores } from "~/modules/manager-store/types.ts";
import type { Template } from "~/modules/templates/types.ts";
import type { Clock } from "~/modules/clock/types.ts";
import type { Role } from "~/modules/doings/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import type { Preset } from "~/modules/auth/types.ts";

/** What the console is built from, for each request: the outside things of the deployment. */
export interface ConsoleRoot {
  readonly managers: ManagerStores;
  readonly ours: readonly Template[];
  readonly clock: Clock;
  readonly app: string | null;
  readonly mailDomain: string;
  /** How a place is read: only ever by GET. */
  readonly fetch: typeof fetch;
}

const PRESETS: Readonly<Record<Role, Preset>> = { Owner: "owner", Builder: "builder", Member: "member" };

/** The console for one person in one workspace, over that workspace's own object. */
export const consoleFrom =
  (root: ConsoleRoot): ConsoleFor =>
  ({ object, entry, since, person, me, people, workspaces, auth, github }) =>
    createConsole({
      workspace: { id: entry.workspaceId, name: entry.name, address: entry.address, region: entry.region, since },
      who: me,
      people,
      store: remoteStore((op) => object.consoleStore(op), root.clock),
      // The loop is not built: the co-worker's chat, comments and weekly look answer that it is not.
      agent: noAgent,
      outside: {
        connections: () => object.modelConnections(),
        secrets: () => object.secrets(),
        github: () => object.gitHub(),
        lost: () => object.gitHubLost(),
        billing: async () => {
          const billed = await object.billing();
          return "_tag" in billed ? null : billed;
        },
        retire: async (at) => {
          const scheduled = await workspaces.scheduleRemoval(person.userId, entry.workspaceId, at);
          return scheduled._tag === "Scheduled" ? { _tag: "Scheduled" } : { _tag: "Refused", why: "Only an Owner deletes a workspace." };
        },
        rename: async (name) => {
          const renamed = await workspaces.updateGeneral(person.userId, entry.workspaceId, { name });
          return renamed._tag === "Updated"
            ? { _tag: "Renamed" }
            : { _tag: "Refused", why: "reason" in renamed ? renamed.reason : "The name could not be changed." };
        },
        people: {
          role: async (who, role) => {
            const seat = (await auth.membersOf(entry.workspaceId)).find((one) => personOf(one).id === who);
            if (seat === undefined) return { _tag: "Refused", why: "That person is not in this workspace." };
            const owners = people.filter((one) => one.role === "Owner");
            if (seat.role === "owner" && role !== "Owner" && owners.length < 2)
              return { _tag: "Refused", why: "A workspace keeps at least one Owner." };
            await auth.setRole(seat.userId, entry.workspaceId, PRESETS[role]);
            return { _tag: "Done" };
          },
          remove: async (who) => {
            const seat = (await auth.membersOf(entry.workspaceId)).find((one) => personOf(one).id === who);
            if (seat === undefined) return { _tag: "Refused", why: "That person is not in this workspace." };
            if (seat.role === "owner" && people.filter((one) => one.role === "Owner").length < 2)
              return { _tag: "Refused", why: "A workspace keeps at least one Owner." };
            await auth.removeMember(seat.userId, entry.workspaceId);
            await workspaces.personChanged({ kind: "left", userId: seat.userId, organizationId: entry.workspaceId });
            return { _tag: "Done" };
          },
        },
        read: (place, path) => readPlace({ github, object, fetch: root.fetch }, place, path),
      },
      asks: async (op) => {
        const asked = await object.asked(op);
        if ("_tag" in asked) throw new Error("The workspace has nothing that waits for a person");
        return asked;
      },
      managers: root.managers,
      ours: root.ours,
      app: root.app,
      mailbox: `${entry.address}@${root.mailDomain}`,
      clock: root.clock,
      ids: randomIds,
    });
