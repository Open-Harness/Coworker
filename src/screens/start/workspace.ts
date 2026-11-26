import type { Outside } from "~/modules/page/types.ts";
import type { Answers } from "./answers.ts";
import type { Repo } from "./steps.tsx";

/** `{repos: [{repo, about}]}`: what GitHub shows this person, narrowed. */
export function reposOf(body: unknown): readonly Repo[] {
  const rows =
    typeof body === "object" && body !== null && "repos" in body && Array.isArray(body.repos) ? (body.repos as readonly unknown[]) : [];
  return rows.flatMap((row) =>
    typeof row === "object" && row !== null && "repo" in row && typeof row.repo === "string"
      ? [{ repo: row.repo, about: "about" in row && typeof row.about === "string" ? row.about : "" }]
      : [],
  );
}

export type Made =
  | { readonly _tag: "Made"; readonly address: string }
  | { readonly _tag: "Taken"; readonly says: string }
  | { readonly _tag: "Failed"; readonly says: string };

/** The one change of this page, at its end: the workspace, by name, address and where its data lives. The rest is chosen in it. */
export async function createWorkspace(outside: Outside, answers: Answers): Promise<Made> {
  const made = await outside.post("/api/workspaces", { name: answers.name.trim(), address: answers.slug, region: answers.region });
  if (made._tag === "Ok") return { _tag: "Made", address: answers.slug };
  return made.says === "Address taken"
    ? { _tag: "Taken", says: "That address is taken. Pick another." }
    : { _tag: "Failed", says: made.says };
}
