import type { SignedIn } from "~/modules/auth/types.ts";
import { LOGO_LIMIT } from "~/modules/settings/service.ts";
import type { ModelChoice } from "~/modules/settings/types.ts";
import type { UpdateGeneral } from "~/modules/workspaces/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { bodyOf, confirmed, fresh, isRecord, problem, reach, said, settings, text } from "./kit.ts";

/**
 * `general` (the name, address, time zone and default model), `logo` and `export`: the General screen. Everyone in
 * the workspace reads the first two; an Owner changes them and takes the export.
 */

const STATUS: Readonly<Record<string, number>> = {
  NotMember: 404,
  NotOwner: 403,
  AddressTaken: 409,
  InvalidAddress: 400,
  Invalid: 400,
  Failed: 502,
};

function choiceOf(value: unknown): ModelChoice | null | undefined {
  if (value === null) return null;
  return isRecord(value) && typeof value["connectionId"] === "string" && typeof value["model"] === "string"
    ? { connectionId: value["connectionId"], model: value["model"] }
    : undefined;
}

/** Narrows the body to what the screen sends; a field of the wrong type is a refusal, not ignored. */
function updateOf(body: Readonly<Record<string, unknown>>): UpdateGeneral | undefined {
  const fields = { name: text(body["name"]), address: text(body["address"]), timeZone: text(body["timeZone"]) };
  if (Object.entries(fields).some(([key, value]) => key in body && value === undefined)) return undefined;
  const model = "defaultModel" in body ? choiceOf(body["defaultModel"]) : undefined;
  if ("defaultModel" in body && model === undefined) return undefined;
  return {
    ...(fields.name === undefined ? {} : { name: fields.name }),
    ...(fields.address === undefined ? {} : { address: fields.address }),
    ...(fields.timeZone === undefined ? {} : { timeZone: fields.timeZone }),
    ...(model === undefined ? {} : { defaultModel: model }),
  };
}

/** Reads a body of at most `limit` bytes, or says it is larger without reading the rest. */
async function boundedBody(request: Request, limit: number): Promise<Uint8Array | undefined> {
  if (Number(request.headers.get("content-length") ?? 0) > limit || request.body === null) return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    all.set(chunk, at);
    at += chunk.byteLength;
  }
  return all;
}

async function logo(workspaces: Workspaces, person: SignedIn, request: Request, workspaceId: string): Promise<Response> {
  const read = request.method === "GET";
  const reached = await reach(workspaces, person, workspaceId, read ? "member" : "settings", "Only an Owner changes the logo");
  if (reached instanceof Response) return reached;
  const { object } = reached;
  if (read) {
    const found = await settings(object, person, "logo", null);
    if (found instanceof Response) return found;
    if (found._tag === "None") return problem(404, "No logo");
    // A picture and nothing else: its type is the one its own bytes proved, and the browser may not guess another.
    return new Response(found.bytes.slice(), {
      headers: {
        "Content-Type": found.type,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, no-cache",
      },
    });
  }
  if (request.method === "DELETE") {
    if (!(await confirmed(request, "logo"))) return problem(400, 'Send {"confirm": "logo"} to remove the logo');
    return said(
      await settings(object, person, "removeLogo", null).then((result) => (result instanceof Response ? { _tag: "NotFound" } : result)),
    );
  }
  if (request.method !== "PUT") return problem(405, "Use GET, PUT or DELETE");
  const bytes = await boundedBody(request, LOGO_LIMIT);
  if (bytes === undefined) return problem(413, `A logo is at most ${LOGO_LIMIT / 1024} KB`);
  const saved = await settings(object, person, "setLogo", { bytes });
  return saved instanceof Response ? saved : said(saved);
}

export async function routeGeneral(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string,
): Promise<Response | undefined> {
  if (part === "logo") return logo(workspaces, person, request, workspaceId);
  if (part === "export") {
    if (request.method !== "GET") return problem(405, "Use GET");
    const exported = await workspaces.exportData(person.userId, workspaceId);
    if (exported._tag !== "Exported") return fresh(exported, STATUS[exported._tag] ?? 200);
    return new Response(exported.bytes.slice(), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${exported.name}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (part !== "general") return undefined;
  if (request.method === "GET") {
    const reached = await reach(workspaces, person, workspaceId, "member", "");
    if (reached instanceof Response) return reached;
    const general = await settings(reached.object, person, "general", null);
    return general instanceof Response ? general : fresh({ general, role: reached.role });
  }
  if (request.method !== "PUT") return problem(405, "Use GET or PUT");
  const body = await bodyOf(request);
  const update = body === undefined ? undefined : updateOf(body);
  if (update === undefined) return problem(400, "Send name, address, timeZone (text) and defaultModel ({connectionId, model} or null)");
  const result = await workspaces.updateGeneral(person.userId, workspaceId, update);
  return fresh(result, STATUS[result._tag] ?? 200);
}
