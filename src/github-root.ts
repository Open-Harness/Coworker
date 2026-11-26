import { githubConnector } from "~/modules/github-connector/service.ts";
import type { Us } from "~/modules/github-events/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";

/** What a delivery needs from the outside: the secret, the App's name, and where an installation's workspace is. */
export interface GitHubIn {
  readonly secret: string;
  readonly slug: string;
  readonly objectOf: (installation: number) => Promise<WorkspaceApi | undefined>;
  /** The App was taken off GitHub: the workspace stops hearing it, and its Owners are told. */
  readonly removed: (installation: number) => Promise<void>;
}

const label = (name: unknown): string => (typeof name === "string" && name !== "" ? name.toLowerCase() : "juno");

/** `POST /in/github`: 401 unless signed; what a workspace's managers hear is kept once; 500 when it could not be kept, so GitHub sends it again. */
export async function gitHubIn(request: Request, dependencies: GitHubIn): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Use POST" }, { status: 405 });
  const raw = { headers: Object.fromEntries(request.headers), body: await request.text() };
  let object: WorkspaceApi | undefined;
  const usFor = async (installation: number | null): Promise<Us> => {
    object = installation === null ? undefined : await dependencies.objectOf(installation);
    const named = object === undefined ? undefined : await object.consoleStore({ op: "setting.get", name: "coworker.name" });
    return {
      login: `${dependencies.slug}[bot]`,
      mention: `@${dependencies.slug}`,
      label: label(named !== undefined && "op" in named && named.op === "setting.get" ? named.value : undefined),
    };
  };
  const heard = await githubConnector.receive(raw, dependencies.secret, usFor);
  if (heard._tag === "Refused" && heard.why === "not signed")
    return Response.json({ error: "The signature does not match" }, { status: 401 });
  if (heard._tag === "Account" && !heard.works && heard.installation !== null) {
    await dependencies.removed(heard.installation);
    return Response.json({ _tag: "Uninstalled" }, { status: 202 });
  }
  if (heard._tag !== "Item" || object === undefined) return Response.json({ _tag: heard._tag }, { status: 202 });
  try {
    const rows = await object.consoleStore({ op: "manager.list" });
    const hears =
      "op" in rows && rows.op === "manager.list"
        ? rows.rows.filter((row) => row.hears.includes(heard.item.place)).map(({ node }) => node.id)
        : [];
    if (hears.length > 0) await object.consoleStore({ op: "item.keep", item: heard.item, trigger: "event", hears });
    return Response.json({ _tag: "Heard", hears }, { status: 202 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "It could not be kept" }, { status: 500 });
  }
}
