import type { TaskDetail } from "~/modules/manager/types.ts";
import type { AuditEntry } from "~/modules/workspace/types.ts";
import { json } from "./flows.ts";
import type { Team } from "./team.ts";

let requests = 0;
/** A button: the action the manager's tool of the same id runs. */
export const press = async (launch: Team, id: string, input: object, as = launch.owner) =>
  json<{ _tag: string; value?: { ok: boolean; value?: Record<string, unknown>; message?: string }; reason?: string; message?: string }>(
    await as.send("POST", `${launch.base}/actions/${id}`, { input, requestId: `press-${(requests += 1)}` }),
  );
/** The manager's audit lines, newest first. */
export const lines = async (launch: Team, query = ""): Promise<readonly AuditEntry[]> =>
  (
    await json<{ entries: readonly AuditEntry[] }>(
      await launch.owner.send("GET", `${launch.workspace}/audit?manager=${launch.manager.managerId}${query}`),
    )
  ).entries;
export const saidBy = async (launch: Team, query = ""): Promise<readonly string[]> =>
  (await lines(launch, query)).map(({ sentence }) => sentence);
export const task = async (launch: Team, id: string) =>
  (await json<{ task: TaskDetail }>(await launch.owner.send("GET", `${launch.base}/tasks/${id}`))).task;
