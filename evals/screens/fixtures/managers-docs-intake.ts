import { head } from "./managers-kit.ts";
import { read, type Fixture } from "./read.ts";

/* Docs' Intake, as drawn when nothing has come in yet: the table keeps its columns, the screen says what will be here. */

export const DOCS_INTAKE: Fixture = read(
  "/m/:manager/intake?from&state&before",
  { manager: "docs" },
  {
    head: head("docs"),
    rows: [],
    triggers: [
      {
        trigger: {
          id: "merged",
          name: "Merged on acme/web",
          on: true,
          atMost: "no limit",
          by: "event",
          account: "github",
          place: "acme/web",
          events: ["pull_request.merged"],
          makes: { kind: "docs" },
          only: "A pull request merged into main",
        },
        came: 0,
        took: 0,
        cost: 0,
        next: null,
        from: "acme/web",
      },
    ],
    kinds: [],
    next: null,
  },
);
