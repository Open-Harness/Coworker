import { Blueprint } from "orthograph";
import { Template } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /templates`. Ours ship in code and are not rows; the handler adds them to the page.
export default Blueprint.read(Template, {
  where: ["workspace", "whose"],
  order: "newest",
  page: 100,
  allowed: [member.of("workspace")],
});
