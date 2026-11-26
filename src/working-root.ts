import type { GitPort } from "~/modules/boxes/types.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import type { ManagerRecord } from "~/modules/manager-store/types.ts";
import type { Outside } from "~/modules/working/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";

/** What a manager's work needs of the deployment: its workspace's object, GitHub's App, where a branch is pushed, and the network. */
export interface WorkingRoot {
  readonly workspace: (workspaceId: string) => Promise<WorkspaceApi | undefined>;
  readonly github: GitHubApi;
  readonly git: GitPort;
  readonly fetch: typeof fetch;
}

/** A manager's outside: its workspace's GitHub installation, mailbox and asks, reached through the workspace's own object, which holds every credential. Models are the loop's (`agent`). */
export const outsideFor =
  (root: WorkingRoot) =>
  (record: ManagerRecord): Outside => {
    let found: Promise<WorkspaceApi | undefined> | undefined;
    /** Undefined when the workspace is not there (deleted while its manager still had work): what it would have given, nothing gives. */
    const workspace = (): Promise<WorkspaceApi | undefined> => (found ??= root.workspace(record.workspace));
    return {
      installation: async () => (await (await workspace())?.gitHub())?.installation?.id,
      github: root.github,
      git: root.git,
      fetch: root.fetch,
      audit: async (line) => {
        const object = await workspace();
        await object?.consoleStore({
          op: "audit.add",
          row: {
            at: line.at,
            by: record.name,
            byId: record.id,
            kind: "manager",
            doing: line.action,
            group: "Managers",
            says: line.says,
            outcome: line.outcome,
            why: line.why,
            permission: "ask",
            role: "Member",
            approvedBy: line.approvedBy,
          },
        });
      },
      auditFailed: async (line, why) => {
        await (await workspace())?.consoleStore({ op: "audit.failed", at: line.at, byId: record.id, doing: line.action, why });
      },
      // The workspace keeps what is asked of a person. A workspace that is gone keeps nothing, and says so.
      asks: async (op) => {
        const asked = await (await workspace())?.asked(op);
        if (asked === undefined || "_tag" in asked) throw new Error(`The workspace ${record.workspace} is not there to be asked.`);
        return asked;
      },
      mcp: async (call) => {
        const answer = await (await workspace())?.consoleStore({ op: "mcp", call });
        return answer !== undefined && "op" in answer && answer.op === "mcp"
          ? answer.answer
          : { is: "failed", why: `The workspace ${record.workspace} is not there to be asked for its servers.` };
      },
      mail: async (call) => {
        const answer = await (await workspace())?.consoleStore({ op: "mail", call });
        return answer !== undefined && "op" in answer && answer.op === "mail"
          ? answer.answer
          : { is: "failed", why: `The workspace ${record.workspace} is not there to be written from.` };
      },
    };
  };
