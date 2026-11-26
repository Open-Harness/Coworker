import { generateKeyPairSync } from "node:crypto";
import { boxesAndPush } from "./boxes.ts";
import { control } from "./control.ts";
import { github } from "./github.ts";
import { realModels } from "./jobs.ts";
import { mcp } from "./mcp.ts";
import { models } from "./models.ts";

/*
 * Everything outside the product, by host name, in this one process: Miniflare's `outboundService` hands every request of
 * the Worker here. The product runs with its real adapters and real `fetch` (`DT_OUTSIDE=http`); nothing in `src/`
 * imports anything here. A host nobody answers for is refused, so nothing ever reaches the internet.
 */

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

export const APP_ID = "424242";
export const APP_KEY = privateKey;
/** The webhook secret. A flow signs what it delivers with it. */
export const WEBHOOK_SECRET = "flows-webhook-secret";

export async function outside(request: Request): Promise<Response> {
  for (const answer of [control, models, realModels, boxesAndPush, mcp, (one: Request) => github(one, { id: APP_ID, publicKey })]) {
    const response = await answer(request.clone() as Request);
    if (response !== undefined) return response;
  }
  return new Response(`The evals have no internet: ${new URL(request.url).host}`, { status: 502 });
}
