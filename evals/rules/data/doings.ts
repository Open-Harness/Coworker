/*
 * What the console can do, as agreed: one row per doing. The product's registry (`doings.all`) must have each of these,
 * with this id, group, fields (name, kind and whether needed, in this order), role needed, what the co-worker may do with
 * it when nobody says otherwise, and whether the co-worker always stops before it. It may have more; it may not have less.
 * Locked with the evals. Field values that are an object or a list are sent as JSON, so they are `long text`.
 */
import type { Field, Group, Role } from "~/modules/doings/types.ts";
import type { Permission } from "~/modules/reach/types.ts";

export interface DoingSpec {
  readonly id: string;
  readonly group: Group;
  readonly needs: Role;
  readonly coworker: Permission;
  readonly stops: boolean;
  readonly fields: readonly Pick<Field, "name" | "is" | "needed">[];
}

const f = (name: string, is: Field["is"] = "text", needed = true) => ({ name, is, needed });
const o = (name: string, is: Field["is"] = "text") => f(name, is, false);
const d = (
  id: string,
  group: Group,
  needs: Role,
  coworker: Permission,
  stops: boolean,
  ...fields: readonly Pick<Field, "name" | "is" | "needed">[]
): DoingSpec => ({ id, group, needs, coworker, stops, fields });

