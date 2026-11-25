import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import type { Loaded } from "~/modules/team-core/types.ts";
import { afterEach, describe, expect, it } from "vitest";
import { EnvironmentsScreen, NotificationsScreen, ProfileScreen } from "./service.ts";
import type { EnvironmentData, MeData } from "./types.ts";

afterEach(cleanup);

const OK = { _tag: "Loaded", value: true } as const;

/** Chooses an item of an open menu, from the keyboard, as a menu is used without a pointer. */
async function menuItem(name: string): Promise<void> {
  (await screen.findByRole("menuitem", { name })).focus();
  await userEvent.keyboard("{Enter}");
}

const ENVIRONMENT: EnvironmentData = {
  id: "e1",
  name: "Web app",
  setup: "pnpm install",
  size: "2 vCPU · 4 GB",
  version: 1,
  updatedAt: 0,
  status: "Ready",
  usedBy: ["Worker"],
};

describe("environments", () => {
  const show = (onDelete: () => Promise<Loaded<readonly string[]>> = async () => ({ _tag: "Loaded", value: ["Worker"] })) =>
    render(
      <LayerProvider>
        <EnvironmentsScreen
          environments={[ENVIRONMENT]}
          secrets={[]}
          agents={["Worker"]}
          onSave={async () => OK}
          onAssign={async () => true}
          onSecret={async () => OK}
          onRemoveSecret={async () => ({ _tag: "Loaded", value: [] })}
          onDelete={onDelete}
          onTest={async () => ({ _tag: "Loaded", value: { ready: false, output: "npm ERR! 404" } })}
        />
      </LayerProvider>,
    );

  it("shows what a test start printed", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Test start of Web app" }));
    expect(await screen.findByText("Setup failed")).toBeTruthy();
    expect(screen.getByText(/npm ERR! 404/u)).toBeTruthy();
  });

  it("names the agents that run there before it deletes", async () => {
    let deleted = 0;
    show(async () => {
      deleted += 1;
      return { _tag: "Loaded", value: ["Worker"] };
    });
    await userEvent.click(screen.getByRole("button", { name: "More for Web app" }));
    await menuItem("Delete");
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Worker will run in the plain container/u)).toBeTruthy();
    expect(deleted).toBe(0);
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete environment" }));
    expect(deleted).toBe(1);
  });
});

const ME: MeData = {
  name: "Ama",
  email: "ama@acme.test",
  role: "owner",
  profile: { timeZone: null, language: "en", workingHours: null },
  notifications: { events: [{ event: "question", label: "A question for you", email: false }], quietHours: false },
};

describe("personal settings", () => {
  it("saves a profile only once something changed, and with the working hours chosen", async () => {
    const saved: unknown[] = [];
    render(
      <LayerProvider>
        <ProfileScreen me={ME} workspaceName="Acme" onName={async () => OK} onSave={async (profile) => (saved.push(profile), OK)} />
      </LayerProvider>,
    );
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save.getAttribute("aria-disabled") === "true" || save.hasAttribute("disabled")).toBe(true);
    await userEvent.click(screen.getByRole("switch", { name: "I have working hours" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(saved).toEqual([{ timeZone: null, language: "en", workingHours: { days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00" } }]);
  });

  it("saves which kinds of notice are also mailed", async () => {
    const saved: unknown[] = [];
    render(
      <LayerProvider>
        <NotificationsScreen notifications={ME.notifications} onSave={async (next) => (saved.push(next), OK)} />
      </LayerProvider>,
    );
    await userEvent.click(screen.getByRole("switch", { name: "A question for you" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(saved).toEqual([{ events: [{ event: "question", label: "A question for you", email: true }], quietHours: false }]);
  });
});
