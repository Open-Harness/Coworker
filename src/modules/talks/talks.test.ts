import { describe, expect, it } from "vitest";
import { talks } from "./service.ts";
import type { ChatRow } from "./types.ts";

const row: ChatRow = {
  id: "c1",
  by: "ama",
  title: "Pause it",
  at: 1,
  lines: [
    { id: "l1", by: "ama", at: 2, text: "Pause Coding" },
    {
      id: "l2",
      by: "coworker",
      at: 3,
      text: "It waits for you.",
      did: [{ doing: "manager.pause", says: "Pause a manager", link: null, state: "waits for you", ask: "a1", to: "ama" }],
    },
  ],
};

describe("talks", () => {
  it("says that a chat waits for the one asked, until the doing is settled", () => {
    expect(talks.chat(row, "Juno")).toMatchObject({ state: "waits", waitsFor: "ama" });
    const settled: ChatRow = {
      ...row,
      lines: row.lines.map(({ did = [], ...line }) => ({ ...line, did: did.map((one) => ({ ...one, state: "done" as const })) })),
    };
    expect(talks.chat(settled, "Juno")).toMatchObject({ state: "quiet", waitsFor: null });
  });
  it("lists a fork under its chat, with the lines it has of its own", () => {
    const fork: ChatRow = {
      ...row,
      id: "c2",
      under: "c1",
      knew: 1,
      lines: [...row.lines, { id: "l3", by: "ama", at: 4, text: "Never mind" }],
    };
    const shown = talks.view(row, [row, fork], "Juno");
    expect(shown.forks).toEqual([expect.objectContaining({ id: "c2", under: "c1", knew: 1, replies: 2 })]);
    expect(shown.lines[1]?.by).toBe("coworker");
  });
});
