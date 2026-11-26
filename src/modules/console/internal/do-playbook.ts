import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Change, Files } from "~/modules/playbook/types.ts";
import type { Comment } from "~/modules/views-manager/types.ts";
import { accountsOf, surroundings, wholeOf } from "./around.ts";
import type { Handler } from "./handlers.ts";
import { comeBack, partOfLine, textOfLine } from "./comment-turn.ts";
import { openManager } from "./managers.ts";
import { kindOfDecision, sendBack } from "./send-back.ts";

/* What a person does with what is offered to a playbook, and with what intake judged: accept a line, leave it, correct a decision. */

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** A suggested line against the playbook as it is now: the words it was made from may differ from it only by the space at their end. */
function currentChange(files: Files, change: Change): Change {
  const read = playbooks.read(files);
  if (read._tag === "Problems" || change.was === null) return change;
  const now = playbooks.lines(read.playbook).find(({ line }) => line === change.line)?.text;
  return now !== undefined && now.trim() === change.was.trim() ? { ...change, was: now } : change;
}

const commentOf = async (store: { kept: (kind: string) => Promise<readonly unknown[]> }, id: string): Promise<Comment | undefined> =>
  ((await store.kept("comment")) as readonly Comment[]).find((one) => one.id === id);

/** A line offered is taken on: a new version on top, made of the suggestion, and what was offered is marked taken. */
const accept: Handler = async (c, values) => {
  const open = await openManager(c, text(values["manager"]));
  if (open === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
  const comment = await commentOf(open.store, text(values["comment"]));
  if (comment === undefined || comment.became._tag !== "Change") return refuse("There is no suggestion with that id.");
  if (comment.became.is !== "offered") return refuse(`That suggestion was ${comment.became.is} already.`);
  const latest = (await open.store.version()) ?? open.version;
  const applied = playbooks.apply(latest.files, [currentChange(latest.files, comment.became.change)]);
  if (applied._tag === "Problems") return { _tag: "Problems", problems: applied.problems };
  const around = await surroundings(c, wholeOf(await accountsOf(c)));
  const problems = playbooks.check(applied.playbook, around);
  if (problems.length > 0) return { _tag: "Problems", problems };
  const saved = await open.store.save({
    files: playbooks.write(applied.playbook),
    by: c.who.id,
    at: c.clock.now(),
    says: `Accepted: ${comment.text}`,
    from: "suggestion",
  });
  await open.store.keep("comment", comment.id, { ...comment, became: { ...comment.became, is: "taken" } });
  const says = doings.sentence("suggestion.accept", { comment: comment.id, manager: open.row.node.name }, c.who.name);
  return { _tag: "Done", id: String(saved.number), says, link: `/m/${open.row.node.id}/playbook` };
};

const leave: Handler = async (c, values) => {
  const open = await openManager(c, text(values["manager"]));
  if (open === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
  const comment = await commentOf(open.store, text(values["comment"]));
  if (comment === undefined || comment.became._tag !== "Change") return refuse("There is no suggestion with that id.");
  await open.store.keep("comment", comment.id, { ...comment, became: { ...comment.became, is: "left" } });
  const says = doings.sentence("suggestion.leave", { comment: comment.id, manager: open.row.node.name }, c.who.name);
  return { _tag: "Done", id: comment.id, says, link: null };
};

/** A comment on a line: kept at once, then the co-worker answers it, and what it became is kept beside it. */
const commentOn: Handler = async (c, values) => {
  const [manager, line, said] = [text(values["manager"]), text(values["line"]), text(values["text"])];
  const open = await openManager(c, manager);
  if (open === undefined) return refuse(`There is no manager "${manager}".`);
  if (open.playbook === null) return refuse("The playbook does not read, so a line of it cannot be commented on.");
  const was = textOfLine(open.playbook, line);
  if (was === undefined) return refuse(`There is no line "${line}" in ${open.row.node.name}.`);
  const id = c.ids.next("cm");
  const made: Comment = {
    id,
    on: line,
    part: partOfLine(line),
    by: c.who.name,
    at: c.clock.now(),
    text: said,
    quote: null,
    became: { _tag: "Open" },
  };
  await open.store.keep("comment", id, made);
  const became = await comeBack(c, made, was);
  if (became._tag !== "Open") await open.store.keep("comment", id, { ...made, became });
  const says = doings.sentence("line.comment", { line, manager: open.row.node.name, text: said }, c.who.name);
  return { _tag: "Done", id, says, link: `/m/${open.row.node.id}/playbook` };
};

const SHOULD = ["took", "left", "asked"];

/** What intake did with an item, and what it should have done: the correction is kept. It is a case for the judge too, made of it and of what the judge said, when the week's look is made. */
const correct: Handler = async (c, values) => {
  const [manager, item, should] = [text(values["manager"]), text(values["item"]), text(values["should"]).toLowerCase()];
  if (!SHOULD.includes(should)) return refuse(`What it should have done is one of: ${SHOULD.join(", ")}.`);
  const open = await openManager(c, manager);
  if (open === undefined) return refuse(`There is no manager "${manager}".`);
  const { rows } = await c.store.items(manager, { from: null, before: null, limit: 500 });
  const row = rows.find((one) => one.item.id === item);
  if (row === undefined) return refuse("That did not come in to this manager.");
  await c.store.keep("correction", `${manager}:${item}`, { manager, item, should, by: c.who.name, at: c.clock.now() });
  const kind = row.decision === null ? undefined : kindOfDecision(row.decision, manager);
  if (kind !== undefined) await sendBack(c, open, kind);
  return { _tag: "Done", id: item, says: doings.sentence("intake.correct", { item: row.item.title, should }, c.who.name), link: null };
};

export const playbookHandlers: Readonly<Record<string, Handler>> = {
  "suggestion.accept": accept,
  "suggestion.leave": leave,
  "intake.correct": correct,
  "line.comment": commentOn,
};
