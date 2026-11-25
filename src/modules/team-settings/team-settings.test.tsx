import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { createServer } from "~/modules/team-core/service.ts";
import { afterEach, describe, expect, it } from "vitest";
import { BillingScreen, createSettingsApi, GeneralScreen, PeopleScreen, UsageScreen } from "./service.ts";
import type { BillingData, GeneralData, UsageData } from "./types.ts";

afterEach(cleanup);

const BILLING: BillingData = {
  plan: "Team",
  seatCents: 2_000,
  includedHoursPerSeat: 10,
  overageCentsPerHour: 80,
  seats: 3,
  nextSeats: 3,
  periodStart: Date.UTC(2026, 0, 1),
  renewsAt: Date.UTC(2026, 1, 1),
  hoursUsed: 32.5,
  hoursIncluded: 30,
  hoursOver: 2.5,
  overageCents: 200,
  limitOn: true,
  limitCents: 5_000,
  stopped: false,
};

const OK = { _tag: "Loaded", value: true } as const;
const GENERAL: GeneralData = {
  name: "Acme",
  address: "acme",
  mailDomain: "co-worker.tech",
  region: "eu",
  createdAt: 0,
  timeZone: "Europe/London",
  defaultModel: null,
  choices: [],
  hasLogo: false,
  role: "owner",
};

const USAGE: UsageData = {
  periodStart: Date.UTC(2026, 0, 1),
  renewsAt: Date.UTC(2026, 1, 1),
  hours: { used: 4.5, included: 30, over: 0 },
  overageCents: 0,
  perDay: [{ day: "2026-01-02", hours: 4.5 }],
  runs: { thisPeriod: 4, lastPeriod: 1 },
  managers: [{ managerId: "m1", name: "Launch", sandboxHours: 4.5, runs: 4, budget: null }],
};

