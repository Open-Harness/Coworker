import type { RepoItem } from "~/modules/views-connector/types.ts";
import { item, ITEM_418 } from "./connectors-github-kit.ts";
import { read, type Fixture } from "./read.ts";

/* Coding's GitHub on acme/web, as GitHub shows it: sixteen issues and pull requests, and #418 open with its review. */

const ITEMS: readonly RepoItem[] = [
  ITEM_418,
  item(412, "issue", "Export drops rows over 150k", "open", "Chidi Okafor", "24 Nov 09:07", "25 Nov 09:48", "ACME-412", ["bug"], {
    waits: "us",
    says: "Pull request #418 to be merged",
    fixedBy: 418,
  }),
  item(423, "issue", "Show the plan on the billing page", "open", "Ama Mensah", "25 Nov 09:42", "25 Nov 09:42", "ACME-423", ["feature"], {
    waits: "us",
    says: "Coding reads it",
  }),
  item(413, "pull request", "Rate limit on the public API", "open", "Juno", "23 Nov 11:30", "25 Nov 09:36", "ACME-404", ["feature"], {
    waits: "person",
    says: "Chidi’s review",
    closes: 404,
    checks: "passed",
  }),
  item(404, "issue", "Rate limit on the public API", "open", "Bo Larsen", "22 Nov 14:02", "25 Nov 09:36", "ACME-404", ["feature"], {
    waits: "person",
    says: "Chidi’s review of #413",
    fixedBy: 413,
  }),
  item(416, "pull request", "Fix the tab order in the sidebar", "open", "Juno", "24 Nov 16:40", "25 Nov 09:18", "ACME-409", ["bug"], {
    waits: "checks",
    says: "CI",
    closes: 409,
    checks: "running",
  }),
  item(409, "issue", "Keyboard order in the sidebar", "open", "Bo Larsen", "23 Nov 15:12", "25 Nov 09:18", "ACME-409", ["bug", "a11y"], {
    waits: "checks",
    says: "Pull request #416, in CI",
    fixedBy: 416,
  }),
  item(421, "issue", "Sign in with GitHub loops on Safari", "open", "mira-k", "25 Nov 07:48", "25 Nov 07:52", "ACME-421", ["bug"], {
    waits: "reporter",
    says: "An answer from the reporter",
  }),
  item(
    414,
    "pull request",
    "Read report times in the workspace’s time zone",
    "merged",
    "Juno",
    "25 Nov 05:50",
    "25 Nov 05:58",
    "ACME-411",
    ["bug"],
    { waits: "done", says: "Nothing", closes: 411, checks: "passed" },
  ),
  item(411, "issue", "Timezone off by one in reports", "closed", "Juno", "25 Nov 05:12", "25 Nov 05:58", "ACME-411", ["bug"], {
    waits: "done",
    says: "Nothing",
    fixedBy: 414,
  }),
  item(
    419,
    "pull request",
    "Handle the two breaking changes in payment-lib 5",
    "open",
    "Juno",
    "25 Nov 04:55",
    "25 Nov 04:58",
    "ACME-415",
    ["upkeep"],
    { waits: "checks", says: "The check finishes", into: 415, checks: "running" },
  ),
  item(
    415,
    "pull request",
    "Bump payment-lib from 4.1 to 5.0",
    "open",
    "dependabot",
    "24 Nov 22:00",
    "25 Nov 04:58",
    "ACME-415",
    ["dependencies"],
    { waits: "us", says: "Pull request #419 first" },
  ),
  item(420, "pull request", "Fix the typo in the invite mail", "merged", "Juno", "25 Nov 00:48", "25 Nov 00:55", "ACME-410", ["upkeep"], {
    waits: "done",
    says: "Nothing",
    closes: 410,
    checks: "passed",
  }),
  item(410, "issue", "Typo in the invite mail", "closed", "Chidi Okafor", "24 Nov 23:30", "25 Nov 00:55", "ACME-410", ["upkeep"], {
    waits: "done",
    says: "Nothing",
    fixedBy: 420,
  }),
  item(398, "issue", "Drop Node 18", "open", "Juno", "22 Nov 09:20", "24 Nov 14:27", "ACME-398", ["upkeep"], {
    waits: "person",
    says: "Ama’s answer: merge now, or wait for v3",
  }),
  item(406, "issue", "Support for Internet Explorer", "closed", "Bo Larsen", "23 Nov 09:00", "24 Nov 08:30", "ACME-406", ["feature"], {
    waits: "done",
    says: "Nothing",
  }),
];

export const GITHUB: Fixture = read("/m/:manager/connectors/github?repo", { manager: "coding" }, { repo: "acme/web", items: ITEMS });
