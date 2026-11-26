import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Item } from "~/modules/intake/types.ts";
import type { Kind } from "~/modules/playbook/types.ts";
import { reaches } from "~/modules/reach/service.ts";
import type { Work, WorkEvent } from "~/modules/work/types.ts";
import type { Changed } from "~/modules/working/types.ts";
import type { ConsoleDeps } from "../types.ts";
import type { Handler } from "./handlers.ts";
import { openManager, type Open } from "./managers.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const sentence = (id: string, words: Readonly<Record<string, string>>, by: string): string => doings.sentence(id, words, by);

/** One piece of work, and the manager it is in; or what is wrong in words. */
async function found(
  c: ConsoleDeps,
  values: Readonly<Record<string, unknown>>,
): Promise<{ readonly open: Open; readonly work: Work } | Did> {
  const open = await openManager(c, text(values["manager"]));
  if (open === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
  const work = (await open.store.board()).find(({ work: one }) => one.id === text(values["work"]))?.work;
  return work === undefined ? refuse(`There is no work "${text(values["work"])}" on ${open.row.node.name}.`) : { open, work };
}

const isDid = (value: { readonly open: Open; readonly work: Work } | Did): value is Did => "_tag" in value;

/** What a person did to it, said once for its page, and the answer of the manager's object in words. */
async function change(c: ConsoleDeps, open: Open, work: Work, event: WorkEvent, said: string): Promise<Changed> {
  const changed = await open.store.event(work.id, event);
  if (changed._tag === "Moved") await c.store.note({ manager: open.row.node.id, work: work.id, who: c.who.name, at: event.at, text: said });
  return changed;
}

const words = (changed: Changed): string | null =>
  changed._tag === "Refused" ? changed.why : changed._tag === "Gone" ? "That work is not there." : null;

const stamp = (c: ConsoleDeps, name: string) => ({ key: `${name}:${c.ids.next("evt")}`, at: c.clock.now() });

/** By hand: a piece of work of one of the manager's kinds, asked by this person. */
const add: Handler = async (c, values) => {
  const open = await openManager(c, text(values["manager"]));
  if (open === undefined || open.playbook === null) return refuse(`There is no manager "${text(values["manager"])}" that can take work.`);
  const kinds = open.playbook.kinds;
  const asked = text(values["kind"]);
  const kind: Kind | undefined =
    asked === "" ? kinds[0] : kinds.find(({ id, name }) => id === asked || name.toLowerCase() === asked.toLowerCase());
  if (kind === undefined) return refuse(`${open.row.node.name} has no kind of work called "${asked}".`);
  const { mandate } = reaches.mandate(
    open.row.node.reach,
    { grants: kind.may, limits: kind.limits },
    { strength: "asked", because: { by: "person", id: c.who.id }, version: open.version.number },
  );
  const at = c.clock.now();
  const id = c.ids.next("itm");
  const title = text(values["title"]);
  /** Work added by hand is on the repo its manager works on, so that its box has that clone and its agents what the mandate gives there. */
  const repo = open.row.hears[0];
  const item: Item = {
    id,
    trigger: c.via === undefined ? "console" : "chat",
    by: "asked",
    account: repo === undefined ? "console" : "github",
    place: repo ?? open.row.node.id,
    thread: c.via === undefined ? `console:${open.row.node.id}#${id}` : `${c.via}#${id}`,
    event: "added",
    actor: { address: `person:${c.who.id}`, name: c.who.name, bot: false, person: c.who.id, standing: "inside" },
    addressed: true,
    at,
    title,
    text: text(values["about"]),
    same: `console:${id}`,
  };
  const took = await open.store.take({
    item,
    took: {
      _tag: "Took",
      item: id,
      gated: [],
      verdicts: [],
      why: `${c.who.name} added it by hand.`,
      manager: open.row.node.id,
      kind: kind.id,
      version: open.version.number,
      mandate,
      waits: false,
    },
    answers: c.who.id,
  });
  if ("_tag" in took) return refuse("why" in took ? took.why : `${open.row.node.name} is not opened yet.`);
  await c.store.note({ manager: open.row.node.id, work: took.work, who: c.who.name, at, text: `Added it as ${kind.name}` });
  return {
    _tag: "Done",
    id: took.work,
    says: sentence("work.add", { title, manager: open.row.node.name }, c.who.name),
    link: `/m/${open.row.node.id}/work/${took.work}`,
  };
};

const stop: Handler = async (c, values) => {
  const one = await found(c, values);
  if (isDid(one)) return one;
  const why = text(values["why"]);
  const changed = await change(
    c,
    one.open,
    one.work,
    { ...stamp(c, "stopped"), is: "stopped", person: c.who.name, why },
    `Stopped it: ${why}`,
  );
  const wrong = words(changed);
  return wrong !== null
    ? refuse(wrong)
    : {
        _tag: "Done",
        id: one.work.id,
        says: sentence("work.stop", { work: one.work.title, manager: one.open.row.node.name }, c.who.name),
        link: null,
      };
};

const openAgain: Handler = async (c, values) => {
  const one = await found(c, values);
  if (isDid(one)) return one;
  const why = text(values["why"]);
  const changed = await change(
    c,
    one.open,
    one.work,
    { ...stamp(c, "again"), is: "opened again", person: c.who.name, why },
    `Opened it again: ${why}`,
  );
  const wrong = words(changed);
  return wrong !== null
    ? refuse(wrong)
    : { _tag: "Done", id: one.work.id, says: sentence("work.open_again", { work: one.work.title }, c.who.name), link: null };
};

/** To a step of its kind. Past the first, what done means has to be said: a person who moves it says it as its kind does. */
const move: Handler = async (c, values) => {
  const one = await found(c, values);
  if (isDid(one)) return one;
  const { open, work } = one;
  const kind = open.playbook?.kinds.find(({ id }) => id === work.kind);
  const step = kind?.steps.find(({ id, name }) => id === text(values["step"]) || name === text(values["step"]));
  if (kind === undefined || step === undefined) return refuse(`There is no step "${text(values["step"])}" in this kind of work.`);
  if (work.doneWhen === null && kind.steps[0]?.id !== step.id && kind.doneWhen.length > 0) {
    const said = await open.store.event(work.id, { ...stamp(c, "said"), is: "said done when", checks: kind.doneWhen });
    const wrong = words(said);
    if (wrong !== null) return refuse(wrong);
  }
  const changed = await change(
    c,
    open,
    work,
    { ...stamp(c, "moved"), is: "moved", person: c.who.name, step: step.id },
    `Moved it to ${step.name}`,
  );
  const wrong = words(changed);
  return wrong !== null
    ? refuse(wrong)
    : { _tag: "Done", id: work.id, says: sentence("work.move", { work: work.title, step: step.name }, c.who.name), link: null };
};

export const workHandlers: Readonly<Record<string, Handler>> = {
  "work.add": add,
  "work.stop": stop,
  "work.open_again": openAgain,
  "work.move": move,
};
