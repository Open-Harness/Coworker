import type { GeneralView, MeView, MembersView } from "~/modules/views-workspace/types.ts";
import { AMA, BO, CHIDI } from "./workspace-people.ts";
import { at, read, type Fixture } from "./read.ts";

export const GENERAL: GeneralView = {
  name: "Acme",
  address: "acme",
  zone: "Europe/Copenhagen",
  perDay: 100,
  tellAt: 80,
  mayMake: false,
  mayTry: true,
  mayJoin: true,
};

export const MEMBERS: MembersView = {
  people: [
    {
      ...AMA,
      mails: ["ama@acme.co"],
      known: [
        { connector: "github", as: "ama-m" },
        { connector: "slack", as: "@ama" },
        { connector: "whatsapp", as: "" },
      ],
      lastSeen: at("25 Nov 09:54"),
    },
    {
      ...BO,
      mails: ["bo@acme.co"],
      known: [
        { connector: "slack", as: "@bo" },
        { connector: "crm", as: "Bo Larsen" },
      ],
      lastSeen: at("25 Nov 08:40"),
    },
    {
      ...CHIDI,
      mails: ["chidi@acme.co"],
      known: [
        { connector: "github", as: "chidi-o" },
        { connector: "slack", as: "@chidi" },
      ],
      lastSeen: at("24 Nov 16:30"),
    },
  ],
  invited: [{ id: "ngozi", name: "Ngozi Eze", mail: "ngozi@acme.co", role: "Member", at: at("22 Nov 15:08"), until: at("6 Dec 15:08") }],
  wantIn: [{ id: "dana", name: "Dana Whitfield", mail: "dana@acme.co", at: at("24 Nov 16:12") }],
};

export const ME: MeView = {
  name: "Ama Mensah",
  mails: [
    { mail: "ama@acme.co", proven: true },
    { mail: "ama.mensah@northcote.example", proven: false },
  ],
  zone: "Europe/Copenhagen",
  tell: { waits: ["inbox", "mail"], wrong: ["inbox", "mail", "slack"], done: ["inbox"], propose: ["inbox"], week: ["inbox", "mail"] },
  weekAt: { day: 1, at: "07:30" },
  quiet: { from: "20:00", to: "07:00", unlessWrong: true },
  ways: [
    { id: "mail", about: "To ama@acme.co" },
    { id: "google", about: "ama@acme.co" },
    { id: "github", about: "ama-m" },
  ],
  sessions: [
    { id: "now", says: "This browser, Copenhagen", at: at("25 Nov 09:54"), here: true },
    { id: "phone", says: "Phone, Copenhagen", at: at("25 Nov 07:58"), here: false },
    { id: "old", says: "Another browser, Aarhus", at: at("19 Nov 10:00"), here: false },
  ],
};

export const PEOPLE_PAGES: readonly Fixture[] = [
  read("/settings/general", {}, GENERAL),
  read("/settings/members", {}, MEMBERS),
  read("/settings/me", {}, ME),
];
