import type { Entry } from "~/modules/views-connector/types.ts";
import { conversation, inn, note, out } from "./connectors-kit.ts";
import { read, type Fixture } from "./read.ts";

/* Support's mail, as the people writing in see it: nine conversations, the newest first, and the first one open. */

const ME = "Ama Mensah";
const PAT = "pat.reyes@northwind.example";
const ACME_412 = ["ACME-412", "Export drops rows over 150k"] as const;
const ACME_411 = ["ACME-411", "Timezone off by one in reports"] as const;

const FIRST = conversation({
  id: "c-01",
  with: "Pat Reyes",
  address: PAT,
  subject: "Re: Monday export is short",
  preview: "Any news? We need the numbers for the 11:00 meeting.",
  when: "25 Nov 09:31",
  unread: 1,
  waits: "us",
  tags: ["Bug"],
  work: ACME_412,
  thread: "thread-46",
});

const LIST = [
  FIRST,
  conversation({
    id: "c-02",
    with: "Hana Kimura",
    address: "hana.kimura@fernhill.example",
    subject: "Refund for the annual plan",
    preview: "We bought 40 seats by mistake. Please refund the whole $1,188.",
    when: "25 Nov 09:12",
    unread: 1,
    waits: "person",
    tags: ["Refund", "Over the limit"],
  }),
  conversation({
    id: "c-03",
    with: "Dev Patel",
    address: "dev.patel@orchardlabs.example",
    subject: "The invoice has the wrong company name",
    preview: "I attached the invoice. It says Orchard Lab, not Orchard Labs.",
    when: "25 Nov 08:47",
    unread: 1,
    waits: "person",
    tags: ["Invoice"],
  }),
  conversation({
    id: "c-04",
    with: "Sofia Marques",
    address: "sofia.marques@kitebox.example",
    subject: "I cannot invite a teammate",
    preview: "The invite button does nothing when I type his address.",
    when: "25 Nov 08:20",
    waits: "us",
    tags: ["Account"],
  }),
  conversation({
    id: "c-05",
    with: "Lindiwe Dube",
    address: "lindiwe.dube@brightside.example",
    subject: "Report times are a day off",
    preview: "Thank you for the fix, the dates are right again.",
    when: "25 Nov 07:02",
    waits: "done",
    tags: ["Bug"],
    work: ACME_411,
  }),
  conversation({
    id: "c-06",
    with: "Tom Whitlock",
    address: "tom.whitlock@pinegrove.example",
    subject: "Dates in my report look wrong",
    preview: "Hello Tom, this is fixed. Reports now use your time zone.",
    when: "25 Nov 05:40",
    waits: "done",
    tags: ["Bug"],
    work: ACME_411,
    last: "ours",
  }),
  conversation({
    id: "c-07",
    with: "Jonas Weber",
    address: "jonas.weber@lakeside.example",
    subject: "Price for 40 seats",
    preview: "Thanks, I will wait for Sales to write.",
    when: "24 Nov 16:31",
    waits: "done",
    tags: ["Sales"],
  }),
  conversation({
    id: "c-08",
    with: "Elena Petrova",
    address: "elena.petrova@mossway.example",
    subject: "CSV export has no header row",
    preview: "Since last week the first row is data, not names.",
    when: "24 Nov 13:44",
    waits: "person",
    tags: ["Export"],
    person: ME,
    last: "ours",
  }),
  conversation({
    id: "c-09",
    with: "Kwame Boateng",
    address: "kwame.boateng@harbourpoint.example",
    subject: "Where do I find my receipt?",
    preview: "Found it, thank you.",
    when: "23 Nov 10:15",
    waits: "done",
    tags: ["Billing"],
  }),
];

const STREAM: readonly Entry[] = [
  inn(
    "c-01-1",
    "24 Nov 08:50",
    "Pat Reyes",
    PAT,
    "Monday’s export is short again. We export 212,000 rows every Monday and this one stops well before the end.\n\nLast week’s was the same. Can you tell me what is going on?",
  ),
  out(
    "c-01-2",
    "24 Nov 09:18",
    "Support",
    "Hello Pat, thank you for the exact numbers. That is a fault on our side: exports over 150,000 rows lose the last rows.\n\nI have passed it to our coding team with your numbers. I will write again when there is news.",
  ),
  note("c-01-n1", "24 Nov 09:19", "Handed to Coding"),
  note("c-01-n2", "24 Nov 09:20", "Became ACME-412", "/m/coding/work/ACME-412"),
  inn("c-01-3", "25 Nov 09:31", "Pat Reyes", PAT, "Any news? We need the numbers for the 11:00 meeting."),
];

export const EMAIL: Fixture = read(
  "/m/:manager/connectors/email",
  { manager: "support" },
  { mailbox: "juno@acme.co-worker.tech", conversations: LIST },
);
export const EMAIL_OPEN: Fixture = read(
  "/m/:manager/connectors/email/:conversation",
  { manager: "support", conversation: "c-01" },
  { conversation: FIRST, stream: STREAM },
);