export const doingSpecs: readonly DoingSpec[] = [
  // Managers
  d("manager.make", "Managers", "Builder", "ask", true, f("template", "pick"), o("answers", "long text"), o("above", "pick")),
  d("manager.pause", "Managers", "Builder", "ask", false, f("manager", "pick")),
  d("manager.start", "Managers", "Builder", "ask", false, f("manager", "pick")),
  d("manager.retire", "Managers", "Builder", "ask", true, f("manager", "pick"), o("handTo", "pick")),
  d("manager.move", "Managers", "Builder", "ask", true, f("manager", "pick"), f("above", "pick")),
  d(
    "manager.settings",
    "Managers",
    "Builder",
    "ask",
    true,
    f("manager", "pick"),
    o("name"),
    o("answers", "long text"),
    o("connection", "pick"),
    o("model", "pick"),
    o("thinking", "pick"),
    o("perWork", "number"),
    o("perDay", "number"),
  ),
  d("template.save", "Managers", "Builder", "ask", false, f("manager", "pick"), f("name"), f("about", "long text")),
  d("version.save", "Managers", "Builder", "ask", true, f("manager", "pick"), f("version", "number"), f("files", "long text")),
  d("version.go_back", "Managers", "Builder", "ask", true, f("manager", "pick"), f("version", "number")),
  d("line.comment", "Managers", "Member", "on", false, f("manager", "pick"), f("line"), f("text", "long text")),
  d("suggestion.accept", "Managers", "Builder", "ask", true, f("manager", "pick"), f("comment")),
  d("suggestion.leave", "Managers", "Builder", "on", false, f("manager", "pick"), f("comment")),
  d("trigger.add", "Managers", "Builder", "ask", true, f("manager", "pick"), f("trigger", "long text")),
  d("trigger.off", "Managers", "Builder", "ask", false, f("manager", "pick"), f("trigger", "pick")),
  d("trigger.run", "Managers", "Builder", "ask", false, f("manager", "pick"), f("trigger", "pick")),
  d("try.change", "Managers", "Builder", "on", false, f("manager", "pick"), f("part", "long text")),
  d("skill.add", "Managers", "Builder", "ask", false, f("manager", "pick"), f("name"), f("says", "long text")),
  d("agent.use", "Managers", "Builder", "ask", false, f("agent", "pick"), f("manager", "pick")),
  d("reach.edit", "Managers", "Builder", "ask", true, f("manager", "pick"), f("reach", "long text")),
  d("objective.edit", "Managers", "Builder", "ask", true, f("manager", "pick"), f("objective", "long text")),
  d("eval.judge", "Managers", "Member", "off", true, f("manager", "pick"), f("case", "pick"), f("said", "pick")),
  d("eval.retire", "Managers", "Builder", "off", true, f("manager", "pick"), f("eval", "pick")),
  // Work
  d("work.add", "Work", "Member", "on", false, f("manager", "pick"), f("kind", "pick"), f("title"), f("about", "long text")),
  d("work.stop", "Work", "Member", "ask", false, f("manager", "pick"), f("work", "pick"), f("why", "long text")),
  d("work.move", "Work", "Member", "on", false, f("manager", "pick"), f("work", "pick"), f("step", "pick")),
  d("work.order", "Work", "Member", "on", false, f("manager", "pick"), f("work", "pick"), o("before", "pick"), o("priority", "pick")),
  d("work.done_when", "Work", "Member", "ask", true, f("manager", "pick"), f("work", "pick"), f("checks", "long text")),
  d("work.open_again", "Work", "Member", "off", true, f("manager", "pick"), f("work", "pick"), f("why", "long text")),
  d("work.answers", "Work", "Member", "ask", false, f("manager", "pick"), f("work", "pick"), f("person", "person")),
  d("work.hand_over", "Work", "Builder", "ask", true, f("manager", "pick"), f("work", "pick"), f("to", "pick"), f("part", "long text")),
  d("ask.approve", "Work", "Member", "off", true, f("ask", "pick")),
  d("ask.answer", "Work", "Member", "off", true, f("ask", "pick"), f("answer", "long text")),
  d("ask.always", "Work", "Builder", "off", true, f("ask", "pick"), f("for", "pick")),
  d("rule.take_away", "Work", "Builder", "ask", false, f("rule", "pick")),
  // Intake
  d("intake.correct", "Intake", "Member", "off", true, f("manager", "pick"), f("item", "pick"), f("should", "pick")),
  d("kind.alone", "Intake", "Builder", "ask", true, f("manager", "pick"), f("kind", "pick"), f("alone", "pick")),
  // Chats
  d("chat.new", "Chats", "Member", "off", false),
  d("chat.fork", "Chats", "Member", "on", false, f("chat", "pick"), f("message", "pick")),
  // Connectors
  d("connector.connect", "Connectors", "Owner", "ask", false, f("connector", "pick")),
  d("connector.check", "Connectors", "Builder", "on", false, f("account", "pick")),
  d("connector.scan", "Connectors", "Owner", "off", false, f("account", "pick")),
  d("connector.take_away", "Connectors", "Owner", "ask", true, f("account", "pick")),
  d("account.lend", "Connectors", "Member", "off", true, f("account", "pick"), f("to", "person")),
  d("mcp.add", "Connectors", "Owner", "off", true, f("name"), f("url"), o("secret")),
  d("mcp.check", "Connectors", "Builder", "on", false, f("server", "pick")),
  d("mcp.remove", "Connectors", "Owner", "ask", false, f("server", "pick")),
  d("mcp.tool", "Connectors", "Builder", "ask", true, f("server", "pick"), f("tool", "pick"), f("permission", "pick")),
  d("conversation.tell", "Connectors", "Member", "on", false, f("manager", "pick"), f("thread", "pick"), f("text", "long text")),
  d("conversation.write", "Connectors", "Member", "ask", true, f("thread", "pick"), f("text", "long text")),
  d("conversation.hand_back", "Connectors", "Member", "on", false, f("thread", "pick")),
  // Settings
  d("person.invite", "Settings", "Owner", "ask", true, f("mail"), f("role", "pick")),
  d("person.let_in", "Settings", "Owner", "off", true, f("request", "pick")),
  d("person.say_no", "Settings", "Owner", "ask", false, f("request", "pick")),
  d("person.role", "Settings", "Owner", "ask", true, f("person", "person"), f("role", "pick")),
  d("person.remove", "Settings", "Owner", "ask", true, f("person", "person")),
  d("key.add", "Settings", "Owner", "off", true, f("provider", "pick"), f("secret")),
  d("key.replace", "Settings", "Owner", "off", true, f("key", "pick"), f("secret")),
  d("models.default", "Settings", "Owner", "ask", true, f("connection", "pick"), f("model", "pick"), f("thinking", "pick")),
  d("billing.change_plan", "Settings", "Owner", "off", true, f("plan", "pick")),
  d("billing.update_card", "Settings", "Owner", "off", true),
  d("billing.download", "Settings", "Owner", "on", false, f("invoice", "pick")),
  d("profile.add_mail", "Settings", "Member", "off", false, f("mail")),
  d("security.add_passkey", "Settings", "Member", "off", false),
  d("security.remove_passkey", "Settings", "Member", "off", false, f("passkey", "pick")),
  d("security.sign_out_others", "Settings", "Member", "off", false),
  d("session.sign_out", "Settings", "Member", "off", false),
  d("environment.add", "Settings", "Builder", "ask", true, f("name"), f("setUp", "long text"), f("size", "pick")),
  d("environment.remove", "Settings", "Builder", "ask", false, f("environment", "pick")),
  d("workspace.general", "Settings", "Owner", "ask", true, o("name"), o("perDay", "number")),
  d("workspace.export", "Settings", "Owner", "off", false),
  d("workspace.delete", "Settings", "Owner", "off", true, f("name")),
  d("workspace.take_back", "Settings", "Owner", "off", false),
  // Co-worker
  d("note.forget", "Co-worker", "Member", "off", true, f("note", "pick")),
  d("note.accept", "Co-worker", "Builder", "off", true, f("note", "pick")),
  d("note.leave", "Co-worker", "Member", "on", false, f("note", "pick")),
  d("soul.save", "Co-worker", "Owner", "ask", true, f("text", "long text")),
  d("talking.edit", "Co-worker", "Owner", "ask", true, f("who", "pick"), f("how", "long text"), f("may", "long text"), f("sign")),
  d("coworker.may", "Co-worker", "Owner", "ask", true, f("doing", "pick"), f("permission", "pick")),
  d("spending.save", "Co-worker", "Owner", "ask", true, f("parts", "long text")),
  d("routine.add", "Co-worker", "Owner", "ask", false, f("name"), f("when"), f("what", "long text")),
  d("history.undo", "Co-worker", "Builder", "ask", false, f("entry", "pick")),
];
