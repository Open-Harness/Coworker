import type { AccountState, ConnectorId, StepState } from "~/modules/connectors/types.ts";
import type { ConnectorsView } from "~/modules/views-workspace/types.ts";
import { at, read, type Fixture } from "./read.ts";

/* Every connector of the workspace and its accounts: whose, who uses it, whether it works. */
type Account = ConnectorsView["accounts"][number];
const SINCE = at("14 Sep 10:00");
const WORKS: StepState = { _tag: "Works", says: "Works" };
const steps = (id: string, ...states: readonly StepState[]): AccountState["steps"] =>
  states.map((state, i) => ({
    step: { id: `${id}-${i}`, says: i === 0 ? "A person connects it" : "Checked by itself", by: i === 0 ? "person" : "itself" },
    state,
  }));

interface Made {
  readonly id: string;
  readonly connector: ConnectorId;
  readonly name: string;
  readonly as: string;
  readonly scope: string;
  readonly places: readonly string[];
  readonly holder: AccountState["holder"];
  readonly usedBy: readonly string[];
  readonly last: string;
  readonly may: string;
  readonly asks: string;
}
const NAMES: Readonly<Record<string, string>> = {
  coding: "Coding",
  docs: "Docs",
  releases: "Releases",
  support: "Support",
  whatsapp: "WhatsApp desk",
  sales: "Sales",
};
const account = (m: Made, says = "Connected", state: StepState = WORKS, works = true): Account => ({
  account: m.id,
  connector: m.connector,
  name: m.name,
  as: m.as,
  scope: m.scope,
  holder: m.holder,
  works,
  says,
  since: SINCE,
  steps: steps(m.id, WORKS, state),
  places: m.places,
  usedBy: m.usedBy.map((id) => ({ id, name: NAMES[id] ?? id })),
  in7Days: 0,
  lastUsed: at(m.last),
  may: m.may,
  asks: m.asks,
});
const lender = (person: string): AccountState["holder"] => ({ person, seenBy: "lender" });
const SAME = "Search, draft, reply, send to people inside Acme";
const OUTSIDE = "Write first to someone outside";

export const CONNECTORS_VIEW: ConnectorsView = {
  connectors: [
    { id: "github", name: "GitHub", what: "Issues and pull requests" },
    { id: "email", name: "Email", what: "Mailboxes Juno writes from" },
    { id: "slack", name: "Slack", what: "Where the team asks" },
    { id: "whatsapp", name: "WhatsApp", what: "Numbers customers write to" },
    { id: "crm", name: "CRM", what: "Deals and people" },
    { id: "calendar", name: "Calendar", what: "Times for calls" },
  ],
  accounts: [
    {
      ...account({
        id: "gh-acme",
        connector: "github",
        name: "Acme’s GitHub App",
        as: "juno-acme[bot]",
        scope: "acme/web, acme/docs",
        places: ["acme/web", "acme/docs"],
        holder: lender("ama"),
        usedBy: ["coding", "docs", "releases"],
        last: "25 Nov 09:54",
        may: "Read, comment, reply on lines, push to its own branches, open pull requests",
        asks: "Run checks again, merge, close an issue",
      }),
      in7Days: 412,
    },
    {
      ...account({
        id: "em-juno",
        connector: "email",
        name: "juno@acme.co-worker.tech",
        as: "juno@acme.co-worker.tech",
        scope: "Acme’s domain",
        places: ["*"],
        holder: { workspace: true },
        usedBy: ["sales", "releases"],
        last: "25 Nov 09:31",
        may: SAME,
        asks: OUTSIDE,
      }),
      in7Days: 63,
    },
    {
      ...account({
        id: "em-support",
        connector: "email",
        name: "support@acme.example",
        as: "support@acme.example",
        scope: "Acme’s domain",
        places: ["*"],
        holder: { workspace: true },
        usedBy: ["support"],
        last: "25 Nov 09:40",
        may: SAME,
        asks: OUTSIDE,
      }),
      in7Days: 212,
    },
    {
      ...account({
        id: "sl-acme",
        connector: "slack",
        name: "acme.slack.com",
        as: "@juno",
        scope: "#engineering, #support-bugs, #releases, #sales",
        places: ["#engineering", "#support-bugs", "#releases", "#sales"],
        holder: lender("ama"),
        usedBy: ["coding", "sales"],
        last: "25 Nov 09:36",
        may: "Answer where it is asked, in a thread",
        asks: "Write in a channel on its own",
      }),
      in7Days: 58,
    },
    {
      ...account(
        {
          id: "wa-1",
          connector: "whatsapp",
          name: "+44 7700 900123",
          as: "+44 7700 900123",
          scope: "Chats it started or that wrote to it, on Ama’s phone",
          places: ["*"],
          holder: lender("ama"),
          usedBy: ["whatsapp", "support"],
          last: "25 Nov 08:09",
          may: "Read a chat, reply, react",
          asks: "Write first to someone new",
        },
        "Offline since 08:10",
        { _tag: "Missing", says: "Offline since 08:10", fix: "Scan the code with the phone that holds the number" },
        false,
      ),
      in7Days: 94,
    },
    {
      ...account({
        id: "crm-acme",
        connector: "crm",
        name: "Acme’s CRM",
        as: "Juno",
        scope: "All deals",
        places: ["*"],
        holder: lender("bo"),
        usedBy: ["sales"],
        last: "25 Nov 09:12",
        may: "Read deals, add a lead, add a note",
        asks: "Change a deal’s stage. “Fits” is set by Bo only",
      }),
      in7Days: 37,
    },
    {
      ...account({
        id: "cal-bo",
        connector: "calendar",
        name: "Bo’s calendar",
        as: "Bo Larsen",
        scope: "Calls with leads",
        places: ["*"],
        holder: lender("bo"),
        usedBy: ["sales"],
        last: "24 Nov 15:00",
        may: "Find a time, book, move",
        asks: "Cancel a call",
      }),
      in7Days: 9,
    },
  ],
};

export const CONNECTOR_PAGES: readonly Fixture[] = [read("/settings/connectors", {}, CONNECTORS_VIEW)];
