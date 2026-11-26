import { attachmentsOf, ME, type Attachment, type Conversation, type Item } from "./data";

const SUPPORT = (id: string, at: string, body: string[], by = "Support"): Item => ({ kind: "message", id, sender: "Juno", from: `Written by ${by}`, at, body });
const note = (id: string, text: string): Item => ({ kind: "note", id, text });
const them = (id: string, sender: string, address: string, at: string, body: string[], attachments?: Attachment[]): Item =>
  ({ kind: "message", id, sender, from: address, at, body, ...(attachments ? { attachments } : {}) });

const INVOICE = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23808080%22%20fill-opacity%3D%220.12%22%2F%3E%3Cg%20transform%3D%22translate%28200%20150%29%22%20fill%3D%22none%22%20stroke%3D%22%23808080%22%20stroke-opacity%3D%220.55%22%20stroke-width%3D%225%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22-44%22%20y%3D%22-44%22%20width%3D%2288%22%20height%3D%2288%22%20rx%3D%2216%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%22-18%22%20r%3D%222.5%22%20fill%3D%22%23808080%22%20fill-opacity%3D%220.55%22%20stroke%3D%22none%22%2F%3E%3Cpath%20d%3D%22M-34%2030%20L-8%200%20L10%2018%20L20%208%20L34%2024%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

type Seed = Omit<Conversation, "attachments">;
const build = (c: Seed): Conversation => ({ ...c, attachments: attachmentsOf(c.thread) });

