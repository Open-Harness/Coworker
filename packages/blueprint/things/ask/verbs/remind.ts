import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `ask.remind`: pressed (`inbox/index.tsx:77`) and not registered (inventory, Gaps). Declared here; the binding marks it
// planned. It says the ask again to its person, once per wait.
export default Blueprint.operation(Ask, {
  description: "Remind the person an ask is for that it waits for them.",
  payload: { workspace: Ask.fields.workspace, ask: Ask.fields.id },
  answer: {},
  allowed: [member.of("workspace")],
  idempotent: "request",
});
