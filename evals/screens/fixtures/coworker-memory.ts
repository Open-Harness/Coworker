import type { MayDo, Part } from "~/modules/coworker/types.ts";
import type { Note } from "~/modules/knowledge/types.ts";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { at } from "./read.ts";

/* What Juno was told and keeps, what it may do as itself, how its money is handed out, and what it did. */
const note = (id: string, says: string, by: string, where: string, told: string, used: string, more: Partial<Note> = {}): Note => ({
  id,
  says,
  by,
  where,
  at: at(told),
  tell: "when it fits",
  used: at(used),
  state: "kept",
  ...more,
});
const forManager = (manager: string, tree = false): Pick<Note, "for"> => ({ for: { manager, tree } });

export const MEMORY: readonly Note[] = [
  note(
    "n1",
    "Releases go out every second Thursday at 14:00, and customers hear the same day.",
    "Ama Mensah",
    "Here, a chat",
    "18 Nov 11:00",
    "25 Nov 09:05",
    forManager("releases"),
  ),
  note("n2", "No mail to a new lead before 09:00.", "Bo Larsen", "Slack, DM", "2 Nov 10:00", "24 Nov 11:02", forManager("sales")),
  note(
    "n3",
    "Northwind exports 212,000 rows every Monday.",
    "Pat Reyes",
    "Mail, SUP-88",
    "24 Nov 09:20",
    "25 Nov 09:31",
    forManager("support"),
  ),
  note(
    "n4",
    "Chidi reviews anything about the public API.",
    "Chidi Okafor",
    "GitHub, #413",
    "20 Nov 14:00",
    "24 Nov 10:56",
    forManager("coding"),
  ),
  note("n5", "Lena Fischer writes in German.", "Lena Fischer", "WhatsApp", "11 Nov 12:00", "25 Nov 08:02", forManager("whatsapp")),
  note("n6", "Say prices only if they are on the site.", "Ama Mensah", "Here, a chat", "5 Oct 16:20", "23 Nov 10:00", {
    ...forManager("root", true),
    tell: "always",
  }),
  note("n7", "Bo wants the week on Monday, before 08:00.", "Bo Larsen", "Slack, #sales", "9 Nov 09:00", "25 Nov 08:30"),
  note(
    "n8",
    "Dropping Node 18 breaks one customer. Ask before it merges.",
    "Ama Mensah",
    "Here, a chat",
    "22 Nov 10:00",
    "25 Nov 09:20",
    forManager("coding"),
  ),
];

export const CORRECTIONS: CoworkerView["corrections"] = [
  {
    id: "c1",
    note: "n2",
    was: "No mail to a new lead before 09:00.",
    now: "No mail to a new lead before 08:30.",
    by: "Bo Larsen",
    where: "Slack, #sales",
    at: at("25 Nov 08:52"),
  },
  {
    id: "c2",
    note: "n3",
    was: "Northwind exports 212,000 rows every Monday.",
    now: "Northwind exports about 230,000 rows every Monday.",
    by: "Pat Reyes",
    where: "Mail, SUP-88",
    at: at("25 Nov 09:12"),
  },
];

const may = (doing: string, label: string, group: string, is: MayDo["is"], from: string): MayDo => ({ doing, label, group, is, from });
const CONSOLE = "On this console";
export const MAY: readonly MayDo[] = [
  may("manager.create", "Make a new manager", CONSOLE, "ask", "Settings, General"),
  may("manager.try", "Try a change to a manager, on past work", CONSOLE, "on", "Settings, General"),
  may("version.make", "Make a version of a playbook", CONSOLE, "ask", "You said, 12 Nov"),
  may("manager.pause", "Pause a manager that is stuck", CONSOLE, "on", "Starting point"),
  may("manager.retire", "Retire a manager", CONSOLE, "off", "Starting point"),
  may("limit.change", "Change a limit", CONSOLE, "off", "Starting point"),
  may("inbox.write", "Write to your inbox", CONSOLE, "on", "Starting point"),
  may("slack.post", "Post in Slack", "Outside", "on", "You said, 14 Sep"),
  may("github.comment", "Comment on GitHub", "Outside", "on", "You said, 14 Sep"),
  may("email.send", "Send mail as juno@acme.co-worker.tech", "Outside", "ask", "Starting point"),
  may("whatsapp.answer", "Answer on WhatsApp", "Outside", "ask", "Starting point"),
  may("money.send", "Send money", "Outside", "off", "Soul, never"),
];

const part = (manager: string, whole: number, used: number, perWork: number): Part => ({ manager, part: whole, used, perWork });
export const SPENDING: CoworkerView["spending"] = {
  whole: 100,
  tellAt: 80,
  parts: [
    part("root", 5, 2, 15),
    part("coding", 30, 21.1, 20),
    part("docs", 5, 1.7, 5),
    part("releases", 5, 1.3, 10),
    part("support", 20, 13.7, 5),
    part("whatsapp", 10, 5.4, 2),
    part("sales", 25, 7.4, 10),
  ],
};

type Done = CoworkerView["history"][number];
const did = (id: string, when: string, says: string, who: string | null, undo: string | null, link: string | null = null): Done => ({
  id,
  at: at(when),
  says,
  with: who,
  permission: "on",
  undo: undo === null ? "cannot" : "can",
  link,
  undoLabel: undo,
});
export const HISTORY: readonly Done[] = [
  did("h1", "25 Nov 09:52", "Started to try version 5 of Support on 40 past mails", null, "Stop trying", "/m/support"),
  did("h2", "25 Nov 09:31", "Answered Why is Support slower, and began the note to the team", "Ama Mensah", null, "/chats/support"),
  did("h3", "25 Nov 09:05", "Asked Bo in #releases about v2.3 without the 150k fix", null, null, "/chats/v23"),
  did("h4", "25 Nov 08:30", "Said what needs a person: 3 things, in your inbox", null, null, "/inbox"),
  did("h5", "25 Nov 08:12", "Put the WhatsApp number in your inbox: offline since 08:10", null, null, "/inbox"),
  did("h6", "24 Nov 09:20", "Gave Pat Reyes’s mail to Support, who handed it to Coding", null, null),
  did("h7", "23 Nov 14:20", "Made version 6 of Sales", "Bo Larsen", "Go back to version 5", "/m/sales/playbook"),
  did("h8", "23 Nov 07:00", "Looked at every manager’s week, and began to try 1 change", null, "Stop trying"),
  did(
    "h9",
    "21 Nov 09:02",
    "Made version 7 of Coding: it asks what done means first",
    "Ama Mensah",
    "Go back to version 6",
    "/m/coding/playbook",
  ),
  did("h10", "18 Nov 11:15", "Made Releases, from the template Cut releases", "Ama Mensah", null, "/m/releases"),
  did("h11", "12 Nov 16:40", "Changed its own soul, after you accepted the suggestion", "Ama Mensah", "Go back to old soul", "/juno/soul"),
];
