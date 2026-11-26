import { describe, expect, it } from "vitest";
import { doings } from "~/modules/doings/service.ts";
import type { Found } from "~/modules/doings/types.ts";
import { doingSpecs } from "./data/doings.ts";
import { person, juno, registry, plain, slots } from "./doings-world.ts";

describe("doings", () => {
  it("rules:doings/the-palette-asks-first-then-places-doings-and-things-best-first", () => {
    const things: readonly Found[] = [
      { is: "find", id: "rep", label: "Resales report", about: "A document" },
      { is: "find", id: "desk", label: "Sales desk", about: "A chat" },
      { is: "go", id: "page-sales", label: "Sales", about: "A manager" },
      { is: "find", id: "nw", label: "Northwind renewal", about: "A deal" },
      { is: "find", id: "q3", label: "Q3 plan", about: "About sales" },
      { is: "go", id: "page-support", label: "Support", about: "A manager" },
    ];
    const order = { ask: 0, go: 1, do: 2, find: 3 } as const;
    const found = doings.find("sales", person("Owner"), things);
    // Asking is first, once, with the words in it.
    expect(found[0]?.is).toBe("ask");
    expect(found.filter((f) => f.is === "ask")).toHaveLength(1);
    expect(found[0]?.label).toMatch(/sales/iu);
    expect(found[0]?.about.trim().length).toBeGreaterThan(0);
    // Then places, doings, things.
    const kinds = found.map((f) => order[f.is]);
    expect(kinds).toEqual([...kinds].sort((a, b) => a - b));
    // What matches, and nothing else; best first: the same, then begins with, then has it, then is about it.
    expect(found.filter((f) => f.is === "go").map((f) => f.id)).toEqual(["page-sales"]);
    expect(found.filter((f) => f.is === "find").map((f) => f.id)).toEqual(["desk", "rep", "q3"]);
    // The same in any case, with spaces round it.
    expect(doings.find("  SALES ", person("Owner"), things).slice(1)).toEqual(found.slice(1));
    // The doings that match, and may be done.
    const pause = doings.find("pause", person("Builder"), []);
    expect(pause[0]?.is).toBe("ask");
    const pauseDo = pause.filter((f) => f.is === "do");
    expect(pauseDo.map((f) => f.id)).toContain("manager.pause");
    expect(pauseDo.find((f) => f.id === "manager.pause")?.label).toBe(registry("manager.pause").label);
    expect(
      doings
        .find("pause", person("Member"), [])
        .filter((f) => f.is === "do")
        .map((f) => f.id),
    ).not.toContain("manager.pause");
    // Places before doings, whatever the words.
    const mixed = doings.find("pause", person("Builder"), [{ is: "go", id: "page-pause", label: "Pause settings", about: "A page" }]);
    expect(mixed.map((f) => f.is)).toEqual(["ask", "go", ...mixed.slice(2).map(() => "do" as const)]);
    expect(mixed.length).toBeGreaterThan(2);
    // Everything that comes as a doing is one that is not off for them.
    for (const who of [person("Member"), person("Builder"), person("Owner"), juno()])
      for (const word of ["add", "work", "manager", "invite", "key", "delete"])
        for (const f of doings.find(word, who, []).filter((x) => x.is === "do"))
          expect(doings.may(f.id, who).is, `${who.name} ${f.id}`).not.toBe("off");
    // The exact name first.
    const work = registry("work.add");
    const exact = doings.find(work.label.toLowerCase(), person("Owner"), []).filter((f) => f.is === "do");
    expect(exact[0]?.id).toBe("work.add");
    // Words that mean something else in a pattern mean themselves.
    for (const words of [".*", "(", "[a-z]+", "^", "\\", "sales|support"])
      expect(
        doings.find(words, person("Owner"), things).map((f) => f.is),
        words,
      ).toEqual(["ask"]);
    // Nothing is made up of the things: they come as they were given.
    expect(found.find((f) => f.id === "desk")).toEqual(things[1]);
  });

  it("rules:doings/a-sentence-says-who-and-what-without-running-into-itself", () => {
    for (const spec of doingSpecs) {
      const d = registry(spec.id);
      const values = Object.fromEntries(d.fields.map((x) => [x.name, `value-of-${x.name}`]));
      const said = doings.sentence(spec.id, values, "Ama Mensah");
      plain(said);
      expect(said, spec.id).toContain("Ama Mensah");
      for (const slot of slots(d.sentence)) expect(said, `${spec.id} ${slot}`).toContain(`value-of-${slot}`);
      expect(said, spec.id).not.toMatch(/\{[a-zA-Z]+\}/u);
      expect(said).not.toMatch(/undefined|\[object|NaN/u);
    }
    // What a value says is not a slot, nor a way to say something else.
    const withSlots = doings.all.find((d) => slots(d.sentence).length >= 1);
    if (!withSlots) throw new Error("no doing says anything of its fields");
    const [first, second] = slots(withSlots.sentence);
    const tricky = `{${second ?? first}} and {by} and {x}`;
    const said = doings.sentence(
      withSlots.id,
      Object.fromEntries(withSlots.fields.map((x) => [x.name, x.name === first ? tricky : "plain"])),
      "Ama",
    );
    expect(said).toContain(tricky);
    // A field with nothing in it is not made up, and the sentence still says who.
    const bare = doings.sentence(withSlots.id, {}, "Ama");
    expect(bare).toContain("Ama");
    expect(bare).not.toMatch(/undefined|\[object|NaN|null/u);
    // Someone with a funny name is still named as they are.
    expect(doings.sentence(withSlots.id, {}, "Ama {title} </b>")).toContain("Ama {title} </b>");
  });

  it("rules:doings/a-walk-goes-to-the-page-fills-in-order-and-stops-before-what-a-person-decides", () => {
    for (const spec of doingSpecs) {
      const d = registry(spec.id);
      const values = Object.fromEntries(d.fields.map((x) => [x.name, `value-of-${x.name}`]));
      const steps = doings.walk(spec.id, values);
      expect(steps.length, spec.id).toBeGreaterThanOrEqual(2);
      for (const s of steps) {
        plain(s.say);
        expect(s.at.page, spec.id).toBe(d.at.page);
      }
      // First to the page, last the control, and what is between is the fields in order.
      expect(steps[0]?.does).toBe("go");
      const last = steps[steps.length - 1];
      expect(last?.does).toBe("press");
      expect(last?.at.press).toBe(d.at.press);
      const fills = steps.filter((s) => s.does === "fill");
      expect(
        fills.map((s) => s.field),
        spec.id,
      ).toEqual(d.fields.map((x) => x.name));
      for (const s of fills) expect(s.value).toBe(`value-of-${s.field}`);
      expect(steps.filter((s) => s.does === "go")).toHaveLength(1);
      expect(steps.filter((s) => s.does === "press")).toHaveLength(1);
      expect(steps.indexOf(last as (typeof steps)[number])).toBe(steps.length - 1);
      for (const s of steps.slice(0, -1)) expect(["go", "point", "fill"], spec.id).toContain(s.does);
      // The co-worker does what comes before; a person decides what is changed.
      for (const s of steps.slice(0, -1)) expect(s.yours, `${spec.id} ${s.does}`).toBe(false);
      if (d.stops) expect(last?.yours, spec.id).toBe(true);
    }
    // What is not given is not filled, what is not a field is not made one, and the order is the doing's own.
    const work = registry("work.add");
    const some = doings.walk("work.add", { title: "Fix it", nonsense: "x", manager: "coding" });
    expect(some.filter((s) => s.does === "fill").map((s) => s.field)).toEqual(["manager", "title"]);
    expect(some.some((s) => s.value === "x")).toBe(false);
    const flipped = doings.walk("work.add", { title: "Fix it", manager: "coding" });
    expect(flipped.map((s) => [s.does, s.field, s.value])).toEqual(some.map((s) => [s.does, s.field, s.value]));
    expect(work.fields.map((x) => x.name).slice(0, 2)).toEqual(["manager", "kind"]);
    // Not a doing: no steps.
    expect(doings.walk("nothing.at_all", {})).toEqual([]);
  });
});
