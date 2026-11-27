import { Blueprint } from "orthograph";
import { Key } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { KeyRefused } from "../errors.ts";

// Doing `key.add`. Registered; nothing presses it: "Connect another" only toasts (`keys.tsx:149`, inventory, Gaps).
export default Blueprint.operation(Key, {
  description: "Add a provider's key. It is tried once, then kept in the vault.",
  payload: { workspace: Key.fields.workspace, of: Key.fields.of, value: Key.fields.value },
  answer: { key: Key.fields.id },
  errors: [KeyRefused],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
