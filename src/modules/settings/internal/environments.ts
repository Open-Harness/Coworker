import type { By } from "~/modules/actions/types.ts";
import type { SettingsPlace } from "../types.ts";
import { said } from "./said.ts";

/** Deleting an environment leaves the agents that ran in it in the plain container; they are named in the audit line. */
export function deleteEnvironment(place: SettingsPlace, id: string, by: By) {
  const name = place.sandboxes.environments().find((environment) => environment.id === id)?.name;
  const agents = place.sandboxes.remove(id);
  if (agents === undefined) return { _tag: "NotFound" } as const;
  const left = agents.length === 0 ? "" : `; ${agents.join(", ")} now run in the plain container`;
  said(place, by, "settings.environment", `${by.name} deleted the environment ${name ?? id}${left}`);
  return { _tag: "Deleted", agents } as const;
}

/** A test start runs the setup, so it is sandbox time: refused while the period's limit is reached. */
export async function testEnvironment(place: SettingsPlace, id: string, by: By) {
  const view = place.account.view(place.sandboxes.used);
  if (view.stopped)
    return {
      _tag: "Unavailable",
      reason: "Sandboxes are stopped at the spend limit until the plan renews or the limit is raised",
    } as const;
  const name = place.sandboxes.environments().find((environment) => environment.id === id)?.name ?? id;
  const outcome = await place.sandboxes.testStart(id);
  if (outcome._tag === "NoSuchEnvironment") return { _tag: "NotFound" } as const;
  if (outcome._tag === "MissingSecret")
    return { _tag: "Unavailable", reason: `The setup names the secret ${outcome.name}, which the vault does not have` } as const;
  if (outcome._tag === "Unavailable") return outcome;
  said(
    place,
    by,
    "settings.environment",
    `${by.name} test-started the environment ${name}: ${outcome.ready ? "it came up" : "its setup failed"}`,
  );
  return { _tag: "Tested", ready: outcome.ready, output: outcome.output } as const;
}
