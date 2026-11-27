import { Blueprint } from "orthograph";
import { Rule } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `rule.take_away`. Registered; nothing presses it (inventory, Gaps). Asks like it are asked again.
export default Blueprint.operation(Rule, {
  description: "Take away an always-answer: asks like it are asked again.",
  payload: { workspace: Rule.fields.workspace, rule: Rule.fields.id },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
