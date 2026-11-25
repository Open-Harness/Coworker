import { type Browser, expect, type Page, test } from "@playwright/test";
import { shot } from "./shots.ts";
import { lastMail, linkIn, signedIn, workspace } from "./team.ts";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });

const stranger = async (browser: Browser): Promise<Page> => (await browser.newContext()).newPage();

/** An Owner invites someone from Settings, as a person would. Gives the link in the mail. */
async function invite(owner: Page, id: string, email: string, preset: string): Promise<string> {
  await owner.goto(`/ws/${id}/settings/members`);
  await owner
    .getByRole("tab", { name: /^Invites/u })
    .or(owner.getByRole("button", { name: /^Invites/u }))
    .click();
  await owner.getByRole("textbox", { name: "Email" }).fill(email);
  await owner.getByRole("combobox", { name: "Preset" }).click();
  await owner.getByRole("option", { name: new RegExp(`^${preset}`, "u") }).click();
  await owner.getByRole("button", { name: "Send invite" }).click();
  await expect(owner.getByRole("cell", { name: email })).toBeVisible();
  const mail = await lastMail(owner, email);
  expect(mail).toContain("works once and expires in 7 days");
  return linkIn(mail);
}

/** Sends the sign-in link from the page that is open, and follows it. */
async function signInHere(page: Page, email: string): Promise<void> {
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText(`We sent a link to ${email}`)).toBeVisible();
  await page.goto(linkIn(await lastMail(page, email)));
}

const roleOf = async (page: Page, id: string): Promise<string | undefined> => {
  const body = (await (await page.request.get("/api/workspaces")).json()) as { workspaces: { workspaceId: string; role: string }[] };
  return body.workspaces.find(({ workspaceId }) => workspaceId === id)?.role;
};

test("ui:join/invite", async ({ browser }) => {
  const owner = await signedIn(browser, "ama@joining.test", "Ama Mensah");
  const acme = await workspace(owner, "joining", "Acme");

  // The invited address opens the mailed link, signs in with it, and joins with the invited preset.
  const link = await invite(owner, acme, "bo@joining.test", "Builder");
  await shot(owner, "join-invite-sent");
  const bo = await stranger(browser);
  await bo.goto(link);
  await expect(heading(bo, "Join Acme on Co-worker")).toBeVisible();
  await expect(bo.getByText("Use bo@joining.test, the address the invite went to.")).toBeVisible();
  await shot(bo, "join-sign-in", "both");
  await signInHere(bo, "bo@joining.test");
  await expect(heading(bo, "Join Acme")).toBeVisible();
  await expect(bo.getByText("Ama Mensah invited you as a Builder.")).toBeVisible();
  await shot(bo, "join-accept", "both");
  expect(await roleOf(bo, acme)).toBeUndefined();
  await bo.getByRole("button", { name: "Join Acme" }).click();
  await expect(heading(bo, "So managers know it's you")).toBeVisible();
  expect(await roleOf(bo, acme)).toBe("builder");

  // Linking accounts: another address, proven by the link mailed to it.
  await bo.getByRole("textbox", { name: "Another email address" }).fill("bo@home.test");
  await bo.getByRole("button", { name: "Add" }).click();
  await expect(bo.getByText("We sent a link to bo@home.test")).toBeVisible();
  await shot(bo, "join-accounts", "both");
  const proving = await bo.context().newPage();
  await proving.goto(linkIn(await lastMail(proving, "bo@home.test")));
  await expect(heading(proving, "It's yours")).toBeVisible();
  await shot(proving, "join-email-proven", "both");
  await proving.close();

  // Then the Inbox of the workspace, as a Builder: they may make managers, and have no Settings.
  await bo.getByRole("link", { name: "Continue" }).click();
  await expect(heading(bo, "Inbox")).toBeVisible();
  await expect(bo).toHaveURL(new RegExp(`/ws/${acme}/inbox$`, "u"));
  await expect(bo.getByRole("button", { name: "New manager" })).toBeVisible();
  await expect(bo.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await shot(bo, "join-inbox", "both");
  const people = (await (await owner.request.get(`/api/workspaces/${acme}/people`)).json()) as {
    people: { person: string; handles: { id: string }[] }[];
  };
  const handles = people.people.find(({ person }) => person === "email:bo@joining.test")?.handles.map(({ id }) => id);
  expect(handles).toContain("bo@home.test");
  await owner.goto(`/ws/${acme}/settings/members`);
  await expect(owner.getByText("bo@joining.test")).toBeVisible();

  // Used: the one who used it is taken to the workspace; anyone else is told, signed in or not.
  await bo.goto(link);
  await expect(heading(bo, "This invite has been used")).toBeVisible();
  await expect(bo.getByRole("link", { name: "Open Acme" })).toBeVisible();
  const passerBy = await stranger(browser);
  await passerBy.goto(link);
  await expect(heading(passerBy, "This invite has been used")).toBeVisible();
  await shot(passerBy, "join-used", "both");

  // The wrong address: a clear page, no way to join, and a way to switch. Then the right one joins as a Member.
  const second = await invite(owner, acme, "dee@joining.test", "Member");
  const dee = await signedIn(browser, "cy@elsewhere.test", "Cy");
  await dee.goto(second);
  await expect(heading(dee, "This invite is for dee@joining.test")).toBeVisible();
  await expect(dee.getByText("You're signed in as cy@elsewhere.test.")).toBeVisible();
  await expect(dee.getByRole("button", { name: "Join Acme" })).toHaveCount(0);
  await shot(dee, "join-wrong-account", "both");
  const forced = await dee.request.post("/api/auth/organization/accept-invitation", {
    data: { invitationId: second.split("/").at(-1) },
    headers: { origin: new URL(dee.url()).origin },
  });
  expect(forced.ok()).toBe(false);
  await dee.getByRole("button", { name: "Switch account" }).click();
  await expect(heading(dee, "Join Acme on Co-worker")).toBeVisible();
  await signInHere(dee, "dee@joining.test");
  await dee.getByRole("button", { name: "Join Acme" }).click();
  await dee.getByRole("link", { name: "Skip for now" }).click();
  await expect(heading(dee, "Inbox")).toBeVisible();
  expect(await roleOf(dee, acme)).toBe("member");

  // Expired: says so, joins nobody, and the Owners can be asked instead.
  const late = await invite(owner, acme, "ed@joining.test", "Member");
  await owner.request.get(`/api/test/lapse-invite?id=${late.split("/").at(-1) ?? ""}`);
  const ed = await signedIn(browser, "ed@joining.test", "Ed");
  await ed.goto(late);
  await expect(heading(ed, "This invite has expired")).toBeVisible();
  await expect(ed.getByText("Invites last 7 days. Ask Ama Mensah for a new one to join Acme.")).toBeVisible();
  await shot(ed, "join-expired", "both");
  await ed.getByRole("button", { name: "Ask to join Acme" }).click();
  await expect(ed.getByText("Request sent")).toBeVisible();
  expect(await roleOf(ed, acme)).toBeUndefined();
  await owner.goto(`/ws/${acme}/inbox`);
  await owner.getByRole("cell", { name: /Ed \(ed@joining.test\) asks to join/u }).click();
  await shot(owner, "join-request", "both");
});
