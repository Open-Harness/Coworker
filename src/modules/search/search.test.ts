import { describe, expect, it } from "vitest";
import { search } from "./service.ts";
import type { Searchable } from "./types.ts";

const page = (id: string, title: string, body: string, managerId = "m1"): Searchable => ({ kind: "page", id, managerId, title, body });

describe("search", () => {
  it("needs every word, and ranks title matches first", () => {
    const items = [
      page("a", "Notes", "The launch checklist is here"),
      page("b", "Launch checklist", "Freeze, test, ship"),
      page("c", "Launch", "Only one word"),
    ];
    expect(search.find(items, "launch checklist").map(({ id }) => id)).toEqual(["b", "a"]);
  });

  it("folds case and accents, and matches the start of words", () => {
    expect(search.find([page("a", "Café opening", "")], "CAFE open")).toHaveLength(1);
    expect(search.find([page("a", "Reopen", "")], "open")).toHaveLength(0);
    expect(search.find([page("a", "Anything", "")], "  ")).toEqual([]);
  });

  it("merges managers' hits by score", () => {
    const one = search.find([page("a", "Plan", "plan", "m1")], "plan");
    const two = search.find([page("b", "Plan plan", "", "m2")], "plan");
    expect(search.merge([one, two]).map(({ managerId }) => managerId)).toEqual(["m2", "m1"]);
  });
});
