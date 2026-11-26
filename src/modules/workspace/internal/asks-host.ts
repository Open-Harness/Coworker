import { createAsking } from "~/modules/asking/service.ts";
import type { Asking, Kept } from "~/modules/asking/types.ts";
import type { ManagerRow } from "~/modules/console/types.ts";
import type { WorkspaceDependencies } from "../types.ts";
import { asksStoreOver } from "./asks-store.ts";

const rowsOf = (sql: SqlStorage): readonly ManagerRow[] =>
  sql
    .exec("SELECT row FROM console_manager")
    .toArray()
    .map((row) => JSON.parse(String(row["row"])) as ManagerRow);

/** Tells the manager whose work asked that it was answered, with the words the answer is known by. */
async function tell(sql: SqlStorage, dependencies: WorkspaceDependencies, one: Kept): Promise<boolean> {
  const { state } = one.ask;
  if (state._tag !== "Answered") return true;
  const row = rowsOf(sql).find(({ node }) => node.id === one.ask.about.manager);
  if (row === undefined) return true;
  const option = one.ask.options.find(({ id }) => id === state.answer);
  await dependencies.stores.get(row.objectId, row.region).answered({
    ask: one.ask.id,
    work: one.ask.about.work ?? "",
    person: state.by,
    answer: option?.label ?? state.answer,
    option: option?.id ?? null,
    where: state.where,
    at: state.at,
  });
  return true;
}

/** Asking over this workspace's own rows, telling the managers' objects. */
export const askingOf = (sql: SqlStorage, dependencies: WorkspaceDependencies): Asking =>
  createAsking({
    store: asksStoreOver(sql),
    clock: dependencies.clock,
    ids: dependencies.ids,
    tell: (one) => tell(sql, dependencies, one),
  });
