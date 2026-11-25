import { expect, test, type Page } from "@playwright/test";
import { acme, type Acme } from "./acme.ts";
import { choose, openSettings, reloaded, save, toast } from "./settings.ts";

/*
 * Every settings screen on the canvas, opened from the app's own menus, changed, saved, and read again after a reload.
 * What each screen does besides is in the other settings specs.
 */

type Screen = readonly [name: string, check: (app: Acme) => Promise<void>];

const managerAt = ({ id, launch }: Acme, path: string): string => `/ws/${id}/m/${launch.managerId}/settings/${path}`;

/** Follows a link of the settings menu, as a person would. */
async function follow(page: Page, link: string, heading = link): Promise<void> {
  await page.getByRole("link", { name: link, exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
}

const WORKSPACE: readonly Screen[] = [
  [
    "Profile",
    async ({ page, id }) => {
      await openSettings(page, id, "profile", "Profile");
      await page.getByRole("textbox", { name: "Name", exact: true }).fill("Ama K. Mensah");
      await save(page, "Save name");
      await reloaded(page, "Profile");
      await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Ama K. Mensah");
    },
  ],
  [
    "Notifications",
    async ({ page }) => {
      await follow(page, "Notifications");
      const before = await page.getByRole("switch").first().isChecked();
      await page.getByRole("switch").first().click();
      await save(page);
      await reloaded(page, "Notifications");
      await expect(page.getByRole("switch").first()).toBeChecked({ checked: !before });
    },
  ],
  [
    "General",
    async ({ page }) => {
      await follow(page, "General");
      await page.getByRole("textbox", { name: "Name", exact: true }).fill("Acme Works");
      await save(page);
      await reloaded(page, "General");
      await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Acme Works");
    },
  ],
  [
    "Members",
    async ({ page }) => {
      await follow(page, "Members");
      await choose(page, "Chidi Okafor's preset", /^Builder$/u);
      await expect(toast(page, "Now Builder")).toBeVisible();
      await reloaded(page, "Members");
      await expect(page.getByRole("combobox", { name: "Chidi Okafor's preset" })).toContainText("Builder");
    },
  ],
  [
    "Roles and permissions",
    async ({ page }) => {
      await follow(page, "Roles and permissions");
      await choose(page, "Person", /Chidi Okafor/u);
      await choose(page, /Work on tasks for Chidi Okafor/u, "Their own: Ask");
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      await reloaded(page, "Roles and permissions");
      await choose(page, "Person", /Chidi Okafor/u);
      await expect(page.getByRole("combobox", { name: /Work on tasks for Chidi Okafor/u })).toContainText("Their own: Ask");
    },
  ],
  [
    "Keys and connections",
    async ({ page }) => {
      await follow(page, "Keys and connections");
      await page.getByRole("button", { name: "Add a secret" }).click();
      const dialog = page.getByRole("dialog", { name: "Add a secret" });
      await dialog.getByLabel("Name").fill("registry");
      await dialog.getByLabel("Value").fill("not-a-real-secret");
      await page.getByRole("button", { name: "Add to the vault" }).click();
      await reloaded(page, "Keys and connections");
      await expect(page.getByText("registry", { exact: true })).toBeVisible();
      await expect(page.getByText("not-a-real-secret")).toHaveCount(0);
    },
  ],
  [
    "Usage",
    async ({ page }) => {
      await follow(page, "Usage");
      await page.getByRole("button", { name: "Set a budget for Launch" }).click();
      await page.getByLabel("Launch's sandbox hours").fill("12");
      await page.getByLabel("Launch's sandbox hours").blur();
      await save(page, "Save budget");
      await reloaded(page, "Usage");
      await expect(page.getByLabel("Launch's sandbox hours")).toHaveValue("12");
    },
  ],
  [
    "Billing",
    async ({ page }) => {
      await follow(page, "Billing");
      await page.getByLabel("Dollars over the plan").fill("80");
      await page.getByLabel("Dollars over the plan").blur();
      await save(page, "Save limit");
      await reloaded(page, "Billing");
      await expect(page.getByLabel("Dollars over the plan")).toHaveValue("80");
    },
  ],
  [
    "Security",
    async ({ page }) => {
      await follow(page, "Security");
      await page.getByRole("textbox", { name: "Domain" }).fill("partner.test");
      await page.getByRole("button", { name: "Approve" }).click();
      await expect(toast(page, "Domains saved")).toBeVisible();
      await reloaded(page, "Security");
      await expect(page.getByText("partner.test")).toBeVisible();
    },
  ],
  [
    "Audit log",
    // What it saves is every line before it: the changes above are in it.
    async ({ page }) => {
      await follow(page, "Audit log");
      await expect(page.getByText(/Ama .*(limit|budget|domain)/iu).first()).toBeVisible();
    },
  ],
];

const MANAGER: readonly Screen[] = [
  [
    "Sources and email",
    async (app) => {
      const { page } = app;
      await page.goto(managerAt(app, ""));
      await expect(page.getByText("Where this manager listens")).toBeVisible();
      await expect(page.getByText("What a manager can listen to")).toBeVisible();
      await page.getByRole("link", { name: "Open email", exact: true }).click();
      await page.getByRole("button", { name: "Send a test mail" }).click();
      await expect(page.getByText("Test mail sent")).toBeVisible();
    },
  ],
  [
    "a source's own page",
    async (app) => {
      const { page } = app;
      await page.goto(managerAt(app, "sources?source=github"));
      await page.getByRole("button", { name: "Connect GitHub" }).click();
      await page.getByRole("button", { name: "Connect", exact: true }).click();
      await page.goto(managerAt(app, "sources?source=github"));
      await page.getByRole("switch", { name: "acme/web" }).click();
      await page.getByRole("button", { name: "Save repos" }).click();
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("switch", { name: "acme/web" })).toBeChecked();
    },
  ],
  [
    "Who may ask",
    async ({ page }) => {
      await page.getByRole("link", { name: "Who may ask" }).click();
      await page.getByRole("radio", { name: /Auto/u }).check();
      await page.getByRole("button", { name: "Save who may ask" }).click();
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("radio", { name: /Auto/u })).toBeChecked();
    },
  ],
  [
    "Permissions",
    async ({ page }) => {
      const ask = () =>
        page.getByRole("radiogroup", { name: "Reply in the thread a request came from" }).getByRole("radio", { name: "Ask" });
      await page.getByRole("link", { name: "Permissions", exact: true }).click();
      await page.getByRole("button", { name: /^Talk to the outside/u }).click();
      await ask().check();
      await page.getByRole("button", { name: "Save permissions" }).click();
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: /^Talk to the outside/u }).click();
      await expect(ask()).toBeChecked();
    },
  ],
  [
    "Board settings",
    async (app) => {
      const { page } = app;
      await page.goto(managerAt(app, "board"));
      await page.getByRole("button", { name: "Add a lane" }).click();
      await page.getByRole("textbox", { name: "Name" }).fill("QA");
      await page.getByRole("textbox", { name: "What it means" }).fill("A person tries it");
      await page.getByRole("button", { name: "Add lane" }).click();
      await expect(page.getByText("A person tries it")).toBeVisible();
      await page.reload();
      await expect(page.getByText("A person tries it")).toBeVisible();
    },
  ],
];

test("ui:settings/all", async ({ browser }) => {
  test.setTimeout(240_000);
  const app = await acme(browser, "-all");
  for (const [name, check] of [...WORKSPACE, ...MANAGER]) await test.step(name, () => check(app));
});
