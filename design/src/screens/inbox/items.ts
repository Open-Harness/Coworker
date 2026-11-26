import type { Item } from "./data";

/** What waits at 09:54 on Wednesday 25 Nov. Names and numbers agree with world.ts and sales.ts. */
export const ITEMS: Item[] = [
  {
    id: "acme-398", from: "Coding", title: "Drop Node 18: merge now, or wait for v3?", preview: "ACME-398 breaks one customer’s build", at: "Sun", standing: "ask", isNew: true,
    asks: "Coding wants to stop supporting Node 18 in acme/web. One customer still builds on it, and their build breaks the day this is merged. Merge now, or wait for v3, which drops Node 18 anyway?",
    why: "It has waited 3 days, and Coding cannot go on with the other upkeep until this is decided.",
    looked: ["Who still builds on Node 18: one customer, found in Support’s mail", "Node 18 gets no security fixes any more", "v3 drops Node 18 as well, so waiting costs one release"],
    options: [
      { id: "wait", label: "Wait for v3", told: "Coding is told to wait for v3, and to tell the customer." },
      { id: "now", label: "Merge now", told: "Coding is told to merge ACME-398 now." },
    ],
    otherwise: "Coding waits for v3. It asks again on Friday 27 Nov.",
    links: [{ label: "ACME-398 on Coding’s board", to: "m-coding-board" }],
  },
  {
    id: "v23", from: "Releases", title: "Cut v2.3 tomorrow without the 150k fix?", preview: "ACME-412 is not merged yet", at: "09:20", standing: "ask", isNew: true,
    asks: "Releases plans to cut v2.3 tomorrow, Thursday 26 Nov. The fix for exports over 150,000 rows (ACME-412) is not merged yet. Cut without it, or hold v2.3 until it is in?",
    why: "The release is planned for tomorrow. Without the fix, Northwind’s Monday export of 212,000 rows stays short until the next release, on 10 Dec.",
    looked: ["ACME-412: 3 of 5 done-when met. Left: the review comments, and telling Pat Reyes", "Pull request #418: CI passed, 1 comment still open", "v2.3: 3 of 5 steps done"],
    options: [
      { id: "hold", label: "Hold v2.3 for the fix", told: "Releases is told to hold v2.3 until ACME-412 is merged." },
      { id: "cut", label: "Cut v2.3 without it", told: "Releases is told to cut v2.3 tomorrow, without the fix." },
    ],
    otherwise: "At 17:00 today Releases cuts v2.3 tomorrow without the fix, as planned.",
    links: [{ label: "ACME-412", to: "task" }, { label: "Coding’s board", to: "m-coding-board" }],
  },
  {
    id: "whatsapp", from: "WhatsApp desk", title: "Scan the WhatsApp number again", preview: "Offline since 08:10. A person must scan it", at: "08:12", standing: "ask", isNew: true,
    asks: "The WhatsApp number has been offline since 08:10. It lost its link to the phone, and only a person can link it again: scan the code in WhatsApp desk’s connector with the phone that holds the number.",
    why: "About 13 customers write on WhatsApp each day, and none gets an answer while it is offline. Support’s answer time is already 3.1 hours, and its aim is 2.",
    looked: ["When it dropped: 08:10, with no error from WhatsApp", "Retried every 10 minutes since, and failed each time", "No other connector can answer for it"],
    options: [
      { id: "scan", label: "Open the code", told: "", go: "m-whatsapp-connectors-whatsapp" },
      { id: "done", label: "I scanned it", told: "WhatsApp desk is told, and checks the number now." },
    ],
    otherwise: "Nothing goes out on WhatsApp. The desk keeps retrying, and tells you again at 12:00.",
    links: [{ label: "WhatsApp desk’s connector", to: "m-whatsapp-connectors-whatsapp" }],
  },
  {
    id: "harbor-foods", from: "Sales", title: "Write to Harbor Foods", preview: "Waits for Bo. Opened a site in Ghent on 19 Nov", at: "08:35", standing: "wait", waitsFor: "Bo", isNew: false,
    asks: "Sales found that Harbor Foods opened a site in Ghent on 19 Nov, and drafted one mail to its head of operations. Sending asks Bo, because this kind of work is set to ask.",
    why: "It has waited 1 hour 19 minutes. More calls with companies that fit is the objective: 1.5 a week now, aim 2.",
    looked: ["The sign: a new site, read on the company’s own page", "The CRM: Harbor Foods is a target account, and nobody wrote to it yet", "The draft, read fresh by a second thread"],
    options: [
      { id: "remind", label: "Remind Bo", told: "Bo is reminded about Harbor Foods.", keeps: true },
      { id: "yes", label: "Say yes myself", told: "Sales is told yes, and sends the mail." },
    ],
    otherwise: "If nobody answers by 9 Dec, the mail is dropped, with the reason.",
    links: [{ label: "Harbor Foods in Sales’ intake", to: "m-sales-intake-i1" }],
  },
  {
    id: "pr-413", from: "Coding", title: "Chidi reviews #413", preview: "Waits for Chidi. ACME-404, rate limit on the API", at: "Mon", standing: "wait", waitsFor: "Chidi", isNew: false,
    asks: "Chidi reviews pull request #413, the rate limit on the public API. Coding asked twice about the limit per key and has no answer yet.",
    why: "It has waited 2 days, and nothing else on ACME-404 can move until the review is done.",
    looked: ["The pull request: CI passed", "Chidi’s open reviews: 1, this one", "Coding asked on GitHub on Mon and again on Tue"],
    options: [
      { id: "remind", label: "Remind Chidi", told: "Chidi is reminded about #413.", keeps: true },
      { id: "stop", label: "Take it off my list", told: "Coding goes on asking Chidi, and no longer tells you." },
    ],
    otherwise: "Coding asks Chidi again each day. On Sat 28 Nov it asks you for another reviewer.",
    links: [{ label: "Coding’s board", to: "m-coding-board" }],
  },
  {
    id: "look-for-signs", from: "Juno", title: "Look for signs: a site at its own address", preview: "Juno proposes a change to Sales", at: "09:30", standing: "know", isProposal: true, isNew: true,
    asks: "Juno proposes that a new site counts as a sign only at its own address. Today any new site does. Nothing changes until someone says yes.",
    why: "It is the weakest part this week: 68% of what it found became work (19 of 28). On the same past cases the new way gets 86%: it leaves 6 that were only a new page.",
    looked: ["The 28 past cases, run beside the old way", "New way: finds 22, and all 19 that became work are among them", "It changes what counts as a sign, so it asks"],
    options: [
      { id: "accept", label: "Accept", told: "Saved as version 7. 4 open pieces of work were told." },
      { id: "look", label: "Look at the cases", told: "", go: "m-sales-playbook-evals" },
      { id: "leave", label: "Leave it", told: "Look for signs stays as it is." },
    ],
    otherwise: "Nothing changes. Juno looks again next week.",
    links: [{ label: "Sales’ evals", to: "m-sales-playbook-evals" }],
  },
  {
    id: "coding-v7", from: "Juno", title: "Coding version 7 kept", preview: "Fewer pieces of work sent back", at: "21 Nov", standing: "know", isNew: true,
    asks: "Juno tried version 7 of Coding beside version 6 on past work, and kept it. You do not need to do anything.",
    why: "Work sent back fell by 6 points, to 11%. Juno may keep a change by itself when it is better and nothing else got worse.",
    looked: ["The same cases, run with each version", "Sent back: 11% now, 17% before", "Must not get worse: time to a merge, cost per fix"],
    options: [{ id: "got", label: "Got it", told: "Marked as done." }],
    otherwise: "Nothing. It stays in use, and you can go back to version 6, as a new version.",
    links: [{ label: "Coding’s overview", to: "m-coding-overview" }],
  },
  {
    id: "pat-reyes", from: "Sales", title: "Pat Reyes answered", preview: "Northwind: Thursday works", at: "Yesterday", standing: "know", isNew: true,
    asks: "Pat Reyes at Northwind answered Sales: Thursday works, and 25 people use the export. Sales has asked for 14:00 and sends the invite once Pat confirms.",
    why: "Pat is the one who found the export bug in ACME-412, and is also looking at a 25-seat team plan.",
    looked: ["The CRM: team plan, 25 seats, source the form on the site", "Sales’ mail of 09:31 today, which asks for Thursday at 14:00"],
    options: [{ id: "got", label: "Got it", told: "Marked as done." }],
    otherwise: "Nothing. Sales follows up on its own.",
    links: [{ label: "Northwind in the CRM", to: "m-sales-connectors-crm" }],
  },
  {
    id: "merge-414", from: "Coding", title: "Merge #414, the timezone fix?", preview: "You said yes, merged at 06:10", at: "06:10", standing: "done", isNew: false,
    asks: "Coding asked to merge pull request #414, which fixes a report that was off by one day in some timezones.", why: "Two customers had written to Support.",
    looked: ["CI passed", "The fix was read fresh by a second thread"], options: [], otherwise: "", links: [{ label: "Coding’s board", to: "m-coding-board" }],
    answered: "Merge it",
  },
  {
    id: "support-v5", from: "Juno", title: "Try version 5 of Support on past mail", preview: "You said yes yesterday at 17:20", at: "Yesterday", standing: "done", isNew: false,
    asks: "Juno asked to try version 5 of Support on past mail, beside version 4, before anything goes live.", why: "Support’s answer time was above its line.",
    looked: ["Last month’s mail, 40 cases", "The change: shorter first answers"], options: [], otherwise: "", links: [{ label: "Support’s overview", to: "m-support-overview" }],
    answered: "Try it",
  },
];
