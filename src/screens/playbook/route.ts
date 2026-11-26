import type { ScreenRoute } from "~/modules/page/types.ts";

/* A manager's playbook, and the draft of one that is being set up: the same parts and the same comments. */
export default [
  { path: "/m/:manager/playbook" },
  { path: "/m/:manager/playbook/:part" },
  { path: "/m/:manager/playbook/skills/:skill" },
  { path: "/set-up/:walk/draft" },
  { path: "/set-up/:walk/draft/:part" },
  { path: "/set-up/:walk/draft/skills/:skill" },
] satisfies readonly ScreenRoute[];
