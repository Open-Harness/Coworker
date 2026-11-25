import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Agents } from "./service.ts";
import { basics, type Call, show, world, ws } from "./testing.tsx";

afterEach(cleanup);

const STAMP = { version: 1, savedAt: 1_000, savedBy: "Bea", note: "First" };

describe("the agent form", () => {
  it("has a control for every setting, and sends each as part of the agent", async () => {
    const app = world({
      ...basics("owner"),
      [`GET ${ws("/agents")}`]: { agents: [], environments: [{ id: "e1", name: "Node" }] },
      [`GET ${ws("/skills")}`]: { skills: [{ id: "s1", name: "notes", files: {}, version: 1, checks: [], versions: [STAMP] }] },
      [`POST ${ws("/agents")}`]: ({ body }: Call) => ({
        _tag: "Saved",
        value: { id: "a2", config: (body as { config: object }).config, version: 1, versions: [STAMP] },
      }),
    });
    render(show(<Agents workspaceId="w1" itemId="new" />, app.send));
    await userEvent.type(await screen.findByRole("textbox", { name: /^Name/u }), "Tester");
    await userEvent.type(screen.getByRole("textbox", { name: "Instructions" }), "Run the tests.");
    expect(screen.getByRole("combobox", { name: "Model" })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "High" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /bash/u }));
    // Tools no run has yet are not offered.
    expect(screen.queryByRole("checkbox", { name: /edit/u })).toBeNull();
    await userEvent.click(await screen.findByRole("checkbox", { name: "notes" }));
    screen.getByRole("combobox", { name: "Environment" }).focus();
    await userEvent.keyboard("{Enter}{ArrowDown}{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Create agent" }));
    await waitFor(() => expect(app.called("POST", ws("/agents"))).toHaveLength(1));
    expect(app.called("POST", ws("/agents"))[0]?.body).toEqual({
      config: {
        name: "Tester",
        instructions: "Run the tests.",
        model: null,
        thinking: "high",
        tools: ["bash"],
        skills: ["notes"],
        environment: "e1",
      },
      note: "",
    });
  });
});
