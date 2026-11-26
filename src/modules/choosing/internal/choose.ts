import type { Chosen, Levels, ModelOn } from "../types.ts";
import type { ModelChoice } from "~/modules/playbook/types.ts";

type Pick = Exclude<ModelChoice, "inherit">;
type Source = "agent" | "manager" | "workspace";

interface Named {
  readonly from: Source;
  readonly pick: Pick;
}

/** The levels that name a model, narrowest first. */
function named(levels: Levels): readonly Named[] {
  const all: readonly (readonly [Source, ModelChoice | null])[] = [
    ["agent", levels.agent],
    ["manager", levels.manager],
    ["workspace", levels.workspace],
  ];
  return all.flatMap(([from, pick]) => (pick === null || pick === "inherit" ? [] : [{ from, pick }]));
}

const sameModel = (a: Pick, b: Pick): boolean => a.connection === b.connection && a.model === b.model;

/** A model that is not among the connected ones counts as one that does not work. */
const works = (pick: Pick, models: readonly ModelOn[]): boolean =>
  models.some((m) => m.connection === pick.connection && m.model === pick.model && m.works);

const label = (pick: Pick): string => `${pick.model} (${pick.connection})`;

export function choose(levels: Levels, models: readonly ModelOn[]): Chosen {
  const [first, ...above] = named(levels);
  if (first === undefined) return { _tag: "None", why: "No model is chosen for this agent, its manager or the workspace." };
  if (works(first.pick, models)) return chosen(first);
  const down = `${label(first.pick)} does not work`;
  if (!levels.mayFallBack) return { _tag: "None", why: `${down}, and another may not answer in its place; waiting.` };
  const next = above.find((level) => !sameModel(level.pick, first.pick) && works(level.pick, models));
  if (next === undefined) return { _tag: "None", why: `${down}, and no model above it works; waiting.` };
  return { ...chosen(next), instead: `${next.pick.model} answered, because ${down}.` };
}

function chosen({ from, pick }: Named): Extract<Chosen, { _tag: "Chosen" }> {
  return { _tag: "Chosen", connection: pick.connection, model: pick.model, thinking: pick.thinking, from };
}
