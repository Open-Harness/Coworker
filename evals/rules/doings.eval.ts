import { describe, expect, it } from "vitest";
import { doings } from "~/modules/doings/service.ts";
import { doingSpecs } from "./data/doings.ts";
import { roles, least, person, juno, registry, plain, slots, forPerson, askId, forJuno } from "./doings-world.ts";

describe("doings", () => {
  it("rules:doings/the-registry-has-every-doing-as-agreed", () => {
    expect(doingSpecs.length).toBeGreaterThanOrEqual(60);
    for (const spec of doingSpecs) {
      const d = registry(spec.id);
      expect(d.group, spec.id).toBe(spec.group);
      expect(d.needs, spec.id).toBe(spec.needs);
      expect(d.coworker, spec.id).toBe(spec.coworker);
      expect(d.stops, spec.id).toBe(spec.stops);
      expect(
        d.fields.map((x) => ({ name: x.name, is: x.is, needed: x.needed })),
        `${spec.id} fields`,
      ).toEqual(spec.fields.map((x) => ({ name: x.name, is: x.is, needed: x.needed })));
    }
    // One entry for each, whatever else there is.
    const seen = new Set<string>();
    for (const d of doings.all) {
      expect(seen.has(d.id), `${d.id} twice`).toBe(false);
      seen.add(d.id);
      expect(d.id).toMatch(/^[a-z][a-z_]*(\.[a-z][a-z_]*)+$/u);
    }
  });

  it("rules:doings/each-has-a-page-a-control-a-sentence-and-the-co-worker-stops-where-it-must", () => {
    for (const d of doings.all) {
      for (const text of [d.label, d.at.page, d.at.press, d.sentence]) expect(text.trim().length, d.id).toBeGreaterThan(0);
      const names = d.fields.map((x) => x.name);
      expect(new Set(names).size, `${d.id} fields`).toBe(names.length);
      for (const x of d.fields) expect(x.label.trim().length, `${d.id}.${x.name}`).toBeGreaterThan(0);
      // A sentence speaks only of its own fields, and never of a secret.
      for (const slot of slots(d.sentence)) {
        expect(names, `${d.id} says {${slot}}`).toContain(slot);
        expect(slot, `${d.id} must not say a secret`).not.toMatch(/secret|password|token/iu);
      }
      expect(d.undo === null || d.undo.trim().length > 0, d.id).toBe(true);
      // A change a person decides is never done alone by the co-worker.
      if (d.stops) expect(d.coworker, d.id).not.toBe("on");
      // Nobody but a person answers an ask.
      if (askId(d.id)) {
        expect(d.coworker, d.id).toBe("off");
        expect(d.stops, d.id).toBe(true);
      }
      // What it needs is a role, what it may is a permission.
      expect(["Owner", "Builder", "Member"]).toContain(d.needs);
      expect(["on", "ask", "off"]).toContain(d.coworker);
      // A secret is never something the co-worker is given to type.
      if (d.fields.some((x) => /secret|password|token/iu.test(x.name))) expect(d.coworker, d.id).toBe("off");
    }
    // Every ask is a doing a person does: approving, answering, always.
    expect(doings.all.filter((d) => askId(d.id)).length).toBeGreaterThanOrEqual(3);
  });

  it("rules:doings/it-may-never-do-what-the-person-asking-may-not", () => {
    for (const spec of doingSpecs) {
      // A person: by role, and less if they set it so, never more.
      for (const role of ["Member", "Builder", "Owner"] as const) {
        const who = person(role);
        const said = doings.may(spec.id, who);
        expect(said.is, `${role} ${spec.id}`).toBe(forPerson(spec, who));
        plain(said.why);
        if (said.is === "off" && roles[role] < roles[spec.needs])
          expect(said.why, `${role} ${spec.id}`).toMatch(new RegExp(spec.needs, "u"));
      }
      for (const set of ["off", "ask", "on"] as const) {
        const who = person("Owner", { [spec.id]: set });
        expect(doings.may(spec.id, who).is, `own ${set} ${spec.id}`).toBe(forPerson(spec, who));
        const member = person("Member", { [spec.id]: set });
        expect(doings.may(spec.id, member).is, `member own ${set} ${spec.id}`).toBe(forPerson(spec, member));
      }
      // The co-worker alone: what it may by the registry, or what was set for it; a stop is at most ask.
      expect(doings.may(spec.id, juno()).is, `juno ${spec.id}`).toBe(forJuno(spec, juno()));
      for (const set of ["off", "ask", "on"] as const) {
        const who = juno({ [spec.id]: set });
        expect(doings.may(spec.id, who).is, `juno own ${set} ${spec.id}`).toBe(forJuno(spec, who));
      }
      // On someone's behalf: the less of what it and they may.
      for (const role of ["Member", "Builder", "Owner"] as const) {
        for (const own of [{}, { [spec.id]: "off" as const }, { [spec.id]: "ask" as const }]) {
          const them = person(role, own, "ama");
          const said = doings.may(spec.id, juno(), them);
          expect(said.is, `juno for ${role} ${JSON.stringify(own)} ${spec.id}`).toBe(least(forJuno(spec, juno()), forPerson(spec, them)));
          plain(said.why);
        }
      }
    }
    // The co-worker is held to its own role too.
    for (const spec of doingSpecs) {
      const small = { ...juno(), role: "Member" } as const;
      expect(doings.may(spec.id, small).is, `member co-worker ${spec.id}`).toBe(forJuno(spec, small));
    }
    // The ones that matter, said out loud.
    expect(doings.may("work.add", juno()).is).toBe("on");
    expect(doings.may("work.add", juno(), person("Member")).is).toBe("on");
    expect(doings.may("manager.pause", juno(), person("Member"))).toMatchObject({ is: "off" });
    expect(doings.may("manager.pause", juno(), person("Member")).why).toMatch(/Builder/u);
    expect(doings.may("workspace.export", juno(), person("Builder")).is).toBe("off");
    // Nobody lets it approve an ask, whoever it acts for and whatever was set.
    for (const id of doings.all.map((d) => d.id).filter(askId))
      for (const who of [juno(), juno({ [id]: "on" }), juno({ [id]: "ask" })])
        for (const them of [undefined, person("Owner"), person("Member", { [id]: "on" })])
          expect(doings.may(id, who, them).is, `${id} by the co-worker`).toBe("off");
    // A person says yes to their own asks.
    expect(doings.may("ask.approve", person("Member")).is).toBe("on");
    // Not a doing: not allowed, and it says which.
    const nothing = doings.may("nothing.at_all", person("Owner"));
    expect(nothing.is).toBe("off");
    expect(nothing.why).toMatch(/nothing\.at_all/u);
    expect(doings.may("nothing.at_all", juno(), person("Owner")).is).toBe("off");
    // A set that widens beyond the role: the role holds.
    expect(doings.may("person.invite", person("Member", { "person.invite": "on" })).is).toBe("off");
    expect(doings.may("person.invite", juno({ "person.invite": "on" }), person("Member", { "person.invite": "on" })).is).toBe("off");
  });

  it("rules:doings/what-you-may-not-do-is-not-offered", () => {
    for (const who of [
      person("Member"),
      person("Builder"),
      person("Owner"),
      person("Builder", { "work.add": "off", "manager.pause": "ask" }),
      juno(),
    ]) {
      const offered = doings.offered(who);
      const ids = new Set(offered.map((d) => d.id));
      expect(ids.size).toBe(offered.length);
      // Exactly what is not off, of everything there is.
      for (const d of doings.all) expect(ids.has(d.id), `${who.name} ${d.id}`).toBe(doings.may(d.id, who).is !== "off");
      // The same doing, as the registry has it.
      for (const d of offered) expect(d).toEqual(registry(d.id));
      // Only on the page it is done on.
      for (const page of new Set(doings.all.map((d) => d.at.page))) {
        const here = doings.offered(who, page);
        expect(here.every((d) => d.at.page === page)).toBe(true);
        expect(here.map((d) => d.id).sort()).toEqual(
          offered
            .filter((d) => d.at.page === page)
            .map((d) => d.id)
            .sort(),
        );
      }
      expect(doings.offered(who, "no-such-page")).toEqual([]);
    }
    // A Member is offered what is for Members only.
    const member = new Set(doings.offered(person("Member")).map((d) => d.id));
    for (const spec of doingSpecs) expect(member.has(spec.id), spec.id).toBe(spec.needs === "Member");
    // An Owner is offered all of it.
    const owner = new Set(doings.offered(person("Owner")).map((d) => d.id));
    for (const spec of doingSpecs) expect(owner.has(spec.id), spec.id).toBe(true);
    // One a person set to ask is still offered; one set off is not.
    expect(doings.offered(person("Builder", { "manager.pause": "ask" })).map((d) => d.id)).toContain("manager.pause");
    expect(doings.offered(person("Builder", { "manager.pause": "off" })).map((d) => d.id)).not.toContain("manager.pause");
  });
});
