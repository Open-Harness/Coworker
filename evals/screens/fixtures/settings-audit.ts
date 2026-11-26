import type { AuditView } from "~/modules/views-workspace/types.ts";
import { at, read, type Fixture } from "./read.ts";

/* Who did what, newest first: a person, Juno or a manager, and what let it. */
type Line = AuditView["lines"][number];
type Under = Line["under"];
const reach = (says: string): Under => ({ is: "reach", says });
const may = (says: string): Under => ({ is: "may do", says });
const role = (says: string): Under => ({ is: "role", says });

const line = (
  id: string,
  when: string,
  by: string,
  kind: Line["kind"],
  says: string,
  under: Under,
  group: string,
  more: Partial<Line> = {},
): Line => ({
  id,
  at: at(when),
  by,
  coworker: kind === "coworker",
  kind,
  says,
  permission: "on",
  under,
  approvedBy: null,
  outcome: "done",
  why: null,
  group,
  ...more,
});
const refused = (why: string): Partial<Line> => ({ outcome: "refused", permission: "off", why });
const failed = (why: string): Partial<Line> => ({ outcome: "failed", why });

export const AUDIT: AuditView = {
  lines: [
    line("a1", "25 Nov 09:54", "Coding", "manager", "Replied on #418, comment 2", reach("GitHub, comment on acme/web"), "GitHub"),
    line(
      "a2",
      "25 Nov 09:50",
      "WhatsApp desk",
      "manager",
      "Checked that the number answers",
      reach("WhatsApp, read"),
      "WhatsApp",
      failed("No answer. Offline since 08:10"),
    ),
    line("a3", "25 Nov 09:41", "Chidi Okafor", "person", "Left 3 comments on #418", role("Member"), "GitHub"),
    line("a4", "25 Nov 09:31", "Juno", "coworker", "Answered Ama in a chat", may("answer"), "Chats"),
    line("a5", "25 Nov 09:05", "Juno", "coworker", "Asked Bo in #releases about v2.3", may("post in Slack"), "Slack"),
    line(
      "a6",
      "25 Nov 08:44",
      "Coding",
      "manager",
      "Pushed to main on acme/web",
      reach("GitHub, push to export-*"),
      "GitHub",
      refused("main is not in its reach"),
    ),
    line("a7", "25 Nov 08:40", "Bo Larsen", "person", "Signed in", role("Builder"), "Sign-in"),
    line("a8", "25 Nov 08:30", "Juno", "coworker", "Said what needs a person: 3 things", may("write to your inbox"), "Inbox"),
    line("a9", "24 Nov 16:12", "Dana Whitfield", "person", "Asked to join", { is: "role", says: "Mail domain acme.co" }, "Members"),
    line("a10", "24 Nov 11:02", "Sales", "manager", "Wrote to a new lead", reach("Email, 1 mail to a new lead"), "Email"),
    line("a11", "24 Nov 10:56", "Coding", "manager", "Asked Chidi to review #418", reach("GitHub, request a review"), "GitHub"),
    line("a12", "23 Nov 14:20", "Bo Larsen", "person", "Made version 6 of Sales", role("Builder"), "Playbooks"),
    line("a13", "23 Nov 07:00", "Juno", "coworker", "Tried 1 change on past work", may("try changes to a manager"), "Playbooks"),
    line("a14", "22 Nov 15:08", "Ama Mensah", "person", "Invited Ngozi Eze as a Member", role("Owner"), "Members"),
    line(
      "a15",
      "21 Nov 12:30",
      "Juno",
      "coworker",
      "Tried to retire Docs",
      may("retire a manager (off)"),
      "Playbooks",
      refused("Only a person may retire a manager"),
    ),
    line("a16", "21 Nov 09:02", "Ama Mensah", "person", "Made version 7 of Coding", role("Owner"), "Playbooks"),
  ],
  next: null,
};

export const AUDIT_PAGES: readonly Fixture[] = [read("/settings/audit-log?by&outcome&before", {}, AUDIT)];
