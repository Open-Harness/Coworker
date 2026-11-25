import { describe, expect, it } from "vitest";
import { mayDo, mayOpen } from "./service.ts";
import type { Page, Standing } from "./types.ts";

const none = { categories: {}, actions: {} };
const owner: Standing = { role: "owner", own: none };
const builder: Standing = { role: "builder", own: none };
const member: Standing = { role: "member", own: none };
const withOwn = (role: Standing["role"], actions: Record<string, "on" | "off" | "ask">): Standing => ({
  role,
  own: { categories: {}, actions },
});

const open = (standing: Standing, ...pages: Page[]) => pages.map((page) => mayOpen(standing, page));

describe("the presets", () => {
  it("open everything to an Owner", () => {
    expect(open(owner, "board", "mission", "events", "manager-settings", "agents", "templates", "environments", "workspace")).toEqual(
      Array(8).fill(true),
    );
  });

  it("keep the workspace's settings from a Builder but let them build", () => {
    expect(open(builder, "workspace")).toEqual([false]);
    expect(open(builder, "agents", "skills", "templates", "environments", "manager-settings", "events")).toEqual(Array(6).fill(true));
    expect(mayDo(builder, "manager.create")).toBe(true);
  });

  it("give a Member the work pages, the build pages to read, and not what holds the workspace's secrets", () => {
    expect(open(member, "inbox", "chat", "board", "task", "run", "mission", "events", "people", "profile")).toEqual(Array(9).fill(true));
    expect(open(member, "agents", "skills", "templates", "manager-settings")).toEqual(Array(4).fill(true));
    expect(open(member, "environments", "workspace")).toEqual([false, false]);
  });
});

describe("a person's own changes", () => {
  it("close a page the preset opens", () => {
    expect(open(withOwn("member", { "mission.read": "off" }), "mission", "board")).toEqual([false, true]);
  });

  it("close a manager's Settings when the Policy may not be read", () => {
    expect(open(withOwn("builder", { "policy.read": "off" }), "manager-settings", "board", "agents")).toEqual([false, true, true]);
  });

  it("leave a Builder everything else when reads are taken", () => {
    const narrowed = withOwn("builder", { "mission.read": "off", "event.read": "off", "policy.read": "off" });
    expect(open(narrowed, "mission", "events", "manager-settings", "board", "templates", "environments")).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  it("close every page of a manager when its board may not be read", () => {
    const blind = withOwn("builder", { "board.read": "off" });
    expect(open(blind, "board", "chat", "mission", "events", "task", "run", "manager-settings")).toEqual(Array(7).fill(false));
    expect(open(blind, "inbox", "people", "agents")).toEqual([true, true, true]);
  });

  it("let whoever was given manager.create make managers, and nobody else", () => {
    const maker = withOwn("member", { "manager.create": "on" });
    expect(mayDo(maker, "manager.create")).toBe(true);
    expect(mayDo(member, "manager.create")).toBe(false);
  });

  it("do not open a page for ask", () => {
    expect(open(withOwn("member", { "event.read": "ask" }), "events")).toEqual([false]);
  });
});
