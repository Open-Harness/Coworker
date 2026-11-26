import type { SharedView } from "~/modules/views-workspace/types.ts";

/* The skill library, in four layers. A skill never allows anything: that is Reach. */
export type Skill = SharedView["skills"][number];
export type Files = Skill["files"];
export const v = (n: number, when: number | null, by: string, says: string): Skill["versions"][number] => ({ n, at: when, by, says });
export const c = (what: string, without: string, withIt: string): Skill["cases"][number] => ({ what, without, with: withIt });
export const skill = (
  head: Pick<Skill, "id" | "name" | "layer" | "says" | "from" | "madeFor">,
  users: readonly (readonly [string, string])[],
  version: number,
  comparison: Skill["comparison"],
  cut: boolean,
  files: Files | undefined,
  versions: Skill["versions"],
  cases: Skill["cases"],
): Skill => ({
  ...head,
  usedBy: users.map(([manager, agent]) => ({ manager, agent })),
  version,
  comparison,
  cut,
  files: files ?? [{ name: "SKILL.md", text: `# ${head.name}\n\n${head.says}.\n\nThe words of this one are not in this drawing.` }],
  versions,
  cases,
});
