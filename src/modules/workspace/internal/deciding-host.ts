import { createDeciding } from "~/modules/deciding/service.ts";
import type { Deciding, DecidingStore } from "~/modules/deciding/types.ts";
import type { Decision, Item } from "~/modules/intake/types.ts";
import type { ManagerRow } from "~/modules/console/types.ts";
import type { Models } from "~/modules/completion/types.ts";
import type { Thinking } from "~/modules/playbook/types.ts";
import type { ModelCall, ModelConnection } from "~/modules/models/types.ts";
import type { WorkspaceDependencies } from "../types.ts";
import type { Asking } from "~/modules/asking/types.ts";
import { askWhichOf, chosenOf, waitingOf } from "./choosing.ts";
import { connection } from "./github.ts";

/** What the workspace decides over: the items it kept, the managers it has, its models and its GitHub. */
export const DECIDING_MIGRATIONS: readonly string[] = ["ALTER TABLE console_item ADD COLUMN retry INTEGER"];

const parsed = <T>(value: SqlStorageValue | undefined): T => JSON.parse(String(value)) as T;
const THINKING: readonly Thinking[] = ["off", "low", "medium", "high"];

function storeOver(sql: SqlStorage): DecidingStore {
  return {
    pending: (now) =>
      sql
        .exec("SELECT item, hears FROM console_item WHERE decision IS NULL OR (retry IS NOT NULL AND retry <= ?) ORDER BY seq", now)
        .toArray()
        .map((row) => ({ item: parsed<Item>(row["item"]), hears: parsed<readonly string[]>(row["hears"]) })),
    managers: () =>
      sql
        .exec("SELECT row FROM console_manager ORDER BY at, id")
        .toArray()
        .map((row) => parsed<ManagerRow>(row["row"])),
    decided: (item: string, decision: Decision, retry: number | null) =>
      void sql.exec("UPDATE console_item SET decision = ?, retry = ? WHERE id = ?", JSON.stringify(decision), retry, item),
  };
}

/** What GitHub says someone may do in a repo. */
function standingOf(permission: string): "admin" | "write" | "read" | "outside" {
  if (permission === "admin") return "admin";
  if (permission === "write" || permission === "maintain") return "write";
  return permission === "read" || permission === "triage" ? "read" : "outside";
}

export interface Host {
  readonly sql: SqlStorage;
  readonly dependencies: WorkspaceDependencies;
  readonly connections: () => Promise<readonly ModelConnection[]>;
  readonly modelCall: (call: ModelCall) => Promise<Response>;
  readonly asking: () => Asking;
  readonly answered: (item: Item) => Promise<{ readonly ask: string; readonly work: string | null } | undefined>;
}

export function decidingOf({ sql, dependencies, connections, modelCall, answered, asking }: Host): Deciding {
  const { stores, clock, github, fetch } = dependencies;
  const models = async (): Promise<Models> => {
    const row = sql.exec("SELECT value FROM console_setting WHERE name = 'choice'").toArray()[0];
    const choice = row === undefined ? null : parsed<Record<string, unknown>>(row["value"]);
    const [id, model, thinking] = [choice?.["connection"], choice?.["model"], choice?.["thinking"]];
    return {
      connections: await connections(),
      choice:
        typeof id === "string" && typeof model === "string"
          ? { connection: id, model, thinking: THINKING.find((one) => one === thinking) ?? "low" }
          : null,
    };
  };
  return createDeciding({
    store: storeOver(sql),
    manager: ({ objectId, region }) => stores.get(objectId, region),
    models,
    call: (path, body) => modelCall({ path, body, headers: { accept: "text/event-stream" } }),
    clock,
    answered,
    askWhich: (input) => askWhichOf(asking(), clock)(input),
    chosen: chosenOf(sql),
    asked: waitingOf(sql),
    standing: async (item) => {
      const installation = connection(sql).installation?.id;
      if (item.account !== "github" || item.actor.bot || installation === undefined) return undefined;
      const made = await github.token(installation, item.place, { metadata: "read" });
      if (made._tag === "Failed") return undefined;
      const response = await fetch(
        `https://api.github.com/repos/${item.place}/collaborators/${encodeURIComponent(item.actor.name)}/permission`,
        {
          headers: { authorization: `Bearer ${made.token.token}`, accept: "application/vnd.github+json", "user-agent": "co-worker" },
        },
      );
      if (!response.ok) return "outside";
      const body = (await response.json().catch(() => ({}))) as { permission?: unknown };
      return standingOf(typeof body.permission === "string" ? body.permission : "none");
    },
  });
}
