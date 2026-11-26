import { lookWeekly, remoteStore } from "~/modules/console/service.ts";
import type { ConsoleDeps } from "~/modules/console/types.ts";
import type { BillingView } from "~/modules/billing/types.ts";
import type { GitHubConnection } from "~/modules/github/types.ts";
import type { ModelCall, ModelConnection } from "~/modules/models/types.ts";
import type { SecretInfo } from "~/modules/vault/types.ts";
import type { WorkspaceDependencies, WorkspaceProfile } from "../types.ts";
import { runStore } from "./console-store.ts";

/* The week's look, from inside the workspace's own object: the co-worker acts as itself, through the console it would act through for a person. */

export interface Looking {
  readonly sql: SqlStorage;
  readonly dependencies: WorkspaceDependencies;
  readonly profile: WorkspaceProfile;
  readonly connections: () => Promise<readonly ModelConnection[]>;
  readonly secrets: () => Promise<readonly SecretInfo[]>;
  readonly github: () => Promise<GitHubConnection>;
  readonly modelCall: (call: ModelCall) => Promise<Response>;
}

export async function look(h: Looking): Promise<void> {
  const { clock, ids, stores, mailDomain } = h.dependencies;
  const { profile } = h;
  const deps: ConsoleDeps = {
    workspace: { id: profile.workspaceId, name: profile.name, address: profile.address, region: profile.region, since: profile.createdAt },
    who: { id: "coworker", email: "", name: "Juno", role: "Owner" },
    people: [],
    store: remoteStore(
      async (op) =>
        op.op === "github.hear"
          ? { op: "github.hear" }
          : op.op === "mail"
            ? { op: "mail", answer: { is: "refused", why: "The co-worker does not write mail in its weekly look." } }
            : runStore({ sql: h.sql, now: clock.now(), id: ids.next }, op),
      clock,
    ),
    outside: {
      connections: h.connections,
      secrets: h.secrets,
      github: h.github,
      lost: async () => undefined,
      people: {
        role: async () => ({ _tag: "Refused", why: "The co-worker does not change who may do what." }),
        remove: async () => ({ _tag: "Refused", why: "The co-worker does not remove people." }),
      },
      read: async () => ({ _tag: "Gone" }),
      billing: async (): Promise<BillingView | null> => null,
      rename: async () => ({ _tag: "Refused", why: "The co-worker does not rename the workspace by itself." }),
      call: (path, body) => h.modelCall({ path, body, headers: { accept: "text/event-stream" } }),
    },
    managers: stores,
    asks: async () => ({ op: "inbox", items: [] }),
    ours: [],
    app: null,
    mailbox: `${profile.address}@${mailDomain}`,
    clock,
    ids,
  };
  await lookWeekly(deps);
}
