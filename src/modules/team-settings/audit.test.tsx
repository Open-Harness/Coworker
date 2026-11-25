import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { afterEach, describe, expect, it } from "vitest";
import { AuditScreen } from "./service.ts";
import type { AuditControls, AuditData } from "./types.ts";

afterEach(cleanup);

const NO_FILTERS: AuditControls = { kind: "all", manager: "all", category: "all", permission: "any", outcome: "all", range: "all" };

describe("the audit log", () => {
  it("shows each action's own sentence, and asks the server again when a filter changes", async () => {
    const line = { at: 0, by: "Ama", isManager: false, permission: "on", managerId: "m1" };
    const entries: AuditData[] = [
      { ...line, sentence: "Ama moved DT-1 to done", outcome: "done" },
      { ...line, sentence: "Ama tried to delete DT-2", outcome: "refused" },
    ];
    const chosen: AuditControls[] = [];
    render(
      <LayerProvider>
        <AuditScreen
          entries={entries}
          isLoading={false}
          onRetry={() => undefined}
          managers={{ m1: "Launch" }}
          categories={["tasks"]}
          controls={{ ...NO_FILTERS, outcome: "refused", manager: "m1" }}
          onControls={(next) => chosen.push(next)}
          hasMore
          onMore={async () => undefined}
          exportHref="/audit/export"
          onExport={() => undefined}
        />
      </LayerProvider>,
    );
    expect(screen.getByText("Ama moved DT-1 to done")).toBeTruthy();
    expect(screen.getByText("Ama tried to delete DT-2")).toBeTruthy();
    // Each filter in force is a token of the search, in the filter's own words.
    const tokens = screen.getByLabelText("Filter the audit log", { selector: "[aria-label]" }).textContent;
    expect(tokens).toContain("Where: isLaunch");
    expect(tokens).toContain("Outcome: isRefused");
    expect(tokens).not.toContain("Who");
    // Taking one away asks again with the rest.
    await userEvent.click(screen.getByRole("button", { name: /remove.*outcome/iu }));
    expect(chosen).toEqual([{ ...NO_FILTERS, manager: "m1" }]);
    expect(screen.getByRole("button", { name: "Load older lines" })).toBeTruthy();
  });
});
