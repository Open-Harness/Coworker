import { expect, test } from "@playwright/test";
import { allowDomain, inboundMail, managerAddress, pullRequestOpened } from "./inbound.ts";
import { shot } from "./shots.ts";
import { signedIn, team } from "./team.ts";

/* What arrived reaches a manager the real way: mail through the Worker's email handler, a signed GitHub webhook. */

test("ui:events/list", async ({ browser }) => {
  test.setTimeout(120_000);
  const email = "events.reader@example.test";
  const page = await signedIn(browser, email, "Eve Reader");
  const launch = await team(page, "eventslist");
  const at = `/ws/${launch.workspaceId}/m/${launch.managerId}`;
  const address = await managerAddress(launch);

  // GitHub is connected and hears issues of acme/web only, so a pull request there is heard and set aside.
  await page.goto(`${at}/settings/sources?source=github`);
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.goto(`${at}/settings/sources?source=github`);
  await page.getByRole("switch", { name: "acme/web" }).click();
  await page.getByRole("button", { name: "Save repos" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await allowDomain(launch, "example.test");

  // A person on the list asks, a stranger writes, a pull request arrives that was not chosen.
  await inboundMail(page, { from: email, to: address, subject: "Export the usage report", text: "Please make it a CSV." });
  await inboundMail(page, { from: "rival@elsewhere.test", to: address, subject: "Buy our newsletter list", text: "Great prices." });
  await pullRequestOpened(launch, "events-list-1", "Fix the sidebar");

  await page.goto(`${at}/events`);
  await expect(page.getByRole("heading", { level: 1, name: "Events", exact: true })).toBeVisible();
  const item = (title: string) => page.getByRole("listitem").filter({ hasText: title });
  const asked = page.getByRole("list", { name: "Accepted" }).getByRole("listitem").filter({ hasText: "Export the usage report" });
  const stranger = item("Buy our newsletter list");
  const pull = item("Fix the sidebar");
  await expect(asked.getByText(/Task DT-1/u)).toBeVisible();
  await expect(stranger.getByText(/allowed list/u)).toBeVisible();
  await expect(pull.getByText(/Pull requests: not chosen for acme\/web/u)).toBeVisible();

  // A reply to the task's own address is a follow-up on it.
  await inboundMail(page, {
    from: email,
    to: address.replace("@", "+dt-1@"),
    subject: "Re: Export the usage report",
    text: "Make it UTF-8.",
  });
  await expect(item("Re: Export the usage report")).toBeVisible();

  // Each one opens beside the list: what the Gate made of it, then what the manager did.
  const beside = page.getByRole("complementary", { name: "Event" });
  await item("Re: Export the usage report").getByRole("button").click();
  await expect(beside.getByText("Skipped. It is a reply on the thread of DT-1.")).toBeVisible();
  await stranger.getByRole("button").click();
  await expect(beside.getByText(/Ignored by the Gate: .*list/u)).toBeVisible();
  await asked.getByRole("button").click();
  await expect(beside.getByText("The manager made it task DT-1.")).toBeVisible();
  await shot(page, "events-list", "both");

  // On a phone it is a sheet.
  await page.setViewportSize({ width: 390, height: 844 });
  await stranger.getByRole("button").click();
  await expect(page.getByRole("dialog").getByText(/Ignored by the Gate: .*list/u)).toBeVisible();
  await shot(page, "events-sheet-phone");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });

  // Filtering by what became of it, by where it came from, and by a word.
  await page.getByRole("radio", { name: "Not admitted" }).click();
  await expect(stranger).toBeVisible();
  await expect(pull).toBeVisible();
  await expect(asked).toHaveCount(0);
  await page.getByRole("radio", { name: "All", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search events" });
  const find = async (words: string) => {
    await search.click();
    await search.pressSequentially(words);
    await page.getByRole("option", { name: `"${words}"` }).click();
  };
  const clear = async () => page.getByRole("button", { name: /clear/iu }).click();
  await find("GitHub");
  await expect(pull).toBeVisible();
  await expect(stranger).toHaveCount(0);
  await shot(page, "events-list-filtered", "both");
  await clear();
  await find("newsletter");
  await expect(stranger).toBeVisible();
  await expect(pull).toHaveCount(0);
  await expect(asked).toHaveCount(0);
  await clear();

  // The task an event made opens from it.
  await asked.getByRole("button").click();
  await beside.getByRole("link", { name: "Open DT-1" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Export the usage report" })).toBeVisible();
  await expect(page).toHaveURL(/\/tasks\/DT-1$/u);
});
