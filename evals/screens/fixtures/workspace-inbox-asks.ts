import type { InboxItem } from "~/modules/views-workspace/types.ts";
import { item, opt } from "./workspace-inbox-kit.ts";

/* What waits for Ama. */
export const NODE: InboxItem = item(
  {
    id: "acme-398",
    to: "ama",
    manager: "coding",
    work: "ACME-398",
    need: "decide",
    title: "Drop Node 18: merge now, or wait for v3?",
    came: "22 Nov 10:00",
    question:
      "Coding wants to stop supporting Node 18 in acme/web. One customer still builds on it, and their build breaks the day this is merged. Merge now, or wait for v3, which drops Node 18 anyway?",
    why: "It has waited 3 days, and Coding cannot go on with the other upkeep until this is decided.",
    options: [
      opt("wait", "Wait for v3", "Coding is told to wait for v3, and to tell the customer."),
      opt("now", "Merge now", "Coding is told to merge ACME-398 now."),
    ],
  },
  {
    from: "Coding",
    preview: "ACME-398 breaks one customer’s build",
    standing: "asks",
    isNew: true,
    looked: [
      "Who still builds on Node 18: one customer, found in Support’s mail",
      "Node 18 gets no security fixes any more",
      "v3 drops Node 18 as well, so waiting costs one release",
    ],
    otherwise: "Coding waits for v3. It asks again on Friday 27 Nov.",
    links: [{ label: "ACME-398 on Coding’s board", link: "/m/coding/board" }],
  },
);
export const RELEASE: InboxItem = item(
  {
    id: "v23",
    to: "ama",
    manager: "releases",
    work: "ACME-412",
    need: "decide",
    title: "Cut v2.3 tomorrow without the 150k fix?",
    came: "25 Nov 09:20",
    by: "25 Nov 17:00",
    question:
      "Releases plans to cut v2.3 tomorrow, Thursday 26 Nov. The fix for exports over 150,000 rows (ACME-412) is not merged yet. Cut without it, or hold v2.3 until it is in?",
    why: "The release is planned for tomorrow. Without the fix, Northwind’s Monday export of 212,000 rows stays short until the next release, on 10 Dec.",
    options: [
      opt("hold", "Hold v2.3 for the fix", "Releases is told to hold v2.3 until ACME-412 is merged."),
      opt("cut", "Cut v2.3 without it", "Releases is told to cut v2.3 tomorrow, without the fix."),
    ],
  },
  {
    from: "Releases",
    preview: "ACME-412 is not merged yet",
    standing: "asks",
    isNew: true,
    looked: [
      "ACME-412: 3 of 5 done-when met. Left: the review comments, and telling Pat Reyes",
      "Pull request #418: CI passed, 1 comment still open",
      "v2.3: 3 of 5 steps done",
    ],
    otherwise: "At 17:00 today Releases cuts v2.3 tomorrow without the fix, as planned.",
    links: [
      { label: "ACME-412", link: "/m/coding/work/ACME-412" },
      { label: "Coding’s board", link: "/m/coding/board" },
    ],
  },
);
export const WHATSAPP: InboxItem = item(
  {
    id: "whatsapp",
    to: "ama",
    manager: "whatsapp",
    need: "do",
    title: "Scan the WhatsApp number again",
    came: "25 Nov 08:12",
    question:
      "The WhatsApp number has been offline since 08:10. It lost its link to the phone, and only a person can link it again: scan the code in WhatsApp desk’s connector with the phone that holds the number.",
    why: "About 13 customers write on WhatsApp each day, and none gets an answer while it is offline. Support’s answer time is already 3.1 hours, and its aim is 2.",
    options: [opt("scan", "Open the code", ""), opt("done", "I scanned it", "WhatsApp desk is told, and checks the number now.")],
  },
  {
    from: "WhatsApp desk",
    preview: "Offline since 08:10. A person must scan it",
    standing: "asks",
    isNew: true,
    looked: [
      "When it dropped: 08:10, with no error from WhatsApp",
      "Retried every 10 minutes since, and failed each time",
      "No other connector can answer for it",
    ],
    otherwise: "Nothing goes out on WhatsApp. The desk keeps retrying, and tells you again at 12:00.",
    links: [{ label: "WhatsApp desk’s connector", link: "/m/whatsapp/connectors/whatsapp" }],
    beside: { scan: { is: "open", link: "/m/whatsapp/connectors/whatsapp" } },
  },
);
