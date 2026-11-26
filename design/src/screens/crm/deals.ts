import type { Deal, DealFields, Entry, Mail, Note, StageId } from "./data";

type EvIn = [at: string, who: string, dir: "in" | "out", text: string, extra?: { became?: string; mail?: Mail; note?: string }];
type Base = DealFields & { waiting?: boolean; pending?: StageId; notes?: Note[] };

function deal(base: Base, evs: EvIn[]): Deal {
  const events: Entry[] = evs.map(([at, who, dir, text, extra], i) => ({ kind: "entry", id: `${base.id}-${i}`, at, who, dir, text, ...extra }));
  const { waiting, pending, notes, ...fields } = base;
  return { ...fields, waiting: waiting ?? false, pending: pending ?? null, notes: notes ?? [], events };
}
const mail = (subject: string, body: string): { mail: Mail } => ({ mail: { subject, body } });

/** The twelve deals changed most recently, of the 41 in the CRM. */
export const DEALS: Deal[] = [
  deal({ id: "d1", name: "Team plan, 25 seats", company: "Northwind", stage: "talking", seats: 25, perSeat: 480, setup: 0, owner: "Sales", work: "SALES-24", source: "Form on the site", closeBy: "12 Dec", site: "northwind.example", size: "200 people", city: "Rotterdam",
    people: [{ name: "Pat Reyes", role: "Head of operations", email: "pat@northwind.example" }],
    notes: [{ by: "Sales", at: "21 Nov, 11:30", text: "Pat exports 212,000 rows every Monday. Wants the plan with the large export." }] }, [
    ["21 Nov, 11:20", "CRM", "in", "Form filled in on the site", { became: "SALES-24" }],
    ["21 Nov, 11:26", "Sales", "out", "Wrote a mail to Pat Reyes", mail("Your Northwind enquiry", "Hello Pat, thanks for asking about the team plan. It covers exports of any size. Could we talk for 20 minutes this week?")],
    ["24 Nov, 10:05", "CRM", "in", "Mail came in from Pat Reyes", mail("Re: Your Northwind enquiry", "Yes, Thursday works. We are 25 on the export team, and the Monday export is the thing that matters most to us.")],
    ["25 Nov, 09:31", "Sales", "out", "Wrote a mail to Pat Reyes", mail("Thursday at 14:00?", "Thursday at 14:00 works for us. I will send an invite and bring the numbers for 25 seats.")],
  ]),
  deal({ id: "d2", name: "Starter plan, 10 seats", company: "Fernhill Dental", stage: "new", seats: 10, perSeat: 480, setup: 500, owner: "Sales", work: "SALES-31", waiting: true, source: "Form on the site", closeBy: "20 Dec", site: "fernhill.example", size: "35 people", city: "Leeds",
    people: [{ name: "Mara Voss", role: "Practice manager", email: "mara@fernhill.example" }] }, [
    ["25 Nov, 08:47", "CRM", "in", "Form filled in on the site", { became: "SALES-31" }],
  ]),
  deal({ id: "d3", name: "Fleet portal, 60 seats", company: "Harbor Logistics", stage: "meeting", seats: 60, perSeat: 420, setup: 2000, owner: "Ama Mensah", work: "SALES-28", source: "Referral from Northwind", closeBy: "5 Dec", site: "harbor.example", size: "900 people", city: "Antwerp",
    people: [{ name: "Joris Dekker", role: "IT lead", email: "joris@harbor.example" }, { name: "Elin Berg", role: "Finance", email: "elin@harbor.example" }],
    notes: [{ by: "Ama Mensah", at: "24 Nov, 16:10", text: "Joris wants the price in writing before the call on Friday." }] }, [
    ["20 Nov, 14:02", "Ama Mensah", "out", "Introduced Sales to Joris Dekker", { became: "SALES-28" }],
    ["21 Nov, 09:15", "Sales", "out", "Wrote a mail to Joris Dekker", mail("Fleet portal for Harbor", "Hello Joris, Ama said you are looking at a portal for your drivers. Here is how 60 seats would work, and what set-up takes.")],
    ["24 Nov, 15:40", "CRM", "in", "Meeting booked for Fri 27 Nov, 11:00"],
    ["25 Nov, 09:40", "Sales", "out", "Sent Joris Dekker the price in writing"],
  ]),
  deal({ id: "d4", name: "Team plan, 8 seats", company: "Lumen Studio", stage: "offer", seats: 8, perSeat: 480, setup: 0, owner: "Sales", work: "SALES-22", source: "Mail", closeBy: "28 Nov", site: "lumen.example", size: "12 people", city: "Lisbon",
    people: [{ name: "Inês Costa", role: "Founder", email: "ines@lumen.example" }] }, [
    ["18 Nov, 10:00", "CRM", "in", "Mail came in from Inês Costa", { became: "SALES-22", ...mail("Prices for 8 people", "Hi, we are 8 people and need the shared exports. What would it cost for a year?") }],
    ["19 Nov, 09:10", "Sales", "out", "Wrote a mail to Inês Costa", mail("Re: Prices for 8 people", "Hello Inês, for 8 seats it is $3,840 for the year. I can send an offer today if that fits.")],
    ["25 Nov, 08:15", "Sales", "out", "Sent the offer", mail("Your offer from us", "Here is the offer for 8 seats, $3,840 for the year. It stands until 28 November.")],
  ]),
  deal({ id: "d5", name: "Team plan, 40 seats", company: "Quarry & Co", stage: "talking", seats: 40, perSeat: 450, setup: 1500, owner: "Sales", work: "SALES-19", waiting: true, source: "Form on the site", closeBy: "15 Dec", site: "quarry.example", size: "300 people", city: "Cork",
    people: [{ name: "Declan Shaw", role: "Operations", email: "declan@quarry.example" }] }, [
    ["19 Nov, 13:30", "CRM", "in", "Form filled in on the site", { became: "SALES-19" }],
    ["24 Nov, 17:20", "Sales", "out", "Wrote a mail to Declan Shaw", mail("Questions about set-up", "Hello Declan, set-up for 40 seats takes about a week. Which of your systems should it read from?")],
    ["25 Nov, 09:05", "CRM", "in", "Mail came in from Declan Shaw", mail("Re: Questions about set-up", "We use two systems for orders. Can you read from both? And can you send a price for 40 seats?")],
  ]),
  deal({ id: "d6", name: "Team plan, 15 seats", company: "Tidewater Foods", stage: "talking", seats: 15, perSeat: 480, setup: 0, owner: "Sales", work: "SALES-30", source: "Mail", closeBy: "10 Dec", site: "tidewater.example", size: "80 people", city: "Bristol",
    people: [{ name: "Gwen Pryce", role: "Buyer", email: "gwen@tidewater.example" }] }, [
    ["21 Nov, 11:00", "CRM", "in", "Mail came in from Gwen Pryce", { became: "SALES-30", ...mail("Can we see it working?", "We would like a short demo for our buyers, 15 of them.") }],
    ["22 Nov, 08:00", "Sales", "out", "Wrote a mail to Gwen Pryce", mail("Re: Can we see it working?", "Happy to. Here are three times this week.")],
    ["25 Nov, 08:02", "Sales", "out", "Sent reminder 1 of 2", mail("Re: Can we see it working?", "Hello Gwen, do any of the three times still suit you?")],
  ]),
  deal({ id: "d7", name: "School plan, 120 seats", company: "Birchwood School", stage: "offer", seats: 120, perSeat: 360, setup: 3000, owner: "Bo Larsen", work: null, source: "Event", closeBy: "19 Dec", site: "birchwood.example", size: "1,100 people", city: "Oxford",
    people: [{ name: "Hannah Price", role: "Head of IT", email: "hannah@birchwood.example" }],
    notes: [{ by: "Bo Larsen", at: "24 Nov, 15:02", text: "Board meets on 11 Dec. Hannah will send the offer round before then." }] }, [
    ["12 Nov, 15:00", "Bo Larsen", "out", "Met Hannah Price at the school event"],
    ["17 Nov, 10:20", "Bo Larsen", "out", "Sent the offer", mail("Offer for Birchwood", "Hello Hannah, here is the offer for 120 seats at the school price.")],
    ["24 Nov, 15:02", "Bo Larsen", "out", "Wrote a note", { note: "Board meets on 11 Dec. Hannah will send the offer round before then." }],
  ]),
  deal({ id: "d8", name: "Team plan, 30 seats", company: "Alder Finance", stage: "won", seats: 30, perSeat: 450, setup: 0, owner: "Sales", work: "SALES-14", source: "Referral from Lumen", closeBy: "Done", site: "alder.example", size: "150 people", city: "Dublin",
    people: [{ name: "Ciara Walsh", role: "Head of finance", email: "ciara@alder.example" }] }, [
    ["10 Nov, 09:00", "CRM", "in", "Form filled in on the site", { became: "SALES-14" }],
    ["24 Nov, 16:45", "CRM", "in", "Contract signed"],
    ["25 Nov, 08:40", "Sales", "out", "Wrote a mail to Ciara Walsh", mail("Welcome, and the next steps", "Thank you for signing. Set-up starts Monday, and I will send the invite for the first session.")],
  ]),
  deal({ id: "d9", name: "Team plan, 12 seats", company: "Kestrel Air", stage: "won", seats: 12, perSeat: 480, setup: 0, owner: "Ama Mensah", work: null, source: "Event", closeBy: "Done", site: "kestrel.example", size: "60 people", city: "Madrid",
    people: [{ name: "Luis Ortega", role: "Operations", email: "luis@kestrel.example" }] }, [
    ["14 Nov, 10:30", "Ama Mensah", "out", "Met Luis Ortega"],
    ["21 Nov, 14:10", "Ama Mensah", "out", "Moved this to Won"],
  ]),
  deal({ id: "d10", name: "Team plan, 20 seats", company: "Copperline Energy", stage: "lost", seats: 20, perSeat: 480, setup: 0, owner: "Sales", work: null, source: "Form on the site", closeBy: "Closed", site: "copperline.example", size: "400 people", city: "Aberdeen",
    people: [{ name: "Ross Kerr", role: "Procurement", email: "ross@copperline.example" }] }, [
    ["6 Nov, 12:00", "CRM", "in", "Form filled in on the site"],
    ["12 Nov, 09:40", "Sales", "out", "Wrote a mail to Ross Kerr", mail("Your questions", "Hello Ross, here are the answers to your four questions.")],
    ["20 Nov, 11:30", "CRM", "in", "Mail came in: they chose another tool", mail("Re: Your questions", "Thank you. We have decided to stay with the tool we have.")],
  ]),
  deal({ id: "d11", name: "Starter plan, 5 seats", company: "Mosaic Labs", stage: "new", seats: 5, perSeat: 480, setup: 0, owner: "Sales", work: "SALES-33", source: "Form on the site", closeBy: "20 Dec", site: "mosaic.example", size: "9 people", city: "Utrecht",
    people: [{ name: "Noor Haddad", role: "Founder", email: "noor@mosaic.example" }] }, [
    ["24 Nov, 18:12", "CRM", "in", "Form filled in on the site", { became: "SALES-33" }],
    ["25 Nov, 09:02", "Sales", "out", "Wrote a mail to Noor Haddad", mail("Thanks for asking", "Hello Noor, for 5 seats the starter plan fits. Do you want a short call, or shall I send the price?")],
  ]),
  deal({ id: "d12", name: "Team plan, 18 seats", company: "Redfield Farms", stage: "talking", seats: 18, perSeat: 480, setup: 0, owner: "Sales", work: "SALES-29", waiting: true, source: "Mail", closeBy: "16 Dec", site: "redfield.example", size: "70 people", city: "Norwich",
    people: [{ name: "Tess Arden", role: "Office manager", email: "tess@redfield.example" }] }, [
    ["20 Nov, 10:15", "CRM", "in", "Mail came in from Tess Arden", { became: "SALES-29", ...mail("Do you work with farms?", "We run 18 people across three sites. Does it work for us?") }],
    ["21 Nov, 09:00", "Sales", "out", "Wrote a mail to Tess Arden", mail("Re: Do you work with farms?", "Yes. Three sites is no problem. Which one has the most trouble with exports today?")],
    ["25 Nov, 09:41", "CRM", "in", "Mail came in from Tess Arden", mail("Re: Do you work with farms?", "The north site. Could you call us this week?")],
  ]),
];
