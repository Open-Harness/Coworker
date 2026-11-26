import type { GitPort } from "~/modules/boxes/types.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import type { ManagerRecord } from "~/modules/manager-store/types.ts";
import type { Thinking } from "~/modules/playbook/types.ts";
import type { Models, Outside } from "~/modules/working/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";

/** What a manager's work needs of the deployment: its workspace's object, GitHub's App, where a branch is pushed, and the network. */
export interface WorkingRoot {
  readonly workspace: (workspaceId: string) => Promise<WorkspaceApi | undefined>;
  readonly github: GitHubApi;
  readonly git: GitPort;
  readonly fetch: typeof fetch;
}

const THINKING: readonly Thinking[] = ["off", "low", "medium", "high"];

/** The workspace's own choice of model, as the console keeps it. */
function choiceOf(value: unknown): Models["choice"] {
  if (typeof value !== "object" || value === null) return null;
  const { connection, model, thinking } = value as Record<string, unknown>;
  const level = THINKING.find((one) => one === thinking);
  return typeof connection === "string" && typeof model === "string" ? { connection, model, thinking: level ?? "low" } : null;
}

/** A manager's outside: its workspace's models and GitHub installation, reached through the workspace's own object, which holds every credential. */
export const outsideFor =
  (root: WorkingRoot) =>
  (record: ManagerRecord): Outside => {
    let found: Promise<WorkspaceApi | undefined> | undefined;
    /** Undefined when the workspace is not there (deleted while its manager still had work): what it would have given, nothing gives. */
    const workspace = (): Promise<WorkspaceApi | undefined> => (found ??= root.workspace(record.workspace));
    return {
      models: async () => {
        const object = await workspace();
        if (object === undefined) return { connections: [], choice: null };
        const [connections, setting] = await Promise.all([
          object.modelConnections(),
          object.consoleStore({ op: "setting.get", name: "choice" }),
        ]);
        return { connections, choice: "op" in setting && setting.op === "setting.get" ? choiceOf(setting.value) : null };
      },
      call: async (path, body) => {
        const object = await workspace();
        return object === undefined
          ? Response.json({ error: { message: `The workspace ${record.workspace} is gone.` } }, { status: 404 })
          : object.modelCall({ path, body, headers: { accept: "text/event-stream" } });
      },
      installation: async () => (await (await workspace())?.gitHub())?.installation?.id,
      github: root.github,
      git: root.git,
      fetch: root.fetch,
    };
  };