/** Every request it gets, answered by path. */
function serving(answers: Readonly<Record<string, unknown>>) {
  const asked: { readonly path: string; readonly method: string; readonly body: unknown }[] = [];
  const api = createSettingsApi(
    createServer(async (path, init) => {
      asked.push({ path, method: init?.method ?? "GET", body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
      const body = answers[path.split("?")[0] ?? path];
      return body === undefined ? Response.json({ error: "Only an Owner can" }, { status: 403 }) : Response.json(body);
    }),
  );
  return { api, asked };
}

describe("billing and usage", () => {
  it("adds the seats and the hours past the plan, and saves a new limit", async () => {
    const saved: [boolean, number][] = [];
    render(
      <LayerProvider>
        <BillingScreen billing={BILLING} onLimit={async (on, cents) => (saved.push([on, cents]), OK)} />
      </LayerProvider>,
    );
    expect(screen.getByText("$62")).toBeTruthy();
    expect(screen.getByText("2.5 h past the plan at $0.80 an hour: $2 so far.")).toBeTruthy();
    const amount = screen.getByLabelText("Dollars over the plan");
    await userEvent.clear(amount);
    await userEvent.type(amount, "75{Tab}");
    await userEvent.click(screen.getByRole("button", { name: "Save limit" }));
    expect(saved).toEqual([[true, 7_500]]);
  });

  it("says when sandboxes are stopped, and counts each manager's work", () => {
    render(
      <LayerProvider>
        <BillingScreen billing={{ ...BILLING, stopped: true }} onLimit={async () => OK} />
        <UsageScreen usage={USAGE} onBudget={async () => OK} />
      </LayerProvider>,
    );
    expect(screen.getByText("Sandboxes are stopped")).toBeTruthy();
    expect(screen.getByText("4.5 h of sandbox · 4 runs")).toBeTruthy();
  });
});

describe("General", () => {
  const open = (onDelete: () => Promise<{ _tag: "Failed"; message: string }>) =>
    render(
      <LayerProvider>
        <GeneralScreen
          general={GENERAL}
          logoSrc={undefined}
          exportHref="/export"
          onSave={async () => OK}
          onLogo={async () => OK}
          onRemoveLogo={async () => OK}
          onDelete={onDelete}
          onDownload={() => undefined}
        />
      </LayerProvider>,
    );

  it("deletes the workspace only after asking and typing its name, and shows why when the server refuses", async () => {
    let asked = 0;
    open(async () => {
      asked += 1;
      return { _tag: "Failed", message: "Only an Owner can" };
    });
    await userEvent.click(screen.getByRole("button", { name: "Delete workspace" }));
    expect(asked).toBe(0);
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Delete workspace" });
    expect(confirm.hasAttribute("disabled") || confirm.getAttribute("aria-disabled") === "true").toBe(true);
    await userEvent.type(within(dialog).getByLabelText("Type Acme to confirm"), "Acme");
    await userEvent.click(confirm);
    expect(await screen.findByText("Only an Owner can")).toBeTruthy();
    expect(asked).toBe(1);
  });

  it("keeps what was typed until it is saved, and asks before a new address", async () => {
    const saved: unknown[] = [];
    render(
      <LayerProvider>
        <GeneralScreen
          general={GENERAL}
          logoSrc={undefined}
          exportHref="/export"
          onSave={async (input) => (saved.push(input), OK)}
          onLogo={async () => OK}
          onRemoveLogo={async () => OK}
          onDelete={async () => OK}
          onDownload={() => undefined}
        />
      </LayerProvider>,
    );
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save.hasAttribute("disabled") || save.getAttribute("aria-disabled") === "true").toBe(true);
    await userEvent.clear(screen.getByLabelText("Address"));
    await userEvent.type(screen.getByLabelText("Address"), "acme-two");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(saved).toEqual([]);
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Change address" }));
    expect(saved).toEqual([{ name: "Acme", address: "acme-two", timeZone: "Europe/London", defaultModel: null }]);
  });
});

describe("people", () => {
  it("puts members and the people Owners vouched for in one list", async () => {
    const { api } = serving({
      "/api/workspaces/w1/people": {
        people: [
          { person: "email:bo@acme.test", handles: [{ kind: "github", id: "4821", display: "bolarsen", proof: "added" }] },
          { person: "email:pat@northwind.test", handles: [{ kind: "email", id: "pat@northwind.test", proof: "added" }] },
        ],
      },
      "/api/auth/organization/list-members": {
        members: [{ id: "mem1", role: "builder", createdAt: "2026-01-01T00:00:00Z", user: { name: "Bo Larsen", email: "bo@acme.test" } }],
      },
    });
    const people = await api.people("w1");
    if (people._tag !== "Loaded") throw new Error(people.message);
    render(
      <LayerProvider>
        <PeopleScreen people={people.value} onAdd={async () => ({ _tag: "Loaded", value: true })} />
      </LayerProvider>,
    );
    expect(screen.getByRole("row", { name: /Bo Larsen.*bolarsen.*Builder/u })).toBeTruthy();
    expect(screen.getByRole("row", { name: /pat@northwind\.test.*Not a member/u })).toBeTruthy();
  });
});

describe("the API", () => {
  it("leaves out answered invites, and says why a key was not taken", async () => {
    const { api } = serving({
      "/api/auth/organization/list-invitations": [
        { id: "i1", email: "dana@acme.test", role: "member", status: "pending", expiresAt: "2026-01-08T00:00:00Z" },
        { id: "i2", email: "eve@acme.test", role: "member", status: "accepted", expiresAt: "2026-01-08T00:00:00Z" },
      ],
      "/api/workspaces/w1/models": { _tag: "Rejected", reason: "The provider refused the key" },
    });
    const invites = await api.invites("w1");
    expect(invites._tag === "Loaded" && invites.value.map(({ id }) => id)).toEqual(["i1"]);
    expect(await api.addModel("w1", { source: "anthropic", key: "k" })).toEqual({
      _tag: "Failed",
      message: "The provider refused the key",
    });
  });

  it("sends each change to its own route, and gives the server's words when it is refused", async () => {
    const { api, asked } = serving({});
    expect(await api.setRole("w1", "mem1", "owner")).toEqual({ _tag: "Failed", message: "Only an Owner can" });
    await api.assignAgent("w1", "Worker", undefined);
    await api.storeSecret("w1", "npm", "v");
    await api.setLimit("w1", false, 5_000);
    expect(asked).toEqual([
      {
        path: "/api/auth/organization/update-member-role",
        method: "POST",
        body: { organizationId: "w1", memberId: "mem1", role: "owner" },
      },
      { path: "/api/workspaces/w1/agents/Worker/environment", method: "PUT", body: { environment: null } },
      { path: "/api/workspaces/w1/secrets/npm", method: "PUT", body: { value: "v" } },
      { path: "/api/workspaces/w1/billing/limit", method: "PUT", body: { on: false, overCents: 5_000 } },
    ]);
  });
});