/** Newest first. Today is 25 Nov, 09:54. */
export const MAILS: Conversation[] = [
  build({
    id: "c-01", category: "waiting", sender: "Pat Reyes", senderEmail: "pat.reyes@northwind.example", subject: "Re: Monday export is short",
    preview: "Any news? We need the numbers for the 11:00 meeting.", tags: ["Bug"], receivedAt: "09:31", isUnread: true, task: "ACME-412",
    thread: [
      them("c-01-1", "Pat Reyes", "pat.reyes@northwind.example", "24 Nov, 08:50", ["Monday’s export is short again. We export 212,000 rows every Monday and this one stops well before the end.", "Last week’s was the same. Can you tell me what is going on?"]),
      SUPPORT("c-01-2", "24 Nov, 09:18", ["Hello Pat, thank you for the exact numbers. That is a fault on our side: exports over 150,000 rows lose the last rows.", "I have passed it to our coding team with your numbers. I will write again when there is news."]),
      note("c-01-n1", "Handed to Coding"),
      note("c-01-n2", "Became ACME-412"),
      them("c-01-3", "Pat Reyes", "pat.reyes@northwind.example", "25 Nov, 09:31", ["Any news? We need the numbers for the 11:00 meeting."]),
    ],
  }),
  build({
    id: "c-02", category: "person", sender: "Hana Kimura", senderEmail: "hana.kimura@fernhill.example", subject: "Refund for the annual plan",
    preview: "We bought 40 seats by mistake. Please refund the whole $1,188.", tags: ["Refund", "Over the limit"], receivedAt: "09:12", isUnread: true,
    thread: [
      them("c-02-1", "Hana Kimura", "hana.kimura@fernhill.example", "25 Nov, 09:12", ["We bought 40 seats on the annual plan by mistake. We only need 4.", "Please refund the whole $1,188. We bought it yesterday and nobody has used it."]),
      note("c-02-n1", "Support may refund up to $200. This is $1,188, so it waits for a person."),
    ],
  }),
  build({
    id: "c-03", category: "person", sender: "Dev Patel", senderEmail: "dev.patel@orchardlabs.example", subject: "The invoice has the wrong company name",
    preview: "I attached the invoice. It says Orchard Lab, not Orchard Labs.", tags: ["Invoice"], receivedAt: "08:47", isUnread: true,
    thread: [
      them("c-03-1", "Dev Patel", "dev.patel@orchardlabs.example", "25 Nov, 08:47", ["I attached the invoice for November. It says Orchard Lab, not Orchard Labs, and our accountant will not take it like this."], [{ id: "c-03-a1", name: "invoice-nov-orchard.png", src: INVOICE }]),
      { kind: "draft", id: "c-03-d", at: "25 Nov, 08:52", body: ["Hello Dev, I am sorry about the name. I have corrected it to Orchard Labs and sent the new invoice to your billing address.", "Nothing else on it has changed."] },
    ],
  }),
  build({
    id: "c-04", category: "waiting", sender: "Sofia Marques", senderEmail: "sofia.marques@kitebox.example", subject: "I cannot invite a teammate",
    preview: "The invite button does nothing when I type his address.", tags: ["Account"], receivedAt: "08:20", isUnread: false,
    thread: [them("c-04-1", "Sofia Marques", "sofia.marques@kitebox.example", "25 Nov, 08:20", ["The invite button does nothing when I type my colleague’s address. I have tried twice.", "Is this a known problem?"])],
  }),
  build({
    id: "c-05", category: "done", sender: "Lindiwe Dube", senderEmail: "lindiwe.dube@brightside.example", subject: "Report times are a day off",
    preview: "Thank you for the fix, the dates are right again.", tags: ["Bug"], receivedAt: "07:02", isUnread: false, task: "ACME-411",
    thread: [
      them("c-05-1", "Lindiwe Dube", "lindiwe.dube@brightside.example", "24 Nov, 11:05", ["Every report I run shows the day before for anything after 23:00. Our team is in Lagos."]),
      note("c-05-n1", "Handed to Coding"),
      note("c-05-n2", "Became ACME-411"),
      SUPPORT("c-05-2", "25 Nov, 05:40", ["Hello Lindiwe, this is fixed. Reports now use your time zone, and the old ones show the right day when you open them again."]),
      them("c-05-3", "Lindiwe Dube", "lindiwe.dube@brightside.example", "25 Nov, 07:02", ["Thank you for the fix, the dates are right again."]),
    ],
  }),
  build({
    id: "c-06", category: "done", sender: "Tom Whitlock", senderEmail: "tom.whitlock@pinegrove.example", subject: "Dates in my report look wrong",
    preview: "Hello Tom, this is fixed. Reports now use your time zone.", tags: ["Bug"], receivedAt: "05:40", isUnread: false, task: "ACME-411",
    thread: [
      them("c-06-1", "Tom Whitlock", "tom.whitlock@pinegrove.example", "24 Nov, 14:22", ["The weekly report says the work was done on Tuesday. It was Wednesday morning here in Auckland."]),
      note("c-06-n1", "Became ACME-411, with Lindiwe Dube’s report"),
      SUPPORT("c-06-2", "25 Nov, 05:40", ["Hello Tom, this is fixed. Reports now use your time zone, so Wednesday morning in Auckland shows as Wednesday."]),
    ],
  }),
  build({
    id: "c-07", category: "done", sender: "Jonas Weber", senderEmail: "jonas.weber@lakeside.example", subject: "Price for 40 seats",
    preview: "Thanks, I will wait for Sales to write.", tags: ["Sales"], receivedAt: "Yesterday", isUnread: false,
    thread: [
      them("c-07-1", "Jonas Weber", "jonas.weber@lakeside.example", "24 Nov, 16:10", ["What would 40 seats cost on a two year plan? Is there a discount?"]),
      note("c-07-n1", "Not a support question. Forwarded to Sales"),
      SUPPORT("c-07-2", "24 Nov, 16:14", ["Hello Jonas, a price for a plan this size is for our sales team. I have sent them your question and they will write to you."]),
      them("c-07-3", "Jonas Weber", "jonas.weber@lakeside.example", "24 Nov, 16:31", ["Thanks, I will wait for Sales to write."]),
    ],
  }),
  build({
    id: "c-08", category: "person", owner: ME, sender: "Elena Petrova", senderEmail: "elena.petrova@mossway.example", subject: "CSV export has no header row",
    preview: "Since last week the first row is data, not names.", tags: ["Export"], receivedAt: "Yesterday", isUnread: false,
    thread: [
      them("c-08-1", "Elena Petrova", "elena.petrova@mossway.example", "24 Nov, 13:44", ["Since last week the first row of the CSV export is data, not column names. Our import breaks on it."]),
      note("c-08-n1", `${ME} took over`),
      SUPPORT("c-08-2", "24 Nov, 13:49", ["Hello Elena, I can see it on your account and I am looking into it."], `${ME}, as Juno`),
    ],
  }),
  build({
    id: "c-09", category: "done", sender: "Kwame Boateng", senderEmail: "kwame.boateng@harbourpoint.example", subject: "Where do I find my receipt?",
    preview: "Found it, thank you.", tags: ["Billing"], receivedAt: "Mon", isUnread: false,
    thread: [
      them("c-09-1", "Kwame Boateng", "kwame.boateng@harbourpoint.example", "23 Nov, 10:02", ["Where do I find the receipt for my last payment?"]),
      SUPPORT("c-09-2", "23 Nov, 10:04", ["Hello Kwame, it is under Billing, then Payments. Each row has a receipt link at the end."]),
      them("c-09-3", "Kwame Boateng", "kwame.boateng@harbourpoint.example", "23 Nov, 10:15", ["Found it, thank you."]),
    ],
  }),
];
