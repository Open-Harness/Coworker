import { Blueprint } from "orthograph";
import workStore from "../../stores/work.ts";
import { Workspace } from "../workspace/thing.ts";
import { Manager } from "../manager/thing.ts";
import { Work } from "../work/thing.ts";
import { Person } from "../person/thing.ts";
import { Holder, Name, ThreadRef, Title } from "../../values/coworker.ts";

// A conversation in a connector (a mail chain, a WhatsApp chat, a Slack thread, a GitHub issue) that a piece of work
// follows, inside the work's object (spec X6). Its stream (in, out, draft, note) is lines, not fields; attachments are in R2.
export const Conversation = Blueprint.thing({
  description: "A conversation in a connector that a piece of work follows, and who holds it: the manager or a person.",
  code: "CV",
  lives: workStore,
  fields: {
    id: Blueprint.id("conv"),
    workspace: Workspace.fields.id,
    manager: Manager.fields.id,
    work: Work.fields.id,
    thread: ThreadRef,
    with: Name,
    subject: Title,
    has: Holder,
    person: Person.fields.id,
  },
});
