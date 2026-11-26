import { describe, expect, it } from "vitest";
import { fakeClock } from "~/modules/clock/testing.ts";
import { CATALOGUE, createActions } from "./service.ts";
import type { ActionRecord, By, PermissionSet, PermissionSources } from "./types.ts";

const book = Object.values(import.meta.glob("/docs/old/actions.md", { query: "?raw", import: "default", eager: true }))[0] as string;
const bookIds = [...book.matchAll(/^\| `([a-z]+\.[a-z]+)` \|/gmu)].map(([, id]) => id);

const none: PermissionSet = { categories: {}, actions: {} };
const manager: By = { kind: "manager", id: "mgr_launch", name: "Launch manager" };
const amina: By = { kind: "person", id: "person_amina", name: "Amina" };
const bo: By = { kind: "person", id: "person_bo", name: "Bo" };

function world(
  managerSet: PermissionSet = none,
  people: Record<string, { preset: "owner" | "builder" | "member"; own: PermissionSet }> = {},
) {
  const audit: ActionRecord[] = [];
  const sources: PermissionSources = { manager: () => managerSet, person: (id) => people[id] };
  const actions = createActions({
    sources,
    audit: (line) => void audit.push(line),
    clock: fakeClock(),
    handlers: { "task.move": async (input) => ({ moved: input["task"] }), "task.create": async () => ({ id: "DT-1" }) },
  });
  return { actions, audit };
}

describe("actions", () => {
  it("is the catalogue in actions.md, id for id", () => {
    expect(bookIds.length).toBeGreaterThan(70);
    expect(CATALOGUE.map((spec) => spec.id)).toEqual(bookIds);
  });

  it("acc:permissions/check", () => {
    const { actions } = world(
      { categories: { tasks: "ask" }, actions: { "task.move": "on", "message.new": "on" } },
      {
        person_amina: { preset: "member", own: { categories: {}, actions: { "lane.create": "on", "task.comment": "off" } } },
        person_bo: { preset: "owner", own: none },
      },
    );
    // The catalogue's defaults, for a manager with no settings of its own.
    const plain = world().actions;
    expect(plain.check(manager, "task.create")).toBe("on");
    expect(plain.check(manager, "task.delete")).toBe("ask");
    expect(plain.check(manager, "reply.thread")).toBe("on");
    expect(plain.check(manager, "message.new")).toBe("ask");
    expect(plain.check(manager, "vault.write")).toBe("off");
    // The manager's own category setting, and its single-action overrides above that.
    expect(actions.check(manager, "task.create")).toBe("ask");
    expect(actions.check(manager, "task.move")).toBe("on");
    expect(actions.check(manager, "message.new")).toBe("on");
    // A person: the preset's default, overridden by their own setting.
    expect(actions.check(amina, "task.comment")).toBe("off");
    expect(actions.check(amina, "lane.create")).toBe("on");
    expect(actions.check(amina, "lane.update")).toBe("off");
    expect(actions.check(amina, "task.create")).toBe("on");
    expect(actions.check(bo, "member.invite")).toBe("on");
    expect(actions.check({ kind: "person", id: "stranger", name: "?" }, "board.read")).toBe("off");
    expect(actions.check(manager, "no.such")).toBe("off");
  });

  it("acc:audit/sentence", async () => {
    const { actions, audit } = world({ categories: {}, actions: { "task.delete": "ask", "task.archive": "off" } });
    expect(await actions.call("task.move", { task: { id: "DT-14", title: "DT-14" }, lane: "Review" }, manager)).toEqual({
      _tag: "Done",
      value: { moved: { id: "DT-14", title: "DT-14" } },
    });
    expect(await actions.call("task.archive", { task: "DT-14" }, manager)).toMatchObject({ _tag: "Refused" });
    expect(await actions.call("task.delete", { task: "DT-14" }, manager)).toEqual({
      _tag: "Ask",
      sentence: "Launch manager deleted DT-14 for good",
    });
    expect(await actions.call("task.create", { title: "Fix login" }, manager, "person_amina")).toMatchObject({ _tag: "Done" });
    expect(
      audit.map(({ action, by, permission, sentence, outcome, approvedBy }) => ({
        action,
        by: by.name,
        permission,
        sentence,
        outcome,
        approvedBy,
      })),
    ).toEqual([
      {
        action: "task.move",
        by: "Launch manager",
        permission: "on",
        sentence: "Launch manager moved DT-14 to Review",
        outcome: "done",
        approvedBy: undefined,
      },
      {
        action: "task.archive",
        by: "Launch manager",
        permission: "off",
        sentence: "Launch manager archived DT-14",
        outcome: "refused",
        approvedBy: undefined,
      },
      {
        action: "task.delete",
        by: "Launch manager",
        permission: "ask",
        sentence: "Launch manager deleted DT-14 for good",
        outcome: "asked",
        approvedBy: undefined,
      },
      {
        action: "task.create",
        by: "Launch manager",
        permission: "on",
        sentence: "Launch manager added the task Fix login",
        outcome: "done",
        approvedBy: "person_amina",
      },
    ]);
    expect(audit.every((line) => !line.sentence.includes("task.") && typeof line.at === "number")).toBe(true);
  });

  it("writes a sentence for every action, never the bare id", () => {
    const { actions } = world();
    for (const spec of CATALOGUE) {
      const sentence = actions.describe(spec.id, {}, manager);
      expect(sentence.startsWith("Launch manager "), spec.id).toBe(true);
      expect(sentence.includes(spec.id), spec.id).toBe(false);
    }
  });
});
