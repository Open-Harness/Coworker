import { Blueprint } from "orthograph";
import { Key } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { KeyRefused } from "../errors.ts";

// Doing `key.replace`. Registered; nothing presses it: Replace only toasts (`keys.tsx:106`, inventory, Gaps).
export default Blueprint.operation(Key, {
  description: "Replace a key with a new value. The old one is gone.",
  payload: { workspace: Key.fields.workspace, key: Key.fields.id, value: Key.fields.value },
  answer: {},
  errors: [KeyRefused],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
