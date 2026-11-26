import { expect, test } from "@playwright/test";
import { allowDomain, inboundMail, managerAddress, pullRequestOpened, uninstalled } from "./inbound.ts";
import { shot } from "./shots.ts";
import { signedIn, team } from "./team.ts";

test("ui:sources/connect", async ({ browser }) => {
  test.setTimeout(120_000);
  const email = "sources.owner@example.test";
  const page = await signedIn(browser, email, "Olu Owner");
  const launch = await team(page, "sourcesconnect");
  const at = `/ws/${launch.workspaceId}/m/${launch.managerId}`;
  const address = await managerAddress(launch);
  const sources = `${at}/settings/sources`;
  const saved = page.getByText("Saved", { exact: true });

  // A manager's email address is added by making the manager (the dialog says so), and it hears mail at once.
  await page.goto(at);
  await page.getByRole("button", { name: "New manager" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("It gets a board, a mission and an email address.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Name" }).fill("Help desk");
  await dialog.getByRole("button", { name: "Create manager" }).click();
  await expect(page).toHaveURL((url) => url.pathname.includes("/m/") && !url.pathname.includes(launch.managerId));
  const made = /^\/ws\/[^/]+\/m\/[^/]+/u.exec(new URL(page.url()).pathname)?.[0] ?? "";
  await page.goto(`${made}/settings/sources`);
  await expect(page.getByRole("row", { name: /^Email help-desk\.sourcesconnect@.*Live/u })).toBeVisible();

  // Sources lists what the manager hears: its own address, and GitHub waiting to be connected.
  await page.goto(sources);
  await expect(page.getByRole("cell", { name: address, exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /GitHub/u }).getByText("Not connected")).toBeVisible();

  // Email: the manager's address, and mail to it arrives as an event.
  await page.getByRole("link", { name: "Open Email", exact: true }).click();
  await expect(page.getByRole("cell", { name: address, exact: true })).toBeVisible();
  await expect(page.getByText(address.replace("@", "+dt-<number>@"))).toBeVisible();
  await shot(page, "sources-email", "both");
  await allowDomain(launch, "example.test");
  await inboundMail(page, { from: email, to: address, subject: "Is this address live?", text: "Checking." });
  await page.goto(`${at}/events`);
  await expect(page.getByRole("listitem").filter({ hasText: "Is this address live?" })).toBeVisible();

  // GitHub: connect the App, add a repo and choose which events it hears.
  await page.goto(`${sources}?source=github`);
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.goto(`${sources}?source=github`);
  await expect(page.getByText(/Connected as/u)).toBeVisible();
  await page.getByRole("switch", { name: "acme/web" }).click();
  await expect(page.getByRole("checkbox", { name: "Issues", exact: true })).toBeChecked();
  await page.getByRole("checkbox", { name: "Pull requests", exact: true }).check();
  await page.getByRole("checkbox", { name: "Comments on issues and pull requests" }).uncheck();
  await shot(page, "sources-github-events", "both");
  await page.getByRole("button", { name: "Save repos" }).click();
  await expect(saved).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Pull requests", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Comments on issues and pull requests" })).not.toBeChecked();

  // What it chose is what it hears: a pull request is now heard by the Gate, and a review still is not.
  await pullRequestOpened(launch, "sources-1", "Speed up the export");
  await page.goto(`${at}/events`);
  const heard = page.getByRole("listitem").filter({ hasText: "Speed up the export" });
  await expect(heard).toBeVisible();
  await expect(heard.getByText(/not chosen/u)).toHaveCount(0);
  await page.goto(sources);
  await expect(page.getByRole("row", { name: /GitHub/u }).getByText("acme/web (2 events)")).toBeVisible();
  await expect(page.getByRole("row", { name: /GitHub/u }).getByText("Live")).toBeVisible();
  await shot(page, "sources-connected", "both");

  // The App is uninstalled on GitHub: the source says so, and what to do.
  await uninstalled(launch, "sources-gone");
  await page.goto(sources);
  await expect(page.getByText("GitHub lost its connection")).toBeVisible();
  await expect(page.getByRole("row", { name: /GitHub/u }).getByText("Lost connection")).toBeVisible();
  await expect(page.getByText(/was uninstalled from/u)).toBeVisible();
  await expect(page.getByText(/It was listening to acme\/web/u)).toBeVisible();
  await expect(page.getByText("Install the App again, then choose the repos here once more.")).toBeVisible();
  await shot(page, "sources-lost", "both");
  await page.getByRole("link", { name: "Open GitHub" }).first().click();
  await expect(page.getByText("GitHub lost its connection")).toBeVisible();
  await shot(page, "sources-github-lost", "both");

  // Installing it again brings the source back, with nothing chosen yet.
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.goto(sources);
  await expect(page.getByText("GitHub lost its connection")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /GitHub/u }).getByText("Nothing chosen")).toBeVisible();
});
