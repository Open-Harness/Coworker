import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import { templates } from "~/modules/templates/service.ts";
import type { Answers } from "~/modules/templates/types.ts";
import { tree } from "~/modules/tree/service.ts";
import type { ManagerNode } from "~/modules/tree/types.ts";
import { accountsOf, surroundings, wholeOf } from "./around.ts";
import type { Handler } from "./handlers.ts";
import { savedTemplates, templatesOf } from "./templates.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** The answers as they come: a record of text, or the same written as JSON. Anything else is no answer. */
function answersOf(value: unknown): Answers {
  const raw: unknown = typeof value === "string" && value.trim() !== "" ? JSON.parse(value) : value;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).flatMap(([name, one]) => (typeof one === "string" || typeof one === "number" ? [[name, String(one)]] : [])),
  );
}

/** A manager made from a template: the blanks filled and checked, its own copy as version 1 in its own object, and its place in the tree. */
const make: Handler = async (c, values) => {
  const template = (await templatesOf(c)).find(({ id }) => id === text(values["template"]));
  if (template === undefined) return refuse(`There is no template "${text(values["template"])}".`);
  const rows = await c.store.managers();
  const aboveId = text(values["above"]);
  const above = aboveId === "" ? null : rows.find(({ node }) => node.id === aboveId);
  if (above === undefined) return refuse(`There is no manager "${aboveId}" to make it under.`);
  const whole = wholeOf(await accountsOf(c));
  const around = await surroundings(c, above === null ? whole : above.node.reach);
  const given = answersOf(values["answers"]);
  const asked = template.blanks.some(({ id }) => id === "owner") ? { owner: c.who.id, ...given } : given;
  const filled = templates.fill(template, asked, around);
  if (filled._tag === "Problems") return { _tag: "Problems", problems: filled.problems };
  if (filled._tag === "Blank") {
    const names = filled.blanks.map((id) => template.blanks.find((blank) => blank.id === id)?.ask ?? id);
    return refuse(`Still blank: ${names.join(" ")}`);
  }
  const read = playbooks.read(filled.files);
  if (read._tag === "Problems") return { _tag: "Problems", problems: read.problems };
  const { playbook } = read;
  const from = { id: filled.from.template, version: filled.from.version };
  const node: ManagerNode = {
    id: c.ids.next("mgr"),
    name: playbook.name,
    above: above === null ? null : above.node.id,
    answers: c.who.id,
    template: from,
    version: 1,
    state: "runs",
    reach: { grants: playbook.reach.grants, limits: playbook.reach.limits },
  };
  const grown = tree.grow(
    rows.map((row) => row.node),
    { is: "make", node },
    whole,
  );
  if (grown._tag === "Refused")
    return { _tag: "Problems", problems: grown.problems.length > 0 ? grown.problems : [{ at: "reach.yaml", says: grown.why }] };
  const at = c.clock.now();
  const { objectId, store } = c.managers.mint(c.workspace.region);
  await store.open({ id: node.id, workspace: c.workspace.id, name: node.name, template: from, by: c.who.id, at, files: filled.files });
  const hears = playbook.triggers.flatMap((trigger) =>
    trigger.on && trigger.by === "event" && trigger.account === "github" ? [trigger.place] : [],
  );
  await c.store.addManager({ node, objectId, region: c.workspace.region, by: c.who.id, at, hears: [...new Set(hears)] });
  return {
    _tag: "Done",
    id: node.id,
    says: doings.sentence("manager.make", { template: template.name }, c.who.name),
    link: `/m/${node.id}`,
  };
};

/** A manager saved as a template of this workspace: places, people, models and secrets become blanks or go. */
const save: Handler = async (c, values) => {
  const row = (await c.store.managers()).find(({ node }) => node.id === text(values["manager"]));
  if (row === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
  const version = await c.managers.get(row.objectId, row.region).version();
  if (version === undefined) return refuse("That manager has no playbook yet.");
  const name = text(values["name"]);
  const id = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
  if (id === "" || (await templatesOf(c)).some((one) => one.id === id))
    return refuse(`There is a template called "${name}" already, or the name has no letters.`);
  const saved = templates.saveAs({ id, name, about: text(values["about"]), files: version.files });
  const all = [...(await savedTemplates(c)), { template: saved.template, from: row.node.id, at: c.clock.now() }];
  await c.store.set("templates", all);
  return { _tag: "Done", id, says: doings.sentence("template.save", { manager: row.node.name, name }, c.who.name), link: null };
};

export const managerHandlers: Readonly<Record<string, Handler>> = { "manager.make": make, "template.save": save };
