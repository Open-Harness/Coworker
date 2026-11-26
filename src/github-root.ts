import { githubConnector } from "~/modules/github-connector/service.ts";
import type { Us } from "~/modules/github-events/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";

/** What a delivery needs from the outside: the secret, the App's name, and where an installation's workspace is. */
export interface GitHubIn {
  readonly secret: string;
  readonly slug: string;
  readonly objectOf: (installation: number) => Promise<WorkspaceApi | undefined>;
  /** The App was taken off GitHub: the workspace stops hearing it, and its Owners are told. */
  readonly removed: (installation: number, how?: "suspended") => Promise<void>;
}

/** The events that are a person speaking, or a work coming in: intake judges them. A check, a push, a merge and a close are not. */
const SPEECH: ReadonlySet<string> = new Set(["issue", "label", "comment", "pull_request", "review", "line_comment"]);

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
    await dependencies.removed(heard.installation, heard.suspended ? "suspended" : undefined);
    return Response.json({ _tag: "Uninstalled" }, { status: 202 });
  }
  // The App is back, as it was: what it had is restored, and what it missed meanwhile is asked of GitHub.
  if (heard._tag === "Account" && heard.works && heard.installation !== null && object !== undefined) {
    await object.gitHubBack(heard.installation, await usFor(heard.installation));
    return Response.json({ _tag: "Back" }, { status: 202 });
  }
  const place = heard._tag === "Item" ? heard.item.place : heard._tag === "Noise" ? heard.heard?.repo : undefined;
  if ((heard._tag !== "Item" && heard._tag !== "Noise") || object === undefined || place === undefined)
    return Response.json({ _tag: heard._tag }, { status: 202 });
  try {
    const rows = await object.consoleStore({ op: "manager.list" });
    const hears =
      "op" in rows && rows.op === "manager.list" ? rows.rows.filter((row) => row.hears.includes(place)).map(({ node }) => node.id) : [];
    if (hears.length > 0 && heard.heard !== undefined) await object.consoleStore({ op: "github.hear", heard: heard.heard });
    // What only changes the state of a conversation is read from its records; what a person says is judged.
    if (hears.length > 0 && heard._tag === "Item" && SPEECH.has(heard.item.event))
      await object.consoleStore({ op: "item.keep", item: heard.item, trigger: "event", hears });
    return Response.json({ _tag: heard._tag === "Item" ? "Heard" : "Noise", hears }, { status: 202 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "It could not be kept" }, { status: 500 });
  }
}
