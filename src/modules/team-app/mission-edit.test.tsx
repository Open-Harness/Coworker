import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createServer } from "~/modules/team-core/service.ts";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { afterEach, describe, expect, it } from "vitest";
import { createTeamApi, MissionScreen } from "./service.ts";

afterEach(cleanup);

describe("editing a page", () => {
  const page = (updatedAt: number, updatedBy: string, body = "Ship it.") => ({
    id: "mission",
    title: "Launch",
    body,
    updatedAt,
    updatedBy,
  });
  const can = { mission: "on", page: "off" } as const;

  it("saves what was written, from the version that was read", async () => {
    const saved: unknown[] = [];
    render(
      <LayerProvider>
        <MissionScreen
          workspaceId="w1"
          managerId="m1"
          managerName="Launch"
          pages={[page(1_000, "Ama")]}
          can={can}
          onSave={async (edit) => {
            saved.push({ body: edit.body, base: edit.base });
            return { _tag: "Loaded", value: { _tag: "Saved" } };
          }}
        />
      </LayerProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Page text" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Page text" }), "New words");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saved).toEqual([{ body: "New words", base: 1_000 }]);
  });

  it("keeps the writer's words when the page changes under them, and says who changed it", async () => {
    const screens = (pages: ReturnType<typeof page>[]) => (
      <LayerProvider>
        <MissionScreen
          workspaceId="w1"
          managerId="m1"
          managerName="Launch"
          pages={pages}
          can={can}
          onSave={async () => ({ _tag: "Failed", message: "no" })}
        />
      </LayerProvider>
    );
    const view = render(screens([page(1_000, "Ama")]));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Page text" }), " Mine.");
    view.rerender(screens([page(2_000, "Bo Larsen", "Bo's text")]));
    expect(screen.getByText("Bo Larsen changed this page while you were editing")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Page text" }) as HTMLTextAreaElement).value).toBe("Ship it. Mine.");
    await userEvent.click(screen.getByRole("button", { name: "Use their version" }));
    expect((screen.getByRole("textbox", { name: "Page text" }) as HTMLTextAreaElement).value).toBe("Bo's text");
  });

  it("offers no editing where the person may not", () => {
    render(
      <LayerProvider>
        <MissionScreen
          workspaceId="w1"
          managerId="m1"
          managerName="Launch"
          pages={[{ ...page(1_000, "Ama"), parent: "x" }]}
          can={can}
          onSave={async () => ({ _tag: "Failed", message: "no" })}
        />
      </LayerProvider>,
    );
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.getByText("You can read this page. An Owner has not let you edit it.")).toBeTruthy();
  });
});

describe("saving a page", () => {
  const edit = { page: { id: "mission", title: "Launch", body: "", updatedAt: 1, updatedBy: "Ama" }, body: "x", base: 1 };
  const saving = async (answer: unknown) => createTeamApi(createServer(async () => Response.json(answer))).savePage("w1", "m1", edit, "r1");

  it("does not call a refused save saved", async () => {
    expect(await saving({ _tag: "Done", value: { ok: false, message: "Bo changed it" } })).toEqual({
      _tag: "Loaded",
      value: { _tag: "Refused", message: "Bo changed it" },
    });
    expect(await saving({ _tag: "Done", value: { ok: true, value: {} } })).toEqual({ _tag: "Loaded", value: { _tag: "Saved" } });
    expect(await saving({ _tag: "Ask", sentence: "x", waiting: true })).toEqual({ _tag: "Loaded", value: { _tag: "Waiting" } });
  });
});
