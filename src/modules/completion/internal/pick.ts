import { choosing } from "~/modules/choosing/service.ts";
import type { Chosen, ModelOn } from "~/modules/choosing/types.ts";
import type { ModelChoice } from "~/modules/playbook/types.ts";
import type { Models } from "../types.ts";

/** The models there are, as choosing wants them: which work, and what each costs. A model whose price its connection did not list has none. */
export function modelsOn({ connections }: Models): readonly ModelOn[] {
  return connections.flatMap((connection) =>
    connection.models.map((model): ModelOn => {
      const price = connection.prices?.[model];
      return {
        connection: connection.id,
        model,
        works: connection.check._tag === "Works",
        thinks: true,
        ...(price === undefined ? {} : { price: { input: price.input, cached: price.cached ?? price.input, output: price.output } }),
      };
    }),
  );
}

/** Which model answers this agent: its own, else the manager's, else the workspace's. A manager's call never goes to another model than the one chosen. */
export function pick(models: Models, own: ModelChoice): { readonly chosen: Chosen; readonly on: readonly ModelOn[] } {
  const on = modelsOn(models);
  const workspace =
    models.choice === null ? null : { connection: models.choice.connection, model: models.choice.model, thinking: models.choice.thinking };
  return { chosen: choosing.choose({ agent: own, manager: "inherit", workspace, mayFallBack: false }, on), on };
}
