import { conversation, inn, out } from "./connectors-kit.ts";
import { at, read, type Fixture } from "./read.ts";

/* Support's WhatsApp, as the desk's number sees it. The number went offline at 08:10: nothing came in after, and what the desk wrote after is not sent. */

const DESK = "WhatsApp desk";
const efua = conversation({
  id: "efua",
  with: "Efua Sarpong",
  address: "+233 20 555 0142",
  preview: "Thank you. I am arranging a new hinge for the H2.",
  when: "25 Nov 08:13",
  unread: 1,
  waits: "us",
  last: "unsent",
});

const CHATS = [
  efua,
  conversation({
    id: "kofi",
    with: "Kofi Boateng",
    address: "+233 24 555 0117",
    preview: "Yes, I have changed the address to your office. It still arrives today.",
    when: "25 Nov 08:12",
    unread: 1,
    waits: "us",
    last: "unsent",
  }),
  conversation({
    id: "crew",
    with: "Aarhus pickup crew",
    address: "group:aarhus-pickup",
    preview: "Yes, from 08:00 to 13:00.",
    when: "25 Nov 08:12",
    unread: 2,
    waits: "us",
    last: "unsent",
    group: 14,
  }),
  conversation({
    id: "refund",
    with: "+233 24 555 0190",
    address: "+233 24 555 0190",
    preview: "Hello? Any news?",
    when: "25 Nov 08:02",
    unread: 1,
    waits: "person",
    saved: false,
  }),
  conversation({
    id: "esi",
    with: "Esi Quaye",
    address: "+233 50 555 0163",
    preview: "Understood. We will not message you again.",
    when: "25 Nov 07:14",
    waits: "done",
    last: "ours",
    stopped: true,
  }),
  conversation({
    id: "abena",
    with: "Abena Owusu",
    address: "+233 27 555 0108",
    preview: "Thank you!",
    when: "25 Nov 06:52",
    waits: "done",
  }),
  conversation({
    id: "yaw",
    with: "Yaw Darko",
    address: "+233 55 555 0171",
    preview: "Fixed: the reports now use your time zone. Thank you for telling us.",
    when: "25 Nov 06:02",
    waits: "done",
    last: "ours",
    work: ["ACME-411", "Timezone off by one in reports"],
  }),
];

const PHONE = "+233 20 555 0142";
export const WHATSAPP: Fixture = read(
  "/m/:manager/connectors/whatsapp",
  { manager: "support" },
  { number: "+44 7700 900123", works: false, since: at("25 Nov 08:10"), conversations: CHATS },
);
export const WHATSAPP_DESK: Fixture = read(
  "/m/:manager/connectors/whatsapp",
  { manager: "whatsapp" },
  { number: "+44 7700 900123", works: false, since: at("25 Nov 08:10"), conversations: CHATS },
);
export const WHATSAPP_OPEN: Fixture = read(
  "/m/:manager/connectors/whatsapp/:conversation",
  { manager: "whatsapp", conversation: "efua" },
  {
    conversation: efua,
    stream: [
      inn("e1", "25 Nov 07:52", "Efua Sarpong", PHONE, "This hinge snapped on the second day.", [
        { name: "hinge.jpg", link: "/files/hinge.jpg" },
      ]),
      out("e2", "25 Nov 07:53", DESK, "Thank you for the photo. Which model is it?"),
      inn("e3", "25 Nov 08:08", "Efua Sarpong", PHONE, "The H2."),
      out("e4", "25 Nov 08:13", DESK, "Thank you. I am arranging a new hinge for the H2.", false, false),
    ],
  },
);
