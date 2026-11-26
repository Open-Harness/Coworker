import { connectors } from "~/modules/connectors/service.ts";
import type { AccountState } from "~/modules/connectors/types.ts";
import type { ModelChoice, Thinking } from "~/modules/playbook/types.ts";
import type { ModelOn } from "~/modules/choosing/types.ts";
import type {
  ConnectGithubView,
  ConnectorsView,
  GeneralView,
  KeysView,
  McpView,
  MeView,
  MembersView,
  SharedView,
  UsageView,
  BillingView,
} from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { accountsOf, personOf } from "./around.ts";
import { settingOr } from "./settings-kept.ts";

/* The settings pages, each from what the workspace keeps. */

const DAY = 86_400_000;
const LEVELS: readonly Thinking[] = ["off", "low", "medium", "high"];

export async function generalView(c: ConsoleDeps): Promise<GeneralView> {
  const [zone, perDay, tellAt, mayMake, mayTry, mayJoin] = await Promise.all([
    settingOr(c.store, "zone", "UTC"),
    settingOr(c.store, "perDay", 100),
    settingOr(c.store, "tellAt", 0.8),
    settingOr(c.store, "mayMake", true),
    settingOr(c.store, "mayTry", true),
    settingOr(c.store, "mayJoin", true),
  ]);
  return { name: c.workspace.name, address: c.workspace.address, zone, perDay, tellAt, mayMake, mayTry, mayJoin };
}

export const membersView = (c: ConsoleDeps): MembersView => ({
  people: c.people.map((member) => ({ ...personOf(member), mails: [member.email], known: [], lastSeen: null })),
  invited: [],
  wantIn: [],
});

export async function keysView(c: ConsoleDeps): Promise<KeysView> {
  const [connections, secrets, choice] = await Promise.all([c.outside.connections(), c.outside.secrets(), c.store.setting("choice")]);
  return {
    models: connections.map((connection) => {
      const works = connection.check._tag === "Works";
      return {
        id: connection.id,
        label: connection.label,
        source: connection.source,
        works,
        says: connection.check._tag === "Works" ? "Works" : connection.check.error,
        checked: connection.check.checkedAt,
        models: connection.models.map((model): ModelOn & { readonly name: string; readonly levels: readonly Thinking[] } => {
          const price = connection.prices?.[model];
          return {
            connection: connection.id,
            model,
            works,
            ...(price === undefined ? {} : { price: { input: price.input, cached: price.cached ?? price.input, output: price.output } }),
            thinks: true,
            name: model,
            levels: LEVELS,
          };
        }),
      };
    }),
    choice: isChoice(choice) ? choice : null,
    // A model connection's key is in the vault as `model:<id>`: it is the connection's, and shown there.
    secrets: secrets
      .filter(({ name }) => !name.startsWith("model:"))
      .map(({ name, updatedAt }) => ({ name, of: "A secret of this workspace", usedBy: [], set: updatedAt, usedAt: 0 })),
  };
}

export const isChoice = (value: unknown): value is Exclude<ModelChoice, "inherit"> =>
  typeof value === "object" && value !== null && "connection" in value && "model" in value && "thinking" in value;

export async function usageView(c: ConsoleDeps): Promise<UsageView> {
  const [rows, perDay, tellAt] = await Promise.all([
    c.store.managers(),
    settingOr(c.store, "perDay", 100),
    settingOr(c.store, "tellAt", 0.8),
  ]);
  const used = await Promise.all(rows.map(async (row) => ({ row, usage: await c.managers.get(row.objectId, row.region).usage() })));
  const today = Math.floor(c.clock.now() / DAY) * DAY;
  const models = new Map<string, { cost: number; notKnown: number }>();
  for (const { usage } of used)
    for (const one of usage) {
      const was = models.get(one.model) ?? { cost: 0, notKnown: 0 };
      models.set(one.model, { cost: was.cost + one.dollars, notKnown: was.notKnown + one.notKnown });
    }
  return {
    days: Array.from({ length: 7 }, (_, n) => {
      const day = today - (6 - n) * DAY;
      return {
        day,
        cost: used
          .flatMap(({ usage }) => usage)
          .filter((one) => one.day === day)
          .reduce((sum, one) => sum + one.dollars, 0),
        boxes: 0,
      };
    }),
    managers: used.map(({ row, usage }) => ({
      id: row.node.id,
      name: row.node.name,
      cost: usage.reduce((sum, one) => sum + one.dollars, 0),
    })),
    models: [...models].map(([model, one]) => ({ model, ...one })),
    perDay,
    tellAt,
  };
}

