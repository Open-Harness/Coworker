import { describe, expect, it } from "vitest";
import { auditCsv, unzip } from "./service.ts";

/** The pieces that need no object. The rest is driven over HTTP in `src/flows/settings-*.test.ts`. */
describe("settings", () => {
  it("writes a csv a spreadsheet will not run as a formula", () => {
    const line = {
      at: Date.UTC(2026, 10, 24, 11, 2),
      by: { kind: "person", name: "Ama" },
      sentence: '=HYPERLINK("http://evil.test")',
      permission: "on",
      outcome: "done",
      action: "settings.name",
      managerId: "",
    };
    const csv = auditCsv([line], {});
    expect(csv.split("\r\n")[1]).toBe(
      `2026-11-24T11:02:00.000Z,Ama,person,"'=HYPERLINK(""http://evil.test"")",on,done,settings.name,Workspace`,
    );
  });

  it("reads back no zip that it did not write", () => {
    expect(unzip(new TextEncoder().encode("not a zip"))).toEqual([]);
  });
});
