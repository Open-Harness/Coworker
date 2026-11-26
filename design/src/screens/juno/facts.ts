import { MANAGERS } from "../../world";
import { PARTS } from "../settings/facts/money";

/* About Juno: what it keeps, what it may do, how its money is handed out, what it did. Today is 25 November 2026, about 09:54. */

export interface Note { readonly id: string; readonly text: string; readonly by: string; readonly where: string; readonly for: string; readonly told: string; readonly used: string }
export const NOTES: readonly Note[] = [
  { id: "n1", text: "Releases go out every second Thursday at 14:00, and customers hear the same day.", by: "Ama Mensah", where: "Here, a chat", for: "Releases", told: "18 Nov", used: "Today, 09:05" },
  { id: "n2", text: "No mail to a new lead before 09:00.", by: "Bo Larsen", where: "Slack, DM", for: "Sales", told: "2 Nov", used: "Yesterday, 11:02" },
  { id: "n3", text: "Northwind exports 212,000 rows every Monday.", by: "Pat Reyes", where: "Mail, SUP-88", for: "Support", told: "24 Nov", used: "Today, 09:31" },
  { id: "n4", text: "Chidi reviews anything about the public API.", by: "Chidi Okafor", where: "GitHub, #413", for: "Coding", told: "20 Nov", used: "24 Nov" },
  { id: "n5", text: "Lena Fischer writes in German.", by: "Lena Fischer", where: "WhatsApp", for: "WhatsApp desk", told: "11 Nov", used: "Today, 08:02" },
  { id: "n6", text: "Say prices only if they are on the site.", by: "Ama Mensah", where: "Here, a chat", for: "Everyone", told: "5 Oct", used: "23 Nov" },
  { id: "n7", text: "Bo wants the week on Monday, before 08:00.", by: "Bo Larsen", where: "Slack, #sales", for: "Juno", told: "9 Nov", used: "Today, 08:30" },
  { id: "n8", text: "Dropping Node 18 breaks one customer. Ask before it merges.", by: "Ama Mensah", where: "Here, a chat", for: "Coding", told: "22 Nov", used: "Today, 09:20" },
];
/** A correction waits as a proposed change until a person accepts it. */
export interface Correction { readonly id: string; readonly was: string; readonly now: string; readonly by: string; readonly where: string; readonly when: string; readonly noteId: string }
export const CORRECTIONS: readonly Correction[] = [
  { id: "c1", was: "No mail to a new lead before 09:00.", now: "No mail to a new lead before 08:30.", by: "Bo Larsen", where: "Slack, #sales", when: "Today, 08:52", noteId: "n2" },
  { id: "c2", was: "Northwind exports 212,000 rows every Monday.", now: "Northwind exports about 230,000 rows every Monday.", by: "Pat Reyes", where: "Mail, SUP-88", when: "Today, 09:12", noteId: "n3" },
];

export type Say = "on" | "ask" | "off";
export interface May { readonly id: string; readonly what: string; readonly say: Say; readonly from: string }
export const MAY_DO: readonly { readonly title: string; readonly about: string; readonly rows: readonly May[] }[] = [
  { title: "On this console", about: "What it does to the workspace itself.", rows: [
    { id: "m1", what: "Make a new manager", say: "ask", from: "Settings, General" },
    { id: "m2", what: "Try a change to a manager, on past work", say: "on", from: "Settings, General" },
    { id: "m3", what: "Make a version of a playbook", say: "ask", from: "You said, 12 Nov" },
    { id: "m4", what: "Pause a manager that is stuck", say: "on", from: "Starting point" },
    { id: "m5", what: "Retire a manager", say: "off", from: "Starting point" },
    { id: "m6", what: "Change a limit", say: "off", from: "Starting point" },
    { id: "m7", what: "Write to your inbox", say: "on", from: "Starting point" },
  ] },
  { title: "Outside", about: "What it does as itself on the connectors, not as a manager.", rows: [
    { id: "o1", what: "Post in Slack", say: "on", from: "You said, 14 Sep" },
    { id: "o2", what: "Comment on GitHub", say: "on", from: "You said, 14 Sep" },
    { id: "o3", what: "Send mail as juno@acme.co-worker.tech", say: "ask", from: "Starting point" },
    { id: "o4", what: "Answer on WhatsApp", say: "ask", from: "Starting point" },
    { id: "o5", what: "Send money", say: "off", from: "Soul, never" },
  ] },
];

/** The $100 a day, in parts. `part` is what each may use, in dollars. Used is its last 7 days over 7. */
export const SPEND = PARTS.map((p) => { const m = MANAGERS.find((x) => x.id === p.id)!; return { ...p, name: m.name, week: m.last7.cost, avg: Math.round((m.last7.cost / 7) * 10) / 10 }; });

export interface Did { readonly id: string; readonly when: string; readonly did: string; readonly with: string; readonly undo?: string }
export const DID: readonly Did[] = [
  { id: "h1", when: "Today, 09:52", did: "Started to try version 5 of Support on 40 past mails", with: "Itself", undo: "Stop trying" },
  { id: "h2", when: "Today, 09:31", did: "Answered Why is Support slower, and began the note to the team", with: "Ama Mensah" },
  { id: "h3", when: "Today, 09:05", did: "Asked Bo in #releases about v2.3 without the 150k fix", with: "Itself" },
  { id: "h4", when: "Today, 08:30", did: "Said what needs a person: 3 things, in your inbox", with: "Itself" },
  { id: "h5", when: "Today, 08:12", did: "Put the WhatsApp number in your inbox: offline since 08:10", with: "Itself" },
  { id: "h6", when: "24 Nov, 09:20", did: "Gave Pat Reyes’s mail to Support, who handed it to Coding", with: "Itself" },
  { id: "h7", when: "23 Nov, 14:20", did: "Made version 6 of Sales", with: "Bo Larsen", undo: "Go back to version 5" },
  { id: "h8", when: "23 Nov, 07:00", did: "Looked at every manager’s week, and began to try 1 change", with: "Itself", undo: "Stop trying" },
  { id: "h9", when: "21 Nov, 09:02", did: "Made version 7 of Coding: it asks what done means first", with: "Ama Mensah", undo: "Go back to version 6" },
  { id: "h10", when: "18 Nov, 11:15", did: "Made Releases, from the template Cut releases", with: "Ama Mensah" },
  { id: "h11", when: "12 Nov, 16:40", did: "Changed its own soul, after you accepted the suggestion", with: "Ama Mensah", undo: "Go back to old soul" },
];
