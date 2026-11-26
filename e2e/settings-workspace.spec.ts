import { expect, test } from "@playwright/test";
import { acme, type Acme } from "./acme.ts";
import { api, choose, downloaded, openSettings, reloaded, save, tab, toast } from "./settings.ts";
import { shot } from "./shots.ts";

/* Every workspace settings screen, in the browser against the fake world: change it, save it, reload, and see it kept. */

test.describe.configure({ mode: "serial" });
let app: Acme;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  app = await acme(browser, "-a");
});

/** One pixel, as a PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("General keeps a new name, time zone, default model and logo, and exports the workspace", async () => {
  const { page, id } = app;
  await openSettings(page, id, "general", "General");
  await shot(page, "ws-general", "both");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Acme Labs");
  await choose(page, "Default time zone", "Europe/Paris", "Paris");
  await choose(page, "Default model for new agents", /claude/iu);
  await expect(page.getByText("Not saved yet")).toBeVisible();
  await save(page);
  await page.locator("input[type=file]").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: "Remove logo" })).toBeVisible();
  await reloaded(page, "General");
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Acme Labs");
  await expect(page.getByRole("button", { name: /Default time zone/u })).toContainText("Paris");
  await expect(page.getByRole("combobox", { name: "Default model for new agents" })).toContainText(/claude/iu);
  await expect(page.getByRole("button", { name: "Remove logo" })).toBeVisible();
  expect(await downloaded(page, () => page.getByRole("button", { name: "Export everything" }).click())).toMatch(/\.zip$/u);
  await shot(page, "ws-general-saved", "both");
});

test("General asks before it moves the address, then keeps it", async () => {
  const { page, id } = app;
  await openSettings(page, id, "general", "General");
  await page.getByRole("textbox", { name: "Address", exact: true }).fill("acme-labs-shots");
  await page.getByRole("button", { name: "Save changes" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("acme-labs-shots");
  await shot(page, "ws-general-address", "both");
  await dialog.getByRole("button", { name: "Change address" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await reloaded(page, "General");
  await expect(page.getByRole("textbox", { name: "Address", exact: true })).toHaveValue("acme-labs-shots");
});

test("General refuses an address someone has, in the server's words", async () => {
  const { page, id } = app;
  await openSettings(page, id, "general", "General");
  await page.getByRole("textbox", { name: "Address", exact: true }).fill(`ama-shots${app.tag}`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Change address" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await shot(page, "ws-general-refused", "both");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("textbox", { name: "Address", exact: true })).toHaveValue("acme-labs-shots");
});

test("deleting a workspace needs its name typed", async () => {
  const { page } = app;
  const made = await api<{ workspace: { workspaceId: string } }>(page, "POST", "/api/workspaces", {
    name: "Scratch",
    address: "scratch-shots",
    region: "eu",
  });
  await openSettings(page, made.workspace.workspaceId, "general", "General");
  await page.getByRole("button", { name: "Delete workspace" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("button", { name: "Delete workspace" })).toBeDisabled();
  await dialog.getByLabel("Type Scratch to confirm").fill("Scratch");
  await shot(page, "ws-general-delete", "both");
  await dialog.getByRole("button", { name: "Delete workspace" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your workspaces" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Scratch/u })).toHaveCount(0);
});

test("Members changes a person's preset and invites someone, and both are kept", async () => {
  const { page, id } = app;
  await openSettings(page, id, "members", "Members");
  await shot(page, "ws-members", "both");
  await choose(page, "Bo Larsen's preset", /^Member$/u);
  await expect(toast(page, "Now Member")).toBeVisible();
  await tab(page, /^Invites/u).click();
  await page.getByRole("textbox", { name: "Email" }).fill("new.person@acme.test");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(toast(page, "Invited new.person@acme.test")).toBeVisible();
  await reloaded(page, "Members");
  await expect(page.getByRole("combobox", { name: "Bo Larsen's preset" })).toContainText("Member");
  await tab(page, /^Invites/u).click();
  await expect(page.getByText("new.person@acme.test")).toBeVisible();
  await shot(page, "ws-members-invites", "both");
});

test("Members asks before it removes a person", async () => {
  const { page, id } = app;
  await openSettings(page, id, "members", "Members");
  await page.getByRole("button", { name: "More for Chidi Okafor" }).click();
  await page.getByRole("menuitem", { name: "Remove from workspace" }).click();
  await shot(page, "ws-members-remove", "both");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Chidi Okafor").first()).toBeVisible();
});

test("Roles keeps one person's own setting over their preset", async () => {
  const { page, id } = app;
  await openSettings(page, id, "roles", "Roles and permissions");
  await shot(page, "ws-roles", "both");
  await choose(page, "Person", /Bo Larsen/u);
  await choose(page, /Work on tasks for Bo Larsen/u, "Their own: Off");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await reloaded(page, "Roles and permissions");
  await choose(page, "Person", /Bo Larsen/u);
  await expect(page.getByRole("combobox", { name: /Work on tasks for Bo Larsen/u })).toContainText("Their own: Off");
  await shot(page, "ws-roles-person", "both");
  await openSettings(page, id, "members", "Members");
  await page.getByRole("link", { name: "1 change" }).click();
  await expect(page.getByRole("combobox", { name: "Person", exact: true })).toContainText("Bo Larsen");
  await choose(page, /Work on tasks for Bo Larsen/u, /^Preset/u);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
});

test("Security keeps the invite link and the approved domains", async () => {
  const { page, id } = app;
  await openSettings(page, id, "security", "Security");
  await page.getByRole("switch", { name: "Invite link" }).click();
  await expect(toast(page, "The link is off")).toBeVisible();
  await page.getByRole("textbox", { name: "Domain" }).fill("partner.test");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(toast(page, "Domains saved")).toBeVisible();
  await reloaded(page, "Security");
  await expect(page.getByRole("switch", { name: "Invite link" })).not.toBeChecked();
  await expect(page.getByText("partner.test")).toBeVisible();
  await shot(page, "ws-security", "both");
  await page.getByRole("switch", { name: "Invite link" }).click();
  await expect(page.getByText("/join/link/")).toBeVisible();
});
