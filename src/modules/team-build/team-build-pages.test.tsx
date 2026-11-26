import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { RunScreen, TaskScreen } from "./service.ts";
import { basics, mgr, show, world, ws } from "./testing.tsx";

afterEach(cleanup);

describe("the task and run pages", () => {
  const detail = {
    task: {
      task: { id: "DT-1", title: "Write the changelog", description: "", lane: "todo", stageLabel: "Idle", values: {} },
      comments: [],
      history: [{ at: 1_000, by: { name: "Launch" }, sentence: "Launch added the task Write the changelog" }],
      runs: [{ id: "run-1", task: "DT-1", role: "writer", agent: "Worker", attempt: 1, state: "ended" }],
    },
  };

  it("posts a comment as the manager's comment action and clears the box", async () => {
    const app = world({
      ...basics(),
      [`GET ${mgr("/tasks/DT-1")}`]: detail,
      [`GET ${ws("/people")}`]: { people: [] },
      [`POST ${mgr("/actions/task.comment")}`]: { _tag: "Done", value: {} },
    });
    render(show(<TaskScreen workspaceId="w1" managerId="m1" taskId="DT-1" />, app.send));
    const box = await screen.findByRole("textbox", { name: "Comment" });
    await userEvent.type(box, "Ship it");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    expect(app.called("POST", mgr("/actions/task.comment"))[0]?.body).toEqual({
      input: { task: "DT-1", text: "Ship it" },
      requestId: "id-1",
    });
    expect((box as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByRole("link", { name: /writer/u })).toBeTruthy();
  });

  it("shows a run's report and transcript, and stops it with the manager's own action", async () => {
    const app = world({
      ...basics(),
      [`POST ${mgr("/actions/run.stop")}`]: { _tag: "Done", value: {} },
      [`GET ${mgr("/runs/run-1")}`]: {
        _tag: "Run",
        run: {
          id: "run-1",
          task: "DT-1",
          role: "writer",
          agent: "Worker",
          attempt: 1,
          state: "running",
          report: "progress",
          note: "Half way",
        },
        lines: [{ id: "l1", role: "manager", text: "Drafting the intro" }],
      },
    });
    render(show(<RunScreen workspaceId="w1" managerId="m1" runId="run-1" />, app.send));
    expect(await screen.findByText("Drafting the intro")).toBeTruthy();
    expect(screen.getByText("Making progress")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Stop run" }));
    await waitFor(() => expect(app.called("POST", mgr("/actions/run.stop"))).toHaveLength(1));
    expect(app.called("POST", mgr("/actions/run.stop"))[0]?.body).toEqual({ input: { run: "run-1" }, requestId: "id-1" });
  });

  it("says a stopped run was stopped, by whom, and offers no stop", async () => {
    const app = world({
      ...basics(),
      [`GET ${mgr("/runs/run-2")}`]: {
        _tag: "Run",
        run: {
          id: "run-2",
          task: "DT-1",
          role: "tester",
          agent: "Worker",
          attempt: 1,
          state: "ended",
          report: "dropped",
          note: "Stopped by Ama",
          stopped: { at: 1_000, by: { name: "Ama" } },
        },
        lines: [{ id: "l1", role: "manager", text: "Working through it.", streaming: true }],
      },
    });
    render(show(<RunScreen workspaceId="w1" managerId="m1" runId="run-2" />, app.send));
    expect(await screen.findByText("Stopped by Ama. It does nothing more.")).toBeTruthy();
    expect(screen.getAllByText("Stopped").length).toBeGreaterThan(0);
    expect(screen.getByText("Writing…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Stop run" })).toBeNull();
  });
});
