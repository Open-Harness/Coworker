import { Blueprint } from "orthograph";
import vault from "../../stores/vault.ts";
import { Workspace } from "../workspace/thing.ts";
import { Name, SecretValue } from "../../values/coworker.ts";

// A key for a model provider, or a secret an environment uses, in the vault. `value` is secret: recorded nowhere, and no
// read names it. The keys page shows the name, what it is of, and who uses it.
export const Key = Blueprint.thing({
  description: "A secret the workspace keeps: a provider's key or an environment's secret, by name, never shown.",
  code: "KE",
  lives: vault,
  fields: { id: Blueprint.id("key"), workspace: Workspace.fields.id, name: Name, of: Name, value: SecretValue },
});
