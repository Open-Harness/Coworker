import type { GitHubApi } from "~/modules/github/types.ts";
import type { Outside } from "~/modules/console/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";

/** What the console may read of a place, over GitHub: the workspace's own installation, a token that can only read, and GET. */
export interface PlaceDeps {
  readonly github: GitHubApi;
  readonly object: WorkspaceApi;
  readonly fetch: typeof fetch;
}

type Read = Awaited<ReturnType<Outside["read"]>>;

export async function readPlace({ github, object, fetch }: PlaceDeps, place: string, path: string): Promise<Read> {
  const installation = (await object.gitHub()).installation?.id;
  if (installation === undefined) return { _tag: "Gone" };
  const made = await github.token(installation, place, { contents: "read", metadata: "read" });
  if (made._tag === "Failed") return { _tag: "Gone" };
  const response = await fetch(`https://api.github.com/repos/${place}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { authorization: `Bearer ${made.token.token}`, accept: "application/vnd.github+json", "user-agent": "co-worker" },
  });
  if (!response.ok) return { _tag: "Gone" };
  const body: unknown = await response.json().catch(() => undefined);
  if (Array.isArray(body))
    return {
      _tag: "Folder",
      names: body.flatMap((one: unknown) =>
        typeof one === "object" && one !== null && "name" in one && typeof one.name === "string" ? [one.name] : [],
      ),
    };
  if (typeof body === "object" && body !== null && "content" in body && typeof body.content === "string")
    return {
      _tag: "File",
      text: new TextDecoder().decode(Uint8Array.from(atob(body.content.replaceAll("\n", "")), (char) => char.charCodeAt(0))),
    };
  return { _tag: "Gone" };
}
