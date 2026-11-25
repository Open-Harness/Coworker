import type { GitHubDependencies } from "../types.ts";
import { receive } from "./receive.ts";

/** `POST /in/github`: 401 unless signed with the App's secret; 500 when a manager could not take it, so it is redelivered. */
export async function webhook(dependencies: GitHubDependencies, request: Request): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Use POST" }, { status: 405 });
  const received = await receive(dependencies, {
    id: request.headers.get("x-github-delivery") ?? "",
    event: request.headers.get("x-github-event") ?? "",
    signature: request.headers.get("x-hub-signature-256") ?? undefined,
    body: await request.text(),
  });
  if (received._tag === "Unsigned") return Response.json({ error: "The signature does not match" }, { status: 401 });
  const failed = received._tag === "Heard" && received.routed.some(({ _tag }) => _tag === "Failed");
  return Response.json(received, { status: failed ? 500 : 202 });
}
