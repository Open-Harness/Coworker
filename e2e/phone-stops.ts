import { expect, type Page } from "@playwright/test";
import { through } from "./phone-walk.ts";

/*
 * Every page, reached the way a person on a phone reaches it: from the page before, by pressing. `go` is what takes
 * them there (the desktop is sent to the same address instead), `onPage` is what they do on the page.
 */

export interface Stop {
  readonly name: string;
  readonly go?: (page: Page) => Promise<void>;
  readonly onPage?: (page: Page) => Promise<void>;
  /**
   * A phone shows a list or one of its things, not both. What the other half offers is one press away, on the stop of
   * this name ("Close", "All agents"), so what that stop offers counts here too.
   */
  readonly alsoFrom?: string;
  /** What only a desk needs a name for, and what on the phone does it: "Open as a page" is pressing the row itself. */
  readonly does?: Readonly<Record<string, RegExp>>;
  /** What the page calls itself once it is open. */
  readonly heading: string | RegExp;
}

const launch = (link: string, heading: string): Stop => ({
  name: `${heading}`,
  go: (page) => through(page, link, "Launch"),
  heading,
});

const view = (name: string): Stop => ({
  name: `Board: ${name}`,
  onPage: async (page) => {
    await page.getByRole("radio", { name, exact: true }).click();
    await expect(page.getByRole("radio", { name, exact: true })).toBeChecked();
  },
  heading: "Board",
});

const tab = (name: string, heading: string | RegExp = "Settings"): Stop => ({
  name: `Settings: ${name}`,
  go: (page) => page.getByRole("link", { name, exact: true }).click(),
  heading,
});

const settings = (link: string, heading = link): Stop => ({ name: `Settings: ${heading}`, go: (page) => through(page, link), heading });

const pressed = (name: string | RegExp, page: string | RegExp): ((p: Page) => Promise<void>) => {
  return async (p) => {
    await p.getByRole("button", { name }).or(p.getByRole("tab", { name })).first().click();
    await expect(p.getByText(page).first()).toBeVisible();
  };
};

export const STOPS: readonly Stop[] = [
  {
    name: "Your workspaces",
    go: async (page) => {
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("button", { name: /Open menu/u })
        .press("Enter");
      await page
        .getByRole("menuitem", { name: /Your workspaces/u })
        .or(page.getByRole("link", { name: /Your workspaces/u }))
        .first()
        .click();
    },
    heading: "Your workspaces",
  },
  // The workspace by its address: anyone signing in at acme.test is let into every workspace that approves that domain.
  {
    name: "Home",
    go: async (page) => {
      await page.getByRole("link", { name: /acme-shots-ph(?![\w-])/u }).click();
      await page.waitForURL(/\/inbox$/u);
      await through(page, "Home");
    },
    heading: "Home",
  },
  {
    name: "Inbox",
    go: (page) => through(page, /^Inbox/u),
    heading: "Inbox",
    alsoFrom: "Inbox item",
    does: { "Open as a page": /row limit/u },
  },
  {
    name: "Inbox item",
    go: (page) =>
      page
        .getByRole("link", { name: /row limit/u })
        .first()
        .click(),
    heading: /row limit/u,
  },
  { name: "Overview", go: (page) => through(page, "Overview", "Launch"), heading: "Launch" },
  { name: "Board", go: (page) => through(page, "Board", "Launch"), heading: "Board" },
  view("List"),
  view("Console"),
  view("Inbox"),
  view("Kanban"),
  {
    name: "Board: a task open",
    onPage: async (page) => {
      await page.getByText("Check a 150k row export", { exact: true }).click();
      await expect(page.getByRole("link", { name: "Open DT-2 as a page" })).toBeVisible();
    },
    heading: "Board",
    alsoFrom: "Board",
  },
  { name: "A task", go: (page) => page.getByRole("link", { name: "Open DT-2 as a page" }).click(), heading: "Check a 150k row export" },
  {
    name: "A run",
    go: (page) =>
      page
        .getByRole("link", { name: /attempt 1/u })
        .first()
        .click(),
    heading: /on DT-2/u,
  },
  launch("Chat", "Chat"),
  launch("Mission", "Mission"),
  { name: "A mission page", go: (page) => page.getByRole("link", { name: /What we promised/u }).click(), heading: "What we promised" },
  launch("Events", "Events"),
  { name: "Settings: Sources", go: (page) => through(page, "Launch settings"), heading: "Settings" },
  tab("Who may ask"),
  tab("Permissions"),
  tab("Board"),
  {
    name: "Sources: GitHub",
    go: async (page) => {
      await page.getByRole("link", { name: "Sources", exact: true }).click();
      await page.getByRole("link", { name: "Open GitHub" }).first().click();
    },
    heading: "Settings",
  },
  {
    name: "Sources: Email",
    go: async (page) => {
      await page.getByRole("link", { name: "Settings", exact: true }).click();
      await page.getByRole("link", { name: "Open Email" }).first().click();
    },
    heading: "Settings",
  },
  { name: "Agents", go: (page) => through(page, "Agents"), heading: "Agents" },
  {
    name: "An agent",
    go: (page) =>
      page
        .getByRole("link", { name: /Reviewer/u })
        .first()
        .click(),
    heading: "Agents",
    alsoFrom: "Agents",
  },
  { name: "A new agent", go: (page) => page.getByRole("link", { name: "New agent" }).click(), heading: "Agents", alsoFrom: "Agents" },
  { name: "Skills", go: (page) => through(page, "Skills"), heading: "Skills" },
  {
    name: "A skill",
    go: (page) =>
      page
        .getByRole("link", { name: /release-notes/u })
        .first()
        .click(),
    heading: "Skills",
    alsoFrom: "Skills",
  },
  { name: "A new skill", go: (page) => page.getByRole("link", { name: "New skill" }).click(), heading: "Skills", alsoFrom: "Skills" },
  { name: "Templates", go: (page) => through(page, "Templates"), heading: "Templates" },
  { name: "Environments", go: (page) => through(page, "Environments"), heading: "Environments" },
  { name: "People", go: (page) => through(page, "People"), heading: "People" },
  { name: "Settings: General", go: (page) => through(page, "Settings"), heading: "General" },
  settings("Profile"),
  settings("Notifications"),
  settings("Members"),
  { name: "Settings: Members, invites", onPage: pressed(/^Invites/u, /eve.*@partner\.test/u), heading: "Members" },
  { name: "Settings: Members, links", onPage: pressed("Links and domains", /\/join\/link\//u), heading: "Members" },
  settings("Roles and permissions"),
  settings("Keys and connections"),
  settings("Usage"),
  settings("Billing"),
  settings("Security"),
  settings("Audit log"),
];
