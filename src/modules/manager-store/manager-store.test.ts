import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import type { OpenManager } from "./types.ts";

const open = (id: string): OpenManager => ({
  id,
  workspace: "ws",
  name: "Coding",
  template: { id: "repo", version: 1 },
  by: "email:ama@example.test",
  at: 1000,
  files: { "SKILL.md": "one" },
});
const store = (name: string) => (env as unknown as Env).MANAGER_STORE.getByName(name);

describe("manager-store", () => {
  it("answers nothing for an id nobody opened, and opens once", async () => {
    const one = store(`m-${crypto.randomUUID()}`);
    expect(await one.head()).toBeUndefined();
    expect(await one.open(open("a"))).toEqual({ _tag: "Opened" });
    expect(await one.open({ ...open("b"), files: { "SKILL.md": "other" } })).toEqual({ _tag: "AlreadyOpen" });
    expect(await one.head()).toMatchObject({ id: "a", name: "Coding", template: { id: "repo", version: 1 } });
    expect((await one.version())?.files).toEqual({ "SKILL.md": "one" });
  });

  it("keeps its own copy, and a save is a new version on top", async () => {
    const one = store(`m-${crypto.randomUUID()}`);
    await one.open(open("a"));
    const saved = await one.save({ files: { "SKILL.md": "two" }, by: "email:bo@example.test", at: 2000, says: "Wording", from: "edited" });
    expect(saved).toMatchObject({ number: 2, from: "edited" });
    expect((await one.versions()).map(({ number }) => number)).toEqual([2, 1]);
    expect(await one.copy()).toEqual({ template: { id: "repo", version: 1 }, given: { "SKILL.md": "one" }, now: { "SKILL.md": "two" } });
    expect((await one.version(1))?.files).toEqual({ "SKILL.md": "one" });
  });
});
