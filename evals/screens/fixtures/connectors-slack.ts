import type { Entry, SlackThread, SlackView } from "~/modules/views-connector/types.ts";
import { inn, out } from "./connectors-kit.ts";
import { at, read, type Fixture } from "./read.ts";

/* Coding's Slack, as the team sees it: channels and direct messages, the threads under them, and #engineering open with the export thread beside it. */

type Said = Entry & { readonly thread: string | null };
const said = (id: string, when: string, by: string, text: string, thread: string | null = null): Said => ({
  ...inn(id, when, by, `slack:${by.split(" ")[0]?.toLowerCase() ?? by}`, text),
  thread,
});

const FORK_EXPORT: SlackThread["forks"] = [
  {
    name: "Find the cause",
    link: null,
    forks: [{ name: "Write the fix", link: null, forks: [{ name: "Answer the review", link: "/m/coding/threads/thread-46", forks: [] }] }],
  },
  { name: "Check it, fresh", link: null, forks: [] },
];
const thread = (id: string, name: string, state: SlackThread["state"], more: Partial<SlackThread> = {}): SlackThread => ({
  id,
  name,
  state,
  waits: [],
  work: null,
  forks: [],
  ...more,
});
const EXPORT = thread("t-export", "Northwind export is short", "working", { work: "ACME-412", forks: FORK_EXPORT });

const STREAM: readonly Said[] = [
  said("e1", "24 Nov 08:31", "Bo Larsen", "Morning. CI was slow overnight, the runners were busy."),
  said("e2", "24 Nov 08:33", "Chidi Okafor", "Same here. I reran twice."),
  said("e3", "24 Nov 08:40", "Bo Larsen", "Looks like the cache key changed. I am looking."),
  said("e4", "24 Nov 08:52", "Bo Larsen", "Fixed. The cache is warm again."),
  said("e5", "24 Nov 08:53", "Chidi Okafor", "Thanks."),
  said("e6", "24 Nov 08:58", "Chidi Okafor", "Heads up: the review of the rate limit is mine today."),
  said("e7", "24 Nov 09:01", "Bo Larsen", "Okay. I will stay out of that branch."),
  said("e8", "24 Nov 09:03", "Chidi Okafor", "Northwind wrote in again about their Monday export."),
  said("e9", "24 Nov 09:05", "Chidi Okafor", "It finishes without an error but the file is short."),
  said("e10", "24 Nov 09:07", "Bo Larsen", "212,000 rows, they said. Cut off near 150,000."),
  said("e11", "24 Nov 09:09", "Bo Larsen", "That smells like memory."),
  said("e12", "24 Nov 09:10", "Chidi Okafor", "Same. It is issue #412 on GitHub."),
  said("e13", "24 Nov 09:12", "Chidi Okafor", "@Juno can you take #412? Northwind exports every Monday.", "t-export"),
  said("e14", "24 Nov 11:30", "Bo Larsen", "Deploy window today is 16:00."),
  said("e15", "25 Nov 09:20", "Bo Larsen", "Standup at 10:00."),
];

const CHANNELS: SlackView["channels"] = [
  { id: "engineering", kind: "channel", name: "engineering", topic: "Code, reviews and what is being built", unread: 0, threads: [EXPORT] },
  {
    id: "support-bugs",
    kind: "channel",
    name: "support-bugs",
    topic: "Bugs customers ran into",
    unread: 3,
    threads: [thread("t-sidebar", "Sidebar keyboard order", "answered")],
  },
  {
    id: "releases",
    kind: "channel",
    name: "releases",
    topic: "What goes out, and when",
    unread: 1,
    threads: [thread("t-node", "Drop Node 18?", "asks", { waits: ["Bo", "Chidi"], work: "ACME-398" })],
  },
  {
    id: "dm-chidi",
    kind: "direct",
    name: "Chidi Okafor",
    topic: "Direct message",
    unread: 2,
    threads: [
      thread("t-rate", "Rate limit on the API", "asks", { waits: ["Chidi"], work: "ACME-404" }),
      thread("t-v23", "Is v2.3 still on?", "answered"),
    ],
  },
  {
    id: "dm-bo",
    kind: "direct",
    name: "Bo Larsen",
    topic: "Direct message",
    unread: 0,
    threads: [thread("t-ci", "Rerun CI on #416", "answered")],
  },
];

export const SLACK: Fixture = read(
  "/m/:manager/connectors/slack?channel",
  { manager: "coding" },
  {
    team: "acme.slack.com",
    channels: CHANNELS,
    open: {
      id: "engineering",
      stream: STREAM,
      thread: "t-export",
      threads: [
        {
          ...EXPORT,
          root: "e13",
          at: at("24 Nov 09:12"),
          how: "/m/coding/threads/thread-46",
          replies: [
            out(
              "x1",
              "24 Nov 09:12",
              "Juno",
              "Taking it as ACME-412. Done means: an export of 212,000 rows has every row, memory stays under 128 MB, and the docs stop naming a limit.",
            ),
            inn("x2", "24 Nov 09:15", "Chidi Okafor", "slack:chidi", "Good. Ask me for the review when the pull request is up."),
            out("x3", "24 Nov 10:56", "Juno", "Pull request #418 is up. Chidi, it is ready for your review."),
          ],
        },
      ],
    },
  },
);
