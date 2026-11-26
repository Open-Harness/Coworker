import { describe, expect, it } from "vitest";
import { githubEvents } from "./service.ts";

const us = { login: "juno[bot]", mention: "@juno", label: "juno" };

describe("github-events", () => {
  it("never throws and calls an unreadable delivery broken", () => {
    expect(githubEvents.read("issues", null, us)._tag).toBe("Broken");
  });
  it("hears an event it does not follow as noise", () => {
    expect(githubEvents.read("star", {}, us)._tag).toBe("Noise");
  });
});
