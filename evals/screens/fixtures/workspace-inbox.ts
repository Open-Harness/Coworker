import type { InboxItem } from "~/modules/views-workspace/types.ts";
import { NODE, RELEASE, WHATSAPP } from "./workspace-inbox-asks.ts";
import { answered, item, opt } from "./workspace-inbox-kit.ts";
import { read, type Fixture } from "./read.ts";

/* What waits for others, what is to know, and what is done. */
const HARBOR: InboxItem = item(
  {
    id: "harbor-foods",
    to: "bo",
    manager: "sales",
    need: "approve",
    title: "Write to Harbor Foods",
    came: "25 Nov 08:35",
    by: "9 Dec 09:00",
    question:
      "Sales found that Harbor Foods opened a site in Ghent on 19 Nov, and drafted one mail to its head of operations. Sending asks Bo, because this kind of work is set to ask.",
    why: "It has waited 1 hour 19 minutes. More calls with companies that fit is the objective: 1.5 a week now, aim 2.",
    options: [
      opt("remind", "Remind Bo", "Bo is reminded about Harbor Foods."),
      opt("yes", "Say yes myself", "Sales is told yes, and sends the mail."),
    ],
  },
  {
    from: "Sales",
    preview: "Waits for Bo. Opened a site in Ghent on 19 Nov",
    standing: "waits",
    looked: [
      "The sign: a new site, read on the company’s own page",
      "The CRM: Harbor Foods is a target account, and nobody wrote to it yet",
      "The draft, read fresh by a second thread",
    ],
    otherwise: "If nobody answers by 9 Dec, the mail is dropped, with the reason.",
    links: [{ label: "Harbor Foods in Sales’ intake", link: "/m/sales/intake" }],
    beside: { remind: { is: "remind" } },
  },
);
const REVIEW413: InboxItem = item(
  {
    id: "pr-413",
    to: "chidi",
    manager: "coding",
    work: "ACME-404",
    need: "review",
    title: "Chidi reviews #413",
    came: "23 Nov 11:00",
    question:
      "Chidi reviews pull request #413, the rate limit on the public API. Coding asked twice about the limit per key and has no answer yet.",
    why: "It has waited 2 days, and nothing else on ACME-404 can move until the review is done.",
    options: [
      opt("remind", "Remind Chidi", "Chidi is reminded about #413."),
      opt("stop", "Take it off my list", "Coding goes on asking Chidi, and no longer tells you."),
    ],
  },
  {
    from: "Coding",
    preview: "Waits for Chidi. ACME-404, rate limit on the API",
    standing: "waits",
    looked: ["The pull request: CI passed", "Chidi’s open reviews: 1, this one", "Coding asked on GitHub on Mon and again on Tue"],
    otherwise: "Coding asks Chidi again each day. On Sat 28 Nov it asks you for another reviewer.",
    links: [{ label: "Coding’s board", link: "/m/coding/board" }],
    beside: { remind: { is: "remind" } },
  },
);
const SIGNS: InboxItem = item(
  {
    id: "look-for-signs",
    to: "ama",
    manager: "sales",
    need: "know",
    title: "Look for signs: a site at its own address",
    came: "25 Nov 09:30",
    question:
      "Juno proposes that a new site counts as a sign only at its own address. Today any new site does. Nothing changes until someone says yes.",
    why: "It is the weakest part this week: 68% of what it found became work (19 of 28). On the same past cases the new way gets 86%: it leaves 6 that were only a new page.",
    options: [
      opt("accept", "Accept", "Saved as version 7. 4 open pieces of work were told."),
      opt("look", "Look at the cases", ""),
      opt("leave", "Leave it", "Look for signs stays as it is."),
    ],
  },
  {
    from: "Juno",
    preview: "Juno proposes a change to Sales",
    standing: "know",
    proposes: true,
    isNew: true,
    looked: [
      "The 28 past cases, run beside the old way",
      "New way: finds 22, and all 19 that became work are among them",
      "It changes what counts as a sign, so it asks",
    ],
    otherwise: "Nothing changes. Juno looks again next week.",
    links: [{ label: "Sales’ evals", link: "/m/sales/playbook/evals" }],
    beside: { look: { is: "open", link: "/m/sales/playbook/evals" } },
  },
);
const V7: InboxItem = item(
  {
    id: "coding-v7",
    to: "ama",
    manager: "coding",
    need: "know",
    title: "Coding version 7 kept",
    came: "21 Nov 09:10",
    question: "Juno tried version 7 of Coding beside version 6 on past work, and kept it. You do not need to do anything.",
    why: "Work sent back fell by 6 points, to 11%. Juno may keep a change by itself when it is better and nothing else got worse.",
    options: [opt("got", "Got it", "Marked as done.")],
  },
  {
    from: "Juno",
    preview: "Fewer pieces of work sent back",
    standing: "know",
    isNew: true,
    looked: [
      "The same cases, run with each version",
      "Sent back: 11% now, 17% before",
      "Must not get worse: time to a merge, cost per fix",
    ],
    otherwise: "Nothing. It stays in use, and you can go back to version 6, as a new version.",
    links: [{ label: "Coding’s overview", link: "/m/coding" }],
  },
);
const PAT_ANSWER: InboxItem = item(
  {
    id: "pat-reyes",
    to: "ama",
    manager: "sales",
    need: "know",
    title: "Pat Reyes answered",
    came: "24 Nov 15:30",
    question:
      "Pat Reyes at Northwind answered Sales: Thursday works, and 25 people use the export. Sales has asked for 14:00 and sends the invite once Pat confirms.",
    why: "Pat is the one who found the export bug in ACME-412, and is also looking at a 25-seat team plan.",
    options: [opt("got", "Got it", "Marked as done.")],
  },
  {
    from: "Sales",
    preview: "Northwind: Thursday works",
    standing: "know",
    isNew: true,
    looked: ["The CRM: team plan, 25 seats, source the form on the site", "Sales’ mail of 09:31 today, which asks for Thursday at 14:00"],
    otherwise: "Nothing. Sales follows up on its own.",
    links: [{ label: "Northwind in the CRM", link: "/m/sales/connectors/crm" }],
  },
);
const MERGED: InboxItem = item(
  {
    id: "merge-414",
    to: "ama",
    manager: "coding",
    need: "approve",
    title: "Merge #414, the timezone fix?",
    came: "25 Nov 06:10",
    state: answered("Merge it", "25 Nov 06:10"),
    question: "Coding asked to merge pull request #414, which fixes a report that was off by one day in some timezones.",
    why: "Two customers had written to Support.",
    options: [],
  },
  {
    from: "Coding",
    preview: "You said yes, merged at 06:10",
    standing: "done",
    looked: ["CI passed", "The fix was read fresh by a second thread"],
    otherwise: "",
    links: [{ label: "Coding’s board", link: "/m/coding/board" }],
  },
);
const TRY_V5: InboxItem = item(
  {
    id: "support-v5",
    to: "ama",
    manager: "support",
    need: "approve",
    title: "Try version 5 of Support on past mail",
    came: "24 Nov 17:20",
    state: answered("Try it", "24 Nov 17:20"),
    question: "Juno asked to try version 5 of Support on past mail, beside version 4, before anything goes live.",
    why: "Support’s answer time was above its line.",
    options: [],
  },
  {
    from: "Juno",
    preview: "You said yes yesterday at 17:20",
    standing: "done",
    looked: ["Last month’s mail, 40 cases", "The change: shorter first answers"],
    otherwise: "",
    links: [{ label: "Support’s overview", link: "/m/support" }],
  },
);

export const INBOX: readonly Fixture[] = [
  read("/inbox", {}, { items: [NODE, RELEASE, WHATSAPP, HARBOR, REVIEW413, SIGNS, V7, PAT_ANSWER, MERGED, TRY_V5] }),
];
