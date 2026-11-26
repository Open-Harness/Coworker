/*
 * The connectors as agreed: each one's set-up steps, what it hears, what it can do, and what a model gives for each action.
 * The product's list (`connectors.all`) must have each of these, as written here. It may have more; it may not have less.
 * `fixed` are the parts we fill in from the reach and the thread; a model never gives them. `args` are what it gives.
 * Locked with the evals.
 */
import type { Arg, ConnectorId, SetUpStep, ViewShape } from "~/modules/connectors/types.ts";
import type { Permission } from "~/modules/reach/types.ts";

export interface ActionSpec {
  readonly id: string;
  readonly fixed: readonly string[];
  readonly args: readonly Pick<Arg, "name" | "is" | "needed">[];
  readonly starts: Permission;
  /** It shows outside. Anything else only reads, or stays a draft. */
  readonly outside: boolean;
}

export interface ConnectorSpec {
  readonly id: ConnectorId;
  readonly view: ViewShape;
  readonly setUp: readonly Pick<SetUpStep, "id" | "by">[];
  readonly events: readonly string[];
  readonly skills: readonly string[];
  readonly actions: readonly ActionSpec[];
}

const a = (name: string, is: Arg["is"] = "text", needed = true) => ({ name, is, needed });
const o = (name: string, is: Arg["is"] = "text") => a(name, is, false);
const act = (
  id: string,
  fixed: readonly string[],
  starts: Permission,
  outside: boolean,
  ...args: readonly Pick<Arg, "name" | "is" | "needed">[]
): ActionSpec => ({ id, fixed, args, starts, outside });

export const connectorSpecs: readonly ConnectorSpec[] = [
  {
    id: "github",
    view: "repo",
    setUp: [
      { id: "install_app", by: "person" },
      { id: "choose_repos", by: "person" },
      { id: "check_access", by: "itself" },
    ],
    events: ["issue", "label", "comment", "pull_request", "review", "line_comment", "check", "push", "merged", "closed"],
    skills: ["github"],
    actions: [
      act("github.read", ["repo"], "on", false, a("what"), o("number", "number")),
      act("github.comment", ["repo", "thread"], "on", true, a("text")),
      act("github.reply_on_line", ["repo", "thread"], "on", true, a("comment", "number"), a("text")),
      act("github.push", ["repo", "branch"], "on", true, o("message")),
      act("github.open_pull_request", ["repo", "branch", "base"], "on", true, a("title"), a("body")),
      act("github.update_pull_request", ["repo", "pull"], "on", true, o("title"), o("body")),
      act("github.rerun_checks", ["repo", "pull"], "ask", true),
      act("github.rebase", ["repo", "pull"], "ask", true),
      act("github.close_issue", ["repo", "thread"], "ask", true, a("why")),
      act("github.merge", ["repo", "pull"], "ask", true),
      act("github.label", ["repo", "thread"], "on", true, o("add", "list"), o("remove", "list")),
    ],
  },
  {
    id: "email",
    view: "mail",
    setUp: [
      { id: "add_address", by: "itself" },
      { id: "point_dns", by: "person" },
      { id: "check_delivery", by: "itself" },
    ],
    events: ["mail", "bounced"],
    skills: ["email"],
    actions: [
      act("email.search", ["mailbox"], "on", false, a("words")),
      act("email.draft", ["from"], "on", false, a("text")),
      act("email.reply", ["from", "thread"], "on", true, a("text")),
      act("email.send_inside", ["from"], "on", true, a("to"), a("subject"), a("text")),
      act("email.send_outside", ["from"], "ask", true, a("to"), a("subject"), a("text")),
    ],
  },
  {
    id: "slack",
    view: "channels",
    setUp: [
      { id: "install_app", by: "person" },
      { id: "invite_to_channels", by: "person" },
      { id: "check_events", by: "itself" },
    ],
    events: ["message", "mention", "direct_message", "reaction"],
    skills: ["slack"],
    actions: [
      act("slack.read", ["workspace", "channel"], "on", false, o("thread")),
      act("slack.reply", ["workspace", "channel", "thread"], "on", true, a("text")),
      act("slack.start_thread", ["workspace", "channel"], "ask", true, a("text")),
      act("slack.react", ["workspace", "channel", "message"], "on", true, a("emoji")),
    ],
  },
  {
    id: "whatsapp",
    view: "chat",
    setUp: [
      { id: "make_session", by: "itself" },
      { id: "scan_code", by: "person" },
      { id: "check_phone", by: "itself" },
    ],
    events: ["message.received", "message.edited", "message.reaction", "message.failed", "session.status"],
    skills: ["whatsapp"],
    actions: [
      act("whatsapp.read", ["number", "chat"], "on", false),
      act("whatsapp.reply", ["number", "chat"], "on", true, a("text")),
      act("whatsapp.send_template", ["number", "chat"], "ask", true, a("template"), o("values", "list")),
      act("whatsapp.typing", ["number", "chat"], "on", true),
    ],
  },
  {
    id: "crm",
    view: "deals",
    setUp: [
      { id: "connect_account", by: "person" },
      { id: "check_access", by: "itself" },
    ],
    events: ["deal_moved"],
    skills: ["crm"],
    actions: [
      act("crm.read", ["crm"], "on", false, a("what"), o("id")),
      act("crm.change_field", ["crm"], "ask", true, a("deal"), a("field"), a("value")),
      act("crm.add_note", ["crm"], "on", true, a("deal"), a("text")),
      act("crm.add_lead", ["crm"], "ask", true, a("company"), o("name"), o("notes")),
    ],
  },
  {
    id: "calendar",
    view: "calendar",
    setUp: [
      { id: "connect_account", by: "person" },
      { id: "check_access", by: "itself" },
    ],
    events: ["invited", "changed", "cancelled"],
    skills: ["calendar"],
    actions: [
      act("calendar.free_busy", ["calendar"], "on", false, a("who"), a("from"), a("to")),
      act("calendar.book", ["calendar"], "ask", true, a("title"), a("start"), a("end"), o("with", "list")),
      act("calendar.move", ["calendar"], "ask", true, a("event"), a("start"), a("end")),
      act("calendar.cancel", ["calendar"], "ask", true, a("event")),
    ],
  },
];
