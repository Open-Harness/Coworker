import { describe, expect, it } from "vitest";
import { connectors } from "~/modules/connectors/service.ts";
import type { Arg } from "~/modules/connectors/types.ts";
import { type ActionSpec, type ConnectorSpec, connectorSpecs } from "./data/connectors.ts";

const spec = (id: string): ConnectorSpec => {
  const found = connectorSpecs.find((c) => c.id === id);
  if (!found) throw new Error(`no spec ${id}`);
  return found;
};
const product = (id: string) => {
  const found = connectors.all.find((c) => c.id === id);
  if (!found) throw new Error(`no connector ${id}`);
  return found;
};
const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(3);
  expect(text).not.toMatch(/\b(blocked|pending)\b/iu);
};
const sample = (is: Arg["is"]): unknown => (is === "text" ? "a text" : is === "number" ? 3 : ["one", "two"]);
/** A call a model could make: every needed one, nothing else. */
const valid = (action: ActionSpec): Record<string, unknown> =>
  Object.fromEntries(action.args.filter((x) => x.needed).map((x) => [x.name, sample(x.is)]));
const allActions = connectorSpecs.flatMap((c) => c.actions);

/** One connector, as agreed, against the product's. */
const agreed = (id: string) => {
  const want = spec(id);
  const have = product(id);
  expect(have.view).toBe(want.view);
  for (const event of want.events)
    expect(
      have.events.map((e) => e.id),
      `${id} hears ${event}`,
    ).toContain(event);
  for (const e of have.events) {
    expect(e.id.trim().length).toBeGreaterThan(0);
    plain(e.says);
  }
  expect(new Set(have.events.map((e) => e.id)).size).toBe(have.events.length);
  for (const step of want.setUp) {
    const found = have.setUp.find((s) => s.id === step.id);
    expect(found, `${id} set up ${step.id}`).toBeDefined();
    expect(found?.by, `${id} set up ${step.id}`).toBe(step.by);
    if (found) plain(found.says);
  }
  for (const skill of want.skills) expect(have.skills, `${id} skills`).toContain(skill);
  for (const action of want.actions) {
    const found = have.actions.find((x) => x.id === action.id);
    expect(found, action.id).toBeDefined();
    if (!found) continue;
    expect(found.fixed, `${action.id} fixed`).toEqual(action.fixed);
    expect(
      found.args.map((x) => ({ name: x.name, is: x.is, needed: x.needed })),
      `${action.id} args`,
    ).toEqual(action.args.map((x) => ({ name: x.name, is: x.is, needed: x.needed })));
    expect(found.starts, `${action.id} starts`).toBe(action.starts);
    expect(found.outside, `${action.id} outside`).toBe(action.outside);
    plain(found.does);
    // The same one wherever it is asked for.
    expect(connectors.action(action.id)).toEqual(found);
  }
};