export async function billingView(c: ConsoleDeps): Promise<BillingView> {
  const billed = await c.outside.billing();
  const people = c.people.length;
  if (billed === null)
    return {
      plan: "Team",
      people,
      perPerson: 0,
      boxHours: { used: 0, included: 0, overPerHour: 0 },
      nextInvoice: 0,
      notCounted: [],
      invoices: [],
    };
  const perPerson = billed.plan.seatCents / 100;
  return {
    plan: billed.plan.name,
    people: billed.seats,
    perPerson,
    boxHours: { used: billed.hours.used, included: billed.hours.included, overPerHour: billed.plan.overageCentsPerHour / 100 },
    nextInvoice: billed.nextSeats * perPerson,
    notCounted: [],
    invoices: [],
  };
}

const WHAT: Readonly<Record<string, string>> = {
  github: "Issues, pull requests and checks on the repos it is installed on.",
  email: "Mail to and from this workspace.",
  slack: "Channels and direct messages.",
  whatsapp: "Chats on a phone number.",
  crm: "Deals and contacts.",
  calendar: "Meetings and free time.",
};

export async function connectorsView(c: ConsoleDeps): Promise<ConnectorsView> {
  const [accounts, rows] = await Promise.all([accountsOf(c), c.store.managers()]);
  const states: AccountState[] = accounts.map((account) => {
    const steps = connectors.all.find(({ id }) => id === account.id)?.setUp ?? [];
    return {
      account: account.id,
      connector: account.id === "github" ? "github" : "email",
      as: account.as,
      holder: { workspace: true },
      works: account.works,
      says: "Works",
      since: account.since,
      steps: steps.map((step) => ({ step, state: { _tag: "Works", says: "Done" } })),
      places: account.places,
    };
  });
  return {
    connectors: connectors.all.map(({ id, name }) => ({ id, name, what: WHAT[id] ?? "" })),
    accounts: states.map((state) => ({
      ...state,
      name: connectors.all.find(({ id }) => id === state.connector)?.name ?? state.connector,
      scope: state.places.join(", "),
      usedBy: rows.filter(() => false).map(({ node }) => ({ id: node.id, name: node.name })),
      in7Days: 0,
      lastUsed: 0,
      may: "What each manager's reach allows",
      asks: "Merging, closing, and what shows outside",
    })),
  };
}

export async function githubView(c: ConsoleDeps): Promise<ConnectGithubView> {
  const { installation } = await c.outside.github();
  return {
    installed: installation === undefined ? null : { on: installation.account, by: c.who.name },
    repos: (installation?.repos ?? []).map((id) => ({ id, about: "Reachable by the App" })),
    chosen: [],
    abilities: [
      { id: "contents", does: "Read the code, and push a branch", needs: "Contents: write", missing: false },
      { id: "issues", does: "Read issues and comment", needs: "Issues: write", missing: false },
      { id: "pulls", does: "Open pull requests", needs: "Pull requests: write", missing: false },
    ],
  };
}

export const mcpView = (): McpView => ({ servers: [] });
export const sharedView = (): SharedView => ({ agents: [], skills: [], environments: [] });

export async function meView(c: ConsoleDeps): Promise<MeView> {
  const zone = await settingOr(c.store, "zone", "UTC");
  return {
    name: c.who.name,
    mails: [{ mail: c.who.email, proven: true }],
    zone,
    tell: {},
    weekAt: { day: 1, at: "09:00" },
    quiet: null,
    ways: [{ id: "mail", about: "A link sent to your address" }],
    sessions: [],
  };
}
