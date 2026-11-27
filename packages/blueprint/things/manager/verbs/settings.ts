import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { ManagerLimitWrong } from "../errors.ts";

// Doing `manager.settings`. The registry sends the model as connection, model and thinking; here they are one choice.
export default Blueprint.operation(Manager, {
  description: "Change a manager's name, who answers for it, its model, and its limits.",
  payload: {
    workspace: Manager.fields.workspace,
    manager: Manager.fields.id,
    name: Manager.fields.name,
    answers: Manager.fields.answers,
    model: Manager.fields.model,
    perWork: Manager.fields.perWork,
    perDay: Manager.fields.perDay,
  },
  answer: {},
  errors: [ManagerLimitWrong],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
