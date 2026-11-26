import { finishChatGpt, nextRefresh, refreshDue, startChatGpt } from "./internal/chatgpt.ts";
import { addEndpoint, addKey, secretName, test } from "./internal/connect.ts";
import { forward } from "./internal/forward.ts";
import { change } from "./internal/replace.ts";
import { readinessOf, routeOf } from "./internal/route.ts";
import { deleteConnection, ensureTable, findConnection, listConnections, saveConnection } from "./internal/store.ts";
import type { Models, ModelsDependencies } from "./types.ts";

export function openModels(dependencies: ModelsDependencies): Models {
  const { sql, vault, clock } = dependencies;
  ensureTable(sql);
  return {
    addKey: (input) => addKey(dependencies, input),
    addEndpoint: (input) => addEndpoint(dependencies, input),
    recheck: async (id) => {
      const found = findConnection(sql, id);
      if (found === undefined) return undefined;
      const tested = await test(dependencies, found);
      saveConnection(sql, tested, clock.now());
      return tested;
    },
    change: (id, edit) => change(dependencies, id, edit),
    list: () => listConnections(sql),
    remove: (id) => {
      vault.remove(secretName(id));
      return deleteConnection(sql, id);
    },
    startChatGpt: () => startChatGpt(dependencies),
    finishChatGpt: (redirectUrl) => finishChatGpt(dependencies, redirectUrl),
    refreshDue: () => refreshDue(dependencies),
    nextRefresh: () => nextRefresh(sql),
    readiness: () => readinessOf(sql),
    route: (wanted) => routeOf(sql, wanted, dependencies.defaultPick?.()),
    forward: (call) => forward(dependencies, call),
  };
}
