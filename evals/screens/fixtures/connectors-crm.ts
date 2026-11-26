import type { Deal, DealsView } from "~/modules/views-connector/types.ts";
import { at, read, type Fixture } from "./read.ts";

/* Acme's CRM, as Sales sees it: the twelve deals that changed most recently, of the 41 in it. */

const STAGES: DealsView["stages"] = [
  { id: "new", name: "New" },
  { id: "talking", name: "Talking" },
  { id: "meeting", name: "Meeting booked" },
  { id: "offer", name: "Offer sent" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

const deal = (
  id: string,
  name: string,
  company: string,
  stage: string,
  seats: number,
  perSeat: number,
  setup: number,
  owner: string,
  work: string | null,
  closes: string | null,
  last: readonly [string, string, string],
  waits = false,
): Deal => ({
  id,
  name,
  company,
  stage,
  amount: seats * perSeat + setup,
  seats,
  perSeat,
  setup,
  owner,
  work,
  waits,
  closes: closes === null ? null : at(`${closes} 12:00`),
  changed: { by: last[1], at: at(last[0]), says: last[2] },
});

const DEALS: readonly Deal[] = [
  deal("d1", "Team plan, 25 seats", "Northwind", "talking", 25, 480, 0, "Sales", "SALES-24", "12 Dec", [
    "25 Nov 09:31",
    "Sales",
    "Wrote a mail to Pat Reyes",
  ]),
  deal(
    "d2",
    "Starter plan, 10 seats",
    "Fernhill Dental",
    "new",
    10,
    480,
    500,
    "Sales",
    "SALES-31",
    "20 Dec",
    ["25 Nov 08:47", "CRM", "Form filled in on the site"],
    true,
  ),
  deal("d3", "Fleet portal, 60 seats", "Harbor Logistics", "meeting", 60, 420, 2000, "Ama Mensah", "SALES-28", "5 Dec", [
    "25 Nov 09:40",
    "Sales",
    "Sent Joris Dekker the price in writing",
  ]),
  deal("d4", "Team plan, 8 seats", "Lumen Studio", "offer", 8, 480, 0, "Sales", "SALES-22", "28 Nov", [
    "25 Nov 08:15",
    "Sales",
    "Sent the offer",
  ]),
  deal(
    "d5",
    "Team plan, 40 seats",
    "Quarry & Co",
    "talking",
    40,
    450,
    1500,
    "Sales",
    "SALES-19",
    "15 Dec",
    ["25 Nov 09:05", "CRM", "Mail came in from Declan Shaw"],
    true,
  ),
  deal("d6", "Team plan, 15 seats", "Tidewater Foods", "talking", 15, 480, 0, "Sales", "SALES-30", "10 Dec", [
    "25 Nov 08:02",
    "Sales",
    "Sent reminder 1 of 2",
  ]),
  deal("d7", "School plan, 120 seats", "Birchwood School", "offer", 120, 360, 3000, "Bo Larsen", null, "19 Dec", [
    "24 Nov 15:02",
    "Bo Larsen",
    "Wrote a note",
  ]),
  deal("d8", "Team plan, 30 seats", "Alder Finance", "won", 30, 450, 0, "Sales", "SALES-14", null, [
    "25 Nov 08:40",
    "Sales",
    "Wrote a mail to Ciara Walsh",
  ]),
  deal("d9", "Team plan, 12 seats", "Kestrel Air", "won", 12, 480, 0, "Ama Mensah", null, null, [
    "21 Nov 14:10",
    "Ama Mensah",
    "Moved this to Won",
  ]),
  deal("d10", "Team plan, 20 seats", "Copperline Energy", "lost", 20, 480, 0, "Sales", null, null, [
    "20 Nov 11:30",
    "CRM",
    "Mail came in: they chose another tool",
  ]),
  deal("d11", "Starter plan, 5 seats", "Mosaic Labs", "new", 5, 480, 0, "Sales", "SALES-33", "20 Dec", [
    "25 Nov 09:02",
    "Sales",
    "Wrote a mail to Noor Haddad",
  ]),
  deal(
    "d12",
    "Team plan, 18 seats",
    "Redfield Farms",
    "talking",
    18,
    480,
    0,
    "Sales",
    "SALES-29",
    "16 Dec",
    ["25 Nov 09:41", "CRM", "Mail came in from Tess Arden"],
    true,
  ),
];

export const CRM: Fixture = read(
  "/m/:manager/connectors/crm",
  { manager: "sales" },
  {
    stages: STAGES,
    deals: DEALS,
    total: 41,
    sales: { open: 21, calls: { done: 9, of: 12 }, waitsForPerson: 1 },
  },
);
