import type { Line } from "./types";

export type ChatState = "waiting" | "person" | "done";
export interface Chat {
  readonly id: string; readonly name: string; readonly about: string; readonly state: ChatState; readonly unread: number;
  readonly lines: readonly Line[]; readonly isGroup?: boolean; readonly stopped?: boolean;
  /** The work this chat became, where there is one. */
  readonly work?: { readonly id: string; readonly title: string };
}
export const FILTERS = [{ id: "all", label: "All" }, { id: "waiting", label: "Waiting for us" }, { id: "person", label: "With a person" }, { id: "done", label: "Done" }] as const;
export type FilterId = (typeof FILTERS)[number]["id"];

const m = (id: string, side: "them" | "me", time: string, text: string, more: { name?: string; photo?: string; by?: string; unsent?: boolean } = {}): Line =>
  ({ kind: "msg", id, side, time, text, ...more }) as Line;
const n = (id: string, text: string, link?: { label: string; to: string }): Line => ({ kind: "note", id, text, ...(link ? { link } : {}) });

/** The number went offline at 08:10, so nothing below came in after that, and what the desk wrote after is not sent. */
export const CHATS: readonly Chat[] = [
  { id: "efua", name: "Efua Sarpong", about: "+233 20 555 0142", state: "waiting", unread: 1, lines: [
    m("e1", "them", "07:52", "This hinge snapped on the second day.", { name: "Efua Sarpong", photo: "hinge.jpg" }),
    m("e2", "me", "07:53", "Thank you for the photo. Which model is it?", { by: "WhatsApp desk" }),
    m("e3", "them", "08:08", "The H2.", { name: "Efua Sarpong" }),
    m("e4", "me", "08:13", "Thank you. I am arranging a new hinge for the H2.", { by: "WhatsApp desk", unsent: true }),
  ] },
  { id: "kofi", name: "Kofi Boateng", about: "+233 24 555 0117", state: "waiting", unread: 1, lines: [
    m("k1", "them", "08:04", "Hi, where is my order 4821?", { name: "Kofi Boateng" }),
    m("k2", "me", "08:05", "Hello Kofi. It left the depot yesterday and arrives today before 17:00.", { by: "WhatsApp desk" }),
    m("k3", "them", "08:09", "Great. Can it go to my office instead? Same town.", { name: "Kofi Boateng" }),
    m("k4", "me", "08:12", "Yes, I have changed the address to your office. It still arrives today.", { by: "WhatsApp desk", unsent: true }),
  ] },
  { id: "crew", name: "Aarhus pickup crew", about: "Group, 14 people", state: "waiting", unread: 2, isGroup: true, lines: [
    n("c0", "The desk answers in this group only when its name is used."),
    m("c1", "them", "07:30", "Depot gate is blocked again.", { name: "Kwame Asare" }),
    m("c2", "them", "07:31", "Use the side road.", { name: "Naa Lamptey" }),
    m("c3", "them", "07:33", "@Juno what time does the depot open?", { name: "Kwame Asare" }),
    m("c4", "me", "07:33", "From 08:00, Monday to Saturday.", { by: "WhatsApp desk" }),
    m("c5", "them", "08:07", "Bringing the vans at 9.", { name: "Naa Lamptey" }),
    m("c6", "them", "08:08", "@Juno is it open this Saturday?", { name: "Kwame Asare" }),
    m("c7", "me", "08:12", "Yes, from 08:00 to 13:00.", { by: "WhatsApp desk", unsent: true }),
  ] },
  { id: "refund", name: "+233 24 555 0190", about: "Number not saved", state: "person", unread: 1, lines: [
    m("r1", "them", "07:38", "The kettle I got on Monday has a crack. I want my money back.", { name: "+233 24 555 0190" }),
    m("r2", "me", "07:39", "I am sorry about that. A refund needs a person to approve it, so I have asked one. You will hear today.", { by: "WhatsApp desk" }),
    n("r3", "Waiting for a person to approve the refund"),
    m("r4", "them", "08:02", "Hello? Any news?", { name: "+233 24 555 0190" }),
  ] },
  { id: "esi", name: "Esi Quaye", about: "+233 50 555 0163", state: "done", unread: 0, stopped: true, lines: [
    m("s1", "them", "07:14", "STOP", { name: "Esi Quaye" }),
    m("s2", "me", "07:14", "Understood. We will not message you again.", { by: "WhatsApp desk" }),
    n("s3", "Esi Quaye asked us to stop. Nothing more is sent to this chat."),
  ] },
  { id: "abena", name: "Abena Owusu", about: "+233 27 555 0108", state: "done", unread: 0, lines: [
    m("a1", "them", "06:50", "Is the blue one back in stock?", { name: "Abena Owusu" }),
    m("a2", "me", "06:51", "Yes, it is back in stock.", { by: "WhatsApp desk" }),
    m("a3", "them", "06:52", "Thank you!", { name: "Abena Owusu" }),
  ] },
  { id: "yaw", name: "Yaw Darko", about: "+233 55 555 0171", state: "done", unread: 0, work: { id: "ACME-411", title: "Timezone off by one in reports" }, lines: [
    m("y1", "them", "05:31", "My reports show yesterday's date for orders I took after midnight.", { name: "Yaw Darko" }),
    m("y2", "me", "05:32", "That looks like a bug in the reports, not something on your side. I am handing it to Support.", { by: "WhatsApp desk" }),
    n("y3", "Handed to Support"),
    n("y4", "Became ACME-411", { label: "ACME-411", to: "m-coding-board" }),
    m("y5", "me", "06:02", "Fixed: the reports now use your time zone. Thank you for telling us.", { by: "Support" }),
  ] },
];