describe("connectors", () => {
  it("rules:connectors/each-has-the-same-five-parts", () => {
    expect(connectors.all.map((c) => c.id).sort()).toEqual(["calendar", "crm", "email", "github", "slack", "whatsapp"]);
    expect(connectorSpecs.map((c) => c.id).sort()).toEqual(["calendar", "crm", "email", "github", "slack", "whatsapp"]);
    for (const c of connectors.all) {
      expect(c.name.trim().length).toBeGreaterThan(0);
      // Set up, in, out, skills, its view.
      expect(c.setUp.length, `${c.id} set up`).toBeGreaterThan(0);
      expect(c.events.length, `${c.id} in`).toBeGreaterThan(0);
      expect(c.actions.length, `${c.id} out`).toBeGreaterThan(0);
      expect(c.skills.length, `${c.id} skills`).toBeGreaterThan(0);
      expect(c.skills, `${c.id} has its own skill`).toContain(c.id);
      expect(["mail", "chat", "channels", "repo", "deals", "calendar"]).toContain(c.view);
      // Every action is of this connector, and none is said twice.
      for (const x of c.actions) expect(x.id.startsWith(`${c.id}.`), x.id).toBe(true);
      expect(new Set(c.actions.map((x) => x.id)).size).toBe(c.actions.length);
      expect(new Set(c.setUp.map((s) => s.id)).size).toBe(c.setUp.length);
    }
    // Each connector brings its own view.
    expect(new Set(connectors.all.map((c) => c.view)).size).toBe(connectors.all.length);
  });

  it("rules:connectors/set-up-says-which-steps-need-a-person", () => {
    for (const want of connectorSpecs) {
      const have = product(want.id);
      for (const step of have.setUp) {
        expect(["itself", "person"]).toContain(step.by);
        plain(step.says);
      }
      // Where only a person can, it says so: an install, a scan, a DNS record.
      expect(
        have.setUp.some((s) => s.by === "person"),
        `${want.id} has a step for a person`,
      ).toBe(true);
    }
    for (const c of ["github", "slack", "whatsapp", "email"]) expect(product(c).setUp.some((s) => s.by === "itself")).toBe(true);
    agreed("github");
    agreed("whatsapp");
  });

  it("rules:connectors/github-hears-and-can-do-what-was-agreed", () => {
    agreed("github");
    // Pull requests, reviews, line comments, checks, pushes to the default branch, merges and closes.
    const events = product("github").events.map((e) => e.id);
    for (const e of ["pull_request", "review", "line_comment", "check", "push", "merged", "closed"]) expect(events).toContain(e);
  });

  it("rules:connectors/email-and-slack-hear-and-can-do-what-was-agreed", () => {
    agreed("email");
    agreed("slack");
    // Sent outside to someone new: a person says yes first. Inside: on.
    expect(connectors.action("email.send_outside")).toMatchObject({ starts: "ask", outside: true });
    expect(connectors.action("email.send_inside")).toMatchObject({ starts: "on", outside: true });
    expect(connectors.action("email.draft")).toMatchObject({ outside: false });
  });

  it("rules:connectors/whatsapp-crm-and-calendar-hear-and-can-do-what-was-agreed", () => {
    agreed("whatsapp");
    agreed("crm");
    agreed("calendar");
    // The phone being unlinked is heard; a deal that moved is heard.
    expect(product("whatsapp").events.map((e) => e.id)).toContain("session.status");
    expect(product("crm").events.map((e) => e.id)).toContain("deal_moved");
    // The CRM can read all and change only what it was given: changing a field is asked.
    expect(connectors.action("crm.change_field")?.starts).not.toBe("on");
  });

  it("rules:connectors/what-is-ours-to-fill-in-is-never-a-model's-to-give", () => {
    for (const x of allActions) {
      const found = connectors.action(x.id);
      expect(found, x.id).toBeDefined();
      if (!found) continue;
      // A part is either ours or the model's.
      const names = new Set(found.args.map((a) => a.name));
      for (const f of found.fixed) expect(names.has(f), `${x.id} ${f}`).toBe(false);
      for (const a of found.args) plain(a.says);
      // A call that gives one of ours is refused, and says which.
      for (const fixed of found.fixed) {
        const said = connectors.checked(x.id, { ...valid(x), [fixed]: "something else" });
        expect(said._tag, `${x.id} ${fixed}`).toBe("Wrong");
        if (said._tag === "Wrong") {
          plain(said.says);
          expect(said.says).toContain(fixed);
        }
      }
    }
    // The places a model must never name: the repo, the thread, the mailbox, the number, the account it writes as.
    for (const [id, args] of [
      ["github.comment", { text: "hi", repo: "someone/else" }],
      ["github.merge", { pull: 4 }],
      ["email.send_outside", { to: "a@b.example", subject: "s", text: "t", from: "ceo@acme.example" }],
      ["whatsapp.reply", { text: "hi", number: "+44000", chat: "x" }],
      ["crm.add_note", { deal: "d1", text: "t", crm: "other" }],
    ] as const)
      expect(connectors.checked(id, args)._tag, id).toBe("Wrong");
    // An action that has fixed parts: every outside action has at least the place it acts in.
    for (const x of connectors.all.flatMap((c) => c.actions).filter((a) => a.outside)) expect(x.fixed.length, x.id).toBeGreaterThan(0);
  });

  it("rules:connectors/a-call-is-checked-none-of-ours-every-needed-one-nothing-else", () => {
    for (const x of allActions) {
      const call = valid(x);
      expect(connectors.checked(x.id, call), x.id).toEqual({ _tag: "Args", args: call });
      // Each needed one, missing: refused, saying which.
      for (const needed of x.args.filter((a) => a.needed)) {
        const { [needed.name]: _gone, ...rest } = call;
        const said = connectors.checked(x.id, rest);
        expect(said._tag, `${x.id} without ${needed.name}`).toBe("Wrong");
        if (said._tag === "Wrong") expect(said.says).toContain(needed.name);
      }
      // Each one, of the wrong kind: refused, saying which.
      for (const arg of x.args) {
        const wrong = arg.is === "text" ? 5 : arg.is === "number" ? "5" : "one";
        const said = connectors.checked(x.id, { ...call, [arg.name]: wrong });
        expect(said._tag, `${x.id} ${arg.name} as ${typeof wrong}`).toBe("Wrong");
        if (said._tag === "Wrong") expect(said.says).toContain(arg.name);
      }
      // One nobody has: refused, saying which.
      const odd = connectors.checked(x.id, { ...call, surprise: 1 });
      expect(odd._tag, x.id).toBe("Wrong");
      if (odd._tag === "Wrong") expect(odd.says).toContain("surprise");
      // Not an object at all.
      for (const bad of [null, "text", 5, [], [call]])
        expect(connectors.checked(x.id, bad)._tag, `${x.id} ${JSON.stringify(bad)}`).toBe("Wrong");
    }
    // Optional ones may be left out, and given.
    expect(connectors.checked("github.read", { what: "issue" })).toEqual({ _tag: "Args", args: { what: "issue" } });
    expect(connectors.checked("github.read", { what: "issue", number: 412 })).toEqual({
      _tag: "Args",
      args: { what: "issue", number: 412 },
    });
    expect(connectors.checked("github.label", {})).toEqual({ _tag: "Args", args: {} });
    expect(connectors.checked("github.label", { add: ["bug"], remove: ["wontfix"] })._tag).toBe("Args");
    expect(connectors.checked("github.label", { add: "bug" })._tag).toBe("Wrong");
    expect(connectors.checked("github.label", { add: [1] })._tag).toBe("Wrong");
    expect(connectors.checked("github.merge", {})).toEqual({ _tag: "Args", args: {} });
    expect(connectors.checked("github.read", { what: "issue", number: Number.NaN })._tag).toBe("Wrong");
    expect(connectors.checked("github.read", { what: "issue", number: Number.POSITIVE_INFINITY })._tag).toBe("Wrong");
    // Not an action: refused, saying which.
    const nothing = connectors.checked("github.nothing", {});
    expect(nothing._tag).toBe("Wrong");
    if (nothing._tag === "Wrong") expect(nothing.says).toContain("github.nothing");
    // What is only inherited, or hides under the prototype, is not given.
    expect(connectors.checked("github.comment", Object.create({ text: "inherited" }))._tag).toBe("Wrong");
    const hidden: unknown = JSON.parse('{"text":"x","__proto__":{"repo":"evil/repo"}}');
    expect(connectors.checked("github.comment", hidden)._tag).toBe("Wrong");
    const said = connectors.checked("github.comment", { text: "x" });
    expect(said._tag === "Args" && "repo" in said.args).toBe(false);
    expect("repo" in {}).toBe(false);
  });

  it("rules:connectors/an-action-starts-as-its-risk-says-and-has-a-tool-name-of-its-own", () => {
    const every = connectors.all.flatMap((c) => c.actions);
    for (const x of every) {
      // What only reads, or stays a draft, starts on.
      if (!x.outside) expect(x.starts, x.id).toBe("on");
      // What undoes things, ends things or goes to someone new is never on by itself.
      if (/merge|close|cancel|send_outside|send_template|start_thread|add_lead|rebase|rerun/u.test(x.id))
        expect(x.starts, x.id).not.toBe("on");
      expect(["on", "ask", "off"]).toContain(x.starts);
    }
    // The tool's name is the id with `_`.
    const names = every.map((x) => connectors.toolName(x.id));
    for (const x of every) {
      expect(connectors.toolName(x.id)).toBe(x.id.replace(/\./gu, "_"));
      expect(connectors.toolName(x.id)).toMatch(/^[a-z0-9_]+$/u);
    }
    expect(connectors.toolName("github.open_pull_request")).toBe("github_open_pull_request");
    expect(new Set(names).size).toBe(names.length);
    // A name that is not an action is not found, however it is spelled.
    for (const id of [
      "",
      "github",
      "github.",
      ".read",
      "GITHUB.READ",
      "github.nothing",
      "github_read",
      "__proto__",
      "constructor",
      "toString",
      "hasOwnProperty",
    ])
      expect(connectors.action(id), JSON.stringify(id)).toBeUndefined();
  });
});
