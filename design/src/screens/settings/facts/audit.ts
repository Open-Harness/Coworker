/* Who did what, newest first. Today is 25 November 2026, about 09:54. `result`: only "refused" and "failed" get a colour. */
export type Result = "done" | "refused" | "failed";
export interface Entry { readonly id: string; readonly when: string; readonly who: string; readonly kind: "Person" | "Juno" | "Manager"; readonly did: string; readonly under: string; readonly result: Result; readonly why?: string }
export const AUDIT: readonly Entry[] = [
  { id: "a1", when: "Today, 09:54", who: "Coding", kind: "Manager", did: "Replied on #418, comment 2", under: "Reach: GitHub, comment on acme/web", result: "done" },
  { id: "a2", when: "Today, 09:50", who: "WhatsApp desk", kind: "Manager", did: "Checked that the number answers", under: "Reach: WhatsApp, read", result: "failed", why: "No answer. Offline since 08:10" },
  { id: "a3", when: "Today, 09:41", who: "Chidi Okafor", kind: "Person", did: "Left 3 comments on #418", under: "Member", result: "done" },
  { id: "a4", when: "Today, 09:31", who: "Juno", kind: "Juno", did: "Answered Ama in a chat", under: "May do: answer", result: "done" },
  { id: "a5", when: "Today, 09:05", who: "Juno", kind: "Juno", did: "Asked Bo in #releases about v2.3", under: "May do: post in Slack", result: "done" },
  { id: "a6", when: "Today, 08:44", who: "Coding", kind: "Manager", did: "Pushed to main on acme/web", under: "Reach: GitHub, push to export-*", result: "refused", why: "main is not in its reach" },
  { id: "a7", when: "Today, 08:40", who: "Bo Larsen", kind: "Person", did: "Signed in", under: "Builder", result: "done" },
  { id: "a8", when: "Today, 08:30", who: "Juno", kind: "Juno", did: "Said what needs a person: 3 things", under: "May do: write to your inbox", result: "done" },
  { id: "a9", when: "Yesterday, 16:12", who: "Dana Whitfield", kind: "Person", did: "Asked to join", under: "Mail domain acme.co", result: "done" },
  { id: "a10", when: "Yesterday, 11:02", who: "Sales", kind: "Manager", did: "Wrote to a new lead", under: "Reach: Email, 1 mail to a new lead", result: "done" },
  { id: "a11", when: "24 Nov, 10:56", who: "Coding", kind: "Manager", did: "Asked Chidi to review #418", under: "Reach: GitHub, request a review", result: "done" },
  { id: "a12", when: "23 Nov, 14:20", who: "Bo Larsen", kind: "Person", did: "Made version 6 of Sales", under: "Builder", result: "done" },
  { id: "a13", when: "23 Nov, 07:00", who: "Juno", kind: "Juno", did: "Tried 1 change on past work", under: "May do: try changes to a manager", result: "done" },
  { id: "a14", when: "22 Nov, 15:08", who: "Ama Mensah", kind: "Person", did: "Invited Ngozi Eze as a Member", under: "Owner", result: "done" },
  { id: "a15", when: "21 Nov, 12:30", who: "Juno", kind: "Juno", did: "Tried to retire Docs", under: "May do: retire a manager (off)", result: "refused", why: "Only a person may retire a manager" },
  { id: "a16", when: "21 Nov, 09:02", who: "Ama Mensah", kind: "Person", did: "Made version 7 of Coding", under: "Owner", result: "done" },
];
